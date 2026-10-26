// Combat C1 (docs/superpowers/specs/2026-10-26-combat-weapons-design.md §1-2):
// the weapon types, which hands they take, and the moves the two action buttons
// can hold. Pure — tools/test_weapons.mjs.
//
// equipment.weapon is the MAIN hand (kept for old saves and the server);
// equipment.offHand is the off hand. An empty hand is a fist.
// A move id names a hand and a kind, never an item: 'main:basic', 'main:power',
// 'off:basic', 'off:block' — so a slot survives a weapon swap.

// cooldown ms between swings · reach px from the body to the hit zone · hitbox px
// · dmgMult on the melee formula · range px for ranged types · anim = the LPC
// logical attack animation · arc = which existing attack visual it borrows.
export const WEAPON_TYPES = {
    wand:       { label: 'Wand',             hands: 1,     basic: 'Bolt',       feel: 'quick, light magic — best against one enemy up close', cooldown: 300,  reach: 30, hitbox: 32, dmgMult: 0.75, range: 140, anim: 'spellcast', arc: 'staff',         available: true },
    staff:      { label: 'Staff',            hands: 1,     basic: 'Blast',      feel: 'slow, strong magic — best against a crowd',           cooldown: 400,  reach: 30, hitbox: 40, dmgMult: 1.0,             anim: 'spellcast', arc: 'staff',         available: true },
    bo:         { label: 'Bo staff',         hands: 2,     basic: 'Strike',     feel: 'fast pole blows with good reach',                     cooldown: 360,  reach: 40, hitbox: 44, dmgMult: 0.95,            anim: 'thrust',    arc: 'umbral_dagger', available: true },
    spear:      { label: 'Spear',            hands: 2,     basic: 'Thrust',     feel: 'the longest reach — keep enemies away',               cooldown: 520,  reach: 48, hitbox: 36, dmgMult: 1.15,            anim: 'thrust',    arc: 'spell_blade',   available: true },
    dagger:     { label: 'Dagger',           hands: 1,     basic: 'Stab',       feel: 'very fast, very close',                               cooldown: 260,  reach: 26, hitbox: 32, dmgMult: 0.8,             anim: 'slash',     arc: 'umbral_dagger', available: true },
    sword:      { label: 'One-handed sword', hands: 1,     basic: 'Slash',      feel: 'balanced — good at everything',                       cooldown: 480,  reach: 30, hitbox: 40, dmgMult: 1.0,             anim: 'slash',     arc: 'spell_blade',   available: true },
    greatsword: { label: 'Two-handed sword', hands: 2,     basic: 'Sweep',      feel: 'slow, wide and heavy — for crowds and big hits',      cooldown: 750,  reach: 34, hitbox: 60, dmgMult: 1.6,             anim: 'slash',     arc: 'spell_blade',   available: true },
    mace:       { label: 'Mace',             hands: 1,     basic: 'Smash',      feel: 'slow blows that crack armour',                        cooldown: 600,  reach: 30, hitbox: 40, dmgMult: 1.25,            anim: 'slash',     arc: 'spell_blade',   available: true },
    axe:        { label: 'Axe',              hands: 1,     basic: 'Chop',       feel: 'strong chops that can hit two',                       cooldown: 560,  reach: 30, hitbox: 48, dmgMult: 1.2,             anim: 'slash',     arc: 'spell_blade',   available: true },
    shield:     { label: 'Shield',           hands: 'off', basic: 'Block',      feel: 'raise it to stop most of a hit from the front',            cooldown: 700,  reach: 0,  hitbox: 0,  dmgMult: 0.5,             anim: 'idle',      arc: 'spell_blade',   available: true },
    bow:        { label: 'Bow',              hands: 2,     basic: 'Shoot',      feel: 'long range — hit them before they reach you',          cooldown: 650,  reach: 30, hitbox: 40, dmgMult: 1.0,  range: 150, anim: 'shoot',     arc: 'bow',           available: true },
    crossbow:   { label: 'Crossbow',         hands: 2,     basic: 'Shoot bolt', feel: 'slow to reload, hits very hard at range',             cooldown: 1100, reach: 30, hitbox: 40, dmgMult: 1.8,  range: 220, anim: 'thrust',    arc: 'bow',           available: true },
    fists:      { label: 'Fists',            hands: 1,     basic: 'Punch',      feel: 'weak but always there',                               cooldown: 300,  reach: 24, hitbox: 30, dmgMult: 0.6,             anim: 'thrust',    arc: 'umbral_dagger', available: true },
};

