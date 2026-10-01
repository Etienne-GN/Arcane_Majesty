# Mechanics Expansion — Phase 2: Combat Depth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make elements and enemies matter in a fight: creature resistances/weaknesses/immunities, three new elemental reactions, an enemy target frame on the HUD, elite variants with affixes, a real bestiary, and spell tooltips with real numbers.

**Architecture:** Each rule lives in a Phaser-free module that node tests import — `src/data/enemyAffinities.js`, `src/systems/reactions.js`, `src/systems/targetInfo.js`, `src/data/elites.js`, `src/data/bestiary.js`, plus `spellDamageAt` / `spellTooltip` in `src/data/spells.js`. `GameScene`, `Enemy`, `CombatManager`, `StatusManager`, `UIScene`, `CodexScene` and `SpellbookScene` call them. One test file: `tools/test_combat_depth.mjs`.

**Tech Stack:** Phaser 3.90, ES modules, node test scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-09-30-mechanics-expansion-design.md` — Phase 2 (B1, B3, B4, B2, F1, F2).

## Global Constraints

- Work in `apps/amo`; commit directly on `main`. End every commit message with:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01XdXdN1GgBhWmdx4TWBe7Tb`
- No new npm dependencies. Pure rules in Phaser-free modules; `tools/test_combat_depth.mjs` runs under plain `node`.
- Old saves keep loading: every new save field defaults when missing.
- Online (server-authoritative) enemies: no elites (`this._serverUrl` set → never roll elite).
- After every task: `npm test` and `npx vite build` pass. Task 7 regenerates the manual (`node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html`) and commits `docs/manual/index.html` + `docs/game_inventory.md`.
- English everywhere.

## Review Focus

