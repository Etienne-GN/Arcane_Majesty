# Combat C5: Arrows, Bolts and Quivers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bows and crossbows shoot real arrows and bolts from a quiver: ammunition is crafted, bought, found and partly recovered after a kill; special arrows (broadhead, poison, explosive) do what the spec says.

**Architecture:** Pure rules in a new `src/systems/ammo.js` (ammo kinds, quiver layout, load/refill/pick, getting arrows back), state in `PlayerStats` (`equipment.quiver`, `quiverLoad`), play glue in a new `src/systems/Archery.js` (what an arrow does when it lands) plus small hooks in `Player._attack`, `GameScene._bowStrike`, `StyleSkills.shot`, `Enemy._die`. **The quiver load is a reservation on the pack:** arrows stay in the satchel as normal stacks (so crafting and selling can use them) and `quiverLoad` says how many of each kind are ready. Out of a fight the load tops up from the pack; in a fight it does not.

**Tech Stack:** Phaser 3, plain ES modules, node test scripts (`tools/test_*.mjs`, chained in `npm test`), headless checks with `../tool_suite/lpc_forge/tools/console.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-26-combat-weapons-design.md` §5 (arrows, bolts and quivers), §2 (a move can be "Shoot: Poison Arrow"), §6 (the manual covers arrows).

## Global Constraints

- Quivers: Small 30 / 1 kind, Large 60 / 2 kinds, Hunter's 90 / 3 kinds; a compartment holds arrows *or* bolts of one kind. Without a quiver, 10 arrows can be kept ready.
- "Spare ammunition in the pack refills the quiver automatically after a few seconds with no fighting. In a fight, an empty quiver means you are out ("Out of arrows")."
- Each ammunition recipe makes 10: Basic arrow = 2 Sticks + 1 Feather; Broadhead = 10 basic + 1 Mineral Ore + 1 Resin (+35% damage); Poison arrow = 10 basic + 1 Venom Sac (poisons); Explosive arrow = 10 basic + 1 Ember Stone + 1 Resin (small-area burst); Bolt = 2 Sticks + 1 Mineral Ore.
- Got back on a kill: about 1/3; poison comes back as **basic**; explosive never; "if the killing blow is an explosive arrow, nothing comes back from that enemy."
- Sticks: 1 Wood makes 4, and they sometimes drop when you gather wood. Feathers: dropped by winged creatures, sold cheaply by the Merchant.
- A new character with a bow starts with a small quiver, 30 basic arrows, and a few Sticks and Feathers.
- The Merchant sells basic arrows, bolts, feathers and the small quiver. Large and Hunter's quivers are found or crafted (hide + resin).
- Elemental arrows are C6 (Resonance style) — not items, not in this plan.
- User rules: commit on main and push; no `>>` redirects or shell variables in Bash; English; the manual must explain everything "loud and clear" to a child.

## Review Focus

1. **A save from before C5 with a bow** — the player must still be able to shoot after loading (migration gives the archer kit once); a save without a bow gets nothing new, and no save loses an item.
2. **Switching from bow to crossbow with a one-kind quiver full of arrows** — out of a fight the compartment must switch to bolts, not leave the player stuck on "Out of bolts" with bolts in the pack.
3. **Crafting or selling arrows that are "in" the quiver** — the ready count must drop to what the pack still holds; it must never shoot an arrow that is gone.
4. **Crafting with a full satchel** — the recipe must refuse ("SATCHEL FULL") rather than eat the ingredients and lose the result.
5. **Skill shots (Aimed Shot, Pierce, Headshot…) with an empty quiver** — "Out of arrows", no cooldown spent, no free shot.

Each line has a test in the task that owns the code (Task 1: 2; Task 2: 1, 3; Task 3: 5 headless; Task 4: 4).

---

### Task 1: Ammo rules and data

**Files:**
- Create: `apps/amo/src/systems/ammo.js`
- Modify: `apps/amo/src/systems/weapons.js` (bow/crossbow `ammo` field; `movesFor`/`defaultMoves`/`resolveMoves` take the loaded kinds)
- Modify: `apps/amo/src/data/items.js` (Stick, Feather, the five ammo items, three quivers)
- Create: `apps/amo/tools/test_ammo.mjs`; Modify: `apps/amo/package.json` (chain it)

**Interfaces:**
- Produces: `AMMO`, `AMMO_IDS`, `KIND_CAP = 30`, `NO_QUIVER_CAP = 10`, `REFILL_MS = 3000`, `quiverLayout(def) → {kinds, cap}`, `fitLoad(load, layout, counts) → load`, `refillLoad(load, layout, counts, prefer) → load`, `pickAmmo(load, type, kind?) → index | -1`, `recordHit(target, kind, killed)`, `ammoBack(hits, blownUp, rand) → [{id, qty}]`. A load is an array of `{ id: string|null, qty: number }`, one per compartment.
- Produces: `WEAPON_TYPES.bow.ammo = 'arrow'`, `WEAPON_TYPES.crossbow.ammo = 'bolt'`; `movesFor(equipment, items, loaded = [])` adds `{ id: 'ammo:<itemId>', hand: 'main', kind: 'ammo', ammo: itemId, type, label: 'Shoot: <name>' }` for each loaded kind of the two-hander's ammo type; `resolveMoves(slots, equipment, items, loaded = [])`, `defaultMoves(equipment, items, loaded = [])`.
- Produces item ids: `stick`, `feather`, `basic_arrow`, `broadhead_arrow`, `poison_arrow`, `explosive_arrow`, `bolt`, `small_quiver`, `large_quiver`, `hunters_quiver` (quivers: `slot: 'quiver'`, `quiver: { kinds }`; ammo: `ammo: 'arrow' | 'bolt'`).

- [ ] **Step 1: Write the failing test** `tools/test_ammo.mjs`:

