// Character model v3 (2026-11-27, the user: "start working on model v3, I want it to look as close as possible to the ref
// image" — docs/3d/characters/base_mesh_reference.jpg): a hand-placed low-poly body, not lofted rings. Few loops, set only
// at the landmarks (the crotch, the glutes, the waist, the pec's lower edge, the armpit, the shoulder line, the neck; the
// knee, the calf, the ankle; the deltoid, the biceps, the elbow, the wrist), each loop's points at anatomical corners (the
// front's centre, the pec or abs edge, the side, the shoulder blade, the spine) — so the faces are big flat planes that
// follow the anatomy, as on the sheet. Every number below was measured from the sheet (its male figure, 507 px = 1.80 m:
// the front view's outline row by row, the side view's depths) — tools: tools/models/.
// Modelled in the sheet's A-pose and bound to the skeleton in it (the arms rotated out ~29° while the mesh is made), so the
// animations work as on every body. The skeleton's joints are set to the sheet's proportions for a v3 body.
// buildBodyV3(ctx, { sex }) → { mesh } — through the creatures' buildLayered (its layer: v3_male / v3_female), so the
// Sculptor shapes it like any body.
import * as THREE from 'three';
import { createSkin, blend } from '../v2/skin.js';
import { buildLayered } from '../v2/creatures.js';

const SKIN = '#e2b590', SHORTS = '#3c3530', HAIR = '#2a1f17', DARK = '#1a1410', BROW = '#2a1f17';
const ARM_OUT = 0.5;   // the sheet's A-pose: the arms ~29° out from the body

// The male, from the sheet. Torso loops: [y, half-width, front z, back z] (m, sole at 0).
const TORSO_M = [
    [0.72, 0.165, 0.07, 0.095], [0.8, 0.198, 0.09, 0.128], [0.88, 0.205, 0.1, 0.135], [0.97, 0.18, 0.1, 0.115],
    [1.06, 0.152, 0.098, 0.1], [1.15, 0.163, 0.108, 0.104], [1.23, 0.184, 0.127, 0.11], [1.31, 0.199, 0.134, 0.124],
    [1.39, 0.198, 0.112, 0.12], [1.45, 0.158, 0.08, 0.1], [1.5, 0.082, 0.06, 0.066], [1.55, 0.064, 0.055, 0.056],
];
// Head loops: [y, half-width, front z, back z]; the chin stands out in front of the jaw
const HEAD_M = [[1.565, 0.058, 0.094, 0.046], [1.61, 0.071, 0.1, 0.086], [1.66, 0.077, 0.101, 0.098], [1.715, 0.079, 0.098, 0.104], [1.765, 0.066, 0.074, 0.088]];
const TOP_M = 1.8;

