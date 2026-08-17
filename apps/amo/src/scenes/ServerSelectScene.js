import Phaser from 'phaser';
import { getServers } from '../data/servers.js';
import { soundManager } from '../systems/SoundManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';

export default class ServerSelectScene extends Phaser.Scene {
    constructor() { super('ServerSelectScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this._selected = 0;
        this._rows = [];

        // Background
        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        bg.setScale(Math.min(w / bg.width, h / bg.height)).setAlpha(0.25);
        this.add.rectangle(0, 0, w, h, 0x000000, 0.70).setOrigin(0);

        // Title
        this.add.text(w / 2, 38, 'SELECT SERVER', {
            font: 'bold 26px monospace', fill: '#aabbff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        // Server rows
        const rowW = Math.min(w * 0.72, 520);
        const servers = getServers();
        servers.forEach((srv, i) => this._makeRow(srv, i, w, h, rowW));

        // Connect button
        this._connectBtn = this.add.text(w / 2, h - 56, '[ CONNECT ]', {
            font: 'bold 22px monospace', fill: '#ffd700',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setInteractive();
        this._connectBtn.on('pointerover', () => this._connectBtn.setStyle({ fill: '#ffffff' }));
        this._connectBtn.on('pointerout',  () => this._connectBtn.setStyle({ fill: '#ffd700' }));
        this._connectBtn.on('pointerdown', () => this._connect());

        // Empty state (no server configured)
        if (this._connectBtn && servers.length === 0) {
            this.add.text(w / 2, 150,
                'No server configured.\nSet one in OPTIONS > Server Address,\nor play offline from the main menu.',
                { font: '13px monospace', fill: '#556655', align: 'center',
                  stroke: '#000000', strokeThickness: 3,
                }).setOrigin(0.5);
            this._connectBtn.setAlpha(0.35);
        }

        // Back
        this.add.text(32, h - 32, '< Back', {
            font: '15px monospace', fill: '#445566',
        }).setOrigin(0, 1).setInteractive()
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', () => { soundManager.menuSelect(); this.scene.start('MenuScene'); });

        // Keyboard nav
        this.input.keyboard.on('keydown-UP',    () => this._move(-1));
        this.input.keyboard.on('keydown-DOWN',   () => this._move(1));
        this.input.keyboard.on('keydown-ENTER',  () => this._connect());
        this.input.keyboard.on('keydown-ESCAPE', () => this.scene.start('MenuScene'));

        this._gpNav = new GamepadNav(this);
        this._highlight();
        this._pingAll();
        this.cameras.main.fadeIn(400);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.up)   this._move(-1);
        if (gp.down) this._move(1);
        if (gp.A)    this._connect();
        if (gp.B)    { soundManager.menuSelect(); this.scene.start('MenuScene'); }
    }

    _makeRow(srv, i, w, h, rowW) {
        const rowY = 130 + i * 76;
        const pad  = 16;

        const panel = this.add.rectangle(w / 2, rowY, rowW, 58, 0x0a0a1a, 0.92)
            .setStrokeStyle(1, 0x222233);

        const nameT = this.add.text(w / 2 - rowW / 2 + pad, rowY - 10, srv.name, {
            font: 'bold 16px monospace', fill: '#667788',
        });
        const urlT = this.add.text(w / 2 - rowW / 2 + pad, rowY + 10, srv.url, {
            font: '10px monospace', fill: '#334455',
        });
        const pingT = this.add.text(w / 2 + rowW / 2 - pad, rowY, '…', {
            font: '12px monospace', fill: '#445566',
        }).setOrigin(1, 0.5);

        // Click to select
        panel.setInteractive();
        panel.on('pointerdown', () => { this._selected = i; this._highlight(); });
        panel.on('pointerover', () => { if (i !== this._selected) panel.setFillStyle(0x111122, 0.92); });
        panel.on('pointerout',  () => { if (i !== this._selected) panel.setFillStyle(0x0a0a1a, 0.92); });

        this._rows.push({ srv, panel, nameT, urlT, pingT });
    }

    _move(dir) {
        const servers = getServers();
        this._selected = Phaser.Math.Clamp(this._selected + dir, 0, servers.length - 1);
        soundManager.menuHover();
        this._highlight();
    }

    _highlight() {
        this._rows.forEach(({ panel, nameT }, i) => {
            const sel = i === this._selected;
            panel.setFillStyle(sel ? 0x1a2244 : 0x0a0a1a, 0.92);
            panel.setStrokeStyle(1, sel ? 0x4466cc : 0x222233);
            nameT.setStyle({ fill: sel ? '#aabbff' : '#667788' });
        });
    }

    async _pingAll() {
        const servers = getServers();
        if (servers.length === 0) return;
        for (const row of this._rows) {
            try {
                const t0   = performance.now();
                const ctrl = new AbortController();
                setTimeout(() => ctrl.abort(), 4000);
                // /api/status is proxied by Vite (dev) or nginx (prod) to the game server
                const res  = await fetch(`${row.srv.url}/api/status`, { signal: ctrl.signal });
                const data = await res.json();
                const ms   = Math.round(performance.now() - t0);
                if (row.pingT.active) {
                    row.pingT.setText(`${data.players} online · ${ms} ms`)
                             .setStyle({ fill: data.players > 0 ? '#44cc44' : '#44aa44' });
                }
            } catch {
                if (row.pingT.active) row.pingT.setText('offline').setStyle({ fill: '#aa4444' });
            }
        }
    }

    _connect() {
        const servers = getServers();
        if (servers.length === 0) return;
        soundManager.menuSelect();
        const serverUrl = servers[this._selected].url;
        this.cameras.main.fadeOut(300);
        this.time.delayedCall(300, () => {
            this.scene.start('OnlineCharacterScene', { serverUrl });
        });
    }
}
