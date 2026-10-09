# LPC Forge v2 — Foundation (Plan A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Forge v2 (:5179) that composes characters from the game's own LPC library and plays them in all 15 motions × 4 directions, showing exactly which layers vanish in which motion.

**Architecture:** Pure layout/palette logic is extracted from the game's Phaser code into Phaser-free modules (`lpcLayout.js`, `lpcPalettes.js`) that both the game and the Forge import (`@game` alias), so the Forge renders what the game renders. The Forge v2 UI is a Vue 3 app under `lpc_forge/v2/` (same pattern as sprite_ledger v2) drawing layers on canvases; the existing Express server additionally serves the merged LPC library read-only.

**Tech Stack:** Vue 3 + TS (`<script setup>`), Vite 5, Express 5, plain ESM `.js` model modules tested with Node (`node tools/test_*.mjs`, no test framework — same style as the game/ledger).

**Spec:** `docs/superpowers/specs/2026-10-08-lpc-forge-v2-design.md` (this plan = spec §1, §3 Composer + Motion stage, build-order steps 1–2). Later plans: B cast/publish/migration, C gap review + motion rules, D motion workshop, E compare/export/credits/randomize.

## Global Constraints
- Forge v2 UI port **5179** (`strictPort: true`); API stays on **3001**; v1 stays on **5177** via `npm run dev:v1`.
- `npm run dev` (in `apps/tool_suite/lpc_forge`) = API + v2.
- Library is read-only: `apps/amo/ressources/lpc_merged/spritesheets`, served at `/lpc/...` (same relative paths the game uses under `public/lpc`).
- Item source = `apps/amo/src/data/character_catalogue.json` (never copied; imported via `@game`).
- The 15 logical motions, in this order: `walk idle hurt slash backslash halfslash thrust shoot spellcast run sit jump climb combat_idle emote` (`DEFAULT_ANIMS`).
- Game behaviour must not change: after Tasks 1–2, `cd apps/amo && npm test && npm run build` pass.
- Commit directly on `main`; message trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- English UI copy.

## Review Focus
1. A layer whose sheet has an empty direction row (e.g. longsword behind-layer has no DOWN content) → hidden for that direction, never drawn from another row. Test in Task 4 (`frameGeometry` + `rowHasContent`).
2. Oversize weapon sheets (128/192 px frames) → frame size detected, drawn centred on the 64 px body cell. Test in Task 4.
3. A 404 / missing PNG for a layer+motion the manifest claims → layer shown as missing in that motion, no crash, no retry storm. Test in Task 3 (server 404) + Task 5 (`loadSheet` resolves `null`).
4. 1-row sheets (`hurt`, `climb`) → the same row used for every direction. Test in Task 4.
5. `/lpc/..%2F..` path traversal → 404, never a file outside the library. Test in Task 3.

---

## File Structure

Game (shared, Phaser-free):
- Create `apps/amo/src/systems/lpcLayout.js` — slot list, slot→render type, `animPath(layer, anim)`, frame rates, frame-geometry rules.
- Create `apps/amo/src/systems/lpcPalettes.js` — palette tables + `remapPixels()` + `swapParamsFor()`.
- Modify `apps/amo/src/systems/CharacterRenderer.js` — import `animPath`, `remapPixels`, `frameRateFor` instead of local copies.
- Modify `apps/amo/src/scenes/CharacterCreatorScene.js` — import tables/`rType`/`ALL_TYPES` from the new modules.
- Create `apps/amo/tools/test_lpc_layout.mjs`, `apps/amo/tools/test_lpc_palettes.mjs`; add both to `npm test`.

Forge v2:
- Create `apps/tool_suite/lpc_forge/vite.v2.config.ts`, `v2/index.html`, `v2/src/main.ts`, `v2/src/App.vue`, `v2/src/styles.css`, `v2/SPEC.md`.
- Create `v2/src/model/composition.js` — composition state ⇄ game LayerConfig list, coverage.
- Create `v2/src/render/frames.js` — pure frame geometry. `v2/src/render/sheets.js` — browser image loading, recolour, row-content scan, drawing.
- Create `v2/src/store.ts` — reactive app state + autosave.
- Create components `v2/src/components/{SlotList,ItemPicker,ColorPicker,CharacterCanvas,MotionStage,LayerList,SavesPanel}.vue`.
- Modify `server.js` — `/lpc` static route. Modify `package.json` scripts.
- Create tests `tools/test_api_smoke.mjs`, `v2/tests/test_composition.mjs`, `v2/tests/test_frames.mjs`; `npm test` runs all three.

---

### Task 1: `lpcLayout.js` — shared paths, slots, frame rules

**Files:**
- Create: `apps/amo/src/systems/lpcLayout.js`
- Modify: `apps/amo/src/systems/CharacterRenderer.js` (remove local `animUrl`, `WEAPON_TYPES`, `COLOR_TYPES` def → import; replace `expectedRate` expression)
- Modify: `apps/amo/src/scenes/CharacterCreatorScene.js:8-39` (`RENDER_TYPE`, `rType`, `ALL_TYPES` → import)
- Test: `apps/amo/tools/test_lpc_layout.mjs`; Modify `apps/amo/package.json` `test` script

**Interfaces:**
- Produces:
  - `SLOTS: string[]` (= creator `ALL_TYPES`, same order)
  - `RENDER_TYPE: Record<string,string>`, `renderType(slot: string): string`
  - `COLOR_TYPES: Set<string>`, `WEAPON_TYPES: Set<string>`
  - `animPath(layer: LayerConfig, anim: string): string` → `"lpc/<type>/<id>/..."` (no leading slash)
  - `frameRateFor(anim: string): number` (idle 2, slash 11, else 8)
  - `walkSkip(anim: string, cols: number): number` (1 when anim==='walk' && cols===9, else 0)

- [ ] **Step 1: Write the failing test** — `apps/amo/tools/test_lpc_layout.mjs`

```js
#!/usr/bin/env node
/** Unit tests for lpcLayout.js (shared by the game and LPC Forge v2). Run: node tools/test_lpc_layout.mjs */
import { SLOTS, renderType, animPath, frameRateFor, walkSkip } from '../src/systems/lpcLayout.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

check('slot count', SLOTS.length, 35);
check('first slot', SLOTS[0], 'head');
check('torso_clothes → torso', renderType('torso_clothes'), 'torso');
check('staff_accessory → weapon', renderType('staff_accessory'), 'weapon');
check('hair → hair', renderType('hair'), 'hair');

check('plain body', animPath({ type: 'body', id: 'bodies/male' }, 'run'), 'lpc/body/bodies/male/run.png');
check('itemName', animPath({ type: 'weapon', id: 'sword/arming/universal', itemName: 'fg' }, 'walk'),
      'lpc/weapon/sword/arming/universal/walk/fg.png');
check('color', animPath({ type: 'cape', id: 'solid/female', color: 'red' }, 'walk'), 'lpc/cape/solid/female/walk/red.png');
check('weapon default name', animPath({ type: 'weapon', id: 'sword/longsword' }, 'slash'),
      'lpc/weapon/sword/longsword/slash/longsword.png');
check('cape no color → red', animPath({ type: 'cape', id: 'solid' }, 'walk'), 'lpc/cape/solid/walk/red.png');

check('idle fps', frameRateFor('idle'), 2);
check('slash fps', frameRateFor('slash'), 11);
check('run fps', frameRateFor('run'), 8);
check('walk 9 cols skips 1', walkSkip('walk', 9), 1);
check('walk 8 cols no skip', walkSkip('walk', 8), 0);
check('run no skip', walkSkip('run', 9), 0);

if (fails.length) { console.error(`✗ lpcLayout: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ lpcLayout: ${passed} passed`);
```

