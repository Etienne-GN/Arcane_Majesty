# World Scale — Design Spec

**Status:** Approved in conversation 2026-10-17, written for review
**Game:** `apps/amo` (Phaser 3.90, single-player first)
**Follows:** `2026-09-30-mechanics-expansion-design.md` (Phases 1–5, all done)

## Context

Phases 1–5 built the systems: quests, economy, crafting, day/night, weather.
The world they live in is still a demo. Measured on 2026-10-17:

| Map | Size (tiles) | People |
|---|---|---|
| Thaloria (the capital) | 32×26 | 3 |
| East Road | 52×34 | 1 |
| big_forest (largest real forest) | 64×56 | 0 |
| Most story maps | 14×10 | 0–2 |

The desktop camera (zoom 3) shows about 10×7 tiles, so Thaloria is three
screens wide. The user's goal, in their words: cities bigger with a lot more
people, many places to enter, forests big enough to feel lost and *need* the
map, run and jump — "a real game, not a high-school project".

What the engine does today, and why it cannot simply take bigger maps:

- `GameScene._buildWorld` creates every tree (3 objects + a physics body per
  `tile === 1`) and every catalogue decoration at map load. A 192×192 forest
  would be tens of thousands of objects.
- NPCs are static sprites with a bob tween (`GameScene.create`, `spawns.npcs`).
  Nobody walks.
- Interiors exist only as hand-made maps (`hermit_hut`, `eldrin_tower`)
  wired with ordinary portals.
- The minimap (`UIScene._drawMinimapStatic`) paints the whole map at once and
  scales it to its box; `WorldMapScene` only knows the old `PROLOGUE_MAP` grid.
- Movement is walk-only: speed `100 + AGI×4`, slowed by low-mana fatigue and
  statuses. Space is Blink-Step (a skill-tree spell). The LPC sprites already
  ship `run` and `jump` animations (`animResolve.js`, `lpcLayout.js`).

## Decisions made with the user

| Question | Decision |
|---|---|
| What is "jump" top-down? | A **hop** over low things (fences, logs, low rocks, narrow streams, 1-tile gaps). No height system. Doubles as the combat dodge. |
| World structure | **Big regions, streamed in chunks** around the camera. Regions link at their edges as maps do today; interiors are separate small maps behind doors. |
| How much the HUD helps | **Fog of war everywhere.** Minimap and full map show only explored ground. Charts reveal roads and landmarks. |
| Online | **Single-player first.** Designs stay online-friendly (clock-driven NPC positions, data the server could load), but nothing is built or tested online this round. |
| Map authoring | Offline Python/Node generators: a hand-placed skeleton (districts, roads, landmarks) plus procedural fill. No Tiled, no runtime generation. |

## Goals

1. Run and hop that feel good on every existing map, on keyboard and touch.
2. Regions up to at least 256×256 tiles at a steady 60 fps on desktop.
3. Any building can have a door into an interior; a city can have 20+ of them
   without hand-building each.
4. Cities full of people who walk, work, go home at night, and talk.
5. Getting lost is possible and the map is the way out.
6. A rebuilt Thaloria and a large wilderness around the East Road that prove
   all of the above, with Chapter 3's quests still working.

## Non-goals (this round)

- Online sync of chunks, NPC positions or fog (designed for, not built).
- True elevation (cliffs, ledges, layered height).
- Swimming, mounts, climbing.
- Re-scaling every chapter's maps. Only Chapter 3's area is rebuilt; later
  chapters reuse the systems when their content is made.
- Writing to the Neo4j lore DB (the user does DB sync).

## Global constraints

- Every new save field gets a default in `PlayerStats` (both the constructor
  and `reset()`), and old saves load without errors.
- Every pure module gets a `tools/test_*.mjs` test chained into `npm test`.
- Every system is checked headless in the running game via
  `tools/console.mjs` and `window.__game` before it is called done.
- Existing maps keep working unchanged at every step; `npm test` stays green.
- New lore (places, people) is checked against the Neo4j graph first; new
  game-only places are recorded as `origin: "game"` for the user's DB sync.
