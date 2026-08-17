import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { SPELLS } from '../data/spells.js';
import { isMobile } from '../utils/platform.js';
import { tapKey } from './InputBus.js';
import { KEY_CODES } from './keys.js';
import { isLauncherMode } from './mode.js';
import { ELEMENT_COLORS, SLOT_KEYS, TRAY, SECONDARY } from './launcherDefs.js';

export default class LauncherControls {
    constructor(uiScene) {
        this.scene = uiScene;
        this.isMobile = isMobile;
        this.sc = isMobile ? 0.72 : 1.0;
        this.joyVec = { x: 0, y: 0 };       // shared with GameScene via UIScene._joyVec
        this._trayOpen = false;
        this._trayOpenY = 0;
        this._trayClosedY = 0;
        this._padPrev = {};
    }

    create(w, h) {
        this.w = w; this.h = h;
        this._initJoystick(w, h);
        this._initActionCluster(w, h);
        this._initMenuTray(w, h);
        this._initPause(w, h);
        this._initGamepad();
    }

    update() {
        this._updateGamepad();
        if (!this._deckVisible()) return;
        this._updateActionCluster();
        this._drawJoystick();
        this._drawTrayTab();
    }

    // Launcher mode: deck is the sole on-screen controls (always drawn).
    // Builtin mode: touch devices only; desktop uses keyboard/mouse/gamepad.
    _deckVisible() {
        return isLauncherMode || this.isMobile;
    }

    game() { return this.scene.scene.get('GameScene'); }

    _hudAlpha() { return parseFloat(localStorage.getItem('hud_alpha') ?? '0.55'); }

    // ── Joystick (movement → joyVec) ────────────────────────────────────

    _initJoystick(w, h) {
        const sc     = this.sc;
        const R_BASE = Math.round(88 * sc);
        const R_KNOB = Math.round(36 * sc);
        const PAD    = Math.round(24 * sc);
        const cx = PAD + R_BASE;
        const cy = h - PAD - R_BASE;

        this._joyActive = false;
        this._joyCx = cx;
        this._joyCy = cy;
        this._joyR  = R_BASE;
        this._joyRKnob = R_KNOB;
        this._joyKnobX = cx;
        this._joyKnobY = cy;

        this._joyBaseG = this.scene.add.graphics().setDepth(17);
        this._joyKnobG = this.scene.add.graphics().setDepth(18);

        const zoneSize = (R_BASE + 40) * 2;
        const zone = this.scene.add.rectangle(
            cx - R_BASE - 40, cy - R_BASE - 40, zoneSize, zoneSize, 0, 0
        ).setOrigin(0).setInteractive().setDepth(16);

        zone.on('pointerdown', (ptr) => {
            this._joyActive = true;
            this._joyUpdate(ptr.x, ptr.y);
        });
        this.scene.input.on('pointermove', (ptr) => {
            if (this._joyActive) this._joyUpdate(ptr.x, ptr.y);
        });
        this.scene.input.on('pointerup', () => {
            if (!this._joyActive) return;
            this._joyActive = false;
            this.joyVec.x = 0;
            this.joyVec.y = 0;
            this._joyKnobX = this._joyCx;
            this._joyKnobY = this._joyCy;
        });
    }