// The four weapon types items carried before C1
export const LEGACY_TYPE = { staff: 'staff', spell_blade: 'sword', umbral_dagger: 'dagger', resonance_bow: 'bow' };

export function typeOf(def) {
    if (!def || def.slot !== 'weapon') return 'fists';
    const t = LEGACY_TYPE[def.weaponType] ?? def.weaponType;
    return WEAPON_TYPES[t] && t !== 'fists' ? t : 'fists';
}

// The weapon type quests credit a kill to: the item's own weaponType (old items keep
// their old names, e.g. 'umbral_dagger'), 'fists' for empty hands.
export const creditType = def => (def?.slot === 'weapon' && def.weaponType) || 'fists';

// What the screen calls the weapon in hand
const LEGACY_LABEL = { staff: 'Staff', spell_blade: 'Spell-Blade', umbral_dagger: 'Umbral Dagger', resonance_bow: 'Resonance Bow' };
export const weaponLabel = def => LEGACY_LABEL[def?.weaponType] ?? WEAPON_TYPES[typeOf(def)].label;

const twoHanded = def => WEAPON_TYPES[typeOf(def)].hands === 2;

// Where an item goes and what must come off first. null: not a weapon.
// items: id → def, to tell whether the main-hand item is two-handed.
export function equipPlan(equipment, def, hand = 'main', items = {}) {
    if (!def || def.slot !== 'weapon') return null;
    const t = typeOf(def), hands = WEAPON_TYPES[t].hands;
    const mainIsTwoHanded = !!equipment.weapon && twoHanded(items[equipment.weapon]);
    if (hands === 'off') return { slot: 'offHand', clear: mainIsTwoHanded ? ['weapon'] : [] };
    if (hands === 2) return { slot: 'weapon', clear: equipment.offHand ? ['offHand'] : [] };
    if (hand === 'off') return { slot: 'offHand', clear: mainIsTwoHanded ? ['weapon'] : [] };
    return { slot: 'weapon', clear: [] };
}

export const MOVE_IDS = ['main:basic', 'main:power', 'off:basic', 'off:block'];

export function movesFor(equipment, items) {
    const mainDef = equipment.weapon ? items[equipment.weapon] : null;
    const offDef = equipment.offHand ? items[equipment.offHand] : null;
    const main = typeOf(mainDef), out = [];
    out.push({ id: 'main:basic', hand: 'main', kind: 'basic', type: main, label: WEAPON_TYPES[main].basic });
    out.push({ id: 'main:power', hand: 'main', kind: 'power', type: main, label: `Power ${WEAPON_TYPES[main].basic}` });
    if (WEAPON_TYPES[main].hands === 2) return out;
    const off = typeOf(offDef);
    if (off === 'shield') out.push({ id: 'off:block', hand: 'off', kind: 'block', type: 'shield', label: 'Block' });
    else out.push({ id: 'off:basic', hand: 'off', kind: 'basic', type: off, label: WEAPON_TYPES[off].basic });
    return out;
}

export function defaultMoves(equipment, items) {
    const ids = movesFor(equipment, items).map(m => m.id);
    const offWeapon = equipment.offHand && ids.includes('off:basic');
    return { attack: 'main:basic', second: ids.includes('off:block') ? 'off:block' : offWeapon ? 'off:basic' : 'main:power' };
}

// Where a hit comes from. Facing is 'up' | 'down' | 'left' | 'right'.
const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function isFrontal(facing, at, from) {
    const [fx, fy] = DIR[facing] ?? [0, 1], dx = from.x - at.x, dy = from.y - at.y;
    return fx * dx + fy * dy >= 0;                       // the front half, 90° either side
}
// Backstab (C3): the attacker stands in the target's rear cone (cos 0.5 = 120° wide)
export function isBehind(targetFacing, targetPos, attackerPos, cos = 0.5) {
    const [fx, fy] = DIR[targetFacing] ?? [0, 1], dx = attackerPos.x - targetPos.x, dy = attackerPos.y - targetPos.y;
    const len = Math.hypot(dx, dy);
    return len > 0 && (fx * dx + fy * dy) / len <= -cos;
}

export function resolveMoves(slots, equipment, items) {
    const list = movesFor(equipment, items), by = Object.fromEntries(list.map(m => [m.id, m]));
    const d = defaultMoves(equipment, items);
    return { attack: by[slots?.attack] ?? by[d.attack], second: by[slots?.second] ?? by[d.second] };
}
