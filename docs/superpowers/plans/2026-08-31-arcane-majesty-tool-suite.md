# Arcane Majesty Tool Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `apps/tool_suite/` inside the Arcane Majesty repo with two members — lpc-forge (moved in, history preserved) and a real Sprite Ledger (collections + durable flagging), replacing the one-off static Artifact.

**Architecture:** lpc-forge moves in via `git subtree` unchanged except for a dev-script fix. The Sprite Ledger is a new Vue 3 + Vite + Express app: the backend reads live from `apps/amo/public/assets/catalogued/tilesets/**/*.catalogue.json` (read-only) and persists curation state (collections, per-sprite collection assignment, flags) in its own sidecar JSON files; the frontend is a filterable sprite grid with a detail panel for reassigning collections and flagging bad sprites.

**Tech Stack:** Vue 3, Vite, Express 5, plain Node test scripts (no test framework, matching `apps/amo/tools/`'s existing convention).

**Spec:** `docs/superpowers/specs/2026-08-31-arcane-majesty-tool-suite-design.md`

## Global Constraints

- The Sprite Ledger **never writes** to `apps/amo/public/assets/catalogued/**` — read-only access to those files, always.
- Sidecar data keys sprites by `` `${sheetPngFilename}::${entryName}` `` (e.g. `"PATD_Props.png::chest_wood_small"`) — every catalogued sheet folder's name matches its PNG's basename, so the PNG filename alone is unambiguous.
- Ports: lpc-forge keeps 5177 (vite) / 3001 (express). Sprite Ledger uses 5178 (vite) / 3002 (express).
- `flag.reason` is one of exactly: `misaligned`, `wrong_colors`, `wrong_name`, `duplicate`, `wrong_collection`, `broken_image`, `other`. The comment field is always editable regardless of which reason (or no reason) is picked.
- Default collection seeding (applied once, the first time a given sheet is seen): sheet folder is `SampleMap` → `pipoya`; sheet folder starts with `PATD_` → `patd`; anything else → `uncollected`.
- The in-game `CharacterCreatorScene.js` is not touched by this plan.

---

### Task 1: Move lpc-forge into the repo via git subtree, fix its dev script

**Files:**
- Create (via subtree, not authored): `apps/tool_suite/lpc_forge/**`
- Modify: `apps/tool_suite/lpc_forge/package.json` (after the move)
- Create: `apps/tool_suite/README.md`

**Interfaces:**
- Produces: a working `cd apps/tool_suite/lpc_forge && npm run dev` that starts both the Express API (port 3001) and the Vite dev server (port 5177), for later tasks/humans to use directly. No other task depends on lpc-forge's internals.

- [ ] **Step 1: Add lpc-forge as a local git remote and subtree-add it**

Run from the Arcane_Majesty repo root:
```bash
git remote add lpc_forge_src /home/etienne/projects/lpc-forge
git fetch lpc_forge_src
git subtree add --prefix=apps/tool_suite/lpc_forge lpc_forge_src main
```
This creates `apps/tool_suite/lpc_forge/` with lpc-forge's full commit history merged in (no `--squash`, per the spec's "history preserved" requirement).

- [ ] **Step 2: Verify the move**

Run: `git log --oneline -- apps/tool_suite/lpc_forge/package.json | tail -5`
Expected: shows commits from lpc-forge's own history (e.g. an old commit message like "LPC Forge: branding, equipment tabs, ULPC weapon importer, spritesheet reorg"), not just one fresh "add subtree" commit.

- [ ] **Step 3: Fix the broken `run-p` binary by removing the dependency on it**

`node_modules/.bin/run-p` is a 0-byte file (confirmed broken this session, pre-existing, not something this move causes). Rather than reinstalling `node_modules` (191MB, slow, and the corruption might recur), remove the indirection entirely.

Read `apps/tool_suite/lpc_forge/package.json`'s `scripts` section — it currently has:
```json
"dev": "node_modules/.bin/run-p server vite",
```
Replace that one line with a package that's actually reliable — Node's own process spawning via a tiny inline script, since `run-p`'s only job here is "start two long-running processes and show both outputs":
```json
"dev": "node -e \"const {spawn}=require('child_process'); const p1=spawn('node',['server.js'],{stdio:'inherit'}); const p2=spawn('node',['node_modules/vite/bin/vite.js'],{stdio:'inherit'}); process.on('SIGINT',()=>{p1.kill();p2.kill();process.exit();});\"",
```

- [ ] **Step 4: Verify the fixed dev script**

Run: `cd apps/tool_suite/lpc_forge && timeout 6 npm run dev; echo "exit: $?"`
Expected: log lines `API server on http://localhost:3001` and `VITE ... ready in ... Local: http://localhost:5177/` both appear before the timeout kills it (a `timeout`-induced non-zero exit is expected and fine — the point is both servers actually started, which the log lines confirm).

- [ ] **Step 5: Write the suite README**

Create `apps/tool_suite/README.md`:
```markdown
# Arcane Majesty Tool Suite

Internal authoring tools, versioned alongside the game. Each tool is a
separate local app; see `docs/superpowers/specs/2026-08-31-arcane-majesty-tool-suite-design.md`
for the full design.

## lpc_forge

Composes LPC/ULPC character (and horse companion) spritesheets — used to
create NPC and offline-campaign character skins. Moved into this repo via
`git subtree` (2026-08-31); its own history is preserved in this repo's log.

```bash
cd apps/tool_suite/lpc_forge
npm run dev
# frontend: http://localhost:5177  ·  API: http://localhost:3001
```

## sprite_ledger

Browses every catalogued sprite in `apps/amo/public/assets/catalogued/tilesets/`
live, lets sprites be grouped into named collections, and lets bad sprites
be flagged (quick-choice reason or free-text comment) for Claude to pick up
and fix in a later session — see the design doc's "How Claude consumes
flags" section.

```bash
cd apps/tool_suite/sprite_ledger
npm run dev
# frontend: http://localhost:5178  ·  API: http://localhost:3002
```
```

- [ ] **Step 6: Remove the temporary remote and commit**

```bash
git remote remove lpc_forge_src
git add apps/tool_suite/README.md apps/tool_suite/lpc_forge/package.json
git commit -m "feat(tool-suite): move lpc-forge in via git subtree, fix broken dev script"
```
(The subtree-add itself already created its own commit in Step 1; this commits the README + the package.json fix on top.)

---

### Task 2: Sprite Ledger scaffold + catalogue scanner

**Files:**
- Create: `apps/tool_suite/sprite_ledger/package.json`
- Create: `apps/tool_suite/sprite_ledger/vite.config.ts`
- Create: `apps/tool_suite/sprite_ledger/index.html`
- Create: `apps/tool_suite/sprite_ledger/server/catalogueScanner.js`
- Test: `apps/tool_suite/sprite_ledger/tools/test_catalogue_scanner.mjs`

**Interfaces:**
- Produces: `scanCatalogueDir(baseDir: string): Promise<SheetEntry[]>` where
  `SheetEntry = { sheetPngFilename: string, sheetDirName: string, catalogueJsonPath: string, pngPath: string, catalogue: object }`.
  `sheetDirName` is the immediate parent directory's name (e.g. `'SampleMap'`,
  `'PATD_Props'`) — Task 3's `seedDefaultCollection` keys off exactly this
  value, so the scanner must surface it rather than making callers re-derive
  it from `catalogueJsonPath`. `catalogue` is the parsed JSON exactly as
  written to disk (has `source`, `sheetWidth`, `sheetHeight`, optionally
  `gridTileWidth`/`gridTileHeight`/`gridCols`/`gridRows`, and `entries: []`).
  Task 3 and Task 4 both import and call this function.

- [ ] **Step 1: Create the package scaffold**

