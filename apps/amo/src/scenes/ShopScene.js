import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ITEMS, MERCHANT_CATALOG, CATALOGS } from '../data/items.js';
import { itemCurrency, shopPrice, recordSale, BUYBACK_MAX } from '../data/economy.js';
import { GamepadNav } from '../systems/GamepadNav.js';
import { craftRank } from '../data/stations.js';
import { upgradeLabel } from '../data/upgrades.js';
import { SaveManager } from '../systems/SaveManager.js';

// Session-persistent buyback list (cleared on page reload, not on shop re-open):
// your last 10 sales, repurchasable at the price and in the currency you sold for.
const _buyback = [];

const BIAS_META = {
    rural:    { label: 'Rural Region',    hint: 'Gold goods 20% off',  color: '#aacc55' },
    outskirt: { label: 'Outskirt Region', hint: 'Glint goods 20% off', color: '#aa66ff' },
    neutral:  { label: 'Trading Post',    hint: 'Standard prices',     color: '#556677' },
};
const CUR = {
    gold:  { tag: 'gp', name: 'Gold',  color: '#ddaa33', bright: '#ffee44' },
    glint: { tag: 'gl', name: 'Glint', color: '#5599cc', bright: '#44eeff' },
};

export default class ShopScene extends Phaser.Scene {
    constructor() { super('ShopScene'); }

    init(data) {
        this._currencyBias = data?.currencyBias ?? 'neutral';
        this._shopName     = data?.shopName ?? "SILVARA'S TRADING POST";
        this._entries      = CATALOGS[data?.catalog] ?? MERCHANT_CATALOG;
    }

