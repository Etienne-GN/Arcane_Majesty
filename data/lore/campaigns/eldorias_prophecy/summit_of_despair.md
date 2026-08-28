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

## Implementation note (2026-08-28)
The proof-application map built from this spec (`apps/amo/src/data/maps/summit_of_despair.js`)
is a scaled-down 18x20 grid, not this spec's full ~45x65 — and its quest
steps were reshaped to mechanics the engine actually tracks (see
`quests.js`'s inline comments): "relight the brazier" became two `gather`
steps (wood + mineral_ore, the engine's only two real gatherable
resources) rather than a bespoke interact event, and "solve the rune
door" was dropped since no puzzle/door-interact mechanic exists yet — the
Frost-Shade kill count stands alone for that side quest. This spec's
prose is left as originally designed (the *intent*); building each
location's real map is where engine-mechanic constraints get resolved,
per this process's own Non-goals.
