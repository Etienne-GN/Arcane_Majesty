import Phaser from 'phaser';
import { soundManager } from '../systems/SoundManager.js';

const DEBUG_KEY = 'am1_debug';

export default class OptionsScene extends Phaser.Scene {
    constructor() { super('OptionsScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;

        // Background — reuse MenuScene starfield feel
        this.add.rectangle(0, 0, w, h, 0x000000).setOrigin(0);
        for (let i = 0; i < 50; i++) {
            this.add.rectangle(
                Phaser.Math.Between(0, w), Phaser.Math.Between(0, h),
                Math.random() < 0.3 ? 2 : 1, Math.random() < 0.3 ? 2 : 1,
                0xffffff, Math.random() * 0.4 + 0.1
            );
        }

        this.add.text(w / 2, 38, 'OPTIONS', {
            font: 'bold 18px monospace', fill: '#9966cc',
        }).setOrigin(0.5);

        this.add.rectangle(w / 2, 58, 200, 1, 0x332255).setOrigin(0.5);

        this._buildRows(w, h);

        this.add.text(w / 2, h - 10, '[ESC] Back', {
            font: '7px monospace', fill: '#222244',
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._back());
        this.cameras.main.fadeIn(200);
    }

    _buildRows(w, h) {
        const debugOn = localStorage.getItem(DEBUG_KEY) === '1';
        const cx = w / 2;

        // ── Debug Mode ────────────────────────────────────────────
        const rowY = h / 2 - 64;
        this.add.text(cx - 80, rowY, 'Debug Mode', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5);

        const badge = this.add.text(cx + 60, rowY, debugOn ? '[ON]' : '[OFF]', {
            font: 'bold 11px monospace',
            fill: debugOn ? '#44ff88' : '#555566',
        }).setOrigin(0.5);

        const toggleBtn = this.add.text(cx, rowY + 18, 'Toggle', {
            font: '9px monospace', fill: '#7755aa',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        toggleBtn.on('pointerover', () => toggleBtn.setStyle({ fill: '#cc99ff' }));
        toggleBtn.on('pointerout',  () => toggleBtn.setStyle({ fill: '#7755aa' }));
        toggleBtn.on('pointerdown', () => {
            const now = localStorage.getItem(DEBUG_KEY) === '1';
            localStorage.setItem(DEBUG_KEY, now ? '0' : '1');
            soundManager.menuSelect();
            this.scene.restart();
        });

        this.add.text(cx, rowY + 34, 'When ON: New Game starts at Lv 15 with\nmax skill points, full attributes & all\nresonance gates unlocked — for testing.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0);

        // ── HUD Opacity ───────────────────────────────────────────
        const HUD_STEPS = [0.15, 0.30, 0.45, 0.60, 0.75];
        const rowY2 = rowY + 100;

        const curAlpha = parseFloat(localStorage.getItem('hud_alpha') ?? '0.55');
        let alphaIdx = HUD_STEPS.reduce(
            (best, v, i) => Math.abs(v - curAlpha) < Math.abs(HUD_STEPS[best] - curAlpha) ? i : best, 0
        );

        this.add.text(cx - 80, rowY2, 'HUD Opacity', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5);

        const alphaVal = this.add.text(cx + 60, rowY2, `${Math.round(HUD_STEPS[alphaIdx] * 100)}%`, {
            font: 'bold 11px monospace', fill: '#cc99ff',
        }).setOrigin(0.5);

        const mkBtn = (label, x, y, cb) => {
            const b = this.add.text(x, y, label, { font: '11px monospace', fill: '#7755aa' })
                .setOrigin(0.5).setInteractive({ useHandCursor: true });
            b.on('pointerover', () => b.setStyle({ fill: '#cc99ff' }));
            b.on('pointerout',  () => b.setStyle({ fill: '#7755aa' }));
            b.on('pointerdown', cb);
            return b;
        };

        const refreshAlpha = () => {
            localStorage.setItem('hud_alpha', String(HUD_STEPS[alphaIdx]));
            alphaVal.setText(`${Math.round(HUD_STEPS[alphaIdx] * 100)}%`);
            soundManager.menuSelect();
        };

        mkBtn('–', cx + 26, rowY2 + 20, () => { if (alphaIdx > 0) { alphaIdx--; refreshAlpha(); } });
        mkBtn('+', cx + 54, rowY2 + 20, () => { if (alphaIdx < HUD_STEPS.length - 1) { alphaIdx++; refreshAlpha(); } });

        this.add.text(cx, rowY2 + 34, 'Adjusts transparency of touch buttons in-game.\nTakes effect immediately.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0);

        // ── Virtual Joystick ──────────────────────────────────────
        const rowY3 = rowY2 + 84;
        const joyOn = localStorage.getItem('show_joystick') !== '0';

        this.add.text(cx - 80, rowY3, 'Virtual Joystick', {
            font: '12px monospace', fill: '#aaaacc',
        }).setOrigin(0, 0.5);

        this.add.text(cx + 60, rowY3, joyOn ? '[ON]' : '[OFF]', {
            font: 'bold 11px monospace',
            fill: joyOn ? '#44ff88' : '#555566',
        }).setOrigin(0.5);

        mkBtn('Toggle', cx, rowY3 + 18, () => {
            localStorage.setItem('show_joystick', joyOn ? '0' : '1');
            soundManager.menuSelect();
            this.scene.restart();
        });

        this.add.text(cx, rowY3 + 34, 'Hide on-screen joystick — useful with a gamepad.', {
            font: '7px monospace', fill: '#443355', align: 'center',
        }).setOrigin(0.5, 0);

        // ── Back button ───────────────────────────────────────────
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
