// Combat C1: weapon types, the two hands, and the two move buttons.
// Run: node tools/test_weapons.mjs
import assert from 'node:assert';

let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const W = await import('../src/systems/weapons.js');
const I = {
    staff1: { id: 'staff1', slot: 'weapon', weaponType: 'staff' },
    sword1: { id: 'sword1', slot: 'weapon', weaponType: 'spell_blade' },
    dag1:   { id: 'dag1',   slot: 'weapon', weaponType: 'umbral_dagger' },
    bow1:   { id: 'bow1',   slot: 'weapon', weaponType: 'resonance_bow' },
    spear1: { id: 'spear1', slot: 'weapon', weaponType: 'spear' },
    shield1:{ id: 'shield1', slot: 'weapon', weaponType: 'shield' },
    wand1:  { id: 'wand1',  slot: 'weapon', weaponType: 'wand' },
    ring:   { id: 'ring',   slot: 'accessory' },
};
const eqp = (weapon = null, offHand = null) => ({ head: null, body: null, weapon, offHand, accessory1: null, accessory2: null });

// ---- types
eq(Object.keys(W.WEAPON_TYPES).sort(), ['axe', 'bo', 'bow', 'crossbow', 'dagger', 'fists', 'greatsword', 'mace', 'shield', 'spear', 'staff', 'sword', 'wand'], 'thirteen types');
for (const [t, d] of Object.entries(W.WEAPON_TYPES)) {
    ok([1, 2, 'off'].includes(d.hands) || t === 'fists', `${t}: hands`);
    ok(d.label && d.basic && d.anim && d.arc && d.cooldown > 0 && d.dmgMult > 0, `${t}: complete`);
}
eq([W.typeOf(I.staff1), W.typeOf(I.sword1), W.typeOf(I.dag1), W.typeOf(I.bow1)], ['staff', 'sword', 'dagger', 'bow'], 'old weapon types map to the new ones');
eq([W.typeOf(null), W.typeOf(I.ring), W.typeOf({ slot: 'weapon', weaponType: 'nope' })], ['fists', 'fists', 'fists'], 'nothing in hand: fists');
ok(W.WEAPON_TYPES.spear.reach > W.WEAPON_TYPES.sword.reach && W.WEAPON_TYPES.dagger.cooldown < W.WEAPON_TYPES.sword.cooldown, 'a spear reaches further, a dagger strikes faster');

// ---- hands
eq(W.equipPlan(eqp(), I.sword1, 'main', I), { slot: 'weapon', clear: [] }, 'a sword in an empty main hand');
eq(W.equipPlan(eqp('sword1'), I.staff1, 'off', I), { slot: 'offHand', clear: [] }, 'full Gandalf: a staff in the off hand');
eq(W.equipPlan(eqp('sword1', 'staff1'), I.bow1, 'main', I), { slot: 'weapon', clear: ['offHand'] }, 'a two-hander frees the off hand');
eq(W.equipPlan(eqp('bow1'), I.dag1, 'off', I), { slot: 'offHand', clear: ['weapon'] }, 'an off-hand item takes the hand back from a two-hander');
eq(W.equipPlan(eqp('sword1'), I.shield1, 'main', I), { slot: 'offHand', clear: [] }, 'a shield always goes in the off hand');
eq(W.equipPlan(eqp('bow1'), I.shield1, 'main', I), { slot: 'offHand', clear: ['weapon'] }, 'a shield takes the off hand back from a two-hander');
eq(W.equipPlan(eqp('sword1', 'dag1'), I.spear1, 'off', I), { slot: 'weapon', clear: ['offHand'] }, 'a two-hander asked for the off hand still takes both hands');
eq(W.equipPlan(eqp('sword1'), I.ring, 'main', I), null, 'not a weapon: not planned here');

// ---- moves
const moves = es => W.movesFor(es, I).map(m => m.id);
eq(moves(eqp('sword1', 'staff1')), ['main:basic', 'main:power', 'off:basic'], 'sword and staff: both basics and the power strike');
eq(moves(eqp('sword1', 'shield1')), ['main:basic', 'main:power', 'off:block'], 'a shield blocks');
eq(moves(eqp('bow1')), ['main:basic', 'main:power'], 'a two-hander: no off hand');
eq(moves(eqp('sword1')), ['main:basic', 'main:power', 'off:basic'], 'an empty off hand punches');
eq(W.movesFor(eqp('sword1'), I).find(m => m.id === 'off:basic').type, 'fists', '… with a fist');
eq(W.defaultMoves(eqp('sword1', 'staff1'), I), { attack: 'main:basic', second: 'off:basic' }, 'defaults: each hand its basic');
eq(W.defaultMoves(eqp('sword1', 'shield1'), I), { attack: 'main:basic', second: 'off:block' }, 'defaults: a shield blocks');
eq(W.defaultMoves(eqp('bow1'), I), { attack: 'main:basic', second: 'main:power' }, 'defaults: a two-hander powers');
eq(W.defaultMoves(eqp('sword1'), I), { attack: 'main:basic', second: 'main:power' }, 'defaults: no off-hand weapon powers');
const r = W.resolveMoves({ attack: 'off:basic', second: 'main:basic' }, eqp('sword1', 'staff1'), I);
eq([r.attack.id, r.attack.type, r.second.id, r.second.type], ['off:basic', 'staff', 'main:basic', 'sword'], 'chosen slots: staff on attack, sword on the second button');
const gone = W.resolveMoves({ attack: 'off:basic', second: 'off:block' }, eqp('bow1'), I);
eq([gone.attack.id, gone.second.id], ['main:basic', 'main:power'], 'slots the gear no longer offers fall back to the defaults');
ok(W.resolveMoves({ attack: null, second: null }, eqp(), I).attack.type === 'fists', 'bare hands: attack is a punch');
eq(W.movesFor(eqp('sword1', 'staff1'), I).map(m => m.label), ['Slash', 'Power Slash', 'Blast'], 'move labels name the weapon move');

// ---- where a hit comes from (frontal block now, Backstab in C3)
const me = { x: 100, y: 100 };
ok(W.isFrontal('right', me, { x: 140, y: 100 }), 'a hit from the right while facing right: frontal');
ok(W.isFrontal('right', me, { x: 120, y: 60 }), 'from the front-right diagonal: frontal');
ok(!W.isFrontal('right', me, { x: 60, y: 100 }), 'from behind: not frontal');
ok(W.isFrontal('up', me, { x: 100, y: 100 }), 'from the very same spot: frontal (never a free pass)');
ok(W.isBehind('left', me, { x: 140, y: 100 }), 'an enemy facing left, struck from its right: behind it');
ok(!W.isBehind('left', me, { x: 100, y: 140 }), 'struck from its side: not behind');
ok(!W.isBehind('down', me, { x: 100, y: 140 }), 'struck from the front: not behind');

console.log(`test_weapons: ${n} checks passed`);
