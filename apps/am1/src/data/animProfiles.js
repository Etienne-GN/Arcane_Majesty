// Animation profile descriptors — maps sprite layout to Phaser animation frame arrays.
// A profile defines how to extract walk/idle/attack animations from a spritesheet.
// Swap the profile key on an entity to adopt a new sprite format without touching logic.

export const ANIM_PROFILES = {

    // Current placeholder sprites — RPG Maker VX-style 3×4 walk sheet (96×128 px, 32×32/frame)
    // Frame index grid:   down(0-2)  left(3-5)  right(6-8)  up(9-11)
    rpgmaker_32: {
        frameWidth:  32,
        frameHeight: 32,
        walk: {
            down:  [1, 0, 1, 2],
            left:  [4, 3, 4, 5],
            right: [7, 6, 7, 8],
            up:    [10, 9, 10, 11],
        },
        idle:   { down: 1, left: 4, right: 7, up: 10 },
        attack: [1],
        frameRate: { walk: 6, idle: 1, attack: 12 },
    },

    // Full LPC universal sheet — 832×1344, 64×64/frame, 13 cols × 21 rows
    // Row order: spellcast(0-3) thrust(4-7) walk(8-11) slash(12-15) shoot(16-19) hurt(20)
    // Within each 4-row block: up / left / down / right
    // Walk rows 8-11, col 0 = idle pose, cols 1-8 = walk cycle
    lpc_universal: {
        frameWidth:  64,
        frameHeight: 64,
        walk: {
            up:    [105,106,107,108,109,110,111,112],  // row 8,  cols 1-8
            left:  [118,119,120,121,122,123,124,125],  // row 9
            down:  [131,132,133,134,135,136,137,138],  // row 10
            right: [144,145,146,147,148,149,150,151],  // row 11
        },
        idle:   { up: 104, left: 117, down: 130, right: 143 },
        attack: { up: [104], left: [117], down: [130], right: [143] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // Eldrin LPC sheets — 832×256 per file, 64×64/frame, 13 cols × 4 rows
    // Row order: 0=up  1=left  2=down  3=right
    // Col 0 of each row = idle standing pose; walk frames are cols 1-8 (9 frames)
    // 'textures' lets buildEntityAnims pull frames from the right sheet per anim type.
    lpc_eldrin: {
        frameWidth:  64,
        frameHeight: 64,
        textures: {
            walk:      'eldrin_walk',
            idle:      'eldrin_walk',      // reuses col 0 of the walk sheet
            attack:    'eldrin_slash',
            spellcast: 'eldrin_spellcast',
        },
        walk: {
            up:    [1,  2,  3,  4,  5,  6,  7,  8],   // row 0, cols 1-8
            left:  [14, 15, 16, 17, 18, 19, 20, 21],   // row 1, cols 1-8
            down:  [27, 28, 29, 30, 31, 32, 33, 34],   // row 2, cols 1-8
            right: [40, 41, 42, 43, 44, 45, 46, 47],   // row 3, cols 1-8
        },
        idle: { up: 0, left: 13, down: 26, right: 39 }, // col 0 of each row
        attack: {
            up:    [0,  1,  2,  3,  4,  5],   // slash row 0 — 6 frames
            left:  [13, 14, 15, 16, 17, 18],
            down:  [26, 27, 28, 29, 30, 31],
            right: [39, 40, 41, 42, 43, 44],
        },
        spellcast: {
            up:    [0,  1,  2,  3,  4,  5,  6],   // spellcast row 0 — 7 frames
            left:  [13, 14, 15, 16, 17, 18, 19],
            down:  [26, 27, 28, 29, 30, 31, 32],
            right: [39, 40, 41, 42, 43, 44, 45],
        },
        frameRate: { walk: 8, idle: 2, attack: 10, spellcast: 8 },
    },

    // LPC wolf quadruped — wolf.png (640×384, 10 cols × 6 rows, 64×64)
    // Rows 0-3 = quadruped walk, cols 3-9 (7 frames). LPC direction order: up/left/down/right.
    wolf_quad: {
        frameWidth:  64,
        frameHeight: 64,
        walk: {
            up:    [3,  4,  5,  6,  7,  8,  9],   // row 0, cols 3-9
            left:  [13, 14, 15, 16, 17, 18, 19],   // row 1
            down:  [23, 24, 25, 26, 27, 28, 29],   // row 2
            right: [33, 34, 35, 36, 37, 38, 39],   // row 3
        },
        idle:   { up: 3, left: 13, down: 23, right: 33 },
        attack: [23, 24, 25],
        frameRate: { walk: 10, idle: 1, attack: 12 },
    },

    // Rabbit sheet — rabbit.png (288×576, 4 cols × 9 rows, 72×64)
    // Rows 0-3: normal rabbit (up/left/down/right), rows 4-7: corrupted variant
    lpc_rabbit: {
        frameWidth: 72, frameHeight: 64,
        walk: {
            up:    [0,  1,  2,  3],
            left:  [4,  5,  6,  7],
            down:  [8,  9,  10, 11],
            right: [12, 13, 14, 15],
        },
        idle:   { up: 0, left: 4, down: 8, right: 12 },
        attack: [8, 9],
        frameRate: { walk: 8, idle: 1, attack: 10 },
    },

    lpc_corrupted_rabbit: {
        frameWidth: 72, frameHeight: 64,
        walk: {
            up:    [16, 17, 18, 19],
            left:  [20, 21, 22, 23],
            down:  [24, 25, 26, 27],
            right: [28, 29, 30, 31],
        },
        idle:   { up: 16, left: 20, down: 24, right: 28 },
        attack: [24, 25],
        frameRate: { walk: 8, idle: 1, attack: 10 },
    },

    // LPC boar walk — boar_walk.png (256×256, 4 cols × 4 rows, 64×64)
    // Row order: south (down) / east (right) / north (up) / west (left)
    lpc_boar: {
        frameWidth:  64,
        frameHeight: 64,
        walk: {
            down:  [0,  1,  2,  3],
            right: [4,  5,  6,  7],
            up:    [8,  9,  10, 11],
            left:  [12, 13, 14, 15],
        },
        idle:   { down: 0, right: 4, up: 8, left: 12 },
        attack: [0, 1, 2],
        frameRate: { walk: 8, idle: 1, attack: 12 },
    },
};
