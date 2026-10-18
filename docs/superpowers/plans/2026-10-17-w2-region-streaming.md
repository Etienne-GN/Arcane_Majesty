# W2 Region Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Maps of 256×256 tiles and more play at a steady frame rate. Trees, decorations and enemies exist as game objects only in 16×16-tile chunks around the camera. Large maps are stored in a compact region format.

**Architecture:**
- **Storage:** a region is a compact JS data module (base64 tile grid, decoration tuples). `decodeRegion()` turns it into an ordinary map definition at import, so `getMap()` and every consumer of it work as they do today: the server, the tests, the minimap, the manual generator.
- **Streaming:** a pure `ChunkStreamer` decides which chunks are active and builds or destroys their contents. GameScene applies it to every map:
  - tree visuals and catalogue decorations, with their collision bodies;
  - offline enemies, which sleep and wake keeping their HP, level and elite affixes.
- **Collision:** tree collision moves from one static body per tree to one invisible tilemap collision layer.

**Tech Stack:** Phaser 3.90 (Arcade physics, tilemaps), plain ES modules, Python 3 generators (`tools/maps/`), Node `assert` tests, headless checks via `../tool_suite/lpc_forge/tools/console.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-17-world-scale-design.md` (section W2)

**Depends on:** W1 (`docs/superpowers/plans/2026-10-17-w1-movement.md`) being merged: this plan edits `GameScene._hopBlockedAt` and uses `hopGroup` / `hopCells`.

## Global Constraints

- Every new save field gets a default in `PlayerStats` (constructor and `reset()`), and old saves load without errors. (W2 adds no save fields.)
- Every pure module gets a `tools/test_*.mjs` test chained into `npm test`.
- Every system is checked headless in the running game via `tools/console.mjs` and `window.__game` before it is called done.
- Existing maps keep working unchanged at every step; `npm test` stays green.
- Performance budget (checked headless on a 256×256 test region):
  - at most 2,500 active display objects;
  - no frame over 20 ms while walking across chunk borders at sprint speed;
  - region data at most 3 MB for 256×256.
- Commits go straight to `main`.
- Work from `apps/amo` (paths are relative to it unless they start with `docs/`).

## Rulings against the spec (made while planning)

- **Regions are JS data modules, not `public/regions/<id>/region.json`.** Many callers use `getMap()` synchronously: the server, about 10 test files, the minimap, the manual generator and the campaign checks. A JSON fetched in `preload` would break all of them. A compact module decoded at import keeps them all working. Cost: region bytes ship in the JS bundle; switching to dynamic `import()` later is a local change in `maps/index.js`.
- **Every map is streamed directly**, so `regionFromMap` is not needed. The streamer runs on any map definition; a 14×10 map is simply one chunk. A decoded region *is* a map definition.
- **Small spawn kinds stay built at load:** signs, chests, gathering nodes, campfires, cracked boulders, stations, boards, NPCs and the boss. Even on a large region they number in the tens to low hundreds, well under the 2,500-object budget, and they carry state that many code paths read from their groups. Streaming them can follow if the budget says so.
- **Online play does not stream enemies.** The server owns enemy indices (`netId`). Streaming is offline-only, per the spec's single-player-first decision.
- **The Tiled import path** (`_buildWorldFromTiled`, used only by `samplemap`) is untouched.

## Review Focus

1. **Teleports within a map** (Blink-Step, a rift-gate fast travel, Aetheric Tear): the view jumps several chunks and must never show an empty world. The streamer builds every chunk inside the view at once and queues only the margin. Pinned in Task 1 (`urgent` chunks built in the same update) and in Task 4's headless teleport check.
2. **A creature chasing the player** across a chunk border must never vanish mid-fight. Sleep skips `chase` and `attack` states. Pinned in Task 5's headless check.
3. **A creature that slept and woke** keeps its HP, level and elite affixes, and does not re-roll an elite. Pinned in Task 5's headless check.
4. **A hop next to a tree** must still be refused, now that trees are tilemap tiles and not bodies. Pinned in Task 4's headless check (W1's in-place hop against a tree, re-run).
5. **Maps with no trees, or no decorations** (most interiors) must load without errors. Pinned in Task 4's smoke load of `hermit_hut`.

---

### Task 1: Chunk maths and the streamer (pure)

**Files:**
- Create: `src/systems/regionChunks.js`
- Test: `tools/test_region.mjs`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `CHUNK = 16`, `TILE_PX = 32`
  - `chunkKey(cx, cy) → "cx,cy"`
  - `chunkOfTile(tx, ty, size = CHUNK) → { cx, cy }`
  - `activeChunks(view: {x, y, w, h} (px), cols, rows, size = CHUNK, margin = 1, tilePx = TILE_PX) → Set<string>`
  - `bucketByChunk(items, tileOf: item → {x, y}, size = CHUNK) → Map<string, item[]>`
  - `diffChunks(prev: Set, next: Set) → { enter: string[], leave: string[] }`
  - `class ChunkStreamer({ cols, rows, size = CHUNK, margin = 1, tilePx = TILE_PX })`:
    - `.addLayer(name, items, tileOf, create: item → handle, destroy: handle → void)`
    - `.update(view, perFrame = 1)`: builds every wanted chunk that touches `view` at once, then up to `perFrame` margin chunks, nearest first; destroys chunks that left.
    - `.onEnter: (key) => void | null`, `.onLeave: (key) => void | null`: called after a chunk is built, and before it is destroyed.
    - `.isActive(key) → boolean` (built), `.isTileActive(tx, ty) → boolean`, `.isPxActive(x, y) → boolean`
    - `.builtCount() → number`, `.queuedCount() → number`, `.handleCount() → number`
    - `.destroyAll()`

- [ ] **Step 1: Write the failing test**

Create `tools/test_region.mjs`:

