import Phaser from 'phaser';
import { SaveManager } from '../systems/SaveManager.js';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';

const STORIES = [
    {
        id:          'eldorias_prophecy',
        title:       "Eldoria's Prophecy",
        character:   'Eldrin',
        characterId: 'eldrin',
        description: "The Epoch of Silence. Vorgos activates Eldrin Nightshade to secure the Heart Stone of Creation — a contingency for a wound the world has not yet suffered.",
        available:   true,
    },
    {
        available: false,
    },
];

export default class StorySelectScene extends Phaser.Scene {
    constructor() { super('StorySelectScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

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
            const rowY = 130 + i * (rowH + 18);
            const pad  = 16;
            const col  = story.available ? '#ccddff' : '#334455';
            const subCol = story.available ? '#667788' : '#2a3344';

            const panel = this.add.rectangle(w / 2, rowY + rowH / 2, rowW, rowH, 0x0a0a1a, 0.92)
                .setStrokeStyle(1, story.available ? 0x222244 : 0x111122);

            if (story.available) {
                this.add.text(w / 2 - rowW / 2 + pad, rowY + 10, story.title, {
                    font: 'bold 16px monospace', fill: col,
                });
                this.add.text(w / 2 - rowW / 2 + pad, rowY + 30, `Play as ${story.character}`, {
                    font: '9px monospace', fill: subCol,
                });
                this.add.text(w / 2 - rowW / 2 + pad, rowY + 48, story.description, {
                    font: '9px monospace', fill: subCol,
                    wordWrap: { width: rowW - pad * 2 - 80 },
                });
            } else {
                this.add.text(w / 2, rowY + rowH / 2, 'More coming soon...', {
                    font: '13px monospace', fill: '#2a3a44',
                }).setOrigin(0.5);
            }

            const badgeLabel = story.available ? '[ PLAY ]' : '';
            const badgeCol   = '#ffd700';
            this.add.text(w / 2 + rowW / 2 - pad, rowY + rowH / 2, badgeLabel, {
                font: 'bold 11px monospace', fill: badgeCol,
            }).setOrigin(1, 0.5);

            if (story.available) {
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
                panel.on('pointerdown', () => this._startStory(story));
            }
        });

        this.add.text(32, h - 32, '< Back', {
            font: '15px monospace', fill: '#445566',
        }).setOrigin(0, 1).setInteractive()
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', () => { soundManager.menuSelect(); this.scene.start('OfflineMenuScene'); });

        this.input.keyboard.on('keydown-ESCAPE', () => this.scene.start('OfflineMenuScene'));

        this._availableStories = STORIES.filter(s => s.available);
        this._gpNav = new GamepadNav(this);
        this.cameras.main.fadeIn(400);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.A && this._availableStories.length) this._startStory(this._availableStories[0]);
        if (gp.B) { soundManager.menuSelect(); this.scene.start('OfflineMenuScene'); }
    }

    _startStory(story) {
        soundManager.menuSelect();
        SaveManager.deleteSave();
        playerStats.reset();
        this.registry.remove('prologueSeen');
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.scene.start('GameScene', { characterId: story.characterId });
        });
    }
}
