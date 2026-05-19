// Satchel tier progression (Weathered Pouch → Void-Fold)
export const SATCHEL_TIERS = [
    { tier: 1, name: 'Weathered Pouch',    slots: 10 },
    { tier: 2, name: 'Expanded Haversack', slots: 20 },
    { tier: 3, name: 'Runic Satchel',      slots: 35 },
    { tier: 4, name: 'Void-Fold',          slots: 60 },
];

// Enchantment types (pre-rolled on T3+ weapons)
export const ENCHANTS = {
    resonant:     { id: 'resonant',     name: 'Resonant',     description: 'Physical hits reduce active spell cooldowns by 300ms.',   color: 0x44aaff },
    arcane_surge: { id: 'arcane_surge', name: 'Arcane Surge', description: '10% chance on hit to restore 3 MP.',                     color: 0xcc88ff },
    flame_kissed: { id: 'flame_kissed', name: 'Flame-Kissed', description: 'Hits deal bonus fire damage equal to STR × 0.6.',         color: 0xff6600 },
    vampiric:     { id: 'vampiric',     name: 'Vampiric',     description: 'Steal 15% of damage dealt as HP.',                       color: 0xcc0044 },
    swiftness:    { id: 'swiftness',    name: 'Swiftness',    description: 'Attack cooldown reduced by 15%.',                        color: 0x88ffcc },
    void_touched: { id: 'void_touched', name: 'Void-Touched', description: '+40% damage vs shadow and void enemies.',                color: 0x6600cc },
};

// Merchant catalog — T1-T2 weapons + consumables + tools + armor
// goldPrice: mundane/physical coin — cheaper for rural goods, pricier for arcane items
// price (glint): arcane energy token — cheaper for magical gear, pricier for mundane staples
export const MERCHANT_CATALOG = [
    { id: 'empty_bottle',         price: 5,   goldPrice: 4   },
    { id: 'health_potion',        price: 25,  goldPrice: 18  },  // rural staple — gold cheap
    { id: 'mana_potion',          price: 20,  goldPrice: 30  },  // arcane brew — gold expensive
    { id: 'forest_herb',          price: 12,  goldPrice: 7   },  // forest product — gold very cheap
    { id: 'iron_axe',             price: 45,  goldPrice: 32  },  // mundane tool — gold cheap
    { id: 'iron_pickaxe',         price: 50,  goldPrice: 36  },  // mundane tool — gold cheap
    { id: 'scholars_cowl',        price: 60,  goldPrice: 85  },  // arcane gear — gold expensive
    { id: 'scholars_tunic',       price: 70,  goldPrice: 98  },  // arcane gear — gold expensive
    { id: 'iron_ring',            price: 40,  goldPrice: 30  },
    { id: 'expanded_haversack',   price: 120, goldPrice: 90  },  // mundane bag — gold cheap
    { id: 'tent',                 price: 120, goldPrice: 85  },  // camp gear — gold cheap
    // T1 weapons
    { id: 'novice_staff',         price: 80,  goldPrice: 115 },  // arcane — gold expensive
    { id: 'weathered_sage_staff', price: 65,  goldPrice: 92  },
    { id: 'iron_spell_blade',     price: 70,  goldPrice: 95  },
    { id: 'etched_shortsword',    price: 60,  goldPrice: 44  },  // mundane sword — gold cheap
    { id: 'crude_dagger',         price: 55,  goldPrice: 38  },
    { id: 'shadow_shiv',          price: 55,  goldPrice: 78  },  // shadow-touched — gold expensive
    { id: 'carved_shortbow',      price: 75,  goldPrice: 58  },
    { id: 'hunters_shortbow',     price: 70,  goldPrice: 52  },  // practical bow — gold cheap
    // T2 weapons
    { id: 'adepts_spire',         price: 200, goldPrice: 290 },
    { id: 'mossy_branch_staff',   price: 175, goldPrice: 250 },
    { id: 'spell_blade',          price: 180, goldPrice: 260 },
    { id: 'arcane_saber',         price: 165, goldPrice: 235 },
    { id: 'umbral_dagger',        price: 160, goldPrice: 230 },
    { id: 'phantom_blade',        price: 155, goldPrice: 218 },
    { id: 'resonance_bow',        price: 200, goldPrice: 280 },
    { id: 'forest_longbow',       price: 185, goldPrice: 140 },  // forest longbow — gold cheap
];

