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

// a thin piece with thickness (an ear): its outline made a closed slab
function slabPoly(sk, pts, col, thick, centre) {
    const P = pts.map(o => o.p), n = new THREE.Vector3().subVectors(P[1], P[0]).cross(new THREE.Vector3().subVectors(P[2], P[0])).normalize().multiplyScalar(thick / 2);
    const f = pts.map(o => ({ p: o.p.clone().add(n), w: o.w })), b = pts.map(o => ({ p: o.p.clone().sub(n), w: o.w }));
    sk.poly(f, col, centre); sk.poly(b, col, centre); for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; sk.poly([f[i], f[j], b[j], b[i]], col, centre); }
}
const SKIN = '#e2b590', SHORTS = '#3c3530', HAIR = '#2a1f17', DARK = '#1a1410', BROW = '#2a1f17';
const ARM_OUT = 0.5;   // the sheet's A-pose: the arms ~29° out from the body

// The male, from the sheet. Torso loops: [y, half-width, front z, back z] (m, sole at 0).
const TORSO_M = [   // (2026-11-27, second pass: re-fitted to the sheet's measured widths — the V from chest to waist, the armpit at 1.23 m,
    // the trapezius sloping from a slim neck out to the shoulders; it was a box with a pillar of a neck)
    [0.72, 0.165, 0.07, 0.095], [0.84, 0.205, 0.095, 0.135, [0.01, 0.01, 0, 0, -0.015, -0.03, -0.025]], [0.97, 0.17, 0.1, 0.115, [0.02, 0.012, 0, 0, 0, 0, 0]],   // (the glute fold lower behind; the shorts' waist dipping at the front)   // the crotch, the glutes, the hip bones
    [1.09, 0.15, 0.098, 0.1], [1.18, 0.172, 0.112, 0.106],   // the waist, the lower ribs (the abs)
    [1.232, 0.19, 0.11, 0.113, [-0.03, -0.016, 0.022, 0.04, 0.02, 0, 0]], [1.25, 0.196, 0.137, 0.116, [-0.03, -0.016, 0.022, 0.04, 0.02, 0, 0]],   // (the pec's edge rising from the breastbone to the armpit)   // the pec's lower edge: a step — the pec stands out over the ribs (its own plane)
    [1.33, 0.212, 0.132, 0.125], [1.39, 0.215, 0.108, 0.12],   // the chest at its fullest; under the collarbone
    [1.41, 0.205, 0.088, 0.118, [-0.008, 0.004, 0.014, 0.01, 0, 0, 0]],   // (the collarbone rising outward)   // the collarbone's step
    [1.465, 0.15, 0.065, 0.09, [0.018, 0.008, -0.012, -0.03, -0.012, 0.004, 0.01]], [1.495, 0.085, 0.058, 0.07, [0.008, 0.004, 0, -0.01, 0, 0.004, 0.006]],   // (the trapezius slanting down from the neck to the shoulder) [1.525, 0.07, 0.056, 0.06],   // the trapezius sloping in to a slim neck
];
// The head (2026-11-27, hand-placed after the sheet): levels from the chin to the crown, each half a loop of 7 corners —
// the face's centre, beside it (the eye's socket at the eye level), the cheekbone's front, the side front, behind the ear,
// the back corner, the back — [x, z, dy] (dy: that corner's own height: the jaw rising from the chin to the ear).
const HEAD_LV = [
    [1.55, [[0, 0.096, -0.006], [0.024, 0.093, -0.004], [0.044, 0.07, 0.006], [0.054, 0.025, 0.018], [0.05, -0.02, 0.032], [0.034, -0.038, 0.034], [0, -0.042, 0.034]]],   // the chin; the jaw's line rising to the ear
    [1.585, [[0, 0.108, 0], [0.03, 0.105, 0], [0.058, 0.086, 0.004], [0.075, 0.034, 0.01], [0.076, -0.03, 0.012], [0.052, -0.076, 0.008], [0, -0.088, 0.008]]],   // the mouth; the jaw's angle
    [1.625, [[0, 0.112, 0], [0.03, 0.11, 0], [0.066, 0.094, 0], [0.086, 0.038, 0], [0.086, -0.042, 0], [0.061, -0.096, 0], [0, -0.106, 0]]],   // under the nose; the cheeks
    [1.666, [[0, 0.116, 0], [0.028, 0.097, 0], [0.062, 0.1, 0.002], [0.089, 0.044, 0], [0.089, -0.05, 0], [0.063, -0.106, 0], [0, -0.116, 0]]],   // the eyes: their sockets set in; the cheekbones
    [1.7, [[0, 0.113, 0], [0.03, 0.11, 0.002], [0.062, 0.099, 0.004], [0.089, 0.05, 0], [0.089, -0.056, 0], [0.065, -0.111, 0], [0, -0.119, 0]]],   // the brow ridge, standing forward
    [1.745, [[0, 0.1, 0], [0.035, 0.097, 0], [0.066, 0.085, 0], [0.086, 0.041, 0], [0.085, -0.06, 0], [0.061, -0.109, 0], [0, -0.116, 0]]],   // the forehead
    [1.785, [[0, 0.07, 0], [0.035, 0.068, 0], [0.06, 0.05, 0], [0.071, 0.002, 0], [0.069, -0.06, 0], [0.046, -0.09, 0], [0, -0.096, 0]]],   // the crown
];
const TOP_M = 1.806;
// (2026-11-27, "it is still too short": re-measured on the sheet — sole y 596, hair top 89 — the chin is at 1.51, the mouth
// 1.56, the nose's tip 1.59, the eyes 1.65, the hairline 1.71: the lower face is longer than the levels above, which sit 4 cm
// high; and the face is narrower (half 0.074 at the cheeks). The levels are kept as drawn and mapped: HY their heights
// (the chin down, the face stretched), HX their widths.)
const HY_A = [[1.499, 1.499], [1.55, 1.51], [1.668, 1.649], [1.806, 1.785], [1.9, 1.879]];
function HY(y) { for (let k = 0; k < HY_A.length - 1; k++) { const [a0, b0] = HY_A[k], [a1, b1] = HY_A[k + 1]; if (y <= a1 || k === HY_A.length - 2) return b0 + (b1 - b0) * (y - a0) / (a1 - a0); } }
const HX = y => (y >= 1.54 ? 0.86 : y <= 1.5 ? 1 : 1 - 0.14 * (y - 1.5) / 0.04);
// the head's surface at a level and a corner (between the levels: interpolated) — the hair is laid over it
function headAt(y, i) {
    for (let k = 0; k < HEAD_LV.length - 1; k++) { const [y0, a] = HEAD_LV[k], [y1, b] = HEAD_LV[k + 1]; if (y <= y1 || k === HEAD_LV.length - 2) { const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0))); return [a[i][0] + (b[i][0] - a[i][0]) * t, a[i][1] + (b[i][1] - a[i][1]) * t]; } }
    return HEAD_LV.at(-1)[1][i];
}

