import Phaser from 'phaser';
import { STORIES } from '../data/stories.js';
import { soundManager } from '../systems/SoundManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';

export default class StorySelectScene extends Phaser.Scene {
    constructor() { super('StorySelectScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this._available = STORIES.filter(s => s.available);
        this._idx       = 0;

        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        bg.setScale(Math.min(w / bg.width, h / bg.height)).setAlpha(0.25);
        this.add.rectangle(0, 0, w, h, 0x000000, 0.70).setOrigin(0);

        this.add.text(w / 2, 38, 'CHOOSE YOUR STORY', {
            font: 'bold 22px monospace', fill: '#aabbff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        const rowW = Math.min(w * 0.78, 560);
        const rowH = 100;

        STORIES.forEach((story, i) => {
            const rowY  = 130 + i * (rowH + 18);
            const avail = story.available ?? false;
            const col    = avail ? '#ccddff' : '#334455';
            const subCol = avail ? '#667788' : '#2a3344';
            const pad    = 16;

            const panel = this.add.rectangle(w / 2, rowY + rowH / 2, rowW, rowH, 0x0a0a1a, 0.92)
                .setStrokeStyle(1, avail ? 0x222244 : 0x111122);

            if (avail) {
                this.add.text(w / 2 - rowW / 2 + pad, rowY + 8,  story.subtitle ?? story.title, {
                    font: '9px monospace', fill: '#445566',
                });
                this.add.text(w / 2 - rowW / 2 + pad, rowY + 22, story.title, {
                    font: 'bold 16px monospace', fill: col,
                });
                this.add.text(w / 2 - rowW / 2 + pad, rowY + 44, story.description, {
                    font: '9px monospace', fill: subCol,
                    wordWrap: { width: rowW - pad * 2 - 70 },
                });
                this.add.text(w / 2 + rowW / 2 - pad, rowY + rowH / 2, '[ PLAY ]', {
                    font: 'bold 11px monospace', fill: '#ffd700',
                }).setOrigin(1, 0.5);

                panel.setInteractive({ useHandCursor: true });
                panel.on('pointerover', () => {
                    panel.setFillStyle(0x111133, 0.92).setStrokeStyle(1, 0x4466cc);
                    soundManager.menuHover();
                });
                panel.on('pointerout', () => panel.setFillStyle(0x0a0a1a, 0.92).setStrokeStyle(1, 0x222244));
                panel.on('pointerdown', () => this._selectStory(story));
            } else {
                this.add.text(w / 2, rowY + rowH / 2, 'More coming soon...', {
                    font: '13px monospace', fill: '#2a3a44',
                }).setOrigin(0.5);
            }
        });

        this.add.text(32, h - 32, '< Back', {
            font: '15px monospace', fill: '#445566',
        }).setOrigin(0, 1).setInteractive({ useHandCursor: true })
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', () => { soundManager.menuSelect(); this.scene.start('MenuScene'); });

        this.input.keyboard.on('keydown-ESCAPE', () => this.scene.start('MenuScene'));
        this.input.keyboard.on('keydown-ENTER',  () => { if (this._available.length) this._selectStory(this._available[0]); });

        this._gpNav = new GamepadNav(this);
        this.cameras.main.fadeIn(400);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.A && this._available.length) this._selectStory(this._available[0]);
        if (gp.B) { soundManager.menuSelect(); this.scene.start('MenuScene'); }
    }

    _selectStory(story) {
        soundManager.menuSelect();
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.scene.start('CharacterSelectScene', {
                storyId:    story.id,
                storyTitle: story.title,
                characters: story.characters,
                mapId:      story.mapId,
            });
        });
    }
}