- [ ] **Step 2: Run it — expect FAIL** `cd apps/amo && node tools/test_lpc_layout.mjs` → `Cannot find module .../lpcLayout.js`

- [ ] **Step 3: Implement** — `apps/amo/src/systems/lpcLayout.js`

```js
/**
 * Phaser-free LPC layout rules shared by the game (CharacterRenderer,
 * CharacterCreatorScene) and LPC Forge v2 (via its @game alias). Anything the
 * Forge must agree with the game on — where a layer's PNG lives, slot order,
 * frame rates, the walk standing-frame skip — lives here and only here.
 */

// Creator slot order (UI types). Catalogue keys are a subset of these.
export const SLOTS = [
    'head','eyes','nose','ears','horns','fins','hair','beards','facial','body','tail','wings',
    'torso_clothes','torso_jacket','torso_mail','torso_armour','torso_waist',
    'legs','dress','feet','arms','shoulders',
    'hat','neck','cape','staff_accessory','backpack','shield','weapon',
    'wound_brain','wound_eye_left','wound_eye_right','wound_mouth','wound_ribs','wound_arm',
];

// UI slot → on-disk folder under lpc/ (entry.renderType overrides per entry).
export const RENDER_TYPE = {
    torso_clothes: 'torso', torso_jacket: 'torso',
    torso_mail: 'torso', torso_armour: 'torso', torso_waist: 'torso',
    tail: 'body', wings: 'body',
    ears: 'head', horns: 'head', fins: 'head', nose: 'head',
    wound_arm: 'body', wound_brain: 'body',
    wound_eye_left: 'body', wound_eye_right: 'body',
    wound_mouth: 'body', wound_ribs: 'body',
    staff_accessory: 'weapon',
};
export function renderType(slot) { return RENDER_TYPE[slot] ?? slot; }

// These types use  type/id/anim/{itemname}.png  (item name = last segment of id)
export const WEAPON_TYPES = new Set(['weapon']);
// These types use  type/id/anim/{color}.png  (color stored in layer.color)
export const COLOR_TYPES = new Set(['cape', 'backpack']);

/** Relative URL path (no leading slash) of a layer's PNG for one concrete anim. */
export function animPath(layer, anim) {
    if (layer.itemName) return `lpc/${layer.type}/${layer.id}/${anim}/${layer.itemName}.png`;
    if (layer.color != null) return `lpc/${layer.type}/${layer.id}/${anim}/${layer.color}.png`;
    if (WEAPON_TYPES.has(layer.type)) {
        const parts = layer.id.split('/');
        return `lpc/${layer.type}/${layer.id}/${anim}/${parts[parts.length - 1]}.png`;
    }
    if (COLOR_TYPES.has(layer.type)) return `lpc/${layer.type}/${layer.id}/${anim}/red.png`;
    return `lpc/${layer.type}/${layer.id}/${anim}.png`;
}

/** Playback rate (frames/s) per animation — the game's values. */
export function frameRateFor(anim) {
    return anim === 'idle' ? 2 : anim === 'slash' ? 11 : 8;
}

/** ULPC walk sheets carry a standing frame in column 0; the game skips it. */
export function walkSkip(anim, cols) {
    return anim === 'walk' && cols === 9 ? 1 : 0;
}
```

- [ ] **Step 4: Rewire the game.** In `CharacterRenderer.js`: delete the local `WEAPON_TYPES`, `COLOR_TYPES` and `animUrl` definitions; add `import { animPath, COLOR_TYPES, WEAPON_TYPES, frameRateFor } from './lpcLayout.js';` and `export { COLOR_TYPES };` (it was exported before); replace every `animUrl(` call with `animPath(`; replace `const expectedRate = animName === 'idle' ? 2 : animName === 'slash' ? 11 : 8;` with `const expectedRate = frameRateFor(animName);`. In `CharacterCreatorScene.js`: delete `RENDER_TYPE`, `rType`, and `ALL_TYPES` definitions; add `import { RENDER_TYPE, renderType as rType, SLOTS as ALL_TYPES } from '../systems/lpcLayout.js';`. Check with `grep -n "RENDER_TYPE\|ALL_TYPES\|rType(" src/scenes/CharacterCreatorScene.js` that remaining uses still resolve.

- [ ] **Step 5: Add to `npm test`** — in `apps/amo/package.json` `test`, insert `node tools/test_lpc_layout.mjs && ` right after `node tools/test_anim_resolve.mjs && `.

- [ ] **Step 6: Verify** `cd apps/amo && node tools/test_lpc_layout.mjs && npm test && npm run build` → all pass, build succeeds.

- [ ] **Step 7: Commit**
```bash
git add apps/amo/src/systems/lpcLayout.js apps/amo/src/systems/CharacterRenderer.js apps/amo/src/scenes/CharacterCreatorScene.js apps/amo/tools/test_lpc_layout.mjs apps/amo/package.json
git commit -m "refactor(amo): LPC paths, slots and frame rules in a Phaser-free module shared with Forge v2"
```

---

### Task 2: `lpcPalettes.js` — palette tables and pixel remap

**Files:**
- Create: `apps/amo/src/systems/lpcPalettes.js`
- Modify: `apps/amo/src/scenes/CharacterCreatorScene.js` (move out `PALETTE_SOURCE`, `TINT_PALETTE` + the `['fur','green','tan','zombie']` aliasing, `FORCE_TINT_TYPES`, `FORCE_TINT_BASE`, `SOURCE_MATERIAL`, `TINT_MATERIAL`, `COLOR_SWATCH_HEX`; import them)
- Modify: `apps/amo/src/systems/CharacterRenderer.js` (`_buildSwappedTexture` uses `remapPixels`)
- Test: `apps/amo/tools/test_lpc_palettes.mjs`; add to `npm test`

