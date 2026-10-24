#!/usr/bin/env node
// Generates docs/game_inventory.md: a complete inventory of the game's
// mechanics and content, read from the game's own data modules (spells,
// items, recipes, enemies, quests, campaign, maps…) so it is exact and can be
// regenerated whenever the data changes. The "systems" section is written by
// hand from the code (things that are behaviour, not data).
//
// Run from apps/amo/: node tools/gen_game_inventory.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '../src/');
const OUT = join(here, '../../../docs/game_inventory.md');

const { SPELLS, RESONANCE_ELEMENTS, RESONANCE_GAINS, TIER_NAMES } = await import(SRC + 'data/spells.js');
const { ITEMS, COOKING_RECIPES, POTION_RECIPES, ENCHANTS, MERCHANT_CATALOG, SATCHEL_TIERS } = await import(SRC + 'data/items.js');
const { CRAFTING_RECIPES, ENCHANT_RECIPES } = await import(SRC + 'data/craftingRecipes.js');
const { recipeStation, STATION_LABELS } = await import(SRC + 'data/stations.js');
const { isLocked } = await import(SRC + 'data/recipeScrolls.js');
const { upgradeCost } = await import(SRC + 'data/upgrades.js');
const { NODE_TYPES, YIELD_TABLES } = await import(SRC + 'data/gathering.js');
const { ENEMY_SPELLS, ENEMY_KITS, BOSS_AEGIS } = await import(SRC + 'data/enemyMagic.js');
const { FAMILIES, ENEMY_FAMILY, affinityOf } = await import(SRC + 'data/enemyAffinities.js');
const { ELITE_CHANCE, AFFIX_LABELS } = await import(SRC + 'data/elites.js');
const W = await import(SRC + 'data/worldMap.js');
const { STATUS_DEFS } = await import(SRC + 'data/statuses.js');
const { QUESTS } = await import(SRC + 'data/quests.js');
const { questSteps, rewardParts } = await import(SRC + 'data/questRules.js');
const { npcName } = await import(SRC + 'data/npcs.js');
const { BOUNTIES_PER_DAY, bountyReward } = await import(SRC + 'data/bounties.js');
const { BIOME_WEATHER, WEATHER, mapBiome, STORM, stormStrikeDamage } = await import(SRC + 'data/weather.js');
const { NIGHT_DAMAGE_MULT } = await import(SRC + 'systems/gameClock.js');
const { CHARACTERS } = await import(SRC + 'data/characters.js');
const { STORIES } = await import(SRC + 'data/stories.js');
const { DIALOGUES } = await import(SRC + 'data/dialogues.js');
const { listMaps, getMap } = await import(SRC + 'data/maps/index.js');
const campaigns = await import(SRC + 'data/campaigns/eldorias_prophecy.js');
const CAMPAIGN = Object.values(campaigns).find(v => v?.chapters);
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
const { PlayerStats, MASTERY_DEFS, xpForLevel } = await import(SRC + 'systems/PlayerStats.js');

const out = [];
const P = (s = '') => out.push(s);
const esc = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const table = (head, rows) => {
    P(`| ${head.join(' | ')} |`);
    P(`|${head.map(() => '---').join('|')}|`);
    for (const r of rows) P(`| ${r.map(esc).join(' | ')} |`);
    P();
};
const name = id => ITEMS[id]?.name ?? id;
const ing = list => list.map(i => `${i.qty > 1 ? i.qty + '× ' : ''}${name(i.id)}`).join(' + ');
const tiers = v => (Array.isArray(v) ? v.join(' / ') : v ?? '');
const pct = c => `${Math.round(c * 100)}%`;
const recipeNeeds = r => r.ingredients ?? [].concat(r.input ?? []).map(id => ({ id, qty: 1 }));

const items = Object.values(ITEMS);
const byType = {
    weapons: items.filter(i => i.slot === 'weapon'),
    armor: items.filter(i => ['body', 'head'].includes(i.slot)),
    accessories: items.filter(i => i.slot === 'accessory'),
};
const recipeOutputs = new Set([...COOKING_RECIPES, ...POTION_RECIPES, ...CRAFTING_RECIPES].map(r => r.output));
const ingredientIds = new Set([...COOKING_RECIPES, ...POTION_RECIPES, ...CRAFTING_RECIPES].flatMap(r => recipeNeeds(r).map(i => i.id)));

P('# Arcane Majesty (amo) — Complete Game Inventory');
P();
P(`_Generated from the game data by \`apps/amo/tools/gen_game_inventory.mjs\` on ${new Date().toISOString().slice(0, 10)}. Regenerate after changing the data; don't hand-edit._`);
P();
P('**At a glance:** ' + [
    `${Object.keys(SPELLS).length} spells in ${RESONANCE_ELEMENTS.length} elements`,
    `${Object.keys(new PlayerStats().skills).length} skills`, `${Object.keys(MASTERY_DEFS).length} masteries`,
    `${Object.keys(STATUS_DEFS).length} status effects`, `${items.length} items (${byType.weapons.length} weapons)`,
    `${COOKING_RECIPES.length} cooking recipes`, `${POTION_RECIPES.length} potion recipes`, `${CRAFTING_RECIPES.length} crafting recipes`,
    `${Object.keys(ENCHANTS).length} enchantments`, `${Object.keys(W.ENEMY_TYPES).length} enemy/creature types + 1 boss`,
    `${Object.keys(QUESTS).length} quests`, `${CAMPAIGN.chapters.length} campaign chapters`, `${listMaps().length} maps`,
    `${CHARACTERS.length} playable characters`, `${Object.keys(DIALOGUES).length} dialogues`,
].join(' · '));
P();
P('## Contents');
['Systems & controls', 'Character & progression', 'Magic — all spells', 'Status effects', 'Cooking', 'Brewing (potions)', 'Crafting', 'Enchantments',
 'Items', 'Shops', 'Gathering & world objects', 'Enemies & creatures', 'Boss', 'Quests', 'Campaign', 'Maps', 'Characters & stories', 'Dialogues']
    .forEach((s, i) => P(`${i + 1}. [${s}](#${s.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-')})`));   // GitHub anchors
