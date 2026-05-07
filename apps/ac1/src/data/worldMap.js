// Prologue: The Forest Hunt
// Tile values: 0 = floor, 1 = tree/wall, 2 = path
// Map: 50 cols × 40 rows

export const TILE_SIZE = 32;

export const PROLOGUE_MAP = [
    // Row 0 — North border
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    // Row 1 — Open
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 2 — Sparse trees; wisp territory begins east
    [1,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 3
    [1,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    // Row 4 — player start (3,4), sign at (10,4), hermit clearing north wall (17-24)
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 5 — clearing west(17) and east(24) path walls
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 6
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 7 — hermit NPC at (21,7); trees at (6,7) and (35-36,7)
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 8 — campfire at (20,8) inside clearing
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 9 — clearing south wall (17-24)
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 10
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 11
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 12 — cluster (4-5,12), (31-32,12)
    [1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 13 — (5,13), (32,13)
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 14
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 15
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 16 — (7-8,16)
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 17 — (8,17), (34-35,17)
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 18 — (34,18)
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 19 — sign at (27,19)
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 20 — south zone fringe (interior trees 1-2)
    [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 21
    [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 22
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 23 — (3,23), (33,23)
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 24 — (3-4,24), (9,24), (33-34,24)
    [1,0,0,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 25 — campfire at (8,25); (4,25), (8-9,25)
    [1,0,0,0,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 26 — (8,26)
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 27 — (5-6,27), (31-32,27)
    [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 28 — (5,28), (31,28)
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 29
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 30 — open corridor to boss zone
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    // Row 31 — boss arena north wall (cols 33-47)
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    // Row 32 — west wall (33), east wall (47)
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    // Row 33 — tree cluster (5-6,33); west wall (33), east wall (47)
    [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    // Row 34 — tree (5,34); west wall (33), east wall (47)
    [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    // Row 35 — entry GAP at col 33; path approach (31-32); east wall (47)
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    // Row 36 — entry GAP at col 33; path approach (31-32); east wall (47)
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    // Row 37 — tree cluster (7-8,37); west wall (33), east wall (47)
    [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    // Row 38 — boss arena south wall (cols 33-47); tree at (8,38)
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1],
    // Row 39 — South border
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

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
    { x: 21, y: 7, dialogue: 'hermit_intro', afterDialogue: 'hermit_after', name: 'Hermit', reward: 'forest_herb' },
    { x: 22, y: 6, dialogue: 'merchant_greeting', afterDialogue: 'merchant_after', name: 'Silvara', isShop: true, tint: 0xffdd88 },
];

export const ENEMY_SPAWNS = [
    // Wisps — eastern ruins
    { x: 38, y: 3,  type: 'wisp'   },
    { x: 42, y: 2,  type: 'wisp'   },
    { x: 45, y: 6,  type: 'wisp'   },
    { x: 40, y: 9,  type: 'wisp'   },
    { x: 47, y: 4,  type: 'wisp'   },
    // Scouts — mid forest
    { x: 7,  y: 7,  type: 'scout'  },
    { x: 20, y: 12, type: 'scout'  },
    { x: 27, y: 15, type: 'scout'  },
    { x: 35, y: 24, type: 'scout'  },
    { x: 13, y: 22, type: 'scout'  },
    // Treants — south forest
    { x: 5,  y: 25, type: 'treant' },
    { x: 10, y: 29, type: 'treant' },
    { x: 14, y: 33, type: 'treant' },
    { x: 6,  y: 37, type: 'treant' },
];

export const CHEST_POSITIONS = [
    { x: 43, y: 5,  items: ['health_potion', 'ancient_scroll'] },
    { x: 30, y: 17, items: ['mana_potion', 'forest_herb'] },
    { x: 43, y: 36, items: ['heart_crystal', 'eldritch_tome'] },
];

export const CAMPFIRE_POSITIONS = [
    { x: 20, y: 8  },  // inside hermit clearing
    { x: 8,  y: 25 },  // south forest camp
    { x: 28, y: 35 },  // pre-boss rest stop
];

export const SIGN_POSITIONS = [
    { x: 5,  y: 2,  text: 'The Forest Hunt\n\nBeware the shadow-creatures that emerged after the Great Darkness. They grow bolder each passing night.' },
    { x: 10, y: 4,  text: 'Traveler — seek the hermit who dwells beyond the ancient stones. He carries knowledge older than the Covenant.' },
    { x: 27, y: 19, text: 'WARNING: The Void Wraith stirs in the southern glades. Its corruption has spread far. Approach only if you are prepared to face the darkness.' },
];

// Pillar ledge gates — impassable cliffs openable only by casting Earth Pillar on yourself nearby
export const PILLAR_GATE_POSITIONS = [
    { x: 10, y: 2,  w: 32, h: 64, label: 'A high stone ledge bars the passage. An earth mage could raise the ground beneath their feet to reach it.' },
    { x: 28, y: 20, w: 32, h: 64, label: 'The cliffside is too sheer to climb. Raising an earth pillar underfoot could bridge the gap.' },
    { x: 40, y: 22, w: 32, h: 64, label: 'A raised plateau blocks the eastern approach. Earth magic cast at your own feet might lift you to it.' },
];

// Cracked stone formations — Earth Pillar shatters them, opening hidden paths
export const CRACKED_BOULDER_POSITIONS = [
    { x: 15, y: 15, label: 'A cracked stone formation blocks the path. Something erupted through here long ago.' },
    { x: 25, y: 10, label: 'Ancient stonework, fractured. The rock remembers pressure from below.' },
    { x: 42, y: 14, label: 'A collapsed pillar bars the eastern passage. The carvings look deliberately placed.' },
];

// Boss spawn — center of the arena
export const BOSS_SPAWN = { x: 41, y: 34 };

// Boss arena entry detection bounds (in tile coordinates)
export const BOSS_ARENA_BOUNDS = { minX: 33, minY: 31, maxX: 48, maxY: 38 };

// Rift-Gates — Aetheric Monoliths that save, heal, and eventually enable fast travel
export const RIFT_GATE_POSITIONS = [
    { x: 5,  y: 5,  id: 'gate_archive',    label: 'Tower of Archives'  },
    { x: 24, y: 14, id: 'gate_crossroads',  label: 'Crossroads Monolith' },
    { x: 41, y: 20, id: 'gate_eastern',     label: 'Eastern Approach'   },
];

// Gathering nodes — require specific tool in inventory to harvest
export const GATHERING_NODES = [
    { x: 3,  y: 8,  type: 'wood',    tool: 'iron_axe',     resource: 'wood',        label: 'A fallen log. An Iron Axe would split it into usable timber.' },
    { x: 12, y: 8,  type: 'wood',    tool: 'iron_axe',     resource: 'wood',        label: 'Dead wood stacked against an old tree. Perfect for gathering.' },
    { x: 32, y: 10, type: 'wood',    tool: 'iron_axe',     resource: 'wood',        label: 'Dry timber. Use an Iron Axe to collect it.' },
    { x: 15, y: 20, type: 'mineral', tool: 'iron_pickaxe', resource: 'mineral_ore', label: 'A mineral seam runs through the rock here. An Iron Pickaxe could break it open.' },
    { x: 38, y: 28, type: 'mineral', tool: 'iron_pickaxe', resource: 'mineral_ore', label: 'Glinting ore deposits in the stone. Use an Iron Pickaxe to extract them.' },
    { x: 22, y: 32, type: 'mineral', tool: 'iron_pickaxe', resource: 'mineral_ore', label: 'An exposed mineral vein, rich in ore. Needs an Iron Pickaxe.' },
];
