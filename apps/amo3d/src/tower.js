// Interior map: Eldrin's Tower — Crypt (y −5), Hall (y 0), Study (y +5),
// joined by two staircases. Floors above the player are cut away so the camera sees in;
// walls render back-faces only, so the near wall never blocks the view.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flat, mulberry32, faceShade, colliderAt, pushOut, shadows, Particles } from './lib.js';

const R = 8;          // inner radius
const STEP = 0.5;     // how high a foot can step up
const LEVELS = [
    { y: -5, name: 'The Crypt' },
    { y: 0, name: 'The Hall' },
    { y: 5, name: 'The Study' },
];
const HOLE_MAIN = { x0: -4.2, x1: 4.2, z0: -5.8, z1: -4.0 };   // stair well down to the crypt
const HOLE_UP = { x0: -4.2, x1: 4.2, z0: 4.0, z1: 5.8 };       // stair well up to the study
const FLOORS = [
    { y: -5, holes: [] },
    { y: 0, holes: [HOLE_MAIN] },
    { y: 5, holes: [HOLE_UP] },
];
// Linear ramps (drawn as steps): height goes from yA at x0 to yB at x1.
const RAMPS = [
    { x0: -4.2, x1: 4.2, z0: 4.1, z1: 5.7, yA: 0, yB: 5, base: 0 },     // hall → study
    { x0: -4.2, x1: 4.2, z0: -5.7, z1: -4.1, yA: -5, yB: 0, base: -5 }, // crypt → hall
];

const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const rampH = (r, x) => r.yA + ((x - r.x0) / (r.x1 - r.x0)) * (r.yB - r.yA);

// Every walkable surface under (x, z): { h, base }.
function surfacesAt(x, z) {
    const out = [];
    if (Math.hypot(x, z) < R) {
        for (const f of FLOORS) if (!f.holes.some(h => inRect(h, x, z))) out.push({ h: f.y, base: f.y - 0.3 });
    }
    for (const r of RAMPS) if (inRect(r, x, z)) out.push({ h: rampH(r, x), base: r.base });
    return out;
}

function colorGeo(geo, hex) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const c = new THREE.Color(hex);
    const arr = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) arr.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    return g;
}