P();

// ------------------------------------------------------------------ systems (hand-written from the code)
P('## Systems & controls');
P();
table(['Key', 'Action'], [
    ['Arrows / WASD', 'Move (speed 100 + 4 × Agility, × status speed)'], ['SHIFT (hold)', 'Sprint: ×1.6 speed, spends 20 Vigor/s; at 0 Vigor you are winded until it is back to 30 (touch: RUN toggle + push the stick fully; gamepad: hold LT)'], ['SPACE', 'Hop up to 2 tiles over fences, logs, small rocks and crates (25 Vigor); invulnerable for the first 0.25 s, so it is also your dodge (touch: HOP; gamepad: RT)'], ['Z', 'Attack (basic strike)'], ['X', 'Power attack'],
    ['E', 'Interact (talk to anyone, chests, signs, gathering, rift-gates, hearths, alchemy tables)'], ['Q R F T', 'Cast the spells in slots 1–4'],
    ['1 2 3 4', 'Use the consumable on hotbar slot 1–4 (assign from the Inventory with 1–4; touch: the row above the skill ring)'],
    ['H', 'Blink-Step (skill, 8 MP)'], ['V', 'Aetheric Sight (skill: slows enemies, shows their detection range)'],
    ['B', 'Build a campfire anywhere (costs 3 Wood)'], ['G', 'Aetheric Tear — open a rift to a known place (85% of max MP, cooldown)'],
    ['I', 'Inventory'], ['P', 'Stats'], ['K', 'Skill tree'], ['J', 'Spellbook'], ['M', 'Map: Region tab (explored ground, exits, doors, rift-gates, landmarks, quest markers; WASD/drag to pan, wheel or + − to zoom) and World tab (the places you have been); TAB, LB or RB switches'], ['N', 'Quest journal'],
    ['L', 'Codex (world lore, bestiary, recovered memories)'], ['C', 'Crafting bench'], ['ESC', 'Menu'], ['Gamepad', 'Full support (menus and play)'],
]);
table(['System', 'How it works'], [
    ['Doors & interiors', 'Buildings with a door can be entered (E). Leaving puts you back in front of the door you came through, even from a room inside a room (the inn\'s cellar). Some doors are locked until you carry a key or have earned the way in. Shelves and desks may hold a book to read (E); some homes hide a stash.'],
    ['Map & fog of war', 'Every outdoor map starts unknown. Walking reveals about 6 tiles around you (4 in dense forest) and the map remembers it; rooms are always fully known. The minimap shows the 48 tiles around you; M shows the whole map. Exits, doors and rift-gates appear once you have seen them; the active quest steps are marked (◆) where they lead, a step inside a building marks its door.'],
    ['Charts', "A cartographer by Thaloria's market sells charts (Thaloria 40 Gold, the East Road 60 Gold). Reading one shows the region's roads under the fog and marks where its landmarks are."],
    ['Townsfolk', 'Cities have people with a day of their own: they sleep at home, walk to work, sit in the inn at night and wander the streets in between — where anyone is follows the clock, so the market is busy in the morning and the inn full at night. Guards patrol and carry light after dark. E on anyone: named people talk and give quests as before; everyone else has something to say about the hour, the weather or the road. People step aside when you block their way.'],
    ['Shop hours', 'A shopkeeper sells only while at work (Thaloria\'s market: 08:00–18:00). Find them at the inn in the evening — "Closed — come back in the morning".'],
    ['Landmarks', 'Notable places. Reaching one the first time shows "Discovered: …", gives XP and pins it on your map.'],
    ['Dense forest', 'Deep woods shrink how far you see and darken the edges of the screen. Keep to the roads, or trust your map.'],
    ['Vigor', 'The green bar under MP (100, +2 per Agility above 10). Sprinting and hopping spend it; it refills at 25/s after 0.8 s of rest. It is not the Stamina attribute.'],
    ['Resonance', `Acting with an element (kills, casting, resting…) builds resonance in it (${RESONANCE_ELEMENTS.join(', ')}). Crossing a spell's threshold **discovers** it; further thresholds raise it to ${TIER_NAMES.join(' → ')}.`],
    ['Mana scent', 'Casting and blinking leave an "Aetheric Scent" (0–100) that decays over time; enemies detect you from up to 3× further while it is high.'],
    ['Mana exhaustion', 'Below 20% MP you suffer growing fatigue (up to −50%); emptying your mana exhausts or collapses you until you recover.'],
    ['Aetheric Tear', 'Teleport by tearing space (G): costs 85% of max MP (75% with a mastery). A mastery lets you target any explored location.'],
    ['Rift-Gates', 'Monoliths you attune to (E): save points and fast-travel destinations.'],
    ['Campfires', 'Placed (B, 3 Wood) or found. Rest (+30% HP/MP; full rest with a Tent: full restore + 50 XP), Cook, Brew.'],
    ["Scholar's Eye", 'Walking near ruins and ancient markers reveals lore echoes, collected in the Codex.'],
    ['Pillar gates & cracked boulders', 'The Earth Pillar spell raises stone that opens pillar gates and shatters cracked boulders.'],
    ['Stations', 'Cooking Hearth and Alchemy Table (rank 1–3) make feasts, three-ingredient dishes, greater potions and elixirs; they also make every campfire recipe of their kind. Hermit\'s Hut: hearth 1, alchemy 1; Thaloria: hearth 2, alchemy 2; Eldrin\'s Tower: alchemy 3.'],
    ['Craft ranks', 'Cooking and alchemy ranks rise at 25 and 75 crafts; rank 2/3 give a 15%/30% chance of a second dish or potion.'],
    ['Recipe scrolls', 'A dozen rare recipes stay hidden until their scroll is read; scrolls drop from elites (12%), the Void General, some chests, shops (by craft rank) and quests.'],
    ['Gear upgrades', 'At the forge (UPGRADE EQUIPPED): +1/+2/+3 per item; weapons +8% damage per level, armour and accessories +1 to each stat per level; cost by tier (ore, silver, heartwood, heartwood + ice crystal; aether shard at +3).'],
    ['Recipe discovery', 'A recipe appears once you have held one of its ingredients, and is fully revealed once you have held all of them.'],
    ['Satchel', `Inventory size by satchel tier: ${SATCHEL_TIERS.map(t => `${t.name} ${t.slots}`).join(', ')}.`],
    ['Currencies', "Gold buys mundane goods (food, tools, bags, materials, plain gear); Glint buys arcane goods (potions, scrolls, staves, spell-blades, shadow daggers, enchanted or rare gear). Selling pays in the item's currency; a 20% regional discount applies to the favoured one; the shop buys back your last 10 sales."],
    ['Quest givers & turn-ins', 'Some quests are offered by an NPC after you talk to them (Accept / Not now) and are turned in by talking to them again — a "Return to …" step is added automatically and only counts once the other objectives are done. Quests can require earlier quests, a dialogue choice or a campaign chapter; "bring" objectives count your inventory live and take the items on turn-in. Rewards can include XP, Glint, Gold, items, a recipe, a spell and Resonance Insights.'],
    ['Dialogue choices', 'Some lines offer numbered choices (↑↓ / 1–4 / click, E to confirm); a choice can start a quest or change what people say later.'],
    ['Bounty boards', `Thaloria and Silvara's camp have a Bounty Board: ${BOUNTIES_PER_DAY} new bounties each day — hunt 4–8 of a regional creature, bring down an elite, or bring 3–6 of a regional gathered item — one at a time per board, turned in at the board. Rewards scale with the region's level band (e.g. a 6-kill hunt pays ${bountyReward('hunt', { max: 3 }, 6).xp} XP / ${bountyReward('hunt', { max: 3 }, 6).gold} Gold at Lv 1–3 and ${bountyReward('hunt', { max: 9 }, 6).xp} XP / ${bountyReward('hunt', { max: 9 }, 6).gold} Gold at Lv 7–9; elites also pay Glint). Thaloria's board hunts the Summit of Despair.`],
    ['Clock', 'One real minute is one game hour (a 24-minute day); a new game starts at 08:00 on day 0. The HUD shows the day, the time and the weather. The clock only runs while you play (not behind menus) and is saved. Bounty boards refresh every game day.'],
    ['Day & night', `Night is 21:00–04:59 (dusk 19–21, dawn 5–6): outdoor maps darken, with light around you, campfires and hearths. Void-touched creatures deal ${Math.round((NIGHT_DAMAGE_MULT - 1) * 100)}% more damage at night. Some creatures only come out at night (shadow sprites and a void fox in the Prologue Forest) and leave at dawn once they stop fighting. Moonpetal only grows at night.`],
    ['Weather', `Each map's weather follows its biome and changes every 4–8 game hours — ${Object.entries(BIOME_WEATHER).map(([b, t]) => `${b}: ${Object.keys(t).map(k => WEATHER[k]).join('/')}`).join('; ')}. Rain and storms soak everyone every 10 s (fire spells ×0.8, lightning ×1.2, on top of Wet) and standing in the rain builds water, ice and nature resonance. Storms drop a lightning strike every 6–12 s, marked by a ring ${STORM.telegraphMs / 1000}s before it lands (${stormStrikeDamage({ max: 3 })} damage at Lv 1–3, more in higher regions). Snow chills you (Cold for 8 s) every 20 s unless you are within 120 px of a campfire or hearth or under Warming (Warmth Aura, Warming Draught: 90 s). Sandstorms cut enemy sight to 60%.`],
    ['Memories', 'Completing quests recovers lore fragments ("Archive of Souls"), readable in the Codex.'],
    ['Campaign', "Eldoria's Prophecy: chapters gate which maps you can enter; completing a chapter grants its unlocks; progress is saved."],
    ['Saving', 'Stats, inventory, equipment, spells, resonance, quests, campaign, codex, explored map (fog per map), charts read, landmarks discovered, attuned gates, chest contents, hotbar, craft counts, known recipes, gear upgrades, dialogue choices (flags), bounty boards and accepted bounties, the game clock, the doors you came in by.'],
    ['Online', 'Server select, online characters, chat; other players are visible (presence). The campaign is single-player.'],
    ['Character creator', 'LPC layered characters with palette swaps, export of the character and sheet (with licences).'],
]);

