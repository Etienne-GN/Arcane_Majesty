# Mechanics Expansion — Phase 3: Economy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the loop around combat an economy:
- a consumable hotbar on keys 1–4
- gold and glint with distinct roles, plus a real buy-back
- cooking hearths and alchemy tables with craft ranks
- recipe scrolls that unlock rare recipes
- +1/+2/+3 gear upgrades at the forge

**Architecture:** Every rule lives in a Phaser-free module that a node test imports:
- `src/systems/hotbar.js`: assign, use, shared cooldown
- `src/data/economy.js`: item currency, shop prices, buy-back list
- `src/data/stations.js`: recipe station and rank, craft ranks, double-output roll, what a fire or station can make
- `src/data/recipeScrolls.js`: scroll-locked recipes, scroll items, the elite scroll roll
- `src/data/upgrades.js`: upgrade cost, upgraded stats, damage multiplier, the "+N" label

`PlayerStats` and `SaveManager` gain four saved fields with defaults. `GameScene`, `UIScene`, `InventoryScene`, `ShopScene`, `CampfireScene` and `CraftingScene` call the modules. One new test file covers all of it: `tools/test_phase3_economy.mjs`.

**Tech Stack:** Phaser 3.90, ES modules, node test scripts, Vite 6.

**Spec:** `docs/superpowers/specs/2026-09-30-mechanics-expansion-design.md` — Phase 3 (C2, C5, C1, C3, C4).

## Global Constraints

- Work in `apps/amo`; commit directly on `main`, one commit per task. End every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No new npm dependencies. Pure rules go in Phaser-free modules, and `tools/test_phase3_economy.mjs` runs under plain `node` and is added to `npm test`.
- Old saves keep loading. The four new save fields, `hotbar`, `craftCounts`, `knownRecipes` and `gearUpgrades`, each default when missing (`[null,null,null,null]`, `{cooking:0,alchemy:0}`, `[]`, `{}`), and `reset()` clears them.
- New names are generic objects only: "Cooking Hearth", "Alchemy Table" and "Recipe: <existing dish/potion name>". There are no new places, NPCs or lore names, so no DB write is needed. The placements use the existing maps `hermit_hut`, `thaloria` and `eldrin_tower`, whose names the spec already checked against the lore DB.
- After every task, `npm test` and `npx vite build` must pass.
- Task 7 regenerates the manual with `node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html` and commits `docs/manual/index.html` and `docs/game_inventory.md`.
- English everywhere.

## Review Focus

1. **A hotbar slot whose item runs out, or was sold, dropped or never owned.** The slot keeps its item and shows 0 greyed out. Pressing it does nothing and doesn't start the cooldown. When the item comes back, the slot works again. (Task 1 test.)
2. **Upgrading an equipped armour piece, then unequipping it, then loading the save.** Attributes and max HP return exactly to their base values, with no stat drift from applying the bonus at one level and removing it at another. (Task 6 test.)
3. **The shop's regional discount meets the single currency.** A rural map discounts gold items only, an outskirt map discounts glint items only, and the price shown is the price charged. A buy-back is charged in the currency it was sold for. The buy-back list never holds more than 10 entries. (Task 2 test.)
4. **A scroll-locked recipe whose ingredients the player has already seen.** It stays hidden, not even shown as "???", until the scroll is read. Reading the scroll again does nothing and doesn't consume it. (Task 5 test.)
5. **A station recipe at a campfire, or a rank-2 recipe at a rank-1 station.** It isn't listed there at all, and craft counts only rise on a successful craft. (Task 3 test.)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/systems/hotbar.js` (create) | `HOTBAR_SIZE`, `canHotbar`, `assignHotbar`, `hotbarView`, `useHotbar` |
| `src/data/economy.js` (create) | `itemCurrency`, `shopPrice`, `recordSale`, `BUYBACK_MAX` |
| `src/data/stations.js` (create) | `STATION_RECIPES`, `recipeStation`, `craftRank`, `extraOutput`, `availableRecipes`, `STATION_LABELS` |
| `src/data/recipeScrolls.js` (create) | `SCROLL_RECIPES`, `scrollId`, `scrollItems()`, `isLocked`, `rollEliteScroll` |
| `src/data/upgrades.js` (create) | `UPGRADE_MAX`, `upgradeCost`, `upgradedStats`, `weaponDamageMult`, `upgradeLabel` |
| `src/data/items.js` (modify) | `MERCHANT_CATALOG` gets `{ id, price, currency }`; recipe scroll items merged into `ITEMS` |
| `src/systems/PlayerStats.js`, `SaveManager.js` (modify) | the four new fields; `learnRecipe`, `upgradeLevel`, `upgradeEquipped`; equip stats through `upgradedStats` |
| `src/scenes/GameScene.js` (modify) | keys 1–4 → hotbar; stations group + interaction; elite scroll drop; boss scroll; bow damage × upgrade |
| `src/scenes/UIScene.js` (modify) | the hotbar HUD: bottom centre on desktop, above the skill ring when the touch deck is shown |
| `src/scenes/InventoryScene.js` (modify) | keys 1–4 assign the selected item to the hotbar; "+N" names |
| `src/scenes/ShopScene.js` (modify) | one price per item, currency-aware selling, 10-slot buy-back |
| `src/scenes/CampfireScene.js` (modify) | station mode (one tab), rank filter, scroll lock, craft counts, double output |
| `src/scenes/CraftingScene.js` (modify) | "UPGRADE EQUIPPED" category |
| `src/systems/CombatManager.js` (modify) | melee damage × `weaponDamageMult` |
| `src/scenes/BootScene.js` (modify) | load the three alchemy table spritesheets |
| `src/data/maps/hermit_hut.js`, `_stubs.js`/`thaloria.js`, `eldrin_tower.js` (modify) | `spawns.stations` |
| `src/data/quests.js`, map chests (modify) | scroll rewards and chest scrolls |
| `tools/test_phase3_economy.mjs` (create), `tools/test_economy.mjs` (modify), `package.json` | tests |
| `tools/gen_game_inventory.mjs` (modify) | hotbar key, currencies, stations, ranks, scrolls, upgrades in the manual |

---

### Task 1: Consumable hotbar (C2)

**Files:**
- Create `src/systems/hotbar.js` and `tools/test_phase3_economy.mjs`.
- Modify:
  - `PlayerStats.js`: `hotbar` in the constructor and in `reset()`.
  - `SaveManager.js`: save and load.
  - `GameScene.js`: keys ONE–FOUR and `_useHotbar(i)`.
  - `UIScene.js`: the HUD.
  - `InventoryScene.js`: assigning with 1–4.
  - `package.json`: the new test.

**Interfaces:**
- Produces:
  - `HOTBAR_SIZE = 4`
  - `canHotbar(itemId) → bool`
  - `assignHotbar(stats, i, itemId|null) → bool`
  - `hotbarView(stats) → [{ id, name, icon, color, count, ready }]` (or null for an empty slot)
  - `useHotbar(stats, i, now) → { ok, reason?, id? }`
  - `HOTBAR_COOLDOWN_MS = 1000`

Notes:
- Keys 1–4 are free in `GameScene` (checked: only CampfireScene, CodexScene and AethericTearScene bind ONE–FOUR, inside their own scenes).
- `KEY_CODES` in `controls/keys.js` gets `hotbar0..3` (Digit1–4), so the deck's keyboard-emulation table stays complete.
- Lore items whose use opens a dialogue (`ancient_scroll`, `eldritch_tome`) can't go on the hotbar.

- [ ] **Step 1: Write the failing test** (`tools/test_phase3_economy.mjs`)

