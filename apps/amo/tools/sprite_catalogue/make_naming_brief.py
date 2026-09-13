#!/usr/bin/env python3
"""Generates a naming-dispatch brief for one band image. Reusable across all
4 LPC atlases' naming passes this session."""
import sys

TEMPLATE = """# {sheet}.png rows {r0}-{r1} — naming pass

## Context
This image is a slice of `apps/amo/public/assets/catalogued/tilesets/lpc/{sheet}.png`'s
32x32-per-cell grid catalogue, rows {r0}-{r1}, rendered by `contact_sheet.py --grid-atlas`:
every entry still flagged `needsNaming` is drawn at its true pixel size on a
checkerboard background, laid out at its real row/col position (so adjacent
autotile pieces stay adjacent), with its catalogue `entries[]` index number
stamped in the corner. A dark/blank cell with no index number is either
already named (an object merged in an earlier pass) or a genuinely empty
grid slot — skip those, don't invent an entry for them.

Image: {band_png}

## Task
Look at every numbered sprite in the image and write ONE JSON file mapping
each entry index (as a string) to a name (or a `{{"name":..., "tags":[...]}}`
object). This is a naming-only pass — geometry is already final, don't
propose merges or splits.

## Naming conventions
- snake_case, descriptive of what's actually drawn (shape/material/color),
  e.g. `stone_wall_corner_nw`, `wood_crate_small`, `grass_fill_a`.
- Name only what the pixels actually show — never infer an identity, species,
  or color the art doesn't render. A translucent gray silhouette with no
  visible fur/face/color is a `*_shadow_*`, not e.g. `mouse_brown_*`; a plain
  round blob is `round_blob_a`, not a guessed fruit, if you can't actually
  tell which fruit. If genuinely torn between two readings, pick the more
  generic/neutral one rather than the more specific one — a specific wrong
  guess is a worse mistake than a vague-but-correct name.
- No biome- or season-specific qualifiers yet (write `grass_fill_a`, not
  `grass_temperate_a` or `grass_summer_a`) — the biome/seasonal-variant plan
  isn't finalized, don't bake in an assumption that would need renaming later.
- Autotile / kit pieces: name each cell individually even when several
  adjacent cells are obviously one tileable set (a floor's corner/edge/center
  pieces, a fence's post/rail segments) — they're still separate catalogue
  entries meant to be placed individually. Disambiguate with a positional or
  descriptive suffix: `_corner_nw`, `_edge_n`, `_center`, `_end_left`, etc.
- Near-identical repeats that aren't positional autotile pieces (e.g. three
  barely-different mushroom sprites) get `_a`, `_b`, `_c` suffixes.
- **Every name in this batch must be unique, AND must not collide with any
  name already used elsewhere in this same sheet** (the apply tool rejects
  the whole batch on any duplicate, old or new). Names already used in
  `{sheet}.png` so far — do not reuse any of these:
  {avoid_names}
- If a sprite is genuinely hard to identify (an abstract texture fragment, a
  cropped piece of something), still give it a plain descriptive name based
  on what it visually looks like (e.g. `textured_fragment_blue_a`) rather
  than skipping it — skipping leaves it stuck `needsNaming` forever. Only
  skip an index if the image shows literally nothing there (a rendering
  artifact).
- If you spot a `needsNaming` sprite that looks like a fragment of a larger
  rigid object that should have been merged with its neighbors in an earlier
  pass (the merge pass may have missed it), name it anyway with your best
  single-cell guess, but flag it clearly in your report so the controller can
  queue a follow-up merge.

## Output
Write the JSON map to:
{out_json}

## Report back
When done: how many entries you named, any you skipped and why, and any
suspected missed-merge fragments you flagged.
"""


def main():
    sheet, r0, r1, band_png, out_json, avoid_names_str, brief_path = sys.argv[1:8]
    avoid = avoid_names_str.split(',') if avoid_names_str else []
    avoid_block = ', '.join(f'`{n}`' for n in avoid) if avoid else '(none yet — this is the first band)'
    text = TEMPLATE.format(sheet=sheet, r0=r0, r1=r1, band_png=band_png,
                            out_json=out_json, avoid_names=avoid_block)
    with open(brief_path, 'w') as f:
        f.write(text)
    print('wrote', brief_path)


if __name__ == '__main__':
    main()
