import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';

const PORT = 3002;
const app  = express();
const httpServer = createServer(app);
const io   = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

const players       = new Map(); // socketId → PlayerState
const mapAuthority  = new Map(); // mapId    → socketId  (who runs enemy AI)

function _playersInMap(mapId) {
    return [...players.values()].filter(p => p.mapId === mapId);
}

io.on('connection', (socket) => {
    console.log(`[+] ${socket.id}`);

    socket.on('player:join', ({ name, characterId, x, y, facing, mapId }) => {
        const state = {
            id:          socket.id,
            name:        name        ?? `Wanderer_${socket.id.slice(0, 4)}`,
            characterId: characterId ?? 'eldrin',
            x, y, facing,
            mapId:       mapId ?? 'prologue_forest',
        };
        players.set(socket.id, state);
        socket.join(state.mapId);

        const others = _playersInMap(state.mapId).filter(p => p.id !== socket.id);
        socket.emit('players:init', others);
        socket.to(state.mapId).emit('player:joined', state);

        // First player in a map becomes the enemy authority
        if (!mapAuthority.has(state.mapId)) {
            mapAuthority.set(state.mapId, socket.id);
            socket.emit('you:authority');
            console.log(`  authority: ${state.name} owns ${state.mapId}`);
        } else {
            socket.emit('you:follower');
        }

        console.log(`  join  ${state.name} → ${state.mapId} (${others.length} others)`);
    });

    socket.on('player:move', ({ x, y, facing, mapId }) => {
        const state = players.get(socket.id);
        if (!state) return;
        if (state.mapId !== mapId) {
            socket.leave(state.mapId);
            socket.join(mapId);
            // Re-evaluate authority if map changed
            if (mapAuthority.get(state.mapId) === socket.id) {
                mapAuthority.delete(state.mapId);
                _promoteAuthority(state.mapId, socket.id);
            }
            state.mapId = mapId;
        }
        state.x = x; state.y = y; state.facing = facing;
        socket.to(state.mapId).emit('player:moved', { id: socket.id, x, y, facing });
    });

    // Authority → relay enemy positions to followers in the same map
    socket.on('enemy:sync', ({ enemies, mapId }) => {
        socket.to(mapId).emit('enemy:sync', enemies);
    });

    // Authority → relay enemy death to followers
    socket.on('enemy:died', ({ id, mapId }) => {
        socket.to(mapId).emit('enemy:died', { id });
    });

    socket.on('disconnect', () => {
        const state = players.get(socket.id);
        if (state) {
            io.to(state.mapId).emit('player:left', { id: socket.id });
            // If authority disconnected, promote next player in map
            if (mapAuthority.get(state.mapId) === socket.id) {
                mapAuthority.delete(state.mapId);
                _promoteAuthority(state.mapId, socket.id);
            }
            players.delete(socket.id);
            console.log(`[-] ${state.name}`);
        }
    });
});

function _promoteAuthority(mapId, excludeId) {
    const next = _playersInMap(mapId).find(p => p.id !== excludeId);
    if (!next) return;
    mapAuthority.set(mapId, next.id);
    io.to(next.id).emit('you:authority');
    console.log(`  authority promoted: ${next.name} now owns ${mapId}`);
}

app.get('/status', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ players: players.size, list: [...players.values()].map(p => p.name) });
});

httpServer.listen(PORT, () => console.log(`amo game server  :${PORT}`));
