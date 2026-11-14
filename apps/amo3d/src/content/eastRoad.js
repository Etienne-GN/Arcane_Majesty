// The East Road — amo's "Thalorian Wilds" (data/maps/regions/east_road.js), 1 tile = 1 m: its tile grid
// (forest / open ground / the road) and pieces (the stream, stumps, bushes, flowers, rocks, the ruined
// wall, gargoyles), and its spawns — the Old Waystone (the Trader's rumour), the Shepherd's Lean-to with
// Oren (Odyssey's Dawn), journal-page chests (the Innkeeper's saddlebags), campfires, gathering, the
// East Road Monolith, void-stalkers. West exit: Thaloria's East Gate; east exit: the climb to the Summit.
import * as THREE from 'three';
import { eastRoadMap, regionFormat } from '@rules';
import { flat, colliderAt, pushOut, fbm, mulberry32 } from '../engine/lib.js';
import { createOutdoorShell } from '../engine/outdoor.js';
import { createNav } from '../engine/nav.js';
import { bakeStatic } from '../engine/batch.js';
import { buildArch } from '../engine/region.js';
import { treeKinds } from './models/flora.js';
import { createBeasts } from './actors/beast.js';
import { buildMonolith } from '../game/travel.js';
import { buildCampfire } from '../game/campfire.js';
import { buildChest } from '../game/chest.js';
import { createCharacter } from './models/character.js';

const D = eastRoadMap.default;
const W = D.width, H = D.height;
import DOORS from '../../../amo/src/data/maps/interiors/doors.json';
const HOLLOW_DOORS = DOORS.east_road ?? [];
export const EAST_ROAD_GATES = (D.spawns.riftGates ?? []).map(g => ({ id: g.id, label: g.label, x: g.x - W / 2 + 0.5, z: g.y - H / 2 + 0.5 }));