    // Arcane goods for glint, mundane goods for gold; a few are rank-gated (recipe scrolls).
    _catalog() {
        const known = new Set(playerStats.knownRecipes ?? []);
        return this._entries.filter(e => {
            if (!ITEMS[e.id]) return false;
            if (e.id.startsWith('recipe_') && known.has(e.id.slice('recipe_'.length))) return false;
            return !e.requires || craftRank(playerStats.craftCounts?.[e.requires.kind] ?? 0) >= e.requires.rank;
        });
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        const bias = BIAS_META[this._currencyBias] ?? BIAS_META.neutral;

        this.add.rectangle(0, 0, w, h, 0x04030e, 0.97).setOrigin(0);

        this.add.rectangle(0, 0, w, 44, 0x110826, 1).setOrigin(0);
        this.add.text(12, 8, this._shopName, {
            font: 'bold 20px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 2
        });

        this.add.text(w / 2, 4, bias.label, { font: 'bold 14px monospace', fill: bias.color }).setOrigin(0.5, 0);
        this.add.text(w / 2, 24, bias.hint, { font: '12px monospace', fill: bias.color }).setOrigin(0.5, 0);

        this._goldText  = this.add.text(w - 155, 10, '', { font: '16px monospace', fill: CUR.gold.color }).setOrigin(1, 0);
        this._glintText = this.add.text(w - 52, 10, '', { font: '16px monospace', fill: '#77ccff' }).setOrigin(1, 0);
        this._refreshBalances();

        this.add.text(w - 12, 8, '✕', {
            font: 'bold 28px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());

        const DIV    = Math.floor(w * 0.48);
        const BODY_Y = 48;
        const FOOT_H = 100;
        const LIST_Y = BODY_Y + 28;
        const ROW_H  = 28;
        const BOT_Y  = h - FOOT_H;

        this._DIV = DIV; this._LIST_Y = LIST_Y; this._ROW_H = ROW_H; this._BOT_Y = BOT_Y;

        this.add.text(8, BODY_Y + 2, '[BUY]',  { font: 'bold 18px monospace', fill: '#88bbff' });
        this.add.text(DIV + 8, BODY_Y + 2, '[SELL]', { font: 'bold 18px monospace', fill: '#88ffcc' });

        const dg = this.add.graphics();
        dg.lineStyle(2, 0x222244, 0.9);
        dg.lineBetween(DIV, BODY_Y, DIV, BOT_Y);

        this._descText = this.add.text(DIV + 8, BOT_Y - 44, '', {
            font: '14px monospace', fill: '#7788aa', wordWrap: { width: w - DIV - 16 }
        });

        this._buyRows = [];
        this._buyScroll = 0;
        this._drawBuyPanel();

        this._sellRows = [];
        this._drawSellPanel();

        this.add.rectangle(0, BOT_Y, w, FOOT_H, 0x08060e, 1).setOrigin(0);
        this.add.text(8, BOT_Y + 8, 'BUYBACK:', { font: '16px monospace', fill: '#445566' });
        this._bbObjs = [];
        this._drawBuyback();

        this.add.text(w / 2, h - 4, '[ESC] Close Shop', { font: '14px monospace', fill: '#334455' }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.on('wheel', (p, _o, _dx, dy) => { if (p.x < DIV) this._scrollBuy(dy > 0 ? 1 : -1); });
        // Arrow keys and a touch drag scroll the buy list too (it outgrows the screen)
        this.input.keyboard.on('keydown-UP',   () => this._scrollBuy(-1));
        this.input.keyboard.on('keydown-DOWN', () => this._scrollBuy(1));
        let dragY = null, dragAcc = 0;
        this.input.on('pointerdown', p => { dragY = p.x < DIV ? p.y : null; dragAcc = 0; });
        this.input.on('pointermove', p => {
            if (dragY === null || !p.isDown) return;
            dragAcc += dragY - p.y; dragY = p.y;
            while (Math.abs(dragAcc) >= ROW_H) {
                this._scrollBuy(dragAcc > 0 ? 1 : -1);
                dragAcc += dragAcc > 0 ? -ROW_H : ROW_H;
            }
        });
        this.input.on('pointerup', () => { dragY = null; });
        this._gpNav = new GamepadNav(this);
    }

    update(time, delta) {
        const gp = this._gpNav.poll(delta);
        if (!gp) return;
        if (gp.B || gp.start) this._close();
    }

    _refreshBalances() {
        this._goldText.setText(`gp: ${playerStats.gold ?? 0}`);
        this._glintText.setText(`gl: ${playerStats.glint ?? 0}`);
    }

    _scrollBuy(d) {
        const perPage = Math.floor((this._BOT_Y - 48 - this._LIST_Y) / this._ROW_H);
        const max = Math.max(0, this._catalog().length - perPage);
        this._buyScroll = Phaser.Math.Clamp(this._buyScroll + d, 0, max);
        this._drawBuyPanel();
    }

    _drawBuyPanel() {
        this._buyRows.forEach(o => o.destroy());
        this._buyRows = [];
        const { _LIST_Y: lY, _ROW_H: rH, _DIV: dv, _BOT_Y: bY } = this;
        const favoured = { rural: 'gold', outskirt: 'glint' }[this._currencyBias];

        this._catalog().slice(this._buyScroll).forEach((entry, i) => {
            const def = ITEMS[entry.id];
            const y = lY + i * rH;
            if (y + rH > bY - 48) return;

            const cur = CUR[entry.currency];
            const price = shopPrice(entry, this._currencyBias);
            const col = favoured === entry.currency ? cur.bright : cur.color;

            const bg  = this.add.rectangle(0, y, dv, rH, 0x000000, 0).setOrigin(0).setInteractive();
            const nm  = this.add.text(10, y + 5, def.name, { font: '15px monospace', fill: `#${(def.color ?? 0x9999cc).toString(16).padStart(6, '0')}` });
            const pr  = this.add.text(dv - 6, y + 5, `[${price}${cur.tag}]`, { font: '13px monospace', fill: col }).setOrigin(1, 0).setInteractive();
            pr.on('pointerdown', () => this._buy(entry, price, nm));
            pr.on('pointerover', () => pr.setStyle({ fill: '#ffffff' }));
            pr.on('pointerout',  () => pr.setStyle({ fill: col }));
            bg.on('pointerover', () => { bg.setFillStyle(0x110e2a, 0.85); this._descText.setText(def.description); });
            bg.on('pointerout',  () => { bg.setFillStyle(0x000000, 0); this._descText.setText(''); });
            this._buyRows.push(bg, nm, pr);
        });
    }

    _drawSellPanel() {
        this._sellRows.forEach(o => o.forEach(x => x.destroy()));
        this._sellRows = [];

        const { _LIST_Y: lY, _ROW_H: rH, _DIV: dv, _BOT_Y: bY } = this;
        const panW = this.scale.width - dv - 2;

        const sellable = playerStats.inventory.filter(i => (ITEMS[i.id]?.sellPrice ?? 0) > 0);
        sellable.forEach((item, i) => {
            const def = ITEMS[item.id];
            const y = lY + i * rH;
            if (y + rH > bY - 48) return;

            const x0  = dv + 4;
            const col = `#${(def.color ?? 0x8888ff).toString(16).padStart(6, '0')}`;
            const qty = item.stackable && item.qty > 1 ? ` ×${item.qty}` : '';
            const cur = itemCurrency(item.id);

            const bg = this.add.rectangle(x0, y, panW, rH, 0x000000, 0).setOrigin(0).setInteractive();
            const nm = this.add.text(x0 + 8, y + 5, `${upgradeLabel(def.name, playerStats.upgradeLevel?.(item.id) ?? 0)}${qty}`, { font: '15px monospace', fill: col });
            const sp = def.sellPrice ?? 0;
            const pr = this.add.text(this.scale.width - 8, y + 5, `${sp}${CUR[cur].tag}`, {
                font: '14px monospace', fill: CUR[cur].color
            }).setOrigin(1, 0);

            bg.on('pointerover', () => { bg.setFillStyle(0x0a1a0a, 0.85); this._descText.setText(def.description); });
            bg.on('pointerout',  () => { bg.setFillStyle(0x000000, 0); this._descText.setText(''); });
            bg.on('pointerdown', () => this._sell(item.id));

            this._sellRows.push([bg, nm, pr]);
        });
    }

    // Two rows of five: the last 10 sales, newest first.
    _drawBuyback() {
        this._bbObjs.forEach(o => o.destroy());
        this._bbObjs = [];

        const startX = 110, perRow = BUYBACK_MAX / 2;
        const slotW  = Math.floor((this.scale.width - startX - 12) / perRow) - 4;

        _buyback.slice(0, BUYBACK_MAX).forEach((entry, i) => {
            const def = ITEMS[entry.id];
            if (!def) return;
            const x  = startX + (i % perRow) * (slotW + 4);
            const y  = this._BOT_Y + 6 + Math.floor(i / perRow) * 40;
            const bg = this.add.rectangle(x, y, slotW, 36, 0x0d1020, 0.9).setOrigin(0).setInteractive();
            const txt = this.add.text(x + 6, y + 9, `${def.name.substring(0, 12)} ${entry.price}${CUR[entry.currency].tag}`, {
                font: '13px monospace', fill: '#8899aa'
            });
            bg.on('pointerover', () => bg.setFillStyle(0x1a2240, 0.95));
            bg.on('pointerout',  () => bg.setFillStyle(0x0d1020, 0.9));
            bg.on('pointerdown', () => {
                if ((playerStats[entry.currency] ?? 0) < entry.price) { this._descText.setText(`Not enough ${CUR[entry.currency].name}!`); return; }
                if (!playerStats.addItem(entry.id)) { this._descText.setText('Inventory full!'); return; }
                playerStats[entry.currency] -= entry.price;
                _buyback.splice(i, 1);
                this._refreshBalances();
                this._drawSellPanel();
                this._drawBuyback();
            });
            this._bbObjs.push(bg, txt);
        });
    }

    _buy(entry, price, nameText) {
        const cur = entry.currency;
        if ((playerStats[cur] ?? 0) < price) { this._descText.setText(`Not enough ${CUR[cur].name}!`); return; }
        if (!playerStats.addItem(entry.id)) { this._descText.setText('Inventory full!'); return; }
        playerStats[cur] = (playerStats[cur] ?? 0) - price;
        this._refreshBalances();

        const prevFill = nameText.style.color;
        nameText.setStyle({ fill: CUR[cur].bright });
        this.time.delayedCall(280, () => { if (nameText.active) nameText.setStyle({ fill: prevFill }); });
        this._drawSellPanel();
    }

    // Selling pays in the item's own currency.
    _sell(itemId) {
        const def = ITEMS[itemId];
        if (!def) return;
        const cur = itemCurrency(itemId), price = def.sellPrice ?? 0;
        playerStats[cur] = (playerStats[cur] ?? 0) + price;
        recordSale(_buyback, { id: itemId, price, currency: cur });
        playerStats.removeItem(itemId, 1);
        this._refreshBalances();
        this._drawSellPanel();
        this._drawBuyback();
    }

    _close() {
        SaveManager.save(playerStats);
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