Create `apps/tool_suite/sprite_ledger/package.json`:
```json
{
  "name": "sprite-ledger",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "node -e \"const {spawn}=require('child_process'); const p1=spawn('node',['server.js'],{stdio:'inherit'}); const p2=spawn('node',['node_modules/vite/bin/vite.js'],{stdio:'inherit'}); process.on('SIGINT',()=>{p1.kill();p2.kill();process.exit();});\"",
    "test": "node tools/test_catalogue_scanner.mjs && node tools/test_data_store.mjs && node tools/test_api_smoke.mjs",
    "build": "vite build"
  },
  "dependencies": {
    "express": "^5.2.1",
    "vue": "^3.5.42"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd apps/tool_suite/sprite_ledger && npm install`
Expected: completes with no errors (creates `node_modules/` and `package-lock.json`).

- [ ] **Step 3: Create the Vite config**

Create `apps/tool_suite/sprite_ledger/vite.config.ts`:
```typescript
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5178,
    host: true,
    proxy: {
      '/api': 'http://localhost:3002'
    }
  }
})
```

- [ ] **Step 4: Create the HTML entry point**

Create `apps/tool_suite/sprite_ledger/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Sprite Ledger</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Write the failing test for the catalogue scanner**

Create `apps/tool_suite/sprite_ledger/tools/test_catalogue_scanner.mjs`:
```javascript
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanCatalogueDir } from '../server/catalogueScanner.js';

// Build a tiny fake catalogued-tilesets directory: two sheets, one of
// them ('SampleMap') holding two catalogue.json files sharing one folder
// (matching the real repo's actual layout, where SampleMap holds 8).
const base = mkdtempSync(join(tmpdir(), 'sprite-ledger-test-'));

