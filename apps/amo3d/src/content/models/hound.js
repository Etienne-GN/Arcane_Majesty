// A hound (the stalkers — asked 2026-11-22: "some kind of dog or wolf, but so ugly"): a lean low-poly canine — a deep
// chest and a tucked waist, haunches, a neck rising to a real head (skull, long snout, a hinged jaw with teeth, ears),
// jointed legs (the hind ones bent like a dog's), paws and a tail. Variants: { coat, belly, dark, eyeColor, mawColor,
// eyeless (a long blind skull, the maw glows instead), spines (glowing back spines), knuckles (a bony ridge), scale }.
// Returns { root, body, legs (swing groups, no rest angle — the beast code swings them), lowers, head, jaw, tail, eyes, maw }.
import * as THREE from 'three';
import { flat } from '../../engine/lib.js';

export function buildHound({ coat = 0x4a4038, belly = 0x7a6e60, dark = 0x1a1614, eyeColor = 0xffd060, mawColor = 0xff7a3a,
    eyeless = false, spines = null, knuckles = false, scale = 1 } = {}) {
    const C = flat(coat), B = flat(belly), D = flat(dark), T = flat(0xe8e0cc);
    const glow = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
    const root = new THREE.Group(), body = new THREE.Group(); body.position.y = 0.74; root.add(body);
    const add = (geo, m, x = 0, y = 0, z = 0, p = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
    // the body: deep chest forward, a tucked waist, rounded haunches
    add(new THREE.IcosahedronGeometry(0.3, 1), C, 0, 0.02, 0.36).scale.set(0.92, 1.12, 1.15);
    add(new THREE.CylinderGeometry(0.25, 0.17, 0.82, 7).rotateX(Math.PI / 2), C, 0, 0.04, -0.02).scale.set(0.86, 1, 1);
    add(new THREE.IcosahedronGeometry(0.25, 1), C, 0, 0.04, -0.42).scale.set(0.95, 1.05, 1.05);
    add(new THREE.IcosahedronGeometry(0.2, 0), B, 0, -0.16, 0.34).scale.set(0.9, 0.7, 1.2);   // the underside of the chest
    if (knuckles) for (let i = 0; i < 8; i++) add(new THREE.BoxGeometry(0.06, 0.07, 0.06), D, 0, 0.27 - Math.abs(i - 3) * 0.012, 0.42 - i * 0.12);
    if (spines) { const S = new THREE.MeshStandardMaterial({ color: spines, emissive: spines, emissiveIntensity: 0.9, flatShading: true });
        for (let i = 0; i < 7; i++) { const sp = add(new THREE.ConeGeometry(0.045, 0.3 - Math.abs(i - 2) * 0.03, 4), S, 0, 0.3, 0.42 - i * 0.13); sp.rotation.x = -0.55; } }
    // the neck, rising forward, and the head on it
    const neck = new THREE.Group(); neck.position.set(0, 0.1, 0.58); neck.rotation.x = -0.55; body.add(neck);
    add(new THREE.CylinderGeometry(0.12, 0.17, 0.44, 7).translate(0, 0.2, 0), C, 0, 0, 0, neck);
    const head = new THREE.Group(); head.position.set(0, 0.42, 0.02); head.rotation.x = 0.55; neck.add(head);
    const L = eyeless ? 1.3 : 1;
    add(new THREE.BoxGeometry(0.24, 0.2, 0.26 * L), C, 0, 0, 0.02, head);
    add(new THREE.BoxGeometry(0.26, 0.05, 0.16), C, 0, 0.1, 0.06, head);   // the brow
    const snout = add(new THREE.CylinderGeometry(0.055, 0.095, 0.3 * L, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), C, 0, -0.03, 0.27 * L, head); snout.scale.set(1, 0.85, 1);
    add(new THREE.SphereGeometry(0.035, 6, 4), D, 0, -0.01, (0.27 + 0.15) * L, head);   // the nose
    const jaw = new THREE.Group(); jaw.position.set(0, -0.08, 0.06); head.add(jaw);
    add(new THREE.CylinderGeometry(0.04, 0.07, 0.3 * L, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4).translate(0, 0, 0.17 * L), C, 0, 0, 0, jaw).scale.set(1, 0.6, 1);
    for (const s of [1, -1]) for (let i = 0; i < 3; i++) add(new THREE.ConeGeometry(0.012, 0.05, 3), T, s * 0.035, 0.03, (0.14 + i * 0.06) * L, jaw);   // teeth
    const maw = add(new THREE.BoxGeometry(0.07, 0.025, 0.2 * L), glow(mawColor), 0, -0.035, 0.2 * L, head);   // the glow inside the mouth
    let eyes = maw;
    if (!eyeless) { const E = glow(eyeColor); eyes = new THREE.Group(); head.add(eyes); for (const s of [1, -1]) { const e = add(new THREE.BoxGeometry(0.05, 0.02, 0.01), E, s * 0.075, 0.05, 0.155, eyes); e.rotation.z = s * 0.35; } eyes.material = E; }
    for (const s of [1, -1]) { const ear = add(new THREE.ConeGeometry(0.05, eyeless ? 0.08 : 0.17, 4), C, s * 0.08, 0.15, -0.06, head); ear.rotation.set(-0.45, 0, s * -0.2); }
    // the legs: each a swing group (the beast code turns it), inside it the leg's own shape — the hind ones bent like a dog's
    const legs = [], lowers = [];
    for (const [x, z, front] of [[0.15, 0.38, 1], [-0.15, 0.38, 1], [0.15, -0.42, 0], [-0.15, -0.42, 0]]) {
        const swing = new THREE.Group(); swing.position.set(x, -0.06, z); body.add(swing);
        const upper = new THREE.Group(); upper.rotation.x = front ? 0.05 : 0.45; swing.add(upper);
        add(new THREE.CylinderGeometry(front ? 0.06 : 0.09, 0.045, 0.36, 6).translate(0, -0.18, 0), C, 0, 0, 0, upper);
        const lower = new THREE.Group(); lower.position.y = -0.36; lower.rotation.x = front ? -0.05 : -0.95; upper.add(lower);
        add(new THREE.CylinderGeometry(0.04, 0.03, front ? 0.34 : 0.3, 5).translate(0, front ? -0.17 : -0.15, 0), C, 0, 0, 0, lower);
        const foot = new THREE.Group(); foot.position.y = front ? -0.34 : -0.3; foot.rotation.x = front ? 0 : 0.5; lower.add(foot);
        add(new THREE.BoxGeometry(0.07, 0.05, 0.11), D, 0, -0.02, 0.03, foot);
        legs.push(swing); lowers.push(lower);
    }
    // the tail: three segments curving down and back
    const tail = new THREE.Group(); tail.position.set(0, 0.1, -0.62); tail.rotation.x = 0.7; body.add(tail);
    let seg = tail; for (let i = 0; i < 3; i++) { add(new THREE.CylinderGeometry(0.05 - i * 0.012, 0.04 - i * 0.012, 0.2, 5).translate(0, 0, 0).rotateX(Math.PI / 2).translate(0, 0, -0.1), C, 0, 0, 0, seg); const n = new THREE.Group(); n.position.z = -0.2; n.rotation.x = 0.25; seg.add(n); seg = n; }
    root.scale.setScalar(scale);
    return { root, body, legs, lowers, head, jaw, tail, eyes, maw };
}
