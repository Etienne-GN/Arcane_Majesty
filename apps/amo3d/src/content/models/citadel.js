// The Citadel of Thaloria — the great library-palace on the cliff above the gorge, after the Eldoria's Prophecy
// album cover: a broad gothic keep of pale gold stone on an arched undercroft, buttressed halls, a crowd of
// pinnacles, tall lit windows, a great arched entrance, and one central tower rising in tiers to a needle spire;
// a red-roofed hall on the terrace beside it. Built in code; its base is at y = 0, the entrance facing +z.
import * as THREE from 'three';

const STONE = 0xc8b48a, STONE2 = 0xb09a72, DARK = 0x5a4a38, ROOF = 0x4a4a58, RED = 0xa8402a;
const mats = {};
const mat = (c, o = {}) => (mats[`${c}${JSON.stringify(o)}`] ??= new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o }));
const glow = () => mat(0xffd890, { emissive: 0xffb860, emissiveIntensity: 1.1 });

function add(g, geo, m, x, y, z, ry = 0) { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; }
const box = (g, w, h, d, c, x, y, z, ry) => add(g, new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? mat(c) : c, x, y, z, ry);
const cone = (g, r, h, c, x, y, z, seg = 8) => add(g, new THREE.ConeGeometry(r, h, seg), mat(c), x, y, z);
const cyl = (g, r0, r1, h, c, x, y, z, seg = 8) => add(g, new THREE.CylinderGeometry(r0, r1, h, seg), mat(c), x, y, z);

// Tall arched windows, lit, on one face of a block (w wide, at height y0..y1, face at z = f, facing +z).
function windows(g, cx, w, y0, rows, f, n, rot = 0) {
    for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) {
        const x = cx - w / 2 + (i + 0.5) * (w / n), y = y0 + r * 4.2;
        const p = new THREE.Vector3(x, y, f).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        add(g, new THREE.BoxGeometry(0.9, 2.6, 0.2), glow(), p.x, p.y, p.z, rot);
        const a = new THREE.Vector3(x, y + 1.5, f).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
        add(g, new THREE.ConeGeometry(0.46, 0.7, 4), glow(), a.x, a.y, a.z, rot + Math.PI / 4);
    }
}
function pinnacle(g, x, y, z, s = 1) {   // a slender turret with a pointed cap
    cyl(g, 0.7 * s, 0.8 * s, 6 * s, STONE, x, y + 3 * s, z);
    cone(g, 0.85 * s, 4 * s, ROOF, x, y + 8 * s, z);
    cone(g, 0.12 * s, 1.6 * s, 0xd4a84a, x, y + 10.6 * s, z, 4);
}

export function buildCitadel() {
    const g = new THREE.Group();
    // the undercroft: a massive arched base where the cliff water pours through
    box(g, 44, 10, 30, STONE2, 0, 5, 0);
    for (let i = 0; i < 5; i++) box(g, 5, 7, 31, 0x2a2420, -16 + i * 8, 3.5, 0);   // dark arches through the base
    for (let i = 0; i < 6; i++) box(g, 3, 10.4, 31, STONE2, -20 + i * 8, 5.2, 0);    // the piers between them
    // the main halls: two buttressed wings and the great front
    for (const sx of [-1, 1]) {
        box(g, 14, 16, 22, STONE, sx * 14, 18, 0);
        add(g, new THREE.ConeGeometry(13, 8, 4), mat(ROOF), sx * 14, 30, 0, Math.PI / 4).scale.set(0.75, 1, 1.15);
        for (let k = 0; k < 4; k++) { box(g, 1.4, 14, 2.2, STONE2, sx * 21.4, 17, -8 + k * 5.4); pinnacle(g, sx * 21.4, 24, -8 + k * 5.4, 0.55); }
        windows(g, sx * 14, 12, 14, 3, 11.1, 4);
        pinnacle(g, sx * 7.5, 26, 11, 0.9); pinnacle(g, sx * 20.5, 26, 11, 0.9); pinnacle(g, sx * 20.5, 26, -11, 0.9);
    }
    // the great entrance between the wings
    box(g, 12, 20, 24, STONE, 0, 20, 2);
    box(g, 6, 10, 0.6, 0x2a2018, 0, 15, 14.1);
    add(g, new THREE.CylinderGeometry(3, 3, 0.6, 12, 1, false, 0, Math.PI), mat(0x2a2018), 0, 20, 14.1).rotation.set(Math.PI / 2, 0, Math.PI / 2);
    add(g, new THREE.CircleGeometry(2.6, 16), glow(), 0, 25.5, 14.2);   // the rose window
    pinnacle(g, -5.5, 30, 13.5, 0.8); pinnacle(g, 5.5, 30, 13.5, 0.8);
    // the central tower, rising in tiers to the needle spire
    const tiers = [[14, 14, 30], [11, 12, 44], [8.5, 10, 56], [6.5, 8, 66]];
    for (const [w, h, y] of tiers) {
        box(g, w, h, w, STONE, 0, y, -2);
        for (const f of [0, 1, 2, 3]) windows(g, 0, w - 2, y - h / 2 + 2.5, Math.max(1, Math.round(h / 5) - 1), w / 2 + 0.06, 3, f * Math.PI / 2);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) pinnacle(g, sx * (w / 2), y + h / 2, -2 + sz * (w / 2), 0.5 + w * 0.03);
    }
    cyl(g, 3.6, 4.2, 6, STONE, 0, 73, -2, 8);
    cone(g, 3.8, 26, ROOF, 0, 89, -2, 8);
    cone(g, 0.35, 4, 0xd4a84a, 0, 104, -2, 4);
    // a few more spires behind, as on the cover
    for (const [x, z, s] of [[-12, -12, 1.4], [12, -12, 1.4], [-6, -16, 1.1], [6, -16, 1.1]]) { box(g, 4 * s, 18 * s, 4 * s, STONE, x, 26 + 9 * s, z); pinnacle(g, x, 26 + 18 * s, z, 0.9 * s); }
    // the red-roofed hall on the terrace to the right
    box(g, 14, 6, 9, 0xd8c8a4, 30, 13, 16);
    add(g, new THREE.ConeGeometry(10, 4, 4), mat(RED), 30, 18, 16, Math.PI / 4).scale.set(1, 1, 0.66);
    for (let i = 0; i < 5; i++) box(g, 0.9, 2.2, 0.2, glow(), 25 + i * 2.5, 12.5, 20.6);
    box(g, 16, 4, 11, STONE2, 30, 8, 16);
    void DARK;
    return g;
}
