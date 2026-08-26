# Lore-Driven Map Spec Process Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the repeatable process document (with embedded template) for turning one Campaign Bible entry into a buildable map spec, and one fully worked example (Summit of Despair) proving it produces genuinely useful output.

**Architecture:** This is a documentation deliverable, not code — there are no functions to unit test. Each task's "test" is a concrete self-review checklist verifying the content is complete, internally consistent, and (for the worked example) faithful to the Campaign Bible/bestiary/DB it draws from. Two files: the process doc (method + template, reusable for any future location) and the worked example (one location, fully filled in, no placeholders).

**Tech Stack:** Markdown only.

**Spec:** `docs/superpowers/specs/2026-08-26-lore-driven-map-spec-process-design.md`

## Global Constraints

- New process doc lives at `data/lore/campaigns/map_spec_process.md`, matching the location/style of the existing `data/lore/campaigns/Eldorias_Prophecy_campaign.md` and the precedent of `data/lore/xmls/album_production_process.md`.
- The worked example lives at `data/lore/campaigns/eldorias_prophecy/summit_of_despair.md` (new subdirectory).
- The worked example must not contradict the Campaign Bible's existing Song 4 entry or `bestiary.md`'s Summit of Despair biome roster — it extends them, never overrides them.
- DB Sync Log entries only cover node types the DB schema actually has (`Location`, `Character`, `Event`, `Artifact`, etc., per CLAUDE.md) — generic game-mechanical resources (Glint, Aether-Shards) are not DB nodes and don't get logged.
- Malphas retreats alive in this encounter (per the Bible) — the worked example must not invent a boss-kill loot drop, since he isn't killed here.
- Day/night content is included but every such row is flagged `(PENDING: no day/night system yet)`.

---

### Task 1: Map spec process document (method + template)

**Files:**
- Create: `data/lore/campaigns/map_spec_process.md`

**Interfaces:**
- Produces: the process document referenced by Task 2 (the worked example is built by following its 9 steps and filling its template).

- [ ] **Step 1: Write the process document**

Create `data/lore/campaigns/map_spec_process.md`:

````markdown
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
````

- [ ] **Step 2: Self-review the document**

