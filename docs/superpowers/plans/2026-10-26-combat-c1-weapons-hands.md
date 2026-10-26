# Combat C0 + C1: Weapons and Two Hands — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Every character holds a main-hand and an off-hand weapon, chosen from 13 weapon types.
- The attack button and the second button each hold a chosen move, with sensible defaults.
- A shield blocks.
- Old saves keep working.
- The manual's new Combat chapter explains all of it.

**Architecture:**
- **A new pure module `src/systems/weapons.js`** describes the 13 types (hands, basic move, timing, reach, damage, animation), the hand rules and the move slots. It is tested in node.
- **`PlayerStats`** gains `equipment.offHand` and `moveSlots`. **`equipment.weapon` stays the main hand**, so saves and the online server keep their shape.
- **`Player.useMove('attack' | 'second')`** runs the resolved move. The existing `_attack`, `_powerSlash` and `_bowStrike` code paths are reused, parameterised by the swinging item's type.

**Tech Stack:** Phaser 3.90, ES modules, Node `assert` tests, headless Chrome via `../tool_suite/lpc_forge/tools/console.mjs`, Python/PIL for the C0 contact sheet.

**Spec:** `docs/superpowers/specs/2026-10-26-combat-weapons-design.md` (sections 1, 2, 6; stages C0 and C1).

## Global Constraints

- **Saves:**
  - Every new save field gets a default in `PlayerStats` (both the constructor and `reset()`).
  - Old saves load without errors, and equipment, known spells and inventory are never lost.
- **Tests:**
  - Every pure module gets a `tools/test_*.mjs` test chained into `npm test`.
  - Every system is checked headless in the running game via `tools/console.mjs` and `window.__game` before it is called done.
  - Existing maps and systems keep working at every step; `npm test` stays green.
- **Controls:** keyboard, gamepad and touch bindings do not change (spec §2): Z / X, the touch attack button and PWR, and the gamepad's same buttons.
- **The manual** (`docs/manual/index.html`, from `tools/gen_game_inventory.mjs --html ../../docs/manual/index.html`) gets its Combat chapter. It is written so a child can follow it: short sentences, tables, a worked example per idea (spec §6).
- **Workflow:** commits go straight to `main`. Working directory: `apps/amo` (paths are relative to it unless they start with `docs/` or `../tool_suite/`).
- **Headless checks:**
  - `console.mjs URL ms --eval "step;;step"` runs `;;`-separated steps 800 ms apart, and a bare `0` is a delay.
  - Print with `console.log('RESULT', …)`.
  - `gs = __game.scene.getScene('GameScene')`. The game's stats object is `gs.player.stats`; never use a dynamic `import()` to change state, because it loads a second copy of the module.
  - A scene launched in one step is active from the next step.
- **Art:**
  - LPC weapon sprites switch hands with direction (spec risk). In C1 only a **shield** is drawn in the off hand. Other off-hand weapons work in play but are not drawn.
  - Art gaps go to `docs/polish_backlog.md`.

## Rulings against the spec (made while planning)

- **`equipment.weapon` stays the name of the main hand,** and `equipment.offHand` is added. The spec says `mainHand`/`offHand`. Keeping `weapon` means no save migration, no server change, and every existing `equipment.weapon` reader keeps meaning "main hand".
- **Move slot ids are hand-relative:** `'main:basic'`, `'main:power'`, `'off:basic'`, `'off:block'`. A slot names a hand and a kind, never an item, so it survives weapon swaps. A slot naming a move that the current gear does not offer falls back to the default.
- **Block is a timed raise:** 700 ms per press, kept raised while the key is held on keyboard or gamepad. It cuts **all** incoming damage by 70%, not only frontal damage, because `Player.takeDamage(amount)` receives no attacker. Touch: each press raises it for 700 ms.
- **The power strike stays gated by the existing `power_slash` skill,** as today. Until it is learned, the second-button default (when it is a power strike) flashes, exactly as X does today.
- **Bare hands are fists.** Today an empty weapon slot behaves like a staff. Two consequences:
  - **Story characters start armed:** Eldrin a Novice Staff, Kael a Longsword, Anya a new Willow Wand, Seraphina an Etched Shortsword and, in the off hand, a Crude Dagger.
  - **A save from before C1 with an empty weapon slot** is given a Novice Staff in the main hand on load, so its basic attack feels the same.
- **Ammunition is not used yet** (C5). The bow, crossbow and wand shoot as the bow does today.
- **Visuals reuse the four existing attack arcs** (`staff`, `spell_blade`, `umbral_dagger`, bow trail). Each type names the arc it borrows. New arc art is polish.
- **Icons for new items reuse existing icons;** better icons go to the polish backlog. **The wand has no LPC art,** so it draws nothing in hand. **The bo staff borrows the cane art.**
- **The Inventory screen gains:**
  - an OFF HAND slot;
  - an "Off hand" action (key **O**, plus clickable `[Equip]` and `[Off hand]` buttons, so touch can equip at all);
  - a **BUTTONS** strip where each of the two buttons cycles through the available moves on click.

## Review Focus

1. **Loading a save from before C1:**
   - an empty weapon slot gets a Novice Staff;
   - a weapon in hand stays in the main hand;
   - nothing in the inventory changes;
   - Continue works.

   Pinned by `test_player_stats` migration tests (Task 2) and the headless save round-trip (Task 7).
2. **Equipping in every combination:**
   - a two-hander while an off-hand item is held;
   - an off-hand item while a two-hander is held;
   - a shield in the main hand;
   - a full satchel.

   You never lose an item, and never end with two items in one hand. Pinned by `test_weapons` plan tests and `test_player_stats` equip tests (Tasks 1–2).
3. **A move slot that no longer fits the gear,** for example "off:basic" after unequipping the off hand. It falls back to the default, never to nothing. Pinned by `resolveMoves` tests (Task 1).
4. **Every weapon type actually damages an enemy** from both buttons, including fists, the wand and the crossbow. Pinned by the headless fight matrix (Task 7).
5. **Blocking while hit by a spell, a melee hit and a projectile:** the damage is reduced by 70% and never below 1. Pinned by a headless block check (Task 7).

---

## File map

| File | Task | Responsibility |
|---|---|---|
| `tools/c0_greatsword_sheet.py` (new, tool), `docs/superpowers/plans/2026-10-26-combat-c1-weapons-hands.md` (C0 result line) | 0 | two-handed sword art check |
| `src/systems/weapons.js` (new), `tools/test_weapons.mjs` (new), `package.json` | 1 | types, hands, moves (pure) |
| `src/systems/PlayerStats.js`, `src/systems/SaveManager.js`, `src/data/characters.js`, `src/scenes/CharacterSelectScene.js`, `tools/test_player_stats.mjs` | 2 | off hand, move slots, starting kits, migration |
| `src/data/items.js`, `src/systems/catalogueLayers.js` | 3 | new weapon items, art layers, attack animations |
| `src/entities/Player.js`, `src/systems/CombatManager.js`, `src/scenes/GameScene.js` | 4 | `useMove`, swings per type, block, ranged generalised |
| `src/scenes/GameScene.js` | 5 | shield drawn in the off hand |
| `src/scenes/InventoryScene.js` | 6 | off-hand slot, equip actions, BUTTONS strip |
| (no source) | 7 | headless checks |
| `tools/gen_game_inventory.mjs`, `docs/manual/index.html`, `docs/game_inventory.md`, `docs/polish_backlog.md` | 8 | Combat chapter, backlog |

---

### Task 0 (C0): Is there a two-handed sword swing?

**Files:**
- Create: `tools/c0_greatsword_sheet.py`
- Modify: this plan, by adding the result line under "C0 result" below

- [ ] **Step 1: Find the candidate art**

Run:
```bash
find public/assets -path '*longsword*' -name '*.png' | head -40; find public/assets -iname '*oversize*' | head -20
```
Expected: the longsword and longsword_alt sheets for `walk`, `slash`, `thrust`, `attack_slash_reverse`, `hurt`, and possibly no `oversize` sheets.

- [ ] **Step 2: Make a contact sheet of the swings**

Create `tools/c0_greatsword_sheet.py`:

```python
#!/usr/bin/env python3
"""C0 (combat spec): a contact sheet of the LPC longsword swings, to judge whether
they can stand in for a two-handed sword. Each LPC sheet is 64x64 frames, rows
up/left/down/right. Usage: python3 tools/c0_greatsword_sheet.py OUT.png PNG [PNG ...]"""
import sys
from PIL import Image

out, paths = sys.argv[1], sys.argv[2:]
rows = []
for p in paths:
    im = Image.open(p).convert('RGBA')
    cols, n = im.width // 64, im.height // 64
    row = Image.new('RGBA', (cols * 64, n * 64), (40, 60, 40, 255))
    row.alpha_composite(im)
    rows.append(row.resize((row.width * 2, row.height * 2), Image.NEAREST))
W, H = max(r.width for r in rows), sum(r.height for r in rows) + 8 * len(rows)
sheet, y = Image.new('RGBA', (W, H), (20, 20, 20, 255)), 0
for r in rows:
    sheet.alpha_composite(r, (0, y))
    y += r.height + 8
sheet.save(out)
print(out, sheet.size)
```

