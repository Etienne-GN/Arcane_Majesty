# LPC 4-atlas full naming — plan & progress

## Goal
Full naming (not on-demand) of the LPC 2012 community atlases, per user's
explicit preference: "I'd prefer having all named and usable rather than
hoping I have what I want to use." These are one coherent collection —
diverse grass/dirt/tree variants are wanted for future biome work (tree
species changing by latitude/temperature, snow further north, etc. — noted
that palette-swapping won't work for winter foliage, real art variants are
needed, which this atlas already partly provides).

## Scope
Four sheets in `apps/amo/public/assets/catalogued/tilesets/lpc/`, all
bootstrapped in pure `--grid 32` mode, all still `needsNaming`:

| Sheet | entries | needsNaming | sheet size |
|---|---|---|---|
| `base_out_atlas` | 937 | 937 | 1024x1024 |
| `build_atlas` | 965 | 965 | 1024x1024 |
| `obj_misk_atlas` | 984 | 984 | 1024x1024 |
| `terrain_atlas` | 1012 | 1012 | 1024x1024 |

Plus two small, badly-incomplete sheets (not part of the "4k" count but same
family, need fixing regardless):

| Sheet | entries | grid | issue |
|---|---|---|---|
| `treetop.catalogue.json` | 1 (of 4 real variants) | 2x2, 96x112 cells | only cell (0,0) ever got an entry |
| `trunk.catalogue.json` | 1 (of 2 real variants) | 2x1, 96x96 cells | only cell (0,0) ever got an entry |

Source zips (credits/license only, **no tile legend** — confirmed by opening
them) live at `apps/amo/ressources/processed_archives/{Atlas,Atlas2,ItemsAndEffects}.zip`.

## The core structural problem (why naming can't start cold)
Grid mode is correct for genuine autotile/kit pieces (wall/roof/floor
segments meant to tile edge-to-edge, single-cell props like fruit/tools) but
**wrong** for rigid multi-cell objects — trees, cherry blossom trees, boats,
statues, tombstones, furniture, carts, gates. Those got sliced into N
separate single-cell `tile` entries instead of being one object. This is
what the user meant by "trees split into too-small parts" — confirmed by
inspection it's not just trees, it's most large props across all 4 sheets.

