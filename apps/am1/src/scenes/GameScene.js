import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Enemy from '../entities/Enemy.js';
import BossEnemy from '../entities/BossEnemy.js';
import CombatManager from '../systems/CombatManager.js';
import { playerStats } from '../systems/PlayerStats.js';
import { SaveManager } from '../systems/SaveManager.js';
import { soundManager } from '../systems/SoundManager.js';
import { musicManager } from '../systems/MusicManager.js';
import { questManager } from '../systems/QuestManager.js';
import { ITEMS } from '../data/items.js';
import { PROLOGUE_MAP, TILE_SIZE, PLAYER_START, ENEMY_SPAWNS, ENEMY_TYPES, NPC_POSITIONS, CHEST_POSITIONS, CAMPFIRE_POSITIONS, SIGN_POSITIONS, BOSS_SPAWN, BOSS_ARENA_BOUNDS, CRACKED_BOULDER_POSITIONS, PILLAR_GATE_POSITIONS, RIFT_GATE_POSITIONS, GATHERING_NODES } from '../data/worldMap.js';
import { DIALOGUES } from '../data/dialogues.js';
import { SPELLS, TIER_NAMES, RESONANCE_GAINS } from '../data/spells.js';
import { statusManager } from '../systems/StatusManager.js';

export default class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    create() {
        // Patch add.particles so one-shot emitters (explode:true) auto-destroy
        // after their longest particle lifespan. Continuous emitters (frequency-
        // based, no explode flag) are unaffected.
        const _origParticles = this.add.particles.bind(this.add);
        this.add.particles = (x, y, key, config) => {
            const em = _origParticles(x, y, key, config);
            if (config?.explode) {
                const maxLife = config.lifespan?.max ?? config.lifespan ?? 1200;
                this.time.delayedCall(maxLife + 150, () => { if (em?.active) em.destroy(); });
            }
            return em;
        };

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

        // Debug mode — grant full progression for testing
        if (localStorage.getItem('am1_debug') === '1') this._applyDebugBoost();

        // Spell discovery notifications + quest hooks
        playerStats.onSpellEvent((id, level, isDiscovery) => {
            const spell = SPELLS[id];
            if (!spell) return;
            const tierName = TIER_NAMES[level - 1];
            const verb = isDiscovery ? 'comprehends' : 'deepens understanding of';
            const ui = this.scene.get('UIScene');
            ui?.showNotification?.(`Eldrin ${verb}:\n${spell.name} — ${tierName}`, 3500);
            soundManager.levelUp();
            this.cameras.main.flash(400, 100, 0, 200, true);
            // Trigger hidden quest for shadow_veil
            if (id === 'shadow_veil' && isDiscovery) questManager.startQuest('hidden_shadow_initiation');
            questManager.onSpellLearned(id);
        });

        // Resonance gain → quest hook + hidden quest trigger
        playerStats.onResonanceGain((element, value) => {
            questManager.onResonanceReached(element, value);
            if (element === 'arcane' && value >= 10 && !questManager.isActive('hidden_covenant_scholar') && !questManager.isCompleted('hidden_covenant_scholar')) {
                questManager.startQuest('hidden_covenant_scholar');
                this.scene.get('UIScene')?.showNotification?.('New hidden quest discovered!', 2500);
            }
        });

        // Auto-start main and side quests
        questManager.startQuest('main_forest_hunt');
        questManager.startQuest('side_supply_run');
        questManager.startQuest('side_read_the_signs');
        questManager.startQuest('side_corrupted_hunt');
        questManager.startQuest('side_hunters_larder');

        // Enemies
        this.enemies = this.physics.add.group({ runChildUpdate: false });
        ENEMY_SPAWNS.forEach(spawn => {
            const ex = spawn.x * TILE_SIZE + TILE_SIZE / 2;
            const ey = spawn.y * TILE_SIZE + TILE_SIZE / 2;
            this._spawnEnemy(spawn.type, ex, ey);
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
            const id = pickup.itemId;
            playerStats.addItem(id);
            soundManager.collect();
            const ui = this.scene.get('UIScene');
            ui?.showNotification?.(`Picked up ${id.replace(/_/g, ' ')}`, 1500);
            questManager.onPickup(id);
            if (id === 'void_shard' && !questManager.isActive('side_void_offering') && !questManager.isCompleted('side_void_offering')) {
                questManager.startQuest('side_void_offering');
                ui?.showNotification?.('New quest: The Hermit\'s Offering', 2000);
            }
            pickup.destroy();
        });

