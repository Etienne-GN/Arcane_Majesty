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
    const a3 = ST.availableRecipes(POTION_RECIPES, 'alchemy', { station: 'alchemy', rank: 3 }, []);
    ok(a3.some(r => r.output === 'clarity_elixir') && a3.some(r => r.output === 'health_potion'), 'a rank-3 table brews everything');
    const s = new PlayerStats();
    eq(s.craftCounts, { cooking: 0, alchemy: 0 }, 'craft counts start at 0');
    s.craftCounts.cooking = 30;
    SaveManager.save(s, 'st', 'cc');
    const t = new PlayerStats(); SaveManager.load(t, 'st', 'cc');
    eq(t.craftCounts, { cooking: 30, alchemy: 0 }, 'craft counts are saved');
}

// ---- C1: stations placed
{
    const { getMap } = await import('../src/data/maps/index.js');
    const want = { hermit_hut: [['alchemy', 1], ['hearth', 1]], thaloria: [['alchemy', 2], ['hearth', 2]], eldrin_tower: [['alchemy', 3]] };
    for (const [id, list] of Object.entries(want)) {
        const m = getMap(id), st = m.spawns.stations ?? [];
        eq(st.map(s => [s.type, s.rank]).sort(), list, `${id}: stations`);
        for (const s of st) {
            ok(m.tiles[s.y]?.[s.x] !== undefined && m.tiles[s.y][s.x] !== 1, `${id}: station at ${s.x},${s.y} is on a floor tile`);
            const busy = [...(m.spawns.npcs ?? []), ...(m.spawns.chests ?? []), ...(m.spawns.signs ?? [])].some(o => o.x === s.x && o.y === s.y);
            ok(!busy, `${id}: station at ${s.x},${s.y} is not on an NPC, chest or sign`);
        }
    }
}

// ---- C3: recipe scrolls
{
    const RS = await import('../src/data/recipeScrolls.js');
    const ST = await import('../src/data/stations.js');
    const { ITEMS, MERCHANT_CATALOG, COOKING_RECIPES } = await import('../src/data/items.js');
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
    const scrolls = MERCHANT_CATALOG.filter(e => e.id.startsWith('recipe_'));
    ok(scrolls.length === 3, 'three scrolls on sale');
    for (const e of scrolls) ok(e.requires?.rank >= 1 && ['cooking', 'alchemy'].includes(e.requires.kind), `${e.id}: rank-gated`);
    SaveManager.save(s, 'st', 'ch2');
    const t = new PlayerStats(); SaveManager.load(t, 'st', 'ch2');
    eq(t.knownRecipes, ['grand_feast'], 'known recipes are saved');
}

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
    eq(s.countItem('mineral_ore'), 20 - 2 - 4 - 6, 'materials consumed');
    SaveManager.save(s, 'st', 'ch3');
    const t = new PlayerStats(); SaveManager.load(t, 'st', 'ch3');
    eq(t.gearUpgrades, { scholars_tunic: 3 }, 'upgrades are saved');
    ok(t.unequipItem('body'), 'unequip after reload');
    eq(t.attributes, base, 'attributes back to base');
    eq(t.maxHealth, baseHp, 'max HP back to base');
    eq(s.upgradeEquipped('weapon'), { ok: false, reason: 'empty' }, 'nothing equipped there');
}

console.log(`phase 3 economy: ${n} checks passed`);
