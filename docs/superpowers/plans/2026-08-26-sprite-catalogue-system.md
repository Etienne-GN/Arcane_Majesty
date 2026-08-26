# Sprite Catalogue System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tooling (crop-check script, validator, opencode instructions) that lets spritesheets be annotated with named, pixel-accurate regions — replacing "guess the frame index" with "look up `oak_tree_large`."

**Architecture:** Two small standalone CLI tools under `apps/amo/tools/sprite_catalogue/` — a PIL-based crop tool opencode uses to self-verify its coordinate guesses, and a dependency-free Node validator that acts as the hard trust gate on a finished `*.catalogue.json` sidecar file — plus a self-contained instruction document that hands opencode the schema and the exact verification loop to follow.

**Tech Stack:** Node (ESM, no deps) for the validator, matching `apps/amo/tools/validate_catalogue.mjs`. Python 3 + PIL for the crop tool, matching `apps/amo/tools/audit_oversize.py`. Both patterns already exist in this repo's `tools/` directory.

**Spec:** `docs/superpowers/specs/2026-08-26-sprite-catalogue-system-design.md`

## Global Constraints

- All new files live under `apps/amo/tools/sprite_catalogue/`.
- `validate_sprite_catalogue.mjs` is pure Node — no npm dependencies, reads PNG dimensions straight from the IHDR chunk (mirrors `validate_catalogue.mjs`).
- `crop_check.py` uses PIL (already a available; mirrors `audit_oversize.py`).
- Catalogue entry `name` must be unique within its file, snake_case, descriptive.
- `kind: "tile"` entries require the sheet-level grid fields (`gridTileWidth`, `gridTileHeight`, `gridCols`, `gridRows`); `kind: "object"` entries never need them.
- `frameIndex` for a tile entry must equal `row * gridCols + col`.
- A sheet is annotated in place (raw location under `public/assets/`); on a clean validator pass, both the source PNG and its `*.catalogue.json` relocate to the mirrored path under `public/assets/catalogued/`. A sheet already inside `catalogued/` is left in place.
- Out of scope for this plan: which spritesheets actually get catalogued, how the map renderer consumes catalogue entries by name, and any aggregate cross-file search index (explicitly declined in the spec).

---

### Task 1: Sprite catalogue validator (hard trust gate)

**Files:**
- Create: `apps/amo/tools/sprite_catalogue/validate_sprite_catalogue.mjs`
- Create: `apps/amo/tools/sprite_catalogue/test_validate_sprite_catalogue.mjs`
- Create: `apps/amo/tools/sprite_catalogue/test_fixtures/mini_object_sheet.png` (64×32, solid color)
- Create: `apps/amo/tools/sprite_catalogue/test_fixtures/mini_tile_sheet.png` (64×64, solid color, treated as a 2×2 grid of 32×32 tiles)
- Modify: `apps/amo/package.json` (add `test:sprite-catalogue` script, append it to the `test` chain)

**Interfaces:**
- Produces: `validateCatalogueObject(cat: object, baseDir: string) → { errors: string[], warnings: string[] }`, `validateCatalogueFile(catPath: string) → { errors: string[], warnings: string[] }`, `relocatedPath(path: string, assetsMarker?: string) → string`, and `relocateToCatalogued(paths: string[], assetsMarker?: string) → { from: string, to: string }[]`, all named exports from `validate_sprite_catalogue.mjs`. Task 3's `OPENCODE_PROMPT.md` references this file's CLI usage (`node validate_sprite_catalogue.mjs <file.catalogue.json>`) including the on-success relocation into `public/assets/catalogued/`.

- [ ] **Step 1: Generate the two fixture PNGs**

Run from `apps/amo/`:

```bash
mkdir -p tools/sprite_catalogue/test_fixtures
python3 -c "
from PIL import Image
Image.new('RGBA', (64, 32), (0, 200, 0, 255)).save('tools/sprite_catalogue/test_fixtures/mini_object_sheet.png')
Image.new('RGBA', (64, 64), (200, 0, 0, 255)).save('tools/sprite_catalogue/test_fixtures/mini_tile_sheet.png')
"
```

