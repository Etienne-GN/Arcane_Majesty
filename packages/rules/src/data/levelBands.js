// Region level bands: how strong a map's creatures are. A map can set
// `levelBand: { min, max }`; otherwise the campaign chapter that first claims
// the map decides (chapter i → levels 1+2i … 3+2i); other maps are 1–3.
// Pure — tested in tools/test_foundations.mjs.
import { ELDORIAS_PROPHECY } from './campaigns/eldorias_prophecy.js';

export function mapLevelBand(mapDef) {
    if (mapDef?.levelBand) return { min: mapDef.levelBand.min, max: mapDef.levelBand.max };
    const i = ELDORIAS_PROPHECY.chapters.findIndex(c => c.maps.includes(mapDef?.id));
    if (i < 0) return { min: 1, max: 3 };
    return { min: 1 + 2 * i, max: 3 + 2 * i };
}

export function rollEnemyLevel(band, rng = Math.random) {
    return band.min + Math.floor(rng() * (band.max - band.min + 1));
}

export function levelDamageMult(level) {
    return 1 + 0.10 * (Math.max(1, level) - 1);
}

// HP +15%, damage +10%, XP +12%, gold +10% per level above 1.
export function scaleEnemyStats(base, level) {
    const l = Math.max(1, level) - 1;
    return {
        health:   Math.round(base.health   * (1 + 0.15 * l)),
        damage:   Math.round(base.damage   * (1 + 0.10 * l)),
        xpReward: Math.round(base.xpReward * (1 + 0.12 * l)),
        goldDrop: Math.round(base.goldDrop * (1 + 0.10 * l)),
    };
}
