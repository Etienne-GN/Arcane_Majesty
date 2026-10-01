// Where the player comes back: on Continue (the saved location) and after
// death (the last campfire or rift-gate). Pure — no Phaser — so it is tested
// in tools/test_foundations.mjs.

const NONE = { mapId: undefined, spawnX: undefined, spawnY: undefined };

// Continue: the saved location, or undefined fields so GameScene uses its default map.
export function continueTarget(stats, mapExists = () => true) {
    const loc = stats.location;
    if (loc?.mapId && mapExists(loc.mapId)) return { mapId: loc.mapId, spawnX: loc.x, spawnY: loc.y };
    return { ...NONE };
}

// After death: the respawn point, else the start of the map you died on.
export function respawnTarget(stats, deathMapId, mapExists = () => true) {
    const p = stats.respawnPoint;
    if (p?.mapId && mapExists(p.mapId)) return { mapId: p.mapId, spawnX: p.x, spawnY: p.y, label: p.label ?? null };
    return { mapId: deathMapId, spawnX: undefined, spawnY: undefined, label: null };
}

export function setRespawnPoint(stats, mapId, x, y, label = null) {
    stats.respawnPoint = { mapId, x: Math.round(x), y: Math.round(y), label };
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

// A slain map creature only comes back when the player is out of the way.
export const RESPAWN_MIN_DIST = 320;
export function canRespawnAt(spawn, player, minDist = RESPAWN_MIN_DIST) {
    return Math.hypot(spawn.x - player.x, spawn.y - player.y) >= minDist;
}
