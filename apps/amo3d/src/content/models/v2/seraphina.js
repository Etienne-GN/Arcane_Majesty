// Seraphina, the Queen of Carnage — character model v2 (2026-11-26, after the user's sheet
// docs/3d/characters/seraphina_reference_v2.jpg; the 11-22 proof of concept, a model of its own, is in git history):
// the female base body (models/v2/base.js — so the layers sculpted on the female shape her too), dressed: a dark cropped
// top with a bare midriff, two brown leather straps crossed over it, layered dark plates on the shoulders, a dark scarf
// wrapped high round the neck; bare upper arms, ornate dark bracers to the elbow and fingerless gloves; a leather belt
// with a skull buckle and chains at the hips; dark trousers with leather straps round the thighs, knee plates, armoured
// boots; a long tattered cloak, open in front, its hem ragged at mid-shin; her black hair in a high ponytail. Twin daggers
// (her cast look's hands). buildSeraphina(ctx) → buildBase's { mesh, update }.
import * as THREE from 'three';
import { buildBase } from './base.js';
import { profile } from './skin.js';

const C = { top: '#34362f', strap: '#5a3a24', leather: '#3e2a1c', metal: '#4c4c54', metalHi: '#6a6a72', silver: '#9a9aa2', bone: '#cdc6b6', scarf: '#262826',
    trousers: '#25251f', boot: '#38383e', glove: '#2a2620', bracer: '#3a362e', cloak: '#1c1f1c', skin: '#d8ccd6', hair: '#0e0c12' };

