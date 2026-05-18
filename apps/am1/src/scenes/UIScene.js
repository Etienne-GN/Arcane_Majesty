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

        // Virtual joystick (left thumb) + Touch HUD (right thumb) + menu tray (bottom center)
        this._initVirtualJoystick(w, h);
        this._initTouchHUD(w, h);
        this._initMenuTray(w, h);
        this._initGamepad();

        // Pause / menu button — top center
        const pauseBtn = this.add.text(w / 2, 5, 'II', {
            font: 'bold 9px monospace', fill: '#445566', stroke: '#000000', strokeThickness: 1
        }).setOrigin(0.5, 0).setInteractive().setDepth(50);
        pauseBtn.on('pointerdown', () => {
            this.scene.get('GameScene')?.scene.start('MenuScene');
        });

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

    // ── Virtual Joystick ──────────────────────────────────────────────────────

    _initVirtualJoystick(w, h) {
        const R_BASE = 44;
        const R_KNOB = 18;
        const PAD    = 12;
        const cx = PAD + R_BASE;
        const cy = h - PAD - R_BASE;

        this._joyVec    = { x: 0, y: 0 };
        this._joyActive = false;
        this._joyCx     = cx;
        this._joyCy     = cy;
        this._joyR      = R_BASE;
        this._joyRKnob  = R_KNOB;
        this._joyKnobX  = cx;
        this._joyKnobY  = cy;

        this._joyBaseG = this.add.graphics().setDepth(17);
        this._joyKnobG = this.add.graphics().setDepth(18);

        const zoneSize = (R_BASE + 20) * 2;
        const zone = this.add.rectangle(
            cx - R_BASE - 20, cy - R_BASE - 20, zoneSize, zoneSize, 0, 0
        ).setOrigin(0).setInteractive().setDepth(16);

        zone.on('pointerdown', (ptr) => {
            this._joyActive = true;
            this._joyUpdate(ptr.x, ptr.y);
        });
        this.input.on('pointermove', (ptr) => {
            if (this._joyActive) this._joyUpdate(ptr.x, ptr.y);
        });
        this.input.on('pointerup', () => {
            if (!this._joyActive) return;
            this._joyActive  = false;
            this._joyVec.x   = 0;
            this._joyVec.y   = 0;
            this._joyKnobX   = this._joyCx;
            this._joyKnobY   = this._joyCy;
        });
    }

    _joyUpdate(px, py) {
        const dx   = px - this._joyCx;
        const dy   = py - this._joyCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cap  = Math.min(dist, this._joyR);
        const nx   = dist > 0 ? dx / dist : 0;
        const ny   = dist > 0 ? dy / dist : 0;
        this._joyKnobX = this._joyCx + nx * cap;
        this._joyKnobY = this._joyCy + ny * cap;
        const DEAD = 0.12;
        this._joyVec.x = Math.abs(nx) > DEAD ? nx : 0;
        this._joyVec.y = Math.abs(ny) > DEAD ? ny : 0;
    }

    _drawJoystick() {
        if (localStorage.getItem('show_joystick') === '0') {
            this._joyBaseG.clear();
            this._joyKnobG.clear();
            return;
        }
        const alpha = this._hudAlpha();
        const { _joyCx: cx, _joyCy: cy, _joyR: R, _joyRKnob: RK,
                _joyKnobX: kx, _joyKnobY: ky, _joyActive: active } = this;

        this._joyBaseG.clear();
        this._joyBaseG.fillStyle(0x0a0814, alpha * 0.70);
        this._joyBaseG.fillCircle(cx, cy, R);
        this._joyBaseG.lineStyle(2, 0x3344bb, alpha * 0.80);
        this._joyBaseG.strokeCircle(cx, cy, R);
        this._joyBaseG.lineStyle(1, 0x3344bb, alpha * 0.25);
        this._joyBaseG.strokeCircle(cx, cy, R * 0.5);

        this._joyKnobG.clear();
        this._joyKnobG.fillStyle(0x1a2a88, alpha * (active ? 0.95 : 0.60));
        this._joyKnobG.fillCircle(kx, ky, RK);
        this._joyKnobG.lineStyle(2, 0x5566ff, alpha * (active ? 1.0 : 0.70));
        this._joyKnobG.strokeCircle(kx, ky, RK);
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
        const R_SK  = 18;   // skill button radius
        // Arm length chosen so buttons don't overlap: 2*R_ARM*sin(15°) > 2*R_SK+4
        const R_ARM = 86;   // ATK center → skill button center

        const atkX = w - 8 - R_ATK;
        const atkY = h - 8 - R_ATK;

        this._atkData = { atkX, atkY, R_ATK, R_SK, R_ARM };
        this._atkG    = this.add.graphics().setDepth(19);

        // ATK hit zone
        const atkHit = this.add.rectangle(atkX - R_ATK, atkY - R_ATK, R_ATK * 2, R_ATK * 2, 0, 0)
            .setOrigin(0).setInteractive().setDepth(24);
        atkHit.on('pointerdown', () => {
            if (this.scene.isPaused('GameScene')) return;
            this.scene.get('GameScene')?._tryMainAction();
            this._flashButton(atkX, atkY, R_ATK, 0xee8833);
        });

        // 4 skill buttons in a quarter-circle arc around ATK's upper-left quadrant.
        // Angles in standard math coords (0°=right, 90°=up, 180°=left).
        // Arc spans 175°→145°→115°→85°: from nearly-left to nearly-up.
        const ANGLES_DEG = [175, 145, 115, 85];  // Q, R, F, T

        this._slotData = [];
        for (let i = 0; i < 4; i++) {
            const rad = Phaser.Math.DegToRad(ANGLES_DEG[i]);
            const sx  = Math.round(atkX + Math.cos(rad) * R_ARM);
            const sy  = Math.round(atkY - Math.sin(rad) * R_ARM);

            const slotG = this.add.graphics().setDepth(20);
            const cdG   = this.add.graphics().setDepth(21);

            this.add.text(sx - R_SK + 2, sy - R_SK + 2, SLOT_KEYS[i], {
                font: '6px monospace', fill: '#22224a'
            }).setDepth(22);

            const nameLabel = this.add.text(sx, sy + 1, '—', {
                font: 'bold 9px monospace', fill: '#2a2a50', align: 'center'
            }).setOrigin(0.5).setDepth(22);

            const costLabel = this.add.text(sx, sy + R_SK - 5, '', {
                font: '6px monospace', fill: '#334466', align: 'center'
            }).setOrigin(0.5, 1).setDepth(22);

            const hit = this.add.rectangle(sx - R_SK, sy - R_SK, R_SK * 2, R_SK * 2, 0, 0)
                .setOrigin(0).setInteractive().setDepth(24);
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
        const { atkX, atkY, R_ATK, R_SK, R_ARM } = this._atkData;
        const g = this._atkG;

        // ── ATK button + connector arc (redrawn every frame for live alpha) ──
        g.clear();

        // Subtle quarter-circle arc behind skill buttons (nearly-up → nearly-left)
        // Canvas arc angles: -85° = almost-up, -175° = almost-left; anticlockwise=true
        g.lineStyle(1, 0x1a1a33, alpha * 0.30);
        g.beginPath();
        g.arc(atkX, atkY, R_ARM, Phaser.Math.DegToRad(-85), Phaser.Math.DegToRad(-175), true);
        g.strokePath();

        // ATK fill
        g.fillStyle(0x0a0814, alpha * 0.92);
        g.fillCircle(atkX, atkY, R_ATK);
        // Outer ring — orange for attack, blue when near interactable
        const nearInteract = this.scene.get('GameScene')?._nearInteract ?? false;
        const atkRingColor = nearInteract ? 0x44aaff : 0xee8833;
        g.lineStyle(2, atkRingColor, alpha);
        g.strokeCircle(atkX, atkY, R_ATK);
        // Inner accent ring
        g.lineStyle(1, atkRingColor, alpha * 0.20);
        g.strokeCircle(atkX, atkY, R_ATK - 7);
        // Sword blade
        g.lineStyle(1.5, 0xddaa55, alpha * 0.88);
        g.lineBetween(atkX, atkY - 14, atkX, atkY + 11);
        // Guard
        g.lineStyle(1.5, 0xddaa55, alpha * 0.72);
        g.lineBetween(atkX - 9, atkY - 2, atkX + 9, atkY - 2);
        // Pommel
        g.fillStyle(0xddaa55, alpha * 0.68);
        g.fillCircle(atkX, atkY + 14, 2.5);

        // ── Skill buttons ────────────────────────────────────────────────────
        const R_SK_VAL = R_SK;
        for (let i = 0; i < 4; i++) {
            const { slotG, cdG, nameLabel, costLabel, sx, sy } = this._slotData[i];
            const spellId = playerStats.skillSlots[i];

            slotG.clear();
            cdG.clear();

            if (!spellId) {
                slotG.fillStyle(0x080818, alpha * 0.80);
                slotG.fillCircle(sx, sy, R_SK_VAL);
                slotG.lineStyle(1, 0x1a1a3a, alpha * 0.70);
                slotG.strokeCircle(sx, sy, R_SK_VAL);
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
            slotG.fillCircle(sx, sy, R_SK_VAL);
            slotG.lineStyle(2, col, alpha * 0.90);
            slotG.strokeCircle(sx, sy, R_SK_VAL);

            const cd = playerStats.spellCooldowns[spellId] ?? 0;
            if (cd > 0) {
                cdG.fillStyle(0x000000, 0.62);
                cdG.fillCircle(sx, sy, R_SK_VAL);
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
        this._drawJoystick();
        this._drawTrayTab();
        this._updateGamepad();
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

    // ── Menu Tray (slide-up from bottom border, centered between controls) ──────

    _initMenuTray(w, h) {
        const SCREENS = [
            { key: 'InventoryScene',    label: 'INV'   },
            { key: 'SkillTreeScene',    label: 'SKLS'  },
            { key: 'SpellbookScene',    label: 'TOME'  },
            { key: 'WorldMapScene',     label: 'MAP'   },
            { key: 'QuestJournalScene', label: 'QUEST' },
            { key: 'CodexScene',        label: 'CODEX' },
            { key: 'CraftingScene',     label: 'FORGE' },
        ];

        const N      = SCREENS.length;
        const BTN_R  = 13;
        const TRAY_H = 96;

        const BTN_GAP  = 6;   // gap between button edges
        const SLOT_W   = BTN_R * 2 + BTN_GAP;
        const groupW   = N * BTN_R * 2 + (N - 1) * BTN_GAP;
        const startX   = w / 2 - groupW / 2 + BTN_R; // first button center

        this._trayOpen    = false;
        this._trayOpenY   = h - TRAY_H;
        this._trayClosedY = h + 5;

        // Container slides along y — children use LOCAL coords (0 = container top-left)
        this._trayCont = this.add.container(0, this._trayClosedY).setDepth(14);

        // Button circles (all on one graphics object)
        const btnsG = this.make.graphics({ add: false });
        this._trayBtnData = SCREENS.map((sc, i) => {
            const bx = startX + i * SLOT_W;
            const by = TRAY_H / 2;
            btnsG.fillStyle(0x0a1030);
            btnsG.fillCircle(bx, by, BTN_R);
            btnsG.lineStyle(1, 0x334499);
            btnsG.strokeCircle(bx, by, BTN_R);
            return { bx, by, key: sc.key };
        });
        this._trayCont.add(btnsG);

        // Labels (local positions within container)
        SCREENS.forEach((sc, i) => {
            const { bx, by } = this._trayBtnData[i];
            const lbl = this.make.text({
                x: bx, y: by, text: sc.label, add: false,
                style: { font: '5px monospace', fill: '#7799cc', align: 'center' },
            }).setOrigin(0.5);
            this._trayCont.add(lbl);
        });

        // Scene-level hit detection — avoids Container input complexity
        this.input.on('pointerdown', (ptr) => {
            if (!this._trayOpen) return;
            for (const { bx, by, key } of this._trayBtnData) {
                const worldY = this._trayCont.y + by;
                const dx = ptr.x - bx, dy = ptr.y - worldY;
                if (dx * dx + dy * dy <= BTN_R * BTN_R) {
                    const gs = this.scene.get('GameScene');
                    if (!gs || this.scene.isPaused('GameScene')) return;
                    gs.scene.pause();
                    gs.scene.launch(key);
                    this._closeTray();
                    return;
                }
            }
        });

        // Tab handle — fixed at bottom center, always visible
        const TAB_W = 48, TAB_H = 14;
        this._trayTabG  = this.add.graphics().setDepth(29);
        this._trayTabCx = w / 2;
        this._trayTabCy = h - 7;

        const tabHit = this.add.rectangle(w / 2 - TAB_W / 2, h - TAB_H, TAB_W, TAB_H, 0, 0)
            .setOrigin(0).setInteractive().setDepth(32);
        tabHit.on('pointerdown', () => this._toggleTray());
    }

    _drawTrayTab() {
        const alpha = this._hudAlpha();
        const { _trayTabCx: cx, _trayTabCy: cy, _trayOpen: open } = this;
        const g = this._trayTabG;
        g.clear();
        g.fillStyle(0x0a0814, alpha * 0.85);
        g.fillRoundedRect(cx - 24, cy - 6, 48, 12, 5);
        g.lineStyle(1, 0x3344aa, alpha * 0.90);
        g.strokeRoundedRect(cx - 24, cy - 6, 48, 12, 5);
        const dir = open ? 1 : -1;
        g.lineStyle(1.5, 0x5566dd, alpha);
        g.beginPath();
        g.moveTo(cx - 7, cy + dir * 2.5);
        g.lineTo(cx,     cy - dir * 2.5);
        g.lineTo(cx + 7, cy + dir * 2.5);
        g.strokePath();
    }

    _toggleTray() { this._trayOpen ? this._closeTray() : this._openTray(); }

    _openTray() {
        this._trayOpen = true;
        this.tweens.add({ targets: this._trayCont, y: this._trayOpenY, duration: 180, ease: 'Cubic.easeOut' });
    }

    _closeTray() {
        this._trayOpen = false;
        this.tweens.add({ targets: this._trayCont, y: this._trayClosedY, duration: 140, ease: 'Cubic.easeIn' });
    }

    // ── Gamepad ───────────────────────────────────────────────────────────────

    _initGamepad() {
        this._padPrev = {};
        this.input.gamepad.on('connected',    () => this.showNotification('Controller connected', 2000));
        this.input.gamepad.on('disconnected', () => this.showNotification('Controller disconnected', 2000));
    }

    _updateGamepad() {
        if (!this.input.gamepad?.total) return;
        const pad = this.input.gamepad.getPad(0);
        if (!pad) return;

        // ── Movement — left stick (priority) then D-pad ───────────────────────
        if (!this._joyActive) {
            const DEAD = 0.15;
            const lx = Math.abs(pad.leftStick?.x ?? 0) > DEAD ? pad.leftStick.x : 0;
            const ly = Math.abs(pad.leftStick?.y ?? 0) > DEAD ? pad.leftStick.y : 0;
            if (lx !== 0 || ly !== 0) {
                this._joyVec.x = lx;
                this._joyVec.y = ly;
            } else {
                const dpx = (pad.right > 0 ? 1 : 0) - (pad.left > 0 ? 1 : 0);
                const dpy = (pad.down  > 0 ? 1 : 0) - (pad.up   > 0 ? 1 : 0);
                const dpLen = Math.hypot(dpx, dpy) || 1;
                this._joyVec.x = dpx !== 0 || dpy !== 0 ? dpx / dpLen : 0;
                this._joyVec.y = dpx !== 0 || dpy !== 0 ? dpy / dpLen : 0;
            }
        }

        // ── Buttons — just-pressed only ───────────────────────────────────────
        const just = (i) => (pad.buttons[i]?.value > 0.5) && !this._padPrev[i];
        const gs     = this.scene.get('GameScene');
        const paused = this.scene.isPaused('GameScene');

        if (gs && !paused) {
            if (just(0)) {   // A / Cross — attack / interact
                gs._tryMainAction?.();
                this._flashButton(this._atkData.atkX, this._atkData.atkY, this._atkData.R_ATK, 0xee8833);
            }
            // B / X / Y / RB → skill slots 0-3
            [1, 2, 3, 5].forEach((btnIdx, slotIdx) => {
                if (just(btnIdx)) {
                    gs._tryActivateSlot?.(slotIdx);
                    const s = this._slotData[slotIdx];
                    if (s) this._flashButton(s.sx, s.sy, this._atkData.R_SK, 0xffffff);
                }
            });
            if (just(4)) this._toggleTray();              // LB — open/close tray
            if (just(9)) gs.scene.start('MenuScene');     // Start — pause
        }

        // Snapshot current state for next frame's just-pressed check
        const next = {};
        pad.buttons.forEach((b, i) => { next[i] = b.value > 0.5; });
        this._padPrev = next;
    }

    showNotification(msg, duration = 2500) {
        this.notifText.setText(msg).setAlpha(1);
        this.tweens.killTweensOf(this.notifText);
        this.tweens.add({ targets: this.notifText, alpha: 0, duration: 500, delay: duration });
    }
}