1. **A reaction tries to apply a status the target is immune to** (Freeze on an ice creature immune to `frozen`) → immunity wins, nothing is applied, wet is not consumed. (Task 2 test.)
2. **Many wet enemies packed together when lightning hits** → Conduct arcs exactly one hop from the struck target, never back to it, never recursively. (Task 2 test.)
3. **The targeted enemy dies or is destroyed** → the frame shows it at 0 HP, then clears after 4 s; reading a destroyed enemy never throws. (Task 3 test: `targetInfo` with `active: false`.)
4. **Elite rolls on a crowded map, on passive animals, on the boss, online** → never more than the cap, never on passive/boss/online. (Task 4 test for the cap; guards in code.)
5. **A save from before Phase 2** (no `killCounts`, `seenEnemyTypes`) → loads with empty defaults; the bestiary still lists `killedEnemyTypes` with count 1 at least. (Task 5 test.)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/enemyAffinities.js` (create) | families, per-type family, `affinityOf`, `affinityMult` |
| `src/systems/reactions.js` (create) | pure Conduct target selection and Detonate damage |
| `src/systems/targetInfo.js` (create) | pure snapshot of an enemy for the HUD frame |
| `src/data/elites.js` (create) | elite roll, affixes, stat multipliers, rare drop |
| `src/data/bestiary.js` (create) | bestiary lore (moved from CodexScene) + entry builder |
| `src/data/spells.js` (modify) | `spellDamageAt`, `spellTooltip` |
| `src/systems/StatusManager.js` (modify) | immunity, Freeze reaction |
| `src/systems/PlayerStats.js`, `SaveManager.js` (modify) | `killCounts`, `seenEnemyTypes` |
| `src/entities/Enemy.js` (modify) | elite flag/affixes, vampiric, extra loot roll, elite health-bar border |
| `src/systems/CombatManager.js` (modify) | thorned reflect, set target on hit |
| `src/scenes/GameScene.js` (modify) | affinities in `_hit`, reactions, target tracking, elites, spell damage via `spellDamageAt` |
| `src/scenes/UIScene.js` (modify) | chip helper, target frame |
| `src/scenes/CodexScene.js` (modify) | bestiary via `bestiaryEntries` |
| `src/scenes/SpellbookScene.js` (modify) | tooltip line |
| `tools/gen_game_inventory.mjs` (modify) | affinities, elites, reactions in the manual |
| `tools/test_combat_depth.mjs` (create), `package.json` | tests |

---

### Task 1: Elemental resistances, weaknesses, immunities (B1)

**Files:**
- Create: `src/data/enemyAffinities.js`
- Modify: `src/systems/StatusManager.js` (`apply`, first lines)
- Modify: `src/scenes/GameScene.js` (import, `_spawnEnemy`, boss creation, `_hit`)
- Create: `tools/test_combat_depth.mjs`; Modify: `package.json`

**Interfaces:**
- Produces: `FAMILIES`, `ENEMY_FAMILY`, `affinityOf(type) → { family: string|null, resist: {element: mult}, immune: string[] }`, `affinityMult(type, element) → number`; `entity.immune: string[]` honoured by `statusManager.apply`.

- [ ] **Step 1: Write the failing test** — create `tools/test_combat_depth.mjs`:

```js
// Phase 2 combat depth: affinities, reactions, target frame, elites,
// bestiary, spell tooltips. Run: node tools/test_combat_depth.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { ENEMY_TYPES } = await import('../src/data/worldMap.js');
const { statusManager } = await import('../src/systems/StatusManager.js');
const AF = await import('../src/data/enemyAffinities.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };
const mob = (extra = {}) => ({ _statuses: {}, health: 100, maxHealth: 100, active: true, setTint() {}, clearTint() {}, ...extra });

// ---- B1: affinities
{
    for (const type of Object.keys(AF.ENEMY_FAMILY)) ok(ENEMY_TYPES[type] || type === 'void_general', `family entry for a real creature: ${type}`);
    for (const fam of Object.values(AF.ENEMY_FAMILY)) ok(AF.FAMILIES[fam], `family ${fam} defined`);
    eq(AF.affinityMult('lava_elemental', 'fire'), 0.25, 'fire creatures shrug off fire');
    eq(AF.affinityMult('lava_elemental', 'water'), 1.5, 'and fear water');
    eq(AF.affinityMult('frost_bear', 'fire'), 1.5, 'ice creatures fear fire');
    eq(AF.affinityMult('wolf', 'fire'), 1, 'no family, no change');
    eq(AF.affinityMult('lava_elemental', null), 1, 'no element, no change');
    eq(AF.affinityOf('nobody'), { family: null, resist: {}, immune: [] }, 'unknown type is neutral');
    ok(AF.affinityOf('ember_imp').immune.includes('burning'), 'fire creatures cannot burn');

    const imp = mob({ immune: AF.affinityOf('ember_imp').immune });
    statusManager.apply(imp, 'burning');
    ok(!statusManager.has(imp, 'burning'), 'immunity blocks the status');
    statusManager.apply(imp, 'wet');
    ok(statusManager.has(imp, 'wet'), 'other statuses still apply');
}

console.log(`✓ combat-depth tests passed (${n} assertions).`);
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_combat_depth.mjs`
Expected: FAIL — `Cannot find module '.../src/data/enemyAffinities.js'`

- [ ] **Step 3: Implement** — create `src/data/enemyAffinities.js`:

```js
// Creature families and their elemental affinities. `resist` multiplies spell
// damage of that element (0.25 = shrugs it off, 1.5 = weak to it); `immune`
// lists statuses that cannot be applied. Pure — tools/test_combat_depth.mjs.

export const FAMILIES = {
    fire:      { label: 'Fire-born', resist: { fire: 0.25, water: 1.5, ice: 1.5 },   immune: ['burning'] },
    ice:       { label: 'Frost-born', resist: { ice: 0.25, fire: 1.5 },              immune: ['cold', 'frozen'] },
    void:      { label: 'Void-touched', resist: { shadow: 0.5, arcane: 1.4 },        immune: [] },
    undead:    { label: 'Undead',    resist: { fire: 1.3, arcane: 1.3 },             immune: ['poison'] },
    plant:     { label: 'Plant / fungus', resist: { fire: 1.5, earth: 0.5, nature: 0.5 }, immune: [] },
    construct: { label: 'Construct', resist: { lightning: 1.3 },                      immune: ['poison'] },
    aquatic:   { label: 'Aquatic',   resist: { water: 0.5, lightning: 1.4 },          immune: [] },
};

export const ENEMY_FAMILY = {
    ember_imp: 'fire', lava_elemental: 'fire', ash_crawler: 'fire', forge_daemon: 'fire',
    cinder_hawk: 'fire', fire_lizard: 'fire', ember_lizard: 'fire',
    frost_bear: 'ice', ice_revenant: 'ice', blizzard_sprite: 'ice', wendigo: 'ice',
    glacier_crab: 'ice', frost_shade: 'ice', polar_bear: 'ice',
    void_stalker: 'void', void_spawn: 'void', void_crawler: 'void', void_fox: 'void',
    shadow_sprite: 'void', soul_eater: 'void', rift_walker: 'void', mirror_shade: 'void', void_general: 'void',
    skeleton_archer: 'undead', grave_wraith: 'undead', cursed_knight: 'undead',
    treant: 'plant', vine_horror: 'plant', mushroom_shaman: 'plant', mushroom_walker: 'plant', amanita_walker: 'plant',
    stone_golem: 'construct', crystal_golem: 'construct', runic_turret: 'construct', arcane_sentinel: 'construct',
    shark: 'aquatic', bog_lurker: 'aquatic', giant_frog: 'aquatic', rot_frog: 'aquatic', rot_toad: 'aquatic',
};

export function affinityOf(type) {
    const family = ENEMY_FAMILY[type] ?? null;
    const f = family ? FAMILIES[family] : null;
    return { family, resist: { ...(f?.resist ?? {}) }, immune: [...(f?.immune ?? [])] };
}

export function affinityMult(type, element) {
    if (!element) return 1;
    return FAMILIES[ENEMY_FAMILY[type]]?.resist?.[element] ?? 1;
}
```

In `src/systems/StatusManager.js` `apply(entity, id, opts = {})`, right after `if (!entity._statuses) entity._statuses = {};` add:

```js
        if (entity.immune?.includes(id)) return;   // creature immunities (data/enemyAffinities.js)
```

In `package.json` `test` script insert `node tools/test_combat_depth.mjs && ` right after `node tools/test_foundations.mjs && `.

- [ ] **Step 4: Wire GameScene** — add the import:

```js
import { affinityOf, affinityMult } from '../data/enemyAffinities.js';
```

In `_spawnEnemy`, right after `enemy.spellKit  = ENEMY_KITS[type] ?? [];` add:

```js
        enemy.immune    = affinityOf(type).immune;
```

After `this.boss.enemyType = 'void_general';` add:

```js
        this.boss.immune = affinityOf('void_general').immune;
        this.boss.displayName = 'Void General';
```

Replace the `_hit` method body

```js
    _hit(e, dmg) {
        const m = this._hitElement ? statusManager.incomingDmgMult(e, this._hitElement) : 1;
        e.takeDamage(Math.floor(dmg * m));
    }
```

with

```js
    _hit(e, dmg) {
        const el  = this._hitElement;
        const m   = el ? statusManager.incomingDmgMult(e, el) : 1;
        const aff = affinityMult(e.enemyType, el);   // family resistances / weaknesses
        e.takeDamage(Math.floor(dmg * m * aff));
        if (aff > 1) this.combatManager?._spawnNumber(e.x, e.y - 34, 'weak!', '#ffaa33', false);
        else if (aff < 1) this.combatManager?._spawnNumber(e.x, e.y - 34, 'resist', '#8899aa', false);
    }
```

- [ ] **Step 5: Run tests and build**

Run: `cd apps/amo && node tools/test_combat_depth.mjs && npm test && npx vite build`
Expected: combat-depth passes; all suites pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/amo/src/data/enemyAffinities.js apps/amo/src/systems/StatusManager.js apps/amo/src/scenes/GameScene.js apps/amo/tools/test_combat_depth.mjs apps/amo/package.json
git commit -m "feat(amo): creature families — elemental resistances, weaknesses and immunities"
```

---

### Task 2: Reactions — Freeze, Conduct, Detonate (B3)

**Files:**
- Create: `src/systems/reactions.js`
- Modify: `src/systems/StatusManager.js` (`apply`)
- Modify: `src/scenes/GameScene.js` (`_hit`)
- Test: `tools/test_combat_depth.mjs`

**Interfaces:**
- Consumes: `entity.immune` (Task 1).
- Produces: `CONDUCT_RADIUS = 90`, `CONDUCT_FRACTION = 0.5`, `conductTargets(source, enemies, isWet) → enemy[]`; `DETONATE_RADIUS = 50`, `detonateDamage(hitDmg) → number`. Freeze: `statusManager.apply(e, 'cold')` on a wet, not-immune target → `frozen` 3 s, wet removed.

- [ ] **Step 1: Write the failing tests** — add the import after the others:

```js
const RX = await import('../src/systems/reactions.js');
```

and insert before the final `console.log`:

```js
// ---- B3: reactions
{
    // Freeze: cold on a wet target
    const e = mob();
    statusManager.apply(e, 'wet');
    statusManager.apply(e, 'cold');
    ok(statusManager.has(e, 'frozen'), 'cold + wet → frozen');
    ok(!statusManager.has(e, 'wet') && !statusManager.has(e, 'cold'), 'the water froze: no wet, no plain cold');
    ok(e._statuses.frozen.remaining === 3000, 'frozen for 3 s');
    const dry = mob();
    statusManager.apply(dry, 'cold');
    ok(statusManager.has(dry, 'cold') && !statusManager.has(dry, 'frozen'), 'cold on a dry target is just cold');
    const yeti = mob({ immune: ['cold', 'frozen'] });
    statusManager.apply(yeti, 'wet');
    statusManager.apply(yeti, 'cold');
    ok(!statusManager.has(yeti, 'frozen') && statusManager.has(yeti, 'wet'), 'immune to cold: no freeze, stays wet');

    // Conduct: one hop to other wet enemies in range
    const src = { x: 0, y: 0 };
    const a = { x: 50, y: 0, active: true, wet: true }, b = { x: 89, y: 0, active: true, wet: true };
    const far = { x: 200, y: 0, active: true, wet: true }, dryOne = { x: 10, y: 0, active: true, wet: false };
    const dead = { x: 20, y: 0, active: false, wet: true };
    eq(RX.conductTargets(src, [src, a, b, far, dryOne, dead], x => x.wet), [a, b], 'arcs to wet, live enemies within 90 px, never the source');
    eq(RX.CONDUCT_FRACTION, 0.5, 'half damage');

    // Detonate
    eq(RX.detonateDamage(100), 45, '15 + 30% of the hit');
    eq(RX.detonateDamage(0), 15, 'a weak hit still bursts');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_combat_depth.mjs`
Expected: FAIL — `Cannot find module '.../src/systems/reactions.js'`

- [ ] **Step 3: Implement** — create `src/systems/reactions.js`:

```js
// Elemental reactions that hit more than one target. Freeze (cold + wet →
// frozen) lives in StatusManager.apply. Pure — tools/test_combat_depth.mjs.

// Conduct: lightning on a wet target arcs to every other wet enemy nearby (one hop).
export const CONDUCT_RADIUS = 90;
export const CONDUCT_FRACTION = 0.5;
export function conductTargets(source, enemies, isWet) {
    return enemies.filter(e => e !== source && e.active && isWet(e)
        && Math.hypot(e.x - source.x, e.y - source.y) <= CONDUCT_RADIUS);
}

// Detonate: fire on a void-tainted target bursts around it.
export const DETONATE_RADIUS = 50;
export function detonateDamage(hitDmg) {
    return Math.floor(15 + 0.3 * hitDmg);
}
```

In `src/systems/StatusManager.js` `apply`, find the line

```js
        if (id === 'cold' && this.has(entity, 'burning')) return;
```

and add right after it:

```js
        // Freeze: the water on a wet target freezes solid
        if (id === 'cold' && this.has(entity, 'wet') && !entity.immune?.includes('frozen')) {
            this.remove(entity, 'wet');
            this.apply(entity, 'frozen', { duration: 3000 });
            return;
        }
```

- [ ] **Step 4: Wire Conduct and Detonate in GameScene** — import:

```js
import { conductTargets, CONDUCT_FRACTION, DETONATE_RADIUS, detonateDamage } from '../systems/reactions.js';
```

In `_hit`, after the `else if (aff < 1) …` line, add:

```js
        // Conduct: lightning arcs through water (one hop, no re-entry)
        if (el === 'lightning' && !this._conducting && statusManager.has(e, 'wet')) {
            this._conducting = true;
            const pool = [...this.enemies.getChildren(), ...(this.boss?.active ? [this.boss] : [])];
            for (const o of conductTargets(e, pool, x => statusManager.has(x, 'wet'))) {
                const g = this.add.graphics().setDepth(63);
                g.lineStyle(2, 0xffee66, 0.95);
                g.lineBetween(e.x, e.y, o.x, o.y);
                this.tweens.add({ targets: g, alpha: 0, duration: 220, onComplete: () => g.destroy() });
                this._hit(o, Math.floor(dmg * CONDUCT_FRACTION));
            }
            this._conducting = false;
        }
        // Detonate: fire ignites void taint
        if (el === 'fire' && statusManager.has(e, 'void_tainted')) {
            statusManager.remove(e, 'void_tainted');
            const burst = detonateDamage(dmg);
            this.add.particles(e.x, e.y, 'particle', {
                speed: { min: 60, max: 180 }, angle: { min: 0, max: 360 }, scale: { start: 1.4, end: 0 },
                lifespan: { min: 200, max: 450 }, tint: [0x9900ff, 0xff6600, 0x220044], quantity: 24, explode: true,
            }).setDepth(62);
            this._enemiesInRadius(e.x, e.y, DETONATE_RADIUS).forEach(o => o.takeDamage(burst));
        }
```

- [ ] **Step 5: Run tests and build**

Run: `cd apps/amo && node tools/test_combat_depth.mjs && npm test && npx vite build`
Expected: all pass, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add apps/amo/src/systems/reactions.js apps/amo/src/systems/StatusManager.js apps/amo/src/scenes/GameScene.js apps/amo/tools/test_combat_depth.mjs
git commit -m "feat(amo): reactions — Freeze (cold+wet), Conduct (lightning through water), Detonate (fire on void taint)"
```

---

### Task 3: Enemy target frame (B4)

**Files:**
- Create: `src/systems/targetInfo.js`
- Modify: `src/scenes/GameScene.js` (target tracking, hover, `_hit`)
- Modify: `src/systems/CombatManager.js` (`hitTarget`)
- Modify: `src/entities/Enemy.js` (`_doAttack`)
- Modify: `src/scenes/UIScene.js` (chip helper + frame)
- Modify: `src/systems/PlayerStats.js`, `src/systems/SaveManager.js` (`seenEnemyTypes`)
- Test: `tools/test_combat_depth.mjs`

**Interfaces:**
- Produces: `targetInfo(enemy) → { name, level, elite, family, hp, maxHp, dead, statuses: [{ id, label, secs|null, stacks, buff, tint }], cast: { name, frac } | null }`; `GameScene.setTarget(enemy)`, `GameScene.getTargetInfo() → info | null`; `stats.seenEnemyTypes: string[]` (saved).

- [ ] **Step 1: Write the failing tests** — imports:

```js
const { targetInfo } = await import('../src/systems/targetInfo.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');
```

and before the final `console.log`:

```js
// ---- B4: target info
{
    const e = mob({ enemyType: 'frost_shade', level: 8, health: 40, maxHealth: 120 });
    statusManager.apply(e, 'mana_ward');
    statusManager.apply(e, 'burning');
    e._cast = { id: 'frost_bolt', elapsed: 500, castMs: 1000 };
    const t = targetInfo(e);
    eq([t.name, t.level, t.hp, t.maxHp, t.dead, t.elite], ['Frost Shade', 8, 40, 120, false, false], 'name, level, HP');
    eq(t.family, 'Frost-born', 'family label');
    eq(t.statuses.filter(s => s.buff).map(s => s.id), ['mana_ward'], 'buffs listed');
    eq(t.statuses[0].id, 'mana_ward', 'buffs first');
    ok(t.statuses.some(s => s.id === 'burning'), 'debuffs listed too');
    ok(t.statuses.find(s => s.id === 'mana_ward').secs === 12, 'seconds left, rounded up');
    eq(t.cast, { name: 'Frost Bolt', frac: 0.5 }, 'cast in progress');
    const gone = targetInfo({ ...e, active: false, health: -5 });
    eq([gone.dead, gone.hp], [true, 0], 'a dead target reads 0 HP without throwing');
    const boss = mob({ enemyType: 'void_general', displayName: 'Void General', _aegisCast: { elapsed: 800 } });
    eq(targetInfo(boss).cast.name, 'Void Aegis', 'the boss channel shows');
    eq(targetInfo(mob({ enemyType: 'wolf', elite: true, affixes: ['vampiric'] })).elite, true, 'elite flag');

    const s = new PlayerStats();
    eq(s.seenEnemyTypes, [], 'new character has seen nothing');
    store.clear(); SaveManager.setSlot('t', 'eldrin');
    s.seenEnemyTypes.push('wolf'); SaveManager.save(s);
    const u = new PlayerStats(); SaveManager.load(u, 't', 'eldrin');
    eq(u.seenEnemyTypes, ['wolf'], 'seen creatures saved');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_combat_depth.mjs`
Expected: FAIL — `Cannot find module '.../src/systems/targetInfo.js'`

- [ ] **Step 3: Implement** — create `src/systems/targetInfo.js`:

```js
// A plain snapshot of an enemy for the HUD target frame. Pure — reads only
// plain fields, so a destroyed enemy is safe to read. tools/test_combat_depth.mjs.
import { STATUS_DEFS } from '../data/statuses.js';
import { ENEMY_SPELLS, BOSS_AEGIS } from '../data/enemyMagic.js';
import { FAMILIES, ENEMY_FAMILY } from '../data/enemyAffinities.js';

const titleCase = id => String(id ?? '').split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');

export function targetInfo(e) {
    const dead = !e.active || e.health <= 0;
    const statuses = Object.entries(e._statuses ?? {})
        .filter(([id]) => STATUS_DEFS[id])
        .map(([id, st]) => ({
            id, label: STATUS_DEFS[id].label, buff: !!STATUS_DEFS[id].buff, tint: STATUS_DEFS[id].tint ?? null,
            secs: st.remaining === Infinity ? null : Math.ceil(st.remaining / 1000), stacks: st.stacks ?? 1,
        }))
        .sort((a, b) => (b.buff - a.buff) || ((a.secs ?? 1e9) - (b.secs ?? 1e9)));
    let cast = null;
    if (e._cast && ENEMY_SPELLS[e._cast.id]) cast = { name: ENEMY_SPELLS[e._cast.id].name, frac: Math.min(1, e._cast.elapsed / e._cast.castMs) };
    else if (e._aegisCast) cast = { name: BOSS_AEGIS.name, frac: Math.min(1, e._aegisCast.elapsed / BOSS_AEGIS.castMs) };
    return {
        name: e.displayName ?? titleCase(e.enemyType),
        level: e.level ?? null,
        elite: !!e.elite,
        family: FAMILIES[ENEMY_FAMILY[e.enemyType]]?.label ?? null,
        hp: dead ? 0 : Math.ceil(e.health), maxHp: e.maxHealth, dead,
        statuses, cast,
    };
}
```

`src/systems/PlayerStats.js` — constructor after `this.worldState   = {};` add `this.seenEnemyTypes = [];   // creatures met (bestiary shows them as "???" until killed)`; `reset()` after `this.worldState       = {};` add `this.seenEnemyTypes   = [];`.
`src/systems/SaveManager.js` — `save` after the `worldState:` line add `seenEnemyTypes:    [...(stats.seenEnemyTypes ?? [])],`; `load` after the `stats.worldState = …` line add `stats.seenEnemyTypes = [...(d.seenEnemyTypes ?? [])];`.

- [ ] **Step 4: GameScene targeting** — import `import { targetInfo } from '../systems/targetInfo.js';`. Add methods next to `_enemiesInRadius`:

```js
    // ── Target (HUD frame) ────────────────────────────────────────────────
    setTarget(e) {
        if (!e || e.passive) return;
        this._target = e;
        this._targetSeenAt = this.time.now;
        if (e.enemyType && !playerStats.seenEnemyTypes.includes(e.enemyType)) playerStats.seenEnemyTypes.push(e.enemyType);
    }

    // Live target info, or null. A dead or far target lingers 4 s, then clears.
    getTargetInfo() {
        const t = this._target;
        if (!t) return null;
        const live = t.active && t.health > 0 && this.player?.active
            && Phaser.Math.Distance.Between(t.x, t.y, this.player.x, this.player.y) <= 400;
        if (live) this._targetSeenAt = this.time.now;
        else if (this.time.now - this._targetSeenAt > 4000) { this._target = null; return null; }
        return targetInfo(t);
    }
```

In `_hit(e, dmg)` add as its first line: `this.setTarget(e);`.
In `update(time, delta)`, after the location-tracking block, add hover targeting:

```js
        // Hovering an enemy targets it
        this._hoverTimer = (this._hoverTimer ?? 0) - delta;
        if (this._hoverTimer <= 0) {
            this._hoverTimer = 150;
            const p = this.cameras.main.getWorldPoint(this.input.activePointer.x, this.input.activePointer.y);
            const under = this._enemiesInRadius(p.x, p.y, 24)[0];
            if (under) this.setTarget(under);
        }
```

`src/systems/CombatManager.js` `hitTarget(enemy)`: after `this.hitEnemiesThisSwing.add(enemy);` add `this.scene.setTarget?.(enemy);`.
`src/entities/Enemy.js` `_doAttack(player)`: inside `if (this.attackCooldown <= 0) {` as its first statement add `this.scene.setTarget?.(this);`.

- [ ] **Step 5: UIScene frame** — in `create()`, after the status chip pool, add:

```js
        // Target frame (top centre): name, level, HP, statuses, casting
        const tfW = 300, tfX = Math.round(w / 2 - tfW / 2), tfY = 12;
        this._tf = {
            x: tfX, y: tfY, w: tfW,
            bg:   this.add.graphics().setDepth(45),
            name: this.add.text(tfX + 8, tfY + 6, '', { font: 'bold 14px monospace', fill: '#ffffff', stroke: '#000', strokeThickness: 2 }).setDepth(46),
            hp:   this.add.text(tfX + tfW - 8, tfY + 6, '', { font: '12px monospace', fill: '#ffaaaa' }).setOrigin(1, 0).setDepth(46),
            cast: this.add.text(tfX + 8, tfY + 44, '', { font: '12px monospace', fill: '#ccddff' }).setDepth(46),
            chips: Array.from({ length: 8 }, () => this.add.text(0, 0, '', {
                font: '12px monospace', fill: '#aaaaaa', stroke: '#000', strokeThickness: 2, padding: { x: 4, y: 1 },
            }).setDepth(46).setAlpha(0)),
        };
```

Extract the chip loop from the player strip into a helper (the player strip then calls it with its own pool, origin and width):

```js
    // Lay out status chips: [{ label, secs|null, stacks, buff, tint }] from (x, y), wrapping at maxW
    _renderChips(pool, entries, x, y, maxW) {
        let lx = x, ly = y;
        pool.forEach((lbl, i) => {
            const st = entries[i];
            if (!st) { lbl.setAlpha(0); return; }
            const hex = st.tint ? `#${st.tint.toString(16).padStart(6, '0')}` : '#dddddd';
            lbl.setText(`${st.label}${st.stacks > 1 ? ` ×${st.stacks}` : ''}${st.secs != null ? ` ${st.secs}s` : ''}`)
               .setStyle({ fill: hex, backgroundColor: st.buff ? '#123a1acc' : '#3a1212cc' });
            if (lx + lbl.width > x + maxW && lx > x) { lx = x; ly += lbl.height + 3; }
            const fading = st.secs != null && st.secs <= 3;
            lbl.setPosition(lx, ly).setAlpha(fading ? 0.55 + 0.45 * Math.abs(Math.sin(Date.now() * 0.008)) : 1);
            lx += lbl.width + 5;
        });
    }