```js
// Phase 3 economy: hotbar, currencies + buy-back, stations + craft ranks,
// recipe scrolls, gear upgrades. Run: node tools/test_phase3_economy.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');
const HB = await import('../src/systems/hotbar.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- C2: hotbar
{
    const s = new PlayerStats();
    eq(s.hotbar, [null, null, null, null], 'a new character has an empty hotbar');
    ok(HB.canHotbar('health_potion'), 'potions can go on the hotbar');
    ok(!HB.canHotbar('novice_staff'), 'equipment cannot');
    ok(!HB.canHotbar('ancient_scroll'), 'dialogue lore items cannot');
    ok(!HB.assignHotbar(s, 4, 'health_potion'), 'slot index out of range is refused');
    ok(HB.assignHotbar(s, 0, 'health_potion'), 'assign slot 1');
    ok(HB.assignHotbar(s, 1, 'health_potion'), 'assigning the same item elsewhere moves it');
    eq(s.hotbar, [null, 'health_potion', null, null], 'an item sits in one slot only');

    // Review Focus 1: empty slot greys out, pressing it does nothing and starts no cooldown
    s.health = 10;
    eq(HB.useHotbar(s, 1, 0), { ok: false, reason: 'none' }, 'none in the pack');
    eq(HB.hotbarView(s)[1].count, 0, 'view shows 0');
    s.addItem('health_potion', 2);
    const r = HB.useHotbar(s, 1, 0);
    ok(r.ok && s.health === 40 && s.countItem('health_potion') === 1, 'using consumes one and applies it');
    eq(HB.useHotbar(s, 1, 500), { ok: false, reason: 'cooldown' }, 'shared 1 s cooldown');
    ok(HB.useHotbar(s, 1, 1000).ok, 'usable again after 1 s');
    eq(s.hotbar[1], 'health_potion', 'slot keeps its item at 0');
    eq(HB.useHotbar(s, 0, 5000), { ok: false, reason: 'empty' }, 'an empty slot');
    ok(!HB.hotbarView(s)[1].ready, 'not ready at 0');

    SaveManager.save(s, 'st', 'ch');
    const t = new PlayerStats();
    SaveManager.load(t, 'st', 'ch');
    eq(t.hotbar, [null, 'health_potion', null, null], 'hotbar is saved');
    const raw = JSON.parse(store.get('amo_save_st_ch')); delete raw.hotbar;
    store.set('amo_save_old_undefined', JSON.stringify(raw));
    const u = new PlayerStats(); u.hotbar = ['x', 'y', 'z', 'w'];
    SaveManager.load(u, 'old', undefined);
    eq(u.hotbar, [null, null, null, null], 'an old save gets an empty hotbar');
}

console.log(`phase 3 economy: ${n} checks passed`);
```

- [ ] **Step 2: Run** `node tools/test_phase3_economy.mjs`. Expected: FAIL (`Cannot find module …/hotbar.js`).

- [ ] **Step 3: Implement `src/systems/hotbar.js`**

```js
// Consumable hotbar: four slots on keys 1–4. A slot remembers its item even
// when you have none left (it greys out); one shared cooldown stops double use.
// Pure — tools/test_phase3_economy.mjs.
import { ITEMS } from '../data/items.js';

export const HOTBAR_SIZE = 4;
export const HOTBAR_COOLDOWN_MS = 1000;
// Items whose use opens a lore dialogue are read from the Inventory only.
const READ_ONLY = new Set(['ancient_scroll', 'eldritch_tome']);

export function canHotbar(itemId) {
    const def = ITEMS[itemId];
    return !!def && !def.slot && typeof def.onUse === 'function' && !READ_ONLY.has(itemId);
}

export function assignHotbar(stats, i, itemId) {
    if (!Number.isInteger(i) || i < 0 || i >= HOTBAR_SIZE) return false;
    if (itemId !== null && !canHotbar(itemId)) return false;
    stats.hotbar ??= Array(HOTBAR_SIZE).fill(null);
    if (itemId !== null) stats.hotbar = stats.hotbar.map(id => (id === itemId ? null : id));
    stats.hotbar[i] = itemId;
    return true;
}

export function hotbarView(stats) {
    return (stats.hotbar ?? []).map(id => {
        if (!id) return null;
        const def = ITEMS[id] ?? {};
        const count = stats.countItem(id);
        return { id, name: def.name ?? id, icon: def.icon ?? null, color: def.color ?? 0x8855ff, count, ready: count > 0 };
    });
}

// `now` in ms (scene time). The cooldown lives on stats but is never saved.
export function useHotbar(stats, i, now) {
    const id = stats.hotbar?.[i];
    if (!id) return { ok: false, reason: 'empty' };
    if (stats.countItem(id) <= 0) return { ok: false, reason: 'none' };
    if (now < (stats._hotbarReadyAt ?? 0)) return { ok: false, reason: 'cooldown' };
    if (!stats.useItem(id)) return { ok: false, reason: 'refused' };
    stats._hotbarReadyAt = now + HOTBAR_COOLDOWN_MS;
    return { ok: true, id };
}
```

- [ ] **Step 4: Add the save field**
  - `PlayerStats` constructor, next to `skillSlots`: `this.hotbar = [null, null, null, null];   // consumable item ids on keys 1–4 (systems/hotbar.js)`
  - `reset()`: `this.hotbar = [null, null, null, null];`
  - `SaveManager.save`: `hotbar: [...(stats.hotbar ?? [null, null, null, null])],`
  - `SaveManager.load`: `stats.hotbar = Array.isArray(d.hotbar) ? [...d.hotbar, null, null, null, null].slice(0, 4) : [null, null, null, null];`

- [ ] **Step 5: Run the test.** Expected: PASS. Add `node tools/test_phase3_economy.mjs` to `npm test`, right after `test_combat_depth.mjs`.

- [ ] **Step 6: Wire the game**
  - **GameScene** `create()`, after `this.slotKeys`: build `this.hotbarKeys` from KeyCodes ONE–FOUR. In `update()`, next to the skill slot loop, call `if (JustDown(k)) this._useHotbar(i)`.
  - **`_useHotbar(i)`**: call `useHotbar(playerStats, i, this.time.now)`. On ok, play `soundManager.collect()` and notify `"<name>"` for 900 ms. On `none`, notify `"No <name> left"`. Stay silent on `cooldown` and `empty`. Online games need nothing special.
  - **`controls/keys.js`**: add `hotbar0..3: { keyCode: 49..52, code: 'Digit1'..'Digit4', key: '1'..'4' }`.
  - **UIScene**:
    - `_initHotbar()` creates four 40 px boxes: an icon (or a colour block), a key number top-left, and a count bottom-right.
    - **Layout:** bottom centre at `h - 60` on desktop. When the touch deck is shown (`this._controls._deckVisible()`), the boxes go in a row of four, 36 px each, centred on the skill ring's x and 12 px above its top slot (`_atkData.atkY - _atkData.R_ARM - _atkData.R_SK - 12`).
    - Each box gets `pointerdown → this.scene.get('GameScene')?._useHotbar(i)`, unless GameScene is paused.
    - `update()` refreshes the boxes from `hotbarView(playerStats)`: alpha 0.35 at count 0, and a dark overlay while `this.time.now`-based cooldown is active. Read `playerStats._hotbarReadyAt` against `this.scene.get('GameScene').time.now`.
  - **InventoryScene**:
    - With a slot selected, keys ONE–FOUR call `assignHotbar(playerStats, k, item.id)`. On success the hint reads `Hotbar k+1: <name>`; otherwise shake the camera.
    - The action hint for consumables becomes `[U] Use  [1-4] Hotbar  [ESC/I] Close`.
    - In the equipment panel, add a 4-cell strip under the equipment slots showing the current hotbar. Clicking a cell clears it with `assignHotbar(…, null)`.

