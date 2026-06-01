import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }

    init(data) {
        this._serverUrl       = data?.serverUrl       ?? null;
        this._characterId     = data?.characterId     ?? 'eldrin';
        this._storyId         = data?.storyId         ?? null;
        this._onlineCharacter = data?.onlineCharacter ?? null;
    }

    create() {
        const w = this.scale.width, h = this.scale.height;

        this.add.rectangle(0, 0, w, h, 0x000000).setOrigin(0);

        // Red vignette corners
        const vig = this.add.graphics();
        vig.fillStyle(0x440000, 0.6);
        vig.fillRect(0, 0, w, 40);
        vig.fillRect(0, h - 40, w, 40);
        vig.fillRect(0, 0, 40, h);
        vig.fillRect(w - 40, 0, 40, h);

        // Title
        const title = this.add.text(w / 2, h / 2 - 60, 'YOU DIED', {
            font: 'bold 36px monospace',
            fill: '#cc0000',
            stroke: '#440000',
            strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0);

        this.add.text(w / 2, h / 2 - 28, 'The shadow has claimed your soul...', {
            font: '10px monospace', fill: '#666666', fontStyle: 'italic'
        }).setOrigin(0.5).setAlpha(0);

        soundManager.gameOver();
        this.tweens.add({ targets: title, alpha: 1, duration: 1200, delay: 200 });

        this._goButtons = [
            { label: 'Try Again',      action: () => this._tryAgain() },
            { label: 'Return to Menu', action: () => { this.scene.stop('UIScene'); this.scene.start('MenuScene'); } }
        ];
        this._goCursor = 0;
        this._goBtns   = [];

        this._goButtons.forEach((b, i) => {
            const btn = this.add.text(w / 2, h / 2 + 10 + i * 28, b.label, {
                font: '15px monospace', fill: '#888888'
            }).setOrigin(0.5).setAlpha(0).setInteractive();
            btn.on('pointerover', () => { this._goCursor = i; this._goHighlight(); soundManager.menuHover(); });
            btn.on('pointerout',  () => btn.setStyle({ fill: '#888888' }));
            btn.on('pointerdown', b.action);
            this.tweens.add({ targets: btn, alpha: 1, duration: 600, delay: 1400 + i * 200 });
            this._goBtns.push(btn);
        });

        this._gpNav = new GamepadNav(this);
        this.cameras.main.fadeIn(400);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.up)   { this._goCursor = (this._goCursor - 1 + this._goButtons.length) % this._goButtons.length; this._goHighlight(); soundManager.menuHover(); }
        if (gp.down) { this._goCursor = (this._goCursor + 1) % this._goButtons.length; this._goHighlight(); soundManager.menuHover(); }
        if (gp.A)    this._goButtons[this._goCursor].action();
    }

    _goHighlight() {
        this._goBtns.forEach((b, i) => b.setStyle({ fill: i === this._goCursor ? '#ffffff' : '#888888' }));
    }

    _tryAgain() {
        soundManager.menuSelect();
        playerStats.health = Math.ceil(playerStats.maxHealth * 0.5);
        playerStats.mana   = playerStats.maxMana;
        this.scene.stop('UIScene');
        this.scene.stop();
        this.scene.start('GameScene', {
            characterId:     this._characterId,
            storyId:         this._storyId,
            serverUrl:       this._serverUrl,
            onlineCharacter: this._onlineCharacter,
        });
    }
}
