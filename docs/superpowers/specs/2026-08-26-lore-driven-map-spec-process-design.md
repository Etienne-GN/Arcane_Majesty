# Lore-Driven Map Spec Process — Design Spec

**Status:** Approved by user, ready for implementation planning
**Sub-project 3 of 4** in the "structured map-authoring pipeline" initiative (see `docs/superpowers/specs/2026-08-26-sprite-catalogue-system-design.md` for the full initiative context and sub-projects 1/2/4).

## Context

Sub-projects 1 and 2 give the engine a way to draw named sprites on a map.
Neither one says what should actually be *on* any given map. For Eldoria's
Prophecy, that narrative-to-gameplay mapping already exists at a coarse
level: `data/lore/campaigns/Eldorias_Prophecy_campaign.md` (the "Campaign
Bible", dated 2026-08-03) breaks all 12 songs into per-level entries — map/
area, enemies, boss, NPCs, quests, items, canon anchors — and is already
reconciled with the Neo4j DB (its own "DB Sync Log" table shows locations/
characters/events added with `origin` tracking).

What the Bible does NOT have is map-building granularity. A typical entry
reads:

> **Map/area:** Summit of Despair (new map — blizzard high pass)

That's a label, not a spec. There's no geography/scale, no travel-time to
neighboring maps, no concrete spawn table (species, counts, day/night
rules), no treasure/loot, no dungeon/village layout, no side-quest
structure. This spec covers the process that produces that missing layer —
turning one Bible entry into something sub-project 4 can actually build a
map from. It does NOT cover running that process across all 12 Eldoria's
Prophecy locations or writing the real `.js` map files — that's
sub-project 4.

## Goals

- A documented, repeatable process: given one Campaign Bible entry plus the
  existing lore/systems docs and the Neo4j DB, produce a full map spec.
- A fixed template so every location's spec has the same shape (geography,
  connectivity, POIs, spawns, treasure, quests, NPCs, DB sync log) —
  reviewable and comparable across locations.
- New content invented during speccing (a dungeon, a village, a side-quest
  NPC) is tracked toward eventually landing in the DB, the same way the
  Campaign Bible already tracks its own gaps — nothing invented here is
  silently lost from canon.
- One fully worked example (Summit of Despair) proving the template/process
  produces genuinely useful output, reviewable before the process is applied
  to the other 11 locations.

## Non-goals

- Running this process across all 12 Eldoria's Prophecy locations (sub-
  project 4).
- Writing the actual `.js` map data files, or any engine-schema code
  (`decorations`/`spawns`/`tileset` entries) — specs stay prose/tables only,
  matching the Campaign Bible's own style; translation into real map code
  is sub-project 4's job, once real catalogued sprites exist to reference.
- Actually executing DB writes for logged gaps — the DB Sync Log records
  what's needed; performing the Neo4j migration is a separate activity
  (following the existing `graph_migration_procedure.md`), not part of this
  process.
- Building or specifying a day/night engine mechanic — day/night content is
  written into specs now (per the user's explicit choice) but stays inert
  until that system exists.

## Process

Given one Campaign Bible entry (one song/level), produce
`data/lore/campaigns/eldorias_prophecy/<location_slug>.md`:

1. **Pull the narrative anchor.** Copy the Bible entry's "Map/area",
   "Enemies", "Boss", "NPCs", "Quests (main)", "Items/unlocks", and "Canon
   anchors" lines as the spec's starting point. Don't re-derive what the
   Bible already decided — extend it.
2. **Check the DB for this Location's existing canon.** Confirm the
   `Location` node's `description`, `origin`, and relationships
   (`LOCATED_IN`, any `TAKES_PLACE_AT`/`OCCURRED_IN` events already
   attached). If the Bible's own DB Sync Log shows this location was
   already added (it does, for all of EP's new locations — see G2 in the
   Bible), read its current DB attributes rather than re-inventing them.
3. **Check `bestiary.md` for the relevant biome's creature roster.** The
   Bible's "Enemies" line usually already names the biome (e.g. "Summit of
   Despair (Level 2/4)" biome section) — pull exact creature names/behavior
   notes from there for the spawn table, don't invent new creatures unless
   the location has none listed.
4. **Check `economy_and_inventory.md`/`equipment_tiers.md` for loot tier.**
   Match treasure/loot density and rarity to where this location falls in
   the campaign's progression (early/mid/late Act, per the Bible's
   "Campaign Progression" section).
