import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { PROLOGUE_MAP, TILE_SIZE } from '../data/worldMap.js';

const MAP_ROWS = PROLOGUE_MAP.length;
const MAP_COLS = PROLOGUE_MAP[0].length;
const MM_SCALE = 2;   // pixels per tile on minimap
const MM_W = MAP_COLS * MM_SCALE;
const MM_H = MAP_ROWS * MM_SCALE;

export default class UIScene extends Phaser.Scene {
    constructor() { super('UIScene'); }

    create() {
        this.stats = playerStats;
        const w = this.scale.width;
        const h = this.scale.height;
        const pad = 8;
        const barW = 88, barH = 8;

        // HP bar
        this.add.text(pad, pad, 'HP', { font: '9px monospace', fill: '#ff5555' });
        this.hpBg  = this.add.rectangle(pad + 16, pad + 4, barW, barH, 0x440000).setOrigin(0, 0.5);
        this.hpBar = this.add.rectangle(pad + 16, pad + 4, barW, barH, 0xcc2222).setOrigin(0, 0.5);
        this.hpNum = this.add.text(pad + 16 + barW + 3, pad - 1, '', { font: '8px monospace', fill: '#ffaaaa' });

        // MP bar
        this.add.text(pad, pad + 14, 'MP', { font: '9px monospace', fill: '#5588ff' });
        this.mpBg  = this.add.rectangle(pad + 16, pad + 18, barW, barH, 0x000044).setOrigin(0, 0.5);
        this.mpBar = this.add.rectangle(pad + 16, pad + 18, barW, barH, 0x2244cc).setOrigin(0, 0.5);
        this.mpNum = this.add.text(pad + 16 + barW + 3, pad + 13, '', { font: '8px monospace', fill: '#aabbff' });

        // XP bar (full width bottom)
        this.xpBg  = this.add.rectangle(0, h - 5, w, 5, 0x111111).setOrigin(0, 0);
        this.xpBar = this.add.rectangle(0, h - 5, 0, 5, 0xaa44ff).setOrigin(0, 0);

        // Level (top right — left of minimap)
        this.lvlText = this.add.text(w - MM_W - pad - 4, pad, '', {
            font: 'bold 10px monospace', fill: '#ffd700'
        }).setOrigin(1, 0);

        // Control hints bottom
        this.add.text(pad, h - 20, '[Z] Attack  [X] Power Slash  [E] Interact  [I] Inventory  [K] Skills', {
            font: '7px monospace', fill: '#444455'
        });

        // Gold display (top right, below minimap)
        this.goldText = this.add.text(w - pad, MM_H + pad + 6, '', {
            font: '9px monospace', fill: '#ffcc44'
        }).setOrigin(1, 0);

        // Subtle screen vignette (dark corners)
        const vig = this.add.graphics().setDepth(5);
        vig.fillStyle(0x000000, 0.22);
        vig.fillRect(0, 0, w, 18);
        vig.fillRect(0, h - 18, w, 18);
        vig.fillRect(0, 0, 18, h);
        vig.fillRect(w - 18, 0, 18, h);

        // Notification text center-top
        this.notifText = this.add.text(w / 2, 36, '', {
            font: 'bold 10px monospace', fill: '#ffd700',
            stroke: '#000', strokeThickness: 2, align: 'center'
        }).setOrigin(0.5, 0).setAlpha(0).setDepth(50);

        // ---- Minimap ----
        const mmX = w - MM_W - pad;
        const mmY = pad;

        // Static tile layer (drawn once)
        this.mmStatic = this.add.renderTexture(mmX, mmY, MM_W, MM_H).setDepth(40).setOrigin(0);
        this._drawMinimapStatic();

        // Minimap border
        const mmBdr = this.add.graphics().setDepth(42);
        mmBdr.lineStyle(1, 0x4444aa);
        mmBdr.strokeRect(mmX - 1, mmY - 1, MM_W + 2, MM_H + 2);

        // Dynamic layer (entities, redrawn each frame)
        this.mmDynamic = this.add.graphics().setDepth(41);
        this._mmX = mmX;
        this._mmY = mmY;
    }

    _drawMinimapStatic() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        PROLOGUE_MAP.forEach((row, r) => {
            row.forEach((tile, c) => {
                const color = tile === 1 ? 0x0d2010 : tile === 2 ? 0x5a4a2a : 0x1e3a14;
                g.fillStyle(color);
                g.fillRect(c * MM_SCALE, r * MM_SCALE, MM_SCALE, MM_SCALE);
            });
        });
        this.mmStatic.draw(g);
        g.destroy();
    }

    update() {
        const s = this.stats;
        const barW = 88;

        this.hpBar.width = barW * Math.max(0, s.health / s.maxHealth);
        this.mpBar.width = barW * Math.max(0, s.mana / s.maxMana);
        this.xpBar.width = this.scale.width * Math.min(1, s.xp / s.xpToNextLevel);
        this.hpNum.setText(`${s.health}/${s.maxHealth}`);
        this.mpNum.setText(`${s.mana}/${s.maxMana}`);
        this.lvlText.setText(`LV ${s.level}`);
        this.goldText?.setText(`${s.gold ?? 0}g`);

        this._updateMinimap();
    }

    _updateMinimap() {
        const game = this.scene.get('GameScene');
        if (!game || !game.player?.active) return;

        const g = this.mmDynamic;
        g.clear();

        const worldW = MAP_COLS * TILE_SIZE;
        const worldH = MAP_ROWS * TILE_SIZE;

        const toMM = (wx, wy) => ({
            x: this._mmX + (wx / worldW) * MM_W,
            y: this._mmY + (wy / worldH) * MM_H
        });

        // Enemies
        game.enemies?.getChildren().forEach(e => {
            if (!e.active) return;
            const { x, y } = toMM(e.x, e.y);
            g.fillStyle(0xff2222);
            g.fillRect(x - 1, y - 1, 2, 2);
        });

        // NPCs
        game.npcs?.getChildren().forEach(npc => {
            const { x, y } = toMM(npc.x, npc.y);
            g.fillStyle(0x44ff44);
            g.fillRect(x - 1, y - 1, 2, 2);
        });

        // Chests
        game.chests?.getChildren().forEach(chest => {
            if (chest.opened) return;
            const { x, y } = toMM(chest.x, chest.y);
            g.fillStyle(0xffcc00);
            g.fillRect(x - 1, y - 1, 2, 2);
        });

        // Player (white dot, slightly larger)
        const { x: px, y: py } = toMM(game.player.x, game.player.y);
        g.fillStyle(0xffffff);
        g.fillRect(px - 1, py - 1, 3, 3);
    }

    showNotification(msg, duration = 2500) {
        this.notifText.setText(msg).setAlpha(1);
        this.tweens.killTweensOf(this.notifText);
        this.tweens.add({ targets: this.notifText, alpha: 0, duration: 500, delay: duration });
    }
}