- [ ] **Step 7:** `npm test` and `npx vite build` pass.
  - Headless check with `tools/console.mjs` (as in Phase 2): give a health potion, put it in slot 1, press `1`, then read `playerStats.health` and the count.
  - Commit: `feat(amo): consumable hotbar on keys 1–4 (touch: above the skill ring)`.

---

### Task 2: Currency roles and buy-back (C5)

**Files:**
- Create `src/data/economy.js`.
- Modify:
  - `src/data/items.js`: the `MERCHANT_CATALOG` shape.
  - `src/scenes/ShopScene.js`.
  - `tools/test_phase3_economy.mjs`.
  - Every other reader of `MERCHANT_CATALOG` (`grep -rn MERCHANT_CATALOG src tools`): `test_economy.mjs` and `gen_game_inventory.mjs` only read `.id` today, so `gen_game_inventory.mjs` must change its Glint/Gold columns.

**Interfaces:**
- Produces:
  - `itemCurrency(itemId) → 'gold' | 'glint'`
  - `shopPrice(entry, bias) → number`
  - `BUYBACK_MAX = 10`
  - `recordSale(list, { id, price, currency }) → list` (mutates, newest first, capped)
  - `MERCHANT_CATALOG` entries are now `{ id, price, currency }`

**Currency rule:**
- **Glint** (arcane): potions, which are any `POTION_RECIPES` output plus `health_potion` and `mana_potion`; recipe scrolls (`recipe_*`); `ancient_scroll` and `eldritch_tome`; weapons of type `staff`, `spell_blade` or `umbral_dagger`; and any item with an `enchant` or with rarity `rare`, `epic` or `legendary`.
- **Gold** (mundane): everything else, including food, materials, tools, bags, the tent, bows and plain armour.

**Prices:**
- New `price` = the old `price` for glint items and the old `goldPrice` for gold items.
- Write the catalogue entries out explicitly. A test checks `entry.currency === itemCurrency(entry.id)`.

- [ ] **Step 1: Write the failing tests** (append to `tools/test_phase3_economy.mjs`, before the final `console.log`)

```js
// ---- C5: currency roles + buy-back
{
    const EC = await import('../src/data/economy.js');
    const { MERCHANT_CATALOG, ITEMS } = await import('../src/data/items.js');
    eq(EC.itemCurrency('health_potion'), 'glint', 'potions are arcane');
    eq(EC.itemCurrency('novice_staff'), 'glint', 'staves are arcane');
    eq(EC.itemCurrency('iron_axe'), 'gold', 'tools are mundane');
    eq(EC.itemCurrency('boar_meat'), 'gold', 'food is mundane');
    eq(EC.itemCurrency('hunters_shortbow'), 'gold', 'plain bows are mundane');
    for (const e of MERCHANT_CATALOG) {
        ok(ITEMS[e.id], `${e.id} is an item`);
        ok(e.currency === EC.itemCurrency(e.id), `${e.id}: one currency, the item's own`);
        ok(Number.isInteger(e.price) && e.price > 0, `${e.id}: a price`);
        ok(!('goldPrice' in e), `${e.id}: no second price`);
    }
    // Review Focus 3: the discount only touches the favoured currency
    const gold = { id: 'iron_axe', price: 32, currency: 'gold' }, glint = { id: 'mana_potion', price: 20, currency: 'glint' };
    eq([EC.shopPrice(gold, 'rural'), EC.shopPrice(glint, 'rural')], [26, 20], 'rural discounts gold only');
    eq([EC.shopPrice(gold, 'outskirt'), EC.shopPrice(glint, 'outskirt')], [32, 16], 'outskirt discounts glint only');
    eq(EC.shopPrice(gold, 'neutral'), 32, 'neutral: list price');
    const bb = [];
    for (let i = 0; i < 12; i++) EC.recordSale(bb, { id: `x${i}`, price: i, currency: 'gold' });
    eq(bb.length, EC.BUYBACK_MAX, 'buy-back keeps the last 10');
    eq(bb[0].id, 'x11', 'newest first');
}
```

- [ ] **Step 2: Run the test.** Expected: FAIL (the module is missing).

- [ ] **Step 3: Implement `src/data/economy.js`**

```js
// Currency roles (gold = mundane, glint = arcane), shop prices and the
// buy-back list. Pure — tools/test_phase3_economy.mjs.
import { ITEMS, POTION_RECIPES } from './items.js';

const POTIONS = new Set(['health_potion', 'mana_potion', ...POTION_RECIPES.map(r => r.output)]);
const ARCANE_WEAPONS = new Set(['staff', 'spell_blade', 'umbral_dagger']);
const ARCANE_RARITY = new Set(['rare', 'epic', 'legendary']);
const ARCANE_ITEMS = new Set(['ancient_scroll', 'eldritch_tome']);

export function itemCurrency(itemId) {
    const def = ITEMS[itemId];
    if (!def) return 'gold';
    if (POTIONS.has(itemId) || ARCANE_ITEMS.has(itemId) || itemId.startsWith('recipe_')) return 'glint';
    if (def.slot === 'weapon' && ARCANE_WEAPONS.has(def.weaponType)) return 'glint';
    if (def.enchant || ARCANE_RARITY.has(def.rarity)) return 'glint';
    return 'gold';
}

// 20% off when the map favours the item's currency (rural → gold, outskirt → glint).
export function shopPrice(entry, bias) {
    const favoured = (bias === 'rural' && entry.currency === 'gold') || (bias === 'outskirt' && entry.currency === 'glint');
    return favoured ? Math.round(entry.price * 0.8) : entry.price;
}

export const BUYBACK_MAX = 10;
export function recordSale(list, sale) {
    list.unshift(sale);
    if (list.length > BUYBACK_MAX) list.length = BUYBACK_MAX;
    return list;
}
```

Note that `economy.js` imports `items.js`. Task 5 makes `items.js` import `recipeScrolls.js`, so never import `economy.js` from `items.js`. Keep the dependency one-way.

- [ ] **Step 4: Rewrite `MERCHANT_CATALOG`**
  - Each entry becomes `{ id, price, currency }`, using the rule and prices above. For example, `{ id: 'iron_axe', price: 32, currency: 'gold' }` and `{ id: 'mana_potion', price: 20, currency: 'glint' }`.
  - Replace the header comment with: `// One currency per item: gold for mundane goods, glint for arcane (data/economy.js)`.

- [ ] **Step 5: Rewrite ShopScene**
  - **Buy rows:** each shows a single `[<n>gp]` or `[<n>gl]` button from `shopPrice(entry, bias)`, coloured by currency, and brighter when that currency is favoured. Remove the GL/GP column headers. The list gets the scroll/drag behaviour already used for the sell list, or at least clips at `bY - 48` as today.
  - **Sell rows:** `<sellPrice><gp|gl>` with `cur = itemCurrency(id)`. `_sell` adds `sellPrice` to `playerStats[cur]` and calls `recordSale(_buyback, { id, price: sellPrice, currency: cur })`.
  - **Buy-back strip:** two rows of five, using `_buyback.slice(0, 10)`. A repurchase charges `entry.currency` at `entry.price`.
  - **Balances:** both refresh after every transaction through one `_refreshBalances()`.
  - **Closing:** `_close()` calls `SaveManager.save(playerStats)`.

