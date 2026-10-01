import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { TILE_SIZE } from '../data/worldMap.js';
import { getMap } from '../data/maps/index.js';
import { statusManager } from '../systems/StatusManager.js';
import { STATUS_DEFS } from '../data/statuses.js';
import { isMobile } from '../utils/platform.js';
import LauncherControls from '../controls/LauncherControls.js';

export default class UIScene extends Phaser.Scene {
    constructor() { super('UIScene'); }

    create() {
        this.stats = playerStats;
        const w = this.scale.width;
        const h = this.scale.height;
        this._vw = w; this._vh = h;

        // Platform flags — set first so all layout below can reference them
        this._isMobile = isMobile;
        this._hudScale = isMobile ? 0.72 : 1.0;
        this._mmW = Math.round(200 * this._hudScale);
        this._mmH = Math.round(180 * this._hudScale);

        const pad = 16;
        const barW = 176, barH = 16;

        // HP bar
        this.add.text(pad, pad, 'HP', { font: '18px monospace', fill: '#ff5555' });
        this.hpBg  = this.add.rectangle(pad + 32, pad + 8, barW, barH, 0x440000).setOrigin(0, 0.5);
        this.hpBar = this.add.rectangle(pad + 32, pad + 8, barW, barH, 0xcc2222).setOrigin(0, 0.5);
        this.hpNum = this.add.text(pad + 32 + barW + 6, pad - 2, '', { font: '16px monospace', fill: '#ffaaaa' });

        // MP bar
        this.add.text(pad, pad + 28, 'MP', { font: '18px monospace', fill: '#5588ff' });
        this.mpBg  = this.add.rectangle(pad + 32, pad + 36, barW, barH, 0x000044).setOrigin(0, 0.5);
        this.mpBar = this.add.rectangle(pad + 32, pad + 36, barW, barH, 0x2244cc).setOrigin(0, 0.5);
        this.mpNum = this.add.text(pad + 32 + barW + 6, pad + 26, '', { font: '16px monospace', fill: '#aabbff' });

        // ManaScent / Ping bar
        this.add.text(pad, pad + 56, 'PG', { font: '14px monospace', fill: '#556655' });
        this.pingBg  = this.add.rectangle(pad + 32, pad + 64, barW, 10, 0x111111).setOrigin(0, 0.5);
        this.pingBar = this.add.rectangle(pad + 32, pad + 64, 0,    10, 0x44aa44).setOrigin(0, 0.5);

        // Status chips: one per active status, with seconds left; buffs on a
        // green ground, debuffs on red. Wraps onto a second row when needed.
        this._statusLabels = [];
        for (let i = 0; i < 12; i++) {
            const lbl = this.add.text(0, 0, '', {
                font: '13px monospace', fill: '#aaaaaa', stroke: '#000', strokeThickness: 2,
                padding: { x: 5, y: 2 },
            }).setAlpha(0);
            this._statusLabels.push(lbl);
        }

        // Target frame (top centre): name, level, HP, statuses, casting
        const tfW = 300, tfX = Math.round(w / 2 - tfW / 2), tfY = 12;
        this._tf = {
            x: tfX, y: tfY, w: tfW,
            bg:   this.add.graphics().setDepth(45),
            name: this.add.text(tfX + 8, tfY + 6, '', { font: 'bold 14px monospace', fill: '#ffffff', stroke: '#000', strokeThickness: 2 }).setDepth(46),
            hp:   this.add.text(tfX + tfW - 8, tfY + 6, '', { font: '12px monospace', fill: '#ffaaaa' }).setOrigin(1, 0).setDepth(46),
            cast: this.add.text(tfX + 8, tfY + 44, '', { font: '12px monospace', fill: '#ccddff' }).setDepth(46),
            chips: Array.from({ length: 8 }, () => this.add.text(0, 0, '', {
                font: '12px monospace', fill: '#aaaaaa', stroke: '#000', strokeThickness: 2, padding: { x: 4, y: 1 },
            }).setDepth(46).setAlpha(0)),
        };

        // Exhaustion overlay (full screen)
        this.exhaustionOverlay = this.add.rectangle(0, 0, w, h, 0x888888, 0).setOrigin(0).setDepth(48);
        this.exhaustionLabel   = this.add.text(w / 2, h / 2, '', {
            font: 'bold 22px monospace', fill: '#cccccc',
            stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0).setDepth(49);

        // XP bar (full width bottom)
        this.xpBg  = this.add.rectangle(0, h - 10, w, 10, 0x111111).setOrigin(0, 0);
        this.xpBar = this.add.rectangle(0, h - 10, 0,  10, 0xaa44ff).setOrigin(0, 0);

        // Level (top right — left of minimap)
        this.lvlText = this.add.text(w - this._mmW - pad - 8, pad, '', {
            font: 'bold 20px monospace', fill: '#ffd700'
        }).setOrigin(1, 0);

        // Active weapon indicator (bottom-left)
        this._weaponLabel = this.add.text(pad, h - 40, '', {
            font: '14px monospace', fill: '#556677'
        });

        // LauncherControls deck — joystick, action cluster (attack + slots +
        // power/blink/sight), menu tray, pause, gamepad. _joyVec is the deck's
        // shared movement vector (GameScene reads it via this._joyVec).
        this._controls = new LauncherControls(this);
        this._joyVec   = this._controls.joyVec;
        this._controls.create(w, h);

        // Gold display (top right, below minimap)
        this.goldText = this.add.text(w - pad, this._mmH + pad + 12, '', {
            font: '18px monospace', fill: '#ffcc44'
        }).setOrigin(1, 0);

        // Resonance Insight counter
        this.insightText = this.add.text(w - pad, this._mmH + pad + 38, '', {
            font: '16px monospace', fill: '#cc99ff'
        }).setOrigin(1, 0);

        // Notification text center-top
        this.notifText = this.add.text(w / 2, 72, '', {
            font: 'bold 20px monospace', fill: '#ffd700',
            stroke: '#000', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5, 0).setAlpha(0).setDepth(50);

        // ---- Minimap ----
        const mmX = w - this._mmW - pad;
        const mmY = pad;

        this.mmStatic = this.add.renderTexture(mmX, mmY, this._mmW, this._mmH).setDepth(40).setOrigin(0);
        this._currentMapId = null; // forces draw on first _updateMinimap tick

        const mmBdr = this.add.graphics().setDepth(42);
        mmBdr.lineStyle(2, 0x4444aa);
        mmBdr.strokeRect(mmX - 2, mmY - 2, this._mmW + 4, this._mmH + 4);

        this.mmDynamic = this.add.graphics().setDepth(41);
        this._mmX = mmX;
        this._mmY = mmY;
    }

    _drawMinimapStatic(tiles) {
        const rows = tiles.length;
        const cols = tiles[0].length;
        const tw = this._mmW / cols;   // tile width in minimap pixels
        const th = this._mmH / rows;   // tile height in minimap pixels
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        this.mmStatic.clear();
        tiles.forEach((row, r) => {
            row.forEach((tile, c) => {
                const color = tile === 1 ? 0x0d2010 : tile === 2 ? 0x5a4a2a : 0x1e3a14;
                g.fillStyle(color);
                g.fillRect(c * tw, r * th, tw, th);
            });
        });
        this.mmStatic.draw(g);
        g.destroy();
    }

    update() {
        const s = this.stats;
        const barW = 176;

        this.hpBar.width = barW * Math.max(0, s.health / s.maxHealth);
        this.xpBar.width = this._vw * Math.min(1, s.xp / s.xpToNextLevel);
        this.hpNum.setText(`${s.health}/${s.maxHealth}`);
        this.lvlText.setText(`LV ${s.level}`);
        this.goldText?.setText(`${s.glint ?? 0} gl`);
        this.insightText?.setText(`${s.resonanceInsights ?? 0} ✦`);

        const mpPct = Math.max(0, s.mana / s.maxMana);
        this.mpBar.width = barW * mpPct;
        if (s.manaExhausted) {
            this.mpBar.setFillStyle(0x555555);
        } else if (mpPct < 0.20) {
            this.mpBar.setFillStyle(0x8866aa);
        } else {
            this.mpBar.setFillStyle(0x2244cc);
        }
        this.mpNum.setText(`${s.mana}/${s.maxMana}`);

        const ping = Math.max(0, Math.min(1, s.manaScent / 100));
        this.pingBar.width = barW * ping;
        const pingColor = ping < 0.4 ? 0x44aa44 : ping < 0.75 ? 0xdd8800 : 0xcc2222;
        this.pingBar.setFillStyle(pingColor);

        const player = this.scene.get('GameScene')?.player;
        if (player) {
            const active = Object.entries(player._statuses ?? {})
                .filter(([id]) => STATUS_DEFS[id])
                .map(([id, st]) => ({ label: STATUS_DEFS[id].label, tint: STATUS_DEFS[id].tint, buff: !!STATUS_DEFS[id].buff,
                    secs: st.remaining === Infinity ? null : Math.ceil(st.remaining / 1000), stacks: st.stacks ?? 1 }))
                .sort((a, b) => (b.buff - a.buff) || ((a.secs ?? 1e9) - (b.secs ?? 1e9)));
            this._renderChips(this._statusLabels, active, 16, 80, 300);
        }
        this._drawTargetFrame(this.scene.get('GameScene')?.getTargetInfo?.() ?? null);

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

        const wt = this.stats.activeWeaponType;
        const wtLabel = { staff: 'Staff', spell_blade: 'Spell-Blade', umbral_dagger: 'Umbral Dagger', resonance_bow: 'Resonance Bow' }[wt] ?? wt;
        const wtColor = { staff: '#556677', spell_blade: '#44ccff', umbral_dagger: '#cc44ff', resonance_bow: '#88ddaa' }[wt] ?? '#556677';
        this._weaponLabel?.setText(`[${wtLabel}]`).setStyle({ fill: wtColor });

        this._controls.update();
        this._updateMinimap();
    }

    // Lay out status chips: [{ label, secs|null, stacks, buff, tint }] from (x, y), wrapping at maxW
    _renderChips(pool, entries, x, y, maxW) {
        let lx = x, ly = y;
        pool.forEach((lbl, i) => {
            const st = entries[i];
            if (!st) { lbl.setAlpha(0); return; }
            const hex = st.tint ? `#${st.tint.toString(16).padStart(6, '0')}` : '#dddddd';
            lbl.setText(`${st.label}${st.stacks > 1 ? ` ×${st.stacks}` : ''}${st.secs != null ? ` ${st.secs}s` : ''}`)
               .setStyle({ fill: hex, backgroundColor: st.buff ? '#123a1acc' : '#3a1212cc' });
            if (lx + lbl.width > x + maxW && lx > x) { lx = x; ly += lbl.height + 3; }
            const fading = st.secs != null && st.secs <= 3;
            lbl.setPosition(lx, ly).setAlpha(fading ? 0.55 + 0.45 * Math.abs(Math.sin(Date.now() * 0.008)) : 1);
            lx += lbl.width + 5;
        });
    }

    _drawTargetFrame(info) {
        const f = this._tf;
        f.bg.clear();
        if (!info) { f.name.setText(''); f.hp.setText(''); f.cast.setText(''); f.chips.forEach(c => c.setAlpha(0)); return; }
        const h = 40 + (info.cast ? 18 : 0) + (info.statuses.length ? 20 : 0);
        f.bg.fillStyle(0x000000, 0.6).fillRect(f.x, f.y, f.w, h);
        f.bg.lineStyle(2, info.elite ? 0xffcc33 : 0x444466).strokeRect(f.x, f.y, f.w, h);
        f.name.setText(`${info.elite ? '★ ' : ''}${info.name}${info.level ? `  Lv ${info.level}` : ''}${info.family ? `  · ${info.family}` : ''}`)
              .setStyle({ fill: info.dead ? '#777777' : info.elite ? '#ffdd66' : '#ffffff' });
        f.hp.setText(`${info.hp}/${info.maxHp}`);
        const barY = f.y + 26;
        f.bg.fillStyle(0x330000).fillRect(f.x + 8, barY, f.w - 16, 8);
        f.bg.fillStyle(info.hp > info.maxHp * 0.5 ? 0xcc2222 : 0xff6600).fillRect(f.x + 8, barY, (f.w - 16) * Math.max(0, info.hp / info.maxHp), 8);
        let y = f.y + 40;
        if (info.cast) {
            f.cast.setText(`casting ${info.cast.name}`).setPosition(f.x + 8, y - 2);
            f.bg.fillStyle(0x222244).fillRect(f.x + 140, y + 2, f.w - 148, 8);
            f.bg.fillStyle(0x88aaff).fillRect(f.x + 140, y + 2, (f.w - 148) * info.cast.frac, 8);
            y += 18;
        } else f.cast.setText('');
        this._renderChips(f.chips, info.statuses, f.x + 8, y, f.w - 16);
    }

    _updateMinimap() {
        const game = this.scene.get('GameScene');
        if (!game || !game.player?.active) return;

        // Redraw static layer whenever the player travels to a new map
        const mapId = game._mapId ?? 'prologue_forest';
        if (mapId !== this._currentMapId) {
            this._currentMapId = mapId;
            this._drawMinimapStatic(getMap(mapId).tiles);
        }

        const tiles  = getMap(mapId).tiles;
        const worldW = tiles[0].length * TILE_SIZE;
        const worldH = tiles.length    * TILE_SIZE;

        const g = this.mmDynamic;
        g.clear();
        const px = this._mmX + (game.player.x / worldW) * this._mmW;
        const py = this._mmY + (game.player.y / worldH) * this._mmH;
        g.fillStyle(0xffffff);
        g.fillRect(px - 2, py - 2, 4, 4);
    }

    showNotification(msg, duration = 2500) {
        this.notifText.setText(msg).setAlpha(1);
        this.tweens.killTweensOf(this.notifText);
        this.tweens.add({ targets: this.notifText, alpha: 0, duration: 500, delay: duration });
    }
}