import Phaser from 'phaser';
import { soundManager } from '../systems/SoundManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';

const DEBUG_KEY = 'am1_debug';

export default class OptionsScene extends Phaser.Scene {
    constructor() { super('OptionsScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        this.add.rectangle(0, 0, w, h, 0x000000).setOrigin(0);
        for (let i = 0; i < 50; i++) {
            this.add.rectangle(
                Phaser.Math.Between(0, w), Phaser.Math.Between(0, h),
                Math.random() < 0.3 ? 2 : 1, Math.random() < 0.3 ? 2 : 1,
                0xffffff, Math.random() * 0.4 + 0.1
            );
        }

        // Fixed header
        this.add.text(w / 2, 38, 'OPTIONS', {
            font: 'bold 18px monospace', fill: '#9966cc',
        }).setOrigin(0.5);
        this.add.rectangle(w / 2, 58, 200, 1, 0x332255).setOrigin(0.5);

        // Scrollable container for all option rows
        const CONT_Y = 66;
        this._scrollY = 0;
        this._cont = this.add.container(0, CONT_Y);
        this._buildRows(w, h);

        // Fixed footer
        this.add.text(w / 2, h - 10, '[ESC] Back', {
            font: '7px monospace', fill: '#222244',
        }).setOrigin(0.5, 1);

        // Touch scroll
        const AVAIL = h - CONT_Y - 50;
        let _touchY = null;
        this.input.on('pointerdown', ptr => { _touchY = ptr.y; });
        this.input.on('pointermove', ptr => {
            if (_touchY === null || !ptr.isDown) return;
            const dy = _touchY - ptr.y;
            _touchY = ptr.y;
            const max = Math.max(0, this._contentH - AVAIL);
            this._scrollY = Phaser.Math.Clamp(this._scrollY + dy, 0, max);
            this._cont.y = CONT_Y - this._scrollY;
        });
        this.input.on('pointerup', () => { _touchY = null; });

        this.input.keyboard.on('keydown-ESC', () => this._back());
        this._gpNav = new GamepadNav(this);
        this.cameras.main.fadeIn(200);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.B) this._back();
        const CONT_Y = 66;
        const AVAIL  = this.scale.height - CONT_Y - 50;
        const max = Math.max(0, this._contentH - AVAIL);
        if (gp.up)   { this._scrollY = Math.max(0,   this._scrollY - 16); this._cont.y = CONT_Y - this._scrollY; }
        if (gp.down) { this._scrollY = Math.min(max,  this._scrollY + 16); this._cont.y = CONT_Y - this._scrollY; }
    }

