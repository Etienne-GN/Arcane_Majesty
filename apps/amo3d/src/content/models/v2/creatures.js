// The creatures on v2 models (LAYERS_PLAN step 6, 2026-11-26: "mobs AND animals should get v2 models like the characters, and
// the Sculptor will let me fine-tune the models"): each kind's body is one continuous skinned mesh over its own joints (the
// groups its AI already animates — so the walk, the lunge and the bite are unchanged), its points keyed by where they sit in
// the build, and shaped by the kind's layer (models/v2/layers/<kind>.json, edited in the Sculptor) — the same machinery as
// the characters' (skin.js; buildBase's layer passes). The wolf first; the others kind by kind.
import * as THREE from 'three';
import { createSkin } from './skin.js';
import { LAYERS } from './base.js';

// The kind's layer turned into positions for this body, then the real build (as buildBase: a dry pass maps the points).
// gen({ edits, dry, topo }) builds the body with createSkin and returns { mesh } (or { points, bones } when dry).
export function buildLayered(root, kind, gen) {
    const L = LAYERS[kind] ?? {}, topo = Array.isArray(L['@topo']) ? L['@topo'] : null, edits = {};
    const keys = Object.keys(L).filter(k => k !== '@topo');
    if (keys.length) {
        const plain = gen({ dry: true, topo });
        root.updateMatrixWorld(true);
        const inv = root.matrixWorld.clone().invert(), M = plain.bones.map(b => new THREE.Matrix3().setFromMatrix4(inv.clone().multiply(b.matrixWorld)));
        const d = new THREE.Vector3();
        for (const [k, r] of plain.points) { const v = L[r.t]; if (!Array.isArray(v)) continue; d.set(v[0], v[1], v[2]).applyMatrix3(M[r.bone]); edits[k] = [r.p.x + d.x, r.p.y + d.y, r.p.z + d.z]; }
    }
    const out = gen({ edits, topo });
    if (out?.mesh) { out.mesh.userData.editSex = kind; out.mesh.userData.layers = [kind]; out.mesh.name = `v2_${kind}`; }
    return out;
}

