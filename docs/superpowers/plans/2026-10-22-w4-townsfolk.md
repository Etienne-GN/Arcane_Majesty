# W4 Townsfolk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thaloria fills with people who live a day: they sleep at home, walk to work, sit in the inn at night, and walk the streets in between. Where anyone is follows from the game clock, so you find people where they should be when you arrive. Guards patrol and carry light at night. Anyone answers **E** with a line that fits the hour and weather; the Innkeeper, the Trader, the Merchant and the Cartographer keep their dialogue, quests and shops. Shops keep hours, and quest markers follow people through their day.

**Architecture:**
- **Pure rules,** all tested in a new `tools/test_townsfolk.mjs`:
  - `src/systems/walkGrid.js`: which tiles block, from the tile grid, catalogue hitboxes and blocking props. It is baked offline into `src/data/townsfolk/walk.js`.
  - `src/systems/pathfind.js`: A* on a walk grid, plus routes across doors between a town and its interiors (cached).
  - `src/systems/schedules.js`: `whereAt`, the position as a pure function of the clock, plus `validateTown`.
  - `src/systems/barks.js`: `pickBark`.
  - `src/systems/crowd.js`: who is live (30 at most) and how a walker gives way to the player.
- **Data:**
  - `src/data/townsfolk/roles.js`: the day shape of each role.
  - `src/data/townsfolk/barks.js`: bark lines.
  - `src/data/townsfolk/thaloria.js`: places and residents.
  - `src/data/townsfolk/looks.js` and the look sheets: baked by a new LPC Forge page.
  - `src/data/townsfolk/index.js`: the town registry.
- **Phaser glue:**
  - `src/systems/TownsfolkManager.js` creates, moves and removes the live sprites.
  - GameScene preloads the look sheets, ticks the manager, lights the guards, and routes **E**.
  - `mapMarkers.js` takes the people's positions, and MapScene passes them in.

**Tech Stack:** Phaser 3.90 (arcade physics, spritesheets), ES modules, Node `assert` tests, Python 3 map generators, the LPC Forge v2 (Vite + Vue, port 5179) for baking looks, headless Chrome via `../tool_suite/lpc_forge/tools/console.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-17-world-scale-design.md` (section W4)

**Depends on:**
- **W2:** `ChunkStreamer.isPxActive`, `regionFormat` bitsets.
- **W3:** `spawns.doors`, interiors, `doorReturnPoint`.
- **W5:** `mapMarkers.markersFor`, MapScene.

All of these are on `main`.

## Global Constraints

- Every new save field gets a default in `PlayerStats` (constructor and `reset()`), and old saves load without errors. *(W4 adds no save field: positions come from the clock.)*
- Every pure module gets a `tools/test_*.mjs` test chained into `npm test`.
- Every system is checked headless in the running game via `tools/console.mjs` and `window.__game` before it is called done.
- Existing maps keep working unchanged at every step; `npm test` stays green.
- New lore (places, people) is checked against the Neo4j graph first. New game-only places are recorded as `origin: "game"` for the user's DB sync.
- Characters never reference songs or albums in-world. *(This applies to the bark lines.)*
- The manual (`docs/manual/index.html`) is regenerated when items, controls or systems change.
- Commits go straight to `main`.
- Work from `apps/amo`: paths are relative to it unless they start with `docs/` or `../tool_suite/`.
- **Headless checks:**
  - The game dev server is on `http://localhost:5174/`.
  - The LPC Forge v2 is on `http://127.0.0.1:5179/`, with its API on :3001. Both are already running.
  - `console.mjs` runs `;;`-separated steps 800 ms apart, and a bare `0` is a delay.
  - Return values are not printed, so every check prints with `console.log('RESULT', …)`.
  - `SCRATCH/` stands for `/tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/`. Type the full path.
  - To set the clock in a check: `gs.player.stats.gameMinutes = 1440 + H*60`, where `gs = __game.scene.getScene('GameScene')`.

## Rulings against the spec (made while planning)

- **Walk grids are baked offline** into `src/data/townsfolk/walk.js` by `tools/gen_walk_grids.mjs`.
  - The game only knows a map's blocking decorations once it has loaded that map's catalogues. Baking makes a route the same whether or not its maps are loaded, so a person's arrival time never depends on where the player stands.
  - A test recomputes the grids and fails when `walk.js` is stale, for example after a map generator is re-run.
- **`whereAt(resident, minutes, town)`:** the third argument is the town (places, roles and nav), not the bare nav. A place name means nothing without the town's place table.
- **Thaloria's people are hand-written,** with no generator: 22 people (18 commoners and 4 named). Each role gives the shape of the day, and each resident names their home, work, evening seat and so on. W6's bigger city can add a generator once there are 40+ people.
- **A house without an interior is still a home.** An `indoors: true` place is the tile in front of a door: the person walks there and is gone until their next slot. Only three of Thaloria's buildings have interiors today.
- **Sleeping people are hidden** (indoors, or in an interior), because no lying-down pose is baked. The beggar sleeps sitting in their corner (`outdoors: true`).
- **Wanderers pick a new spot every 20 game minutes**, on absolute clock buckets.
  - The spot is a hash of the person and the bucket.
  - A patrol ends each shift at its first waypoint, after its last whole loop.
  - Both keep `whereAt` free of jumps at slot boundaries, which the continuity test checks on every resident over two days.
- **The four named NPCs become residents,** and their fixed spawns leave `thaloria.js`:
  - the **Innkeeper** works inside the inn, 07:00–01:00;
  - the **Trader** stands by the inn door, 08:00–19:00, then the inn;
  - the **Merchant** and the **Cartographer** keep stalls, 08:00–18:00.

  All four use baked LPC looks, **so their appearance changes**. Their quests, dialogue and shops are unchanged.
- **Looks are 24 sheets:** 18 adults, 3 children, and 3 guards in plate armour with a kettle helm. They are baked by the LPC Forge's randomiser, with seed 1.
  - "Palette variations" means the randomiser's tints. Skin uses the human tones only (body palette 0–7).
  - There is no runtime palette swap.
  - A sheet keeps only walk, idle and sit: 576×768 px, about 1.8 MB of texture each. A city loads only the looks its people use.
- **Bodies and collisions:** the player collides with townsfolk, whose bodies are immovable and placed by the clock. Townsfolk pass through each other.
- **A shop is closed whenever its keeper's activity is not `work`**, including while they walk to the stall. Talking to them still counts for "talk to" quest steps.
- **Guards at night light the darkness** with a lantern-sized hole (radius 70). No lantern sprite is drawn.
- **No townsfolk on Tiled maps:** they appear only on maps with a tile grid, which is every map a town uses.
- **Lore:** W4 adds no named person or place. Bark lines are generic and mention only places already in the game or the DB (the bell tower, the East Road, the Summit). There is nothing to record for the DB sync.

## Review Focus

1. **Someone walks through a door while you watch it.** They must vanish at the door and appear inside, never walk through a wall or pop up mid-room. This is pinned by the route-leg tests (Task 1), the continuity test (Tasks 2 and 5) and the headless inn check (Task 6).
2. **The player stands in a walker's way,** on a 2-wide street or in a doorway, for a long time. The walker waits, then steps aside. It never freezes forever, and it never shoves the player through a wall. Pinned by the `steer` tests (Task 6) and the headless block check (Task 6).
3. **The clock jumps,** for example a full rest or a debug time change. The live set must refresh from the clock within a quarter second, with no stale sprites left at old positions. Pinned by the headless 09:00 → 23:00 check (Task 6).
4. **Maps without a town,** including Tiled `samplemap`, the East Road and interiors of other places. No manager is created and nothing throws. Pinned by the headless smoke check (Task 6).
5. **A quest NPC who is asleep, indoors, or in another map** when you open M. Their talk marker points to the door of the building they are in, or to nothing, and never to their old spawn tile. Pinned by the marker tests (Task 8).

