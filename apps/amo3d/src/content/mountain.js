// The Summit of Despair — the mountain itself. A steep peak with one narrow ledge path spiralling twice
// around it: a rock wall on one side, a sheer drop on the other. Unlike other outdoor maps the ground
// is not snapped to: step off the ledge and you fall (the player's fall damage applies). On the way:
// gusts that push you toward the edge (with a warning), an ice passage cut through the rock, a rope
// bridge over a chasm, Gloom-Beaks and Frost-Shades on the ledges, cairns that hold your place if you
// fall, and the summit plateau (Malphas waits here in amo — not in 3D yet).
import * as THREE from 'three';
import { flat, colliderAt, pushOut, fbm, mulberry32, smoothstep } from '../engine/lib.js';
import { createOutdoorShell } from '../engine/outdoor.js';
import { buildArch } from '../engine/region.js';
import { createBeasts } from './actors/beast.js';

const R = 70, TOP = 100, HALF = 95, CELL = 0.5, STEP = 0.5;
const cone = r => (r >= R ? 0 : TOP * Math.pow(1 - r / R, 1.05));
const SHELF = 1.7;   // half-width of the ledge
const TUNNEL = [0.44, 0.52], GAP = [0.69, 0.725], CAIRNS = [0.02, 0.3, 0.56, 0.8], PLATEAU_R = 11;

// The path: a straight ramp from the foot, then two turns around the peak, rising with the slope.
function pathPoints() {
    const pts = [];
    const r0 = 64, r1 = 14, turns = 2;
    const startA = 0;   // the climb starts on the south face (+z)
    for (let i = 0; i <= 900; i++) {
        const t = i / 900, r = r0 + (r1 - r0) * t, a = startA + t * turns * Math.PI * 2;
        pts.push({ t, x: Math.sin(a) * r, z: Math.cos(a) * r, h: cone(r) - 1.4, a, r });
    }
    // the last stretch rises onto the plateau
    const end = pts[pts.length - 1];
    for (let i = 1; i <= 20; i++) { const k = i / 20, r = end.r - (end.r - PLATEAU_R + 1) * k; pts.push({ t: 1, x: Math.sin(end.a) * r, z: Math.cos(end.a) * r, h: end.h + (cone(PLATEAU_R) - 3 - end.h) * k, a: end.a, r }); }
    // the ramp from the snowfield to the first ledge
    const first = pts[0], ramp = [];
    for (let i = 0; i < 24; i++) { const k = i / 24, z = 84 - (84 - first.z) * k; ramp.push({ t: -1 + k, x: 0, z, h: first.h * k * k, a: 0, r: z }); }
    return [...ramp, ...pts];
}