```

Replace the player-strip block inside `update()` (`if (player) { … }`) with:

```js
        if (player) {
            const active = Object.entries(player._statuses ?? {})
                .filter(([id]) => STATUS_DEFS[id])
                .map(([id, st]) => ({ label: STATUS_DEFS[id].label, tint: STATUS_DEFS[id].tint, buff: !!STATUS_DEFS[id].buff,
                    secs: st.remaining === Infinity ? null : Math.ceil(st.remaining / 1000), stacks: st.stacks ?? 1 }))
                .sort((a, b) => (b.buff - a.buff) || ((a.secs ?? 1e9) - (b.secs ?? 1e9)));
            this._renderChips(this._statusLabels, active, 16, 80, 300);
        }
        this._drawTargetFrame(this.scene.get('GameScene')?.getTargetInfo?.() ?? null);
```

and add:

```js
    _drawTargetFrame(info) {
        const f = this._tf;
        f.bg.clear();
        if (!info) { f.name.setText(''); f.hp.setText(''); f.cast.setText(''); f.chips.forEach(c => c.setAlpha(0)); return; }
        const h = 40 + (info.cast ? 18 : 0) + (info.statuses.length ? 20 : 0);
        f.bg.fillStyle(0x000000, 0.6).fillRect(f.x, f.y, f.w, h);
        f.bg.lineStyle(2, info.elite ? 0xffcc33 : 0x444466).strokeRect(f.x, f.y, f.w, h);
        f.name.setText(`${info.elite ? '★ ' : ''}${info.name}${info.level ? `  Lv ${info.level}` : ''}${info.family ? `  · ${info.family}` : ''}`)
              .setStyle({ fill: info.dead ? '#777777' : info.elite ? '#ffdd66' : '#ffffff' });
        f.hp.setText(`${info.hp}/${info.maxHp}`);
        const barY = f.y + 26;
        f.bg.fillStyle(0x330000).fillRect(f.x + 8, barY, f.w - 16, 8);
        f.bg.fillStyle(info.hp > info.maxHp * 0.5 ? 0xcc2222 : 0xff6600).fillRect(f.x + 8, barY, (f.w - 16) * Math.max(0, info.hp / info.maxHp), 8);
        let y = f.y + 40;
        if (info.cast) {
            f.cast.setText(`casting ${info.cast.name}`).setPosition(f.x + 8, y - 2);
            f.bg.fillStyle(0x222244).fillRect(f.x + 140, y + 2, f.w - 148, 8);
            f.bg.fillStyle(0x88aaff).fillRect(f.x + 140, y + 2, (f.w - 148) * info.cast.frac, 8);
            y += 18;
        } else f.cast.setText('');
        this._renderChips(f.chips, info.statuses, f.x + 8, y, f.w - 16);
    }
