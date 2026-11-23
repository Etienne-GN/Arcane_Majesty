// The base bodies (2026-11-22, option 1: "as close as possible" to docs/3d/characters/base_mesh_reference.jpg) — a male
// and a female low-poly human, one continuous skinned mesh on the classic rig. Every ring of the body has an anatomical
// outline (skin.js profile): the chest and pectorals, shoulder blades and the spine's groove, a tapering waist, glutes,
// the deltoid cap, biceps and forearm, the thigh, the kneecap, the calf, ankles, bare feet, hands with a thumb; the head
// is sculpted the same way — chin, jaw angle, cheekbones, eye sockets, brow ridge, forehead and crown — with a nose and
// ears. Underwear (dark shorts; a top for the female) is coloured into the mesh. Hair is part of it too.
// buildBase(ctx, { sex }) → { mesh, update }.
import * as THREE from 'three';
import { createSkin, blend, profile, ringPts, pointKey } from './skin.js';
import EDITS_MALE from './edits_male.json';     // points moved by hand in Blender (the Character Lab's Export / Import)
import EDITS_FEMALE from './edits_female.json';

const sym = (th, amp, wd) => [{ th, amp, wd }, { th: -th, amp, wd }];

// outfit (optional): { torso(y, θ, base), arm(part, y), leg(part, y, base), armLoose(part, y), legLoose(part, y), armTube(part, y), legTube(part, y), foot, extra(helpers) } — colours painted onto the body's
// own surface, and extra pieces (coat tails, a collar…) added before the mesh is built. Used by the dressed cast (eldrin.js).
export function buildBase(ctx, { sex = 'male', skin = '#e2b590', cloth = '#3a3530', hair = null, outfit = null, headK = 1, footK = 1 } = {}) {   // headK: the head's size; footK: the feet (boots are bigger)
    const F = sex === 'female';
    const { root, body, hips, spine, head, arms, legs } = ctx;
    const HAIR = hair ?? (F ? '#151922' : '#2a1d16');
    const BALD = ctx.look?.hair?.style === 'bald';   // no hair (2026-11-23: hair will be interchangeable; the hairless reference sheet)
    const bones = [hips, spine, head, arms.L.upper, arms.L.fore, arms.R.upper, arms.R.fore, legs.L.thigh, legs.L.shin, legs.R.thigh, legs.R.shin];
    head.position.z += 0.024; head.position.y += 0.005;   // (2026-11-23: lowered 2.5 cm — it sat too high on the neck) root.updateMatrixWorld(true);   // (the head carried a little forward of the shoulders, the neck leaning to it, as the reference)
    const HV = F ? 0.86 : 0.82;   // the head's height (2026-11-23: it was ~25% too long for its width against the reference)
    const sk = createSkin(root, bones, { edits: F ? EDITS_FEMALE : EDITS_MALE }), V = (g, x, y, z) => sk.at(g, x, g === head ? y * HV : y, z);

    // ---- the torso, from the neck down to the crotch (body coordinates: the rig's own scale applies) ----
    const torsoW = y => (y > 1.655 ? [[head, 1]] : y > 1.6 ? [[spine, 0.4], [head, 0.6]] : y > 1.57 ? [[spine, 0.75], [head, 0.25]] : y > 1.1 ? [[spine, 1]] : y > 1.0 ? blend(hips, spine, (y - 1.0) / 0.1) : [[hips, 1]]);
    // Hand-placed rings (2026-11-22, "far fewer shapes, flat planes at the right angles"): half of each outline on the +x
    // side, from the front centre round to the back centre — front centre, pectoral middle, pectoral outer edge, side front,
    // side back, shoulder blade, spine. Big flat planes: the pectorals are two faces with a small step beneath them.
    const TM = [   // y, half outline, colour   (male)
        [1.675, [[0, 0.042], [0.027, 0.039], [0.043, 0.026], [0.051, 0.006], [0.051, -0.026], [0.036, -0.052], [0, -0.062]], skin],   // the neck: a slim column, leaning forward as it rises (2026-11-23)
        [1.6, [[0, 0.046], [0.032, 0.043], [0.056, 0.024], [0.078, -0.004], [0.076, -0.044], [0.046, -0.074], [0, -0.078]], skin],   // the trapezius begins low on the neck: its base set back, the throat clear
        [1.555, [[0, 0.064], [0.06, 0.064], [0.13, 0.048], [0.196, 0.0], [0.188, -0.06], [0.11, -0.094], [0, -0.096]], skin],   // the collarbones: sloping down and out
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
        [1.675, [[0, 0.038], [0.025, 0.035], [0.04, 0.024], [0.047, 0.005], [0.047, -0.024], [0.032, -0.048], [0, -0.056]], skin],
        [1.6, [[0, 0.042], [0.03, 0.039], [0.05, 0.022], [0.07, -0.004], [0.068, -0.04], [0.042, -0.066], [0, -0.07]], skin],
        [1.555, [[0, 0.058], [0.054, 0.058], [0.104, 0.042], [0.15, 0], [0.142, -0.05], [0.078, -0.08], [0, -0.084]], skin],
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
        // outfit.armLoose(part, y) → how much wider the clothing stands off the arm there (1: skin-tight; sleeves are ample)
        // outfit.armTube(part, y) → a sleeve's radius there (m): the ring becomes a plain round tube (loose cloth hides the muscles)
        const R = (g, ox, y, w, df, db, wts, b = []) => {
            const part = g === fore ? 'fore' : 'upper', L = outfit?.armLoose?.(part, y) ?? 1, r = outfit?.armTube?.(part, y);
            return { c: V(g, s * (ox - (F ? 0.03 : 0)), y, 0), shape: r ? profile(r, r, r) : profile(w * k * L, df * k * L, db * k * L, b), w: wts, col: outfit?.arm ? outfit.arm(part, y) ?? skin : skin };
        };   // (hers set a little in: narrower, sloping shoulders)
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
            // the hand, closed in a fist (2026-11-23: "hands are too big, make them closed first, like a fist"): a compact
            // block ~12 cm from the wrist instead of the old open paddle (~20 cm) — the palm's flat facing the body,
            // the curled fingers thickening it, the knuckle ridge at its lower front, then rounded shut
            // (2026-11-23, second pass: "a bit too small" — ~13% bigger, ~1 cm longer)
            R(fore, 0.0, -0.29, 0.023, 0.035, 0.032, [[fore, 1]]),   // the heel of the palm
            R(fore, 0.0, -0.322, 0.025, 0.039, 0.034, [[fore, 1]]),   // the fist's middle: the fingers curled into the palm
            R(fore, 0.0, -0.35, 0.024, 0.038, 0.031, [[fore, 1]], [{ th: 0, amp: 0.0035, wd: 0.5 }]),   // the knuckles
            R(fore, 0.0, -0.372, 0.017, 0.026, 0.02, [[fore, 1]]),
            R(fore, 0.0, -0.384, 0.008, 0.012, 0.009, [[fore, 1]]),
        ], { seg: 6, cap: true, capStart: true });
        sk.loft([   // the thumb: folded across the front of the curled fingers, toward the body
            { c: V(fore, s * (0.007 - (F ? 0.03 : 0)), -0.296, 0.029 * k), shape: profile(0.0125 * k, 0.0125 * k, 0.0125 * k), w: [[fore, 1]], col: skin },
            { c: V(fore, s * (-0.004 - (F ? 0.03 : 0)), -0.326, 0.035 * k), shape: profile(0.01 * k, 0.01 * k, 0.01 * k), w: [[fore, 1]], col: skin },
            { c: V(fore, s * (-0.013 - (F ? 0.03 : 0)), -0.341, 0.032 * k), shape: profile(0.006, 0.006, 0.006), w: [[fore, 1]], col: skin },
        ], { seg: 4, cap: true });
    }

    // ---- legs: the thigh, the kneecap, the calf, the ankle; bare feet ----
    const kl = F ? 1.4 : 1.38;   // (the reference's legs are heavy: thick thighs, full calves)
    for (const side of ['L', 'R']) {
        const { thigh, shin } = legs[side], s = side === 'L' ? 1 : -1;
        // outfit.legLoose(part, y): the same for the legs (trousers hanging loose, boot tops)
        // outfit.legTube(part, y): the same for trouser legs
        const R = (g, ox, y, w, df, db, wts, col = skin, b = []) => {
            const part = g === shin ? 'shin' : 'thigh', L = outfit?.legLoose?.(part, y) ?? 1, r = outfit?.legTube?.(part, y);
            return { c: V(g, s * ox, y, 0), shape: r ? profile(r, r * 1.03, r * 1.06) : profile(w * kl * L, df * kl * L, db * kl * L, b), w: wts, col: outfit?.leg ? outfit.leg(part, y, col) : col };
        };
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
    const hk = (F ? 0.97 : 1.03) * headK;   // (smaller: 2026-11-23, "the head is too big")   // (the reference's head is ~40% of the shoulders' width)
    // the head, hand-placed: the face's centre line, the cheek's front, the cheekbone, the side (the ear), the back's side,
    // the back — big planes: the brow overhanging the eyes, the cheekbones, the jaw's angle, the chin
    // The head (2026-11-23): each ring's points placed by hand at their own heights — the jawline slants from the chin up to
    // below the ear. The lower face kept SIMPLE (the user: few broad facets, as the reference): on the jaw, chin and mouth
    // rings the mid-face point lies on the line between the centre and the cheek's front, so each side reads as one plane;
    // a broad, square jaw; a short chin that sits back. Points (x, y, z), half the head, from the face's centre round to
    // the nape: centre, mid-face, cheek front, cheek side, below the ear, the skull's back side, the back.
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const flatMid = r => { r[1] = mid(r[0], r[2]); return r; };   // the mid-face point on the plane: one facet each side
    const HEAD = [
        [[0, 0, 0.04], [0.025, 0, 0.036], [0.04, 0, 0.022], [0.048, 0, 0], [0.047, 0, -0.022], [0.035, 0, -0.042], [0, 0, -0.05]],   // the neck's top: set back under the jaw
        flatMid([[0, 0.044, 0.086], [0, 0, 0], [0.056, 0.058, 0.068], [0.08, 0.09, 0.03], [0.08, 0.12, -0.008], [0.062, 0.075, -0.058], [0, 0.065, -0.068]]),   // the jawline: a broad, square jaw
        flatMid([[0, 0.064, 0.094], [0, 0, 0], [0.06, 0.074, 0.072], [0.082, 0.102, 0.034], [0.083, 0.128, -0.007], [0.066, 0.09, -0.064], [0, 0.082, -0.075]]),   // the chin: short, sitting back
        flatMid([[0, 0.092, 0.094], [0, 0, 0], [0.062, 0.096, 0.073], [0.082, 0.114, 0.04], [0.084, 0.138, -0.006], [0.07, 0.11, -0.07], [0, 0.1, -0.082]]),   // the mouth
        [[0, 0.118, 0.098], [0.031, 0.118, 0.092], [0.062, 0.125, 0.074], [0.081, 0.137, 0.045], [0.087, 0.156, -0.006], [0.077, 0.14, -0.078], [0, 0.135, -0.092]],   // under the nose; the cheek's plane
        [[0, 0.155, 0.1], [0.032, 0.158, 0.093], [0.067, 0.158, 0.078], [0.087, 0.16, 0.045], [0.09, 0.172, -0.008], [0.081, 0.166, -0.082], [0, 0.166, -0.1]],   // the cheekbones
        [[0, 0.182, 0.1], [0.03, 0.18, 0.086], [0.064, 0.18, 0.076], [0.087, 0.182, 0.043], [0.092, 0.19, -0.01], [0.081, 0.19, -0.085], [0, 0.19, -0.103]],   // the eyes, set in
        [[0, 0.205, 0.1], [0.033, 0.207, 0.096], [0.067, 0.204, 0.082], [0.088, 0.2, 0.046], [0.092, 0.21, -0.012], [0.08, 0.21, -0.086], [0, 0.21, -0.104]],   // the brow: a gentle ridge (2026-11-23: no Neanderthal overhang)
        [[0, 0.245, 0.099], [0.034, 0.245, 0.095], [0.066, 0.243, 0.078], [0.086, 0.24, 0.042], [0.091, 0.242, -0.015], [0.077, 0.242, -0.085], [0, 0.242, -0.101]],   // the forehead: upright, as tall as the reference's
        [[0, 0.275, 0.088], [0.032, 0.276, 0.084], [0.062, 0.273, 0.066], [0.08, 0.27, 0.032], [0.084, 0.27, -0.02], [0.07, 0.27, -0.078], [0, 0.272, -0.094]],   // its top, rounding over
        [[0, 0.3, 0.05], [0.028, 0.301, 0.046], [0.05, 0.298, 0.032], [0.063, 0.295, 0.008], [0.066, 0.295, -0.03], [0.054, 0.295, -0.064], [0, 0.297, -0.074]],
        [[0, 0.318, 0.012], [0.018, 0.318, 0.009], [0.03, 0.316, -0.003], [0.036, 0.314, -0.018], [0.036, 0.314, -0.032], [0.026, 0.314, -0.046], [0, 0.314, -0.05]],   // the crown
    ];
    // the female face: a narrower jaw and a softer chin
    const fem = (k, i, [x, y, z]) => (F && k >= 1 && k <= 3 && i >= 1 && i <= 4 ? [x * (i === 3 || i === 4 ? 0.88 : 0.9), y, z] : [x, y, z]);
    // the skull, from the eyes up: rings
    sk.loft(HEAD.slice(6).map(half => {
        const my = half.reduce((a, p) => a + p[1], 0) / half.length;
        return { c: V(head, 0, my * hk, 0.004), pts: ringPts(half.map(([x, y, z]) => [x * hk, z * hk, (y - my) * hk])), w: [[head, 1]], col: skin };
    }).reverse(), { capStart: true });
    // the face below the eyes, as the reference (2026-11-23): FOUR shapes — a big triangle for each cheek, a trapezoid between
    // them whose bottom edge is the chin — the nose over it; the jaw's side plane behind each cheek; the jaw's underside and
    // the back of the head down to the neck's top. Points (x, y, z) head-local; the eye row is the skull's last ring.
    {
        const E = HEAD[6], Q = {
            CC: [0, 0.058, 0.094], CR: [F ? 0.034 : 0.042, 0.058, 0.09],              // the chin: the trapezoid's bottom edge
            JA: [F ? 0.072 : 0.08, 0.1, 0.002],                                       // the jaw's angle, below the ear
            NF: [0, 0.046, 0.06], N2: [0.042, 0.042, 0.042], NS: [0.05, 0, 0], N4: [0.05, 0, -0.03], N5: [0.038, 0, -0.054], NB: [0, 0, -0.064],   // (the neck's back fuller)   // the neck's top
            NBS: [0.072, 0.092, -0.08], BC: [0, 0.088, -0.094],   // the back of the skull: full and round down to the nape                          // the nape
        };
        const at = (p, s) => ({ p: V(head, s * p[0] * hk, p[1] * hk, p[2] * hk + 0.004), w: p[1] < 0.02 ? [[head, 0.8], [spine, 0.2]] : [[head, 1]] });
        const centre = V(head, 0, 0.16 * hk, 0);
        // The chin's tip rounded (2026-11-23: "the tip that points toward the ground — round, not a pointy tip"): seen from the
        // side, the face's front and the chin's underside met in a sharp wedge. The front now stops a little above the old tip
        // (f), the underside a little behind it (u), and two narrow facets bend between them through a point set out toward
        // the old tip (m): a rounded tip. Each new point follows the user's edits of the points it comes from (the jaw keeps
        // its shape) and has its own key, so it can be moved in the point editor too.
        const EDITS = F ? EDITS_FEMALE : EDITS_MALE, ed = o => { const q = EDITS[pointKey(o.p)]; return q ? new THREE.Vector3(...q) : o.p.clone(); };
        const lerpV = (a, b, t) => a.clone().lerp(b, t);
        const tipPts = (corner, front, under, s) => {   // corner: 'CC' or 'CR'; front: the eye-row point above it; under: the neck point behind it
            const X = at(Q[corner], corner === 'CC' ? 1 : s), Fn = at(E[front], s), Un = at(Q[under], under === 'NF' ? 1 : s);
            const pts = (x, f, u) => { const pf = lerpV(x, f, 0.14), pu = lerpV(x, u, 0.22); return { f: pf, u: pu, m: lerpV(lerpV(pf, pu, 0.5), x, 0.45) }; };
            const g = pts(X.p, Fn.p, Un.p), e = pts(ed(X), ed(Fn), ed(Un));
            return Object.fromEntries(['f', 'm', 'u'].map(k => [k, { p: e[k], w: X.w, key: pointKey(g[k]) }]));
        };
        const TIP = { 1: { CC: tipPts('CC', 0, 'NF', 1), CR: tipPts('CR', 1, 'N2', 1) }, '-1': { CC: tipPts('CC', 0, 'NF', -1), CR: tipPts('CR', 1, 'N2', -1) } };
        const pick = (k, s) => { const m = /^(CC|CR)([fmu])$/.exec(k); return m ? TIP[s][m[1]][m[2]] : null; };
        const shape = (list, s) => sk.poly(list.map(k => (typeof k === 'number' ? at(E[k], s) : pick(k, s) ?? at(Q[k], k === 'CC' || k === 'NF' || k === 'NB' || k === 'BC' ? 1 : s))), skin, centre);
        for (const s of [1, -1]) {
            shape([0, 1, 'CRf', 'CCf'], s);            // the trapezoid's half: from under the eye to just above the chin's tip
            shape(['CCf', 'CRf', 'CRm', 'CCm'], s);    // the rounded tip: two narrow facets bending from the front…
            shape(['CCm', 'CRm', 'CRu', 'CCu'], s);    // …to the underside
            shape([1, 2, 3, 'CRf'], s);                // the cheek: one big triangle
            shape([3, 4, 'JA', 'CRu', 'CRm', 'CRf'], s); // the jaw's side plane, closing the tip's side
            shape(['CCu', 'CRu', 'N2', 'NF'], s);      // under the chin
            shape(['CRu', 'JA', 'NS', 'N2'], s);       // under the jaw
            shape([4, 5, 'NBS', 'JA'], s);             // behind the jaw
            shape(['JA', 'NBS', 'N4', 'NS'], s);
            shape([5, 6, 'BC', 'NBS'], s);             // the back of the head
            shape(['NBS', 'BC', 'NB', 'N5', 'N4'], s); // the nape
        }
    }
    // the nose: a ridge from the brow to a defined tip (kept as the user liked it)
    sk.loft([
        { c: V(head, 0, 0.2 * hk, 0.104 * hk), shape: profile(0.006, 0.003, 0.003), w: [[head, 1]], col: skin },   // the bridge, from the brow
        { c: V(head, 0, 0.17 * hk, 0.104 * hk), shape: profile(0.008, 0.005, 0.004), w: [[head, 1]], col: skin },
        { c: V(head, 0, 0.138 * hk, 0.113 * hk), shape: profile(0.011, 0.008, 0.008), w: [[head, 1]], col: skin },   // the tip: a ridge, not a box
        { c: V(head, 0, 0.126 * hk, 0.1 * hk), shape: profile(0.013, 0.006, 0.006), w: [[head, 1]], col: skin },
    ], { seg: 4, cap: true });
    // ears (flat, against the head); the eyes and brows follow below
    for (const s of [-1, 1]) {
        if (!F || BALD) sk.loft([{ c: V(head, s * 0.092 * hk, 0.19 * hk, -0.012 * hk), shape: profile(0.008, 0.014, 0.018), w: [[head, 1]], col: skin }, { c: V(head, s * 0.094 * hk, 0.145 * hk, -0.006 * hk), shape: profile(0.007, 0.011, 0.014), w: [[head, 1]], col: skin }], { seg: 5, cap: true, capStart: true });
    }
    // ---- hair: a cap over the skull, its hairline higher in front; short and tufted (male) or drawn back (female) ----
    // hair: big swept chunks, as the reference — the hairline high in front, lower at the nape
    const hl = th => (Math.cos(th) > 0 ? Math.pow(Math.cos(th), 0.7) * (F ? 0.11 : 0.11) : Math.cos(th) * (F ? 0.0 : 0.05));   // up to the hairline in front; down to the nape behind
    const HR = F ? [[0.322, 0.02, 0.02, 0.03], [0.305, 0.064, 0.06, 0.085], [0.27, 0.09, 0.092, 0.108], [0.225, 0.096, 0.1, 0.112], [0.13, 0.094, 0.098, 0.108]]
        : [[0.322, 0.03, 0.045, 0.035], [0.31, 0.082, 0.094, 0.088], [0.282, 0.104, 0.108, 0.112], [0.24, 0.108, 0.108, 0.12], [0.19, 0.106, 0.104, 0.118], [0.135, 0.1, 0.1, 0.09]];   // (low on top; full at the sides and back, round the skull)   // (swept back: volume over the brow, hugging the sides and the back)   // (to the nape, round the back and sides)   // (male: volume on top, swept up at the front)
    const HL = F ? 0.25 : 0.262;   // the hairline's height in front: every hair ring's front rises to it (the forehead and brows show)
    const front = (y, last) => th => { const c = Math.cos(th); return c > 0 ? Math.pow(c, 0.8) * Math.max(0, HL - y) : last ? c * (F ? 0 : 0.05) : 0; };
    const earLift = (y, last) => th => (!F && last ? Math.pow(Math.abs(Math.sin(th)), 6) * 0.055 : 0);   // the male's cut clears the ears
    if (!BALD) sk.loft(HR.map(([y, w, df, db], i) => ({ c: V(head, 0, y * hk, 0.0), shape: profile((w + 0.01) * hk, (df + 0.006) * hk, (db + 0.012) * hk), w: [[head, 1]], col: HAIR, dy: (th => (front(y, i === HR.length - 1)(th) + earLift(y, i === HR.length - 1)(th)) * hk) })), { seg: 12, mat: 'double' });   // (a touch bigger than the skull all round: it never pokes through)
    if (false) for (const [x, len] of [[-0.055, 0.1], [0, 0.11], [0.055, 0.1]]) {   // (the tufts read as horns: gone)   // three big locks swept back over the crown
        sk.loft([
            { c: V(head, x * hk, 0.328 * hk, 0.075 * hk), rx: 0.035 * hk, rz: 0.012, w: [[head, 1]], col: HAIR },
            { c: V(head, x * 1.15 * hk, 0.338 * hk, (0.07 - len * 0.6) * hk), rx: 0.03 * hk, rz: 0.012, w: [[head, 1]], col: HAIR },
            { c: V(head, x * 1.3 * hk, 0.325 * hk, (0.07 - len) * hk), rx: 0.004, rz: 0.004, w: [[head, 1]], col: HAIR },
        ], { seg: 4, axis: 'z', cap: true });
    }
    if (F && !BALD) for (const s of [-1, 1]) {   // a centre parting; strands down each side of the face to the jaw, over the ears
        sk.loft([
            { c: V(head, s * 0.07 * hk, 0.25 * hk, 0.055 * hk), rx: 0.03 * hk, rz: 0.018, w: [[head, 1]], col: HAIR },
            { c: V(head, s * 0.09 * hk, 0.17 * hk, 0.03 * hk), rx: 0.022 * hk, rz: 0.03, w: [[head, 1]], col: HAIR },
            { c: V(head, s * 0.085 * hk, 0.08 * hk, 0.02 * hk), rx: 0.016 * hk, rz: 0.022, w: [[head, 1]], col: HAIR },
            { c: V(head, s * 0.078 * hk, 0.04 * hk, 0.02 * hk), rx: 0.004, rz: 0.006, w: [[head, 1]], col: HAIR },
        ], { seg: 5, cap: true });
    }
    const extraOut = outfit?.extra?.({ sk, V, root, createSkin, body, hips, spine, head, arms, legs, hk, F });   // the outfit's own pieces (may return { update } for pieces of their own that move, e.g. a coat's tails)
    const mesh = sk.build(); mesh.userData.editSex = F ? 'female' : 'male'; mesh.name = F ? 'base_female' : 'base_male';
    mesh.userData.hairColor = BALD ? null : new THREE.Color(HAIR);   // (the point editor tells the hair's points by it: Show › Hair)
    // ---- the eyes and brows (2026-11-23: "real small eyes with a pupil, not just dots"): flat faceted pieces laid on the face —
    // an almond white, the iris (the look's eye colour), a black pupil, a tiny highlight, a dark upper lash line; brows of the
    // hair's colour, thick at the inner end, arching, thinning toward the temple. Each point is projected onto the head as
    // built (the point editor's edits applied), so they sit on the visible face whatever shape it is given.
    {
        const probe = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), rc = new THREE.Raycaster();
        const fs = createSkin(root, [head]), centre = V(head, 0, 0.17 * hk, 0), dir = new THREE.Vector3();
        const P = (x, y, lift) => {   // (x, y) head-local, before the head's scale; lift: how far off the surface
            const a = V(head, x * hk, y * hk, 0.3 * hk), b = V(head, x * hk, y * hk, 0);
            dir.copy(b).sub(a).normalize(); rc.set(a, dir);
            const hit = rc.intersectObject(probe, false)[0];
            return { p: hit ? hit.point.clone().addScaledVector(dir, -lift) : b, w: [[head, 1]] };
        };
        const iris = ctx.look?.face?.eyes ?? '#5a3b22', lash = new THREE.Color(HAIR).multiplyScalar(0.55).getStyle(), browCol = new THREE.Color(HAIR).getStyle();
        const EX = 0.036, EY = 0.182;
        for (const s of [-1, 1]) {
            const ring = (cx, cy, rx, ry, n, lift, almond = false) => Array.from({ length: n }, (_, i) => {
                const a = (i / n) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
                return P(s * (cx + c * rx), cy + sn * ry * (almond && sn < 0 ? 0.8 : 1) + (almond ? 0.0008 * c : 0), lift);   // (almond: the lower lid flatter, the outer corner a touch higher)
            });
            fs.poly(ring(EX, EY, 0.0162, 0.0066, 12, 0.0012, true), '#efe9df', centre);              // the white
            fs.poly(ring(EX - 0.0008, EY - 0.0003, 0.006, 0.006, 10, 0.002), iris, centre);          // the iris
            fs.poly(ring(EX - 0.0008, EY - 0.0003, 0.0027, 0.0027, 8, 0.0027), '#0c0a0a', centre);   // the pupil
            fs.poly(ring(EX + 0.0012, EY + 0.002, 0.0011, 0.0011, 5, 0.0032), '#ffffff', centre);    // a highlight
            // the upper lash line: a thin dark band along the white's top edge
            const arc = Array.from({ length: 7 }, (_, i) => { const a = Math.PI * (0.04 + 0.92 * (i / 6)); return [EX + Math.cos(a) * 0.0172, EY + Math.sin(a) * 0.007 + 0.0008 * Math.cos(a)]; });
            for (let i = 0; i < arc.length - 1; i++) {
                const [x0, y0] = arc[i], [x1, y1] = arc[i + 1], t = 0.0016;
                fs.poly([P(s * x0, y0, 0.0024), P(s * x1, y1, 0.0024), P(s * x1, y1 + t, 0.0024), P(s * x0, y0 + t, 0.0024)], lash, centre);
            }
            // the brow: inner end low and thick, a gentle arch, the outer end thin — on the ridge, well above the eye
            const B = [[0.011, 0.2, 0.0075], [0.022, 0.2035, 0.0074], [0.034, 0.2065, 0.0068], [0.046, 0.2075, 0.0056], [0.056, 0.2055, 0.004], [0.065, 0.201, 0.0018]];
            for (let i = 0; i < B.length - 1; i++) {
                const [x0, y0, t0] = B[i], [x1, y1, t1] = B[i + 1];
                fs.poly([P(s * x0, y0, 0.0016), P(s * x1, y1, 0.0016), P(s * x1, y1 + t1, 0.0016), P(s * x0, y0 + t0, 0.0016)], browCol, centre);
            }
        }
        fs.build().userData.face = true;   // (the point editor shows it: Show › Eyes)
        // the mouth (2026-11-23: "subtle, as the reference"): a slightly darker lip line, its corners turned down a hair, a
        // faint lower lip beneath it and a soft shadow under that — laid on the face the same way; its own mesh (Show › Mouth)
        const ms = createSkin(root, [head]), tone = (k, warm = 0) => new THREE.Color(skin).multiplyScalar(k).lerp(new THREE.Color('#b0645a'), warm).getStyle();
        const MY = 0.098, MW = F ? 0.019 : 0.022;
        const band = (pts, col, lift) => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0, t0] = pts[i], [x1, y1, t1] = pts[i + 1]; ms.poly([P(x0, y0, lift), P(x1, y1, lift), P(x1, y1 + t1, lift), P(x0, y0 + t0, lift)], col, centre); } };
        const across = (w, f) => Array.from({ length: 7 }, (_, i) => { const u = (i / 6) * 2 - 1; return f(u * w, u); });
        band(across(MW * 0.72, (x, u) => [x, MY - 0.0075 + 0.0012 * u * u, 0.0055 * (1 - 0.5 * u * u)]), tone(0.9), 0.0008);                 // the shadow under the lower lip
        band(across(MW * 0.75, (x, u) => [x, MY - 0.0052 - 0.0006 * u * u, 0.005 * (1 - 0.6 * u * u)]), tone(F ? 0.9 : 0.92, F ? 0.22 : 0.1), 0.0011);   // the lower lip
        band(across(MW, (x, u) => [x, MY - 0.0012 * u * u - 0.0009, 0.0022 * (1 - 0.35 * u * u)]), tone(0.5, 0.12), 0.0015);   // (darker: 2026-11-23, "more visible")                  // the lip line
        ms.build().userData.mouth = true;
    }
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
    if (F && !BALD) {
        const hm = new THREE.MeshStandardMaterial({ color: HAIR, flatShading: true, roughness: 0.7 });
        let tp = new THREE.Group(); tp.position.set(0, 0.315 * hk * HV, -0.035); head.add(tp);   // (high on the crown)
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 6), new THREE.MeshStandardMaterial({ color: '#2a2a30', flatShading: true })); band.userData.keep = band.userData.v2 = true; tp.add(band);
        // one cohesive ponytail (a tube along a curve): up and back from the tie, arcing over, hanging down behind the shoulders
        const P = [[0, 0.3, -0.045, 0.03], [0, 0.335, -0.088, 0.042], [0, 0.318, -0.14, 0.05], [0, 0.24, -0.172, 0.054], [0, 0.12, -0.178, 0.05], [0, -0.01, -0.165, 0.044], [0, -0.13, -0.14, 0.032], [0, -0.22, -0.118, 0.012]];
        const ph = createSkin(root, [head]);
        ph.tube(P.map(([x, y, z, r]) => ({ c: ph.at(head, x, y * hk * (y > 0.1 ? HV : 1), z * hk), r: r * hk * 1.4, rz: r * hk * 1.15, w: [[head, 1]], col: HAIR })), { seg: 7, mat: 'double' });   // (thick and full)
        ph.build();
    }
    function update(a) {
        const { t, run = 0, amp = 0 } = a;
        extraOut?.update?.(a);
        tail.forEach((g, i) => { if (i) { g.rotation.x = g.userData.base + run * 0.12 + Math.sin(t * 2.1 + i * 0.7) * 0.04 * (1 + amp); g.rotation.z = Math.sin(t * 1.6 + i) * 0.03; } });
    }
    return { mesh, update, weapon: () => null };
}
