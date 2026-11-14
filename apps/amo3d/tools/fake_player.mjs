// A scripted second player for testing online play: joins a map near a spot, walks in a circle, says
// something, then leaves.  node tools/fake_player.mjs [server] [map] [x] [z] [seconds]
import { io } from 'socket.io-client';

const [server = 'http://localhost:3003', map = 'outdoor', cx = '0', cz = '0', secs = '20'] = process.argv.slice(2);
const s = io(server, { transports: ['websocket'] });
const look = { skin: '#c8a080', hair: { style: 'ponytail', color: '#2a2018' }, outfit: { style: 'tunic', coat: '#2a6a8a', trim: '#d8c070', pants: '#3a3430' } };
let t = 0;
s.on('connect', () => {
    console.log('connected', s.id);
    s.emit('player:join', { name: 'Test Wanderer', level: 3, look, weapon: 'sword', map, move: { x: +cx, y: 0, z: +cz, facing: 0 } });
    setTimeout(() => s.emit('chat:send', { text: 'Hello from the road!' }), 1500);
});
s.on('players:init', l => console.log('others here:', l.map(p => p.name).join(', ') || 'none'));
s.on('chat:message', m => console.log('chat', m.name, ':', m.text));
const timer = setInterval(() => {
    t += 0.1;
    s.emit('player:move', { map, x: +cx + Math.cos(t * 0.6) * 3, y: 0, z: +cz + Math.sin(t * 0.6) * 3, facing: t * 0.6 + Math.PI, speed: 2.4 });
}, 100);
setTimeout(() => { clearInterval(timer); s.disconnect(); process.exit(0); }, +secs * 1000);