Run it on the longsword `slash` and `attack_slash_reverse` sheets found in Step 1. Those are the weapon layer only; add the male body `slash` sheet as the first path if one exists, for context.

```bash
python3 tools/c0_greatsword_sheet.py /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/c0_longsword.png <the slash png> <the attack_slash_reverse png>
```

- [ ] **Step 3: Decide, by this rule**

Read the PNG.

**The two-handed sword is IN** if both hold:
- in all four directions the blade sweeps a clear arc across at least half a tile;
- the longsword is visibly longer than the one-handed `sword/arming` blade.

In that case it uses `sword/longsword_alt` with the `slash` animation, its own data (slower, wider, heavier), and the `spell_blade` arc.

**Otherwise it is DEFERRED:** Task 3 skips its items, and `weapons.js` keeps the type with `available: false`.

Write the result line under "C0 result" in this plan, in the form `C0 result: IN|DEFERRED — <one sentence on what the sheet showed>`. Ledger it.

**C0 result:** _(filled in by the executor)_

- [ ] **Step 4: Commit**

```bash
git add tools/c0_greatsword_sheet.py ../../docs/superpowers/plans/2026-10-26-combat-c1-weapons-hands.md
git commit -m "chore(amo): C0 — two-handed sword art check (<IN|DEFERRED>)"
```

---

### Task 1: The weapon types, hands and moves (pure)

**Files:**
- Create: `src/systems/weapons.js`, `tools/test_weapons.mjs`
- Modify: `package.json` (`scripts.test`: insert `node tools/test_weapons.mjs && ` directly before `node tools/test_world_content.mjs && `)

**Interfaces:**
- **Produces:**
  - `WEAPON_TYPES`: `{ [type]: { label, hands: 1|2|'off', basic, feel, cooldown, reach, hitbox, dmgMult, range?, anim, arc, available } }`
  - `LEGACY_TYPE`: `{ staff, spell_blade, umbral_dagger, resonance_bow }` → canonical type
  - `typeOf(itemDef | null) → type`; `'fists'` for null, unknown or non-weapon
  - `equipPlan(equipment, itemDef, hand: 'main'|'off') → { slot: 'weapon'|'offHand', clear: string[] } | null`
  - `MOVE_IDS = ['main:basic', 'main:power', 'off:basic', 'off:block']`
  - `movesFor(equipment, itemsById) → [{ id, hand, kind, type, label }]`
  - `defaultMoves(equipment, itemsById) → { attack: moveId, second: moveId }`
  - `resolveMoves(slots, equipment, itemsById) → { attack: move, second: move }` (full move objects)

- [ ] **Step 1: Write the failing test** (`tools/test_weapons.mjs`)

```js
// Combat C1: weapon types, the two hands, and the two move buttons.
// Run: node tools/test_weapons.mjs
import assert from 'node:assert';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const W = await import('../src/systems/weapons.js');
const I = {
    staff1: { id: 'staff1', slot: 'weapon', weaponType: 'staff' },
    sword1: { id: 'sword1', slot: 'weapon', weaponType: 'spell_blade' },
    dag1:   { id: 'dag1',   slot: 'weapon', weaponType: 'umbral_dagger' },
    bow1:   { id: 'bow1',   slot: 'weapon', weaponType: 'resonance_bow' },
    spear1: { id: 'spear1', slot: 'weapon', weaponType: 'spear' },
    shield1:{ id: 'shield1', slot: 'weapon', weaponType: 'shield' },
    wand1:  { id: 'wand1',  slot: 'weapon', weaponType: 'wand' },
    ring:   { id: 'ring',   slot: 'accessory' },
};
const eqp = (weapon = null, offHand = null) => ({ head: null, body: null, weapon, offHand, accessory1: null, accessory2: null });

// ---- types
eq(Object.keys(W.WEAPON_TYPES).sort(), ['axe', 'bo', 'bow', 'crossbow', 'dagger', 'fists', 'greatsword', 'mace', 'shield', 'spear', 'staff', 'sword', 'wand'], 'thirteen types');
for (const [t, d] of Object.entries(W.WEAPON_TYPES)) {
    ok([1, 2, 'off'].includes(d.hands) || t === 'fists', `${t}: hands`);
    ok(d.label && d.basic && d.anim && d.arc && d.cooldown > 0 && d.dmgMult > 0, `${t}: complete`);
}
eq([W.typeOf(I.staff1), W.typeOf(I.sword1), W.typeOf(I.dag1), W.typeOf(I.bow1)], ['staff', 'sword', 'dagger', 'bow'], 'old weapon types map to the new ones');
eq([W.typeOf(null), W.typeOf(I.ring), W.typeOf({ slot: 'weapon', weaponType: 'nope' })], ['fists', 'fists', 'fists'], 'nothing in hand: fists');
ok(W.WEAPON_TYPES.spear.reach > W.WEAPON_TYPES.sword.reach && W.WEAPON_TYPES.dagger.cooldown < W.WEAPON_TYPES.sword.cooldown, 'a spear reaches further, a dagger strikes faster');

// ---- hands
eq(W.equipPlan(eqp(), I.sword1, 'main', I), { slot: 'weapon', clear: [] }, 'a sword in an empty main hand');
eq(W.equipPlan(eqp('sword1'), I.staff1, 'off', I), { slot: 'offHand', clear: [] }, 'full Gandalf: a staff in the off hand');
eq(W.equipPlan(eqp('sword1', 'staff1'), I.bow1, 'main', I), { slot: 'weapon', clear: ['offHand'] }, 'a two-hander frees the off hand');
eq(W.equipPlan(eqp('bow1'), I.dag1, 'off', I), { slot: 'offHand', clear: ['weapon'] }, 'an off-hand item takes the hand back from a two-hander');
eq(W.equipPlan(eqp('sword1'), I.shield1, 'main', I), { slot: 'offHand', clear: [] }, 'a shield always goes in the off hand');
eq(W.equipPlan(eqp('bow1'), I.shield1, 'main', I), { slot: 'offHand', clear: ['weapon'] }, 'a shield takes the off hand back from a two-hander');
eq(W.equipPlan(eqp('sword1'), I.spear1, 'off', I), { slot: 'weapon', clear: ['offHand'] }, 'a two-hander asked for the off hand still takes both hands');
eq(W.equipPlan(eqp('sword1'), I.ring, 'main', I), null, 'not a weapon: not planned here');

// ---- moves
const moves = es => W.movesFor(es, I).map(m => m.id);
eq(moves(eqp('sword1', 'staff1')), ['main:basic', 'main:power', 'off:basic'], 'sword and staff: both basics and the power strike');
eq(moves(eqp('sword1', 'shield1')), ['main:basic', 'main:power', 'off:block'], 'a shield blocks');
eq(moves(eqp('bow1')), ['main:basic', 'main:power'], 'a two-hander: no off hand');
eq(moves(eqp('sword1')), ['main:basic', 'main:power', 'off:basic'], 'an empty off hand punches');
eq(W.movesFor(eqp('sword1'), I).find(m => m.id === 'off:basic').type, 'fists', '… with a fist');
eq(W.defaultMoves(eqp('sword1', 'staff1'), I), { attack: 'main:basic', second: 'off:basic' }, 'defaults: each hand its basic');
eq(W.defaultMoves(eqp('sword1', 'shield1'), I), { attack: 'main:basic', second: 'off:block' }, 'defaults: a shield blocks');
eq(W.defaultMoves(eqp('bow1'), I), { attack: 'main:basic', second: 'main:power' }, 'defaults: a two-hander powers');
eq(W.defaultMoves(eqp('sword1'), I), { attack: 'main:basic', second: 'main:power' }, 'defaults: no off-hand weapon powers');
const r = W.resolveMoves({ attack: 'off:basic', second: 'main:basic' }, eqp('sword1', 'staff1'), I);
eq([r.attack.id, r.attack.type, r.second.id, r.second.type], ['off:basic', 'staff', 'main:basic', 'sword'], 'chosen slots: staff on attack, sword on the second button');
const gone = W.resolveMoves({ attack: 'off:basic', second: 'off:block' }, eqp('bow1'), I);
eq([gone.attack.id, gone.second.id], ['main:basic', 'main:power'], 'slots the gear no longer offers fall back to the defaults');
ok(W.resolveMoves({ attack: null, second: null }, eqp(), I).attack.type === 'fists', 'bare hands: attack is a punch');
eq(W.movesFor(eqp('sword1', 'staff1'), I).map(m => m.label), ['Slash', 'Power Slash', 'Blast'], 'move labels name the weapon move');

console.log(`test_weapons: ${n} checks passed`);
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_weapons.mjs`
Expected: FAIL with `Cannot find module …/src/systems/weapons.js`.

- [ ] **Step 3: Write `src/systems/weapons.js`**

