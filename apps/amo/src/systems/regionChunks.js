// Region streaming (W2): which 16×16-tile chunks are around the camera, and a
// streamer that builds and destroys their contents. Pure (no Phaser) —
// tools/test_region.mjs. GameScene feeds it the camera view each frame.

export const CHUNK = 16;
export const TILE_PX = 32;

export const chunkKey = (cx, cy) => `${cx},${cy}`;
export const chunkOfTile = (tx, ty, size = CHUNK) => ({ cx: Math.floor(tx / size), cy: Math.floor(ty / size) });

export function activeChunks(view, cols, rows, size = CHUNK, margin = 1, tilePx = TILE_PX) {
    const span = size * tilePx;
    const maxCx = Math.ceil(cols / size) - 1, maxCy = Math.ceil(rows / size) - 1;
    const cx0 = Math.max(0, Math.floor(view.x / span) - margin);
    const cy0 = Math.max(0, Math.floor(view.y / span) - margin);
    const cx1 = Math.min(maxCx, Math.floor((view.x + view.w - 1) / span) + margin);
    const cy1 = Math.min(maxCy, Math.floor((view.y + view.h - 1) / span) + margin);
    const out = new Set();
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) out.add(chunkKey(cx, cy));
    return out;
}

export function bucketByChunk(items, tileOf, size = CHUNK) {
    const out = new Map();
    for (const it of items ?? []) {
        const t = tileOf(it);
        const { cx, cy } = chunkOfTile(t.x, t.y, size);
        const k = chunkKey(cx, cy);
        if (!out.has(k)) out.set(k, []);
        out.get(k).push(it);
    }
    return out;
}

export function diffChunks(prev, next) {
    return { enter: [...next].filter(k => !prev.has(k)), leave: [...prev].filter(k => !next.has(k)) };
}

export class ChunkStreamer {
    // pad (px): keep built what the view grown by pad touches, instead of whole
    // chunks of margin — a small view then keeps 4 chunks, not 9–16.
    constructor({ cols, rows, size = CHUNK, margin = 1, tilePx = TILE_PX, pad = null }) {
        Object.assign(this, { cols, rows, size, margin, tilePx, pad });
        this._layers = [];
        this._built  = new Map();   // key → [{ layer, handles }]
        this._wanted = new Set();   // built or queued
        this._queue  = [];
        this.onEnter = null;
        this.onLeave = null;
    }

    addLayer(name, items, tileOf, create, destroy) {
        this._layers.push({ name, buckets: bucketByChunk(items, tileOf, this.size), create, destroy });
    }

    update(view, perFrame = 1) {
        const p = this.pad;
        const want   = p == null
            ? activeChunks(view, this.cols, this.rows, this.size, this.margin, this.tilePx)
            : activeChunks({ x: view.x - p, y: view.y - p, w: view.w + 2 * p, h: view.h + 2 * p }, this.cols, this.rows, this.size, 0, this.tilePx);
        const urgent = activeChunks(view, this.cols, this.rows, this.size, 0, this.tilePx);
        const { enter, leave } = diffChunks(this._wanted, want);
        for (const k of leave) this._unbuild(k);
        this._wanted = want;
        this._queue = this._queue.filter(k => want.has(k));
        this._queue.push(...enter);

        for (const k of this._queue) if (urgent.has(k)) this._build(k);
        this._queue = this._queue.filter(k => !this._built.has(k));

        if (perFrame > 0 && this._queue.length) {
            const span = this.size * this.tilePx;
            const vx = (view.x + view.w / 2) / span, vy = (view.y + view.h / 2) / span;
            const dist = k => { const [cx, cy] = k.split(',').map(Number); return (cx + 0.5 - vx) ** 2 + (cy + 0.5 - vy) ** 2; };
            this._queue.sort((a, b) => dist(a) - dist(b));
            for (const k of this._queue.splice(0, perFrame)) this._build(k);
        }
    }

    _build(k) {
        if (this._built.has(k)) return;
        const parts = this._layers.map(layer => ({ layer, handles: (layer.buckets.get(k) ?? []).map(it => layer.create(it)) }));
        this._built.set(k, parts);
        this.onEnter?.(k);
    }

    _unbuild(k) {
        const parts = this._built.get(k);
        if (!parts) { this._queue = this._queue.filter(q => q !== k); return; }
        this.onLeave?.(k);
        for (const { layer, handles } of parts) for (const h of handles) layer.destroy(h);
        this._built.delete(k);
    }

    isActive(k) { return this._built.has(k); }
    isTileActive(tx, ty) { const { cx, cy } = chunkOfTile(tx, ty, this.size); return this._built.has(chunkKey(cx, cy)); }
    isPxActive(x, y) { return this.isTileActive(Math.floor(x / this.tilePx), Math.floor(y / this.tilePx)); }
    builtCount() { return this._built.size; }
    queuedCount() { return this._queue.length; }
    handleCount() { let n = 0; for (const parts of this._built.values()) for (const p of parts) n += p.handles.length; return n; }

    destroyAll() {
        for (const k of [...this._built.keys()]) this._unbuild(k);
        this._wanted = new Set();
        this._queue = [];
    }
}
