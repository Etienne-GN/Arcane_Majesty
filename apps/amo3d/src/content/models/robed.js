// A robed figure (asked 2026-11-22: the casters were "a cone with a small sphere at the top — not fantasy fitting"):
// a robe with a real silhouette (a lathe: a flared hem, the waist, the chest, the shoulders), a deep hood with a shadowed
// face and glowing eyes, sleeved arms with hands. Options: { robe (a colour or a material), trim, skin, eyeColor, height,
// tattered (a ragged hem, floating — a ghost), crown (a ring of points over the hood), mask (a bone mask in the hood) }.
// Returns { root, armL, armR, eyes, hood, robeMat } — the arms are groups at the shoulders (the beast code lifts them).
import * as THREE from 'three';
import { flat } from '../../engine/lib.js';

export function buildRobed({ robe = 0x2a2420, trim = 0x8a7a5a, skin = 0xc8b8a0, eyeColor = 0xffd060, height = 1.85,
    tattered = false, crown = null, mask = null } = {}) {
    const R = robe.isMaterial ? robe : flat(robe), T = flat(trim), S = flat(skin), shadow = new THREE.MeshBasicMaterial({ color: 0x050407 });
    const root = new THREE.Group(), k = height / 1.85;
    const add = (geo, m, x = 0, y = 0, z = 0, p = root) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
    // the robe: a lathe through the hem, the knees, the waist, the chest, the shoulders
    const prof = [[0.46, 0], [0.42, 0.25], [0.3, 0.7], [0.24, 0.95], [0.27, 1.2], [0.3, 1.42], [0.17, 1.52], [0.09, 1.56]].map(([r, y]) => new THREE.Vector2(r * k, y * k));
    const body = add(new THREE.LatheGeometry(prof, 9), R, 0, tattered ? 0.18 * k : 0, 0); body.scale.z = 0.8;
    if (tattered) for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, t = add(new THREE.ConeGeometry(0.1 * k, 0.45 * k, 3), R, Math.cos(a) * 0.4 * k, 0.05 * k, Math.sin(a) * 0.32 * k); t.rotation.x = Math.PI; }   // the ragged hem trailing to mist
    add(new THREE.TorusGeometry(0.255 * k, 0.03 * k, 5, 10).rotateX(Math.PI / 2), T, 0, (tattered ? 1.13 : 0.95) * k, 0).scale.z = 0.8;   // the belt
    add(new THREE.BoxGeometry(0.07 * k, 0.9 * k, 0.03 * k), T, 0, (tattered ? 0.68 : 0.5) * k, 0.33 * k);   // the trim down the front
    const top = (tattered ? 0.18 : 0) * k;
    // the hood: a deep cowl, a point falling behind, the face in shadow, the eyes glowing out of it
    const hood = new THREE.Group(); hood.position.set(0, top + 1.66 * k, 0.02 * k); root.add(hood);
    add(new THREE.SphereGeometry(0.2 * k, 9, 7, 0, Math.PI * 2, 0, Math.PI * 0.62), R, 0, 0, -0.02 * k, hood).scale.set(1, 1.15, 1.1);
    const pt = add(new THREE.ConeGeometry(0.11 * k, 0.3 * k, 6), R, 0, -0.02 * k, -0.2 * k, hood); pt.rotation.x = -1.9;
    add(new THREE.SphereGeometry(0.14 * k, 8, 6), shadow, 0, -0.03 * k, 0.07 * k, hood).scale.set(1, 1.1, 0.6);   // the dark of the hood
    const E = new THREE.MeshBasicMaterial({ color: eyeColor, toneMapped: false, transparent: true });
    const eyes = new THREE.Group(); hood.add(eyes); eyes.material = E;
    for (const s of [1, -1]) add(new THREE.BoxGeometry(0.045 * k, 0.02 * k, 0.01), E, s * 0.05 * k, -0.01 * k, 0.15 * k, eyes);
    if (mask) { add(new THREE.SphereGeometry(0.11 * k, 7, 5), flat(mask), 0, -0.02 * k, 0.11 * k, hood).scale.set(0.85, 1.1, 0.7); for (const s of [1, -1]) { const a = add(new THREE.CylinderGeometry(0.012 * k, 0.022 * k, 0.32 * k, 4), flat(mask), s * 0.12 * k, 0.2 * k, 0.02 * k, hood); a.rotation.z = -s * 0.6; } }
    if (crown) { const C = crown.isMaterial ? crown : flat(crown); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(new THREE.ConeGeometry(0.035 * k, 0.24 * k, 4), C, Math.cos(a) * 0.17 * k, 0.24 * k, Math.sin(a) * 0.15 * k, hood); } }
    // the shoulders and the sleeved arms, hanging from the shoulders (groups: the beast code lifts them)
    const arms = [];
    for (const s of [1, -1]) {
        add(new THREE.SphereGeometry(0.12 * k, 7, 5), R, s * 0.27 * k, top + 1.42 * k, 0).scale.set(1, 0.8, 0.9);
        const arm = new THREE.Group(); arm.position.set(s * 0.3 * k, top + 1.4 * k, 0); root.add(arm);
        add(new THREE.CylinderGeometry(0.07 * k, 0.13 * k, 0.62 * k, 7).translate(0, -0.31 * k, 0), R, 0, 0, 0, arm);   // the sleeve, wider at the cuff
        add(new THREE.SphereGeometry(0.055 * k, 6, 5), S, 0, -0.66 * k, 0.02 * k, arm);   // the hand
        arm.rotation.z = s * 0.12; arms.push(arm);
    }
    return { root, armL: arms[0], armR: arms[1], eyes, hood, robeMat: R };
}
