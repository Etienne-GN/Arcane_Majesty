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
const snaps = new Map();     // map id → the host's latest creature snapshot (index → [x, y, z, heading, state, hp, dead])
const MAX_STRIKE = 60;       // amo's hardest-hitting creature, elite (×1.4) and with room to spare

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
function obj(o) { return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; }
const num = (v, lo, hi, d = 0) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const str = (v, max, d = '') => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : d);
const mapId = v => (typeof v === 'string' && /^[a-z0-9_]{1,40}$/.test(v) ? v : 'outdoor');
function cleanLook(look) {
    try { const s = JSON.stringify(look ?? null); return s && s.length <= 4000 ? JSON.parse(s) : null; } catch { return null; }
}
function cleanMove(m) {
    m = obj(m);
    return {
        x: num(m.x, -2000, 2000), y: num(m.y, -500, 500), z: num(m.z, -2000, 2000), facing: num(m.facing, -100, 100),
        speed: num(m.speed, 0, 30), sprint: !!m.sprint, hop: m.hop == null ? null : num(m.hop, 0, 1), cast: m.cast == null ? null : num(m.cast, 0, 1),
        strike: m.strike == null ? null : num(m.strike, 0, 1), dead: !!m.dead,
    };
}
const pub = p => ({ id: p.id, name: p.name, level: p.level, look: p.look, weapon: p.weapon, map: p.map, ...p.move });

const vec = o => { o = obj(o); return { x: num(o.x, -2000, 2000), y: num(o.y, -500, 500), z: num(o.z, -2000, 2000) }; };
const inMap = map => [...players.values()].filter(o => o.map === map);
// The map's host (6.3): whoever has been there longest runs its creatures and streams them to the others.
const hostOf = map => inMap(map).sort((x, y) => x.since - y.since)[0] ?? null;
const hosts = new Map();     // map id → current host id
const announceHost = map => {
    const h = hostOf(map);
    if ((h?.id ?? null) !== (hosts.get(map) ?? null)) snaps.delete(map);   // a new host: nothing the old one said counts
    if (h) { hosts.set(map, h.id); io.to(map).emit('map:host', { id: h.id }); } else hosts.delete(map);
};
const MAX_CREATURE_SPEED = 15;   // m/s — no creature in amo moves faster; anything quicker is not to be believed

