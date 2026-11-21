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

// A rowboat (Phase 13, boats — first pass): a clinker hull, two thwarts, oars that row with speed.
export function buildBoat() {
    const root = new THREE.Group(), W = flat(0x7a5a38), D = flat(0x4a3420), add = (geo, m, x, y, z, p = root) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
    add(new THREE.BoxGeometry(1.3, 0.12, 3.4), D, 0, 0.0, 0);                      // the bottom
    for (const s of [-1, 1]) { const side = add(new THREE.BoxGeometry(0.1, 0.5, 3.4), W, s * 0.68, 0.25, 0); side.rotation.z = s * -0.25; }
    add(new THREE.BoxGeometry(1.2, 0.5, 0.1), W, 0, 0.25, -1.68);                 // the transom
    const bow = add(new THREE.ConeGeometry(0.7, 1.1, 4), W, 0, 0.25, 2.2); bow.rotation.x = Math.PI / 2; bow.scale.set(1, 1, 0.5);
    for (const z of [-0.6, 0.6]) add(new THREE.BoxGeometry(1.25, 0.06, 0.3), D, 0, 0.32, z);   // thwarts
    const oars = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.7, 0.45, 0.1); root.add(g); const o = add(new THREE.BoxGeometry(0.06, 0.06, 2.2), D, s * 0.8, 0, 0, g); o.rotation.y = s * 1.3; add(new THREE.BoxGeometry(0.04, 0.22, 0.5), D, s * 1.75, 0, -0.4, g); return { g, s }; });
    let t = 0;
    function update(dt, speed = 0) { t += dt * (1 + speed); for (const o of oars) { o.g.rotation.y = Math.sin(t * 2.2) * 0.5 * Math.min(1, speed / 2); o.g.rotation.z = o.s * (0.1 + Math.max(0, Math.cos(t * 2.2)) * 0.2 * Math.min(1, speed / 2)); } root.rotation.z = Math.sin(t * 0.8) * 0.02; }
    return { root, update };
}

// A sailing boat (Phase 13 — sailboats): a long hull with a small cabin, a mast, a gaff mainsail and a jib; the sails
// fill and lean with speed. { root, update(dt, speed) }.
export function buildSailboat({ sail = 0xeee6d2, hull = 0x5a3e26, trim = 0x2a4a6a } = {}) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const W = flat(hull), T = flat(trim), D = flat(0x3a2818), S = new THREE.MeshStandardMaterial({ color: sail, side: THREE.DoubleSide, flatShading: true });
    const add = (geo, m, x, y, z, p = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };
    add(new THREE.BoxGeometry(2.0, 0.9, 6.2), W, 0, 0.2, 0);                         // the hull
    const bow = add(new THREE.ConeGeometry(1.05, 2.2, 4), W, 0, 0.2, 4.1); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.45);
    add(new THREE.BoxGeometry(2.06, 0.14, 6.25), T, 0, 0.62, 0);                       // the rail stripe
    add(new THREE.BoxGeometry(1.8, 0.06, 6.0), flat(0x9a7a52), 0, 0.66, 0);             // the deck
    add(new THREE.BoxGeometry(1.2, 0.7, 1.6), W, 0, 1.0, -1.6); add(new THREE.BoxGeometry(1.3, 0.08, 1.7), D, 0, 1.38, -1.6);   // the cabin
    add(new THREE.CylinderGeometry(0.08, 0.1, 7.5, 6), D, 0, 4.4, 0.6);                 // the mast
    const boom = add(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 5), D, 0, 1.5, -0.9); boom.rotation.x = Math.PI / 2;
    const main = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.55, 0.55), new THREE.Vector3(0, 7.6, 0.55), new THREE.Vector3(0, 1.55, -2.55), new THREE.Vector3(0, 6.6, -1.9)]), S);
    main.geometry.setIndex([0, 1, 2, 2, 1, 3]); main.geometry.computeVertexNormals(); main.castShadow = true; body.add(main);
    const jib = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.0, 4.8), new THREE.Vector3(0, 7.2, 0.7), new THREE.Vector3(0, 1.2, 0.8)]), S);
    jib.geometry.computeVertexNormals(); jib.castShadow = true; body.add(jib);
    let t = 0;
    function update(dt, speed = 0) {
        t += dt; const k = Math.min(1, speed / 6);
        main.rotation.y = -0.25 - 0.3 * k; jib.rotation.y = -0.15 - 0.2 * k; boom.rotation.z = 0.25 + 0.3 * k;   // the sails filled
        body.rotation.z = Math.sin(t * 0.7) * 0.03 + k * 0.08; body.rotation.x = Math.sin(t * 1.1) * 0.02;
        body.position.y = Math.sin(t * 0.9) * 0.05;
    }
    return { root, update };
}
