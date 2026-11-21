// Dungeons — rooms and corridors laid out from a seed on a grid of 2 m cells, built in code:
//   - rooms placed at random without overlapping, joined in a chain (plus a loop or two) by L-shaped corridors;
//   - the first room is the way in (back up / out), the room farthest from it holds the boss and, on a level that
//     goes deeper, the stairs down — barred until the boss falls;
//   - stone walls round every walkable cell, a floor in uneven flags, torches on the room walls (flickering lights),
//     a theme's dressing (a mine: timber props and beams in the corridors, rails, ore carts);
//   - enemies at posts in the rooms (beast.js bodies), chests in some rooms (seeded contents), a codex desk.
// A dungeon level is a plain map: the same interface as the interiors (flat floor, colliders, triggers, spawns).
// Def (content/dungeons.js): { id, name, seed, size, rooms, theme, enemies: { kinds, per }, boss: { kind, name },
//   chests, exit: { to, spawn, label }, down: { to, label } }
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flat, colliderAt, pushOut } from './lib.js';
import { createNav } from './nav.js';
import { createBeasts } from '../content/actors/beast.js';
import { buildChest } from '../game/chest.js';

const THEMES = {
    mine: { floor: [0x5a4e42, 0x665848], wall: 0x6a5e50, wallTop: 0x4a4238, fog: 0x0c0a08, torch: 0xffa850, ambient: 0x6a5a48, timber: 0x5a3e24 },
    inferno: { floor: [0x4a3e3a, 0x564842], wall: 0x3e3644, wallTop: 0x5a4e5e, fog: 0x2a1008, torch: 0xff7a30, ambient: 0xb87a5a, timber: 0x2a2020, cracks: 0xc8481a },
    crypt: { floor: [0x5a5862, 0x66646e], wall: 0x4e4c58, wallTop: 0x6a6876, fog: 0x0e0e16, torch: 0xb8d0ff, ambient: 0x8a8aa8, timber: 0x3a3430 },
};

