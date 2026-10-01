# Mechanics Expansion — Phase 1: Foundations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game a loop you can keep playing: saves land in the right slot, Continue resumes where you were, death respawns you at your last campfire or rift-gate, the world remembers harvested nodes and dead bosses, enemies scale by region and come back, and area spells have separate cast distance and area size.

**Architecture:** New pure modules hold the rules (`src/systems/respawn.js`, `src/systems/WorldState.js`, `src/data/levelBands.js`); `PlayerStats` and `SaveManager` carry the new state; `GameScene`, `GameOverScene` and `CharacterSelectScene` wire it in. All rules are tested in one node test file, `tools/test_foundations.mjs`.

**Tech Stack:** Phaser 3.90, plain ES modules, node test scripts (no framework), Vite build.

**Spec:** `docs/superpowers/specs/2026-09-30-mechanics-expansion-design.md` — Phase 1 (F0, A1, A2, A3, B5).

## Global Constraints

- Work in `apps/amo`; commit directly on `main` (the user works on main). End every commit message with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb`
- No new npm dependencies.
- Pure rules go in Phaser-free modules; `tools/test_foundations.mjs` must run under plain `node`.
- Old saves must keep loading: every new save field defaults when missing.
- Do not change the TEMP default map in `GameScene.init` (`'big_forest'`) — the user owns that revert.
- After each task: `npm test` and `npx vite build` pass. After Task 7: regenerate the manual (`node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html`) and commit `docs/manual/index.html` + `docs/game_inventory.md`.
- English everywhere.

## Review Focus

1. **A save from before this change** (no `location`, `respawnPoint`, `worldState`) → Continue starts on the default map as today, death falls back to the death map's start; nothing throws. (Task 2 test: legacy save load.)
2. **A saved location on a map id that no longer exists** → Continue falls back to the default map instead of crashing `GameScene`. (Task 2 test: `continueTarget` with `mapExists` false.)
3. **The system clock jumps forward or back between sessions** → a harvested node is never locked longer than its own regrow time, and never negative. (Task 4 test: clamp.)
4. **Dying with 0 glint, or with less than 10** → penalty is 0, no negative glint, HP at least 1. (Task 2 test.)
5. **The player stands on a creature's spawn point when its respawn timer fires** → it waits (retries) instead of spawning on top of the player. (Task 6 test: `canRespawnAt`.)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/systems/SaveManager.js` (modify) | remembers the active slot; saves/loads `location`, `respawnPoint`, `worldState` |
| `src/systems/respawn.js` (create) | pure: continue/respawn targets, respawn point, death penalty, respawn distance rule |
| `src/systems/WorldState.js` (create) | pure: per-map harvested-node timers and defeated bosses |
| `src/data/levelBands.js` (create) | pure: map level band, enemy level roll, stat scaling |
| `src/systems/PlayerStats.js` (modify) | new fields + reset |
| `src/scenes/GameScene.js` (modify) | slot, location tracking, respawn points, world state, enemy levels and respawn, area radius |
| `src/scenes/GameOverScene.js` (modify) | "Rise at …" with the death penalty |
| `src/scenes/CharacterSelectScene.js` (modify) | Continue resumes the saved location |
| `src/entities/Enemy.js` (modify) | `level`; spell bolts scale with level |
| `src/data/spells.js` (modify) | `radius` on every area spell; `range` becomes cast distance |
| `tools/gen_game_inventory.mjs` (modify) | manual shows range + area |
| `tools/test_foundations.mjs` (create) | all Phase 1 tests |
| `package.json` (modify) | register the test |

---

### Task 1: Save slot memory (F0)

**Files:**
- Modify: `src/systems/SaveManager.js` (top of file, `save`, `load`)
- Modify: `src/scenes/GameScene.js` (`init`)
- Create: `tools/test_foundations.mjs`
- Modify: `package.json` (`test` script)

**Interfaces:**
- Produces: `SaveManager.setSlot(storyId, characterId)`, `SaveManager.slot() → { storyId, characterId }`; `SaveManager.save(stats, storyId?, characterId?)` defaults both ids to the active slot; `SaveManager.load(stats, storyId, characterId)` sets the active slot.

- [ ] **Step 1: Write the failing test** — create `tools/test_foundations.mjs`:

```js
// Phase 1 foundations: save slots, location/respawn, world state, level
// bands, enemy respawn rule, area spell radius. Run: node tools/test_foundations.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- F0: saves without ids go to the active slot
{
    store.clear();
    SaveManager.setSlot('story1', 'eldrin');
    eq(SaveManager.slot(), { storyId: 'story1', characterId: 'eldrin' }, 'slot remembered');
    const s = new PlayerStats();
    s.glint = 77;
    ok(SaveManager.save(s), 'save without ids succeeds');
    ok(store.has('amo_save_story1_eldrin'), 'it lands in the active slot');
    ok(!store.has('amo_save_undefined_undefined'), 'not in the undefined slot');
    const t = new PlayerStats();
    ok(SaveManager.load(t, 'story1', 'eldrin'), 'loads back');
    eq(t.glint, 77, 'same data');
    SaveManager.setSlot(null, null);
    SaveManager.load(new PlayerStats(), 'story1', 'eldrin');
    eq(SaveManager.slot(), { storyId: 'story1', characterId: 'eldrin' }, 'load sets the active slot');
}

console.log(`✓ foundations tests passed (${n} assertions).`);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd apps/amo && node tools/test_foundations.mjs`
Expected: FAIL — `TypeError: SaveManager.setSlot is not a function`

- [ ] **Step 3: Implement** — in `src/systems/SaveManager.js`, replace

```js
export class SaveManager {
    static save(stats, storyId, characterId) {
```

with

```js
// The slot the current game saves to. GameScene.init and load() set it, so a
// save() that omits the ids (Crafting, Campfire, rift-gates…) still lands in
// the right place instead of "amo_save_undefined_undefined".
let _slot = { storyId: null, characterId: null };

export class SaveManager {
    static setSlot(storyId, characterId) {
        _slot = { storyId: storyId ?? null, characterId: characterId ?? null };
    }

    static slot() { return { ..._slot }; }

    static save(stats, storyId = _slot.storyId, characterId = _slot.characterId) {
```

