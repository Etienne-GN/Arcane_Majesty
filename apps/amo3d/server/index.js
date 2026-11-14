// The 3D game server (Phase 6.1): who is online and where, on amo's model (server/index.js in apps/amo):
// players join a room per map, their moves are relayed to that room, chat goes to the room, and a /status
// page lists who is on. 3D state: position (x, y, z), facing, how they move (speed, sprint, hop, cast,
// strike) and their look (the hero's Forge look), so each client can draw everyone else as a 3D character.
// Shared enemies and fights come in the next slices. Every message is checked and rate-limited.
//   node server/index.js        (port 3003; AMO3D_PORT to change)
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const PORT = +(process.env.AMO3D_PORT ?? 3003);
const MAX_PLAYERS = 32;
const players = new Map();   // socket.id → state

const httpServer = createServer((req, res) => {
    if (req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ players: players.size, list: [...players.values()].map(p => ({ name: p.name, map: p.map, level: p.level })) }));
        return;
    }
    res.writeHead(404); res.end();
});
// Any origin: the game is served by Vite in development, from the phone app (capacitor://, https://localhost)
// and from a PC build. Nothing here is privileged — it is a relay of positions and chat.
const io = new Server(httpServer, { cors: { origin: '*', methods: ['GET', 'POST'] }, maxHttpBufferSize: 16 * 1024 });

// ---- checking what clients send ----
const num = (v, lo, hi, d = 0) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v, max, d = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : d);
const mapId = v => (typeof v === 'string' && /^[a-z0-9_]{1,40}$/.test(v) ? v : 'outdoor');
function cleanLook(look) {
    try { const s = JSON.stringify(look ?? null); return s && s.length <= 4000 ? JSON.parse(s) : null; } catch { return null; }
}
function cleanMove(m = {}) {
    return {
        x: num(m.x, -2000, 2000), y: num(m.y, -500, 500), z: num(m.z, -2000, 2000), facing: num(m.facing, -100, 100),
        speed: num(m.speed, 0, 30), sprint: !!m.sprint, hop: m.hop == null ? null : num(m.hop, 0, 1), cast: m.cast == null ? null : num(m.cast, 0, 1),
        strike: m.strike == null ? null : num(m.strike, 0, 1), dead: !!m.dead,
    };
}
const pub = p => ({ id: p.id, name: p.name, level: p.level, look: p.look, weapon: p.weapon, map: p.map, ...p.move });

io.on('connection', socket => {
    let lastMove = 0, lastChat = 0;

    let lastJoin = 0, lastUpdate = 0;
    socket.on('player:join', (j = {}) => {
        const now = Date.now();
        if (now - lastJoin < 1000) return;   // one join a second at most
        lastJoin = now;
        if (players.size >= MAX_PLAYERS && !players.has(socket.id)) { socket.emit('server:full'); socket.disconnect(true); return; }
        const old = players.get(socket.id);
        if (old) { socket.to(old.map).emit('player:left', { id: old.id }); socket.leave(old.map); }   // a repeated join leaves the old room cleanly
        const p = {
            id: socket.id, name: str(j.name, 24, '') || `Wanderer ${socket.id.slice(0, 4)}`, level: num(j.level, 1, 99, 1),
            look: cleanLook(j.look), weapon: str(j.weapon, 20, 'staff'), map: mapId(j.map), move: cleanMove(j.move),
        };
        players.set(socket.id, p);
        socket.join(p.map);
        socket.emit('players:init', [...players.values()].filter(o => o.map === p.map && o.id !== p.id).map(pub));
        socket.to(p.map).emit('player:joined', pub(p));
        console.log(`[+] ${p.name} → ${p.map} (${players.size} online)`);
    });

    socket.on('player:move', (m = {}) => {
        const p = players.get(socket.id);
        const now = Date.now();
        if (!p || now - lastMove < 40) return;   // at most 25 a second
        lastMove = now;
        const map = mapId(m.map);
        if (map !== p.map) {   // changed map: leave one room, join the other
            socket.to(p.map).emit('player:left', { id: p.id });
            socket.leave(p.map);
            p.map = map;
            socket.join(map);
            p.move = cleanMove(m);
            socket.emit('players:init', [...players.values()].filter(o => o.map === map && o.id !== p.id).map(pub));
            socket.to(map).emit('player:joined', pub(p));
            return;
        }
        p.move = cleanMove(m);
        socket.to(p.map).emit('player:moved', { id: p.id, ...p.move });
    });

    socket.on('player:update', (u = {}) => {   // a new look, weapon or level
        const p = players.get(socket.id);
        const now = Date.now();
        if (!p || now - lastUpdate < 500) return;   // at most two a second (each one rebuilds a model on every client)
        lastUpdate = now;
        const before = JSON.stringify([p.look, p.weapon, p.level]);
        if (u.look !== undefined) p.look = cleanLook(u.look);
        if (u.weapon !== undefined) p.weapon = str(u.weapon, 20, 'staff');
        if (u.level !== undefined) p.level = num(u.level, 1, 99, p.level);
        if (JSON.stringify([p.look, p.weapon, p.level]) === before) return;   // nothing changed: nothing to send
        socket.to(p.map).emit('player:updated', { id: p.id, look: p.look, weapon: p.weapon, level: p.level });
    });

    // Something seen by the room (6.2): a spell cast — origin and direction — replayed as a harmless copy by
    // the others. Players never damage each other.
    let lastAct = 0;
    socket.on('player:act', (a = {}) => {
        const p = players.get(socket.id);
        const now = Date.now();
        if (!p || now - lastAct < 150 || a.kind !== 'fireball') return;
        lastAct = now;
        const v = (o = {}) => ({ x: num(o.x, -2000, 2000), y: num(o.y, -500, 500), z: num(o.z, -2000, 2000) });
        const d = v(a.dir), len = Math.hypot(d.x, d.y, d.z) || 1;
        socket.to(p.map).emit('player:act', { id: p.id, kind: 'fireball', origin: v(a.origin), dir: { x: d.x / len, y: d.y / len, z: d.z / len } });
    });

    socket.on('chat:send', (c = {}) => {
        const p = players.get(socket.id);
        const now = Date.now();
        const text = str(c.text, 200);
        if (!p || !text || now - lastChat < 500) return;
        lastChat = now;
        io.to(p.map).emit('chat:message', { id: p.id, name: p.name, text });
    });

    socket.on('disconnect', () => {
        const p = players.get(socket.id);
        if (!p) return;
        socket.to(p.map).emit('player:left', { id: p.id });
        players.delete(socket.id);
        console.log(`[-] ${p.name} (${players.size} online)`);
    });
});

httpServer.listen(PORT, () => console.log(`amo3d game server on :${PORT}`));