// The wolf: a long ribcage tapering to a tucked waist and the haunches, a neck rising into a wedge head with a long muzzle,
// upright ears, legs with a knee and a paw, a brush of a tail. d: buildWolf's joints { root, body, head, tail, legs[] }.
export function buildWolfV2(d, { fur = '#6b6862', belly = '#b8b0a2', dark = '#1c1a18' } = {}) {
    const { root, body, head, tail, legs } = d;
    const bones = [body, head, tail, ...legs.flatMap(l => [l.upper, l.lower])];
    const gen = ({ edits = null, dry = false, topo = null } = {}) => {
        root.updateMatrixWorld(true);
        const sk = createSkin(root, bones, { edits, dry, topo }), V = (g, x, y, z) => sk.at(g, x, y, z);
        // the body, rump to chest, then up the neck into the head and out along the muzzle (rings upright, along z)
        sk.section('torso');
        const R = (g, x, y, z, rx, rz, w, col = fur) => ({ c: V(g, x, y, z), rx, rz, w, col });
        sk.loft([
            R(body, 0, 0.04, -0.47, 0.06, 0.07, [[body, 1]]),
            R(body, 0, 0.02, -0.4, 0.13, 0.15, [[body, 1]]),   // the haunches
            R(body, 0, 0.02, -0.28, 0.15, 0.17, [[body, 1]]),
            R(body, 0, 0.03, -0.08, 0.13, 0.14, [[body, 1]]),   // the waist, tucked up
            R(body, 0, 0.0, 0.12, 0.16, 0.19, [[body, 1]], fur),   // the ribs
            R(body, 0, 0.0, 0.3, 0.17, 0.21, [[body, 1]]),   // the chest
            R(body, 0, 0.07, 0.43, 0.12, 0.15, [[body, 0.7], [head, 0.3]]),   // the neck's root
            R(head, 0, -0.04, -0.07, 0.1, 0.11, [[body, 0.25], [head, 0.75]]),   // the neck
            R(head, 0, 0.0, 0.02, 0.105, 0.1, [[head, 1]]),   // the skull
            R(head, 0, -0.01, 0.1, 0.085, 0.08, [[head, 1]]),   // the cheeks
            R(head, 0, -0.03, 0.18, 0.055, 0.055, [[head, 1]]),   // the muzzle
            R(head, 0, -0.035, 0.27, 0.04, 0.04, [[head, 1]]),
            R(head, 0, -0.035, 0.31, 0.022, 0.024, [[head, 1]], dark),   // the nose
        ], { seg: 10, axis: 'z', mat: 'double', cap: true, capStart: true });
        // the ears: upright triangles, open to the front
        sk.section('ears');
        for (const s of [1, -1]) {
            const P = (x, y, z) => ({ p: V(head, s * x, y, z), w: [[head, 1]] }), c = V(head, s * 0.06, 0.1, -0.02);
            const a = P(0.035, 0.07, 0.0), b = P(0.085, 0.07, -0.04), t = P(0.07, 0.19, -0.03), back = P(0.06, 0.08, -0.07);
            sk.poly([a, b, t], fur, c); sk.poly([b, back, t], fur, c); sk.poly([back, a, t], fur, c);
        }
        // the legs: thigh or shoulder to the knee, the shank to the paw (the joints bend between)
        sk.section('legs');
        legs.forEach(({ upper, lower }) => {
            sk.tube([
                { c: V(upper, 0, 0.06, 0), r: 0.075, rz: 0.08, w: [[body, 0.6], [upper, 0.4]], col: fur },
                { c: V(upper, 0, -0.06, 0), r: 0.06, rz: 0.065, w: [[upper, 1]], col: fur },
                { c: V(upper, 0, -0.24, 0), r: 0.042, w: [[upper, 1]], col: fur },
                { c: V(lower, 0, 0.0, 0), r: 0.036, w: [[upper, 0.5], [lower, 0.5]], col: fur },   // the knee
                { c: V(lower, 0, -0.2, 0), r: 0.028, w: [[lower, 1]], col: fur },
                { c: V(lower, 0, -0.28, 0.01), r: 0.03, rz: 0.036, w: [[lower, 1]], col: dark },   // the paw
                { c: V(lower, 0, -0.31, 0.03), r: 0.032, rz: 0.04, w: [[lower, 1]], col: dark },
            ], { seg: 6, cap: true });
        });
        // the tail: a brush hanging back and down
        sk.section('tail');
        sk.tube([
            { c: V(tail, 0, 0.0, 0.02), r: 0.05, w: [[body, 0.5], [tail, 0.5]], col: fur },
            { c: V(tail, 0, -0.07, -0.12), r: 0.065, w: [[tail, 1]], col: fur },
            { c: V(tail, 0, -0.17, -0.27), r: 0.055, w: [[tail, 1]], col: fur },
            { c: V(tail, 0, -0.25, -0.38), r: 0.03, w: [[tail, 1]], col: belly },
        ], { seg: 6, cap: true });
        if (dry) return { points: sk.build().points, bones };
        return { mesh: sk.build() };
    };
    return buildLayered(root, 'wolf', gen);
}

