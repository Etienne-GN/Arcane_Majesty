import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { soundManager } from '../systems/SoundManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';
import { SaveManager } from '../systems/SaveManager.js';
import { getMap } from '../data/maps/index.js';
import { resolveDeath } from '../systems/respawn.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }

    init(data) {
        this._serverUrl       = data?.serverUrl       ?? null;
        this._characterId     = data?.characterId     ?? 'eldrin';
        this._storyId         = data?.storyId         ?? null;
        this._onlineCharacter = data?.onlineCharacter ?? null;
        this._mapId           = data?.mapId           ?? null;
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

        // Settle the death now (penalty + saved rise point), whichever button follows
        const { glintLost, target } = resolveDeath(playerStats, this._mapId, id => !!getMap(id), { online: !!this._serverUrl });
        this._riseTarget = target;
        this._glintLost  = glintLost;
        if (!this._serverUrl) SaveManager.save(playerStats, this._storyId, this._characterId);
        this.add.text(w / 2, h / 2 - 28, glintLost > 0
            ? `The shadow has claimed your soul... ${glintLost} glint lost.`
            : 'The shadow has claimed your soul...', {
            font: '10px monospace', fill: '#666666', fontStyle: 'italic'
        }).setOrigin(0.5).setAlpha(0);

        soundManager.gameOver();
        this.tweens.add({ targets: title, alpha: 1, duration: 1200, delay: 200 });

        this._goButtons = [
            { label: this._serverUrl ? 'Try Again' : `Rise at ${target.label ?? 'the last safe place'}`, action: () => this._tryAgain() },
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

    // Rise at the last campfire / rift-gate (or the start of this map), paying the death penalty
    _tryAgain() {
        soundManager.menuSelect();
        const t = this._riseTarget;
        if (this._serverUrl) {   // online: as before
            playerStats.health = Math.ceil(playerStats.maxHealth * 0.5);
            playerStats.mana   = playerStats.maxMana;
        }
        this.scene.stop('UIScene');
        this.scene.stop();
        this.scene.start('GameScene', {
            characterId:     this._characterId,
            storyId:         this._storyId,
            serverUrl:       this._serverUrl,
            onlineCharacter: this._onlineCharacter,
            mapId:           t.mapId ?? undefined,
            spawnX:          t.spawnX,
            spawnY:          t.spawnY,
            respawnNotice:   this._serverUrl ? null : (this._glintLost > 0 ? `You rise again. ${this._glintLost} glint lost.` : 'You rise again.'),
        });
    }
}
