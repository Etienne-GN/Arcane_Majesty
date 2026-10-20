# W5 Map and Exploration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every outdoor map starts black and is revealed only where you walk. The minimap becomes a player-centred window onto that explored ground. **M** opens a real map with a Region tab (fog, exits, doors, rift-gates, landmarks, quest markers; pan and zoom) and a World tab (the places you have been, laid out from the lore map). Charts bought from a cartographer show a region's roads and landmarks under the fog. Landmarks give XP the first time you reach them. Dense forest shrinks what you see and darkens the edges of the screen.

**Architecture:**
- **Pure rules:**
  - `src/systems/fog.js`: the fog bitset, revealing, landmark discovery.
  - `src/systems/mapPaint.js`: one RGBA pixel per tile, from tiles + fog + chart.
  - `src/systems/mapMarkers.js`: what is visible on the map, and where each active quest step points.
  - `src/systems/worldLayout.js`: World-tab positions from lore coordinates.

  All of them are tested in `tools/test_fog_map.mjs`.
- **Phaser glue:**
  - `src/systems/mapTexture.js` uploads the painted image as one canvas texture per map.
  - GameScene owns this map's fog and texture and ticks the reveal.
  - UIScene's minimap crops that texture around the player.
  - A new `MapScene` replaces `WorldMapScene`.
- **Data:**
  - region layers `dense` and `chart` (bitsets, written by `region_writer.py`);
  - `spawns.landmarks`;
  - chart items and a cartographer's catalogue;
  - three new save fields.

**Tech Stack:** Phaser 3.90 (canvas textures, `setCrop`), ES modules, Python 3 generators, Node `assert` tests, headless checks via `../tool_suite/lpc_forge/tools/console.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-17-world-scale-design.md` (section W5)

**Depends on:**
- W2: the region format, `decodeRegion`, `region_writer.py` and `gen_streamtest.py`.
- W3: the `spawns.doors` field, `interior: true` maps, `doorLockState` and `playerStats.interiorReturn`.

All of these are on `main`.

## Global Constraints

- Every new save field gets a default in `PlayerStats` (constructor and `reset()`), and old saves load without errors.
- Every pure module gets a `tools/test_*.mjs` test chained into `npm test`.
- Every system is checked headless in the running game via `tools/console.mjs` and `window.__game` before it is called done.
- Existing maps keep working unchanged at every step; `npm test` stays green.
- New lore (places, people) is checked against the Neo4j graph first. New game-only places are recorded as `origin: "game"` for the user's DB sync.
- Characters never reference songs or albums in-world.
- The manual (`docs/manual/index.html`) is regenerated when items, controls or systems change.
- Commits go straight to `main`.
- Work from `apps/amo` (paths are relative to it unless they start with `docs/`).
- **Headless checks:**
  - The game dev server is on `http://localhost:5174/`.
  - `console.mjs` runs `;;`-separated steps 800 ms apart, and a bare `0` is a delay.
  - Return values are not printed, so every check prints with `console.log('RESULT', …)`.
  - Screenshots go to the session scratchpad: `/tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/`, written below as `SCRATCH/`. Type the full path.

## Rulings against the spec (made while planning)

- **The chart layer defaults to the map's road and street tiles** (values 2 and 3). A region may write its own `chart` bitset instead (`region_writer.py` supports it). Every existing map gets a usable chart for free, and W6 can author richer ones.
- **Talk markers use the NPC's spawn position.** W4's `whereAt` does not exist yet; when it lands, `stepLocation` takes a position function (one call site).
- **`read_signs` and `kill` steps whose target is `any` get no marker.** Nothing records which signs were read, so marking every sign would be noise. A step that names its target, or carries `where`, is marked.
- **A step whose target is inside a building marks the building's door** on the outdoor map. This goes up to two levels: the cellar's target marks the inn door. Otherwise a quest pointing indoors would show nothing outdoors.
- **"Visited" is the set of maps with a fog entry** (`Object.keys(playerStats.explored)`) plus the current map. There is no separate visited field.
- **World-tab positions:** maps with a lore DB Location use its `x, y`. The values were read from the DB on 2026-10-19 and stored in `worldLayout.js`. Maps without one (East Road and most test or prologue maps) are placed 90 lore px from a placed neighbour, in the direction of the exit that joins them. The game cannot query the DB at runtime.
- **The legacy `playerStats.exploredChunks`** (map-agnostic `"cx_cy"` keys used only by the Aetheric Tear's free-target view) is left as it is. Fog uses the new per-map `explored`.
- **Chart items are used up when read**, and reading a chart for an already charted region is refused (the item stays). In W5, charts are **sold** by a cartographer in Thaloria. Charts **in chests** arrive with W6's content, because no current chest site was chosen for one.
- **Map textures are kept for the session**, one per map visited (256 KB for a 256×256 region), and repainted in place, never removed. The minimap therefore never draws a destroyed texture across a map change.
- **`streamtest` changes layout:** five landmark clearings are carved before the scatter. It is a test region, and the W2 budget is re-measured in Task 3.
- **The cartographer** is a generic role (no name, no lore), placed at Thaloria (19, 22) beside the market. W6 rebuilds the city and can move them. There is nothing to record for the DB.
- **`WorldMapScene` is deleted.** `AethericTearScene` keeps its own `PROLOGUE_MAP` grid, which is out of scope.

## Review Focus

1. **A map with no tile grid (`samplemap`, Tiled format) or a tiny interior.** Fog, minimap and M must not throw. The minimap shows a black box; M says "No map of this place." This is pinned by the `paintMap` null test (Task 2) and the samplemap headless check (Task 6). The minimap's own crash on samplemap, which predates this work, goes away.
2. **Old or damaged saves.** A missing `explored`/`charted`/`discovered`, a non-string fog entry, garbage base64, or a fog string saved before the map was resized must all load to blank fog without an error. Pinned in Task 1.
3. **Quest steps that point nowhere on this map:** an unknown NPC, an enemy type not spawned here, `where` on another map, a generated bounty. The result is no marker and no throw. Pinned by the sweep of every quest × every map in Task 4.
4. **Using a chart while standing on its map.** The map and minimap must show the roads without leaving and re-entering. Pinned by the headless check in Task 9.
5. **Leaving a map and coming back, or saving and reloading.** The trail you walked is still revealed, and new walking extends it. Pinned by the headless check in Task 5.

---

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/systems/fog.js` | 1 | fog bitset: create, reveal, query, encode/decode; `fogFor`; `newlyDiscovered` |
| `src/systems/PlayerStats.js`, `src/systems/SaveManager.js` | 1 | `explored`, `charted`, `discovered` save fields |
| `tools/test_fog_map.mjs` (new, chained in `npm test`) | 1–9 | every W5 pure test |
| `src/systems/regionFormat.js` | 2 | `decodeBitsToMask` |
| `src/systems/mapPaint.js` | 2 | terrain palette, `chartMask`, `denseMask`, `isDenseAt`, `paintMap`, `paintCells` |
| `tools/maps/region_writer.py`, `tools/maps/test_region_writer.py` | 3 | `dense_cells` / `chart_cells` layers |
| `tools/maps/gen_streamtest.py` → `src/data/maps/regions/streamtest.js`, `tools/test_region.mjs` | 3 | dense layer + 5 landmarks |
| `src/systems/mapMarkers.js` | 4 | `npcQuestId`, `visibleFeatures`, `stepLocation`, `markersFor` |
| `src/systems/mapTexture.js` | 5 | `buildMapTexture`, `repaintMapTexture` |
| `src/scenes/GameScene.js` | 5, 8, 9 | `_initExploration`, `_tickExploration`; M opens MapScene; shop catalogue |
| `src/scenes/UIScene.js` | 5, 6 | vignette; the new minimap |
| `src/systems/worldLayout.js` | 7 | `WORLD_ANCHORS`, `exitDirection`, `layoutWorld` |
| `src/scenes/MapScene.js` (new), `src/main.js`; delete `src/scenes/WorldMapScene.js` | 8 | the full map |
| `src/data/items.js`, `src/scenes/ShopScene.js`, `src/data/dialogues.js`, `tools/maps/gen_thaloria.py` → `src/data/maps/thaloria.js` | 9 | charts, cartographer |
| `tools/maps/gen_thaloria.py`, `tools/maps/gen_east_road.py` → their maps; `tools/gen_game_inventory.mjs` → manual | 10 | real landmarks; manual |

---

### Task 1: Fog of war rules and the save fields

**Files:**
- Create: `src/systems/fog.js`
- Create: `tools/test_fog_map.mjs`
- Modify: `package.json` (chain the test)
- Modify: `src/systems/PlayerStats.js` (constructor beside `this.exploredChunks = [];`, and `reset()` beside `this.exploredChunks    = [];`)
- Modify: `src/systems/SaveManager.js` (save object beside `interiorReturn:`; load beside `stats.interiorReturn  =`)

**Interfaces:**
- Produces:
  - `FOG_CELL = 4`, `REVEAL_RADIUS = 6`, `DENSE_REVEAL_RADIUS = 4`.
  - `createFog(wTiles, hTiles) → { cw, ch, bits: Uint8Array }`.
  - `isCellExplored(fog|null, cx, cy) → bool` and `isExplored(fog|null, tx, ty) → bool`. `null` fog means everything is known.
  - `revealAround(fog|null, tx, ty, radius) → [[cx, cy], …]` (newly revealed only).
  - `encodeFog(fog) → string` and `decodeFog(b64, wTiles, hTiles) → fog` (blank on any problem).
  - `fogFor(def, mapId, stats) → fog|null`.
  - `newlyDiscovered(landmarks, tx, ty, discovered) → landmark[]`.
  - `playerStats.explored: { [mapId]: string }`, `charted: { [mapId]: true }`, `discovered: { [landmarkId]: true }`, all defaulting to `{}`.

- [ ] **Step 1: Write the failing test**

Create `tools/test_fog_map.mjs`:

```js
// W5 map and exploration: fog, map painting, markers, world layout, charts.
// Run: node tools/test_fog_map.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const F = await import('../src/systems/fog.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- Fog
{
    eq([F.FOG_CELL, F.REVEAL_RADIUS, F.DENSE_REVEAL_RADIUS], [4, 6, 4], 'cell size and radii from the spec');
    const fog = F.createFog(10, 9);
    eq([fog.cw, fog.ch], [3, 3], 'cells round up (10×9 tiles → 3×3 cells)');
    ok(!F.isExplored(fog, 0, 0), 'fresh fog: nothing explored');
    ok(F.isExplored(null, 5, 5), 'no fog (interiors): everything known');
    eq(F.revealAround(fog, 1.5, 1.5, 3), [[0, 0], [1, 0], [0, 1]], 'radius 3 reaches the cells whose nearest point is within 3 tiles');
    eq(F.revealAround(fog, 1.5, 1.5, 3), [], 'revealing again reveals nothing new');
    ok(F.isExplored(fog, 5, 1) && !F.isExplored(fog, 5, 5), 'cell (1,0) known, cell (1,1) still dark');
    eq(F.revealAround(fog, -10, -10, 3), [], 'outside the map: nothing, no throw');
    eq(F.revealAround(fog, 9.9, 8.9, 1), [[2, 1], [2, 2]], 'the far corner clips to the grid');
    eq(F.revealAround(null, 1, 1, 6), [], 'null fog reveals nothing');
    ok(!F.isExplored(fog, -1, 0) && !F.isExplored(fog, 0, 99), 'outside the grid is unexplored');

    const back = F.decodeFog(F.encodeFog(fog), 10, 9);
    eq([...back.bits], [...fog.bits], 'encode → decode round trip');
    eq([...F.decodeFog(F.encodeFog(fog), 40, 40).bits].some(b => b), false, 'a fog saved for another map size loads blank');
    eq([...F.decodeFog('not base64!!', 10, 9).bits].some(b => b), false, 'garbage loads blank');
    eq([...F.decodeFog(undefined, 10, 9).bits].some(b => b), false, 'missing loads blank');

    const s = new PlayerStats();
    s.explored.field = F.encodeFog(fog);
    const def = { tiles: Array.from({ length: 9 }, () => new Array(10).fill(0)) };
    ok(F.isExplored(F.fogFor(def, 'field', s), 5, 1), 'fogFor reads the saved fog of that map');
    ok(!F.isExplored(F.fogFor(def, 'other', s), 5, 1), 'another map starts dark');
    eq(F.fogFor({ ...def, interior: true }, 'room', s), null, 'interiors have no fog');
    eq(F.fogFor({ mapCols: 60, mapRows: 60 }, 'samplemap', s), null, 'a map without a tile grid has no fog');
}

// ---- Landmarks
{
    const lm = [{ id: 'oak', name: 'Old Oak', x: 10, y: 10, radius: 3, xp: 10 }, { id: 'well', name: 'Well', x: 30, y: 30 }];
    eq(F.newlyDiscovered(lm, 10.5, 13.4, {}).map(l => l.id), ['oak'], 'inside the radius (2.9 tiles from the centre)');
    eq(F.newlyDiscovered(lm, 10.5, 14, {}), [], 'outside it (3.5)');
    eq(F.newlyDiscovered(lm, 10.5, 10.5, { oak: true }), [], 'only the first time');
    eq(F.newlyDiscovered(lm, 30.5, 32.9, {}).map(l => l.id), ['well'], 'radius defaults to 3');
}

// ---- Save fields
{
    const s = new PlayerStats();
    eq([s.explored, s.charted, s.discovered], [{}, {}, {}], 'a new character knows nothing');
    s.explored.thaloria = 'AAA=';
    s.charted.thaloria = true;
    s.discovered.bell = true;
    SaveManager.save(s, 'st_fog', 'c1');
    const back = new PlayerStats();
    SaveManager.load(back, 'st_fog', 'c1');
    eq([back.explored, back.charted, back.discovered], [{ thaloria: 'AAA=' }, { thaloria: true }, { bell: true }], 'all three survive a save');
    ok(back.explored !== s.explored, 'copied, not shared');

    const key = [...store.keys()].find(k => k.includes('st_fog'));
    const raw = JSON.parse(store.get(key));
    delete raw.explored; delete raw.charted; delete raw.discovered;
    store.set(key, JSON.stringify(raw));
    const old = new PlayerStats();
    SaveManager.load(old, 'st_fog', 'c1');
    eq([old.explored, old.charted, old.discovered], [{}, {}, {}], 'an old save loads with empty fields');

    raw.explored = { a: 'AAA=', b: 42, c: null };
    raw.charted = { a: true, b: 'yes' };
    raw.discovered = 'nonsense';
    store.set(key, JSON.stringify(raw));
    const bad = new PlayerStats();
    SaveManager.load(bad, 'st_fog', 'c1');
    eq([bad.explored, bad.charted, bad.discovered], [{ a: 'AAA=' }, { a: true }, {}], 'damaged entries are dropped');

    s.reset();
    eq([s.explored, s.charted, s.discovered], [{}, {}, {}], 'reset empties them');
}

console.log(`test_fog_map: ${n} checks passed`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test_fog_map.mjs`
Expected: FAIL with `Cannot find module '…/src/systems/fog.js'`.

- [ ] **Step 3: Write `src/systems/fog.js`**

```js
// W5 fog of war: per map, one bit per 4×4-tile cell; a revealed cell stays revealed.
// Interiors and maps without a tile grid have no fog (null = everything known).
// Pure — tools/test_fog_map.mjs.

export const FOG_CELL = 4;              // tiles per fog cell, each way
export const REVEAL_RADIUS = 6;         // tiles around the player
export const DENSE_REVEAL_RADIUS = 4;   // inside dense forest

const toB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };

export function createFog(widthTiles, heightTiles) {
    const cw = Math.ceil(widthTiles / FOG_CELL), ch = Math.ceil(heightTiles / FOG_CELL);
    return { cw, ch, bits: new Uint8Array(Math.ceil(cw * ch / 8)) };
}

export function isCellExplored(fog, cx, cy) {
    if (fog === null) return true;
    if (cx < 0 || cy < 0 || cx >= fog.cw || cy >= fog.ch) return false;
    const i = cy * fog.cw + cx;
    return (fog.bits[i >> 3] & (1 << (i & 7))) !== 0;
}

export const isExplored = (fog, tx, ty) => isCellExplored(fog, Math.floor(tx / FOG_CELL), Math.floor(ty / FOG_CELL));

// Reveals every cell whose nearest point lies within `radius` tiles of (tx, ty)
// (tile units, fractions allowed). Returns the newly revealed cells as [cx, cy], row by row.
export function revealAround(fog, tx, ty, radius) {
    if (fog === null) return [];
    const out = [], r2 = radius * radius;
    const cx0 = Math.max(0, Math.floor((tx - radius) / FOG_CELL)), cx1 = Math.min(fog.cw - 1, Math.floor((tx + radius) / FOG_CELL));
    const cy0 = Math.max(0, Math.floor((ty - radius) / FOG_CELL)), cy1 = Math.min(fog.ch - 1, Math.floor((ty + radius) / FOG_CELL));
    for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
            const dx = Math.max(cx * FOG_CELL - tx, 0, tx - (cx + 1) * FOG_CELL);
            const dy = Math.max(cy * FOG_CELL - ty, 0, ty - (cy + 1) * FOG_CELL);
            if (dx * dx + dy * dy > r2 || isCellExplored(fog, cx, cy)) continue;
            const i = cy * fog.cw + cx;
            fog.bits[i >> 3] |= 1 << (i & 7);
            out.push([cx, cy]);
        }
    }
    return out;
}

