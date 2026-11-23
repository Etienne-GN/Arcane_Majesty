// Eldrin Nightshade — character model v2 (2026-11-23), the male base body dressed after docs/3d/characters/reference_v2.jpg:
// a long crimson coat (the shirt showing dark at its open front, a high popped collar, coat tails to the knees split front
// and back, sleeves to the forearm), gold epaulettes, dark leather bracers, a dark shirt crossed by two straps, a belt with
// a gold buckle, a pouch at the hip, dark trousers, brown leather boots to below the knee. His staff is the classic weapon.
import * as THREE from 'three';
import { buildBase } from './base.js';
import { blend, profile } from './skin.js';

const C = { coat: '#a3141f', coatDark: '#7a0f17', shirt: '#1c1714', strap: '#3e2416', leather: '#5a3520', leatherDark: '#3e2416', trousers: '#231d19', gold: '#d4a84a', skin: '#e2b48f', hair: '#2e1d14' };

export function buildEldrin(ctx) {
    return buildBase(ctx, {
        sex: 'male', headK: 1, footK: 1.3, skin: C.skin, cloth: C.trousers, hair: C.hair,
        outfit: {
            torso: (y, th, base) => (y > 1.6 ? base : y < 1.03 ? C.trousers : y < 1.065 ? C.leatherDark : Math.abs(th) < 0.42 ? C.shirt : C.coat),   // the coat open over the shirt; the belt; trousers
            arm: (part, y) => (part === 'upper' ? C.coat : y > -0.14 ? C.coat : y > -0.29 ? C.leatherDark : null),   // sleeves to the forearm, bracers, bare hands
            leg: (part, y) => (part === 'thigh' ? C.trousers : y > -0.06 ? C.trousers : C.leather),   // boots from below the knee
            // ample clothes (2026-11-23: "too tight on him — the sleeves and the trouser legs"): they stand off the body.
            // (the shoulder's top rings stay as they are: your point edits of the male base live there)
            // (second pass: "they should look big, not tight — less defined like muscles, more tubular"): the cloth is a plain
            // round tube, no biceps, forearm swell, kneecap or calf showing through — the sleeve widening a little to its cuff,
            // the trouser leg falling straight from the hip to the boot tops
            armTube: (part, y) => (part === 'upper' ? (y > -0.05 ? null : 0.088 + (-0.05 - y) * 0.01) : y > -0.14 ? 0.09 + (-y) * 0.07 : null),
            armLoose: (part, y) => (part === 'fore' && y <= -0.14 && y > -0.29 ? 1.08 : 1),   // the leather bracers: fitted, a little proud
            legTube: (part, y) => (part === 'thigh' ? (y > 0 ? null : 0.118 - (-y) * 0.03) : y > -0.06 ? 0.104 : null),
            legLoose: (part, y) => (part === 'thigh' && y > 0 ? 1.1 : part === 'shin' && y <= -0.06 ? (y > -0.2 ? 1.1 : 1.04) : 1),   // (the boots: fitted leather)
            foot: C.leather,
            extra({ sk, V, root, createSkin, body, hips, spine, arms, legs }) {
                // The coat's tails (2026-11-23: "the legs pass through the back of the robe when running — the old one didn't"):
                // their own mesh, hung like the classic coat's panels from three joints at the waist — a flap on each side
                // that follows its thigh forward, and the back, which swings out behind as he runs and always clears the
                // thighs. From the waist to the knees, open at the front, cut fuller than before.
                root.updateMatrixWorld(true);
                const pivot = () => { const g = new THREE.Group(); g.position.copy(hips.worldToLocal(root.localToWorld(V(body, 0, 1.07, -0.005)))); hips.add(g); return g; };
                const back = pivot(), flapL = pivot(), flapR = pivot();
                const cs = createSkin(root, [hips, back, flapL, flapR]);
                const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
                const tailW = k => th => {   // k: how freely this row hangs (0 at the waist, more toward the hem)
                    const a = th > Math.PI ? th - 2 * Math.PI : th, b = smooth(1.75, 2.35, Math.abs(a)), flap = a > 0 ? flapL : flapR;
                    return [[hips, 1 - k], [flap, k * (1 - b)], [back, k * b]].filter(([, w]) => w > 1e-3);
                };
                const T = (y, w, df, db, k) => ({ c: V(body, 0, y, -0.005), shape: profile(w, df, db), w: tailW(k), col: C.coat });
                const ROWS = [[1.07, 0.17, 0.115, 0.115, 0], [1.01, 0.19, 0.14, 0.135, 0.35], [0.95, 0.216, 0.17, 0.16, 0.85], [0.75, 0.246, 0.192, 0.193, 1], [0.55, 0.263, 0.2, 0.215, 1], [0.38, 0.274, 0.204, 0.227, 1], [0.24, 0.286, 0.208, 0.24, 1]];
                const OPEN = 0.5;   // the opening's half-angle at the front
                cs.loft(ROWS.map(r => T(...r)), { seg: 14, from: OPEN, to: Math.PI * 2 - OPEN, mat: 'double' });   // (to the knees)
                // gold trim (2026-11-23): down both edges of the opening, from the waist to the hem, and all along the hem — each
                // weighted as the coat is there, so it moves with the flaps and the back
                for (const th of [OPEN, Math.PI * 2 - OPEN]) cs.loft(ROWS.map(([y, w, df, db, k]) => {
                    const [x, z] = profile(w * 1.015, df * 1.015, db * 1.015)(th), c = V(body, 0, y, -0.005);
                    return { c: new THREE.Vector3(c.x + x, c.y, c.z + z), shape: profile(0.013, 0.007, 0.007), w: tailW(k)(th), col: C.gold };
                }), { seg: 4, cap: true, capStart: true });
                const [hy, hw, hdf, hdb] = ROWS.at(-1), H = (y, g) => ({ c: V(body, 0, y, -0.005), shape: profile(hw * g, hdf * g, hdb * g), w: tailW(1), col: C.gold });
                cs.loft([H(hy + 0.035, 1.012), H(hy - 0.003, 1.018)], { seg: 14, from: OPEN, to: Math.PI * 2 - OPEN, mat: 'double' });   // (the hem's band, standing just proud of the cloth)
                // the pouch at his right hip (2026-11-23: it came through the coat when he ran — it was fixed to the hips under the
                // coat's swinging side): it hangs on the coat's outside now and moves with it there
                const sideR = Math.PI * 1.5, P = (y, w, k) => ({ c: (c => new THREE.Vector3(c.x - w - 0.03, c.y, c.z + 0.03))(V(body, 0, y, -0.005)), shape: profile(0.026, 0.042, 0.042), w: tailW(k)(sideR), col: C.leather });
                cs.loft([P(1.0, 0.194, 0.43), P(0.88, 0.226, 0.88)], { seg: 4, cap: true, capStart: true });
                cs.build();
                // the high popped collar, open at the throat
                // (second pass: "you just painted his neck"): it rises from the shoulders well clear of the neck — 3-4 cm off it
                // all round — and flares out as it climbs, open wide at the throat, its inside dark (half as tall since 2026-11-23: to ~1.67 m)
                const K = (y, w, df, db, col) => ({ c: V(body, 0, y, -0.012), shape: profile(w, df, db), w: [[spine, 1]], col });
                sk.loft([K(1.56, 0.11, 0.075, 0.105, C.coatDark), K(1.59, 0.1, 0.075, 0.108, C.coat), K(1.625, 0.108, 0.085, 0.118, C.coat), K(1.655, 0.125, 0.1, 0.132, C.coat), K(1.672, 0.138, 0.11, 0.142, C.coatDark)], { seg: 14, from: 0.95, to: Math.PI * 2 - 0.95, mat: 'double' });   // (high and flared, as the reference)
                // lapels down the open front, the coat's edges
                for (const s of [-1, 1]) sk.loft([{ c: V(body, s * 0.06, 1.55, 0.11), shape: profile(0.012, 0.006, 0.006), w: [[spine, 1]], col: C.gold }, { c: V(body, s * 0.07, 1.08, 0.106), shape: profile(0.012, 0.006, 0.006), w: [[spine, 1]], col: C.gold }], { seg: 4 });   // (gold, as the tails' edges below)
                // the shirt's two crossed straps
                for (const s of [-1, 1]) sk.loft([{ c: V(body, s * 0.1, 1.48, 0.137), shape: profile(0.012, 0.004, 0.004), w: [[spine, 1]], col: C.strap }, { c: V(body, -s * 0.02, 1.3, 0.144), shape: profile(0.012, 0.004, 0.004), w: [[spine, 1]], col: C.strap }, { c: V(body, -s * 0.09, 1.12, 0.11), shape: profile(0.012, 0.004, 0.004), w: [[spine, 1]], col: C.strap }], { seg: 4 });
                // the belt's gold buckle (the pouch hangs on the coat: with its tails, above)
                sk.loft([{ c: V(body, 0, 1.068, 0.112), shape: profile(0.026, 0.006, 0.006), w: [[hips, 1]], col: C.gold }, { c: V(body, 0, 1.03, 0.112), shape: profile(0.026, 0.006, 0.006), w: [[hips, 1]], col: C.gold }], { seg: 4, cap: true, capStart: true });
                // a gold epaulette on his left shoulder only, as the classic Eldrin (it moves with the arm)
                for (const side of ['L']) {
                    const up = arms[side].upper, s = side === 'L' ? 1 : -1;
                    sk.loft([{ c: V(up, s * 0.0, 0.085, 0.0), shape: profile(0.075, 0.06, 0.06), w: [[up, 0.7], [spine, 0.3]], col: C.gold }, { c: V(up, s * 0.012, 0.055, 0.0), shape: profile(0.088, 0.072, 0.072), w: [[up, 0.8], [spine, 0.2]], col: C.gold }], { seg: 6, capStart: true, mat: 'double' });
                }
                // gold bands round the leather bracers: at the top, by the sleeve's cuff, and at the wrist
                for (const side of ['L', 'R']) {
                    const fore = arms[side].fore, B = (y, w, df, db) => ({ c: V(fore, 0, y, 0), shape: profile(w, df, db), w: [[fore, 1]], col: C.gold });
                    sk.loft([B(-0.146, 0.064, 0.06, 0.058), B(-0.166, 0.062, 0.058, 0.056)], { seg: 6, mat: 'double' });
                    sk.loft([B(-0.252, 0.05, 0.041, 0.041), B(-0.27, 0.048, 0.038, 0.038)], { seg: 6, mat: 'double' });
                }
                void blend;
                // the tails' motion, as the classic coat: the side flaps go forward with each thigh (only a little back);
                // the back lifts behind as he moves, and never less than the thighs swing back (so they don't pass through it)
                return { update({ t, amp = 0, run = 0, air = 0 }) {
                    const tL = legs.L.thigh.rotation.x, tR = legs.R.thigh.rotation.x;
                    // (2026-11-23: the thighs came through the front at the hips — the flaps follow the whole forward swing now, a
                    // touch ahead of it, and the front stands ~3 cm further off the thighs)
                    flapL.rotation.x = Math.min(0.2, tL * 1.1) - 0.04 - air * 0.3;
                    flapR.rotation.x = Math.min(0.2, tR * 1.1) - 0.04 - air * 0.3;
                    back.rotation.x = Math.max(0.04 + amp * 0.22 + run * 0.35 + air * 0.35 + Math.sin(t * 3.1) * 0.02, Math.max(tL, tR) * 1.0 + 0.1);
                } };
            },
        },
    });
}