Expected: two PNG files now exist at `tools/sprite_catalogue/test_fixtures/`. Confirm with `file tools/sprite_catalogue/test_fixtures/*.png` — both should report as PNG image data, 64 x 32 / 64 x 64 respectively.

- [ ] **Step 2: Write the failing test**

Create `apps/amo/tools/sprite_catalogue/test_validate_sprite_catalogue.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Unit tests for the sprite catalogue validator (validate_sprite_catalogue.mjs).
 * Pure assertions against in-memory catalogue objects + two real fixture PNGs.
 * Run: node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs
 *   (or: npm run test:sprite-catalogue)
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import {
    validateCatalogueObject,
    relocatedPath,
    relocateToCatalogued,
} from './validate_sprite_catalogue.mjs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'test_fixtures');

let passed = 0;
const fails = [];
function check(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}
function hasError(result, substring) {
    return result.errors.some(e => e.includes(substring));
}

// ── valid object-kind catalogue ─────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png',
        sheetWidth: 64, sheetHeight: 32,
        entries: [
            { name: 'thing_a', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: ['a'] },
            { name: 'thing_b', kind: 'object', x: 32, y: 0, w: 32, h: 32, tags: ['b'] },
        ],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('valid object catalogue → no errors', result.errors.length === 0);
    check('valid object catalogue → no warnings', result.warnings.length === 0);
}

// ── valid tile-kind catalogue ────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_tile_sheet.png',
        sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 2, gridRows: 2,
        entries: [
            { name: 'tile_br', kind: 'tile', row: 1, col: 1, frameIndex: 3, tags: ['x'] },
        ],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('valid tile catalogue → no errors', result.errors.length === 0);
}

// ── missing source ───────────────────────────────────────────────────────────
{
    const cat = { sheetWidth: 64, sheetHeight: 32, entries: [] };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('missing source → error', hasError(result, 'missing "source"'));
}

// ── sheet dims mismatch ──────────────────────────────────────────────────────
{
    const cat = { source: 'mini_object_sheet.png', sheetWidth: 999, sheetHeight: 999, entries: [] };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('dims mismatch → error', hasError(result, "doesn't match real PNG dims"));
}

// ── duplicate names ──────────────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [
            { name: 'dup', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: [] },
            { name: 'dup', kind: 'object', x: 32, y: 0, w: 32, h: 32, tags: [] },
        ],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('duplicate name → error', hasError(result, 'duplicate name: "dup"'));
}

// ── invalid kind ─────────────────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'weird', kind: 'sprite', x: 0, y: 0, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('invalid kind → error', hasError(result, 'invalid kind "sprite"'));
}

// ── tile entries without grid fields ────────────────────────────────────────
{
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        entries: [{ name: 'no_grid', kind: 'tile', row: 0, col: 0, frameIndex: 0, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('tile entry, missing grid fields → error', hasError(result, 'missing "gridCols"'));
}

// ── tile row/col out of range ───────────────────────────────────────────────
{
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 2, gridRows: 2,
        entries: [{ name: 'oob', kind: 'tile', row: 5, col: 0, frameIndex: 10, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('tile row out of range → error', hasError(result, 'row 5 out of range'));
}

// ── frameIndex mismatch ──────────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 2, gridRows: 2,
        entries: [{ name: 'bad_index', kind: 'tile', row: 1, col: 1, frameIndex: 0, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('frameIndex mismatch → error', hasError(result, 'frameIndex 0 !== row*gridCols+col (3)'));
}

// ── object bbox exceeds sheet bounds ────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'overflow', kind: 'object', x: 40, y: 0, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('bbox overflow → error', hasError(result, 'out of sheet bounds'));
}

// ── object bbox negative origin ─────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'negative', kind: 'object', x: -5, y: 0, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('negative origin → error', hasError(result, 'out of sheet bounds'));
}

// ── zero-size bbox ───────────────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'flat', kind: 'object', x: 0, y: 0, w: 0, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('zero width → error', hasError(result, 'w/h must be > 0'));
}

// ── lowConfidence is a warning, not an error ─────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'unsure', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: [], lowConfidence: true }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('lowConfidence → zero errors', result.errors.length === 0);
    check('lowConfidence → one warning', result.warnings.length === 1);
}

// ── relocatedPath: pure path computation ────────────────────────────────────
{
    const p = relocatedPath('apps/amo/public/assets/tilesets/foo.png');
    check('relocatedPath inserts catalogued/', p === 'apps/amo/public/assets/catalogued/tilesets/foo.png');
}
{
    const p = relocatedPath('apps/amo/public/assets/catalogued/tilesets/foo.png');
    check('relocatedPath is idempotent', p === 'apps/amo/public/assets/catalogued/tilesets/foo.png');
}
{
    let threw = false;
    try { relocatedPath('some/other/path/foo.png'); }
    catch { threw = true; }
    check('relocatedPath throws without an assets/ marker', threw);
}

// ── relocateToCatalogued: real filesystem move ──────────────────────────────
{
    const tmp = mkdtempSync(join(tmpdir(), 'sprite-catalogue-test-'));
    const rawDir = join(tmp, 'public', 'assets', 'tilesets');
    mkdirSync(rawDir, { recursive: true });
    const rawPng = join(rawDir, 'foo.png');
    const rawCat = join(rawDir, 'foo.catalogue.json');
    writeFileSync(rawPng, 'fake-png-bytes');
    writeFileSync(rawCat, '{}');

    const moved = relocateToCatalogued([rawPng, rawCat]);

    const destDir = join(tmp, 'public', 'assets', 'catalogued', 'tilesets');
    check('relocate moves the PNG', existsSync(join(destDir, 'foo.png')) && !existsSync(rawPng));
    check('relocate moves the catalogue.json', existsSync(join(destDir, 'foo.catalogue.json')) && !existsSync(rawCat));
    check('relocate reports both moves', moved.length === 2);

    rmSync(tmp, { recursive: true, force: true });
}

if (fails.length) {
    console.error(`✗ sprite-catalogue validator tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ sprite-catalogue validator tests passed (${passed} assertions).`);
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd apps/amo && node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs`
Expected: FAIL — `Cannot find module './validate_sprite_catalogue.mjs'` (the file doesn't exist yet).

- [ ] **Step 4: Write the validator implementation**

Create `apps/amo/tools/sprite_catalogue/validate_sprite_catalogue.mjs`:

```javascript
#!/usr/bin/env node
/**
 * Validator / trust gate for sprite catalogue sidecar files (*.catalogue.json).
 * Checks: declared sheet dimensions match the real source PNG, entry name
 * uniqueness, valid `kind`, tile row/col within the declared grid (+
 * frameIndex correctness), and object bounding boxes within sheet bounds.
 * Reports `lowConfidence` entries as non-fatal warnings.
 *
 * Pure Node (PNG header read only) — no deps. Mirrors validate_catalogue.mjs.
 *
 * Usage: node validate_sprite_catalogue.mjs <file.catalogue.json> [...more]
 */
import { readFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { dirname, join } from 'path';

const PNG_SIGNATURE = '89504e470d0a1a0a';
const ASSETS_MARKER = 'public/assets/';

/** width/height from a PNG's IHDR (bytes 16–23, big-endian). */
function pngSize(path) {
    const b = readFileSync(path);
    if (b.length < 24 || b.toString('hex', 0, 8) !== PNG_SIGNATURE) {
        throw new Error(`not a valid PNG: ${path}`);
    }
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/**
 * Validates an already-parsed catalogue object. `baseDir` is the directory
 * the catalogue file lives in, used to resolve `source` on disk.
 * Returns { errors: string[], warnings: string[] }.
 */
export function validateCatalogueObject(cat, baseDir) {
    const errors = [];
    const warnings = [];

    if (!cat.source) {
        errors.push('missing "source"');
    } else {
        const sourcePath = join(baseDir, cat.source);
        if (!existsSync(sourcePath)) {
            errors.push(`source file not found: ${sourcePath}`);
        } else {
            const real = pngSize(sourcePath);
            if (real.w !== cat.sheetWidth || real.h !== cat.sheetHeight) {
                errors.push(
                    `sheetWidth/sheetHeight (${cat.sheetWidth}x${cat.sheetHeight}) ` +
                    `doesn't match real PNG dims (${real.w}x${real.h})`
                );
            }
        }
    }

    const entries = cat.entries ?? [];
    const hasTileEntries = entries.some(e => e.kind === 'tile');
    const gridFields = ['gridTileWidth', 'gridTileHeight', 'gridCols', 'gridRows'];
    const gridComplete = gridFields.every(f => cat[f] != null);
    if (hasTileEntries && !gridComplete) {
        for (const f of gridFields) {
            if (cat[f] == null) errors.push(`missing "${f}" (required — file has "tile" entries)`);
        }
    }

    const seenNames = new Set();
    entries.forEach((e, i) => {
        const tag = e.name ? `"${e.name}"` : `entries[${i}]`;

        if (!e.name) {
            errors.push(`${tag}: missing "name"`);
        } else if (seenNames.has(e.name)) {
            errors.push(`duplicate name: "${e.name}"`);
        } else {
            seenNames.add(e.name);
        }

        if (e.kind !== 'tile' && e.kind !== 'object') {
            errors.push(`${tag}: invalid kind "${e.kind}" (must be "tile" or "object")`);
            return;
        }

        if (e.kind === 'tile') {
            if (!gridComplete) return; // already reported above
            if (!(e.row >= 0 && e.row < cat.gridRows)) {
                errors.push(`${tag}: row ${e.row} out of range [0, ${cat.gridRows})`);
            }
            if (!(e.col >= 0 && e.col < cat.gridCols)) {
                errors.push(`${tag}: col ${e.col} out of range [0, ${cat.gridCols})`);
            }
            const expected = e.row * cat.gridCols + e.col;
            if (e.frameIndex !== expected) {
                errors.push(`${tag}: frameIndex ${e.frameIndex} !== row*gridCols+col (${expected})`);
            }
        } else {
            const { x, y, w, h } = e;
            if (!(w > 0 && h > 0)) {
                errors.push(`${tag}: w/h must be > 0 (got ${w}x${h})`);
            }
            if (x < 0 || y < 0 || x + w > cat.sheetWidth || y + h > cat.sheetHeight) {
                errors.push(
                    `${tag}: bbox (${x},${y},${w},${h}) out of sheet bounds ` +
                    `(${cat.sheetWidth}x${cat.sheetHeight})`
                );
            }
        }

        if (e.lowConfidence) warnings.push(`${tag}: flagged lowConfidence — needs human review`);
    });

    return { errors, warnings };
}

