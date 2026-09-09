# Sprite Ledger — flagged items todo

Snapshot from `data/flags.json`, updated 2026-09-09 after processing points 1 & 2.

## Done this pass

### 1. Specific re-crops (BaseChip_pipo.png, PATD_Props.png, mushroom clusters)
- Merged the treasure-map's two mis-split halves into one 64×32 entry, which
  cascaded a name fix through 3 other picture entries that were each one slot
  off (`picture_blank_paper`/`picture_portrait_silhouette`/`picture_landscape`).
- Split `gargoyle_statue_gray`'s box into 3 real objects: `pillar_marble_fluted`,
  `brazier_wood_tripod` (new), and a correctly-sized `gargoyle_statue_gray`.
- Split `curtain_tan_awning`'s box into the actual curtain (relocated — its
  recorded box was mostly empty/other-stuff) and a new `knight_statue_gray`.
- Split `bridge_rope_wood_a`'s 256px-wide box into 3 real props: the rope
  bridge, a new `bridge_platform_wood_a`, and a new `clothesline_wood_posts`.
- Fixed 6 armor-stand boxes that all cut off the head/shoulders
  (`armor_stand_empty/silver/green/pink/blue/purple`), confirmed via alpha —
  and dropped 6 duplicate "_b" entries that were re-catalouging the same
  cut-off heads under separate (wrong) names.
- Relocated `cutting_board_knife` (its box pointed at an unrelated hanging
  cauldron one row up) and both pew entries (legs were cut off).
- `fountain_stone_base` turned out to be a stray duplicate of the
  already-correct `fountain_stone_round` — dropped.
- `magic_circle_gray` — left untouched: a prior session already generated 6
  colour variants for this one (`generated_recolours/`), already at
  needs_review.
- Seasonal packs (autumn/spring/summer/winter sample) — already fully
  re-catalogued as 16×16 tile grids by a prior session; no action needed.
- `pillar_wood_round`, `ladder_rope_wood_short`, `doll_figurine`,
  `bench_stone_west/east` (PATD) — already resolved by a prior session's
  rename; verified boxes are correct, no action needed.
- `oven_gray_double`, `sink_gray_wood_legs_a/b` — already correctly split by
  a prior session (their "legs/base" are separate pre-existing entries one
  row down: `stove_black_burners`, `sink_gray_brick_base_a`,
  `counter_white_brick_base`). Verified, no action needed.

26 flags moved `open` → `needs_review` from this cluster, plus the 2
mushroom-cluster flags (already resolved by a prior session, confirmed and
checkpointed).

**Left `open` (no confident fix):**
- `candles_lit_triple` — box is already alpha-tight; the two side candles
  genuinely have no base drawn in the source art. Needs new art, not a crop.
- `wardrobe_tall_brown` — looks like one coherent wardrobe (drawers + door),
  no clear second object to split out. Needs a human call on what "split"
  was meant here.

### 2. "Should be an animation" (23 items)
21 of 23 confirmed as real uniform frame grids (mostly 4-frame loops; a few
larger multi-row grids — Anvil ×3 at 35 frames each, Level_3 at 60,
Alchemy_Table ×2 at 42/51) and given real `frames` arrays + 120ms duration,
derived from the alpha grid so no frame boxes were hand-guessed. `effects.png`'s
`effects_026` (still an unnamed bootstrap placeholder) was also named
(`burst_flash_purple_red`) and animated. All 21 moved to `needs_review`.

**Left `open`:**
- `Furnace.png`, `Workbench.png` — visual inspection shows these are NOT
  loopable animations but tier/progression icon sets (rock → brick → iron
  furnace, each at 2 build stages; same for two workbench variants). Forcing
  them into a `frames` loop would be wrong. Needs a human decision on
  whether to split these into named static tier icons instead.

## Still outstanding (not touched this pass)

### 3. Bulk "misaligned", no comment (135 flags, 74 sheets)
Unchanged from the original triage — see git history of this file for the
full list. Likely a systemic autocrop issue on whatever batch ingested these
~74 single-prop packs; worth investigating the pipeline before doing these
by hand.

### 4. Misc
- `pots.png` → `pot_variants`, `wrong_name`, no comment — untouched.

---
*Regenerate the raw list with:* `python3 -c "import json; d=json.load(open('data/flags.json')); [print(f) for f in d if f['status']!='resolved']"`
