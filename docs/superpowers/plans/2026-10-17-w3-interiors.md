# W3 Interiors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Any building can have a door into an interior. A generator builds interiors from templates (inn, shop, smithy, house, temple, tower floor, cellar, guildhall), so a city can have dozens of them. The first ones are in Thaloria: the inn and its cellar, the bell tower, and a locked house.

**Architecture:**
- **Pure rules, `src/systems/interiors.js`:** door locks; a *return stack* in the save, so leaving an interior (even a nested one, like the cellar under the inn) puts you back in front of the door you came through; resolving the `__return` exit portal.
- **GameScene:**
  - builds `doors` spawns and enters them through the existing `_enterPortal`;
  - supports invisible "book" signs and hidden stash chests;
  - draws interiors whose walls are collision only (`treeArt: false`) and whose floor is catalogue art.
- **Generator, `tools/maps/gen_interiors.py`:** turns template definitions and per-city interior specs into ordinary small map modules, plus a generated registry merged into `getMap()`.

**Tech Stack:** Phaser 3.90, ES modules, Python 3 generators with `sheetmap.SheetMap`, LPC catalogue atlases (`lpc/obj_misk_atlas`, `lpc/build_atlas`, `lpc/base_out_atlas`, `lpc/terrain_atlas`), Node `assert` tests, headless checks via `../tool_suite/lpc_forge/tools/console.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-17-world-scale-design.md` (section W3)

**Depends on:** W1 and W2 merged. This plan edits W2's tree streaming in `_buildWorld`, and uses the per-item decoration placement.

## Global Constraints

- Every new save field gets a default in `PlayerStats` (constructor and `reset()`), and old saves load without errors.
- Every pure module gets a `tools/test_*.mjs` test chained into `npm test`.
- Every system is checked headless in the running game via `tools/console.mjs` and `window.__game` before it is called done.
- Existing maps keep working unchanged at every step; `npm test` stays green.
- New lore (places, people) is checked against the Neo4j graph first. New game-only places are recorded as `origin: "game"` for the user's DB sync.
- Characters never reference songs or albums in-world.
- Sprite names are verified against the catalogue (the generator fails on unknown names) and visually in a rendered preview. Never assume a name's meaning from its wording alone.
- Commits go straight to `main`.
- Work from `apps/amo` (paths are relative to it unless they start with `docs/`).

## Rulings against the spec (made while planning)

- **The return point is a stack** (`playerStats.interiorReturn: []`), not a single `{ mapId, x, y }`. A single slot breaks nested interiors: entering the cellar from the inn would overwrite the inn's return point. Arriving on any non-interior map clears the stack, so fast travel, death or a tear out of an interior leaves nothing stale.
- **Interior side and south walls are black collision** (tile 1 drawn as nothing). Only the north wall has a face, drawn from LPC wall tiles. Most LPC interiors read the same way, and the void needs no art.
- **Thaloria's NPCs are not moved indoors in W3.** The inn is furnished but empty. W4 (townsfolk schedules) and W6 (the rebuilt city) put people inside. W3 proves doors, nesting, locks, books and stashes.
- **Lore:** W3 adds only generic rooms in the existing Thaloria map. No named places or people are invented, so there is nothing new to record for the DB beyond the room ids (game-only, listed in the final report).

## Review Focus

1. **Save and reload inside a nested interior** (the cellar), then leave twice: you must come out in the inn, then on the street in front of the inn door. Pinned in Task 1's tests (stack round-trip through `SaveManager`) and Task 5's headless check.
2. **Fast travel or death while indoors:** the stack must not send a later `__return` somewhere stale. Pinned in Task 1 (`clearReturnsOutside`) and Task 5's headless check.
3. **An interior exit with an empty stack** (a save made before W3, or a debug `?testmap=thaloria_inn`): the exit must use the interior's `exitFallback`, never trap the player. Pinned in Task 1's tests and Task 5's headless check.
4. **A generated room where furniture walls off a slot** (an NPC, chest or book unreachable from the entrance): the generator must refuse and retry with the next seed, never write it. Pinned in Task 3 (generator self-check) and Task 4 (`tools/test_interiors.mjs` reachability over every registered interior).
5. **Pressing E with both a door and an NPC in reach:** the door is used only when the interaction box overlaps the door tile, and NPC talk keeps working everywhere else. Pinned in Task 5's headless check (talk to the Trader beside the inn after the doors exist).

---

### Task 1: Interior rules and the return stack (pure + save)

**Files:**
- Create: `src/systems/interiors.js`
- Modify: `src/systems/PlayerStats.js` (constructor next to the W1 Vigor block, and `reset()`)
- Modify: `src/systems/SaveManager.js` (save object and load)
- Test: `tools/test_interiors.mjs`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `RETURN_KEY = '__return'`
  - `doorLockState(def, stats) → { open: boolean, reason: string | null }`. `def.locked` is either absent or `{ item?: string, flag?: string, text?: string }`. A door with both `item` and `flag` opens if *either* is met.
  - `doorReturnPoint(def, tilePx = 32) → { x, y }` (px, the tile in front of the door: south by default, or `def.facing` 'up'|'down'|'left'|'right' = the direction you face to enter)
  - `pushReturn(stats, entry: { mapId, x, y }) → void`
  - `resolvePortal(portalDef, stats, mapDef) → { targetMap, targetX, targetY } | null` (pops the stack for `__return`; falls back to `mapDef.exitFallback`; null if neither)
  - `clearReturnsOutside(stats, mapDef) → void` (empties the stack unless `mapDef.interior`)
  - `PlayerStats.interiorReturn: Array<{ mapId, x, y }>`, saved.

- [ ] **Step 1: Write the failing test**

Create `tools/test_interiors.mjs`:

