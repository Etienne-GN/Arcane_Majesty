// Eldrin's Tower and its vale: a slender ivy-clad tower with a timber gallery and a mossy
// cone roof, a cottage annex, a pavilion, stone stairs, a two-tier waterfall off a cliff,
// a stream into the lake under a stone arch bridge, dense pines, and its own mood.
// Everything here is laid out in a local frame: u = right, v = away from the start point.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flat, faceShade, fbm, smoothstep, Particles, radialTexture } from './lib.js';

const T = { x: -60, z: -44 };
const F = new THREE.Vector2(T.x, T.z).normalize();          // forward (away from spawn)
const RT = new THREE.Vector2(-F.y, F.x);                    // right, as seen from spawn
export const ELDRIN = { T, TY: 3, R: 4.4 };

export const toLocal = (x, z) => ({ u: (x - T.x) * RT.x + (z - T.z) * RT.y, v: (x - T.x) * F.x + (z - T.z) * F.y });
export const toWorld = (u, v) => ({ x: T.x + RT.x * u + F.x * v, z: T.z + RT.y * u + F.y * v });

const POOL = { u: 13.5, v: 6, r: 3.6, y: 0.0 };
const LEDGE = { u0: 9, u1: 18.5, v0: 8.6, v1: 11.6, y: 6 };
const STREAM = [[13.5, 6], [13.0, 2.5], [11.8, -1], [11.2, -4.5], [10.6, -9], [10, -16]];
const STREAM_Y = [0, -0.25, -0.5, -0.75, -1.05, -1.3];
const PATH2 = [[-1.5, -11.5], [4, -7.2], [9.2, -3.5], [13.8, -2.4], [18, -1.2]];
const BRIDGE = { a: [9.2, -3.5], b: [13.8, -2.4], rise: 1.3 };
const STAIR = { top: [0, -5.0], bottom: [-1.5, -11.5] };
export const STAIR_BASE = toWorld(...STAIR.bottom);
const PAVILION = { u: -10.5, v: -2.2 };
const ANNEX = { u: -5.6, v: 0.6 };

function segDist(px, pz, pts) {
    let best = { d: Infinity, t: 0 };
    let acc = 0;
    const lens = [];
    for (let i = 0; i < pts.length - 1; i++) lens.push(Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]));
    const total = lens.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const dx = bx - ax, dz = bz - az;
        const k = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
        const d = Math.hypot(px - ax - dx * k, pz - az - dz * k);
        if (d < best.d) best = { d, t: (acc + lens[i] * k) / total, seg: i, k };
        acc += lens[i];
    }
    return best;
}
const streamWater = t => {
    const f = t * (STREAM_Y.length - 1), i = Math.min(STREAM_Y.length - 2, Math.floor(f));
    return STREAM_Y[i] + (STREAM_Y[i + 1] - STREAM_Y[i]) * (f - i);
};

// ---------- terrain ----------
export function valeHeight(raw, x, z) {
    const dist = Math.hypot(x - T.x, z - T.z);
    if (dist > 44) return raw;
    const { u, v } = toLocal(x, z);
    let h = 0.5 + fbm(x * 0.2, z * 0.2, 2) * 0.4;
    h += (-4.5 - h) * smoothstep(-12, -24, v);                                         // the lake in front
    // Plateau the tower stands on (a rounded rectangle).
    const qx = Math.max(-14 - u, u - 7, 0), qz = Math.max(-6 - v, v - 10, 0);
    h += (ELDRIN.TY - h) * smoothstep(5, 0.5, Math.hypot(qx, qz));
    // The stair line down to the path: a straight ramp.
    const st = segDist(u, v, [STAIR.top, STAIR.bottom]);
    if (st.d < 2.5) h += (ELDRIN.TY + (0.7 - ELDRIN.TY) * st.t - h) * smoothstep(2.5, 1.2, st.d);
    // The cliff behind; gentler to the left, and a ledge where the lower falls start.
    const w = u > 0 ? 3.2 : 3.2 + -u * 0.45;
    const cliffTop = 20 + fbm(x * 0.08, z * 0.08, 3) * 6;
    const inNotch = u > LEDGE.u0 && u < LEDGE.u1;
    const c0 = inNotch ? LEDGE.v1 : 10.5;
    h = Math.max(h, h + (cliffTop - h) * smoothstep(c0, c0 + w, v));
    if (inNotch && v > LEDGE.v0 && v <= LEDGE.v1 + 0.3) {
        const edge = smoothstep(0, 0.6, Math.min(u - LEDGE.u0, LEDGE.u1 - u));
        h = Math.max(h, h + (LEDGE.y - h) * smoothstep(LEDGE.v0, LEDGE.v0 + 0.5, v) * edge);
    }
    h += fbm(x * 0.3, z * 0.3, 2) * 1.2 * smoothstep(c0 + 0.5, c0 + 3, v);             // rough rock
    // Waterfall pool and stream bed.
    const pd = Math.hypot(u - POOL.u, v - POOL.v);
    h = Math.min(h, h + (POOL.y - 1.1 - h) * smoothstep(POOL.r + 1.5, POOL.r - 0.8, pd));
    const sd = segDist(u, v, STREAM);
    if (sd.d < 4) h = Math.min(h, h + (streamWater(sd.t) - 0.55 - h) * smoothstep(3.2, 1.0, sd.d));
    // Footpath to the bridge (raised to dry ground, but never over the stream).
    const p2 = segDist(u, v, PATH2);
    if (p2.d < 2.5 && sd.d > 2.2) h = Math.max(h, h + (0.75 - h) * smoothstep(2.5, 1.0, p2.d));
    const m = smoothstep(44, 30, dist);
    return raw + (h - raw) * m;
}