// The horse (2026-11-26, after the user's sheet docs/3d/creatures/horse_reference.jpg): a deep barrel, rounded
// hindquarters and a strong chest; an arched neck under a dark mane into a long head and tapered muzzle, upright ears;
// legs with a knee, a fetlock and dark hooves; a long full tail. The tack (saddle, bridle, reins, gold buckles) is not
// part of the body's shape: its own pieces on the same joints, as clothes dress the characters.
// d: buildHorse's joints { root, body, neck, head, tail, legs: [{ g, low }] }.
export function buildHorseV2(d, { coat = '#4a3328', mane = '#1e1e24', hoof = '#1a1614', nose = '#3a2820', tack = '#4a3020', gold = '#c8a050', saddled = true } = {}) {
    const { root, body, neck, head, tail, legs } = d;
    const bones = [body, neck, head, tail, ...legs.flatMap(l => [l.g, l.low])];
    const N = 10;
    // a ring square to a joint's own z axis (the neck and head are tilted): its points made in the joint's frame
    // (sq: 2 a round ring, more a squarer one — the head's flat cheeks and face)
    const ringIn = (sk, g, cx, cy, cz, rx, ry, w, col, flatTop = 0, sq = 2) => {
        const c = sk.at(g, cx, cy, cz), e = 2 / sq, pw = v => Math.sign(v) * Math.abs(v) ** e;
        const pts = Array.from({ length: N }, (_, i) => {
            const th = (i / N) * Math.PI * 2, sy = pw(Math.cos(th)), y = sy > 0 ? sy * (1 - flatTop) : sy;
            const p = sk.at(g, cx + pw(Math.sin(th)) * rx, cy + y * ry, cz);
            return [p.x - c.x, p.z - c.z, p.y - c.y];
        });
        return { c, pts, w, col };
    };
    const gen = ({ edits = null, dry = false, topo = null } = {}) => {
        root.updateMatrixWorld(true);
        const sk = createSkin(root, bones, { edits, dry, topo }), V = (g, x, y, z) => sk.at(g, x, y, z);
        // the body, rump to chest, then up the neck and down the head to the nose — one surface
        sk.section('torso');
        const B = (z, cy, rx, ry, w = [[body, 1]], col = coat) => ringIn(sk, body, 0, cy, z, rx, ry, w, col, 0.08);
        const Nk = (z, cy, rx, ry, w) => ringIn(sk, neck, 0, cy, z, rx, ry, w, coat);
        const Hd = (z, cy, rx, ry, col = coat) => ringIn(sk, head, 0, cy, z, rx, ry, [[head, 1]], col, 0, 3.2);
        sk.loft([
            B(-0.88, 1.3, 0.12, 0.12),
            B(-0.8, 1.25, 0.29, 0.29),   // the buttocks
            B(-0.6, 1.22, 0.34, 0.34),   // the hindquarters, round
            B(-0.32, 1.17, 0.3, 0.33),   // the flank
            B(0.0, 1.15, 0.32, 0.35),   // the barrel
            B(0.3, 1.19, 0.31, 0.34),
            B(0.55, 1.26, 0.28, 0.32),   // the shoulder
            B(0.72, 1.3, 0.23, 0.28, [[body, 0.8], [neck, 0.2]]),   // the chest, into the neck
            Nk(0.12, -0.02, 0.22, 0.31, [[body, 0.3], [neck, 0.7]]),   // the neck: deep at the shoulders
            Nk(0.36, 0.0, 0.18, 0.25, [[neck, 1]]),
            Nk(0.6, 0.0, 0.14, 0.2, [[neck, 1]]),
            Nk(0.8, 0.03, 0.1, 0.12, [[neck, 0.6], [head, 0.4]]),   // the throat latch: narrow, where the head hangs from the neck
            // (2026-11-26: "it looks like a tapir" — the head was the neck carried on as one tube to a snout. A horse's head is a
            // wedge: deep flat cheeks (the jowl) at the back, a broad flat forehead, a straight face narrowing, a blunt nose)
            Hd(-0.06, -0.07, 0.1, 0.17),   // the back of the jowl, deep below
            Hd(0.07, -0.08, 0.125, 0.2),   // the cheeks: the deepest, under the eyes
            Hd(0.21, -0.05, 0.11, 0.15),
            Hd(0.36, -0.03, 0.085, 0.105),   // the long straight face
            Hd(0.5, -0.035, 0.078, 0.088),
            Hd(0.6, -0.04, 0.088, 0.088, nose),   // the nose, a little broader (the nostrils)
            Hd(0.67, -0.045, 0.072, 0.07, nose),   // blunt
        ], { seg: N, mat: 'double', cap: true, capStart: true });
        // the ears, upright, and the eyes on the sides of the head
        sk.section('ears');
        for (const s of [1, -1]) {
            const P = (x, y, z) => ({ p: V(head, s * x, y, z), w: [[head, 1]] }), c = V(head, s * 0.07, 0.08, 0.0);
            const a = P(0.04, 0.1, 0.0), b = P(0.1, 0.09, -0.02), t = P(0.08, 0.27, -0.06), back = P(0.07, 0.1, -0.07);
            sk.poly([a, b, t], coat, c); sk.poly([b, back, t], coat, c); sk.poly([back, a, t], mane, c);
            const e = (x, y, z) => ({ p: V(head, s * x, y, z), w: [[head, 1]] }), ec = V(head, 0, 0.03, 0.12);
            sk.poly([e(0.126, 0.07, 0.08), e(0.128, 0.045, 0.12), e(0.126, 0.025, 0.08), e(0.123, 0.05, 0.04)], hoof, ec);   // (high on the side of the head, at the top of the cheek)
            const n = (x, y, z) => ({ p: V(head, s * x, y, z), w: [[head, 1]] });
            sk.poly([n(0.05, 0.02, 0.665), n(0.075, -0.01, 0.66), n(0.05, -0.05, 0.665), n(0.03, -0.02, 0.672)], hoof, V(head, 0, -0.04, 0.6));   // a nostril
        }
        // the legs: forearm or gaskin to the knee or hock, the cannon to the fetlock, the hoof
        sk.section('legs');
        legs.forEach(({ g, low }) => {
            sk.tube([
                { c: V(g, 0, 0.14, 0), r: 0.15, rz: 0.19, w: [[body, 0.7], [g, 0.3]], col: coat },
                { c: V(g, 0, -0.08, 0), r: 0.12, rz: 0.15, w: [[g, 1]], col: coat },
                { c: V(g, 0, -0.36, 0), r: 0.078, rz: 0.092, w: [[g, 1]], col: coat },
                { c: V(low, 0, 0.0, 0), r: 0.074, rz: 0.086, w: [[g, 0.5], [low, 0.5]], col: coat },   // the knee / hock
                { c: V(low, 0, -0.1, 0), r: 0.06, rz: 0.068, w: [[low, 1]], col: coat },
                { c: V(low, 0, -0.33, 0.01), r: 0.06, rz: 0.07, w: [[low, 1]], col: coat },   // the fetlock
                { c: V(low, 0, -0.39, 0.02), r: 0.066, rz: 0.075, w: [[low, 1]], col: hoof },   // the hoof
                { c: V(low, 0, -0.49, 0.03), r: 0.08, rz: 0.088, w: [[low, 1]], col: hoof },
            ], { seg: 7, cap: true });
        });
        // the mane along the neck's crest (and the forelock), and the long tail
        sk.section('mane');
        sk.tube([[0.02, 0.32], [0.2, 0.3], [0.4, 0.26], [0.6, 0.22], [0.8, 0.18]].map(([z, y]) => ({ c: V(neck, 0, y, z), r: 0.045, rz: 0.1, w: [[neck, 1]], col: mane })), { seg: 5, cap: true });   // (standing on the crest, clear of the neck)
        sk.tube([{ c: V(head, 0, 0.13, -0.02), r: 0.035, rz: 0.04, w: [[head, 1]], col: mane }, { c: V(head, 0, 0.12, 0.12), r: 0.03, rz: 0.03, w: [[head, 1]], col: mane }], { seg: 5, cap: true });
        sk.section('tail');
        sk.tube([
            { c: V(tail, 0, 0.0, 0.03), r: 0.06, w: [[body, 0.5], [tail, 0.5]], col: mane },
            { c: V(tail, 0, -0.12, -0.1), r: 0.1, rz: 0.08, w: [[tail, 1]], col: mane },
            { c: V(tail, 0, -0.38, -0.16), r: 0.13, rz: 0.1, w: [[tail, 1]], col: mane },
            { c: V(tail, 0, -0.68, -0.16), r: 0.11, rz: 0.08, w: [[tail, 1]], col: mane },
            { c: V(tail, 0, -0.92, -0.12), r: 0.03, w: [[tail, 1]], col: mane },
        ], { seg: 6, cap: true });
        if (dry) return { points: sk.build().points, bones };
        return { mesh: sk.build() };
    };
    const out = buildLayered(root, 'horse', gen);
    // the tack: its own pieces (not shaped by the horse's layer) — a saddle with flaps and buckles, a bridle, the reins
    if (saddled) {
        root.updateMatrixWorld(true);
        const tk = createSkin(root, [body, neck, head]), V = (g, x, y, z) => tk.at(g, x, y, z);
        tk.tube([0.32, 0.18, 0.0, -0.16, -0.3].map((z, i) => ({ c: V(body, 0, 1.5 + (i === 0 || i === 4 ? 0.05 : 0), z), r: 0.3, rz: 0.05, w: [[body, 1]], col: tack })), { seg: 8, cap: true });   // the seat, cantle and pommel raised
        for (const s of [1, -1]) {
            const P = (x, y, z) => ({ p: V(body, s * x, y, z), w: [[body, 1]] }), c = V(body, 0, 1.2, 0.0);
            tk.poly([P(0.33, 1.48, 0.22), P(0.35, 1.2, 0.2), P(0.35, 1.2, -0.12), P(0.33, 1.48, -0.16)], tack, c);   // the flap
            tk.poly([P(0.36, 1.32, 0.07), P(0.365, 1.27, 0.07), P(0.365, 1.27, 0.02), P(0.36, 1.32, 0.02)], gold, c);   // a buckle
            tk.tube([{ c: V(body, s * 0.34, 1.2, 0.05), r: 0.012, w: [[body, 1]], col: tack }, { c: V(body, s * 0.3, 0.92, 0.05), r: 0.012, w: [[body, 1]], col: tack }], { seg: 4, cap: false });   // the girth
        }
        tk.tube(Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return { c: V(head, Math.sin(a) * 0.095, -0.035 + Math.cos(a) * 0.1, 0.44), r: 0.012, w: [[head, 1]], col: tack }; }), { seg: 4, cap: false });   // the noseband
        tk.tube(Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return { c: V(head, Math.sin(a) * 0.14, -0.07 + Math.cos(a) * 0.215, 0.05), r: 0.012, w: [[head, 1]], col: tack }; }), { seg: 4, cap: false });   // the headpiece, behind the eyes
        for (const s of [1, -1]) tk.tube([{ c: V(head, s * 0.1, -0.06, 0.46), r: 0.012, w: [[head, 1]], col: gold }, { c: V(neck, s * 0.2, -0.05, 0.3), r: 0.012, w: [[neck, 1]], col: tack }, { c: V(body, s * 0.22, 1.5, 0.34), r: 0.012, w: [[body, 1]], col: tack }], { seg: 4, cap: false });   // the reins
        const tm = tk.build(); tm.userData.tack = true;
    }
    return out;
}

