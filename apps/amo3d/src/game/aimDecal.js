// The aim marker's look (asked 2026-11-22: "adapt to terrain, never mid air; a small rune by magic type, scaled to the
// effect's range; no hard-line circle; subtle yet clear"): a soft glow that fades to nothing at the spell's radius, a faint
// ring of glyph-ticks near its rim, the element's rune glowing in the middle — drawn once per element on a canvas. The
// decal is a grid whose vertices hug the ground every frame (it lies on slopes, steps, banks; never floats or sinks).
import * as THREE from 'three';

const RUNES = {   // strokes in a −1…1 box (y up)
    fire: [[[0, 0.9], [-0.7, -0.6], [0.7, -0.6], [0, 0.9]], [[0, 0.25], [-0.25, -0.3], [0.25, -0.3], [0, 0.25]]],
    water: [[[-0.9, 0.2], [-0.45, 0.5], [0, 0.2], [0.45, -0.1], [0.9, 0.2]], [[-0.9, -0.35], [-0.45, -0.05], [0, -0.35], [0.45, -0.65], [0.9, -0.35]]],
    ice: [[[0, 0.9], [0, -0.9]], [[-0.78, 0.45], [0.78, -0.45]], [[-0.78, -0.45], [0.78, 0.45]], [[-0.2, 0.7], [0, 0.5], [0.2, 0.7]], [[-0.2, -0.7], [0, -0.5], [0.2, -0.7]]],
    earth: [[[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7], [-0.7, -0.7]], [[-0.7, 0], [0.7, 0]], [[0, -0.7], [0, 0]]],
    nature: [[[0, -0.9], [0, 0.9]], [[0, 0.1], [-0.6, 0.6]], [[0, 0.1], [0.6, 0.6]], [[0, -0.35], [-0.5, 0.05]], [[0, -0.35], [0.5, 0.05]]],
    wind: [[[-0.8, 0.4], [0.3, 0.4], [0.6, 0.65], [0.4, 0.85]], [[-0.8, 0], [0.6, 0], [0.85, -0.25], [0.6, -0.5]], [[-0.8, -0.4], [0.1, -0.4]]],
    lightning: [[[0.25, 0.95], [-0.35, 0.05], [0.2, 0.05], [-0.25, -0.95]]],
    shadow: [[...Array.from({ length: 13 }, (_, i) => { const a = Math.PI * 0.35 + i / 12 * Math.PI * 1.3; return [Math.cos(a) * 0.85, Math.sin(a) * 0.85]; })], [...Array.from({ length: 11 }, (_, i) => { const a = Math.PI * 0.5 + i / 10 * Math.PI; return [0.25 + Math.cos(a) * 0.6, Math.sin(a) * 0.6]; })]],
    arcane: [[...Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 2 + i * Math.PI * 4 / 5; return [Math.cos(a) * 0.9, Math.sin(a) * 0.9]; })]],
};
const cache = new Map();
export function aimTexture(element, color) {
    const key = element + color; if (cache.has(key)) return cache.get(key);
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), col = new THREE.Color(color), rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
    // the glow: faint in the middle, a soft band near the rim, gone at the edge (no line anywhere)
    const rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, `rgba(${rgb},0.16)`); rg.addColorStop(0.62, `rgba(${rgb},0.1)`); rg.addColorStop(0.82, `rgba(${rgb},0.3)`); rg.addColorStop(0.92, `rgba(${rgb},0.12)`); rg.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, S, S);
    // glyph-ticks round the rim, fading
    g.strokeStyle = `rgba(${rgb},0.5)`; g.lineWidth = 2.2; g.lineCap = 'round';
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r0 = S * 0.36, r1 = S * (i % 2 ? 0.385 : 0.405); g.beginPath(); g.moveTo(S / 2 + Math.cos(a) * r0, S / 2 + Math.sin(a) * r0); g.lineTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1); g.stroke(); }
    // the rune, glowing
    const R = S * 0.14, draw = (w, a) => { g.strokeStyle = `rgba(${rgb},${a})`; g.lineWidth = w; g.lineJoin = 'round'; for (const line of RUNES[element] ?? RUNES.arcane) { g.beginPath(); line.forEach(([x, y], i) => { const px = S / 2 + x * R, py = S / 2 - y * R; if (i) g.lineTo(px, py); else g.moveTo(px, py); }); g.stroke(); } };
    g.shadowColor = `rgba(${rgb},1)`; g.shadowBlur = 14; draw(7, 0.35); g.shadowBlur = 6; draw(3.2, 0.95); g.shadowBlur = 0; draw(1.4, 1);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; cache.set(key, t); return t;
}
let reachTex = null;
function reachTexture() {   // the casting range: a faint dotted halo fading in and out, no line
    if (reachTex) return reachTex;
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
    for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, x = S / 2 + Math.cos(a) * S * 0.47, y = S / 2 + Math.sin(a) * S * 0.47, rg = g.createRadialGradient(x, y, 0, x, y, 5); rg.addColorStop(0, 'rgba(255,255,255,0.7)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x - 5, y - 5, 10, 10); }
    return (reachTex = new THREE.CanvasTexture(c));
}

// A decal hugging the ground: size (m), N×N grid. place(x, z, groundY, r) re-lays it.
export function createGroundDecal(map, N = 20, additive = true) {
    const geo = new THREE.PlaneGeometry(2, 2, N, N).rotateX(-Math.PI / 2), base = geo.attributes.position.array.slice();
    const mat = new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 50;
    return {
        mesh, mat,
        place(x, z, r, groundY, lift = 0.07) {
            const p = geo.attributes.position;
            for (let i = 0; i < p.count; i++) { const lx = base[i * 3] * r, lz = base[i * 3 + 2] * r; p.setXYZ(i, x + lx, groundY(x + lx, z + lz) + lift, z + lz); }
            p.needsUpdate = true; geo.computeBoundingSphere();
        },
    };
}
export { reachTexture };
