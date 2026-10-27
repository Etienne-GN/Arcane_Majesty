// Combat C2 (docs/superpowers/specs/2026-10-26-combat-weapons-design.md §3-4):
// mastery levels 1-10 grown by use and capped by talent, what a level does, the
// wand/staff focus bonus, and which spell tiers an element level unlocks.
// Pure — tools/test_mastery.mjs.
import { typeOf } from './weapons.js';

export const MAX_LEVEL = 10;
export const PASSIVE_CAP_LEVEL = 2;   // the feel for an element (rain, kills by type…) stops here
export const CEILING = { gifted: 10, trained: 6, untrained: 3 };

// Level L -> L+1 costs 40 x L, so reaching L takes 20 x L x (L - 1) points.
export const pointsFor = L => 20 * L * (L - 1);
export function levelOf(points) {
    let L = 1;
    while (L < MAX_LEVEL && points >= pointsFor(L + 1)) L++;
    return L;
}

export const FAMILY = el => (el === 'arcane' ? 'light' : el === 'shadow' ? 'dark' : 'elemental');
export const ceilingOf = (talents, key) => CEILING[talents?.[key] ?? 'untrained'] ?? CEILING.untrained;

// Add a gain under the talent's ceiling; passive gains also stop at PASSIVE_CAP_LEVEL.
export function addPoints(points, gain, ceilingLevel, { passive = false } = {}) {
    const cap = pointsFor(Math.min(ceilingLevel, passive ? PASSIVE_CAP_LEVEL : MAX_LEVEL));
    if (points >= cap) return points;
    return Math.min(cap, points + gain);
}

// A hit teaches 1, a kill 6 (the hit + 5), scaled by the enemy's level vs yours.
export function hitGain(killed, enemyLevel = 1, playerLevel = 1) {
    const scale = Math.min(2, Math.max(0.2, 1 + 0.25 * (enemyLevel - playerLevel)));
    return (killed ? 6 : 1) * scale;
}

export const levelDamageMult = L => Math.round((1 + 0.08 * (L - 1)) * 100) / 100;
export const levelCooldownMult = L => 1 - 0.02 * (L - 1);

// The magic focus in hand: the main hand's wand or staff, else the off hand's.
export function focusOf(equipment, items) {
    for (const id of [equipment.weapon, equipment.offHand]) {
        const t = typeOf(items[id]);
        if (t === 'wand' || t === 'staff') return t;
    }
    return null;
}
export function focusBonus(focus, L = 1) {
    if (focus === 'wand') return { power: 0.85, radius: 1, cooldown: 1 - (0.10 + 0.02 * L) };
    if (focus === 'staff') return { power: 1 + 0.10 + 0.03 * L, radius: 1.05 + 0.02 * L, cooldown: 1.25 };
    return { power: 1, radius: 1, cooldown: 1 };
}

// A spell's Novice / Apprentice / Adept element levels (from its old resonance threshold).
export const unlockLevel = threshold => Math.min(MAX_LEVEL, Math.max(2, Math.ceil(threshold / 6) + 1));
export function unlockLevels(spell) {
    const t = spell?.discoverCondition?.threshold;
    if (t == null) return null;
    const novice = unlockLevel(t);
    return [novice, Math.min(MAX_LEVEL, novice + 2), Math.min(MAX_LEVEL, novice + 4)];
}
export function tierAt(spell, elementLevel) {
    const levels = unlockLevels(spell);
    return levels ? levels.filter(l => elementLevel >= l).length : 0;
}

// Old saves: resonance converts at 5 points each, under the ceiling.
export const pointsFromResonance = (resonance, ceilingLevel) => Math.min((resonance ?? 0) * 5, pointsFor(ceilingLevel));