// ------------------------------------------------------------------ character
P('## Character & progression');
P();
const ps = new PlayerStats();
P(`Starting attributes: ${Object.entries(ps.attributes).map(([k, v]) => `${k} ${v}`).join(', ')}. Max HP = 60 + 8 × Stamina (100 at start); Max MP = 10 + 8 × Intelligence (50). Each level gives 1 attribute point and 1 skill point and fully restores HP/MP.`);
P();
P('Combat formulas: melee damage 8 + 2 × Strength (weapon type modifiers apply); crit chance 8% + 1.2% × Agility + 5% × Keen Eye level; spell blades add 1.4 × Intelligence.');
P();
let cum = 0;
table(['Level', 'XP to next', 'Total XP to reach'], [1, 2, 3, 5, 10, 15, 20, 25, 30].map(l => {
    let t = 0; for (let i = 1; i < l; i++) t += xpForLevel(i);
    return [l, xpForLevel(l), t];
}));
P('### Skills');
table(['Skill', 'Type', 'Max level', 'Requirements', 'Effect'], Object.values(ps.skills).map(s => [
    s.name, `${s.category} / ${s.type}`, s.maxLevel,
    s.requirements ? Object.entries(s.requirements).map(([k, v]) => typeof v === 'object' ? Object.entries(v).map(([e, n]) => `${e} resonance ${n}`).join(', ') : `${k} ${v}`).join(', ') : '—',
    s.description,
]));
P('### Masteries (bought with Resonance Insights from quests: hidden 3, main 2, side 1)');
table(['Mastery', 'Cost', 'Effect'], Object.values(MASTERY_DEFS).map(m => [m.name, m.cost, m.description]));
P('### Resonance gains');
table(['Action', 'Resonance gained'], Object.entries(RESONANCE_GAINS).map(([k, v]) => [k.replace(/_/g, ' '), Object.entries(v).map(([e, n]) => `${e} +${n}`).join(', ')]));

