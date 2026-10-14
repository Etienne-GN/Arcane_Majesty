# LPC Forge v2 — Motion Workshop (Plan D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user author any motion a layer lacks (e.g. a weapon's run) in the Forge. The new frames go into a custom overlay that the game and the Forge both read in preference to the library.

**Architecture:** Custom sheets live in `apps/amo/public/lpc_custom/` and use the same relative paths as the library. They are listed in `apps/amo/src/data/lpc_custom.json`, which is both the manifest and the provenance and credits record. `lpcLayout.js` keeps a runtime registry of those paths. `animPath` routes a registered path to `lpc_custom/`, and `resolveAnim` treats a registered file as art the layer owns. So the game, the Forge and stale cast `layers[].anims` snapshots all see the new motion, and the curated catalogue is never rewritten. The workshop's pixel logic is pure (RGBA buffers) and tested in Node. The Vue screen only wires that logic to canvases.

**Tech Stack:** as Plans A–C (Vue 3 + TS, Express API on :3001, Node test scripts, game on Vite 6).

**Spec:** `docs/superpowers/specs/2026-10-08-lpc-forge-v2-design.md` §4 (`custom` rule) and §5.

## Deviations from the spec (decided while planning)
- **Overlay folder:** `apps/amo/public/lpc_custom/`, not `ressources/lpc_custom/`. `apps/amo/.gitignore` ignores `ressources/`, but the custom art is ours and must be committed. Under `public/`, the game's Vite serves it with no extra setup.
- **The catalogue is not edited on save.** Writing `character_catalogue.json` would make both Vite servers reload mid-edit, and it would still miss the `anims` snapshots in cast files. The registry handles both (see Architecture). `custom` therefore needs no rule entry: a registered file *is* the layer's own art, so `ruleFor` returns `own`.
- **CREDITS.json** becomes `src/data/lpc_custom.json`, keyed by relative path, so one file is both the manifest and the credits.
- **Pose-fit anchors are computed, not hand-authored.** For each target frame, the draft takes the retimed source frame and shifts it by the offset (±8 px) that best overlaps the body's source silhouette with its target silhouette. That follows the body's bob and lean. The arm swing is fixed by hand with the frame-nudge tool. A hand-anchor table can still be added later if the drafts are poor.

## Global Constraints
- Custom file path = `lpc_custom/` + the exact relative path that `animPath` would give under `lpc/` (for example `weapon/sword/arming/universal/run/bg.png`).
- Manifest entry: `{ "author": string, "derivedFrom": string[] (library-relative paths), "licenses": string[], "createdAt": ISO, "note"?: string }`. A derivative of CC-BY-SA or GPL art inherits those licences: the server copies the source's licences and authors from `public/CREDITS.csv`.
- Sheet geometry: 64 px frames by default (128/192 for oversize attack art, taken from the draft source). Rows: 4 (up/left/down/right), except hurt and climb, which have 1. Columns = `MOTION_FRAMES[motion]`, plus 1 for walk (the standing frame that `walkSkip` drops).
- Game behaviour is unchanged while `lpc_custom.json` is `{}`. `npm test` and the build stay green in both apps.
- The API stays bound to localhost. Paths are validated (no `..`, `.png` only, the type folder is a known render type).
- Commit on `main` with the usual trailer.

## Review Focus
1. **A custom file for one colour of a colour-variant item** (cape `red.png` only) means a character wearing `navy` must still fall back, not load a 404. The registry is keyed by exact path. Test in Task 1. Offer "all colours" generation (Task 4).
2. **An uploaded or edited sheet of the wrong size** (wrong columns, or 4 rows for hurt) is rejected with a message naming the expected size, client side and server side. Tests in Tasks 2 and 3.
3. **Saving over an existing custom file** replaces the file and keeps `createdAt`, and the Forge's cached sheet is dropped so the stage shows the new art at once. Tests in Task 3 (API) and Task 4 (cache invalidation is called).
4. **Retiming a draft from a source with more or fewer frames** (walk 8 → jump 5, sit 3 → run 8) uses only valid source frames. The walk standing frame is never used as a draft frame, and a walk target gets a standing frame copied from the first frame of the source's down row. Test in Task 2.
5. **Path traversal or a non-PNG body on PUT** (`../../x.png`, `weapon/a.png.exe`, not a PNG signature) returns 400 and writes nothing. Test in Task 3.

