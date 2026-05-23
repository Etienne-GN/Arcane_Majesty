import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import { ENEMY_TYPES, TILE_SIZE } from '../src/data/worldMap.js';
import { getMap } from '../src/data/maps/index.js';

const PORT = 3002;
const app  = express();
const httpServer = createServer(app);
const io   = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

const players    = new Map(); // socketId → PlayerState
const mapEnemies = new Map(); // mapId    → ServerEnemy[]

// ── Server-side enemy AI ──────────────────────────────────────────────────────

class ServerEnemy {
    constructor(id, type, x, y) {
        this.id     = id;
        this.type   = type;
        this.x      = x;
        this.y      = y;
        this.spawnX = x;
        this.spawnY = y;
        this.facing = 'down';
        this.dead   = false;

        const def          = ENEMY_TYPES[type] ?? {};
        this.health        = def.health       ?? 20;
        this.speed         = def.speed        ?? 60;
        this.sightRange    = def.sightRange   ?? 100;
        this.attackRange   = def.attackRange  ?? 28;
        this.patrolRadius  = def.patrolRadius ?? 64;
        this.passive       = def.passive      ?? false;
        this.fleeRadius    = def.fleeRadius   ?? 90;
        this.stationary    = def.stationary   ?? false;

        this._ptx     = x;
        this._pty     = y;
        this._ptTimer = 0;
    }

    update(dt, playersInMap) {
        if (this.dead || this.stationary) return;

        const { dist, player } = this._nearest(playersInMap);

        if (this.passive) {
            if (player && dist < this.fleeRadius) {
                const dx = this.x - player.x, dy = this.y - player.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                this.x += (dx / len) * this.speed * dt;
                this.y += (dy / len) * this.speed * dt;
                this._face(dx, dy);
            } else {
                this._patrol(dt);
            }
            return;
        }

        if (player && dist < this.sightRange && dist > this.attackRange) {
            const dx = player.x - this.x, dy = player.y - this.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            this.x += (dx / len) * this.speed * dt;
            this.y += (dy / len) * this.speed * dt;
            this._face(dx, dy);
        } else if (!player || dist >= this.sightRange) {
            this._patrol(dt);
        }
        // within attackRange → stand still (client combatManager handles damage)
    }

    _patrol(dt) {
        this._ptTimer -= dt * 1000;
        const dx = this._ptx - this.x, dy = this._pty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4 || this._ptTimer <= 0) {
            const angle = Math.random() * Math.PI * 2;
            const r     = Math.random() * this.patrolRadius;
            this._ptx     = this.spawnX + Math.cos(angle) * r;
            this._pty     = this.spawnY + Math.sin(angle) * r;
            this._ptTimer = 2000 + Math.random() * 3000;
        } else {
            const len = dist || 1;
            this.x += (dx / len) * this.speed * 0.4 * dt;
            this.y += (dy / len) * this.speed * 0.4 * dt;
            this._face(dx, dy);
        }
    }

    _nearest(playersInMap) {
        let minDist = Infinity, nearest = null;
        for (const p of playersInMap) {
            const dx = p.x - this.x, dy = p.y - this.y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < minDist) { minDist = d; nearest = p; }
        }
        return { dist: minDist, player: nearest };
    }

    _face(dx, dy) {
        if (Math.abs(dx) > Math.abs(dy)) {
            this.facing = dx > 0 ? 'right' : 'left';
        } else {
            this.facing = dy > 0 ? 'down' : 'up';
        }
    }

    kill() {
        this.dead   = true;
        this.health = 0;
    }

    toState() {
        return {
            id:     this.id,
            x:      Math.round(this.x),
            y:      Math.round(this.y),
            health: this.health,
            facing: this.facing,
        };
    }
}