```js
// Combat C5: arrows, bolts and quivers (spec §5). Run: node tools/test_ammo.mjs
import assert from 'node:assert';
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

const A = await import('../src/systems/ammo.js');
const W = await import('../src/systems/weapons.js');
const { ITEMS } = await import('../src/data/items.js');

// ---- data
for (const id of A.AMMO_IDS) ok(ITEMS[id]?.ammo === A.AMMO[id].type && ITEMS[id].stackable, `${id} is a stackable ammo item`);
ok(ITEMS.stick?.stackable && ITEMS.feather?.stackable, 'sticks and feathers stack');
eq([ITEMS.small_quiver, ITEMS.large_quiver, ITEMS.hunters_quiver].map(d => [d.slot, d.quiver.kinds]), [['quiver', 1], ['quiver', 2], ['quiver', 3]], 'three quivers');
eq(W.WEAPON_TYPES.bow.ammo, 'arrow', 'a bow shoots arrows');
eq(W.WEAPON_TYPES.crossbow.ammo, 'bolt', 'a crossbow shoots bolts');
ok(!W.WEAPON_TYPES.wand.ammo, 'a wand needs no ammo');
eq(A.AMMO.broadhead_arrow.mult, 1.35, 'broadhead +35%');
eq(A.AMMO.poison_arrow.back, 'basic_arrow', 'poison comes back as basic');
eq(A.AMMO.explosive_arrow.back, null, 'explosive never comes back');

// ---- layout
eq(A.quiverLayout(null), { kinds: 1, cap: 10 }, 'no quiver: 10 ready');
eq(A.quiverLayout(ITEMS.small_quiver), { kinds: 1, cap: 30 }, 'small: 30');
eq(A.quiverLayout(ITEMS.hunters_quiver), { kinds: 3, cap: 30 }, "Hunter's: 3 × 30");

// ---- fitLoad: never more than the pack holds
const small = A.quiverLayout(ITEMS.small_quiver), hunt = A.quiverLayout(ITEMS.hunters_quiver);
eq(A.fitLoad([{ id: 'basic_arrow', qty: 30 }], small, { basic_arrow: 12 }), [{ id: 'basic_arrow', qty: 12 }], 'crafted or sold away: the load drops');
eq(A.fitLoad([], hunt, {}), [{ id: null, qty: 0 }, { id: null, qty: 0 }, { id: null, qty: 0 }], 'empty compartments');
eq(A.fitLoad([{ id: 'basic_arrow', qty: 5 }, { id: 'bolt', qty: 5 }], small, { basic_arrow: 9, bolt: 9 }), [{ id: 'basic_arrow', qty: 5 }], 'a smaller quiver drops a compartment');

// ---- refillLoad
eq(A.refillLoad([], small, { basic_arrow: 45 }, 'arrow'), [{ id: 'basic_arrow', qty: 30 }], 'fills from the pack, up to 30');
eq(A.refillLoad([{ id: 'basic_arrow', qty: 4 }], small, { basic_arrow: 10 }, 'arrow'), [{ id: 'basic_arrow', qty: 10 }], 'tops up');
eq(A.refillLoad([{ id: 'poison_arrow', qty: 0 }], small, { poison_arrow: 0, basic_arrow: 8 }, 'arrow'), [{ id: 'basic_arrow', qty: 8 }], 'a spent kind leaves; the next one comes in');
eq(A.refillLoad([], hunt, { basic_arrow: 40, poison_arrow: 10, bolt: 20 }, 'arrow'),
    [{ id: 'basic_arrow', qty: 30 }, { id: 'poison_arrow', qty: 10 }, { id: 'bolt', qty: 20 }], 'three kinds: the held weapon\'s first');
eq(A.refillLoad([{ id: 'basic_arrow', qty: 30 }], small, { basic_arrow: 30, bolt: 20 }, 'bolt'), [{ id: 'bolt', qty: 20 }],
    'Review Focus 2: holding a crossbow, a one-kind quiver of arrows switches to bolts');
eq(A.refillLoad([{ id: 'basic_arrow', qty: 30 }], small, { basic_arrow: 30 }, 'bolt'), [{ id: 'basic_arrow', qty: 30 }], 'no bolts in the pack: the arrows stay');

// ---- pickAmmo
const load = [{ id: 'basic_arrow', qty: 0 }, { id: 'poison_arrow', qty: 3 }, { id: 'bolt', qty: 2 }];
eq(A.pickAmmo(load, 'arrow'), 1, 'the first compartment with arrows left');
eq(A.pickAmmo(load, 'bolt'), 2, 'bolts');
eq(A.pickAmmo(load, 'arrow', 'basic_arrow'), -1, 'that kind is spent');
eq(A.pickAmmo(load, 'arrow', 'poison_arrow'), 1, 'a chosen kind');

// ---- getting arrows back
const t = {};
A.recordHit(t, 'basic_arrow', false); A.recordHit(t, 'basic_arrow', false); A.recordHit(t, 'basic_arrow', false);
A.recordHit(t, 'poison_arrow', false); A.recordHit(t, 'explosive_arrow', false);
eq(t._ammoIn, { basic_arrow: 4 }, 'poison counts as basic; explosive not at all');
eq(A.ammoBack({ basic_arrow: 6 }, false, () => 0.99), [{ id: 'basic_arrow', qty: 2 }], 'a third of six');
eq(A.ammoBack({ basic_arrow: 4 }, false, () => 0.99), [{ id: 'basic_arrow', qty: 1 }], 'a third of four, unlucky');
eq(A.ammoBack({ basic_arrow: 4 }, false, () => 0), [{ id: 'basic_arrow', qty: 2 }], 'a third of four, lucky');
eq(A.ammoBack({ basic_arrow: 1 }, false, () => 0.5), [], 'one arrow, unlucky: none');
const k = { _ammoIn: { basic_arrow: 9 } };
A.recordHit(k, 'explosive_arrow', true);
eq(A.ammoBack(k._ammoIn, k._blownUp, () => 0), [], 'an explosive killing blow destroys everything');
eq(A.ammoBack(undefined, false, () => 0), [], 'no arrows in it');

// ---- moves (spec §2: "Shoot: Poison Arrow")
const eqp = { head: null, body: null, weapon: 'hunters_shortbow', offHand: null, accessory1: null, accessory2: null, quiver: null };
const ids = W.movesFor(eqp, ITEMS, ['basic_arrow', 'poison_arrow', 'bolt']).map(m => m.id);
eq(ids, ['main:basic', 'main:power', 'ammo:basic_arrow', 'ammo:poison_arrow'], 'a bow lists its arrow kinds, not bolts');
eq(W.movesFor(eqp, ITEMS, ['poison_arrow']).find(m => m.kind === 'ammo').label, 'Shoot: Poison Arrow', 'the label');
eq(W.resolveMoves({ attack: null, second: 'ammo:poison_arrow' }, eqp, ITEMS, ['poison_arrow']).second.ammo, 'poison_arrow', 'a button can hold it');
eq(W.resolveMoves({ attack: null, second: 'ammo:poison_arrow' }, eqp, ITEMS, []).second.id, 'main:power', 'gone from the quiver: back to the default');
eq(W.movesFor(eqp, ITEMS).length, 2, 'no quiver kinds: as before');

console.log(`✓ ammo tests passed (${n})`);
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/amo && node tools/test_ammo.mjs`
Expected: FAIL — `Cannot find module '../src/systems/ammo.js'`.

- [ ] **Step 3: Write `src/systems/ammo.js`**

