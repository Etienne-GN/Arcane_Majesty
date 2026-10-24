/**
 * Townsfolk looks (W4, the game's world-scale spec): seeded random compositions
 * for a town's baked look set — human adults, children, and guards in plate.
 * They are dressed from a plain townsfolk wardrobe (no cyclops eyes, pirate hats,
 * half wigs or armour pieces; beards on men only) in believable colours.
 * The bake page (v2/bake.html) renders them. Pure — v2/tests/test_townsfolk_looks.mjs.
 */
import { randomize } from './randomize.js';
import { TINT_PALETTE, tintMaterialFor } from '../../../../../amo/src/systems/lpcPalettes.js';

export const LOOK_GROUPS = [['adult', 18], ['child', 3], ['guard', 3]];
export const HUMAN_SKINS = 8;   // body palette 0–7: Natural … Ebony (8+ are fantasy and fur tones)
const NO_GEAR = ['weapon', 'shield', 'cape', 'backpack', 'wings', 'tail', 'horns', 'arms', 'shoulders'];

// What a townsperson may wear, per slot: [allowed, refused] id patterns (a slot not
// listed is left to the randomiser's own rules).
const WARDROBE = {
    eyes:          [/^human\//],
    hair:          [/./, /^(extensions\/|spiked|longhawk|shorthawk|idol|princess|cowlick_tall)/],
    hat:           [/^(cloth\/(bandana2?|hood|leather_cap)|formal\/(bowler|tophat)|legacy2017\/gentleman\/bowler|headband\/(hairtie|thick|tied)\/(adult|child)$|pirate\/kerchief|cloth\/hijab)/],
    torso_clothes: [/./, /^bandage\//],
    legs:          [/./, /^(armour|fur|skirts\/(legion|slit)|shorts\/short_shorts|leggings)|^skirts\/.*\/male$/],
    feet:          [/^(shoes|boots\/(basic|fold|revised|rimmed)|sandals|slippers)\//],
    torso_jacket:  [/./, /santa/],
    torso_waist:   [/./, /^waist\/(obi|belt_mage)/],
    neck:          [/^(scarf$|necklace\/(simple|chain|beaded_small)|cravat|tie\/necktie|legacy2017\/gentleman\/necktie|amulet\/cross)/],
};
// Colours by name in the item's display palette (one palette serves skin, hair and
// cloth): natural hair, muted cloth.
export const WARDROBE_PALETTES = {
    hair:  ['Ash', 'Platinum', 'White', 'Gray', 'Blonde', 'Sandy', 'Strawberry', 'Ginger', 'Redhead', 'Light Brown', 'Chestnut', 'Dark Brown', 'Dark Gray', 'Black', 'Raven'],
    cloth: ['Fur Black', 'Fur Brown', 'Fur Copper', 'Fur Grey', 'Fur Tan', 'Fur White', 'Ash', 'White', 'Gray', 'Sandy', 'Light Brown', 'Chestnut', 'Dark Brown', 'Dark Gray', 'Black', 'Raven', 'Redhead', 'Rose', 'Navy', 'Dark Green'],
};
const HAIR_SLOTS = new Set(['hair', 'beards']);

export function seeded(seed) {
    let s = seed;
    return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
}

function wardrobeFor(catalogue, female) {
    const out = { ...catalogue };
    for (const [slot, [allow, refuse]] of Object.entries(WARDROBE)) {
        out[slot] = (catalogue[slot] ?? []).filter(e => allow.test(e.id ?? '') && !(refuse && refuse.test(e.id ?? '')));
    }
    out.beards = female ? [] : (catalogue.beards ?? []).filter(e => !/female/.test(e.id ?? ''));
    return out;
}

// Re-colour hair and cloth from the wardrobe palettes (body tints stay: skin).
function recolour(catalogue, sel, rng, locked) {
    for (const [slot, pick] of Object.entries(sel)) {
        if (pick.tint === undefined || locked.has(slot) || ['body', 'head', 'ears', 'nose'].includes(slot)) continue;
        const entry = (catalogue[slot] ?? []).find(e => e.id === pick.id);
        const palette = TINT_PALETTE[tintMaterialFor(slot, entry)];
        if (!palette) continue;
        const names = WARDROBE_PALETTES[HAIR_SLOTS.has(slot) ? 'hair' : 'cloth'];
        const allowed = names.map(n => palette.findIndex(p => p.name === n)).filter(i => i >= 0);
        if (!allowed.length) continue;
        pick.tint = allowed[Math.min(allowed.length - 1, Math.floor(rng() * allowed.length))];
    }
}

export function townsfolkRecipes(catalogue, { seed = 1, groups = LOOK_GROUPS, tintCount = () => 0 } = {}) {
    const rng = seeded(seed), out = [];
    for (const [group, count] of groups) {
        for (let i = 0; i < count; i++) {
            const female = group !== 'child' && rng() < 0.5;
            const body = group === 'child' ? 'bodies/child' : female ? 'bodies/female' : 'bodies/male';
            const sel = { body: { id: body, tint: Math.floor(rng() * HUMAN_SKINS) } };
            const locked = new Set(['body', ...NO_GEAR]);
            if (group === 'guard') {
                sel.torso_armour = { id: female ? 'armour/plate/female' : 'armour/plate/male' };
                sel.legs = { id: female ? 'armour/plate/thin' : 'armour/plate/male' };
                sel.hat = { id: 'helmet/kettle/adult' };
                for (const s of ['torso_armour', 'legs', 'hat']) locked.add(s);
            }
            const id = `look_${String(out.length).padStart(2, '0')}`;
            const wardrobe = wardrobeFor(catalogue, female);
            const comp = randomize(wardrobe, { name: id, sel }, { locked, rng, tintCount });
            recolour(wardrobe, comp.sel, rng, locked);
            out.push({ id, group, comp });
        }
    }
    return out;
}