    _buildRows(w, h) {
        const cont = this._cont;
        const cx   = w / 2;

        // Helper: create text, add to container, return it
        const add = (obj) => { cont.add(obj); return obj; };

        const mkBtn = (label, x, y, cb) => {
            const b = add(this.add.text(x, y, label, { font: '11px monospace', fill: '#7755aa' })
                .setOrigin(0.5).setInteractive({ useHandCursor: true }));
            b.on('pointerover', () => b.setStyle({ fill: '#cc99ff' }));
            b.on('pointerout',  () => b.setStyle({ fill: '#7755aa' }));
            b.on('pointerdown', cb);
            return b;
        };

        // ── Debug Mode ────────────────────────────────────────────
        const debugOn = localStorage.getItem(DEBUG_KEY) === '1';
        const rowY = 8;

        add(this.add.text(cx - 80, rowY, 'Debug Mode', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5));

        add(this.add.text(cx + 60, rowY, debugOn ? '[ON]' : '[OFF]', {
            font: 'bold 11px monospace',
            fill: debugOn ? '#44ff88' : '#555566',
        }).setOrigin(0.5));

        mkBtn('Toggle', cx, rowY + 18, () => {
            const now = localStorage.getItem(DEBUG_KEY) === '1';
            localStorage.setItem(DEBUG_KEY, now ? '0' : '1');
            soundManager.menuSelect();
            this.scene.restart();
        });

        add(this.add.text(cx, rowY + 34, 'When ON: New Game starts at Lv 15 with\nmax skill points, full attributes & all\nresonance gates unlocked — for testing.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0));

        // ── HUD Opacity ───────────────────────────────────────────
        const HUD_STEPS = [0.15, 0.30, 0.45, 0.60, 0.75];
        const rowY2 = rowY + 100;

        const curAlpha = parseFloat(localStorage.getItem('hud_alpha') ?? '0.55');
        let alphaIdx = HUD_STEPS.reduce(
            (best, v, i) => Math.abs(v - curAlpha) < Math.abs(HUD_STEPS[best] - curAlpha) ? i : best, 0
        );

        add(this.add.text(cx - 80, rowY2, 'HUD Opacity', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5));

        const alphaVal = add(this.add.text(cx + 60, rowY2, `${Math.round(HUD_STEPS[alphaIdx] * 100)}%`, {
            font: 'bold 11px monospace', fill: '#cc99ff',
        }).setOrigin(0.5));

        const refreshAlpha = () => {
            localStorage.setItem('hud_alpha', String(HUD_STEPS[alphaIdx]));
            alphaVal.setText(`${Math.round(HUD_STEPS[alphaIdx] * 100)}%`);
            soundManager.menuSelect();
        };

        mkBtn('–', cx + 26, rowY2 + 20, () => { if (alphaIdx > 0) { alphaIdx--; refreshAlpha(); } });
        mkBtn('+', cx + 54, rowY2 + 20, () => { if (alphaIdx < HUD_STEPS.length - 1) { alphaIdx++; refreshAlpha(); } });

        add(this.add.text(cx, rowY2 + 34, 'Adjusts transparency of touch buttons in-game.\nTakes effect immediately.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0));

        // ── Virtual Joystick ──────────────────────────────────────
        const rowY3 = rowY2 + 84;
        const joyOn = localStorage.getItem('show_joystick') !== '0';

        add(this.add.text(cx - 80, rowY3, 'Virtual Joystick', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5));

        add(this.add.text(cx + 60, rowY3, joyOn ? '[ON]' : '[OFF]', {
            font: 'bold 11px monospace',
            fill: joyOn ? '#44ff88' : '#555566',
        }).setOrigin(0.5));

        mkBtn('Toggle', cx, rowY3 + 18, () => {
            localStorage.setItem('show_joystick', joyOn ? '0' : '1');
            soundManager.menuSelect();
            this.scene.restart();
        });

        add(this.add.text(cx, rowY3 + 34, 'Hide on-screen joystick — useful with a gamepad.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0));

        // ── Auto Fullscreen ───────────────────────────────────────
        const rowY4 = rowY3 + 82;
        const fsOn = localStorage.getItem('auto_fullscreen') === '1';

        add(this.add.text(cx - 80, rowY4, 'Auto Fullscreen', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5));

        add(this.add.text(cx + 60, rowY4, fsOn ? '[ON]' : '[OFF]', {
            font: 'bold 11px monospace',
            fill: fsOn ? '#44ff88' : '#555566',
        }).setOrigin(0.5));

        mkBtn('Toggle', cx, rowY4 + 18, () => {
            localStorage.setItem('auto_fullscreen', fsOn ? '0' : '1');
            soundManager.menuSelect();
            this.scene.restart();
        });

        add(this.add.text(cx, rowY4 + 34, 'Automatically enter fullscreen on first tap.\nDisabled by default.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0));

        // ── Server Address (offline-first; optional online) ───────────
        const rowY5 = rowY4 + 82;
        const serverUrl = localStorage.getItem('amo_server_url');

        add(this.add.text(cx - 80, rowY5, 'Server Address', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5));

        add(this.add.text(cx + 60, rowY5, serverUrl ? '[SET]' : '[OFFLINE]', {
            font: 'bold 11px monospace',
            fill: serverUrl ? '#44cc88' : '#556655',
        }).setOrigin(0.5));

        mkBtn('Set', cx, rowY5 + 18, () => {
            const val = window.prompt('Server URL (e.g. http://192.168.0.159:3002)', serverUrl ?? '');
            if (val === null) return;
            const trimmed = val.trim().replace(/\/+$/, '');
            if (trimmed) localStorage.setItem('amo_server_url', trimmed);
            else         localStorage.removeItem('amo_server_url');
            soundManager.menuSelect();
            this.scene.restart();
        });

        add(this.add.text(cx, rowY5 + 34, 'Online multiplayer is optional. Enter your\ngame-server URL here; leave empty for\noffline-only play.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0));

        this._contentH = rowY5 + 78;

        // ── Back button (fixed, outside container) ────────────────
        const backBtn = this.add.text(cx, h - 24, '← Back', {
            font: '12px monospace', fill: '#888899',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        backBtn.on('pointerover', () => backBtn.setStyle({ fill: '#ffffff' }));
        backBtn.on('pointerout',  () => backBtn.setStyle({ fill: '#888899' }));
        backBtn.on('pointerdown', () => this._back());
    }

    _back() {
        soundManager.menuHover();
        this.cameras.main.fadeOut(200);
        this.time.delayedCall(200, () => this.scene.start('MenuScene'));
    }
}