---

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/systems/walkGrid.js` | 1 | `DECORATION_SOURCES`, `WALK_ROOTS`, `blockedTiles`, `computeWalk` |
| `src/systems/pathfind.js` | 1 | `walkMask`, `findPath`, `pathPx`, `pointAlong`, `pointOnRoute`, `mapTree`, `createNav` |
| `tools/gen_walk_grids.mjs` | 1 | bakes `src/data/townsfolk/walk.js` |
| `src/data/townsfolk/walk.js` | 1, 5 | generated blocked bitsets per map |
| `src/scenes/GameScene.js` | 1, 6, 7 | decoration sources table; townsfolk wiring; talk |
| `tools/test_townsfolk.mjs` | 1–8 | every W4 rule |
| `package.json` | 1 | chain the new test |
| `src/systems/schedules.js` | 2 | `scheduleOf`, `slotAt`, `makeTown`, `whereAt`, `namedPeople`, `validateTown` |
| `src/data/townsfolk/roles.js` | 2 | day shapes per role |
| `src/systems/barks.js`, `src/data/townsfolk/barks.js` | 3 | `pickBark` and the lines |
| `src/systems/townsfolkLooks.js` | 4 | look sheet layout (shared with the Forge bake) |
| `../tool_suite/lpc_forge/v2/src/model/townsfolk.js` + test | 4 | seeded look recipes |
| `../tool_suite/lpc_forge/v2/bake.html`, `v2/src/bake.ts` | 4 | the bake page |
| `public/assets/characters/townsfolk/*`, `src/data/townsfolk/looks.js` | 4 | baked sheets, manifest, credits |
| `src/data/townsfolk/thaloria.js`, `src/data/townsfolk/index.js` | 5 | Thaloria's people; the registry |
| `tools/maps/gen_thaloria.py`, `src/data/maps/thaloria.js` | 5 | named NPCs leave the spawns; work spots reserved |
| `tools/test_chapter3.mjs`, `tools/test_fog_map.mjs` | 5 | read the named NPCs from the town |
| `src/systems/crowd.js` | 6 | `chooseLive`, `inTheWay`, `steer` |
| `src/systems/TownsfolkManager.js` | 6 | live sprites |
| `src/systems/mapMarkers.js`, `src/scenes/MapScene.js` | 8 | talk markers follow people |
| `tools/gen_game_inventory.mjs`, `docs/manual/index.html` | 9 | manual |

---

### Task 1: Walk grids and pathfinding

**Files:**
- Create: `src/systems/walkGrid.js`, `src/systems/pathfind.js`, `tools/gen_walk_grids.mjs`, `src/data/townsfolk/walk.js` (generated), `tools/test_townsfolk.mjs`
- Modify: `src/scenes/GameScene.js` (`_placeCatalogueDecorations`, the `sources` table), `package.json` (`test` chain)

**Interfaces:**
- Consumes:
  - `catalogueLayout(entry, box, item) → { depth, body }` from `src/utils/catalogueLayout.js`;
  - `encodeBits`, `decodeBitsToMask` from `regionFormat.js`;
  - `doorReturnPoint(def, tilePx)` from `interiors.js`;
  - `getMap` from `src/data/maps/index.js`.
- Produces:
  - **walkGrid.js:**
    - `TILE_PX = 32`;
    - `DECORATION_SOURCES: [{ field, catKey, texKey, cat }]`;
    - `WALK_ROOTS = ['thaloria']`;
    - `blockedTiles(def, catalogueOf) → Uint8Array(w*h)`, where 1 means blocked;
    - `computeWalk(getMap, catalogueOf, roots = WALK_ROOTS) → { [mapId]: base64 }`.
  - **pathfind.js:**
    - `ROAD_COST = 1`, `GROUND_COST = 1.6`;
    - `walkMask(def, blockedB64?) → Uint8Array`, where 1 means walkable;
    - `findPath(mask, w, h, [ax,ay], [bx,by], costAt?) → [[x,y]…] | null`;
    - `pathPx(path) → number` (px);
    - `pointAlong(path, d) → { x, y, facing }` (px);
    - `pointOnRoute(route, d) → { mapId, x, y, facing }`;
    - `mapTree(rootId, getMap) → [{ id, parent, door }]`;
    - `createNav({ root, getMap, walk }) → nav`, with:
      - `has(mapId)`, `isWalkable(mapId, x, y)`, `snap(mapId, x, y) → [x,y]`;
      - `path(mapId, a, b) → { path, len, fallback }`;
      - `route(from, to) → { legs: [{ mapId, path, len }], len, fallback } | null`, where `from` and `to` are `{ mapId, x, y }` in tiles;
      - `cacheSize()`.

- [ ] **Step 1: Create the test file with the pure checks** (`tools/test_townsfolk.mjs`)

```js
// W4 townsfolk: walk grids, routes, schedules, barks, looks, Thaloria's people, crowds, markers.
// Run: node tools/test_townsfolk.mjs
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

const W = await import('../src/systems/walkGrid.js');
const P = await import('../src/systems/pathfind.js');

// Fixture maps: a 20×10 town, an inn behind a door, a cellar under the inn.
const grid = (w, h, fill = 0) => Array.from({ length: h }, () => Array(w).fill(fill));
const room = (w, h) => { const t = grid(w, h); for (let x = 0; x < w; x++) { t[0][x] = 1; t[h - 1][x] = 1; } for (let y = 0; y < h; y++) { t[y][0] = 1; t[y][w - 1] = 1; } return t; };
const FX = {
    ft:        { id: 'ft', tiles: grid(20, 10), spawns: { doors: [{ x: 10, y: 2, interior: 'ft_inn' }] } },
    ft_inn:    { id: 'ft_inn', interior: true, tiles: room(8, 6), playerStart: { x: 4, y: 4 }, spawns: { doors: [{ x: 6, y: 3, interior: 'ft_cellar', facing: 'down' }] } },
    ft_cellar: { id: 'ft_cellar', interior: true, tiles: room(5, 5), playerStart: { x: 2, y: 3 }, spawns: {} },
};
const fxMap = id => FX[id] ?? FX.ft;   // like getMap: an unknown id falls back to some map

// ---- Blocked tiles
{
    const cat = { gridTileWidth: 32, gridTileHeight: 32, entries: [
        { name: 'box', kind: 'object', w: 32, h: 64, hitbox: { x: 0, y: 32, w: 32, h: 32 }, layer: 'sorted' },
        { name: 'flower', kind: 'object', w: 32, h: 32, hitbox: null, layer: 'under' },
    ] };
    const small = { gridTileWidth: 16, gridTileHeight: 16, entries: [{ name: 'stone', kind: 'object', w: 16, h: 16, hitbox: { x: 0, y: 0, w: 16, h: 16 }, layer: 'sorted' }] };
    const catalogueOf = p => (p === W.DECORATION_SOURCES[0].cat ? cat : p === 'fake/small.json' ? small : null);
    const tiles = grid(4, 4); tiles[0][0] = 1;
    const def = {
        tiles,
        [W.DECORATION_SOURCES[0].field]: [{ name: 'box', x: 1, y: 1 }, { name: 'box', x: 3, y: 3, blocking: false }, { name: 'flower', x: 2, y: 0 }],
        extraSheets: [{ texKey: 'sm', catKey: 'sm_cat', png: 'x.png', cat: 'fake/small.json' }],
        sheetDecorations: [{ texKey: 'sm', catKey: 'sm_cat', scale: 2, items: [{ name: 'stone', x: 2, y: 2 }] }],
        spawns: { signs: [{ x: 0, y: 3 }] },
    };
    const b = W.blockedTiles(def, catalogueOf);
    const cells = []; b.forEach((v, i) => { if (v) cells.push([i % 4, Math.floor(i / 4)]); });
    eq(cells, [[0, 0], [1, 2], [2, 2], [0, 3]], 'tree tile, the box\'s hitbox row, the scaled stone, the sign — not the opted-out box or the flower');
    ok(W.DECORATION_SOURCES.every(s => { try { readFileSync(new URL(`../public/${s.cat}`, import.meta.url)); return true; } catch { return false; } }), 'every boot sheet\'s catalogue exists');
}

// ---- A* and path geometry
{
    const open = (w, h) => new Uint8Array(w * h).fill(1);
    const m = open(5, 5);
    eq(P.findPath(m, 5, 5, [0, 0], [4, 4]), [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]], 'open ground: the diagonal');
    eq(P.findPath(m, 5, 5, [2, 2], [2, 2]), [[2, 2]], 'already there');
    ok(Math.abs(P.pathPx([[0, 0], [1, 0], [2, 1]]) - (32 + 32 * Math.SQRT2)) < 1e-9, 'path length in px');

    const wall = open(5, 3); wall[0 * 5 + 2] = 0; wall[1 * 5 + 2] = 0;
    const p = P.findPath(wall, 5, 3, [0, 0], [4, 0]);
    ok(p && p.every(([x, y]) => wall[y * 5 + x] === 1) && p.some(([, y]) => y === 2), 'around a wall, never through it');
    const corner = open(2, 2); corner[1] = 0; corner[2] = 0;
    eq(P.findPath(corner, 2, 2, [0, 0], [1, 1]), null, 'no squeezing between two diagonal blocks');
    const cut = open(3, 3); cut[1] = cut[4] = cut[7] = 0;
    eq(P.findPath(cut, 3, 3, [0, 0], [2, 0]), null, 'unreachable: null');
    eq(P.findPath(cut, 3, 3, [1, 1], [2, 0]), null, 'blocked start: null');
    const road = P.findPath(open(5, 3), 5, 3, [0, 1], [4, 1], (x, y) => (y === 2 ? 1 : 5));
    ok(road.some(([, y]) => y === 2), 'a cheaper road pulls the path onto it');

    eq(P.pointAlong([[0, 0], [2, 0]], 0), { x: 16, y: 16, facing: 'right' }, 'start of a path, facing along it');
    eq(P.pointAlong([[0, 0], [2, 0]], 32), { x: 48, y: 16, facing: 'right' }, 'one tile along');
    eq(P.pointAlong([[0, 0], [0, 2]], 999), { x: 16, y: 80, facing: 'down' }, 'past the end: the last tile');
    eq(P.pointAlong([[3, 3]], 10), { x: 112, y: 112, facing: 'down' }, 'a one-tile path');
}

// ---- Map tree and routes across doors
{
    eq(P.mapTree('ft', fxMap).map(n => [n.id, n.parent]), [['ft', null], ['ft_inn', 'ft'], ['ft_cellar', 'ft_inn']], 'town → inn → cellar');
    const nav = P.createNav({ root: 'ft', getMap: fxMap, walk: {} });
    ok(nav.has('ft_cellar') && !nav.has('elsewhere'), 'nav knows the tree, nothing else');
    ok(!nav.isWalkable('ft_inn', 0, 0) && nav.isWalkable('ft_inn', 1, 1), 'walls are not walkable');

    const down = nav.route({ mapId: 'ft', x: 0, y: 9 }, { mapId: 'ft_cellar', x: 2, y: 2 });
    eq(down.legs.map(l => l.mapId), ['ft', 'ft_inn', 'ft_cellar'], 'into the cellar: town, inn, cellar');
    eq(down.legs.map(l => [l.path[0], l.path.at(-1)]), [[[0, 9], [10, 3]], [[4, 4], [6, 2]], [[2, 3], [2, 2]]],
        'walk to the door front, appear at the entry, walk to the hatch front, appear below');
    ok(!down.fallback && Math.abs(down.len - down.legs.reduce((a, l) => a + l.len, 0)) < 1e-9, 'a real route; its length is the legs\' sum');
    const up = nav.route({ mapId: 'ft_cellar', x: 2, y: 2 }, { mapId: 'ft', x: 0, y: 9 });
    eq(up.legs.map(l => [l.mapId, l.path[0], l.path.at(-1)]),
        [['ft_cellar', [2, 2], [2, 3]], ['ft_inn', [6, 2], [4, 4]], ['ft', [10, 3], [0, 9]]], 'and back out the same way');
    eq(nav.route({ mapId: 'ft', x: 1, y: 1 }, { mapId: 'nowhere', x: 0, y: 0 }), null, 'a map outside the town: no route');
    eq(P.pointOnRoute(down, 0), { mapId: 'ft', x: 16, y: 9 * 32 + 16, facing: 'right' }, 'route start');
    eq(P.pointOnRoute(down, down.len + 50).mapId, 'ft_cellar', 'past the end: in the last map');
    const n0 = nav.cacheSize(); nav.route({ mapId: 'ft', x: 0, y: 9 }, { mapId: 'ft_cellar', x: 2, y: 2 });
    eq(nav.cacheSize(), n0, 'the same route again comes from the cache');
}

// ---- The baked walk grids are up to date
{
    const { getMap } = await import('../src/data/maps/index.js');
    const { WALK } = await import('../src/data/townsfolk/walk.js');
    const cats = new Map();
    const catalogueOf = p => { if (!cats.has(p)) { try { cats.set(p, JSON.parse(readFileSync(new URL(`../public/${p}`, import.meta.url)))); } catch { cats.set(p, null); } } return cats.get(p); };
    eq(W.computeWalk(getMap, catalogueOf), WALK, 'src/data/townsfolk/walk.js is current (run: node tools/gen_walk_grids.mjs)');
    const nav = P.createNav({ root: 'thaloria', getMap, walk: WALK });
    ok(nav.has('thaloria_inn') && nav.has('thaloria_inn_cellar') && nav.has('thaloria_bell_tower'), 'Thaloria\'s interiors are in its tree');
    const r = nav.route({ mapId: 'thaloria', x: 2, y: 12 }, { mapId: 'thaloria_inn', x: 9, y: 9 });
    ok(r && !r.fallback && r.legs.length === 2, 'from the west road into the inn, on real paths');
    ok(r.legs[0].path.every(([x, y]) => nav.isWalkable('thaloria', x, y)), 'every tile of it is walkable');
}

console.log(`test_townsfolk: ${n} checks passed`);
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_townsfolk.mjs`
Expected: FAIL with `Cannot find module '…/src/systems/walkGrid.js'`.

- [ ] **Step 3: Write `src/systems/pathfind.js`**

```js
// W4: routes for townsfolk — A* on a map's walk grid (8 directions, no corner
// cutting, roads cheaper than open ground) and routes across doors between a
// town and the interiors behind them, cached. Tile coordinates in, pixels for
// positions along a path. Pure — tools/test_townsfolk.mjs.
import { decodeBitsToMask } from './regionFormat.js';
import { doorReturnPoint } from './interiors.js';

const TILE = 32;
export const ROAD_COST = 1, GROUND_COST = 1.6;   // tiles 2 (road) and 3 (street) vs the rest
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROUTE_CACHE_MAX = 5000;

// 1 = walkable: not a tree/wall (1) or void (4), and not blocked by the baked grid.
export function walkMask(def, blockedB64 = null) {
    const w = def.tiles[0].length, h = def.tiles.length;
    const blocked = blockedB64 ? decodeBitsToMask(blockedB64, w, h) : null;
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const t = def.tiles[y][x], i = y * w + x;
        out[i] = t !== 1 && t !== 4 && !(blocked && blocked[i]) ? 1 : 0;
    }
    return out;
}

export function findPath(mask, w, h, [ax, ay], [bx, by], costAt = () => 1) {
    const ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
    if (!ok(ax, ay) || !ok(bx, by)) return null;
    const start = ay * w + ax, goal = by * w + bx;
    if (start === goal) return [[ax, ay]];
    const g = new Float64Array(w * h).fill(Infinity), from = new Int32Array(w * h).fill(-1), closed = new Uint8Array(w * h);
    const heap = [];
    const push = (f, i) => {
        heap.push([f, i]);
        for (let c = heap.length - 1; c > 0;) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
    };
    const pop = () => {
        const top = heap[0], last = heap.pop();
        if (heap.length) {
            heap[0] = last;
            for (let p = 0; ;) {
                const l = 2 * p + 1, r = l + 1; let m = p;
                if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                if (m === p) break;
                [heap[p], heap[m]] = [heap[m], heap[p]]; p = m;
            }
        }
        return top;
    };
    // Octile distance: admissible while every step costs at least 1.
    const hOf = i => { const dx = Math.abs(i % w - bx), dy = Math.abs(((i / w) | 0) - by); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
    g[start] = 0; push(hOf(start), start);
    while (heap.length) {
        const [, i] = pop();
        if (i === goal) break;
        if (closed[i]) continue;
        closed[i] = 1;
        const x = i % w, y = (i / w) | 0;
        for (const [dx, dy] of DIRS8) {
            const nx = x + dx, ny = y + dy;
            if (!ok(nx, ny) || (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy)))) continue;
            const j = ny * w + nx, step = (dx && dy ? Math.SQRT2 : 1) * costAt(nx, ny);
            if (g[i] + step < g[j]) { g[j] = g[i] + step; from[j] = i; push(g[j] + hOf(j), j); }
        }
    }
    if (from[goal] < 0) return null;
    const out = [];
    for (let i = goal; i !== -1; i = from[i]) out.push([i % w, (i / w) | 0]);
    return out.reverse();
}

export const pathPx = path => path.reduce((a, [x, y], i) => (i ? a + Math.hypot(x - path[i - 1][0], y - path[i - 1][1]) * TILE : 0), 0);

const facingOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down'));
const centre = ([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2];

export function pointAlong(path, d) {
    let rest = Math.max(0, d), facing = 'down';
    for (let i = 1; i < path.length; i++) {
        const [ax, ay] = centre(path[i - 1]), [bx, by] = centre(path[i]), seg = Math.hypot(bx - ax, by - ay);
        facing = facingOf(bx - ax, by - ay);
        if (rest <= seg) { const f = seg ? rest / seg : 0; return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, facing }; }
        rest -= seg;
    }
    const [x, y] = centre(path[path.length - 1]);
    return { x, y, facing };
}

export function pointOnRoute(route, d) {
    let rest = Math.max(0, d);
    for (let i = 0; i < route.legs.length; i++) {
        const leg = route.legs[i];
        if (rest <= leg.len || i === route.legs.length - 1) return { mapId: leg.mapId, ...pointAlong(leg.path, rest) };
        rest -= leg.len;
    }
    return null;
}

// The town and every interior behind its doors (and theirs), root first.
export function mapTree(rootId, getMap) {
    const out = [{ id: rootId, parent: null, door: null }], seen = new Set([rootId]);
    for (let k = 0; k < out.length; k++) {
        for (const door of getMap(out[k].id)?.spawns?.doors ?? []) {
            const id = door.interior;
            if (seen.has(id) || getMap(id)?.id !== id) continue;
            seen.add(id);
            out.push({ id, parent: out[k].id, door });
        }
    }
    return out;
}

export function createNav({ root, getMap, walk = {} }) {
    const nodes = new Map();
    for (const { id, parent, door } of mapTree(root, getMap)) {
        const def = getMap(id), w = def.tiles[0].length, h = def.tiles.length;
        nodes.set(id, { id, def, w, h, mask: walkMask(def, walk[id]), parent, door });
    }
    const walkable = (n, x, y) => x >= 0 && y >= 0 && x < n.w && y < n.h && n.mask[y * n.w + x] === 1;
    const snapIn = (n, x, y) => {
        if (walkable(n, x, y)) return [x, y];
        for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkable(n, x + dx, y + dy)) return [x + dx, y + dy];
        }
        return [x, y];
    };
    // Where a child map is entered (in the child) and the tile in front of its door (in the parent).
    for (const n of nodes.values()) {
        n.entry = snapIn(n, n.def.playerStart?.x ?? 1, n.def.playerStart?.y ?? 1);
        if (!n.parent) continue;
        const p = nodes.get(n.parent), rp = doorReturnPoint(n.door, TILE);
        const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[n.door.facing ?? 'up'];
        let x = Math.floor(rp.x / TILE), y = Math.floor(rp.y / TILE);
        for (let k = 0; k < 3 && !walkable(p, x, y); k++) { x += back[0]; y += back[1]; }
        n.front = walkable(p, x, y) ? [x, y] : snapIn(p, Math.floor(rp.x / TILE), Math.floor(rp.y / TILE));
    }
    const chain = id => { const out = []; for (let n = nodes.get(id); n; n = nodes.get(n.parent)) out.push(n.id); return out; };
    const paths = new Map(), routes = new Map();

    const nav = {
        root,
        has: id => nodes.has(id),
        isWalkable: (id, x, y) => { const n = nodes.get(id); return !!n && walkable(n, x, y); },
        snap: (id, x, y) => snapIn(nodes.get(id), x, y),
        path(id, a, b) {
            const key = `${id}|${a}|${b}`;
            let hit = paths.get(key);
            if (!hit) {
                const n = nodes.get(id);
                const cost = (x, y) => { const t = n.def.tiles[y][x]; return t === 2 || t === 3 ? ROAD_COST : GROUND_COST; };
                const found = findPath(n.mask, n.w, n.h, a, b, cost);
                const path = found ?? [a, b];
                hit = { path, len: pathPx(path), fallback: !found };
                paths.set(key, hit);
            }
            return hit;
        },
        route(from, to) {
            if (!nodes.has(from.mapId) || !nodes.has(to.mapId)) return null;
            const key = `${from.mapId}:${from.x},${from.y}>${to.mapId}:${to.x},${to.y}`;
            if (routes.has(key)) return routes.get(key);
            const up = chain(from.mapId), downChain = chain(to.mapId);
            const common = up.find(m => downChain.includes(m));
            const legs = [];
            let m = from.mapId, cur = snapIn(nodes.get(m), from.x, from.y);
            const leg = (mapId, a, b) => { const p = nav.path(mapId, a, b); legs.push({ mapId, path: p.path, len: p.len, fallback: p.fallback }); };
            while (m !== common) { const n = nodes.get(m); leg(m, cur, n.entry); cur = n.front; m = n.parent; }
            for (const c of downChain.slice(0, downChain.indexOf(common)).reverse()) { const n = nodes.get(c); leg(m, cur, n.front); cur = n.entry; m = c; }
            leg(m, cur, snapIn(nodes.get(to.mapId), to.x, to.y));
            const route = { legs: legs.map(({ mapId, path, len }) => ({ mapId, path, len })), len: legs.reduce((a, l) => a + l.len, 0), fallback: legs.some(l => l.fallback) };
            if (routes.size >= ROUTE_CACHE_MAX) routes.clear();
            routes.set(key, route);
            return route;
        },
        cacheSize: () => routes.size,
    };
    return nav;
}
```

- [ ] **Step 4: Write `src/systems/walkGrid.js`**

```js
// W4: which tiles a townsperson cannot walk on — the tile grid's trees, walls and
// void, every decoration's collision body (catalogueLayout, exactly as GameScene
// builds them) and the spawned props that block. Baked offline by
// tools/gen_walk_grids.mjs into src/data/townsfolk/walk.js, so a route is the same
// whether or not its maps are loaded. Pure — tools/test_townsfolk.mjs.
import { catalogueLayout } from '../utils/catalogueLayout.js';
import { encodeBits } from './regionFormat.js';
import { mapTree } from './pathfind.js';

export const TILE_PX = 32;

// The boot-loaded sheets a map places by field name (BootScene loads each `cat`
// under `catKey`). GameScene._placeCatalogueDecorations places from this table.
const T = 'assets/catalogued/tilesets';
export const DECORATION_SOURCES = [
    { field: 'decorations',                catKey: 'tileset_base_cat',             texKey: 'tileset_base',             cat: `${T}/SampleMap/[Base]BaseChip_pipo.catalogue.json` },
    { field: 'waterTiles',                 catKey: 'tileset_water_cat',            texKey: 'tileset_water',            cat: `${T}/SampleMap/[A]Water_pipo.catalogue.json` },
    { field: 'snowDecorations',            catKey: 'tileset_snowy_cat',            texKey: 'tileset_snowy',            cat: `${T}/SnowyAssetPack/SnowyAssetPack.catalogue.json` },
    { field: 'addworkDecorations',         catKey: 'tileset_addwork_cat',          texKey: 'tileset_addwork',          cat: `${T}/addwork/addwork.catalogue.json` },
    { field: 'patdGrassDecorations',       catKey: 'tileset_patd_grass_cat',       texKey: 'tileset_patd_grass',       cat: `${T}/PATD_TilesetGrass/PATD_TilesetGrass.catalogue.json` },
    { field: 'patdStoneGroundDecorations', catKey: 'tileset_patd_stoneground_cat', texKey: 'tileset_patd_stoneground', cat: `${T}/PATD_TilesetStoneGround/PATD_TilesetStoneGround.catalogue.json` },
    { field: 'patdWallDecorations',        catKey: 'tileset_patd_wall_cat',        texKey: 'tileset_patd_wall',        cat: `${T}/PATD_TilesetWall/PATD_TilesetWall.catalogue.json` },
    { field: 'patdStructDecorations',      catKey: 'tileset_patd_struct_cat',      texKey: 'tileset_patd_struct',      cat: `${T}/PATD_Struct/PATD_Struct.catalogue.json` },
    { field: 'patdPropsDecorations',       catKey: 'tileset_patd_props_cat',       texKey: 'tileset_patd_props',       cat: `${T}/PATD_Props/PATD_Props.catalogue.json` },
    { field: 'patdPlantDecorations',       catKey: 'tileset_patd_plant_cat',       texKey: 'tileset_patd_plant',       cat: `${T}/PATD_Plant/PATD_Plant.catalogue.json` },
    { field: 'lpcTerrainDecorations',      catKey: 'terrain_atlas_cat',            texKey: 'terrain_atlas',            cat: `${T}/lpc/terrain_atlas.catalogue.json` },
    { field: 'lpcBaseOutDecorations',      catKey: 'base_out_atlas_cat',           texKey: 'base_out_atlas',           cat: `${T}/lpc/base_out_atlas.catalogue.json` },
    { field: 'lpcBuildDecorations',        catKey: 'build_atlas_cat',              texKey: 'build_atlas',              cat: `${T}/lpc/build_atlas.catalogue.json` },
    { field: 'lpcObjMiskDecorations',      catKey: 'obj_misk_atlas_cat',           texKey: 'obj_misk_atlas',           cat: `${T}/lpc/obj_misk_atlas.catalogue.json` },
];

// The towns whose maps get a walk grid (src/data/townsfolk/index.js lists the same).
export const WALK_ROOTS = ['thaloria'];

// Spawned props that stand in the way (their base tile).
const BLOCKING_SPAWNS = ['signs', 'stations', 'bountyBoards', 'chests', 'campfires', 'gatheringNodes', 'crackedBoulders', 'npcs'];

// catalogueOf(path) → the parsed catalogue ({ gridTileWidth, gridTileHeight, entries }) or null.
export function blockedTiles(def, catalogueOf) {
    const w = def.tiles[0].length, h = def.tiles.length, out = new Uint8Array(w * h);
    const mark = (x, y) => { if (x >= 0 && y >= 0 && x < w && y < h) out[y * w + x] = 1; };
    def.tiles.forEach((row, y) => row.forEach((t, x) => { if (t === 1 || t === 4) mark(x, y); }));
    // A body blocks every tile whose central 16×16 it overlaps (a townsperson is about 16 px wide).
    const markBody = b => {
        for (let ty = Math.floor(b.y / TILE_PX); ty <= Math.floor((b.y + b.h) / TILE_PX); ty++) {
            for (let tx = Math.floor(b.x / TILE_PX); tx <= Math.floor((b.x + b.w) / TILE_PX); tx++) {
                const ix = tx * TILE_PX + 8, iy = ty * TILE_PX + 8;
                if (b.x < ix + 16 && b.x + b.w > ix && b.y < iy + 16 && b.y + b.h > iy) mark(tx, ty);
            }
        }
    };
    const groups = [
        ...DECORATION_SOURCES.map(s => ({ items: def[s.field], cat: s.cat, scale: 1 })),
        ...(def.sheetDecorations ?? []).map(g => ({ items: g.items, cat: (def.extraSheets ?? []).find(e => e.catKey === g.catKey)?.cat, scale: g.scale ?? 1 })),
    ];
    for (const g of groups) {
        if (!g.items?.length || !g.cat) continue;
        const cat = catalogueOf(g.cat);
        if (!cat) continue;
        const byName = new Map(cat.entries.map(e => [e.name, e]));
        for (const d of g.items) {
            const e = byName.get(d.name);
            if (!e) continue;
            const frames = e.frames?.length > 1 ? e.frames : null;
            const cw = e.kind === 'tile' ? cat.gridTileWidth : frames ? Math.max(...frames.map(f => f.w)) : e.w;
            const ch = e.kind === 'tile' ? cat.gridTileHeight : frames ? Math.max(...frames.map(f => f.h)) : e.h;
            const hb = e.hitbox, s = g.scale;
            const placed = s === 1 || !hb ? e : { ...e, hitbox: { x: hb.x * s, y: hb.y * s, w: hb.w * s, h: hb.h * s } };
            const { body } = catalogueLayout(placed, { left: d.x * TILE_PX, top: d.y * TILE_PX, w: cw * s, h: ch * s }, d);
            if (body) markBody(body);
        }
    }
    for (const k of BLOCKING_SPAWNS) for (const s of def.spawns?.[k] ?? []) mark(s.x, s.y);
    return out;
}

export function computeWalk(getMap, catalogueOf, roots = WALK_ROOTS) {
    const out = {};
    for (const root of roots) {
        for (const { id } of mapTree(root, getMap)) {
            const def = getMap(id), w = def.tiles[0].length, h = def.tiles.length;
            const b = blockedTiles(def, catalogueOf), cells = [];
            b.forEach((v, i) => { if (v) cells.push([i % w, Math.floor(i / w)]); });
            out[id] = encodeBits(cells, w, h);
        }
    }
    return out;
}
```

- [ ] **Step 5: Write `tools/gen_walk_grids.mjs` and generate `walk.js`**

```js
#!/usr/bin/env node
// W4: bake the walk grid of every town map and the interiors behind its doors into
// src/data/townsfolk/walk.js. Run after regenerating a town or its interiors:
//   node tools/gen_walk_grids.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { getMap } from '../src/data/maps/index.js';
import { computeWalk, WALK_ROOTS } from '../src/systems/walkGrid.js';

const cats = new Map();
const catalogueOf = p => {
    if (!cats.has(p)) { try { cats.set(p, JSON.parse(readFileSync(new URL(`../public/${p}`, import.meta.url)))); } catch { cats.set(p, null); } }
    return cats.get(p);
};
const walk = computeWalk(getMap, catalogueOf);
const out = new URL('../src/data/townsfolk/walk.js', import.meta.url);
mkdirSync(new URL('.', out), { recursive: true });
writeFileSync(out, `// AUTO-GENERATED by tools/gen_walk_grids.mjs (W4) — do not edit.
// Blocked tiles per map (bitset, bit i = y * width + x), for towns ${WALK_ROOTS.join(', ')} and their interiors.
export const WALK = ${JSON.stringify(walk, null, 4)};
`);
console.log(`wrote src/data/townsfolk/walk.js: ${Object.keys(walk).join(', ')}`);
```

Run: `node tools/gen_walk_grids.mjs`
Expected: `wrote src/data/townsfolk/walk.js: thaloria, thaloria_inn, thaloria_bell_tower, thaloria_house_teal, thaloria_inn_cellar` (any order).

- [ ] **Step 6: Make GameScene place decorations from the shared table**

In `src/scenes/GameScene.js`, add `import { DECORATION_SOURCES } from '../systems/walkGrid.js';` next to the other `../systems/` imports. In `_placeCatalogueDecorations()`, replace the whole `const sources = [ … ];` literal (from `const sources = [` to its closing `];`) with:

```js
        const sources = DECORATION_SOURCES.map(s => ({ items: this._mapDef[s.field], catKey: s.catKey, texKey: s.texKey }));
```

Keep the comment block above the function, but change its line "adding a new catalogued sheet to the game means adding one line here." to "adding a new catalogued sheet means adding one line to DECORATION_SOURCES (systems/walkGrid.js)."

- [ ] **Step 7: Chain the test and run it**

In `package.json`, in `scripts.test`, replace `node tools/test_fog_map.mjs && ` with `node tools/test_fog_map.mjs && node tools/test_townsfolk.mjs && `.

Run: `node tools/test_townsfolk.mjs`
Expected: `test_townsfolk: N checks passed`.

If "from the west road into the inn" fails because a tile is blocked, print `r.legs[0].path` and the blocked tiles around the inn door, and fix the cause. If the inn's door front resolves into a wall, the fix belongs in `createNav`'s front search. Never edit `walk.js` by hand.

- [ ] **Step 8: Check that decorations still place in the running game**

Run: `node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');console.log('RESULT',JSON.stringify({walls:gs.wallGroup.getChildren().length,deco:gs._streamer.handleCount()}));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w4_t1_thaloria.png`
Expected: `RESULT {"walls":<more than 50>,"deco":<more than 100>}`, no `[exception]`, and the screenshot shows Thaloria's houses as before.

- [ ] **Step 9: Run the suite and commit**

Run: `npm test 2>&1 | tail -3`
Expected: the last lines show `ok`/`passed`, with no failure.

```bash
git add src/systems/walkGrid.js src/systems/pathfind.js tools/gen_walk_grids.mjs src/data/townsfolk/walk.js tools/test_townsfolk.mjs src/scenes/GameScene.js package.json
git commit -m "feat(amo): walk grids and routes for townsfolk — A* on baked grids, routes across doors into interiors"
```

---

### Task 2: Schedules — where everyone is, from the clock

**Files:**
- Create: `src/systems/schedules.js`, `src/data/townsfolk/roles.js`
- Modify: `tools/test_townsfolk.mjs` (new section)

**Interfaces:**
- Consumes:
  - from Task 1: `createNav`, `pointOnRoute`, `pointAlong`, `nav.route`, `nav.path`, `nav.isWalkable`;
  - `gameHour`, `MINUTES_PER_REAL_SECOND` from `gameClock.js`.
- Produces:
  - **constants:** `WALK_PX_PER_SEC = 60`, `PX_PER_MIN`, `WANDER_EVERY = 20`, `PATROL_SPEED = 0.75`;
  - `scheduleOf(resident, roles) → [{ from, to, at, activity }]`;
  - `slotAt(schedule, hour) → { slot, index } | null`;
  - `makeTown(data, { getMap, walk, roles }) → town`, where `town = { id, places, residents, roles, nav }`;
  - `whereAt(resident, minutes, town) → { mapId, x, y, facing, moving, pose: 'walk'|'idle'|'sit', visible, activity } | null`, with `x, y` in px;
  - `namedPeople(town, minutes) → [{ npcId, mapId, x, y }]`, with `x, y` in tiles;
  - `validateTown(town, { looks }) → string[]`;
  - `ROLES` (roles.js): `{ [role]: { schedule } | { shifts: { [shift]: schedule } } }`.
- **Data shapes:**
  - **Resident:** `{ id, role, look, home?, work?, evening?, wander?, patrol?, shift?, schedule?, npc? }`. `npc` holds `{ id, name, dialogue, afterDialogue, isShop?, shopName?, catalog? }`.
  - **Places:**
    - a point: `{ x, y, interior?, facing?, indoors?, outdoors? }`;
    - an area: `{ x, y, w, h, interior? }`;
    - a patrol: `{ route: [[x,y]…], interior? }`.
  - A slot's `at` is either a place name, or `wander:<area>` / `patrol:<route>`. `@field` is replaced by the resident's own field.

- [ ] **Step 1: Add the failing tests** (append to `tools/test_townsfolk.mjs`, before the final `console.log`)

```js
// ---- Schedules
const S = await import('../src/systems/schedules.js');
const { ROLES } = await import('../src/data/townsfolk/roles.js');
const FT_TOWN = {
    id: 'ft',
    places: {
        home:   { x: 2, y: 5, indoors: true },
        stall:  { x: 15, y: 7, facing: 'down' },
        seat:   { interior: 'ft_inn', x: 2, y: 2, facing: 'down' },
        corner: { x: 18, y: 1, facing: 'left', outdoors: true },
        sq:     { x: 5, y: 5, w: 6, h: 3 },
        loop:   { route: [[1, 8], [18, 8]] },
        bed:    { interior: 'ft_cellar', x: 2, y: 2 },
    },
    residents: [
        { id: 'm1', role: 'merchant', look: 'look_00', home: 'home', work: 'stall', evening: 'seat' },
        { id: 'k1', role: 'child', look: 'look_18', home: 'home', wander: 'sq' },
        { id: 'g1', role: 'guard', shift: 'day', look: 'look_21', home: 'home', patrol: 'loop' },
        { id: 'b1', role: 'beggar', look: 'look_01', work: 'corner' },
        { id: 'n1', role: 'merchant', look: 'look_02', npc: { id: 'oren', name: 'X' },
          schedule: [{ from: 6, to: 22, at: 'stall', activity: 'work' }, { from: 22, to: 6, at: 'bed', activity: 'sleep' }] },
    ],
};
const fxTown = S.makeTown(FT_TOWN, { getMap: fxMap, walk: {}, roles: ROLES });
const R = id => fxTown.residents.find(r => r.id === id);
const D = 1440;   // day 1, midnight
const px = t => t * 32 + 16;
{
    eq(S.WALK_PX_PER_SEC, 60, 'walking pace from the spec');
    eq(S.scheduleOf(R('m1'), ROLES).map(s => s.at), ['home', 'stall', 'seat'], 'a role\'s day with the resident\'s own places');
    eq(S.scheduleOf(R('k1'), ROLES).find(s => s.activity === 'wander').at, 'wander:sq', 'wander:@wander becomes the resident\'s area');
    eq(S.scheduleOf(R('g1'), ROLES)[0].at, 'patrol:loop', 'a guard\'s shift picks its schedule');
    eq(S.slotAt(S.scheduleOf(R('m1'), ROLES), 3).slot.activity, 'sleep', '03:00: asleep');
    eq(S.slotAt(S.scheduleOf(R('m1'), ROLES), 8).slot.activity, 'work', '08:00 sharp: work');
    eq(S.slotAt(S.scheduleOf(R('m1'), ROLES), 23.9).slot.activity, 'sit', '23:54: still in the inn');
    eq(S.slotAt(S.scheduleOf(R('k1'), ROLES), 2).slot.activity, 'sleep', 'a slot wrapping midnight (20→7) covers 02:00');
    eq(S.slotAt([{ from: 8, to: 9, at: 'x', activity: 'work' }], 12), null, 'no slot: null');

    const night = S.whereAt(R('m1'), D + 3 * 60, fxTown);
    eq([night.mapId, night.x, night.y, night.visible, night.moving], ['ft', px(2), px(5), false, false], '03:00: home, out of sight');
    const leaving = S.whereAt(R('m1'), D + 8 * 60, fxTown);
    eq([leaving.x, leaving.y, leaving.moving, leaving.pose, leaving.visible], [px(2), px(5), true, 'walk', true], '08:00: steps out of the door');
    const work = S.whereAt(R('m1'), D + 9 * 60, fxTown);
    eq([work.mapId, work.x, work.y, work.pose, work.facing, work.activity, work.visible], ['ft', px(15), px(7), 'idle', 'down', 'work', true], '09:00: at the stall');
    ok(S.whereAt(R('m1'), D + 18 * 60 + 0.2, fxTown).moving, '18:00: on the way to the inn');
    const inn = S.whereAt(R('m1'), D + 20 * 60, fxTown);
    eq([inn.mapId, inn.x, inn.y, inn.pose], ['ft_inn', px(2), px(2), 'sit'], '20:00: sitting in the inn');
    eq(S.whereAt(R('m1'), D + 9 * 60 + 7, fxTown), S.whereAt(R('m1'), D + 9 * 60 + 7, fxTown), 'the same minute, the same answer');

    const kid = S.whereAt(R('k1'), D + 9 * 60 + 30, fxTown), ktx = Math.floor(kid.x / 32), kty = Math.floor(kid.y / 32);
    ok(kid.visible && ktx >= 5 && ktx < 11 && kty >= 5 && kty < 8, '09:30: the child is somewhere in the square');
    ok(!S.whereAt(R('k1'), D + 21 * 60, fxTown).visible, '21:00: the child is in bed');
    const spots = new Set(); for (let t = 0; t < 120; t += 20) { const p = S.whereAt(R('k1'), D + 9 * 60 + t + 19, fxTown); spots.add(`${p.x},${p.y}`); }
    ok(spots.size >= 2, 'a wanderer moves between spots');

    const guard = S.whereAt(R('g1'), D + 10 * 60, fxTown);
    ok(guard.visible && guard.moving && guard.pose === 'walk' && guard.y === px(8), '10:00: the guard walks the patrol row');
    ok(!S.whereAt(R('g1'), D + 3 * 60, fxTown).visible, '03:00: the day guard sleeps');
    const beg = S.whereAt(R('b1'), D + 3 * 60, fxTown);
    eq([beg.visible, beg.pose, beg.x, beg.y], [true, 'sit', px(18), px(1)], 'the beggar sleeps sitting in their corner');
    const n1 = S.whereAt(R('n1'), D + 23 * 60, fxTown);
    eq([n1.mapId, n1.visible], ['ft_cellar', false], 'asleep in an interior: there, but out of sight');

    // No one ever jumps: between two samples a quarter-minute apart, on the same map,
    // a person moves at most a quarter-minute's walk.
    for (const r of fxTown.residents) {
        let prev = S.whereAt(r, D, fxTown);
        for (let t = D + 0.25; t <= D + 2880; t += 0.25) {
            const p = S.whereAt(r, t, fxTown);
            if (p.mapId === prev.mapId) assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) <= S.PX_PER_MIN * 0.25 + 0.01, `${r.id} jumps at minute ${t - D} (${prev.x},${prev.y} → ${p.x},${p.y})`);
            prev = p;
        }
        n++;
    }

    eq(S.namedPeople(fxTown, D + 10 * 60), [{ npcId: 'oren', mapId: 'ft', x: 15, y: 7 }], 'named people, in tiles');
    eq(S.validateTown(fxTown, { looks: ['look_00', 'look_01', 'look_02', 'look_18', 'look_21'] }), [], 'the fixture town is sound');
    const broken = S.makeTown({ ...FT_TOWN, residents: [
        { id: 'gap', role: 'merchant', look: 'look_00', schedule: [{ from: 8, to: 18, at: 'stall', activity: 'work' }] },
        { id: 'lost', role: 'merchant', look: 'look_00', home: 'nowhere', work: 'stall', evening: 'seat' },
        { id: 'wall', role: 'merchant', look: 'look_99', schedule: [{ from: 0, to: 24, at: 'inwall', activity: 'work' }] },
    ], places: { ...FT_TOWN.places, inwall: { interior: 'ft_inn', x: 0, y: 0 } } }, { getMap: fxMap, walk: {}, roles: ROLES });
    const probs = S.validateTown(broken, { looks: ['look_00'] }).join('\n');
    ok(/gap: no slot at 00:00/.test(probs), 'a gap in the day is reported');
    ok(/lost: unknown place "nowhere"/.test(probs), 'an unknown place is reported');
    ok(/wall: place "inwall" is not walkable/.test(probs), 'a place inside a wall is reported');
    ok(/wall: unknown look "look_99"/.test(probs), 'an unknown look is reported');
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_townsfolk.mjs`
Expected: FAIL with `Cannot find module '…/src/systems/schedules.js'`.

- [ ] **Step 3: Write `src/data/townsfolk/roles.js`**

```js
// W4: the shape of a day for each role (spec: guard, merchant, labourer, child,
// priest, noble, beggar, drunk). Hours; a slot may wrap midnight. '@field' is the
// resident's own place (home, work, evening, wander, patrol). Sleep and 'home'
// hide a person indoors; see schedules.js.
export const ROLES = {
    merchant: { schedule: [
        { from: 0,  to: 8,  at: '@home',    activity: 'sleep' },
        { from: 8,  to: 18, at: '@work',    activity: 'work' },
        { from: 18, to: 24, at: '@evening', activity: 'sit' },
    ] },
    labourer: { schedule: [
        { from: 0,  to: 6,  at: '@home',    activity: 'sleep' },
        { from: 6,  to: 17, at: '@work',    activity: 'work' },
        { from: 17, to: 24, at: '@evening', activity: 'sit' },
    ] },
    child: { schedule: [
        { from: 20, to: 7,  at: '@home',          activity: 'sleep' },
        { from: 7,  to: 12, at: 'wander:@wander', activity: 'wander' },
        { from: 12, to: 13, at: '@home',          activity: 'home' },
        { from: 13, to: 20, at: 'wander:@wander', activity: 'wander' },
    ] },
    priest: { schedule: [
        { from: 21, to: 6,  at: '@home', activity: 'sleep' },
        { from: 6,  to: 21, at: '@work', activity: 'work' },
    ] },
    noble: { schedule: [
        { from: 0,  to: 8,  at: '@home',          activity: 'sleep' },
        { from: 8,  to: 12, at: 'wander:@wander', activity: 'wander' },
        { from: 12, to: 14, at: '@home',          activity: 'home' },
        { from: 14, to: 19, at: 'wander:@wander', activity: 'wander' },
        { from: 19, to: 24, at: '@evening',       activity: 'sit' },
    ] },
    beggar: { schedule: [
        { from: 22, to: 7,  at: '@work', activity: 'sleep' },
        { from: 7,  to: 22, at: '@work', activity: 'sit' },
    ] },
    // Out only in the evening (spec)
    drunk: { schedule: [
        { from: 3,  to: 19, at: '@home',          activity: 'home' },
        { from: 19, to: 2,  at: '@evening',       activity: 'sit' },
        { from: 2,  to: 3,  at: 'wander:@wander', activity: 'wander' },
    ] },
    guard: { shifts: {
        day: [
            { from: 6,  to: 18, at: 'patrol:@patrol', activity: 'patrol' },
            { from: 18, to: 6,  at: '@home',          activity: 'sleep' },
        ],
        night: [
            { from: 18, to: 6,  at: 'patrol:@patrol', activity: 'patrol' },
            { from: 6,  to: 18, at: '@home',          activity: 'sleep' },
        ],
    } },
};
```

- [ ] **Step 4: Write `src/systems/schedules.js`**

```js
// W4: where a townsperson is at any game minute — a pure function of the clock,
// so arriving in a district shows people where they should be. A day is a list of
// slots { from, to (hours; may wrap midnight), at, activity }. Between slots a
// person walks the route from where the last slot left them, at WALK_PX_PER_SEC.
// Wanderers pick a new spot every WANDER_EVERY minutes (absolute buckets), patrols
// end each shift at their first waypoint: no one jumps at a slot boundary.
// Pure — tools/test_townsfolk.mjs.
import { gameHour, MINUTES_PER_REAL_SECOND } from './gameClock.js';
import { createNav, pointOnRoute, pointAlong } from './pathfind.js';

export const WALK_PX_PER_SEC = 60;
export const PX_PER_MIN = WALK_PX_PER_SEC / MINUTES_PER_REAL_SECOND;
export const WANDER_EVERY = 20;
export const PATROL_SPEED = 0.75;
const TILE = 32;
const HIDDEN = new Set(['sleep', 'home']);

const cached = new WeakMap();
export function scheduleOf(r, roles) {
    if (cached.has(r)) return cached.get(r);
    const role = roles[r.role] ?? {};
    const base = r.schedule ?? (r.shift ? role.shifts?.[r.shift] : role.schedule) ?? role.shifts?.day ?? [];
    const out = base.map(s => ({ ...s, at: s.at.replace(/@(\w+)/, (_, k) => r[k] ?? `@${k}`) }));
    cached.set(r, out);
    return out;
}

const inSlot = (s, h) => (s.from <= s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to);
export function slotAt(schedule, hour) {
    const index = schedule.findIndex(s => inSlot(s, hour));
    return index < 0 ? null : { slot: schedule[index], index };
}
const durationOf = s => ((((s.to - s.from) % 24) + 24) % 24 || 24) * 60;
const startOf = (s, t) => t - ((((t - s.from * 60) % 1440) + 1440) % 1440);   // latest start ≤ t

export function makeTown(data, { getMap, walk, roles }) {
    return { id: data.id, places: data.places, residents: data.residents, roles, nav: createNav({ root: data.id, getMap, walk }), _loops: new Map() };
}

export const parseAt = at => { const m = /^(wander|patrol):(.+)$/.exec(at); return m ? { kind: m[1], name: m[2] } : { kind: 'point', name: at }; };
const mapOf = (town, place) => place.interior ?? town.id;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

function wanderPoint(town, r, name, b) {
    const a = town.places[name], mapId = mapOf(town, a), cells = a.w * a.h, s = hash(`${r.id}:${b}`) % cells;
    for (let k = 0; k < cells; k++) {
        const i = (s + k) % cells, x = a.x + (i % a.w), y = a.y + Math.floor(i / a.w);
        if (town.nav.isWalkable(mapId, x, y)) return { mapId, x, y };
    }
    return { mapId, x: a.x, y: a.y };
}

function loopOf(town, name) {
    if (!town._loops.has(name)) {
        const pl = town.places[name], mapId = mapOf(town, pl), pts = pl.route;
        const path = [pts[0]];
        for (let i = 0; i < pts.length; i++) path.push(...town.nav.path(mapId, pts[i], pts[(i + 1) % pts.length]).path.slice(1));
        town._loops.set(name, { mapId, path, len: path.length > 1 ? pathLen(path) : 0 });
    }
    return town._loops.get(name);
}
const pathLen = path => path.reduce((a, [x, y], i) => (i ? a + Math.hypot(x - path[i - 1][0], y - path[i - 1][1]) * TILE : 0), 0);

// Where a slot's walk ends (its first spot), and where the slot leaves the person.
function slotStart(town, r, slot, startAbs) {
    const { kind, name } = parseAt(slot.at), pl = town.places[name];
    if (kind === 'wander') return wanderPoint(town, r, name, Math.floor(startAbs / WANDER_EVERY));
    if (kind === 'patrol') return { mapId: mapOf(town, pl), x: pl.route[0][0], y: pl.route[0][1] };
    return { mapId: mapOf(town, pl), x: pl.x, y: pl.y };
}
function slotEnd(town, r, slot, startAbs) {
    const { kind, name } = parseAt(slot.at);
    if (kind !== 'wander') return slotStart(town, r, slot, startAbs);
    const b0 = Math.floor(startAbs / WANDER_EVERY), bEnd = Math.floor((startAbs + durationOf(slot)) / WANDER_EVERY) - 1;
    return wanderPoint(town, r, name, bEnd > b0 ? bEnd : b0);
}

const standing = (mapId, tx, ty, facing, pose, visible, activity) =>
    ({ mapId, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, facing, moving: false, pose, visible, activity });

export function whereAt(r, minutes, town) {
    const sched = scheduleOf(r, town.roles);
    const cur = slotAt(sched, gameHour(minutes));
    if (!cur) return null;
    const startAbs = startOf(cur.slot, minutes), endAbs = startAbs + durationOf(cur.slot);
    const prevT = startAbs - 0.5, prev = slotAt(sched, gameHour(prevT)) ?? cur;
    const origin = slotEnd(town, r, prev.slot, startOf(prev.slot, prevT));
    const dest = slotStart(town, r, cur.slot, startAbs);
    const route = town.nav.route(origin, dest);
    if (!route) return null;
    const tArr = startAbs + route.len / PX_PER_MIN;
    if (minutes < tArr) return { ...pointOnRoute(route, (minutes - startAbs) * PX_PER_MIN), moving: true, pose: 'walk', visible: true, activity: 'travel' };

    const { kind, name } = parseAt(cur.slot.at), act = cur.slot.activity;
    if (kind === 'wander') {
        const B = WANDER_EVERY, b0 = Math.floor(startAbs / B), bA = Math.floor(tArr / B), bEnd = Math.floor(endAbs / B) - 1;
        const pt = b => wanderPoint(town, r, name, b), b = Math.min(Math.floor(minutes / B), bEnd);
        if (b <= bA) { const p = pt(b0); return standing(p.mapId, p.x, p.y, 'down', 'idle', true, act); }
        const from = b === bA + 1 ? pt(b0) : pt(b - 1), to = pt(b);
        const leg = town.nav.route(from, to), d = (minutes - b * B) * PX_PER_MIN;
        if (d >= leg.len) return standing(to.mapId, to.x, to.y, pointOnRoute(leg, leg.len).facing, 'idle', true, act);
        return { ...pointOnRoute(leg, d), moving: true, pose: 'walk', visible: true, activity: act };
    }
    if (kind === 'patrol') {
        const loop = loopOf(town, name), v = PX_PER_MIN * PATROL_SPEED;
        const loops = loop.len ? Math.floor((endAbs - tArr) * v / loop.len) : 0, stop = tArr + loops * loop.len / v;
        if (minutes < stop) return { mapId: loop.mapId, ...pointAlong(loop.path, ((minutes - tArr) * v) % loop.len), moving: true, pose: 'walk', visible: true, activity: act };
        return standing(loop.mapId, loop.path[0][0], loop.path[0][1], 'down', 'idle', true, act);
    }
    const pl = town.places[name];
    const hidden = !!pl.indoors || (HIDDEN.has(act) && !pl.outdoors);
    const pose = act === 'sit' || (act === 'sleep' && pl.outdoors) ? 'sit' : 'idle';
    return standing(mapOf(town, pl), pl.x, pl.y, pl.facing ?? 'down', pose, !hidden, act);
}

export function namedPeople(town, minutes) {
    const out = [];
    for (const r of town.residents) {
        if (!r.npc) continue;
        const p = whereAt(r, minutes, town);
        if (p) out.push({ npcId: r.npc.id, mapId: p.mapId, x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) });
    }
    return out;
}

const hhmm = h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
export function validateTown(town, { looks = null } = {}) {
    const out = [], nav = town.nav;
    for (const r of town.residents) {
        if (looks && !looks.includes(r.look)) out.push(`${r.id}: unknown look "${r.look}"`);
        const sched = scheduleOf(r, town.roles);
        for (let h = 0; h < 24; h += 0.5) if (!slotAt(sched, h)) { out.push(`${r.id}: no slot at ${hhmm(h)}`); break; }
        let placesOk = true;
        for (const s of sched) {
            const { kind, name } = parseAt(s.at), pl = town.places[name];
            if (!pl) { out.push(`${r.id}: unknown place "${name}"`); placesOk = false; continue; }
            const mapId = mapOf(town, pl);
            if (!nav.has(mapId)) { out.push(`${r.id}: place "${name}" is on "${mapId}", outside the town`); placesOk = false; continue; }
            if (kind === 'point' && !nav.isWalkable(mapId, pl.x, pl.y)) { out.push(`${r.id}: place "${name}" is not walkable`); placesOk = false; }
            if (kind === 'patrol' && !pl.route?.every(([x, y]) => nav.isWalkable(mapId, x, y))) { out.push(`${r.id}: patrol "${name}" has a blocked waypoint`); placesOk = false; }
            if (kind === 'wander') {
                if ((pl.w + pl.h) * TILE * 1.5 > WANDER_EVERY * PX_PER_MIN) out.push(`${r.id}: area "${name}" is too big to cross between moves`);
                let any = false;
                for (let y = pl.y; y < pl.y + pl.h && !any; y++) for (let x = pl.x; x < pl.x + pl.w; x++) if (nav.isWalkable(mapId, x, y)) { any = true; break; }
                if (!any) { out.push(`${r.id}: area "${name}" has no walkable tile`); placesOk = false; }
            }
        }
        if (!placesOk) continue;
        // Every walk between slots is a real path and fits its slot (with room to wander after).
        sched.forEach((s, i) => {
            const startAbs = 1440 + s.from * 60, prevT = startAbs - 0.5, prev = slotAt(sched, gameHour(prevT));
            if (!prev) return;
            const route = nav.route(slotEnd(town, r, prev.slot, startOf(prev.slot, prevT)), slotStart(town, r, s, startAbs));
            if (!route || route.fallback) { out.push(`${r.id}: no path to slot ${i} (${s.at})`); return; }
            const spare = parseAt(s.at).kind === 'wander' ? 2 * WANDER_EVERY : 0;
            if (route.len / PX_PER_MIN > durationOf(s) - spare) out.push(`${r.id}: the walk to slot ${i} (${s.at}) takes longer than the slot`);
        });
    }
    return out;
}
```

- [ ] **Step 5: Run the tests**

Run: `node tools/test_townsfolk.mjs`
Expected: `test_townsfolk: N checks passed`.

If the continuity sweep fails, the message names the resident and the minute. Fix the boundary logic in `whereAt`, never the test's tolerance.

- [ ] **Step 6: Commit**

```bash
git add src/systems/schedules.js src/data/townsfolk/roles.js tools/test_townsfolk.mjs
git commit -m "feat(amo): townsfolk schedules — where anyone is, as a pure function of the clock; role day shapes"
```

---

### Task 3: Barks

**Files:**
- Create: `src/systems/barks.js`, `src/data/townsfolk/barks.js`
- Modify: `tools/test_townsfolk.mjs`

**Interfaces:**
- Produces:
  - `pickBark(role, { hour, weather, flags }, rng = Math.random, pools = BARKS) → string | null`;
  - `barkFits(line, ctx) → boolean`;
  - `BARKS: { [role|'anyone']: [{ text, hours?: [from, to], weather?: [ids], flag?, notFlag? }] }`.

- [ ] **Step 1: Add the failing tests**

```js
// ---- Barks
{
    const B = await import('../src/systems/barks.js');
    const { BARKS } = await import('../src/data/townsfolk/barks.js');
    const pools = {
        guard: [{ text: 'night', hours: [21, 5] }, { text: 'rain', weather: ['rain', 'storm'] }, { text: 'plain' }],
        anyone: [{ text: 'flagged', flag: 'met_oren' }, { text: 'not yet', notFlag: 'met_oren' }],
    };
    const all = (role, ctx) => { const seen = new Set(); for (let i = 0; i < 200; i++) { let k = i; seen.add(B.pickBark(role, ctx, () => ((k = (k * 9301 + 49297) % 233280) / 233280), pools)); } return [...seen].sort(); };
    eq(all('guard', { hour: 23, weather: 'clear', flags: {} }), ['night', 'not yet', 'plain'], 'at night, a clear sky, before meeting Oren');
    eq(all('guard', { hour: 12, weather: 'rain', flags: { met_oren: true } }), ['flagged', 'plain', 'rain'], 'by day in the rain, after meeting Oren');
    eq(B.pickBark('nobody', { hour: 12, weather: 'clear', flags: { met_oren: true } }, () => 0, pools), 'flagged', 'an unknown role still has the shared lines');
    eq(B.pickBark('nobody', { hour: 12, weather: 'clear', flags: {} }, () => 0, { anyone: [] }), null, 'nothing fits: null');
    let fit = 0, plain = 0;
    for (let i = 0; i < 1000; i++) { const t = B.pickBark('guard', { hour: 23, weather: 'clear', flags: { met_oren: true } }, () => i / 1000, pools); if (t === 'night') fit++; if (t === 'plain') plain++; }
    ok(fit > plain * 2, 'a line that fits the moment is likelier than a plain one');
    for (const role of ['guard', 'merchant', 'labourer', 'child', 'priest', 'noble', 'beggar', 'drunk', 'anyone']) ok(BARKS[role]?.length >= 3, `${role} has lines`);
    ok(Object.values(BARKS).flat().every(l => !/\b(song|album|verse|chorus|lyric)/i.test(l.text)), 'no line mentions songs or albums');
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_townsfolk.mjs`
Expected: FAIL with `Cannot find module '…/src/systems/barks.js'`.

- [ ] **Step 3: Write `src/systems/barks.js`**

```js
// W4: what a townsperson says when you press E on them — a line from their role's
// pool or the shared one, picked among those that fit the hour, the weather and
// the story so far. Lines that fit something specific are three times likelier.
// Pure — tools/test_townsfolk.mjs.
import { BARKS } from '../data/townsfolk/barks.js';

const inHours = ([from, to], h) => (from <= to ? h >= from && h < to : h >= from || h < to);

export function barkFits(line, { hour, weather, flags = {} }) {
    return (!line.hours || inHours(line.hours, hour))
        && (!line.weather || line.weather.includes(weather))
        && (!line.flag || !!flags[line.flag])
        && (!line.notFlag || !flags[line.notFlag]);
}

export function pickBark(role, ctx, rng = Math.random, pools = BARKS) {
    const lines = [...(pools[role] ?? []), ...(pools.anyone ?? [])].filter(l => barkFits(l, ctx));
    if (!lines.length) return null;
    const weighted = lines.flatMap(l => (l.hours || l.weather || l.flag || l.notFlag ? [l, l, l] : [l]));
    return weighted[Math.min(weighted.length - 1, Math.floor(rng() * weighted.length))].text;
}
```

- [ ] **Step 4: Write `src/data/townsfolk/barks.js`**

```js
// W4: townsfolk lines (E on anyone without a name). Generic voices — no new lore;
// places named are already in the game (the bell tower, the East Road, the Summit).
// A line may need hours [from, to), a weather id (data/weather.js) or a story flag.
export const BARKS = {
    guard: [
        { text: 'Keep to the lit streets after dark.', hours: [20, 5] },
        { text: 'Quiet night. I like them quiet.', hours: [22, 5] },
        { text: 'Rain gets into the mail. Rusts by morning.', weather: ['rain', 'storm'] },
        { text: 'Move along, traveller. Nothing to see here.' },
        { text: 'If you are taking the East Road, go armed.' },
        { text: 'The gate shuts for no one, but we watch who comes through it.' },
    ],
    merchant: [
        { text: 'Fresh this morning! Well — fresh enough.', hours: [8, 11] },
        { text: 'Not much trade in this weather.', weather: ['rain', 'storm', 'snow'] },
        { text: 'Coin first, questions after.' },
        { text: 'Prices go up when the roads go bad. They have gone bad.' },
        { text: 'Mind the crates, they bite back.' },
    ],
    labourer: [
        { text: 'Back aches before the sun is even up.', hours: [5, 9] },
        { text: 'Wet hands, cold work.', weather: ['rain', 'storm', 'snow'] },
        { text: 'A day\'s work for a day\'s bread.' },
        { text: 'Hauling stone for scholars. They never lift a thing.' },
        { text: 'Out of the way, this load is heavy!' },
    ],
    child: [
        { text: 'Bet you can\'t catch me!' },
        { text: 'Is that a real sword?' },
        { text: 'My mother says not to talk to strangers. You\'re a stranger.' },
        { text: 'I\'m allowed out till the bell. The bell is always wrong, so I\'m allowed out longer.' },
        { text: 'Puddles!', weather: ['rain', 'storm'] },
    ],
    priest: [
        { text: 'The bell keeps its own time. We forgive it.' },
        { text: 'May the road be kind to you.' },
        { text: 'Even the archives were young once.' },
        { text: 'Up early? Good. The quiet hours are the honest ones.', hours: [5, 8] },
    ],
    noble: [
        { text: 'Do I know you? No, I would remember the smell of the road.' },
        { text: 'One does not hurry in Thaloria.' },
        { text: 'Dreadful weather. Simply dreadful.', weather: ['rain', 'storm', 'snow'] },
        { text: 'The libraries are the city\'s jewel. The rest is merely streets.' },
    ],
    beggar: [
        { text: 'A coin for an old soldier?' },
        { text: 'Cold tonight. Colder than last.', hours: [20, 6] },
        { text: 'Seen things on that road, I have. Things that walk wrong.' },
        { text: 'Bless you anyway.' },
    ],
    drunk: [
        { text: 'Another round! …Is it my round?', hours: [19, 3] },
        { text: 'The Summit… you don\'t go up the Summit. Nobody comes down the same.' },
        { text: 'I\'m not drunk. The street is crooked.' },
        { text: 'Shh. The bell will hear you.' },
    ],
    anyone: [
        { text: 'Good morning.', hours: [6, 11] },
        { text: 'Good evening.', hours: [18, 22] },
        { text: 'Lovely day for it.', weather: ['clear'] },
        { text: 'Stay dry, friend.', weather: ['rain', 'storm'] },
        { text: 'Mm?' },
        { text: 'Safe travels.' },
    ],
};
```

- [ ] **Step 5: Run the tests and commit**

Run: `node tools/test_townsfolk.mjs`
Expected: `test_townsfolk: N checks passed`.

```bash
git add src/systems/barks.js src/data/townsfolk/barks.js tools/test_townsfolk.mjs
git commit -m "feat(amo): townsfolk barks — a line that fits the role, the hour, the weather and the story"
```

---

### Task 4: Baked looks (LPC Forge)

**Files:**
- Create:
  - `src/systems/townsfolkLooks.js`;
  - `../tool_suite/lpc_forge/v2/src/model/townsfolk.js` and `../tool_suite/lpc_forge/v2/tests/test_townsfolk_looks.mjs`;
  - `../tool_suite/lpc_forge/v2/bake.html` and `../tool_suite/lpc_forge/v2/src/bake.ts`;
  - generated: `public/assets/characters/townsfolk/look_00.png` … `look_23.png`, `public/assets/characters/townsfolk/CREDITS.md`, `public/assets/characters/townsfolk/recipes.json`, `src/data/townsfolk/looks.js`.
- Modify: `../tool_suite/lpc_forge/package.json` (`test` chain), `tools/test_townsfolk.mjs`

**Interfaces:**
- Consumes: from the Forge, `randomize(catalogue, comp, opts)`, `layersFor(catalogue, comp)`, `renderFrame`, `renderStanding`, `filesUsed`, `creditsMarkdown`, and the store's `catalogue`, `store`, `refreshRules`, `refreshCustom`.
- Produces:
  - **townsfolkLooks.js:**
    - `LOOK_CELL = 64`, `LOOK_COLS = 9`;
    - `LOOK_DIRS = ['up','left','down','right']`;
    - `LOOK_MOTIONS = { walk: { row: 0, frames: 8, first: 1 }, idle: { row: 4, frames: 2, first: 0 }, sit: { row: 8, frames: 3, first: 0 } }`;
    - `LOOK_SIZE = { w: 576, h: 768 }`;
    - `SIT_FRAME`;
    - `lookFrames(motion, dir) → frame indices`;
    - `lookKey(id) → 'tf_<id>'`.
  - **looks.js:** `LOOKS: [{ id, group: 'adult'|'child'|'guard', file }]`, ids `look_00`…`look_23`. `look_00`–`look_17` are adults, `look_18`–`look_20` children, and `look_21`–`look_23` guards.

- [ ] **Step 1: Write the failing Forge test** (`../tool_suite/lpc_forge/v2/tests/test_townsfolk_looks.mjs`)

```js
#!/usr/bin/env node
/** Townsfolk look recipes (W4). Run: node v2/tests/test_townsfolk_looks.mjs */
import { readFileSync } from 'node:fs';
import { townsfolkRecipes, LOOK_GROUPS, HUMAN_SKINS } from '../src/model/townsfolk.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
const check = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) passed++; else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
const tintCount = () => 10;

