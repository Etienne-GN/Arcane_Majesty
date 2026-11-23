// The Shadow Balrog (2026-11-22, the user: "the old balrog shape, the current colours, no whip, no sword, bulkier — a
// hulk balrog; it stands and walks on two legs, runs and attacks on four like a panther, swipes with its claws and
// bites"). Canon kept from the rework: a thing of shadow that drinks the light — no fire, no wings, no blade; it still
// rises out of a pool of darkness on the floor, its eyes pale and cold, motes of light drawn into its chest.
// The shape: digitigrade legs with clawed feet, a tail; a massive hunched torso of black plates with faint pale cracks;
// arms thick as pillars (forearms heavier than the upper arms), huge clawed hands; a horned skull with a hinged jaw.
// One rig, two postures: upright (quad 0) and on all fours (quad 1: the spine pitched forward, the arms become front legs).
// Same interface as a character model: { root, update(dt, { speed, strikeK, castK }) }. ~7 m tall upright at scale 1.
import * as THREE from 'three';
import { radialTexture } from '../../engine/lib.js';

export function buildBalrog() {
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);   // risen out of the pool (body.position.y goes from −8 to 0)
    const mat = (c, rough = 1, metal = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: metal, flatShading: true });
    const hide = mat(0x060508), plate = mat(0x0d0b12, 0.45, 0.35), horn = mat(0x16131c, 0.6);
    const crack = new THREE.MeshBasicMaterial({ color: 0x8a9ad8, toneMapped: false, transparent: true, opacity: 0.55 });   // faint cold light in the seams
    const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = m !== crack; parent.add(o); return o; };

    // the pool of darkness it rises from
    const poolTex = radialTexture([[0, 'rgba(0,0,0,1)'], [0.55, 'rgba(0,0,0,0.92)'], [0.8, 'rgba(10,6,16,0.5)'], [1, 'rgba(0,0,0,0)']], 128);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.6, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false }));
    pool.position.y = 0.03; pool.renderOrder = 1; root.add(pool);

    // ---- hips, legs (thigh forward, shin back, a long clawed foot), tail ----
    const hips = new THREE.Group(); hips.position.y = 3.0; body.add(hips);
    add(hips, new THREE.DodecahedronGeometry(0.95, 0), hide).scale.set(1.45, 0.85, 1.1);
    const legs = [-1, 1].map(s => {
        const thigh = new THREE.Group(); thigh.position.set(s * 0.8, 0, 0); hips.add(thigh);
        add(thigh, new THREE.CylinderGeometry(0.62, 0.42, 1.9, 7), hide, 0, -0.8, 0.28).rotation.x = -0.45;
        add(thigh, new THREE.BoxGeometry(0.62, 0.6, 0.4), plate, 0, -0.45, 0.62).rotation.x = -0.45;
        const shin = new THREE.Group(); shin.position.set(0, -1.6, 0.6); thigh.add(shin);
        add(shin, new THREE.CylinderGeometry(0.38, 0.26, 1.6, 6), hide, 0, -0.7, -0.35).rotation.x = 0.5;
        const foot = new THREE.Group(); foot.position.set(0, -1.4, -0.7); shin.add(foot);
        add(foot, new THREE.BoxGeometry(0.58, 0.26, 1.0), hide, 0, 0, 0.32);
        for (const c of [-0.2, 0, 0.2]) { const k = add(foot, new THREE.ConeGeometry(0.09, 0.5, 4), horn, c, -0.02, 0.95); k.rotation.x = Math.PI / 2; }
        return { thigh, shin, s };
    });
    const tail = new THREE.Group(); tail.position.set(0, 0, -0.8); hips.add(tail);
    const tailSegs = []; let tp = tail;
    for (let i = 0; i < 7; i++) { const g = new THREE.Group(); g.position.set(0, 0, i ? -0.55 : 0); tp.add(g); add(g, new THREE.CylinderGeometry(0.3 - i * 0.035, 0.34 - i * 0.035, 0.6, 6), hide, 0, 0, -0.28).rotation.x = Math.PI / 2; tailSegs.push(g); tp = g; }
    add(tp, new THREE.ConeGeometry(0.12, 0.7, 5), horn, 0, 0, -0.85).rotation.x = -Math.PI / 2;

    // ---- the torso: a hulking hunched mass of black plates, faint cold cracks ----
    const spine = new THREE.Group(); spine.position.y = 0.45; hips.add(spine);
    const chest = add(spine, new THREE.DodecahedronGeometry(1.5, 1), hide, 0, 1.55, 0.05); chest.scale.set(1.55, 1.15, 1.1);
    add(spine, new THREE.DodecahedronGeometry(1.1, 0), hide, 0, 2.5, -0.35).scale.set(2.1, 0.85, 1.2);   // the hump of the shoulders
    for (const [x, y, z, w, h] of [[-0.7, 1.95, 1.2, 1.0, 1.0], [0.7, 1.95, 1.2, 1.0, 1.0], [0, 1.05, 1.3, 1.1, 0.7], [-0.65, 1.0, 1.15, 0.6, 0.6], [0.65, 1.0, 1.15, 0.6, 0.6], [-1.5, 2.2, 0.5, 0.8, 0.9], [1.5, 2.2, 0.5, 0.8, 0.9]]) {
        const p = add(spine, new THREE.BoxGeometry(w, h, 0.3), plate, x, y, z); p.rotation.set(-0.15, x * 0.35, 0);
    }
    for (const [x, y, r] of [[0, 1.5, 0], [-0.25, 0.8, 0.5], [0.3, 0.75, -0.4], [-1.1, 1.65, 1.2], [1.1, 1.65, -1.2], [0, 2.25, 0]]) { const c = add(spine, new THREE.BoxGeometry(0.06, 0.6, 0.05), crack, x, y, 1.45); c.rotation.z = r; }
    for (let i = 0; i < 8; i++) { const sp = add(spine, new THREE.ConeGeometry(0.2, 1.1 + (i % 3) * 0.35, 4), horn, (i % 3 - 1) * 0.55, 1.2 + i * 0.25, -1.15); sp.rotation.x = -0.7; }   // ridged spines down the back

    // ---- the head: a horned skull, pale cold eyes, a hinged jaw that bites ----
    const neck = new THREE.Group(); neck.position.set(0, 2.75, 0.7); spine.add(neck);
    add(neck, new THREE.CylinderGeometry(0.5, 0.7, 0.9, 7), hide, 0, 0.15, 0.2).rotation.x = 0.7;
    const head = new THREE.Group(); head.position.set(0, 0.55, 0.65); neck.add(head);
    const skull = add(head, new THREE.DodecahedronGeometry(0.62, 0), plate, 0, 0.12, 0); skull.scale.set(1.1, 0.85, 1.3);
    add(head, new THREE.BoxGeometry(0.66, 0.2, 0.6), hide, 0, -0.08, 0.6);   // the upper jaw
    const jaw = new THREE.Group(); jaw.position.set(0, -0.2, 0.15); head.add(jaw);
    add(jaw, new THREE.BoxGeometry(0.6, 0.18, 0.75), hide, 0, -0.05, 0.4);
    for (let i = 0; i < 4; i++) for (const up of [0, 1]) { const f = add(up ? head : jaw, new THREE.ConeGeometry(0.04, 0.2, 4), horn, -0.22 + i * 0.15, up ? -0.22 : 0.08, up ? 0.85 : 0.72); f.rotation.x = up ? Math.PI : 0; }   // fangs
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd8e4ff, toneMapped: false, transparent: true });
    for (const s of [-1, 1]) {
        add(head, new THREE.SphereGeometry(0.085, 8, 6), eyeMat, s * 0.25, 0.14, 0.7);
        add(head, new THREE.BoxGeometry(0.34, 0.07, 0.1), hide, s * 0.25, 0.27, 0.68).rotation.z = s * -0.35;   // the brow
        let hp = head, len = 0.6;   // great horns curving back and out
        for (let k = 0; k < 4; k++) {
            const g = new THREE.Group(); g.position.set(k ? 0 : s * 0.36, k ? len : 0.38, k ? 0 : -0.05); g.rotation.set(-0.55, 0, s * (k ? 0.25 : -0.7)); hp.add(g);
            add(g, new THREE.CylinderGeometry(0.07 * (4 - k), 0.085 * (4 - k) + 0.02, len, 6), horn, 0, len / 2, 0); hp = g; len *= 0.92;
        }
        add(hp, new THREE.ConeGeometry(0.07, 0.45, 5), horn, 0, len + 0.22, 0);
    }
    const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, 'rgba(220,230,255,0.9)'], [1, 'rgba(160,180,255,0)']], 64), color: 0xc8d4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    eyeGlow.scale.set(1.1, 0.42, 1); eyeGlow.position.set(0, 0.14, 0.8); head.add(eyeGlow);

    // ---- the arms: thick as pillars, forearms heavier, huge clawed hands (front legs when it runs) ----
    const arms = [-1, 1].map(s => {
        const shoulder = new THREE.Group(); shoulder.position.set(s * 2.0, 2.35, 0.25); spine.add(shoulder);
        add(shoulder, new THREE.DodecahedronGeometry(0.8, 0), plate).scale.set(1.1, 0.95, 1.05);
        add(shoulder, new THREE.CylinderGeometry(0.6, 0.52, 1.7, 7), hide, 0, -0.85, 0);
        const elbow = new THREE.Group(); elbow.position.y = -1.7; shoulder.add(elbow);
        add(elbow, new THREE.CylinderGeometry(0.62, 0.72, 1.6, 7), hide, 0, -0.8, 0);   // the forearm, heavier
        add(elbow, new THREE.BoxGeometry(0.75, 0.9, 0.3), plate, 0, -0.65, 0.55);
        const hand = new THREE.Group(); hand.position.y = -1.7; elbow.add(hand);
        add(hand, new THREE.DodecahedronGeometry(0.55, 0), hide).scale.set(1.15, 0.8, 1.2);
        for (let c = 0; c < 4; c++) { const k = add(hand, new THREE.ConeGeometry(0.09, 0.85, 4), horn, (c - 1.5) * 0.22, -0.35, 0.45); k.rotation.x = Math.PI / 2 + 0.6; }
        return { shoulder, elbow, hand, s };
    });

    // smoke off it, and light drawn in and swallowed at its chest (the current Balrog's)
    const smokeTex = radialTexture([[0, 'rgba(8,6,12,0.75)'], [0.6, 'rgba(8,6,12,0.35)'], [1, 'rgba(8,6,12,0)']], 64);
    const smoke = Array.from({ length: 18 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false })); root.add(sp); return { sp, t: Math.random() * 4, a: Math.random() * 6.28, r: 0.6 + Math.random() * 1.6 }; });
    const moteTex = radialTexture([[0, 'rgba(255,250,235,1)'], [0.4, 'rgba(255,240,200,0.6)'], [1, 'rgba(255,230,180,0)']], 32);
    const motes = Array.from({ length: 30 }, () => { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: moteTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); root.add(sp); sp.scale.setScalar(0.22); return { sp, k: Math.random(), a: Math.random() * 6.28, y: Math.random() * 6, spd: 0.15 + Math.random() * 0.25 }; });
    const chestW = new THREE.Vector3();

    let t = 0, rise = 0, quad = 0, phase = 0, strike = 0, attack = 'swipe', lastK = -1, swipeArm = 1;
    body.position.y = -8;
    function update(dt, { speed = 0, strikeK = null, castK = null } = {}) {
        t += dt;
        rise = Math.min(1, rise + dt / 2.6);
        body.position.y = -8 * Math.pow(1 - rise, 3);
        pool.scale.setScalar(0.4 + 0.6 * Math.min(1, rise * 2) + Math.sin(t * 1.3) * 0.03);
        // a new attack: alternate a claw swipe and a bite (the arm swiping alternates too)
        const striking = strikeK != null && strikeK >= 0;
        if (striking && lastK < 0) { attack = attack === 'swipe' ? 'bite' : 'swipe'; if (attack === 'swipe') swipeArm = -swipeArm; }
        lastK = striking ? strikeK : -1;
        strike += ((striking ? 1 : 0) - strike) * Math.min(1, dt * 10);
        // upright to walk and stand; on all fours to run and to attack (a panther's lunge)
        const wantQuad = speed > 2.5 || striking ? 1 : 0;
        quad += (wantQuad - quad) * Math.min(1, dt * 3.5);
        const gait = Math.min(1, speed / 3);
        phase += dt * (1.6 + speed * (0.55 + quad * 0.25));
        const k = strikeK ?? 0, lunge = striking ? Math.sin(Math.min(1, k) * Math.PI) : 0;

        // posture: hips lower and the spine pitched forward on all fours; a rearing lift on a swipe
        const rear = attack === 'swipe' ? lunge * 0.45 : 0;
        hips.position.y = 3.0 - quad * 0.55 + Math.abs(Math.sin(phase)) * 0.12 * gait + rear * 0.6;
        hips.position.z = attack === 'bite' ? lunge * 1.2 : lunge * 0.4;
        spine.rotation.x = quad * (1.25 - rear) + 0.12 * (1 - quad) + Math.sin(phase * 2) * 0.04 * quad * gait + (attack === 'bite' ? lunge * 0.25 : 0);
        spine.rotation.z = Math.sin(t * 0.6) * 0.03 * (1 - quad);
        chest.scale.y = 1.15 + Math.sin(t * 1.1) * 0.03;
        // the head keeps looking ahead whatever the spine does; a bite thrusts it forward and snaps the jaw
        neck.rotation.x = -spine.rotation.x * 0.85 - 0.25 + (attack === 'bite' ? lunge * 0.5 : 0);
        head.rotation.y = Math.sin(t * 0.37) * 0.3 * (1 - strike);
        head.position.z = 0.65 + (attack === 'bite' ? lunge * 0.7 : 0);
        jaw.rotation.x = attack === 'bite' && striking ? (k < 0.55 ? (k / 0.55) * 0.9 : 0.9 * (1 - (k - 0.55) / 0.45) * 0.2) : 0.05 + Math.sin(t * 0.9) * 0.04;
        // legs: walk upright (alternating), bound on all fours (both legs together)
        for (const L of legs) {
            const ph = phase + (L.s > 0 ? Math.PI : 0) * (1 - quad);
            L.thigh.rotation.x = Math.sin(ph) * 0.55 * gait - quad * 0.35;
            L.shin.rotation.x = Math.max(0, -Math.cos(ph)) * 0.5 * gait + quad * 0.2;
        }
        // arms: hang and sway upright; front legs on all fours (pointing down to the ground, bounding opposite the hind legs)
        for (const A of arms) {
            const down = -spine.rotation.x;   // straight down in the world
            let x = (1 - quad) * (-0.15 + Math.sin(phase + (A.s > 0 ? 0 : Math.PI)) * 0.4 * gait + Math.sin(t * 0.9 + A.s) * 0.06) + quad * (down + Math.sin(phase + Math.PI) * 0.6 * gait);
            let z = A.s * (0.22 + 0.12 * (1 - quad) + (castK != null ? 0.7 : 0)), e = -0.35 * (1 - quad) - 0.15 * quad;
            if (striking && attack === 'swipe' && A.s === swipeArm) {   // the claw: raised high and out, then raked across
                const up = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6;
                x = down - 1.9 * up + (1 - up) * 0.4; z = A.s * (1.1 * up - 0.5 * (1 - up)); e = -0.6 * up;
            }
            A.shoulder.rotation.x = x; A.shoulder.rotation.z = z; A.elbow.rotation.x = e;
            A.hand.rotation.x = -0.3 + quad * 0.6;
        }
        tail.rotation.x = -0.3 + quad * 0.5; tailSegs.forEach((g, i) => { g.rotation.y = Math.sin(t * 1.4 + i * 0.6) * 0.12 * (1 + gait); g.rotation.x = 0.06; });
        eyeMat.opacity = 0.75 + Math.sin(t * 2.3) * 0.2 + strike * 0.2;
        crack.opacity = 0.4 + Math.sin(t * 1.7) * 0.15 + strike * 0.3;
        // smoke streaming up; light drawn in and swallowed
        chest.getWorldPosition(chestW); root.worldToLocal(chestW);
        for (const s of smoke) {
            s.t += dt * 0.6; if (s.t > 4) { s.t = 0; s.a = Math.random() * 6.28; }
            const r = s.r + s.t * 0.3; s.sp.position.set(chestW.x + Math.cos(s.a) * r, body.position.y + 1 + s.t * 2.2, chestW.z + Math.sin(s.a) * r);
            s.sp.scale.setScalar(1.2 + s.t * 0.6); s.sp.material.opacity = 0.45 * (1 - s.t / 4) * rise;
        }
        for (const m of motes) {
            m.k += dt * m.spd * (1 + strike);
            if (m.k >= 1) { m.k = 0; m.a = Math.random() * 6.28; m.y = Math.random() * 7; }
            const r = 9 * (1 - m.k) + 0.2, a = m.a + m.k * 4;
            m.sp.position.set(chestW.x + Math.cos(a) * r, chestW.y + (m.y - chestW.y) * (1 - m.k), chestW.z + Math.sin(a) * r);
            m.sp.material.opacity = Math.sin(m.k * Math.PI) * 0.9 * rise;
        }
    }
    return { root, update };
}
