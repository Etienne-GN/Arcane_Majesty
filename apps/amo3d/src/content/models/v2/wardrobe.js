// The Forge's wardrobe on the v2 bodies (LAYERS_PLAN step 5, TODO §2, 2026-11-26): any look without a model of its own
// is built on the base body of its sex (and age), its clothes translated here — the garments that cover the body (torso,
// legs, feet, arms) are painted onto its shaped surface, and what hangs (coat tails, skirts, robes, gowns) is a swinging
// skirt of its own, as Eldrin's coat tails; the rigid pieces (headgear, shoulders, belt, neck, cape, back, accessory)
// stay the classic parts, on the same joints (character.js). Not yet: elven ears, the hair styles (the v2 hair for all,
// none under a covering hat), facial hair on v2 faces.
import * as THREE from 'three';
import { partDef } from '../parts/index.js';
import { profile } from './skin.js';

const colorsOf = (L, slot) => { const e = L.parts[slot]; if (!e?.id || e.id === 'none') return null; const d = partDef(slot, e.id); return d ? { id: e.id, c: { ...(d.colors ?? {}), ...(e.colors ?? {}) } } : null; };
const darker = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

// each torso garment: the chest's colour round the body (θ: 0 at the front), and the skirt it hangs below the waist (len:
// as the classic part's, from the hips; open: the opening's half-width at the front, as a fraction of a half turn)
const TORSO = {
    longcoat: c => ({ chest: (y, th) => (Math.abs(th) < 0.42 ? c.vest ?? c.shirt ?? '#1c1714' : c.primary), belt: c.leather ?? '#3e2416', skirt: { len: 0.78, open: 0.11, col: c.primary, trim: c.trim } }),
    robe: c => ({ chest: () => c.primary, skirt: { len: 0.93, open: 0, col: c.primary } }),
    tunic: c => ({ chest: () => c.primary, belt: c.collar, skirt: { len: 0.44, open: 0.02, col: c.primary } }),
    armour: c => ({ chest: (y, th) => (Math.abs(th) < 1.4 && y > 1.2 ? c.steel ?? '#9aa0a8' : c.primary), belt: c.trim, skirt: { len: 0.4, open: 0.02, col: c.primary } }),
    linen: c => ({ chest: () => c.primary }),
    peasant_shirt: c => ({ chest: (y, th) => (Math.abs(th) < 0.08 && y > 1.25 ? c.collar : c.primary), skirt: { len: 0.34, open: 0, col: c.primary } }),
    gambeson: c => ({ chest: y => ((y * 1000 | 0) % 70 < 9 ? c.trim : c.primary), skirt: { len: 0.42, open: 0, col: c.primary } }),
    chain_shirt: c => ({ chest: y => ((y * 1000 | 0) % 35 < 7 ? darker(c.primary, 0.6) : c.primary), skirt: { len: 0.36, open: 0, col: c.primary } }),
    plate_cuirass: c => ({ chest: (y, th) => (Math.abs(th) < 0.05 ? darker(c.steel, 0.8) : c.steel), belt: c.trim, skirt: { len: 0.24, open: 0, col: c.steel } }),
    leather_jerkin: c => ({ chest: (y, th) => (Math.abs(th) < 0.06 && y > 1.15 ? c.collar : c.primary), skirt: { len: 0.3, open: 0.04, col: c.primary } }),
    tabard: c => ({ chest: (y, th) => (Math.abs(th) < 0.75 || Math.abs(th) > Math.PI - 0.75 ? c.primary : c.steel), skirt: { len: 0.55, open: 0.02, col: c.primary } }),
    gown: c => ({ chest: (y, th) => (y > 1.5 && Math.abs(th) < 0.9 ? c.trim : c.primary), belt: c.trim, skirt: { len: 1.0, open: 0, col: c.primary } }),
};

