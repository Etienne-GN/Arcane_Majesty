// The Summit of Despair — the mountain itself: a range that walls off the north. One winding trail
// switchbacks up the south flank, crosses the summit pass and winds down the north side to a river,
// crossed by a single bridge to the Sylvan Sanctuary's gate — the only way through: deep ravines close
// both ends of the range. On the way: plateaus at the turns (cairns: respawn points), exposed stretches
// (nothing between you and the drop; gusts), safe stretches behind a stone parapet, two caves cut
// through rock shoulders, a rope bridge over a ravine, and the summit pass (Malphas, later).
// The ground is not snapped to: steep faces can't be climbed, you slide down them, and falls hurt.
import * as THREE from 'three';
import { flat, colliderAt, pushOut, fbm, mulberry32, smoothstep } from '../engine/lib.js';
import { createOutdoorShell } from '../engine/outdoor.js';
import { buildArch } from '../engine/region.js';
import { createBeasts } from './actors/beast.js';

const HALF = 95, CELL = 0.5, STEP = 0.5, SHELF = 1.8, RAVINE_X = 74, ZC = -6;

// The range: a ridge running east–west, a saddle (the pass) in the middle, higher peaks either side.
function base(x, z) {
    const crest = 96 + 26 * Math.pow(Math.min(1, Math.abs(x) / 70), 1.3);
    const w = z > ZC ? 86 : 68, u = Math.min(1, Math.abs(z - ZC) / w);
    const crag = Math.abs(fbm(x * 0.045 + 5, z * 0.045, 4) - 0.5) * 2;   // ridged noise: buttresses and gullies
    let h = crest * Math.pow(1 - u, 1.05) + (fbm(x * 0.07 + 5, z * 0.07, 3) * 5 + crag * 14 - 6) * (1 - u) * Math.min(1, u * 4);
    if (z < -74) h = Math.max(0.4, h);                                                 // the north valley
    if (z <= -75 && z >= -84) h = Math.min(h, -3.5 + Math.abs(z + 79.5) * 0.3);         // the river bed
    if (z < -84) h = 0.6 + fbm(x * 0.1, z * 0.1, 2) * 0.5;                              // the far bank
    if (z > 84) h = 0.3 + fbm(x * 0.1, z * 0.1, 2) * 0.4;                               // the snowfield at the foot
    h = h * (1 - smoothstep(RAVINE_X - 3, RAVINE_X + 2, Math.abs(x))) + -32 * smoothstep(RAVINE_X - 3, RAVINE_X + 2, Math.abs(x));   // the ravines
    h += smoothstep(RAVINE_X + 8, HALF, Math.abs(x)) * (70 + fbm(x * 0.1, z * 0.1, 2) * 20);   // the far walls of the gorges
    return h;
}

