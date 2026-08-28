// Summit of Despair — blizzard high pass, Act II (Song 4)
// Source: data/lore/campaigns/Eldorias_Prophecy_campaign.md ("Song 4 —
// Summit of Despair"); Widow's Overlook / the Rime Hollow are new
// flavor additions for this map, not yet named anywhere else in canon.
//
// PROOF-APPLICATION NOTE: this map is a structural proof of the map-
// assembly procedure (data/lore/campaigns/map_assembly_procedure.md),
// built before a real snow/rock terrain sheet or neighboring maps exist:
//   - `decorations` entries use PLACEHOLDER_* names — they resolve
//     against the real catalogue-decoration mechanism
//     (GameScene._placeCatalogueDecorations), which already exists and
//     works; these specific names just aren't in any catalogue yet, so
//     they'll log a console warning and be skipped until real
//     snow/rock/prop sprites are catalogued and these names are swapped in.
//   - `tileset.floorFrame`/`pathFrame` reuse tileset_base's existing grass
//     (frame 0) and dirt-path (frame 5) frames as a working stand-in —
//     not broken, just the wrong biome — until a real snow/rock terrain
//     sheet is catalogued.
//   - Portals point at `east_road`/`sylvan_sanctuary`, which don't exist
//     yet — wire for real once those maps are built.
// This is a scaled-down proof grid (18x20), not full production size —
// the mechanism is what's being proven here, not the final scale.
import { asciiToTiles } from '../../../tools/maps/ascii_to_tiles.js';

const SUMMIT_ASCII = [
    '#######===########',
    '#######...########',
    '#######...###....#',
    '#######..........#',
    '#######...###....#',
    '########...#######',
    '#....###...#######',
    '#..........#######',
    '#....###...#######',
    '########...#######',
    '#########...######',
    '#########...######',
    '#####........#####',
    '#####........#####',
    '#####........#####',
    '########...#######',
    '########...#######',
    '########...#######',
    '########...#######',
    '########===#######',
].join('\n');

const SUMMIT_TILES = asciiToTiles(SUMMIT_ASCII);

export const SUMMIT_OF_DESPAIR = {
    id: 'summit_of_despair',
    displayName: 'Summit of Despair',
    tiles: SUMMIT_TILES,
    lightTint: 0x0a1830, // blizzard blue-grey, low visibility
    playerStart: { x: 8, y: 18 },
    tileset: {
        key: 'tileset_base',
        // PLACEHOLDER: reusing existing grass(0)/dirt-path(5) frames as a
        // working (not broken) stand-in until a real snow/rock terrain
        // sheet is catalogued — raw Phaser frame indices, not catalogue
        // lookups (that's the separate named-decoration system below).
        floorFrame: 0,
        pathFrame: 5,
        decorFrames: null,
        decorRate: 0,
    },
    decorations: [
        // Widow's Overlook shrine (Points of Interest — new content).
        // PLACEHOLDER_* names aren't in any catalogue yet — resolves
        // against the real GameScene._placeCatalogueDecorations
        // mechanism, which logs a warning and skips unresolved names
        // rather than crashing. Swap for a real catalogued prop name
        // once a snow/rock/shrine sprite exists.
        { name: 'PLACEHOLDER_widows_overlook_shrine', x: 2, y: 7, blocking: true },
        // The Rime Hollow entrance marker
        { name: 'PLACEHOLDER_rime_hollow_entrance', x: 14, y: 3, blocking: true },
    ],
    portals: [
        {
            id: 'to_east_road',
            x: 8, y: 19,
            label: 'Back down to the East Road',
            targetMap: 'east_road', // NOT YET BUILT — wire for real once it exists
            targetX: 8 * 32 + 16,
            targetY: 2 * 32 + 16,
        },
        {
            id: 'to_sylvan_sanctuary',
            x: 8, y: 0,
            label: 'Over the pass to the Sylvan Sanctuary',
            targetMap: 'sylvan_sanctuary', // NOT YET BUILT — wire for real once it exists
            targetX: 8 * 32 + 16,
            targetY: 18 * 32 + 16,
        },
    ],
    spawns: {
        enemies: [
            { x: 9, y: 2,  type: 'gloom_beak' },
            { x: 8, y: 6,  type: 'gloom_beak' },
            { x: 9, y: 10, type: 'gloom_beak' },
            { x: 8, y: 16, type: 'gloom_beak' },
            { x: 9, y: 9,  type: 'frost_shade' },
            { x: 8, y: 15, type: 'frost_shade' },
            { x: 10, y: 13, type: 'frost_shade' },
            { x: 15, y: 3, type: 'frost_shade' }, // Rime Hollow guard
            { x: 13, y: 3, type: 'frost_shade' }, // Rime Hollow guard
            { x: 9, y: 11, type: 'crag_fiend' },
            { x: 8, y: 17, type: 'crag_fiend' },
        ],
        npcs: [],
        chests: [],
        campfires: [],
        signs: [
            {
                x: 9, y: 13,
                text: "A scout's journal, half-frozen: \"...the whispering thing arrived before the cold got the rest of us. Tell the Archivists — it feeds on doubt, not blood...\"",
            },
        ],
        // Widow's Overlook shrine offerings — real gatherable resources
        // (wood/mineral_ore are the only two the engine supports), feeding
        // side_widows_watch's two gather steps.
        gatheringNodes: [
            { x: 1, y: 7, type: 'wood',    tool: 'iron_axe',     resource: 'wood',        label: 'Frost-killed timber, brittle enough to gather by hand.' },
            { x: 3, y: 7, type: 'mineral', tool: 'iron_pickaxe', resource: 'mineral_ore', label: 'An ore vein exposed by the shrine’s collapsed wall.' },
        ],
        crackedBoulders: [],
        riftGates: [],
        pillarGates: [],
        // NOTE: enemyType/drops/kill-target for this boss are currently
        // hardcoded engine-wide to the generic 'void_general' (see
        // GameScene.js:324-351) — Malphas's specific identity here is
        // narrative/quest-text only, a known limitation out of scope for
        // this plan (see the quest step comment in quests.js).
        boss: { spawn: { x: 8, y: 1 } },
    },
    currencyBias: 'rural',
    music: 'forest',
    quests: [
        'main_whisperer_of_doubt', 'side_frozen_camp',
        'side_widows_watch', 'side_echoes_in_the_rime',
    ],
    chapterTitle: 'Act II: Summit of Despair',
    introDialogue: null,
    introRegistryKey: null,
};
