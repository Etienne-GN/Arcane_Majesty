/**
 * Browser-side sheet loading for Forge v2: fetch a layer's PNG from the game's
 * library (/lpc/...), apply its palette swap, remember which direction rows are
 * empty, and draw single frames. Misses are cached as null so a missing file is
 * requested once, never on every tick.
 */
import { animPath } from '@game/systems/lpcLayout.js';
import { remapPixels } from '@game/systems/lpcPalettes.js';
import { resolveAnim } from '@game/systems/animResolve.js';
import { resolveMotion } from '@game/systems/motionRules.js';
import { frameGeometry, frameRect, frameSizeOf, sheetFrame } from './frames.js';
import { Lru } from './lru.js';

// key → Promise<Sheet|null>. Bounded: the full grid (15 motions × ~10 layers)
// plus a slot's picker thumbnails fit; older tints are dropped and rebuilt on demand.
const cache = new Lru(300);

function swapKey(sp) { return sp ? `${sp.sourceKey}:${sp.tintName}` : ''; }

// Workshop: the sheet being drawn stands in for its file (by path, without the
// leading slash), with a version bumped on every edit; custom sheets carry their
// save time in the URL so a re-save is never served from the browser cache.
const overrides = new Map();   // 'lpc_custom/…png' → { source: canvas, version }
const stamps = new Map();      // 'weapon/…/run/bg.png' → updatedAt

export function setSheetOverride(path, source) {
    const prev = overrides.get(path);
    for (const k of [...cache.map.keys()]) if (k.startsWith(`override:${path}|`)) cache.delete(k);
    if (source) overrides.set(path, { source, version: (prev?.version ?? 0) + 1 });
    else overrides.delete(path);
}

/** Record the custom manifest's save times (cache busting) and drop sheets whose file changed. */
export function setCustomStamps(manifest) {
    for (const [rel, m] of Object.entries(manifest)) {
        if (stamps.get(rel) !== m.updatedAt) invalidateSheet(rel);
        stamps.set(rel, m.updatedAt);
    }
    for (const rel of [...stamps.keys()]) if (!manifest[rel]) { stamps.delete(rel); invalidateSheet(rel); }
}

/** Forget every cached tint of a sheet (library or custom), by library-relative path. */
export function invalidateSheet(rel) {
    for (const k of [...cache.map.keys()]) {
        if (k.startsWith(`/lpc/${rel}|`) || k.startsWith(`/lpc_custom/${rel}|`)) cache.delete(k);
    }
}

/** Sheet = { canvas, w, h, emptyRows:Set<number>, activeCols:number } — or null when the PNG is missing/broken. */
export function loadSheet(layer, concrete) {
    const rel = animPath(layer, concrete);
    const ov = overrides.get(rel);
    if (ov) {
        const key = `override:${rel}|${ov.version}|${swapKey(layer.swapParams)}`;
        if (!cache.has(key)) cache.set(key, Promise.resolve(fromSource(ov.source, layer.swapParams)));
        return cache.get(key);
    }
    const path = '/' + rel;
    const key = path + '|' + swapKey(layer.swapParams);
    const stamp = rel.startsWith('lpc_custom/') ? stamps.get(rel.slice('lpc_custom/'.length)) : null;
    if (!cache.has(key)) cache.set(key, build(stamp ? `${path}?v=${encodeURIComponent(stamp)}` : path, layer.swapParams));
    return cache.get(key);
}

async function build(path, swap) {
    const img = new Image();
    img.src = path;
    try { await img.decode(); } catch { return null; }
    return fromSource(img, swap);
}

/** Sheet from a decoded image or canvas, palette-swapped like the game does it. */
function fromSource(img, swap) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth ?? img.width;
    canvas.height = img.naturalHeight ?? img.height;
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
export async function renderFrame(layers, motion, dir, frame = 0, rules = {}, overrides) {
    const plans = await Promise.all(layers.map(l => layerPlan(l, motion, rules, overrides)));
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    plans.forEach(p => { if (p.sheet) drawLayer(ctx, p.sheet, p.concrete, dir, frame, 0, 0, p.mode === 'borrow' ? motion : undefined); });
    return canvas;
}

/**
 * How a layer is drawn in a motion, as the game does it: { mode, concrete, sheet }.
 * mode: own | fallback (walk frames) | borrow (retimed) | hide | missing.
 * A file the rules expect but the library lacks falls back to walk, like the game.
 */
export async function layerPlan(layer, motion, rules = {}, overrides) {
    const res = resolveMotion(layer, motion, rules, overrides);
    if (res.mode === 'hide') return { mode: 'hide', concrete: null, sheet: null };
    const sheet = await loadSheet(layer, res.concrete);
    if (sheet) return { mode: res.mode, concrete: res.concrete, sheet };
    const walk = resolveAnim(layer, 'walk') ?? 'walk';
    const ws = walk === res.concrete ? null : await loadSheet(layer, walk);
    return ws ? { mode: 'fallback', concrete: walk, sheet: ws } : { mode: 'missing', concrete: null, sheet: null };
}

/**
 * Draw play index `frame` of a sheet holding the concrete anim `anim`, facing
 * `dir`, at (x, y). `retimeTo` (a borrowed layer) resamples the sheet to that
 * motion's length. Returns false when nothing was drawn (empty direction row).
 */
export function drawLayer(ctx, sheet, anim, dir, frame, x, y, retimeTo) {
    if (!sheet) return false;
    const g = frameGeometry(anim, dir, sheet.w, sheet.h, sheet.activeCols);
    if (g.count <= 0 || sheet.emptyRows.has(g.row)) return false;
    const r = frameRect(g, sheetFrame(g, frame, retimeTo));
    ctx.drawImage(sheet.canvas, r.sx, r.sy, r.sw, r.sh, x + r.dx, y + r.dy, r.sw, r.sh);
    return true;
}
