// Status durations and effects: tier scaling, minimum durations (nothing
// flickers by too fast to notice), and the Void-Tainted / Dirty effects.
// Run: node tools/test_statuses.mjs
import assert from 'node:assert';

const { STATUS_DEFS } = await import('../src/data/statuses.js');
const { SPELLS, TIER_DURATION_MULT, scaledStatus } = await import('../src/data/spells.js');
const { ENEMY_SPELLS } = await import('../src/data/enemyMagic.js');
const { statusManager } = await import('../src/systems/StatusManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const mob = () => ({ _statuses: {}, health: 50, maxHealth: 100, setTint() {}, clearTint() {} });

// ---- tier scaling
{
    const fb = SPELLS.fireball;
    ok(scaledStatus(fb, 1).duration === fb.applyStatus.duration, 'novice: base duration');
    ok(scaledStatus(fb, 2).duration === Math.round(fb.applyStatus.duration * TIER_DURATION_MULT[1]), 'apprentice: ×1.25');
    ok(scaledStatus(fb, 3).duration === Math.round(fb.applyStatus.duration * TIER_DURATION_MULT[2]), 'adept: ×1.5');
    ok(scaledStatus(SPELLS.aetheric_ward, 3).duration < 0, 'permanent statuses stay permanent');
    ok(scaledStatus(SPELLS.mana_dart ?? {}, 1) === null, 'no applyStatus, nothing to scale');
}

// ---- minimum durations, by kind of status
const floorFor = id => {
    const d = STATUS_DEFS[id];
    if (d.stunned) return 2000;        // hard control: at least 2s
    if (d.buff) return 4000;           // buffs: at least 4s (Tempest Step's blink buff)
    if (id === 'marked') return 4000;  // Eclipse Mark: time to land the hit
    return 5000;                       // soft control and damage over time
};
for (const sp of Object.values(SPELLS)) {
    const st = sp.applyStatus;
    if (!st || st.duration == null || st.duration < 0) continue;
    ok(STATUS_DEFS[st.id], `${sp.id}: status ${st.id} exists`);
    ok(st.duration >= floorFor(st.id), `${sp.id}: ${st.id} lasts ${st.duration}ms (min ${floorFor(st.id)})`);
}
for (const [id, sp] of Object.entries(ENEMY_SPELLS)) {
    if (!sp.status || !sp.duration) continue;
    ok(sp.duration >= Math.min(floorFor(sp.status), 2000), `enemy ${id}: ${sp.status} lasts ${sp.duration}ms`);
}
for (const [id, d] of Object.entries(STATUS_DEFS)) {
    if (d.duration < 0) continue;
    ok(d.duration >= 2000, `${id}: default duration ${d.duration}ms is at least 2s`);
}

// ---- effects that used to do nothing
{
    const e = mob();
    statusManager.apply(e, 'void_tainted');
    ok(Math.abs(statusManager.incomingDmgMult(e, 'shadow') - 1.25) < 1e-9, 'void-tainted: shadow damage ×1.25');
    ok(statusManager.incomingDmgMult(e, 'fire') === 1, 'void-tainted: other elements unchanged');
    const d = mob();
    statusManager.apply(d, 'dirty');
    ok(statusManager.speedMult(d) === 0.9, 'dirty slows by 10%');
    statusManager.apply(d, 'wet');
    ok(!statusManager.has(d, 'dirty'), 'water washes dirt off');
}

// ---- fireball
ok(SPELLS.fireball?.element === 'fire' && SPELLS.fireball.discoverCondition.threshold <= 5, 'Fireball is an early fire spell');
ok(SPELLS.fireball.radius.length === 3 && SPELLS.fireball.projectileSpeed > 0, 'Fireball has a blast radius and flight speed');

console.log(`✓ status tests passed (${n} assertions).`);
