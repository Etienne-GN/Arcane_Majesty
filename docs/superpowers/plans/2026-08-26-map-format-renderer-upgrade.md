# Map Format/Renderer Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let map data place any catalogued sprite by name — replacing the hardcoded single-tree special case and raw floor-decoration frame indices with a generic, catalogue-referencing decoration/tileset mechanism.

**Architecture:** Two small pure (Phaser-free) modules carry all the interesting logic — `spriteCatalogueResolve.js` (catalogue JSON → resolved frame/rect) and `mapDecorPlacement.js` (map data → concrete render parameters, via a dependency-injected resolve callback) — so both are fully unit-testable without a live Phaser scene. `GameScene.js` becomes a thin consumer: it wires the scene's `cache.json` into the resolver and loops the pure functions' output through ordinary Phaser draw calls. A generated manifest (`gen_manifest.js` → `sprite_catalogue_manifest.json`) lets `BootScene.js` register every catalogued sheet's texture without hand-written per-sheet lines.

**Tech Stack:** Pure Node (ESM, no deps) for all new tooling/logic modules, matching the conventions established in the sprite-catalogue-system plan. Phaser 3 for the two scene-file edits (`BootScene.js`, `GameScene.js`).

**Spec:** `docs/superpowers/specs/2026-08-26-map-format-renderer-upgrade-design.md`

## Global Constraints

- New map-data fields: `tileset.floor`/`.path`/`.decor[]` as `{ sheet, name }` refs (new), coexisting with the legacy raw-int `floorFrame`/`pathFrame`/`decorFrames` fields (unchanged) — a map uses one or the other per field, never both; the resolution code checks for the new field name first, falling back to the legacy field name.
- `decorations: [{ sheet, name, x, y, blocking?, depthOffset? }]` — `x`/`y` are **tile** coordinates (same convention as `spawns`), converted to pixel via `coord * TILE_SIZE + TILE_SIZE / 2`. No randomization/variant-picking — one entry names exactly one sprite.
- `blocking` defaults to `false`; when `true` the placement gets an invisible collision body in the existing `wallGroup`, built from the same generic `tile_tree` placeholder texture the current tree code already uses (not sized to the decoration's own crop — full-tile collider, matching today's behavior exactly).
- `depthOffset` defaults to `0`; final depth is `pixelY + depthOffset`.
- A `{ sheet, name }` ref for `decorations` must resolve to a `kind: "object"` catalogue entry; for `tileset.floor`/`.path`/`.decor[]` it must resolve to `kind: "tile"`.
- Migrating the 4 legacy maps' `tile === 1` trees to `decorations` is **blocked** on `tilesets/lpc/trunk`/`tilesets/lpc/treetop` actually being catalogued (a sub-project 1 execution step not yet done) — Task 6 builds and tests the conversion *tool* now, but running it against the real maps happens later, once real catalogue entry names exist.

---

### Task 1: Sprite catalogue entry resolver

**Files:**
- Create: `apps/amo/src/systems/spriteCatalogueResolve.js`
- Create: `apps/amo/tools/test_sprite_catalogue_resolve.mjs`

**Interfaces:**
- Produces: `findEntry(catalogueJson, name) → entry` (throws if missing), `resolveTileFrame(catalogueJson, name) → number`, `resolveObjectRect(catalogueJson, name) → {x, y, w, h}`, `resolveCatalogueRef(scene, {sheet, name}) → {textureKey, x, y, w, h, frameIndex?}` (the last is `frameIndex`-bearing only for `kind: "tile"` refs). All named exports from `spriteCatalogueResolve.js`. Task 2 and Task 5 both call `resolveCatalogueRef`.

- [ ] **Step 1: Write the failing test**