```

- [ ] **Step 6: Run tests and build**

Run: `cd apps/amo && node tools/test_combat_depth.mjs && npm test && npx vite build`
Expected: all pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/amo/src/systems/targetInfo.js apps/amo/src/scenes/GameScene.js apps/amo/src/systems/CombatManager.js apps/amo/src/entities/Enemy.js apps/amo/src/scenes/UIScene.js apps/amo/src/systems/PlayerStats.js apps/amo/src/systems/SaveManager.js apps/amo/tools/test_combat_depth.mjs
git commit -m "feat(amo): enemy target frame — name, level, family, HP, statuses and casting"
```

---

### Task 4: Elite variants (B2)

**Files:**
- Create: `src/data/elites.js`
- Modify: `src/scenes/GameScene.js` (map spawn loop, `_tryRespawn`, new `_makeElite`)
- Modify: `src/entities/Enemy.js` (constructor, `_doAttack`, `_die`, `_drawHealthBar`)
- Modify: `src/systems/CombatManager.js` (thorned reflect)
- Test: `tools/test_combat_depth.mjs`

**Interfaces:**
- Produces: `ELITE_CHANCE = 0.08`, `ELITE_AFFIXES`, `eliteCap(spawnCount) → number`, `rollElite(rng, elitesSoFar, cap) → boolean`, `pickAffixes(rng) → string[]` (1–2 distinct), `eliteStats({health, damage, xpReward, goldDrop}) → same shape`, `eliteRareDrop(mapDef, rng) → itemId`. Enemy fields: `elite: boolean`, `affixes: string[]`, `lootRolls: number`, `bonusDrops: string[]`.

