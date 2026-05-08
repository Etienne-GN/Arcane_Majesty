import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { PROLOGUE_MAP, TILE_SIZE, RIFT_GATE_POSITIONS } from '../data/worldMap.js';

const MAP_ROWS    = PROLOGUE_MAP.length;
const MAP_COLS    = PROLOGUE_MAP[0].length;
const CHUNK_TILES = 4;   // 4×4 tile chunks for exploration tracking

export default class AethericTearScene extends Phaser.Scene {
    constructor() { super('AethericTearScene'); }

    init(data) {
        this._manaCost = data?.manaCost ?? 0;
        this._manaPct  = data?.manaPct  ?? 0.85;
        this._cooldown = data?.cooldown ?? 60000;
        this._mode     = 'gates';
    }

    create() {
        const w = this.scale.width, h = this.scale.height;

        this._hasTier2 = !!playerStats.masteries?.spatial_attunement;

        this.add.rectangle(0, 0, w, h, 0x000000, 0.92).setOrigin(0);

        // ── Layout constants ──────────────────────────────────────────────────
        const HEADER_H  = 38;
        const FOOTER_H  = 20;
        const TAB_H     = this._hasTier2 ? 18 : 0;
        const MAP_PAD_L = 12;
        const PANEL_W   = Math.max(180, Math.floor(w * 0.30));
        const PANEL_GAP = 14;

        const mapAreaW  = w - MAP_PAD_L - PANEL_W - PANEL_GAP - 10;
        const mapAreaH  = h - HEADER_H - FOOTER_H - TAB_H - 6;

        // Scale map to fill the map area
        const SCALE = Math.max(2, Math.floor(Math.min(
            mapAreaW / MAP_COLS,
            mapAreaH / MAP_ROWS
        )));
        this._scale    = SCALE;
        this._chunkPx  = CHUNK_TILES * SCALE;
        this._mapPxW   = MAP_COLS * SCALE;
        this._mapPxH   = MAP_ROWS  * SCALE;
        this._mapX     = MAP_PAD_L;
        this._mapY     = HEADER_H;

        const panelX   = this._mapX + this._mapPxW + PANEL_GAP;
        const panelW   = w - panelX - 8;

        // ── Header ────────────────────────────────────────────────────────────
        this.add.text(w / 2, 7, 'AETHERIC TEAR', {
            font: 'bold 13px monospace', fill: '#cc00ff',
            stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5, 0);

        const pctLabel = Math.round(this._manaPct * 100);
        this._headerSub = this.add.text(w / 2, 23, `Consumes ${pctLabel}% mana`, {
            font: '7px monospace', fill: '#660099'
        }).setOrigin(0.5, 0);

        // ── Map tile layer (direct world-space draw — no renderTexture offset) ──
        const tileG = this.add.graphics().setDepth(1);
        PROLOGUE_MAP.forEach((row, r) => {
            row.forEach((tile, c) => {
                const color = tile === 1 ? 0x0d2010 : tile === 2 ? 0x5a4a2a : 0x1e3a14;
                tileG.fillStyle(color);
                tileG.fillRect(this._mapX + c * SCALE, this._mapY + r * SCALE, SCALE, SCALE);
            });
        });

        // Border — exact same origin/size as tile area
        this.add.graphics().setDepth(2)
            .lineStyle(1, 0x880099, 0.7)
            .strokeRect(this._mapX, this._mapY, this._mapPxW, this._mapPxH);

        // ── Rift gate markers ─────────────────────────────────────────────────
        const dotR = Math.max(2, Math.floor(SCALE * 0.55));
        const attunedIds = playerStats.attunedGates;
        RIFT_GATE_POSITIONS.forEach(gate => {
            const gx = this._mapX + (gate.x + 0.5) * SCALE;
            const gy = this._mapY + (gate.y + 0.5) * SCALE;
            const isAttuned = attunedIds.includes(gate.id);
            const mk = this.add.graphics().setDepth(3);
            if (isAttuned) {
                mk.fillStyle(0xcc00ff, 1);
                mk.fillCircle(gx, gy, dotR + 1);
                mk.lineStyle(1, 0xffffff, 0.6);
                mk.strokeCircle(gx, gy, dotR + 2);
                this.tweens.add({ targets: mk, alpha: { from: 0.5, to: 1 }, yoyo: true, repeat: -1, duration: 600 });
            } else {
                mk.lineStyle(1, 0x440055, 0.5);
                mk.strokeCircle(gx, gy, dotR);
            }
        });

        // ── Player dot ────────────────────────────────────────────────────────
        const game = this.scene.get('GameScene');
        if (game?.player?.active) {
            const worldW = MAP_COLS * TILE_SIZE;
            const worldH = MAP_ROWS  * TILE_SIZE;
            const ppx = this._mapX + (game.player.x / worldW) * this._mapPxW;
            const ppy = this._mapY + (game.player.y / worldH) * this._mapPxH;
            const dot = this.add.graphics().setDepth(5);
            dot.fillStyle(0xffffff, 1);
            dot.fillCircle(ppx, ppy, Math.max(2, dotR - 1));
            this.tweens.add({ targets: dot, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
        }

        // ── Tab bar (tier 2 only) ─────────────────────────────────────────────
        if (this._hasTier2) {
            const tabY  = this._mapY + this._mapPxH + 3;
            const tabW  = Math.floor(this._mapPxW / 2);
            this._tab1Bg  = this.add.rectangle(this._mapX,        tabY, tabW,                    TAB_H - 2, 0x2a0050).setOrigin(0).setDepth(10);
            this._tab2Bg  = this.add.rectangle(this._mapX + tabW, tabY, this._mapPxW - tabW,     TAB_H - 2, 0x110022).setOrigin(0).setDepth(10);
            this._tab1Txt = this.add.text(this._mapX + tabW / 2,                   tabY + (TAB_H - 2) / 2, '[1] GATE SELECT', { font: '6px monospace', fill: '#cc00ff' }).setOrigin(0.5).setDepth(11);
            this._tab2Txt = this.add.text(this._mapX + tabW + (this._mapPxW - tabW) / 2, tabY + (TAB_H - 2) / 2, '[2] FREE TARGET', { font: '6px monospace', fill: '#440066' }).setOrigin(0.5).setDepth(11);

            this._tab1Bg.setInteractive();
            this._tab2Bg.setInteractive();
            this._tab1Bg.on('pointerdown', () => this._setMode('gates'));
            this._tab2Bg.on('pointerdown', () => this._setMode('free'));
            this.input.keyboard.on('keydown-ONE', () => this._setMode('gates'));
            this.input.keyboard.on('keydown-TWO', () => this._setMode('free'));
        }

        // ── Right panel ───────────────────────────────────────────────────────
        this._panelX   = panelX;
        this._panelW   = panelW;
        this._panelTopY = this._mapY;
        this._panelObjs = [];
        this._drawPanel();

        // ── Footer ────────────────────────────────────────────────────────────
        this.add.text(w / 2, h - 4, '[ESC] Cancel — no mana consumed', {
            font: '7px monospace', fill: '#440055'
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._cancel());
    }

    // ── Mode management ───────────────────────────────────────────────────────

    _setMode(mode) {
        if (this._mode === mode) return;
        this._mode = mode;
        this._clearPanel();
        this._drawPanel();
        if (this._hasTier2) this._updateTabStyles();
    }

    _updateTabStyles() {
        const isGate = this._mode === 'gates';
        this._tab1Bg.setFillStyle(isGate ? 0x2a0050 : 0x110022);
        this._tab2Bg.setFillStyle(isGate ? 0x110022 : 0x2a0050);
        this._tab1Txt.setStyle({ fill: isGate ? '#cc00ff' : '#440066' });
        this._tab2Txt.setStyle({ fill: isGate ? '#440066' : '#cc00ff' });
        this._headerSub.setText(
            isGate
                ? `Consumes ${Math.round(this._manaPct * 100)}% mana — select a rift gate`
                : `Consumes ${Math.round(this._manaPct * 100)}% mana — click any explored location`
        );
    }

    _clearPanel() {
        this._panelObjs.forEach(o => o?.destroy?.());
        this._panelObjs = [];
        if (this._fog)     { this._fog.destroy();     this._fog     = null; }
        if (this._reticle) { this._reticle.destroy(); this._reticle = null; }
        this.input.off('pointermove', this._onMove,      this);
        this.input.off('pointerdown', this._onFreeClick, this);
    }

    _track(o) { this._panelObjs.push(o); return o; }

    _drawPanel() {
        if (this._mode === 'gates') this._drawGatePanel();
        else                        this._drawFreePanel();
    }

    // ── Gate panel (tier 1) ───────────────────────────────────────────────────

    _drawGatePanel() {
        const x = this._panelX, w = this._panelW;
        let y = this._panelTopY;

        this._track(this.add.text(x + w / 2, y, 'DESTINATIONS', {
            font: 'bold 8px monospace', fill: '#770099'
        }).setOrigin(0.5, 0));
        y += 16;

        const attunedIds = playerStats.attunedGates;
        const attuned = RIFT_GATE_POSITIONS.filter(g => attunedIds.includes(g.id));
        const locked  = RIFT_GATE_POSITIONS.filter(g => !attunedIds.includes(g.id));

        [...attuned, ...locked].forEach(gate => {
            const isAttuned = attunedIds.includes(gate.id);
            const rowH = 30;

            const bg = this._track(
                this.add.rectangle(x, y, w, rowH, isAttuned ? 0x1a0033 : 0x080012).setOrigin(0).setDepth(10)
            );
            const bg2 = this._track(this.add.graphics()).setDepth(10);
            bg2.lineStyle(1, isAttuned ? 0x550088 : 0x1a0022, 0.7);
            bg2.strokeRect(x, y, w, rowH);

            const pip = this._track(this.add.graphics()).setDepth(11);
            pip.fillStyle(isAttuned ? 0xcc00ff : 0x2a0040, 1);
            pip.fillCircle(x + 10, y + rowH / 2, isAttuned ? 4 : 2);

            this._track(this.add.text(x + 22, y + 5, gate.label, {
                font: 'bold 8px monospace', fill: isAttuned ? '#cc00ff' : '#330044'
            }).setDepth(11));

            if (isAttuned) {
                const verb = this._track(this.add.text(x + w - 5, y + rowH / 2, '[TEAR]', {
                    font: '7px monospace', fill: '#9900cc'
                }).setOrigin(1, 0.5).setDepth(11));

                bg.setInteractive();
                bg.on('pointerover', () => { bg.setFillStyle(0x33005a); verb.setStyle({ fill: '#ff44ff' }); });
                bg.on('pointerout',  () => { bg.setFillStyle(0x1a0033); verb.setStyle({ fill: '#9900cc' }); });
                bg.on('pointerdown', () => this._selectGate(gate.id));
            } else {
                this._track(this.add.text(x + w - 5, y + rowH / 2, '[UNKNOWN]', {
                    font: '7px monospace', fill: '#220033'
                }).setOrigin(1, 0.5).setDepth(11));
            }

            y += rowH + 4;
        });

        if (!this._hasTier2) {
            this._track(this.add.text(x, y + 10, 'Mastery: Spatial Attunement\nunlocks free map targeting.', {
                font: '6px monospace', fill: '#330044'
            }));
        }
    }

    // ── Free panel (tier 2) ───────────────────────────────────────────────────

    _drawFreePanel() {
        const x = this._panelX, w = this._panelW;
        let y = this._panelTopY;

        this._track(this.add.text(x + w / 2, y, 'FREE TARGET', {
            font: 'bold 8px monospace', fill: '#cc00ff'
        }).setOrigin(0.5, 0));
        y += 18;

        const explored = playerStats.exploredChunks.length;
        const maxCX    = Math.ceil(MAP_COLS / CHUNK_TILES);
        const maxCY    = Math.ceil(MAP_ROWS  / CHUNK_TILES);
        const total    = maxCX * maxCY;
        const pct      = Math.round((explored / total) * 100);

        this._track(this.add.text(x, y, `Explored: ${pct}%  (${explored}/${total})`, {
            font: '7px monospace', fill: '#880099'
        }));
        y += 18;

        this._track(this.add.rectangle(x, y, w, 1, 0x440066)).setOrigin(0);
        y += 8;

        [
            [0xcc00ff, 'Explored — click to tear'],
            [0xff3333, 'Uncharted — no target'],
            [0xffffff, 'Your position'],
        ].forEach(([col, label]) => {
            const pip = this._track(this.add.graphics());
            pip.fillStyle(col, 1).fillCircle(x + 5, y + 5, 3);
            this._track(this.add.text(x + 14, y + 1, label, { font: '6px monospace', fill: '#774488' }));
            y += 14;
        });

        y += 6;
        this._track(this.add.text(x, y, 'Hover map to aim.\nClick explored area to teleport.', {
            font: '6px monospace', fill: '#550077',
            lineSpacing: 2
        }));

        this._drawFog();

        this._reticle = this.add.graphics().setDepth(7);
        this._hoveredChunkKey = null;
        this._onMove      = (ptr) => this._updateReticle(ptr);
        this._onFreeClick = (ptr) => this._handleFreeClick(ptr);
        this.input.on('pointermove', this._onMove,      this);
        this.input.on('pointerdown', this._onFreeClick, this);
    }

    _drawFog() {
        const maxCX = Math.ceil(MAP_COLS / CHUNK_TILES);
        const maxCY = Math.ceil(MAP_ROWS  / CHUNK_TILES);
        const fog = this.add.graphics().setDepth(4);
        fog.fillStyle(0x000000, 0.72);

        for (let cy = 0; cy < maxCY; cy++) {
            for (let cx = 0; cx < maxCX; cx++) {
                if (!playerStats.exploredChunks.includes(`${cx}_${cy}`)) {
                    const fx = this._mapX + cx * this._chunkPx;
                    const fy = this._mapY + cy * this._chunkPx;
                    const fw = Math.min(this._chunkPx, this._mapX + this._mapPxW - fx);
                    const fh = Math.min(this._chunkPx, this._mapY + this._mapPxH - fy);
                    fog.fillRect(fx, fy, fw, fh);
                }
            }
        }
        this._fog = fog;
    }

    _updateReticle(ptr) {
        const g = this._reticle;
        g.clear();

        const relX = ptr.x - this._mapX;
        const relY = ptr.y - this._mapY;
        if (relX < 0 || relX >= this._mapPxW || relY < 0 || relY >= this._mapPxH) {
            this._hoveredChunkKey = null;
            return;
        }

        const cx  = Math.floor(relX / this._chunkPx);
        const cy  = Math.floor(relY / this._chunkPx);
        const key = `${cx}_${cy}`;
        this._hoveredChunkKey = key;
        const isExplored = playerStats.exploredChunks.includes(key);
        const color      = isExplored ? 0xcc00ff : 0xff3333;

        const chunkSX = this._mapX + cx * this._chunkPx;
        const chunkSY = this._mapY + cy * this._chunkPx;

        g.lineStyle(1, color, 0.9);
        g.strokeRect(chunkSX, chunkSY, this._chunkPx, this._chunkPx);
        if (isExplored) {
            g.fillStyle(color, 0.15);
            g.fillRect(chunkSX, chunkSY, this._chunkPx, this._chunkPx);
        }

        g.lineStyle(1, color, 0.8);
        g.lineBetween(ptr.x - 8, ptr.y, ptr.x + 8, ptr.y);
        g.lineBetween(ptr.x, ptr.y - 8, ptr.x, ptr.y + 8);
        g.fillStyle(color, 1);
        g.fillCircle(ptr.x, ptr.y, 2);
    }

    _handleFreeClick(ptr) {
        if (ptr.rightButtonDown()) { this._cancel(); return; }

        const relX = ptr.x - this._mapX;
        const relY = ptr.y - this._mapY;
        if (relX < 0 || relX >= this._mapPxW || relY < 0 || relY >= this._mapPxH) return;

        const cx = Math.floor(relX / this._chunkPx);
        const cy = Math.floor(relY / this._chunkPx);
        if (!playerStats.exploredChunks.includes(`${cx}_${cy}`)) return;

        const worldW = MAP_COLS * TILE_SIZE;
        const worldH = MAP_ROWS  * TILE_SIZE;
        const wx = Math.floor((relX / this._mapPxW) * worldW);
        const wy = Math.floor((relY / this._mapPxH) * worldH);

        const game = this.scene.get('GameScene');
        game._confirmAethericTearFree(wx, wy);
        this.scene.stop();
        this.scene.resume('GameScene');
    }

    // ── Gate selection ────────────────────────────────────────────────────────

    _selectGate(gateId) {
        const game = this.scene.get('GameScene');
        game._confirmAethericTearGate(gateId);
        this.scene.stop();
        this.scene.resume('GameScene');
    }

    _cancel() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
