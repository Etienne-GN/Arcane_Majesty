import {
    PROLOGUE_MAP, PLAYER_START, ENEMY_SPAWNS, NPC_POSITIONS, CHEST_POSITIONS,
    CAMPFIRE_POSITIONS, SIGN_POSITIONS, BOSS_SPAWN, BOSS_ARENA_BOUNDS,
    CRACKED_BOULDER_POSITIONS, PILLAR_GATE_POSITIONS, RIFT_GATE_POSITIONS, GATHERING_NODES,
} from '../worldMap.js';

export const PROLOGUE_FOREST = {
    id: 'prologue_forest',
    displayName: 'Prologue Forest',
    tiles: PROLOGUE_MAP,
    lightTint: null,
    playerStart: PLAYER_START,
    portals: [
        {
            id: 'hermit_hut_door',
            x: 22, y: 1,
            label: "Hermit's Hut",
            targetMap: 'hermit_hut',
            targetX: 10 * 32 + 16,
            targetY: 10 * 32 + 16,
        },
    ],
    spawns: {
        enemies:        ENEMY_SPAWNS,
        npcs:           NPC_POSITIONS,
        chests:         CHEST_POSITIONS,
        campfires:      CAMPFIRE_POSITIONS,
        signs:          SIGN_POSITIONS,
        gatheringNodes: GATHERING_NODES,
        crackedBoulders: CRACKED_BOULDER_POSITIONS,
        riftGates:      RIFT_GATE_POSITIONS,
        pillarGates:    PILLAR_GATE_POSITIONS,
        boss: { spawn: BOSS_SPAWN, arenaBounds: BOSS_ARENA_BOUNDS },
    },
    currencyBias: 'rural',
    music: 'forest',
    quests: [
        'main_forest_hunt', 'side_supply_run', 'side_read_the_signs',
        'side_corrupted_hunt', 'side_hunters_larder',
    ],
    chapterTitle: 'Prologue: The Forest Hunt',
    introDialogue: 'eldrin_premonition',
    introRegistryKey: 'prologueSeen',
};