- Characters never reference songs or albums in-world.
- The manual (`docs/manual/index.html`) is regenerated when items, controls
  or systems change.
- Commits go straight to `main`.

---

## W1 · Movement

### Stamina

- New resource on `PlayerStats`: `stamina`, `maxStamina`.
  `maxStamina = 100 + 2 × max(0, AGI − 10)`. Save default: full.
- Regenerates 25/s after 0.8 s without spending. At 0 the player is
  **winded**: no sprint until stamina is back to 30. Hop still works if
  stamina covers its cost.
- A green bar under the MP bar in `UIScene`, with a flash when winded.

### Sprint

- Hold **Shift** while moving: speed × 1.6, drains 20 stamina/s.
- Plays the LPC `run` animation (falls back to `walk` for sprites without it).
- Status slows and fatigue still apply on top (sprint multiplies the final
  speed). No sprint while casting, targeting or placing.

### Hop (jump and dodge in one move)

- Press **Space**: a 0.45 s hop with the LPC `jump` animation, a short arc
  (sprite offset, shadow stays on the ground), costing 25 stamina.
- Distance: up to 2 tiles in the movement direction (facing direction when
  standing still). The hop picks the longest landing in {64, 48, 32, 16, 0}
  px where every cell crossed is walkable or **hoppable** and the landing
  cell is walkable. A hop of 0 is a hop in place.
- The player is invulnerable for the first 0.25 s (the dodge). Shadow Veil and
  other invulnerability sources are unchanged.
- **Hoppable** comes from two places:
  - map cells: a region/map `hop` layer (cells such as narrow streams and
    1-tile gaps) that block walking but not hopping;
  - placed items: a decoration with `hoppable: true` (fences, logs, low rocks)
    whose body is ignored while hopping.
- No hop while casting, targeting, placing, in dialogue, or winded below 25.

### Blink-Step

- Leaves Space. It becomes an ability that can be slotted on the hotbar
  (keys 1–4) like other actives; its effect, cost and unlock are unchanged.
  Saves that had it learned keep it, and the hotbar offers it.

### Touch

- The launcher/joystick controls gain a **Hop** button and a **Sprint**
  toggle; pushing the joystick fully also sprints if the toggle is on.

### Rules module

Pure `src/systems/movementRules.js`:
`staminaMax(agi)`, `tickStamina(state, dtMs, {sprinting})`,
`canSprint(state)`, `hopCost`, `hopLanding(grid, from, dir, isHoppable)`.
Tested in `tools/test_movement.mjs`.

### Acceptance

- Shift sprints at 1.6× and stops when stamina runs out; it recovers.
- Space clears a fence and a narrow stream; it never lands inside a wall;
  hitting Space against a wall hops in place.
- A hop through an enemy attack takes no damage during the first 0.25 s.
- Blink-Step still works from the hotbar.

---

## W2 · Region streaming engine

### Format

A **region** is one large map, stored as data under
`public/regions/<id>/region.json` and loaded in `GameScene.preload` when the
registry entry has `region: '<id>'`:

```
{
  id, displayName, width, height, chunkSize: 16,
  tileset, floorFrame, pathFrame, streetFrame, backgroundColor,
  tiles:  "<base64 Uint8, row-major>",        // 0 grass,1 wall/tree,2 path,3 cobble,4 void,5 water
  hop:    "<base64 bitset>" | null,           // W1 hoppable cells
  dense:  "<base64 bitset>" | null,           // W5 deep-forest cells
  sheets: ["tilesets/...", ...], names: ["oak_a", ...],
  decorations: [[sheetIdx, nameIdx, x, y, flags], ...],   // flags: 1 blocking, 2 hoppable, 4 overlay
  spawns: { enemies, npcs, signs, chests, nodes, stations, bountyBoards,
            riftGates, doors, landmarks },    // same shapes as today's map spawns + new kinds
  portals, places, weather, biome, levelBand, quests, chart
}
```

