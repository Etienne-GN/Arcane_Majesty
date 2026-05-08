// Gear crafting recipes — ingredients → output equipment
// Each ingredient: { id, qty }
// category: 'weapon' | 'armor' | 'accessory'

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
];

export const CATEGORY_LABELS = {
    weapon:    'WEAPONS',
    armor:     'ARMOR',
    accessory: 'ACCESSORIES',
};

export const TIER_COLORS = {
    1: 0x888888,
    2: 0x44aaff,
    3: 0xaa44ff,
    4: 0xffaa00,
    5: 0xffd700,
};
