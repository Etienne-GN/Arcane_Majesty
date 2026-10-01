// Creature families and their elemental affinities. `resist` multiplies spell
// damage of that element (0.25 = shrugs it off, 1.5 = weak to it); `immune`
// lists statuses that cannot be applied. Pure — tools/test_combat_depth.mjs.

export const FAMILIES = {
    fire:      { label: 'Fire-born', resist: { fire: 0.25, water: 1.5, ice: 1.5 },   immune: ['burning'] },
    ice:       { label: 'Frost-born', resist: { ice: 0.25, fire: 1.5 },              immune: ['cold', 'frozen'] },
    void:      { label: 'Void-touched', resist: { shadow: 0.5, arcane: 1.4 },        immune: [] },
    undead:    { label: 'Undead',    resist: { fire: 1.3, arcane: 1.3 },             immune: ['poison'] },
    plant:     { label: 'Plant / fungus', resist: { fire: 1.5, earth: 0.5, nature: 0.5 }, immune: [] },
    construct: { label: 'Construct', resist: { lightning: 1.3 },                      immune: ['poison'] },
    aquatic:   { label: 'Aquatic',   resist: { water: 0.5, lightning: 1.4 },          immune: [] },
};

export const ENEMY_FAMILY = {
    ember_imp: 'fire', lava_elemental: 'fire', ash_crawler: 'fire', forge_daemon: 'fire',
    cinder_hawk: 'fire', fire_lizard: 'fire', ember_lizard: 'fire',
    frost_bear: 'ice', ice_revenant: 'ice', blizzard_sprite: 'ice', wendigo: 'ice',
    glacier_crab: 'ice', frost_shade: 'ice', polar_bear: 'ice',
    void_stalker: 'void', void_spawn: 'void', void_crawler: 'void', void_fox: 'void',
    shadow_sprite: 'void', soul_eater: 'void', rift_walker: 'void', mirror_shade: 'void', void_general: 'void',
    skeleton_archer: 'undead', grave_wraith: 'undead', cursed_knight: 'undead',
    treant: 'plant', vine_horror: 'plant', mushroom_shaman: 'plant', mushroom_walker: 'plant', amanita_walker: 'plant',
    stone_golem: 'construct', crystal_golem: 'construct', runic_turret: 'construct', arcane_sentinel: 'construct',
    shark: 'aquatic', bog_lurker: 'aquatic', giant_frog: 'aquatic', rot_frog: 'aquatic', rot_toad: 'aquatic',
};

export function affinityOf(type) {
    const family = ENEMY_FAMILY[type] ?? null;
    const f = family ? FAMILIES[family] : null;
    return { family, resist: { ...(f?.resist ?? {}) }, immune: [...(f?.immune ?? [])] };
}

export function affinityMult(type, element) {
    if (!element) return 1;
    return FAMILIES[ENEMY_FAMILY[type]]?.resist?.[element] ?? 1;
}
