// The Great Library inside the Citadel of Thaloria — Thaloria is "the scholarly kingdom of libraries and archives"
// (lore DB). A long nave of pale stone under a ribbed vault: walls of bookshelves two storeys high with a gallery
// and ladders, reading tables with candles, tall lit windows, a lectern under the rose window; at the far end the
// iron-bound door of the Forbidden Archive (lore DB: The Forbidden Archive, where Elara revealed Kael's lineage)
// — sealed for now. Tables to write up the codex. Built in code like Eldrin's Tower.
import * as THREE from 'three';
import { flat, colliderAt, pushOut } from '../engine/lib.js';

export function createCitadelLibrary() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14100c);
    scene.fog = new THREE.Fog(0x2a2018, 18, 60);
    const W = 16, L = 44, H = 14;   // the nave: x ±W/2, z from +L/2 (door) to -L/2 (the Archive)
    const colliders = [], lights = [];
    const m = c => flat(c);
    const box = (w, h, d, c, x, y, z, o = {}) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat ?? m(c)); b.position.set(x, y, z); b.castShadow = !o.noShadow; b.receiveShadow = true; scene.add(b); return b; };
    const solid = (x, z, r, h = 3) => colliders.push({ x, z, r, kind: 'wall', y0: -1, y1: h });
    const seg = (ax, az, bx, bz, r = 0.3, h = 4) => colliders.push({ ax, az, bx, bz, r, kind: 'wall', y0: -1, y1: h });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffd890, emissive: 0xffb860, emissiveIntensity: 1.1, flatShading: true });
    const light = (x, y, z, c = 0xffc070, i = 14, r = 14) => { const l = new THREE.PointLight(c, i, r, 1.6); l.position.set(x, y, z); scene.add(l); lights.push({ l, base: i, seed: x * 7 + z }); };

    // floor of chequered stone, walls, the vault
    for (let i = -W / 2; i < W / 2; i += 2) for (let k = -L / 2; k < L / 2; k += 2) box(2, 0.2, 2, ((i + k) / 2) % 2 ? 0xb8ae98 : 0x8a8270, i + 1, -0.1, k + 1, { noShadow: true });
    for (const sx of [-1, 1]) box(1, H, L, 0xc8b48a, sx * (W / 2 + 0.5), H / 2, 0, { noShadow: true });
    box(W + 2, H, 1, 0xc8b48a, 0, H / 2, -L / 2 - 0.5, { noShadow: true });
    box(W + 2, 1.2, 1, 0xc8b48a, 0, 0.6, L / 2 + 0.5, { noShadow: true });   // the entrance wall kept low, so the camera looks in
    for (let k = -L / 2 + 2; k < L / 2; k += 4) {   // ribbed vault: arches across the nave
        const rib = new THREE.Mesh(new THREE.TorusGeometry(W / 2, 0.3, 4, 16, Math.PI), m(0xa89670)); rib.position.set(0, H - 2, k); scene.add(rib);
    }
    // (no ceiling slab: the camera looks down through the vault's ribs)
    seg(-W / 2, -L / 2, -W / 2, L / 2); seg(W / 2, -L / 2, W / 2, L / 2); seg(-W / 2, -L / 2, W / 2, -L / 2); seg(-W / 2, L / 2, W / 2, L / 2);

    // walls of books, two storeys, with a gallery and ladders
    const spines = [0x7a2a1a, 0x2a4a6a, 0x3a5a2a, 0x6a4a1a, 0x5a2a4a, 0x8a6a3a, 0x2a2a3a];
    for (const sx of [-1, 1]) for (let k = -L / 2 + 3; k < L / 2 - 3; k += 3) for (const level of [0, 1]) {
        const y0 = level * 5.2, x = sx * (W / 2 - 0.4);
        box(0.6, 4.6, 2.8, 0x4a3220, x, y0 + 2.3, k);
        for (let r = 0; r < 4; r++) for (let b = 0; b < 7; b++) box(0.4, 0.8, 0.32, spines[(b + r + k) % spines.length], x + sx * -0.12, y0 + 0.65 + r * 1.05, k - 1.15 + b * 0.38, { noShadow: true });
    }
    for (const sx of [-1, 1]) {
        box(1.6, 0.25, L - 4, 0x5a3a22, sx * (W / 2 - 1.5), 5.1, 0);   // the gallery walk
        for (let k = -L / 2 + 3; k < L / 2 - 2; k += 2.5) box(0.08, 1, 0.08, 0x3a2414, sx * (W / 2 - 2.3), 5.7, k);   // its rail
        box(0.06, 0.06, L - 4, 0x3a2414, sx * (W / 2 - 2.3), 6.2, 0);
        for (const k of [-10, 6]) { const lad = box(0.7, 5.4, 0.1, 0x6a4a2a, sx * (W / 2 - 1.1), 2.7, k); lad.rotation.z = sx * 0.12; }
        // tall windows above the gallery
        for (let k = -L / 2 + 4; k < L / 2 - 2; k += 6) box(0.2, 4.2, 1.6, null, sx * (W / 2 - 0.05), 9.5, k, { mat: glowMat, noShadow: true });
    }
    // reading tables down the nave with candles
    for (let k = -14; k <= 14; k += 7) for (const sx of [-1, 1]) {
        const x = sx * 3;
        box(2.2, 0.12, 4, 0x6a4a2a, x, 0.82, k); for (const [dx, dz] of [[-1, -1.8], [1, -1.8], [-1, 1.8], [1, 1.8]]) box(0.12, 0.8, 0.12, 0x3a2414, x + dx, 0.4, k + dz);
        box(0.5, 0.06, 0.7, 0xe8dcc0, x - 0.3, 0.9, k - 0.5, { noShadow: true }); box(0.35, 0.18, 0.5, 0x7a2a1a, x + 0.4, 0.97, k + 0.6);   // an open book, a closed one
        box(0.08, 0.3, 0.08, 0xf4ecd8, x, 1.03, k + 1.2); box(0.1, 0.12, 0.1, null, x, 1.24, k + 1.2, { mat: glowMat, noShadow: true });
        solid(x, k, 1.4, 1.2);
        if (k % 14 === 0) light(x, 2.2, k + 1.2, 0xffb060, 6, 7);
    }
    // the lectern under the rose window, and the sealed Archive door
    box(0.8, 1.2, 0.6, 0x5a3a22, 0, 0.6, -L / 2 + 6); box(1.0, 0.1, 0.8, 0x6a4a2a, 0, 1.25, -L / 2 + 6);
    const rose = new THREE.Mesh(new THREE.CircleGeometry(2.6, 16), glowMat); rose.position.set(0, 10, -L / 2 + 0.02); scene.add(rose);
    box(4, 6, 0.6, 0x2a2018, 0, 3, -L / 2 + 0.3);
    for (const y of [1.2, 3, 4.8]) box(4.2, 0.18, 0.7, 0x3a3430, 0, y, -L / 2 + 0.35);   // iron bands
    box(0.5, 0.5, 0.2, 0x6a5a8a, 0, 2.6, -L / 2 + 0.7, { mat: new THREE.MeshStandardMaterial({ color: 0x6a5a8a, emissive: 0x4a3a8a, emissiveIntensity: 0.9, flatShading: true }) });   // a warding seal
    solid(0, -L / 2 + 6, 0.7, 1.5);
    // light: warm lamps down the nave, cool through the windows
    for (let k = -16; k <= 16; k += 8) light(0, 7, k, 0xffc078, 16, 16);
    scene.add(new THREE.HemisphereLight(0xfff0d8, 0x3a2a1a, 0.55));

    const inside = (x, z, r) => Math.abs(x) < W / 2 - 1.1 - r && Math.abs(z) < L / 2 - 0.6 - r;
    const map = {
        id: 'citadel_library', name: 'The Great Library', scene, colliders, terrain: false,
        camera: { maxDist: 10, pitch: 0.75, dist: 8 },
        groundAt: () => 0,
        passable: () => true,
        blockedAt(x, z, r, y = 0) { if (!inside(x, z, r)) return 'wall'; const c = colliderAt(colliders, x, z, r, y); return c ? c.kind : null; },
        stepBlocked: () => false,
        resolve(pos, r) { pushOut(colliders, pos, r); pos.x = Math.max(-W / 2 + 1.2 + r, Math.min(W / 2 - 1.2 - r, pos.x)); pos.z = Math.max(-L / 2 + 0.7 + r, Math.min(L / 2 - 0.7 - r, pos.z)); },
        projectileHit(p) { if (p.y < 0.03) return 'ground'; if (!inside(p.x, p.z, 0)) return 'wall'; const c = colliderAt(colliders, p.x, p.z, 0.15, p.y); return c ? 'object' : null; },
        groundNormal: () => new THREE.Vector3(0, 1, 0),
        triggers: [
            { x: 0, z: L / 2 - 1, r: 1.2, label: 'Out to the Citadel terrace', to: 'citadel_plateau', spawn: 'from_library' },
            { x: 0, z: -L / 2 + 1.6, r: 1.4, label: 'The Forbidden Archive', to: 'forbidden_archive', spawn: 'enter', requires: 'archive_unsealed', lockedLabel: 'The Forbidden Archive — sealed by order of the Keeper' },
        ],
        spawns: { enter: { x: 0, z: L / 2 - 3, facing: Math.PI }, start: { x: 0, z: L / 2 - 3, facing: Math.PI }, from_archive: { x: 0, z: -L / 2 + 4, facing: 0 } },
        hittables: [], gatherSpots: [], gates: [],
        stations: [
            { mode: 'desk', pos: new THREE.Vector3(-3, 0, 7) }, { mode: 'desk', pos: new THREE.Vector3(3, 0, -7) },
            { mode: 'sign', text: 'On the lectern, a register open to today: names of readers, the books they asked for, and in a careful hand at the bottom — "The Archive stays sealed by order of the Keeper. No exceptions. Not even for the old man from the tower."', pos: new THREE.Vector3(0, 0, -L / 2 + 7) },
        ],
        update(t) { for (const L0 of lights) L0.l.intensity = L0.base * (1 + Math.sin(t * 7 + L0.seed) * 0.04); },
    };
    return map;
}