// ------------------------------------------------------------------ spells
P('## Magic — all spells');
P();
P(`Values given per tier (${TIER_NAMES.join(' / ')}). Discover = resonance needed in the element; mastery = resonance for the next tiers.`);
P();
for (const el of RESONANCE_ELEMENTS) {
    const list = Object.values(SPELLS).filter(s => s.element === el)
        .sort((a, b) => (a.discoverCondition?.threshold ?? 999) - (b.discoverCondition?.threshold ?? 999));
    P(`### ${el[0].toUpperCase() + el.slice(1)} (${list.length})`);
    table(['Spell', 'Discover / mastery', 'Targeting', 'Damage (base, per-level, scaling)', 'Mana', 'Cooldown (ms)', 'Range', 'Status', 'Learn from', 'Lore'], list.map(s => [
        `**${s.name}**${s.passive ? ' (passive)' : ''}${s.dispel ? ' · dispels' : ''}${s.interrupt ? ' · interrupts' : ''}`,
        `${s.discoverCondition?.threshold ?? '—'} / ${(s.masteryThresholds ?? []).join(', ')}`,
        (s.targetingType ?? '').replace(/_/g, ' '),
        s.baseDmg ? tiers(s.baseDmg) : '—',
        tiers(s.manaCost), tiers(s.cooldown), s.range ? tiers(s.range) + (s.radius ? ` (area ${tiers(s.radius)})` : '') : '—',
        s.applyStatus ? `${s.applyStatus.id} (${pct(s.applyStatus.chance ?? 1)}, ${s.applyStatus.duration ?? ''}ms)` : '—',
        (s.learnFrom ?? []).join(', '),
        (s.lore ?? s.description ?? '').split(/(?<=\.)\s/)[0],
    ]));
}

// ------------------------------------------------------------------ statuses
P('## Status effects');
table(['Status', 'Duration', 'Effect'], Object.values(STATUS_DEFS).map(s => [
    s.label, s.duration === -1 ? 'until removed' : `${(s.duration / 1000).toFixed(1)}s`,
    Object.entries(s).filter(([k]) => !['id', 'label', 'duration', 'tint'].includes(k)).map(([k, v]) => `${k}: ${v}`).join(', ') || '(flag used by spells/AI)',
]));
P('**Reactions:** Freeze — cold on a wet target freezes it for 3 s. Conduct — lightning on a wet target arcs to every other wet enemy within 90 px for 50% damage. Detonate — fire on a void-tainted target bursts for 15 + 30% of the hit around it. Steam — fire and water cancel out. Shatter — a physical hit on a frozen target deals ×1.5.');
P();

