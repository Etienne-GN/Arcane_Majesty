// Elemental reactions that hit more than one target. Freeze (cold + wet →
// frozen) lives in StatusManager.apply. Pure — tools/test_combat_depth.mjs.

// Conduct: lightning on a wet target arcs to every other wet enemy nearby (one hop).
export const CONDUCT_RADIUS = 90;
export const CONDUCT_FRACTION = 0.5;
// `exclude`: enemies already struck by this cast (an area spell must not arc
// onto every other target it hits directly — that would square the damage).
export function conductTargets(source, enemies, isWet, exclude = null) {
    return enemies.filter(e => e !== source && e.active && isWet(e) && !exclude?.has(e)
        && Math.hypot(e.x - source.x, e.y - source.y) <= CONDUCT_RADIUS);
}

// Detonate: fire on a void-tainted target bursts around it.
export const DETONATE_RADIUS = 50;
export function detonateDamage(hitDmg) {
    return Math.floor(15 + 0.3 * hitDmg);
}