function rngFrom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// The layout: a grid of cells (1 = floor), rooms [{ x, y, w, h, cx, cy }].
export function layoutDungeon({ seed = 1, size = 36, rooms: want = 8, layout = 'rooms' }) {
    const rng = rngFrom(seed), grid = Array.from({ length: size }, () => new Uint8Array(size)), rooms = [];
    if (layout === 'maze') {   // a true maze: passages carved cell by cell (recursive backtracker), then a few open halls cut into it
        const stack = [[1, 1]]; grid[1][1] = 1;
        while (stack.length) {
            const [x, y] = stack[stack.length - 1];
            const next = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([a, b]) => [x + a, y + b, x + a / 2, y + b / 2]).filter(([nx, ny]) => nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && !grid[ny][nx]);
            if (!next.length) { stack.pop(); continue; }
            const [nx, ny, mx, my] = next[Math.floor(rng() * next.length)];
            grid[my][mx] = 1; grid[ny][nx] = 1; stack.push([nx, ny]);
        }
        for (let k = 0; k < 10; k++) { const x = 1 + 2 * Math.floor(rng() * ((size - 3) / 2)), y = 1 + 2 * Math.floor(rng() * ((size - 3) / 2)); if (rng() < 0.5 && grid[y][x + 2]) grid[y][x + 1] = 1; else if (grid[y + 2]?.[x]) grid[y + 1][x] = 1; }   // a few loops
        const hall = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grid[j][i] = 1; rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) }); };
        hall(1, 1, 3, 3);   // the way in, in a corner
        for (let tries = 0; tries < 200 && rooms.length < want; tries++) {
            const w = 3 + Math.floor(rng() * 3), h = 3 + Math.floor(rng() * 3), x = 1 + Math.floor(rng() * (size - w - 2)), y = 1 + Math.floor(rng() * (size - h - 2));
            if (rooms.some(r => x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y)) continue;
            hall(x, y, w, h);
        }
    } else {
    for (let tries = 0; tries < 400 && rooms.length < want; tries++) {
        const w = 3 + Math.floor(rng() * 4), h = 3 + Math.floor(rng() * 4);
        const x = 1 + Math.floor(rng() * (size - w - 2)), y = 1 + Math.floor(rng() * (size - h - 2));
        if (rooms.some(r => x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y)) continue;
        rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
    }
    for (const r of rooms) for (let j = r.y; j < r.y + r.h; j++) for (let i = r.x; i < r.x + r.w; i++) grid[j][i] = 1;
    }
    // Join them: each room to its nearest already-joined one (a tree), then a couple of extra links (loops).
    const carve = (a, b) => {
        const horizFirst = rng() < 0.5;
        const [mx, my] = horizFirst ? [b.cx, a.cy] : [a.cx, b.cy];
        for (const [p, q] of [[a, { cx: mx, cy: my }], [{ cx: mx, cy: my }, b]]) {
            for (let i = Math.min(p.cx, q.cx); i <= Math.max(p.cx, q.cx); i++) grid[p.cy][i] = 1;
            for (let j = Math.min(p.cy, q.cy); j <= Math.max(p.cy, q.cy); j++) grid[j][q.cx] = 1;
        }
    };
    const joined = [rooms[0]];
    if (layout !== 'maze') {
    for (const r of rooms.slice(1)) { const n = joined.reduce((b, q) => Math.hypot(q.cx - r.cx, q.cy - r.cy) < Math.hypot(b.cx - r.cx, b.cy - r.cy) ? q : b); carve(n, r); joined.push(r); }
    for (let k = 0; k < 2 && rooms.length > 3; k++) carve(rooms[Math.floor(rng() * rooms.length)], rooms[Math.floor(rng() * rooms.length)]);
    }
    // The boss room: the one farthest from the way in, by walking distance.
    const dist = Array.from({ length: size }, () => new Int32Array(size).fill(-1)), q = [[rooms[0].cx, rooms[0].cy]];
    dist[rooms[0].cy][rooms[0].cx] = 0;
    while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (grid[ny]?.[nx] && dist[ny][nx] < 0) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); } } }
    const boss = rooms.slice(1).reduce((b, r) => dist[r.cy][r.cx] > dist[b.cy][b.cx] ? r : b, rooms[1]);
    return { grid, rooms, entry: rooms[0], boss, rng };
}

