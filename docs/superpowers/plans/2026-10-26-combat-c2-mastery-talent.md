# Combat C2: Mastery, Talent and Classes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Every weapon type and every element gets a mastery from 1 to 10 that grows by use and is capped by the character's talent (Gifted 10 / Trained 6 / Untrained 3).
- Spells unlock by element mastery, so standing in the rain no longer hands out spells.
- Story heroes have their talents, and created characters pick one of 8 classes.
- The character screen and the manual show all of it.

**Architecture:**
- **A new pure module `src/systems/mastery.js`** holds the curve, the caps, what a level does, the focus bonus and the spell-unlock levels.
- **A new data module `src/data/talents.js`** holds the four heroes' talents and the eight classes.
- **`PlayerStats`** stores mastery points (`mastery.weapons`, `mastery.elements`) and its talents, and routes every old `gainResonance` call into passive element points.
- **Game hooks** award points:
  - weapon points on a melee or ranged hit and on a kill;
  - element (and focus) points when a spell hits, in `GameScene._hit`.

**Tech Stack:** Phaser 3.90, ES modules, Node `assert` tests, headless Chrome via `../tool_suite/lpc_forge/tools/console.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-26-combat-weapons-design.md` (section 3, the spells part of section 4, section 6, stage C2).

## Global Constraints

- **Saves:**
  - Every new save field gets a default in `PlayerStats` (both the constructor and `reset()`).
  - Old saves load without errors.
  - Spells a save already knows stay known, at their tiers. Nothing is taken away (spec §4 migration).
- **Tests:**
  - Every pure module gets a `tools/test_*.mjs` test chained into `npm test`.
  - Every system is checked headless in the running game before it is called done.
  - `npm test` stays green at every step.
- **The manual** gets the C2 part of its Combat chapter (spec §6): mastery, talent, the character and class tables, spells and elements. It is written so a child can follow it.
- **Workflow:** commits go straight to `main`. Working directory: `apps/amo`.
- **Headless checks:**
  - `console.mjs URL ms --eval "step;;step"` runs steps 800 ms apart, and a bare `0` is a delay. Print with `console.log('RESULT', …)`.
  - `gs = __game.scene.getScene('GameScene')`, and the game's stats object is `gs.player.stats`.
  - Use `?testmap=east_road`: prologue_forest pauses for its intro dialogue.
  - A dynamic `import()` gives a second module copy; use it only for pure helpers or `SaveManager` with the game's own `gs.player.stats`.

## Decisions carried in (user, 2026-10-26)

- **Option A for first spells:**
  - Being around an element (rain, campfires, fighting its creatures, using scrolls) slowly builds a feel for it, up to element mastery **2**. That teaches only the easiest spell or two of each element.
  - Everything beyond comes from casting spells in fights, or from scrolls, tomes and teachers.
  - Each hero starts knowing one or two spells of their gifted magic.

## Rulings against the spec (made while planning)

- **The spell-unlock curve.** Spec §4 sets an element's Novice level at `round(threshold / 10)`, but with option A that formula would let rain teach three water spells. The plan instead uses:
  - **Novice at element level `clamp(ceil(threshold / 6) + 1, 2, 10)`**, Apprentice 2 levels later, Adept 4 levels later, each capped at 10.
  - Mastery level 2 (the passive cap) then unlocks only spells with a threshold of 6 or less:
    - water: Tidal Bolt;
    - fire: Fireball, Fire Nova;
    - wind: Drying Wind;
    - earth: Rock Bullet.
  - Riptide (18) needs element level 4.
- **Passive gains stop at level 2,** as the spec says. They cover every old `gainResonance` call: kills by enemy type, rain, campfires, scroll and tome use, nature items, and the few cast-gains in `Player.js`. Spell hits are counted separately.
- **Points are fractional.** A hit gives 1 point and a kill 6 (the hit plus 5), times `clamp(1 + 0.25 × (enemy level − your level), 0.2, 2)`, so weak enemies teach little.
- **Staff "casts 25% slower" becomes "25% longer cooldown",** because spells are instant in this game.
- **Focus:** the wand or staff in the main hand counts, else the one in the off hand. Its mastery grows whenever a spell hits while you hold it.
- **The class choice for created characters happens the first time a created character enters the world** (OnlineCharacterScene), not in the character creator. That one picker serves both new characters and characters created before C2 (spec: "asked once"), and leaves the large creator screen untouched. Created characters are played online only, as today.
- **Talents are not saved.** They come from the character (`talentsFor(characterId, classId)`), so changing a class later is a data change.
- **`stats.resonance` keeps counting** (old saves, codex), but nothing reads it for spells any more. Skill-tree requirements written as `resonance: { arcane: N }` now mean "arcane element level ≥ `unlockLevel(N)`" (the same curve).

## Review Focus

1. **An old save with lots of resonance and known spells:**
   - every known spell stays at its tier;
   - element points come from the resonance (×5), capped by talent;
   - the save loads without error.

   Pinned by `test_mastery` migration tests and the `test_player_stats` load test (Tasks 1, 3).
2. **Standing in the rain for a long time:** water mastery stops at level 2, only Tidal Bolt is learned, and Riptide never is. Pinned by the passive-cap tests (Tasks 1, 3) and a headless rain check (Task 7).
3. **An Untrained character practising forever** (Kael with a wand): mastery stops at 3, and only spells unlocking at ≤ 3 are learned. Pinned by ceiling tests (Tasks 1, 3).
4. **A kill by a spell while holding a sword and a staff:** element and staff points rise, sword points do not. **A sword kill:** sword points rise, element points do not. Pinned by the headless point checks (Task 7).
5. **A created character entering the world with no class:** asked once, the choice is saved in its slot, and never asked again. Pinned by the headless class-picker check (Task 7).

