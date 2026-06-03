import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ITEMS, COOKING_RECIPES, POTION_RECIPES } from '../data/items.js';
import { soundManager } from '../systems/SoundManager.js';
import { SaveManager } from '../systems/SaveManager.js';
import { questManager } from '../systems/QuestManager.js';
import { MenuFocus } from '../systems/MenuFocus.js';

const TABS = ['REST', 'COOK', 'BREW'];
const TAB_KEYS = ['ONE', 'TWO', 'THREE'];

export default class CampfireScene extends Phaser.Scene {
    constructor() { super('CampfireScene'); }

    init(data) {
        this._onClose = data?.onClose ?? null;
        this._tab = 0;
    }

    create() {
        const w = this.scale.width, h = this.scale.height;
        this._px = 64; this._py = 28;
        this._pw = w - 128; this._ph = h - 56;
        const { _px: px, _py: py, _pw: pw, _ph: ph } = this;

        this.add.rectangle(0, 0, w, h, 0x000000, 0.82).setOrigin(0);
        this.add.rectangle(px, py, pw, ph, 0x0a0800).setOrigin(0);
        this._border = this.add.graphics();
        this._border.lineStyle(4, 0xcc6622);
        this._border.strokeRect(px, py, pw, ph);

        this.add.text(w / 2, py + 16, 'CAMPFIRE', {
            font: 'bold 24px monospace', fill: '#ff9944'
        }).setOrigin(0.5, 0);

        // Tab bar
        const tabY = py + 48;
        const tabW = Math.floor(pw / TABS.length);
        this._tabBtns = [];
        TABS.forEach((label, i) => {
            const tx = px + i * tabW;
            const bg = this.add.rectangle(tx, tabY, tabW, 32, 0x110900).setOrigin(0);
            const txt = this.add.text(tx + tabW / 2, tabY + 16, label, {
                font: 'bold 16px monospace', fill: '#664422'
            }).setOrigin(0.5);
            bg.setInteractive();
            bg.on('pointerdown', () => this._switchTab(i));
            bg.on('pointerover', () => { if (this._tab !== i) bg.setFillStyle(0x1a0e00); });
            bg.on('pointerout',  () => { if (this._tab !== i) bg.setFillStyle(0x110900); });
            this._tabBtns.push({ bg, txt });
        });
        this._divY = tabY + 36;

        const divG = this.add.graphics();
        divG.lineStyle(2, 0x442200);
        divG.lineBetween(px + 8, this._divY, px + pw - 8, this._divY);

        this._contentY = this._divY + 12;
        this._contentObjs = [];
        this._feedback = null;

        this.add.text(w / 2, py + ph - 16, '[1] REST  [2] COOK  [3] BREW  [ESC] Close', {
            font: '14px monospace', fill: '#443322'
        }).setOrigin(0.5, 1);

        // Gamepad: LB/RB switch tabs, dpad cycles options, A activates, B closes.
        this._focus = new MenuFocus(this, { onBack: () => this._close() });
        this._switchTab(0);

        this.input.keyboard.on('keydown-ESC',   () => this._close());
        this.input.keyboard.on('keydown-ONE',   () => this._switchTab(0));
        this.add.text(w - 12, 8, '✕', {
            font: 'bold 28px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());
        this.input.keyboard.on('keydown-TWO',   () => this._switchTab(1));
        this.input.keyboard.on('keydown-THREE', () => this._switchTab(2));
        this.input.keyboard.on('keydown-Q',     () => { if (this._tab === 0) this._quickRest(); });
        this.input.keyboard.on('keydown-F',     () => { if (this._tab === 0 && playerStats.inventory.some(i => i.id === 'tent')) this._fullRest(); });
    }

    _switchTab(idx) {
        this._tab = idx;
        this._tabBtns.forEach(({ bg, txt }, i) => {
            const active = i === idx;
            bg.setFillStyle(active ? 0x2a1400 : 0x110900);
            txt.setStyle({ fill: active ? '#ffaa44' : '#664422' });
        });
        this._clearContent();
        if (idx === 0) this._drawRest();
        if (idx === 1) this._drawRecipes('cook');
        if (idx === 2) this._drawRecipes('brew');
        this._focus?.setItems(this._contentFocus, { cols: 1 });
    }

    _clearContent() {
        this._contentObjs.forEach(o => o?.destroy?.());
        this._contentObjs = [];
        this._contentFocus = [];   // gamepad focus targets for the active tab
        this._feedback?.destroy();
        this._feedback = null;
    }

    update(time, delta) {
        const gp = this._focus?.poll(delta);
        if (!gp) return;
        if (gp.RB) this._switchTab((this._tab + 1) % TABS.length);
        if (gp.LB) this._switchTab((this._tab - 1 + TABS.length) % TABS.length);
    }

    _track(o) { this._contentObjs.push(o); return o; }

    // ── REST tab ──────────────────────────────────────────────────────────────

    _drawRest() {
        const px = this._px, pw = this._pw;
        let oy = this._contentY + 8;
        const hasTent = playerStats.inventory.some(i => i.id === 'tent');

        const qrBtn = this._track(this.add.text(px + 20, oy, '[Q]  Quick Rest — +30% HP & MP', {
            font: '18px monospace', fill: '#cc8844'
        }).setInteractive());
        qrBtn.on('pointerover', () => qrBtn.setStyle({ fill: '#ffffff' }));
        qrBtn.on('pointerout',  () => qrBtn.setStyle({ fill: '#cc8844' }));
        qrBtn.on('pointerdown', () => this._quickRest());
        this._contentFocus.push({ obj: qrBtn, activate: () => this._quickRest() });
        oy += 40;

        const frCol = hasTent ? '#ffcc44' : '#443322';
        const frTxt = hasTent ? '[F]  Full Rest — consume Tent' : '[F]  Full Rest — no tent in pack';
        const frBtn = this._track(this.add.text(px + 20, oy, frTxt, {
            font: '18px monospace', fill: frCol
        }).setInteractive());
        frBtn.on('pointerover', () => frBtn.setStyle({ fill: hasTent ? '#ffffff' : frCol }));
        frBtn.on('pointerout',  () => frBtn.setStyle({ fill: frCol }));
        frBtn.on('pointerdown', () => { if (hasTent) this._fullRest(); });
        if (hasTent) this._contentFocus.push({ obj: frBtn, activate: () => this._fullRest() });
    }

    // ── COOK / BREW shared recipe renderer ───────────────────────────────────

    _drawRecipes(mode) {
        const px = this._px, pw = this._pw;
        const recipes = mode === 'cook' ? COOKING_RECIPES : POTION_RECIPES;
        let oy = this._contentY + 4;
        let any = false;

        for (const recipe of recipes) {
            const canMake = this._canMake(recipe);
            const hasAny  = this._recipeHasAny(recipe);
            if (!canMake && !hasAny) continue;
            any = true;

            const rowCol = canMake ? 0x1a1000 : 0x0d0800;
            const txtCol = canMake ? '#ddaa55' : '#443322';

            this._track(this.add.rectangle(px + 16, oy, pw - 32, 40, rowCol).setOrigin(0));
            this._track(this.add.graphics()).lineStyle(2, canMake ? 0x886622 : 0x221500)
                .strokeRect(px + 16, oy, pw - 32, 40);

            // Ingredient list
            let ingStr;
            if (recipe.multi) {
                ingStr = recipe.input.map(id => {
                    const name = ITEMS[id]?.name ?? id.replace(/_/g, ' ');
                    return `${name}×1(${this._countItem(id)})`;
                }).join('  ');
            } else if (recipe.ingredients) {
                ingStr = recipe.ingredients.map(ing => {
                    const name = ITEMS[ing.id]?.name ?? ing.id.replace(/_/g, ' ');
                    return `${name}×${ing.qty}(${this._countItem(ing.id)})`;
                }).join('  ');
            } else {
                const name = ITEMS[recipe.input]?.name ?? recipe.input.replace(/_/g, ' ');
                ingStr = `${name}×1(${this._countItem(recipe.input)})`;
            }

            this._track(this.add.text(px + 28, oy + 8, `${recipe.label}`, {
                font: 'bold 16px monospace', fill: txtCol
            }));
            this._track(this.add.text(px + 28, oy + 26, ingStr, {
                font: '12px monospace', fill: '#554433'
            }));

            if (canMake) {
                const verb = mode === 'cook' ? '[COOK]' : '[BREW]';
                const btn = this._track(this.add.text(px + pw - 32, oy + 20, verb, {
                    font: 'bold 14px monospace', fill: '#ffcc00'
                }).setOrigin(1, 0.5).setInteractive());
                btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
                btn.on('pointerout',  () => btn.setStyle({ fill: '#ffcc00' }));
                btn.on('pointerdown', () => this._make(recipe, mode));
                this._contentFocus.push({ obj: btn, activate: () => this._make(recipe, mode) });
            }

            oy += 48;
        }

        if (!any) {
            const hint = mode === 'cook'
                ? 'No meat — hunt wildlife for ingredients.'
                : 'No ingredients — gather materials and buy empty bottles.';
            this._track(this.add.text(px + 20, oy + 12, hint, {
                font: '16px monospace', fill: '#443322'
            }));
        }
    }

    _canMake(recipe) {
        if (recipe.multi)        return Array.isArray(recipe.input) && recipe.input.every(id => this._countItem(id) >= 1);
        if (recipe.ingredients)  return recipe.ingredients.every(ing => this._countItem(ing.id) >= ing.qty);
        return this._countItem(recipe.input) >= 1;
    }

    _recipeHasAny(recipe) {
        if (recipe.multi)        return Array.isArray(recipe.input) && recipe.input.some(id => this._countItem(id) > 0);
        if (recipe.ingredients)  return recipe.ingredients.some(ing => this._countItem(ing.id) > 0);
        return this._countItem(recipe.input) > 0;
    }

    _countItem(id) {
        return playerStats.inventory.filter(i => i.id === id).length;
    }

    _make(recipe, mode) {
        if (!this._canMake(recipe)) return;

        if (recipe.multi) {
            recipe.input.forEach(id => {
                const idx = playerStats.inventory.findIndex(i => i.id === id);
                if (idx !== -1) playerStats.inventory.splice(idx, 1);
            });
        } else if (recipe.ingredients) {
            recipe.ingredients.forEach(ing => {
                let rem = ing.qty;
                const inv = playerStats.inventory;
                for (let i = inv.length - 1; i >= 0 && rem > 0; i--) {
                    if (inv[i].id === ing.id) { inv.splice(i, 1); rem--; }
                }
            });
        } else {
            const idx = playerStats.inventory.findIndex(i => i.id === recipe.input);
            if (idx !== -1) playerStats.inventory.splice(idx, 1);
        }

        playerStats.addItem(recipe.output);
        if (mode === 'cook') questManager.onCook(recipe.output);
        soundManager.collect();
        SaveManager.save(playerStats);
        this._showFeedback(`${mode === 'cook' ? 'Cooked' : 'Brewed'}: ${recipe.label}!`, '#ffcc44');
        this._switchTab(this._tab);
    }

    // ── REST actions ──────────────────────────────────────────────────────────

    _quickRest() {
        const healHp = Math.ceil(playerStats.maxHealth * 0.30);
        const healMp = Math.ceil(playerStats.maxMana  * 0.30);
        if (playerStats.health >= playerStats.maxHealth && playerStats.mana >= playerStats.maxMana) {
            this._showFeedback('Already at full strength.', '#886644'); return;
        }
        playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + healHp);
        playerStats.mana   = Math.min(playerStats.maxMana,   playerStats.mana   + healMp);
        soundManager.collect();
        SaveManager.save(playerStats);
        this._showFeedback(`Rested.  +${healHp} HP   +${healMp} MP`, '#cc8844');
    }

    _fullRest() {
        const tentIdx = playerStats.inventory.findIndex(i => i.id === 'tent');
        if (tentIdx === -1) return;
        playerStats.inventory.splice(tentIdx, 1);
        playerStats.health = playerStats.maxHealth;
        playerStats.mana   = playerStats.maxMana;
        playerStats.manaExhausted = false;
        playerStats.manaCollapsed = false;
        playerStats._exhaustionTimer = 0;
        playerStats.gainXp(50);
        soundManager.collect();
        SaveManager.save(playerStats);
        this._showFeedback('Full rest complete. HP & MP restored. +50 XP', '#ffcc44');
        this._switchTab(0);
    }

    // ── Shared ────────────────────────────────────────────────────────────────

    _showFeedback(msg, color) {
        this._feedback?.destroy();
        const w = this.scale.width, h = this.scale.height;
        this._feedback = this.add.text(w / 2, this._py + this._ph - 28, msg, {
            font: '16px monospace', fill: color
        }).setOrigin(0.5, 1).setDepth(100);
        this.time.delayedCall(2400, () => { this._feedback?.destroy(); this._feedback = null; });
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
        this._onClose?.();
    }
}