- [ ] **Step 1: Write the failing tests** — import `const EL = await import('../src/data/elites.js');` and `const { getMap } = await import('../src/data/maps/index.js');`, then before the final `console.log`:

```js
// ---- B2: elites
{
    eq(EL.eliteCap(0), 0, 'no spawns, no elites');
    eq(EL.eliteCap(5), 1, 'a small map can still have one');
    eq(EL.eliteCap(13), 2, 'one per six spawns');
    ok(EL.rollElite(() => 0.01, 0, 1), 'low roll under the cap → elite');
    ok(!EL.rollElite(() => 0.5, 0, 1), 'high roll → normal');
    ok(!EL.rollElite(() => 0.01, 1, 1), 'cap reached → normal');
    const one = EL.pickAffixes((() => { const r = [0.1, 0.3]; return () => r.shift() ?? 0; })());
    eq(one.length, 1, 'one affix on a low second roll');
    const two = EL.pickAffixes((() => { const r = [0.9, 0.0, 0.5]; return () => r.shift() ?? 0; })());
    eq(two.length, 2, 'two affixes on a high roll');
    ok(new Set(two).size === 2 && two.every(a => EL.ELITE_AFFIXES.includes(a)), 'distinct, known affixes');
    eq(EL.eliteStats({ health: 100, damage: 10, xpReward: 20, goldDrop: 4 }), { health: 250, damage: 14, xpReward: 60, goldDrop: 12 }, 'elite multipliers');
    const rare = EL.eliteRareDrop(getMap('prologue_forest'), () => 0);
    ok(typeof rare === 'string' && rare.length > 0, `a rare regional drop (${rare})`);
    eq(EL.eliteRareDrop({ spawns: {} }, () => 0), 'silver_ore', 'fallback when the map has no nodes');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_combat_depth.mjs`
Expected: FAIL — `Cannot find module '.../src/data/elites.js'`

- [ ] **Step 3: Implement** — create `src/data/elites.js`:

```js
// Elite creatures: rare, stronger map spawns with 1–2 affixes and better loot.
// Pure — tools/test_combat_depth.mjs.
import { resolveNode } from './gathering.js';

export const ELITE_CHANCE = 0.08;
export const ELITE_AFFIXES = ['warded', 'swift', 'vampiric', 'arcane', 'thorned'];
export const AFFIX_LABELS = { warded: 'Warded', swift: 'Swift', vampiric: 'Vampiric', arcane: 'Arcane', thorned: 'Thorned' };

// At most one elite per six spawns, but a small map can still have one.
export function eliteCap(spawnCount) {
    return spawnCount <= 0 ? 0 : Math.max(1, Math.floor(spawnCount / 6));
}

export function rollElite(rng, elitesSoFar, cap) {
    return elitesSoFar < cap && rng() < ELITE_CHANCE;
}

export function pickAffixes(rng) {
    const count = rng() < 0.5 ? 1 : 2;
    const pool = [...ELITE_AFFIXES];
    const out = [];
    for (let i = 0; i < count; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
}

export function eliteStats(s) {
    return {
        health:   Math.round(s.health * 2.5),
        damage:   Math.round(s.damage * 1.4),
        xpReward: Math.round(s.xpReward * 3),
        goldDrop: Math.round(s.goldDrop * 3),
    };
}

// A rare item from the map's own gathering pools (bonus entries, else the rarest weighted one).
export function eliteRareDrop(mapDef, rng) {
    const rares = new Set();
    for (const node of mapDef?.spawns?.gatheringNodes ?? []) {
        const pool = resolveNode(node).pool;
        const bonus = pool.filter(e => e.chance);
        if (bonus.length) bonus.forEach(e => rares.add(e.id));
        else {
            const weighted = pool.filter(e => e.w);
            if (weighted.length > 1) rares.add(weighted.reduce((a, b) => (b.w < a.w ? b : a)).id);
        }
    }
    const list = [...rares];
    return list.length ? list[Math.floor(rng() * list.length)] : 'silver_ore';
}
```