export function createEastRoad({ quality }) {
    const scene = new THREE.Scene();
    const rng = mulberry32(77);
    const grid = regionFormat.decodeGrid(D.tiles, W, H);
    const wx = x => x - W / 2 + 0.5, wz = y => y - H / 2 + 0.5;
    const colliders = [];
    const add = (c, y1 = 4) => colliders.push({ y0: -3, y1, ...c });
    const pieces = [];
    for (const [, ni, x, y] of D.deco) pieces.push({ n: D.names[ni], x, y });
    const water = new Set(pieces.filter(p => p.n.startsWith('water1')).map(p => `${p.x},${p.y}`));

    // ---------- ground: a height per tile (water sunk, road flat), blended ----------
    const tileH = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const t = grid[y][x];
        tileH[y * W + x] = water.has(`${x},${y}`) ? -1.5 : t === 2 ? 0.25 : 0.4 + fbm(x * 0.05, y * 0.05, 3) * (t === 1 ? 3.2 : 1.6);
    }
    const tH = (x, y) => tileH[Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))];
    function heightAt(px, pz) {
        const fx = px + W / 2 - 0.5, fz = pz + H / 2 - 0.5, x0 = Math.floor(fx), z0 = Math.floor(fz), u = fx - x0, v = fz - z0;
        return (tH(x0, z0) * (1 - u) + tH(x0 + 1, z0) * u) * (1 - v) + (tH(x0, z0 + 1) * (1 - u) + tH(x0 + 1, z0 + 1) * u) * v;
    }
    const tileAt = (px, pz) => { const x = Math.floor(px + W / 2), y = Math.floor(pz + H / 2); return x >= 0 && y >= 0 && x < W && y < H ? grid[y][x] : 1; };
    const ground = new THREE.PlaneGeometry(W, H, W, H).rotateX(-Math.PI / 2).toNonIndexed();
    const gp = ground.attributes.position, gc = new Float32Array(gp.count * 3), col = new THREE.Color();
    const C = { frost: new THREE.Color(0x8a9a7a), frost2: new THREE.Color(0xa8b49a), road: new THREE.Color(0x8a7a62), forest: new THREE.Color(0x5a6a4a), bank: new THREE.Color(0x6a6250) };
    for (let i = 0; i < gp.count; i += 3) {
        const cx = (gp.getX(i) + gp.getX(i + 1) + gp.getX(i + 2)) / 3, cz = (gp.getZ(i) + gp.getZ(i + 1) + gp.getZ(i + 2)) / 3;
        const t = tileAt(cx, cz), h = heightAt(cx, cz);
        if (h < -0.4) col.copy(C.bank);
        else if (t === 2) col.copy(C.road).offsetHSL(0, 0, (fbm(cx * 0.5, cz * 0.5, 2) - 0.5) * 0.06);
        else if (t === 1) col.copy(C.forest).lerp(C.frost, fbm(cx * 0.1, cz * 0.1, 3) * 0.5);
        else col.copy(C.frost).lerp(C.frost2, fbm(cx * 0.08, cz * 0.08, 3));
        for (let k = 0; k < 3; k++) { gp.setY(i + k, heightAt(gp.getX(i + k), gp.getZ(i + k))); gc.set([col.r, col.g, col.b], (i + k) * 3); }
    }
    ground.setAttribute('color', new THREE.BufferAttribute(gc, 3));
    ground.computeVertexNormals();
    const gm = new THREE.Mesh(ground, flat(0xffffff, { vertexColors: true }));
    gm.receiveShadow = true;
    scene.add(gm);
    const waterPlane = new THREE.Mesh(new THREE.PlaneGeometry(W, H).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a6070, transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.2 }));
    waterPlane.position.y = -0.7;
    scene.add(waterPlane);

    // ---------- the forest: trees on forest tiles ----------
    const K = treeKinds();
    const trees = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (grid[y][x] !== 1 || rng() > 0.3) continue;
        const r = rng(), kind = r < 0.45 ? 'pine' : r < 0.7 ? 'dead' : r < 0.9 ? 'birch' : 'broad';
        trees.push({ x: wx(x) + (rng() - 0.5) * 0.8, z: wz(y) + (rng() - 0.5) * 0.8, kind, s: 0.75 + rng() * 0.6, rot: rng() * 6.28, tint: rng() });
    }
    // amo's own bare trees and dark bushy trees in the open.
    for (const p of pieces) if (p.n === 'tree_bare_branches' || p.n === 'tree_dead_bare_green') trees.push({ x: wx(p.x), z: wz(p.y), kind: 'dead', s: 0.7 + rng() * 0.4, rot: rng() * 6.28, tint: rng() });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    for (const kind of Object.keys(K)) {
        const list = trees.filter(t => t.kind === kind);
        if (!list.length) continue;
        const trunks = new THREE.InstancedMesh(K[kind].trunk, flat(kind === 'dead' ? 0x4a4440 : K[kind].trunkColor), list.length);
        const crowns = kind === 'dead' ? null : new THREE.InstancedMesh(K[kind].crown, flat(0xffffff), list.length);
        list.forEach((t, i) => {
            m4.compose(v.set(t.x, heightAt(t.x, t.z) - 0.1, t.z), q.setFromAxisAngle(Y, t.rot), s.setScalar(t.s));
            trunks.setMatrixAt(i, m4);
            if (crowns) { crowns.setMatrixAt(i, m4); crowns.setColorAt(i, kind === 'pine' ? col.setHSL(0.36, 0.25, 0.22 + t.tint * 0.06) : kind === 'birch' ? col.setHSL(0.14, 0.45, 0.5) : col.setHSL(0.22, 0.3, 0.3)); }
            add({ x: t.x, z: t.z, r: K[kind].r * t.s, kind: 'wall' }, 5);
        });
        for (const im of [trunks, crowns]) if (im) { im.castShadow = im.receiveShadow = true; scene.add(im); }
    }

    // ---------- small things: stumps, bushes, flowers, rocks, the ruined wall, gargoyles ----------
    const inst = (geo, color, list, place, collide = 0) => {
        if (!list.length) return null;
        const im = new THREE.InstancedMesh(geo, flat(0xffffff), list.length);
        list.forEach((p, i) => { place(p, i); im.setMatrixAt(i, m4); im.setColorAt(i, col.set(color).offsetHSL(0, 0, (rng() - 0.5) * 0.08)); if (collide) add({ x: wx(p.x), z: wz(p.y), r: collide, kind: 'hop' }, 0.6); });
        im.castShadow = true; im.receiveShadow = true; scene.add(im);
        return im;
    };
    const at = (p, yOff = 0, scale = 1, rot = rng() * 6) => m4.compose(v.set(wx(p.x), heightAt(wx(p.x), wz(p.y)) + yOff, wz(p.y)), q.setFromAxisAngle(Y, rot), s.setScalar(scale));
    inst(new THREE.CylinderGeometry(0.25, 0.32, 0.4, 7).translate(0, 0.2, 0), 0x5a4030, pieces.filter(p => p.n === 'stump_small'), p => at(p, 0, 0.8 + rng() * 0.4), 0.3);
    inst(new THREE.IcosahedronGeometry(0.42, 1).translate(0, 0.32, 0), 0x4a6a3a, pieces.filter(p => p.n.startsWith('bush')), p => at(p, 0, 0.6 + rng() * 0.4));
    inst(new THREE.OctahedronGeometry(0.08, 0).translate(0, 0.2, 0), 0xf2f0e6, pieces.filter(p => p.n.startsWith('flower')), p => at(p, 0, 1));
    inst(new THREE.DodecahedronGeometry(0.3, 0), 0x9a8a72, pieces.filter(p => p.n.startsWith('rock') || p.n.startsWith('rocks')), p => at(p, 0.1, p.n.includes('medium') ? 1.6 : 0.6 + rng() * 0.4));
    inst(new THREE.BoxGeometry(1, 2.6, 1).translate(0, 1.1, 0), 0x7e7a72, pieces.filter(p => p.n === 'wall_stone_circular_gray'), p => at(p, 0, 1, 0), 0.6);
    for (const g of pieces.filter(p => p.n.startsWith('gargoyle'))) {
        const st = new THREE.Group();
        const box = (w, h, d, y) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(0x7a7a7e)); o.position.y = y; o.castShadow = true; st.add(o); };
        box(0.9, 0.7, 0.9, 0.35); box(0.6, 0.8, 0.5, 1.1); box(0.45, 0.4, 0.45, 1.7);
        for (const sg of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 3), flat(0x6a6a6e)); w.position.set(sg * 0.45, 1.4, -0.1); w.rotation.z = -sg * 1.1; st.add(w); }
        st.position.set(wx(g.x), heightAt(wx(g.x), wz(g.y)), wz(g.y));
        scene.add(st);
        add({ x: wx(g.x), z: wz(g.y), r: 0.55, kind: 'wall' }, 2);
    }

    const map = {
        id: 'east_road', name: D.displayName ?? 'The East Road', scene, heightAt, terrain: true, colliders,
        camera: { maxDist: 22, pitch: 0.4, dist: 8.5 },
        groundAt: (x, z) => heightAt(x, z),
        wading: (x, z) => heightAt(x, z) < -0.75,
        blockedAt(x, z, r, y = heightAt(x, z)) { const c = colliderAt(colliders, x, z, r, y); if (c) return c.kind; return heightAt(x, z) < -1.2 || Math.abs(x) > W / 2 - 1 || Math.abs(z) > H / 2 - 1 ? 'wall' : null; },
        resolve: (pos, r) => pushOut(colliders, pos, r),
        passable: (x, z) => heightAt(x, z) >= -1.2 && Math.abs(x) <= W / 2 - 1 && Math.abs(z) <= H / 2 - 1,
        projectileHit(p) { if (p.y < heightAt(p.x, p.z) + 0.05) return 'ground'; const c = colliderAt(colliders, p.x, p.z, 0.15, p.y); return c && p.y >= c.y0 + 0.5 ? 'object' : null; },
        groundNormal(x, z) { const e = 0.3; return new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize(); },
        triggers: [], spawns: {}, stations: [], hittables: [], gatherSpots: [], gates: [],
        weatherDef: { id: 'east_road', biome: 'temperate' },
    };

    // ---------- the way in and out ----------
    const veils = [];
    for (const pt of D.portals ?? []) {
        const x = wx(Math.min(W - 2, Math.max(1, pt.x))), z = wz(pt.y);
        const west = pt.targetMap === 'thaloria';
        veils.push(buildArch(scene, x, heightAt(x, z), z, west ? Math.PI / 2 : -Math.PI / 2));
        map.triggers.push({ x, z, r: 1.3, label: pt.label, to: pt.targetMap, spawn: west ? 'from_east_road' : 'from_east_road' });
        map.spawns[west ? 'from_thaloria' : 'from_summit'] = { x: x + (west ? 3.5 : -3.5), z, facing: west ? Math.PI / 2 : -Math.PI / 2 };
    }
    map.spawns.start = map.spawns.from_thaloria;

    // ---------- places: waystone and lean-to (signs), chests, campfires, gathering, the monolith ----------
    for (const sg of D.spawns.signs ?? []) {
        const x = wx(sg.x), z = wz(sg.y), y = heightAt(x, z);
        const stone = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.35), flat(0x8a867e)); stone.position.set(x, y + 0.8, z); stone.castShadow = true; scene.add(stone);
        add({ x, z, r: 0.5, kind: 'wall' }, 1.8);
        map.stations.push({ mode: 'sign', id: sg.id, text: sg.text, pos: new THREE.Vector3(x, y, z + 0.9) });
    }
    (D.spawns.chests ?? []).forEach((c, i) => {
        const x = wx(c.x), z = wz(c.y), y = heightAt(x, z);
        buildChest(scene, x, y, z, 0);
        add({ x, z, r: 0.55, kind: 'wall' }, 1);
        map.stations.push({ mode: 'chest', key: `east_road_${i}`, title: 'A dropped satchel', seed: c.items ?? [], pos: new THREE.Vector3(x, y, z + 0.9) });
    });
    const fires = (D.spawns.campfires ?? []).map(c => {
        const x = wx(c.x), z = wz(c.y);
        const f = buildCampfire(scene, { x, z }, heightAt(x, z));
        map.stations.push({ mode: 'campfire', pos: f.pos });
        add({ x, z, r: 0.6, kind: 'hop' }, 0.6);
        return f;
    });
    for (const n of D.spawns.gatheringNodes ?? []) map.gatherSpots.push({ type: n.type, x: wx(n.x), z: wz(n.y), ...(n.yields ? { yields: n.yields } : {}) });
    map.gates = EAST_ROAD_GATES.map(g => ({ ...g }));
    const monoliths = map.gates.map(g => {
        add({ x: g.x, z: g.z, r: 0.55, kind: 'wall' }, 3.2);
        map.stations.push({ mode: 'gate', key: g.id, pos: new THREE.Vector3(g.x, heightAt(g.x, g.z), g.z) });
        map.spawns[`gate:${g.id}`] = { x: g.x + 1.7, z: g.z, facing: Math.PI / 2 };
        return { g, m: buildMonolith(scene, g, heightAt(g.x, g.z)) };
    });

    // ---------- the Hollow: a cave mouth in a rock outcrop (amo doors.json → east_road_cave) ----------
    for (const d of HOLLOW_DOORS) {
        const x = wx(d.x), z = wz(d.y), y = heightAt(x, z);
        // Face the open side (the walkable neighbour).
        const open = [[0, 1, 0], [0, -1, Math.PI], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]].find(([dx, dy]) => grid[d.y + dy]?.[d.x + dx] !== 1) ?? [0, 1, 0];
        const face = open[2], fx = Math.sin(face), fz = Math.cos(face);
        const rock = flat(0x6a6660), dark = new THREE.MeshBasicMaterial({ color: 0x050506 });
        for (let k = 0; k < 9; k++) {
            const a = face + Math.PI + (k / 8 - 0.5) * 2.6, r = 1.6 + (k % 3) * 0.5;
            const b = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + (k % 4) * 0.35, 0), rock);
            b.position.set(x + Math.sin(a) * r - fx * 0.6, y + 0.6 + (k % 2) * 0.9, z + Math.cos(a) * r - fz * 0.6);
            b.rotation.set(k, k * 2, k * 0.5); b.castShadow = b.receiveShadow = true; scene.add(b);
            add({ x: b.position.x, z: b.position.z, r: 1.0, kind: 'wall' }, 3);
        }
        const top = new THREE.Mesh(new THREE.DodecahedronGeometry(1.9, 0), rock); top.position.set(x - fx * 0.9, y + 2.6, z - fz * 0.9); top.castShadow = true; scene.add(top);
        const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.0, 10), dark); mouth.scale.set(1, 1.3, 1); mouth.position.set(x + fx * 0.15, y + 1.1, z + fz * 0.15); mouth.rotation.y = face; scene.add(mouth);
        map.triggers.push({ x: x + fx * 0.6, z: z + fz * 0.6, r: 1.0, label: d.label, to: d.interior, spawn: 'enter' });
        map.spawns[`door:${d.interior}`] = { x: x + fx * 2.4, z: z + fz * 2.4, facing: face };
    }

    // ---------- void-stalkers ----------
    // ---------- creatures: amo's whole East Road roster — void-stalkers, root-wraiths, blight-ents, the sentinel ----------
    map.batch = bakeStatic(scene);
    for (const type of [...new Set((D.spawns.enemies ?? []).map(e => e.type))]) {
        const posts = D.spawns.enemies.filter(e => e.type === type).map(e => ({ x: wx(e.x), z: wz(e.y) }));
        map.hittables.push(...createBeasts({ scene, map, rng: Math.random, type, posts, rareFrom: D }));   // elites rolled fresh each time, as in amo
    }

    // ---------- Oren, the chronicler, at the shepherd's lean-to ----------
    map.people = [];
    for (const n of D.spawns.npcs ?? []) {
        const look = { skin: '#d8b090', eyes: '#6a5a3a', hair: { style: 'short', color: '#7a6a5a' }, facialHair: { style: 'beard', color: '#8a7a6a' },
            outfit: { style: 'longcoat', coat: '#6a5a3a', collar: '#3a2a1a', trim: '#a88a5a', vest: '#4a3a2a', shirt: '#d8d0c0', pants: '#3a3430', leather: '#5a3a22', leatherDark: '#3a2618' }, cape: true };
        const c = createCharacter(look);
        c.setWeapons({ type: 'staff', accent: 0x8a6a3a }, null);
        const x = wx(n.x), z = wz(n.y);
        c.root.position.set(x, heightAt(x, z), z);
        c.root.rotation.y = Math.PI / 2;
        scene.add(c.root);
        add({ x, z, r: 0.4, kind: 'wall' }, 2);
        map.people.push({ model: c, pos: c.root.position, height: 2.2, shown: true, activity: 'work', r: { id: n.id, role: 'merchant', npc: { id: n.id, name: n.name, dialogue: n.dialogue, afterDialogue: n.afterDialogue } } });
    }
    // A tiny "town" so talking finds Oren like any townsperson.
    map.town = {
        people: map.people,
        update: dt => { for (const p of map.people) p.model.update(dt, { speed: 0, sprinting: false, hopK: null }); },
        setVisible: () => {},
        nearestPerson(pos, within = 2.4) { let best = null, bd = within; for (const p of map.people) { const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z); if (d < bd) { bd = d; best = p; } } return best; },
    };

    map.nav = createNav({ colliders, passable: map.passable, half: Math.max(W, H) / 2 + 4 });
    map.mapInfo = {
        half: Math.max(W, H) / 2 + 4, water: -0.75, ground: [138, 154, 122], trees: trees.filter((_, i) => i % 2 === 0).map(t => [t.x, t.z, t.kind === 'pine' ? 1 : 0]),
        landmarks: (D.spawns.landmarks ?? []).map(l => ({ name: l.name, x: wx(l.x), z: wz(l.y), icon: l.id.includes('monolith') ? 'stones' : l.id.includes('lean') ? 'fire' : 'stones' })),
    };
    const shell = createOutdoorShell(scene, { quality, mood: { fog: '#b8c4c8', fogNear: 40, fogFar: 180, fogMix: 0.4, light: 0.95, nightFloor: 0.42 } });
    map.update = (t, dt, ctx) => {
        shell.update(dt, ctx);
        for (const f of fires) f.update(t);
        for (const { g, m } of monoliths) m.update(t, (ctx.attunedGates ?? []).includes(g.id));
        for (const vl of veils) vl.material.opacity = 0.14 + Math.sin(t * 2) * 0.06;
        for (const h of map.hittables) h.update(dt, ctx);
        map.town.update(dt, ctx);
    };
    return map;
}