const looks = townsfolkRecipes(CAT, { seed: 1, tintCount });
check('24 looks', looks.length, 24);
check('groups', LOOK_GROUPS, [['adult', 18], ['child', 3], ['guard', 3]]);
check('ids', looks.map(l => l.id), Array.from({ length: 24 }, (_, i) => `look_${String(i).padStart(2, '0')}`));
check('group order', looks.map(l => l.group).join(','), [...Array(18).fill('adult'), ...Array(3).fill('child'), ...Array(3).fill('guard')].join(','));
check('same seed, same looks', JSON.stringify(townsfolkRecipes(CAT, { seed: 1, tintCount })), JSON.stringify(looks));
check('another seed differs', JSON.stringify(townsfolkRecipes(CAT, { seed: 2, tintCount })) === JSON.stringify(looks), false);
check('children have child bodies', looks.filter(l => l.group === 'child').every(l => l.comp.sel.body.id === 'bodies/child'), true);
check('adults are men or women', looks.filter(l => l.group !== 'child').every(l => ['bodies/male', 'bodies/female'].includes(l.comp.sel.body.id)), true);
check('guards wear plate and a kettle helm', looks.filter(l => l.group === 'guard').every(l => /^armour\/plate\//.test(l.comp.sel.torso_armour?.id) && l.comp.sel.hat?.id === 'helmet/kettle/adult'), true);
check('no one carries arms or wings', looks.every(l => ['weapon', 'shield', 'cape', 'backpack', 'wings', 'tail', 'horns'].every(s => !l.comp.sel[s])), true);
check('human skin only', looks.every(l => l.comp.sel.body.tint >= 0 && l.comp.sel.body.tint < HUMAN_SKINS), true);
check('one skin tone per person', looks.every(l => l.comp.sel.head?.tint === undefined || l.comp.sel.head.tint === l.comp.sel.body.tint), true);
check('every look has a head', looks.every(l => !!l.comp.sel.head?.id), true);

if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`test_townsfolk_looks: ${passed} passed`);
```

Run: `cd ../tool_suite/lpc_forge && node v2/tests/test_townsfolk_looks.mjs`
Expected: FAIL with `Cannot find module '…/v2/src/model/townsfolk.js'`.

- [ ] **Step 2: Write `../tool_suite/lpc_forge/v2/src/model/townsfolk.js`**

```js
/**
 * Townsfolk looks (W4, the game's world-scale spec): seeded random compositions
 * for a town's baked look set — human adults, children, and guards in plate.
 * The bake page (v2/bake.html) renders them. Pure — v2/tests/test_townsfolk_looks.mjs.
 */
import { randomize } from './randomize.js';

export const LOOK_GROUPS = [['adult', 18], ['child', 3], ['guard', 3]];
export const HUMAN_SKINS = 8;   // body palette 0–7: Natural … Ebony (8+ are fantasy and fur tones)
const NO_GEAR = ['weapon', 'shield', 'cape', 'backpack', 'wings', 'tail', 'horns'];

export function seeded(seed) {
    let s = seed;
    return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

export function townsfolkRecipes(catalogue, { seed = 1, groups = LOOK_GROUPS, tintCount = () => 0 } = {}) {
    const rng = seeded(seed), out = [];
    for (const [group, count] of groups) {
        for (let i = 0; i < count; i++) {
            const female = group !== 'child' && rng() < 0.5;
            const body = group === 'child' ? 'bodies/child' : female ? 'bodies/female' : 'bodies/male';
            const sel = { body: { id: body, tint: Math.floor(rng() * HUMAN_SKINS) } };
            const locked = new Set(['body', ...NO_GEAR]);
            if (group === 'guard') {
                sel.torso_armour = { id: female ? 'armour/plate/female' : 'armour/plate/male' };
                sel.legs = { id: female ? 'armour/plate/thin' : 'armour/plate/male' };
                sel.hat = { id: 'helmet/kettle/adult' };
                for (const s of ['torso_armour', 'legs', 'hat']) locked.add(s);
            }
            const id = `look_${String(out.length).padStart(2, '0')}`;
            const comp = randomize(catalogue, { name: id, sel }, { locked, rng, tintCount });
            out.push({ id, group, comp });
        }
    }
    return out;
}
```

Run: `cd ../tool_suite/lpc_forge && node v2/tests/test_townsfolk_looks.mjs`
Expected: `test_townsfolk_looks: 13 passed`.

If "one skin tone per person" fails because `randomize` keeps the head without a tint, read `randomize.js`'s skin block. The rule only requires that a tinted head matches the body, and the test allows an untinted head. Fix the recipe rather than the check.

Then, in `../tool_suite/lpc_forge/package.json`, append ` && node v2/tests/test_townsfolk_looks.mjs` to the end of `scripts.test`.

- [ ] **Step 3: Write the game-side layout `src/systems/townsfolkLooks.js`**

```js
// W4: the townsfolk look sheet — walk, idle and sit only, baked from the LPC Forge
// (v2/bake.html), 64 px cells, 9 columns. Each motion takes 4 rows: up, left, down,
// right. Walk keeps the standing pose in column 0 (frames 1–8 animate). Used by the
// bake page and TownsfolkManager.
export const LOOK_CELL = 64;
export const LOOK_COLS = 9;
export const LOOK_DIRS = ['up', 'left', 'down', 'right'];
export const LOOK_MOTIONS = {
    walk: { row: 0, frames: 8, first: 1 },
    idle: { row: 4, frames: 2, first: 0 },
    sit:  { row: 8, frames: 3, first: 0 },
};
export const LOOK_SIZE = { w: LOOK_COLS * LOOK_CELL, h: 12 * LOOK_CELL };
// Of the three sit poses, the one held while seated (checked on a baked sheet, Task 4).
export const SIT_FRAME = 2;

export function lookFrames(motion, dir) {
    const m = LOOK_MOTIONS[motion], row = m.row + LOOK_DIRS.indexOf(dir);
    return Array.from({ length: m.frames }, (_, i) => row * LOOK_COLS + m.first + i);
}
export const lookKey = id => `tf_${id}`;
```

- [ ] **Step 4: Write the bake page**

`../tool_suite/lpc_forge/v2/bake.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>LPC Forge — bake townsfolk</title>
  </head>
  <body>
    <pre id="log">baking…</pre>
    <script type="module" src="/src/bake.ts"></script>
  </body>
</html>
```

`../tool_suite/lpc_forge/v2/src/bake.ts`:

```ts
// W4: bake the game's townsfolk look set. Open /bake.html?seed=1 (dev server only);
// it downloads townsfolk_looks.zip, laid out as apps/amo paths: the sheets
// (src/systems/townsfolkLooks.js layout), recipes.json, CREDITS.md and
// src/data/townsfolk/looks.js. Unzip it into apps/amo (see the W4 plan, Task 4).
import JSZip from 'jszip'
import { catalogue, store, refreshRules, refreshCustom } from '@v2/store'
import { layersFor } from '@v2/model/composition.js'
import { townsfolkRecipes } from '@v2/model/townsfolk.js'
import { filesUsed, creditsMarkdown } from '@v2/model/exportSheet.js'
import { loadSheet, renderFrame, renderStanding } from '@v2/render/sheets.js'
import { resolveAnim } from '@game/systems/animResolve.js'
import { resolveMotion } from '@game/systems/motionRules.js'
import { TINT_PALETTE, tintMaterialFor } from '@game/systems/lpcPalettes.js'
import { LOOK_CELL, LOOK_DIRS, LOOK_MOTIONS, LOOK_SIZE } from '@game/systems/townsfolkLooks.js'

const MOTIONS = Object.keys(LOOK_MOTIONS)
const log = (s: string) => { document.getElementById('log')!.textContent += `\n${s}`; console.log(s) }
const blob = (c: HTMLCanvasElement) => new Promise<Blob>(res => c.toBlob(b => res(b!), 'image/png'))

async function sheetFor(layers: any[]) {
  const rules = [store.rules, store.ruleOverrides] as const
  const c = document.createElement('canvas')
  c.width = LOOK_SIZE.w; c.height = LOOK_SIZE.h
  const ctx = c.getContext('2d')!
  for (const [motion, m] of Object.entries(LOOK_MOTIONS)) {
    for (const [i, dir] of LOOK_DIRS.entries()) {
      const y = (m.row + i) * LOOK_CELL
      if (motion === 'walk') ctx.drawImage(await renderStanding(layers, dir, ...rules), 0, y)
      for (let f = 0; f < m.frames; f++) ctx.drawImage(await renderFrame(layers, motion, dir, f, ...rules), (m.first + f) * LOOK_CELL, y)
    }
  }
  return c
}

async function filesFor(layers: any[]) {
  const found = new Map<string, boolean>()
  const k = (l: any, c: string) => `${l.type}|${l.id}|${l.itemName ?? ''}|${l.color ?? ''}|${c}`
  await Promise.all(layers.flatMap((l: any) => [...new Set(MOTIONS.flatMap(m => {
    const r = resolveMotion(l, m, store.rules, store.ruleOverrides)
    return r.concrete ? [r.concrete] : []
  }).concat(resolveAnim(l, 'walk') ?? 'walk'))].map(async (c: string) => { found.set(k(l, c), (await loadSheet(l, c)) !== null) })))
  return filesUsed(layers, MOTIONS, store.rules, store.ruleOverrides, (l: any, c: string) => found.get(k(l, c)) ?? false)
}

async function bake() {
  await refreshRules()
  await refreshCustom()
  if (!store.rulesLoaded) throw new Error('motion rules did not load (is the API on :3001?)')
  const seed = Number(new URLSearchParams(location.search).get('seed') ?? 1)
  const recipes = townsfolkRecipes(catalogue, {
    seed,
    tintCount: (slot: string, entry: any) => (TINT_PALETTE as any)[tintMaterialFor(slot, entry)]?.length ?? 0,
  })
  const zip = new JSZip()
  const used = new Map<string, any>()
  for (const r of recipes) {
    const layers = layersFor(catalogue, r.comp)
    zip.file(`public/assets/characters/townsfolk/${r.id}.png`, await blob(await sheetFor(layers)))
    for (const u of await filesFor(layers)) if (u.path && !used.has(u.path)) used.set(u.path, u)
    log(`${r.id} (${r.group})`)
  }
  const res = await fetch('/api/credits/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paths: [...used.keys()] }) })
  if (!res.ok) throw new Error(`credits: HTTP ${res.status}`)
  const rows = await res.json()
  const byPath = new Map(rows.map((x: any) => [x.path, x]))
  const credits = [...used.values()].map((u: any) => ({ ...(byPath.get(u.path) as any), layerKey: u.layerKey, motions: u.motions }))
  zip.file('public/assets/characters/townsfolk/CREDITS.md', creditsMarkdown('Townsfolk looks (W4)', credits))
  zip.file('public/assets/characters/townsfolk/recipes.json', JSON.stringify({ seed, looks: recipes }, null, 2))
  zip.file('src/data/townsfolk/looks.js', `// AUTO-GENERATED by the LPC Forge bake page (v2/bake.html?seed=${seed}) — W4 townsfolk looks.
// Re-bake rather than edit. Sheet layout: src/systems/townsfolkLooks.js; credits and recipes
// next to the sheets in public/assets/characters/townsfolk/.
export const LOOKS = [
${recipes.map(r => `    { id: '${r.id}', group: '${r.group}', file: 'assets/characters/townsfolk/${r.id}.png' },`).join('\n')}
];
`)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(await zip.generateAsync({ type: 'blob' }))
  a.download = 'townsfolk_looks.zip'
  a.click()
  log(`BAKE DONE ${recipes.length}`)
}

bake().catch(e => log(`BAKE FAILED ${e.message}`))
```

- [ ] **Step 5: Bake and unpack**

Run: `node ../tool_suite/lpc_forge/tools/console.mjs "http://127.0.0.1:5179/bake.html?seed=1" 120000 --download /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/bake`
Expected: 24 `[log] look_NN (group)` lines, then `[log] BAKE DONE 24`, and no `[exception]`. The file `SCRATCH/bake/townsfolk_looks.zip` exists.

If the run ends before `BAKE DONE`, raise the wait to 240000 and run it again.

Run: `python3 -m zipfile -e /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/bake/townsfolk_looks.zip .`
Expected: `public/assets/characters/townsfolk/` holds `look_00.png`…`look_23.png`, `CREDITS.md` and `recipes.json`, and `src/data/townsfolk/looks.js` exists.

- [ ] **Step 6: Look at a baked sheet and confirm the sit frame**

Run: `python3 -c "from PIL import Image; im=Image.open('public/assets/characters/townsfolk/look_00.png'); print(im.size); im.resize((im.width*2, im.height*2), Image.NEAREST).save('/tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/look_00_x2.png')"`
Expected: `(576, 768)`.

Read `SCRATCH/look_00_x2.png` with the Read tool. The sheet should show:
- rows 0–3: a walking person in four directions, standing pose in column 0;
- rows 4–7: idle;
- rows 8–11: three sit poses.

Pick the column of the pose that looks seated on a bench. If it is not column 2, set `SIT_FRAME` in `src/systems/townsfolkLooks.js` to that column and record a ruling. Also confirm that guards (`look_21`) show armour and a helmet, and children (`look_18`) are small.

- [ ] **Step 7: Add the game-side test and run it**

Append to `tools/test_townsfolk.mjs`:

```js
// ---- Looks
{
    const L = await import('../src/systems/townsfolkLooks.js');
    const { LOOKS } = await import('../src/data/townsfolk/looks.js');
    eq(L.LOOK_SIZE, { w: 576, h: 768 }, 'look sheet size');
    eq(L.lookFrames('walk', 'up'), [1, 2, 3, 4, 5, 6, 7, 8], 'walk up skips the standing column');
    eq(L.lookFrames('idle', 'down'), [6 * 9, 6 * 9 + 1], 'idle down: row 6');
    eq(L.lookFrames('sit', 'right').length, 3, 'three sit poses');
    ok(L.SIT_FRAME >= 0 && L.SIT_FRAME < 3, 'the held sit pose is one of them');
    eq(LOOKS.length, 24, '24 baked looks');
    eq(LOOKS.map(l => l.group).filter(g => g === 'child').length, 3, 'three children');
    eq(LOOKS.map(l => l.group).filter(g => g === 'guard').length, 3, 'three guards');
    for (const l of LOOKS) {
        const png = readFileSync(new URL(`../public/${l.file}`, import.meta.url));
        eq([png.readUInt32BE(16), png.readUInt32BE(20)], [576, 768], `${l.id} is a 576×768 sheet`);
    }
    ok(readFileSync(new URL('../public/assets/characters/townsfolk/CREDITS.md', import.meta.url), 'utf8').length > 200, 'the looks are credited');
}
```

Run: `node tools/test_townsfolk.mjs`
Expected: `test_townsfolk: N checks passed`.

- [ ] **Step 8: Commit (both apps)**

```bash
git add src/systems/townsfolkLooks.js src/data/townsfolk/looks.js public/assets/characters/townsfolk tools/test_townsfolk.mjs ../tool_suite/lpc_forge/v2/src/model/townsfolk.js ../tool_suite/lpc_forge/v2/tests/test_townsfolk_looks.mjs ../tool_suite/lpc_forge/v2/bake.html ../tool_suite/lpc_forge/v2/src/bake.ts ../tool_suite/lpc_forge/package.json
git commit -m "feat(amo,forge): 24 baked townsfolk looks — Forge bake page (seeded recipes: adults, children, guards), walk/idle/sit sheets with credits"
```

---

### Task 5: Thaloria's people

**Files:**
- Create: `src/data/townsfolk/thaloria.js`, `src/data/townsfolk/index.js`
- Modify:
  - `tools/maps/gen_thaloria.py`, then regenerate `src/data/maps/thaloria.js`;
  - `src/data/townsfolk/walk.js` (regenerate);
  - `tools/test_townsfolk.mjs`, `tools/test_chapter3.mjs` (lines 95–96 and 108), `tools/test_fog_map.mjs` (the cartographer check).

**Interfaces:**
- Consumes: `makeTown`, `whereAt`, `namedPeople`, `validateTown` (Task 2); `ROLES` (Task 2); `WALK` (Task 1); `LOOKS` (Task 4).
- Produces:
  - **index.js:**
    - `TOWN_IDS`;
    - `getTown(id) → town | null`;
    - `townFor(mapId) → town | null`, the town whose tree holds that map;
    - `namedPeopleAt(minutes) → [{ npcId, mapId, x, y }]`, across every town.
  - **thaloria.js:** `THALORIA_TOWN`.

- [ ] **Step 1: Add the failing tests**

Append to `tools/test_townsfolk.mjs`:

```js
// ---- Thaloria's people
{
    const TF = await import('../src/data/townsfolk/index.js');
    const { LOOKS } = await import('../src/data/townsfolk/looks.js');
    const { NPCS } = await import('../src/data/npcs.js');
    const { getMap } = await import('../src/data/maps/index.js');
    const town = TF.getTown('thaloria');
    ok(TF.TOWN_IDS.every(id => W.WALK_ROOTS.includes(id)), 'every town has baked walk grids');
    eq(S.validateTown(town, { looks: LOOKS.map(l => l.id) }), [], 'Thaloria\'s people all have a place, a path and a look');
    ok(town.residents.length >= 20, 'twenty-odd people');
    eq(new Set(town.residents.map(r => r.id)).size, town.residents.length, 'resident ids are unique');
    eq(TF.townFor('thaloria_inn_cellar'), town, 'the inn\'s cellar belongs to Thaloria');
    eq(TF.townFor('east_road'), null, 'the East Road has no town');
    const named = town.residents.filter(r => r.npc).map(r => r.npc.id).sort();
    eq(named, ['innkeeper', 'thaloria_cartographer', 'thaloria_merchant', 'thaloria_trader'], 'the four named people live here');
    ok(named.every(id => NPCS[id]), 'and are in the NPC table');
    ok(!(getMap('thaloria').spawns.npcs ?? []).some(n => named.includes(n.id)), 'they no longer stand as fixed spawns');

    for (const r of town.residents) {
        let prev = S.whereAt(r, D, town);
        for (let t = D + 0.25; t <= D + 2880; t += 0.25) {
            const p = S.whereAt(r, t, town);
            if (p.mapId === prev.mapId) assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) <= S.PX_PER_MIN * 0.25 + 0.01, `${r.id} jumps at minute ${t - D}`);
            prev = p;
        }
        n++;
    }

    // Spec acceptance, on paper
    const at = h => town.residents.map(r => S.whereAt(r, D + h * 60, town)).filter(p => p.visible);
    const tile = p => [Math.floor(p.x / 32), Math.floor(p.y / 32)];
    const market = at(9).filter(p => p.mapId === 'thaloria' && (([x, y]) => x >= 9 && x < 23 && y >= 10 && y < 25)(tile(p)));
    ok(market.length >= 8, `09:00: the market and square are busy (${market.length})`);
    const late = at(23);
    ok(late.filter(p => p.mapId === 'thaloria').length <= 4, `23:00: the streets are nearly empty (${late.filter(p => p.mapId === 'thaloria').length})`);
    ok(late.filter(p => p.mapId === 'thaloria_inn').length >= 8, `23:00: the inn is full (${late.filter(p => p.mapId === 'thaloria_inn').length})`);

    // Following one person through a day: home → work → inn → home
    const who = town.residents.find(r => r.id === 'stallholder_a'), seq = [];
    for (let t = D + 60; t <= D + 1440 + 120; t += 5) {
        const a = S.whereAt(who, t, town).activity;
        if (seq.at(-1) !== a) seq.push(a);
    }
    eq(seq, ['sleep', 'travel', 'work', 'travel', 'sit', 'travel', 'sleep'], 'a stallholder\'s day');

    const people = TF.namedPeopleAt(D + 10 * 60);
    ok(people.some(p => p.npcId === 'innkeeper' && p.mapId === 'thaloria_inn'), '10:00: the Innkeeper is in the inn');
    ok(people.some(p => p.npcId === 'thaloria_trader' && p.mapId === 'thaloria'), '10:00: the Trader is outside');
}
```

Run: `node tools/test_townsfolk.mjs`
Expected: FAIL with `Cannot find module '…/src/data/townsfolk/index.js'`.

- [ ] **Step 2: Free the work spots and drop the fixed NPCs in `tools/maps/gen_thaloria.py`**

1. Directly after the line `reserve(16, 22, 17, 22)    # the merchant`, add:

```python
# W4 townsfolk work spots (src/data/townsfolk/thaloria.js): nothing drawn on them
reserve(11, 22, 11, 22)    # stall keeper A
reserve(14, 22, 14, 22)    # stall keeper B
reserve(22, 23, 22, 23)    # the yard labourer, by the hearth
reserve(25, 20, 25, 20)    # the woodpile porter
reserve(10, 14, 10, 14)    # the beggar's corner
```

2. In the output template, replace the whole `npcs: [ … ],` block, from `        npcs: [` to its closing `        ],`, with:

```python
        // W4: the Innkeeper, the Trader, the Merchant and the Cartographer live on
        // schedules now (src/data/townsfolk/thaloria.js)
        npcs: [],
```

3. Leave `reserve(19, 22, 19, 22)` and `reserve(3, 19, 7, 19)` as they are. The Cartographer's stall and the Trader's spot stay free.

Run: `python3 tools/maps/gen_thaloria.py && node tools/gen_walk_grids.mjs`
Expected: `wrote src/data/maps/thaloria.js: 32x26, … sprites`, then `wrote src/data/townsfolk/walk.js: …`.

- [ ] **Step 3: Write `src/data/townsfolk/thaloria.js`**

```js
// W4: Thaloria's people and the places their days take them. Hand-written; tile
// coordinates on the city map unless a place names an interior. Day shapes come
// from roles.js; '@home', '@work', '@evening', '@wander', '@patrol' are each
// resident's own fields. A place with `indoors` is the tile in front of a house
// door (no interior): they go in and are gone until their next slot. Named people
// (npc) keep their dialogue, quests and shops (data/npcs.js, dialogues.js).
// No new lore: every role here is unnamed.
const seat = (x, y, facing) => ({ interior: 'thaloria_inn', x, y, facing });

export const THALORIA_TOWN = {
    id: 'thaloria',
    places: {
        // homes
        college:      { x: 5, y: 8, indoors: true },     // the college's scholars sleep in
        house_north:  { x: 20, y: 8, indoors: true },
        house_east:   { x: 26, y: 8, indoors: true },
        house_south:  { x: 26, y: 18, indoors: true },
        teal_house:   { interior: 'thaloria_house_teal', x: 5, y: 6 },
        inn_rooms:    { interior: 'thaloria_inn', x: 14, y: 4, indoors: true },   // upstairs
        // work
        stall_merchant: { x: 16, y: 22, facing: 'down' },
        stall_carto:    { x: 19, y: 22, facing: 'down' },
        stall_a:        { x: 11, y: 22, facing: 'down' },
        stall_b:        { x: 14, y: 22, facing: 'down' },
        inn_door_yard:  { x: 7, y: 19, facing: 'down' },
        inn_bar:        { interior: 'thaloria_inn', x: 12, y: 6, facing: 'down' },
        well:           { x: 13, y: 15, facing: 'up' },
        hearth_yard:    { x: 22, y: 23, facing: 'right' },
        woodpile:       { x: 25, y: 20, facing: 'down' },
        tower_desk:     { interior: 'thaloria_bell_tower', x: 5, y: 4, facing: 'up' },
        beggar_corner:  { x: 10, y: 14, facing: 'right', outdoors: true },
        // the inn's common room: one seat each
        inn_seat_1: seat(3, 4, 'down'),  inn_seat_2: seat(4, 4, 'down'),  inn_seat_3: seat(7, 4, 'down'),
        inn_seat_4: seat(8, 4, 'down'),  inn_seat_5: seat(2, 6, 'up'),    inn_seat_6: seat(3, 6, 'up'),
        inn_seat_7: seat(7, 6, 'up'),    inn_seat_8: seat(8, 6, 'up'),    inn_seat_9: seat(9, 6, 'up'),
        inn_seat_10: seat(4, 7, 'up'),   inn_seat_11: seat(5, 7, 'up'),   inn_seat_12: seat(6, 7, 'up'),
        // areas
        square:      { x: 11, y: 10, w: 10, h: 6 },
        high_street: { x: 3, y: 12, w: 20, h: 2 },
        market:      { x: 9, y: 19, w: 14, h: 5 },
        // patrols
        watch_high_street: { route: [[2, 12], [29, 12], [29, 13], [2, 13]] },
        watch_market:      { route: [[15, 8], [16, 18], [27, 18], [3, 18], [16, 18]] },
    },
    residents: [
        // named — they keep their dialogue, quests and shops
        { id: 'innkeeper', role: 'merchant', look: 'look_00',
          schedule: [{ from: 1, to: 7, at: 'inn_rooms', activity: 'sleep' }, { from: 7, to: 1, at: 'inn_bar', activity: 'work' }],
          npc: { id: 'innkeeper', name: 'Innkeeper', dialogue: 'innkeeper_greeting', afterDialogue: 'innkeeper_after' } },
        { id: 'thaloria_trader', role: 'merchant', look: 'look_01',
          schedule: [{ from: 23, to: 8, at: 'inn_rooms', activity: 'sleep' }, { from: 8, to: 19, at: 'inn_door_yard', activity: 'work' },
                     { from: 19, to: 23, at: 'inn_seat_1', activity: 'sit' }],
          npc: { id: 'thaloria_trader', name: 'Trader', dialogue: 'trader_greeting', afterDialogue: 'trader_after' } },
        { id: 'thaloria_merchant', role: 'merchant', look: 'look_02', home: 'house_south', work: 'stall_merchant', evening: 'inn_seat_2',
          npc: { id: 'thaloria_merchant', name: 'Merchant', isShop: true, shopName: 'THALORIA MARKET',
                 dialogue: 'thaloria_merchant_greeting', afterDialogue: 'thaloria_merchant_greeting' } },
        { id: 'thaloria_cartographer', role: 'merchant', look: 'look_03', home: 'house_east', work: 'stall_carto', evening: 'inn_seat_3',
          npc: { id: 'thaloria_cartographer', name: 'Cartographer', isShop: true, shopName: 'THE CARTOGRAPHER', catalog: 'cartographer',
                 dialogue: 'cartographer_greeting', afterDialogue: 'cartographer_greeting' } },
        // the market
        { id: 'stallholder_a', role: 'merchant', look: 'look_04', home: 'house_north', work: 'stall_a', evening: 'inn_seat_4' },
        { id: 'stallholder_b', role: 'merchant', look: 'look_05', home: 'house_south', work: 'stall_b', evening: 'inn_seat_5' },
        { id: 'labourer_well', role: 'labourer', look: 'look_06', home: 'house_north', work: 'well', evening: 'inn_seat_6' },
        { id: 'labourer_yard', role: 'labourer', look: 'look_07', home: 'house_east', work: 'hearth_yard', evening: 'inn_seat_7' },
        { id: 'porter', role: 'labourer', look: 'look_08', home: 'teal_house', work: 'woodpile', evening: 'inn_seat_12' },
        { id: 'noble_market', role: 'noble', look: 'look_09', home: 'college', wander: 'market', evening: 'inn_seat_8' },
        { id: 'noble_square', role: 'noble', look: 'look_10', home: 'college', wander: 'square', evening: 'inn_seat_9' },
        { id: 'child_square', role: 'child', look: 'look_18', home: 'house_north', wander: 'square' },
        { id: 'child_market', role: 'child', look: 'look_19', home: 'house_south', wander: 'market' },
        { id: 'child_street', role: 'child', look: 'look_20', home: 'house_east', wander: 'high_street' },
        { id: 'scholar', role: 'priest', look: 'look_11', home: 'college', work: 'tower_desk' },
        { id: 'beggar', role: 'beggar', look: 'look_12', work: 'beggar_corner' },
        { id: 'drunk_one', role: 'drunk', look: 'look_13', home: 'house_east', evening: 'inn_seat_10', wander: 'high_street' },
        { id: 'drunk_two', role: 'drunk', look: 'look_14', home: 'house_north', evening: 'inn_seat_11', wander: 'high_street' },
        // the watch
        { id: 'guard_day_street', role: 'guard', shift: 'day', look: 'look_21', home: 'college', patrol: 'watch_high_street' },
        { id: 'guard_day_market', role: 'guard', shift: 'day', look: 'look_22', home: 'house_south', patrol: 'watch_market' },
        { id: 'guard_night_street', role: 'guard', shift: 'night', look: 'look_23', home: 'college', patrol: 'watch_high_street' },
        { id: 'guard_night_market', role: 'guard', shift: 'night', look: 'look_21', home: 'house_east', patrol: 'watch_market' },
    ],
};
```

- [ ] **Step 4: Write `src/data/townsfolk/index.js`**

```js
// W4: the towns (one per region with people). A town's nav is built on first use.
// townFor(mapId) finds the town a map belongs to — the town map itself or any
// interior behind its doors.
import { getMap } from '../maps/index.js';
import { makeTown, namedPeople } from '../../systems/schedules.js';
import { WALK } from './walk.js';
import { ROLES } from './roles.js';
import { THALORIA_TOWN } from './thaloria.js';

const DATA = { thaloria: THALORIA_TOWN };
export const TOWN_IDS = Object.keys(DATA);
const built = new Map();

export function getTown(id) {
    if (!DATA[id]) return null;
    if (!built.has(id)) built.set(id, makeTown(DATA[id], { getMap, walk: WALK, roles: ROLES }));
    return built.get(id);
}

export function townFor(mapId) {
    for (const id of TOWN_IDS) { const t = getTown(id); if (t.nav.has(mapId)) return t; }
    return null;
}

export const namedPeopleAt = minutes => TOWN_IDS.flatMap(id => namedPeople(getTown(id), minutes));
```

- [ ] **Step 5: Run the tests and settle the places**

Run: `node tools/test_townsfolk.mjs`
Expected: `test_townsfolk: N checks passed`.

If `validateTown` reports places that are "not walkable" (an inn seat on a table, a stall front under a bush), move each to the nearest walkable tile. `nav.snap('thaloria_inn', x, y)` prints a candidate. Record one ruling line listing the moves.

If the acceptance counts fail, adjust schedules or seats, not the thresholds, and record a ruling.

- [ ] **Step 6: Read the named NPCs from the town in the Chapter 3 and map tests**

In `tools/test_chapter3.mjs`, replace

```js
    const npcIds = m => (m.spawns.npcs ?? []).map(n => n.id);
    ok(npcIds(T).includes('innkeeper') && npcIds(T).includes('thaloria_trader'), 'the inn\'s people are in Thaloria');
```

with

```js
    const { getTown } = await import('../src/data/townsfolk/index.js');
    const townIds = (getTown(T.id)?.residents ?? []).filter(r => r.npc).map(r => r.npc.id);
    const npcIds = m => [...(m.spawns.npcs ?? []).map(n => n.id), ...(m === T ? townIds : [])];
    ok(npcIds(T).includes('innkeeper') && npcIds(T).includes('thaloria_trader'), 'the inn\'s people live in Thaloria');
```

and replace

```js
    for (const m of [T, E]) for (const n of m.spawns.npcs ?? []) ok(!n.id || NPCS[n.id], `${m.id}: NPC ${n.id} known`);
```

with

```js
    for (const m of [T, E]) for (const id of npcIds(m)) ok(!id || NPCS[id], `${m.id}: NPC ${id} known`);
```

In `tools/test_fog_map.mjs`, replace

```js
    const carto = t.spawns.npcs.find(n => n.catalog === 'cartographer');
    ok(carto && carto.isShop, 'Thaloria has a cartographer shop');
    ok(t.tiles[carto.y][carto.x] !== 1, 'standing on open ground');
```

with

```js
    const { THALORIA_TOWN } = await import('../src/data/townsfolk/thaloria.js');
    const carto = THALORIA_TOWN.residents.find(r => r.npc?.catalog === 'cartographer');
    ok(carto && carto.npc.isShop, 'Thaloria has a cartographer shop');
    const stall = THALORIA_TOWN.places[carto.work];
    ok(t.tiles[stall.y][stall.x] !== 1, 'whose stall stands on open ground');
```

- [ ] **Step 7: Run the suite and commit**

Run: `npm test 2>&1 | tail -5`
Expected: no failure. `test_chapter3`, `test_fog_map` and `test_townsfolk` all pass.

```bash
git add src/data/townsfolk/thaloria.js src/data/townsfolk/index.js src/data/townsfolk/walk.js tools/maps/gen_thaloria.py src/data/maps/thaloria.js tools/test_townsfolk.mjs tools/test_chapter3.mjs tools/test_fog_map.mjs
git commit -m "feat(amo): Thaloria's people — 22 residents on schedules (the four named NPCs among them); the market busy by day, the inn full at night"
```

---

### Task 6: Live townsfolk in the game

**Files:**
- Create: `src/systems/crowd.js`, `src/systems/TownsfolkManager.js`
- Modify: `src/scenes/GameScene.js`, `tools/test_townsfolk.mjs`

**Interfaces:**
- Consumes: `whereAt` (Task 2); `townFor` (Task 5); `LOOKS`, `lookKey`, `lookFrames`, `LOOK_DIRS`, `SIT_FRAME` (Task 4); `isNight` from `gameClock.js`.
- Produces:
  - **crowd.js:**
    - `LIVE_CAP = 30`, `WAIT_BEFORE_SIDESTEP_MS = 600`, `SIDESTEP_PX = 18`;
    - `chooseLive(cands, px, py, cap) → ids`;
    - `inTheWay(at, next, player, reach = 22) → boolean`;
    - `steer(state, { blocked, hold, dtMs, moving, sideFree }) → state`, where `state = { lagMin, blockedMs, side, offset }`.
  - **TownsfolkManager:**
    - `static preload(scene, town)`, `new TownsfolkManager(scene, town, mapId)`;
    - `.group` (physics group), `.live` (`Map` from resident id to sprite);
    - `update(delta, minutes, player, isPxActive)`;
    - `lanterns(minutes) → [{ x, y }]`;
    - `updatePrompts(near)`, `anyNear(near) → boolean`;
    - `holdFor(sprite, ms)`, `say(sprite, text)`, `destroy()`.
  - **Each live sprite carries:** `resident`, `steer`, `activity`, `npcDef` (named only), `talked`, `ePrompt`.

- [ ] **Step 1: Add the failing crowd tests**

```js
// ---- Crowds
{
    const C = await import('../src/systems/crowd.js');
    eq([C.LIVE_CAP, C.WAIT_BEFORE_SIDESTEP_MS], [30, 600], 'cap and wait from the spec');
    const cands = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, x: i * 10, y: 0 }));
    eq(C.chooseLive(cands, 0, 0).length, 30, 'at most 30 live');
    eq(C.chooseLive(cands, 395, 0, 2), ['p39', 'p38'], 'nearest first');
    ok(C.inTheWay({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 3 }), 'the player just ahead is in the way');
    ok(!C.inTheWay({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: -15, y: 0 }), 'behind is not');
    ok(!C.inTheWay({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 15, y: 30 }), 'well to the side is not');
    ok(!C.inTheWay({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 1 }), 'standing still: never in the way');

    let s = {};
    for (let i = 0; i < 5; i++) s = C.steer(s, { blocked: true, dtMs: 100, moving: true, sideFree: 1 });
    ok(Math.abs(s.lagMin - 0.5) < 1e-9 && s.side === 0, 'blocked for 0.5 s: waits, half a game minute behind');
    s = C.steer(s, { blocked: true, dtMs: 100, moving: true, sideFree: -1 });
    eq(s.side, -1, 'after 0.6 s: steps aside, to the free side');
    for (let i = 0; i < 10; i++) s = C.steer(s, { blocked: true, dtMs: 100, moving: true, sideFree: -1 });
    ok(s.offset === C.SIDESTEP_PX && Math.abs(s.lagMin - 0.6) < 1e-9, 'slides out to the full step and keeps walking');
    for (let i = 0; i < 20; i++) s = C.steer(s, { blocked: false, dtMs: 100, moving: true, sideFree: 1 });
    ok(s.offset === 0 && s.side === 0, 'clear again: back onto the path');
    ok(s.lagMin < 0.6, 'and catching up on the clock');
    for (let i = 0; i < 100; i++) s = C.steer(s, { blocked: false, dtMs: 100, moving: true, sideFree: 1 });
    eq(s.lagMin, 0, 'caught up in the end');
    let h = {};
    for (let i = 0; i < 30; i++) h = C.steer(h, { blocked: false, hold: true, dtMs: 100, moving: true, sideFree: 1 });
    ok(Math.abs(h.lagMin - 3) < 1e-9 && h.side === 0, 'held in talk for 3 s: stands, three minutes behind');
    eq(C.steer({ lagMin: 2, offset: 0 }, { blocked: false, dtMs: 16, moving: false }).lagMin, 0, 'not walking: back on the clock');
}
```

Run: `node tools/test_townsfolk.mjs`
Expected: FAIL with `Cannot find module '…/src/systems/crowd.js'`.

- [ ] **Step 2: Write `src/systems/crowd.js`**

```js
// W4: which townsfolk are live (at most LIVE_CAP, nearest the player first) and how
// a live walker gives way: it waits behind a player in its path, after
// WAIT_BEFORE_SIDESTEP_MS slides aside and walks on, then eases back onto its path
// and catches up with the clock (lagMin game minutes behind, made up at 1.5×).
// Pure — tools/test_townsfolk.mjs.
import { MINUTES_PER_REAL_SECOND } from './gameClock.js';

export const LIVE_CAP = 30;
export const WAIT_BEFORE_SIDESTEP_MS = 600;
export const SIDESTEP_PX = 18;
const CATCH_UP = 0.5, SLIDE_OUT = 0.06, SLIDE_BACK = 0.03;   // px per ms

export function chooseLive(cands, px, py, cap = LIVE_CAP) {
    return cands.map(c => ({ id: c.id, d: (c.x - px) ** 2 + (c.y - py) ** 2 }))
        .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1)).slice(0, cap).map(c => c.id);
}

export function inTheWay(at, next, player, reach = 22) {
    const dx = next.x - at.x, dy = next.y - at.y, len = Math.hypot(dx, dy);
    if (len < 0.01) return false;
    const px = player.x - at.x, py = player.y - at.y, ahead = (px * dx + py * dy) / len;
    return ahead > 0 && ahead <= reach && Math.abs(px * dy - py * dx) / len < 14;
}

export function steer(state, { blocked, hold = false, dtMs, moving, sideFree = 1 }) {
    const dtMin = (dtMs / 1000) * MINUTES_PER_REAL_SECOND;
    let { lagMin = 0, blockedMs = 0, side = 0, offset = 0 } = state;
    if (!moving) return { lagMin: 0, blockedMs: 0, side: 0, offset: Math.max(0, offset - dtMs * SLIDE_BACK) };
    if (hold) return { lagMin: lagMin + dtMin, blockedMs: 0, side, offset };
    if (blocked && side === 0) {
        blockedMs += dtMs; lagMin += dtMin;
        if (blockedMs >= WAIT_BEFORE_SIDESTEP_MS) side = sideFree;
    } else if (blocked) {
        offset = Math.min(SIDESTEP_PX, offset + dtMs * SLIDE_OUT);
    } else {
        blockedMs = 0;
        if (offset > 0) offset = Math.max(0, offset - dtMs * SLIDE_BACK);
        if (offset === 0) side = 0;
        lagMin = Math.max(0, lagMin - dtMin * CATCH_UP);
    }
    return { lagMin, blockedMs, side, offset };
}
```

Run: `node tools/test_townsfolk.mjs`
Expected: `test_townsfolk: N checks passed`.

- [ ] **Step 3: Write `src/systems/TownsfolkManager.js`**

```js
// W4: the townsfolk you can see — live sprites for the residents whose clock
// position is on this map and in a built chunk (W2), at most LIVE_CAP, nearest
// first. Each follows whereAt() and gives way to the player (crowd.js). Phaser
// glue; the rules are in schedules.js and crowd.js.
import { whereAt } from './schedules.js';
import { chooseLive, inTheWay, steer } from './crowd.js';
import { LOOK_DIRS, lookFrames, lookKey, SIT_FRAME } from './townsfolkLooks.js';
import { isNight } from './gameClock.js';
import { LOOKS } from '../data/townsfolk/looks.js';

const RESELECT_MS = 250;
const FEET_LIFT = 16;   // sprite centre above the clock position (the feet sit near the tile centre)
const LOOK_FILE = new Map(LOOKS.map(l => [l.id, l.file]));
const textStyle = fill => ({ font: '7px monospace', fill, stroke: '#000', strokeThickness: 1 });

export class TownsfolkManager {
    static preload(scene, town) {
        for (const id of new Set(town.residents.map(r => r.look))) {
            const key = lookKey(id);
            if (LOOK_FILE.has(id) && !scene.textures.exists(key)) scene.load.spritesheet(key, LOOK_FILE.get(id), { frameWidth: 64, frameHeight: 64 });
        }
    }

    constructor(scene, town, mapId) {
        Object.assign(this, { scene, town, mapId });
        this.group = scene.physics.add.group({ allowGravity: false, immovable: true });
        this.live = new Map();
        this._byId = new Map(town.residents.map(r => [r.id, r]));
        this._reselect = 0;
    }

    update(delta, minutes, player, isPxActive) {
        this._reselect -= delta;
        if (this._reselect <= 0) { this._reselect = RESELECT_MS; this._select(minutes, player, isPxActive); }
        for (const spr of [...this.live.values()]) this._move(spr, delta, minutes, player);
    }

    _select(minutes, player, isPxActive) {
        const cands = [];
        for (const r of this.town.residents) {
            const p = whereAt(r, minutes - (this.live.get(r.id)?.steer.lagMin ?? 0), this.town);
            if (p?.visible && p.mapId === this.mapId && isPxActive(p.x, p.y) && this.scene.textures.exists(lookKey(r.look))) cands.push({ id: r.id, x: p.x, y: p.y });
        }
        const keep = new Set(chooseLive(cands, player.x, player.y));
        for (const [id, spr] of this.live) if (!keep.has(id)) this._despawn(id, spr);
        for (const c of cands) if (keep.has(c.id) && !this.live.has(c.id)) this._spawn(this._byId.get(c.id), c);
    }

    _ensureAnims(key) {
        const anims = this.scene.anims;
        for (const dir of LOOK_DIRS) {
            const mk = (k, frames, frameRate) => { if (!anims.exists(k)) anims.create({ key: k, frames: frames.map(frame => ({ key, frame })), frameRate, repeat: -1 }); };
            mk(`${key}_walk_${dir}`, lookFrames('walk', dir), 10);
            mk(`${key}_idle_${dir}`, lookFrames('idle', dir), 2);
            mk(`${key}_sit_${dir}`, [lookFrames('sit', dir)[SIT_FRAME]], 1);
        }
    }

    _spawn(r, at) {
        const key = lookKey(r.look);
        this._ensureAnims(key);
        const spr = this.group.create(at.x, at.y - FEET_LIFT, key, lookFrames('idle', 'down')[0]);
        spr.body.setSize(20, 14).setOffset(22, 46);
        spr.body.immovable = true;
        spr.body.pushable = false;
        Object.assign(spr, { resident: r, steer: {}, holdUntil: 0, activity: null });
        if (r.npc) {
            spr.npcDef = r.npc;
            spr.talked = !!this.scene._talkedNpcs?.has(r.npc.id);
            spr.nameLabel = this.scene.add.text(spr.x, spr.y - 30, r.npc.name, textStyle(r.npc.isShop ? '#ffdd88' : '#aaffaa')).setOrigin(0.5, 1).setDepth(25).setResolution(3);
        }
        spr.ePrompt = this.scene.add.text(spr.x, spr.y - 40, r.npc?.isShop ? '[E] Shop' : '[E]', { font: '7px monospace', fill: '#ffff88' })
            .setOrigin(0.5, 1).setDepth(25).setResolution(3).setAlpha(0);
        this.live.set(r.id, spr);
    }

    _despawn(id, spr) {
        spr.nameLabel?.destroy(); spr.ePrompt?.destroy(); spr.bubble?.destroy();
        spr.destroy();
        this.live.delete(id);
    }

    _move(spr, delta, minutes, player) {
        const r = spr.resident, hold = this.scene.time.now < spr.holdUntil;
        const t = minutes - (spr.steer.lagMin ?? 0);
        const p = whereAt(r, t, this.town);
        if (!p || !p.visible || p.mapId !== this.mapId) { this._despawn(r.id, spr); return; }
        const ahead = p.moving ? whereAt(r, t + 0.05, this.town) : null;
        const next = ahead && ahead.mapId === p.mapId ? ahead : p;
        const feet = { x: player.x, y: player.y + 16 };
        const blocked = !hold && p.moving && inTheWay(p, next, feet);
        const dx = next.x - p.x, dy = next.y - p.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
        const free = this.town.nav.isWalkable(this.mapId, Math.floor((p.x + nx * 32) / 32), Math.floor((p.y + ny * 32) / 32));
        spr.steer = steer(spr.steer, { blocked, hold, dtMs: delta, moving: p.moving, sideFree: free ? 1 : -1 });
        const off = spr.steer.side * spr.steer.offset;
        spr.body.reset(p.x + nx * off, p.y + ny * off - FEET_LIFT);
        spr.setDepth(spr.y);
        spr.activity = p.activity;
        const facing = hold
            ? (Math.abs(player.x - spr.x) > Math.abs(player.y - spr.y) ? (player.x > spr.x ? 'right' : 'left') : (player.y > spr.y ? 'down' : 'up'))
            : p.facing;
        const pose = hold || (blocked && !spr.steer.side) ? 'idle' : p.pose;
        const anim = `${spr.texture.key}_${pose}_${facing}`;
        if (spr.anims.currentAnim?.key !== anim) spr.play(anim);
        spr.nameLabel?.setPosition(spr.x, spr.y - 30);
        spr.ePrompt?.setPosition(spr.x, spr.y - 40);
        spr.bubble?.setPosition(spr.x, spr.y - (spr.nameLabel ? 40 : 30));
    }

    lanterns(minutes) {
        if (!isNight(minutes)) return [];
        return [...this.live.values()].filter(s => s.resident.role === 'guard').map(s => ({ x: s.x, y: s.y }));
    }

    updatePrompts(near) { for (const s of this.live.values()) s.ePrompt?.setAlpha(near(s) && !s.bubble ? 1 : 0); }
    anyNear(near) { for (const s of this.live.values()) if (near(s)) return true; return false; }
    holdFor(spr, ms) { spr.holdUntil = this.scene.time.now + ms; }

    say(spr, text) {
        spr.bubble?.destroy();
        spr.bubble = this.scene.add.text(spr.x, spr.y - 30, text, {
            font: '7px monospace', fill: '#ffffff', backgroundColor: '#000000aa', padding: { x: 3, y: 2 },
            wordWrap: { width: 140 }, align: 'center',
        }).setOrigin(0.5, 1).setDepth(26).setResolution(3);
        const b = spr.bubble;
        this.scene.time.delayedCall(2600, () => { if (spr.bubble === b) { b.destroy(); spr.bubble = null; } });
    }

    destroy() {
        for (const [id, spr] of [...this.live]) this._despawn(id, spr);
        this.group.destroy(true);
    }
}
```

- [ ] **Step 4: Wire it into GameScene**

In `src/scenes/GameScene.js`:

1. **Imports:** add these next to the other `../systems/` and `../data/` imports.

```js
import { TownsfolkManager } from '../systems/TownsfolkManager.js';
import { townFor } from '../data/townsfolk/index.js';
```

2. **`preload()`:** directly after the `getMap(this._mapId)?.extraSheets?.forEach(…)` block, add:

```js
        // W4: the look sheets of this town's people
        const town = townFor(this._mapId);
        if (town) TownsfolkManager.preload(this, town);
```

3. **`create()`:** directly after `this.physics.add.collider(this.player, this.npcs);`, add:

```js
        // W4: townsfolk on schedules (only maps that belong to a town)
        this._talkedNpcs = new Set();
        const town = this._mapDef.tiles ? townFor(this._mapId) : null;
        this._townsfolk = town ? new TownsfolkManager(this, town, this._mapId) : null;
        if (this._townsfolk) this.physics.add.collider(this.player, this._townsfolk.group);
        this.events.once('shutdown', () => { this._townsfolk?.destroy(); this._townsfolk = null; });
```

4. **`update()`:** directly after `this._tickExploration(delta);`, add:

```js
        this._townsfolk?.update(delta, playerStats.gameMinutes, this.player,
            (x, y) => (this._streamer ? this._streamer.isPxActive(x, y) : true));
```

5. **`_drawDarkness()`:** after the hearth line (`(this.stations ?? []).filter(…).forEach(st => light(st.x, st.y - 30, 80));`), add:

```js
        // W4: the night watch carries lanterns
        this._townsfolk?.lanterns(playerStats.gameMinutes).forEach(g => light(g.x, g.y - 6, 70));
```

- [ ] **Step 5: Check it in the running game: busy morning, empty night, giving way, other maps**

Run (busy at 09:00, then the clock jumps to 23:00):
`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.stats.gameMinutes=1440+9*60;gs.player.setPosition(15*32+16,19*32+16);})();;0;;(()=>{const gs=__game.scene.getScene('GameScene');const L=[...gs._townsfolk.live.values()];window.__r={nine:L.length,moving:L.filter(s=>s.anims.currentAnim?.key.includes('_walk_')).length,ids:L.map(s=>s.resident.id).slice(0,6)};gs.player.stats.gameMinutes=1440+23*60;})();;0;;(()=>{const gs=__game.scene.getScene('GameScene');const L=[...gs._townsfolk.live.values()];window.__r.eleven=L.length;window.__r.roles=L.map(s=>s.resident.role);console.log('RESULT',JSON.stringify(window.__r));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w4_t6_night.png`

Expected:
- `RESULT` shows `nine` ≥ 10, with no `[exception]`;
- `eleven` ≤ 4, with `roles` only `guard` and `beggar`;
- the 23:00 screenshot shows the dark street with light pools around any guard in view.

Run (the inn is full at 23:00; anyone walking through the door appears inside):
`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.stats.gameMinutes=1440+22*60+50;gs._useDoor(gs._mapDef.spawns.doors.find(d=>d.interior==='thaloria_inn'));})();;0;;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');const L=[...gs._townsfolk.live.values()];console.log('RESULT',JSON.stringify({map:gs._mapId,live:L.length,sitting:L.filter(s=>s.anims.currentAnim?.key.includes('_sit_')).length}));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w4_t6_inn.png`

Expected: `RESULT {"map":"thaloria_inn","live":<at least 8>,"sitting":<at least 6>}`. The screenshot shows people on the inn's floor, none inside a wall or a table. Read the screenshot.

Run (a walker meets the player standing in its path):
`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.stats.gameMinutes=1440+8*60+1;})();;0;;(()=>{const gs=__game.scene.getScene('GameScene');const w=[...gs._townsfolk.live.values()].find(s=>s.anims.currentAnim?.key.includes('_walk_'));window.__w=w.resident.id;gs.player.setPosition(w.x+(w.anims.currentAnim.key.endsWith('right')?24:w.anims.currentAnim.key.endsWith('left')?-24:0),w.y+16+(w.anims.currentAnim.key.endsWith('down')?24:w.anims.currentAnim.key.endsWith('up')?-24:0)-16);})();;0;;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');const w=gs._townsfolk.live.get(window.__w);console.log('RESULT',JSON.stringify({id:window.__w,lag:+(w?.steer.lagMin??-1).toFixed(2),side:w?.steer.side,offset:+(w?.steer.offset??0).toFixed(1)}));})()"`

Expected: `RESULT` shows the walker's `lag` > 0, meaning it waited, and after 2.4 s either `side` ≠ 0 or the walker has passed (`offset` back to 0 and `lag` shrinking). There is no `[exception]`.

If no walker is live at 08:01, raise the start to `8*60+3` and run it again.

Run (maps without a town): `node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=east_road" 7000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');console.log('RESULT',JSON.stringify({east:gs._townsfolk===null}));})()"` and the same with `?testmap=samplemap`.
Expected: `RESULT {"east":true}` both times, with no `[exception]`.

- [ ] **Step 6: Run the suite and commit**

Run: `npm test 2>&1 | tail -3`
Expected: no failure.

```bash
git add src/systems/crowd.js src/systems/TownsfolkManager.js src/scenes/GameScene.js tools/test_townsfolk.mjs
git commit -m "feat(amo): live townsfolk — up to 30 nearest walk their day in built chunks, give way to the player, guards light the night"
```

---

### Task 7: Talking to townsfolk

**Files:**
- Modify: `src/scenes/GameScene.js` (`_checkInteractions`, a new `_talkToNpc`, a new `_talkToTownsperson`, `_updateInteractPrompts`)

**Interfaces:**
- Consumes: `pickBark` (Task 3); `TownsfolkManager.holdFor/say/updatePrompts/anyNear` (Task 6); `gameHour` (gameClock); `weatherAt` (data/weather.js, already imported).
- Produces:
  - `GameScene._talkToNpc(npc)`, where `npc` has `npcDef`, `talked`, `x`, `y`, and an optional `activity`;
  - `GameScene._talkToTownsperson(sprite)`.

- [ ] **Step 1: Extract `_talkToNpc` without changing behaviour**

In `_checkInteractions()`, the NPC block is `this.physics.overlap(this.player.interactBox, this.npcs, (box, npc) => { … });`. Move the callback's whole body, from `const def = npc.npcDef;` to the end of the dialogue launch, into a new method directly below `_checkInteractions()`:

```js
    // Talk to an NPC — a fixed spawn or a named townsperson (W4). Shops open only
    // while the keeper's schedule says work.
    _talkToNpc(npc) {
        const def = npc.npcDef;
        soundManager.interact();
        // Quest NPC id (data/npcs.js); maps without one fall back to the dialogue key
        const npcId = def.id ?? (def.isShop ? 'silvara' : (def.dialogue?.replace(/_greeting$|_prolog$/, '') ?? 'hermit'));

        if (def.isShop) {
            // Talking to a merchant counts for "Return to …" steps too
            questManager.onTalk(npcId);
            if (npc.activity && npc.activity !== 'work') {
                this.scene.get('UIScene')?.showNotification?.('Closed — come back in the morning', 2000);
                return;
            }
            /* …the existing shop code, unchanged… */
            return;
        }
        /* …the existing dialogue code, unchanged… */
    }
```

The block comments stand for the code already there. Move it verbatim; do not retype it. In the moved dialogue code's `onComplete`, after `npc.talked = true;`, add `this._talkedNpcs?.add(npcId);`. In the shop's first-greeting branch, after `npc.talked = true;`, add the same line.

The overlap becomes:

```js
        this.physics.overlap(this.player.interactBox, this.npcs, (_box, npc) => this._talkToNpc(npc));
```

- [ ] **Step 2: Add townsfolk to E and to the prompts**

In `_checkInteractions()`, directly after the door check `if (door) { this._useDoor(door.doorDef); return; }`, add:

```js
        // Townsfolk (W4): the nearest one you face answers
        let folk = null;
        if (this._townsfolk) this.physics.overlap(this.player.interactBox, this._townsfolk.group, (_b, s) => { folk ??= s; });
        if (folk) { this._talkToTownsperson(folk); return; }
```

Add the method below `_talkToNpc`:

```js
    // W4: a named townsperson talks as any NPC does; anyone else answers with a bark.
    // Either way they stop and face you for a moment.
    _talkToTownsperson(spr) {
        this._townsfolk.holdFor(spr, 3000);
        if (spr.npcDef) { this._talkToNpc(spr); return; }
        soundManager.interact();
        const min = playerStats.gameMinutes;
        const line = pickBark(spr.resident.role, { hour: gameHour(min), weather: weatherAt(this._mapDef, min).id, flags: playerStats.flags });
        this._townsfolk.say(spr, line ?? '…');
    }
```

Add the imports `import { pickBark } from '../systems/barks.js';`, and `gameHour` to the existing `../systems/gameClock.js` import list.

In `_updateInteractPrompts()`, after the `this.npcs.getChildren().forEach(…)` line, add `this._townsfolk?.updatePrompts(near);`. In the `_nearInteract` expression, add `this._townsfolk?.anyNear(near) ||` right after `this.npcs.getChildren().some(n => near(n)) ||`.

- [ ] **Step 3: Check it in the running game**

Run (a bark, the Trader's dialogue, the shop closed at night):

`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.stats.gameMinutes=1440+10*60;})();;0;;(()=>{const gs=__game.scene.getScene('GameScene');const L=[...gs._townsfolk.live.values()];const anon=L.find(s=>!s.npcDef);gs._talkToTownsperson(anon);window.__r={bark:anon.bubble?.text??null,held:anon.holdUntil>gs.time.now};const tr=L.find(s=>s.npcDef?.id==='thaloria_trader');gs._talkToTownsperson(tr);window.__r.trader=__game.scene.isActive('DialogueScene');})();;0;;(()=>{const d=__game.scene.getScene('DialogueScene');window.__r.speaker=d?._lines?.[0]?.speaker??d?.lines?.[0]?.speaker??null;__game.scene.stop('DialogueScene');const gs=__game.scene.getScene('GameScene');gs.scene.resume();gs.player.stats.gameMinutes=1440+20*60;})();;0;;(()=>{const gs=__game.scene.getScene('GameScene');const fake={npcDef:{id:'thaloria_merchant',name:'Merchant',isShop:true,dialogue:'thaloria_merchant_greeting'},talked:true,activity:'sit',x:0,y:0};gs._talkToNpc(fake);window.__r.shopOpen=__game.scene.isActive('ShopScene');console.log('RESULT',JSON.stringify(window.__r));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w4_t7_talk.png`

Expected: `RESULT` with:
- `bark` a non-empty string, and `held` true;
- `trader` true and `speaker` `"Trader"`, or the trader dialogue's first speaker;
- `shopOpen` false.

There is no `[exception]`. If the DialogueScene keeps its lines under another property, read `src/scenes/DialogueScene.js` and print that property instead. The check is that the Trader's greeting opened.

Run (the Innkeeper still offers The Scholar's Saddlebags, inside the inn by day):

`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.stats.gameMinutes=1440+11*60;gs._useDoor(gs._mapDef.spawns.doors.find(d=>d.interior==='thaloria_inn'));})();;0;;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');const k=[...gs._townsfolk.live.values()].find(s=>s.npcDef?.id==='innkeeper');window.__r={map:gs._mapId,innkeeper:!!k};if(k){gs.player.setPosition(k.x,k.y+30);gs._talkToTownsperson(k);}window.__r.dialogue=__game.scene.isActive('DialogueScene');console.log('RESULT',JSON.stringify(window.__r));})()"`

Expected: `RESULT {"map":"thaloria_inn","innkeeper":true,"dialogue":true}`.

The quest offer itself is unchanged code (`_offerQuest`), and `test_chapter3` covers it.

- [ ] **Step 4: Run the suite and commit**

Run: `npm test 2>&1 | tail -3`
Expected: no failure.

```bash
git add src/scenes/GameScene.js
git commit -m "feat(amo): talk to townsfolk — named people keep their dialogue and quests, shops keep hours, anyone else answers with a bark"
```

---

### Task 8: Quest markers follow people

**Files:**
- Modify: `src/systems/mapMarkers.js`, `src/scenes/MapScene.js`, `tools/test_townsfolk.mjs`

**Interfaces:**
- Consumes: `namedPeopleAt(minutes)` (Task 5).
- Produces:
  - `stepLocation(step, mapId, def, { attunedGates, people })`;
  - `markersFor(state, mapId, def, { getMap, people }, depth)`.
  - `people` is `[{ npcId, mapId, x, y }]` or null. A person listed there is marked where they are, or nowhere. An NPC not listed falls back to their spawn.

- [ ] **Step 1: Add the failing tests**

```js
// ---- Talk markers follow people
{
    const K = await import('../src/systems/mapMarkers.js');
    const def = { id: 'here', tiles: grid(20, 20), spawns: { npcs: [{ x: 3, y: 3, id: 'oren', name: 'Oren' }], doors: [{ x: 9, y: 9, interior: 'room' }] } };
    const room = { id: 'room', interior: true, tiles: grid(4, 4), spawns: {} };
    const getMap = id => (id === 'room' ? room : def);
    const quest = { id: 'q', title: 'Q', type: 'main', steps: [{ id: 's', type: 'talk', target: 'oren', required: 1, label: 'Talk to Oren' }] };
    const state = { active: [{ quest, log: { status: 'active', progress: { s: 0 } } }], countItem: () => 0, attunedGates: [] };
    const at = ms => ms.map(m => [m.x, m.y, m.viaDoor]);
    eq(at(K.markersFor(state, 'here', def, { getMap })), [[3, 3, false]], 'no schedule known: the spawn');
    eq(at(K.markersFor(state, 'here', def, { getMap, people: [{ npcId: 'oren', mapId: 'here', x: 12, y: 4 }] })), [[12, 4, false]], 'where they are now');
    eq(at(K.markersFor(state, 'here', def, { getMap, people: [{ npcId: 'oren', mapId: 'room', x: 1, y: 1 }] })), [[9, 9, true]], 'inside: the door of where they are');
    eq(at(K.markersFor(state, 'here', def, { getMap, people: [{ npcId: 'oren', mapId: 'far', x: 1, y: 1 }] })), [], 'on another map: no marker here, not the old spawn');
}
```

Run: `node tools/test_townsfolk.mjs`
Expected: FAIL, because "where they are now" got `[[3,3,false]]`.

- [ ] **Step 2: Implement it in `src/systems/mapMarkers.js`**

Change `stepLocation`'s signature and its `talk` case:

```js
export function stepLocation(step, mapId, def, { attunedGates = [], people = null } = {}) {
```

```js
        case 'talk': {
            // W4: a person on a schedule is where the clock puts them (or on another map)
            const who = people?.find(p => p.npcId === step.target);
            if (who) return who.mapId === mapId ? { x: who.x, y: who.y } : null;
            const npc = (sp.npcs ?? []).find(n => npcQuestId(n) === step.target);
            return npc ? { x: npc.x, y: npc.y } : null;
        }
```

Change `markersFor` to accept and pass `people`:

```js
export function markersFor({ active, countItem = () => 0, attunedGates = [] }, mapId, def, { getMap = null, people = null } = {}, depth = 0) {
```

- inside it, `stepLocation(step, mapId, def, { attunedGates, people })`;
- in the door recursion, `markersFor({ active, countItem, attunedGates }, door.interior, getMap(door.interior), { getMap, people }, depth + 1)`.

Also update the header comment line "NPCs at their spawn until W4 gives them schedules." to "NPCs on a schedule are where `people` says (W4); others at their spawn."

- [ ] **Step 3: Pass people from MapScene**

In `src/scenes/MapScene.js`, add `import { namedPeopleAt } from '../data/townsfolk/index.js';`. In both `markersFor(…, { getMap })` calls (the region tab and the world tab), change the options to `{ getMap, people: namedPeopleAt(playerStats.gameMinutes) }`.

`playerStats` is already imported there; if not, import it as `GameScene` does.

- [ ] **Step 4: Run the tests and check M in the game**

Run: `node tools/test_townsfolk.mjs && node tools/test_fog_map.mjs`
Expected: both pass.

Run (with the Trader's quest active, the marker sits on the Trader at 10:00 and on the inn door at 21:00):
`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.stats.gameMinutes=1440+10*60;__game.scene.launch('MapScene');})();;0;;(()=>{const m=__game.scene.getScene('MapScene');window.__r={ten:(m._markers??[]).map(k=>[k.questId,k.x,k.y,k.viaDoor])};__game.scene.stop('MapScene');const gs=__game.scene.getScene('GameScene');gs.scene.resume();gs.player.stats.gameMinutes=1440+21*60;__game.scene.launch('MapScene');})();;0;;(()=>{const m=__game.scene.getScene('MapScene');window.__r.nine=(m._markers??[]).map(k=>[k.questId,k.x,k.y,k.viaDoor]);console.log('RESULT',JSON.stringify(window.__r));})()"`

Expected: `RESULT` with every talk marker for `thaloria_trader` or `innkeeper`:
- at `ten`, on the Trader's yard (7,19), or on the inn door (5,16) with `viaDoor:true` for the Innkeeper;
- at `nine`, on the inn door, with `viaDoor:true`.

Whether any marker shows depends on which Chapter 3 quests a fresh testmap has active. If `ten` is empty, start the quest first with `gs.questManager.startQuest('main_odysseys_dawn')`, or the import W5's checks used. Record the step that worked in the ledger.

- [ ] **Step 5: Commit**

```bash
git add src/systems/mapMarkers.js src/scenes/MapScene.js tools/test_townsfolk.mjs
git commit -m "feat(amo): quest markers follow people through their day — a talk step marks where the person is, or the door of the building they are in"
```

---

### Task 9: Manual, acceptance tour, memory

**Files:**
- Modify: `tools/gen_game_inventory.mjs`, `docs/manual/index.html` (regenerated), the auto-memory `project_world_scale.md` and its `MEMORY.md` line.

- [ ] **Step 1: Document townsfolk in the manual**

In `tools/gen_game_inventory.mjs`:
- In the controls table, change the `E` row's text to `'Interact (talk to anyone, chests, signs, gathering, rift-gates, hearths, alchemy tables)'`.
- In the systems table, directly after the `'Charts'` row, add:

```js
    ['Townsfolk', 'Cities have people with a day of their own: they sleep at home, walk to work, sit in the inn at night and wander the streets in between — where anyone is follows the clock, so the market is busy in the morning and the inn full at night. Guards patrol and carry light after dark. E on anyone: named people talk and give quests as before; everyone else has something to say about the hour, the weather or the road. People step aside when you block their way.'],
    ['Shop hours', 'A shopkeeper sells only while at work (Thaloria\'s market: 08:00–18:00). Find them at the inn in the evening — "Closed — come back in the morning".'],
```

Run: `node tools/gen_game_inventory.mjs`
Expected: it writes `docs/manual/index.html` with no error. Run `grep -c "Townsfolk" docs/manual/index.html` and expect `1` or more.

- [ ] **Step 2: Acceptance tour in the running game (spec W4 acceptance)**

Run the three checks again on a fresh load, with the screenshots:
- **09:00, the market busy:** Task 6, the first command. Screenshot `w4_accept_0900.png`, with the player at (15,20).
- **23:00, the market nearly empty and the inn full:** Task 6, the first and second commands.
- **Follow one person through a day:** run

  `node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 8000 --eval "(async()=>{const {getTown}=await import('/src/data/townsfolk/index.js');const {whereAt}=await import('/src/systems/schedules.js');const t=getTown('thaloria');const r=t.residents.find(x=>x.id==='stallholder_a');const seq=[];for(let m=1440+60;m<=1440*2+120;m+=5){const p=whereAt(r,m,t);const k=p.activity+'@'+p.mapId;if(seq.at(-1)!==k)seq.push(k);}console.log('RESULT',JSON.stringify(seq));})()"`

  Expected: `RESULT ["sleep@thaloria","travel@thaloria","work@thaloria","travel@thaloria","travel@thaloria_inn","sit@thaloria_inn","travel@thaloria_inn","travel@thaloria","sleep@thaloria"]`.
- **The Trader and the Innkeeper still give their quests:** Task 7's two commands.

Read every screenshot. Write the outcomes into the ledger.

- [ ] **Step 3: Full suite, push, memory**

Run: `npm test 2>&1 | tail -3` and `cd ../tool_suite/lpc_forge && node v2/tests/test_townsfolk_looks.mjs`
Expected: both pass.

```bash
git add tools/gen_game_inventory.mjs docs/manual/index.html
git commit -m "docs(amo): manual — townsfolk and shop hours"
git push
```

Update `~/.claude/projects/-home-etienne-projects-Arcane-Majesty/memory/project_world_scale.md`:
- **Status line:** "W4 done 2026-10-2X (townsfolk: walkGrid/pathfind/schedules/barks/crowd + TownsfolkManager; looks baked by the Forge's bake.html, seed 1; Thaloria 22 residents incl. the 4 named NPCs). Next: W6."
- **Ruling:** add "named NPCs now use baked looks".

Update its `MEMORY.md` line to say W1–W5 are done and the next step is W6.