- [ ] **Step 6: Update the other readers**
  - `gen_game_inventory.mjs` shops table: `['Item', 'Price', 'Currency']`.
  - The currencies row in the systems table: "Gold buys mundane goods (food, tools, bags, materials, plain gear); Glint buys arcane goods (potions, scrolls, staves, spell-blades, shadow daggers, enchanted or rare gear). Selling pays in the item's currency; a 20% regional discount applies to the favoured one; the shop buys back your last 10 sales."

- [ ] **Step 7:** `npm test` and `npx vite build` pass.
  - Headless shop check: on a rural map, buy an axe (gold) and a mana potion (glint); sell an axe and buy it back. Both balances must move correctly.
  - Commit: `feat(amo): gold for mundane goods, glint for arcane — one price per item, 10-sale buy-back`.

---

### Task 3: Station recipes and craft ranks (C1 rules and UI)

**Files:**
- Create `src/data/stations.js`.
- Modify:
  - `PlayerStats.js` and `SaveManager.js`: `craftCounts`.
  - `CampfireScene.js`.
  - `tools/test_phase3_economy.mjs`.

**Interfaces:**
- Produces:
  - `STATION_RECIPES: { [output]: { station: 'hearth'|'alchemy', rank: 1|2|3 } }`
  - `recipeStation(recipe) → { station, rank } | null` (null means a campfire recipe)
  - `craftRank(count) → 1|2|3` (25 → 2, 75 → 3)
  - `extraOutput(rank, rng) → bool` (15% at rank 2, 30% at rank 3)
  - `availableRecipes(list, kind, where, knownRecipes = [], isLocked = () => false) → recipes`. `kind` is `'cooking' | 'alchemy'`. `where` is `{ station: null }` for a campfire or `{ station, rank }` for a station.
  - `STATION_LABELS = { hearth: 'Cooking Hearth', alchemy: 'Alchemy Table' }`
  - `CRAFT_KIND = { cook: 'cooking', brew: 'alchemy' }`

**Which recipes move.** Count distinct ingredient ids, leaving out `empty_bottle`. The table is written out explicitly, and a test checks the rule against it.

| Output | Station | Rank |
|---|---|---|
| `hunters_feast` | hearth | 1 |
| `herb_crusted_rabbit` | hearth | 1 |
| `herb_mushroom_pie` | hearth | 1 |
| `lucky_rabbit_stew` | hearth | 1 |
| `boar_mushroom_stew` | hearth | 1 |
| `tidewater_chowder` | hearth | 1 |
| `mushroom_risotto` | hearth | 1 |
| `hearty_stew` | hearth | 2 |
| `anglers_platter` | hearth | 2 |
| `grand_feast` | hearth | 2 |
| `greater_health_potion` | alchemy | 1 |
| `greater_mana_potion` | alchemy | 1 |
| `regen_potion` | alchemy | 1 |
| `double_down_elixir` | alchemy | 2 |
| `moonpetal_elixir` | alchemy | 2 |
| `moonveil_tonic` | alchemy | 2 |
| `deepwater_elixir` | alchemy | 3 |
| `clarity_elixir` | alchemy | 3 |

The rule the test enforces:
- Every cooking recipe with 3 or more distinct ingredients, or with `multi: true`, is a hearth recipe.
- Every potion whose output starts with `greater_` or ends with `_elixir` is an alchemy recipe.
- Every recipe left at the campfire has at most 2 distinct ingredients (excluding the bottle).
- Hearth ranks never exceed 2, since no rank-3 hearth is placed.

Stations make every campfire recipe of their kind too.

- [ ] **Step 1: Write the failing tests**

```js
// ---- C1: stations + craft ranks
{
    const ST = await import('../src/data/stations.js');
    const { COOKING_RECIPES, POTION_RECIPES } = await import('../src/data/items.js');
    const distinct = r => new Set((r.ingredients ?? [].concat(r.input ?? []).map(id => ({ id }))).map(i => i.id).filter(id => id !== 'empty_bottle')).size;
    for (const r of COOKING_RECIPES) {
        const st = ST.recipeStation(r);
        if (distinct(r) >= 3 || r.multi) ok(st?.station === 'hearth', `${r.output} needs a hearth`);
        else ok(st === null, `${r.output} stays at the campfire`);
        if (st) ok(st.rank <= 2, `${r.output}: no rank-3 hearth exists`);
    }
    for (const r of POTION_RECIPES) {
        const st = ST.recipeStation(r);
        if (/^greater_|_elixir$/.test(r.output)) ok(st?.station === 'alchemy', `${r.output} needs an alchemy table`);
        if (!st) ok(distinct(r) <= 2, `${r.output}: campfire potions are simple`);
    }
    for (const out of Object.keys(ST.STATION_RECIPES)) ok([...COOKING_RECIPES, ...POTION_RECIPES].some(r => r.output === out), `${out} is a real recipe`);
    eq([ST.craftRank(0), ST.craftRank(24), ST.craftRank(25), ST.craftRank(74), ST.craftRank(75)], [1, 1, 2, 2, 3], 'ranks at 25 and 75 crafts');
    eq([ST.extraOutput(1, () => 0), ST.extraOutput(2, () => 0.14), ST.extraOutput(2, () => 0.15), ST.extraOutput(3, () => 0.29)], [false, true, false, true], 'double output 15% / 30%');
    // Review Focus 5
    const fire = ST.availableRecipes(COOKING_RECIPES, 'cooking', { station: null }, []);
    ok(!fire.some(r => r.output === 'grand_feast'), 'no feast at a campfire');
    const h1 = ST.availableRecipes(COOKING_RECIPES, 'cooking', { station: 'hearth', rank: 1 }, []);
    ok(h1.some(r => r.output === 'hunters_feast') && !h1.some(r => r.output === 'grand_feast'), 'a rank-1 hearth makes rank-1 dishes only');
    ok(h1.some(r => r.output === 'roasted_boar'), 'a hearth also makes campfire dishes');
    ok(!ST.availableRecipes(COOKING_RECIPES, 'cooking', { station: 'alchemy', rank: 3 }, []).length, 'an alchemy table cooks nothing');
    const s = new PlayerStats();
    eq(s.craftCounts, { cooking: 0, alchemy: 0 }, 'craft counts start at 0');
}
```

- [ ] **Step 2: Run the test.** Expected: FAIL.

- [ ] **Step 3: Implement `src/data/stations.js`**

