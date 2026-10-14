/**
 * Motion workshop model (pure): working-sheet geometry, starting drafts
 * (retimed from another motion, or pose-fitted to the body), palette and
 * colour mapping, undo history. Images are { w, h, data: Uint8ClampedArray }
 * RGBA, so all of it runs in Node tests and on canvas ImageData alike.
 */
import { MOTION_FRAMES, walkSkip } from '../../../../../amo/src/systems/lpcLayout.js';
import { frameMap } from '../../../../../amo/src/systems/motionRules.js';

const ONE_ROW = { hurt: 'down', climb: 'up' };   // single-row sheets and the direction they face
const DIRS = ['up', 'left', 'down', 'right'];
const ALPHA = 8;                                  // the renderer's "opaque" threshold

/** Geometry of a sheet we author: { motion, fs, rows, cols, skip, w, h } (walk keeps its standing column). */
export function sheetSpec(motion, fs = 64) {
    const rows = ONE_ROW[motion] ? 1 : 4;
    const skip = motion === 'walk' ? 1 : 0;
    const cols = (MOTION_FRAMES[motion] ?? 1) + skip;
    return { motion, fs, rows, cols, skip, w: cols * fs, h: rows * fs };
}

/** Geometry of an existing w×h sheet holding `motion` (library or custom). */
export function specOf(motion, w, h) {
    let fs = h;
    for (const s of [64, 128, 192, 256]) if (h === s * 4 && w % s === 0) { fs = s; break; }
    const cols = Math.floor(w / fs);
    return { motion, fs, rows: Math.round(h / fs), cols, skip: walkSkip(motion, cols), w, h };
}

/** Why a w×h image can't be the working sheet (null = fits). */
export function sizeError(w, h, spec) {
    if (w === spec.w && h === spec.h) return null;
    return `Expected ${spec.w}×${spec.h} (${spec.cols} frames × ${spec.rows} row${spec.rows > 1 ? 's' : ''} of ${spec.fs} px), got ${w}×${h}.`;
}

export function blankSheet(spec) {
    return { w: spec.w, h: spec.h, data: new Uint8ClampedArray(spec.w * spec.h * 4) };
}

export function getFrame(img, spec, row, col) {
    const fs = spec.fs, out = { w: fs, h: fs, data: new Uint8ClampedArray(fs * fs * 4) };
    for (let y = 0; y < fs; y++) {
        const s = ((row * fs + y) * img.w + col * fs) * 4;
        out.data.set(img.data.subarray(s, s + fs * 4), y * fs * 4);
    }
    return out;
}

export function putFrame(img, spec, row, col, frame) {
    const fs = spec.fs;
    for (let y = 0; y < fs; y++) {
        const d = ((row * fs + y) * img.w + col * fs) * 4;
        img.data.set(frame.data.subarray(y * fs * 4, (y + 1) * fs * 4), d);
    }
}

/** A frame re-centred onto an fs×fs cell (oversize art is centred on its 64 px cell, like the game). */
function fitFrame(frame, fs) {
    if (frame.w === fs) return frame;
    return shiftFrame(frame, (fs - frame.w) / 2, (fs - frame.h) / 2, fs);
}

/** Frame moved by (dx, dy); pixels leaving the frame are cut. `size` resizes the canvas (top-left anchored). */
export function shiftFrame(frame, dx, dy, size = frame.w) {
    const out = { w: size, h: size, data: new Uint8ClampedArray(size * size * 4) };
    for (let y = 0; y < frame.h; y++) {
        const ty = y + dy;
        if (ty < 0 || ty >= size) continue;
        for (let x = 0; x < frame.w; x++) {
            const tx = x + dx;
            if (tx < 0 || tx >= size) continue;
            const s = (y * frame.w + x) * 4, d = (ty * size + tx) * 4;
            out.data[d] = frame.data[s]; out.data[d + 1] = frame.data[s + 1];
            out.data[d + 2] = frame.data[s + 2]; out.data[d + 3] = frame.data[s + 3];
        }
    }
    return out;
}

/** Source row for target row r: same direction, or the one-row sheet's single row / facing. */
function sourceRow(srcSpec, dstSpec, r) {
    if (srcSpec.rows === 1) return 0;
    if (dstSpec.rows === 1) return DIRS.indexOf(ONE_ROW[dstSpec.motion] ?? 'down');
    return r;
}

/** For each target (row, playable frame i): the source (row, column) it is drafted from. */
function draftPlan(srcSpec, dstSpec) {
    const n = dstSpec.cols - dstSpec.skip;
    const map = frameMap(srcSpec.cols - srcSpec.skip, n);
    const out = [];
    for (let r = 0; r < dstSpec.rows; r++) {
        for (let i = 0; i < n; i++) out.push({ r, i, sr: sourceRow(srcSpec, dstSpec, r), sc: srcSpec.skip + map[i] });
    }
    return out;
}

/** A walk target's standing column is a copy of its first playable frame. */
function fillStanding(img, spec) {
    if (!spec.skip) return img;
    for (let r = 0; r < spec.rows; r++) putFrame(img, spec, r, 0, getFrame(img, spec, r, 1));
    return img;
}

/** Draft = another motion's frames, retimed to the target's frame count. */
export function retimeDraft(src, srcSpec, dstSpec) {
    const out = blankSheet(dstSpec);
    for (const p of draftPlan(srcSpec, dstSpec)) {
        putFrame(out, dstSpec, p.r, dstSpec.skip + p.i, fitFrame(getFrame(src, srcSpec, p.sr, p.sc), dstSpec.fs));
    }
    return fillStanding(out, dstSpec);
}