**Interfaces:**
- Produces:
  - `PALETTE_SOURCE`, `TINT_PALETTE`, `SOURCE_MATERIAL`, `TINT_MATERIAL`, `FORCE_TINT_TYPES`, `FORCE_TINT_BASE`, `COLOR_SWATCH_HEX` (moved verbatim)
  - `remapPixels(data: Uint8ClampedArray|number[], sourceColors: number[], targetShades: number[]): void` — in place
  - `tintMaterialFor(slot, entry): string|null` ; `sourceMaterialFor(slot, entry): string`
  - `swapParamsFor(slot, entry, tintIdx): SwapParams|null` where `SwapParams = {sourceKey, sourceColors, targetShades, tintName}` (exact shape the renderer already consumes)

- [ ] **Step 1: Write the failing test** — `apps/amo/tools/test_lpc_palettes.mjs`

```js
#!/usr/bin/env node
/** Unit tests for lpcPalettes.js. Run: node tools/test_lpc_palettes.mjs */
import { PALETTE_SOURCE, TINT_PALETTE, remapPixels, swapParamsFor, tintMaterialFor, sourceMaterialFor }
    from '../src/systems/lpcPalettes.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// remap: exact source colour → target; near (within threshold) → target; far → untouched; transparent → untouched
const px = [0x99, 0x42, 0x3C, 255,   0x9A, 0x43, 0x3C, 255,   0x00, 0xFF, 0x00, 255,   0x99, 0x42, 0x3C, 0];
remapPixels(px, [0x99423C], [0x112233]);
check('exact', px.slice(0, 3), [0x11, 0x22, 0x33]);
check('near', px.slice(4, 7), [0x11, 0x22, 0x33]);
check('far untouched', px.slice(8, 11), [0x00, 0xFF, 0x00]);
check('transparent untouched', px.slice(12, 15), [0x99, 0x42, 0x3C]);

check('hair tint material', tintMaterialFor('hair', { id: 'afro/adult' }), 'body');
check('animal head tint', tintMaterialFor('head', { id: 'heads/boarman/adult', tintMaterial: 'fur' }), 'fur');
check('hair source', sourceMaterialFor('hair', { id: 'afro/adult' }), 'hair');
check('boarman source', sourceMaterialFor('head', { id: 'x', tintMaterial: 'fur' }), 'fur');
check('weapon source', sourceMaterialFor('weapon', { id: 'sword/longsword' }), 'metal');

check('natural → null', swapParamsFor('hair', { id: 'afro/adult' }, 0), null);
check('file-colour items never swap', swapParamsFor('cape', { id: 'solid', colors: ['red'] }, 3), null);
const sp = swapParamsFor('body', { id: 'bodies/male' }, 1);
check('body swap source', sp.sourceKey, 'body');
check('body swap colours', sp.sourceColors, PALETTE_SOURCE.body);
check('body swap target', sp.targetShades, TINT_PALETTE.body[1].shades);
check('body swap name', sp.tintName, TINT_PALETTE.body[1].name);

if (fails.length) { console.error(`✗ lpcPalettes: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ lpcPalettes: ${passed} passed`);
```

- [ ] **Step 2: Run it — expect FAIL** (module not found).

- [ ] **Step 3: Implement** — `apps/amo/src/systems/lpcPalettes.js`. Header + moved tables + functions:

```js
/**
 * Phaser-free LPC palette data and pixel remapping, shared by the game
 * (CharacterCreatorScene, CharacterRenderer) and LPC Forge v2. Tables moved
 * verbatim from CharacterCreatorScene.
 */

// ── moved verbatim from CharacterCreatorScene.js ──
// export const PALETTE_SOURCE = { ... };          (whole object, unchanged)
// export const TINT_PALETTE = { ... };            (whole object, unchanged)
// ['fur','green','tan','zombie'].forEach(k => { TINT_PALETTE[k] = TINT_PALETTE.body; });
// export const FORCE_TINT_TYPES = new Set(['tail', 'wings']);
// export const FORCE_TINT_BASE  = 'orange';
// export const SOURCE_MATERIAL = { ... };         (unchanged)
// export const TINT_MATERIAL = {}; + the two loops that fill it (unchanged)
// export const COLOR_SWATCH_HEX = {}; + its loop (unchanged)

const THRESH = 3 * 3 * 3;

/** Recolour RGBA pixels in place: nearest source colour within THRESH → its target shade. */
export function remapPixels(data, sourceColors, targetShades) {
    const n = sourceColors.length;
    const sR = sourceColors.map(v => (v >> 16) & 0xff), sG = sourceColors.map(v => (v >> 8) & 0xff), sB = sourceColors.map(v => v & 0xff);
    const tR = targetShades.map(v => (v >> 16) & 0xff), tG = targetShades.map(v => (v >> 8) & 0xff), tB = targetShades.map(v => v & 0xff);
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 8) continue;
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        let best = -1, bestD = Infinity;
        for (let j = 0; j < n; j++) {
            const dr = pr - sR[j], dg = pg - sG[j], db = pb - sB[j];
            const d = dr * dr + dg * dg + db * db;
            if (d < bestD) { bestD = d; best = j; }
        }
        if (best >= 0 && bestD <= THRESH) { data[i] = tR[best]; data[i + 1] = tG[best]; data[i + 2] = tB[best]; }
    }
}

/** Display palette key for a slot's item (mirrors CharacterCreatorScene._itemTintMaterial). */
export function tintMaterialFor(slot, entry) {
    return entry?.tintMaterial ?? TINT_MATERIAL[slot] ?? null;
}

/** PALETTE_SOURCE key used for pixel remapping (mirrors _itemSourceMaterial). */
export function sourceMaterialFor(slot, entry) {
    if (entry?.sourceMaterial && PALETTE_SOURCE[entry.sourceMaterial]) return entry.sourceMaterial;
    const tm = entry?.tintMaterial ?? null;
    if (tm && PALETTE_SOURCE[tm]) return tm;
    return SOURCE_MATERIAL[slot] ?? 'body';
}

/** swapParams for a tint choice, or null (Natural, file-coloured item, unknown palette). */
export function swapParamsFor(slot, entry, tintIdx) {
    if (!entry?.id || !tintIdx) return null;
    if (entry.colors?.length && !FORCE_TINT_TYPES.has(slot)) return null;
    const palette = TINT_PALETTE[tintMaterialFor(slot, entry)];
    const pe = palette?.[tintIdx];
    if (!pe?.shades) return null;
    const sourceKey = sourceMaterialFor(slot, entry);
    return { sourceKey, sourceColors: PALETTE_SOURCE[sourceKey], targetShades: pe.shades, tintName: pe.name };
}
```
(The commented lines mark where the moved tables go — move the real code, prefixing each with `export`.)

