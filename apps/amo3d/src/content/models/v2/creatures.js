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
