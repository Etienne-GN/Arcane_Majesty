// The look schema for the 3D Forge and the game. A character is a base body plus one item per
// slot. Old looks (outfit.style, hood, cape, headgear, build) are normalized into the same shape,
// so cast files, townsfolk and equipment keep working.
import * as THREE from 'three';

export const BODY_PRESETS = {
    adult_male:   { label: 'Adult male',   height: 1.00, width: 1.00, head: 1.00, shoulders: 1.00, hips: 1.00, limb: 1.00, stoop: 0 },
    adult_female: { label: 'Adult female', height: 0.97, width: 0.92, head: 0.98, shoulders: 0.90, hips: 1.06, limb: 0.97, stoop: 0 },
    child:        { label: 'Child',        height: 0.68, width: 0.84, head: 1.22, shoulders: 0.82, hips: 0.90, limb: 0.82, stoop: 0 },
    elder:        { label: 'Elder',        height: 0.96, width: 0.95, head: 1.00, shoulders: 0.95, hips: 1.00, limb: 0.95, stoop: 0.12 },
    // the six bodies (docs/3d/characters/LAYERS_PLAN.md, step 3): a boy and a girl, an old man and an old woman, each with
    // its own proportions (the v2 bodies also take their age layer from these: /child/ → boy|girl, /elder/ → old_man|old_woman)
    child_male:   { label: 'Boy',          height: 0.68, width: 0.84, head: 1.22, shoulders: 0.82, hips: 0.88, limb: 0.82, stoop: 0 },
    child_female: { label: 'Girl',         height: 0.67, width: 0.82, head: 1.21, shoulders: 0.78, hips: 0.92, limb: 0.82, stoop: 0 },
    elder_male:   { label: 'Old man',      height: 0.96, width: 0.95, head: 1.00, shoulders: 0.95, hips: 1.00, limb: 0.95, stoop: 0.12 },
    elder_female: { label: 'Old woman',    height: 0.93, width: 0.90, head: 0.98, shoulders: 0.86, hips: 1.05, limb: 0.94, stoop: 0.14 },
};

// Races (lore DB: Human, Aurorian, Nythorian, Fallen Aurorian; the Werewolf is its own creature, no dwarves in the
// lore). A race shapes the ears and the skin's glow, and gives starting colours the player can still change.
export const RACES = {
    human:           { label: 'Human',           ears: 'round',  skin: '#e2b48f', eyes: '#5ab8f0', hair: '#3a2418', glow: null },
    aurorian:        { label: 'Aurorian',        ears: 'elven',  skin: '#f4e6d8', eyes: '#f0d070', hair: '#f2e6c0', glow: { color: '#ffe8b0', k: 0.22 }, lore: 'Elven beings of pure light.' },
    nythorian:       { label: 'Nythorian',       ears: 'elven',  skin: '#8a7c94', eyes: '#d8dce8', hair: '#1a1622', glow: { color: '#7a5aaa', k: 0.12 }, lore: 'Elven kin of the Underworld.' },
    werewolf:        { label: 'Werewolf',        ears: 'round',  skin: '#d8b08a', eyes: '#e8a830', hair: '#4a3a2e', glow: null, lore: 'Guardians of the Wild — they can take the wolf form (Shift).', fur: '#6a5e54' },
    fallen_aurorian: { label: 'Fallen Aurorian', ears: 'elven',  skin: '#a89c94', eyes: '#ff6a30', hair: '#2a2420', glow: { color: '#a8301a', k: 0.1 }, veins: '#ff5a20', lore: 'Aurorians corrupted by the Void.' },
};

// Both hands pick from this same list. There is no dominance: a left-handed character simply
// holds its weapon in `left`.
const clone = o => JSON.parse(JSON.stringify(o ?? {}));

export const HANDHELD = [
    { id: 'none', label: 'None' },
    { id: 'staff', label: 'Staff' },
    { id: 'wand', label: 'Wand' },
    { id: 'sword', label: 'Sword' },
    { id: 'greatsword', label: 'Greatsword' },
    { id: 'claymore', label: 'Claymore' },
    { id: 'dagger', label: 'Dagger' },
    { id: 'axe', label: 'Axe' },
    { id: 'mace', label: 'Mace' },
    { id: 'spear', label: 'Spear' },
    { id: 'halberd', label: 'Halberd' },
    { id: 'bo', label: 'Bo staff' },
    { id: 'bow', label: 'Bow' },
    { id: 'crossbow', label: 'Crossbow' },
    { id: 'shield', label: 'Shield' },
];

