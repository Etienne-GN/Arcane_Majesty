import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import CombatManager from '../systems/CombatManager.js';
import { playerStats } from '../systems/PlayerStats.js';
import { SaveManager } from '../systems/SaveManager.js';
import { soundManager } from '../systems/SoundManager.js';
import { PROLOGUE_MAP, TILE_SIZE, PLAYER_START, ENEMY_SPAWNS, ENEMY_TYPES, NPC_POSITIONS, CHEST_POSITIONS, CAMPFIRE_POSITIONS, SIGN_POSITIONS } from '../data/worldMap.js';
import { DIALOGUES } from '../data/dialogues.js';

export default class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    create() {
        const mapCols = PROLOGUE_MAP[0].length;
        const mapRows = PROLOGUE_MAP.length;
        const mapW = mapCols * TILE_SIZE;
        const mapH = mapRows * TILE_SIZE;

        this.physics.world.setBounds(0, 0, mapW, mapH);

        // World
        this.wallGroup = this.physics.add.staticGroup();
        this._buildWorld(mapW, mapH);

        // Player
        const px = PLAYER_START.x * TILE_SIZE + TILE_SIZE / 2;
        const py = PLAYER_START.y * TILE_SIZE + TILE_SIZE / 2;
        this.player = new Player(this, px, py);
        this.player.on('died', () => this._onPlayerDied());

