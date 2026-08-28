# Map Spec: Sylvan Sanctuary

## Meta
- **DB Location node:** Sylvan Sanctuary (origin: album)
- **Campaign Bible entry:** Song 5 — Sylvan Sanctuary (`data/lore/campaigns/Eldorias_Prophecy_campaign.md`)
- **Biome / region:** Eldoria > Thaloria (per CLAUDE.md's planar hierarchy — Sylvan Sanctuary is one of Thaloria's locations)
- **Act / progression position:** Act II, 4th map in the linear campaign path (East Road → Summit of Despair → **Sylvan Sanctuary** → Fire Gate → ...)

## Narrative Anchor
Lost and weary from the Summit, Eldrin (with Oren still traveling as
companion — the betrayal is Song 6) crosses the pass into an impossible
early-spring valley. The forest Elemental trials him on intent ("Why do
you seek the light of day?") rather than combat. The Hermit — a failed
former Keeper, spirit-bound to the Elemental — offers guidance, reads
Oren coldly but says nothing (the first crack in the mask of true
things). Aether Sight is granted here as a formal, permanent mastery
(shared narratively with Summit of Despair's own grant — this is where
it's actually completed). Main quest "The Elemental's Trial"; side
"The Hermit's Debt", "Seeds of the Valley". Canon anchors: Sylvan
Sanctuary, The Hermit, event *The Elemental's Trial* (`LOCATED_AT
Sylvan Sanctuary` in the DB).

**Naming note (Bible's own Conflict note):** `bestiary.md` calls this
biome "Whispering Woods" — standardize game naming to **Sylvan
Sanctuary** to match canon; do not introduce "Whispering Woods" as a
separate in-game location. Also: the DB's **The Hidden Cabin** (in The
Emerald Fields) is Kael's exile home, an entirely different place from
the Hermit's hut here — never merge or conflate the two.

## Geography & Connectivity
- **From Summit of Despair:** a few hours past the summit, weather
  breaking suddenly at the col ("over the pass to an impossible
  green") — per the Summit of Despair spec, a short ~15x15 connecting
  stretch already covers this transition; Sylvan Sanctuary itself
  begins where that stretch ends.
- **Sylvan Sanctuary map size:** ~40x40 tiles — an existing `hermit_hut`
  map already in the codebase (per the Bible's own "existing
  `hermit_hut` map + expansion" note) sized as a self-contained valley
  rather than a corridor: the Elemental's grove at the center, the
  Hermit's hut near the entrance, corrupted edges at the valley's rim.
- **To Fire Gate:** the trail down from the valley — per Song 6's
  "first landing" framing (black glass, snow-line/ash transition), this
  is a short descent, ~15x15 tiles, functioning as the connector between
  the sanctuary's green and the Fire Gate's black glass.
- **Terrain description:** A green cathedral — moss, canopy light,
  streams — utterly unlike the blizzard above or the fire below it sits
  between. The Elemental's grove sits at the valley's heart, ancient and
  still. The Hermit's hut is modest, lived-in, near a stream close to
  the entrance. At the valley's rim, the green thins and grays — Shadow-
  Touched creep is visible but has not taken the sanctuary itself.

## Points of Interest
- **The Elemental's Grove** (Bible-named, detailed here): the valley's
  heart — an ancient standing-tree formation where the Elemental waits.
  Not a combat arena; a dialogue/puzzle space where the Elemental's
  question is put to the player.
- **The Hermit's Hut** (Bible-named): a rest/refuge hub near the
  entrance — the Hermit lives here, and it functions as the sanctuary's
  safe-room (shop/rest point), distinct from and NOT the same building as
  The Hidden Cabin (Emerald Fields).
- **The Corrupted Rim** (new): the valley's edge, where the green
  thins into gray — a small pocket of Shadow-Touched creep the "Seeds of
  the Valley" side quest asks the player to heal, giving the otherwise
  peaceful sanctuary one contained pocket of light combat.
- **The Hermit's Talisman Cache** (new): a half-buried old campsite a
  short way outside the valley proper — where the Hermit's lost
  talisman ("The Hermit's Debt") is found, framing a small out-and-back
  detour rather than a straight fetch.

## Spawns — Enemies
| Creature | Count | Notes |
|---|---|---|
| Blight-Ent | 2 (Corrupted Rim only) | Ancient trees fused with Nythorian rot; slow, heavy smash attacks; releases Mana-Dampening Spores on hit (Sensitivity 0) — per `bestiary.md` |
| Root-Wraith | 3 (Corrupted Rim only) | Small, fast vine-creatures; entangle the player, leaving them vulnerable to Aether-Leeches (Sensitivity 1) |

Per the Bible: "the valley is not corrupted — the Shadow-Touched creep
at its edges only." No enemies appear near the grove or the Hermit's
hut; all combat content is confined to the Corrupted Rim.

## Spawns — Wildlife / Gathering
| Type | Count | Time | Notes |
|---|---|---|---|
| Forest Deer | 2 | Day | Peaceful ambient wildlife, non-interactive — reinforces the valley's "only peace on the road" framing |
| Herb (gathering node) | 4 nodes | Always | Springtime alchemy reagents, distinct from Summit of Despair's Frostbloom |
| Wood (gathering node) | 2 nodes | Always | Standard timber, near the Hermit's hut |

## Treasure & Loot
| Source | Contents | Tier |
|---|---|---|
| The Hermit's Debt (side quest reward) | Hermit's resonance talisman (Bible-named item) | Tier II — Adept/Steel |
| Seeds of the Valley (side quest reward) | A small Tier I-II reagent bundle | Tier I-II — Novice/Adept |
| Elemental's Trial (main quest reward) | Aether Sight (formal mastery, permanent — not equipment) | N/A — mechanic, not gear |

Kept modest per `equipment_tiers.md`'s progression rule — this is still
early Act II; nothing here reaches Tier III (Runic) or Tier IV (Relic).

## Quests
- **Main:** "The Elemental's Trial" — answer the Elemental's question
  truthfully, receive Aether Sight. (From the Bible — pointer, not full
  re-write.)
- **Side:** "The Hermit's Debt" (Bible-named) — recover the Hermit's lost
  talisman from the campsite outside the valley.
- **Side:** "Seeds of the Valley" (Bible-named) — clear the Blight-Ent/
  Root-Wraith pocket at the Corrupted Rim to heal the valley's edge.

## NPCs
- **The Hermit** — major NPC; a failed former Keeper, spirit-bound to the
  Elemental. Grants Aether Sight. Reads Oren coldly during the visit but
  says nothing outright — a quiet, deniable foreshadowing beat, not a
  confrontation.
- **The Elemental** — the valley's guardian spirit; a trial-of-intent
  boss (dialogue/puzzle, not a fight, per the Bible's Boss Design notes
  — it silently dismisses Oren rather than fighting him).
- **Oren** — present as Eldrin's companion throughout (established Song
  3, betrayed Song 6); no new dialogue invented for him here beyond the
  Bible's own beat.

## DB Sync Log (G-items)
| # | Gap | Status |
|---|---|---|
| G1 | New sub-location "The Corrupted Rim" (Shadow-Touched pocket at Sylvan Sanctuary's edge) not yet in DB | pending |
| G2 | New sub-location "The Hermit's Talisman Cache" (campsite outside the valley) not yet in DB | pending |