---

### Task 1: Custom-overlay registry (game)
**Files:**
- Modify `apps/amo/src/systems/lpcLayout.js`: `setCustomFiles(paths)`, `hasCustomFile(relPath)`, `libPath(layer, anim)`. `animPath` routes to `lpc_custom/`.
- Modify `apps/amo/src/systems/animResolve.js`: `resolveAnim` accepts a registered custom file.
- Create `apps/amo/src/systems/lpcCustom.js`, which registers `src/data/lpc_custom.json`.
- Create `apps/amo/src/data/lpc_custom.json` (`{}`) and `apps/amo/public/lpc_custom/README.md`.
- Modify `CharacterRenderer.js`, which imports `./lpcCustom.js` for its side effect.
- Modify `tools/validate_catalogue.mjs`: every manifest path exists under `public/lpc_custom`, has whole 64 px cells and needs a licence.
- Tests: extend `tools/test_lpc_layout.mjs` and `tools/test_anim_resolve.mjs`.

**Produces:**
- `libPath(layer, anim) → 'type/id/anim/x.png'` (relative, without the `lpc/` prefix)
- `animPath(layer, anim)` → `lpc_custom/<libPath>` when registered, else `lpc/<libPath>`
- `setCustomFiles(iterable<string>)` replaces the registry. `hasCustomFile(rel) → boolean`.
- `resolveAnim(layer, logical)`: the first candidate in `layer.anims`, **or** the first candidate whose `libPath` is registered

- [ ] Tests first:
  - registering `cape/solid/female/run/red.png` gives a red cape a run, and its animPath starts `lpc_custom/`
  - a navy cape still resolves run → null (Focus 1)
  - `setCustomFiles([])` restores the old behaviour
  - a layer without `anims` is unchanged
- [ ] Implement, then run `npm test` in `apps/amo`. Commit.

### Task 2: Workshop model (pure)
**Files:** Create `apps/tool_suite/lpc_forge/v2/src/model/workshop.js` and `v2/tests/test_workshop.mjs`, and add the test to `npm test`.

**Produces** (images are `{ w, h, data: Uint8ClampedArray }` RGBA):
- `sheetSpec(motion, fs = 64) → { motion, fs, rows, cols, w, h, skip }`, where skip = 1 for walk
- `sizeError(w, h, spec) → string|null` (the message names the expected `w×h`)
- `blankSheet(spec)`
- `getFrame(img, spec, row, col)` and `putFrame(img, spec, row, col, frame)`
- `retimeDraft(src, srcSpec, dstSpec) → img`, using `frameMap` over playable frames (skip respected on both sides). A walk target's standing frame is a copy of its playable frame 0.
- `silhouetteOffset(a, b, max = 8) → { dx, dy }`: the shift of frame a that maximises the overlap of opaque pixels with b
- `poseFitDraft(itemSrc, srcSpec, bodySrc, bodySrcSpec, bodyDst, dstSpec) → img`
- `paletteOf(img, max = 32) → [r,g,b][]`: opaque colours by luminance
- `colourMap(fromImg, toImg) → Map<rgbaInt, rgbaInt>` (co-located pixels) and `applyColourMap(img, map) → img`
- `shiftFrame(frame, dx, dy) → frame` (pixels that leave are cut, never wrapped)
- `class History { push(state), undo(), redo(), canUndo, canRedo }` (bounded at 100)

- [ ] Write the tests (Focus 2 and 4, geometry for hurt, walk and run, palette order, colour map round trip, offset found on a synthetic shifted blob, history bounds), see them fail, implement, see them pass. Commit.