```js
// Combat C5 (spec §5): arrows, bolts and quivers. Pure — tools/test_ammo.mjs.
//
// The quiver's load is a reservation on the pack: arrows stay in the satchel as
// normal stacks (so crafting and selling can use them) and the load says how many
// of each kind are ready to shoot, one entry { id, qty } per compartment. Out of a
// fight (REFILL_MS with no attack and no hit taken) the load tops up from the
// pack; in a fight it does not, so an empty quiver means "Out of arrows".

// type: what shoots it · mult: damage · back: what comes back from a kill (null: nothing)
export const AMMO = {
    basic_arrow:     { type: 'arrow', mult: 1,    back: 'basic_arrow' },
    broadhead_arrow: { type: 'arrow', mult: 1.35, back: 'broadhead_arrow' },
    poison_arrow:    { type: 'arrow', mult: 1,    back: 'basic_arrow', status: 'poison' },   // the poison is spent
    explosive_arrow: { type: 'arrow', mult: 1,    back: null, burst: { radius: 48, mult: 0.6 } },
    bolt:            { type: 'bolt',  mult: 1,    back: 'bolt' },
};
export const AMMO_IDS = Object.keys(AMMO);
export const KIND_CAP = 30;        // every quiver compartment holds 30 (small 30, large 60, Hunter's 90)
export const NO_QUIVER_CAP = 10;   // without a quiver, 10 can be kept ready
export const REFILL_MS = 3000;     // this long with no fighting and the quiver refills
export const BACK_SHARE = 1 / 3;   // about a third come back

// def: the worn quiver item, or null
export function quiverLayout(def) {
    return def?.quiver ? { kinds: def.quiver.kinds, cap: KIND_CAP } : { kinds: 1, cap: NO_QUIVER_CAP };
}

// The load cut to the layout, never reserving more than the pack holds
// (counts: id → how many the pack has), first compartments first.
export function fitLoad(load, layout, counts) {
    const left = { ...counts }, out = [];
    for (let i = 0; i < layout.kinds; i++) {
        const c = load?.[i];
        if (!c?.id || !AMMO[c.id]) { out.push({ id: null, qty: 0 }); continue; }
        const qty = Math.max(0, Math.min(c.qty ?? 0, layout.cap, left[c.id] ?? 0));
        left[c.id] = (left[c.id] ?? 0) - qty;
        out.push({ id: c.id, qty });
    }
    return out;
}

// Out of a fight: top every compartment up from the pack. A spent kind leaves its
// compartment; empty compartments take new kinds, the held weapon's (`prefer`:
// 'arrow' | 'bolt') first. When no compartment holds what the weapon shoots and the
// pack has some, the last compartment of the other type makes room for it.
export function refillLoad(load, layout, counts, prefer = 'arrow') {
    const out = fitLoad(load, layout, counts);
    const spare = id => (counts[id] ?? 0) - out.reduce((n, c) => n + (c.id === id ? c.qty : 0), 0);
    for (const c of out) if (c.id && c.qty === 0 && spare(c.id) <= 0) c.id = null;
    const order = [...AMMO_IDS.filter(id => AMMO[id].type === prefer), ...AMMO_IDS.filter(id => AMMO[id].type !== prefer)];
    const wanted = order.find(id => AMMO[id].type === prefer && (counts[id] ?? 0) > 0);
    if (wanted && !out.some(c => AMMO[c.id]?.type === prefer) && !out.some(c => !c.id)) {
        const other = [...out].reverse().find(c => AMMO[c.id]?.type !== prefer);
        if (other) { other.id = null; other.qty = 0; }
    }
    for (const c of out) if (c.id) c.qty += Math.max(0, Math.min(layout.cap - c.qty, spare(c.id)));
    for (const c of out) {
        if (c.id) continue;
        const id = order.find(k => !out.some(o => o.id === k) && (counts[k] ?? 0) > 0);
        if (!id) break;
        c.id = id;
        c.qty = Math.min(layout.cap, counts[id]);
    }
    return out;
}

// The compartment to shoot from: the chosen kind, or the first with ammo of the type. -1: none.
export function pickAmmo(load, type, kind = null) {
    return (load ?? []).findIndex(c => c.qty > 0 && (kind ? c.id === kind : AMMO[c.id]?.type === type));
}

// An arrow or bolt landed in `target` (an enemy). What can come back is counted on
// it; an explosive killing blow marks it so nothing comes back.
export function recordHit(target, kind, killed) {
    const a = AMMO[kind];
    if (!a) return;
    if (a.back) (target._ammoIn ??= {})[a.back] = (target._ammoIn[a.back] ?? 0) + 1;
    if (killed && a.burst) target._blownUp = true;
}

// What comes back when it dies: about a third of each kind (the fraction is a roll).
export function ammoBack(hits, blownUp, rand = Math.random) {
    if (blownUp || !hits) return [];
    return Object.entries(hits).map(([id, n]) => {
        const share = n * BACK_SHARE, whole = Math.floor(share + 1e-9);
        return { id, qty: whole + (rand() < share - whole ? 1 : 0) };
    }).filter(r => r.qty > 0);
}
```

- [ ] **Step 4: Weapons.** In `src/systems/weapons.js` add `ammo: 'arrow'` to the `bow` row and `ammo: 'bolt'` to the `crossbow` row (after `range`), and change the three move functions:

```js
export function movesFor(equipment, items, loaded = []) {
    ...
    if (WEAPON_TYPES[main].hands === 2) {
        // Combat C5: every kind in the quiver this weapon shoots is a move of its own ("Shoot: Poison Arrow")
        const ammo = WEAPON_TYPES[main].ammo;
        for (const id of new Set(loaded)) {
            if (ammo && items[id]?.ammo === ammo) out.push({ id: `ammo:${id}`, hand: 'main', kind: 'ammo', ammo: id, type: main, label: `Shoot: ${items[id].name}` });
        }
        return out;
    }
    ...
}
export function defaultMoves(equipment, items, loaded = []) { const ids = movesFor(equipment, items, loaded).map(m => m.id); ... }
export function resolveMoves(slots, equipment, items, loaded = []) {
    const list = movesFor(equipment, items, loaded), by = ...;
    const d = defaultMoves(equipment, items, loaded);
    ...
}
```
Also add `'ammo:<itemId>'` to the comment above `MOVE_IDS` (the list itself stays the four hand moves).

- [ ] **Step 5: Items.** In `src/data/items.js`, after the `mineral_ore` entry, add a block (no art yet: the inventory draws the colour square; art goes to the polish backlog in Task 5):

```js
    // ── Arrows, bolts and quivers (Combat C5; rules in systems/ammo.js) ──────
    stick: {
        id: 'stick', name: 'Stick', description: 'A straight, dry stick. Two make the shafts for ten arrows or ten bolts. Cut from Wood (1 Wood → 4 Sticks).',
        color: 0xa07850, icon: 'itm_log', stackable: true, buyPrice: 0, sellPrice: 0, onUse: () => false,
    },
    feather: {
        id: 'feather', name: 'Feather', description: 'A flight feather from a winged creature. One fletches ten arrows.',
        color: 0xf0f0e8, icon: 'itm_feather', stackable: true, buyPrice: 1, sellPrice: 0, onUse: () => false,
    },
    basic_arrow: {
        id: 'basic_arrow', name: 'Basic Arrow', description: 'A plain arrow. Shot by a bow from your quiver. About a third come back after a kill.',
        color: 0xc8b088, stackable: true, buyPrice: 1, sellPrice: 0, ammo: 'arrow', onUse: () => false,
    },
    broadhead_arrow: {
        id: 'broadhead_arrow', name: 'Broadhead Arrow', description: 'A wide iron head: +35% damage. About a third come back.',
        color: 0x9999aa, stackable: true, buyPrice: 0, sellPrice: 0, ammo: 'arrow', onUse: () => false,
    },
    poison_arrow: {
        id: 'poison_arrow', name: 'Poison Arrow', description: 'Dipped in venom: the enemy it hits is Poisoned. The poison is spent — about a third come back as basic arrows.',
        color: 0x66cc22, stackable: true, buyPrice: 0, sellPrice: 0, ammo: 'arrow', onUse: () => false,
    },
    explosive_arrow: {
        id: 'explosive_arrow', name: 'Explosive Arrow', description: 'Bursts where it lands and hurts every enemy close by. Nothing comes back from an enemy it kills.',
        color: 0xff6622, stackable: true, buyPrice: 0, sellPrice: 0, ammo: 'arrow', onUse: () => false,
    },
    bolt: {
        id: 'bolt', name: 'Bolt', description: 'A short, heavy crossbow bolt. About a third come back after a kill.',
        color: 0x887766, stackable: true, buyPrice: 1, sellPrice: 0, ammo: 'bolt', onUse: () => false,
    },
    small_quiver: {
        id: 'small_quiver', name: 'Small Quiver', description: 'Holds 30 arrows or bolts of one kind. Out of a fight it refills from your satchel.',
        color: 0x8b5a2b, stackable: false, slot: 'quiver', tier: 1, quiver: { kinds: 1 }, buyPrice: 25, sellPrice: 8,
        onUse: (stats) => stats.equipItem('small_quiver'),
    },
    large_quiver: {
        id: 'large_quiver', name: 'Large Quiver', description: 'Two kinds, 30 of each (60) — say basic and poison arrows.',
        color: 0x6b4423, stackable: false, slot: 'quiver', tier: 2, quiver: { kinds: 2 }, buyPrice: 0, sellPrice: 20,
        onUse: (stats) => stats.equipItem('large_quiver'),
    },
    hunters_quiver: {
        id: 'hunters_quiver', name: "Hunter's Quiver", description: 'Three kinds, 30 of each (90).',
        color: 0x4a3018, stackable: false, slot: 'quiver', tier: 3, quiver: { kinds: 3 }, buyPrice: 0, sellPrice: 40,
        onUse: (stats) => stats.equipItem('hunters_quiver'),
    },
```

