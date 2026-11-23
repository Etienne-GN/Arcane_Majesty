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
            foot: C.leather,
            extra({ sk, V, body, hips, spine, arms, legs }) {
                // the coat's tails: from the waist to the knees, open at the front; each side follows its leg
                const sideW = (th, k) => { const s = Math.sin(th), leg = s > 0 ? legs.L.thigh : legs.R.thigh, f = Math.min(1, Math.abs(s) * 1.1) * k; return f < 0.02 ? [[hips, 1]] : [[hips, 1 - f], [leg, f]]; };
                const T = (y, w, df, db, k) => ({ c: V(body, 0, y, -0.005), shape: profile(w, df, db), w: th => sideW(th, k), col: C.coat });
                sk.loft([T(1.07, 0.17, 0.115, 0.115, 0), T(0.95, 0.2, 0.135, 0.15, 0.15), T(0.75, 0.225, 0.155, 0.18, 0.45), T(0.55, 0.24, 0.165, 0.2, 0.6), T(0.38, 0.25, 0.17, 0.21, 0.7), T(0.24, 0.26, 0.175, 0.22, 0.75)], { seg: 14, from: 0.5, to: Math.PI * 2 - 0.5, mat: 'double' });   // (to the knees)
                // the high popped collar, open at the throat
                const K = (y, w, d, col) => ({ c: V(body, 0, y, -0.004), shape: profile(w, d, d * 1.05), w: [[spine, 0.6], [body === null ? spine : spine, 0.4]], col });
                sk.loft([K(1.76, 0.1, 0.092, C.coat), K(1.66, 0.078, 0.074, C.coat), K(1.58, 0.08, 0.076, C.coatDark), K(1.55, 0.1, 0.09, C.coatDark)], { seg: 12, from: 0.8, to: Math.PI * 2 - 0.8, mat: 'double' });   // (high and flared, as the reference)
                // lapels down the open front, the coat's edges
                for (const s of [-1, 1]) sk.loft([{ c: V(body, s * 0.06, 1.55, 0.11), shape: profile(0.012, 0.006, 0.006), w: [[spine, 1]], col: C.coatDark }, { c: V(body, s * 0.07, 1.08, 0.106), shape: profile(0.012, 0.006, 0.006), w: [[spine, 1]], col: C.coatDark }], { seg: 4 });
                // the shirt's two crossed straps
                for (const s of [-1, 1]) sk.loft([{ c: V(body, s * 0.1, 1.48, 0.137), shape: profile(0.012, 0.004, 0.004), w: [[spine, 1]], col: C.strap }, { c: V(body, -s * 0.02, 1.3, 0.144), shape: profile(0.012, 0.004, 0.004), w: [[spine, 1]], col: C.strap }, { c: V(body, -s * 0.09, 1.12, 0.11), shape: profile(0.012, 0.004, 0.004), w: [[spine, 1]], col: C.strap }], { seg: 4 });
                // the belt's gold buckle; the pouch at the right hip
                sk.loft([{ c: V(body, 0, 1.068, 0.112), shape: profile(0.026, 0.006, 0.006), w: [[hips, 1]], col: C.gold }, { c: V(body, 0, 1.03, 0.112), shape: profile(0.026, 0.006, 0.006), w: [[hips, 1]], col: C.gold }], { seg: 4, cap: true, capStart: true });
                sk.loft([{ c: V(body, -0.17, 1.0, 0.04), shape: profile(0.03, 0.045, 0.045), w: [[hips, 1]], col: C.leather }, { c: V(body, -0.17, 0.88, 0.04), shape: profile(0.032, 0.048, 0.048), w: [[hips, 1]], col: C.leather }], { seg: 4, cap: true, capStart: true });
                // gold epaulettes on the shoulders (they move with the arm)
                for (const side of ['L', 'R']) {
                    const up = arms[side].upper, s = side === 'L' ? 1 : -1;
                    sk.loft([{ c: V(up, s * 0.0, 0.085, 0.0), shape: profile(0.075, 0.06, 0.06), w: [[up, 0.7], [spine, 0.3]], col: C.gold }, { c: V(up, s * 0.012, 0.055, 0.0), shape: profile(0.088, 0.072, 0.072), w: [[up, 0.8], [spine, 0.2]], col: C.gold }], { seg: 6, capStart: true, mat: 'double' });
                }
                void blend;
            },
        },
    });
}