```js
// W2 region streaming: chunk maths, the streamer, the region format.
// Run: node tools/test_region.mjs
import assert from 'node:assert';

const R = await import('../src/systems/regionChunks.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };
const sorted = s => [...s].sort();

// ---- Chunk maths
{
    eq(R.CHUNK, 16, '16-tile chunks');
    eq(R.chunkKey(3, 4), '3,4', 'key');
    eq(R.chunkOfTile(0, 0), { cx: 0, cy: 0 }, 'origin');
    eq(R.chunkOfTile(15, 16), { cx: 0, cy: 1 }, 'tile 15 is chunk 0, tile 16 chunk 1');

    // 64×64 tiles = 4×4 chunks of 512 px. A 320×224 view at (600, 600) touches only chunk 1,1.
    const view = { x: 600, y: 600, w: 320, h: 224 };
    eq(sorted(R.activeChunks(view, 64, 64, 16, 0)), ['1,1'], 'the view alone');
    eq(R.activeChunks(view, 64, 64, 16, 1).size, 9, 'one chunk of margin around it');
    eq(sorted(R.activeChunks({ x: 0, y: 0, w: 320, h: 224 }, 64, 64, 16, 1)), ['0,0', '0,1', '1,0', '1,1'], 'clamped at the map edge');
    eq(sorted(R.activeChunks({ x: 0, y: 0, w: 448, h: 320 }, 14, 10, 16, 1)), ['0,0'], 'a 14×10 map is one chunk');
    eq(sorted(R.activeChunks({ x: 500, y: 0, w: 30, h: 30 }, 64, 64, 16, 0)), ['0,0', '1,0'], 'a view across a border touches both');

    const b = R.bucketByChunk([{ x: 1, y: 1 }, { x: 17, y: 2 }, { x: 3, y: 15 }], it => it);
    eq(b.get('0,0').length, 2, 'bucketed by tile');
    eq(b.get('1,0').length, 1, 'next chunk');

    eq(R.diffChunks(new Set(['a', 'b']), new Set(['b', 'c'])), { enter: ['c'], leave: ['a'] }, 'diff');
}

// ---- The streamer
{
    const log = [];
    const s = new R.ChunkStreamer({ cols: 64, rows: 64 });
    const items = [];
    for (let y = 0; y < 64; y += 4) for (let x = 0; x < 64; x += 4) items.push({ x, y });
    let live = 0;
    s.addLayer('dots', items, it => it, it => { live++; return { it }; }, () => { live--; });
    s.onEnter = k => log.push(`+${k}`);
    s.onLeave = k => log.push(`-${k}`);

    const view = { x: 600, y: 600, w: 320, h: 224 };     // chunk 1,1
    s.update(view, 0);
    ok(s.isActive('1,1'), 'the chunk under the view is built at once (urgent)');
    eq(s.builtCount(), 1, 'margin chunks wait (perFrame 0)');
    eq(s.queuedCount(), 8, 'eight margin chunks queued');
    eq(live, 16, '16 dots in a chunk');
    ok(s.isTileActive(20, 20) && !s.isTileActive(5, 5), 'isTileActive follows built chunks');
    ok(s.isPxActive(600, 600) && !s.isPxActive(10, 10), 'isPxActive');

    s.update(view, 1);
    eq(s.builtCount(), 2, 'one margin chunk per frame');
    s.update(view, 100);
    eq(s.builtCount(), 9, 'all built');
    eq(s.queuedCount(), 0, 'queue drained');
    eq(live, 9 * 16, 'handles created per chunk');
    eq(s.handleCount(), 9 * 16, 'handleCount');

    // Teleport across the map: the new view's chunk is built in the same update.
    log.length = 0;
    s.update({ x: 1700, y: 1700, w: 320, h: 224 }, 0);   // chunk 3,3
    ok(s.isActive('3,3'), 'teleport target built immediately');
    ok(!s.isActive('0,0') && !s.isActive('1,1'), 'old chunks destroyed');
    ok(log.includes('-1,1') && log.includes('+3,3'), 'onLeave / onEnter fired');
    ok(log.indexOf('-1,1') < log.indexOf('+3,3'), 'leaves before enters');
    eq(live, s.builtCount() * 16, 'no leaked handles');

    // A queued chunk that leaves before being built never fires onEnter or onLeave.
    log.length = 0;
    const s2 = new R.ChunkStreamer({ cols: 64, rows: 64 });
    s2.addLayer('dots', items, it => it, () => ({}), () => {});
    s2.onEnter = k => log.push(`+${k}`); s2.onLeave = k => log.push(`-${k}`);
    s2.update(view, 0);
    s2.update({ x: 1700, y: 1700, w: 320, h: 224 }, 0);
    ok(!log.some(e => e === '+0,0' || e === '-0,0'), 'never-built chunks are silent');

    // Nearest margin chunk first.
    const s3 = new R.ChunkStreamer({ cols: 64, rows: 64 });
    s3.addLayer('dots', items, it => it, () => ({}), () => {});
    s3.update({ x: 1000, y: 600, w: 20, h: 20 }, 0);     // chunk 1,1, right half
    s3.update({ x: 1000, y: 600, w: 20, h: 20 }, 1);
    ok(s3.isActive('2,1'), 'the nearest margin chunk (east, the view sits by its edge) comes first');

    s.destroyAll();
    eq([s.builtCount(), live], [0, 0], 'destroyAll');
}

console.log(`test_region: ${n} checks passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test_region.mjs`
Expected: FAIL with `Cannot find module '.../src/systems/regionChunks.js'`

- [ ] **Step 3: Write the implementation**

Create `src/systems/regionChunks.js`:

```js
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
    constructor({ cols, rows, size = CHUNK, margin = 1, tilePx = TILE_PX }) {
        Object.assign(this, { cols, rows, size, margin, tilePx });
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
        const want   = activeChunks(view, this.cols, this.rows, this.size, this.margin, this.tilePx);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tools/test_region.mjs`
Expected: `test_region: <N> checks passed`

- [ ] **Step 5: Chain into `npm test`**

In `package.json`'s `"test"` script, insert `node tools/test_region.mjs && ` right after `node tools/test_movement.mjs && `.

Run: `npm test 2>&1 | tail -3`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/systems/regionChunks.js tools/test_region.mjs package.json
git commit -m "feat(amo): chunk streamer — builds what is around the camera, nearest first, teleport-safe"
```

---

### Task 2: The region format (decode in JS, write in Python)

**Files:**
- Create: `src/systems/regionFormat.js`
- Create: `tools/maps/region_writer.py`
- Create: `tools/maps/test_region_writer.py`
- Test: `tools/test_region.mjs` (append)
- Modify: `package.json` (`test` script)

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - JS: `encodeGrid(rows: number[][]) → string`, `decodeGrid(b64, w, h) → number[][]`, `encodeBits(cells: [x,y][], w, h) → string`, `decodeBitsToCells(b64, w, h) → [x,y][]`, `decodeRegion(raw) → mapDef`.
  - Raw region module shape (format 1): `{ format: 1, id, width, height, tiles: b64, hop: b64|null, sheets: [{ texKey, catKey, png, cat, scale }], names: string[], deco: [sheetIdx, nameIdx, x, y, flags, depthOffset?][], ...any other mapDef fields }`. Flags: `1` blocking true, `2` blocking false, `4` hoppable true, `8` hoppable false.
  - Decoded mapDef adds: `tiles` (2D), `extraSheets` (deduplicated by `texKey`), `sheetDecorations` (one group per sheet+scale), `hopCells` (W1 field), `region: true`.
  - Python: `write_region(out_path, *, id, tiles, sm, fields, hop_cells=(), header='')`, where `sm` is a `sheetmap.SheetMap`.

- [ ] **Step 1: Write the failing JS test** (append before the final `console.log` of `tools/test_region.mjs`)

```js
// ---- Region format
{
    const F = await import('../src/systems/regionFormat.js');
    const rows = [[0, 1, 2], [3, 4, 5]];
    eq(F.decodeGrid(F.encodeGrid(rows), 3, 2), rows, 'grid round-trip');
    const cells = [[0, 0], [2, 1], [1, 1]];
    eq(F.decodeBitsToCells(F.encodeBits(cells, 3, 2), 3, 2).sort(), cells.slice().sort(), 'bitset round-trip');

    const raw = {
        format: 1, id: 'tiny', displayName: 'Tiny', width: 3, height: 2,
        tiles: F.encodeGrid(rows), hop: F.encodeBits([[2, 1]], 3, 2),
        sheets: [
            { texKey: 'tm_a', catKey: 'tm_a_cat', png: 'a.png', cat: 'a.json', scale: 1 },
            { texKey: 'tm_a', catKey: 'tm_a_cat', png: 'a.png', cat: 'a.json', scale: 2 },
        ],
        names: ['rock', 'fence_wood_up_down'],
        deco: [[0, 0, 1, 0, 1], [0, 1, 2, 1, 2 | 8, 5], [1, 0, 0, 1, 0]],
        playerStart: { x: 0, y: 0 }, spawns: { enemies: [] }, portals: [],
    };
    const m = F.decodeRegion(raw);
    eq(m.tiles, rows, 'tiles decoded');
    eq([m.id, m.displayName, m.region], ['tiny', 'Tiny', true], 'fields kept, region flag');
    eq(m.extraSheets, [{ texKey: 'tm_a', catKey: 'tm_a_cat', png: 'a.png', cat: 'a.json' }], 'one load per texture');
    eq(m.sheetDecorations.length, 2, 'one group per sheet+scale');
    eq(m.sheetDecorations[0].items, [
        { name: 'rock', x: 1, y: 0, blocking: true },
        { name: 'fence_wood_up_down', x: 2, y: 1, blocking: false, hoppable: false, depthOffset: 5 },
    ], 'flags and depth offset decoded');
    eq(m.sheetDecorations[1], { texKey: 'tm_a', catKey: 'tm_a_cat', scale: 2, items: [{ name: 'rock', x: 0, y: 1 }] }, 'scaled group');
    eq(m.hopCells, [[2, 1]], 'hop cells');
    ok(!('deco' in m) && !('names' in m) && !('sheets' in m), 'packed fields are not left on the map');
    assert.throws(() => F.decodeRegion({ ...raw, format: 2 }), /format/); n++;
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/test_region.mjs`
Expected: FAIL with `Cannot find module '.../src/systems/regionFormat.js'`

- [ ] **Step 3: Implement `src/systems/regionFormat.js`**

```js
// Region format 1 (W2): a big map stored compactly — base64 tile grid, a hop
// bitset, decoration tuples — decoded once at import into an ordinary map
// definition, so getMap() and everything that reads maps keep working.
// Written by tools/maps/region_writer.py. Pure — tools/test_region.mjs.

const toB64   = bytes => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };
const fromB64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

export function encodeGrid(rows) {
    const w = rows[0].length, out = new Uint8Array(w * rows.length);
    rows.forEach((r, y) => r.forEach((v, x) => { out[y * w + x] = v; }));
    return toB64(out);
}

export function decodeGrid(b64, w, h) {
    const bytes = fromB64(b64);
    return Array.from({ length: h }, (_, y) => Array.from(bytes.subarray(y * w, y * w + w)));
}

// Bit i = y * w + x, least significant bit first.
export function encodeBits(cells, w, h) {
    const out = new Uint8Array(Math.ceil(w * h / 8));
    for (const [x, y] of cells) { const i = y * w + x; out[i >> 3] |= 1 << (i & 7); }
    return toB64(out);
}

export function decodeBitsToCells(b64, w, h) {
    const bytes = fromB64(b64), cells = [];
    for (let i = 0; i < w * h; i++) if (bytes[i >> 3] & (1 << (i & 7))) cells.push([i % w, Math.floor(i / w)]);
    return cells;
}

export function decodeRegion(raw) {
    if (raw.format !== 1) throw new Error(`region ${raw.id}: unknown format ${raw.format}`);
    const { format, width, height, tiles, hop, sheets, names, deco, ...rest } = raw;
    const groups = sheets.map(s => ({ texKey: s.texKey, catKey: s.catKey, scale: s.scale ?? 1, items: [] }));
    for (const [si, ni, x, y, flags, depthOffset] of deco) {
        const it = { name: names[ni], x, y };
        if (flags & 1) it.blocking = true;
        if (flags & 2) it.blocking = false;
        if (flags & 4) it.hoppable = true;
        if (flags & 8) it.hoppable = false;
        if (depthOffset) it.depthOffset = depthOffset;
        groups[si].items.push(it);
    }
    const extraSheets = [];
    for (const s of sheets) {
        if (!extraSheets.some(e => e.texKey === s.texKey)) extraSheets.push({ texKey: s.texKey, catKey: s.catKey, png: s.png, cat: s.cat });
    }
    return {
        ...rest,
        region: true,
        tiles: decodeGrid(tiles, width, height),
        extraSheets,
        sheetDecorations: groups.filter(g => g.items.length),
        hopCells: [...(rest.hopCells ?? []), ...(hop ? decodeBitsToCells(hop, width, height) : [])],
    };
}
```

- [ ] **Step 4: Run the JS test**

Run: `node tools/test_region.mjs`
Expected: passes.

- [ ] **Step 5: Write the failing Python test**

Create `tools/maps/test_region_writer.py`:

```python
"""Round-trip check for region_writer (W2). Run from apps/amo: python3 tools/maps/test_region_writer.py"""
import base64
import json
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from region_writer import write_region, pack_tiles  # noqa: E402
from sheetmap import SheetMap  # noqa: E402

BC = 'SampleMap/[Base]BaseChip_pipo'

tiles = [[0, 1, 2], [3, 1, 0]]
assert base64.b64decode(pack_tiles(tiles)) == bytes([0, 1, 2, 3, 1, 0]), 'tiles packed row-major'

sm = SheetMap()
sm.add(BC, 'rock_small_tan', 1, 0, blocking=True)
sm.add(BC, 'fence_wood_up_down', 2, 1, blocking=False, hoppable=False, depthOffset=5)
sm.add(BC, 'rock_small_tan', 0, 1, scale=2)

with tempfile.TemporaryDirectory() as d:
    out = Path(d) / 'tiny.js'
    write_region(out, id='tiny', tiles=tiles, sm=sm, hop_cells=[(2, 1)],
                 fields={'displayName': 'Tiny', 'playerStart': {'x': 0, 'y': 0}, 'spawns': {'enemies': []}, 'portals': []},
                 header='test region')
    text = out.read_text()
    assert text.startswith('// test region'), 'header comment'
    body = re.search(r'export default (\{.*\});\s*$', text, re.S).group(1)
    raw = json.loads(body)
    assert raw['format'] == 1 and raw['id'] == 'tiny' and raw['width'] == 3 and raw['height'] == 2
    assert raw['names'] == ['rock_small_tan', 'fence_wood_up_down'], raw['names']
    assert raw['deco'] == [[0, 0, 1, 0, 1], [0, 1, 2, 1, 10, 5], [1, 0, 0, 1, 0]], raw['deco']
    assert [s['scale'] for s in raw['sheets']] == [1, 2]
    assert base64.b64decode(raw['hop'])[0] & (1 << 5), 'hop bit for (2,1) = index 5'
    assert raw['displayName'] == 'Tiny'

try:
    sm2 = SheetMap()
    sm2.add(BC, 'rock_small_tan', 0, 0, tint=3)
    write_region(Path(tempfile.gettempdir()) / 'bad.js', id='bad', tiles=tiles, sm=sm2, fields={})
    raise AssertionError('unknown item keys must be refused')
except ValueError:
    pass

print('test_region_writer: ok')
```

Run: `python3 tools/maps/test_region_writer.py`
Expected: FAIL with `ModuleNotFoundError: No module named 'region_writer'`

- [ ] **Step 6: Implement `tools/maps/region_writer.py`**

```python
"""
Region writer (W2): emits a region-format-1 JS module (src/systems/regionFormat.js
decodes it) from a tile grid and a SheetMap of decorations.

    write_region(AMO / 'src/data/maps/regions/streamtest.js', id='streamtest',
                 tiles=grid, sm=sm, hop_cells=cells, fields={...mapDef fields...},
                 header='AUTO-GENERATED by tools/maps/gen_streamtest.py')

Decoration items may only carry name, x, y, blocking, hoppable, depthOffset.
"""
import base64
import json
from pathlib import Path

from sheetmap import SheetMap

ITEM_KEYS = {'name', 'x', 'y', 'blocking', 'hoppable', 'depthOffset'}


def pack_tiles(tiles):
    return base64.b64encode(bytes(v for row in tiles for v in row)).decode()


def pack_bits(cells, w, h):
    out = bytearray((w * h + 7) // 8)
    for x, y in cells:
        i = y * w + x
        out[i >> 3] |= 1 << (i & 7)
    return base64.b64encode(bytes(out)).decode()


def _flags(it):
    f = 0
    if it.get('blocking') is True:
        f |= 1
    if it.get('blocking') is False:
        f |= 2
    if it.get('hoppable') is True:
        f |= 4
    if it.get('hoppable') is False:
        f |= 8
    return f


def write_region(out_path, *, id, tiles, sm: SheetMap, fields, hop_cells=(), header=''):
    h, w = len(tiles), len(tiles[0])
    sheets, names, deco, name_idx = [], [], [], {}
    for (sheet, scale), items in sm.groups.items():
        ck, tk = sm.keys(sheet, scale)
        c = sm.catalogue(sheet)[0]
        png = f'assets/catalogued/tilesets/{Path(sheet).parent.as_posix()}/{c["source"]}'
        cat = f'assets/catalogued/tilesets/{sheet}.catalogue.json'
        si = len(sheets)
        sheets.append({'texKey': tk, 'catKey': ck, 'png': png, 'cat': cat, 'scale': scale})
        for it in items:
            extra = set(it) - ITEM_KEYS
            if extra:
                raise ValueError(f'{it["name"]} at {it["x"]},{it["y"]}: unsupported keys {sorted(extra)}')
            if it['name'] not in name_idx:
                name_idx[it['name']] = len(names)
                names.append(it['name'])
            row = [si, name_idx[it['name']], it['x'], it['y'], _flags(it)]
            if it.get('depthOffset'):
                row.append(it['depthOffset'])
            deco.append(row)
    raw = {'format': 1, 'id': id, 'width': w, 'height': h, 'tiles': pack_tiles(tiles),
           'hop': pack_bits(hop_cells, w, h) if hop_cells else None,
           'sheets': sheets, 'names': names, 'deco': deco, **fields}
    text = ''.join(f'// {line}\n' for line in header.splitlines()) if header else ''
    text += 'export default ' + json.dumps(raw, separators=(',', ':')) + ';\n'
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    Path(out_path).write_text(text)
    return raw
```

- [ ] **Step 7: Run both tests, chain the Python one**

Run: `python3 tools/maps/test_region_writer.py && node tools/test_region.mjs`
Expected: `test_region_writer: ok` and `test_region: ... checks passed`.

In `package.json`'s `"test"` script, insert `python3 tools/maps/test_region_writer.py && ` right after `node tools/test_region.mjs && `.

Run: `npm test 2>&1 | tail -3`
Expected: green.

- [ ] **Step 8: Commit**

```bash
git add src/systems/regionFormat.js tools/maps/region_writer.py tools/maps/test_region_writer.py tools/test_region.mjs package.json
git commit -m "feat(amo): region format — big maps stored compactly, decoded into ordinary map definitions"
```

---

### Task 3: A 256×256 stream-test region

**Files:**
- Create: `tools/maps/gen_streamtest.py`
- Create (generated): `src/data/maps/regions/streamtest.js`
- Modify: `src/data/maps/index.js` (registry)
- Test: `tools/test_region.mjs` (append)

**Interfaces:**
- Consumes: `write_region` (Task 2), `decodeRegion` (Task 2).
- Produces: the map id `streamtest` (256×256: forest at about 40% trees, paths, about 12,000 decorations, 120 enemy spawns), used by Tasks 4–6 for the budget checks.

- [ ] **Step 1: Write the failing test** (append to `tools/test_region.mjs` before the final `console.log`)

```js
// ---- The stream-test region is registered and big
{
    const { getMap } = await import('../src/data/maps/index.js');
    const m = getMap('streamtest');
    eq(m.id, 'streamtest', 'registered');
    eq([m.tiles[0].length, m.tiles.length], [256, 256], '256×256');
    const trees = m.tiles.flat().filter(v => v === 1).length;
    ok(trees > 15000 && trees < 40000, `a real forest (${trees} trees)`);
    const deco = m.sheetDecorations.reduce((a, g) => a + g.items.length, 0);
    ok(deco >= 10000, `thousands of decorations (${deco})`);
    ok(m.spawns.enemies.length >= 100, 'a hundred creatures');
    const open = (x, y) => [0, 2, 3].includes(m.tiles[y]?.[x]);
    ok(open(m.playerStart.x, m.playerStart.y), 'player starts on open ground');
    ok(m.spawns.enemies.every(e => open(e.x, e.y)), 'every creature on open ground');
    const fs = await import('node:fs');
    const bytes = fs.statSync(new URL('../src/data/maps/regions/streamtest.js', import.meta.url)).size;
    ok(bytes < 3 * 1024 * 1024, `under 3 MB (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
}
```

Run: `node tools/test_region.mjs`
Expected: FAIL (`getMap('streamtest')` falls back to prologue_forest, so `m.id` is `'prologue_forest'`).

- [ ] **Step 2: Write the generator**

Create `tools/maps/gen_streamtest.py`:

```python
#!/usr/bin/env python3
"""
Generates src/data/maps/regions/streamtest.js — "Stream Test", a 256x256-tile
forest region for W2's performance budget: dense trees (tile 1), winding paths,
clearings, ~12k catalogue decorations, ~120 creatures. Not story content.
Deterministic. Run from apps/amo/: python3 tools/maps/gen_streamtest.py
Preview: python3 tools/maps/render_map_preview.py streamtest out.png --shrink 8
"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, AMO  # noqa: E402
from region_writer import write_region  # noqa: E402

W = H = 256
rng = random.Random(1017)
BC = 'SampleMap/[Base]BaseChip_pipo'
sm = SheetMap()

# Forest: smooth value noise thresholded, so trees form stands and clearings.
def noise(x, y):
    return (math.sin(x * 0.09) + math.sin(y * 0.11) + math.sin((x + y) * 0.05) + math.sin((x - y) * 0.07)) / 4

tiles = [[1 if noise(x, y) + rng.uniform(-0.35, 0.35) > 0.05 else 0 for x in range(W)] for y in range(H)]

# Paths: a few random walks from the centre to the edges, two tiles wide.
def carve_path(x, y, dx, dy):
    while 1 <= x < W - 2 and 1 <= y < H - 2:
        for ox in (0, 1):
            for oy in (0, 1):
                tiles[y + oy][x + ox] = 2
        if rng.random() < 0.25:
            dx, dy = rng.choice([(1, 0), (-1, 0), (0, 1), (0, -1)]) if rng.random() < 0.5 else (dx, dy)
        x, y = x + dx, y + dy

for d in [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 0), (0, 1)]:
    carve_path(W // 2, H // 2, *d)

# Clear the start area
for y in range(H // 2 - 4, H // 2 + 5):
    for x in range(W // 2 - 4, W // 2 + 5):
        tiles[y][x] = 0

taken = set()
SMALL = ['rock_small_tan', 'stump_small', 'flower_sunflower']
def free(x, y):
    return 0 <= x < W and 0 <= y < H and tiles[y][x] == 0 and (x, y) not in taken

placed = 0
while placed < 12000:
    x, y = rng.randrange(W), rng.randrange(H)
    if not free(x, y):
        continue
    sm.add(BC, rng.choice(SMALL), x, y)
    taken.add((x, y))
    placed += 1

# A few fenced plots to hop over
for _ in range(40):
    x0, y0 = rng.randrange(4, W - 10), rng.randrange(4, H - 10)
    if not all(free(x, y) for x in range(x0, x0 + 5) for y in range(y0, y0 + 4)):
        continue
    for x in range(x0 + 1, x0 + 4):
        sm.add(BC, 'fence_wood_left_right', x, y0, blocking=True)
        sm.add(BC, 'fence_wood_left_right', x, y0 + 3, blocking=True)
        taken.update({(x, y0), (x, y0 + 3)})

enemies = []
types = ['void_stalker', 'root_wraith', 'blight_ent']
while len(enemies) < 120:
    x, y = rng.randrange(W), rng.randrange(H)
    if tiles[y][x] != 0 or abs(x - W // 2) + abs(y - H // 2) < 20:
        continue
    enemies.append({'x': x, 'y': y, 'type': rng.choice(types)})

write_region(
    AMO / 'src/data/maps/regions/streamtest.js', id='streamtest', tiles=tiles, sm=sm,
    header='AUTO-GENERATED by tools/maps/gen_streamtest.py — W2 performance test region (region format 1).',
    fields={
        'displayName': 'Stream Test (256×256)', 'biome': 'forest',
        'playerStart': {'x': W // 2, 'y': H // 2},
        'tileset': {'key': 'tileset_base', 'floorFrame': 0, 'pathFrame': 5},
        'portals': [], 'levelBand': {'min': 1, 'max': 3},
        'spawns': {'enemies': enemies, 'npcs': [], 'chests': [], 'campfires': [], 'signs': []},
    },
)
print(f'streamtest: {sum(r.count(1) for r in tiles)} trees, {sm.count()} decorations, {len(enemies)} creatures')
```

Run: `python3 tools/maps/gen_streamtest.py`
Expected: prints counts (trees roughly 15k–40k, decorations at least 12,000, 120 creatures) and writes `src/data/maps/regions/streamtest.js`.

If `rock_small_tan`, `stump_small`, `flower_sunflower` or `fence_wood_left_right` raise `KeyError ... not in SampleMap/[Base]BaseChip_pipo`, those names live in another sheet. Find the right sheet with `grep -l '"rock_small_tan"' public/assets/catalogued/tilesets/**/*.catalogue.json` and use that path instead of `BC`. `big_forest.js` places them through its `decorations` field, which is `tileset_base_cat` = BaseChip, so BaseChip is expected.

- [ ] **Step 3: Register it**

In `src/data/maps/index.js`, add to the imports:

```js
import { decodeRegion } from '../../systems/regionFormat.js';
import STREAMTEST_RAW from './regions/streamtest.js';
```

and to `REGISTRY` (after `worldtest`):

```js
    streamtest:         decodeRegion(STREAMTEST_RAW),
```

- [ ] **Step 4: Run tests**

Run: `node tools/test_region.mjs && npm test 2>&1 | tail -3`
Expected: green. If a test that iterates `listMaps()` fails (`tools/test_economy.mjs` and `tools/gen_game_inventory.mjs` walk every map), read its message. A map without stations or shops is normal, so the assertion probably assumes something about every map. Exclude `streamtest` from that loop the same way `worldtest` / `forestest` are treated there (`grep -n "worldtest\|forestest" tools/test_economy.mjs tools/gen_game_inventory.mjs`). If they are not excluded there, fix the assumption for test maps and ledger a ruling.

- [ ] **Step 5: Preview**

Run: `python3 tools/maps/render_map_preview.py streamtest /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/streamtest.png --shrink 8`

If the preview tool only reads `src/data/maps/<id>.js`, it will fail on a region. In that case, teach it to read `src/data/maps/regions/<id>.js`: parse the `export default {...}` JSON, base64-decode `tiles`, and rebuild the decoration groups exactly as `decodeRegion` does. Then re-run. Open the PNG with the Read tool: expect forest stands, clearings and paths radiating from the centre.

- [ ] **Step 6: Commit**

```bash
git add tools/maps/gen_streamtest.py src/data/maps/regions/streamtest.js src/data/maps/index.js tools/test_region.mjs tools/maps/render_map_preview.py
git commit -m "feat(amo): stream-test region — a 256×256 forest for the streaming budget"
```

---

### Task 4: Stream trees and decorations in GameScene

**Files:**
- Modify: `src/scenes/GameScene.js`:
  - imports;
  - `_buildWorld` (~line 2886);
  - `_placeCatalogueDecorations` and `_placeCatalogueItems` (~lines 2995–3093);
  - `create()`, after the player is created (~line 124), and its physics section (~line 437);
  - `update()`;
  - `_hopBlockedAt` (from W1);
  - new methods `_streamView`, `_catalogueCtx`, `_placeCatalogueItem`.

**Interfaces:**
- Consumes: `ChunkStreamer`, `CHUNK` (Task 1).
- Produces:
  - `GameScene._streamer: ChunkStreamer | null` (null on Tiled maps);
  - `GameScene._treeLayer: Phaser.Tilemaps.TilemapLayer | null` (invisible collision for tile 1);
  - `GameScene._streamView() → {x, y, w, h}`;
  - `_placeCatalogueItems(items, catKey, texKey, scale)` keeps its signature and still places immediately, for any caller that is not the map's own decoration list.

- [ ] **Step 1: Baseline counts before the change** (to compare after)

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=worldtest" 12000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');return JSON.stringify({objects:gs.children.length,statics:gs.physics.world.staticBodies.size});})()"
```

Record the printed numbers in the ledger (`Task 4: baseline worldtest objects=…, statics=…`).

- [ ] **Step 2: Imports and tree collision layer**

Add to GameScene imports:

```js
import { ChunkStreamer } from '../systems/regionChunks.js';
```

In `_buildWorld`, replace the whole `tiles.forEach((row, r) => { row.forEach((tile, c) => { if (tile === 1) { ... } }); });` block (the one that creates `wall`, `trunk` and `top` for each tree) with:

```js
        // Trees (tile 1): one invisible tilemap layer collides for all of them;
        // their trunk + canopy images are streamed per chunk (W2).
        const collideData = tiles.map(row => row.map(t => (t === 1 ? 0 : -1)));
        const cmap = this.make.tilemap({ data: collideData, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
        const cts  = cmap.addTilesetImage(tsKey, tsKey);
        this._treeLayer = cmap.createLayer(0, cts, 0, 0).setVisible(false);
        this._treeLayer.setCollision(0);

        const treeCells = [];
        tiles.forEach((row, r) => row.forEach((tile, c) => { if (tile === 1) treeCells.push({ x: c, y: r }); }));
        this._streamer = new ChunkStreamer({ cols: tiles[0].length, rows: tiles.length });
        this._streamer.addLayer('trees', treeCells, cell => cell, cell => {
            const x = cell.x * TILE_SIZE + TILE_SIZE / 2;
            const y = cell.y * TILE_SIZE + TILE_SIZE / 2;
            const trunk = this.add.image(x, y + 4, 'lpc_trunk', 0).setDisplaySize(20, 24).setDepth(y + 0.5);
            // Treetop: crop bottom ~30% to remove grass tuft below the foliage
            const top = this.add.image(x, y - 12, 'lpc_treetop', 0).setCrop(0, 0, 96, 80).setDisplaySize(44, 36).setDepth(y + 2000);
            return [trunk, top];
        }, imgs => imgs.forEach(i => i.destroy()));
```

At the top of `_buildWorld`, inside the `if (this._mapDef.tiledMap) {` branch and before its `return`, add `this._streamer = null; this._treeLayer = null;`.

- [ ] **Step 3: Split decoration placement into a context and a single item**

Replace `_placeCatalogueDecorations()`'s last two statements:

```js
        sources.forEach(s => this._placeCatalogueItems(s.items, s.catKey, s.texKey));
        ...
        this._mapDef.sheetDecorations?.forEach(g => this._placeCatalogueItems(g.items, g.catKey, g.texKey, g.scale ?? 1));
```

with:

```js
        // W2: every decoration is streamed per chunk, with its collision body.
        const groups = [...sources.map(s => ({ ...s, scale: 1 })),
            ...(this._mapDef.sheetDecorations ?? []).map(g => ({ items: g.items, catKey: g.catKey, texKey: g.texKey, scale: g.scale ?? 1 }))];
        const all = [];
        for (const g of groups) {
            if (!g.items?.length) continue;
            const ctx = this._catalogueCtx(g.catKey, g.texKey, g.scale);
            if (ctx) for (const d of g.items) all.push({ ctx, d });
        }
        this._streamer.addLayer('deco', all, it => it.d, it => this._placeCatalogueItem(it.ctx, it.d),
            h => { h?.img.destroy(); h?.wall?.destroy(); });
```

Keep the existing explanatory comments above those lines. Then replace the body of `_placeCatalogueItems(items, catKey, texKey, scale = 1)` with:

```js
    // Places a list at once (not streamed) — kept for callers outside the map's own decorations.
    _placeCatalogueItems(items, catKey, texKey, scale = 1) {
        if (!items || !items.length) return;
        const ctx = this._catalogueCtx(catKey, texKey, scale);
        if (ctx) items.forEach(d => this._placeCatalogueItem(ctx, d));
    }

    _catalogueCtx(catKey, texKey, scale = 1) {
        const catJson = this.cache.json.get(catKey);
        if (!catJson) {
            console.warn(`${catKey} not loaded — skipping items`);
            return null;
        }
        const byName = {};
        catJson.entries.forEach(e => { byName[e.name] = e; });
        return { catKey, texKey, scale, byName, tw: catJson.gridTileWidth, th: catJson.gridTileHeight, tex: this.textures.get(texKey) };
    }

    // One catalogue item → { img, wall } (wall: its collision body, if any), or null.
    _placeCatalogueItem(ctx, d) {
        const { catKey, texKey, scale, byName, tw, th, tex } = ctx;
        const entry = byName[d.name];
        if (!entry) {
            console.warn(`"${d.name}" not found in ${catKey}`);
            return null;
        }
        let cx, cy, cw, ch;
        if (entry.kind === 'tile') {
            cx = entry.col * tw; cy = entry.row * th; cw = tw; ch = th;
        } else {
            cx = entry.x; cy = entry.y; cw = entry.w; ch = entry.h;
        }
        const frames = entry.frames?.length > 1 ? entry.frames : null;
        if (frames) { cw = Math.max(...frames.map(f => f.w)); ch = Math.max(...frames.map(f => f.h)); }
        const frameKey = `cat_${d.name}`;
        if (!frames && !tex.has(frameKey)) tex.add(frameKey, 0, cx, cy, cw, ch);

        const sw = cw * scale, sh = ch * scale;
        const px = d.x * TILE_SIZE + sw / 2;
        const py = d.y * TILE_SIZE + sh / 2;
        let img;
        if (frames) {
            const animKey = `catanim_${texKey}_${d.name}`;
            frames.forEach((f, i) => {
                if (!tex.has(`${frameKey}_f${i}`)) tex.add(`${frameKey}_f${i}`, 0, f.x, f.y, f.w, f.h);
            });
            if (!this.anims.exists(animKey)) {
                this.anims.create({
                    key: animKey,
                    frames: frames.map((_, i) => ({ key: texKey, frame: `${frameKey}_f${i}` })),
                    frameRate: 1000 / (entry.frameDurationMs ?? 120),
                    repeat: -1,
                });
            }
            img = this.add.sprite(px, py + sh / 2, texKey, `${frameKey}_f0`).setOrigin(0.5, 1).setScale(scale).play(animKey);
        } else {
            img = this.add.image(px, py, texKey, frameKey).setScale(scale);
        }
        const hb = entry.hitbox;
        const placed = scale === 1 || !hb ? entry
            : { ...entry, hitbox: { x: hb.x * scale, y: hb.y * scale, w: hb.w * scale, h: hb.h * scale } };
        const { depth, body } = catalogueLayout(placed, { left: px - sw / 2, top: py - sh / 2, w: sw, h: sh }, d);
        img.setDepth(depth);

        let wall = null;
        if (body) {
            const group = isHoppableDecoration(d, entry, this._hopCells) ? this.hopGroup : this.wallGroup;
            wall = group.create(body.x + body.w / 2, body.y + body.h / 2, 'tile_tree');
            wall.setAlpha(0);
            wall.setDisplaySize(body.w, body.h);
            wall.refreshBody();
        }
        return { img, wall };
    }
```

Before replacing, diff the old body against this one: keep every comment from the old version on the matching lines, and check that nothing else changed. The only intended changes are that it is per item, and that it returns `{ img, wall }`. If W1's version of the body differs from what is shown here (for example in the hop-group line), keep W1's version.

- [ ] **Step 4: The view, the first build, per-frame updates, colliders**

Add the method:

```js
    // The world rectangle the streamer keeps built: the camera view around the
    // player (computed, so it is right before the camera has followed).
    _streamView() {
        const cam = this.cameras.main;
        const zoom = cam.zoom || 1;
        const w = cam.width / zoom, h = cam.height / zoom;
        return { x: this.player.x - w / 2, y: this.player.y - h / 2, w, h };
    }
```

In `create()`, right after `this.player.on('died', () => this._onPlayerDied());`:

```js
        // W2: build what is under the camera now; the margin streams in over the next frames
        this.cameras.main.setZoom(isMobile ? 1.5 : 3);
        this._streamer?.update(this._streamView(), 0);
```

(The later `this.cameras.main.setZoom(...)` in the camera section stays; it sets the same value.)

In the physics section, right after `this.physics.add.collider(this.player, this.wallGroup);`:

```js
        if (this._treeLayer) {
            this.physics.add.collider(this.player, this._treeLayer);
            this.physics.add.collider(this.enemies, this._treeLayer);
            this.physics.add.collider(this.pickups, this._treeLayer);
        }
```

And where network enemies get `this.physics.add.collider(enemy, this.wallGroup);` (~line 628), add on the next line:

```js
            if (this._treeLayer) this.physics.add.collider(enemy, this._treeLayer);
```

In `update(time, delta)`, right after the `this.player.update(...)` call:

```js
        this._streamer?.update(this._streamView(), 1);
```

Shutdown: find the scene's shutdown cleanup (`grep -n "events.once('shutdown'" src/scenes/GameScene.js`) and add one more:

```js
        this.events.once('shutdown', () => { this._streamer = null; });
```

(Game objects are destroyed by the scene. Only the reference is dropped, so a stale streamer is never reused.)

- [ ] **Step 5: Hop query sees trees as walls**

In `_hopBlockedAt(px, py)` (W1), right after the world-bounds check, add:

```js
        // Trees are tilemap tiles now (W2), not bodies
        const tiles = this._mapDef.tiles;
        for (let ty = Math.floor(ry / TILE_SIZE); ty <= Math.floor((ry + rh) / TILE_SIZE); ty++)
            for (let tx = Math.floor(rx / TILE_SIZE); tx <= Math.floor((rx + rw) / TILE_SIZE); tx++)
                if (tiles[ty]?.[tx] === 1) return 'wall';
```

- [ ] **Step 6: Run the suite**

Run: `npm test 2>&1 | tail -3`
Expected: green.

- [ ] **Step 7: Headless checks**

Object counts and no errors, on four maps:

```bash
for m in worldtest big_forest hermit_hut streamtest; do node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=$m" 12000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');return JSON.stringify({map:gs._mapId,objects:gs.children.length,statics:gs.physics.world.staticBodies.size,chunks:gs._streamer?.builtCount(),queued:gs._streamer?.queuedCount()});})()"; done
```

Expected:
- no page errors;
- `worldtest`: `objects` and `statics` well below the Step 1 baseline;
- `hermit_hut`: loads, with `chunks` of 1;
- `streamtest`: `objects` ≤ 2,500, `queued` 0 after 12 s.

Collision still works against a tree (walk into one):

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 10000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');const p=gs.player;const t=gs._mapDef.tiles;let fx,fy;for(let y=120;y<136&&fx===undefined;y++)for(let x=100;x<150;x++)if(t[y][x]===0&&t[y][x+1]===1){fx=x;fy=y;break;}p.setPosition(fx*32+16,fy*32+8);window.__f={fx,fy};gs.wasd.right.isDown=true;})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');gs.wasd.right.isDown=false;const p=gs.player;const hop=p.tryHop((x,y)=>gs._hopBlockedAt(x,y));return JSON.stringify({...window.__f,cellX:Math.floor(p.x/32),hop});})()"
```

Expected: `cellX` equals `fx`, so the player was stopped by the tree. `hop` is `true`, and the next check confirms the hop lands in place.

Teleport within the map builds the new view at once:

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 10000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.setPosition(30*32,30*32);gs._streamer.update(gs._streamView(),0);const k=gs._streamer.isPxActive(30*32,30*32);return JSON.stringify({builtUnderPlayer:k,chunks:gs._streamer.builtCount()});})()"
```

Expected: `builtUnderPlayer: true`.

Take a screenshot while walking, to eyeball the trees and decorations:

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 9000 --eval "(()=>{__game.scene.getScene('GameScene').wasd.right.isDown=true;})();;0;;0;;0" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w2-stream.png
```

Open it with Read. Expect trees and decorations on screen, with no empty band at the edges.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(amo): trees and decorations stream per chunk; trees collide through one tilemap layer"
```

---

### Task 5: Enemies sleep far away and wake where they were

**Files:**
- Modify: `src/scenes/GameScene.js`:
  - `create()` enemy loop (~lines 222–243), and right after the streamer's first update;
  - `_tryRespawn` (~line 3622);
  - `update()`;
  - new methods `_spawnFromDef`, `_sleepDef`, `_sleepFarEnemies`.

**Interfaces:**
- Consumes: `_streamer.onEnter`, `.isPxActive` (Tasks 1 and 4); `chunkKey`, `chunkOfTile` (Task 1).
- Produces:
  - `GameScene._streamEnemies: boolean` (offline and streamed);
  - `GameScene._sleeping: Map<chunkKey, def[]>`;
  - spawn defs may carry `_hp`, `_level`, `_affixes`, `_slept` while asleep.

- [ ] **Step 1: Shared spawn helper**

Add the methods:

```js
    // Spawn a map creature from its def. A def that slept (W2) wakes with its HP,
    // level and elite affixes, and never re-rolls an elite.
    _spawnFromDef(def) {
        const enemy = this._spawnEnemy(def.type, def.x, def.y, def._level ?? null);
        if (def._affixes) { this._eliteCount++; this._makeElite(enemy, def._affixes); }
        else if (!def._slept) this._maybeElite(enemy);
        if (def._hp != null) { enemy.health = Math.min(enemy.maxHealth, def._hp); enemy._drawHealthBar?.(); }
        def._hp = null; def._level = null; def._affixes = null; def._slept = false;
        enemy.spawnDef = def;
        enemy.once('died', () => { if (enemy.elite) this._eliteCount--; this._scheduleRespawn(def); });
        return enemy;
    }

    _sleepDef(def) {
        const { cx, cy } = chunkOfTile(Math.floor(def.x / TILE_SIZE), Math.floor(def.y / TILE_SIZE));
        const k = chunkKey(cx, cy);
        if (!this._sleeping.has(k)) this._sleeping.set(k, []);
        this._sleeping.get(k).push(def);
    }

    // Calm creatures whose home and current chunk are both out of range sleep (W2).
    _sleepFarEnemies() {
        if (!this._streamEnemies) return;
        this.enemies.getChildren().slice().forEach(e => {
            const d = e.spawnDef;
            if (!e.active || !d || e.state === 'chase' || e.state === 'attack') return;
            if (this._streamer.isPxActive(d.x, d.y) || this._streamer.isPxActive(e.x, e.y)) return;
            d._hp = e.health; d._level = e.level ?? null; d._affixes = e.elite ? e.affixes : null; d._slept = true;
            if (e.elite) this._eliteCount--;
            if (this._target === e) this._target = null;
            e.destroy();
            this._sleepDef(d);
        });
    }
```

Add `chunkKey, chunkOfTile` to the regionChunks import.

- [ ] **Step 2: Use it in `_tryRespawn`**

Replace in `_tryRespawn(def)`:

```js
        const enemy = this._spawnEnemy(def.type, def.x, def.y);
        this._maybeElite(enemy);
        enemy.spawnDef = def;
        enemy.once('died', () => { if (enemy.elite) this._eliteCount--; this._scheduleRespawn(def); });
```

with:

```js
        this._spawnFromDef(def);
```

and, right after the `if (!spawnActive(def, playerStats.gameMinutes)) { ... }` line, add:

```js
        // Out of range: sleep until its chunk streams in (W2)
        if (this._streamEnemies && !this._streamer.isPxActive(def.x, def.y)) { this._sleepDef(def); return; }
```

- [ ] **Step 3: Initial spawns and waking**

Right after the streamer's first update in `create()` (added in Task 4), add:

```js
        this._sleeping = new Map();
        this._streamEnemies = !this._serverUrl && !!this._streamer;
        if (this._streamer) this._streamer.onEnter = k => {
            const defs = this._sleeping.get(k);
            if (!defs || !this.enemies) return;
            this._sleeping.delete(k);
            for (const d of defs) {
                if (spawnActive(d, playerStats.gameMinutes)) this._spawnFromDef(d);
                else this._dormant.push(d);
            }
        };
```

In the enemy loop of `create()`, right after the dormant (`spawnActive`) check's `return;` block, add:

```js
            // W2: creatures outside the streamed area sleep until their chunk comes in
            if (this._streamEnemies && !this._streamer.isTileActive(spawn.x, spawn.y)) {
                this._sleepDef({ type: spawn.type, x: ex, y: ey, time: spawn.time });
                return;
            }
```

In `update()`, next to the other throttled timers (the `_musicMoodTimer` block), add:

```js
        this._sleepT = (this._sleepT ?? 0) + delta;
        if (this._sleepT >= 500) { this._sleepT = 0; this._sleepFarEnemies(); }
```

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -3`
Expected: green.

- [ ] **Step 5: Headless checks**

On `streamtest`, most of the 120 creatures sleep at start. A far one wakes when you go there, and goes back to sleep with its HP when you leave:

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 12000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');const asleep=[...gs._sleeping.values()].reduce((a,v)=>a+v.length,0);const live=gs.enemies.getChildren().length;const [k,defs]=[...gs._sleeping.entries()][0];const d=defs[0];window.__d=d;gs.player.setPosition(d.x,d.y-96);return JSON.stringify({asleep,live,wakeKey:k});})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');const e=gs.enemies.getChildren().find(x=>x.spawnDef===window.__d);if(!e)return 'NOT WOKEN';e.health=Math.max(1,Math.floor(e.maxHealth/2));e.state='patrol';window.__hp=e.health;window.__lvl=e.level;gs.player.setPosition(gs.player.x>4000?300:7900,gs.player.y>4000?300:7900);return JSON.stringify({woken:true,hp:e.health,level:e.level});})();;0;;0;;0;;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');const d=window.__d;const live=gs.enemies.getChildren().some(x=>x.spawnDef===d);return JSON.stringify({sleptAgain:!live,hpKept:d._hp===window.__hp,levelKept:d._level===window.__lvl});})()"
```

Expected:
- first step: `asleep` ≥ 100 and `live` small (the creatures near the start);
- second step: `woken: true`;
- last step: `sleptAgain: true`, `hpKept: true`, `levelKept: true`.

The delay steps add up to more than the 500 ms sleep tick.

A chasing creature never sleeps:

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 12000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');const e=gs.enemies.getChildren()[0];if(!e)return 'no live enemy near start';window.__e=e;e.state='chase';gs.player.setPosition(300,300);return 'ok';})();;0;;0;;0;;(()=>{const e=window.__e;return JSON.stringify({stillAlive:e.active});})()"
```

Expected: `stillAlive: true`. The creature's AI may change its state on its own next update. If the result is flaky because the AI drops `chase` once the player is out of sight, that is correct behaviour (a calm creature may sleep). In that case pin the check differently: put the player 600 px away, in a chunk that is still active, and confirm the creature is alive after one sleep tick.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(amo): far-away creatures sleep and wake with their HP, level and elite traits (offline)"
```

---

### Task 6: Minimap drawing for big maps, the budget run, push

**Files:**
- Modify: `src/scenes/UIScene.js` (`_drawMinimapStatic`, ~line 141)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing new. W5 replaces the minimap.

- [ ] **Step 1: Draw the static minimap in runs**

A 256×256 map is 65,536 `fillRect` calls today. Draw one rect per run of equal colour in a row instead. Replace the body of `_drawMinimapStatic(tiles)`'s `tiles.forEach(...)` block with:

```js
        tiles.forEach((row, r) => {
            let start = 0;
            const colorOf = t => (t === 1 ? 0x0d2010 : t === 2 ? 0x5a4a2a : 0x1e3a14);
            for (let c = 1; c <= row.length; c++) {
                if (c < row.length && colorOf(row[c]) === colorOf(row[start])) continue;
                g.fillStyle(colorOf(row[start]));
                g.fillRect(start * tw, r * th, (c - start) * tw, th);
                start = c;
            }
        });
```

- [ ] **Step 2: The budget run**

Sprint across `streamtest` for 10 s, crossing chunk borders, and sample frame time and object count:

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 30000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.setPosition(40*32,128*32);window.__s={dt:[],obj:[]};gs.events.on('update',()=>{const p=gs.player;p.setVelocity(300,0);window.__s.dt.push(gs.game.loop.delta);window.__s.obj.push(gs.children.length);});})();;0;;0;;0;;0;;0;;0;;0;;0;;0;;0;;(()=>{const s=window.__s;const dt=s.dt.slice(10).sort((a,b)=>a-b);const p95=dt[Math.floor(dt.length*0.95)];return JSON.stringify({frames:dt.length,p95:Math.round(p95*10)/10,max:Math.round(dt[dt.length-1]),maxObjects:Math.max(...s.obj)});})()"
```

Expected:
- `maxObjects` ≤ 2,500;
- `p95` ≤ 20 ms;
- report `max` as measured.

Headless Chromium renders in software, so a `p95` over 20 ms here is not a fail by itself. If it is over, rerun the same script with `?testmap=worldtest` and compare. Streaming must not be slower than the old whole-map build. Record the numbers in the ledger, and include them in the final report for the user to confirm in a real browser.

If `maxObjects` > 2,500, count by type to find the cause:

```js
Object.entries(gs.children.list.reduce((a,o)=>(a[o.type]=(a[o.type]||0)+1,a),{}))
```

Most likely the margin is too wide for the zoom-1.5 mobile view, or the `[E]` prompt texts. Fix the cause, then ledger a ruling.

- [ ] **Step 3: Full suite, smoke-load every story map, push**

Run: `npm test 2>&1 | tail -3`
Expected: green.

```bash
for m in prologue_forest hermit_hut eldrin_tower northern_forest summit_of_despair thaloria east_road sylvan_sanctuary; do node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=$m" 7000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');return JSON.stringify({map:gs._mapId,objects:gs.children.length,enemies:gs.enemies.getLength()});})()"; done
```

Expected: every map prints, no page errors.

```bash
git add src/scenes/UIScene.js
git commit -m "perf(amo): minimap draws in runs, so 256×256 maps draw it in one pass"
git push
```