and at the top of `static load(stats, storyId, characterId) {` add as its first line:

```js
        SaveManager.setSlot(storyId, characterId);
```

In `src/scenes/GameScene.js` `init(data)`, after `this._storyId = data?.storyId ?? null;` add:

```js
        SaveManager.setSlot(this._storyId, this._characterId);
```

In `package.json`, in the `test` script, insert `node tools/test_foundations.mjs && ` right after `node tools/test_statuses.mjs && `.

- [ ] **Step 4: Run tests and build**

Run: `cd apps/amo && node tools/test_foundations.mjs && npm test && npx vite build`
Expected: `✓ foundations tests passed (…)`, all suites pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/amo/src/systems/SaveManager.js apps/amo/src/scenes/GameScene.js apps/amo/tools/test_foundations.mjs apps/amo/package.json
git commit -m "fix(amo): saves without ids go to the active slot, not amo_save_undefined_undefined"
```

---

### Task 2: Location, respawn point and death penalty — data and rules (A1)

**Files:**
- Create: `src/systems/respawn.js`
- Modify: `src/systems/PlayerStats.js` (constructor next to `this.weaponEnchants = {};`, `reset()`)
- Modify: `src/systems/SaveManager.js` (`save` data object, `load`)
- Test: `tools/test_foundations.mjs`

**Interfaces:**
- Consumes: `SaveManager.setSlot` (Task 1).
- Produces (all in `src/systems/respawn.js`):
  - `continueTarget(stats, mapExists = () => true) → { mapId: string|undefined, spawnX: number|undefined, spawnY: number|undefined }`
  - `respawnTarget(stats, deathMapId, mapExists = () => true) → { mapId, spawnX, spawnY, label: string|null }`
  - `setRespawnPoint(stats, mapId, x, y, label)`
  - `applyDeathPenalty(stats) → { glintLost: number }`
  - `RESPAWN_MIN_DIST = 320`, `canRespawnAt(spawn {x,y}, player {x,y}, minDist = RESPAWN_MIN_DIST) → boolean`
- `stats.location: {mapId, x, y} | null`, `stats.respawnPoint: {mapId, x, y, label} | null`

- [ ] **Step 1: Write the failing tests** — in `tools/test_foundations.mjs`, add after the `SaveManager` import:

```js
const R = await import('../src/systems/respawn.js');
```

and insert before the final `console.log` line:

```js
// ---- A1: continue / respawn targets and the death penalty
{
    const s = new PlayerStats();
    eq(s.location, null, 'no location on a new character');
    eq(s.respawnPoint, null, 'no respawn point on a new character');
    eq(R.continueTarget(s), { mapId: undefined, spawnX: undefined, spawnY: undefined }, 'no location → default map');
    s.location = { mapId: 'summit_of_despair', x: 100, y: 200 };
    eq(R.continueTarget(s), { mapId: 'summit_of_despair', spawnX: 100, spawnY: 200 }, 'continue resumes the location');
    eq(R.continueTarget(s, () => false), { mapId: undefined, spawnX: undefined, spawnY: undefined }, 'a vanished map falls back');

    eq(R.respawnTarget(s, 'summit_of_despair'), { mapId: 'summit_of_despair', spawnX: undefined, spawnY: undefined, label: null }, 'no respawn point → death map start');
    R.setRespawnPoint(s, 'prologue_forest', 640.4, 288.6, 'the campfire');
    eq(s.respawnPoint, { mapId: 'prologue_forest', x: 640, y: 289, label: 'the campfire' }, 'respawn point rounded');
    eq(R.respawnTarget(s, 'summit_of_despair'), { mapId: 'prologue_forest', spawnX: 640, spawnY: 289, label: 'the campfire' }, 'respawn at the point');
    eq(R.respawnTarget(s, 'summit_of_despair', id => id !== 'prologue_forest').mapId, 'summit_of_despair', 'vanished respawn map → death map');

    s.glint = 95; s.health = 0; s.mana = 3;
    eq(R.applyDeathPenalty(s), { glintLost: 9 }, 'lose 10% of glint, rounded down');
    eq(s.glint, 86, 'glint reduced');
    eq(s.health, Math.ceil(s.maxHealth * 0.5), 'back at half HP');
    eq(s.mana, s.maxMana, 'full MP');
    s.glint = 0;
    eq(R.applyDeathPenalty(s).glintLost, 0, 'no glint, no loss');
    ok(s.glint === 0 && s.health >= 1, 'never negative, at least 1 HP');

    ok(R.canRespawnAt({ x: 0, y: 0 }, { x: 400, y: 0 }), 'far player → respawn');
    ok(!R.canRespawnAt({ x: 0, y: 0 }, { x: 100, y: 50 }), 'player nearby → wait');
}

