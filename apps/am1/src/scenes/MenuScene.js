import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { SaveManager } from '../systems/SaveManager.js';
import { soundManager } from '../systems/SoundManager.js';

export default class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;
        // Cover image — scale to fill screen (CSS cover behaviour)
        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        const coverScale = Math.min(w / bg.width, h / bg.height);
        bg.setScale(coverScale);


        // Check for existing save
        const saveInfo = SaveManager.getSaveInfo();
        const hasSave = !!saveInfo;

        const debugOn = localStorage.getItem('am1_debug') === '1';

        const menuItems = [
            hasSave
                ? { label: 'Continue',   sub: `Level ${saveInfo.level}  —  ${saveInfo.time}`, action: () => this._continue() }
                : null,
            { label: 'New Game', sub: hasSave ? 'Overwrite save' : null, action: () => this._newGame() },
            { label: 'Options',  sub: debugOn ? 'Debug mode ON' : null, action: () => this._options() },
            { label: 'Credits',  sub: null, action: () => this._credits() },
        ].filter(Boolean);

        menuItems.forEach((item, idx) => {
            const y = h / 2 - 24 + idx * 30;
            const enabled = item.action !== null;
            const col = idx === 0 && hasSave ? '#ffd700' : (enabled ? '#dddddd' : '#333355');

            const btn = this.add.text(w / 2, y, item.label, {
                font: '15px monospace', fill: col
            }).setOrigin(0.5);

            if (item.sub) {
                this.add.text(w / 2, y + 12, item.sub, {
                    font: '7px monospace', fill: '#555577'
                }).setOrigin(0.5);
            }

            if (enabled) {
                btn.setInteractive();
                btn.on('pointerover', () => { btn.setStyle({ fill: '#ffffff' }); soundManager.menuHover(); });
                btn.on('pointerout',  () => btn.setStyle({ fill: col }));
                btn.on('pointerdown', item.action);
            }
        });

        // Version tag
        this.add.text(w / 2, h - 10, 'Prologue: The Forest Hunt  ·  v0.2', {
            font: '7px monospace', fill: '#222244'
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ENTER', () => { soundManager.unlock(); hasSave ? this._continue() : this._newGame(); });
        this.input.keyboard.on('keydown-SPACE', () => { soundManager.unlock(); hasSave ? this._continue() : this._newGame(); });
        this.input.on('pointerdown', () => {
            soundManager.unlock();
            if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        });

        this.cameras.main.fadeIn(600);
    }

    _continue() {
        soundManager.menuSelect();
        SaveManager.load(playerStats);
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('GameScene'));
    }

    _newGame() {
        soundManager.menuSelect();
        SaveManager.deleteSave();
        playerStats.reset();
        this.registry.remove('prologueSeen');
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => this.scene.start('GameScene'));
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
