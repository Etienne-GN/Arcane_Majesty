// Thaloria, the scholar-city (docs/3d/THALORIA_CITY.md, stage T2): built from the plan (content/world/thaloria_plan.json,
// made by data/scripts/thaloria_plan.py). Stone and slate: grey stone ground floors, timber-framed upper floors jutting
// over the street, steep blue-grey slate roofs (warm tile here and there outside the scholars' quarter), chimneys,
// windows lit at dusk. The hill (8 m at the lowest gate to 36 m at the college's crown); the ramps of the gate roads;
// the wall ring with its towers and gatehouses; the college (library hall and cloister), the crooked bell tower, the
// temple, the market hall, the guild hall, the manor, the barracks, the inn; the gorge on the north with the high bridge
// from the North Gate straight across to the Citadel's plateau. Everything merged per material (a phone carries it).
// Local metres (x east, z south), the same frame as the plan; the map interface the open world's stamps expect.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import PLAN from './world/thaloria_plan.json';
import { flat, colliderAt, pushOut, mulberry32 } from '../engine/lib.js';
import { treeKinds } from './models/flora.js';
import { createOutdoorShell } from '../engine/outdoor.js';
import { createTownsfolk, lookFor } from './actors/townsfolk.js';
import { createCharacter } from './models/character.js';
import { INTERIOR_IDS } from './thaloria.js';
import DOORS from '../../../../packages/rules/src/data/maps/interiors/doors.json';
import { thaloriaMap, bounties as BOUNTIES } from '@rules';

const CROWN = PLAN.crown, KNOLL = [-100, 62];
const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
function vnoise(x, z) {   // the plan's value noise (thaloria_plan.py _n), so the ground matches the plan
    const h = (i, j) => { const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - Math.floor(v); };
    const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    return (h(i, j) * (1 - ux) + h(i + 1, j) * ux) * (1 - uz) + (h(i, j + 1) * (1 - ux) + h(i + 1, j + 1) * ux) * uz;
}
// The hill (thaloria_plan.py ground()).
export function cityGround(x, z) {
    const d = Math.hypot(x - CROWN[0], (z - CROWN[1]) * 0.8);
    let h = PLAN.hill.h * Math.max(0, 1 - Math.pow(d / PLAN.hill.r, 1.35));
    h += 9 * Math.exp(-((x - KNOLL[0]) ** 2 + (z - KNOLL[1]) ** 2) / 45 ** 2);
    h -= 5 * Math.exp(-((x + 50) ** 2 / 30 ** 2 + (z - 60) ** 2 / 55 ** 2));
    h += 3.5 * Math.exp(-((x - CROWN[0]) ** 2 + (z - CROWN[1]) ** 2) / 26 ** 2);
    h += (vnoise(x * 0.035, z * 0.035) - 0.5) * 3.0;
    h -= Math.max(0, (x - 60) * 0.03) + Math.max(0, (z - 150) * 0.05);
    return h + 2.0;
}

// ---------- streets: a grid of segments for fast lookups ----------
const SEGS = [];   // { ax, az, bx, bz, w, kind, ha, hb (bed heights or null), stair }
PLAN.streets.forEach(s => { const p = s.pts; for (let i = 0; i < p.length - 1; i++) SEGS.push({ ax: p[i][0], az: p[i][1], bx: p[i + 1][0], bz: p[i + 1][1], w: s.w, kind: s.kind, ha: s.bed ? s.bed[i] : null, hb: s.bed ? s.bed[i + 1] : null, stair: s.stairs?.includes(i) }); });
const SG = new Map(), SC = 10;
SEGS.forEach((s, i) => { const x0 = Math.floor((Math.min(s.ax, s.bx) - 8) / SC), x1 = Math.floor((Math.max(s.ax, s.bx) + 8) / SC), z0 = Math.floor((Math.min(s.az, s.bz) - 8) / SC), z1 = Math.floor((Math.max(s.az, s.bz) + 8) / SC); for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const k = a + ',' + b; (SG.get(k) ?? SG.set(k, []).get(k)).push(i); } });
function nearestSeg(x, z) {
    let best = null;
    for (const i of SG.get(Math.floor(x / SC) + ',' + Math.floor(z / SC)) ?? []) {
        const s = SEGS[i], dx = s.bx - s.ax, dz = s.bz - s.az, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / L2));
        const d = Math.hypot(x - s.ax - dx * t, z - s.az - dz * t) - s.w / 2;
        if (!best || d < best.d) best = { d, s, t };
    }
    return best;
}
const ringR = (() => {   // the wall's distance from the ring's middle by angle (from the plan's polygon)
    const C = [0, 95], W = PLAN.wall.map(([x, z]) => [Math.atan2(z - C[1], x - C[0]), Math.hypot(x - C[0], z - C[1])]).sort((a, b) => a[0] - b[0]);
    return (x, z) => { const a = Math.atan2(z - C[1], x - C[0]); let i = W.findIndex(w => w[0] > a); if (i <= 0) i = W.length - 1 + (i === 0 ? 1 : 0); const A = W[(i - 1 + W.length) % W.length], B = W[i % W.length]; const t = Math.max(0, Math.min(1, (a - A[0]) / ((B[0] - A[0]) || 1))); return { r: A[1] + (B[1] - A[1]) * t, d: Math.hypot(x - C[0], z - C[1]) }; };
})();
const insideWall = (x, z, m = 0) => { const w = ringR(x, z); return w.d < w.r - m; };

// The gorge on the north: the hill breaks off in a cliff to the river, the far side rises as the Citadel's cliff to
// its plateau (28 m above the city's base); the North Gate's bridge spans it.
const NORTH = -48, RIVER = -6, CIT_H = 34, GW = 72, BRIDGE_X = PLAN.gates.north.x;   // GW: the gorge's width (the cover's wide river between the cliffs)
function gorge(x, z, h) {
    const gN = NORTH - z;   // metres north of the wall's line
    if (gN <= -2) return h;
    const fall = sm(-2, 6, gN), rise = sm(GW - 8, GW, gN);
    let g = h * (1 - fall) + RIVER * fall;
    g = g * (1 - rise) + (CIT_H + 1.5 * vnoise(x * 0.08, 3)) * rise;
    return g;
}
const BRIDGE = { x: BRIDGE_X, z0: NORTH + 2, z1: NORTH - GW - 2, h: cityGround(BRIDGE_X, NORTH + 6) };