// ------------------------------------------------------------------ cooking / brewing / crafting
P('## Cooking');
P('At a campfire (REST / **COOK** / BREW) or a cooking hearth. Recipes appear as their ingredients are discovered; 🔒 recipes need their scroll.');
P();
const where = r => { const st = recipeStation(r); return (st ? `${STATION_LABELS[st.station]} ${st.rank}` : 'Campfire') + (isLocked(r.output) ? ' 🔒 scroll' : ''); };
table(['Dish', 'Where', 'Ingredients', 'Effect'], COOKING_RECIPES.map(r => [ITEMS[r.output]?.name ?? r.output, where(r), ing(recipeNeeds(r)), ITEMS[r.output]?.description ?? '']));
P('## Brewing (potions)');
P('At a campfire (BREW) or an alchemy table. Every potion needs an Empty Bottle; 🔒 recipes need their scroll.');
P();
table(['Potion', 'Where', 'Ingredients', 'Effect'], POTION_RECIPES.map(r => [ITEMS[r.output]?.name ?? r.output, where(r), ing(recipeNeeds(r)), ITEMS[r.output]?.description ?? '']));
P('## Crafting');
P('At the crafting bench (C).');
P();
table(['Item', 'Tier', 'Category', 'Ingredients', 'Result'], CRAFTING_RECIPES.map(r => [r.label, r.tier, r.category, ing(r.ingredients), ITEMS[r.output]?.description ?? '']));
P('**Gear upgrades** at the forge (UPGRADE EQUIPPED), materials by item tier:');
P();
table(['Tier', '+1', '+2', '+3'], [1, 2, 3, 4].map(t => [t === 4 ? '4–5' : t, ...[1, 2, 3].map(l => ing(upgradeCost({ tier: t }, l)))]));
P('## Enchantments');
P('Some weapons come with an enchantment. At the forge (Crafting) any enchantment can be bound to the **equipped weapon**, replacing the one it had.');
P();
table(['Enchantment', 'Effect', 'Forge materials', 'Found on'], Object.values(ENCHANTS).map(e => [
    e.name, e.description,
    ing(ENCHANT_RECIPES.find(r => r.enchant === e.id)?.ingredients ?? []),
    Object.values(ITEMS).filter(i => i.enchant === e.id).map(i => i.name).join(', ') || '—',
]));

// ------------------------------------------------------------------ items
const sources = {};
const addSrc = (id, s) => (sources[id] ??= new Set()).add(s);
for (const [k, e] of Object.entries(W.ENEMY_TYPES)) for (const l of e.lootTable ?? []) addSrc(l.id, `${k} ${pct(l.chance)}`);
for (const m of MERCHANT_CATALOG) addSrc(m.id, 'shop');
const allMaps = listMaps().map(e => getMap(e.id ?? e));
const nodePool = g => g.resource ? [{ id: g.resource }] : YIELD_TABLES[g.yields ?? NODE_TYPES[g.type]?.yields] ?? [];
for (const m of allMaps) for (const g of m.spawns?.gatheringNodes ?? []) for (const e of nodePool(g)) addSrc(e.id, `gathering: ${NODE_TYPES[g.type]?.label ?? g.type}`);
for (const c of W.CHEST_POSITIONS ?? []) for (const it of c.items ?? []) addSrc(it, 'chest');
for (const r of COOKING_RECIPES) addSrc(r.output, 'cooking');
for (const r of POTION_RECIPES) addSrc(r.output, 'brewing');
for (const r of CRAFTING_RECIPES) addSrc(r.output, 'crafting');
for (const q of Object.values(QUESTS)) for (const it of q.reward?.items ?? []) addSrc(it, `quest: ${q.title}`);
const srcText = id => { const s = [...(sources[id] ?? [])]; return s.length ? s.slice(0, 6).join(', ') + (s.length > 6 ? ` (+${s.length - 6} more)` : '') : '—'; };
const statText = st => Object.entries(st ?? {}).map(([k, v]) => `+${v} ${k.slice(0, 3).toUpperCase()}`).join(' ');

P('## Items');
P();
P(`### Weapons (${byType.weapons.length})`);
const wTypes = [...new Set(byType.weapons.map(w => w.weaponType))];
for (const t of wTypes) {
    const list = byType.weapons.filter(w => w.weaponType === t).sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
    P(`**${(t ?? 'other').replace(/_/g, ' ')}** (${list.length})`);
    P();
    table(['Weapon', 'Tier', 'Rarity', 'Stats', 'Buy / sell', 'Description', 'Source'], list.map(w => [
        w.name, w.tier ?? '', w.rarity ?? '', statText(w.stats), `${w.buyPrice ?? 0} / ${w.sellPrice ?? 0}`, w.description, srcText(w.id)]));
}
P(`### Armor & accessories (${byType.armor.length + byType.accessories.length})`);
table(['Item', 'Slot', 'Tier', 'Stats', 'Description', 'Source'], [...byType.armor, ...byType.accessories].map(i => [
    i.name, i.slot, i.tier ?? '', statText(i.stats), i.description, srcText(i.id)]));