---

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/systems/mastery.js` (new), `tools/test_mastery.mjs` (new), `package.json` | 1 | the curve, caps, effects, spell unlocks (pure) |
| `src/data/talents.js` (new), `src/data/characters.js`, `tools/test_mastery.mjs` | 2 | hero talents, classes, starting spells |
| `src/systems/PlayerStats.js`, `src/systems/SaveManager.js`, `tools/test_player_stats.mjs` | 3 | mastery store, gains, spells by level, save and migration |
| `src/systems/CombatManager.js`, `src/scenes/GameScene.js`, `src/entities/Player.js` | 4 | points from hits; level effects in damage, cooldowns, spells |
| `src/scenes/OnlineCharacterScene.js`, `src/scenes/GameScene.js` | 5 | class picker; talents at scene start |
| `src/scenes/StatScene.js`, `src/scenes/SpellbookScene.js`, `src/scenes/SkillTreeScene.js`, `src/scenes/GameScene.js` | 6 | MASTERY panel, element levels, level-up notices |
| (no source) | 7 | headless checks |
| `tools/gen_game_inventory.mjs`, `docs/manual/index.html`, `docs/game_inventory.md` | 8 | manual |

---

### Task 1: The mastery rules (pure)

**Files:**
- Create: `src/systems/mastery.js`, `tools/test_mastery.mjs`
- Modify: `package.json` (insert `node tools/test_mastery.mjs && ` directly before `node tools/test_weapons.mjs && `)

**Interfaces:**
- **Produces:**
  - `CEILING`, `MAX_LEVEL = 10`, `PASSIVE_CAP_LEVEL = 2`;
  - `pointsFor(level)`, `levelOf(points)`;
  - `FAMILY(element) → 'elemental'|'light'|'dark'`;
  - `ceilingOf(talents, key)`;
  - `addPoints(points, gain, ceilingLevel, { passive })`;
  - `hitGain(killed, enemyLevel, playerLevel)`;
  - `levelDamageMult(level)`, `levelCooldownMult(level)`;
  - `focusOf(equipment, items)`, `focusBonus(focusType, level)`;
  - `unlockLevels(spell)`, `unlockLevel(threshold)`, `tierAt(spell, elementLevel)`;
  - `pointsFromResonance(resonance, ceilingLevel)`.

- [ ] **Step 1: Write the failing test** (`tools/test_mastery.mjs`)

```js
// Combat C2: mastery 1-10 grown by use, capped by talent; spells by element level.
// Run: node tools/test_mastery.mjs
import assert from 'node:assert';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const M = await import('../src/systems/mastery.js');
const { SPELLS } = await import('../src/data/spells.js');
const { ITEMS } = await import('../src/data/items.js');

// ---- the curve: level L -> L+1 costs 40 x L (1,800 points to 10)
eq([M.pointsFor(1), M.pointsFor(2), M.pointsFor(3), M.pointsFor(10)], [0, 40, 120, 1800], 'points to reach a level');
eq([M.levelOf(0), M.levelOf(39.9), M.levelOf(40), M.levelOf(1800), M.levelOf(99999)], [1, 1, 2, 10, 10], 'level of a point total');
eq([M.CEILING.gifted, M.CEILING.trained, M.CEILING.untrained], [10, 6, 3], 'ceilings');
eq([M.FAMILY('arcane'), M.FAMILY('shadow'), M.FAMILY('water'), M.FAMILY('lightning')], ['light', 'dark', 'elemental', 'elemental'], 'magic families');
eq([M.ceilingOf({ sword: 'gifted' }, 'sword'), M.ceilingOf({}, 'sword'), M.ceilingOf({ dark: 'trained' }, 'dark')], [10, 3, 6], 'talent ceilings, untrained by default');

// ---- caps
eq(M.addPoints(0, 9999, 3), M.pointsFor(3), 'an untrained skill stops at level 3');
eq(M.addPoints(0, 9999, 10, { passive: true }), M.pointsFor(2), 'rain, campfires, kills by type: never past level 2');
eq(M.addPoints(500, 5, 10, { passive: true }), 500, 'passive gains never add above the passive cap');
eq(M.addPoints(10, 5, 10), 15, 'practice adds');

// ---- what a hit or kill teaches
eq(M.hitGain(false, 3, 3), 1, 'a hit on an equal: 1');
eq(M.hitGain(true, 3, 3), 6, 'a kill on an equal: 6');
ok(M.hitGain(true, 1, 9) < 2 && M.hitGain(true, 1, 9) > 0, 'weak enemies teach little');
eq(M.hitGain(true, 12, 2), 12, 'strong enemies teach twice as much, no more');

// ---- what levels do
eq([M.levelDamageMult(1), M.levelDamageMult(10)], [1, 1.72], '+8% damage per level');
eq([M.levelCooldownMult(1), Math.round(M.levelCooldownMult(10) * 100) / 100], [1, 0.82], '2% faster per level');
const eqp = (weapon, offHand = null) => ({ weapon, offHand });
eq([M.focusOf(eqp('longsword', 'novice_staff'), ITEMS), M.focusOf(eqp('willow_wand', 'novice_staff'), ITEMS), M.focusOf(eqp('longsword'), ITEMS)], ['staff', 'wand', null], 'the focus: main hand first, then off hand, else none');
eq(M.focusBonus(null, 5), { power: 1, radius: 1, cooldown: 1 }, 'no focus: no bonus, no penalty');
const w = M.focusBonus('wand', 5), s = M.focusBonus('staff', 5);
ok(w.power < 1 && w.cooldown < 1 && w.radius === 1, 'a wand casts faster, a little weaker');
ok(s.power > 1 && s.radius > 1 && s.cooldown > 1, 'a staff casts stronger and wider, more slowly');
ok(M.focusBonus('staff', 10).power > M.focusBonus('staff', 1).power, 'the focus bonus grows with its mastery');

// ---- spells by element level (option A: the passive cap teaches only the easiest)
eq(M.unlockLevels(SPELLS.tidal_bolt), [2, 4, 6], 'Tidal Bolt: Novice at water 2');
eq(M.unlockLevels(SPELLS.riptide)[0], 4, 'Riptide waits for water 4');
eq([M.tierAt(SPELLS.tidal_bolt, 1), M.tierAt(SPELLS.tidal_bolt, 2), M.tierAt(SPELLS.tidal_bolt, 6)], [0, 1, 3], 'tiers climb with the element');
const byPassive = Object.values(SPELLS).filter(sp => sp.discoverCondition && M.tierAt(sp, M.PASSIVE_CAP_LEVEL) > 0).map(sp => sp.id).sort();
eq(byPassive, ['drying_wind', 'fire_nova', 'fireball', 'rock_bullet', 'tidal_bolt'], 'the feel for an element alone teaches only these');
ok(Object.values(SPELLS).every(sp => !sp.discoverCondition || M.unlockLevels(sp).every(l => l >= 2 && l <= 10)), 'every unlock is between 2 and 10');
eq(M.unlockLevel(3), 2, 'a skill-tree requirement of resonance 3 means level 2');

// ---- old saves
eq(M.pointsFromResonance(18, 10), 90, 'resonance converts at 5 points each');
eq(M.pointsFromResonance(999, 3), M.pointsFor(3), '… capped by talent');

console.log(`test_mastery: ${n} checks passed`);
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_mastery.mjs`
Expected: FAIL with `Cannot find module …/src/systems/mastery.js`.

- [ ] **Step 3: Write `src/systems/mastery.js`**

```js
// Combat C2 (docs/superpowers/specs/2026-10-26-combat-weapons-design.md §3-4):
// mastery levels 1-10 grown by use and capped by talent, what a level does, the
// wand/staff focus bonus, and which spell tiers an element level unlocks.
// Pure — tools/test_mastery.mjs.
import { typeOf } from './weapons.js';

export const MAX_LEVEL = 10;
export const PASSIVE_CAP_LEVEL = 2;   // the feel for an element (rain, kills by type…) stops here
export const CEILING = { gifted: 10, trained: 6, untrained: 3 };

