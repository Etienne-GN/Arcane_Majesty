import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ITEMS } from '../data/items.js';

export default class StatScene extends Phaser.Scene {
    constructor() { super('StatScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        // Dim backdrop
        this.add.rectangle(0, 0, w, h, 0x000000, 0.88).setOrigin(0);

        const px = 64, py = 28, pw = w - 128, ph = h - 56;
        this.add.rectangle(px, py, pw, ph, 0x050a0f).setOrigin(0);
        const border = this.add.graphics();
        border.lineStyle(4, 0x3355aa);
        border.strokeRect(px, py, pw, ph);

        this.add.text(w / 2, py + 14, 'CHARACTER', {
            font: 'bold 22px monospace', fill: '#88aaff',
            stroke: '#000', strokeThickness: 3,
        }).setOrigin(0.5, 0);

        this.add.text(w - px - 8, py + 14, '[P] or [ESC] Close', {
            font: '13px monospace', fill: '#334455',
        }).setOrigin(1, 0);

        // Column layout
        const col1x = px + 20;
        const col2x = px + Math.floor(pw / 2) + 10;
        let oy = py + 52;

        // ── Level & XP ──────────────────────────────────────────────
        this._section(col1x, oy, 'PROGRESSION');
        oy += 24;
        const xpPct = Math.floor(playerStats.xp / playerStats.xpToNextLevel * 100);
        this._row(col1x, oy, 'Level',  `${playerStats.level}`);         oy += 20;
        this._row(col1x, oy, 'XP',     `${playerStats.xp} / ${playerStats.xpToNextLevel}  (${xpPct}%)`); oy += 20;
        this._row(col1x, oy, 'Gold',   `${playerStats.gold} g`);        oy += 20;
        this._row(col1x, oy, 'Glint',  `${playerStats.glint}`);         oy += 28;

        // ── Attributes ──────────────────────────────────────────────
        this._section(col1x, oy, 'ATTRIBUTES');
        oy += 24;
        const attr = playerStats.attributes;
        this._row(col1x, oy, 'Strength',     `${attr.strength}`);     oy += 20;
        this._row(col1x, oy, 'Intelligence', `${attr.intelligence}`); oy += 20;
        this._row(col1x, oy, 'Stamina',      `${attr.stamina}`);      oy += 20;
        this._row(col1x, oy, 'Agility',      `${attr.agility}`);      oy += 20;
        if (playerStats.attributePoints > 0) {
            this.add.text(col1x, oy, `★ ${playerStats.attributePoints} point(s) to spend — open Codex`, {
                font: 'italic 13px monospace', fill: '#ffcc44',
            });
        }

        // ── Vitals ──────────────────────────────────────────────────
        oy = py + 52;
        this._section(col2x, oy, 'VITALS');
        oy += 24;
        this._row(col2x, oy, 'HP',   `${Math.floor(playerStats.health)} / ${playerStats.maxHealth}`); oy += 20;
        this._row(col2x, oy, 'MP',   `${Math.floor(playerStats.mana)}  / ${playerStats.maxMana}`);   oy += 20;

        // Derived speed (rough estimate from agility)
        const speed = 80 + attr.agility * 4;
        this._row(col2x, oy, 'Speed', `${speed}`); oy += 28;

        // ── Equipment ───────────────────────────────────────────────
        this._section(col2x, oy, 'EQUIPMENT');
        oy += 24;
        const slots = [
            ['Head',      playerStats.equipment.head],
            ['Body',      playerStats.equipment.body],
            ['Weapon',    playerStats.equipment.weapon],
            ['Accessory', playerStats.equipment.accessory1],
            ['Accessory', playerStats.equipment.accessory2],
        ];
        for (const [label, id] of slots) {
            const name = id ? (ITEMS[id]?.name ?? id) : '—';
            this._row(col2x, oy, label, name, id ? '#ddbb77' : '#334455');
            oy += 20;
        }

        // XP bar at the bottom
        const barX = px + 16, barY = py + ph - 24, barW = pw - 32, barH = 10;
        const fill  = Math.round(barW * (playerStats.xp / playerStats.xpToNextLevel));
        const barGfx = this.add.graphics();
        barGfx.fillStyle(0x111122).fillRect(barX, barY, barW, barH);
        barGfx.fillStyle(0x3355cc).fillRect(barX, barY, fill, barH);
        barGfx.lineStyle(1, 0x2244aa).strokeRect(barX, barY, barW, barH);
        this.add.text(barX + barW / 2, barY + barH / 2, `XP  ${xpPct}%`, {
            font: '11px monospace', fill: '#8899cc',
        }).setOrigin(0.5);

        // Close
        this.input.keyboard.on('keydown-P',   () => this._close());
        this.input.keyboard.on('keydown-ESC', () => this._close());
    }

    _section(x, y, label) {
        this.add.text(x, y, label, { font: 'bold 14px monospace', fill: '#4466bb' });
        const g = this.add.graphics();
        g.lineStyle(1, 0x223355);
        g.lineBetween(x, y + 16, x + 220, y + 16);
    }

    _row(x, y, label, value, valCol = '#aabbdd') {
        this.add.text(x,       y, label + ':', { font: '14px monospace', fill: '#445566' });
        this.add.text(x + 130, y, value,       { font: '14px monospace', fill: valCol });
    }

    _close() {
        this.scene.resume('GameScene');
        this.scene.stop();
    }
}
