# Map Format/Renderer Upgrade — Design Spec

**Status:** Approved by user, ready for implementation planning
**Sub-project 2 of 4** in the "structured map-authoring pipeline" initiative (see `docs/superpowers/specs/2026-08-26-sprite-catalogue-system-design.md` for the full initiative context and sub-projects 1/3/4).

## Context

Sub-project 1 (Sprite Catalogue System) gives every spritesheet region a
name. That's useless to a map author until something in the game engine can
actually take `{ sheet: "tilesets/lpc/trunk", name: "oak_trunk_a" }` and draw it on
screen at a chosen spot. Today the engine can't do that at all:

- Trees are special-cased on the tile grid: any `tile === 1` cell in
  `GameScene._buildWorld` gets one hardcoded trunk+treetop image pair
  (frame 0 of `lpc_trunk`/`lpc_treetop`, always the same tree, no variety).
- Floor decoration is a raw hand-counted frame index array:
  `decorFrames: [181, 182, 183], // grass detail — row 5 cols 20-22` in
  `eldrin_tower.js`.
- Every texture the engine can draw must be hand-registered with its own
  `this.load.image(key, path)` / `this.load.spritesheet(...)` line in
  `BootScene.js` — there is no way for a browser-side scene to discover what
  spritesheets exist on disk at runtime.

This spec covers **only sub-project 2**: generalizing the map data format and
renderer so any catalogued sprite can be placed by name — the piece that
makes sub-project 1's catalogue actually pay off in-game. Which lore-driven
content goes on which map (sub-project 3) and building the real Eldoria's
Prophecy maps (sub-project 4) are out of scope here.

## Goals

- A map data file can place any catalogued sprite at a chosen tile position
  by `{ sheet, name }` reference — no raw pixel offsets or frame indices in
  map source files.
- Adding a new catalogued sheet to the game requires zero manual `BootScene`
  edits.
- Trees become an ordinary decoration placement (no more special-cased tile
  value), unifying all "things placed on top of the floor" — trees, rocks,
  bushes, flowers — under one mechanism.
- Floor-layer texture selection (`floorFrame`/`pathFrame`/`decorFrames`) also
  references catalogue names instead of raw frame indices, for the same
  reason.
- The mechanism is provably correct against synthetic fixtures, independent
  of whether any real spritesheet has been catalogued yet.

## Non-goals

- Deciding which real spritesheets get catalogued, or building real
  Eldoria's Prophecy map content (sub-projects 1/3/4's territory).
- Randomization/weighted-variant picking within a single `decorations` entry
  — explicitly declined; each placement names exactly one sprite. (Floor
  `decor` retains its existing random-speckle behavior, just referencing
  catalogue names instead of raw frame ints.)
- Migrating the 4 legacy prototype maps (`prologue_forest`, `eldrin_tower`,
  `northern_forest`, `hermit_hut`) is IN scope (see Migration below) but is
  explicitly **blocked** until `tilesets/lpc/trunk` and `tilesets/lpc/treetop` are actually
  catalogued and relocated into `public/assets/catalogued/` — a sub-project
  1 execution step this spec does not perform.

## Data format additions

Map definition files (`src/data/maps/*.js`) gain two things:

### 1. Catalogue-referenced tileset

Replaces raw `floorFrame`/`pathFrame`/`decorFrames` ints with `{ sheet, name }`
refs:

```javascript
tileset: {
    key: 'terrain_atlas',                                     // texture key (unchanged concept)
    floor: { sheet: 'tilesets/lpc/terrain_atlas', name: 'grass_plain' },
    path:  { sheet: 'tilesets/lpc/terrain_atlas', name: 'dirt_path' },
    decor: [
        { sheet: 'tilesets/lpc/terrain_atlas', name: 'grass_flower_a' },
        { sheet: 'tilesets/lpc/terrain_atlas', name: 'grass_flower_b' },
    ],
    decorRate: 0.15,   // unchanged — probability per floor tile of using a random `decor` entry
},
```

