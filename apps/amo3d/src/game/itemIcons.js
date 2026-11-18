// Item icons, drawn here as SVG from amo's item data (no art files): a glyph for what the thing is (its weapon
// type, or amo's icon name: potion, scroll, herb, ring…) in the item's own colour, on a tile framed by rarity.
import { weapons as weaponRules } from '@rules';

const { typeOf, WEAPON_TYPES } = weaponRules;
export const RARITY = { common: '#a49a86', uncommon: '#6ab84a', rare: '#4a9ae8', epic: '#b06ae8', legendary: '#f0a830' };
const hex = c => `#${(c ?? 0x8a7a6a).toString(16).padStart(6, '0')}`;
const S = (k, w = 1.6) => `fill="none" stroke="${k}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

// Glyphs on a 24-unit grid: k = ink, c = the item's colour.
const G = {
    sword:      (k, c) => `<path d="M5 19 L16 8 L19 5 L18 8 L7 19Z" fill="${c}" stroke="${k}" stroke-width="1"/><path d="M4 15 L9 20 M6 18 L3 21" ${S(k, 1.8)}/>`,
    greatsword: (k, c) => `<path d="M4 20 L17 7 L21 3 L20 7 L7 20Z" fill="${c}" stroke="${k}" stroke-width="1"/><path d="M3 15 L9 21 M5 19 L2 22" ${S(k, 2)}/>`,
    dagger:     (k, c) => `<path d="M8 16 L16 8 L18 6 L17 9 L10 17Z" fill="${c}" stroke="${k}" stroke-width="1"/><path d="M7 13 L11 17 M8 16 L5 19" ${S(k, 1.8)}/>`,
    staff:      (k, c) => `<path d="M6 21 L16 7" ${S(k, 2)}/><circle cx="17.5" cy="5.5" r="3" fill="${c}" stroke="${k}" stroke-width="1"/>`,
    wand:       (k, c) => `<path d="M6 19 L15 10" ${S(k, 2)}/><path d="M17 4 L17.8 6.8 L20.5 7.5 L17.8 8.3 L17 11 L16.2 8.3 L13.5 7.5 L16.2 6.8Z" fill="${c}"/>`,
    bow:        (k, c) => `<path d="M7 3 Q20 12 7 21" ${S(c, 2)}/><path d="M7 3 V21 M7 12 H18 M15 9.5 L18 12 L15 14.5" ${S(k, 1.2)}/>`,
    crossbow:   (k, c) => `<path d="M4 9 Q12 4 20 9" ${S(c, 2)}/><path d="M12 6 V21 M4 9 L12 13 L20 9 M10 18 H14" ${S(k, 1.4)}/>`,
    axe:        (k, c) => `<path d="M6 21 L15 6" ${S(k, 2)}/><path d="M13 4 Q20 4 20 11 L15 9Z" fill="${c}" stroke="${k}" stroke-width="1"/>`,
    mace:       (k, c) => `<path d="M6 21 L14 9" ${S(k, 2)}/><circle cx="16" cy="7" r="4" fill="${c}" stroke="${k}" stroke-width="1"/><path d="M16 1.5 V3 M21.5 7 H20 M20 3 L19 4" ${S(k, 1.2)}/>`,
    spear:      (k, c) => `<path d="M4 20 L17 7" ${S(k, 1.8)}/><path d="M16 4 L21 3 L20 8 L17 7Z" fill="${c}" stroke="${k}" stroke-width="1"/>`,
    bo:         (k, c) => `<path d="M4 20 L20 4" ${S(c, 2.4)}/><path d="M7 17 L9 15 M15 9 L17 7" ${S(k, 2.6)}/>`,
    shield:     (k, c) => `<path d="M12 3 L19 6 V12 Q19 18 12 21 Q5 18 5 12 V6Z" fill="${c}" stroke="${k}" stroke-width="1.4"/><path d="M12 6 V18 M7.5 11 H16.5" ${S(k, 1.1)}/>`,
    fists:      (k, c) => `<path d="M7 13 V9 Q7 7.5 8.5 7.5 Q10 7.5 10 9 V8 Q10 6.5 11.5 6.5 Q13 6.5 13 8 Q13 7 14.5 7 Q16 7 16 8.5 V10 Q16 9 17 9 Q18 9 18 10.5 V14 Q18 18 13.5 18 H11 Q7 18 7 13Z" fill="${c}" stroke="${k}" stroke-width="1"/>`,
    itm_hp_potion:   (k, c) => `<path d="M10 3 H14 V7 Q19 9 19 14 A7 7 0 0 1 5 14 Q5 9 10 7Z" fill="${c}" stroke="${k}" stroke-width="1.2"/><path d="M9 3 H15" ${S(k, 1.6)}/><path d="M8 13 Q9 11 11 11" ${S('#fff8', 1.2)}/>`,
    itm_scroll:      (k, c) => `<path d="M6 5 H17 Q19 5 19 7 V19 H8 Q6 19 6 17Z" fill="#efe3c4" stroke="${k}" stroke-width="1.2"/><path d="M6 5 Q4 5 4 7 Q4 9 6 9 M9 9 H16 M9 12 H16 M9 15 H13" ${S(k, 1)}/><circle cx="16" cy="16" r="2" fill="${c}"/>`,
    itm_herb:        (k, c) => `<path d="M12 21 V10 M12 14 Q7 13 6 8 Q11 8 12 13 M12 11 Q16 9 18 4 Q13 5 12 10" fill="${c}" stroke="${k}" stroke-width="1.1"/>`,
    itm_glowing_dust:(k, c) => `<path d="M9 4 L10 8 L14 9 L10 10 L9 14 L8 10 L4 9 L8 8Z M17 12 L17.7 14.3 L20 15 L17.7 15.7 L17 18 L16.3 15.7 L14 15 L16.3 14.3Z" fill="${c}"/><circle cx="7" cy="18" r="1.3" fill="${c}"/>`,
    itm_book:        (k, c) => `<path d="M5 4 H16 Q18 4 18 6 V20 H7 Q5 20 5 18Z" fill="${c}" stroke="${k}" stroke-width="1.2"/><path d="M7 18 H18 M8 8 H15" ${S(k, 1)}/>`,
    itm_wooden_box:  (k, c) => `<path d="M4 9 L12 5 L20 9 V17 L12 21 L4 17Z M4 9 L12 13 L20 9 M12 13 V21" fill="#9a6a3a" stroke="${k}" stroke-width="1.1"/>`,
    itm_meat:        (k, c) => `<path d="M9 6 Q16 2 19 8 Q21 14 14 16 Q10 17 8 14 Q6 10 9 6Z" fill="${c}" stroke="${k}" stroke-width="1.1"/><path d="M8 14 L4 20 M3 19 L5 21" ${S(k, 1.8)}/>`,
    itm_feather:     (k, c) => `<path d="M5 20 Q8 8 19 4 Q17 14 7 18Z" fill="${c}" stroke="${k}" stroke-width="1.1"/><path d="M5 20 L15 9" ${S(k, 1)}/>`,
    itm_fur:         (k, c) => `<path d="M4 8 Q8 5 12 7 Q16 5 20 8 L19 16 Q16 19 12 17 Q8 19 5 16Z" fill="${c}" stroke="${k}" stroke-width="1.1"/><path d="M8 10 L9 13 M12 9 L12 13 M16 10 L15 13" ${S(k, 0.9)}/>`,
    itm_sandwich:    (k, c) => `<path d="M4 11 Q12 5 20 11Z" fill="#d8a85a" stroke="${k}" stroke-width="1"/><path d="M4 12 H20" ${S(c, 2.4)}/><path d="M4 14 H20 L19 17 H5Z" fill="#d8a85a" stroke="${k}" stroke-width="1"/>`,
    itm_mushroom:    (k, c) => `<path d="M4 12 Q4 5 12 5 Q20 5 20 12Z" fill="${c}" stroke="${k}" stroke-width="1.1"/><path d="M10 12 V19 Q12 21 14 19 V12" fill="#efe3c4" stroke="${k}" stroke-width="1"/><circle cx="9" cy="9" r="1" fill="#fff"/><circle cx="14" cy="8" r="1.2" fill="#fff"/>`,
    itm_stone:       (k, c) => `<path d="M5 15 L8 8 L15 6 L20 11 L18 18 L9 19Z" fill="${c}" stroke="${k}" stroke-width="1.1"/><path d="M8 8 L11 13 L18 18 M11 13 L15 6" ${S(k, 0.8)}/>`,
    itm_scythe:      (k, c) => `<path d="M8 21 L14 5" ${S(k, 1.8)}/><path d="M14 5 Q6 3 3 9 Q8 6 13 8Z" fill="${c}" stroke="${k}" stroke-width="1"/>`,
    itm_pickaxe:     (k, c) => `<path d="M7 21 L15 7" ${S(k, 1.8)}/><path d="M5 7 Q13 1 21 7 Q13 4 5 7Z" fill="${c}" stroke="${k}" stroke-width="1.1"/>`,
    itm_log:         (k, c) => `<path d="M5 9 H18 V16 H5Z" fill="#8a5a2a" stroke="${k}" stroke-width="1.1"/><ellipse cx="18" cy="12.5" rx="2.4" ry="3.5" fill="#d8b07a" stroke="${k}" stroke-width="1"/><path d="M8 11 H14 M7 14 H12" ${S(k, 0.8)}/>`,
    itm_iron_ore:    (k, c) => `<path d="M5 15 L8 8 L15 6 L20 11 L18 18 L9 19Z" fill="#6a6a70" stroke="${k}" stroke-width="1.1"/><circle cx="11" cy="12" r="1.6" fill="${c}"/><circle cx="15" cy="15" r="1.2" fill="${c}"/><circle cx="14" cy="9" r="1" fill="${c}"/>`,
    itm_pouch:       (k, c) => `<path d="M8 7 Q12 9 16 7 L18 17 Q12 22 6 17Z" fill="${c}" stroke="${k}" stroke-width="1.1"/><path d="M8 7 L10 4 M16 7 L14 4 M9 8 Q12 10 15 8" ${S(k, 1)}/>`,
    itm_leather_armor:(k, c) => `<path d="M8 4 L12 6 L16 4 L20 8 L17 10 V20 H7 V10 L4 8Z" fill="${c}" stroke="${k}" stroke-width="1.2"/><path d="M12 6 V20 M8 13 H16" ${S(k, 0.9)}/>`,
    itm_mantua:      (k, c) => `<path d="M9 3 L12 5 L15 3 L18 7 L16 9 L19 21 H5 L8 9 L6 7Z" fill="${c}" stroke="${k}" stroke-width="1.2"/><path d="M12 5 V21" ${S(k, 0.9)}/>`,
    itm_headgear_01: (k, c) => `<path d="M5 15 Q5 5 12 5 Q19 5 19 15 Z" fill="${c}" stroke="${k}" stroke-width="1.2"/><path d="M3 15 H21 M12 5 V15" ${S(k, 1.3)}/>`,
    itm_ring_01:     (k, c) => `<circle cx="12" cy="14" r="6" ${S('#d8b04a', 2.2)}/><path d="M12 5 L15 8 L12 10 L9 8Z" fill="${c}" stroke="${k}" stroke-width="0.8"/>`,
    itm_necklace_01: (k, c) => `<path d="M5 4 Q12 16 19 4" ${S('#d8b04a', 1.4)}/><path d="M12 13 L15 17 L12 21 L9 17Z" fill="${c}" stroke="${k}" stroke-width="0.9"/>`,
    itm_fish:        (k, c) => `<path d="M3 12 Q9 5 16 12 Q9 19 3 12Z M16 12 L21 8 V16Z" fill="${c}" stroke="${k}" stroke-width="1.1"/><circle cx="7" cy="11" r="0.9" fill="${k}"/>`,
    ammo:            (k, c) => `<path d="M5 19 L17 7 M8 20 L19 9 M17 7 L14 7.5 M17 7 L16.5 10 M19 9 L16 9.5 M19 9 L18.5 12" ${S(k, 1.3)}/><path d="M4 17 L7 20 M3 19 L5 21" ${S(c, 1.6)}/>`,
    unknown:         (k, c) => `<circle cx="12" cy="12" r="7" fill="${c}" stroke="${k}" stroke-width="1.2"/><path d="M10 10 Q10 8 12 8 Q14 8 14 10 Q14 11.5 12 12 V13.5 M12 16 V16.2" ${S(k, 1.5)}/>`,
};
Object.assign(G, { itm_mana_potion: G.itm_hp_potion, itm_iron_armor: G.itm_leather_armor, itm_ring_02: G.itm_ring_01, itm_necklace_02: G.itm_necklace_01,
    itm_sword_01: G.sword, itm_sword_02: G.sword, itm_stone_sword: G.sword, itm_wand_01: G.wand, itm_wand_02: G.wand, itm_bow_01: G.bow, itm_bow_02: G.bow });

export function glyphKey(def) {
    if (!def) return 'unknown';
    if (def.slot === 'weapon') return typeOf(def);
    if (def.slot === 'offHand') return 'shield';
    if (def.ammo || def.slot === 'quiver') return 'ammo';
    return G[def.icon] ? def.icon : 'unknown';
}
// Just the glyph (for slot placeholders and the hero sheet), on a 24 grid.
export const glyphSVG = (key, ink = '#2a2014', colour = '#8a7a6a') => `<svg viewBox="0 0 24 24" class="iglyph">${(G[key] ?? G.unknown)(ink, colour)}</svg>`;
// A tile: rarity frame, the glyph in the item's colour.
export function itemIconSVG(def, { faded = false } = {}) {
    const r = RARITY[def?.rarity] ?? RARITY.common;
    return `<svg viewBox="0 0 24 24" class="iicon"><rect x="0.6" y="0.6" width="22.8" height="22.8" rx="4" fill="${faded ? '#0002' : '#1a120c'}" stroke="${r}" stroke-width="1.1"/>`
        + `<rect x="1.6" y="1.6" width="20.8" height="20.8" rx="3" fill="url(#none)" stroke="${r}" stroke-opacity=".25" stroke-width=".6"/>`
        + `<g transform="translate(2.4 2.4) scale(.8)">${(G[glyphKey(def)] ?? G.unknown)('#f4e8d0', hex(def?.color))}</g></svg>`;
}
// What kind of thing it is, in a few words.
export function kindOf(def) {
    if (!def) return '';
    const rar = def.rarity && def.rarity !== 'common' ? `${def.rarity[0].toUpperCase()}${def.rarity.slice(1)} · ` : '';
    if (def.slot === 'weapon') { const t = typeOf(def), W = WEAPON_TYPES[t]; return `${rar}${W?.label ?? t} · ${W?.hands === 2 ? 'both hands' : 'either hand'}`; }
    const SL = { head: 'Worn on the head', body: 'Worn on the body', accessory: 'Accessory — ring or amulet', offHand: 'Left hand', quiver: 'Quiver' };
    if (def.slot) return `${rar}${SL[def.slot] ?? def.slot}`;
    if (def.spellOf) return `${rar}Spell scroll — read it to learn`;
    if (def.manualOf) return `${rar}Fighting manual — read it to learn`;
    if (def.chartOf) return `${rar}A chart`;
    if (def.ammo) return `${rar}Ammunition`;
    if (def.onUse) return `${rar}Use it`;
    return `${rar}Material`;
}
// The satchel's filters.
export function groupOf(def) {
    if (!def) return 'other';
    if (def.slot === 'weapon' || def.slot === 'offHand' || def.ammo || def.slot === 'quiver') return 'weapons';
    if (def.slot) return 'wear';
    if (def.spellOf || def.manualOf || def.chartOf || def.icon === 'itm_book' || def.icon === 'itm_scroll') return 'learning';
    if (def.onUse) return 'use';
    return 'materials';
}