Create `apps/amo/tools/test_sprite_catalogue_resolve.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Unit tests for spriteCatalogueResolve.js. Pure assertions against
 * hand-built catalogue JSON objects and a fake Phaser-scene stub
 * (only `cache.json.get()` is used by the module under test).
 * Run: node tools/test_sprite_catalogue_resolve.mjs
 */
import {
    findEntry,
    resolveTileFrame,
    resolveObjectRect,
    resolveCatalogueRef,
} from '../src/systems/spriteCatalogueResolve.js';

let passed = 0;
const fails = [];
function check(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}
function throws(fn) {
    try { fn(); return false; } catch { return true; }
}

const objectCat = {
    source: 'trunk.png',
    entries: [
        { name: 'oak_trunk_a', kind: 'object', x: 0, y: 0, w: 96, h: 96, tags: [] },
    ],
};
const tileCat = {
    source: 'terrain_atlas.png',
    gridTileWidth: 32, gridTileHeight: 32, gridCols: 32, gridRows: 32,
    entries: [
        { name: 'grass_flower_a', kind: 'tile', row: 5, col: 20, frameIndex: 180, tags: [] },
    ],
};

// ── findEntry ────────────────────────────────────────────────────────────────
check('findEntry finds an existing entry', findEntry(objectCat, 'oak_trunk_a').name === 'oak_trunk_a');
check('findEntry throws on missing name', throws(() => findEntry(objectCat, 'nope')));

// ── resolveTileFrame ─────────────────────────────────────────────────────────
check('resolveTileFrame computes row*gridCols+col', resolveTileFrame(tileCat, 'grass_flower_a') === 180);
check('resolveTileFrame throws on wrong kind', throws(() => resolveTileFrame(objectCat, 'oak_trunk_a')));

// ── resolveObjectRect ────────────────────────────────────────────────────────
{
    const rect = resolveObjectRect(objectCat, 'oak_trunk_a');
    check('resolveObjectRect returns the bbox', rect.x === 0 && rect.y === 0 && rect.w === 96 && rect.h === 96);
}
check('resolveObjectRect throws on wrong kind', throws(() => resolveObjectRect(tileCat, 'grass_flower_a')));

// ── resolveCatalogueRef: object kind ─────────────────────────────────────────
{
    const fakeScene = { cache: { json: { get: (key) => (key === 'lpc/trunk_cat' ? objectCat : undefined) } } };
    const resolved = resolveCatalogueRef(fakeScene, { sheet: 'lpc/trunk', name: 'oak_trunk_a' });
    check(
        'resolveCatalogueRef (object) returns textureKey + bbox',
        resolved.textureKey === 'lpc/trunk' && resolved.x === 0 && resolved.y === 0 && resolved.w === 96 && resolved.h === 96
    );
    check('resolveCatalogueRef (object) has no frameIndex', resolved.frameIndex === undefined);
}

// ── resolveCatalogueRef: tile kind ───────────────────────────────────────────
{
    const fakeScene = { cache: { json: { get: (key) => (key === 'lpc/terrain_atlas_cat' ? tileCat : undefined) } } };
    const resolved = resolveCatalogueRef(fakeScene, { sheet: 'lpc/terrain_atlas', name: 'grass_flower_a' });
    check(
        'resolveCatalogueRef (tile) computes pixel bbox from row/col',
        resolved.textureKey === 'lpc/terrain_atlas' &&
        resolved.x === 20 * 32 && resolved.y === 5 * 32 &&
        resolved.w === 32 && resolved.h === 32
    );
    check('resolveCatalogueRef (tile) exposes frameIndex', resolved.frameIndex === 180);
}

// ── resolveCatalogueRef: sheet not loaded ────────────────────────────────────
{
    const fakeScene = { cache: { json: { get: () => undefined } } };
    check(
        'resolveCatalogueRef throws when sheet not in cache',
        throws(() => resolveCatalogueRef(fakeScene, { sheet: 'missing/sheet', name: 'anything' }))
    );
}

if (fails.length) {
    console.error(`✗ spriteCatalogueResolve tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ spriteCatalogueResolve tests passed (${passed} assertions).`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/amo && node tools/test_sprite_catalogue_resolve.mjs`
Expected: FAIL — `Cannot find module '../src/systems/spriteCatalogueResolve.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/amo/src/systems/spriteCatalogueResolve.js`:

```javascript
/**
 * Sprite catalogue resolution — given a loaded *.catalogue.json object,
 * resolves a named entry to something a renderer can draw. The scene-aware
 * entry point (resolveCatalogueRef) is what GameScene actually calls; the
 * three pure functions below it are exported for direct testing and for
 * mapDecorPlacement.js's tileset-frame resolution path.
 */

/** Finds an entry by name in a parsed catalogue JSON object. Throws if missing. */
export function findEntry(catalogueJson, name) {
    const entry = (catalogueJson.entries ?? []).find(e => e.name === name);
    if (!entry) {
        throw new Error(`sprite catalogue: no entry named "${name}" in "${catalogueJson.source}"`);
    }
    return entry;
}

/** Resolves a `kind: "tile"` entry to its frameIndex. Throws on wrong kind. */
export function resolveTileFrame(catalogueJson, name) {
    const entry = findEntry(catalogueJson, name);
    if (entry.kind !== 'tile') {
        throw new Error(`sprite catalogue: "${name}" is kind "${entry.kind}", expected "tile"`);
    }
    return entry.row * catalogueJson.gridCols + entry.col;
}

/** Resolves a `kind: "object"` entry to its pixel bbox. Throws on wrong kind. */
export function resolveObjectRect(catalogueJson, name) {
    const entry = findEntry(catalogueJson, name);
    if (entry.kind !== 'object') {
        throw new Error(`sprite catalogue: "${name}" is kind "${entry.kind}", expected "object"`);
    }
    return { x: entry.x, y: entry.y, w: entry.w, h: entry.h };
}

/**
 * Scene-aware resolution: looks up the cached catalogue JSON for `sheet`
 * (`scene.cache.json.get(sheet + '_cat')`) and resolves `name` within it.
 * Returns { textureKey, x, y, w, h } (a crop rect) for either entry kind,
 * plus `frameIndex` when the entry is `kind: "tile"`.
 */
export function resolveCatalogueRef(scene, { sheet, name }) {
    const catalogueJson = scene.cache.json.get(sheet + '_cat');
    if (!catalogueJson) {
        throw new Error(`sprite catalogue: sheet "${sheet}" is not loaded (missing "${sheet}_cat" in cache.json)`);
    }
    const entry = findEntry(catalogueJson, name);
    if (entry.kind === 'object') {
        return { textureKey: sheet, x: entry.x, y: entry.y, w: entry.w, h: entry.h };
    }
    if (entry.kind === 'tile') {
        return {
            textureKey: sheet,
            x: entry.col * catalogueJson.gridTileWidth,
            y: entry.row * catalogueJson.gridTileHeight,
            w: catalogueJson.gridTileWidth,
            h: catalogueJson.gridTileHeight,
            frameIndex: entry.row * catalogueJson.gridCols + entry.col,
        };
    }
    throw new Error(`sprite catalogue: "${name}" has unknown kind "${entry.kind}"`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/amo && node tools/test_sprite_catalogue_resolve.mjs`
Expected: `✓ spriteCatalogueResolve tests passed (11 assertions).`

- [ ] **Step 5: Wire the npm scripts**

In `apps/amo/package.json`:

```diff
     "test:sprite-catalogue": "node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs",
     "test:crop-check": "python3 tools/sprite_catalogue/test_crop_check.py",
+    "test:catalogue-resolve": "node tools/test_sprite_catalogue_resolve.mjs",
```

```diff
-    "test": "node tools/test_anim_resolve.mjs && node tools/validate_catalogue.mjs && node tools/test_input_bus.mjs && node tools/test_launcher_controls.mjs && node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs && python3 tools/sprite_catalogue/test_crop_check.py",
+    "test": "node tools/test_anim_resolve.mjs && node tools/validate_catalogue.mjs && node tools/test_input_bus.mjs && node tools/test_launcher_controls.mjs && node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs && python3 tools/sprite_catalogue/test_crop_check.py && node tools/test_sprite_catalogue_resolve.mjs",
```

(These diffs assume the sprite-catalogue-system plan has already been executed, adding the two lines being diffed against. If it hasn't yet, add `test:catalogue-resolve` as a new script and append `&& node tools/test_sprite_catalogue_resolve.mjs` to whatever the current `test` chain is instead.)

- [ ] **Step 6: Run the full test chain**

Run: `cd apps/amo && npm test`
Expected: all suites pass, ending with `✓ spriteCatalogueResolve tests passed (11 assertions).`

- [ ] **Step 7: Commit**

```bash
cd apps/amo
git add src/systems/spriteCatalogueResolve.js tools/test_sprite_catalogue_resolve.mjs package.json
git commit -m "feat(maps): sprite catalogue entry resolver"
```

---

### Task 2: Map decoration/tileset placement logic (pure)

**Files:**
- Create: `apps/amo/src/systems/mapDecorPlacement.js`
- Create: `apps/amo/tools/test_map_decor_placement.mjs`

**Interfaces:**
- Consumes: a `resolve(ref) → {textureKey, x, y, w, h, frameIndex?}` callback matching `resolveCatalogueRef`'s return shape from Task 1 (dependency-injected, not imported directly — this module has no Phaser/scene dependency at all).
- Produces: `resolveTilesetFrames(tsDef, resolve) → {floorFrame, pathFrame, decorFrames, decorRate}` and `computeDecorationPlacements(decorations, resolve, tileSize) → [{textureKey, cropX, cropY, cropW, cropH, px, py, depth, blocking}]`, both named exports. Task 5 (`GameScene.js`) calls both, passing `(ref) => resolveCatalogueRef(this, ref)` as `resolve`.

- [ ] **Step 1: Write the failing test**

Create `apps/amo/tools/test_map_decor_placement.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Unit tests for mapDecorPlacement.js. Pure assertions — `resolve` is a
 * plain stub function, no Phaser/scene involved.
 * Run: node tools/test_map_decor_placement.mjs
 */
import { resolveTilesetFrames, computeDecorationPlacements } from '../src/systems/mapDecorPlacement.js';

let passed = 0;
const fails = [];
function check(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}

// ── resolveTilesetFrames: legacy raw-int fields (no resolve calls) ──────────
{
    const tsDef = { key: 'terrain_atlas', floorFrame: 118, pathFrame: 851, decorFrames: [181, 182, 183], decorRate: 0.15 };
    const resolve = () => { throw new Error('resolve should not be called for legacy fields'); };
    const result = resolveTilesetFrames(tsDef, resolve);
    check(
        'legacy fields pass through unchanged',
        result.floorFrame === 118 && result.pathFrame === 851 &&
        JSON.stringify(result.decorFrames) === JSON.stringify([181, 182, 183]) &&
        result.decorRate === 0.15
    );
}

// ── resolveTilesetFrames: new catalogue-ref fields ──────────────────────────
{
    const tsDef = {
        key: 'terrain_atlas',
        floor: { sheet: 'lpc/terrain_atlas', name: 'grass_plain' },
        path: { sheet: 'lpc/terrain_atlas', name: 'dirt_path' },
        decor: [
            { sheet: 'lpc/terrain_atlas', name: 'grass_flower_a' },
            { sheet: 'lpc/terrain_atlas', name: 'grass_flower_b' },
        ],
        decorRate: 0.2,
    };
    const frameByName = { grass_plain: 100, dirt_path: 200, grass_flower_a: 300, grass_flower_b: 301 };
    const resolve = (ref) => ({ frameIndex: frameByName[ref.name] });
    const result = resolveTilesetFrames(tsDef, resolve);
    check(
        'catalogue-ref fields resolve via callback',
        result.floorFrame === 100 && result.pathFrame === 200 &&
        JSON.stringify(result.decorFrames) === JSON.stringify([300, 301]) &&
        result.decorRate === 0.2
    );
}

// ── resolveTilesetFrames: no tileset def at all → defaults ──────────────────
{
    const result = resolveTilesetFrames(undefined, () => { throw new Error('should not be called'); });
    check(
        'no tileset def → sane defaults',
        result.floorFrame === 1 && result.pathFrame === 5 && result.decorFrames === null && result.decorRate === 0
    );
}

// ── computeDecorationPlacements ──────────────────────────────────────────────
{
    const decorations = [
        { sheet: 'lpc/trunk', name: 'oak_trunk_a', x: 5, y: 10, blocking: true },
        { sheet: 'lpc/treetop', name: 'oak_top_a', x: 5, y: 10, depthOffset: 2000 },
    ];
    const frames = {
        oak_trunk_a: { textureKey: 'lpc/trunk', x: 0, y: 0, w: 96, h: 96 },
        oak_top_a: { textureKey: 'lpc/treetop', x: 0, y: 0, w: 96, h: 112 },
    };
    const resolve = (ref) => frames[ref.name];
    const placements = computeDecorationPlacements(decorations, resolve, 32);

    check('two placements computed', placements.length === 2);
    check(
        'trunk placement: pixel position + depth + blocking',
        placements[0].px === 5 * 32 + 16 && placements[0].py === 10 * 32 + 16 &&
        placements[0].depth === (10 * 32 + 16) && placements[0].blocking === true &&
        placements[0].textureKey === 'lpc/trunk' &&
        placements[0].cropW === 96 && placements[0].cropH === 96
    );
    check(
        'treetop placement: depthOffset applied, not blocking',
        placements[1].depth === (10 * 32 + 16) + 2000 && placements[1].blocking === false
    );
}

// ── computeDecorationPlacements: empty/missing list ─────────────────────────
{
    check('undefined decorations -> empty array', computeDecorationPlacements(undefined, () => {}, 32).length === 0);
    check('empty decorations -> empty array', computeDecorationPlacements([], () => {}, 32).length === 0);
}

if (fails.length) {
    console.error(`✗ mapDecorPlacement tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ mapDecorPlacement tests passed (${passed} assertions).`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/amo && node tools/test_map_decor_placement.mjs`
Expected: FAIL — `Cannot find module '../src/systems/mapDecorPlacement.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/amo/src/systems/mapDecorPlacement.js`:

```javascript
/**
 * Pure map-data → render-parameter transforms for the catalogue-driven
 * tileset/decorations mechanism. No Phaser dependency: both functions take
 * a `resolve(ref) -> {textureKey, x, y, w, h, frameIndex?}` callback
 * (GameScene passes `(ref) => resolveCatalogueRef(this, ref)`), so they're
 * directly unit-testable with a plain stub function.
 */

/**
 * Resolves a map's tileset floor/path/decor fields to raw frame indices.
 * Supports both the legacy raw-int fields (floorFrame/pathFrame/decorFrames,
 * used unchanged by existing maps) and the new catalogue-ref fields
 * (floor/path/decor) — the new field name is checked first; `resolve` is
 * only called for fields that are actually catalogue refs.
 */
export function resolveTilesetFrames(tsDef, resolve) {
    const floorFrame = tsDef?.floor
        ? resolve(tsDef.floor).frameIndex
        : tsDef?.floorFrame ?? 1;
    const pathFrame = tsDef?.path
        ? resolve(tsDef.path).frameIndex
        : tsDef?.pathFrame ?? 5;
    const decorFrames = tsDef?.decor
        ? tsDef.decor.map(ref => resolve(ref).frameIndex)
        : tsDef?.decorFrames ?? null;
    const decorRate = tsDef?.decorRate ?? 0;
    return { floorFrame, pathFrame, decorFrames, decorRate };
}

/**
 * Computes concrete render parameters for a map's `decorations` list.
 * `x`/`y` on each definition are tile coordinates; `tileSize` converts them
 * to pixels the same way the existing `spawns` arrays do.
 */
export function computeDecorationPlacements(decorations, resolve, tileSize) {
    return (decorations ?? []).map(def => {
        const frame = resolve({ sheet: def.sheet, name: def.name });
        const px = def.x * tileSize + tileSize / 2;
        const py = def.y * tileSize + tileSize / 2;
        return {
            textureKey: frame.textureKey,
            cropX: frame.x, cropY: frame.y, cropW: frame.w, cropH: frame.h,
            px, py,
            depth: py + (def.depthOffset ?? 0),
            blocking: !!def.blocking,
        };
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/amo && node tools/test_map_decor_placement.mjs`
Expected: `✓ mapDecorPlacement tests passed (8 assertions).`

- [ ] **Step 5: Wire the npm scripts**

In `apps/amo/package.json`:

```diff
     "test:catalogue-resolve": "node tools/test_sprite_catalogue_resolve.mjs",
+    "test:decor-placement": "node tools/test_map_decor_placement.mjs",
```

```diff
- ... && node tools/test_sprite_catalogue_resolve.mjs",
+ ... && node tools/test_sprite_catalogue_resolve.mjs && node tools/test_map_decor_placement.mjs",
```

- [ ] **Step 6: Run the full test chain**

Run: `cd apps/amo && npm test`
Expected: all suites pass, ending with `✓ mapDecorPlacement tests passed (8 assertions).`

- [ ] **Step 7: Commit**

```bash
cd apps/amo
git add src/systems/mapDecorPlacement.js tools/test_map_decor_placement.mjs package.json
git commit -m "feat(maps): pure tileset/decoration placement logic"
```

---

### Task 3: Sprite catalogue manifest generator

**Files:**
- Create: `apps/amo/tools/sprite_catalogue/gen_manifest.js`
- Create: `apps/amo/tools/sprite_catalogue/test_gen_manifest.mjs`

**Interfaces:**
- Produces: `buildManifest(catalogedRoot: string) → [{sheetKey, pngPath, catPath}]`, a named export from `gen_manifest.js`. Task 4 (`BootScene.js`) consumes the CLI's output file (`src/data/sprite_catalogue_manifest.json`), an array of these same objects.

- [ ] **Step 1: Write the failing test**

Create `apps/amo/tools/sprite_catalogue/test_gen_manifest.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Unit tests for gen_manifest.js's buildManifest().
 * Run: node tools/sprite_catalogue/test_gen_manifest.mjs
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildManifest } from './gen_manifest.js';

let passed = 0;
const fails = [];
function check(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}

// ── missing catalogued/ dir → empty manifest, no throw ──────────────────────
{
    const tmp = mkdtempSync(join(tmpdir(), 'gen-manifest-test-'));
    const manifest = buildManifest(join(tmp, 'does-not-exist'));
    check('missing catalogued/ -> empty manifest', Array.isArray(manifest) && manifest.length === 0);
    rmSync(tmp, { recursive: true, force: true });
}

// ── one catalogued sheet, nested path ───────────────────────────────────────
{
    const tmp = mkdtempSync(join(tmpdir(), 'gen-manifest-test-'));
    const sheetDir = join(tmp, 'tilesets', 'lpc');
    mkdirSync(sheetDir, { recursive: true });
    writeFileSync(join(sheetDir, 'trunk.png'), 'fake-png-bytes');
    writeFileSync(join(sheetDir, 'trunk.catalogue.json'), JSON.stringify({ source: 'trunk.png' }));

    const manifest = buildManifest(tmp);
    check('one sheet found', manifest.length === 1);
    check('sheetKey computed correctly', manifest[0].sheetKey === 'tilesets/lpc/trunk');
    check('pngPath computed correctly', manifest[0].pngPath === 'assets/catalogued/tilesets/lpc/trunk.png');
    check('catPath computed correctly', manifest[0].catPath === 'assets/catalogued/tilesets/lpc/trunk.catalogue.json');

    rmSync(tmp, { recursive: true, force: true });
}

// ── multiple sheets across directories ──────────────────────────────────────
{
    const tmp = mkdtempSync(join(tmpdir(), 'gen-manifest-test-'));
    mkdirSync(join(tmp, 'tilesets', 'lpc'), { recursive: true });
    mkdirSync(join(tmp, 'characters'), { recursive: true });
    writeFileSync(join(tmp, 'tilesets', 'lpc', 'trunk.png'), 'x');
    writeFileSync(join(tmp, 'tilesets', 'lpc', 'trunk.catalogue.json'), JSON.stringify({ source: 'trunk.png' }));
    writeFileSync(join(tmp, 'characters', 'deer.png'), 'x');
    writeFileSync(join(tmp, 'characters', 'deer.catalogue.json'), JSON.stringify({ source: 'deer.png' }));

    const manifest = buildManifest(tmp);
    check('two sheets found', manifest.length === 2);
    check(
        'sheetKeys include both',
        manifest.some(m => m.sheetKey === 'tilesets/lpc/trunk') &&
        manifest.some(m => m.sheetKey === 'characters/deer')
    );

    rmSync(tmp, { recursive: true, force: true });
}

if (fails.length) {
    console.error(`✗ gen_manifest tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ gen_manifest tests passed (${passed} assertions).`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/amo && node tools/sprite_catalogue/test_gen_manifest.mjs`
Expected: FAIL — `Cannot find module './gen_manifest.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/amo/tools/sprite_catalogue/gen_manifest.js`:

```javascript
#!/usr/bin/env node
/**
 * Scans public/assets/catalogued/**\/*.catalogue.json and writes
 * src/data/sprite_catalogue_manifest.json — a flat list of every catalogued
 * sheet's { sheetKey, pngPath, catPath }, so BootScene can register every
 * sheet's texture/json without a hand-written per-sheet load call.
 *
 * sheetKey = path relative to public/assets/catalogued/, minus extension
 *   (e.g. public/assets/catalogued/tilesets/lpc/trunk.catalogue.json
 *    -> sheetKey "tilesets/lpc/trunk")
 *
 * Run from apps/amo/:  node tools/sprite_catalogue/gen_manifest.js
 *   (or: npm run gen:sprite-manifest)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, dirname } from 'path';

const CATALOGUED_ROOT = './public/assets/catalogued';
const OUT_FILE = './src/data/sprite_catalogue_manifest.json';

function walk(dir) {
    let out = [];
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) out = out.concat(walk(full));
        else if (name.endsWith('.catalogue.json')) out.push(full);
    }
    return out;
}

/** Builds the manifest array by scanning `root` for *.catalogue.json files. */
export function buildManifest(root) {
    let catFiles;
    try {
        catFiles = walk(root);
    } catch (e) {
        if (e.code === 'ENOENT') return []; // no catalogued/ dir yet
        throw e;
    }
    return catFiles.map(catPath => {
        const rel = relative(root, catPath);                      // tilesets/lpc/trunk.catalogue.json
        const sheetKey = rel.replace(/\.catalogue\.json$/, '');    // tilesets/lpc/trunk
        const cat = JSON.parse(readFileSync(catPath, 'utf8'));
        return {
            sheetKey,
            pngPath: join('assets/catalogued', dirname(rel), cat.source),
            catPath: join('assets/catalogued', rel),
        };
    });
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const manifest = buildManifest(CATALOGUED_ROOT);
    writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`wrote ${OUT_FILE} (${manifest.length} catalogued sheet(s))`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/amo && node tools/sprite_catalogue/test_gen_manifest.mjs`
Expected: `✓ gen_manifest tests passed (7 assertions).`

- [ ] **Step 5: Generate the initial (empty) manifest and wire npm scripts**

Run from `apps/amo/`:

```bash
node tools/sprite_catalogue/gen_manifest.js
```

Expected: `wrote ./src/data/sprite_catalogue_manifest.json (0 catalogued sheet(s))` — no sheets have been catalogued yet, so `src/data/sprite_catalogue_manifest.json` is created containing `[]`.

In `apps/amo/package.json`:

```diff
     "gen:anims": "node tools/annotate_anims.js",
+    "gen:sprite-manifest": "node tools/sprite_catalogue/gen_manifest.js",
```

```diff
     "test:decor-placement": "node tools/test_map_decor_placement.mjs",
+    "test:gen-manifest": "node tools/sprite_catalogue/test_gen_manifest.mjs",
```

```diff
- ... && node tools/test_map_decor_placement.mjs",
+ ... && node tools/test_map_decor_placement.mjs && node tools/sprite_catalogue/test_gen_manifest.mjs",
```

- [ ] **Step 6: Run the full test chain**

Run: `cd apps/amo && npm test`
Expected: all suites pass, ending with `✓ gen_manifest tests passed (7 assertions).`

- [ ] **Step 7: Commit**

```bash
cd apps/amo
git add tools/sprite_catalogue/gen_manifest.js \
        tools/sprite_catalogue/test_gen_manifest.mjs \
        src/data/sprite_catalogue_manifest.json \
        package.json
git commit -m "feat(maps): sprite catalogue manifest generator"
```

---

### Task 4: BootScene loads catalogued sheets from the manifest

**Files:**
- Modify: `apps/amo/src/scenes/BootScene.js:1-4` (imports), `:180-182` (end of `preload()`)

**Interfaces:**
- Consumes: `src/data/sprite_catalogue_manifest.json` (array of `{sheetKey, pngPath, catPath}`) from Task 3.

- [ ] **Step 1: Add the manifest import**

In `apps/amo/src/scenes/BootScene.js`, add near the top (after `import Phaser from 'phaser';`):

```diff
 import Phaser from 'phaser';
+import SPRITE_CATALOGUE_MANIFEST from '../data/sprite_catalogue_manifest.json';
```

- [ ] **Step 2: Loop the manifest at the end of `preload()`**

In `apps/amo/src/scenes/BootScene.js`, right before the closing `}` of `preload()` (immediately after the existing `this.load.image('menu_bg', 'assets/game_cover.png');` line):

```diff
         this.load.image('menu_bg', 'assets/game_cover.png');
+
+        // Catalogued sprite sheets — auto-registered from the generated
+        // manifest; a new catalogued sheet needs zero edits here.
+        for (const entry of SPRITE_CATALOGUE_MANIFEST) {
+            this.load.image(entry.sheetKey, entry.pngPath);
+            this.load.json(entry.sheetKey + '_cat', entry.catPath);
+        }
     }
```

- [ ] **Step 3: Verify the dev server still boots cleanly**

Run: `cd apps/amo && npm run dev`

Open the served URL in a browser. Expected: the game boots to the main menu exactly as before (the manifest is currently `[]`, so this loop is a no-op) — no console errors about a missing `sprite_catalogue_manifest.json` import or JSON parse failure. Stop the dev server (Ctrl-C) once confirmed.

- [ ] **Step 4: Commit**

```bash
cd apps/amo
git add src/scenes/BootScene.js
git commit -m "feat(maps): BootScene auto-registers catalogued sheets from the manifest"
```

---

### Task 5: GameScene renders decorations and catalogue-referenced tileset frames

**Files:**
- Modify: `apps/amo/src/scenes/GameScene.js` (imports near line 24; `_buildWorld` at line 2345)

**Interfaces:**
- Consumes: `resolveCatalogueRef` from Task 1, `resolveTilesetFrames`/`computeDecorationPlacements` from Task 2.

- [ ] **Step 1: Add the imports**

In `apps/amo/src/scenes/GameScene.js`, after the existing `import { openChest } from './ChestScene.js';` line:

```diff
 import { openChest } from './ChestScene.js';
+import { resolveCatalogueRef } from '../systems/spriteCatalogueResolve.js';
+import { resolveTilesetFrames, computeDecorationPlacements } from '../systems/mapDecorPlacement.js';
```

- [ ] **Step 2: Replace `_buildWorld`'s tileset-field reading and tree loop**

In `apps/amo/src/scenes/GameScene.js`, replace the entire existing `_buildWorld` method (currently lines 2345–2390) with:

```javascript
    _buildWorld(mapW, mapH) {
        // Floor layer — tileset is per-map (falls back to default Pipoya chip).
        // Supports both legacy raw-int fields and new catalogue-ref fields.
        const tsDef = this._mapDef.tileset;
        const tsKey = tsDef?.key ?? 'tileset_base';
        const resolveRef = (ref) => resolveCatalogueRef(this, ref);
        const { floorFrame, pathFrame, decorFrames, decorRate } = resolveTilesetFrames(tsDef, resolveRef);

        const tiles = this._mapDef.tiles;
        const floorData = tiles.map(row =>
            row.map(tile => {
                if (tile === 2) return pathFrame;
                if (decorFrames && Math.random() < decorRate)
                    return decorFrames[Math.floor(Math.random() * decorFrames.length)];
                return floorFrame;
            })
        );
        const tilemap = this.make.tilemap({ data: floorData, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
        const tileset = tilemap.addTilesetImage(tsKey, tsKey);
        tilemap.createLayer(0, tileset, 0, 0).setDepth(0);

        // Wall bodies for solid tiles (tile === 1). Trees themselves no
        // longer render here — see _placeDecorations().
        tiles.forEach((row, r) => {
            row.forEach((tile, c) => {
                if (tile === 1) {
                    const x = c * TILE_SIZE + TILE_SIZE / 2;
                    const y = r * TILE_SIZE + TILE_SIZE / 2;
                    const wall = this.wallGroup.create(x, y, 'tile_tree');
                    wall.setAlpha(0);
                    wall.refreshBody();
                }
            });
        });

        this._placeDecorations();
    }

    _placeDecorations() {
        const resolveRef = (ref) => resolveCatalogueRef(this, ref);
        const placements = computeDecorationPlacements(this._mapDef.decorations, resolveRef, TILE_SIZE);
        placements.forEach(p => {
            const img = this.add.image(p.px, p.py, p.textureKey);
            img.setCrop(p.cropX, p.cropY, p.cropW, p.cropH);
            img.setDepth(p.depth);

            if (p.blocking) {
                const wall = this.wallGroup.create(p.px, p.py, 'tile_tree');
                wall.setAlpha(0);
                wall.refreshBody();
            }
        });
    }
```

Note: `tile === 1` still creates a wall-collision body (map authors may still want plain solid/impassable tiles that aren't visual decorations — e.g. cave walls), but no longer draws a hardcoded tree on top of it. Tree *visuals* now come exclusively from `decorations` entries.

- [ ] **Step 3: Run the automated regression suite**

Run: `cd apps/amo && npm test`
Expected: all suites pass (this change doesn't touch any of the pure logic under test — it's Phaser glue code consuming Tasks 1–2's already-tested functions).

- [ ] **Step 4: Manually verify the legacy tileset path still renders correctly**

Run: `cd apps/amo && npm run dev`

In the browser, navigate to the `eldrin_tower` map (the only existing map with an explicit `tileset` def — legacy `floorFrame: 118, pathFrame: 851, decorFrames: [181, 182, 183]`). Expected: floor/path/decoration tiles render identically to before this change (this map's `tileset` fields are still the legacy raw-int form, so `resolveTilesetFrames` passes them through unchanged without calling `resolveRef` at all). No console errors. Stop the dev server once confirmed.

- [ ] **Step 5: Commit**

```bash
cd apps/amo
git add src/scenes/GameScene.js
git commit -m "feat(maps): generic catalogue-driven decorations + tileset frame resolution"
```

---

### Task 6: Legacy tree migration tool (blocked — tool only, not run against real maps yet)

**Files:**
- Create: `apps/amo/tools/sprite_catalogue/tile_trees_to_decorations.js`
- Create: `apps/amo/tools/sprite_catalogue/test_tile_trees_to_decorations.mjs`

**Interfaces:**
- Produces: `tileTreesToDecorations(tiles: number[][], trunkRef: {sheet, name}, treetopRef: {sheet, name}) → decorations[]`, a named export. Not consumed by any other task in this plan — this is a standalone conversion tool for the blocked follow-up described in the spec's "Migration of the 4 legacy maps" section.

This task is **not blocked** (the tool itself is fully buildable and testable now, using arbitrary test sheet/name values). Only *running* the tool against the real `tilesets/lpc/trunk`/`tilesets/lpc/treetop` catalogue entry names — and pasting its output into the 4 legacy maps — is blocked, since those sheets aren't catalogued yet. Do not perform that follow-up as part of this task; it happens later, once real catalogue entry names exist.

- [ ] **Step 1: Write the failing test**

Create `apps/amo/tools/sprite_catalogue/test_tile_trees_to_decorations.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Unit tests for tile_trees_to_decorations.js's tileTreesToDecorations().
 * Run: node tools/sprite_catalogue/test_tile_trees_to_decorations.mjs
 */
import { tileTreesToDecorations } from './tile_trees_to_decorations.js';

let passed = 0;
const fails = [];
function check(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}

const tiles = [
    [0, 1, 0],
    [1, 0, 1],
];
const trunkRef = { sheet: 'tilesets/lpc/trunk', name: 'test_trunk' };
const treetopRef = { sheet: 'tilesets/lpc/treetop', name: 'test_treetop' };
const decorations = tileTreesToDecorations(tiles, trunkRef, treetopRef);

check('3 tree tiles -> 6 entries (trunk+treetop pair each)', decorations.length === 6);
check(
    'first tree (row 0, col 1): trunk entry correct',
    decorations[0].x === 1 && decorations[0].y === 0 &&
    decorations[0].sheet === 'tilesets/lpc/trunk' && decorations[0].name === 'test_trunk' &&
    decorations[0].blocking === true
);
check(
    'first tree: treetop entry pairs with it',
    decorations[1].x === 1 && decorations[1].y === 0 &&
    decorations[1].sheet === 'tilesets/lpc/treetop' && decorations[1].name === 'test_treetop' &&
    decorations[1].depthOffset === 2000
);
check('second tree at (row 1, col 0)', decorations[2].x === 0 && decorations[2].y === 1);
check('third tree at (row 1, col 2)', decorations[4].x === 2 && decorations[4].y === 1);

// ── no trees → empty output ──────────────────────────────────────────────────
check('no tree tiles -> empty array', tileTreesToDecorations([[0, 0], [2, 0]], trunkRef, treetopRef).length === 0);

if (fails.length) {
    console.error(`✗ tile_trees_to_decorations tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ tile_trees_to_decorations tests passed (${passed} assertions).`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/amo && node tools/sprite_catalogue/test_tile_trees_to_decorations.mjs`
Expected: FAIL — `Cannot find module './tile_trees_to_decorations.js'`.

- [ ] **Step 3: Write the implementation**

Create `apps/amo/tools/sprite_catalogue/tile_trees_to_decorations.js`:

```javascript
#!/usr/bin/env node
/**
 * Converts a map's legacy `tile === 1` tree cells into `decorations` entries
 * (a trunk + treetop pair per tree, trunk blocking, treetop offset above
 * everything). This is the blocked-task helper described in
 * docs/superpowers/specs/2026-08-26-map-format-renderer-upgrade-design.md
 * ("Migration of the 4 legacy maps") — it does NOT run automatically
 * against real map data; it's a tool to run manually once
 * tilesets/lpc/trunk and tilesets/lpc/treetop are actually catalogued and
 * their real entry names are known.
 *
 * This does NOT rewrite the map file for you — it prints a `decorations`
 * array (formatted JSON) to stdout, which you paste into the target map's
 * export by hand, alongside changing that map's former tree tiles from
 * `1` to `0` in its `tiles` grid.
 *
 * Usage (once real names exist):
 *   node tools/sprite_catalogue/tile_trees_to_decorations.js \
 *     --map ../src/data/maps/northern_forest.js \
 *     --trunk-sheet tilesets/lpc/trunk --trunk-name <real_trunk_entry_name> \
 *     --treetop-sheet tilesets/lpc/treetop --treetop-name <real_treetop_entry_name>
 *
 * The target map module must export its tile grid under a name ending in
 * `_TILES` (all 4 legacy maps already do — e.g. `DENSE_TILES` in
 * northern_forest.js).
 */

/** Pure conversion: tile grid + trunk/treetop refs -> decorations array. */
export function tileTreesToDecorations(tiles, trunkRef, treetopRef) {
    const out = [];
    tiles.forEach((row, y) => {
        row.forEach((tile, x) => {
            if (tile === 1) {
                out.push({ sheet: trunkRef.sheet, name: trunkRef.name, x, y, blocking: true });
                out.push({ sheet: treetopRef.sheet, name: treetopRef.name, x, y, depthOffset: 2000 });
            }
        });
    });
    return out;
}

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
    return args;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const args = parseArgs(process.argv.slice(2));
    const required = ['map', 'trunk-sheet', 'trunk-name', 'treetop-sheet', 'treetop-name'];
    if (required.some(k => !args[k])) {
        console.error(
            'usage: node tile_trees_to_decorations.js --map <path/to/map.js> ' +
            '--trunk-sheet <sheetKey> --trunk-name <entryName> ' +
            '--treetop-sheet <sheetKey> --treetop-name <entryName>'
        );
        process.exit(1);
    }
    const mod = await import(args.map);
    const tilesExportName = Object.keys(mod).find(k => k.endsWith('_TILES'));
    if (!tilesExportName) {
        console.error(`no export ending in "_TILES" found in ${args.map}`);
        process.exit(1);
    }
    const decorations = tileTreesToDecorations(
        mod[tilesExportName],
        { sheet: args['trunk-sheet'], name: args['trunk-name'] },
        { sheet: args['treetop-sheet'], name: args['treetop-name'] }
    );
    console.log(JSON.stringify(decorations, null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/amo && node tools/sprite_catalogue/test_tile_trees_to_decorations.mjs`
Expected: `✓ tile_trees_to_decorations tests passed (6 assertions).`

- [ ] **Step 5: Wire the npm scripts**

In `apps/amo/package.json`:

```diff
     "test:gen-manifest": "node tools/sprite_catalogue/test_gen_manifest.mjs",
+    "test:tile-trees-migration": "node tools/sprite_catalogue/test_tile_trees_to_decorations.mjs",
```

```diff
- ... && node tools/sprite_catalogue/test_gen_manifest.mjs",
+ ... && node tools/sprite_catalogue/test_gen_manifest.mjs && node tools/sprite_catalogue/test_tile_trees_to_decorations.mjs",
```

- [ ] **Step 6: Run the full test chain**

Run: `cd apps/amo && npm test`
Expected: all suites pass, ending with `✓ tile_trees_to_decorations tests passed (6 assertions).`

- [ ] **Step 7: Commit**

```bash
cd apps/amo
git add tools/sprite_catalogue/tile_trees_to_decorations.js \
        tools/sprite_catalogue/test_tile_trees_to_decorations.mjs \
        package.json
git commit -m "feat(maps): legacy tree-to-decorations migration tool (not yet run against real maps)"
```

---

## Follow-up (explicitly not part of this plan)

Once `tilesets/lpc/trunk` and `tilesets/lpc/treetop` are actually catalogued
(sub-project 1 execution) and their real entry names are known, run Task 6's
tool against each of the 4 legacy maps (`prologue_forest`, `eldrin_tower`,
`northern_forest`, `hermit_hut`), paste its output into each map's
`decorations` array, and change their former `tile === 1` tree cells to `0`.
This is a separate, small follow-up task once that data exists — it is not
included as an executable task here because the real catalogue entry names
don't exist yet, and fabricating placeholder names would produce output that
has to be redone anyway.

## Plan Self-Review Notes

- **Spec coverage:** Catalogue-referenced tileset fields → Task 2 (`resolveTilesetFrames`, dual-path legacy/new) + Task 5 (wiring). Decorations list/placement → Task 2 (`computeDecorationPlacements`) + Task 5 (`_placeDecorations`). Manifest generation → Task 3. BootScene auto-registration → Task 4. Resolver (`{sheet,name}` → drawable frame) → Task 1. Migration of legacy maps → Task 6 (tool, built/tested now) + explicit Follow-up section (running it, deferred). Non-goals (which sheets get catalogued, lore-driven spec process, real map content) correctly left undone.
- **Placeholder scan:** No TBD/TODO; every step has complete, runnable code. Task 6 does not fabricate real catalogue entry names — it builds and tests the conversion tool against arbitrary test names, which is the honest way to handle a task genuinely blocked on data that doesn't exist yet.
- **Type/interface consistency:** `resolveCatalogueRef`'s return shape (`{textureKey, x, y, w, h, frameIndex?}`) from Task 1 matches exactly what Task 2's `resolve` callback parameter is documented and tested to receive/produce (`resolveTilesetFrames` reads `.frameIndex`; `computeDecorationPlacements` reads `.textureKey/.x/.y/.w/.h`). Task 5's `GameScene.js` wiring calls both with the exact signatures Task 1/2 export. `TILE_SIZE` is already imported in `GameScene.js` from `../data/worldMap.js` (verified in the existing file) — Task 5 doesn't need to add that import.
