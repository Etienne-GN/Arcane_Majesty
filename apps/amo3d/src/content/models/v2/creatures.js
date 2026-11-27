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
