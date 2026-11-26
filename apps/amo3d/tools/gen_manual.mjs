#!/usr/bin/env node
// Generates docs/game_inventory.md: a complete inventory of the game's
// mechanics and content, read from the game's own data modules (spells,
// items, recipes, enemies, quests, campaign, maps…) so it is exact and can be
// regenerated whenever the data changes. The "systems" section is written by
// hand from the code (things that are behaviour, not data).
//
// Run from apps/amo3d/: node tools/gen_manual.mjs   (copied 2026-11-25 from the archived 2D game's generator, apps/amo/tools/gen_game_inventory.mjs,
// pointed at packages/rules; writes docs/manual3d/game_inventory.md and docs/manual3d/index.html)
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '../../../packages/rules/src/');   // (the 3D game's rules: packages/rules)
const OUT = join(here, '../../../docs/manual3d/game_inventory.md');

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
const { WEAPON_TYPES } = await import(SRC + 'systems/weapons.js');
const { unlockLevel, unlockLevels, PASSIVE_CAP_LEVEL } = await import(SRC + 'systems/mastery.js');
const { STYLES, STYLE_IDS, STYLE_SKILLS } = await import(SRC + 'data/styles.js');
const { MANUAL_BONUS, LESSON_BONUS, lessonPrice, RELEASE_MIN_MANA } = await import(SRC + 'systems/styles.js');
const { MANUAL_PRICE, GUILD_CATALOG, ELITE_MANUAL_CHANCE } = await import(SRC + 'data/items.js');
const { guildScrolls, scrollPrice, ELITE_SCROLL_CHANCE, teachableSpells } = await import(SRC + 'systems/spellLearning.js');
const { AMMO, AMMO_IDS, KIND_CAP, NO_QUIVER_CAP, REFILL_MS, BACK_SHARE } = await import(SRC + 'systems/ammo.js');

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

P('# Arcane Majesty 3D — the game manual');
P();
P(`_Generated from the game data by \`apps/amo3d/tools/gen_manual.mjs\` (packages/rules) on ${new Date().toISOString().slice(0, 10)}. Regenerate after changing the data; don't hand-edit._`);
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
['Systems & controls', 'Combat', 'Character & progression', 'Magic — all spells', 'Status effects', 'Cooking', 'Brewing (potions)', 'Crafting', 'Enchantments',
 'Items', 'Shops', 'Gathering & world objects', 'Enemies & creatures', 'Boss', 'Quests', 'Campaign', 'Maps', 'Characters & stories', 'Dialogues']
    .forEach((s, i) => P(`${i + 1}. [${s}](#${s.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ /g, '-')})`));   // GitHub anchors
P();