mkdirSync(join(base, 'SampleMap'), { recursive: true });
writeFileSync(join(base, 'SampleMap', 'fake_a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47])); // not a real PNG, scanner doesn't need to decode it
writeFileSync(join(base, 'SampleMap', 'fake_a.catalogue.json'), JSON.stringify({
    source: 'fake_a.png', sheetWidth: 32, sheetHeight: 32,
    entries: [{ kind: 'object', name: 'thing_one', x: 0, y: 0, w: 32, h: 32, tags: [] }],
}));
writeFileSync(join(base, 'SampleMap', 'fake_b.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
writeFileSync(join(base, 'SampleMap', 'fake_b.catalogue.json'), JSON.stringify({
    source: 'fake_b.png', sheetWidth: 16, sheetHeight: 16,
    entries: [{ kind: 'object', name: 'thing_two', x: 0, y: 0, w: 16, h: 16, tags: [] }],
}));

mkdirSync(join(base, 'PATD_Props'), { recursive: true });
writeFileSync(join(base, 'PATD_Props', 'PATD_Props.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
writeFileSync(join(base, 'PATD_Props', 'PATD_Props.catalogue.json'), JSON.stringify({
    source: 'PATD_Props.png', sheetWidth: 64, sheetHeight: 64,
    entries: [{ kind: 'object', name: 'chest_wood_small', x: 0, y: 0, w: 32, h: 32, tags: [] }],
}));

const sheets = await scanCatalogueDir(base);

assert.strictEqual(sheets.length, 3, `expected 3 sheets, got ${sheets.length}`);

const names = sheets.map(s => s.sheetPngFilename).sort();
assert.deepStrictEqual(names, ['PATD_Props.png', 'fake_a.png', 'fake_b.png']);

const propsSheet = sheets.find(s => s.sheetPngFilename === 'PATD_Props.png');
assert.strictEqual(propsSheet.catalogue.entries[0].name, 'chest_wood_small');
assert.ok(propsSheet.pngPath.endsWith('PATD_Props/PATD_Props.png'));
assert.ok(propsSheet.catalogueJsonPath.endsWith('PATD_Props.catalogue.json'));
assert.strictEqual(propsSheet.sheetDirName, 'PATD_Props');

const sampleMapSheets = sheets.filter(s => s.sheetDirName === 'SampleMap');
assert.strictEqual(sampleMapSheets.length, 2, 'both fake_a and fake_b share the SampleMap dir');

console.log('✓ catalogue-scanner tests passed (6 assertions).');
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `node apps/tool_suite/sprite_ledger/tools/test_catalogue_scanner.mjs`
Expected: `Error [ERR_MODULE_NOT_FOUND]` — `server/catalogueScanner.js` doesn't exist yet.

- [ ] **Step 7: Implement the catalogue scanner**

Create `apps/tool_suite/sprite_ledger/server/catalogueScanner.js`:
```javascript
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Walks every subdirectory of baseDir looking for *.catalogue.json files
 * (a directory may hold more than one — e.g. the real repo's SampleMap/
 * holds 8). Never writes anything; read-only.
 *
 * Returns one entry per catalogue.json file found:
 *   { sheetPngFilename, catalogueJsonPath, pngPath, catalogue }
 * where `catalogue` is the parsed JSON as-is (has .source, .sheetWidth,
 * .sheetHeight, .entries, and optionally the tile-grid fields).
 */
export async function scanCatalogueDir(baseDir) {
    const results = [];
    const topLevel = await readdir(baseDir, { withFileTypes: true });

    for (const dirent of topLevel) {
        if (!dirent.isDirectory()) continue;
        const sheetDir = join(baseDir, dirent.name);
        const files = await readdir(sheetDir);

        for (const file of files) {
            if (!file.endsWith('.catalogue.json')) continue;
            const catalogueJsonPath = join(sheetDir, file);
            const raw = await readFile(catalogueJsonPath, 'utf8');
            const catalogue = JSON.parse(raw);
            const pngPath = join(sheetDir, catalogue.source);

            results.push({
                sheetPngFilename: catalogue.source,
                sheetDirName: dirent.name,
                catalogueJsonPath,
                pngPath,
                catalogue,
            });
        }
    }

    return results;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `node apps/tool_suite/sprite_ledger/tools/test_catalogue_scanner.mjs`
Expected: `✓ catalogue-scanner tests passed (6 assertions).`

- [ ] **Step 9: Sanity-check against the real directory**

Run:
```bash
node --input-type=module -e "
import { scanCatalogueDir } from './apps/tool_suite/sprite_ledger/server/catalogueScanner.js';
const sheets = await scanCatalogueDir('./apps/amo/public/assets/catalogued/tilesets');
console.log(sheets.length, 'sheets found');
console.log(sheets.map(s => s.sheetPngFilename).sort());
"
```
Expected: 18 sheets found (8 from `SampleMap/`, 1 each from the other 10 folders), no errors. This confirms the scanner works against real, current repo data, not just the test fixture.

- [ ] **Step 10: Commit**

```bash
git add apps/tool_suite/sprite_ledger/package.json apps/tool_suite/sprite_ledger/package-lock.json apps/tool_suite/sprite_ledger/vite.config.ts apps/tool_suite/sprite_ledger/index.html apps/tool_suite/sprite_ledger/server/catalogueScanner.js apps/tool_suite/sprite_ledger/tools/test_catalogue_scanner.mjs
git commit -m "feat(sprite-ledger): scaffold + catalogue scanner"
```

---

### Task 3: Data store (collections, sprite_meta, flags)

**Files:**
- Create: `apps/tool_suite/sprite_ledger/server/dataStore.js`
- Create: `apps/tool_suite/sprite_ledger/data/collections.json`
- Test: `apps/tool_suite/sprite_ledger/tools/test_data_store.mjs`

**Interfaces:**
- Consumes: nothing from Task 2 (this module is independent of the scanner —
  it only knows sheet PNG filenames as opaque strings).
- Produces (all read `dataDir` from their first argument, so tests can
  point at a temp directory instead of the real `data/` folder):
  - `loadCollections(dataDir): Promise<{id,name}[]>`
  - `addCollection(dataDir, {id, name}): Promise<void>` — throws if `id` already exists
  - `loadSpriteMeta(dataDir): Promise<{[key:string]: {collection:string}}>`
  - `assignCollection(dataDir, sheetPngFilename, entryName, collectionId): Promise<void>` —
    throws if `collectionId` isn't one of `loadCollections(dataDir)`'s ids
    (enforces the spec's "referenced collection ids actually exist"
    requirement at write time, not just as an after-the-fact test)
  - `seedDefaultCollection(sheetPngFilename, sheetDirName): string` — pure
    function (no I/O), returns `'pipoya'` | `'patd'` | `'uncollected'` per
    the Global Constraints seeding rule. Takes the sheet's own directory
    name (e.g. `'SampleMap'`, `'PATD_Props'`) since that's what the rule
    keys off, not the PNG filename.
  - `seedSheetIfNew(dataDir, sheetPngFilename, sheetDirName, entryNames): Promise<void>` —
    if none of `entryNames` already has a `sprite_meta.json` record for
    this sheet, bulk-assigns all of them to `seedDefaultCollection`'s
    result in one write. A no-op if the sheet has already been seeded
    (matches the spec's "one-time seed per sheet" rule) — Task 4 calls
    this for every sheet on every `/api/sheets` and `/api/meta` request,
    so newly-added sheets get seeded automatically without a separate
    migration step.
  - `loadFlags(dataDir, statusFilter?): Promise<Flag[]>`
  - `addFlag(dataDir, {sheet, name, reason, comment}): Promise<Flag>` — generates `id` and `createdAt`, sets `status:'open'`, `resolvedAt:null`
  - `updateFlagStatus(dataDir, id, status): Promise<void>` — throws if `id` not found; sets `resolvedAt` to now when status is `'resolved'`, back to `null` otherwise
  - Task 4 imports all of these; Task 6/7's frontend calls the endpoints Task 4 builds on top of them, not these functions directly.

- [ ] **Step 1: Write the failing tests**

Create `apps/tool_suite/sprite_ledger/tools/test_data_store.mjs`:
```javascript
import assert from 'node:assert';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    seedDefaultCollection, seedSheetIfNew,
    loadCollections, addCollection,
    loadSpriteMeta, assignCollection,
    loadFlags, addFlag, updateFlagStatus,
} from '../server/dataStore.js';

// --- seedDefaultCollection: pure function, no I/O ---
assert.strictEqual(seedDefaultCollection('fake_a.png', 'SampleMap'), 'pipoya');
assert.strictEqual(seedDefaultCollection('PATD_Props.png', 'PATD_Props'), 'patd');
assert.strictEqual(seedDefaultCollection('addwork.png', 'addwork'), 'uncollected');

// --- collections ---
const dataDir = mkdtempSync(join(tmpdir(), 'sprite-ledger-data-'));

const initial = await loadCollections(dataDir);
assert.deepStrictEqual(initial, [], 'loadCollections on an empty dataDir returns []');

await addCollection(dataDir, { id: 'pipoya', name: 'Pipoya' });
await addCollection(dataDir, { id: 'buildings', name: 'Buildings' });
const afterAdd = await loadCollections(dataDir);
assert.strictEqual(afterAdd.length, 2);
assert.strictEqual(afterAdd[0].id, 'pipoya');

let threw = false;
try { await addCollection(dataDir, { id: 'pipoya', name: 'Pipoya Again' }); }
catch (e) { threw = true; }
assert.ok(threw, 'addCollection must reject a duplicate id');

// --- sprite_meta ---
await assignCollection(dataDir, 'PATD_Props.png', 'chest_wood_small', 'buildings');
const meta = await loadSpriteMeta(dataDir);
assert.strictEqual(meta['PATD_Props.png::chest_wood_small'].collection, 'buildings');

// reassigning overwrites, not duplicates
await assignCollection(dataDir, 'PATD_Props.png', 'chest_wood_small', 'pipoya');
const meta2 = await loadSpriteMeta(dataDir);
assert.strictEqual(meta2['PATD_Props.png::chest_wood_small'].collection, 'pipoya');
assert.strictEqual(Object.keys(meta2).length, 1);

// assignCollection must reject a collection id that doesn't exist
let threwUnknownCollection = false;
try { await assignCollection(dataDir, 'PATD_Props.png', 'chest_wood_small', 'not_a_real_collection'); }
catch (e) { threwUnknownCollection = true; }
assert.ok(threwUnknownCollection, 'assignCollection must reject an unknown collection id');

// --- seedSheetIfNew ---
const seedDataDir = mkdtempSync(join(tmpdir(), 'sprite-ledger-seed-'));
await addCollection(seedDataDir, { id: 'patd', name: 'Pixel Art Top Down' });
await addCollection(seedDataDir, { id: 'uncollected', name: 'Uncollected' });

await seedSheetIfNew(seedDataDir, 'PATD_Props.png', 'PATD_Props', ['chest_wood_small', 'barrel_wood']);
const seededMeta = await loadSpriteMeta(seedDataDir);
assert.strictEqual(seededMeta['PATD_Props.png::chest_wood_small'].collection, 'patd');
assert.strictEqual(seededMeta['PATD_Props.png::barrel_wood'].collection, 'patd');

// a sheet already seeded (or user-reassigned) must not be re-seeded
await assignCollection(seedDataDir, 'PATD_Props.png', 'chest_wood_small', 'uncollected');
await seedSheetIfNew(seedDataDir, 'PATD_Props.png', 'PATD_Props', ['chest_wood_small', 'barrel_wood']);
const afterReseedAttempt = await loadSpriteMeta(seedDataDir);
assert.strictEqual(afterReseedAttempt['PATD_Props.png::chest_wood_small'].collection, 'uncollected', 'seedSheetIfNew must not overwrite an existing assignment');

// --- flags ---
const flag = await addFlag(dataDir, { sheet: 'PATD_Props.png', name: 'stone_disc_dial', reason: 'misaligned', comment: '' });
assert.ok(flag.id);
assert.strictEqual(flag.status, 'open');
assert.strictEqual(flag.resolvedAt, null);

const openFlags = await loadFlags(dataDir, 'open');
assert.strictEqual(openFlags.length, 1);

await updateFlagStatus(dataDir, flag.id, 'resolved');
const resolvedFlags = await loadFlags(dataDir, 'resolved');
assert.strictEqual(resolvedFlags.length, 1);
assert.ok(resolvedFlags[0].resolvedAt);

let threwMissing = false;
try { await updateFlagStatus(dataDir, 'not-a-real-id', 'resolved'); }
catch (e) { threwMissing = true; }
assert.ok(threwMissing, 'updateFlagStatus must reject an unknown id');

// --- schema sanity on the real seeded collections.json this task also creates ---
const realCollections = JSON.parse(readFileSync(
    new URL('../data/collections.json', import.meta.url), 'utf8'
));
const expectedIds = ['pipoya', 'patd', 'buildings', 'interior', 'cave', 'nature', 'uncollected'];
assert.deepStrictEqual(realCollections.map(c => c.id).sort(), expectedIds.sort());

console.log('✓ data-store tests passed (22 assertions).');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/tool_suite/sprite_ledger/tools/test_data_store.mjs`
Expected: `Error [ERR_MODULE_NOT_FOUND]` — `server/dataStore.js` doesn't exist yet.

- [ ] **Step 3: Implement the data store**

Create `apps/tool_suite/sprite_ledger/server/dataStore.js`:
```javascript
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

async function readJsonOrDefault(path, fallback) {
    try {
        const raw = await readFile(path, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        if (e.code === 'ENOENT') return fallback;
        throw e;
    }
}

async function writeJson(path, value) {
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

// --- seeding (pure, no I/O) ---
export function seedDefaultCollection(sheetPngFilename, sheetDirName) {
    if (sheetDirName === 'SampleMap') return 'pipoya';
    if (sheetDirName.startsWith('PATD_')) return 'patd';
    return 'uncollected';
}

// --- collections ---
export async function loadCollections(dataDir) {
    return readJsonOrDefault(join(dataDir, 'collections.json'), []);
}

export async function addCollection(dataDir, { id, name }) {
    const collections = await loadCollections(dataDir);
    if (collections.some(c => c.id === id)) {
        throw new Error(`collection id already exists: ${id}`);
    }
    collections.push({ id, name });
    await writeJson(join(dataDir, 'collections.json'), collections);
}

// --- sprite_meta ---
export async function loadSpriteMeta(dataDir) {
    return readJsonOrDefault(join(dataDir, 'sprite_meta.json'), {});
}

export async function assignCollection(dataDir, sheetPngFilename, entryName, collectionId) {
    const collections = await loadCollections(dataDir);
    if (!collections.some(c => c.id === collectionId)) {
        throw new Error(`unknown collection id: ${collectionId}`);
    }
    const meta = await loadSpriteMeta(dataDir);
    meta[`${sheetPngFilename}::${entryName}`] = { collection: collectionId };
    await writeJson(join(dataDir, 'sprite_meta.json'), meta);
}

// Seeds every entry of a sheet with its default collection, but only if
// NONE of that sheet's entries has a sprite_meta.json record yet — a
// one-time seed per sheet, never overwriting an existing (default or
// user-chosen) assignment. Bypasses assignCollection's existence check
// deliberately (seeding is a trusted internal call, not user input) but
// still only ever writes collection ids that seedDefaultCollection can
// produce — 'pipoya', 'patd', 'uncollected' — which the real
// data/collections.json (Step 4 below) always defines.
export async function seedSheetIfNew(dataDir, sheetPngFilename, sheetDirName, entryNames) {
    const meta = await loadSpriteMeta(dataDir);
    const alreadySeeded = entryNames.some(name => meta[`${sheetPngFilename}::${name}`]);
    if (alreadySeeded) return;

    const defaultCollection = seedDefaultCollection(sheetPngFilename, sheetDirName);
    for (const name of entryNames) {
        meta[`${sheetPngFilename}::${name}`] = { collection: defaultCollection };
    }
    await writeJson(join(dataDir, 'sprite_meta.json'), meta);
}

// --- flags ---
export async function loadFlags(dataDir, statusFilter) {
    const flags = await readJsonOrDefault(join(dataDir, 'flags.json'), []);
    if (!statusFilter) return flags;
    return flags.filter(f => f.status === statusFilter);
}

export async function addFlag(dataDir, { sheet, name, reason, comment }) {
    const flags = await readJsonOrDefault(join(dataDir, 'flags.json'), []);
    const flag = {
        id: `f_${randomUUID()}`,
        sheet, name, reason, comment: comment ?? '',
        status: 'open',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
    };
    flags.push(flag);
    await writeJson(join(dataDir, 'flags.json'), flags);
    return flag;
}

export async function updateFlagStatus(dataDir, id, status) {
    const flags = await readJsonOrDefault(join(dataDir, 'flags.json'), []);
    const flag = flags.find(f => f.id === id);
    if (!flag) throw new Error(`flag not found: ${id}`);
    flag.status = status;
    flag.resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    await writeJson(join(dataDir, 'flags.json'), flags);
}
```

- [ ] **Step 4: Seed the real `data/collections.json`**

Create `apps/tool_suite/sprite_ledger/data/collections.json`:
```json
[
  { "id": "pipoya", "name": "Pipoya" },
  { "id": "patd", "name": "Pixel Art Top Down" },
  { "id": "buildings", "name": "Buildings" },
  { "id": "interior", "name": "Interior" },
  { "id": "cave", "name": "Cave" },
  { "id": "nature", "name": "Dirt / Grass / Trees" },
  { "id": "uncollected", "name": "Uncollected" }
]
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node apps/tool_suite/sprite_ledger/tools/test_data_store.mjs`
Expected: `✓ data-store tests passed (22 assertions).`

- [ ] **Step 6: Commit**

```bash
git add apps/tool_suite/sprite_ledger/server/dataStore.js apps/tool_suite/sprite_ledger/data/collections.json apps/tool_suite/sprite_ledger/tools/test_data_store.mjs
git commit -m "feat(sprite-ledger): data store for collections/sprite_meta/flags"
```

---

### Task 4: Express server (API endpoints) + smoke tests

**Files:**
- Create: `apps/tool_suite/sprite_ledger/server.js`
- Test: `apps/tool_suite/sprite_ledger/tools/test_api_smoke.mjs`

**Interfaces:**
- Consumes: `scanCatalogueDir` (Task 2), all of `dataStore.js` (Task 3) —
  notably `seedSheetIfNew`, called for every sheet on every `/api/sheets`
  and `/api/meta` request so newly-catalogued sheets get seeded into a
  default collection automatically, with no separate migration step.
- Produces: an HTTP server exporting `createServer(catalogueDir, dataDir)`
  returning an Express `app` (so the smoke test can start it on an
  arbitrary port without touching the real data files), plus a top-level
  script that calls `createServer` with the real paths and listens on 3002
  when run directly (`node server.js`).
- Real paths used at runtime: `catalogueDir = '../../amo/public/assets/catalogued/tilesets'`
  (relative to `apps/tool_suite/sprite_ledger/`), `dataDir = './data'`.

- [ ] **Step 1: Write the failing smoke test**

Create `apps/tool_suite/sprite_ledger/tools/test_api_smoke.mjs`:
```javascript
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../server.js';

// Fake catalogue dir (read-only side) — same shape as Task 2's fixture.
const catalogueDir = mkdtempSync(join(tmpdir(), 'sprite-ledger-cat-'));
mkdirSync(join(catalogueDir, 'PATD_Props'), { recursive: true });
writeFileSync(join(catalogueDir, 'PATD_Props', 'PATD_Props.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
writeFileSync(join(catalogueDir, 'PATD_Props', 'PATD_Props.catalogue.json'), JSON.stringify({
    source: 'PATD_Props.png', sheetWidth: 64, sheetHeight: 64,
    entries: [{ kind: 'object', name: 'chest_wood_small', x: 0, y: 0, w: 32, h: 32, tags: [] }],
}));

// Fake, disposable data dir (write side) — never the real committed data/.
// Includes 'patd' since this fixture's sheet dir is 'PATD_Props', which
// seedDefaultCollection maps to 'patd' — seeding must have somewhere valid
// to assign into, same as the real data/collections.json always does.
const dataDir = mkdtempSync(join(tmpdir(), 'sprite-ledger-testdata-'));
writeFileSync(join(dataDir, 'collections.json'), JSON.stringify([
    { id: 'patd', name: 'Pixel Art Top Down' },
    { id: 'buildings', name: 'Buildings' },
    { id: 'uncollected', name: 'Uncollected' },
]));

const app = createServer(catalogueDir, dataDir);
const server = app.listen(0); // OS-assigned free port
const port = server.address().port;
const base = `http://localhost:${port}`;

// GET /api/sheets
const sheetsRes = await fetch(`${base}/api/sheets`);
assert.strictEqual(sheetsRes.status, 200);
const sheets = await sheetsRes.json();
assert.strictEqual(sheets.length, 1);
assert.strictEqual(sheets[0].sheetPngFilename, 'PATD_Props.png');

// GET /api/sheets must trigger seeding as a side effect: chest_wood_small
// had no prior sprite_meta.json record, so it should now be seeded to
// 'patd' (PATD_Props's directory-based default) — confirms server.js
// actually wires seedSheetIfNew in, not just that dataStore.js has it.
const metaAfterFirstScan = await (await fetch(`${base}/api/meta`)).json();
assert.strictEqual(metaAfterFirstScan.spriteMeta['PATD_Props.png::chest_wood_small'].collection, 'patd');

// GET /api/image/:sheetPngFilename
const imgRes = await fetch(`${base}/api/image/PATD_Props.png`);
assert.strictEqual(imgRes.status, 200);

// GET /api/collections
const colRes = await fetch(`${base}/api/collections`);
assert.strictEqual(colRes.status, 200);
assert.strictEqual((await colRes.json()).length, 3);

// POST /api/collections
const addColRes = await fetch(`${base}/api/collections`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'cave', name: 'Cave' }),
});
assert.strictEqual(addColRes.status, 200);
const colsAfter = await (await fetch(`${base}/api/collections`)).json();
assert.strictEqual(colsAfter.length, 4);

// GET /api/meta — chest_wood_small was already seeded to 'patd' by the
// earlier GET /api/sheets call (seeding, not an empty-state check, since
// that behavior was already confirmed above).
const metaRes = await fetch(`${base}/api/meta`);
assert.strictEqual(metaRes.status, 200);
const metaBody = await metaRes.json();
assert.strictEqual(metaBody.spriteMeta['PATD_Props.png::chest_wood_small'].collection, 'patd');
assert.strictEqual(metaBody.collections.length, 4);

// POST /api/meta
const assignRes = await fetch(`${base}/api/meta`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: 'PATD_Props.png', name: 'chest_wood_small', collection: 'buildings' }),
});
assert.strictEqual(assignRes.status, 200);
const metaAfter = await (await fetch(`${base}/api/meta`)).json();
assert.strictEqual(metaAfter.spriteMeta['PATD_Props.png::chest_wood_small'].collection, 'buildings');

// POST /api/flags
const flagRes = await fetch(`${base}/api/flags`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: 'PATD_Props.png', name: 'chest_wood_small', reason: 'misaligned', comment: 'test' }),
});
assert.strictEqual(flagRes.status, 200);
const flag = await flagRes.json();
assert.ok(flag.id);

