# Lore-Driven Map Spec Process

This document defines the repeatable process for turning one Campaign
Bible entry (`data/lore/campaigns/<Campaign>_campaign.md`) into a fully
buildable map spec — the missing layer between the Bible's narrative-to-
gameplay mapping (map/area, enemies, boss, NPCs, quests, items, canon
anchors) and the actual `.js` map data files the game engine loads.

A Bible entry names *what* happens at a location. A map spec says *how big
it is, how long it takes to get there, exactly what's on it, and what's
new here that the Bible never specified.*

## When to use this

Whenever a Campaign Bible location is ready to become a real map — i.e.
the mainline narrative for that location is settled, and it's time to
design the actual playable space (geography, spawns, treasure, side
content) before writing map-building code.

## Process

Given one Campaign Bible entry (one song/level), produce
`data/lore/campaigns/<campaign_name>/<location_slug>.md`:

1. **Pull the narrative anchor.** Copy the Bible entry's "Map/area",
   "Enemies", "Boss", "NPCs", "Quests (main)", "Items/unlocks", and "Canon
   anchors" lines as the spec's starting point. Don't re-derive what the
   Bible already decided — extend it.
2. **Check the DB for this Location's existing canon.** Confirm the
   `Location` node's `description`, `origin`, and relationships
   (`LOCATED_IN`, any `TAKES_PLACE_AT`/`OCCURRED_IN` events already
   attached). If the Bible's own DB Sync Log shows this location was
   already added, read its current DB attributes rather than
   re-inventing them.
3. **Check `bestiary.md` for the relevant biome's creature roster.** The
   Bible's "Enemies" line usually already names the biome — pull exact
   creature names/behavior notes from there for the spawn table. Don't
   invent new creatures unless the location has none listed there.
4. **Check `economy_and_inventory.md`/`equipment_tiers.md` for loot
   tier.** Match treasure/loot density and rarity to where this location
   falls in the campaign's progression (early/mid/late Act, per the
   Bible's "Campaign Progression" section). Early-campaign locations stay
   mostly Tier I-II (Novice/Adept); Tier III-IV (Master/Runic, Relic)
   loot is rare and hidden, per `equipment_tiers.md`'s own rule that
   Relic items are never bought — only found in the most dangerous parts
   of a map.
5. **Draft geography & connectivity.** State travel time to/from
   neighboring locations in narrative terms (matching the Bible's own
   pacing language), then size the map's approximate tile dimensions to
   roughly match that pacing at the player's actual base walk speed:
   `baseSpeed = 100 + agility*4` px/sec (`apps/amo/src/entities/Player.js`)
   ÷ `TILE_SIZE = 32` px/tile ≈ 3.1 tiles/sec at baseline agility (0) —
   scales up with the player's agility stat. This is a rough sizing
   guide, not a strict formula: path complexity (switchbacks, dead ends,
   combat pockets) matters more than a literal distance/speed conversion,
   and the Bible's pacing language stays the primary source of truth.
6. **Draft new content.** Points of interest, side quests, minor NPCs not
   already in the Bible — new, but consistent with the location's
   established tone/danger level. This is where the bulk of new content
   gets added; the Bible only ever specified the mainline critical path.
7. **Fill in spawn/treasure tables**, flagging any day/night split as
   `(PENDING: no day/night system yet)`.
8. **Log new entities in the DB Sync Log.** Anything introduced in step 6
   that doesn't already exist in the DB (a new sub-location, a new NPC) —
   and IS a node type the DB schema actually models (`Location`,
   `Character`, `Event`, `Artifact`, etc.; NOT generic game-mechanical
   resources like currency or crafting materials, which aren't DB nodes)
   — gets a `G`-numbered row, mirroring the Campaign Bible's own table
   exactly (`# | Gap | Status`).
9. **Present the finished spec for review** before moving to the next
   location.

## Template

```markdown
# Map Spec: <Location Name>

## Meta
- **DB Location node:** <name as it exists in Neo4j> (origin: <album|game>)
- **Campaign Bible entry:** Song <N> — <Song Title> (`data/lore/campaigns/<Campaign>_campaign.md`)
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

## Non-goals

- This process does not write the actual `.js` map data files — specs
  stay prose/tables only. Translating a finished spec into real map code
  (using the sprite catalogue and decorations/tileset schema from the
  map-format-renderer-upgrade sub-project) is a separate, later activity.
- This process does not execute DB writes. The DB Sync Log records what's
  needed; performing the Neo4j migration follows
  `data/lore/xmls/graph_migration_procedure.md`, done separately.