- [ ] **Step 4: Rewire the game.** In `CharacterCreatorScene.js` delete the moved blocks and add `import { PALETTE_SOURCE, TINT_PALETTE, FORCE_TINT_TYPES, FORCE_TINT_BASE, SOURCE_MATERIAL, TINT_MATERIAL, COLOR_SWATCH_HEX } from '../systems/lpcPalettes.js';`. Leave `_itemTintMaterial`/`_itemSourceMaterial` bodies as they are (they read the same tables). In `CharacterRenderer._buildSwappedTexture`, replace the `srcR…tgtB` setup and the `for (let i = 0; …)` loop with `remapPixels(data, swapParams.sourceColors, swapParams.targetShades);`, and import `remapPixels` from `./lpcPalettes.js`. Add `node tools/test_lpc_palettes.mjs && ` after the lpcLayout test in `npm test`.

- [ ] **Step 5: Verify** `cd apps/amo && node tools/test_lpc_palettes.mjs && npm test && npm run build` → pass. Then `npm run dev:game`, open the creator, tint hair and body skin → recolour still works (screenshot check).

- [ ] **Step 6: Commit**
```bash
git add apps/amo/src/systems/lpcPalettes.js apps/amo/src/scenes/CharacterCreatorScene.js apps/amo/src/systems/CharacterRenderer.js apps/amo/tools/test_lpc_palettes.mjs apps/amo/package.json
git commit -m "refactor(amo): LPC palettes and pixel remap in a Phaser-free module shared with Forge v2"
```

---

### Task 3: Forge v2 shell — config, library route, scripts, SPEC

**Files:**
- Create: `apps/tool_suite/lpc_forge/vite.v2.config.ts`, `v2/index.html`, `v2/src/main.ts`, `v2/src/App.vue` (placeholder layout this task, filled in Task 6), `v2/src/styles.css`, `v2/src/env.d.ts`, `v2/SPEC.md`
- Modify: `apps/tool_suite/lpc_forge/server.js` (add `/lpc` static; export app for tests), `package.json` scripts
- Test: `apps/tool_suite/lpc_forge/tools/test_api_smoke.mjs`

**Interfaces:**
- Produces: `GET /lpc/<path>.png` (static, read-only, 404 on missing or traversal) on :3001, proxied by v2 Vite; `@game` alias → `apps/amo/src`.

- [ ] **Step 1: Failing test** — `tools/test_api_smoke.mjs`

```js
#!/usr/bin/env node
/** Smoke test: API server serves the LPC library read-only. Run: node tools/test_api_smoke.mjs */
import { createServer } from '../server.js';

const app = createServer();
const srv = app.listen(0);
const base = `http://localhost:${srv.address().port}`;
let passed = 0; const fails = [];
async function expectStatus(name, path, want) {
    const r = await fetch(base + path);
    if (r.status === want) passed++; else fails.push(`${name}: ${path} → ${r.status}, want ${want}`);
    return r;
}
const ok = await expectStatus('body walk', '/lpc/body/bodies/male/walk.png', 200);
if (ok.headers.get('content-type') !== 'image/png') fails.push('content-type not image/png');
await expectStatus('missing', '/lpc/body/bodies/male/nope.png', 404);
await expectStatus('traversal', '/lpc/..%2F..%2Fserver.js', 404);
await expectStatus('saves', '/api/saves/character', 200);
srv.close();
if (fails.length) { console.error(`✗ api: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ api: ${passed} passed`);
```

- [ ] **Step 2: Run — expect FAIL** (`createServer` is not exported).

- [ ] **Step 3: Implement server change.** Restructure `server.js`: wrap route setup in `export function createServer()` returning `app`; add before the save routes:

```js
// The game's merged LPC library, read-only, at the same relative paths the
// game serves under public/lpc. express.static rejects ../ traversal (404).
const LPC_ROOT = join(__dirname, '../../amo/ressources/lpc_merged/spritesheets')
app.use('/lpc', express.static(LPC_ROOT, { fallthrough: false, index: false, maxAge: '1h' }))
```
and an error handler after routes that turns static's 404/403 into a plain 404:
```js
app.use((err, req, res, next) => res.status(err.status === 403 ? 404 : (err.status || 500)).end())
```
Listen only when run directly:
```js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const PORT = process.env.API_PORT || 3001
  createServer().listen(PORT, () => console.log(`API server on http://localhost:${PORT}`))
}
```

- [ ] **Step 4: Run test — expect PASS.**

- [ ] **Step 5: v2 app shell.** `vite.v2.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// LPC Forge v2 (see v2/SPEC.md). Same API server (:3001) as v1; v1 on 5177, v2 on 5179.
const GAME_SRC = fileURLToPath(new URL('../../amo/src', import.meta.url))
export default defineConfig({
  root: fileURLToPath(new URL('./v2', import.meta.url)),
  plugins: [vue()],
  resolve: { alias: { '@game': GAME_SRC, '@v2': fileURLToPath(new URL('./v2/src', import.meta.url)) } },
  server: {
    port: 5179, strictPort: true, host: true,
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), GAME_SRC] },
    proxy: { '/api': 'http://localhost:3001', '/lpc': 'http://localhost:3001' },
  },
  build: { outDir: fileURLToPath(new URL('./dist-v2', import.meta.url)), emptyOutDir: true },
})
```
`v2/index.html` (title "LPC Forge"), `v2/src/main.ts` (`createApp(App).mount('#app')`, import `./styles.css`), `v2/src/env.d.ts` (`/// <reference types="vite/client" />` + `declare module '*.vue'` + `declare module '@game/*'`), `v2/src/styles.css` with the ledger v2 dark tokens (copy `:root` variables from `sprite_ledger/v2/src/styles.css`), `App.vue` rendering a header "LPC Forge v2" and an empty three-column grid (`slots | stage | layers`).

- [ ] **Step 6: Scripts** in `lpc_forge/package.json`:
  - `"dev"` → same spawn pattern but vite gets `'--config','vite.v2.config.ts'`
  - `"dev:v1"` → the current `dev` command
  - `"ui:v2": "node node_modules/vite/bin/vite.js --config vite.v2.config.ts"`
  - `"build:v2": "node node_modules/vite/bin/vite.js build --config vite.v2.config.ts"`
  - `"test": "node tools/test_api_smoke.mjs && node v2/tests/test_composition.mjs && node v2/tests/test_frames.mjs"` (later tests are added by Tasks 4–5; until then run the smoke test alone).

- [ ] **Step 7: `v2/SPEC.md`** — Part 1: v1 inventory (parity checklist) from `src/components/CharacterView.vue` and friends: Anatomy/Clothes/Injuries/Equipment tabs; sprite select with presets; colour select per material; 10 poses (walk shoot slash backslash spell thrust rod whip hurt idle); single preview with 4-direction buttons, play/pause, zoom/center; multi-preview; sprites grid; Saves (list/save/delete in saves.db with preview); Credits card; Renderings (PNG export); Horse tab. Mark each item **v2: Plan A / B / C / D / E / dropped** (Horse → dropped unless asked; rod/whip → covered by game anims via aliases where they exist). Part 2: link the design spec and list Plans A–E.

- [ ] **Step 8: Verify** `npm test` (smoke only for now) passes; `npm run dev` → open http://localhost:5179 shows the shell; `curl -sI localhost:5179/lpc/body/bodies/male/run.png` → 200.

