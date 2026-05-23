import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
        // Loading bar
        const w = this.scale.width, h = this.scale.height;
        const barW = 200, barH = 10;
        const bx = (w - barW) / 2, by = h / 2 + 20;

        this.add.rectangle(w/2, h/2 - 20, 500, 70, 0x000000).setOrigin(0.5);
        this.add.text(w/2, h/2 - 38, 'ARCANE MAJESTY', { font: '36px monospace', fill: '#ffd700' }).setOrigin(0.5);
        this.add.text(w/2, h/2 + 6,  'Loading...', { font: '20px monospace', fill: '#aaaaaa' }).setOrigin(0.5);

        const barBg  = this.add.rectangle(bx, by, barW, barH, 0x222222).setOrigin(0);
        const barFg  = this.add.rectangle(bx, by, 0,    barH, 0x6644aa).setOrigin(0);

        this.load.on('progress', (v) => { barFg.width = barW * v; });

        // Player — Eldrin LPC sheets (832×256, 64×64/frame, 13 cols × 4 rows)
        this.load.spritesheet('eldrin_walk',      'assets/characters/eldrin_walk.png',      { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('eldrin_spellcast', 'assets/characters/eldrin_spellcast.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('eldrin_slash',     'assets/characters/eldrin_slash.png',     { frameWidth: 64, frameHeight: 64 });

        // Kael — LPC split sheets (walk 512×256, idle 64×256, slash 384×256, spell 448×256)
        this.load.spritesheet('kael_walk',  'assets/characters/kael_walk.png',  { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('kael_idle',  'assets/characters/kael_idle.png',  { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('kael_slash', 'assets/characters/kael_slash.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('kael_spell', 'assets/characters/kael_spell.png', { frameWidth: 64, frameHeight: 64 });

        // Anya — same layout
        this.load.spritesheet('anya_walk',  'assets/characters/anya_walk.png',  { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('anya_idle',  'assets/characters/anya_idle.png',  { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('anya_slash', 'assets/characters/anya_slash.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('anya_spell', 'assets/characters/anya_spell.png', { frameWidth: 64, frameHeight: 64 });

        // Seraphina — same layout
        this.load.spritesheet('seraphina_walk',  'assets/characters/seraphina_walk.png',  { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('seraphina_idle',  'assets/characters/seraphina_idle.png',  { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('seraphina_slash', 'assets/characters/seraphina_slash.png', { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('seraphina_spell', 'assets/characters/seraphina_spell.png', { frameWidth: 64, frameHeight: 64 });

        // Enemy sprites — 96×128, 32×32 per frame, RPG Maker layout (3 walk × 4 directions)
        this.load.spritesheet('spr_wisp',          'assets/characters/Enemy/Enemy 01-1.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('spr_shadow_sprite', 'assets/characters/Enemy/Enemy 04-1.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('spr_void_stalker',  'assets/characters/Enemy/Enemy 06-1.png', { frameWidth: 32, frameHeight: 32 });
        // Animal sprites
        this.load.spritesheet('spr_wolf_ud', 'assets/characters/Animal/wolf_ud.png', { frameWidth: 32, frameHeight: 64 }); // up/down portrait frames
        this.load.spritesheet('spr_wolf_lr', 'assets/characters/Animal/wolf_lr.png', { frameWidth: 64, frameHeight: 32 }); // left/right landscape frames
        this.load.spritesheet('spr_boar',        'assets/characters/Animal/boar_walk.png',    { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('spr_rabbit',      'assets/characters/Animal/rabbit.png',       { frameWidth: 72, frameHeight: 72 });
        this.load.spritesheet('spr_deer_buck',   'assets/characters/Animal/deer_buck.png',    { frameWidth: 64, frameHeight: 96 });
        this.load.spritesheet('spr_deer_doe',    'assets/characters/Animal/deer_doe.png',     { frameWidth: 64, frameHeight: 96 });
        this.load.spritesheet('spr_fox',         'assets/characters/Animal/fox_woods.png',    { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('spr_bear_grizzly',  'assets/characters/Animal/bear_grizzly.png',          { frameWidth: 64,  frameHeight: 64  });
        this.load.spritesheet('spr_bear_black',    'assets/characters/Animal/bear_black.png',            { frameWidth: 64,  frameHeight: 64  });
        this.load.spritesheet('spr_bear_polar',    'assets/characters/Animal/bear_polar.png',            { frameWidth: 64,  frameHeight: 64  });
        this.load.spritesheet('spr_giant_rat',     'assets/characters/Animal/giant_rat.png',             { frameWidth: 80,  frameHeight: 64  });
        this.load.spritesheet('spr_deer_dark_buck','assets/characters/Animal/deer_dark_buck.png',        { frameWidth: 64,  frameHeight: 96  });
        this.load.spritesheet('spr_deer_dark_doe', 'assets/characters/Animal/deer_dark_doe.png',         { frameWidth: 64,  frameHeight: 96  });
        this.load.spritesheet('spr_fox_arctic',    'assets/characters/Animal/fox_arctic.png',            { frameWidth: 64,  frameHeight: 64  });
        this.load.spritesheet('spr_lion',          'assets/characters/Animal/lion.png',                  { frameWidth: 64,  frameHeight: 64  });
        this.load.spritesheet('spr_lioness',       'assets/characters/Animal/lioness.png',               { frameWidth: 64,  frameHeight: 64  });
        this.load.spritesheet('spr_mouse_gray',    'assets/characters/Animal/mouse_gray.png',            { frameWidth: 32,  frameHeight: 32  });
        this.load.spritesheet('spr_mouse_white',   'assets/characters/Animal/mouse_white.png',           { frameWidth: 32,  frameHeight: 32  });
        this.load.spritesheet('spr_mushroom',      'assets/characters/Animal/mushroom_walker.png',       { frameWidth: 32,  frameHeight: 32  });
        this.load.spritesheet('spr_mushroom_red',  'assets/characters/Animal/mushroom_walker_amanita.png',{ frameWidth: 32, frameHeight: 32  });
        this.load.spritesheet('spr_shark',         'assets/characters/Animal/shark.png',                 { frameWidth: 160, frameHeight: 160 });
        this.load.spritesheet('spr_shiba',         'assets/characters/Animal/shiba.png',                 { frameWidth: 48,  frameHeight: 48  });
        this.load.spritesheet('spr_goat',          'assets/characters/Animal/goat.png',                  { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('spr_turkey',        'assets/characters/Animal/turkey.png',                { frameWidth: 128, frameHeight: 128 });
        // LPC Farm Animals — Daniel Eddeland (daneeklu), CC-BY 3.0 / GPL 2.0+
        // 512×512, 128×128/frame, 4c×4r: row0=down row1=left row2=up row3=right
        this.load.spritesheet('spr_cow_walk',   'assets/characters/Animal/cow_walk.png',   { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('spr_cow_eat',    'assets/characters/Animal/cow_eat.png',    { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('spr_llama_walk', 'assets/characters/Animal/llama_walk.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('spr_llama_eat',  'assets/characters/Animal/llama_eat.png',  { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('spr_pig_walk',   'assets/characters/Animal/pig_walk.png',   { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('spr_pig_eat',    'assets/characters/Animal/pig_eat.png',    { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('spr_sheep_walk', 'assets/characters/Animal/sheep_walk.png', { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('spr_sheep_eat',  'assets/characters/Animal/sheep_eat.png',  { frameWidth: 128, frameHeight: 128 });
        // 128×128, 32×32/frame, 4c×4r — same row order
        this.load.spritesheet('spr_chicken_walk', 'assets/characters/Animal/chicken_walk.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('spr_chicken_eat',  'assets/characters/Animal/chicken_eat.png',  { frameWidth: 32, frameHeight: 32 });
        // Birds — LPC Birds pack (96×256, 32×32/frame, 3 cols × 8 rows)
        const bird = (key, file) => this.load.spritesheet(key, `assets/characters/Bird/${file}`, { frameWidth: 32, frameHeight: 32 });
        bird('spr_bird_bluejay',    'bird_1_bluejay.png');
        bird('spr_bird_brown_sm',   'bird_1_brown.png');
        bird('spr_bird_red_sm',     'bird_1_red.png');
        bird('spr_bird_crest',      'bird_1_white_crest.png');
        bird('spr_bird_white_sm',   'bird_1_white.png');
        bird('spr_bird_black',      'bird_2_black.png');
        bird('spr_bird_blue',       'bird_2_blue.png');
        bird('spr_bird_brown',      'bird_2_brown_1.png');
        bird('spr_bird_brown2',     'bird_2_brown_2.png');
        bird('spr_bird_cardinal',   'bird_2_cardinal.png');
        bird('spr_bird_eagle',      'bird_2_eagle.png');
        bird('spr_bird_red',        'bird_2_red.png');
        bird('spr_bird_white',      'bird_2_white.png');
        bird('spr_bird_robin',      'bird_3_robin.png');
        bird('spr_bird_sparrow',    'bird_3_sparrow.png');
        // Spiders — LPC Spiders pack (640×320, 80×64/frame, 11 colour variants)
        const spider = (key, file) => this.load.spritesheet(key, `assets/characters/Enemy/${file}`, { frameWidth: 64, frameHeight: 64 });
        spider('spr_spider_01', 'spider01.png');
        spider('spr_spider_02', 'spider02.png');
        spider('spr_spider_03', 'spider03.png');
        spider('spr_spider_04', 'spider04.png');
        spider('spr_spider_05', 'spider05.png');
        spider('spr_spider_06', 'spider06.png');
        spider('spr_spider_07', 'spider07.png');
        spider('spr_spider_08', 'spider08.png');
        spider('spr_spider_09', 'spider09.png');
        spider('spr_spider_10', 'spider10.png');
        spider('spr_spider_11', 'spider11.png');
        this.load.spritesheet('spr_scout',         'assets/characters/Enemy/Enemy 07-1.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('spr_treant',        'assets/characters/Enemy/Enemy 12-1.png', { frameWidth: 32, frameHeight: 32 });

        // NPC sprites
        this.load.spritesheet('spr_hermit',   'assets/characters/Male/Male 07-1.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('spr_old_dude',  'assets/characters/spr_old_dude.png',   { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('spr_merchant',  'assets/characters/spr_merchant.png',  { frameWidth: 64, frameHeight: 64 });

        // Boss sprite — 288×384, 96×96/frame, 3 cols × 4 rows (4 boss types, 3 walk frames each)
        this.load.spritesheet('spr_boss', 'assets/characters/Boss/Boss 01.png', { frameWidth: 96, frameHeight: 96 });

        // VFX — light pillar: 960×384, 192×192/frame, 5 cols × 2 rows = 10 frames
        this.load.spritesheet('vfx_pillar', 'assets/vfx/light_pillar/pipo-mapeffect013a.png', { frameWidth: 192, frameHeight: 192 });

        // Tileset — base chip for world (256×4256, 32×32 per tile, 8 cols × 133 rows)
        this.load.image('tileset_base',  'assets/tilesets/SampleMap/[Base]BaseChip_pipo.png');
        this.load.image('tileset_grass', 'assets/tilesets/SampleMap/[A]Grass_pipo.png');
        // LPC tree visuals — trunk (192×96, 2×1 @ 96×96) and treetop (192×224, 2×2 @ 96×112)
        this.load.spritesheet('lpc_trunk',    'assets/tilesets/lpc/trunk.png',   { frameWidth: 96, frameHeight: 96  });
        this.load.spritesheet('lpc_treetop',  'assets/tilesets/lpc/treetop.png', { frameWidth: 96, frameHeight: 112 });

        // UI
        this.load.image('door1', 'assets/ui/doors/Door1_pipo.png');

        // Item icons (16×16 pixel art — Free RPG Asset Pack by ssugmi)
        const itm = (key, file) => this.load.image(key, `assets/items/${file}`);
        itm('itm_hp_potion',    'hp_potion.png');
        itm('itm_mana_potion',  'mana_potion.png');
        itm('itm_herb',         'herb.png');
        itm('itm_scroll',       'scroll_leather.png');
        itm('itm_wooden_box',   'wooden_box.png');
        itm('itm_log',          'log.png');
        itm('itm_iron_ore',     'iron_ore.png');
        itm('itm_copper_ore',   'copper_ore.png');
        itm('itm_meat',         'meat.png');
        itm('itm_fur',          'fur_a.png');
        itm('itm_glowing_dust', 'glowing_dust.png');
        itm('itm_mushroom',     'green_mushroom.png');
        itm('itm_stone',        'stone.png');
        itm('itm_sandwich',     'sandwich.png');
        itm('itm_fish',         'fish_a.png');
        itm('itm_feather',      'feather_a.png');
        itm('itm_ring_01',      'ring_01.png');
        itm('itm_ring_02',      'ring_02.png');
        itm('itm_necklace_01',  'necklace_01.png');
        itm('itm_necklace_02',  'necklace_02.png');
        itm('itm_leather_armor','leather_armor.png');
        itm('itm_iron_armor',   'iron_armor.png');
        itm('itm_sword_01',     'sword_01.png');
        itm('itm_sword_02',     'sword_02.png');
        itm('itm_stone_sword',  'stone_sword.png');
        itm('itm_headgear_01',  'headgear_01.png');
        itm('itm_mantua',       'mantua.png');
        itm('itm_pouch',        'pouch.png');
        itm('itm_pickaxe',      'hi_quality_pickaxe.png');
        itm('itm_scythe',       'hi_quality_scethe.png');
        itm('itm_wand_01',      'wand_01.png');
        itm('itm_wand_02',      'wand_02.png');
        itm('itm_bow_01',       'bow_01.png');
        itm('itm_bow_02',       'bow_02.png');
        itm('itm_book',         'book.png');
        itm('itm_compass',      'compass.png');

        this.load.image('menu_bg', 'assets/game_cover.png');
    }

    create() {
        this._generateTextures();
        this._createVfxAnims();
        this.scene.start('MenuScene');
    }

    _createVfxAnims() {
        // Light pillar: 10 frames (5 cols × 2 rows, 192×192 each)
        this.anims.create({
            key: 'vfx_pillar',
            frames: this.anims.generateFrameNumbers('vfx_pillar', { start: 0, end: 9 }),
            frameRate: 12,
            repeat: 0
        });
    }

    _generateTextures() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        // Tree tile (wall sprite) — dark canopy with brown trunk at base
        g.fillStyle(0x0e2a0a);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x163d10);
        g.fillRect(2, 2, 28, 20);
        g.fillStyle(0x5c3a14);  // trunk
        g.fillRect(11, 20, 10, 12);
        g.fillStyle(0x0a200a);
        g.fillRect(4, 4, 8, 8);
        g.fillRect(20, 6, 7, 7);
        g.generateTexture('tile_tree', 32, 32);
        g.clear();

        // Enemy — dark purple/red shadow creature
        g.fillStyle(0x3a0a3a);
        g.fillRect(4, 8, 24, 20);
        g.fillStyle(0x660066);
        g.fillRect(6, 6, 20, 18);
        g.fillStyle(0xcc0044);  // glowing eyes
        g.fillRect(9, 10, 4, 4);
        g.fillRect(19, 10, 4, 4);
        g.fillStyle(0xff2266);
        g.fillRect(10, 11, 2, 2);
        g.fillRect(20, 11, 2, 2);
        g.generateTexture('enemy', 32, 32);
        g.clear();

        // NPC — robed figure (hermit)
        g.fillStyle(0x555533);  // robe
        g.fillRect(8, 10, 16, 20);
        g.fillStyle(0xccaa77);  // skin/face
        g.fillRect(10, 6, 12, 10);
        g.fillStyle(0x887744);  // hood
        g.fillRect(6, 4, 20, 8);
        g.fillStyle(0x666644);  // staff
        g.fillRect(24, 8, 3, 22);
        g.generateTexture('npc', 32, 32);
        g.clear();

        // Chest — golden
        g.fillStyle(0x7a5500);
        g.fillRect(4, 12, 24, 16);
        g.fillStyle(0xcc8800);
        g.fillRect(4, 10, 24, 6);
        g.fillStyle(0xffcc00);  // latch
        g.fillRect(13, 12, 6, 6);
        g.fillStyle(0xffaa00);
        g.fillRect(6, 12, 2, 14);
        g.fillRect(24, 12, 2, 14);
        g.generateTexture('chest', 32, 32);
        g.clear();

        // Item pickup glow
        g.fillStyle(0x88ffaa);
        g.fillCircle(16, 16, 8);
        g.fillStyle(0xffffff);
        g.fillCircle(13, 13, 3);
        g.generateTexture('item_pickup', 32, 32);
        g.clear();

        // Campfire
        g.fillStyle(0x3a2200);   // ground ring
        g.fillRect(8, 18, 16, 8);
        g.fillStyle(0x885500);   // logs
        g.fillRect(9, 20, 14, 4);
        g.fillStyle(0xff6600);   // fire base
        g.fillRect(12, 10, 8, 12);
        g.fillStyle(0xffaa00);   // fire mid
        g.fillRect(13, 8, 6, 8);
        g.fillStyle(0xffff88);   // fire tip
        g.fillRect(14, 6, 4, 5);
        g.generateTexture('campfire', 32, 32);
        g.clear();

        // Sign post
        g.fillStyle(0x5c3a14);   // post
        g.fillRect(14, 16, 4, 16);
        g.fillStyle(0x7a5022);   // sign board
        g.fillRect(4, 6, 24, 14);
        g.fillStyle(0x9a6a32);   // highlight edge
        g.fillRect(4, 6, 24, 2);
        g.fillRect(4, 6, 2, 14);
        g.fillStyle(0x4a2a0a);   // shadow edge
        g.fillRect(4, 18, 24, 2);
        g.fillRect(26, 6, 2, 14);
        // Horizontal line (text hint)
        g.fillStyle(0x3a1a00);
        g.fillRect(7, 10, 18, 1);
        g.fillRect(7, 13, 14, 1);
        g.generateTexture('sign_post', 32, 32);
        g.clear();

        // Small particle square (for hit sparks)
        g.fillStyle(0xffffff);
        g.fillRect(0, 0, 4, 4);
        g.generateTexture('particle', 4, 4);
        g.clear();

        // Wood pile (gathering node — logs)
        g.fillStyle(0x3a1a00);
        g.fillRect(2, 20, 28, 10);
        g.fillStyle(0x5c3a14);
        g.fillRect(4, 16, 10, 6);
        g.fillRect(17, 18, 9, 5);
        g.fillStyle(0x7a5022);
        g.fillRect(6, 14, 8, 4);
        g.fillStyle(0x4a2a0a);
        g.fillRect(2, 28, 28, 2);
        g.generateTexture('wood_pile', 32, 32);
        g.clear();

        // Mineral node (gathering node — rocky outcrop)
        g.fillStyle(0x333344);
        g.fillRect(4, 14, 24, 14);
        g.fillStyle(0x555566);
        g.fillRect(6, 10, 10, 8);
        g.fillRect(18, 12, 8, 6);
        g.fillStyle(0x8888aa);
        g.fillRect(8, 12, 5, 4);
        g.fillRect(20, 14, 3, 3);
        g.fillStyle(0xaaaacc);
        g.fillRect(9, 13, 2, 2);
        g.generateTexture('mineral_node', 32, 32);
        g.clear();

        g.destroy();
    }
}
