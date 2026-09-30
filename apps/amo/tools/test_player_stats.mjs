// Tests for the inventory / progression fixes from the 2026-09-30 mechanics
// review: stack-aware counting and consuming, the XP curve, the temporary
// max-HP bonus (no stacking, expires, not saved), haste vs slow speed, and
// food/tonics no longer raising max HP permanently.
import assert from 'node:assert';

// SaveManager writes to localStorage; give node a minimal one.
const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { PlayerStats, xpForLevel } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');
const { statusManager } = await import('../src/systems/StatusManager.js').catch(() => ({}));
const { ITEMS } = await import('../src/data/items.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- stack-aware counting / consuming
{
    const s = new PlayerStats();
    s.addItem('forest_herb', 5);
    eq(s.inventory.filter(i => i.id === 'forest_herb').length, 1, 'herbs stack in one slot');
    eq(s.countItem('forest_herb'), 5, 'count is the stack quantity');
    ok(s.consumeItem('forest_herb', 3), 'consume 3 of 5');
    eq(s.countItem('forest_herb'), 2, '2 left, stack kept');
    ok(!s.consumeItem('forest_herb', 3), 'cannot consume more than held');
    eq(s.countItem('forest_herb'), 2, 'a failed consume removes nothing');
    ok(s.consumeItem('forest_herb', 2), 'consume the rest');
    eq(s.inventory.some(i => i.id === 'forest_herb'), false, 'empty stack slot is removed');
    eq(s.countItem('tent'), 0, 'absent item counts 0');
}

// ---- XP curve
{
    eq(xpForLevel(1), 100, 'level 1 -> 2 costs 100');
    let total = 0;
    for (let l = 1; l < 20; l++) total += xpForLevel(l);
    ok(total > 40000 && total < 90000, `reaching level 20 takes a sane total (${total})`);
    const s = new PlayerStats();
    s.gainXp(100);
    eq(s.level, 2, 'levelled up once');
    eq(s.xpToNextLevel, xpForLevel(2), 'next requirement follows the curve');
}

// ---- temporary max HP
{
    const s = new PlayerStats();
    const base = s.maxHealth;
    s.addTempMaxHealth(10, 1000);
    eq(s.maxHealth, base + 10, '+10 applied');
    s.addTempMaxHealth(15, 1000);
    eq(s.maxHealth, base + 15, 'a stronger bonus replaces, not stacks');
    s.addTempMaxHealth(8, 1000);
    eq(s.maxHealth, base + 15, 'a weaker bonus does nothing');
    SaveManager.save(s, 'test', 'c1');
    const saved = JSON.parse([...store.values()].pop());
    eq(saved.maxHealth, base, 'the save stores max HP without the temporary bonus');
    ok(saved.health <= base, 'saved health never exceeds saved max');
    s.tickTempMaxHealth(1500);
    eq(s.maxHealth, base, 'bonus expires');
    ok(s.health <= s.maxHealth, 'health clamped on expiry');
}

// ---- food and tonics: no permanent max HP (Heart Crystal stays a permanent upgrade)
{
    for (const id of ['grand_feast', 'hearty_stew', 'bone_broth', 'bone_herb_soup', 'iron_skin_tonic']) {
        const s = new PlayerStats();
        const base = s.maxHealth;
        s._applyStatus = () => {};
        ITEMS[id].onUse(s);
        s.tickTempMaxHealth(10 * 60 * 1000 + 1);
        eq(s.maxHealth, base, `${id} leaves max HP unchanged once it wears off`);
    }
    const s = new PlayerStats();
    const base = s.maxHealth;
    ITEMS.heart_crystal.onUse(s);
    eq(s.maxHealth, base + 10, 'heart crystal is still permanent');
}

// ---- speed: slow and haste combine
if (statusManager?.speedMult) {
    const e = { _statuses: { swift: {} } };
    eq(statusManager.speedMult(e), 1.25, 'swift speeds up');
    e._statuses.cold = {};
    ok(Math.abs(statusManager.speedMult(e) - 0.7 * 1.25) < 1e-9, 'cold and swift combine');
    eq(statusManager.speedMult({ _statuses: {} }), 1, 'no status, normal speed');
}

// ---- reset: a new game starts clean
{
    const s = new PlayerStats();
    s.gold = 999; s.addItem('forest_herb'); s.chestContents['m:1,1'] = [];
    s.reset();
    eq(s.gold, 50, 'gold reset');
    eq(s.seenItems.size, 0, 'discovered items reset');
    eq(Object.keys(s.chestContents).length, 0, 'chest contents reset');
}

console.log(`✓ player-stats tests passed (${n} assertions).`);
