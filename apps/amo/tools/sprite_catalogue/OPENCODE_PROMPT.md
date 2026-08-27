# Sprite Catalogue Annotation — Instructions for opencode

You are annotating a spritesheet PNG into a sidecar `<sheet>.catalogue.json`
file that names and locates every relevant region in the sheet, so a
downstream tool can reference sprites by name instead of raw pixel offsets.

All commands in this document assume the working directory is `apps/amo/`.

## Output file

Given a source image at `path/to/sheet.png`, write your output to
`path/to/sheet.catalogue.json` (same directory, same basename, extension
swapped for `.catalogue.json`). The sheet must live somewhere under a
`public/assets/` path segment — the validator's relocation step (see below)
can only compute a `catalogued/` destination for paths that contain
`public/assets/`; a catalogue outside that tree will fail to relocate.

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
  with multiple frames; most entries won't need this. Note: `frames` is
  **not validated** by the gate below (it only produces a non-fatal warning
  reminding a human to review it) — don't rely on the validator to catch a
  malformed `frames` array.

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

## After the validator moves a sheet

The relocation is a real rename, not a copy — `sheet.png` no longer exists at
its old path once the validator moves it. If the game is currently loading
this sheet through a hardcoded path (for example, a `this.load.image(...)` or
`this.load.spritesheet(...)` call in `src/scenes/BootScene.js` referencing the
sheet's pre-catalogue location), that reference will 404 the moment you
catalogue the sheet, until either:

- you update the hardcoded path to point at the new `catalogued/` location, or
- a later sprite-catalogue-consuming renderer/manifest system replaces
  hardcoded loading entirely (not yet built as of this doc).

So before (or immediately after) cataloguing a sheet that's already in active
use by the running game, grep the codebase for hardcoded references to its
old path (e.g. `grep -rn "trunk.png" src/`) and update anything you find.