- [ ] **Step 6: Run the test**

Run: `cd apps/amo && node tools/test_ammo.mjs && node tools/test_weapons.mjs`
Expected: `✓ ammo tests passed (…)` and the weapons test still passes.

- [ ] **Step 7: Chain and commit.** Add `&& node tools/test_ammo.mjs` to the end of the `test` script in `package.json`; run `npm test`; then:

```bash
git add apps/amo/src/systems/ammo.js apps/amo/src/systems/weapons.js apps/amo/src/data/items.js apps/amo/tools/test_ammo.mjs apps/amo/package.json
git commit -m "feat(amo): C5 ammo rules — quivers, arrows, bolts, sticks and feathers; refill, pick and getting arrows back (pure)"
```

---

### Task 2: The quiver in PlayerStats and saves

**Files:**
- Modify: `apps/amo/src/systems/PlayerStats.js`
- Modify: `apps/amo/src/systems/SaveManager.js`
- Test: `apps/amo/tools/test_ammo.mjs` (append)

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces on `PlayerStats`: `equipment.quiver` (null by default), `quiverLoad` (array), `quiverLayout()`, `quiver()` (the load, fitted to the pack — always call this, never read `quiverLoad` raw), `heldAmmoType() → 'arrow'|'bolt'|null`, `readyAmmo(type) → number`, `spareAmmo(type) → number` (in the pack, not ready), `loadedKinds() → string[]`, `takeAmmo(type, kind?) → itemId|null` (takes one: the load and the pack both drop by one), `refillQuiver(prefer = heldAmmoType() ?? 'arrow') → boolean` (changed?), `giveArcherKit(type)`, `canAddItem(id) → boolean`. `availableMoves()` / `resolvedMoves()` pass `loadedKinds()`.
- Produces on `SaveManager`: `quiverLoad` saved; `migrateCombatC5(stats, d)`.

- [ ] **Step 1: Append the failing tests** to `tools/test_ammo.mjs`, before the final `console.log`:

```js
// ---- PlayerStats
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');
const s = new PlayerStats();
s.satchelTier = 3;
eq(s.equipment.quiver, null, 'a quiver slot, empty');
eq(s.quiverLayout(), { kinds: 1, cap: 10 }, 'no quiver: 10 ready');
s.addItem('hunters_shortbow'); s.equipItem('hunters_shortbow');
eq(s.heldAmmoType(), 'arrow', 'a bow wants arrows');
s.addItem('basic_arrow', 25);
ok(s.refillQuiver(), 'refills');
eq(s.readyAmmo('arrow'), 10, 'ten ready without a quiver');
eq(s.spareAmmo('arrow'), 15, 'fifteen spare in the pack');
s.addItem('small_quiver'); ok(s.equipItem('small_quiver'), 'wear a quiver');
s.refillQuiver();
eq(s.readyAmmo('arrow'), 25, 'the small quiver holds them all');
eq(s.takeAmmo('arrow'), 'basic_arrow', 'shoot one');
eq([s.readyAmmo('arrow'), s.countItem('basic_arrow')], [24, 24], 'the load and the pack both drop');
s.consumeItem('basic_arrow', 20);
eq(s.readyAmmo('arrow'), 4, 'Review Focus 3: used for crafting — the ready count follows the pack');
s.consumeItem('basic_arrow', 4);
eq(s.takeAmmo('arrow'), null, 'out of arrows');
eq(s.loadedKinds(), ['basic_arrow'], 'the spent kind keeps its place until the refill');
s.refillQuiver();
eq(s.loadedKinds(), [], 'refill: the spent kind leaves');
ok(s.canAddItem('basic_arrow') && s.canAddItem('stick'), 'room in the satchel');

// the archer kit (spec §5: a new character with a bow)
const k2 = new PlayerStats();
k2.giveStartKit({ weapon: 'hunters_shortbow' });
eq([k2.equipment.quiver, k2.countItem('basic_arrow'), k2.readyAmmo('arrow')], ['small_quiver', 30, 30], 'a small quiver and 30 arrows, ready');
ok(k2.countItem('stick') > 0 && k2.countItem('feather') > 0, 'a few sticks and feathers');
const k3 = new PlayerStats();
k3.giveStartKit({ weapon: 'novice_staff' });
eq([k3.equipment.quiver, k3.countItem('basic_arrow')], [null, 0], 'a staff: no arrows');

// moves come from the quiver
s.addItem('poison_arrow', 10); s.refillQuiver();
ok(s.availableMoves().some(m => m.id === 'ammo:poison_arrow'), 'Shoot: Poison Arrow is a move');

// saves
const k4 = new PlayerStats();
k4.giveStartKit({ weapon: 'hunters_shortbow' });
k4.takeAmmo('arrow');
SaveManager.save(k4, 'story', 'anya');
const back = new PlayerStats();
SaveManager.load(back, 'story', 'anya');
eq([back.equipment.quiver, back.readyAmmo('arrow')], ['small_quiver', 29], 'the quiver and its load are saved');

// Review Focus 1: a save from before C5
const old = JSON.parse(store.get('amo_save_story_anya'));
delete old.equipment.quiver; delete old.quiverLoad;
old.inventory = old.inventory.filter(i => !['basic_arrow', 'stick', 'feather', 'small_quiver'].includes(i.id));
store.set('amo_save_story_old', JSON.stringify({ ...old, characterId: 'old' }));
const o = new PlayerStats();
SaveManager.load(o, 'story', 'old');
eq([o.equipment.quiver, o.readyAmmo('arrow')], ['small_quiver', 30], 'an old archer gets the kit and can shoot');
const oldMage = { ...old, characterId: 'mage', equipment: { ...old.equipment, weapon: 'novice_staff' }, inventory: [] };
store.set('amo_save_story_mage', JSON.stringify(oldMage));
const m = new PlayerStats();
m.equipment.quiver = 'small_quiver';   // left from the last character in memory
SaveManager.load(m, 'story', 'mage');
eq([m.equipment.quiver, m.countItem('basic_arrow')], [null, 0], 'an old save without a bow: no quiver, nothing added');
```

- [ ] **Step 2: Run it to see it fail**

Run: `cd apps/amo && node tools/test_ammo.mjs`
Expected: FAIL at `a quiver slot, empty` (`undefined` vs `null`).

