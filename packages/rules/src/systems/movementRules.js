// Movement rules (W1): Vigor, sprint speed, hop landing, hoppable decorations.
// Pure — tools/test_movement.mjs. Player and GameScene consume it.

export const MOVE = {
    SPRINT_MULT: 1.6,
    SPRINT_DRAIN_PER_S: 20,
    VIGOR_REGEN_PER_S: 25,
    VIGOR_REGEN_DELAY_MS: 800,
    WINDED_RESUME: 30,      // a winded player sprints again once Vigor is back to this
    HOP_COST: 25,
    HOP_MS: 450,
    HOP_IFRAME_MS: 250,     // the dodge: invulnerable for the start of the hop
    HOP_MAX_DIST: 64,       // two tiles
    HOP_LIFT: 10,           // px the sprite rises at the top of the arc
};

export const vigorMax = agility => 100 + 2 * Math.max(0, (agility ?? 0) - 10);

// s: { vigor, maxVigor, vigorWinded, _vigorIdleMs }. Sprinting only spends when allowed;
// holding Shift while winded is just walking, and Vigor keeps recovering.
export function tickVigor(s, dtMs, sprinting) {
    const spending = sprinting && canSprint(s);
    if (spending) {
        s.vigor = Math.max(0, s.vigor - MOVE.SPRINT_DRAIN_PER_S * dtMs / 1000);
        s._vigorIdleMs = 0;
        if (s.vigor <= 0) s.vigorWinded = true;
        return;
    }
    s._vigorIdleMs = (s._vigorIdleMs ?? 0) + dtMs;
    const regenMs = Math.min(dtMs, s._vigorIdleMs - MOVE.VIGOR_REGEN_DELAY_MS);
    if (regenMs > 0) s.vigor = Math.min(s.maxVigor, s.vigor + MOVE.VIGOR_REGEN_PER_S * regenMs / 1000);
    if (s.vigorWinded && s.vigor >= MOVE.WINDED_RESUME) s.vigorWinded = false;
}

export const canSprint = s => !s.vigorWinded && s.vigor > 0;

export function spendHop(s) {
    if (s.vigor < MOVE.HOP_COST) return false;
    s.vigor -= MOVE.HOP_COST;
    s._vigorIdleMs = 0;
    if (s.vigor <= 0) s.vigorWinded = true;
    return true;
}

export function moveSpeed(base, fatigue, statusMult, sprinting) {
    return Math.floor(base * (1 - fatigue * 0.75) * statusMult * (sprinting ? MOVE.SPRINT_MULT : 1));
}

// Longest hop (in 16 px steps, up to maxDist) whose landing is open and whose
// path crosses only open or hoppable ground. 0 = hop in place.
// blockedAt(x, y) → 'wall' | 'hop' | null for the player's feet at (x, y).
export function hopLanding(from, dir, blockedAt, maxDist = MOVE.HOP_MAX_DIST) {
    const len = Math.hypot(dir?.x ?? 0, dir?.y ?? 0);
    if (!len) return 0;
    const ux = dir.x / len, uy = dir.y / len;
    for (let d = maxDist; d >= 16; d -= 16) {
        if (blockedAt(from.x + ux * d, from.y + uy * d) !== null) continue;
        let clear = true;
        for (let s = 8; s < d; s += 8) {
            if (blockedAt(from.x + ux * s, from.y + uy * s) === 'wall') { clear = false; break; }
        }
        if (clear) return d;
    }
    return 0;
}

// Low things a hop clears. Tall fences (iron), big stumps and barrels stay walls.
export const HOPPABLE_NAME = /^(fence_wood_|wood_post_fence|log_|stump_small|rock_small|small_stone_nub|crate_|market_crate_)/;

export function isHoppableDecoration(placement, entry, hopCells = null) {
    if (typeof placement.hoppable === 'boolean') return placement.hoppable;
    if (entry?.hoppable === true) return true;
    if (hopCells?.has(`${placement.x},${placement.y}`)) return true;
    return HOPPABLE_NAME.test(placement.name ?? '');
}
