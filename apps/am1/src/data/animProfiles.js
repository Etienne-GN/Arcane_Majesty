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
};
