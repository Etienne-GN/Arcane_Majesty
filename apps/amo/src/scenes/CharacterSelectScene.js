import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters.js';
import { soundManager } from '../systems/SoundManager.js';
import { buildEntityAnims } from '../utils/buildEntityAnims.js';

export default class CharacterSelectScene extends Phaser.Scene {
    constructor() { super('CharacterSelectScene'); }

    init(data) {
        this._serverUrl = data?.serverUrl ?? 'http://localhost:3002';
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this._idx = 0;

        // Background
        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        bg.setScale(Math.min(w / bg.width, h / bg.height)).setAlpha(0.25);
        this.add.rectangle(0, 0, w, h, 0x000000, 0.70).setOrigin(0);

        // Title
        this.add.text(w / 2, 38, 'CHOOSE YOUR CHARACTER', {
            font: 'bold 22px monospace', fill: '#aabbff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        // Make sure all character animations are registered
        CHARACTERS.forEach(c => buildEntityAnims(this.anims, c.animPrefix, c.animProfile));

        // Character preview panel
        const panelW = Math.min(w * 0.55, 320), panelH = 260;
        this.add.rectangle(w / 2, h / 2 - 20, panelW, panelH, 0x0a0a1a, 0.88)
            .setStrokeStyle(1, 0x333366);

        this._preview = this.add.sprite(w / 2, h / 2 - 50, CHARACTERS[0].spriteKey, CHARACTERS[0].idleFrame)
            .setScale(5);

        this._charName = this.add.text(w / 2, h / 2 + 60, '', {
            font: 'bold 20px monospace', fill: '#ffd700',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5);

        this._charClass = this.add.text(w / 2, h / 2 + 82, '', {
            font: '12px monospace', fill: '#8899bb',
        }).setOrigin(0.5);

        this._charDesc = this.add.text(w / 2, h / 2 + 104, '', {
            font: '10px monospace', fill: '#556677',
            wordWrap: { width: panelW - 20 }, align: 'center',
        }).setOrigin(0.5, 0);

        // Arrows (only shown when more than 1 character exists)
        if (CHARACTERS.length > 1) {
            this._makeArrow(w / 2 - panelW / 2 - 28, h / 2 - 50, '<', () => this._prev());
            this._makeArrow(w / 2 + panelW / 2 + 28, h / 2 - 50, '>', () => this._next());
        }

        // Character index dots
        this._dots = [];
        if (CHARACTERS.length > 1) {
            const dotSpacing = 16;
            const totalW = (CHARACTERS.length - 1) * dotSpacing;
            CHARACTERS.forEach((_, i) => {
                const dot = this.add.circle(w / 2 - totalW / 2 + i * dotSpacing, h / 2 + 148, 4, 0x334455);
                this._dots.push(dot);
            });
        }

        // Player name section
        this.add.text(w / 2, h - 118, 'YOUR NAME', {
            font: '10px monospace', fill: '#445566',
        }).setOrigin(0.5);

        const storedName = localStorage.getItem('amo_name') || this._genName();
        this._playerName = storedName;

        this._nameDisplay = this.add.text(w / 2, h - 100, storedName, {
            font: 'bold 17px monospace', fill: '#ccddff',
            stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5).setInteractive();

        this.add.text(w / 2, h - 82, '(tap to change)', {
            font: '9px monospace', fill: '#334455',
        }).setOrigin(0.5);

        this._nameDisplay.on('pointerover', () => this._nameDisplay.setStyle({ fill: '#ffffff' }));
        this._nameDisplay.on('pointerout',  () => this._nameDisplay.setStyle({ fill: '#ccddff' }));
        this._nameDisplay.on('pointerdown', () => this._editName());

        // Enter World button
        this.add.text(w / 2, h - 46, '[ ENTER WORLD ]', {
            font: 'bold 22px monospace', fill: '#ffd700',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setInteractive()
          .on('pointerover', function () { this.setStyle({ fill: '#ffffff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#ffd700' }); })
          .on('pointerdown', () => this._enter());

        // Back
        this.add.text(32, h - 32, '< Back', {
            font: '15px monospace', fill: '#445566',
        }).setOrigin(0, 1).setInteractive()
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', () => {
              soundManager.menuSelect();
              this.scene.start('ServerSelectScene');
          });

        // Keyboard
        this.input.keyboard.on('keydown-LEFT',   () => this._prev());
        this.input.keyboard.on('keydown-RIGHT',  () => this._next());
        this.input.keyboard.on('keydown-ENTER',  () => this._enter());
        this.input.keyboard.on('keydown-ESCAPE', () => this.scene.start('ServerSelectScene'));

        this._refresh();
        this.cameras.main.fadeIn(400);
    }

    _makeArrow(x, y, label, cb) {
        this.add.text(x, y, label, {
            font: 'bold 30px monospace', fill: '#445566',
        }).setOrigin(0.5).setInteractive()
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', cb);
    }

    _prev() {
        this._idx = (this._idx - 1 + CHARACTERS.length) % CHARACTERS.length;
        soundManager.menuHover();
        this._refresh();
    }

    _next() {
        this._idx = (this._idx + 1) % CHARACTERS.length;
        soundManager.menuHover();
        this._refresh();
    }

    _refresh() {
        const c = CHARACTERS[this._idx];
        this._charName.setText(c.name);
        this._charClass.setText(c.class);
        this._charDesc.setText(c.description);

        // Swap preview sprite texture & animation
        this._preview.setTexture(c.spriteKey, c.idleFrame ?? 0);
        const animKey = `${c.animPrefix}_idle_down`;
        if (this.anims.exists(animKey)) this._preview.play(animKey, true);
        if (c.tint) this._preview.setTint(c.tint); else this._preview.clearTint();

        // Update dots
        this._dots.forEach((d, i) => d.setFillStyle(i === this._idx ? 0xaabbff : 0x334455));
    }

    _editName() {
        // Native prompt — simple and reliable for a game
        const input = window.prompt('Enter your name (max 16 chars):', this._playerName);
        if (input !== null) {
            const trimmed = input.trim().slice(0, 16);
            if (trimmed.length > 0) {
                this._playerName = trimmed;
                localStorage.setItem('amo_name', trimmed);
                this._nameDisplay.setText(trimmed);
            }
        }
    }

    _genName() {
        const adj  = ['Arcane', 'Void', 'Storm', 'Iron', 'Silver', 'Shadow', 'Ember', 'Frost'];
        const noun = ['Walker', 'Seeker', 'Blade', 'Mage', 'Warden', 'Scout', 'Herald', 'Sage'];
        const name = adj[~~(Math.random() * adj.length)] + noun[~~(Math.random() * noun.length)];
        localStorage.setItem('amo_name', name);
        return name;
    }

    _enter() {
        soundManager.menuSelect();
        localStorage.setItem('amo_name', this._playerName);
        const char = CHARACTERS[this._idx];
        this.cameras.main.fadeOut(400);
        this.time.delayedCall(400, () => {
            this.scene.start('GameScene', {
                serverUrl:   this._serverUrl,
                characterId: char.id,
            });
        });
    }
}