        // Enemies
        this.enemies = this.physics.add.group({ runChildUpdate: false });
        ENEMY_SPAWNS.forEach(spawn => {
            const ex = spawn.x * TILE_SIZE + TILE_SIZE / 2;
            const ey = spawn.y * TILE_SIZE + TILE_SIZE / 2;
            const typeDef = ENEMY_TYPES[spawn.type] ?? {};
            const enemy = new Enemy(this, ex, ey, typeDef);

            enemy.on('died', (xp) => {
                playerStats.gainXp(xp);
                this._spawnXpText(enemy.x, enemy.y, xp);
                this._checkLevelUp();
                SaveManager.save(playerStats);
            });

            enemy.on('gold', (amount) => {
                playerStats.gold += amount;
                const txt = this.add.text(enemy.x + 8, enemy.y - 10, `+${amount}g`, {
                    font: 'bold 10px monospace', fill: '#ffcc00',
                    stroke: '#000', strokeThickness: 2
                }).setDepth(100).setOrigin(0.5);
                this.tweens.add({ targets: txt, y: txt.y - 22, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
            });

            enemy.on('dropped', (ex2, ey2, itemIds) => {
                itemIds.forEach((id, i) => this._spawnPickup(ex2 + i * 14, ey2, id));
            });

            this.enemies.add(enemy);
        });

        // Campfires
        this.campfires = this.physics.add.staticGroup();
        CAMPFIRE_POSITIONS.forEach(cf => {
            const cx = cf.x * TILE_SIZE + TILE_SIZE / 2;
            const cy = cf.y * TILE_SIZE + TILE_SIZE / 2;
            const sprite = this.campfires.create(cx, cy, 'campfire');
            sprite.setDepth(6);
            sprite.body.setSize(20, 16);
            sprite.healed = false;

            // Animated glow
            this.tweens.add({ targets: sprite, alpha: 0.75, yoyo: true, repeat: -1, duration: 400 + Math.random() * 200, ease: 'Sine.easeInOut' });

            // Fire particle emitter
            this.add.particles(cx, cy - 10, 'particle', {
                speed: { min: 8, max: 22 },
                angle: { min: 250, max: 290 },
                scale: { start: 0.8, end: 0 },
                lifespan: { min: 300, max: 600 },
                tint: [0xff6600, 0xffaa00, 0xffff44],
                quantity: 1,
                frequency: 60,
            }).setDepth(7);

            sprite.ePrompt = this.add.text(cx, cy - TILE_SIZE / 2 - 4, '[E] Rest', {
                font: '7px monospace', fill: '#ffbb44'
            }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);
        });

        // Sign posts
        this.signs = this.physics.add.staticGroup();
        SIGN_POSITIONS.forEach(sign => {
            const sx = sign.x * TILE_SIZE + TILE_SIZE / 2;
            const sy = sign.y * TILE_SIZE + TILE_SIZE / 2;
            const sprite = this.signs.create(sx, sy, 'sign_post');
            sprite.setDepth(6);
            sprite.signText = sign.text;
            sprite.ePrompt = this.add.text(sx, sy - TILE_SIZE / 2 - 4, '[E]', {
                font: '7px monospace', fill: '#ffff88'
            }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);
        });

        // Item pickups group
        this.pickups = this.physics.add.group();
        this.physics.add.overlap(this.player, this.pickups, (player, pickup) => {
            playerStats.addItem(pickup.itemId);
            soundManager.collect();
            const ui = this.scene.get('UIScene');
            ui?.showNotification?.(`Picked up ${pickup.itemId.replace(/_/g, ' ')}`, 1500);
            pickup.destroy();
        });

        // NPCs — use real sprite, idle animation from RPG Maker layout
        this._ensureNpcAnims('spr_hermit');
        this.npcs = this.physics.add.staticGroup();
        NPC_POSITIONS.forEach(def => {
            const nx = def.x * TILE_SIZE + TILE_SIZE / 2;
            const ny = def.y * TILE_SIZE + TILE_SIZE / 2;
            const sprite = this.npcs.create(nx, ny, 'spr_hermit', 1);
            sprite.setDepth(8);
            sprite.npcDef = def;
            sprite.talked = false;
            sprite.body.setSize(20, 20);

            // Gentle idle bob
            sprite.play('spr_hermit_idle');
            this.tweens.add({ targets: sprite, y: ny - 2, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });

            this.add.text(nx, ny - TILE_SIZE / 2 - 2, def.name, {
                font: '7px monospace', fill: '#aaffaa', stroke: '#000', strokeThickness: 1
            }).setOrigin(0.5, 1).setDepth(25);

            sprite.ePrompt = this.add.text(nx, ny - TILE_SIZE / 2 - 12, '[E]', {
                font: '7px monospace', fill: '#ffff88'
            }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);
        });

        // Chests
        this.chests = this.physics.add.staticGroup();
        CHEST_POSITIONS.forEach(def => {
            const cx = def.x * TILE_SIZE + TILE_SIZE / 2;
            const cy = def.y * TILE_SIZE + TILE_SIZE / 2;
            const sprite = this.chests.create(cx, cy, 'chest');
            sprite.setDepth(8);
            sprite.chestDef = def;
            sprite.opened = false;

            sprite.ePrompt = this.add.text(cx, cy - TILE_SIZE / 2 - 4, '[E]', {
                font: '7px monospace', fill: '#ffff88'
            }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);
        });

        // Physics
        this.physics.add.collider(this.player, this.wallGroup);
        this.physics.add.collider(this.enemies, this.wallGroup);
        this.physics.add.collider(this.pickups, this.wallGroup);
        this.physics.add.collider(this.player, this.campfires);
        this.physics.add.collider(this.player, this.signs);

        // Combat
        this.combatManager = new CombatManager(this, this.player, this.enemies);

        // Camera
        this.cameras.main.setBounds(0, 0, mapW, mapH);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up:    Phaser.Input.Keyboard.KeyCodes.W,
            down:  Phaser.Input.Keyboard.KeyCodes.S,
            left:  Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        this.attackKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.interactKey  = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.powerKey     = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

        this.input.keyboard.on('keydown-K', () => { this.scene.pause(); this.scene.launch('SkillTreeScene'); });
        this.input.keyboard.on('keydown-I', () => { this.scene.pause(); this.scene.launch('InventoryScene'); });
        this.input.keyboard.on('keydown-ESC', () => {
            SaveManager.save(playerStats);
            soundManager.save();
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
        });

        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');

        this._lastLevel = playerStats.level;

        // Ambient firefly particles
        this._spawnFireflies(mapW, mapH);

        // Chapter title card
        this._showChapterTitle('Prologue: The Forest Hunt');

        // Intro dialogue on first play
        if (!this.registry.get('prologueSeen')) {
            this.registry.set('prologueSeen', true);
            this.time.delayedCall(700, () => {
                this.scene.pause();
                this.scene.launch('DialogueScene', { lines: DIALOGUES['eldrin_premonition'] });
            });
        }
    }

    _ensureNpcAnims(key) {
        const anims = this.anims;
        if (anims.exists(`${key}_idle`)) return;
        // RPG Maker 3×4 layout: frame 1 = idle down, frame 4 = idle left, etc.
        anims.create({ key: `${key}_idle`,       frames: [{ key, frame: 1 }], frameRate: 1 });
        anims.create({ key: `${key}_walk_down`,  frames: anims.generateFrameNumbers(key, { frames: [1,0,1,2] }), frameRate: 6, repeat: -1 });
        anims.create({ key: `${key}_walk_left`,  frames: anims.generateFrameNumbers(key, { frames: [4,3,4,5] }), frameRate: 6, repeat: -1 });
        anims.create({ key: `${key}_walk_right`, frames: anims.generateFrameNumbers(key, { frames: [7,6,7,8] }), frameRate: 6, repeat: -1 });
        anims.create({ key: `${key}_walk_up`,    frames: anims.generateFrameNumbers(key, { frames: [10,9,10,11] }), frameRate: 6, repeat: -1 });
    }

    _buildWorld(mapW, mapH) {
        this.add.tileSprite(0, 0, mapW, mapH, 'tile_floor').setOrigin(0).setDepth(0);

        PROLOGUE_MAP.forEach((row, r) => {
            row.forEach((tile, c) => {
                const x = c * TILE_SIZE + TILE_SIZE / 2;
                const y = r * TILE_SIZE + TILE_SIZE / 2;
                if (tile === 1) {
                    const wall = this.wallGroup.create(x, y, 'tile_tree');
                    // Y-sort: trees higher on screen appear behind those lower
                    wall.setDepth(y + 0.5);
                    wall.refreshBody();
                } else if (tile === 2) {
                    this.add.image(x, y, 'tile_path').setDepth(1);
                }
            });
        });
    }

    update(time, delta) {
        if (!this.player?.active) return;

        this.player.update(this.cursors, this.wasd, this.attackKey, this.powerKey, delta);

        // Y-sort: update player depth every frame so they appear behind/in-front of trees correctly
        this.player.setDepth(this.player.y + 1);

        this.enemies.getChildren().forEach(e => {
            if (e.active) {
                e.update(this.player, delta);
                e.setDepth(e.y + 1);
                if (e.healthBar) e.healthBar.setDepth(e.y + 5);
            }
        });

        this._updateInteractPrompts();

        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this._checkInteractions();
        }
    }

