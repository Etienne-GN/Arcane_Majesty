import Phaser from 'phaser';
import { soundManager } from '../systems/SoundManager.js';
import { GamepadNav } from '../systems/GamepadNav.js';
import { CharacterRenderer } from '../systems/CharacterRenderer.js';

const MAX_SLOTS = 5;
const SLOT_KEY  = (n) => `amo_char_slot_${n}`;
const PREVIEW_ANIMS = ['walk', 'idle', 'hurt'];

function loadSlot(n) {
    try { return JSON.parse(localStorage.getItem(SLOT_KEY(n))); } catch { return null; }
}

export default class OnlineCharacterScene extends Phaser.Scene {
    constructor() { super('OnlineCharacterScene'); }

    init(data) {
        this._serverUrl = data?.serverUrl ?? 'http://localhost:3002';
        this._slotData  = Array.from({ length: MAX_SLOTS }, (_, i) => loadSlot(i));
    }

    preload() {
        // Legacy saves predate the per-layer `anims` manifest; swallow any stray
        // missing-sheet errors so they don't clutter the console.
        this.load.on('loaderror', (file) => {
            if (file?.key?.startsWith?.('lpc__')) return;
        });
        this._renderer = new CharacterRenderer(this);
        for (const dat of this._slotData) {
            if (!dat?.rendererLayers?.length) continue;
            this._renderer.preload({ layers: dat.rendererLayers, animations: PREVIEW_ANIMS });
        }
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this._selectedSlot  = -1;
        this._cards         = [];
        this._previews      = [];

        const bg = this.add.image(w / 2, h / 2, 'menu_bg');
        bg.setScale(Math.min(w / bg.width, h / bg.height)).setAlpha(0.25);
        this.add.rectangle(0, 0, w, h, 0x000000, 0.70).setOrigin(0);

        this.add.text(w / 2, 36, 'YOUR CHARACTERS', {
            font: 'bold 22px monospace', fill: '#aabbff',
            stroke: '#000000', strokeThickness: 4,
        }).setOrigin(0.5);

        // ── Slot cards ─────────────────────────────────────────────────
        const cardW  = Math.min(Math.floor((w - 80) / MAX_SLOTS), 130);
        const cardH  = 160;
        const totalW = cardW * MAX_SLOTS + 8 * (MAX_SLOTS - 1);
        const startX = Math.round(w / 2 - totalW / 2);
        const cardY  = Math.round(h / 2 - 50);

        for (let i = 0; i < MAX_SLOTS; i++) {
            const cx  = startX + i * (cardW + 8) + cardW / 2;
            const dat = this._slotData[i];

            const panel = this.add.rectangle(cx, cardY, cardW, cardH, 0x0a0a1a, 0.92)
                .setStrokeStyle(1, 0x222244)
                .setInteractive({ useHandCursor: true });

            let nameText, subText;

            if (dat) {
                // Slot label top
                this.add.text(cx, cardY - cardH / 2 + 8, `SLOT ${i + 1}`, {
                    font: '7px monospace', fill: '#334455',
                }).setOrigin(0.5, 0);

                // Character name bottom
                nameText = this.add.text(cx, cardY + cardH / 2 - 24, dat.charName ?? 'Hero', {
                    font: `bold ${Math.min(11, cardW / 9)}px monospace`, fill: '#ddddff',
                    wordWrap: { width: cardW - 10 }, align: 'center',
                }).setOrigin(0.5, 0);

                subText = this.add.text(cx, cardY + cardH / 2 - 10, 'Click to select', {
                    font: '7px monospace', fill: '#334455',
                }).setOrigin(0.5, 0);

                // Delete ×
                const del = this.add.text(cx + cardW / 2 - 8, cardY - cardH / 2 + 8, '×', {
                    font: 'bold 14px monospace', fill: '#442233',
                }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true });
                del.on('pointerover', () => del.setStyle({ fill: '#ff4466' }));
                del.on('pointerout',  () => del.setStyle({ fill: '#442233' }));
                del.on('pointerdown', (ptr) => { ptr.event.stopPropagation(); this._deleteSlot(i); });

                // LPC character preview
                if (dat.rendererLayers?.length) {
                    const spriteScale = Math.min(1.5, (cardH - 50) / 64);
                    const preview = this._renderer.create(cx, cardY - 12, {
                        layers:      dat.rendererLayers,
                        animations:  PREVIEW_ANIMS,
                        defaultAnim: 'idle',
                        defaultDir:  'down',
                    });
                    preview.setScale(spriteScale);
                    // Apply palette swaps
                    for (const [lKey, entry] of Object.entries(preview._lpcLayers)) {
                        if (entry.layer.swapParams) {
                            this._renderer.applyLayerSwap(preview, lKey, entry.layer.swapParams);
                        }
                    }
                    this._previews.push(preview);
                }
            } else {
                nameText = this.add.text(cx, cardY - 10, '+', {
                    font: `bold ${Math.min(28, cardW / 4)}px monospace`, fill: '#334455',
                }).setOrigin(0.5);
                subText = this.add.text(cx, cardY + 20, 'CREATE', {
                    font: '9px monospace', fill: '#334455',
                }).setOrigin(0.5);
            }

            panel.on('pointerover', () => {
                if (this._selectedSlot !== i) panel.setFillStyle(0x111133, 0.92);
                nameText.setStyle({ fill: '#ffffff' });
                subText.setStyle({ fill: '#8899bb' });
                soundManager.menuHover();
            });
            panel.on('pointerout', () => {
                if (this._selectedSlot !== i) panel.setFillStyle(0x0a0a1a, 0.92);
                nameText.setStyle({ fill: dat ? '#ddddff' : '#334455' });
                subText.setStyle({ fill: dat ? '#334455' : '#334455' });
            });
            panel.on('pointerdown', () => this._clickSlot(i));

            this._cards.push({ panel, nameText, subText, slotIdx: i });
        }

