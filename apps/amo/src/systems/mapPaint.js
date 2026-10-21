// W5: paints a map's overview, one RGBA pixel per tile, from its tile grid and fog.
// The minimap and the full map (M) both show this image. Pure — tools/test_fog_map.mjs.
import { decodeBitsToMask } from './regionFormat.js';
import { FOG_CELL, isCellExplored } from './fog.js';

export const TERRAIN = { 0: 0x1e3a14, 1: 0x0d2010, 2: 0x5a4a2a, 3: 0x6b6358, 4: 0x101014 };   // grass, trees, road, street, void
export const INTERIOR_TERRAIN = { 0: 0x5a4632, 1: 0x1a1612 };                                     // floor, wall
export const UNKNOWN = 0x000000;
export const CHART_ROAD = 0x3a3020;   // a charted road still under the fog

const masks = new WeakMap();   // def → decoded layers, decoded once
function cached(def, key, make) {
    let m = masks.get(def);
    if (!m) masks.set(def, m = {});
    if (!(key in m)) m[key] = make();
    return m[key];
}

// 1 where a chart shows a road: the region's own `chart` layer, else its road and street tiles.
export function chartMask(def) {
    return cached(def, 'chart', () => {
        const h = def.tiles.length, w = def.tiles[0].length;
        if (typeof def.chart === 'string') return decodeBitsToMask(def.chart, w, h);
        const out = new Uint8Array(w * h);
        def.tiles.forEach((row, y) => row.forEach((t, x) => { if (t === 2 || t === 3) out[y * w + x] = 1; }));
        return out;
    });
}

// 1 on dense-forest tiles, or null when the map has no `dense` layer.
export function denseMask(def) {
    return cached(def, 'dense', () => (typeof def.dense === 'string' && def.tiles?.length
        ? decodeBitsToMask(def.dense, def.tiles[0].length, def.tiles.length) : null));
}

export const isDenseAt = (mask, w, tx, ty) => !!mask && tx >= 0 && ty >= 0 && tx < w && mask[ty * w + tx] === 1;

function put(data, i, rgb) {
    data[i * 4] = (rgb >> 16) & 255; data[i * 4 + 1] = (rgb >> 8) & 255; data[i * 4 + 2] = rgb & 255; data[i * 4 + 3] = 255;
}

function paintTile(img, def, fog, chart, x, y) {
    const i = y * img.w + x;
    const pal = def.interior ? INTERIOR_TERRAIN : TERRAIN;
    if (isCellExplored(fog, Math.floor(x / FOG_CELL), Math.floor(y / FOG_CELL))) put(img.data, i, pal[def.tiles[y][x]] ?? pal[0]);
    else put(img.data, i, chart && chart[i] ? CHART_ROAD : UNKNOWN);
}

// { w, h, data: Uint8ClampedArray }, or null for a map without a tile grid.
export function paintMap(def, fog, { charted = false } = {}) {
    if (!def.tiles?.length) return null;
    const h = def.tiles.length, w = def.tiles[0].length;
    const img = { w, h, data: new Uint8ClampedArray(w * h * 4) };
    const chart = charted ? chartMask(def) : null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) paintTile(img, def, fog, chart, x, y);
    return img;
}

// Repaints the tiles of the given fog cells (the result of revealAround).
export function paintCells(img, def, fog, cells, { charted = false } = {}) {
    const chart = charted ? chartMask(def) : null;
    for (const [cx, cy] of cells) {
        for (let y = cy * FOG_CELL; y < Math.min(img.h, (cy + 1) * FOG_CELL); y++) {
            for (let x = cx * FOG_CELL; x < Math.min(img.w, (cx + 1) * FOG_CELL); x++) paintTile(img, def, fog, chart, x, y);
        }
    }
}
