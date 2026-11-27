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
const TORSO_M = [   // (2026-11-27, second pass: re-fitted to the sheet's measured widths — the V from chest to waist, the armpit at 1.23 m,
    // the trapezius sloping from a slim neck out to the shoulders; it was a box with a pillar of a neck)
    [0.72, 0.165, 0.07, 0.095], [0.84, 0.205, 0.095, 0.135], [0.97, 0.17, 0.1, 0.115],   // the crotch, the glutes, the hip bones
    [1.09, 0.15, 0.098, 0.1], [1.18, 0.172, 0.112, 0.106],   // the waist, the lower ribs (the abs)
    [1.232, 0.19, 0.11, 0.113], [1.25, 0.196, 0.137, 0.116],   // the pec's lower edge: a step — the pec stands out over the ribs (its own plane)
    [1.33, 0.212, 0.132, 0.125], [1.39, 0.215, 0.108, 0.12],   // the chest at its fullest; under the collarbone
    [1.41, 0.205, 0.088, 0.118],   // the collarbone's step
    [1.465, 0.15, 0.065, 0.09], [1.495, 0.085, 0.058, 0.07], [1.525, 0.07, 0.056, 0.06],   // the trapezius sloping in to a slim neck
];
// Head loops: [y, half-width, front z, back z] — an oval: the jaw tapering to a narrow chin, full at the cheekbones and temples
const HEAD_M = [[1.548, 0.045, 0.1, 0.045], [1.585, 0.07, 0.108, 0.085], [1.635, 0.085, 0.11, 0.1], [1.69, 0.09, 0.108, 0.113], [1.745, 0.085, 0.095, 0.11], [1.785, 0.065, 0.07, 0.085]];
const TOP_M = 1.805;

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
          const br = P(0, 1.7, 0.112), tip = P(0, 1.652, 0.138), l = P(0.021, 1.643, 0.112), r = P(-0.021, 1.643, 0.112), u = P(0, 1.64, 0.118);
          sk.poly([br, l, tip], SKIN, c); sk.poly([br, tip, r], SKIN, c); sk.poly([tip, l, u], SKIN, c); sk.poly([tip, u, r], SKIN, c); }
        sk.section('ears');
        for (const s of [1, -1]) { const P = (y, z, x = 0.09) => ({ p: new THREE.Vector3(s * x, y, z), w: [[head, 1]] }); const c = new THREE.Vector3(s * 0.05, 1.66, -0.01);
            const a = P(1.685, -0.005), b = P(1.69, -0.04, 0.096), d = P(1.635, -0.036, 0.095), e = P(1.625, -0.005);
            sk.poly([a, b, d, e], SKIN, c); sk.poly([a, e, P(1.655, 0.0, 0.082)], SKIN, c); }
        // the arms, in the A-pose: rings square to the bone (its −y), measured along the sheet's arm — deltoid, biceps, elbow, forearm, wrist
        sk.section('arms');
        const ring = (g, y, rx, rz, n, w, col, oz = 0, ox = 0) => ({ c: V(g, ox, y, oz), pts: Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, c = V(g, ox, y, oz), p = V(g, ox + Math.sin(a) * rx, y, oz + Math.cos(a) * rz); return [p.x - c.x, p.z - c.z, p.y - c.y]; }), w, col });
        for (const s of ['L', 'R']) {
            const up = arms[s].upper, fo = arms[s].fore, sx = s === 'L' ? 1 : -1;
            sk.loft([
                ring(up, 0.085, 0.03, 0.045, 6, [[spine, 0.75], [up, 0.25]], SKIN, 0, -sx * 0.035),   // the deltoid's cap, rounding over the shoulder
                ring(up, 0.03, 0.068, 0.07, 6, [[spine, 0.45], [up, 0.55]], SKIN, 0.002, sx * 0.004),
                ring(up, -0.05, 0.073, 0.066, 6, [[up, 1]], SKIN, 0.004, sx * 0.01),   // the deltoid, full at the side
                ring(up, -0.13, 0.06, 0.058, 6, [[up, 1]], SKIN, 0.008),   // the biceps
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
                ring(th, -0.02, 0.095, 0.104, 8, [[hips, 0.4], [th, 0.6]], SHORTS),
                ring(th, -0.14, 0.088, 0.098, 8, [[th, 1]], SHORTS),
                ring(th, -0.2, 0.083, 0.092, 8, [[th, 1]], SKIN),   // below the shorts
                ring(th, -0.29, 0.068, 0.076, 8, [[th, 1]], SKIN, 0.004),   // above the knee
                ring(sh, 0.0, 0.064, 0.068, 8, [[th, 0.5], [sh, 0.5]], SKIN, 0.008),   // the knee
                ring(sh, -0.1, 0.077, 0.086, 8, [[sh, 1]], SKIN, -0.022),   // the calf, full behind and at the sides (the sheet: ~16 cm across)
                ring(sh, -0.22, 0.056, 0.062, 8, [[sh, 1]], SKIN, -0.012),
                ring(sh, -0.36, 0.04, 0.046, 8, [[sh, 1]], SKIN, -0.01),   // the ankle
            ], { mat: 'double' });
            // the foot: rings across it, from the heel to the toes (flat sole on the ground)
            const F = (z, w, h, col = SKIN) => { const c = V(sh, 0, -0.453 + h / 2, z); return { c, pts: [[0, h / 2], [w, h * 0.35], [w * 1.05, -h / 2], [0, -h / 2], [-w * 1.05, -h / 2], [-w, h * 0.35]].map(([x, y]) => [sx * x * 0 + x, 0, y]), w: [[sh, 1]], col }; };
            const foot = [F(-0.1, 0.03, 0.065), F(-0.05, 0.034, 0.08), F(0.02, 0.038, 0.06), F(0.09, 0.04, 0.038), F(0.14, 0.034, 0.024)];   // (smaller and flatter: 2026-11-27)
            sk.loft(foot, { mat: 'double', cap: true, capStart: true });
        }
        // the hair, cut short (the sheet): a cap over the crown and the back, the hairline high at the front
        sk.section('hair');
        const HR = [[1.665, 1.07, 0.0], [1.712, 1.075, 0.022], [1.765, 1.085, 0.012], [1.812, 0.62, 0.0]];
        sk.loft(HR.map(([y, k, lift], i) => {
            const base = HEAD_M[Math.min(HEAD_M.length - 1, 2 + i)] ?? HEAD_M.at(-1), [, w, f, b] = base;
            const half = Hc(w * k, f * k, b * k), all = [...half]; for (let j = half.length - 2; j >= 1; j--) all.push([-half[j][0], half[j][1]]);
            return { c: new THREE.Vector3(0, y, -0.005), pts: all.map(([x, z]) => [x, z, z > 0.04 ? lift + (0.745 - y > 0 ? 0 : 0) + (i < 2 ? 0.05 * (z / f) : 0) : 0]), w: [[head, 1]], col: HAIR };
        }), { mat: 'double', cap: true });
        // the eyes and brows: small dark planes on the face
        sk.section('face');
        for (const s of [1, -1]) {
            const P = (x, y, z) => ({ p: new THREE.Vector3(s * x, y, z), w: [[head, 1]] }), c = new THREE.Vector3(0, 1.67, 0);
            sk.poly([P(0.024, 1.674, 0.111), P(0.05, 1.676, 0.103), P(0.05, 1.666, 0.103), P(0.024, 1.666, 0.111)], DARK, c);
            sk.poly([P(0.017, 1.694, 0.114), P(0.058, 1.698, 0.103), P(0.058, 1.69, 0.103), P(0.017, 1.687, 0.114)], BROW, c);
        }
        if (dry) return { points: sk.build().points, bones };
        return { mesh: sk.build() };
    };
    const out = buildLayered(root, `v3_${sex}`, gen);
    if (out?.mesh) addOutline(out.mesh);
    setPose(0);   // (the arms down again: the mesh follows them)
    if (out?.mesh) { out.mesh.userData.editSex = sex; out.mesh.userData.layers = [`v3_${sex}`]; out.mesh.name = `v3_${sex}`; }
    return out;
}