        // ── Enter World button ─────────────────────────────────────────
        this._enterBtn = this.add.text(w / 2, cardY + cardH / 2 + 52, '[ ENTER WORLD ]', {
            font: 'bold 22px monospace', fill: '#334455',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0.4);

        // ── Back ───────────────────────────────────────────────────────
        this.add.text(32, h - 32, '< Back', {
            font: '15px monospace', fill: '#445566',
        }).setOrigin(0, 1).setInteractive({ useHandCursor: true })
          .on('pointerover', function () { this.setStyle({ fill: '#aabbff' }); })
          .on('pointerout',  function () { this.setStyle({ fill: '#445566' }); })
          .on('pointerdown', () => { soundManager.menuSelect(); this.scene.start('ServerSelectScene'); });

        this.input.keyboard.on('keydown-ESCAPE', () => this.scene.start('ServerSelectScene'));
        this.input.keyboard.on('keydown-ENTER',  () => { if (this._selectedSlot >= 0 && this._slotData[this._selectedSlot]) this._enterWorld(); });

        this._gpNav = new GamepadNav(this);
        this.cameras.main.fadeIn(400);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.left)  this._moveSlot(-1);
        if (gp.right) this._moveSlot(1);
        if (gp.A)     { if (this._selectedSlot >= 0 && this._slotData[this._selectedSlot]) this._enterWorld(); else if (this._selectedSlot >= 0) this._clickSlot(this._selectedSlot); }
        if (gp.B)     this.scene.start('ServerSelectScene');
    }

    _moveSlot(dir) {
        const next = Phaser.Math.Clamp((this._selectedSlot < 0 ? 0 : this._selectedSlot) + dir, 0, MAX_SLOTS - 1);
        this._selectSlot(next);
        soundManager.menuHover();
    }

    _clickSlot(i) {
        soundManager.menuSelect();
        if (this._slotData[i]) {
            this._selectSlot(i);
        } else {
            this.cameras.main.fadeOut(300);
            this.time.delayedCall(300, () => {
                this.scene.start('CharacterCreatorScene', { mode: 'online', slot: i });
            });
        }
    }

    _selectSlot(i) {
        this._selectedSlot = i;
        this._refreshCards();
        const isReady = this._slotData[i] != null;
        this._enterBtn
            .setStyle({ fill: isReady ? '#ffd700' : '#334455' })
            .setAlpha(isReady ? 1 : 0.4);
        if (isReady) this._enterBtn.setInteractive({ useHandCursor: true });
        else         this._enterBtn.disableInteractive();
        if (isReady) {
            this._enterBtn.removeAllListeners();
            this._enterBtn.on('pointerover', () => this._enterBtn.setStyle({ fill: '#ffffff' }));
            this._enterBtn.on('pointerout',  () => this._enterBtn.setStyle({ fill: '#ffd700' }));
            this._enterBtn.on('pointerdown', () => this._enterWorld());
        }
    }

    _refreshCards() {
        for (const { panel, slotIdx } of this._cards) {
            const sel = slotIdx === this._selectedSlot;
            panel.setFillStyle(sel ? 0x1a2244 : 0x0a0a1a, 0.92);
            panel.setStrokeStyle(1, sel ? 0x4466cc : 0x222244);
        }
    }

    _deleteSlot(i) {
        localStorage.removeItem(SLOT_KEY(i));
        soundManager.menuHover();
        if (this._selectedSlot === i) this._selectedSlot = -1;
        this.scene.restart({ serverUrl: this._serverUrl });
    }

    _enterWorld() {
        const dat = this._slotData[this._selectedSlot];
        if (!dat) return;
        soundManager.menuSelect();
        this.cameras.main.fadeOut(400);
        this.time.delayedCall(400, () => {
            this.scene.start('GameScene', {
                serverUrl:       this._serverUrl,
                onlineCharacter: dat,
                characterId:     'eldrin',
            });
        });
    }
}
