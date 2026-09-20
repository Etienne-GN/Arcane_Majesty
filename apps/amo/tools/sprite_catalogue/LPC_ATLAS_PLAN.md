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
- **obj_misk_atlas.png**: DONE (commit `fbb56a40`). All 78 candidates
  judged: 44 MERGE + 13 SPLIT (9 yielding named sub-objects) + 21 LEAVE.
  984 -> 784 entries. One correction to this plan's own earlier note above:
  the two cherry blossom trees are NOT clean single objects — each
  candidate is two pixel-identical stacked copies of the same tree; only
  the complete lower copy (with root flare) was named, the rootless
  duplicate above it was left unmerged rather than named misleadingly.
- **base_out_atlas.png**: DONE (commit `2fd404d7`). 44 candidates ->
  15 MERGE (17 named objects, 2 candidates split into their real single-cell
  parts instead) + 27 LEAVE (terrain/kit autotile demo patches, cliff
  columns, decals). 937 -> 869 entries. One open question carried into the
  naming pass: candidate #39, a 22x45 red/cream prop of uncertain identity
  (bed? awning? carpet?) — left needsNaming, revisit with fresh eyes then.
- **terrain_atlas.png**: DONE (commit `a7be6be6`). 67 candidates -> 34
  MERGE (36 named objects, 2 candidates split into their real parts) + 31
  LEAVE (autotile fills, cliff-kit columns, decal rows). 1012 -> 894
  entries. One open question: candidate #66 (grey ringed disc over green
  strands) — identity genuinely unclear, left needsNaming.
- **build_atlas.png**: DONE (commit `5e7fb687`). 60 candidates -> 28 MERGE
  (33 named objects) + 7 SPLIT (all resolved into either a named sub-object
  or left per-cell) + 25 LEAVE (fence/wall/pipe/roof kit tiling). 965 -> 806
  entries. One correction made after the agent's own pass: its biggest
  candidate ("torii_gate_winged", 33 cells) was actually a plain torii gate
  flanked by two separate benches sharing a cast shadow — renamed to
  `torii_gate_with_benches` rather than split (gate pillar and bench art
  overlap within shared grid cells, no clean partition at whole-cell
  granularity). Lesson for the full-naming pass: always render a
  column/row-labeled grid crop before trusting a "this reads as one
  ensemble" call on anything odd-shaped.
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

