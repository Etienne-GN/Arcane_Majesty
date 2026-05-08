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

        // Active weapon indicator (bottom-left)
        this._weaponLabel = this.add.text(pad, h - 20, '', {
            font: '7px monospace', fill: '#556677'
        });

        // Touch HUD — round ATK button + 4 round skill slots
        this._initTouchHUD(w, h);

        // Gold display (top right, below minimap)
        this.goldText = this.add.text(w - pad, MM_H + pad + 6, '', {
            font: '9px monospace', fill: '#ffcc44'
        }).setOrigin(1, 0);

        // Resonance Insight counter
        this.insightText = this.add.text(w - pad, MM_H + pad + 19, '', {
            font: '8px monospace', fill: '#cc99ff'
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

    // ── Touch HUD ─────────────────────────────────────────────────────────────

    _hudAlpha() {
        return parseFloat(localStorage.getItem('hud_alpha') ?? '0.55');
    }

    _flashButton(cx, cy, radius, color) {
        const g = this.add.graphics().setDepth(26);
        g.fillStyle(color, 0.35);
        g.fillCircle(cx, cy, radius);
        this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
    }

    _initTouchHUD(w, h) {
        const R_ATK = 34;   // attack button radius
        const R_SK  = 20;   // skill button radius
        const CG    = R_ATK + R_SK + 6;   // ATK→nearest-skill center gap
        const SK_SP = R_SK * 2 + 8;       // skill-to-skill center spacing

        // ATK button anchored to bottom-right
        const atkX = w - 8 - R_ATK;
        const atkY = h - 8 - R_ATK;

        // 2×2 skill cluster positions, upper-left of ATK:
        //  [Q][R]
        //  [F][T]   [ATK]
        const skPos = [
            { x: atkX - CG - SK_SP, y: atkY - CG - SK_SP },  // 0 Q — top-left
            { x: atkX - CG,         y: atkY - CG - SK_SP },  // 1 R — top-right
            { x: atkX - CG - SK_SP, y: atkY - CG         },  // 2 F — bottom-left
            { x: atkX - CG,         y: atkY - CG         },  // 3 T — bottom-right
        ];

        // ATK button — one graphics object, redrawn each frame for live alpha
        this._atkG = this.add.graphics().setDepth(20);
        this._atkData = { atkX, atkY, R_ATK };

        // ATK hit zone
        const atkHit = this.add.rectangle(atkX - R_ATK, atkY - R_ATK, R_ATK * 2, R_ATK * 2, 0, 0)
            .setOrigin(0).setInteractive().setDepth(23);
        atkHit.on('pointerdown', () => {
            if (this.scene.isPaused('GameScene')) return;
            this.scene.get('GameScene')?._tryMainAction();
            this._flashButton(atkX, atkY, R_ATK, 0xee8833);
        });

        // 4 skill buttons
        this._slotData = [];
        for (let i = 0; i < 4; i++) {
            const { x: sx, y: sy } = skPos[i];

            const slotG = this.add.graphics().setDepth(20);
            const cdG   = this.add.graphics().setDepth(21);

            // Key label — tiny top-left of button
            this.add.text(sx - R_SK + 3, sy - R_SK + 2, SLOT_KEYS[i], {
                font: '6px monospace', fill: '#22224a'
            }).setDepth(22);

            const nameLabel = this.add.text(sx, sy, '—', {
                font: 'bold 9px monospace', fill: '#2a2a50', align: 'center'
            }).setOrigin(0.5).setDepth(22);

            const costLabel = this.add.text(sx, sy + R_SK - 6, '', {
                font: '6px monospace', fill: '#334466', align: 'center'
            }).setOrigin(0.5, 1).setDepth(22);

            // Hit zone
            const hit = this.add.rectangle(sx - R_SK, sy - R_SK, R_SK * 2, R_SK * 2, 0, 0)
                .setOrigin(0).setInteractive().setDepth(23);
            hit.on('pointerdown', () => {
                if (this.scene.isPaused('GameScene')) return;
                this.scene.get('GameScene')?._tryActivateSlot(i);
                this._flashButton(sx, sy, R_SK, 0xffffff);
            });

            this._slotData.push({ slotG, cdG, nameLabel, costLabel, sx, sy });
        }
    }

    _updateTouchHUD() {
        const alpha = this._hudAlpha();

        // ── ATK button ──────────────────────────────────────────────────────
        const { atkG, atkData } = { atkG: this._atkG, atkData: this._atkData };
        if (atkG && atkData) {
            const { atkX, atkY, R_ATK } = atkData;
            atkG.clear();
            // Fill
            atkG.fillStyle(0x0a0814, alpha * 0.92);
            atkG.fillCircle(atkX, atkY, R_ATK);
            // Outer ring
            atkG.lineStyle(2, 0xee8833, alpha);
            atkG.strokeCircle(atkX, atkY, R_ATK);
            // Inner ring (accent)
            atkG.lineStyle(1, 0xee8833, alpha * 0.25);
            atkG.strokeCircle(atkX, atkY, R_ATK - 7);
            // Sword icon
            atkG.lineStyle(1.5, 0xddaa55, alpha * 0.90);
            atkG.lineBetween(atkX, atkY - 14, atkX, atkY + 11);  // blade
            atkG.lineStyle(1.5, 0xddaa55, alpha * 0.75);
            atkG.lineBetween(atkX - 9, atkY - 2, atkX + 9, atkY - 2);  // guard
            atkG.fillStyle(0xddaa55, alpha * 0.70);
            atkG.fillCircle(atkX, atkY + 14, 2.5);  // pommel
        }

        // ── Skill buttons ────────────────────────────────────────────────────
        const R_SK = 20;
        for (let i = 0; i < 4; i++) {
            const { slotG, cdG, nameLabel, costLabel, sx, sy } = this._slotData[i];
            const spellId = playerStats.skillSlots[i];

            slotG.clear();
            cdG.clear();

            if (!spellId) {
                slotG.fillStyle(0x080818, alpha * 0.80);
                slotG.fillCircle(sx, sy, R_SK);
                slotG.lineStyle(1, 0x1a1a3a, alpha * 0.70);
                slotG.strokeCircle(sx, sy, R_SK);
                nameLabel.setText('—').setStyle({ fill: '#252545' });
                costLabel.setText('');
                continue;
            }

            const spell = SPELLS[spellId];
            const level = playerStats.getSpellLevel(spellId);
            if (!spell || !level) continue;

            const col    = ELEMENT_COLORS[spell.element] ?? 0x555566;
            const hexCol = `#${col.toString(16).padStart(6, '0')}`;

            slotG.fillStyle(0x080818, alpha * 0.92);
            slotG.fillCircle(sx, sy, R_SK);
            slotG.lineStyle(2, col, alpha * 0.90);
            slotG.strokeCircle(sx, sy, R_SK);

            const cd  = playerStats.spellCooldowns[spellId] ?? 0;
            if (cd > 0) {
                cdG.fillStyle(0x000000, 0.62);
                cdG.fillCircle(sx, sy, R_SK);
                const secs = Math.ceil(cd / 1000);
                nameLabel.setText(`${secs}s`).setStyle({ fill: '#777788' });
                costLabel.setText('');
            } else {
                const abbr = spell.name.split(' ').map(ww => ww[0]).join('').toUpperCase().substring(0, 4);
                nameLabel.setText(abbr).setStyle({ fill: hexCol });
                const mp = playerStats.getSpellManaCost?.(spellId) ?? 0;
                costLabel.setText(mp > 0 ? `${mp}` : '').setStyle({ fill: '#334466' });
            }
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
        this.insightText?.setText(`${s.resonanceInsights ?? 0} ✦`);

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

        this._updateTouchHUD();
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