- [ ] **Step 3: PlayerStats.** Imports: `import { AMMO, AMMO_IDS, quiverLayout, fitLoad, refillLoad, pickAmmo } from './ammo.js';` and add `WEAPON_TYPES, typeOf` to the `./weapons.js` import. Add `quiver: null` to the `equipment` object in **both** the constructor and `reset()`, and `this.quiverLoad = [];` after `moveSlots` in both. Change:

```js
    availableMoves() { return movesFor(this.equipment, ITEMS, this.loadedKinds()); }
    resolvedMoves()  { return resolveMoves(this.moveSlots, this.equipment, ITEMS, this.loadedKinds()); }
```

In `giveStartKit`, after the weapons loop: `const t = typeOf(ITEMS[kit?.weapon]); if (WEAPON_TYPES[t].ammo) this.giveArcherKit(t);`

Add a section after the C2/C3 methods:

```js
    // ── Combat C5: the quiver (rules: systems/ammo.js) ───────────────────────
    // The load reserves arrows that stay in the satchel; quiver() fits it to the
    // pack every time, so crafting or selling them never leaves a ghost arrow.
    quiverLayout() { return quiverLayout(ITEMS[this.equipment.quiver]); }
    _ammoCounts()  { return Object.fromEntries(AMMO_IDS.map(id => [id, this.countItem(id)])); }
    quiver()       { return (this.quiverLoad = fitLoad(this.quiverLoad, this.quiverLayout(), this._ammoCounts())); }
    heldAmmoType() { return WEAPON_TYPES[typeOf(ITEMS[this.equipment.weapon])].ammo ?? null; }
    readyAmmo(type) { return this.quiver().reduce((n, c) => n + (AMMO[c.id]?.type === type ? c.qty : 0), 0); }
    spareAmmo(type) { return AMMO_IDS.filter(id => AMMO[id].type === type).reduce((n, id) => n + this.countItem(id), 0) - this.readyAmmo(type); }
    loadedKinds()  { return this.quiver().filter(c => c.id).map(c => c.id); }
    // One arrow or bolt off the string: the chosen kind, or the first ready. null: out.
    takeAmmo(type, kind = null) {
        const load = this.quiver(), i = pickAmmo(load, type, kind);
        if (i < 0) return null;
        const id = load[i].id;
        load[i].qty--;
        this.consumeItem(id, 1);
        return id;
    }
    // Out of a fight: top the quiver up from the satchel. True when something changed.
    refillQuiver(prefer = this.heldAmmoType() ?? 'arrow') {
        const before = JSON.stringify(this.quiver());
        this.quiverLoad = refillLoad(this.quiverLoad, this.quiverLayout(), this._ammoCounts(), prefer);
        return JSON.stringify(this.quiverLoad) !== before;
    }
    // Spec §5: what a new archer starts with — a small quiver, 30 arrows (bolts for a crossbow), a few Sticks and Feathers.
    giveArcherKit(type) {
        const ammo = type === 'crossbow' ? 'bolt' : 'basic_arrow';
        if (!this.equipment.quiver && this.addItem('small_quiver')) this.equipItem('small_quiver');
        this.addItem(ammo, 30);
        this.addItem('stick', 4);
        this.addItem('feather', 2);
        this.refillQuiver(WEAPON_TYPES[type].ammo);
    }
    // Would addItem(id) find room? (a stack to join, or a free slot)
    canAddItem(id) {
        return (!!ITEMS[id]?.stackable && this.inventory.some(i => i.id === id)) || this.inventory.length < this.getSatchelCapacity();
    }
```

Before committing, run `grep -rn "Object.values(.*equipment)\|Object.entries(.*equipment)\|Object.keys(.*equipment)" apps/amo/src` and check each loop copes with a `quiver` key (a quiver has no `stats`, so `_applyEquipStats` skips it; a renderer that draws every slot must skip ids with no art). Ledger what you find.

- [ ] **Step 4: SaveManager.** In `save()` add after `moveSlots`: `quiverLoad: (stats.quiverLoad ?? []).map(c => ({ id: c.id ?? null, qty: c.qty ?? 0 })),   // Combat C5`. Add the import `import { WEAPON_TYPES, typeOf } from './weapons.js';` and the migration:

```js
    // Combat C5: the quiver. The load is restored; a save from before the quiver
    // (no quiver key in its equipment) has its slot emptied, and an archer — a bow or
    // crossbow worn or carried — gets the archer kit once, so they can still shoot.
    static migrateCombatC5(stats, d) {
        if (!stats?.equipment) return;
        stats.quiverLoad = Array.isArray(d?.quiverLoad) ? d.quiverLoad.map(c => ({ id: c?.id ?? null, qty: c?.qty ?? 0 })) : [];
        if (d?.equipment && 'quiver' in d.equipment) return;
        stats.equipment.quiver = null;
        const ids = [stats.equipment.weapon, stats.equipment.offHand, ...(stats.inventory ?? []).map(i => i.id)];
        const types = new Set(ids.map(id => typeOf(ITEMS[id])).filter(t => WEAPON_TYPES[t]?.ammo));
        for (const t of types) stats.giveArcherKit?.(t);
    }
```

and call `SaveManager.migrateCombatC5(stats, d);` in `load()` right after the C4 `spellLessonDay` line (after the inventory and equipment are restored).

- [ ] **Step 5: Run the tests**

Run: `cd apps/amo && node tools/test_ammo.mjs && npm test`
Expected: `✓ ammo tests passed (…)`, and the whole suite ends with its last `✓` line.

- [ ] **Step 6: Commit**

```bash
git add apps/amo/src/systems/PlayerStats.js apps/amo/src/systems/SaveManager.js apps/amo/tools/test_ammo.mjs
git commit -m "feat(amo): C5 the quiver slot — a load reserved on the satchel, take and refill, the archer kit, saves and the old-save migration"
```

---

### Task 3: Shooting with ammunition

**Files:**
- Create: `apps/amo/src/systems/Archery.js`
- Modify: `apps/amo/src/entities/Player.js` (`useMove`, `_attack`, `takeDamage`: `_fightAt`; "Out of arrows")
- Modify: `apps/amo/src/scenes/GameScene.js` (`_bowStrike` uses the arrow; refill tick; `ammoBack` → pickups with a quantity; `_spawnPickup(x, y, id, qty)`)
- Modify: `apps/amo/src/systems/StyleSkills.js` (skill shots take an arrow; precheck)
- Modify: `apps/amo/src/entities/Enemy.js` (`_die` emits `ammoBack`)

**Interfaces:**
- Consumes: `AMMO`, `REFILL_MS`, `recordHit`, `ammoBack` (Task 1); `takeAmmo`, `readyAmmo`, `refillQuiver`, `heldAmmoType` (Task 2).
- Produces: `ammoImpact(scene, enemy, kind, dmg)` in `Archery.js`; `player._fightAt` (scene time of the last attack, skill, spell or hit taken); `GameScene._spawnPickup(x, y, itemId, qty = 1)`.

- [ ] **Step 1: Write `src/systems/Archery.js`**

