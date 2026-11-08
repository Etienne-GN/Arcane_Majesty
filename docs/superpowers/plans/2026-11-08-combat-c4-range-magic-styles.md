# Combat C4: Range and Magic Styles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- The bow, crossbow, wand and staff each get a first fighting style with three skills, at weapon mastery 2, 5 and 8:
  - bow: Hunter;
  - crossbow: Marksman;
  - wand: Quickcast;
  - staff: Channeler.
- The Archivist's Guild adds manuals for these four styles, plus the Warder (staff) and Hex (wand) manuals the spec promised. Warder and Hex have no skills yet; those arrive in a later stage.
- Spells get the rest of the "practice < manual < teacher" rule:
  - **spell scrolls** teach one spell at Novice;
  - **the Thaloria priest** teaches arcane spells, one lesson a day;
  - **a spell kill with a wand or staff in hand** practises that weapon's style.
- The STYLES screen shows all 13 weapons, and the manual explains the new styles, scrolls and the spell teacher.

**Architecture:**
- **`src/data/styles.js`** gains 6 styles and 12 skills, and new skill kinds:
  - `shot`: one arrow, bolt or wand bolt ahead, or every enemy in the row if `pierce`;
  - `volley`: several shots;
  - `chain`: a bolt that jumps between enemies;
  - `release`: spend all your mana in a blast around you.
- **`src/systems/styles.js`** (pure) gains `chainTargets`, `releaseMult`, `cardStyles`, `laterStyles`, and the echo constants.
- **`src/systems/spellLearning.js`** (new, pure) holds spell scrolls (ids, prices, Guild list, elite drops) and what a spell teacher teaches next.
- **`src/systems/StyleSkills.js`** plays the new kinds.
- **`GameScene`:**
  - `_rangedDamage` is pulled out of `_bowStrike`, so skills and normal shots share one formula;
  - three new status fields join the existing ones, read through one helper, `statusManager.mult(entity, field)`. `rangedMult` multiplies shots, `spellMult` spell damage and `manaCostMult` spell mana cost;
  - Echo repeats a spell's effects once.

**Tech Stack:** Phaser 3.90, ES modules, Node `assert` tests, headless Chrome via `../tool_suite/lpc_forge/tools/console.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-26-combat-weapons-design.md`: §4 (styles table, learning, "Spells follow the same rule", first teachers and manuals), §6 (manual), §7 stage C4.

## Global Constraints

- **Saves:**
  - Every new save field gets a default in `PlayerStats` (in the constructor and in `reset()`), and old saves load without errors.
  - Nothing a save knows is taken away. A scroll or teacher never lowers a spell tier.
- **Tests:**
  - Every pure module gets a `tools/test_*.mjs` chained into `npm test`, and `npm test` stays green at every step.
  - Every system is checked headless in the running game before it is called done.
- **The manual** gets the C4 part of its Combat chapter (spec §6). It is written so a child can follow it.
- **Workflow:** commits go straight to `main`, from working directory `apps/amo`.
- **Headless checks:**
  - Run steps with `console.mjs URL ms --eval "step;;step"` (800 ms apart; a bare `0` is a delay), or the scratchpad `run.mjs <url> <ms> <stepsFile>` with steps separated by `----` lines.
  - Print with `console.log('RESULT', …)`. Get the scene with `gs = __game.scene.getScene('GameScene')`.
  - Never override `Math.random`.
  - Use `?testmap=east_road` for fights and `?testmap=thaloria` for the priest.
- **Lore:** the priest is an unnamed townsfolk role. Styles and skills are mechanics, not lore. No DB writes.
- **Spell rule (spec §4):** "A manual or teacher can grant a spell, but its tiers still follow the ceiling". A scroll or a lesson gives Novice (tier 1). Higher tiers come only from the element level, as before.

## Rulings against the spec (made while planning)

- **Already done in C2, so not in this plan:** element levels from casting, spell tiers by element level, and the old-save conversion.
- **Warder and Hex manuals are sold now, with no skills yet.** This is what spec §4 and the message to the user said.
  - Reading one fills its bar by 40%, and the STYLES card shows the bar with "skills in a later update".
  - Their bars cannot be practised past that until their skills exist: practice always goes to the weapon's first style (Quickcast, Channeler). The style picker comes with their skills.
- **"Scrolls and tomes are manuals" means spell scrolls.**
  - A scroll is made for every spell whose `learnFrom` includes `'scroll'` and that has a discovery threshold.
  - The Guild sells the easy ones (threshold ≤ 10), and elites may drop any of them (8%).
  - The existing Eldritch Tome stays a lore item.
- **The spell teacher is the Thaloria priest, who teaches arcane** spells whose `learnFrom` includes `'npc'`, easiest first.
  - Lessons work like style lessons: one a day, during work hours, at 100 / 200 / 300 gold.
  - Each lesson grants one spell at Novice.
- **Skills cost no mana,** as in C3. The exception is Release, whose whole point is spending your mana.
- **The bow is Hunter and the crossbow Marksman, as in the spec table.** Skill shots need no arrows yet: arrows and quivers come in C5. C5 adds the arrow cost to the `shot` kind in one place.

## Review Focus

1. **A ranged skill with no enemy in line:** the shot flies, the cooldown starts, and nothing breaks. Chain with one enemy hits it once.
2. **Release with almost no mana** (< 10) says "Not enough mana", spends nothing and starts no cooldown. Release while mana-exhausted does the same.
3. **Echo on a self spell** (heal, ward) does not repeat it. An echo never echoes itself. A spell cast while Overloaded costs 1.5× the mana, and "Not enough mana" uses that higher cost.
4. **A scroll for a spell already known** is not used up and says "You already know …". A scroll for a spell above your element level teaches Novice only.
5. **The priest outside work hours, twice in one day, without gold, or with nothing left to teach** gets a clear line, and no gold is taken.

---

## The new styles (data for Task 1)

`range` is the weapon's range from `WEAPON_TYPES` (bow 150, crossbow 220, wand 140). `mult` multiplies the weapon's normal hit.