export function buildDungeon(def) {
    const T = THEMES[def.theme] ?? THEMES.mine, C = 3.4, N = def.size ?? 36,   /* cells 3.4 m: halls a body could fight in */ half = (N * C) / 2;
    const { grid, rooms, entry, boss, rng } = layoutDungeon(def);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(T.fog);
    scene.fog = new THREE.Fog(T.fog, 14, 48);   // the dark closes in: you see your hall, not the whole maze
    const wx = i => i * C - half + C / 2, wz = j => j * C - half + C / 2;
    const cellOf = v => Math.floor((v + half) / C);
    const floorAt = (x, z) => !!grid[cellOf(z)]?.[cellOf(x)];
    const colliders = [], lights = [], H = 6.5, VAULT = 9;   // walls higher than the tallest beast; spells fly free under the vault   // walls the camera still looks down over; the cave's vault high and dark above (spells fly free under it)

    // floor: uneven flags (vertex colours), merged
    const geos = [], col = new THREE.Color();
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        if (!grid[j][i]) continue;
        const g = new THREE.PlaneGeometry(C, C).rotateX(-Math.PI / 2).translate(wx(i), 0, wz(j));
        col.setHex(T.floor[(i * 7 + j * 3) % 2]).multiplyScalar(0.85 + rng() * 0.3);
        if (T.cracks && rng() < 0.06) col.setHex(T.cracks).multiplyScalar(0.55 + rng() * 0.25);   // the floor cracked open on the fire below
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array([...Array(g.attributes.position.count)].flatMap(() => [col.r, col.g, col.b])), 3));
        geos.push(g);
    }
    const floor = new THREE.Mesh(mergeGeometries(geos), flat(0xffffff, { vertexColors: true })); floor.receiveShadow = true; scene.add(floor);
    // walls: every solid cell next to a floor cell; a darker cap on top so the plan reads from above
    const wallCells = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!grid[j][i] && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([a, b]) => grid[j + b]?.[i + a])) wallCells.push([i, j]);
    const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(C, H, C), flat(T.wall), wallCells.length);
    const capMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(C + 0.02, 0.1, C + 0.02), flat(T.wallTop), wallCells.length);
    const m4 = new THREE.Matrix4();
    wallCells.forEach(([i, j], k) => { const h = H * (0.9 + ((i * 13 + j * 7) % 5) * 0.04); m4.makeScale(1, h / H, 1).setPosition(wx(i), h / 2, wz(j)); wallMesh.setMatrixAt(k, m4); m4.makeTranslation(wx(i), h + 0.05, wz(j)); capMesh.setMatrixAt(k, m4); });
    wallMesh.castShadow = wallMesh.receiveShadow = true; scene.add(wallMesh, capMesh);

    // a theme's dressing: timber props in the corridors (a mine), ore carts and rails in some rooms
    const timber = flat(T.timber);
    if (def.theme === 'mine') {
        for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
            if (!grid[j][i] || rooms.some(r => i >= r.x && i < r.x + r.w && j >= r.y && j < r.y + r.h) || (i + j) % 3) continue;
            const ew = grid[j][i - 1] && grid[j][i + 1];   // a corridor running east–west: posts on its north and south sides
            for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, H - 0.4, 0.2), timber); p.position.set(wx(i) + (ew ? 0 : s * 0.85), (H - 0.4) / 2, wz(j) + (ew ? s * 0.85 : 0)); scene.add(p); }
            const beam = new THREE.Mesh(new THREE.BoxGeometry(ew ? 0.2 : 1.9, 0.2, ew ? 1.9 : 0.2), timber); beam.position.set(wx(i), H - 0.4, wz(j)); scene.add(beam);
        }
    }
    if (def.theme === 'crypt') {   // stone coffins along the room walls, candles on their lids
        const stone = flat(0x7a7682), lid = flat(0x8a8692), wax = new THREE.MeshBasicMaterial({ color: 0xfff0c0, toneMapped: false });
        for (const r of rooms) {
            if (r === entry) continue;
            for (let i = r.x; i < r.x + r.w; i += 2) {
                if (rng() < 0.35) continue;
                const x = wx(i), z = wz(r.y) - 0.4;
                const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 1.7), stone); c.position.set(x, 0.3, z); c.castShadow = true; scene.add(c);
                const l = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.8), lid); l.position.set(x, 0.66, z); scene.add(l);
                const cd = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 5), wax); cd.position.set(x + 0.3, 0.8, z + 0.6); scene.add(cd);
                colliders.push({ x, z, r: 0.75, kind: 'wall', y0: -1, y1: 0.8 });
            }
        }
    }
    // torches: one or two per room on a wall (lights capped), a brazier in the boss room
    const torchMat = new THREE.MeshStandardMaterial({ color: 0xffd090, emissive: T.torch, emissiveIntensity: 2 });
    for (const r of rooms) {
        const spots = [[r.x - 0.5, r.cy], [r.x + r.w - 0.5, r.cy]].slice(0, r.w > 4 ? 2 : 1);
        for (const [ci, cj] of spots) {
            const x = (ci + 0.5) * C - half + (ci < r.cx ? 0.15 : -0.15), z = wz(cj);
            const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 5), torchMat); t.position.set(x, 1.7, z); scene.add(t);
            const stick = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), timber); stick.position.set(x, 1.45, z); scene.add(stick);
            if (lights.length < 14) { const l = new THREE.PointLight(T.torch, 16, 14, 1.3); l.position.set(x + (ci < r.cx ? 0.5 : -0.5), 2.2, z); scene.add(l); lights.push({ l, seed: x * 3 + z }); }
        }
    }
    scene.add(new THREE.HemisphereLight(T.ambient, 0x2a2420, 1.3));

    // ---- the map interface ----
    const blockedCell = (x, z, r) => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].some(([a, b]) => !floorAt(x + a, z + b));
    const map = {
        id: def.id, name: def.name, scene, colliders, terrain: false,
        camera: { maxDist: 12, pitch: 0.55, dist: 7.5 },   // behind your shoulder, not over the maze
        camBlockedAt: (x, z, y) => y < H && !floorAt(x, z),   // the walls stop the camera (it pulls in front of them)
        heightAt: () => 0, groundAt: () => 0,
        passable: (x, z) => floorAt(x, z),
        blockedAt(x, z, r = 0.4, y = 0) { if (blockedCell(x, z, r)) return 'wall'; const c = colliderAt(colliders, x, z, r, y); return c ? c.kind : null; },
        stepBlocked: () => false,
        resolve(pos, r) {
            pushOut(colliders, pos, r);
            const ci = cellOf(pos.x), cj = cellOf(pos.z);   // push out of every solid cell nearby (circle against box)
            for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
                if (grid[cj + b]?.[ci + a]) continue;
                const x0 = (ci + a) * C - half, z0 = (cj + b) * C - half;
                const qx = Math.max(x0, Math.min(x0 + C, pos.x)), qz = Math.max(z0, Math.min(z0 + C, pos.z));
                const dx = pos.x - qx, dz = pos.z - qz, d = Math.hypot(dx, dz);
                if (d < r && d > 1e-6) { pos.x = qx + dx / d * r; pos.z = qz + dz / d * r; }
            }
        },
        projectileHit(p) { if (p.y < 0.03) return 'ground'; if (!floorAt(p.x, p.z) || p.y > VAULT) return 'wall'; const c = colliderAt(colliders, p.x, p.z, 0.15, p.y); return c ? 'object' : null; },
        groundNormal: () => new THREE.Vector3(0, 1, 0),
        triggers: [], spawns: {}, stations: [], hittables: [], gatherSpots: [], gates: [],
        mapInfo: { half, dungeon: true, water: -99, trees: [], rocks: [], walls: [], buildings: [], landmarks: [], groundAt: (x, z) => floorAt(x, z) ? 'paved' : 'rock' },
    };
    // the way in / out, in the entry room
    const ex = wx(entry.x), ez = wz(entry.cy);
    const up = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.6), flat(0x6a5e50)); up.position.set(ex, 0.15, ez); scene.add(up);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 12).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.35 })); glow.position.set(ex, 0.32, ez); scene.add(glow);
    map.triggers.push({ x: ex, z: ez, r: 0.9, label: def.exit.label, to: def.exit.to, spawn: def.exit.spawn });
    map.spawns.enter = map.spawns.start = map.spawns.from_above = { x: wx(entry.cx), z: wz(entry.cy), facing: 0 };
    // the boss and the way down (barred until the boss falls)
    const bx = wx(boss.cx), bz = wz(boss.cy);
    let bossBeast = null;
    if (def.boss) { bossBeast = createBeasts({ scene, map, rng, type: def.boss.kind, posts: [{ x: bx, z: bz, boss: true, name: def.boss.name }] })[0]; map.hittables.push(bossBeast); }
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.7, 7), flat(0x2a2420)); brazier.position.set(wx(boss.x), 0.35, wz(boss.y)); scene.add(brazier);
    colliders.push({ x: wx(boss.x), z: wz(boss.y), r: 0.45, kind: 'wall', y0: -1, y1: 1 });
    { const l = new THREE.PointLight(0xff7a30, 14, 14, 1.5); l.position.set(wx(boss.x), 1.4, wz(boss.y)); scene.add(l); lights.push({ l, seed: 9 }); }
    let downT = null;
    if (def.down) {
        const dx = wx(boss.x + boss.w - 1), dz = wz(boss.y + boss.h - 1);
        const hole = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 1.6), new THREE.MeshBasicMaterial({ color: 0x050403 })); hole.position.set(dx, 0.03, dz); scene.add(hole);
        for (let s = 0; s < 3; s++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.4), flat(0x5a5048)); st.position.set(dx, -0.1 - s * 0.25, dz - 0.5 + s * 0.4); scene.add(st); }
        downT = { x: dx, z: dz, r: 0.9, label: def.down.label, to: def.boss ? null : def.down.to, spawn: def.down.spawn ?? 'from_above', _to: def.down.to };
        if (def.boss) downT.label = `${def.down.label} — ${def.boss.name} bars the way`;
        map.triggers.push(downT);
        map.spawns.from_below = { x: dx - 2, z: dz - 2, facing: Math.PI };
    }
    // the creatures: posts in every room but the way in and the boss's
    const kinds = def.enemies?.kinds ?? ['crag_fiend'], [lo, hi] = def.enemies?.per ?? [1, 2];
    for (const r of rooms) {
        if (r === entry || r === boss) continue;
        const n = lo + Math.floor(rng() * (hi - lo + 1));
        const byKind = {};   // each creature its own kind (from the weighted list), so rooms mix
        for (let k = 0; k < n; k++) (byKind[kinds[Math.floor(rng() * kinds.length)]] ??= []).push({ x: wx(r.x + Math.floor(rng() * r.w)), z: wz(r.y + Math.floor(rng() * r.h)) });
        for (const [type, posts] of Object.entries(byKind)) map.hittables.push(...createBeasts({ scene, map, rng, type, posts }));
    }
    // chests in a few rooms (and always one by the boss), a desk to write up the codex in the way in
    const chestRooms = rooms.filter(r => r !== entry).sort(() => rng() - 0.5).slice(0, def.chestRooms ?? 2);
    if (!chestRooms.includes(boss)) chestRooms.push(boss);
    chestRooms.forEach((r, k) => {
        const x = wx(r.x), z = wz(r.y + r.h - 1);
        buildChest(scene, x, 0, z, 0);
        colliders.push({ x, z, r: 0.55, kind: 'wall', y0: -1, y1: 1 });
        const pool = def.chests ?? ['health_potion'];
        const seed = [...Array(r === boss ? 3 : 2)].map(() => pool[Math.floor(rng() * pool.length)]);
        map.stations.push({ mode: 'chest', key: `${def.id}_${k}`, title: r === boss ? 'A heavy chest' : 'Chest', seed, pos: new THREE.Vector3(x, 0, z + 0.9) });
    });
    map.stations.push({ mode: 'desk', pos: new THREE.Vector3(wx(entry.x + entry.w - 1), 0, wz(entry.y)) });

    map.nav = createNav({ colliders, passable: map.passable, half, cell: 1 });
    for (const h of map.hittables) if (h.root) h.root.userData.dynamic = true;
    map.update = (t, dt, ctx) => {
        for (const h of map.hittables) h.update(dt, ctx);
        for (const L of lights) L.l.intensity = 16 * (1 + Math.sin(t * 9 + L.seed) * 0.08 + Math.sin(t * 23 + L.seed * 2) * 0.05);
        if (downT && !downT.to && bossBeast && !bossBeast.alive) { downT.to = downT._to; downT.label = def.down.label; ctx.message?.(`${def.boss.name} is dead. The way down is open.`); }
        glow.material.opacity = 0.25 + Math.sin(t * 2) * 0.1;
    };
    map.mapInfo.landmarks.push({ name: def.exit.label.split(' — ')[0], x: ex, z: ez, icon: 'exit' }, ...(def.boss ? [{ name: def.boss.name, x: bx, z: bz, icon: 'den' }] : []), ...(downT ? [{ name: 'The way down', x: downT.x, z: downT.z, icon: 'door' }] : []));
    map.layout = { rooms, entry, boss };   // tests and the chart
    return map;
}