// The trail: irregular control points (x, z) with what the stretch after each one is like. A spline runs
// through them and wanders a little either side (wig), so it never reads as a regular zigzag: long rising
// traverses, a bend round the east spur, a cave through a shoulder, a tight run of hairpins, the rope
// bridge, the pass; then down the steeper north flank the same way to the river.
const ROUTE = [
    { x: 0, z: 89, kind: 'safe' },
    { x: 4, z: 79, kind: 'exposed', plateau: 7, cairn: true, name: 'Base camp', wig: 3 },
    { x: 34, z: 73, kind: 'exposed', wig: 3 },
    { x: 56, z: 62, kind: 'safe', plateau: 5 },
    { x: 50, z: 50, kind: 'safe', wig: 1.5 },
    { x: 30, z: 53, kind: 'cave' },
    { x: 12, z: 46, kind: 'exposed', wig: 2.5 },
    { x: -8, z: 54, kind: 'exposed', wig: 2.5 },
    { x: -34, z: 58, kind: 'safe', plateau: 5, wig: 2 },
    { x: -55, z: 48, kind: 'safe', wig: 1.5 },
    { x: -50, z: 36, kind: 'cave', plateau: 6, cairn: true, name: 'The Shelf of Sighs' },
    { x: -28, z: 38, kind: 'exposed', wig: 2 },
    { x: -12, z: 32, kind: 'safe', wig: 1 },
    { x: -32, z: 25, kind: 'safe', wig: 1 },
    { x: -14, z: 17, kind: 'exposed', wig: 1 },
    { x: -36, z: 9, kind: 'safe', plateau: 5, cairn: true, name: "The Widow's Ledge", wig: 2 },
    { x: -10, z: 6, kind: 'bridge' },
    { x: 14, z: 4, kind: 'exposed', wig: 2 },
    { x: 36, z: 0, kind: 'safe', plateau: 5, wig: 1.5 },
    { x: 26, z: -9, kind: 'exposed', wig: 1.5 },
    { x: 0, z: -6, kind: 'exposed', plateau: 11, cairn: true, name: 'The Summit Pass', summit: true, wig: 2 },
    { x: -24, z: -14, kind: 'safe', wig: 2 },
    { x: -48, z: -22, kind: 'cave', plateau: 5 },
    { x: -40, z: -35, kind: 'exposed', wig: 2.5 },
    { x: -14, z: -37, kind: 'safe', wig: 2 },
    { x: 10, z: -41, kind: 'exposed', plateau: 5, wig: 2.5 },
    { x: 34, z: -37, kind: 'safe', wig: 1.5 },
    { x: 50, z: -47, kind: 'exposed', wig: 1.5 },
    { x: 36, z: -57, kind: 'safe', plateau: 6, cairn: true, name: 'The Cloudbreak', wig: 2.5 },
    { x: 12, z: -55, kind: 'exposed', wig: 2.5 },
    { x: -12, z: -60, kind: 'safe', wig: 1.5 },
    { x: -30, z: -66, kind: 'safe', plateau: 7, cairn: true, name: 'The Riverwatch', wig: 2 },
    { x: 0, z: -72, kind: 'end' },
];

function trail() {
    // A dense Catmull-Rom spline through the control points (straight across the bridge), nudged sideways by
    // a slow wobble that is zero at every control point, then resampled every 0.6 m.
    const C = ROUTE, dense = [];
    const cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
    for (let i = 0; i < C.length - 1; i++) {
        const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(C.length - 1, i + 2)], straight = p1.kind === 'bridge';
        for (let k = 0; k < 160; k++) {
            const t = k / 160;
            dense.push({ seg: i, f: t, x: straight ? p1.x + (p2.x - p1.x) * t : cr(p0.x, p1.x, p2.x, p3.x, t), z: straight ? p1.z + (p2.z - p1.z) * t : cr(p0.z, p1.z, p2.z, p3.z, t) });
        }
    }
    dense.push({ seg: C.length - 2, f: 1, x: C[C.length - 1].x, z: C[C.length - 1].z });
    for (let i = 0; i < dense.length; i++) {
        const d = dense[i], a = dense[Math.max(0, i - 1)], b = dense[Math.min(dense.length - 1, i + 1)], L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        d.nx = -(b.z - a.z) / L; d.nz = (b.x - a.x) / L;
    }
    let arc = 0;
    for (let i = 0; i < dense.length; i++) {
        const d = dense[i];
        if (i) arc += Math.hypot(d.x - dense[i - 1].x, d.z - dense[i - 1].z);
        const w = (C[d.seg].wig ?? 0) * Math.sin(Math.PI * d.f) * (Math.sin(arc * 0.23 + d.seg * 1.7) * 0.65 + Math.sin(arc * 0.091 + d.seg) * 0.35);
        d.wx = d.x + d.nx * w; d.wz = d.z + d.nz * w;
    }
    const pts = [];
    let acc = 0.6;
    for (let i = 1; i < dense.length; i++) {
        const a = dense[i - 1], b = dense[i];
        acc += Math.hypot(b.wx - a.wx, b.wz - a.wz);
        if (acc >= 0.6 || i === dense.length - 1) { acc = 0; pts.push({ x: b.wx, z: b.wz, seg: b.seg, f: b.f, kind: C[b.seg].kind }); }
    }
    pts.unshift({ x: C[0].x, z: C[0].z, seg: 0, f: 0, kind: C[0].kind });
    for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)], L = Math.hypot(b.x - a.x, b.z - a.z) || 1;
        pts[i].dirx = (b.x - a.x) / L; pts[i].dirz = (b.z - a.z) / L; pts[i].h = base(pts[i].x, pts[i].z) - 1.2;
    }
    // Cap the grade (where the ground is steeper the trail is cut into the rock or built up on a ledge):
    // the mean of the tightest upper and lower envelopes with slope G, then a light smoothing.
    const G = 0.62, n = pts.length, d = i => Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    const up = pts.map(p => p.h), lo = pts.map(p => p.h);
    for (let i = 1; i < n; i++) { up[i] = Math.min(up[i], up[i - 1] + G * d(i)); lo[i] = Math.max(lo[i], lo[i - 1] - G * d(i)); }
    for (let i = n - 2; i >= 0; i--) { up[i] = Math.min(up[i], up[i + 1] + G * d(i + 1)); lo[i] = Math.max(lo[i], lo[i + 1] - G * d(i + 1)); }
    pts.forEach((p, i) => { p.h = (up[i] + lo[i]) / 2; });
    for (let pass = 0; pass < 3; pass++) {
        const hs = pts.map((_, i) => { const lo2 = Math.max(0, i - 6), hi2 = Math.min(n - 1, i + 6); let s = 0; for (let j = lo2; j <= hi2; j++) s += pts[j].h; return s / (hi2 - lo2 + 1); });
        pts.forEach((p, i) => { p.h = Math.max(hs[i], 0.4); });
    }
    pts.forEach((p, i) => { p.t = i / (pts.length - 1); });
    return pts;
}