        // NPCs — use sprite key from def (default spr_hermit), tint optional
        const npcKeys = [...new Set(NPC_POSITIONS.map(d => d.spriteKey ?? 'spr_hermit'))];
        npcKeys.forEach(k => this._ensureNpcAnims(k));
        this.npcs = this.physics.add.staticGroup();
        NPC_POSITIONS.forEach(def => {
            const nx  = def.x * TILE_SIZE + TILE_SIZE / 2;
            const ny  = def.y * TILE_SIZE + TILE_SIZE / 2;
            const key = def.spriteKey ?? 'spr_hermit';
            const sprite = this.npcs.create(nx, ny, key, 1);
            sprite.setDepth(8);
            sprite.npcDef = def;
            sprite.talked = false;
            sprite.body.setSize(20, 20);
            if (def.tint) sprite.setTint(def.tint);

            sprite.play(`${key}_idle`);
            this.tweens.add({ targets: sprite, y: ny - 2, yoyo: true, repeat: -1, duration: 1200, ease: 'Sine.easeInOut' });

            const nameColor = def.isShop ? '#ffdd88' : '#aaffaa';
            this.add.text(nx, ny - TILE_SIZE / 2 - 2, def.name, {
                font: '7px monospace', fill: nameColor, stroke: '#000', strokeThickness: 1
            }).setOrigin(0.5, 1).setDepth(25);

            const promptLabel = def.isShop ? '[E] Shop' : '[E]';
            sprite.ePrompt = this.add.text(nx, ny - TILE_SIZE / 2 - 12, promptLabel, {
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

        // Gathering nodes — require iron_axe (wood) or iron_pickaxe (minerals)
        this.gatheringGroup = this.physics.add.staticGroup();
        GATHERING_NODES.forEach(def => {
            const nx  = def.x * TILE_SIZE + TILE_SIZE / 2;
            const ny  = def.y * TILE_SIZE + TILE_SIZE / 2;
            const key = def.type === 'wood' ? 'wood_pile' : 'mineral_node';
            const spr = this.gatheringGroup.create(nx, ny, key);
            spr.setDepth(ny + 0.5);
            spr.nodeDef  = def;
            spr.gathered = false;
            spr.ePrompt  = this.add.text(nx, ny - TILE_SIZE / 2 - 4, '[E]', {
                font: '7px monospace', fill: def.type === 'wood' ? '#886633' : '#667788'
            }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);
        });

        // Cracked boulders — Earth Pillar shatters them, revealing paths
        this.crackedBoulders = this.physics.add.staticGroup();
        CRACKED_BOULDER_POSITIONS.forEach(def => {
            const bx = def.x * TILE_SIZE + TILE_SIZE / 2;
            const by = def.y * TILE_SIZE + TILE_SIZE / 2;
            const spr = this.crackedBoulders.create(bx, by, 'tile_tree');
            spr.setTint(0x887744).setDepth(by + 0.5);
            spr.refreshBody();
            spr.isBreakable = true;
            spr.boulderDef = def;
            spr.ePrompt = this.add.text(bx, by - TILE_SIZE / 2 - 4, '[E]', {
                font: '7px monospace', fill: '#aa8844'
            }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);
        });

        // Boss
        this._bossArenaTriggered = false;
        this._bossDefeated = false;
        const bx = BOSS_SPAWN.x * TILE_SIZE + TILE_SIZE / 2;
        const by = BOSS_SPAWN.y * TILE_SIZE + TILE_SIZE / 2;
        this.boss = new BossEnemy(this, bx, by);
        this.boss.enemyType = 'void_general';

        this.boss.on('died', (xp) => {
            this._bossDefeated = true;
            playerStats.gainXp(xp);
            this._spawnXpText(bx, by, xp);
            this._checkLevelUp();
            Object.entries(RESONANCE_GAINS.kill_boss).forEach(([el, amt]) => playerStats.gainResonance(el, amt));
            questManager.onKill('void_general', {
                inVeil:     this.player._shadowVeilActive,
                weaponType: playerStats.activeWeaponType,
                isBoss:     true,
            });
            playerStats.trackKill('void_general');
            // Boss guaranteed drops: void_channel (T4 staff) + arcane_sceptre (T4 staff alt)
            this._spawnPickup(bx - 14, by + 10, 'void_channel');
            this._spawnPickup(bx + 14, by + 10, 'arcane_sceptre');
            SaveManager.save(playerStats);
            this.time.delayedCall(1200, () => {
                this.scene.pause();
                this.scene.launch('DialogueScene', { lines: DIALOGUES['boss_defeated'] });
            });
        });

        // Physics
        this.physics.add.collider(this.player, this.wallGroup);
        this.physics.add.collider(this.enemies, this.wallGroup);
        this.physics.add.collider(this.pickups, this.wallGroup);
        this.physics.add.collider(this.player, this.campfires);
        this.physics.add.collider(this.player, this.signs);
        this.physics.add.collider(this.player, this.crackedBoulders);
        this.physics.add.collider(this.enemies, this.crackedBoulders);

        // Combat — enemies group AND boss share the same attack hitbox check
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
        this.attackKey   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.powerKey    = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);

        // Skill bar slots — Q / R / F / T
        this.slotKeys = [
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.T),
        ];

        // Augmentation keys
        this.blinkKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.sightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.V);

        // Targeting state
        this._targeting   = false;
        this._targetSpell = null;
        this._reticle     = null;

        // Aetheric Sight state
        this._aethericSightActive = false;

        // Pillar ledge gates
        this._setupPillarGates();
        // Rift-Gates (save/fast-travel monoliths)
        this._setupRiftGates();

        // Pointer — confirm cast / tear / campfire placement, or cancel
        this.input.on('pointerdown', (ptr) => {
            const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
            if (ptr.rightButtonDown()) {
                this._cancelTargeting();
                this._cancelPlacement();
                return;
            }
            if (this._campfirePlacing) { this._confirmCampfire(wp.x, wp.y); return; }
            if (this._targeting) { this._confirmCast(wp.x, wp.y); }
        });

        // Campfire placement state
        this._campfirePlacing  = false;
        this._campfireReticle  = null;
        this._placedCampfires  = [];  // runtime campfire objects

        this.input.keyboard.on('keydown-K', () => { this.scene.pause(); this.scene.launch('SkillTreeScene'); });
        this.input.keyboard.on('keydown-J', () => { this.scene.pause(); this.scene.launch('SpellbookScene'); });
        this.input.keyboard.on('keydown-I', () => { this.scene.pause(); this.scene.launch('InventoryScene'); });
        this.input.keyboard.on('keydown-M', () => { this.scene.pause(); this.scene.launch('WorldMapScene'); });
        this.input.keyboard.on('keydown-N', () => { this.scene.pause(); this.scene.launch('QuestJournalScene'); });
        this.input.keyboard.on('keydown-L', () => { this.scene.pause(); this.scene.launch('CodexScene'); });
        this.input.keyboard.on('keydown-C', () => { this.scene.pause(); this.scene.launch('CraftingScene'); });
        this.input.keyboard.on('keydown-G', () => this._startAethericTear());
        this.input.keyboard.on('keydown-C', () => this._startCampfirePlacement());
        this.input.keyboard.on('keydown-ESC', () => {
            if (this._targeting) { this._cancelTargeting(); return; }
            SaveManager.save(playerStats);
            soundManager.save();
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
        });

        if (!this.scene.isActive('UIScene')) this.scene.launch('UIScene');

        this._lastLevel = playerStats.level;

        // Quest completion notifications
        questManager.onQuestEvent((questId, stepId, progress) => {
            if (progress === -1) {
                this.scene.get('UIScene')?.showNotification?.(`Quest complete!\n${questId.replace(/_/g,' ')}`, 3500);
                soundManager.levelUp();
                this.cameras.main.flash(300, 160, 200, 80, true);
            } else if (stepId) {
                this.scene.get('UIScene')?.showNotification?.('Quest updated — open QUEST in menu', 1600);
            }
        });

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

        // Start procedural music (mood updates every 500ms from update())
        this._musicMoodTimer = 0;
        musicManager.start();

        // Scholar's Eye — proximity echo zones near ruins and ancient markers
        this._initScholarsEye();
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

    // ── Targeting system ─────────────────────────────────────────────────────

    _setupPillarGates() {
        this._pillarGates = [];
        PILLAR_GATE_POSITIONS.forEach(def => {
            const gx = def.x * TILE_SIZE + TILE_SIZE / 2;
            const gy = def.y * TILE_SIZE + TILE_SIZE / 2;

            // Visual: stone ledge drawn as a graphics object
            const gfx = this.add.graphics().setDepth(gy + 1);
            gfx.fillStyle(0x5a4a30, 1);
            gfx.fillRect(gx - 16, gy - 12, 32, 24);
            gfx.fillStyle(0x8a7a55, 1);
            gfx.fillRect(gx - 14, gy - 14, 28, 6);
            gfx.lineStyle(1, 0x3a2a18, 1);
            gfx.strokeRect(gx - 16, gy - 12, 32, 24);
            // Subtle pulse to hint it's special
            this.tweens.add({ targets: gfx, alpha: 0.70, yoyo: true, repeat: -1, duration: 1800 });

            // [E] hint
            const hint = this.add.text(gx, gy - 20, '[E]', {
                font: '7px monospace', fill: '#998855'
            }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);

            // Physics zone blocking the gate
            const zone = this.add.zone(gx, gy, def.w, def.h);
            this.physics.add.existing(zone, true);
            const pc = this.physics.add.collider(this.player, zone);
            const ec = this.physics.add.collider(this.enemies, zone);

            this._pillarGates.push({ zone, gfx, hint, def, pc, ec, gx, gy, open: false });
        });
    }

    _tryMainAction() {
        // If anything interactable is nearby, interact — otherwise attack
        const range = 52;
        const px = this.player.x, py = this.player.y;
        const near = (obj) => Phaser.Math.Distance.Between(px, py, obj.x, obj.y) < range;

        const hasInteractable =
            this.npcs?.getChildren().some(n => near(n)) ||
            this.chests?.getChildren().some(c => near(c) && !c.opened) ||
            this.campfires?.getChildren().some(cf => near(cf)) ||
            this.signs?.getChildren().some(s => near(s)) ||
            this.gatheringGroup?.getChildren().some(n => near(n) && !n.gathered) ||
            this.crackedBoulders?.getChildren().some(b => near(b) && b.active) ||
            this._riftGates?.some(g => Phaser.Math.Distance.Between(px, py, g.wx, g.wy) < range);

        if (hasInteractable) {
            this._checkInteractions();
        } else {
            this.player.triggerAttack();
        }
    }

    _tryActivateSlot(i) {
        const spellId = playerStats.getSlotSpell(i);
        if (!spellId) {
            this.scene.get('UIScene')?.showNotification?.('No skill in that slot — assign one in TOME (menu)', 1600);
            return;
        }
        const spell = SPELLS[spellId];
        if (!spell) return;

        if (spell.passive) return; // passive — no cast
        if (spell.targetingType === 'self') {
            // Instant self-cast — no targeting needed
            this._castSpell(spellId, this.player.x, this.player.y);
        } else {
            this._enterTargetingMode(spellId);
        }
    }

    _enterTargetingMode(spellId) {
        if (this._targeting) this._cancelTargeting();
        this._targeting   = true;
        this._targetSpell = spellId;

        const spell = SPELLS[spellId];
        const level = playerStats.getSpellLevel(spellId);
        const range = spell.range?.[Math.max(0, level - 1)] ?? 120;
        const col   = { fire: 0xff6600, arcane: 0xaa44ff, lightning: 0xffdd00, shadow: 0x8800cc, earth: 0x44aa22 }[spell.element] ?? 0xffffff;

        // Reticle: range circle from player + aim marker
        this._reticle = this.add.graphics().setDepth(200);
        this._reticle._range = range;
        this._reticle._col   = col;
        this._reticle._type  = spell.targetingType;
        this._reticle._aoeR  = spell.range?.[Math.max(0, level - 1)] ?? 80;

        // Show a "selecting" ring on the skill bar slot
        this.scene.get('UIScene')?.showNotification?.(`Aim ${spell.name} — tap to cast, tap again to cancel`, 5000);
    }

    _updateReticle() {
        if (!this._reticle || !this._targeting) return;
        const ptr = this.input.activePointer;
        const wp  = this.cameras.main.getWorldPoint(ptr.x, ptr.y);

        // Clamp to max range
        const dx = wp.x - this.player.x, dy = wp.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const range = this._reticle._range;
        const scale = dist > range ? range / dist : 1;
        const tx = this.player.x + dx * scale;
        const ty = this.player.y + dy * scale;
        const col = this._reticle._col;

        const g = this._reticle;
        g.clear();

        // Range boundary
        g.lineStyle(1, col, 0.25);
        g.strokeCircle(this.player.x, this.player.y, range);

        if (this._reticle._type === 'targeted_aoe') {
            // AoE: filled circle at target
            g.fillStyle(col, 0.18);
            g.fillCircle(tx, ty, this._reticle._aoeR);
            g.lineStyle(2, col, 0.80);
            g.strokeCircle(tx, ty, this._reticle._aoeR);
            // Crosshair
            g.lineStyle(1, col, 0.90);
            g.lineBetween(tx - 8, ty, tx + 8, ty);
            g.lineBetween(tx, ty - 8, tx, ty + 8);
        } else {
            // Directional: line from player to target + arc
            g.lineStyle(2, col, 0.75);
            g.lineBetween(this.player.x, this.player.y, tx, ty);
            g.fillStyle(col, 0.20);
            g.fillCircle(tx, ty, 18);
            g.lineStyle(2, col, 0.80);
            g.strokeCircle(tx, ty, 18);
        }
    }

    _confirmCast(worldX, worldY) {
        const spellId = this._targetSpell;
        this._cancelTargeting();
        this._castSpell(spellId, worldX, worldY);
    }

    _cancelTargeting() {
        this._targeting   = false;
        this._targetSpell = null;
        this._reticle?.destroy();
        this._reticle = null;
    }

    _castSpell(spellId, targetX, targetY) {
        if (!this.player?.active) return;

        // Clamp to spell range
        const spell = SPELLS[spellId];
        const level = playerStats.getSpellLevel(spellId);
        const range = spell.range?.[Math.max(0, level - 1)] ?? 999;
        const dx = targetX - this.player.x, dy = targetY - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            const sc = Math.min(1, range / dist);
            targetX = this.player.x + dx * sc;
            targetY = this.player.y + dy * sc;
        }

        // Turn player to face target
        if (Math.abs(dx) > Math.abs(dy)) {
            this.player.facing = dx > 0 ? 'right' : 'left';
        } else {
            this.player.facing = dy > 0 ? 'down' : 'up';
        }

        // Player-side cast (validation, mana, cooldown, tint)
        // Self-effect spells with special player logic get explicit handlers;
        // everything else routes through castGeneric.
        let castOk = false;
        switch (spellId) {
            case 'fire_nova':    castOk = this.player.castFireNova();    break;
            case 'mana_dart':    castOk = this.player.castManaDart();    break;
            case 'arc_bolt':     castOk = this.player.castArcBolt();     break;
            case 'shadow_veil':  castOk = this.player.castShadowVeil();  break;
            case 'earth_pillar': castOk = this.player.castEarthPillar(); break;
            case 'quagmire':     castOk = this.player.castQuagmire();    break;
            case 'cleanse':      castOk = this.player.castCleanse();     break;
            case 'warmth_aura':  castOk = this.player.castWarmthAura();  break;
            case 'benediction':  castOk = this.player.castBenediction(); break;
            case 'vessel_mend':  castOk = this.player.castVesselMend();  break;
            case 'aetheric_ward':castOk = this.player.castAethericWard();break;
            case 'tempest_step': castOk = this.player.castTempestStep(); break;
            default:             castOk = this.player.castGeneric(spellId); break;
        }
        if (!castOk) return;

        this._spellVFX(spellId, targetX, targetY);
        this._applySpellEffects(spellId, targetX, targetY);
    }

    // ── All world-space VFX ────────────────────────────────────────────────

