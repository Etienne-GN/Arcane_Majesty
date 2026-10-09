/**
 * Browser-side sheet loading for Forge v2: fetch a layer's PNG from the game's
 * library (/lpc/...), apply its palette swap, remember which direction rows are
 * empty, and draw single frames. Misses are cached as null so a missing file is
 * requested once, never on every tick.
 */
import { animPath } from '@game/systems/lpcLayout.js';
import { remapPixels } from '@game/systems/lpcPalettes.js';
import { frameGeometry, frameRect, frameSizeOf } from './frames.js';

const cache = new Map(); // key → Promise<Sheet|null>

function swapKey(sp) { return sp ? `${sp.sourceKey}:${sp.tintName}` : ''; }

/** Sheet = { canvas, w, h, emptyRows:Set<number> } — or null when the PNG is missing/broken. */
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
    return { canvas, w: canvas.width, h: canvas.height, emptyRows: emptyRows(data, frameSizeOf(canvas.width, canvas.height)) };
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

/** Draw one frame of `motion` facing `dir` at (x, y). Returns false when nothing was drawn. */
export function drawLayer(ctx, sheet, motion, dir, frame, x, y) {
    if (!sheet) return false;
    const g = frameGeometry(motion, dir, sheet.w, sheet.h);
    if (g.count <= 0 || sheet.emptyRows.has(g.row)) return false;
    const r = frameRect(g, frame);
    ctx.drawImage(sheet.canvas, r.sx, r.sy, r.sw, r.sh, x + r.dx, y + r.dy, r.sw, r.sh);
    return true;
}