```js
// Combat C5: what an arrow or bolt does when it lands. Phaser glue — the rules
// (kinds, what comes back) are in systems/ammo.js.
import Phaser from 'phaser';
import { AMMO, recordHit } from './ammo.js';
import { statusManager } from './StatusManager.js';

// The arrow's own effect on the first enemy it hit, and the count for getting arrows back.
export function ammoImpact(scene, e, kind, dmg) {
    const a = AMMO[kind];
    if (!a) return;
    const killed = !e.active || e.health <= 0;
    recordHit(e, kind, killed);
    if (a.status && !killed) statusManager.apply(e, a.status);
    if (a.burst) burst(scene, e, kind, a.burst, dmg);
}

// An explosive arrow: a ring of fire hurts every other enemy close by.
function burst(scene, first, kind, b, dmg) {
    const x = first.x, y = first.y;
    scene.add.particles(x, y, 'particle', {
        speed: { min: 40, max: 130 }, angle: { min: 0, max: 360 }, scale: { start: 1.1, end: 0 },
        lifespan: { min: 200, max: 420 }, tint: [0xff6622, 0xffcc44, 0xffffff], quantity: 22, explode: true,
    }).setDepth(63);
    scene.cameras.main.shake(90, 0.004);
    for (const o of scene._liveEnemies()) {
        if (o === first || Phaser.Math.Distance.Between(x, y, o.x, o.y) > b.radius) continue;
        const d = Math.max(1, Math.floor(dmg * b.mult * (o === scene.boss ? 0.65 : 1)));
        o.takeDamage(d);
        recordHit(o, kind, !o.active || o.health <= 0);
        scene.combatManager._spawnNumber(o.x, o.y - 20, `${d}`, '#ffaa44', false);
    }
}
```

- [ ] **Step 2: Player.** In `useMove`, change the last line to `this._attack(move.hand, move.ammo ?? null);`. In `_attack(hand = 'main', ammoKind = null)`, right after `const tdef = WEAPON_TYPES[type];`:

```js
        // Combat C5: a bow or crossbow shot takes an arrow or bolt from the quiver
        let ammo = null;
        if (tdef.ammo) {
            ammo = this.stats.takeAmmo(tdef.ammo, ammoKind);
            if (!ammo) { this._outOfAmmo(tdef.ammo, ammoKind); return; }
        }
        this._fightAt = this.scene.time.now;
```

pass `ammo` in the `_bowStrike` opts (`{ range: tdef.range, dmgMult: tdef.dmgMult, magic: type === 'wand', ammo }`), and add:

```js
    // Combat C5: nothing to shoot — say so, and wait a moment before trying again
    _outOfAmmo(type, kind) {
        this.attackCooldown = 400;
        const what = kind ? `${ITEMS[kind]?.name ?? kind}s` : type === 'bolt' ? 'bolts' : 'arrows';
        this.scene.scene.get('UIScene')?.showNotification?.(`Out of ${what}`, 1200);
    }
```

In `takeDamage`, at its top (after any early return for invincibility), add `this._fightAt = this.scene.time.now;`.

- [ ] **Step 3: GameScene.** Imports: `import { AMMO, REFILL_MS, ammoBack } from '../systems/ammo.js';` and `import { ammoImpact } from '../systems/Archery.js';`.
  - In `_bowStrike`: after `const base = …`, `const ammo = opts.ammo ?? null;` and make `let bowDmg = Math.floor((augmented ? base * 1.20 : base) * (AMMO[ammo]?.mult ?? 1));`. Give `applyHit` a third parameter `first = false`; after the damage number, `if (first && ammo) ammoImpact(this, e, ammo, dmg);`. Call it as `applyHit(hits[0].e, 1, true)` (the arrow counts in the first enemy it hits; pierce and bounce hits do not).
  - `_spawnPickup(x, y, itemId, qty = 1)`: set `pickup.qty = qty;`. In the pickup overlap: `const qty = pickup.qty ?? 1; playerStats.addItem(id, qty);` and the notice `Picked up ${qty > 1 ? `${qty} × ` : ''}${ITEMS[id]?.name ?? id.replace(/_/g, ' ')}`.
  - Where enemies get their listeners (next to `enemy.on('dropped', …)`):

```js
        // Combat C5: about a third of the arrows in it come back, on the ground where it fell
        enemy.on('ammoBack', (ax, ay, hits, blownUp) => {
            ammoBack(hits, blownUp).forEach(({ id, qty }, i) => this._spawnPickup(ax - 10 + i * 14, ay + 10, id, qty));
        });
```
  - In `update()`, next to the other per-frame player ticks:

```js
        // Combat C5: REFILL_MS with no fighting and the quiver tops up from the satchel (checked twice a second)
        this._refillAcc = (this._refillAcc ?? 0) + delta;
        if (this._refillAcc >= 500) {
            this._refillAcc = 0;
            if (this.time.now - (this.player?._fightAt ?? -1e9) >= REFILL_MS) playerStats.refillQuiver();
        }
```
  - In `_castSpell`, at the point a spell is actually cast (after its checks pass), `this.player._fightAt = this.time.now;`.

- [ ] **Step 4: Enemy.** In `_die()`, after the `dropped` emit: `if (this._ammoIn || this._blownUp) this.emit('ammoBack', this.x, this.y, this._ammoIn, !!this._blownUp);   // Combat C5`. (The boss is a `BossEnemy` and does not give arrows back — a ruling for the ledger.)

- [ ] **Step 5: StyleSkills.** Imports: `import { AMMO } from './ammo.js';` and `import { ammoImpact } from './Archery.js';`. In `performSkill`, after the release pre-check:

```js
    // Combat C5: a bow or crossbow skill needs an arrow or bolt ready — no shot, no cooldown
    const ammoType = k.kind === 'shot' ? WEAPON_TYPES[k.weapon].ammo : null;
    if (ammoType && !stats.readyAmmo(ammoType)) {
        scene.scene.get('UIScene')?.showNotification?.(`Out of ${ammoType === 'bolt' ? 'bolts' : 'arrows'}`, 1200);
        return false;
    }
    player._fightAt = scene.time.now;
```

and in `shot()`:

```js
function shot(scene, k, mult = k.mult) {
    const player = scene.player, w = WEAPON_TYPES[k.weapon];
    const ammo = w.ammo ? player.stats.takeAmmo(w.ammo) : null;   // C5: the same arrow a plain Shoot would use
    if (w.ammo && !ammo) return [];
    ...
    const base = scene._rangedDamage(...) * (AMMO[ammo]?.mult ?? 1);
    hits.forEach((e, i) => {
        const dmg = Math.max(1, Math.floor(base * mult * (e === scene.boss ? 0.65 : 1)));
        hit(scene, k, e, dmg, false);
        if (i === 0 && ammo) ammoImpact(scene, e, ammo, dmg);
    });
    return hits;
}
```

- [ ] **Step 6: Run the suite**

Run: `cd apps/amo && npm test`
Expected: green to the last `✓` line.

- [ ] **Step 7: Headless check** (game server on :5174, `east_road`, a Gifted bow): equip `hunters_shortbow`, give the archer kit, place one enemy 60 px to the right with 100000 HP, then:
  - shoot once → the ready count drops 30 → 29, the enemy's `_ammoIn` is `{ basic_arrow: 1 }`;
  - set the second button to `ammo:poison_arrow` after adding 10 poison arrows and a refill → `useMove('second')` poisons it;
  - broadhead damage ≈ 1.35 × basic over 30 shots each;
  - an explosive arrow with two enemies 30 px apart hurts both; kill one with it → no `ammoBack` pickup; kill one carrying 6 basic arrows with a basic arrow → a pickup of about 2 Basic Arrows; walking over it adds them;
  - empty the quiver → "Out of arrows", `useMove('attack')` deals nothing; Aimed Shot → `false` and no cooldown (Review Focus 5); stand 3.5 s → the quiver refills from the spare arrows;
  - swap to `light_crossbow` with 20 bolts in the pack and a small quiver of arrows → after 3.5 s the quiver holds bolts (Review Focus 2) and the crossbow shoots.
  Record the numbers in the ledger.

