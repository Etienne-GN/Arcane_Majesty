// The base bodies (2026-11-22, option 1: "as close as possible" to docs/3d/characters/base_mesh_reference.jpg) — a male
// and a female low-poly human, one continuous skinned mesh on the classic rig. Every ring of the body has an anatomical
// outline (skin.js profile): the chest and pectorals, shoulder blades and the spine's groove, a tapering waist, glutes,
// the deltoid cap, biceps and forearm, the thigh, the kneecap, the calf, ankles, bare feet, hands with a thumb; the head
// is sculpted the same way — chin, jaw angle, cheekbones, eye sockets, brow ridge, forehead and crown — with a nose and
// ears. Underwear (dark shorts; a top for the female) is coloured into the mesh. Hair is part of it too.
// buildBase(ctx, { sex }) → { mesh, update }.
import * as THREE from 'three';
import { createSkin, blend, profile } from './skin.js';

const sym = (th, amp, wd) => [{ th, amp, wd }, { th: -th, amp, wd }];

export function buildBase(ctx, { sex = 'male', skin = '#e2b590', cloth = '#3a3530', hair = null } = {}) {
    const F = sex === 'female';
    const { root, body, hips, spine, head, arms, legs } = ctx;
    const HAIR = hair ?? (F ? '#151922' : '#2a1d16');
    const bones = [hips, spine, head, arms.L.upper, arms.L.fore, arms.R.upper, arms.R.fore, legs.L.thigh, legs.L.shin, legs.R.thigh, legs.R.shin];
    const sk = createSkin(root, bones), V = (g, x, y, z) => sk.at(g, x, y, z);

    // ---- the torso, from the neck down to the crotch (body coordinates: the rig's own scale applies) ----
    const torsoW = y => (y > 1.63 ? [[head, 1]] : y > 1.59 ? [[spine, 0.3], [head, 0.7]] : y > 1.55 ? [[spine, 0.75], [head, 0.25]] : y > 1.1 ? [[spine, 1]] : y > 1.0 ? blend(hips, spine, (y - 1.0) / 0.1) : [[hips, 1]]);
    const TM = [   // y, w, df, db, bumps, colour   (male)
        [1.66, 0.048, 0.045, 0.053, [], skin], [1.6, 0.051, 0.048, 0.056, [], skin], 
        [1.58, 0.085, 0.06, 0.075, [], skin],   // the trapezius sloping from the neck into the shoulders
        [1.555, 0.165, 0.075, 0.088, [], skin],
        [1.52, 0.218, 0.1, 0.1, [...sym(2.5, 0.01, 0.4)], skin],
        [1.44, 0.205, 0.122, 0.11, [...sym(0.55, 0.016, 0.35), ...sym(2.45, 0.013, 0.4), { th: Math.PI, amp: -0.012, wd: 0.22 }], skin],   // pectorals, shoulder blades, the spine's groove
        [1.345, 0.188, 0.127, 0.105, [...sym(0.5, 0.019, 0.33), { th: 0, amp: -0.008, wd: 0.18 }, { th: Math.PI, amp: -0.01, wd: 0.22 }], skin],   // the pectorals' lower edge
        [1.24, 0.165, 0.11, 0.1, [{ th: Math.PI, amp: -0.008, wd: 0.22 }], skin],
        [1.13, 0.148, 0.1, 0.096, [{ th: 0, amp: 0.006, wd: 0.3 }, ...sym(1.4, -0.006, 0.3)], skin],   // the waist; a touch of the abdominals
        [1.045, 0.153, 0.1, 0.1, [], skin],
        [1.03, 0.157, 0.102, 0.102, [], cloth],   // the shorts' waistband
        [0.955, 0.17, 0.1, 0.12, [...sym(2.65, 0.02, 0.45)], cloth],   // the glutes
        [0.885, 0.162, 0.095, 0.115, [...sym(2.7, 0.016, 0.45)], cloth],
        [0.835, 0.09, 0.065, 0.075, [], cloth],
    ];
    const TF = [   // (female) a slimmer neck and shoulders, a bust, a narrow waist, wider hips
        [1.66, 0.042, 0.04, 0.048, [], skin], [1.6, 0.044, 0.043, 0.05, [], skin], 
        [1.58, 0.075, 0.055, 0.07, [], skin],
        [1.555, 0.148, 0.07, 0.083, [], skin],
        [1.52, 0.196, 0.094, 0.095, [...sym(2.5, 0.008, 0.4)], skin],
        [1.45, 0.176, 0.112, 0.102, [...sym(2.45, 0.01, 0.4), { th: Math.PI, amp: -0.01, wd: 0.22 }], cloth],
        [1.375, 0.168, 0.13, 0.1, [...sym(0.48, 0.034, 0.36), { th: 0, amp: -0.012, wd: 0.16 }, { th: Math.PI, amp: -0.009, wd: 0.22 }], cloth],   // the bust
        [1.31, 0.152, 0.11, 0.096, [...sym(0.5, 0.014, 0.36)], cloth],
        [1.25, 0.142, 0.094, 0.092, [], skin],
        [1.14, 0.124, 0.084, 0.086, [{ th: Math.PI, amp: -0.008, wd: 0.22 }], skin],   // the narrow waist
        [1.06, 0.148, 0.092, 0.098, [], skin],
        [1.04, 0.156, 0.095, 0.102, [], cloth],
        [0.96, 0.182, 0.1, 0.13, [...sym(2.62, 0.028, 0.45)], cloth],   // wider hips, fuller glutes
        [0.89, 0.172, 0.096, 0.122, [...sym(2.7, 0.02, 0.45)], cloth],
        [0.84, 0.095, 0.066, 0.078, [], cloth],
    ];
    sk.loft((F ? TF : TM).map(([y, w, df, db, b, col]) => ({ c: V(body, 0, y, 0), shape: profile(w, df, db, b), w: torsoW(y), col })), { seg: 18, cap: true });

    // ---- arms: the deltoid cap, biceps, the elbow, the forearm, the wrist, a hand with a thumb ----
    const k = F ? 0.86 : 1;
    for (const side of ['L', 'R']) {
        const { upper, fore } = arms[side], s = side === 'L' ? 1 : -1;
        const R = (g, ox, y, w, df, db, wts, b = []) => ({ c: V(g, s * ox, y, 0), shape: profile(w * k, df * k, db * k, b), w: wts, col: skin });
        sk.loft([
            R(upper, -0.05, 0.065, 0.02, 0.035, 0.04, [[spine, 0.9], [upper, 0.1]]),   // the shoulder's top, under the trapezius
            R(upper, -0.02, 0.045, 0.045, 0.052, 0.056, [[spine, 0.6], [upper, 0.4]]),   // the deltoid, rounding over
            R(upper, 0.01, 0.0, 0.06, 0.058, 0.058, [[spine, 0.2], [upper, 0.8]]),
            R(upper, 0.016, -0.06, 0.061, 0.056, 0.056, [[upper, 1]]),
            R(upper, 0.008, -0.12, 0.05, 0.05, 0.048, [[upper, 1]]),
            R(upper, 0.0, -0.18, 0.045, 0.055, 0.047, [[upper, 1]], [{ th: 0, amp: 0.006, wd: 0.5 }]),   // the biceps
            R(upper, 0.0, -0.27, 0.04, 0.042, 0.043, [[upper, 1]]),
            R(fore, 0.0, 0.0, 0.037, 0.038, 0.042, blend(upper, fore, 0.5)),   // the elbow
            R(fore, 0.004, -0.06, 0.046, 0.042, 0.04, [[fore, 1]], [{ th: s * 1.2, amp: 0.006, wd: 0.6 }]),   // the forearm's swell
            R(fore, 0.0, -0.15, 0.037, 0.034, 0.033, [[fore, 1]]),
            R(fore, 0.0, -0.265, 0.029, 0.022, 0.022, [[fore, 1]]),   // the wrist
            R(fore, 0.0, -0.3, 0.02, 0.04, 0.036, [[fore, 1]]),   // the palm (its flat facing the body)
            R(fore, 0.0, -0.37, 0.019, 0.043, 0.038, [[fore, 1]]),   // the knuckles
            R(fore, 0.0, -0.43, 0.014, 0.036, 0.03, [[fore, 1]]),
            R(fore, 0.0, -0.47, 0.009, 0.02, 0.016, [[fore, 1]]),
        ], { seg: 9, cap: true });
        sk.loft([   // the thumb
            { c: V(fore, s * 0.006, -0.295, 0.03 * k), shape: profile(0.013 * k, 0.013 * k, 0.013 * k), w: [[fore, 1]], col: skin },
            { c: V(fore, s * 0.004, -0.345, 0.05 * k), shape: profile(0.011 * k, 0.011 * k, 0.011 * k), w: [[fore, 1]], col: skin },
            { c: V(fore, s * 0.002, -0.38, 0.056 * k), shape: profile(0.006, 0.006, 0.006), w: [[fore, 1]], col: skin },
        ], { seg: 5, cap: true });
    }

    // ---- legs: the thigh, the kneecap, the calf, the ankle; bare feet ----
    const kl = F ? 0.95 : 1;
    for (const side of ['L', 'R']) {
        const { thigh, shin } = legs[side], s = side === 'L' ? 1 : -1;
        const R = (g, ox, y, w, df, db, wts, col = skin, b = []) => ({ c: V(g, s * ox, y, 0), shape: profile(w * kl, df * kl, db * kl, b), w: wts, col });
        sk.loft([
            R(thigh, 0.0, 0.04, 0.088, 0.09, 0.1, [[hips, 0.6], [thigh, 0.4]], cloth),
            R(thigh, 0.0, -0.06, 0.088, 0.09, 0.1, [[hips, 0.2], [thigh, 0.8]], cloth),
            R(thigh, 0.0, -0.16, 0.08, 0.086, 0.088, [[thigh, 1]], F ? skin : cloth),   // (the shorts end mid-thigh)
            R(thigh, 0.0, -0.17, 0.079, 0.085, 0.087, [[thigh, 1]], skin, [{ th: 0, amp: 0.008, wd: 0.5 }]),
            R(thigh, 0.004, -0.3, 0.066, 0.072, 0.066, [[thigh, 1]], skin, [{ th: -s * 0.9, amp: 0.006, wd: 0.5 }]),
            R(thigh, 0.0, -0.4, 0.054, 0.06, 0.054, [[thigh, 1]]),
            R(shin, 0.0, 0.0, 0.052, 0.06, 0.052, blend(thigh, shin, 0.5), skin, [{ th: 0, amp: 0.008, wd: 0.4 }]),   // the kneecap
            R(shin, 0.0, -0.06, 0.05, 0.052, 0.054, [[shin, 1]]),
            R(shin, 0.0, -0.14, 0.053, 0.05, 0.066, [[shin, 1]], skin, [{ th: Math.PI - s * 0.4, amp: 0.008, wd: 0.5 }]),   // the calf
            R(shin, 0.0, -0.25, 0.042, 0.043, 0.05, [[shin, 1]]),
            R(shin, 0.0, -0.35, 0.031, 0.032, 0.034, [[shin, 1]]),
            R(shin, 0.0, -0.39, 0.03, 0.034, 0.032, [[shin, 1]]),   // the ankle
        ], { seg: 10 });
        sk.loft([   // the foot, from the heel to the toes (rings upright along +z)
            { c: V(shin, 0, -0.405, -0.035), rx: 0.03 * kl, rz: 0.035, w: [[shin, 1]], col: skin },
            { c: V(shin, 0, -0.405, 0.0), rx: 0.036 * kl, rz: 0.04, w: [[shin, 1]], col: skin },
            { c: V(shin, s * 0.004, -0.42, 0.07), rx: 0.042 * kl, rz: 0.026, w: [[shin, 1]], col: skin },
            { c: V(shin, s * 0.006, -0.432, 0.13), rx: 0.044 * kl, rz: 0.015, w: [[shin, 1]], col: skin },
            { c: V(shin, s * 0.006, -0.436, 0.165), rx: 0.034 * kl, rz: 0.01, w: [[shin, 1]], col: skin },
        ], { seg: 8, axis: 'z', cap: true });
    }

    // ---- the head: chin, jaw angle, cheekbones, eye sockets, the brow ridge, forehead, crown ----
    const hk = F ? 0.94 : 1;
    const H = [   // y (from the neck's top), w, df, db, bumps
        [0.305, 0.03, 0.03, 0.04, []],
        [0.285, 0.068, 0.064, 0.088, []],
        [0.25, 0.084, 0.088, 0.1, []],   // the forehead
        [0.21, 0.089, 0.099, 0.104, [{ th: 0, amp: 0.003, wd: 0.6 }]],   // the brow ridge
        [0.18, 0.087, 0.092, 0.102, [...sym(0.42, -0.007, 0.2)]],   // the eye sockets
        [0.145, 0.088, 0.096, 0.096, [...sym(0.8, 0.006, 0.3)]],   // the cheekbones
        [0.112, 0.076, 0.094, 0.086, [...sym(0.7, -0.004, 0.3)]],   // the mouth; the cheeks hollow a little
        [0.08, F ? 0.062 : 0.07, 0.09, 0.07, []],   // the jaw's angle
        [0.052, F ? 0.036 : 0.042, 0.086, 0.054, [{ th: 0, amp: 0.006, wd: 0.35 }]],   // the chin
        [0.04, 0.046, 0.072, 0.056, []],
        [0.026, 0.048, 0.054, 0.056, []],
        [0.005, 0.05, 0.047, 0.055, []],
    ];
    const headW = y => (y < 0.02 ? [[head, 0.8], [spine, 0.2]] : [[head, 1]]);
    sk.loft(H.map(([y, w, df, db, b]) => ({ c: V(head, 0, y * hk, 0.004), shape: profile(w * hk, df * hk, db * hk, b), w: headW(y), col: skin })), { seg: 14 });
    // the nose: a small wedge down the middle of the face
    sk.loft([
        { c: V(head, 0, 0.175 * hk, 0.094 * hk), shape: profile(0.006, 0.004, 0.004), w: [[head, 1]], col: skin },
        { c: V(head, 0, 0.14 * hk, 0.104 * hk), shape: profile(0.013, 0.014, 0.008), w: [[head, 1]], col: skin },
        { c: V(head, 0, 0.128 * hk, 0.098 * hk), shape: profile(0.016, 0.01, 0.006), w: [[head, 1]], col: skin },
    ], { seg: 6, cap: true });
    // ears (flat, against the head) and closed, quiet eyes and brows (darker strokes, as in the reference)
    const dark = new THREE.Color(skin).multiplyScalar(0.72).getStyle(), brow = new THREE.Color(HAIR).getStyle();
    for (const s of [-1, 1]) {
        sk.loft([{ c: V(head, s * 0.088 * hk, 0.175 * hk, -0.005), shape: profile(0.008, 0.016, 0.02), w: [[head, 1]], col: skin }, { c: V(head, s * 0.09 * hk, 0.13 * hk, -0.002), shape: profile(0.007, 0.012, 0.016), w: [[head, 1]], col: skin }], { seg: 5, cap: true });
        sk.loft([{ c: V(head, s * 0.033 * hk, 0.181 * hk, 0.092 * hk), shape: profile(0.01, 0.002, 0.0015), w: [[head, 1]], col: dark }, { c: V(head, s * 0.033 * hk, 0.178 * hk, 0.092 * hk), shape: profile(0.009, 0.002, 0.0015), w: [[head, 1]], col: dark }], { seg: 4 });
        sk.loft([{ c: V(head, s * 0.035 * hk, 0.205 * hk, 0.1 * hk), shape: profile(0.018, 0.004, 0.003), w: [[head, 1]], col: brow }, { c: V(head, s * 0.035 * hk, 0.199 * hk, 0.1 * hk), shape: profile(0.017, 0.004, 0.003), w: [[head, 1]], col: brow }], { seg: 4 });
    }
    // ---- hair: a cap over the skull, its hairline higher in front; short and tufted (male) or drawn back (female) ----
    const hl = th => (Math.cos(th) > 0 ? Math.pow(Math.cos(th), 0.7) * (F ? 0.11 : 0.08) : 0);   // the hairline rises to the top of the forehead in front
    const HR = [[0.322, 0.02, 0.02, 0.03], [0.305, 0.064, 0.06, 0.085], [0.27, 0.09, 0.092, 0.108], [0.225, 0.096, 0.1, 0.112], [F ? 0.13 : 0.165, 0.094, 0.098, 0.108]];
    sk.loft(HR.map(([y, w, df, db], i) => ({ c: V(head, 0, y * hk, 0.0), shape: profile(w * hk, df * hk, db * hk), w: [[head, 1]], col: HAIR, dy: i === HR.length - 1 ? hl : null })), { seg: 14, mat: 'double' });
    if (!F) for (let i = 0; i < 9; i++) {   // short tufts across the top
        const a = (i / 9) * Math.PI * 2, x = Math.sin(a) * 0.055, z = Math.cos(a) * 0.06 - 0.01;
        sk.loft([{ c: V(head, x * 1.2, 0.318, z * 1.2 + 0.01), shape: profile(0.004, 0.004, 0.004), w: [[head, 1]], col: HAIR }, { c: V(head, x, 0.3, z), shape: profile(0.022, 0.022, 0.022), w: [[head, 1]], col: HAIR }], { seg: 4, cap: true });
    }
    const mesh = sk.build();

    // the ponytail (female): a rigid chain from the crown, swinging
    const tail = [];
    if (F) {
        const hm = new THREE.MeshStandardMaterial({ color: HAIR, flatShading: true, roughness: 0.7 });
        let tp = new THREE.Group(); tp.position.set(0, 0.29 * hk, -0.06); head.add(tp);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 6), new THREE.MeshStandardMaterial({ color: '#2a2a30', flatShading: true })); band.userData.keep = band.userData.v2 = true; tp.add(band);
        for (let i = 0; i < 6; i++) {
            const g = new THREE.Group(); g.position.set(0, i ? -0.095 : 0.02, 0); g.rotation.x = i === 0 ? 2.35 : -0.3; tp.add(g);
            const m = new THREE.Mesh(new THREE.CylinderGeometry(0.036 - i * 0.004, 0.042 - i * 0.004, 0.105, 6), hm); m.position.y = -0.05; m.castShadow = true; m.userData.keep = m.userData.v2 = true; g.add(m);
            tail.push(g); tp = g;
        }
        const tipm = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.1, 5), hm); tipm.position.y = -0.13; tipm.rotation.x = Math.PI; tipm.userData.keep = tipm.userData.v2 = true; tp.add(tipm);
    }
    function update({ t, run = 0, amp = 0 }) {
        tail.forEach((g, i) => { if (i) { g.rotation.x = -0.3 + run * 0.12 + Math.sin(t * 2.1 + i * 0.7) * 0.04 * (1 + amp); g.rotation.z = Math.sin(t * 1.6 + i) * 0.03; } });
    }
    return { mesh, update, weapon: () => null };
}