```js
// W3 interiors: door locks, the return stack, the exit portal, the save.
// Run: node tools/test_interiors.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const I = await import('../src/systems/interiors.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- Locks
{
    const s = new PlayerStats();
    eq(I.doorLockState({ x: 1, y: 1, interior: 'a' }, s), { open: true, reason: null }, 'no lock: open');
    const byFlag = { x: 1, y: 1, interior: 'a', locked: { flag: 'house_key' } };
    eq(I.doorLockState(byFlag, s).open, false, 'flag lock closed');
    ok(/locked/i.test(I.doorLockState(byFlag, s).reason), 'a default "locked" message');
    s.flags.house_key = true;
    eq(I.doorLockState(byFlag, s).open, true, 'flag set: open');
    const byItem = { x: 1, y: 1, interior: 'a', locked: { item: 'silver_ore', text: 'A silver lock.' } };
    eq(I.doorLockState(byItem, s), { open: false, reason: 'A silver lock.' }, 'custom text');
    s.addItem('silver_ore');
    eq(I.doorLockState(byItem, s).open, true, 'carrying the item opens it');
    const either = { x: 1, y: 1, interior: 'a', locked: { item: 'mana_potion', flag: 'house_key' } };
    eq(I.doorLockState(either, s).open, true, 'either condition opens');
}

// ---- Return point in front of the door
{
    eq(I.doorReturnPoint({ x: 5, y: 16 }), { x: 176, y: 560 }, 'south of the door by default (one tile + a bit)');
    eq(I.doorReturnPoint({ x: 5, y: 16, facing: 'down' }), { x: 176, y: 496 }, 'a door entered facing down: stand north of it');
    eq(I.doorReturnPoint({ x: 5, y: 16, facing: 'left' }), { x: 208, y: 528 }, 'facing left: stand east');
}

// ---- The stack, the exit portal, nesting
{
    const s = new PlayerStats();
    eq(s.interiorReturn, [], 'a new character has an empty stack');
    const inn = { id: 'inn', interior: true, exitFallback: { map: 'thaloria', x: 5, y: 17 } };
    const town = { id: 'thaloria' };
    I.pushReturn(s, { mapId: 'thaloria', x: 176, y: 560 });
    I.pushReturn(s, { mapId: 'inn', x: 300, y: 200 });
    eq(I.resolvePortal({ targetMap: '__return' }, s, inn), { targetMap: 'inn', targetX: 300, targetY: 200 }, 'cellar exit: back into the inn');
    eq(I.resolvePortal({ targetMap: '__return' }, s, inn), { targetMap: 'thaloria', targetX: 176, targetY: 560 }, 'inn exit: back to the street');
    eq(s.interiorReturn, [], 'popped empty');
    eq(I.resolvePortal({ targetMap: '__return' }, s, inn), { targetMap: 'thaloria', targetX: 176, targetY: 560 }, 'empty stack: the fallback (tile → px centre)');
    eq(I.resolvePortal({ targetMap: '__return' }, s, { id: 'x', interior: true }), null, 'no stack, no fallback: null');
    const plain = { targetMap: 'east_road', targetX: 10, targetY: 20, label: 'East' };
    eq(I.resolvePortal(plain, s, town), { targetMap: 'east_road', targetX: 10, targetY: 20 }, 'ordinary portals unchanged');

    I.pushReturn(s, { mapId: 'thaloria', x: 1, y: 2 });
    I.clearReturnsOutside(s, inn);
    eq(s.interiorReturn.length, 1, 'kept while indoors');
    I.clearReturnsOutside(s, town);
    eq(s.interiorReturn, [], 'cleared on any outdoor map');
}

// ---- Save
{
    const s = new PlayerStats();
    I.pushReturn(s, { mapId: 'thaloria', x: 176, y: 560 });
    I.pushReturn(s, { mapId: 'thaloria_inn', x: 300, y: 200 });
    SaveManager.save(s, 'st_int', 'c1');
    const back = new PlayerStats();
    SaveManager.load(back, 'st_int', 'c1');
    eq(back.interiorReturn, s.interiorReturn, 'the stack survives a save');
    ok(back.interiorReturn[0] !== s.interiorReturn[0], 'copied, not shared');

    const old = new PlayerStats();
    const raw = JSON.parse(store.get([...store.keys()].find(k => k.includes('st_int'))));
    delete raw.interiorReturn;
    store.set([...store.keys()].find(k => k.includes('st_int')), JSON.stringify(raw));
    SaveManager.load(old, 'st_int', 'c1');
    eq(old.interiorReturn, [], 'an old save loads with an empty stack');
    s.reset();
    eq(s.interiorReturn, [], 'reset empties it');
}

console.log(`test_interiors: ${n} checks passed`);
```

Before running, check how SaveManager names its storage key. `grep -n "localStorage\|_key(" src/systems/SaveManager.js | head`. If the key does not contain the story id, change the `.find(k => k.includes('st_int'))` lookups to match the key format you find.

- [ ] **Step 2: Run to verify it fails**

Run: `node tools/test_interiors.mjs`
Expected: FAIL with `Cannot find module '.../src/systems/interiors.js'`

- [ ] **Step 3: Implement**

Create `src/systems/interiors.js`:

```js
// Interiors (W3): door locks, where you stand when you come back out, and the
// return stack that lets nested interiors (a cellar under an inn) unwind in
// order. Pure — tools/test_interiors.mjs. GameScene uses it for doors and the
// '__return' exit portal every generated interior has.

export const RETURN_KEY = '__return';

export function doorLockState(def, stats) {
    const lock = def.locked;
    if (!lock) return { open: true, reason: null };
    const hasItem = lock.item && (stats.countItem?.(lock.item) ?? 0) > 0;
    const hasFlag = lock.flag && !!stats.flags?.[lock.flag];
    if (hasItem || hasFlag) return { open: true, reason: null };
    return { open: false, reason: lock.text ?? 'It\'s locked.' };
}

// The tile you stand on to use the door: one tile back along the way you faced.
export function doorReturnPoint(def, tilePx = 32) {
    const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[def.facing ?? 'up'];
    return { x: (def.x + back[0]) * tilePx + tilePx / 2, y: (def.y + back[1]) * tilePx + tilePx / 2 };
}

export function pushReturn(stats, entry) {
    stats.interiorReturn ??= [];
    stats.interiorReturn.push({ mapId: entry.mapId, x: entry.x, y: entry.y });
}

export function resolvePortal(portalDef, stats, mapDef, tilePx = 32) {
    if (portalDef.targetMap !== RETURN_KEY) {
        return { targetMap: portalDef.targetMap, targetX: portalDef.targetX, targetY: portalDef.targetY };
    }
    const top = stats.interiorReturn?.pop();
    if (top) return { targetMap: top.mapId, targetX: top.x, targetY: top.y };
    const fb = mapDef?.exitFallback;
    if (fb) return { targetMap: fb.map, targetX: fb.x * tilePx + tilePx / 2, targetY: fb.y * tilePx + tilePx / 2 };
    return null;
}

export function clearReturnsOutside(stats, mapDef) {
    if (!mapDef?.interior) stats.interiorReturn = [];
}
```

The default `facing` is `'up'`: you face up to walk into a door on a building's south face, and stand one tile south of it. `doorReturnPoint({x:5,y:16})` is therefore `(5, 17)` in tiles, which is `{ x: 176, y: 560 }`. The test's other two cases follow the same rule.

`src/systems/PlayerStats.js`, constructor (after the W1 Vigor block):

```js
        // Interiors (W3, systems/interiors.js): where each door you went through
        // leads back to, innermost last. Cleared on any outdoor map.
        this.interiorReturn = [];
```

`reset()`, after its Vigor lines:

```js
        this.interiorReturn   = [];
```

`src/systems/SaveManager.js`. In the save object, next to `gameMinutes: stats.gameMinutes ?? 480,`:

```js
            interiorReturn:    (stats.interiorReturn ?? []).map(e => ({ mapId: e.mapId, x: e.x, y: e.y })),
```

In load, next to `stats.gameMinutes = ...`:

```js
            stats.interiorReturn  = Array.isArray(d.interiorReturn) ? d.interiorReturn.map(e => ({ mapId: e.mapId, x: e.x, y: e.y })) : [];
```

- [ ] **Step 4: Run tests and chain**

Run: `node tools/test_interiors.mjs`
Expected: `test_interiors: <N> checks passed`.

In `package.json`'s `"test"` script, insert `node tools/test_interiors.mjs && ` right after `python3 tools/maps/test_region_writer.py && `.

Run: `npm test 2>&1 | tail -3`
Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/systems/interiors.js src/systems/PlayerStats.js src/systems/SaveManager.js tools/test_interiors.mjs package.json
git commit -m "feat(amo): interior rules — door locks, and a saved return stack so nested rooms unwind in order"
```

---

### Task 2: Doors, books, stashes and wall-only interiors in GameScene

**Files:**
- Modify: `src/scenes/GameScene.js`:
  - imports;
  - `create()`: right after `const mapDef = this._mapDef = getMap(this._mapId);`, and after the signs block (~line 330);
  - chests creation (~line 338);
  - signs creation;
  - `_buildWorld` (the W2 tree streaming);
  - `_updateInteractPrompts`;
  - `_checkInteractions` (door check first; chest open reveals a stash);
  - `_enterPortal`;
  - new method `_useDoor`.

**Interfaces:**
- Consumes: `RETURN_KEY`, `doorLockState`, `doorReturnPoint`, `pushReturn`, `resolvePortal`, `clearReturnsOutside` (Task 1).
- Produces map-def fields the generator (Task 3) writes and GameScene now reads:
  - `interior: true`, `treeArt: false` (tile 1 is collision without tree art), `exitFallback: { map, x, y }` (tiles);
  - `spawns.doors: [{ x, y, interior, label?, facing?, locked?, look?: 'hatch' }]`;
  - `spawns.signs[].kind: 'book'` (invisible, `[E] Read`);
  - `spawns.chests[].hidden: true` (invisible until opened, `[E] ?`).

- [ ] **Step 1: Imports and the stack reset**

Add to GameScene imports:

```js
import { RETURN_KEY, doorLockState, doorReturnPoint, pushReturn, resolvePortal, clearReturnsOutside } from '../systems/interiors.js';
```

In `create()`, right after `const mapDef = this._mapDef = getMap(this._mapId);`:

```js
        clearReturnsOutside(playerStats, mapDef);   // W3: outdoors, no door is waiting to be walked back through
