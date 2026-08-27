# Build the Real Eldoria's Prophecy Maps — Design Spec

**Status:** Approved by user, ready for implementation planning
**Sub-project 4 of 4** in the "structured map-authoring pipeline" initiative (see `docs/superpowers/specs/2026-08-26-sprite-catalogue-system-design.md` for the full initiative context and sub-projects 1/2/3).

## Context

Sub-projects 1-3 give the pipeline everything except the last mile:

- Sub-project 1: sprites can be named and looked up (once real sheets are
  catalogued — not yet done, gated on the user picking/annotating sprites).
- Sub-project 2: the engine can place a named sprite anywhere on a map
  (once its plan is executed — not yet done).
- Sub-project 3: one location (Summit of Despair) has a full map spec;
  the other 11 Eldoria's Prophecy locations don't yet.

This sub-project is the assembly step: turning a finished map spec into a
real, wired-in `.js` map, plus one piece of genuinely new tooling the
first three sub-projects didn't touch — the `tiles` walkability grid is
still a hand-typed 2D array of ints (`northern_forest.js` is 45 rows of 40
comma-separated numbers), which remains real "hours creating maps" pain
even after sprite-guessing is solved.

Because sub-projects 1/2 haven't been executed yet and 11 of 12 locations
have no spec, most of "build all 12 real maps" cannot happen yet. This
spec covers the repeatable assembly *procedure* plus one proof application
(Summit of Despair, using placeholders where real data doesn't exist yet)
— not full content production across the campaign.

## Goals

- A tile-grid authoring shortcut: write a map's walkable layout as ASCII
  art, convert it to the real `tiles` array — no more hand-typing a wall of
  comma-separated ints.
- A documented, repeatable procedure for turning one finished map spec
  (sub-project 3's output) into a real map file: `tiles` (via the ASCII
  tool), `decorations`/`tileset` (sub-project 2's schema, sprite names from
  sub-project 1's catalogue), `spawns` (from the spec's tables),
  registration in `maps/index.js`, portal wiring, and quest data aligned to
  canon names (per the Campaign Bible's own "existing game content to
  align" note).
- One proof application to Summit of Despair, demonstrating the procedure
  actually works end-to-end structurally — built now, with clearly-marked
  placeholders standing in for the sprite refs and neighboring maps that
  don't exist yet.

## Non-goals

- Running this procedure for the other 11 Eldoria's Prophecy locations —
  real future content work, once their specs exist (sub-project 3's
  deferred scope) and sub-projects 1/2 are executed.
- Building East Road or Sylvan Sanctuary (Summit of Despair's neighbors) —
  their own map specs don't exist yet.
- Substituting real catalogued sprite names into Summit of Despair's
  placeholders — that's a small, explicitly-flagged follow-up once real
  sheets are catalogued (sub-project 1 execution).
- Any change to the tile *value* meanings (`0`=floor, `1`=wall/blocking,
  `2`=path) — the ASCII tool converts characters to these same existing
  values, it doesn't redefine them.

## Components

### 1. ASCII-to-tiles converter (not blocked — buildable now)

`apps/amo/tools/maps/ascii_to_tiles.js`:

```javascript
export const DEFAULT_LEGEND = { '.': 0, '#': 1, '=': 2 };

export function asciiToTiles(asciiText, legend = DEFAULT_LEGEND) {
    const lines = asciiText.split('\n').filter(l => l.length > 0);
    const width = lines[0]?.length ?? 0;
    return lines.map((line, r) => {
        if (line.length !== width) {
            throw new Error(`row ${r} has length ${line.length}, expected ${width} (all rows must be the same width)`);
        }
        return [...line].map(ch => {
            if (!(ch in legend)) {
                throw new Error(`row ${r}: unrecognized character "${ch}" (legend keys: ${Object.keys(legend).join(', ')})`);
            }
            return legend[ch];
        });
    });
}
```

Default legend matches the existing tile-value meanings exactly (`.`
floor=0, `#` wall/tree=1, `=` path=2) — pass a custom legend only if a map
genuinely needs more distinct symbols. Pure function, no dependency on
sprites, the renderer, or any other sub-project — fully buildable and
testable in isolation.

### 2. Map assembly procedure (not blocked — buildable now)

A documented, repeatable procedure (mirrors the style of sub-project 3's
own process doc). Given one finished map spec
(`data/lore/campaigns/<campaign>/<location>.md`) plus (once they exist)
catalogued sprites and the sub-project-2 renderer:

1. **Author the `tiles` grid.** Read the spec's Geography & Connectivity
   section for dimensions/terrain description; write the layout as ASCII
   art (`.`/`#`/`=`); convert via `asciiToTiles()`.
2. **Populate `decorations`.** For each Point of Interest / notable prop
   the spec describes, add a `{ sheet, name, x, y, blocking?, depthOffset? }`
   entry (sub-project 2's schema) — `sheet`/`name` come from sub-project
   1's catalogue once it's been run against the relevant sheets.
3. **Populate `tileset`.** Set `floor`/`path`/`decor` catalogue refs (or
   fall back to the legacy raw-int fields if no relevant sheet is
   catalogued yet) matching the spec's terrain description.
4. **Populate `spawns`.** Enemies/wildlife/gathering-nodes/chests from the
   spec's Spawns/Treasure tables, using the existing `spawns` schema
   (`enemies`, `npcs`, `chests`, `campfires`, `signs`, `gatheringNodes`,
   `crackedBoulders`, `riftGates`, `pillarGates`, `boss`).
5. **Register the map** in `apps/amo/src/data/maps/index.js`.
6. **Wire portals** bidirectionally to neighboring maps, per the spec's
   Geography & Connectivity section and the Campaign Bible's "Campaign
   Progression" order.
7. **Add/align quest data** in `apps/amo/src/data/quests.js`: new entries
   for this location's main/side quests (from the spec's Quests section),
   using real canon target ids (e.g. `malphas`, not a generic
   `void_general`) — per the Campaign Bible's own note that generic
   placeholder targets should be renamed to canon entities.
8. **Add any new reward items** referenced by new quests to
   `apps/amo/src/data/items.js`, reusing an existing `icon` key where
   thematically reasonable rather than requiring new icon art (icons are
   a separate, tiny asset concern from the tileset/decoration sprite work
   sub-project 1 covers).
9. **Manually verify** via `npm run dev` — walk the map, confirm no
   console errors, confirm portals/quests trigger correctly.

### 3. Proof application: Summit of Despair (built now, with placeholders)

Applies the procedure above to `data/lore/campaigns/eldorias_prophecy/summit_of_despair.md`
today, standing in for what isn't real yet:

- **`decorations`/`tileset` refs:** use clearly-marked placeholder sheet
  names (`sheet: "PLACEHOLDER/lpc/trunk"`, `name: "PLACEHOLDER"`) instead
  of real catalogue lookups — proves the data *shape* is correct without
  requiring sub-project 1 to have been run against real sheets yet.
- **Portals:** point at `east_road` and `sylvan_sanctuary` map ids that
  don't exist yet (commented as such) — proves the wiring mechanism
  without requiring those maps to be built.
- **Quest data:** genuinely real, not a placeholder — `quests.js` gains
  real entries for "Whisperer of Doubt" (main) and its three side quests,
  referencing the real boss id `malphas` instead of `void_general`. This
  part of the procedure has no blocked dependency (quest data only
  references id strings, not sprites or built maps), so it's built for
  real here, not stubbed.
- **New reward items:** `legion_lore_fragment`, `soul_gem_mana`,
  `aether_shard` added to `items.js`, reusing existing icons
  (`itm_scroll`, `itm_ring_02`, `itm_glowing_dust` respectively) rather
  than requiring new art.

## Testing

- `asciiToTiles()`: unit-testable now — valid conversion, ragged-row
  rejection, unrecognized-character rejection, custom legend support.
- The assembly procedure doc: no code, self-reviewed for completeness the
  same way sub-project 3's process doc was (every step produces a part of
  the final map file; nothing referenced that doesn't exist in an earlier
  sub-project's spec).
- The Summit of Despair proof: manually verified via `npm run dev` — the
  map loads without console errors, the `tiles` grid (built via the ASCII
  tool) renders and blocks movement correctly, decoration placeholders
  don't crash the renderer (they'll render as broken/missing textures
  until real sprites replace them — that's expected and documented, not a
  bug), and the new quests appear correctly in the quest log.

## Open items for later sub-projects (explicitly not decided here)

- Running the assembly procedure for the other 11 locations, once their
  specs exist.
- Building East Road and Sylvan Sanctuary.
- Swapping Summit of Despair's placeholder sprite refs for real ones once
  sub-project 1 has been run against `lpc/trunk`, `lpc/treetop`, and
  whatever terrain/decoration sheets this map needs.
