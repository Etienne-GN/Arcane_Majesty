# LPC Forge v2 — Compare, Export with Credits, Randomize (Plan E) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Forge's v2 scope with three features:
- compare two characters or variants side by side
- export a character as PNGs, with credits generated from exactly the sheets it uses
- randomize a character, slot by slot, with locks

**Architecture:** Two pure, Node-tested modules do the work:
- `model/exportSheet.js`: the universal sheet layout, the files a character really uses (as the game resolves them, so fallbacks and borrowed sheets are credited too), and the credits text
- `model/randomize.js`: body-compatible picks, one skin tone, locked slots kept

The API gets a batch credits lookup built on Plan D's `creditsFor`. The UI adds:
- an Export panel on the Forge screen
- a Compare tab that reuses `CharacterCanvas`
- lock toggles plus a Randomize button in the slot list

**Tech Stack:** as Plans A–D; `jszip` (already a dependency) for the export bundle.

**Spec:** `docs/superpowers/specs/2026-10-08-lpc-forge-v2-design.md` §3 Compare / Export / Composer (lock-and-randomize), build-order step 6.

## Global Constraints
- **Universal sheet** = the Universal LPC generator's layout (`lpc_universal/sources/state/constants.ts`):
  - spellcast 0, thrust 4, walk 8, slash 12, shoot 16, hurt 20 (1 row), climb 21 (1 row), idle 22, jump 26, sit 30, emote 34, run 38, combat_idle 42, backslash 46, halfslash 50
  - 64 px cells, 13 columns wide (832 × 3456)
  - walk keeps its standing frame in column 0
- **Per-motion export:** one PNG per motion, 4 rows (1 for hurt and climb) × the frames as played. Cells are 64 px, or 192 px when "oversize" is ticked, so big weapon swings aren't cut.
- **Credits** list every file the character draws in the exported motions: own art, walk fallbacks and borrowed sources, library or `lpc_custom`. Each file comes with its authors, licences and URLs. A file with no credit, or with `unknown` licences, is listed under "Check these" in `CREDITS.md` and shown in the panel before export.
- **Randomize** never changes a locked slot. The body and head are always filled. Items are body-compatible (id tokens). Body, head, ears and nose share one skin tint. Hidden (replaced) catalogue items are never picked.
- Commit on `main`, then push at the end.

## Review Focus
1. **A character with a fallback or borrowed layer** has the walk sheet it actually draws (or the borrowed source) in its credits, not the missing motion file. Test in Task 1.
2. **A layer with a custom sheet** is credited from `lpc_custom.json` (authors, derivedFrom licences), not from CREDITS.csv. Test in Task 2.
3. **Randomize with body locked to child** never picks adult-only items (`…/male`, `…/female`, `…/adult` ids) and still gives a head. Test in Task 1.
4. **Comparing a cast member against itself, or a variant that has no `sel` for a slot**, renders without errors (an empty slot means nothing worn). Manual check in Task 4.
5. **An export of a character whose sheets are partly missing** (a 404 file) still produces a zip. The missing layer is absent from the PNG and named in "Check these". Test in Task 1 (`filesUsed` with a hasFile stub) and manual in Task 3.

---

### Task 1: Pure models
**Files:**
- Create `v2/src/model/exportSheet.js`, `v2/src/model/randomize.js`, `v2/tests/test_export.mjs` and `v2/tests/test_randomize.mjs`; add both tests to `npm test`.

**Produces (`exportSheet.js`):**
- `UNIVERSAL_ROWS: { motion, row, rows, cols }[]` and `universalSize() → { w: 832, h: 3456 }`
- `filesUsed(layers, motions, rules, overrides, hasFile?) → { path, layerKey, motions[] }[]`. `path` is library-relative. With `hasFile(layer, concrete) === false`, the game's walk fallback is used; if walk is missing too, the entry is `{ path: null, layerKey, missing: true }`.
- `creditsMarkdown(name, rows) → string`, where rows are `{ path, authors[], licenses[], urls[], custom?, matched? }` or `{ path, error }`
- `licenceProblems(rows) → string[]` (the paths to check)

**Produces (`randomize.js`):**
- `bodyToken(bodyId) → 'male'|'female'|'teen'|'child'|'muscular'|'pregnant'|null`
- `compatible(id, token) → boolean`. An id with no body-type token suits everyone.
- `randomize(catalogue, comp, { locked: Set<string>, rng = Math.random, tintCount(slot, entry) → number }) → comp`
- `OPTIONAL_SLOTS` with their chance of being worn

- [ ] Write the tests, covering Review Focus 1, 3 and 5:
  - layout totals and walk at row 8 with 9 columns
  - a borrowed layer credits its source
  - locked slots unchanged
  - one skin tint shared
  - hidden items never picked
  - a seeded rng is deterministic
- [ ] Implement them; `npm test` passes. Commit.

### Task 2: Batch credits API
**Files:** `server.js` (`POST /api/credits/batch { paths: string[] }` → rows, max 2000 paths, each validated with `customPathError`) and `tools/test_api_smoke.mjs`.
- [ ] Smoke tests: a library path resolves to the CSV, a custom path resolves to the manifest (Focus 2), a bad path gives a row with `error` (not a 400 for the whole batch), and more than 2000 paths gives 400.
- [ ] Implement it, then commit.

### Task 3: Export panel
**Files:**
- `render/sheets.js`: `renderFrame(…, cell = 64)` draws centred in a larger cell; add `renderStanding(layers, dir)` (walk column 0).
- Create `components/ExportPanel.vue` (a modal, opened from an "Export…" button in the stage bar).

**Options:**
- universal sheet (yes/no)
- per-motion PNGs (yes/no) and oversize cells
- which motions (all by default)

**Shows:** the file count, and the "Check these" list (fetched before the user clicks).

**Zip contents:**
- `<id>/universal.png`
- `<id>/<motion>.png`
- `<id>/credits.json`
- `<id>/CREDITS.md`
- `<id>/composition.json` (the `sel` and the variant name)

- [ ] Build with `npm run build:v2`, then do a headless run: export Eldrin, unzip it, check the image sizes and the credits rows. Commit.

### Task 4: Compare tab
**Files:**
- Create `components/Compare.vue`; add the tab in `App.vue` and `'compare'` in the store screen type.
- Each side is either "the forge's character" or a cast member, plus a variant.
- The two sides share the motion and direction pickers and the clock. A grid of the 4 directions, or a single large view.
- Below: what differs, slot by slot (item and colour/tint).
- [ ] Headless screenshot: Eldrin against Eldrin's variant (or against Malakar). Commit.

### Task 5: Randomize and locks
**Files:** `store.ts` (`locks: string[]`, persisted to localStorage), `SlotList.vue` (a 🔒 toggle per slot), `App.vue` (a 🎲 Randomize button on the Forge header, key R outside inputs).
- [ ] Headless: randomize twice with the body locked, and check that the body is unchanged. Commit.

### Task 6: Docs and finish
- [ ] `v2/SPEC.md` (Compare / Export / Randomize section); update the memory note; both `npm test` suites and both builds pass; push.
