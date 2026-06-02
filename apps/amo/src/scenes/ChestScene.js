import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ITEMS } from '../data/items.js';
import { SaveManager } from '../systems/SaveManager.js';

const SLOT       = 52;
const CHEST_COLS = 5;
const SATCHEL_COLS = 5;

// Module-level state so scene.restart() doesn't lose the chest reference
let _activeChest   = null;
let _storyId       = null;
let _characterId   = null;

export function openChest(chest, storyId, characterId) {
    _activeChest   = chest;
    _storyId       = storyId;
    _characterId   = characterId;
}

export default class ChestScene extends Phaser.Scene {
    constructor() { super('ChestScene'); }

    create() {
        this._chest = _activeChest;
        const w = this.scale.width, h = this.scale.height;
        const px = 12, py = 12, pw = w - 24, ph = h - 24;

        // Backdrop
        this.add.rectangle(0, 0, w, h, 0x000000, 0.85).setOrigin(0);
        this.add.rectangle(px, py, pw, ph, 0x080818).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(4, 0xaa8833);
        bdr.strokeRect(px, py, pw, ph);

        // Title
        this.add.text(px + pw / 2, py + 10, 'CHEST', {
            font: 'bold 22px monospace', fill: '#ffcc44',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 0);

        const BOTTOM_AREA = 76;
        const contentY = py + 50;
        const contentH = ph - 50 - BOTTOM_AREA;
        const midX = px + Math.round(pw / 2);

        // Vertical divider
        const divG = this.add.graphics();
        divG.lineStyle(2, 0x2a2a44);
        divG.lineBetween(midX, contentY - 2, midX, py + ph - BOTTOM_AREA);

        // Panel labels
        const leftW  = midX - px - 8;
        const rightW = pw - (midX - px) - 8;

        this.add.text(px + leftW / 2,      contentY - 6, 'CHEST CONTENTS', {
            font: '11px monospace', fill: '#887744'
        }).setOrigin(0.5, 1);
        this.add.text(midX + rightW / 2 + 4, contentY - 6, 'YOUR SATCHEL', {
            font: '11px monospace', fill: '#445588'
        }).setOrigin(0.5, 1);

        // Description area
        this._descText = this.add.text(px + 8, py + ph - BOTTOM_AREA + 6, '', {
            font: '13px monospace', fill: '#bbbbcc',
            wordWrap: { width: pw - 16 }, lineSpacing: 3
        });

        this._drawChestGrid(px + 8,    contentY, leftW,  contentH);
        this._drawSatchelGrid(midX + 8, contentY, rightW, contentH);

        // Bottom buttons
        const btnY = py + ph - 12;
        const takeAll = this.add.text(px + 90, btnY, '[ TAKE ALL ]', {
            font: 'bold 14px monospace', fill: '#44aa66',
        }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
        takeAll.on('pointerover', () => takeAll.setStyle({ fill: '#88ffaa' }));
        takeAll.on('pointerout',  () => takeAll.setStyle({ fill: '#44aa66' }));
        takeAll.on('pointerdown', () => this._takeAll());

        this.add.text(px + pw / 2, btnY, '[ESC] Close', {
            font: '12px monospace', fill: '#334455'
        }).setOrigin(0.5, 1);

        const closeBtn = this.add.text(px + pw - 60, btnY, '[ CLOSE ]', {
            font: 'bold 14px monospace', fill: '#886633',
        }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#ffcc66' }));
        closeBtn.on('pointerout',  () => closeBtn.setStyle({ fill: '#886633' }));
        closeBtn.on('pointerdown', () => this._close());

        this.input.keyboard.on('keydown-ESC', () => this._close());
    }

    _drawChestGrid(x, y, availW, availH) {
        const contents = this._chest.contents;
        const cols  = Math.min(CHEST_COLS, Math.floor(availW / SLOT));
        // Show enough rows to hold current items + 1 buffer row, at least 2
        const rows  = Math.max(2, Math.ceil((contents.length + cols) / cols));
        const maxRows = Math.floor(availH / SLOT);
        const visRows = Math.min(rows, maxRows);

        for (let r = 0; r < visRows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx  = r * cols + c;
                const sx   = x + c * SLOT;
                const sy   = y + r * SLOT;
                const item = contents[idx];

                const bg   = this.add.rectangle(sx, sy, SLOT - 4, SLOT - 4, 0x0e0e20).setOrigin(0).setInteractive();
                const slotBdr = this.add.graphics();
                slotBdr.lineStyle(2, item ? 0x554422 : 0x1a1a28);
                slotBdr.strokeRect(sx, sy, SLOT - 4, SLOT - 4);

                if (item) {
                    this._drawItemInSlot(sx, sy, item);
                    bg.on('pointerover', () => { bg.setFillStyle(0x1c1c30); this._showDesc(item.id, 'chest'); });
                    bg.on('pointerout',  () => bg.setFillStyle(0x0e0e20));
                    bg.on('pointerdown', () => this._takeItem(idx));
                } else {
                    bg.on('pointerover', () => bg.setFillStyle(0x111120));
                    bg.on('pointerout',  () => bg.setFillStyle(0x0e0e20));
                }
            }
        }

        // Overflow notice
        if (contents.length > visRows * cols) {
            this.add.text(x + availW / 2, y + visRows * SLOT + 6,
                `+${contents.length - visRows * cols} more`, {
                    font: '11px monospace', fill: '#554433'
                }).setOrigin(0.5, 0);
        }
    }

    _drawSatchelGrid(x, y, availW, availH) {
        const capacity = playerStats.getSatchelCapacity();
        const cols     = Math.min(SATCHEL_COLS, Math.floor(availW / SLOT));
        const rows     = Math.ceil(capacity / cols);
        const maxRows  = Math.floor(availH / SLOT);
        const visRows  = Math.min(rows, maxRows);
        const inventory = playerStats.inventory;

        for (let r = 0; r < visRows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx    = r * cols + c;
                if (idx >= capacity) break;
                const sx     = x + c * SLOT;
                const sy     = y + r * SLOT;
                const item   = inventory[idx];
                const locked = idx >= capacity;

                const bg = this.add.rectangle(sx, sy, SLOT - 4, SLOT - 4,
                    locked ? 0x060610 : 0x0e0e26).setOrigin(0).setInteractive();
                const slotBdr = this.add.graphics();
                slotBdr.lineStyle(2, item ? 0x1e1e3a : locked ? 0x111118 : 0x141428);
                slotBdr.strokeRect(sx, sy, SLOT - 4, SLOT - 4);

                if (item) {
                    this._drawItemInSlot(sx, sy, item, true);
                    bg.on('pointerover', () => { bg.setFillStyle(0x1a1a40); this._showDesc(item.id, 'satchel'); });
                    bg.on('pointerout',  () => bg.setFillStyle(0x0e0e26));
                    bg.on('pointerdown', () => this._storeItem(idx));
                } else {
                    bg.on('pointerover', () => bg.setFillStyle(0x111130));
                    bg.on('pointerout',  () => bg.setFillStyle(0x0e0e26));
                }
            }
        }
    }

    _drawItemInSlot(sx, sy, item, showEquipPip = false) {
        const def   = ITEMS[item.id];
        const color = def?.color ?? item.color ?? 0xaa8833;

        if (def?.icon && this.textures.exists(def.icon)) {
            this.add.image(sx + (SLOT - 4) / 2, sy + (SLOT - 4) / 2, def.icon)
                .setDisplaySize(32, 32).setOrigin(0.5);
        } else {
            this.add.rectangle(sx + 6, sy + 6, SLOT - 16, SLOT - 16, color).setOrigin(0);
        }

        if (showEquipPip && item.slot) {
            this.add.rectangle(sx + 4, sy + 4, 6, 6, 0xaa44ff).setOrigin(0);
        }
        if (item.qty > 1) {
            this.add.text(sx + SLOT - 8, sy + SLOT - 8, `${item.qty}`, {
                font: '11px monospace', fill: '#fff'
            }).setOrigin(1, 1);
        }
    }

    _showDesc(itemId, source) {
        const def = ITEMS[itemId];
        if (!def) return;
        const hint = source === 'chest'
            ? 'Click to take  |  [Take All] for everything'
            : 'Click to store in chest';
        const statStr = def.stats
            ? '\n' + Object.entries(def.stats).map(([k, v]) => `+${v} ${k}`).join('  ')
            : '';
        this._descText.setText(`${def.name} — ${def.description}${statStr}\n${hint}`);
    }

    _takeItem(chestIdx) {
        const item = this._chest.contents[chestIdx];
        if (!item) return;
        if (playerStats.addItem(item.id, item.qty)) {
            this._chest.contents.splice(chestIdx, 1);
            this.scene.restart();
        } else {
            this._descText.setText('Satchel is full!');
            this.cameras.main.shake(80, 0.007);
        }
    }

    _storeItem(satchelIdx) {
        const item = playerStats.inventory[satchelIdx];
        if (!item) return;

        const def = ITEMS[item.id];
        if (def?.stackable) {
            const existing = this._chest.contents.find(c => c.id === item.id);
            if (existing) {
                existing.qty += item.qty;
                playerStats.inventory.splice(satchelIdx, 1);
                this.scene.restart();
                return;
            }
        }
        this._chest.contents.push({ id: item.id, qty: item.qty });
        playerStats.inventory.splice(satchelIdx, 1);
        this.scene.restart();
    }

    _takeAll() {
        const remaining = [];
        for (const item of this._chest.contents) {
            if (!playerStats.addItem(item.id, item.qty)) remaining.push(item);
        }
        this._chest.contents = remaining;
        if (remaining.length > 0) {
            this._descText.setText('Satchel full — some items could not be taken.');
            this.cameras.main.shake(80, 0.007);
        }
        this.scene.restart();
    }

    _close() {
        const chest = this._chest;
        chest._wasOpened = true;
        if (chest.contents.length === 0) {
            chest.setTint(0x888888);
            chest.ePrompt?.setAlpha(0);
        } else {
            chest.clearTint();
        }
        SaveManager.save(playerStats, _storyId, _characterId);
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
