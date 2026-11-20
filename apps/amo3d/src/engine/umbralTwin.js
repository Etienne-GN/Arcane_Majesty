// The umbral twin of an Eldoria region (docs/3d/NYTHORIA_PLAN.md): the planes "occupy the same space at different
// frequencies" (world_lore.md), so a Nythoria map keeps its Eldorian twin's land — heights, rivers, lakes, cliffs,
// ridges, paths — and changes what grows and stands on it: ash-grey ground, dead black trees, black still water under a
// lying mist, ruins of black stone, an eclipsed sun, ash in the air, crows. None of the twin's buildings, people,
// creatures, gates or links come across; a twin names nothing until the lore is checked (Phase 10).
export function umbralTwin(src, { id, name, ruins = 10, spires = 1, start = null } = {}) {
    return {
        id, name, plane: 'nythoria', twinOf: src.id,
        seed: (src.seed ?? 7) + 1000, half: src.half, water: src.water, terrain: src.terrain, features: src.features,
        path: src.path, branches: src.branches, roads: [],
        biome: 'umbral', rocks: Math.round((src.rocks ?? 60) * 1.4),
        palette: { grassA: '#373a35', grassB: '#4a4c47', dirt: '#3a342f', rock: '#46444b', road: '#4c4844', paved: '#56535b', shore: '#2c2a2e', water: '#0a0b10', stone: '#3c3a42', undergrowth: '#283024' },
        tints: [], waterLook: { opacity: 0.94, roughness: 0.04, metalness: 0.6 },
        mood: { plane: 'nythoria', fog: '#474853', fogNear: 20, fogFar: 150, fogMix: 0.85, light: 0.85, nightFloor: 0.55, mist: true, crows: 14, motes: '#9a7aff' },
        trees: { count: Math.round((src.trees?.count ?? 500) * 0.5), kinds: { dead: 1 }, gaps: src.trees?.gaps ?? 0.42, sizeVar: 0.9, trunk: { dead: '#17151a' } },
        undergrowth: 0.45,
        ruinsAuto: { walls: ruins, columns: Math.round(ruins * 0.6), arches: Math.max(1, Math.round(ruins / 4)), spires },
        start: start ?? src.start, gather: {}, actors: [], links: [], gates: [], people: [], buildings: [], signs: [], doors: [], props: [], landmarks: [],
    };
}