io.on('connection', socket => {
    let lastMove = 0, lastChat = 0, lastJoin = 0, lastUpdate = 0, lastAct = 0, lastSnap = 0, hitsWindow = 0, hitsT = 0, strikeT = 0;
    // Every handler gets an object (never null, never an array) and cannot bring the server down.
    const on = (ev, fn) => socket.on(ev, raw => { try { fn(obj(raw)); } catch (e) { console.error(`bad ${ev} from ${socket.id}: ${e.message}`); } });
    const enterMap = (p, map) => { p.map = map; p.since = Date.now(); socket.join(map); };

    on('player:join', j => {
        const now = Date.now();
        if (now - lastJoin < 1000) return;   // one join a second at most
        lastJoin = now;
        if (players.size >= MAX_PLAYERS && !players.has(socket.id)) { socket.emit('server:full'); socket.disconnect(true); return; }
        const old = players.get(socket.id);
        if (old) { socket.to(old.map).emit('player:left', { id: old.id }); socket.leave(old.map); players.delete(socket.id); announceHost(old.map); }   // a repeated join leaves the old room cleanly
        const p = { id: socket.id, name: str(j.name, 24, '') || `Wanderer ${socket.id.slice(0, 4)}`, level: num(j.level, 1, 99, 1),
            look: cleanLook(j.look), weapon: str(j.weapon, 20, 'staff'), move: cleanMove(obj(j.move)) };
        players.set(socket.id, p);
        enterMap(p, mapId(j.map));
        socket.emit('players:init', inMap(p.map).filter(o => o.id !== p.id).map(pub));
        socket.to(p.map).emit('player:joined', pub(p));
        announceHost(p.map);
        console.log(`[+] ${p.name} → ${p.map} (${players.size} online)`);
    });

    on('player:move', m => {
        const p = players.get(socket.id);
        const now = Date.now();
        if (!p || now - lastMove < 40) return;   // at most 25 a second
        lastMove = now;
        const map = mapId(m.map);
        if (map !== p.map) {   // changed map: leave one room, join the other
            const from = p.map;
            socket.to(from).emit('player:left', { id: p.id });
            socket.leave(from);
            enterMap(p, map);
            p.move = cleanMove(m);
            socket.emit('players:init', inMap(map).filter(o => o.id !== p.id).map(pub));
            socket.to(map).emit('player:joined', pub(p));
            announceHost(from); announceHost(map);
            return;
        }
        p.move = cleanMove(m);
        socket.to(p.map).emit('player:moved', { id: p.id, ...p.move });
    });

    on('player:update', u => {   // a new look, weapon or level
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
    on('player:act', a => {
        const p = players.get(socket.id);
        const now = Date.now();
        if (!p || now - lastAct < 150 || a.kind !== 'fireball') return;
        lastAct = now;
        const d = vec(a.dir), len = Math.hypot(d.x, d.y, d.z) || 1;
        socket.to(p.map).emit('player:act', { id: p.id, kind: 'fireball', spell: typeof a.spell === 'string' && /^[a-z_]{1,32}$/.test(a.spell) ? a.spell : 'fireball', origin: vec(a.origin), dir: { x: d.x / len, y: d.y / len, z: d.z / len } });
    });

    // ---- shared creatures (6.3) ----
    const isHost = p => p && hostOf(p.map)?.id === p.id;
    on('enemy:snap', a => {   // host → the room: [[index, x, y, z, heading, state, hp, dead], …]
        const p = players.get(socket.id);
        const now = Date.now();
        if (!isHost(p) || now - lastSnap < 70 || !Array.isArray(a.list) || a.list.length > 400) return;
        if (!a.list.every(e => Array.isArray(e) && Number.isInteger(e[0]) && e[0] >= 0 && e[0] <= 400)) return;
        lastSnap = now;
        const list = a.list.filter(e => Array.isArray(e) && e.length === 8).map(e => e.map(v => num(+v, -1e5, 1e5)));
        // Each creature keeps its history across snapshots (one left out keeps its last place). A creature that
        // jumped further than it could have run, or that appears with no recent history (new, or left out and
        // brought back), is not trusted to strike for two seconds.
        const m = snaps.get(p.map) ?? new Map();
        for (const [i, ...v] of list) {
            const was = m.get(i), fresh = was && now - was.t <= 1500, dt = fresh ? (now - was.t) / 1000 : 0;
            const jumped = fresh && Math.hypot(v[0] - was.v[0], v[2] - was.v[2]) > MAX_CREATURE_SPEED * Math.max(dt, 0.07) + 1;
            m.set(i, { v, t: now, untrustedUntil: !fresh || jumped ? now + 2000 : was.untrustedUntil });
        }
        snaps.set(p.map, m);
        socket.to(p.map).emit('enemy:snap', { list });
    });
    on('enemy:hit', a => {   // a player → the host: their blow on creature `i`
        const p = players.get(socket.id);
        const now = Date.now();
        if (!p || isHost(p)) return;
        if (now - hitsT > 1000) { hitsT = now; hitsWindow = 0; }
        if (++hitsWindow > 20) return;   // twenty blows a second is already a lot
        const host = hostOf(p.map), h = obj(a.h), st = obj(h.status);
        io.to(host.id).emit('enemy:hit', { i: num(a.i, 0, 400) | 0, attacker: p.id, h: {
            dmg: num(h.dmg, 0, 5000), burnMs: num(h.burnMs, 0, 20000), element: h.element ? str(h.element, 16) : null,
            status: h.status ? { id: str(st.id, 24), ms: num(st.ms, 0, 30000) } : null, from: h.from ? vec(h.from) : null } });
    });
    on('enemy:killed', a => {   // host → the players who helped: credit for creature `i`
        const p = players.get(socket.id);
        if (!isHost(p) || !Array.isArray(a.by)) return;
        for (const id of a.by.slice(0, 32)) { const q = players.get(id); if (q && q.map === p.map) io.to(id).emit('enemy:credit', { i: num(a.i, 0, 400) | 0 }); }
    });
    // host → a player: creature `i` landed a blow on them. The host is a client, so the claim is checked against
    // its own last snapshot: that creature must be alive and within reach of the target; damage is capped and
    // each player can be struck at most every 0.4 s.
    on('player:strike', a => {
        const p = players.get(socket.id);
        const now = Date.now();
        if (!isHost(p) || now - strikeT < 30) return;
        strikeT = now;
        if (!Number.isInteger(a.i) || a.i < 0 || a.i > 400) return;
        const q = players.get(a.target), e = snaps.get(p.map)?.get(a.i), c = e?.v;
        if (!q || q.map !== p.map || !c || c[6] || now < e.untrustedUntil || now - e.t > 1500) return;   // dead, teleported, or stale
        if (Math.hypot(c[0] - q.move.x, c[2] - q.move.z) > 6) return;   // nowhere near: not a real blow
        if (now - (q.lastHurt ?? 0) < 400) return;
        q.lastHurt = now;
        io.to(q.id).emit('player:hurt', { dmg: num(a.dmg, 0, MAX_STRIKE), from: { x: c[0], y: c[1], z: c[2] } });
    });

    on('chat:send', c => {
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
        announceHost(p.map);   // the next player takes over the creatures
        if (!inMap(p.map).length) snaps.delete(p.map);
        console.log(`[-] ${p.name} (${players.size} online)`);
    });
});
process.on('uncaughtException', e => console.error('uncaught:', e));   // log, never die mid-session

httpServer.listen(PORT, () => console.log(`amo3d game server on :${PORT}`));