```

- [ ] **Step 2: Wall-only tiles for interiors**

In `_buildWorld`, in W2's tree code, change the line that collects tree cells:

```js
        tiles.forEach((row, r) => row.forEach((tile, c) => { if (tile === 1) treeCells.push({ x: c, y: r }); }));
```

to:

```js
        // Interiors draw their walls themselves: tile 1 is collision only there (W3)
        if (this._mapDef.treeArt !== false)
            tiles.forEach((row, r) => row.forEach((tile, c) => { if (tile === 1) treeCells.push({ x: c, y: r }); }));
```

(A `floorFrame: -1` already yields an empty floor cell in the existing `floorData` mapping, so interiors show their `backgroundColor` under the floor decorations.)

- [ ] **Step 3: Doors, books and stashes**

Right after the signs block in `create()`:

```js
        // Doors into interiors (W3). The building's drawn door is the art; this is
        // the trigger. A 'hatch' (a cellar trapdoor) draws its own frame.
        this.doors = this.physics.add.staticGroup();
        (mapDef.spawns.doors ?? []).forEach(def => {
            const dx = def.x * TILE_SIZE + TILE_SIZE / 2;
            const dy = def.y * TILE_SIZE + TILE_SIZE / 2;
            const door = this.doors.create(dx, dy, 'tile_tree').setAlpha(0);
            door.refreshBody();
            door.doorDef = def;
            if (def.look === 'hatch') {
                const g = this.add.graphics().setDepth(dy - 40);
                g.fillStyle(0x0a0604, 1).fillRect(dx - 12, dy - 12, 24, 24);
                g.lineStyle(3, 0x4a2c10, 1).strokeRect(dx - 12, dy - 12, 24, 24);
            }
            door.ePrompt = this.add.text(dx, dy - TILE_SIZE / 2 - 4, `[E] ${def.label ?? 'Enter'}`, {
                font: '7px monospace', fill: def.locked ? '#cc9966' : '#ffff88'
            }).setOrigin(0.5, 1).setDepth(25).setResolution(3).setAlpha(0);
        });
```

In the signs block, right after `sprite.signId = ...`, add:

```js
            if (sign.kind === 'book') sprite.setAlpha(0);   // W3: the shelf or desk under it is the art
```

and change the sign prompt text from `'[E]'` to `sign.kind === 'book' ? '[E] Read' : '[E]'`.

In the chests block, right after `sprite.chestDef = def;`:

```js
            if (def.hidden && !playerStats.chestContents?.[`${this._mapId}:${def.x},${def.y}`]) sprite.setAlpha(0);   // W3 stash
```

and change that chest's prompt text from `'[E]'` to `def.hidden ? '[E] ?' : '[E]'`.

In `_checkInteractions`'s chest handler, right after `openChest(chest, this._storyId, this._characterId);`:

```js
            if (chest.alpha === 0) {
                chest.setAlpha(1);
                this.scene.get('UIScene')?.showNotification?.('Something was hidden here…', 1600);
            }
```

- [ ] **Step 4: Using a door**

At the very top of `_checkInteractions()` (before the NPC overlap):

```js
        // Doors first — only when the interaction box is on the door itself (W3)
        let door = null;
        this.physics.overlap(this.player.interactBox, this.doors, (_b, d) => { door ??= d; });
        if (door) { this._useDoor(door.doorDef); return; }
```

Add the method next to `_enterPortal`:

```js
    _useDoor(def) {
        if (this._transitioning) return;
        soundManager.interact();
        const lock = doorLockState(def, playerStats);
        if (!lock.open) {
            this.scene.get('UIScene')?.showNotification?.(lock.reason, 1800);
            return;
        }
        const target = getMap(def.interior);
        if (target?.id !== def.interior) {
            console.warn(`door at ${def.x},${def.y} leads to unknown interior "${def.interior}"`);
            this.scene.get('UIScene')?.showNotification?.('The door will not open.', 1500);
            return;
        }
        pushReturn(playerStats, { mapId: this._mapId, ...doorReturnPoint(def) });
        this._enterPortal({
            targetMap: def.interior,
            targetX: target.playerStart.x * TILE_SIZE + TILE_SIZE / 2,
            targetY: target.playerStart.y * TILE_SIZE + TILE_SIZE / 2,
        });
    }
```

In `_enterPortal(portalDef)`, right after `if (this._transitioning) return;`:

```js
        // An interior's exit goes back through the door you came in by (W3)
        if (portalDef.targetMap === RETURN_KEY) {
            const back = resolvePortal(portalDef, playerStats, this._mapDef);
            if (!back) {
                this.scene.get('UIScene')?.showNotification?.('The way out is blocked.', 1500);
                return;
            }
            portalDef = { ...portalDef, ...back };
        }
```

- [ ] **Step 5: Prompts**

In `_updateInteractPrompts()`, after the signs line:

```js
        this.doors.getChildren().forEach(d => d.ePrompt?.setAlpha(near(d) ? 1 : 0));
```

and add `this.doors.getChildren().some(d => near(d)) ||` as the first term of the `this._nearInteract =` expression.

- [ ] **Step 6: Run the suite**

Run: `npm test 2>&1 | tail -3`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(amo): doors into interiors, an exit that goes back the way you came, readable books and hidden stashes"
```

(The headless checks run in Task 5, once there are interiors to enter.)

---

### Task 3: The interior generator and its templates