// Bridge deck (walkable) — null when off the bridge.
export function bridgeDeck(x, z, ground) {
    const { u, v } = toLocal(x, z);
    const s = segDist(u, v, [BRIDGE.a, BRIDGE.b]);
    if (s.d > 0.95) return null;
    const ya = ground(...Object.values(toWorld(...BRIDGE.a))), yb = ground(...Object.values(toWorld(...BRIDGE.b)));
    return ya + (yb - ya) * s.t + BRIDGE.rise * (1 - (2 * s.t - 1) ** 2) + 0.15;
}

export function inStream(x, z) {
    const { u, v } = toLocal(x, z);
    return segDist(u, v, STREAM).d < 1.7 || Math.hypot(u - POOL.u, v - POOL.v) < POOL.r;
}

// Places other systems should keep clear (trees, rocks, flowers).
export function valeReserved(x, z, margin = 0) {
    if (Math.hypot(x - T.x, z - T.z) > 46) return false;
    const { u, v } = toLocal(x, z);
    if (u > -16 - margin && u < 8.5 + margin && v > -8 - margin && v < 9 + margin) return true;   // plateau + buildings
    if (segDist(u, v, STREAM).d < 3 + margin || Math.hypot(u - POOL.u, v - POOL.v) < POOL.r + 2 + margin) return true;
    if (segDist(u, v, PATH2).d < 2 + margin || segDist(u, v, [STAIR.top, STAIR.bottom]).d < 2.5 + margin) return true;
    if (u > LEDGE.u0 - 1 && u < LEDGE.u1 + 1 && v > 7 && v < 16) return true;                    // the falls
    return false;
}

// Trees in the vale: crowd the cliff top and the flanks, keep the lake side open so the
// tower reads from across the water (like the reference painting's open foreground).
export function valeTreeOK(x, z) {
    const dist = Math.hypot(x - T.x, z - T.z);
    if (dist > 46) return true;
    const { u, v } = toLocal(x, z);
    return v > 9.5 || u < -17 || (u > 19 && v > -6);
}

// Terrain tint for the vale (or null to keep the default).
export function valeColor(x, z, col, dirt, moss) {
    if (Math.hypot(x - T.x, z - T.z) > 44) return;
    const { u, v } = toLocal(x, z);
    if (segDist(u, v, PATH2).d < 1.3 || segDist(u, v, [STAIR.top, STAIR.bottom]).d < 1.6) col.lerp(dirt, 0.85);
    else if (segDist(u, v, STREAM).d < 2.6 || Math.hypot(u - POOL.u, v - POOL.v) < POOL.r + 1.2) col.lerp(new THREE.Color(0x4a4a3e), 0.7);
    else if (u > -16 && u < 8.5 && v > -7 && v < 11) col.lerp(moss, 0.5);
}

