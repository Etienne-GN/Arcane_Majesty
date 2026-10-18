// Interiors (W3): door locks, where you stand when you come back out, and the
// return stack that lets nested interiors (a cellar under an inn) unwind in
// order. Pure — tools/test_interiors.mjs. GameScene uses it for doors and the
// '__return' exit portal every generated interior has.

export const RETURN_KEY = '__return';

export function doorLockState(def, stats) {
    const lock = def.locked;
    if (!lock) return { open: true, reason: null };
    const hasItem = lock.item && (stats.countItem?.(lock.item) ?? 0) > 0;
    const hasFlag = lock.flag && !!stats.flags?.[lock.flag];
    if (hasItem || hasFlag) return { open: true, reason: null };
    return { open: false, reason: lock.text ?? 'It\'s locked.' };
}

// The tile you stand on to use the door: one tile back along the way you faced.
export function doorReturnPoint(def, tilePx = 32) {
    const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[def.facing ?? 'up'];
    return { x: (def.x + back[0]) * tilePx + tilePx / 2, y: (def.y + back[1]) * tilePx + tilePx / 2 };
}

export function pushReturn(stats, entry) {
    stats.interiorReturn ??= [];
    stats.interiorReturn.push({ mapId: entry.mapId, x: entry.x, y: entry.y });
}

export function resolvePortal(portalDef, stats, mapDef, tilePx = 32) {
    if (portalDef.targetMap !== RETURN_KEY) {
        return { targetMap: portalDef.targetMap, targetX: portalDef.targetX, targetY: portalDef.targetY };
    }
    const top = stats.interiorReturn?.pop();
    if (top) return { targetMap: top.mapId, targetX: top.x, targetY: top.y };
    const fb = mapDef?.exitFallback;
    if (fb) return { targetMap: fb.map, targetX: fb.x * tilePx + tilePx / 2, targetY: fb.y * tilePx + tilePx / 2 };
    return null;
}

export function clearReturnsOutside(stats, mapDef) {
    if (!mapDef?.interior) stats.interiorReturn = [];
}
