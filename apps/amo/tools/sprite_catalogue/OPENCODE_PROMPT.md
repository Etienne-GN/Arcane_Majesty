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