// GET /api/flags?status=open
const openFlagsRes = await fetch(`${base}/api/flags?status=open`);
assert.strictEqual((await openFlagsRes.json()).length, 1);

// PATCH /api/flags/:id
const patchRes = await fetch(`${base}/api/flags/${flag.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' }),
});
assert.strictEqual(patchRes.status, 200);
const openAfterResolve = await (await fetch(`${base}/api/flags?status=open`)).json();
assert.strictEqual(openAfterResolve.length, 0);

server.close();
console.log('✓ API smoke tests passed (19 assertions).');
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node apps/tool_suite/sprite_ledger/tools/test_api_smoke.mjs`
Expected: `Error [ERR_MODULE_NOT_FOUND]` — `server.js` doesn't exist yet.

- [ ] **Step 3: Implement the server**

Create `apps/tool_suite/sprite_ledger/server.js`:
```javascript
import express from 'express';
import { scanCatalogueDir } from './server/catalogueScanner.js';
import {
    loadCollections, addCollection,
    loadSpriteMeta, assignCollection, seedSheetIfNew,
    loadFlags, addFlag, updateFlagStatus,
} from './server/dataStore.js';

// Scans + seeds every sheet that hasn't been seeded yet. Called at the top
// of both /api/sheets and /api/meta so either endpoint being hit first
// still guarantees seeding happened — the frontend always sees real
// collection assignments, never an empty sprite_meta.json for a sheet
// that's actually been scanned before.
async function scanAndSeed(catalogueDir, dataDir) {
    const sheets = await scanCatalogueDir(catalogueDir);
    for (const sheet of sheets) {
        const entryNames = sheet.catalogue.entries.map(e => e.name);
        await seedSheetIfNew(dataDir, sheet.sheetPngFilename, sheet.sheetDirName, entryNames);
    }
    return sheets;
}

export function createServer(catalogueDir, dataDir) {
    const app = express();
    app.use(express.json());

    app.get('/api/sheets', async (req, res) => {
        const sheets = await scanAndSeed(catalogueDir, dataDir);
        res.json(sheets.map(s => ({
            sheetPngFilename: s.sheetPngFilename,
            source: s.catalogue.source,
            entries: s.catalogue.entries,
            gridTileWidth: s.catalogue.gridTileWidth,
            gridTileHeight: s.catalogue.gridTileHeight,
            gridCols: s.catalogue.gridCols,
            gridRows: s.catalogue.gridRows,
        })));
    });

    app.get('/api/image/:sheetPngFilename', async (req, res) => {
        const sheets = await scanCatalogueDir(catalogueDir);
        const match = sheets.find(s => s.sheetPngFilename === req.params.sheetPngFilename);
        if (!match) return res.status(404).send('not found');
        res.sendFile(match.pngPath);
    });

    app.get('/api/collections', async (req, res) => {
        res.json(await loadCollections(dataDir));
    });

    app.post('/api/collections', async (req, res) => {
        await addCollection(dataDir, req.body);
        res.json({ ok: true });
    });

    app.get('/api/meta', async (req, res) => {
        await scanAndSeed(catalogueDir, dataDir);
        res.json({
            collections: await loadCollections(dataDir),
            spriteMeta: await loadSpriteMeta(dataDir),
        });
    });

    app.post('/api/meta', async (req, res) => {
        const { sheet, name, collection } = req.body;
        await assignCollection(dataDir, sheet, name, collection);
        res.json({ ok: true });
    });

    app.get('/api/flags', async (req, res) => {
        res.json(await loadFlags(dataDir, req.query.status));
    });

    app.post('/api/flags', async (req, res) => {
        const flag = await addFlag(dataDir, req.body);
        res.json(flag);
    });

    app.patch('/api/flags/:id', async (req, res) => {
        await updateFlagStatus(dataDir, req.params.id, req.body.status);
        res.json({ ok: true });
    });

    return app;
}

// Only start listening when run directly (`node server.js`), not when
// imported by the smoke test.
if (import.meta.url === `file://${process.argv[1]}`) {
    const app = createServer('../../amo/public/assets/catalogued/tilesets', './data');
    app.listen(3002, () => console.log('Sprite Ledger API on http://localhost:3002'));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node apps/tool_suite/sprite_ledger/tools/test_api_smoke.mjs`
Expected: `✓ API smoke tests passed (19 assertions).`

- [ ] **Step 5: Wire the test script into package.json and run the full suite**

Run: `cd apps/tool_suite/sprite_ledger && npm test`
Expected: all three test files print their `✓ ... passed` lines, exit code 0.

- [ ] **Step 6: Commit**

```bash
git add apps/tool_suite/sprite_ledger/server.js apps/tool_suite/sprite_ledger/tools/test_api_smoke.mjs
git commit -m "feat(sprite-ledger): Express API endpoints + smoke tests"
```

---

### Task 5: Vue frontend shell — sprite grid + collection sidebar

**Files:**
- Create: `apps/tool_suite/sprite_ledger/src/main.ts`
- Create: `apps/tool_suite/sprite_ledger/src/App.vue`
- Create: `apps/tool_suite/sprite_ledger/src/components/CollectionSidebar.vue`
- Create: `apps/tool_suite/sprite_ledger/src/components/SpriteGrid.vue`
- Create: `apps/tool_suite/sprite_ledger/src/services/api.ts`

**Interfaces:**
- Consumes: `GET /api/sheets`, `GET /api/meta`, `GET /api/flags?status=open` (Task 4).
- Produces: `App.vue` holds `selectedSprite` (a `{sheetPngFilename, entryName} | null`) as reactive state, passed down to `SpriteDetail` in Task 6 (not built yet — `App.vue` in this task just declares the ref and a placeholder `v-if`, since Task 6 is what fills in the real component).

- [ ] **Step 1: Create the API client**

Create `apps/tool_suite/sprite_ledger/src/services/api.ts`:
```typescript
export interface SpriteEntry {
    kind: 'object' | 'tile';
    name: string;
    tags?: string[];
    x?: number; y?: number; w?: number; h?: number;
    row?: number; col?: number; frameIndex?: number;
}

export interface Sheet {
    sheetPngFilename: string;
    source: string;
    entries: SpriteEntry[];
    gridTileWidth?: number;
    gridTileHeight?: number;
    gridCols?: number;
    gridRows?: number;
}

export interface Collection { id: string; name: string; }

export interface Flag {
    id: string; sheet: string; name: string;
    reason: string; comment: string;
    status: 'open' | 'resolved';
    createdAt: string; resolvedAt: string | null;
}

const BASE = '/api';

export async function fetchSheets(): Promise<Sheet[]> {
    return (await fetch(`${BASE}/sheets`)).json();
}

export async function fetchMeta(): Promise<{ collections: Collection[]; spriteMeta: Record<string, { collection: string }> }> {
    return (await fetch(`${BASE}/meta`)).json();
}

export async function assignCollection(sheet: string, name: string, collection: string): Promise<void> {
    await fetch(`${BASE}/meta`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, name, collection }),
    });
}

