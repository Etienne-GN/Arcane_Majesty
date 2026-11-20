# The open world — plan (decided with the user, 2026-11-20)

## Decisions

- **One seamless overworld per plane.** Eldoria first; Nythoria later as its umbral twin (same land — `docs/3d/NYTHORIA_PLAN.md`). Interiors, dungeons, the Underworld, the Shadow Realm and Auroria stay separate maps behind doors.
- **Scale: about 10 minutes on foot from Eldrin's Tower to the Fire Gate** — the longest stretch of *Eldoria's Prophecy*. At Eldrin's ~3.5–4 m/s that is ~2.5 km in a straight line (the trails wind longer). At the lore DB's proportions (its places span ~1350 × 970 units) the whole of Eldoria comes out **~7.5 × 5.5 km — about the size of Breath of the Wild** — so **1 DB unit ≈ 5.5 m**. Nythoria would double the land.
- **Design now, build to fit, fuse when the phone proves it.** Every new map from now on is built at its real place on the world map, at world scale, with edges that meet its neighbours — so it fuses without being rebuilt. If the phone can't carry a seamless world, the maps stay separate but already laid out on one world (cheap to fuse later; or a seamless mode on PC only).

## Blocked on the canon check (Phase 10)

The world's layout comes from the lore DB's x/y, which look inherited from the 2D world map, and they disagree with the book on one point that matters: the DB puts the **Heartstone Chamber at x=800, west of Thaloria (x=1100)**, while the book's compass points **east**, over the mountains (the game follows the book). The Fire Gate, the Inferno Labyrinth and the Ruins have no DB position. The layout is settled with the canon check before it is built.

## Stages (each a playable release)

| Stage | What | Depends on |
|---|---|---|
| **W0** | The world map of Eldoria: every place positioned (DB x/y × 5.5 m, corrected by the canon check), the regions' borders, roads, rivers, the mountain ranges, the coast; Thaloria's region drawn in detail | Phase 10 (the layout) |
| **W1 — built (2026-11-20), awaiting the phone test** | `apps/amo3d/src/engine/stream.js`, god mode → \"Open world test (W1) — a 4 km continent\" (a readout at the top left: fps, worst frame, tiles, queue, build ms). Headless (software rendering): tiles build in 0.1–3 ms (16 ms worst, a near tile with its trees), the queue stays under 60 at a 12 m/s run and empties, ~137 tiles in view, 25–30 fps on the CPU renderer. To do after the go: far-tree stand-ins (the tree line at ~380 m shows), the chart for a streamed world. Was: The streaming prototype on a test continent (no lore): 128 m tiles, terrain LOD, per-tile instanced trees and rocks, far-hill stand-ins, background tile generation, a floating origin; measured on the user's phone (frame time, memory) — **the go / no-go** | nothing |
| **W2** | Thaloria's corner seamless: the glade and the tower, Thaloria and its gates, the East Road, the Summit and the mountain, the Sanctuary, the Fire Gate (the existing maps stamped into the world terrain; creatures spawned per tile; the chart and minimap from the world; saves in world coordinates) | W0, W1 = go |
| **W3** | The rest of Thaloria's region (Iron Hollow, the Labyrinth's valley, the Ruins) and its open edges | W2 |
| **W4** | The other regions, one at a time, as their albums' stories come into the game (the Emerald Fields — *Bound by Blood*; the Scarlands — *Queen of Carnage*, *Lord of Shadows*; Whisper-Wood, the Heartlands, the Silver Coast, the Sanguine Vaults — *Crimson Covenant*) | W3 |
| **W5** | Nythoria's overworld, the umbral twin of what exists by then | W4 + Nythoria's canon decisions |

## Still missing from the lore (2026-11-20 count)

- Eldoria: ~17 of 23 places exist as small separate maps; missing the Hidden Cabin, the Sunken Temple, New Ravenspire, the Obsidian Gate, the Sanguine Vaults; almost none of the land between places.
- Nythoria: none of its 9 places (old Ravenspire, the Obsidian Citadel, the Shadow-Vale, the Black Well, the Obsidian Gate's far end, the Shadow Realm, the Underworld, its Sanctuary and Prison).
- Auroria: none of its 4 (the Astral Archives, the Celestial Gardens, the Crystal Sanctum, the Seer's Library); the Great Rift.