- [ ] **Step 9: Commit**
```bash
git add apps/tool_suite/lpc_forge/{server.js,package.json,vite.v2.config.ts,v2,tools/test_api_smoke.mjs}
git commit -m "feat(lpc_forge): v2 shell on :5179 serving the game's LPC library"
```

---

### Task 4: Frame geometry (pure) — `v2/src/render/frames.js`

**Files:**
- Create: `apps/tool_suite/lpc_forge/v2/src/render/frames.js`
- Test: `apps/tool_suite/lpc_forge/v2/tests/test_frames.mjs`

**Interfaces:**
- Consumes: `walkSkip` from `apps/amo/src/systems/lpcLayout.js` (relative import `../../../../../amo/src/systems/lpcLayout.js` so Node tests work without Vite).
- Produces:
  - `frameSizeOf(w: number, h: number): number` — 64 for 4-row 64 px and 1-row 64 px sheets; 128/192/256 for oversize 4-row sheets; else `h` for 1-row
  - `frameGeometry(anim, dir, w, h): { fs, rows, cols, row, colStart, count }` — `row` is the direction's row (`up 0 left 1 down 2 right 3`; 1-row sheets → 0)
  - `frameRect(geom, i): {sx, sy, sw, sh, dx, dy}` — source rect of frame `i` (mod count) and destination offset to centre it on a 64 px cell (`dx = dy = -(fs-64)/2`)
  - `DIRS = ['up','left','down','right']`

- [ ] **Step 1: Failing test** — `v2/tests/test_frames.mjs`

```js
#!/usr/bin/env node
/** Unit tests for Forge v2 frame geometry. Run: node v2/tests/test_frames.mjs */
import { frameSizeOf, frameGeometry, frameRect } from '../src/render/frames.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

check('walk 64', frameSizeOf(576, 256), 64);
check('hurt 1-row', frameSizeOf(384, 64), 64);
check('oversize 192', frameSizeOf(1152, 768), 192);
check('oversize 128', frameSizeOf(1024, 512), 128);

check('walk down skips standing frame', frameGeometry('walk', 'down', 576, 256),
      { fs: 64, rows: 4, cols: 9, row: 2, colStart: 1, count: 8 });
check('run right', frameGeometry('run', 'right', 512, 256),
      { fs: 64, rows: 4, cols: 8, row: 3, colStart: 0, count: 8 });
check('hurt any dir uses row 0', frameGeometry('hurt', 'left', 384, 64),
      { fs: 64, rows: 1, cols: 6, row: 0, colStart: 0, count: 6 });
check('climb up uses row 0', frameGeometry('climb', 'up', 384, 64).row, 0);
check('oversize slash', frameGeometry('slash', 'down', 1152, 768),
      { fs: 192, rows: 4, cols: 6, row: 2, colStart: 0, count: 6 });

const g = frameGeometry('walk', 'down', 576, 256);
check('frame 0 rect', frameRect(g, 0), { sx: 64, sy: 128, sw: 64, sh: 64, dx: 0, dy: 0 });
check('frame wraps', frameRect(g, 8), frameRect(g, 0));
const o = frameGeometry('slash', 'left', 1152, 768);
check('oversize centred', frameRect(o, 1), { sx: 192, sy: 192, sw: 192, sh: 192, dx: -64, dy: -64 });

if (fails.length) { console.error(`✗ frames: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ frames: ${passed} passed`);
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** — `v2/src/render/frames.js`

```js
/**
 * Pure frame geometry for LPC sheets — mirrors the game's CharacterRenderer
 * rules (4-row sheets, oversize 128/192/256 px frames, 1-row hurt/climb,
 * walk standing-frame skip). Vitruvius "extended" interleaved sheets are not
 * in the curated catalogue and are out of scope here.
 */
import { walkSkip } from '../../../../../amo/src/systems/lpcLayout.js';

export const DIRS = ['up', 'left', 'down', 'right'];
const CELL = 64;

export function frameSizeOf(w, h) {
    for (const fs of [64, 128, 192, 256]) if (h === fs * 4 && w % fs === 0) return fs;
    return h; // 1-row sheet
}

export function frameGeometry(anim, dir, w, h) {
    const fs = frameSizeOf(w, h);
    const rows = Math.round(h / fs);
    const cols = Math.floor(w / fs);
    const row = rows === 4 ? DIRS.indexOf(dir) : 0;
    const colStart = walkSkip(anim, cols);
    return { fs, rows, cols, row, colStart, count: cols - colStart };
}

export function frameRect(geom, i) {
    const col = geom.colStart + (((i % geom.count) + geom.count) % geom.count);
    const off = -(geom.fs - CELL) / 2;
    return { sx: col * geom.fs, sy: geom.row * geom.fs, sw: geom.fs, sh: geom.fs, dx: off, dy: off };
}
```

- [ ] **Step 4: Run — expect PASS.** (Fix `frameSizeOf(384, 64)`: `h === 64*4` false for all → returns `h` = 64 ✓.)

- [ ] **Step 5: Commit** `git add apps/tool_suite/lpc_forge/v2/src/render/frames.js apps/tool_suite/lpc_forge/v2/tests/test_frames.mjs && git commit -m "feat(lpc_forge): v2 frame geometry matching the game's sheet rules"`

---

### Task 5: Composition model + sheet loading

**Files:**
- Create: `v2/src/model/composition.js`, `v2/src/render/sheets.js`
- Test: `v2/tests/test_composition.mjs`

**Interfaces:**
- Consumes: `renderType`, `SLOTS` (lpcLayout), `swapParamsFor`, `remapPixels` (lpcPalettes), `resolveAnim`, `DEFAULT_ANIMS` (animResolve), `frameGeometry`, `frameRect` (frames.js), catalogue JSON.
- Produces (composition.js, pure):
  - `Composition = { name: string, sel: Record<slot, {id: string, color?: string, tint?: number}> }`
  - `defaultComposition(): Composition` — body `bodies/male`, head `heads/human/male` (fall back to the first head with `id` if absent), shadow none
  - `entryFor(catalogue, slot, id): CatalogueEntry|null`
  - `layersFor(catalogue, comp): LayerConfig[]` — main + companions per selected slot, `type = entry.renderType ?? renderType(slot)`, `zPos`, `itemName`, `color` (file colour; companions inherit when the entry has `colors`), `anims`, `swapParams` (from `swapParamsFor`), plus `slot` for UI; sorted by `zPos`
  - `motionsOf(entry): string[]` — logical motions (DEFAULT_ANIMS order) the entry covers via `resolveAnim`
  - `missingIn(layers, motion): LayerConfig[]` — layers whose `resolveAnim(layer, motion)` is null
- Produces (sheets.js, browser):
  - `loadSheet(layer, concrete): Promise<Sheet|null>` — cached by path+swap; `Sheet = { canvas, w, h, emptyRows: Set<number> }`; `null` on 404/decode error (cached too)
  - `drawLayer(ctx, sheet, motion, dir, frame, x, y): boolean` — false (nothing drawn) when the direction row is empty

- [ ] **Step 1: Failing test** — `v2/tests/test_composition.mjs`

```js
#!/usr/bin/env node
/** Unit tests for the Forge v2 composition model. Run: node v2/tests/test_composition.mjs */
import { readFileSync } from 'node:fs';
import { defaultComposition, layersFor, motionsOf, missingIn, entryFor } from '../src/model/composition.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const comp = defaultComposition();
check('default has body', comp.sel.body.id, 'bodies/male');
const base = layersFor(CAT, comp);
check('body layer type', base.find(l => l.slot === 'body').type, 'body');