    _updateInteractPrompts() {
        const range = 52;
        const px = this.player.x, py = this.player.y;
        const near = (obj) => Phaser.Math.Distance.Between(px, py, obj.x, obj.y) < range;

        this.npcs.getChildren().forEach(npc       => npc.ePrompt?.setAlpha(near(npc) ? 1 : 0));
        this.chests.getChildren().forEach(chest   => chest.ePrompt?.setAlpha(near(chest) && !chest.opened ? 1 : 0));
        this.campfires.getChildren().forEach(cf   => cf.ePrompt?.setAlpha(near(cf) ? 1 : 0));
        this.signs.getChildren().forEach(sign     => sign.ePrompt?.setAlpha(near(sign) ? 1 : 0));
    }

    _checkInteractions() {
        // NPC
        this.physics.overlap(this.player.interactBox, this.npcs, (box, npc) => {
            const def = npc.npcDef;
            const key = npc.talked ? def.afterDialogue : def.dialogue;
            const lines = DIALOGUES[key] ?? [{ speaker: def.name, text: '...' }];
            soundManager.interact();
            this.scene.pause();
            this.scene.launch('DialogueScene', {
                lines,
                onComplete: () => {
                    if (!npc.talked && def.reward) {
                        playerStats.addItem(def.reward);
                        soundManager.collect();
                        this.scene.get('UIScene')?.showNotification?.(`Received: ${def.reward.replace(/_/g, ' ')}`, 2000);
                    }
                    npc.talked = true;
                    SaveManager.save(playerStats);
                }
            });
        });

        // Campfire
        this.physics.overlap(this.player.interactBox, this.campfires, (box, cf) => {
            const healHp = Math.ceil((playerStats.maxHealth - playerStats.health) * 0.6);
            const healMp = Math.ceil((playerStats.maxMana - playerStats.mana) * 0.6);
            if (healHp === 0 && healMp === 0) {
                this.scene.pause();
                this.scene.launch('DialogueScene', { lines: [{ speaker: null, text: 'You sit by the fire. You feel rested, but you are already at full strength.' }] });
                return;
            }
            playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + healHp);
            playerStats.mana   = Math.min(playerStats.maxMana, playerStats.mana + healMp);
            soundManager.collect();
            SaveManager.save(playerStats);
            this.scene.pause();
            this.scene.launch('DialogueScene', {
                lines: [{ speaker: null, text: `You rest by the campfire. The warmth restores your strength.\n+${healHp} HP   +${healMp} MP` }]
            });
        });