- [ ] **Step 4: Enemy support** — `src/entities/Enemy.js` constructor, after `this.level        = 1; …` add:

```js
        this.elite      = false;   // set by GameScene._makeElite
        this.affixes    = [];
        this.lootRolls  = 1;
        this.bonusDrops = [];
```

In `_doAttack`, replace `player.takeDamage(Math.round(this.damage * statusManager.statsMult(this)));` with:

```js
            const dealt = Math.round(this.damage * statusManager.statsMult(this));
            player.takeDamage(dealt);
            if (this.affixes.includes('vampiric')) this.health = Math.min(this.maxHealth, this.health + Math.round(dealt * 0.3));
```

In `_die`, replace

```js
        const drops = [];
        this.lootTable.forEach(entry => {
            if (Math.random() < entry.chance) drops.push(entry.id);
        });
```

with

```js
        const drops = [...this.bonusDrops];
        for (let r = 0; r < this.lootRolls; r++) {
            this.lootTable.forEach(entry => {
                if (Math.random() < entry.chance) drops.push(entry.id);
            });
        }
```

In `_drawHealthBar`, replace `if (this.passive || this.health >= this.maxHealth) return;` with:

```js
        if (this.passive || (this.health >= this.maxHealth && !this.elite)) return;
```

and at the end of the method add:

```js
        if (this.elite) { g.lineStyle(1, 0xffcc33, 1); g.strokeRect(bx - 1, by - 1, w + 2, h + 2); }
```

`src/systems/CombatManager.js` `hitTarget`: after `enemy.takeDamage(dmg);` add:

```js
        // Elite affix: thorns reflect part of a melee hit
        if (enemy.affixes?.includes('thorned')) stats.health = Math.max(1, stats.health - Math.round(dmg * 0.15));
```

- [ ] **Step 5: GameScene elites** — import:

```js
import { eliteCap, rollElite, pickAffixes, eliteStats, eliteRareDrop } from '../data/elites.js';
```

Before the enemy spawn loop in `create()` add:

```js
        this._eliteCap   = this._serverUrl ? 0 : eliteCap((mapDef.spawns.enemies ?? []).filter(s => !ENEMY_TYPES[s.type]?.passive).length);
        this._eliteCount = 0;
```

Inside the spawn loop, right after `const enemy = this._spawnEnemy(spawn.type, ex, ey);` add:

```js
            this._maybeElite(enemy);
```

In `_tryRespawn`, after `const enemy = this._spawnEnemy(def.type, def.x, def.y);` add the same line `this._maybeElite(enemy);`. In the respawned enemy's death and in the map spawn's death, an elite frees its slot: change both `enemy.once('died', () => this._scheduleRespawn(…))` callbacks to first run `if (enemy.elite) this._eliteCount--;`.

Add the methods after `_tryRespawn`:

```js
    _maybeElite(enemy) {
        if (enemy.passive || !rollElite(Math.random, this._eliteCount, this._eliteCap)) return;
        this._eliteCount++;
        this._makeElite(enemy, pickAffixes(Math.random));
    }

    // Stronger stats, 1–2 affixes, one extra loot roll and a rare regional drop
    _makeElite(enemy, affixes) {
        const s = eliteStats({ health: enemy.maxHealth, damage: enemy.damage, xpReward: enemy.xpReward, goldDrop: enemy.goldDrop });
        Object.assign(enemy, { maxHealth: s.health, health: s.health, damage: s.damage, xpReward: s.xpReward, goldDrop: s.goldDrop });
        enemy.elite = true;
        enemy.affixes = affixes;
        enemy.lootRolls = 2;
        enemy.bonusDrops = [eliteRareDrop(this._mapDef, Math.random)];
        enemy.setScale(enemy.scaleX * 1.2);
        if (affixes.includes('arcane') && !enemy.spellKit.includes('arcane_bolt')) enemy.spellKit = [...enemy.spellKit, 'arcane_bolt'];
        if (affixes.includes('swift')) statusManager.apply(enemy, 'hastened', { duration: -1 });
        if (affixes.includes('warded')) {
            statusManager.apply(enemy, 'mana_ward');
            const t = this.time.addEvent({ delay: 20000, loop: true, callback: () => {
                if (!enemy.active) { t.remove(); return; }
                statusManager.apply(enemy, 'mana_ward');
            } });
        }
        enemy._drawHealthBar();
    }
```

- [ ] **Step 6: Run tests and build**