// torso_clothes renders from the torso folder, with a file colour
comp.sel.torso_clothes = { id: 'aprons/apron/female', color: 'blue' };
const l1 = layersFor(CAT, comp).find(l => l.slot === 'torso_clothes');
check('torso type', l1.type, 'torso');
check('torso colour', l1.color, 'blue');

// weapon with a companion → two layers, z-sorted (bg 5 before body 10, fg 142 after)
comp.sel.weapon = { id: 'sword/arming/universal' };
const ls = layersFor(CAT, comp);
const w = ls.filter(l => l.slot === 'weapon');
check('weapon + companion', w.map(l => l.itemName), ['bg', 'fg']);
check('z sorted', ls.map(l => l.zPos), [...ls.map(l => l.zPos)].sort((a, b) => a - b));

// tint → swapParams; Natural → none
comp.sel.hair = { id: 'afro/adult', tint: 2 };
check('hair swap', layersFor(CAT, comp).find(l => l.slot === 'hair').swapParams.sourceKey, 'hair');
comp.sel.hair = { id: 'afro/adult', tint: 0 };
check('hair natural', layersFor(CAT, comp).find(l => l.slot === 'hair').swapParams, undefined);

// coverage
check('afro covers run', motionsOf(entryFor(CAT, 'hair', 'afro/adult')).includes('run'), true);
check('arming sword lacks run', motionsOf(entryFor(CAT, 'weapon', 'sword/arming/universal')).includes('run'), false);
check('missing in run = sword layers', missingIn(ls, 'run').filter(l => l.slot === 'weapon').length, 2);

// unknown id → ignored, not thrown
comp.sel.hat = { id: 'does/not/exist' };
check('unknown id ignored', layersFor(CAT, comp).some(l => l.slot === 'hat'), false);

if (fails.length) { console.error(`✗ composition: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ composition: ${passed} passed`);
```

- [ ] **Step 2: Run — expect FAIL.**

- [ ] **Step 3: Implement** — `v2/src/model/composition.js`

```js
/**
 * Forge v2 composition model: which catalogue item (and colour/tint) sits in
 * each slot, and its translation into the game's LayerConfig list — the same
 * shape CharacterRenderer consumes, so what the Forge shows is what the game shows.
 */
import { SLOTS, renderType } from '../../../../../amo/src/systems/lpcLayout.js';
import { swapParamsFor } from '../../../../../amo/src/systems/lpcPalettes.js';
import { resolveAnim, DEFAULT_ANIMS } from '../../../../../amo/src/systems/animResolve.js';

export function entryFor(catalogue, slot, id) {
    return catalogue[slot]?.find(e => e.id === id) ?? null;
}

export function defaultComposition(catalogue) {
    const head = catalogue && !entryFor(catalogue, 'head', 'heads/human/male')
        ? catalogue.head.find(e => e.id)?.id : 'heads/human/male';
    return { name: 'Untitled', sel: { body: { id: 'bodies/male' }, head: { id: head } } };
}

export function layersFor(catalogue, comp) {
    const out = [];
    for (const slot of SLOTS) {
        const pick = comp.sel[slot];
        if (!pick?.id) continue;
        const e = entryFor(catalogue, slot, pick.id);
        if (!e) continue;
        const type = e.renderType ?? renderType(slot);
        const color = e.colors?.length ? (pick.color ?? e.colors[0]) : undefined;
        const swap = swapParamsFor(slot, e, pick.tint ?? 0) ?? undefined;
        const mk = (src, isCompanion) => {
            const l = { slot, type, id: src.id, zPos: src.zPos ?? e.zPos ?? 0, anims: src.anims };
            if (src.itemName) l.itemName = src.itemName;
            const c = isCompanion ? (src.color ?? color) : color;
            if (c) l.color = c;
            if (swap) l.swapParams = swap;
            return l;
        };
        out.push(mk(e, false));
        for (const c of e.companions ?? []) out.push(mk(c, true));
    }
    return out.sort((a, b) => a.zPos - b.zPos);
}

export function motionsOf(entry) {
    if (!entry) return [];
    return DEFAULT_ANIMS.filter(m => resolveAnim(entry, m));
}

export function missingIn(layers, motion) {
    return layers.filter(l => !resolveAnim(l, motion));
}
```
In the test, `defaultComposition()` is called without a catalogue → returns `heads/human/male`. Before writing, confirm the id exists: `python3 -c "import json;print([e['id'] for e in json.load(open('apps/amo/src/data/character_catalogue.json'))['head'] if e.get('id') and 'human' in e['id']][:5])"` and use the real adult-male human head id in both places if it differs.

- [ ] **Step 4: Run — expect PASS.** If `torso_clothes` colour/companion assertions fail because of real catalogue data, fix the model, not the test data.

- [ ] **Step 5: Implement** — `v2/src/render/sheets.js`

```js
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
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    if (swap) { remapPixels(data.data, swap.sourceColors, swap.targetShades); ctx.putImageData(data, 0, 0); }
    return { canvas, w: canvas.width, h: canvas.height, emptyRows: emptyRows(data, frameSizeOf(canvas.width, canvas.height)) };
}

function emptyRows(img, fs) {
    const out = new Set();
    const rows = Math.round(img.height / fs);
    for (let r = 0; r < rows; r++) {
        let any = false;
        for (let y = r * fs; y < (r + 1) * fs && !any; y++)
            for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] > 8) { any = true; break; }
        if (!any) out.add(r);
    }
    return out;
}