The registry (`src/data/maps/index.js`) keeps a small stub per region
(`{ id, region, displayName }`) so `getMap`, portals and quests keep using map
ids. Existing map modules stay as they are.

### Runtime

- One code path for everything: `regionFromMap(def)` adapts an existing map
  module into the region shape in memory, so old maps and new regions go
  through the same builder. An old map is simply a region with few chunks.
- **Floor and collision** are full-region Phaser tilemap layers. Phaser
  already culls tilemap rendering, and collision comes from tile properties,
  not from one physics body per tree.
- **Trees and walls** (tile 1) draw as chunked images (trunk + canopy), not
  per-tile physics bodies.
- **Everything placed on top** (decorations, signs, chests, nodes, stations,
  boards, doors, NPCs, enemies) is bucketed by chunk at load and created only
  for **active chunks**: those intersecting the camera view grown by one
  chunk. At most one chunk is built per frame; leaving chunks are destroyed.
- **Enemies** in a chunk that unloads are put to sleep: their spawn record
  keeps HP, alive/dead and respawn timer, and the enemy is rebuilt from it.
  An enemy chasing the player is pinned and stays live while within two
  chunks of the player.
- Day/night timed spawns, weather, the darkness layer and the minimap all read
  from the region data, not from live objects.
- Generators gain a writer (`tools/maps/region_writer.py`) that emits
  `region.json` from the same tile + decoration lists they build today.

### Rules module

Pure `src/systems/regionChunks.js`: `chunkOf(x, y, size)`,
`activeChunks(view, size, margin, w, h)`, `bucketByChunk(items, size)`,
`diffChunks(prev, next)`, `decodeGrid(b64, w, h)`, `encodeGrid`.
Tested in `tools/test_region_chunks.mjs`, including `regionFromMap` over every
registered map (same tile grid, same spawn counts).

### Performance budget (checked headless on a 256×256 test region)

- At most 2,500 active display objects; no frame over 20 ms while walking
  across chunk borders at sprint speed.
- Region JSON at most 3 MB for 256×256.

### Acceptance

- Every existing map loads and plays as before (portals, quests, night,
  weather, stations, chests).
- `worldtest`, regenerated as a 256×256 region, holds the budget.

---

## W3 · Interiors

### Doors

- New spawn kind on any map or region:
  `doors: [{ x, y, interior: 'thaloria_inn', label: 'The Inn', locked?: { item | flag }, facing: 'up' }]`.
- A door draws a door sprite (or an invisible trigger on a building's drawn
  door) with a `[E] Enter <label>` prompt. Locked doors say what they need.
- Entering saves `playerStats.interiorReturn = { mapId, x, y }` (save default
  `null`). The interior's exit portal targets `__return`, which sends the
  player back in front of the door. Saving and reloading inside an interior
  returns to the right door.

### Interiors

- An interior is an ordinary small map (≤ 24×18) with `interior: true`,
  dark-border style, and the existing interior lighting overlay.
- Built by `tools/maps/gen_interiors.py` from **templates** in
  `tools/maps/interiors/`: inn, shop, smithy, house, temple, tower floor,
  cellar, guildhall. A template defines:
  - room size range and shape (single room, L, two rooms);
  - wall/floor sheet and furniture kits with placement rules (against a wall,
    centred, corners);
  - NPC slots (named or townsfolk), container slots (chests), readable slots
    (signs with `kind: 'book'`), light sources.
- A city's spec lists each building's interior as
  `{ id, template, seed, label, overrides }`; overrides place named NPCs,
  stations, quest items or a hand-written layout for story places.
- Generated houses get flavour: containers with small loot, the odd book,
  and about one in six with a hidden stash.
- Output: `src/data/maps/interiors/<id>.js` plus a generated
  `interiors/index.js` merged into the registry.

### Acceptance

- Walking up to a door and pressing E enters; the exit returns in front of the
  door; it survives a save/reload inside.
- A locked door refuses without its key or flag and opens with it.
- Every interior template produces a walkable room with the exit reachable
  from every NPC slot (checked by the generator and by a test).

