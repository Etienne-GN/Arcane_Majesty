// Seraphina, the Queen of Carnage — character model v2 (POC, 2026-11-22), after docs/3d/characters/reference_v2.jpg:
// tall and slender; a high-necked bodice of black plate with silver chevrons; a long split skirt over dark hose and
// pointed knee boots; spiked pauldrons; black gauntlets with spiked cuffs; a floor-length navy-black cape lined in blood
// red; a pale face with dark smoky eyes and black tear-streaks; black hair in a long high ponytail with locks framing
// the face, pointed ears, a small spiked silver crown; a black glaive with a great crescent blade (her spear).
// buildSeraphina(ctx) → { weapon(type) | null, update(args) } — ctx is the classic rig's (character.js).
import * as THREE from 'three';
import { createSkin, blend } from './skin.js';

const C = { plate: '#1e1e26', plateHi: '#2c2c36', silver: '#8a8c98', hose: '#16161c', boot: '#121216', skirt: '#17171f', cape: '#111528', lining: '#5c0e18', glove: '#24242c', skin: '#dcd4e0', hair: '#0d0c11' };
const flat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8, ...o });

function faceTexture(skin) {
    const S = 128, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
    g.fillStyle = skin; g.fillRect(0, 0, S, S);
    const cx = S / 2;
    for (const s of [-1, 1]) {
        const ex = cx + s * 17, ey = 58;
        g.fillStyle = 'rgba(20,14,24,0.85)'; g.beginPath(); g.ellipse(ex, ey, 13, 8, s * -0.12, 0, Math.PI * 2); g.fill();   // smoky make-up
        g.strokeStyle = 'rgba(12,8,16,0.9)'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(ex - s * 2, ey + 6); g.lineTo(ex - s * 3, ey + 30); g.stroke();   // the black tear-streak
        g.lineWidth = 1.6; g.beginPath(); g.moveTo(ex + s * 5, ey + 6); g.lineTo(ex + s * 6, ey + 20); g.stroke();
        g.fillStyle = '#f2eef6'; g.beginPath(); g.ellipse(ex, ey, 6.5, 2.8, s * -0.12, 0, Math.PI * 2); g.fill();   // the eye
        g.fillStyle = '#2a1c2a'; g.beginPath(); g.arc(ex, ey, 2.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#0d0c11'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(ex - s * 9, ey - 11); g.quadraticCurveTo(ex, ey - 15, ex + s * 9, ey - 9); g.stroke();   // the brow, arched
    }
    g.fillStyle = 'rgba(150,130,150,0.5)'; g.fillRect(cx - 1.5, 66, 3, 14);   // the nose's line
    g.fillStyle = '#2a1420'; g.beginPath(); g.ellipse(cx, 92, 9, 3.2, 0, 0, Math.PI * 2); g.fill();   // dark lips
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildSeraphina(ctx) {
    const { root, hips, spine, head, arms, legs } = ctx;
    // the cape and the ponytail hang from joints of their own (they swing)
    const capeJ = new THREE.Group(); capeJ.position.set(0, 0.5, -0.1); spine.add(capeJ);
    const bones = [hips, spine, head, arms.L.upper, arms.L.fore, arms.R.upper, arms.R.fore, legs.L.thigh, legs.L.shin, legs.R.thigh, legs.R.shin, capeJ];
    const sk = createSkin(root, bones), V = (g, x, y, z) => sk.at(g, x, y, z);

    // ---- legs: dark hose, pointed knee boots ----
    for (const side of ['L', 'R']) {
        const { thigh, shin } = legs[side], o = side === 'L' ? 1 : -1;
        const r = (g, y, rx, rz, w, col) => ({ c: V(g, 0, y, 0), rx, rz, w, col });
        sk.loft([
            r(thigh, 0.04, 0.085, 0.085, [[hips, 0.5], [thigh, 0.5]], C.hose), r(thigh, -0.12, 0.078, 0.08, [[thigh, 1]], C.hose), r(thigh, -0.36, 0.058, 0.06, [[thigh, 1]], C.hose),
            r(thigh, -0.44, 0.06, 0.064, blend(thigh, shin, 0.5), C.boot), r(shin, -0.03, 0.062, 0.066, [[shin, 1]], C.boot),   // the boot's cuff at the knee
            r(shin, -0.14, 0.052, 0.058, [[shin, 1]], C.boot), r(shin, -0.36, 0.036, 0.04, [[shin, 1]], C.boot), r(shin, -0.42, 0.04, 0.05, [[shin, 1]], C.boot),
        ], { seg: 8 });
        // the boot's point at the knee (a flap rising over it)
        const k = V(shin, 0, 0, 0.06);
        sk.loft([{ c: k.clone().add(new THREE.Vector3(0, 0.1, 0.012)), rx: 0.002, rz: 0.002, w: [[shin, 1]], col: C.boot }, { c: k.clone().add(new THREE.Vector3(0, -0.03, 0)), rx: 0.05, rz: 0.018, w: [[shin, 1]], col: C.boot }], { seg: 4 });
        // the foot: a pointed boot toe
        const a = V(shin, 0, -0.43, 0.0);
        sk.loft([
            { c: a.clone().add(new THREE.Vector3(0, -0.02, -0.03)), rx: 0.042, rz: 0.03, w: [[shin, 1]], col: C.boot },
            { c: a.clone().add(new THREE.Vector3(0, -0.04, 0.05)), rx: 0.04, rz: 0.028, w: [[shin, 1]], col: C.boot },
            { c: a.clone().add(new THREE.Vector3(0, -0.055, 0.15)), rx: 0.004, rz: 0.004, w: [[shin, 1]], col: C.boot },
        ], { seg: 6, axis: 'z' });
        void o;
    }

    // ---- the torso: a fitted bodice up to a high collar ----
    const T = (y, rx, rz, w, col) => ({ c: V(spine, 0, y, 0), rx, rz, w, col });
    sk.loft([
        T(0.72, 0.035, 0.035, [[head, 1]], C.skin), T(0.62, 0.042, 0.042, [[spine, 0.4], [head, 0.6]], C.skin),   // the neck
        T(0.56, 0.06, 0.055, [[spine, 1]], C.plate),   // the high collar
        T(0.5, 0.16, 0.085, [[spine, 1]], C.plate), T(0.4, 0.15, 0.1, [[spine, 1]], C.plate), T(0.3, 0.135, 0.095, [[spine, 1]], C.plate),
        T(0.16, 0.11, 0.08, [[spine, 1]], C.plate), T(0.04, 0.12, 0.085, blend(spine, hips, 0.5), C.plate), T(-0.06, 0.14, 0.095, [[hips, 1]], C.plate),
        T(-0.14, 0.13, 0.09, [[hips, 1]], C.hose),
    ], { seg: 10 });

    // ---- the skirt: long, split up the front to the thigh, a ragged hem; each side follows its leg below the hip ----
    const sideW = (th, k) => { const s = Math.sin(th); const leg = s > 0 ? legs.L.thigh : legs.R.thigh, sh = s > 0 ? legs.L.shin : legs.R.shin; const f = Math.min(1, Math.abs(s) * 1.2) * k; return f < 0.02 ? [[hips, 1]] : [[hips, 1 - f], [k > 0.6 ? sh : leg, f]]; };
    const SK = (y, rx, rz, k, col, jag = 0) => ({ c: V(hips, 0, y, -0.01), rx, rz, w: th => sideW(th, k), col, dy: jag ? th => -Math.abs(Math.sin(th * 7)) * jag : null });
    sk.loft([SK(-0.04, 0.15, 0.1, 0, C.skirt), SK(-0.2, 0.19, 0.13, 0.25, C.skirt), SK(-0.5, 0.24, 0.17, 0.55, C.skirt), SK(-0.8, 0.28, 0.2, 0.7, C.skirt), SK(-0.93, 0.3, 0.22, 0.75, C.skirt, 0.06)],
        { seg: 14, from: 0.8, to: Math.PI * 2 - 0.8, mat: 'double' });
    // silver chevrons down the bodice (the reference's V marks), and a belt line
    const chev = (y, w, h) => { for (const s of [-1, 1]) sk.loft([{ c: V(spine, s * w * 0.5, y, 0.11), rx: 0.006, rz: 0.004, w: [[spine, 1]], col: C.silver }, { c: V(spine, s * 0.004, y - h, 0.112), rx: 0.006, rz: 0.004, w: [[spine, 1]], col: C.silver }], { seg: 3 }); };
    chev(0.5, 0.16, 0.12); chev(0.36, 0.14, 0.1); chev(0.2, 0.11, 0.09); chev(0.06, 0.1, 0.08);

    // ---- arms: dark sleeves, black gauntlets from mid-forearm ----
    for (const side of ['L', 'R']) {
        const { upper, fore } = arms[side];
        const a = (g, y, r, w, col) => ({ c: V(g, 0, y, 0), rx: r, rz: r * 0.95, w, col });
        sk.loft([
            a(upper, 0.05, 0.05, [[spine, 0.5], [upper, 0.5]], C.plate), a(upper, -0.04, 0.05, [[upper, 1]], C.plate), a(upper, -0.26, 0.04, [[upper, 1]], C.plate),
            a(upper, -0.31, 0.038, blend(upper, fore, 0.5), C.plate), a(fore, -0.06, 0.036, [[fore, 1]], C.plate), a(fore, -0.12, 0.046, [[fore, 1]], C.glove),
            a(fore, -0.27, 0.034, [[fore, 1]], C.glove), a(fore, -0.31, 0.03, [[fore, 1]], C.glove), a(fore, -0.37, 0.034, [[fore, 1]], C.glove), a(fore, -0.41, 0.012, [[fore, 1]], C.glove),
        ], { seg: 7, cap: true });
    }

    // ---- the cape: from the shoulders to the floor, navy-black outside, blood red inside, a ragged hem ----
    const capeRing = (y, rx, rz, kc, col, jag = 0) => ({ c: V(spine, 0, y, -0.02), rx, rz, w: kc <= 0 ? [[spine, 1]] : [[spine, 1 - kc], [capeJ, kc]], col, dy: jag ? th => -Math.abs(Math.sin(th * 9 + 1)) * jag : null });
    const capeRings = col => [capeRing(0.52, 0.19, 0.11, 0, col), capeRing(0.4, 0.22, 0.14, 0.15, col), capeRing(0.1, 0.26, 0.19, 0.5, col), capeRing(-0.3, 0.3, 0.24, 0.8, col), capeRing(-0.72, 0.34, 0.28, 1, col), capeRing(-0.92, 0.36, 0.3, 1, col, 0.08)];
    sk.loft(capeRings(C.cape), { seg: 12, from: Math.PI * 0.42, to: Math.PI * 1.58 });
    sk.loft(capeRings(C.lining).map(r => ({ ...r, rx: r.rx - 0.008, rz: r.rz - 0.008 })), { seg: 12, from: Math.PI * 0.42, to: Math.PI * 1.58, inward: true });

    const skinMesh = sk.build();

    // ---- rigid pieces on the joints: head, hair, crown, collar spikes, pauldrons, gauntlet spikes ----
    const mats = { skin: flat(C.skin), hair: flat(C.hair, { roughness: 0.6 }), silver: flat(C.silver, { metalness: 0.6, roughness: 0.35 }), plate: flat(C.plateHi, { metalness: 0.3, roughness: 0.55 }), dark: flat(C.plate) };
    const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.userData.keep = o.userData.v2 = true; parent.add(o); return o; };   // (keep: the rig's merging leaves it alone)
    const hd = new THREE.Group(); hd.position.y = 0.0; head.add(hd);
    const skull = add(hd, new THREE.SphereGeometry(0.1, 10, 8), mats.skin, 0, 0.14, 0); skull.scale.set(0.86, 1.12, 0.94);
    add(hd, new THREE.SphereGeometry(0.07, 8, 6), mats.skin, 0, 0.08, 0.025).scale.set(0.95, 1.0, 0.9);   // the jaw, narrowing to the chin
    const face = add(hd, new THREE.SphereGeometry(0.1005, 14, 10, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.3, Math.PI * 0.42), new THREE.MeshStandardMaterial({ map: faceTexture(C.skin), roughness: 0.8 }), 0, 0.14, 0);
    face.scale.set(0.86, 1.12, 0.94);   // the painted face, on the front of the skull
    add(hd, new THREE.BoxGeometry(0.016, 0.03, 0.02), mats.skin, 0, 0.125, 0.095);   // the nose
    for (const s of [-1, 1]) { const ear = add(hd, new THREE.ConeGeometry(0.018, 0.1, 4), mats.skin, s * 0.085, 0.15, -0.01); ear.rotation.set(-0.45, 0, s * -1.15); }
    // hair: a cap swept back, locks framing the face, a long high ponytail
    const cap = add(hd, new THREE.SphereGeometry(0.106, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), mats.hair, 0, 0.152, -0.012); cap.scale.set(0.9, 1.12, 1.0); cap.rotation.x = -0.45;   // swept back off the brow: the face shows
    add(hd, new THREE.SphereGeometry(0.1, 8, 6), mats.hair, 0, 0.13, -0.045).scale.set(0.9, 1.05, 0.85);   // the back of the head
    for (const s of [-1, 1]) { const lock = add(hd, new THREE.BoxGeometry(0.026, 0.19, 0.022), mats.hair, s * 0.084, 0.07, 0.035); lock.rotation.set(0.1, 0, s * 0.08); const fr = add(hd, new THREE.BoxGeometry(0.05, 0.03, 0.02), mats.hair, s * 0.045, 0.225, 0.075); fr.rotation.set(0.5, 0, s * 0.5); }   // locks framing the face, a parted fringe
    const tail = [];
    let tp = new THREE.Group(); tp.position.set(0, 0.25, -0.05); hd.add(tp);
    add(tp, new THREE.CylinderGeometry(0.022, 0.026, 0.035, 6), mats.silver, 0, 0, 0);   // the band
    for (let i = 0; i < 7; i++) {
        const g = new THREE.Group(); g.position.set(0, i ? -0.1 : 0.03, i ? 0 : -0.01); g.rotation.x = i === 0 ? -2.3 : 0.22; tp.add(g);
        add(g, new THREE.CylinderGeometry(0.04 - i * 0.004, 0.045 - i * 0.004, 0.11, 6), mats.hair, 0, -0.05, 0);
        tail.push(g); tp = g;
    }
    add(tp, new THREE.ConeGeometry(0.018, 0.12, 5), mats.hair, 0, -0.14, 0).rotation.x = Math.PI;
    // the crown: a small silver band of spikes
    for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.32, sp = add(hd, new THREE.ConeGeometry(0.009, i === 3 ? 0.075 : 0.045, 4), mats.silver, Math.sin(a) * 0.075, 0.245 - Math.abs(i - 3) * 0.008, Math.cos(a) * 0.04); sp.rotation.x = -0.2; }
        // collar spikes and spiked pauldrons
    for (let i = 0; i < 5; i++) { const a = Math.PI * (0.6 + i * 0.2), c = add(spine, new THREE.ConeGeometry(0.014, 0.1, 4), mats.dark, Math.sin(a) * 0.065, 0.6, Math.cos(a) * 0.055); c.rotation.set(Math.cos(a) * 0.45, 0, -Math.sin(a) * 0.45); }   // a high spiked collar at the back and sides (none at the throat)
    for (const side of ['L', 'R']) {
        const s = side === 'L' ? 1 : -1, up = arms[side].upper;
        for (let k = 0; k < 3; k++) { const pl = add(up, new THREE.SphereGeometry(0.085 - k * 0.012, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.plate, s * 0.012, 0.03 - k * 0.04, 0); pl.scale.set(1.1, 0.7, 1.05); pl.rotation.z = s * -0.25; }
        for (let k = 0; k < 4; k++) { const sp = add(up, new THREE.ConeGeometry(0.016, 0.11 - k * 0.012, 4), mats.dark, s * (0.045 + k * 0.012), 0.06 - k * 0.02, -0.03 + k * 0.025); sp.rotation.set(-0.3, 0, s * -(0.7 + k * 0.15)); }
        for (let k = 0; k < 3; k++) { const sp = add(arms[side].fore, new THREE.ConeGeometry(0.01, 0.07, 4), mats.dark, s * 0.04, -0.13 - k * 0.035, -0.01); sp.rotation.z = s * -1.1; }   // the gauntlet's spiked cuff
    }

    // the glaive (her spear): a long black shaft, a great crescent blade with hooked prongs
    function weapon(type) {
        if (type !== 'spear' && type !== 'halberd') return null;
        const g = new THREE.Group(), steel = flat('#2a2a32', { metalness: 0.6, roughness: 0.35 }), edge = flat('#6a6c78', { metalness: 0.8, roughness: 0.25 });
        add(g, new THREE.CylinderGeometry(0.014, 0.016, 1.9, 6), flat('#2a1a1e'), 0, 0.35, 0);
        add(g, new THREE.ConeGeometry(0.022, 0.08, 6), steel, 0, -0.62, 0).rotation.x = Math.PI;
        const shape = new THREE.Shape(); shape.moveTo(-0.02, 0); shape.quadraticCurveTo(0.34, 0.3, 0.1, 0.95); shape.quadraticCurveTo(0.2, 0.35, -0.06, 0.12); shape.lineTo(-0.02, 0);   // a great crescent
        const blade = add(g, new THREE.ExtrudeGeometry(shape, { depth: 0.016, bevelEnabled: false }), edge, -0.01, 1.22, -0.008); blade.rotation.y = Math.PI / 2;   // its flat facing the side, as she holds it
        for (const [y, l, r] of [[1.3, 0.16, 0.9], [1.42, 0.13, 1.1], [1.36, 0.12, -1.0]]) { const p = add(g, new THREE.ConeGeometry(0.012, l, 4), steel, 0, y, 0); p.rotation.z = r; }   // hooked prongs
        add(g, new THREE.ConeGeometry(0.03, 0.12, 6), steel, 0, 1.26, 0);
        const tip = new THREE.Object3D(); tip.position.set(0.08, 1.98, 0); g.add(tip);
        void blade;
        return { group: g, tip, crystal: null };
    }

    function update({ t, run = 0, amp = 0 }) {
        capeJ.rotation.x = 0.06 + run * 0.55 + amp * 0.18 + Math.sin(t * 1.3) * 0.03;   // the cape streams back as she runs
        tail.forEach((g, i) => { if (i) { g.rotation.x = 0.22 + run * 0.12 + Math.sin(t * 2.1 + i * 0.7) * 0.04 * (1 + amp); g.rotation.z = Math.sin(t * 1.6 + i) * 0.03; } });
    }
    return { mesh: skinMesh, weapon, update };
}
