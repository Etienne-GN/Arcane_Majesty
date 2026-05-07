import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { PROLOGUE_MAP, TILE_SIZE, RIFT_GATE_POSITIONS } from '../data/worldMap.js';

const MAP_ROWS = PROLOGUE_MAP.length;
const MAP_COLS = PROLOGUE_MAP[0].length;
const SCALE    = 4;   // px per tile in the map overlay

export default class WorldMapScene extends Phaser.Scene {
    constructor() { super('WorldMapScene'); }

    create() {
        const w = this.scale.width;   // 480
        const h = this.scale.height;  // 320

        // Dark overlay
        this.add.rectangle(0, 0, w, h, 0x000000, 0.90).setOrigin(0);

        // Title
        this.add.text(w / 2, 8, 'WORLD MAP', {
            font: 'bold 13px monospace', fill: '#ffd700',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 0);

        // Map dimensions
        const mapPxW = MAP_COLS * SCALE;   // 200
        const mapPxH = MAP_ROWS  * SCALE;  // 160
        const mapX   = Math.floor((w - mapPxW) / 2);  // 140
        const mapY   = 26;

        // Draw tile layer into a render texture
        const rt = this.add.renderTexture(mapX, mapY, mapPxW, mapPxH).setDepth(1);
        const g  = this.make.graphics({ x: 0, y: 0, add: false });
        PROLOGUE_MAP.forEach((row, r) => {
            row.forEach((tile, c) => {
                const color = tile === 1 ? 0x0d2010 : tile === 2 ? 0x5a4a2a : 0x1e3a14;
                g.fillStyle(color);
                g.fillRect(c * SCALE, r * SCALE, SCALE, SCALE);
            });
        });
        rt.draw(g);
        g.destroy();

        // Map border
        this.add.graphics().setDepth(2)
            .lineStyle(1, 0x334499, 0.8)
            .strokeRect(mapX - 1, mapY - 1, mapPxW + 2, mapPxH + 2);

        // Rift gate markers
        const worldW = MAP_COLS * TILE_SIZE;
        const worldH = MAP_ROWS  * TILE_SIZE;

        RIFT_GATE_POSITIONS.forEach(gate => {
            const gx = mapX + (gate.x + 0.5) * SCALE;
            const gy = mapY + (gate.y + 0.5) * SCALE;
            const isAttuned = playerStats.attunedGates.includes(gate.id);

            const mk = this.add.graphics().setDepth(3);
            if (isAttuned) {
                mk.fillStyle(0xffd700, 1);
                mk.fillCircle(gx, gy, 4);
                mk.lineStyle(1, 0xffffff, 0.7);
                mk.strokeCircle(gx, gy, 5);
            } else {
                mk.lineStyle(1, 0x336699, 0.8);
                mk.strokeCircle(gx, gy, 3);
            }

            this.add.text(gx + 7, gy - 3, gate.label, {
                font: '6px monospace',
                fill: isAttuned ? '#ffd700' : '#335577'
            }).setOrigin(0, 0.5).setDepth(4);
        });

        // Player position dot (from paused GameScene)
        const game = this.scene.get('GameScene');
        if (game?.player?.active) {
            const ppx = mapX + (game.player.x / worldW) * mapPxW;
            const ppy = mapY + (game.player.y / worldH) * mapPxH;
            const dot = this.add.graphics().setDepth(5);
            dot.fillStyle(0xffffff, 1);
            dot.fillCircle(ppx, ppy, 2);
            this.tweens.add({ targets: dot, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
        }

        // Legend
        const legY = mapY + mapPxH + 6;
        this.add.graphics().setDepth(3)
            .fillStyle(0xffd700, 1).fillCircle(8, legY + 5, 4)
            .lineStyle(1, 0x336699, 0.8).strokeCircle(90, legY + 5, 3);
        this.add.text(16, legY, 'Attuned Gate', { font: '7px monospace', fill: '#ffd700' }).setDepth(4);
        this.add.text(98, legY, 'Unknown Gate', { font: '7px monospace', fill: '#335577' }).setDepth(4);
        this.add.text(w - 4, legY, '[ESC]/[M] Close', {
            font: '7px monospace', fill: '#334455'
        }).setOrigin(1, 0).setDepth(4);

        // Close keys
        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-M',   () => this._close());
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
