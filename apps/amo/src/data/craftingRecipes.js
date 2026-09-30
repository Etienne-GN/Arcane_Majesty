// Gear crafting recipes — ingredients → output equipment
// Each ingredient: { id, qty }
// category: 'weapon' | 'armor' | 'accessory' | 'tool'

export const CRAFTING_RECIPES = [
    // ── Accessories ───────────────────────────────────────────────────────────
    {
        id: 'bone_ring',
        output: 'bone_ring',
        category: 'accessory',
        label: 'Bone Ring',
        tier: 1,
        ingredients: [
            { id: 'boar_tusk',   qty: 1 },
            { id: 'rabbit_foot', qty: 2 },
        ],
    },
    {
        id: 'void_pendant',
        output: 'void_pendant',
        category: 'accessory',
        label: 'Void Pendant',
        tier: 3,
        ingredients: [
            { id: 'void_shard',    qty: 4 },
            { id: 'ancient_scroll', qty: 1 },
        ],
    },

    // ── Armor ────────────────────────────────────────────────────────────────
    {
        id: 'hunters_cloak',
        output: 'hunters_cloak',
        category: 'armor',
        label: "Hunter's Cloak",
        tier: 2,
        ingredients: [
            { id: 'wolf_pelt',  qty: 2 },
            { id: 'deer_hide',  qty: 2 },
        ],
    },
    {
        id: 'corrupted_hide_armor',
        output: 'corrupted_hide_armor',
        category: 'armor',
        label: 'Corrupted Hide Armor',
        tier: 3,
        ingredients: [
            { id: 'deer_hide',  qty: 3 },
            { id: 'void_shard', qty: 3 },
        ],
    },

    // ── Weapons ───────────────────────────────────────────────────────────────
    {
        id: 'tusk_blade',
        output: 'tusk_blade',
        category: 'weapon',
        label: 'Tusk Blade',
        tier: 2,
        ingredients: [
            { id: 'boar_tusk',    qty: 2 },
            { id: 'mineral_ore',  qty: 2 },
        ],
    },
    {
        id: 'void_fang',
        output: 'void_fang',
        category: 'weapon',
        label: 'Void Fang',
        tier: 3,
        ingredients: [
            { id: 'boar_tusk',  qty: 1 },
            { id: 'void_shard', qty: 4 },
            { id: 'wolf_pelt',  qty: 1 },
        ],
    },
    { id: 'longsword', output: 'longsword', category: 'weapon', label: 'Longsword', tier: 1, ingredients: [{ id: 'mineral_ore', qty: 3 }, { id: 'wood', qty: 1 }] },
    { id: 'katana', output: 'katana', category: 'weapon', label: 'Katana', tier: 2, ingredients: [{ id: 'mineral_ore', qty: 3 }, { id: 'silver_ore', qty: 1 }, { id: 'resin', qty: 1 }] },
    { id: 'verdant_focus', output: 'verdant_focus', category: 'weapon', label: 'Verdant Focus', tier: 3, ingredients: [{ id: 'heartwood', qty: 2 }, { id: 'silverleaf', qty: 3 }, { id: 'aether_shard', qty: 1 }] },
    { id: 'crystalline_rod', output: 'crystalline_rod', category: 'weapon', label: 'Crystalline Rod', tier: 3, ingredients: [{ id: 'heartwood', qty: 1 }, { id: 'ice_crystal', qty: 3 }, { id: 'glowcap', qty: 2 }] },
    { id: 'resonant_edge', output: 'resonant_edge', category: 'weapon', label: 'Resonant Edge', tier: 3, ingredients: [{ id: 'silver_ore', qty: 3 }, { id: 'mineral_ore', qty: 2 }, { id: 'aether_shard', qty: 1 }] },
    { id: 'voidwhisper_dagger', output: 'voidwhisper_dagger', category: 'weapon', label: 'Voidwhisper Dagger', tier: 3, ingredients: [{ id: 'void_shard', qty: 3 }, { id: 'silver_ore', qty: 1 }, { id: 'venom_sac', qty: 2 }] },
    { id: 'aether_strung_bow', output: 'aether_strung_bow', category: 'weapon', label: 'Aether-Strung Bow', tier: 3, ingredients: [{ id: 'heartwood', qty: 2 }, { id: 'reed_fibre', qty: 3 }, { id: 'aether_shard', qty: 1 }] },
    { id: 'spirit_bow', output: 'spirit_bow', category: 'weapon', label: 'Spirit Bow', tier: 3, ingredients: [{ id: 'heartwood', qty: 2 }, { id: 'spectral_dust', qty: 3 }, { id: 'resin', qty: 1 }] },
    { id: 'void_channel', output: 'void_channel', category: 'weapon', label: 'Void Channel', tier: 4, ingredients: [{ id: 'heartwood', qty: 2 }, { id: 'void_shard', qty: 4 }, { id: 'corrupted_essence', qty: 2 }, { id: 'heart_crystal', qty: 1 }] },
    { id: 'arcane_sceptre', output: 'arcane_sceptre', category: 'weapon', label: 'Arcane Sceptre', tier: 4, ingredients: [{ id: 'silver_ore', qty: 3 }, { id: 'ember_stone', qty: 3 }, { id: 'aether_shard', qty: 2 }, { id: 'heart_crystal', qty: 1 }] },
    { id: 'void_slicer', output: 'void_slicer', category: 'weapon', label: 'Void Slicer', tier: 4, ingredients: [{ id: 'silver_ore', qty: 3 }, { id: 'void_shard', qty: 4 }, { id: 'corrupted_essence', qty: 2 }] },
    { id: 'arcane_war_blade', output: 'arcane_war_blade', category: 'weapon', label: 'Arcane War Blade', tier: 4, ingredients: [{ id: 'silver_ore', qty: 4 }, { id: 'ember_stone', qty: 3 }, { id: 'aether_shard', qty: 2 }] },
    { id: 'midnight_reaver', output: 'midnight_reaver', category: 'weapon', label: 'Midnight Reaver', tier: 4, ingredients: [{ id: 'silver_ore', qty: 2 }, { id: 'venom_sac', qty: 3 }, { id: 'corrupted_essence', qty: 1 }, { id: 'heart_crystal', qty: 1 }] },
    { id: 'ecliptic_stiletto', output: 'ecliptic_stiletto', category: 'weapon', label: 'Ecliptic Stiletto', tier: 4, ingredients: [{ id: 'silver_ore', qty: 2 }, { id: 'void_shard', qty: 3 }, { id: 'river_pearl', qty: 1 }, { id: 'aether_shard', qty: 1 }] },
    { id: 'celestial_arc', output: 'celestial_arc', category: 'weapon', label: 'Celestial Arc', tier: 4, ingredients: [{ id: 'heartwood', qty: 3 }, { id: 'moonpetal', qty: 3 }, { id: 'river_pearl', qty: 1 }, { id: 'aether_shard', qty: 2 }] },
    { id: 'tempest_bow', output: 'tempest_bow', category: 'weapon', label: 'Tempest Bow', tier: 4, ingredients: [{ id: 'heartwood', qty: 3 }, { id: 'reed_fibre', qty: 4 }, { id: 'void_shard', qty: 3 }, { id: 'heart_crystal', qty: 1 }] },

    // ── Armor ────────────────────────────────────────────────────────────────
    { id: 'fishers_hat', output: 'fishers_hat', category: 'armor', label: "Fisher's Hat", tier: 1, ingredients: [{ id: 'reed_fibre', qty: 3 }] },
    { id: 'bone_helm', output: 'bone_helm', category: 'armor', label: 'Bone Helm', tier: 2, ingredients: [{ id: 'bone_fragment', qty: 4 }, { id: 'wolf_pelt', qty: 1 }] },
    { id: 'frostweave_hood', output: 'frostweave_hood', category: 'armor', label: 'Frostweave Hood', tier: 2, ingredients: [{ id: 'frostmoss', qty: 3 }, { id: 'deer_hide', qty: 1 }, { id: 'reed_fibre', qty: 2 }] },
    { id: 'violet_silk_robes', output: 'violet_silk_robes', category: 'armor', label: 'Violet Silk Robes', tier: 2, ingredients: [{ id: 'reed_fibre', qty: 4 }, { id: 'moonpetal', qty: 2 }, { id: 'spectral_dust', qty: 1 }] },
    { id: 'tidecaller_robe', output: 'tidecaller_robe', category: 'armor', label: 'Tidecaller Robe', tier: 3, ingredients: [{ id: 'reed_fibre', qty: 4 }, { id: 'moonpetal', qty: 2 }, { id: 'river_pearl', qty: 1 }, { id: 'deer_hide', qty: 1 }] },

    // ── Accessories ──────────────────────────────────────────────────────────
    { id: 'silver_ring', output: 'silver_ring', category: 'accessory', label: 'Silver Ring', tier: 2, ingredients: [{ id: 'silver_ore', qty: 2 }, { id: 'mineral_ore', qty: 1 }] },
    { id: 'ember_amulet', output: 'ember_amulet', category: 'accessory', label: 'Ember Amulet', tier: 2, ingredients: [{ id: 'ember_stone', qty: 2 }, { id: 'silver_ore', qty: 1 }] },
    { id: 'resonance_amulet', output: 'resonance_amulet', category: 'accessory', label: 'Resonance Amulet', tier: 2, ingredients: [{ id: 'silver_ore', qty: 1 }, { id: 'spectral_dust', qty: 2 }, { id: 'moonpetal', qty: 1 }] },
    { id: 'heartwood_bracer', output: 'heartwood_bracer', category: 'accessory', label: 'Heartwood Bracer', tier: 3, ingredients: [{ id: 'heartwood', qty: 2 }, { id: 'resin', qty: 2 }, { id: 'deer_hide', qty: 1 }] },
    { id: 'pearl_pendant', output: 'pearl_pendant', category: 'accessory', label: 'Pearl Pendant', tier: 3, ingredients: [{ id: 'river_pearl', qty: 2 }, { id: 'silver_ore', qty: 2 }] },

    // ── Tools & bags ─────────────────────────────────────────────────────────
    { id: 'fishing_rod', output: 'fishing_rod', category: 'tool', label: 'Fishing Rod', tier: 1, ingredients: [{ id: 'wood', qty: 2 }, { id: 'reed_fibre', qty: 2 }] },
    { id: 'sickle', output: 'sickle', category: 'tool', label: 'Sickle', tier: 1, ingredients: [{ id: 'mineral_ore', qty: 2 }, { id: 'wood', qty: 1 }] },
    { id: 'iron_axe', output: 'iron_axe', category: 'tool', label: 'Iron Axe', tier: 1, ingredients: [{ id: 'mineral_ore', qty: 2 }, { id: 'wood', qty: 2 }] },
    { id: 'iron_pickaxe', output: 'iron_pickaxe', category: 'tool', label: 'Iron Pickaxe', tier: 1, ingredients: [{ id: 'mineral_ore', qty: 3 }, { id: 'wood', qty: 1 }] },
    { id: 'runic_satchel', output: 'runic_satchel', category: 'tool', label: 'Runic Satchel', tier: 3, ingredients: [{ id: 'deer_hide', qty: 3 }, { id: 'reed_fibre', qty: 4 }, { id: 'spectral_dust', qty: 2 }] },
];

