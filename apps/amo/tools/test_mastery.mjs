// Combat C2: mastery 1-10 grown by use, capped by talent; spells by element level.
// Run: node tools/test_mastery.mjs
import assert from 'node:assert';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const M = await import('../src/systems/mastery.js');
const { SPELLS } = await import('../src/data/spells.js');
const { ITEMS } = await import('../src/data/items.js');

// ---- the curve: level L -> L+1 costs 40 x L (1,800 points to 10)
eq([M.pointsFor(1), M.pointsFor(2), M.pointsFor(3), M.pointsFor(10)], [0, 40, 120, 1800], 'points to reach a level');
eq([M.levelOf(0), M.levelOf(39.9), M.levelOf(40), M.levelOf(1800), M.levelOf(99999)], [1, 1, 2, 10, 10], 'level of a point total');
eq([M.CEILING.gifted, M.CEILING.trained, M.CEILING.untrained], [10, 6, 3], 'ceilings');
eq([M.FAMILY('arcane'), M.FAMILY('shadow'), M.FAMILY('water'), M.FAMILY('lightning')], ['light', 'dark', 'elemental', 'elemental'], 'magic families');
eq([M.ceilingOf({ sword: 'gifted' }, 'sword'), M.ceilingOf({}, 'sword'), M.ceilingOf({ dark: 'trained' }, 'dark')], [10, 3, 6], 'talent ceilings, untrained by default');

// ---- caps
eq(M.addPoints(0, 9999, 3), M.pointsFor(3), 'an untrained skill stops at level 3');
eq(M.addPoints(0, 9999, 10, { passive: true }), M.pointsFor(2), 'rain, campfires, kills by type: never past level 2');
eq(M.addPoints(500, 5, 10, { passive: true }), 500, 'passive gains never add above the passive cap');
eq(M.addPoints(10, 5, 10), 15, 'practice adds');

// ---- what a hit or kill teaches
eq(M.hitGain(false, 3, 3), 1, 'a hit on an equal: 1');
eq(M.hitGain(true, 3, 3), 6, 'a kill on an equal: 6');
ok(M.hitGain(true, 1, 9) < 2 && M.hitGain(true, 1, 9) > 0, 'weak enemies teach little');
eq(M.hitGain(true, 12, 2), 12, 'strong enemies teach twice as much, no more');

// ---- what levels do
eq([M.levelDamageMult(1), M.levelDamageMult(10)], [1, 1.72], '+8% damage per level');
eq([M.levelCooldownMult(1), Math.round(M.levelCooldownMult(10) * 100) / 100], [1, 0.82], '2% faster per level');
const eqp = (weapon, offHand = null) => ({ weapon, offHand });
eq([M.focusOf(eqp('longsword', 'novice_staff'), ITEMS), M.focusOf(eqp('willow_wand', 'novice_staff'), ITEMS), M.focusOf(eqp('longsword'), ITEMS)], ['staff', 'wand', null], 'the focus: main hand first, then off hand, else none');
eq(M.focusBonus(null, 5), { power: 1, radius: 1, cooldown: 1 }, 'no focus: no bonus, no penalty');
const w = M.focusBonus('wand', 5), s = M.focusBonus('staff', 5);
ok(w.power < 1 && w.cooldown < 1 && w.radius === 1, 'a wand casts faster, a little weaker');
ok(s.power > 1 && s.radius > 1 && s.cooldown > 1, 'a staff casts stronger and wider, more slowly');
ok(M.focusBonus('staff', 10).power > M.focusBonus('staff', 1).power, 'the focus bonus grows with its mastery');

// ---- spells by element level (option A: the passive cap teaches only the easiest)
eq(M.unlockLevels(SPELLS.tidal_bolt), [2, 4, 6], 'Tidal Bolt: Novice at water 2');
eq(M.unlockLevels(SPELLS.riptide)[0], 4, 'Riptide waits for water 4');
eq([M.tierAt(SPELLS.tidal_bolt, 1), M.tierAt(SPELLS.tidal_bolt, 2), M.tierAt(SPELLS.tidal_bolt, 6)], [0, 1, 3], 'tiers climb with the element');
const byPassive = Object.values(SPELLS).filter(sp => sp.discoverCondition && M.tierAt(sp, M.PASSIVE_CAP_LEVEL) > 0).map(sp => sp.id).sort();
eq(byPassive, ['drying_wind', 'fire_nova', 'fireball', 'rock_bullet', 'tidal_bolt'], 'the feel for an element alone teaches only these');
ok(Object.values(SPELLS).every(sp => !sp.discoverCondition || M.unlockLevels(sp).every(l => l >= 2 && l <= 10)), 'every unlock is between 2 and 10');
eq(M.unlockLevel(3), 2, 'a skill-tree requirement of resonance 3 means level 2');

// ---- old saves
eq(M.pointsFromResonance(18, 10), 90, 'resonance converts at 5 points each');
eq(M.pointsFromResonance(999, 3), M.pointsFor(3), '… capped by talent');

console.log(`test_mastery: ${n} checks passed`);