```js
// Combat C1 (docs/superpowers/specs/2026-10-26-combat-weapons-design.md §1-2):
// the weapon types, which hands they take, and the moves the two action buttons
// can hold. Pure — tools/test_weapons.mjs.
//
// equipment.weapon is the MAIN hand (kept for old saves and the server);
// equipment.offHand is the off hand. An empty hand is a fist.
// A move id names a hand and a kind, never an item: 'main:basic', 'main:power',
// 'off:basic', 'off:block' — so a slot survives a weapon swap.

// cooldown ms between swings · reach px from the body to the hit zone · hitbox px
// · dmgMult on the melee formula · range px for ranged types · anim = the LPC
// logical attack animation · arc = which existing attack visual it borrows.
export const WEAPON_TYPES = {
    wand:       { label: 'Wand',             hands: 1,     basic: 'Bolt',       feel: 'quick, light magic — best against one enemy up close', cooldown: 300,  reach: 30, hitbox: 32, dmgMult: 0.75, range: 140, anim: 'spellcast', arc: 'staff',         available: true },
    staff:      { label: 'Staff',            hands: 1,     basic: 'Blast',      feel: 'slow, strong magic — best against a crowd',           cooldown: 400,  reach: 30, hitbox: 40, dmgMult: 1.0,             anim: 'spellcast', arc: 'staff',         available: true },
    bo:         { label: 'Bo staff',         hands: 2,     basic: 'Strike',     feel: 'fast pole blows with good reach',                     cooldown: 360,  reach: 40, hitbox: 44, dmgMult: 0.95,            anim: 'thrust',    arc: 'umbral_dagger', available: true },
    spear:      { label: 'Spear',            hands: 2,     basic: 'Thrust',     feel: 'the longest reach — keep enemies away',               cooldown: 520,  reach: 48, hitbox: 36, dmgMult: 1.15,            anim: 'thrust',    arc: 'spell_blade',   available: true },
    dagger:     { label: 'Dagger',           hands: 1,     basic: 'Stab',       feel: 'very fast, very close',                               cooldown: 260,  reach: 26, hitbox: 32, dmgMult: 0.8,             anim: 'slash',     arc: 'umbral_dagger', available: true },
    sword:      { label: 'One-handed sword', hands: 1,     basic: 'Slash',      feel: 'balanced — good at everything',                       cooldown: 480,  reach: 30, hitbox: 40, dmgMult: 1.0,             anim: 'slash',     arc: 'spell_blade',   available: true },
    greatsword: { label: 'Two-handed sword', hands: 2,     basic: 'Sweep',      feel: 'slow, wide and heavy — for crowds and big hits',      cooldown: 750,  reach: 34, hitbox: 60, dmgMult: 1.6,             anim: 'slash',     arc: 'spell_blade',   available: true },
    mace:       { label: 'Mace',             hands: 1,     basic: 'Smash',      feel: 'slow blows that crack armour',                        cooldown: 600,  reach: 30, hitbox: 40, dmgMult: 1.25,            anim: 'slash',     arc: 'spell_blade',   available: true },
    axe:        { label: 'Axe',              hands: 1,     basic: 'Chop',       feel: 'strong chops that can hit two',                       cooldown: 560,  reach: 30, hitbox: 48, dmgMult: 1.2,             anim: 'slash',     arc: 'spell_blade',   available: true },
    shield:     { label: 'Shield',           hands: 'off', basic: 'Block',      feel: 'hold it up to stop most of the damage',               cooldown: 700,  reach: 0,  hitbox: 0,  dmgMult: 0.5,             anim: 'idle',      arc: 'spell_blade',   available: true },
    bow:        { label: 'Bow',              hands: 2,     basic: 'Shoot',      feel: 'long range — hit them before they reach you',          cooldown: 650,  reach: 30, hitbox: 40, dmgMult: 1.0,  range: 150, anim: 'shoot',     arc: 'bow',           available: true },
    crossbow:   { label: 'Crossbow',         hands: 2,     basic: 'Shoot bolt', feel: 'slow to reload, hits very hard at range',             cooldown: 1100, reach: 30, hitbox: 40, dmgMult: 1.8,  range: 220, anim: 'thrust',    arc: 'bow',           available: true },
    fists:      { label: 'Fists',            hands: 1,     basic: 'Punch',      feel: 'weak but always there',                               cooldown: 300,  reach: 24, hitbox: 30, dmgMult: 0.6,             anim: 'thrust',    arc: 'umbral_dagger', available: true },
};

// The four weapon types items carried before C1
export const LEGACY_TYPE = { staff: 'staff', spell_blade: 'sword', umbral_dagger: 'dagger', resonance_bow: 'bow' };

export function typeOf(def) {
    if (!def || def.slot !== 'weapon') return 'fists';
    const t = LEGACY_TYPE[def.weaponType] ?? def.weaponType;
    return WEAPON_TYPES[t] && t !== 'fists' ? t : 'fists';
}

const twoHanded = def => WEAPON_TYPES[typeOf(def)].hands === 2;

// Where an item goes and what must come off first. null: not a weapon.
// items: id → def, to tell whether the main-hand item is two-handed.
export function equipPlan(equipment, def, hand = 'main', items = {}) {
    if (!def || def.slot !== 'weapon') return null;
    const t = typeOf(def), hands = WEAPON_TYPES[t].hands;
    const mainIsTwoHanded = !!equipment.weapon && twoHanded(items[equipment.weapon]);
    if (hands === 'off') return { slot: 'offHand', clear: mainIsTwoHanded ? ['weapon'] : [] };
    if (hands === 2) return { slot: 'weapon', clear: equipment.offHand ? ['offHand'] : [] };
    if (hand === 'off') return { slot: 'offHand', clear: mainIsTwoHanded ? ['weapon'] : [] };
    return { slot: 'weapon', clear: [] };
}

export const MOVE_IDS = ['main:basic', 'main:power', 'off:basic', 'off:block'];

export function movesFor(equipment, items) {
    const mainDef = equipment.weapon ? items[equipment.weapon] : null;
    const offDef = equipment.offHand ? items[equipment.offHand] : null;
    const main = typeOf(mainDef), out = [];
    out.push({ id: 'main:basic', hand: 'main', kind: 'basic', type: main, label: WEAPON_TYPES[main].basic });
    out.push({ id: 'main:power', hand: 'main', kind: 'power', type: main, label: `Power ${WEAPON_TYPES[main].basic}` });
    if (WEAPON_TYPES[main].hands === 2) return out;
    const off = typeOf(offDef);
    if (off === 'shield') out.push({ id: 'off:block', hand: 'off', kind: 'block', type: 'shield', label: 'Block' });
    else out.push({ id: 'off:basic', hand: 'off', kind: 'basic', type: off, label: WEAPON_TYPES[off].basic });
    return out;
}

export function defaultMoves(equipment, items) {
    const ids = movesFor(equipment, items).map(m => m.id);
    const offWeapon = equipment.offHand && ids.includes('off:basic');
    return { attack: 'main:basic', second: ids.includes('off:block') ? 'off:block' : offWeapon ? 'off:basic' : 'main:power' };
}

export function resolveMoves(slots, equipment, items) {
    const list = movesFor(equipment, items), by = Object.fromEntries(list.map(m => [m.id, m]));
    const d = defaultMoves(equipment, items);
    return { attack: by[slots?.attack] ?? by[d.attack], second: by[slots?.second] ?? by[d.second] };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `node tools/test_weapons.mjs`
Expected: `test_weapons: <n> checks passed` with no assertion error.

- [ ] **Step 5: Chain it and commit**

Edit `package.json` as described under Files. Then:

```bash
npm test 2>&1 | tail -2
git add src/systems/weapons.js tools/test_weapons.mjs package.json
git commit -m "feat(amo): weapon types, two hands and move slots (pure) — 13 types, equip rules, defaults"
```

Expected: the suite has no failure.

---

### Task 2: The off hand, move slots, starting weapons and old saves

**Files:**
- Modify: `src/systems/PlayerStats.js`, `src/systems/SaveManager.js`, `src/data/characters.js`, `src/scenes/CharacterSelectScene.js`, `tools/test_player_stats.mjs`

**Interfaces:**
- **Consumes:** `equipPlan`, `resolveMoves`, `movesFor` (Task 1).
- **Produces:**
  - `stats.equipment.offHand` (default `null`);
  - `stats.moveSlots = { attack: null, second: null }`;
  - `stats.equipItem(itemId, hand = 'main') → bool`;
  - `stats.resolvedMoves() → { attack, second }`;
  - `stats.availableMoves() → move[]`;
  - `stats.setMoveSlot('attack'|'second', moveId|null) → bool`;
  - `stats.giveStartKit(kit)`;
  - `SaveManager` saves and loads `moveSlots` and migrates pre-C1 saves;
  - characters carry `startKit: { weapon, offHand? }`.

- [ ] **Step 1: Write the failing tests** (append to `tools/test_player_stats.mjs`, before its final `console.log`; read the file's top to reuse its `eq`/`ok` helpers and how it builds a `PlayerStats`)

```js
// ---- Combat C1: two hands, move slots, starting kits, old saves
{
    const { PlayerStats } = await import('../src/systems/PlayerStats.js');
    const s = new PlayerStats();
    eq(s.equipment.offHand, null, 'a fresh character has an empty off hand');
    eq(s.moveSlots, { attack: null, second: null }, 'and default buttons');
    const give = id => s.addItem(id, 1);
    give('longsword'); give('novice_staff');
    ok(s.equipItem('longsword') && s.equipItem('novice_staff', 'off'), 'full Gandalf: sword in the main hand, staff in the off hand');
    eq([s.equipment.weapon, s.equipment.offHand], ['longsword', 'novice_staff'], 'both hands held');
    eq([s.resolvedMoves().attack.type, s.resolvedMoves().second.type], ['sword', 'staff'], 'attack slashes, the second button blasts');
    ok(s.setMoveSlot('attack', 'off:basic') && s.setMoveSlot('second', 'main:basic'), 'swap the buttons');
    eq([s.resolvedMoves().attack.type, s.resolvedMoves().second.type], ['staff', 'sword'], 'staff on attack now');
    ok(!s.setMoveSlot('attack', 'off:block'), 'a move the gear does not offer is refused');
    give('hunters_shortbow');
    ok(s.equipItem('hunters_shortbow'), 'a bow takes both hands');
    eq([s.equipment.weapon, s.equipment.offHand], ['hunters_shortbow', null], 'the off hand was freed');
    ok(s.inventory.some(i => i.id === 'novice_staff') && s.inventory.some(i => i.id === 'longsword'), 'nothing lost: both went back to the satchel');
    eq(s.resolvedMoves().attack.id, 'main:basic', 'a stale slot falls back to the default');

    const k = new PlayerStats();
    k.giveStartKit({ weapon: 'etched_shortsword', offHand: 'crude_dagger' });
    eq([k.equipment.weapon, k.equipment.offHand], ['etched_shortsword', 'crude_dagger'], 'Seraphina\'s starting kit: sword and dagger');

    // an old save: no offHand, no moveSlots, empty weapon
    const old = new PlayerStats();
    const data = { equipment: { head: null, body: null, weapon: null, accessory1: null, accessory2: null }, inventory: [] };
    SaveManager.migrateCombatC1(old, data);
    eq(old.equipment.weapon, 'novice_staff', 'an old empty-handed save gets a Novice Staff (it attacked like a staff)');
    const old2 = new PlayerStats();
    old2.equipment.weapon = 'longsword';
    SaveManager.migrateCombatC1(old2, { equipment: { weapon: 'longsword' } });
    eq([old2.equipment.weapon, old2.equipment.offHand], ['longsword', null], 'an old armed save keeps its weapon in the main hand');
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_player_stats.mjs`
Expected: FAIL on `a fresh character has an empty off hand` (`undefined !== null`).

- [ ] **Step 3: Implement in `PlayerStats.js`**

1. **Import** at the top, beside the other imports:

```js
import { equipPlan, resolveMoves, movesFor } from './weapons.js';
```

2. **Both `this.equipment = { … }` lines** (constructor ~101 and `reset()` ~762) become:

```js
this.equipment = { head: null, body: null, weapon: null, offHand: null, accessory1: null, accessory2: null };
```

Directly after each, add:

```js
this.moveSlots = { attack: null, second: null };   // Combat C1: null = the default move
```

3. **Replace `equipItem(itemId)`** with:

```js
    // Equip an item from inventory. Weapons go to a hand (Combat C1): the main hand
    // by default, the off hand on request; two-handers and shields follow
    // weapons.js equipPlan, and whatever they displace returns to the satchel.
    equipItem(itemId, hand = 'main') {
        const def = ITEMS[itemId];
        if (!def?.slot) return false;
        const idx = this.inventory.findIndex(i => i.id === itemId);
        if (idx < 0) return false;

        let eqSlot = def.slot;
        const clear = [];
        if (def.slot === 'weapon') {
            const plan = equipPlan(this.equipment, def, hand, ITEMS);
            eqSlot = plan.slot;
            clear.push(...plan.clear);
        } else if (eqSlot === 'accessory') {
            eqSlot = this.equipment.accessory1 === null ? 'accessory1' : 'accessory2';
        }
        if (!(eqSlot in this.equipment)) return false;

        this.inventory.splice(idx, 1);
        for (const slot of [...clear, eqSlot]) {
            if (this.equipment[slot]) { this._returnEquippedToInventory(slot); this._notifyEquipChange(slot, null); }
        }
        this.equipment[eqSlot] = itemId;
        this._applyEquipStats(itemId);
        this._notifyEquipChange(eqSlot, itemId);
        return true;
    }
```

The item is removed from the satchel **before** displaced items return, so a full satchel can still swap.

4. **Add** after `unequipItem`:

```js
    // Combat C1: the two action buttons
    availableMoves() { return movesFor(this.equipment, ITEMS); }
    resolvedMoves()  { return resolveMoves(this.moveSlots, this.equipment, ITEMS); }
    setMoveSlot(button, moveId) {
        if (!(button in this.moveSlots)) return false;
        if (moveId !== null && !this.availableMoves().some(m => m.id === moveId)) return false;
        this.moveSlots[button] = moveId;
        return true;
    }
    // A new game's weapons (data/characters.js startKit)
    giveStartKit(kit = {}) {
        for (const [slot, hand] of [['weapon', 'main'], ['offHand', 'off']]) {
            const id = kit[slot];
            if (!id || !ITEMS[id]) continue;
            this.addItem(id, 1);
            this.equipItem(id, hand);
        }
    }
```


- [ ] **Step 4: Save, load and the migration** (`SaveManager.js`)

1. **In the save object** (next to `equipment: { ...stats.equipment },`) add:

```js
            moveSlots:     { ...stats.moveSlots },
```

2. **In the load path,** after `if (d.equipment) Object.assign(stats.equipment, d.equipment);` add:

```js
            if (d.moveSlots) Object.assign(stats.moveSlots, d.moveSlots);
            migrateCombatC1(stats, d);
```

3. **Add** this static method to the `SaveManager` class (the load path calls it as `SaveManager.migrateCombatC1(stats, d)`, so write `SaveManager.migrateCombatC1(stats, d);` there instead of the bare call above):

```js
    // Combat C1: before two hands an empty weapon slot attacked like a staff. Such a
    // save (no offHand in its equipment) is given a Novice Staff in the main hand.
    static migrateCombatC1(stats, d) {
        if (d?.equipment && !('offHand' in d.equipment)) {
            stats.equipment.offHand ??= null;
            if (!stats.equipment.weapon && ITEMS.novice_staff) {
                stats.equipment.weapon = 'novice_staff';
                stats._applyEquipStats('novice_staff');   // as a normal equip would
            }
        }
    }
```

Import `ITEMS` from `'../data/items.js'` if `SaveManager.js` does not already.

- [ ] **Step 5: Starting kits**

In `src/data/characters.js`, add a `startKit` to each character:

| id | startKit |
|---|---|
| `eldrin` | `{ weapon: 'novice_staff' }` |
| `eldrin_forge` | `{ weapon: 'novice_staff' }` |
| `kael` | `{ weapon: 'longsword' }` |
| `anya` | `{ weapon: 'willow_wand' }` (the item comes in Task 3; `giveStartKit` skips unknown ids until then) |
| `seraphina` | `{ weapon: 'etched_shortsword', offHand: 'crude_dagger' }` |

In `CharacterSelectScene._launch`, after `playerStats.reset();` add:

```js
            playerStats.giveStartKit(c.startKit);
```

- [ ] **Step 6: Run the tests**

Run: `node tools/test_player_stats.mjs && npm test 2>&1 | tail -2`
Expected: all pass. If an existing `test_player_stats` assertion compared the whole `equipment` object, add `offHand: null` to its expected value; that is the new default, not a loosened test.

- [ ] **Step 7: Commit**

```bash
git add src/systems/PlayerStats.js src/systems/SaveManager.js src/data/characters.js src/scenes/CharacterSelectScene.js tools/test_player_stats.mjs
git commit -m "feat(amo): the off hand and the two move buttons in the save; story heroes start armed; old empty-handed saves get a staff"
```

---

### Task 3: The new weapons as items

**Files:**
- Modify: `src/data/items.js`, `src/systems/catalogueLayers.js`

**Interfaces:**
- **Consumes:** `WEAPON_TYPES` names (Task 1).
- **Produces:**
  - items `willow_wand`, `crystal_wand`, `ash_bo`, `hunting_spear`, `iron_spear`, `claymore` (only if C0 is IN), `iron_mace`, `hand_axe`, `wooden_shield`, `iron_heater`, `light_crossbow`;
  - `WEAPON_ATTACK_ANIM` keyed by canonical type;
  - `offHandLayersForItem(item)`.

- [ ] **Step 1: Write the failing test** (append to `tools/test_weapons.mjs`, before the final `console.log`)

```js
// ---- the new weapon items
{
    const { ITEMS, MERCHANT_CATALOG } = await import('../src/data/items.js');
    const L = await import('../src/systems/catalogueLayers.js');
    const ids = ['willow_wand', 'crystal_wand', 'ash_bo', 'hunting_spear', 'iron_spear', 'iron_mace', 'hand_axe', 'wooden_shield', 'iron_heater', 'light_crossbow'];
    for (const id of ids) {
        const d = ITEMS[id];
        ok(d && d.slot === 'weapon' && W.typeOf(d) !== 'fists' && d.tier >= 1 && d.tier <= 2 && d.name && d.description, `${id}: a tier 1-2 ${W.typeOf(d)}`);
    }
    for (const t of Object.keys(W.WEAPON_TYPES).filter(t => !['fists', 'greatsword'].includes(t))) {
        ok(Object.values(ITEMS).some(d => W.typeOf(d) === t), `at least one ${t} exists`);
        ok(L.WEAPON_ATTACK_ANIM[t], `${t} has an attack animation`);
    }
    for (const id of ['willow_wand', 'ash_bo', 'hunting_spear', 'iron_mace', 'hand_axe', 'wooden_shield', 'light_crossbow']) ok(MERCHANT_CATALOG.some(e => e.id === id), `the Merchant sells ${id}`);
    ok(L.offHandLayersForItem(ITEMS.wooden_shield).length >= 1, 'a shield is drawn');
    eq(L.offHandLayersForItem(ITEMS.crude_dagger), [], 'other off-hand weapons are not drawn yet (polish)');
    ok(L.weaponLayersForItem(ITEMS.hunting_spear).length >= 1 && L.weaponLayersForItem(ITEMS.iron_mace).length >= 1, 'spear and mace are drawn');
}
```

- [ ] **Step 2: Run it to see it fail**

Run: `node tools/test_weapons.mjs`
Expected: FAIL with `willow_wand: a tier 1-2 …`.

- [ ] **Step 3: Add the items** (`src/data/items.js`, in the weapons section, after the last `umbral_dagger` item)

```js
    // ── Combat C1: the new weapon types ──────────────────────────────────────
    willow_wand: {
        id: 'willow_wand', name: 'Willow Wand',
        description: 'A slim willow wand. Quick, light bolts — best against one enemy up close. +2 INT.',
        color: 0x9bbb66, icon: 'itm_wand_01', stackable: false, slot: 'weapon', tier: 1, weaponType: 'wand', rarity: 'common',
        stats: { intelligence: 2 }, buyPrice: 60, sellPrice: 20,
    },
    crystal_wand: {
        id: 'crystal_wand', name: 'Crystal Wand',
        description: 'A wand tipped with clear crystal. Quick bolts that bite harder. +4 INT, +1 AGI.',
        color: 0x99ddff, icon: 'itm_wand_02', stackable: false, slot: 'weapon', tier: 2, weaponType: 'wand', rarity: 'uncommon',
        stats: { intelligence: 4, agility: 1 }, buyPrice: 170, sellPrice: 55,
    },
    ash_bo: {
        id: 'ash_bo', name: 'Ash Bo Staff',
        description: 'A fighting pole of seasoned ash. Fast blows with good reach. Two hands. +2 AGI, +1 STR.',
        color: 0xb08850, icon: 'itm_log', stackable: false, slot: 'weapon', tier: 1, weaponType: 'bo', rarity: 'common',
        stats: { agility: 2, strength: 1 }, buyPrice: 55, sellPrice: 18,
        lpcLayer: [{ type: 'weapon', id: 'polearm/cane/male', itemName: 'cane', zPos: 140 }],
    },
    hunting_spear: {
        id: 'hunting_spear', name: 'Hunting Spear',
        description: 'A plain ash spear with an iron point. The longest reach — keep enemies away. Two hands. +3 STR.',
        color: 0xa0a0a0, icon: 'itm_stone_sword', stackable: false, slot: 'weapon', tier: 1, weaponType: 'spear', rarity: 'common',
        stats: { strength: 3 }, buyPrice: 70, sellPrice: 24,
    },
    iron_spear: {
        id: 'iron_spear', name: 'Iron Spear',
        description: 'A soldier\'s spear, iron from socket to point. Two hands. +5 STR, +1 AGI.',
        color: 0xb8b8c8, icon: 'itm_stone_sword', stackable: false, slot: 'weapon', tier: 2, weaponType: 'spear', rarity: 'uncommon',
        stats: { strength: 5, agility: 1 }, buyPrice: 180, sellPrice: 60,
    },
    iron_mace: {
        id: 'iron_mace', name: 'Iron Mace',
        description: 'A flanged iron head on a short haft. Slow blows that crack armour. +4 STR.',
        color: 0x888899, icon: 'itm_stone', stackable: false, slot: 'weapon', tier: 1, weaponType: 'mace', rarity: 'common',
        stats: { strength: 4 }, buyPrice: 75, sellPrice: 25,
    },
    hand_axe: {
        id: 'hand_axe', name: 'Hand Axe',
        description: 'A woodsman\'s axe balanced for fighting. Strong chops that can hit two. +3 STR, +1 STA.',
        color: 0x996644, icon: 'itm_pickaxe', stackable: false, slot: 'weapon', tier: 1, weaponType: 'axe', rarity: 'common',
        stats: { strength: 3, stamina: 1 }, buyPrice: 70, sellPrice: 23,
    },
    wooden_shield: {
        id: 'wooden_shield', name: 'Wooden Shield',
        description: 'Planks bound in iron. Off hand. Raise it to stop most of the damage. +2 STA.',
        color: 0x8a6a3a, icon: 'itm_wooden_box', stackable: false, slot: 'weapon', tier: 1, weaponType: 'shield', rarity: 'common',
        stats: { stamina: 2 }, buyPrice: 50, sellPrice: 16,
    },
    iron_heater: {
        id: 'iron_heater', name: 'Iron Heater Shield',
        description: 'A knight\'s heater shield faced with iron. Off hand. +4 STA, +1 STR.',
        color: 0x9999aa, icon: 'itm_wooden_box', stackable: false, slot: 'weapon', tier: 2, weaponType: 'shield', rarity: 'uncommon',
        stats: { stamina: 4, strength: 1 }, buyPrice: 160, sellPrice: 52,
    },
    light_crossbow: {
        id: 'light_crossbow', name: 'Light Crossbow',
        description: 'A hunter\'s crossbow. Slow to reload, hits very hard at range. Two hands. +3 AGI, +2 STR.',
        color: 0x7a5a3a, icon: 'itm_bow_02', stackable: false, slot: 'weapon', tier: 1, weaponType: 'crossbow', rarity: 'common',
        stats: { agility: 3, strength: 2 }, buyPrice: 95, sellPrice: 32,
    },
```

**If C0 is IN,** also add:

```js
    claymore: {
        id: 'claymore', name: 'Claymore',
        description: 'A great two-handed sword. Slow, wide, heavy sweeps. Two hands. +6 STR.',
        color: 0xc0c0d0, icon: 'itm_sword_02', stackable: false, slot: 'weapon', tier: 2, weaponType: 'greatsword', rarity: 'uncommon',
        stats: { strength: 6 }, buyPrice: 210, sellPrice: 70,
        lpcLayer: [
            { type: 'weapon', id: 'sword/longsword_alt', zPos: 140 },
        ],
    },
```

and to `MERCHANT_CATALOG`'s T2 section `{ id: 'claymore', price: 210, currency: 'gold' },`.

**If C0 is DEFERRED,** set `available: false` on `greatsword` in `weapons.js` and add nothing.

**In `MERCHANT_CATALOG`**, in the `// T1 weapons` block, add:

```js
    { id: 'willow_wand',           price: 60,  currency: 'glint' },
    { id: 'ash_bo',                price: 55,  currency: 'gold' },
    { id: 'hunting_spear',         price: 70,  currency: 'gold' },
    { id: 'iron_mace',             price: 75,  currency: 'gold' },
    { id: 'hand_axe',              price: 70,  currency: 'gold' },
    { id: 'wooden_shield',         price: 50,  currency: 'gold' },
    { id: 'light_crossbow',        price: 95,  currency: 'gold' },
```

- [ ] **Step 4: Art and animations** (`src/systems/catalogueLayers.js`)

1. **In `WEAPON_TYPE_SPRITE`** add:

```js
    spear:         'polearm/spear/foreground',
    mace:          'blunt/mace',
    axe:           'blunt/waraxe',
    crossbow:      'ranged/crossbow/foreground',
```

2. **Replace `WEAPON_ATTACK_ANIM`** with a canonical-type table, and keep the legacy keys so any old caller still resolves:

```js
// Logical attack animation per weapon type (weapons.js), so attacks read right
// (staves and wands cast, bows shoot, spears thrust, blades slash). Legacy keys kept.
export const WEAPON_ATTACK_ANIM = {
    wand: 'spellcast', staff: 'spellcast', bo: 'thrust', spear: 'thrust', dagger: 'slash', sword: 'slash',
    greatsword: 'slash', mace: 'slash', axe: 'slash', shield: 'idle', bow: 'shoot', crossbow: 'thrust', fists: 'thrust',
    resonance_bow: 'shoot', spell_blade: 'slash', umbral_dagger: 'slash',
};
```

3. **Add** after `weaponLayersForItem`:

```js
// Combat C1: what is drawn in the off hand. Only shields for now — LPC weapon
// sprites switch hands with direction, so other off-hand weapons wait for reworked
// sprites (docs/polish_backlog.md).
const SHIELD_SPRITE = 'heater/original/wood/fg';
export function offHandLayersForItem(item) {
    if (!item || item.weaponType !== 'shield') return [];
    const e = (CATALOGUE.shield ?? []).find(s => s.id === SHIELD_SPRITE);
    return e ? [{ type: 'shield', id: e.id, zPos: e.zPos ?? 150, itemName: e.itemName, anims: e.anims }] : [];
}
```

If `heater/original/wood/fg` is not in `CATALOGUE.shield`, list the ids with `node -e "import('./src/systems/catalogueLayers.js')…"` or by reading `character_catalogue.json`'s `shield` array, pick a plain wooden heater, and record a ruling.

- [ ] **Step 5: Run the tests**

Run: `node tools/test_weapons.mjs && npm test 2>&1 | tail -2`
Expected: pass. The manual generator may list the new items; that is expected.

- [ ] **Step 6: Commit**

```bash
git add src/data/items.js src/systems/catalogueLayers.js src/systems/weapons.js tools/test_weapons.mjs
git commit -m "feat(amo): new weapons — wands, a bo staff, spears, a mace, an axe, shields, a crossbow; the Merchant sells the first of each"
```

---

### Task 4: The buttons swing the chosen move

**Files:**
- Modify: `src/entities/Player.js`, `src/systems/CombatManager.js`, `src/scenes/GameScene.js`

**Interfaces:**
- **Consumes:** `stats.resolvedMoves()` (Task 2), `WEAPON_TYPES` / `typeOf` (Task 1), `WEAPON_ATTACK_ANIM` (Task 3).
- **Produces:**
  - `player.useMove('attack'|'second')`;
  - `player._swingItem`, `player._swingType`, `player._reach`, `player.isBlocking`;
  - `GameScene._bowStrike(px, py, facing, augmented, itemId = equipment.weapon, opts = {})`.

This task changes Phaser code. Its unit tests are the pure ones above; it is proven headless in Task 7, and Step 6 here does a quick smoke check.

- [ ] **Step 1: `Player.js`: the swing per hand**

1. **Import** at the top:

```js
import { WEAPON_TYPES, typeOf } from '../systems/weapons.js';
```

2. **Add** above `triggerAttack()`:

```js
    // Combat C1: run what a button holds (data in weapons.js / stats.resolvedMoves).
    useMove(button) {
        if (!this.active || statusManager.isStunned(this)) return;
        const move = this.stats.resolvedMoves()[button];
        if (!move) return;
        if (move.kind === 'block') { this._block(button); return; }
        if (move.kind === 'power') { this.triggerPower(); return; }
        if (this.attackCooldown > 0 || this.stats.manaExhausted) return;
        this._attack(move.hand);
    }

    // Raise the shield for 700 ms; kept up while the button is held (GameScene
    // passes the held state). Cuts incoming damage by 70% (takeDamage).
    _block() {
        this.isBlocking = true;
        this._blockUntil = this.scene.time.now + WEAPON_TYPES.shield.cooldown;
        this.setTint(0x88aaff);
    }
```

3. **In `update(...)`**, replace the two attack lines:

```js
            if (Phaser.Input.Keyboard.JustDown(attackKey) && this.attackCooldown <= 0) {
                this._attack();
            }
            if (Phaser.Input.Keyboard.JustDown(powerKey)) this.triggerPower();
```

with:

```js
            if (Phaser.Input.Keyboard.JustDown(attackKey)) this.useMove('attack');
            if (Phaser.Input.Keyboard.JustDown(powerKey)) this.useMove('second');
```

Directly after the `if (!this.stats.manaExhausted) { … }` block, add the block hold and expiry:

```js
        if (this.isBlocking) {
            const held = attackKey.isDown && this.stats.resolvedMoves().attack.kind === 'block'
                      || powerKey.isDown && this.stats.resolvedMoves().second.kind === 'block';
            if (held) this._blockUntil = Math.max(this._blockUntil, this.scene.time.now + 100);
            if (this.scene.time.now > this._blockUntil) { this.isBlocking = false; this.clearTint(); }
            else this.setVelocity(this.body.velocity.x * 0.5, this.body.velocity.y * 0.5);
        }
```

4. **`triggerAttack()`** (used by touch through `_tryMainAction`) becomes:

```js
    triggerAttack() { this.useMove('attack'); }
```

5. **`_attack()` becomes `_attack(hand = 'main')`.** Replace its first lines, up to and including `this.play(...)`, with:

```js
    _attack(hand = 'main') {
        const itemId = hand === 'off' ? this.stats.equipment.offHand : this.stats.equipment.weapon;
        const type = typeOf(ITEMS[itemId]);
        const tdef = WEAPON_TYPES[type];
        // The old per-weapon behaviour (mana-augmented strikes, the dagger's second
        // hit, the bow's ranged strike) keys on the item's own legacy weaponType.
        const wt = ITEMS[itemId]?.weaponType ?? type;
        this._swingItem = itemId ?? null;
        this._swingType = type;
        this._reach = tdef.reach;
        this.isAttacking   = true;
        this.isPowerAttack = false;
        this.attackCooldown = this._weaponCooldown(type, itemId);
        this.setVelocity(0);
        this.play(`${this._charDef.animPrefix}_attack_${this.facing}`);
```

Then in the rest of `_attack`:
- Change `this._spawnAttackArc(wt, this.facing);` to `this._spawnAttackArc(tdef.arc === 'bow' ? 'resonance_bow' : tdef.arc, this.facing);`
- Replace the ranged branch condition `if (wt === 'resonance_bow') {` with `if (tdef.range) {`. Inside it, change the call to:

```js
                if (this.active) this.scene._bowStrike?.(this.x, this.y, this.facing, this._augmentedStrike, itemId, { range: tdef.range, dmgMult: tdef.dmgMult, magic: type === 'wand' });
```

- In the melee `else` branch, replace `if (wt === 'umbral_dagger') this.attackHitbox.body.setSize(32, 32);` with `this.attackHitbox.body.setSize(tdef.hitbox, tdef.hitbox);`
- In the tint map lookup `tintMap[wt]`, keep it as is: legacy keys tint as before, and new types fall back to the default.

6. **`_weaponCooldown()` becomes:**

```js
    _weaponCooldown(type = typeOf(ITEMS[this.stats.equipment.weapon]), itemId = this.stats.equipment.weapon) {
        const base  = WEAPON_TYPES[type]?.cooldown ?? 400;
        const swift = ITEMS[itemId]?.enchant === 'swiftness' ? 0.85 : 1;
        return Math.floor(base * swift);
    }
```

7. **`_updateAuxBoxes()`**: change `const reach = 30;` to `const reach = this._reach ?? 30;`.

8. **`_powerSlash()`** records the main hand. After `const wt = this.stats.activeWeaponType;` add:

```js
        this._swingItem = this.stats.equipment.weapon ?? null;
        this._swingType = typeOf(ITEMS[this._swingItem]);
        this._reach = WEAPON_TYPES[this._swingType].reach;
```

9. **`takeDamage(amount)`**: directly before `const ward = …` add:

```js
        // Combat C1: a raised shield stops 70% of the damage
        if (this.isBlocking) amount = Math.max(1, Math.round(amount * 0.3));
```

Make sure `ITEMS` is imported in `Player.js`; it is already used there.

- [ ] **Step 2: `CombatManager.js`: damage by the swinging item and type**

1. **Import:** `import { WEAPON_TYPES } from './weapons.js';`
2. **In `hitTarget`:** change `const weaponId  = stats.equipment.weapon;` to:

```js
        const weaponId  = this.player._swingItem !== undefined ? this.player._swingItem : stats.equipment.weapon;
```

3. **In `_calcDamage`:** change `const wt = stats.activeWeaponType;` to:

```js
        const swingItem  = this.player._swingItem !== undefined ? this.player._swingItem : stats.equipment.weapon;
        const wt         = ITEMS[swingItem]?.weaponType ?? 'fists';
        const typeMult   = WEAPON_TYPES[this.player._swingType ?? 'fists']?.dmgMult ?? 1;
```

Change the forge-upgrade line to use `swingItem`:

```js
        dmg = Math.floor(dmg * typeMult * weaponDamageMult(stats.upgradeLevel?.(swingItem) ?? 0));   // weapon type + forge upgrade
```

- [ ] **Step 3: `GameScene.js`: wiring, ranged and animation**

1. **`_tryPower()`** body becomes `this.player.useMove('second');` (touch PWR). `_tryMainAction` already calls `triggerAttack()`, which now runs `useMove('attack')`.
2. **`_bowStrike(px, py, facing, augmented)`** gains `itemId = playerStats.equipment.weapon, opts = {}`:

```js
    _bowStrike(px, py, facing, augmented, itemId = playerStats.equipment.weapon, opts = {}) {
        const weaponDef  = ITEMS[itemId];
```

   - Change `const range = isVoidPierce ? 220 : 150;` to `const range = isVoidPierce ? 220 : (opts.range ?? 150);`.
   - Change the trail colour to `opts.magic ? [0xaa88ff, 0xffffff] : (isVoidPierce ? … : …)`.
   - In the damage `base` line, replace `stats.equipment.weapon` with `itemId`.
   - Multiply `base` by `(opts.dmgMult ?? 1)`. Keep the rest unchanged.
3. **The animation line** (~3376) becomes:

```js
            const atkAnim = WEAPON_ATTACK_ANIM[this.player._swingType ?? typeOf(ITEMS[playerStats.equipment.weapon])] ?? 'slash';
```

   Import `typeOf` from `'../systems/weapons.js'`.

- [ ] **Step 4: Run the suite**

Run: `npm test 2>&1 | tail -2`
Expected: no failure.

- [ ] **Step 5: Smoke check in the game**

Run:
`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=prologue_forest" 12000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');const s=gs.player.stats;s.addItem('longsword',1);s.addItem('novice_staff',1);s.equipItem('longsword');s.equipItem('novice_staff','off');gs.player.useMove('attack');window.__a=gs.player._swingType;})();;0;;(()=>{const gs=__game.scene.getScene('GameScene');gs.player.useMove('second');console.log('RESULT',JSON.stringify({first:window.__a,second:gs.player._swingType,moves:gs.player.stats.availableMoves().map(m=>m.label)}));})()"`

Expected: `RESULT {"first":"sword","second":"staff","moves":["Slash","Power Slash","Blast"]}` and no `[exception]`.

- [ ] **Step 6: Commit**

```bash
git add src/entities/Player.js src/systems/CombatManager.js src/scenes/GameScene.js
git commit -m "feat(amo): the attack and second buttons swing the chosen move — every weapon type strikes with its own timing, reach and damage; a shield blocks 70%"
```

---

### Task 5: The shield in the off hand

**Files:**
- Modify: `src/scenes/GameScene.js`

- [ ] **Step 1: Draw and update the off-hand layer**

1. **Import** `offHandLayersForItem` with the other `catalogueLayers.js` imports.
2. **Add** after `_updateLpcWeaponLayer`:

```js
    // Combat C1: the off-hand overlay — shields only for now (catalogueLayers.js).
    _updateLpcOffHandLayer(itemId) {
        const container = this._lpcContainer;
        if (!container) return;
        const remove = () => {
            for (const k of Object.keys(container._lpcLayers)) if (k.startsWith('shield:')) this._lpcRenderer.removeLayer(container, k);
        };
        const token = (this._lpcOffToken = (this._lpcOffToken ?? 0) + 1);
        const layers = offHandLayersForItem(ITEMS[itemId]);
        if (!layers.length) { remove(); return; }
        this._lpcRenderer.loadLayers(layers, DEFAULT_ANIMS, () => {
            if (!this._lpcContainer || token !== this._lpcOffToken) return;
            remove();
            for (const layer of layers) this._lpcRenderer.addLayer(this._lpcContainer, layer);
        });
    }
```

3. **In `_onEquipChange`**, replace `if (slot !== 'weapon' || !this._lpcContainer) return; this._updateLpcWeaponLayer(itemId);` with:

```js
            if (!this._lpcContainer) return;
            if (slot === 'weapon') this._updateLpcWeaponLayer(itemId);
            if (slot === 'offHand') this._updateLpcOffHandLayer(itemId);
```

4. **Where the scene re-adds the weapon on create** (`if (this._lpcContainer) this._updateLpcWeaponLayer(playerStats.equipment.weapon);`), add on the next line:

```js
        if (this._lpcContainer) this._updateLpcOffHandLayer(playerStats.equipment.offHand);
```

- [ ] **Step 2: Check it**

Run (sword and shield, then a screenshot):
`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=prologue_forest" 12000 --eval "(()=>{const s=__game.scene.getScene('GameScene').player.stats;s.addItem('longsword',1);s.addItem('wooden_shield',1);s.equipItem('longsword');s.equipItem('wooden_shield');})();;0;;0;;(()=>{const gs=__game.scene.getScene('GameScene');console.log('RESULT',JSON.stringify(Object.keys(gs._lpcContainer._lpcLayers).filter(k=>/^(weapon|shield):/.test(k))));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/c1_shield.png`

Expected: the RESULT lists a `weapon:` and a `shield:` key. Read the screenshot: the character holds the sword and the shield.

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(amo): a shield is drawn in the off hand"
```

---

### Task 6: The Inventory screen: off hand, equip buttons, BUTTONS strip

**Files:**
- Modify: `src/scenes/InventoryScene.js`

- [ ] **Step 1: The off-hand slot**

In `EQUIP_SLOTS`, after the `weapon` entry, add `{ key: 'offHand', label: 'OFF' },`, and change the `weapon` label to `'MAIN'`. The panel's slot height of 76 px stays. If seven slots overflow the panel at the game's 1500×863 size, reduce `slotH` to 64 and `+ i * (slotH + gap)` follows.

- [ ] **Step 2: Equip to a hand, by key and by click**

1. In the item's `pointerdown` handler, replace the `this.actionHint.setText(...)` call with a call to a new `this._showActions(item)`. Keep the description text.
2. Add the method:

```js
    // [Equip] / [Off hand] / [Use] as buttons too, so touch and mouse can act (C1)
    _showActions(item) {
        this._actionBtns?.forEach(b => b.destroy());
        this._actionBtns = [];
        const def = ITEMS[item.id];
        const acts = [];
        if (item.slot) acts.push(['[E] Equip', () => playerStats.equipItem(item.id, 'main')]);
        if (def?.slot === 'weapon' && (def.weaponType === 'shield' || WEAPON_TYPES[typeOf(def)].hands === 1)) acts.push(['[O] Off hand', () => playerStats.equipItem(item.id, 'off')]);
        if (!item.slot) acts.push(['[U] Use', () => { this.input.keyboard.emit('keydown-U'); return false; }]);
        const y = this.actionHint.y, cx = this.actionHint.x;
        this.actionHint.setText('');
        acts.forEach(([label, fn], i) => {
            const b = this.add.text(cx + (i - (acts.length - 1) / 2) * 150, y, label, { font: '14px monospace', fill: '#bbbbee', backgroundColor: '#1a1a40', padding: { x: 6, y: 3 } })
                .setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
                .on('pointerdown', () => { if (fn()) this.scene.restart(); else this.cameras.main.shake(80, 0.007); });
            this._actionBtns.push(b);
        });
    }
```

3. Import `WEAPON_TYPES, typeOf` from `'../systems/weapons.js'`.
4. Next to the `keydown-E` handler, add:

```js
        this.input.keyboard.on('keydown-O', () => {
            const item = inventory[this.selectedIdx];
            if (item && playerStats.equipItem(item.id, 'off')) this.scene.restart();
            else this.cameras.main.shake(80, 0.007);
        });
```

- [ ] **Step 3: The BUTTONS strip**

1. After `this._drawHotbarStrip(...)` in `create()`, add:

```js
        this._drawButtonsStrip(px + 4, py + 56 + 24 + EQUIP_SLOTS.length * 82 + 4 + 18 + 56, EQUIP_PANEL_W);
```

   Use the hotbar strip's height as drawn: 18 for the title, plus the slot size, plus 8. Adjust the `56` to the hotbar's real height if it differs.
2. Add the method:

```js
    // Combat C1: what the two action buttons do — tap to cycle through the moves
    // your weapons offer (Attack = Z / the attack button, Second = X / PWR).
    _drawButtonsStrip(x, y, panelW) {
        this.add.text(x + panelW / 2, y, 'BUTTONS', { font: 'bold 12px monospace', fill: '#8888bb' }).setOrigin(0.5, 0);
        const moves = playerStats.availableMoves(), now = playerStats.resolvedMoves();
        [['attack', 'Attack'], ['second', 'Second']].forEach(([key, label], i) => {
            const by = y + 18 + i * 26, cur = now[key];
            const t = this.add.text(x + 4, by, `${label}: ${cur.label} (${WEAPON_TYPES[cur.type].label})  ▸`, {
                font: '13px monospace', fill: '#ccccee', backgroundColor: '#12122e', padding: { x: 4, y: 3 },
                fixedWidth: panelW - 8,
            }).setInteractive({ useHandCursor: true });
            t.on('pointerdown', () => {
                const at = moves.findIndex(m => m.id === cur.id);
                playerStats.setMoveSlot(key, moves[(at + 1) % moves.length].id);
                this.scene.restart();
            });
        });
    }
```

- [ ] **Step 4: Check it**

Run (open the inventory with sword and staff, cycle the Attack button once):
`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=prologue_forest" 12000 --eval "(()=>{const gs=__game.scene.getScene('GameScene');const s=gs.player.stats;s.addItem('longsword',1);s.addItem('novice_staff',1);s.equipItem('longsword');s.equipItem('novice_staff','off');gs.scene.pause();gs.scene.launch('InventoryScene');})();;0;;(()=>{const inv=__game.scene.getScene('InventoryScene');const t=inv.children.list.find(o=>o.text?.startsWith('Attack:'));t.emit('pointerdown');})();;0;;(()=>{const inv=__game.scene.getScene('InventoryScene');console.log('RESULT',JSON.stringify({rows:inv.children.list.filter(o=>/^(Attack|Second):|^(MAIN|OFF)$/.test(o.text??'')).map(o=>o.text),slots:__game.scene.getScene('GameScene').player.stats.moveSlots}));})()" --shot /tmp/claude-1000/-home-etienne-projects-Arcane-Majesty/1d68fa68-8d61-4501-8daa-134beb536adf/scratchpad/c1_inventory.png`

Expected: `rows` includes `MAIN`, `OFF`, `Attack: Power Slash (One-handed sword)  ▸` (one step on from Slash), and `Second: Blast (Staff)  ▸`; `slots.attack` is `"main:power"`. Read the screenshot: nothing overlaps.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/InventoryScene.js
git commit -m "feat(amo): inventory — main and off hand slots, Equip / Off hand buttons (touch too), and a BUTTONS strip to choose what attack and the second button do"
```

---

### Task 7: Check it all in the running game

**Files:** no source changes, unless a check fails. A fix goes in the owning file with a failing test first, plus a ledger ruling.

- [ ] **Step 1: The fight matrix (Review Focus 4)**

Run (each type in the main hand against the nearest enemy, from both buttons):
`node ../tool_suite/lpc_forge/tools/console.mjs "http://localhost:5174/?testmap=prologue_forest" 40000 --eval "(()=>{window.__ids=['novice_staff','willow_wand','ash_bo','hunting_spear','crude_dagger','longsword','iron_mace','hand_axe','hunters_shortbow','light_crossbow',null];window.__r={};window.__i=0;})();;(()=>{const gs=__game.scene.getScene('GameScene');const s=gs.player.stats;const id=__ids[__i];if(s.equipment.weapon)s.unequipItem('weapon');if(id){s.addItem(id,1);s.equipItem(id);}const e=gs.enemies.getChildren().find(o=>o.active);e.health=e.maxHealth=9999;gs.player.setPosition(e.x-40,e.y);gs.player.facing='right';window.__e=e;window.__h0=e.health;gs.player.attackCooldown=0;gs.player.useMove('attack');})();;0;;(()=>{window.__r[__ids[__i]??'fists']=window.__h0-window.__e.health;window.__i++;})()" ` … repeat the last three steps for all 11 ids … `;;(()=>{console.log('RESULT',JSON.stringify(window.__r));})()"`

Build the `--eval` string with a short python loop that repeats the three steps 11 times, rather than by hand (no shell variables).

Expected: every entry greater than 0. Ranged types (wand, bows) hit at 40 px, inside their range. The crossbow's number is above the bow's, and the dagger's below the sword's for one hit.

- [ ] **Step 2: Block (Review Focus 5)**

Run: equip `longsword` + `wooden_shield`, then:
- `gs.player.useMove('second')` and `gs.player.takeDamage(20)`, recording health lost;
- wait 1 s (block over), then `takeDamage(20)` again.

Expected: about 6 blocked and 20 unblocked (minus any existing ward or skin), and a blocked hit never 0.

- [ ] **Step 3: Save, Continue and an old save (Review Focus 1)**

Run:
1. Equip `longsword` + `novice_staff` in the off hand, and set `moveSlots.attack = 'off:basic'`.
2. Call the game's save, then reload the page with Continue (or call `SaveManager.load` on the game's own `playerStats` through `gs.player.stats` and the save key), and print the equipment and `moveSlots`.