**Files:**
- Create: `tools/maps/interiors/__init__.py` (empty)
- Create: `tools/maps/interiors/templates.py`
- Create: `tools/maps/interiors/thaloria.py` (the city's interior specs)
- Create: `tools/maps/gen_interiors.py`
- Create (generated): `src/data/maps/interiors/*.js`, `src/data/maps/interiors/index.js`
- Modify: `src/data/maps/index.js` (merge `INTERIORS`)

**Interfaces:**
- Consumes: `sheetmap.SheetMap`, `sheetmap.tiles_js`, `sheetmap.AMO`; the map-def fields from Task 2.
- Produces:
  - `src/data/maps/interiors/index.js` exporting `INTERIORS: { [id]: mapDef }`;
  - per-interior map defs with `interior: true`, `treeArt: false`, `biome: 'indoor'`, `exitFallback`, an exit portal `{ targetMap: '__return' }` on the south-wall opening, and `playerStart` one tile above it;
  - `slots` used by specs: template-named positions (`counter`, `hearth`, `cellar`, `desk`, …) that specs fill with NPCs, stations or doors.

- [ ] **Step 1: Templates**

Create `tools/maps/interiors/templates.py`:

```python
"""
Interior templates (W3). Each template describes a kind of room. gen_interiors.py
turns a template + a seed into a furnished, walkable room. Names are LPC catalogue
entries (resolved across the four LPC atlases by find_sheet); every name here was
checked to exist when this file was written, and gen_interiors.py fails on any
that does not.

A placement is (rule, choices, count):
  rule     'north'  against the north wall (tall pieces lean into the wall face)
           'side'   against the west or east wall
           'corner' a floor corner (never the two by the exit)
           'centre' anywhere at least one tile from every wall
           'floor'  under-layer art (rugs): anywhere inside, never blocks
           'row'    a group laid left to right (e.g. a long table), placed 'centre'
  choices  names; for 'row', a list of lists (each inner list is one group)
  count    an int, or (min, max)
Furniture blocks unless the name is in NEVER_BLOCK.
"""

WALLS = {
    # (upper face row, lower face row, cap row or None) — rows 1, 2 and 0 of the room
    'sienna_brick': ('sienna_brick_wall_mid_fill_a', 'sienna_brick_wall_base_fill_a', 'sienna_brick_wall_top_fill'),
    'red_brick':    ('red_brick_wall_mid_fill', 'red_brick_wall_base_fill', None),
    'stone':        ('stone_wall_top_fill', 'stone_wall_base_fill', None),
    'mint':         ('mint_wall_mid_fill', 'mint_wall_base_fill', 'mint_wall_crown_fill'),
    'wood_plank':   ('wood_plank_wall_fill_a', 'wood_plank_wall_fill_b', None),
}

FLOORS = {
    'taupe_brick': ['taupe_brick_floor_fill_a', 'taupe_brick_floor_fill_b', 'taupe_brick_floor_fill_c', 'taupe_brick_floor_fill_d'],
    'checker':     ['checker_floor_tile_brown'],
    'flagstone':   ['cream_flagstone_floor_fill_a', 'cream_flagstone_floor_fill_b', 'cream_flagstone_floor_fill_c'],
    'slate':       ['slate_floor_slab_fill_a', 'slate_floor_slab_fill_b', 'slate_floor_slab_fill_c', 'slate_floor_slab_crack_a'],
    'marble':      ['marble_floor_gray_fill_a', 'marble_floor_gray_fill_b', 'marble_floor_gray_fill_c'],
}

NEVER_BLOCK = {'rug_oval_maroon_gold_trim', 'rug_oval_mint_checker_a', 'rug_rounded_orange_gold_trim'}
TALL_LEAN = {'bookshelf_books': 2, 'shelf_dishes_pewter': 2}   # rows of the sprite drawn over the wall face

TABLE_LONG = ['table_wood_plank_left', 'table_wood_plank_mid', 'table_wood_plank_right']
WORKBENCH = ['workbench_wood_long_a_left', 'workbench_wood_long_a_mid1', 'workbench_wood_long_a_mid2', 'workbench_wood_long_a_right']
COUNTER = ['counter_wood_dark_wares', 'counter_wood_dark_wares', 'counter_wood_dark_empty']

LOOT = {
    'home':   ['health_potion', 'forest_herb', 'herb_tea', 'honeyberry', 'wood', 'berry_compote'],
    'larder': ['honeyberry', 'mushroom_spore', 'forest_salad', 'wild_herb_broth', 'wood', 'mineral_ore'],
    'study':  ['mana_potion', 'ancient_scroll', 'legion_lore_fragment', 'herb_tea'],
    'stash':  ['greater_health_potion', 'greater_mana_potion', 'regen_potion', 'silver_ore'],
}

BOOKS = {
    'home':  ["A household ledger. Flour, lamp oil, a new pair of boots. Under 'owed', a long list crossed out one by one.",
              "A child's primer, the letters traced over and over in a careful, unsteady hand."],
    'inn':   ["The inn's guest book. Merchants from the coast, pilgrims, a scholar who signed only with a drawn eye.",
              "A price list chalked on a slate: a bed for the night, a bowl of stew, stabling extra."],
    'study': ["Notes on the old roads east of the city. Several waystones are marked; one is circled twice.",
              "A treatise on ward-glyphs, half the margins filled with someone else's arguments."],
    'temple': ["A book of prayers for travellers. One page is worn soft with use: a blessing for the road at night."],
}

TEMPLATES = {
    'house': {
        'size': ((8, 11), (8, 10)), 'walls': ['wood_plank', 'sienna_brick'], 'floors': ['checker', 'taupe_brick'],
        'light': 0x1a1208, 'loot': 'home', 'books': ('home', (0, 1)), 'chests': (1, 2), 'stash': 1 / 6,
        'place': [
            ('floor',  ['rug_oval_maroon_gold_trim', 'rug_rounded_orange_gold_trim'], 1),
            ('north',  ['bed_red_plain', 'bed_double_blue', 'bed_double_red_a'], 1),
            ('north',  ['dresser_wood_drawers', 'cabinet_wood_red_plain'], 1),
            ('centre', ['table_round_pedestal_gold'], 1),
            ('centre', ['chair_wood_tan_side_b', 'chair_wood_tan_side_c'], (1, 2)),
            ('corner', ['potted_plant_flowering', 'barrel_a', 'sack_burlap_a'], (1, 2)),
        ],
        'slots': {},
    },
    'inn': {
        'size': ((15, 18), (11, 13)), 'walls': ['sienna_brick'], 'floors': ['taupe_brick'],
        'light': 0x1a1208, 'loot': 'larder', 'books': ('inn', (1, 1)), 'chests': (1, 1), 'stash': 0,
        'place': [
            ('floor',  ['rug_rounded_orange_gold_trim'], 1),
            ('north',  ['shelf_dishes_pewter'], 2),
            ('row',    [TABLE_LONG], 2),
            ('centre', ['bench_wood_plain_a', 'bench_wood_plain_b'], (3, 4)),
            ('corner', ['barrel_a', 'barrel_b', 'barrel_cluster_trio'], (2, 3)),
            ('north',  ['lamp_table_gold_bright_a'], 1),
        ],
        # A counter along the west part of the north side; its keeper stands behind it.
        'slots': {'counter': 'counter', 'hearth': 'north', 'cellar': 'corner'},
    },
    'shop': {
        'size': ((10, 13), (8, 10)), 'walls': ['mint', 'sienna_brick'], 'floors': ['flagstone'],
        'light': 0x16120a, 'loot': 'home', 'books': ('home', (0, 1)), 'chests': (1, 1), 'stash': 0,
        'place': [
            ('north',  ['shelf_dishes_pewter', 'bookshelf_books'], 2),
            ('side',   ['market_crate_tomato', 'market_crate_cabbage', 'market_crate_potato', 'market_crate_strawberry'], (2, 4)),
            ('corner', ['sack_grain_yellow_pair', 'barrel_a', 'wood_crate_panel_plain'], (1, 2)),
        ],
        'slots': {'counter': 'counter'},
    },
    'smithy': {
        'size': ((10, 12), (8, 10)), 'walls': ['stone'], 'floors': ['slate'],
        'light': 0x1c0e04, 'loot': 'larder', 'books': ('home', (0, 0)), 'chests': (1, 1), 'stash': 0,
        'place': [
            ('row',    [WORKBENCH], 1),
            ('centre', ['anvil_on_stump'], 1),
            ('corner', ['fire_barrel_lit', 'barrel_a', 'wood_slatted_crate'], (2, 3)),
            ('side',   ['iron_bar_scraps_a', 'iron_bar_scraps_b'], (1, 2)),
        ],
        'slots': {'smith': 'centre'},
    },
    'temple': {
        'size': ((14, 18), (12, 15)), 'walls': ['stone', 'red_brick'], 'floors': ['marble'],
        'light': 0x10101a, 'loot': 'study', 'books': ('temple', (1, 2)), 'chests': (0, 1), 'stash': 0,
        'place': [
            ('north',  ['banner_cloth_gold_emblem_tree'], 2),
            ('north',  ['candle_stand_tall'], 2),
            ('centre', ['bench_wood_tan_slat_tall_a', 'bench_wood_tan_slat_tall_b'], (6, 8)),
            ('corner', ['potted_plant_flowering', 'potted_shrub_bush'], (2, 3)),
        ],
        'slots': {'altar': 'north'},
    },
    'tower': {
        'size': ((9, 11), (9, 11)), 'walls': ['stone'], 'floors': ['slate', 'flagstone'],
        'light': 0x10101a, 'loot': 'study', 'books': ('study', (2, 3)), 'chests': (1, 1), 'stash': 1 / 4,
        'place': [
            ('north',  ['bookshelf_books'], (2, 3)),
            ('centre', ['table_round_pedestal_gold'], 1),
            ('centre', ['lamp_table_gold_plain_a'], 1),
            ('floor',  ['rug_oval_mint_checker_a'], 1),
        ],
        'slots': {'desk': 'centre'},
    },
    'cellar': {
        'size': ((10, 14), (8, 10)), 'walls': ['stone'], 'floors': ['slate'],
        'light': 0x06060a, 'loot': 'larder', 'books': ('home', (0, 0)), 'chests': (1, 2), 'stash': 1 / 3,
        'place': [
            ('side',   ['barrel_a', 'barrel_b', 'wooden_barrel_a'], (3, 5)),
            ('corner', ['sack_burlap_pile_large', 'sack_grain_yellow_pair', 'wood_crate_panel_plain'], (2, 3)),
            ('centre', ['wood_crate_panel_posts', 'sack_burlap_b'], (1, 3)),
        ],
        'slots': {},
    },
    'guildhall': {
        'size': ((16, 20), (12, 14)), 'walls': ['red_brick', 'sienna_brick'], 'floors': ['marble', 'flagstone'],
        'light': 0x12100a, 'loot': 'study', 'books': ('study', (2, 3)), 'chests': (1, 2), 'stash': 0,
        'place': [
            ('north',  ['bookshelf_books'], (3, 4)),
            ('north',  ['banner_cloth_gold_emblem_tree'], 2),
            ('row',    [TABLE_LONG], 2),
            ('centre', ['chair_wood_padded', 'armchair_wood_red_slat_front_a'], (3, 5)),
            ('floor',  ['rug_oval_maroon_gold_trim'], 1),
        ],
        'slots': {'master': 'north'},
    },
}
```

- [ ] **Step 2: Thaloria's interior specs**

Create `tools/maps/interiors/thaloria.py`:

```python
"""Thaloria's interiors (W3). `door` is the tile on the city map; `fallback` the
street tile in front of it (used only when the return stack is empty)."""

CITY = 'thaloria'

INTERIORS = [
    {'id': 'thaloria_inn', 'template': 'inn', 'seed': 1, 'displayName': 'Thaloria — the Inn',
     'door': (5, 16), 'label': 'Enter the Inn', 'currencyBias': 'capital',
     'slot_doors': {'cellar': {'interior': 'thaloria_inn_cellar', 'label': 'Down to the cellar', 'look': 'hatch'}}},
    {'id': 'thaloria_inn_cellar', 'template': 'cellar', 'seed': 2, 'displayName': 'Thaloria — the Inn\'s cellar',
     'parent': 'thaloria_inn', 'label': 'Cellar'},
    {'id': 'thaloria_bell_tower', 'template': 'tower', 'seed': 3, 'displayName': 'Thaloria — the Bell Tower',
     'door': (11, 6), 'label': 'Enter the Bell Tower'},
    {'id': 'thaloria_house_teal', 'template': 'house', 'seed': 4, 'displayName': 'Thaloria — a house',
     'door': (21, 16), 'label': 'A house',
     'locked': {'flag': 'thaloria_house_teal_open', 'text': 'Locked. No one answers.'}},
]
```

Check the door tiles before generating: `python3 -c "import sys; sys.path.insert(0,'tools/maps'); exec(open('tools/maps/gen_thaloria.py').read().split('# ------------------------------------------------------------------ the square')[0])"` is fragile, so read them from the generator instead. In `gen_thaloria.py`, `house(x0, wy, w, …)` puts its door at `(x0 + w // 2, wy)`. The inn `house(2, 16, 7, …)` → `(5, 16)`. The bell tower `house(10, 6, 3, …)` → `(11, 6)`. The teal house `house(19, 16, 4, …)` → `(21, 16)`. If `gen_thaloria.py` has changed since this plan was written, recompute them the same way.

`currencyBias` must be a value the game accepts. Check with `grep -rn "currencyBias" src/data/maps/thaloria.js src/systems/*.js | head`, and use Thaloria's own value for the inn.

- [ ] **Step 3: The generator**

Create `tools/maps/gen_interiors.py`:

```python
#!/usr/bin/env python3
"""
Generates interior maps (W3) from tools/maps/interiors/templates.py and each
city's specs (tools/maps/interiors/<city>.py) into src/data/maps/interiors/,
plus interiors/index.js (merged into getMap's registry).

Room layout (w x h tiles, walls included):
  row 0        cap (wall top), black or the style's cap art   — collision
  rows 1-2     north wall face (LPC wall tiles)               — collision
  rows 3..h-2  floor, cols 1..w-2
  row h-1      south wall (black) with a one-tile opening at the centre — the exit
  cols 0, w-1  side walls (black)                             — collision
The player enters on (cx, h-2) facing up; the exit portal sits in the opening.
Every slot, chest, book and NPC must be reachable from the entrance, or the
seed is rejected and the next one tried.

Run from apps/amo/: python3 tools/maps/gen_interiors.py [city ...]
Preview one: python3 tools/maps/render_map_preview.py thaloria_inn out.png
"""
import importlib
import json
import random
import sys
from collections import deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, tiles_js, AMO  # noqa: E402
from interiors.templates import TEMPLATES, WALLS, FLOORS, NEVER_BLOCK, TALL_LEAN, COUNTER, LOOT, BOOKS  # noqa: E402

OUT = AMO / 'src/data/maps/interiors'
ATLASES = ['lpc/obj_misk_atlas', 'lpc/build_atlas', 'lpc/base_out_atlas', 'lpc/terrain_atlas']
_probe = SheetMap()


def find_sheet(name):
    hits = [a for a in ATLASES if name in _probe.catalogue(a)[1]]
    if not hits:
        raise KeyError(f'{name}: not in any LPC atlas')
    return hits[0]


def size_of(name):
    return _probe.size_tiles(find_sheet(name), name)


def blocks(name):
    return name not in NEVER_BLOCK


class Room:
    def __init__(self, spec, tpl, rng):
        self.spec, self.tpl, self.rng = spec, tpl, rng
        (wmin, wmax), (hmin, hmax) = tpl['size']
        self.w, self.h = rng.randint(wmin, wmax), rng.randint(hmin, hmax)
        self.cx = self.w // 2
        self.tiles = [[1] * self.w for _ in range(self.h)]
        for y in range(3, self.h - 1):
            for x in range(1, self.w - 1):
                self.tiles[y][x] = 0
        self.tiles[self.h - 1][self.cx] = 0        # the opening
        self.taken = set()                         # floor cells blocked by furniture
        self.keep = {(self.cx, self.h - 1), (self.cx, self.h - 2), (self.cx, self.h - 3)}  # entrance lane
        self.items, self.slots, self.chests, self.books = [], {}, [], []

    def floor(self):
        return [(x, y) for y in range(3, self.h - 1) for x in range(1, self.w - 1)]

    def free(self, x, y):
        return self.tiles[y][x] == 0 and (x, y) not in self.taken and (x, y) not in self.keep

    def reachable(self):
        start, seen, q = (self.cx, self.h - 2), {(self.cx, self.h - 2)}, deque([(self.cx, self.h - 2)])
        while q:
            x, y = q.popleft()
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < self.w and 0 <= ny < self.h and (nx, ny) not in seen \
                        and self.tiles[ny][nx] == 0 and (nx, ny) not in self.taken:
                    seen.add((nx, ny))
                    q.append((nx, ny))
        return seen

    def touchable(self, cell, reach):
        x, y = cell
        return any(n in reach for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x, y)))

    def place(self, name, x, y, lean=0):
        """(x, y) is the first floor cell the piece stands on; its sprite is drawn from row y - lean
        (a leaning shelf's top rows cover the wall face). Occupies rows y .. y + ht - lean - 1.
        Undone if it cuts the room in two."""
        wt, ht = size_of(name)
        cells = [(x + dx, y + dy) for dx in range(wt) for dy in range(ht - lean)]
        if not all(0 < cx < self.w - 1 and 3 <= cy < self.h - 1 and self.free(cx, cy) for cx, cy in cells):
            return False
        if blocks(name):
            self.taken.update(cells)
            reach = self.reachable()
            floor_free = [c for c in self.floor() if c not in self.taken]
            if len([c for c in floor_free if c in reach]) < len(floor_free):
                self.taken.difference_update(cells)
                return False
        self.items.append({'name': name, 'x': x, 'y': y - lean, 'blocking': blocks(name)})
        return True

    def spots(self, rule, wt, ht):
        f = [(x, y) for (x, y) in self.floor()]
        if rule == 'north':
            return [(x, 3) for x in range(1, self.w - wt)]
        if rule == 'side':
            return [(1, y) for y in range(4, self.h - ht - 1)] + [(self.w - 1 - wt, y) for y in range(4, self.h - ht - 1)]
        if rule == 'corner':
            return [(1, 3), (self.w - 1 - wt, 3), (1, self.h - 1 - ht), (self.w - 1 - wt, self.h - 1 - ht)]
        if rule in ('centre', 'row', 'floor'):
            return [(x, y) for (x, y) in f if 2 <= x <= self.w - 2 - wt and 4 <= y <= self.h - 2 - ht]
        raise ValueError(rule)

    def put(self, rule, name):
        wt, ht = size_of(name)
        lean = TALL_LEAN.get(name, 0) if rule == 'north' else 0
        if rule == 'floor':
            x, y = self.rng.choice(self.spots('floor', wt, ht))
            self.items.append({'name': name, 'x': x, 'y': y, 'blocking': False})
            return True
        spots = self.spots(rule, wt, ht)
        self.rng.shuffle(spots)
        return any(self.place(name, x, y, lean) for x, y in spots)

    def put_row(self, group):
        wt = sum(size_of(n)[0] for n in group)
        spots = self.spots('row', wt, 1)
        self.rng.shuffle(spots)
        for x, y in spots:
            xs, ok_all, placed = x, True, []
            for n in group:
                if not self.place(n, xs, y):
                    ok_all = False
                    break
                placed.append(self.items[-1])
                xs += size_of(n)[0]
            if ok_all:
                return True
            for it in placed:                       # roll back a partial row
                self.items.remove(it)
                w_, h_ = size_of(it['name'])
                self.taken.difference_update({(it['x'] + dx, it['y'] + dy) for dx in range(w_) for dy in range(h_)})
        return False

    def slot(self, key, rule):
        if rule == 'counter':
            y = 5
            x0 = 2
            if not all(self.free(x, y) for x in range(x0, x0 + len(COUNTER))):
                return False
            for i, n in enumerate(COUNTER):
                self.place(n, x0 + i, y)
            self.slots[key] = (x0 + 1, y - 1)   # behind the counter
            self.keep.add(self.slots[key])
            return True
        spots = self.spots('corner' if rule == 'corner' else rule, 1, 1)
        self.rng.shuffle(spots)
        for x, y in spots:
            if self.free(x, y):
                self.slots[key] = (x, y)
                self.keep.add((x, y))
                return True
        return False


def count(c, rng):
    return rng.randint(*c) if isinstance(c, tuple) else c


def build(spec, seed):
    tpl = TEMPLATES[spec['template']]
    rng = random.Random(seed)
    room = Room(spec, tpl, rng)
    for key, rule in tpl['slots'].items():
        if not room.slot(key, rule):
            return None
    for rule, choices, n in tpl['place']:
        for _ in range(count(n, rng)):
            if rule == 'row':
                room.put_row(rng.choice(choices))
            else:
                room.put(rule, rng.choice(choices))
    # Containers and books against walls, stash in a corner
    wall_cells = [c for c in room.floor() if room.free(*c) and (c[0] in (1, room.w - 2) or c[1] == 3)]
    rng.shuffle(wall_cells)
    for _ in range(count(tpl['chests'], rng)):
        if wall_cells:
            x, y = wall_cells.pop()
            room.taken.add((x, y))
            room.chests.append({'x': x, 'y': y, 'items': rng.sample(LOOT[tpl['loot']], 2)})
    pool, nb = tpl['books']
    for i in range(count(nb, rng)):
        if wall_cells:
            x, y = wall_cells.pop()
            room.taken.add((x, y))
            room.books.append({'x': x, 'y': y, 'kind': 'book', 'text': BOOKS[pool][i % len(BOOKS[pool])]})
    if rng.random() < tpl['stash'] and wall_cells:
        x, y = wall_cells.pop()
        room.taken.add((x, y))
        room.chests.append({'x': x, 'y': y, 'hidden': True, 'items': rng.sample(LOOT['stash'], 2)})
    # Everything reachable?
    reach = room.reachable()
    for cell in [*room.slots.values(), *[(c['x'], c['y']) for c in room.chests], *[(b['x'], b['y']) for b in room.books]]:
        if not room.touchable(cell, reach):
            return None
    return room


def emit(spec, room, parents):
    tpl = TEMPLATES[spec['template']]
    rng = room.rng
    sm = SheetMap()
    floor_names = FLOORS[rng.choice(tpl['floors'])]
    for (x, y) in room.floor() + [(room.cx, room.h - 1)]:
        n = rng.choice(floor_names)
        sm.add(find_sheet(n), n, x, y, blocking=False, depthOffset=-100000)
    upper, lower, cap = WALLS[rng.choice(tpl['walls'])]
    for x in range(1, room.w - 1):
        sm.add(find_sheet(upper), upper, x, 1, blocking=False)
        sm.add(find_sheet(lower), lower, x, 2, blocking=False)
        if cap:
            sm.add(find_sheet(cap), cap, x, 0, blocking=False)
    for it in room.items:
        sm.add(find_sheet(it['name']), it['name'], it['x'], it['y'], blocking=it['blocking'])

    doors = []
    for key, d in spec.get('slot_doors', {}).items():
        x, y = room.slots[key]
        doors.append({'x': x, 'y': y, 'interior': d['interior'], 'label': d['label'], 'facing': 'up', **({'look': d['look']} if 'look' in d else {})})
    if spec.get('parent'):
        p = parents[spec['parent']]
        fb = {'map': p['city'], 'x': p['door'][0], 'y': p['door'][1] + 1}
    else:
        fb = {'map': spec['city'], 'x': spec['door'][0], 'y': spec['door'][1] + 1}
    const = spec['id'].upper()
    spawns = {
        'enemies': [], 'npcs': spec.get('npcs', []), 'chests': room.chests, 'campfires': [], 'signs': room.books,
        'gatheringNodes': [], 'crackedBoulders': [], 'riftGates': [], 'pillarGates': [], 'boss': None,
        'stations': [{**s, 'x': room.slots[s['slot']][0], 'y': room.slots[s['slot']][1]} for s in spec.get('stations', [])],
        'doors': doors,
    }
    for s in spawns['stations']:
        s.pop('slot', None)
    js = f"""// AUTO-GENERATED by tools/maps/gen_interiors.py — {spec['id']} (template {spec['template']}, seed {spec['_seed']}).
// Edit tools/maps/interiors/{spec['city']}.py or templates.py and regenerate; do not edit by hand.

const {const}_EXTRA_SHEETS = {sm.extra_sheets_js()};

const {const}_SHEET_DECORATIONS = {sm.sheet_decorations_js()};

export const MAP = {{
    id: {json.dumps(spec['id'])},
    displayName: {json.dumps(spec['displayName'])},
    biome: 'indoor',
    interior: true,
    treeArt: false,
    backgroundColor: '#000000',
    lightTint: {tpl['light']:#08x},
    tiles: {tiles_js(room.tiles)},
    tileset: {{ key: 'tileset_base', floorFrame: -1, pathFrame: -1 }},
    playerStart: {{ x: {room.cx}, y: {room.h - 2} }},
    exitFallback: {json.dumps(fb)},
    extraSheets: {const}_EXTRA_SHEETS,
    sheetDecorations: {const}_SHEET_DECORATIONS,
    portals: [{{ id: {json.dumps(spec['id'] + '_exit')}, x: {room.cx}, y: {room.h - 1}, label: 'Leave', targetMap: '__return', targetX: 0, targetY: 0 }}],
    spawns: {json.dumps(spawns, indent=4)},
    currencyBias: {json.dumps(spec.get('currencyBias', 'outskirt'))},
    music: null,
    quests: [],
    chapterTitle: null,
    introDialogue: null,
    introRegistryKey: null,
}};
"""
    (OUT / f"{spec['id']}.js").write_text(js)


def main(cities):
    OUT.mkdir(parents=True, exist_ok=True)
    specs = []
    for city in cities:
        mod = importlib.import_module(f'interiors.{city}')
        for s in mod.INTERIORS:
            specs.append({**s, 'city': mod.CITY})
    parents = {s['id']: s for s in specs}
    for spec in specs:
        for k in range(40):
            room = build(spec, spec['seed'] * 1000 + k)
            if room:
                spec['_seed'] = spec['seed'] * 1000 + k
                emit(spec, room, parents)
                print(f"{spec['id']}: {room.w}x{room.h}, {len(room.items)} pieces, {len(room.chests)} chests, {len(room.books)} books (seed {spec['_seed']})")
                break
        else:
            raise SystemExit(f"{spec['id']}: no valid layout in 40 seeds — loosen the template")
    ids = sorted(s['id'] for s in specs)
    lines = [f"import {{ MAP as {i.upper()} }} from './{i}.js';" for i in ids]
    lines.append('')
    lines.append('// AUTO-GENERATED by tools/maps/gen_interiors.py')
    lines.append('export const INTERIORS = {')
    lines += [f'    {i}: {i.upper()},' for i in ids]
    lines.append('};')
    (OUT / 'index.js').write_text('\n'.join(lines) + '\n')
    # The doors on the city maps, for the city generators to read
    (OUT / 'doors.json').write_text(json.dumps({
        s['city']: [] for s in specs} | {city: [
            {'x': s['door'][0], 'y': s['door'][1], 'interior': s['id'], 'label': s['label'],
             **({'locked': s['locked']} if 'locked' in s else {})}
            for s in specs if s['city'] == city and 'door' in s] for city in {s['city'] for s in specs}}, indent=2))


if __name__ == '__main__':
    main(sys.argv[1:] or ['thaloria'])
```

Notes for the implementer:
- For `'north'`, `place(name, x, 3, lean)` draws a 3-tall shelf (`lean` 2) from row 1 and occupies only floor row 3, so its top two rows cover the wall face. Check it in the preview (Step 5). A shelf must stand on the floor with its top over the wall, never floating in the room.
- `doors.json` is written for the city generators. Task 4 wires it into Thaloria.

- [ ] **Step 4: Generate**

Run: `touch tools/maps/interiors/__init__.py && python3 tools/maps/gen_interiors.py thaloria`
Expected: four lines (`thaloria_inn`, `thaloria_inn_cellar`, `thaloria_bell_tower`, `thaloria_house_teal`) with sizes and counts, and files in `src/data/maps/interiors/`.

A `KeyError: <name>: not in any LPC atlas` means a template name is wrong. Find the right one with `grep -o '"name": *"[a-z_]*KEYWORD[a-z_]*"' public/assets/catalogued/tilesets/lpc/*.catalogue.json`. Then fix `templates.py` and record the swap in the ledger.

- [ ] **Step 5: Preview every interior and look at it**

```bash
for i in thaloria_inn thaloria_inn_cellar thaloria_bell_tower thaloria_house_teal; do python3 tools/maps/render_map_preview.py $i /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/$i.png; done
```

If the preview tool cannot find maps under `src/data/maps/interiors/`, add that directory to its lookup (it already reads `extraSheets` and `sheetDecorations` for generated maps).

Open each PNG with Read and check:
- the north wall reads as one continuous wall face (two rows), not a patchwork;
- if the upper and lower names look swapped or mismatched, fix `WALLS` (look at the atlas region in the preview, never guess from the name);
- the floor is one material, with no holes;
- shelves stand against the wall with their tops over the wall face;
- beds and tables are on the floor;
- nothing covers the entrance;
- the inn has a counter, tables and barrels.

Record any name swap in the ledger as a ruling. Re-run Steps 4–5 until all four look right.

- [ ] **Step 6: Register**

In `src/data/maps/index.js`, add:

```js
import { INTERIORS } from './interiors/index.js';
```

and spread it at the end of `REGISTRY`:

```js
    ...INTERIORS,
```

- [ ] **Step 7: Commit**

```bash
git add tools/maps/interiors tools/maps/gen_interiors.py src/data/maps/interiors src/data/maps/index.js tools/maps/render_map_preview.py
git commit -m "feat(amo): interior generator — eight room templates; Thaloria's inn, its cellar, the bell tower and a house"
```

---

### Task 4: Doors on Thaloria, and checks over every interior

**Files:**
- Modify: `tools/maps/gen_thaloria.py` (read `src/data/maps/interiors/doors.json`, write `spawns.doors`)
- Regenerate: `src/data/maps/thaloria.js`
- Test: `tools/test_interiors.mjs` (append)

**Interfaces:**
- Consumes: `doors.json` and the registered interiors (Task 3).
- Produces: `getMap('thaloria').spawns.doors` (3 doors: inn, bell tower, the teal house). The cellar door is inside the inn.

- [ ] **Step 1: Write the failing test** (append before the final `console.log`)

```js
// ---- Every registered interior is walkable and wired; Thaloria's doors lead somewhere
{
    const { getMap, listMaps } = await import('../src/data/maps/index.js');
    const open = (m, x, y) => m.tiles[y]?.[x] === 0;
    const interiors = listMaps().map(e => getMap(e.id ?? e)).filter(m => m.interior);
    ok(interiors.length >= 4, `interiors registered (${interiors.length})`);
    for (const m of interiors) {
        eq([m.treeArt, m.biome], [false, 'indoor'], `${m.id}: wall-only, indoor`);
        ok(open(m, m.playerStart.x, m.playerStart.y), `${m.id}: start on the floor`);
        const exit = m.portals.find(p => p.targetMap === I.RETURN_KEY);
        ok(exit && open(m, exit.x, exit.y), `${m.id}: an exit in the opening`);
        ok(getMap(m.exitFallback.map).id === m.exitFallback.map, `${m.id}: fallback map exists`);
        // BFS from the start over floor (0) minus furniture is the generator's job;
        // here: every chest, book and door has an open neighbour reachable on the tile grid.
        const seen = new Set([`${m.playerStart.x},${m.playerStart.y}`]); const q = [[m.playerStart.x, m.playerStart.y]];
        while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const k = `${nx},${ny}`; if (!seen.has(k) && open(m, nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
        const near = ({ x, y }) => [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([a, b]) => seen.has(`${a},${b}`));
        for (const c of m.spawns.chests) ok(near(c), `${m.id}: chest at ${c.x},${c.y} reachable`);
        for (const s of m.spawns.signs) ok(near(s), `${m.id}: book at ${s.x},${s.y} reachable`);
        for (const d of m.spawns.doors ?? []) {
            ok(near(d), `${m.id}: door at ${d.x},${d.y} reachable`);
            ok(getMap(d.interior).id === d.interior, `${m.id}: door leads to ${d.interior}`);
        }
    }
    const T = getMap('thaloria');
    const doors = T.spawns.doors ?? [];
    eq(doors.map(d => d.interior).sort(), ['thaloria_bell_tower', 'thaloria_house_teal', 'thaloria_inn'], 'Thaloria has three doors');
    for (const d of doors) {
        ok(getMap(d.interior).interior, `${d.interior} is an interior`);
        const back = I.doorReturnPoint(d);
        ok(open(T, Math.floor(back.x / 32), Math.floor(back.y / 32)) || [2, 3].includes(T.tiles[Math.floor(back.y / 32)][Math.floor(back.x / 32)]),
            `${d.interior}: you come back out onto open ground`);
    }
    ok(doors.find(d => d.interior === 'thaloria_house_teal').locked?.flag, 'the teal house is locked');
    ok(getMap('thaloria_inn').spawns.doors.some(d => d.interior === 'thaloria_inn_cellar'), 'the inn has a way down to its cellar');
}
```

Run: `node tools/test_interiors.mjs`
Expected: FAIL at `Thaloria has three doors` (`[]`).

- [ ] **Step 2: Wire the doors into Thaloria's generator**

In `tools/maps/gen_thaloria.py`, near the top with the other imports, add:

```python
import json as _json
DOORS_JSON = AMO / 'src/data/maps/interiors/doors.json'
CITY_DOORS = _json.loads(DOORS_JSON.read_text()).get('thaloria', []) if DOORS_JSON.exists() else []
```

(If `AMO` is not imported in that file, import it from `sheetmap` as the other generators do.)

In the template string that writes `spawns: {{ ... }}`, add a `doors` entry next to `signs`. The file builds the JS with an f-string, so write the JSON in:

```python
        doors: {_json.dumps(CITY_DOORS)},
```

Run: `python3 tools/maps/gen_thaloria.py && node tools/test_interiors.mjs && node tools/test_chapter3.mjs`
Expected: both pass, and Chapter 3's Thaloria checks still hold.

- [ ] **Step 3: Full suite and commit**

Run: `npm test 2>&1 | tail -3`
Expected: green.

```bash
git add tools/maps/gen_thaloria.py src/data/maps/thaloria.js tools/test_interiors.mjs
git commit -m "feat(amo): Thaloria's inn, bell tower and a locked house open onto their interiors"
```

---

### Task 5: Headless checks in the running game, manual, push

**Files:**
- Modify: `tools/gen_game_inventory.mjs` (systems table: a Doors & interiors row; the Saving row)
- Regenerate: `docs/manual/index.html`

- [ ] **Step 1: Enter the inn, go down to the cellar, save, reload, come back out twice**

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');const p=gs.player;p.setPosition(5*32+16,17*32+16);p.facing='up';})();;(()=>{__game.scene.getScene('GameScene')._checkInteractions();})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');return JSON.stringify({map:gs._mapId,stack:gs.player.stats.interiorReturn});})()"
```

Expected: `map: "thaloria_inn"`, with a stack of one entry `{ mapId: "thaloria", x: 176, y: 560 }`.

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 14000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.setPosition(176,560);gs.player.facing='up';})();;(()=>{__game.scene.getScene('GameScene')._checkInteractions();})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');const d=gs._mapDef.spawns.doors[0];const b=gs.player.stats;gs.player.setPosition(d.x*32+16,(d.y+1)*32+16);gs.player.facing='up';})();;(()=>{__game.scene.getScene('GameScene')._checkInteractions();})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');window.__r={cellar:gs._mapId,depth:gs.player.stats.interiorReturn.length};const exit=gs._mapDef.portals[0];gs._enterPortal(exit);})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');window.__r.back1=gs._mapId;gs._enterPortal(gs._mapDef.portals[0]);})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');const p=gs.player;return JSON.stringify({...window.__r,back2:gs._mapId,tile:[Math.floor(p.x/32),Math.floor(p.y/32)],stack:p.stats.interiorReturn.length});})()"
```

