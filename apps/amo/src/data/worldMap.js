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
    wolf: {
        spriteKey: 'spr_wolf_ud',
        animProfile: 'wolf_quad',
        bodyConfig:   { w: 20, h: 12, ox: 6, oy: 48 },    // portrait (up/down) — feet area
        bodyConfigLR: { w: 50, h: 14, ox: 7, oy: 9  },    // landscape (left/right)
        health: 28, damage: 8, speed: 95, sightRange: 115,
        attackRange: 28, xpReward: 20, patrolRadius: 72,
        tint: null,
        lootTable: [
            { id: 'forest_herb',   chance: 0.35 },
            { id: 'health_potion', chance: 0.20 }
        ]
    },
    shadow_sprite: {
        spriteKey: 'spr_shadow_sprite',
        health: 22, damage: 13, speed: 72, sightRange: 130,
        attackRange: 26, xpReward: 25, patrolRadius: 60,
        tint: 0x660099,
        lootTable: [
            { id: 'mana_potion',       chance: 0.35 },
            { id: 'ancient_scroll',    chance: 0.15 },
            { id: 'mana_etched_sword', chance: 0.08 },  // T3 rare drop
        ]
    },
    void_stalker: {
        spriteKey: 'spr_void_stalker',
        health: 55, damage: 18, speed: 48, sightRange: 140,
        attackRange: 30, xpReward: 38, patrolRadius: 48,
        tint: 0x220044,
        lootTable: [
            { id: 'mana_potion',   chance: 0.45 },
            { id: 'eldritch_tome', chance: 0.15 },
            { id: 'dusk_fang',     chance: 0.10 },  // T3 rare drop
        ]
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
    },

    // ── Forest additions ──────────────────────────────────────────────────────
    giant_spider: {
        spriteKey: 'spr_scout', tint: 0x226600,
        health: 45, damage: 11, speed: 55, sightRange: 100, attackRange: 30, xpReward: 28, patrolRadius: 60,
        lootTable: [{ id: 'venom_sac', chance: 0.40 }, { id: 'health_potion', chance: 0.25 }]
    },
    dark_druid: {
        spriteKey: 'spr_shadow_sprite', tint: 0x224400,
        health: 38, damage: 14, speed: 48, sightRange: 120, attackRange: 95, xpReward: 32, patrolRadius: 56,
        keepDistance: true, minRange: 70,
        lootTable: [{ id: 'ancient_scroll', chance: 0.20 }, { id: 'mana_potion', chance: 0.35 }]
    },
    feral_boar: {
        spriteKey: 'spr_boar', animProfile: 'lpc_boar', tint: null,
        bodyConfig: { w: 24, h: 14, ox: 20, oy: 42 },
        health: 30, damage: 16, speed: 115, sightRange: 100, attackRange: 28, xpReward: 24, patrolRadius: 72,
        lootTable: [{ id: 'boar_meat', chance: 0.70 }, { id: 'boar_tusk', chance: 0.25 }]
    },

    // ── Ruins / Collapsed Citadel ─────────────────────────────────────────────
    skeleton_archer: {
        spriteKey: 'spr_scout', tint: 0xddddaa,
        health: 30, damage: 10, speed: 45, sightRange: 130, attackRange: 115, xpReward: 28, patrolRadius: 64,
        keepDistance: true, minRange: 80,
        lootTable: [{ id: 'bone_fragment', chance: 0.60 }, { id: 'health_potion', chance: 0.20 }]
    },
    stone_golem: {
        spriteKey: 'spr_treant', tint: 0x888877,
        health: 120, damage: 22, speed: 28, sightRange: 80, attackRange: 36, xpReward: 55, patrolRadius: 32,
        lootTable: [{ id: 'mineral_ore', chance: 0.50 }, { id: 'health_potion', chance: 0.30 }]
    },
    grave_wraith: {
        spriteKey: 'spr_wisp', tint: 0x8888ff,
        health: 35, damage: 18, speed: 90, sightRange: 140, attackRange: 28, xpReward: 38, patrolRadius: 70,
        lootTable: [{ id: 'spectral_dust', chance: 0.50 }, { id: 'mana_potion', chance: 0.30 }]
    },
    cursed_knight: {
        spriteKey: 'spr_void_stalker', tint: 0x334455,
        health: 80, damage: 20, speed: 50, sightRange: 110, attackRange: 32, xpReward: 48, patrolRadius: 56,
        lootTable: [{ id: 'health_potion', chance: 0.40 }, { id: 'spectral_dust', chance: 0.30 }, { id: 'ancient_scroll', chance: 0.10 }]
    },
    runic_turret: {
        spriteKey: 'spr_wisp', tint: 0x4422cc,
        health: 50, damage: 12, speed: 0, sightRange: 140, attackRange: 125, xpReward: 35, patrolRadius: 0,
        stationary: true, keepDistance: true, minRange: 90, goldDrop: 2,
        lootTable: [{ id: 'mineral_ore', chance: 0.40 }, { id: 'ancient_scroll', chance: 0.15 }]
    },

    // ── Swamp / Ashfen ────────────────────────────────────────────────────────
    bog_lurker: {
        spriteKey: 'spr_treant', tint: 0x336622,
        health: 55, damage: 15, speed: 60, sightRange: 55, attackRange: 30, xpReward: 35, patrolRadius: 48,
        lootTable: [{ id: 'venom_sac', chance: 0.40 }, { id: 'health_potion', chance: 0.20 }]
    },
    rot_toad: {
        spriteKey: 'spr_scout', tint: 0x448822,
        health: 40, damage: 10, speed: 45, sightRange: 80, attackRange: 32, xpReward: 28, patrolRadius: 52,
        aoeOnDeath: { radius: 50, damage: 15 },
        lootTable: [{ id: 'venom_sac', chance: 0.50 }]
    },
    will_o_wisp: {
        spriteKey: 'spr_wisp', tint: 0x22ffaa,
        health: 22, damage: 8, speed: 78, sightRange: 140, attackRange: 26, xpReward: 20, patrolRadius: 80,
        splitOnDeath: { type: 'wisp', count: 2 },
        lootTable: [{ id: 'mana_potion', chance: 0.30 }]
    },
    vine_horror: {
        spriteKey: 'spr_treant', tint: 0x226622,
        health: 65, damage: 14, speed: 35, sightRange: 90, attackRange: 34, xpReward: 40, patrolRadius: 40,
        lootTable: [{ id: 'forest_herb', chance: 0.50 }, { id: 'health_potion', chance: 0.35 }]
    },
    plague_rat: {
        spriteKey: 'spr_wisp', tint: 0x886633,
        health: 12, damage: 5, speed: 95, sightRange: 80, attackRange: 22, xpReward: 8, patrolRadius: 56,
        goldDrop: 0,
        lootTable: [{ id: 'venom_sac', chance: 0.15 }]
    },

    // ── Volcanic Wastes / Cinderreach ─────────────────────────────────────────
    ember_imp: {
        spriteKey: 'spr_wisp', tint: 0xff4400,
        health: 28, damage: 12, speed: 110, sightRange: 110, attackRange: 26, xpReward: 30, patrolRadius: 80,
        lootTable: [{ id: 'ember_stone', chance: 0.50 }, { id: 'mana_potion', chance: 0.20 }]
    },
    lava_elemental: {
        spriteKey: 'spr_treant', tint: 0xff2200,
        health: 90, damage: 20, speed: 35, sightRange: 100, attackRange: 34, xpReward: 52, patrolRadius: 36,
        lootTable: [{ id: 'ember_stone', chance: 0.70 }, { id: 'health_potion', chance: 0.30 }]
    },
    ash_crawler: {
        spriteKey: 'spr_scout', tint: 0x886644,
        health: 42, damage: 16, speed: 70, sightRange: 50, attackRange: 28, xpReward: 35, patrolRadius: 48,
        lootTable: [{ id: 'ember_stone', chance: 0.40 }]
    },
    forge_daemon: {
        spriteKey: 'spr_void_stalker', tint: 0xcc2200,
        health: 100, damage: 25, speed: 45, sightRange: 110, attackRange: 38, xpReward: 60, patrolRadius: 48,
        aoeOnDeath: { radius: 65, damage: 20 },
        lootTable: [{ id: 'ember_stone', chance: 0.60 }, { id: 'health_potion', chance: 0.40 }, { id: 'ancient_scroll', chance: 0.10 }]
    },
    cinder_hawk: {
        spriteKey: 'spr_wisp', tint: 0xff8800,
        health: 22, damage: 14, speed: 130, sightRange: 150, attackRange: 28, xpReward: 28, patrolRadius: 96,
        lootTable: [{ id: 'ember_stone', chance: 0.30 }]
    },

    // ── Tundra / Frostholm ────────────────────────────────────────────────────
    frost_bear: {
        spriteKey: 'spr_treant', tint: 0xaaddff,
        health: 100, damage: 22, speed: 70, sightRange: 110, attackRange: 36, xpReward: 55, patrolRadius: 56,
        lootTable: [{ id: 'ice_crystal', chance: 0.50 }, { id: 'health_potion', chance: 0.40 }]
    },
    ice_revenant: {
        spriteKey: 'spr_wisp', tint: 0x88ccff,
        health: 45, damage: 16, speed: 65, sightRange: 120, attackRange: 30, xpReward: 38, patrolRadius: 64,
        aoeOnDeath: { radius: 60, damage: 12 },
        lootTable: [{ id: 'ice_crystal', chance: 0.60 }, { id: 'spectral_dust', chance: 0.30 }]
    },
    blizzard_sprite: {
        spriteKey: 'spr_wisp', tint: 0xcceeff,
        health: 30, damage: 12, speed: 58, sightRange: 140, attackRange: 115, xpReward: 32, patrolRadius: 72,
        keepDistance: true, minRange: 80,
        lootTable: [{ id: 'ice_crystal', chance: 0.50 }, { id: 'mana_potion', chance: 0.30 }]
    },
    wendigo: {
        spriteKey: 'spr_void_stalker', tint: 0xaaccff,
        health: 75, damage: 28, speed: 80, sightRange: 180, attackRange: 32, xpReward: 58, patrolRadius: 80,
        lootTable: [{ id: 'ice_crystal', chance: 0.50 }, { id: 'health_potion', chance: 0.40 }, { id: 'ancient_scroll', chance: 0.10 }]
    },
    glacier_crab: {
        spriteKey: 'spr_treant', tint: 0x88bbdd,
        health: 85, damage: 18, speed: 38, sightRange: 80, attackRange: 34, xpReward: 45, patrolRadius: 40,
        lootTable: [{ id: 'ice_crystal', chance: 0.60 }, { id: 'health_potion', chance: 0.30 }]
    },

    // ── Underground / Deepvein ────────────────────────────────────────────────
    cave_bat: {
        spriteKey: 'spr_wisp', tint: 0x664422,
        health: 14, damage: 8, speed: 100, sightRange: 90, attackRange: 24, xpReward: 10, patrolRadius: 72,
        goldDrop: 0, lootTable: []
    },
    crystal_golem: {
        spriteKey: 'spr_treant', tint: 0x44aacc,
        health: 80, damage: 18, speed: 35, sightRange: 85, attackRange: 34, xpReward: 48, patrolRadius: 36,
        lootTable: [{ id: 'mineral_ore', chance: 0.60 }, { id: 'health_potion', chance: 0.30 }]
    },
    blind_stalker: {
        spriteKey: 'spr_void_stalker', tint: 0x222222,
        health: 55, damage: 20, speed: 75, sightRange: 50, attackRange: 30, xpReward: 42, patrolRadius: 60,
        lootTable: [{ id: 'spectral_dust', chance: 0.40 }]
    },
    deep_horror: {
        spriteKey: 'spr_treant', tint: 0x110022,
        health: 70, damage: 22, speed: 50, sightRange: 130, attackRange: 32, xpReward: 50, patrolRadius: 48,
        lootTable: [{ id: 'corrupted_essence', chance: 0.40 }, { id: 'mana_potion', chance: 0.30 }]
    },
    mushroom_shaman: {
        spriteKey: 'spr_scout', tint: 0xaa8822,
        health: 45, damage: 12, speed: 38, sightRange: 100, attackRange: 34, xpReward: 38, patrolRadius: 44,
        aoeOnDeath: { radius: 55, damage: 10 },
        lootTable: [{ id: 'mushroom_spore', chance: 0.60 }, { id: 'health_potion', chance: 0.30 }]
    },

    // ── Arcane Sanctum / Void Reaches ─────────────────────────────────────────
    void_spawn: {
        spriteKey: 'spr_wisp', tint: 0x6600cc,
        health: 55, damage: 20, speed: 85, sightRange: 150, attackRange: 30, xpReward: 45, patrolRadius: 80,
        lootTable: [{ id: 'corrupted_essence', chance: 0.50 }, { id: 'mana_potion', chance: 0.30 }]
    },
    mirror_shade: {
        spriteKey: 'spr_shadow_sprite', tint: 0x4444cc,
        health: 40, damage: 16, speed: 70, sightRange: 130, attackRange: 30, xpReward: 40, patrolRadius: 64,
        lootTable: [{ id: 'corrupted_essence', chance: 0.40 }, { id: 'ancient_scroll', chance: 0.15 }]
    },
    arcane_sentinel: {
        spriteKey: 'spr_wisp', tint: 0xcc44ff,
        health: 90, damage: 24, speed: 0, sightRange: 160, attackRange: 135, xpReward: 60, patrolRadius: 0,
        stationary: true, keepDistance: true, minRange: 100, goldDrop: 5,
        lootTable: [{ id: 'corrupted_essence', chance: 0.50 }, { id: 'mana_potion', chance: 0.40 }, { id: 'ancient_scroll', chance: 0.20 }]
    },
    rift_walker: {
        spriteKey: 'spr_void_stalker', tint: 0x8800ff,
        health: 75, damage: 22, speed: 65, sightRange: 140, attackRange: 32, xpReward: 58, patrolRadius: 64,
        lootTable: [{ id: 'corrupted_essence', chance: 0.50 }, { id: 'void_shard', chance: 0.40 }, { id: 'ancient_scroll', chance: 0.15 }]
    },
    soul_eater: {
        spriteKey: 'spr_void_stalker', tint: 0x440088,
        health: 60, damage: 18, speed: 78, sightRange: 145, attackRange: 28, xpReward: 52, patrolRadius: 72,
        lootTable: [{ id: 'corrupted_essence', chance: 0.60 }, { id: 'void_shard', chance: 0.40 }]
    },

    // ── Wildlife — passive, flee on sight ────────────────────────────────────
    boar: {
        spriteKey: 'spr_scout',        // placeholder sprite until boar asset added
        health: 20, damage: 0, speed: 105, xpReward: 0, goldDrop: 0,
        patrolRadius: 96,
        passive: true, fleeRadius: 90,
        tint: 0xbb8855,
        lootTable: [
            { id: 'boar_meat', chance: 0.80 },
            { id: 'boar_tusk', chance: 0.30 },
        ]
    },
    deer: {
        spriteKey: 'spr_deer_buck', animProfile: 'lpc_deer', tint: null,
        bodyConfig: { w: 20, h: 20, ox: 22, oy: 68 },
        health: 14, damage: 0, speed: 120, xpReward: 0, goldDrop: 0,
        patrolRadius: 96,
        passive: true, fleeRadius: 110,
        lootTable: [
            { id: 'deer_meat', chance: 0.85 },
            { id: 'deer_hide', chance: 0.50 },
        ]
    },
    deer_doe: {
        spriteKey: 'spr_deer_doe', animProfile: 'lpc_deer', tint: null,
        bodyConfig: { w: 20, h: 20, ox: 22, oy: 68 },
        health: 12, damage: 0, speed: 125, xpReward: 0, goldDrop: 0,
        patrolRadius: 96,
        passive: true, fleeRadius: 120,
        lootTable: [
            { id: 'deer_meat', chance: 0.80 },
            { id: 'deer_hide', chance: 0.45 },
        ]
    },
    forest_fox: {
        spriteKey: 'spr_fox', animProfile: 'lpc_fox', tint: null,
        bodyConfig: { w: 28, h: 14, ox: 18, oy: 44 },
        health: 10, damage: 0, speed: 135, xpReward: 0, goldDrop: 0,
        patrolRadius: 88,
        passive: true, fleeRadius: 120,
        lootTable: [
            { id: 'forest_herb', chance: 0.30 },
        ]
    },
    grizzly_bear: {
        spriteKey: 'spr_bear_grizzly', animProfile: 'lpc_bear', tint: null,
        bodyConfig: { w: 30, h: 22, ox: 17, oy: 38 },
        health: 70, damage: 20, speed: 80, sightRange: 120, attackRange: 34, xpReward: 40, patrolRadius: 64,
        lootTable: [
            { id: 'boar_meat',  chance: 0.70 },
            { id: 'wolf_pelt',  chance: 0.50 },
            { id: 'bone_fragment', chance: 0.40 },
        ]
    },
    black_bear: {
        spriteKey: 'spr_bear_black', animProfile: 'lpc_bear', tint: null,
        bodyConfig: { w: 30, h: 22, ox: 17, oy: 38 },
        health: 55, damage: 16, speed: 90, sightRange: 110, attackRange: 32, xpReward: 32, patrolRadius: 72,
        lootTable: [
            { id: 'boar_meat',  chance: 0.65 },
            { id: 'wolf_pelt',  chance: 0.40 },
        ]
    },
    giant_rat: {
        spriteKey: 'spr_giant_rat', animProfile: 'lpc_giant_rat', tint: null,
        bodyConfig: { w: 28, h: 16, ox: 26, oy: 44 },
        health: 18, damage: 7, speed: 88, sightRange: 95, attackRange: 28, xpReward: 12, patrolRadius: 60,
        lootTable: [
            { id: 'bone_fragment', chance: 0.50 },
            { id: 'venom_sac',     chance: 0.20 },
        ]
    },
    rabbit: {
        spriteKey: 'spr_rabbit', animProfile: 'lpc_rabbit', tint: null,
        bodyConfig: { w: 18, h: 14, ox: 27, oy: 44 },
        health: 6, damage: 0, speed: 130, xpReward: 0, goldDrop: 0,
        patrolRadius: 64,
        passive: true, fleeRadius: 70,
        lootTable: [
            { id: 'rabbit_meat', chance: 0.90 },
            { id: 'rabbit_foot', chance: 0.25 },
        ]
    },

    // ── Regional wildlife — Ruins ─────────────────────────────────────────────
    crow: {
        spriteKey: 'spr_wisp', tint: 0x222222,
        health: 8, damage: 0, speed: 140, xpReward: 0, goldDrop: 0, patrolRadius: 64,
        passive: true, fleeRadius: 80, lootTable: []
    },
    stray_cat: {
        spriteKey: 'spr_wisp', tint: 0xaaaa88,
        health: 10, damage: 0, speed: 120, xpReward: 0, goldDrop: 0, patrolRadius: 72,
        passive: true, fleeRadius: 90, lootTable: []
    },
    carrion_crow: {
        spriteKey: 'spr_wisp', tint: 0x110000,
        health: 15, damage: 6, speed: 110, sightRange: 90, attackRange: 26, xpReward: 8, patrolRadius: 64,
        tint: 0x330011, lootTable: [{ id: 'void_shard', chance: 0.30 }]
    },
    hollow_cat: {
        spriteKey: 'spr_wisp', tint: 0x220033,
        health: 20, damage: 8, speed: 95, sightRange: 100, attackRange: 26, xpReward: 10, patrolRadius: 64,
        lootTable: [{ id: 'void_shard', chance: 0.35 }]
    },

    // ── LPC animals — forest/plains ──────────────────────────────────────────
    dark_deer: {
        spriteKey: 'spr_deer_dark_buck', animProfile: 'lpc_deer', tint: null,
        bodyConfig: { w: 20, h: 20, ox: 22, oy: 68 },
        health: 16, damage: 0, speed: 118, xpReward: 0, goldDrop: 0, patrolRadius: 96,
        passive: true, fleeRadius: 115,
        lootTable: [{ id: 'deer_meat', chance: 0.85 }, { id: 'deer_hide', chance: 0.55 }]
    },
    dark_deer_doe: {
        spriteKey: 'spr_deer_dark_doe', animProfile: 'lpc_deer', tint: null,
        bodyConfig: { w: 20, h: 20, ox: 22, oy: 68 },
        health: 12, damage: 0, speed: 122, xpReward: 0, goldDrop: 0, patrolRadius: 96,
        passive: true, fleeRadius: 120,
        lootTable: [{ id: 'deer_meat', chance: 0.80 }, { id: 'deer_hide', chance: 0.45 }]
    },
    lion: {
        spriteKey: 'spr_lion', animProfile: 'lpc_lion', tint: null,
        bodyConfig: { w: 32, h: 20, ox: 16, oy: 40 },
        health: 65, damage: 18, speed: 95, sightRange: 130, attackRange: 34, xpReward: 38, patrolRadius: 80,
        lootTable: [{ id: 'wolf_pelt', chance: 0.60 }, { id: 'deer_meat', chance: 0.50 }]
    },
    lioness: {
        spriteKey: 'spr_lioness', animProfile: 'lpc_lion', tint: null,
        bodyConfig: { w: 32, h: 20, ox: 16, oy: 40 },
        health: 55, damage: 15, speed: 105, sightRange: 125, attackRange: 32, xpReward: 32, patrolRadius: 88,
        lootTable: [{ id: 'wolf_pelt', chance: 0.50 }, { id: 'deer_meat', chance: 0.45 }]
    },
    field_mouse: {
        spriteKey: 'spr_mouse_gray', animProfile: 'lpc_mouse', tint: null,
        bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 },
        health: 4, damage: 0, speed: 110, xpReward: 0, goldDrop: 0, patrolRadius: 48,
        passive: true, fleeRadius: 60,
        lootTable: []
    },
    white_mouse: {
        spriteKey: 'spr_mouse_white', animProfile: 'lpc_mouse', tint: null,
        bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 },
        health: 4, damage: 0, speed: 110, xpReward: 0, goldDrop: 0, patrolRadius: 48,
        passive: true, fleeRadius: 60,
        lootTable: []
    },
    mushroom_walker: {
        spriteKey: 'spr_mushroom', animProfile: 'lpc_mushroom', tint: null,
        bodyConfig: { w: 16, h: 16, ox: 8, oy: 14 },
        health: 22, damage: 6, speed: 45, sightRange: 80, attackRange: 26, xpReward: 14, patrolRadius: 48,
        lootTable: [{ id: 'mushroom_spore', chance: 0.70 }, { id: 'forest_herb', chance: 0.30 }]
    },
    amanita_walker: {
        spriteKey: 'spr_mushroom_red', animProfile: 'lpc_mushroom', tint: null,
        bodyConfig: { w: 16, h: 16, ox: 8, oy: 14 },
        health: 28, damage: 9, speed: 42, sightRange: 85, attackRange: 26, xpReward: 18, patrolRadius: 48,
        lootTable: [{ id: 'mushroom_spore', chance: 0.80 }, { id: 'venom_sac', chance: 0.35 }]
    },
    shiba: {
        spriteKey: 'spr_shiba', animProfile: 'lpc_shiba', tint: null,
        bodyConfig: { w: 26, h: 16, ox: 11, oy: 28 },
        health: 12, damage: 0, speed: 100, xpReward: 0, goldDrop: 0, patrolRadius: 64,
        passive: true, fleeRadius: 80,
        lootTable: []
    },
    goat: {
        spriteKey: 'spr_goat', animProfile: 'lpc_goat', tint: null,
        bodyConfig: { w: 28, h: 18, ox: 50, oy: 100 },
        health: 14, damage: 0, speed: 90, xpReward: 0, goldDrop: 0, patrolRadius: 80,
        passive: true, fleeRadius: 90,
        lootTable: [{ id: 'deer_meat', chance: 0.60 }]
    },
    turkey: {
        spriteKey: 'spr_turkey', animProfile: 'lpc_goat', tint: null,
        bodyConfig: { w: 22, h: 18, ox: 53, oy: 104 },
        health: 8, damage: 0, speed: 85, xpReward: 0, goldDrop: 0, patrolRadius: 64,
        passive: true, fleeRadius: 80,
        lootTable: [{ id: 'turkey_meat', chance: 0.80 }]
    },
    // ── LPC Farm Animals — Daniel Eddeland, CC-BY 3.0 ────────────────────────
    cow: {
        spriteKey: 'spr_cow_walk', animProfile: 'lpc_cow', tint: null,
        bodyConfig: { w: 60, h: 26, ox: 34, oy: 90 },
        health: 22, damage: 0, speed: 50, xpReward: 0, goldDrop: 0, patrolRadius: 80,
        passive: true, fleeRadius: 50, grazes: true,
        lootTable: [{ id: 'deer_meat', chance: 0.90 }, { id: 'deer_hide', chance: 0.50 }]
    },
    llama: {
        spriteKey: 'spr_llama_walk', animProfile: 'lpc_llama', tint: null,
        bodyConfig: { w: 56, h: 26, ox: 36, oy: 88 },
        health: 18, damage: 0, speed: 70, xpReward: 0, goldDrop: 0, patrolRadius: 80,
        passive: true, fleeRadius: 70, grazes: true,
        lootTable: [{ id: 'deer_hide', chance: 0.70 }]
    },
    pig: {
        spriteKey: 'spr_pig_walk', animProfile: 'lpc_pig', tint: null,
        bodyConfig: { w: 70, h: 22, ox: 29, oy: 92 },
        health: 16, damage: 0, speed: 80, xpReward: 0, goldDrop: 0, patrolRadius: 72,
        passive: true, fleeRadius: 75, grazes: true,
        lootTable: [{ id: 'boar_meat', chance: 0.90 }]
    },
    sheep: {
        spriteKey: 'spr_sheep_walk', animProfile: 'lpc_sheep', tint: null,
        bodyConfig: { w: 60, h: 22, ox: 34, oy: 92 },
        health: 14, damage: 0, speed: 55, xpReward: 0, goldDrop: 0, patrolRadius: 72,
        passive: true, fleeRadius: 65, grazes: true,
        lootTable: [{ id: 'deer_hide', chance: 0.80 }, { id: 'forest_herb', chance: 0.30 }]
    },
    chicken: {
        spriteKey: 'spr_chicken_walk', animProfile: 'lpc_chicken', tint: null,
        bodyConfig: { w: 16, h: 10, ox: 8, oy: 20 },
        health: 6, damage: 0, speed: 90, xpReward: 0, goldDrop: 0, patrolRadius: 56,
        passive: true, fleeRadius: 80, grazes: true,
        lootTable: [{ id: 'rabbit_meat', chance: 0.90 }, { id: 'forest_herb', chance: 0.20 }]
    },

    // ── LPC animals — snow zones (future regions) ────────────────────────────
    polar_bear: {
        spriteKey: 'spr_bear_polar', animProfile: 'lpc_bear', tint: null,
        bodyConfig: { w: 30, h: 22, ox: 17, oy: 38 },
        health: 80, damage: 24, speed: 75, sightRange: 115, attackRange: 34, xpReward: 45, patrolRadius: 64,
        lootTable: [{ id: 'wolf_pelt', chance: 0.65 }, { id: 'bone_fragment', chance: 0.45 }]
    },
    arctic_fox: {
        spriteKey: 'spr_fox_arctic', animProfile: 'lpc_fox', tint: null,
        bodyConfig: { w: 28, h: 14, ox: 18, oy: 44 },
        health: 10, damage: 0, speed: 140, xpReward: 0, goldDrop: 0, patrolRadius: 88,
        passive: true, fleeRadius: 130,
        lootTable: [{ id: 'wolf_pelt', chance: 0.25 }]
    },
    // ── LPC animals — water/ocean zones (future regions) ─────────────────────
    shark: {
        spriteKey: 'spr_shark', animProfile: 'lpc_shark', tint: null,
        bodyConfig: { w: 80, h: 40, ox: 40, oy: 60 },
        health: 90, damage: 28, speed: 110, sightRange: 160, attackRange: 50, xpReward: 55, patrolRadius: 120,
        lootTable: [{ id: 'deer_meat', chance: 0.50 }, { id: 'bone_fragment', chance: 0.60 }]
    },
    // ── Birds — ambient, passive, scatter across all zones ───────────────────
    bird_bluejay:  { spriteKey: 'spr_bird_bluejay',  animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 }, health: 4, damage: 0, speed: 150, xpReward: 0, goldDrop: 0, patrolRadius: 80, passive: true, fleeRadius: 90, lootTable: [] },
    bird_sparrow:  { spriteKey: 'spr_bird_sparrow',  animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 }, health: 4, damage: 0, speed: 140, xpReward: 0, goldDrop: 0, patrolRadius: 72, passive: true, fleeRadius: 85, lootTable: [] },
    bird_robin:    { spriteKey: 'spr_bird_robin',    animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 }, health: 4, damage: 0, speed: 140, xpReward: 0, goldDrop: 0, patrolRadius: 72, passive: true, fleeRadius: 85, lootTable: [] },
    bird_cardinal: { spriteKey: 'spr_bird_cardinal', animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 }, health: 4, damage: 0, speed: 145, xpReward: 0, goldDrop: 0, patrolRadius: 80, passive: true, fleeRadius: 90, lootTable: [] },
    bird_eagle:    { spriteKey: 'spr_bird_eagle',    animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 18, h: 12, ox: 7, oy: 16 }, health: 18, damage: 8, speed: 130, sightRange: 160, attackRange: 28, xpReward: 12, patrolRadius: 120, lootTable: [{ id: 'deer_hide', chance: 0.25 }] },
    bird_brown:    { spriteKey: 'spr_bird_brown',    animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 }, health: 4, damage: 0, speed: 140, xpReward: 0, goldDrop: 0, patrolRadius: 72, passive: true, fleeRadius: 85, lootTable: [] },
    bird_black:    { spriteKey: 'spr_bird_black',    animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 }, health: 4, damage: 0, speed: 138, xpReward: 0, goldDrop: 0, patrolRadius: 72, passive: true, fleeRadius: 85, lootTable: [] },
    bird_blue:     { spriteKey: 'spr_bird_blue',     animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 }, health: 4, damage: 0, speed: 142, xpReward: 0, goldDrop: 0, patrolRadius: 76, passive: true, fleeRadius: 88, lootTable: [] },
    bird_white:    { spriteKey: 'spr_bird_white',    animProfile: 'lpc_bird', tint: null, bodyConfig: { w: 14, h: 10, ox: 9, oy: 18 }, health: 4, damage: 0, speed: 140, xpReward: 0, goldDrop: 0, patrolRadius: 72, passive: true, fleeRadius: 85, lootTable: [] },

    // ── Regional wildlife — Swamp ─────────────────────────────────────────────
    heron: {
        spriteKey: 'spr_wisp', tint: 0xaaddcc,
        health: 10, damage: 0, speed: 115, xpReward: 0, goldDrop: 0, patrolRadius: 80,
        passive: true, fleeRadius: 100, lootTable: []
    },
    giant_frog: {
        spriteKey: 'spr_scout', tint: 0x44aa44,
        health: 18, damage: 0, speed: 80, xpReward: 0, goldDrop: 0, patrolRadius: 64,
        passive: true, fleeRadius: 75, lootTable: [{ id: 'venom_sac', chance: 0.20 }]
    },
    plague_heron: {
        spriteKey: 'spr_wisp', tint: 0x226633,
        health: 20, damage: 7, speed: 90, sightRange: 100, attackRange: 26, xpReward: 10, patrolRadius: 64,
        lootTable: [{ id: 'void_shard', chance: 0.35 }]
    },
    rot_frog: {
        spriteKey: 'spr_scout', tint: 0x224400,
        health: 28, damage: 9, speed: 65, sightRange: 85, attackRange: 28, xpReward: 12, patrolRadius: 52,
        lootTable: [{ id: 'venom_sac', chance: 0.40 }, { id: 'void_shard', chance: 0.30 }]
    },

    // ── Regional wildlife — Volcanic ──────────────────────────────────────────
    fire_lizard: {
        spriteKey: 'spr_wisp', tint: 0xff8833,
        health: 12, damage: 0, speed: 120, xpReward: 0, goldDrop: 0, patrolRadius: 72,
        passive: true, fleeRadius: 85, lootTable: [{ id: 'ember_stone', chance: 0.25 }]
    },
    vulture: {
        spriteKey: 'spr_wisp', tint: 0x886644,
        health: 14, damage: 0, speed: 100, xpReward: 0, goldDrop: 0, patrolRadius: 80,
        passive: true, fleeRadius: 110, lootTable: []
    },
    ember_lizard: {
        spriteKey: 'spr_wisp', tint: 0xcc2200,
        health: 22, damage: 8, speed: 100, sightRange: 95, attackRange: 26, xpReward: 10, patrolRadius: 64,
        lootTable: [{ id: 'ember_stone', chance: 0.50 }, { id: 'void_shard', chance: 0.30 }]
    },
    ash_vulture: {
        spriteKey: 'spr_wisp', tint: 0x441100,
        health: 20, damage: 7, speed: 85, sightRange: 110, attackRange: 26, xpReward: 10, patrolRadius: 72,
        lootTable: [{ id: 'void_shard', chance: 0.40 }]
    },

    // ── Regional wildlife — Tundra ────────────────────────────────────────────
    elk: {
        spriteKey: 'spr_scout', tint: 0xccaa88,
        health: 22, damage: 0, speed: 125, xpReward: 0, goldDrop: 0, patrolRadius: 96,
        passive: true, fleeRadius: 110, lootTable: [{ id: 'deer_meat', chance: 0.80 }, { id: 'deer_hide', chance: 0.50 }]
    },
    arctic_fox: {
        spriteKey: 'spr_wisp', tint: 0xeeeeff,
        health: 10, damage: 0, speed: 135, xpReward: 0, goldDrop: 0, patrolRadius: 80,
        passive: true, fleeRadius: 100, lootTable: [{ id: 'wolf_pelt', chance: 0.40 }, { id: 'rabbit_meat', chance: 0.50 }]
    },
    corrupted_elk: {
        spriteKey: 'spr_scout', tint: 0x220044,
        health: 55, damage: 18, speed: 100, sightRange: 125, attackRange: 32, xpReward: 22, patrolRadius: 72,
        lootTable: [{ id: 'deer_hide', chance: 0.40 }, { id: 'void_shard', chance: 0.50 }, { id: 'ice_crystal', chance: 0.30 }]
    },
    void_fox: {
        spriteKey: 'spr_wisp', tint: 0x330066,
        health: 25, damage: 10, speed: 115, sightRange: 110, attackRange: 26, xpReward: 12, patrolRadius: 64,
        lootTable: [{ id: 'wolf_pelt', chance: 0.30 }, { id: 'void_shard', chance: 0.40 }]
    },

    // ── Regional wildlife — Underground ───────────────────────────────────────
    cave_fish: {
        spriteKey: 'spr_wisp', tint: 0x336688,
        health: 6, damage: 0, speed: 90, xpReward: 0, goldDrop: 0, patrolRadius: 48,
        passive: true, fleeRadius: 60, lootTable: []
    },
    glow_moth: {
        spriteKey: 'spr_wisp', tint: 0xaaffcc,
        health: 5, damage: 0, speed: 110, xpReward: 0, goldDrop: 0, patrolRadius: 56,
        passive: true, fleeRadius: 70, lootTable: []
    },
    void_crawler: {
        spriteKey: 'spr_wisp', tint: 0x220044,
        health: 18, damage: 9, speed: 85, sightRange: 80, attackRange: 24, xpReward: 10, patrolRadius: 52,
        lootTable: [{ id: 'void_shard', chance: 0.40 }]
    },
    blight_moth: {
        spriteKey: 'spr_wisp', tint: 0x334400,
        health: 16, damage: 7, speed: 95, sightRange: 75, attackRange: 22, xpReward: 8, patrolRadius: 56,
        lootTable: [{ id: 'void_shard', chance: 0.35 }, { id: 'mushroom_spore', chance: 0.30 }]
    },

    // ── Corrupted wildlife — aggressive void-tainted versions ─────────────────
    corrupted_boar: {
        spriteKey: 'spr_scout',
        health: 38, damage: 12, speed: 88, sightRange: 120,
        attackRange: 30, xpReward: 18, patrolRadius: 80,
        tint: 0x440066,
        lootTable: [
            { id: 'boar_meat',  chance: 0.60 },
            { id: 'boar_tusk',  chance: 0.20 },
            { id: 'void_shard', chance: 0.45 },
        ]
    },
    corrupted_deer: {
        spriteKey: 'spr_scout',
        health: 28, damage: 9, speed: 100, sightRange: 130,
        attackRange: 28, xpReward: 14, patrolRadius: 80,
        tint: 0x330055,
        lootTable: [
            { id: 'deer_hide',  chance: 0.40 },
            { id: 'void_shard', chance: 0.50 },
        ]
    },
    corrupted_rabbit: {
        spriteKey: 'spr_rabbit', animProfile: 'lpc_rabbit', tint: 0x880099,
        bodyConfig: { w: 18, h: 14, ox: 27, oy: 44 },
        health: 12, damage: 5, speed: 110, sightRange: 90,
        attackRange: 24, xpReward: 8, patrolRadius: 60,
        lootTable: [
            { id: 'void_shard', chance: 0.35 },
        ]
    },

    // Spiders — LPC Spiders (80×64 frames, 11 colour variants)
    // bodyConfig: spider is 80px wide but we only want the body centre ~32px
    spider_green:  { spriteKey: 'spr_spider_01', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 18, damage: 6,  speed: 95,  sightRange: 110, attackRange: 30, xpReward: 10, patrolRadius: 70, lootTable: [{ id: 'venom_sac', chance: 0.35 }] },
    spider_brown:  { spriteKey: 'spr_spider_02', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 18, damage: 6,  speed: 90,  sightRange: 110, attackRange: 30, xpReward: 10, patrolRadius: 70, lootTable: [{ id: 'venom_sac', chance: 0.35 }] },
    spider_red:    { spriteKey: 'spr_spider_03', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 22, damage: 8,  speed: 100, sightRange: 120, attackRange: 30, xpReward: 14, patrolRadius: 75, lootTable: [{ id: 'venom_sac', chance: 0.45 }, { id: 'ruby_dust', chance: 0.15 }] },
    spider_blue:   { spriteKey: 'spr_spider_04', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 20, damage: 7,  speed: 105, sightRange: 115, attackRange: 30, xpReward: 12, patrolRadius: 72, lootTable: [{ id: 'venom_sac', chance: 0.40 }] },
    spider_gray:   { spriteKey: 'spr_spider_05', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 20, damage: 7,  speed: 92,  sightRange: 110, attackRange: 30, xpReward: 12, patrolRadius: 70, lootTable: [{ id: 'venom_sac', chance: 0.35 }] },
    spider_yellow: { spriteKey: 'spr_spider_06', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 16, damage: 5,  speed: 110, sightRange: 100, attackRange: 30, xpReward: 8,  patrolRadius: 65, lootTable: [{ id: 'venom_sac', chance: 0.25 }] },
    spider_orange: { spriteKey: 'spr_spider_07', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 18, damage: 6,  speed: 95,  sightRange: 110, attackRange: 30, xpReward: 10, patrolRadius: 70, lootTable: [{ id: 'venom_sac', chance: 0.35 }] },
    spider_pink:   { spriteKey: 'spr_spider_08', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 16, damage: 5,  speed: 108, sightRange: 100, attackRange: 30, xpReward: 8,  patrolRadius: 65, lootTable: [{ id: 'venom_sac', chance: 0.25 }] },
    spider_white:  { spriteKey: 'spr_spider_09', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 24, damage: 9,  speed: 88,  sightRange: 120, attackRange: 30, xpReward: 16, patrolRadius: 60, lootTable: [{ id: 'venom_sac', chance: 0.50 }, { id: 'bone_dust', chance: 0.20 }] },
    spider_dark:   { spriteKey: 'spr_spider_10', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 28, h: 20, ox: 18, oy: 22 }, health: 28, damage: 11, speed: 100, sightRange: 130, attackRange: 32, xpReward: 20, patrolRadius: 80, lootTable: [{ id: 'venom_sac', chance: 0.60 }, { id: 'shadow_essence', chance: 0.25 }] },
    spider_queen:  { spriteKey: 'spr_spider_11', animProfile: 'lpc_spider', tint: null, bodyConfig: { w: 30, h: 22, ox: 17, oy: 20 }, health: 55, damage: 15, speed: 85,  sightRange: 140, attackRange: 34, xpReward: 45, patrolRadius: 50, lootTable: [{ id: 'venom_sac', chance: 0.90 }, { id: 'spider_silk', chance: 0.70 }, { id: 'void_shard', chance: 0.30 }] },
};