export function drawLayer(ctx, sheet, motion, dir, frame, x, y) {
    if (!sheet) return false;
    const g = frameGeometry(motion, dir, sheet.w, sheet.h);
    if (g.count <= 0 || sheet.emptyRows.has(g.row)) return false;
    const r = frameRect(g, frame);
    ctx.drawImage(sheet.canvas, r.sx, r.sy, r.sw, r.sh, x + r.dx, y + r.dy, r.sw, r.sh);
    return true;
}
```

- [ ] **Step 6: Run `npm test` in `lpc_forge`** (smoke + frames + composition) → PASS. Update the `test` script now that all three exist.

- [ ] **Step 7: Commit** `git add apps/tool_suite/lpc_forge/v2/src/model apps/tool_suite/lpc_forge/v2/src/render/sheets.js apps/tool_suite/lpc_forge/v2/tests/test_composition.mjs apps/tool_suite/lpc_forge/package.json && git commit -m "feat(lpc_forge): v2 composition model and sheet loading on the game's layer format"`

---

### Task 6: Composer UI — store, slots, picker, colours

**Files:**
- Create: `v2/src/store.ts`, `v2/src/components/SlotList.vue`, `v2/src/components/ItemPicker.vue`, `v2/src/components/ColorPicker.vue`
- Modify: `v2/src/App.vue`

**Interfaces:**
- Consumes: `layersFor`, `motionsOf`, `entryFor`, `defaultComposition` (Task 5); `TINT_PALETTE`, `tintMaterialFor`, `COLOR_SWATCH_HEX` (lpcPalettes); `SLOTS` (lpcLayout); catalogue via `import CATALOGUE from '@game/data/character_catalogue.json'`.
- Produces: `store` (reactive) = `{ comp: Composition, slot: string, motion: string, dir: string, playing: boolean, speed: number, view: 'grid'|'single', showMissing: boolean }`; computed `layers` = `layersFor(CATALOGUE, store.comp)`; actions `pick(slot, id|null)`, `setColor(slot, color)`, `setTint(slot, idx)`. Autosave: `comp` → `localStorage['forge_v2_comp']` on change (try/catch), restored on load.

- [ ] **Step 1: `store.ts`**

```ts
import { reactive, computed, watch } from 'vue'
import CATALOGUE from '@game/data/character_catalogue.json'
import { layersFor, defaultComposition } from '@v2/model/composition.js'

const KEY = 'forge_v2_comp'
function restore() {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s) } catch { /* private mode */ }
  return defaultComposition(CATALOGUE)
}

export const catalogue = CATALOGUE as Record<string, any[]>
export const store = reactive({
  comp: restore(),
  slot: 'body', motion: 'walk', dir: 'down',
  playing: true, speed: 1, view: 'grid' as 'grid' | 'single', showMissing: true,
})
export const layers = computed(() => layersFor(catalogue, store.comp))

watch(() => store.comp, c => { try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* ignore */ } }, { deep: true })

export function pick(slot: string, id: string | null) {
  if (!id) delete store.comp.sel[slot]
  else store.comp.sel[slot] = { id }
}
export function setColor(slot: string, color: string) { if (store.comp.sel[slot]) store.comp.sel[slot].color = color }
export function setTint(slot: string, idx: number) { if (store.comp.sel[slot]) store.comp.sel[slot].tint = idx }
```

- [ ] **Step 2: `SlotList.vue`** — left column: every slot in `SLOTS` that exists in `catalogue`, grouped Body (`head…wings`) / Clothes (`torso_*…shoulders`) / Equipment (`hat…weapon`) / Marks (`wound_*`); each row shows slot label, the selected item's label (or "—"), and 15 coverage dots for that item (filled = covered, hollow = missing; `title` = motion name); clicking selects `store.slot`.

```vue
<script setup lang="ts">
import { SLOTS } from '@game/systems/lpcLayout.js'
import { DEFAULT_ANIMS } from '@game/systems/animResolve.js'
import { motionsOf, entryFor } from '@v2/model/composition.js'
import { store, catalogue } from '@v2/store'
const GROUPS = [
  ['Body', SLOTS.slice(0, 12)], ['Clothes', SLOTS.slice(12, 22)],
  ['Equipment', SLOTS.slice(22, 29)], ['Marks', SLOTS.slice(29)],
] as const
const label = (s: string) => s.replace(/_/g, ' ')
function item(slot: string) { const p = store.comp.sel[slot]; return p ? entryFor(catalogue, slot, p.id) : null }
</script>
<template>
  <nav class="slots">
    <section v-for="[g, slots] in GROUPS" :key="g">
      <h3>{{ g }}</h3>
      <button v-for="s in slots.filter(s => catalogue[s])" :key="s" class="slot"
              :class="{ active: store.slot === s }" @click="store.slot = s">
        <span class="name">{{ label(s) }}</span>
        <span class="item">{{ item(s)?.label ?? '—' }}</span>
        <span v-if="item(s)" class="dots">
          <i v-for="m in DEFAULT_ANIMS" :key="m" :title="m"
             :class="motionsOf(item(s)).includes(m) ? 'on' : 'off'" />
        </span>
      </button>
    </section>
  </nav>
</template>
```
(Style: `.dots i` 5 px circles; `.on` filled accent, `.off` 1 px outline in warning colour.)

- [ ] **Step 3: `ItemPicker.vue`** — for `store.slot`: search box; "None" + every entry with `id`; each card shows label, coverage dots, and a missing-count badge (`15 - motionsOf(e).length`); filter chips "covers run", "covers jump", "covers sit" (AND); click → `pick(store.slot, e.id)`. Entries show a 64 px thumbnail drawn by `CharacterCanvas` (Task 7) with a single-layer composition — until Task 7 exists, show the label only; Task 7 Step 4 adds the thumbnail.

- [ ] **Step 4: `ColorPicker.vue`** — for the selected item: if `entry.colors?.length` → swatches from `COLOR_SWATCH_HEX[name]` (fallback grey) calling `setColor`; else if `tintMaterialFor(slot, entry)` has a `TINT_PALETTE` → swatches (index 0 "Natural") calling `setTint`; else nothing.

- [ ] **Step 5: `App.vue`** — grid `260px | 1fr | 300px`: left `SlotList`, centre top `ItemPicker` (collapsible) above the stage area, right `ColorPicker` + (Task 7) `LayerList`. Header: name field bound to `store.comp.name`.

- [ ] **Step 6: Verify** `npm run build:v2` (type errors fail it) and `npm run dev` → pick a body, hair, sword: slot rows update, dots show sword missing run/jump/sit. Screenshot.

- [ ] **Step 7: Commit** `git commit -m "feat(lpc_forge): v2 composer — slots with motion coverage, item picker, colours and tints"`

---

### Task 7: Motion stage + layer list

**Files:**
- Create: `v2/src/components/CharacterCanvas.vue`, `v2/src/components/MotionStage.vue`, `v2/src/components/LayerList.vue`, `v2/src/clock.ts`
- Modify: `v2/src/App.vue`, `v2/src/components/ItemPicker.vue` (thumbnails)

**Interfaces:**
- Consumes: `loadSheet`, `drawLayer` (Task 5), `resolveAnim`, `DEFAULT_ANIMS`, `frameRateFor`, `store`, `layers`.
- Produces:
  - `clock.ts`: `useTick(): Ref<number>` — one shared `requestAnimationFrame` loop; `now` in ms × `store.speed`, frozen when `!store.playing`; `stepFrame(delta)` advances a manual frame offset.
  - `<CharacterCanvas :layers :motion :dir :scale :missing-overlay>` — draws each layer's resolved concrete sheet at frame `floor(t * frameRateFor(motion) / 1000)`; emits `missing(layers[])` (resolve null **or** sheet null **or** empty row). With `missingOverlay`, draws a dashed red outline of the 64 px cell + small count badge when any layer is missing.

- [ ] **Step 1: `clock.ts`**

```ts
import { ref } from 'vue'
import { store } from './store'
const t = ref(0)
let last = performance.now(), manual = 0
function loop(now: number) {
  if (store.playing) t.value += (now - last) * store.speed
  last = now
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)
export function useTick() { return t }
/** Step one frame of `motion` forward/back while paused. */
export function stepFrame(motionFps: number, delta: number) { manual += delta; t.value += (delta * 1000) / motionFps }
```

- [ ] **Step 2: `CharacterCanvas.vue`**

```vue
<script setup lang="ts">
import { ref, watch, onMounted, shallowRef } from 'vue'
import { resolveAnim } from '@game/systems/animResolve.js'
import { frameRateFor } from '@game/systems/lpcLayout.js'
import { loadSheet, drawLayer } from '@v2/render/sheets.js'
import { useTick } from '@v2/clock'
const props = defineProps<{ layers: any[]; motion: string; dir: string; scale?: number; missingOverlay?: boolean }>()
const emit = defineEmits<{ missing: [any[]] }>()
const cv = ref<HTMLCanvasElement>()
const sheets = shallowRef<(any | null)[]>([])
const t = useTick()

