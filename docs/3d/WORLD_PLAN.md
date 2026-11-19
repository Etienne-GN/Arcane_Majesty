# World & maps — build plan (started 2026-11-18)

The user asked for **more locations** (TODO.md §5). This plan is meant to be resumed on its own: an automatic
"continue" at 2:10 PM when usage resets picks up at the **first unchecked step** and keeps going in order.
Each step should be one pass: build → headless check → commit and push on `main` → tick its box here.

## Rules for every location
- **Lore first.** The Neo4j DB is the source of truth (query over HTTP — memory `reference_neo4j_http`). Every place
  below is already in the DB; match its description. Anything new and game-only (a side path, an NPC) gets `origin: "game"`
  and is listed under "DB sync owed" at the bottom — writes to the DB are left to the user.
- **Never edit `apps/amo/`** (archived). Game data lives in `packages/rules/src`, 3D content in `apps/amo3d`.
- **How to build:** wilderness is a region file `apps/amo3d/src/content/regions/<id>.json` (it becomes a map on its own,
  through `engine/region.js`; see `whisper_wood.json`). Give it: terrain, palette, mood, path, trees, rocks, gather,
  a rift-gate monolith (one per region), lore-fitting creatures from the existing bodies (`content/actors/beast.js`,
  `wolf.js`, `animals.js`), landmarks, and **links both ways** (the neighbour's side too).
- **Chart:** every new place shows on the parchment map. Regions get their paths and buildings onto the chart
  (`mapInfo.groundAt`, `buildings`, `walls` — see `content/thaloria.js`).
- **Check:** headless (`tools/headless.mjs`, phone size `HL_W=915 HL_H=412 HL_DPR=2 HL_TOUCH=1`): enter the map through
  its link, walk the path, open the map, screenshot. Note any problems in this file.
- Keep each pass lean and committed. Release a new APK (`amo3d-vX.Y.Z` tag) every few locations, and tell the user.

## Geography (from the lore)
The Silverrun flows from the northern mountains past Thaloria, through the Heartlands, and into the sea at Port Silver
(east). The Heartlands' Crossroads are where the old north–south and east–west routes meet. Lake Aethera holds the
Sunken Temple. Iron Hollow sits in the northern foothills. Whisper-Wood is the dark forest, with Duskmeet on its
northern edge; Graywatch keeps the border between the Scarlands and Whisper-Wood. The Emerald Fields (the Weeping
Stones, the Hidden Cabin) are remote wilderness. The campaign runs from the Sylvan Sanctuary down to the Fire Gate.

## Steps
- [x] **0. Settlements in region files** — `engine/region.js` learns `buildings` (house footprints with walls, roofs,
      doors, a sign), `roads` (polylines painted on the ground), and `props` (market stalls, well, lamp posts, fences,
      signposts, carts). They show on the chart and collide. Optional: a few idle townsfolk from the Forge archetypes.
- [x] **1. The Crossroads** (Heartlands) — the hub village: a worn stone inn, a weathered market square, four roads.
      A link from the East Road (a fork south), plus roads toward Lake Aethera, Port Silver and Whisper-Wood.
- [x] **2. Lake Aethera & the Sunken Temple** — a huge still lake like polished silver; the temple half-submerged in the
      shallows, carved in a forgotten script (outside first; the inside as a later dungeon).
- [x] **3. The Silverrun & Port Silver** — the river road east, then the coastal town: a grey-sand harbour, piers,
      fishing boats, a market.
- [x] **4. Iron Hollow** — a grim mining town in the northern foothills: mine mouths, slag heaps, a tavern.
- [x] **5. The Emerald Fields** — untamed grassland; the Weeping Stones (seven monoliths with weeping faces, south)
      and the Hidden Cabin (Kael and Anya's exile home).
- [x] **6. Duskmeet** — a frontier hamlet on Whisper-Wood's northern edge: lanterns lit all night, iron horseshoes
      over every door. Linked from Whisper-Wood.
- [x] **7. Graywatch** — a stone border keep between the Scarlands and Whisper-Wood, its sparse garrison watching the
      dark forest; the edge of the Scarlands beyond.
- [x] **8. The Fire Gate → the Inferno Labyrinth** (campaign) — open the Sanctuary's "way down toward the Fire Gate":
      a black-glass stair with heat-holding runes into the mountain's heart; then magma rivers, the gate of flame,
      the obsidian golem trial (Xarathos's territory).
- [x] **9. The Ruins of Eldoria → the Heartstone Chamber → the Ancient Door** (campaign) — low black-stone walls,
      foundations, a few arches (a vigil, not a city); the chamber; the door with unreadable runes.
- [ ] **11. Thaloria, the great city** (user, 2026-11-18, with the Eldoria's Prophecy album cover as the reference) —
      Thaloria is the biggest city in Eldoria. The cover shows a towering gothic citadel-cathedral (one great central spire,
      a crowd of pinnacles and turrets, tall arched windows, a great arched entrance) standing on a sheer cliff above a
      river gorge; waterfalls pour off the cliff and the citadel's undercroft; ships sail the river below; red-roofed
      halls on the green terraces beside it; snowy peaks, sea of cloud and evening sun behind. Plan: keep today's walled
      town (its 17 interiors, doors and 41 residents' schedules depend on it) as the lower city, and add (a) the citadel on a
      raised cliff at the city's north edge, visible from everywhere, (b) the river gorge below it with waterfalls and
      ships, (c) the city spread wider (more districts, terraces), (d) a lookout from the glade road framing it like the
      cover. Check the lore DB (Thaloria: the scholarly kingdom of libraries and archives) — the citadel can be the great
      library-palace; the Forbidden Archive lives inside it.
- [ ] **10. Later, other planes:** the Scarlands (New Ravenspire, the Obsidian Gate), the Forbidden Archive (Thaloria),
      the Sanguine Vaults, Nythoria, the Great Rift, Auroria.

## Progress notes
(Write here what was done, problems found, and anything the next pass must know.)
- 2026-11-18 (pass 1, stopped at usage limit): step 0 code is in (content/models/buildings.js; engine/region.js has roads, buildings, props, chart data). Step 1 is written but NOT tested: content/regions/the_crossroads.json, plus an East Road fork arch (eastRoad.js) → 'the_crossroads'. NEXT: headless test (enterMap('the_crossroads','from_east_road'), then walk the roads, check buildings, collisions and the map), fix what's wrong, tick step 1, then step 2. Only link to maps that exist (no links yet to the Lake, Port Silver or Duskmeet).

- 2026-11-18 (pass 2): Crossroads checked headless (village, square, stalls, inn, map chart all fine); undergrowth no longer grows through roads, paving or floors; the East Road fork arch works both ways. Crossroads links so far: only west to the East Road — add south (Lake Aethera), east (Port Silver), north (Duskmeet/Whisper-Wood) as those maps exist.
- 2026-11-18 (pass 2): Lake Aethera built (region lake_aethera.json; south link from the Crossroads): a still silver lake (region `waterLook`), the Sunken Temple in the shallows (platform with lit script, a ring of columns, broken ones, fallen walls, lights under the water), a fisher's pier, hut and boats, a monolith. New props: column, ruin_wall, steps, platform, pier, boat, glow; props can keep trees back (`clear`). Temple interior is a later dungeon.
- 2026-11-18 (pass 2): Port Silver built (east link from the Crossroads): the Silverrun runs into the sea beside the town; a grey-sand harbour with two piers and floating boats (prop `float`), The Salt Cask tavern, the harbour master, a warehouse, a fish market; the sea runs to the horizon (terrain `openEast`). Released as amo3d-v0.4.0 with the Crossroads and Lake Aethera.
- 2026-11-18 (pass 2): Iron Hollow built (a side path west off the Summit approach's trail, `branches` + link): grim stone houses with dark roofs, The Grinding Wheel tavern, the foreman's house, the ore shed, the North and Coal Shafts (prop `mine`), rails and ore carts, slag heaps, a smelter chimney, lamps, crag-fiends on the high slopes, mineral nodes. Lake Aethera got fishing and reed nodes, Port Silver fishing.
- 2026-11-18 (pass 2): the Emerald Fields built (south link from Lake Aethera): bright open meadows; the Weeping Stones — seven monoliths with weeping faces turned inward, wildflower offerings (props `weeping_stone`, `flowers`); the Hidden Cabin, swept, "K · A" carved in the door frame; deer and a wolf pack (the werewolf Guardians come with the races step).
- 2026-11-18 (pass 2): Duskmeet (north of Whisper-Wood: dark timber houses, an iron horseshoe over every door, lanterns lit all night, The Last Lamp inn, shadow-men in the trees) and Graywatch (east of Whisper-Wood: a square stone keep with merlons, arrow slits, a grey banner and a watch-light, curtain walls, barracks, the reddish edge of the Scarlands with void-stalkers beyond). Whisper-Wood now links north (Duskmeet), east (Graywatch) and south (the Crossroads' north road). New props: keep, stone_wall; houses can have `horseshoe` and `lantern`. Released as amo3d-v0.5.0. World network now: Glade ↔ Thaloria ↔ East Road ↔ Summit approach ↔ Iron Hollow; East Road ↔ Crossroads ↔ Lake Aethera ↔ Emerald Fields; Crossroads ↔ Port Silver; Crossroads ↔ Whisper-Wood ↔ Glade / Duskmeet / Graywatch.
- 2026-11-18 (pass 2): the Fire Gate (snow giving way to ash; the black-glass stair with heat-holding runes, runestones, the first landing) and the Inferno Labyrinth (magma rivers that burn — region `lava`, the gate of flame, the ring of obsidian golems for the trial, the crucible on its dais) built. The Sanctuary's way down now opens once the Hermit has taught Aether Sight (link `requires` a flag — main.js lockDoors; god mode opens all). Still owed for the campaign chapters: Oren's betrayal at the first landing, the golem trial, Magma-Eaters, Cinder-Souls, Xarathos the Pyre-Lord.
- 2026-11-18 (pass 2): the Ruins of Eldoria built (beyond the Labyrinth's crucible; opens once Xarathos is destroyed — flag `xarathos_destroyed`): the rune-dead gate, low black foundations, standing arches, a line of hooded keepers grown into pillars, steps down to the Heartstone Chamber's empty pedestal, the Ancient Door with its violet runes. Owed for the campaign: the dark entity in the chamber, the Shadow Balrog at the door. Next: step 11, Thaloria.
- 2026-11-18 (pass 2): step 11, first part — the Citadel of Thaloria (content/models/citadel.js) on the cliff plateau north of the city across a new river gorge (thaloria.js heightAt), four waterfalls off the cliff, two sailing ships, the plateau as a backdrop beyond the map's edge; on the chart as 'The Citadel (across the gorge)'. Still to do for step 11: make it reachable (a bridge and a north gate, the plateau walkable, the Citadel's interior = the great library with the Forbidden Archive), spread the city wider (more districts), a lookout on the glade road framing it like the cover. Released as amo3d-v0.6.0.
- 2026-11-18 (pass 3): the Citadel is reachable — a North Gate in the city wall, a stone bridge on piers over the gorge (walkable deck, railings), a stair up the cliff face → the Citadel terrace (region citadel_plateau.json: paved forecourt, lamps, a parapet on the cliff edge, a monolith; region `doors` and `openSouth`) → the Great Library (content/citadelLibrary.js: a long nave of books two storeys high with galleries and ladders, reading tables and candles, codex desks, lit windows, the lectern register, the sealed iron-bound door of the Forbidden Archive). Still to do for step 11: the Forbidden Archive itself (campaign: Elara reveals Kael's lineage), the city spread wider, a lookout on the glade road framing the cover. Released as amo3d-v0.6.1.
- 2026-11-19: dungeons — engine/dungeon.js (seeded rooms + L corridors on a 2 m grid, low stone walls, torches, a mine theme with timber props, enemies at room posts, chests, a codex desk, a boss in the farthest room barring the stairs down, a chart revealed as you explore); content/dungeons.js: the Deep Shaft under Iron Hollow (the foreman's closed shaft) — level 1 the old workings (boss: the Prop-Breaker), level 2 the deep gallery (boss: the Thing in the Deep). Next candidates: the Inferno Labyrinth as a true maze, under the Ruins of Eldoria, the Underworld.
- 2026-11-19: cave creatures (cave bat, blind stalker, Deep Horror = the Thing in the Deep), boss slams; the Inferno Labyrinth's halls (dungeon layout 'maze', theme 'inferno'): through the gate of flame, Magma-Eaters and Cinder-Souls (lore DB), the Obsidian Warden (golem) barring the way out to the crucible. Xarathos stays for the campaign.
- 2026-11-19: the Keepers' Vaults under the Ruins of Eldoria (dungeon theme 'crypt': stone coffins and candles; grave-wraiths, cursed knights; boss the Hollow Keeper; in by a stair between the keepers, out by the far stair beside the Heartstone Chamber). Dungeon rooms now mix creature kinds.

## DB sync owed (game-only additions, for the user)
- The Corrupted Rim, the Hermit's camp (from the Sanctuary).