```js
// Cooking hearths and alchemy tables: which recipes need a station (and what
// rank), craft ranks from craft counts, the double-output roll.
// Pure — tools/test_phase3_economy.mjs.

export const STATION_LABELS = { hearth: 'Cooking Hearth', alchemy: 'Alchemy Table' };
export const CRAFT_KIND = { cook: 'cooking', brew: 'alchemy' };
const KIND_STATION = { cooking: 'hearth', alchemy: 'alchemy' };

export const STATION_RECIPES = {
    hunters_feast:       { station: 'hearth', rank: 1 },
    herb_crusted_rabbit: { station: 'hearth', rank: 1 },
    herb_mushroom_pie:   { station: 'hearth', rank: 1 },
    lucky_rabbit_stew:   { station: 'hearth', rank: 1 },
    boar_mushroom_stew:  { station: 'hearth', rank: 1 },
    tidewater_chowder:   { station: 'hearth', rank: 1 },
    mushroom_risotto:    { station: 'hearth', rank: 1 },
    hearty_stew:         { station: 'hearth', rank: 2 },
    anglers_platter:     { station: 'hearth', rank: 2 },
    grand_feast:         { station: 'hearth', rank: 2 },
    greater_health_potion: { station: 'alchemy', rank: 1 },
    greater_mana_potion:   { station: 'alchemy', rank: 1 },
    regen_potion:          { station: 'alchemy', rank: 1 },
    double_down_elixir:    { station: 'alchemy', rank: 2 },
    moonpetal_elixir:      { station: 'alchemy', rank: 2 },
    moonveil_tonic:        { station: 'alchemy', rank: 2 },
    deepwater_elixir:      { station: 'alchemy', rank: 3 },
    clarity_elixir:        { station: 'alchemy', rank: 3 },
};

export function recipeStation(recipe) {
    return STATION_RECIPES[recipe.output] ?? null;
}

export function craftRank(count) {
    return count >= 75 ? 3 : count >= 25 ? 2 : 1;
}

export function extraOutput(rank, rng = Math.random) {
    const chance = rank >= 3 ? 0.30 : rank === 2 ? 0.15 : 0;
    return rng() < chance;
}

// Recipes a fire (station null) or a station of `rank` can make from `list`
// (COOKING_RECIPES with kind 'cooking', POTION_RECIPES with 'alchemy'). Scroll-locked recipes are dropped
// unless known — `isLocked` comes from data/recipeScrolls.js once it exists.
export function availableRecipes(list, kind, where, knownRecipes = [], isLocked = () => false) {
    const known = new Set(knownRecipes);
    return list.filter(r => {
        if (isLocked(r.output) && !known.has(r.output)) return false;
        const st = recipeStation(r);
        if (!where.station) return !st;
        if (where.station !== KIND_STATION[kind]) return false;
        return !st || (st.station === where.station && st.rank <= where.rank);
    });
}
```

- [ ] **Step 4: Add the save field**
  - `PlayerStats`: `this.craftCounts = { cooking: 0, alchemy: 0 };   // crafts made of each kind → craft rank (data/stations.js)`, and set it in `reset()` as well.
  - **Save:** `craftCounts: { cooking: 0, alchemy: 0, ...(stats.craftCounts ?? {}) }`.
  - **Load:** `stats.craftCounts = { cooking: 0, alchemy: 0, ...(d.craftCounts ?? {}) };`.

- [ ] **Step 5: Station mode in CampfireScene**
  - **`init(data)`**: `this._station = data?.station ?? null`, which is `{ type: 'hearth'|'alchemy', rank }`.
  - **Tabs:** with no station, `['REST','COOK','BREW']` as today. With a hearth, `['COOK']`. With an alchemy table, `['BREW']`. Build `TABS` and the key hints from `this._tabs` instead of the module constants.
  - **Title:** `CAMPFIRE`, or `` `${STATION_LABELS[type]} — rank ${rank}` ``.
  - **Recipe list:** `_drawRecipes(mode)` takes its recipes from `availableRecipes(list, CRAFT_KIND[mode], where, playerStats.knownRecipes ?? [], isLocked)`, then applies the existing `_isSeen` filter. Until Task 5, `isLocked` is `() => false`.
  - **Header line:** under the tabs, `Cooking rank 2 (31 crafts)` or `Alchemy rank …`, from `craftRank`.
  - **`_make`**: after consuming the ingredients and adding the output:
    - `const kind = CRAFT_KIND[mode]; playerStats.craftCounts[kind]++`
    - `const rank = craftRank(playerStats.craftCounts[kind])`
    - if `extraOutput(rank)`, add a second output, and the feedback becomes `"... ×2!"`
    - when the rank rises past a threshold, show `"Cooking rank 2!"`
  - **Hint:** a campfire with a station recipe hidden shows, at the bottom when the list is empty or always as a small line, `Feasts and elixirs need a hearth or an alchemy table.`

- [ ] **Step 6:** `npm test` and the build pass. Commit: `feat(amo): station recipes and craft ranks — campfire keeps the simple ones`.

---

### Task 4: Hearths and alchemy tables on the maps (C1 world)

**Files:**
- Modify:
  - `BootScene.js`.
  - `GameScene.js`: a `stations` group, prompts and interaction.
  - `hermit_hut.js`, `thaloria.js`, `eldrin_tower.js`.
  - `tools/test_phase3_economy.mjs`.

**Art:**
- **Alchemy table**, `pixel_crawler_anokolisa/Alchemy_Table_0{1,2,3}-Sheet.png`, loaded as spritesheets:
  - tier 1: 32×64, 63 frames
  - tier 2: 48×64, 51 frames
  - tier 3: 80×80, 22 frames (5 per row). The tier-3 catalogue entry has no frames, so check the grid by viewing the PNG before writing the loader.
  - Play at 120 ms per frame. The bottom-anchored hitbox comes from the catalogue: tier 1 `{x:1,y:48,w:29,h:16}`, tier 2 `{x:2,y:42,w:43,h:22}`, tier 3 the bottom 20 px.
- **Hearth**: `fireplace_stone_lit` from `tileset_base` (`[Base]BaseChip_pipo`, object 64×96 at 32,3232), hitbox `{x:3,y:45,w:51,h:43}`. Both ranks use the same art; the rank shows in the prompt.

**Interfaces:**
- Consumes: `STATION_LABELS` (Task 3).
- Produces: `spawns.stations: [{ x, y, type, rank }]` in map defs, in tile coordinates like campfires. GameScene stores each sprite with `.stationDef`.

- [ ] **Step 1: Write the failing test**

```js
// ---- C1: stations placed
{
    const { getMap } = await import('../src/data/maps/index.js');
    const want = { hermit_hut: [['hearth', 1], ['alchemy', 1]], thaloria: [['hearth', 2], ['alchemy', 2]], eldrin_tower: [['alchemy', 3]] };
    for (const [id, list] of Object.entries(want)) {
        const m = getMap(id), st = m.spawns.stations ?? [];
        eq(st.map(s => [s.type, s.rank]).sort(), [...list].sort(), `${id}: stations`);
        for (const s of st) ok(m.tiles[s.y]?.[s.x] !== undefined && m.tiles[s.y][s.x] !== 1, `${id}: station at ${s.x},${s.y} is on a floor tile`);
    }
}
```

The floor test uses the existing walkability convention, where tile 1 is a wall or tree. If `test_economy.mjs` already has a walkable-tile helper for gathering nodes, reuse it.

- [ ] **Step 2: Run the test.** Expected: FAIL.

- [ ] **Step 3: Place the stations**
  - **Hermit's Hut:**
    - hearth rank 1 at `{ x: 16, y: 5 }`, by the east shelf
    - alchemy rank 1 at `{ x: 4, y: 5 }`
    - both are floor tiles, clear of the NPC at (10,5), the chest at (3,7) and the sign at (16,3)
  - **Thaloria:**
    - it is a `makeStubMap` stub, so read `_stubs.js` for its size and floor
    - place, by direct push after construction like the existing portal: `THALORIA.spawns.stations = [{ x: 3, y: 3, type: 'hearth', rank: 2 }, { x: 9, y: 3, type: 'alchemy', rank: 2 }]`
    - check both tiles are floor and away from the NPC at (5,4)
  - **Eldrin's Tower:**
    - `stations: [{ x: 15, y: 18, type: 'alchemy', rank: 3 }]`, inside the tower interior (rows 15–26, cols 8–17)
    - verify the tile is floor and not the chest at (10,17)
  - **Defaults:** every map def that lists `spawns` keeps working without `stations` (GameScene reads `?? []`).

- [ ] **Step 4: BootScene**
  - Load `alchemy_table_1/2/3` with `this.load.spritesheet` using the frame sizes above.
  - The hearth needs no load, since `tileset_base` and `tileset_base_cat` are already loaded.