async function load() {
  sheets.value = await Promise.all(props.layers.map(l => {
    const c = resolveAnim(l, props.motion)
    return c ? loadSheet(l, c) : Promise.resolve(null)
  }))
}
function draw() {
  const c = cv.value; if (!c) return
  const ctx = c.getContext('2d')!; ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, 64, 64)
  const frame = Math.floor((t.value * frameRateFor(props.motion)) / 1000)
  const missing: any[] = []
  props.layers.forEach((l, i) => { if (!drawLayer(ctx, sheets.value[i], props.motion, props.dir, frame, 0, 0)) missing.push(l) })
  if (props.missingOverlay && missing.length) {
    ctx.strokeStyle = '#e5484d'; ctx.setLineDash([2, 2]); ctx.strokeRect(0.5, 0.5, 63, 63)
    ctx.fillStyle = '#e5484d'; ctx.fillRect(52, 0, 12, 9); ctx.fillStyle = '#fff'; ctx.font = '8px monospace'; ctx.fillText(String(missing.length), 55, 8)
  }
  emit('missing', missing)
}
watch(() => [props.layers, props.motion], load, { immediate: true, deep: true })
watch([t, sheets, () => props.dir, () => props.missingOverlay], draw)
onMounted(draw)
</script>
<template>
  <canvas ref="cv" width="64" height="64" :style="{ width: 64 * (scale ?? 2) + 'px', height: 64 * (scale ?? 2) + 'px', imageRendering: 'pixelated' }" />
</template>
```
(`emit('missing')` every frame is cheap but noisy: only emit when the missing set changes — compare a joined key of `layerKey`s before emitting.)

- [ ] **Step 3: `MotionStage.vue`** — toolbar: Grid / Single toggle, play/pause (Space), frame step ◀ ▶ (`,` `.`), speed 0.25/0.5/1/2, direction buttons (single view; arrow keys), "Show missing" toggle, background select (checker / grass / stone — CSS backgrounds, game tile images arrive with Plan E). Grid view: rows = 15 motions (label + per-row missing count), columns = up/left/down/right, `CharacterCanvas` scale 2, clicking a cell switches to Single on that motion+dir. Single view: one `CharacterCanvas` at scale 6 plus a motion strip of 15 buttons, each with a red dot if anything is missing in that motion.

- [ ] **Step 4: `LayerList.vue`** — right column: `layers` in z-order; each row slot · item label · `itemName`/`color`; greyed with "missing in <motion>" when in the stage's missing set (for Single) or listed per motion (for Grid: hover row → which motions). ItemPicker: add a 64 px `CharacterCanvas` thumbnail per card using `[...layers with this entry substituted]` in `walk/down` (lazy: only cards in view, via `IntersectionObserver`).

- [ ] **Step 5: Verify** `npm run build:v2`; `npm run dev`, compose Eldrin-like (body male, hair, cape, longsword): Grid shows all 15 motions animating in sync; run/jump/sit rows flag the cape and sword as missing; hurt and climb use the single row in all 4 directions; an oversize weapon (`slash` with a 192 px sheet) stays centred. Screenshot evidence for each check.

- [ ] **Step 6: Commit** `git commit -m "feat(lpc_forge): v2 motion stage — 15 motions x 4 directions in sync, missing layers flagged"`

---

### Task 8: Scratch saves, dev wiring, docs

**Files:**
- Create: `v2/src/components/SavesPanel.vue`
- Modify: `v2/src/App.vue`, `apps/tool_suite/README.md` (Forge v2 section), memory index (new memory `project_lpc_forge_v2.md`)

**Interfaces:**
- Consumes: existing `GET/POST/DELETE /api/saves/:type` with `type = 'v2'`; `CharacterCanvas` for the preview data URL.

- [ ] **Step 1: `SavesPanel.vue`** — list saves of type `v2` (name + preview image), "Save" (POST `{name: store.comp.name, data: store.comp, preview: <64px walk/down canvas toDataURL>}`), "Load" (replaces `store.comp` after a confirm if unsaved changes), "Delete" (confirm). Errors → inline message, never a thrown exception.
- [ ] **Step 2: Add the panel to `App.vue`** (right column, under LayerList, collapsible).
- [ ] **Step 3: README** — add to `apps/tool_suite/README.md`: "LPC Forge v2: `cd lpc_forge && npm run dev` → http://localhost:5179 (API :3001). v1: `npm run dev:v1` → :5177."
- [ ] **Step 4: Verify** save → reload page → load → identical composition; `npm test` and `npm run build:v2` in `lpc_forge`; `npm test` in `apps/amo`.
- [ ] **Step 5: Commit** `git commit -m "feat(lpc_forge): v2 scratch saves; README for v2 on :5179"`

---

## Self-review notes
- Spec §1 → Tasks 1–3; §3 Composer → Task 6; §3 Motion stage → Task 7; v1 parity inventory → Task 3 Step 7. Cast/publish/migration (§2), gap review + rules (§4), workshop (§5), compare/export/randomize (§3) → Plans B–E by design.
- Review Focus 1 → Task 5 `emptyRows` + Task 7 Step 5 check (longsword down); 2 → Task 4 test "oversize centred"; 3 → Task 3 smoke 404 + `build()` returns null; 4 → Task 4 "hurt any dir uses row 0"; 5 → Task 3 smoke "traversal".
