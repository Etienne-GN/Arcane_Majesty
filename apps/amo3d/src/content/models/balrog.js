// The Shadow Balrog — canon (lore DB, book ch. 20): "a shadow rising from the floor; ancient, untamable, hungers for
// light"; the guardian of the Ancient Door; force fails utterly — it eats runes. No fire, no wings, no blade (reworked
// 2026-11-20 after the canon check — the first model was a fire giant, which is neither canon nor ours).
// A towering mass of living shadow that rises out of a pool of darkness on the floor: no legs — its lower body is smoke
// pouring back into the pool; long reaching arms with claws of shadow; a crown of jagged shadow; two pale cold eyes;
// motes of light drawn in from all around, spiralling into its chest and going out.
// Same interface as a character model: { root, update(dt, { speed, strikeK, castK }) }. ~7.7 m tall at scale 1.
import * as THREE from 'three';
import { radialTexture } from '../../engine/lib.js';

export function buildBalrog() {
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);   // risen out of the pool (body.position.y goes from −8 to 0)
    const shadow = (o = 1) => new THREE.MeshStandardMaterial({ color: 0x050407, roughness: 1, metalness: 0, flatShading: true, transparent: o < 1, opacity: o, depthWrite: o >= 1 });
    const S = shadow(1), S2 = shadow(0.85), S3 = shadow(0.55);
    const add = (geo, m, x = 0, y = 0, z = 0, parent = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = m === S; parent.add(o); return o; };

    // The pool of darkness on the floor it rises from (and pours back into).
    const poolTex = radialTexture([[0, 'rgba(0,0,0,1)'], [0.55, 'rgba(0,0,0,0.92)'], [0.8, 'rgba(10,6,16,0.5)'], [1, 'rgba(0,0,0,0)']], 128);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false }));
    pool.position.y = 0.03; pool.renderOrder = 1; root.add(pool);

    // The smoke-skirt: wide at the floor, gathering upward into the body.
    for (let i = 0; i < 5; i++) {
        const r0 = 2.6 - i * 0.38, r1 = r0 - 0.42, h = 1.1;
        const ring = add(new THREE.CylinderGeometry(r1, r0, h, 9, 1, true), i < 2 ? S3 : S2, 0, 0.5 + i * 1.0, 0);
        ring.rotation.y = i * 0.7;
    }
    // The torso: a broad, stooped mass of shadow; shoulders like a ridge.
    const torso = add(new THREE.DodecahedronGeometry(1.6, 1), S, 0, 5.1, 0); torso.scale.set(1.35, 1.25, 0.95);
    const shoulders = add(new THREE.DodecahedronGeometry(1.1, 0), S, 0, 6.3, -0.1); shoulders.scale.set(2.1, 0.7, 1.0);
    for (let i = 0; i < 7; i++) {   // ragged edges of shadow along the back, streaming up and back
        const a = (i / 6 - 0.5) * 2.2;
        const sp = add(new THREE.ConeGeometry(0.22, 1.6 + (i % 3) * 0.5, 4), S2, Math.sin(a) * 1.7, 6.6 + Math.cos(a) * 0.2, -0.6);
        sp.rotation.set(-0.6, 0, -a * 0.6);
    }
    // The head: low between the shoulders, a crown of jagged shadow, two pale cold eyes.
    const head = new THREE.Group(); head.position.set(0, 7.0, 0.55); body.add(head);
    const skull = add(new THREE.DodecahedronGeometry(0.62, 0), S, 0, 0, 0, head); skull.scale.set(0.9, 1.1, 1.15);
    for (let i = 0; i < 9; i++) {
        const a = (i / 8 - 0.5) * 2.6, h = 0.6 + Math.abs(Math.cos(a * 1.7)) * 0.9;
        const spike = add(new THREE.ConeGeometry(0.09, h, 4), S, Math.sin(a) * 0.5, 0.45 + h / 2, -0.15 + Math.cos(a) * 0.1, head);
        spike.rotation.z = -a * 0.45; spike.rotation.x = -0.25;
    }
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd8e4ff, toneMapped: false, transparent: true });
    [-0.2, 0.2].forEach(x => add(new THREE.SphereGeometry(0.065, 8, 6), eyeMat, x, 0.08, 0.6, head));
    const eyeGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture([[0, 'rgba(220,230,255,0.9)'], [1, 'rgba(160,180,255,0)']], 64), color: 0xc8d4ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    eyeGlow.scale.set(1.0, 0.4, 1); eyeGlow.position.set(0, 0.08, 0.7); head.add(eyeGlow);

    // The arms: long and reaching, jointed at the elbow, claws of shadow.
    const arms = [-1, 1].map(s => {
        const shoulder = new THREE.Group(); shoulder.position.set(s * 2.2, 6.2, 0.1); body.add(shoulder);
        add(new THREE.CylinderGeometry(0.42, 0.55, 2.8, 7), S, 0, -1.4, 0, shoulder);
        const elbow = new THREE.Group(); elbow.position.set(0, -2.8, 0); shoulder.add(elbow);
        add(new THREE.CylinderGeometry(0.3, 0.42, 2.6, 7), S, 0, -1.3, 0, elbow);
        const hand = new THREE.Group(); hand.position.set(0, -2.7, 0.1); elbow.add(hand);
        add(new THREE.DodecahedronGeometry(0.42, 0), S, 0, 0, 0, hand);
        for (let c = 0; c < 4; c++) {
            const claw = add(new THREE.ConeGeometry(0.07, 0.95, 4), S, (c - 1.5) * 0.17, -0.6, 0.22, hand);
            claw.rotation.x = Math.PI + 0.35;
        }
        shoulder.rotation.z = s * 0.28;
        return { shoulder, elbow, hand, s };
    });

    // Smoke rising off it, and motes of light drawn in from around and swallowed at its chest.
    const smokeTex = radialTexture([[0, 'rgba(8,6,12,0.75)'], [0.6, 'rgba(8,6,12,0.35)'], [1, 'rgba(8,6,12,0)']], 64);
    const smoke = Array.from({ length: 22 }, () => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false })); root.add(sp);
        return { sp, t: Math.random() * 4, a: Math.random() * 6.28, r: 0.6 + Math.random() * 1.8 };
    });
    const moteTex = radialTexture([[0, 'rgba(255,250,235,1)'], [0.4, 'rgba(255,240,200,0.6)'], [1, 'rgba(255,230,180,0)']], 32);
    const motes = Array.from({ length: 34 }, () => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: moteTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); root.add(sp);
        sp.scale.setScalar(0.22);
        return { sp, k: Math.random(), a: Math.random() * 6.28, y: Math.random() * 6, spd: 0.15 + Math.random() * 0.25 };
    });
    const CHEST = new THREE.Vector3(0, 5.3, 0.9);

    let t = 0, rise = 0, strike = 0, cast = 0;
    body.position.y = -8;
    function update(dt, { strikeK = null, castK = null } = {}) {
        t += dt;
        rise = Math.min(1, rise + dt / 2.6);   // it rises out of the floor
        const ease = 1 - Math.pow(1 - rise, 3);
        body.position.y = -8 * (1 - ease);
        pool.scale.setScalar(0.4 + 0.6 * Math.min(1, rise * 2) + Math.sin(t * 1.3) * 0.03);
        // breathing, a slow sway; the head searching
        body.rotation.z = Math.sin(t * 0.6) * 0.03;
        torso.scale.y = 1.25 + Math.sin(t * 1.1) * 0.03;
        head.rotation.y = Math.sin(t * 0.37) * 0.35; head.rotation.x = 0.15 + Math.sin(t * 0.5) * 0.05;
        // the strike: one arm high, then brought down; held (a scene): both arms spread wide
        strike += (((strikeK ?? -1) >= 0 ? 1 : 0) - strike) * Math.min(1, dt * 10);
        cast += ((castK != null ? 1 : 0) - cast) * Math.min(1, dt * 4);
        const k = strikeK ?? 0, up = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
        for (const A of arms) {
            const reach = Math.sin(t * 0.9 + A.s) * 0.12;
            let x = -0.25 + reach, e = -0.55;
            const z = A.s * (0.28 + cast * 0.7);
            if (A.s > 0 && strike > 0.05) { x = -0.25 - 2.6 * up * strike + (1 - up) * 1.1 * strike; e = -0.9 * up * strike - 0.2; }
            A.shoulder.rotation.x = x; A.shoulder.rotation.z = z; A.elbow.rotation.x = e;
            A.hand.rotation.x = -0.3 + Math.sin(t * 2 + A.s) * 0.1;
        }
        eyeMat.opacity = 0.75 + Math.sin(t * 2.3) * 0.2 + strike * 0.2;
        for (const s of smoke) {   // smoke streaming up off it
            s.t += dt * 0.6; if (s.t > 4) { s.t = 0; s.a = Math.random() * 6.28; }
            const y = body.position.y + 1 + s.t * 2.2, r = s.r + s.t * 0.3;
            s.sp.position.set(Math.cos(s.a) * r, y, Math.sin(s.a) * r);
            s.sp.scale.setScalar(1.2 + s.t * 0.6); s.sp.material.opacity = 0.55 * (1 - s.t / 4) * rise;
        }
        for (const m of motes) {   // light drawn in and swallowed
            m.k += dt * m.spd * (1 + strike);
            if (m.k >= 1) { m.k = 0; m.a = Math.random() * 6.28; m.y = Math.random() * 7; }
            const r = 9 * (1 - m.k) + 0.2, a = m.a + m.k * 4;
            m.sp.position.set(CHEST.x + Math.cos(a) * r, body.position.y + CHEST.y + (m.y - CHEST.y) * (1 - m.k), CHEST.z + Math.sin(a) * r);
            m.sp.material.opacity = Math.sin(m.k * Math.PI) * 0.9 * rise;
        }
    }

    return { root, update };
}