// ---------- build ----------
export function buildEldrin({ scene, heightAt, addCollider, rng }) {
    const animated = [];
    const W = (u, v) => toWorld(u, v);
    const ang = Math.atan2(F.x, F.y);   // rotation.y that makes local +z point along F
    const place = (o, u, v, y, ry = 0) => {
        const p = W(u, v);
        o.position.set(p.x, y, p.z);
        o.rotation.y = ang + ry;
        o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
        scene.add(o);
        return o;
    };
    // rotation.y = ang maps a group's local +z → F (away from spawn) and local +x → −RT (left).
    const TY = ELDRIN.TY;
    const M = {
        trim: flat(0x6b655b), wood: flat(0x6e4a2c), darkWood: flat(0x3f2a18),
        plaster: flat(0xb8a585), roof: flat(0xffffff, { vertexColors: true }),
        stone: flat(0xffffff, { vertexColors: true }),
        window: new THREE.MeshStandardMaterial({ color: 0xffc070, emissive: 0xff9a35, emissiveIntensity: 2.0 }),
        ivy: flat(0xffffff), iron: flat(0x2e2e30, { metalness: 0.5 }),
    };
    const box = (g, w, h, d, m, x, y, z, ry = 0, rx = 0, rz = 0) => {
        const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
        g.add(o); return o;
    };

    // ===== the tower =====
    const tower = new THREE.Group();
    const R0 = ELDRIN.R, R1 = 3.9, H = 16;
    const shaft = new THREE.Mesh(faceShade(new THREE.CylinderGeometry(R1, R0, H, 26, 14, true),
        [0x9a9384, 0x8b8478, 0xa59d8c, 0x7f796d, 0x938b7a], rng), M.stone);
    shaft.position.y = H / 2 - 0.3;
    tower.add(shaft);
    for (const y of [0.2, 5.4, 10.6]) {
        const r = R0 + (R1 - R0) * (y / H);
        const band = new THREE.Mesh(new THREE.TorusGeometry(r + 0.02, 0.16, 4, 26).rotateX(Math.PI / 2), M.trim);
        band.position.y = y;
        tower.add(band);
    }
    // Small lit windows climbing the tower, with sills.
    for (const [a, y] of [[0.35, 3.1], [-0.5, 6.3], [0.15, 8.9], [-0.25, 12.2], [1.4, 10.4], [-1.6, 7.4], [2.6, 4.6]]) {
        const r = R0 + (R1 - R0) * (y / H);
        const g = new THREE.Group();
        g.rotation.y = a;
        box(g, 0.55, 0.95, 0.2, M.window, 0, y, r - 0.04);
        box(g, 0.8, 0.12, 0.35, M.trim, 0, y - 0.55, r + 0.05);
        box(g, 0.75, 0.18, 0.25, M.trim, 0, y + 0.56, r);
        tower.add(g);
    }
    // Brackets, gallery deck, railing, and the timber top room.
    const GY = H - 0.4;
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const g = new THREE.Group(); g.rotation.y = a;
        box(g, 0.18, 0.18, 1.6, M.darkWood, 0, GY - 0.6, R1 + 0.55, 0, 0.6);
        tower.add(g);
    }
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(R1 + 1.45, R1 + 1.3, 0.3, 26), M.wood);
    deck.position.y = GY;
    tower.add(deck);
    for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        const g = new THREE.Group(); g.rotation.y = a;
        box(g, 0.09, 1.0, 0.09, M.darkWood, 0, GY + 0.6, R1 + 1.35);
        tower.add(g);
    }
    const rail = new THREE.Mesh(new THREE.TorusGeometry(R1 + 1.35, 0.06, 4, 30).rotateX(Math.PI / 2), M.darkWood);
    rail.position.y = GY + 1.1;
    tower.add(rail);
    const room = new THREE.Mesh(new THREE.CylinderGeometry(R1 + 0.25, R1 + 0.25, 3.0, 16), M.plaster);
    room.position.y = GY + 1.6;
    tower.add(room);
    for (let i = 0; i < 16; i++) { // timber posts + lit windows on the top room
        const a = (i / 16) * Math.PI * 2;
        const g = new THREE.Group(); g.rotation.y = a;
        box(g, 0.16, 3.0, 0.14, M.darkWood, 0, GY + 1.6, R1 + 0.28);
        if (i % 2) box(g, 0.75, 1.1, 0.12, M.window, 0, GY + 1.8, R1 + 0.27);
        tower.add(g);
    }
    // Mossy slate cone roof, dormer, finial, chimney.
    const roofY = GY + 3.1;
    const roof = new THREE.Mesh(faceShade(new THREE.ConeGeometry(R1 + 1.9, 8.5, 18, 6), [0x55603f, 0x4a5538, 0x636b4b, 0x5b5a4a, 0x6d7350], rng, 1), M.roof);
    roof.position.y = roofY + 4.25;
    tower.add(roof);
    const dormer = new THREE.Group();
    dormer.rotation.y = 0.5;
    box(dormer, 1.3, 1.3, 1.6, M.plaster, 0, roofY + 2.0, R1 + 0.1);
    box(dormer, 0.6, 0.75, 0.1, M.window, 0, roofY + 2.0, R1 + 0.92);
    const dr = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.0, 4).rotateY(Math.PI / 4), flat(0x4f5a3c));
    dr.position.set(0, roofY + 3.1, R1 + 0.15); dr.scale.set(1, 1, 1.4);
    dormer.add(dr);
    tower.add(dormer);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.4, 5), M.iron);
    fin.position.y = roofY + 9.1;
    tower.add(fin);
    const chimneyAt = new THREE.Vector3(-1.8, roofY + 3.9, -1.3);
    const chim = box(tower, 0.75, 3.2, 0.75, flat(0x6a6358), chimneyAt.x, chimneyAt.y, chimneyAt.z);
    box(tower, 0.95, 0.2, 0.95, M.trim, chimneyAt.x, chimneyAt.y + 1.65, chimneyAt.z);
    // The door: arch, planks, lanterns.
    const doorG = new THREE.Group();
    box(doorG, 1.5, 2.3, 0.3, flat(0x5a3a20), 0, 1.15, R0 - 0.05);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.3, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), flat(0x5a3a20));
    arch.position.set(0, 2.3, R0 - 0.05);
    arch.rotation.z = Math.PI / 2;
    doorG.add(arch);
    for (const dx of [-0.36, 0, 0.36]) box(doorG, 0.04, 2.2, 0.05, M.darkWood, dx, 1.1, R0 + 0.12);
    box(doorG, 2.1, 0.35, 0.6, M.trim, 0, 3.15, R0 + 0.05);
    for (const dx of [-0.95, 0.95]) {
        box(doorG, 0.35, 3.2, 0.5, M.trim, dx, 1.55, R0 + 0.05);
        box(doorG, 0.1, 0.1, 0.4, M.iron, dx * 1.25, 2.3, R0 + 0.35);
        box(doorG, 0.22, 0.32, 0.22, M.window, dx * 1.25, 2.05, R0 + 0.55);
    }
    for (let i = 0; i < 3; i++) box(doorG, 2.4 - i * 0.3, 0.22, 0.5, M.trim, 0, -0.08 - i * 0.2, R0 + 0.45 + i * 0.45);
    tower.add(doorG);
    // Ivy: dark-green leaf clusters climbing in streaks.
    const ivyPts = [];
    for (const [a0, top] of [[0.9, 11], [-1.1, 14], [2.2, 8], [-2.6, 12.5], [0.1, 6.5], [3.0, 15]]) {
        for (let i = 0; i < 70; i++) {
            const y = Math.pow(rng(), 1.4) * top;
            const a = a0 + (rng() - 0.5) * (0.5 - (y / top) * 0.3);
            if (Math.abs(a) < 0.25 && y < 3.4) continue;                 // keep the door clear
            const r = R0 + (R1 - R0) * (y / H) + 0.05;
            ivyPts.push([Math.sin(a) * r, y, Math.cos(a) * r, 0.18 + rng() * 0.22]);
        }
    }
    const ivy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M.ivy, ivyPts.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), col = new THREE.Color();
    ivyPts.forEach(([x, y, z, s], i) => {
        q.setFromEuler(new THREE.Euler(rng() * 3, rng() * 3, 0));
        ivy.setMatrixAt(i, m4.compose(v3.set(x, y, z), q, s3.set(s, s * 0.8, s)));
        ivy.setColorAt(i, col.setHSL(0.27 + rng() * 0.06, 0.45, 0.17 + rng() * 0.1));
    });
    tower.add(ivy);
    place(tower, 0, 0, TY, Math.PI);   // door (local +z) faces the start point
    addCollider({ ...W(0, 0), r: R0 + 0.05, kind: 'wall' }, 30);

    // Lantern light by the door and chimney smoke.
    const doorW = W(0, -R0 - 0.8);
    const lantern = new THREE.PointLight(0xffa850, 14, 12, 1.5);
    lantern.position.set(doorW.x, TY + 2.4, doorW.z);
    scene.add(lantern);
    const smoke = new Particles(220, { additive: false });
    scene.add(smoke.points);
    tower.updateMatrixWorld(true);
    const smokeAt = chimneyAt.clone().setY(chimneyAt.y + 1.8).applyMatrix4(tower.matrixWorld);
    animated.push((t, dt) => {
        if (rng() < dt * 9) smoke.emit({ x: smokeAt.x + (rng() - 0.5) * 0.3, y: smokeAt.y, z: smokeAt.z + (rng() - 0.5) * 0.3,
            vx: 0.35 + rng() * 0.2, vy: 0.9 + rng() * 0.4, vz: 0.1, drag: 0.25, life: 5 + rng() * 2,
            size: [0.6, 3.2], c0: [0.82, 0.82, 0.8, 0.5], c1: [0.7, 0.72, 0.72, 0] });
        smoke.update(dt);
        lantern.intensity = 14 * (1 + Math.sin(t * 7) * 0.06 + Math.sin(t * 17) * 0.04);
    });

    // ===== the cottage annex (left of the tower) =====
    const annex = new THREE.Group();
    const AW = 5.2, AD = 5.5, AH = 3.8;
    box(annex, AW, 1.6, AD, flat(0x857e70), 0, 0.8, 0);                              // stone footing
    box(annex, AW - 0.1, AH - 1.6, AD - 0.1, M.plaster, 0, 1.6 + (AH - 1.6) / 2, 0);  // plaster
    for (const x of [-AW / 2 + 0.05, 0, AW / 2 - 0.05]) box(annex, 0.16, AH - 1.6, AD + 0.02, M.darkWood, x, 1.6 + (AH - 1.6) / 2, 0);
    box(annex, AW + 0.02, 0.16, AD + 0.02, M.darkWood, 0, 1.62, 0);
    for (const z of [-AD / 2 - 0.02, AD / 2 + 0.02]) for (const x of [-1.2, 1.2]) box(annex, 0.16, AH - 1.6, 0.05, M.darkWood, x, 1.6 + (AH - 1.6) / 2, z);
    const roofGeo = new THREE.CylinderGeometry(0.01, 3.3, 3.2, 4, 1).rotateY(Math.PI / 4);
    const aroof = new THREE.Mesh(faceShade(roofGeo, [0x55603f, 0x4a5538, 0x636b4b], rng, 1), M.roof);
    aroof.scale.set(1.15, 1, 1.25);
    aroof.position.y = AH + 1.5;
    annex.add(aroof);
    for (const [x, y, z] of [[0, 2.6, -AD / 2 - 0.04], [AW / 2 + 0.04, 2.6, 0.6]]) {
        const w = box(annex, z ? 1.0 : 0.12, 0.9, z ? 0.12 : 1.0, M.window, x, y, z);
        if (z) box(annex, 0.06, 0.9, 0.14, M.darkWood, x, y, z); else box(annex, 0.14, 0.9, 0.06, M.darkWood, x, y, z);
        void w;
    }
    box(annex, 1.2, 0.9, 0.12, M.window, -1.0, 1.0, -AD / 2 - 0.04);   // a low lit window by the porch
    place(annex, ANNEX.u, ANNEX.v, TY, 0);
    for (const [du, dv] of [[-1.6, -1.8], [1.4, -1.8], [-1.6, 1.8], [1.4, 1.8], [0, 0]]) addCollider({ ...W(ANNEX.u + du, ANNEX.v + dv), r: 1.5, kind: 'wall' }, 6);

    // ===== the pavilion =====
    const pav = new THREE.Group();
    const PW = 4.2, PD = 3.2;
    for (const [x, z] of [[-PW / 2, -PD / 2], [PW / 2, -PD / 2], [-PW / 2, PD / 2], [PW / 2, PD / 2]]) box(pav, 0.22, 2.6, 0.22, M.wood, x, 1.3, z);
    box(pav, PW + 0.3, 0.2, 0.25, M.darkWood, 0, 2.6, -PD / 2);
    box(pav, PW + 0.3, 0.2, 0.25, M.darkWood, 0, 2.6, PD / 2);
    for (const s of [-1, 1]) box(pav, PW + 0.9, 0.12, 2.3, flat(0x5e5a3f), 0, 3.15, s * 0.95, 0, s * 0.55);
    box(pav, PW, 0.15, PD, M.wood, 0, 0.08, 0);
    // Shelves of jars and books at the back, a workbench in front.
    box(pav, PW - 0.6, 1.9, 0.4, M.darkWood, 0, 1.05, PD / 2 - 0.35);
    const jarColors = [0x6aa3c4, 0xc46a6a, 0x9ac46a, 0xe0c060, 0x8a6ac4, 0xd8d0bc];
    for (const sy of [0.55, 1.15, 1.75]) {
        box(pav, PW - 0.7, 0.05, 0.36, M.wood, 0, sy - 0.05, PD / 2 - 0.4);
        for (let x = -1.6; x < 1.6; x += 0.22 + rng() * 0.12) {
            const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2 + rng() * 0.12, 6), flat(jarColors[Math.floor(rng() * jarColors.length)], { roughness: 0.3 }));
            jar.position.set(x, sy + 0.1, PD / 2 - 0.42);
            pav.add(jar);
        }
    }
    box(pav, 2.4, 0.1, 0.9, M.wood, 0, 0.95, -0.3);
    for (const [x, z] of [[-1.1, -0.65], [1.1, -0.65], [-1.1, 0.05], [1.1, 0.05]]) box(pav, 0.09, 0.9, 0.09, M.darkWood, x, 0.47, z);
    box(pav, 0.5, 0.3, 0.35, flat(0x8a5a30), -0.6, 1.15, -0.3);                       // open chest
    box(pav, 0.45, 0.05, 0.32, flat(0xe8dcc0), 0.5, 1.02, -0.3, 0.2);                 // book
    const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI * 2, Math.PI * 0.35), M.iron);
    cauldron.position.set(1.6, 0.45, -1.0);
    pav.add(cauldron);
    place(pav, PAVILION.u, PAVILION.v, TY, 0.15);
    for (const [du, dv] of [[-2.1, -1.6], [2.1, -1.6], [-2.1, 1.6], [2.1, 1.6], [0, 1.2], [0, -0.3]]) addCollider({ ...W(PAVILION.u - du, PAVILION.v + dv), r: du === 0 ? 1.1 : 0.2, kind: 'wall' }, 3);

    // ===== stone stairs down from the door =====
    const steps = [];
    const n = 14;
    for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n;
        const u = STAIR.top[0] + (STAIR.bottom[0] - STAIR.top[0]) * k, v = STAIR.top[1] + (STAIR.bottom[1] - STAIR.top[1]) * k;
        const p = W(u, v);
        const y = heightAt(p.x, p.z);
        const g = new THREE.BoxGeometry(2.3 + rng() * 0.3, 0.9, 0.62).translate(0, y - 0.38, 0);
        g.rotateY(ang);
        g.translate(p.x, 0, p.z);
        steps.push(g);
    }
    const stairMesh = new THREE.Mesh(faceShade(mergeGeometries(steps), [0x9a9384, 0x8b8478, 0xa59d8c], rng, 12), flat(0xffffff, { vertexColors: true }));
    stairMesh.castShadow = stairMesh.receiveShadow = true;
    scene.add(stairMesh);

    // ===== the stone arch bridge =====
    const bridge = new THREE.Group();
    const A = W(...BRIDGE.a), B = W(...BRIDGE.b);
    const ya = heightAt(A.x, A.z), yb = heightAt(B.x, B.z);
    const L = Math.hypot(B.x - A.x, B.z - A.z);
    const segs = 9, deckMat = flat(0xffffff, { vertexColors: true });
    const pieces = [];
    for (let i = 0; i < segs; i++) {
        const t0 = i / segs, t1 = (i + 1) / segs, tm = (t0 + t1) / 2;
        const y0 = ya + (yb - ya) * t0 + BRIDGE.rise * (1 - (2 * t0 - 1) ** 2);
        const y1 = ya + (yb - ya) * t1 + BRIDGE.rise * (1 - (2 * t1 - 1) ** 2);
        const ym = (y0 + y1) / 2;
        const slope = Math.atan2(y1 - y0, L / segs);
        const deckP = new THREE.BoxGeometry(1.9, 0.45, L / segs + 0.06).rotateX(-slope).translate(0, ym - 0.05, (tm - 0.5) * L);
        pieces.push(deckP);
        for (const sx of [-0.95, 0.95]) pieces.push(new THREE.BoxGeometry(0.22, 0.55, L / segs + 0.06).rotateX(-slope).translate(sx, ym + 0.4, (tm - 0.5) * L));
    }
    // Arch ring under the deck.
    const arcR = L / 2 - 0.35;
    const ring = new THREE.TorusGeometry(arcR, 0.32, 4, 14, Math.PI).rotateY(Math.PI / 2);
    pieces.push(ring.translate(0, (ya + yb) / 2 + BRIDGE.rise - arcR - 0.25, 0));
    const bm = new THREE.Mesh(faceShade(mergeGeometries(pieces.map(g => g.index ? g.toNonIndexed() : g)), [0x8b8478, 0x7d776c, 0x948d80], rng, 6), deckMat);
    bridge.add(bm);
    bridge.position.set((A.x + B.x) / 2, 0, (A.z + B.z) / 2);
    bridge.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
    bm.castShadow = bm.receiveShadow = true;
    scene.add(bridge);

    // ===== water: pool, stream, two-tier falls, mist =====
    const flowMat = (alpha, speed, tint = [0.75, 0.88, 0.95]) => new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { uT: { value: 0 }, uA: { value: alpha }, uS: { value: speed }, uC: { value: new THREE.Vector3(...tint) } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec2 vUv; uniform float uT, uA, uS; uniform vec3 uC;
            float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
                return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
            void main(){
                vec2 p = vec2(vUv.x * 6.0, vUv.y * 3.0 + uT * uS);
                float s = n(p * vec2(2.0, 1.0)) * 0.6 + n(p * vec2(5.0, 2.0)) * 0.4;
                float streak = smoothstep(0.35, 0.85, s);
                vec3 c = mix(uC * 0.55, vec3(1.0), streak);
                float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
                gl_FragColor = vec4(c, (uA * (0.55 + streak * 0.45)) * edge);
            }`,
    });
    const flows = [];
    const fall = (u, v, w, yTop, yBot, speed) => {
        const mat = flowMat(0.92, speed);
        const geo = new THREE.PlaneGeometry(w, yTop - yBot, 1, 6);
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) { const k = (pos.getY(i) + (yTop - yBot) / 2) / (yTop - yBot); pos.setZ(i, -Math.pow(1 - k, 2) * 0.6 + k * 0.4); }
        const m = new THREE.Mesh(geo, mat);
        const p = W(u, v);
        m.position.set(p.x, (yTop + yBot) / 2, p.z);
        m.rotation.y = ang + Math.PI;
        scene.add(m);
        flows.push(mat);
        return m;
    };
    fall(13.7, LEDGE.v1 + 0.2, 2.6, 22.5, LEDGE.y - 0.2, 1.6);         // upper falls off the cliff
    fall(12.4, LEDGE.v0 + 0.15, 2.2, LEDGE.y + 0.1, POOL.y - 0.3, 1.9); // lower cascades
    fall(15.6, LEDGE.v0 + 0.15, 1.3, LEDGE.y + 0.1, POOL.y - 0.3, 2.2);
    fall(10.4, LEDGE.v0 + 0.2, 0.6, LEDGE.y - 0.4, POOL.y - 0.3, 2.4);
    // Ledge water sheet.
    const ledgeWater = new THREE.Mesh(new THREE.PlaneGeometry(LEDGE.u1 - LEDGE.u0 - 1.2, LEDGE.v1 - LEDGE.v0).rotateX(-Math.PI / 2), flowMat(0.75, 0.8));
    const lw = W((LEDGE.u0 + LEDGE.u1) / 2, (LEDGE.v0 + LEDGE.v1) / 2);
    ledgeWater.position.set(lw.x, LEDGE.y + 0.12, lw.z);
    ledgeWater.rotation.y = ang;
    scene.add(ledgeWater);
    flows.push(ledgeWater.material);
    // Pool.
    const pool = new THREE.Mesh(new THREE.CircleGeometry(POOL.r + 0.9, 28).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x2d6a78, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.2 }));
    const pw = W(POOL.u, POOL.v);
    pool.position.set(pw.x, POOL.y, pw.z);
    scene.add(pool);
    // Stream ribbon following the bed, flowing toward the lake.
    const ribbon = [];
    const SAMPLES = 40;
    const pts = [];
    for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES, f = t * (STREAM.length - 1), k = Math.min(STREAM.length - 2, Math.floor(f)), r = f - k;
        pts.push([STREAM[k][0] + (STREAM[k + 1][0] - STREAM[k][0]) * r, STREAM[k][1] + (STREAM[k + 1][1] - STREAM[k][1]) * r, streamWater(t)]);
    }
    const posArr = [], uvArr = [], idx = [];
    pts.forEach(([u, v, y], i) => {
        const [nu, nv] = pts[Math.min(i + 1, SAMPLES)], [pu, pv] = pts[Math.max(i - 1, 0)];
        let du = nu - pu, dv = nv - pv; const l = Math.hypot(du, dv); du /= l; dv /= l;
        const half = 1.7;
        for (const s of [-1, 1]) {
            const p = W(u + -dv * half * s, v + du * half * s);
            posArr.push(p.x, y + 0.02, p.z);
            uvArr.push(s < 0 ? 0 : 1, -i / 4);
        }
        if (i < SAMPLES) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    });
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    rg.setIndex(idx);
    const streamMat = flowMat(0.8, 1.2, [0.35, 0.6, 0.7]);
    scene.add(new THREE.Mesh(rg, streamMat));
    flows.push(streamMat);
    // River stones.
    const stones = [];
    for (let i = 0; i < 40; i++) {
        const t = rng(), f = t * (STREAM.length - 1), k = Math.min(STREAM.length - 2, Math.floor(f)), r = f - k;
        const u = STREAM[k][0] + (STREAM[k + 1][0] - STREAM[k][0]) * r + (rng() - 0.5) * 4.5;
        const v = STREAM[k][1] + (STREAM[k + 1][1] - STREAM[k][1]) * r + (rng() - 0.5) * 2;
        const p = W(u, v), s = 0.2 + rng() * 0.45;
        stones.push(new THREE.DodecahedronGeometry(s, 0).scale(1.3, 0.6, 1).translate(p.x, heightAt(p.x, p.z) + s * 0.2, p.z));
    }
    const stoneMesh = new THREE.Mesh(faceShade(mergeGeometries(stones), [0x7a776e, 0x6a6a62, 0x858077, 0x5e6a52], rng, 4), flat(0xffffff, { vertexColors: true }));
    stoneMesh.castShadow = stoneMesh.receiveShadow = true;
    scene.add(stoneMesh);
    // Mist at the foot of each fall.
    const mist = new Particles(500, { additive: false });
    scene.add(mist.points);
    const mistAt = [[13.5, LEDGE.v1 - 0.3, LEDGE.y + 0.3, 2.5], [12.8, LEDGE.v0 - 1.2, POOL.y + 0.2, 3.5]];
    animated.push((t, dt) => {
        for (const m of flows) m.uniforms.uT.value = t;
        for (const [u, v, y, w] of mistAt) {
            if (rng() < dt * 30) {
                const p = W(u + (rng() - 0.5) * w, v + (rng() - 0.5) * 1.5);
                mist.emit({ x: p.x, y, z: p.z, vx: (rng() - 0.5) * 1.2, vy: 0.6 + rng() * 0.8, vz: (rng() - 0.5) * 1.2, drag: 0.8,
                    life: 2 + rng() * 1.5, size: [0.8, 2.8], c0: [0.92, 0.95, 0.97, 0.32], c1: [0.9, 0.93, 0.95, 0] });
            }
        }
        mist.update(dt);
    });

    // ===== mossy boulders, lupins =====
    const boulders = [];
    for (let i = 0; i < 26; i++) {
        const a = rng() * Math.PI * 2, d = 9 + rng() * 14;
        const u = Math.cos(a) * d, v = Math.sin(a) * d * 0.7 - 2;
        const p = W(u, v);
        if (valeReserved(p.x, p.z, -1.5) || v > 10) continue;
        const s = 0.6 + rng() * 1.1;
        const y = heightAt(p.x, p.z);
        boulders.push(new THREE.DodecahedronGeometry(s, 1).scale(1.2, 0.8, 1).translate(p.x, y + s * 0.3, p.z));
        addCollider({ x: p.x, z: p.z, r: s * 1.05, kind: s < 0.75 ? 'hop' : 'wall' }, s * 1.2);
    }
    if (boulders.length) {
        const bm2 = new THREE.Mesh(faceShade(mergeGeometries(boulders), [0x5f6b4a, 0x6d7262, 0x7a776e, 0x56603f], rng, 2), flat(0xffffff, { vertexColors: true }));
        bm2.castShadow = bm2.receiveShadow = true;
        scene.add(bm2);
    }
    const lupinPts = [];
    for (let i = 0; i < 1400 && lupinPts.length < 260; i++) {
        const u = -20 + rng() * 34, v = -14 + rng() * 16;
        const p = W(u, v);
        const y = heightAt(p.x, p.z);
        if (y < -0.6 || inStream(p.x, p.z)) continue;
        if (u > -15 && u < 7.5 && v > -6 && v < 8) continue;          // not on the plateau
        if (segDist(u, v, PATH2).d < 1.3 || segDist(u, v, [STAIR.top, STAIR.bottom]).d < 1.5) continue;
        lupinPts.push([p.x, y, p.z]);
    }
    const lupins = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.6, 5).translate(0, 0.45, 0), flat(0xffffff), lupinPts.length);
    lupinPts.forEach(([x, y, z], i) => {
        lupins.setMatrixAt(i, m4.compose(v3.set(x, y, z), q.identity(), s3.setScalar(0.7 + rng() * 0.7)));
        lupins.setColorAt(i, col.setHSL(0.72 + rng() * 0.08, 0.5, 0.5 + rng() * 0.15));
    });
    scene.add(lupins);

    // ===== light shafts and fireflies (mood) =====
    const shaftTex = radialTexture([[0, 'rgba(255,245,220,0.9)'], [0.6, 'rgba(255,240,210,0.25)'], [1, 'rgba(255,240,210,0)']]);
    const shafts = [];
    for (let i = 0; i < 6; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(3 + rng() * 2.5, 34), new THREE.MeshBasicMaterial({
            map: shaftTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
        }));
        const p = W(-6 + i * 4.5 + rng() * 2, 2 + rng() * 8);
        m.position.set(p.x, TY + 14, p.z);
        m.rotation.set(0, ang + 0.4 + rng() * 0.3, -0.45);
        scene.add(m);
        shafts.push({ m, phase: rng() * 6 });
    }
    const flies = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({
        color: 0xffd98a, size: 0.09, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    const FN = 90;
    const flySeed = Array.from({ length: FN }, () => [-16 + rng() * 26, -12 + rng() * 18, rng() * 6, rng() * 2.5]);
    flies.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FN * 3), 3));
    scene.add(flies);
    animated.push(t => {
        const arr = flies.geometry.attributes.position.array;
        flySeed.forEach(([u, v, ph, hy], i) => {
            const p = W(u + Math.sin(t * 0.3 + ph) * 1.5, v + Math.cos(t * 0.25 + ph * 1.3) * 1.5);
            arr.set([p.x, heightAt(p.x, p.z) + 0.5 + hy + Math.sin(t * 0.8 + ph) * 0.4, p.z], i * 3);
        });
        flies.geometry.attributes.position.needsUpdate = true;
    });

    // ===== doors & trees for the vale =====
    const doorOut = W(0, -R0 - 0.7);
    const spawnOut = W(-0.6, -R0 - 3.2);

    return {
        doorOut, spawnOut, facingOut: Math.atan2(-F.x, -F.y),
        // 0 far away → 1 in the vale: darker, mistier, shafts of light, fireflies.
        mood: (px, pz) => smoothstep(52, 22, Math.hypot(px - T.x, pz - T.z)),
        update(t, dt, moodK) {
            for (const fn of animated) fn(t, dt);
            for (const s of shafts) s.m.material.opacity = moodK * (0.07 + Math.sin(t * 0.4 + s.phase) * 0.03);
            flies.material.opacity = moodK * (0.6 + Math.sin(t * 3) * 0.3);
        },
    };
}