**Fix order matters**: multi-cell objects must be merged into one `object`
entry (via `apply_names.py`'s `merges`, `cells: [entry_index, ...]`) *before*
naming — you can't sensibly name 6 separate cells "cherry_blossom_tree".

## Detection method (works well, keep using it)
Grid-mode alpha checking (per-cell non-empty) is what produced the 3898
entries. To find merge candidates, run **island/alpha mode** (no `--grid`)
over the same PNG instead:

```python
from autoslice import load_mask, find_boxes
mask = load_mask(png_path)
boxes = find_boxes(mask, gap=0, min_area=10)   # gap=0: real sprites here keep a margin
multi = [b for b in boxes if b['w'] > 34 or b['h'] > 34]   # spans >1 cell
```

For `obj_misk_atlas.png` this cut 984 grid cells down to **78 multi-cell
candidates** (from 330 total alpha islands) — a tractable review list instead
of manually tracing adjacency across a 32x32 grid by eye.

Each candidate's pixel bbox needs mapping back to the grid entries it covers
(script already written, see below) — most candidates are genuine objects,
but the biggest few (island bbox spanning 10+ cells in a blob shape) are
often accidentally-touching **terrain** (e.g. a big connected water+wall
region) and must NOT be merged — visual judgement still required per
candidate, just over ~78 items instead of manually scanning ~1000 cells.

Reusable snippet used this session (adjust the sheet name and re-run per
atlas — nothing here is atlas-specific):

```python
import sys, json
sys.path.insert(0, 'tools/sprite_catalogue')  # run from apps/amo/
from autoslice import load_mask, find_boxes

sheet_name = 'obj_misk_atlas'  # change per atlas
with open(f"public/assets/catalogued/tilesets/lpc/{sheet_name}.catalogue.json") as f:
    cat = json.load(f)
entries = cat['entries']
tw, th = cat['gridTileWidth'], cat['gridTileHeight']
pos_to_idx = {(e['row'], e['col']): i for i, e in enumerate(entries)}

mask = load_mask(f"public/assets/catalogued/tilesets/lpc/{sheet_name}.png")
boxes = find_boxes(mask, gap=0, min_area=10)
multi = [b for b in boxes if b['w'] > 34 or b['h'] > 34]

candidates = []
for b in multi:
    x, y, w, h = b['x'], b['y'], b['w'], b['h']
    c0, c1 = x // tw, (x + w - 1) // tw
    r0, r1 = y // th, (y + h - 1) // th
    idxs = [pos_to_idx[(r, c)] for r in range(r0, r1 + 1) for c in range(c0, c1 + 1)
            if (r, c) in pos_to_idx]
    candidates.append({'bbox': (x, y, w, h), 'cells': (c1 - c0 + 1, r1 - r0 + 1), 'indices': idxs})
```

Then render each candidate as a small labeled crop in a montage (8 per row,
sorted by area descending) for one visual pass — montage code was written
inline this session, not saved to a file; trivial to redo (crop each bbox
from the sheet, paste into a grid canvas with an index + cell-count label).

## Progress so far
- **2026-09-10**: generalized the inline detection snippet into
  `find_merge_candidates.py` (reusable CLI: sheet name in, candidates JSON +
  labeled montage PNGs out). Ran it on all 4 atlases: obj_misk 78, base_out
  44, build 60, terrain 67 merge candidates. Dispatched one Opus judgment
  subagent per atlas (montages + candidate/entry-index mapping + crop
  snippet for zooming into anything ambiguous) to decide MERGE / SPLIT /
  LEAVE per candidate and write a ready-to-apply `merges` JSON — see
  `/tmp/.../scratchpad/lpc_work/<sheet>_merges.json` +
  `<sheet>_decisions.md` per atlas (transient, session-scoped; if lost,
  rerun `find_merge_candidates.py` and re-dispatch using the brief pattern
  in `<sheet>_brief.md`, also transient — regenerate from this plan's
  description of the brief contract if both are gone). **Not yet applied to
  any catalogue** — next step after each agent reports back is: spot-check
  a sample of its decisions against the montage, then apply via
  `apply_names.py`'s `merges`, validate, test, commit — one atlas at a time.
- **obj_misk_atlas.png**: 78 merge candidates computed. Visually reviewed
  candidates #0–#39 (the top half of the montage, largest-area first) —
  **no merge decisions actually applied yet, nothing written to disk**.
  Observations from that partial look:
  - #0 (17x11), #1 (11x9), #2 (8x12 approx — a boat scene), #4 (7x9) are
    large architectural/scene blobs — need individual judgement, likely
    NOT single merges (probably several distinct objects touching, e.g.
    the boat photo (#2) looks like it could be 1 object; #0/#1 look like
    they might be roof/gazebo *kit* pieces, not one rigid object — unclear,
    look closer before deciding).
  - #6, #7 (3x7, 4x7) — the two cherry blossom trees, confirmed genuine
    multi-cell rigid objects, should merge.
  - #16, #17 (rowboats) — genuine objects, should merge.
  - #18 (bare tree, 4x2) — genuine object, should merge.
  - #21, #32 (tombstones) — genuine objects, should merge.
  - Furniture pieces (#9, #13, #14, #22, #23, #25, #26, #29, #30, #31, etc.)
    — mostly look like genuine single-object merges (wardrobes, beds,
    bookshelves, curtains) but weren't all individually confirmed.
  - Did not yet review candidates #40–77 (bottom half of montage) at all.
- **base_out_atlas.png**: DONE (commit `2fd404d7`). 44 candidates ->
  15 MERGE (17 named objects, 2 candidates split into their real single-cell
  parts instead) + 27 LEAVE (terrain/kit autotile demo patches, cliff
  columns, decals). 937 -> 869 entries. One open question carried into the
  naming pass: candidate #39, a 22x45 red/cream prop of uncertain identity
  (bed? awning? carpet?) — left needsNaming, revisit with fresh eyes then.
- **build_atlas.png, terrain_atlas.png**: not started —
  same method needs to run fresh per sheet (island bboxes differ obviously).
  From earlier visual skim (not the candidate script) of `build_atlas.png`:
  expect a torii gate, a large church facade, tents, wagons, carts, hay
  bales, a well/fountain-like structure, gate arches as clear merge
  candidates, alongside a LOT of legitimate wall/roof kit tiling that must
  stay per-cell. `terrain_atlas.png` has several standalone trees, moai
  statues, a waterfall, bridges, single boulders — same pattern.
- **treetop.png / trunk.png**: DONE (commit `49d28820`). `bootstrap_catalogue.py`'s
  `--grid` flag turned out to be square-only, so re-bootstrapped directly via
  `autoslice.grid_cells(mask, 96, 112)` / `(96, 96)`. Confirmed visually: 4
  treetop variants (`treetop_round_bushy_a/b`, `treetop_pine_a/b`), 2 trunk
  variants (`tree_trunk_a/b`). Named, validated, tested, committed.

## Agreed model split for the next phase
- **Sonnet**: bulk naming dispatches (contact-sheet pages of mostly
  straightforward single-icon labeling — fruit, tools, furniture, terrain
  swatches). Mechanical enough once a page is laid out with clear index
  numbers.
- **Opus**: (1) the merge-candidate judgement pass itself — controller-level
  work, not delegated, because this session already made real visual
  mis-identifications elsewhere (angel/gargoyle mixup, overworld_tileset
  content swaps) and this judgement call is where being wrong is expensive
  to unwind later (wrong merges get baked into map data); (2) a final QA/
  spot-check pass over Sonnet's naming batches across all 4 atlases for
  consistency and autotile-adjacency correctness before considering this
  done.

## Suggested next steps (in order)
1. Finish the merge-candidate review for `obj_misk_atlas.png` (candidates
   #40-77 unreviewed), decide merge vs. leave-alone for all 78, apply via
   `apply_names.py`'s `merges`, validate, test, commit.
2. Repeat the same candidate-detection + review + merge cycle for
   `base_out_atlas.png`, `build_atlas.png`, `terrain_atlas.png`.
3. Re-bootstrap `treetop.png` and `trunk.png` for real, name their small
   handful of variants directly (no need for the contact-sheet/subagent
   machinery at that scale).
4. Only after all merges land: move to full naming. Use
   `contact_sheet.py --grid-atlas` per atlas, dispatch Sonnet subagents per
   batch of pages (each subagent gets: the contact sheet image(s), the
   `apply_names.py` names-file format from `OPENCODE_PROMPT.md`, and clear
   snake_case naming conventions), then an Opus pass to spot-check a sample
   from each atlas before calling the whole thing done.
5. Somewhere in this arc, revisit whether any of the four atlases'
   "kind: tile" autotile terrain groups (grass variants, dirt variants,
   water edges) would be better served by explicit `season`/biome-oriented
   tags once biome work actually starts — not blocking for the naming pass
   itself, just don't name them in a way that would need renaming later
   (e.g. prefer `grass_fill_a` over something biome-specific like
   `grass_temperate_a` for now, since the user's biome plan is still just a
   direction, not a spec).

## Everything not yet touched
No catalogue JSON or PNG has been modified for this task. The only
artifacts created this session were transient (`/tmp` scratchpad renders,
montages, a candidates JSON) — none of it persisted outside this plan file.
Regenerate as needed using the snippet above.