| Weapon | Style | Skill (unlock) | Kind | What it does |
|---|---|---|---|---|
| bow | **Hunter** | Aimed Shot (2) | shot, rangeMult 1.5, mult 2.2, cd 5000 | A careful shot that flies farther and hits hard. |
| | | Snare (5) | shot, mult 0.6, status `snared` 3000, cd 9000 | A shot at the legs: the target cannot move for 3 s. |
| | | Mark Prey (8) | shot, mult 1.0, status `hunted` 8000, cd 15000 | The target takes 40% more damage from everything for 8 s. |
| crossbow | **Marksman** | Steady Aim (2) | buff `aiming` 6000, cd 20000 | For 6 s, your shots do 50% more, but you walk slower. |
| | | Headshot (5) | shot, mult 3.0, status `dazed` 1000, cd 9000 | A bolt to the head that stuns. |
| | | Pierce (8) | shot, pierce, rangeMult 1.2, mult 1.8, cd 8000 | A bolt that goes through every enemy in the row. |
| wand | **Quickcast** | Snap Cast (2) | volley, 3 shots × mult 0.7, 110 ms apart, cd 4000 | Three quick bolts. |
| | | Echo (5) | buff `echoing` 6000, cd 20000 | For 6 s, every spell you aim happens again a moment later, at half power. |
| | | Chain (8) | chain, mult 1.4, 3 jumps, 90 px, ×0.75 a jump, cd 8000 | A bolt that jumps from enemy to enemy. |
| staff | **Channeler** | Channel (2) | buff `channeling` 4000, cd 15000 | For 4 s, get back 6 mana a second, but walk at half speed. |
| | | Overload (5) | buff `overloaded` 6000, cd 20000 | For 6 s, spells do 40% more damage but cost 50% more mana. |
| | | Release (8) | release, mult 1.2 + mana/40, radius 80, cd 12000 | Pour out all your mana in a blast around you. |

Later styles (manual only in C4): **Hex** (wand, "Curse them: weaken, slow, drain.") and **Warder** (staff, "Circles and barriers that keep you safe."), with `skills: []` and `later: true`.

New statuses:
- `snared`: speedMult 0, 3000 ms, tint 0x88aa55. It roots but does not stun, so the target can still attack.
- `hunted`: damageTakenMult 1.4, 8000 ms, tint 0xff5555.
- `aiming`: buff, rangedMult 1.5, speedMult 0.7, 6000 ms.
- `echoing`: buff, 6000 ms.
- `channeling`: buff, manaRegen 6 every regenInterval 1000, speedMult 0.5, 4000 ms.
- `overloaded`: buff, spellMult 1.4, manaCostMult 1.5, 6000 ms.

---

### Task 1: Styles data, pure rules and statuses

**Files:**
- Modify: `src/data/styles.js`, `src/systems/styles.js`, `src/data/statuses.js`, `src/systems/StatusManager.js`
- Test: `tools/test_styles.mjs`, `tools/test_statuses.mjs`

**Interfaces:**
- Produces (`data/styles.js`):
  - `STYLE_IDS` now has 15 entries: the 9 C3 ids, then `hunter`, `marksman`, `quickcast`, `channeler`, `hex`, `warder`;
  - `STYLE_SKILLS` has 39 entries;
  - `STYLES.hex.later === true`, with `skills: []`.
- Produces (`systems/styles.js`):
  - `cardStyles()` returns the first style of each weapon, 13 of them in `STYLE_IDS` order;
  - `laterStyles(weapon)` returns that weapon's other styles;
  - `chainTargets(first, list, jumps, radius)` returns `[first, …]`, where each next target is the nearest one not yet hit within `radius` of the previous;
  - `releaseMult(k, mana)` = `k.mult + mana / k.manaPer`, rounded to 2 decimals;
  - `RELEASE_MIN_MANA = 10`, `ECHO_DELAY = 400`, `ECHO_POWER = 0.5`.
- Produces (`StatusManager`):
  - `mult(entity, field)` returns the product of `STATUS_DEFS[id][field]` over the entity's statuses (1 if none);
  - the status tick restores `def.manaRegen` mana to `entity.stats` every `regenInterval`.

- [ ] **Step 1: Write the failing tests.** Change the C3 expectations, and add these to `tools/test_styles.mjs`:

```js
// ---- C4: range and magic styles
eq(D.STYLE_IDS, ['guard', 'reaver', 'shadow', 'lancer', 'spinning_staff', 'crusher', 'berserker', 'bulwark', 'brawler',
                 'hunter', 'marksman', 'quickcast', 'channeler', 'hex', 'warder'], 'C3 + C4 styles, the later two last');
eq(Object.keys(D.STYLE_SKILLS).length, 39, '13 styles with three skills');
eq(S.cardStyles().map(s => s.weapon), ['sword', 'greatsword', 'dagger', 'spear', 'bo', 'mace', 'axe', 'shield', 'fists',
                                       'bow', 'crossbow', 'wand', 'staff'], 'one card per weapon');
eq(S.laterStyles('wand').map(s => s.id), ['hex'], 'Hex waits behind Quickcast');
eq(S.laterStyles('sword'), [], 'the sword has only Guard yet');
eq(D.STYLES.warder.later && D.STYLES.warder.skills.length, 0, 'Warder: no skills yet');
eq(S.practising(S.emptyStyles(), 'staff'), 'channeler', 'the staff practises Channeler');
for (const id of ['aimed_shot', 'snare', 'mark_prey', 'headshot', 'pierce', 'snap_cast', 'chain'])
    ok(['shot', 'volley', 'chain'].includes(D.STYLE_SKILLS[id].kind), `${id} is a shot`);
eq(D.STYLE_SKILLS.pierce.pierce, true, 'Pierce goes through');
eq(D.STYLE_SKILLS.release.kind, 'release', 'Release spends mana');

// chain: nearest unhit within radius of the previous
const C = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 500, y: 0 }, { x: 30, y: 30 }];
eq(S.chainTargets(C[0], C, 3, 90), [C[0], C[4], C[1], C[2]], 'jumps nearest first, never twice');
eq(S.chainTargets(C[3], C, 3, 90), [C[3]], 'nobody near: one hit');
eq(S.chainTargets(C[0], C, 1, 90).length, 2, 'jumps are capped');

// release
eq(S.releaseMult(D.STYLE_SKILLS.release, 0), 1.2, 'no mana: the base');
eq(S.releaseMult(D.STYLE_SKILLS.release, 80), 3.2, '80 mana: +2');
eq(S.RELEASE_MIN_MANA, 10, 'Release needs 10 mana');
```

The C3 assertions this replaces:
- `STYLE_IDS` with 9 entries;
- 27 skills;
- the loop that requires every style to have 3 skills. It now skips styles with `later`, and asserts `later` styles have `skills: []`.

In `tools/test_statuses.mjs`, add:

```js
// ---- Combat C4 statuses
for (const id of ['snared', 'hunted', 'aiming', 'echoing', 'channeling', 'overloaded']) ok(STATUS_DEFS[id], `${id} exists`);
{
    const e = { _statuses: {} };
    sm.apply(e, 'aiming'); sm.apply(e, 'overloaded');
    eq(sm.mult(e, 'rangedMult'), 1.5, 'aiming: shots ×1.5');
    eq(sm.mult(e, 'spellMult'), 1.4, 'overloaded: spells ×1.4');
    eq(sm.mult(e, 'manaCostMult'), 1.5, 'overloaded: mana ×1.5');
    eq(sm.mult({ _statuses: {} }, 'spellMult'), 1, 'nothing: ×1');
    eq(sm.isStunned(Object.assign({ _statuses: {} }, {})), false, 'sanity');
    const s = { _statuses: {} }; sm.apply(s, 'snared');
    eq(sm.speedMult(s), 0, 'snared: cannot move');
    eq(sm.isStunned(s), false, '… but is not stunned');
    const p = { _statuses: {}, stats: { mana: 10, maxMana: 100 } };
    sm.apply(p, 'channeling'); sm.tick(p, 1000);
    eq(p.stats.mana, 16, 'channeling: +6 mana a second');
    p.stats.mana = 99; sm.tick(p, 1000);
    eq(p.stats.mana, 100, '… never above max');
}
```