function initMapEnemies(mapId) {
    if (mapEnemies.has(mapId)) return;
    const mapDef = getMap(mapId);
    if (!mapDef) return;

    const enemies = (mapDef.spawns?.enemies ?? []).map((spawn, idx) => {
        const wx = spawn.x * TILE_SIZE + TILE_SIZE / 2;
        const wy = spawn.y * TILE_SIZE + TILE_SIZE / 2;
        return new ServerEnemy(idx, spawn.type, wx, wy);
    });
    mapEnemies.set(mapId, enemies);
    console.log(`  enemies: ${enemies.length} spawned for ${mapId}`);
}

// ── 10 Hz server game loop ────────────────────────────────────────────────────

const TICK_MS = 100;
setInterval(() => {
    const dt = TICK_MS / 1000;

    for (const [mapId, enemies] of mapEnemies) {
        const inMap = _playersInMap(mapId);
        if (inMap.length === 0) continue;

        const alive = enemies.filter(e => !e.dead);
        if (alive.length === 0) continue;

        alive.forEach(e => e.update(dt, inMap));
        io.to(mapId).emit('enemy:sync', alive.map(e => e.toState()));
    }
}, TICK_MS);

// ── Helpers ───────────────────────────────────────────────────────────────────

function _playersInMap(mapId) {
    return [...players.values()].filter(p => p.mapId === mapId);
}

// ── Socket handlers ───────────────────────────────────────────────────────────

io.on('connection', (socket) => {
    console.log(`[+] ${socket.id}`);

    socket.on('player:join', ({ name, characterId, x, y, facing, mapId }) => {
        const resolvedMap = mapId ?? 'prologue_forest';
        const state = {
            id:          socket.id,
            name:        name        ?? `Wanderer_${socket.id.slice(0, 4)}`,
            characterId: characterId ?? 'eldrin',
            x: x ?? 0, y: y ?? 0, facing: facing ?? 'down',
            mapId:       resolvedMap,
        };
        players.set(socket.id, state);
        socket.join(resolvedMap);

        initMapEnemies(resolvedMap);

        const others = _playersInMap(resolvedMap).filter(p => p.id !== socket.id);
        socket.emit('players:init', others);
        socket.to(resolvedMap).emit('player:joined', state);

        // Send current enemy positions to the joining player
        const allEnemies = mapEnemies.get(resolvedMap) ?? [];
        const alive = allEnemies.filter(e => !e.dead);
        if (alive.length) socket.emit('enemy:sync', alive.map(e => e.toState()));

        // Kill enemies that already died so the client doesn't show frozen corpses
        allEnemies.filter(e => e.dead).forEach(e => socket.emit('enemy:died', { id: e.id }));

        console.log(`  join  ${state.name} → ${resolvedMap} (${others.length} others)`);
    });

    socket.on('player:move', ({ x, y, facing, mapId }) => {
        const state = players.get(socket.id);
        if (!state) return;
        if (state.mapId !== mapId) {
            socket.leave(state.mapId);
            socket.join(mapId);
            state.mapId = mapId;
            initMapEnemies(mapId);
        }
        state.x = x; state.y = y; state.facing = facing;
        socket.to(state.mapId).emit('player:moved', { id: socket.id, x, y, facing });
    });

    // Client killed an enemy (authoritative kill report)
    socket.on('enemy:died', ({ id, mapId }) => {
        const state = players.get(socket.id);
        if (!state) return;
        const target  = mapId ?? state.mapId;
        const enemies = mapEnemies.get(target) ?? [];
        const enemy   = enemies[id];
        if (!enemy || enemy.dead) return;
        enemy.kill();
        io.to(target).emit('enemy:died', { id });
        console.log(`  enemy ${id} (${enemy.type}) died in ${target}`);
    });

    socket.on('disconnect', () => {
        const state = players.get(socket.id);
        if (state) {
            // Broadcast to all others in the same map before removing
            socket.to(state.mapId).emit('player:left', { id: socket.id });
            players.delete(socket.id);
            console.log(`[-] ${state.name}`);
        }
    });
});

app.get('/status', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ players: players.size, list: [...players.values()].map(p => p.name) });
});

httpServer.listen(PORT, () => console.log(`amo game server  :${PORT}`));