- [ ] **Step 7b: Commit**

```bash
git add apps/amo/src/systems/Archery.js apps/amo/src/entities/Player.js apps/amo/src/entities/Enemy.js apps/amo/src/scenes/GameScene.js apps/amo/src/systems/StyleSkills.js
git commit -m "feat(amo): C5 shooting uses arrows and bolts — out of arrows, the quiver refills out of a fight, broadhead, poison and explosive arrows, a third come back"
```

---

### Task 4: Getting ammunition — crafting, the Merchant, feathers and sticks

**Files:**
- Modify: `apps/amo/src/data/craftingRecipes.js` (category `ammo`, `makes`)
- Modify: `apps/amo/src/scenes/CraftingScene.js` (make `makes`; "SATCHEL FULL")
- Modify: `apps/amo/src/data/items.js` (`MERCHANT_CATALOG` entries with `qty`)
- Modify: `apps/amo/src/scenes/ShopScene.js` (show and buy `qty`)
- Modify: `apps/amo/src/data/worldMap.js` (feathers from winged creatures)
- Modify: `apps/amo/src/data/gathering.js` (sticks from deadwood)
- Test: `apps/amo/tools/test_ammo.mjs` (append)

**Interfaces:**
- Consumes: the item ids from Task 1; `canAddItem` from Task 2.
- Produces: `CRAFTING_RECIPES` rows `{ id, output, category: 'ammo', label, tier, makes, ingredients }`; catalog entries may carry `qty` (how many one purchase gives).

- [ ] **Step 1: Append the failing tests:**

```js
// ---- getting ammunition
const { CRAFTING_RECIPES, CATEGORY_LABELS } = await import('../src/data/craftingRecipes.js');
const { MERCHANT_CATALOG } = await import('../src/data/items.js');
const { YIELD_TABLES } = await import('../src/data/gathering.js');
const WM = await import('../src/data/worldMap.js');
const R = id => CRAFTING_RECIPES.find(r => r.id === id);
const need = r => Object.fromEntries(r.ingredients.map(i => [i.id, i.qty]));
eq([R('stick').makes, need(R('stick'))], [4, { wood: 1 }], '1 Wood makes 4 Sticks');
eq([R('basic_arrow').makes, need(R('basic_arrow'))], [10, { stick: 2, feather: 1 }], 'basic arrows');
eq(need(R('broadhead_arrow')), { basic_arrow: 10, mineral_ore: 1, resin: 1 }, 'broadheads');
eq(need(R('poison_arrow')), { basic_arrow: 10, venom_sac: 1 }, 'poison arrows');
eq(need(R('explosive_arrow')), { basic_arrow: 10, ember_stone: 1, resin: 1 }, 'explosive arrows');
eq([R('bolt').makes, need(R('bolt'))], [10, { stick: 2, mineral_ore: 1 }], 'bolts');
ok(['large_quiver', 'hunters_quiver'].every(id => R(id) && R(id).ingredients.some(i => i.id === 'deer_hide') && R(id).ingredients.some(i => i.id === 'resin')), 'quivers: hide + resin');
ok(CATEGORY_LABELS.ammo, 'a crafting heading');
const shop = Object.fromEntries(MERCHANT_CATALOG.map(e => [e.id, e]));
ok(['basic_arrow', 'bolt', 'feather', 'small_quiver'].every(id => shop[id]), 'the Merchant sells them');
ok(shop.basic_arrow.qty === 10 && shop.bolt.qty === 10, 'arrows and bolts by ten');
ok(!shop.large_quiver && !shop.hunters_quiver, 'the big quivers are crafted');
ok(YIELD_TABLES.deadwood.some(e => e.id === 'stick' && e.chance > 0), 'sticks sometimes drop from deadwood');
const winged = ['cinder_hawk', 'crow', 'carrion_crow', 'turkey', 'chicken', 'heron', 'plague_heron', 'vulture', 'ash_vulture'];
ok(winged.every(t => WM.ENEMY_TYPES[t]?.lootTable?.some(l => l.id === 'feather')), 'winged creatures drop feathers');

// Review Focus 4: no room, no craft
const full = new PlayerStats();
for (let i = 0; i < full.getSatchelCapacity(); i++) full.inventory.push({ id: `junk${i}`, qty: 1 });
ok(!full.canAddItem('stick'), 'a full satchel has no room for a new stack');
```

- [ ] **Step 2: Run to see it fail**

Run: `cd apps/amo && node tools/test_ammo.mjs`
Expected: FAIL at `1 Wood makes 4 Sticks` (`R('stick')` undefined).

- [ ] **Step 3: Recipes.** Append to `CRAFTING_RECIPES`:

```js
    // ── Arrows, bolts and quivers (Combat C5): each arrow recipe makes 10 ─────
    { id: 'stick',           output: 'stick',           category: 'ammo', label: 'Sticks ×4',            tier: 1, makes: 4,  ingredients: [{ id: 'wood', qty: 1 }] },
    { id: 'basic_arrow',     output: 'basic_arrow',     category: 'ammo', label: 'Basic Arrows ×10',     tier: 1, makes: 10, ingredients: [{ id: 'stick', qty: 2 }, { id: 'feather', qty: 1 }] },
    { id: 'bolt',            output: 'bolt',            category: 'ammo', label: 'Bolts ×10',            tier: 1, makes: 10, ingredients: [{ id: 'stick', qty: 2 }, { id: 'mineral_ore', qty: 1 }] },
    { id: 'broadhead_arrow', output: 'broadhead_arrow', category: 'ammo', label: 'Broadhead Arrows ×10', tier: 2, makes: 10, ingredients: [{ id: 'basic_arrow', qty: 10 }, { id: 'mineral_ore', qty: 1 }, { id: 'resin', qty: 1 }] },
    { id: 'poison_arrow',    output: 'poison_arrow',    category: 'ammo', label: 'Poison Arrows ×10',    tier: 2, makes: 10, ingredients: [{ id: 'basic_arrow', qty: 10 }, { id: 'venom_sac', qty: 1 }] },
    { id: 'explosive_arrow', output: 'explosive_arrow', category: 'ammo', label: 'Explosive Arrows ×10', tier: 3, makes: 10, ingredients: [{ id: 'basic_arrow', qty: 10 }, { id: 'ember_stone', qty: 1 }, { id: 'resin', qty: 1 }] },
    { id: 'large_quiver',    output: 'large_quiver',    category: 'ammo', label: 'Large Quiver',         tier: 2, ingredients: [{ id: 'deer_hide', qty: 2 }, { id: 'resin', qty: 1 }] },
    { id: 'hunters_quiver',  output: 'hunters_quiver',  category: 'ammo', label: "Hunter's Quiver",      tier: 3, ingredients: [{ id: 'deer_hide', qty: 3 }, { id: 'wolf_pelt', qty: 1 }, { id: 'resin', qty: 2 }] },
```

and `ammo: 'ARROWS & QUIVERS',` in `CATEGORY_LABELS` (before `enchant`).

