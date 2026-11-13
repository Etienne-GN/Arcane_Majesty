// Shops — amo's ShopScene rules: a merchant's catalogue (items.js MERCHANT_CATALOG or CATALOGS[npc.catalog]),
// filtered as amo does (unknown items, recipes already known, spells/manuals already learned, rank-gated
// entries); prices in gold or glint (economy.itemCurrency), the map's currency bias (economy.shopPrice);
// selling pays the item's own currency at its sellPrice, and the last ten sales can be bought back.
// Merchants sell only while working (amo: "Closed — come back in the morning").
import { items as itemRules, economy as E, stations as St } from '@rules';

const { ITEMS, MERCHANT_CATALOG, CATALOGS, alreadyLearned } = itemRules;
const CUR = { gold: { name: 'gold', mark: '◉', color: '#f3d88b' }, glint: { name: 'glint', mark: '✧', color: '#9ad0ff' } };
const hex = c => `#${(c ?? 0x8855ff).toString(16).padStart(6, '0')}`;

export function createShop({ stats, hud, save }) {
    const css = document.createElement('style');
    css.textContent = `
#shop { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#shop.open { display: grid; }
#shop .panel { width: min(900px, 95vw); max-height: 90vh; overflow: auto; padding: 16px 20px; border: 1px solid #f3d88b66; border-radius: 14px; background: linear-gradient(160deg, #1b1720ee, #0e0c12f2); }
#shop h2 { margin: 0; font-weight: normal; letter-spacing: .16em; color: #f3d88b; font-size: 20px; }
#shop .purse { font-size: 15px; margin: 4px 0 12px; }
#shop .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
#shop h3 { margin: 0 0 6px; font-weight: normal; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#shop .row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin-bottom: 4px; border-radius: 7px; background: #ffffff0a; border: 1px solid #ffffff14; font-size: 13px; cursor: pointer; }
#shop .row:hover { border-color: #f3d88b; }
#shop .row.poor { opacity: .45; }
#shop .row .n { flex: 1; } #shop .row .q { opacity: .6; }
#shop .gem { width: 10px; height: 10px; border-radius: 3px; transform: rotate(45deg); }
#shop .desc { min-height: 34px; margin-top: 10px; font-size: 13px; opacity: .8; }
#shop .close { float: right; font: 13px Georgia, serif; color: #eee6d2; background: transparent; border: 1px solid #eee6d255; border-radius: 7px; padding: 6px 12px; cursor: pointer; }
@media (max-width: 640px) { #shop .cols { grid-template-columns: 1fr; } }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'shop';
    document.body.append(root);
    const buyback = [];
    let open = false, entries = [], title = '', bias = 'neutral', desc = '';
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const price = (amount, cur) => `${amount} ${CUR[cur].mark}`;

    const catalog = () => {
        const known = new Set(stats.knownRecipes ?? []);
        return entries.filter(e => ITEMS[e.id]
            && !(e.id.startsWith('recipe_') && known.has(e.id.slice('recipe_'.length)))
            && !alreadyLearned(e.id, stats)
            && (!e.requires || St.craftRank(stats.craftCounts?.[e.requires.kind] ?? 0) >= e.requires.rank));
    };

    function buy(e) {
        const cost = E.shopPrice(e, bias), cur = e.currency;
        if ((stats[cur] ?? 0) < cost) { desc = `Not enough ${CUR[cur].name}.`; return render(); }
        if (!stats.addItem(e.id, e.qty ?? 1)) { desc = 'Your satchel is full.'; return render(); }
        stats[cur] = (stats[cur] ?? 0) - cost;
        desc = `Bought ${ITEMS[e.id].name}${(e.qty ?? 1) > 1 ? ` ×${e.qty}` : ''}.`;
        render();
    }
    function sell(id) {
        const def = ITEMS[id];
        if (!def?.sellPrice) return;
        const cur = E.itemCurrency(id);
        stats[cur] = (stats[cur] ?? 0) + def.sellPrice;
        E.recordSale(buyback, { id, price: def.sellPrice, currency: cur });
        stats.removeItem(id, 1);
        desc = `Sold ${def.name} for ${price(def.sellPrice, cur)}.`;
        render();
    }
    function rebuy(i) {
        const s = buyback[i];
        if ((stats[s.currency] ?? 0) < s.price) { desc = `Not enough ${CUR[s.currency].name}.`; return render(); }
        if (!stats.addItem(s.id)) { desc = 'Your satchel is full.'; return render(); }
        stats[s.currency] -= s.price;
        buyback.splice(i, 1);
        render();
    }

    function row(id, label, right, poor, onClick, hint) {
        const r = el('div', `row${poor ? ' poor' : ''}`);
        const g = el('span', 'gem'); g.style.background = hex(ITEMS[id]?.color);
        r.append(g, el('span', 'n', label), el('span', 'q', right));
        r.onclick = onClick;
        r.onmouseenter = () => { root.querySelector('.desc').textContent = hint ?? ITEMS[id]?.description ?? ''; };
        return r;
    }

    function render() {
        root.textContent = '';
        const p = el('div', 'panel');
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle();
        const purse = el('div', 'purse');
        for (const c of ['gold', 'glint']) { const s = el('span', null, `${stats[c] ?? 0} ${CUR[c].mark} ${c}   `); s.style.color = CUR[c].color; purse.append(s); }
        p.append(close, el('h2', null, title), purse);
        const cols = el('div', 'cols');
        const left = el('div'), right = el('div');
        left.append(el('h3', null, 'For sale'));
        for (const e of catalog()) {
            const cost = E.shopPrice(e, bias);
            left.append(row(e.id, `${ITEMS[e.id].name}${(e.qty ?? 1) > 1 ? ` ×${e.qty}` : ''}`, price(cost, e.currency), (stats[e.currency] ?? 0) < cost, () => buy(e)));
        }
        right.append(el('h3', null, 'Your satchel — click to sell'));
        const sellable = stats.inventory.filter(i => (ITEMS[i.id]?.sellPrice ?? 0) > 0);
        if (!sellable.length) right.append(el('div', 'q', 'Nothing they would buy.'));
        for (const it of sellable) right.append(row(it.id, `${ITEMS[it.id].name}${it.qty > 1 ? ` ×${it.qty}` : ''}`, price(ITEMS[it.id].sellPrice, E.itemCurrency(it.id)), false, () => sell(it.id)));
        if (buyback.length) {
            right.append(el('h3', null, 'Buy back'));
            buyback.forEach((s, i) => right.append(row(s.id, ITEMS[s.id]?.name ?? s.id, price(s.price, s.currency), (stats[s.currency] ?? 0) < s.price, () => rebuy(i))));
        }
        cols.append(left, right);
        p.append(cols, el('div', 'desc', desc));
        root.append(p);
    }

    function openFor(npc, mapBias = 'neutral') {
        entries = CATALOGS[npc.catalog] ?? MERCHANT_CATALOG;
        title = npc.shopName ?? npc.name;
        bias = mapBias;
        desc = '';
        if (!open) toggle(); else render();
    }
    function toggle() {
        open = !open;
        root.classList.toggle('open', open);
        if (open) render(); else save?.();
    }
    addEventListener('keydown', e => { if (open && e.code === 'Escape') toggle(); });
    return { openFor, toggle, get open() { return open; } };
}
