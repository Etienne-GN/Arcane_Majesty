import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager.js';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';

export default class OfflineMenuScene extends Phaser.Scene {
    constructor() { super('OfflineMenuScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        bg.setScale(Math.min(w / bg.width, h / bg.height)).setAlpha(0.25);
        this.add.rectangle(0, 0, w, h, 0x000000, 0.70).setOrigin(0);

        this.add.text(w / 2, 38, 'ARCANE MAJESTY', {
            font: 'bold 26px monospace', fill: '#aabbff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        const saveInfo = SaveManager.getSaveInfo();
        const hasSave  = !!saveInfo;

        const items = [
            {
                label:   'New Game',
                sub:     hasSave ? 'Overwrite current save' : null,
                enabled: true,
                action:  () => this._newGame(),
            },
            {
                label:   'Continue',
                sub:     hasSave ? `Level ${saveInfo.level}  —  ${saveInfo.time}` : 'No save found',
                enabled: hasSave,
                action:  () => { if (hasSave) this._continue(); },
            },
        ];

        const rowW = Math.min(w * 0.60, 380);
        items.forEach((item, i) => {
            const rowY = h / 2 - 30 + i * 80;
            const col  = item.enabled ? '#dddddd' : '#334455';

            const panel = this.add.rectangle(w / 2, rowY, rowW, 58, 0x0a0a1a, 0.92)
                .setStrokeStyle(1, item.enabled ? 0x222244 : 0x111122);

            this.add.text(w / 2 - rowW / 2 + 16, rowY - 10, item.label, {
                font: 'bold 18px monospace', fill: col,
            });
            if (item.sub) {
                this.add.text(w / 2 - rowW / 2 + 16, rowY + 10, item.sub, {
                    font: '10px monospace', fill: item.enabled ? '#556677' : '#2a3a44',
                });
            }

            if (item.enabled) {
                panel.setInteractive();
                panel.on('pointerover', () => {
                    panel.setFillStyle(0x111133, 0.92);
                    panel.setStrokeStyle(1, 0x4466cc);
                    soundManager.menuHover();
                });
                panel.on('pointerout',  () => {
                    panel.setFillStyle(0x0a0a1a, 0.92);
                    panel.setStrokeStyle(1, 0x222244);
                });
                panel.on('pointerdown', item.action);
            }
        });

        this.add.text(32, h - 32, '< Back', {
            font: '15px monospace', fill: '#445566',
        }).setOrigin(0, 1).setInteractive()
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', () => { soundManager.menuSelect(); this.scene.start('MenuScene'); });

        this.input.keyboard.on('keydown-ESCAPE', () => this.scene.start('MenuScene'));

        this.cameras.main.fadeIn(400);
    }

    _newGame() {
        soundManager.menuSelect();
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('StorySelectScene'));
    }

    _continue() {
        soundManager.menuSelect();
        SaveManager.load(playerStats);
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('GameScene', { characterId: 'eldrin' }));
    }
}