// Enchanting at the forge: binds an enchantment (ENCHANTS in items.js) to the
// equipped weapon, replacing any enchantment it had. Stored per weapon id in
// playerStats.weaponEnchants.
export const ENCHANT_RECIPES = [
    { enchant: 'resonant',     tier: 3, ingredients: [{ id: 'aether_shard', qty: 1 }, { id: 'spectral_dust', qty: 2 }] },
    { enchant: 'arcane_surge', tier: 2, ingredients: [{ id: 'glowcap', qty: 3 }, { id: 'spectral_dust', qty: 1 }] },
    { enchant: 'flame_kissed', tier: 2, ingredients: [{ id: 'ember_stone', qty: 3 }, { id: 'resin', qty: 1 }] },
    { enchant: 'vampiric',     tier: 3, ingredients: [{ id: 'venom_sac', qty: 2 }, { id: 'corrupted_essence', qty: 1 }, { id: 'bone_fragment', qty: 2 }] },
    { enchant: 'swiftness',    tier: 2, ingredients: [{ id: 'rabbit_foot', qty: 2 }, { id: 'reed_fibre', qty: 2 }] },
    { enchant: 'void_touched', tier: 3, ingredients: [{ id: 'void_shard', qty: 3 }, { id: 'corrupted_essence', qty: 1 }] },
    { enchant: 'frostbitten',  tier: 2, ingredients: [{ id: 'ice_crystal', qty: 2 }, { id: 'frostmoss', qty: 2 }] },
    { enchant: 'scorching',    tier: 2, ingredients: [{ id: 'ember_stone', qty: 2 }, { id: 'emberroot', qty: 2 }] },
    { enchant: 'tidal',        tier: 2, ingredients: [{ id: 'river_pearl', qty: 1 }, { id: 'reed_fibre', qty: 2 }] },
    { enchant: 'stormcall',    tier: 3, ingredients: [{ id: 'silver_ore', qty: 1 }, { id: 'spectral_dust', qty: 2 }, { id: 'river_pearl', qty: 1 }] },
    { enchant: 'tempest',      tier: 3, ingredients: [{ id: 'aether_shard', qty: 1 }, { id: 'silver_ore', qty: 2 }] },
    { enchant: 'venomous',     tier: 2, ingredients: [{ id: 'venom_sac', qty: 3 }, { id: 'bitter_bolete', qty: 1 }] },
    { enchant: 'keen',         tier: 2, ingredients: [{ id: 'silver_ore', qty: 2 }, { id: 'resin', qty: 1 }] },
    { enchant: 'lifebloom',    tier: 3, ingredients: [{ id: 'silverleaf', qty: 3 }, { id: 'heart_crystal', qty: 1 }] },
    { enchant: 'hunters_bane', tier: 1, ingredients: [{ id: 'wolf_pelt', qty: 1 }, { id: 'boar_tusk', qty: 2 }] },
    { enchant: 'radiant',      tier: 3, ingredients: [{ id: 'moonpetal', qty: 2 }, { id: 'silver_ore', qty: 2 }] },
    { enchant: 'silvered',     tier: 2, ingredients: [{ id: 'silver_ore', qty: 3 }] },
];

export const CATEGORY_LABELS = {
    weapon:    'WEAPONS',
    armor:     'ARMOR',
    accessory: 'ACCESSORIES',
    tool:      'TOOLS & BAGS',
    enchant:   'ENCHANT EQUIPPED WEAPON',
};

export const TIER_COLORS = {
    1: 0x888888,
    2: 0x44aaff,
    3: 0xaa44ff,
    4: 0xffaa00,
    5: 0xffd700,
};
