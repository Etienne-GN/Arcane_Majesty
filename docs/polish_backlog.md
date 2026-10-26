# Polish backlog

Looks and feel, parked on 2026-10-26 so the work can go to making the game playable
(test cooking and crafting, add sword fighting and sword skills, ranged weapons).
Come back to these in a polishing phase. Add to it freely.

## Maps (from the W6 preview review)

- **Thaloria looks like a park.** Small houses stand alone on wide lawns on a strict
  street grid. Wanted: rows of houses along the streets, shared walls, fenced yards and
  gardens, more buildings, less empty grass. Layout: `apps/amo/tools/maps/thaloria_layout.py`,
  generator `gen_thaloria.py` (then `node tools/gen_walk_grids.mjs`).
- **Forest trees all look the same.** Every tree tile (tile 1) is one identical trunk and
  canopy (`GameScene._buildTreeChunk`, W2), so dense woods read as orchard rows. Wanted: mixed
  tree kinds and sizes. Touches every forest map, and the W2 performance budget.
- **The Wilds:** the forest shape was improved (ragged clearings, gradual thinning), but
  check it again with real tree art.

## Sprites

- The user has many sprite changes in mind (characters, props). List them here as they come.

## Small things left from earlier work (W3–W5 reviews)

- A seated townsperson stands up while you talk to them.
- A hop or blink can land on a walking townsperson.
- "Closed — come back in the morning" shows for a few minutes after 08:00 while the
  keeper walks to the stall.
- Named shopkeepers greet you again after you go through a door and back.
- The boss's floating text draws under walls and roofs (depth 26), the bug fixed for
  speech bubbles on 2026-10-26.
- Two Thaloria residents share a look (`look_05`: `beggar_gate`, `stallholder_b`) and both work near the market by day.
