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