export function buildSeraphina(ctx) {
    return buildBase(ctx, {
        sex: 'female', skin: C.skin, cloth: C.trousers, hair: C.hair, footK: 1.15,
        outfit: {
            // the cropped top over the chest, the bare midriff, the belt, the trousers
            torso: (y, th, base) => (y > 1.6 ? base : y > 1.3 ? C.top : y > 1.12 ? base : y > 1.06 ? C.leather : C.trousers),
            arm: (part, y) => (part === 'upper' ? (y > -0.05 ? C.top : null) : y > -0.04 ? null : y > -0.29 ? C.bracer : C.glove),   // bare upper arms; bracers; fingerless gloves
            leg: (part, y) => (part === 'thigh' ? (y < -0.37 ? C.metal : C.trousers) : y > -0.05 ? C.metal : C.boot),   // the knee plate; armoured boots
            legLoose: (part, y) => (part === 'shin' && y <= -0.05 ? 1.08 : part === 'thigh' ? 1.04 : 1),
            foot: C.boot,
            extra({ sk, V, root, createSkin, body, hips, spine, arms, legs }) {
                root.updateMatrixWorld(true);
                // The cloak: hung from the shoulders down the back to the waist, then open in front to mid-shin, its hem torn.
                // Its skirt swings on three joints at the waist, as Eldrin's coat tails (the flaps follow the thighs).
                const pivot = () => { const g = new THREE.Group(); g.position.copy(hips.worldToLocal(root.localToWorld(V(body, 0, 1.07, -0.005)))); hips.add(g); return g; };
                const back = pivot(), flapL = pivot(), flapR = pivot();
                const cs = createSkin(root, [hips, back, flapL, flapR, spine]);
                const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
                const tailW = k => th => { const a = th > Math.PI ? th - 2 * Math.PI : th, b = smooth(1.6, 2.3, Math.abs(a)), flap = a > 0 ? flapL : flapR; return [[hips, 1 - k], [flap, k * (1 - b)], [back, k * b]].filter(([, w]) => w > 1e-3); };
                const torn = th => 0.05 * Math.sin(th * 9) + 0.035 * Math.sin(th * 23 + 1.3);   // (the ragged hem)
                const ROWS = [[1.08, 0.2, 0.15, 0.16, 0], [0.98, 0.23, 0.18, 0.19, 0.4], [0.82, 0.26, 0.2, 0.22, 0.9], [0.62, 0.28, 0.21, 0.24, 1], [0.44, 0.3, 0.22, 0.26, 1], [0.3, 0.31, 0.22, 0.27, 1]];
                const OPEN = 0.95;   // wide open in front: the trousers and the belt show
                cs.loft(ROWS.map(([y, w, df, db, k], i) => ({ c: V(body, 0, y, -0.01), shape: profile(w, df, db), w: tailW(k), col: C.cloak, dy: i === ROWS.length - 1 ? torn : undefined })), { seg: 16, from: OPEN, to: Math.PI * 2 - OPEN, mat: 'double' });
                // over the back, from the shoulders to the waist (the cape's upper part), and its torn front edges at the shoulders
                const UP = [[1.56, 0.2, 0.09, 0.15], [1.42, 0.22, 0.1, 0.17], [1.25, 0.21, 0.1, 0.17], [1.1, 0.205, 0.12, 0.165]];
                cs.loft(UP.map(([y, w, df, db]) => ({ c: V(body, 0, y, -0.01), shape: profile(w + 0.02, df + 0.02, db + 0.025), w: [[spine, 1]], col: C.cloak })), { seg: 12, from: Math.PI * 0.55, to: Math.PI * 1.45, mat: 'double' });
                cs.build();
                // the scarf, wrapped high round the neck and fallen loose over the collarbones
                // (a loose cowl: broad over the collarbones, gathered round the neck — not a turtleneck)
                const K = (y, w, df, db, col = C.scarf) => ({ c: V(body, 0, y, 0.0), shape: profile(w, df, db), w: [[spine, 1]], col });
                sk.loft([K(1.45, 0.19, 0.17, 0.14), K(1.5, 0.17, 0.16, 0.13), K(1.56, 0.12, 0.12, 0.1), K(1.62, 0.085, 0.085, 0.075), K(1.655, 0.078, 0.078, 0.07)], { seg: 14, mat: 'double', cap: false });
                // the straps crossed over the top, a buckle where they cross
                // (standing on the top's surface over the bust, from each shoulder to the other hip: a tube following the chest)
                for (const s of [-1, 1]) sk.tube([[0.135, 1.48, 0.125], [0.075, 1.41, 0.2], [0.0, 1.36, 0.205], [-0.075, 1.3, 0.172], [-0.115, 1.23, 0.14]].map(([x, y, z]) => ({ c: V(body, s * x, y, z), r: 0.017, rz: 0.006, w: [[spine, 1]], col: C.strap })), { seg: 4, cap: true, mat: 'double' });
                sk.loft([{ c: V(body, 0, 1.377, 0.213), shape: profile(0.026, 0.006, 0.006), w: [[spine, 1]], col: C.silver }, { c: V(body, 0, 1.345, 0.211), shape: profile(0.026, 0.006, 0.006), w: [[spine, 1]], col: C.silver }], { seg: 4, cap: true, capStart: true });   // the buckle where they cross
                // the belt's skull buckle, and a chain hanging in a loop at each hip
                sk.loft([{ c: V(body, 0, 1.115, 0.118), shape: profile(0.03, 0.012, 0.012), w: [[hips, 1]], col: C.bone }, { c: V(body, 0, 1.085, 0.122), shape: profile(0.034, 0.016, 0.016), w: [[hips, 1]], col: C.bone }, { c: V(body, 0, 1.055, 0.12), shape: profile(0.02, 0.01, 0.01), w: [[hips, 1]], col: C.bone }], { seg: 6, cap: true, capStart: true });
                for (const s of [-1, 1]) sk.tube([0, 1, 2, 3, 4].map(k => { const a = k / 4; return { c: V(body, s * (0.05 + a * 0.11), 1.06 - Math.sin(a * Math.PI) * 0.09, 0.11 - a * 0.03), r: 0.008, w: [[hips, 1]], col: C.silver }; }), { seg: 4, cap: false, mat: 'double' });
                // the shoulder plates: three layers stepping down the deltoid, on both shoulders (they move with the arms)
                for (const side of ['L', 'R']) {
                    const up = arms[side].upper, s = side === 'L' ? 1 : -1;
                    for (const [y, w, d] of [[0.08, 0.058, 0.058], [0.05, 0.064, 0.064], [0.02, 0.062, 0.062]]) sk.loft([{ c: V(up, s * 0.004, y + 0.012, 0), shape: profile(w, d, d), w: [[up, 0.75], [spine, 0.25]], col: C.metal }, { c: V(up, s * 0.006, y - 0.018, 0), shape: profile(w + 0.01, d + 0.01, d + 0.01), w: [[up, 0.8], [spine, 0.2]], col: C.metalHi }], { seg: 7, mat: 'double' });
                }
                // the bracers' raised edges, at the elbow and the wrist
                for (const side of ['L', 'R']) {
                    const fore = arms[side].fore, B = (y, w) => ({ c: V(fore, 0, y, 0), shape: profile(w, w * 0.95, w * 0.95), w: [[fore, 1]], col: C.metal });
                    sk.loft([B(-0.05, 0.062), B(-0.075, 0.06)], { seg: 6, mat: 'double' }); sk.loft([B(-0.26, 0.05), B(-0.28, 0.049)], { seg: 6, mat: 'double' });
                }
                // the leather straps round the thighs
                for (const side of ['L', 'R']) for (const y of [-0.12, -0.27]) { const th = legs[side].thigh, R = (yy, w) => ({ c: V(th, 0, yy, 0), shape: profile(w, w * 0.98, w), w: [[th, 1]], col: C.strap }); sk.loft([R(y, 0.083), R(y - 0.022, 0.08)], { seg: 7, mat: 'double' }); }
                return { update({ t = 0, amp = 0, run = 0, air = 0 }) {
                    const tL = legs.L.thigh.rotation.x, tR = legs.R.thigh.rotation.x;
                    flapL.rotation.x = Math.min(0.2, tL * 1.1) - 0.04 - air * 0.3;
                    flapR.rotation.x = Math.min(0.2, tR * 1.1) - 0.04 - air * 0.3;
                    back.rotation.x = Math.max(0.04 + amp * 0.25 + run * 0.4 + air * 0.35 + Math.sin(t * 3.1) * 0.02, Math.max(tL, tR) * 1.0 + 0.1);
                } };
            },
        },
    });
}