export const HAND_ITEM = Object.fromEntries(HANDHELD.map(h => [h.id, h]));

export const PART_SLOTS = [
    'torso', 'legs', 'feet', 'arms', 'shoulders', 'waist', 'neck',
    'headgear', 'cape', 'back', 'accessory', 'left', 'right',
];

const STYLE_SLOTS = {
    longcoat: { torso: 'longcoat', legs: 'trousers', feet: 'boots', arms: 'bracers', shoulders: 'pauldron', waist: 'belt', back: 'satchel' },
    robe:     { torso: 'robe',     legs: 'trousers', feet: 'boots', arms: 'sleeves', shoulders: 'none',    waist: 'sash', back: 'satchel' },
    tunic:    { torso: 'tunic',    legs: 'trousers', feet: 'boots', arms: 'sleeves', shoulders: 'none',    waist: 'belt', back: 'satchel' },
    armour:   { torso: 'armour',   legs: 'trousers', feet: 'boots', arms: 'sleeves', shoulders: 'steel_pauldrons', waist: 'belt', back: 'satchel' },
    linen:    { torso: 'linen',    legs: 'linen_trousers', feet: 'bare', arms: 'sleeves', shoulders: 'none', waist: 'none', back: 'none' },
}
const defined = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null));

function mergeParts(base, extra) {
    const out = clone(base);
    for (const [slot, entry] of Object.entries(extra ?? {})) {
        if (!entry || typeof entry !== 'object') continue;
        out[slot] = { ...(out[slot] ?? {}), ...entry, colors: { ...(out[slot]?.colors ?? {}), ...(entry.colors ?? {}) } };
    }
    return out;
}

function applyOutfit(parts, o, look) {
    if (!o) return;
    const style = STYLE_SLOTS[o.style] ? o.style : 'longcoat';
    const slots = STYLE_SLOTS[style];
    for (const [slot, id] of Object.entries(slots)) parts[slot] = { ...(parts[slot] ?? {}), id };
    const colors = {
        torso: { primary: o.coat, collar: o.collar, trim: o.trim, vest: o.vest, shirt: o.shirt, leather: o.leather, steel: '#9aa0a8' },
        legs: { primary: o.pants, dark: o.pantsDark ?? o.pants },
        feet: { primary: o.leather, dark: o.leatherDark },
        arms: { primary: o.leather, trim: o.trim, sleeve: o.coat },
        shoulders: { primary: o.leatherDark, trim: o.trim, steel: '#9aa0a8' },
        waist: { primary: style === 'robe' ? o.collar : o.leather, trim: o.trim },
        back: { primary: o.leather, dark: o.leatherDark, trim: o.trim },
    };
    for (const [slot, c] of Object.entries(colors)) {
        if (parts[slot]) parts[slot].colors = { ...(parts[slot].colors ?? {}), ...defined(c) };
    }
    if (look?.hood) parts.headgear = { id: 'hood', colors: { primary: look.hoodColor ?? o.collar ?? '#241c4a' } };
    else if (look?.headgear) {
        const h = look.headgear;
        const id = h.type === 'helmet' ? 'helmet' : h.type === 'hat' && h.style === 'wizard' ? 'wizard_hat' : h.type === 'hat' ? 'wide_hat' : 'none';
        parts.headgear = { id, colors: h.color ? { primary: h.color, trim: '#d4a84a' } : {} };
    }
    if (look?.cape) parts.cape = { id: 'travelling_cloak', colors: { primary: o.collar ?? '#2a1a2a', trim: o.trim ?? '#d4a84a' } };
}