Expected:
- `cellar: "thaloria_inn_cellar"` with `depth: 2`;
- `back1: "thaloria_inn"`;
- `back2: "thaloria"`;
- `tile: [5, 17]`;
- `stack: 0`.

Save/reload inside the cellar: enter the inn and the cellar as above, then run `SaveManager.save` through the ESC path, and reload the page with the save's Continue. If driving the menu headless is impractical, rely on Task 1's save test, which is the same data path, and note that in the ledger. Before ruling it out, check the existing headless helpers in the ledger history and `tools/console.mjs` for a load entry point.

- [ ] **Step 2: A lock, a book, a stash, an empty stack, an NPC next to a door**

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs.player.setPosition(21*32+16,17*32+16);gs.player.facing='up';gs._checkInteractions();return JSON.stringify({stillOutside:gs._mapId==='thaloria'});})();;(()=>{const gs=__game.scene.getScene('GameScene');gs.player.stats.flags.thaloria_house_teal_open=true;gs._checkInteractions();})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');return JSON.stringify({map:gs._mapId,books:gs.signs.getChildren().filter(s=>s.alpha===0).length,hiddenChests:gs.chests.getChildren().filter(c=>c.alpha===0).length});})()"
```

Expected:
- the first step returns `stillOutside: true` (locked);
- the last step shows `map: "thaloria_house_teal"`. `books` and `hiddenChests` match the generator's printout for that house (they may be 0).

Empty stack, via a direct test map:

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria_bell_tower" 9000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');gs._enterPortal(gs._mapDef.portals[0]);})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');const p=gs.player;return JSON.stringify({map:gs._mapId,tile:[Math.floor(p.x/32),Math.floor(p.y/32)]});})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w3-bell-exit.png
```

