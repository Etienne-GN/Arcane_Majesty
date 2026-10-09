/**
 * Browser-side sheet loading for Forge v2: fetch a layer's PNG from the game's
 * library (/lpc/...), apply its palette swap, remember which direction rows are
 * empty, and draw single frames. Misses are cached as null so a missing file is
 * requested once, never on every tick.
 */
import { animPath } from '@game/systems/lpcLayout.js';
import { remapPixels } from '@game/systems/lpcPalettes.js';
import { resolveAnim } from '@game/systems/animResolve.js';
import { frameGeometry, frameRect, frameSizeOf } from './frames.js';
import { Lru } from './lru.js';

// key → Promise<Sheet|null>. Bounded: the full grid (15 motions × ~10 layers)
// plus a slot's picker thumbnails fit; older tints are dropped and rebuilt on demand.
const cache = new Lru(300);

function swapKey(sp) { return sp ? `${sp.sourceKey}:${sp.tintName}` : ''; }

/** Sheet = { canvas, w, h, emptyRows:Set<number>, activeCols:number } — or null when the PNG is missing/broken. */
export function loadSheet(layer, concrete) {
    const path = '/' + animPath(layer, concrete);
    const key = path + '|' + swapKey(layer.swapParams);
    if (!cache.has(key)) cache.set(key, build(path, layer.swapParams));
    return cache.get(key);
}

async function build(path, swap) {
    const img = new Image();
    img.src = path;
    try { await img.decode(); } catch { return null; }
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (swap) {
        remapPixels(data.data, swap.sourceColors, swap.targetShades);
        ctx.putImageData(data, 0, 0);
    }
    const fs = frameSizeOf(canvas.width, canvas.height);
    return { canvas, w: canvas.width, h: canvas.height, emptyRows: emptyRows(data, fs), activeCols: activeCols(data, fs) };
}

/** Index of the first fully transparent column (the game's countActiveCols). */
function activeCols(img, fs) {
    const cols = Math.floor(img.width / fs);
    for (let c = 0; c < cols; c++) {
        let any = false;
        for (let y = 0; y < img.height && !any; y++) {
            for (let x = c * fs; x < (c + 1) * fs; x++) {
                if (img.data[(y * img.width + x) * 4 + 3] > 8) { any = true; break; }
            }
        }
        if (!any) return c;
    }
    return cols;
}

/** Rows with no opaque pixel — e.g. a longsword behind-layer has no DOWN content. */
function emptyRows(img, fs) {
    const out = new Set();
    const rows = Math.round(img.height / fs);
    for (let r = 0; r < rows; r++) {
        let any = false;
        for (let y = r * fs; y < (r + 1) * fs && !any; y++) {
            for (let x = 0; x < img.width; x++) {
                if (img.data[(y * img.width + x) * 4 + 3] > 8) { any = true; break; }
            }
        }
        if (!any) out.add(r);
    }
    return out;
}

/** Render one frame of a whole layer stack to a fresh 64×64 canvas (save previews, exports). */
export async function renderFrame(layers, motion, dir, frame = 0) {
    const sheets = await Promise.all(layers.map(l => {
        const c = resolveAnim(l, motion);
        return c ? loadSheet(l, c) : null;
    }));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    sheets.forEach(s => drawLayer(ctx, s, motion, dir, frame, 0, 0));
    return canvas;
}

/** Draw one frame of `motion` facing `dir` at (x, y). Returns false when nothing was drawn. */
export function drawLayer(ctx, sheet, motion, dir, frame, x, y) {
    if (!sheet) return false;
    const g = frameGeometry(motion, dir, sheet.w, sheet.h, sheet.activeCols);
    if (g.count <= 0 || sheet.emptyRows.has(g.row)) return false;
    const r = frameRect(g, frame);
    ctx.drawImage(sheet.canvas, r.sx, r.sy, r.sw, r.sh, x + r.dx, y + r.dy, r.sw, r.sh);
    return true;
}
