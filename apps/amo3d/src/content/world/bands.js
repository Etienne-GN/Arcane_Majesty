// The difficulty bands (docs/3d/WORLD_PLAN.md: levels 1–50 in five bands, rising from the starters to the Obsidian
// Citadel and the Underworld). Each place has a level; between places the level blends by distance (a gaussian
// weighting, ~700 m), so the land grows harder as you travel. levelAt(world)(x, z) → 1…50.
import LAYOUT from './eldoria_layout.json';

const at = name => { const p = LAYOUT.places.find(q => q.name === name); return p ? [p.world[0], p.world[1]] : null; };
const ELDORIA = [
    // band 1–10: the starters and the heart of Thaloria's corner
    ['The Emerald Fields', 3], ['The Weeping Stones', 4], ['The Hidden Cabin', 5], ["Eldrin's Tower", 3], ["Thaloria Glade (Eldrin's Tower's vale)", 3],
    ['Thaloria', 8], ['The Lower Town of Thaloria', 8], ['The Citadel of Thaloria', 9], ['The Crossroads', 10],
    // band 11–20: the heartlands, the lake, the coast, the eastern road
    ['Silverrun River', 12], ['Lake Aethera', 14], ['The Sunken Temple', 17], ['Port Silver', 15], ['The East Road (Thalorian Wilds)', 14], ['Summit of Despair — the Approach', 18], ['Summit of Despair', 20],
    // band 21–30: the western woods, the iron hills, the isles, the border
    ['Iron Hollow', 21], ['Whisper-Wood', 23], ['Duskmeet', 26], ['Graywatch', 28], ['Sanguine Vaults', 29],
    // band 31–40: the Scarlands and beyond the Divide
    ['New Ravenspire', 32], ['The Obsidian Gate', 35], ['The Great Rift', 38], ['Sylvan Sanctuary', 32], ['Heartstone Chamber', 36], ['Fire Gate', 36],
    // band 41–50: the fire mountain and the oldest ruins
    ['Inferno Labyrinth', 41], ['Ruins of Eldoria', 43], ['The Ancient Door', 44],
].map(([n, l]) => [at(n), l]).filter(([p]) => p);
const ISLES = [[4125, 2231], 25];   // the Sunward Isles (ARCHIPELAGO in eldoria.js)
const NYTHORIA = [
    ['The Crossroads', 3], ['Lake Aethera', 18], ['The Citadel of Thaloria', 25], ['Thaloria', 22], ['Iron Hollow', 28], ['Whisper-Wood', 30],
    ['The Great Rift', 43], ['The Obsidian Gate', 36], ['Inferno Labyrinth', 48], ['Fire Gate', 45], ['Ruins of Eldoria', 46], ['Graywatch', 34], ['Port Silver', 24], ['The Emerald Fields', 12],
].map(([n, l]) => [at(n), l]).filter(([p]) => p);

function blend(list, R = 450) {
    return (x, z) => {
        let s = 0, w = 0;
        for (const [[px, pz], l] of list) { const d2 = (x - px) ** 2 + (z - pz) ** 2, k = Math.exp(-d2 / (R * R)) + 1e-9; s += l * k; w += k; }
        return Math.max(1, Math.min(50, Math.round(s / w)));
    };
}
export const levelAtEldoria = blend([...ELDORIA, ISLES]);
export const levelAtNythoria = blend(NYTHORIA);

// A creature's stats at a level: its type keeps its character (a wolf stays a wolf), scaled from its natural level
// (estimated from its health) to the level of the land it lives in.
const hpAt = L => 30 + 9 * L, dmgAt = L => 4 + 1.2 * L;
export function scaleToLevel(BASE, L) {
    const nat = Math.max(1, Math.min(50, (BASE.health - 30) / 9)), k = hpAt(L) / hpAt(nat), kd = dmgAt(L) / dmgAt(nat);
    return { ...BASE, health: Math.max(5, Math.round(BASE.health * k)), damage: Math.max(1, Math.round(BASE.damage * kd)), xpReward: Math.max(1, Math.round((BASE.xpReward ?? 10) * Math.pow(L / nat, 1.1))), level: L };
}
