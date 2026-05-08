import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { PROLOGUE_MAP, TILE_SIZE, RIFT_GATE_POSITIONS } from '../data/worldMap.js';

const MAP_ROWS = PROLOGUE_MAP.length;
const MAP_COLS = PROLOGUE_MAP[0].length;

export default class WorldMapScene extends Phaser.Scene {
    constructor() { super('WorldMapScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        this.add.rectangle(0, 0, w, h, 0x000000, 0.92).setOrigin(0);

        const HEADER_H = 30;
        const FOOTER_H = 24;
        const PAD      = 16;

        // Scale map to fill available space
        const SCALE = Math.max(2, Math.floor(Math.min(
            (w - PAD * 2) / MAP_COLS,
            (h - HEADER_H - FOOTER_H) / MAP_ROWS
        )));

        const mapPxW = MAP_COLS * SCALE;
        const mapPxH = MAP_ROWS  * SCALE;
        const mapX   = Math.floor((w - mapPxW) / 2);
        const mapY   = HEADER_H;

        // ── Header ───────────────────────────────────────────────────────────
        this.add.text(w / 2, 7, 'WORLD MAP', {
            font: 'bold 13px monospace', fill: '#ffd700',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 0);

        this.add.text(w - PAD, 7, '[ESC / M] Close', {
            font: '7px monospace', fill: '#443322'
        }).setOrigin(1, 0);

        // ── Tile layer (direct world-space draw — no renderTexture offset issues) ─
        const tileG = this.add.graphics().setDepth(1);
        PROLOGUE_MAP.forEach((row, r) => {
            row.forEach((tile, c) => {
                const color = tile === 1 ? 0x0d2010 : tile === 2 ? 0x5a4a2a : 0x1e3a14;
                tileG.fillStyle(color);
                tileG.fillRect(mapX + c * SCALE, mapY + r * SCALE, SCALE, SCALE);
            });
        });

        // Border — exact same origin/size as tile area
        this.add.graphics().setDepth(2)
            .lineStyle(1, 0x334499, 0.8)
            .strokeRect(mapX, mapY, mapPxW, mapPxH);

        // ── Rift gate markers ─────────────────────────────────────────────────
        const worldW = MAP_COLS * TILE_SIZE;
        const worldH = MAP_ROWS  * TILE_SIZE;
        const dotR   = Math.max(2, Math.floor(SCALE * 0.6));

        RIFT_GATE_POSITIONS.forEach(gate => {
            const gx = mapX + (gate.x + 0.5) * SCALE;
            const gy = mapY + (gate.y + 0.5) * SCALE;
            const isAttuned = playerStats.attunedGates.includes(gate.id);

            const mk = this.add.graphics().setDepth(3);
            if (isAttuned) {
                mk.fillStyle(0xffd700, 1);
                mk.fillCircle(gx, gy, dotR + 1);
                mk.lineStyle(1, 0xffffff, 0.6);
                mk.strokeCircle(gx, gy, dotR + 2);
            } else {
                mk.lineStyle(1, 0x336699, 0.7);
                mk.strokeCircle(gx, gy, dotR);
            }

            const fontSize = SCALE >= 5 ? '6px' : '5px';
            this.add.text(gx + dotR + 3, gy, gate.label, {
                font: `${fontSize} monospace`,
                fill: isAttuned ? '#ffd700' : '#335577'
            }).setOrigin(0, 0.5).setDepth(4);
        });

        // ── Player dot ────────────────────────────────────────────────────────
        const game = this.scene.get('GameScene');
        if (game?.player?.active) {
            const ppx = mapX + (game.player.x / worldW) * mapPxW;
            const ppy = mapY + (game.player.y / worldH) * mapPxH;
            const dot = this.add.graphics().setDepth(5);
            dot.fillStyle(0xffffff, 1);
            dot.fillCircle(ppx, ppy, Math.max(2, dotR - 1));
            this.tweens.add({ targets: dot, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
        }

        // ── Legend ────────────────────────────────────────────────────────────
        const legY = mapY + mapPxH + 6;
        let lx = mapX;

        const legMk1 = this.add.graphics().setDepth(3);
        legMk1.fillStyle(0xffd700, 1).fillCircle(lx + 5, legY + 6, 4);
        this.add.text(lx + 13, legY + 2, 'Attuned Gate', { font: '7px monospace', fill: '#ffd700' }).setDepth(4);
        lx += 100;

        const legMk2 = this.add.graphics().setDepth(3);
        legMk2.lineStyle(1, 0x336699, 0.8).strokeCircle(lx + 5, legY + 6, 4);
        this.add.text(lx + 13, legY + 2, 'Unknown Gate', { font: '7px monospace', fill: '#335577' }).setDepth(4);
        lx += 100;

        const legMk3 = this.add.graphics().setDepth(3);
        legMk3.fillStyle(0xffffff, 1).fillCircle(lx + 5, legY + 6, 3);
        this.add.text(lx + 13, legY + 2, 'You are here', { font: '7px monospace', fill: '#aaaaaa' }).setDepth(4);

        // ── Input ─────────────────────────────────────────────────────────────
        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-M',   () => this._close());
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