export const encodeFog = fog => toB64(fog.bits);

// Blank fog when the string is missing, damaged, or was saved for another map size.
export function decodeFog(b64, widthTiles, heightTiles) {
    const fog = createFog(widthTiles, heightTiles);
    if (typeof b64 !== 'string') return fog;
    try {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        if (bytes.length === fog.bits.length) fog.bits.set(bytes);
    } catch { /* not base64: blank */ }
    return fog;
}

// This map's fog from the save, or null where there is none (interiors, Tiled maps).
export function fogFor(def, mapId, stats) {
    if (def.interior || !def.tiles?.length) return null;
    return decodeFog(stats.explored?.[mapId], def.tiles[0].length, def.tiles.length);
}

// Landmarks entered for the first time: within `radius` (default 3) tiles of the landmark tile's centre.
export function newlyDiscovered(landmarks, tx, ty, discovered = {}) {
    return landmarks.filter(l => !discovered[l.id] && Math.hypot(l.x + 0.5 - tx, l.y + 0.5 - ty) <= (l.radius ?? 3));
}
```

- [ ] **Step 4: Add the save fields**

`src/systems/PlayerStats.js`, constructor, directly under `this.exploredChunks = [];`:

```js

        // W5: fog of war per map ({ mapId: base64 bitset, one bit per 4×4 tiles }),
        // regions charted (chart items), landmarks discovered
        this.explored   = {};
        this.charted    = {};
        this.discovered = {};
```

Then in `reset()`, directly under `this.exploredChunks    = [];`:

```js
        this.explored          = {};
        this.charted           = {};
        this.discovered        = {};
```

`src/systems/SaveManager.js`, in the saved object, directly under the `interiorReturn:` line:

```js
            explored:          { ...(stats.explored ?? {}) },
            charted:           { ...(stats.charted ?? {}) },
            discovered:        { ...(stats.discovered ?? {}) },
```

In load, directly under the `stats.interiorReturn  =` line:

```js
            const keep = (o, valid) => Object.fromEntries(Object.entries(o && typeof o === 'object' ? o : {}).filter(([, v]) => valid(v)));
            stats.explored   = keep(d.explored, v => typeof v === 'string');
            stats.charted    = keep(d.charted, v => v === true);
            stats.discovered = keep(d.discovered, v => v === true);
