// Enemy magic, dispels and interrupts: dispellable buffs, damage-taken and
// outgoing multipliers, who can cast, how casters pick a spell, and that the
// data (kits, spells, player counters) is consistent.
// Run: node tools/test_enemy_magic.mjs
import assert from 'node:assert';

const { statusManager } = await import('../src/systems/StatusManager.js');
const { STATUS_DEFS } = await import('../src/data/statuses.js');
const { ENEMY_SPELLS, ENEMY_KITS, BOSS_AEGIS, chooseEnemySpell } = await import('../src/data/enemyMagic.js');
const { ENEMY_TYPES } = await import('../src/data/worldMap.js');
const { SPELLS } = await import('../src/data/spells.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };
const near = (a, b, msg) => ok(Math.abs(a - b) < 1e-9, `${msg} (${a} vs ${b})`);
const mob = () => ({ _statuses: {}, health: 50, maxHealth: 100, setTint() {}, clearTint() {} });

// ---- dispel strips magical buffs only
{
    const e = mob();
    for (const id of ['mana_ward', 'empowered', 'hastened', 'mending', 'burning', 'poison', 'cursed']) statusManager.apply(e, id);
    const gone = statusManager.dispel(e).sort();
    eq(gone, ['empowered', 'hastened', 'mana_ward', 'mending'], 'dispel removes exactly the buffs');
    ok(statusManager.has(e, 'burning') && statusManager.has(e, 'poison') && statusManager.has(e, 'cursed'), 'debuffs stay');
    eq(statusManager.dispel(e), [], 'nothing left to dispel');
    const p = mob();
    ['blessed', 'regen', 'swift', 'warded'].forEach(id => statusManager.apply(p, id));
    eq(statusManager.dispel(p).length, 4, "the player's own buffs are dispellable too (Unweave)");
}

// ---- damage multipliers
{
    const e = mob();
    near(statusManager.damageTakenMult(e), 1, 'no status, full damage');
    statusManager.apply(e, 'mana_ward');
    near(statusManager.damageTakenMult(e), 0.5, 'mana ward halves damage');
    statusManager.apply(e, 'cursed');
    near(statusManager.damageTakenMult(e), 0.5 * 1.15, 'cursed makes it take more');
    const b = mob();
    statusManager.apply(b, BOSS_AEGIS.status);
    ok(statusManager.damageTakenMult(b) < 0.5, 'void aegis cuts damage hard');
    ok(b._statuses.void_aegis.remaining === Infinity, 'void aegis lasts until dispelled');
    const p = mob();
    statusManager.apply(p, 'blessed');
    near(statusManager.statsMult(p), 1.10, 'blessed: +10% damage dealt');
    near(statusManager.damageTakenMult(p), 0.90, 'blessed: -10% damage taken');
    const m = mob();
    statusManager.apply(m, 'empowered');
    near(statusManager.statsMult(m), 1.5, 'empowered enemies hit harder');
}

// ---- enemy regen (mending) heals the enemy itself
{
    const e = mob();
    statusManager.apply(e, 'mending');
    statusManager.tick(e, 1000);
    ok(e.health > 50, 'mending regenerates an enemy');
}

// ---- who can cast
{
    const e = mob();
    ok(statusManager.canCast(e), 'a free caster can cast');
    for (const id of ['silenced', 'hushed', 'frozen', 'shocked', 'entangled']) {
        const x = mob();
        statusManager.apply(x, id);
        ok(!statusManager.canCast(x), `${id} stops casting`);
    }
}

// ---- spell choice
{
    const self = { entity: 'me', hpFrac: 1, dist: 0, has: () => false };
    eq(chooseEnemySpell(['arcane_bolt'], {}, { distToPlayer: 100, allies: [self] }), { id: 'arcane_bolt', target: 'player' }, 'bolt when the player is in range');
    eq(chooseEnemySpell(['arcane_bolt'], {}, { distToPlayer: 999, allies: [self] }), null, 'no bolt out of range');
    eq(chooseEnemySpell(['arcane_bolt'], { arcane_bolt: 500 }, { distToPlayer: 100, allies: [self] }), null, 'no cast on cooldown');
    eq(chooseEnemySpell(['mend'], {}, { distToPlayer: 100, allies: [self] }), null, 'no mend when nobody is hurt');
    const hurt = { entity: 'ally', hpFrac: 0.3, dist: 60, has: () => false };
    eq(chooseEnemySpell(['mend'], {}, { distToPlayer: 100, allies: [self, hurt] }), { id: 'mend', target: 'ally' }, 'mend the most hurt ally');
    const far = { entity: 'far', hpFrac: 0.1, dist: 400, has: () => false };
    eq(chooseEnemySpell(['mend'], {}, { distToPlayer: 100, allies: [self, far] }), null, 'allies out of range are ignored');
    const warded = { entity: 'me', hpFrac: 1, dist: 0, has: id => id === 'mana_ward' };
    eq(chooseEnemySpell(['mana_ward', 'arcane_bolt'], {}, { distToPlayer: 100, allies: [warded] }), { id: 'arcane_bolt', target: 'player' }, 'no ward on someone already warded');
}

// ---- data consistency
for (const [type, kit] of Object.entries(ENEMY_KITS)) {
    ok(ENEMY_TYPES[type], `kit for a real enemy type: ${type}`);
    ok(!ENEMY_TYPES[type]?.passive, `${type} is hostile`);
    for (const id of kit) ok(ENEMY_SPELLS[id], `${type}: spell ${id} exists`);
}
for (const [id, sp] of Object.entries(ENEMY_SPELLS)) {
    ok(sp.castMs > 0 && sp.cooldown > sp.castMs, `${id}: cast and cooldown make sense`);
    if (sp.status) ok(STATUS_DEFS[sp.status], `${id}: status ${sp.status} exists`);
    if (['ward', 'empower', 'haste', 'mend'].includes(sp.kind)) ok(STATUS_DEFS[sp.status]?.magical && STATUS_DEFS[sp.status]?.buff, `${id}: its buff can be dispelled`);
}
ok(STATUS_DEFS[BOSS_AEGIS.status]?.magical, 'the boss aegis can be dispelled');
ok(SPELLS.unravel?.dispel && SPELLS.unravel?.interrupt, 'Unravel dispels and interrupts');
ok(SPELLS.counterspell?.interrupt, 'Counterspell interrupts');
ok(SPELLS.purifying_sweep?.dispel, 'Purifying Sweep dispels');
ok(SPELLS.hush?.applyStatus?.id === 'hushed' && SPELLS.luminance?.applyStatus?.id === 'silenced', 'Hush and Luminance silence (which breaks casts)');

console.log(`✓ enemy-magic tests passed (${n} assertions).`);