// Level L -> L+1 costs 40 x L, so reaching L takes 20 x L x (L - 1) points.
export const pointsFor = L => 20 * L * (L - 1);
export function levelOf(points) {
    let L = 1;
    while (L < MAX_LEVEL && points >= pointsFor(L + 1)) L++;
    return L;
}

export const FAMILY = el => (el === 'arcane' ? 'light' : el === 'shadow' ? 'dark' : 'elemental');
export const ceilingOf = (talents, key) => CEILING[talents?.[key] ?? 'untrained'] ?? CEILING.untrained;

// Add a gain under the talent's ceiling; passive gains also stop at PASSIVE_CAP_LEVEL.
export function addPoints(points, gain, ceilingLevel, { passive = false } = {}) {
    const cap = pointsFor(Math.min(ceilingLevel, passive ? PASSIVE_CAP_LEVEL : MAX_LEVEL));
    if (points >= cap) return points;
    return Math.min(cap, points + gain);
}

// A hit teaches 1, a kill 6 (the hit + 5), scaled by the enemy's level vs yours.
export function hitGain(killed, enemyLevel = 1, playerLevel = 1) {
    const scale = Math.min(2, Math.max(0.2, 1 + 0.25 * (enemyLevel - playerLevel)));
    return (killed ? 6 : 1) * scale;
}

export const levelDamageMult = L => Math.round((1 + 0.08 * (L - 1)) * 100) / 100;
export const levelCooldownMult = L => 1 - 0.02 * (L - 1);

// The magic focus in hand: the main hand's wand or staff, else the off hand's.
export function focusOf(equipment, items) {
    for (const id of [equipment.weapon, equipment.offHand]) {
        const t = typeOf(items[id]);
        if (t === 'wand' || t === 'staff') return t;
    }
    return null;
}
export function focusBonus(focus, L = 1) {
    if (focus === 'wand') return { power: 0.85, radius: 1, cooldown: 1 - (0.10 + 0.02 * L) };
    if (focus === 'staff') return { power: 1 + 0.10 + 0.03 * L, radius: 1.05 + 0.02 * L, cooldown: 1.25 };
    return { power: 1, radius: 1, cooldown: 1 };
}

// A spell's Novice / Apprentice / Adept element levels (from its old resonance threshold).
export const unlockLevel = threshold => Math.min(MAX_LEVEL, Math.max(2, Math.ceil(threshold / 6) + 1));
export function unlockLevels(spell) {
    const t = spell?.discoverCondition?.threshold;
    if (t == null) return null;
    const novice = unlockLevel(t);
    return [novice, Math.min(MAX_LEVEL, novice + 2), Math.min(MAX_LEVEL, novice + 4)];
}
export function tierAt(spell, elementLevel) {
    const levels = unlockLevels(spell);
    return levels ? levels.filter(l => elementLevel >= l).length : 0;
}