/** Reads and parses a *.catalogue.json file, then validates it. */
export function validateCatalogueFile(catPath) {
    const cat = JSON.parse(readFileSync(catPath, 'utf8'));
    return validateCatalogueObject(cat, dirname(catPath));
}

/**
 * Maps a raw-pool path to its mirrored location under public/assets/catalogued/.
 * Idempotent: a path already inside catalogued/ is returned unchanged.
 * Throws if the path doesn't contain an `assetsMarker` segment at all.
 */
export function relocatedPath(path, assetsMarker = ASSETS_MARKER) {
    const idx = path.indexOf(assetsMarker);
    if (idx === -1) throw new Error(`path does not contain "${assetsMarker}": ${path}`);
    const prefix = path.slice(0, idx + assetsMarker.length);
    const rel = path.slice(idx + assetsMarker.length);
    if (rel.startsWith('catalogued/')) return path; // already relocated
    return join(prefix, 'catalogued', rel);
}

/**
 * Moves each path in `paths` to its relocatedPath() destination, creating
 * directories as needed. Paths already under catalogued/ are left in place.
 * Returns the list of moves actually performed.
 */
export function relocateToCatalogued(paths, assetsMarker = ASSETS_MARKER) {
    const moved = [];
    for (const p of paths) {
        const dest = relocatedPath(p, assetsMarker);
        if (dest === p) continue;
        mkdirSync(dirname(dest), { recursive: true });
        renameSync(p, dest);
        moved.push({ from: p, to: dest });
    }
    return moved;
}

