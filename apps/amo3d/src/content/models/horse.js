// A horse (Phase 13, mounts — first pass): low-poly, saddled, with a walk/gallop cycle driven by speed.
// { root, update(dt, speed) } — the rider sits at root's y + SADDLE_Y.
import * as THREE from 'three';
import { flat } from '../../engine/lib.js';

export const SADDLE_Y = 1.15;

export function buildHorse({ coat = 0x6a4a32, mane = 0x2a1e16 } = {}) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const C = flat(coat), M = flat(mane), H = flat(0x2a2420), S = flat(0x5a3020), B = flat(0x8a6a30);
    const add = (geo, m, x, y, z, p = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
    const torso = add(new THREE.BoxGeometry(0.6, 0.62, 1.55), C, 0, 1.18, 0); torso.geometry.translate(0, 0, 0);
    add(new THREE.BoxGeometry(0.56, 0.5, 0.5), C, 0, 1.28, 0.62);   // chest
    add(new THREE.BoxGeometry(0.58, 0.5, 0.5), C, 0, 1.22, -0.6);   // haunch
    const neck = new THREE.Group(); neck.position.set(0, 1.42, 0.78); neck.rotation.x = -0.75; body.add(neck);
    add(new THREE.BoxGeometry(0.32, 0.36, 0.78), C, 0, 0, 0.32, neck);
    const head = add(new THREE.BoxGeometry(0.26, 0.28, 0.62), C, 0, 0.22, 0.78, neck); head.rotation.x = 1.0;
    add(new THREE.BoxGeometry(0.06, 0.34, 0.7), M, 0, 0.2, 0.25, neck);   // mane
    for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.05, 0.16, 4), C, s * 0.08, 0.42, 0.62, neck);   // ears
    const tail = add(new THREE.BoxGeometry(0.1, 0.62, 0.1), M, 0, 1.12, -0.88); tail.rotation.x = 0.4;
    add(new THREE.BoxGeometry(0.66, 0.08, 0.62), S, 0, 1.52, 0.05);   // saddle
    add(new THREE.BoxGeometry(0.64, 0.24, 0.06), S, 0, 1.42, -0.24);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.02, 0.42, 0.06), B, s * 0.33, 1.3, 0.05);   // stirrup straps
    const legs = [[0.2, 0.62, 0], [-0.2, 0.62, Math.PI], [0.2, -0.6, Math.PI], [-0.2, -0.6, 0]].map(([x, z, ph]) => {
        const g = new THREE.Group(); g.position.set(x, 1.0, z); body.add(g);
        add(new THREE.BoxGeometry(0.14, 0.55, 0.16), C, 0, -0.27, 0, g);
        const low = new THREE.Group(); low.position.y = -0.52; g.add(low);
        add(new THREE.BoxGeometry(0.1, 0.45, 0.11), C, 0, -0.22, 0, low);
        add(new THREE.BoxGeometry(0.13, 0.08, 0.15), H, 0, -0.46, 0.01, low);
        return { g, low, ph };
    });
    let t = 0;
    function update(dt, speed = 0) {
        const gait = Math.min(1, speed / 3), k = speed > 7 ? 1.6 : 1;   // walk → gallop
        t += dt * (2 + speed * 1.1);
        for (const L of legs) { const a = Math.sin(t * k + L.ph); L.g.rotation.x = a * 0.55 * gait; L.low.rotation.x = Math.max(0, -Math.cos(t * k + L.ph)) * 0.7 * gait; }
        body.position.y = Math.abs(Math.sin(t * k)) * 0.06 * gait;
        body.rotation.x = Math.sin(t * k * 2) * 0.03 * gait;
        neck.rotation.x = -0.75 + Math.sin(t * k) * 0.08 * gait;
        tail.rotation.x = 0.4 + Math.sin(t * 0.7) * 0.1 + gait * 0.4;
    }
    return { root, update };
}