---

## W4 · Townsfolk

### Data

`src/data/townsfolk/<region>.js` (generated, then hand-edited where needed):

```
{ id, name?, role, look, home, schedule: [
    { from: 22, to: 6,  at: 'home',            activity: 'sleep' },
    { from: 8,  to: 18, at: 'market_stall_3',  activity: 'work' },
    { from: 18, to: 22, at: 'inn_common',      activity: 'sit' },
    { from: 6,  to: 8,  at: 'wander:market',   activity: 'wander' } ],
  dialogue?, questGiver? }
```

- **Places** are named anchors in the region (`places: { market_stall_3:
  {x, y}, inn_common: { interior: 'thaloria_inn', x, y } }`). A place inside
  an interior means the person is in that interior map at that time.
- **Roles:** guard (patrols a route), merchant, labourer, child, priest,
  noble, beggar, drunk (evening only). Each role has a bark pool and default
  schedule shape.
- **Looks** are LPC recipes, generated with the LPC library's randomiser;
  a city reuses a bounded set of looks (about 24) with palette variations, so
  texture baking stays cheap.

### Behaviour

- Position is a pure function of the clock:
  `whereAt(resident, minutes, nav) → { mapId, x, y, moving, facing }`.
  Travel between places follows a cached A* path on the region's walk grid at
  60 px/s, so arriving in a district shows people where they should be.
- Live `Townsfolk` entities exist only in active chunks (W2). They walk their
  path, play LPC walk/idle/sit animations, avoid the player (wait, then
  sidestep after 0.6 s blocked), and face the player when spoken to.
- **E** on a townsperson: named → their dialogue (and quests as today);
  everyone else → a bark picked by `pickBark(role, { hour, weather, flags }, rng)`.
- Shops: a merchant's shop opens only while their schedule says `work`
  ("Closed — come back in the morning" otherwise).
- Night: streets thin out, guards with lanterns light the darkness layer.

### Rules modules

`src/systems/schedules.js` (`slotAt`, `whereAt`), `src/systems/pathfind.js`
(grid A*, path cache), `src/systems/barks.js`. Tested in
`tools/test_townsfolk.mjs`.

### Budget

At most 30 live townsfolk at once; the rest are positions on paper.

### Acceptance

- At 09:00 the market is busy; at 23:00 it is nearly empty and the inn is full.
- Following one person through a day shows them walk home → work → inn → home.
- The Trader and Innkeeper still give their quests.

---

## W5 · Map and exploration

### Fog of war

- `playerStats.explored = { [regionId]: "<base64 bitset>" }`, one bit per
  4×4-tile cell (save default `{}`). Reveal radius: 6 tiles around the player,
  4 inside **dense** cells. Interiors are always fully known.

### Minimap

- Player-centred window of 48×48 tiles (not the whole map scaled down), drawn
  from region data and fog. Unexplored cells are black; explored cells use the
  terrain colours; landmarks and doors show once seen.

### Full map (M)

Replaces `WorldMapScene`:

- **Region tab:** the explored region rendered from tile data, fog over the
  rest, "you are here", region name, exits, discovered landmarks, rift gates,
  doors, and quest markers. Pan with WASD/drag, zoom with the wheel or +/−.
- **World tab:** the regions you have visited, linked by the exits you know,
  laid out from the lore DB's location coordinates.
- **Quest markers:** derived automatically from the active step (talk → the
  NPC's current position from `whereAt`; attune → the gate; read_signs → the
  sign; kill → the centre of that enemy type's spawns), or from an explicit
  `where: { map, x, y }` on the step.

### Charts and landmarks

- **Chart items** (`chart_<region>`, sold by cartographers and found in
  chests): using one sets `playerStats.charted[regionId] = true` (default
  `{}`), which draws the region's `chart` layer faintly under the fog (main
  roads and landmark positions), not the terrain.
- **Landmarks:** `spawns.landmarks: [{ id, name, x, y, radius, xp }]`.
  Entering the radius the first time shows **Discovered: <name>**, gives XP,
  sets `playerStats.discovered[id]` (default `{}`) and pins it on the map.