export function createMountain({ quality }) {
    const scene = new THREE.Scene();
    const rng = mulberry32(911);
    const P = trail();
    const plateaus = ROUTE.map((c, i) => {
        if (!c.plateau) return null;
        const p = P.reduce((b, q2) => (Math.hypot(q2.x - c.x, q2.z - c.z) < Math.hypot(b.x - c.x, b.z - c.z) ? q2 : b), P[0]);
        return { ...c, h: p.h, i };
    }).filter(Boolean);

    const B = 4, buckets = new Map();
    P.forEach((p, i) => { const k = `${Math.floor(p.x / B)},${Math.floor(p.z / B)}`; (buckets.get(k) ?? buckets.set(k, []).get(k)).push(i); });
    function nearest(x, z, within = 9) {
        let best = null, bd = within;
        const cx = Math.floor(x / B), cz = Math.floor(z / B), n = Math.ceil(within / B);
        for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) for (const i of buckets.get(`${cx + dx},${cz + dz}`) ?? []) {
            const d = Math.hypot(P[i].x - x, P[i].z - z);
            if (d < bd) { bd = d; best = P[i]; }
        }
        return best ? { p: best, d: bd } : null;
    }
    const bridgeSeg = ROUTE.findIndex(c => c.kind === 'bridge');
    const inGap = p => p.seg === bridgeSeg && p.f > 0.32 && p.f < 0.62;
    P.forEach(p => { p.walled = p.kind === 'cave'; });

    // ---------- the height field ----------
    const downhill = p => { const e = 1, gx = base(p.x + e, p.z) - base(p.x - e, p.z), gz = base(p.x, p.z + e) - base(p.x, p.z - e); const nx = -p.dirz, nz = p.dirx; return nx * -gx + nz * -gz > 0 ? [nx, nz] : [-nx, -nz]; };
    const N = Math.round((HALF * 2) / CELL) + 1, field = new Float32Array(N * N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = i * CELL - HALF, z = j * CELL - HALF;
        let h = base(x, z);
        for (const pl of plateaus) { const d = Math.hypot(x - pl.x, z - pl.z); if (d < pl.plateau) h = d < pl.plateau - 0.8 ? pl.h : Math.max(Math.min(h, pl.h + 6), pl.h - (d - pl.plateau + 0.8) * 8); }
        const n = nearest(x, z);
        if (n) {
            const { p, d } = n;
            if (inGap(p) && d < 6) h = Math.min(h, p.h - 28);                                     // the ravine under the bridge
            else if (d < SHELF) h = p.h;                                                          // the trail
            else if (d < SHELF + 7) {
                const [ox, oz] = downhill(p), side = (x - p.x) * ox + (z - p.z) * oz;
                if (side > 0 && !p.walled && !plateaus.some(pl => Math.hypot(x - pl.x, z - pl.z) < pl.plateau)) h = Math.min(h, p.h - 0.3 - (d - SHELF) * 1.6);            // a ledge: the drop side falls away
                else if (h < p.h) h = p.h - (d - SHELF) * 6;                                     // the lip
            }
            if (p.kind === 'cave' && d >= SHELF && d < SHELF + 2.6 && !(inGap(p))) h = Math.max(h, p.h + 7);   // cave walls
        }
        field[j * N + i] = h;
    }
    const at = (i, j) => field[Math.max(0, Math.min(N - 1, j)) * N + Math.max(0, Math.min(N - 1, i))];
    function heightAt(x, z) {
        const fx = (x + HALF) / CELL, fz = (z + HALF) / CELL, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
        return (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
    }

    // ---------- terrain mesh ----------
    const SEG = 190;
    const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2, SEG, SEG).rotateX(-Math.PI / 2);
    const gp = geo.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setY(i, heightAt(gp.getX(i), gp.getZ(i)));
    const tg = geo.toNonIndexed();
    tg.computeVertexNormals();
    const tp = tg.attributes.position, tn = tg.attributes.normal, colors = new Float32Array(tp.count * 3), col = new THREE.Color();
    const SNOW = new THREE.Color(0xeef2f6), ROCK = new THREE.Color(0x5a5c64), TRAIL = new THREE.Color(0xb4bec8), BED = new THREE.Color(0x4a4a50);
    for (let i = 0; i < tp.count; i += 3) {
        const ny = (tn.getY(i) + tn.getY(i + 1) + tn.getY(i + 2)) / 3;
        const cx = (tp.getX(i) + tp.getX(i + 1) + tp.getX(i + 2)) / 3, cz = (tp.getZ(i) + tp.getZ(i + 1) + tp.getZ(i + 2)) / 3, cy = heightAt(cx, cz);
        const n = nearest(cx, cz, SHELF + 0.4);
        if (cy < -2) col.copy(BED);
        else if (n && Math.abs(cy - n.p.h) < 0.4) col.copy(TRAIL);
        else col.copy(ROCK).lerp(SNOW, smoothstep(0.55, 0.85, ny)).offsetHSL(0, 0, (fbm(cx * 0.2, cz * 0.2, 2) - 0.5) * 0.06);
        for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (i + k) * 3);
    }
    tg.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const terrain = new THREE.Mesh(tg, flat(0xffffff, { vertexColors: true }));
    terrain.receiveShadow = terrain.castShadow = true;
    scene.add(terrain);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2f5a6e, transparent: true, opacity: 0.88, roughness: 0.12, metalness: 0.2 }));
    water.position.y = -1.6;
    scene.add(water);

    const colliders = [];

    // Safe stretches: a low stone parapet on the drop side (you can't fall there).
    const wallBits = P.filter((p, i) => p.kind === 'safe' && i % 3 === 0 && !plateaus.some(pl => Math.hypot(p.x - pl.x, p.z - pl.z) < pl.plateau));
    const parapet = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.9, 2.0).translate(0, 0.45, 0), flat(0xffffff), wallBits.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    wallBits.forEach((p, i) => {
        const [ox, oz] = downhill(p), x = p.x + ox * (SHELF - 0.15), z = p.z + oz * (SHELF - 0.15);
        parapet.setMatrixAt(i, m4.compose(v.set(x, p.h, z), q.setFromAxisAngle(Y, Math.atan2(p.dirx, p.dirz)), s.set(1, 0.8 + rng() * 0.4, 1)));
        parapet.setColorAt(i, col.setHex(0x7a7680).offsetHSL(0, 0, (rng() - 0.5) * 0.08));
        colliders.push({ ax: x - p.dirx, az: z - p.dirz, bx: x + p.dirx, bz: z + p.dirz, r: 0.3, kind: 'wall', y0: p.h - 1, y1: p.h + 1.2 });
    });
    parapet.castShadow = parapet.receiveShadow = true;
    scene.add(parapet);
    // Exposed stretches: only a few leaning stakes mark the edge.
    const stakes = P.filter((p, i) => p.kind === 'exposed' && i % 8 === 0 && !plateaus.some(pl => Math.hypot(p.x - pl.x, p.z - pl.z) < pl.plateau));
    const stakeMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 1.0, 5).translate(0, 0.5, 0), flat(0x5a3a22), stakes.length);
    stakes.forEach((p, i) => { const [ox, oz] = downhill(p); stakeMesh.setMatrixAt(i, m4.compose(v.set(p.x + ox * (SHELF - 0.2), p.h, p.z + oz * (SHELF - 0.2)), q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), (rng() - 0.5) * 0.4), s.set(1, 1, 1))); });
    stakeMesh.castShadow = true;
    scene.add(stakeMesh);

    // Caves: a rock roof over the trail, ice crystals glowing in the walls.
    const roofMat = flat(0x3e3e46), crystal = new THREE.MeshStandardMaterial({ color: 0xbfe4ff, emissive: 0x4a9ad8, emissiveIntensity: 1.2, flatShading: true });
    const caveLights = [];
    P.filter((p, i) => p.kind === 'cave' && i % 3 === 0).forEach((p, k) => {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(SHELF * 2 + 3.5, 1.6, 2.2), roofMat);
        slab.position.set(p.x, p.h + 3.6 + rng() * 0.3, p.z);
        slab.rotation.y = Math.atan2(p.dirx, p.dirz);
        slab.rotation.z = (rng() - 0.5) * 0.1;
        slab.castShadow = true;
        scene.add(slab);
        if (k % 4 === 0) for (const sd of [-1, 1]) {
            const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), crystal);
            c.position.set(p.x + -p.dirz * (SHELF + 0.3) * sd, p.h + 1.2 + rng(), p.z + p.dirx * (SHELF + 0.3) * sd);
            c.scale.y = 2.4; c.rotation.z = (rng() - 0.5);
            scene.add(c);
        }
        if (k % 10 === 0) { const l = new THREE.PointLight(0x7ac8ff, 9, 12, 1.5); l.position.set(p.x, p.h + 2, p.z); scene.add(l); caveLights.push(l); }
    });

    // The rope bridge over the ravine.
    const gapPts = P.filter(p => p.seg === bridgeSeg && p.f > 0.3 && p.f < 0.64);
    const A = gapPts[0], Z = gapPts[gapPts.length - 1];
    const deckAt = (x, z) => {
        const n = nearest(x, z, 1.0);
        if (!n || n.p.seg !== bridgeSeg || n.p.f <= 0.3 || n.p.f >= 0.64) return null;
        const k = (n.p.f - A.f) / (Z.f - A.f);
        return A.h + (Z.h - A.h) * k - Math.sin(k * Math.PI) * 0.7;
    };
    const plank = flat(0x7a5634), rope = new THREE.LineBasicMaterial({ color: 0x8a7050 }), ropePts = [[], []];
    gapPts.forEach((p, i) => {
        const y = deckAt(p.x, p.z) ?? p.h;
        if (i % 2 === 0) { const pl = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.35), plank); pl.position.set(p.x, y - 0.04, p.z); pl.rotation.y = Math.atan2(p.dirx, p.dirz); pl.castShadow = true; scene.add(pl); }
        for (const sd of [-1, 1]) ropePts[sd < 0 ? 0 : 1].push(new THREE.Vector3(p.x - p.dirz * 0.95 * sd, y + 1.0, p.z + p.dirx * 0.95 * sd));
    });
    for (const pts of ropePts) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), rope));
    // The ropes are railings: you can't step off the side of the bridge.
    // Anchor posts at both bridgeheads, with a short railing running back along the ledge.
    const postMat = flat(0x5a3a22), dA = [A.dirx, A.dirz];
    for (const pts of ropePts) for (const [q, sgn] of [[pts[0], -1], [pts[pts.length - 1], 1]]) {
        const y = q.y - 1.0, ex = q.x + dA[0] * 2.4 * sgn, ez = q.z + dA[1] * 2.4 * sgn;
        for (const [px, pz] of [[q.x, q.z], [ex, ez]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.4, 6), postMat); post.position.set(px, y + 0.5, pz); post.castShadow = true; scene.add(post); }
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([q, new THREE.Vector3(ex, y + 1.0, ez)]), rope));
        colliders.push({ ax: q.x, az: q.z, bx: ex, bz: ez, r: 0.2, kind: 'wall', y0: y - 3, y1: y + 2 });
    }
    for (const pts of ropePts) for (let i = 0; i < pts.length - 1; i += 2) {
        const a = pts[i], b = pts[Math.min(pts.length - 1, i + 2)];
        colliders.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, r: 0.2, kind: 'wall', y0: Math.min(a.y, b.y) - 3, y1: Math.max(a.y, b.y) + 1 });
    }
    // The stone bridge over the river, and the Sanctuary's gate beyond (closed for now).
    const stone = flat(0x8a8680);
    const bankN = heightAt(0, -72.3), bankS = heightAt(0, -86.7);
    const stoneDeck = (x, z) => {
        if (Math.abs(x) >= 1.4 || z >= -72.5 || z <= -86.5) return null;
        const k = (-72.5 - z) / 14;
        return bankN + (bankS - bankN) * k + Math.sin(k * Math.PI) * 0.9;   // a gentle arch, level with both banks
    };
    for (let k = 0; k < 14; k++) {
        const z = -73 - k, y = stoneDeck(0, z), nxt = stoneDeck(0, z - 1) ?? bankS, prv = stoneDeck(0, z + 0.99) ?? bankN;
        const sb = new THREE.Mesh(new THREE.BoxGeometry(3, 0.7, 1.05), stone);
        sb.position.set(0, y - 0.35, z);
        sb.rotation.x = Math.atan2(nxt - prv, 2);
        sb.castShadow = sb.receiveShadow = true;
        scene.add(sb);
        for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.7, 1.05), stone); w.position.set(sd * 1.4, y + 0.3, z); w.rotation.x = sb.rotation.x; scene.add(w); }
    }
    for (const sd of [-1, 1]) colliders.push({ ax: sd * 1.4, az: -86.5, bx: sd * 1.4, bz: -72.5, r: 0.25, kind: 'wall', y0: -1, y1: 4 });
    for (let k = 0; k < 2; k++) { const pier = new THREE.Mesh(new THREE.BoxGeometry(2.6, 5, 1.2), stone); pier.position.set(0, -2.5, -77 - k * 5); scene.add(pier); }
    const gate = buildArch(scene, 0, base(0, -90), -90, 0);
    gate.material.color.setHex(0x8a9a7a);

    // ---------- the map interface (you can fall here) ----------
    const groundAt = (x, z, y) => {
        const g = heightAt(x, z);
        for (const d of [deckAt(x, z), stoneDeck(x, z)]) if (d !== null && d <= y + STEP && d > g) return d;
        return g;
    };
    const onTrail = (x, z) => (nearest(x, z, SHELF)?.d ?? 99) < SHELF - 0.05;
    const flatHere = (x, z) => onTrail(x, z) || plateaus.some(pl => Math.hypot(x - pl.x, z - pl.z) < pl.plateau - 0.8) || deckAt(x, z) !== null || stoneDeck(x, z) !== null || z > 84 || z < -84;
    function slopeAt(x, z) {
        if (flatHere(x, z)) return { k: 0, dx: 0, dz: 0 };
        const e = 0.35, gx = (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), gz = (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
        const k = Math.hypot(gx, gz) || 1e-6;
        return { k, dx: -gx / k, dz: -gz / k };
    }
    const MAX_SLOPE = 0.9;
    const map = {
        id: 'the_summit', name: 'Summit of Despair', scene, colliders, terrain: false, heightAt, slopeAt, maxSlope: MAX_SLOPE,
        camera: { maxDist: 18, pitch: 0.45, dist: 9 },
        groundAt,
        stepBlocked: (x, z, y) => groundAt(x, z, y) > y + STEP || Math.max(Math.abs(x), Math.abs(z)) > HALF - 2,
        passable: (x, z, y) => !map.stepBlocked(x, z, y) && !(groundAt(x, z, y) > y + 0.02 && slopeAt(x, z).k > MAX_SLOPE),
        blockedAt(x, z, r, y = groundAt(x, z, 1e3)) { const c = colliderAt(colliders, x, z, r, y); if (c) return c.kind; return map.stepBlocked(x, z, y) ? 'wall' : null; },
        resolve: (pos, r) => pushOut(colliders, pos, r),
        projectileHit(p) { if (p.y < heightAt(p.x, p.z) + 0.05) return 'ground'; const c = colliderAt(colliders, p.x, p.z, 0.15, p.y); return c ? 'object' : null; },
        groundNormal(x, z) { const e = 0.3; return new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize(); },
        triggers: [], spawns: {}, stations: [], hittables: [], gatherSpots: [], gates: [],
        weatherDef: { id: 'the_summit', biome: 'snow' }, fallDamage: true,
    };
    const footVeil = buildArch(scene, 0, base(0, 93), 93, Math.PI);
    map.triggers.push({ x: 0, z: 93, r: 1.4, yMin: -5, yMax: 6, label: 'Back down to the approach', to: 'summit_of_despair', spawn: 'from_summit_peak' });
    map.triggers.push({ x: 0, z: -90, r: 1.8, yMin: -5, yMax: 8, label: 'The Sylvan Sanctuary (the way is not open yet)', to: null });
    map.spawns.start = { x: 0, z: 90, y: base(0, 90), facing: Math.PI };

    // Cairns at the named plateaus.
    plateaus.filter(pl => pl.cairn).forEach((pl, i) => {
        const cairn = new THREE.Group();
        for (let k = 0; k < 4; k++) { const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32 - k * 0.06, 0), flat(0x7a7a82)); st.position.y = 0.25 + k * 0.38; st.rotation.y = k; st.castShadow = true; cairn.add(st); }
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 4), flat(0x4a3020)); pole.position.y = 1.6; cairn.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.3), flat(0xa3141f, { side: THREE.DoubleSide })); flag.position.set(0.25, 2.0, 0); cairn.add(flag);
        const cx = pl.x + 2.4, cz = pl.z;
        cairn.position.set(cx, pl.h, cz);
        scene.add(cairn);
        colliders.push({ x: cx, z: cz, r: 0.35, kind: 'wall', y0: pl.h - 1, y1: pl.h + 2 });
        map.stations.push({ mode: 'cairn', key: `cairn:${i}`, pos: new THREE.Vector3(pl.x + 1.2, pl.h, pl.z) });
        map.spawns[`cairn:${i}`] = { x: pl.x, z: pl.z, y: pl.h, facing: 0 };
        if (pl.summit) {   // the pass: a ring of old stones where Malphas will wait
            for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, st = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.6 + rng(), 0.5), flat(0x6a6870)); st.position.set(pl.x + Math.cos(a) * 7, pl.h + 1.2, pl.z + Math.sin(a) * 7); st.rotation.y = -a; st.castShadow = true; scene.add(st); colliders.push({ x: st.position.x, z: st.position.z, r: 0.5, kind: 'wall', y0: pl.h - 1, y1: pl.h + 3 }); }
        }
    });

    // Creatures: Gloom-Beaks over the exposed stretches, Frost-Shades in the caves, a Crag-Fiend on a plateau.
    const pick = (kind, n) => P.filter(p => p.kind === kind).filter((_, i, a) => i % Math.floor(a.length / n) === 0).slice(0, n).map(p => ({ x: p.x, z: p.z }));
    const creatureMap = { ...map, heightAt: (x, z) => groundAt(x, z, 1e3), passable: (x, z) => onTrail(x, z) || plateaus.some(pl => Math.hypot(x - pl.x, z - pl.z) < pl.plateau - 1) };
    map.hittables.push(...createBeasts({ scene, map: creatureMap, rng, type: 'gloom_beak', posts: pick('exposed', 4) }));
    map.hittables.push(...createBeasts({ scene, map: creatureMap, rng, type: 'frost_shade', posts: pick('cave', 4) }));
    const fiendAt = plateaus.find(pl => pl.x === -34) ?? plateaus[1];
    map.hittables.push(...createBeasts({ scene, map: creatureMap, rng, type: 'crag_fiend', posts: [{ x: fiendAt.x, z: fiendAt.z }] }));

    map.cameraCeiling = (x, z, y) => { const n = nearest(x, z, SHELF + 1); return n && n.p.kind === 'cave' && Math.abs(y - n.p.h) < 1.5 ? n.p.h + 2.9 : null; };
    map.trail = P; map.plateaus = plateaus; map.onTrail = onTrail;
    map.mapInfo = {
        half: HALF, water: -1.6, ground: [232, 238, 244], trees: [],
        landmarks: [
            ...plateaus.filter(pl => pl.name).map(pl => ({ name: pl.name, x: pl.x, z: pl.z, icon: pl.summit ? 'tower' : 'stones' })),
            { name: 'The Rope Bridge', x: (A.x + Z.x) / 2, z: (A.z + Z.z) / 2, icon: 'gate' },
            { name: 'The Sylvan Sanctuary', x: 0, z: -90, icon: 'gate' },
        ],
    };

    // Wind: gusts on the exposed stretches push you toward the drop (warned first).
    let gustT = 8, gust = 0, warned = false;
    const shell = createOutdoorShell(scene, { quality, mood: { fog: '#c8d2dc', fogNear: 30, fogFar: 280, fogMix: 0.55, light: 0.85, nightFloor: 0.45 } });
    // The cloud band: the higher you climb the thicker the fog, until you break through around 80 m; from
    // the pass you look out over a sea of cloud that hides the valleys (and the edges of the world).
    const CLOUD_LO = 50, CLOUD_HI = 76, cloudTex = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 256;
        const g = c.getContext('2d'), r = mulberry32(77);
        for (let k = 0; k < 140; k++) {
            const x = r() * 256, y = r() * 256, rad = 14 + r() * 46, gr = g.createRadialGradient(x, y, 0, x, y, rad);
            gr.addColorStop(0, `rgba(255,255,255,${0.18 + r() * 0.22})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
            for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { g.fillStyle = gr; g.save(); g.translate(ox, oy); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
        }
        const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(5, 5); return tx;
    })();
    const clouds = [62, 68, 73].map((y, i) => {
        const tx = cloudTex.clone(); tx.needsUpdate = true; tx.offset.set(i * 0.37, i * 0.21);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 7, HALF * 7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tx, color: 0xf2f4f8, transparent: true, opacity: 0.85, depthWrite: false, fog: false, side: THREE.DoubleSide }));
        m.position.y = y; m.renderOrder = 2; scene.add(m);
        return { m, y, tx, speed: 0.004 + i * 0.002 };
    });
    const cloudWhite = new THREE.Color(0xdfe4ea);
    map.fogAt = y => {   // 0 = clear air, 1 = inside the cloud
        if (y < CLOUD_LO - 25) return 0;
        if (y < CLOUD_LO) return 0.55 * smoothstep(CLOUD_LO - 25, CLOUD_LO, y);
        if (y < CLOUD_HI) return 0.55 + 0.45 * smoothstep(CLOUD_LO, CLOUD_LO + 10, y);
        return 1 - smoothstep(CLOUD_HI, CLOUD_HI + 8, y);
    };
    map.update = (t, dt, ctx) => {
        shell.update(dt, ctx);
        {
            const cy = ctx.camera?.position.y ?? ctx.player.pos.y, k = map.fogAt(cy), above = cy > CLOUD_HI + 4;
            scene.fog.near = THREE.MathUtils.lerp(above ? 60 : 30, 0.5, k);
            scene.fog.far = THREE.MathUtils.lerp(above ? 520 : 240, 16, Math.pow(k, 0.7));
            scene.fog.color.lerp(cloudWhite, k * 0.8);
            scene.background.copy(scene.fog.color);
            shell.sky.material.uniforms.top.value.lerp(scene.fog.color, k); shell.sky.material.uniforms.bottom.value.copy(scene.fog.color);   // inside the cloud there is no sky
            for (const c of clouds) {
                c.tx.offset.x += c.speed * dt; c.tx.offset.y += c.speed * 0.4 * dt;
                c.m.material.opacity = 0.85 * smoothstep(2, 9, Math.abs(cy - c.y));   // no flat sheet when you pass through
            }
        }
        footVeil.material.opacity = 0.14 + Math.sin(t * 2) * 0.06;
        for (const l of caveLights) l.intensity = 9 + Math.sin(t * 2 + l.position.x) * 2;
        const pl = ctx.player, n = nearest(pl.pos.x, pl.pos.z, 4);
        const exposed = n && n.p.kind === 'exposed' && !plateaus.some(pp => Math.hypot(pl.pos.x - pp.x, pl.pos.z - pp.z) < pp.plateau) && !pl.dead;
        gustT -= dt;
        if (gustT < 1.4 && !warned && exposed) { warned = true; ctx.message?.('The wind rises — brace yourself…'); }
        if (gustT <= 0) { gust = 2.4; gustT = 10 + Math.random() * 8; warned = false; }
        if (gust > 0) {
            gust -= dt;
            if (exposed && !pl.hop) { const [ox, oz] = downhill(n.p), k = Math.sin(Math.min(1, gust / 2.4) * Math.PI) * 3.2; pl.knock.set(ox * k, 0, oz * k); }
        }
        for (const h of map.hittables) h.update(dt, ctx);
    };
    return map;
}