### Task 3: Custom art API
**Files:**
- Modify `apps/tool_suite/lpc_forge/server.js`:
  - static `/lpc_custom`
  - `GET /api/custom` (the manifest)
  - `PUT /api/custom`, body `{ path, png: base64, author?, derivedFrom?: string[], note? }`
  - `DELETE /api/custom?path=`
  - `GET /api/credits?path=<lib path>` (a CREDITS.csv row, or null)
- Create `apps/tool_suite/lpc_forge/customStore.js` (path validation, PNG header check, CSV lookup, atomic manifest write).
- Modify `vite.v2.config.ts` to proxy `/lpc_custom`.
- Extend `tools/test_api_smoke.mjs`, run in temp dirs.

**Produces:**
- `customPathError(p) → string|null`
- `pngSize(buf) → {w,h}|null`
- `creditsFor(csvPath, libPath) → {authors[], licenses[], urls[]}|null`
- PUT copies the licences and authors of `derivedFrom` into the entry. A missing source gives `licenses: ['unknown']`. The export (Plan E) and the validator flag that.

- [ ] Smoke tests first:
  - round trip (PUT, then GET the manifest and the static file)
  - an overwrite keeps `createdAt` (Focus 3)
  - traversal, non-PNG and bad-size PUTs return 400 (Focus 5, Focus 2 server side)
  - DELETE removes the file and its entry
  - credits lookup on a known body path
- [ ] Implement, run `npm test`, commit.

### Task 4: Workshop screen
**Files:**
- Create `v2/src/workshopState.ts`, `v2/src/components/Workshop.vue`, `v2/src/components/PixelEditor.vue`.
- Modify:
  - `App.vue`: a Workshop tab
  - `store.ts`: the overlay is fetched at start-up into `setCustomFiles`, and screen `'workshop'`
  - `render/sheets.js`: `setSheetOverride(relPath, canvas|null)` and `invalidateSheet(relPath)`. The override wins in `loadSheet`.
  - `GapReview.vue`: a "Fix in workshop" action on a selected cell
  - `MotionStage.vue`: a "Fix in workshop" button on single view when a layer lacks the motion

**Behaviour:**
- **Start form:** the layer (from the current composition, or from the Gaps cell), the motion, the draft (`blank` / `from <motion>` / `pose-fit from <motion>`), the onion-skin body (the composition's body).
- **Editor:**
  - frame strip (direction × frame); large frame at 8×
  - tools: pencil, eraser, eyedropper, fill, rectangle select + drag move
  - arrow keys nudge the whole frame (Shift = whole row)
  - palette = `paletteOf` of the item's walk sheet plus a free colour input
  - onion skin of the body's target frame and of the previous frame, each toggleable
  - undo/redo with Ctrl+Z / Ctrl+Y
- **Live preview:** the composition in that motion and direction, playing, with the working sheet injected through `setSheetOverride`.
- **Download template:** the draft PNG plus a guide PNG (the body's target sheet at 35% alpha) as a zip (jszip). **Upload:** a PNG goes through `sizeError`, then replaces the working sheet as an undoable step.
- **Save:**
  - PUT the sheet, re-fetch the manifest, call `setCustomFiles` and `invalidateSheet`, and clear the override.
  - Any open gap flag on that cell moves to `needs_review` with a `[Claude]`-style system note: "custom art saved — please review".
  - For a colour-variant layer, "Save for all colours" maps the authored colour onto each other colour with `colourMap(walk[authored], walk[other])` and saves each one.

- [ ] Type-check (`vue-tsc` via `npm run build:v2`), then do a manual check with the headless screenshot tool. Commit.

### Task 5: End to end and docs
- [ ] Author the arming sword's run (bg + fg) through the workshop with a pose-fit draft from walk. Save it as a draft marked needs_review (an open flag that asks the user to review the art).
- [ ] Screenshot the Forge stage (run, all 4 directions) and the game's creator with the sword in run. Check that the game requests `lpc_custom/...` (network or console).
- [ ] Update `v2/SPEC.md` (workshop section) and the Forge README, and run both `npm test` suites and both builds. Commit and push.