export function buildBodyV3(ctx, { sex = 'male' } = {}) {
    const { root, body, hips, spine, head, arms, legs } = ctx;
    // the skeleton to the sheet's proportions (spine at 1.01: hips 0.95 + 0.06)
    for (const [s, side] of [[1, 'L'], [-1, 'R']]) {
        arms[side].upper.position.set(s * 0.25, 0.32, 0); arms[side].fore.position.y = -0.31;
        legs[side].thigh.position.set(s * 0.108, -0.09, 0); legs[side].shin.position.y = -0.347;
    }
    head.position.set(0, 0.54, 0.008);
    // (2026-11-27: no longer scaled to 95% — "he's too tall" was the feet floating 6 cm up, fixed; at 95% he stood 1.72 m
    // beside the v2 male's 1.885 m: "the whole male model is too short". The sheet's own 1.80 m.)
    const bones = [hips, spine, head, arms.L.upper, arms.L.fore, arms.R.upper, arms.R.fore, legs.L.thigh, legs.L.shin, legs.R.thigh, legs.R.shin];
    // made in the A-pose: the arms out while the mesh is built and bound, then down again
    const setPose = k => { arms.L.upper.rotation.set(0, 0, ARM_OUT * k); arms.R.upper.rotation.set(0, 0, -ARM_OUT * k); for (const s of ['L', 'R']) arms[s].fore.rotation.set(0, 0, 0); };
    setPose(1);
    const gen = ({ edits = null, dry = false, topo = null } = {}) => {
        root.updateMatrixWorld(true);
        const sk = createSkin(root, bones, { edits, dry, topo }), V = (g, x, y, z) => sk.at(g, x, y, z), B = (x, y, z) => sk.at(body, x, y, z), H = (x, y, z) => B(x * HX(y), HY(y), z);   // (H: a head point, mapped — see HY)   // (B: the body's own frame — the figure scales as one with the body's height)
        const torsoW = y => (y > 1.56 ? [[head, 1]] : y > 1.5 ? [[spine, 0.5], [head, 0.5]] : y > 1.08 ? [[spine, 1]] : y > 0.96 ? blend(hips, spine, (y - 0.96) / 0.12) : [[hips, 1]]);
        // a torso or head loop: half its outline from the front's centre to the back's, at anatomical corners (ringPts mirrors it)
        // (dy: each corner's own height — so a plane's edge can run diagonally along the anatomy, not round in a band)
        const loop = (y, w, f, b, pts, col, wts, dy = null) => {
            const half = pts(w, f, b).map(([x, z], i) => [x, z, dy?.[i] ?? 0]), all = [...half]; for (let i = half.length - 2; i >= 1; i--) all.push([-half[i][0], half[i][1], half[i][2]]);
            const c = B(0, y, 0); return { c, pts: all.map(([x, z, d]) => { const p = B(x, y + d, z); return [p.x - c.x, p.z - c.z, p.y - c.y]; }), w: wts, col };
        };
        // torso corners: the front's centre, the pec / abs edge, the side front, the side, the side back, the shoulder blade, the spine (a groove)
        const T = (w, f, b) => [[0, f], [0.52 * w, 0.97 * f], [0.9 * w, 0.55 * f], [w, 0], [0.9 * w, -0.62 * b], [0.5 * w, -0.98 * b], [0, -0.93 * b]];
        sk.section('torso');
        sk.loft(TORSO_M.map(([y, w, f, b, dy]) => loop(y, w, f, b, T, y < 0.9 ? SHORTS : SKIN,   /* (a band takes its lower loop's colour: the shorts' waist at the 0.97 loop, as on the sheet — they reached the waist and shortened the legs) */ torsoW(y), dy)), { mat: 'double', capStart: true, inward: true });   // (inward: the loops go up, from the crotch — the loft's faces turn outward only for loops going down)
        // the head: its levels as loops (each corner at its own height), from a band joining the neck to the crown's cap
        sk.section('head');
        const hloop = (y, half, wts, col = SKIN) => {
            const all = [...half]; for (let k = half.length - 2; k >= 1; k--) all.push([-half[k][0], half[k][1], half[k][2]]);
            const c = H(0, y, 0); return { c, pts: all.map(([x, z, d]) => { const p = H(x, y + d, z); return [p.x - c.x, p.z - c.z, p.y - c.y]; }), w: wts, col };
        };
        const N = TORSO_M.at(-1), neckHalf = T(N[1], N[2], N[3]).map(([x, z], i) => [x, z, N[4]?.[i] ?? 0]);   // (the torso's top loop itself: no seam at the neck)
        const levels = HEAD_LV.map(([y, half]) => hloop(y, half, [[head, 1]]));
        sk.loft([hloop(N[0], neckHalf, torsoW(N[0])), ...levels, { c: H(0, TOP_M, -0.012), pts: levels.at(-1).pts.map(([x, z]) => [x * 0.3, z * 0.3, 0]), w: [[head, 1]], col: SKIN }], { mat: 'double', cap: true, inward: true });   // (going up: see the torso)
        // the nose: a ridge from the brow to the tip, its wings, the underside
        sk.section('nose');
        { const P = (x, y, z) => ({ p: H(x, y, z), w: [[head, 1]] }), c = H(0, 1.665, 0.07);
          const br = P(0, 1.698, 0.113), mid = P(0, 1.672, 0.122), tip = P(0, 1.642, 0.136), l = P(0.02, 1.634, 0.112), r = P(-0.02, 1.634, 0.112), lu = P(0.012, 1.66, 0.112), ru = P(-0.012, 1.66, 0.112), u = P(0, 1.63, 0.116);
          sk.poly([br, lu, mid], SKIN, c); sk.poly([br, mid, ru], SKIN, c); sk.poly([mid, lu, l, tip], SKIN, c); sk.poly([mid, tip, r, ru], SKIN, c); sk.poly([tip, l, u], SKIN, c); sk.poly([tip, u, r], SKIN, c); }
        // the ears: a rim with thickness, set on the side of the head between the brow and the nose's base, leaning back
        sk.section('ears');
        for (const s of [1, -1]) {
            const P = (y, z, x) => ({ p: H(s * (x + 0.006 / 0.86), y, z), w: [[head, 1]] })   /* (out from the narrower head: the ears kept against the head, a little out) */, outline = [P(1.692, -0.008, 0.088), P(1.698, -0.03, 0.096), P(1.68, -0.046, 0.099), P(1.645, -0.042, 0.097), P(1.626, -0.022, 0.093), P(1.632, -0.004, 0.088)];
            slabPoly(sk, outline, SKIN, 0.012, H(s * 0.04, 1.66, -0.02));
        }
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
                ring(sh, -0.42, 0.042, 0.05, 8, [[sh, 1]], SKIN, -0.004),   // (carried down into the foot: no gap — 2026-11-27, "fix the feet to the legs")
            ], { mat: 'double' });
            // the foot: rings across it, from the heel to the toes (flat sole on the ground)
            const F = (z, w, h, col = SKIN) => { const c = V(sh, 0, -0.513 + h / 2, z); /* (the sole on the ground: the ankle joint 0.1 m up) */ return { c, pts: [[0, h / 2], [w, h * 0.35], [w * 1.05, -h / 2], [0, -h / 2], [-w * 1.05, -h / 2], [-w, h * 0.35]].map(([x, y]) => [sx * x * 0 + x, 0, y]), w: [[sh, 1]], col }; };
            const foot = [F(-0.09, 0.03, 0.07), F(-0.04, 0.036, 0.11), F(0.03, 0.04, 0.08), F(0.1, 0.04, 0.042), F(0.15, 0.034, 0.025)];   // (the instep high enough to meet the ankle)   // (smaller and flatter: 2026-11-27)
            sk.loft(foot, { mat: 'double', cap: true, capStart: true });
        }
        // the hair (the sheet: short, full on top and swept, the ears showing): a shell laid over the head — its hairline high on
        // the forehead, coming down at the temples, cut above the ears, low at the nape — and fuller at the top and front
        sk.section('hair');
        const HB = [0.05, 0.045, 0.03, 0.0, -0.03, -0.075, -0.082];   // each corner's hairline, from 1.70: the forehead … the nape
        const hairRing = (y0, lift, k, rise) => {
            const half = HB.map((d, i) => { const y = y0 + d * rise, [x, z] = headAt(y, i); return [x * k + (x > 0 ? 0.006 : 0), z * k + (z > 0 ? 0.004 : -0.006), y - y0 + (i <= 2 ? lift : lift * 0.5)]; });
            return hloop(y0, half, [[head, 1]], HAIR);
        };
        sk.loft([hairRing(1.7, 0, 1.04, 1), hairRing(1.735, 0.012, 1.1, 0.7), hairRing(1.775, 0.02, 1.1, 0.35), hairRing(1.805, 0.016, 0.92, 0.1),
            { c: H(0, 1.832, -0.01), pts: Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [Math.sin(a) * 0.03, Math.cos(a) * 0.035, 0]; }), w: [[head, 1]], col: HAIR }], { mat: 'double', cap: true, inward: true });
        // the face: eyes in their sockets, the brows on the ridge, the mouth's line
        sk.section('face');
        for (const s of [1, -1]) {
            const P = (x, y, z) => ({ p: H(s * x, y, z), w: [[head, 1]] }), c = H(0, 1.66, 0);
            sk.poly([P(0.02, 1.668, 0.101), P(0.036, 1.674, 0.1), P(0.054, 1.669, 0.097), P(0.036, 1.661, 0.1)], DARK, c);   // the eye
            sk.poly([P(0.014, 1.692, 0.113), P(0.06, 1.697, 0.101), P(0.062, 1.688, 0.1), P(0.014, 1.684, 0.112)], BROW, c);   // the brow
        }
        { const P = (x, y, z) => ({ p: H(x, y, z), w: [[head, 1]] }); sk.poly([P(-0.022, 1.6, 0.115), P(0.022, 1.6, 0.115), P(0.02, 1.595, 0.115), P(-0.02, 1.595, 0.115)], '#8a5a48', H(0, 1.6, 0)); }   // the mouth
        if (dry) return { points: sk.build().points, bones };
        return { mesh: sk.build() };
    };
    const out = buildLayered(root, `v3_${sex}`, gen);
    setPose(0);   // (the arms down again: the mesh follows them)
    if (out?.mesh) { out.mesh.userData.editSex = sex; out.mesh.userData.layers = [`v3_${sex}`]; out.mesh.name = `v3_${sex}`; }
    return out;
}

// (2026-11-27: the outline — an inverted hull — removed: it striped the whole body (shadow acne), and the user was unsure
// of it. It is in git history before this date, as addOutline, if it comes back.)