// ------------------------------------------------------------------ systems (hand-written from the code)
P('## Systems & controls');
P();
P('_The 3D game (apps/amo3d). Keys below; the same actions are on touch (left half: move — push past the ring to sprint; right half: the camera; CAST / HIT / HOP; MENU for everything else) and on a gamepad._');
P();
table(['Key', 'Action'], [
    ['WASD', 'Move'], ['Shift', 'Sprint (spends Vigor)'], ['Space', 'Hop — hop through a swing to dodge it; with the stick held while something hunts you, a low dive'],
    ['F / right-click', 'The right hand: its spell or blow (two-hand actions: R / left-click for the left hand)'], ['Hold F / R', 'Aim a spell: a ring on the ground (area spells) or a dotted path (bolts); it snaps onto a creature near the aim; let go to cast'],
    ['Z / C', 'Cycle a hand\'s favourite actions (hold: the fan of the others)'], ['1–4', 'Hotbar'], ['G / Enter', 'Talk, open, gather, read'],
    ['T', 'Aetheric Tear (inside a thin place: the crossing Tear)'], ['L', 'Aether Sight'], ['H', 'Blink-Step (once learned)'],
    ['I / Tab', 'Satchel'], ['C', 'Character'], ['M', 'Map'], ['J', 'Journal'], ['K', 'Codex'], ['B', 'The Book: skills, spells, styles, favourites'], ['O', 'Options'], ['Esc', 'Pause · save · quit'], ['Enter', 'Chat (online)'], ['F1', 'The controls card'],
]);
table(['System', 'How it works'], [
    ['The open world', 'Eldoria is one seamless land (~11 km); Nythoria, the Umbral Plane, is its twin in the same space — the same land, its own buildings. Interiors and dungeons are behind doors. The Obsidian Gate crosses between the two.'],
    ['Levels of the land', 'Every point of both worlds has a level from 1 to 50, in five bands: the starters (1–10), the heartlands, lake and coast (11–20), the western woods, Iron Hollow and the isles (21–30), the Scarlands and beyond the Divide (31–40), the fire mountain, the Ruins and the Obsidian Citadel (41–50). A creature takes the level of the land where it lives (±1); dungeons have their own.'],
    ['Where you begin', 'A hero of your own chooses: the Emerald Fields\' village (Eldoria), the Shadow-Vale (Nythoria) or Thaloria\'s inn. Eldrin begins at his tower.'],
    ['The Outlander', 'A hero whose people belong to the other world (a Nythorian or Fallen Aurorian in Eldoria; a Human, Aurorian or Werewolf in Nythoria): traders there ask 25% more, wounds heal 25% slower, kills give 10% more experience. The character sheet says so while it applies.'],
    ['Quests', 'People with work for you offer it when you talk to them (Accept / Not now); talk to them again to turn it in. The journal (J) keeps your notes. Every band has its quests, from the starter villages to New Ravenspire and the Vale.'],
    ['Aether Sight (L)', 'The second hand of the world, for 4–6 s: creatures within 25 m are slowed, each one\'s detection range shows as a ring on the ground, the near-invisible show themselves, illusions show hollow; thin places show as columns of violet motes. 18 mana, 14 s. Eldrin has it from the Hermit; others learn the Aetheric Sight skill.'],
    ['Mana Scent', 'Magic leaves a scent predators follow: every spell raises it by its cost, it fades by 12 a second. Creatures within 4 m + 0.36 m a point (40 m at full) smell it and hunt you past their sight. A violet bar under the mana shows it.'],
    ['Aetheric Tear (T)', 'Tear the world open to an attuned rift gate: most of your mana, a cooldown; you arrive with 100% Mana Scent and a 2 s Resonance Stun.'],
    ['Across the veil', 'In a thin place (Whisper-Wood, before the Sanguine Vaults, the Great Rift\'s lip, and others the sight finds) the Tear can cross to the same spot on the other side. It takes the sight and level 30, ALL your mana (come full), once per game day, and you arrive with full Mana Scent and stunned. Some places can only be reached this way.'],
    ['Dual-wand overpower', 'A wand in each hand: cast the same spell with the other hand while the first is still taking shape — one bolt or blast at 2.2× power, bigger, for 60% more mana.'],
    ['Dungeons', 'Behind doors: the Deep Shaft under Iron Hollow, the Inferno Labyrinth\'s halls, the Keepers\' Vaults under the Ruins, the Sanguine Vaults (open its seal with the sight). Rooms of creatures at the dungeon\'s level, chests, a boss who bars the way down.'],
    ['Campaign', "Eldoria's Prophecy, chapters 1–12, for Eldrin: from the strata of Echoes of Stone to the vigil in his tower — the Summit, the Sanctuary and the Hermit, the Fire Gate, the Labyrinth's golems and the crucible, the Ruins, the Balrog, Vorgos's condition, the road home."],
    ['Day & night, weather', 'One real minute is one game hour. Nights are dark; each land has its weather.'],
    ['Saving', 'Three save slots; everything is kept: the world, quests, the journal, the codex, what you have explored.'],
]);

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
P('With a shield, the Block move raises it: for a moment, a hit **from the front** does only **30%** of its damage (never less than 1), and you move at half speed. Hits from behind get through — face your enemy! Lightning and poison are never blocked. Hold the button to keep the shield up (keyboard, gamepad); on touch, tap again.');
P();
P('### Getting better: mastery');
P('Every weapon, and every kind of magic, has a **mastery from 1 to 10**. Everyone starts at 1. You get better at what you **use**:');
P();
P('- Each hit with a weapon teaches it a little; each **kill** teaches more. Weak enemies teach you almost nothing — fight things your size.');
P('- Each spell that hits teaches its element (fire, water…) — and your wand or staff, if you hold one.');
P('- Every level makes it better: **+8% damage** and a little faster. At 10 that is +72%.');
P('- The character screen (P) shows every mastery as *level / your best*. A notice pops up each time one goes up.');
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
P('A dot (·) means Untrained: the hero can still use it, up to 3.');
P();
P('**Example — Eldrin with a sword.** He can fight with a sword, and he gets better at it — but only up to 3. His staff can reach 10.');
P();
P('### Classes (characters you create)');
P('A character you create picks a **class** the first time it enters the world. The class sets its talents — you can still pick up any weapon.');
P();
table(['Class', 'What it is', 'Gifted (10)', 'Trained (6)'], TAL.CLASS_IDS.map(id => {
    const name = k => Object.fromEntries(talentKeys)[k] ?? k;
    const c = TAL.CLASSES[id], by = v => Object.entries(c.talents).filter(([, x]) => x === v).map(([k]) => name(k)).join(', ');
    return [c.name, c.blurb, by('gifted'), by('trained')];
}));
P();
P('### Fighting styles');
P('Every weapon has **fighting styles**. A style gives you **three skills** — special moves you put on Q / R / F / T, next to your spells.');
P();
P('- Each skill opens at a **weapon mastery**: the first at **2**, the second at **5**, the third at **8**.');
P('- So your talent decides how many you get: **Untrained** (up to 3) gets the first skill, **Trained** (up to 6) two, **Gifted** (up to 10) all three.');
P('- A skill only works with its weapon **in your hands**. If it is not, the skill is greyed out and does nothing.');
P('- Skills cost no mana (except **Release**, which pours out all of it). Each one has a wait (shown on its slot) before you can use it again.');
P('- **Bow, crossbow and wand skills shoot straight ahead, the way you are facing** — turn towards your target first.');
P();
for (const id of STYLE_IDS) {
    const st = STYLES[id];
    if (st.later) continue;
    P(`**${WEAPON_TYPES[st.weapon].label} — ${st.name}.** ${st.blurb}`);
    P();
    table(['Skill', 'Opens at mastery', 'What it does', 'Wait'], st.skills.map(sid => {
        const k = STYLE_SKILLS[sid];
        return [k.name, k.unlock, k.desc, `${k.cd / 1000} s`];
    }));
    P();
}
P(`**Coming later:** ${STYLE_IDS.filter(id => STYLES[id].later).map(id => `${STYLES[id].name} (${WEAPON_TYPES[STYLES[id].weapon].label.toLowerCase()})`).join(' and ')}. Their manuals are on sale already — reading one now gives you a head start.`);
P();
P('### Learning a style');
P('A style is learned by filling its bar to **100%**. There are three ways, from slow to fast:');
P();
table(['Way', 'How much', 'Where'], [
    ['**Practice** (free, slow)', '1% for each enemy you defeat with that weapon — less for weak enemies, more for strong ones. With a wand or staff in hand, enemies your **spells** defeat count too', 'Anywhere. The STYLES screen shows which style you are practising.'],
    ['**A manual** (faster)', `+${MANUAL_BONUS}% at once, and after that your practice counts **double**`, `The Archivist's Guild in Thaloria (${MANUAL_PRICE} gold each: ${GUILD_CATALOG.filter(e => e.id.startsWith('manual_')).map(e => STYLES[e.id.replace('manual_', '')].name).join(', ')}). Elites sometimes drop one (${Math.round(ELITE_MANUAL_CHANCE * 100)}%). Read it from your satchel (I).`],
    ['**A teacher** (fastest, costs gold)', `+${LESSON_BONUS}% a lesson, **one lesson a day**, during the teacher's working hours. Lessons cost ${[0, 1, 2].map(lessonPrice).join(', then ')} gold`, 'In Thaloria: the **sergeant** in the barracks teaches Guard (one-handed sword), the **smith** in the smithy teaches Crusher (mace).'],
]);
P();
P('When the bar is full you get a message, and the style\'s skills appear as your mastery allows.');
P();
P('**To use a skill:** open **STYLES** (Y, or STYLE on the touch menu). Pick a skill, then press **Q, R, F or T** (gamepad: B, X, Y, RB — the same buttons that use them in a fight) to put it on that slot. Press the same key again to take it off. Close with Esc or Y (gamepad: Start).');
P();
P('**Example — Kael with a sword.** Kael wins fights with his sword until Guard is learned (or takes lessons from the sergeant). At sword mastery 2 he opens STYLES and puts **Parry** on Q. When a wolf leaps at him, he presses Q just before it bites: the bite does nothing and the wolf is dazed. At mastery 5 he adds **Riposte** on R — right after a parry it hits even harder.');
P();
P(`**Example — Seraphina with a wand.** She puts **Snap Cast** on Q and **Echo** on R. She presses R, then casts a fire spell at a wolf pack: the spell bursts, and a moment later it bursts again at half strength. With a staff instead, **Release** (mastery 8) pours out all her mana in one blast around her — the more mana she has, the bigger it is (it needs at least ${RELEASE_MIN_MANA}).`);
P();
P('### Learning spells');
P('Spells are learned the same three ways as styles:');
P();
table(['Way', 'What you get', 'Where'], [
    ['**Practice** (free)', 'Casting spells in fights raises that element\'s level, and new spells and tiers open as it grows', 'Anywhere.'],
    ['**A spell scroll**', 'One spell at **Novice**, at once — even one your element level has not reached yet', `The Archivist's Guild sells the easy ones (${guildScrolls().map(id => `${SPELLS[id].name} ${scrollPrice(SPELLS[id])}`).join(', ')} gold). Elites sometimes drop others (${Math.round(ELITE_SCROLL_CHANCE * 100)}%). Read it from your satchel (I); a scroll for a spell you know is kept.`],
    ['**A teacher** (costs gold)', 'One spell at **Novice** a lesson, **one lesson a day**, easiest first', `In Thaloria: the **priest** in the temple teaches arcane spells (${teachableSpells('arcane').map(id => SPELLS[id].name).join(', ')}). Lessons cost ${[0, 1, 2].map(lessonPrice).join(', then ')} gold.`],
]);
P();
P('A spell from a scroll or a teacher starts at **Novice**. Its **Apprentice** and **Adept** tiers still come only from that element\'s level — practise it.');
P();
P('### Arrows, bolts and quivers');
P('A **bow** shoots arrows and a **crossbow** shoots bolts. Each shot uses one. You can only shoot what is **in your quiver**.');
P();
P(`- **Out of a fight** (${REFILL_MS / 1000} seconds without attacking or being hit), your quiver fills itself from the arrows in your satchel.`);
P('- **In a fight** it does not: when it is empty you are **"Out of arrows"** until you step back for a moment.');
P(`- **Without a quiver** you can still keep ${NO_QUIVER_CAP} arrows ready.`);
P('- Your quiver sits in its own slot in the satchel (I), under your two hands. Next to your weapon at the bottom of the screen, ➶ shows how many arrows are ready, and (+…) how many more are in your satchel. It turns red when you have none ready.');
P();
const quivers = ['small_quiver', 'large_quiver', 'hunters_quiver'];
const shopOf = id => MERCHANT_CATALOG.find(m => m.id === id);
const craftOf = id => CRAFTING_RECIPES.find(r => r.output === id);
table(['Quiver', 'Holds', 'Kinds', 'Where'], [
    ['(none)', NO_QUIVER_CAP, 1, '—'],
    ...quivers.map(id => [name(id), ITEMS[id].quiver.kinds * KIND_CAP, `${ITEMS[id].quiver.kinds} (${KIND_CAP} each)`,
        shopOf(id) ? `Merchant, ${shopOf(id).price} ${shopOf(id).currency}` : `Craft (C): ${ing(craftOf(id).ingredients)}`]),
]);
P('A **kind** is one sort of ammunition: basic arrows, poison arrows, bolts… Each part of the quiver holds one kind.');
P();
const effect = id => AMMO[id].burst ? `Bursts and hurts every enemy within ${AMMO[id].burst.radius} px (${Math.round(AMMO[id].burst.mult * 100)}% of the hit)`
    : AMMO[id].status ? 'Poisons the enemy it hits' : AMMO[id].mult !== 1 ? `+${Math.round((AMMO[id].mult - 1) * 100)}% damage` : 'Plain';