// The outline (the sheet's thin dark line round every form): the same skinned mesh drawn again, its back faces only, pushed
// out along each point's averaged normal (so the line has no cracks at the flat faces' edges), in a dark ink.
const INK = 0.006;
function addOutline(mesh) {
    const g = mesh.geometry, pos = g.attributes.position, n = new Float32Array(pos.count * 3), acc = new Map(), key = i => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`;
    g.computeVertexNormals();
    const nor = g.attributes.normal;
    for (let i = 0; i < pos.count; i++) { const k = key(i), a = acc.get(k) ?? [0, 0, 0]; a[0] += nor.getX(i); a[1] += nor.getY(i); a[2] += nor.getZ(i); acc.set(k, a); }
    for (let i = 0; i < pos.count; i++) { const a = acc.get(key(i)), l = Math.hypot(...a) || 1; n.set([a[0] / l, a[1] / l, a[2] / l], i * 3); }
    const og = new THREE.BufferGeometry();
    for (const name of ['position', 'skinIndex', 'skinWeight']) og.setAttribute(name, g.attributes[name]);
    og.setAttribute('normal', new THREE.BufferAttribute(n, 3));
    const mat = new THREE.MeshBasicMaterial({ color: 0x1a1210, side: THREE.BackSide });
    mat.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\ntransformed += normalize(objectNormal) * ${INK.toFixed(4)};`); };
    const o = new THREE.SkinnedMesh(og, mat);
    o.frustumCulled = false; o.userData.keep = o.userData.v2 = true; o.userData.outline = true;
    mesh.parent.add(o); o.bind(mesh.skeleton, mesh.bindMatrix);
}