- [ ] **Step 5: GameScene**
  - In `create()`, after the campfires: `this.stations = this.physics.add.staticGroup();`. For each `mapDef.spawns.stations ?? []`:
    - **Alchemy:** an animated sprite. Create the anim `alchemy_table_<rank>_idle` once.
    - **Hearth:** an image using a texture frame `cat_fireplace_stone_lit` added to `tileset_base`, in the same way `_placeCatalogueItems` adds frames.
    - **Placement:** bottom-anchored at the tile's bottom centre, `setDepth(8)`.
    - **Body:** a static body sized to the hitbox, added to `this.stations` through an invisible `wallGroup`-style blocker so the player can't walk through it. The interaction uses the same 52 px `near()` test as campfires.
    - **Prompt:** `ePrompt` reads `[E] Cooking Hearth` or `[E] Alchemy Table`.
  - `_updateInteractPrompts` and `_nearInteract` include the stations.
  - **`_checkInteractions`:** a station within 52 px of the player calls `soundManager.interact(); this.scene.pause(); this.scene.launch('CampfireScene', { station: { type, rank } })`. Stations are not respawn points. Use a distance check rather than `physics.overlap`, because the visual sprite has no arcade body; mirror the rift-gate pattern.

- [ ] **Step 6:** `npm test` and the build pass.
  - Headless check: load `hermit_hut`, walk to the hearth or teleport the player next to it, press E, and assert `CampfireScene` is active with a single COOK tab. Take a screenshot of both stations.
  - Commit: `feat(amo): cooking hearths and alchemy tables in the Hermit's Hut, Thaloria and Eldrin's Tower`.

---

### Task 5: Recipe scrolls (C3)

**Files:**
- Create `src/data/recipeScrolls.js`.
- Modify:
  - `items.js`: merge the scroll items into `ITEMS`.
  - `PlayerStats.js` and `SaveManager.js`: `knownRecipes` and `learnRecipe`.
  - `CampfireScene.js`: `isLocked`.
  - `GameScene.js`: the elite scroll drop and the boss scroll.
  - `MERCHANT_CATALOG`: three rank-gated scrolls.
  - `ShopScene.js`: rank gating.
  - `quests.js`: two rewards.
  - Two chests.
  - `tools/test_economy.mjs`: scrolls must have sources.
  - `tools/test_phase3_economy.mjs`.

**Scroll-locked recipes (12):**
- **Cooking (5):** `grand_feast`, `hearty_stew`, `anglers_platter`, `herb_mushroom_pie`, `spectral_broth`
- **Potions (7):** `clarity_elixir`, `deepwater_elixir`, `moonveil_tonic`, `double_down_elixir`, `wildfire_tonic`, `void_tonic`, `moonpetal_elixir`

**Sources:**
- **Elite kills:** a 12% chance of a random unknown scroll, through `rollEliteScroll(rng, known)`, appended to `bonusDrops`.
- **Void General:** `recipe_clarity_elixir`, spawned next to its other drops.
- **Chests:**
  - Hermit's Hut chest gets `recipe_herb_mushroom_pie`.
  - Eldrin's Tower chest at (10,17) gets `recipe_deepwater_elixir`.
- **Merchant**, rank-gated by the player's craft rank of that kind:
  - `recipe_hearty_stew` (glint 90, cooking rank 1)
  - `recipe_moonpetal_elixir` (glint 120, alchemy rank 2)
  - `recipe_anglers_platter` (glint 140, cooking rank 2)
- **Quest rewards:**
  - `side_hunters_larder` adds `recipe_grand_feast`.
  - `side_void_offering` adds `recipe_void_tonic`.
- **No dedicated source:** `spectral_broth`, `moonveil_tonic`, `double_down_elixir` and `wildfire_tonic` come only from the elite roll. `test_economy` counts "elite" as a source for every scroll, since the elite roll can produce any scroll.

**Interfaces:**
- Produces:
  - `SCROLL_RECIPES: string[]`
  - `scrollId(output) → 'recipe_' + output`
  - `isLocked(output) → bool`
  - `scrollItems(recipeLabel) → { [id]: itemDef }`
  - `rollEliteScroll(rng, knownRecipes) → id | null`
  - `ELITE_SCROLL_CHANCE = 0.12`
  - On stats: `stats.knownRecipes: string[]` and `stats.learnRecipe(output) → bool` (false if already known)
  - `MERCHANT_CATALOG` scroll entries carry `requires: { kind: 'cooking'|'alchemy', rank }`

- [ ] **Step 1: Write the failing tests**

```js
// ---- C3: recipe scrolls
{
    const RS = await import('../src/data/recipeScrolls.js');
    const { ITEMS, MERCHANT_CATALOG } = await import('../src/data/items.js');
    const ST = await import('../src/data/stations.js');
    const { COOKING_RECIPES, POTION_RECIPES } = await import('../src/data/items.js');
    eq(RS.SCROLL_RECIPES.length, 12, 'a dozen scroll-locked recipes');
    for (const out of RS.SCROLL_RECIPES) {
        const it = ITEMS[RS.scrollId(out)];
        ok(it && typeof it.onUse === 'function' && it.stackable === false, `${out}: a usable scroll item`);
        ok(it.name.startsWith('Recipe: '), `${out}: named "Recipe: …"`);
    }
    // Review Focus 4: hidden until read, a second read does nothing
    const s = new PlayerStats();
    const hidden = ST.availableRecipes(COOKING_RECIPES, 'cooking', { station: 'hearth', rank: 2 }, s.knownRecipes, RS.isLocked);
    ok(!hidden.some(r => r.output === 'grand_feast'), 'locked recipe hidden');
    s.addItem('recipe_grand_feast');
    ok(s.useItem('recipe_grand_feast'), 'reading the scroll teaches it');
    ok(s.knownRecipes.includes('grand_feast') && s.countItem('recipe_grand_feast') === 0, 'learned and consumed');
    s.addItem('recipe_grand_feast');
    ok(!s.useItem('recipe_grand_feast') && s.countItem('recipe_grand_feast') === 1, 'a known recipe is not consumed again');
    const shown = ST.availableRecipes(COOKING_RECIPES, 'cooking', { station: 'hearth', rank: 2 }, s.knownRecipes, RS.isLocked);
    ok(shown.some(r => r.output === 'grand_feast'), 'known recipe shown');
    eq(RS.rollEliteScroll(() => 0.5, []), null, 'no scroll above the chance');
    ok(RS.SCROLL_RECIPES.map(RS.scrollId).includes(RS.rollEliteScroll(() => 0.01, [])), 'a scroll under the chance');
    eq(RS.rollEliteScroll(() => 0.01, [...RS.SCROLL_RECIPES]), null, 'nothing left to learn → no scroll');
    for (const e of MERCHANT_CATALOG.filter(e => e.id.startsWith('recipe_'))) ok(e.requires?.rank >= 1 && ['cooking', 'alchemy'].includes(e.requires.kind), `${e.id}: rank-gated`);
    SaveManager.save(s, 'st', 'ch2');
    const t = new PlayerStats(); SaveManager.load(t, 'st', 'ch2');
    eq(t.knownRecipes, ['grand_feast'], 'known recipes are saved');
}
```

- [ ] **Step 2: Run the test.** Expected: FAIL.

- [ ] **Step 3: Implement `src/data/recipeScrolls.js`.** It must not import `items.js`, because `items.js` imports it. It works from the recipe labels that `items.js` passes in.

