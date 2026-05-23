import Phaser from 'phaser';
import { soundManager } from '../systems/SoundManager.js';

export default class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        bg.setScale(Math.min(w / bg.width, h / bg.height));

        const items = [
            { label: 'Play Offline', action: () => this._playOffline() },
            { label: 'Play Online',  action: () => this._playOnline()  },
            { label: 'Options',      action: () => this._options()     },
            { label: 'Credits',      action: () => this._credits()     },
        ];

        items.forEach((item, idx) => {
            const y   = h / 2 - 20 + idx * 44;
            const btn = this.add.text(w / 2, y, item.label, {
                font: 'bold 24px monospace', fill: '#dddddd',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setInteractive();

            btn.on('pointerover', () => { btn.setStyle({ fill: '#ffffff' }); soundManager.menuHover(); });
            btn.on('pointerout',  () => btn.setStyle({ fill: '#dddddd' }));
            btn.on('pointerdown', item.action);
        });

        this.add.text(w / 2, h - 10, 'Arcane Majesty  ·  v0.1', {
            font: '9px monospace', fill: '#222244',
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ENTER', () => this._playOffline());
        this.input.keyboard.on('keydown-SPACE', () => { soundManager.unlock(); this._playOffline(); });
        this.input.on('pointerdown', () => {
            soundManager.unlock();
            if (localStorage.getItem('auto_fullscreen') === '1'
                && document.documentElement.requestFullscreen
                && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        });

        this.cameras.main.fadeIn(600);
    }

    _playOffline() {
        soundManager.menuSelect();
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('OfflineMenuScene'));
    }

    _playOnline() {
        soundManager.menuSelect();
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('ServerSelectScene'));
    }

    _options() {
        soundManager.menuSelect();
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start('OptionsScene'));
    }

    _credits() {
        soundManager.menuSelect();
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start('CreditsScene'));
    }
}