// ---- A1: location and respawn point survive a save; legacy saves load
{
    store.clear();
    SaveManager.setSlot('s', 'eldrin');
    const s = new PlayerStats();
    s.location = { mapId: 'prologue_forest', x: 10, y: 20 };
    R.setRespawnPoint(s, 'prologue_forest', 30, 40, 'Rift-Gate');
    SaveManager.save(s);
    const t = new PlayerStats();
    SaveManager.load(t, 's', 'eldrin');
    eq(t.location, { mapId: 'prologue_forest', x: 10, y: 20 }, 'location saved');
    eq(t.respawnPoint, { mapId: 'prologue_forest', x: 30, y: 40, label: 'Rift-Gate' }, 'respawn point saved');
    const legacy = JSON.parse(store.get('amo_save_s_eldrin'));
    delete legacy.location; delete legacy.respawnPoint;
    store.set('amo_save_s_eldrin', JSON.stringify(legacy));
    const u = new PlayerStats();
    ok(SaveManager.load(u, 's', 'eldrin'), 'a legacy save loads');
    eq([u.location, u.respawnPoint], [null, null], 'missing fields default to null');
    u.location = { mapId: 'x', x: 1, y: 1 };
    u.reset();
    eq([u.location, u.respawnPoint], [null, null], 'a new game clears them');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_foundations.mjs`
Expected: FAIL — `Cannot find module '.../src/systems/respawn.js'`

- [ ] **Step 3: Implement** — create `src/systems/respawn.js`:

```js
// Where the player comes back: on Continue (the saved location) and after
// death (the last campfire or rift-gate). Pure — no Phaser — so it is tested
// in tools/test_foundations.mjs.

const NONE = { mapId: undefined, spawnX: undefined, spawnY: undefined };

// Continue: the saved location, or undefined fields so GameScene uses its default map.
export function continueTarget(stats, mapExists = () => true) {
    const loc = stats.location;
    if (loc?.mapId && mapExists(loc.mapId)) return { mapId: loc.mapId, spawnX: loc.x, spawnY: loc.y };
    return { ...NONE };
}

// After death: the respawn point, else the start of the map you died on.
export function respawnTarget(stats, deathMapId, mapExists = () => true) {
    const p = stats.respawnPoint;
    if (p?.mapId && mapExists(p.mapId)) return { mapId: p.mapId, spawnX: p.x, spawnY: p.y, label: p.label ?? null };
    return { mapId: deathMapId, spawnX: undefined, spawnY: undefined, label: null };
}

export function setRespawnPoint(stats, mapId, x, y, label = null) {
    stats.respawnPoint = { mapId, x: Math.round(x), y: Math.round(y), label };
}

// Lose 10% of glint (rounded down); come back at half HP and full MP.
export function applyDeathPenalty(stats) {
    const glint = Math.max(0, stats.glint ?? 0);
    const glintLost = Math.floor(glint * 0.10);
    stats.glint = glint - glintLost;
    stats.health = Math.max(1, Math.ceil(stats.maxHealth * 0.5));
    stats.mana = stats.maxMana;
    stats.manaExhausted = false;
    stats.manaCollapsed = false;
    stats._exhaustionTimer = 0;
    return { glintLost };
}

// A slain map creature only comes back when the player is out of the way.
export const RESPAWN_MIN_DIST = 320;
export function canRespawnAt(spawn, player, minDist = RESPAWN_MIN_DIST) {
    return Math.hypot(spawn.x - player.x, spawn.y - player.y) >= minDist;
}
```

In `src/systems/PlayerStats.js` constructor, after `this.weaponEnchants = {};` add:

```js
        // Where the player is (kept fresh by GameScene) and where they rise after
        // death (last campfire / rift-gate) — see systems/respawn.js.
        this.location     = null;
        this.respawnPoint = null;
```

In `reset()`, after `this.weaponEnchants   = {};` add:

```js
        this.location         = null;
        this.respawnPoint     = null;
```

In `src/systems/SaveManager.js` `save`, after `weaponEnchants:    { ...(stats.weaponEnchants ?? {}) },` add:

```js
            location:          stats.location ? { ...stats.location } : null,
            respawnPoint:      stats.respawnPoint ? { ...stats.respawnPoint } : null,
```

and in `load`, after `stats.weaponEnchants = { ...(d.weaponEnchants ?? {}) };` add:

```js
            stats.location     = d.location ? { ...d.location } : null;
            stats.respawnPoint = d.respawnPoint ? { ...d.respawnPoint } : null;
```

- [ ] **Step 4: Run tests**

Run: `cd apps/amo && node tools/test_foundations.mjs && npm test`
Expected: foundations pass, all suites pass.

- [ ] **Step 5: Commit**

```bash
git add apps/amo/src/systems/respawn.js apps/amo/src/systems/PlayerStats.js apps/amo/src/systems/SaveManager.js apps/amo/tools/test_foundations.mjs
git commit -m "feat(amo): location, respawn point and death penalty rules (saved)"
```

---

### Task 3: Wire Continue, respawn points and death (A1)

**Files:**
- Modify: `src/scenes/GameScene.js` (`init`, `create` notice, `update`, `_enterPortal`, campfire overlap, `_interactRiftGate`, `_fastTravelTo`, `_onPlayerDied`)
- Modify: `src/scenes/GameOverScene.js`
- Modify: `src/scenes/CharacterSelectScene.js` (`_launch`)

**Interfaces:**
- Consumes: `continueTarget`, `respawnTarget`, `setRespawnPoint`, `applyDeathPenalty` from `src/systems/respawn.js` (Task 2); `SaveManager.save(stats)` with the remembered slot (Task 1).
- Produces: `GameScene.init(data)` accepts `data.respawnNotice: string|null`; `GameOverScene.init(data)` accepts `data.mapId`.

- [ ] **Step 1: GameScene** — add to the imports:

```js
import { setRespawnPoint } from '../systems/respawn.js';
```

In `init(data)`, after `this._transitioning   = false;` add:

```js
        this._respawnNotice   = data?.respawnNotice   ?? null;
```

At the end of `create()` (last statement of the method) add:

```js
        if (this._respawnNotice) {
            this.time.delayedCall(700, () => this.scene.get('UIScene')?.showNotification?.(this._respawnNotice, 3000));
        }
```

At the top of `update(time, delta)`, after `if (!this.player?.active) return;` add:

```js
        // Remember where the player is (saved with the character; Continue resumes here)
        this._locTimer = (this._locTimer ?? 0) - delta;
        if (this._locTimer <= 0 && !this._serverUrl) {
            this._locTimer = 500;
            playerStats.location = { mapId: this._mapId, x: Math.round(this.player.x), y: Math.round(this.player.y) };
        }
```

In `_enterPortal(portalDef)`, replace

```js
        this._transitioning = true;
        SaveManager.save(playerStats, this._storyId, this._characterId);
```

with

```js
        this._transitioning = true;
        // Save as if already through the door, so Continue doesn't put us back on this side
        playerStats.location = { mapId: portalDef.targetMap, x: portalDef.targetX, y: portalDef.targetY };
        SaveManager.save(playerStats, this._storyId, this._characterId);
```

Replace the campfire overlap

```js
        this.physics.overlap(this.player.interactBox, this.campfires, () => {
            playerStats.gainResonance('fire', RESONANCE_GAINS.rest_campfire.fire);
```

with

```js
        this.physics.overlap(this.player.interactBox, this.campfires, (_box, cf) => {
            setRespawnPoint(playerStats, this._mapId, cf.x, cf.y + TILE_SIZE, 'the campfire');
            SaveManager.save(playerStats, this._storyId, this._characterId);
            playerStats.gainResonance('fire', RESONANCE_GAINS.rest_campfire.fire);
```

In `_interactRiftGate(gate)`, after `const ps = this.player.stats;` add:

```js
        setRespawnPoint(ps, this._mapId, gate.wx, gate.wy + TILE_SIZE, gate.label);
```

In `_fastTravelTo(gateId)`, replace `SaveManager.save(this.player.stats);` with:

```js
        setRespawnPoint(this.player.stats, this._mapId, gate.wx, gate.wy + TILE_SIZE, gate.label);
        SaveManager.save(this.player.stats);
```

In `_onPlayerDied()`, in the `GameOverScene` start data, after `characterId:     this._characterId,` add:

```js
                mapId:           this._mapId,
```

- [ ] **Step 2: GameOverScene** — add imports:

```js
import { SaveManager } from '../systems/SaveManager.js';
import { getMap } from '../data/maps/index.js';
import { respawnTarget, applyDeathPenalty } from '../systems/respawn.js';
```

In `init(data)` add:

```js
        this._mapId           = data?.mapId           ?? null;
```

Replace the subtitle text line `'The shadow has claimed your soul...'` block with:

```js
        const lost = Math.floor(Math.max(0, playerStats.glint ?? 0) * 0.10);
        this.add.text(w / 2, h / 2 - 28, lost > 0
            ? `The shadow has claimed your soul... rising will cost ${lost} glint.`
            : 'The shadow has claimed your soul...', {
            font: '10px monospace', fill: '#666666', fontStyle: 'italic'
        }).setOrigin(0.5).setAlpha(0);
```

Replace the first button entry `{ label: 'Try Again',      action: () => this._tryAgain() },` with:

```js
            { label: `Rise at ${respawnTarget(playerStats, this._mapId, id => !!getMap(id)).label ?? 'the last safe place'}`, action: () => this._tryAgain() },
```

Replace the whole `_tryAgain()` method with:

```js
    // Rise at the last campfire / rift-gate (or the start of this map), paying the death penalty
    _tryAgain() {
        soundManager.menuSelect();
        const { glintLost } = applyDeathPenalty(playerStats);
        const t = respawnTarget(playerStats, this._mapId, id => !!getMap(id));
        if (!this._serverUrl) SaveManager.save(playerStats, this._storyId, this._characterId);
        this.scene.stop('UIScene');
        this.scene.stop();
        this.scene.start('GameScene', {
            characterId:     this._characterId,
            storyId:         this._storyId,
            serverUrl:       this._serverUrl,
            onlineCharacter: this._onlineCharacter,
            mapId:           t.mapId ?? undefined,
            spawnX:          t.spawnX,
            spawnY:          t.spawnY,
            respawnNotice:   glintLost > 0 ? `You rise again. ${glintLost} glint lost.` : 'You rise again.',
        });
    }
```

- [ ] **Step 3: CharacterSelectScene** — add imports:

```js
import { continueTarget } from '../systems/respawn.js';
import { getMap } from '../data/maps/index.js';
```

In `_launch(isContinue)`, replace

```js
            this.scene.start('GameScene', {
                characterId: c.id,
                storyId:     this._storyId,
                mapId:       isContinue ? undefined : this._mapId,
            });
```

with

```js
            const resume = isContinue ? continueTarget(playerStats, id => !!getMap(id)) : null;
            this.scene.start('GameScene', {
                characterId: c.id,
                storyId:     this._storyId,
                mapId:       isContinue ? resume.mapId : this._mapId,
                spawnX:      resume?.spawnX,
                spawnY:      resume?.spawnY,
            });
```

(If `getMap` is already imported in this file, don't import it twice.)

- [ ] **Step 4: Verify**

Run: `cd apps/amo && npm test && npx vite build`
Expected: all pass, build succeeds.

Manual check (dev server on :5174, `?testmap=summit_of_despair`): walk into the campfire's interact range, then let the Frost Shades kill you → the Game Over button reads "Rise at the campfire"; clicking it reloads beside the campfire at half HP with "You rise again." Then return to menu → Continue → you start where you stood, not on the default map. Check the console for errors.

- [ ] **Step 5: Commit**

```bash
git add apps/amo/src/scenes/GameScene.js apps/amo/src/scenes/GameOverScene.js apps/amo/src/scenes/CharacterSelectScene.js
git commit -m "feat(amo): rise at the last campfire or rift-gate after death; Continue resumes your location"
```

---

### Task 4: World state — harvested nodes and defeated bosses persist (A3)

**Files:**
- Create: `src/systems/WorldState.js`
- Modify: `src/systems/PlayerStats.js` (constructor, `reset()`)
- Modify: `src/systems/SaveManager.js` (`save`, `load`)
- Modify: `src/scenes/GameScene.js` (node spawn, harvest, boss spawn/death)
- Test: `tools/test_foundations.mjs`

**Interfaces:**
- Produces (`src/systems/WorldState.js`):
  - `nodeKey(def) → 'x,y'`
  - `markNodeHarvested(stats, mapId, key, now, regrowMs)`
  - `nodeRegrowRemaining(stats, mapId, key, now, maxMs) → number` (0 … maxMs)
  - `markBossDefeated(stats, mapId)`, `isBossDefeated(stats, mapId) → boolean`
  - `prunedWorldState(stats, now) → object` (copy without expired node entries)
- `stats.worldState: { [mapId]: { nodes: { [key]: readyAt }, bossDefeated?: true } }`

- [ ] **Step 1: Write the failing tests** — add after the other imports in `tools/test_foundations.mjs`:

```js
const WS = await import('../src/systems/WorldState.js');
```

and insert before the final `console.log`:

```js
// ---- A3: world state
{
    const s = new PlayerStats();
    eq(s.worldState, {}, 'empty world state on a new character');
    const key = WS.nodeKey({ x: 8, y: 6, type: 'herb' });
    eq(key, '8,6', 'node key from its tile');
    WS.markNodeHarvested(s, 'prologue_forest', key, 1000, 150000);
    eq(WS.nodeRegrowRemaining(s, 'prologue_forest', key, 1000, 150000), 150000, 'full regrow right after harvest');
    eq(WS.nodeRegrowRemaining(s, 'prologue_forest', key, 101000, 150000), 50000, 'counts down in real time');
    eq(WS.nodeRegrowRemaining(s, 'prologue_forest', key, 999999, 150000), 0, 'ready again');
    eq(WS.nodeRegrowRemaining(s, 'prologue_forest', key, -5e9, 150000), 150000, 'a clock jump back never locks it longer than its regrow');
    eq(WS.nodeRegrowRemaining(s, 'other_map', key, 1000, 150000), 0, 'other maps unaffected');
    ok(!WS.isBossDefeated(s, 'prologue_forest'), 'boss alive');
    WS.markBossDefeated(s, 'prologue_forest');
    ok(WS.isBossDefeated(s, 'prologue_forest'), 'boss defeated');
    const pruned = WS.prunedWorldState(s, 999999);
    eq(pruned.prologue_forest.nodes, {}, 'expired node timers pruned');
    ok(pruned.prologue_forest.bossDefeated, 'boss flag kept');

    store.clear();
    SaveManager.setSlot('w', 'eldrin');
    WS.markNodeHarvested(s, 'prologue_forest', '1,1', Date.now(), 600000);
    SaveManager.save(s);
    const t = new PlayerStats();
    SaveManager.load(t, 'w', 'eldrin');
    ok(WS.isBossDefeated(t, 'prologue_forest'), 'boss flag saved');
    ok(WS.nodeRegrowRemaining(t, 'prologue_forest', '1,1', Date.now(), 600000) > 0, 'pending node saved');
    t.reset();
    eq(t.worldState, {}, 'a new game forgets the world');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_foundations.mjs`
Expected: FAIL — `Cannot find module '.../src/systems/WorldState.js'`

- [ ] **Step 3: Implement** — create `src/systems/WorldState.js`:

```js
// Per-map world memory, saved with the character:
//   stats.worldState = { [mapId]: { nodes: { 'x,y': readyAt }, bossDefeated: true } }
// readyAt is real time (ms since epoch) so a node keeps regrowing between sessions.
// Pure — tested in tools/test_foundations.mjs.

export function nodeKey(def) {
    return `${def.x},${def.y}`;
}

function mapState(stats, mapId) {
    stats.worldState ??= {};
    return (stats.worldState[mapId] ??= { nodes: {} });
}

export function markNodeHarvested(stats, mapId, key, now, regrowMs) {
    mapState(stats, mapId).nodes[key] = now + regrowMs;
}

// Time until the node is back, clamped to [0, maxMs] so a changed clock can't lock it.
export function nodeRegrowRemaining(stats, mapId, key, now, maxMs) {
    const readyAt = stats.worldState?.[mapId]?.nodes?.[key];
    if (!readyAt) return 0;
    return Math.min(maxMs, Math.max(0, readyAt - now));
}

export function markBossDefeated(stats, mapId) {
    mapState(stats, mapId).bossDefeated = true;
}

export function isBossDefeated(stats, mapId) {
    return !!stats.worldState?.[mapId]?.bossDefeated;
}

// A copy for saving, without node timers that have already run out.
export function prunedWorldState(stats, now) {
    const out = {};
    for (const [mapId, st] of Object.entries(stats.worldState ?? {})) {
        const nodes = Object.fromEntries(Object.entries(st.nodes ?? {}).filter(([, t]) => t > now));
        out[mapId] = { ...st, nodes };
    }
    return out;
}
```

`src/systems/PlayerStats.js` — constructor, after the `this.respawnPoint = null;` line from Task 2:

```js
        // Harvested-node timers and defeated bosses, per map (systems/WorldState.js)
        this.worldState   = {};
```

and in `reset()` after `this.respawnPoint     = null;`:

```js
        this.worldState       = {};
```

`src/systems/SaveManager.js` — add the import at the top:

```js
import { prunedWorldState } from './WorldState.js';
```

in `save` after the `respawnPoint:` line:

```js
            worldState:        prunedWorldState(stats, Date.now()),
```

in `load` after the `stats.respawnPoint = …` line:

```js
            stats.worldState   = d.worldState ? JSON.parse(JSON.stringify(d.worldState)) : {};
```

- [ ] **Step 4: Wire GameScene** — add to the imports:

```js
import { nodeKey, markNodeHarvested, nodeRegrowRemaining, markBossDefeated, isBossDefeated } from '../systems/WorldState.js';
```

In the gathering-node spawn loop, after the `spr.ePrompt  = this.add.text(…).setAlpha(0);` statement and before the loop's closing `});`, add:

```js
            // Still regrowing from an earlier visit?
            const left = nodeRegrowRemaining(playerStats, this._mapId, nodeKey(def), Date.now(), def.regrowMs ?? type.regrowMs);
            if (left > 0) { spr.setAlpha(0); this._setNodeGathered(spr, left); }
```

In the harvest overlap, replace

```js
            node.gathered = true;
            node.ePrompt?.setAlpha(0);
            soundManager.collect();
```

with

```js
            const regrowMs = def.regrowMs ?? type.regrowMs;
            markNodeHarvested(playerStats, this._mapId, nodeKey(def), Date.now(), regrowMs);
            soundManager.collect();
```

and replace

```js
            this.tweens.add({ targets: node, alpha: 0, duration: 350, onComplete: () => node.disableBody(true, false) });
            // Regrow: the node comes back after a while (and on every map load)
            this.time.delayedCall(def.regrowMs ?? type.regrowMs, () => {
                if (!node.scene) return;
                node.enableBody(false, 0, 0, true, true);
                node.gathered = false;
                this.tweens.add({ targets: node, alpha: 1, duration: 600 });
            });
```

with

```js
            this.tweens.add({ targets: node, alpha: 0, duration: 350 });
            this._setNodeGathered(node, regrowMs);
            SaveManager.save(playerStats, this._storyId, this._characterId);
```

Add this method next to `_projectileMs`:

```js
    // A harvested node: no prompt, no body, back after `ms` (also across reloads — WorldState)
    _setNodeGathered(node, ms) {
        node.gathered = true;
        node.ePrompt?.setAlpha(0);
        this.time.delayedCall(350, () => { if (node.body) node.disableBody(true, false); });
        this.time.delayedCall(ms, () => {
            if (!node.scene) return;
            node.enableBody(false, 0, 0, true, true);
            node.gathered = false;
            this.tweens.add({ targets: node, alpha: 1, duration: 600 });
        });
    }
```

Boss: replace `if (mapDef.spawns.boss) {` (the boss spawn block) with:

```js
        if (mapDef.spawns.boss && !isBossDefeated(playerStats, this._mapId)) {
```

and in the boss `died` handler, replace `this._bossDefeated = true;` with:

```js
            this._bossDefeated = true;
            markBossDefeated(playerStats, this._mapId);
```

- [ ] **Step 5: Run tests and build**

Run: `cd apps/amo && npm test && npx vite build`
Expected: foundations pass, everything passes, build succeeds.

Manual check: on `?testmap=prologue_forest`, harvest a herb patch, reload the page, Continue → the patch is still gone; it comes back after its regrow time.

- [ ] **Step 6: Commit**

```bash
git add apps/amo/src/systems/WorldState.js apps/amo/src/systems/PlayerStats.js apps/amo/src/systems/SaveManager.js apps/amo/src/scenes/GameScene.js apps/amo/tools/test_foundations.mjs
git commit -m "feat(amo): world state per map — harvested nodes and defeated bosses persist"
```

---

### Task 5: Region level bands and enemy scaling (A2)

**Files:**
- Create: `src/data/levelBands.js`
- Modify: `src/scenes/GameScene.js` (`create` before enemies, `_spawnEnemy`)
- Modify: `src/entities/Enemy.js` (constructor, bolt damage)
- Test: `tools/test_foundations.mjs`

**Interfaces:**
- Produces (`src/data/levelBands.js`):
  - `mapLevelBand(mapDef) → { min, max }`
  - `rollEnemyLevel(band, rng = Math.random) → integer in [min, max]`
  - `scaleEnemyStats({ health, damage, xpReward, goldDrop }, level) → same shape, scaled`
  - `levelDamageMult(level) → number` (1 + 0.10·(level−1))
- `GameScene._spawnEnemy(type, x, y, level = null)`; `enemy.level` (1 by default).

- [ ] **Step 1: Write the failing tests** — add the import:

```js
const LB = await import('../src/data/levelBands.js');
const { getMap } = await import('../src/data/maps/index.js');
```

and insert before the final `console.log`:

```js
// ---- A2: level bands and scaling
{
    eq(LB.mapLevelBand(getMap('prologue_forest')), { min: 1, max: 3 }, 'outside the campaign → 1–3');
    eq(LB.mapLevelBand(getMap('echoes_of_stone')), { min: 1, max: 3 }, 'chapter 1 → 1–3');
    eq(LB.mapLevelBand(getMap('summit_of_despair')), { min: 7, max: 9 }, 'chapter 4 → 7–9');
    eq(LB.mapLevelBand({ id: 'x', levelBand: { min: 12, max: 14 } }), { min: 12, max: 14 }, 'a map can set its own band');
    eq(LB.mapLevelBand(null), { min: 1, max: 3 }, 'no map → 1–3');
    eq(LB.rollEnemyLevel({ min: 7, max: 9 }, () => 0), 7, 'roll low');
    eq(LB.rollEnemyLevel({ min: 7, max: 9 }, () => 0.9999), 9, 'roll high');
    const base = { health: 100, damage: 10, xpReward: 50, goldDrop: 10 };
    eq(LB.scaleEnemyStats(base, 1), base, 'level 1 is the base creature');
    eq(LB.scaleEnemyStats(base, 5), { health: 160, damage: 14, xpReward: 74, goldDrop: 14 }, 'level 5 scaling');
    ok(Math.abs(LB.levelDamageMult(5) - 1.4) < 1e-9, 'spell damage scales like melee');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_foundations.mjs`
Expected: FAIL — `Cannot find module '.../src/data/levelBands.js'`

- [ ] **Step 3: Implement** — create `src/data/levelBands.js`:

```js
// Region level bands: how strong a map's creatures are. A map can set
// `levelBand: { min, max }`; otherwise the campaign chapter that first claims
// the map decides (chapter i → levels 1+2i … 3+2i); other maps are 1–3.
// Pure — tested in tools/test_foundations.mjs.
import { ELDORIAS_PROPHECY } from './campaigns/eldorias_prophecy.js';

export function mapLevelBand(mapDef) {
    if (mapDef?.levelBand) return { min: mapDef.levelBand.min, max: mapDef.levelBand.max };
    const i = ELDORIAS_PROPHECY.chapters.findIndex(c => c.maps.includes(mapDef?.id));
    if (i < 0) return { min: 1, max: 3 };
    return { min: 1 + 2 * i, max: 3 + 2 * i };
}

export function rollEnemyLevel(band, rng = Math.random) {
    return band.min + Math.floor(rng() * (band.max - band.min + 1));
}

export function levelDamageMult(level) {
    return 1 + 0.10 * (Math.max(1, level) - 1);
}

// HP +15%, damage +10%, XP +12%, gold +10% per level above 1.
export function scaleEnemyStats(base, level) {
    const l = Math.max(1, level) - 1;
    return {
        health:   Math.round(base.health   * (1 + 0.15 * l)),
        damage:   Math.round(base.damage   * (1 + 0.10 * l)),
        xpReward: Math.round(base.xpReward * (1 + 0.12 * l)),
        goldDrop: Math.round(base.goldDrop * (1 + 0.10 * l)),
    };
}
```

`src/entities/Enemy.js` — import:

```js
import { levelDamageMult } from '../data/levelBands.js';
```

in the constructor, after `this.aoeOnDeath   = typeDef.aoeOnDeath   ?? null;` add:

```js
        this.level        = 1;   // set by GameScene from the map's level band
```

and in `_completeCast`, replace

```js
            if (sp.kind === 'bolt') player.takeDamage(Math.round(sp.dmg * statusManager.statsMult(this)));
```

with

```js
            if (sp.kind === 'bolt') player.takeDamage(Math.round(sp.dmg * levelDamageMult(this.level) * statusManager.statsMult(this)));
```

`src/scenes/GameScene.js` — import:

```js
import { mapLevelBand, rollEnemyLevel, scaleEnemyStats } from '../data/levelBands.js';
```

before the `// Enemies` block in `create()` add:

```js
        this._levelBand = mapLevelBand(mapDef);
```

and replace the start of `_spawnEnemy`

```js
    _spawnEnemy(type, x, y) {
        const typeDef = ENEMY_TYPES[type] ?? {};
        const enemy   = new Enemy(this, x, y, typeDef);
        enemy.enemyType = type;
        enemy.spellKit  = ENEMY_KITS[type] ?? [];
```

with

```js
    _spawnEnemy(type, x, y, level = null) {
        const typeDef = ENEMY_TYPES[type] ?? {};
        const enemy   = new Enemy(this, x, y, typeDef);
        enemy.enemyType = type;
        enemy.spellKit  = ENEMY_KITS[type] ?? [];

        // Region level (offline only — online enemies take their stats from the server)
        if (!typeDef.passive && !this._serverUrl) {
            const lvl = level ?? rollEnemyLevel(this._levelBand ?? { min: 1, max: 3 });
            const s = scaleEnemyStats({ health: enemy.maxHealth, damage: enemy.damage, xpReward: enemy.xpReward, goldDrop: enemy.goldDrop }, lvl);
            enemy.level = lvl;
            enemy.maxHealth = s.health;
            enemy.health    = s.health;
            enemy.damage    = s.damage;
            enemy.xpReward  = s.xpReward;
            enemy.goldDrop  = s.goldDrop;
        }
```

- [ ] **Step 4: Run tests and build**

Run: `cd apps/amo && npm test && npx vite build`
Expected: foundations pass, all pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/amo/src/data/levelBands.js apps/amo/src/entities/Enemy.js apps/amo/src/scenes/GameScene.js apps/amo/tools/test_foundations.mjs
git commit -m "feat(amo): region level bands — enemies scale HP, damage, XP and gold by map"
```

---

### Task 6: Enemy respawn in single-player (A2)

**Files:**
- Modify: `src/scenes/GameScene.js` (enemy spawn loop in `create`, new `_scheduleRespawn` / `_tryRespawn`)

**Interfaces:**
- Consumes: `canRespawnAt` from `src/systems/respawn.js` (Task 2, tested there); `_spawnEnemy(type, x, y)` (Task 5).
- Produces: `enemy.spawnDef = { type, x, y }` on map-spawned enemies; `mapDef.respawnMs` (optional, default 120000).

- [ ] **Step 1: Implement** — extend the import from Task 3:

```js
import { setRespawnPoint, canRespawnAt } from '../systems/respawn.js';
```

In `create()`, replace the enemy spawn loop

```js
        (mapDef.spawns.enemies ?? []).forEach((spawn, idx) => {
            const ex = spawn.x * TILE_SIZE + TILE_SIZE / 2;
            const ey = spawn.y * TILE_SIZE + TILE_SIZE / 2;
            const enemy = this._spawnEnemy(spawn.type, ex, ey);
            enemy.netId = idx;
            this._enemyById.set(idx, enemy);
        });
```

with

```js
        (mapDef.spawns.enemies ?? []).forEach((spawn, idx) => {
            const ex = spawn.x * TILE_SIZE + TILE_SIZE / 2;
            const ey = spawn.y * TILE_SIZE + TILE_SIZE / 2;
            const enemy = this._spawnEnemy(spawn.type, ex, ey);
            enemy.netId = idx;
            this._enemyById.set(idx, enemy);
            // Single-player: map creatures come back after a while (online, the server respawns them)
            if (!this._serverUrl) {
                enemy.spawnDef = { type: spawn.type, x: ex, y: ey };
                enemy.once('died', () => this._scheduleRespawn(enemy.spawnDef));
            }
        });
```

Add these methods after `_spawnEnemy`:

```js
    _scheduleRespawn(def) {
        this.time.delayedCall(this._mapDef.respawnMs ?? 120000, () => this._tryRespawn(def));
    }

    // Respawn at the spawn point once the player is out of the way (retry every 10 s)
    _tryRespawn(def) {
        if (!this.player?.active) return;
        if (!canRespawnAt(def, this.player)) {
            this.time.delayedCall(10000, () => this._tryRespawn(def));
            return;
        }
        const enemy = this._spawnEnemy(def.type, def.x, def.y);
        enemy.spawnDef = def;
        enemy.once('died', () => this._scheduleRespawn(def));
    }
```

(Walls already collide with every member of `this.enemies` through the group collider, so a respawned enemy needs no extra collider.)

- [ ] **Step 2: Verify**

Run: `cd apps/amo && npm test && npx vite build`
Expected: all pass, build succeeds.

Manual check: on `?testmap=prologue_forest` with `respawnMs` temporarily set to `10000` on `PROLOGUE_FOREST`, kill a wolf, walk 10+ tiles away, wait → it returns at its spawn; standing on the spawn point delays it. Revert the temporary `respawnMs`.

- [ ] **Step 3: Commit**

```bash
git add apps/amo/src/scenes/GameScene.js
git commit -m "feat(amo): map creatures respawn in single-player, out of the player's sight"
```

---

### Task 7: Area spells — cast distance vs area size (B5) + manual

**Files:**
- Modify: `src/data/spells.js` (every `targeted_aoe` spell)
- Modify: `src/scenes/GameScene.js` (`_applySpellEffects`)
- Modify: `tools/gen_game_inventory.mjs` (spell table)
- Test: `tools/test_foundations.mjs`
- Regenerate: `docs/manual/index.html`, `docs/game_inventory.md`

**Interfaces:**
- Produces: every `targeted_aoe` spell has `range: [3]` (cast distance) and `radius: [3]` (area), with `range[i] >= radius[i]`; `_applySpellEffects` uses `radius` for area effects. (The reticle already reads `spell.radius`.)

- [ ] **Step 1: Write the failing test** — add the import:

```js
const { SPELLS } = await import('../src/data/spells.js');
```

and insert before the final `console.log`:

```js
// ---- B5: area spells have a cast distance and an area size
{
    const aoe = Object.values(SPELLS).filter(sp => sp.targetingType === 'targeted_aoe');
    ok(aoe.length > 20, 'there are area spells');
    for (const sp of aoe) {
        ok(Array.isArray(sp.radius) && sp.radius.length === 3, `${sp.id}: radius per tier`);
        ok(Array.isArray(sp.range) && sp.range.length === 3, `${sp.id}: range per tier`);
        for (let i = 0; i < 3; i++) ok(sp.range[i] >= sp.radius[i], `${sp.id}: tier ${i + 1} cast distance ≥ area`);
    }
    eq(SPELLS.fireball.radius, [40, 48, 56], 'Fireball keeps its blast');
    eq(SPELLS.fire_nova.radius, [80, 90, 105], 'Fire Nova keeps its area');
    eq(SPELLS.fire_nova.range, [160, 180, 200], 'and can now be thrown further');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_foundations.mjs`
Expected: FAIL — `fire_nova: radius per tier` (or the first area spell without `radius`).

- [ ] **Step 3: Migrate the data** — run this one-off script from `apps/amo` (it rewrites only the `range:` line of area spells that have no `radius`, keeping comments and formatting):

```bash
cd apps/amo && python3 - <<'EOF'
import re
p = 'src/data/spells.js'
s = open(p).read()
CAST = [160, 180, 200]
out, pos, changed = [], 0, 0
for m in re.finditer(r"\n    (\w+): \{\n", s):
    start = m.start()
    end = s.index("\n    },\n", start)
    blk = s[start:end]
    if "targetingType: 'targeted_aoe'" in blk and 'radius:' not in blk:
        rm = re.search(r"( +)range: +\[(\d+), *(\d+), *(\d+)\],", blk)
        assert rm, m.group(1)
        old = [int(rm.group(i)) for i in (2, 3, 4)]
        new = [max(o, c) for o, c in zip(old, CAST)]
        ind = rm.group(1)
        repl = (f"{ind}range:     [{new[0]}, {new[1]}, {new[2]}],   // cast distance\n"
                f"{ind}radius:    [{old[0]}, {old[1]}, {old[2]}],   // area size")
        blk = blk[:rm.start()] + repl + blk[rm.end():]
        changed += 1
    out.append(s[pos:start]); out.append(blk); pos = end
out.append(s[pos:])
open(p, 'w').write(''.join(out))
print('area spells migrated:', changed)
EOF
```

Expected output: `area spells migrated: N` with N ≥ 20.

- [ ] **Step 4: Use `radius` in effects** — in `GameScene._applySpellEffects`, after

```js
        const range = spell?.range?.[level - 1] ?? 80;
```

add

```js
        const radius = spell?.radius?.[level - 1] ?? range;   // area size (range = how far it can be cast)
```

In the `case 'quagmire':` block replace every use of `range` with `radius` (the zone `r: range`, both `fillEllipse` sizes, and `this._applyStatusInRadius(tx, ty, range, status)`).

In the data-driven branch replace

```js
        if (targeting === 'targeted_aoe') {
            if (dmg > 0) this._damageInRadius(tx, ty, range, dmg);
            if (status) this._applyStatusInRadius(tx, ty, range, status);
```

with

```js
        if (targeting === 'targeted_aoe') {
            if (dmg > 0) this._damageInRadius(tx, ty, radius, dmg);
            if (status) this._applyStatusInRadius(tx, ty, radius, status);
```

and in the dispel/interrupt block replace `? this._enemiesInRadius(tx, ty, range)` with `? this._enemiesInRadius(tx, ty, radius)`.

Then check other bespoke area handlers that take the area from `range` inside `_applySpellEffects` (search the method for `range` used as a radius — e.g. `_damageInRadius(…, range` / `_applyStatusInRadius(…, range`) and switch those to `radius` too. Leave `earth_pillar` (it uses distance to the player, not an area).

- [ ] **Step 5: Manual shows both** — in `tools/gen_game_inventory.mjs`, in the spell table row, replace

```js
        tiers(s.manaCost), tiers(s.cooldown), tiers(s.range),
```

with

```js
        tiers(s.manaCost), tiers(s.cooldown), s.range ? tiers(s.range) + (s.radius ? ` (area ${tiers(s.radius)})` : '') : '—',
```

- [ ] **Step 6: Run tests, build, regenerate the manual**

Run:
```bash
cd apps/amo && node tools/test_foundations.mjs && npm test && npx vite build && node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html
```
Expected: foundations pass, everything passes, build succeeds, manual written.

Manual check: aim Fire Nova far from the player — the circle can go up to ~160 px away and keeps its 80 px size; it damages enemies inside that circle.

- [ ] **Step 7: Commit**

```bash
git add apps/amo/src/data/spells.js apps/amo/src/scenes/GameScene.js apps/amo/tools/gen_game_inventory.mjs apps/amo/tools/test_foundations.mjs docs/manual/index.html docs/game_inventory.md
git commit -m "feat(amo): area spells — separate cast distance and area size"
```

---

## After Phase 1

Write `docs/superpowers/plans/<date>-mechanics-phase2-combat-depth.md` (B1, B3, B4, B2, F1, F2) against the code as it is then, from the spec's Phase 2 section.
