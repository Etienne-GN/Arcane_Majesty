import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }

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

        // Fade in title
        soundManager.gameOver();
        this.tweens.add({ targets: title, alpha: 1, duration: 1200, delay: 200 });

        // Buttons
        const buttons = [
            { label: 'Try Again',       action: () => this._tryAgain() },
            { label: 'Return to Menu',  action: () => { this.scene.stop('UIScene'); this.scene.start('MenuScene'); } }
        ];
        buttons.forEach((b, i) => {
            const btn = this.add.text(w / 2, h / 2 + 10 + i * 28, b.label, {
                font: '15px monospace', fill: '#888888'
            }).setOrigin(0.5).setAlpha(0).setInteractive();
            btn.on('pointerover', () => { btn.setStyle({ fill: '#ffffff' }); soundManager.menuHover(); });
            btn.on('pointerout',  () => btn.setStyle({ fill: '#888888' }));
            btn.on('pointerdown', b.action);
            this.tweens.add({ targets: btn, alpha: 1, duration: 600, delay: 1400 + i * 200 });
        });

        this.cameras.main.fadeIn(400);
    }

    _tryAgain() {
        soundManager.menuSelect();
        // Restore half health — punishing but not unfair
        playerStats.health = Math.ceil(playerStats.maxHealth * 0.5);
        playerStats.mana   = playerStats.maxMana;
        this.scene.stop('UIScene');
        this.scene.stop();
        this.scene.start('GameScene');
    }
}
