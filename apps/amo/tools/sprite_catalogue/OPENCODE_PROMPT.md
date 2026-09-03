# Sprite Catalogue Annotation — Process

You are turning spritesheet PNGs into sidecar `<sheet>.catalogue.json` files
that name and locate every relevant region, so downstream tools reference
sprites by name instead of raw pixel offsets.

All commands assume the working directory is `apps/amo/`.

## The one rule that matters

**Never hand-write a bounding box.** Geometry is derived from the alpha
channel by `autoslice.py`; it is exact by construction. Your attention goes
to *naming* — the part a script genuinely cannot do.

The first 950 catalogues in this repo were built the other way: boxes guessed
one at a time and verified with single-sprite crops. 96% of them ended up
holding one entry whose box was the whole image and whose name was the
filename, and 17% of all entries were still flagged `lowConfidence` because
the guess-and-verify loop ran out of retries. That is the failure mode this
process exists to prevent.

## Pipeline

```
raw pack
   │  1. bootstrap_catalogue.py   (free — no judgement, no tokens)
   ▼
draft catalogue: exact boxes, placeholder names, needsNaming: true
   │  2. contact_sheet.py         (one image per ~40 sprites)
   ▼
you look once, write one JSON map of index → name
   │  3. apply_names.py
   ▼
named catalogue
   │  4. validate_sprite_catalogue.mjs   (trust gate)
   ▼
   │  5. promote (the validator's move) + update any hardcoded loaders
   ▼
public/assets/catalogued/...
```

### 1. Bootstrap — always do this first

```
python3 tools/sprite_catalogue/bootstrap_catalogue.py \
  --path ressources/tilesets_to_catalogue/SomePack \
  --tags somepack,author_name
```

For every PNG it finds: sheet dimensions from the file, sprite boxes from
alpha-connected components, `name` from the filename, `tags` from the
directory path. A sheet holding exactly one sprite is **finished at this
point** — the filename is the name and the alpha box beats anything a human
would type. Sheets holding several sprites get indexed placeholder names and
`needsNaming: true`.

