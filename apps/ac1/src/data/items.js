export const ITEMS = {
    health_potion: {
        id: 'health_potion',
        name: 'Health Potion',
        description: 'Restores 30 HP.',
        color: 0xcc2222,
        stackable: true,
        onUse: (stats) => { stats.health = Math.min(stats.health + 30, stats.maxHealth); return true; }
    },
    mana_potion: {
        id: 'mana_potion',
        name: 'Mana Potion',
        description: 'Restores 20 MP.',
        color: 0x2244cc,
        stackable: true,
        onUse: (stats) => { stats.mana = Math.min(stats.mana + 20, stats.maxMana); return true; }
    },
    ancient_scroll: {
        id: 'ancient_scroll',
        name: 'Ancient Scroll',
        description: 'Arcane knowledge. Grants 50 XP.',
        color: 0xddaa00,
        stackable: false,
        onUse: (stats) => { stats.gainXp(50); return true; }
    },
    forest_herb: {
        id: 'forest_herb',
        name: 'Forest Herb',
        description: 'A healing herb found in the woods. Restores 10 HP.',
        color: 0x33cc44,
        stackable: true,
        onUse: (stats) => { stats.health = Math.min(stats.health + 10, stats.maxHealth); return true; }
    }
};
