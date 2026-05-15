import Phaser from 'phaser';
import { playerStats } from '../systems/PlayerStats.js';
import { ITEMS, MERCHANT_CATALOG } from '../data/items.js';

// Session-persistent buyback list (cleared on page reload, not on shop re-open)
let _buyback = [];

export default class ShopScene extends Phaser.Scene {
    constructor() { super('ShopScene'); }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        // Background
        this.add.rectangle(0, 0, w, h, 0x04030e, 0.97).setOrigin(0);

        // Header bar
        this.add.rectangle(0, 0, w, 22, 0x110826, 1).setOrigin(0);
        this.add.text(6, 4, "SILVARA'S TRADING POST", {
            font: 'bold 11px monospace', fill: '#ffd700', stroke: '#000', strokeThickness: 1
        });
        this._glintText = this.add.text(w - 6, 4, `${playerStats.glint} gl`, {
            font: '10px monospace', fill: '#ffcc44'
        }).setOrigin(1, 0);

        // Layout constants
        const DIV   = 228;
        const BODY_Y = 24;
        const FOOT_H = 44;
        const LIST_Y = BODY_Y + 14;
        const ROW_H  = 13;
        const BOT_Y  = h - FOOT_H;

        this._DIV   = DIV;
        this._LIST_Y = LIST_Y;
        this._ROW_H  = ROW_H;
        this._BOT_Y  = BOT_Y;

        // Panel labels
        this.add.text(4, BODY_Y + 1, '[BUY]', { font: 'bold 9px monospace', fill: '#88bbff' });
        this.add.text(DIV + 4, BODY_Y + 1, '[SELL]', { font: 'bold 9px monospace', fill: '#88ffcc' });

        // Divider
        const dg = this.add.graphics();
        dg.lineStyle(1, 0x222244, 0.9);
        dg.lineBetween(DIV, BODY_Y, DIV, BOT_Y);

        // Description text (shared hover area, right-panel bottom)
        this._descText = this.add.text(DIV + 4, BOT_Y - 22, '', {
            font: '7px monospace', fill: '#7788aa',
            wordWrap: { width: w - DIV - 8 }
        });

        // Buy panel — static, from MERCHANT_CATALOG
        this._drawBuyPanel();

        // Sell panel — dynamic, from player inventory
        this._sellRows = [];
        this._drawSellPanel();

        // Buyback strip
        this.add.rectangle(0, BOT_Y, w, FOOT_H, 0x08060e, 1).setOrigin(0);
        this.add.text(4, BOT_Y + 4, 'BUYBACK:', { font: '8px monospace', fill: '#445566' });
        this._bbObjs = [];
        this._drawBuyback();

        // Footer close hint
        this.add.text(w / 2, h - 8, '[ESC] Close Shop', {
            font: '7px monospace', fill: '#334455'
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.add.text(w - 6, 4, '✕', { font: 'bold 14px monospace', fill: '#aa4444', stroke: '#000000', strokeThickness: 2 }).setOrigin(1, 0).setInteractive().setDepth(50).on('pointerdown', () => this._close());
    }

    _drawBuyPanel() {
        const { _LIST_Y: lY, _ROW_H: rH, _DIV: dv, _BOT_Y: bY } = this;

        MERCHANT_CATALOG.forEach((entry, i) => {
            const def = ITEMS[entry.id];
            if (!def) return;
            const y = lY + i * rH;
            if (y + rH > bY - 24) return;

            const bg = this.add.rectangle(0, y, dv, rH, 0x000000, 0).setOrigin(0).setInteractive();
            const col = `#${(def.color ?? 0x9999cc).toString(16).padStart(6, '0')}`;
            const nm  = this.add.text(5, y + 1, def.name, { font: '8px monospace', fill: col });
            const pr  = this.add.text(dv - 4, y + 1, `${entry.price}gl`, {
                font: '8px monospace', fill: '#ffcc44'
            }).setOrigin(1, 0);

            bg.on('pointerover', () => {
                bg.setFillStyle(0x110e2a, 0.85);
                this._descText.setText(def.description);
            });
            bg.on('pointerout', () => {
                bg.setFillStyle(0x000000, 0);
                this._descText.setText('');
            });
            bg.on('pointerdown', () => this._buy(entry.id, entry.price, nm));
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
            if (y + rH > bY - 24) return;

            const x0  = dv + 2;
            const col = `#${(def.color ?? 0x8888ff).toString(16).padStart(6, '0')}`;
            const qty = item.stackable && item.qty > 1 ? ` ×${item.qty}` : '';

            const bg = this.add.rectangle(x0, y, panW, rH, 0x000000, 0).setOrigin(0).setInteractive();
            const nm = this.add.text(x0 + 4, y + 1, `${def.name}${qty}`, { font: '8px monospace', fill: col });
            const sp = def.sellPrice ?? 0;
            const pr = this.add.text(this.scale.width - 4, y + 1, `${sp}gl`, {
                font: '8px monospace', fill: '#aaccaa'
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

        const startX = 68;
        const bbY = this._BOT_Y + 4;

        _buyback.slice(0, 5).forEach((entry, i) => {
            const def = ITEMS[entry.id];
            if (!def) return;
            const x = startX + i * 80;
            const bg = this.add.rectangle(x, bbY, 76, 18, 0x0d1020, 0.9).setOrigin(0).setInteractive();
            const label = `${def.name.substring(0, 9)} ${entry.price}gl`;
            const txt = this.add.text(x + 3, bbY + 4, label, { font: '7px monospace', fill: '#8899aa' });
            bg.on('pointerover', () => bg.setFillStyle(0x1a2240, 0.95));
            bg.on('pointerout',  () => bg.setFillStyle(0x0d1020, 0.9));
            bg.on('pointerdown', () => {
                if (playerStats.glint < entry.price) { this._descText.setText('Not enough Glint!'); return; }
                if (!playerStats.addItem(entry.id))  { this._descText.setText('Inventory full!');   return; }
                playerStats.glint -= entry.price;
                _buyback.splice(i, 1);
                this._glintText.setText(`${playerStats.glint} gl`);
                this._drawSellPanel();
                this._drawBuyback();
            });
            this._bbObjs.push(bg, txt);
        });
    }

    _buy(itemId, price, nameText) {
        if (playerStats.glint < price)    { this._descText.setText('Not enough Glint!'); return; }
        if (!playerStats.addItem(itemId)) { this._descText.setText('Inventory full!');   return; }
        playerStats.glint -= price;
        this._glintText.setText(`${playerStats.glint} gl`);
        const prevFill = nameText.style.color;
        nameText.setStyle({ fill: '#00ff88' });
        this.time.delayedCall(280, () => { if (nameText.active) nameText.setStyle({ fill: prevFill }); });
        this._drawSellPanel();
    }

    _sell(itemId, sellPrice) {
        const def = ITEMS[itemId];
        if (!def) return;
        playerStats.glint += sellPrice;
        _buyback.unshift({ id: itemId, price: sellPrice });
        if (_buyback.length > 5) _buyback.pop();
        playerStats.removeItem(itemId, 1);
        this._glintText.setText(`${playerStats.glint} gl`);
        this._drawSellPanel();
        this._drawBuyback();
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