export const PLAYER_START = { x: 3, y: 4 };

export const NPC_POSITIONS = [
    { x: 22, y: 6, dialogue: 'merchant_greeting', afterDialogue: 'merchant_after', name: 'Silvara', isShop: true, spriteKey: 'spr_merchant', animProfile: 'lpc_universal' },
];

export const ENEMY_SPAWNS = [
    // Wisps — eastern ruins fringe
    { x: 38, y: 3,  type: 'wisp'          },
    { x: 42, y: 2,  type: 'wisp'          },
    { x: 45, y: 6,  type: 'wisp'          },
    { x: 40, y: 9,  type: 'wisp'          },
    { x: 47, y: 4,  type: 'wisp'          },

    // Wolves — northern and western forest pack (quest target: 5 required)
    { x: 4,  y: 12, type: 'wolf'          },
    { x: 8,  y: 16, type: 'wolf'          },
    { x: 16, y: 18, type: 'wolf'          },
    { x: 6,  y: 20, type: 'wolf'          },
    { x: 12, y: 26, type: 'wolf'          },
    { x: 18, y: 28, type: 'wolf'          },
    { x: 3,  y: 30, type: 'wolf'          },

    // Shadow Sprites — eastern ruins interior (quest target: 3 + 10 hidden)
    { x: 34, y: 6,  type: 'shadow_sprite' },
    { x: 36, y: 11, type: 'shadow_sprite' },
    { x: 32, y: 16, type: 'shadow_sprite' },
    { x: 44, y: 13, type: 'shadow_sprite' },
    { x: 37, y: 19, type: 'shadow_sprite' },

    // Scouts — mid forest patrol
    { x: 7,  y: 7,  type: 'scout'         },
    { x: 20, y: 12, type: 'scout'         },
    { x: 27, y: 15, type: 'scout'         },
    { x: 35, y: 24, type: 'scout'         },
    { x: 13, y: 22, type: 'scout'         },

    // Treants — south forest
    { x: 5,  y: 25, type: 'treant'        },
    { x: 10, y: 29, type: 'treant'        },
    { x: 14, y: 33, type: 'treant'        },
    { x: 6,  y: 37, type: 'treant'        },

    // Void Stalkers — southern approach to boss arena
    { x: 36, y: 27, type: 'void_stalker'  },
    { x: 39, y: 31, type: 'void_stalker'  },
    { x: 42, y: 25, type: 'void_stalker'  },

    // Wildlife — passive, scattered through open forest
    { x: 11, y: 8,  type: 'boar'          },
    { x: 17, y: 14, type: 'boar'          },
    { x: 9,  y: 18, type: 'deer'          },
    { x: 23, y: 20, type: 'deer'          },
    { x: 15, y: 6,  type: 'deer'          },
    { x: 22, y: 10, type: 'deer_doe'      },
    { x: 10, y: 14, type: 'deer_doe'      },
    { x: 19, y: 22, type: 'deer_doe'      },
    { x: 5,  y: 10, type: 'rabbit'        },
    { x: 14, y: 10, type: 'rabbit'        },
    { x: 26, y: 8,  type: 'rabbit'        },
    // Foxes — quick, skittish, scattered light forest
    { x: 7,  y: 12, type: 'forest_fox'   },
    { x: 20, y: 7,  type: 'forest_fox'   },
    { x: 13, y: 19, type: 'forest_fox'   },
    { x: 28, y: 12, type: 'forest_fox'   },
    // Bears — deep forest, aggressive predators
    { x: 4,  y: 22, type: 'black_bear'   },
    { x: 22, y: 26, type: 'black_bear'   },
    { x: 8,  y: 32, type: 'grizzly_bear' },
    { x: 18, y: 34, type: 'grizzly_bear' },
    // Dark deer — mid-forest, near corrupted zones
    { x: 24, y: 16, type: 'dark_deer'     },
    { x: 30, y: 22, type: 'dark_deer_doe' },
    { x: 27, y: 25, type: 'dark_deer'     },
    // Mice — ambient ground critters, scattered
    { x: 6,  y: 9,  type: 'field_mouse'  },
    { x: 13, y: 12, type: 'field_mouse'  },
    { x: 21, y: 18, type: 'field_mouse'  },
    { x: 16, y: 24, type: 'white_mouse'  },
    { x: 9,  y: 28, type: 'field_mouse'  },
    // Mushroom walkers — deep forest, magical zones
    { x: 7,  y: 30, type: 'mushroom_walker' },
    { x: 11, y: 35, type: 'amanita_walker'  },
    { x: 20, y: 30, type: 'mushroom_walker' },
    { x: 15, y: 38, type: 'amanita_walker'  },
    // Shiba — near hermit clearing
    { x: 19, y: 9,  type: 'shiba'        },
    // Goats & turkeys — open meadow areas
    { x: 11, y: 6,  type: 'goat'         },
    { x: 14, y: 7,  type: 'goat'         },
    { x: 18, y: 11, type: 'turkey'       },
    { x: 22, y: 6,  type: 'turkey'       },
    { x: 8,  y: 14, type: 'goat'         },
    // Farm animals — farmstead area (northwest meadow)
    { x: 7,  y: 5,  type: 'cow'     },
    { x: 10, y: 8,  type: 'cow'     },
    { x: 6,  y: 12, type: 'cow'     },
    { x: 13, y: 4,  type: 'llama'   },
    { x: 17, y: 7,  type: 'llama'   },
    { x: 20, y: 5,  type: 'llama'   },
    { x: 5,  y: 7,  type: 'pig'     },
    { x: 9,  y: 11, type: 'pig'     },
    { x: 15, y: 9,  type: 'pig'     },
    { x: 6,  y: 9,  type: 'sheep'   },
    { x: 12, y: 6,  type: 'sheep'   },
    { x: 16, y: 12, type: 'sheep'   },
    { x: 7,  y: 13, type: 'chicken' },
    { x: 11, y: 5,  type: 'chicken' },
    { x: 14, y: 11, type: 'chicken' },
    { x: 18, y: 9,  type: 'chicken' },
    // Giant rats — near cave entrance and ruins fringe
    { x: 29, y: 10, type: 'giant_rat'    },
    { x: 32, y: 13, type: 'giant_rat'    },
    { x: 26, y: 18, type: 'giant_rat'    },
    // Birds — scattered throughout open forest
    { x: 3,  y: 5,  type: 'bird_sparrow'  },
    { x: 10, y: 6,  type: 'bird_bluejay'  },
    { x: 17, y: 5,  type: 'bird_robin'    },
    { x: 25, y: 4,  type: 'bird_cardinal' },
    { x: 8,  y: 11, type: 'bird_brown'    },
    { x: 15, y: 9,  type: 'bird_sparrow'  },
    { x: 22, y: 14, type: 'bird_bluejay'  },
    { x: 29, y: 7,  type: 'bird_black'    },
    { x: 4,  y: 17, type: 'bird_robin'    },
    { x: 12, y: 20, type: 'bird_blue'     },
    { x: 20, y: 24, type: 'bird_white'    },
    { x: 5,  y: 33, type: 'bird_brown'    },
    // Eagle — high vantage, patrols wide area
    { x: 35, y: 5,  type: 'bird_eagle'   },
    { x: 42, y: 8,  type: 'bird_eagle'   },

    // Spiders — forest caves, ruins, and corrupted zones
    { x: 6,  y: 22, type: 'spider_green'  },
    { x: 8,  y: 26, type: 'spider_brown'  },
    { x: 10, y: 30, type: 'spider_green'  },
    { x: 13, y: 28, type: 'spider_yellow' },
    { x: 22, y: 32, type: 'spider_brown'  },
    { x: 28, y: 32, type: 'spider_orange' },
    { x: 33, y: 26, type: 'spider_gray'   },
    { x: 36, y: 18, type: 'spider_blue'   },
    { x: 38, y: 28, type: 'spider_red'    },
    { x: 40, y: 32, type: 'spider_dark'   },
    { x: 35, y: 33, type: 'spider_white'  },
    { x: 25, y: 36, type: 'spider_queen'  },

    // Corrupted wildlife — deeper forest, near void-touched zones
    { x: 28, y: 22, type: 'corrupted_boar'   },
    { x: 33, y: 20, type: 'corrupted_boar'   },
    { x: 30, y: 28, type: 'corrupted_deer'   },
    { x: 25, y: 30, type: 'corrupted_rabbit' },
    { x: 31, y: 14, type: 'corrupted_rabbit' },
];

export const CHEST_POSITIONS = [
    // Chest 1 — far east ruins: early explorer reward (T3 staff)
    { x: 43, y: 5,  items: ['health_potion', 'ancient_scroll', 'verdant_focus'] },
    // Chest 2 — mid-forest: ranged build reward (T3 bow)
    { x: 30, y: 17, items: ['mana_potion', 'forest_herb', 'spirit_bow'] },
    // Chest 3 — pre-boss vault: final pre-fight upgrade (T4 epic dagger)
    { x: 43, y: 36, items: ['heart_crystal', 'eldritch_tome', 'midnight_reaver'] },
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