Expected: unchanged after reload.

Then the old-save path: write a save whose `equipment` has no `offHand` and `weapon: null`, load it, and print `equipment.weapon`. Expected: `"novice_staff"`.

Read `SaveManager.js` for the storage key and the save and load calls. Do all of it inside `--eval` steps.

- [ ] **Step 4: New games start armed**

For `kael`, `anya` and `seraphina`, start a new game through `CharacterSelectScene` (or call `playerStats.reset(); playerStats.giveStartKit(CHAR.startKit)` with the character's data read from `__game.registry` or the scene's `_chars`), and print `equipment.weapon`/`offHand`.

Expected:
- Kael: `longsword`;
- Anya: `willow_wand`;
- Seraphina: `etched_shortsword` + `crude_dagger`.

- [ ] **Step 5: Touch and gamepad paths**

Run: `gs._tryMainAction()` with no interactable near, then `gs._tryPower()`, with sword + staff equipped.

Expected: `_swingType` is `sword`, then `staff`. (The gamepad path sends the same keys; `test_input_bus` covers its mapping.)

Write each RESULT into the ledger.

- [ ] **Step 6: Suite**

Run: `npm test 2>&1 | tail -2`
Expected: no failure.

---

### Task 8: The manual's Combat chapter, and the polish backlog

