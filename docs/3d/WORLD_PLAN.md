# The world plan — the Scarlands, Nythoria, starts and levels (decided with the user, 2026-11-22)

Builds on [NYTHORIA_PLAN.md](NYTHORIA_PLAN.md) (N-1 twin geography, N-2 old Ravenspire on the twin of the Citadel's
cliff, N-4 the eclipse sky, N-5 twin sites, N-6 maps show 501 AGD) and the lore DB (scarif). Any new *name* still goes
through the canon check before it is presented as lore.

## The Scarlands trio (Eldoria) — lore (DB)
- **The Great Rift** (2200, 2172): the violent planar scar Vorgos tore at 0 GD; unstable; shadow creatures leak through
  into Eldoria. Seraphina led the survivors across it from Nythoria. Also "the Underworld's Gate" (Kael, ~300 AGD).
- **New Ravenspire** (1925, 1292): the Shadow Legion's fortified capital, founded and ruled by Seraphina after the
  Great Darkness. ~1.4 km from the Gate, ~0.9 km from the Rift.
- **The Obsidian Gate** (3300, 1568): Seraphina's controlled frequency bridge to Nythoria's surface, made by
  reverse-engineering the Rift. The three form a triangle: where they came through, the capital, the gate.

## Decisions
| Topic | Decision |
|---|---|
| The Gate | Takes you to Nythoria — time to create Nythoria's world. **Same spot, other world**: a fade, you stand at the Gate's twin in Nythoria; step back to return. |
| New Ravenspire's look | **A dark gothic capital**: black stone walls, tall spires, violet banners, braziers. |
| New Ravenspire's stance | **Friendly for now** (every place must be visitable): a town's services (markets, inn, bank, crafting), Shadow Legion quests and a bounty board, trainers, Legion guards at the Gate who let travellers through. |
| Old Ravenspire (Nythoria) | **The broken silhouette**: the picture's skyline broken — snapped towers, breached walls, halls open to the eclipse, umbral vines; a haunted landmark to explore. |
| Nythoria's look | **The shadow twin**: Eldoria's landforms, everything living umbral — black-barked trees with violet and silver leaves, pale grey grass, glowing fungi. |
| Nythoria's water and light | **Black mirrors and glowing life**: still black mirror water reflecting the silver corona; glowing violet and silver fungi and flowers in the darker hours. |
| Nythoria's size | **The full twin (11.2 km, same relief), built in steps**: all exists from the start; the Gate's region and old Ravenspire detailed first. |
| Twins of places | **Not necessarily**: landforms can be on both planes (a forest in both), a citadel on the best spot, a port probably in the same spot; cities and villages may stand elsewhere. Case by case. |
| Who lives in Nythoria (501 AGD) | **Those who stayed**: Nythorians who never crossed, in free towns under the eclipse, wary of the Shadow Legion and Malakar's agents. |
| Nythoria's creatures | All four: **shadow beasts** (umbral twins of Eldoria's animals), **the Legion of Souls** (wraiths, soul-soldiers), **Void horrors** (worst near the Rift's twin and the Obsidian Citadel), **Underworld spawn** (round the Black Well). |
| Start world | **A free choice** at creation, each race × start-world combination a different experience: an Eldorian in Nythoria is rarer and harder (and the reverse). |
| Outsider start | All four: **distrust** (higher prices, fewer quest-givers until reputation), **the world itself** (Eldorians heal slower under the eclipse; Nythorians find Eldoria's sun harsh), **rarer kin** (no racial vendors, fewer allies, a lonely storyline), **unique rewards** (a title, a rare skill, unique chapters). |
| Starter zones | **Nythoria: the Shadow-Vale** (twin of the Crossroads plain) with **a free Nythorian town** (name to be chosen and canon-checked). **Eldoria: the Emerald Fields' village, grown** into a starter hub (inn, trainers, first quests; the Guardians of the Wild in the woods nearby). **Eldrin's Tower** is Eldrin's own start. |
| Eldrin | A story path (the hero, started at the Tower) **and** a famous figure in the MMO — depends on the MMO's era (he might be sealed in his Tower). |
| The MMO's era | **Decided later**; the world is built for 501 AGD. |
| Races | Lifespan changes nothing in play (for now). **Age chosen at creation affects base stats.** Playable werewolves later. |
| Levels | **1 to 50, five bands of 10**. |
| Bands (approved draft) | **1–10** starters (the Emerald Fields, the Shadow-Vale, Eldrin's glade). **11–20** Eldoria's heartlands, the lake, the coast; Nythoria's twins of them. **21–30** the western woods (Whisper-Wood, Duskmeet), Iron Hollow, the isles; Nythoria's forests. **31–40** the Scarlands, the Great Rift's edges, beyond the Divide; Nythoria's harsher lands. **41–50** the Obsidian Citadel, the Rift's depths, the Inferno, the Underworld. Quests follow the bands. |
| Auroria | Its map later, not yet. |

## Status (2026-11-22, releases 0.45.0–0.45.1)
- [x] 1. The Scarlands: New Ravenspire (region map, tools/gen_new_ravenspire.py), the Great Rift (chasm + glow + rift_scar biome), the Obsidian Gate (portal station both ways).
- [x] 2. Nythoria (content/world/nythoria.js): the twin relief, eclipse sky, umbral biomes (biome_maps/nythoria.json), the Gate's twin, the Shadow-Vale's town (the Crossroads' houses in umbral colours, Nythorian people), place markers.
- [x] 3. Old Ravenspire's ruins (procedural, in nythoria.js).
- [x] 4. The Emerald Fields' village (tools/gen_fields_village.py), unnamed.
- [x] 5. Level bands and quests; the start-world choice at character creation (a new adventurer starting in the Fields or the Shadow-Vale). (2026-11-22 bands, start choice, starter + band 2–3 quests; 2026-11-25: villagers really offer them, band 4–5 quests, creatures for the Inferno and the Ruins, the Black Lake's Underworld spawn, the Outlander effects — game/outsider.js)
- [ ] 6. The map bake (user's go). Nythoria's map too.

## Build order
1. **The Scarlands**: the Great Rift, New Ravenspire (friendly), the Obsidian Gate; the wounded land between (ash heath,
   dead trees, shadow creatures thicker near the Rift).
2. **Through the Gate**: Nythoria's twin land (its sky, plants, water), the Gate's twin, the Shadow-Vale's free town.
3. **Old Ravenspire's ruins.**
4. **The Emerald Fields starter.**
5. The level bands (creatures by band) and quests.
6. The map bake — only once the user says the land is finished.

## Still to decide
- The Shadow-Vale town's name (and the isles', the hamlet's, the ruin's) — canon check.
- The MMO's era (Eldrin free or sealed).
- Where Nythoria's cities and villages stand (they need not twin Eldoria's).
- Balance details: age's effect on stats, outsider penalties and rewards in numbers.
