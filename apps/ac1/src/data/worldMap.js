// Prologue: The Forest Hunt (Tutorial Level)
// Tile values: 0 = floor, 1 = tree/wall, 2 = path

export const TILE_SIZE = 32;

export const PROLOGUE_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Enemy type definitions
export const ENEMY_TYPES = {
    wisp: {
        spriteKey: 'spr_wisp',
        health: 18, damage: 5, speed: 85, sightRange: 100,
        attackRange: 26, xpReward: 15, patrolRadius: 80,
        tint: 0xcc44ff,
        lootTable: [{ id: 'mana_potion', chance: 0.30 }]
    },
    scout: {
        spriteKey: 'spr_scout',
        health: 32, damage: 9, speed: 56, sightRange: 115,
        attackRange: 28, xpReward: 22, patrolRadius: 64,
        tint: null,
        lootTable: [
            { id: 'health_potion', chance: 0.35 },
            { id: 'forest_herb',   chance: 0.25 }
        ]
    },
    treant: {
        spriteKey: 'spr_treant',
        health: 65, damage: 16, speed: 30, sightRange: 70,
        attackRange: 34, xpReward: 42, patrolRadius: 32,
        tint: null,
        lootTable: [
            { id: 'health_potion', chance: 0.50 },
            { id: 'forest_herb',   chance: 0.40 }
        ]
    }
};

export const PLAYER_START = { x: 3, y: 4 };

export const NPC_POSITIONS = [
    { x: 14, y: 6, dialogue: 'hermit_intro', afterDialogue: 'hermit_after', name: 'Hermit', reward: 'forest_herb' }
];

export const ENEMY_SPAWNS = [
    { x: 7,  y: 7,  type: 'scout'  },
    { x: 25, y: 3,  type: 'wisp'   },
    { x: 8,  y: 13, type: 'scout'  },
    { x: 20, y: 10, type: 'wisp'   },
    { x: 15, y: 17, type: 'treant' },
    { x: 26, y: 15, type: 'scout'  },
    { x: 22, y: 6,  type: 'wisp'   },
    { x: 5,  y: 17, type: 'treant' },
];

export const CHEST_POSITIONS = [
    { x: 23, y: 10, items: ['health_potion', 'ancient_scroll'] }
];

export const CAMPFIRE_POSITIONS = [
    { x: 14, y: 7 },  // inside the path-bordered clearing near the hermit
    { x: 6,  y: 18 }, // southern camp
];

export const SIGN_POSITIONS = [
    { x: 5,  y: 2,  text: 'The Forest Hunt\n\nBeware the shadow-creatures that emerged after the Great Darkness. They grow bolder each passing night.' },
    { x: 12, y: 4,  text: 'Traveler — seek the hermit who dwells beyond the ancient stones. He carries knowledge older than the Covenant.' },
    { x: 20, y: 19, text: 'WARNING: Corrupted Treants sighted in the southern glades. Their bark has turned to shadow. Approach with caution.' },
];