- **Dense forest:** cells in the `dense` layer shrink the fog reveal radius
  and add a vignette that darkens the view edges, which is how forests get
  disorienting.

### Rules module

`src/systems/fog.js` (`revealAround`, `isExplored`, `encode`/`decode`),
`src/systems/mapMarkers.js` (`markersFor(questState, region)`). Tested in
`tools/test_fog_map.mjs`.

### Acceptance

- Walking into a fresh region shows black everywhere except your trail.
- Buying the chart shows the roads and landmarks; walking a landmark
  discovers it once.
- The active quest step has a marker in the right place on M.

---

## W6 · Content: Thaloria and the Thalorian Wilds

### Lore check first

Before building, query the Neo4j graph for Thaloria (city and region),
Eldrin's Tower, the Summit of Despair, Oren, and anything else placed in the
Thaloria region. Every invented name is recorded in the content plan and
flagged `origin: "game"` for the user's DB sync.

### Thaloria (region id `thaloria`, about 128×112)

- **Districts:**
  - the High Street and market square;
  - the temple quarter;
  - the noble hill, with the road up to Eldrin's Tower;
  - the lower town;
  - the walls with the East Gate and West Gate.
- **15–20 interiors:**
  - the inn, with its cellar;
  - the market hall, the smithy and the alchemist;
  - the temple and the bell tower;
  - the scholars' hall, the barracks and a noble manor;
  - about 8 houses.
- **40+ townsfolk** on schedules, including the existing Trader, Innkeeper and
  Merchant (who now keeps shop hours), plus a cartographer who sells the
  regional chart.
- **Kept as they are:** the stations, the bounty board and the signs.
  Thaloria still has no enemies.

### The Thalorian Wilds (region id `east_road`, about 192×160)

- The East Road crosses the region. Forest wilds lie on both sides:
  - dense stands;
  - forked side paths;
  - the birch copse (the night ambush);
  - a cave entrance (interior);
  - a ruin;
  - a small lake (water and a hoppable stream);
  - the shepherd's lean-to where Oren waits.
- **8+ landmarks**, a waystone, the rift gate, the three journal-page chests
  spread across the wilds, and the existing creature mix scaled to the area.
- Exits stay the same: west to Thaloria, east to the Summit of Despair.

### Quests

The Chapter 3 quests (`main_odysseys_dawn`, `side_traders_rumor`,
`side_scholars_saddlebags`) keep their ids and steps, re-anchored on the new
layout. `test_chapter3.mjs` is updated to the new sizes and positions.

### Acceptance

- A new character can play Chapter 3 start to finish on the new maps.
- The headless performance budget holds on both regions.
- Map previews (`render_map_preview.py`) of both regions are reviewed with the
  user before the work is called done.

---

## Order and dependencies

1. **W1 Movement:** no dependencies; you feel it on every map at once.
2. **W2 Streaming:** needed by W4, W5 and W6.
3. **W3 Interiors:** needs only the existing portal system.
4. **W5 Map and exploration:** needs W2's region data.
5. **W4 Townsfolk:** needs W2 (walk grid, chunks) and W3 (interior places).
6. **W6 Content:** needs everything above.

Each sub-project gets its own implementation plan and ends with `npm test`
green, a headless check in the running game, and a commit on `main`.

## Risks

- **Phaser cost of LPC townsfolk.** Composing LPC layers per NPC is
  expensive. Mitigation: bake a bounded set of looks once per region, and cap
  live townsfolk at 30.
- **Adapter regressions.** Routing every old map through `regionFromMap` could
  break a quirk of one map. Mitigation: a test that compares every registered
  map's grid and spawn counts, plus a headless smoke load of every map.
- **Generator quality.** Big procedural areas can look samey. Mitigation:
  hand-placed skeletons, landmarks every few screens, and preview review with
  the user before content is called done.
- **Save growth.** Fog bitsets are about 2 KB per 256×256 region; acceptable.
