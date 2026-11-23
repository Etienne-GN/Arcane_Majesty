// The base bodies (2026-11-22, option 1: "as close as possible" to docs/3d/characters/base_mesh_reference.jpg) — a male
// and a female low-poly human, one continuous skinned mesh on the classic rig. Every ring of the body has an anatomical
// outline (skin.js profile): the chest and pectorals, shoulder blades and the spine's groove, a tapering waist, glutes,
// the deltoid cap, biceps and forearm, the thigh, the kneecap, the calf, ankles, bare feet, hands with a thumb; the head
// is sculpted the same way — chin, jaw angle, cheekbones, eye sockets, brow ridge, forehead and crown — with a nose and
// ears. Underwear (dark shorts; a top for the female) is coloured into the mesh. Hair is part of it too.
// buildBase(ctx, { sex }) → { mesh, update }.
import * as THREE from 'three';
import { createSkin, blend, profile, ringPts } from './skin.js';

const sym = (th, amp, wd) => [{ th, amp, wd }, { th: -th, amp, wd }];

// outfit (optional): { torso(y, θ, base), arm(part, y), leg(part, y, base), foot, extra(helpers) } — colours painted onto the body's
// own surface, and extra pieces (coat tails, a collar…) added before the mesh is built. Used by the dressed cast (eldrin.js).
export function buildBase(ctx, { sex = 'male', skin = '#e2b590', cloth = '#3a3530', hair = null, outfit = null, headK = 1, footK = 1 } = {}) {   // headK: the head's size; footK: the feet (boots are bigger)
    const F = sex === 'female';
    const { root, body, hips, spine, head, arms, legs } = ctx;
    const HAIR = hair ?? (F ? '#151922' : '#2a1d16');
    const bones = [hips, spine, head, arms.L.upper, arms.L.fore, arms.R.upper, arms.R.fore, legs.L.thigh, legs.L.shin, legs.R.thigh, legs.R.shin];
    const sk = createSkin(root, bones), V = (g, x, y, z) => sk.at(g, x, y, z);

    // ---- the torso, from the neck down to the crotch (body coordinates: the rig's own scale applies) ----
    const torsoW = y => (y > 1.63 ? [[head, 1]] : y > 1.59 ? [[spine, 0.3], [head, 0.7]] : y > 1.55 ? [[spine, 0.75], [head, 0.25]] : y > 1.1 ? [[spine, 1]] : y > 1.0 ? blend(hips, spine, (y - 1.0) / 0.1) : [[hips, 1]]);
    // Hand-placed rings (2026-11-22, "far fewer shapes, flat planes at the right angles"): half of each outline on the +x
    // side, from the front centre round to the back centre — front centre, pectoral middle, pectoral outer edge, side front,
    // side back, shoulder blade, spine. Big flat planes: the pectorals are two faces with a small step beneath them.
    const TM = [   // y, half outline, colour   (male)
        [1.66, [[0, 0.046], [0.028, 0.043], [0.045, 0.026], [0.054, 0], [0.053, -0.03], [0.034, -0.056], [0, -0.062]], skin],   // the neck: a clear column, narrower than the jaw
        [1.635, [[0, 0.05], [0.032, 0.047], [0.052, 0.03], [0.07, 0], [0.068, -0.036], [0.042, -0.064], [0, -0.07]], skin],
        [1.605, [[0, 0.062], [0.042, 0.058], [0.076, 0.036], [0.12, 0], [0.114, -0.05], [0.06, -0.08], [0, -0.082]], skin],   // the trapezius begins, rising gently from the neck
        [1.565, [[0, 0.074], [0.065, 0.076], [0.13, 0.054], [0.198, 0.0], [0.19, -0.06], [0.11, -0.094], [0, -0.096]], skin],   // sloping down and out, broad
        [1.5, [[0, 0.102], [0.095, 0.108], [0.182, 0.086], [0.246, 0.01], [0.238, -0.064], [0.155, -0.108], [0, -0.104]], skin],   // (the torso's shoulder stops inside the arm: the deltoid is the arm's)
        [1.455, [[0, 0.138], [0.105, 0.15], [0.2, 0.11], [0.25, 0.02], [0.244, -0.076], [0.16, -0.122], [0, -0.11]], skin],   // a broad, even upper back   // the shoulder tips (deltoids), wide and round; a deeper chest
        [1.36, [[0, 0.142], [0.1, 0.156], [0.18, 0.12, 0.035], [0.204, 0, 0.05], [0.198, -0.076, 0.05], [0.14, -0.116, 0.03], [0, -0.108]], skin],   // the pectorals' lower edge, slanting up to the armpit
        [1.33, [[0, 0.13], [0.1, 0.136], [0.175, 0.106, 0.03], [0.198, 0, 0.04], [0.192, -0.074, 0.04], [0.136, -0.112, 0.02], [0, -0.104]], skin],   // a soft step beneath them
        [1.22, [[0, 0.11], [0.09, 0.11], [0.15, 0.08], [0.168, 0], [0.163, -0.062], [0.115, -0.1], [0, -0.098]], skin],   // the ribs
        [1.12, [[0, 0.102], [0.08, 0.098], [0.134, 0.065], [0.149, 0], [0.143, -0.062], [0.094, -0.094], [0, -0.09]], skin],   // the small of the back   // the waist
        [1.075, [[0, 0.1], [0.078, 0.098], [0.13, 0.072], [0.15, 0], [0.145, -0.068], [0.096, -0.1], [0, -0.096]], skin],
        [1.035, [[0, 0.1], [0.075, 0.1], [0.13, 0.077], [0.152, 0], [0.148, -0.073], [0.098, -0.106], [0, -0.102]], cloth],   // the shorts' waistband, hugging the waist
        [0.99, [[0, 0.1], [0.078, 0.1], [0.133, 0.079], [0.155, 0], [0.15, -0.079], [0.097, -0.116], [0, -0.108]], cloth],   // the glutes rising smoothly from the lower back
        [0.95, [[0, 0.1], [0.08, 0.1], [0.135, 0.08], [0.158, 0], [0.152, -0.084], [0.095, -0.13], [0, -0.115]], cloth],   // the glutes
        [0.88, [[0, 0.095], [0.075, 0.095], [0.13, 0.075], [0.152, 0], [0.146, -0.08], [0.09, -0.12], [0, -0.11]], cloth],
        [0.835, [[0, 0.06], [0.05, 0.06], [0.08, 0.04], [0.09, 0], [0.085, -0.05], [0.05, -0.07], [0, -0.07]], cloth],
    ];
    const TF = [   // (female) a slimmer neck and shoulders, a bust (two planes and a step), a narrow waist, wider hips
        [1.66, [[0, 0.045], [0.026, 0.041], [0.043, 0.022], [0.05, 0], [0.048, -0.026], [0.03, -0.049], [0, -0.054]], skin],
        [1.635, [[0, 0.047], [0.028, 0.043], [0.046, 0.024], [0.055, 0], [0.053, -0.028], [0.033, -0.052], [0, -0.057]], skin],
        [1.605, [[0, 0.053], [0.034, 0.049], [0.058, 0.029], [0.088, 0], [0.083, -0.04], [0.042, -0.064], [0, -0.068]], skin],
        [1.565, [[0, 0.064], [0.054, 0.064], [0.104, 0.046], [0.152, 0], [0.144, -0.05], [0.078, -0.08], [0, -0.084]], skin],
        [1.51, [[0, 0.094], [0.082, 0.098], [0.15, 0.076], [0.19, 0.008], [0.182, -0.058], [0.112, -0.096], [0, -0.092]], skin],   // (her shoulders narrower and sloping, as the reference)
        [1.46, [[0, 0.108], [0.088, 0.114], [0.158, 0.09], [0.196, 0], [0.188, -0.066], [0.118, -0.106], [0, -0.096]], cloth],   // the top's neckline
        [1.39, [[0, 0.122], [0.075, 0.164], [0.14, 0.124], [0.175, 0], [0.168, -0.064], [0.11, -0.1], [0, -0.094]], cloth],   // the bust, fuller
        [1.33, [[0, 0.118], [0.075, 0.152], [0.13, 0.116, 0.02], [0.165, 0, 0.03], [0.16, -0.062, 0.03], [0.105, -0.094], [0, -0.086]], cloth],
        [1.31, [[0, 0.098], [0.075, 0.1], [0.125, 0.082], [0.158, 0], [0.155, -0.06], [0.102, -0.094], [0, -0.088]], cloth],   // the step beneath
        [1.25, [[0, 0.094], [0.07, 0.093], [0.118, 0.07], [0.142, 0], [0.138, -0.056], [0.094, -0.09], [0, -0.084]], skin],
        [1.14, [[0, 0.086], [0.06, 0.084], [0.105, 0.058], [0.124, 0], [0.118, -0.052], [0.078, -0.082], [0, -0.072]], skin],   // the narrow waist; the small of the back (an S from the side)
        [1.06, [[0, 0.092], [0.07, 0.092], [0.12, 0.072], [0.146, 0], [0.142, -0.07], [0.094, -0.1], [0, -0.096]], skin],
        [1.04, [[0, 0.094], [0.078, 0.094], [0.132, 0.072], [0.154, 0], [0.15, -0.076], [0.1, -0.106], [0, -0.1]], cloth],
        [1.0, [[0, 0.097], [0.084, 0.097], [0.142, 0.077], [0.168, 0], [0.163, -0.085], [0.105, -0.128], [0, -0.114]], cloth],
        [0.96, [[0, 0.1], [0.09, 0.1], [0.152, 0.08], [0.18, 0], [0.174, -0.094], [0.108, -0.15], [0, -0.13]], cloth],   // wider hips, fuller glutes
        [0.89, [[0, 0.096], [0.085, 0.096], [0.158, 0.066], [0.172, 0], [0.166, -0.084], [0.1, -0.13], [0, -0.118]], cloth],
        [0.84, [[0, 0.06], [0.05, 0.06], [0.082, 0.04], [0.095, 0], [0.09, -0.052], [0.052, -0.074], [0, -0.074]], cloth],
    ];
    // the shoulder dome: its outer part follows the arm (so the deltoid is one surface with the torso and still moves)
    const shoulderW = y => (th, x) => {
        const base = torsoW(y); if (y < 1.42 || y > 1.57 || x == null) return base;
        const tq = Math.max(0, Math.min(1, (Math.abs(x) - 0.16) / 0.1)), f = tq * tq * (3 - 2 * tq) * 0.4;   // (eased, all the way to the arm: shoulder and arm one surface, no step)
        return f <= 0 ? base : [...base.map(([b, v]) => [b, v * (1 - f)]), [x > 0 ? arms.L.upper : arms.R.upper, f]];
    };
    sk.loft((F ? TF : TM).map(([y, half, col]) => ({ c: V(body, 0, y, 0), pts: ringPts(half), w: shoulderW(y), col: outfit?.torso ? (th => outfit.torso(y, th, col)) : col })), { cap: true });

    // ---- arms: the deltoid cap, biceps, the elbow, the forearm, the wrist, a hand with a thumb ----
    const k = F ? 1.26 : 1.5;   // (the reference's arms are thick: the upper arm near the neck's width)
    for (const side of ['L', 'R']) {
        const { upper, fore } = arms[side], s = side === 'L' ? 1 : -1;
        const R = (g, ox, y, w, df, db, wts, b = []) => ({ c: V(g, s * (ox - (F ? 0.03 : 0)), y, 0), shape: profile(w * k, df * k, db * k, b), w: wts, col: outfit?.arm ? outfit.arm(g === fore ? 'fore' : 'upper', y) ?? skin : skin });   // (hers set a little in: narrower, sloping shoulders)
        sk.loft([
            R(upper, -0.02, 0.05, 0.022, 0.024, 0.024, [[spine, 0.3], [upper, 0.7]]),   // the deltoid's dome: the shoulder's outside (closed at the top)
            R(upper, -0.01, 0.022, 0.056, 0.055, 0.055, [[spine, 0.15], [upper, 0.85]]),
            R(upper, 0.006, -0.03, 0.062, 0.058, 0.058, [[upper, 1]]),   // (the shoulder dome is the torso's: the arm starts inside it)
            R(upper, 0.014, -0.075, 0.064, 0.058, 0.058, [[upper, 1]], [{ th: s * Math.PI / 2, amp: 0.006, wd: 0.6 }]),   // the deltoid's lower end, its outer bulge
            R(upper, 0.008, -0.12, 0.05, 0.05, 0.048, [[upper, 1]]),
            R(upper, 0.0, -0.18, 0.048, 0.06, 0.05, [[upper, 1]], [{ th: 0, amp: 0.008, wd: 0.5 }]),   // the biceps
            R(upper, 0.0, -0.27, 0.04, 0.042, 0.043, [[upper, 1]]),
            R(fore, 0.0, 0.0, 0.037, 0.038, 0.042, blend(upper, fore, 0.5)),   // the elbow
            R(fore, 0.004, -0.06, 0.046, 0.042, 0.04, [[fore, 1]], [{ th: s * 1.2, amp: 0.006, wd: 0.6 }]),   // the forearm's swell
            R(fore, 0.0, -0.15, 0.037, 0.034, 0.033, [[fore, 1]]),
            R(fore, 0.0, -0.265, 0.029, 0.022, 0.022, [[fore, 1]]),   // the wrist
            R(fore, 0.0, -0.3, 0.02, 0.04, 0.036, [[fore, 1]]),   // the palm (its flat facing the body)
            R(fore, 0.0, -0.37, 0.019, 0.043, 0.038, [[fore, 1]]),   // the knuckles
            R(fore, 0.0, -0.43, 0.014, 0.036, 0.03, [[fore, 1]]),
            R(fore, 0.0, -0.47, 0.009, 0.02, 0.016, [[fore, 1]]),
        ], { seg: 6, cap: true, capStart: true });
        sk.loft([   // the thumb
            { c: V(fore, s * (0.006 - (F ? 0.03 : 0)), -0.3, 0.022 * k), shape: profile(0.012 * k, 0.012 * k, 0.012 * k), w: [[fore, 1]], col: skin },   // (short, close against the palm)
            { c: V(fore, s * (0.004 - (F ? 0.03 : 0)), -0.335, 0.034 * k), shape: profile(0.009 * k, 0.009 * k, 0.009 * k), w: [[fore, 1]], col: skin },
            { c: V(fore, s * (0.002 - (F ? 0.03 : 0)), -0.36, 0.038 * k), shape: profile(0.005, 0.005, 0.005), w: [[fore, 1]], col: skin },
        ], { seg: 4, cap: true });
    }

    // ---- legs: the thigh, the kneecap, the calf, the ankle; bare feet ----
    const kl = F ? 1.4 : 1.38;   // (the reference's legs are heavy: thick thighs, full calves)
    for (const side of ['L', 'R']) {
        const { thigh, shin } = legs[side], s = side === 'L' ? 1 : -1;
        const R = (g, ox, y, w, df, db, wts, col = skin, b = []) => ({ c: V(g, s * ox, y, 0), shape: profile(w * kl, df * kl, db * kl, b), w: wts, col: outfit?.leg ? outfit.leg(g === shin ? 'shin' : 'thigh', y, col) : col });
        const fl = (() => { root.updateMatrixWorld(true); const a = V(shin, 0, -0.4, 0); return shin.worldToLocal(root.localToWorld(new THREE.Vector3(a.x, 0, a.z))).y; })();   // the floor, in the shin's frame
        sk.loft([
            R(thigh, -0.012, 0.04, 0.062, 0.07, 0.08, [[hips, 0.6], [thigh, 0.4]], cloth),   // (inside the hips: the shorts hug the thighs, no flaps)
            R(thigh, -0.006, -0.06, 0.068, 0.072, 0.078, [[hips, 0.2], [thigh, 0.8]], cloth),
            R(thigh, 0.0, -0.13, 0.07, 0.074, 0.076, [[thigh, 1]], cloth),
            R(thigh, 0.0, F ? -0.15 : -0.22, 0.07, 0.074, 0.074, [[thigh, 1]], cloth),   // (the shorts end mid-thigh)
            R(thigh, 0.0, F ? -0.16 : -0.23, 0.068, 0.073, 0.072, [[thigh, 1]], skin, [{ th: 0, amp: 0.006, wd: 0.5 }]),
            R(thigh, 0.004, -0.3, 0.066, 0.072, 0.066, [[thigh, 1]], skin, [{ th: -s * 0.9, amp: 0.006, wd: 0.5 }]),
            R(thigh, 0.0, -0.4, 0.054, 0.06, 0.054, [[thigh, 1]]),
            R(shin, 0.0, 0.0, 0.052, 0.06, 0.052, blend(thigh, shin, 0.5), skin, [{ th: 0, amp: 0.008, wd: 0.4 }]),   // the kneecap
            R(shin, 0.0, -0.06, 0.05, 0.052, 0.054, [[shin, 1]]),
            R(shin, 0.0, -0.14, 0.053, 0.05, 0.066, [[shin, 1]], skin, [{ th: Math.PI - s * 0.4, amp: 0.008, wd: 0.5 }]),   // the calf
            R(shin, 0.0, -0.25, 0.042, 0.043, 0.05, [[shin, 1]]),
            R(shin, 0.0, fl + 0.13, 0.031, 0.032, 0.034, [[shin, 1]]),
            R(shin, 0.0, fl + 0.09, 0.03, 0.034, 0.032, [[shin, 1]]),   // the ankle
            R(shin, 0.0, fl + 0.05, 0.034, 0.04, 0.034, [[shin, 1]]),   // (down into the foot: no gap)
        ], { seg: 7 });
        sk.loft([   // the foot, from the heel to the toes (rings upright along +z)
            { c: V(shin, 0, fl + 0.03 * footK, -0.068 * footK), rx: 0.012 * kl * footK, rz: 0.022 * footK, w: [[shin, 1]], col: outfit?.foot ?? skin },   // the heel's back, closed
            { c: V(shin, 0, fl + 0.036 * footK, -0.045 * footK), rx: 0.03 * kl * footK, rz: 0.036 * footK, w: [[shin, 1]], col: outfit?.foot ?? skin },   // (every ring's underside on the floor: the sole flat at y = 0)
            { c: V(shin, 0, fl + 0.041 * footK, 0.0 * footK), rx: 0.036 * kl * footK, rz: 0.041 * footK, w: [[shin, 1]], col: outfit?.foot ?? skin },
            { c: V(shin, s * 0.004, fl + 0.027 * footK, 0.07 * footK), rx: 0.042 * kl * footK, rz: 0.027 * footK, w: [[shin, 1]], col: outfit?.foot ?? skin },
            { c: V(shin, s * 0.006, fl + 0.016 * footK, 0.13 * footK), rx: 0.044 * kl * footK, rz: 0.016 * footK, w: [[shin, 1]], col: outfit?.foot ?? skin },
            { c: V(shin, s * 0.006, fl + 0.01 * footK, 0.165 * footK), rx: 0.034 * kl * footK, rz: 0.01 * footK, w: [[shin, 1]], col: outfit?.foot ?? skin },
        ], { seg: 6, axis: 'z', cap: true, capStart: true });
    }

    // ---- the head: chin, jaw angle, cheekbones, eye sockets, the brow ridge, forehead, crown ----
    const hk = (F ? 1.1 : 1.18) * headK;   // (the reference's head is ~40% of the shoulders' width)
    // the head, hand-placed: the face's centre line, the cheek's front, the cheekbone, the side (the ear), the back's side,
    // the back — big planes: the brow overhanging the eyes, the cheekbones, the jaw's angle, the chin
    const HP = [   // half outline: the face's centre line, the cheek's front, the side, the back's side, the back — even planes (2026-11-23)
        [0.305, [[0, 0.02], [0.025, 0.016], [0.035, -0.01], [0.024, -0.034], [0, -0.04]]],
        [0.275, [[0, 0.066], [0.05, 0.056], [0.077, -0.02], [0.059, -0.07], [0, -0.085]]],
        [0.225, [[0, 0.095], [0.068, 0.074], [0.092, -0.02], [0.075, -0.08], [0, -0.102]]],   // the forehead
        [0.195, [[0, 0.104], [0.072, 0.08], [0.093, -0.02], [0.077, -0.08], [0, -0.1]]],   // the brow ridge, overhanging
        [0.175, [[0, 0.097], [0.07, 0.07], [0.092, -0.02], [0.076, -0.078], [0, -0.098]]],   // the eyes, set in under it
        [0.14, [[0, 0.1], [0.078, 0.07], [0.091, -0.02], [0.074, -0.074], [0, -0.092]]],   // the cheekbones: one broad plane each side
        [0.105, [[0, 0.098], [F ? 0.066 : 0.074, 0.07], [F ? 0.08 : 0.087, -0.022], [0.068, -0.066], [0, -0.076]]],   // the mouth: broad, the cheek carrying straight down
        [0.075, [[0, 0.094], [F ? 0.058 : 0.07, 0.068], [F ? 0.072 : 0.084, -0.026], [0.062, -0.06], [0, -0.066]]],   // the jaw's angle: broad and frank (male), softer (female)
        [0.048, [[0, 0.089], [F ? 0.036 : 0.048, 0.078], [F ? 0.054 : 0.064, 0.004], [0.05, -0.036], [0, -0.048]]],   // the chin: square (male), rounded (female)
        [0.032, [[0, 0.052], [0.036, 0.042], [0.05, -0.01], [0.046, -0.044], [0, -0.054]]],
        [0.0, [[0, 0.042], [0.03, 0.03], [0.046, -0.014], [0.042, -0.044], [0, -0.052]]],
    ];
    const headW = y => (y < 0.02 ? [[head, 0.8], [spine, 0.2]] : [[head, 1]]);
    const hx = F ? 0.95 : 1;
    sk.loft(HP.map(([y, half]) => ({ c: V(head, 0, y * hk, 0.004), pts: ringPts(half.map(([x, z]) => [x * hx * hk, z * hk])), w: headW(y), col: skin })));
    // the nose: a small wedge down the middle of the face
    sk.loft([
        { c: V(head, 0, 0.198 * hk, 0.1 * hk), shape: profile(0.005, 0.003, 0.003), w: [[head, 1]], col: skin },   // the bridge, from the brow
        { c: V(head, 0, 0.175 * hk, 0.099 * hk), shape: profile(0.008, 0.006, 0.004), w: [[head, 1]], col: skin },
        { c: V(head, 0, 0.14 * hk, 0.112 * hk), shape: profile(0.014, 0.016, 0.008), w: [[head, 1]], col: skin },   // the tip, standing out
        { c: V(head, 0, 0.128 * hk, 0.098 * hk), shape: profile(0.016, 0.01, 0.006), w: [[head, 1]], col: skin },
    ], { seg: 6, cap: true });
    // ears (flat, against the head) and closed, quiet eyes and brows (darker strokes, as in the reference)
    const dark = new THREE.Color(skin).multiplyScalar(0.8).getStyle(), brow = new THREE.Color(HAIR).getStyle();
    for (const s of [-1, 1]) {
        if (!F) sk.loft([{ c: V(head, s * 0.092 * hk, 0.19 * hk, -0.012 * hk), shape: profile(0.008, 0.014, 0.018), w: [[head, 1]], col: skin }, { c: V(head, s * 0.094 * hk, 0.145 * hk, -0.006 * hk), shape: profile(0.007, 0.011, 0.014), w: [[head, 1]], col: skin }], { seg: 5, cap: true, capStart: true });
        sk.loft([{ c: V(head, s * 0.033 * hk, 0.181 * hk, 0.092 * hk), shape: profile(0.01, 0.002, 0.0015), w: [[head, 1]], col: dark }, { c: V(head, s * 0.033 * hk, 0.178 * hk, 0.092 * hk), shape: profile(0.009, 0.002, 0.0015), w: [[head, 1]], col: dark }], { seg: 4 });
        sk.loft([{ c: V(head, s * 0.035 * hk, 0.205 * hk, 0.1 * hk), shape: profile(0.018, 0.004, 0.003), w: [[head, 1]], col: brow }, { c: V(head, s * 0.035 * hk, 0.199 * hk, 0.1 * hk), shape: profile(0.017, 0.004, 0.003), w: [[head, 1]], col: brow }], { seg: 4 });
    }
    // ---- hair: a cap over the skull, its hairline higher in front; short and tufted (male) or drawn back (female) ----
    // hair: big swept chunks, as the reference — the hairline high in front, lower at the nape
    const hl = th => (Math.cos(th) > 0 ? Math.pow(Math.cos(th), 0.7) * (F ? 0.11 : 0.11) : Math.cos(th) * (F ? 0.0 : 0.05));   // up to the hairline in front; down to the nape behind
    const HR = F ? [[0.322, 0.02, 0.02, 0.03], [0.305, 0.064, 0.06, 0.085], [0.27, 0.09, 0.092, 0.108], [0.225, 0.096, 0.1, 0.112], [0.13, 0.094, 0.098, 0.108]]
        : [[0.322, 0.03, 0.045, 0.035], [0.31, 0.082, 0.094, 0.088], [0.282, 0.104, 0.108, 0.112], [0.24, 0.108, 0.108, 0.12], [0.19, 0.106, 0.104, 0.118], [0.135, 0.1, 0.1, 0.09]];   // (low on top; full at the sides and back, round the skull)   // (swept back: volume over the brow, hugging the sides and the back)   // (to the nape, round the back and sides)   // (male: volume on top, swept up at the front)
    const HL = F ? 0.25 : 0.262;   // the hairline's height in front: every hair ring's front rises to it (the forehead and brows show)
    const front = (y, last) => th => { const c = Math.cos(th); return c > 0 ? Math.pow(c, 0.8) * Math.max(0, HL - y) : last ? c * (F ? 0 : 0.05) : 0; };
    const earLift = (y, last) => th => (!F && last ? Math.pow(Math.abs(Math.sin(th)), 6) * 0.055 : 0);   // the male's cut clears the ears
    sk.loft(HR.map(([y, w, df, db], i) => ({ c: V(head, 0, y * hk, 0.0), shape: profile((w + 0.01) * hk, (df + 0.006) * hk, (db + 0.012) * hk), w: [[head, 1]], col: HAIR, dy: (th => (front(y, i === HR.length - 1)(th) + earLift(y, i === HR.length - 1)(th)) * hk) })), { seg: 12, mat: 'double' });   // (a touch bigger than the skull all round: it never pokes through)
    if (false) for (const [x, len] of [[-0.055, 0.1], [0, 0.11], [0.055, 0.1]]) {   // (the tufts read as horns: gone)   // three big locks swept back over the crown
        sk.loft([
            { c: V(head, x * hk, 0.328 * hk, 0.075 * hk), rx: 0.035 * hk, rz: 0.012, w: [[head, 1]], col: HAIR },
            { c: V(head, x * 1.15 * hk, 0.338 * hk, (0.07 - len * 0.6) * hk), rx: 0.03 * hk, rz: 0.012, w: [[head, 1]], col: HAIR },
            { c: V(head, x * 1.3 * hk, 0.325 * hk, (0.07 - len) * hk), rx: 0.004, rz: 0.004, w: [[head, 1]], col: HAIR },
        ], { seg: 4, axis: 'z', cap: true });
    }
    if (F) for (const s of [-1, 1]) {   // a centre parting; strands down each side of the face to the jaw, over the ears
        sk.loft([
            { c: V(head, s * 0.07 * hk, 0.25 * hk, 0.055 * hk), rx: 0.03 * hk, rz: 0.018, w: [[head, 1]], col: HAIR },
            { c: V(head, s * 0.09 * hk, 0.17 * hk, 0.03 * hk), rx: 0.022 * hk, rz: 0.03, w: [[head, 1]], col: HAIR },
            { c: V(head, s * 0.085 * hk, 0.08 * hk, 0.02 * hk), rx: 0.016 * hk, rz: 0.022, w: [[head, 1]], col: HAIR },
            { c: V(head, s * 0.078 * hk, 0.04 * hk, 0.02 * hk), rx: 0.004, rz: 0.006, w: [[head, 1]], col: HAIR },
        ], { seg: 5, cap: true });
    }
    outfit?.extra?.({ sk, V, body, hips, spine, head, arms, legs, hk, F });   // the outfit's own pieces
    const mesh = sk.build();
    // the camisole's straps (female): from the neckline over each shoulder to the back
    if (F) {
        const cm = new THREE.MeshStandardMaterial({ color: cloth, flatShading: true, roughness: 0.9 });
        const strap = (a, b) => {   // a flat band from a to b (body coordinates), carried by the spine
            const A = spine.worldToLocal(body.localToWorld(new THREE.Vector3(...a))), B = spine.worldToLocal(body.localToWorld(new THREE.Vector3(...b)));
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.034, A.distanceTo(B) + 0.008, 0.01), cm);
            m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
            m.castShadow = true; m.userData.keep = m.userData.v2 = true; spine.add(m);
        };
        for (const s of [-1, 1]) {
            strap([s * 0.09, 1.45, 0.124], [s * 0.106, 1.515, 0.1]);     // the front: from the bust's top, out along the chest
            strap([s * 0.106, 1.515, 0.1], [s * 0.118, 1.566, 0.05]);
            strap([s * 0.118, 1.566, 0.05], [s * 0.118, 1.57, -0.054]);  // over the shoulder's line, lying on it
            strap([s * 0.118, 1.57, -0.054], [s * 0.106, 1.515, -0.096]); // down the back
            strap([s * 0.106, 1.515, -0.096], [s * 0.09, 1.45, -0.11]);
        }
    }

    // the ponytail (female): a rigid chain from the crown, swinging
    const tail = [];
    if (F) {
        const hm = new THREE.MeshStandardMaterial({ color: HAIR, flatShading: true, roughness: 0.7 });
        let tp = new THREE.Group(); tp.position.set(0, 0.315 * hk, -0.035); head.add(tp);   // (high on the crown)
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 6), new THREE.MeshStandardMaterial({ color: '#2a2a30', flatShading: true })); band.userData.keep = band.userData.v2 = true; tp.add(band);
        // one cohesive ponytail (a tube along a curve): up and back from the tie, arcing over, hanging down behind the shoulders
        const P = [[0, 0.3, -0.045, 0.03], [0, 0.335, -0.088, 0.042], [0, 0.318, -0.14, 0.05], [0, 0.24, -0.172, 0.054], [0, 0.12, -0.178, 0.05], [0, -0.01, -0.165, 0.044], [0, -0.13, -0.14, 0.032], [0, -0.22, -0.118, 0.012]];
        const ph = createSkin(root, [head]);
        ph.tube(P.map(([x, y, z, r]) => ({ c: ph.at(head, x, y * hk, z * hk), r: r * hk * 1.4, rz: r * hk * 1.15, w: [[head, 1]], col: HAIR })), { seg: 7, mat: 'double' });   // (thick and full)
        ph.build();
    }
    function update({ t, run = 0, amp = 0 }) {
        tail.forEach((g, i) => { if (i) { g.rotation.x = g.userData.base + run * 0.12 + Math.sin(t * 2.1 + i * 0.7) * 0.04 * (1 + amp); g.rotation.z = Math.sin(t * 1.6 + i) * 0.03; } });
    }
    return { mesh, update, weapon: () => null };
}