// ── CLI entrypoint ──────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
    const files = process.argv.slice(2);
    if (!files.length) {
        console.error('usage: node validate_sprite_catalogue.mjs <file.catalogue.json> [...]');
        process.exit(1);
    }
    let hardFail = false;
    for (const f of files) {
        const { errors, warnings } = validateCatalogueFile(f);
        for (const w of warnings) console.warn(`⚠ ${f}: ${w}`);
        for (const e of errors) console.error(`✗ ${f}: ${e}`);
        if (errors.length) {
            hardFail = true;
            continue;
        }
        const cat = JSON.parse(readFileSync(f, 'utf8'));
        const sourcePath = join(dirname(f), cat.source);
        const moved = relocateToCatalogued([f, sourcePath]);
        const suffix = warnings.length ? ` (${warnings.length} warning(s))` : '';
        console.log(
            moved.length
                ? `✓ ${f} OK${suffix} — moved to ${dirname(relocatedPath(f))}/`
                : `✓ ${f} OK${suffix} — already in catalogued/`
        );
    }
    process.exit(hardFail ? 1 : 0);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd apps/amo && node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs`
Expected: `✓ sprite-catalogue validator tests passed (22 assertions).`

- [ ] **Step 6: Wire the npm scripts**

In `apps/amo/package.json`, add a new script and extend the existing `test` chain:

```diff
     "test:anim": "node tools/test_anim_resolve.mjs",
