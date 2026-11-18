// Parts library — hair and facial hair. Each style adds meshes to the head group (head-local
// coordinates: the skull centre sits at y ≈ 0.13, the face looks along +z).
import * as THREE from 'three';

export const HAIR_STYLES = ['tousled', 'short', 'long', 'ponytail', 'braids', 'bald'];
export const FACIAL_STYLES = ['none', 'stubble', 'beard', 'moustache', 'goatee'];

function put(head, geo, m, x, y, z, s = [1, 1, 1], r = [0, 0, 0]) {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.scale.set(...s);
    o.rotation.set(...r);
    head.add(o);
    return o;
}
const blob = () => new THREE.IcosahedronGeometry(1, 0);

// The cap every haired style starts from: open at the face, plus a crown.
function cap(head, m, low = 0.62) {
    put(head, new THREE.SphereGeometry(0.13, 12, 8, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * low), m, 0, 0.14, -0.008, [0.97, 1.08, 1.04]);
    put(head, new THREE.SphereGeometry(0.128, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.3), m, 0, 0.15, 0, [1, 1.15, 1.05]);
}

export function buildHair(style, head, m) {
    switch (style) {
        case 'bald': return;
        case 'short':
            put(head, new THREE.SphereGeometry(0.128, 12, 8, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.55), m, 0, 0.14, -0.005, [0.98, 1.04, 1.03]);
            put(head, new THREE.SphereGeometry(0.127, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.28), m, 0, 0.145, 0, [1, 1.08, 1.04]);
            return;
        case 'long':
            cap(head, m, 0.7);
            put(head, new THREE.BoxGeometry(0.25, 0.34, 0.06), m, 0, 0.0, -0.11, [1, 1, 1], [0.12, 0, 0]);          // falls down the back
            for (const s of [1, -1]) put(head, new THREE.BoxGeometry(0.05, 0.3, 0.09), m, s * 0.115, 0.03, 0.0, [1, 1, 1], [0, 0, s * 0.08]);
            put(head, blob(), m, 0.02, 0.245, 0.085, [0.07, 0.03, 0.05], [0.5, 0, -0.4]);                             // parted fringe
            return;
        case 'ponytail':
            cap(head, m, 0.6);
            put(head, new THREE.TorusGeometry(0.03, 0.012, 5, 10), m, 0, 0.2, -0.13);
            put(head, new THREE.ConeGeometry(0.05, 0.36, 7), m, 0, 0.03, -0.17, [1, 1, 0.8], [Math.PI - 0.35, 0, 0]);
            return;
        case 'braids':
            cap(head, m, 0.62);
            for (const s of [1, -1]) for (let i = 0; i < 6; i++) {
                put(head, new THREE.SphereGeometry(0.03 - i * 0.002, 6, 5), m, s * 0.105, 0.09 - i * 0.055, 0.04 + i * 0.012);
            }
            return;
        case 'tousled':
        default: {
            cap(head, m);
            const clumps = [   // flattened blobs read as locks of hair
                [0.03, 0.245, 0.085, 0.065, 0.03, 0.05, 0.5, -0.5], [-0.04, 0.238, 0.09, 0.055, 0.028, 0.045, 0.7, 0.4],
                [0.075, 0.215, 0.085, 0.04, 0.025, 0.04, 1.0, -0.9], [0.0, 0.272, 0.02, 0.075, 0.035, 0.07, 0.2, 0.2],
                [-0.05, 0.265, -0.04, 0.06, 0.035, 0.06, -0.4, 0.5], [0.06, 0.26, -0.05, 0.06, 0.035, 0.06, -0.4, -0.5],
                [0.112, 0.16, 0.0, 0.03, 0.06, 0.05, 0.0, -0.2], [-0.112, 0.16, 0.0, 0.03, 0.06, 0.05, 0.0, 0.2],
                [0.0, 0.16, -0.12, 0.08, 0.06, 0.03, -0.2, 0.0],
            ];
            for (const [x, y, z, sx, sy, sz, rx, rz] of clumps) put(head, blob(), m, x, y, z, [sx, sy, sz], [rx, 0, rz]);
        }
    }
}

export function buildFacialHair(style, head, m) {
    const jawShell = (thetaLen, scale) => put(head,
        new THREE.SphereGeometry(0.123, 12, 8, Math.PI * 0.2, Math.PI * 0.6, Math.PI * 0.6, Math.PI * thetaLen), m, 0, 0.13, 0.003, scale);
    switch (style) {
        case 'stubble': jawShell(0.25, [0.93, 1.08, 1.01]); return;
        case 'beard':
            jawShell(0.32, [0.97, 1.12, 1.06]);
            put(head, new THREE.ConeGeometry(0.06, 0.12, 6), m, 0, 0.0, 0.07, [1.2, 1, 0.8], [Math.PI, 0, 0]);
            put(head, new THREE.BoxGeometry(0.07, 0.016, 0.02), m, 0, 0.098, 0.12);
            return;
        case 'moustache':
            for (const s of [1, -1]) put(head, new THREE.BoxGeometry(0.045, 0.014, 0.018), m, s * 0.024, 0.098, 0.12, [1, 1, 1], [0, 0, s * 0.3]);
            return;
        case 'goatee':
            put(head, new THREE.ConeGeometry(0.03, 0.07, 6), m, 0, 0.04, 0.1, [1, 1, 0.8], [Math.PI + 0.2, 0, 0]);
            put(head, new THREE.BoxGeometry(0.06, 0.014, 0.018), m, 0, 0.098, 0.12);
            return;
        default: return;   // none
    }
}