Expected: `map: "thaloria"`, with `tile: [11, 7]` (in front of the bell tower door).

The Trader still talks. The Trader stands near the inn: find them with `gs.npcs.getChildren().find(n => n.npcDef.id === 'thaloria_trader')`, stand one tile south facing up, call `_checkInteractions()`, and check that `DialogueScene` is active (`__game.scene.isActive('DialogueScene')`).

Screenshot inside the inn, to eyeball the art in the game:

```bash
node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=thaloria_inn" 8000 --eval "0" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/w3-inn.png
```

Open it with Read. Check:
- the floor is drawn under the player, not over;
- the wall face is at the top;
- no trees appear inside;
- the room is lit by its tint, not dark.

- [ ] **Step 3: Manual**

In `tools/gen_game_inventory.mjs`'s systems table, add:

```js
    ['Doors & interiors', 'Buildings with a door can be entered (E). Leaving puts you back in front of the door you came through, even from a room inside a room (the inn\'s cellar). Some doors are locked until you carry a key or have earned the way in. Shelves and desks may hold a book to read (E); some homes hide a stash.'],
```

and in the `Saving` row's text, add `, the doors you came in by` after `the game clock`.

Run: `node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html`
Expected: written. `grep -c "Doors &amp; interiors" ../../docs/manual/index.html` returns ≥ 1.

- [ ] **Step 4: Full suite, commit, push**

Run: `npm test 2>&1 | tail -3`
Expected: green.

```bash
git add tools/gen_game_inventory.mjs ../../docs/manual/index.html
git commit -m "docs(amo): manual — doors and interiors"
git push
```

In the final report, list the new game-only room ids (`thaloria_inn`, `thaloria_inn_cellar`, `thaloria_bell_tower`, `thaloria_house_teal`) for the user's DB sync, and attach the four preview PNG paths.
