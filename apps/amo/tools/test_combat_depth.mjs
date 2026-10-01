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

console.log(`✓ combat-depth tests passed (${n} assertions).`);
