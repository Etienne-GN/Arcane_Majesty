/**
 * Bridges saved/equipped renderer layers to the catalogue's per-layer animation
 * manifest. In-game weapon configs (ITEMS[*].lpcLayer) and legacy character saves
 * predate the `anims` field; enriching them here means the renderer resolves the
 * correct concrete animation per layer (slash↔attack_slash, …) and never requests
 * a sheet that doesn't exist — same guarantee the creator gets from the catalogue.
 */
import CATALOGUE from '../data/character_catalogue.json';

// Catalogue key → on-disk render type (mirrors CharacterCreatorScene.RENDER_TYPE
// and gen tooling). Used only to index; entry.renderType overrides per entry.
const KEY_RENDER_TYPE = {
    torso_clothes: 'torso', torso_jacket: 'torso', torso_mail: 'torso',
    torso_armour: 'torso', torso_waist: 'torso',
    ears: 'head', horns: 'head', fins: 'head', nose: 'head',
    tail: 'body', wings: 'body',
    wound_arm: 'body', wound_brain: 'body', wound_eye_left: 'body',
    wound_eye_right: 'body', wound_mouth: 'body', wound_ribs: 'body',
};

const indexKey = (type, id, itemName) => `${type}:${id}#${itemName ?? ''}`;

// Build once: "renderType:id#itemName" → anims[]   (entries + companions)
const ANIM_INDEX = (() => {
    const idx = {};
    for (const [key, list] of Object.entries(CATALOGUE)) {
        const folder = KEY_RENDER_TYPE[key] ?? key;
        for (const e of list) {
            if (!e.id) continue;
            const ft = e.renderType ?? folder;
            if (e.anims) idx[indexKey(ft, e.id, e.itemName)] = e.anims;
            for (const c of e.companions ?? []) {
                if (c.anims) idx[indexKey(ft, c.id, c.itemName)] = c.anims;
            }
        }
    }
    return idx;
})();

/** Return a copy of `layer` with `anims` filled from the catalogue when absent. */
export function enrichLayerAnims(layer) {
    if (!layer || layer.anims) return layer;
    const anims = ANIM_INDEX[indexKey(layer.type, layer.id, layer.itemName)];
    return anims ? { ...layer, anims } : layer;
}

/** Map enrichLayerAnims over an array (no-op for falsy input). */
export function enrichLayers(layers) {
    return Array.isArray(layers) ? layers.map(enrichLayerAnims) : layers;
}

// ── In-game weapon visuals ──────────────────────────────────────────────────
// Most weapon ITEMS have no hand-authored lpcLayer. Map them to a catalogue
// weapon sprite so they render in-game. Default by weaponType; per-item overrides
// pick a more specific sprite where the name clearly matches one.
//
// EDIT FREELY: assign any item id → catalogue weapon id below to give a weapon its
// own look. Run `npm run test:catalogue` after — every id must exist on disk.
const WEAPON_TYPE_SPRITE = {
    spell_blade:   'sword/longsword',
    umbral_dagger: 'sword/dagger',
    staff:         'magic/simple/foreground',
    resonance_bow: 'ranged/bow/normal',
};
const WEAPON_SPRITE_OVERRIDE = {
    // explicit / unambiguous matches (kept conservative — extend as desired)
    longsword:        'sword/longsword',
    katana:           'sword/katana',
    arcane_saber:     'sword/saber',
    arcane_war_blade: 'sword/longsword_alt',
    forest_longbow:   'ranged/bow/great',
    carved_shortbow:  'ranged/bow/recurve',
    // NOTE: staves default to magic/simple/foreground because it's the only magic
    // sprite in the catalogue that ships a `spellcast` animation — other magic
    // sprites (crystal/gnarled/…) would vanish during a cast, so no overrides here.
};

// Logical attack animation per weaponType, so the player's attack reads correctly
// (staves cast, bows shoot) instead of everything playing 'slash'.
export const WEAPON_ATTACK_ANIM = {
    staff:         'spellcast',
    resonance_bow: 'shoot',
    spell_blade:   'slash',
    umbral_dagger: 'slash',
};

/** Renderer layers (main + companions, with anims) for a catalogue weapon id. */
export function weaponLayersFor(catalogueId) {
    const e = (CATALOGUE.weapon ?? []).find(w => w.id === catalogueId);
    if (!e) return [];
    const z = e.zPos ?? 140;
    const layers = [{ type: 'weapon', id: e.id, zPos: z, itemName: e.itemName, anims: e.anims }];
    for (const c of e.companions ?? []) {
        layers.push({ type: 'weapon', id: c.id, zPos: c.zPos ?? z, itemName: c.itemName, anims: c.anims });
    }
    return layers;
}

/**
 * Renderer layers for a weapon ITEM. Prefers a hand-authored `item.lpcLayer`,
 * then a per-item sprite override, then the weaponType default. Returns [] when
 * nothing maps (weapon simply shows no overlay).
 */
export function weaponLayersForItem(item) {
    if (!item) return [];
    if (item.lpcLayer) return enrichLayers(Array.isArray(item.lpcLayer) ? item.lpcLayer : [item.lpcLayer]);
    const catId = WEAPON_SPRITE_OVERRIDE[item.id] ?? WEAPON_TYPE_SPRITE[item.weaponType];
    return catId ? weaponLayersFor(catId) : [];
}
