// Depth + collision for one catalogued sprite placed on a map, from the
// `layer` and `hitbox` set in the sprite ledger (see
// tools/sprite_catalogue/propose_physics.py and the ledger's hitbox editor).
// Pure so it can be tested without Phaser.

// Characters are depth-sorted by their centre (player.y + 1), and the
// player's feet sit 28px below it (64px frame, body offset 32 + height 28).
// A sorted object uses its base minus this, so a character is drawn in front
// exactly when its feet are lower on screen than the object's base.
export const CHAR_FEET_OFFSET = 28;
// Always below every character and y-sorted prop, above the floor tilemap (0).
export const UNDER_DEPTH = 2;
// Always above everything y-sorted.
export const OVER_DEPTH = 100000;

/**
 * entry: catalogue entry (may carry `layer` and `hitbox`)
 * box:   { left, top, w, h } the sprite's box in world pixels
 * item:  the map item ({ blocking?, depthOffset? })
 * Returns { depth, body } where body is a world-pixel box to block, or null.
 */
export function catalogueLayout(entry, box, item = {}) {
    const offset = item.depthOffset ?? 0;
    const hb = entry.hitbox;

    let depth;
    if (entry.layer === 'under') depth = UNDER_DEPTH + offset;
    else if (entry.layer === 'over') depth = OVER_DEPTH + box.top + box.h + offset;
    else if (entry.layer === 'sorted') {
        const baseY = box.top + (hb ? hb.y + hb.h : box.h);
        depth = baseY - CHAR_FEET_OFFSET + offset;
    } else depth = box.top + box.h / 2 + offset; // not set yet: the old centre-based depth

    let body = null;
    if (hb !== undefined) {
        // Decided in the ledger: the hitbox is the collision, and null means
        // none. A map item can still opt out with blocking: false.
        if (hb && item.blocking !== false) body = { x: box.left + hb.x, y: box.top + hb.y, w: hb.w, h: hb.h };
    } else if (item.blocking) {
        body = { x: box.left, y: box.top, w: box.w, h: box.h }; // legacy: the whole sprite
    }
    return { depth, body };
}
