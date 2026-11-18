// Combat C4 (spec §4, "Spells follow the same rule"): a scroll teaches one spell
// at Novice; a teacher gives one spell a lesson, one lesson a day. Higher tiers
// still come only from the element level. Pure — tools/test_spell_learning.mjs.
import { SPELLS } from '../data/spells.js';
import { lessonPrice } from './styles.js';

const th = sp => sp.discoverCondition?.threshold;
export const spellScrollId = id => `spell_scroll_${id}`;
export const SCROLL_SPELLS = Object.values(SPELLS).filter(sp => sp.learnFrom?.includes('scroll') && th(sp) != null).map(sp => sp.id);
export const scrollPrice = sp => 40 + 5 * (th(sp) ?? 0);

// The Archivist's Guild sells the easy scrolls; the rest are found.
export const GUILD_SCROLL_MAX = 10;
export const guildScrolls = () => SCROLL_SPELLS.filter(id => th(SPELLS[id]) <= GUILD_SCROLL_MAX).sort((a, b) => th(SPELLS[a]) - th(SPELLS[b]));

// An elite's chance at a scroll for a spell the player neither knows nor carries.
export const ELITE_SCROLL_CHANCE = 0.08;
export function rollSpellScroll(rng, spells, carriedIds = []) {
    if (rng() >= ELITE_SCROLL_CHANCE) return null;
    const carried = new Set(carriedIds);
    const left = SCROLL_SPELLS.filter(id => !(spells?.[id] > 0) && !carried.has(spellScrollId(id)));
    return left.length ? spellScrollId(left[Math.floor(rng() * left.length)]) : null;
}

// What a teacher of an element can give, easiest first (no threshold counts as 0).
export const teachableSpells = element => Object.values(SPELLS)
    .filter(sp => sp.element === element && sp.learnFrom?.includes('npc'))
    .sort((a, b) => (th(a) ?? 0) - (th(b) ?? 0)).map(sp => sp.id);
export const spellToTeach = (spells, element) => teachableSpells(element).find(id => !(spells?.[id] > 0)) ?? null;

// One lesson a day per element; each costs more than the last (100, 200, 300 …).
export function spellLessonCheck(lessons, lessonDay, element, day, gold, spells) {
    const spell = spellToTeach(spells, element);
    if (!spell) return { ok: false, reason: 'none' };
    if (lessonDay[element] === day) return { ok: false, reason: 'today' };
    const price = lessonPrice(lessons[element] ?? 0);
    return gold < price ? { ok: false, reason: 'gold', price, spell } : { ok: true, price, spell };
}
