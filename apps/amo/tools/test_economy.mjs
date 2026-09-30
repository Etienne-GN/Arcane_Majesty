// Economy integrity: every ingredient of every cooking, brewing, crafting and
// enchanting recipe can be obtained (creature loot, a merchant, a gathering
// node placed on some map, a chest, or another recipe), every gathering node
// resolves to a real type/pool/tool and sits on a walkable tile, and every
// new consumable can be used. Run: node tools/test_economy.mjs
import assert from 'node:assert';

const { ITEMS, ENCHANTS, MERCHANT_CATALOG, COOKING_RECIPES, POTION_RECIPES } = await import('../src/data/items.js');
const { CRAFTING_RECIPES, ENCHANT_RECIPES, CATEGORY_LABELS } = await import('../src/data/craftingRecipes.js');
const { ENEMY_TYPES } = await import('../src/data/worldMap.js');
const { NODE_TYPES, YIELD_TABLES, resolveNode, rollHarvest } = await import('../src/data/gathering.js');
const { listMaps, getMap } = await import('../src/data/maps/index.js');
const { SPELLS, RESONANCE_GAINS } = await import('../src/data/spells.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

const needs = r => r.ingredients ?? (Array.isArray(r.input) ? r.input.map(id => ({ id, qty: 1 })) : r.input ? [{ id: r.input, qty: 1 }] : []);
const maps = listMaps().map(e => getMap(e.id ?? e));

// ---- where items come from
const sources = new Map();   // id -> first source found
const src = (id, how) => { if (!sources.has(id)) sources.set(id, how); };
MERCHANT_CATALOG.forEach(m => src(m.id, 'merchant'));
for (const [type, e] of Object.entries(ENEMY_TYPES)) (e.lootTable ?? []).forEach(l => src(l.id, `loot:${type}`));
for (const m of maps) {
    for (const node of m.spawns?.gatheringNodes ?? []) {
        const { pool } = resolveNode(node);
        pool.forEach(e => src(e.id, `node:${m.id}`));
    }
    for (const c of m.spawns?.chests ?? []) for (const it of c.contents ?? c.items ?? []) src(it.id ?? it, `chest:${m.id}`);
}
for (const r of [...COOKING_RECIPES, ...POTION_RECIPES, ...CRAFTING_RECIPES]) src(r.output, 'recipe');

// ---- every recipe is well-formed and every input is obtainable
for (const r of [...COOKING_RECIPES, ...POTION_RECIPES, ...CRAFTING_RECIPES]) {
    ok(ITEMS[r.output], `recipe output ${r.output} is an item`);
    for (const ing of needs(r)) {
        ok(ITEMS[ing.id], `${r.output}: ingredient ${ing.id} is an item`);
        ok(sources.has(ing.id), `${r.output}: ingredient ${ing.id} has a source`);
    }
}
for (const r of CRAFTING_RECIPES) ok(CATEGORY_LABELS[r.category], `${r.id}: category ${r.category} has a label`);
ok(new Set(CRAFTING_RECIPES.map(r => r.id)).size === CRAFTING_RECIPES.length, 'crafting recipe ids are unique');
for (const r of ENCHANT_RECIPES) {
    ok(ENCHANTS[r.enchant], `enchant recipe ${r.enchant} names a real enchantment`);
    for (const ing of r.ingredients) ok(sources.has(ing.id), `enchant ${r.enchant}: ingredient ${ing.id} has a source`);
}
for (const id of Object.keys(ENCHANTS)) ok(ENCHANT_RECIPES.some(r => r.enchant === id), `enchantment ${id} can be applied at the forge`);

// ---- gathering data
for (const [id, t] of Object.entries(NODE_TYPES)) {
    ok(YIELD_TABLES[t.yields], `node type ${id}: default pool ${t.yields} exists`);
    ok(t.tool === null || ITEMS[t.tool], `node type ${id}: tool ${t.tool} is an item`);
    ok(t.tool === null || sources.has(t.tool), `node type ${id}: tool ${t.tool} can be bought or made`);
}
for (const [id, pool] of Object.entries(YIELD_TABLES)) {
    ok(pool.some(e => e.w), `pool ${id} has a weighted entry`);
    for (const e of pool) ok(ITEMS[e.id], `pool ${id}: ${e.id} is an item`);
}
for (const m of maps) {
    const rows = m.tiles ?? [];
    const walled = rows.some(r => r.includes(1));   // 0/1 grids: 1 is a wall
    for (const node of m.spawns?.gatheringNodes ?? []) {
        const where = `${m.id} node ${node.type}@${node.x},${node.y}`;
        ok(NODE_TYPES[node.type], `${where}: known type`);
        ok(!node.yields || YIELD_TABLES[node.yields], `${where}: known pool ${node.yields}`);
        ok(resolveNode(node).pool.length > 0, `${where}: yields something`);
        const t = rows[node.y]?.[node.x];
        ok(t !== undefined, `${where}: inside the map`);
        if (walled) ok(t !== 1, `${where}: not inside a wall`);
    }
}
// base resources are guaranteed (quests count them)
for (let i = 0; i < 200; i++) {
    const wood = rollHarvest({ type: 'wood' });
    const ore  = rollHarvest({ type: 'mineral' });
    assert.ok(wood.some(h => h.id === 'wood' && h.qty >= 1), 'deadwood always gives wood');
    assert.ok(ore.some(h => h.id === 'mineral_ore' && h.qty >= 1), 'an ore seam always gives ore');
}
n += 2;
ok(rollHarvest({ type: 'wood', resource: 'wood' }).length === 1, 'legacy fixed-resource nodes still give one item');

// ---- every consumable can be used on a fresh character
for (const [id, item] of Object.entries(ITEMS)) {
    if (item.slot || !item.onUse) continue;
    const s = new PlayerStats();
    s.health = 10;
    s.mana = 0;
    let threw = null;
    try { item.onUse(s); } catch (e) { threw = e; }
    ok(!threw, `${id}.onUse runs (${threw?.message ?? ''})`);
    ok(s.health <= s.maxHealth && s.mana <= s.maxMana, `${id}: HP/MP stay within max`);
}

// ---- water magic can be started from gatherable or huntable sources
const waterSources = Object.entries(RESONANCE_GAINS).filter(([k, g]) => g.water && k !== 'cast_water');
ok(waterSources.length >= 3, `water resonance has world sources (${waterSources.map(([k]) => k).join(', ')})`);
const firstWater = Math.min(...Object.values(SPELLS).filter(sp => sp.element === 'water').map(sp => sp.discoverCondition.threshold));
ok(firstWater <= 5, `the first water spell is discoverable early (threshold ${firstWater})`);

// ---- forge enchantments override the weapon's own
{
    const s = new PlayerStats();
    s.addItem('voidwhisper_dagger');
    s.equipItem('voidwhisper_dagger');
    ok(s.activeEnchant() === 'vampiric', 'a weapon keeps its own enchantment');
    s.weaponEnchants.voidwhisper_dagger = 'tidal';
    ok(s.activeEnchant() === 'tidal', 'a forge enchantment replaces it');
    s.reset();
    ok(Object.keys(s.weaponEnchants).length === 0, 'a new game has no forge enchantments');
}

console.log(`✓ economy tests passed (${n} assertions; ${sources.size} obtainable items).`);
