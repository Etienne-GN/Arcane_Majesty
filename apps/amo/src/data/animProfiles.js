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

    // LPC wolf quadruped — split into two half-sheets:
    //   wolf_ud.png (320×384, 32×64/frame, 10 cols × 6 rows) — portrait frames for up/down
    //   wolf_lr.png (320×384, 64×32/frame,  5 cols × 12 rows) — landscape frames for left/right
    //
    // wolf_ud row layout (frame = row*10 + col):
    //   Row 0 (y=0-63):   6 frames, die animation
    //   Row 1 (y=64-127): 8 frames (cols 0-3,5-8), walk up
    //   Row 3 (y=192-255):10 frames (cols 0-9),    walk down
    //
    // wolf_lr row layout (frame = row*5 + col):
    //   Row 0  (y=0-31):   4 frames, die left
    //   Rows 3-4 (y=96-159): 10 frames/row, walk left
    //   Row 6  (y=192-223): 4 frames, die right
    //   Rows 9-10 (y=288-351):10 frames/row, walk right
    wolf_quad: {
        textures: {
            walk:   { up: 'spr_wolf_ud', down: 'spr_wolf_ud', left: 'spr_wolf_lr', right: 'spr_wolf_lr' },
            idle:   { up: 'spr_wolf_ud', down: 'spr_wolf_ud', left: 'spr_wolf_lr', right: 'spr_wolf_lr' },
            attack: { up: 'spr_wolf_ud', down: 'spr_wolf_ud', left: 'spr_wolf_lr', right: 'spr_wolf_lr' },
        },
        walk: {
            down:  [10, 11, 12, 13, 15, 16, 17, 18],               // wolf_ud row 1, cols 0-3,5-8
            up:    [30, 31, 32, 33, 34, 35, 36, 37, 38, 39],        // wolf_ud row 3, all 10 cols
            right: [15, 16, 17, 18, 19, 20, 21, 22, 23, 24],        // wolf_lr rows 3-4
            left:  [45, 46, 47, 48, 49, 50, 51, 52, 53, 54],        // wolf_lr rows 9-10
        },
        idle: { down: 11, up: 34, right: 17, left: 47 },
        attack: {
            down:  [10, 11, 12, 13, 15, 16, 17, 18],
            up:    [30, 31, 32, 33, 34],
            right: [15, 16, 17, 18, 19],
            left:  [45, 46, 47, 48, 49],
        },
        frameRate: { walk: 8, idle: 1, attack: 10 },
    },

    // Rabbit sheet — rabbit.png (288×576, 4 cols × 8 rows, 72×72)
    // Rows 0-3: walk up/left/down/right. Rows 4-7: idle up/left/down/right.
    lpc_rabbit: {
        frameWidth: 72, frameHeight: 72,
        walk: {
            up:    [0,  1,  2,  3],
            left:  [4,  5,  6,  7],
            down:  [8,  9,  10, 11],
            right: [12, 13, 14, 15],
        },
        idle:   { up: 16, left: 20, down: 24, right: 28 },
        attack: [8, 9],
        frameRate: { walk: 8, idle: 1, attack: 10 },
    },

    // LPC deer — deer_buck.png / deer_doe.png (256×384, 4 cols × 4 rows, 64×96)
    // Row order: up / left / right / down
    lpc_deer: {
        frameWidth:  64,
        frameHeight: 96,
        walk: {
            up:    [0,  1,  2,  3],
            left:  [4,  5,  6,  7],
            right: [8,  9,  10, 11],
            down:  [12, 13, 14, 15],
        },
        idle:   { up: 0, left: 4, right: 8, down: 12 },
        attack: { up: [0], left: [4], right: [8], down: [12] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // LPC fox — fox_woods.png (256×256, 4 cols × 4 rows, 64×64)
    // Row order: up / right / left / down  (row 1 = right, row 2 = left)
    lpc_fox: {
        frameWidth:  64,
        frameHeight: 64,
        walk: {
            up:    [0,  1,  2,  3],
            right: [4,  5,  6,  7],
            left:  [8,  9,  10, 11],
            down:  [12, 13, 14, 15],
        },
        idle:   { up: 0, right: 4, left: 8, down: 12 },
        attack: { up: [0], right: [4], left: [8], down: [12] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // LPC bear — bear_grizzly.png / bear_black.png (320×768, 5 cols × 12 rows, 64×64)
    // Row order: up/left/right/down — repeated for walk(0-3), attack(4-7), die(8-11)
    // Col 4 of every row is a pink padding frame — skip it
    lpc_bear: {
        frameWidth:  64,
        frameHeight: 64,
        walk: {
            up:    [0,  1,  2,  3],
            left:  [5,  6,  7,  8],
            right: [10, 11, 12, 13],
            down:  [15, 16, 17, 18],
        },
        idle:   { up: 0, left: 5, right: 10, down: 15 },
        attack: {
            up:    [20, 21, 22, 23],
            left:  [25, 26, 27, 28],
            right: [30, 31, 32, 33],
            down:  [35, 36, 37, 38],
        },
        frameRate: { walk: 8, idle: 1, attack: 12 },
    },

    // LPC giant rat — giant_rat.png (960×256, 12 cols × 4 rows, 80×64)
    // Row order: down / left / right / up
    // Per row: cols 0-3 = walk, 4-7 = attack, 8-11 = die
    lpc_giant_rat: {
        frameWidth:  80,
        frameHeight: 64,
        walk: {
            down:  [0,  1,  2,  3],
            left:  [12, 13, 14, 15],
            right: [24, 25, 26, 27],
            up:    [36, 37, 38, 39],
        },
        idle:   { down: 0, left: 12, right: 24, up: 36 },
        attack: {
            down:  [4,  5,  6,  7],
            left:  [16, 17, 18, 19],
            right: [28, 29, 30, 31],
            up:    [40, 41, 42, 43],
        },
        frameRate: { walk: 8, idle: 1, attack: 12 },
    },

    // LPC lion / lioness — lion.png / lioness.png (320×256, 5 cols × 4 rows, 64×64)
    // Walk only. Row order: up / left / right / down. Col 4 = pink padding, skip.
    lpc_lion: {
        frameWidth:  64,
        frameHeight: 64,
        walk: {
            up:    [0,  1,  2,  3],
            left:  [5,  6,  7,  8],
            right: [10, 11, 12, 13],
            down:  [15, 16, 17, 18],
        },
        idle:   { up: 0, left: 5, right: 10, down: 15 },
        attack: { up: [0], left: [5], right: [10], down: [15] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // LPC mouse — mouse_gray.png / mouse_white.png (128×128, 4 cols × 4 rows, 32×32)
    // Row 0: idle poses. Rows 1-3: walk left / right / down. No up walk — reuse down.
    lpc_mouse: {
        frameWidth:  32,
        frameHeight: 32,
        walk: {
            left:  [4,  5,  6,  7],
            right: [8,  9,  10, 11],
            down:  [12, 13, 14, 15],
            up:    [12, 13, 14, 15],
        },
        idle:   { left: 0, right: 1, down: 2, up: 2 },
        attack: { left: [4], right: [8], down: [12], up: [12] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // LPC mushroom walker — mushroom_walker.png / mushroom_walker_amanita.png (128×128, 4 cols × 4 rows, 32×32)
    // Row order: up / left / right / down
    lpc_mushroom: {
        frameWidth:  32,
        frameHeight: 32,
        walk: {
            up:    [0,  1,  2,  3],
            left:  [4,  5,  6,  7],
            right: [8,  9,  10, 11],
            down:  [12, 13, 14, 15],
        },
        idle:   { up: 0, left: 4, right: 8, down: 12 },
        attack: { up: [0], left: [4], right: [8], down: [12] },
        frameRate: { walk: 6, idle: 1, attack: 8 },
    },

    // LPC shark — shark.png (1120×640, 7 cols × 4 rows, 160×160)
    // Cols 0-3 = swim cycle. Row order: down / right / left / up
    lpc_shark: {
        frameWidth:  160,
        frameHeight: 160,
        walk: {
            down:  [0,  1,  2,  3],
            right: [7,  8,  9,  10],
            left:  [14, 15, 16, 17],
            up:    [21, 22, 23, 24],
        },
        idle:   { down: 0, right: 7, left: 14, up: 21 },
        attack: { down: [0], right: [7], left: [14], up: [21] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // LPC shiba dog — shiba.png (384×192, 8 cols × 4 rows, 48×48)
    // Cols 0-3 = walk. Row order: up / left / right / down
    lpc_shiba: {
        frameWidth:  48,
        frameHeight: 48,
        walk: {
            up:    [0,  1,  2,  3],
            left:  [8,  9,  10, 11],
            right: [16, 17, 18, 19],
            down:  [24, 25, 26, 27],
        },
        idle:   { up: 0, left: 8, right: 16, down: 24 },
        attack: { up: [0], left: [8], right: [16], down: [24] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // LPC birds — all bird sheets (96×256, 3 cols × 8 rows, 32×32)
    // Rows 0-3: fly cycle (up/left/right/down), 3 frames each
    // Rows 4-7: perched idle (up/left/right/down), 3 frames each
    lpc_bird: {
        frameWidth:  32,
        frameHeight: 32,
        walk: {
            up:    [0,  1,  2],
            left:  [3,  4,  5],
            right: [6,  7,  8],
            down:  [9,  10, 11],
        },
        idle:   { up: 12, left: 15, right: 18, down: 21 },
        attack: { up: [0], left: [3], right: [6], down: [9] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // LPC goat / turkey — 512×1024, 4 cols × 8 rows, 128×128/frame
    // Alternating idle/walk rows: row 0=idle-up, 1=walk-up, 2=idle-left, 3=walk-left,
    // 4=idle-down, 5=walk-down, 6=idle-right, 7=walk-right
    lpc_goat: {
        frameWidth:  128,
        frameHeight: 128,
        walk: {
            up:    [4,  5,  6,  7],
            left:  [12, 13, 14, 15],
            down:  [20, 21, 22, 23],
            right: [28, 29, 30, 31],
        },
        idle:   { up: 0, left: 8, down: 16, right: 24 },
        attack: { up: [0], left: [8], down: [16], right: [24] },
        frameRate: { walk: 8, idle: 1, attack: 8 },
    },

    // LPC Farm Animals — Daniel Eddeland (daneeklu), CC-BY 3.0 / GPL 2.0+
    // walk sheets: 512×512, 128×128/frame, 4c×4r — row0=down, row1=left, row2=up, row3=right
    // eat  sheets: same grid — forward=start eating, frames 2-3 loop for sustained grazing
    // graze sequence: [0,1,2,3,2,3,2,1,0] per direction (head down→up cycle)
    lpc_cow: {
        frameWidth: 128, frameHeight: 128,
        textures: { walk: 'spr_cow_walk', idle: 'spr_cow_walk', graze: 'spr_cow_eat' },
        walk:  { down:[0,1,2,3],   left:[4,5,6,7],     up:[8,9,10,11],   right:[12,13,14,15] },
        idle:  { down:0,           left:4,              up:8,             right:12 },
        graze: { down:[0,1,2,3,2,3,2,1,0], left:[4,5,6,7,6,7,6,5,4], up:[8,9,10,11,10,11,10,9,8], right:[12,13,14,15,14,15,14,13,12] },
        attack: { down:[0], left:[4], up:[8], right:[12] },
        frameRate: { walk:8, idle:1, graze:4, attack:8 },
    },
    lpc_llama: {
        frameWidth: 128, frameHeight: 128,
        textures: { walk: 'spr_llama_walk', idle: 'spr_llama_walk', graze: 'spr_llama_eat' },
        walk:  { down:[0,1,2,3],   left:[4,5,6,7],     up:[8,9,10,11],   right:[12,13,14,15] },
        idle:  { down:0,           left:4,              up:8,             right:12 },
        graze: { down:[0,1,2,3,2,3,2,1,0], left:[4,5,6,7,6,7,6,5,4], up:[8,9,10,11,10,11,10,9,8], right:[12,13,14,15,14,15,14,13,12] },
        attack: { down:[0], left:[4], up:[8], right:[12] },
        frameRate: { walk:8, idle:1, graze:4, attack:8 },
    },
    lpc_pig: {
        frameWidth: 128, frameHeight: 128,
        textures: { walk: 'spr_pig_walk', idle: 'spr_pig_walk', graze: 'spr_pig_eat' },
        walk:  { down:[0,1,2,3],   left:[4,5,6,7],     up:[8,9,10,11],   right:[12,13,14,15] },
        idle:  { down:0,           left:4,              up:8,             right:12 },
        graze: { down:[0,1,2,3,2,3,2,1,0], left:[4,5,6,7,6,7,6,5,4], up:[8,9,10,11,10,11,10,9,8], right:[12,13,14,15,14,15,14,13,12] },
        attack: { down:[0], left:[4], up:[8], right:[12] },
        frameRate: { walk:8, idle:1, graze:4, attack:8 },
    },
    lpc_sheep: {
        frameWidth: 128, frameHeight: 128,
        textures: { walk: 'spr_sheep_walk', idle: 'spr_sheep_walk', graze: 'spr_sheep_eat' },
        walk:  { down:[0,1,2,3],   left:[4,5,6,7],     up:[8,9,10,11],   right:[12,13,14,15] },
        idle:  { down:0,           left:4,              up:8,             right:12 },
        graze: { down:[0,1,2,3,2,3,2,1,0], left:[4,5,6,7,6,7,6,5,4], up:[8,9,10,11,10,11,10,9,8], right:[12,13,14,15,14,15,14,13,12] },
        attack: { down:[0], left:[4], up:[8], right:[12] },
        frameRate: { walk:8, idle:1, graze:4, attack:8 },
    },
    lpc_chicken: {
        frameWidth: 32, frameHeight: 32,
        textures: { walk: 'spr_chicken_walk', idle: 'spr_chicken_walk', graze: 'spr_chicken_eat' },
        walk:  { down:[0,1,2,3],   left:[4,5,6,7],     up:[8,9,10,11],   right:[12,13,14,15] },
        idle:  { down:0,           left:4,              up:8,             right:12 },
        graze: { down:[0,1,2,3,2,3,2,1,0], left:[4,5,6,7,6,7,6,5,4], up:[8,9,10,11,10,11,10,9,8], right:[12,13,14,15,14,15,14,13,12] },
        attack: { down:[0], left:[4], up:[8], right:[12] },
        frameRate: { walk:10, idle:1, graze:5, attack:8 },
    },

    // LPC spider — spider01-spider11.png (640×320, 10 cols × 5 rows, 64×64)
    // Cols 0-7 used per row (cols 8-9 are empty padding).
    // Row order: down / left / right / up. Row 4 = die (3 frames, cols 0-2).
    lpc_spider: {
        frameWidth:  64,
        frameHeight: 64,
        walk: {
            down:  [0,  1,  2,  3,  4,  5,  6,  7],   // row 0, cols 0-7
            left:  [10, 11, 12, 13, 14, 15, 16, 17],   // row 1
            right: [20, 21, 22, 23, 24, 25, 26, 27],   // row 2
            up:    [30, 31, 32, 33, 34, 35, 36, 37],   // row 3
        },
        idle:   { down: 0, left: 10, right: 20, up: 30 },
        attack: {
            down:  [0,  1,  2,  3],
            left:  [10, 11, 12, 13],
            right: [20, 21, 22, 23],
            up:    [30, 31, 32, 33],
        },
        die: [40, 41, 42],
        frameRate: { walk: 10, idle: 1, attack: 12, die: 8 },
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

    // LPC split-sheet characters — each character has 4 separate files:
    //   {id}_walk.png  (512×256, 8c×4r, 64×64) — up/left/down/right walk cycles, all 8 cols
    //   {id}_idle.png  (64×256,  1c×4r, 64×64) — one standing frame per direction (rows 0-3)
    //   {id}_slash.png (384×256, 6c×4r, 64×64) — 6-frame attack per direction
    //   {id}_spell.png (448×256, 7c×4r, 64×64) — 7-frame spellcast per direction
    lpc_kael: {
        frameWidth: 64, frameHeight: 64,
        textures: { walk: 'kael_walk', idle: 'kael_idle', attack: 'kael_slash', spellcast: 'kael_spell' },
        walk:      { up:[0,1,2,3,4,5,6,7], left:[8,9,10,11,12,13,14,15], down:[16,17,18,19,20,21,22,23], right:[24,25,26,27,28,29,30,31] },
        idle:      { up:0, left:1, down:2, right:3 },
        attack:    { up:[0,1,2,3,4,5], left:[6,7,8,9,10,11], down:[12,13,14,15,16,17], right:[18,19,20,21,22,23] },
        spellcast: { up:[0,1,2,3,4,5,6], left:[7,8,9,10,11,12,13], down:[14,15,16,17,18,19,20], right:[21,22,23,24,25,26,27] },
        frameRate: { walk:8, idle:2, attack:10, spellcast:8 },
    },
    lpc_anya: {
        frameWidth: 64, frameHeight: 64,
        textures: { walk: 'anya_walk', idle: 'anya_idle', attack: 'anya_slash', spellcast: 'anya_spell' },
        walk:      { up:[0,1,2,3,4,5,6,7], left:[8,9,10,11,12,13,14,15], down:[16,17,18,19,20,21,22,23], right:[24,25,26,27,28,29,30,31] },
        idle:      { up:0, left:1, down:2, right:3 },
        attack:    { up:[0,1,2,3,4,5], left:[6,7,8,9,10,11], down:[12,13,14,15,16,17], right:[18,19,20,21,22,23] },
        spellcast: { up:[0,1,2,3,4,5,6], left:[7,8,9,10,11,12,13], down:[14,15,16,17,18,19,20], right:[21,22,23,24,25,26,27] },
        frameRate: { walk:8, idle:2, attack:10, spellcast:8 },
    },
    lpc_seraphina: {
        frameWidth: 64, frameHeight: 64,
        textures: { walk: 'seraphina_walk', idle: 'seraphina_idle', attack: 'seraphina_slash', spellcast: 'seraphina_spell' },
        walk:      { up:[0,1,2,3,4,5,6,7], left:[8,9,10,11,12,13,14,15], down:[16,17,18,19,20,21,22,23], right:[24,25,26,27,28,29,30,31] },
        idle:      { up:0, left:1, down:2, right:3 },
        attack:    { up:[0,1,2,3,4,5], left:[6,7,8,9,10,11], down:[12,13,14,15,16,17], right:[18,19,20,21,22,23] },
        spellcast: { up:[0,1,2,3,4,5,6], left:[7,8,9,10,11,12,13], down:[14,15,16,17,18,19,20], right:[21,22,23,24,25,26,27] },
        frameRate: { walk:8, idle:2, attack:10, spellcast:8 },
    },
};
