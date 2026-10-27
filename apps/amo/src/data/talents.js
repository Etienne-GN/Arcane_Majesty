// Combat C2: who is good at what (spec §3). A talent sets how far a mastery can
// climb: gifted -> 10, trained -> 6, anything not listed -> untrained (3).
// Keys: weapon types (systems/weapons.js) and the magic families elemental /
// light (Aurorian, arcane) / dark (Malakar, the Void: shadow).
// Talents are data, not save fields — changing class later is a data change.

const G = 'gifted', T = 'trained';

export const STORY_TALENTS = {
    eldrin:    { wand: G, staff: G, bo: T, elemental: G, light: T, dark: T },
    kael:      { spear: T, dagger: T, sword: G, greatsword: G, mace: T, axe: T, shield: G, crossbow: T, fists: T, light: T },
    anya:      { wand: G, staff: G, bo: T, dagger: T, bow: T, elemental: T, light: G, dark: G },
    seraphina: { wand: T, staff: T, spear: T, dagger: G, sword: G, greatsword: T, axe: T, shield: T, bow: T, crossbow: T, fists: T, dark: G },
};
STORY_TALENTS.eldrin_forge = STORY_TALENTS.eldrin;

export const CLASSES = {
    warrior:     { name: 'Warrior',     blurb: 'Swords and shield — the front line.',            talents: { sword: G, greatsword: G, shield: G, dagger: T, spear: T, mace: T, axe: T, crossbow: T, fists: T } },
    ranger:      { name: 'Ranger',      blurb: 'Bow, crossbow and dagger — strike from afar.',    talents: { bow: G, crossbow: G, dagger: G, sword: T, spear: T, elemental: T } },
    mage:        { name: 'Mage',        blurb: 'Wand, staff and the elements.',                   talents: { wand: G, staff: G, elemental: G, light: T, dark: T, bo: T, dagger: T } },
    brawler:     { name: 'Brawler',     blurb: 'Fists and the bo staff — the monk.',              talents: { fists: G, bo: G, dagger: T, greatsword: T, mace: T, axe: T } },
    spellsword:  { name: 'Spellsword',  blurb: 'Sword, shield and light magic — the holy knight.', talents: { sword: G, shield: G, light: G, mace: T, wand: T, elemental: T } },
    shadowblade: { name: 'Shadowblade', blurb: 'Dagger, sword and dark magic — fast and cruel.',  talents: { dagger: G, sword: G, dark: G, bow: T, wand: T, fists: T } },
    seer:        { name: 'Seer',        blurb: 'Wand and light magic — healer and guide.',        talents: { wand: G, light: G, staff: T, bo: T, dagger: T, elemental: T } },
    druid:       { name: 'Druid',       blurb: 'Bo staff, staff and the elements — the hermit.',  talents: { bo: G, staff: G, elemental: G, spear: T, bow: T, light: T } },
};
export const CLASS_IDS = Object.keys(CLASSES);

export function talentsFor(characterId, classId) {
    if (classId && CLASSES[classId]) return CLASSES[classId].talents;
    return STORY_TALENTS[characterId] ?? {};
}
