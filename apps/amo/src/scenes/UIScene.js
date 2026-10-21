import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { TILE_SIZE } from '../data/worldMap.js';
import { visibleFeatures } from '../systems/mapMarkers.js';
import { statusManager } from '../systems/StatusManager.js';
import { STATUS_DEFS } from '../data/statuses.js';
import { isMobile } from '../utils/platform.js';
import LauncherControls from '../controls/LauncherControls.js';
import { HOTBAR_SIZE, hotbarView } from '../systems/hotbar.js';
import { clockLabel } from '../systems/gameClock.js';
import { WEATHER } from '../data/weather.js';

const MINIMAP_TILES = 48;   // W5: tiles across the minimap window

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

        // Vigor bar (W1) — thin, under MP: sprint and hop spend it
        this.add.text(pad, pad + 44, 'VG', { font: '10px monospace', fill: '#66cc77' });
        this.vgBg  = this.add.rectangle(pad + 32, pad + 47, barW, 6, 0x0c2a12).setOrigin(0, 0.5);
        this.vgBar = this.add.rectangle(pad + 32, pad + 47, barW, 6, 0x44cc66).setOrigin(0, 0.5);

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

        this._initHotbar(w, h);

        // Gold display (top right, below minimap)
        this.goldText = this.add.text(w - pad, this._mmH + pad + 12, '', {
            font: '18px monospace', fill: '#ffcc44'
        }).setOrigin(1, 0);

        // Resonance Insight counter
        this.insightText = this.add.text(w - pad, this._mmH + pad + 38, '', {
            font: '16px monospace', fill: '#cc99ff'
        }).setOrigin(1, 0);

        // Clock and weather (systems/gameClock.js, data/weather.js), under the counters
        this.worldText = this.add.text(w - pad, this._mmH + pad + 62, '', {
            font: '14px monospace', fill: '#aabbdd', stroke: '#000', strokeThickness: 3,
        }).setOrigin(1, 0);
        this._wxShown = undefined;
        this._wxObjs  = [];

        // Notification text center-top
        this.notifText = this.add.text(w / 2, 72, '', {
            font: 'bold 20px monospace', fill: '#ffd700',
            stroke: '#000', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5, 0).setAlpha(0).setDepth(50);

        // W5: dense forest darkens the edges of the view (fades in and out in UIScene.update).
        // Stacked translucent edge bands: a stretched gradient texture rendered too faint.
        this._vignette = this.add.graphics().setDepth(-2).setAlpha(0);
        const VG_BANDS = 32, vgBand = Math.min(w, h) * 0.32 / VG_BANDS;
        for (let i = 0; i < VG_BANDS; i++) {
            const d = vgBand * (VG_BANDS - i);
            this._vignette.fillStyle(0x000000, 0.05)
                .fillRect(0, 0, w, d).fillRect(0, h - d, w, d)
                .fillRect(0, d, d, h - 2 * d).fillRect(w - d, d, d, h - 2 * d);
        }

        // ---- Minimap (W5): a 48-tile window of the explored map, centred on the player ----
        const mmX = w - this._mmW - pad;
        const mmY = pad;
        this.add.rectangle(mmX, mmY, this._mmW, this._mmH, 0x000000, 1).setOrigin(0).setDepth(39);
        this.mmImage = null;   // shows GameScene._mapImg, cropped
        this._mmKey  = null;

        const mmBdr = this.add.graphics().setDepth(42);
        mmBdr.lineStyle(2, 0x4444aa);
        mmBdr.strokeRect(mmX - 2, mmY - 2, this._mmW + 4, this._mmH + 4);

        this.mmDynamic = this.add.graphics().setDepth(41);
        this._mmX = mmX;
        this._mmY = mmY;
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
        this.vgBar.width = barW * Math.max(0, Math.min(1, s.vigor / s.maxVigor));
        this.vgBar.setFillStyle(s.vigorWinded ? 0x557755 : 0x44cc66)
            .setAlpha(s.vigorWinded ? Math.sin(Date.now() * 0.01) * 0.3 + 0.7 : 1);

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

        const dense = !!this.scene.get('GameScene')?._inDense;
        this._vignette.alpha += ((dense ? 1 : 0) - this._vignette.alpha) * Math.min(1, this.game.loop.delta / 600);
        this._controls.update();
        this._updateMinimap();
        this._updateHotbar();
        this._updateWorld();
    }

    // HUD clock + weather word, and the screen-space weather overlay (behind the HUD).
    _updateWorld() {
        const game = this.scene.get('GameScene');
        const wx = game?._weatherId ?? null;
        const word = wx && wx !== 'clear' ? ` · ${WEATHER[wx]}` : '';
        this.worldText.setText(`${clockLabel(this.stats.gameMinutes ?? 480)}${word}`);
        if (wx !== this._wxShown) this._buildWeather(wx);
    }

    _buildWeather(id) {
        this._wxShown = id;
        this._wxObjs.forEach(o => o.destroy());
        this._wxObjs = [];
        if (!id || id === 'clear') return;
        const w = this.scale.width, h = this.scale.height;
        const tex = (key, draw) => {
            if (this.textures.exists(key)) return;
            const g = this.make.graphics({ x: 0, y: 0 }, false);
            draw(g);
            g.destroy();
        };
        tex('wx_rain', g => { g.fillStyle(0xaaccff, 1).fillRect(0, 0, 2, 12); g.generateTexture('wx_rain', 2, 12); });
        tex('wx_snow', g => { g.fillStyle(0xffffff, 1).fillCircle(2, 2, 2); g.generateTexture('wx_snow', 4, 4); });
        tex('wx_sand', g => { g.fillStyle(0xd8b878, 1).fillRect(0, 0, 4, 2); g.generateTexture('wx_sand', 4, 2); });
        const add = o => { this._wxObjs.push(o.setDepth(-1)); return o; };
        const tint = { rain: [0x223355, 0.18], storm: [0x111833, 0.32], snow: [0xddeeff, 0.10], sandstorm: [0xc2a060, 0.30] }[id];
        if (tint) add(this.add.rectangle(0, 0, w, h, tint[0], tint[1]).setOrigin(0));
        if (id === 'rain' || id === 'storm') {
            add(this.add.particles(0, 0, 'wx_rain', {
                // Spawned across the whole screen so a change of weather fills it at once
                x: { min: -100, max: w + 100 }, y: { min: -20, max: h }, speedY: { min: 520, max: 680 }, speedX: { min: -90, max: -60 },
                lifespan: { min: 400, max: 1200 }, alpha: { min: 0.35, max: 0.6 },
                quantity: id === 'storm' ? 6 : 3, frequency: 20,
            }));
        } else if (id === 'snow') {
            add(this.add.particles(0, 0, 'wx_snow', {
                x: { min: -40, max: w + 40 }, y: { min: -10, max: h }, speedY: { min: 40, max: 90 }, speedX: { min: -25, max: 25 },
                lifespan: { min: 3000, max: 7000 }, alpha: { min: 0.5, max: 0.9 }, scale: { min: 0.6, max: 1.4 },
                quantity: 2, frequency: 30,
            }));
        } else if (id === 'sandstorm') {
            add(this.add.particles(0, 0, 'wx_sand', {
                x: { min: -20, max: w }, y: { min: 0, max: h }, speedX: { min: 320, max: 480 }, speedY: { min: -30, max: 30 },
                lifespan: { min: 800, max: 2500 }, alpha: { min: 0.3, max: 0.7 },
                quantity: 6, frequency: 25,
            }));
        }
    }

    // Consumable hotbar (systems/hotbar.js): bottom centre on desktop, a row
    // just above the skill ring when the touch deck is shown. Tap or 1–4 to use.
    _initHotbar(w, h) {
        const touch = this._controls._deckVisible();
        const size = touch ? 36 : 40, gap = 6;
        const rowW = HOTBAR_SIZE * size + (HOTBAR_SIZE - 1) * gap;
        let x0, y0;
        if (touch && this._controls._atkData) {
            const { atkX, atkY, R_ARM, R_SK } = this._controls._atkData;
            x0 = Math.round(Math.min(w - 8 - rowW, atkX - R_ARM / 2 - rowW / 2));
            y0 = Math.round(atkY - R_ARM - R_SK - 12 - size);
        } else {
            x0 = Math.round(w / 2 - rowW / 2);
            y0 = h - 20 - size;
        }
        this._hotbar = [];
        for (let i = 0; i < HOTBAR_SIZE; i++) {
            const x = x0 + i * (size + gap);
            const bg = this.add.rectangle(x, y0, size, size, 0x0a0a1e, 0.75).setOrigin(0).setDepth(30)
                .setStrokeStyle(2, 0x333366).setInteractive();
            bg.on('pointerdown', () => {
                if (this.scene.isPaused('GameScene')) return;
                this.scene.get('GameScene')?._useHotbar?.(i);
            });
            const icon = this.add.image(x + size / 2, y0 + size / 2, '__DEFAULT').setDisplaySize(size - 12, size - 12).setDepth(31).setVisible(false);
            const block = this.add.rectangle(x + 8, y0 + 8, size - 16, size - 16, 0x8855ff).setOrigin(0).setDepth(31).setVisible(false);
            const key = this.add.text(x + 3, y0 + 1, `${i + 1}`, { font: '11px monospace', fill: '#8888bb' }).setDepth(33);
            const count = this.add.text(x + size - 3, y0 + size - 1, '', { font: 'bold 12px monospace', fill: '#ffffff', stroke: '#000', strokeThickness: 2 }).setOrigin(1, 1).setDepth(33);
            const shade = this.add.rectangle(x, y0, size, size, 0x000000, 0.55).setOrigin(0).setDepth(32).setVisible(false);
            this._hotbar.push({ bg, icon, block, key, count, shade, id: undefined });
        }
    }

    _updateHotbar() {
        if (!this._hotbar) return;
        const view = hotbarView(this.stats);
        const game = this.scene.get('GameScene');
        const cooling = game?.time && (this.stats._hotbarReadyAt ?? 0) > game.time.now;
        this._hotbar.forEach((b, i) => {
            const v = view[i] ?? null;
            if ((v?.id ?? null) !== b.id) {
                b.id = v?.id ?? null;
                const hasIcon = v?.icon && this.textures.exists(v.icon);
                b.icon.setVisible(!!hasIcon);
                if (hasIcon) b.icon.setTexture(v.icon);
                b.block.setVisible(!!v && !hasIcon);
                if (v && !hasIcon) b.block.setFillStyle(v.color);
            }
            const alpha = v && !v.ready ? 0.35 : 1;
            b.icon.setAlpha(alpha); b.block.setAlpha(alpha);
            b.count.setText(v ? `${v.count}` : '');
            b.shade.setVisible(!!v && v.ready && !!cooling);
        });
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
        const mi = game._mapImg ?? null;
        if ((mi?.key ?? null) !== this._mmKey) {
            this.mmImage?.destroy();
            this.mmImage = mi ? this.add.image(0, 0, mi.key).setOrigin(0).setDepth(40) : null;
            this._mmKey = mi?.key ?? null;
        }
        const g = this.mmDynamic;
        g.clear();
        if (!mi) return;   // no tile grid (a Tiled map): the box stays black

        const s = this._mmW / MINIMAP_TILES;              // minimap px per tile
        const cols = MINIMAP_TILES, rows = this._mmH / s;
        const ptx = game.player.x / TILE_SIZE, pty = game.player.y / TILE_SIZE;
        const left = ptx - cols / 2, top = pty - rows / 2;
        // Whole texels only, so nothing spills past the frame
        const cx0 = Math.max(0, Math.ceil(left)), cy0 = Math.max(0, Math.ceil(top));
        const cx1 = Math.min(mi.w, Math.floor(left + cols)), cy1 = Math.min(mi.h, Math.floor(top + rows));
        if (cx1 <= cx0 || cy1 <= cy0) this.mmImage.setVisible(false);
        else this.mmImage.setVisible(true).setScale(s).setPosition(this._mmX - left * s, this._mmY - top * s).setCrop(cx0, cy0, cx1 - cx0, cy1 - cy0);

        const toMM = (tx, ty) => [this._mmX + (tx + 0.5 - left) * s, this._mmY + (ty + 0.5 - top) * s];
        const inBox = (x, y) => x >= this._mmX && y >= this._mmY && x <= this._mmX + this._mmW && y <= this._mmY + this._mmH;
        const f = this._mmFeatures(game);
        for (const d of f.doors) {
            const [x, y] = toMM(d.x, d.y);
            if (inBox(x, y)) g.fillStyle(d.locked ? 0xaa3333 : 0xc89a5a).fillRect(x - 2, y - 2, 4, 4);
        }
        for (const l of f.landmarks) {
            const [x, y] = toMM(l.x, l.y);
            if (inBox(x, y)) g.fillStyle(l.discovered ? 0xffe080 : 0x888888).fillCircle(x, y, 2.5);
        }
        const px = this._mmX + (ptx - left) * s, py = this._mmY + (pty - top) * s;
        g.fillStyle(0xffffff).fillRect(px - 2, py - 2, 4, 4);
    }

    // Doors and landmarks seen on this map — recomputed at most every 500 ms (a big region has many).
    _mmFeatures(game) {
        const now = this.time.now;
        if (this._mmF && this._mmF.map === game._mapId && now - this._mmF.t < 500) return this._mmF.f;
        this._mmF = { map: game._mapId, t: now, f: visibleFeatures(game._mapDef, game._fog ?? null, this.stats, game._mapId) };
        return this._mmF.f;
    }

    showNotification(msg, duration = 2500) {
        this.notifText.setText(msg).setAlpha(1);
        this.tweens.killTweensOf(this.notifText);
        this.tweens.add({ targets: this.notifText, alpha: 0, duration: 500, delay: duration });
    }
}