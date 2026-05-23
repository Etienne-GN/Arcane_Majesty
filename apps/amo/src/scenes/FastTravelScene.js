import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { RIFT_GATE_POSITIONS } from '../data/worldMap.js';

export default class FastTravelScene extends Phaser.Scene {
    constructor() { super('FastTravelScene'); }

    create(data) {
        const w = this.scale.width;
        const h = this.scale.height;
        const currentGateId = data?.currentGateId ?? null;

        // Overlay
        this.add.rectangle(0, 0, w, h, 0x000000, 0.80).setOrigin(0);

        // Panel
        const panW = 320, panH = 220;
        const panX = (w - panW) / 2;
        const panY = (h - panH) / 2;
        this.add.rectangle(panX, panY, panW, panH, 0x08081a, 0.97).setOrigin(0);
        this.add.graphics().lineStyle(1, 0x334499, 0.8).strokeRect(panX, panY, panW, panH);

        // Header
        this.add.text(w / 2, panY + 10, 'AETHERIC FAST TRAVEL', {
            font: 'bold 11px monospace', fill: '#6699ff',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5);
        this.add.text(w / 2, panY + 26, 'Select a destination — attuned Rift-Gates only', {
            font: '7px monospace', fill: '#334477'
        }).setOrigin(0.5);

        // Gate list
        const attunedIds = playerStats.attunedGates;
        const gates = RIFT_GATE_POSITIONS.filter(g => attunedIds.includes(g.id));

        const rowH = 30;
        const listY = panY + 44;

        gates.forEach((gate, i) => {
            const rowY = listY + i * rowH;
            const isCurrent = gate.id === currentGateId;
            const rowBg = this.add.rectangle(panX + 10, rowY, panW - 20, 24, isCurrent ? 0x0d1830 : 0x0a0a1e, 0.9)
                .setOrigin(0).setInteractive();

            // Gate pip
            const pipG = this.add.graphics();
            pipG.fillStyle(isCurrent ? 0x447799 : 0x6699ff, 1);
            pipG.fillCircle(panX + 22, rowY + 12, isCurrent ? 3 : 4);

            this.add.text(panX + 34, rowY + 5, gate.label, {
                font: `${isCurrent ? '' : 'bold '}9px monospace`,
                fill: isCurrent ? '#556677' : '#aabbff'
            });

            if (isCurrent) {
                this.add.text(panX + panW - 22, rowY + 5, '[HERE]', {
                    font: '8px monospace', fill: '#335566'
                }).setOrigin(1, 0);
            } else {
                const btn = this.add.text(panX + panW - 22, rowY + 5, '[TRAVEL]', {
                    font: '8px monospace', fill: '#6699ff'
                }).setOrigin(1, 0);
                rowBg.on('pointerover', () => {
                    rowBg.setFillStyle(0x1a2850, 0.95);
                    btn.setStyle({ fill: '#aabbff' });
                });
                rowBg.on('pointerout', () => {
                    rowBg.setFillStyle(0x0a0a1e, 0.9);
                    btn.setStyle({ fill: '#6699ff' });
                });
                rowBg.on('pointerdown', () => this._travel(gate.id));
            }
        });

        // Footer
        this.add.text(w / 2, panY + panH - 12, '[ESC] Cancel', {
            font: '8px monospace', fill: '#334455'
        }).setOrigin(0.5);

        this.input.keyboard.on('keydown-ESC', () => this._cancel());
        this.add.text(w - 6, 4, '✕', { font: 'bold 14px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._cancel());
    }

    _travel(gateId) {
        this.scene.get('GameScene')._fastTravelTo(gateId);
        this.scene.stop();
        this.scene.resume('GameScene');
    }

    _cancel() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