export async function addCollection(id: string, name: string): Promise<void> {
    await fetch(`${BASE}/collections`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
    });
}

export async function fetchFlags(status?: string): Promise<Flag[]> {
    const qs = status ? `?status=${status}` : '';
    return (await fetch(`${BASE}/flags${qs}`)).json();
}

export async function addFlag(sheet: string, name: string, reason: string, comment: string): Promise<Flag> {
    return (await fetch(`${BASE}/flags`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet, name, reason, comment }),
    })).json();
}

export async function resolveFlag(id: string): Promise<void> {
    await fetch(`${BASE}/flags/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
    });
}

export function imageUrl(sheetPngFilename: string): string {
    return `${BASE}/image/${encodeURIComponent(sheetPngFilename)}`;
}
```

- [ ] **Step 2: Create the collection sidebar**

Create `apps/tool_suite/sprite_ledger/src/components/CollectionSidebar.vue`:
```vue
<script setup lang="ts">
import type { Collection } from '../services/api';

const props = defineProps<{
    collections: Collection[];
    activeCollectionId: string | null; // null = "All"
    flaggedOnly: boolean;
    searchText: string;
    counts: Record<string, number>; // collection id -> sprite count, 'all' -> total
}>();

const emit = defineEmits<{
    selectCollection: [id: string | null];
    toggleFlaggedOnly: [];
    updateSearch: [value: string];
}>();
</script>

<template>
  <aside class="sidebar">
    <input
      class="search"
      type="text"
      placeholder="Search sprite names..."
      :value="searchText"
      @input="emit('updateSearch', ($event.target as HTMLInputElement).value)"
    />

    <label class="flagged-toggle">
      <input type="checkbox" :checked="flaggedOnly" @change="emit('toggleFlaggedOnly')" />
      Flagged only
    </label>

    <ul class="collections">
      <li
        :class="{ active: activeCollectionId === null }"
        @click="emit('selectCollection', null)"
      >
        All ({{ counts.all ?? 0 }})
      </li>
      <li
        v-for="c in collections"
        :key="c.id"
        :class="{ active: activeCollectionId === c.id }"
        @click="emit('selectCollection', c.id)"
      >
        {{ c.name }} ({{ counts[c.id] ?? 0 }})
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.sidebar { width: 220px; padding: 12px; border-right: 1px solid #333; }
.search { width: 100%; margin-bottom: 8px; }
.flagged-toggle { display: block; margin-bottom: 12px; font-size: 13px; }
.collections { list-style: none; padding: 0; margin: 0; }
.collections li { padding: 6px 8px; cursor: pointer; border-radius: 4px; }
.collections li:hover { background: #2a2a2a; }
.collections li.active { background: #3a3a5a; font-weight: bold; }
</style>
```

- [ ] **Step 3: Create the sprite grid**

Create `apps/tool_suite/sprite_ledger/src/components/SpriteGrid.vue`:
```vue
<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import type { Sheet, SpriteEntry } from '../services/api';
import { imageUrl } from '../services/api';

const props = defineProps<{
    sheets: Sheet[];
    visibleKeys: Set<string>; // `${sheetPngFilename}::${entryName}` — which sprites survive current filters
    flaggedKeys: Set<string>;
}>();

const emit = defineEmits<{ select: [sheetPngFilename: string, entryName: string] }>();

// One offscreen <img> per sheet, loaded once, reused for every crop.
const sheetImages = ref<Record<string, HTMLImageElement>>({});

watchEffect(() => {
    for (const sheet of props.sheets) {
        if (sheetImages.value[sheet.sheetPngFilename]) continue;
        const img = new Image();
        img.src = imageUrl(sheet.sheetPngFilename);
        sheetImages.value[sheet.sheetPngFilename] = img;
    }
});

function cropBox(sheet: Sheet, entry: SpriteEntry): { x: number; y: number; w: number; h: number } {
    if (entry.kind === 'object') {
        return { x: entry.x!, y: entry.y!, w: entry.w!, h: entry.h! };
    }
    const tw = sheet.gridTileWidth!, th = sheet.gridTileHeight!;
    return { x: entry.col! * tw, y: entry.row! * th, w: tw, h: th };
}

function drawCrop(canvas: HTMLCanvasElement | null, sheet: Sheet, entry: SpriteEntry) {
    if (!canvas) return;
    const img = sheetImages.value[sheet.sheetPngFilename];
    if (!img) return;
    const box = cropBox(sheet, entry);
    canvas.width = box.w;
    canvas.height = box.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    if (img.complete) draw(); else img.onload = draw;
}
</script>

<template>
  <div class="grid">
    <template v-for="sheet in sheets" :key="sheet.sheetPngFilename">
      <div
        v-for="entry in sheet.entries"
        :key="`${sheet.sheetPngFilename}::${entry.name}`"
        v-show="visibleKeys.has(`${sheet.sheetPngFilename}::${entry.name}`)"
        class="cell"
        @click="emit('select', sheet.sheetPngFilename, entry.name)"
      >
        <span v-if="flaggedKeys.has(`${sheet.sheetPngFilename}::${entry.name}`)" class="flag-dot" />
        <canvas :ref="(el) => drawCrop(el as HTMLCanvasElement, sheet, entry)" class="pixelated" />
        <div class="name">{{ entry.name }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px; align-content: flex-start; }
.cell { position: relative; width: 84px; text-align: center; cursor: pointer; }
.cell canvas.pixelated { image-rendering: pixelated; max-width: 64px; max-height: 64px; background: #1a1a1a; }
.name { font-size: 10px; word-break: break-word; color: #aaa; }
.flag-dot { position: absolute; top: 0; right: 8px; width: 8px; height: 8px; border-radius: 50%; background: #e33; }
</style>
```

- [ ] **Step 4: Create the App shell**

Create `apps/tool_suite/sprite_ledger/src/App.vue`:
```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import CollectionSidebar from './components/CollectionSidebar.vue';
import SpriteGrid from './components/SpriteGrid.vue';
import { fetchSheets, fetchMeta, fetchFlags } from './services/api';
import type { Sheet, Collection, Flag } from './services/api';

const sheets = ref<Sheet[]>([]);
const collections = ref<Collection[]>([]);
const spriteMeta = ref<Record<string, { collection: string }>>({});
const openFlags = ref<Flag[]>([]);

const activeCollectionId = ref<string | null>(null);
const flaggedOnly = ref(false);
const searchText = ref('');

const selected = ref<{ sheetPngFilename: string; entryName: string } | null>(null);

async function reload() {
    sheets.value = await fetchSheets();
    const meta = await fetchMeta();
    collections.value = meta.collections;
    spriteMeta.value = meta.spriteMeta;
    openFlags.value = await fetchFlags('open');
}

onMounted(reload);

function keyFor(sheetPngFilename: string, entryName: string) {
    return `${sheetPngFilename}::${entryName}`;
}

function collectionOf(sheetPngFilename: string, entryName: string): string {
    return spriteMeta.value[keyFor(sheetPngFilename, entryName)]?.collection ?? 'uncollected';
}

const flaggedKeys = computed(() => new Set(openFlags.value.map(f => keyFor(f.sheet, f.name))));

const visibleKeys = computed(() => {
    const set = new Set<string>();
    for (const sheet of sheets.value) {
        for (const entry of sheet.entries) {
            const key = keyFor(sheet.sheetPngFilename, entry.name);
            if (activeCollectionId.value !== null && collectionOf(sheet.sheetPngFilename, entry.name) !== activeCollectionId.value) continue;
            if (flaggedOnly.value && !flaggedKeys.value.has(key)) continue;
            if (searchText.value && !entry.name.toLowerCase().includes(searchText.value.toLowerCase())) continue;
            set.add(key);
        }
    }
    return set;
});

const counts = computed(() => {
    const c: Record<string, number> = { all: 0 };
    for (const sheet of sheets.value) {
        for (const entry of sheet.entries) {
            c.all++;
            const col = collectionOf(sheet.sheetPngFilename, entry.name);
            c[col] = (c[col] ?? 0) + 1;
        }
    }
    return c;
});

function onSelect(sheetPngFilename: string, entryName: string) {
    selected.value = { sheetPngFilename, entryName };
}
</script>

<template>
  <div class="layout">
    <CollectionSidebar
      :collections="collections"
      :active-collection-id="activeCollectionId"
      :flagged-only="flaggedOnly"
      :search-text="searchText"
      :counts="counts"
      @select-collection="(id) => activeCollectionId = id"
      @toggle-flagged-only="flaggedOnly = !flaggedOnly"
      @update-search="(v) => searchText = v"
    />
    <SpriteGrid
      :sheets="sheets"
      :visible-keys="visibleKeys"
      :flagged-keys="flaggedKeys"
      @select="onSelect"
    />
    <!-- SpriteDetail panel is added in the next task; for now, selecting
         a sprite just tracks state without a visible panel yet. -->
  </div>
</template>

<style scoped>
.layout { display: flex; height: 100vh; background: #111; color: #eee; font-family: monospace; }
</style>
```

- [ ] **Step 5: Create the Vue entry point**

Create `apps/tool_suite/sprite_ledger/src/main.ts`:
```typescript
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

- [ ] **Step 6: Manual verification**

Run: `cd apps/tool_suite/sprite_ledger && npm run dev`

Open `http://localhost:5178` in a browser. Expected:
- The sidebar shows an "All (N)" count where N is a large number (the
  total individual sprite entries across all 18 catalogued sheets — this
  is in the hundreds, not 18; 18 is the sheet count, not the sprite
  count), plus each of the 7 seeded collections with its own count, and
  those counts should sum to N.
- The grid shows cropped sprite thumbnails with names underneath, not
  broken images.
- Typing in the search box narrows the visible grid to matching names.
- Clicking "Flagged only" (no flags exist yet) empties the grid.
- Clicking a collection in the sidebar filters the grid to just that
  collection's sprites (most will be under "Uncollected" or "Pipoya"/
  "Pixel Art Top Down" per the seeding rule, since nothing's been
  reassigned yet).

- [ ] **Step 7: Commit**

```bash
git add apps/tool_suite/sprite_ledger/src
git commit -m "feat(sprite-ledger): frontend shell — sprite grid + collection sidebar"
```

---

### Task 6: Sprite detail panel — collection reassignment + flag submission

**Files:**
- Create: `apps/tool_suite/sprite_ledger/src/components/SpriteDetail.vue`
- Create: `apps/tool_suite/sprite_ledger/src/components/FlagForm.vue`
- Modify: `apps/tool_suite/sprite_ledger/src/App.vue`

**Interfaces:**
- Consumes: `assignCollection`, `addFlag` from `services/api.ts` (Task 5).
- Produces: `SpriteDetail` emits `close` and `reassigned` (so `App.vue`
  can refetch meta after a reassignment); `FlagForm` emits `submitted`.

- [ ] **Step 1: Create the flag form**

Create `apps/tool_suite/sprite_ledger/src/components/FlagForm.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue';
import { addFlag } from '../services/api';

const props = defineProps<{ sheetPngFilename: string; entryName: string }>();
const emit = defineEmits<{ submitted: [] }>();

const REASONS: { id: string; label: string }[] = [
    { id: 'misaligned', label: 'Misaligned / wrong crop' },
    { id: 'wrong_colors', label: 'Wrong colors / palette' },
    { id: 'wrong_name', label: 'Wrong name' },
    { id: 'duplicate', label: 'Duplicate of another sprite' },
    { id: 'wrong_collection', label: "Doesn't belong in this collection" },
    { id: 'broken_image', label: 'Broken / corrupted image' },
    { id: 'other', label: 'Other' },
];

const comment = ref('');
const submitting = ref(false);

async function submitWithReason(reasonId: string) {
    submitting.value = true;
    await addFlag(props.sheetPngFilename, props.entryName, reasonId, comment.value);
    submitting.value = false;
    comment.value = '';
    emit('submitted');
}
</script>

<template>
  <div class="flag-form">
    <h4>Flag this sprite</h4>
    <div class="reasons">
      <button
        v-for="r in REASONS"
        :key="r.id"
        :disabled="submitting"
        @click="submitWithReason(r.id)"
      >
        {{ r.label }}
      </button>
    </div>
    <textarea
      v-model="comment"
      placeholder="Optional comment — describe what's wrong (you can add this with or without picking a reason above)"
      rows="3"
    />
  </div>
</template>

<style scoped>
.flag-form { margin-top: 16px; padding-top: 12px; border-top: 1px solid #333; }
.reasons { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.reasons button { font-size: 11px; padding: 4px 8px; }
textarea { width: 100%; box-sizing: border-box; }
</style>
```

- [ ] **Step 2: Create the sprite detail panel**

Create `apps/tool_suite/sprite_ledger/src/components/SpriteDetail.vue`:
```vue
<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { Sheet, Collection, Flag, SpriteEntry } from '../services/api';
import { imageUrl, assignCollection, fetchFlags, resolveFlag } from '../services/api';
import FlagForm from './FlagForm.vue';

const props = defineProps<{
    sheetPngFilename: string;
    entryName: string;
    sheets: Sheet[];
    collections: Collection[];
    currentCollectionId: string;
}>();

const emit = defineEmits<{ close: []; reassigned: [] }>();

const sheet = computed(() => props.sheets.find(s => s.sheetPngFilename === props.sheetPngFilename)!);
const entry = computed<SpriteEntry>(() => sheet.value.entries.find(e => e.name === props.entryName)!);

const canvasRef = ref<HTMLCanvasElement | null>(null);

function draw() {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const img = new Image();
    img.src = imageUrl(props.sheetPngFilename);
    img.onload = () => {
        const e = entry.value;
        const box = e.kind === 'object'
            ? { x: e.x!, y: e.y!, w: e.w!, h: e.h! }
            : { x: e.col! * sheet.value.gridTileWidth!, y: e.row! * sheet.value.gridTileHeight!, w: sheet.value.gridTileWidth!, h: sheet.value.gridTileHeight! };
        canvas.width = box.w * 4;
        canvas.height = box.h * 4;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w * 4, box.h * 4);
    };
}

onMounted(draw);
watch(() => [props.sheetPngFilename, props.entryName], draw);

const selectedCollection = ref(props.currentCollectionId);
watch(() => props.currentCollectionId, (v) => { selectedCollection.value = v; });

async function onCollectionChange() {
    await assignCollection(props.sheetPngFilename, props.entryName, selectedCollection.value);
    emit('reassigned');
}

const flagsForSprite = ref<Flag[]>([]);
async function loadFlagsForSprite() {
    const all = await fetchFlags('open');
    flagsForSprite.value = all.filter(f => f.sheet === props.sheetPngFilename && f.name === props.entryName);
}
onMounted(loadFlagsForSprite);
watch(() => [props.sheetPngFilename, props.entryName], loadFlagsForSprite);

async function onFlagSubmitted() {
    await loadFlagsForSprite();
    emit('reassigned'); // reuse the same "refresh parent" signal
}

async function onResolve(id: string) {
    await resolveFlag(id);
    await loadFlagsForSprite();
}
</script>

<template>
  <div class="detail-panel">
    <button class="close" @click="emit('close')">×</button>
    <canvas ref="canvasRef" class="preview" />
    <h3>{{ entryName }}</h3>
    <div class="sheet-name">{{ sheetPngFilename }}</div>
    <div class="tags" v-if="entry.tags?.length">{{ entry.tags.join(', ') }}</div>

    <label class="collection-picker">
      Collection:
      <select v-model="selectedCollection" @change="onCollectionChange">
        <option v-for="c in collections" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </label>

    <div v-if="flagsForSprite.length" class="open-flags">
      <h4>Open flags</h4>
      <div v-for="f in flagsForSprite" :key="f.id" class="flag-row">
        <span>{{ f.reason }}<template v-if="f.comment"> — {{ f.comment }}</template></span>
        <button @click="onResolve(f.id)">Resolve</button>
      </div>
    </div>

    <FlagForm
      :sheet-png-filename="sheetPngFilename"
      :entry-name="entryName"
      @submitted="onFlagSubmitted"
    />
  </div>
</template>

<style scoped>
.detail-panel { width: 320px; padding: 16px; border-left: 1px solid #333; position: relative; overflow-y: auto; }
.close { position: absolute; top: 8px; right: 8px; }
.preview canvas, .preview { image-rendering: pixelated; }
.sheet-name { font-size: 11px; color: #888; }
.tags { font-size: 11px; color: #6a6; margin-top: 4px; }
.collection-picker { display: block; margin-top: 12px; }
.open-flags { margin-top: 12px; }
.flag-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin-bottom: 4px; }
</style>
```

- [ ] **Step 3: Wire SpriteDetail into App.vue**

Modify `apps/tool_suite/sprite_ledger/src/App.vue` — replace the comment
placeholder and add the import + reload-on-reassign wiring:
```vue
<!-- add to the <script setup> imports -->
import SpriteDetail from './components/SpriteDetail.vue';
```
```vue
<!-- replace this line in the template:
    <!-- SpriteDetail panel is added in the next task; for now, selecting
         a sprite just tracks state without a visible panel yet. -->
-->
    <SpriteDetail
      v-if="selected"
      :sheet-png-filename="selected.sheetPngFilename"
      :entry-name="selected.entryName"
      :sheets="sheets"
      :collections="collections"
      :current-collection-id="collectionOf(selected.sheetPngFilename, selected.entryName)"
      @close="selected = null"
      @reassigned="reload"
    />
```

- [ ] **Step 4: Manual verification**

With `npm run dev` still running (or restarted), open `http://localhost:5178`:
- Click any sprite thumbnail — a detail panel opens on the right showing
  a 4×-zoomed preview, its name, sheet, tags, and a collection dropdown.
- Change the collection dropdown — the sidebar's per-collection counts
  update, and the grid's collection filter (if one was active) updates
  to match.
- Click a quick-choice flag reason (e.g. "Misaligned / wrong crop") —
  the flag submits, and a red dot now appears on that sprite's grid
  thumbnail (close the panel and check, or check "Open flags" reappears
  when reopening the panel).
- Reload the page — the collection assignment and the flag both persist
  (confirms `data/sprite_meta.json` and `data/flags.json` actually wrote
  to disk). Check `apps/tool_suite/sprite_ledger/data/flags.json`
  directly — it should contain the flag record with `status: "open"`.
- Click "Resolve" on the open flag in the detail panel — the red dot
  disappears from the grid.

- [ ] **Step 5: Commit**

```bash
git add apps/tool_suite/sprite_ledger/src
git commit -m "feat(sprite-ledger): sprite detail panel — collection reassignment + flagging"
```

---

### Task 7: Add-collection UI

**Files:**
- Modify: `apps/tool_suite/sprite_ledger/src/components/CollectionSidebar.vue`
- Modify: `apps/tool_suite/sprite_ledger/src/App.vue`

**Interfaces:**
- Consumes: `addCollection` from `services/api.ts` (already built in Task 5).
- Produces: nothing further consumes this — it's the last piece of the
  spec's UI surface ("You can add more collections from the UI at any
  time").

- [ ] **Step 1: Add the new-collection form to the sidebar**

Modify `apps/tool_suite/sprite_ledger/src/components/CollectionSidebar.vue`
— add to `<script setup>`:
```typescript
import { ref } from 'vue';

const newName = ref('');
const emitAdd = defineEmits<{ addCollection: [name: string] }>();
```
(Note: Vue only allows one `defineEmits` call per component — merge this
into the existing `emit` declaration from Step 2 of Task 5 rather than
adding a second one: change that line to
`const emit = defineEmits<{ selectCollection: [id: string | null]; toggleFlaggedOnly: []; updateSearch: [value: string]; addCollection: [name: string]; }>();`
and drop the `emitAdd` line above.)

Add to the template, after the `</ul>`:
```vue
    <form class="add-collection" @submit.prevent="() => { emit('addCollection', newName); newName = ''; }">
      <input v-model="newName" placeholder="New collection name" />
      <button type="submit">Add</button>
    </form>
```

Add to `<style scoped>`:
```css
.add-collection { display: flex; gap: 4px; margin-top: 12px; }
.add-collection input { flex: 1; min-width: 0; }
```

- [ ] **Step 2: Wire it in App.vue**

Modify `apps/tool_suite/sprite_ledger/src/App.vue` — add to the imports:
```typescript
import { addCollection } from './services/api';
```
Add a handler function:
```typescript
async function onAddCollection(name: string) {
    if (!name.trim()) return;
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    await addCollection(id, name.trim());
    await reload();
}
```
Add the listener to `<CollectionSidebar ...>` in the template:
```vue
      @add-collection="onAddCollection"
```

- [ ] **Step 3: Manual verification**

With the dev server running, type a new collection name (e.g. "Ruins")
into the sidebar's "New collection name" box and click Add. Expected:
it appears in the sidebar list with a count of 0, and reloading the page
still shows it (confirms it persisted to `data/collections.json`).

- [ ] **Step 4: Commit**

```bash
git add apps/tool_suite/sprite_ledger/src
git commit -m "feat(sprite-ledger): add-collection UI"
```

---

### Task 8: Final polish — root gitignore, full test run, README cross-check

**Files:**
- Modify: `.gitignore` (repo root or `apps/tool_suite/sprite_ledger/.gitignore`)

**Interfaces:**
- Consumes/produces: nothing new — this task is verification + housekeeping only.

- [ ] **Step 1: Ensure `node_modules` is ignored for the new app**

Check whether the repo-root `.gitignore` already covers `node_modules`
anywhere (`grep -n "node_modules" .gitignore`). If it uses a blanket
`node_modules/` or `**/node_modules/` pattern, nothing to do. If not, add
a scoped entry:
```
apps/tool_suite/sprite_ledger/node_modules/
```

- [ ] **Step 2: Run the full sprite_ledger test suite one more time**

Run: `cd apps/tool_suite/sprite_ledger && npm test`
Expected: all three test scripts pass (catalogue scanner, data store, API
smoke), combined assertion count printed by each.

- [ ] **Step 3: Run the full amo test suite to confirm no cross-contamination**

Run: `cd apps/amo && npm test`
Expected: unchanged, all still passing (this plan never touches
`apps/amo/**`, only reads from its `public/assets/catalogued/` at
runtime — this step just confirms that read-only access didn't
accidentally trigger a write anywhere).

- [ ] **Step 4: Confirm the README's run instructions are accurate**

Re-read `apps/tool_suite/README.md` (Task 1, Step 5) against what was
actually built — the ports (5177/3001 for lpc_forge, 5178/3002 for
sprite_ledger) and the `npm run dev` commands should match exactly what
Tasks 1 and 2 produced. Fix if anything drifted during implementation.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(tool-suite): final polish — gitignore, verify full test suite"
```