    _spellVFX(id, tx, ty) {
        const ELEMENT_VFX = {
            fire:      { tints: [0xff6600, 0xff4400, 0xffaa00], flash: [200, 80, 0], qty: 18 },
            arcane:    { tints: [0xcc88ff, 0xffffff, 0x8844cc], flash: null, qty: 14 },
            lightning: { tints: [0xffee00, 0xffffff, 0xaaddff], flash: [180, 180, 80], qty: 20 },
            shadow:    { tints: [0x6600cc, 0x440088, 0xcc00ff], flash: null, qty: 14 },
            earth:     { tints: [0x8b6914, 0xaa8833, 0x6b5011], flash: null, qty: 16 },
            ice:       { tints: [0x88ddff, 0xffffff, 0xaaeeff], flash: null, qty: 14 },
            nature:    { tints: [0x44cc44, 0x88ff44, 0x226622], flash: null, qty: 14 },
            wind:      { tints: [0xccffaa, 0xeeffdd, 0x88ccaa], flash: null, qty: 12 },
        };

        // Custom VFX for spells that deserve it
        switch (id) {
            case 'fire_nova':
                this.add.particles(tx, ty, 'particle', {
                    speed: { min: 60, max: 200 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.6, end: 0 }, lifespan: { min: 300, max: 700 },
                    tint: [0xff6600, 0xff4400, 0xffaa00, 0xffdd44], quantity: 28, explode: true,
                }).setDepth(60);
                this.add.particles(tx, ty, 'particle', {
                    speed: { min: 110, max: 250 }, angle: { min: 0, max: 360 },
                    scale: { start: 0.8, end: 0 }, lifespan: { min: 150, max: 350 },
                    tint: [0xffffff, 0xffeeaa], quantity: 16, explode: true,
                }).setDepth(61);
                this.cameras.main.flash(150, 255, 100, 0, true);
                return;

            case 'mana_dart':
            case 'triple_dart':
            case 'needle_volley':
            case 'seeker_dart':
            case 'phantom_dart': {
                const count = SPELLS[id]?.projectileCount ?? 1;
                const steps = 5;
                for (let p = 0; p < count; p++) {
                    const offset = (p - Math.floor(count / 2)) * 10;
                    for (let s = 1; s <= steps; s++) {
                        const vx = this.player.x + (tx - this.player.x) * (s / steps) + offset;
                        const vy = this.player.y + (ty - this.player.y) * (s / steps);
                        this.time.delayedCall(s * 20 + p * 30, () => {
                            if (!this.player.active) return;
                            this.add.particles(vx, vy, 'particle', {
                                speed: { min: 20, max: 60 }, angle: { min: 0, max: 360 },
                                scale: { start: 0.7, end: 0 }, lifespan: { min: 100, max: 200 },
                                tint: [0xcc88ff, 0xffffff, 0x8844cc], quantity: 5, explode: true,
                            }).setDepth(62);
                        });
                    }
                }
                return;
            }

            case 'arc_bolt':
            case 'chain_lightning':
            case 'lightning_lance':
                this.add.particles(tx, ty, 'particle', {
                    speed: { min: 50, max: 150 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.2, end: 0 }, lifespan: { min: 120, max: 300 },
                    tint: [0xffee00, 0xffffff, 0xaaddff], quantity: 22, explode: true,
                }).setDepth(62);
                this.cameras.main.flash(80, 220, 220, 100, true);
                return;

            case 'shadow_veil':
                this.add.particles(this.player.x, this.player.y, 'particle', {
                    speed: { min: 30, max: 80 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.0, end: 0 }, lifespan: { min: 400, max: 800 },
                    tint: [0x6600cc, 0x440088, 0xcc00ff], quantity: 18, explode: true,
                }).setDepth(62);
                return;

            case 'stone_cannon':
            case 'rock_bullet': {
                // Heavy earth projectile trail
                const steps = 6;
                for (let s = 1; s <= steps; s++) {
                    const vx = this.player.x + (tx - this.player.x) * (s / steps);
                    const vy = this.player.y + (ty - this.player.y) * (s / steps);
                    this.time.delayedCall(s * 18, () => {
                        this.add.particles(vx, vy, 'particle', {
                            speed: { min: 15, max: 45 }, angle: { min: 0, max: 360 },
                            scale: { start: 1.1, end: 0 }, lifespan: { min: 100, max: 250 },
                            tint: [0x8b6914, 0xaa8833, 0xc4a35a], quantity: 6, explode: true,
                        }).setDepth(58);
                    });
                }
                this.add.particles(tx, ty, 'particle', {
                    speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.5, end: 0 }, lifespan: { min: 200, max: 500 },
                    tint: [0x8b6914, 0x6b5011, 0x554010], quantity: 20, explode: true,
                }).setDepth(60);
                this.cameras.main.shake(80, 0.006);
                return;
            }

            case 'mud_wall':
            case 'mud_trap': {
                const g = this.add.graphics().setDepth(3);
                g.fillStyle(0x5a3d10, 0.85);
                g.fillEllipse(tx, ty, 64, 28);
                g.fillStyle(0x7a5520, 0.6);
                g.fillEllipse(tx, ty, 44, 18);
                this.add.particles(tx, ty, 'particle', {
                    speed: { min: 10, max: 40 }, angle: { min: -130, max: -50 },
                    scale: { start: 0.9, end: 0 }, lifespan: { min: 300, max: 700 },
                    tint: [0x5a3d10, 0x7a5520, 0x3d2810], quantity: 12, explode: true,
                }).setDepth(60);
                const dur = SPELLS[id]?.duration?.[playerStats.getSpellLevel(id) - 1] ?? 4000;
                this.time.delayedCall(dur, () => this.tweens.add({ targets: g, alpha: 0, duration: 500, onComplete: () => g.destroy() }));
                return;
            }

            case 'water_blade':
            case 'water_conjure': {
                const g = this.add.graphics().setDepth(62);
                g.lineStyle(4, 0x88ddff, 0.9);
                g.lineBetween(this.player.x, this.player.y, tx, ty);
                this.add.particles(tx, ty, 'particle', {
                    speed: { min: 30, max: 80 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.0, end: 0 }, lifespan: { min: 200, max: 500 },
                    tint: [0x88ddff, 0xffffff, 0x4488ff], quantity: 16, explode: true,
                }).setDepth(63);
                this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
                return;
            }

            case 'petal_storm': {
                for (let i = 0; i < 24; i++) {
                    const angle = (i / 24) * Math.PI * 2;
                    const r = Phaser.Math.Between(20, 80);
                    this.time.delayedCall(i * 30, () => {
                        this.add.particles(tx + Math.cos(angle) * r, ty + Math.sin(angle) * r, 'particle', {
                            speed: { min: 8, max: 25 }, angle: { min: 0, max: 360 },
                            scale: { start: 0.8, end: 0 }, lifespan: { min: 600, max: 1200 },
                            tint: [0xff88bb, 0xffaadd, 0xff66aa, 0xffddee], quantity: 3, explode: true,
                        }).setDepth(65);
                    });
                }
                return;
            }

            case 'aetheric_inscription': {
                // Recursive spiral — golden arcane rune burst
                const g2 = this.add.graphics().setDepth(66);
                for (let ring = 1; ring <= 3; ring++) {
                    g2.lineStyle(2, 0xffd700, 0.8 / ring);
                    g2.strokeCircle(tx, ty, ring * 18);
                }
                g2.lineStyle(2, 0xcc88ff, 0.9);
                g2.lineBetween(tx - 20, ty, tx + 20, ty);
                g2.lineBetween(tx, ty - 20, tx, ty + 20);
                this.add.particles(tx, ty, 'particle', {
                    speed: { min: 80, max: 220 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.4, end: 0 }, lifespan: { min: 350, max: 800 },
                    tint: [0xffd700, 0xcc88ff, 0xffffff, 0x8844cc], quantity: 32, explode: true,
                }).setDepth(67);
                this.cameras.main.flash(200, 180, 100, 255, true);
                this.tweens.add({ targets: g2, alpha: 0, duration: 400, onComplete: () => g2.destroy() });
                return;
            }

            case 'eclipse_mark': {
                const g3 = this.add.graphics().setDepth(64);
                g3.fillStyle(0xcc00cc, 0.7);
                g3.fillCircle(tx, ty, 12);
                g3.lineStyle(2, 0xff00ff, 0.9);
                g3.strokeCircle(tx, ty, 16);
                this.tweens.add({ targets: g3, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 500,
                    onComplete: () => g3.destroy() });
                return;
            }

            case 'cleanse': {
                this.add.particles(this.player.x, this.player.y, 'particle', {
                    speed: { min: 20, max: 60 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.0, end: 0 }, lifespan: { min: 400, max: 900 },
                    tint: [0xaaddff, 0xffffff, 0x88aaff], quantity: 22, explode: true,
                }).setDepth(65);
                return;
            }

            case 'earth_pillar':
            case 'quagmire':
                return; // handled in bespoke methods
        }

