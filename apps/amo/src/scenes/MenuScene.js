import Phaser from 'phaser';
import { soundManager } from '../systems/SoundManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';

export default class MenuScene extends Phaser.Scene {
    constructor() { super('MenuScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        bg.setScale(Math.min(w / bg.width, h / bg.height));

        this._menuItems = [
            { label: 'Play Offline', action: () => this._playOffline() },
            { label: 'Play Online',  action: () => this._playOnline()  },
            { label: 'Options',           action: () => this._options()                              },
            { label: 'Character Creator', action: () => this.scene.start('CharacterCreatorScene') },
            { label: 'Credits',           action: () => this._credits()                           },
        ];
        this._menuCursor = 0;
        this._menuBtns   = [];

        this._menuItems.forEach((item, idx) => {
            const y   = h / 2 - 20 + idx * 44;
            const btn = this.add.text(w / 2, y, item.label, {
                font: 'bold 24px monospace', fill: '#dddddd',
                stroke: '#000000', strokeThickness: 2,
            }).setOrigin(0.5).setInteractive();

            btn.on('pointerover', () => { this._menuCursor = idx; this._menuHighlight(); soundManager.menuHover(); });
            btn.on('pointerout',  () => btn.setStyle({ fill: '#dddddd' }));
            btn.on('pointerdown', item.action);
            this._menuBtns.push(btn);
        });

        this.add.text(w / 2, h - 10, 'Arcane Majesty  ·  v0.1', {
            font: '9px monospace', fill: '#222244',
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ENTER', () => this._menuItems[this._menuCursor].action());
        this.input.keyboard.on('keydown-UP',    () => this._menuMove(-1));
        this.input.keyboard.on('keydown-DOWN',  () => this._menuMove(1));
        this.input.keyboard.on('keydown-SPACE', () => { soundManager.unlock(); this._playOffline(); });
        this.input.on('pointerdown', () => {
            soundManager.unlock();
            if (localStorage.getItem('auto_fullscreen') === '1'
                && document.documentElement.requestFullscreen
                && !document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        });

        this._gpNav = new GamepadNav(this);
        this.cameras.main.fadeIn(600);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.up)   this._menuMove(-1);
        if (gp.down) this._menuMove(1);
        if (gp.A)    { soundManager.unlock(); this._menuItems[this._menuCursor].action(); }
    }

    _menuMove(dir) {
        this._menuCursor = (this._menuCursor + dir + this._menuItems.length) % this._menuItems.length;
        this._menuHighlight();
        soundManager.menuHover();
    }

    _menuHighlight() {
        this._menuBtns.forEach((b, i) => b.setStyle({ fill: i === this._menuCursor ? '#ffffff' : '#dddddd' }));
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