const consumables = items.filter(i => !i.slot && !recipeOutputs.has(i.id) && !ingredientIds.has(i.id));
P(`### Other consumables, tools & key items (${consumables.length})`);
table(['Item', 'Description', 'Buy / sell', 'Source'], consumables.map(i => [i.name, i.description, `${i.buyPrice ?? 0} / ${i.sellPrice ?? 0}`, srcText(i.id)]));
P(`### Ingredients & materials (${ingredientIds.size})`);
table(['Ingredient', 'Used in', 'Source'], [...ingredientIds].map(id => {
    const uses = [...COOKING_RECIPES, ...POTION_RECIPES, ...CRAFTING_RECIPES].filter(r => recipeNeeds(r).some(i => i.id === id)).length;
    return [name(id), `${uses} recipes`, srcText(id)];
}));

// ------------------------------------------------------------------ shops
P('## Shops');
P(`Merchant catalogue (${MERCHANT_CATALOG.length} entries). Each item has one price, in gold (mundane goods) or glint (arcane goods).`);
P();
table(['Item', 'Price', 'Currency'], MERCHANT_CATALOG.map(m => [name(m.id), m.price, m.currency]));

// ------------------------------------------------------------------ world objects
P('## Gathering & world objects');
P('Walk up to a node and press **E**. Some need a tool in the satchel. Each harvest rolls the node\'s pool (rare extras roll on top); a harvested node regrows after a few minutes, and every node is full again when the map loads.');
P();
table(['Node', 'Tool', 'Default pool', 'Rolls', 'Regrows'], Object.entries(NODE_TYPES).map(([id, t]) => [
    t.label, t.tool ? name(t.tool) : '—', t.yields, t.rolls, `${Math.round(t.regrowMs / 60000 * 10) / 10} min`,
]));
P('### Yield pools');
const poolUse = {};
for (const m of allMaps) for (const g of m.spawns?.gatheringNodes ?? []) {
    const k = g.resource ? `fixed: ${g.resource}` : g.yields ?? NODE_TYPES[g.type]?.yields;
    ((poolUse[k] ??= {})[m.displayName ?? m.id] ??= 0);
    poolUse[k][m.displayName ?? m.id]++;
}
table(['Pool', 'Gives', 'Placed on'], Object.entries(YIELD_TABLES).map(([id, pool]) => {
    const tw = pool.filter(e => e.w).reduce((a, e) => a + e.w, 0);
    return [id, pool.map(e => `${name(e.id)} ${e.min === e.max ? e.min : `${e.min}–${e.max}`} (${e.w ? pct(e.w / tw) : `bonus ${pct(e.chance)}`})`).join(', '),
        Object.entries(poolUse[id] ?? {}).map(([m, c]) => `${m} ×${c}`).join(', ') || '—'];
}));
P(`Prologue world objects: ${W.CAMPFIRE_POSITIONS.length} campfires, ${W.CHEST_POSITIONS.length} chests, ${W.RIFT_GATE_POSITIONS.length} rift-gates, ${W.SIGN_POSITIONS.length} readable signs, ${W.PILLAR_GATE_POSITIONS.length} pillar gates, ${W.CRACKED_BOULDER_POSITIONS.length} cracked boulders, ${W.NPC_POSITIONS.length} NPC (${W.NPC_POSITIONS.map(n => n.name).join(', ')}).`);
P();

// ------------------------------------------------------------------ enemies
P('## Enemies & creatures');
const enemies = Object.entries(W.ENEMY_TYPES);
const hostile = enemies.filter(([, e]) => !e.passive), passive = enemies.filter(([, e]) => e.passive);
for (const [title, list] of [[`Hostile (${hostile.length})`, hostile], [`Passive animals (${passive.length}) — flee, hunted for meat and hides`, passive]]) {
    P(`### ${title}`);
    table(['Creature', 'Family', 'HP', 'Damage', 'Speed', 'XP', 'Loot'], list.map(([k, e]) => [
        k.replace(/_/g, ' '), FAMILIES[ENEMY_FAMILY[k]]?.label ?? '—', e.health ?? '', e.damage ?? '', e.speed ?? '', e.xpReward ?? 0,
        (e.lootTable ?? []).map(l => `${name(l.id)} ${pct(l.chance)}`).join(', ') || '—']));
}
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
P('### Enemy magic');
P('Caster creatures shape spells in the open: a coloured ring fills around them while they cast. **Silence, Hush, stuns, Counterspell and Unravel break the cast.** The buffs they raise (Mana Ward, Empowered, Hastened, Mending) are dispellable: **Unravel** and **Purifying Sweep** strip them, and Unravel hurts the target for every buff torn away. Mirror shades can *Unweave* your own protections (Blessed, Regen, Swift, Aetheric Ward).');
P();
const kindText = sp => {
    const label = STATUS_DEFS[sp.status]?.label ?? sp.status;
    if (['ward', 'empower', 'haste'].includes(sp.kind)) return `${label} on itself or an ally`;
    if (sp.kind === 'mend') return `heals the most hurt ally ${pct(sp.heal)} + ${label}`;
    if (sp.kind === 'bolt') return `${sp.dmg} damage${sp.status ? ` + ${label} (${pct(sp.chance ?? 1)})` : ''}`;
    return sp.dispel ? 'strips your magical buffs' : `${label} on you`;
};
table(['Spell', 'Effect', 'Cast', 'Cooldown', 'Range', 'Cast by'], Object.entries(ENEMY_SPELLS).map(([id, sp]) => [
    sp.name, kindText(sp), `${sp.castMs / 1000}s`, `${sp.cooldown / 1000}s`, sp.range,
    Object.entries(ENEMY_KITS).filter(([, k]) => k.includes(id)).map(([t]) => t.replace(/_/g, ' ')).join(', '),
]));
P('## Boss');
P(`**The Void General** — 350 HP, 20 damage, 280 XP. Three phases (enrages at 75/50/25% HP) with a burst attack and phase-3 special attacks. From 50% HP he channels a **${BOSS_AEGIS.name}** (${BOSS_AEGIS.castMs / 1000}s, every ${BOSS_AEGIS.cooldown / 1000}s): silence or stun him to break the channel, or Unravel the shield once it is up — while it holds he takes ${pct(STATUS_DEFS[BOSS_AEGIS.status].damageTakenMult)} damage. Guaranteed drops: Void Channel and Arcane Sceptre (tier 4 staves).`);
P();

