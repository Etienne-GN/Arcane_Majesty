// Echoes of Stones — Eldrin's Tower, ground floor (the Study)
// Song 1 — "Echoes of Stone" (data/lore/campaigns/Eldorias_Prophecy_campaign.md;
// full spec: data/lore/campaigns/eldorias_prophecy/eldrins_tower.md).
//
// This is the Study only — the tutorial room where Eldrin finds the Echoes in
// the strata. Per the spec: small and contained by design ("isolation is the
// point"), no enemies beyond a non-canon training Resonance-Wisp, no boss,
// no NPCs. The Archive and Sanctum floors above it are not built yet.
//
// Known limitation shared with every other interior map in this codebase
// (hermit_hut.js, eldrin_tower.js's own grounds): wall tiles (value 1) render
// as LPC trees, not stone — GameScene._buildWorld()'s tree/wall visual is
// unconditional for any tile===1. Not fixed here — same accepted limitation,
// not something this map introduces.
import { asciiToTiles } from '../../../tools/maps/ascii_to_tiles.js';

const STUDY_ASCII = [
    '############',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#..........#',
    '#####..#####',
].join('\n');

const STUDY_TILES = asciiToTiles(STUDY_ASCII);

export const ECHOES_OF_STONE = {
    id: 'echoes_of_stone',
    displayName: 'Echoes of Stones',
    tiles: STUDY_TILES,
    lightTint: 0x1a1408, // dust and dim study-lamp light
    playerStart: { x: 5, y: 9 },
    portals: [
        {
            id: 'study_exit',
            x: 5, y: 11,
            label: "Exit to Eldrin's Tower Grounds",
            targetMap: 'eldrin_tower',
            // Just south of the grounds map's own tower door (row 27, cols
            // 12-13), out into the clearing — see eldrin_tower.js's row 28
            // comment ("clearing south of tower").
            targetX: 12 * 32 + 16,
            targetY: 28 * 32 + 16,
        },
        {
            id: 'to_aetheric_vision',
            x: 5, y: 5,
            label: 'The vision strikes —',
            // NOT YET BUILT until Task 6 of the campaign spine plan
            // (docs/superpowers/plans/2026-09-08-eldorias-prophecy-campaign-spine.md)
            // — same pattern already used by summit_of_despair.js's own
            // portals to east_road/sylvan_sanctuary.
            targetMap: 'aetheric_vision',
            targetX: 7 * 32 + 16,
            targetY: 8 * 32 + 16, // Task 6's shared stub-map entry point
        },
    ],
    decorations: [
        { name: 'bookshelf_large_colorful_a', x: 2, y: 2, blocking: true },
        { name: 'bookshelf_large_colorful_b', x: 9, y: 2, blocking: true },
        { name: 'table_wood_long_brown',      x: 8, y: 3, blocking: true },
        { name: 'chair_wood_simple',          x: 8, y: 4, blocking: false },
        { name: 'candle_lit_tall',            x: 9, y: 3, blocking: false, depthOffset: 1 },
        { name: 'book_red_closed',            x: 7, y: 3, blocking: false, depthOffset: 1 },
        { name: 'book_navy_closed',           x: 7, y: 4, blocking: false, depthOffset: 1 },
    ],
    spawns: {
        enemies: [
            // Non-canon training tool for the casting tutorial — see
            // worldMap.js's resonance_wisp comment.
            { x: 5, y: 5, type: 'resonance_wisp' },
        ],
        npcs: [], // none — isolation is the point, per the spec
        chests: [
            { x: 2, y: 9, items: ['scholars_staff'] },
        ],
        campfires: [],
        signs: [
            {
                x: 5, y: 1,
                text: "The Strata Wall\n\nLayer upon layer of stone, and beneath them — Echoes. The record was tidied. This is not the world's first ending.",
            },
        ],
        gatheringNodes: [],
        crackedBoulders: [],
        riftGates: [],
        pillarGates: [],
        boss: null,
    },
    currencyBias: 'rural',
    music: null,
    quests: ['main_read_the_erasure'],
    chapterTitle: 'Act I: Echoes of Stone',
    introDialogue: null,
    introRegistryKey: null,
};
