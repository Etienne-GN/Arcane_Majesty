import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';

const COLS = 6;
const ROWS = 4;
const SLOT = 34;

export default class InventoryScene extends Phaser.Scene {
    constructor() { super('InventoryScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        // Dimmer
        this.add.rectangle(0, 0, w, h, 0x000000, 0.80).setOrigin(0);

        const panelW = COLS * SLOT + 28;
        const panelH = ROWS * SLOT + 90;
        const px = Math.floor((w - panelW) / 2);
        const py = Math.floor((h - panelH) / 2);

        // Panel
        this.add.rectangle(px, py, panelW, panelH, 0x0f0f1e).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(2, 0x4444aa);
        bdr.strokeRect(px, py, panelW, panelH);

        this.add.text(px + panelW / 2, py + 8, 'INVENTORY', {
            font: 'bold 12px monospace', fill: '#ffd700'
        }).setOrigin(0.5, 0);

        // Gold
        this.add.text(px + panelW - 8, py + 8, `Gold: ${playerStats.gold ?? 0}`, {
            font: '9px monospace', fill: '#ffcc44'
        }).setOrigin(1, 0);

        // Grid
        const gridX = px + 14;
        const gridY = py + 28;
        const inventory = playerStats.inventory;

        this.descText = this.add.text(px + 8, py + panelH - 46, '', {
            font: '8px monospace', fill: '#cccccc',
            wordWrap: { width: panelW - 16 },
            lineSpacing: 2
        });

        this.useHint = this.add.text(px + panelW / 2, py + panelH - 14, '', {
            font: '8px monospace', fill: '#888888'
        }).setOrigin(0.5, 1);

        this.selectedIdx = -1;

        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const idx = row * COLS + col;
                const sx = gridX + col * SLOT;
                const sy = gridY + row * SLOT;

                const slotBg = this.add.rectangle(sx, sy, SLOT - 2, SLOT - 2, 0x1a1a30).setOrigin(0).setInteractive();
                this.add.graphics().lineStyle(1, 0x333355).strokeRect(sx, sy, SLOT - 2, SLOT - 2);

                const item = inventory[idx];
                if (item) {
                    this.add.rectangle(sx + 4, sy + 4, SLOT - 10, SLOT - 10, item.color ?? 0x8855ff).setOrigin(0);

                    if (item.qty > 1) {
                        this.add.text(sx + SLOT - 10, sy + SLOT - 10, `${item.qty}`, {
                            font: '7px monospace', fill: '#fff'
                        }).setOrigin(1, 1);
                    }

                    slotBg.on('pointerover', () => slotBg.setFillStyle(0x2a2a44));
                    slotBg.on('pointerout',  () => slotBg.setFillStyle(idx === this.selectedIdx ? 0x222244 : 0x1a1a30));
                    slotBg.on('pointerdown', () => {
                        this.selectedIdx = idx;
                        this.descText.setText(`${item.name}\n${item.description}`);
                        this.useHint.setText('[U] Use   [ESC/I] Close');
                    });
                }
            }
        }

        this.input.keyboard.on('keydown-U', () => {
            if (this.selectedIdx < 0) return;
            const item = inventory[this.selectedIdx];
            if (!item) return;
            if (playerStats.useItem(item.id)) {
                this.scene.restart();
            }
        });

        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-I',   () => this._close());

        // Header row label
        this.add.text(px + panelW / 2, py + panelH - 58, '— Select an item —', {
            font: '7px monospace', fill: '#444466'
        }).setOrigin(0.5, 0);
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