// The animals (animals.js: rabbit, fox, boar, the bears, sheep, cow, pig, goat — and the birds, chicken and crow): one
// parametric body per kind from its numbers (K: length, height, legs, snout, ears, tail, horns, tusks, wool, hump,
// patches…), over the same joints (body, head, legs, tail; a bird's wings), each kind shaped by its own layer.
// d: animals.js build()'s { root, body, parts: { head, legs: [{ g }], tail, wingL, wingR }, K }; kind: its type.
const hex = c => '#' + new THREE.Color(c).getHexString();
export function buildAnimalV2(d, kind) {
    const { root, body, parts, K } = d, head = parts.head, tail = parts.tail;
    const fur = hex(K.fur), belly = hex(K.belly ?? K.fur), headC = hex(K.head ?? K.fur), dark = '#1a1410', horn = '#d8ccb0';
    const bones = [body, head, ...(tail ? [tail] : []), ...parts.legs.map(l => l.g), ...(parts.wingL ? [parts.wingL, parts.wingR] : [])];
    const N = K.patches ? 16 : 10;   // (a cow: a finer body, so its patches are blobs, not bands)
    const ring = (sk, g, cx, cy, cz, rx, ry, w, col) => {
        const c = sk.at(g, cx, cy, cz);
        return { c, pts: Array.from({ length: N }, (_, i) => { const th = (i / N) * Math.PI * 2, p = sk.at(g, cx + Math.sin(th) * rx, cy + Math.cos(th) * ry, cz); return [p.x - c.x, p.z - c.z, p.y - c.y]; }), w, col };
    };
    const gen = ({ edits = null, dry = false, topo = null } = {}) => {
        root.updateMatrixWorld(true);
        const sk = createSkin(root, bones, { edits, dry, topo }), V = (g, x, y, z) => sk.at(g, x, y, z);
        if (K.bird) {
            const L = K.len, beak = hex(K.beakC ?? 0xe0a030);
            sk.section('torso');
            sk.loft([
                ring(sk, body, 0, 0.01, -L * 0.55, L * 0.12, L * 0.1, [[body, 1]], fur),
                ring(sk, body, 0, 0, -L * 0.3, L * 0.33, L * 0.34, [[body, 1]], fur),
                ring(sk, body, 0, 0, 0.0, L * 0.4, L * 0.4, [[body, 1]], fur),
                ring(sk, body, 0, 0.02, L * 0.3, L * 0.32, L * 0.34, [[body, 1]], fur),
                ring(sk, head, 0, -L * 0.12, -L * 0.1, L * 0.18, L * 0.2, [[body, 0.4], [head, 0.6]], fur),   // the neck
                ring(sk, head, 0, 0, 0.0, L * 0.25, L * 0.26, [[head, 1]], fur),
                ring(sk, head, 0, 0, L * 0.18, L * 0.17, L * 0.18, [[head, 1]], fur),
                ring(sk, head, 0, -0.01, L * 0.26, L * 0.07, L * 0.06, [[head, 1]], beak),   // the beak
                ring(sk, head, 0, -0.015, L * 0.42, L * 0.01, L * 0.01, [[head, 1]], beak),
            ], { seg: N, mat: 'double', cap: true, capStart: true });
            sk.section('wings');
            for (const [w, s] of [[parts.wingL, 1], [parts.wingR, -1]]) {
                const P = (y, z) => ({ p: V(w, 0, y, z), w: [[w, 1]] }), c = V(w, -s * 0.2, 0, 0);
                sk.poly([P(L * 0.2, L * 0.3), P(L * 0.18, -L * 0.36), P(-L * 0.12, -L * 0.42), P(-L * 0.18, L * 0.2)], fur, c);
            }
            sk.section('legs');
            for (const { g } of parts.legs) sk.tube([{ c: V(g, 0, 0.0, 0), r: 0.012, w: [[g, 1]], col: '#c8a040' }, { c: V(g, 0, -K.h * 0.4, 0.01), r: 0.008, w: [[g, 1]], col: '#c8a040' }], { seg: 4, cap: true });
            if (K.comb) { const C = hex(K.comb), P = (y, z) => ({ p: V(head, 0, y, z), w: [[head, 1]] }); sk.poly([P(L * 0.24, -L * 0.1), P(L * 0.36, 0.0), P(L * 0.24, L * 0.12)], C, V(head, 0.05, L * 0.2, 0)); }
            sk.section('tail');
            { const P = (x, y, z) => ({ p: V(body, x, y, z), w: [[body, 1]] }); sk.poly([P(0, 0.02, -L * 0.45), P(L * 0.18, 0.08, -L * 0.85), P(-L * 0.18, 0.08, -L * 0.85)], fur, V(body, 0, -0.1, -L * 0.6)); }
        } else {
            const hl = K.len * 0.5, w0 = K.wool ? 1.25 : 1, r = K.h * 0.38, hs = K.h * 0.34, B = [[body, 1]];
            const side = () => fur;   // (the cow's patches are painted after the build: irregular spots, not ring by ring — "it looks like a chess board")
            sk.section('torso');
            const rings = [
                ring(sk, body, 0, 0.02 * r, -hl - 0.25 * r, 0.5 * r * w0, 0.55 * r * w0, B, fur),   // (the end rings: one colour — the caps take it)
                ring(sk, body, 0, 0, -hl + 0.3 * r, 0.95 * r * w0, 0.98 * r * w0, B, side(1)),   // the haunches
                ring(sk, body, 0, 0, -hl * 0.3, 0.92 * r * w0, 0.95 * r * w0, B, side(2)),
                ring(sk, body, 0, K.hump ? 0.18 * r : 0, hl * 0.25, 1.0 * r * w0, (K.hump ? 1.2 : 1.03) * r * w0, B, side(3)),   // the ribs (a grizzly's hump)
                ring(sk, body, 0, 0.04 * r, hl * 0.75, 0.88 * r * w0, 0.95 * r * w0, B, side(4)),   // the shoulders
                ring(sk, head, 0, -0.15 * hs, -0.75 * hs, 0.7 * hs, 0.78 * hs, [[body, 0.5], [head, 0.5]], fur),   // the neck
                ring(sk, head, 0, 0, -0.2 * hs, 0.88 * hs, 0.9 * hs, [[head, 1]], headC),
                ring(sk, head, 0, 0.02 * hs, 0.35 * hs, 0.8 * hs, 0.82 * hs, [[head, 1]], headC),   // the brow
            ];
            if (K.snout) {
                const tip = 0.85 * hs + (K.snout + 0.4 * hs) / 2;
                rings.push(ring(sk, head, 0, -0.18 * hs, 0.8 * hs, 0.55 * hs, 0.55 * hs, [[head, 1]], headC),
                    ring(sk, head, 0, -0.22 * hs, tip - 0.05, 0.42 * hs, 0.38 * hs, [[head, 1]], headC),
                    ring(sk, head, 0, -0.22 * hs, tip + 0.01, 0.3 * hs, 0.26 * hs, [[head, 1]], dark));   // the nose
            } else rings.push(ring(sk, head, 0, -0.1 * hs, 0.8 * hs, 0.55 * hs, 0.55 * hs, [[head, 1]], headC), ring(sk, head, 0, -0.14 * hs, 0.98 * hs, 0.25 * hs, 0.22 * hs, [[head, 1]], dark));
            // (a cow: rings added between the body's own, so its patches can have rounder edges)
            const fine = K.patches ? rings.flatMap((rg, i) => {
                if (i >= 5 || i === 0) return [rg];
                const pv = rings[i - 1], at = t => ({ c: pv.c.clone().lerp(rg.c, t), pts: rg.pts.map((p2, j) => p2.map((v, q) => pv.pts[j][q] + (v - pv.pts[j][q]) * t)), w: B, col: fur });
                return [at(0.25), at(0.5), at(0.75), rg];
            }) : rings;
            sk.loft(fine, { seg: N, mat: 'double', cap: true, capStart: true });
            sk.section('face');
            for (const s of [1, -1]) {
                const P = (x, y, z) => ({ p: V(head, s * x, y, z), w: [[head, 1]] }), c = V(head, 0, 0, 0);
                sk.poly([P(0.62 * hs, 0.32 * hs, 0.38 * hs), P(0.6 * hs, 0.2 * hs, 0.5 * hs), P(0.62 * hs, 0.14 * hs, 0.36 * hs)], dark, c);   // an eye
                const ear = K.ears, E = (pts, col = fur) => sk.poly(pts.map(([x, y, z]) => P(x * hs, y * hs, z * hs)), col, V(head, s * 0.5 * hs, 0.5 * hs, -0.3 * hs));
                if (ear === 'long') { E([[0.25, 0.75, 0.0], [0.45, 0.75, -0.1], [0.42, 2.0, -0.25]]); E([[0.45, 0.75, -0.1], [0.3, 0.75, -0.22], [0.42, 2.0, -0.25]]); }
                else if (ear === 'point') { E([[0.3, 0.7, 0.05], [0.65, 0.65, -0.1], [0.55, 1.35, -0.15]]); E([[0.65, 0.65, -0.1], [0.4, 0.68, -0.3], [0.55, 1.35, -0.15]]); }
                else if (ear === 'round' || ear === 'small') { const k = ear === 'round' ? 1 : 0.75; E([[0.45, 0.65, 0.0], [0.8, 0.62 + 0.1 * k, -0.08], [0.72, 0.62 + 0.42 * k, -0.12], [0.5, 0.62 + 0.4 * k, -0.1]]); }
                else if (ear === 'flop') E([[0.45, 0.6, 0.1], [0.9, 0.55, 0.0], [0.95, 0.15, 0.35], [0.55, 0.3, 0.4]]);
                else E([[0.75, 0.35, 0.0], [1.35, 0.15, -0.05], [1.3, 0.05, -0.25], [0.75, 0.22, -0.2]], headC);   // (side ears: a sheep's, a cow's, a goat's)
            }
            sk.section('horns');
            for (const s of [1, -1]) {
                const T = (pts, col = horn) => sk.tube(pts.map(([x, y, z, rr]) => ({ c: V(head, s * x * hs, y * hs, z * hs), r: rr * hs, w: [[head, 1]], col })), { seg: 5, cap: true });
                if (K.horns === 'short') T([[0.45, 0.75, -0.1, 0.1], [0.7, 0.95, -0.15, 0.07], [0.9, 1.2, -0.1, 0.02]]);
                if (K.horns === 'curve') T([[0.3, 0.8, -0.2, 0.1], [0.4, 1.15, -0.5, 0.08], [0.45, 1.05, -0.95, 0.06], [0.5, 0.65, -1.1, 0.02]]);
                if (K.tusks) T([[0.38, -0.3, 1.1, 0.07], [0.48, -0.05, 1.35, 0.04], [0.42, 0.25, 1.4, 0.01]]);
            }
            if (K.beard) sk.tube([{ c: V(head, 0, -0.55 * hs, 0.55 * hs), r: 0.15 * hs, w: [[head, 1]], col: belly }, { c: V(head, 0, -1.0 * hs, 0.5 * hs), r: 0.04 * hs, w: [[head, 1]], col: belly }], { seg: 5, cap: true });
            if (K.bristle) sk.tube([-0.3, 0, 0.3, 0.55].map(f => ({ c: V(body, 0, r * 0.95 + 0.02, f * K.len), r: 0.02, rz: 0.06, w: B, col: dark })), { seg: 4, cap: true });
            sk.section('legs');
            for (const { g } of parts.legs) {
                const lr = K.legs * 0.28, ix = -g.position.x * 0.5;   // (2026-11-26: "the upper legs look weird" — the leg began above its joint, wide and open, and stood out of the body's side: now it starts buried in the body, drawn in toward the middle, and swells into the thigh or shoulder just below the belly)
                sk.tube([
                    { c: V(g, ix, 0.22 * K.h, 0), r: lr * 0.9, w: [[body, 1]], col: fur },
                    { c: V(g, ix * 0.4, 0.02 * K.h, 0), r: lr * 1.35, w: [[body, 0.6], [g, 0.4]], col: fur },
                    { c: V(g, 0, -0.17 * K.h, 0), r: lr * 1.2, w: [[g, 1]], col: fur },   // the thigh or shoulder, under the belly
                    { c: V(g, 0, -0.45 * K.h, 0), r: lr * 0.85, w: [[g, 1]], col: fur },
                    { c: V(g, 0, -0.7 * K.h, 0), r: lr * 0.8, w: [[g, 1]], col: fur },
                    { c: V(g, 0, -0.74 * K.h, 0.01), r: lr * 0.95, w: [[g, 1]], col: dark },   // the hoof or paw
                    { c: V(g, 0, -0.78 * K.h, 0.015), r: lr, w: [[g, 1]], col: dark },
                ], { seg: 6, cap: true });
            }
            sk.section('tail');
            if (tail) {
                const T = (pts, col = fur) => sk.tube(pts.map(([x, y, z, rr, c2]) => ({ c: V(tail, x, y, z), r: rr, w: [[tail, 1]], col: c2 ?? col })), { seg: 6, cap: true });
                if (K.tail === 'brush') T([[0, 0, 0.02, 0.05], [0, -0.08, -0.16, 0.085], [0, -0.16, -0.34, 0.07], [0, -0.2, -0.44, 0.02, belly]]);
                else if (K.tail === 'thin') T([[0, 0, 0, 0.022], [0, -K.len * 0.3, -K.len * 0.12, 0.015], [0, -K.len * 0.5, -K.len * 0.16, 0.025, dark]]);
                else if (K.tail === 'curl') T([[0, 0, 0, 0.015], [0, 0.04, -0.04, 0.013], [0, 0.07, 0.0, 0.012], [0, 0.04, 0.03, 0.01]]);
                else if (K.tail === 'puff') T([[0, 0, 0.0, 0.03, belly], [0, 0.01, -0.04, 0.055, belly], [0, 0.01, -0.07, 0.02, belly]]);
                else T([[0, 0, 0.02, 0.05], [0, -0.02, -0.05, 0.045], [0, -0.04, -0.08, 0.015]]);   // a stub
            }
        }
        if (dry) return { points: sk.build().points, bones };
        return { mesh: sk.build() };
    };
    const out = buildLayered(root, kind, gen);
    if (K.patches && out?.mesh) paintPatches(out.mesh, root, body, K, hex(K.patches), fur, head, parts.legs.map(l => l.g));
    return out;
}

