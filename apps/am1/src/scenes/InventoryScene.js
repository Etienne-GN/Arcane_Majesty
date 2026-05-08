import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ITEMS, SATCHEL_TIERS } from '../data/items.js';
import { DIALOGUES } from '../data/dialogues.js';

const SLOT = 28;
const EQUIP_PANEL_W = 96;

const EQUIP_SLOTS = [
    { key: 'head',       label: 'HEAD'  },
    { key: 'body',       label: 'BODY'  },
    { key: 'weapon',     label: 'WEAP'  },
    { key: 'accessory1', label: 'ACC 1' },
    { key: 'accessory2', label: 'ACC 2' },
];

// Adaptive grid columns based on satchel capacity
function gridCols(capacity) {
    if (capacity <= 20) return 5;
    if (capacity <= 35) return 7;
    return 10;
}

export default class InventoryScene extends Phaser.Scene {
    constructor() { super('InventoryScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;
        const px = 6, py = 6, pw = w - 12, ph = h - 12;

        this.add.rectangle(0, 0, w, h, 0x000000, 0.82).setOrigin(0);
        this.add.rectangle(px, py, pw, ph, 0x080818).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(2, 0x4444aa);
        bdr.strokeRect(px, py, pw, ph);

        // Header
        this.add.text(px + pw / 2, py + 5, "SCHOLAR'S SATCHEL", {
            font: 'bold 11px monospace', fill: '#ffd700'
        }).setOrigin(0.5, 0);

        // Glint counter (top right)
        this.add.text(px + pw - 5, py + 5, `Glint: ${playerStats.glint ?? 0}`, {
            font: '9px monospace', fill: '#c8a820'
        }).setOrigin(1, 0);

        // Tier info
        const tier = SATCHEL_TIERS[(playerStats.satchelTier ?? 1) - 1];
        const used = playerStats.inventory.length;
        this.add.text(px + pw / 2, py + 17, `Tier ${playerStats.satchelTier}: ${tier.name} — ${used}/${tier.slots} slots`, {
            font: '7px monospace', fill: '#887799'
        }).setOrigin(0.5, 0);

        // Vertical divider
        const divX = px + EQUIP_PANEL_W + 4;
        const divG = this.add.graphics();
        divG.lineStyle(1, 0x2a2a44);
        divG.lineBetween(divX, py + 28, divX, py + ph - 26);

        // Equipment panel (left)
        this._drawEquipPanel(px + 2, py + 28, EQUIP_PANEL_W);

        // Satchel grid + description (right)
        this._drawSatchelGrid(divX + 4, py + 28, pw - EQUIP_PANEL_W - 14);

        // Close hint
        this.add.text(px + pw / 2, py + ph - 4, '[ESC / I] Close', {
            font: '7px monospace', fill: '#443355'
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-I',   () => this._close());
    }

    _drawEquipPanel(x, y, panelW) {
        this.add.text(x + panelW / 2, y, 'EQUIPMENT', {
            font: 'bold 7px monospace', fill: '#8888bb'
        }).setOrigin(0.5, 0);

        const slotH = 38, gap = 3;

        EQUIP_SLOTS.forEach(({ key, label }, i) => {
            const sy = y + 12 + i * (slotH + gap);
            const equippedId  = playerStats.equipment[key];
            const equippedDef = equippedId ? ITEMS[equippedId] : null;

            const bg = this.add.rectangle(x, sy, panelW, slotH,
                equippedDef ? 0x12122e : 0x0c0c20).setOrigin(0).setInteractive();
            const bdrG = this.add.graphics();
            bdrG.lineStyle(1, equippedDef ? 0x5533aa : 0x282840);
            bdrG.strokeRect(x, sy, panelW, slotH);

            this.add.text(x + 3, sy + 2, label, { font: '6px monospace', fill: '#444466' });

            if (equippedDef) {
                const eIcon = equippedDef.icon;
                if (eIcon && this.textures.exists(eIcon)) {
                    this.add.image(x + 10, sy + 18, eIcon).setDisplaySize(12, 12).setOrigin(0.5);
                } else {
                    this.add.rectangle(x + 4, sy + 12, 12, 12, equippedDef.color ?? 0x8855ff).setOrigin(0);
                }
                this.add.text(x + 20, sy + 11, equippedDef.name, {
                    font: '7px monospace', fill: '#bbbbdd',
                    wordWrap: { width: panelW - 22 }
                });
                bg.on('pointerdown', () => {
                    if (playerStats.unequipItem(key)) this.scene.restart();
                    else this.cameras.main.shake(80, 0.007);
                });
                bg.on('pointerover', () => bg.setFillStyle(0x1c1c40));
                bg.on('pointerout',  () => bg.setFillStyle(0x12122e));
            } else {
                this.add.text(x + panelW / 2, sy + slotH / 2 + 3, '—', {
                    font: '9px monospace', fill: '#2a2a44'
                }).setOrigin(0.5);
                bg.on('pointerover', () => bg.setFillStyle(0x111130));
                bg.on('pointerout',  () => bg.setFillStyle(0x0c0c20));
            }
        });
    }

    _drawSatchelGrid(x, y, availW) {
        const capacity = playerStats.getSatchelCapacity();
        const cols     = gridCols(capacity);
        const rows     = Math.ceil(capacity / cols);
        const inventory = playerStats.inventory;

        this.selectedIdx = -1;

        // Description area below grid
        const gridH = rows * SLOT;
        this.descText = this.add.text(x, y + gridH + 6, '', {
            font: '7px monospace', fill: '#bbbbcc',
            wordWrap: { width: availW - 4 }, lineSpacing: 2
        });
        this.actionHint = this.add.text(x + availW / 2, y + gridH + 26, '', {
            font: '7px monospace', fill: '#777788'
        }).setOrigin(0.5, 0);

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const idx     = row * cols + col;
                const sx      = x + col * SLOT;
                const sy      = y + row * SLOT;
                const locked  = idx >= capacity;

                const slotBg = this.add.rectangle(sx, sy, SLOT - 2, SLOT - 2,
                    locked ? 0x060610 : 0x0e0e26).setOrigin(0).setInteractive();
                const slotBdr = this.add.graphics();
                slotBdr.lineStyle(1, locked ? 0x151520 : 0x1e1e3a);
                slotBdr.strokeRect(sx, sy, SLOT - 2, SLOT - 2);

                if (locked) {
                    this.add.text(sx + (SLOT - 2) / 2, sy + (SLOT - 2) / 2, 'X', {
                        font: '7px monospace', fill: '#1a1a2a'
                    }).setOrigin(0.5);
                    continue;
                }

                const item = inventory[idx];
                if (item) {
                    // Item icon (fallback to color block)
                    const iIcon = ITEMS[item.id]?.icon;
                    if (iIcon && this.textures.exists(iIcon)) {
                        this.add.image(sx + (SLOT - 2) / 2, sy + (SLOT - 2) / 2, iIcon).setDisplaySize(16, 16).setOrigin(0.5);
                    } else {
                        this.add.rectangle(sx + 3, sy + 3, SLOT - 8, SLOT - 8, item.color ?? 0x8855ff).setOrigin(0);
                    }

                    // Equipment indicator (small purple pip)
                    if (item.slot) this.add.rectangle(sx + 2, sy + 2, 4, 4, 0xaa44ff).setOrigin(0);

                    // Stack count
                    if (item.qty > 1) {
                        this.add.text(sx + SLOT - 5, sy + SLOT - 5, `${item.qty}`, {
                            font: '6px monospace', fill: '#fff'
                        }).setOrigin(1, 1);
                    }

                    slotBg.on('pointerover', () => slotBg.setFillStyle(0x1a1a40));
                    slotBg.on('pointerout',  () => slotBg.setFillStyle(idx === this.selectedIdx ? 0x141438 : 0x0e0e26));
                    slotBg.on('pointerdown', () => {
                        this.selectedIdx = idx;
                        const def = ITEMS[item.id];
                        const statStr = def?.stats
                            ? '  ' + Object.entries(def.stats).map(([k, v]) => `+${v} ${k.substring(0,3).toUpperCase()}`).join(' ')
                            : '';
                        this.descText.setText(`${item.name}${statStr}\n${item.description}`);
                        this.actionHint.setText(
                            item.slot ? '[E] Equip   [ESC/I] Close' : '[U] Use   [ESC/I] Close'
                        );
                    });
                } else {
                    slotBg.on('pointerover', () => slotBg.setFillStyle(0x111130));
                    slotBg.on('pointerout',  () => slotBg.setFillStyle(0x0e0e26));
                }
            }
        }

        // Key handlers
        const LORE_ITEM_KEYS = { ancient_scroll: 'ancient_scroll_read', eldritch_tome: 'eldritch_tome_read' };
        this.input.keyboard.on('keydown-U', () => {
            if (this.selectedIdx < 0) return;
            const item = inventory[this.selectedIdx];
            if (!item) return;
            const itemId = item.id;
            if (playerStats.useItem(itemId)) {
                // Add lore to recoveredMemories so it appears in the Codex
                const dlgKey = LORE_ITEM_KEYS[itemId];
                if (dlgKey && DIALOGUES[dlgKey]) {
                    const memId = `item_${itemId}`;
                    if (!playerStats.recoveredMemories.find(m => m.id === memId)) {
                        const text = DIALOGUES[dlgKey].map(l => l.text).join(' ');
                        playerStats.recoveredMemories.push({ id: memId, title: ITEMS[itemId]?.name ?? itemId, text, timestamp: Date.now() });
                    }
                    this.scene.stop();
                    this.scene.launch('DialogueScene', { lines: DIALOGUES[dlgKey] });
                } else {
                    this.scene.restart();
                }
            }
        });
        this.input.keyboard.on('keydown-E', () => {
            if (this.selectedIdx < 0) return;
            const item = inventory[this.selectedIdx];
            if (item && playerStats.equipItem(item.id)) this.scene.restart();
            else this.cameras.main.shake(80, 0.007);
        });
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
