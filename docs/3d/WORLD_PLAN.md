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
- [ ] **2. Lake Aethera & the Sunken Temple** — a huge still lake like polished silver; the temple half-submerged in the
      shallows, carved in a forgotten script (outside first; the inside as a later dungeon).
- [ ] **3. The Silverrun & Port Silver** — the river road east, then the coastal town: a grey-sand harbour, piers,
      fishing boats, a market.
- [ ] **4. Iron Hollow** — a grim mining town in the northern foothills: mine mouths, slag heaps, a tavern.
- [ ] **5. The Emerald Fields** — untamed grassland; the Weeping Stones (seven monoliths with weeping faces, south)
      and the Hidden Cabin (Kael and Anya's exile home).
- [ ] **6. Duskmeet** — a frontier hamlet on Whisper-Wood's northern edge: lanterns lit all night, iron horseshoes
      over every door. Linked from Whisper-Wood.
- [ ] **7. Graywatch** — a stone border keep between the Scarlands and Whisper-Wood, its sparse garrison watching the
      dark forest; the edge of the Scarlands beyond.
- [ ] **8. The Fire Gate → the Inferno Labyrinth** (campaign) — open the Sanctuary's "way down toward the Fire Gate":
      a black-glass stair with heat-holding runes into the mountain's heart; then magma rivers, the gate of flame,
      the obsidian golem trial (Xarathos's territory).
- [ ] **9. The Ruins of Eldoria → the Heartstone Chamber → the Ancient Door** (campaign) — low black-stone walls,
      foundations, a few arches (a vigil, not a city); the chamber; the door with unreadable runes.
- [ ] **10. Later, other planes:** the Scarlands (New Ravenspire, the Obsidian Gate), the Forbidden Archive (Thaloria),
      the Sanguine Vaults, Nythoria, the Great Rift, Auroria.

## Progress notes
(Write here what was done, problems found, and anything the next pass must know.)
- 2026-11-18 (pass 1, stopped at usage limit): step 0 code is in (content/models/buildings.js; engine/region.js has roads, buildings, props, chart data). Step 1 is written but NOT tested: content/regions/the_crossroads.json, plus an East Road fork arch (eastRoad.js) → 'the_crossroads'. NEXT: headless test (enterMap('the_crossroads','from_east_road'), then walk the roads, check buildings, collisions and the map), fix what's wrong, tick step 1, then step 2. Only link to maps that exist (no links yet to the Lake, Port Silver or Duskmeet).

- 2026-11-18 (pass 2): Crossroads checked headless (village, square, stalls, inn, map chart all fine); undergrowth no longer grows through roads, paving or floors; the East Road fork arch works both ways. Crossroads links so far: only west to the East Road — add south (Lake Aethera), east (Port Silver), north (Duskmeet/Whisper-Wood) as those maps exist.

## DB sync owed (game-only additions, for the user)
- The Corrupted Rim, the Hermit's camp (from the Sanctuary).
