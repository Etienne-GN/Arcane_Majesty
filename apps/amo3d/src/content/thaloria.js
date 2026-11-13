// Thaloria in 3D, built from amo's own city (data/maps/regions/thaloria.js): the tile grid gives the
// ground (grass, roads, the paved square), the named pieces give the city wall, every building
// (a roof patch + its front wall row with door and windows → a house of that footprint, roof style
// from the roof pieces' names, walls from the wall pieces'), trees, bushes, flowers, statues, lamps,
// stalls. 1 tile = 1 m. Landmarks and the gates come from amo too; the West Gate is the road to
// Eldrin's Tower (here: the glade).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { thaloriaMap, regionFormat } from '@rules';
import { flat, colliderAt, pushOut, smoothstep, fbm } from '../engine/lib.js';
import { createOutdoorShell } from '../engine/outdoor.js';
import { createNav } from '../engine/nav.js';
import { bakeStatic } from '../engine/batch.js';
import { buildArch } from '../engine/region.js';
import { treeKinds } from './models/flora.js';
import { createTownsfolk } from './actors/townsfolk.js';
import DOORS from '../../../amo/src/data/maps/interiors/doors.json';

const ROOFS = {   // roof piece family → colour and shape
    scale_red: { color: 0xa83a2a, shape: 'gable' }, dome_gray: { color: 0x8a8e96, shape: 'dome' },
    shingle_wood_brown: { color: 0x6a4a30, shape: 'gable' }, wood_brown: { color: 0x6a4a30, shape: 'gable' },
    shingle_terracotta: { color: 0xc06a3a, shape: 'hip' }, terracotta: { color: 0xc06a3a, shape: 'hip' },
    thatch_gold: { color: 0xc8a050, shape: 'gable' }, brick_teal: { color: 0x3a8a8a, shape: 'hip' },
};
const WALLS = {   // wall piece family → plaster / stone colour and trim
    white_orangebase: { color: 0xe8e0d0, base: 0xc87a3a }, tan_wood_window: { color: 0xd8c09a, base: 0x6a4a30 },
    redbrick_pink: { color: 0xc8857a, base: 0x8a4a3a }, redbrick: { color: 0xa85a40, base: 0x6a3a2a },
    graybrick: { color: 0x9a9690, base: 0x6a6660 }, brick_lightgray: { color: 0xb8b4ac, base: 0x7a7670 },
};
const family = (name, table) => Object.keys(table).sort((a, b) => b.length - a.length).find(k => name.includes(k));