Useful flags: `--gap N` bridges transparent seams inside one sprite (start at
1, raise it if a tree's canopy and trunk come out as two entries), `--min-area
N` drops dust pixels, `--dry-run` to look before writing, `--force` to
overwrite existing catalogues.

If a sheet reports *"looks like a tile grid or animation strip"*, it has more
islands than a prop sheet plausibly has. Re-run it with the suggested tile
size:

```
python3 tools/sprite_catalogue/bootstrap_catalogue.py --path sheet.png --grid 32
```

Grid detection is deliberately **not** automatic. A full-bleed terrain atlas
has no transparent seams to detect, so any auto-pick would be a guess wearing
a lab coat. Look at the sheet, decide, pass `--grid`.

### 2. Contact sheet — look once, not forty times

```
python3 tools/sprite_catalogue/contact_sheet.py \
  --catalogue path/to/sheet.catalogue.json --only-unnamed
```

Writes numbered pages (default 40 sprites each) to `/tmp/contact_sheets/`.
Open a page, read the whole page, name everything on it in one pass. Add
`--fill` when a sheet is all tiny 16px props and you need each one zoomed to
its own cell; the default keeps one shared zoom so relative sizes stay honest.

For a **grid/autotile sheet, always use `--grid-atlas`** instead:

```
python3 tools/sprite_catalogue/contact_sheet.py \
  --catalogue path/to/sheet.catalogue.json --grid-atlas --scale 4
```

It draws every cell at its true row and column, gaps included, so the terrain
blocks and their edges stay readable as blocks. The flat contact sheet packs
non-empty cells contiguously, which shifts rows and destroys the adjacency an
autotile name depends on — you cannot tell `dirt_edge_ne` from `dirt_edge_nw`
without seeing what borders it.

This replaces the old per-entry `crop_check.py` loop. `crop_check.py` still
exists and is still useful — but as a spot check on a single suspicious
entry, not as the main mechanism.

### 3. Apply the names

Write a JSON map of entry index → name (or → object):

```json
{
  "0": "oak_tree_large",
  "1": {"name": "pine_snow", "tags": ["conifer"], "season": "winter"},
  "7": {"drop": true}
}
```

```
python3 tools/sprite_catalogue/apply_names.py \
  --catalogue path/to/sheet.catalogue.json --names /tmp/names.json
```

Partial passes are safe: anything you don't name keeps `needsNaming: true`, so
you can stop and resume. `"drop": true` removes an entry — that's how noise
the slicer picked up gets discarded. The tool refuses the whole batch on a
duplicate name, a non-snake_case name, or a bad season, rather than leaving a
half-applied catalogue that fails the gate.

### 4. Validate

```
node tools/sprite_catalogue/validate_sprite_catalogue.mjs --no-move path/to/sheet.catalogue.json
```

Fix every error (exit 1). Warnings (⚠) don't block.

### 5. Promote

Dropping `--no-move` makes the validator *also* move `sheet.png` and its
catalogue into the mirrored path under `public/assets/catalogued/`. That's a
rename, not a copy — anything hardcoding the old path 404s the moment you
promote. Before promoting a sheet the running game already loads, grep for it:

```
grep -rn "sheet.png" src/
```

and update the `this.load.*` calls in `src/scenes/BootScene.js`.

## Schema

```json
{
  "source": "sheet.png",
  "sheetWidth": <int>, "sheetHeight": <int>,
  "gridTileWidth": <int>, "gridTileHeight": <int>,
  "gridCols": <int>, "gridRows": <int>,
  "entries": [
    { "name": "snake_case_unique", "kind": "object",
      "x": <int>, "y": <int>, "w": <int>, "h": <int>,
      "tags": ["tag1"], "season": "spring|summer|autumn|winter" },
    { "name": "snake_case_unique", "kind": "tile",
      "row": <int>, "col": <int>, "frameIndex": <row*gridCols+col>,
      "tags": ["tag1"] }
  ]
}
```

- The four `grid*` fields are required **only** when `kind: "tile"` entries
  exist, and must be omitted otherwise.
- `name` — unique within the file, descriptive, snake_case
  (`oak_tree_large`, `dirt_edge_ne`, `grass_flower_a`).
- `tags` — free-form (biome, size, category) to help later search.
- `season` — a dedicated field, not a tag, so scene-builders can filter on it
  directly. Set it only for a real seasonal identity (a tree whose colour only
  makes sense in autumn). Omitting it means "any season", not "unknown" —
  never invent one for a rock or a generic patch of grass.
- `needsNaming: true` — placeholder from bootstrap; the contact-sheet queue.
- `lowConfidence: true` — legacy flag from the guess-and-verify era. Don't add
  new ones; geometry is derived now. `--repair` clears it where it applies.
- `frames: [...]` / `frameDurationMs` — animated sprites only; see below.
  Validated by the gate.

## Animated sprites

A sheet whose "sprites" are really animation frames (an effects sheet, a
torch, a water tile) must not be named frame by frame — the frames are one
sprite. Declare it with `animate` in the names file:

```json
{"12": {"name": "torch_flame", "animate": {"count": 5, "durationMs": 120}}}
```

`count` splits the entry's box into equal frames (left to right, or top to
bottom with `"axis": "y"`). The split has to be exact — an uneven one means
the frame count is wrong, and the tool refuses rather than smearing every
frame after the first.

Frames that grow — an expanding flash, a spreading splash — aren't uniform, so
give their boxes outright instead:

```json
{"animate": {"durationMs": 140, "frames": [
  {"x": 448, "y": 99, "w": 30, "h": 29},
  {"x": 480, "y": 99, "w": 30, "h": 29}]}}
```

A merge takes `animate` too, for a strip spanning several grid cells.

The Sprite Ledger plays anything with `frames`: the detail panel animates it
with play/pause and frame stepping, the grid marks it ▶ and shows frame 1 as
the thumbnail (an animated entry's own box is the whole strip, which reads as
a smear). `frameDurationMs` is optional and falls back to 120ms.

`frames` is validated by the trust gate — at least 2 frames, each in bounds.
It used to be waved through with a warning; once the ledger renders from a
field, a malformed value is a defect, not a note.

**Flagging one from the ledger:** the flag reasons include *Should be an
animation*. It needs a frame count in the comment to be actionable — the strip
has to divide evenly and that can't be read off a crop.

## Scope: catalogue on demand

Only about 8 catalogue files are actually loaded by the game. Bootstrapping a
pack is free, so do it on intake for everything. **Naming is not free** — do
it when a map actually needs the pack, not speculatively. The Sprite Ledger
(`apps/tool_suite/sprite_ledger`) is where you browse what exists and decide
what's worth naming.

## Repairing older catalogues

```
python3 tools/sprite_catalogue/bootstrap_catalogue.py --path public/assets/catalogued --repair
```

Tightens any `kind: "object"` entry whose box is the whole sheet down to its
real alpha bounds, and clears `lowConfidence` on those (the geometry is
derived now, not guessed). Names are never touched. Idempotent.

## Tests

`npm run test:autoslice` covers island detection, gap bridging, grid mode,
repair, and batch naming. `npm test` runs it with everything else.