export function buildBodyV3(ctx, { sex = 'male' } = {}) {
    const { root, body, hips, spine, head, arms, legs } = ctx;
    // the skeleton to the sheet's proportions (spine at 1.01: hips 0.95 + 0.06)
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
        arms[side].upper.position.set(s * 0.25, 0.32, 0); arms[side].fore.position.y = -0.31;
        legs[side].thigh.position.set(s * 0.108, -0.09, 0); legs[side].shin.position.y = -0.347;
    }
    head.position.set(0, 0.54, 0.008);
    const bones = [hips, spine, head, arms.L.upper, arms.L.fore, arms.R.upper, arms.R.fore, legs.L.thigh, legs.L.shin, legs.R.thigh, legs.R.shin];
    // made in the A-pose: the arms out while the mesh is built and bound, then down again
    const setPose = k => { arms.L.upper.rotation.set(0, 0, ARM_OUT * k); arms.R.upper.rotation.set(0, 0, -ARM_OUT * k); for (const s of ['L', 'R']) arms[s].fore.rotation.set(0, 0, 0); };
    setPose(1);
    const gen = ({ edits = null, dry = false, topo = null } = {}) => {
        root.updateMatrixWorld(true);
        const sk = createSkin(root, bones, { edits, dry, topo }), V = (g, x, y, z) => sk.at(g, x, y, z);
        const torsoW = y => (y > 1.56 ? [[head, 1]] : y > 1.5 ? [[spine, 0.5], [head, 0.5]] : y > 1.08 ? [[spine, 1]] : y > 0.96 ? blend(hips, spine, (y - 0.96) / 0.12) : [[hips, 1]]);
        // a torso or head loop: half its outline from the front's centre to the back's, at anatomical corners (ringPts mirrors it)
        const loop = (y, w, f, b, pts, col, wts) => {
            const half = pts(w, f, b), all = [...half]; for (let i = half.length - 2; i >= 1; i--) all.push([-half[i][0], half[i][1]]);
            return { c: new THREE.Vector3(0, y, 0), pts: all.map(([x, z]) => [x, z, 0]), w: wts, col };
        };
        // torso corners: the front's centre, the pec / abs edge, the side front, the side, the side back, the shoulder blade, the spine (a groove)
        const T = (w, f, b) => [[0, f], [0.52 * w, 0.97 * f], [0.9 * w, 0.55 * f], [w, 0], [0.9 * w, -0.62 * b], [0.5 * w, -0.98 * b], [0, -0.93 * b]];
        sk.section('torso');
        sk.loft(TORSO_M.map(([y, w, f, b]) => loop(y, w, f, b, T, y < 0.99 ? SHORTS : SKIN, torsoW(y))), { mat: 'double', capStart: true });
        // the head: the face's centre, the cheek, the side front (the cheekbone), the side back (behind the ear), the back corner, the back
        const Hc = (w, f, b) => [[0, f], [0.58 * w, 0.9 * f], [w, 0.25 * f], [0.96 * w, -0.4 * b], [0.55 * w, -0.92 * b], [0, -b]];
        sk.section('head');
        const N = TORSO_M.at(-1);   // (the neck's top loop has 12 points; the head's 10 — joined by its own band below)
        const headRings = HEAD_M.map(([y, w, f, b]) => loop(y, w, f, b, Hc, SKIN, [[head, 1]]));
        sk.loft([loop(N[0] + 0.004, N[1], N[2], N[3], Hc, SKIN, [[spine, 0.4], [head, 0.6]]), ...headRings, { c: new THREE.Vector3(0, TOP_M, -0.01), pts: headRings.at(-1).pts.map(([x, z]) => [x * 0.35, z * 0.35, 0]), w: [[head, 1]], col: SKIN }], { mat: 'double', cap: true });
        sk.section('nose');
        { const P = (x, y, z) => ({ p: new THREE.Vector3(x, y, z), w: [[head, 1]] }), c = new THREE.Vector3(0, 1.67, 0.05);
          const br = P(0, 1.705, 0.1), tip = P(0, 1.66, 0.124), l = P(0.019, 1.652, 0.1), r = P(-0.019, 1.652, 0.1), u = P(0, 1.648, 0.106);
          sk.poly([br, l, tip], SKIN, c); sk.poly([br, tip, r], SKIN, c); sk.poly([tip, l, u], SKIN, c); sk.poly([tip, u, r], SKIN, c); }
        sk.section('ears');
        for (const s of [1, -1]) { const P = (y, z, x = 0.079) => ({ p: new THREE.Vector3(s * x, y, z), w: [[head, 1]] }); const c = new THREE.Vector3(s * 0.05, 1.66, -0.01);
            const a = P(1.69, 0.0), b = P(1.695, -0.03, 0.084), d = P(1.645, -0.028, 0.083), e = P(1.635, 0.0);
            sk.poly([a, b, d, e], SKIN, c); sk.poly([a, e, P(1.66, 0.005, 0.072)], SKIN, c); }
        // the arms, in the A-pose: rings square to the bone (its −y), measured along the sheet's arm — deltoid, biceps, elbow, forearm, wrist
        sk.section('arms');
        const ring = (g, y, rx, rz, n, w, col, oz = 0, ox = 0) => ({ c: V(g, ox, y, oz), pts: Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, c = V(g, ox, y, oz), p = V(g, ox + Math.sin(a) * rx, y, oz + Math.cos(a) * rz); return [p.x - c.x, p.z - c.z, p.y - c.y]; }), w, col });
        for (const s of ['L', 'R']) {
            const up = arms[s].upper, fo = arms[s].fore, sx = s === 'L' ? 1 : -1;
            sk.loft([
                ring(up, 0.07, 0.05, 0.06, 6, [[spine, 0.7], [up, 0.3]], SKIN, 0, -sx * 0.03),   // (buried in the shoulder)
                ring(up, -0.02, 0.072, 0.066, 6, [[spine, 0.25], [up, 0.75]], SKIN, 0.004, sx * 0.012),   // the deltoid
                ring(up, -0.12, 0.064, 0.06, 6, [[up, 1]], SKIN, 0.006),   // the biceps
                ring(up, -0.25, 0.048, 0.047, 6, [[up, 1]], SKIN),
                ring(fo, 0.0, 0.046, 0.043, 6, [[up, 0.5], [fo, 0.5]], SKIN),   // the elbow
                ring(fo, -0.06, 0.05, 0.044, 6, [[fo, 1]], SKIN, 0.004),   // the forearm's swell
                ring(fo, -0.21, 0.034, 0.025, 6, [[fo, 1]], SKIN),   // the wrist
                ring(fo, -0.25, 0.042, 0.018, 6, [[fo, 1]], SKIN, 0.004),   // the hand's back
                ring(fo, -0.31, 0.04, 0.015, 6, [[fo, 1]], SKIN, 0.006),
                ring(fo, -0.335, 0.026, 0.01, 6, [[fo, 1]], SKIN, 0.008),   // the fingertips
            ], { mat: 'double', cap: true });
            sk.tube([{ c: V(fo, sx * -0.006, -0.235, 0.03), r: 0.012, w: [[fo, 1]], col: SKIN }, { c: V(fo, sx * -0.004, -0.27, 0.045), r: 0.01, w: [[fo, 1]], col: SKIN }, { c: V(fo, sx * -0.002, -0.29, 0.048), r: 0.007, w: [[fo, 1]], col: SKIN }], { seg: 5, cap: true, mat: 'double' });   // the thumb
        }
        // the legs: thigh (shorts to mid-thigh), knee, calf (swelling back), ankle; the foot a block heel to toe
        sk.section('legs');
        for (const s of ['L', 'R']) {
            const th = legs[s].thigh, sh = legs[s].shin, sx = s === 'L' ? 1 : -1;
            sk.loft([
                ring(th, 0.09, 0.08, 0.09, 8, [[hips, 1]], SHORTS, 0, -sx * 0.04),   // (buried in the hips)
                ring(th, -0.02, 0.098, 0.104, 8, [[hips, 0.4], [th, 0.6]], SHORTS),
                ring(th, -0.14, 0.09, 0.099, 8, [[th, 1]], SHORTS),
                ring(th, -0.2, 0.086, 0.094, 8, [[th, 1]], SKIN),   // below the shorts
                ring(th, -0.29, 0.07, 0.078, 8, [[th, 1]], SKIN, 0.004),
                ring(sh, 0.0, 0.06, 0.066, 8, [[th, 0.5], [sh, 0.5]], SKIN, 0.006),   // the knee
                ring(sh, -0.1, 0.066, 0.078, 8, [[sh, 1]], SKIN, -0.022),   // the calf, full behind
                ring(sh, -0.22, 0.05, 0.058, 8, [[sh, 1]], SKIN, -0.012),
                ring(sh, -0.36, 0.036, 0.044, 8, [[sh, 1]], SKIN, -0.01),   // the ankle
            ], { mat: 'double' });
            // the foot: rings across it, from the heel to the toes (flat sole on the ground)
            const F = (z, w, h, col = SKIN) => { const c = V(sh, 0, -0.453 + h / 2, z); return { c, pts: [[0, h / 2], [w, h * 0.35], [w * 1.05, -h / 2], [0, -h / 2], [-w * 1.05, -h / 2], [-w, h * 0.35]].map(([x, y]) => [sx * x * 0 + x, 0, y]), w: [[sh, 1]], col }; };
            const foot = [F(-0.12, 0.034, 0.075), F(-0.06, 0.04, 0.095), F(0.02, 0.045, 0.072), F(0.1, 0.048, 0.045), F(0.15, 0.042, 0.03)];
            sk.loft(foot, { mat: 'double', cap: true, capStart: true });
        }
        // the hair, cut short (the sheet): a cap over the crown and the back, the hairline high at the front
        sk.section('hair');
        const HR = [[1.67, 1.075, 0.0], [1.715, 1.08, 0.022], [1.765, 1.09, 0.012], [1.795, 0.7, 0.0]];
        sk.loft(HR.map(([y, k, lift], i) => {
            const base = HEAD_M[Math.min(HEAD_M.length - 1, 2 + i)] ?? HEAD_M.at(-1), [, w, f, b] = base;
            const half = Hc(w * k, f * k, b * k), all = [...half]; for (let j = half.length - 2; j >= 1; j--) all.push([-half[j][0], half[j][1]]);
            return { c: new THREE.Vector3(0, y, -0.005), pts: all.map(([x, z]) => [x, z, z > 0.04 ? lift + (0.745 - y > 0 ? 0 : 0) + (i < 2 ? 0.05 * (z / f) : 0) : 0]), w: [[head, 1]], col: HAIR };
        }), { mat: 'double', cap: true });
        // the eyes and brows: small dark planes on the face
        sk.section('face');
        for (const s of [1, -1]) {
            const P = (x, y, z) => ({ p: new THREE.Vector3(s * x, y, z), w: [[head, 1]] }), c = new THREE.Vector3(0, 1.67, 0);
            sk.poly([P(0.022, 1.68, 0.098), P(0.046, 1.682, 0.09), P(0.046, 1.672, 0.09), P(0.022, 1.672, 0.098)], DARK, c);
            sk.poly([P(0.016, 1.699, 0.101), P(0.052, 1.703, 0.092), P(0.052, 1.695, 0.092), P(0.016, 1.692, 0.101)], BROW, c);
        }
        if (dry) return { points: sk.build().points, bones };
        return { mesh: sk.build() };
    };
    const out = buildLayered(root, `v3_${sex}`, gen);
    setPose(0);   // (the arms down again: the mesh follows them)
    if (out?.mesh) { out.mesh.userData.editSex = sex; out.mesh.userData.layers = [`v3_${sex}`]; out.mesh.name = `v3_${sex}`; }
    return out;
}