Run: `cd apps/amo && node tools/test_combat_depth.mjs && npm test && npx vite build`
Expected: all pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/amo/src/data/elites.js apps/amo/src/entities/Enemy.js apps/amo/src/systems/CombatManager.js apps/amo/src/scenes/GameScene.js apps/amo/tools/test_combat_depth.mjs
git commit -m "feat(amo): elite creatures — affixes, stronger stats, better loot"
```

---

### Task 5: Bestiary (F1)

**Files:**
- Create: `src/data/bestiary.js`
- Modify: `src/systems/PlayerStats.js` (`trackKill`, `killCounts`), `src/systems/SaveManager.js`
- Modify: `src/scenes/CodexScene.js` (`BESTIARY_LORE` moves out; case 2 uses `bestiaryEntries`)
- Test: `tools/test_combat_depth.mjs`

**Interfaces:**
- Consumes: `affinityOf` (Task 1), `scaleEnemyStats` / `mapLevelBand` (Phase 1), `ENEMY_KITS`, `ENEMY_SPELLS`, `ITEMS`.
- Produces: `BESTIARY_LORE` (moved verbatim from CodexScene), `bestiaryEntries({ killed, seen, killCounts, band }) → [{ title, text, threat? }]`; `stats.killCounts: { [type]: number }` (saved; `trackKill` increments).

- [ ] **Step 1: Write the failing tests** — import `const BE = await import('../src/data/bestiary.js');`, then before the final `console.log`:

```js
// ---- F1: bestiary
{
    const s = new PlayerStats();
    eq(s.killCounts, {}, 'no kills yet');
    s.trackKill('wolf'); s.trackKill('wolf'); s.trackKill('frost_shade');
    eq(s.killCounts, { wolf: 2, frost_shade: 1 }, 'kills counted');
    eq(s.killedEnemyTypes, ['wolf', 'frost_shade'], 'first kills still listed');
    const list = BE.bestiaryEntries({ killed: s.killedEnemyTypes, seen: ['grave_wraith'], killCounts: s.killCounts, band: { min: 7, max: 9 } });
    eq(list.map(e => e.title), ['Forest Wolf', 'Frost Shade', '???'], 'killed first (lore name when there is one), then seen-only as ???');
    const shade = list[1].text;
    ok(/Killed: 1/.test(shade), 'kill count');
    ok(/Lv 7–9: HP \d+–\d+/.test(shade), 'stats at the region band');
    ok(/immune: cold, frozen/.test(shade) && /weak: fire ×1\.5/.test(shade), 'affinities');
    ok(/Casts: Frost Bolt/.test(shade), 'spells');
    ok(/Drops: /.test(list[0].text), 'loot');
    store.clear(); SaveManager.setSlot('b', 'eldrin');
    SaveManager.save(s);
    const u = new PlayerStats(); SaveManager.load(u, 'b', 'eldrin');
    eq(u.killCounts, { wolf: 2, frost_shade: 1 }, 'kill counts saved');
    const legacy = JSON.parse(store.get('amo_save_b_eldrin')); delete legacy.killCounts; delete legacy.seenEnemyTypes;
    store.set('amo_save_b_eldrin', JSON.stringify(legacy));
    const v = new PlayerStats(); SaveManager.load(v, 'b', 'eldrin');
    eq([v.killCounts, v.seenEnemyTypes], [{}, []], 'legacy save: empty defaults');
    ok(/Killed: 1/.test(BE.bestiaryEntries({ killed: v.killedEnemyTypes, seen: [], killCounts: v.killCounts, band: { min: 1, max: 3 } })[0].text), 'legacy kills show at least 1');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_combat_depth.mjs`
Expected: FAIL — `Cannot find module '.../src/data/bestiary.js'`

- [ ] **Step 3: Implement** — move the `BESTIARY_LORE` constant from `src/scenes/CodexScene.js` (unchanged, cut and paste) into a new `src/data/bestiary.js` and export it, then add below it:

```js
import { ENEMY_TYPES } from './worldMap.js';
import { ITEMS } from './items.js';
import { ENEMY_KITS, ENEMY_SPELLS } from './enemyMagic.js';
import { affinityOf } from './enemyAffinities.js';
import { scaleEnemyStats } from './levelBands.js';

const titleCase = id => id.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

// Codex bestiary: every creature killed (full entry), then those only seen ("???").
export function bestiaryEntries({ killed = [], seen = [], killCounts = {}, band = { min: 1, max: 3 } }) {
    const full = killed.map(type => {
        const def = ENEMY_TYPES[type] ?? {};
        const lore = BESTIARY_LORE[type];
        const base = { health: def.health ?? 30, damage: def.damage ?? 8, xpReward: def.xpReward ?? 20, goldDrop: 0 };
        const lo = scaleEnemyStats(base, band.min), hi = scaleEnemyStats(base, band.max);
        const aff = affinityOf(type);
        const weak = Object.entries(aff.resist).filter(([, m]) => m > 1).map(([el, m]) => `${el} ×${m}`);
        const res  = Object.entries(aff.resist).filter(([, m]) => m < 1).map(([el, m]) => `${el} ×${m}`);
        const lines = [
            lore?.desc,
            `Killed: ${Math.max(1, killCounts[type] ?? 0)}`,
            def.passive ? `HP ${base.health}` : `Lv ${band.min}–${band.max}: HP ${lo.health}–${hi.health}  DMG ${lo.damage}–${hi.damage}`,
            [weak.length && `weak: ${weak.join(', ')}`, res.length && `resists: ${res.join(', ')}`, aff.immune.length && `immune: ${aff.immune.join(', ')}`].filter(Boolean).join('  ·  ') || null,
            (ENEMY_KITS[type] ?? []).length ? `Casts: ${ENEMY_KITS[type].map(id => ENEMY_SPELLS[id].name).join(', ')}` : null,
            (def.lootTable ?? []).length ? `Drops: ${def.lootTable.map(l => `${ITEMS[l.id]?.name ?? l.id} ${Math.round(l.chance * 100)}%`).join(', ')}` : null,
        ].filter(Boolean);
        return { title: lore?.name ?? titleCase(type), text: lines.join('\n'), threat: lore?.threat };
    });
    const unknown = seen.filter(t => !killed.includes(t)).map(() => ({ title: '???', text: 'Seen but never defeated.' }));
    return [...full, ...unknown];
}
```

`src/systems/PlayerStats.js`: constructor after `this.seenEnemyTypes = [];` add `this.killCounts     = {};   // kills per creature type (bestiary)`; `reset()` after `this.seenEnemyTypes   = [];` add `this.killCounts       = {};`; replace `trackKill`:

```js
    trackKill(enemyType) {
        if (!this.killedEnemyTypes.includes(enemyType)) {
            this.killedEnemyTypes.push(enemyType);
        }
        this.killCounts[enemyType] = (this.killCounts[enemyType] ?? 0) + 1;
    }
```

`src/systems/SaveManager.js`: `save` after `seenEnemyTypes:` add `killCounts:        { ...(stats.killCounts ?? {}) },`; `load` after `stats.seenEnemyTypes = …` add `stats.killCounts     = { ...(d.killCounts ?? {}) };`.

`src/scenes/CodexScene.js`: import `import { BESTIARY_LORE, bestiaryEntries } from '../data/bestiary.js';` (keep `BESTIARY_LORE` usable for anything else in the file), `import { mapLevelBand } from '../data/levelBands.js';`, `import { getMap } from '../data/maps/index.js';`, and replace `case 2:`'s body with:

```js
            case 2:
                return bestiaryEntries({
                    killed: playerStats.killedEnemyTypes ?? [],
                    seen: playerStats.seenEnemyTypes ?? [],
                    killCounts: playerStats.killCounts ?? {},
                    band: mapLevelBand(getMap(playerStats.location?.mapId)),
                });
```

- [ ] **Step 4: Run tests and build**

Run: `cd apps/amo && node tools/test_combat_depth.mjs && npm test && npx vite build`
Expected: all pass, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/amo/src/data/bestiary.js apps/amo/src/systems/PlayerStats.js apps/amo/src/systems/SaveManager.js apps/amo/src/scenes/CodexScene.js apps/amo/tools/test_combat_depth.mjs
git commit -m "feat(amo): bestiary — kill counts, regional stats, affinities, spells and loot"
```

---

### Task 6: Spell tooltips with real numbers (F2)

**Files:**
- Modify: `src/data/spells.js` (`spellDamageAt`, `spellTooltip`)
- Modify: `src/scenes/GameScene.js` (`_spellDamage` uses `spellDamageAt`)
- Modify: `src/scenes/SpellbookScene.js` (known-spell row)
- Test: `tools/test_combat_depth.mjs`

**Interfaces:**
- Produces: `spellDamageAt(spell, level, int, mult = 1) → number` (the game's spell damage formula); `spellTooltip(spell, level, int, mult = 1) → string` e.g. `"Dmg 34 · Burning 60% 12s · CD 1.3s · Range 220 · Area 48"`.

- [ ] **Step 1: Write the failing tests** — import `const SP = await import('../src/data/spells.js');`, then before the final `console.log`:

```js
// ---- F2: spell numbers
{
    const fb = SP.SPELLS.fireball;   // baseDmg [20, 8, 1.0]
    eq(SP.spellDamageAt(fb, 1, 5), 25, 'tier 1, INT 5: 20 + 5');
    eq(SP.spellDamageAt(fb, 3, 10), 46, 'tier 3, INT 10: 20 + 16 + 10');
    eq(SP.spellDamageAt(fb, 1, 5, 1.1), 27, 'multiplier (blessed) applied and floored');
    eq(SP.spellDamageAt({ }, 1, 5), 10, 'no baseDmg → 10');
    eq(SP.spellTooltip(fb, 3, 10), 'Dmg 46 · Burning 60% 12s · CD 1s · Range 240 · Area 56', 'full tooltip at tier 3');
    eq(SP.spellTooltip(SP.SPELLS.aetheric_ward, 1, 5), 'Warded (until broken) · CD ' + (SP.SPELLS.aetheric_ward.cooldown[0] / 1000) + 's', 'self spell without damage or range');
}
```

- [ ] **Step 2: Run to verify failure**

Run: `cd apps/amo && node tools/test_combat_depth.mjs`
Expected: FAIL — `SP.spellDamageAt is not a function`

- [ ] **Step 3: Implement** — in `src/data/spells.js`, after the `scaledStatus` function add:

```js
// The game's spell damage: base + per-tier + INT scaling, times a multiplier
// (weapon amplifier, Arcane Mastery, blessed/cursed), floored.
export function spellDamageAt(spell, level, int, mult = 1) {
    let base = 10;
    if (spell?.baseDmg) {
        const [b, perLv, perInt] = spell.baseDmg;
        base = b + perLv * (Math.max(1, level) - 1) + perInt * int;
    }
    return Math.floor(base * mult);
}

// One line of real numbers for the Spellbook.
export function spellTooltip(spell, level, int, mult = 1) {
    const i = Math.max(1, level) - 1;
    const parts = [];
    if (spell.baseDmg && spell.baseDmg.some(v => v > 0)) parts.push(`Dmg ${spellDamageAt(spell, level, int, mult)}`);
    const st = scaledStatus(spell, level);
    if (st) {
        const label = st.id[0].toUpperCase() + st.id.slice(1).replace(/_/g, ' ');
        const chance = (st.chance ?? 1) < 1 ? ` ${Math.round(st.chance * 100)}%` : '';
        const dur = st.duration == null ? '' : st.duration < 0 ? ' (until broken)' : ` ${Math.round(st.duration / 1000)}s`;
        parts.push(`${label}${chance}${dur}`);
    }
    if (spell.cooldown) parts.push(`CD ${+(spell.cooldown[i] / 1000).toFixed(1)}s`);
    if (spell.range) parts.push(`Range ${spell.range[i]}`);
    if (spell.radius) parts.push(`Area ${spell.radius[i]}`);
    return parts.join(' · ');
}
```

In `src/scenes/GameScene.js`, change the spells import to also import `spellDamageAt`, and replace the body of `_spellDamage(id)` with:

```js
        const hasAmp      = ITEMS[playerStats.equipment.weapon]?.passive === 'spell_amplifier';
        const masteryMult = 1 + (playerStats.skills['arcane_mastery']?.level ?? 0) * 0.10;
        const mult = (hasAmp ? 1.25 : 1) * masteryMult * statusManager.statsMult(this.player);   // blessed / cursed
        return spellDamageAt(SPELLS[id], playerStats.getSpellLevel(id), this.player.stats.attributes.intelligence, mult);
```

In `src/scenes/SpellbookScene.js`, import `spellTooltip` from `'../data/spells.js'` (extend the existing import), and in the known-spell branch replace

```js
                track(this.add.text(x + 20, oy + 54, spell.lore ?? '', {
                    font: '14px monospace', fill: '#555566',
                    wordWrap: { width: maxW - 180 }
                }));
```

with

```js
                track(this.add.text(x + 20, oy + 52, spellTooltip(spell, level, playerStats.attributes.intelligence), {
                    font: '14px monospace', fill: '#aa99cc',
                }));
                const lore = spell.lore ?? '';
                track(this.add.text(x + 20, oy + 72, lore.length > 90 ? lore.slice(0, 88) + '…' : lore, {
                    font: '12px monospace', fill: '#555566',
                }));
```

- [ ] **Step 4: Run tests and build**

Run: `cd apps/amo && node tools/test_combat_depth.mjs && npm test && npx vite build`
Expected: all pass, build succeeds. (`tools/test_player_stats.mjs` and the others are unaffected; if any suite references `_spellDamage` numbers, they must still match because `spellDamageAt` is the same formula.)

- [ ] **Step 5: Commit**

```bash
git add apps/amo/src/data/spells.js apps/amo/src/scenes/GameScene.js apps/amo/src/scenes/SpellbookScene.js apps/amo/tools/test_combat_depth.mjs
git commit -m "feat(amo): spellbook shows real numbers — damage, status and duration at your tier, cooldown, range, area"
```

---

### Task 7: Manual

**Files:**
- Modify: `tools/gen_game_inventory.mjs`
- Regenerate: `docs/manual/index.html`, `docs/game_inventory.md`

- [ ] **Step 1: Extend the generator** — import:

```js
const { FAMILIES, ENEMY_FAMILY, affinityOf } = await import(SRC + 'data/enemyAffinities.js');
const { ELITE_CHANCE, AFFIX_LABELS } = await import(SRC + 'data/elites.js');
```

In the hostile/passive creature tables, add a column `'Family'` with `FAMILIES[ENEMY_FAMILY[k]]?.label ?? '—'` after `'Creature'`.

Right before the `P('### Enemy magic');` line add:

```js
P('### Families: resistances, weaknesses, immunities');
P('Spell damage of an element is multiplied by the creature\'s affinity; immune statuses cannot be applied. "weak!" / "resist" shows on the hit.');
P();
table(['Family', 'Multipliers', 'Immune to', 'Creatures'], Object.entries(FAMILIES).map(([id, f]) => [
    f.label, Object.entries(f.resist).map(([el, m]) => `${el} ×${m}`).join(', '), f.immune.join(', ') || '—',
    Object.entries(ENEMY_FAMILY).filter(([, fam]) => fam === id).map(([t]) => t.replace(/_/g, ' ')).join(', '),
]));
P('### Elites');
P(`Each hostile map spawn has a ${Math.round(ELITE_CHANCE * 100)}% chance to be elite (at most one per six spawns): ×2.5 HP, ×1.4 damage, ×3 XP and gold, an extra loot roll and a rare regional item. Affixes (1–2): ${Object.values(AFFIX_LABELS).join(', ')} — Warded renews a Mana Ward every 20 s, Swift is permanently Hastened, Vampiric heals 30% of the damage it deals, Arcane gains Arcane Bolt, Thorned reflects 15% of melee damage.`);
P();
```

In the `## Status effects` section (after its table), add:

```js
P('**Reactions:** Freeze — cold on a wet target freezes it for 3 s. Conduct — lightning on a wet target arcs to every other wet enemy within 90 px for 50% damage. Detonate — fire on a void-tainted target bursts for 15 + 30% of the hit around it. Steam — fire and water cancel out. Shatter — a physical hit on a frozen target deals ×1.5.');
P();
```

- [ ] **Step 2: Regenerate and verify**

Run: `cd apps/amo && node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html && grep -c "Families: resistances" ../../docs/game_inventory.md && npm test`
Expected: manual written, `1`, all suites pass.

- [ ] **Step 3: Commit**

```bash
git add apps/amo/tools/gen_game_inventory.mjs docs/manual/index.html docs/game_inventory.md
git commit -m "docs(amo): manual covers families, elites and reactions"
```

---

## After Phase 2

Write `docs/superpowers/plans/<date>-mechanics-phase3-economy.md` (C2, C5, C1, C3, C4) from the spec's Phase 3 section, against the code as it is then.