// The Forbidden Archive — behind the sealed door at the end of the Great Library (lore DB: The Forbidden Archive,
// where Elara revealed Kael's lineage). A round vaulted room: iron shelves of chained books, a warding circle glowing
// in the floor, a lectern with a great book of bloodlines open on it. Sealed until the campaign opens it
// (flag archive_unsealed; God mode opens every way).
export function createForbiddenArchive() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0a10);
    scene.fog = new THREE.Fog(0x16121e, 10, 36);
    const R = 9, colliders = [], lights = [];
    const box = (w, h, d, c, x, y, z, ry = 0, o = {}) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), o.mat ?? flat(c)); b.position.set(x, y, z); b.rotation.y = ry; b.castShadow = !o.noShadow; b.receiveShadow = true; scene.add(b); return b; };
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 24).rotateX(-Math.PI / 2), flat(0x3a3440)); floor.receiveShadow = true; scene.add(floor);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.4, R + 0.4, 9, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x4a4250, side: THREE.BackSide, flatShading: true })); wall.position.y = 4.5; scene.add(wall);
    const ward = new THREE.MeshStandardMaterial({ color: 0x8a6aff, emissive: 0x6a4aff, emissiveIntensity: 1.4, flatShading: true });
    for (const [r, w] of [[3.2, 0.08], [2.4, 0.05]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, w, 3, 40), ward); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; scene.add(ring); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, g = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.12), ward); g.position.set(Math.cos(a) * 2.8, 0.03, Math.sin(a) * 2.8); g.rotation.y = -a; scene.add(g); }   // runes
    const spines = [0x4a1a1a, 0x1a2a4a, 0x2a3a1a, 0x3a2a1a, 0x2a1a3a];
    for (let i = 0; i < 12; i++) {   // iron shelves round the wall, books chained to them
        const a = i / 12 * Math.PI * 2; if (Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) > 0) continue;   // the door, to the east (+z after rotation below)
        const x = Math.sin(a) * (R - 0.6), z = Math.cos(a) * (R - 0.6);
        if (z > R - 2) continue;   // leave the doorway clear
        box(2.2, 4.8, 0.6, 0x2a2a30, x, 2.4, z, a);
        for (let r = 0; r < 4; r++) for (let b = 0; b < 5; b++) { const bx = -0.8 + b * 0.4; box(0.3, 0.8, 0.4, spines[(i + r + b) % 5], x + Math.cos(a) * bx - Math.sin(a) * 0.1, 0.7 + r * 1.1, z - Math.sin(a) * bx - Math.cos(a) * 0.1, a, { noShadow: true }); }
        box(2.2, 0.04, 0.04, 0x8a8a92, x - Math.sin(a) * 0.32, 2.0, z - Math.cos(a) * 0.32, a, { noShadow: true });   // the chain across
        colliders.push({ x, z, r: 1.1, kind: 'wall', y0: -1, y1: 5 });
    }
    // the lectern and the book of bloodlines, open
    box(0.7, 1.1, 0.5, 0x3a2418, 0, 0.55, -1.2); const book = box(1.0, 0.08, 0.7, 0xe8dcc0, 0, 1.18, -1.2); book.rotation.x = -0.25;
    colliders.push({ x: 0, z: -1.2, r: 0.6, kind: 'wall', y0: -1, y1: 1.4 });
    for (const [x, z] of [[-3.5, -3.5], [3.5, -3.5], [0, 4.5]]) { const l = new THREE.PointLight(0xb89aff, 14, 16, 1.4); l.position.set(x, 4, z); scene.add(l); lights.push(l); }
    const candle = new THREE.PointLight(0xffc070, 5, 6, 1.6); candle.position.set(0.5, 1.6, -1.2); scene.add(candle);
    scene.add(new THREE.HemisphereLight(0xe8e0ff, 0x2a2430, 0.9));
    const inside = (x, z, r) => Math.hypot(x, z) < R - 0.9 - r;
    return {
        id: 'forbidden_archive', name: 'The Forbidden Archive', scene, colliders, terrain: false,
        camera: { maxDist: 9, pitch: 0.8, dist: 7.5 },
        groundAt: () => 0, passable: () => true, stepBlocked: () => false,
        blockedAt(x, z, r, y = 0) { if (!inside(x, z, r)) return 'wall'; const c = colliderAt(colliders, x, z, r, y); return c ? c.kind : null; },
        resolve(pos, r) { pushOut(colliders, pos, r); const d = Math.hypot(pos.x, pos.z), m = R - 0.9 - r; if (d > m) { pos.x *= m / d; pos.z *= m / d; } },
        projectileHit(p) { if (p.y < 0.03) return 'ground'; if (!inside(p.x, p.z, 0)) return 'wall'; const c = colliderAt(colliders, p.x, p.z, 0.15, p.y); return c ? 'object' : null; },
        groundNormal: () => new THREE.Vector3(0, 1, 0),
        triggers: [{ x: 0, z: R - 1.4, r: 1.2, label: 'Back to the Great Library', to: 'citadel_library', spawn: 'from_archive' }],
        spawns: { enter: { x: 0, z: R - 3, facing: Math.PI }, start: { x: 0, z: R - 3, facing: Math.PI } },
        hittables: [], gatherSpots: [], gates: [],
        stations: [{ mode: 'sign', text: 'The great book lies open at a page of lineages, the ink gone brown with age: names joined by lines, generation after generation, and near the bottom a line that has been scratched out and written in again in a newer hand.', pos: new THREE.Vector3(0, 0, -0.2) }],
        update(t) { ward.emissiveIntensity = 1.2 + Math.sin(t * 1.5) * 0.3; lights.forEach((l, i) => { l.intensity = 14 + Math.sin(t * 2 + i) * 1.5; }); },
    };
}
