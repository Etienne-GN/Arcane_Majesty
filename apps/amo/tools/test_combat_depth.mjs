// Phase 2 combat depth: affinities, reactions, target frame, elites,
// bestiary, spell tooltips. Run: node tools/test_combat_depth.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { ENEMY_TYPES } = await import('../src/data/worldMap.js');
const { statusManager } = await import('../src/systems/StatusManager.js');
const AF = await import('../src/data/enemyAffinities.js');
const RX = await import('../src/systems/reactions.js');
const { targetInfo } = await import('../src/systems/targetInfo.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };
const mob = (extra = {}) => ({ _statuses: {}, health: 100, maxHealth: 100, active: true, setTint() {}, clearTint() {}, ...extra });

// ---- B1: affinities
{
    for (const type of Object.keys(AF.ENEMY_FAMILY)) ok(ENEMY_TYPES[type] || type === 'void_general', `family entry for a real creature: ${type}`);
    for (const fam of Object.values(AF.ENEMY_FAMILY)) ok(AF.FAMILIES[fam], `family ${fam} defined`);
    eq(AF.affinityMult('lava_elemental', 'fire'), 0.25, 'fire creatures shrug off fire');
    eq(AF.affinityMult('lava_elemental', 'water'), 1.5, 'and fear water');
    eq(AF.affinityMult('frost_bear', 'fire'), 1.5, 'ice creatures fear fire');
    eq(AF.affinityMult('wolf', 'fire'), 1, 'no family, no change');
    eq(AF.affinityMult('lava_elemental', null), 1, 'no element, no change');
    eq(AF.affinityOf('nobody'), { family: null, resist: {}, immune: [] }, 'unknown type is neutral');
    ok(AF.affinityOf('ember_imp').immune.includes('burning'), 'fire creatures cannot burn');

    const imp = mob({ immune: AF.affinityOf('ember_imp').immune });
    statusManager.apply(imp, 'burning');
    ok(!statusManager.has(imp, 'burning'), 'immunity blocks the status');
    statusManager.apply(imp, 'wet');
    ok(statusManager.has(imp, 'wet'), 'other statuses still apply');
}

// ---- B3: reactions
{
    // Freeze: cold on a wet target
    const e = mob();
    statusManager.apply(e, 'wet');
    statusManager.apply(e, 'cold');
    ok(statusManager.has(e, 'frozen'), 'cold + wet → frozen');
    ok(!statusManager.has(e, 'wet') && !statusManager.has(e, 'cold'), 'the water froze: no wet, no plain cold');
    ok(e._statuses.frozen.remaining === 3000, 'frozen for 3 s');
    const dry = mob();
    statusManager.apply(dry, 'cold');
    ok(statusManager.has(dry, 'cold') && !statusManager.has(dry, 'frozen'), 'cold on a dry target is just cold');
    const yeti = mob({ immune: ['cold', 'frozen'] });
    statusManager.apply(yeti, 'wet');
    statusManager.apply(yeti, 'cold');
    ok(!statusManager.has(yeti, 'frozen') && statusManager.has(yeti, 'wet'), 'immune to cold: no freeze, stays wet');

    // Conduct: one hop to other wet enemies in range
    const src = { x: 0, y: 0 };
    const a = { x: 50, y: 0, active: true, wet: true }, b = { x: 89, y: 0, active: true, wet: true };
    const far = { x: 200, y: 0, active: true, wet: true }, dryOne = { x: 10, y: 0, active: true, wet: false };
    const dead = { x: 20, y: 0, active: false, wet: true };
    eq(RX.conductTargets(src, [src, a, b, far, dryOne, dead], x => x.wet), [a, b], 'arcs to wet, live enemies within 90 px, never the source');
    eq(RX.CONDUCT_FRACTION, 0.5, 'half damage');

    // Detonate
    eq(RX.detonateDamage(100), 45, '15 + 30% of the hit');
    eq(RX.detonateDamage(0), 15, 'a weak hit still bursts');
}

// ---- B4: target info
{
    const e = mob({ enemyType: 'frost_shade', level: 8, health: 40, maxHealth: 120 });
    statusManager.apply(e, 'mana_ward');
    statusManager.apply(e, 'burning');
    e._cast = { id: 'frost_bolt', elapsed: 500, castMs: 1000 };
    const t = targetInfo(e);
    eq([t.name, t.level, t.hp, t.maxHp, t.dead, t.elite], ['Frost Shade', 8, 40, 120, false, false], 'name, level, HP');
    eq(t.family, 'Frost-born', 'family label');
    eq(t.statuses.filter(s => s.buff).map(s => s.id), ['mana_ward'], 'buffs listed');
    eq(t.statuses[0].id, 'mana_ward', 'buffs first');
    ok(t.statuses.some(s => s.id === 'burning'), 'debuffs listed too');
    ok(t.statuses.find(s => s.id === 'mana_ward').secs === 12, 'seconds left, rounded up');
    eq(t.cast, { name: 'Frost Bolt', frac: 0.5 }, 'cast in progress');
    const gone = targetInfo({ ...e, active: false, health: -5 });
    eq([gone.dead, gone.hp], [true, 0], 'a dead target reads 0 HP without throwing');
    const boss = mob({ enemyType: 'void_general', displayName: 'Void General', _aegisCast: { elapsed: 800 } });
    eq(targetInfo(boss).cast.name, 'Void Aegis', 'the boss channel shows');
    eq(targetInfo(mob({ enemyType: 'wolf', elite: true, affixes: ['vampiric'] })).elite, true, 'elite flag');

    const s = new PlayerStats();
    eq(s.seenEnemyTypes, [], 'new character has seen nothing');
    store.clear(); SaveManager.setSlot('t', 'eldrin');
    s.seenEnemyTypes.push('wolf'); SaveManager.save(s);
    const u = new PlayerStats(); SaveManager.load(u, 't', 'eldrin');
    eq(u.seenEnemyTypes, ['wolf'], 'seen creatures saved');
}

console.log(`✓ combat-depth tests passed (${n} assertions).`);
