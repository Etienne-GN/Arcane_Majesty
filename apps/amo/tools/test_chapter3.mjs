// Chapter 3 — Odyssey's Dawn: Thaloria, the East Road, their people, creatures and quests.
// Run: node tools/test_chapter3.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { playerStats } = await import('../src/systems/PlayerStats.js');
const { questManager } = await import('../src/systems/QuestManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- Engine: a read_signs step can target one sign by id
{
    playerStats.reset();
    playerStats.generatedQuests = {
        t_sign: { id: 't_sign', title: 'Sign', type: 'side', description: '', steps: [{ id: 's', type: 'read_signs', target: 'waystone', label: 'Read it', required: 1 }], reward: {} },
        t_any:  { id: 't_any',  title: 'Any',  type: 'side', description: '', steps: [{ id: 's', type: 'read_signs', target: 'any', label: 'Read one', required: 1 }], reward: {} },
    };
    questManager.startQuest('t_sign'); questManager.startQuest('t_any');
    questManager.onReadSign('bell_tower');
    ok(questManager.isActive('t_sign'), 'another sign does not count for a targeted step');
    ok(questManager.isCompleted('t_any'), 'any sign still counts for target any');
    questManager.onReadSign('waystone');
    ok(questManager.isCompleted('t_sign'), 'the named sign counts');
    playerStats.reset();
    playerStats.generatedQuests = { t_old: { id: 't_old', title: 'Old', type: 'side', description: '', steps: [{ id: 's', type: 'read_signs', label: 'x', required: 1 }], reward: {} } };
    questManager.startQuest('t_old');
    questManager.onReadSign();
    ok(questManager.isCompleted('t_old'), 'old steps without a target count any sign');
}

// ---- Content: quests, people, creatures, items, campaign
const { QUESTS } = await import('../src/data/quests.js');
const { NPCS } = await import('../src/data/npcs.js');
const { ITEMS } = await import('../src/data/items.js');
const { ENEMY_TYPES } = await import('../src/data/worldMap.js');
const { ENEMY_FAMILY } = await import('../src/data/enemyAffinities.js');
const { BESTIARY_LORE } = await import('../src/data/bestiary.js');
const { DIALOGUES } = await import('../src/data/dialogues.js');
const { ELDORIAS_PROPHECY } = await import('../src/data/campaigns/eldorias_prophecy.js');
const { getMap } = await import('../src/data/maps/index.js');
{
    const main = QUESTS.main_odysseys_dawn;
    ok(main && main.type === 'main', 'Odyssey\'s Dawn is the chapter\'s main quest');
    eq(main.steps.map(s => [s.type, s.target]), [['kill', 'void_stalker'], ['attune', 'gate_east_road'], ['talk', 'oren']], 'first combat, the first Rift-Gate node, Oren');
    ok(main.reward.items.includes('iron_spell_blade'), 'the Spell-Blade unlock');
    eq(ELDORIAS_PROPHECY.chapters.find(c => c.id === 'ch03_odysseys_dawn').quests, ['main_odysseys_dawn'], 'the campaign chapter uses it');
    ok(!QUESTS.stub_ch03_odysseys_dawn, 'the placeholder quest is gone');

    const rumor = QUESTS.side_traders_rumor;
    ok(rumor?.giver === 'thaloria_trader', 'Trader\'s Rumor is given by the Trader');
    ok(rumor.steps.some(s => s.type === 'read_signs' && s.target === 'waystone_anchor'), 'it sends you to the waystone');
    const bags = QUESTS.side_scholars_saddlebags;
    ok(bags?.giver === 'innkeeper', 'The Scholar\'s Saddlebags is given by the Innkeeper');
    ok(bags.steps.some(s => s.type === 'have' && s.target === 'scattered_journal_page' && s.required === 3 && s.consume), 'bring three journal pages');
    ok(ITEMS.scattered_journal_page, 'journal pages exist');

    for (const id of ['oren', 'innkeeper', 'thaloria_trader']) ok(NPCS[id]?.name && NPCS[id]?.place, `${id} is a known NPC`);
    ok(DIALOGUES.oren_meeting?.some(l => l.choices?.some(c => c.setFlag === 'oren_joined')), 'meeting Oren offers the choice to walk together');

    for (const t of ['blight_ent', 'root_wraith', 'corrupted_sentinel']) {
        ok(ENEMY_TYPES[t] && !ENEMY_TYPES[t].passive, `${t} is a hostile creature`);
        ok(ENEMY_FAMILY[t], `${t} has a family`);
        ok(BESTIARY_LORE[t], `${t} has bestiary lore`);
    }
    const drop = ENEMY_TYPES.corrupted_sentinel.lootTable.find(l => l.chance >= 1);
    ok(drop && ITEMS[drop.id], 'the Corrupted Sentinel always drops a real item');
}

// ---- Maps: Thaloria and the East Road are real, wired and walkable where it matters
{
    const T = getMap('thaloria'), E = getMap('east_road'), S = getMap('summit_of_despair');
    eq([T.id, E.id], ['thaloria', 'east_road'], 'both maps registered');
    ok(T.tiles[0].length >= 30 && T.tiles.length >= 24, 'Thaloria is a real city, not the 14x10 stub');
    ok(E.tiles[0].length >= 48 && E.tiles.length >= 30, 'the East Road is a real road');
    const walk = (m, px, py) => {
        const x = Math.floor(px / 32), y = Math.floor(py / 32);
        return m.tiles[y] !== undefined && [0, 2, 3].includes(m.tiles[y][x]);
    };
    const link = (from, to) => from.portals.find(p => p.targetMap === to.id);
    for (const [a, b] of [[T, E], [E, T], [E, S], [S, E]]) {
        const p = link(a, b);
        ok(p, `${a.id} has a way to ${b.id}`);
        ok(walk(b, p.targetX, p.targetY), `${a.id} → ${b.id} lands on open ground`);
    }
    ok(link(T, getMap('eldrin_tower')), 'Thaloria still leads to Eldrin\'s Tower');
    ok(walk(T, T.playerStart.x * 32 + 16, T.playerStart.y * 32 + 16) && walk(E, E.playerStart.x * 32 + 16, E.playerStart.y * 32 + 16), 'player starts are open ground');
    const npcIds = m => (m.spawns.npcs ?? []).map(n => n.id);
    ok(npcIds(T).includes('innkeeper') && npcIds(T).includes('thaloria_trader'), 'the inn\'s people are in Thaloria');
    ok(npcIds(E).includes('oren'), 'Oren waits on the East Road');
    ok(!(T.spawns.enemies ?? []).length, 'the city is safe');
    ok((T.spawns.signs ?? []).some(s => s.id === 'bell_tower'), 'the bell tower sign');
    ok((E.spawns.signs ?? []).some(s => s.id === 'waystone_anchor'), 'the waystone');
    ok((E.spawns.riftGates ?? []).some(g => g.id === 'gate_east_road'), 'the first Rift-Gate node');
    eq((E.spawns.chests ?? []).filter(c => c.items.includes('scattered_journal_page')).length, 3, 'three journal pages along the road');
    const types = (E.spawns.enemies ?? []).map(e => e.type);
    for (const t of ['void_stalker', 'blight_ent', 'root_wraith', 'corrupted_sentinel']) ok(types.includes(t), `${t} on the East Road`);
    ok((E.spawns.enemies ?? []).filter(e => e.type === 'void_stalker' && e.time === 'night').length >= 3, 'the night ambush at the copse');
    ok((T.quests ?? []).includes('main_odysseys_dawn'), 'arriving in Thaloria starts Odyssey\'s Dawn');
    ok(T.spawns.bountyBoards?.length && T.spawns.stations?.length === 2, 'Thaloria keeps its board and stations');
    for (const m of [T, E]) for (const n of m.spawns.npcs ?? []) ok(!n.id || NPCS[n.id], `${m.id}: NPC ${n.id} known`);
}

console.log(`test_chapter3: ${n} checks passed`);
