// Where the player comes back: on Continue (the saved location) and after
// death (the last campfire or rift-gate). Pure — no Phaser — so it is tested
// in tools/test_foundations.mjs.

const NONE = { mapId: undefined, spawnX: undefined, spawnY: undefined };

// W6: a saved spot remembers the layout of the map it was saved on (no field = 1).
// When a map is rebuilt (its layoutVersion goes up), an old spot is meaningless —
// it may now be a wall — so Continue and respawn use that map's start instead.
export const stampLayout = (spot, layout = 1) => ((layout ?? 1) === 1 ? spot : { ...spot, layout });
const sameLayout = (spot, layoutOf) => (spot.layout ?? 1) === (layoutOf(spot.mapId) ?? 1);

// Continue: the saved location, or undefined fields so GameScene uses its default map.
export function continueTarget(stats, mapExists = () => true, layoutOf = () => 1) {
    const loc = stats.location;
    if (loc?.mapId && mapExists(loc.mapId)) {
        return sameLayout(loc, layoutOf)
            ? { mapId: loc.mapId, spawnX: loc.x, spawnY: loc.y }
            : { mapId: loc.mapId, spawnX: undefined, spawnY: undefined };
    }
    return { ...NONE };
}

// After death: the respawn point, else the start of the map you died on.
export function respawnTarget(stats, deathMapId, mapExists = () => true, layoutOf = () => 1) {
    const p = stats.respawnPoint;
    if (p?.mapId && mapExists(p.mapId)) {
        if (sameLayout(p, layoutOf)) return { mapId: p.mapId, spawnX: p.x, spawnY: p.y, label: p.label ?? null };
        return { mapId: p.mapId, spawnX: undefined, spawnY: undefined, label: null };
    }
    return { mapId: deathMapId, spawnX: undefined, spawnY: undefined, label: null };
}

export function setRespawnPoint(stats, mapId, x, y, label = null, layout = 1) {
    stats.respawnPoint = stampLayout({ mapId, x: Math.round(x), y: Math.round(y), label }, layout);
}

// Lose 10% of glint (rounded down); come back at half HP and full MP.
export function applyDeathPenalty(stats) {
    const glint = Math.max(0, stats.glint ?? 0);
    const glintLost = Math.floor(glint * 0.10);
    stats.glint = glint - glintLost;
    stats.health = Math.max(1, Math.ceil(stats.maxHealth * 0.5));
    stats.mana = stats.maxMana;
    stats.manaExhausted = false;
    stats.manaCollapsed = false;
    stats._exhaustionTimer = 0;
    return { glintLost };
}

// Settle a death the moment it happens, whichever Game Over button follows:
// pay the penalty and move the saved location to where the player will rise,
// so neither "Return to Menu" nor closing the tab dodges it. Online keeps the
// old behaviour (no penalty, the default map).
export function resolveDeath(stats, deathMapId, mapExists = () => true, { online = false, layoutOf = () => 1 } = {}) {
    if (online) return { glintLost: 0, target: { mapId: undefined, spawnX: undefined, spawnY: undefined, label: null } };
    const { glintLost } = applyDeathPenalty(stats);
    const target = respawnTarget(stats, deathMapId, mapExists, layoutOf);
    stats.location = stampLayout({ mapId: target.mapId, x: target.spawnX, y: target.spawnY }, layoutOf(target.mapId));
    return { glintLost, target };
}

// A slain map creature only comes back when the player is out of the way.
export const RESPAWN_MIN_DIST = 320;
export function canRespawnAt(spawn, player, minDist = RESPAWN_MIN_DIST) {
    return Math.hypot(spawn.x - player.x, spawn.y - player.y) >= minDist;
}
