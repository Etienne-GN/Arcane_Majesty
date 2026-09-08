// Scaffolding for the Eldoria's Prophecy campaign spine
// (docs/superpowers/plans/2026-09-08-eldorias-prophecy-campaign-spine.md).
//
// Each stub is a single bordered room — real geometry comes later, one
// chapter at a time, from that location's own map spec under
// data/lore/campaigns/eldorias_prophecy/. This is only enough to prove the
// campaign machinery: walkable, one sign naming the chapter, one or more
// NPCs (talking to one completes that chapter's stub quest), and a portal
// onward.
//
// Tile legend matches every other map in the game (see
// tools/maps/ascii_to_tiles.js's DEFAULT_LEGEND, and GameScene._buildWorld,
// which is what actually enforces this): 0 floor, 1 wall/tree, 2 path.

const WIDTH = 14;
const HEIGHT = 10;
const DOOR_ROW = Math.floor(HEIGHT / 2);
const SPAWN_COL = Math.floor(WIDTH / 2);
const SPAWN_ROW = HEIGHT - 2;

// Every portal that leads INTO a stub map should target this point. Portal
// transitions always use the source portal's own explicit targetX/targetY
// (a destination map's playerStart is only read for a fresh
// CharacterSelectScene spawn, never for a portal) — every stub is the same
// shape, so this one pair of constants is correct for all of them, and
// removes any chance of a coordinate typo drifting between files.
export const STUB_ENTRY_X = SPAWN_COL * 32 + 16;
export const STUB_ENTRY_Y = SPAWN_ROW * 32 + 16;

/**
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} opts.displayName
 * @param {string} opts.chapterTitle
 * @param {string} opts.signText
 * @param {{x:number,y:number,dialogue:string,name?:string}[]} [opts.npcs]
 *        Each npc's `dialogue` key must exist in DIALOGUES. The talk-id a
 *        quest's `talk` step should target is that key with a trailing
 *        "_greeting" stripped (GameScene's own convention).
 * @param {string[]} [opts.quests] - auto-started on first entry.
 * @param {{targetMap:string,targetX:number,targetY:number,label:string}} [opts.forwardPortal]
 *        Placed as a gap in the east wall, row DOOR_ROW.
 * @returns {object} a complete map definition, same shape as every other
 *          file in this directory (see hermit_hut.js for the smallest real
 *          example this factory is modeled on).
 */
export function makeStubMap({
    id, displayName, chapterTitle, signText,
    npcs = [], quests = [], forwardPortal = null,
}) {
    const tiles = [];
    for (let y = 0; y < HEIGHT; y++) {
        const row = [];
        for (let x = 0; x < WIDTH; x++) {
            const border = x === 0 || x === WIDTH - 1 || y === 0 || y === HEIGHT - 1;
            const isDoorGap = forwardPortal && x === WIDTH - 1 && y === DOOR_ROW;
            row.push(border && !isDoorGap ? 1 : 0);
        }
        tiles.push(row);
    }

    const portals = [];
    if (forwardPortal) {
        portals.push({
            id: `${id}_forward`,
            x: WIDTH - 1, y: DOOR_ROW,
            label: forwardPortal.label,
            targetMap: forwardPortal.targetMap,
            targetX: forwardPortal.targetX,
            targetY: forwardPortal.targetY,
        });
    }

    return {
        id,
        displayName,
        tiles,
        lightTint: null,
        playerStart: { x: SPAWN_COL, y: SPAWN_ROW },
        portals,
        decorations: [],
        spawns: {
            enemies: [],
            npcs: npcs.map(n => ({
                x: n.x, y: n.y,
                dialogue: n.dialogue,
                afterDialogue: n.dialogue, // same lines replay on a second visit — fine for scaffolding
                name: n.name ?? 'Placeholder',
                spriteKey: 'spr_old_dude',
                animProfile: 'lpc_universal',
            })),
            chests: [],
            campfires: [],
            signs: [{ x: SPAWN_COL, y: 1, text: signText }],
            gatheringNodes: [],
            crackedBoulders: [],
            riftGates: [],
            pillarGates: [],
            boss: null,
        },
        currencyBias: 'rural',
        music: null,
        quests,
        chapterTitle,
        introDialogue: null,
        introRegistryKey: null,
    };
}
