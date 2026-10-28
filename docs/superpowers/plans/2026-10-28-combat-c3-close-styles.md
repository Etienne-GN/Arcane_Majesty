# Combat C3: Close-Combat Styles and Learning — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Nine close-combat weapons each get a first fighting style with three skills, unlocked at weapon mastery 2, 5 and 8.
- A style is learned by filling a bar to 100%: practice (kills), a manual (+40%, doubles practice) or a teacher (+35% a lesson, one a day, 100/200/300 gold).
- Style skills go on Q/R/F/T next to spells; a skill whose weapon is not in hand is greyed out.
- Thaloria gets its first teachers (the barracks sergeant teaches Guard, the smith teaches Crusher) and a manual shop (the Archivist's Guild).
- A new STYLES screen and the manual's "Styles and learning" chapter explain all of it.

**Architecture:**
- **`src/data/styles.js` (data):** the nine styles and their 27 skills.
- **`src/systems/styles.js` (pure rules):** learning-bar maths, manuals and lessons, which skills are usable, the hit shapes skills use (front, around, line), and skill damage modifiers.
- **`PlayerStats`** stores `styles` (progress, manuals read, lessons, practised style), runs skill cooldowns, and lets Q/R/F/T hold skills. One helper, `learnFromHit(type, killed, enemyLevel)`, gives both weapon points and style practice.
- **`src/systems/StyleSkills.js` (Phaser glue):** performs a skill: strikes, spins, dashes, leaps, buffs.
- **`src/scenes/StylesScene.js`:** the STYLES screen (key Y, tray STYLE).
- **Teachers** are townsfolk whose `npc` has a `teaches` field. A lesson is a dialogue choice.

**Tech Stack:** Phaser 3.90, ES modules, Node `assert` tests, headless Chrome via `../tool_suite/lpc_forge/tools/console.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-26-combat-weapons-design.md` (section 4, section 6, stage C3).

## Global Constraints

- **Saves:** every new save field gets a default in `PlayerStats` (both the constructor and `reset()`). Old saves load without errors. Nothing a save knows is taken away.
- **Tests:** every pure module gets a `tools/test_*.mjs` chained into `npm test`. Every system is checked headless in the running game before it is called done. `npm test` stays green at every step.
- **The manual** gets the C3 part of its Combat chapter (spec §6): every style and its skills, and learning by practice, manual and teacher. It is written so a child can follow it.
- **Workflow:** commits go straight to `main`. Working directory: `apps/amo`.
- **Headless checks:** `console.mjs URL ms --eval "step;;step"` runs steps 800 ms apart; a bare `0` is a delay. Print with `console.log('RESULT', …)`. `gs = __game.scene.getScene('GameScene')`; stats are `gs.player.stats`. Use `?testmap=east_road`.
- **Lore:** teachers are unnamed townsfolk roles. Styles and skills are mechanics, not lore. No DB writes.

## Rulings against the spec (made while planning)

- **Teachers cost gold, not glint.** Spec §4 writes "100, 200, 300 gl", but decision 6 (the user's words) says a teacher "costs gold". The plan uses gold.
- **Warder and Hex manuals wait for C4.** They are staff and wand styles, built in C4. In C3 the Archivist's Guild sells the seven close-combat manuals no Thaloria teacher teaches; C4 adds Warder and Hex to the same shelf.
- **"Found in chests" becomes "dropped by elites".** Chest contents are generated map data (`tools/maps/interiors/*.py`). Elites already drop recipe scrolls the same way; they now also have a 10% chance at a style manual the player neither knows nor carries.
- **Weapon skills cost no mana, only a cooldown.** Simple for a child to read; spells keep their mana.
- **One style per weapon in C3,** so "pick which style to practise" defaults to that style. The data and save already keep a per-weapon choice for C6.

## Review Focus

1. **A skill on Q/R/F/T with the wrong weapon in hand** — greyed on the ring; pressing it says which weapon it needs and does nothing else.
2. **A style learned while mastery is still 1** — "learned" is announced, and the skill list shows each skill's mastery requirement, so nothing looks broken.
3. **Teacher outside working hours, twice in a day, without enough gold, or after the style is learned** — each gets a clear line, no gold taken.
4. **An old save** (no `styles` field) loads with empty progress, and Q/R/F/T spells stay where they were.
5. **A save whose slot holds a skill id** loads with that skill still on the slot.

---

## The styles (data for Task 1)

Unlock is weapon mastery. `cd` is the cooldown in ms. `mult` multiplies the weapon's normal hit.

| Weapon | Style | Skill (unlock) | Kind | What it does |
|---|---|---|---|---|
| sword | **Guard** | Parry (2) | buff `parrying` 800 ms, cd 4000 | The next hit from the front does nothing and dazes the attacker 1.2 s. |
| | | Riposte (5) | strike front, mult 2.0, cd 5000 | ×1.5 more within 2 s of a parry. |
| | | Steady Advance (8) | buff `steady` 5 s, cd 20000 | Take 40% less damage. |
| greatsword | **Reaver** | Whirlwind (2) | spin r 56, mult 1.4, cd 5000 | Hits everyone around you. |
| | | Cleave (5) | strike front r 52, mult 2.0, max 4, cd 6000 | A huge swing. |
| | | Rampage (8) | buff `rampage` 6 s, cd 25000 | +40% damage, swings 20% faster. |
| dagger | **Shadow** | Vanish (2) | buff `vanished` 3 s, cd 15000 | Enemies lose sight of you; your next hit does ×2 and ends it. |
| | | Backstab (5) | strike front, mult 1.5, cd 6000 | ×3 from behind the target. |
| | | Shadowstep (8) | step behind the nearest enemy within 140 px, cd 10000 | Then face it. |
| spear | **Lancer** | Piercing Lunge (2) | dash 48 px, line 96 px, mult 1.6, cd 5000 | Hits everything along the line. |
| | | Leaping Strike (5) | leap 90 px, then spin r 44, mult 1.5, cd 8000 | Lands in a crowd. |
| | | Run Through (8) | line 120 px, mult 2.5, cd 9000 | Pierces a whole row. |
| bo | **Spinning Staff** | Flurry of Blows (2) | 4 strikes front, mult 0.6, 90 ms apart, cd 5000 | Fast blows. |
| | | Deflect Arrows (5) | buff `deflecting` 3 s, cd 15000 | Hits from more than 60 px away do nothing. |
| | | Windmill (8) | spin r 60, mult 1.3, knock 320, cd 9000 | Throws enemies back. |
| mace | **Crusher** | Bone Breaker (2) | strike front, mult 1.8, status `crippled`, cd 6000 | Slows the target 4 s. |
| | | Stunning Blow (5) | strike front, mult 1.4, status `dazed`, cd 9000 | Stuns 1.5 s. |
| | | Shatter Armour (8) | strike front, mult 1.6, status `sundered`, cd 12000 | The target takes 30% more damage for 8 s. |
| axe | **Berserker** | Rage (2) | buff `raging` 8 s, cd 25000 | +25% damage, take 10% more. |
| | | Bleeding Chop (5) | strike front, mult 1.5, status `bleeding`, cd 6000 | Bleeds 6 s. |
| | | Frenzy (8) | buff `frenzy` 5 s, cd 25000 | Swings 40% faster. |
| shield | **Bulwark** | Perfect Block (2) | buff `perfect_block` 600 ms, cd 5000 | Every hit does nothing and dazes the attacker 1 s. |
| | | Taunt (5) | buff `taunting` 4 s + pull within 160 px, cd 15000 | Enemies come at you and stop casting; take 30% less damage. |
| | | Shield Wall (8) | buff `shield_wall` 6 s, cd 25000 | Hits from the front do 10%; you walk slower. |
| fists | **Brawler** | Haymaker (2) | strike front, mult 2.2, knock 300, cd 5000 | A big punch. |
| | | Grab & Throw (5) | strike front, mult 1.5, knock 420, status `dazed` 1 s, cd 8000 | Throws the target away. |
| | | Headbutt (8) | strike front, mult 1.8, status `dazed` 2 s, cd 10000 | Stuns longer. |

New statuses (Task 3): enemy `dazed` (stunned, 1500 ms), `crippled` (speed 0.5, 4000), `sundered` (damage taken ×1.3, 8000), `bleeding` (3 every 1000 ms, 6000); player buffs `parrying`, `steady` (damage taken ×0.6), `rampage` (statsMult 1.4, swingMult 0.8), `vanished`, `raging` (statsMult 1.25, damage taken ×1.1), `frenzy` (swingMult 0.6), `deflecting`, `perfect_block`, `taunting` (damage taken ×0.7), `shield_wall` (speed 0.6).

---

### Task 1: Styles data and pure rules

**Files:**
- Create: `src/data/styles.js`, `src/systems/styles.js`, `tools/test_styles.mjs`
- Modify: `package.json` (chain `node tools/test_styles.mjs` after `test_mastery`)

**Interfaces:**
- Produces (`data/styles.js`): `STYLES` (id → `{ id, name, weapon, blurb, skills: [id, id, id] }`), `STYLE_SKILLS` (id → `{ id, name, style, weapon, unlock, cd, kind, desc, …params }`), `STYLE_IDS`, `stylesFor(weaponType)`.
- Produces (`systems/styles.js`): `STYLE_UNLOCKS = [2, 5, 8]`, `MANUAL_BONUS = 40`, `LESSON_BONUS = 35`, `lessonPrice(n)`, `emptyStyles()`, `addProgress(st, styleId, pct)`, `practiceGain(st, styleId, killGain)`, `readManual(st, styleId)`, `lessonCheck(st, styleId, day, gold)`, `takeLesson(st, styleId, day)`, `knowsStyle(st, styleId)`, `practising(st, weapon)`, `skillState(st, skillId, weaponLevel, inHand)`, `handTypes(equipment, items)`, `targetsIn(shape, origin, facing, list)`, `skillMult(skill, ctx)`.

- [ ] **Step 1: Write the failing test** `tools/test_styles.mjs`:

```js
// Combat C3: styles, learning bars, manuals, lessons, skill shapes.
import assert from 'node:assert';
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const D = await import('../src/data/styles.js');
const S = await import('../src/systems/styles.js');
const { SPELLS } = await import('../src/data/spells.js');
const { WEAPON_TYPES } = await import('../src/systems/weapons.js');
const { ITEMS } = await import('../src/data/items.js');

// ---- data
eq(D.STYLE_IDS, ['guard', 'reaver', 'shadow', 'lancer', 'spinning_staff', 'crusher', 'berserker', 'bulwark', 'brawler'], 'nine close-combat styles');
eq(Object.keys(D.STYLE_SKILLS).length, 27, 'three skills each');
for (const st of Object.values(D.STYLES)) {
    ok(WEAPON_TYPES[st.weapon], `${st.id} names a real weapon`);
    eq(st.skills.map(id => D.STYLE_SKILLS[id].unlock), [2, 5, 8], `${st.id}: skills at mastery 2, 5, 8`);
    ok(st.skills.every(id => D.STYLE_SKILLS[id].style === st.id && D.STYLE_SKILLS[id].weapon === st.weapon), `${st.id}: its skills point back`);
}
ok(Object.keys(D.STYLE_SKILLS).every(id => !SPELLS[id]), 'no skill id is a spell id (they share Q/R/F/T)');
ok(Object.values(D.STYLE_SKILLS).every(k => k.cd > 0 && k.desc && k.name), 'every skill has a name, a line and a cooldown');
eq(D.stylesFor('sword').map(s => s.id), ['guard'], 'the sword\'s styles');

// ---- learning bar
const st = S.emptyStyles();
eq(S.knowsStyle(st, 'guard'), false, 'nothing known at first');
eq(S.practising(st, 'sword'), 'guard', 'practise the first style by default');
S.practiceGain(st, 'guard', 6);
eq(st.progress.guard, 1, 'a kill on an equal enemy: 1%');
S.practiceGain(st, 'guard', 1.2);
eq(Math.round(st.progress.guard * 10) / 10, 1.2, 'a weak enemy teaches a fifth');
eq(S.readManual(st, 'guard'), true, 'reading a manual');
eq(Math.round(st.progress.guard * 10) / 10, 41.2, '… adds 40%');
eq(S.readManual(st, 'guard'), false, 'a manual is read once');
S.practiceGain(st, 'guard', 6);
eq(Math.round(st.progress.guard * 10) / 10, 43.2, 'after the manual, practice counts double');
S.addProgress(st, 'guard', 999);
eq(st.progress.guard, 100, 'the bar stops at 100');
ok(S.knowsStyle(st, 'guard'), 'at 100% the style is known');
eq(S.readManual(st, 'guard'), false, 'no manual for a known style');

// ---- lessons
const L = S.emptyStyles();
eq([S.lessonPrice(0), S.lessonPrice(1), S.lessonPrice(2)], [100, 200, 300], 'lessons cost more as they go');
eq(S.lessonCheck(L, 'crusher', 3, 50), { ok: false, reason: 'gold', price: 100 }, 'not enough gold');
eq(S.lessonCheck(L, 'crusher', 3, 500), { ok: true, price: 100 }, 'a lesson is possible');
eq(S.takeLesson(L, 'crusher', 3), 100, 'take it: pay 100');
eq(L.progress.crusher, 35, '… +35%');
eq(S.lessonCheck(L, 'crusher', 3, 500).reason, 'today', 'one lesson a day');
eq(S.lessonCheck(L, 'crusher', 4, 500), { ok: true, price: 200 }, 'the next day: 200');
S.addProgress(L, 'crusher', 100);
eq(S.lessonCheck(L, 'crusher', 9, 9999).reason, 'known', 'nothing left to teach');

// ---- skills
eq(S.skillState(st, 'parry', 1, true), 'mastery', 'known style, mastery too low');
eq(S.skillState(st, 'parry', 2, true), 'ready', 'mastery 2: Parry is ready');
eq(S.skillState(st, 'parry', 2, false), 'weapon', 'the sword is not in hand');
eq(S.skillState(st, 'riposte', 4, true), 'mastery', 'Riposte waits for 5');
eq(S.skillState(S.emptyStyles(), 'parry', 9, true), 'style', 'style not learned yet');
const eqp = (weapon, offHand = null) => ({ weapon, offHand });
eq([...S.handTypes(eqp('longsword', 'wooden_shield'), ITEMS)].sort(), ['shield', 'sword'], 'what is in hand');
ok(S.handTypes(eqp(null), ITEMS).has('fists'), 'empty hands are fists');

// ---- shapes (facing right from 0,0)
const foes = [{ id: 'a', x: 30, y: 0 }, { id: 'b', x: -30, y: 0 }, { id: 'c', x: 90, y: 4 }, { id: 'd', x: 50, y: 40 }];
const ids = l => l.map(e => e.id).sort();
eq(ids(S.targetsIn({ kind: 'front', reach: 30, radius: 26 }, { x: 0, y: 0 }, 'right', foes)), ['a'], 'front: only what is ahead');
eq(ids(S.targetsIn({ kind: 'around', radius: 56 }, { x: 0, y: 0 }, 'right', foes)), ['a', 'b'], 'around: everyone close');
eq(ids(S.targetsIn({ kind: 'line', length: 96, width: 20 }, { x: 0, y: 0 }, 'right', foes)), ['a', 'c'], 'line: the row ahead');
eq(S.targetsIn({ kind: 'front', reach: 30, radius: 26, max: 1 }, { x: 0, y: 0 }, 'right', [...foes, { id: 'e', x: 32, y: 2 }]).length, 1, 'max targets');

// ---- damage modifiers
eq(S.skillMult(D.STYLE_SKILLS.backstab, { behind: true }), 4.5, 'Backstab from behind: 1.5 x 3');
eq(S.skillMult(D.STYLE_SKILLS.backstab, { behind: false }), 1.5, '… from the front: 1.5');
eq(S.skillMult(D.STYLE_SKILLS.riposte, { parried: true }), 3, 'Riposte after a parry: 2 x 1.5');
eq(S.skillMult(D.STYLE_SKILLS.haymaker, { vanished: true }), 4.4, 'any hit out of Vanish: x2');

console.log(`test_styles: ${n} checks passed`);
```

- [ ] **Step 2: Run it** — `node tools/test_styles.mjs`. Expected: FAIL, `Cannot find module '../src/data/styles.js'`.

- [ ] **Step 3: Write `src/data/styles.js`** with the table above. Each skill: `{ id, name, style, weapon, unlock, cd, kind, desc, ...params }` where `kind` is `'strike' | 'spin' | 'line' | 'dash' | 'leap' | 'flurry' | 'buff' | 'shadowstep' | 'taunt'`, and params are `mult`, `radius`, `reach`, `length`, `max`, `knock`, `status`, `statusMs`, `buff`, `buffMs`, `behindMult`, `parryMult`, `hits`, `gap`, `dist`. Skill ids: `parry, riposte, steady_advance, whirlwind, cleave, rampage, vanish, backstab, shadowstep, piercing_lunge, leaping_strike, run_through, flurry_of_blows, deflect_arrows, windmill, bone_breaker, stunning_blow, shatter_armour, rage, bleeding_chop, frenzy, perfect_block, taunt, shield_wall, haymaker, grab_and_throw, headbutt`. Style blurbs are one short sentence each.

- [ ] **Step 4: Write `src/systems/styles.js`:**

```js
// Combat C3 (spec §4): learning a style — practice < manual < teacher — and what
// its skills need. Pure — tools/test_styles.mjs.
import { STYLES, STYLE_SKILLS, stylesFor } from '../data/styles.js';
import { typeOf } from './weapons.js';

export const STYLE_UNLOCKS = [2, 5, 8];
export const MANUAL_BONUS = 40, LESSON_BONUS = 35;
export const lessonPrice = n => 100 * (n + 1);

export const emptyStyles = () => ({ progress: {}, manuals: {}, lessons: {}, lessonDay: {}, practising: {} });
export const knowsStyle = (st, id) => (st.progress[id] ?? 0) >= 100;
export const practising = (st, weapon) => st.practising[weapon] ?? stylesFor(weapon)[0]?.id ?? null;

export function addProgress(st, id, pct) {
    const before = st.progress[id] ?? 0;
    st.progress[id] = Math.min(100, before + pct);
    return before < 100 && st.progress[id] >= 100;   // true: just learned
}
// A kill teaches 1% at an even match (killGain = mastery.hitGain(true, …), 6 at par); a read manual doubles it.
export const practiceGain = (st, id, killGain) => addProgress(st, id, (killGain / 6) * (st.manuals[id] ? 2 : 1));

export function readManual(st, id) {
    if (!STYLES[id] || st.manuals[id] || knowsStyle(st, id)) return false;
    st.manuals[id] = true;
    addProgress(st, id, MANUAL_BONUS);
    return true;
}

export function lessonCheck(st, id, day, gold) {
    if (knowsStyle(st, id)) return { ok: false, reason: 'known' };
    if (st.lessonDay[id] === day) return { ok: false, reason: 'today' };
    const price = lessonPrice(st.lessons[id] ?? 0);
    return gold < price ? { ok: false, reason: 'gold', price } : { ok: true, price };
}
export function takeLesson(st, id, day) {
    const price = lessonPrice(st.lessons[id] ?? 0);
    st.lessons[id] = (st.lessons[id] ?? 0) + 1;
    st.lessonDay[id] = day;
    addProgress(st, id, LESSON_BONUS);
    return price;
}

// 'style' (not learned) · 'mastery' (weapon level too low) · 'weapon' (not in hand) · 'ready'
export function skillState(st, skillId, weaponLevel, inHand) {
    const k = STYLE_SKILLS[skillId];
    if (!k || !knowsStyle(st, k.style)) return 'style';
    if (weaponLevel < k.unlock) return 'mastery';
    return inHand ? 'ready' : 'weapon';
}

// Weapon types in either hand; an empty hand is a fist.
export function handTypes(equipment, items) {
    return new Set([typeOf(items[equipment.weapon]), typeOf(items[equipment.offHand])]);
}

const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function targetsIn(shape, o, facing, list) {
    const [fx, fy] = DIR[facing] ?? [0, 1];
    const hit = list.filter(e => {
        const dx = e.x - o.x, dy = e.y - o.y;
        if (shape.kind === 'around') return Math.hypot(dx, dy) <= shape.radius;
        if (shape.kind === 'line') {
            const along = dx * fx + dy * fy, side = Math.abs(dx * fy - dy * fx);
            return along >= 0 && along <= shape.length && side <= (shape.width ?? 20);
        }
        return Math.hypot(e.x - (o.x + fx * shape.reach), e.y - (o.y + fy * shape.reach)) <= shape.radius;   // front
    });
    hit.sort((a, b) => Math.hypot(a.x - o.x, a.y - o.y) - Math.hypot(b.x - o.x, b.y - o.y));
    return shape.max ? hit.slice(0, shape.max) : hit;
}

export function skillMult(k, { behind = false, parried = false, vanished = false } = {}) {
    let m = k.mult ?? 1;
    if (behind && k.behindMult) m *= k.behindMult;
    if (parried && k.parryMult) m *= k.parryMult;
    if (vanished) m *= 2;
    return Math.round(m * 100) / 100;
}
```

The `handTypes` test uses `longsword` and `wooden_shield`; check `src/data/items.js` for the real ids of a one-handed sword and a shield from C1 and use those.

- [ ] **Step 5: Run it** — `node tools/test_styles.mjs`. Expected: `test_styles: N checks passed`. Chain it in `package.json` after `test_mastery`, run `npm test`, expected green.

- [ ] **Step 6: Commit** — `feat(amo): C3 styles — nine close-combat styles and their 27 skills; the learning bar, manuals, lessons and skill shapes (pure)`.

### Task 2: PlayerStats, saves, manuals as items, the Guild shelf

**Files:**
- Modify: `src/systems/PlayerStats.js`, `src/systems/SaveManager.js`, `src/data/items.js`, `src/systems/hotbar.js`, `src/systems/CombatManager.js`, `src/scenes/GameScene.js` (`_bowStrike` only)
- Test: `tools/test_player_stats.mjs`

**Interfaces:**
- Consumes: Task 1's rules.
- Produces on `PlayerStats`: `styles` (from `emptyStyles()`), `skillCooldowns` (runtime, never saved), `learnFromHit(type, killed, enemyLevel)`, `readStyleManual(id)`, `knowsStyle(id)`, `styleSkillState(skillId)`, `skillReady(skillId)`, `startSkillCooldown(skillId)`, `tickSkillCooldowns(delta)`, `onStyleEvent(fn)` / `offStyleEvent(fn)` with `fn(styleId)` on learning; `assignSkillSlot` accepts a skill id whose state is not `'style'`.
- Produces in `items.js`: `manual_<styleId>` items (`manualOf: styleId`, `onUse: stats => stats.readStyleManual(id)`), `MANUAL_PRICE = 150`, `CATALOGS.guild` (the seven manuals not taught in Thaloria: reaver, shadow, lancer, spinning_staff, berserker, bulwark, brawler), `rollEliteManual(rng, styles, carriedIds)` (10%).

- [ ] **Step 1: Failing tests** appended to `tools/test_player_stats.mjs` (before the final log):

```js
// ---- Combat C3: styles
{
    const { STYLE_SKILLS } = await import('../src/data/styles.js');
    const s = new PlayerStats();
    s.setTalents({ sword: 'gifted' });
    s.learnFromHit('sword', true, s.level);
    eq(s.styles.progress.guard, 1, 'a sword kill practises Guard');
    ok(s.mastery.weapons.sword > 0, '… and still teaches the sword');
    s.learnFromHit('sword', false, s.level);
    eq(s.styles.progress.guard, 1, 'a hit that does not kill teaches no style');
    let learned = null; s.onStyleEvent(id => { learned = id; });
    s.addItem('manual_guard');
    ok(ITEMS.manual_guard.onUse(s), 'reading the Guard manual');
    s.styles.progress.guard = 99.5; s.learnFromHit('sword', true, s.level);
    eq(learned, 'guard', 'learning a style is announced');
    eq(s.styleSkillState('parry'), 'mastery', 'sword mastery 1: Parry waits');
    s.mastery.weapons.sword = 40;
    s.equipment.weapon = 'REPLACE_WITH_SWORD_ID';
    eq(s.styleSkillState('parry'), 'ready', 'sword mastery 2 with a sword in hand: ready');
    ok(s.assignSkillSlot(0, 'parry'), 'Parry goes on Q');
    ok(!s.assignSkillSlot(1, 'riposte'), 'Riposte (mastery 5) cannot be slotted yet… ')
    s.equipment.weapon = null;
    eq(s.styleSkillState('parry'), 'weapon', 'no sword in hand: greyed');
    s.startSkillCooldown('parry');
    ok(!s.skillReady('parry'), 'cooling down');
    s.tickSkillCooldowns(STYLE_SKILLS.parry.cd);
    ok(s.skillCooldowns.parry === 0, 'cooled');
    // save round trip
    SaveManager.save(s, 'c3test', 'eldrin');
    const o = new PlayerStats();
    SaveManager.load(o, 'c3test', 'eldrin');
    eq(o.styles.progress.guard, 100, 'style progress is saved');
    eq(o.skillSlots[0], 'parry', 'a skill on a slot is saved');
    // old save: no styles field
    const raw = JSON.parse(localStorage.getItem('amo_save_c3test_eldrin'));
    delete raw.styles; localStorage.setItem('amo_save_c3test_eldrin', JSON.stringify(raw));
    const o2 = new PlayerStats();
    SaveManager.load(o2, 'c3test', 'eldrin');
    eq(o2.styles.progress, {}, 'an old save starts with no styles');
    const { canHotbar } = await import('../src/systems/hotbar.js');
    ok(!canHotbar('manual_guard'), 'manuals are read from the Inventory, not the hotbar');
}
```

Replace `REPLACE_WITH_SWORD_ID` with the one-handed sword item id used in Task 1.

- [ ] **Step 2: Run** `node tools/test_player_stats.mjs`. Expected: FAIL on `s.learnFromHit is not a function`.

- [ ] **Step 3: Implement.**
  - `PlayerStats`: `this.styles = emptyStyles()`, `this.skillCooldowns = {}`, `this._styleCallbacks = []` in the constructor; `styles` and `skillCooldowns` again in `reset()`.
  - `learnFromHit(type, killed, enemyLevel)`: `const g = hitGain(killed, enemyLevel, this.level); this.gainWeaponPoints(type, g); if (killed) { const id = practising(this.styles, type); if (id && practiceGain(this.styles, id, g)) this._styleCallbacks.forEach(fn => fn(id)); }`.
  - `readStyleManual(id)`: `readManual`, then announce if it reached 100; returns the boolean.
  - `styleSkillState(skillId)`: `skillState(this.styles, skillId, this.weaponLevel(k.weapon), handTypes(this.equipment, ITEMS).has(k.weapon))`.
  - `skillReady(id)`: state `'ready'` and no cooldown left.
  - `assignSkillSlot`: accept `STYLE_SKILLS[id]` when `styleSkillState(id)` is `'ready'` or `'weapon'`; spells as before.
  - `CombatManager.hitTarget` and `GameScene._bowStrike`: replace the `gainWeaponPoints(…hitGain(…))` call with `learnFromHit(type, killed, enemy.level ?? 1)`.
  - `SaveManager`: save `styles`; load `if (d.styles) stats.styles = { ...emptyStyles(), ...d.styles }`.
  - `items.js`: generate manual items from `STYLES` like `scrollItems` (name `Manual: Guard`, description `Teaches the Guard style of the one-handed sword (+40%), and practice counts double. Read it from the Inventory.`, icon `itm_book`, `buyPrice: MANUAL_PRICE`, `sellPrice: 40`, `rarity: 'rare'`); add `CATALOGS.guild`; export `rollEliteManual`.
  - `hotbar.js` `canHotbar`: also false when `def.manualOf`.

- [ ] **Step 4: Run** `node tools/test_player_stats.mjs` then `npm test`. Expected: both green.

- [ ] **Step 5: Commit** — `feat(amo): C3 learning — kills practise a style, manuals (Inventory) add 40% and double practice; skills on Q/R/F/T; styles saved`.

### Task 3: Skills in play

**Files:**
- Create: `src/systems/StyleSkills.js`
- Modify: `src/data/statuses.js`, `src/systems/StatusManager.js`, `src/entities/Player.js`, `src/entities/Enemy.js`, `src/scenes/GameScene.js`, `tools/test_statuses.mjs`

**Interfaces:**
- Consumes: `STYLE_SKILLS`, `targetsIn`, `skillMult`, `isBehind` (weapons.js), `stats.skillReady/startSkillCooldown/styleSkillState/learnFromHit`, `CombatManager._calcDamage`, `_spawnNumber`, `_spawnAttackArc`, `GameScene._hopBlockedAt`, `_liveEnemies`.
- Produces: `performSkill(scene, skillId)` → `true` if it ran; `GameScene._useStyleSkill(id)` (notice when refused); `_tryActivateSlot` routes skill ids to it.

- [ ] **Step 1: Failing test** in `tools/test_statuses.mjs`:

```js
// ---- Combat C3: style statuses
{
    const { STATUS_DEFS } = await import('../src/data/statuses.js');
    const { statusManager: sm } = await import('../src/systems/StatusManager.js');
    for (const id of ['dazed', 'crippled', 'sundered', 'bleeding', 'parrying', 'steady', 'rampage', 'vanished', 'raging', 'frenzy', 'deflecting', 'perfect_block', 'taunting', 'shield_wall'])
        ok(STATUS_DEFS[id], `status ${id} exists`);
    const e = {}; sm.apply(e, 'dazed');
    ok(sm.isStunned(e), 'dazed stuns');
    const p = {}; sm.apply(p, 'frenzy'); sm.apply(p, 'rampage');
    eq(Math.round(sm.swingMult(p) * 100) / 100, 0.48, 'frenzy and rampage speed swings up together');
    const q = {}; sm.apply(q, 'sundered');
    eq(sm.damageTakenMult(q), 1.3, 'sundered: +30% damage taken');
}
```

(Use this file's own `ok`/`eq` helpers; add them if it has none.)

- [ ] **Step 2: Run** `node tools/test_statuses.mjs`. Expected: FAIL, `status dazed exists`.

- [ ] **Step 3: Statuses.** Add the 14 defs (values in "The styles" above; player buffs `buff: true`, none `magical`, so dispels don't strip a sword stance). Add `swingMult` to `rampage` (0.8) and `frenzy` (0.6). `StatusManager.swingMult(entity)` multiplies every `swingMult`. Add `'dazed'` to `isStunned`. Add the new ids to `STATUS_TINT_PRIORITY`.

- [ ] **Step 4: Run** `node tools/test_statuses.mjs`. Expected: PASS.

- [ ] **Step 5: Player and Enemy hooks.**
  - `Player._weaponCooldown`: × `statusManager.swingMult(this)`.
  - `Player.takeDamage(amount, source)`, before the shield line:
    - `perfect_block` with a source: no damage, `dazed` 1000 ms on the source, "Blocked!" number.
    - `parrying` with a frontal source: no damage, remove `parrying`, `dazed` 1200 ms on the source, `this._parriedAt = scene.time.now`, "Parry!" number.
    - `deflecting` with a source more than 60 px away: no damage.
    - `shield_wall` with a frontal source: `amount × 0.1`.
  - `Enemy.update` (non-passive, non-stationary branch): when the player has `vanished`, treat the player as unseen (`dist = Infinity` for the state choice).
  - Hitting out of Vanish: in `performSkill` and in `CombatManager.hitTarget`, if the player has `vanished`, damage ×2 and remove `vanished`.

- [ ] **Step 6: `src/systems/StyleSkills.js`.** `performSkill(scene, id)`:
  - Checks `stats.skillReady(id)`; returns false otherwise.
  - Sets `player._swingItem` to the hand holding `k.weapon` (main first; `null` for fists) and `player._swingType = k.weapon`; plays `${animPrefix}_attack_${facing}`; `_spawnAttackArc` with the weapon's arc (`isPower` true for strikes with `mult ≥ 2`).
  - `strike`/`spin`/`line`: `targetsIn` over `scene._liveEnemies()`; for each target: `dmg = combat._calcDamage(false).dmg × skillMult(k, { behind: isBehind(e.facing, e, player), parried: now − player._parriedAt < 2000, vanished })`, `e.takeDamage(dmg)`, knock-back `k.knock ?? 130`, `k.status` applied with `k.statusMs`, `stats.learnFromHit(k.weapon, killed, e.level)`, damage number (orange).
  - `dash` (Piercing Lunge): move the player `k.dist` px over 150 ms with velocity, then a `line` strike from the new spot.
  - `leap` (Leaping Strike): 300 ms with hop iframes (`_hopIframeMs = 300`), land `k.dist` px ahead (stop short of a wall: test with `scene._hopBlockedAt`), then a `spin`.
  - `flurry`: `k.hits` front strikes `k.gap` ms apart.
  - `buff`: `statusManager.apply(player, k.buff, { duration: k.buffMs })`.
  - `taunt`: buff `taunting`; every non-passive enemy within 160 px: `state = 'chase'`, `interruptCast?.()`.
  - `shadowstep`: nearest enemy within 140 px; spot = enemy − its facing × 24; refuse (no cooldown, notice "No room behind it") if `_hopBlockedAt` says `'wall'`; else `player.body.reset(x, y)` and face the enemy.
  - Then `stats.startSkillCooldown(id)`; `soundManager.attack()`.
- `GameScene._useStyleSkill(id)`: if `styleSkillState(id)` is `'weapon'`: notice `Needs a ${WEAPON_TYPES[k.weapon].label} in hand`; `'mastery'`: `Needs ${label} mastery ${k.unlock}`; cooldown: nothing. Else `performSkill`.
- `GameScene._tryActivateSlot(i)`: `if (STYLE_SKILLS[id]) { this._useStyleSkill(id); return; }` before the spell path.
- `GameScene.update`: `playerStats.tickSkillCooldowns(delta)` beside the spell cooldown tick.
- `GameScene.create`: `onStyleEvent` → notice `You learned the ${name} style!` (removed on shutdown, like `_onMasteryUp`).

- [ ] **Step 7: Headless check** (record each in the ledger). With `gs.player.stats.styles.progress` set to 100 for all nine styles and every weapon mastery 1800 points, equip each weapon in turn and, against a 200-HP enemy placed in front (and behind for Backstab):
  - each of the 27 skills runs, starts its cooldown, and the expected effect shows (damage numbers, `dazed`/`crippled`/`sundered`/`bleeding` on the enemy, the buff on the player);
  - Backstab from behind does about three times Backstab from the front;
  - Parry then an enemy hit: no HP lost, the enemy is `dazed`;
  - Vanish: a chasing enemy goes back to patrol;
  - a sword skill with a mace in hand: notice, no cooldown.
  Then `npm test`. Expected: green.

- [ ] **Step 8: Commit** — `feat(amo): C3 skills in play — 27 close-combat skills on Q/R/F/T (strikes, spins, lunges, leaps, stances, Vanish, Shadowstep, Taunt), new statuses`.

### Task 4: The STYLES screen and the skill ring

**Files:**
- Create: `src/scenes/StylesScene.js`
- Modify: `src/main.js` (register the scene), `src/scenes/GameScene.js` (key Y), `src/controls/keys.js` (`styles: Y`), `src/controls/launcherDefs.js` (tray `STYLE`), `src/controls/LauncherControls.js` (draw skills on the ring), `tools/test_launcher_controls.mjs` (tray entry)

**Interfaces:**
- Consumes: `STYLES`, `STYLE_SKILLS`, `stats.styles`, `stats.styleSkillState`, `stats.assignSkillSlot`, `practising`, `WEAPON_TYPES`, `stats.weaponLevel`, `stats.ceilingFor`.

- [ ] **Step 1: Failing test** in `tools/test_launcher_controls.mjs`: `ok(TRAY.some(t => t.name === 'styles' && t.label === 'STYLE'), 'the tray opens STYLES')` and `ok(KEY_CODES.styles?.code === 'KeyY', 'Y opens STYLES')` (import `KEY_CODES` from `src/controls/keys.js`). Run: FAIL.

- [ ] **Step 2: Add the tray entry and key.** Run the test: PASS.

- [ ] **Step 3: StylesScene.** Same frame as SkillTreeScene (dark panel, gold title `FIGHTING STYLES`). A 3×3 grid of weapon cards (one per close-combat weapon, order as `STYLE_IDS`). Each card:
  - `One-handed sword · lv 2 / 10` (gold when Gifted), then `Guard — Learning 41%` with a bar (or `Guard — Known`), `Manual read` when read, and the practised marker (`● practising`).
  - Its three skills: name, `(mastery N)`, and state colour: ready white, waiting grey with `needs mastery N`, not learned dim. The slot it sits on (`[Q]`) when slotted.
  - Clicking a skill selects it; the bottom line shows its description and `Press Q, R, F or T to put it on a slot`. Q/R/F/T then call `assignSkillSlot`. Pressing the same key again on the same skill clears it.
  - Arrow keys / gamepad move the selection across skills (`GamepadNav` like the other screens); ESC / Y / B closes and resumes GameScene.
  - A footer line: `Learn a style: win fights with that weapon (slow) · read its manual (faster) · take lessons from a teacher (fastest)`.
- **The ring** (`LauncherControls`): when a slot holds a `STYLE_SKILLS` id, draw it with the weapon's colour (a fixed per-weapon map) or grey when the weapon is not in hand, the 4-letter abbreviation, and its cooldown seconds from `stats.skillCooldowns`.

- [ ] **Step 4: Headless check** (ledger): Y opens the screen; at 1500×863 and 1024×640 every card fits; clicking Parry then pressing R puts it on slot 1 and the ring shows it; with a mace in hand the ring's Parry is grey. `npm test` green.

- [ ] **Step 5: Commit** — `feat(amo): C3 STYLES screen (Y / tray) — learning bars, skills by mastery, put skills on Q/R/F/T; the skill ring shows weapon skills and greys them when the weapon is not in hand`.

### Task 5: Teachers, the Guild and elite manuals

**Files:**
- Modify: `src/data/townsfolk/thaloria.js`, `src/scenes/GameScene.js` (`_talkToNpc`, elite drop), `src/scenes/DialogueScene.js` (`onPick`), `tools/test_townsfolk.mjs`

**Interfaces:**
- Consumes: `lessonCheck`, `takeLesson`, `gameDay(stats.gameMinutes)`, `CATALOGS.guild`, `rollEliteManual`.

- [ ] **Step 1: Failing test** in `tools/test_townsfolk.mjs`: the Thaloria town has a resident whose `npc.teaches === 'guard'` working at `thaloria_barracks__sergeant`, the `smith` has `npc.teaches === 'crusher'`, and `archivist_master` has `npc.isShop` with `catalog: 'guild'`; `validateTown` still passes. Run: FAIL.

- [ ] **Step 2: Data.**
  - New resident `sergeant` (role `labourer`, a guard look, `home: 'door_barracks'`, `work: 'thaloria_barracks__sergeant'`, `evening: 'door_barracks'`, `npc: { id: 'sergeant', name: 'Sergeant', teaches: 'guard' }`).
  - `smith` gets `npc: { id: 'smith', name: 'Smith', teaches: 'crusher' }`.
  - `archivist_master` gets `npc: { id: 'archivist_master', name: 'Archivist', isShop: true, shopName: "THE ARCHIVIST'S GUILD", catalog: 'guild', dialogue: 'archivist_guild_greeting', afterDialogue: 'archivist_guild_greeting' }` and a short greeting in `dialogues.js` (no new lore: "Manuals on the arts of the blade, the staff and the fist. Read them well.").
  Run the test: PASS.

- [ ] **Step 3: Lessons.** `DialogueScene._pick`: call `choice.onPick?.()` before `applyChoice`. `GameScene._talkToNpc`: when `def.teaches`:
  - not at work → notice `${name} teaches during working hours`;
  - `lessonCheck` `'known'` → line "You know all I can teach you of Guard.";
  - `'today'` → "Enough for today. Come back tomorrow.";
  - `'gold'` → "A lesson is N gold. Come back when you have it.";
  - ok → a line "I can teach you the Guard style of the one-handed sword. A lesson is N gold." with choices `Take a lesson (N gold)` (`onPick`: `gold -= takeLesson(...)`, notice `Guard +35% (now X%)`, announce if learned, save) and `Not now`.
  - `questManager.onTalk(npcId)` as for any NPC.
- **Elite manual:** next to `rollEliteScroll` in GameScene, `rollEliteManual(Math.random, playerStats.styles, carried)` adds a manual to the elite's drops.

- [ ] **Step 4: Headless check** (ledger), in Thaloria (`?testmap=thaloria` or the city map id) at 10:00: talk to the sergeant with 500 gold → choose the lesson → gold 400, Guard 35%; talk again → "Enough for today"; advance `gameMinutes` by a day → lesson 2 costs 200; at 20:00 the smith is not at work → the notice; the Archivist's shop lists seven manuals; buy and read Manual: Reaver from the Inventory → Reaver 40%. `npm test` green.

- [ ] **Step 5: Commit** — `feat(amo): C3 teachers — the barracks sergeant teaches Guard, the smith Crusher (one lesson a day, 100/200/300 gold); the Archivist's Guild sells manuals; elites may drop one`.

### Task 6: The manual, a fight check, the backlog

**Files:**
- Modify: `tools/gen_game_inventory.mjs`, `docs/manual/index.html` (regenerated), `docs/polish_backlog.md`

- [ ] **Step 1: Manual chapter "Styles and learning"** (child-readable, short sentences, tables), generated from `STYLES`/`STYLE_SKILLS` so it never drifts:
  - What a style is: three skills at mastery 2, 5 and 8; Untrained gets one, Trained two, Gifted all three.
  - A table per weapon: style, its skills, the mastery each needs, what each does (`desc`), and the cooldown in seconds.
  - Learning: practice (1% a kill at an even fight; weak enemies teach less), a manual (+40% and practice counts double), a teacher (+35% a lesson, one a day, 100 then 200 then 300 gold). Where: the sergeant in the barracks (Guard), the smith (Crusher), the Archivist's Guild (manuals), elites (sometimes a manual).
  - Using skills: open STYLES (Y, or STYLE on the touch tray), pick a skill, press Q, R, F or T. A greyed skill means its weapon is not in your hands.
  - One worked example: "Kael with a sword: win fights until Guard is learned, then put Parry on Q. When a wolf leaps at you, press Q just before it bites."
  - Regenerate: `node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html`.
- [ ] **Step 2: Fight check** (ledger): Kael on east_road with a sword, Guard known, sword mastery 5: fight three Chapter 1–3 enemies with Parry and Riposte, and confirm Riposte kills a typical enemy in 2–3 uses, and that nothing one-shots a boss. Tuning that changes a number goes in the ledger.
- [ ] **Step 3: Backlog:** add the C3 art gaps (skills borrow the normal attack art and arcs) to `docs/polish_backlog.md`.
- [ ] **Step 4:** `npm test` green. Commit — `docs(amo): manual — fighting styles, their skills, and learning by practice, manual and teacher`.