export function createThaloriaCity({ quality }) {
    const scene = new THREE.Scene();
    const shell = createOutdoorShell(scene, { quality, mood: { fog: '#c4ccd2', fogNear: 90, fogFar: 520, fogMix: 0.5 } });
    const rng = mulberry32(1100);
    const colliders = [];
    const wallSeg = (ax, az, bx, bz, y0, y1, r = 0.35) => colliders.push({ ax, az, bx, bz, r, kind: 'wall', y0, y1 });
    const boxColl = (x, z, w, d, a, y0, y1) => { const q = corners(x, z, w, d, a); for (let i = 0; i < 4; i++) wallSeg(q[i][0], q[i][1], q[(i + 1) % 4][0], q[(i + 1) % 4][1], y0, y1); };

    // ---------- the ground: the hill, streets graded to their beds, house pads, the gorge ----------
    const X0 = -190, X1 = 190, Z0 = -80 - 48, Z1 = 262, STEP = 2.5, NX = Math.round((X1 - X0) / STEP), NZ = Math.round((Z1 - Z0) / STEP);
    const pads = [];   // house floors: { x, z, w, d, a, h }
    for (const p of PLAN.plots) p.h = cityGround(p.x + Math.cos(p.a) * p.d / 2, p.z + Math.sin(p.a) * p.d / 2);   // its floor: the ground at its door
    const HF = new Float32Array((NX + 1) * (NZ + 1)), KIND = new Uint8Array((NX + 1) * (NZ + 1));   // kind: 0 yard, 1 street, 2 square, 3 stone (under buildings)
    const raw = (x, z) => {
        let h = cityGround(x, z), kind = 0;
        const n = nearestSeg(x, z);
        if (n && n.d < 4) {
            if (n.s.ha != null) { const bed = n.s.ha + (n.s.hb - n.s.ha) * n.t; h = h + (bed - h) * (1 - sm(0, 4, n.d)); }   // a ramp: cut and filled
            if (n.d < 0.2) kind = 1;
        }
        for (const q of PLAN.squares) { const d = Math.hypot(x - q.x, z - q.z); if (d < q.r) { kind = 2; h = h + (cityGround(q.x, q.z) - h) * sm(q.r, q.r * 0.5, d); } }
        if (Math.abs(x - BRIDGE.x) < 2.6 && z < BRIDGE.z0 && z > BRIDGE.z1) return { h: BRIDGE.h, kind: 3 };
        return { h: gorge(x, z, h), kind };
    };
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const r = raw(X0 + i * STEP, Z0 + j * STEP); HF[j * (NX + 1) + i] = r.h; KIND[j * (NX + 1) + i] = r.kind; }
    function heightAt(x, z) {
        const fx = (x - X0) / STEP, fz = (z - Z0) / STEP;
        if (fx < 0 || fz < 0 || fx >= NX || fz >= NZ) return gorge(x, z, cityGround(x, z));
        const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * (NX + 1) + i;
        let h = (HF[k] * (1 - u) + HF[k + 1] * u) * (1 - v) + (HF[k + NX + 1] * (1 - u) + HF[k + NX + 2] * u) * v;
        const pc = padGrid.get(Math.floor(x / 16) + ',' + Math.floor(z / 16));   // inside a building: its floor (its own cell is enough — pads are small)
        if (pc) for (const p of pc) if (inQuad(p.q, x, z)) { h = p.h; break; }
        return h;
    }
    // the ground mesh, coloured: cobbles in the streets, paving on the squares, earth and grass in the yards
    {
        const geo = new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, NX, NZ).rotateX(-Math.PI / 2).translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
        const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
        const GRASS = new THREE.Color('#5e7a3e'), YARD = new THREE.Color('#6a6a48'), COB = new THREE.Color('#7e7a74'), PAVE = new THREE.Color('#9a958c'), ROCK = new THREE.Color('#6e6a64'), RIVERBANK = new THREE.Color('#5a554e');
        for (let k = 0; k < pos.count; k++) {
            const i = k % (NX + 1), j = Math.floor(k / (NX + 1)), x = X0 + i * STEP, z = Z0 + j * STEP, h = HF[k];
            pos.setY(k, h);
            const kind = KIND[k], n = vnoise(x * 0.4, z * 0.4);
            if (kind === 1 || kind === 3) c.copy(COB).multiplyScalar(0.9 + n * 0.2);
            else if (kind === 2) c.copy(PAVE).multiplyScalar(0.92 + ((Math.floor(x) + Math.floor(z)) % 2) * 0.06);
            else if (z < NORTH - 1) c.copy(h < RIVER + 2 ? RIVERBANK : ROCK).multiplyScalar(0.85 + n * 0.25);
            else if (insideWall(x, z, 2)) c.copy(YARD).lerp(GRASS, n);
            else c.copy(GRASS).multiplyScalar(0.9 + n * 0.2);
            col.set([c.r, c.g, c.b], k * 3);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
        const ground = new THREE.Mesh(geo, flat(0xffffff, { vertexColors: true })); ground.receiveShadow = true; ground.userData.ground = true; scene.add(ground);
    }

    // ---------- buildings: merged per material ----------
    const parts = { stone: [], ashlar: [], plaster: [], timber: [], slate: [], tile: [], window: [], door: [], dark: [], lead: [], wood: [], awningR: [], awningB: [], awningY: [], lamp: [], banner: [] };
    const tmpM = new THREE.Matrix4(), q4 = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), pv = new THREE.Vector3();
    // a box in a building's frame: (lx along its front, ly up, lz into it from its front) → world
    function box(list, B, lx, ly, lz, w, h, d, extraRy = 0) {
        const g = new THREE.BoxGeometry(w, h, d);
        const fx = Math.cos(B.a), fz = Math.sin(B.a), rx = -fz, rz = fx;   // front normal (outward = toward the street) and along-front
        const cx = B.x + rx * lx - fx * (lz - B.d / 2), cz = B.z + rz * lx - fz * (lz - B.d / 2);
        q4.setFromAxisAngle(Y, -B.a + Math.PI / 2 + extraRy);
        tmpM.compose(pv.set(cx, B.h + ly + h / 2, cz), q4, sc.set(1, 1, 1));
        g.applyMatrix4(tmpM); list.push(g);
    }
    function gableRoof(list, B, lx, ly, lz, w, d, rise, alongFront) {   // a ridge roof as a prism: ridge along the front (alongFront) or into the plot
        const g = new THREE.BufferGeometry(), hw = (alongFront ? d : w) / 2 + 0.35, hl = (alongFront ? w : d) / 2 + 0.3;
        const v = [-hw, 0, -hl, hw, 0, -hl, 0, rise, -hl, -hw, 0, hl, hw, 0, hl, 0, rise, hl];
        const idx = [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3];
        g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setIndex(idx); const ng = g.toNonIndexed(); ng.computeVertexNormals();
        const fx = Math.cos(B.a), fz = Math.sin(B.a), rx = -fz, rz = fx;
        const cx = B.x + rx * lx - fx * (lz - B.d / 2), cz = B.z + rz * lx - fz * (lz - B.d / 2);
        q4.setFromAxisAngle(Y, -B.a + Math.PI / 2 + (alongFront ? Math.PI / 2 : 0));
        tmpM.compose(pv.set(cx, B.h + ly, cz), q4, sc.set(1, 1, 1)); ng.applyMatrix4(tmpM); list.push(ng);
    }
    const padList = [];
    function footprint(B) { const q = corners(B.x, B.z, B.w, B.d, B.a); padList.push({ q, h: B.h, x: B.x, z: B.z, r: Math.hypot(B.w, B.d) / 2 }); boxColl(B.x, B.z, B.w, B.d, B.a, B.h - 0.5, B.h + 40); return q; }
    // the plinth: stone down to the lowest ground under it (the hill steps under the houses)
    function plinth(B) { let lo = B.h; for (const [x, z] of corners(B.x, B.z, B.w, B.d, B.a)) lo = Math.min(lo, cityGround(x, z)); if (B.h - lo > 0.2) box(parts.stone, { ...B, h: lo - 0.3 }, 0, 0, B.d / 2, B.w, B.h - lo + 0.3, B.d); }
    let lit = 0; const chimneys = [];
    for (const P of PLAN.plots) {
        const B = { x: P.x, z: P.z, w: P.w - 0.05, d: P.d, a: P.a, h: P.h };
        footprint(B); plinth(B);
        const scholars = P.quarter === 'scholars', storeys = P.storeys, FH = 2.9;
        // ground floor: stone; upper floors: stone in the scholars' quarter, else timber-framed plaster jutting 0.35 m a floor
        box(parts.stone, B, 0, 0, B.d / 2, B.w, FH, B.d);
        for (let s = 1; s < storeys; s++) {
            const jut = scholars ? 0 : 0.35 * s;
            box(scholars ? parts.ashlar : parts.plaster, B, 0, s * FH, (B.d + jut) / 2 - jut, B.w, FH, B.d + jut);
            if (!scholars) {   // the timber frame on the front: a sill beam, posts at the corners and the middle, a brace
                box(parts.timber, B, 0, s * FH, -jut - 0.04, B.w, 0.18, 0.12);
                for (const px of [-B.w / 2 + 0.1, 0, B.w / 2 - 0.1]) box(parts.timber, B, px, s * FH, -jut - 0.04, 0.16, FH, 0.12);
            }
        }
        // windows: two or three a floor (the upper ones lit at dusk), a door at the street
        const top = storeys * FH, jutTop = scholars ? 0 : 0.35 * (storeys - 1);
        for (let s = 0; s < storeys; s++) {
            const jut = scholars || s === 0 ? 0 : 0.35 * s, n = B.w > 6.8 ? 3 : 2;
            for (let k = 0; k < n; k++) { const lx = (k - (n - 1) / 2) * (B.w / n); if (s === 0 && Math.abs(lx) < 0.9) continue; box(s > 0 && (lit++ % 3 === 0) ? parts.window : parts.dark, B, lx, s * FH + 0.95, -jut - 0.06, 0.8, 1.15, 0.1); }
        }
        box(parts.door, B, 0, 0, -0.06, 1.1, 2.1, 0.12);
        // the roof: steep, its ridge along the street or a gable facing it; a chimney
        const alongFront = P.w > 6.8 || rng() < 0.5, rise = (alongFront ? B.d + jutTop : B.w) * 0.62;
        gableRoof(!scholars && rng() < 0.2 ? parts.tile : parts.slate, B, 0, top, (B.d - jutTop) / 2 - jutTop / 2, B.w, B.d + jutTop, rise, alongFront);
        { const lx = (rng() - 0.5) * B.w * 0.6, lz = B.d * (0.3 + rng() * 0.4), ch = rise * 0.8 + 0.8;
          box(parts.stone, B, lx, top + rise * 0.5, lz, 0.7, ch, 0.7);
          const fx = Math.cos(B.a), fz = Math.sin(B.a); chimneys.push([B.x - fz * lx - fx * (lz - B.d / 2), B.h + top + rise * 0.5 + ch, B.z + fx * lx - fz * (lz - B.d / 2)]); }
    }
    const padGrid = new Map();
    padList.forEach(p => { const k = Math.floor(p.x / 16) + ',' + Math.floor(p.z / 16); (padGrid.get(k) ?? padGrid.set(k, []).get(k)).push(p); });
    function padsNear(x, z) { const out = []; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const p of padGrid.get((Math.floor(x / 16) + a) + ',' + (Math.floor(z / 16) + b)) ?? []) if (Math.abs(p.x - x) < p.r && Math.abs(p.z - z) < p.r) out.push(p); return out; }

    // ---------- landmarks ----------
    const L = Object.fromEntries(PLAN.landmarks.map(l => [l.id, l]));
    const LB = l => ({ x: l.x, z: l.z, w: l.w, d: l.d, a: l.a, h: cityGround(l.x, l.z) });
    // the college: the library hall (long, tall windows, buttresses) on the front; three ranges round a cloister behind
    { const B = LB(L.college); footprint(B); plinth(B);
      box(parts.ashlar, B, 0, 0, 7, B.w, 13, 14);   // the library hall
      for (let k = -4; k <= 4; k++) { box(parts.window, B, k * 6.4, 3.5, -0.06, 2.2, 7, 0.1); box(parts.stone, B, k * 6.4 + 3.2, 0, -0.5, 1, 11, 1.2); }
      gableRoof(parts.slate, B, 0, 13, 7, B.w, 14, 9, true);
      for (const [lx, lz, w, d] of [[-B.w / 2 + 5, 14 + 17, 10, 34], [B.w / 2 - 5, 14 + 17, 10, 34], [0, B.d - 5, B.w, 10]]) { box(parts.ashlar, B, lx, 0, lz, w, 8.5, d); gableRoof(parts.slate, B, lx, 8.5, lz, w, d, 5, w > d); }
      for (let k = -3; k <= 3; k++) box(parts.stone, B, k * 5.4, 0, 14.8, 0.9, 3.4, 0.9);   // the cloister's arcade
      box(parts.ashlar, B, B.w / 2 - 4, 0, 4, 8, 22, 8); box(parts.slate, B, B.w / 2 - 4, 22, 4, 0.1, 0.1, 0.1);   // a corner tower
      cone(parts.slate, B, B.w / 2 - 4, 22, 4, 5.5, 9, 4); }
    // the bell tower: tall, square, a little out of true (it never struck its hour correctly)
    { const B = LB(L.bell_tower); footprint(B); plinth(B);
      box(parts.ashlar, B, 0, 0, 4, 8, 30, 8, 0.03); for (const s of [12, 20, 26]) box(parts.dark, B, 0, s, -0.06, 1.6, 2.6, 0.1);
      cone(parts.slate, B, 0, 30, 4, 6.4, 11, 4); }
    // the temple: a nave and a tower with a spire at the square's end
    { const B = LB(L.temple); footprint(B); plinth(B);
      box(parts.ashlar, B, 0, 0, B.d / 2, B.w, 12, B.d); gableRoof(parts.slate, B, 0, 12, B.d / 2, B.w, B.d, 8, false);
      for (let k = 0; k < 5; k++) box(parts.window, B, -B.w / 2 - 0.06, 4, 6 + k * 6, 0.1, 5, 1.6);
      box(parts.ashlar, B, 0, 0, 3, 8, 26, 8); cone(parts.slate, B, 0, 26, 3, 6, 14, 4); box(parts.door, B, 0, 0, -0.06, 2.4, 4, 0.14); }
    // the market hall: open arcades below, the hall above
    { const B = LB(L.market_hall); footprint(B);
      for (let k = -3; k <= 3; k++) for (const lz of [0.5, B.d - 0.5]) box(parts.stone, B, k * (B.w / 7), 0, lz, 0.9, 3.4, 0.9);
      box(parts.plaster, B, 0, 3.4, B.d / 2, B.w, 4, B.d); gableRoof(parts.tile, B, 0, 7.4, B.d / 2, B.w, B.d, 6, true); box(parts.door, B, 0, 0, B.d / 2, 1.4, 2.4, 1.4); }
    // the guild hall, the manor, the barracks, the inn: big houses of their kind
    for (const [id, mat, fl, roof] of [['guild_hall', parts.ashlar, 3, parts.slate], ['manor', parts.ashlar, 3, parts.slate], ['barracks', parts.stone, 2, parts.slate], ['inn', parts.plaster, 3, parts.tile]]) {
        const B = LB(L[id]); footprint(B); plinth(B);
        box(parts.stone, B, 0, 0, B.d / 2, B.w, 3.2, B.d); box(mat, B, 0, 3.2, B.d / 2, B.w, (fl - 1) * 3, B.d);
        for (let s = 0; s < fl; s++) for (let k = -2; k <= 2; k++) box(s && k % 2 ? parts.window : parts.dark, B, k * B.w / 5.5, s * 3 + 1, -0.06, 1, 1.3, 0.1);
        gableRoof(roof, B, 0, fl * 3 + 0.2, B.d / 2, B.w, B.d, B.d * 0.55, true); box(parts.door, B, 0, 0, -0.06, 1.6, 2.6, 0.14);
    }
    function cone(list, B, lx, ly, lz, r, h, seg) {
        const g = new THREE.ConeGeometry(r, h, seg).rotateY(Math.PI / 4);
        const fx = Math.cos(B.a), fz = Math.sin(B.a), rx = -fz, rz = fx;
        g.translate(B.x + rx * lx - fx * (lz - B.d / 2), B.h + ly + h / 2, B.z + rz * lx - fz * (lz - B.d / 2)); list.push(g);
    }

    // ---------- the wall, its towers and gatehouses ----------
    const WH = 8.5, gateNear = (x, z) => Object.values(PLAN.gates).some(g => Math.hypot(g.x - x, g.z - z) < 6);
    const wall = PLAN.wall;
    for (let i = 0; i < wall.length; i++) {
        const [ax, az] = wall[i], [bx, bz] = wall[(i + 1) % wall.length], mx = (ax + bx) / 2, mz = (az + bz) / 2;
        if (gateNear(mx, mz)) continue;
        const L2 = Math.hypot(bx - ax, bz - az), h = Math.min(cityGround(ax, az), cityGround(bx, bz), mz < NORTH + 4 ? 99 : 99) - 1.5;
        const B = { x: mx, z: mz, w: L2 + 0.3, d: 2.4, a: Math.atan2(bz - az, bx - ax) - Math.PI / 2, h };
        box(parts.stone, B, 0, 0, 1.2, B.w, WH + 1.5, 2.4);
        for (let k = 0; k < Math.floor(L2 / 1.6); k++) box(parts.stone, B, -L2 / 2 + 0.8 + k * 1.6, WH + 1.5, 0.3, 0.8, 1, 0.6);   // the merlons
        wallSeg(ax, az, bx, bz, h - 1, h + WH + 3, 1.2);
    }
    for (const [tx, tz] of PLAN.towers) {
        const h = cityGround(tx, tz) - 1.5, g = new THREE.CylinderGeometry(4, 4.4, WH + 6, 10).translate(tx, h + (WH + 6) / 2, tz); parts.stone.push(g);
        parts.slate.push(new THREE.ConeGeometry(4.8, 6, 10).translate(tx, h + WH + 9, tz));
        colliders.push({ x: tx, z: tz, r: 4.2, kind: 'wall', y0: h - 1, y1: h + WH + 12 });
    }
    for (const [k, gt] of Object.entries(PLAN.gates)) {   // a gatehouse: two round towers and the arch's lintel between them
        const a = gt.a, tx = -Math.sin(a), tz = Math.cos(a), h = cityGround(gt.x, gt.z) - 1;
        for (const s of [-1, 1]) { const x = gt.x + tx * 5.2 * s, z = gt.z + tz * 5.2 * s; parts.stone.push(new THREE.CylinderGeometry(3.4, 3.8, WH + 8, 10).translate(x, h + (WH + 8) / 2, z)); parts.slate.push(new THREE.ConeGeometry(4, 6, 10).translate(x, h + WH + 11, z)); colliders.push({ x, z, r: 3.6, kind: 'wall', y0: h - 1, y1: h + 30 }); }
        const B = { x: gt.x, z: gt.z, w: 7.5, d: 3, a, h: h + 5.5 }; box(parts.stone, B, 0, 0, 1.5, 7.5, WH - 3, 3);   // the lintel over the gateway
    }
    // the high bridge over the gorge: a deck on three arches, parapets
    { const B = { x: BRIDGE.x, z: (BRIDGE.z0 + BRIDGE.z1) / 2, w: 5, d: BRIDGE.z0 - BRIDGE.z1, a: Math.PI / 2, h: BRIDGE.h - 1.2 };
      box(parts.stone, B, 0, 0, B.d / 2, 5, 1.2, B.d);
      for (const s of [-1, 1]) box(parts.stone, B, s * 2.35, 1.2, B.d / 2, 0.3, 1.1, B.d);
      for (const t of [0.14, 0.32, 0.5, 0.68, 0.86]) box(parts.stone, { ...B, h: RIVER - 1 }, 0, 0, B.d * t, 3.4, BRIDGE.h - 1.2 - RIVER + 1, 2.6);
      wallSeg(BRIDGE.x - 2.5, BRIDGE.z0, BRIDGE.x - 2.5, BRIDGE.z1, BRIDGE.h - 1, BRIDGE.h + 2, 0.2); wallSeg(BRIDGE.x + 2.5, BRIDGE.z0, BRIDGE.x + 2.5, BRIDGE.z1, BRIDGE.h - 1, BRIDGE.h + 2, 0.2); }

    // ---------- T4: the street's life ----------
    const at = (x, z) => ({ x, z, w: 1, d: 1, a: 0, h: heightAt(x, z) });
    const put = (list, x, z, w, h, d, y = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); g.rotateY(ry); g.translate(x, heightAt(x, z) + y + h / 2, z); list.push(g); };
    const cyl = (list, x, z, r, h, y = 0, seg = 8) => { const g = new THREE.CylinderGeometry(r, r, h, seg); g.translate(x, heightAt(x, z) + y + h / 2, z); list.push(g); };
    // stairs: stone steps on the steep stretches of the lanes
    for (const sg of SEGS) {
        if (!sg.stair) continue;
        const L = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az), ry = -Math.atan2(sg.bz - sg.az, sg.bx - sg.ax);
        for (let d = 0.3; d < L; d += 0.6) { const x = sg.ax + (sg.bx - sg.ax) * d / L, z = sg.az + (sg.bz - sg.az) * d / L; put(parts.stone, x, z, 0.62, 0.22, sg.w * 0.9, -0.12, ry); }
    }
    // the market: stalls round the square (posts, a counter, a striped awning), crates and barrels; a well in every small square
    const AW = [parts.awningR, parts.awningB, parts.awningY];
    for (const q of PLAN.squares) {
        const n = q.name === 'market' ? 10 : 0;
        for (let k = 0; k < n; k++) {
            const a = k / n * Math.PI * 2 + 0.3, r = q.r - 4, x = q.x + Math.cos(a) * r, z = q.z + Math.sin(a) * r, ry = -a + Math.PI / 2;
            if (Math.hypot(x - L.market_hall.x, z - L.market_hall.z) < 16) continue;
            for (const [dx, dz] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 0.9], [1.3, 0.9]]) { const c = Math.cos(-ry), s2 = Math.sin(-ry); put(parts.wood, x + dx * c - dz * s2, z + dx * s2 + dz * c, 0.12, 2.3, 0.12); }
            put(parts.wood, x, z, 2.8, 0.9, 1.0, 0, ry);
            put(AW[k % 3], x, z, 3.0, 0.08, 2.2, 2.3, ry);
            for (let b = 0; b < 3; b++) { const bx = x + Math.cos(a + 0.4 + b * 0.25) * 2.2, bz = z + Math.sin(a + 0.4 + b * 0.25) * 2.2; b % 2 ? cyl(parts.wood, bx, bz, 0.32, 0.8) : put(parts.wood, bx, bz, 0.6, 0.55, 0.6, 0, a); }
            colliders.push({ x, z, r: 1.6, kind: 'wall', y0: heightAt(x, z) - 1, y1: heightAt(x, z) + 2.4 });
        }
        if (q.name !== 'college') {   // a well: a stone ring, two posts, a little roof
            const x = q.x + (q.name === 'market' ? 9 : 0), z = q.z + (q.name === 'market' ? -9 : 0);
            cyl(parts.stone, x, z, 1.1, 0.9, 0, 10); cyl(parts.dark, x, z, 0.8, 0.92, 0.01, 10);
            put(parts.wood, x - 1, z, 0.14, 2.2, 0.14); put(parts.wood, x + 1, z, 0.14, 2.2, 0.14); put(parts.slate, x, z, 2.6, 0.12, 1.6, 2.2);
            colliders.push({ x, z, r: 1.2, kind: 'wall', y0: heightAt(x, z) - 1, y1: heightAt(x, z) + 2.3 });
        }
    }
    // lanterns along the high streets and the main streets (their glass lit at dusk)
    for (const st2 of PLAN.streets) {
        if (st2.kind !== 'high' && st2.kind !== 'main') continue;
        const p = st2.pts;
        for (let i = 2; i < p.length - 1; i += 4) {
            const [ax, az] = p[i], [bx, bz] = p[i + 1], L2 = Math.hypot(bx - ax, bz - az) || 1, side = i % 8 < 4 ? 1 : -1;
            const x = ax - (bz - az) / L2 * (st2.w / 2 + 0.4) * side, z = az + (bx - ax) / L2 * (st2.w / 2 + 0.4) * side;
            if (padsNear(x, z).some(pp => inQuad(pp.q, x, z))) continue;
            put(parts.dark, x, z, 0.12, 3.2, 0.12); put(parts.lamp, x, z, 0.32, 0.42, 0.32, 3.2); put(parts.dark, x, z, 0.42, 0.08, 0.42, 3.62);
        }
    }
    // banners on the gatehouses (the city's colours: blue and silver)
    for (const gt of Object.values(PLAN.gates)) {
        const tx = -Math.sin(gt.a), tz = Math.cos(gt.a), h = cityGround(gt.x, gt.z) - 1;
        for (const sgn of [-1, 1]) { const x = gt.x + tx * 5.2 * sgn - Math.cos(gt.a) * 3.6, z = gt.z + tz * 5.2 * sgn - Math.sin(gt.a) * 3.6; const g = new THREE.BoxGeometry(1.4, 4, 0.06); g.rotateY(-gt.a + Math.PI / 2); g.translate(x, h + WH + 1, z); parts.banner.push(g); }
    }

    // ---------- waterfalls pouring off the Citadel's cliff into the gorge (as on the old painting), foam where they land ----------
    const fallMat = new THREE.MeshStandardMaterial({ color: 0xdfeef4, emissive: 0xbfe6f0, emissiveIntensity: 0.7, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false });
    const foamMat = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.7, depthWrite: false });
    const falls = [];
    for (const [dx, w] of [[-34, 7], [-12, 10], [18, 6], [46, 4.5]]) {
        const x = BRIDGE.x + dx, zc = NORTH - GW + 2.5, top = CIT_H + 0.5, H = top - RIVER;
        const f2 = new THREE.Mesh(new THREE.PlaneGeometry(w, H, 1, 6), fallMat); f2.position.set(x, RIVER + H / 2, zc); f2.rotation.x = -0.1; scene.add(f2);
        const foam = new THREE.Mesh(new THREE.CircleGeometry(w * 0.9, 12).rotateX(-Math.PI / 2), foamMat); foam.position.set(x, RIVER + 4.2, zc + 3); scene.add(foam); falls.push(foam);
    }

    // the materials (windows warm at dusk), and the merged meshes
    const M = {
        stone: flat(0x7a776f), ashlar: flat(0x9a968c), plaster: flat(0xd8d0bc), timber: flat(0x4a3424), slate: flat(0x5e6874), tile: flat(0x8a4a32),
        window: new THREE.MeshStandardMaterial({ color: 0x2a2a30, emissive: 0xffb050, emissiveIntensity: 0, flatShading: true }), dark: flat(0x26262c), door: flat(0x4a3020), lead: flat(0x5a6068),
        wood: flat(0x6a4a2c), awningR: flat(0xa83a2a), awningB: flat(0x3a5a8a), awningY: flat(0xc8a040), banner: flat(0x2a4a8a),
        lamp: new THREE.MeshStandardMaterial({ color: 0x3a3428, emissive: 0xffc070, emissiveIntensity: 0, flatShading: true }),
    };
    // Merged for the phone: every plain colour into one vertex-coloured mesh per 80 m block (the camera and the shadow
    // pass skip the blocks they cannot see; one draw each), the glowing parts (windows, lanterns) their own per block.
    const CHUNK = 80, chunks = new Map(), col = new THREE.Color();
    for (const [k, list] of Object.entries(parts)) {
        const glow = k === 'window' || k === 'lamp';
        for (const x of list) {
            const n = x.index ? x.toNonIndexed() : x;
            for (const a of Object.keys(n.attributes)) if (a !== 'position' && a !== 'normal') n.deleteAttribute(a);
            if (!n.attributes.normal) n.computeVertexNormals();
            if (!glow) { col.copy(M[k].color); const cs = new Float32Array(n.attributes.position.count * 3); for (let i = 0; i < cs.length; i += 3) { cs[i] = col.r; cs[i + 1] = col.g; cs[i + 2] = col.b; } n.setAttribute('color', new THREE.BufferAttribute(cs, 3)); }
            n.computeBoundingSphere(); const c = n.boundingSphere.center;
            const key = `${Math.floor(c.x / CHUNK)},${Math.floor(c.z / CHUNK)}:${glow ? k : 'plain'}`;
            (chunks.get(key) ?? chunks.set(key, []).get(key)).push(n);
        }
    }
    const plainMat = flat(0xffffff, { vertexColors: true });
    for (const [key, list] of chunks) {
        const kind = key.split(':')[1], g = mergeGeometries(list, false); list.forEach(x => x.dispose());
        const m = new THREE.Mesh(g, kind === 'plain' ? plainMat : M[kind]); m.castShadow = kind === 'plain'; m.receiveShadow = true; scene.add(m);
    }

    // ---------- trees: in the yards behind the houses, the cloister, the manor's garden ----------
    const CROWN_MED = mergeGeometries([new THREE.IcosahedronGeometry(1.9, 1).translate(0, 3.8, 0), new THREE.IcosahedronGeometry(1.2, 0).translate(0.9, 3.2, 0.4)].map(g => { g.deleteAttribute('uv'); return g; }));   // a yard tree's crown: a third of the forest one's triangles
    { const K = treeKinds(), pts = [];
      for (let k = 0; k < 2600 && pts.length < 170; k++) {
          const x = -175 + rng() * 350, z = -40 + rng() * 290;
          if (!insideWall(x, z, 6)) continue;
          const n = nearestSeg(x, z); if (n && n.d < 3) continue;
          if (padsNear(x, z).some(p => inQuad(p.q, x, z) || Math.hypot(p.x - x, p.z - z) < p.r * 0.6)) continue;
          if (PLAN.squares.some(q => Math.hypot(q.x - x, q.z - z) < q.r + 2)) continue;
          pts.push([x, z, heightAt(x, z), 0.55 + rng() * 0.35, rng() * 6.28]);
      }
      for (const part of ['trunk', 'crown']) {
          const im = new THREE.InstancedMesh(part === 'crown' ? CROWN_MED : K.broad[part], flat(part === 'trunk' ? K.broad.trunkColor : 0xffffff), pts.length), c = new THREE.Color();
          pts.forEach(([x, z, h, s, r], i) => { q4.setFromAxisAngle(Y, r); tmpM.compose(pv.set(x, h - 0.1, z), q4, sc.setScalar(s)); im.setMatrixAt(i, tmpM); if (part === 'crown') im.setColorAt(i, c.setHSL(0.27 + rng() * 0.04, 0.42, 0.27 + rng() * 0.06)); });
          im.castShadow = true; scene.add(im);
      }
      pts.forEach(([x, z, h, s]) => colliders.push({ x, z, r: 0.3, kind: 'wall', y0: h - 0.5, y1: h + 5 * s })); }

    // ---------- doors, arrivals, the map ----------
    const triggers = [], spawns = {}, stations = [];
    const DOOR = Object.fromEntries((DOORS.thaloria ?? []).map(d => [d.interior, d]));
    const doorOf = (x, z, a, h, id, label) => {
        const fx = Math.cos(a), fz = Math.sin(a), open = INTERIOR_IDS.has(id);
        label = DOOR[id]?.label ?? label;
        triggers.push({ x: x - fx * 0.2, z: z - fz * 0.2, r: 1.2, label: open ? label : `${label} — locked`, to: open ? id : null, spawn: 'enter' });
        spawns[`door:${id}`] = { x: x - fx * 2.2, z: z - fz * 2.2, facing: Math.atan2(-fx, -fz) };
    };
    const NAMES = { thaloria_inn: 'Enter the Inn', thaloria_temple: 'The temple', thaloria_bell_tower: 'Enter the Bell Tower', thaloria_guild_hall: "The Archivist's Guild", thaloria_barracks: 'The barracks', thaloria_market_hall: 'The market hall', thaloria_manor: 'The manor', thaloria_smithy: 'The smithy', thaloria_alchemist: "The alchemist's", thaloria_house_noble_a: 'A fine house', thaloria_house_market_a: 'A house', thaloria_house_low_a: 'A house', thaloria_house_low_c: 'A house', thaloria_house_low_e: 'A house', thaloria_house_teal: 'A house', thaloria_house_noble_c: 'A fine house' };
    for (const P of PLAN.plots) if (P.interior) { const fx = Math.cos(P.a), fz = Math.sin(P.a); doorOf(P.x + fx * P.d / 2, P.z + fz * P.d / 2, P.a + Math.PI, P.h, P.interior, NAMES[P.interior] ?? 'A house'); }
    for (const l of PLAN.landmarks) if (l.interior) { const fx = Math.cos(l.a + Math.PI), fz = Math.sin(l.a + Math.PI); doorOf(l.x - fx * l.d / 2, l.z - fz * l.d / 2, l.a + Math.PI, cityGround(l.x, l.z), l.interior, NAMES[l.interior] ?? l.id); }
    const sp = g => { const gt = PLAN.gates[g], ix = -Math.cos(gt.a) * 8, iz = -Math.sin(gt.a) * 8; return { x: gt.x + ix, z: gt.z + iz, facing: Math.atan2(ix, iz) }; };
    Object.assign(spawns, { start: { x: PLAN.squares[0].x + 6, z: PLAN.squares[0].z + 18, facing: Math.PI }, east_gate: sp('east'), south_gate: sp('south'), west_gate: sp('west'), north_gate: sp('north'), market: { x: PLAN.squares[0].x, z: PLAN.squares[0].z + 16, facing: Math.PI } });
    spawns.from_glade = spawns.west_gate; spawns.from_east_road = spawns.east_gate; spawns.from_lower = spawns.south_gate; spawns.from_citadel = spawns.north_gate;

    // ---------- the market's furniture: the bounty board, the hearth and the alchemy table; the Lookout on the bridge ----------
    const mk = PLAN.squares[0], mh = cityGround(mk.x, mk.z);
    { const x = mk.x + 14, z = mk.z + 10, board = new THREE.Group(), wood = flat(0x6a4a2a), dark = flat(0x3a2818);
      for (const sx of [-0.85, 0.85]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.3, 0.14), dark); post.position.set(sx, 1.15, 0); post.castShadow = true; board.add(post); }
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 0.08), wood); panel.position.y = 1.55; board.add(panel);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.5), dark); roof.position.set(0, 2.2, 0.05); roof.rotation.x = -0.25; board.add(roof);
      [[-0.6, 1.75, 0.1], [-0.1, 1.6, -0.06], [0.45, 1.78, 0.08], [0.6, 1.3, -0.1]].forEach(([px, py, r]) => { const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.34), flat(0xe8dcc0)); sh.position.set(px, py, 0.05); sh.rotation.z = r; board.add(sh); });
      board.position.set(x, heightAt(x, z), z); board.rotation.y = Math.atan2(mk.x - x, mk.z - z); scene.add(board);
      colliders.push({ x, z, r: 0.9, kind: 'wall', y0: heightAt(x, z) - 1, y1: heightAt(x, z) + 2.5 });
      const bb = (thaloriaMap.default.spawns.bountyBoards ?? [])[0];
      stations.push({ mode: 'board', key: BOUNTIES.boardIdFor('thaloria'), region: bb?.region ?? 'thaloria', place: 'Thaloria', pos: new THREE.Vector3(x + (mk.x - x) * 0.06, heightAt(x, z), z + (mk.z - z) * 0.06) }); }
    for (const [type, dx, dz] of [['hearth', -12, 12], ['alchemy', -15, 6]]) stations.push({ mode: type, pos: new THREE.Vector3(mk.x + dx, heightAt(mk.x + dx, mk.z + dz), mk.z + dz) });
    stations.push({ mode: 'sign', text: 'THE LOOKOUT. From the bridge the Citadel stands as it does on the old painting: across the gorge, the river white beneath it, the peaks behind. Painters come at sunset. Scholars come to argue about which window is the Archive.', pos: new THREE.Vector3(BRIDGE.x + 1.6, BRIDGE.h, BRIDGE.z0 - 6) });

    // ---------- the townsfolk: their old schedules, their spots moved into the new city ----------
    // Anchors: each old door / square / gate (amo's tiles) and its counterpart here; between them a smooth warp; a spot
    // that lands inside a house steps out to the nearest street.
    const old = (tx, ty) => [tx - 64 + 0.5, ty - 56 + 0.5 + 1];
    const anchors = [];
    for (const d of DOORS.thaloria ?? []) { const s2 = spawns[`door:${d.interior}`]; if (s2) anchors.push([old(d.x, d.y), [s2.x, s2.z]]); }
    const G = PLAN.gates, sq = Object.fromEntries(PLAN.squares.map(q => [q.name, q]));
    anchors.push([old(80, 92), [sq.market.x, sq.market.z]], [old(63, 52), [sq.college.x, sq.college.z]], [old(119, 54), [G.east.x - 8, G.east.z]], [old(8, 54), [G.west.x + 8, G.west.z]], [old(64, 110), [G.south.x, G.south.z - 8]], [old(64, 2), [G.north.x, G.north.z + 8]]);
    const base = (x, z) => [x * 2.3, 95 + z * 2.3];
    const onStreet = (px, pz) => { const n = nearestSeg(px, pz); if (!n) return [px, pz]; const s2 = n.s; return [s2.ax + (s2.bx - s2.ax) * n.t, s2.az + (s2.bz - s2.az) * n.t]; };
    function remap(x, z, moving = false) {
        let sx = 0, sz = 0, sw = 0;
        for (const [[ox, oz], [nx, nz]] of anchors) { const w = 1 / ((x - ox) ** 2 + (z - oz) ** 2 + 16); const [bx, bz] = base(ox, oz); sx += w * (nx - bx); sz += w * (nz - bz); sw += w; }
        let [px, pz] = base(x, z); px += sx / sw; pz += sz / sw;
        if (moving || padsNear(px, pz).some(p => inQuad(p.q, px, pz))) [px, pz] = onStreet(px, pz);   // walking, or inside a house: on the street
        return [px, pz];
    }
    const segGrid = new Map();   // the walls (segment colliders) in 20 m cells — the townsfolk check only their own cell's
    for (const c of colliders) if (c.ax !== undefined) for (const [x, z] of [[c.ax, c.az], [c.bx, c.bz]]) { const k = Math.floor(x / 20) + ',' + Math.floor(z / 20); const l = segGrid.get(k) ?? segGrid.set(k, []).get(k); if (!l.includes(c)) l.push(c); }
    const town = createTownsfolk({ scene, W: 128, H: 112, resolve: (pos, r) => pushOut(segGrid.get(Math.floor(pos.x / 20) + ',' + Math.floor(pos.z / 20)) ?? [], pos, r), remap, heightAt });

    // chimney smoke: a slow grey column from two dozen chimneys (a few sprites each, cycling)
    const smokeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(200,200,205,0.55)'); gr.addColorStop(1, 'rgba(200,200,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
    const smoke = [];
    for (let k = 0; k < chimneys.length; k += Math.max(1, Math.floor(chimneys.length / 14))) {
        const [x, y, z] = chimneys[k];
        for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false })); sp.userData.dynamic = true; scene.add(sp); smoke.push({ sp, x, y, z, t: i / 3 }); }
    }
    // ---------- T4: guards walking the wall-walk, carts on the high street ----------
    // The wall-walk: the wall's line, a metre inside, at the top of the wall (as built above).
    const walk = wall.map(([x, z]) => { const cx0 = 0, cz0 = 95, d = Math.hypot(x - cx0, z - cz0), k = (d - 1.2) / d; return [cx0 + (x - cx0) * k, cz0 + (z - cz0) * k]; });
    const walkY = walk.map(([x, z], i) => Math.min(cityGround(...wall[i]), cityGround(...wall[(i + 1) % wall.length])) - 1.5 + WH + 1.5);
    const guards = [];
    for (let k = 0; k < 6; k++) {
        const m = createCharacter(lookFor({ role: 'guard', id: 'wallguard' + k }));
        m.setWeapons({ type: 'spear', accent: 0x2f4a7a }, null); m.root.userData.dynamic = true; scene.add(m.root);
        guards.push({ m, u: k / 6 * walk.length, dir: k % 2 ? 1 : -1, pause: 0 });
    }
    function walkAt(u) { const n = walk.length, i = ((Math.floor(u) % n) + n) % n, j = (i + 1) % n, t = u - Math.floor(u); return [walk[i][0] + (walk[j][0] - walk[i][0]) * t, walkY[i] + (walkY[j] - walkY[i]) * t, walk[i][1] + (walk[j][1] - walk[i][1]) * t]; }
    // carts: a two-wheeled cart and its ox, going slowly up and down the high street
    const carts = [];
    const hs = PLAN.streets.filter(s2 => s2.kind === 'high').flatMap(s2 => s2.pts);
    const wood2 = flat(0x6a4a2c), dark2 = flat(0x3a2818), ox = flat(0x7a6a58);
    for (let k = 0; k < 2; k++) {
        const g2 = new THREE.Group(); g2.userData.dynamic = true;
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 2.4), wood2); bed.position.y = 0.95; g2.add(bed);
        for (const s3 of [-1, 1]) { const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 10).rotateZ(Math.PI / 2), dark2); w2.position.set(s3 * 0.85, 0.55, 0); g2.add(w2); }
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.8), dark2); shaft.position.set(0, 0.8, 1.9); g2.add(shaft);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.7), ox); body.position.set(0, 1.0, 3.2); g2.add(body);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.6), ox); head.position.set(0, 1.25, 4.2); g2.add(head);
        for (const [lx, lz] of [[-0.3, 2.6], [0.3, 2.6], [-0.3, 3.8], [0.3, 3.8]]) { const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.16), ox); l2.position.set(lx, 0.3, lz); g2.add(l2); }
        for (let c = 0; c < 3; c++) { const cr = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), wood2); cr.position.set((c - 1) * 0.45, 1.4, (c % 2) * 0.4 - 0.3); g2.add(cr); }
        scene.add(g2); carts.push({ g: g2, u: k * hs.length * 0.5, dir: k ? -1 : 1 });
    }
    function streetAt(u) { const n = hs.length - 1, uu = Math.max(0, Math.min(n - 0.001, u)), i = Math.floor(uu), t = uu - i; return [hs[i][0] + (hs[i + 1][0] - hs[i][0]) * t, hs[i][1] + (hs[i + 1][1] - hs[i][1]) * t, Math.atan2(hs[i + 1][0] - hs[i][0], hs[i + 1][1] - hs[i][1])]; }

    const winMat = M.window;
    const map = {
        id: 'thaloria', name: 'Thaloria', scene, heightAt, terrain: true, colliders, triggers, spawns, stations, hittables: [], gatherSpots: [], gates: [],
        camera: { maxDist: 26, pitch: 0.4, dist: 9 },
        groundAt: (x, z) => heightAt(x, z),
        blockedAt(x, z, r, y = heightAt(x, z)) { const c = colliderAt(colliders, x, z, r, y); return c ? c.kind : null; },
        resolve: (pos, r) => pushOut(colliders, pos, r),
        passable: () => true,
        projectileHit(p) { if (p.y < heightAt(p.x, p.z) + 0.05) return 'ground'; const c = colliderAt(colliders, p.x, p.z, 0.15, p.y); return c && p.y >= c.y0 + 0.5 ? 'object' : null; },
        groundNormal: () => new THREE.Vector3(0, 1, 0),
        weatherDef: { id: 'thaloria', biome: 'temperate' },
        town,
        update(t, dt, ctx) { const S = shell.update(dt, ctx), n = S?.night ?? 0; winMat.emissiveIntensity = n * 1.3; M.lamp.emissiveIntensity = n * 2.4; town.update(dt, ctx);
            const PG = ctx.player.pos;
            for (const gd of guards) {   // a slow round of the wall, a pause now and then to look out
                if (gd.pause > 0) { gd.pause -= dt; gd.m.update(dt, { speed: 0, sprinting: false, hopK: null }); continue; }
                const [ax, ay, az] = walkAt(gd.u); gd.u += gd.dir * dt * 0.09; const [bx, , bz] = walkAt(gd.u);
                gd.m.root.position.set(ax, ay, az); gd.m.root.rotation.y = Math.atan2(bx - ax, bz - az);
                gd.m.root.visible = Math.hypot(ax - PG.x, az - PG.z) < 180;
                if (Math.random() < dt * 0.04) gd.pause = 3 + Math.random() * 4;
                gd.m.update(dt, { speed: 1.4, sprinting: false, hopK: null });
            }
            for (const c of carts) {   // up the high street and back down
                c.u += c.dir * dt * 0.12; if (c.u > hs.length - 1.01 || c.u < 0) { c.dir *= -1; c.u = Math.max(0, Math.min(hs.length - 1.01, c.u)); }
                const [x, z, a] = streetAt(c.u); c.g.position.set(x, heightAt(x, z), z); c.g.rotation.y = a + (c.dir < 0 ? Math.PI : 0);
                c.g.visible = Math.hypot(x - PG.x, z - PG.z) < 200;
            }
            const PP = ctx.player.pos; for (const p of smoke) { p.sp.visible = Math.abs(p.x - PP.x) < 160 && Math.abs(p.z - PP.z) < 160; if (!p.sp.visible) continue; p.t = (p.t + dt * 0.12) % 1; p.sp.position.set(p.x + p.t * 1.5, p.y + p.t * 7, p.z + p.t * 0.6); p.sp.scale.setScalar(0.8 + p.t * 3); p.sp.material.opacity = 0.5 * Math.sin(p.t * Math.PI); } },
    };
    // the chart: streets, squares, every building's footprint, the wall
    const bxs = []; for (const p of padList) { const xs = p.q.map(c => c[0]), zs = p.q.map(c => c[1]); bxs.push({ x0: Math.min(...xs), z0: Math.min(...zs), x1: Math.max(...xs), z1: Math.max(...zs) }); }
    map.mapInfo = {
        half: 190, water: RIVER, trees: [], buildings: bxs, walls: wall.filter((_, i) => i % 2 === 0),
        groundAt: (x, z) => { const n = nearestSeg(x, z); if (n && n.d < 0.3) return 'road'; if (PLAN.squares.some(q => Math.hypot(q.x - x, q.z - z) < q.r)) return 'paved'; return null; },
        landmarks: [...PLAN.landmarks.map(l => ({ name: { college: 'The College', bell_tower: 'The Bell Tower', temple: 'The Temple', market_hall: 'The Market Hall', guild_hall: "The Archivists' Guild", manor: 'The Manor', barracks: 'The Barracks', inn: 'The Inn' }[l.id] ?? l.id, x: l.x, z: l.z, icon: 'house' })),
            ...Object.entries(PLAN.gates).map(([k, g]) => ({ name: `The ${k[0].toUpperCase() + k.slice(1)} Gate`, x: g.x, z: g.z, icon: 'gate' })), { name: 'The Market', x: PLAN.squares[0].x, z: PLAN.squares[0].z }],
    };
    return map;
}

function corners(x, z, w, d, a) {
    const fx = Math.cos(a), fz = Math.sin(a), rx = -fz, rz = fx;
    return [[x + rx * w / 2 + fx * d / 2, z + rz * w / 2 + fz * d / 2], [x - rx * w / 2 + fx * d / 2, z - rz * w / 2 + fz * d / 2], [x - rx * w / 2 - fx * d / 2, z - rz * w / 2 - fz * d / 2], [x + rx * w / 2 - fx * d / 2, z + rz * w / 2 - fz * d / 2]];
}
function inQuad(q, x, z) {
    let s = 0;
    for (let i = 0; i < 4; i++) { const [ax, az] = q[i], [bx, bz] = q[(i + 1) % 4], c = (bx - ax) * (z - az) - (bz - az) * (x - ax); if (c !== 0) { if (s === 0) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } }
    return true;
}
