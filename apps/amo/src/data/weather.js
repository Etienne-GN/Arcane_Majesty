// Weather: each map's sky follows a weighted table (its own `weather`, or its
// biome's) and changes every 4–8 game hours. The weather at any game minute
// is a pure function of the map and the time — nothing is saved.
// Pure — tools/test_phase5_world.mjs. GameScene applies the effects.
import { seededRng } from './bounties.js';

export const WEATHER = { clear: 'Clear', rain: 'Rain', storm: 'Storm', snow: 'Snow', sandstorm: 'Sandstorm' };

export const BIOME_WEATHER = {
    temperate: { clear: 6, rain: 3, storm: 1 },
    forest:    { clear: 6, rain: 3, storm: 1 },
    snow:      { clear: 4, snow: 5, storm: 1 },
    arid:      { clear: 6, sandstorm: 3 },
    indoor:    { clear: 1 },
};

export const mapBiome = mapDef => mapDef?.biome ?? 'temperate';
export const weatherTable = mapDef => mapDef?.weather ?? BIOME_WEATHER[mapBiome(mapDef)] ?? BIOME_WEATHER.temperate;

const SEG_MIN = 240, SEG_MAX = 480;      // 4–8 game hours

function hash(s) {
    let h = 2166136261;
    for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
}

// Segment i of a map: its length and weather, from its own seed.
function segment(mapId, table, i) {
    const rng = seededRng(hash(mapId) ^ Math.imul(i + 1, 2246822519));
    const len = SEG_MIN + Math.floor(rng() * (SEG_MAX - SEG_MIN + 1));
    const entries = Object.entries(table);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let pick = rng() * total, id = entries[entries.length - 1][0];
    for (const [k, w] of entries) { if ((pick -= w) < 0) { id = k; break; } }
    return { len, id };
}

// Walking the segments from minute 0 is cheap (a few per game day); the last
// one found per map is cached so the per-second lookups start from there.
const cache = new Map();
export function weatherAt(mapDef, minutes) {
    const table = weatherTable(mapDef);
    const ids = Object.keys(table);
    if (ids.length === 1) return { id: ids[0], from: 0, to: Infinity };
    const key = `${mapDef?.id}|${JSON.stringify(table)}`;
    let c = cache.get(key);
    if (!c || minutes < c.from) c = { i: 0, from: 0 };
    for (;;) {
        const seg = segment(String(mapDef?.id), table, c.i);
        if (minutes < c.from + seg.len) {
            cache.set(key, c);
            return { id: seg.id, from: c.from, to: c.from + seg.len };
        }
        c = { i: c.i + 1, from: c.from + seg.len };
    }
}

export const isWet = id => id === 'rain' || id === 'storm';

export function spellWeatherMult(id, element) {
    if (!isWet(id)) return 1;
    if (element === 'fire') return 0.8;
    if (element === 'lightning') return 1.2;
    return 1;
}

export const sightMult = id => (id === 'sandstorm' ? 0.6 : 1);

export const RAIN_TICK_MS = 10000;
export const SNOW_TICK_MS = 20000;
export const WARM_RADIUS  = 120;
export const STORM = { minMs: 6000, maxMs: 12000, telegraphMs: 1200, radius: 40 };
export const stormStrikeDamage = band => 10 + 2 * band.max;

// Warm enough to keep the snow's cold off: near a fire, or under Warming.
export function isWarm(x, y, fires, warming) {
    if (warming) return true;
    return fires.some(f => Math.hypot(f.x - x, f.y - y) <= WARM_RADIUS);
}
