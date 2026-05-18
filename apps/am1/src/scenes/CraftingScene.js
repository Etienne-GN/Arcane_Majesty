import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ITEMS } from '../data/items.js';
import { CRAFTING_RECIPES, CATEGORY_LABELS, TIER_COLORS } from '../data/craftingRecipes.js';
import { soundManager } from '../systems/SoundManager.js';
import { SaveManager } from '../systems/SaveManager.js';

const RARITY_COLORS = {
    common:    '#888888',
    uncommon:  '#44aaff',
    rare:      '#aa44ff',
    epic:      '#ffaa00',
    legendary: '#ffd700',
};

export default class CraftingScene extends Phaser.Scene {
    constructor() { super('CraftingScene'); }

    create() {
        const w = this.scale.width, h = this.scale.height;
        const px = 12, py = 10, pw = w - 24, ph = h - 20;

        this._feedback = null;

        this.add.rectangle(0, 0, w, h, 0x000000, 0.88).setOrigin(0);
        this.add.rectangle(px, py, pw, ph, 0x080808).setOrigin(0);
        const bdr = this.add.graphics();
        bdr.lineStyle(2, 0x886622);
        bdr.strokeRect(px, py, pw, ph);

        this.add.text(w / 2, py + 9, 'FORGE & CRAFT', {
            font: 'bold 13px monospace', fill: '#ddaa44'
        }).setOrigin(0.5, 0);

        this.add.text(w / 2, py + 23, 'Craft gear from materials gathered in the wild', {
            font: '7px monospace', fill: '#554433'
        }).setOrigin(0.5, 0);

        const divG = this.add.graphics();
        divG.lineStyle(1, 0x332200);
        divG.lineBetween(px + 6, py + 33, px + pw - 6, py + 33);

        // ── Two-column layout ─────────────────────────────────────────────────
        const colW  = Math.floor((pw - 28) * 0.54);
        const leftX = px + 10;
        const rightX = leftX + colW + 8;
        const rightW = pw - 28 - colW - 8;
        const listTop = py + 38;

        this._leftX  = leftX;
        this._colW   = colW;
        this._rightX = rightX;
        this._rightW = rightW;
        this._listTop = listTop;

        this._selected = null;
        this._rowObjs  = [];
        this._detailObjs = [];
        this._listScroll    = 0;
        this._listScrollMax = 0;
        this._listAvailH    = ph - 46;

        this._drawList();
        this._drawDetail();

        this.add.text(w / 2, py + ph - 8, '[ESC] Close', {
            font: '8px monospace', fill: '#443322'
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.add.text(w - 6, 4, '✕', { font: 'bold 14px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());

        this.input.on('wheel', (_p, _o, _dx, dy) => { this._scrollList(Math.sign(dy) * 22); });
        this.input.keyboard.on('keydown-UP',   () => this._scrollList(-24));
        this.input.keyboard.on('keydown-DOWN', () => this._scrollList(24));

        let _touchY = null;
        this.input.on('pointerdown', ptr => { _touchY = ptr.y; });
        this.input.on('pointermove', ptr => {
            if (_touchY === null || !ptr.isDown) return;
            const dy = _touchY - ptr.y;
            if (Math.abs(dy) > 4) { this._scrollList(dy); _touchY = ptr.y; }
        });
        this.input.on('pointerup', () => { _touchY = null; });
    }

    // ── Recipe list (left column) ─────────────────────────────────────────────

    _drawList() {
        this._rowObjs.forEach(o => o?.destroy?.());
        this._rowObjs = [];
        const track = o => { this._rowObjs.push(o); return o; };

        const x = this._leftX, maxW = this._colW;
        let oy = this._listTop - this._listScroll;
        const startOy = oy;
        const ROW_H = 26;

        const byCategory = {};
        CRAFTING_RECIPES.forEach(r => {
            (byCategory[r.category] = byCategory[r.category] ?? []).push(r);
        });

        for (const [cat, recipes] of Object.entries(byCategory)) {
            track(this.add.text(x, oy, `— ${CATEGORY_LABELS[cat]} —`, {
                font: 'bold 7px monospace', fill: '#664422'
            }));
            oy += 12;

            for (const recipe of recipes) {
                const canCraft = this._canCraft(recipe);
                const isSelected = this._selected?.id === recipe.id;
                const tierCol = TIER_COLORS[recipe.tier] ?? 0x888888;
                const bgCol   = isSelected ? 0x1a1000 : (canCraft ? 0x110c00 : 0x080600);
                const border  = isSelected ? tierCol  : (canCraft ? 0x553311 : 0x221100);

                const bg = track(this.add.rectangle(x, oy, maxW, ROW_H - 2, bgCol).setOrigin(0).setInteractive());
                const bdrG = track(this.add.graphics());
                bdrG.lineStyle(1, border);
                bdrG.strokeRect(x, oy, maxW, ROW_H - 2);

                // Tier pip
                track(this.add.rectangle(x + 2, oy + 3, 3, ROW_H - 8, tierCol).setOrigin(0));

                const item = ITEMS[recipe.output];
                const rarCol = RARITY_COLORS[item?.rarity ?? 'common'];
                track(this.add.text(x + 9, oy + 4, recipe.label, {
                    font: `${canCraft ? 'bold ' : ''}8px monospace`,
                    fill: canCraft ? rarCol : '#443322'
                }));
                track(this.add.text(x + 9, oy + 14, item?.description?.split('.')[0] ?? '', {
                    font: '6px monospace', fill: '#443322'
                }));

                const statusTxt = canCraft ? '[CRAFT]' : 'missing';
                track(this.add.text(x + maxW - 4, oy + 10, statusTxt, {
                    font: '6px monospace',
                    fill: canCraft ? '#88cc44' : '#331100'
                }).setOrigin(1, 0.5));

                bg.on('pointerdown', () => {
                    this._selected = recipe;
                    this._drawList();
                    this._drawDetail();
                });
                bg.on('pointerover', () => bg.setFillStyle(bgCol + 0x0a0800));
                bg.on('pointerout',  () => bg.setFillStyle(bgCol));

                oy += ROW_H;
            }
            oy += 4;
        }
        this._listScrollMax = Math.max(0, (oy - startOy) - this._listAvailH);
    }

    _scrollList(delta) {
        this._listScroll = Phaser.Math.Clamp(this._listScroll + delta, 0, this._listScrollMax);
        this._drawList();
    }

    // ── Detail panel (right column) ───────────────────────────────────────────

    _drawDetail() {
        this._detailObjs.forEach(o => o?.destroy?.());
        this._detailObjs = [];
        const track = o => { this._detailObjs.push(o); return o; };

        const x = this._rightX, w = this._rightW;
        let oy = this._listTop;

        if (!this._selected) {
            track(this.add.text(x + w / 2, oy + 40, 'Select a recipe\nto see details', {
                font: '8px monospace', fill: '#443322', align: 'center'
            }).setOrigin(0.5, 0));
            return;
        }

        const recipe = this._selected;
        const item   = ITEMS[recipe.output];
        const tierCol = TIER_COLORS[recipe.tier] ?? 0x888888;
        const rarCol  = RARITY_COLORS[item?.rarity ?? 'common'];
        const canCraft = this._canCraft(recipe);

        // Output item header
        track(this.add.text(x, oy, recipe.label, {
            font: 'bold 10px monospace', fill: rarCol
        }));
        oy += 13;

        if (item?.description) {
            track(this.add.text(x, oy, item.description, {
                font: '7px monospace', fill: '#776655',
                wordWrap: { width: w }
            }));
            oy += 22;
        }

        // Stat bonuses
        if (item?.stats) {
            const statLabels = { strength: 'STR', intelligence: 'INT', stamina: 'STA', agility: 'AGI' };
            const statLine = Object.entries(item.stats)
                .map(([k, v]) => `+${v} ${statLabels[k] ?? k}`).join('  ');
            track(this.add.text(x, oy, statLine, {
                font: '8px monospace', fill: '#88cc44'
            }));
            oy += 13;
        }

        const divG = track(this.add.graphics());
        divG.lineStyle(1, 0x332200);
        divG.lineBetween(x, oy, x + w, oy);
        oy += 8;

        track(this.add.text(x, oy, 'REQUIRES', { font: 'bold 7px monospace', fill: '#664422' }));
        oy += 12;

        // Ingredient list
        for (const ing of recipe.ingredients) {
            const have = this._countItem(ing.id);
            const met  = have >= ing.qty;
            const ingItem = ITEMS[ing.id];
            const nameStr = ingItem?.name ?? ing.id.replace(/_/g, ' ');
            const col = met ? '#88cc44' : '#cc4422';

            track(this.add.rectangle(x, oy, w, 14, met ? 0x0a1500 : 0x150500).setOrigin(0));
            track(this.add.text(x + 4, oy + 2, nameStr, { font: '7px monospace', fill: col }));
            track(this.add.text(x + w - 2, oy + 2, `${have}/${ing.qty}`, {
                font: '7px monospace', fill: col
            }).setOrigin(1, 0));
            oy += 16;
        }
        oy += 6;

        // Craft button
        const btnCol  = canCraft ? 0x331a00 : 0x0f0a00;
        const btnBord = canCraft ? tierCol  : 0x221100;
        const btnTxt  = canCraft ? 'CRAFT' : 'MISSING MATERIALS';
        const btnTxtC = canCraft ? '#ffcc44' : '#443322';

        const btn = track(this.add.rectangle(x, oy, w, 18, btnCol).setOrigin(0));
        const bdrG = track(this.add.graphics());
        bdrG.lineStyle(1, btnBord);
        bdrG.strokeRect(x, oy, w, 18);
        track(this.add.text(x + w / 2, oy + 9, btnTxt, {
            font: 'bold 8px monospace', fill: btnTxtC
        }).setOrigin(0.5));

        if (canCraft) {
            btn.setInteractive();
            btn.on('pointerdown', () => this._craft(recipe));
            btn.on('pointerover', () => btn.setFillStyle(0x552800));
            btn.on('pointerout',  () => btn.setFillStyle(btnCol));
        }

        // Feedback line
        if (this._feedback) {
            oy += 26;
            track(this.add.text(x + w / 2, oy, this._feedback.msg, {
                font: '8px monospace', fill: this._feedback.color
            }).setOrigin(0.5, 0));
        }
    }

    // ── Craft action ──────────────────────────────────────────────────────────

    _craft(recipe) {
        if (!this._canCraft(recipe)) return;

        // Consume ingredients
        for (const ing of recipe.ingredients) {
            let remaining = ing.qty;
            const inv = playerStats.inventory;
            for (let i = inv.length - 1; i >= 0 && remaining > 0; i--) {
                if (inv[i].id === ing.id) {
                    inv.splice(i, 1);
                    remaining--;
                }
            }
        }

        playerStats.addItem(recipe.output);
        soundManager.menuSelect();
        SaveManager.save(playerStats);

        this._feedback = { msg: `Crafted: ${recipe.label}!`, color: '#ffcc44' };
        this.time.delayedCall(2500, () => { this._feedback = null; this._drawDetail(); });

        this._drawList();
        this._drawDetail();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    _countItem(id) {
        return playerStats.inventory.filter(i => i.id === id).length;
    }

    _canCraft(recipe) {
        return recipe.ingredients.every(ing => this._countItem(ing.id) >= ing.qty);
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