```js
// Recipe scrolls: rare recipes stay hidden until their scroll is read.
// Pure — tools/test_phase3_economy.mjs. items.js imports this file (never the reverse).

export const SCROLL_RECIPES = [
    'grand_feast', 'hearty_stew', 'anglers_platter', 'herb_mushroom_pie', 'spectral_broth',
    'clarity_elixir', 'deepwater_elixir', 'moonveil_tonic', 'double_down_elixir', 'wildfire_tonic', 'void_tonic', 'moonpetal_elixir',
];
const LOCKED = new Set(SCROLL_RECIPES);
export const ELITE_SCROLL_CHANCE = 0.12;

export const scrollId = output => `recipe_${output}`;
export const isLocked = output => LOCKED.has(output);

// Item defs for every scroll; `labels` maps recipe output → its recipe label.
export function scrollItems(labels) {
    return Object.fromEntries(SCROLL_RECIPES.map(out => {
        const id = scrollId(out);
        return [id, {
            id, name: `Recipe: ${labels[out] ?? out}`,
            description: `Teaches the recipe for ${labels[out] ?? out}. Read it to learn it for good.`,
            color: 0xd8c48a, icon: 'itm_scroll', stackable: false, rarity: 'rare', buyPrice: 0, sellPrice: 25,
            onUse: (stats) => stats.learnRecipe(out),
        }];
    }));
}

export function rollEliteScroll(rng, knownRecipes = []) {
    if (rng() >= ELITE_SCROLL_CHANCE) return null;
    const known = new Set(knownRecipes);
    const left = SCROLL_RECIPES.filter(o => !known.has(o));
    return left.length ? scrollId(left[Math.floor(rng() * left.length)]) : null;
}
```

The second `rng()` call in `rollEliteScroll` reuses the same stub value in tests, so `0.01 × 12` picks index 0. That's fine.

- [ ] **Step 4: Hook it into `items.js`.** At the end of the file, after `COOKING_RECIPES`:

```js
// Recipe scrolls (data/recipeScrolls.js) — one item per scroll-locked recipe.
const RECIPE_LABELS = Object.fromEntries([...COOKING_RECIPES, ...POTION_RECIPES].map(r => [r.output, r.label]));
Object.assign(ITEMS, scrollItems(RECIPE_LABELS));
```

  - Add `import { scrollItems } from './recipeScrolls.js';` at the top.
  - Add the three merchant entries with `requires`.

- [ ] **Step 5: PlayerStats and save**
  - Add `this.knownRecipes = [];` and set it in `reset()`.
  - Add the method:
    ```js
    learnRecipe(output) {
        if (this.knownRecipes.includes(output)) return false;
        this.knownRecipes.push(output);
        return true;
    }
    ```
  - **Save:** `knownRecipes: [...(stats.knownRecipes ?? [])]`.
  - **Load:** `stats.knownRecipes = [...(d.knownRecipes ?? [])];`.

- [ ] **Step 6: Wire the scenes**
  - **CampfireScene:**
    - pass `isLocked` into `availableRecipes`
    - a known locked recipe skips the `_isSeen` and `_isDiscovered` checks, so it is always fully shown
  - **InventoryScene `U`:**
    - when `useItem` returns false for a `recipe_*` item, set the hint to `You already know this recipe.`
    - on success, show `Learned: <label>`
  - **ShopScene buy list:** filter out entries whose `requires` rank exceeds `craftRank(playerStats.craftCounts[kind])`, and entries for recipes already known.
  - **GameScene:**
    - in `_makeElite`, add `const sc = rollEliteScroll(Math.random, playerStats.knownRecipes); if (sc) enemy.bonusDrops.push(sc);`
    - after a boss death, `this._spawnPickup(bx, by + 24, 'recipe_clarity_elixir')`
  - **Quests and chests:** add the scrolls to the two quest rewards and the two chests named above.
  - **`tools/test_economy.mjs`:** after building `sources`, add `SCROLL_RECIPES.forEach(o => src(scrollId(o), 'elite'))`. Assert that every `recipe_*` item has a source.

- [ ] **Step 7:** `npm test` and the build pass. Commit: `feat(amo): recipe scrolls — a dozen rare recipes learned from elites, the boss, chests, shops and quests`.

---

### Task 6: Gear upgrades at the forge (C4)

**Files:**
- Create `src/data/upgrades.js`.
- Modify:
  - `PlayerStats.js`: `gearUpgrades`, `upgradeLevel`, `upgradeEquipped`, and equip stats through `upgradedStats`.
  - `SaveManager.js`.
  - `CombatManager.js` (melee).
  - `GameScene.js` (bow damage).
  - `CraftingScene.js`.
  - `InventoryScene.js` (names).
  - `craftingRecipes.js`: the `CATEGORY_LABELS.upgrade` label.
  - `tools/test_phase3_economy.mjs`.

**Interfaces:**
- Produces:
  - `UPGRADE_MAX = 3`
  - `upgradeCost(def, nextLevel) → [{ id, qty }]`
  - `upgradedStats(def, level) → stats object`
  - `weaponDamageMult(level) → number`
  - `upgradeLabel(name, level) → string`
  - On stats: `stats.gearUpgrades: { [itemId]: 1..3 }`, `stats.upgradeLevel(itemId) → 0..3`, `stats.upgradeEquipped(slot) → { ok, reason? }`

**Costs:**
- The material comes from the item tier:
  - T1: `mineral_ore`
  - T2: `silver_ore`
  - T3: `heartwood`
  - T4–T5: `heartwood` plus `ice_crystal`
- Level n costs `2n` of the material (for T4–T5, `n` heartwood and `n` ice crystal).
- Level 3 also costs one `aether_shard`.

**Effects:**
- **Weapons:** ×(1 + 0.08 n) damage on melee and bow hits. Stats are unchanged.
- **Armour and accessories:** +n to each stat they already have.

- [ ] **Step 1: Write the failing tests**

```js
// ---- C4: gear upgrades
{
    const UP = await import('../src/data/upgrades.js');
    const { ITEMS } = await import('../src/data/items.js');
    eq(UP.upgradeCost(ITEMS.scholars_tunic, 1), [{ id: 'mineral_ore', qty: 2 }], 'T1 +1 costs 2 ore');
    eq(UP.upgradeCost(ITEMS.scholars_tunic, 3), [{ id: 'mineral_ore', qty: 6 }, { id: 'aether_shard', qty: 1 }], '+3 adds an aether shard');
    eq(UP.upgradeCost(ITEMS.adepts_spire, 2), [{ id: 'silver_ore', qty: 4 }], 'T2 uses silver');
    eq(UP.upgradedStats(ITEMS.scholars_tunic, 2), { stamina: 3 }, 'armour: +2 to its stat');
    eq(UP.upgradedStats(ITEMS.etched_shortsword, 2), ITEMS.etched_shortsword.stats, 'weapons keep their stats');
    eq(UP.weaponDamageMult(3), 1.24, '+3 weapon: +24% damage');
    eq(UP.upgradeLabel('Iron Ring', 2), 'Iron Ring +2', '"+N" after the name');
    eq(UP.upgradeLabel('Iron Ring', 0), 'Iron Ring', 'no suffix at 0');

    // Review Focus 2: upgrade equipped armour, unequip, reload — no drift
    const s = new PlayerStats();
    const base = { ...s.attributes }, baseHp = s.maxHealth;
    s.addItem('scholars_tunic'); s.equipItem('scholars_tunic');
    eq(s.upgradeEquipped('body'), { ok: false, reason: 'materials' }, 'needs materials');
    s.addItem('mineral_ore', 20); s.addItem('aether_shard', 1);
    ok(s.upgradeEquipped('body').ok && s.upgradeEquipped('body').ok && s.upgradeEquipped('body').ok, 'three upgrades');
    eq(s.upgradeEquipped('body'), { ok: false, reason: 'max' }, '+3 is the cap');
    eq(s.attributes.stamina, base.stamina + 4, 'tunic +3: 1 + 3 STA');
    eq(s.maxHealth, baseHp + 32, '4 STA → +32 max HP');
    SaveManager.save(s, 'st', 'ch3');
    const t = new PlayerStats(); SaveManager.load(t, 'st', 'ch3');
    eq(t.gearUpgrades, { scholars_tunic: 3 }, 'upgrades are saved');
    ok(t.unequipItem('body'), 'unequip after reload');
    eq(t.attributes, base, 'attributes back to base');
    eq(t.maxHealth, baseHp, 'max HP back to base');
    eq(s.upgradeEquipped('weapon'), { ok: false, reason: 'empty' }, 'nothing equipped there');
}
```

