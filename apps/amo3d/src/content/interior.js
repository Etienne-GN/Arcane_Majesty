// Generic interior from an amo interior map (data/maps/interiors/*.js MAP): its tile grid (1 = wall,
// 0 = floor) gives the room, its named pieces the furniture (tables, chairs, beds, shelves, barrels,
// rugs, lamps… each a small code-built model), its spawns the chests, signs and inner doors, its
// portal the way out. 1 tile = 1 m. Walls between the camera and the player sink so you can see in.
import * as THREE from 'three';
import { flat, colliderAt, pushOut } from '../engine/lib.js';
import { buildChest } from '../game/chest.js';
import { createTownsfolk } from './actors/townsfolk.js';

const FLOORS = { taupe: 0x9a8a78, wood: 0x8a6a48, stone: 0x8e8a84, gray: 0x8a8a8a, red: 0x9a5a48, green: 0x6a7a5a };
const WALLS = { red_brick: 0x9a4a3a, stone: 0x8a8680, wood: 0x7a5a3a, plaster: 0xd8ccb4, gray: 0x8a8884, tan: 0xc8b090, white: 0xe0d8c8 };
const pickColor = (names, table, fallback) => {
    for (const n of names) for (const k of Object.keys(table)) if (n.includes(k)) return table[k];
    return fallback;
};

