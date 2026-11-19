// The Shadow Balrog — the thing that keeps the Ancient Door (lore DB: The Ancient Door, "the Shadow Balrog guards
// it"; book: the shadow out of the deep, older than the keeping, taller than the door; it cannot be commanded and
// cannot be bargained with). A giant of shadow and fire, about seven metres tall, hunched:
//   digitigrade legs with clawed feet; a chest of black plates with molten cracks glowing between them; a long neck
//   and a horned skull with burning eyes and a glowing maw; vast ragged wings of shadow; a sword of flame in the
//   right hand, a lashing whip of fire in the left; a crest of flame along the back and shoulders; smoke off it.
// Same interface as a character model: { root, update(dt, { speed, strikeK, castK }) }.
import * as THREE from 'three';

const M = {
    hide: () => new THREE.MeshStandardMaterial({ color: 0x141016, roughness: 0.7, metalness: 0.15, flatShading: true }),
    plate: () => new THREE.MeshStandardMaterial({ color: 0x1e1a22, roughness: 0.35, metalness: 0.4, flatShading: true }),
    horn: () => new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.5, flatShading: true }),
    magma: () => new THREE.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false }),
    flame: (c = 0xff7a20, o = 0.85) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, toneMapped: false, depthWrite: false }),
    wing: () => new THREE.MeshStandardMaterial({ color: 0x0c0a0e, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.92, flatShading: true }),
    smoke: () => new THREE.MeshBasicMaterial({ color: 0x1a1418, transparent: true, opacity: 0.35, depthWrite: false }),
};