export function createTower() {
    const scene = new THREE.Scene();
    const rng = mulberry32(4242);
    scene.background = new THREE.Color(0x0b0908);
    scene.fog = new THREE.Fog(0x0b0908, 22, 48);
    scene.add(new THREE.HemisphereLight(0xa89888, 0x2a2018, 0.85));

    const colliders = [];
    const lights = [];   // { light, level, base, flicker }
    const animated = [];
    const groups = LEVELS.map(() => { const g = new THREE.Group(); scene.add(g); return g; });
    const fx = new Particles(600);
    scene.add(fx.points);

    const addLight = (level, color, intensity, dist, x, y, z, flicker = 0) => {
        const l = new THREE.PointLight(color, intensity, dist, 1.4);
        l.position.set(x, y, z);
        scene.add(l);   // lights stay in the scene; hidden levels just go dark (no shader recompiles)
        lights.push({ light: l, level, base: intensity, flicker, seed: rng() * 100 });
        return l;
    };
    const box = (g, w, h, d, m, x, y, z, ry = 0) => {
        const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        o.position.set(x, y, z);
        o.rotation.y = ry;
        g.add(o);
        return o;
    };
    const cyl = (g, r0, r1, h, m, x, y, z, seg = 10) => {
        const o = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m);
        o.position.set(x, y, z);
        g.add(o);
        return o;
    };
    const solid = (level, c, h = 2) => colliders.push({ kind: 'wall', y0: LEVELS[level].y, y1: LEVELS[level].y + h, ...c });

    const M = {
        stone: flat(0xffffff, { vertexColors: true, side: THREE.BackSide }),
        trim: flat(0x5d574e),
        wood: flat(0x6e4a2c), darkWood: flat(0x4a301c), iron: flat(0x3c3c40, { metalness: 0.6, roughness: 0.5 }),
        gold: flat(0xc9a44c, { metalness: 0.6, roughness: 0.4 }),
        cloth: flat(0x6a1f2e), mortar: flat(0x2b2621), dark: flat(0x0d0a08),
        flame: new THREE.MeshBasicMaterial({ color: 0xffb347 }),
        tiles: flat(0xffffff, { vertexColors: true }),
    };

    // ---------- floors: mortar slab with stair-well holes, tiles on top ----------
    FLOORS.forEach((f, li) => {
        const shape = new THREE.Shape().absarc(0, 0, R + 0.3, 0, Math.PI * 2, false);
        for (const h of f.holes) {
            const p = new THREE.Path();
            p.moveTo(h.x0, -h.z0); p.lineTo(h.x1, -h.z0); p.lineTo(h.x1, -h.z1); p.lineTo(h.x0, -h.z1); p.closePath();
            shape.holes.push(p);
        }
        const slab = new THREE.Mesh(
            new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false, curveSegments: 48 }).rotateX(-Math.PI / 2),
            M.mortar,
        );
        slab.position.y = f.y - 0.32;
        groups[li].add(slab);

        const study = li === 2;
        const shades = li === 0 ? [0x4f4b44, 0x45423b, 0x55513f, 0x3f4a3a] : study ? [0x7a5232, 0x6d4729, 0x845a37, 0x664226] : [0x8a8274, 0x7c7569, 0x948b7b, 0x857d70];
        const tw = study ? 0.48 : 0.96, td = study ? 1.96 : 0.96;
        const pieces = [];
        for (let gx = -R; gx < R; gx += study ? 0.5 : 1) {
            const off = study ? ((Math.round(gx * 2) % 2) ? 1 : 0) : 0;
            for (let gz = -R - off; gz < R; gz += study ? 2 : 1) {
                const cx = gx + (study ? 0.25 : 0.5), cz = gz + (study ? 1 : 0.5);
                const corners = [[-tw / 2, -td / 2], [tw / 2, -td / 2], [tw / 2, td / 2], [-tw / 2, td / 2]];
                if (corners.some(([a, b]) => Math.hypot(cx + a, cz + b) > R - 0.05)) continue;
                if (f.holes.some(h => cx + tw / 2 > h.x0 && cx - tw / 2 < h.x1 && cz + td / 2 > h.z0 && cz - td / 2 < h.z1)) continue;
                const shade = new THREE.Color(shades[Math.floor(rng() * shades.length)]).multiplyScalar(0.9 + rng() * 0.2);
                pieces.push(colorGeo(new THREE.BoxGeometry(tw, 0.1, td).translate(cx, f.y - 0.05 + rng() * 0.012, cz), shade.getHex()));
            }
        }
        const tiles = new THREE.Mesh(mergeGeometries(pieces), M.tiles);
        tiles.receiveShadow = true;
        groups[li].add(tiles);

        // Walls: back faces only — the near side vanishes, the far side reads as the room.
        const wall = new THREE.Mesh(
            faceShade(new THREE.CylinderGeometry(R, R, 5, 40, 5, true), li === 0 ? [0x4d4943, 0x45413b, 0x534e46] : [0x8b8478, 0x7d776c, 0x948d80, 0x837c70], rng),
            M.stone,
        );
        wall.position.y = f.y + 2.5;
        groups[li].add(wall);
    });

    // ---------- staircases ----------
    RAMPS.forEach((r, i) => {
        const level = i === 0 ? 1 : 0;
        const n = 20, run = (r.x1 - r.x0) / n;
        const steps = [];
        for (let s = 0; s < n; s++) {
            const top = r.yA + ((s + 1) / n) * (r.yB - r.yA);
            const hgt = top - r.base;
            steps.push(colorGeo(new THREE.BoxGeometry(run + 0.01, hgt, r.z1 - r.z0).translate(r.x0 + run * (s + 0.5), r.base + hgt / 2, (r.z0 + r.z1) / 2), s % 2 ? 0x6b4a2c : 0x75512f));
        }
        const stair = new THREE.Mesh(mergeGeometries(steps), M.tiles);
        stair.castShadow = stair.receiveShadow = true;
        groups[level].add(stair);
    });

    // Railings round both stair wells (open on the stair's top end).
    for (const [hole, y, li] of [[HOLE_MAIN, 0, 1], [HOLE_UP, 5, 2]]) {
        const segs = [[hole.x0, hole.z0, hole.x1, hole.z0], [hole.x0, hole.z1, hole.x1, hole.z1], [hole.x0, hole.z0, hole.x0, hole.z1]];
        for (const [ax, az, bx, bz] of segs) {
            const len = Math.hypot(bx - ax, bz - az);
            const rail = box(groups[li], 0.1, 0.1, len, M.darkWood, (ax + bx) / 2, y + 1.0, (az + bz) / 2, Math.atan2(bx - ax, bz - az));
            rail.castShadow = true;
            for (let t = 0; t <= len + 0.01; t += len / Math.ceil(len / 0.9)) {
                const px = ax + ((bx - ax) * t) / len, pz = az + ((bz - az) * t) / len;
                box(groups[li], 0.08, 1.0, 0.08, M.darkWood, px, y + 0.5, pz).castShadow = true;
            }
            colliders.push({ ax, az, bx, bz, r: 0.08, kind: 'hop', y0: y, y1: y + 1.1 });
        }
    }

    // ================= THE HALL (y 0) =================
    const H = groups[1];
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 24).rotateX(-Math.PI / 2), M.cloth);
    rug.position.set(0.8, 0.012, 0.6);
    rug.receiveShadow = true;
    H.add(rug);
    const rugTrim = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.25, 24).rotateX(-Math.PI / 2), M.gold);
    rugTrim.position.set(0.8, 0.016, 0.6);
    H.add(rugTrim);
    // Long table with benches, plates and candles.
    box(H, 3.0, 0.12, 1.1, M.wood, 1.2, 0.82, 0.6);
    for (const [dx, dz] of [[-1.3, -0.4], [1.3, -0.4], [-1.3, 0.4], [1.3, 0.4]]) box(H, 0.12, 0.8, 0.12, M.darkWood, 1.2 + dx, 0.4, 0.6 + dz);
    for (const dz of [-0.95, 0.95]) {
        box(H, 2.8, 0.1, 0.4, M.wood, 1.2, 0.45, 0.6 + dz);
        for (const dx of [-1.2, 1.2]) box(H, 0.1, 0.42, 0.3, M.darkWood, 1.2 + dx, 0.22, 0.6 + dz);
    }
    for (let i = 0; i < 4; i++) cyl(H, 0.17, 0.15, 0.03, flat(0xcfc6b3), 0.2 + i * 0.7, 0.9, 0.6 + (i % 2 ? 0.3 : -0.3));
    cyl(H, 0.05, 0.07, 0.2, M.gold, 1.5, 0.98, 0.65);
    for (const dx of [-0.5, 0.5]) {
        cyl(H, 0.05, 0.05, 0.3, flat(0xeee5cf), 1.2 + dx, 1.03, 0.6);
        const f = cyl(H, 0.0, 0.035, 0.09, M.flame, 1.2 + dx, 1.23, 0.6, 5);
        animated.push(t => { f.scale.y = 1 + Math.sin(t * 13 + dx * 7) * 0.25; });
    }
    addLight(1, 0xffc27a, 6, 7, 1.2, 1.6, 0.6, 0.15);
    solid(1, { ax: 0.0, az: 0.6, bx: 2.4, bz: 0.6, r: 1.0 }, 1.0);

    // Fireplace on the east wall.
    const FP = { x: 7.0, z: 0 };
    box(H, 1.2, 2.6, 3.0, flat(0x6b655b), FP.x + 0.3, 1.3, FP.z).castShadow = true;
    box(H, 0.6, 1.3, 1.8, M.dark, FP.x - 0.05, 0.65, FP.z);
    box(H, 1.6, 0.25, 3.4, M.trim, FP.x + 0.1, 2.7, FP.z);
    box(H, 0.9, 0.12, 2.2, M.trim, FP.x - 0.3, 0.06, FP.z);
    for (const dz of [-0.35, 0, 0.35]) {
        const log = cyl(H, 0.09, 0.09, 1.0, flat(0x3b2616), FP.x - 0.15, 0.15, FP.z + dz * 0.6, 6);
        log.rotation.x = Math.PI / 2;
        log.rotation.z = dz;
    }
    const flames = [];
    for (let i = 0; i < 5; i++) {
        const f = cyl(H, 0, 0.16 - i * 0.015, 0.6, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff7a1a : 0xffc04a, transparent: true, opacity: 0.9 }), FP.x - 0.15, 0.45, FP.z - 0.4 + i * 0.2, 5);
        flames.push(f);
    }
    animated.push((t, dt) => {
        flames.forEach((f, i) => { f.scale.set(1, 0.7 + Math.abs(Math.sin(t * (7 + i) + i * 2)) * 0.8, 1); f.position.y = 0.35 + f.scale.y * 0.3; });
        if (groups[1].visible && rng() < dt * 30) {
            fx.emit({ x: FP.x - 0.15 + (rng() - 0.5) * 0.4, y: 0.6, z: FP.z + (rng() - 0.5) * 0.9, vx: -0.1 - rng() * 0.2, vy: 0.8 + rng() * 1.2, vz: (rng() - 0.5) * 0.3,
                life: 0.9 + rng() * 0.8, size: [0.07, 0.01], c0: [1, 0.7, 0.3, 1], c1: [1, 0.2, 0.05, 0] });
        }
    });
    addLight(1, 0xff8a3a, 30, 14, FP.x - 1.0, 1.0, FP.z, 0.35);
    solid(1, { x: FP.x + 0.2, z: FP.z, r: 1.5 }, 2.6);

    // Barrels and crates.
    for (const [x, z] of [[-5.6, -2.2], [-5.0, -3.1], [-6.0, -3.2]]) {
        cyl(H, 0.38, 0.38, 0.95, M.wood, x, 0.48, z, 10).castShadow = true;
        for (const y of [0.18, 0.78]) cyl(H, 0.4, 0.4, 0.05, M.iron, x, y, z, 10);
        solid(1, { x, z, r: 0.42 }, 1.0);
    }
    for (const [x, z, s, r] of [[5.2, 3.0, 0.8, 0.3], [5.9, 2.2, 0.6, 0.9], [5.4, 2.9, 0.55, 0.1]]) {
        const yy = x === 5.4 ? 1.07 : s / 2;
        box(H, s, s, s, M.wood, x, yy, z, r).castShadow = true;
        if (x !== 5.4) solid(1, { x, z, r: s * 0.7 }, 1.0);
    }
    // Weapon rack by the door.
    box(H, 0.1, 1.6, 0.1, M.darkWood, -6.6, 0.8, 2.0);
    box(H, 0.1, 1.6, 0.1, M.darkWood, -6.6, 0.8, 3.4);
    box(H, 0.08, 0.08, 1.5, M.darkWood, -6.6, 1.35, 2.7);
    for (let i = 0; i < 3; i++) {
        const sp = cyl(H, 0.025, 0.025, 2.0, M.darkWood, -6.5, 1.0, 2.2 + i * 0.5, 5);
        sp.rotation.x = 0.08;
        cyl(H, 0, 0.06, 0.25, M.iron, -6.5, 2.1, 2.28 + i * 0.5, 4);
    }
    solid(1, { ax: -6.6, az: 2.0, bx: -6.6, bz: 3.4, r: 0.25 }, 1.6);

    // Door (west wall) and its torches.
    const DOOR_A = Math.PI;
    box(H, 0.3, 2.9, 1.9, M.dark, -R + 0.05, 1.45, 0);
    box(H, 0.5, 0.35, 2.5, M.trim, -R + 0.1, 3.0, 0);
    for (const dz of [-1.1, 1.1]) box(H, 0.5, 3.0, 0.3, M.trim, -R + 0.1, 1.5, dz);
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.8), new THREE.MeshBasicMaterial({ color: 0xcfe0d8, transparent: true, opacity: 0.35 }));
    doorGlow.position.set(-R + 0.22, 1.45, 0);
    doorGlow.rotation.y = Math.PI / 2;
    H.add(doorGlow);
    for (const dz of [-1.6, 1.6]) {
        box(H, 0.25, 0.08, 0.08, M.iron, -R + 0.2, 2.2, dz);
        cyl(H, 0.05, 0.035, 0.45, M.darkWood, -R + 0.3, 2.35, dz, 5).rotation.z = -0.4;
        const f = cyl(H, 0, 0.08, 0.22, M.flame, -R + 0.38, 2.65, dz, 5);
        animated.push(t => { f.scale.y = 0.8 + Math.abs(Math.sin(t * 11 + dz)) * 0.6; });
    }
    addLight(1, 0xffa04a, 14, 10, -R + 1.2, 2.6, 0, 0.3);

    // ================= THE STUDY (y 5) =================
    const S = groups[2];
    const Y5 = 5;
    const bookColors = [0x7a2a2a, 0x2a4a7a, 0x2f6a3a, 0x6a5a2a, 0x4a2a6a, 0x8a6a3a, 0x2a2a2a, 0x9a3a2a];
    for (const a of [3.0, 3.55, 4.1, 4.65, 5.2, 5.75]) {
        const sx = Math.cos(a) * (R - 0.35), sz = Math.sin(a) * (R - 0.35);
        const parts = [colorGeo(new THREE.BoxGeometry(1.6, 2.4, 0.45).translate(0, 1.2, -0.05), 0x4a301c)];
        for (const sy of [0.08, 0.66, 1.24, 1.82]) {
            parts.push(colorGeo(new THREE.BoxGeometry(1.5, 0.05, 0.4).translate(0, sy, 0.03), 0x5a3a22));
            let bx = -0.7;
            while (bx < 0.68) {
                const w = 0.06 + rng() * 0.06, h = 0.3 + rng() * 0.18;
                if (rng() < 0.08) { bx += 0.1; continue; }
                parts.push(colorGeo(new THREE.BoxGeometry(w, h, 0.3).translate(bx + w / 2, sy + 0.025 + h / 2, 0.06), bookColors[Math.floor(rng() * bookColors.length)]));
                bx += w + 0.005;
            }
        }
        const shelf = new THREE.Mesh(mergeGeometries(parts), M.tiles);
        shelf.position.set(sx, Y5, sz);
        shelf.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
        shelf.castShadow = shelf.receiveShadow = true;
        S.add(shelf);
        solid(2, { x: sx, z: sz, r: 0.75 }, 2.4);
    }
    // Desk with an arcane orb.
    const DK = { x: -2.6, z: -1.2 };
    box(S, 1.8, 0.1, 0.9, M.wood, DK.x, Y5 + 0.8, DK.z);
    for (const [dx, dz] of [[-0.8, -0.38], [0.8, -0.38], [-0.8, 0.38], [0.8, 0.38]]) box(S, 0.09, 0.8, 0.09, M.darkWood, DK.x + dx, Y5 + 0.4, DK.z + dz);
    box(S, 0.5, 0.04, 0.35, flat(0xe8dcc0), DK.x + 0.3, Y5 + 0.87, DK.z + 0.1, 0.2);
    cyl(S, 0.12, 0.16, 0.08, M.gold, DK.x - 0.4, Y5 + 0.89, DK.z, 8);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 2), new THREE.MeshStandardMaterial({ color: 0xb59aff, emissive: 0x7a4dff, emissiveIntensity: 2.5, transparent: true, opacity: 0.9 }));
    S.add(orb);
    const orbLight = addLight(2, 0x9a7aff, 10, 9, DK.x - 0.4, Y5 + 1.5, DK.z, 0.1);
    animated.push(t => { orb.position.set(DK.x - 0.4, Y5 + 1.2 + Math.sin(t * 2) * 0.05, DK.z); orb.rotation.y = t; });
    box(S, 0.5, 0.06, 0.5, M.cloth, DK.x, Y5 + 0.45, DK.z + 0.9);   // stool
    cyl(S, 0.05, 0.05, 0.45, M.darkWood, DK.x, Y5 + 0.22, DK.z + 0.9, 6);
    solid(2, { ax: DK.x - 0.8, az: DK.z, bx: DK.x + 0.8, bz: DK.z, r: 0.5 }, 1.0);
    // Star map in the floor.
    const starMap = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.55, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x7ab8ff, transparent: true, opacity: 0.7 }));
    starMap.position.set(1.4, Y5 + 0.015, -0.6);
    S.add(starMap);
    const stars = [];
    for (let i = 0; i < 24; i++) {
        const a = rng() * 6.28, d = Math.sqrt(rng()) * 1.3;
        stars.push(new THREE.OctahedronGeometry(0.03 + rng() * 0.03).translate(1.4 + Math.cos(a) * d, Y5 + 0.03, -0.6 + Math.sin(a) * d));
    }
    S.add(new THREE.Mesh(mergeGeometries(stars), new THREE.MeshBasicMaterial({ color: 0xcfe6ff })));
    animated.push(t => { starMap.material.opacity = 0.5 + Math.sin(t * 1.5) * 0.2; });
    // Telescope at the east window.
    const TS = { x: 6.0, z: 1.2 };
    for (const a of [0, 2.1, 4.2]) {
        const leg = cyl(S, 0.025, 0.025, 1.3, M.darkWood, TS.x + Math.cos(a) * 0.25, Y5 + 0.6, TS.z + Math.sin(a) * 0.25, 5);
        leg.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    }
    const tube = cyl(S, 0.07, 0.11, 1.4, M.gold, TS.x + 0.2, Y5 + 1.45, TS.z, 10);
    tube.rotation.z = -1.0;
    solid(2, { x: TS.x, z: TS.z, r: 0.45 }, 1.6);
    // Windows with light shafts.
    const paneMat = new THREE.MeshBasicMaterial({ color: 0xdcecff });
    const shaftMat = new THREE.MeshBasicMaterial({ color: 0xbfd9ff, transparent: true, opacity: 0.09, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const a of [0.15, 5.6, 2.75]) {
        const wx = Math.cos(a) * (R - 0.02), wz = Math.sin(a) * (R - 0.02);
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.7), paneMat);
        pane.position.set(wx, Y5 + 2.6, wz);
        pane.rotation.y = Math.atan2(-Math.cos(a), -Math.sin(a));
        S.add(pane);
        box(S, 0.12, 0.12, 1.1, M.trim, wx * 0.99, Y5 + 3.5, wz * 0.99, Math.atan2(-Math.sin(a), Math.cos(a)));
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.9, 5, 4, 1, true), shaftMat);
        shaft.position.set(wx * 0.75, Y5 + 1.3, wz * 0.75);
        shaft.lookAt(wx, Y5 + 2.6, wz);
        shaft.rotateX(Math.PI / 2);
        S.add(shaft);
    }
    addLight(2, 0xcfe0ff, 12, 13, 5.5, Y5 + 3, 0.6, 0);

    // ================= THE CRYPT (y −5) =================
    const C = groups[0];
    const Y0 = -5;
    const pillarMat = flat(0x56524b);
    for (const a of [30, 90, 150, 210, 330].map(d => (d * Math.PI) / 180)) {
        const px = Math.cos(a) * 5, pz = Math.sin(a) * 5;
        cyl(C, 0.42, 0.5, 5, pillarMat, px, Y0 + 2.5, pz, 8).castShadow = true;
        box(C, 1.1, 0.3, 1.1, M.trim, px, Y0 + 0.15, pz);
        box(C, 1.1, 0.3, 1.1, M.trim, px, Y0 + 4.85, pz);
        solid(0, { x: px, z: pz, r: 0.55 }, 5);
    }
    // Chain hanging from a pillar.
    for (let i = 0; i < 9; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 4, 8), M.iron);
        link.position.set(Math.cos(Math.PI / 6) * 5 - 0.5, Y0 + 4.6 - i * 0.12, Math.sin(Math.PI / 6) * 5);
        link.rotation.y = i % 2 ? Math.PI / 2 : 0;
        C.add(link);
    }
    // Sarcophagus with a carved effigy.
    const SC = { x: 0, z: 0.8 };
    box(C, 1.3, 0.9, 2.5, flat(0x6a655c), SC.x, Y0 + 0.45, SC.z).castShadow = true;
    box(C, 1.45, 0.15, 2.65, M.trim, SC.x, Y0 + 0.97, SC.z);
    box(C, 0.5, 0.18, 1.5, flat(0x7a756b), SC.x, Y0 + 1.13, SC.z + 0.1);
    const effHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), flat(0x7a756b));
    effHead.position.set(SC.x, Y0 + 1.18, SC.z - 0.85);
    C.add(effHead);
    box(C, 0.12, 0.05, 0.6, M.iron, SC.x, Y0 + 1.25, SC.z + 0.1);   // sword on the effigy
    box(C, 0.3, 0.05, 0.06, M.iron, SC.x, Y0 + 1.26, SC.z - 0.15);
    solid(0, { ax: SC.x, az: SC.z - 1.0, bx: SC.x, bz: SC.z + 1.0, r: 0.8 }, 1.3);
    // Rune circle.
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xb06bff, transparent: true, opacity: 0.85 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.75, 48).rotateX(-Math.PI / 2), runeMat);
    ring.position.set(SC.x, Y0 + 0.015, SC.z);
    C.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.25, 48).rotateX(-Math.PI / 2), runeMat);
    ring2.position.copy(ring.position);
    C.add(ring2);
    const glyphs = [];
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const g = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3).rotateX(-Math.PI / 2), runeMat);
        g.position.set(SC.x + Math.cos(a) * 2.47, Y0 + 0.02, SC.z + Math.sin(a) * 2.47);
        g.rotation.y = -a;
        C.add(g);
        glyphs.push(g);
    }
    addLight(0, 0xa05aff, 22, 12, SC.x, Y0 + 1.6, SC.z, 0.12);
    animated.push((t, dt) => {
        runeMat.opacity = 0.6 + Math.sin(t * 2) * 0.25;
        ring2.rotation.y = t * 0.2;
        if (groups[0].visible && rng() < dt * 25) {
            const a = rng() * 6.28;
            fx.emit({ x: SC.x + Math.cos(a) * 2.5, y: Y0 + 0.1, z: SC.z + Math.sin(a) * 2.5, vx: 0, vy: 0.5 + rng() * 0.5, vz: 0,
                life: 2 + rng(), size: [0.08, 0.02], c0: [0.75, 0.45, 1, 0.9], c1: [0.4, 0.2, 1, 0] });
        }
    });
    // Bones and a skull, an old cask, a cold torch.
    for (let i = 0; i < 6; i++) {
        const b = cyl(C, 0.03, 0.03, 0.4, flat(0xd8d0bc), -3.5 + rng() * 0.8, Y0 + 0.04, 3.2 + rng() * 0.8, 5);
        b.rotation.set(Math.PI / 2, 0, rng() * 3);
    }
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), flat(0xe0d8c4));
    skull.position.set(-3.1, Y0 + 0.12, 3.6);
    C.add(skull);
    for (const [x, z] of [[5.6, 2.0], [6.2, 1.1]]) { cyl(C, 0.4, 0.4, 1.0, flat(0x4a3220), x, Y0 + 0.5, z).castShadow = true; solid(0, { x, z, r: 0.45 }, 1); }
    const coldFlame = new THREE.MeshBasicMaterial({ color: 0x7affd0 });
    const cf = cyl(C, 0, 0.09, 0.25, coldFlame, -R + 0.4, Y0 + 2.7, -2.0, 5);
    box(C, 0.25, 0.08, 0.08, M.iron, -R + 0.2, Y0 + 2.3, -2.0);
    animated.push(t => { cf.scale.y = 0.8 + Math.abs(Math.sin(t * 9)) * 0.5; });
    addLight(0, 0x5affc0, 9, 9, -R + 1.0, Y0 + 2.6, -2.0, 0.25);

    shadows(scene, true, true);
    for (const g of groups) g.traverse(o => { if (o.isMesh && o.material === M.stone) { o.castShadow = false; } });

    // Cutaway: anything hugging the wall on the camera's side hides, so the view into the room stays clear.
    const wallHug = [];
    for (const g of groups) g.traverse(o => {
        if (!o.isMesh || o.material === M.stone || o === g) return;
        const p = new THREE.Vector3();
        o.getWorldPosition(p);
        const r = Math.hypot(p.x, p.z);
        if (r > R - 1.7) wallHug.push({ o, nx: p.x / r, nz: p.z / r });
    });

    // ---------- map interface ----------
    const levelOf = y => (y > 4.5 ? 2 : y > -0.5 ? 1 : 0);
    const map = {
        name: "Eldrin's Tower", scene, colliders, terrain: false,
        camera: { maxDist: 12, pitch: 0.85, dist: 8.5 },
        levelName: y => LEVELS[levelOf(y)].name,
        groundAt(x, z, y) {
            let best = null;
            for (const s of surfacesAt(x, z)) if (s.h <= y + STEP && (best === null || s.h > best)) best = s.h;
            return best;
        },
        blockedAt(x, z, r, y) {
            if (Math.hypot(x, z) > R - r) return 'wall';
            const c = colliderAt(colliders, x, z, r, y);
            if (c) return c.kind;
            for (const s of surfacesAt(x, z)) if (s.h > y + STEP && s.base < y + 1.7) return 'wall';
            return null;
        },
        resolve(pos, r) {
            pushOut(colliders, pos, r);
            const d = Math.hypot(pos.x, pos.z), max = R - r - 0.05;
            if (d > max) { pos.x *= max / d; pos.z *= max / d; }
        },
        // Ramps and floors are solid from below too.
        stepBlocked(x, z, y) {
            for (const s of surfacesAt(x, z)) if (s.h > y + STEP && s.base < y + 1.7) return true;
            return false;
        },
        projectileHit(p) {
            if (Math.hypot(p.x, p.z) > R - 0.15) return 'wall';
            for (const s of surfacesAt(p.x, p.z)) if (p.y < s.h + 0.03 && p.y > s.base - 0.05) return 'ground';
            const c = colliderAt(colliders, p.x, p.z, 0.15, p.y);
            return c && p.y >= c.y0 + 0.1 ? 'object' : null;
        },
        groundNormal: () => new THREE.Vector3(0, 1, 0),
        triggers: [{ x: -R + 0.9, z: 0, r: 0.9, yMax: 1, yMin: -0.5, label: 'Leave the tower', to: 'outdoor', spawn: 'door' }],
        spawns: { door: { x: -R + 3.0, y: 0, z: 0, facing: Math.PI / 2 } },
        hittables: [],
        fx,
        update(t, dt, ctx) {
            const cur = levelOf(ctx.player.pos.y);
            groups.forEach((g, i) => { g.visible = i <= cur; });
            const cx = ctx.camera.position.x, cz = ctx.camera.position.z, cr = Math.hypot(cx, cz);
            for (const w of wallHug) w.o.visible = !(cr > R - 1.5 && (w.nx * cx + w.nz * cz) / cr > 0.5);
            for (const L of lights) {
                const on = L.level <= cur ? 1 : 0;
                L.light.intensity = on * L.base * (1 + (L.flicker ? (Math.sin(t * 9 + L.seed) * 0.5 + Math.sin(t * 23 + L.seed * 3) * 0.5) * L.flicker : 0));
            }
            for (const fn of animated) fn(t, dt);
            fx.update(dt);
        },
    };
    void DOOR_A; void orbLight;
    return map;
}