Read the finished file back and confirm:
- No `TBD`/`TODO` outside the template's intentional `<placeholder>` fill-in
  slots (those are the template's whole point — a location-specific spec
  built from it, like Task 2's, must have zero of them).
- The 9 process steps and the template's section headings match exactly
  (every template section is produced by at least one process step).
- File paths referenced (`Player.js`, `TILE_SIZE`, `bestiary.md`,
  `economy_and_inventory.md`, `equipment_tiers.md`,
  `graph_migration_procedure.md`) are real paths in this repo.

Fix anything that doesn't hold up before moving on.

- [ ] **Step 3: Commit**

```bash
git add data/lore/campaigns/map_spec_process.md
git commit -m "docs(maps): lore-driven map spec process + template

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Worked example — Summit of Despair

**Files:**
- Create: `data/lore/campaigns/eldorias_prophecy/summit_of_despair.md`

**Interfaces:**
- Consumes: the template from Task 1 (every section below fills a slot from that template — file created after Task 1 so drift can be checked directly against it).

- [ ] **Step 1: Write the worked example**

Create `data/lore/campaigns/eldorias_prophecy/summit_of_despair.md`:

```markdown
# Map Spec: Summit of Despair

## Meta
- **DB Location node:** Summit of Despair (origin: album)
- **Campaign Bible entry:** Song 4 — Summit of Despair (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria (per CLAUDE.md's planar hierarchy — Summit of Despair is one of Thaloria's locations)
- **Act / progression position:** Act II, 3rd map in the linear campaign path (Thaloria hub → East Road → **Summit of Despair** → Sylvan Sanctuary → ...)

## Narrative Anchor
Eldrin (with Oren still traveling as his companion — the betrayal doesn't
happen until the Fire Gate, Song 6) climbs a treacherous mountain pass east
of Thaloria. The Aether runs thin here. Partway up, they find the frozen
camp of fourteen dead — the work of Malphas, the Whisperer of Doubt, one of
the Legion's three Void Generals. Malphas feeds on doubt: illusions of
allies and past failures crowd the whiteout. Eldrin must use Aether Sight
(gained here as a formal mastery) to find the real General among the
illusions and break the anchor-thread. Malphas retreats — alive, not
killed — vowing to find Eldrin "where the road is loneliest." Main quest:
"Whisperer of Doubt." Side quest already named by the Bible: "The Frozen
Camp" (investigate the fourteen, recover a Legion lore fragment). Canon
anchors: Summit of Despair, Malphas, event *Malphas Forced to Retreat*
(`LOCATED_AT Summit of Despair` in the DB).

## Geography & Connectivity
- **From East Road:** roughly a day's climb — steep switchbacks, fully
  exposed to wind above the treeline — map sized ~45x65 tiles (tall and
  narrow, matching a climbing pass rather than an open field) to give room
  for switchback paths, the frozen-camp set-piece, and two side pockets
  (Widow's Overlook, the Rime Hollow) without making the climb feel like a
  straight corridor.
- **To Sylvan Sanctuary:** a few hours past the summit — the weather breaks
  suddenly at the col, matching the Bible's "over the pass to an impossible
  green" — a short connecting stretch, ~15x15 tiles, is enough; no need for
  a second full map between them.
- **Terrain description:** A narrow trail switchbacking up bare rock and
  wind-scoured snow, blizzard visibility dropping to a few tiles in open
  stretches. The frozen camp sits at the trail's midpoint — tents
  collapsed under snow, the fourteen dead half-buried. Higher up, the wind
  carves the rock into overhangs; near the top, the trail forks briefly
  before the true summit and the sudden break into green on the far side.

## Points of Interest
- **The Frozen Camp** (Bible-named, detailed here): the campsite of
  fourteen Legion-less dead, found roughly a third of the way up the climb.
  Half-buried tents, a cold firepit, personal effects scattered in the
  snow. A dead scout's journal (readable) is the "Frozen Camp" side quest's
  actual object — its last entries describe "the whispering thing" arriving
  before the cold got them, which is what points the story at Malphas
  before the boss encounter.
- **Widow's Overlook** (new): a wind-scoured rock outcrop off the main
  trail, reachable by a short detour. A collapsed shrine to a forgotten
  Aurorian sentinel stands here — its brazier long cold. Relighting it
  (using flint/wood the player can gather en route) reveals a small hidden
  cache the shrine was built to guard. A quiet, still moment on an
  otherwise relentless climb.
- **The Rime Hollow** (new): a shallow ice cave just off the trail near the
  summit, its entrance easy to miss in the whiteout. Inside, the cold has
  preserved a short rune-puzzle door (consistent with the Runic tier's
  "engraved with ancient runes" theme from `equipment_tiers.md`) sealing a
  small chamber — nested Frost-Shades guard it, drawn to the residual
  Aether the runes still carry.

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Gloom-Beak | 4 | Dive-bombs high-mana targets, causes blindness on hit (per `bestiary.md`, Sensitivity 2 — aggros from farther away the higher the player's Mana Pool/Scent) |
| Frost-Shade | 3 (+2 clustered inside the Rime Hollow guarding its rune door) | Invisible in snowstorms/whiteout stretches; drains the player's "Internal Heat" (Mana and HP) on contact (Sensitivity 1) |
| Crag-Fiend | 2 | Rock-skinned trolls, violet crystals on their backs act as "Resonance Rods" drawing lightning to the player's position (Sensitivity 2) |

## Spawns — Wildlife / Gathering
| Type | Count | Time | Notes |
|---|---|---|---|
| Snow Hare | 3 | Day | Skittish, flees on approach; drops Fur |
| Frost-Shade (extra roaming pack) | +2 beyond the base 3 above | Night (PENDING: no day/night system yet) | The whiteout worsens after dark; more Frost-Shades emerge from it |
| Frostbloom Herb (gathering node) | 4 nodes | Always | Cold-climate alchemy reagent — cross-check exact use against `alchemy_and_healing.md` when that system is wired to gathering nodes |
| Exposed Iron Ore vein (gathering node, requires Iron Axe/Pickaxe per `economy_and_inventory.md`) | 2 nodes | Always | Wind-scoured rock at Widow's Overlook |

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| Frozen Camp — scout's journal (quest reward, "The Frozen Camp") | Legion lore fragment + 40 Glint | N/A (lore + currency, not gear) |
| Widow's Overlook shrine cache (relit brazier reward) | A Soul-Gem accessory (+Mana Pool) | Tier II — Adept/Steel |
| The Rime Hollow rune door (puzzle reward) | 2x Aether-Shard (Foundry-of-the-Ancients upgrade material, per `equipment_tiers.md` §5) | Tier II→III bridge material, not a finished item |
| Malphas encounter | *(none — he retreats alive here; no boss-kill drop. His actual reward is narrative/mechanical: Aether Sight mastery + the "Refusal of Fear" Insight, both already covered under Items/unlocks in the Bible.)* | — |

## Quests
- **Main:** "Whisperer of Doubt" — reach the summit, survive Malphas's
  illusions using Aether Sight, force his retreat. (From the Bible —
  pointer, not full re-write.)
- **Side:** "The Frozen Camp" (Bible-named) — read the scout's journal at
  the frozen camp, recover the Legion lore fragment.
- **Side (new):** "The Widow's Watch" — find flint and wood along the
  trail, relight the shrine's brazier at Widow's Overlook, claim the
  Soul-Gem it was guarding.
- **Side (new):** "Echoes in the Rime" — find the Rime Hollow, clear the
  Frost-Shades guarding its entrance, solve the rune-puzzle door, claim the
  Aether-Shards inside.

## NPCs
None beyond the Bible's mainline cast. Oren is present as Eldrin's
traveling companion throughout this climb (established in Song 3, betrayed
in Song 6) but isn't a location-specific NPC here — no new dialogue is
invented for him in this spec.

## DB Sync Log (G-items)
| # | Gap | Status |
|---|---|---|
| G1 | New sub-location "Widow's Overlook" (shrine + cache within Summit of Despair) not yet in DB | pending |
| G2 | New sub-location "The Rime Hollow" (ice cave/rune-puzzle chamber within Summit of Despair) not yet in DB | pending |
```

- [ ] **Step 2: Self-review against the Bible and bestiary**

Re-read `data/lore/campaigns/Eldorias_Prophecy_campaign.md`'s Song 4 entry
(lines 121-153) and `data/lore/bestiary.md`'s "Biome: The Summit of Despair"
section side by side with the new file. Confirm:
- Every creature named (Gloom-Beak, Frost-Shade, Crag-Fiend) and its
  behavior note matches the bestiary's wording — no invented monsters, no
  contradicted behaviors.
- Malphas is not given a kill/loot outcome — the Bible is explicit that he
  "retreats ALIVE."
- Oren's presence/absence is consistent with the campaign timeline (still
  a companion here; betrayal is Song 6, not yet happened).
- The two new sub-locations and two new side quests are logged in the DB
  Sync Log; nothing else invented (Snow Hare, Frostbloom Herb, Iron Ore,
  Glint, Aether-Shards, Soul-Gem) needs a DB node, since none of those are
  DB-modeled node types per CLAUDE.md's schema — they're game-mechanical
  items/resources, not canon entities.

Fix anything that doesn't hold up before moving on.

- [ ] **Step 3: Commit**

```bash
git add data/lore/campaigns/eldorias_prophecy/summit_of_despair.md
git commit -m "docs(maps): Summit of Despair map spec (worked example)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Plan Self-Review Notes

- **Spec coverage:** Process (9 steps) + Template → Task 1, copied verbatim
  from the design spec into the real repo artifact. Worked example → Task
  2, built by actually following Task 1's process against real source
  material (Campaign Bible Song 4, `bestiary.md`'s Summit of Despair biome,
  `equipment_tiers.md`/`economy_and_inventory.md` for loot tier). Non-goals
  (running the process on the other 11 locations, writing real `.js` map
  files, executing DB writes, a day/night engine) are correctly left
  undone and are called out explicitly in both files.
- **Placeholder scan:** Task 1's file legitimately contains `<placeholder>`
  slots — that's the template's purpose, not a plan-quality violation, and
  Task 1's self-review step explicitly checks for this distinction. Task
  2's file (the actual worked example) has zero placeholders — every
  section is filled with real, sourced content.
- **Consistency check:** Task 2's content was cross-verified against the
  actual Bible entry and bestiary text during writing (not invented
  independently) — creature names/behaviors match verbatim, Malphas's
  "retreats alive" outcome is preserved, and the DB Sync Log only logs the
  two sub-locations (the DB-modeled node type), correctly omitting
  game-mechanical items that aren't DB nodes.
