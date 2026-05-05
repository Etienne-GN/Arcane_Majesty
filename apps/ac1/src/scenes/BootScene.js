import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
        // Loading bar
        const w = this.scale.width, h = this.scale.height;
        const barW = 200, barH = 10;
        const bx = (w - barW) / 2, by = h / 2 + 20;

        this.add.rectangle(w/2, h/2 - 20, 300, 40, 0x000000).setOrigin(0.5);
        this.add.text(w/2, h/2 - 30, 'ARCANE MAJESTY', { font: '18px monospace', fill: '#ffd700' }).setOrigin(0.5);
        this.add.text(w/2, h/2 - 8,  'Loading...', { font: '10px monospace', fill: '#aaaaaa' }).setOrigin(0.5);

        const barBg  = this.add.rectangle(bx, by, barW, barH, 0x222222).setOrigin(0);
        const barFg  = this.add.rectangle(bx, by, 0,    barH, 0x6644aa).setOrigin(0);

        this.load.on('progress', (v) => { barFg.width = barW * v; });

        // Player — Pipoya Male 08-1 (robed mage, RPG Maker 96×128, 32×32/frame)
        this.load.spritesheet('player', 'assets/characters/Male/Male 08-1.png', { frameWidth: 32, frameHeight: 32 });

        // Enemy sprites — 96×128, 32×32 per frame, RPG Maker layout (3 walk × 4 directions)
        this.load.spritesheet('spr_wisp',   'assets/characters/Enemy/Enemy 01-1.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('spr_scout',  'assets/characters/Enemy/Enemy 07-1.png', { frameWidth: 32, frameHeight: 32 });
        this.load.spritesheet('spr_treant', 'assets/characters/Enemy/Enemy 12-1.png', { frameWidth: 32, frameHeight: 32 });

        // NPC sprites
        this.load.spritesheet('spr_hermit', 'assets/characters/Male/Male 07-1.png',   { frameWidth: 32, frameHeight: 32 });

        // Tileset — base chip for world (256×4256, 32×32 per tile, 8 cols × 133 rows)
        this.load.image('tileset_base',  'assets/tilesets/SampleMap/[Base]BaseChip_pipo.png');
        this.load.image('tileset_grass', 'assets/tilesets/SampleMap/[A]Grass_pipo.png');

        // UI
        this.load.image('door1', 'assets/ui/doors/Door1_pipo.png');
    }

    create() {
        this._generateTextures();
        this.scene.start('MenuScene');
    }

    _generateTextures() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });

        // Floor tile — dark forest green with subtle variation dots
        g.fillStyle(0x1e3a14);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x1a3412);
        g.fillRect(3, 3, 2, 2);
        g.fillRect(18, 20, 3, 2);
        g.fillRect(26, 8, 2, 3);
        g.fillRect(10, 26, 2, 2);
        g.generateTexture('tile_floor', 32, 32);
        g.clear();

        // Path tile — lighter sandy dirt
        g.fillStyle(0x5a4a2a);
        g.fillRect(0, 0, 32, 32);
        g.fillStyle(0x4e4024);
        g.fillRect(4, 4, 3, 2);
        g.fillRect(20, 18, 2, 3);
        g.generateTexture('tile_path', 32, 32);
        g.clear();

        // Tree tile — dark canopy with brown trunk at base
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

        g.destroy();
    }
}