// Old saves: resonance converts at 5 points each, under the ceiling.
export const pointsFromResonance = (resonance, ceilingLevel) => Math.min((resonance ?? 0) * 5, pointsFor(ceilingLevel));
```

- [ ] **Step 4: Run it to see it pass**

Run: `node tools/test_mastery.mjs`
Expected: `test_mastery: <n> checks passed`. If `the feel for an element alone teaches only these` lists a different set, read which spells and thresholds differ (`unlockLevel` is the only knob). Adjust the divisor (6) by ±1, rerun, and ledger the ruling with the final list.

- [ ] **Step 5: Chain it and commit**

```bash
npm test 2>&1 | tail -2
git add src/systems/mastery.js tools/test_mastery.mjs package.json
git commit -m "feat(amo): mastery rules (pure) — levels 1-10, talent ceilings, passive cap at 2, what levels do, the wand/staff focus, spells by element level"
```

---

### Task 2: Who is good at what

**Files:**
- Create: `src/data/talents.js`
- Modify: `src/data/characters.js` (starting spells in `startKit`), `tools/test_mastery.mjs`

**Interfaces:**
- **Produces:**
  - `STORY_TALENTS[characterId]`;
  - `CLASSES[classId] = { name, blurb, talents }`;
  - `CLASS_IDS`;
  - `talentsFor(characterId, classId?) → { [weaponType | 'elemental' | 'light' | 'dark']: 'gifted' | 'trained' }` (anything missing is untrained);
  - `startKit.spells: string[]`.

- [ ] **Step 1: Write the failing test** (append to `tools/test_mastery.mjs`, before the final `console.log`)

```js
// ---- talents (spec §3 tables)
{
    const T = await import('../src/data/talents.js');
    const { CHARACTERS } = await import('../src/data/characters.js');
    const { WEAPON_TYPES } = await import('../src/systems/weapons.js');
    const keys = [...Object.keys(WEAPON_TYPES).filter(t => t !== 'fists'), 'fists', 'elemental', 'light', 'dark'];
    const all = [...Object.values(T.STORY_TALENTS), ...Object.values(T.CLASSES).map(c => c.talents)];
    ok(all.every(t => Object.entries(t).every(([k, v]) => keys.includes(k) && ['gifted', 'trained'].includes(v))), 'every talent names a real weapon or family');
    eq([T.talentsFor('eldrin').staff, T.talentsFor('eldrin').elemental, T.talentsFor('eldrin').sword], ['gifted', 'gifted', undefined], 'Eldrin: a mage, never a top swordsman');
    eq([T.talentsFor('kael').sword, T.talentsFor('kael').greatsword, T.talentsFor('kael').wand], ['gifted', 'gifted', undefined], 'Kael: both swords, never the best mage');
    eq([T.talentsFor('anya').light, T.talentsFor('anya').dark], ['gifted', 'gifted'], 'Anya: masters two kinds of magic');
    eq([T.talentsFor('seraphina').dagger, T.talentsFor('seraphina').sword, T.talentsFor('seraphina').dark], ['gifted', 'gifted', 'gifted'], 'Seraphina: dagger, sword and dark magic');
    eq(T.talentsFor('eldrin_forge'), T.talentsFor('eldrin'), 'the forge Eldrin is Eldrin');
    eq(T.CLASS_IDS, ['warrior', 'ranger', 'mage', 'brawler', 'spellsword', 'shadowblade', 'seer', 'druid'], 'eight classes');
    eq(T.talentsFor('online', 'brawler').fists, 'gifted', 'a created character takes its class\'s talents');
    eq(T.talentsFor('online', undefined), {}, 'no class yet: untrained at everything');
    const { SPELLS } = await import('../src/data/spells.js');
    for (const c of CHARACTERS) for (const id of c.startKit?.spells ?? []) ok(SPELLS[id], `${c.id} starts knowing ${id}`);
    eq((CHARACTERS.find(c => c.id === 'eldrin').startKit.spells ?? []).sort(), ['fireball', 'tidal_bolt'], 'Eldrin starts with fire and water');
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_mastery.mjs`
Expected: FAIL with `Cannot find module …/src/data/talents.js`.

- [ ] **Step 3: Write `src/data/talents.js`**

```js
// Combat C2: who is good at what (spec §3). A talent sets how far a mastery can
// climb: gifted -> 10, trained -> 6, anything not listed -> untrained (3).
// Keys: weapon types (systems/weapons.js) and the magic families elemental /
// light (Aurorian, arcane) / dark (Malakar, the Void: shadow).
// Talents are data, not save fields — changing class later is a data change.

const G = 'gifted', T = 'trained';

export const STORY_TALENTS = {
    eldrin:    { wand: G, staff: G, bo: T, elemental: G, light: T, dark: T },
    kael:      { spear: T, dagger: T, sword: G, greatsword: G, mace: T, axe: T, shield: G, crossbow: T, fists: T, light: T },
    anya:      { wand: G, staff: G, bo: T, dagger: T, bow: T, elemental: T, light: G, dark: G },
    seraphina: { wand: T, staff: T, spear: T, dagger: G, sword: G, greatsword: T, axe: T, shield: T, bow: T, crossbow: T, fists: T, dark: G },
};
STORY_TALENTS.eldrin_forge = STORY_TALENTS.eldrin;

export const CLASSES = {
    warrior:     { name: 'Warrior',     blurb: 'Swords and shield — the front line.',            talents: { sword: G, greatsword: G, shield: G, dagger: T, spear: T, mace: T, axe: T, crossbow: T, fists: T } },
    ranger:      { name: 'Ranger',      blurb: 'Bow, crossbow and dagger — strike from afar.',    talents: { bow: G, crossbow: G, dagger: G, sword: T, spear: T, elemental: T } },
    mage:        { name: 'Mage',        blurb: 'Wand, staff and the elements.',                   talents: { wand: G, staff: G, elemental: G, light: T, dark: T, bo: T, dagger: T } },
    brawler:     { name: 'Brawler',     blurb: 'Fists and the bo staff — the monk.',              talents: { fists: G, bo: G, dagger: T, greatsword: T, mace: T, axe: T } },
    spellsword:  { name: 'Spellsword',  blurb: 'Sword, shield and light magic — the holy knight.', talents: { sword: G, shield: G, light: G, mace: T, wand: T, elemental: T } },
    shadowblade: { name: 'Shadowblade', blurb: 'Dagger, sword and dark magic — fast and cruel.',  talents: { dagger: G, sword: G, dark: G, bow: T, wand: T, fists: T } },
    seer:        { name: 'Seer',        blurb: 'Wand and light magic — healer and guide.',        talents: { wand: G, light: G, staff: T, bo: T, dagger: T, elemental: T } },
    druid:       { name: 'Druid',       blurb: 'Bo staff, staff and the elements — the hermit.',  talents: { bo: G, staff: G, elemental: G, spear: T, bow: T, light: T } },
};
export const CLASS_IDS = Object.keys(CLASSES);

export function talentsFor(characterId, classId) {
    if (classId && CLASSES[classId]) return CLASSES[classId].talents;
    return STORY_TALENTS[characterId] ?? {};
}
```

- [ ] **Step 4: Starting spells.** In `src/data/characters.js`, extend each `startKit`:

| id | add |
|---|---|
| `eldrin`, `eldrin_forge` | `spells: ['fireball', 'tidal_bolt']` |
| `kael` | (none) |
| `anya` | `spells: ['mana_dart', 'shadow_bolt']` |
| `seraphina` | `spells: ['shadow_bolt']` |

For example: `startKit: { weapon: 'novice_staff', spells: ['fireball', 'tidal_bolt'] },`.

- [ ] **Step 5: Run and commit**

Run: `node tools/test_mastery.mjs && npm test 2>&1 | tail -2`
Expected: pass.

```bash
git add src/data/talents.js src/data/characters.js tools/test_mastery.mjs
git commit -m "feat(amo): talents — Eldrin, Kael, Anya and Seraphina's gifts, eight classes, starting spells"
```

---

### Task 3: Mastery in the save; spells by element level

**Files:**
- Modify: `src/systems/PlayerStats.js`, `src/systems/SaveManager.js`, `tools/test_player_stats.mjs`

**Interfaces:**
- **Consumes:** Task 1 and Task 2.
- **Produces, on `PlayerStats`:**
  - `mastery = { weapons: {}, elements: {} }` (points);
  - `talents` (object);
  - `setTalents(t)`;
  - `weaponLevel(type)`, `elementLevel(el)`, `ceilingFor(key)`, `focusType()`;
  - `gainWeaponPoints(type, gain) → newLevel`;
  - `gainElementPoints(el, gain, { passive }) → newLevel`;
  - `onMasteryUp(fn)` / `offMasteryUp(fn)` with `fn(kind: 'weapon'|'element', key, level)`;
  - `giveStartKit` grants `kit.spells`.
- **Behaviour:**
  - `gainResonance(el, amt)` adds passive element points as well as counting resonance;
  - `_checkSpellProgress(el)` uses `tierAt` with the element level;
  - `startSpellCooldown` applies the focus cooldown;
  - `canUnlock` reads resonance requirements as element levels.
- **On `SaveManager`:** saves and loads `mastery`, sets talents from the character id on load, and migrates old saves (resonance ×5, capped).

- [ ] **Step 1: Write the failing tests** (append to `tools/test_player_stats.mjs`, before the final `console.log`)

```js
// ---- Combat C2: mastery, talents, spells by element level
{
    const { talentsFor } = await import('../src/data/talents.js');
    const M = await import('../src/systems/mastery.js');
    const e = new PlayerStats();
    e.setTalents(talentsFor('eldrin'));
    eq(e.mastery, { weapons: {}, elements: {} }, 'a fresh character has no mastery yet');
    eq([e.weaponLevel('sword'), e.elementLevel('water')], [1, 1], 'everyone starts at 1');
    for (let i = 0; i < 500; i++) e.gainResonance('water', 2);          // a very long time in the rain
    eq(e.elementLevel('water'), 2, 'rain alone stops at water 2');
    eq([e.getSpellLevel('tidal_bolt'), e.getSpellLevel('riptide')], [1, 0], 'it teaches Tidal Bolt, never Riptide');
    e.gainElementPoints('water', 9999);
    eq(e.elementLevel('water'), 10, 'Eldrin is gifted in the elements: water can reach 10');
    eq(e.getSpellLevel('riptide'), 3, 'and the spells follow, up to Adept');
    e.gainWeaponPoints('sword', 9999);
    eq(e.weaponLevel('sword'), 3, 'but a sword stops at 3 for him');
    const ups = [];
    const k = new PlayerStats();
    k.setTalents(talentsFor('kael'));
    k.onMasteryUp((kind, key, level) => ups.push([kind, key, level]));
    k.gainWeaponPoints('sword', 40);
    eq(ups, [['weapon', 'sword', 2]], 'a level-up is announced once');
    k.gainElementPoints('arcane', 99999);
    eq(k.elementLevel('arcane'), 6, 'Kael is trained in light magic (the Spark): 6');
    k.gainElementPoints('fire', 99999);
    eq(k.elementLevel('fire'), 3, 'untrained in the elements: 3');
    // starting kit spells
    const a = new PlayerStats();
    a.giveStartKit({ weapon: 'willow_wand', spells: ['mana_dart', 'shadow_bolt'] });
    eq([a.getSpellLevel('mana_dart'), a.getSpellLevel('shadow_bolt')], [1, 1], 'Anya starts knowing her two spells');
    // the focus
    a.setTalents(talentsFor('anya'));
    eq(a.focusType(), 'wand', 'a wand in hand is the focus');
    a.startSpellCooldown('mana_dart');
    ok(a.spellCooldowns.mana_dart < SPELLS_COOLDOWN('mana_dart'), 'a wand shortens the cooldown');
    // skill-tree requirements read element levels
    const s = new PlayerStats();
    s.level = 9; s.attributes.agility = 20; s.attributes.intelligence = 20;
    const reqSkill = Object.entries(s.skills).find(([, sk]) => sk.requirements?.resonance?.arcane === 3);
    if (reqSkill) {
        ok(!s.canUnlock(reqSkill[0]), 'arcane level 1: the skill is locked');
        s.gainElementPoints('arcane', M.pointsFor(2));
        ok(s.canUnlock(reqSkill[0]), 'arcane level 2: unlocked');
    }
    // old save: resonance converts, known spells stay
    const o = new PlayerStats();
    SaveManager.save(o, 'c2test', 'eldrin');
    const raw = JSON.parse(localStorage.getItem('amo_save_c2test_eldrin'));
    delete raw.mastery; raw.resonance = { ...raw.resonance, water: 40, shadow: 999 }; raw.spells = { ...raw.spells, riptide: 2 };
    localStorage.setItem('amo_save_c2test_eldrin', JSON.stringify(raw));
    const o2 = new PlayerStats();
    SaveManager.load(o2, 'c2test', 'eldrin');
    eq(o2.mastery.elements.water, 200, 'old water resonance 40 becomes 200 points');
    eq(o2.mastery.elements.shadow, M.pointsFor(6), 'Eldrin is trained in dark magic: capped at 6');
    eq(o2.getSpellLevel('riptide'), 2, 'a spell the old save knew stays at its tier');
}
```

Near the top of the file, after the imports, add (skip the import if the file already has `SPELLS`):

```js
const { SPELLS } = await import('../src/data/spells.js');
const SPELLS_COOLDOWN = id => SPELLS[id].cooldown[0];
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_player_stats.mjs`
Expected: FAIL with `e.setTalents is not a function`.

- [ ] **Step 3: Implement in `PlayerStats.js`**

1. **Import:**

```js
import { addPoints, levelOf, ceilingOf, FAMILY, tierAt, unlockLevel, focusOf, focusBonus, MAX_LEVEL } from './mastery.js';
```

2. **In the constructor and in `reset()`** (next to `this.moveSlots = …`):

```js
        this.mastery = { weapons: {}, elements: {} };   // Combat C2: points, grown by use
```

   In the constructor only:

```js
        this.talents = {};                                 // set from the character (data/talents.js)
        this._masteryCallbacks = [];
```

3. **Add** after `giveStartKit`:

```js
    // ── Combat C2: mastery ───────────────────────────────────────────────────
    setTalents(t) { this.talents = t ?? {}; }
    ceilingFor(key) { return ceilingOf(this.talents, key); }
    weaponLevel(type)  { return levelOf(this.mastery.weapons[type] ?? 0); }
    elementLevel(el)   { return levelOf(this.mastery.elements[el] ?? 0); }
    focusType() { return focusOf(this.equipment, ITEMS); }
    onMasteryUp(fn)  { this._masteryCallbacks.push(fn); }
    offMasteryUp(fn) { this._masteryCallbacks = this._masteryCallbacks.filter(f => f !== fn); }
    gainWeaponPoints(type, gain) {
        const before = this.weaponLevel(type);
        this.mastery.weapons[type] = addPoints(this.mastery.weapons[type] ?? 0, gain, this.ceilingFor(type));
        const after = this.weaponLevel(type);
        if (after > before) this._masteryCallbacks.forEach(fn => fn('weapon', type, after));
        return after;
    }
    gainElementPoints(el, gain, { passive = false } = {}) {
        if (!(el in this.resonance)) return 1;
        const before = this.elementLevel(el);
        const g = this.masteries?.resonant_mind ? gain * 1.15 : gain;   // the Resonant Mind mastery
        this.mastery.elements[el] = addPoints(this.mastery.elements[el] ?? 0, g, this.ceilingFor(FAMILY(el)), { passive });
        const after = this.elementLevel(el);
        if (after > before) this._masteryCallbacks.forEach(fn => fn('element', el, after));
        this._checkSpellProgress(el);
        return after;
    }
```

4. **`giveStartKit`**: after its loop, add:

```js
        for (const id of kit?.spells ?? []) this.forceUnlockSpell(id, 1);
```

5. **`gainResonance(element, amount)`**: keep its body. Replace the `this._checkSpellProgress(element);` line with:

```js
        this.gainElementPoints(element, amount, { passive: true });   // C2: the feel for an element, capped at level 2
```

6. **Replace `_checkSpellProgress(element)`** with:

```js
    // Spells of an element unlock with its mastery level (mastery.js tierAt).
    // Never lowers a tier a spell already has.
    _checkSpellProgress(element) {
        const lv = this.elementLevel(element);
        for (const [id, spell] of Object.entries(SPELLS)) {
            if (spell.element !== element || !spell.discoverCondition) continue;
            const current = this.spells[id] ?? 0;
            const newLevel = Math.min(3, tierAt(spell, lv));
            if (newLevel > current) {
                this.spells[id] = newLevel;
                this._resonanceCallbacks.forEach(fn => fn(id, newLevel, current === 0));
            }
        }
    }
```

7. **`canUnlock`**: replace the resonance loop body `if ((this.resonance[el] ?? 0) < val) return false;` with:

```js
                if (this.elementLevel(el) < unlockLevel(val)) return false;   // C2: element mastery
```

8. **`startSpellCooldown`**: change the last line to:

```js
        const f = focusBonus(this.focusType(), this.weaponLevel(this.focusType() ?? 'staff'));
        this.spellCooldowns[id] = Math.round((spell.cooldown?.[tier] ?? 2000) * f.cooldown);
```

- [ ] **Step 4: Save, load, talents, migration** (`SaveManager.js`)

1. In the save object, beside `moveSlots`:

```js
            mastery:       JSON.parse(JSON.stringify(stats.mastery ?? { weapons: {}, elements: {} })),
```

2. In `load`, directly after the line `if (d.resonance)      stats.resonance       = …;` (so the known spells are already restored), add:

```js
            stats.setTalents?.(talentsFor(characterId));
            SaveManager.migrateCombatC2(stats, d);
```

   Import `talentsFor` from `'../data/talents.js'`.

3. Add the static method:

```js
    // Combat C2: saves from before mastery convert their resonance (5 points each,
    // under the talent ceiling). Known spells are never touched.
    static migrateCombatC2(stats, d) {
        if (!stats?.mastery) return;
        if (d?.mastery) { stats.mastery = { weapons: { ...d.mastery.weapons }, elements: { ...d.mastery.elements } }; return; }
        stats.mastery = { weapons: {}, elements: {} };
        for (const [el, res] of Object.entries(d?.resonance ?? {})) {
            if (res > 0) stats.mastery.elements[el] = pointsFromResonance(res, ceilingOf(stats.talents, FAMILY(el)));
        }
    }
```

   Import `pointsFromResonance, ceilingOf, FAMILY` from `'./mastery.js'`.

   `migrateCombatC2` only sets points; it never calls `_checkSpellProgress`, so known spells are never changed on load.

4. **`CharacterSelectScene._launch` (new game):** after `playerStats.giveStartKit(c.startKit);` add `playerStats.setTalents(talentsFor(c.id));`, and import `talentsFor`.

- [ ] **Step 5: Run the tests**

Run: `node tools/test_player_stats.mjs && npm test 2>&1 | tail -2`
Expected: pass. If `test_campaign_manager`'s stub stats lack `mastery`, the guards (`stats?.mastery`, `setTalents?.`) keep it passing; do not loosen that test.

- [ ] **Step 6: Commit**

```bash
git add src/systems/PlayerStats.js src/systems/SaveManager.js src/scenes/CharacterSelectScene.js tools/test_player_stats.mjs
git commit -m "feat(amo): mastery in the save — spells unlock by element level (rain stops at 2), talents cap every skill, old resonance converts, known spells kept"
```

---

### Task 4: Points from fighting; levels in damage, speed and spells

**Files:**
- Modify: `src/systems/CombatManager.js`, `src/scenes/GameScene.js`, `src/entities/Player.js`

**Interfaces:**
- **Consumes:**
  - `stats.gainWeaponPoints`, `stats.gainElementPoints`, `stats.weaponLevel`, `stats.elementLevel`, `stats.focusType` (Task 3);
  - `hitGain`, `levelDamageMult`, `levelCooldownMult`, `focusBonus` (Task 1).

This task changes Phaser code; it is proven headless in Task 7.

- [ ] **Step 1: Weapon points and damage** (`CombatManager.js`)

1. **Import** `{ hitGain, levelDamageMult }` from `'./mastery.js'`.
2. **In `hitTarget`**, directly after `enemy.takeDamage(dmg);` add:

```js
        // Combat C2: the weapon that struck learns from it
        stats.gainWeaponPoints?.(this.player._swingType ?? 'fists', hitGain(!enemy.active || enemy.health <= 0, enemy.level ?? 1, stats.level));
```

3. **In `_calcDamage`**, change the `typeMult` line to:

```js
        const swingType  = this.player._swingType ?? 'fists';
        const typeMult   = (WEAPON_TYPES[swingType]?.dmgMult ?? 1) * levelDamageMult(stats.weaponLevel?.(swingType) ?? 1);
```

- [ ] **Step 2: Ranged** (`GameScene._bowStrike`)

1. **Import** `{ hitGain, levelDamageMult, focusBonus }` from `'../systems/mastery.js'`.
2. In `_bowStrike`, after `const weaponDef = ITEMS[itemId];` add:

```js
        const swingType  = typeOf(weaponDef);
```

   Multiply the `base` expression by `levelDamageMult(playerStats.weaponLevel(swingType))`, beside `(opts.dmgMult ?? 1)`.
3. In `applyHit`, after `e.takeDamage(dmg);` add:

```js
            playerStats.gainWeaponPoints(swingType, hitGain(!e.active || e.health <= 0, e.level ?? 1, playerStats.level));
```

- [ ] **Step 3: Spells** (`GameScene`)

1. **`_spellDamage(id)`** becomes:

```js
    _spellDamage(id) {
        const el = SPELLS[id]?.element, focus = playerStats.focusType();
        const mult = this.spellDamageMult() * levelDamageMult(playerStats.elementLevel(el))
                   * focusBonus(focus, focus ? playerStats.weaponLevel(focus) : 1).power;   // C2: element mastery + focus
        return spellDamageAt(SPELLS[id], playerStats.getSpellLevel(id), this.player.stats.attributes.intelligence, mult);
    }
```

2. **In `_applySpellEffects`,** change `const radius = spell?.radius?.[level - 1] ?? range;` to:

```js
        const focus  = playerStats.focusType();
        const radius = Math.round((spell?.radius?.[level - 1] ?? range) * focusBonus(focus, focus ? playerStats.weaponLevel(focus) : 1).radius);   // a staff widens
```

3. **In `_hit(e, dmg)`**, directly after `e.takeDamage(Math.floor(dmg * m * aff * wx));` add:

```js
        // Combat C2: a spell's element (and the focus in hand) learn from the hit
        if (el) {
            const gain = hitGain(!e.active || e.health <= 0, e.level ?? 1, playerStats.level);
            playerStats.gainElementPoints(el, gain);
            const focus = playerStats.focusType();
            if (focus) playerStats.gainWeaponPoints(focus, gain);
        }
```

   Check first that `_hit` is used only for spell damage while `_hitElement` is set. If `_damageSingleNearest` (melee power strikes) also routes through `_hit` with a stale `_hitElement`, clear `this._hitElement = null` at the end of `_applySpellEffects` and record a ruling.

- [ ] **Step 4: Swing speed** (`Player._weaponCooldown`)

Multiply the result by the level's cooldown factor:

```js
        return Math.floor(base * swift * levelCooldownMult(this.stats.weaponLevel?.(type) ?? 1));
```

Import `levelCooldownMult` from `'../systems/mastery.js'`.

- [ ] **Step 5: Run the suite and commit**

```bash
npm test 2>&1 | tail -2
git add src/systems/CombatManager.js src/scenes/GameScene.js src/entities/Player.js
git commit -m "feat(amo): fighting teaches — weapon and spell hits earn mastery, kills more, weak enemies little; each level adds damage and speed; a staff widens and strengthens spells, a wand quickens them"
```

---

### Task 5: Talents in play, and the class picker

**Files:**
- Modify: `src/scenes/GameScene.js`, `src/scenes/OnlineCharacterScene.js`

- [ ] **Step 1: Talents at scene start** (`GameScene.create`)

Beside the other `playerStats.on…` registrations, add:

```js
        playerStats.setTalents(talentsFor(this._characterId, this._onlineCharacter?.classId));   // Combat C2
```

Import `talentsFor` from `'../data/talents.js'`.

- [ ] **Step 2: The class picker** (`OnlineCharacterScene`)

1. Import `{ CLASSES, CLASS_IDS }` from `'../data/talents.js'`.
2. At the top of `_enterWorld()`, after `if (!dat) return;`, add:

```js
        if (!dat.classId) { this._pickClass(dat); return; }   // Combat C2: asked once
```

3. Add the method:

```js
    // Combat C2: a created character picks a class once; it is saved in the slot.
    _pickClass(dat) {
        const w = this.scale.width, h = this.scale.height;
        const objs = [];
        objs.push(this.add.rectangle(0, 0, w, h, 0x000000, 0.85).setOrigin(0).setInteractive().setDepth(100));
        objs.push(this.add.text(w / 2, 60, `Choose ${dat.charName ?? 'your hero'}'s class`, { font: 'bold 24px monospace', fill: '#ffd700' }).setOrigin(0.5).setDepth(101));
        objs.push(this.add.text(w / 2, 92, 'Your class decides what you can master. You can still pick up any weapon.', { font: '14px monospace', fill: '#aaaacc' }).setOrigin(0.5).setDepth(101));
        CLASS_IDS.forEach((id, i) => {
            const c = CLASSES[id], col = i % 2, row = Math.floor(i / 2);
            const bx = w / 2 + (col ? 20 : -20 - 340), by = 130 + row * 90;
            const bg = this.add.rectangle(bx, by, 340, 78, 0x12122e).setOrigin(0).setStrokeStyle(2, 0x5533aa).setInteractive({ useHandCursor: true }).setDepth(101);
            const gifted = Object.entries(c.talents).filter(([, v]) => v === 'gifted').map(([k]) => k).join(', ');
            objs.push(bg, this.add.text(bx + 10, by + 8, c.name, { font: 'bold 18px monospace', fill: '#ffdd88' }).setDepth(102),
                this.add.text(bx + 10, by + 32, c.blurb, { font: '12px monospace', fill: '#ccccee' }).setDepth(102),
                this.add.text(bx + 10, by + 52, `Gifted: ${gifted}`, { font: '11px monospace', fill: '#88aa88' }).setDepth(102));
            bg.on('pointerdown', () => {
                dat.classId = id;
                const n = this._selectedSlot;
                const raw = JSON.parse(localStorage.getItem(`amo_char_slot_${n}`) ?? 'null');
                if (raw) { raw.classId = id; localStorage.setItem(`amo_char_slot_${n}`, JSON.stringify(raw)); }
                objs.forEach(o => o.destroy());
                this._enterWorld();
            });
        });
    }
```

4. Make sure the `onlineCharacter` passed to `GameScene` in `_enterWorld` is `dat` (or includes `classId`). Read the `scene.start('GameScene', …)` call and add `classId: dat.classId` if it builds a new object.

- [ ] **Step 3: Run the suite and commit**

```bash
npm test 2>&1 | tail -2
git add src/scenes/GameScene.js src/scenes/OnlineCharacterScene.js
git commit -m "feat(amo): talents in play; a created character picks one of eight classes the first time it enters the world"
```

---

### Task 6: Seeing it: the MASTERY panel, element levels, level-up notices

**Files:**
- Modify: `src/scenes/StatScene.js`, `src/scenes/SpellbookScene.js`, `src/scenes/SkillTreeScene.js`, `src/scenes/GameScene.js`

- [ ] **Step 1: The MASTERY panel** (`StatScene`)

Directly after the attributes block (after the `★ … point(s) to spend` `if`), add:

```js
        // ── Mastery (Combat C2) ─────────────────────────────────────
        oy += 28;
        this._section(col1x, oy, 'MASTERY  (level / your best)');
        oy += 22;
        const T = playerStats.talents ?? {};
        const rows = [
            ...Object.entries(WEAPON_TYPES).filter(([, d]) => d.available).map(([t, d]) => [d.label, playerStats.weaponLevel(t), ceilingOf(T, t), playerStats.mastery.weapons[t] ?? 0]),
            ...RESONANCE_ELEMENTS.map(el => [`${el[0].toUpperCase()}${el.slice(1)} magic`, playerStats.elementLevel(el), ceilingOf(T, FAMILY(el)), playerStats.mastery.elements[el] ?? 0]),
        ];
        for (const [label, lv, cap, pts] of rows) {
            const next = lv < cap ? (pts - pointsFor(lv)) / (pointsFor(lv + 1) - pointsFor(lv)) : 1;
            this.add.text(col1x, oy, label, { font: '12px monospace', fill: cap === 10 ? '#ddcc88' : '#8899aa' });
            this.add.text(col1x + 150, oy, `${lv} / ${cap}`, { font: '12px monospace', fill: '#aabbdd' });
            const g = this.add.graphics();
            g.fillStyle(0x1a1a2a).fillRect(col1x + 210, oy + 4, 90, 7);
            g.fillStyle(lv >= cap ? 0x667788 : 0x5588dd).fillRect(col1x + 210, oy + 4, Math.round(90 * Math.max(0, Math.min(1, next))), 7);
            oy += 16;
        }
```

Imports:
- `{ WEAPON_TYPES }` from `'../systems/weapons.js'`;
- `{ ceilingOf, FAMILY, pointsFor }` from `'../systems/mastery.js'`;
- `{ RESONANCE_ELEMENTS }` from `'../data/spells.js'`.

Gold label = Gifted (best 10). If 22 rows overflow the panel above the XP bar, use 14 px rows and 11 px font, and check it with the screenshot in Task 7.

- [ ] **Step 2: Element levels in the Spellbook** (`SpellbookScene._drawResonanceBars`)

Replace the per-element value and bar so they show the element level and the progress within it:

- the title `'RESONANCE'` becomes `'ELEMENT MASTERY'`;
- `val` becomes `playerStats.elementLevel(el)`;
- the right-hand text becomes `` `${lv} / ${cap}` ``, where `cap = ceilingOf(playerStats.talents, FAMILY(el))`;
- `pct` becomes the progress within the level (as in Step 1). Remove the `maxThreshold` loop.

Import as in Step 1.

- [ ] **Step 3: Skill-tree requirements** (`SkillTreeScene`, around line 165–175)

The requirement text for `skill.requirements.resonance` should show `Arcane lv N` with `N = unlockLevel(val)`, and `met = playerStats.elementLevel(el) >= unlockLevel(val)`. Import `unlockLevel`.

- [ ] **Step 4: Level-up notices** (`GameScene.create`)

Next to `playerStats.onSpellEvent(this._onSpellEvent);`, add:

```js
        this._onMasteryUp = (kind, key, level) => {
            const name = kind === 'weapon' ? WEAPON_TYPES[key]?.label : `${key[0].toUpperCase()}${key.slice(1)} magic`;
            this.scene.get('UIScene')?.showNotification?.(`${name} mastery ${level}${level >= playerStats.ceilingFor(kind === 'weapon' ? key : FAMILY(key)) ? ' — your best' : ''}`, 2600);
        };
        playerStats.onMasteryUp(this._onMasteryUp);
        this.events.once('shutdown', () => playerStats.offMasteryUp(this._onMasteryUp));
```

Import `WEAPON_TYPES` (weapons.js) and `FAMILY` (mastery.js) if not already imported.

- [ ] **Step 5: Run the suite and commit**

```bash
npm test 2>&1 | tail -2
git add src/scenes/StatScene.js src/scenes/SpellbookScene.js src/scenes/SkillTreeScene.js src/scenes/GameScene.js
git commit -m "feat(amo): see your mastery — a MASTERY panel (level / your best), element levels in the Spellbook, skill-tree requirements by level, a notice at each level"
```

---

### Task 7: Check it all in the running game

**Files:** no source changes, unless a check fails. A fix gets a failing test first and a ledger line.

- [ ] **Step 1: Rain (Review Focus 2).** On `east_road`, make sure Tidal Bolt and Riptide are unknown (`s.spells.tidal_bolt=0; s.spells.riptide=0; s.mastery.elements={}`), call `gs.player.stats.gainResonance('water', 2)` 300 times, and print water level, `tidal_bolt` and `riptide`.
  Expected: `2, 1, 0`.
- [ ] **Step 2: Points from fighting (Review Focus 4).**
  - Equip `longsword` + `novice_staff`, put a 1-HP enemy next to the player, and `useMove('attack')`. Print sword points and water points: sword > 0, water unchanged.
  - Then cast a known water spell at a 1-HP enemy through the game's own cast path (`gs._castSpell('tidal_bolt', e.x, e.y)` after `s.forceUnlockSpell('tidal_bolt',1)`). Print water and staff points: both > 0, and the sword's unchanged.
- [ ] **Step 3: The ceiling (Review Focus 3).** As Kael (`s.setTalents(talentsFor('kael'))`, with a second-copy import of the pure talents module), call `s.gainWeaponPoints('wand', 99999)` and print `s.weaponLevel('wand')`.
  Expected: `3`.
- [ ] **Step 4: Old save.** Save, strip `mastery` from the stored JSON, set `resonance.water = 40` and `spells.riptide = 2`, load, and print `mastery.elements.water` and `spells.riptide`.
  Expected: `200` and `2`.
- [ ] **Step 5: The class picker (Review Focus 5).**
  1. Write a fake created character with no `classId` into `localStorage.amo_char_slot_0` (layers: one body layer).
  2. Start `OnlineCharacterScene`, select slot 0, call `_enterWorld()`, and print whether the picker is on screen.
  3. Click "Brawler" (emit `pointerdown` on its rectangle), and print the slot's `classId` from localStorage. Expected: `brawler`.
  4. Call `_enterWorld()` again. The picker does not show again.

  If entering the world needs a server, stop at the saved `classId` and ledger that.
- [ ] **Step 6: Screens.** Open the character screen (`gs.scene.pause(); gs.scene.launch('StatScene')`) and the Spellbook; screenshot both and read them. The MASTERY rows fit, and gold labels mark Gifted skills.
- [ ] **Step 7: Suite.** Run `npm test 2>&1 | tail -2`. Write every RESULT into the ledger.

---

### Task 8: The manual: getting better, talent and classes

**Files:**
- Modify: `tools/gen_game_inventory.mjs`, `docs/manual/index.html`, `docs/game_inventory.md`

- [ ] **Step 1: Add to the Combat chapter.** Directly after its `### Blocking` section, insert:

```js
P('### Getting better: mastery');
P('Every weapon, and every kind of magic, has a **mastery from 1 to 10**. Everyone starts at 1. You get better at what you **use**:');
P();
P('- Each hit with a weapon teaches it a little; each **kill** teaches more. Weak enemies teach you almost nothing — fight things your size.');
P('- Each spell that hits teaches its element (fire, water…) — and your wand or staff, if you hold one.');
P('- Every level makes it better: **+8% damage** and a little faster. At 10 that is +72%.');
P('- The character screen (P) shows every mastery as *level / your best*.');
P();
P('### Talent: how far you can go');
P('Nobody is great at everything. Each hero has a talent for each weapon and each kind of magic:');
P();
table(['Talent', 'Mastery can reach'], [['Gifted', '10 — the very best'], ['Trained', '6 — solid'], ['Untrained', '3 — a usable backup']]);
P();
const TAL = await import(SRC + 'data/talents.js');
const tl = v => (v === 'gifted' ? 'Gifted' : v === 'trained' ? 'Trained' : '·');
const talentKeys = [...Object.entries(WEAPON_TYPES).filter(([, d]) => d.available).map(([t, d]) => [t, d.label]), ['elemental', 'Elemental magic'], ['light', 'Light magic (arcane)'], ['dark', 'Dark magic (shadow)']];
table(['', 'Eldrin', 'Kael', 'Anya', 'Seraphina'], talentKeys.map(([k, label]) => [label, ...['eldrin', 'kael', 'anya', 'seraphina'].map(c => tl(TAL.STORY_TALENTS[c][k]))]));
P();
P('**Example — Eldrin with a sword.** He can fight with a sword, and he gets better at it — but only up to 3. His staff can reach 10.');
P();
P('### Classes (characters you create)');
P('A character you create picks a **class** the first time it enters the world. The class sets its talents — you can still pick up any weapon.');
P();
table(['Class', 'What it is', 'Gifted (10)', 'Trained (6)'], TAL.CLASS_IDS.map(id => {
    const c = TAL.CLASSES[id], by = v => Object.entries(c.talents).filter(([, x]) => x === v).map(([k]) => k).join(', ');
    return [c.name, c.blurb, by('gifted'), by('trained')];
}));
P();
P('### Spells and the elements');
P('Your spells belong to you, not to your stick: you can cast them with a wand, a staff, a sword in hand — or nothing.');
P();
P('- A **wand** makes spells quicker (shorter waits) but a little weaker.');
P('- A **staff** makes spells stronger and wider, but slower to come back.');
P('- New spells come with your **element mastery**: the higher your water mastery, the more water spells you know, and the stronger their tiers (Novice → Apprentice → Adept).');
P('- Being around an element — rain, a campfire, fighting its creatures — gives you a **feel** for it, but only up to mastery 2: enough for the easiest spell or two. After that, you learn by casting in fights, or faster from scrolls, tomes and teachers.');
P();
```

   This needs `await` at module level, which the generator already uses (it is an `.mjs` with top-level `await`).

- [ ] **Step 2: Generate and check.**

Run: `node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html && grep -c "How far you can go\|how far you can go" ../../docs/manual/index.html`
Expected: 1 or more. Read the `## Combat` section of `docs/game_inventory.md`: the talent table has 16 rows (13 weapons and 3 kinds of magic), and the class table 8.

- [ ] **Step 3: Suite and commit**

```bash
npm test 2>&1 | tail -2
git add tools/gen_game_inventory.mjs ../../docs/manual/index.html ../../docs/game_inventory.md
git commit -m "docs(amo): manual — mastery, talent, the heroes' and classes' talents, spells and the elements"
```

The push happens after the final review and its fixes (executing-plans).
