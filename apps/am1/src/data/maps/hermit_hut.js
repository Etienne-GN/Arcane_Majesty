// Hermit's Hut — interior map, 20×14 tiles
// Tile 1 = wall, 2 = stone floor, 0 = door opening
const HUT_TILES = [
    // Row 0 — north wall
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    // Row 1
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 2
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 3 — shelves/furniture as wall-tile placeholders
    [1,2,2,1,1,2,2,2,2,2,2,2,2,2,2,1,1,2,2,1],
    // Row 4
    [1,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,1,2,2,1],
    // Row 5 — Hermit NPC at (10, 5)
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 6
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 7 — chest at (3, 7)
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 8
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 9
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 10 — player spawn point
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 11
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 12 — portal interaction zone row
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    // Row 13 — south wall; door opening at cols 9-10
    [1,1,1,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1],
];

export const HERMIT_HUT = {
    id: 'hermit_hut',
    displayName: "Hermit's Hut",
    tiles: HUT_TILES,
    lightTint: 0x1a1208,  // warm dim candlelight tint
    playerStart: { x: 10, y: 10 },
    portals: [
        {
            id: 'hut_exit',
            x: 10, y: 12,
            label: 'Exit to Forest',
            targetMap: 'prologue_forest',
            targetX: 22 * 32 + 16,
            targetY: 5 * 32 + 16,
        },
    ],
    spawns: {
        enemies: [],
        npcs: [
            {
                x: 10, y: 5,
                dialogue: 'hermit_hut_greeting',
                afterDialogue: 'hermit_hut_after',
                name: 'Hermit',
            },
        ],
        chests: [
            { x: 3, y: 7, items: ['health_potion', 'mana_potion', 'forest_herb'] },
        ],
        campfires: [],
        signs: [
            {
                x: 16, y: 3,
                text: "Hermit's Hut\n\nBooks and scrolls cover every surface. The writing is meticulous — years of careful study.",
            },
        ],
        gatheringNodes: [],
        crackedBoulders: [],
        riftGates: [],
        pillarGates: [],
        boss: null,
    },
    music: null,
    quests: [],
    chapterTitle: null,
    introDialogue: null,
    introRegistryKey: null,
};