Use whatever local names `test_statuses.mjs` already uses for the manager and its tick function (read its head first, and match `ok`, `eq` and `sm` to them).

- [ ] **Step 2: Run the tests and watch them fail.**
Run: `node tools/test_styles.mjs; node tools/test_statuses.mjs`
Expected: FAIL on the `STYLE_IDS` list (test_styles) and on `snared exists` (test_statuses).

- [ ] **Step 3: Implement.**

`src/data/styles.js`:
- add a comment line for the new kinds: `shot` (ahead; `pierce` hits the whole row; `rangeMult` stretches the weapon's range) · `volley` (`hits` shots `gap` ms apart) · `chain` (`jumps` × `radius`, × `jumpMult` each) · `release` (all your mana: `mult` + mana / `manaPer`, around you in `radius`);
- append to `STYLES`:

```js
    hunter:    { id: 'hunter',    name: 'Hunter',    weapon: 'bow',      blurb: 'Patient shots: hit hard, hold them, mark them.', skills: ['aimed_shot', 'snare', 'mark_prey'] },
    marksman:  { id: 'marksman',  name: 'Marksman',  weapon: 'crossbow', blurb: 'Steady aim, a bolt to the head, a bolt through a row.', skills: ['steady_aim', 'headshot', 'pierce'] },
    quickcast: { id: 'quickcast', name: 'Quickcast', weapon: 'wand',     blurb: 'Fast bolts, echoing spells, a bolt that jumps.', skills: ['snap_cast', 'echo', 'chain'] },
    channeler: { id: 'channeler', name: 'Channeler', weapon: 'staff',    blurb: 'Gather mana, overload your spells, then let it all out.', skills: ['channel', 'overload', 'release'] },
    // Later styles: a manual can start their bar now; their skills come in a later stage.
    hex:       { id: 'hex',       name: 'Hex',       weapon: 'wand',     blurb: 'Curse them: weaken, slow, drain.', skills: [], later: true },
    warder:    { id: 'warder',    name: 'Warder',    weapon: 'staff',    blurb: 'Circles and barriers that keep you safe.', skills: [], later: true },
```

- append to `STYLE_SKILLS`:

```js
    // Hunter — bow
    S('aimed_shot', 'Aimed Shot', 'hunter', 2, 5000,  'shot', 'A careful shot that flies farther and hits hard.', { mult: 2.2, rangeMult: 1.5 }),
    S('snare',      'Snare',      'hunter', 5, 9000,  'shot', 'A shot at the legs: the target cannot move for 3 seconds.', { mult: 0.6, status: 'snared', statusMs: 3000, knock: 0 }),
    S('mark_prey',  'Mark Prey',  'hunter', 8, 15000, 'shot', 'Mark the target: it takes 40% more damage from everything for 8 seconds.', { mult: 1.0, status: 'hunted', statusMs: 8000, knock: 0 }),
    // Marksman — crossbow
    S('steady_aim', 'Steady Aim', 'marksman', 2, 20000, 'buff', 'For 6 seconds your shots do 50% more damage, but you walk slower.', { buff: 'aiming', buffMs: 6000 }),
    S('headshot',   'Headshot',   'marksman', 5, 9000,  'shot', 'A bolt to the head: huge damage, and the target is stunned.', { mult: 3.0, status: 'dazed', statusMs: 1000 }),
    S('pierce',     'Pierce',     'marksman', 8, 8000,  'shot', 'A bolt that goes through every enemy in the row.', { mult: 1.8, rangeMult: 1.2, pierce: true }),
    // Quickcast — wand
    S('snap_cast',  'Snap Cast',  'quickcast', 2, 4000,  'volley', 'Three quick bolts, one after another.', { mult: 0.7, hits: 3, gap: 110, knock: 40 }),
    S('echo',       'Echo',       'quickcast', 5, 20000, 'buff',   'For 6 seconds, every spell you aim happens again a moment later, at half power.', { buff: 'echoing', buffMs: 6000 }),
    S('chain',      'Chain',      'quickcast', 8, 8000,  'chain',  'A bolt that jumps from enemy to enemy — up to three more.', { mult: 1.4, jumps: 3, radius: 90, jumpMult: 0.75, knock: 40 }),
    // Channeler — staff
    S('channel',    'Channel',    'channeler', 2, 15000, 'buff',    'For 4 seconds you get back 6 mana a second, but walk at half speed.', { buff: 'channeling', buffMs: 4000 }),
    S('overload',   'Overload',   'channeler', 5, 20000, 'buff',    'For 6 seconds spells do 40% more damage but cost 50% more mana.', { buff: 'overloaded', buffMs: 6000 }),
    S('release',    'Release',    'channeler', 8, 12000, 'release', 'Pour out all your mana in a blast around you. More mana, bigger blast.', { mult: 1.2, manaPer: 40, radius: 80, knock: 260 }),
```

`src/systems/styles.js`: import `STYLE_IDS`, then add:

```js
// C4: one STYLES card per weapon — its first style; the others wait behind it.
export const cardStyles = () => STYLE_IDS.map(id => STYLES[id]).filter(s => stylesFor(s.weapon)[0].id === s.id);
export const laterStyles = weapon => stylesFor(weapon).slice(1);

// Chain: from `first`, jump to the nearest enemy not yet hit within `radius` of the last one.
export function chainTargets(first, list, jumps, radius) {
    const out = [first];
    while (out.length <= jumps) {
        const last = out[out.length - 1];
        const next = list.filter(e => !out.includes(e))
            .map(e => ({ e, d: Math.hypot(e.x - last.x, e.y - last.y) }))
            .filter(o => o.d <= radius).sort((a, b) => a.d - b.d)[0]?.e;
        if (!next) break;
        out.push(next);
    }
    return out;
}

// Release: more mana, bigger blast. Below RELEASE_MIN_MANA it does not go off.
export const RELEASE_MIN_MANA = 10;
export const releaseMult = (k, mana) => Math.round((k.mult + mana / k.manaPer) * 100) / 100;

// Echo: an aimed spell happens again ECHO_DELAY ms later at ECHO_POWER of its damage.
export const ECHO_DELAY = 400, ECHO_POWER = 0.5;
```

`src/data/statuses.js` (header comment: add `rangedMult` / `spellMult` / `manaCostMult` multiply shots / spell damage / spell mana; `manaRegen` restores mana every `regenInterval`):

```js
    // Combat C4
    snared:     { id: 'snared',     label: 'Snared',     duration: 3000, tint: 0x88aa55, speedMult: 0 },
    hunted:     { id: 'hunted',     label: 'Hunted',     duration: 8000, tint: 0xff5555, damageTakenMult: 1.4 },
    aiming:     { id: 'aiming',     label: 'Steady Aim', duration: 6000, tint: 0xddddaa, buff: true, rangedMult: 1.5, speedMult: 0.7 },
    echoing:    { id: 'echoing',    label: 'Echo',       duration: 6000, tint: 0xcc99ff, buff: true },
    channeling: { id: 'channeling', label: 'Channel',    duration: 4000, tint: 0x88ccff, buff: true, manaRegen: 6, regenInterval: 1000, speedMult: 0.5 },
    overloaded: { id: 'overloaded', label: 'Overload',   duration: 6000, tint: 0xff88ff, buff: true, spellMult: 1.4, manaCostMult: 1.5 },
```

`src/systems/StatusManager.js`:
- in the tick, after the `regenAmt` block:

```js
            // Mana back (Combat C4 Channel) — the player's mana lives on .stats
            if (def.manaRegen) {
                state.regenTimer -= delta;
                if (state.regenTimer <= 0) {
                    state.regenTimer += def.regenInterval;
                    const s = entity.stats;
                    if (s?.maxMana) s.mana = Math.min(s.maxMana, s.mana + def.manaRegen);
                }
            }
```

- check where `apply` initialises `regenTimer`. If it initialises it only when `def.regenAmt` is set, make it `def.regenAmt || def.manaRegen`;
- add the generic product next to `statsMult`:

```js
    // Product of one numeric status field (Combat C4: rangedMult, spellMult, manaCostMult)
    mult(entity, field) {
        let m = 1;
        for (const id of Object.keys(entity._statuses ?? {})) {
            const v = STATUS_DEFS[id]?.[field];
            if (typeof v === 'number') m *= v;
        }
        return m;
    },
```

- [ ] **Step 4: Run the tests and watch them pass.**
Run: `node tools/test_styles.mjs && node tools/test_statuses.mjs && npm test > /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/c4_t1.log 2>&1; tail -5 /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/c4_t1.log`
Expected: both files pass, and the suite passes. The manual generator, `StylesScene` and `rollEliteManual` iterate `STYLE_IDS`: if any test breaks because `later` styles have no skills, guard that loop with `st.skills.length` and note it in the ledger.

- [ ] **Step 5: Commit.**

```bash
git add src/data/styles.js src/systems/styles.js src/data/statuses.js src/systems/StatusManager.js tools/test_styles.mjs tools/test_statuses.mjs
git commit -m "feat(amo): C4 styles data — Hunter (bow), Marksman (crossbow), Quickcast (wand), Channeler (staff), Hex and Warder waiting; shot, volley, chain and release; six new statuses"
```

---

### Task 2: The new skills in play

**Files:**
- Modify: `src/systems/StyleSkills.js`, `src/scenes/GameScene.js` (`_bowStrike`, `_castSpell`, `_spellDamage`, `spellDamageMult`, `_spellPractice`), `src/entities/Player.js` (`_spellCheck`)

**Interfaces:**
- Consumes: Task 1 data and `statusManager.mult`, `chainTargets`, `releaseMult`, `RELEASE_MIN_MANA`, `ECHO_DELAY`, `ECHO_POWER`.
- Produces:
  - `GameScene._rangedDamage(itemId, dmgMult, type)` returns an integer: the normal shot's damage before the augment, triple-shot and boss modifiers, already × `statusManager.mult(player, 'rangedMult')`;
  - `GameScene._shotTrail(px, py, facing, range, colors)`;
  - `Player.spellManaCost(id)` = `Math.ceil(stats.getSpellManaCost(id) * statusManager.mult(this, 'manaCostMult'))`.

- [ ] **Step 1: Write the headless check (the failing test).** Save as scratchpad `c4_skills.txt`. It builds on C3's `c3_skills.txt` (the same setup steps):
  - set up a Gifted character with every C4 weapon in the pack: `W = { bow: 'hunting_bow', crossbow: …, wand: …, staff: … }`. Look the item ids up with `grep -n "weaponType: '\(bow\|crossbow\|wand\|staff\)'" src/data/items.js` and choose one each;
  - set mastery 1800 for the four, and progress 100 for hunter, marksman, quickcast and channeler;
  - give the player 99999 HP and 200 / 200 mana;
  - for each of the 12 skills, run `gs._useStyleSkill(id)` facing an enemy placed 60 px to the right (100000 HP). After 600 ms, record `{ id, dmg, enemy statuses, my statuses, cd started, mana }`;
  - extra steps:
    - **Chain:** place 3 enemies 50 px apart in a row. All three lose HP.
    - **Pierce:** place 2 enemies in the row. Both lose HP.
    - **Release:** at 200 mana, it ends with 0 mana. At 5 mana, the call returns false, there is no cooldown, and mana stays 5.
    - **Echo:** cast an aimed damage spell the character knows, such as `gs._castSpell(id, e.x, e.y)`, with `echoing` on. The enemy takes two hits, the second about half the first.
    - **Overload:** `gs.player.spellManaCost(id)` is 1.5× the plain cost, rounded up.
    - **Steady Aim:** a normal crossbow shot after it does about 1.5× one before it.

Run: `node /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/run.mjs "http://localhost:5174/?testmap=east_road" 30000 /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/c4_skills.txt`
Expected before the implementation: the shot skills return without dealing damage (`dmg: 0`, unknown kind) and `spellManaCost is not a function`. That is the RED.

The dev server must be running (`cd apps/amo && npm run dev`, in the background). If it was stopped for memory, start only the game server.

- [ ] **Step 2: Implement `_rangedDamage` and `_shotTrail` in `GameScene`.**
  - Move the trail loop and the `base` formula out of `_bowStrike` unchanged, and make `_bowStrike` call them.
  - Then multiply `base` by `statusManager.mult(this.player, 'rangedMult')`:

```js
    // One shot's damage (Combat C4: shared by normal shots and style skills)
    _rangedDamage(itemId, dmgMult = 1, type = typeOf(ITEMS[itemId])) {
        const stats = this.player.stats;
        return Math.floor((8 + stats.attributes.strength * 1.5 + stats.attributes.intelligence * 1.0 + Phaser.Math.Between(-2, 3))
            * weaponDamageMult(stats.upgradeLevel?.(itemId) ?? 0) * dmgMult
            * levelDamageMult(playerStats.weaponLevel(type))
            * statusManager.mult(this.player, 'rangedMult'));   // Steady Aim
    }
    _shotTrail(px, py, facing, range, colors) { /* the loop moved out of _bowStrike, with dx, dy from facing */ }
```

- [ ] **Step 3: Implement the kinds in `StyleSkills.js`.**
  - Split `strike()`'s per-enemy body into `hit(scene, k, e, dmg, behind)`, so strikes and shots share knock-back, statuses, `learnFromHit`, numbers and sparks.
  - `strike()` keeps computing `dmg` from `combat._calcDamage(false).dmg * mult`, then calls `hit`.
  - Then add:

```js
const TRAIL = { bow: [0x88ffaa, 0xffffff], crossbow: [0xddcc88, 0xffffff], wand: [0xaa88ff, 0xffffff] };

// The item in hand for a skill's weapon, or null (fists)
const heldItem = (stats, type) => [stats.equipment.weapon, stats.equipment.offHand].find(id => typeOf(ITEMS[id]) === type) ?? null;

// One arrow / bolt / wand bolt straight ahead: the first enemy in the row, or all of them (pierce).
function shot(scene, k, mult = k.mult) {
    const player = scene.player, w = WEAPON_TYPES[k.weapon];
    const range = Math.round((w.range ?? 150) * (k.rangeMult ?? 1));
    scene._shotTrail(player.x, player.y, player.facing, range, TRAIL[k.weapon] ?? TRAIL.bow);
    const hits = targetsIn({ kind: 'line', length: range, width: 22, max: k.pierce ? 0 : 1 }, player, player.facing, scene._liveEnemies());
    const base = scene._rangedDamage(heldItem(player.stats, k.weapon), w.dmgMult, k.weapon);
    for (const e of hits) hit(scene, k, e, Math.max(1, Math.floor(base * mult * (e === scene.boss ? 0.65 : 1))), false);
    return hits;
}
```

  In `performSkill`'s switch:

```js
        case 'shot':   shot(scene, k); break;
        case 'volley':
            for (let i = 0; i < k.hits; i++) scene.time.delayedCall(i * k.gap, () => { if (player.active) shot(scene, k); });
            break;
        case 'chain': {
            const first = shot(scene, { ...k, jumps: 0 })[0];
            if (first) chainTargets(first, scene._liveEnemies(), k.jumps, k.radius).slice(1).forEach((e, i) => {
                scene.time.delayedCall((i + 1) * 90, () => {
                    if (!e.active) return;
                    zap(scene, i === 0 ? first : null, e);
                    hit(scene, k, e, Math.max(1, Math.floor(scene._rangedDamage(heldItem(stats, 'wand'), WEAPON_TYPES.wand.dmgMult, 'wand') * k.mult * k.jumpMult ** (i + 1))), false);
                });
            });
            break;
        }
        case 'release': break;   // done in the pre-check below
```

  The release pre-check sits next to the shadowstep one:

```js
    if (k.kind === 'release' && !release(scene, k)) return false;
```

```js
// Spend all your mana in a blast around you. False (no cooldown) under RELEASE_MIN_MANA or while exhausted.
function release(scene, k) {
    const player = scene.player, stats = player.stats, ui = scene.scene.get('UIScene');
    if (stats.manaExhausted || stats.mana < RELEASE_MIN_MANA) { ui?.showNotification?.('Not enough mana', 1200); return false; }
    const m = releaseMult(k, stats.mana);
    stats.mana = 0;
    strike(scene, { ...k, mult: m }, { kind: 'around', radius: k.radius }, { x: player.x, y: player.y });
    spinRing(scene, k.radius, 0x88ccff);
    scene.cameras.main.flash(80, 80, 140, 255, true);
    return true;
}

// A short lightning line between two enemies (Chain)
function zap(scene, from, to) {
    const g = scene.add.graphics().setDepth(62);
    const a = from ?? scene.player;
    g.lineStyle(2, 0xcc99ff, 0.9).lineBetween(a.x, a.y, to.x, to.y);
    scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
}
```

  - `_spawnAttackArc` for a ranged weapon already maps `bow` to `'resonance_bow'`, and wand/staff to `'staff'`. Keep it.
  - Skills on a ranged weapon play the `shoot`/`spellcast` animation the Player already uses for that weapon's basic. `performSkill` plays `attack_${facing}` today, and that stays.

- [ ] **Step 4: Implement the magic hooks.**
  - **`Player._spellCheck`:** replace both reads of `this.stats.getSpellManaCost(id)` in the "Not enough mana" check and in the spend with `this.spellManaCost(id)`. Leave the Magic Burn call as is. Add:

```js
    // A spell's mana with Overload (Combat C4)
    spellManaCost(id) { return Math.ceil(this.stats.getSpellManaCost(id) * statusManager.mult(this, 'manaCostMult')); }
```

  - **`GameScene.spellDamageMult()`:** multiply by `(this.player ? statusManager.mult(this.player, 'spellMult') : 1)`.
  - **`GameScene._spellDamage(id)`:** multiply `mult` by `(this._echo ? ECHO_POWER : 1)`.
  - **`GameScene._castSpell`:** after `_applySpellEffects(...)`:

```js
        // Combat C4 Echo: an aimed spell happens again, once, at half power
        if (!this._echo && spell.targetingType !== 'self' && statusManager.has(this.player, 'echoing')) {
            this.time.delayedCall(ECHO_DELAY, () => {
                if (!this.player?.active) return;
                this._echo = true;
                try { this._spellVFX(spellId, targetX, targetY); this._applySpellEffects(spellId, targetX, targetY); }
                finally { this._echo = false; }
            });
        }
```

  - **`GameScene._spellPractice(e, el)`:** replace `if (focus) playerStats.gainWeaponPoints(focus, gain);` with `if (focus) playerStats.learnFromHit(focus, !e.active || e.health <= 0, e.level ?? 1);`. The weapon points stay the same, because `learnFromHit` uses the same `hitGain`, and a kill now also practises Quickcast or Channeler.
  - Add `LauncherControls.js` `WEAPON_COLORS`: `bow: 0x88ffaa, crossbow: 0xddcc88, wand: 0xcc99ff, staff: 0x88ccff`.

- [ ] **Step 5: Run the headless check and watch it pass.**
Run: the Step 1 command.
Expected:
- all 12 skills have `cd: true`;
- the shot skills deal damage (`dmg > 0`): Aimed Shot about 2.2× a basic shot, Headshot about 3× with `dazed`;
- the enemy gets `snared` from Snare and `hunted` from Mark Prey;
- `aiming`, `echoing`, `channeling` and `overloaded` are on the player;
- Chain hits three enemies, and Pierce hits two;
- Release goes from 200 mana to 0, and at 5 mana it returns false with no cooldown;
- with Echo, the second hit is about half the first, and an Overload cost is 1.5× the plain one, rounded up;
- a crossbow shot under Steady Aim is about 1.5×.

Record the numbers in the ledger.

- [ ] **Step 6: Commit.**

```bash
git add src/systems/StyleSkills.js src/scenes/GameScene.js src/entities/Player.js src/controls/LauncherControls.js
git commit -m "feat(amo): C4 skills in play — aimed shots, snares, marks, headshots and piercing bolts; wand bolts that snap and chain; Echo, Overload, Channel and Release; spell kills with a wand or staff practise its style"
```

---

### Task 3: The STYLES screen for 13 weapons, and the new manuals

**Files:**
- Modify: `src/scenes/StylesScene.js`, `src/data/items.js` (`GUILD_CATALOG`, `WEAPON_NAMES`, `rollEliteManual`)
- Test: `tools/test_styles.mjs`

**Interfaces:**
- Consumes: `cardStyles()` and `laterStyles(weapon)` from Task 1.
- Produces: `GUILD_CATALOG` covers 13 manuals: the 7 from C3, then hunter, marksman, quickcast, channeler, hex and warder.

- [ ] **Step 1: Write the failing test** in `tools/test_styles.mjs`:

```js
// ---- C4 manuals
const { GUILD_CATALOG, manualId, rollEliteManual } = await import('../src/data/items.js');
eq(GUILD_CATALOG.map(e => e.id).slice(7), ['hunter', 'marksman', 'quickcast', 'channeler', 'hex', 'warder'].map(manualId), 'the Guild adds the C4 manuals');
ok(ITEMS.manual_hex.description.includes('later'), 'the Hex manual says its skills come later');
ok(ITEMS.manual_hunter.description.includes('bow'), 'the Hunter manual names its weapon');
const all = Object.fromEntries(D.STYLE_IDS.map(id => [id, 100]));
eq(rollEliteManual(() => 0, { progress: all, manuals: {} }, []), null, 'nothing left to drop');
```

- [ ] **Step 2: Run the test and watch it fail.**
Run: `node tools/test_styles.mjs`
Expected: FAIL on "the Guild adds the C4 manuals".

- [ ] **Step 3: Implement.**
  - **`items.js`:**
    - `GUILD_CATALOG` gets the list `['reaver', 'shadow', 'lancer', 'spinning_staff', 'berserker', 'bulwark', 'brawler', 'hunter', 'marksman', 'quickcast', 'channeler', 'hex', 'warder']`;
    - `WEAPON_NAMES` gains `bow: 'bow', crossbow: 'crossbow', wand: 'wand', staff: 'staff'`;
    - a `later` manual's description is `Starts the ${st.name} style of the ${weapon} (+40%). Its skills come in a later update. ${st.blurb}`.
  - **`StylesScene.js`:**
    - cards come from `cardStyles()` in 4 columns: `const COLS = 4, ROWS = Math.ceil(cards.length / COLS)`;
    - `cardW = Math.floor((pw - (COLS + 1) * gap) / COLS)` and `cardH = Math.floor((ph - 52 - footH - ROWS * gap) / ROWS)`;
    - font: `const f = cardH < 140 ? 12 : cardW < 380 ? 13 : 14`;
    - every `STYLE_IDS` use in this file becomes `CARDS = cardStyles()`, including in `_select`, `_move` and `_selSkill`;
    - skill line: `${sel ? '▶' : ' '}${tag}${k.name} · lv ${k.unlock}${state === 'weapon' ? '  (not in hand)' : ''}`. The colour already shows a mastery lock;
    - notes line: for each `laterStyles(st.weapon)` entry, append `${l.name} ${Math.floor(progress)}% · skills later` when its progress > 0.
  - **The footer** for a skill in `mastery` state keeps its "Needs … mastery N" text.

- [ ] **Step 4: Run the tests, then check the screen headless.**
Run: `node tools/test_styles.mjs && npm test > …/c4_t3.log 2>&1; tail -5 …/c4_t3.log`, then a headless shot of the STYLES screen at 1500×863 and at 1280×720. Set hex progress 40 and Channeler known first.
Expected:
- the tests pass;
- 13 cards fit in 4 columns at both sizes, with no text running past a card's edge;
- the staff card's notes show "Warder 40% · skills later";
- arrows move between cards, and Q puts Aimed Shot on Q.

Read the screenshots.

- [ ] **Step 5: Commit.**

```bash
git add src/scenes/StylesScene.js src/data/items.js tools/test_styles.mjs
git commit -m "feat(amo): C4 STYLES screen for all 13 weapons; the Archivist's Guild sells Hunter, Marksman, Quickcast, Channeler — and Hex and Warder, whose skills come later"
```

---

### Task 4: Spell scrolls and the spell teacher

**Files:**
- Create: `src/systems/spellLearning.js`, `tools/test_spell_learning.mjs`
- Modify:
  - `src/data/items.js`: scroll items, Guild scrolls, `rollEliteSpellScroll`;
  - `src/systems/PlayerStats.js`: `learnSpell(id)`, and `spellLessons` / `spellLessonDay` in the constructor, `reset()` and save;
  - `src/systems/SaveManager.js`;
  - `src/scenes/GameScene.js`: `_offerSpellLesson`, `_talkToNpc` branch, elite drop;
  - `src/data/townsfolk/thaloria.js`: the priest `npc`;
  - `src/data/npcs.js`;
  - `package.json`: chain `node tools/test_spell_learning.mjs` after `test_styles`;
  - `tools/test_townsfolk.mjs`, if it counts teachers.

**Interfaces:**
- Produces (`systems/spellLearning.js`):
  - `spellScrollId(spellId)` returns `'spell_scroll_' + spellId`;
  - `SCROLL_SPELLS`: the ids of spells whose `learnFrom` includes `'scroll'` and that have a `discoverCondition.threshold`;
  - `scrollPrice(spell)` = `40 + 5 * threshold`;
  - `GUILD_SCROLL_MAX = 10`, and `guildScrolls()` returns the `SCROLL_SPELLS` with threshold ≤ 10, easiest first;
  - `ELITE_SCROLL_CHANCE = 0.08`, and `rollSpellScroll(rng, spells, carriedIds)` returns a scroll id for an unknown, uncarried scroll spell, or null;
  - `teachableSpells(element)`: spells of that element whose `learnFrom` includes `'npc'`, easiest first (no threshold counts as 0);
  - `spellToTeach(spells, element)` returns the first of those not known, or null;
  - `spellLessonCheck(lessons, lessonDay, element, day, gold, spells)` returns `{ ok, reason: 'none' | 'today' | 'gold', price, spell }`, using `lessonPrice` from `styles.js`.
- Produces (`PlayerStats`):
  - `learnSpell(id)`: false if the spell is already known or does not exist. Otherwise it sets tier 1, fires the spell callbacks `(id, 1, true)`, runs `_checkSpellProgress(element)` (the element level may already allow more) and returns true;
  - `spellLessons` / `spellLessonDay`: element → count / day.

- [ ] **Step 1: Write the failing test** `tools/test_spell_learning.mjs`:

```js
// Combat C4: spells by scroll and by teacher (spec §4 "Spells follow the same rule").
import assert from 'node:assert';
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };
const L = await import('../src/systems/spellLearning.js');
const { SPELLS } = await import('../src/data/spells.js');
const { ITEMS, CATALOGS } = await import('../src/data/items.js');

ok(L.SCROLL_SPELLS.length > 20, 'many spells have a scroll');
ok(L.SCROLL_SPELLS.every(id => SPELLS[id].learnFrom.includes('scroll') && SPELLS[id].discoverCondition?.threshold != null), 'only scroll spells with a threshold');
eq(L.spellScrollId('fireball'), 'spell_scroll_fireball', 'scroll id');
ok(ITEMS.spell_scroll_fireball?.spellOf === 'fireball', 'the scroll item exists');
eq(L.scrollPrice(SPELLS.fireball), 55, 'price: 40 + 5 × threshold');
ok(L.guildScrolls().every(id => SPELLS[id].discoverCondition.threshold <= 10), 'the Guild sells the easy ones');
ok(L.guildScrolls().includes('fireball') && !L.guildScrolls().includes('stone_cannon'), 'fireball yes, stone cannon no');
ok(L.guildScrolls().every(id => CATALOGS.guild.some(e => e.id === L.spellScrollId(id))), 'all on the Guild shelf');

const none = Object.fromEntries(Object.keys(SPELLS).map(id => [id, 0]));
eq(L.rollSpellScroll(() => 0.5, none, []), null, 'no luck: nothing');
ok(L.rollSpellScroll(() => 0, none, [])?.startsWith('spell_scroll_'), 'luck: a scroll');
const allKnown = Object.fromEntries(Object.keys(SPELLS).map(id => [id, 1]));
eq(L.rollSpellScroll(() => 0, allKnown, []), null, 'all known: nothing');

const arc = L.teachableSpells('arcane');
ok(arc.length >= 5 && arc.every(id => SPELLS[id].element === 'arcane' && SPELLS[id].learnFrom.includes('npc')), 'arcane spells a teacher can give');
const th = id => SPELLS[id].discoverCondition?.threshold ?? 0;
ok(arc.every((id, i) => i === 0 || th(arc[i - 1]) <= th(id)), 'easiest first');
eq(L.spellToTeach(none, 'arcane'), arc[0], 'first lesson: the easiest');
eq(L.spellToTeach({ ...none, [arc[0]]: 2 }, 'arcane'), arc[1], 'then the next');
const knowArc = { ...none, ...Object.fromEntries(arc.map(id => [id, 1])) };
eq(L.spellLessonCheck({}, {}, 'arcane', 3, 999, knowArc).reason, 'none', 'nothing left to teach');
eq(L.spellLessonCheck({}, { arcane: 3 }, 'arcane', 3, 999, none).reason, 'today', 'one a day');
eq(L.spellLessonCheck({ arcane: 1 }, {}, 'arcane', 3, 50, none), { ok: false, reason: 'gold', price: 200, spell: arc[0] }, 'second lesson: 200');
eq(L.spellLessonCheck({}, {}, 'arcane', 3, 500, none), { ok: true, price: 100, spell: arc[0] }, 'a lesson is possible');

// PlayerStats.learnSpell
globalThis.localStorage = globalThis.localStorage ?? { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } };
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const s = new PlayerStats();
const hard = L.SCROLL_SPELLS.find(id => SPELLS[id].discoverCondition.threshold >= 30);
eq(s.learnSpell(hard), true, 'a scroll teaches a spell above your element level');
eq(s.getSpellLevel(hard), 1, '… at Novice only');
eq(s.learnSpell(hard), false, 'already known: false (the scroll is kept)');
ok(ITEMS[L.spellScrollId(hard)].onUse(s) === false, 'using the scroll again does nothing');
console.log(`test_spell_learning: ${n} checks passed`);
```

Match how `tools/test_player_stats.mjs` imports `PlayerStats` and stubs `localStorage`, and use its form if it differs.

- [ ] **Step 2: Run the test and watch it fail.**
Run: `node tools/test_spell_learning.mjs`
Expected: FAIL with "Cannot find module … spellLearning.js".

- [ ] **Step 3: Implement.**

`src/systems/spellLearning.js`:

```js
// Combat C4 (spec §4, "Spells follow the same rule"): a scroll teaches one spell
// at Novice; a teacher gives one spell a lesson, one lesson a day. Higher tiers
// still come only from the element level. Pure — tools/test_spell_learning.mjs.
import { SPELLS } from '../data/spells.js';
import { lessonPrice } from './styles.js';

const th = sp => sp.discoverCondition?.threshold;
export const spellScrollId = id => `spell_scroll_${id}`;
export const SCROLL_SPELLS = Object.values(SPELLS).filter(sp => sp.learnFrom?.includes('scroll') && th(sp) != null).map(sp => sp.id);
export const scrollPrice = sp => 40 + 5 * (th(sp) ?? 0);
export const GUILD_SCROLL_MAX = 10;
export const guildScrolls = () => SCROLL_SPELLS.filter(id => th(SPELLS[id]) <= GUILD_SCROLL_MAX).sort((a, b) => th(SPELLS[a]) - th(SPELLS[b]));

export const ELITE_SCROLL_CHANCE = 0.08;
export function rollSpellScroll(rng, spells, carriedIds = []) {
    if (rng() >= ELITE_SCROLL_CHANCE) return null;
    const carried = new Set(carriedIds);
    const left = SCROLL_SPELLS.filter(id => !(spells?.[id] > 0) && !carried.has(spellScrollId(id)));
    return left.length ? spellScrollId(left[Math.floor(rng() * left.length)]) : null;
}

export const teachableSpells = element => Object.values(SPELLS)
    .filter(sp => sp.element === element && sp.learnFrom?.includes('npc'))
    .sort((a, b) => (th(a) ?? 0) - (th(b) ?? 0)).map(sp => sp.id);
export const spellToTeach = (spells, element) => teachableSpells(element).find(id => !(spells?.[id] > 0)) ?? null;

export function spellLessonCheck(lessons, lessonDay, element, day, gold, spells) {
    const spell = spellToTeach(spells, element);
    if (!spell) return { ok: false, reason: 'none' };
    if (lessonDay[element] === day) return { ok: false, reason: 'today' };
    const price = lessonPrice(lessons[element] ?? 0);
    return gold < price ? { ok: false, reason: 'gold', price, spell } : { ok: true, price, spell };
}
```

`src/data/items.js`, after the manuals:

```js
// Combat C4: one scroll per scroll-taught spell — reading it teaches the spell at Novice.
for (const sid of SCROLL_SPELLS) {
    const sp = SPELLS[sid], id = spellScrollId(sid);
    ITEMS[id] = {
        id, name: `Scroll: ${sp.name}`, spellOf: sid,
        description: `Teaches the ${sp.element} spell ${sp.name} (Novice). Practise ${sp.element} magic for its higher tiers.`,
        color: 0xc8a0ff, icon: 'itm_scroll', stackable: false, rarity: 'uncommon', buyPrice: scrollPrice(sp), sellPrice: Math.floor(scrollPrice(sp) / 4),
        onUse: (stats) => stats.learnSpell(sid),
    };
}
GUILD_CATALOG.push(...guildScrolls().map(sid => ({ id: spellScrollId(sid), price: scrollPrice(SPELLS[sid]), currency: 'gold' })));
```

Notes for this edit:
- `items.js` importing `SPELLS` must not create an import cycle. Check whether `data/spells.js` imports `items.js`. If it does, build the scroll items in `spellLearning.js` and `Object.assign` them from `items.js`, the way `recipeScrolls.js` does, and ledger it.
- `hotbar.js` `canHotbar` excludes `manualOf`; also exclude `spellOf`.

`PlayerStats`:

```js
    // Combat C4: a scroll or a teacher gives a spell at Novice; never lowers a tier.
    learnSpell(id) {
        if (!SPELLS[id] || (this.spells[id] ?? 0) > 0) return false;
        this.spells[id] = 1;
        this._resonanceCallbacks.forEach(fn => fn(id, 1, true));
        this._checkSpellProgress(SPELLS[id].element);
        return true;
    }
```

- Add `spellLessons = {}` and `spellLessonDay = {}` in the constructor and in `reset()`.
- In `SaveManager`, save both, and on load set `stats.spellLessons = { ...(d.spellLessons ?? {}) }`, and the same for `spellLessonDay`.

**Notices:**
- When the inventory's use path gets `false` back from a `spellOf` item, it shows `You already know ${spell name}`. Find where `PlayerStats` line ~771 `success` is consumed in `InventoryScene` (or the hotbar), and add the branch there for `def.spellOf`.
- When it gets `true`, the existing spell-discovery callback shows the notice.

**Elite drop** in `GameScene`, next to the manual:

```js
        const spellScroll = rollSpellScroll(Math.random, playerStats.spells, playerStats.inventory.map(i => i.id));   // Combat C4
        if (spellScroll) enemy.bonusDrops.push(spellScroll);
```

**The priest:**
- `townsfolk/thaloria.js` gets `{ id: 'priest', …, npc: { id: 'priest', name: 'Priest', teachesElement: 'arcane' } }`;
- add a matching `priest` entry to `npcs.js`, in the same shape as `smith` and `sergeant`;
- `_talkToNpc` adds `if (def.teachesElement) { questManager.onTalk(npcId); this._offerSpellLesson(npc, def); return; }` next to the `teaches` branch. `_offerSpellLesson` mirrors `_offerLesson`:
  - work hours: "The priest teaches during working hours";
  - `none`: `I have taught you every ${el} spell I know.`;
  - `today`: "Enough for today. Come back tomorrow.";
  - `gold`: `A lesson is ${price} gold. Come back when you have it.`;
  - otherwise: `I can teach you ${SPELLS[spell].name}, a ${el} spell. A lesson is ${price} gold.`, with the choices "Take a lesson" and "Not now". On pick:
    - `playerStats.gold -= price`;
    - `spellLessons[el]++` and `spellLessonDay[el] = day`;
    - `playerStats.learnSpell(spell)`;
    - a notice: `${name} learned — put it on Q/R/F/T in TOME`;
    - save.

- [ ] **Step 4: Run the tests, then check headless.**
Run: `node tools/test_spell_learning.mjs && npm test > …/c4_t4.log 2>&1; tail -5 …/c4_t4.log`
Then run headless on `?testmap=thaloria_guild_hall`:
- the Guild lists 13 manuals plus the scrolls, and the list scrolls or pages so the last one can be bought. If the shop cannot show all of them, ledger a ruling and trim the scrolls to fit;
- buy and read `spell_scroll_fireball`: the spell is now at tier ≥ 1;
- read it again: it is kept, with the "already know" notice.

Then on `?testmap=thaloria`, at work hours (`playerStats.gameMinutes` set to a working hour, as the C3 sergeant check did):
- talk to the priest and take a lesson: 500 → 400 gold, and the first arcane teachable spell is learned;
- talk again: "Enough for today".
Expected: as described.

- [ ] **Step 5: Commit.**

```bash
git add src/systems/spellLearning.js tools/test_spell_learning.mjs src/data/items.js src/systems/PlayerStats.js src/systems/SaveManager.js src/scenes/GameScene.js src/data/townsfolk/thaloria.js src/data/npcs.js src/systems/hotbar.js package.json tools/test_townsfolk.mjs src/scenes/InventoryScene.js
git commit -m "feat(amo): C4 spells by scroll and teacher — spell scrolls teach Novice (the Guild sells the easy ones, elites drop any); the Thaloria priest teaches arcane spells, one lesson a day"
```

---

### Task 5: The manual, the backlog and memory

**Files:**
- Modify: `tools/gen_game_inventory.mjs`, `docs/manual/index.html` and `docs/game_inventory.md` (both regenerated), `docs/polish_backlog.md`, the memory `project_combat.md`

- [ ] **Step 1: Update the generator.**
  - **"Fighting styles":** the per-style loop skips `later` styles, and a line after the tables reads: "**Coming later:** Hex (wand) and Warder (staff). Their manuals are on sale already — reading one now gives you a head start."
  - **A paragraph on ranged skills:** "Bow, crossbow and wand skills shoot straight ahead, the way you face."
  - **"Learning a style":** the manual row lists the 13 Guild manuals, and a new row explains that spell kills with a wand or staff in hand practise its style.
  - **A new subsection, "Learning spells":** there are three ways, mirroring the style table:
    - practice, by casting in fights, which raises the element level;
    - a **spell scroll**: Novice at once, sold at the Guild for the easy ones, with elites dropping others (8%);
    - **the Thaloria priest**, who teaches arcane spells, one a day for 100, 200, 300… gold.
  - Higher tiers always come from the element level.
  - **An example:** "Seraphina with a wand puts **Snap Cast** on Q and **Echo** on R. She presses R, then casts a fire spell: it bursts twice."

- [ ] **Step 2: Regenerate and check.**
Run: `node tools/gen_game_inventory.mjs && grep -c "Hunter\|Quickcast\|Learning spells" docs/manual/index.html`
Expected: a count of 3 or more. Open the manual section headless, or read the generated markdown, to check the tables.

- [ ] **Step 3: Update the backlog and memory.**
  - **`docs/polish_backlog.md`:**
    - C4 art: skill shots reuse the arrow trail, Release reuses the ring;
    - the Hex/Warder style picker comes with their skills;
    - shots need arrows in C5.
  - **The `project_combat.md` memory:** C4 is done (date 2026-11-08), next is C5, with the C4 rulings in one line.

- [ ] **Step 4: Commit.**

```bash
git add tools/gen_game_inventory.mjs docs/manual/index.html docs/game_inventory.md docs/polish_backlog.md
git commit -m "docs(amo): manual — bow, crossbow, wand and staff styles, spell scrolls and the priest's lessons; C4 art in the polish backlog"
```
