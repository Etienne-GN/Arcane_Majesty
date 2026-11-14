// Test for shared creatures (Phase 6.3). Mode "host": joins first (so it hosts the map), streams a snapshot
// that parks creature 0 at (px, pz), logs the hits it receives, and credits the other player with the kill.
// Mode "guest": joins second, logs the snapshots it receives, hits creature 0 three times.
//   node tools/fake_host.mjs host|guest [map] [px] [pz] [seconds]
import { io } from 'socket.io-client';

const [mode = 'host', map = 'east_road', px = '0', pz = '0', secs = '60'] = process.argv.slice(2);
const s = io('http://localhost:3003', { transports: ['websocket'] });
let other = null, host = null, snaps = 0;
s.on('connect', () => { s.emit('player:join', { name: `Test ${mode}`, level: 2, map, move: { x: +px + 6, y: 0, z: +pz, facing: 0 } }); console.log('joined as', s.id); });
s.on('players:init', l => { if (l[0]) other = l[0].id; console.log('others:', l.map(p => p.name).join(', ') || 'none'); });
s.on('player:joined', p => { other = p.id; console.log('joined:', p.name); });
s.on('map:host', ({ id }) => { host = id; console.log('host is', id === s.id ? 'me' : id); });
s.on('enemy:hit', h => { console.log('got hit on creature', h.i, 'dmg', h.h.dmg, 'from', h.attacker === other ? 'the game' : h.attacker);
    if (mode === 'host') setTimeout(() => s.emit('enemy:killed', { i: h.i, by: [h.attacker] }), 300); });
s.on('enemy:snap', ({ list }) => { if (++snaps % 20 === 1) console.log('snap', list.length, 'creatures; #0 =', JSON.stringify(list[0])); });
s.on('player:hurt', h => console.log('a creature hit me for', h.dmg));
if (mode === 'host') setInterval(() => s.emit('enemy:snap', { list: [[0, +px, 0, +pz, 1.5, 0, 9, 0]] }), 120);
if (mode === 'guest') setTimeout(() => { for (let k = 0; k < 3; k++) setTimeout(() => s.emit('enemy:hit', { i: 0, h: { dmg: 7, burnMs: 0 } }), k * 200); }, 6000);
setTimeout(() => { s.disconnect(); process.exit(0); }, +secs * 1000);