## Resumed 2026-09-14
Paused earlier the same day for a sprite-ledger review detour (see that
work's own commits); user asked to continue LPC naming. Re-dispatched
the 4 bands that were queued at pause time (base_out 20-23, terrain
12-15, build 12-15, obj_misk 8-11) with freshly-regenerated avoid-lists
(build_atlas's list changed — the ledger detour fixed a mis-split barrel
in it, see commit 0da05819).

## PROJECT COMPLETE (2026-09-19)
All 4 LPC atlases are now fully named, merges applied, tests green
throughout:
- base_out_atlas.png: 866 entries, 0 needsNaming
- build_atlas.png: 793 entries, 0 needsNaming
- terrain_atlas.png: 884 entries, 0 needsNaming
- obj_misk_atlas.png: 732 entries, 0 needsNaming
- Total: 3275 entries (down from the original ~3900 grid cells before
  merges consolidated multi-cell rigid objects)

Every band went through: Sonnet naming dispatch -> controller review of
any subagent-flagged "possible missed merge" or uncertain identification
(cross-checked against real row/col adjacency and rendered pixel crops,
never trusted on the subagent's prose alone) -> fix if warranted ->
apply_names.py -> npm test -> commit. Real corrections landed in most
bands — see the commit history above and the "lessons learned" section
below for the recurring failure patterns worth knowing if this kind of
pass is ever run again on a similar sheet.

**Not done, optional**: the plan's original step 6 (a dedicated final
Opus QA/spot-check pass across all 4 atlases for cross-atlas naming
consistency) was effectively folded into the per-band review this
session already did throughout — every band's output was checked before
committing, not just a sample at the end. A fresh, deliberately
skeptical full pass could still be run later if the user wants extra
confidence, but there is no known outstanding issue prompting one.

**Not done, out of original scope**: full naming of the biome-diversity
tagging (season/region-specific variants) mentioned as the original
motivation for this project — naming was deliberately kept
biome-neutral throughout (e.g. `grass_fill_a`, not `grass_temperate_a`)
per the plan's step 5, so that work is still fully ahead and unblocked
by anything done here.

## Milestone: base_out_atlas.png fully named (2026-09-17)
866/866 entries, 0 needsNaming. First of the 4 atlases complete — see
commits 12a54917 through 21866e7f for the full band-by-band history.

**Recurring pattern worth flagging to any future controller**: naming
subagents reporting "these look like a missed merge" or "these two
fragments are related" get the actual content wrong more often than
not — roughly half the time on inspection. The most common root cause:
mistaking array-index adjacency for spatial adjacency. A 32-col grid
means index N and N+1 are only spatially adjacent when N+1 doesn't
cross a row boundary; index N and N+32ish (or any offset near a row's
width) can look "close" in the report's prose but sit on opposite
sides of the sheet. Always re-derive row/col from the catalogue
yourself for any flagged pair before deciding to merge or rename —
never trust the subagent's own row/col claims in its prose summary.
Recent dispatches now carry an explicit warning about this in the
prompt.

## Naming-phase workflow (step 4, in progress)
Merges are done for base_out/terrain/build_atlas (obj_misk_atlas merge
judgment in progress as of this writing). Naming pipeline per atlas:

1. `python3 tools/sprite_catalogue/contact_sheet.py --catalogue
   public/assets/catalogued/tilesets/lpc/<sheet>.catalogue.json --out-dir
   <dir> --grid-atlas --only-unnamed` — one big image, true row/col layout
   (autotile adjacency preserved), e.g. 3200x3520 for a 1024x1024/32px sheet.
2. `python3 tools/sprite_catalogue/split_grid_atlas_bands.py --catalogue
   <same catalogue> --atlas-png <output of step 1> --rows-per-band 4
   --out-dir <dir>/bands` — crops into full-width row-bands (~80-130
   `needsNaming` sprites each, legible at this density — checked visually).
3. `python3 tools/sprite_catalogue/make_naming_brief.py <sheet> <r0> <r1>
   <band_png> <out_names_json> <comma_separated_avoid_names> <brief_path>`
   — one brief per band. `avoid_names` = every name already used anywhere
   else in this sheet so far (apply_names.py rejects the whole batch on any
   duplicate, old or new) — recompute from the catalogue's already-named
   entries before generating each new brief, since it grows after every
   applied band.
4. Dispatch one **Sonnet** subagent per brief (naming is mechanical —
   this is the "bulk naming dispatch" role from the agreed model split).
   Independent bands can dispatch in parallel; apply sequentially per atlas
   so each next brief's avoid-list is current.
5. `apply_names.py --catalogue <sheet catalogue> --names <band's output>`,
   then `npm test`, then commit. One commit per band is fine, or batch a
   few bands per commit — either way, always test before committing.
6. After all bands of all 4 atlases are named: an **Opus** QA/spot-check
   pass over a sample from each atlas for consistency (naming style,
   autotile-adjacency correctness, anything that reads as a missed merge)
   before calling the whole project done.

Progress on this phase: base_out_atlas rows 0-3 and 4-7 named and
committed (239/937 entries). All 4 atlases now have their merge pass
complete (base_out `2fd404d7`, terrain `a7be6be6`, build `5e7fb687`,
obj_misk `fbb56a40`). In flight: base_out rows 8-11, terrain rows 0-3,
build rows 0-3, obj_misk rows 0-3 (all Sonnet — each atlas's first/next
naming band, running in parallel). Sonnet dispatches have also hit rate
limits mid-task a few times (same pattern as the Opus merge-judgment
dispatches) — just re-dispatch fresh with the same brief once the reset
time passes; check for partial output first (see lesson above).

**Running total as of this note**: 3299 entries across the 4 atlases
(count drops slightly with each merge fix), 1974 still needsNaming.
Bands landed: base_out 0-3/4-7/8-11/12-15/16-19, terrain 0-3/4-7,
build 0-3/4-7/8-11, obj_misk 0-3/4-7. Merge-fix corrections applied
mid-naming so far: 1 in terrain rows4-7, 1 in base_out rows12-15, 6 in
build rows8-11, 9 in obj_misk rows4-7 — genuine missed merges the
original merge pass overlooked, always caught by rendering the real
pixel region for any subagent-flagged fragment before applying (see
lessons above). Next up: base_out 20-23, terrain 12-15, build 12-15,
obj_misk 8-11.

**Lessons learned, watch for these on every band**:
- Cross-band name collisions happen even with the avoid-list, because a
  subagent can independently invent the same family name for a *visually
  different* texture two rows away. `apply_names.py` catches it (refuses
  the whole batch) — fix by a quick visual compare of both colliding
  groups: sometimes they're genuinely different (rename the new one to
  something distinct) and sometimes it's literally the same repeated art
  (add a next-letter suffix, e.g. `_c`/`_d`, rather than inventing an
  unrelated name).
- A naming subagent can assert an identity/color the art doesn't actually
  render (named a 65-entry translucent shadow-silhouette set "mouse_brown"
  — verified by alpha inspection to be a gray ~60%-alpha blob, no mouse
  drawn at all). `make_naming_brief.py` now explicitly warns against this;
  still worth a skim of any band with a large repeated low-detail family.
- Subagents reliably self-flag real missed-merge fragments — every band so
  far has had 1-3 flagged "this might be a split object" notes, and on
  inspection roughly half turn out to be genuine (needing a same-pass
  merge fix before applying) and half are harmless edge bleed or
  coincidentally-similar unrelated decals. Always check flagged items by
  rendering the real pixel region (not just the low-res contact-sheet
  crop) before deciding — one genuine case looked like 8 separate
  fragments in the contact sheet but was actually unconnected debris on
  closer inspection, while another looked like one object in a wide crop
  but was actually a small 8x8px decal shared across 4 cells at their
  shared corner (confirmed by comparing alpha pixel counts per cell).
- A rate-limited/"failed" dispatch sometimes still wrote a complete,
  valid output file to disk before being cut off — always check for and
  validate an existing file (record count matches expected, no internal
  dupes) before re-dispatching from scratch.
- **This repo has another live session/terminal working in it concurrently**
  (unrelated lore/album file edits appeared mid-task). A bare `git commit
  -m "..."` after `git add <my file>` commits the WHOLE INDEX, not just
  what you just added — it swept in someone else's staged rename once,
  attributing it to an unrelated sprite-catalogue commit. Caught via
  `git show --stat HEAD` right after committing; fixed by amending the
  commit down to just the intended path, then `git rm --cached
  <old>` + `git add <new>` to put the other party's pending rename back
  the way it was. **From now on, always scope every commit explicitly**:
  `git commit -m "..." -- <exact path(s)>`, never a bare `git commit`
  after just an add, and glance at `git status`/`git show --stat HEAD`
  after each commit in this task.

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