        // Sign
        this.physics.overlap(this.player.interactBox, this.signs, (box, sign) => {
            soundManager.interact();
            this.scene.pause();
            this.scene.launch('DialogueScene', {
                lines: sign.signText.split('\n\n').map(t => ({ speaker: null, text: t }))
            });
        });

        // Chest
        this.physics.overlap(this.player.interactBox, this.chests, (box, chest) => {
            if (chest.opened) return;
            chest.opened = true;
            chest.setTint(0x777777);
            chest.ePrompt?.setAlpha(0);
            soundManager.openChest();
            chest.chestDef.items.forEach(id => playerStats.addItem(id));
            const itemNames = chest.chestDef.items.map(i => i.replace(/_/g, ' ')).join(', ');
            this.scene.pause();
            this.scene.launch('DialogueScene', {
                lines: [{ speaker: null, text: `You open the chest and find: ${itemNames}.` }],
                onComplete: () => SaveManager.save(playerStats)
            });
        });
    }

    _showChapterTitle(title) {
        // Fixed to camera — uses setScrollFactor(0)
        const w = this.scale.width, h = this.scale.height;
        const bar = this.add.rectangle(0, h / 2 - 14, w, 28, 0x000000, 0.75).setOrigin(0).setScrollFactor(0).setDepth(200).setAlpha(0);
        const txt = this.add.text(w / 2, h / 2, title, {
            font: 'bold 13px monospace', fill: '#ffd700',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

        this.tweens.add({
            targets: [bar, txt], alpha: 1, duration: 600, hold: 2200,
            yoyo: true, ease: 'Sine.easeInOut',
            onComplete: () => { bar.destroy(); txt.destroy(); }
        });
    }

    _spawnFireflies(mapW, mapH) {
        // Scattered ambient glow particles across the whole map
        for (let i = 0; i < 6; i++) {
            const fx = Phaser.Math.Between(TILE_SIZE * 2, mapW - TILE_SIZE * 2);
            const fy = Phaser.Math.Between(TILE_SIZE * 2, mapH - TILE_SIZE * 2);
            this.add.particles(fx, fy, 'particle', {
                speed: { min: 4, max: 12 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.6, end: 0 },
                lifespan: { min: 1200, max: 2400 },
                tint: [0x88ffaa, 0xaaffcc, 0xffff88],
                quantity: 1,
                frequency: 500 + i * 120,
                alpha: { start: 0.8, end: 0 },
            }).setDepth(3);
        }
    }

    _spawnPickup(x, y, itemId) {
        const pickup = this.pickups.create(x, y, 'item_pickup');
        pickup.setDepth(7);
        pickup.itemId = itemId;
        pickup.body.setAllowGravity(false);

        // Gentle bob
        this.tweens.add({
            targets: pickup, y: y - 6, yoyo: true, repeat: -1,
            duration: 700, ease: 'Sine.easeInOut'
        });
    }

    _spawnXpText(x, y, amount) {
        const text = this.add.text(x, y - 24, `+${amount} XP`, {
            font: 'bold 10px monospace', fill: '#cc88ff',
            stroke: '#000000', strokeThickness: 2
        }).setDepth(100).setOrigin(0.5);

        this.tweens.add({
            targets: text, y: y - 52, alpha: 0,
            duration: 900, ease: 'Power1',
            onComplete: () => text.destroy()
        });
    }

    _checkLevelUp() {
        if (playerStats.level > this._lastLevel) {
            this._lastLevel = playerStats.level;
            soundManager.levelUp();
            this.cameras.main.flash(400, 160, 80, 255);
            this.scene.get('UIScene')?.showNotification?.(`LEVEL UP! Now Level ${playerStats.level}`, 3000);
        }
    }

    _onPlayerDied() {
        this.cameras.main.flash(700, 255, 0, 0);
        this.time.delayedCall(1400, () => {
            this.scene.stop('UIScene');
            this.scene.stop();
            this.scene.start('GameOverScene');
        });
    }
}