```

In `package.json`, chain the test after `node tools/test_interiors.mjs`: `… && node tools/test_interiors.mjs && node tools/test_fog_map.mjs && …`.

- [ ] **Step 5: Run the test and the suite**

Run: `node tools/test_fog_map.mjs`
Expected: `test_fog_map: N checks passed`, with no assertion error.

Run: `npm test > /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t1.log 2>&1; tail -3 /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t1.log`
Expected: the last line is `✓ campaign-definition tests passed (…)`.

- [ ] **Step 6: Commit**

```bash
git add src/systems/fog.js tools/test_fog_map.mjs package.json src/systems/PlayerStats.js src/systems/SaveManager.js
git commit -m "feat(amo): fog of war rules — per-map 4×4-cell bitset, reveal, landmarks; explored/charted/discovered saved"
```

---

### Task 2: Painting the map overview

**Files:**
- Modify: `src/systems/regionFormat.js` (add `decodeBitsToMask` after `decodeBitsToCells`)
- Create: `src/systems/mapPaint.js`
- Test: `tools/test_fog_map.mjs`

**Interfaces:**
- Consumes: `FOG_CELL`, `isCellExplored`, `createFog`, `revealAround` (Task 1).
- Produces:
  - `decodeBitsToMask(b64, w, h) → Uint8Array(w*h)` of 0/1.
  - `TERRAIN`, `INTERIOR_TERRAIN`, `UNKNOWN`, `CHART_ROAD`.
  - `chartMask(def) → Uint8Array`.
  - `denseMask(def) → Uint8Array|null`.
  - `isDenseAt(mask|null, w, tx, ty) → bool`.
  - `paintMap(def, fog|null, { charted }) → { w, h, data: Uint8ClampedArray }|null`.
  - `paintCells(img, def, fog, cells, { charted })`.

- [ ] **Step 1: Write the failing test**

Append to `tools/test_fog_map.mjs`, above the final `console.log`:

```js
// ---- Map painting
{
    const P = await import('../src/systems/mapPaint.js');
    const { encodeBits, decodeBitsToMask } = await import('../src/systems/regionFormat.js');
    eq([...decodeBitsToMask(encodeBits([[1, 0], [2, 1]], 3, 2), 3, 2)], [0, 1, 0, 0, 0, 1], 'bitset → one byte per cell');

    const rgb = (img, x, y) => { const i = (y * img.w + x) * 4; return (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]; };
    const alpha = (img, x, y) => img.data[(y * img.w + x) * 4 + 3];
    const def = { tiles: [[0, 1, 2, 3, 9, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [4, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]] };

    const known = P.paintMap(def, null);
    eq([known.w, known.h, known.data.length], [8, 4, 8 * 4 * 4], 'one RGBA pixel per tile');
    eq([rgb(known, 0, 0), rgb(known, 1, 0), rgb(known, 2, 0), rgb(known, 3, 0), rgb(known, 0, 2)],
       [P.TERRAIN[0], P.TERRAIN[1], P.TERRAIN[2], P.TERRAIN[3], P.TERRAIN[4]], 'terrain colours by tile value');
    eq(rgb(known, 4, 0), P.TERRAIN[0], 'an unknown tile value paints as grass');
    eq(alpha(known, 4, 0), 255, 'opaque');

    const fog = F.createFog(8, 4);
    const dark = P.paintMap(def, fog);
    ok([...Array(32).keys()].every(i => rgb(dark, i % 8, Math.floor(i / 8)) === P.UNKNOWN), 'fresh fog paints everything black');
    const charted = P.paintMap(def, fog, { charted: true });
    eq([rgb(charted, 2, 0), rgb(charted, 3, 0), rgb(charted, 1, 0)], [P.CHART_ROAD, P.CHART_ROAD, P.UNKNOWN], 'a chart shows roads and streets under the fog, nothing else');
    const own = P.paintMap({ ...def, chart: encodeBits([[0, 0]], 8, 4) }, fog, { charted: true });
    eq([rgb(own, 0, 0), rgb(own, 2, 0)], [P.CHART_ROAD, P.UNKNOWN], "a region's own chart layer replaces the road default");

    const img = P.paintMap(def, fog);
    const cells = F.revealAround(fog, 1, 1, 1);
    P.paintCells(img, def, fog, cells);
    eq([rgb(img, 1, 0), rgb(img, 5, 0)], [P.TERRAIN[1], P.UNKNOWN], 'paintCells repaints only the revealed cells');

    const room = P.paintMap({ interior: true, tiles: [[1, 0]] }, null);
    eq([rgb(room, 0, 0), rgb(room, 1, 0)], [P.INTERIOR_TERRAIN[1], P.INTERIOR_TERRAIN[0]], 'interiors use the room palette');
    eq(P.paintMap({ mapCols: 60, mapRows: 60 }, null), null, 'no tile grid: nothing to paint');

    eq(P.denseMask(def), null, 'no dense layer: null');
    ok(!P.isDenseAt(null, 8, 1, 1), 'null mask is never dense');
    const thick = { ...def, dense: encodeBits([[2, 1]], 8, 4) };
    ok(P.isDenseAt(P.denseMask(thick), 8, 2, 1) && !P.isDenseAt(P.denseMask(thick), 8, 3, 1), 'dense where the layer says');
    ok(!P.isDenseAt(P.denseMask(thick), 8, -1, 0) && !P.isDenseAt(P.denseMask(thick), 8, 0, 9), 'outside the map is not dense');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test_fog_map.mjs`
Expected: FAIL with `Cannot find module '…/src/systems/mapPaint.js'`.

- [ ] **Step 3: Implement**

In `src/systems/regionFormat.js`, after `decodeBitsToCells`:

```js
// A bitset as one byte per cell (0/1), row-major — for per-tile layers read often (dense, chart).
export function decodeBitsToMask(b64, w, h) {
    const bytes = fromB64(b64), out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (bytes[i >> 3] & (1 << (i & 7))) out[i] = 1;
    return out;
}
```

Create `src/systems/mapPaint.js`:

```js
// W5: paints a map's overview, one RGBA pixel per tile, from its tile grid and fog.
// The minimap and the full map (M) both show this image. Pure — tools/test_fog_map.mjs.
import { decodeBitsToMask } from './regionFormat.js';
import { FOG_CELL, isCellExplored } from './fog.js';

export const TERRAIN = { 0: 0x1e3a14, 1: 0x0d2010, 2: 0x5a4a2a, 3: 0x6b6358, 4: 0x101014 };   // grass, trees, road, street, void
export const INTERIOR_TERRAIN = { 0: 0x5a4632, 1: 0x1a1612 };                                     // floor, wall
export const UNKNOWN = 0x000000;
export const CHART_ROAD = 0x3a3020;   // a charted road still under the fog

const masks = new WeakMap();   // def → decoded layers, decoded once
function cached(def, key, make) {
    let m = masks.get(def);
    if (!m) masks.set(def, m = {});
    if (!(key in m)) m[key] = make();
    return m[key];
}

// 1 where a chart shows a road: the region's own `chart` layer, else its road and street tiles.
export function chartMask(def) {
    return cached(def, 'chart', () => {
        const h = def.tiles.length, w = def.tiles[0].length;
        if (typeof def.chart === 'string') return decodeBitsToMask(def.chart, w, h);
        const out = new Uint8Array(w * h);
        def.tiles.forEach((row, y) => row.forEach((t, x) => { if (t === 2 || t === 3) out[y * w + x] = 1; }));
        return out;
    });
}

// 1 on dense-forest tiles, or null when the map has no `dense` layer.
export function denseMask(def) {
    return cached(def, 'dense', () => (typeof def.dense === 'string' && def.tiles?.length
        ? decodeBitsToMask(def.dense, def.tiles[0].length, def.tiles.length) : null));
}

export const isDenseAt = (mask, w, tx, ty) => !!mask && tx >= 0 && ty >= 0 && tx < w && mask[ty * w + tx] === 1;

function put(data, i, rgb) {
    data[i * 4] = (rgb >> 16) & 255; data[i * 4 + 1] = (rgb >> 8) & 255; data[i * 4 + 2] = rgb & 255; data[i * 4 + 3] = 255;
}

function paintTile(img, def, fog, chart, x, y) {
    const i = y * img.w + x;
    const pal = def.interior ? INTERIOR_TERRAIN : TERRAIN;
    if (isCellExplored(fog, Math.floor(x / FOG_CELL), Math.floor(y / FOG_CELL))) put(img.data, i, pal[def.tiles[y][x]] ?? pal[0]);
    else put(img.data, i, chart && chart[i] ? CHART_ROAD : UNKNOWN);
}

// { w, h, data: Uint8ClampedArray }, or null for a map without a tile grid.
export function paintMap(def, fog, { charted = false } = {}) {
    if (!def.tiles?.length) return null;
    const h = def.tiles.length, w = def.tiles[0].length;
    const img = { w, h, data: new Uint8ClampedArray(w * h * 4) };
    const chart = charted ? chartMask(def) : null;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) paintTile(img, def, fog, chart, x, y);
    return img;
}

// Repaints the tiles of the given fog cells (the result of revealAround).
export function paintCells(img, def, fog, cells, { charted = false } = {}) {
    const chart = charted ? chartMask(def) : null;
    for (const [cx, cy] of cells) {
        for (let y = cy * FOG_CELL; y < Math.min(img.h, (cy + 1) * FOG_CELL); y++) {
            for (let x = cx * FOG_CELL; x < Math.min(img.w, (cx + 1) * FOG_CELL); x++) paintTile(img, def, fog, chart, x, y);
        }
    }
}
```

- [ ] **Step 4: Run tests**

Run: `node tools/test_fog_map.mjs && node tools/test_region.mjs`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/systems/regionFormat.js src/systems/mapPaint.js tools/test_fog_map.mjs
git commit -m "feat(amo): map overview painting — terrain from tiles, black under fog, charted roads, dense layer"
```

---

### Task 3: Region layers (dense, chart) and landmarks in the test region

**Files:**
- Modify: `tools/maps/region_writer.py` (`write_region` signature and `raw`)
- Modify: `tools/maps/test_region_writer.py`
- Modify: `tools/maps/gen_streamtest.py`, then regenerate `src/data/maps/regions/streamtest.js`
- Modify: `tools/test_region.mjs`

**Interfaces:**
- Consumes: `denseMask` (Task 2).
- Produces:
  - `write_region(..., dense_cells=(), chart_cells=())` writes `raw['dense']` and `raw['chart']`, base64 bitsets keyed by tile. Each key is omitted when its list is empty. `decodeRegion` passes both through unchanged through its `...rest` spread.
  - `streamtest.spawns.landmarks`: 5 entries `{ id, name, x, y, radius: 3, xp: 20 }`.

- [ ] **Step 1: Write the failing tests**

`tools/maps/test_region_writer.py`: inside the existing `with tempfile.TemporaryDirectory() as d:` block, after `assert raw['displayName'] == 'Tiny'`, add:

```python
    assert 'dense' not in raw and 'chart' not in raw, 'no layers unless given'
    out2 = Path(d) / 'layers.js'
    write_region(out2, id='layers', tiles=tiles, sm=SheetMap(), fields={}, dense_cells=[(0, 1)], chart_cells=[(2, 0)])
    raw2 = json.loads(re.search(r'export default (\{.*\});\s*$', out2.read_text(), re.S).group(1))
    assert base64.b64decode(raw2['dense'])[0] == 1 << 3, 'dense bit for (0,1) = index 3'
    assert base64.b64decode(raw2['chart'])[0] == 1 << 2, 'chart bit for (2,0) = index 2'
```

`tools/test_region.mjs`: before the final `console.log`, add:

```js
// ---- W5: streamtest's dense layer and landmarks
{
    const { getMap } = await import('../src/data/maps/index.js');
    const { denseMask } = await import('../src/systems/mapPaint.js');
    const m = getMap('streamtest');
    const mask = denseMask(m);
    ok(mask, 'streamtest has a dense layer');
    const frac = mask.reduce((a, b) => a + b, 0) / mask.length;
    ok(frac > 0.05 && frac < 0.6, `a real share of it is dense (${(frac * 100).toFixed(1)}%)`);
    ok(!mask[m.playerStart.y * 256 + m.playerStart.x], 'the start is not dense');
    eq(m.spawns.landmarks.length, 5, 'five landmarks');
    eq(new Set(m.spawns.landmarks.map(l => l.id)).size, 5, 'unique ids');
    ok(m.spawns.landmarks.every(l => m.tiles[l.y][l.x] === 0 && l.radius === 3 && l.xp === 20), 'each stands in a clearing, radius 3, 20 XP');
}
```

- [ ] **Step 2: Run them to verify they fail**

Run: `python3 tools/maps/test_region_writer.py`
Expected: FAIL with `TypeError: write_region() got an unexpected keyword argument 'dense_cells'`.

Run: `node tools/test_region.mjs`
Expected: FAIL with `streamtest has a dense layer`.

- [ ] **Step 3: Implement the writer**

`tools/maps/region_writer.py`: change the signature to

```python
def write_region(out_path, *, id, tiles, sm: SheetMap, fields, hop_cells=(), dense_cells=(), chart_cells=(), header=''):
```

and directly after the `raw = {…}` statement add:

```python
    # W5 layers, per tile: dense forest (smaller reveal radius, vignette) and a chart's roads
    if dense_cells:
        raw['dense'] = pack_bits(dense_cells, w, h)
    if chart_cells:
        raw['chart'] = pack_bits(chart_cells, w, h)
```

- [ ] **Step 4: Implement the generator**

In `tools/maps/gen_streamtest.py`, directly after `taken = set()`, add:

```python
# W5 landmarks: five clearings far apart, so the map has things worth finding
LANDMARKS = [
    ('st_stone_circle', 'The Stone Circle', 60, 60),
    ('st_hollow_oak', 'The Hollow Oak', 196, 58),
    ('st_drowned_shrine', 'The Drowned Shrine', 62, 198),
    ('st_watch_cairn', 'The Watch Cairn', 194, 196),
    ('st_old_well', 'The Old Well', 128, 36),
]
for _, _, lx, ly in LANDMARKS:
    for y in range(ly - 3, ly + 4):
        for x in range(lx - 3, lx + 4):
            tiles[y][x] = 0
            taken.add((x, y))

# W5 dense forest: the deepest stands (by the same noise as the trees), away from the start
dense = [(x, y) for y in range(H) for x in range(W)
         if noise(x, y) > 0.3 and abs(x - W // 2) + abs(y - H // 2) > 24]
```

In the `write_region(` call, add `dense_cells=dense,` after `sm=sm,`. In `fields['spawns']`, add:

```python
            'landmarks': [{'id': i, 'name': nm, 'x': x, 'y': y, 'radius': 3, 'xp': 20} for i, nm, x, y in LANDMARKS],
```

Finally, change the closing `print` to also report `{len(dense)} dense tiles`.

Run: `python3 tools/maps/gen_streamtest.py`
Expected: a line like `streamtest: … trees, … decorations, 120 creatures, … dense tiles`.

- [ ] **Step 5: Run the tests and re-check W2's budget**

Run: `python3 tools/maps/test_region_writer.py && node tools/test_region.mjs`
Expected: `test_region_writer: ok`, then `test_region: … checks passed`.

The layout changed, so re-run W2's streaming budget check. Load `streamtest`, walk east for 6 s, and read the peak object count:

Run: `node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 16000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');window.__peak=0;gs.events.on('postupdate',()=>{window.__peak=Math.max(window.__peak,gs.children.list.length);});gs.player.setVelocityX?.(0);window.__k=setInterval(()=>{gs.player.setPosition(gs.player.x+12,gs.player.y);},50);})();;0;;0;;0;;0;;0;;0;;0;;(()=>{clearInterval(window.__k);console.log('RESULT',JSON.stringify({peak:window.__peak}));})()"`
Expected: `RESULT {"peak":N}` with N ≤ 2500 (W2's budget).

- [ ] **Step 6: Commit**

```bash
git add tools/maps/region_writer.py tools/maps/test_region_writer.py tools/maps/gen_streamtest.py src/data/maps/regions/streamtest.js tools/test_region.mjs
git commit -m "feat(amo): region dense/chart layers; streamtest gets deep-forest cells and five landmarks"
```

---

### Task 4: Map features and quest markers

**Files:**
- Create: `src/systems/mapMarkers.js`
- Test: `tools/test_fog_map.mjs`

**Interfaces:**
- Consumes:
  - `isExplored` (Task 1);
  - `questSteps`, `stepProgress`, `objectivesDone` from `src/data/questRules.js`;
  - `doorLockState(door, stats) → { open, reason }` from `src/systems/interiors.js`.
- Produces:
  - `npcQuestId(npc) → string|null`.
  - `visibleFeatures(def, fog|null, stats)`, returning:
    - `exits: [{ x, y, label, targetMap }]`;
    - `doors: [{ x, y, label, interior, locked }]`;
    - `gates: [{ x, y, id, label, attuned }]`;
    - `landmarks: [{ x, y, id, name, discovered }]`.
  - `stepLocation(step, mapId, def, { attunedGates }) → { x, y }|null`.
  - `markersFor({ active: [{ quest, log }], countItem, attunedGates }, mapId, def, { getMap }) → [{ questId, stepId, title, label, main, x, y, viaDoor }]`. All coordinates are tiles.

- [ ] **Step 1: Write the failing test**

Append to `tools/test_fog_map.mjs` above the final `console.log`:

```js
// ---- Features and quest markers
{
    const K = await import('../src/systems/mapMarkers.js');
    const grid = Array.from({ length: 20 }, () => new Array(20).fill(0));
    const def = {
        tiles: grid,
        portals: [{ id: 'p', x: 0, y: 5, targetMap: 'east_road', label: 'East' }],
        spawns: {
            doors: [{ x: 5, y: 5, interior: 'room', label: 'Room' }, { x: 9, y: 9, interior: 'vault', label: 'Vault', locked: { flag: 'vault_key' } }],
            riftGates: [{ id: 'g1', x: 15, y: 15, label: 'Gate' }],
            landmarks: [{ id: 'lm1', name: 'Old Oak', x: 12, y: 2, radius: 3, xp: 10 }],
            npcs: [{ x: 3, y: 3, id: 'oren', name: 'Oren' }, { x: 4, y: 4, dialogue: 'hermit_greeting' }],
            enemies: [{ x: 10, y: 10, type: 'wolf' }, { x: 14, y: 12, type: 'wolf' }],
            signs: [{ x: 7, y: 7, id: 'stone', text: '…' }],
        },
    };
    eq([K.npcQuestId(def.spawns.npcs[0]), K.npcQuestId(def.spawns.npcs[1]), K.npcQuestId({ isShop: true })], ['oren', 'hermit', 'silvara'], 'NPC quest ids follow GameScene');

    const s = new PlayerStats();
    const fog = F.createFog(20, 20);
    const none = K.visibleFeatures(def, fog, s);
    eq([none.exits, none.doors, none.gates, none.landmarks], [[], [], [], []], 'nothing seen yet: nothing shown');
    F.revealAround(fog, 5, 5, 6);
    const seen = K.visibleFeatures(def, fog, s);
    eq(seen.exits, [{ x: 0, y: 5, label: 'East', targetMap: 'east_road' }], 'an exit once its tile is explored');
    eq(seen.doors.map(d => [d.interior, d.locked]), [['room', false], ['vault', true]], 'doors once seen, locked ones flagged');
    s.flags.vault_key = true;
    eq(K.visibleFeatures(def, fog, s).doors[1].locked, false, 'an opened lock is no longer flagged');
    s.attunedGates.push('g1');
    eq(K.visibleFeatures(def, fog, s).gates, [{ x: 15, y: 15, id: 'g1', label: 'Gate', attuned: true }], 'an attuned gate shows even under fog');
    s.charted.here = true;
    eq(K.visibleFeatures(def, fog, s, 'here').landmarks, [{ x: 12, y: 2, id: 'lm1', name: '?', discovered: false }], 'a chart shows where landmarks are, unnamed');
    s.discovered.lm1 = true;
    eq(K.visibleFeatures(def, fog, s, 'here').landmarks[0].name, 'Old Oak', 'a discovered landmark shows its name');
    eq(K.visibleFeatures(def, null, new PlayerStats()).doors.length, 2, 'no fog (interior): everything shows');

    const q = { id: 'q1', title: 'Q', type: 'main', steps: [
        { id: 't', type: 'talk', target: 'oren', label: 'Talk to Oren', required: 1 },
        { id: 'k', type: 'kill', target: 'wolf', label: 'Wolves', required: 2 },
        { id: 's', type: 'read_signs', target: 'stone', label: 'Read', required: 1 },
        { id: 'a', type: 'attune', target: 'any', label: 'Attune', required: 1 },
        { id: 'w', type: 'gather', target: 'wood', label: 'Wood', required: 3, where: { map: 'here', x: 1, y: 2 } },
        { id: 'x', type: 'kill', target: 'any', label: 'Anything', required: 5 },
        { id: 'r', type: 'read_signs', target: 'any', label: 'Signs', required: 3 },
    ] };
    const log = { status: 'active', progress: { t: 0, k: 0, s: 0, a: 0, w: 0, x: 0, r: 0 } };
    const at = ms => ms.map(m => [m.stepId, m.x, m.y]);
    const state = { active: [{ quest: q, log }], countItem: () => 0, attunedGates: [] };
    eq(at(K.markersFor(state, 'here', def)), [['t', 3, 3], ['k', 12, 11], ['s', 7, 7], ['a', 15, 15], ['w', 1, 2]],
       'talk → NPC, kill → centre of that type\'s spawns, sign, gate, explicit where; "any" targets unmarked');
    ok(K.markersFor(state, 'here', def).every(m => m.main && m.title === 'Q' && m.questId === 'q1'), 'markers carry their quest');
    eq(at(K.markersFor(state, 'elsewhere', def)).map(([id]) => id).includes('w'), false, '`where` on another map: not here');
    log.progress.k = 2;
    eq(at(K.markersFor(state, 'here', def)).map(([id]) => id).includes('k'), false, 'a finished step loses its marker');
    eq(at(K.markersFor({ ...state, attunedGates: ['g1'] }, 'here', def)).map(([id]) => id).includes('a'), false, 'attune any: no unattuned gate, no marker');

    const given = { id: 'q2', title: 'Given', type: 'side', giver: 'oren', steps: [{ id: 'k', type: 'kill', target: 'wolf', label: 'Wolves', required: 1 }] };
    const glog = { status: 'active', progress: { k: 0, __turn_in: 0 } };
    const gstate = { active: [{ quest: given, log: glog }], countItem: () => 0, attunedGates: [] };
    eq(at(K.markersFor(gstate, 'here', def)), [['k', 12, 11]], 'the turn-in waits for the objectives');
    glog.progress.k = 1;
    eq(at(K.markersFor(gstate, 'here', def)), [['__turn_in', 3, 3]], 'then it points back to the giver');

    const rooms = { room: { id: 'room', interior: true, tiles: [[0]], spawns: { npcs: [{ x: 0, y: 0, id: 'inside' }] } } };
    const indoor = { active: [{ quest: { id: 'q3', title: 'In', type: 'side', steps: [{ id: 'i', type: 'talk', target: 'inside', label: 'Inside', required: 1 }] }, log: { status: 'active', progress: { i: 0 } } }], countItem: () => 0, attunedGates: [] };
    const via = K.markersFor(indoor, 'here', def, { getMap: id => rooms[id] ?? { tiles: [[0]], spawns: {} } });
    eq(via.map(m => [m.stepId, m.x, m.y, m.viaDoor]), [['i', 5, 5, true]], 'a target inside a building marks its door');
    eq(K.markersFor(indoor, 'room', rooms.room).map(m => [m.x, m.y, m.viaDoor]), [[0, 0, false]], 'and the room itself marks the NPC');

    // Every real quest on every real map: no throw, markers inside the map
    const { getMap, listMaps } = await import('../src/data/maps/index.js');
    const { QUESTS } = await import('../src/data/quests.js');
    const all = { active: Object.values(QUESTS).map(qq => ({ quest: qq, log: { status: 'active', progress: {} } })), countItem: () => 0, attunedGates: [] };
    let marks = 0;
    for (const { id } of listMaps()) {
        const m = getMap(id);
        const list = K.markersFor(all, id, m, { getMap });
        const w = m.tiles?.[0]?.length ?? m.mapCols ?? 0, h = m.tiles?.length ?? m.mapRows ?? 0;
        ok(list.every(mk => mk.x >= 0 && mk.y >= 0 && mk.x < w && mk.y < h), `${id}: every marker lies inside the map`);
        K.visibleFeatures(m, null, new PlayerStats());
        marks += list.length;
    }
    ok(marks > 10, `real quests produce markers somewhere (${marks})`);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test_fog_map.mjs`
Expected: FAIL with `Cannot find module '…/src/systems/mapMarkers.js'`.

- [ ] **Step 3: Write `src/systems/mapMarkers.js`**

```js
// W5: what the map shows — exits, doors, rift-gates and landmarks you have seen —
// and where each active quest step points. Tile coordinates. Pure — tools/test_fog_map.mjs.
import { questSteps, stepProgress, objectivesDone } from '../data/questRules.js';
import { isExplored } from './fog.js';
import { doorLockState } from './interiors.js';

// The id a talk step targets for this NPC (same rule as GameScene's interaction code).
export const npcQuestId = npc => npc.id ?? (npc.isShop ? 'silvara' : (npc.dialogue?.replace(/_greeting$|_prolog$/, '') ?? null));

// `mapId` is only needed for charted landmarks (playerStats.charted[mapId]).
export function visibleFeatures(def, fog, stats, mapId = def.id) {
    const sp = def.spawns ?? {};
    const seen = o => isExplored(fog, o.x, o.y);
    const attuned = stats.attunedGates ?? [];
    const discovered = stats.discovered ?? {}, charted = !!stats.charted?.[mapId];
    return {
        exits: (def.portals ?? []).filter(seen).map(p => ({ x: p.x, y: p.y, label: p.label ?? p.targetMap, targetMap: p.targetMap })),
        doors: (sp.doors ?? []).filter(seen).map(d => ({ x: d.x, y: d.y, label: d.label, interior: d.interior, locked: !doorLockState(d, stats).open })),
        gates: (sp.riftGates ?? []).filter(g => seen(g) || attuned.includes(g.id))
            .map(g => ({ x: g.x, y: g.y, id: g.id, label: g.label, attuned: attuned.includes(g.id) })),
        landmarks: (sp.landmarks ?? []).filter(l => discovered[l.id] || charted)
            .map(l => ({ x: l.x, y: l.y, id: l.id, name: discovered[l.id] ? l.name : '?', discovered: !!discovered[l.id] })),
    };
}

const centre = list => ({
    x: Math.round(list.reduce((a, e) => a + e.x, 0) / list.length),
    y: Math.round(list.reduce((a, e) => a + e.y, 0) / list.length),
});

// Where one step points on this map, or null. NPCs at their spawn until W4 gives them schedules.
export function stepLocation(step, mapId, def, { attunedGates = [] } = {}) {
    if (step.where) return step.where.map === mapId ? { x: step.where.x, y: step.where.y } : null;
    const sp = def.spawns ?? {};
    switch (step.type) {
        case 'talk': {
            const npc = (sp.npcs ?? []).find(n => npcQuestId(n) === step.target);
            return npc ? { x: npc.x, y: npc.y } : null;
        }
        case 'kill': {
            if (!step.target || step.target === 'any') return null;
            const here = (sp.enemies ?? []).filter(e => e.type === step.target);
            if (sp.boss?.type === step.target && Number.isFinite(sp.boss.x)) here.push(sp.boss);
            return here.length ? centre(here) : null;
        }
        case 'read_signs': {
            if (!step.target || step.target === 'any') return null;
            const sign = (sp.signs ?? []).find(s => s.id === step.target);
            return sign ? { x: sign.x, y: sign.y } : null;
        }
        case 'attune': {
            const gate = (sp.riftGates ?? []).find(g => (step.target === 'any' ? !attunedGates.includes(g.id) : g.id === step.target));
            return gate ? { x: gate.x, y: gate.y } : null;
        }
        default: return null;
    }
}

// One marker per unfinished step that points somewhere on this map. A target inside a
// building (up to two doors deep) marks that building's door instead.
export function markersFor({ active, countItem = () => 0, attunedGates = [] }, mapId, def, { getMap = null } = {}, depth = 0) {
    const out = [];
    for (const { quest, log } of active) {
        const done = objectivesDone(quest, log, countItem);
        for (const step of questSteps(quest)) {
            if (stepProgress(step, log, countItem) >= step.required) continue;
            if (step.turnIn && !done) continue;
            const at = stepLocation(step, mapId, def, { attunedGates });
            if (at) out.push({ questId: quest.id, stepId: step.id, title: quest.title, label: step.label, main: quest.type === 'main', ...at, viaDoor: false });
        }
    }
    if (getMap && depth < 2) {
        for (const door of def.spawns?.doors ?? []) {
            const inner = markersFor({ active, countItem, attunedGates }, door.interior, getMap(door.interior), { getMap }, depth + 1);
            for (const m of inner) out.push({ ...m, x: door.x, y: door.y, viaDoor: true });
        }
    }
    return out;
}
```

Note: the sweep test calls `markersFor` with each map's real `getMap`. Doors on real maps point at registered interiors (W3's tests guarantee that).

- [ ] **Step 4: Run tests**

Run: `node tools/test_fog_map.mjs`
Expected: `test_fog_map: … checks passed`.

- [ ] **Step 5: Commit**

```bash
git add src/systems/mapMarkers.js tools/test_fog_map.mjs
git commit -m "feat(amo): map features you have seen and quest-step markers (talk, kill, sign, gate, where; through doors)"
```

---

### Task 5: Exploration in the running game (fog tick, texture, landmarks, dense vignette)

**Files:**
- Create: `src/systems/mapTexture.js`
- Modify: `src/scenes/GameScene.js`:
  - imports;
  - `create()`, directly after `this._buildWorld(mapW, mapH);`;
  - `update()`, directly after `this._streamer?.update(this._streamView(), 1);`;
  - two new methods next to `_streamView`.
- Modify: `src/scenes/UIScene.js`: the vignette in `create()` and `update()`.

**Interfaces:**
- Consumes:
  - `fogFor`, `revealAround`, `encodeFog`, `newlyDiscovered`, `REVEAL_RADIUS`, `DENSE_REVEAL_RADIUS` (Task 1);
  - `paintMap`, `paintCells`, `denseMask`, `isDenseAt` (Task 2).
- Produces:
  - `mapTextureKey(mapId)`.
  - `buildMapTexture(scene, mapId, def, fog, { charted }) → { key, img, w, h }|null`.
  - `repaintMapTexture(scene, mapImg, def, fog, cells, { charted })`.
  - On GameScene: `_fog`, `_mapImg`, `_inDense`. Tasks 6 and 8 read them.

- [ ] **Step 1: Write `src/systems/mapTexture.js`**

This is Phaser glue around the pure painter, so it is checked headless in Step 4.

```js
// W5: the map overview as a Phaser canvas texture, one per map, shared by the minimap
// (UIScene) and the full map (MapScene). Kept for the session and repainted in place,
// so no scene ever draws a destroyed texture. The pixels come from mapPaint.js.
import Phaser from 'phaser';
import { paintMap, paintCells } from './mapPaint.js';

export const mapTextureKey = mapId => `__map_${mapId}`;

function upload(scene, key, img) {
    let tex = scene.textures.exists(key) ? scene.textures.get(key) : null;
    if (tex && (tex.width !== img.w || tex.height !== img.h)) { scene.textures.remove(key); tex = null; }
    if (!tex) {
        tex = scene.textures.createCanvas(key, img.w, img.h);
        tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    tex.context.putImageData(new ImageData(img.data, img.w, img.h), 0, 0);
    tex.refresh();
}

// { key, img, w, h } with the whole map painted, or null for a map without a tile grid.
export function buildMapTexture(scene, mapId, def, fog, opts) {
    const img = paintMap(def, fog, opts);
    if (!img) return null;
    const key = mapTextureKey(mapId);
    upload(scene, key, img);
    return { key, img, w: img.w, h: img.h };
}

export function repaintMapTexture(scene, mapImg, def, fog, cells, opts) {
    if (!mapImg) return;
    paintCells(mapImg.img, def, fog, cells, opts);
    upload(scene, mapImg.key, mapImg.img);
}
```

- [ ] **Step 2: Wire GameScene**

Imports, next to the other `../systems/` imports:

```js
import { fogFor, revealAround, encodeFog, newlyDiscovered, REVEAL_RADIUS, DENSE_REVEAL_RADIUS } from '../systems/fog.js';
import { denseMask, isDenseAt } from '../systems/mapPaint.js';
import { buildMapTexture, repaintMapTexture } from '../systems/mapTexture.js';
```

In `create()`, directly after `this._buildWorld(mapW, mapH);`:

```js
        this._initExploration();
```

In `update()`, directly after `this._streamer?.update(this._streamView(), 1);`:

```js
        this._tickExploration(delta);
```

New methods, placed next to `_streamView`:

```js
    // W5: this map's fog, its overview texture (minimap and M), its dense-forest layer.
    _initExploration() {
        const def = this._mapDef;
        this._fog = fogFor(def, this._mapId, playerStats);
        this._mapCharted = !!playerStats.charted?.[this._mapId];
        this._mapImg = buildMapTexture(this, this._mapId, def, this._fog, { charted: this._mapCharted });
        this._dense = denseMask(def);
        this._inDense = false;
        this._exploreT = 0;   // the first update reveals around the spawn point
    }

    // Every 200 ms: reveal around the player (less in dense forest), save the fog,
    // discover landmarks, and repaint once a chart has been read for this map.
    _tickExploration(delta) {
        this._exploreT -= delta;
        if (this._exploreT > 0) return;
        this._exploreT = 200;
        const def = this._mapDef, tx = this.player.x / TILE_SIZE, ty = this.player.y / TILE_SIZE;
        this._inDense = isDenseAt(this._dense, def.tiles?.[0]?.length ?? 0, Math.floor(tx), Math.floor(ty));
        const charted = !!playerStats.charted?.[this._mapId];
        if (charted !== this._mapCharted) {
            this._mapCharted = charted;
            this._mapImg = buildMapTexture(this, this._mapId, def, this._fog, { charted });
        }
        const cells = revealAround(this._fog, tx, ty, this._inDense ? DENSE_REVEAL_RADIUS : REVEAL_RADIUS);
        if (cells.length) {
            repaintMapTexture(this, this._mapImg, def, this._fog, cells, { charted });
            playerStats.explored[this._mapId] = encodeFog(this._fog);
        }
        for (const lm of newlyDiscovered(def.spawns?.landmarks ?? [], tx, ty, playerStats.discovered)) {
            playerStats.discovered[lm.id] = true;
            if (lm.xp) playerStats.gainXp(lm.xp);
            this.scene.get('UIScene')?.showNotification?.(`Discovered: ${lm.name}`, 3000);
        }
    }
```

- [ ] **Step 3: The dense-forest vignette in UIScene**

In `UIScene.create()`, before the `// ---- Minimap ----` block (`w` and `h` are the scale's width and height in that method):

```js
        // W5: dense forest darkens the edges of the view (fades in and out in UIScene.update)
        if (!this.textures.exists('__vignette')) {
            const vg = this.textures.createCanvas('__vignette', 256, 256), c = vg.context;
            const grd = c.createRadialGradient(128, 128, 60, 128, 128, 182);
            grd.addColorStop(0, 'rgba(0,0,0,0)');
            grd.addColorStop(1, 'rgba(0,0,0,0.92)');
            c.fillStyle = grd;
            c.fillRect(0, 0, 256, 256);
            vg.refresh();
        }
        this._vignette = this.add.image(w / 2, h / 2, '__vignette').setDisplaySize(w, h).setDepth(-2).setAlpha(0);
```

In `UIScene.update()`, directly before `this._controls.update();`:

```js
        const dense = !!this.scene.get('GameScene')?._inDense;
        this._vignette.alpha += ((dense ? 1 : 0) - this._vignette.alpha) * Math.min(1, this.game.loop.delta / 600);
```

If `create()` names its width and height differently, use those names. The weather overlay sits at depth -1, so the vignette (-2) stays under the weather and under every HUD element.

- [ ] **Step 4: Headless check: reveal, persistence, landmark, dense**

Run (streamtest; walk 20 tiles east, then go to a landmark and into dense forest):

```
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 14000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');const f=gs._fog;window.__r={start:f.bits.reduce((a,b)=>a+b.toString(2).split('1').length-1,0)};window.__k=setInterval(()=>gs.player.setPosition(gs.player.x+16,gs.player.y),100);})();;0;;0;;(()=>{clearInterval(window.__k);const gs=__game.scene.getScene('GameScene');const f=gs._fog;window.__r.after=f.bits.reduce((a,b)=>a+b.toString(2).split('1').length-1,0);window.__r.saved=typeof gs.player.stats.explored.streamtest;const lm=gs._mapDef.spawns.landmarks[0];window.__r.xp0=gs.player.stats.xp;gs.player.setPosition(lm.x*32+16,lm.y*32+16);})();;0;;(()=>{const gs=__game.scene.getScene('GameScene');const s=gs.player.stats;window.__r.disc=s.discovered.st_stone_circle===true;window.__r.xpGain=s.xp-window.__r.xp0;const m=gs._dense;let i=m.findIndex(v=>v===1);gs.player.setPosition((i%256)*32+16,Math.floor(i/256)*32+16);})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');window.__r.inDense=gs._inDense;window.__r.vignette=+__game.scene.getScene('UIScene')._vignette.alpha.toFixed(2);window.__r.tex=__game.textures.exists('__map_streamtest');console.log('RESULT',JSON.stringify(window.__r));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t5_dense.png
```

Expected: `RESULT` with:
- `start` > 0, since the spawn area was revealed on the first update;
- `after` > `start`;
- `saved` = `"string"`;
- `disc` = true;
- `xpGain` ≥ 20 (more if a level-up rescaled XP);
- `inDense` = true;
- `vignette` > 0.3;
- `tex` = true.

The screenshot shows the darkened edges. Read the image.

Then check persistence through a map change and back, using `_enterPortal`-style travel via `scene.restart`. This matches how GameScene changes maps. Check the exact restart data shape with `grep -n "scene.restart" src/scenes/GameScene.js` before running, and use the same keys `_enterPortal` passes:

```
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=east_road" 14000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');window.__k=setInterval(()=>gs.player.setPosition(gs.player.x+16,gs.player.y),100);})();;0;;0;;(()=>{clearInterval(window.__k);const gs=__game.scene.getScene('GameScene');window.__before=gs.player.stats.explored.east_road;gs._enterPortal(gs._mapDef.portals.find(p=>p.targetMap==='thaloria'));})();;0;;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');gs._enterPortal(gs._mapDef.portals.find(p=>p.targetMap==='east_road'));})();;0;;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');console.log('RESULT',JSON.stringify({map:gs._mapId,kept:gs.player.stats.explored.east_road.length>=window.__before.length,same:gs._fog.bits.some(b=>b)}));})()"
```

Expected: `RESULT {"map":"east_road","kept":true,"same":true}`. If a campaign gate refuses the move on a fresh `?testmap` save, set `gs.player.stats.campaign` the way the W3 checks did. Look up how in `.superpowers/sdd/2026-10-17-w3-interiors/progress.md`.

- [ ] **Step 5: Run the suite and commit**

Run: `npm test > /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t5.log 2>&1; tail -3 /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t5.log`
Expected: last line `✓ campaign-definition tests passed (…)`.

```bash
git add src/systems/mapTexture.js src/scenes/GameScene.js src/scenes/UIScene.js
git commit -m "feat(amo): fog reveals as you walk (6 tiles, 4 in dense forest), saved per map; landmarks discovered for XP; dense-forest vignette"
```

---

### Task 6: The minimap: a 48-tile window centred on the player

**Files:**
- Modify: `src/scenes/UIScene.js`:
  - imports;
  - the `// ---- Minimap ----` block in `create()`;
  - delete `_drawMinimapStatic`;
  - replace `_updateMinimap`;
  - add `_mmFeatures`.

**Interfaces:**
- Consumes: GameScene `_mapImg`, `_fog`, `_mapDef`, `_mapId` (Task 5); `visibleFeatures` (Task 4).
- Produces: `this.mmImage` (the cropped map image), plus a `MINIMAP_TILES = 48` constant at the top of UIScene.

- [ ] **Step 1: Replace the minimap**

Imports in `UIScene.js`: add `import { visibleFeatures } from '../systems/mapMarkers.js';`. Above the class, add `const MINIMAP_TILES = 48;   // W5: tiles across the minimap window`. Keep the `getMap` import only if something else in the file still uses it (`grep -n "getMap" src/scenes/UIScene.js`); otherwise remove it.

Replace the block from `// ---- Minimap ----` through `this._mmY = mmY;` with:

```js
        // ---- Minimap (W5): a 48-tile window of the explored map, centred on the player ----
        const mmX = w - this._mmW - pad;
        const mmY = pad;
        this.add.rectangle(mmX, mmY, this._mmW, this._mmH, 0x000000, 1).setOrigin(0).setDepth(39);
        this.mmImage = null;   // shows GameScene._mapImg, cropped
        this._mmKey  = null;

        const mmBdr = this.add.graphics().setDepth(42);
        mmBdr.lineStyle(2, 0x4444aa);
        mmBdr.strokeRect(mmX - 2, mmY - 2, this._mmW + 4, this._mmH + 4);

        this.mmDynamic = this.add.graphics().setDepth(41);
        this._mmX = mmX;
        this._mmY = mmY;
```

Delete the whole `_drawMinimapStatic(tiles) { … }` method. Replace `_updateMinimap()` with:

```js
    _updateMinimap() {
        const game = this.scene.get('GameScene');
        if (!game || !game.player?.active) return;
        const mi = game._mapImg ?? null;
        if ((mi?.key ?? null) !== this._mmKey) {
            this.mmImage?.destroy();
            this.mmImage = mi ? this.add.image(0, 0, mi.key).setOrigin(0).setDepth(40) : null;
            this._mmKey = mi?.key ?? null;
        }
        const g = this.mmDynamic;
        g.clear();
        if (!mi) return;   // no tile grid (a Tiled map): the box stays black

        const s = this._mmW / MINIMAP_TILES;              // minimap px per tile
        const cols = MINIMAP_TILES, rows = this._mmH / s;
        const ptx = game.player.x / TILE_SIZE, pty = game.player.y / TILE_SIZE;
        const left = ptx - cols / 2, top = pty - rows / 2;
        // Whole texels only, so nothing spills past the frame
        const cx0 = Math.max(0, Math.ceil(left)), cy0 = Math.max(0, Math.ceil(top));
        const cx1 = Math.min(mi.w, Math.floor(left + cols)), cy1 = Math.min(mi.h, Math.floor(top + rows));
        if (cx1 <= cx0 || cy1 <= cy0) this.mmImage.setVisible(false);
        else this.mmImage.setVisible(true).setScale(s).setPosition(this._mmX - left * s, this._mmY - top * s).setCrop(cx0, cy0, cx1 - cx0, cy1 - cy0);

        const toMM = (tx, ty) => [this._mmX + (tx + 0.5 - left) * s, this._mmY + (ty + 0.5 - top) * s];
        const inBox = (x, y) => x >= this._mmX && y >= this._mmY && x <= this._mmX + this._mmW && y <= this._mmY + this._mmH;
        const f = this._mmFeatures(game);
        for (const d of f.doors) {
            const [x, y] = toMM(d.x, d.y);
            if (inBox(x, y)) g.fillStyle(d.locked ? 0xaa3333 : 0xc89a5a).fillRect(x - 2, y - 2, 4, 4);
        }
        for (const l of f.landmarks) {
            const [x, y] = toMM(l.x, l.y);
            if (inBox(x, y)) g.fillStyle(l.discovered ? 0xffe080 : 0x888888).fillCircle(x, y, 2.5);
        }
        const px = this._mmX + (ptx - left) * s, py = this._mmY + (pty - top) * s;
        g.fillStyle(0xffffff).fillRect(px - 2, py - 2, 4, 4);
    }

    // Doors and landmarks seen on this map — recomputed at most every 500 ms (a big region has many).
    _mmFeatures(game) {
        const now = this.time.now;
        if (this._mmF && this._mmF.map === game._mapId && now - this._mmF.t < 500) return this._mmF.f;
        this._mmF = { map: game._mapId, t: now, f: visibleFeatures(game._mapDef, game._fog ?? null, this.stats, game._mapId) };
        return this._mmF.f;
    }
```

- [ ] **Step 2: Headless checks**

(a) On streamtest, the minimap shows only the trail. Walk a little, screenshot, then read the window's pixels through the texture:

```
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=streamtest" 9000 --eval "0;;(()=>{const ui=__game.scene.getScene('UIScene');const gs=__game.scene.getScene('GameScene');const img=gs._mapImg.img;let lit=0;for(let i=0;i<img.w*img.h;i++)if(img.data[i*4]|img.data[i*4+1]|img.data[i*4+2])lit++;console.log('RESULT',JSON.stringify({visible:ui.mmImage.visible,scale:+ui.mmImage.scaleX.toFixed(2),crop:[ui.mmImage._crop?.width,ui.mmImage._crop?.height],litShare:+(lit/(img.w*img.h)).toFixed(4)}));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t6_minimap.png
```

Expected:
- `visible: true`, with `scale` = minimap width / 48;
- `crop` ≈ 47 wide (whole texels inside the frame);
- `litShare` < 0.01 (only the spawn area of a 256×256 region is lit).

Read the screenshot: the minimap is black except a small lit patch around the white player square.

(b) On samplemap, no crash: `node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=samplemap" 8000 --eval "0;;(()=>{const ui=__game.scene.getScene('UIScene');console.log('RESULT',JSON.stringify({mm:ui.mmImage,errors:(window.__errors??[]).length}));})()"`
Expected:
- `RESULT {"mm":null,…}`;
- no `pageerror` lines in the console.mjs output (it prints page errors).

This is the minimap crash that predated W5, now gone.

(c) In an interior, the room is fully shown: `?testmap=thaloria_inn` and the same RESULT step. Expected: `visible: true`. Then read a screenshot: the room's floor and walls fill the middle of the minimap.

- [ ] **Step 3: Run the suite and commit**

Run: `npm test > /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t6.log 2>&1; tail -3 /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t6.log`
Expected: green.

```bash
git add src/scenes/UIScene.js
git commit -m "feat(amo): minimap is a 48-tile window of the explored map around you, with doors and landmarks once seen"
```

---

### Task 7: World layout from the lore map

**Files:**
- Create: `src/systems/worldLayout.js`
- Test: `tools/test_fog_map.mjs`

**Interfaces:**
- Produces:
  - `WORLD_ANCHORS: { [mapId]: { x, y, lore } }`.
  - `STEP = 90`.
  - `exitDirection(portal, def) → { dx, dy }` (a unit vector).
  - `layoutWorld(visitedIds, getMap, { knownExit }) → { nodes, edges, stubs }`, where:
    - `nodes` is `[{ id, name, x, y, anchored }]`;
    - `edges` is `[[idA, idB]]`, with `idA < idB`;
    - `stubs` is `[{ from, targetMap, x, y }]`.
  - Interiors and unregistered ids are left out.

- [ ] **Step 1: Write the failing test**

Append to `tools/test_fog_map.mjs` above the final `console.log`:

```js
// ---- World layout
{
    const L = await import('../src/systems/worldLayout.js');
    const { getMap, listMaps } = await import('../src/data/maps/index.js');
    eq(L.WORLD_ANCHORS.thaloria, { x: 1100, y: 200, lore: 'Thaloria' }, "Thaloria's lore coordinates");
    eq(L.exitDirection({ x: 31, y: 12 }, getMap('thaloria')).dx > 0.9, true, "Thaloria's east gate points east");

    const a = L.layoutWorld(['thaloria', 'east_road', 'summit_of_despair', 'thaloria_inn', 'not_a_map'], getMap);
    const pos = id => a.nodes.find(nd => nd.id === id);
    eq(a.nodes.map(nd => nd.id).sort(), ['east_road', 'summit_of_despair', 'thaloria'], 'interiors and unknown ids are left out');
    eq([pos('thaloria').x, pos('thaloria').y, pos('thaloria').anchored], [1100, 200, true], 'anchored maps sit on their lore coordinates');
    ok(pos('east_road').x > 1100 && !pos('east_road').anchored, 'East Road (no lore location) is placed beside a linked neighbour, east of Thaloria');
    eq(a.edges, [['east_road', 'summit_of_despair'], ['east_road', 'thaloria']], 'edges between visited maps joined by an exit');
    eq(pos('thaloria').name, 'Thaloria', 'nodes carry the display name');

    const solo = L.layoutWorld(['thaloria'], getMap);
    eq(solo.stubs.map(s => s.targetMap).sort(), ['east_road', 'eldrin_tower'], 'exits to unvisited maps are stubs');
    eq(L.layoutWorld(['thaloria'], getMap, { knownExit: () => false }).stubs, [], 'only exits you have seen');

    const every = listMaps().map(m => m.id);
    const big = L.layoutWorld(every, getMap);
    ok(big.nodes.every(nd => Number.isFinite(nd.x) && Number.isFinite(nd.y)), 'every map gets a position, linked or not');
    let close = 0;
    for (const p of big.nodes) for (const q of big.nodes) if (p !== q && Math.hypot(p.x - q.x, p.y - q.y) < L.STEP / 2 && !(p.anchored && q.anchored)) close++;
    eq(close, 0, 'no placed node lands on top of another');
    eq(JSON.stringify(L.layoutWorld(every, getMap)), JSON.stringify(big), 'deterministic');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test_fog_map.mjs`
Expected: FAIL with `Cannot find module '…/src/systems/worldLayout.js'`.

- [ ] **Step 3: Write `src/systems/worldLayout.js`**

```js
// W5: the World tab — the places you have visited, joined by the exits you know,
// laid out on the lore map. Pure — tools/test_fog_map.mjs.

// Lore DB Location coordinates (Location.x / .y), read from the graph on 2026-10-19.
// Only maps that are a DB Location appear; the rest are placed beside a neighbour.
export const WORLD_ANCHORS = {
    thaloria:           { x: 1100, y: 200, lore: 'Thaloria' },
    eldrin_tower:       { x: 1200, y: 300, lore: "Eldrin's Tower" },
    summit_of_despair:  { x: 1400, y: 200, lore: 'Summit of Despair' },
    sylvan_sanctuary:   { x: 1300, y: 120, lore: 'Sylvan Sanctuary' },
    heartstone_chamber: { x: 800,  y: 350, lore: 'Heartstone Chamber' },
};

export const STEP = 90;   // lore px between a map and a neighbour placed beside it

const real = (getMap, id) => { const d = getMap(id); return d && d.id === id ? d : null; };

// Unit vector from the map's centre toward this exit (straight down if it sits at the centre).
export function exitDirection(portal, def) {
    const w = def.tiles?.[0]?.length ?? def.mapCols ?? 1, h = def.tiles?.length ?? def.mapRows ?? 1;
    const dx = portal.x - w / 2, dy = portal.y - h / 2, len = Math.hypot(dx, dy);
    return len < 1e-6 ? { dx: 0, dy: 1 } : { dx: dx / len, dy: dy / len };
}

export function layoutWorld(visitedIds, getMap, { knownExit = () => true } = {}) {
    const ids = [...new Set(visitedIds)].filter(id => { const d = real(getMap, id); return d && !d.interior; }).sort();
    const visited = new Set(ids);
    const pos = new Map();
    for (const id of ids) if (WORLD_ANCHORS[id]) pos.set(id, { x: WORLD_ANCHORS[id].x, y: WORLD_ANCHORS[id].y, anchored: true });

    const portalsOf = id => (real(getMap, id)?.portals ?? []).filter(p => p.targetMap !== '__return');
    const free = (x, y) => [...pos.values()].every(p => Math.hypot(p.x - x, p.y - y) >= STEP / 2);
    const placeNear = (from, dir) => {
        for (let ring = 1; ring <= 3; ring++) {
            for (let k = 0; k < 12; k++) {
                const turn = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * (Math.PI / 6);
                const c = Math.cos(turn), s = Math.sin(turn);
                const x = from.x + (dir.dx * c - dir.dy * s) * STEP * ring, y = from.y + (dir.dx * s + dir.dy * c) * STEP * ring;
                if (free(x, y)) return { x: Math.round(x), y: Math.round(y) };
            }
        }
        return { x: Math.round(from.x + dir.dx * STEP * 4), y: Math.round(from.y + dir.dy * STEP * 4) };
    };

    // Grow outward from placed maps, one neighbour at a time, in a fixed order.
    for (let changed = true; changed;) {
        changed = false;
        for (const id of ids) {
            if (pos.has(id)) continue;
            let spot = null;
            for (const other of ids) {
                if (!pos.has(other)) continue;
                const out = portalsOf(other).find(p => p.targetMap === id);
                const back = portalsOf(id).find(p => p.targetMap === other);
                if (!out && !back) continue;
                const d = out ? exitDirection(out, getMap(other)) : (({ dx, dy }) => ({ dx: -dx, dy: -dy }))(exitDirection(back, getMap(id)));
                spot = placeNear(pos.get(other), d);
                break;
            }
            if (spot) { pos.set(id, { ...spot, anchored: false }); changed = true; }
        }
    }
    // Maps joined to nothing placed: a row under everything else
    const bottom = Math.max(0, ...[...pos.values()].map(p => p.y)) + STEP * 1.5;
    let col = 0;
    for (const id of ids) {
        if (pos.has(id)) continue;
        let x = 200 + col * STEP;
        while (!free(x, bottom)) x += STEP;
        pos.set(id, { x, y: bottom, anchored: false });
        col = Math.round((x - 200) / STEP) + 1;
    }

    const nodes = ids.map(id => ({ id, name: getMap(id).displayName ?? id, ...pos.get(id) }));
    const edges = [], seenEdge = new Set(), stubs = [];
    for (const id of ids) {
        for (const p of portalsOf(id)) {
            if (visited.has(p.targetMap)) {
                const e = [id, p.targetMap].sort(), k = e.join('|');
                if (p.targetMap !== id && !seenEdge.has(k)) { seenEdge.add(k); edges.push(e); }
            } else if (real(getMap, p.targetMap) && !getMap(p.targetMap).interior && knownExit(id, p)) {
                const d = exitDirection(p, getMap(id)), from = pos.get(id);
                stubs.push({ from: id, targetMap: p.targetMap, x: Math.round(from.x + d.dx * STEP * 0.6), y: Math.round(from.y + d.dy * STEP * 0.6) });
            }
        }
    }
    edges.sort((a, b) => a.join('|').localeCompare(b.join('|')));
    return { nodes, edges, stubs };
}
```

- [ ] **Step 4: Run tests**

Run: `node tools/test_fog_map.mjs`
Expected: `test_fog_map: … checks passed`.

If `edges` contains a pair the test did not list (for example, Summit linking back to Sylvan Sanctuary is not visited here, so it should not), print `a.edges` and compare it against the real portals. The test reflects Thaloria's two exits (east_road, eldrin_tower) and Summit's two (east_road, sylvan_sanctuary) as verified while planning.

- [ ] **Step 5: Commit**

```bash
git add src/systems/worldLayout.js tools/test_fog_map.mjs
git commit -m "feat(amo): world layout — visited maps on the lore map's coordinates, the rest placed through their exits"
```

---

### Task 8: The full map, M (MapScene replaces WorldMapScene)

**Files:**
- Create: `src/scenes/MapScene.js`
- Modify: `src/main.js` (import and scene list: `WorldMapScene` → `MapScene`)
- Modify: `src/scenes/GameScene.js` (the `keydown-M` line: launch `'MapScene'`)
- Delete: `src/scenes/WorldMapScene.js` (`git rm`)

**Interfaces:**
- Consumes:
  - GameScene `_mapId`, `_mapDef`, `_fog`, `_mapImg`, `player` (Task 5);
  - `visibleFeatures`, `markersFor` (Task 4);
  - `layoutWorld` (Task 7);
  - `fogFor`, `isExplored` (Task 1);
  - `questManager.getActiveQuests()`, `playerStats.questLog`, `playerStats.countItem`, `playerStats.attunedGates`;
  - `MenuFocus` (returns GamepadNav state with `LB`, `RB`, `lx`, `ly`).
- Produces: scene key `'MapScene'`, launched with `{ tab: 'region' | 'world' }` (default `'region'`). Properties read by headless checks:
  - `_tab`, `_zoom`, `_cx`, `_cy`, `_features`, `_markers`;
  - `_worldNodes`: the `layoutWorld` result plus `here`.

- [ ] **Step 1: Write `src/scenes/MapScene.js`**

```js
// W5: the full map (M). Region tab: the explored map with exits, doors, rift-gates,
// landmarks and quest markers, pan (WASD / arrows / drag / left stick) and zoom (wheel,
// + / −, the on-screen buttons). World tab: the places you have been, on the lore map.
// TAB / LB / RB switches tabs; M, ESC, B or ✕ closes.
import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { questManager } from '../systems/QuestManager.js';
import { getMap } from '../data/maps/index.js';
import { TILE_SIZE } from '../data/worldMap.js';
import { MenuFocus } from '../systems/MenuFocus.js';
import { visibleFeatures, markersFor } from '../systems/mapMarkers.js';
import { layoutWorld } from '../systems/worldLayout.js';
import { fogFor, isExplored } from '../systems/fog.js';

const HEADER = 34, FOOTER = 24;
const ZOOM_MIN = 1, ZOOM_MAX = 24, ZOOM_STEP = 1.25;
const PAN_PX_PER_S = 420;

const questState = () => ({
    active: questManager.getActiveQuests().map(q => ({ quest: q, log: playerStats.questLog[q.id] })),
    countItem: id => playerStats.countItem(id),
    attunedGates: playerStats.attunedGates ?? [],
});

export default class MapScene extends Phaser.Scene {
    constructor() { super('MapScene'); }

    init(data) { this._tab = data?.tab === 'world' ? 'world' : 'region'; }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this._vw = w;
        this._vh = h - HEADER - FOOTER;
        this.add.rectangle(0, 0, w, h, 0x05060a, 0.97).setOrigin(0).setDepth(0);

        const gs = this.scene.get('GameScene');
        this._gs = gs;
        this._mapId = gs._mapId;
        this._def = gs._mapDef ?? getMap(this._mapId);
        this._fog = gs._fog ?? null;
        this._mapImg = gs._mapImg ?? null;

        this._region = this.add.container(0, 0).setDepth(1);
        this._world = this.add.container(0, 0).setDepth(1);
        this._overlay = this.add.graphics().setDepth(2);
        this._labels = [];

        // Header and footer bars sit above the map image
        this.add.rectangle(0, 0, w, HEADER, 0x0b0d16, 1).setOrigin(0).setDepth(5);
        this.add.rectangle(0, h - FOOTER, w, FOOTER, 0x0b0d16, 1).setOrigin(0).setDepth(5);
        const tabStyle = { font: 'bold 12px monospace', fill: '#887755' };
        this._tabTexts = {
            region: this.add.text(12, 10, 'REGION', tabStyle).setDepth(6).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showTab('region')),
            world: this.add.text(84, 10, 'WORLD', tabStyle).setDepth(6).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._showTab('world')),
        };
        this._title = this.add.text(w / 2, 9, '', { font: 'bold 13px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 0).setDepth(6);
        this.add.text(w - 28, 12, '[TAB] tab  [WASD/drag] pan  [wheel/+ −] zoom  [M/ESC] close', { font: '9px monospace', fill: '#776655' }).setOrigin(1, 0).setDepth(6);
        this.add.text(w - 6, 4, '✕', { font: 'bold 14px monospace', fill: '#aa4444', stroke: '#000', strokeThickness: 2 })
            .setOrigin(1, 0).setDepth(7).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._close());
        this._legend = this.add.text(12, h - FOOTER + 6, '', { font: '9px monospace', fill: '#aaaaaa' }).setDepth(6);
        this._zoomBtns = [
            this.add.text(w - 54, h - FOOTER + 2, ' + ', { font: 'bold 14px monospace', fill: '#ddccaa', backgroundColor: '#222233' }).setDepth(7).setInteractive().on('pointerdown', () => this._zoomBy(ZOOM_STEP)),
            this.add.text(w - 26, h - FOOTER + 2, ' − ', { font: 'bold 14px monospace', fill: '#ddccaa', backgroundColor: '#222233' }).setDepth(7).setInteractive().on('pointerdown', () => this._zoomBy(1 / ZOOM_STEP)),
        ];

        this._buildRegion();
        this._buildWorld();
        this._showTab(this._tab);

        // Input
        this._keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
        this.input.keyboard.addCapture('TAB');
        this.input.keyboard.on('keydown', e => {
            if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') this._close();
            else if (e.key === 'Tab') this._showTab(this._tab === 'region' ? 'world' : 'region');
            else if (e.key === '+' || e.key === '=') this._zoomBy(ZOOM_STEP);
            else if (e.key === '-' || e.key === '_') this._zoomBy(1 / ZOOM_STEP);
        });
        this.input.on('wheel', (p, objs, dx, dy) => this._zoomBy(dy > 0 ? 1 / ZOOM_STEP : ZOOM_STEP));
        this.input.on('pointerdown', p => { this._drag = { x: p.x, y: p.y, cx: this._cx, cy: this._cy }; });
        this.input.on('pointerup', () => { this._drag = null; });
        this.input.on('pointermove', p => {
            if (!this._drag || !p.isDown || this._tab !== 'region' || !this._img) return;
            this._panTo(this._drag.cx - (p.x - this._drag.x) / this._zoom, this._drag.cy - (p.y - this._drag.y) / this._zoom);
        });
        this._focus = new MenuFocus(this, { onBack: () => this._close() });
    }

    update(time, delta) {
        const gp = this._focus.poll(delta);
        if (gp?.LB || gp?.RB) this._showTab(this._tab === 'region' ? 'world' : 'region');
        if (this._tab !== 'region' || !this._img) return;
        const k = this._keys;
        let dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
        let dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
        if (gp && Math.hypot(gp.lx ?? 0, gp.ly ?? 0) > 0.2) { dx = gp.lx; dy = gp.ly; }
        if (dx || dy) {
            const step = PAN_PX_PER_S * delta / 1000 / this._zoom;
            this._panTo(this._cx + dx * step, this._cy + dy * step);
        }
    }

    // ── Region tab ────────────────────────────────────────────────────────────
    _buildRegion() {
        const def = this._def;
        this._mw = def.tiles?.[0]?.length ?? 0;
        this._mh = def.tiles?.length ?? 0;
        this._features = visibleFeatures(def, this._fog, playerStats, this._mapId);
        this._markers = markersFor(questState(), this._mapId, def, { getMap });
        if (!this._mapImg || !this._mw) {
            this._img = null;
            this._region.add(this.add.text(this._vw / 2, HEADER + this._vh / 2, 'No map of this place.', { font: '12px monospace', fill: '#887766' }).setOrigin(0.5));
            return;
        }
        this._img = this.add.image(0, 0, this._mapImg.key).setOrigin(0);
        this._region.add(this._img);
        const fit = Math.min(this._vw / this._mw, this._vh / this._mh);
        this._zoom = Phaser.Math.Clamp(Math.max(fit, 4), ZOOM_MIN, ZOOM_MAX);
        const p = this._gs.player;
        this._cx = p ? p.x / TILE_SIZE : this._mw / 2;
        this._cy = p ? p.y / TILE_SIZE : this._mh / 2;
        this._layoutRegion();
    }

    _toScreen(tx, ty) {
        return [this._vw / 2 + (tx - this._cx) * this._zoom, HEADER + this._vh / 2 + (ty - this._cy) * this._zoom];
    }

    _panTo(cx, cy) {
        this._cx = Phaser.Math.Clamp(cx, 0, this._mw);
        this._cy = Phaser.Math.Clamp(cy, 0, this._mh);
        this._layoutRegion();
    }

    _zoomBy(f) {
        if (this._tab !== 'region' || !this._img) return;
        this._zoom = Phaser.Math.Clamp(this._zoom * f, ZOOM_MIN, ZOOM_MAX);
        this._layoutRegion();
    }

    _layoutRegion() {
        if (!this._img) return;
        const [ox, oy] = this._toScreen(0, 0);
        this._img.setPosition(ox, oy).setScale(this._zoom);
        this._drawRegionOverlay();
    }

    _drawRegionOverlay() {
        const g = this._overlay;
        g.clear();
        this._labels.forEach(t => t.destroy());
        this._labels = [];
        if (this._tab !== 'region' || !this._img) return;
        const z = this._zoom;
        const c = (tx, ty) => this._toScreen(tx + 0.5, ty + 0.5);
        const onView = (x, y) => x >= -20 && x <= this._vw + 20 && y >= HEADER - 20 && y <= HEADER + this._vh + 20;
        const label = (x, y, text, fill) => this._labels.push(this.add.text(x, y, text, { font: '9px monospace', fill, stroke: '#000', strokeThickness: 2 }).setOrigin(0, 0.5).setDepth(3));
        const f = this._features;
        for (const e of f.exits) {
            const [x, y] = c(e.x, e.y);
            if (!onView(x, y)) continue;
            g.fillStyle(0x44ddff, 1).fillTriangle(x, y - 5, x - 4, y + 3, x + 4, y + 3);
            label(x + 7, y, e.targetMap === '__return' ? 'Exit' : (getMap(e.targetMap).displayName ?? e.label), '#88eeff');
        }
        for (const d of f.doors) {
            const [x, y] = c(d.x, d.y);
            if (!onView(x, y)) continue;
            g.fillStyle(d.locked ? 0xaa3333 : 0xc89a5a, 1).fillRect(x - 3, y - 3, 6, 6);
            if (z >= 6) label(x + 6, y, d.label ?? 'Door', d.locked ? '#cc6666' : '#ddbb88');
        }
        for (const gt of f.gates) {
            const [x, y] = c(gt.x, gt.y);
            if (!onView(x, y)) continue;
            g.lineStyle(2, gt.attuned ? 0xffd700 : 0x4477cc, 1).strokeCircle(x, y, 5);
            if (z >= 3) label(x + 8, y, gt.label ?? 'Rift-Gate', gt.attuned ? '#ffd700' : '#6688bb');
        }
        for (const l of f.landmarks) {
            const [x, y] = c(l.x, l.y);
            if (!onView(x, y)) continue;
            g.fillStyle(l.discovered ? 0xffe080 : 0x777777, 1).fillCircle(x, y, 4);
            label(x + 7, y, l.name, l.discovered ? '#ffe080' : '#999999');
        }
        for (const m of this._markers) {
            const [x, y] = c(m.x, m.y);
            if (!onView(x, y)) continue;
            g.fillStyle(m.main ? 0xffd700 : 0xc0c0d0, 1).fillPoints([{ x, y: y - 7 }, { x: x + 5, y }, { x, y: y + 7 }, { x: x - 5, y }], true);
            label(x + 8, y - 8, m.label, m.main ? '#ffd700' : '#d0d0e0');
        }
        const p = this._gs.player;
        if (p) {
            const [x, y] = this._toScreen(p.x / TILE_SIZE, p.y / TILE_SIZE);
            g.fillStyle(0xffffff, 1).fillCircle(x, y, 4);
            g.lineStyle(1, 0x000000, 1).strokeCircle(x, y, 4);
            label(x + 7, y + 9, 'You', '#ffffff');
        }
    }

    // ── World tab ─────────────────────────────────────────────────────────────
    _buildWorld() {
        const visited = new Set(Object.keys(playerStats.explored ?? {}));
        const here = this._def.interior ? (playerStats.interiorReturn?.[0]?.mapId ?? this._mapId) : this._mapId;
        visited.add(here);
        const knownExit = (mapId, portal) => isExplored(fogFor(getMap(mapId), mapId, playerStats), portal.x, portal.y);
        const L = layoutWorld([...visited], getMap, { knownExit });
        this._worldNodes = { ...L, here };
        if (!L.nodes.length) {
            this._world.add(this.add.text(this._vw / 2, HEADER + this._vh / 2, 'Nowhere yet.', { font: '12px monospace', fill: '#887766' }).setOrigin(0.5));
            return;
        }
        const pts = [...L.nodes, ...L.stubs];
        const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x));
        const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y));
        const m = 70, s = Math.min((this._vw - 2 * m) / Math.max(1, maxX - minX), (this._vh - 2 * m) / Math.max(1, maxY - minY), 1.6);
        const P = (x, y) => [this._vw / 2 + (x - (minX + maxX) / 2) * s, HEADER + this._vh / 2 + (y - (minY + maxY) / 2) * s];
        const at = Object.fromEntries(L.nodes.map(n => [n.id, P(n.x, n.y)]));
        const g = this.add.graphics();
        this._world.add(g);
        for (const [a, b] of L.edges) g.lineStyle(2, 0x667788, 0.9).lineBetween(...at[a], ...at[b]);
        for (const st of L.stubs) {
            const [x0, y0] = at[st.from], [x1, y1] = P(st.x, st.y);
            g.lineStyle(1, 0x445566, 0.7).lineBetween(x0, y0, x1, y1);
            this._world.add(this.add.text(x1, y1, '?', { font: 'bold 10px monospace', fill: '#667788' }).setOrigin(0.5));
        }
        const qs = questState();
        for (const n of L.nodes) {
            const [x, y] = at[n.id];
            const isHere = n.id === here;
            g.fillStyle(isHere ? 0xffd700 : 0x88aacc, 1).fillCircle(x, y, isHere ? 7 : 5);
            if (isHere) g.lineStyle(2, 0xffffff, 0.8).strokeCircle(x, y, 10);
            this._world.add(this.add.text(x, y + 12, n.name, { font: '9px monospace', fill: isHere ? '#ffd700' : '#aabbcc', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 0));
            if (markersFor(qs, n.id, getMap(n.id), { getMap }).length) {
                this._world.add(this.add.text(x + 9, y - 14, '!', { font: 'bold 13px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5));
            }
        }
    }

    _showTab(tab) {
        this._tab = tab;
        this._region.setVisible(tab === 'region');
        this._world.setVisible(tab === 'world');
        this._zoomBtns.forEach(b => b.setVisible(tab === 'region' && !!this._img));
        this._tabTexts.region.setStyle({ fill: tab === 'region' ? '#ffd700' : '#887755' });
        this._tabTexts.world.setStyle({ fill: tab === 'world' ? '#ffd700' : '#887755' });
        this._title.setText(tab === 'region' ? (this._def.displayName ?? this._mapId) : 'THE KNOWN WORLD');
        this._legend.setText(tab === 'region'
            ? '▲ exit   ■ door (red: locked)   ○ rift-gate (gold: attuned)   ● landmark   ◆ quest'
            : '● a place you have been   ! a quest leads there   ? an exit you have seen');
        this._drawRegionOverlay();
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
```

- [ ] **Step 2: Wire it in**

- `src/main.js`: replace `import WorldMapScene      from './scenes/WorldMapScene.js';` with `import MapScene           from './scenes/MapScene.js';`, and `WorldMapScene,` in the scene list with `MapScene,`.
- `src/scenes/GameScene.js`, the `keydown-M` line: `this.input.keyboard.on('keydown-M', () => { this.scene.pause(); this.scene.launch('MapScene'); });`.
- Run `git rm src/scenes/WorldMapScene.js`, then `grep -rn "WorldMapScene" src` → expected: no output.

- [ ] **Step 3: Headless checks**

(a) Region tab on Thaloria with a quest marker. Start Chapter 3's quest so a talk/where step points somewhere in Thaloria. Use any active quest that has a marker on Thaloria; the Task 4 sweep showed which. Then open M, pan, zoom, switch tabs, close:

```
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 12000 --eval "0;;(()=>{const gs=__game.scene.getScene('GameScene');gs.scene.pause();gs.scene.launch('MapScene');})();;0;;(()=>{const ms=__game.scene.getScene('MapScene');const z0=ms._zoom,cx0=ms._cx;ms._zoomBy(1.25);ms._panTo(ms._cx+3,ms._cy);window.__r={tab:ms._tab,zoomed:ms._zoom>z0,panned:ms._cx>cx0,exits:ms._features.exits.length,doors:ms._features.doors.length,markers:ms._markers.map(m=>m.stepId)};ms._showTab('world');window.__r.world=ms._worldNodes.nodes.map(n=>n.id);window.__r.here=ms._worldNodes.here;})();;(()=>{const ms=__game.scene.getScene('MapScene');ms._showTab('region');})();;(()=>{console.log('RESULT',JSON.stringify(window.__r));__game.scene.getScene('MapScene')._close();})();;0;;(()=>{console.log('RESULT2',JSON.stringify({gameRunning:__game.scene.isActive('GameScene'),mapOpen:__game.scene.isActive('MapScene')}));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t8_region.png
```

Expected:
- `RESULT` with `tab:"region"`, `zoomed:true`, `panned:true`;
- `exits` ≥ 1 and `doors` ≥ 1, since Thaloria's spawn area is revealed and the east gate and inn door are near it;
- `world` contains `"thaloria"`, with `here:"thaloria"`;
- `RESULT2 {"gameRunning":true,"mapOpen":false}`.

Shot issue: the screenshot is taken at the end, after closing. Take a second run without the close step, with `--shot` to `w5_t8_open.png`, and read it. It should show:
- the map image under the header;
- the white "You" dot;
- the exit triangle and door squares;
- the legend in the footer.

(b) An interior: `?testmap=thaloria_inn`, with the same open step. Expected: the room is drawn fully (no fog), `here` falls back to the inn's own id on a fresh `?testmap` start (empty return stack), and nothing throws.

(c) samplemap: open M → `RESULT` with `_img` null, and the text "No map of this place." present (`ms._region.list.some(o=>o.text==='No map of this place.')`).

(d) The touch launcher's MAP button still opens it. Run `grep -n "worldMap" src/controls/LauncherControls.js src/scenes/UIScene.js` to find what it dispatches (the M key event). If it calls `scene.launch('WorldMapScene')` directly anywhere, change that call to `'MapScene'` too.

- [ ] **Step 4: Run the suite and commit**

Run: `npm test > /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t8.log 2>&1; tail -3 /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t8.log`
Expected: green. `test_input_bus.mjs` counts key actions; M is unchanged, so its count stays 28.

```bash
git add src/scenes/MapScene.js src/main.js src/scenes/GameScene.js
git commit -m "feat(amo): the full map (M) — region tab with fog, exits, doors, gates, landmarks, quest markers, pan and zoom; world tab on the lore map"
```

(`git rm` already staged the deletion.)

---

### Task 9: Charts and the cartographer

**Files:**
- Modify: `src/data/items.js` (two chart items next to `ancient_scroll`; `CARTOGRAPHER_CATALOG` and `CATALOGS` after `MERCHANT_CATALOG`)
- Modify: `src/scenes/ShopScene.js` (`init` and `_catalog`)
- Modify: `src/scenes/GameScene.js` (the shop's `shopData`)
- Modify: `src/data/dialogues.js` (`cartographer_greeting`)
- Modify: `tools/maps/gen_thaloria.py` (the cartographer NPC, `reserve(19, 22, 19, 22)`), then regenerate `src/data/maps/thaloria.js`
- Test: `tools/test_fog_map.mjs`

**Interfaces:**
- Consumes: `playerStats.charted` (Task 1); Task 5's repaint when `charted` changes.
- Produces:
  - `ITEMS.chart_thaloria` and `ITEMS.chart_east_road`, each `{ chartOf, onUse }`;
  - `CATALOGS = { cartographer: CARTOGRAPHER_CATALOG }`;
  - a shop NPC field `catalog: 'cartographer'`;
  - `ShopScene` data `{ catalog }`.

- [ ] **Step 1: Write the failing test**

Append to `tools/test_fog_map.mjs` above the final `console.log`:

```js
// ---- Charts
{
    const { ITEMS, CATALOGS, MERCHANT_CATALOG } = await import('../src/data/items.js');
    const { getMap } = await import('../src/data/maps/index.js');
    const charts = Object.values(ITEMS).filter(i => i.chartOf);
    eq(charts.map(c => c.id).sort(), ['chart_east_road', 'chart_thaloria'], 'two charts');
    ok(charts.every(c => getMap(c.chartOf).id === c.chartOf), 'each charts a registered map');
    const sold = new Set(CATALOGS.cartographer.map(e => e.id));
    ok(charts.every(c => sold.has(c.id)), 'the cartographer sells every chart');
    ok(CATALOGS.cartographer.every(e => ITEMS[e.id] && e.price > 0 && (e.currency === 'gold' || e.currency === 'glint')), 'catalogue entries are real items with a price');
    ok(!MERCHANT_CATALOG.some(e => ITEMS[e.id]?.chartOf), 'ordinary merchants do not sell charts');

    const s = new PlayerStats();
    s.addItem('chart_thaloria', 2);
    ok(s.useItem('chart_thaloria'), 'reading a chart works');
    eq(s.charted, { thaloria: true }, 'and charts Thaloria');
    eq(s.countItem('chart_thaloria'), 1, 'one copy used up');
    ok(!s.useItem('chart_thaloria'), 'a second copy is refused');
    eq(s.countItem('chart_thaloria'), 1, 'and kept');

    const t = getMap('thaloria');
    const carto = t.spawns.npcs.find(n => n.catalog === 'cartographer');
    ok(carto && carto.isShop, 'Thaloria has a cartographer shop');
    ok(t.tiles[carto.y][carto.x] !== 1, 'standing on open ground');
}
```

`addItem(itemId, qty)` is PlayerStats' inventory method (verified while planning).

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test_fog_map.mjs`
Expected: FAIL at `two charts`.

- [ ] **Step 3: Implement**

`src/data/items.js`, after the `ancient_scroll` entry:

```js
    // W5 charts: reading one marks the region's roads and landmarks on your map (M)
    chart_thaloria: {
        id: 'chart_thaloria', name: 'Chart of Thaloria',
        description: "A surveyor's chart of the city's streets and landmarks. Read it to mark them on your map (M).",
        color: 0xc8b48a, icon: 'itm_scroll', stackable: true, buyPrice: 40, sellPrice: 12, chartOf: 'thaloria',
        onUse: (stats) => { if (stats.charted.thaloria) return false; stats.charted.thaloria = true; return true; },
    },
    chart_east_road: {
        id: 'chart_east_road', name: 'Chart of the East Road',
        description: 'The road from the East Gate to the foot of the mountains, with its waystones and shelters. Read it to mark them on your map (M).',
        color: 0xc8b48a, icon: 'itm_scroll', stackable: true, buyPrice: 60, sellPrice: 18, chartOf: 'east_road',
        onUse: (stats) => { if (stats.charted.east_road) return false; stats.charted.east_road = true; return true; },
    },
```

After `MERCHANT_CATALOG`'s closing `];`:

```js

// W5: a cartographer's stock (shop NPCs with `catalog: 'cartographer'`)
export const CARTOGRAPHER_CATALOG = [
    { id: 'chart_thaloria',  price: 40, currency: 'gold' },
    { id: 'chart_east_road', price: 60, currency: 'gold' },
];
export const CATALOGS = { cartographer: CARTOGRAPHER_CATALOG };
```

`src/scenes/ShopScene.js`:
- the import becomes `import { ITEMS, MERCHANT_CATALOG, CATALOGS } from '../data/items.js';`;
- in `init(data)` add `this._entries = CATALOGS[data?.catalog] ?? MERCHANT_CATALOG;`;
- in `_catalog()` replace `return MERCHANT_CATALOG.filter(` with `return this._entries.filter(`.

`src/scenes/GameScene.js`: the shop's data line becomes:

```js
                const shopData = { currencyBias: this._mapDef?.currencyBias ?? 'neutral', shopName: def.shopName, catalog: def.catalog };
```

`src/data/dialogues.js`, after `thaloria_merchant_greeting`:

```js
    cartographer_greeting: [
        { speaker: 'Cartographer', text: 'Charts of the city and the road east, drawn from my own feet. Read one, and you will not walk in circles.' },
    ],
```

`tools/maps/gen_thaloria.py`:
- next to the other `reserve(...)` calls, add `reserve(19, 22, 19, 22)   # the cartographer`;
- in `npcs`, after the merchant, add:

```python
            {{ x: 19, y: 22, id: 'thaloria_cartographer', name: 'Cartographer', isShop: true, shopName: 'THE CARTOGRAPHER', catalog: 'cartographer',
               dialogue: 'cartographer_greeting', afterDialogue: 'cartographer_greeting',
               spriteKey: 'spr_old_dude', animProfile: 'lpc_universal', tint: 0xbbaa88 }},
```

Run: `python3 tools/maps/gen_thaloria.py && git diff --stat src/data/maps/thaloria.js`
Expected: a small diff, only the new NPC lines. If the whole file changed, the generator is not deterministic. Stop and investigate; do not commit a churned map.

- [ ] **Step 4: Run tests**

Run: `node tools/test_fog_map.mjs && node tools/test_economy.mjs && node tools/test_phase3_economy.mjs`
Expected: all pass.

- [ ] **Step 5: Headless check: buy, read, see it on the map without leaving**

```
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 12000 --eval "0;;(()=>{const gs=__game.scene.getScene('GameScene');const s=gs.player.stats;s.gold=(s.gold??0)+100;const before=gs._mapImg.img.data.slice();window.__before=before;s.addItem('chart_thaloria',1);s.useItem('chart_thaloria');})();;0;;(()=>{const gs=__game.scene.getScene('GameScene');const a=window.__before,b=gs._mapImg.img.data;let changed=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1])changed++;gs.scene.pause();gs.scene.launch('MapScene');window.__r={charted:gs.player.stats.charted.thaloria,changedPixels:changed};})();;0;;(()=>{const ms=__game.scene.getScene('MapScene');window.__r.landmarksShown=ms._features.landmarks.length;console.log('RESULT',JSON.stringify(window.__r));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t9_chart.png
```

Expected: `RESULT` with `charted: true` and `changedPixels` > 0 (roads painted under the fog, with no map change). `landmarksShown` is 0 until Task 10 adds Thaloria's landmarks; Task 10 re-checks it.

Then talk to the cartographer. Stand below them, face up, and call `_checkInteractions()` twice (the greeting, then the shop):

```
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 12000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.setPosition(19*32+16,23*32+16);gs.player.facing='up';})();;(()=>{__game.scene.getScene('GameScene')._checkInteractions();})();;0;;(()=>{const d=__game.scene.getScene('DialogueScene');d?.scene?.stop?.();d?.onComplete?.();d?._finish?.();})();;0;;(()=>{const sh=__game.scene.getScene('ShopScene');console.log('RESULT',JSON.stringify({open:__game.scene.isActive('ShopScene'),name:sh._shopName,items:sh._catalog().map(e=>e.id)}));})()"
```

Expected: `RESULT {"open":true,"name":"THE CARTOGRAPHER","items":["chart_thaloria","chart_east_road"]}`. If DialogueScene finishes differently, read `src/scenes/DialogueScene.js` for its completion call and use that instead of the guesses above.

- [ ] **Step 6: Run the suite and commit**

Run: `npm test > /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t9.log 2>&1; tail -3 /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t9.log`
Expected: green.

```bash
git add src/data/items.js src/scenes/ShopScene.js src/scenes/GameScene.js src/data/dialogues.js tools/maps/gen_thaloria.py src/data/maps/thaloria.js tools/test_fog_map.mjs
git commit -m "feat(amo): charts of Thaloria and the East Road, sold by a cartographer by the market; reading one marks the roads on your map"
```

---

### Task 10: Real landmarks, the manual, and the acceptance tour

**Files:**
- Modify: `tools/maps/gen_thaloria.py` → `src/data/maps/thaloria.js` (`spawns.landmarks`)
- Modify: `tools/maps/gen_east_road.py` → `src/data/maps/east_road.js` (`spawns.landmarks`)
- Modify: `tools/gen_game_inventory.mjs` → `docs/game_inventory.md`, `docs/manual/index.html`
- Test: `tools/test_fog_map.mjs`

**Interfaces:**
- Consumes: everything above.
- Produces: landmarks on the two Chapter 3 maps. Ids:
  - `thaloria_bell_tower_square`, `thaloria_market`, `thaloria_east_gate`;
  - `east_road_waystone`, `east_road_lean_to`.

These are generic places already present on the maps; the bell tower, the east gate and the lean-to already have signs. Nothing new for the DB.

- [ ] **Step 1: Write the failing test**

Append to `tools/test_fog_map.mjs` above the final `console.log`:

```js
// ---- Landmarks on the Chapter 3 maps
{
    const { getMap, listMaps } = await import('../src/data/maps/index.js');
    eq(getMap('thaloria').spawns.landmarks.map(l => l.id), ['thaloria_bell_tower_square', 'thaloria_market', 'thaloria_east_gate'], "Thaloria's landmarks");
    eq(getMap('east_road').spawns.landmarks.map(l => l.id), ['east_road_waystone', 'east_road_lean_to'], "the East Road's landmarks");
    const ids = [];
    for (const { id } of listMaps()) {
        const m = getMap(id);
        for (const l of m.spawns?.landmarks ?? []) {
            ids.push(l.id);
            ok(typeof l.name === 'string' && l.name && Number.isFinite(l.xp) && l.radius > 0, `${id}/${l.id}: name, xp, radius`);
            ok(m.tiles[l.y]?.[l.x] !== undefined && m.tiles[l.y][l.x] !== 1, `${id}/${l.id}: on the map, on open ground`);
        }
    }
    eq(new Set(ids).size, ids.length, 'landmark ids are unique across all maps (discovered is keyed by id)');
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tools/test_fog_map.mjs`
Expected: FAIL at `Thaloria's landmarks` (`spawns.landmarks` is undefined, so `.map` throws, or there is a mismatch).

- [ ] **Step 3: Add the landmarks**

`tools/maps/gen_thaloria.py`, in the spawns template (next to `bountyBoards`):

```python
        landmarks: [
            {{ id: 'thaloria_bell_tower_square', name: 'The Bell Tower', x: 12, y: 8, radius: 3, xp: 15 }},
            {{ id: 'thaloria_market', name: 'Thaloria Market', x: 15, y: 21, radius: 3, xp: 15 }},
            {{ id: 'thaloria_east_gate', name: 'The East Gate', x: 29, y: 12, radius: 2, xp: 15 }},
        ],
```

`tools/maps/gen_east_road.py`, in the spawns template (next to `crackedBoulders`):

```python
        landmarks: [
            {{ id: 'east_road_waystone', name: 'The Old Waystone', x: {S['waystone'][0]}, y: {S['waystone'][1]}, radius: 2, xp: 25 }},
            {{ id: 'east_road_lean_to', name: "The Shepherd's Lean-to", x: {S['leanto_sign'][0]}, y: {S['leanto_sign'][1]}, radius: 3, xp: 25 }},
        ],
```

Before running, check that every chosen tile is open ground: `node -e "import('./src/data/maps/index.js').then(m=>{const t=m.getMap('thaloria').tiles;console.log(t[8][12],t[21][15],t[12][29])})"`. Expected: three values ≠ 1. If any is 1, move that landmark one tile toward the road and re-check.

Run: `python3 tools/maps/gen_thaloria.py && python3 tools/maps/gen_east_road.py && git diff --stat src/data/maps/`
Expected: small diffs, only the landmark lines (as in Task 9).

- [ ] **Step 4: Manual**

In `tools/gen_game_inventory.mjs`:
- In the key table, replace `['M', 'World map']` with `['M', 'Map: Region tab (explored ground, exits, doors, rift-gates, landmarks, quest markers; WASD/drag to pan, wheel or + − to zoom) and World tab (the places you have been); TAB, LB or RB switches']`.
- In the systems table, after the `Doors & interiors` row, add:

```js
    ['Map & fog of war', 'Every outdoor map starts unknown. Walking reveals about 6 tiles around you (4 in dense forest) and the map remembers it; rooms are always fully known. The minimap shows the 48 tiles around you; M shows the whole map. Exits, doors and rift-gates appear once you have seen them; the active quest steps are marked (◆) where they lead, a step inside a building marks its door.'],
    ['Charts', "A cartographer by Thaloria's market sells charts (Thaloria 40 Gold, the East Road 60 Gold). Reading one shows the region's roads under the fog and marks where its landmarks are."],
    ['Landmarks', 'Notable places. Reaching one the first time shows "Discovered: …", gives XP and pins it on your map.'],
    ['Dense forest', 'Deep woods shrink how far you see and darken the edges of the screen. Keep to the roads, or trust your map.'],
```

- In the `Saving` row, change `explored map` to `explored map (fog per map), charts read, landmarks discovered`.

Run: `node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html`
Expected: `wrote …game_inventory.md (… lines)`. `grep -c "Chart of Thaloria" ../../docs/game_inventory.md` gives ≥ 1, because the item tables pick up the new items.

- [ ] **Step 5: Run the tests and the suite**

Run: `node tools/test_fog_map.mjs && npm test > /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t10.log 2>&1; tail -3 /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w5_t10.log`
Expected: green.

- [ ] **Step 6: The acceptance tour (the spec's three acceptance lines)**

1. **"Walking into a fresh region shows black everywhere except your trail."** Task 6 (a) already showed `litShare` < 0.01 on streamtest. Repeat it on east_road after walking its road for 6 s. Expected:
   - `litShare` between 0.05 and 0.6;
   - the screenshot shows black outside a band along the road.
2. **"Buying the chart shows the roads and landmarks; walking a landmark discovers it once."** On thaloria:
   - read the chart;
   - open M: `ms._features.landmarks.length` is 3, all named `?`;
   - close it;
   - teleport onto `thaloria_market` and wait 2 steps: `discovered.thaloria_market` is true, and the XP gain is 15;
   - teleport away and back: XP does not change again;
   - open M: that landmark is named `Thaloria Market`.
3. **"The active quest step has a marker in the right place on M."** On east_road with Chapter 3's main quest active (`questManager.startQuest('main_odysseys_dawn')`, Chapter 3's quest per `src/data/campaigns/eldorias_prophecy.js`), reveal around Oren (`gs._fog` via `revealAround` is not needed, since markers ignore fog). Open M. Expected:
   - `ms._markers` contains a step pointing at Oren's tile (46, 8) or at another named target of the active step;
   - the screenshot shows the gold diamond beside him.

For each one, print `console.log('RESULT', …)` and read the screenshot.

- [ ] **Step 7: Commit**

```bash
git add tools/maps/gen_thaloria.py src/data/maps/thaloria.js tools/maps/gen_east_road.py src/data/maps/east_road.js tools/gen_game_inventory.mjs ../../docs/game_inventory.md ../../docs/manual/index.html tools/test_fog_map.mjs
git commit -m "feat(amo): landmarks in Thaloria and on the East Road; manual — the map, fog, charts, landmarks, dense forest"
```

---

## Self-review (done while planning)

- **Spec coverage:**

  | Spec item | Task |
  |---|---|
  | Fog bitset, 4×4 cells, radius 6 (4 in dense), interiors known, save default `{}` | 1, 5 |
  | Minimap: 48×48 player-centred, unexplored black, landmarks and doors once seen | 6 |
  | Full map (M), Region tab: fog, "you are here", name, exits, landmarks, gates, doors, quest markers, pan and zoom | 8 |
  | World tab: visited regions linked by known exits, lore coordinates | 7, 8 |
  | Quest markers: talk, attune, read_signs, kill, explicit `where` | 4 |
  | Chart items and `charted` | 9 |
  | Landmarks with `discovered` and XP | 1, 3, 5, 10 |
  | Dense layer and vignette | 2, 3, 5 |
  | Rules modules `fog.js` and `mapMarkers.js`, test `test_fog_map.mjs` | all |
  | Acceptance lines | 10 |

- **Interface names used across tasks:**
  - `fogFor`, `revealAround`, `encodeFog`, `isExplored`, `newlyDiscovered`;
  - `paintMap`, `paintCells`, `denseMask`, `isDenseAt`, `chartMask`;
  - `visibleFeatures(def, fog, stats, mapId)`, `markersFor(state, mapId, def, { getMap })`;
  - `layoutWorld(ids, getMap, { knownExit })`;
  - `buildMapTexture` / `repaintMapTexture`;
  - GameScene `_fog`, `_mapImg`, `_inDense`.

  These match their producing tasks.
- **Placeholders:**
  - Task 5's persistence check depends on the campaign gate, so it points at the W3 ledger rather than guessing.
  - Task 9's DialogueScene completion call is checked against the file first.
  - Both are look-ups, not missing design.