+    "test:sprite-catalogue": "node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs",
```

```diff
-    "test": "node tools/test_anim_resolve.mjs && node tools/validate_catalogue.mjs && node tools/test_input_bus.mjs && node tools/test_launcher_controls.mjs",
+    "test": "node tools/test_anim_resolve.mjs && node tools/validate_catalogue.mjs && node tools/test_input_bus.mjs && node tools/test_launcher_controls.mjs && node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs",
```

- [ ] **Step 7: Run the full test chain**

Run: `cd apps/amo && npm test`
Expected: all existing suites still pass, plus `✓ sprite-catalogue validator tests passed (22 assertions).` at the end.

- [ ] **Step 8: Commit**

```bash
cd apps/amo
git add tools/sprite_catalogue/validate_sprite_catalogue.mjs \
        tools/sprite_catalogue/test_validate_sprite_catalogue.mjs \
        tools/sprite_catalogue/test_fixtures/ \
        package.json
git commit -m "feat(sprite-catalogue): validator/trust-gate for *.catalogue.json sidecars"
```

---

### Task 2: Crop-check tool (opencode's self-verification loop)

**Files:**
- Create: `apps/amo/tools/sprite_catalogue/crop_check.py`
- Create: `apps/amo/tools/sprite_catalogue/test_crop_check.py`
- Modify: `apps/amo/package.json` (add `test:crop-check` script, append it to the `test` chain)

**Interfaces:**
- Produces: CLI `python3 crop_check.py --image <path> --x <n> --y <n> --w <n> --h <n> --out <path>`, exit 0 + crop written on success, exit 1 + stderr message if the box is invalid or out of bounds. Task 3's `OPENCODE_PROMPT.md` references this exact CLI signature.
- Consumes: nothing from Task 1 — fully independent tool.

- [ ] **Step 1: Write the failing test**

Create `apps/amo/tools/sprite_catalogue/test_crop_check.py`:

```python
#!/usr/bin/env python3
"""
Smoke test for crop_check.py: builds a small four-quadrant test image at
runtime, crops each quadrant via the CLI, and confirms both the output
dimensions and a sampled pixel color match the expected quadrant. Also
confirms an out-of-bounds crop request fails loudly instead of silently
padding.
Run: python3 tools/sprite_catalogue/test_crop_check.py
  (or: npm run test:crop-check)
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
CROP_CHECK = HERE / 'crop_check.py'

QUADRANTS = {
    'top_left':     ((0,  0,  32, 32), (255, 0,   0,   255)),
    'top_right':    ((32, 0,  32, 32), (0,   255, 0,   255)),
    'bottom_left':  ((0,  32, 32, 32), (0,   0,   255, 255)),
    'bottom_right': ((32, 32, 32, 32), (255, 255, 0,   255)),
}


def build_test_image(path):
    im = Image.new('RGBA', (64, 64))
    for _, ((x, y, w, h), color) in QUADRANTS.items():
        for px in range(x, x + w):
            for py in range(y, y + h):
                im.putpixel((px, py), color)
    im.save(path)


def run_crop_check(image, x, y, w, h, out):
    return subprocess.run(
        [sys.executable, str(CROP_CHECK),
         '--image', str(image), '--x', str(x), '--y', str(y),
         '--w', str(w), '--h', str(h), '--out', str(out)],
        capture_output=True, text=True,
    )


def main():
    passed = 0
    fails = []

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        image_path = tmp / 'quadrants.png'
        build_test_image(image_path)

        for name, ((x, y, w, h), expected_color) in QUADRANTS.items():
            out_path = tmp / f'{name}_crop.png'
            result = run_crop_check(image_path, x, y, w, h, out_path)
            if result.returncode != 0:
                fails.append(f'{name}: crop_check exited {result.returncode}: {result.stderr}')
                continue
            crop = Image.open(out_path).convert('RGBA')
            if crop.size != (w, h):
                fails.append(f'{name}: expected size {(w, h)}, got {crop.size}')
            elif crop.getpixel((w // 2, h // 2)) != expected_color:
                fails.append(
                    f'{name}: expected color {expected_color}, '
                    f'got {crop.getpixel((w // 2, h // 2))}'
                )
            else:
                passed += 1

        # Out-of-bounds crop must fail loudly, not silently pad.
        oob_out = tmp / 'oob_crop.png'
        result = run_crop_check(image_path, 40, 40, 32, 32, oob_out)
        if result.returncode == 0:
            fails.append('out-of-bounds crop: expected nonzero exit, got 0')
        else:
            passed += 1

    if fails:
        print(f"✗ crop_check tests FAILED — {len(fails)}/{passed + len(fails)}:", file=sys.stderr)
        for f in fails:
            print('  ' + f, file=sys.stderr)
        sys.exit(1)
    print(f"✓ crop_check tests passed ({passed} assertions).")


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/amo && python3 tools/sprite_catalogue/test_crop_check.py`
Expected: FAIL — `[Errno 2] No such file or directory` (`crop_check.py` doesn't exist yet) reflected as a nonzero-exit failure for every quadrant.

- [ ] **Step 3: Write the crop tool implementation**

Create `apps/amo/tools/sprite_catalogue/crop_check.py`:

```python
#!/usr/bin/env python3
"""
Crops a pixel region out of a spritesheet PNG and writes it to a separate
file, so an annotator (human or opencode) can visually confirm a guessed
region actually matches the intended sprite before committing it to a
*.catalogue.json entry.

