/**
 * Phaser-free LPC layout rules shared by the game (CharacterRenderer,
 * CharacterCreatorScene) and LPC Forge v2 (via its @game alias). Anything the
 * Forge must agree with the game on — where a layer's PNG lives, slot order,
 * frame rates, the walk standing-frame skip — lives here and only here.
 */

// Creator slot order (UI types). Catalogue keys are a subset of these.
export const SLOTS = [
    'head','eyes','nose','ears','horns','fins','hair','beards','facial','body','tail','wings',
    'torso_clothes','torso_jacket','torso_mail','torso_armour','torso_waist',
    'legs','dress','feet','arms','shoulders',
    'hat','neck','cape','staff_accessory','backpack','shield','weapon',
    'wound_brain','wound_eye_left','wound_eye_right','wound_mouth','wound_ribs','wound_arm',
];

// UI slot → on-disk folder under lpc/ (entry.renderType overrides per entry).
export const RENDER_TYPE = {
    torso_clothes:   'torso', torso_jacket: 'torso',
    torso_mail:      'torso', torso_armour: 'torso', torso_waist: 'torso',
    tail:            'body',  wings:        'body',
    ears:            'head',  horns:        'head',  fins: 'head', nose: 'head',
    wound_arm:       'body',  wound_brain:  'body',
    wound_eye_left:  'body',  wound_eye_right: 'body',
    wound_mouth:     'body',  wound_ribs:   'body',
    staff_accessory: 'weapon',
};
export function renderType(slot) { return RENDER_TYPE[slot] ?? slot; }

// These types use  type/id/anim/{itemname}.png  (item name = last segment of id)
export const WEAPON_TYPES = new Set(['weapon']);

// These types use  type/id/anim/{color}.png  (color stored in layer.color)
export const COLOR_TYPES = new Set(['cape', 'backpack']);

/** Relative URL path (no leading slash) of a layer's PNG for one concrete anim. */
export function animPath(layer, anim) {
    if (layer.itemName) {
        // bodies using per-animation subdirs: body/bodies/skeleton/walk/skeleton.png
        return `lpc/${layer.type}/${layer.id}/${anim}/${layer.itemName}.png`;
    }
    if (layer.color != null) {
        // Any colored layer: cape, backpack, tail, wings, etc.
        return `lpc/${layer.type}/${layer.id}/${anim}/${layer.color}.png`;
    }
    if (WEAPON_TYPES.has(layer.type)) {
        // weapon/sword/longsword/walk/longsword.png
        const parts = layer.id.split('/');
        return `lpc/${layer.type}/${layer.id}/${anim}/${parts[parts.length - 1]}.png`;
    }
    if (COLOR_TYPES.has(layer.type)) {
        // Fallback for cape/backpack when no color specified
        return `lpc/${layer.type}/${layer.id}/${anim}/red.png`;
    }
    // body/bodies/male/walk.png
    return `lpc/${layer.type}/${layer.id}/${anim}.png`;
}

/** Playback rate (frames/s) per animation — the game's values. */
export function frameRateFor(anim) {
    return anim === 'idle' ? 2 : anim === 'slash' ? 11 : 8;
}

/**
 * Catalogue index of a saved creator pick. Restores by item id, because
 * catalogue positions shift whenever an item is added; the saved position is
 * only a fallback for old saves without an id (or an id no longer listed).
 */
export function slotIndex(entries, slot) {
    if (slot?.id) {
        const i = entries.findIndex(e => e.id === slot.id);
        if (i >= 0) return i;
    }
    const pos = slot?.catalogueIdx ?? 0;
    return pos >= 0 && pos < entries.length ? pos : 0;
}

/**
 * Next catalogue index from `from` in direction `delta` (±1), skipping entries
 * marked `hidden` (replaced items: still valid for saved characters, no longer
 * offered). Wraps around; stays put if nothing else is visible.
 */
export function nextVisible(list, from, delta) {
    const n = list.length;
    for (let step = 1; step <= n; step++) {
        const i = (((from + delta * step) % n) + n) % n;
        if (!list[i]?.hidden) return i;
    }
    return from;
}

/** Frames per motion on the body sheets (walk after its standing-frame skip). */
export const MOTION_FRAMES = {
    walk: 8, idle: 2, hurt: 6, slash: 6, backslash: 13, halfslash: 6, thrust: 8, shoot: 13,
    spellcast: 7, run: 8, sit: 3, jump: 5, climb: 6, combat_idle: 2, emote: 3,
};

/** ULPC walk sheets carry a standing frame in column 0; the game skips it. */
export function walkSkip(anim, cols) {
    return anim === 'walk' && cols === 9 ? 1 : 0;
}
