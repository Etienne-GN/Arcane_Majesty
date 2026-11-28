// Palettes (2026-11-27, LIBRARY_PLAN — the user: "next will be palette, to change the colors"): every colour a built
// model is drawn in — its materials' colours and its vertex colours (the v2 bodies) — gathered into swatches, near shades
// of one colour grouped (a coat's light and dark faces change together, keeping their shading), and recoloured.
// paletteOf(root) → [{ hex, count }] (the most used first) · applyPalette(root, { '<hex>': '<new hex>' }) — the same
// grouping on the same model, so a saved palette lands the same in the Library and in the game.
import * as THREE from 'three';

const NEAR = 18;   // (0–255 per channel, summed: shades closer than this are one swatch)
const tmp = new THREE.Color();
function gather(root) {
    const found = new Map();   // hex → { r, g, b, count, mats: [[mesh, slot]], verts: [[attr, i]] }
    const add = (hex, item, kind, n = 1) => { let e = found.get(hex); if (!e) { tmp.set(`#${hex}`); e = { hex, r: tmp.r, g: tmp.g, b: tmp.b, count: 0, mats: [], verts: [] }; found.set(hex, e); } e.count += n; e[kind].push(item); };
    root.traverse(o => {
        if (!o.isMesh || !o.visible) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const col = o.geometry?.attributes?.color;
        mats.forEach((m, slot) => {
            if (!m?.color || m.isShaderMaterial) return;
            if (m.vertexColors && col) return;   // (its colour is in the vertices)
            add(m.color.getHexString(), [o, slot], 'mats', o.geometry?.attributes?.position?.count ?? 1);
        });
        if (col && mats.some(m => m?.vertexColors)) for (let i = 0; i < col.count; i++) { tmp.setRGB(col.getX(i), col.getY(i), col.getZ(i)); add(tmp.getHexString(), [col, i], 'verts'); }
    });
    // group near shades: the most used colour leads, the near ones join it
    const list = [...found.values()].sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex)), groups = [];
    const d255 = (a, b) => (Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)) * 255;
    for (const e of list) { const g = groups.find(g2 => d255(g2.lead, e) < NEAR); if (g) { g.members.push(e); g.count += e.count; } else groups.push({ lead: e, members: [e], count: e.count }); }
    return groups;
}
export function paletteOf(root) { return gather(root).map(g => ({ hex: `#${g.lead.hex}`, count: g.count })).slice(0, 32); }
// recolour: each swatch's members move with it, keeping their shade relative to the swatch's colour
export function applyPalette(root, colors) {
    if (!colors || !Object.keys(colors).length) return;
    const owned = new Map();   // (a material shared with other things: copied for this model before it changes)
    for (const g of gather(root)) {
        const to = colors[`#${g.lead.hex}`]; if (!to) continue;
        const T = new THREE.Color(to), L = g.lead;
        const shade = m => new THREE.Color(Math.min(1, T.r * (L.r ? m.r / L.r : 1)), Math.min(1, T.g * (L.g ? m.g / L.g : 1)), Math.min(1, T.b * (L.b ? m.b / L.b : 1)));
        for (const m of g.members) {
            const c = shade(m);
            for (const [mesh, slot] of m.mats) {
                const key = `${mesh.uuid}|${slot}`;
                if (!owned.has(key)) {
                    const arr = Array.isArray(mesh.material), src = arr ? mesh.material[slot] : mesh.material, cp = src.clone();
                    cp.onBeforeCompile = src.onBeforeCompile; cp.userData = src.userData; cp.customProgramCacheKey = src.customProgramCacheKey;   // (the shadow material's rim, a shader's own changes)
                    if (arr) { mesh.material = [...mesh.material]; mesh.material[slot] = cp; } else mesh.material = cp;
                    owned.set(key, cp);
                }
                owned.get(key).color.copy(c);
            }
            for (const [attr, i] of m.verts) { attr.setXYZ(i, c.r, c.g, c.b); attr.needsUpdate = true; }
        }
    }
}
