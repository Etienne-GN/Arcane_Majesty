// Per-map world memory, saved with the character:
//   stats.worldState = { [mapId]: { nodes: { 'x,y': readyAt }, bossDefeated: true } }
// readyAt is real time (ms since epoch) so a node keeps regrowing between sessions.
// Pure — tested in tools/test_foundations.mjs.

export function nodeKey(def) {
    return `${def.x},${def.y}`;
}

function mapState(stats, mapId) {
    stats.worldState ??= {};
    return (stats.worldState[mapId] ??= { nodes: {} });
}

export function markNodeHarvested(stats, mapId, key, now, regrowMs) {
    mapState(stats, mapId).nodes[key] = now + regrowMs;
}

// Time until the node is back, clamped to [0, maxMs] so a changed clock can't lock it.
export function nodeRegrowRemaining(stats, mapId, key, now, maxMs) {
    const readyAt = stats.worldState?.[mapId]?.nodes?.[key];
    if (!readyAt) return 0;
    return Math.min(maxMs, Math.max(0, readyAt - now));
}

export function markBossDefeated(stats, mapId) {
    mapState(stats, mapId).bossDefeated = true;
}

export function isBossDefeated(stats, mapId) {
    return !!stats.worldState?.[mapId]?.bossDefeated;
}

// A copy for saving, without node timers that have already run out.
export function prunedWorldState(stats, now) {
    const out = {};
    for (const [mapId, st] of Object.entries(stats.worldState ?? {})) {
        const nodes = Object.fromEntries(Object.entries(st.nodes ?? {}).filter(([, t]) => t > now));
        out[mapId] = { ...st, nodes };
    }
    return out;
}