Run: python3 crop_check.py --image <path> --x <n> --y <n> --w <n> --h <n> --out <path>
"""
import argparse
import sys

from PIL import Image


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True, help='path to the source spritesheet PNG')
    parser.add_argument('--x', type=int, required=True)
    parser.add_argument('--y', type=int, required=True)
    parser.add_argument('--w', type=int, required=True)
    parser.add_argument('--h', type=int, required=True)
    parser.add_argument('--out', required=True, help='path to write the cropped preview PNG')
    args = parser.parse_args(argv)

    im = Image.open(args.image)
    iw, ih = im.size

    if args.w <= 0 or args.h <= 0:
        print(f"error: --w/--h must be > 0 (got {args.w}x{args.h})", file=sys.stderr)
        return 1
    if args.x < 0 or args.y < 0 or args.x + args.w > iw or args.y + args.h > ih:
        print(
            f"error: crop box ({args.x},{args.y},{args.w},{args.h}) is out of "
            f"bounds for {args.image} ({iw}x{ih})",
            file=sys.stderr,
        )
        return 1

    crop = im.crop((args.x, args.y, args.x + args.w, args.y + args.h))
    crop.save(args.out)
    print(f"wrote {args.out} ({args.w}x{args.h} crop of {args.image} @ ({args.x},{args.y}))")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/amo && python3 tools/sprite_catalogue/test_crop_check.py`
Expected: `✓ crop_check tests passed (5 assertions).`

- [ ] **Step 5: Wire the npm scripts**

In `apps/amo/package.json`:

```diff
-    "test:sprite-catalogue": "node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs",
+    "test:sprite-catalogue": "node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs",
+    "test:crop-check": "python3 tools/sprite_catalogue/test_crop_check.py",
```

```diff
-    "test": "node tools/test_anim_resolve.mjs && node tools/validate_catalogue.mjs && node tools/test_input_bus.mjs && node tools/test_launcher_controls.mjs && node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs",
+    "test": "node tools/test_anim_resolve.mjs && node tools/validate_catalogue.mjs && node tools/test_input_bus.mjs && node tools/test_launcher_controls.mjs && node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs && python3 tools/sprite_catalogue/test_crop_check.py",
```

- [ ] **Step 6: Run the full test chain**

Run: `cd apps/amo && npm test`
Expected: all suites pass, ending with `✓ crop_check tests passed (5 assertions).`

- [ ] **Step 7: Commit**

```bash
cd apps/amo
git add tools/sprite_catalogue/crop_check.py \
        tools/sprite_catalogue/test_crop_check.py \
        package.json
git commit -m "feat(sprite-catalogue): crop-check tool for annotation self-verification"
```

---

### Task 3: Opencode annotation instructions

**Files:**
- Create: `apps/amo/tools/sprite_catalogue/OPENCODE_PROMPT.md`

**Interfaces:**
- Consumes: `validate_sprite_catalogue.mjs` CLI usage from Task 1 (`node tools/sprite_catalogue/validate_sprite_catalogue.mjs <file.catalogue.json>`) and `crop_check.py` CLI usage from Task 2 (`python3 tools/sprite_catalogue/crop_check.py --image <path> --x <n> --y <n> --w <n> --h <n> --out <path>`). Both must match exactly what those tasks produced.

- [ ] **Step 1: Write the instructions document**

Create `apps/amo/tools/sprite_catalogue/OPENCODE_PROMPT.md`:

```markdown
# Sprite Catalogue Annotation — Instructions for opencode

You are annotating a spritesheet PNG into a sidecar `<sheet>.catalogue.json`
file that names and locates every relevant region in the sheet, so a
downstream tool can reference sprites by name instead of raw pixel offsets.

## Output file

Given a source image at `path/to/sheet.png`, write your output to
`path/to/sheet.catalogue.json` (same directory, same basename, extension
swapped for `.catalogue.json`).

## Schema

```json
{
  "source": "sheet.png",
  "sheetWidth": <int>, "sheetHeight": <int>,
  "gridTileWidth": <int>, "gridTileHeight": <int>,
  "gridCols": <int>, "gridRows": <int>,
  "entries": [
    { "name": "snake_case_unique_name", "kind": "object",
      "x": <int>, "y": <int>, "w": <int>, "h": <int>,
      "tags": ["tag1", "tag2"] },
    { "name": "snake_case_unique_name", "kind": "tile",
      "row": <int>, "col": <int>, "frameIndex": <row*gridCols+col>,
      "tags": ["tag1", "tag2"] }
  ]
}
```

- `sheetWidth`/`sheetHeight` = the real full image dimensions.
- Include `gridTileWidth`/`gridTileHeight`/`gridCols`/`gridRows` ONLY if the
  sheet contains fixed-grid autotile cells (`kind: "tile"` entries exist).
  Omit all four if the sheet has only `kind: "object"` entries.
- `kind: "object"` — any freestanding sprite of arbitrary size (a tree, a
  rock, a prop): give its pixel bounding box `x, y, w, h`.
- `kind: "tile"` — a cell in a fixed grid (autotile floor/wall/decoration):
  give `row`, `col` (0-indexed) and `frameIndex = row * gridCols + col`.
- `name` — unique within the file, descriptive, snake_case (e.g.
  `oak_tree_large`, `dirt_edge_ne`, `grass_flower_a`).
- `tags` — free-form array (biome, size, category, season, etc.) to help
  later search.
- Optional `lowConfidence: true` — see verification loop below.
- Optional `frames: [{...}, ...]` — only for a genuinely animated sprite
  with multiple frames; most entries won't need this.

## Verification loop (required per entry)

Do not commit a guessed region straight to the catalogue. For every entry:

1. Look at the full spritesheet and pick the region you believe corresponds
   to the sprite you're naming.
2. Run the crop tool against your guess:

   ```
   python3 tools/sprite_catalogue/crop_check.py \
     --image path/to/sheet.png \
     --x <x> --y <y> --w <w> --h <h> \
     --out /tmp/crop_check_preview.png
   ```

   For a `kind: "tile"` entry, first convert `row`/`col` to pixels:
   `x = col * gridTileWidth`, `y = row * gridTileHeight`,
   `w = gridTileWidth`, `h = gridTileHeight` — then run the same command.

3. View `/tmp/crop_check_preview.png`. Does it show exactly the sprite you
   intended — fully framed, not cut off, not showing a neighboring sprite?
4. **Match** → commit the entry to your working catalogue.
   **Mismatch** → adjust your `x/y/w/h` (or `row/col`) and repeat from
   step 2. Retry up to 3 times total per entry.
5. If you still don't have a match after 3 attempts, write the entry anyway
   but add `"lowConfidence": true` so a human can look at it later — do not
   block on a single stubborn entry.

## Before you finish

Run the validator against your finished file — it is the hard gate that
decides whether your output is trusted:

```
node tools/sprite_catalogue/validate_sprite_catalogue.mjs path/to/sheet.catalogue.json
```

Fix every reported error (exit code 1) before considering the sheet done.
Reported warnings (⚠, for `lowConfidence` entries) don't block completion —
they're flagged for human follow-up.

On a clean pass, the validator itself moves both `sheet.png` and
`sheet.catalogue.json` out of their current location and into the mirrored
path under `public/assets/catalogued/` — that's expected and is how a sheet
graduates from "raw" to "usable by name." You don't need to move anything
yourself.
```

- [ ] **Step 2: Self-check the document against Tasks 1–2**

Confirm by inspection:
- The `node tools/sprite_catalogue/validate_sprite_catalogue.mjs` command matches the CLI entrypoint in `validate_sprite_catalogue.mjs` from Task 1 exactly (same relative path, same argument form).
- The `python3 tools/sprite_catalogue/crop_check.py --image --x --y --w --h --out` command matches the `argparse` flags in `crop_check.py` from Task 2 exactly.
- Every field name in the schema block (`source`, `sheetWidth`, `sheetHeight`, `gridTileWidth`, `gridTileHeight`, `gridCols`, `gridRows`, `entries`, `name`, `kind`, `x`, `y`, `w`, `h`, `row`, `col`, `frameIndex`, `tags`, `lowConfidence`, `frames`) matches the fields `validateCatalogueObject` in Task 1 actually checks.
- The relocation-on-success behavior described here matches `relocateToCatalogued`'s actual mirrored-path rule (insert `catalogued/` right after `public/assets/`) from Task 1.

Fix any drift found before proceeding.

- [ ] **Step 3: Commit**

```bash
cd apps/amo
git add tools/sprite_catalogue/OPENCODE_PROMPT.md
git commit -m "docs(sprite-catalogue): opencode annotation instructions"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Data format/schema → Task 1 (validator enforces it) + Task 3 (prompt documents it). Workflow/verification loop → Task 2 (crop tool) + Task 3 (prompt instructs it). Relocation-on-success into `public/assets/catalogued/` → Task 1 (`relocatedPath`/`relocateToCatalogued` + CLI wiring) + Task 3 (prompt tells opencode not to move anything itself). Tooling section's three deliverables → one task each (1, 2, 3). Testing section → Task 1's 22 assertions + Task 2's 5 assertions, covering every violation class the spec calls out (duplicate name, out-of-bounds bbox, bad tile row/col, frameIndex mismatch) plus the crop tool's manual-check requirement upgraded to an automated pixel-sampling test. Non-goals (which sheets, renderer consumption, aggregate index) are correctly left undone.
- **Placeholder scan:** No TBD/TODO; every step has complete, runnable code.
- **Type/interface consistency:** `validateCatalogueObject(cat, baseDir)` and `validateCatalogueFile(catPath)` signatures are identical between Task 1's implementation and its test's import. Task 3's CLI examples were written to match Task 1/2's actual flags verbatim (and Task 3 includes an explicit self-check step to catch drift).
