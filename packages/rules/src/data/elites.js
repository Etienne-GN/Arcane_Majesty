// Elite creatures: rare, stronger map spawns with 1–2 affixes and better loot.
// Pure — tools/test_combat_depth.mjs.
import { resolveNode } from './gathering.js';

export const ELITE_CHANCE = 0.08;
export const ELITE_AFFIXES = ['warded', 'swift', 'vampiric', 'arcane', 'thorned'];
export const AFFIX_LABELS = { warded: 'Warded', swift: 'Swift', vampiric: 'Vampiric', arcane: 'Arcane', thorned: 'Thorned' };

// At most one elite per six spawns, but a small map can still have one.
export function eliteCap(spawnCount) {
    return spawnCount <= 0 ? 0 : Math.max(1, Math.floor(spawnCount / 6));
}

export function rollElite(rng, elitesSoFar, cap) {
    return elitesSoFar < cap && rng() < ELITE_CHANCE;
}

export function pickAffixes(rng) {
    const count = rng() < 0.5 ? 1 : 2;
    const pool = [...ELITE_AFFIXES];
    const out = [];
    for (let i = 0; i < count; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
}

export function eliteStats(s) {
    return {
        health:   Math.round(s.health * 2.5),
        damage:   Math.round(s.damage * 1.4),
        xpReward: Math.round(s.xpReward * 3),
        goldDrop: Math.round(s.goldDrop * 3),
    };
}

// A rare item from the map's own gathering pools (bonus entries, else the rarest weighted one).
export function eliteRareDrop(mapDef, rng) {
    const rares = new Set();
    for (const node of mapDef?.spawns?.gatheringNodes ?? []) {
        const pool = resolveNode(node).pool;
        const bonus = pool.filter(e => e.chance);
        if (bonus.length) bonus.forEach(e => rares.add(e.id));
        else {
            const weighted = pool.filter(e => e.w);
            if (weighted.length > 1) rares.add(weighted.reduce((a, b) => (b.w < a.w ? b : a)).id);
        }
    }
    const list = [...rares];
    return list.length ? list[Math.floor(rng() * list.length)] : 'silver_ore';
}