export function createMountain({ quality }) {
    const scene = new THREE.Scene();
    const rng = mulberry32(911);
    const P = pathPoints();
    const plateauH = cone(PLATEAU_R) - 3;

    // Spatial index of the path for nearest-point queries.
    const B = 4, buckets = new Map(), key = (x, z) => `${Math.floor(x / B)},${Math.floor(z / B)}`;
    P.forEach((p, i) => { const k = key(p.x, p.z); (buckets.get(k) ?? buckets.set(k, []).get(k)).push(i); });
    function nearest(x, z, within = 9) {
        let best = null, bd = within;
        const cx = Math.floor(x / B), cz = Math.floor(z / B), n = Math.ceil(within / B);
        for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) for (const i of buckets.get(`${cx + dx},${cz + dz}`) ?? []) {
            const p = P[i], d = Math.hypot(p.x - x, p.z - z);
            if (d < bd) { bd = d; best = p; }
        }
        return best ? { p: best, d: bd } : null;
    }

    // ---------- the height field (computed once, sampled bilinearly) ----------
    const N = Math.round((HALF * 2) / CELL) + 1;
    const field = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = i * CELL - HALF, z = j * CELL - HALF, r = Math.hypot(x, z);
        let h = cone(r) + (r < R ? fbm(x * 0.09, z * 0.09, 3) * 4 * smoothstep(PLATEAU_R + 2, PLATEAU_R + 8, r) : 0);
        h += smoothstep(80, 94, Math.max(Math.abs(x), Math.abs(z))) * 30 * (0.5 + fbm(x * 0.04, z * 0.04));   // a ring of far hills
        if (r < PLATEAU_R) h = plateauH + fbm(x * 0.3, z * 0.3, 2) * 0.3;
        const n = nearest(x, z);
        if (n) {
            const { p, d } = n;
            const inGap = p.t >= GAP[0] && p.t <= GAP[1], inTunnel = p.t >= TUNNEL[0] && p.t <= TUNNEL[1];
            if (inGap && d < 6) h = Math.min(h, p.h - 26);                                   // the chasm
            else if (d < SHELF) h = p.h;                                                   // the ledge
            else if (d < SHELF + 0.6 && h < p.h) h = p.h - (d - SHELF) * 12;               // its crumbling lip
            if (inTunnel && d >= SHELF && d < SHELF + 3 && r > p.r) h = Math.max(h, p.h + 5);   // the passage's outer wall
        }
        field[j * N + i] = h;
    }
    const at = (i, j) => field[Math.max(0, Math.min(N - 1, j)) * N + Math.max(0, Math.min(N - 1, i))];
    function heightAt(x, z) {
        const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
        return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
    }

    // ---------- terrain mesh: snow where it is flat, rock where it is steep ----------
    const SEG = 190;
    const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, SEG, SEG).rotateX(-Math.PI / 2);
    const gp = geo.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setY(i, heightAt(gp.getX(i), gp.getZ(i)));
    const tg = geo.toNonIndexed();
    tg.computeVertexNormals();
    const tp = tg.attributes.position, tn = tg.attributes.normal, colors = new Float32Array(tp.count * 3), col = new THREE.Color();
    const SNOW = new THREE.Color(0xeef2f6), ROCK = new THREE.Color(0x5e6068), TRAIL = new THREE.Color(0xb8c2cc);
    for (let i = 0; i < tp.count; i += 3) {
        const ny = (tn.getY(i) + tn.getY(i + 1) + tn.getY(i + 2)) / 3;
        const cx = (tp.getX(i) + tp.getX(i + 1) + tp.getX(i + 2)) / 3, cz = (tp.getZ(i) + tp.getZ(i + 1) + tp.getZ(i + 2)) / 3;
        const n = nearest(cx, cz, SHELF + 0.4);
        if (n && Math.abs(heightAt(cx, cz) - n.p.h) < 0.4) col.copy(TRAIL);
        else col.copy(ROCK).lerp(SNOW, smoothstep(0.55, 0.85, ny)).offsetHSL(0, 0, (fbm(cx * 0.2, cz * 0.2, 2) - 0.5) * 0.06);
        for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (i + k) * 3);
    }
    tg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const terrain = new THREE.Mesh(tg, flat(0xffffff, { vertexColors: true }));
    terrain.receiveShadow = true; terrain.castShadow = true;
    scene.add(terrain);

    const colliders = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
    // Stakes along the edge of the ledge (every few metres, outward side).
    const stakes = P.filter((p, i) => i % 9 === 0 && p.t > 0 && p.t < 1 && !(p.t >= GAP[0] - 0.01 && p.t <= GAP[1] + 0.01) && !(p.t >= TUNNEL[0] && p.t <= TUNNEL[1]));
    const stakeMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 5).translate(0, 0.5, 0), flat(0x5a3a22), stakes.length);
    stakes.forEach((p, i) => { const ox = Math.sin(p.a) * (SHELF - 0.2), oz = Math.cos(p.a) * (SHELF - 0.2); stakeMesh.setMatrixAt(i, m4.compose(v.set(p.x + ox, p.h, p.z + oz), q, s.set(1, 1, 1))); });
    stakeMesh.castShadow = true;
    scene.add(stakeMesh);

    // The ice passage: arches of blue ice over the ledge.
    const ice = new THREE.MeshStandardMaterial({ color: 0xbfe4ff, emissive: 0x3a7aa8, emissiveIntensity: 0.25, transparent: true, opacity: 0.6, roughness: 0.15, flatShading: true });
    for (const p of P.filter((p, i) => i % 4 === 0 && p.t >= TUNNEL[0] && p.t <= TUNNEL[1])) {
        const arch = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.45, 4, 9, Math.PI), ice);
        arch.position.set(p.x, p.h, p.z);
        arch.rotation.y = p.a;
        scene.add(arch);
        for (let k = 0; k < 2; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.7 + rng() * 0.6, 5), ice); c.position.set(p.x + (rng() - 0.5) * 2, p.h + 2.1, p.z + (rng() - 0.5) * 2); c.rotation.x = Math.PI; scene.add(c); }
    }

    // The rope bridge over the chasm (a walkable deck).
    const gapPts = P.filter(p => p.t >= GAP[0] - 0.004 && p.t <= GAP[1] + 0.004);
    const deckAt = (x, z) => {
        const n = nearest(x, z, 1.0);
        if (!n || n.p.t < GAP[0] - 0.004 || n.p.t > GAP[1] + 0.004) return null;
        const a = gapPts[0], b = gapPts[gapPts.length - 1], k = (n.p.t - a.t) / (b.t - a.t);
        return a.h + (b.h - a.h) * k - Math.sin(k * Math.PI) * 0.6;   // it sags in the middle
    };
    const plank = flat(0x7a5634), rope = new THREE.LineBasicMaterial({ color: 0x8a7050 });
    const ropePts = [[], []];
    gapPts.forEach((p, i) => {
        if (i % 2 === 0) {
            const y = deckAt(p.x, p.z) ?? p.h;
            const pl = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.35), plank);
            pl.position.set(p.x, y - 0.04, p.z); pl.rotation.y = p.a + Math.PI / 2;   // across the walking direction
            pl.castShadow = true; scene.add(pl);
        }
        const y = (deckAt(p.x, p.z) ?? p.h) + 1.0;
        for (const sd of [-1, 1]) ropePts[sd < 0 ? 0 : 1].push(new THREE.Vector3(p.x + Math.sin(p.a) * 0.95 * sd, y, p.z + Math.cos(p.a) * 0.95 * sd));
    });
    for (const pts of ropePts) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), rope));

    // ---------- the map interface (ground is NOT snapped to: you can fall) ----------
    const groundAt = (x, z, y) => {
        const g = heightAt(x, z), d = deckAt(x, z);
        if (d !== null && d <= y + STEP && d > g) return d;
        return g;
    };
    // Slope: 0 on the ledge, the plateau and the bridge; elsewhere the face's steepness and the way down.
    const flatHere = (x, z) => Math.hypot(x, z) < PLATEAU_R || (nearest(x, z, SHELF)?.d ?? 99) < SHELF - 0.05 || deckAt(x, z) !== null;
    function slopeAt(x, z) {
        if (flatHere(x, z)) return { k: 0, dx: 0, dz: 0 };
        const e = 0.35, gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
        const k = Math.hypot(gx, gz) || 1e-6;
        return { k, dx: -gx / k, dz: -gz / k };
    }
    const MAX_SLOPE = 1.0;   // ~45°: steeper faces can't be climbed, and you slide down them
    const map = {
        id: 'the_summit', slopeAt, maxSlope: MAX_SLOPE, name: 'Summit of Despair', scene, colliders, terrain: false, heightAt,
        camera: { maxDist: 18, pitch: 0.42, dist: 9 },
        groundAt,
        stepBlocked: (x, z, y) => groundAt(x, z, y) > y + STEP || Math.max(Math.abs(x), Math.abs(z)) > HALF - 2,
        passable: (x, z, y) => !map.stepBlocked(x, z, y) && !(groundAt(x, z, y) > y + 0.02 && slopeAt(x, z).k > MAX_SLOPE),
        blockedAt(x, z, r, y = groundAt(x, z, 1e3)) { const c = colliderAt(colliders, x, z, r, y); if (c) return c.kind; return map.stepBlocked(x, z, y) ? 'wall' : null; },
        resolve: (pos, r) => pushOut(colliders, pos, r),
        projectileHit(p) { if (p.y < heightAt(p.x, p.z) + 0.05) return 'ground'; const c = colliderAt(colliders, p.x, p.z, 0.15, p.y); return c ? 'object' : null; },
        groundNormal(x, z) { const e = 0.3; return new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize(); },
        triggers: [], spawns: {}, stations: [], hittables: [], gatherSpots: [], gates: [],
        weatherDef: { id: 'the_summit', biome: 'snow' },
        fallDamage: true,
    };

    // The way back down (the foot of the ramp) and the closed pass at the top.
    const foot = { x: 0, z: 88 };
    const footVeil = buildArch(scene, foot.x, heightAt(foot.x, foot.z), foot.z, Math.PI);
    map.triggers.push({ x: foot.x, z: foot.z, r: 1.4, yMin: -5, yMax: 5, label: 'Back down to the approach', to: 'summit_of_despair', spawn: 'from_summit_peak' });
    map.spawns.start = { x: 0, z: 84, y: heightAt(0, 84), facing: Math.PI };
    const topEnd = P[P.length - 1];
    const passA = topEnd.a + Math.PI, px = Math.sin(passA) * (PLATEAU_R - 2), pz = Math.cos(passA) * (PLATEAU_R - 2);
    const passVeil = buildArch(scene, px, plateauH, pz, passA + Math.PI);
    passVeil.material.color.setHex(0x8a8a8a);
    map.triggers.push({ x: px, z: pz, r: 1.6, yMin: plateauH - 3, yMax: plateauH + 3, label: 'Over the pass to the Sylvan Sanctuary (the way is not open yet)', to: null });

    // Cairns: checkpoints. Touch one and a fall brings you back here.
    CAIRNS.forEach((ct, i) => {
        const p = P.reduce((b, q2) => (Math.abs(q2.t - ct) < Math.abs(b.t - ct) ? q2 : b), P[30]);
        const inner = { x: p.x - Math.sin(p.a) * (SHELF - 0.5), z: p.z - Math.cos(p.a) * (SHELF - 0.5) };
        const cairn = new THREE.Group();
        for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 - k * 0.06, 0), flat(0x7a7a82)); st.position.y = 0.25 + k * 0.38; st.rotation.y = k; st.castShadow = true; cairn.add(st); }
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), flat(0xa3141f, { side: THREE.DoubleSide })); flag.position.set(0.25, 2.0, 0); cairn.add(flag);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), flat(0x4a3020)); pole.position.y = 1.6; cairn.add(pole);
        cairn.position.set(inner.x, p.h, inner.z);
        scene.add(cairn);
        colliders.push({ x: inner.x, z: inner.z, r: 0.35, kind: 'wall', y0: p.h - 1, y1: p.h + 2 });
        map.stations.push({ mode: 'cairn', key: `cairn:${i}`, pos: new THREE.Vector3(p.x, p.h, p.z) });
        map.spawns[`cairn:${i}`] = { x: p.x, z: p.z, y: p.h, facing: p.a + Math.PI / 2 };
    });

    // Creatures on the ledges.
    const on = t => { const p = P.reduce((b, q2) => (Math.abs(q2.t - t) < Math.abs(b.t - t) ? q2 : b), P[30]); return { x: p.x, z: p.z }; };
    const creatureMap = { ...map, heightAt: (x, z) => groundAt(x, z, 1e3), passable: (x, z) => !!nearest(x, z, SHELF) };
    map.hittables.push(...createBeasts({ scene, map: creatureMap, rng, type: 'gloom_beak', posts: [on(0.15), on(0.62), on(0.9)] }));
    map.hittables.push(...createBeasts({ scene, map: creatureMap, rng, type: 'frost_shade', posts: [on(0.36), on(0.84)] }));

    map.mapInfo = {
        half: HALF, water: -99, ground: [232, 238, 244], trees: [],
        landmarks: [
            { name: 'The Ice Passage', ...on((TUNNEL[0] + TUNNEL[1]) / 2), icon: 'water' },
            { name: 'The Rope Bridge', ...on((GAP[0] + GAP[1]) / 2), icon: 'gate' },
            { name: 'The Summit', x: 0, z: 0, icon: 'tower' },
        ],
    };

    // ---------- wind: gusts on the open ledges push you toward the drop ----------
    let gustT = 8, gust = 0, warned = false;
    const shell = createOutdoorShell(scene, { quality, mood: { fog: '#c8d2dc', fogNear: 30, fogFar: 260, fogMix: 0.55, light: 0.85, nightFloor: 0.45 } });
    map.update = (t, dt, ctx) => {
        shell.update(dt, ctx);
        footVeil.material.opacity = 0.14 + Math.sin(t * 2) * 0.06;
        const pl = ctx.player, n = nearest(pl.pos.x, pl.pos.z, 4);
        const exposed = n && n.p.t > 0.05 && n.p.t < 1 && !(n.p.t >= TUNNEL[0] && n.p.t <= TUNNEL[1]) && !pl.dead;
        gustT -= dt;
        if (gustT < 1.4 && !warned && exposed) { warned = true; ctx.message?.('The wind rises — brace yourself…'); }
        if (gustT <= 0) { gust = 2.4; gustT = 10 + Math.random() * 8; warned = false; }
        if (gust > 0) {
            gust -= dt;
            if (exposed && !pl.hop) {   // outward, away from the mountain
                const r = Math.hypot(pl.pos.x, pl.pos.z) || 1, k = Math.sin(Math.min(1, gust / 2.4) * Math.PI) * 3.2;
                pl.knock.set((pl.pos.x / r) * k, 0, (pl.pos.z / r) * k);
            }
        }
        for (const h of map.hittables) h.update(dt, ctx);
    };
    return map;
}
