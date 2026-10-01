// Phase 1 foundations: save slots, location/respawn, world state, level
// bands, enemy respawn rule, area spell radius. Run: node tools/test_foundations.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- F0: saves without ids go to the active slot
{
    store.clear();
    SaveManager.setSlot('story1', 'eldrin');
    eq(SaveManager.slot(), { storyId: 'story1', characterId: 'eldrin' }, 'slot remembered');
    const s = new PlayerStats();
    s.glint = 77;
    ok(SaveManager.save(s), 'save without ids succeeds');
    ok(store.has('amo_save_story1_eldrin'), 'it lands in the active slot');
    ok(!store.has('amo_save_undefined_undefined'), 'not in the undefined slot');
    const t = new PlayerStats();
    ok(SaveManager.load(t, 'story1', 'eldrin'), 'loads back');
    eq(t.glint, 77, 'same data');
    SaveManager.setSlot(null, null);
    SaveManager.load(new PlayerStats(), 'story1', 'eldrin');
    eq(SaveManager.slot(), { storyId: 'story1', characterId: 'eldrin' }, 'load sets the active slot');
}

console.log(`✓ foundations tests passed (${n} assertions).`);
