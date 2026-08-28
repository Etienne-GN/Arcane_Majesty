# Map Spec: Thaloria (city) & East Road

## Meta
- **DB Location node:** Thaloria (city) — exists in the DB under the Thaloria region (origin: album), per CLAUDE.md's planar hierarchy. **East Road does not exist as a DB node** — it's a new game-only location (see DB Sync Log).
- **Campaign Bible entry:** Song 3 — Odyssey's Dawn (departure), and Song 11 — The Weight of Eternity (return leg) (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria (region) > Thaloria (city); East Road is the wilderness corridor east of the city, within the same region.
- **Act / progression position:** Act I departure (Song 3, first map after the tutorial) and Act III return leg (Song 11, the road home — narrative beat only, Legion withdrawing).

## Narrative Anchor
**Song 3:** Eldrin locks his tower and steps into the world of 500 AGD —
rebuilding, ignorant of the danger. Thaloria city is the hub (forge, shop,
inn); East Road is the wilderness corridor east of it, where Oren joins
him and the first Legion rumor surfaces (agents asking about "the
Anchor"). Main quest "Odyssey's Dawn"; side "Trader's Rumor", "The
Scholar's Saddlebags". Unlocks: Spell-Blade, first Rift-Gate node
(Tier-2 travel tease), Mana-Shield aug.

**Song 11 (return leg only):** After the Heartstone is secured, Eldrin's
return to Thaloria passes back along this same road — residual Legion
forces withdrawing, no real threat. This is a narrative beat, not new
map-building: reuse the Song 3 geography rather than building a second
East Road.

Canon anchors: Eldrin's Tower, Thaloria, event *The Race for the Anchor*.
`LOCATED_AT Eldrin's Tower` (DB, Song 3's own anchor — Thaloria city
itself is the pre-existing region-level node).

## Geography & Connectivity
- **From Eldrin's Tower:** immediate — the tower sits just outside
  Thaloria city (see the Eldrin's Tower spec). No separate connector map.
- **Thaloria city map size:** a compact hub — forge, shop, inn, city gate —
  roughly 30x30 tiles. This is a settlement, not a dungeon; density of
  buildings matters more than raw size.
- **East Road map size:** ~50x40 tiles, an open wilderness corridor (the
  existing `prologue_forest`-style asset direction the Bible names
  directly) with enough room for the low-density Shadow-Touched spawns and
  the Trader's Rumor/Scholar's Saddlebags side content without feeling like
  a single-path corridor.
- **To Summit of Despair:** per the Summit of Despair spec, "roughly a
  day's climb" begins at East Road's far end — East Road is the direct
  predecessor map.
- **Terrain description:** Thaloria city is a modest rebuilding-era
  settlement — practical, a little worn, not grand (this is 500 AGD, deep
  in the Silent Century, not a golden-age capital). East Road is temperate
  wilderness in early winter — the world "does not know it is in danger,"
  per the Bible; the danger is only visible to Eldrin and the reader.

## Points of Interest
- **The City Gate** (Bible-named, detailed here): the Song 3 departure
  set-piece — "stepping past the city gate into the winter road, the
  Compass needle fixed east." A scripted departure moment, not a combat
  location.
- **The Inn** (Bible-named): where the trader NPC shares the "Trader's
  Rumor" — the Legion's line of questions eastward. Thaloria city's social
  hub.
- **The First Rift-Gate Node** (Bible-named): a Tier-2 travel tease —
  discovered but not yet usable at full capacity; seeds the post-game
  Rift-Gate network promised in Song 12.
- **The Corrupted Sentinel** (new, minor): an optional early miniboss
  along East Road — the Bible notes this as "early optional miniboss:
  corrupted sentinel," no name given. Framed here as a Shadow-Touched
  guardian statue, low-stakes and skippable, giving early players a taste
  of a boss-shaped fight before Malphas.

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Void-Stalker (wolf) | 4 (East Road, low density) | Pack hunters; blink behind the player on magic hit (Sensitivity 1) — per `bestiary.md`'s Whispering Woods/Prologue biome, which the Bible directly assigns to this road |
| Blight-Ent | 2 (East Road) | Ancient trees fused with Nythorian rot; slow, heavy smash attacks; release Mana-Dampening Spores when hit (Sensitivity 0) |
| Root-Wraith | 3 (East Road) | Small, fast vine-creatures; entangle the player, leaving them vulnerable to Aether-Leeches (Sensitivity 1) |
| Corrupted Sentinel (miniboss, optional) | 1 | New content — a Shadow-Touched guardian statue; low-stakes, skippable, a boss-shaped warm-up before Malphas |

None of these appear in Thaloria city itself — the settlement is safe;
all combat content is East Road only.

## Spawns — Wildlife / Gathering
| Type | Count | Time | Notes |
|---|---|---|---|
| Wood (gathering node) | 3 nodes | Always | Standard East Road timber, matching the engine's existing `wood`/Iron Axe gathering pattern |
| Mineral Ore (gathering node) | 2 nodes | Always | Exposed rock along the road's rougher stretches |

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| Song 3 starting unlock | Spell-Blade (sword, combat skill) | Tier I — Novice/Iron |
| Song 3 starting unlock | Mana-Shield augment | Tier I — Novice/Iron |
| Corrupted Sentinel (optional miniboss) | A single Tier I-II item (early gear taste) | Tier I-II — Novice/Adept |
| Thaloria city shop | Basic reagents, Tier I gear, food | Tier I — matches `economy_and_inventory.md`'s "Village Markets" tier |

Everything here stays Tier I-II per `equipment_tiers.md` — this is the
campaign's opening act; Runic (Tier III) and Relic (Tier IV) gear stays
hidden in later, more dangerous locations per that document's own rule.

## Quests
- **Main:** "Odyssey's Dawn" — departure and first combat. (From the
  Bible — pointer, not full re-write.)
- **Side:** "Trader's Rumor" (Bible-named) — the inn trader's warning about
  the Legion's questions eastward.
- **Side:** "The Scholar's Saddlebags" (Bible-named) — recovering or
  organizing Eldrin's travel gear; flavor/light side content establishing
  the "scholar, not soldier" framing before real danger starts.

## NPCs
- **Oren** — joins the road here as Eldrin's companion (false companion;
  his betrayal is Song 6, not yet happened). Present throughout East Road
  and the rest of Act II.
- **Trader (inn)** — unnamed in the Bible; shares the Legion rumor.

## DB Sync Log (G-items)
| # | Gap | Status |
|---|---|---|
| G1 | New location "East Road" (wilderness corridor between Thaloria city and Summit of Despair) not yet in DB | pending |
| G2 | New NPC "Corrupted Sentinel" (optional East Road miniboss) — game-only content, not book/album canon | pending |