/** Canonical look: body + face + hair + one part per slot. Accepts legacy and new looks. */
export function normalizeLook(lookIn = {}) {
    const look = lookIn ?? {};
    const parts = mergeParts(
        { torso: { id: 'longcoat', colors: { primary: '#a3141f', collar: '#7a0f17', trim: '#d4a84a', vest: '#1c1714', shirt: '#16120f', leather: '#5a3520', steel: '#9aa0a8' } },
          legs: { id: 'trousers', colors: { primary: '#221c18', dark: '#221c18' } },
          feet: { id: 'boots', colors: { primary: '#5a3520', dark: '#3e2416' } },
          arms: { id: 'bracers', colors: { primary: '#5a3520', trim: '#d4a84a', sleeve: '#a3141f' } },
          shoulders: { id: 'pauldron', colors: { primary: '#3e2416', trim: '#d4a84a', steel: '#9aa0a8' } },
          waist: { id: 'belt', colors: { primary: '#5a3520', trim: '#d4a84a', dark: '#3e2416' } },
          neck: { id: 'none' },
          headgear: { id: 'none' },
          cape: { id: 'none' },
          back: { id: 'satchel', colors: { primary: '#5a3520', dark: '#3e2416', trim: '#d4a84a' } },
          accessory: { id: 'none' },
          left: { id: 'none' },
          right: { id: 'staff', accent: '#7ff5e6' },
        },
        look.parts
    );
    applyOutfit(parts, look.outfit, look);
    for (const [slot, w] of Object.entries(look.wear ?? {})) parts[slot] = { ...w, colors: { ...(w.colors ?? {}) } };   // worn items: one part each
    if (look.hands) {
        for (const h of ['left', 'right']) {
            if (look.hands[h]) parts[h] = { ...(parts[h] ?? {}), ...look.hands[h] };
        }
    }
    const body = {
        preset: 'adult_male', race: 'human', height: 1, width: 1, skin: '#e2b48f',
        ...(look.body ?? {}),
    };
    if (look.build) {
        if (look.build.height != null) body.height = look.build.height;
        if (look.build.width != null) body.width = look.build.width;
    }
    if (look.skin) body.skin = look.skin;
    if (!BODY_PRESETS[body.preset]) body.preset = 'adult_male';
    if (!RACES[body.race]) body.race = 'human';

    const face = { eyes: '#5ab8f0', ...(look.face ?? {}) };
    if (look.eyes) face.eyes = look.eyes;
    const hair = { style: 'tousled', color: '#3a2418', ...(look.hair ?? {}) };
    const facialHair = { style: 'stubble', color: '#a07a62', ...(look.facialHair ?? {}) };
    // the Sculptor's part of a look (docs/3d/characters/LAYERS_PLAN.md): { points } — this character's own shape override,
    // layer offsets on top of its body's layers; { swap: { layer: points } } — a layer replaced (an alternate being viewed)
    const sculpt = look.sculpt && typeof look.sculpt === 'object' && !Array.isArray(look.sculpt) ? look.sculpt : null;
    // (and its v2 model's key, kept: the Forge saving a cast file must not drop it — 2026-11-26)
    const v2 = typeof look.v2 === 'string' && /^[a-z0-9_]{1,40}$/.test(look.v2) ? look.v2 : null;
    return { body, face, hair, facialHair, parts, ...(v2 ? { v2 } : {}), ...(sculpt ? { sculpt } : {}) };
}

/** Weapons have no dominance: the id is the weapon type, or null for an empty hand. */
export function handType(id) {
    return !id || id === 'none' ? null : id;
}

export function handSpec(entry, fallbackAccent = '#7ff5e6') {
    const type = handType(entry?.id);
    if (!type) return null;
    return { type, accent: new THREE.Color(entry?.accent ?? fallbackAccent).getHex() };
}

export const DEFAULT_OUTFIT = {
    style: 'longcoat', coat: '#a3141f', collar: '#7a0f17', trim: '#d4a84a', vest: '#1c1714', shirt: '#16120f',
    pants: '#221c18', leather: '#5a3520', leatherDark: '#3e2416',
};

export const DEFAULT_LOOK = normalizeLook({
    body: { preset: 'adult_male', height: 1, width: 1, skin: '#e2b48f' },
    face: { eyes: '#5ab8f0' },
    hair: { style: 'tousled', color: '#3a2418' },
    facialHair: { style: 'stubble', color: '#a07a62' },
    outfit: DEFAULT_OUTFIT,
});
