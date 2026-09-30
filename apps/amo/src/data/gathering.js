// Gathering — node types and what they yield.
//
// A map places nodes in spawns.gatheringNodes:
//   { x, y, type, yields?, label? }        (x, y in tiles)
// `type` picks the look, the tool and the regrow time (NODE_TYPES); `yields`
// names a YIELD_TABLES pool (defaults to the type's own). Legacy nodes that
// give a fixed `resource` (and their own `tool`) still work.
//
// Harvesting rolls the pool `rolls` times: each roll picks one of the
// weighted entries (`w`) and gives a quantity in [min, max]. Entries with a
// `chance` instead are rare bonuses, rolled once per harvest on top. A
// harvested node regrows after `regrowMs` (in-session; nodes are full again
// on map load).

export const NODE_TYPES = {
    wood:     { label: 'Deadwood',        texture: 'wood_pile',       tool: 'iron_axe',     yields: 'deadwood',         rolls: 1, regrowMs: 240000, tint: 0x8b5e3c, prompt: '#886633',
                text: 'Dry timber. An Iron Axe would split it.' },
    mineral:  { label: 'Ore Seam',        texture: 'mineral_node',    tool: 'iron_pickaxe', yields: 'ore_seam',         rolls: 1, regrowMs: 300000, tint: 0x8888aa, prompt: '#667788',
                text: 'A mineral seam runs through the rock. An Iron Pickaxe could break it open.' },
    herb:     { label: 'Herb Patch',      texture: 'herb_patch',      tool: null,           yields: 'forest_herbs',     rolls: 2, regrowMs: 150000, tint: 0x66cc55, prompt: '#77bb66',
                text: 'A patch of useful herbs.' },
    mushroom: { label: 'Mushroom Ring',   texture: 'mushroom_ring',   tool: null,           yields: 'forest_mushrooms', rolls: 2, regrowMs: 180000, tint: 0xccaa77, prompt: '#bb9966',
                text: 'A ring of mushrooms in the damp ground.' },
    berry:    { label: 'Berry Bush',      texture: 'berry_bush',      tool: null,           yields: 'berries',          rolls: 1, regrowMs: 150000, tint: 0xcc3355, prompt: '#cc6677',
                text: 'A bush heavy with berries.' },
    reeds:    { label: 'Reed Bed',        texture: 'reed_bed',        tool: 'sickle',       yields: 'reeds',            rolls: 1, regrowMs: 180000, tint: 0xaabb66, prompt: '#aabb66',
                text: 'Tall reeds by the water. A Sickle would cut them cleanly.' },
    fishing:  { label: 'Fishing Spot',    texture: 'fishing_spot',    tool: 'fishing_rod',  yields: 'river_fish',       rolls: 1, regrowMs: 120000, tint: 0x66aadd, prompt: '#66aadd',
                text: 'Fish are rising here. A Fishing Rod would do the rest.' },
    shallows: { label: 'Shallows',        texture: 'shallows',        tool: null,           yields: 'shallows',         rolls: 1, regrowMs: 200000, tint: 0x88bbcc, prompt: '#88bbcc',
                text: 'Clear shallows over a bed of mussels.' },
    crystal:  { label: 'Crystal Outcrop', texture: 'crystal_outcrop', tool: 'iron_pickaxe', yields: 'ice_crystals',     rolls: 1, regrowMs: 360000, tint: 0xaaddff, prompt: '#99ccee',
                text: 'Crystals grow out of the rock here. An Iron Pickaxe could chip some free.' },
};

