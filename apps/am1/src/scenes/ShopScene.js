import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ITEMS, MERCHANT_CATALOG } from '../data/items.js';

// Session-persistent buyback list (cleared on page reload, not on shop re-open)
let _buyback = [];

const BIAS_META = {
    rural:    { label: 'Rural Region',    hint: 'Gold favored',    color: '#aacc55' },
    outskirt: { label: 'Outskirt Region', hint: 'Glint favored',   color: '#aa66ff' },
    neutral:  { label: 'Trading Post',    hint: 'Standard prices', color: '#556677' },
};

export default class ShopScene extends Phaser.Scene {
    constructor() { super('ShopScene'); }

    init(data) {
        this._currencyBias = data?.currencyBias ?? 'neutral';
    }

    // Effective price after regional discount (20% off favored currency)
    _effPrice(entry, currency) {
        let price = currency === 'glint'
            ? (entry.price)
            : (entry.goldPrice ?? Math.round(entry.price * 1.2));
        if (currency === 'glint'  && this._currencyBias === 'outskirt') price = Math.round(price * 0.8);
        if (currency === 'gold'   && this._currencyBias === 'rural')    price = Math.round(price * 0.8);
        return price;
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;
        const bias = BIAS_META[this._currencyBias] ?? BIAS_META.neutral;

        // Background
        this.add.rectangle(0, 0, w, h, 0x04030e, 0.97).setOrigin(0);

        // Header bar
        this.add.rectangle(0, 0, w, 44, 0x110826, 1).setOrigin(0);
        this.add.text(12, 8, "SILVARA'S TRADING POST", {
            font: 'bold 20px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 2
        });

        // Region label (centre)
        this.add.text(w / 2, 4, bias.label, {
            font: 'bold 14px monospace', fill: bias.color
        }).setOrigin(0.5, 0);
        this.add.text(w / 2, 24, bias.hint, {
            font: '12px monospace', fill: bias.color, alpha: 0.7
        }).setOrigin(0.5, 0);

        // Currency balances (right side)
        this._goldText  = this.add.text(w - 155, 10, `gp: ${playerStats.gold ?? 0}`, {
            font: '16px monospace', fill: '#ddaa33'
        }).setOrigin(1, 0);
        this._glintText = this.add.text(w - 52, 10, `gl: ${playerStats.glint}`, {
            font: '16px monospace', fill: '#77ccff'
        }).setOrigin(1, 0);

        // ✕ close button
        this.add.text(w - 12, 8, '✕', {
            font: 'bold 28px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2
        }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());

        // Layout constants
        const DIV    = Math.floor(w * 0.48);
        const BODY_Y = 48;
        const FOOT_H = 88;
        const LIST_Y = BODY_Y + 28;
        const ROW_H  = 28;
        const BOT_Y  = h - FOOT_H;

        this._DIV    = DIV;
        this._LIST_Y = LIST_Y;
        this._ROW_H  = ROW_H;
        this._BOT_Y  = BOT_Y;

        // Panel labels
        this.add.text(8, BODY_Y + 2, '[BUY]',  { font: 'bold 18px monospace', fill: '#88bbff' });
        this.add.text(DIV + 8, BODY_Y + 2, '[SELL]', { font: 'bold 18px monospace', fill: '#88ffcc' });

        // Column headers for the buy panel
        const glintFav = this._currencyBias === 'outskirt';
        const goldFav  = this._currencyBias === 'rural';
        this.add.text(DIV - 96, BODY_Y + 4, 'GL', {
            font: `bold 12px monospace`,
            fill: glintFav ? '#44eeff' : '#445566'
        }).setOrigin(0.5, 0);
        this.add.text(DIV - 18, BODY_Y + 4, 'GP', {
            font: `bold 12px monospace`,
            fill: goldFav ? '#ffee44' : '#443322'
        }).setOrigin(0.5, 0);

        // Divider
        const dg = this.add.graphics();
        dg.lineStyle(2, 0x222244, 0.9);
        dg.lineBetween(DIV, BODY_Y, DIV, BOT_Y);

        // Description text (right-panel bottom)
        this._descText = this.add.text(DIV + 8, BOT_Y - 44, '', {
            font: '14px monospace', fill: '#7788aa',
            wordWrap: { width: w - DIV - 16 }
        });

        this._drawBuyPanel();

        this._sellRows = [];
        this._drawSellPanel();

        // Buyback strip
        this.add.rectangle(0, BOT_Y, w, FOOT_H, 0x08060e, 1).setOrigin(0);
        this.add.text(8, BOT_Y + 8, 'BUYBACK:', { font: '16px monospace', fill: '#445566' });
        this._bbObjs = [];
        this._drawBuyback();

        // Footer close hint
        this.add.text(w / 2, h - 10, '[ESC] Close Shop', {
            font: '14px monospace', fill: '#334455'
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._close());
    }

    _drawBuyPanel() {
        const { _LIST_Y: lY, _ROW_H: rH, _DIV: dv, _BOT_Y: bY } = this;
        const glintFav = this._currencyBias === 'outskirt';
        const goldFav  = this._currencyBias === 'rural';
        const glintCol = glintFav ? '#44eeff' : '#5588aa';
        const goldCol  = goldFav  ? '#ffee44' : '#997722';

        MERCHANT_CATALOG.forEach((entry, i) => {
            const def = ITEMS[entry.id];
            if (!def) return;
            const y = lY + i * rH;
            if (y + rH > bY - 48) return;

            const glintP = this._effPrice(entry, 'glint');
            const goldP  = this._effPrice(entry, 'gold');

            const bg  = this.add.rectangle(0, y, dv, rH, 0x000000, 0).setOrigin(0).setInteractive();
            const col = `#${(def.color ?? 0x9999cc).toString(16).padStart(6, '0')}`;
            const nm  = this.add.text(10, y + 5, def.name, { font: '15px monospace', fill: col });

            // Glint price button
            const glintTxt = this.add.text(dv - 80, y + 5, `[${glintP}gl]`, {
                font: '13px monospace', fill: glintCol
            }).setOrigin(1, 0).setInteractive();
            glintTxt.on('pointerdown', () => this._buy(entry.id, glintP, 'glint', nm));
            glintTxt.on('pointerover', () => glintTxt.setStyle({ fill: '#ffffff' }));
            glintTxt.on('pointerout',  () => glintTxt.setStyle({ fill: glintCol }));

            // Gold price button
            const goldTxt = this.add.text(dv - 4, y + 5, `[${goldP}gp]`, {
                font: '13px monospace', fill: goldCol
            }).setOrigin(1, 0).setInteractive();
            goldTxt.on('pointerdown', () => this._buy(entry.id, goldP, 'gold', nm));
            goldTxt.on('pointerover', () => goldTxt.setStyle({ fill: '#ffffff' }));
            goldTxt.on('pointerout',  () => goldTxt.setStyle({ fill: goldCol }));

            bg.on('pointerover', () => {
                bg.setFillStyle(0x110e2a, 0.85);
                this._descText.setText(def.description);
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(0x000000, 0);
                this._descText.setText('');
            });
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
            if (!def) return;
            const y = lY + i * rH;
            if (y + rH > bY - 48) return;

            const x0  = dv + 4;
            const col = `#${(def.color ?? 0x8888ff).toString(16).padStart(6, '0')}`;
            const qty = item.stackable && item.qty > 1 ? ` ×${item.qty}` : '';

            const bg = this.add.rectangle(x0, y, panW, rH, 0x000000, 0).setOrigin(0).setInteractive();
            const nm = this.add.text(x0 + 8, y + 5, `${def.name}${qty}`, { font: '15px monospace', fill: col });
            const sp = def.sellPrice ?? 0;
            const pr = this.add.text(this.scale.width - 8, y + 5, `${sp}gl`, {
                font: '14px monospace', fill: '#aaccaa'
            }).setOrigin(1, 0);

            bg.on('pointerover', () => {
                bg.setFillStyle(0x0a1a0a, 0.85);
                this._descText.setText(def.description);
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(0x000000, 0);
                this._descText.setText('');
            });
            bg.on('pointerdown', () => this._sell(item.id, sp));

            this._sellRows.push([bg, nm, pr]);
        });
    }

    _drawBuyback() {
        this._bbObjs.forEach(o => o.destroy());
        this._bbObjs = [];

        const startX  = 140;
        const bbY     = this._BOT_Y + 8;
        const slotW   = Math.floor((this.scale.width - startX - 16) / 4);

        _buyback.slice(0, 4).forEach((entry, i) => {
            const def = ITEMS[entry.id];
            if (!def) return;
            const x   = startX + i * (slotW + 4);
            const bg  = this.add.rectangle(x, bbY, slotW, 36, 0x0d1020, 0.9).setOrigin(0).setInteractive();
            const lbl = `${def.name.substring(0, 9)} ${entry.price}gl`;
            const txt = this.add.text(x + 6, bbY + 8, lbl, { font: '14px monospace', fill: '#8899aa' });
            bg.on('pointerover', () => bg.setFillStyle(0x1a2240, 0.95));
            bg.on('pointerout',  () => bg.setFillStyle(0x0d1020, 0.9));
            bg.on('pointerdown', () => {
                if (playerStats.glint < entry.price) { this._descText.setText('Not enough Glint!'); return; }
                if (!playerStats.addItem(entry.id))  { this._descText.setText('Inventory full!');   return; }
                playerStats.glint -= entry.price;
                _buyback.splice(i, 1);
                this._glintText.setText(`gl: ${playerStats.glint}`);
                this._drawSellPanel();
                this._drawBuyback();
            });
            this._bbObjs.push(bg, txt);
        });
    }

    _buy(itemId, price, currency, nameText) {
        const balance = currency === 'glint' ? playerStats.glint : (playerStats.gold ?? 0);
        if (balance < price) {
            this._descText.setText(`Not enough ${currency === 'glint' ? 'Glint' : 'Gold'}!`);
            return;
        }
        if (!playerStats.addItem(itemId)) { this._descText.setText('Inventory full!'); return; }

        if (currency === 'glint') {
            playerStats.glint -= price;
            this._glintText.setText(`gl: ${playerStats.glint}`);
        } else {
            playerStats.gold = (playerStats.gold ?? 0) - price;
            this._goldText.setText(`gp: ${playerStats.gold}`);
        }

        const prevFill = nameText.style.color;
        nameText.setStyle({ fill: currency === 'glint' ? '#44eeff' : '#ffee44' });
        this.time.delayedCall(280, () => { if (nameText.active) nameText.setStyle({ fill: prevFill }); });
        this._drawSellPanel();
    }

    _sell(itemId, sellPrice) {
        const def = ITEMS[itemId];
        if (!def) return;
        playerStats.glint += sellPrice;
        _buyback.unshift({ id: itemId, price: sellPrice });
        if (_buyback.length > 4) _buyback.pop();
        playerStats.removeItem(itemId, 1);
        this._glintText.setText(`gl: ${playerStats.glint}`);
        this._drawSellPanel();
        this._drawBuyback();
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