const backTxt = id => !AMMO[id].back ? 'Never' : AMMO[id].back === id ? `About 1 in ${Math.round(1 / BACK_SHARE)}` : `About 1 in ${Math.round(1 / BACK_SHARE)}, as ${name(AMMO[id].back)}s`;
table(['Ammunition', 'For', 'Make it (C)', 'Buy it', 'What it does', 'Comes back'], AMMO_IDS.map(id => {
    const r = craftOf(id), s = shopOf(id);
    return [name(id), AMMO[id].type === 'bolt' ? 'Crossbow' : 'Bow', r ? `${ing(r.ingredients)} → ${r.makes}` : '—', s ? `Merchant: ${s.qty ?? 1} for ${s.price} ${s.currency}` : '—', effect(id), backTxt(id)];
}));
P(`**Materials:** **Sticks** — 1 Wood makes ${craftOf('stick').makes} (C), and chopping deadwood sometimes gives a few. **Feathers** — dropped by birds (hawks, crows, herons, vultures, chickens, turkeys); the Merchant sells ${shopOf('feather').qty} for ${shopOf('feather').price} ${shopOf('feather').currency}. Mineral Ore, Resin, Venom Sacs and Ember Stones you already know.`);
P();
P('**Getting arrows back.** When an enemy dies, about a third of the arrows and bolts that hit it fall on the ground where it died — walk over them to pick them up.');
P('- A **poison** arrow comes back as a basic arrow (its poison is used up).');
P('- An **explosive** arrow never comes back — and if it is the one that **kills** the enemy, the blast destroys **every** arrow in it.');
P('- Arrows shot at the **boss** do not come back.');
P();
P('**Choosing an arrow.** Plain **Shoot** (and the bow and crossbow skills) uses the first kind in your quiver. To shoot another kind, open the satchel (I) and click the **Second** button until it says, for example, **Shoot: Poison Arrow**.');
P();
P('**Example — Anya with a bow and a Large Quiver.** Basic arrows fill the first part of her quiver and poison arrows the second. **Attack** shoots basic arrows. She sets the **Second** button to **Shoot: Poison Arrow** and saves it for the wolf leader. After the fight she picks up the arrows that fell, waits a few seconds, and her quiver is full again.');
P();
P('A new character who starts with a bow gets a Small Quiver, 30 basic arrows, and a few Sticks and Feathers.');
P();
P('### Spells and the elements');
P('Your spells belong to you, not to your stick: you can cast them with a wand, a staff, a sword in hand — or nothing.');
P();
P('- A **wand** makes spells quicker (shorter waits) but a little weaker.');
P('- A **staff** makes spells stronger and wider, but slower to come back.');
P('- New spells come with your **element mastery**: the higher your water mastery, the more water spells you know, and the stronger their tiers (Novice → Apprentice → Adept).');
P(`- Being around an element — rain, a campfire, fighting its creatures — gives you a **feel** for it, but only up to mastery ${PASSIVE_CAP_LEVEL}: enough for the easiest spell of each element. After that, you learn by **casting its spells in fights**: every hit counts.`);
P('- Each hero starts knowing one or two spells: Eldrin Fireball and Tidal Bolt, Anya Mana Dart and Shadow Bolt, Seraphina Shadow Bolt. Kael knows none — he is a swordsman.');
P();
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
    s.requirements ? Object.entries(s.requirements).map(([k, v]) => typeof v === 'object' ? Object.entries(v).map(([e, n]) => `${e} mastery ${unlockLevel(n)}`).join(', ') : `${k} ${v}`).join(', ') : '—',
    s.description,
]));
P('### Masteries (bought with Resonance Insights from quests: hidden 3, main 2, side 1)');
table(['Mastery', 'Cost', 'Effect'], Object.values(MASTERY_DEFS).map(m => [m.name, m.cost, m.description]));
P(`### The feel for an element (counts only up to element mastery ${PASSIVE_CAP_LEVEL})`);
table(['Action', 'Resonance gained'], Object.entries(RESONANCE_GAINS).map(([k, v]) => [k.replace(/_/g, ' '), Object.entries(v).map(([e, n]) => `${e} +${n}`).join(', ')]));