// ------------------------------------------------------------------ quests / campaign
P('## Quests');
table(['Quest', 'Type', 'Given by', 'Requires', 'Steps', 'Reward'], Object.values(QUESTS).map(q => [
    q.title, q.type ?? '', q.giver ? npcName(q.giver) : '—',
    (q.requires ?? []).map(id => QUESTS[id]?.title ?? id).join(', ') || '—',
    questSteps(q).map(s => s.label ?? `${s.type} ${s.target}`).join(' → '),
    rewardParts(q.reward, { itemName: name, recipeName: name, spellName: id => SPELLS[id]?.name ?? id }).join(', ') || '—']));
P('## Campaign');
P(`**${CAMPAIGN.title}** — protagonist: ${CAMPAIGN.protagonist ?? 'Eldrin'}.`);
P();
table(['#', 'Chapter', 'Maps', 'Quests to complete', 'Unlocks'], CAMPAIGN.chapters.map((c, i) => [
    i + 1, c.title, (c.maps ?? []).join(', '), (c.quests ?? []).map(q => QUESTS[q]?.title ?? q).join(', '),
    (c.unlocks ?? []).map(u => `${u.type} ${u.id}`).join(', ') || '—']));

// ------------------------------------------------------------------ maps / characters / dialogues
P('## Maps');
table(['Map id', 'Name', 'Size (tiles)', 'Kind', 'Biome (weather)'], listMaps().map(entry => {
    const id = entry.id ?? entry;
    const m = getMap(id);
    const stub = m.tiles && m.tiles.length === 10 && m.tiles[0].length === 14;   // the shared chapter stub size
    const kind = /test|showcase|samplemap/.test(id) ? 'test / showcase' : m.tiledMap ? 'Tiled map' : stub ? 'chapter placeholder' : 'game map';
    return [id, m.displayName ?? m.chapterTitle ?? '', m.tiles ? `${m.tiles[0].length}×${m.tiles.length}` : '', kind, mapBiome(m)];
}));
P('## Characters & stories');
table(['Character', 'Role', 'About'], CHARACTERS.map(c => [c.name, c.role ?? '', (c.description ?? '').split(/(?<=\.)\s/)[0]]));
table(['Story', 'Summary'], STORIES.filter(s => s.id).map(s => [s.title, (s.description ?? s.summary ?? '').split(/(?<=\.)\s/)[0]]));
P('## Dialogues');
P(Object.keys(DIALOGUES).map(k => `\`${k}\``).join(', '));
P();

writeFileSync(OUT, out.join('\n'));
console.log(`wrote ${OUT} (${out.length} lines)`);

// --html <path>: the same inventory as a browsable page (searchable, with a
// contents sidebar), for reading outside an editor.
const htmlArg = process.argv.indexOf('--html');
if (htmlArg > 0) writeFileSync(process.argv[htmlArg + 1], toHtml(out));

