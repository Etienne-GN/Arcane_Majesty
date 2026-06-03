/**
 * Pure (Phaser-free) animation resolution for the LPC layer system. Kept separate
 * from CharacterRenderer so it can be unit-tested in plain Node. Re-exported from
 * CharacterRenderer.js, so existing imports are unaffected.
 */

// Logical animations the creator/preview works in. Per layer these are resolved
// to the concrete file a layer actually ships (see ANIM_ALIASES / resolveAnim) —
// e.g. a Vitruvius weapon realises the logical 'slash' as its 'attack_slash' file.
export const DEFAULT_ANIMS = [
    'walk', 'idle', 'hurt', 'slash', 'backslash', 'halfslash', 'thrust', 'shoot', 'spellcast',
    'run', 'sit', 'jump', 'climb', 'combat_idle', 'emote',
];

// Logical anim → ordered list of concrete file names that satisfy it. Universal
// LPC names come first; Vitruvius "attack_*" exports are the fallbacks. A layer
// resolves to the first candidate present in its manifest (layer.anims).
export const ANIM_ALIASES = {
    slash:     ['slash', 'attack_slash'],
    backslash: ['backslash', 'attack_backslash', 'attack_slash_reverse'],
    halfslash: ['halfslash', 'attack_halfslash'],
    thrust:    ['thrust', 'attack_thrust'],
};

/**
 * Resolve a logical animation to the concrete file name a layer actually has.
 * Returns null when the layer ships no file for that motion. Layers without a
 * manifest (`layer.anims`) fall back to the literal name (legacy behaviour).
 */
export function resolveAnim(layer, logical) {
    const candidates = ANIM_ALIASES[logical] ?? [logical];
    if (!layer.anims) return candidates[0];
    for (const c of candidates) if (layer.anims.includes(c)) return c;
    return null;
}

/** Concrete anim names a layer needs loaded to cover a logical anim set (deduped Set). */
export function concreteAnimsFor(layer, logicalAnims) {
    const out = new Set();
    for (const logical of logicalAnims) {
        const c = resolveAnim(layer, logical);
        if (c) out.add(c);
    }
    // Walk is the universal fallback for layers that lack a requested motion.
    const walk = resolveAnim(layer, 'walk');
    if (walk) out.add(walk);
    return out;
}
