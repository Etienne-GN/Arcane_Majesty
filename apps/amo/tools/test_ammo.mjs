// Combat C5: arrows, bolts and quivers (spec §5). Run: node tools/test_ammo.mjs
import assert from 'node:assert';
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

const A = await import('../src/systems/ammo.js');
const W = await import('../src/systems/weapons.js');
const { ITEMS } = await import('../src/data/items.js');

// ---- data
for (const id of A.AMMO_IDS) ok(ITEMS[id]?.ammo === A.AMMO[id].type && ITEMS[id].stackable, `${id} is a stackable ammo item`);
ok(ITEMS.stick?.stackable && ITEMS.feather?.stackable, 'sticks and feathers stack');
eq([ITEMS.small_quiver, ITEMS.large_quiver, ITEMS.hunters_quiver].map(d => [d.slot, d.quiver.kinds]), [['quiver', 1], ['quiver', 2], ['quiver', 3]], 'three quivers');
eq(W.WEAPON_TYPES.bow.ammo, 'arrow', 'a bow shoots arrows');
eq(W.WEAPON_TYPES.crossbow.ammo, 'bolt', 'a crossbow shoots bolts');
ok(!W.WEAPON_TYPES.wand.ammo, 'a wand needs no ammo');
eq(A.AMMO.broadhead_arrow.mult, 1.35, 'broadhead +35%');
eq(A.AMMO.poison_arrow.back, 'basic_arrow', 'poison comes back as basic');
eq(A.AMMO.explosive_arrow.back, null, 'explosive never comes back');

// ---- layout
eq(A.quiverLayout(null), { kinds: 1, cap: 10 }, 'no quiver: 10 ready');
eq(A.quiverLayout(ITEMS.small_quiver), { kinds: 1, cap: 30 }, 'small: 30');
eq(A.quiverLayout(ITEMS.hunters_quiver), { kinds: 3, cap: 30 }, "Hunter's: 3 × 30");

// ---- fitLoad: never more than the pack holds
const small = A.quiverLayout(ITEMS.small_quiver), hunt = A.quiverLayout(ITEMS.hunters_quiver);
eq(A.fitLoad([{ id: 'basic_arrow', qty: 30 }], small, { basic_arrow: 12 }), [{ id: 'basic_arrow', qty: 12 }], 'crafted or sold away: the load drops');
eq(A.fitLoad([], hunt, {}), [{ id: null, qty: 0 }, { id: null, qty: 0 }, { id: null, qty: 0 }], 'empty compartments');
eq(A.fitLoad([{ id: 'basic_arrow', qty: 5 }, { id: 'bolt', qty: 5 }], small, { basic_arrow: 9, bolt: 9 }), [{ id: 'basic_arrow', qty: 5 }], 'a smaller quiver drops a compartment');

// ---- refillLoad
eq(A.refillLoad([], small, { basic_arrow: 45 }, 'arrow'), [{ id: 'basic_arrow', qty: 30 }], 'fills from the pack, up to 30');
eq(A.refillLoad([{ id: 'basic_arrow', qty: 4 }], small, { basic_arrow: 10 }, 'arrow'), [{ id: 'basic_arrow', qty: 10 }], 'tops up');
eq(A.refillLoad([{ id: 'poison_arrow', qty: 0 }], small, { poison_arrow: 0, basic_arrow: 8 }, 'arrow'), [{ id: 'basic_arrow', qty: 8 }], 'a spent kind leaves; the next one comes in');
eq(A.refillLoad([], hunt, { basic_arrow: 40, poison_arrow: 10, bolt: 20 }, 'arrow'),
    [{ id: 'basic_arrow', qty: 30 }, { id: 'poison_arrow', qty: 10 }, { id: 'bolt', qty: 20 }], 'three kinds: the held weapon\'s first');
eq(A.refillLoad([{ id: 'basic_arrow', qty: 30 }], small, { basic_arrow: 30, bolt: 20 }, 'bolt'), [{ id: 'bolt', qty: 20 }],
    'Review Focus 2: holding a crossbow, a one-kind quiver of arrows switches to bolts');
eq(A.refillLoad([{ id: 'basic_arrow', qty: 30 }], small, { basic_arrow: 30 }, 'bolt'), [{ id: 'basic_arrow', qty: 30 }], 'no bolts in the pack: the arrows stay');

// ---- pickAmmo
const load = [{ id: 'basic_arrow', qty: 0 }, { id: 'poison_arrow', qty: 3 }, { id: 'bolt', qty: 2 }];
eq(A.pickAmmo(load, 'arrow'), 1, 'the first compartment with arrows left');
eq(A.pickAmmo(load, 'bolt'), 2, 'bolts');
eq(A.pickAmmo(load, 'arrow', 'basic_arrow'), -1, 'that kind is spent');
eq(A.pickAmmo(load, 'arrow', 'poison_arrow'), 1, 'a chosen kind');

// ---- getting arrows back
const t = {};
A.recordHit(t, 'basic_arrow', false); A.recordHit(t, 'basic_arrow', false); A.recordHit(t, 'basic_arrow', false);
A.recordHit(t, 'poison_arrow', false); A.recordHit(t, 'explosive_arrow', false);
eq(t._ammoIn, { basic_arrow: 4 }, 'poison counts as basic; explosive not at all');
eq(A.ammoBack({ basic_arrow: 6 }, false, () => 0.99), [{ id: 'basic_arrow', qty: 2 }], 'a third of six');
eq(A.ammoBack({ basic_arrow: 4 }, false, () => 0.99), [{ id: 'basic_arrow', qty: 1 }], 'a third of four, unlucky');
eq(A.ammoBack({ basic_arrow: 4 }, false, () => 0), [{ id: 'basic_arrow', qty: 2 }], 'a third of four, lucky');
eq(A.ammoBack({ basic_arrow: 1 }, false, () => 0.5), [], 'one arrow, unlucky: none');
const k = { _ammoIn: { basic_arrow: 9 } };
A.recordHit(k, 'explosive_arrow', true);
eq(A.ammoBack(k._ammoIn, k._blownUp, () => 0), [], 'an explosive killing blow destroys everything');
eq(A.ammoBack(undefined, false, () => 0), [], 'no arrows in it');

// ---- moves (spec §2: "Shoot: Poison Arrow")
const eqp = { head: null, body: null, weapon: 'hunters_shortbow', offHand: null, accessory1: null, accessory2: null, quiver: null };
const ids = W.movesFor(eqp, ITEMS, ['basic_arrow', 'poison_arrow', 'bolt']).map(m => m.id);
eq(ids, ['main:basic', 'main:power', 'ammo:basic_arrow', 'ammo:poison_arrow'], 'a bow lists its arrow kinds, not bolts');
eq(W.movesFor(eqp, ITEMS, ['poison_arrow']).find(m => m.kind === 'ammo').label, 'Shoot: Poison Arrow', 'the label');
eq(W.resolveMoves({ attack: null, second: 'ammo:poison_arrow' }, eqp, ITEMS, ['poison_arrow']).second.ammo, 'poison_arrow', 'a button can hold it');
eq(W.resolveMoves({ attack: null, second: 'ammo:poison_arrow' }, eqp, ITEMS, []).second.id, 'main:power', 'gone from the quiver: back to the default');
eq(W.movesFor(eqp, ITEMS).length, 2, 'no quiver kinds: as before');

console.log(`✓ ammo tests passed (${n})`);
