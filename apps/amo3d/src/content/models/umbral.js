// The Umbral Plane's building kit (Nythoria): black stone, pointed gothic arches, lancet windows of violet glass, vines
// over everything — after the user's picture of Ravenspire (assets/art/concept/ravenspire_nythoria.jpeg). Ruined pieces
// for the present day (501 AGD); no named place is built here — the maps that use them name nothing until the lore is
// checked (docs/3d/NYTHORIA_PLAN.md).
import * as THREE from 'three';

const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o });
const STONE = () => mat(0x48444f), STONE2 = () => mat(0x57525e), VINE = () => mat(0x1f2e1c, { roughness: 1 });
const GLASS = () => new THREE.MeshStandardMaterial({ color: 0xa47aff, emissive: 0xa070ff, emissiveIntensity: 2.4, flatShading: true, side: THREE.DoubleSide });
const DARKGLASS = () => mat(0x15131a, { side: THREE.DoubleSide });

function add(g, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o;
}
// A pointed (lancet) window or arch outline: a rectangle with a gothic point, as a flat shape (w wide, h to the springing).
function lancet(w, h) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h); s.quadraticCurveTo(-w / 2, h + w * 0.55, 0, h + w * 0.9); s.quadraticCurveTo(w / 2, h + w * 0.55, w / 2, h); s.lineTo(w / 2, 0); s.closePath();
    return s;
}
// Vines hanging down a face: a few dark strands with leaf clumps.
function vines(g, x, y, z, len, rng, ry = 0) {
    const V = VINE();
    for (let i = 0; i < 3; i++) {
        const l = len * (0.5 + rng() * 0.5), sx = x + (rng() - 0.5) * 1.2;
        const strand = add(g, new THREE.CylinderGeometry(0.03, 0.05, l, 4), V, sx, y - l / 2, z); strand.rotation.y = ry;
        for (let k = 0; k < 4; k++) add(g, new THREE.IcosahedronGeometry(0.14 + rng() * 0.1, 0), V, sx + (rng() - 0.5) * 0.3, y - rng() * l, z + (rng() - 0.5) * 0.15);
    }
}
const rngOf = seed => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// A broken gothic spire: an octagonal shaft on a buttressed base, tall lancet windows (a few still lit violet), the top
// broken off jagged. ~14 m tall. userData.light: a cold violet glow from the lit windows.
export function umbralSpire(seed = 11) {
    const g = new THREE.Group(), rng = rngOf(seed);
    const S = STONE(), S2 = STONE2(), G = GLASS(), D = DARKGLASS();
    add(g, new THREE.CylinderGeometry(3.2, 3.6, 1.2, 8), S2, 0, 0.6, 0);                     // plinth
    add(g, new THREE.CylinderGeometry(2.4, 2.7, 8, 8), S, 0, 5.2, 0);                         // the lower shaft
    add(g, new THREE.CylinderGeometry(1.9, 2.3, 5, 8), S2, 0, 11.6, 0);                       // the upper shaft
    for (let i = 0; i < 8; i++) {   // buttresses, stepping in
        const a = i / 8 * Math.PI * 2 + Math.PI / 8, b = add(g, new THREE.BoxGeometry(0.6, 6, 1.4), S, Math.cos(a) * 2.9, 3.6, Math.sin(a) * 2.9);
        b.rotation.y = -a; b.rotation.z = 0.08 * (i % 2 ? 1 : -1);
        add(g, new THREE.ConeGeometry(0.35, 1.4, 4), S2, Math.cos(a) * 2.9, 7.3, Math.sin(a) * 2.9);   // pinnacles
    }
    const win = new THREE.ShapeGeometry(lancet(1.0, 2.8));
    for (let i = 0; i < 8; i++) {   // lancet windows round the shaft, two tiers; some lit, most dark
        const a = i / 8 * Math.PI * 2;
        for (const [y, r] of [[4.2, 2.42], [10.6, 1.93]]) {
            const lit = rng() < 0.45, w = add(g, win, lit ? G : D, Math.cos(a) * r, y, Math.sin(a) * r);
            w.rotation.y = -a + Math.PI / 2;
        }
    }
    // the broken crown: jagged teeth of stone where the spire snapped
    for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, h = 0.6 + rng() * 2.2;
        add(g, new THREE.BoxGeometry(0.9, h, 0.5), S, Math.cos(a) * 1.8, 14.1 + h / 2, Math.sin(a) * 1.8, 0, -a, (rng() - 0.5) * 0.3);
    }
    for (let i = 0; i < 6; i++) add(g, new THREE.DodecahedronGeometry(0.4 + rng() * 0.6, 0), S2, (rng() - 0.5) * 9, 0.3, (rng() - 0.5) * 9);   // fallen stones
    for (let i = 0; i < 4; i++) { const a = rng() * Math.PI * 2; vines(g, Math.cos(a) * 2.5, 9 + rng() * 4, Math.sin(a) * 2.5, 6, rng, -a); }
    g.userData.light = { color: 0x9a6aff, i: 14, r: 16, y: 8 };
    return g;
}

// A pointed gothic arch of black stone, one jamb broken short.
export function umbralArch(seed = 5) {
    const g = new THREE.Group(), rng = rngOf(seed), S = STONE(), S2 = STONE2();
    add(g, new THREE.BoxGeometry(0.9, 5.2, 0.9), S, -2.1, 2.6, 0);
    add(g, new THREE.BoxGeometry(0.9, 2.6, 0.9), S, 2.1, 1.3, 0);                          // the broken jamb
    for (let i = 0; i < 6; i++) {   // the left half of the pointed head still standing, stone by stone
        const t = i / 6, ang = Math.PI * (1 - t * 0.5);
        add(g, new THREE.BoxGeometry(0.9, 0.7, 0.85), S, -2.1 + t * 2.0, 5.2 + Math.sin(t * Math.PI / 2) * 2.0, 0, 0, 0, -ang + Math.PI / 2);
    }
    for (let i = 0; i < 5; i++) add(g, new THREE.DodecahedronGeometry(0.3 + rng() * 0.4, 0), S2, 1.5 + rng() * 2, 0.25, (rng() - 0.5) * 2);
    vines(g, -2.1, 5.2, 0.5, 3.5, rng);
    return g;
}

// A broken column: a drum or two still standing, the rest fallen beside it.
export function umbralColumn(seed = 3) {
    const g = new THREE.Group(), rng = rngOf(seed), S = STONE(), S2 = STONE2();
    add(g, new THREE.BoxGeometry(1.2, 0.4, 1.2), S2, 0, 0.2, 0);
    const h = 1.2 + rng() * 2.5;
    add(g, new THREE.CylinderGeometry(0.45, 0.5, h, 8), S, 0, 0.4 + h / 2, 0);
    for (let i = 0; i < 2; i++) { const d = add(g, new THREE.CylinderGeometry(0.45, 0.45, 1.1, 8), S, 1.0 + i * 1.2, 0.45, (rng() - 0.5) * 0.8); d.rotation.z = Math.PI / 2; d.rotation.y = rng() * 0.6; }
    if (rng() < 0.6) vines(g, 0, 0.4 + h, 0.45, h * 0.8, rng);
    return g;
}