function piece(name, M) {
    const g = new THREE.Group();
    const box = (w, h, d, m, x = 0, y = h / 2, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
    const cyl = (r0, r1, h, m, x = 0, y = h / 2, z = 0, seg = 10) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
    let light = null, block = 0.4;
    if (name.includes('table_round')) { cyl(0.45, 0.45, 0.06, M.gold, 0, 0.74); cyl(0.06, 0.12, 0.72, M.dark, 0, 0.36); }
    else if (name.includes('table') && !name.includes('lamp')) { box(1.0, 0.08, 0.9, M.wood, 0, 0.74); for (const [x, z] of [[-0.42, -0.36], [0.42, -0.36], [-0.42, 0.36], [0.42, 0.36]]) box(0.07, 0.72, 0.07, M.dark, x, 0.36, z); }
    else if (name.includes('armchair') || name.includes('chair')) { box(0.45, 0.06, 0.45, name.includes('padded') || name.includes('red') ? M.cloth : M.wood, 0, 0.45); box(0.45, 0.55, 0.06, M.wood, 0, 0.75, -0.2); for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) box(0.05, 0.44, 0.05, M.dark, x, 0.22, z); block = 0.25; }
    else if (name.includes('bench')) { box(0.95, 0.07, 0.35, M.wood, 0, 0.44); box(0.08, 0.42, 0.3, M.dark, -0.4, 0.21); box(0.08, 0.42, 0.3, M.dark, 0.4, 0.21); if (name.includes('tall')) box(0.95, 0.5, 0.06, M.wood, 0, 0.75, -0.15); block = 0.3; }
    else if (name.includes('bookshelf')) { box(0.95, 2.0, 0.38, M.dark, 0, 1.0, -0.3); for (const y of [0.3, 0.75, 1.2, 1.65]) for (let i = 0; i < 5; i++) box(0.12, 0.3, 0.26, [M.red, M.blue, M.green, M.gold][(i + Math.round(y * 10)) % 4], -0.32 + i * 0.16, y + 0.15, -0.24); }
    else if (name.includes('shelf') || name.includes('cabinet') || name.includes('dresser')) { box(0.95, name.includes('dresser') ? 0.9 : 1.7, 0.42, name.includes('red') ? M.red : M.dark, 0, name.includes('dresser') ? 0.45 : 0.85, -0.28); if (name.includes('dishes')) for (let i = 0; i < 4; i++) cyl(0.09, 0.09, 0.02, M.pewter, -0.3 + i * 0.2, 1.25, -0.12, 8).rotation.x = Math.PI / 2; }
    else if (name.includes('bed')) { const dbl = name.includes('double'); box(dbl ? 1.5 : 1.0, 0.45, 2.0, M.dark, 0, 0.22); box(dbl ? 1.4 : 0.92, 0.12, 1.5, name.includes('blue') ? M.blue : M.red, 0, 0.5, 0.2); box(dbl ? 1.4 : 0.92, 0.14, 0.4, M.linen, 0, 0.52, -0.75); box(dbl ? 1.5 : 1.0, 0.9, 0.08, M.dark, 0, 0.45, -1.0); block = 0.8; }
    else if (name.includes('barrel_cluster')) { for (const [x, z] of [[-0.3, 0], [0.3, 0], [0, 0.4]]) cyl(0.3, 0.3, 0.8, M.wood, x, 0.4, z); block = 0.7; }
    else if (name.includes('fire_barrel')) { cyl(0.3, 0.32, 0.8, M.iron, 0, 0.4); cyl(0, 0.24, 0.45, M.flame, 0, 1.0, 0, 6); light = { color: 0xff9a40, i: 8, y: 1.2 }; }
    else if (name.includes('barrel')) { cyl(0.32, 0.32, 0.85, M.wood, 0, 0.42); cyl(0.33, 0.33, 0.04, M.iron, 0, 0.2); cyl(0.33, 0.33, 0.04, M.iron, 0, 0.66); }
    else if (name.includes('crate')) { box(0.75, 0.55, 0.6, M.wood, 0, 0.28); const veg = name.includes('cabbage') ? 0x6aa84a : name.includes('potato') ? 0xb89a5a : name.includes('tomato') ? 0xc8402a : null; if (veg) for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), flat(veg)); s.position.set(-0.22 + (i % 3) * 0.22, 0.6, -0.12 + Math.floor(i / 3) * 0.24); g.add(s); } }
    else if (name.includes('sack')) { const s = cyl(0.25, 0.3, 0.6, M.burlap, 0, 0.3, 0, 7); s.scale.z = 0.8; block = 0.3; }
    else if (name.includes('rug')) { const r = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), name.includes('mint') ? flat(0x7ab89a) : name.includes('orange') ? flat(0xc8782a) : M.red); r.scale.set(1.6, 1, 1.1); r.position.y = 0.012; r.receiveShadow = true; g.add(r); block = 0; }
    else if (name.includes('lamp') || name.includes('candle')) { if (name.includes('stand')) cyl(0.04, 0.08, 1.4, M.iron, 0, 0.7); else { box(0.4, 0.7, 0.4, M.wood, 0, 0.35); } const top = name.includes('stand') ? 1.45 : 0.85; cyl(0, 0.05, 0.12, M.flame, 0, top, 0, 5); light = { color: 0xffc070, i: name.includes('bright') ? 7 : 4.5, y: top + 0.2 }; block = 0.2; }
    else if (name.includes('potted')) { cyl(0.18, 0.14, 0.3, M.clay, 0, 0.15); const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 0), flat(name.includes('flower') ? 0x5a8a3a : 0x3f6a2c)); b.position.y = 0.55; g.add(b); if (name.includes('flower')) for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), flat(0xe88ab0)); f.position.set(Math.cos(i * 1.6) * 0.2, 0.7, Math.sin(i * 1.6) * 0.2); g.add(f); } block = 0.25; }
    else if (name.includes('banner')) { box(0.7, 1.2, 0.03, M.red, 0, 1.6, -0.45); box(0.25, 0.25, 0.04, M.gold, 0, 1.7, -0.43); block = 0; }
    else if (name.includes('rail_post') || name.includes('two_tier')) { box(1.0, 0.08, 0.5, M.wood, 0, 1.0); box(1.0, 1.0, 0.08, M.dark, 0, 0.5, 0.2); }   // the inn's bar counter
    else { box(0.6, 0.6, 0.6, M.wood); }
    return { g, light, block };
}