// Weighted pools. Regional variety comes from pointing a node at another pool
// (e.g. a herb patch on the mountain uses 'mountain_herbs').
export const YIELD_TABLES = {
    deadwood:         [{ id: 'wood', w: 1, min: 1, max: 2 }, { id: 'resin', chance: 0.20, min: 1, max: 1 }, { id: 'heartwood', chance: 0.08, min: 1, max: 1 }],
    ore_seam:         [{ id: 'mineral_ore', w: 1, min: 1, max: 2 }, { id: 'silver_ore', chance: 0.25, min: 1, max: 1 }],
    forest_herbs:     [{ id: 'forest_herb', w: 8, min: 1, max: 2 }, { id: 'silverleaf', w: 3, min: 1, max: 1 }, { id: 'moonpetal', w: 1, min: 1, max: 1 }],
    meadow_herbs:     [{ id: 'silverleaf', w: 5, min: 1, max: 2 }, { id: 'forest_herb', w: 4, min: 1, max: 2 }, { id: 'moonpetal', w: 2, min: 1, max: 1 }],
    mountain_herbs:   [{ id: 'frostmoss', w: 7, min: 1, max: 2 }, { id: 'forest_herb', w: 3, min: 1, max: 1 }, { id: 'silverleaf', w: 1, min: 1, max: 1 }],
    desert_herbs:     [{ id: 'emberroot', w: 7, min: 1, max: 2 }, { id: 'forest_herb', w: 2, min: 1, max: 1 }],
    forest_mushrooms: [{ id: 'mushroom_spore', w: 6, min: 1, max: 2 }, { id: 'bitter_bolete', w: 4, min: 1, max: 1 }, { id: 'glowcap', w: 1, min: 1, max: 1 }],
    cave_mushrooms:   [{ id: 'glowcap', w: 5, min: 1, max: 2 }, { id: 'mushroom_spore', w: 4, min: 1, max: 2 }],
    berries:          [{ id: 'wild_berries', w: 7, min: 2, max: 4 }, { id: 'honeyberry', w: 3, min: 1, max: 2 }],
    reeds:            [{ id: 'reed_fibre', w: 1, min: 2, max: 3 }],
    river_fish:       [{ id: 'river_trout', w: 8, min: 1, max: 1 }, { id: 'lake_perch', w: 2, min: 1, max: 1 }],
    lake_fish:        [{ id: 'lake_perch', w: 7, min: 1, max: 1 }, { id: 'river_trout', w: 2, min: 1, max: 1 }, { id: 'aether_carp', w: 1, min: 1, max: 1 }],
    cave_pool:        [{ id: 'cave_eel', w: 7, min: 1, max: 1 }, { id: 'aether_carp', w: 1, min: 1, max: 1 }],
    shallows:         [{ id: 'freshwater_mussel', w: 7, min: 1, max: 3 }, { id: 'reed_fibre', w: 2, min: 1, max: 2 }, { id: 'river_pearl', w: 1, min: 1, max: 1 }],
    ice_crystals:     [{ id: 'ice_crystal', w: 1, min: 1, max: 2 }, { id: 'heart_crystal', chance: 0.10, min: 1, max: 1 }],
    ember_crystals:   [{ id: 'ember_stone', w: 1, min: 1, max: 2 }, { id: 'heart_crystal', chance: 0.10, min: 1, max: 1 }],
    deep_crystals:    [{ id: 'ice_crystal', w: 1, min: 1, max: 1 }, { id: 'ember_stone', w: 1, min: 1, max: 1 }, { id: 'aether_shard', w: 1, min: 1, max: 1 },
                       { id: 'heart_crystal', chance: 0.15, min: 1, max: 1 }],
};

// Resolve a placed node def to its type, tool, pool and text.
export function resolveNode(def) {
    const type = NODE_TYPES[def.type] ?? NODE_TYPES.wood;
    return {
        type,
        tool:   'tool' in def ? def.tool : type.tool,
        pool:   def.resource ? [{ id: def.resource, w: 1, min: 1, max: 1 }] : YIELD_TABLES[def.yields ?? type.yields] ?? [],
        rolls:  def.resource ? 1 : type.rolls,
        text:   def.label ?? type.text,
    };
}

// Roll a node's harvest: returns [{ id, qty }] with one entry per item id.
export function rollHarvest(def, rng = Math.random) {
    const { pool, rolls } = resolveNode(def);
    const weighted = pool.filter(e => e.w);
    const total = weighted.reduce((s, e) => s + e.w, 0);
    const out = {};
    const give = e => { out[e.id] = (out[e.id] ?? 0) + e.min + Math.floor(rng() * (e.max - e.min + 1)); };
    for (let r = 0; r < rolls && total > 0; r++) {
        let pick = rng() * total;
        give(weighted.find(p => (pick -= p.w) < 0) ?? weighted[weighted.length - 1]);
    }
    for (const e of pool) if (e.chance && rng() < e.chance) give(e);
    return Object.entries(out).map(([id, qty]) => ({ id, qty }));
}