// A cow's patches (2026-11-26): a few irregular spots on the body and the face — a face whose middle falls inside a spot
// (an ellipsoid with a wobbling edge) takes the patch colour; only the coat's own faces (not the hooves, the nose, the horns)
function paintPatches(mesh, root, body, K, patchC, furC, head = null, legs = []) {
    const hl = K.len * 0.5, r = K.h * 0.38, hs = K.h * 0.34;
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), frame = g => inv.clone().multiply(g.matrixWorld);
    const toRoot = frame(body);
    const spots = [[0.85, 0.25, 0.35, 0.5], [-0.85, 0.35, -0.35, 0.55], [0.1, 0.95, -0.05, 0.42], [0.75, -0.05, -0.7, 0.38], [-0.75, 0.05, 0.6, 0.4], [-0.3, 0.8, 0.85, 0.3], [0.5, 0.9, -0.85, 0.33]]
        .map(([x, y, z, k]) => ({ c: new THREE.Vector3(x * r, y * r, z * hl).applyMatrix4(toRoot), k: k * r * 0.8 }));
    // on the head too (2026-11-26: "add spots on the head too"): round one eye, one on the crown — in the head's own frame
    if (head) { const H = frame(head); for (const [x, y, z, k] of [[0.55, 0.3, 0.35, 0.42], [-0.2, 0.7, -0.1, 0.38], [-0.6, -0.1, 0.0, 0.3]]) spots.push({ c: new THREE.Vector3(x * hs, y * hs, z * hs).applyMatrix4(H), k: k * hs }); }
    // and on the legs ("on the legs too"): not all alike — high on one, low on another, none on the last
    const legSpots = [[-0.12, 0.6], [-0.55, 0.5], [-0.2, 0.55], null];
    legs.forEach((g, i) => { const sp = legSpots[i % legSpots.length]; if (sp) spots.push({ c: new THREE.Vector3(K.legs * 0.25 * (i % 2 ? -1 : 1), sp[0] * K.h, 0).applyMatrix4(frame(g)), k: sp[1] * K.h * 0.38 }); });
    const pos = mesh.geometry.attributes.position, col = mesh.geometry.attributes.color, fur = new THREE.Color(furC), patch = new THREE.Color(patchC);
    const m = new THREE.Vector3(), a = new THREE.Color();
    // by quads (a loft's faces come in pairs): both triangles of a face take the same colour — no zigzag
    for (let i = 0; i + 6 <= pos.count; i += 6) {
        a.fromBufferAttribute(col, i); if (Math.abs(a.r - fur.r) + Math.abs(a.g - fur.g) + Math.abs(a.b - fur.b) > 0.03) continue;   // (not the coat)
        m.set(0, 0, 0); for (let k = 0; k < 6; k++) m.x += pos.getX(i + k) / 6, m.y += pos.getY(i + k) / 6, m.z += pos.getZ(i + k) / 6;
        const inSpot = spots.some(sp => { const d = m.distanceTo(sp.c), wob = 1 + 0.25 * Math.sin(m.x * 37 + m.z * 19) + 0.18 * Math.sin(m.y * 27 - m.z * 31); return d < sp.k * wob; });
        if (inSpot) for (let k = 0; k < 6; k++) col.setXYZ(i + k, patch.r, patch.g, patch.b);
    }
    col.needsUpdate = true;
    void hs;
}