export function createInterior({ id, def, exitTo, innerDoors = {} }) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0807);
    const tiles = def.tiles, H = tiles.length, W = tiles[0].length;
    const wx = x => x - W / 2 + 0.5, wz = y => y - H / 2 + 0.5;
    const names = def.sheetDecorations.flatMap(gp => gp.items.map(i => i.name));
    const floorColor = pickColor(names.filter(n => n.includes('floor')), FLOORS, 0x8a7a68);
    const wallColor = pickColor(names.filter(n => n.includes('wall')), WALLS, 0xb8a888);
    const M = {
        wood: flat(0x8a5e3a), dark: flat(0x4a301c), gold: flat(0xc9a44c, { metalness: 0.5, roughness: 0.4 }), iron: flat(0x3a3a3e, { metalness: 0.5 }),
        red: flat(0x8a2a2a), blue: flat(0x2a4a8a), green: flat(0x2a6a3a), linen: flat(0xe8e0d0), pewter: flat(0xb0b4b8, { metalness: 0.6 }),
        cloth: flat(0x8a3a3a), burlap: flat(0xb89a6a), clay: flat(0xa8603a), flame: new THREE.MeshBasicMaterial({ color: 0xffc04a, toneMapped: false }),
    };
    const colliders = [];
    const walk = (x, y) => y >= 0 && x >= 0 && y < H && x < W && tiles[y][x] !== 1;

    // Floor and walls (one instanced box per wall cell that touches the floor; the rest is dark).
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, H).rotateX(-Math.PI / 2), flat(floorColor));
    floor.receiveShadow = true;
    scene.add(floor);
    const wallCells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (tiles[y][x] !== 1) continue;
        if ([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => walk(x + dx, y + dy))) wallCells.push([x, y]);
    }
    const WALL_H = 2.8;
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), flat(wallColor), wallCells.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    wallCells.forEach(([x, y], i) => {
        walls.setMatrixAt(i, m4.compose(v.set(wx(x), 0, wz(y)), q, s.set(1, WALL_H, 1)));
        colliders.push({ x: wx(x), z: wz(y), r: 0.62, kind: 'wall', y0: -1, y1: 4 });
    });
    walls.castShadow = walls.receiveShadow = true;
    scene.add(walls);
    const trim = new THREE.InstancedMesh(new THREE.BoxGeometry(1.02, 0.25, 1.02), flat(0x3a2a1c), wallCells.length);
    wallCells.forEach(([x, y], i) => trim.setMatrixAt(i, m4.compose(v.set(wx(x), 0.12, wz(y)), q, s.set(1, 1, 1))));
    scene.add(trim);

    // Furniture.
    const lights = [];
    for (const gp of def.sheetDecorations) for (const it of gp.items) {
        if (it.name.includes('floor') || it.name.includes('wall')) continue;
        const { g, light, block } = piece(it.name, M);
        // Face away from the nearest wall.
        const face = !walk(it.x, it.y - 1) ? 0 : !walk(it.x, it.y + 1) ? Math.PI : !walk(it.x - 1, it.y) ? Math.PI / 2 : !walk(it.x + 1, it.y) ? -Math.PI / 2 : 0;
        g.position.set(wx(it.x), 0, wz(it.y));
        g.rotation.y = face;
        scene.add(g);
        if (block > 0 && it.blocking !== false) colliders.push({ x: wx(it.x), z: wz(it.y), r: block, kind: 'wall', y0: -1, y1: 2 });
        if (light) { const l = new THREE.PointLight(light.color, light.i, 7, 1.6); l.position.set(wx(it.x), light.y, wz(it.y)); scene.add(l); lights.push(l); }
    }
    scene.add(new THREE.HemisphereLight(0xffe8c8, 0x2a2018, 0.9));
    const fill = new THREE.PointLight(0xffd8a0, 10, Math.max(W, H) * 1.4, 1.2);
    fill.position.set(0, 2.6, 0);
    fill.castShadow = true;
    scene.add(fill);

    const map = {
        id, name: def.displayName ?? id, scene, colliders, terrain: false,
        camera: { maxDist: 11, pitch: 0.95, dist: 8.5 },
        groundAt: () => 0,
        passable: x => true,
        blockedAt(x, z, r, y = 0) { const c = colliderAt(colliders, x, z, r, y); if (c) return c.kind; return walk(Math.floor(x + W / 2), Math.floor(z + H / 2)) ? null : 'wall'; },
        stepBlocked: () => false,
        resolve: (pos, r) => pushOut(colliders, pos, r),
        projectileHit(p) { if (p.y < 0.03) return 'ground'; const c = colliderAt(colliders, p.x, p.z, 0.15, p.y); return c ? 'object' : null; },
        groundNormal: () => new THREE.Vector3(0, 1, 0),
        triggers: [], spawns: {}, stations: [], hittables: [], gatherSpots: [], gates: [],
    };

    // The way out (amo portal on the outer wall), and doors to further rooms (the inn's cellar).
    const exit = def.portals?.[0];
    if (exit) {
        const ex = wx(exit.x), ez = wz(exit.y) - 0.6;
        const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 2.2), new THREE.MeshBasicMaterial({ color: 0xffe8b0, transparent: true, opacity: 0.35 }));
        glow.position.set(wx(exit.x), 1.1, wz(exit.y) - 0.45);
        scene.add(glow);
        map.triggers.push({ x: ex, z: ez + 0.2, r: 0.7, label: exit.label ?? 'Leave', to: exitTo.map, spawn: exitTo.spawn });
        map.spawns.enter = { x: ex, z: ez - 1.4, facing: Math.PI };
        map.spawns.start = map.spawns.enter;
    }
    for (const d of def.spawns?.doors ?? []) {
        const target = innerDoors[d.interior];
        if (!target) continue;
        const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), M.dark);
        hatch.position.set(wx(d.x), 0.02, wz(d.y));
        scene.add(hatch);
        map.triggers.push({ x: wx(d.x), z: wz(d.y), r: 0.5, label: d.label, to: target, spawn: 'enter' });
        map.spawns[`door:${d.interior}`] = { x: wx(d.x), z: wz(d.y) - 1.2, facing: Math.PI };
    }
    // Chests (amo seeds their first contents) and signs.
    (def.spawns?.chests ?? []).forEach((c, i) => {
        buildChest(scene, wx(c.x), 0, wz(c.y), walk(c.x, c.y - 1) ? 0 : Math.PI);
        colliders.push({ x: wx(c.x), z: wz(c.y), r: 0.55, kind: 'wall', y0: -1, y1: 1 });
        map.stations.push({ mode: 'chest', key: `${id}_${i}`, title: 'Chest', seed: c.items ?? [], pos: new THREE.Vector3(wx(c.x), 0, wz(c.y) + (walk(c.x, c.y + 1) ? 0.9 : -0.9)) });
    });
    for (const sg of def.spawns?.signs ?? []) map.stations.push({ mode: 'sign', text: sg.text, pos: new THREE.Vector3(wx(sg.x), 0, wz(sg.y)) });

    // People who are in this room right now (amo's townsfolk with mapId === this interior).
    map.town = createTownsfolk({ scene, W, H, mapId: id, resolve: (pos, r) => pushOut(colliders, pos, r) });

    const hideTmp = new THREE.Vector3();
    map.update = (t, dt, ctx) => {
        for (const l of lights) l.intensity *= 1;   // (steady; flicker can come later)
        // Walls between the camera and the player sink to a stub so the room stays visible.
        const P = ctx.player.pos, C = ctx.camera.position;
        const cx = C.x - P.x, cz = C.z - P.z, cl = Math.hypot(cx, cz) || 1;
        wallCells.forEach(([x, y], i) => {
            const dx = wx(x) - P.x, dz = wz(y) - P.z;
            const front = (dx * cx + dz * cz) / cl > 0.6 && Math.abs(dx * cz - dz * cx) / cl < 4.5;
            walls.setMatrixAt(i, m4.compose(hideTmp.set(wx(x), 0, wz(y)), q, s.set(1, front ? 0.35 : WALL_H, 1)));
        });
        walls.instanceMatrix.needsUpdate = true;
        map.town.update(dt, ctx);
    };
    return map;
}
