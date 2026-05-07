import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { PROLOGUE_MAP, TILE_SIZE } from '../data/worldMap.js';
import { SPELLS } from '../data/spells.js';
import { statusManager } from '../systems/StatusManager.js';
import { STATUS_DEFS } from '../data/statuses.js';

const ELEMENT_COLORS = {
    fire: 0xff6600, arcane: 0xaa44ff, lightning: 0xffdd00,
    shadow: 0x8800cc, earth: 0x44aa22, ice: 0x88ddff, nature: 0x44cc44, wind: 0xccffaa,
};
const SLOT_KEYS = ['Q', 'R', 'F', 'T'];

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

        // ManaScent / Ping bar (below MP)
        this.add.text(pad, pad + 28, 'PG', { font: '7px monospace', fill: '#556655' });
        this.pingBg  = this.add.rectangle(pad + 16, pad + 32, barW, 5, 0x111111).setOrigin(0, 0.5);
        this.pingBar = this.add.rectangle(pad + 16, pad + 32, 0, 5, 0x44aa44).setOrigin(0, 0.5);

        // Status effect label strip (below ping bar)
        this._statusLabels = [];
        for (let i = 0; i < 10; i++) {
            const lbl = this.add.text(0, 0, '', {
                font: '7px monospace', fill: '#aaaaaa', stroke: '#000', strokeThickness: 1
            }).setAlpha(0);
            this._statusLabels.push(lbl);
        }

        // Exhaustion overlay (full screen — shown during collapse, depth above game)
        this.exhaustionOverlay = this.add.rectangle(0, 0, w, h, 0x888888, 0).setOrigin(0).setDepth(48);
        this.exhaustionLabel   = this.add.text(w / 2, h / 2, '', {
            font: 'bold 11px monospace', fill: '#cccccc',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setAlpha(0).setDepth(49);

        // XP bar (full width bottom)
        this.xpBg  = this.add.rectangle(0, h - 5, w, 5, 0x111111).setOrigin(0, 0);
        this.xpBar = this.add.rectangle(0, h - 5, 0, 5, 0xaa44ff).setOrigin(0, 0);

        // Level (top right — left of minimap)
        this.lvlText = this.add.text(w - MM_W - pad - 4, pad, '', {
            font: 'bold 10px monospace', fill: '#ffd700'
        }).setOrigin(1, 0);

        // Control hints (bottom row — brief)
        this.add.text(pad, h - 10, '[WASD] Move  [Z] Atk  [X] Slash  [SPACE] Blink  [V] Sight  [Q/R/F/T] Skills  [E] Talk  [I] Inv  [K/J/M] Menu  [N] Journal  [G] Tear  [C] Fire', {
            font: '7px monospace', fill: '#333344'
        });

        // Active weapon indicator (left of skill bar)
        this._weaponLabel = this.add.text(pad, h - 58, '', {
            font: '7px monospace', fill: '#556677'
        });

        // Skill bar — 4 mappable slots Q/R/F/T
        this._initSkillBar(w, h);

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

    _initSkillBar(w, h) {
        const slotW = 48, slotH = 38, gap = 5;
        const totalW = 4 * slotW + 3 * gap;
        const startX = Math.floor((w - totalW) / 2);
        const slotTop = h - 54;

        this._slotData = [];

        for (let i = 0; i < 4; i++) {
            const sx = startX + i * (slotW + gap);

            this.add.rectangle(sx, slotTop, slotW, slotH, 0x060616, 0.9).setOrigin(0);

            const border = this.add.graphics();

            // Dark cooldown fill (shrinks as cooldown expires — fills from top)
            const cdFill = this.add.rectangle(sx, slotTop, slotW, 0, 0x000000, 0.78).setOrigin(0);

            // Element pip (small colored circle top-right)
            const pip = this.add.circle(sx + slotW - 7, slotTop + 7, 4, 0x222233);

            // Slot key label (corner)
            this.add.text(sx + 3, slotTop + 2, SLOT_KEYS[i], { font: '7px monospace', fill: '#334466' });

            // Abbreviated spell name
            const nameLabel = this.add.text(sx + slotW / 2, slotTop + slotH / 2 + 2, '—', {
                font: '8px monospace', fill: '#333344', align: 'center'
            }).setOrigin(0.5);

            // Clickable hit area (transparent)
            const hit = this.add.rectangle(sx, slotTop, slotW, slotH, 0x000000, 0).setOrigin(0).setInteractive();
            hit.on('pointerdown', () => {
                if (this.scene.isPaused('GameScene')) return;
                this.scene.get('GameScene')?._tryActivateSlot(i);
            });
            hit.on('pointerover', () => {
                border.clear();
                border.lineStyle(2, 0xffffff);
                border.strokeRect(sx, slotTop, slotW, slotH);
            });
            hit.on('pointerout', () => { /* redrawn next update frame */ });

            this._slotData.push({ border, cdFill, pip, nameLabel, sx, slotTop, slotW, slotH });
        }
    }

    _updateSkillBar() {
        for (let i = 0; i < 4; i++) {
            const { border, cdFill, pip, nameLabel, sx, slotTop, slotW, slotH } = this._slotData[i];
            const spellId = playerStats.skillSlots[i];

            if (!spellId) {
                border.clear();
                border.lineStyle(1, 0x222233);
                border.strokeRect(sx, slotTop, slotW, slotH);
                pip.setFillStyle(0x222233);
                nameLabel.setText('—').setStyle({ fill: '#333344' });
                cdFill.setSize(slotW, 0).setVisible(false);
                continue;
            }

            const spell = SPELLS[spellId];
            const level = playerStats.getSpellLevel(spellId);
            if (!spell || !level) continue;

            const col = ELEMENT_COLORS[spell.element] ?? 0x555566;
            border.clear();
            border.lineStyle(2, col);
            border.strokeRect(sx, slotTop, slotW, slotH);
            pip.setFillStyle(col);

            const abbr = spell.name.split(' ').map(w => w[0]).join('').substring(0, 3);
            nameLabel.setText(abbr).setStyle({ fill: `#${col.toString(16).padStart(6, '0')}` });

            const cd = playerStats.spellCooldowns[spellId] ?? 0;
            const maxCd = spell.cooldown?.[Math.max(0, level - 1)] ?? 1;
            const pct = cd > 0 ? Math.min(1, cd / maxCd) : 0;
            const fillH = Math.floor(slotH * pct);
            cdFill.setSize(slotW, fillH).setPosition(sx, slotTop).setVisible(fillH > 1);
        }
    }

    update() {
        const s = this.stats;
        const barW = 88;

        this.hpBar.width = barW * Math.max(0, s.health / s.maxHealth);
        this.xpBar.width = this.scale.width * Math.min(1, s.xp / s.xpToNextLevel);
        this.hpNum.setText(`${s.health}/${s.maxHealth}`);
        this.lvlText.setText(`LV ${s.level}`);
        this.goldText?.setText(`${s.glint ?? 0} gl`);

        // MP bar — grey when exhausted, pale when fatigued
        const mpPct = Math.max(0, s.mana / s.maxMana);
        this.mpBar.width = barW * mpPct;
        if (s.manaExhausted) {
            this.mpBar.setFillStyle(0x555555);
        } else if (mpPct < 0.20) {
            this.mpBar.setFillStyle(0x8866aa);   // pale warning tint
        } else {
            this.mpBar.setFillStyle(0x2244cc);
        }
        this.mpNum.setText(`${s.mana}/${s.maxMana}`);

        // ManaScent / Ping bar: green → orange → red
        const ping = Math.max(0, Math.min(1, s.manaScent / 100));
        this.pingBar.width = barW * ping;
        const pingColor = ping < 0.4 ? 0x44aa44 : ping < 0.75 ? 0xdd8800 : 0xcc2222;
        this.pingBar.setFillStyle(pingColor);

        // Status effect labels
        const player = this.scene.get('GameScene')?.player;
        if (player) {
            const activeIds = Object.keys(player._statuses ?? {});
            let lx = 8, ly = 40;
            this._statusLabels.forEach((lbl, i) => {
                const sid = activeIds[i];
                if (sid && STATUS_DEFS[sid]) {
                    const hexColor = STATUS_DEFS[sid].tint
                        ? `#${STATUS_DEFS[sid].tint.toString(16).padStart(6, '0')}`
                        : '#aaaaaa';
                    lbl.setText(STATUS_DEFS[sid].label)
                       .setStyle({ fill: hexColor })
                       .setPosition(lx, ly)
                       .setAlpha(1);
                    lx += lbl.width + 4;
                } else {
                    lbl.setAlpha(0);
                }
            });
        }

        // Exhaustion / collapse overlay
        if (s.manaCollapsed) {
            this.exhaustionOverlay.setFillStyle(0x888888, 0.28);
            this.exhaustionLabel.setText('MANA EXHAUSTION').setAlpha(Math.sin(Date.now() * 0.004) * 0.3 + 0.7);
        } else if (s.manaExhausted) {
            this.exhaustionOverlay.setFillStyle(0x888888, 0.10);
            this.exhaustionLabel.setText('').setAlpha(0);
        } else {
            this.exhaustionOverlay.setFillStyle(0x000000, 0);
            this.exhaustionLabel.setAlpha(0);
        }

        // Weapon type indicator
        const wt = this.stats.activeWeaponType;
        const wtLabel = { staff: 'Staff', spell_blade: 'Spell-Blade', umbral_dagger: 'Umbral Dagger', resonance_bow: 'Resonance Bow' }[wt] ?? wt;
        const wtColor = { staff: '#556677', spell_blade: '#44ccff', umbral_dagger: '#cc44ff', resonance_bow: '#88ddaa' }[wt] ?? '#556677';
        this._weaponLabel?.setText(`[${wtLabel}]`).setStyle({ fill: wtColor });

        this._updateSkillBar();
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