function toHtml(lines) {
    const ELEMENT = { fire: '#d0572f', arcane: '#6f63e0', lightning: '#c9a227', shadow: '#6b5a8e', earth: '#9a7446', ice: '#3f9cc4', nature: '#4b9a57', wind: '#6aa89a', water: '#2f7fd0' };
    const inline = t => t
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/(^|\s)_(.+?)_(?=\s|$)/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\((#[^)]+)\)/g, '<a href="$2">$1</a>');
    const slug = t => t.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-');
    const body = [], toc = [];
    let i = 0, title = '';
    while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith('# ')) { title = l.slice(2); i++; continue; }
        if (l.startsWith('## ')) {
            const t = l.slice(3);
            if (t === 'Contents') { while (i + 1 < lines.length && !lines[i + 1].startsWith('## ')) i++; i++; continue; }
            toc.push(`<a href="#${slug(t)}">${inline(t)}</a>`);
            body.push(`<h2 id="${slug(t)}">${inline(t)}</h2>`); i++; continue;
        }
        if (l.startsWith('### ')) {
            const t = l.slice(4); const el = t.toLowerCase().split(' ')[0];
            const chip = ELEMENT[el] ? ` style="--el:${ELEMENT[el]}" class="element"` : '';
            body.push(`<h3${chip}>${inline(t)}</h3>`); i++; continue;
        }
        if (l.startsWith('|')) {
            const rows = [];
            while (i < lines.length && lines[i].startsWith('|')) { rows.push(lines[i]); i++; }
            const cells = r => r.slice(1, -1).split(/(?<!\\)\|/).map(c => inline(c.trim().replace(/\\\|/g, '|')));
            const head = cells(rows[0]);
            const trs = rows.slice(2).map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
            body.push(`<div class="scroll"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${trs}</tbody></table></div>`);
            continue;
        }
        if (l.trim()) body.push(`<p>${inline(l)}</p>`);
        i++;
    }
    return `<title>Arcane Majesty Codex</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Spectral:wght@500;700&family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Mono&display=swap">
<style>
:root{--bg:#f3f1ec;--panel:#fbfaf6;--ink:#1f2330;--muted:#636978;--line:#dcd8cc;--gold:#a8741a;--accent:#3d4a78;--row:#f0ede4;
 --display:'Spectral',Georgia,serif;--sans:'IBM Plex Sans',system-ui,sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#15171e;--panel:#1c1f28;--ink:#e6e3da;--muted:#9aa0ad;--line:#2e3240;--gold:#d9a441;--accent:#9aa8e0;--row:#20242e;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#15171e;--panel:#1c1f28;--ink:#e6e3da;--muted:#9aa0ad;--line:#2e3240;--gold:#d9a441;--accent:#9aa8e0;--row:#20242e;color-scheme:dark}
body{background:var(--bg);color:var(--ink);font:14px/1.55 var(--sans)}
.wrap{display:grid;grid-template-columns:230px minmax(0,1fr);gap:32px;max-width:1500px;margin:0 auto;padding-inline:20px}
nav{position:sticky;top:env(safe-area-inset-top,0px);align-self:start;max-height:100vh;overflow:auto;padding-block:24px;display:flex;flex-direction:column;gap:2px}
nav a{color:var(--muted);text-decoration:none;padding:3px 8px;border-radius:4px}
nav a:hover,nav a:focus-visible{color:var(--ink);background:var(--row);outline:none}
main{padding-block:24px 80px;min-width:0}
header{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
h1{font:700 34px/1.1 var(--display);margin:0;text-wrap:balance}
.glance{color:var(--muted);max-width:90ch}
.search{position:sticky;top:env(safe-area-inset-top,0px);z-index:2;background:var(--bg);padding-block:10px;border-bottom:1px solid var(--line)}
.search input{width:100%;font:15px var(--sans);padding:9px 12px;border:1px solid var(--line);border-radius:6px;background:var(--panel);color:var(--ink)}
.search input:focus{outline:2px solid var(--accent);outline-offset:0}
h2{font:700 24px/1.2 var(--display);margin:40px 0 10px;padding-top:8px;border-top:2px solid var(--gold);text-wrap:balance}
h3{font:600 15px/1.3 var(--sans);margin:22px 0 8px;letter-spacing:.02em}
h3.element{display:inline-flex;align-items:center;gap:8px}
h3.element::before{content:"";width:12px;height:12px;border-radius:50%;background:var(--el)}
p{max-width:95ch;margin:6px 0}
code{font:12.5px var(--mono);background:var(--row);padding:1px 5px;border-radius:3px}
.scroll{overflow-x:auto;margin:8px 0 14px;border:1px solid var(--line);border-radius:6px;background:var(--panel)}
table{border-collapse:collapse;width:100%;font-size:13px}
th{position:sticky;top:0;background:var(--row);text-align:left;font-weight:600;color:var(--muted);font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap}
th,td{padding:6px 10px;border-bottom:1px solid var(--line);vertical-align:top}
td{font-variant-numeric:tabular-nums}
tbody tr:hover td{background:var(--row)}
tbody tr:last-child td{border-bottom:none}
td:first-child{font-weight:600}
.empty{color:var(--muted);padding:24px 0}
@media (max-width:820px){.wrap{grid-template-columns:1fr}nav{position:static;max-height:none;flex-direction:row;flex-wrap:wrap;padding-block:12px 0}}
</style>
<div class="wrap">
<nav aria-label="Contents">${toc.join('')}</nav>
<main>
<header><h1>${inline(title)}</h1>${lines.filter(x => x.startsWith('**At a glance:**')).map(x => `<p class="glance">${inline(x)}</p>`).join('')}</header>
<div class="search"><input id="q" type="search" placeholder="Search spells, recipes, items, creatures, quests…" aria-label="Search the inventory"></div>
<div id="content">${body.filter(b => !b.includes('At a glance')).join('\n')}</div>
<p id="none" class="empty" hidden>Nothing matches that search.</p>
</main></div>
<script>
const q=document.getElementById('q'),content=document.getElementById('content'),none=document.getElementById('none');
q.addEventListener('input',()=>{const t=q.value.trim().toLowerCase();let any=false;
 content.querySelectorAll('tbody tr').forEach(tr=>{const m=!t||tr.textContent.toLowerCase().includes(t);tr.hidden=!m;if(m)any=true;});
 content.querySelectorAll('.scroll').forEach(s=>{s.hidden=!!t&&!s.querySelector('tbody tr:not([hidden])');});
 content.querySelectorAll('p').forEach(p=>{p.hidden=!!t;});
 none.hidden=!t||any;});
</script>`;
}