- [ ] **Step 2: Run the test.** Expected: FAIL.

- [ ] **Step 3: Implement `src/data/upgrades.js`**

```js
// Gear upgrades at the forge: +1/+2/+3 per item id. Weapons hit harder;
// armour and accessories gain +1 per level to each stat they have.
// Pure — tools/test_phase3_economy.mjs.

export const UPGRADE_MAX = 3;

export function upgradeCost(def, level) {
    const tier = def?.tier ?? 1;
    const cost = tier <= 1 ? [{ id: 'mineral_ore', qty: 2 * level }]
        : tier === 2 ? [{ id: 'silver_ore', qty: 2 * level }]
        : tier === 3 ? [{ id: 'heartwood', qty: 2 * level }]
        : [{ id: 'heartwood', qty: level }, { id: 'ice_crystal', qty: level }];
    if (level >= 3) cost.push({ id: 'aether_shard', qty: 1 });
    return cost;
}

export function upgradedStats(def, level) {
    const st = def?.stats ?? {};
    if (!level || def?.slot === 'weapon') return { ...st };
    return Object.fromEntries(Object.entries(st).map(([k, v]) => [k, v + level]));
}

export const weaponDamageMult = level => Math.round((1 + 0.08 * (level ?? 0)) * 100) / 100;
export const upgradeLabel = (name, level) => (level ? `${name} +${level}` : name);
```

- [ ] **Step 4: PlayerStats**
  - Add `this.gearUpgrades = {};` and set it in `reset()`.
  - Add `upgradeLevel(id) { return this.gearUpgrades?.[id] ?? 0; }`.
  - `_applyEquipStats` and `_unapplyEquipStats` iterate over `upgradedStats(def, this.upgradeLevel(itemId))` instead of `def.stats`.
  - Add the method:
    ```js
    upgradeEquipped(slot) {
        const id = this.equipment[slot];
        if (!id) return { ok: false, reason: 'empty' };
        const level = this.upgradeLevel(id);
        if (level >= UPGRADE_MAX) return { ok: false, reason: 'max' };
        const cost = upgradeCost(ITEMS[id], level + 1);
        if (!cost.every(c => this.countItem(c.id) >= c.qty)) return { ok: false, reason: 'materials' };
        cost.forEach(c => this.consumeItem(c.id, c.qty));
        this._unapplyEquipStats(id);              // remove at the old level…
        this.gearUpgrades[id] = level + 1;
        this._applyEquipStats(id);                // …re-apply at the new one
        return { ok: true, level: level + 1 };
    }
    ```
  - **Save:** `gearUpgrades: { ...(stats.gearUpgrades ?? {}) }`.
  - **Load:** `stats.gearUpgrades = { ...(d.gearUpgrades ?? {}) };`.
  - In `SaveManager.load`, `gearUpgrades` must be set from the same save as `attributes` and `equipment`. It is, since all three come from `d`.

- [ ] **Step 5: Damage**
  - **`CombatManager._calcDamage`:** after the base damage and before the crit, apply `dmg = Math.floor(dmg * weaponDamageMult(stats.upgradeLevel?.(stats.equipment.weapon) ?? 0))`.
  - **GameScene bow damage** (`const base = Math.floor(8 + …)`): multiply `base` the same way.

- [ ] **Step 6: The forge**
  - Add `CATEGORY_LABELS.upgrade = 'UPGRADE EQUIPPED'`.
  - **List:** `CraftingScene` appends one row per non-empty equipment slot, under that category. Build it at draw time, not in `ALL_RECIPES`, since it depends on equipment:
    - `{ id: 'upgrade_<slot>', category: 'upgrade', slot, label: upgradeLabel(name, lvl) + ' → +' + (lvl + 1), tier: def.tier, ingredients: upgradeCost(def, lvl + 1), output: itemId }`
    - At +3 the row shows `MAX` and has no ingredients.
  - **Blockers:** `_blocker` returns `'MAX LEVEL'` at +3.
  - **`_craft`:** an upgrade row calls `playerStats.upgradeEquipped(slot)` instead of consuming and adding items, then saves and shows `"<name> +N!"`.
  - **Detail panel:** for an upgrade, show `Weapon damage +8% per level (now +X%)`, or the stat line before → after (`+1 STA → +2 STA`).

- [ ] **Step 7: "+N" names**
  - InventoryScene's equipment panel and description, ShopScene's sell list and CraftingScene all use `upgradeLabel(def.name, playerStats.upgradeLevel(id))`.
  - The description's stat string uses `upgradedStats`.

- [ ] **Step 8:** `npm test` and the build pass.
  - `test_economy.mjs` also asserts that every upgrade material (`mineral_ore`, `silver_ore`, `heartwood`, `ice_crystal`, `aether_shard`) has a source.
  - Commit: `feat(amo): forge upgrades +1/+2/+3 — weapons hit harder, armour gains stats`.

---

### Task 7: Manual, inventory doc and the finished check

**Files:** `tools/gen_game_inventory.mjs`, `docs/manual/index.html`, `docs/game_inventory.md`, and the memory note.

- [ ] **Step 1: Extend the generator**
  - **Keys table:** `['1 2 3 4', 'Use the consumable on hotbar slot 1–4 (assign from the Inventory with 1–4)']`.
  - **Systems table:**
    - **Stations:** "Cooking Hearth and Alchemy Table (rank 1–3) make feasts, three-ingredient dishes, greater potions and elixirs; they also make every campfire recipe of their kind. Hermit's Hut: hearth 1, alchemy 1; Thaloria: hearth 2, alchemy 2; Eldrin's Tower: alchemy 3."
    - **Craft ranks:** "Cooking and alchemy ranks rise at 25 and 75 crafts; rank 2/3 give a 15%/30% chance of a second dish or potion."
    - **Recipe scrolls:** "A dozen rare recipes stay hidden until their scroll is read; scrolls drop from elites (12%), the Void General, some chests, shops (by craft rank) and quests."
    - **Gear upgrades:** "At the forge (UPGRADE EQUIPPED): +1/+2/+3 per item; weapons +8% damage per level, armour and accessories +1 to each stat per level; cost by tier (ore, silver, heartwood, heartwood + ice crystal; aether shard at +3)."
  - **Cooking and Brewing tables:** add a "Where" column with `Campfire`, `Hearth 2`, and so on, and a `🔒 scroll` marker on locked recipes.
  - **Upgrade costs:** a small table by tier.

- [ ] **Step 2:** Run `node tools/gen_game_inventory.mjs --html ../../docs/manual/index.html` and check that the markdown mentions hotbar, Alchemy Table, Recipe and UPGRADE.

- [ ] **Step 3: Final checks**
  - `npm test` and `npx vite build` pass.
  - Headless playthrough smoke, with screenshots of each:
    - the hotbar HUD
    - the shop showing single prices
    - the hearth and alchemy tables
    - a forge upgrade
  - Commit: `docs(amo): manual covers the hotbar, currencies, stations, recipe scrolls and upgrades`.
  - Update the memory note on game progress, then push.