export const ITEMS = {
    // ── Consumables ──────────────────────────────────────────────────────────
    health_potion: {
        id: 'health_potion', name: 'Health Potion',
        description: 'Restores 30 HP.',
        color: 0xcc2222, icon: 'itm_hp_potion', stackable: true, buyPrice: 25, sellPrice: 8,
        onUse: (stats) => { stats.health = Math.min(stats.health + 30, stats.maxHealth); return true; }
    },
    mana_potion: {
        id: 'mana_potion', name: 'Mana Potion',
        description: 'Restores 25 MP instantly and accelerates mana regen for 8s.',
        color: 0x2244cc, icon: 'itm_mana_potion', stackable: true, buyPrice: 20, sellPrice: 6,
        onUse: (stats) => {
            stats.mana = Math.min(stats.mana + 25, stats.maxMana);
            stats._manaRegenBoost = (stats._manaRegenBoost ?? 0) + 8000;
            return true;
        }
    },
    ancient_scroll: {
        id: 'ancient_scroll', name: 'Ancient Scroll',
        description: 'Arcane knowledge. Grants 50 XP and deepens arcane resonance.',
        color: 0xddaa00, icon: 'itm_scroll', stackable: false, buyPrice: 60, sellPrice: 20,
        onUse: (stats) => { stats.gainXp(50); stats.gainResonance('arcane', 4); return true; }
    },
    forest_herb: {
        id: 'forest_herb', name: 'Forest Herb',
        description: 'A healing herb. Restores 10 HP.',
        color: 0x33cc44, icon: 'itm_herb', stackable: true, buyPrice: 12, sellPrice: 4,
        onUse: (stats) => { stats.health = Math.min(stats.health + 10, stats.maxHealth); return true; }
    },
    heart_crystal: {
        id: 'heart_crystal', name: 'Heart Crystal',
        description: 'A Heartstone fragment. Restores 80 HP and increases max HP by 10.',
        color: 0xff4488, icon: 'itm_glowing_dust', stackable: false, buyPrice: 100, sellPrice: 35,
        onUse: (stats) => { stats.maxHealth += 10; stats.health = Math.min(stats.health + 80, stats.maxHealth); return true; }
    },
    eldritch_tome: {
        id: 'eldritch_tome', name: 'Eldritch Tome',
        description: 'Forbidden knowledge. Grants 150 XP, 1 skill point, and deep arcane resonance.',
        color: 0x8800ff, icon: 'itm_book', stackable: false, buyPrice: 150, sellPrice: 50,
        onUse: (stats) => { stats.gainXp(150); stats.skillPoints++; stats.gainResonance('arcane', 6); return true; }
    },
    tent: {
        id: 'tent', name: 'Traveler\'s Tent',
        description: 'A compact tent. Full rest: restores HP and MP to max, clears exhaustion, grants 50 bonus XP.',
        color: 0x886644, icon: 'itm_wooden_box', stackable: false, buyPrice: 120, sellPrice: 40,
        onUse: (stats) => {
            stats.health = stats.maxHealth;
            stats.mana   = stats.maxMana;
            stats.manaExhausted   = false;
            stats.manaCollapsed   = false;
            stats._exhaustionTimer = 0;
            stats.gainXp(50);
            return true;
        }
    },

    // ── Wildlife drops ────────────────────────────────────────────────────────
    boar_meat: {
        id: 'boar_meat', name: 'Boar Meat',
        description: 'Tough but filling. Restores 18 HP when consumed raw.',
        color: 0xcc6644, icon: 'itm_meat', stackable: true, buyPrice: 0, sellPrice: 8,
        onUse: (stats) => { stats.health = Math.min(stats.health + 18, stats.maxHealth); return true; }
    },
    deer_meat: {
        id: 'deer_meat', name: 'Venison',
        description: 'Lean game meat. Restores 14 HP.',
        color: 0xbb5533, icon: 'itm_meat', stackable: true, buyPrice: 0, sellPrice: 7,
        onUse: (stats) => { stats.health = Math.min(stats.health + 14, stats.maxHealth); return true; }
    },
    rabbit_meat: {
        id: 'rabbit_meat', name: 'Rabbit Meat',
        description: 'Small but tender. Restores 8 HP.',
        color: 0xddaa88, icon: 'itm_meat', stackable: true, buyPrice: 0, sellPrice: 4,
        onUse: (stats) => { stats.health = Math.min(stats.health + 8, stats.maxHealth); return true; }
    },
    boar_tusk: {
        id: 'boar_tusk', name: 'Boar Tusk',
        description: 'A dense ivory tusk. Valued by traders and craftsmen.',
        color: 0xeeddaa, icon: 'itm_feather', stackable: true, buyPrice: 0, sellPrice: 18,
        onUse: () => false,
    },
    deer_hide: {
        id: 'deer_hide', name: 'Deer Hide',
        description: 'Supple hide. Useful for leatherwork.',
        color: 0xaa8855, icon: 'itm_fur', stackable: true, buyPrice: 0, sellPrice: 12,
        onUse: () => false,
    },
    rabbit_foot: {
        id: 'rabbit_foot', name: "Rabbit's Foot",
        description: 'Supposedly lucky. Vendors pay well for them.',
        color: 0xbbbbaa, icon: 'itm_feather', stackable: true, buyPrice: 0, sellPrice: 10,
        onUse: () => false,
    },
    wolf_pelt: {
        id: 'wolf_pelt', name: 'Wolf Pelt',
        description: 'Thick winter fur. Fetches a good price.',
        color: 0x888888, icon: 'itm_fur', stackable: true, buyPrice: 0, sellPrice: 15,
        onUse: () => false,
    },
    void_shard: {
        id: 'void_shard', name: 'Void Shard',
        description: 'A fragment of corrupted essence torn from a creature. Pulses faintly.',
        color: 0x7700cc, icon: 'itm_glowing_dust', stackable: true, buyPrice: 0, sellPrice: 22,
        onUse: () => false,
    },

    // ── Cooked food ───────────────────────────────────────────────────────────
    roasted_boar: {
        id: 'roasted_boar', name: 'Roasted Boar',
        description: 'Slow-cooked over an open flame. Restores 40 HP and regenerates 5 HP/s for 10s.',
        color: 0xdd8844, icon: 'itm_meat', stackable: true, buyPrice: 0, sellPrice: 14,
        onUse: (stats) => {
            stats.health = Math.min(stats.health + 40, stats.maxHealth);
            stats._foodRegen = (stats._foodRegen ?? 0) + 50;
            return true;
        }
    },
    roasted_venison: {
        id: 'roasted_venison', name: 'Roasted Venison',
        description: 'Lean and flavourful. Restores 30 HP and regenerates 4 HP/s for 10s.',
        color: 0xcc7733, icon: 'itm_meat', stackable: true, buyPrice: 0, sellPrice: 11,
        onUse: (stats) => {
            stats.health = Math.min(stats.health + 30, stats.maxHealth);
            stats._foodRegen = (stats._foodRegen ?? 0) + 40;
            return true;
        }
    },
    roasted_rabbit: {
        id: 'roasted_rabbit', name: 'Roasted Rabbit',
        description: 'Small but nourishing. Restores 18 HP and regenerates 3 HP/s for 8s.',
        color: 0xddbb99, icon: 'itm_meat', stackable: true, buyPrice: 0, sellPrice: 7,
        onUse: (stats) => {
            stats.health = Math.min(stats.health + 18, stats.maxHealth);
            stats._foodRegen = (stats._foodRegen ?? 0) + 24;
            return true;
        }
    },
    hearty_stew: {
        id: 'hearty_stew', name: 'Hearty Stew',
        description: 'A thick hunter\'s stew. Restores 60 HP, full mana regen, and +10 max HP for this session.',
        color: 0xcc5522, icon: 'itm_sandwich', stackable: true, buyPrice: 0, sellPrice: 20,
        onUse: (stats) => {
            stats.maxHealth += 10;
            stats.health = Math.min(stats.health + 60, stats.maxHealth);
            stats.mana   = Math.min(stats.mana + 20, stats.maxMana);
            stats._foodRegen = (stats._foodRegen ?? 0) + 60;
            return true;
        }
    },

    // ── Craftable potions ─────────────────────────────────────────────────────
    empty_bottle: {
        id: 'empty_bottle', name: 'Empty Bottle',
        description: 'A clean glass vial. Required for brewing potions at a campfire.',
        color: 0xaaddff, stackable: true, buyPrice: 5, sellPrice: 1, onUse: () => false,
    },
    greater_health_potion: {
        id: 'greater_health_potion', name: 'Greater Health Potion',
        description: 'A concentrated herbal tincture. Restores 60 HP.',
        color: 0xff2222, icon: 'itm_hp_potion', stackable: true, buyPrice: 0, sellPrice: 18,
        onUse: (stats) => { stats.health = Math.min(stats.health + 60, stats.maxHealth); return true; }
    },
    antidote: {
        id: 'antidote', name: 'Antidote',
        description: 'Neutralises poison. Clears the Poisoned status and restores 5 HP.',
        color: 0x88ff44, icon: 'itm_herb', stackable: true, buyPrice: 0, sellPrice: 12,
        onUse: (stats) => { stats._clearStatus?.('poison'); stats.health = Math.min(stats.health + 5, stats.maxHealth); return true; }
    },
    void_tonic: {
        id: 'void_tonic', name: 'Void Tonic',
        description: 'Crystallised void energy dissolved in spectral dust. Restores 45 MP and triples mana regen for 12s.',
        color: 0xaa00ff, icon: 'itm_mana_potion', stackable: true, buyPrice: 0, sellPrice: 22,
        onUse: (stats) => { stats.mana = Math.min(stats.mana + 45, stats.maxMana); stats._manaRegenBoost = (stats._manaRegenBoost ?? 0) + 12000; return true; }
    },
    blessing_draught: {
        id: 'blessing_draught', name: 'Blessing Draught',
        description: "Brewed from lucky charms and spectral essence. Applies Blessed for 30s (+10% all stats).",
        color: 0xffee44, icon: 'itm_hp_potion', stackable: true, buyPrice: 0, sellPrice: 20,
        onUse: (stats) => { stats._applyStatus?.('blessed', { duration: 30000 }); return true; }
    },
    frost_vial: {
        id: 'frost_vial', name: 'Frost Vial',
        description: 'A cooling draught of condensed tundra ice. Restores 20 HP and regenerates 24 HP over 8s.',
        color: 0x88ddff, icon: 'itm_mana_potion', stackable: true, buyPrice: 0, sellPrice: 14,
        onUse: (stats) => { stats.health = Math.min(stats.health + 20, stats.maxHealth); stats._foodRegen = (stats._foodRegen ?? 0) + 24; return true; }
    },
    ember_tonic: {
        id: 'ember_tonic', name: 'Ember Tonic',
        description: 'Volcanic stone dissolved into a burning brew. Restores 35 HP instantly.',
        color: 0xff6622, icon: 'itm_hp_potion', stackable: true, buyPrice: 0, sellPrice: 16,
        onUse: (stats) => { stats.health = Math.min(stats.health + 35, stats.maxHealth); return true; }
    },

    // ── Regional materials ────────────────────────────────────────────────────
    bone_fragment: {
        id: 'bone_fragment', name: 'Bone Fragment',
        description: 'Cracked bone from a skeleton. Useful for crafting.',
        color: 0xeeddcc, icon: 'itm_stone', stackable: true, buyPrice: 0, sellPrice: 6, onUse: () => false,
    },
    venom_sac: {
        id: 'venom_sac', name: 'Venom Sac',
        description: 'A swollen sac of concentrated poison. Handle carefully.',
        color: 0x66cc22, stackable: true, buyPrice: 0, sellPrice: 12, onUse: () => false,
    },
    ember_stone: {
        id: 'ember_stone', name: 'Ember Stone',
        description: 'A stone infused with volcanic heat. Warm to the touch.',
        color: 0xff6622, icon: 'itm_glowing_dust', stackable: true, buyPrice: 0, sellPrice: 15, onUse: () => false,
    },
    ice_crystal: {
        id: 'ice_crystal', name: 'Ice Crystal',
        description: 'A shard of enchanted tundra ice that never melts.',
        color: 0x88ddff, icon: 'itm_glowing_dust', stackable: true, buyPrice: 0, sellPrice: 15, onUse: () => false,
    },
    spectral_dust: {
        id: 'spectral_dust', name: 'Spectral Dust',
        description: 'The residue of a dissolved spirit. Shimmers faintly.',
        color: 0xaaaaff, icon: 'itm_glowing_dust', stackable: true, buyPrice: 0, sellPrice: 18, onUse: () => false,
    },
    mushroom_spore: {
        id: 'mushroom_spore', name: 'Mushroom Spore',
        description: 'Dense spores from deep-cave fungi. Mildly toxic.',
        color: 0xaa8833, icon: 'itm_mushroom', stackable: true, buyPrice: 0, sellPrice: 8, onUse: () => false,
    },
    corrupted_essence: {
        id: 'corrupted_essence', name: 'Corrupted Essence',
        description: 'Concentrated void energy. Pulsates with unstable power.',
        color: 0xcc00ff, icon: 'itm_glowing_dust', stackable: true, buyPrice: 0, sellPrice: 30, onUse: () => false,
    },

    // ── Gathering tools ───────────────────────────────────────────────────────
    iron_axe: {
        id: 'iron_axe', name: 'Iron Axe',
        description: 'Required to gather Wood nodes.',
        color: 0x888888, icon: 'itm_scythe', stackable: false, buyPrice: 45, sellPrice: 15,
        onUse: () => false,
    },
    iron_pickaxe: {
        id: 'iron_pickaxe', name: 'Iron Pickaxe',
        description: 'Required to gather Mineral Ore nodes.',
        color: 0x777788, icon: 'itm_pickaxe', stackable: false, buyPrice: 50, sellPrice: 17,
        onUse: () => false,
    },

    // ── Gathered resources ────────────────────────────────────────────────────
    wood: {
        id: 'wood', name: 'Wood',
        description: 'Gathered timber. Used in campfire construction and basic crafting.',
        color: 0x8b5e3c, icon: 'itm_log', stackable: true, sellPrice: 4, onUse: () => false,
    },
    mineral_ore: {
        id: 'mineral_ore', name: 'Mineral Ore',
        description: 'Raw ore from a mineral vein. Can be smelted or traded for Glint.',
        color: 0x8888aa, icon: 'itm_iron_ore', stackable: true, sellPrice: 8, onUse: () => false,
    },

    // ── Satchel upgrades ─────────────────────────────────────────────────────
    expanded_haversack: {
        id: 'expanded_haversack', name: 'Expanded Haversack',
        description: 'Aether-Oak fiber reinforcement. Upgrades Satchel to Tier II (20 slots).',
        color: 0x886633, icon: 'itm_pouch', stackable: false, buyPrice: 120, sellPrice: 40,
        onUse: (stats) => { if (stats.satchelTier >= 2) return false; stats.satchelTier = 2; return true; }
    },
    runic_satchel: {
        id: 'runic_satchel', name: 'Runic Satchel',
        description: '"Weightless" runes stitched into the lining. Upgrades Satchel to Tier III (35 slots).',
        color: 0xaa55ff, icon: 'itm_pouch', stackable: false, buyPrice: 280, sellPrice: 90,
        onUse: (stats) => { if (stats.satchelTier >= 3) return false; stats.satchelTier = 3; return true; }
    },
    void_fold: {
        id: 'void_fold', name: 'Void-Fold Relic',
        description: 'Folds micro-rifts into your pouch. Upgrades Satchel to Tier IV (60 slots).',
        color: 0x220066, stackable: false, buyPrice: 600, sellPrice: 200,
        onUse: (stats) => { if (stats.satchelTier >= 4) return false; stats.satchelTier = 4; return true; }
    },

    // ── Crafted Equipment ────────────────────────────────────────────────────
    hunters_cloak: {
        id: 'hunters_cloak', name: "Hunter's Cloak",
        description: 'Stitched from wolf pelt and deer hide. Light but durable. +2 AGI, +1 STA.',
        color: 0x886644, icon: 'itm_leather_armor', stackable: false, slot: 'body', tier: 2, rarity: 'uncommon',
        stats: { agility: 2, stamina: 1 }, buyPrice: 0, sellPrice: 35,
        onUse: (stats) => stats.equipItem('hunters_cloak'),
    },
    corrupted_hide_armor: {
        id: 'corrupted_hide_armor', name: 'Corrupted Hide Armor',
        description: 'Void-tainted leather that hums with dark energy. +2 STR, +2 INT.',
        color: 0x440066, icon: 'itm_iron_armor', stackable: false, slot: 'body', tier: 3, rarity: 'rare',
        stats: { strength: 2, intelligence: 2 }, buyPrice: 0, sellPrice: 65,
        onUse: (stats) => stats.equipItem('corrupted_hide_armor'),
    },
    bone_ring: {
        id: 'bone_ring', name: 'Bone Ring',
        description: 'Carved from tusk and bone. Crude but effective. +1 STR, +1 AGI.',
        color: 0xeeddaa, icon: 'itm_ring_01', stackable: false, slot: 'accessory', tier: 1, rarity: 'common',
        stats: { strength: 1, agility: 1 }, buyPrice: 0, sellPrice: 18,
        onUse: (stats) => stats.equipItem('bone_ring'),
    },
    void_pendant: {
        id: 'void_pendant', name: 'Void Pendant',
        description: 'Crystallised corruption shaped into a focus. +3 INT. Deepens shadow resonance.',
        color: 0x7700cc, icon: 'itm_necklace_02', stackable: false, slot: 'accessory', tier: 3, rarity: 'rare',
        stats: { intelligence: 3 }, buyPrice: 0, sellPrice: 70,
        onUse: (stats) => { stats.gainResonance('shadow', 8); return stats.equipItem('void_pendant'); },
    },
    tusk_blade: {
        id: 'tusk_blade', name: 'Tusk Blade',
        description: 'A dagger ground from boar ivory and iron. Brutal at close range. +3 STR.',
        color: 0xddccaa, icon: 'itm_sword_01', stackable: false, icon: 'itm_sword_01', slot: 'weapon', tier: 2, weaponType: 'spell_blade', rarity: 'uncommon',
        stats: { strength: 3 }, buyPrice: 0, sellPrice: 40,
        onUse: (stats) => stats.equipItem('tusk_blade'),
    },
    void_fang: {
        id: 'void_fang', name: 'Void Fang',
        description: 'A corrupted blade that pulses with shadow energy. +2 STR, +3 INT.',
        color: 0x8800cc, icon: 'itm_sword_02', stackable: false, icon: 'itm_sword_02', slot: 'weapon', tier: 3, weaponType: 'spell_blade', rarity: 'rare',
        stats: { strength: 2, intelligence: 3 }, buyPrice: 0, sellPrice: 80,
        onUse: (stats) => stats.equipItem('void_fang'),
    },

    // ── Equipment — Body ─────────────────────────────────────────────────────
    scholars_tunic: {
        id: 'scholars_tunic', name: "Scholar's Tunic",
        description: 'Standard scholarly attire. +1 STA.',
        color: 0x334488, icon: 'itm_mantua', stackable: false, slot: 'body', tier: 1,
        stats: { stamina: 1 }, buyPrice: 70, sellPrice: 24,
        onUse: (stats) => stats.equipItem('scholars_tunic'),
    },
    violet_silk_robes: {
        id: 'violet_silk_robes', name: 'Violet Silk Robes',
        description: 'Conductive silk that enhances Aether flow. +2 INT, +2 STA.',
        color: 0x6622aa, icon: 'itm_mantua', stackable: false, slot: 'body', tier: 2,
        stats: { intelligence: 2, stamina: 2 }, buyPrice: 180, sellPrice: 60,
        onUse: (stats) => stats.equipItem('violet_silk_robes'),
    },

    // ── Equipment — Head ─────────────────────────────────────────────────────
    scholars_cowl: {
        id: 'scholars_cowl', name: "Scholar's Cowl",
        description: 'A simple hood. +1 INT.',
        color: 0x224466, icon: 'itm_headgear_01', stackable: false, slot: 'head', tier: 1,
        stats: { intelligence: 1 }, buyPrice: 60, sellPrice: 20,
        onUse: (stats) => stats.equipItem('scholars_cowl'),
    },

    // ── Equipment — Accessories ──────────────────────────────────────────────
    iron_ring: {
        id: 'iron_ring', name: 'Iron Ring',
        description: 'A plain iron ring. +1 STR.',
        color: 0x888888, icon: 'itm_ring_01', stackable: false, slot: 'accessory', tier: 1,
        stats: { strength: 1 }, buyPrice: 40, sellPrice: 14,
        onUse: (stats) => stats.equipItem('iron_ring'),
    },
    resonance_amulet: {
        id: 'resonance_amulet', name: 'Resonance Amulet',
        description: 'Hums faintly with Aether. +2 INT, +1 AGI.',
        color: 0xffaa44, icon: 'itm_necklace_01', stackable: false, slot: 'accessory', tier: 2,
        stats: { intelligence: 2, agility: 1 }, buyPrice: 150, sellPrice: 50,
        onUse: (stats) => stats.equipItem('resonance_amulet'),
    },

    // ══════════════════════════════════════════════════════════════════════════
    // WEAPONS — 40 total: 4 families × 5 tiers × 2 variants
    // T1 Common / T2 Uncommon — sold at merchant
    // T3 Rare / T4 Epic — found in chests and boss drops
    // T5 Legendary — hidden quest rewards only (no buyPrice)
    // Enchants pre-rolled on T3+ weapons
    // ══════════════════════════════════════════════════════════════════════════

    // ── STAFF — spell amplification, no mana cost on physical hits ────────────

    novice_staff: {
        id: 'novice_staff', name: 'Novice Staff',
        description: 'Oak wood. Basic arcane focus. +2 INT.',
        color: 0x9b6e4c, icon: 'itm_wand_01', stackable: false, slot: 'weapon', tier: 1, weaponType: 'staff', rarity: 'common',
        stats: { intelligence: 2 }, buyPrice: 80, sellPrice: 28,
        onUse: (stats) => stats.equipItem('novice_staff'),
    },
    weathered_sage_staff: {
        id: 'weathered_sage_staff', name: "Weathered Sage's Staff",
        description: 'Worn smooth by years of use. +1 INT, +1 STA.',
        color: 0x8a7060, icon: 'itm_wand_01', stackable: false, slot: 'weapon', tier: 1, weaponType: 'staff', rarity: 'common',
        stats: { intelligence: 1, stamina: 1 }, buyPrice: 65, sellPrice: 22,
        onUse: (stats) => stats.equipItem('weathered_sage_staff'),
    },
    adepts_spire: {
        id: 'adepts_spire', name: "Adept's Spire",
        description: 'Crystal-tipped. Faster spell structuring. +4 INT, +1 AGI.',
        color: 0x44aaff, stackable: false, icon: 'itm_wand_02', slot: 'weapon', tier: 2, weaponType: 'staff', rarity: 'uncommon',
        stats: { intelligence: 4, agility: 1 }, buyPrice: 200, sellPrice: 70,
        onUse: (stats) => stats.equipItem('adepts_spire'),
    },
    mossy_branch_staff: {
        id: 'mossy_branch_staff', name: 'Mossy Branch Staff',
        description: 'A living branch from an ancient tree. +3 INT, +1 STA.',
        color: 0x4a9944, stackable: false, icon: 'itm_wand_02', slot: 'weapon', tier: 2, weaponType: 'staff', rarity: 'uncommon',
        stats: { intelligence: 3, stamina: 1 }, buyPrice: 175, sellPrice: 60,
        onUse: (stats) => stats.equipItem('mossy_branch_staff'),
    },
    verdant_focus: {
        id: 'verdant_focus', name: 'Verdant Focus',
        description: 'Living crystal infused with nature-energy. +6 INT, +2 AGI. [Resonant]',
        color: 0x22ccff, stackable: false, icon: 'itm_wand_02', slot: 'weapon', tier: 3, weaponType: 'staff', rarity: 'rare',
        stats: { intelligence: 6, agility: 2 }, enchant: 'resonant', buyPrice: 380, sellPrice: 125,
        onUse: (stats) => stats.equipItem('verdant_focus'),
    },
    crystalline_rod: {
        id: 'crystalline_rod', name: 'Crystalline Rod',
        description: 'Aether-crystal rod that amplifies mana flow. +5 INT, +2 STA. [Arcane Surge]',
        color: 0x88ccff, stackable: false, icon: 'itm_wand_02', slot: 'weapon', tier: 3, weaponType: 'staff', rarity: 'rare',
        stats: { intelligence: 5, stamina: 2 }, enchant: 'arcane_surge', buyPrice: 360, sellPrice: 120,
        onUse: (stats) => stats.equipItem('crystalline_rod'),
    },
    void_channel: {
        id: 'void_channel', name: 'Void Channel',
        description: 'Channels void-energy into spells. +9 INT, +3 AGI. [Void-Touched] [Lore: 20% void pulse on hit]',
        color: 0x7733cc, stackable: false, icon: 'itm_wand_02', slot: 'weapon', tier: 4, weaponType: 'staff', rarity: 'epic',
        stats: { intelligence: 9, agility: 3 }, enchant: 'void_touched', loreAbility: 'chain_void',
        buyPrice: 750, sellPrice: 250,
        onUse: (stats) => stats.equipItem('void_channel'),
    },
    arcane_sceptre: {
        id: 'arcane_sceptre', name: 'Arcane Sceptre',
        description: 'Pure arcane authority. +8 INT, +3 STA. [Flame-Kissed] [Lore: 25% chain-lightning arc]',
        color: 0x9944ff, stackable: false, icon: 'itm_wand_02', slot: 'weapon', tier: 4, weaponType: 'staff', rarity: 'epic',
        stats: { intelligence: 8, stamina: 3 }, enchant: 'flame_kissed', loreAbility: 'chain_lightning',
        buyPrice: 720, sellPrice: 240,
        onUse: (stats) => stats.equipItem('arcane_sceptre'),
    },
    staff_of_first_covenant: {
        id: 'staff_of_first_covenant', name: 'Staff of the First Covenant',
        description: 'Forged at the founding of the Arcane Covenant. +12 INT, +4 AGI. [+25% all spell damage]',
        color: 0xffd700, stackable: false, icon: 'itm_wand_02', slot: 'weapon', tier: 5, weaponType: 'staff', rarity: 'legendary',
        stats: { intelligence: 12, agility: 4 }, passive: 'spell_amplifier', sellPrice: 999,
        onUse: (stats) => stats.equipItem('staff_of_first_covenant'),
    },
    heartwood_resonator: {
        id: 'heartwood_resonator', name: 'Heartwood Resonator',
        description: "Resonates with the forest's living heartbeat. +10 INT, +5 STA. [+50% mana regen]",
        color: 0xffd700, stackable: false, icon: 'itm_wand_02', slot: 'weapon', tier: 5, weaponType: 'staff', rarity: 'legendary',
        stats: { intelligence: 10, stamina: 5 }, passive: 'nature_bond', sellPrice: 999,
        onUse: (stats) => stats.equipItem('heartwood_resonator'),
    },

    // ── SPELL BLADE — 2 MP per hit, +35% arcane damage when augmented ─────────

    iron_spell_blade: {
        id: 'iron_spell_blade', name: 'Iron Spell-Blade',
        description: 'Iron blade with a mana crystal at the hilt. Hits cost 2 MP, deal +35% arcane. +2 STR, +1 INT.',
        color: 0x999999, stackable: false, icon: 'itm_sword_01', slot: 'weapon', tier: 1, weaponType: 'spell_blade', rarity: 'common',
        stats: { strength: 2, intelligence: 1 }, buyPrice: 70, sellPrice: 24,
        onUse: (stats) => stats.equipItem('iron_spell_blade'),
    },
    etched_shortsword: {
        id: 'etched_shortsword', name: 'Etched Shortsword',
        description: 'Simple blade etched with arcane runes. Hits cost 2 MP, deal +35% arcane. +1 STR, +2 INT.',
        color: 0x888888, stackable: false, icon: 'itm_sword_01', slot: 'weapon', tier: 1, weaponType: 'spell_blade', rarity: 'common',
        stats: { strength: 1, intelligence: 2 }, buyPrice: 60, sellPrice: 20,
        onUse: (stats) => stats.equipItem('etched_shortsword'),
    },
    spell_blade: {
        id: 'spell_blade', name: 'Spell-Blade',
        description: 'Arcane-forged short sword. Hits cost 2 MP, deal +35% arcane. +3 INT, +2 STR.',
        color: 0x44ccff, stackable: false, icon: 'itm_sword_01', slot: 'weapon', tier: 2, weaponType: 'spell_blade', rarity: 'uncommon',
        stats: { intelligence: 3, strength: 2 }, buyPrice: 180, sellPrice: 60,
        onUse: (stats) => stats.equipItem('spell_blade'),
    },
    arcane_saber: {
        id: 'arcane_saber', name: 'Arcane Saber',
        description: 'Longer blade for wider swings. Hits cost 2 MP, deal +35% arcane. +2 INT, +3 STR.',
        color: 0x55aadd, stackable: false, icon: 'itm_sword_01', slot: 'weapon', tier: 2, weaponType: 'spell_blade', rarity: 'uncommon',
        stats: { intelligence: 2, strength: 3 }, buyPrice: 165, sellPrice: 55,
        onUse: (stats) => stats.equipItem('arcane_saber'),
    },
    resonant_edge: {
        id: 'resonant_edge', name: 'Resonant Edge',
        description: 'Hums with resonant energy. Hits cost 2 MP, deal +35% arcane. +4 INT, +3 STR. [Resonant]',
        color: 0x33aaff, stackable: false, icon: 'itm_sword_02', slot: 'weapon', tier: 3, weaponType: 'spell_blade', rarity: 'rare',
        stats: { intelligence: 4, strength: 3 }, enchant: 'resonant', buyPrice: 370, sellPrice: 123,
        onUse: (stats) => stats.equipItem('resonant_edge'),
    },
    mana_etched_sword: {
        id: 'mana_etched_sword', name: 'Mana-Etched Sword',
        description: 'Runes cover every inch. Hits cost 2 MP, deal +35% arcane. +5 INT, +2 STR. [Arcane Surge]',
        color: 0x66ccff, stackable: false, icon: 'itm_sword_02', slot: 'weapon', tier: 3, weaponType: 'spell_blade', rarity: 'rare',
        stats: { intelligence: 5, strength: 2 }, enchant: 'arcane_surge', buyPrice: 390, sellPrice: 130,
        onUse: (stats) => stats.equipItem('mana_etched_sword'),
    },
    void_slicer: {
        id: 'void_slicer', name: 'Void-Slicer',
        description: 'A blade that cuts through reality. Hits cost 2 MP, +35% arcane. +7 INT, +5 STR. [Void-Touched] [Lore: 20% void stun]',
        color: 0x9944ff, stackable: false, icon: 'itm_sword_02', slot: 'weapon', tier: 4, weaponType: 'spell_blade', rarity: 'epic',
        stats: { intelligence: 7, strength: 5 }, enchant: 'void_touched', loreAbility: 'void_stun',
        buyPrice: 780, sellPrice: 260,
        onUse: (stats) => stats.equipItem('void_slicer'),
    },
    arcane_war_blade: {
        id: 'arcane_war_blade', name: 'Arcane War-Blade',
        description: 'Battle-tested arcane fury. Hits cost 2 MP, +35% arcane. +6 INT, +6 STR. [Flame-Kissed] [Lore: 20% arcane burst hits 2 more]',
        color: 0xcc66ff, stackable: false, icon: 'itm_sword_02', slot: 'weapon', tier: 4, weaponType: 'spell_blade', rarity: 'epic',
        stats: { intelligence: 6, strength: 6 }, enchant: 'flame_kissed', loreAbility: 'arcane_burst',
        buyPrice: 800, sellPrice: 267,
        onUse: (stats) => stats.equipItem('arcane_war_blade'),
    },
    blade_of_the_covenant: {
        id: 'blade_of_the_covenant', name: 'Blade of the Covenant',
        description: 'One of the original Covenant weapons. Hits cost 2 MP, deal +35% arcane. +9 INT, +7 STR. [Blade strikes grant 2 MP if INT > 12]',
        color: 0xffd700, stackable: false, icon: 'itm_sword_02', slot: 'weapon', tier: 5, weaponType: 'spell_blade', rarity: 'legendary',
        stats: { intelligence: 9, strength: 7 }, passive: 'mana_on_hit', sellPrice: 999,
        onUse: (stats) => stats.equipItem('blade_of_the_covenant'),
    },
    cleaver_of_vorgos: {
        id: 'cleaver_of_vorgos', name: 'Cleaver of Vorgos',
        description: "The warlord Vorgos's legendary blade. Hits cost 2 MP, deal +35% arcane. +12 STR, +4 INT. [3× damage vs enemies below 30% HP]",
        color: 0xffd700, stackable: false, icon: 'itm_sword_02', slot: 'weapon', tier: 5, weaponType: 'spell_blade', rarity: 'legendary',
        stats: { strength: 12, intelligence: 4 }, passive: 'execute_strike', sellPrice: 999,
        onUse: (stats) => stats.equipItem('cleaver_of_vorgos'),
    },

    // ── UMBRAL DAGGER — 1 MP per hit, fast double-hit when augmented ──────────

    crude_dagger: {
        id: 'crude_dagger', name: 'Crude Dagger',
        description: 'A simple, sharp blade. Augmented double-hit costs 1 MP. +2 AGI, +1 STR.',
        color: 0x999999, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 1, weaponType: 'umbral_dagger', rarity: 'common',
        stats: { agility: 2, strength: 1 }, buyPrice: 55, sellPrice: 18,
        onUse: (stats) => stats.equipItem('crude_dagger'),
    },
    shadow_shiv: {
        id: 'shadow_shiv', name: 'Shadow Shiv',
        description: 'Darkness-stained iron blade. Augmented double-hit costs 1 MP. +1 AGI, +2 STR.',
        color: 0x888888, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 1, weaponType: 'umbral_dagger', rarity: 'common',
        stats: { agility: 1, strength: 2 }, buyPrice: 55, sellPrice: 18,
        onUse: (stats) => stats.equipItem('shadow_shiv'),
    },
    umbral_dagger: {
        id: 'umbral_dagger', name: 'Umbral Dagger',
        description: 'Shadow-infused blade. Augmented double-hit costs 1 MP. +3 AGI, +1 STR.',
        color: 0x9933cc, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 2, weaponType: 'umbral_dagger', rarity: 'uncommon',
        stats: { agility: 3, strength: 1 }, buyPrice: 160, sellPrice: 55,
        onUse: (stats) => stats.equipItem('umbral_dagger'),
    },
    phantom_blade: {
        id: 'phantom_blade', name: 'Phantom Blade',
        description: 'Slightly translucent — strikes like a ghost. Augmented double-hit costs 1 MP. +2 AGI, +2 INT.',
        color: 0xaa55dd, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 2, weaponType: 'umbral_dagger', rarity: 'uncommon',
        stats: { agility: 2, intelligence: 2 }, buyPrice: 155, sellPrice: 52,
        onUse: (stats) => stats.equipItem('phantom_blade'),
    },
    voidwhisper_dagger: {
        id: 'voidwhisper_dagger', name: 'Voidwhisper Dagger',
        description: 'Whispers of the void guide your strikes. Augmented double-hit costs 1 MP. +4 AGI, +3 INT. [Vampiric]',
        color: 0xcc44ff, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 3, weaponType: 'umbral_dagger', rarity: 'rare',
        stats: { agility: 4, intelligence: 3 }, enchant: 'vampiric', buyPrice: 390, sellPrice: 130,
        onUse: (stats) => stats.equipItem('voidwhisper_dagger'),
    },
    dusk_fang: {
        id: 'dusk_fang', name: 'Dusk Fang',
        description: 'The last light before darkness. Augmented double-hit costs 1 MP. +5 AGI, +2 STR. [Swiftness]',
        color: 0xff88cc, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 3, weaponType: 'umbral_dagger', rarity: 'rare',
        stats: { agility: 5, strength: 2 }, enchant: 'swiftness', buyPrice: 370, sellPrice: 123,
        onUse: (stats) => stats.equipItem('dusk_fang'),
    },
    midnight_reaver: {
        id: 'midnight_reaver', name: 'Midnight Reaver',
        description: 'Cuts through shadow and flesh alike. Double-hit costs 1 MP. +7 AGI, +4 STR. [Vampiric] [Lore: 25% shadow clone second strike]',
        color: 0x880099, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 4, weaponType: 'umbral_dagger', rarity: 'epic',
        stats: { agility: 7, strength: 4 }, enchant: 'vampiric', loreAbility: 'shadow_clone',
        buyPrice: 800, sellPrice: 267,
        onUse: (stats) => stats.equipItem('midnight_reaver'),
    },
    ecliptic_stiletto: {
        id: 'ecliptic_stiletto', name: 'Ecliptic Stiletto',
        description: 'Eclipse-forged precision weapon. Double-hit costs 1 MP. +6 AGI, +5 INT. [Void-Touched] [Lore: 20% eclipse mark — next hit 2×]',
        color: 0xcc00cc, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 4, weaponType: 'umbral_dagger', rarity: 'epic',
        stats: { agility: 6, intelligence: 5 }, enchant: 'void_touched', loreAbility: 'eclipse_mark',
        buyPrice: 820, sellPrice: 273,
        onUse: (stats) => stats.equipItem('ecliptic_stiletto'),
    },
    twilight_fang: {
        id: 'twilight_fang', name: 'The Twilight Fang',
        description: 'Fang of the Twilight Order. Augmented double-hit costs 1 MP. +9 AGI, +5 INT. [Enemies killed in Shadow Veil drop +50% Glint]',
        color: 0xffd700, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 5, weaponType: 'umbral_dagger', rarity: 'legendary',
        stats: { agility: 9, intelligence: 5 }, passive: 'shadow_harvest', sellPrice: 999,
        onUse: (stats) => stats.equipItem('twilight_fang'),
    },
    dagger_of_the_void: {
        id: 'dagger_of_the_void', name: 'Dagger of the Void',
        description: 'Born from pure void energy. Double-hit is always augmented — no mana cost. +10 AGI, +6 STR.',
        color: 0xffd700, stackable: false, icon: 'itm_stone_sword', slot: 'weapon', tier: 5, weaponType: 'umbral_dagger', rarity: 'legendary',
        stats: { agility: 10, strength: 6 }, passive: 'void_rend', sellPrice: 999,
        onUse: (stats) => stats.equipItem('dagger_of_the_void'),
    },

    // ── RESONANCE BOW — 3 MP per shot, 150px ranged strike ───────────────────

    carved_shortbow: {
        id: 'carved_shortbow', name: 'Carved Shortbow',
        description: 'A simple carved bow. Ranged strikes cost 3 MP, reach 150px. +2 AGI, +1 INT.',
        color: 0x9b7055, stackable: false, icon: 'itm_bow_01', slot: 'weapon', tier: 1, weaponType: 'resonance_bow', rarity: 'common',
        stats: { agility: 2, intelligence: 1 }, buyPrice: 75, sellPrice: 25,
        onUse: (stats) => stats.equipItem('carved_shortbow'),
    },
    hunters_shortbow: {
        id: 'hunters_shortbow', name: "Hunter's Shortbow",
        description: "A hunter's trusted bow. Ranged strikes cost 3 MP, reach 150px. +1 AGI, +1 INT, +1 STR.",
        color: 0x887755, stackable: false, icon: 'itm_bow_01', slot: 'weapon', tier: 1, weaponType: 'resonance_bow', rarity: 'common',
        stats: { agility: 1, intelligence: 1, strength: 1 }, buyPrice: 70, sellPrice: 23,
        onUse: (stats) => stats.equipItem('hunters_shortbow'),
    },
    resonance_bow: {
        id: 'resonance_bow', name: 'Resonance Bow',
        description: 'Aether-thread strung bow. Ranged strikes cost 3 MP, reach 150px. +2 INT, +2 AGI.',
        color: 0x88ddaa, stackable: false, icon: 'itm_bow_01', slot: 'weapon', tier: 2, weaponType: 'resonance_bow', rarity: 'uncommon',
        stats: { intelligence: 2, agility: 2 }, buyPrice: 200, sellPrice: 70,
        onUse: (stats) => stats.equipItem('resonance_bow'),
    },
    forest_longbow: {
        id: 'forest_longbow', name: 'Forest Longbow',
        description: 'Carved from elder wood. Ranged strikes cost 3 MP, reach 150px. +3 AGI, +1 STR.',
        color: 0x66aa66, stackable: false, icon: 'itm_bow_01', slot: 'weapon', tier: 2, weaponType: 'resonance_bow', rarity: 'uncommon',
        stats: { agility: 3, strength: 1 }, buyPrice: 185, sellPrice: 62,
        onUse: (stats) => stats.equipItem('forest_longbow'),
    },
    aether_strung_bow: {
        id: 'aether_strung_bow', name: 'Aether-Strung Bow',
        description: 'Bowstring of pure aether. Ranged strikes cost 3 MP, reach 150px. +4 INT, +3 AGI. [Resonant]',
        color: 0x44cc88, stackable: false, icon: 'itm_bow_02', slot: 'weapon', tier: 3, weaponType: 'resonance_bow', rarity: 'rare',
        stats: { intelligence: 4, agility: 3 }, enchant: 'resonant', buyPrice: 380, sellPrice: 127,
        onUse: (stats) => stats.equipItem('aether_strung_bow'),
    },
    spirit_bow: {
        id: 'spirit_bow', name: 'Spirit Bow',
        description: 'Guided by ancestral spirits. Ranged strikes cost 3 MP, reach 150px. +3 INT, +4 AGI. [Swiftness]',
        color: 0x88ffcc, stackable: false, icon: 'itm_bow_02', slot: 'weapon', tier: 3, weaponType: 'resonance_bow', rarity: 'rare',
        stats: { intelligence: 3, agility: 4 }, enchant: 'swiftness', buyPrice: 375, sellPrice: 125,
        onUse: (stats) => stats.equipItem('spirit_bow'),
    },
    celestial_arc: {
        id: 'celestial_arc', name: 'Celestial Arc',
        description: 'Forged under a celestial alignment. Ranged strikes cost 3 MP. +6 INT, +6 AGI. [Arcane Surge] [Lore: 25% arrow bounce to second enemy]',
        color: 0x9944ff, stackable: false, icon: 'itm_bow_02', slot: 'weapon', tier: 4, weaponType: 'resonance_bow', rarity: 'epic',
        stats: { intelligence: 6, agility: 6 }, enchant: 'arcane_surge', loreAbility: 'arrow_bounce',
        buyPrice: 820, sellPrice: 273,
        onUse: (stats) => stats.equipItem('celestial_arc'),
    },
    tempest_bow: {
        id: 'tempest_bow', name: 'Tempest Bow',
        description: 'Crackling with storm-energy. Ranged strikes cost 3 MP. +8 AGI, +3 STR. [Void-Touched] [Lore: 20% storm burst AoE on impact]',
        color: 0xaa66ff, stackable: false, icon: 'itm_bow_02', slot: 'weapon', tier: 4, weaponType: 'resonance_bow', rarity: 'epic',
        stats: { agility: 8, strength: 3 }, enchant: 'void_touched', loreAbility: 'storm_burst',
        buyPrice: 800, sellPrice: 267,
        onUse: (stats) => stats.equipItem('tempest_bow'),
    },
    eternal_draw: {
        id: 'eternal_draw', name: 'The Eternal Draw',
        description: 'A bow that never misses. Ranged strikes cost 3 MP, reach 150px. +10 AGI, +6 INT. [Every 3rd consecutive shot deals 2× damage]',
        color: 0xffd700, stackable: false, icon: 'itm_bow_02', slot: 'weapon', tier: 5, weaponType: 'resonance_bow', rarity: 'legendary',
        stats: { agility: 10, intelligence: 6 }, passive: 'triple_shot', sellPrice: 999,
        onUse: (stats) => stats.equipItem('eternal_draw'),
    },
    void_piercer: {
        id: 'void_piercer', name: 'The Void-Piercer',
        description: 'Arrows pierce through the first enemy struck. Range 220px. Ranged strikes cost 3 MP. +8 INT, +8 AGI. [Arrows pierce first enemy]',
        color: 0xffd700, stackable: false, icon: 'itm_bow_02', slot: 'weapon', tier: 5, weaponType: 'resonance_bow', rarity: 'legendary',
        stats: { intelligence: 8, agility: 8 }, passive: 'void_piercer', sellPrice: 999,
        onUse: (stats) => stats.equipItem('void_piercer'),
    },
};

