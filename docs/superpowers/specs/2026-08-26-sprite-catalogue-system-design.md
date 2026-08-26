# Sprite Catalogue System — Design Spec

**Status:** Approved by user, ready for implementation planning
**Sub-project 1 of 4** in the "structured map-authoring pipeline" initiative (see context below).

## Context

Building nice-looking, content-rich maps for the amo game has been one of the
project's persistent pain points. The current process is entirely manual and
error-prone:

- Maps are hand-typed 2D arrays of tile-type ints (`0`=floor, `1`=tree,
  `2`=path), authored row-by-row by hand (e.g. `northern_forest.js` is a
  40×45 grid).
- Decoration is placed by **hand-counted spritesheet frame index** —
  e.g. `decorFrames: [181, 182, 183], // grass detail — row 5 cols 20-22` in
  `eldrin_tower.js`. Getting this right requires manually counting tiles in a
  spritesheet image, which is slow and error-prone.
- Trees are a single hardcoded trunk+treetop combo everywhere — no variety.

This initiative breaks the fix into four sub-projects, in dependency order:

1. **Sprite Catalogue System** (this spec) — a repeatable process + tooling
   to annotate spritesheets with named, pixel-coordinate-referenced regions,
   so nobody ever has to guess a frame index again.
2. **Map Format/Renderer Upgrade** — generalize the map engine so decorations
   are placed by catalogue name (a real object layer), not one hardcoded tree
   and a random floor-frame speckle. Depends on #1.
3. **Lore-Driven Map Spec Process** — the repeatable method for turning
   lore/DB/campaign docs into structured per-location map specs (geography,
   travel times, dungeons/villages/quests, spawn tables incl. day/night
   variation, treasure, wildlife). Depends on #1 and #2 existing as tools to
   spec against.
4. **Build the real Eldoria's Prophecy maps** using 1–3 — the campaign's
   actual first maps, shared into the online mode's map/location data, with
   campaign-specific quest/event content kept separate.

This spec covers **only sub-project 1**. Which specific spritesheets get
catalogued, how the renderer consumes entries, and the map-spec process
itself are explicitly out of scope — those are later sub-projects with their
own design passes.

## Goals

- Every spritesheet relevant to map-building can be annotated with named,
  tagged, pixel-accurate regions — replacing "guess the frame index" with
  "look up `oak_tree_large`."
- The annotation work is done by opencode (an external tool/model), not by
  Claude directly, to save on Claude usage for a mechanical, iterate-many-
  times task.
- Annotations are self-verified (crop-checked) before being trusted, so
  coordinate errors don't silently propagate into broken-looking maps.
- The catalogue format is usable by both "tile" (fixed-grid autotile cells)
  and "object" (freestanding, variable-size decorations/props) sprites.

## Non-goals

- Deciding which sheets to catalogue first (an execution-time choice made
  when picking sprites for a specific map).
- Changing how the game engine renders maps/objects (sub-project 2).
- An aggregate cross-sheet search index — explicitly declined for now;
  sidecar files are searched individually as needed.

## Data format

One sidecar catalogue file per spritesheet, living next to the source image:

```
public/assets/tilesets/lpc/
  treetop.png
  treetop.catalogue.json
  trunk.png
  trunk.catalogue.json
  terrain_atlas.png
  terrain_atlas.catalogue.json
```

### Schema

A sheet with only standalone objects (e.g. `trunk.png`, 192×96 — two 96×96
trunk variants side by side) needs no grid metadata at all:

```json
{
  "source": "trunk.png",
  "sheetWidth": 192, "sheetHeight": 96,
  "entries": [
    {
      "name": "oak_trunk_a",
      "kind": "object",
      "x": 0, "y": 0, "w": 96, "h": 96,
      "tags": ["tree", "trunk", "forest", "oak"]
    },
    {
      "name": "oak_trunk_b",
      "kind": "object",
      "x": 96, "y": 0, "w": 96, "h": 96,
      "tags": ["tree", "trunk", "forest", "oak"]
    }
  ]
}
```

A sheet with fixed-grid autotile cells (e.g. `terrain_atlas.png`, 1024×1024,
32×32px tiles → 32 cols × 32 rows) declares its grid and indexes into it —
`frameIndex = row * gridCols + col`:

```json
{
  "source": "terrain_atlas.png",
  "sheetWidth": 1024, "sheetHeight": 1024,
  "gridTileWidth": 32, "gridTileHeight": 32,
  "gridCols": 32, "gridRows": 32,
  "entries": [
    {
      "name": "grass_flower_a",
      "kind": "tile",
      "row": 5, "col": 20, "frameIndex": 180,
      "tags": ["grass", "flower", "decoration"]
    }
  ]
}
```

A single file may mix both `kind`s if the sheet legitimately contains both
grid cells and freestanding objects — `gridTileWidth`/`gridTileHeight`/
`gridCols`/`gridRows` are simply omitted when the file has no `"tile"`
entries to justify them.

Field notes:

- `source` — filename of the spritesheet this catalogue describes (same
  directory).