    _joyUpdate(px, py) {
        const dx = px - this._joyCx;
        const dy = py - this._joyCy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const cap  = Math.min(dist, this._joyR);
        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;
        this._joyKnobX = this._joyCx + nx * cap;
        this._joyKnobY = this._joyCy + ny * cap;
        const DEAD = 0.12;
        this.joyVec.x = Math.abs(nx) > DEAD ? nx : 0;
        this.joyVec.y = Math.abs(ny) > DEAD ? ny : 0;
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

    // ── Action cluster (attack + slots + power/blink/sight) ─────────────

    _initActionCluster(w, h) {
        const sc    = this.sc;
        const R_ATK = Math.round(68 * sc);
        const R_SK  = Math.round(36 * sc);
        const R_ARM = Math.round(172 * sc);
        const R_SEC = Math.round(24 * sc);

        const atkX = w - 16 - R_ATK;
        const atkY = h - 16 - R_ATK;

        this._atkData = { atkX, atkY, R_ATK, R_SK, R_ARM, R_SEC };
        this._atkG    = this.scene.add.graphics().setDepth(19);
        this._secG    = this.scene.add.graphics().setDepth(25);

        const atkHit = this.scene.add.rectangle(atkX - R_ATK, atkY - R_ATK, R_ATK * 2, R_ATK * 2, 0, 0)
            .setOrigin(0).setInteractive().setDepth(24);
        atkHit.on('pointerdown', () => {
            if (this.scene.scene.isPaused('GameScene')) return;
            this.game()?._tryMainAction();
            this._flashButton(atkX, atkY, R_ATK, 0xee8833);
        });

        const ANGLES_DEG = [175, 145, 115, 85];
        this._slotData = [];
        for (let i = 0; i < 4; i++) {
            const rad = Phaser.Math.DegToRad(ANGLES_DEG[i]);
            const sx  = Math.round(atkX + Math.cos(rad) * R_ARM);
            const sy  = Math.round(atkY - Math.sin(rad) * R_ARM);

            const slotG = this.scene.add.graphics().setDepth(20);
            const cdG   = this.scene.add.graphics().setDepth(21);

            this.scene.add.text(sx - R_SK + 4, sy - R_SK + 4, SLOT_KEYS[i], {
                font: '12px monospace', fill: '#22224a'
            }).setDepth(22);

            const nameLabel = this.scene.add.text(sx, sy + 2, '—', {
                font: 'bold 18px monospace', fill: '#2a2a50', align: 'center'
            }).setOrigin(0.5).setDepth(22);

            const costLabel = this.scene.add.text(sx, sy + R_SK - 10, '', {
                font: '12px monospace', fill: '#334466', align: 'center'
            }).setOrigin(0.5, 1).setDepth(22);

            const hit = this.scene.add.rectangle(sx - R_SK, sy - R_SK, R_SK * 2, R_SK * 2, 0, 0)
                .setOrigin(0).setInteractive().setDepth(24);
            hit.on('pointerdown', () => {
                if (this.scene.scene.isPaused('GameScene')) return;
                this.game()?._tryActivateSlot(i);
                this._flashButton(sx, sy, R_SK, 0xffffff);
            });

            this._slotData.push({ slotG, cdG, nameLabel, costLabel, sx, sy });
        }

        // Secondary action buttons (Power / Blink / Sight) — direct dispatch.
        this._secData = [];
        for (const sec of SECONDARY) {
            const rad = Phaser.Math.DegToRad(sec.angle);
            const sx  = Math.round(atkX + Math.cos(rad) * R_ARM * 0.60);
            const sy  = Math.round(atkY - Math.sin(rad) * R_ARM * 0.60);
            const hit = this.scene.add.rectangle(sx - R_SEC, sy - R_SEC, R_SEC * 2, R_SEC * 2, 0, 0)
                .setOrigin(0).setInteractive().setDepth(27);
            hit.on('pointerdown', () => {
                if (this.scene.scene.isPaused('GameScene')) return;
                this.game()?.[sec.action]?.();
                this._flashButton(sx, sy, R_SEC, sec.color);
            });
            this._secData.push({ ...sec, sx, sy });
        }
    }

    _flashButton(cx, cy, radius, color) {
        const g = this.scene.add.graphics().setDepth(26);
        g.fillStyle(color, 0.35);
        g.fillCircle(cx, cy, radius);
        this.scene.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
    }

    _updateActionCluster() {
        const alpha = this._hudAlpha();
        const { atkX, atkY, R_ATK, R_SK, R_ARM, R_SEC } = this._atkData;
        const g = this._atkG;

        g.clear();
        g.lineStyle(1, 0x1a1a33, alpha * 0.30);
        g.beginPath();
        g.arc(atkX, atkY, R_ARM, Phaser.Math.DegToRad(-85), Phaser.Math.DegToRad(-175), true);
        g.strokePath();

        g.fillStyle(0x0a0814, alpha * 0.92);
        g.fillCircle(atkX, atkY, R_ATK);
        const nearInteract = this.game()?._nearInteract ?? false;
        const atkRingColor = nearInteract ? 0x44aaff : 0xee8833;
        g.lineStyle(2, atkRingColor, alpha);
        g.strokeCircle(atkX, atkY, R_ATK);
        g.lineStyle(1, atkRingColor, alpha * 0.20);
        g.strokeCircle(atkX, atkY, R_ATK - 14);
        g.lineStyle(2, 0xddaa55, alpha * 0.88);
        g.lineBetween(atkX, atkY - 28, atkX, atkY + 22);
        g.lineStyle(2, 0xddaa55, alpha * 0.72);
        g.lineBetween(atkX - 18, atkY - 4, atkX + 18, atkY - 4);
        g.fillStyle(0xddaa55, alpha * 0.68);
        g.fillCircle(atkX, atkY + 28, 5);

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

            const cd = playerStats.spellCooldowns[spellId] ?? 0;
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

        // Secondary buttons — simple stateless rings + labels.
        const sG = this._secG;
        sG.clear();
        for (const sec of this._secData) {
            sG.fillStyle(0x0a0814, alpha * 0.85);
            sG.fillCircle(sec.sx, sec.sy, R_SEC);
            sG.lineStyle(2, sec.color, alpha);
            sG.strokeCircle(sec.sx, sec.sy, R_SEC);
        }
    }

    // ── Menu tray (keyboard-emulated hotkeys) ───────────────────────────

    _initMenuTray(w, h) {
        const sc     = this.sc;
        const N      = TRAY.length;
        const BTN_R  = Math.round(26 * sc);
        const TRAY_H = Math.round(192 * sc);

        const BTN_GAP  = Math.round(12 * sc);
        const SLOT_W   = BTN_R * 2 + BTN_GAP;
        const groupW   = N * BTN_R * 2 + (N - 1) * BTN_GAP;
        const startX   = w / 2 - groupW / 2 + BTN_R;

        this._trayOpen    = false;
        this._trayOpenY   = h - TRAY_H;
        this._trayClosedY = h + 10;

        this._trayCont = this.scene.add.container(0, this._trayClosedY).setDepth(14);

        const btnsG = this.scene.make.graphics({ add: false });
        this._trayBtnData = TRAY.map((item, i) => {
            const bx = startX + i * SLOT_W;
            const by = TRAY_H / 2;
            btnsG.fillStyle(0x0a1030);
            btnsG.fillCircle(bx, by, BTN_R);
            btnsG.lineStyle(2, 0x334499);
            btnsG.strokeCircle(bx, by, BTN_R);
            return { bx, by, item };
        });
        this._trayCont.add(btnsG);

        TRAY.forEach((item, i) => {
            const { bx, by } = this._trayBtnData[i];
            const lbl = this.scene.make.text({
                x: bx, y: by, text: item.label, add: false,
                style: { font: '10px monospace', fill: '#7799cc', align: 'center' },
            }).setOrigin(0.5);
            this._trayCont.add(lbl);
        });

        this.scene.input.on('pointerdown', (ptr) => {
            if (!this._trayOpen) return;
            for (const { bx, by, item } of this._trayBtnData) {
                const worldY = this._trayCont.y + by;
                const dx = ptr.x - bx, dy = ptr.y - worldY;
                if (dx * dx + dy * dy <= BTN_R * BTN_R) {
                    this._closeTray();
                    if (this.scene.scene.isPaused('GameScene')) return;
                    // Drive the game through the SAME key it would get from a
                    // physical keyboard — GameScene's keydown handler launches it.
                    tapKey(window, KEY_CODES[item.name]);
                    return;
                }
            }
        });

        const TAB_W = 96, TAB_H = 28;
        this._trayTabG  = this.scene.add.graphics().setDepth(29);
        this._trayTabCx = w / 2;
        this._trayTabCy = h - 14;

        const tabHit = this.scene.add.rectangle(w / 2 - TAB_W / 2, h - TAB_H, TAB_W, TAB_H, 0, 0)
            .setOrigin(0).setInteractive().setDepth(32);
        tabHit.on('pointerdown', () => this._toggleTray());
    }

    _drawTrayTab() {
        const alpha = this._hudAlpha();
        const { _trayTabCx: cx, _trayTabCy: cy, _trayOpen: open } = this;
        const g = this._trayTabG;
        g.clear();
        g.fillStyle(0x0a0814, alpha * 0.85);
        g.fillRoundedRect(cx - 48, cy - 12, 96, 24, 10);
        g.lineStyle(2, 0x3344aa, alpha * 0.90);
        g.strokeRoundedRect(cx - 48, cy - 12, 96, 24, 10);
        const dir = open ? 1 : -1;
        g.lineStyle(3, 0x5566dd, alpha);
        g.beginPath();
        g.moveTo(cx - 14, cy + dir * 5);
        g.lineTo(cx,      cy - dir * 5);
        g.lineTo(cx + 14, cy + dir * 5);
        g.strokePath();
    }

    _toggleTray() { this._trayOpen ? this._closeTray() : this._openTray(); }

    _openTray() {
        this._trayOpen = true;
        this.scene.tweens.add({ targets: this._trayCont, y: this._trayOpenY, duration: 180, ease: 'Cubic.easeOut' });
    }

    _closeTray() {
        this._trayOpen = false;
        this.scene.tweens.add({ targets: this._trayCont, y: this._trayClosedY, duration: 140, ease: 'Cubic.easeIn' });
    }

    // ── Pause (keyboard-emulated ESC) ───────────────────────────────────

    _initPause(w, h) {
        const pauseBtn = this.scene.add.text(w / 2, 10, '☰', {
            font: 'bold 18px monospace', fill: '#445566', stroke: '#000000', strokeThickness: 2,
        }).setOrigin(0.5, 0).setInteractive().setDepth(50);
        pauseBtn.on('pointerdown', () => {
            // Same key a physical ESC sends: in-game → save & exit to menu;
            // in a sub-menu → close it. Unified with the keyboard path.
            tapKey(window, KEY_CODES.esc);
        });
    }

    // ── Gamepad (always active; feeds joyVec + actions) ─────────────────

    _initGamepad() {
        this._padPrev = {};
        this.scene.input.gamepad.on('connected',    () => this.scene.showNotification('Controller connected', 2000));
        this.scene.input.gamepad.on('disconnected', () => this.scene.showNotification('Controller disconnected', 2000));
    }

    _updateGamepad() {
        if (!this.scene.input.gamepad?.total) return;
        const pad = this.scene.input.gamepad.getPad(0);
        if (!pad) return;

        if (!this._joyActive) {
            const DEAD = 0.15;
            const lx = Math.abs(pad.leftStick?.x ?? 0) > DEAD ? pad.leftStick.x : 0;
            const ly = Math.abs(pad.leftStick?.y ?? 0) > DEAD ? pad.leftStick.y : 0;
            if (lx !== 0 || ly !== 0) {
                this.joyVec.x = lx;
                this.joyVec.y = ly;
            } else {
                const dpx = (pad.right > 0 ? 1 : 0) - (pad.left > 0 ? 1 : 0);
                const dpy = (pad.down  > 0 ? 1 : 0) - (pad.up   > 0 ? 1 : 0);
                const dpLen = Math.hypot(dpx, dpy) || 1;
                this.joyVec.x = dpx !== 0 || dpy !== 0 ? dpx / dpLen : 0;
                this.joyVec.y = dpx !== 0 || dpy !== 0 ? dpy / dpLen : 0;
            }
        }

        const just = (i) => (pad.buttons[i]?.value > 0.5) && !this._padPrev[i];
        const gs   = this.game();
        const paused = this.scene.scene.isPaused('GameScene');

        if (gs && !paused) {
            if (just(0)) {
                gs._tryMainAction?.();
                this._flashButton(this._atkData.atkX, this._atkData.atkY, this._atkData.R_ATK, 0xee8833);
            }
            [1, 2, 3, 5].forEach((btnIdx, slotIdx) => {
                if (just(btnIdx)) {
                    gs._tryActivateSlot?.(slotIdx);
                    const s = this._slotData[slotIdx];
                    if (s) this._flashButton(s.sx, s.sy, this._atkData.R_SK, 0xffffff);
                }
            });
            if (just(4)) this._toggleTray();
            if (just(9)) tapKey(window, KEY_CODES.esc);
        }

        const next = {};
        pad.buttons.forEach((b, i) => { next[i] = b.value > 0.5; });
        this._padPrev = next;
    }
}