`floor`/`path`/each `decor` entry must resolve to a `kind: "tile"` catalogue
entry (see sub-project 1's schema) — the resolver converts it to the same
raw `frameIndex` the existing tilemap-building code already expects.

### 2. Decorations list

Replaces the special-cased `tile === 1` tree loop with an explicit list of
placements:

```javascript
decorations: [
    { sheet: 'tilesets/lpc/trunk',   name: 'oak_trunk_a', x: 5, y: 10, blocking: true },
    { sheet: 'tilesets/lpc/treetop', name: 'oak_top_a',   x: 5, y: 10, depthOffset: 2000 },
],
```

- `sheet` / `name` — catalogue reference, resolved to `{textureKey, x, y, w, h}`
  (a crop rect) at map-load time. Must resolve to a `kind: "object"`
  catalogue entry (freestanding sprite) — `kind: "tile"` entries are for the
  floor layer, not `decorations`.
- `x` / `y` — **tile** coordinates (matching the existing `spawns` array
  convention elsewhere in the same map file, e.g.
  `{ x: 22, y: 10, type: 'deer' }`), converted to pixel position the same
  way: `c * TILE_SIZE + TILE_SIZE / 2`.
- `blocking` — optional, default `false`. When `true`, the placement gets an
  invisible collision body in the existing `wallGroup`, exactly like today's
  hardcoded tree trunks.
- `depthOffset` — optional, default `0`. Final render depth is
  `pixelY + depthOffset`. This lets a treetop (which must draw above
  everything near it, like the player passing "through" the canopy) opt out
  of pure y-sorting, while a trunk (which should sort naturally with the
  player walking in front of/behind it) leaves this at its default.
- No randomization/variant-picking at a single `decorations` slot — every
  placement names one specific sprite. (This is deliberate: sub-project
  3/4's lore-driven map-speccing process chooses exactly what goes where;
  visual variety comes from placing different named entries, not from
  randomizing a shared one.)

## Components

### `tools/sprite_catalogue/gen_manifest.js` (new)

Scans `public/assets/catalogued/**/*.catalogue.json` and writes
`src/data/sprite_catalogue_manifest.json` — a flat list of:

```json
[
  { "sheetKey": "tilesets/lpc/trunk",
    "pngPath": "assets/catalogued/tilesets/lpc/trunk.png",
    "catPath": "assets/catalogued/tilesets/lpc/trunk.catalogue.json" }
]
```

`sheetKey` is the path relative to `public/assets/catalogued/`, minus the
file extension — this is also the string a map's `sheet` field must match
(so `sheet: "tilesets/lpc/trunk"` in a map file assumes the sheet is catalogued at
`public/assets/catalogued/tilesets/lpc/trunk.catalogue.json` → `sheetKey`
`"tilesets/lpc/trunk"`; map authors write the full relative `sheetKey`, not
a shortened alias). Re-run whenever catalogued sheets change (new npm
script `gen:sprite-manifest`), mirroring the existing `gen:anims` /
`gen_catalogue.js` pattern for the character catalogue.

### `BootScene.js` (modify)

Imports `sprite_catalogue_manifest.json` and, in `preload()`, loops over
every entry calling `this.load.image(e.sheetKey, e.pngPath)` and
`this.load.json(e.sheetKey + '_cat', e.catPath)`. No manual per-sheet
`BootScene` edits are needed again once a sheet is catalogued and the
manifest regenerated.

### `src/systems/spriteCatalogueResolve.js` (new)

Pure(ish) resolver, given a live Phaser scene (for `scene.cache.json`
access) and a `{ sheet, name }` ref:

- Looks up the cached catalogue JSON for `sheet` (`scene.cache.json.get(sheet + '_cat')`).
- Finds the entry named `name`.
- For `kind: "object"` entries: returns `{ textureKey: sheet, x, y, w, h }`
  directly from the entry's stored bbox.
- For `kind: "tile"` entries: computes the pixel bbox from
  `row`/`col`/`gridTileWidth`/`gridTileHeight`, and also exposes the raw
  `frameIndex` for callers (like the floor-tileset resolution path) that
  need a tilemap frame number rather than a crop rect.
- Throws a clear error (sheet not loaded, or name not found in that sheet's
  catalogue) rather than silently returning `undefined` — a broken map
  reference should fail loudly during development, not render a blank tile.

### `GameScene._buildWorld` (modify)

- Before building the tilemap: resolves `mapDef.tileset.floor`/`.path`/each
  `.decor[]` ref via `spriteCatalogueResolve` to get `frameIndex` values,
  then hands those to the **existing, unchanged** Phaser tilemap-building
  code (the `floorFrame`/`pathFrame`/`decorFrames` variables become the
  *output* of resolution rather than something read straight off the map
  def).
- Replaces the `tile === 1` special case with a new `_placeDecorations()`
  method: iterates `mapDef.decorations`, resolves each via
  `spriteCatalogueResolve`, creates a Phaser image at the placement's pixel
  position with `setCrop(x, y, w, h)`, sets `depth = pixelY + (depthOffset ?? 0)`,
  and (when `blocking: true`) adds an invisible physics body to `wallGroup`
  the same way the current tree-trunk code does.

## Migration of the 4 legacy maps

`prologue_forest`, `eldrin_tower`, `northern_forest`, `hermit_hut` currently
rely on `tile === 1` for their trees. Once that special case is removed,
each map needs its tree tiles converted into equivalent `decorations`
entries (`tilesets/lpc/trunk` + `tilesets/lpc/treetop` placements at each former tree tile's
position, `blocking: true` on the trunk).

**This migration is blocked** until `trunk.png` and `treetop.png` are
actually catalogued and relocated to `public/assets/catalogued/` (a
sub-project 1 *execution* step — cataloguing specific sprites — that has
not happened yet; the user has said sprite selection/cataloguing comes
first and gates when that execution runs). The implementation plan
sequences this as its own, clearly-labeled last task so the rest of the
sub-project (manifest tool, resolver, generic renderer) can be built and
proven against synthetic fixtures now, without waiting on it.

## Testing

- `gen_manifest.js`: unit-testable against a temp directory tree of fake
  `*.catalogue.json`/`.png` pairs, asserting the generated manifest's
  `sheetKey`/`pngPath`/`catPath` values.
- `spriteCatalogueResolve.js`: unit-testable with a fake scene object whose
  `cache.json.get()` returns a hand-built catalogue fixture (both `tile` and
  `object` kind entries), asserting correct resolution and the loud-failure
  behavior for a missing sheet/name.
- `GameScene._buildWorld` / `_placeDecorations`: proven via a synthetic test
  map def + fixture catalogue (mirroring sub-project 1's fixture pattern),
  not against real game assets — this sub-project doesn't depend on any real
  spritesheet being catalogued.

## Open items for later sub-projects (explicitly not decided here)

- Which real spritesheets get catalogued (sub-project 1 execution,
  gates the legacy-map migration task above).
- The lore-driven process for deciding what actually goes on a map
  (sub-project 3).
- Building the real Eldoria's Prophecy maps (sub-project 4).
