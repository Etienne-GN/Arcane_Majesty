# LPC Forge v2 — Cast, Publish, v1 Migration (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Named characters ("cast members") designed in Forge v2 are saved as committed JSON files in the game, can be published so the game renders them with `CharacterRenderer` in every motion, and the 17 v1 Forge characters are migrated into them.

**Architecture:** A cast file stores both the editable composition (`sel`) and the game layer list generated from it (`layers`), so the game never depends on Forge code and catalogue edits never silently change a published character. The Forge API (extended `server.js`) writes cast files and regenerates `cast/index.js`; the game reads that index through a small loader. Migration is a Python step (v1 item/colour → game item/colour, PNG sampling with PIL) that emits compositions, then a Node step that turns them into cast files with the same code the Forge uses.

**Tech Stack:** as Plan A (Vue 3, Express 5, Node test scripts) + Python 3 / PIL for the migration.

**Spec:** `docs/superpowers/specs/2026-10-08-lpc-forge-v2-design.md` §2 (Cast) and §3 Cast home. Builds on Plan A (`docs/superpowers/plans/2026-10-08-lpc-forge-v2-foundation.md`).

## Global Constraints
- Cast files: `apps/amo/src/data/cast/<id>.json`; index: `apps/amo/src/data/cast/index.js` (generated, committed). `id` matches `^[a-z0-9][a-z0-9_]{0,47}$`.
- Cast JSON shape: `{ id, name, role, dbCharacter?, sel, layers, variants: { <name>: { sel, layers } }, published, updatedAt }`; `role ∈ player-preset | story | npc | enemy`.
- The game consumes only `layers` (+ variants' `layers`); the Forge edits `sel`.
- Migration never drops an item silently: every unmapped item/colour is listed in the report and recorded on the cast file as `migrationNotes: string[]`.
- Migrated cast members are written with `published: false`; the user publishes them.
- No changes to album/lore data; `dbCharacter` is free text (no Neo4j writes).
- Commit on `main`; trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tests: `npm --prefix apps/tool_suite/lpc_forge test` and `npm --prefix apps/amo test` stay green.

## Review Focus
1. Publishing a cast member whose `id` is hostile (`../x`, `a/b`, empty, 200 chars) → rejected 400, nothing written outside `cast/`. Test in Task 2.
2. A cast file referencing a catalogue item that was later removed → game validator fails loudly naming the file and id; the Forge shows the member with a warning instead of crashing. Tests in Tasks 1 and 3.
3. Two Forge tabs saving the same id → last write wins, index regenerated consistently (no half-written file: write to temp + rename). Test in Task 2 (file content is complete JSON after concurrent PUTs).
4. A v1 save whose body is non-human (skeleton, wolf head, minotaur) → body-type variant resolution falls back sensibly (skeleton → male variants), never an id that doesn't exist. Test in Task 5.
5. A v1 colour that references another layer (`"anatomy.body"`) → inherits that layer's mapped tint, not "Natural". Test in Task 5.

---

## File Structure
- Create `apps/tool_suite/lpc_forge/v2/src/model/cast.js` — pure cast model (build, read back, validate, coverage).
- Create `apps/tool_suite/lpc_forge/castStore.js` — Node file store: list/read/write/delete cast files atomically + regenerate `index.js`.
- Modify `apps/tool_suite/lpc_forge/server.js` — `createServer({ dbPath, castDir })`, `/api/cast` routes.
- Create `apps/amo/src/systems/castLoader.js` — `castConfig(id, variant?)` for the game.
- Create `apps/amo/src/data/cast/index.js` (generated; starts empty).
- Create `apps/amo/tools/test_cast.mjs` — validates every cast file against catalogue + library; in `npm test`.
- Create `v2/src/components/CastHome.vue`, `v2/src/components/CastBar.vue`; modify `App.vue`, `store.ts`.
- Create `apps/tool_suite/lpc_forge/tools/v1_map.json`, `tools/migrate_v1.py`, `tools/test_migrate_v1.py`, `tools/import_compositions.mjs`.
- Tests: `v2/tests/test_cast.mjs`, extend `tools/test_api_smoke.mjs`.

---

### Task 1: Cast model (pure)

**Files:** Create `v2/src/model/cast.js`; Test `v2/tests/test_cast.mjs`; add to `npm test`.

**Interfaces:**
- Consumes: `layersFor`, `missingIn`, `entryFor`, `layerKeyOf` (composition.js).
- Produces:
  - `ROLES = ['player-preset','story','npc','enemy']`, `CAST_ID_RE = /^[a-z0-9][a-z0-9_]{0,47}$/`
  - `slugify(name: string): string` — lowercase, non-alnum → `_`, trimmed, ≤48, `'unnamed'` if empty
  - `buildCast(catalogue, { id?, name, role, dbCharacter?, sel, variants?: {name: sel}, published?, migrationNotes? }): Cast` — fills `layers` via `layersFor`, each variant `{ sel, layers }`, `updatedAt` ISO string
  - `compositionOf(cast, variant?: string): Composition` — `{ name: cast.name, sel }` (variant's sel when given)
  - `validateCast(catalogue, cast): string[]` — errors: bad id, bad role, unknown item ids in `sel` (`"<slot>: unknown item <id>"`), layers out of date (`"layers are stale"` when `layersFor(sel)` ≠ `layers`)
  - `coverage(layers): { clean: number, total: 15, gaps: Record<motion, string[]> }` — clean = motions with no missing layers (manifest-level, `missingIn` without file check)

- [ ] **Step 1: failing test** `v2/tests/test_cast.mjs`

```js
#!/usr/bin/env node
/** Unit tests for the Forge v2 cast model. Run: node v2/tests/test_cast.mjs */
import { readFileSync } from 'node:fs';
import { slugify, buildCast, compositionOf, validateCast, coverage, CAST_ID_RE } from '../src/model/cast.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

check('slug', slugify('Nythorian Soldier 2'), 'nythorian_soldier_2');
check('slug strips', slugify('  ../Évil/ name!! '), 'evil_name');
check('slug empty', slugify('!!!'), 'unnamed');
check('id re rejects traversal', CAST_ID_RE.test('../x'), false);

const sel = { body: { id: 'bodies/male' }, head: { id: 'heads/human/male' }, cape: { id: 'solid/female', color: 'red' } };
const c = buildCast(CAT, { name: 'Eldrin', role: 'story', dbCharacter: 'Eldrin', sel,
    variants: { traveling: { ...sel, hat: { id: 'cloth/hood/adult' } } } });
check('id from name', c.id, 'eldrin');
check('layers built', c.layers.some(l => l.slot === 'cape'), true);
check('variant layers', c.variants.traveling.layers.some(l => l.slot === 'hat'), true);
check('unpublished by default', c.published, false);
check('valid', validateCast(CAT, c), []);
check('round trip', compositionOf(c).sel, sel);
check('variant comp', compositionOf(c, 'traveling').sel.hat.id, 'cloth/hood/adult');

const bad = { ...c, id: 'Bad Id', role: 'boss', sel: { ...sel, hat: { id: 'nope/nope' } } };
const errs = validateCast(CAT, bad);
check('bad id', errs.some(e => e.includes('id')), true);
check('bad role', errs.some(e => e.includes('role')), true);
check('unknown item', errs.includes('hat: unknown item nope/nope'), true);
check('stale layers', validateCast(CAT, { ...c, layers: [] }).includes('layers are stale'), true);

const cov = coverage(c.layers);
check('cape breaks run', cov.gaps.run.length > 0, true);
check('total 15', cov.total, 15);
check('clean < 15 with cape', cov.clean < 15, true);

if (fails.length) { console.error(`✗ cast: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ cast: ${passed} passed`);
```

- [ ] **Step 2: run → FAIL** (module not found).
- [ ] **Step 3: implement** `v2/src/model/cast.js`

```js
/**
 * Cast members: named characters saved as game data (apps/amo/src/data/cast).
 * A cast file keeps the editable composition (`sel`) and the game layer list
 * generated from it (`layers`); the game reads only `layers`.
 */
import { layersFor, missingIn, entryFor } from './composition.js';
import { DEFAULT_ANIMS } from '../../../../../amo/src/systems/animResolve.js';

export const ROLES = ['player-preset', 'story', 'npc', 'enemy'];
export const CAST_ID_RE = /^[a-z0-9][a-z0-9_]{0,47}$/;

export function slugify(name) {
    const s = String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
    return s || 'unnamed';
}

export function buildCast(catalogue, m) {
    const comp = sel => ({ name: m.name, sel });
    const variants = {};
    for (const [vn, vsel] of Object.entries(m.variants ?? {})) variants[vn] = { sel: vsel, layers: layersFor(catalogue, comp(vsel)) };
    const cast = {
        id: m.id ?? slugify(m.name), name: m.name, role: m.role ?? 'npc',
        sel: m.sel, layers: layersFor(catalogue, comp(m.sel)), variants,
        published: !!m.published, updatedAt: new Date().toISOString(),
    };
    if (m.dbCharacter) cast.dbCharacter = m.dbCharacter;
    if (m.migrationNotes?.length) cast.migrationNotes = m.migrationNotes;
    return cast;
}

export function compositionOf(cast, variant) {
    const sel = variant ? cast.variants?.[variant]?.sel : cast.sel;
    return { name: cast.name, sel: JSON.parse(JSON.stringify(sel ?? cast.sel)) };
}

export function validateCast(catalogue, cast) {
    const errs = [];
    if (!CAST_ID_RE.test(cast.id ?? '')) errs.push(`bad id "${cast.id}"`);
    if (!ROLES.includes(cast.role)) errs.push(`bad role "${cast.role}"`);
    const checkSel = (sel, where) => {
        for (const [slot, p] of Object.entries(sel ?? {})) {
            if (p?.id && !entryFor(catalogue, slot, p.id)) errs.push(`${where}${slot}: unknown item ${p.id}`);
        }
    };
    checkSel(cast.sel, '');
    for (const [vn, v] of Object.entries(cast.variants ?? {})) checkSel(v.sel, `${vn}/`);
    if (JSON.stringify(layersFor(catalogue, { name: cast.name, sel: cast.sel ?? {} })) !== JSON.stringify(cast.layers))
        errs.push('layers are stale');
    return errs;
}

export function coverage(layers) {
    const gaps = {};
    let clean = 0;
    for (const m of DEFAULT_ANIMS) {
        gaps[m] = missingIn(layers, m).map(l => `${l.slot}:${l.id}`);
        if (!gaps[m].length) clean++;
    }
    return { clean, total: DEFAULT_ANIMS.length, gaps };
}
```
- [ ] **Step 4: run → PASS**; add `node v2/tests/test_cast.mjs` to `npm test`.
- [ ] **Step 5: commit** `feat(lpc_forge): v2 cast model — build, validate and score cast members`

---

### Task 2: Cast file store + API

**Files:** Create `apps/tool_suite/lpc_forge/castStore.js`; Modify `server.js`; Test: extend `tools/test_api_smoke.mjs`.

**Interfaces:**
- Produces (castStore.js):
  - `listCast(dir): Cast[]` (sorted by name; unreadable files skipped and reported via `console.warn`)
  - `writeCast(dir, cast): void` — atomic (`<id>.json.tmp` then `rename`), then `writeIndex(dir)`
  - `deleteCast(dir, id): boolean`, `writeIndex(dir): void` — `index.js`:
    ```js
    // GENERATED by LPC Forge v2 (castStore.writeIndex) — do not edit by hand.
    import eldrin from './eldrin.json';
    export const CAST = { eldrin };
    ```
- Produces (server): `createServer({ dbPath?, castDir? })` (defaults: `saves.db`, `../../amo/src/data/cast`); `GET /api/cast` → `Cast[]`; `PUT /api/cast/:id` (body = Cast; 400 if `:id` fails `CAST_ID_RE` or `body.id !== :id`); `DELETE /api/cast/:id` (400 bad id, 404 missing).

- [ ] **Step 1: failing tests** — in `test_api_smoke.mjs`, create the server with temp dirs:

```js
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const tmp = mkdtempSync(join(tmpdir(), 'forge-api-'));
const app = createServer({ dbPath: join(tmp, 'saves.db'), castDir: join(tmp, 'cast') });
```
and add:
```js
const cast = { id: 'eldrin', name: 'Eldrin', role: 'story', sel: {}, layers: [], variants: {}, published: false };
const put = await fetch(base + '/api/cast/eldrin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cast) });
if (put.status === 200) passed++; else fails.push(`cast put → ${put.status}`);
const listed = await (await fetch(base + '/api/cast')).json();
if (listed.length === 1 && listed[0].id === 'eldrin') passed++; else fails.push('cast list');
const idx = readFileSync(join(tmp, 'cast', 'index.js'), 'utf8');
if (idx.includes("import eldrin from './eldrin.json'") && idx.includes('export const CAST = { eldrin }')) passed++; else fails.push('index.js');
for (const bad of ['..%2Fx', 'A', 'a%2Fb', 'x'.repeat(60)]) {
    const r = await fetch(base + `/api/cast/${bad}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cast, id: decodeURIComponent(bad) }) });
    if (r.status === 400) passed++; else fails.push(`bad id ${bad} → ${r.status}`);
}
const mismatch = await fetch(base + '/api/cast/kael', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cast) });
if (mismatch.status === 400) passed++; else fails.push('id mismatch accepted');
await Promise.all([1, 2, 3, 4, 5].map(n => fetch(base + '/api/cast/eldrin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cast, name: 'E' + n }) })));
JSON.parse(readFileSync(join(tmp, 'cast', 'eldrin.json'), 'utf8')); passed++;   // complete JSON after concurrent writes
if (!readdirSync(join(tmp, 'cast')).some(f => f.endsWith('.tmp'))) passed++; else fails.push('temp file left');
const del = await fetch(base + '/api/cast/eldrin', { method: 'DELETE' });
if (del.status === 200 && !readFileSync(join(tmp, 'cast', 'index.js'), 'utf8').includes('eldrin')) passed++; else fails.push('delete');
```
(Also switch the existing save round trip to the temp db — fixes Plan A deferred minor "smoke test writes to the real saves.db"; and replace the no-op `'/lpc/../server.js'` case with `'/lpc/%2e%2e/server.js'` — fixes the other.)
- [ ] **Step 2: run → FAIL** (`createServer` ignores options / no `/api/cast`).
- [ ] **Step 3: implement** `castStore.js`:

```js
import { readdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

let seq = 0

export function listCast(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const f of readdirSync(dir).filter(f => f.endsWith('.json')).sort()) {
    try { out.push(JSON.parse(readFileSync(join(dir, f), 'utf8'))) }
    catch (e) { console.warn(`cast: skipping unreadable ${f}: ${e.message}`) }
  }
  return out.sort((a, b) => String(a.name).localeCompare(String(b.name)))
}

export function writeIndex(dir) {
  const ids = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort()
  const body = ['// GENERATED by LPC Forge v2 (castStore.writeIndex) — do not edit by hand.',
    ...ids.map(id => `import ${id} from './${id}.json';`),
    `export const CAST = { ${ids.join(', ')} };`, ''].join('\n')
  atomicWrite(join(dir, 'index.js'), body)
}

export function writeCast(dir, cast) {
  mkdirSync(dir, { recursive: true })
  atomicWrite(join(dir, `${cast.id}.json`), JSON.stringify(cast, null, 2) + '\n')
  writeIndex(dir)
}

export function deleteCast(dir, id) {
  const p = join(dir, `${id}.json`)
  if (!existsSync(p)) return false
  unlinkSync(p)
  writeIndex(dir)
  return true
}

function atomicWrite(path, text) {
  const tmp = `${path}.${process.pid}.${++seq}.tmp`
  writeFileSync(tmp, text)
  renameSync(tmp, path)
}
```
Server: `createServer({ dbPath = join(__dirname, 'saves.db'), castDir = join(__dirname, '../../amo/src/data/cast') } = {})`, routes using `CAST_ID_RE` imported from `./v2/src/model/cast.js`.
- [ ] **Step 4: run → PASS**; check `git status` shows no `saves.db` change from the test.
- [ ] **Step 5: commit** `feat(lpc_forge): cast files API — atomic writes, generated index, id validation`

---

### Task 3: Game side — loader + validator

**Files:** Create `apps/amo/src/data/cast/index.js` (via `writeIndex`, empty `CAST = {  }`), `apps/amo/src/systems/castLoader.js`, `apps/amo/tools/test_cast.mjs`; modify `apps/amo/package.json` test.

**Interfaces:**
- Produces: `castConfig(id: string, variant?: string, cast = CAST): { layers, animations: DEFAULT_ANIMS, defaultAnim: 'walk', defaultDir: 'down' } | null` — only for `published` members; returns null otherwise.
- `test_cast.mjs`: for every `cast/*.json`: parses; `id` = filename; every layer id exists in the catalogue for its `slot`; walk PNG of every layer exists under `ressources/lpc_merged/spritesheets` (via `animPath`); index.js imports exactly the json files present. Prints `✓ cast: N files ok` or names file + problem and exits 1.

- [ ] **Step 1: failing test** — `tools/test_cast.mjs` with an inline fixture check of `castConfig` plus the directory scan:

```js
#!/usr/bin/env node
/** Validates cast files (apps/amo/src/data/cast) against the catalogue and library; tests castConfig. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { castConfig } from '../src/systems/castLoader.js';
import { animPath } from '../src/systems/lpcLayout.js';

const CAT = JSON.parse(readFileSync(new URL('../src/data/character_catalogue.json', import.meta.url)));
const DIR = new URL('../src/data/cast/', import.meta.url);
const LIB = new URL('../ressources/lpc_merged/spritesheets/', import.meta.url);
const fails = []; let passed = 0;

// castConfig on fixtures
const L = [{ slot: 'body', type: 'body', id: 'bodies/male', zPos: 10, anims: ['walk'] }];
const fx = { a: { id: 'a', published: true, layers: L, variants: { v: { layers: [] } } }, b: { id: 'b', published: false, layers: L } };
const cfg = castConfig('a', undefined, fx);
if (cfg?.layers === L && cfg.defaultAnim === 'walk') passed++; else fails.push('castConfig published');
if (castConfig('b', undefined, fx) === null) passed++; else fails.push('unpublished must be null');
if (castConfig('a', 'v', fx)?.layers.length === 0) passed++; else fails.push('variant layers');
if (castConfig('zzz', undefined, fx) === null) passed++; else fails.push('unknown id');

// every cast file
const files = existsSync(DIR) ? readdirSync(DIR).filter(f => f.endsWith('.json')) : [];
for (const f of files) {
    let c;
    try { c = JSON.parse(readFileSync(new URL(f, DIR), 'utf8')); } catch (e) { fails.push(`${f}: bad JSON`); continue; }
    if (c.id !== f.slice(0, -5)) fails.push(`${f}: id "${c.id}" ≠ filename`);
    const all = [['', c.layers], ...Object.entries(c.variants ?? {}).map(([n, v]) => [n + '/', v.layers])];
    for (const [where, layers] of all) for (const l of layers ?? []) {
        const slotEntries = CAT[l.slot] ?? [];
        const known = slotEntries.some(e => e.id === l.id || (e.companions ?? []).some(cp => cp.id === l.id));
        if (!known) fails.push(`${f}: ${where}${l.slot} unknown item ${l.id}`);
        const p = animPath(l, l.anims?.includes('walk') ? 'walk' : (l.anims?.[0] ?? 'walk')).replace(/^lpc\//, '');
        if (!existsSync(new URL(p, LIB))) fails.push(`${f}: ${where}missing file ${p}`);
    }
}
const idx = existsSync(new URL('index.js', DIR)) ? readFileSync(new URL('index.js', DIR), 'utf8') : '';
const imported = [...idx.matchAll(/from '\.\/([a-z0-9_]+)\.json'/g)].map(m => m[1]).sort();
if (JSON.stringify(imported) === JSON.stringify(files.map(f => f.slice(0, -5)).sort())) passed++;
else fails.push(`index.js imports ${imported} but files are ${files}`);

if (fails.length) { console.error(`✗ cast: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ cast: ${passed} checks, ${files.length} files ok`);
```
- [ ] **Step 2: run → FAIL** (castLoader missing).
- [ ] **Step 3: implement** `castLoader.js`:

```js
/**
 * Published cast members (designed in LPC Forge v2, files in src/data/cast) as
 * CharacterRenderer configs. Unpublished members are invisible to the game.
 */
import { CAST } from '../data/cast/index.js';
import { DEFAULT_ANIMS } from './animResolve.js';

export function castConfig(id, variant, cast = CAST) {
    const c = cast[id];
    if (!c?.published) return null;
    const layers = variant ? c.variants?.[variant]?.layers : c.layers;
    if (!layers) return null;
    return { layers, animations: DEFAULT_ANIMS, defaultAnim: 'walk', defaultDir: 'down' };
}
```
Generate the empty index: `node -e "import('/home/etienne/projects/Arcane_Majesty/apps/tool_suite/lpc_forge/castStore.js').then(m=>{require('fs').mkdirSync('apps/amo/src/data/cast',{recursive:true});m.writeIndex('apps/amo/src/data/cast')})"`. Add `node tools/test_cast.mjs && ` after the lpcPalettes test in `npm test`.
- [ ] **Step 4: run → PASS**; `npm test` + `npm run build` in `apps/amo` (JSON imports bundle).
- [ ] **Step 5: commit** `feat(amo): published cast members load from src/data/cast (castConfig) + validator`

---

### Task 4: Forge UI — Cast home and cast bar

**Files:** Create `v2/src/components/CastHome.vue`, `v2/src/components/CastBar.vue`; modify `store.ts`, `App.vue`.

**Interfaces:**
- store additions: `store.screen: 'cast' | 'forge'` (default `'cast'`), `store.castMeta: { id, role, dbCharacter, published, variant: string|null, variants: Record<string, sel>, migrationNotes?: string[] } | null` (null = scratch composition); actions `refreshCast()`, `openCast(cast)`, `saveCast()` (PUT via `buildCast`), `newCast()`, `addVariant(name)`, `switchVariant(name|null)`, `deleteCast(id)`; `castList: Ref<Cast[]>`.
- CastHome: grid of cards (animated walk/down `CharacterCanvas`, name, role, Published/Draft badge, `coverage(layers).clean/15 motions clean`, `migrationNotes` count as a warning chip, `validateCast` errors as a red chip), filter by role, "New character", click → `openCast` + `screen='forge'`.
- CastBar (in the header, forge screen): back-to-cast button, id (read-only once saved), role select, dbCharacter input with `<datalist>` of names from `@game/data/characters.js` `CHARACTERS` (`name` field, deduped), variant select (Base + variants) + "New variant", Published toggle, "Save to cast" (disabled when `validateCast` has errors other than stale layers; shows them).

- [ ] **Step 1:** store additions (code as interfaces above; `saveCast` builds with the *current* variant's sel written back into `variants`/`sel` before `buildCast`).
- [ ] **Step 2:** `CastBar.vue` + `CastHome.vue`.
- [ ] **Step 3:** `App.vue` switches on `store.screen`.
- [ ] **Step 4: verify** `npm run build:v2`; with the API running, create "Test Hero" via the UI flow equivalent: `PUT /api/cast/test_hero` from a node one-liner using `buildCast`, screenshot Cast home (card shows coverage + Draft), open `#comp` not needed. Delete the test cast afterwards.
- [ ] **Step 5: commit** `feat(lpc_forge): v2 cast home and cast bar — save, variants, publish`

---

### Task 5: v1 → game mapping (Python) 

**Files:** Create `tools/v1_map.json`, `tools/migrate_v1.py`, `tools/test_migrate_v1.py`.

**Interfaces:**
- `v1_map.json`: `{ "<v1 key>": { "slot": "<game slot>", "id": "<exact id>" } | { "slot", "base": "<id prefix>" } | { "skip": "<reason>" } }` — `base` items resolve by body: `BODY_VARIANTS = { male: ['male'], female: ['female','thin'], muscular: ['muscular','male'], teen: ['teen','thin','female'], pregnant: ['pregnant','female','thin'], skeleton: ['male'], child: ['child'] }`, then `adult`, then the bare base.
- `migrate_v1.py`:
  - `resolve_item(key, body, catalogue, vmap) -> (slot, id) | None`
  - `v1_rgb(color_name, v1colors) -> (r,g,b) | None` (middle swatch of the palette)
  - `file_color_rgb(slot, entry, color) -> (r,g,b)` — mean of opaque mid-tone pixels in that colour's walk PNG (PIL), cached
  - `nearest_option(rgb, options: [(name_or_index, rgb)]) -> name_or_index`
  - `migrate_save(name, data, ...) -> { comp: {name, sel}, notes: [str] }` — body first (its colour resolves `"anatomy.body"` references), then every other key; eyes colour `eyes_<c>` → eyes file colour `<c>` when offered
  - CLI: `python3 tools/migrate_v1.py --out <file.json>` reads `saves.db` (type `character`), writes `[{name, role:'story'|'enemy'|'npc', comp, notes}]` and prints a report (per character: mapped N, notes…). Role guess: names in `characters.js` story list → `story`; Skeleton/Lycan/Minotaur/Soldier → `enemy`; else `npc`.
  - Tint palettes come from the game via `node -e` printing `JSON.stringify({TINT_PALETTE, TINT_MATERIAL, SOURCE_MATERIAL})` from `apps/amo/src/systems/lpcPalettes.js`.

- [ ] **Step 1: failing tests** `tools/test_migrate_v1.py` (unittest): body variant resolution (`clothes.legs.pants` female → `pants/thin` or `pants/female`, whichever the catalogue has first in order; skeleton → male variant); `anatomy.shadow.shadow` → skip with a note; unknown key → note `"no mapping for <key>"`; `"anatomy.body"` colour on a head → head tint index equals the body's; `nearest_option` picks the closest; every non-skip entry in `v1_map.json` resolves to an existing catalogue id for at least one body type.
- [ ] **Step 2: run → FAIL.**
- [ ] **Step 3: implement** `v1_map.json` (all 80 keys from the saves; use the candidate table: e.g. `clothes.cape.solid → {slot:'cape', base:'solid'}`, `clothes.torso2.legion → {slot:'torso_armour', base:'armour/legion'}`, `clothes.shoulders.plate → {slot:'shoulders', base:'pauldrons'}`, `clothes.shoulders.leather → {slot:'shoulders', base:'mantal'}`, `clothes.torso3.frock → {slot:'torso_jacket', base:'jacket/frock'}`, `clothes.trim.trim → {skip:'cape trim: no ULPC equivalent (cape/trim exists only as a cape)'}` …) and `migrate_v1.py`.
- [ ] **Step 4: run → PASS.** Run the CLI; read the report.
- [ ] **Step 5: commit** `feat(lpc_forge): v1 save → game composition mapping with colour matching`

---

### Task 6: Import migrated characters as cast files

**Files:** Create `tools/import_compositions.mjs`; generated `apps/amo/src/data/cast/*.json` + `index.js`.

**Interfaces:** `node tools/import_compositions.mjs <migrated.json>` → for each entry `buildCast(CAT, { name, role, sel: comp.sel, migrationNotes: notes, published: false })`, `validateCast` (abort on any error except none), `writeCast(castDir, cast)`; skips ids that already exist unless `--force`.

- [ ] **Step 1:** write the script (uses `castStore.js` + `cast.js`), run it on the Task 5 output.
- [ ] **Step 2: verify** `npm --prefix apps/amo test` (test_cast validates all 17), screenshot each migrated character's grid in Forge v2 (via `#comp=`), compare against the v1 preview image stored in `saves.db` (`preview` column) side by side; list per character the motions that lose layers.
- [ ] **Step 3: commit** `feat(cast): 17 v1 Forge characters migrated to cast files (drafts)`

---

## Self-review notes
- Spec §2 cast model → Tasks 1–3; publish → `published` flag + castConfig; migration → Tasks 5–6; Cast home → Task 4. Switching `characters.js` story characters to cast entries stays out of scope (spec).
- Review Focus: 1 → Task 2 bad-id loop; 2 → Task 1 `unknown item` + Task 3 validator; 3 → Task 2 concurrent PUTs + no .tmp; 4 → Task 5 skeleton test; 5 → Task 5 `"anatomy.body"` test.