        // Element-based default VFX fallback
        const element = SPELLS[id]?.element ?? 'arcane';
        const ev = ELEMENT_VFX[element] ?? ELEMENT_VFX.arcane;
        const vfxTarget = SPELLS[id]?.targetingType === 'self' ? { x: this.player.x, y: this.player.y } : { x: tx, y: ty };
        this.add.particles(vfxTarget.x, vfxTarget.y, 'particle', {
            speed: { min: 40, max: 140 }, angle: { min: 0, max: 360 },
            scale: { start: 1.1, end: 0 }, lifespan: { min: 200, max: 500 },
            tint: ev.tints, quantity: ev.qty, explode: true,
        }).setDepth(62);
        if (ev.flash) this.cameras.main.flash(80, ...ev.flash, true);
    }

    // ── Spell damage + effects ─────────────────────────────────────────────

    _spellDamage(id) {
        const spell       = SPELLS[id];
        const level       = playerStats.getSpellLevel(id);
        const int         = this.player.stats.attributes.intelligence;
        const hasAmp      = ITEMS[playerStats.equipment.weapon]?.passive === 'spell_amplifier';
        const ampMult     = hasAmp ? 1.25 : 1;
        const masteryMult = 1 + (playerStats.skills['arcane_mastery']?.level ?? 0) * 0.10;
        let base;
        if (spell?.baseDmg) {
            const [b, perLv, perInt] = spell.baseDmg;
            base = b + perLv * (level - 1) + perInt * int;
        } else {
            base = 10;
        }
        return Math.floor(base * ampMult * masteryMult);
    }

    _applySpellEffects(id, tx, ty) {
        const spell = SPELLS[id];
        const level = playerStats.getSpellLevel(id);
        const dmg   = this._spellDamage(id);
        const range = spell?.range?.[level - 1] ?? 80;

        // Spells with bespoke mechanics first
        switch (id) {
            case 'earth_pillar': {
                const distToPlayer = Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty);
                if (distToPlayer < 60) this._earthPillarPlatform(tx, ty);
                else                   this._earthPillarAssault(tx, ty);
                return;
            }
            case 'quagmire': {
                const duration = spell.duration[level - 1];
                this._quagmireZones = this._quagmireZones ?? [];
                this._quagmireZones.push({ x: tx, y: ty, r: range, expiry: this.time.now + duration });
                const g = this.add.graphics().setDepth(3);
                g.fillStyle(0x2a4a0a, 0.72);  g.fillEllipse(tx, ty, range * 2, range * 1.3);
                g.fillStyle(0x3d6614, 0.38);  g.fillEllipse(tx, ty, range * 1.5, range * 0.9);
                const em = this.add.particles(tx, ty, 'particle', {
                    speed: { min: 5, max: 18 }, angle: { min: 0, max: 360 },
                    scale: { start: 0.8, end: 0 }, lifespan: { min: 700, max: 1500 },
                    tint: [0x2a4a0a, 0x3d6614, 0x1a3a05], quantity: 1, frequency: 180,
                }).setDepth(4);
                this.time.delayedCall(duration, () => {
                    em.stop();
                    this.tweens.add({ targets: [g, em], alpha: 0, duration: 600,
                        onComplete: () => { g.destroy(); em.destroy(); } });
                });
                this._applyStatusInRadius(tx, ty, range, spell.applyStatus);
                return;
            }
            case 'shadow_veil':
            case 'cleanse':
            case 'warmth_aura':
            case 'benediction':
            case 'vessel_mend':
            case 'aetheric_ward':
            case 'tempest_step':
                return; // handled entirely on player side
            case 'eclipse_mark': {
                // Apply marked status AND set the eclipse mark timer for 2× damage
                this._applyStatusNearest(tx, ty, range, spell.applyStatus);
                const nearest = this._nearestEnemy(tx, ty, range);
                if (nearest) nearest._eclipseMarkTimer = 1500;
                return;
            }
            case 'life_drain': {
                const target = this._nearestEnemy(tx, ty, range);
                if (target) {
                    const actualDmg = Math.min(dmg, target.health);
                    target.takeDamage(actualDmg);
                    this._checkSteamEvent(target);
                    const healAmt = Math.floor(actualDmg * (spell.healFraction ?? 0.5));
                    playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + healAmt);
                    if (healAmt > 0) this._spawnNumber(this.player.x, this.player.y - 20, `+${healAmt}`, '#44ff88', false);
                }
                return;
            }
        }

        // Data-driven routing by targetingType
        if (!spell || spell.passive) return;

        const targeting = spell.targetingType;

        if (targeting === 'targeted_aoe') {
            if (dmg > 0) this._damageInRadius(tx, ty, range, dmg);
            if (spell.applyStatus) this._applyStatusInRadius(tx, ty, range, spell.applyStatus);
        } else if (targeting === 'targeted_directional') {
            if (spell.projectileCount && spell.projectileCount > 1) {
                // Multi-projectile: hit single nearest per projectile (simplified)
                const spread = 18;
                for (let p = 0; p < spell.projectileCount; p++) {
                    const angle = -Math.atan2(ty - this.player.y, tx - this.player.x) +
                        ((p - Math.floor(spell.projectileCount / 2)) * Phaser.Math.DegToRad(spread));
                    const etx = this.player.x - Math.cos(angle) * range;
                    const ety = this.player.y + Math.sin(angle) * range;
                    if (dmg > 0) this._damageSingleNearest(etx, ety, range, dmg);
                    if (spell.applyStatus) this._applyStatusNearest(etx, ety, range, spell.applyStatus);
                }
            } else if (spell.piercing) {
                if (dmg > 0) this._damageInCone(tx, ty, range, 15, dmg);
                if (spell.applyStatus) this._applyStatusInCone(tx, ty, range, 15, spell.applyStatus);
            } else {
                if (dmg > 0) this._damageSingleNearest(tx, ty, range, dmg);
                if (spell.applyStatus) this._applyStatusNearest(tx, ty, range, spell.applyStatus);
            }
        }
        // 'self' spells with applyStatus target the player
        else if (targeting === 'self' && spell.applyStatus && Math.random() < spell.applyStatus.chance) {
            statusManager.apply(this.player, spell.applyStatus.id, { duration: spell.applyStatus.duration });
        }
    }

    _nearestEnemy(tx, ty, range) {
        let best = null, bestDist = range;
        const check = (e) => {
            if (!e?.active) return;
            const d = Phaser.Math.Distance.Between(tx, ty, e.x, e.y);
            if (d < bestDist) { bestDist = d; best = e; }
        };
        this.enemies.getChildren().forEach(check);
        if (this.boss?.active) check(this.boss);
        return best;
    }

    _applyStatusInRadius(cx, cy, range, statusDef) {
        if (!statusDef) return;
        const apply = (e) => {
            if (!e?.active) return;
            if (Phaser.Math.Distance.Between(cx, cy, e.x, e.y) <= range)
                if (Math.random() < statusDef.chance)
                    statusManager.apply(e, statusDef.id, { duration: statusDef.duration });
        };
        this.enemies.getChildren().forEach(apply);
        if (this.boss?.active) apply(this.boss);
    }

    _applyStatusNearest(tx, ty, range, statusDef) {
        if (!statusDef) return;
        const e = this._nearestEnemy(tx, ty, range);
        if (e && Math.random() < statusDef.chance)
            statusManager.apply(e, statusDef.id, { duration: statusDef.duration });
    }

    _applyStatusInCone(tx, ty, range, coneHalf, statusDef) {
        if (!statusDef) return;
        const px = this.player.x, py = this.player.y;
        const facingAngle = Phaser.Math.RadToDeg(Math.atan2(ty - py, tx - px));
        const apply = (e) => {
            if (!e?.active) return;
            const dist = Phaser.Math.Distance.Between(px, py, e.x, e.y);
            if (dist > range) return;
            const ang = Phaser.Math.RadToDeg(Math.atan2(e.y - py, e.x - px));
            if (Math.abs(Phaser.Math.Angle.ShortestBetween(facingAngle, ang)) <= coneHalf)
                if (Math.random() < statusDef.chance)
                    statusManager.apply(e, statusDef.id, { duration: statusDef.duration });
        };
        this.enemies.getChildren().forEach(apply);
        if (this.boss?.active) apply(this.boss);
    }

    _checkSteamEvent(entity) {
        if (entity._steamEvent) {
            entity._steamEvent = false;
            this.add.particles(entity.x, entity.y, 'particle', {
                speed: { min: 20, max: 60 }, angle: { min: -130, max: -50 },
                scale: { start: 1.0, end: 0 }, lifespan: { min: 300, max: 700 },
                tint: [0xffffff, 0xddddff, 0xaabbff], quantity: 14, explode: true,
            }).setDepth(65);
            this.cameras.main.flash(50, 200, 220, 255, true);
        }
    }

    // ── Damage utilities ──────────────────────────────────────────────────

    _damageInRadius(cx, cy, range, dmg) {
        this.enemies.getChildren().forEach(e => {
            if (e.active && Phaser.Math.Distance.Between(cx, cy, e.x, e.y) <= range)
                e.takeDamage(dmg);
        });
        if (this.boss?.active && Phaser.Math.Distance.Between(cx, cy, this.boss.x, this.boss.y) <= range)
            this.boss.takeDamage(Math.floor(dmg * 0.65));
    }

    _damageSingleNearest(tx, ty, range, dmg) {
        const px = this.player.x, py = this.player.y;
        const facingAngle = Phaser.Math.RadToDeg(Math.atan2(ty - py, tx - px));
        const hits = [];
        const check = (e) => {
            if (!e?.active) return;
            const dist = Phaser.Math.Distance.Between(px, py, e.x, e.y);
            if (dist > range) return;
            const ang = Phaser.Math.RadToDeg(Math.atan2(e.y - py, e.x - px));
            if (Math.abs(Phaser.Math.Angle.ShortestBetween(facingAngle, ang)) <= 30)
                hits.push({ e, dist });
        };
        this.enemies.getChildren().forEach(check);
        if (this.boss?.active) check(this.boss);
        hits.sort((a, b) => a.dist - b.dist);
        if (hits[0]) hits[0].e.takeDamage(hits[0].e === this.boss ? Math.floor(dmg * 0.65) : dmg);
    }

    _damageInCone(tx, ty, range, coneHalf, dmg) {
        const px = this.player.x, py = this.player.y;
        const facingAngle = Phaser.Math.RadToDeg(Math.atan2(ty - py, tx - px));
        const check = (e, mult) => {
            if (!e?.active) return;
            const dist = Phaser.Math.Distance.Between(px, py, e.x, e.y);
            if (dist > range) return;
            const ang = Phaser.Math.RadToDeg(Math.atan2(e.y - py, e.x - px));
            if (Math.abs(Phaser.Math.Angle.ShortestBetween(facingAngle, ang)) <= coneHalf)
                e.takeDamage(Math.floor(dmg * mult));
        };
        this.enemies.getChildren().forEach(e => check(e, 1));
        if (this.boss?.active) check(this.boss, 0.65);
    }

    // ── Earth Pillar modes ────────────────────────────────────────────────

    _earthPillarPlatform(tx, ty) {
        const px = this.player.x, py = this.player.y;
        const level = playerStats.getSpellLevel('earth_pillar');
        const duration = [3200, 4200, 5500][level - 1];

        // Rising eruption beneath player
        this.add.particles(px, py, 'particle', {
            speed: { min: 40, max: 130 }, angle: { min: -115, max: -65 },
            scale: { start: 1.5, end: 0 }, lifespan: { min: 350, max: 750 },
            tint: [0x8b6914, 0xaa8833, 0x6b5011, 0xc4a35a], quantity: 24, explode: true,
        }).setDepth(60);
        this.add.particles(px, py + 8, 'particle', {
            speed: { min: 10, max: 35 }, angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 }, lifespan: { min: 150, max: 300 },
            tint: [0x6b5011, 0x554010], quantity: 12, explode: true,
        }).setDepth(55);
        this.cameras.main.shake(140, 0.007);

        // Visual pillar under player
        const g = this.add.graphics().setPosition(px, py).setDepth(py + 1);
        g.fillStyle(0x7a5c10, 1);  g.fillRect(-12, -4, 24, 32);
        g.fillStyle(0xaa8833, 1);  g.fillRect(-10, -10, 20, 10);

        // Open nearby pillar gates
        this._openPillarGates(px, py, 80, duration, g);

        // Also break nearby cracked boulders
        this._breakNearbyBoulders(px, py, 55);

        // Collapse after duration
        this.time.delayedCall(duration, () => {
            this.add.particles(px, py, 'particle', {
                speed: { min: 15, max: 50 }, angle: { min: 0, max: 360 },
                scale: { start: 0.6, end: 0 }, lifespan: { min: 150, max: 400 },
                tint: [0x7a5c10, 0xaa8833], quantity: 10, explode: true,
            }).setDepth(60);
            this.tweens.add({ targets: g, alpha: 0, scaleY: 0, duration: 300, onComplete: () => g.destroy() });
        });
    }

    _earthPillarAssault(tx, ty) {
        const level = playerStats.getSpellLevel('earth_pillar');
        const range = SPELLS.earth_pillar.range[level - 1];
        const dmg   = this._spellDamage('earth_pillar');
        const duration = [2800, 3600, 4800][level - 1];

        // Eruption particles at target
        this.add.particles(tx, ty, 'particle', {
            speed: { min: 50, max: 160 }, angle: { min: -120, max: -60 },
            scale: { start: 1.8, end: 0 }, lifespan: { min: 400, max: 900 },
            tint: [0x8b6914, 0xaa8833, 0x6b5011, 0xc4a35a], quantity: 30, explode: true,
        }).setDepth(60);
        this.add.particles(tx, ty + 6, 'particle', {
            speed: { min: 15, max: 45 }, angle: { min: 0, max: 360 },
            scale: { start: 0.7, end: 0 }, lifespan: { min: 200, max: 400 },
            tint: [0x6b5011, 0x887744], quantity: 14, explode: true,
        }).setDepth(55);
        this.cameras.main.shake(160, 0.009);

        // Visual pillar at target
        const g = this.add.graphics().setPosition(tx, ty).setDepth(ty + 2);
        g.fillStyle(0x7a5c10, 1);  g.fillRect(-12, -28, 24, 42);
        g.fillStyle(0xaa8833, 1);  g.fillRect(-10, -34, 20, 10);
        g.fillStyle(0x554008, 1);  g.fillRect(-12, 12, 24, 4);
        g.lineStyle(1, 0x4a3a18, 1);
        g.beginPath(); g.moveTo(-2, -28); g.lineTo(2, 0); g.lineTo(-1, 12); g.strokePath();

        // Damage + knockup enemies near target
        const toKnock = [];
        this.enemies.getChildren().forEach(e => {
            if (e.active && Phaser.Math.Distance.Between(tx, ty, e.x, e.y) <= range * 0.6)
                toKnock.push({ e, isBoss: false });
        });
        if (this.boss?.active && Phaser.Math.Distance.Between(tx, ty, this.boss.x, this.boss.y) <= range * 0.6)
            toKnock.push({ e: this.boss, isBoss: true });

        toKnock.forEach(({ e, isBoss }) => {
            e.takeDamage(isBoss ? Math.floor(dmg * 0.65) : dmg);
            this._knockupEnemy(e, isBoss);
        });

        // Temporary blocking zone
        const zone = this.add.zone(tx, ty - 4, 22, 36);
        this.physics.add.existing(zone, true);
        const col1 = this.physics.add.collider(this.enemies, zone);
        const col2 = this.boss?.active ? this.physics.add.collider(this.boss, zone) : null;

        this._breakNearbyBoulders(tx, ty, range * 0.7);

        this.time.delayedCall(duration, () => {
            this.add.particles(tx, ty, 'particle', {
                speed: { min: 15, max: 55 }, angle: { min: 0, max: 360 },
                scale: { start: 0.7, end: 0 }, lifespan: { min: 200, max: 500 },
                tint: [0x7a5c10, 0xaa8833, 0x554008], quantity: 14, explode: true,
            }).setDepth(60);
            col1.destroy(); col2?.destroy(); zone.destroy();
            this.tweens.add({ targets: g, alpha: 0, scaleY: 0, duration: 280, onComplete: () => g.destroy() });
        });
    }

    _knockupEnemy(enemy, isBoss = false) {
        if (!enemy.active) return;
        const fallDmg = Math.floor(10 + this.player.stats.attributes.strength * 2.2);
        const origY = enemy.y;
        const height = isBoss ? 18 : 28;

        // Prevent enemy AI during knockup via duck-typed timer
        enemy._knockupTimer = 520;
        enemy._onKnockupLand = () => {
            if (!enemy.active) return;
            enemy.takeDamage(isBoss ? Math.floor(fallDmg * 0.5) : fallDmg);
            this.cameras.main.shake(80, 0.004);
            this.add.particles(enemy.x, enemy.y + 6, 'particle', {
                speed: { min: 10, max: 32 }, angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 }, lifespan: { min: 120, max: 280 },
                tint: [0x8b6914, 0x887744, 0x6b5011], quantity: 10, explode: true,
            }).setDepth(60);
        };

        this.tweens.add({
            targets: enemy, y: origY - height, duration: 260, ease: 'Power2.Out',
            onComplete: () => {
                if (!enemy.active) return;
                this.tweens.add({
                    targets: enemy, y: origY, duration: 260, ease: 'Power2.In',
                });
            }
        });
    }

    _openPillarGates(cx, cy, radius, duration, pillarGfx) {
        const opened = [];
        this._pillarGates.forEach(gate => {
            if (gate.open) return;
            if (Phaser.Math.Distance.Between(cx, cy, gate.gx, gate.gy) > radius) return;
            gate.open = true;
            gate.zone.body.enable = false;
            gate.pc.active = false;
            gate.ec.active = false;

            // Visual: gate fades out
            this.tweens.add({ targets: gate.gfx, alpha: 0.25, duration: 300 });
            this.scene.get('UIScene')?.showNotification?.('The way is open — the ledge is climbable!', 2800);
            opened.push(gate);
        });

        if (opened.length > 0) {
            this.time.delayedCall(duration, () => {
                opened.forEach(gate => {
                    gate.open = false;
                    gate.zone.body.enable = true;
                    gate.pc.active = true;
                    gate.ec.active = true;
                    this.tweens.add({ targets: gate.gfx, alpha: 1, duration: 400 });
                });
            });
        }
    }

    _breakNearbyBoulders(x, y, range) {
        const toBreak = this.crackedBoulders.getChildren().filter(b =>
            b.active && Phaser.Math.Distance.Between(x, y, b.x, b.y) <= range
        );
        if (!toBreak.length) return;

        toBreak.forEach(boulder => {
            this.add.particles(boulder.x, boulder.y, 'particle', {
                speed: { min: 30, max: 90 }, angle: { min: 0, max: 360 },
                scale: { start: 0.9, end: 0 }, lifespan: { min: 300, max: 600 },
                tint: [0x887744, 0xaa9955, 0x665533], quantity: 18, explode: true,
            }).setDepth(60);
            boulder.ePrompt?.setAlpha(0);
            boulder.ePrompt?.destroy();
            this.crackedBoulders.remove(boulder, true, true);
        });

        this.scene.get('UIScene')?.showNotification?.('The stone crumbles — a hidden path opens.', 2500);
    }

    // ── Resonance Bow ranged strike ───────────────────────────────────────────
    _bowStrike(px, py, facing, augmented) {
        const weaponDef  = ITEMS[playerStats.equipment.weapon];
        const passive    = weaponDef?.passive ?? null;
        const loreAbil   = weaponDef?.loreAbility ?? null;
        const isVoidPierce = passive === 'void_piercer';
        const range      = isVoidPierce ? 220 : 150;

        const dirMap = { right: [1, 0], left: [-1, 0], down: [0, 1], up: [0, -1] };
        const [dx, dy] = dirMap[facing] ?? [0, 1];

        // Arrow particle trail (longer for void_piercer)
        const trailColor = isVoidPierce ? [0xcc88ff, 0xffffff] : [0x88ffaa, 0xffffff];
        for (let s = 1; s <= 6; s++) {
            const ax = px + dx * (range * s / 6);
            const ay = py + dy * (range * s / 6);
            this.time.delayedCall(s * 18, () => {
                if (!this.player?.active) return;
                this.add.particles(ax, ay, 'particle', {
                    speed: { min: 8, max: 25 }, angle: { min: 0, max: 360 },
                    scale: { start: 0.45, end: 0 }, lifespan: { min: 80, max: 160 },
                    tint: trailColor, quantity: 3, explode: true,
                }).setDepth(62);
            });
        }

        const stats       = this.player.stats;
        const shotCount   = this.player._bowShotCount ?? 0;
        const isTriple    = passive === 'triple_shot' && shotCount % 3 === 0;
        const base        = Math.floor(8 + stats.attributes.strength * 1.5 + stats.attributes.intelligence * 1.0 + Phaser.Math.Between(-2, 3));
        let bowDmg        = augmented ? Math.floor(base * 1.20) : base;
        if (isTriple) {
            bowDmg = Math.floor(bowDmg * 2);
            this.combatManager._spawnNumber(px, py - 14, '3×', '#ffd700', true);
            this.cameras.main.flash(60, 220, 180, 0, true);
        }
        const facingAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx));

        const hits = [];
        const check = (e) => {
            if (!e?.active) return;
            const dist = Phaser.Math.Distance.Between(px, py, e.x, e.y);
            if (dist > range) return;
            const ang = Phaser.Math.RadToDeg(Math.atan2(e.y - py, e.x - px));
            if (Math.abs(Phaser.Math.Angle.ShortestBetween(facingAngle, ang)) <= 28)
                hits.push({ e, dist });
        };
        this.enemies.getChildren().forEach(check);
        if (this.boss?.active) check(this.boss);
        hits.sort((a, b) => a.dist - b.dist);

        const applyHit = (e, mult = 1) => {
            if (!e?.active) return;
            const dmg = e === this.boss ? Math.floor(bowDmg * 0.65 * mult) : Math.floor(bowDmg * mult);
            e.takeDamage(dmg);
            this.combatManager._spawnNumber(e.x, e.y - 20, `${dmg}`, '#88ffaa', false);
            this.combatManager._spawnSparks(e.x, e.y, 0x88ffaa, 4);
        };

        if (hits[0]) {
            applyHit(hits[0].e);
            // void_piercer: pierce to second enemy
            if (isVoidPierce && hits[1]) {
                this.time.delayedCall(80, () => applyHit(hits[1].e, 0.75));
            }
            // Lore ability — arrow_bounce
            if (loreAbil === 'arrow_bounce' && Math.random() < 0.25 && hits[1]) {
                this.time.delayedCall(120, () => {
                    applyHit(hits[1].e, 0.60);
                    this.add.particles(hits[1].e.x, hits[1].e.y, 'particle', {
                        speed: { min: 20, max: 60 }, angle: { min: 0, max: 360 },
                        scale: { start: 0.6, end: 0 }, lifespan: { min: 150, max: 300 },
                        tint: [0x88ffcc, 0xffffff], quantity: 6, explode: true,
                    }).setDepth(62);
                });
            }
            // Lore ability — storm_burst: AoE at impact
            if (loreAbil === 'storm_burst' && Math.random() < 0.20) {
                const ix = hits[0].e.x, iy = hits[0].e.y;
                this.add.particles(ix, iy, 'particle', {
                    speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 },
                    scale: { start: 1.0, end: 0 }, lifespan: { min: 200, max: 450 },
                    tint: [0xffee00, 0xffffff, 0xaaddff], quantity: 18, explode: true,
                }).setDepth(63);
                this.cameras.main.flash(50, 200, 200, 80, true);
                const stormDmg = Math.floor(bowDmg * 0.5);
                this.enemies.getChildren().forEach(e => {
                    if (e !== hits[0].e && e.active && Phaser.Math.Distance.Between(ix, iy, e.x, e.y) <= 55)
                        e.takeDamage(stormDmg);
                });
            }
        }
    }

    // ── Aetheric Sight ────────────────────────────────────────────────────────
    _activateAethericSight(duration) {
        if (this._aethericSightActive) return;
        this._aethericSightActive = true;

        // Blue tint overlay (fixed to camera)
        const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0033cc, 0.12)
            .setOrigin(0).setScrollFactor(0).setDepth(200);

        // Draw enemy detection circles at current scent-scaled radius
        const sightGfx = this.add.graphics().setDepth(201);
        const scent = this.player?.stats?.manaScent ?? 0;
        this.enemies.getChildren().forEach(e => {
            if (!e.active) return;
            const r = e.sightRange * (1 + scent / 100 * 2);
            sightGfx.lineStyle(1, 0xff2222, 0.35);
            sightGfx.strokeCircle(e.x, e.y, r);
        });

        this.time.delayedCall(duration, () => {
            this._aethericSightActive = false;
            overlay.destroy();
            sightGfx.destroy();
        });

        this.scene.get('UIScene')?.showNotification?.('Aetheric Sight — time slows around you.', 1800);
    }

    // ── Rift-Gates (Phase 6) ─────────────────────────────────────────────────
    _drawRiftCircle(gfx, wx, wy, attuned) {
        gfx.clear();
        const R = 22, Ri = 14;
        const col  = attuned ? 0x44ccff : 0x2255dd;
        const col2 = attuned ? 0x88eeff : 0x4477cc;

        // Outer glow fill
        gfx.fillStyle(col, attuned ? 0.20 : 0.09);
        gfx.fillCircle(wx, wy, R);

        // Outer ring
        gfx.lineStyle(attuned ? 2 : 1, col, attuned ? 0.95 : 0.55);
        gfx.strokeCircle(wx, wy, R);

        // Inner ring
        gfx.lineStyle(1, col, attuned ? 0.75 : 0.40);
        gfx.strokeCircle(wx, wy, Ri);

        // Cardinal cross lines (clipped to outer radius)
        gfx.lineStyle(1, col, attuned ? 0.60 : 0.30);
        gfx.lineBetween(wx - R, wy, wx + R, wy);
        gfx.lineBetween(wx, wy - R, wx, wy + R);

        // Diagonal rune lines (inner radius only)
        const d = Math.round(Ri * 0.707);
        gfx.lineStyle(1, col, attuned ? 0.45 : 0.22);
        gfx.lineBetween(wx - d, wy - d, wx + d, wy + d);
        gfx.lineBetween(wx + d, wy - d, wx - d, wy + d);

        // Center gem
        gfx.fillStyle(col2, attuned ? 1.0 : 0.60);
        gfx.fillCircle(wx, wy, attuned ? 4 : 3);
    }

    _setupRiftGates() {
        this._riftGates = [];
        if (typeof RIFT_GATE_POSITIONS === 'undefined' || !RIFT_GATE_POSITIONS?.length) return;

        RIFT_GATE_POSITIONS.forEach(gate => {
            const wx = gate.x * TILE_SIZE + TILE_SIZE / 2;
            const wy = gate.y * TILE_SIZE + TILE_SIZE / 2;

            // Visual — magic circle on the ground
            const gfx = this.add.graphics().setDepth(wy - 1);
            this._drawRiftCircle(gfx, wx, wy, false);
            this.tweens.add({ targets: gfx, alpha: { from: 0.5, to: 1 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

            // Label
            const label = this.add.text(wx, wy - 28, gate.label, {
                font: '6px monospace', fill: '#66aaff', stroke: '#000022', strokeThickness: 1
            }).setOrigin(0.5, 1).setDepth(wy + 10).setAlpha(0);

            // [E] prompt
            const prompt = this.add.text(wx, wy + 26, '[E]', {
                font: '7px monospace', fill: '#88ccff'
            }).setOrigin(0.5).setDepth(wy + 10).setAlpha(0);

            // Interaction zone
            const zone = this.add.zone(wx, wy, 48, 48);
            this.physics.add.existing(zone, false);
            zone.body.setAllowGravity(false);

            this._riftGates.push({ zone, gfx, label, prompt, id: gate.id, wx, wy, attuned: false });
        });

        // Restore attuned visuals from save data
        this._riftGates.forEach(g => {
            if (playerStats.attunedGates.includes(g.id)) {
                g.attuned = true;
                this._drawRiftCircle(g.gfx, g.wx, g.wy, true);
            }
        });
    }

    _interactRiftGate(gate) {
        const ps = this.player.stats;
        if (!gate.attuned) {
            gate.attuned = true;
            if (!ps.attunedGates.includes(gate.id)) ps.attunedGates.push(gate.id);
            ps.health = ps.maxHealth;
            ps.mana   = ps.maxMana;
            ps.manaExhausted    = false;
            ps.manaCollapsed    = false;
            ps._exhaustionTimer = 0;
            // Redraw circle in attuned (bright cyan) state
            this._drawRiftCircle(gate.gfx, gate.wx, gate.wy, true);
            this.scene.get('UIScene')?.showNotification?.(`Attuned to ${gate.label} — fully restored.`, 3000);
            this.cameras.main.flash(300, 100, 180, 255, false);
            questManager.onAttune(gate.id);
            SaveManager.save(ps);
            soundManager.save();
        } else if (ps.attunedGates.length >= 2) {
            // Offer fast travel to other attuned gates
            this.scene.pause();
            this.scene.launch('FastTravelScene', { currentGateId: gate.id });
        } else {
            this.scene.get('UIScene')?.showNotification?.('Aetheric Monolith — game saved. Attune more gates to fast-travel.', 2500);
            SaveManager.save(ps);
            soundManager.save();
        }
    }

    _fastTravelTo(gateId) {
        const gate = this._riftGates?.find(g => g.id === gateId);
        if (!gate) return;
        this.player.setPosition(gate.wx, gate.wy);
        this.cameras.main.centerOn(gate.wx, gate.wy);
        this.cameras.main.flash(400, 100, 180, 255, false);
        this.scene.get('UIScene')?.showNotification?.(`Arrived: ${gate.label}`, 2200);
        SaveManager.save(this.player.stats);
        soundManager.save();
    }

    // ── Aetheric Tear ────────────────────────────────────────────────────────
    _startAethericTear() {
        if (!this.player?.active) return;
        if (this.player._tearCooldown > 0) {
            const sec = Math.ceil(this.player._tearCooldown / 1000);
            this.scene.get('UIScene')?.showNotification?.(`Aetheric Tear on cooldown (${sec}s)`, 1200);
            return;
        }
        const hasMastery = playerStats.masteries?.aetheric_comprehension;
        const manaPct    = hasMastery ? 0.75 : 0.85;
        const manaCost   = Math.floor(this.player.stats.maxMana * manaPct);
        const pctLabel   = hasMastery ? '75%' : '85%';
        if (this.player.stats.manaExhausted || this.player.stats.mana < manaCost) {
            this.scene.get('UIScene')?.showNotification?.(`Insufficient mana for Aetheric Tear (${pctLabel} required)`, 1400);
            return;
        }
        if (!playerStats.attunedGates.length) {
            this.scene.get('UIScene')?.showNotification?.('No attuned rift gates — find and interact with a Monolith first.', 2200);
            return;
        }
        this.scene.pause();
        this.scene.launch('AethericTearScene', {
            manaCost,
            manaPct,
            cooldown: hasMastery ? 45000 : 60000,
        });
    }

    _confirmAethericTearFree(wx, wy) {
        this._beginAethericTearCast(wx, wy, null);
    }

    _confirmAethericTearGate(gateId) {
        const gate = this._riftGates?.find(g => g.id === gateId);
        if (!gate) return;
        this._beginAethericTearCast(gate.wx, gate.wy, gate.label);
    }

    _beginAethericTearCast(tx, ty, label) {
        const stats   = this.player.stats;
        const manaPct = stats.masteries?.aetheric_comprehension ? 0.75 : 0.85;
        const manaCost = Math.floor(stats.maxMana * manaPct);
        if (stats.mana < manaCost) return;

        stats.mana -= manaCost;
        stats.manaExhausted = stats.mana === 0;
        stats.manaScent = 100;
        this.player._tearCooldown = stats.masteries?.aetheric_comprehension ? 45000 : 60000;

        this._castDest = { tx, ty, label };
        this._castVfx  = [];

        // Lock player in place during channel (3400ms covers full cast + small buffer)
        statusManager.apply(this.player, 'resonance_stun', { duration: 3400 });
        this.player.setVelocity(0, 0);

        const px = this.player.x, py = this.player.y;

        // Corona emitter — follows player each update tick
        const emitter = this.add.particles(px, py, 'particle', {
            speed: { min: 18, max: 55 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0 },
            lifespan: { min: 280, max: 650 },
            tint: [0xcc00ff, 0x8800cc, 0xffffff, 0x4400aa],
            quantity: 3,
            frequency: 55,
            alpha: { start: 0.9, end: 0 },
        }).setDepth(60);
        this._castVfx.push(emitter);

        // Inner pulsing ring
        const ringInner = this.add.graphics().setDepth(61);
        const ringObj   = { r: 10 };
        const ringTween = this.tweens.add({
            targets: ringObj, r: 36, duration: 700, yoyo: true, repeat: -1,
            onUpdate: () => {
                ringInner.clear();
                ringInner.lineStyle(1, 0xcc00ff, Math.max(0.15, 0.75 - ringObj.r / 50));
                ringInner.strokeCircle(this.player.x, this.player.y, ringObj.r);
            },
        });
        this._castVfx.push(ringInner);
        this._castVfx.push({ destroy: () => ringTween.stop() });

        // Outer slow-expanding ring
        const ringOuter = this.add.graphics().setDepth(61);
        const outerObj  = { r: 36 };
        const outerTween = this.tweens.add({
            targets: outerObj, r: 10, duration: 700, yoyo: true, repeat: -1,
            onUpdate: () => {
                ringOuter.clear();
                ringOuter.lineStyle(1, 0x8844cc, Math.max(0.08, 0.40 - outerObj.r / 90));
                ringOuter.strokeCircle(this.player.x, this.player.y, outerObj.r);
            },
        });
        this._castVfx.push(ringOuter);
        this._castVfx.push({ destroy: () => outerTween.stop() });

        // "CHANNELING…" label above player
        const castLabel = this.add.text(px, py - 36, 'CHANNELING…', {
            font: 'bold 8px monospace', fill: '#cc88ff', stroke: '#000', strokeThickness: 2,
        }).setOrigin(0.5).setDepth(70);
        this._castVfx.push(castLabel);

        // Progress bar
        const barW  = 52, barH = 5;
        const barBg = this.add.rectangle(px, py - 23, barW, barH, 0x111111, 0.9)
            .setOrigin(0.5).setDepth(70);
        const barFill = this.add.rectangle(px - barW / 2, py - 23, 1, barH, 0xcc00ff)
            .setOrigin(0, 0.5).setDepth(71);
        const barTween = this.tweens.add({
            targets: barFill, width: barW, duration: 2600, ease: 'Linear',
        });
        this._castVfx.push(barBg);
        this._castVfx.push(barFill);
        this._castVfx.push({ destroy: () => barTween.stop() });

        // Periodic position sync so VFX stays glued to player
        const syncEvent = this.time.addEvent({
            delay: 32, repeat: -1,
            callback: () => {
                const px2 = this.player.x, py2 = this.player.y;
                emitter.setPosition(px2, py2);
                castLabel.setPosition(px2, py2 - 36);
                barBg.setPosition(px2, py2 - 23);
                barFill.setPosition(px2 - barW / 2, py2 - 23);
            },
        });
        this._castVfx.push({ destroy: () => syncEvent.remove() });

        // Schedule completion
        this._castEvent = this.time.delayedCall(2600, this._completeTearCast, [], this);
    }

    _completeTearCast() {
        if (!this._castDest) return;
        const { tx, ty, label } = this._castDest;
        this._castDest = null;
        this._castEvent = null;
        this._cleanCastVfx();

        // Origin burst
        this.add.particles(this.player.x, this.player.y, 'particle', {
            speed: { min: 80, max: 200 }, angle: { min: 0, max: 360 },
            scale: { start: 1.4, end: 0 }, lifespan: { min: 400, max: 900 },
            tint: [0xcc00ff, 0x6600cc, 0x220044, 0xffffff], quantity: 32, explode: true,
        }).setDepth(60);

        this.player.setPosition(tx, ty);
        this.cameras.main.centerOn(tx, ty);
        this.cameras.main.flash(250, 160, 0, 220, true);
        this.cameras.main.shake(180, 0.008);
        soundManager.spell();

        // Destination burst
        this.add.particles(tx, ty, 'particle', {
            speed: { min: 60, max: 180 }, angle: { min: 0, max: 360 },
            scale: { start: 1.2, end: 0 }, lifespan: { min: 350, max: 800 },
            tint: [0xcc00ff, 0x9900cc, 0x440066], quantity: 28, explode: true,
        }).setDepth(60);

        statusManager.apply(this.player, 'resonance_stun', { duration: 2000 });
        const msg = label
            ? `Aetheric Tear — arrived at ${label}. Resonance stuns you!`
            : 'Aetheric Tear — resonance stuns you upon arrival!';
        this.scene.get('UIScene')?.showNotification?.(msg, 2500);
    }

    _cancelTearCast() {
        if (!this._castDest) return;
        const stats    = this.player.stats;
        const manaPct  = stats.masteries?.aetheric_comprehension ? 0.75 : 0.85;
        const manaCost = Math.floor(stats.maxMana * manaPct);
        stats.mana     = Math.min(stats.maxMana, stats.mana + manaCost);
        stats.manaExhausted = false;
        this.player._tearCooldown = 0;

        this._castDest = null;
        this._castEvent?.remove?.();
        this._castEvent = null;
        this._cleanCastVfx();

        // Remove channeling stun so player can move again immediately
        statusManager.remove(this.player, 'resonance_stun');

        // Disruption VFX
        this.add.particles(this.player.x, this.player.y, 'particle', {
            speed: { min: 40, max: 120 }, angle: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0 }, lifespan: { min: 200, max: 500 },
            tint: [0xff2200, 0xaa0000, 0x550000], quantity: 18, explode: true,
        }).setDepth(60);

        this.scene.get('UIScene')?.showNotification?.('Cast interrupted!', 1800);
    }

    _cleanCastVfx() {
        if (!this._castVfx) return;
        for (const o of this._castVfx) {
            try { o?.destroy?.(); } catch (_) {}
        }
        this._castVfx = null;
    }

    _cancelPlacement() {
        if (this._campfirePlacing) {
            this._campfirePlacing = false;
            this._campfireReticle?.destroy();
            this._campfireReticle = null;
        }
    }

    // ── Dynamic Campfire ─────────────────────────────────────────────────────
    _startCampfirePlacement() {
        if (!this.player?.active) return;
        const WOOD_COST = 3;
        const woodCount = playerStats.inventory.filter(i => i.id === 'wood').reduce((s, i) => s + i.qty, 0);
        if (woodCount < WOOD_COST) {
            this.scene.get('UIScene')?.showNotification?.(`Need ${WOOD_COST} Wood to build a campfire (have ${woodCount})`, 1600);
            return;
        }
        this._campfirePlacing = true;
        this._campfireReticle = this.add.graphics().setDepth(200);
        this.scene.get('UIScene')?.showNotification?.('Campfire — tap to place (3 Wood), tap again to cancel', 5000);
    }

    _updateCampfireReticle() {
        if (!this._campfireReticle) return;
        const ptr = this.input.activePointer;
        const wp  = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        const g   = this._campfireReticle;
        g.clear();
        g.fillStyle(0xff6600, 0.25);
        g.fillCircle(wp.x, wp.y, 24);
        g.lineStyle(2, 0xff6600, 0.75);
        g.strokeCircle(wp.x, wp.y, 24);
    }

    _confirmCampfire(tx, ty) {
        this._campfirePlacing = false;
        this._campfireReticle?.destroy();
        this._campfireReticle = null;

        // Consume 3 wood
        playerStats.removeItem('wood', 3);

        // Spawn campfire
        const cf = this.campfires.create(tx, ty, 'campfire');
        cf.setDepth(6);
        cf.body.setSize(20, 16);
        cf.healed    = false;
        cf._placed   = true;

        this.tweens.add({ targets: cf, alpha: 0.75, yoyo: true, repeat: -1, duration: 400 + Math.random() * 200, ease: 'Sine.easeInOut' });
        this.add.particles(tx, ty - 10, 'particle', {
            speed: { min: 8, max: 22 }, angle: { min: 250, max: 290 },
            scale: { start: 0.8, end: 0 }, lifespan: { min: 300, max: 600 },
            tint: [0xff6600, 0xffaa00, 0xffff44], quantity: 1, frequency: 60,
        }).setDepth(7);

        cf.ePrompt = this.add.text(tx, ty - TILE_SIZE / 2 - 4, '[E] Rest', {
            font: '7px monospace', fill: '#ffbb44'
        }).setOrigin(0.5, 1).setDepth(25).setAlpha(0);

        this.scene.get('UIScene')?.showNotification?.('Campfire placed — rest to restore HP/MP.', 2200);
        soundManager.collect();
    }

    // ── Scholar's Eye ─────────────────────────────────────────────────────────

    _initScholarsEye() {
        this._scholarZones = [
            { wx: 5  * TILE_SIZE, wy: 2  * TILE_SIZE, range: 90,  triggered: false,
              codexTitle: 'Northern Marker — Pre-Covenant Warning',
              echo: 'Scholar\'s Eye: "These warnings predate the current era. Someone knew the Void would return long before it did."' },
            { wx: 10 * TILE_SIZE, wy: 4  * TILE_SIZE, range: 90,  triggered: false,
              codexTitle: 'Western Ruins — The Unnamed Hermit',
              echo: 'Scholar\'s Eye: "The Hermit they speak of — Vorgos? Or one of his disciples from the Covenant era?"' },
            { wx: 27 * TILE_SIZE, wy: 19 * TILE_SIZE, range: 90,  triggered: false,
              codexTitle: 'Crossroads Monolith — Network Corruption',
              echo: 'Scholar\'s Eye: "Void Wraith corruption this close to the Crossroads Monolith. The Rift-Gate network itself is at risk."' },
            { wx: 15 * TILE_SIZE, wy: 15 * TILE_SIZE, range: 85,  triggered: false,
              codexTitle: 'Sealed Rift — Ancient Aetheric Discharge',
              echo: 'Scholar\'s Eye: "Aetheric discharge. Something was torn through here at immense force — a rift, sealed centuries ago."' },
            { wx: 25 * TILE_SIZE, wy: 10 * TILE_SIZE, range: 85,  triggered: false,
              codexTitle: 'Survey Stone — First Gate Architects',
              echo: 'Scholar\'s Eye: "Covenant stonework. These markers were part of the original Rift-Gate survey — 500 years before the current network."' },
            { wx: 42 * TILE_SIZE, wy: 14 * TILE_SIZE, range: 85,  triggered: false,
              codexTitle: 'Eastern Ruin — The Void Seal Sigil',
              echo: 'Scholar\'s Eye: "These carvings are not decorative. The same sigil appears in the Gap records: the Void Seal. Someone placed this deliberately."' },
        ];
    }

    _updateScholarsEye() {
        if (!this._scholarZones) return;
        for (const zone of this._scholarZones) {
            if (zone.triggered) continue;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, zone.wx, zone.wy);
            const zoneRange = zone.range * (playerStats.masteries?.scholars_vigilance ? 1.30 : 1);
            if (dist <= zoneRange) {
                zone.triggered = true;
                playerStats.gainResonanceInsight(1);
                this.scene.get('UIScene')?.showNotification?.(`${zone.echo}\n[+1 Resonance Insight]`, 4800);
                this._spawnGhostRuinEcho(zone.wx, zone.wy);

                // Log echo to Codex
                const echoId = `echo_${Math.floor(zone.wx / TILE_SIZE)}_${Math.floor(zone.wy / TILE_SIZE)}`;
                if (!(playerStats.codexEchoes ?? []).find(e => e.id === echoId)) {
                    (playerStats.codexEchoes ??= []).push({
                        id: echoId,
                        title: zone.codexTitle ?? `Echo — (${Math.floor(zone.wx / TILE_SIZE)},${Math.floor(zone.wy / TILE_SIZE)})`,
                        text: zone.echo.replace(/^Scholar's Eye: "/, '').replace(/"$/, ''),
                        timestamp: Date.now(),
                    });
                }
                // Second vision fires after discovering 2 echoes
                if (playerStats.codexEchoes.length === 2 && !this.registry.get('secondVisionSeen')) {
                    this.registry.set('secondVisionSeen', true);
                    this.time.delayedCall(5500, () => {
                        this.scene.pause();
                        this.scene.launch('DialogueScene', { lines: DIALOGUES['eldrin_second_vision'] });
                    });
                }
            }
        }
    }

    _spawnGhostRuinEcho(cx, cy) {
        // Flicker parameters: ghost of the ruin as it stood in 0 GD (The Great Darkness)
        const COL_WALL   = 0xaaccff;
        const COL_PILLAR = 0x88aaff;
        const COL_RUNE   = 0xccddff;
        const DEPTH      = 4;

        // Left pillar
        const pillarL = this.add.graphics().setDepth(DEPTH).setAlpha(0);
        pillarL.lineStyle(1, COL_PILLAR, 0.75);
        pillarL.fillStyle(COL_PILLAR, 0.18);
        pillarL.fillRect(cx - 26, cy - 36, 10, 36);
        pillarL.strokeRect(cx - 26, cy - 36, 10, 36);

        // Right pillar
        const pillarR = this.add.graphics().setDepth(DEPTH).setAlpha(0);
        pillarR.lineStyle(1, COL_PILLAR, 0.75);
        pillarR.fillStyle(COL_PILLAR, 0.18);
        pillarR.fillRect(cx + 16, cy - 36, 10, 36);
        pillarR.strokeRect(cx + 16, cy - 36, 10, 36);

        // Lintel spanning the top
        const lintel = this.add.graphics().setDepth(DEPTH).setAlpha(0);
        lintel.lineStyle(1, COL_WALL, 0.80);
        lintel.fillStyle(COL_WALL, 0.22);
        lintel.fillRect(cx - 28, cy - 42, 56, 8);
        lintel.strokeRect(cx - 28, cy - 42, 56, 8);

        // Foundation / floor rubble
        const rubble = this.add.graphics().setDepth(DEPTH).setAlpha(0);
        rubble.lineStyle(1, COL_WALL, 0.50);
        rubble.fillStyle(COL_WALL, 0.10);
        rubble.fillRect(cx - 28, cy + 1,  20, 5);
        rubble.fillRect(cx +  8, cy + 1,  18, 4);
        rubble.fillRect(cx - 10, cy - 2,  12, 3);

        // Runic sigil in the arch centre — the Void Seal from 0 GD
        const sigil = this.add.graphics().setDepth(DEPTH + 1).setAlpha(0);
        sigil.lineStyle(1, COL_RUNE, 0.70);
        sigil.strokeCircle(cx, cy - 18, 9);
        sigil.lineBetween(cx - 6, cy - 18, cx + 6, cy - 18);
        sigil.lineBetween(cx, cy - 24, cx, cy - 12);
        // diagonal cross arms
        sigil.lineBetween(cx - 5, cy - 23, cx + 5, cy - 13);
        sigil.lineBetween(cx + 5, cy - 23, cx - 5, cy - 13);

        const pieces = [pillarL, pillarR, lintel, rubble, sigil];

        // Flicker in — each piece at a slightly different rate to feel like unstable resonance
        const flickerIn = (g, delay, peak) => {
            this.tweens.add({
                targets: g, alpha: peak, duration: 180 + Math.random() * 120,
                delay, ease: 'Sine.easeIn',
                onComplete: () => this._ghostFlicker(g, peak),
            });
        };
        flickerIn(pillarL, 0,   0.80);
        flickerIn(pillarR, 60,  0.80);
        flickerIn(lintel,  120, 0.90);
        flickerIn(rubble,  40,  0.55);
        flickerIn(sigil,   200, 1.00);

        // Ghostly particle mist rising through the structure
        const mist = this.add.particles(cx, cy - 10, 'particle', {
            speed: { min: 4, max: 16 }, angle: { min: 250, max: 290 },
            scale: { start: 0.5, end: 0 }, lifespan: { min: 1200, max: 2400 },
            tint: [0xaaccff, 0xccddff, 0xffffff], alpha: { start: 0.28, end: 0 },
            quantity: 1, frequency: 180,
        }).setDepth(DEPTH + 2);

        // Fade everything out after 3.8 s
        this.time.delayedCall(3800, () => {
            pieces.forEach(g => {
                this.tweens.add({
                    targets: g, alpha: 0, duration: 700, ease: 'Power2',
                    onComplete: () => g.destroy(),
                });
            });
            mist.stop();
            this.time.delayedCall(800, () => mist.destroy());
        });
    }

    _ghostFlicker(g, peak) {
        if (!g.active) return;
        // Random flicker: dip to a low alpha then back up, loop while visible
        const dip      = peak * (0.25 + Math.random() * 0.35);
        const holdMs   = 80  + Math.random() * 220;
        const flickerMs = 60 + Math.random() * 100;
        this.tweens.add({
            targets: g, alpha: dip, duration: flickerMs, ease: 'Sine.easeOut',
            onComplete: () => {
                if (!g.active) return;
                this.tweens.add({
                    targets: g, alpha: peak, duration: flickerMs, ease: 'Sine.easeIn',
                    delay: holdMs,
                    onComplete: () => this._ghostFlicker(g, peak),
                });
            },
        });
    }

    _buildWorld(mapW, mapH) {
        // Floor layer — real Pipoya BaseChip tileset via Phaser Tilemap
        // Data tile IDs: 0=empty, 1=BaseChip[0] grass, 5=BaseChip[4] path stone
        const floorData = PROLOGUE_MAP.map(row =>
            row.map(tile => tile === 2 ? 5 : 1)
        );
        const tilemap = this.make.tilemap({ data: floorData, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
        const tileset = tilemap.addTilesetImage('tileset_base', 'tileset_base');
        tilemap.createLayer(0, tileset, 0, 0).setDepth(0);

        // Tree/wall sprites — individual sprites so Y-depth sorting works
        PROLOGUE_MAP.forEach((row, r) => {
            row.forEach((tile, c) => {
                if (tile === 1) {
                    const x = c * TILE_SIZE + TILE_SIZE / 2;
                    const y = r * TILE_SIZE + TILE_SIZE / 2;
                    const wall = this.wallGroup.create(x, y, 'tile_tree');
                    wall.setDepth(y + 0.5);
                    wall.refreshBody();
                }
            });
        });
    }

    update(time, delta) {
        if (!this.player?.active) return;

        // Music mood — throttled to every 500ms
        this._musicMoodTimer = (this._musicMoodTimer ?? 0) + delta;
        if (this._musicMoodTimer >= 500) {
            this._musicMoodTimer = 0;
            musicManager.updateMood(playerStats.manaScent, !!this.boss?.active);
            this._updateScholarsEye();
        }

        const joyVec = this.scene.get('UIScene')?._joyVec ?? null;
        this.player.update(this.cursors, this.wasd, this.attackKey, this.powerKey, delta, joyVec);
        this.player.setDepth(this.player.y + 1);

        this.enemies.getChildren().forEach(e => {
            if (!e.active) return;
            // Knockup: freeze AI, tick timer, fire land callback when done
            if (e._knockupTimer > 0) {
                e._knockupTimer -= delta;
                e.body?.setVelocity(0, 0);
                if (e._knockupTimer <= 0) {
                    e._knockupTimer = 0;
                    e._onKnockupLand?.();
                }
            } else {
                e.update(this.player, delta);
            }
            e.setDepth(e.y + 1);
            if (e.healthBar) e.healthBar.setDepth(e.y + 5);
        });

        // Quagmire slow — applied after enemy velocity is set this frame
        if (this._quagmireZones?.length) {
            const now = this.time.now;
            this._quagmireZones = this._quagmireZones.filter(z => z.expiry > now);
            this._quagmireZones.forEach(z => {
                this.enemies.getChildren().forEach(e => {
                    if (!e.active) return;
                    if (Phaser.Math.Distance.Between(z.x, z.y, e.x, e.y) <= z.r)
                        e.body.setVelocity(e.body.velocity.x * 0.25, e.body.velocity.y * 0.25);
                });
                if (this.boss?.active && Phaser.Math.Distance.Between(z.x, z.y, this.boss.x, this.boss.y) <= z.r)
                    this.boss.body.setVelocity(this.boss.body.velocity.x * 0.40, this.boss.body.velocity.y * 0.40);
            });
        }

        // Boss tick + player attack
        if (this.boss?.active) {
            this.boss.update(this.player, delta);
            if (this.player.isAttacking && this.player.attackHitbox.active) {
                this.physics.overlap(this.player.attackHitbox, this.boss, () => {
                    this.combatManager.hitTarget(this.boss);
                });
            }
        }

        // Augmentation keys — Blink-Step [SPACE] / Aetheric Sight [V]
        if (Phaser.Input.Keyboard.JustDown(this.blinkKey)) this.player.blinkStep();
        if (Phaser.Input.Keyboard.JustDown(this.sightKey)) this.player.activateAethericSight();

        // Skill slot activation (Q/R/F/T)
        if (!this.player.isAttacking) {
            this.slotKeys.forEach((key, i) => {
                if (Phaser.Input.Keyboard.JustDown(key)) this._tryActivateSlot(i);
            });
        }

        // Reticle follows mouse while targeting / campfire placement
        if (this._targeting)       this._updateReticle();
        if (this._campfirePlacing) this._updateCampfireReticle();

        // Aetheric Tear cooldown tick
        if (this.player._tearCooldown > 0) this.player._tearCooldown -= delta;

        // Drain status queues from potion onUse callbacks
        if (playerStats._statusClearQueue?.length) {
            playerStats._statusClearQueue.forEach(id => statusManager.remove(this.player, id));
            playerStats._statusClearQueue = [];
        }
        if (playerStats._statusApplyQueue?.length) {
            playerStats._statusApplyQueue.forEach(({ id, opts }) => statusManager.apply(this.player, id, opts));
            playerStats._statusApplyQueue = [];
        }

        // Food regen tick — drains _foodRegen pool at 5 HP/s
        if ((playerStats._foodRegen ?? 0) > 0 && playerStats.health < playerStats.maxHealth) {
            const tick = Math.min(playerStats._foodRegen, 5 * delta / 1000);
            playerStats._foodRegen -= tick;
            playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + tick);
        } else if (playerStats._foodRegen < 0) {
            playerStats._foodRegen = 0;
        }

        // Explored chunk tracking (4×4 tile chunks, updated every 2 seconds)
        this._chunkTimer = (this._chunkTimer ?? 0) + delta;
        if (this._chunkTimer >= 2000) {
            this._chunkTimer = 0;
            const cx  = Math.floor(this.player.x / (TILE_SIZE * 4));
            const cy  = Math.floor(this.player.y / (TILE_SIZE * 4));
            const key = `${cx}_${cy}`;
            if (!playerStats.exploredChunks.includes(key)) playerStats.exploredChunks.push(key);
        }

        // Boss arena entry trigger
        if (!this._bossArenaTriggered && this.boss?.active) {
            const px = this.player.x / TILE_SIZE, py = this.player.y / TILE_SIZE;
            const b = BOSS_ARENA_BOUNDS;
            if (px > b.minX && px < b.maxX && py > b.minY && py < b.maxY) {
                this._bossArenaTriggered = true;
                // Trigger hidden void fragment quest on boss arena entry
                if (!questManager.isActive('hidden_void_fragment') && !questManager.isCompleted('hidden_void_fragment')) {
                    questManager.startQuest('hidden_void_fragment');
                    this.scene.get('UIScene')?.showNotification?.('A new hidden quest revealed itself...', 2500);
                }
                this.scene.pause();
                this.scene.launch('DialogueScene', { lines: DIALOGUES['boss_encounter'] });
            }
        }

        this._updateInteractPrompts();

        if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this._checkInteractions();
        }
    }

    _updateInteractPrompts() {
        const range = 52;
        const px = this.player.x, py = this.player.y;
        const near = (obj) => Phaser.Math.Distance.Between(px, py, obj.x, obj.y) < range;

        this.npcs.getChildren().forEach(npc           => npc.ePrompt?.setAlpha(near(npc) ? 1 : 0));
        this.chests.getChildren().forEach(chest       => chest.ePrompt?.setAlpha(near(chest) && !chest.opened ? 1 : 0));
        this.campfires.getChildren().forEach(cf       => cf.ePrompt?.setAlpha(near(cf) ? 1 : 0));
        this.signs.getChildren().forEach(sign         => sign.ePrompt?.setAlpha(near(sign) ? 1 : 0));
        this.crackedBoulders.getChildren().forEach(b  => b.ePrompt?.setAlpha(near(b) && b.active ? 1 : 0));
        this.gatheringGroup.getChildren().forEach(nd  => nd.ePrompt?.setAlpha(near(nd) && !nd.gathered ? 1 : 0));
        this._riftGates?.forEach(g => {
            const inRange = Phaser.Math.Distance.Between(px, py, g.wx, g.wy) < range;
            g.prompt?.setAlpha(inRange ? 1 : 0);
            g.label?.setAlpha(inRange ? 0.8 : 0);
        });

        // Expose for UIScene ATK button context
        this._nearInteract =
            this.npcs.getChildren().some(n => near(n)) ||
            this.chests.getChildren().some(c => near(c) && !c.opened) ||
            this.campfires.getChildren().some(cf => near(cf)) ||
            this.signs.getChildren().some(s => near(s)) ||
            this.crackedBoulders.getChildren().some(b => near(b) && b.active) ||
            this.gatheringGroup.getChildren().some(nd => near(nd) && !nd.gathered) ||
            !!this._riftGates?.some(g => Phaser.Math.Distance.Between(px, py, g.wx, g.wy) < range);
    }

    _checkInteractions() {
        // NPC
        this.physics.overlap(this.player.interactBox, this.npcs, (box, npc) => {
            const def = npc.npcDef;
            soundManager.interact();

            if (def.isShop) {
                // Merchant: first interaction shows greeting, then opens shop
                if (!npc.talked) {
                    npc.talked = true;
                    const lines = DIALOGUES[def.dialogue] ?? [{ speaker: def.name, text: '...' }];
                    this.scene.pause();
                    this.scene.launch('DialogueScene', {
                        lines,
                        onComplete: () => {
                            this.scene.pause();
                            this.scene.launch('ShopScene');
                        }
                    });
                } else {
                    this.scene.pause();
                    this.scene.launch('ShopScene');
                }
                return;
            }

            const npcId = def.isShop ? 'silvara' : (def.dialogue?.replace(/_greeting$|_prolog$/, '') ?? 'hermit');
            const key   = npc.talked ? def.afterDialogue : def.dialogue;
            const lines = DIALOGUES[key] ?? [{ speaker: def.name, text: '...' }];
            this.scene.pause();
            this.scene.launch('DialogueScene', {
                lines,
                onComplete: () => {
                    if (!npc.talked && def.reward) {
                        playerStats.addItem(def.reward);
                        soundManager.collect();
                        this.scene.get('UIScene')?.showNotification?.(`Received: ${def.reward.replace(/_/g, ' ')}`, 2000);
                    }
                    if (!npc.talked) questManager.onTalk(npcId);
                    npc.talked = true;
                    SaveManager.save(playerStats);
                }
            });
        });

        // Campfire — basic rest always available; Full Rest requires Traveler's Tent
        this.physics.overlap(this.player.interactBox, this.campfires, () => {
            playerStats.gainResonance('fire', RESONANCE_GAINS.rest_campfire.fire);
            soundManager.interact();
            this.scene.pause();
            this.scene.launch('CampfireScene');
        });

        // Sign
        this.physics.overlap(this.player.interactBox, this.signs, (box, sign) => {
            soundManager.interact();
            questManager.onReadSign();
            this.scene.pause();
            this.scene.launch('DialogueScene', {
                lines: sign.signText.split('\n\n').map(t => ({ speaker: null, text: t }))
            });
        });

        // Cracked boulder — inspect inscription
        this.physics.overlap(this.player.interactBox, this.crackedBoulders, (box, boulder) => {
            if (!boulder.active) return;
            soundManager.interact();
            this.scene.pause();
            this.scene.launch('DialogueScene', {
                lines: [{ speaker: null, text: `${boulder.boulderDef.label}\n\nEarth Pillar magic might shatter it.` }]
            });
        });

        // Gathering nodes
        this.physics.overlap(this.player.interactBox, this.gatheringGroup, (box, node) => {
            if (node.gathered) return;
            const def    = node.nodeDef;
            const hasTool = playerStats.inventory.some(i => i.id === def.tool);
            if (!hasTool) {
                const toolName = def.tool.replace(/_/g, ' ');
                soundManager.interact();
                this.scene.pause();
                this.scene.launch('DialogueScene', {
                    lines: [{ speaker: null, text: `${def.label}\n\nYou need an ${toolName}.` }]
                });
                return;
            }
            node.gathered = true;
            node.ePrompt?.setAlpha(0);
            node.ePrompt?.destroy();
            if (playerStats.addItem(def.resource)) {
                const rName = def.resource.replace(/_/g, ' ');
                questManager.onGather(def.resource);
                soundManager.collect();
                const tint = def.type === 'wood' ? 0x8b5e3c : 0x8888aa;
                this.add.particles(node.x, node.y, 'particle', {
                    speed: { min: 20, max: 60 }, angle: { min: 0, max: 360 },
                    scale: { start: 0.7, end: 0 }, lifespan: { min: 300, max: 600 },
                    tint: [tint, 0xffffff], quantity: 10, explode: true,
                }).setDepth(60);
                this.scene.get('UIScene')?.showNotification?.(`+1 ${rName}`, 1400);
            }
            this.tweens.add({
                targets: node, alpha: 0, duration: 350,
                onComplete: () => { node.disableBody(true, false); this.tweens.add({ targets: node, alpha: 0 }); }
            });
        });

        // Rift-Gates
        this._riftGates?.forEach(gate => {
            this.physics.overlap(this.player.interactBox, gate.zone, () => {
                this._interactRiftGate(gate);
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

    _spawnEnemy(type, x, y) {
        const typeDef = ENEMY_TYPES[type] ?? {};
        const enemy   = new Enemy(this, x, y, typeDef);
        enemy.enemyType = type;

        enemy.on('died', (xp) => {
            playerStats.gainXp(xp);
            this._spawnXpText(enemy.x, enemy.y, xp);
            this._checkLevelUp();
            const gains = RESONANCE_GAINS[`kill_${type}`] ?? {};
            Object.entries(gains).forEach(([el, amt]) => playerStats.gainResonance(el, amt));
            questManager.onKill(type, {
                inVeil:     this.player._shadowVeilActive,
                weaponType: playerStats.activeWeaponType,
                isBoss:     false,
            });
            if (playerStats.activeWeaponType === 'resonance_bow' &&
                !questManager.isActive('hidden_hunters_trial') &&
                !questManager.isCompleted('hidden_hunters_trial')) {
                questManager.startQuest('hidden_hunters_trial');
            }
            playerStats.trackKill(type);
            SaveManager.save(playerStats);
        });

        enemy.on('gold', (amount) => {
            const hasSH = ITEMS[playerStats.equipment.weapon]?.passive === 'shadow_harvest';
            const gold  = hasSH && enemy._killedInVeil ? Math.floor(amount * 1.5) : amount;
            playerStats.glint += gold;
            const txt = this.add.text(enemy.x + 8, enemy.y - 10, `+${gold}gl`, {
                font: 'bold 10px monospace', fill: '#ffcc00',
                stroke: '#000', strokeThickness: 2
            }).setDepth(100).setOrigin(0.5);
            this.tweens.add({ targets: txt, y: txt.y - 22, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
        });

        enemy.on('dropped', (ex2, ey2, itemIds) => {
            itemIds.forEach((id, i) => this._spawnPickup(ex2 + i * 14, ey2, id));
        });

        enemy.on('split', (splitType, sx, sy) => {
            this._spawnEnemy(splitType, sx, sy);
        });

        enemy.on('aoeDeath', (ax, ay, radius, damage) => {
            const dist = Phaser.Math.Distance.Between(ax, ay, this.player.x, this.player.y);
            if (dist <= radius) {
                this.player.takeDamage(damage);
                this.cameras.main.shake(120, 0.006);
            }
        });

        this.enemies.add(enemy);
        return enemy;
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

    _applyDebugBoost() {
        const s = playerStats;

        // Level 15 — covers all skill level requirements (max req: Lv 4)
        s.level = 15;
        s.xp    = 0;
        s.xpToNextLevel = Math.floor(100 * Math.pow(1.5, 14));

        // Attributes — cover all skill unlock requirements
        // Power Slash: STR 10 | Ward/Shield/Sight: INT 8/8/12 | Blink/Sight: AGI 8
        s.attributes.strength     = 14;
        s.attributes.intelligence = 16;
        s.attributes.stamina      = 12;
        s.attributes.agility      = 12;
        s.maxHealth = 60 + s.attributes.stamina      * 8;
        s.maxMana   = 10 + s.attributes.intelligence * 8;
        s.health    = s.maxHealth;
        s.mana      = s.maxMana;

        // Resonance — cover all elemental gates (Arcane ≥15, Shadow ≥10)
        Object.keys(s.resonance).forEach(el => { s.resonance[el] = 60; });

        // Points — enough to max several skill branches
        s.skillPoints     = 25;
        s.attributePoints = 10;

        // Insights — enough for all masteries (total cost = 3+2+2+3+4 = 14)
        s.resonanceInsights = 15;

        // Gold + consumables for testing
        s.glint = 2000;
        s.addItem('health_potion', 10);
        s.addItem('mana_potion',   10);

        this.time.delayedCall(800, () => {
            this.scene.get('UIScene')?.showNotification?.('[DEBUG] Lv15 · 25 SP · full attributes · all resonance gates unlocked', 4000);
        });
    }
}