// ------------------------------------------------------------------ spells
P('## Magic — all spells');
P();
P(`Values given per tier (${TIER_NAMES.join(' / ')}). Learned at = the element mastery that teaches the spell, then raises it to ${TIER_NAMES.slice(1).join(' and ')}.`);
P();
for (const el of RESONANCE_ELEMENTS) {
    const list = Object.values(SPELLS).filter(s => s.element === el)
        .sort((a, b) => (a.discoverCondition?.threshold ?? 999) - (b.discoverCondition?.threshold ?? 999));
    P(`### ${el[0].toUpperCase() + el.slice(1)} (${list.length})`);
    table(['Spell', 'Learned at (element mastery)', 'Targeting', 'Damage (base, per-level, scaling)', 'Mana', 'Cooldown (ms)', 'Range', 'Status', 'Learn from', 'Lore'], list.map(s => [
        `**${s.name}**${s.passive ? ' (passive)' : ''}${s.dispel ? ' · dispels' : ''}${s.interrupt ? ' · interrupts' : ''}`,
        unlockLevels(s) ? unlockLevels(s).join(' / ') : '—',
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
table(['Item', 'Price', 'Currency'], MERCHANT_CATALOG.map(m => [`${name(m.id)}${m.qty > 1 ? ` ×${m.qty}` : ''}`, m.price, m.currency]));

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