- [ ] **Step 4: CraftingScene.** In `_craft`: `else playerStats.addItem(recipe.output, recipe.makes ?? 1);`. In `_blocker`, before the materials check: `if (!recipe.enchant && recipe.category !== 'upgrade' && !playerStats.canAddItem(recipe.output)) return 'SATCHEL FULL';`.

- [ ] **Step 5: Merchant.** In `MERCHANT_CATALOG` after `light_crossbow`:

```js
    // Combat C5: arrows and bolts by ten, feathers by five
    { id: 'basic_arrow',           price: 8,   currency: 'gold', qty: 10 },
    { id: 'bolt',                  price: 12,  currency: 'gold', qty: 10 },
    { id: 'feather',               price: 4,   currency: 'gold', qty: 5 },
    { id: 'small_quiver',          price: 25,  currency: 'gold' },
```

In `ShopScene` buy rows show `${def.name}${entry.qty > 1 ? ` ×${entry.qty}` : ''}` and `_buy` calls `playerStats.addItem(entry.id, entry.qty ?? 1)`.

- [ ] **Step 6: Feathers and sticks.** In `worldMap.js` add `{ id: 'feather', chance: 0.6 }` to the `lootTable` of `cinder_hawk`, `crow`, `carrion_crow`, `turkey`, `chicken`, `heron`, `plague_heron`, `vulture`, `ash_vulture` (bats and moths have no feathers). In `gathering.js` add `{ id: 'stick', chance: 0.30, min: 2, max: 4 }` to `deadwood`.

- [ ] **Step 7: Run the tests**

Run: `cd apps/amo && npm test`
Expected: green to the last line. If a test elsewhere counts merchant entries or crafting recipes exactly, update its count and ledger a ruling.

- [ ] **Step 8: Headless check:** in Thaloria's merchant, buy Basic Arrow ×10 → +10 arrows for 8 gold; at the crafting screen (C) with 1 Wood → Sticks ×4; 2 Sticks + 1 Feather → 10 arrows; with a full satchel the arrow recipe shows SATCHEL FULL and nothing is used. Screenshot the crafting list's ARROWS & QUIVERS heading.

- [ ] **Step 9: Commit**

```bash
git add apps/amo/src/data/craftingRecipes.js apps/amo/src/scenes/CraftingScene.js apps/amo/src/data/items.js apps/amo/src/scenes/ShopScene.js apps/amo/src/data/worldMap.js apps/amo/src/data/gathering.js apps/amo/tools/test_ammo.mjs
git commit -m "feat(amo): C5 getting ammunition — arrow, bolt and quiver recipes (each makes 10), the Merchant sells arrows, bolts, feathers and the small quiver, feathers from winged creatures, sticks from deadwood"
```

---

### Task 5: Seeing it — the quiver slot and the ammo count

**Files:**
- Modify: `apps/amo/src/scenes/InventoryScene.js` (QUIVER slot with its load)
- Modify: `apps/amo/src/scenes/UIScene.js` (the weapon label shows arrows ready and spare)
- Modify: `docs/polish_backlog.md` (C5 art)

**Interfaces:**
- Consumes: `quiver()`, `readyAmmo`, `spareAmmo`, `heldAmmoType`, `quiverLayout` (Task 2).

- [ ] **Step 1: Inventory.** Add `{ key: 'quiver', label: 'QUIVER' }` to `EQUIP_SLOTS` after `offHand`. Under the slot's name (equipped or not), one small line: the ready kinds, e.g. `Basic 24 · Poison 10`, or `none — 10 arrows ready` when no quiver is worn and nothing is loaded (`font: '11px monospace', fill: '#998866'`). Check the panel still fits at 1500×863: if the buttons strip runs past `py + ph - 52`, cut `SLOT_H` from 58 to 52 and ledger it.

- [ ] **Step 2: HUD.** In `UIScene.update`, after the weapon label text: when `stats.heldAmmoType()` is set, append ` ➶ ${ready} (+${spare})` using `readyAmmo` / `spareAmmo`, red (`#ff6655`) when `ready` is 0.

- [ ] **Step 3: Run the suite** — `cd apps/amo && npm test` → green.

- [ ] **Step 4: Headless screenshots** (1500×863): the Inventory with a Small Quiver worn (`Basic 29`) and the HUD label `[Bow] ➶ 29 (+0)`; with no arrows the label is red. Read both screenshots.

- [ ] **Step 5: Backlog.** Add to `docs/polish_backlog.md` under the combat section: "C5 art: icons for Stick, Basic/Broadhead/Poison/Explosive Arrow, Bolt and the three quivers (now colour squares); a quiver drawn on the character's back; an arrow sprite in flight (now a particle trail)."

- [ ] **Step 6: Commit**

```bash
git add apps/amo/src/scenes/InventoryScene.js apps/amo/src/scenes/UIScene.js docs/polish_backlog.md
git commit -m "feat(amo): C5 the quiver slot in the satchel and the arrows-ready count on the HUD; C5 art in the polish backlog"
```

---

### Task 6: The manual

**Files:**
- Modify: `apps/amo/tools/gen_game_inventory.mjs`
- Regenerated: `docs/game_inventory.md`, `docs/manual/index.html`

- [ ] **Step 1:** In the Combat chapter, after "### Learning spells" and before "### Spells and the elements", add `### Arrows, bolts and quivers`, generated from the data (import `AMMO`, `KIND_CAP`, `NO_QUIVER_CAP`, `REFILL_MS` from `systems/ammo.js`, `CRAFTING_RECIPES`, `MERCHANT_CATALOG`):
  - short sentences: a bow shoots arrows, a crossbow bolts; only what is in your quiver can be shot; out of a fight (REFILL_MS / 1000 s with no fighting) the quiver fills itself from your satchel; in a fight, an empty quiver means "Out of arrows"; without a quiver you can keep NO_QUIVER_CAP ready;
  - a quiver table (name, holds, kinds, where: Merchant price / crafting ingredients);
  - an ammunition table (name, recipe and how many it makes, what it does, what comes back), with Sticks (1 Wood → 4) and Feathers (winged creatures; the Merchant);
  - "Getting arrows back": about a third, on the ground where the enemy fell; poison arrows come back as basic; an explosive arrow that kills destroys every arrow in that enemy; the boss keeps them;
  - how to pick an arrow: open the satchel (I), click the Second button until it says "Shoot: Poison Arrow"; plain Shoot and the bow skills use the first kind in the quiver;
  - one worked example: "Anya with a bow and a Large Quiver: basic arrows in the first compartment, poison arrows in the second. Attack shoots basic arrows; she puts **Shoot: Poison Arrow** on the second button for the wolf leader."
  Also drop "(Scrolls and tomes add to the feel; teachers are coming.)" only if it is now wrong — leave it otherwise.

- [ ] **Step 2:** Run `cd apps/amo && node tools/gen_game_inventory.mjs` and read the new section in `docs/game_inventory.md`; the manual server regenerates `docs/manual/index.html` (or run its generator the same way C4 did).

- [ ] **Step 3:** `npm test` → green. Commit:

```bash
git add apps/amo/tools/gen_game_inventory.mjs docs/game_inventory.md docs/manual/index.html
git commit -m "docs(amo): manual — arrows, bolts and quivers: crafting, refilling, getting arrows back, picking an arrow"
```

- [ ] **Step 4:** Update the memory file `project_combat.md` (C5 done; next C6) and push: `git push origin main`.