**Files:**
- Modify: `tools/gen_game_inventory.mjs`, `docs/manual/index.html`, `docs/game_inventory.md` (regenerated), `docs/polish_backlog.md`

- [ ] **Step 1: The Combat chapter**

1. **Import** `WEAPON_TYPES` with the other imports in `tools/gen_game_inventory.mjs`:

```js
const { WEAPON_TYPES } = await import(SRC + 'systems/weapons.js');
```

2. **In the Contents list**, insert `'Combat'` after `'Systems & controls'`.
3. **In the controls table**, change `['Z', 'Attack (basic strike)'], ['X', 'Power attack'],` to:

```js
    ['Z', 'Attack button — does the move you chose for it (see Combat)'], ['X', 'Second button — does the move you chose for it (see Combat)'],
```

4. **Directly before** `P('## Character & progression');` insert:

```js
// ------------------------------------------------------------------ combat (Combat C1)
P('## Combat');
P();
P('### Your two hands');
P('You have a **main hand** and an **off hand**. Put a weapon in each, or one big weapon in both.');
P();
P('- **One-handed** weapons (wand, staff, dagger, sword, mace, axe) can go in either hand. Mix them: a sword and a staff, two daggers, a wand and a dagger.');
P('- **Two-handed** weapons (bo staff, spear, two-handed sword, bow, crossbow) take both hands.');
P('- A **shield** goes in the off hand only.');
P('- An **empty hand** is a fist. You can always punch.');
P();
P('To equip: open the satchel (I), pick the weapon, then **Equip** (E) for the main hand or **Off hand** (O). Whatever was in the way goes back into your satchel — you never lose it.');
P();
P('### Your two buttons');
P('**Attack** (Z, or the big attack button) and the **second button** (X, or PWR) each do one move. The game picks good ones when you equip:');
P();
P('- Attack: your main hand\'s move.');
P('- Second button: your off hand\'s move — or **Block** with a shield — or, with nothing in the off hand or a two-handed weapon, your main weapon\'s **power strike** (slower, stronger; learn Power Slash in the skill tree first).');
P();
P('You can change them in the satchel, under **BUTTONS**: tap a button\'s line to switch to the next move.');
P();
P('**Example — Eldrin with a sword and a staff.** He puts the sword in his main hand and the staff in his off hand. Attack slashes, the second button casts a Blast. He prefers magic first, so he taps BUTTONS → Attack until it says *Blast*: now Z casts and X slashes.');
P();
P('**Spells** stay on Q / R / F / T. You can cast them with any weapon in hand — or none.');
P();
P('### The weapons');
table(['Weapon', 'Hands', 'Basic move', 'What it is good for', 'Speed (ms between hits)', 'Reach'],
    Object.entries(WEAPON_TYPES).filter(([, d]) => d.available).map(([, d]) => [
        d.label, d.hands === 'off' ? 'off hand' : d.hands === 2 ? 'two' : 'one', d.basic, d.feel, d.cooldown,
        d.range ? `${d.range} px (ranged)` : d.reach ? `${d.reach} px` : '—',
    ]));
P();
P('### Blocking');
P('With a shield, the Block move raises it: for a moment you take only **30%** of the damage (never less than 1), and you move at half speed. Hold the button to keep it up (keyboard, gamepad); on touch, tap again.');
P();
```

- [ ] **Step 2: Generate and check**

Run: `node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html && grep -c "Your two hands" ../../docs/manual/index.html`
Expected: it writes both files and prints 1. Open `docs/game_inventory.md` at `## Combat` and read it: every weapon row is filled.

- [ ] **Step 3: Polish backlog**

Append under `## Sprites` in `docs/polish_backlog.md`:

```markdown
- **Combat C1 art gaps:** the wand has no LPC art (nothing drawn in hand); the bo staff borrows the cane; off-hand weapons other than shields are not drawn (they work in play); new weapons reuse old icons (spear = stone sword, mace = stone, axe = pickaxe, shield = wooden box, bo = log).
```

- [ ] **Step 4: Suite and commit**

```bash
npm test 2>&1 | tail -2
git add tools/gen_game_inventory.mjs ../../docs/manual/index.html ../../docs/game_inventory.md ../../docs/polish_backlog.md
git commit -m "docs(amo): manual — Combat chapter: two hands, two buttons, every weapon, blocking; polish backlog for C1 art gaps"
```

The push happens after the final review and its fixes (executing-plans).