export function buildBalrog() {
    const root = new THREE.Group(), hide = M.hide(), plate = M.plate(), horn = M.horn(), magma = M.magma();
    const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = m !== magma && !m.transparent; parent.add(o); return o; };
    const flames = [], smoke = [];

    // ---- legs: thigh forward, shin back, a long clawed foot ----
    const hips = new THREE.Group(); hips.position.y = 3.3; root.add(hips);
    add(hips, new THREE.DodecahedronGeometry(0.75, 0), hide).scale.set(1.3, 0.8, 1);
    const legs = [];
    for (const s of [-1, 1]) {
        const thigh = new THREE.Group(); thigh.position.set(s * 0.6, 0, 0); hips.add(thigh);
        add(thigh, new THREE.CylinderGeometry(0.46, 0.32, 1.95, 7), hide, 0, -0.85, 0.3).rotation.x = -0.45;
        add(thigh, new THREE.BoxGeometry(0.5, 0.5, 0.35), plate, 0, -0.45, 0.55).rotation.x = -0.45;   // a knee plate
        const shin = new THREE.Group(); shin.position.set(0, -1.7, 0.65); thigh.add(shin);
        add(shin, new THREE.CylinderGeometry(0.28, 0.2, 1.7, 6), hide, 0, -0.75, -0.38).rotation.x = 0.5;
        const foot = new THREE.Group(); foot.position.set(0, -1.5, -0.75); shin.add(foot);
        add(foot, new THREE.BoxGeometry(0.42, 0.22, 0.9), hide, 0, 0, 0.3);
        for (const c of [-0.14, 0, 0.14]) { const k = add(foot, new THREE.ConeGeometry(0.07, 0.4, 4), horn, c, -0.02, 0.85); k.rotation.x = Math.PI / 2; }
        legs.push({ thigh, shin });
    }
    // a tail of shadow, ending in flame
    const tail = new THREE.Group(); tail.position.set(0, 0, -0.6); hips.add(tail);
    const tailSegs = [];
    let parentT = tail;
    for (let i = 0; i < 6; i++) { const g = new THREE.Group(); g.position.set(0, 0, -0.5); parentT.add(g); add(g, new THREE.CylinderGeometry(0.22 - i * 0.03, 0.26 - i * 0.03, 0.55, 6), hide, 0, 0, -0.25).rotation.x = Math.PI / 2; tailSegs.push(g); parentT = g; }
    flames.push(add(parentT, new THREE.ConeGeometry(0.2, 0.7, 6), M.flame(), 0, 0, -0.6)); flames.at(-1).rotation.x = -Math.PI / 2;

    // ---- the torso: hunched, broad, plated, molten cracks ----
    const spine = new THREE.Group(); spine.position.y = 0.45; spine.rotation.x = 0.18; hips.add(spine);
    const chest = add(spine, new THREE.DodecahedronGeometry(1.15, 0), hide, 0, 1.4, 0); chest.scale.set(1.35, 1.1, 0.95);
    for (const [x, y, z, w, h] of [[-0.55, 1.75, 0.85, 0.8, 0.9], [0.55, 1.75, 0.85, 0.8, 0.9], [0, 1.0, 0.95, 0.9, 0.6], [-0.5, 0.95, 0.85, 0.5, 0.5], [0.5, 0.95, 0.85, 0.5, 0.5]]) {
        const p = add(spine, new THREE.BoxGeometry(w, h, 0.25), plate, x, y, z); p.rotation.set(-0.15, x * 0.3, 0);
    }
    for (const [x, y, r] of [[0, 1.4, 0], [-0.2, 0.75, 0.5], [0.25, 0.7, -0.4], [-0.95, 1.5, 1.2], [0.95, 1.5, -1.2], [0, 2.1, 0]]) { const c = add(spine, new THREE.BoxGeometry(0.06, 0.55, 0.05), magma, x, y, 1.05); c.rotation.z = r; }
    const heart = new THREE.PointLight(0xff5a10, 30, 16, 1.4); heart.position.set(0, 1.4, 1.6); spine.add(heart);
    // the crest of flame along the back and shoulders
    for (let i = 0; i < 9; i++) {
        const f = add(spine, new THREE.ConeGeometry(0.22 + (i % 3) * 0.08, 0.9 + (i % 4) * 0.25, 6), M.flame(i % 2 ? 0xff9a30 : 0xff5a10, 0.8), (i % 3 - 1) * 0.5, 1.0 + i * 0.22, -0.8 - Math.sin(i) * 0.15);
        f.rotation.x = -0.6; flames.push(f);
    }

    // ---- neck and head: a horned skull, burning eyes, a glowing maw ----
    const neck = new THREE.Group(); neck.position.set(0, 2.55, 0.5); neck.rotation.x = -0.25; spine.add(neck);
    add(neck, new THREE.CylinderGeometry(0.35, 0.5, 0.9, 7), hide, 0, 0.2, 0.15).rotation.x = 0.6;
    const head = new THREE.Group(); head.position.set(0, 0.6, 0.55); neck.add(head);
    const skull = add(head, new THREE.DodecahedronGeometry(0.55, 0), plate, 0, 0.1, 0); skull.scale.set(1, 0.85, 1.25);
    add(head, new THREE.BoxGeometry(0.62, 0.3, 0.6), hide, 0, -0.22, 0.5);   // the jaw
    add(head, new THREE.BoxGeometry(0.5, 0.08, 0.5), magma, 0, -0.12, 0.55);   // the maw's fire, between the jaws
    for (const s of [-1, 1]) {
        add(head, new THREE.SphereGeometry(0.09, 6, 5), magma, s * 0.22, 0.12, 0.62);   // burning eyes
        add(head, new THREE.BoxGeometry(0.3, 0.06, 0.08), hide, s * 0.22, 0.24, 0.6).rotation.z = s * -0.35;   // the brow
        // great horns, curving back and out
        let hp = head, len = 0.5;
        for (let k = 0; k < 4; k++) {
            const g = new THREE.Group(); g.position.set(k ? 0 : s * 0.32, k ? len : 0.35, k ? 0 : -0.05); g.rotation.set(-0.55, 0, s * (k ? 0.25 : -0.7)); hp.add(g);
            add(g, new THREE.CylinderGeometry(0.06 * (4 - k), 0.075 * (4 - k) + 0.02, len, 6), horn, 0, len / 2, 0);
            hp = g; len *= 0.92;
        }
        add(hp, new THREE.ConeGeometry(0.06, 0.4, 5), horn, 0, len + 0.2, 0);
    }
    const eyeLight = new THREE.PointLight(0xff7a30, 6, 6, 1.6); eyeLight.position.set(0, 0.1, 1); head.add(eyeLight);

    // ---- arms: the flame sword (right), the whip of fire (left) ----
    const arms = {};
    for (const s of [-1, 1]) {
        const shoulder = new THREE.Group(); shoulder.position.set(s * 1.45, 1.95, 0.1); spine.add(shoulder);
        add(shoulder, new THREE.DodecahedronGeometry(0.5, 0), plate).scale.set(1.1, 0.9, 1);
        flames.push(add(shoulder, new THREE.ConeGeometry(0.3, 1.1, 6), M.flame(0xff8a2a, 0.75), s * 0.15, 0.7, -0.15));
        const upper = new THREE.Group(); shoulder.add(upper);
        add(upper, new THREE.CylinderGeometry(0.3, 0.24, 1.5, 7), hide, 0, -0.75, 0);
        const fore = new THREE.Group(); fore.position.y = -1.5; upper.add(fore);
        add(fore, new THREE.CylinderGeometry(0.24, 0.2, 1.4, 7), hide, 0, -0.7, 0);
        add(fore, new THREE.BoxGeometry(0.55, 0.55, 0.45), plate, 0, -0.4, 0.05);   // a vambrace plate
        const hand = new THREE.Group(); hand.position.y = -1.45; fore.add(hand);
        add(hand, new THREE.DodecahedronGeometry(0.26, 0), hide);
        for (const c of [-0.12, 0, 0.12]) { const k = add(hand, new THREE.ConeGeometry(0.05, 0.3, 4), horn, c, -0.25, 0.12); k.rotation.x = Math.PI * 0.85; }
        arms[s > 0 ? 'R' : 'L'] = { shoulder, upper, fore, hand };
    }
    // the sword of flame: a dark core and a blade of fire, longer than a man
    const sword = new THREE.Group(); sword.position.set(0, -0.1, 0.1); sword.rotation.x = Math.PI * 0.66; arms.R.hand.add(sword);   // point down along the arm, a little forward
    add(sword, new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), horn, 0, -0.1, 0);
    add(sword, new THREE.BoxGeometry(0.7, 0.1, 0.12), plate, 0, 0.25, 0);
    const blade = add(sword, new THREE.BoxGeometry(0.22, 2.8, 0.06), M.flame(0xffb040, 0.95), 0, 1.75, 0);
    const bladeGlow = add(sword, new THREE.BoxGeometry(0.42, 3.0, 0.2), M.flame(0xff5a10, 0.35), 0, 1.75, 0);
    flames.push(bladeGlow);
    const swordLight = new THREE.PointLight(0xff8a30, 12, 10, 1.5); swordLight.position.y = 1.9; sword.add(swordLight);
    // the whip of fire: a chain of burning links that lashes
    const whip = [];
    let wp = arms.L.hand;
    for (let i = 0; i < 12; i++) {
        const g = new THREE.Group(); g.position.set(0, i ? -0.42 : -0.25, 0); wp.add(g);
        const link = add(g, new THREE.ConeGeometry(0.1 - i * 0.006, 0.46, 5), M.flame(i % 2 ? 0xff9a30 : 0xff5a10, 0.9), 0, -0.2, 0); link.rotation.x = Math.PI;
        whip.push(g); wp = g;
    }

    // ---- wings: vast and ragged, membranes of shadow between long fingers ----
    const wings = {};
    for (const s of [-1, 1]) {
        const base = new THREE.Group(); base.position.set(s * 0.7, 2.2, -0.7); spine.add(base);
        const arm = new THREE.Group(); base.add(arm);
        add(arm, new THREE.CylinderGeometry(0.12, 0.18, 2.4, 6), hide, s * 1.1, 0.4, 0).rotation.z = s * -1.2;
        const tipX = s * 2.2, tipY = 0.9;
        const verts = [], fingers = [[s * 4.6, 2.2], [s * 5.2, 0.4], [s * 4.6, -1.4], [s * 3.2, -2.6], [s * 1.4, -2.4]];
        for (const [fx, fy] of fingers) add(arm, new THREE.CylinderGeometry(0.035, 0.07, Math.hypot(fx - tipX, fy - tipY), 5), hide, (fx + tipX) / 2, (fy + tipY) / 2, 0).rotation.z = Math.atan2(fx - tipX, fy - tipY) * -1;
        // the membrane, with a ragged edge between each finger
        const pts = [[0, 0], [tipX, tipY], ...fingers.flatMap(([fx, fy], i) => i < fingers.length - 1 ? [[fx, fy], [(fx + fingers[i + 1][0]) / 2 * 0.86, (fy + fingers[i + 1][1]) / 2 * 0.86]] : [[fx, fy]]), [0, -1.2]];
        for (let i = 1; i < pts.length - 1; i++) verts.push(0, 0, 0, pts[i][0], pts[i][1], 0, pts[i + 1][0], pts[i + 1][1], 0);
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); g.computeVertexNormals();
        const mem = add(arm, g, M.wing()); mem.castShadow = true;
        wings[s > 0 ? 'R' : 'L'] = { base, arm };
    }

    // ---- smoke rising off it ----
    for (let i = 0; i < 14; i++) { const p = add(root, new THREE.SphereGeometry(0.5 + (i % 3) * 0.2, 7, 5), M.smoke(), 0, 0, 0); smoke.push({ p, t: i / 14, x: (Math.random() - 0.5) * 2.4, z: (Math.random() - 0.5) * 1.6 }); }
    root.traverse(o => { if (o.isMesh) o.userData.balrog = true; });
    root.scale.setScalar(1.1);

    let t = 0;
    function update(dt, { speed = 0, strikeK = null, castK = null } = {}) {
        t += dt;
        const run = Math.min(1, speed / 2.5), ph = t * (2.2 + run * 2);
        legs.forEach((l, i) => { const k = Math.sin(ph + i * Math.PI); l.thigh.rotation.x = k * 0.45 * run; l.shin.rotation.x = Math.max(0, -k) * 0.5 * run; });
        hips.position.y = 3.3 + Math.abs(Math.sin(ph)) * 0.12 * run + Math.sin(t * 1.3) * 0.05;
        spine.rotation.x = 0.18 + Math.sin(t * 1.1) * 0.04 + run * 0.1;   // breathing
        head.rotation.x = Math.sin(t * 0.9) * 0.08; head.rotation.y = Math.sin(t * 0.5) * 0.15;
        tailSegs.forEach((g, i) => { g.rotation.y = Math.sin(t * 1.6 - i * 0.6) * 0.22; g.rotation.x = 0.1; });
        // wings: half-spread, a slow beat; up and wide on a wind-up
        const tell = strikeK != null && strikeK < 0.2;
        for (const s of [-1, 1]) { const w = wings[s > 0 ? 'R' : 'L']; const beat = Math.sin(t * 1.4) * 0.18; w.arm.rotation.y = s * (-0.5 + beat - (tell ? 0.35 : 0)); w.arm.rotation.z = s * (tell ? 0.25 : 0.05); }
        // the sword arm: raised behind on the wind-up, a great downward sweep on the strike
        const R = arms.R, L = arms.L;
        if (strikeK != null) {
            const k = Math.min(1, strikeK);
            const up = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
            R.upper.rotation.x = -2.6 * up + (k > 0.25 ? 0.9 * (1 - up) : 0); R.upper.rotation.z = 0.25; R.fore.rotation.x = -0.6 * up;
        } else { R.upper.rotation.x = -0.25 + Math.sin(t * 1.2) * 0.05; R.upper.rotation.z = 0.25; R.fore.rotation.x = -0.35; }
        // the whip arm: low and out, the whip lashing (a crack when it casts / channels)
        L.upper.rotation.x = -0.3 + (castK != null ? -1.2 : 0); L.upper.rotation.z = -0.5; L.fore.rotation.x = -0.4;
        const crack = castK != null ? 2.5 : 1;
        whip.forEach((g, i) => { g.rotation.x = Math.sin(t * 3 * crack - i * 0.5) * 0.22 * crack; g.rotation.z = Math.cos(t * 2.3 - i * 0.45) * 0.18; });
        // flames flicker, the blade breathes, the heart pulses; smoke rises and thins
        flames.forEach((f, i) => { const k = 1 + Math.sin(t * 9 + i * 1.7) * 0.12 + Math.sin(t * 23 + i) * 0.06; f.scale.set(1, k, 1); });
        blade.scale.x = 1 + Math.sin(t * 14) * 0.15; heart.intensity = 26 + Math.sin(t * 3) * 6 + (tell ? 20 : 0);
        for (const sm of smoke) { sm.t = (sm.t + dt * 0.12) % 1; sm.p.position.set(sm.x * (1 + sm.t), 3.5 + sm.t * 5.5, sm.z - 0.5); sm.p.scale.setScalar(0.6 + sm.t * 1.6); sm.p.material.opacity = 0.35 * (1 - sm.t); }
    }
    return { root, update };
}