// The skirt below the waist: rows from the waist down to the hem, hung from three joints at the waist (a flap following
// each thigh, the back swinging out behind as the body runs) — Eldrin's coat tails made general.
const ROWS = [[1.07, 0.17, 0.115, 0.115, 0], [1.01, 0.19, 0.14, 0.135, 0.35], [0.95, 0.216, 0.17, 0.16, 0.85], [0.75, 0.246, 0.192, 0.193, 1], [0.55, 0.263, 0.2, 0.215, 1], [0.38, 0.274, 0.204, 0.227, 1], [0.24, 0.286, 0.208, 0.24, 1], [0.05, 0.3, 0.215, 0.25, 1]];
const rowAt = y => { for (let i = 0; i < ROWS.length - 1; i++) { const a = ROWS[i], b = ROWS[i + 1]; if (y <= a[0] && y >= b[0]) { const t = (a[0] - y) / (a[0] - b[0]); return a.map((v, j) => v + (b[j] - v) * t); } } return ROWS.at(-1).slice(); };
function skirtExtra({ len, open, col, trim }, F) {
    return ({ root, createSkin, V, body, hips, legs }) => {
        root.updateMatrixWorld(true);
        const pivot = () => { const g = new THREE.Group(); g.position.copy(hips.worldToLocal(root.localToWorld(V(body, 0, 1.07, -0.005)))); hips.add(g); return g; };
        const back = pivot(), flapL = pivot(), flapR = pivot();
        const cs = createSkin(root, [hips, back, flapL, flapR]);
        const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
        const tailW = k => th => {
            const a = th > Math.PI ? th - 2 * Math.PI : th, b = smooth(1.75, 2.35, Math.abs(a)), flap = a > 0 ? flapL : flapR;
            return [[hips, 1 - k], [flap, k * (1 - b)], [back, k * b]].filter(([, w]) => w > 1e-3);
        };
        const hem = Math.max(0.05, 0.99 - len), ys = [1.07, 1.01, 0.95]; for (let y = 0.85; y > hem + 0.04; y -= 0.15) ys.push(y); ys.push(hem);
        const g = F ? 1.07 : 1, OPEN = Math.max(0, open * Math.PI * 1.4), closed = OPEN < 0.01;
        const rows = ys.filter((y, i) => i < 3 ? y > hem : true).map(y => { const [, w, df, db, k] = rowAt(y); return { y, w: w * g, df: df * g, db: db * g, k }; });
        cs.loft(rows.map(r => ({ c: V(body, 0, r.y, -0.005), shape: profile(r.w, r.df, r.db), w: tailW(r.k), col })), closed ? { seg: 16, mat: 'double' } : { seg: 14, from: OPEN, to: Math.PI * 2 - OPEN, mat: 'double' });
        if (trim) {   // a band at the hem, and down the opening's edges
            const r = rows.at(-1), H = (y, s) => ({ c: V(body, 0, y, -0.005), shape: profile(r.w * s, r.df * s, r.db * s), w: tailW(1), col: trim });
            cs.loft([H(r.y + 0.035, 1.012), H(r.y - 0.003, 1.018)], closed ? { seg: 16, mat: 'double' } : { seg: 14, from: OPEN, to: Math.PI * 2 - OPEN, mat: 'double' });
            if (!closed) for (const th of [OPEN, Math.PI * 2 - OPEN]) cs.loft(rows.map(q => { const [x, z] = profile(q.w * 1.015, q.df * 1.015, q.db * 1.015)(th), c = V(body, 0, q.y, -0.005); return { c: new THREE.Vector3(c.x + x, c.y, c.z + z), shape: profile(0.013, 0.007, 0.007), w: tailW(q.k)(th), col: trim }; }), { seg: 4, cap: true, capStart: true });
        }
        cs.build();
        return { update({ t = 0, amp = 0, run = 0, air = 0 }) {   // (as Eldrin's tails: the flaps follow the thighs, the back clears them)
            const tL = legs.L.thigh.rotation.x, tR = legs.R.thigh.rotation.x;
            flapL.rotation.x = Math.min(0.2, tL * 1.1) - 0.04 - air * 0.3;
            flapR.rotation.x = Math.min(0.2, tR * 1.1) - 0.04 - air * 0.3;
            back.rotation.x = Math.max(0.04 + amp * 0.22 + run * 0.35 + air * 0.35 + Math.sin(t * 3.1) * 0.02, Math.max(tL, tR) * 1.0 + 0.1);
        } };
    };
}

/** A look's clothes as an outfit for buildBase (null: nothing worn on the body). */
export function wardrobeOutfit(L, F) {
    const T = colorsOf(L, 'torso'), G = colorsOf(L, 'legs'), Ft = colorsOf(L, 'feet'), A = colorsOf(L, 'arms');
    const tor = T && TORSO[T.id] ? TORSO[T.id](T.c) : null;
    if (!tor && !G && !Ft && !A) return null;
    const legCol = G && G.id !== 'skirt' ? G.c.primary : null;
    const skirt = tor?.skirt ?? (G?.id === 'skirt' ? { len: 0.62, open: 0, col: G.c.primary, trim: G.c.trim } : null);
    const tp = L.parts.torso?.colors?.primary ?? T?.c.primary ?? '#a3141f';   // (the classic parts' rule: plain sleeves take their own colour, the others their sleeve colour)
    const sleeve = A ? (A.id === 'sleeves' ? A.c.primary ?? tp : A.c.sleeve ?? tp) : null;
    const foot = Ft && Ft.id !== 'bare' ? Ft.c.primary : null;
    const bootTop = Ft?.id === 'boots' ? -0.2 : Ft?.id === 'riding_boots' ? -0.04 : Ft?.id === 'sabatons' ? -0.36 : null;
    return {
        torso: (y, th, base) => (y > 1.6 ? base : y >= 1.065 ? (tor ? tor.chest(y, th) : base) : y >= 1.03 ? (tor?.belt ?? legCol ?? (tor ? tor.chest(y, th) : base)) : (legCol ?? (tor && skirt ? tor.chest(y, th) : base))),
        arm: (part, y) => {
            if (!A || A.id === 'bare') return null;
            const hand = part === 'fore' && y < -0.29;
            if (A.id === 'sleeves') return hand ? null : sleeve;
            if (A.id === 'bracers') return part === 'upper' || y > -0.14 ? sleeve : hand ? null : A.c.primary;
            if (A.id === 'gloves') return hand ? A.c.primary : sleeve;
            if (A.id === 'gauntlets') return part === 'upper' ? sleeve : y > -0.12 ? sleeve : A.c.primary;
            return null;
        },
        leg: (part, y, base) => (bootTop != null && part === 'shin' && y < bootTop ? Ft.c.primary : legCol ?? base),
        foot,
        extra: skirt ? skirtExtra(skirt, F) : undefined,
    };
}

/** The rigid slots kept as the classic parts on a v2 body. */
export const RIGID_SLOTS = ['headgear', 'shoulders', 'waist', 'neck', 'cape', 'back', 'accessory'];