export const INTERIOR_IDS = new Set();
export function createThaloria({ quality }) {
    const scene = new THREE.Scene();
    const D = thaloriaMap.default;
    const W = D.width, H = D.height, half = Math.max(W, H) / 2 + 16;
    const grid = regionFormat.decodeGrid(D.tiles, W, H);
    const wx = x => x - W / 2 + 0.5, wz = y => y - H / 2 + 0.5;   // tile → world (tile centres)
    const colliders = [];
    const add = (c, y1 = 4) => colliders.push({ y0: -1, y1, ...c });

    // Pieces by tile.
    const pieces = new Map();   // "x,y" → [names]
    for (const [, ni, x, y] of D.deco) { const k = `${x},${y}`; (pieces.get(k) ?? pieces.set(k, []).get(k)).push(D.names[ni]); }
    const has = (x, y, test) => (pieces.get(`${x},${y}`) ?? []).some(test);
    const isWall = n => n === 'wall_stone_circular_gray' || n === 'wall_brick_lightgray';
    const isBuilding = n => (n.startsWith('roof') || n.startsWith('door') || n.startsWith('window') || (n.startsWith('wall') && !isWall(n)));

    // ---------- ground: inside flat, outside rising into wooded hills ----------
    const inside = (x, z) => Math.abs(x) <= W / 2 && Math.abs(z) <= H / 2;
    function heightAt(x, z) {
        const out = Math.max(Math.abs(x) - W / 2, Math.abs(z) - H / 2, 0);
        return smoothstep(2, 14, out) * (6 + 6 * fbm(x * 0.05, z * 0.05));
    }
    const tileAt = (x, z) => { const tx = Math.floor(x + W / 2), ty = Math.floor(z + H / 2); return tx >= 0 && ty >= 0 && tx < W && ty < H ? grid[ty][tx] : 1; };
    const SIZE = half * 2;
    const ground = new THREE.PlaneGeometry(SIZE, SIZE, SIZE, SIZE).rotateX(-Math.PI / 2).toNonIndexed();
    const gp = ground.attributes.position, gc = new Float32Array(gp.count * 3), col = new THREE.Color();
    const C = { grass: new THREE.Color(0x5a8a3a), grass2: new THREE.Color(0x6e9a46), road: new THREE.Color(0x9a8466), street: new THREE.Color(0xa8a49a), out: new THREE.Color(0x4d7a35) };
    for (let i = 0; i < gp.count; i += 3) {
        const cx = (gp.getX(i) + gp.getX(i + 1) + gp.getX(i + 2)) / 3, cz = (gp.getZ(i) + gp.getZ(i + 1) + gp.getZ(i + 2)) / 3;
        const t = inside(cx, cz) ? tileAt(cx, cz) : -1;
        if (t === 2) col.copy(C.road).offsetHSL(0, 0, (fbm(cx * 0.6, cz * 0.6, 2) - 0.5) * 0.06);
        else if (t === 3) col.copy(C.street).offsetHSL(0, 0, ((Math.floor(cx) + Math.floor(cz)) % 2 ? 0.03 : -0.02) + (fbm(cx, cz, 2) - 0.5) * 0.05);
        else if (t === -1) col.copy(C.out).lerp(C.grass2, fbm(cx * 0.08, cz * 0.08, 3));
        else col.copy(C.grass).lerp(C.grass2, fbm(cx * 0.1, cz * 0.1, 3));
        for (let k = 0; k < 3; k++) { gp.setY(i + k, heightAt(gp.getX(i + k), gp.getZ(i + k))); gc.set([col.r, col.g, col.b], (i + k) * 3); }
    }
    ground.setAttribute('color', new THREE.BufferAttribute(gc, 3));
    ground.computeVertexNormals();
    const groundMesh = new THREE.Mesh(ground, flat(0xffffff, { vertexColors: true }));
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // ---------- the city wall ----------
    const wallCells = [];
    for (const [k, names] of pieces) if (names.some(isWall)) { const [x, y] = k.split(',').map(Number); wallCells.push([x, y, names.includes('wall_stone_circular_gray')]); }
    const stone = new THREE.InstancedMesh(new THREE.BoxGeometry(1.02, 1, 1.02), flat(0xffffff), wallCells.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    const merlons = [];
    wallCells.forEach(([x, y, outer], i) => {
        const h = outer ? 5 : 3.6;
        stone.setMatrixAt(i, m4.compose(v.set(wx(x), h / 2, wz(y)), q.identity(), s.set(1, h, 1)));
        stone.setColorAt(i, col.setHex(outer ? 0x8a867e : 0x9e9a92).offsetHSL(0, 0, (((x * 7 + y * 13) % 5) - 2) * 0.012));
        if (outer && (x + y) % 2 === 0) merlons.push([wx(x), wz(y)]);
        add({ x: wx(x), z: wz(y), r: 0.62, kind: 'wall' }, h);
    });
    stone.castShadow = stone.receiveShadow = true;
    scene.add(stone);
    const merl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), flat(0x7e7a72), merlons.length);
    merlons.forEach(([x, z], i) => merl.setMatrixAt(i, m4.compose(v.set(x, 5.35, z), q.identity(), s.set(1, 1, 1))));
    merl.castShadow = true;
    scene.add(merl);

    // ---------- buildings: connected roof/wall/door/window cells → a house each ----------
    const seen = new Set(), houses = [];
    for (const [k, names] of pieces) {
        if (seen.has(k) || !names.some(isBuilding)) continue;
        const cells = [], stack = [k];
        seen.add(k);
        while (stack.length) {
            const c = stack.pop(), [x, y] = c.split(',').map(Number);
            cells.push([x, y]);
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const n = `${x + dx},${y + dy}`;
                if (!seen.has(n) && (pieces.get(n) ?? []).some(isBuilding)) { seen.add(n); stack.push(n); }
            }
        }
        if (cells.length < 6) continue;
        const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const all = cells.flatMap(([x, y]) => pieces.get(`${x},${y}`));
        const count = tbl => { const c = {}; for (const n of all) { const f = family(n, tbl); if (f) c[f] = (c[f] ?? 0) + 1; } return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0]; };
        const front = [];   // door and window tiles on the front row
        for (const [x, y] of cells) for (const n of pieces.get(`${x},${y}`)) {
            if (n.startsWith('door')) front.push({ x, y, kind: 'door', ornate: n.includes('gold') || n.includes('arch') });
            else if (n.startsWith('window')) front.push({ x, y, kind: 'window', stained: n.includes('stained') });
        }
        houses.push({ x0, x1, y0, y1, roof: ROOFS[count(ROOFS)] ?? ROOFS.scale_red, wall: WALLS[count(WALLS)] ?? WALLS.white_orangebase, front });
    }
    const LM = Object.fromEntries((D.spawns.landmarks ?? []).map(l => [l.id, l]));
    const near = (h, l) => l && l.x >= h.x0 - 3 && l.x <= h.x1 + 3 && l.y >= h.y0 - 4 && l.y <= h.y1 + 4;
    const geos = { walls: [], roofs: [], trim: [], dark: [], glass: [], doors: [] };
    const colored = (g, hex) => { const n = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(hex), a = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) a.set([c.r, c.g, c.b], i); n.setAttribute('color', new THREE.BufferAttribute(a, 3)); for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'color'].includes(k)) n.deleteAttribute(k); return n; };
    for (const h of houses) {
        const w = h.x1 - h.x0 + 1, d = h.y1 - h.y0 + 1, cx = wx(h.x0) + w / 2 - 0.5, cz = wz(h.y0) + d / 2 - 0.5;
        const bell = near(h, LM.thaloria_bell_tower_square), temple = near(h, LM.thaloria_temple), manor = near(h, LM.thaloria_manor);
        const wallH = manor ? 6.5 : temple ? 7 : 3.4 + (w * d > 60 ? 1.6 : 0);
        geos.walls.push(colored(new THREE.BoxGeometry(w, wallH, d).translate(cx, wallH / 2, cz), h.wall.color));
        geos.trim.push(colored(new THREE.BoxGeometry(w + 0.12, 0.7, d + 0.12).translate(cx, 0.35, cz), h.wall.base));
        geos.trim.push(colored(new THREE.BoxGeometry(w + 0.1, 0.18, d + 0.1).translate(cx, wallH, cz), h.wall.base));
        const rh = Math.min(w, d) * 0.45 + 0.6;
        if (h.roof.shape === 'dome' || temple) {
            geos.roofs.push(colored(new THREE.SphereGeometry(Math.min(w, d) * 0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(w / Math.min(w, d), 0.9, d / Math.min(w, d)).translate(cx, wallH, cz), h.roof.color));
        } else if (h.roof.shape === 'hip') {
            geos.roofs.push(colored(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4).scale(w + 0.6, rh, d + 0.6).translate(cx, wallH + rh / 2, cz), h.roof.color));
        } else {   // gable: ridge along the longer side
            const along = w >= d, L = (along ? w : d) + 0.6, S = (along ? d : w) + 0.6;
            const shape = new THREE.Shape([new THREE.Vector2(-S / 2, 0), new THREE.Vector2(S / 2, 0), new THREE.Vector2(0, rh)]);
            const g = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false }).translate(0, 0, -L / 2);
            if (along) g.rotateY(Math.PI / 2);
            geos.roofs.push(colored(g.translate(cx, wallH, cz), h.roof.color));
        }
        if (bell) {   // the bell tower rises out of its building
            geos.walls.push(colored(new THREE.BoxGeometry(3, 15, 3).translate(cx, 7.5, cz), 0xb8b4ac));
            geos.roofs.push(colored(new THREE.ConeGeometry(2.4, 4, 4).rotateY(Math.PI / 4).translate(cx, 17, cz), 0x5a6a78));
            geos.dark.push(colored(new THREE.BoxGeometry(1.4, 2, 3.1).translate(cx, 12.5, cz), 0x1a1612), colored(new THREE.BoxGeometry(3.1, 2, 1.4).translate(cx, 12.5, cz), 0x1a1612));
        }
        // Front (the side amo draws: +z), doors and windows where amo has them.
        const fz = wz(h.y1) + 0.5 + 0.02;
        for (const f of h.front) {
            const fx = wx(f.x);
            if (f.kind === 'door') {
                geos.doors.push(colored(new THREE.BoxGeometry(1.1, 2.1, 0.12).translate(fx, 1.05, fz), f.ornate ? 0x7a2a1a : 0x5a3a20));
                geos.trim.push(colored(new THREE.BoxGeometry(1.4, 0.18, 0.2).translate(fx, 2.2, fz), h.wall.base));
            } else {
                for (const y of wallH > 4.5 ? [1.6, 3.6] : [1.7]) {
                    geos.glass.push(colored(new THREE.BoxGeometry(0.8, 0.9, 0.1).translate(fx, y, fz), f.stained ? 0x9a5ac8 : 0xffd890));
                    geos.trim.push(colored(new THREE.BoxGeometry(1.0, 0.12, 0.2).translate(fx, y - 0.5, fz), h.wall.base));
                }
            }
        }
        // Collide with the footprint's four sides.
        const X0 = wx(h.x0) - 0.5, X1 = wx(h.x1) + 0.5, Z0 = wz(h.y0) - 0.5, Z1 = wz(h.y1) + 0.5;
        for (const [ax, az, bx, bz] of [[X0, Z0, X1, Z0], [X1, Z0, X1, Z1], [X1, Z1, X0, Z1], [X0, Z1, X0, Z0]]) add({ ax, az, bx, bz, r: 0.15, kind: 'wall' }, wallH + 2);
    }
    const windowMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0xffb860, emissiveIntensity: 0, flatShading: true });
    for (const [key, mat] of [['walls', flat(0xffffff, { vertexColors: true })], ['roofs', flat(0xffffff, { vertexColors: true })], ['trim', flat(0xffffff, { vertexColors: true })],
        ['dark', flat(0xffffff, { vertexColors: true })], ['doors', flat(0xffffff, { vertexColors: true })], ['glass', windowMat]]) {
        if (!geos[key].length) continue;
        const mesh = new THREE.Mesh(mergeGeometries(geos[key]), mat);
        mesh.castShadow = mesh.receiveShadow = true;
        scene.add(mesh);
    }

    // ---------- greenery and street furniture ----------
    const byName = test => [...pieces].flatMap(([k, ns]) => ns.filter(test).map(n => { const [x, y] = k.split(',').map(Number); return { x: wx(x), z: wz(y), n }; }));
    const inst = (geo, mat, list, place) => {
        if (!list.length) return;
        const im = new THREE.InstancedMesh(geo, mat, list.length);
        list.forEach((it, i) => { place(it, i); im.setMatrixAt(i, m4); });
        im.castShadow = true; im.receiveShadow = true;
        scene.add(im);
        return im;
    };
    const bushes = byName(n => n.startsWith('bush'));
    const bush = inst(new THREE.IcosahedronGeometry(0.45, 1).translate(0, 0.35, 0), flat(0xffffff), bushes, (b, i) => { m4.compose(v.set(b.x, 0, b.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i), s.setScalar(0.5 + (i % 5) * 0.05)); });
    bushes.forEach((b, i) => bush?.setColorAt(i, col.setHSL(0.27 + (i % 7) * 0.008, 0.45, 0.32 + (i % 3) * 0.04)));
    const flowers = byName(n => n.startsWith('flower'));
    const fl = inst(new THREE.OctahedronGeometry(0.1, 0).translate(0, 0.22, 0), flat(0xffffff), flowers, (f, i) => { m4.compose(v.set(f.x + ((i * 37) % 7 - 3) * 0.08, 0, f.z + ((i * 53) % 7 - 3) * 0.08), q.identity(), s.setScalar(1)); });
    flowers.forEach((f, i) => fl?.setColorAt(i, col.set(f.n.includes('pink') ? 0xe88ab0 : 0xf4f2e8)));
    const K = treeKinds();
    const trees = byName(n => n.startsWith('tree'));
    for (const part of ['trunk', 'crown']) {
        const im = inst(K.broad[part], flat(part === 'trunk' ? K.broad.trunkColor : 0xffffff), trees, (t, i) => { m4.compose(v.set(t.x, 0, t.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 1.7), s.setScalar(0.32 + (i % 4) * 0.04)); });   // amo's tree_bush pieces: small garden trees
        if (part === 'crown') trees.forEach((t, i) => im?.setColorAt(i, col.setHSL(t.n.includes('dark') ? 0.3 : 0.26, 0.45, t.n.includes('dark') ? 0.24 : 0.32)));
    }
    trees.forEach(t => add({ x: t.x, z: t.z, r: 0.15, kind: 'wall' }, 2));
    // Knight statues, street lamps, market stalls, barrels.
    const props = new THREE.Group();
    const box = (w, h, d, c, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(c)); o.position.set(x, y, z); o.castShadow = true; props.add(o); return o; };
    for (const st of byName(n => n.startsWith('knight_statue'))) {
        box(0.9, 0.8, 0.9, 0x7a766e, st.x, 0.4, st.z);
        box(0.5, 1.3, 0.35, 0x9a968e, st.x, 1.45, st.z);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), flat(0x9a968e)); head.position.set(st.x, 2.3, st.z); props.add(head);
        box(0.06, 1.6, 0.06, 0x9a968e, st.x + 0.35, 1.5, st.z + 0.1);
        add({ x: st.x, z: st.z, r: 0.55, kind: 'wall' }, 2.5);
    }
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd890, emissive: 0xffb050, emissiveIntensity: 0 });
    const lamps = byName(n => n === 'street_lamp_lit');
    const lampLights = lamps.map(l => {
        box(0.12, 2.6, 0.12, 0x2a2a2e, l.x, 1.3, l.z);
        const g = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), lampMat); g.position.set(l.x, 2.75, l.z); props.add(g);
        add({ x: l.x, z: l.z, r: 0.15, kind: 'wall' }, 3);
        const light = new THREE.PointLight(0xffb060, 0, 9, 1.6); light.position.set(l.x, 2.6, l.z); scene.add(light);
        return light;
    });
    for (const m of byName(n => n === 'market_stall')) {
        for (const [dx, dz] of [[-0.9, -0.6], [0.9, -0.6], [-0.9, 0.6], [0.9, 0.6]]) box(0.08, 2, 0.08, 0x5a3a20, m.x + dx, 1, m.z + dz);
        box(2.2, 0.08, 1.6, 0xc84a3a, m.x, 2.05, m.z).rotation.x = 0.15;
        box(1.9, 0.8, 0.7, 0x7a5a3a, m.x, 0.4, m.z + 0.3);
        add({ ax: m.x - 1, az: m.z + 0.3, bx: m.x + 1, bz: m.z + 0.3, r: 0.4, kind: 'wall' }, 1);
    }
    // The fountain on the square.
    const sq = LM.thaloria_square;
    if (sq) {
        const fx = wx(sq.x), fz = wz(sq.y);
        const basin = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 0.7, 20), flat(0xa8a49a)); basin.position.set(fx, 0.35, fz); basin.castShadow = true; props.add(basin);
        const water = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a8aa8, roughness: 0.1, metalness: 0.2 })); water.position.set(fx, 0.62, fz); props.add(water);
        const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2, 10), flat(0xa8a49a)); col2.position.set(fx, 1.3, fz); props.add(col2);
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.4, 0.3, 14), flat(0xa8a49a)); bowl.position.set(fx, 2.3, fz); props.add(bowl);
        add({ x: fx, z: fz, r: 2.6, kind: 'wall' }, 1);
    }
    scene.add(props);

    // ---------- gates ----------
    const map = {
        id: 'thaloria', name: 'Thaloria', scene, heightAt, terrain: true, colliders,
        camera: { maxDist: 22, pitch: 0.42, dist: 8.5 },
        groundAt: (x, z) => heightAt(x, z),
        blockedAt(x, z, r, y = heightAt(x, z)) {
            const c = colliderAt(colliders, x, z, r, y);
            if (c) return c.kind;
            return Math.abs(x) > W / 2 + 10 || Math.abs(z) > H / 2 + 10 ? 'wall' : null;
        },
        resolve: (pos, r) => pushOut(colliders, pos, r),
        passable: (x, z) => Math.abs(x) <= W / 2 + 10 && Math.abs(z) <= H / 2 + 10,
        projectileHit(p) {
            if (p.y < heightAt(p.x, p.z) + 0.05) return 'ground';
            const c = colliderAt(colliders, p.x, p.z, 0.15, p.y);
            return c && p.y >= c.y0 + 0.5 ? 'object' : null;
        },
        groundNormal: () => new THREE.Vector3(0, 1, 0),
        triggers: [], spawns: {}, stations: [], hittables: [], gatherSpots: [], gates: [],
    };
    const west = D.portals.find(p => p.id === 'thaloria_to_eldrin_tower'), east = D.portals.find(p => p.id === 'thaloria_east_gate');
    // The West Gate: an arch in the wall, the road to Eldrin's Tower (the glade).
    // The gates sit in the gaps of the wall on the portals' row (between the two road tiles).
    const rowCells = wallCells.filter(([, y, outer]) => outer && Math.abs(y - west.y) < 8).map(([x]) => x);
    const gx = wx(Math.min(...rowCells)) + 0.5, gz = wz(west.y) + 0.5;
    const veil = buildArch(scene, gx, 0, gz, Math.PI / 2);
    map.triggers.push({ x: gx, z: gz, r: 1.4, label: "The West Gate — the road to Eldrin's Tower", to: 'outdoor', spawn: 'from_thaloria' });
    map.spawns.from_glade = { x: gx + 4, z: gz, facing: Math.PI / 2 };
    map.spawns.start = map.spawns.from_glade;
    // The East Gate: the winter road east — for now straight up to the Summit of Despair (the East Road between comes later).
    const eastCells = wallCells.filter(([, y, outer]) => outer && Math.abs(y - east.y) < 8).map(([x]) => x);
    const ex = wx(Math.max(...eastCells)), ez = wz(east.y) + 0.5;
    const eveil = buildArch(scene, ex, 0, ez, -Math.PI / 2);
    map.triggers.push({ x: ex, z: ez, r: 1.4, label: 'The East Gate — the winter road', to: 'east_road', spawn: 'from_thaloria' });
    map.spawns.from_east_road = { x: ex - 4, z: ez, facing: -Math.PI / 2 };

    // Doors into the buildings (amo doors.json): walk up to one to go in.
    for (const d of DOORS.thaloria ?? []) {
        if (!INTERIOR_IDS.has(d.interior)) continue;
        const x = wx(d.x), z = wz(d.y) + 1.0;
        map.triggers.push({ x, z, r: 0.75, label: d.label, to: d.interior, spawn: 'enter' });
        map.spawns[`door:${d.interior}`] = { x, z: z + 1.6, facing: 0 };
    }
    // Stations amo puts in Thaloria (the hearth and alchemy table by the market).
    for (const st of D.spawns.stations ?? []) map.stations.push({ mode: st.type === 'hearth' ? 'hearth' : 'alchemy', pos: new THREE.Vector3(wx(st.x), 0, wz(st.y)) });

    map.batch = bakeStatic(scene);
    map.town = createTownsfolk({ scene, W, H, resolve: (pos, r) => pushOut(colliders.filter(c => c.ax !== undefined), pos, r) });   // added after batching: they move
    map.nav = createNav({ colliders, passable: map.passable, half });
    map.mapInfo = {
        half, water: -99, trees: trees.map(t => [t.x, t.z, 0]),
        landmarks: (D.spawns.landmarks ?? []).map(l => ({ name: l.name, x: wx(l.x), z: wz(l.y), icon: l.id.includes('gate') ? 'gate' : l.id.includes('temple') || l.id.includes('bell') ? 'tower' : 'stones' })),
    };
    const shell = createOutdoorShell(scene, { quality, mood: { fog: '#c9d6d4', fogNear: 60, fogFar: 260, fogMix: 0.3, light: 1, nightFloor: 0.45 } });
    map.update = (t, dt, ctx) => {
        const S = shell.update(dt, ctx);
        const night = S.night;
        windowMat.emissiveIntensity = night * 1.4;            // lit windows after dusk
        lampMat.emissiveIntensity = 0.3 + night * 2.2;
        for (const l of lampLights) l.intensity = night * 10;
        veil.material.opacity = eveil.material.opacity = 0.14 + Math.sin(t * 2) * 0.06;
        for (const h of map.hittables) h.update(dt, ctx);
        map.town.update(dt, ctx);
    };
    return map;
}