// Potion brewing recipes — all require empty_bottle
export const POTION_RECIPES = [
    { output: 'health_potion',         label: 'Health Potion',         ingredients: [{ id: 'forest_herb', qty: 2 }, { id: 'empty_bottle', qty: 1 }] },
    { output: 'greater_health_potion', label: 'Greater Health Potion', ingredients: [{ id: 'forest_herb', qty: 4 }, { id: 'empty_bottle', qty: 1 }] },
    { output: 'mana_potion',           label: 'Mana Potion',           ingredients: [{ id: 'mushroom_spore', qty: 2 }, { id: 'empty_bottle', qty: 1 }] },
    { output: 'antidote',              label: 'Antidote',              ingredients: [{ id: 'venom_sac', qty: 1 }, { id: 'forest_herb', qty: 1 }, { id: 'empty_bottle', qty: 1 }] },
    { output: 'void_tonic',            label: 'Void Tonic',            ingredients: [{ id: 'void_shard', qty: 2 }, { id: 'spectral_dust', qty: 1 }, { id: 'empty_bottle', qty: 1 }] },
    { output: 'blessing_draught',      label: 'Blessing Draught',      ingredients: [{ id: 'rabbit_foot', qty: 2 }, { id: 'spectral_dust', qty: 1 }, { id: 'empty_bottle', qty: 1 }] },
    { output: 'frost_vial',            label: 'Frost Vial',            ingredients: [{ id: 'ice_crystal', qty: 2 }, { id: 'empty_bottle', qty: 1 }] },
    { output: 'ember_tonic',           label: 'Ember Tonic',           ingredients: [{ id: 'ember_stone', qty: 2 }, { id: 'empty_bottle', qty: 1 }] },
];

// ingredient → { output, label }
export const COOKING_RECIPES = [
    { input: 'boar_meat',   output: 'roasted_boar',     label: 'Roasted Boar'    },
    { input: 'deer_meat',   output: 'roasted_venison',  label: 'Roasted Venison' },
    { input: 'rabbit_meat', output: 'roasted_rabbit',   label: 'Roasted Rabbit'  },
    // Hearty Stew: requires one of each meat
    { input: ['boar_meat', 'deer_meat', 'rabbit_meat'], output: 'hearty_stew', label: 'Hearty Stew', multi: true },
];