5. **Draft geography & connectivity.** State travel time to/from neighboring
   locations in narrative terms (matching the Bible's own pacing language),
   then size the map's approximate tile dimensions to roughly match that
   pacing at the player's actual base walk speed: `baseSpeed = 100 +
   agility*4` px/sec (`Player.js`) ÷ `TILE_SIZE = 32` px/tile ≈ 3.1
   tiles/sec at baseline agility (0) — scales up with the player's agility
   stat. This is a rough sizing guide, not a strict formula: the Bible's
   pacing language is the primary source of truth.
6. **Draft new content.** Points of interest, side quests, minor NPCs not
   already in the Bible — new, but consistent with the location's
   established tone/danger level. This is where "LOT of content" actually
   gets added; the Bible only ever specified the mainline critical path.
7. **Fill in spawn/treasure tables**, flagging any day/night split as
   `(PENDING: no day/night system yet)`.
8. **Log new entities in the DB Sync Log.** Anything introduced in step 6
   that doesn't already exist in the DB (a new village, a new NPC, a new
   side-quest-only location) gets a `G`-numbered row, mirroring the Bible's
   own table exactly (`# | Gap | Status`).
9. **Present the finished spec for review** before moving to the next
   location.

## Template

```markdown
# Map Spec: <Location Name>

## Meta
- **DB Location node:** <name as it exists in Neo4j> (origin: <album|game>)
- **Campaign Bible entry:** Song <N> — <Song Title> (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** <per CLAUDE.md's planar hierarchy, e.g. Eldoria > Thaloria>
- **Act / progression position:** <Act I/II/III, position in the linear campaign path>

## Narrative Anchor
<Short pull from the Bible entry — map/area, enemies, boss, NPCs, quests,
items, canon anchors, copied or lightly paraphrased. This is NOT the place
to re-derive plot; it's a pointer back to the Bible.>

## Geography & Connectivity
- **From <neighboring location>:** <narrative travel time, e.g. "half a
  day's climb, steep and exposed"> — map sized ~<W>x<H> tiles to match at
  the player's base walk speed (~3.1 tiles/sec at baseline agility, per
  `Player.js`'s `baseSpeed = 100 + agility*4` ÷ `TILE_SIZE = 32`).
- **To <neighboring location>:** <narrative travel time> — ~<W>x<H> tiles.
- **Terrain description:** <a paragraph on what the space physically looks/
  feels like, consistent with the Bible's atmosphere notes>.

## Points of Interest
<New content beyond the Bible's mainline: dungeons, villages, landmarks,
hidden areas. Each gets a short paragraph: what it is, why it's there,
what the player finds.>

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| <from bestiary.md> | <n> | <behavior note from bestiary.md> |

## Spawns — Wildlife / Gathering
| Type | Count | Time | Notes |
|---|---|---|---|
| <creature/herb/node> | <n> | Day / Night (PENDING: no day/night system yet) / Always | <note> |

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| <chest/node/drop> | <item(s)> | <per equipment_tiers.md/economy_and_inventory.md> |

## Quests
- **Main:** <from the Bible — pointer, not full re-write>
- **Side:** <new side quests invented for this location, one line each: hook + reward>

## NPCs
<Any NPCs beyond the Bible's mainline cast — name, role, one-line personality/purpose.>

## DB Sync Log (G-items)
| # | Gap | Status |
|---|---|---|
| G1 | <new entity not yet in DB> | pending |
```

## Worked example (validation)

`data/lore/campaigns/eldorias_prophecy/summit_of_despair.md` — a complete,
filled-in spec for Summit of Despair (Song 4 / Level 2-4), built by
actually running the process above: pulling the Bible's existing entry,
cross-referencing `bestiary.md`'s "Biome: The Summit of Despair" roster
(Gloom-Beak, Frost-Shade, Crag-Fiend), and inventing new POIs/side-quests/
treasure consistent with the location's established tone (frozen, isolating,
the site of Malphas's fourteen dead). This is the artifact the user reviews
to judge whether the template/process actually produces useful output
before it's applied to the other 11 locations.

## Testing

There's no code to test — this sub-project's "test" is the worked example
itself: does the Summit of Despair spec read as genuinely useful,
buildable content, consistent with the Bible and the DB, with nothing
invented that contradicts established canon? That's a human review
judgment, not an automated check.

## Open items for later sub-projects (explicitly not decided here)

- Running this process for the other 11 Eldoria's Prophecy locations, and
  writing the real `.js` map files from the results (sub-project 4).
- Actually executing any DB Sync Log entries against Neo4j (follows
  `graph_migration_procedure.md`, done separately).
- A day/night engine mechanic to make the flagged day/night content live.