- `sheetWidth` / `sheetHeight` — full image dimensions in px.
- `gridTileWidth` / `gridTileHeight` / `gridCols` / `gridRows` — present only
  if the file contains any `kind: "tile"` entries; describes the fixed grid
  those entries index into.
- `entries[].name` — unique within the file, descriptive snake_case (e.g.
  `oak_tree_large`, `dirt_edge_ne`). No fixed vocabulary — that's an
  execution-time convention, not a schema rule.
- `entries[].kind` — `"tile"` (fixed-grid cell, referenced by `row`/`col`,
  with a `frameIndex` = `row * gridCols + col`) or `"object"` (freestanding
  pixel bbox `x, y, w, h`, placed anywhere).
- `entries[].tags` — free-form array for search (biome, size, category,
  season, etc.).
- `entries[].frames` — **optional**, for animated multi-frame sprites (e.g. a
  waterfall): an array of `{x, y, w, h}` (or `{row, col}` for tile-kind),
  one per animation frame. Not mandatory; most entries won't use it.
- `entries[].lowConfidence` — **optional** `true` if opencode couldn't get a
  crop-check match within its retry budget. Signals the entry needs a human
  look before being trusted for map-building use.

## Workflow

Run per spritesheet, driven by the user via opencode (not Claude):

1. User points opencode at a source PNG, using the fixed prompt spec in
   `tools/sprite_catalogue/OPENCODE_PROMPT.md`.
2. Opencode views the full sheet and proposes an entry: `name`, `kind`,
   coordinates, `tags`.
3. Opencode runs `crop_check.py` against its guessed bbox (or grid row/col),
   producing a cropped preview image.
4. Opencode views the crop and confirms it matches the intended sprite.
   - Match → commit the entry.
   - Mismatch → adjust coordinates, retry step 3 (capped at a small retry
     budget, e.g. 3 attempts — after which the entry is written with
     `lowConfidence: true` rather than blocking indefinitely).
5. Repeat for each region on the sheet; opencode writes the finished
   `<sheet>.catalogue.json` sidecar.
6. Before the catalogue is trusted for use, run
   `validate_sprite_catalogue.mjs` against it as a hard gate.

## Tooling to build

All under `apps/amo/tools/sprite_catalogue/`, matching the existing
`apps/amo/tools/` conventions (mixed Python/Node scripts already present:
`audit_oversize.py` uses PIL for image inspection, `validate_catalogue.mjs`
is dependency-free Node reading raw PNG headers).

1. **`crop_check.py`** — PIL-based, matches the `audit_oversize.py` pattern.
   CLI: `python3 crop_check.py --image <path> --x <n> --y <n> --w <n> --h <n>
   --out <tmp.png>`. Crops the given bbox out of `--image` and writes it to
   `--out` for opencode to view. For `kind: "tile"` checks, the caller
   resolves `row`/`col` to a pixel bbox first using the sheet's declared grid
   dims, then calls this the same way.

2. **`validate_sprite_catalogue.mjs`** — pure Node, no deps, matches the
   `validate_catalogue.mjs` pattern (reads PNG width/height straight from the
   IHDR chunk, no image library). Given a `*.catalogue.json` path:
   - Confirms `source` exists alongside it and its real dimensions match
     `sheetWidth`/`sheetHeight`.
   - Confirms every `entries[].name` is unique within the file.
   - Confirms every `kind` is `"tile"` or `"object"`.
   - For `"tile"` entries: `row`/`col` fall within `gridRows`/`gridCols`, and
     `frameIndex === row * gridCols + col`.
   - For `"object"` entries: `x, y, w, h` are all within
     `[0, sheetWidth]`/`[0, sheetHeight]` bounds and `w, h > 0`.
   - Reports (non-fatally) any entries carrying `lowConfidence: true`, so
     they surface for a human follow-up look.
   - Exits 1 on any hard failure (schema/bounds violations), 0 otherwise.

3. **`OPENCODE_PROMPT.md`** — the fixed instruction document handed to
   opencode for each annotation run: explains the schema above, the
   crop-check-and-retry loop, the `lowConfidence` escape hatch, and the exact
   file-naming/output-location convention, so opencode's output lands
   in-contract without rework.

## Testing

- `validate_sprite_catalogue.mjs` doubles as the test harness: run it against
  a hand-written fixture catalogue (both a valid one and ones with each class
  of violation — duplicate name, out-of-bounds bbox, bad tile row/col,
  frameIndex mismatch) to confirm it catches every case before relying on it
  for real opencode output.
- `crop_check.py` is validated manually: run it once against a known region
  of an existing spritesheet (e.g. `trunk.png`) and visually confirm the
  crop matches what's expected.

## Open items for later sub-projects (explicitly not decided here)

- Which spritesheets to catalogue first (deferred to when specific maps need
  specific sprites).
- How the map renderer/build tooling looks up and consumes catalogue entries
  by name (sub-project 2).
- Whether an aggregate cross-file search index becomes worth building later
  (declined for now).