function mask(f) {
    const m = new Uint8Array(f.w * f.h);
    for (let i = 0; i < m.length; i++) m[i] = f.data[i * 4 + 3] > ALPHA ? 1 : 0;
    return m;
}

/** The shift of frame a (±max px) that best overlaps its opaque pixels with b's; ties keep the smallest move. */
export function silhouetteOffset(a, b, max = 8) {
    const ma = mask(a), mb = mask(b), w = a.w, h = a.h;
    const pts = [];
    for (let i = 0; i < ma.length; i++) if (ma[i]) pts.push(i);
    if (!pts.length) return { dx: 0, dy: 0 };
    let best = { dx: 0, dy: 0, score: -1, dist: 0 };
    for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
        let score = 0;
        for (const i of pts) {
            const x = (i % w) + dx, y = Math.floor(i / w) + dy;
            if (x >= 0 && x < w && y >= 0 && y < h && mb[y * w + x]) score++;
        }
        const dist = Math.abs(dx) + Math.abs(dy);
        if (score > best.score || (score === best.score && dist < best.dist)) best = { dx, dy, score, dist };
    }
    return { dx: best.dx, dy: best.dy };
}

/**
 * Draft for held/worn items: each target frame takes the retimed source frame,
 * shifted by how far the body moved between its source and target frames
 * (silhouette match) — follows the body's bob and lean; arm swing is hand work.
 */
export function poseFitDraft(itemSrc, itemSpec, bodySrc, bodySrcSpec, bodyDst, dstSpec) {
    const out = blankSheet(dstSpec);
    const bodyDstSpec = specOf(dstSpec.motion, bodyDst.w, bodyDst.h);
    const bodyPlan = draftPlan(bodySrcSpec, dstSpec);   // same (r, i) order as the item's plan
    draftPlan(itemSpec, dstSpec).forEach((p, k) => {
        const item = fitFrame(getFrame(itemSrc, itemSpec, p.sr, p.sc), dstSpec.fs);
        const bp = bodyPlan[k];
        const bA = getFrame(bodySrc, bodySrcSpec, bp.sr, bp.sc);
        const bB = getFrame(bodyDst, bodyDstSpec, Math.min(p.r, bodyDstSpec.rows - 1), bodyDstSpec.skip + p.i);
        const { dx, dy } = silhouetteOffset(bA, bB);
        putFrame(out, dstSpec, p.r, dstSpec.skip + p.i, shiftFrame(item, dx, dy));
    });
    return fillStanding(out, dstSpec);
}

const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

/** Opaque colours of an image, darkest first (the `max` most frequent when there are more). */
export function paletteOf(img, max = 32) {
    const counts = new Map();
    for (let i = 0; i < img.data.length; i += 4) {
        if (img.data[i + 3] <= ALPHA) continue;
        const k = (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2];
        counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max)
        .map(([k]) => [(k >> 16) & 255, (k >> 8) & 255, k & 255]).sort((a, b) => lum(a) - lum(b));
}

const rgbaKey = (d, i) => ((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0;

/** Colour correspondence between two same-shaped images (e.g. one item's walk sheet in two colours). */
export function colourMap(fromImg, toImg) {
    const votes = new Map();
    for (let i = 0; i < fromImg.data.length; i += 4) {
        if (fromImg.data[i + 3] <= ALPHA || toImg.data[i + 3] <= ALPHA) continue;
        const f = rgbaKey(fromImg.data, i), t = rgbaKey(toImg.data, i);
        const v = votes.get(f) ?? new Map();
        v.set(t, (v.get(t) ?? 0) + 1);
        votes.set(f, v);
    }
    const out = new Map();
    for (const [f, v] of votes) out.set(f, [...v.entries()].sort((a, b) => b[1] - a[1])[0][0]);
    return out;
}

/** Image recoloured through a colourMap; colours it never saw take their nearest mapped colour's target. */
export function applyColourMap(img, map) {
    const keys = [...map.keys()];
    const near = new Map();
    const out = { w: img.w, h: img.h, data: new Uint8ClampedArray(img.data) };
    for (let i = 0; i < out.data.length; i += 4) {
        if (out.data[i + 3] <= ALPHA || !keys.length) continue;
        const k = rgbaKey(out.data, i);
        let t = map.get(k);
        if (t === undefined) {
            if (!near.has(k)) {
                const [r, g, b] = [out.data[i], out.data[i + 1], out.data[i + 2]];
                let best = keys[0], bd = Infinity;
                for (const c of keys) {
                    const d = (r - (c >>> 24)) ** 2 + (g - ((c >>> 16) & 255)) ** 2 + (b - ((c >>> 8) & 255)) ** 2;
                    if (d < bd) { bd = d; best = c; }
                }
                near.set(k, map.get(best));
            }
            t = near.get(k);
        }
        out.data[i] = t >>> 24; out.data[i + 1] = (t >>> 16) & 255; out.data[i + 2] = (t >>> 8) & 255;
        out.data[i + 3] = Math.min(out.data[i + 3], t & 255);
    }
    return out;
}

/** Undo/redo of whole states (callers pass copies). */
export class History {
    constructor(limit = 100) { this.limit = limit; this.past = []; this.future = []; }
    /** Record the state as it was before a change. */
    push(state) {
        this.past.push(state);
        if (this.past.length > this.limit) this.past.shift();
        this.future = [];
    }
    undo(current) {
        if (!this.past.length) return current;
        this.future.push(current);
        return this.past.pop();
    }
    redo(current) {
        if (!this.future.length) return current;
        this.past.push(current);
        return this.future.pop();
    }
    get canUndo() { return this.past.length > 0; }
    get canRedo() { return this.future.length > 0; }
}
