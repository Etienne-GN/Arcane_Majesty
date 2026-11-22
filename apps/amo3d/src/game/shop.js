import { sfx } from '../engine/sfx.js';
// Shops — amo's ShopScene rules: a merchant's catalogue (items.js MERCHANT_CATALOG or CATALOGS[npc.catalog]),
// filtered as amo does (unknown items, recipes already known, spells/manuals already learned, rank-gated
// entries); prices in gold or glint (economy.itemCurrency), the map's currency bias (economy.shopPrice);
// selling pays the item's own currency at its sellPrice, and the last ten sales can be bought back.
// Merchants sell only while working (amo: "Closed — come back in the morning").
// The counter works like a real trade: tap wares, things in your satchel or the buy-back shelf to put them in the
// basket (tap again for more, − / + on the ledger), read the totals and your purse after the trade, then confirm.
// Selling pays for buying in the same trade.
import '@fontsource/im-fell-english/400.css';
import { items as itemRules, economy as E, stations as St } from '@rules';
import { itemIconSVG, kindOf } from './itemIcons.js';

const { ITEMS, MERCHANT_CATALOG, CATALOGS, alreadyLearned } = itemRules;
const CUR = { gold: { name: 'gold', mark: '◉', color: '#d8a030' }, glint: { name: 'glint', mark: '✧', color: '#4a9ad8' } };

export function createShop({ stats, hud, save }) {
    const css = document.createElement('style');
    css.textContent = `
#shop { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060ad0; font-family: 'IM Fell English', Georgia, serif; color: #f1e4c8; }
#shop.open { display: grid; }
#shop .counter { position: relative; display: grid; grid-template-rows: auto 1fr; width: min(1080px, 97vw); height: min(640px, calc(100vh - 24px)); box-sizing: border-box; padding: 12px 14px 14px;
  border-radius: 16px; background: radial-gradient(ellipse at 30% 20%, #5a3a22, #3a2214 60%, #24140a); box-shadow: 0 12px 40px #000c, inset 0 0 0 3px #24140a, inset 0 0 0 5px #8a5a32; }
#shop .head { display: flex; align-items: center; gap: 10px; padding: 0 50px 8px 6px; flex-wrap: wrap; }
#shop h2 { margin: 0; font-weight: normal; font-size: calc(25px * var(--ui, 1)); color: #f3d88b; }
#shop .chip { display: inline-flex; align-items: center; gap: 6px; font-size: calc(15px * var(--ui, 1)); padding: 3px 10px; border-radius: 12px; background: #0004; border: 1px solid #c8965a55; }
#shop .coin { width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff2b0, #d8a030 60%, #8a5a10); }
#shop .coin.glint { background: radial-gradient(circle at 35% 35%, #e0f8ff, #6ac8e8 60%, #2a6a8a); }
#shop .close { position: absolute; right: 10px; top: 8px; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; color: #f4d8b0; font: bold 16px Georgia, serif; z-index: 2;
  background: radial-gradient(circle at 40% 35%, #b8342a, #6a1410); box-shadow: 0 2px 6px #000a; }
#shop .cols { display: grid; grid-template-columns: 1fr 1fr minmax(240px, 320px); gap: 12px; min-height: 0; }
#shop .col { min-height: 0; overflow: auto; touch-action: pan-y; scrollbar-width: thin; scrollbar-color: #c8965a66 transparent; }
#shop h3 { margin: 2px 0 6px; font-weight: normal; font-style: italic; font-size: calc(16px * var(--ui, 1)); color: #e8c890; }
#shop .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(calc(60px * var(--ui, 1)), 1fr)); gap: 7px; }
#shop .ware { position: relative; cursor: pointer; }
#shop .ware .iicon { width: 100%; aspect-ratio: 1; display: block; }
#shop .ware .p { display: block; text-align: center; font: calc(13px * var(--ui, 1)) Georgia, serif; color: #f1e4c8; margin-top: 2px; white-space: nowrap; }
#shop .ware .n { position: absolute; left: 3px; top: 2px; font: bold calc(13px * var(--ui, 1)) Georgia, serif; color: #fff4dc; text-shadow: 0 1px 2px #000; }
#shop .ware .in { position: absolute; right: -4px; top: -4px; min-width: 20px; height: 20px; border-radius: 10px; background: #b8301a; color: #fff4dc; font: bold 12px Georgia, serif; display: grid; place-items: center; box-shadow: 0 0 0 2px #24140a; }
#shop .ware.poor .iicon { opacity: .45; }
#shop .ware.sel .iicon { box-shadow: 0 0 0 3px #f3d88b; border-radius: 4px; }
#shop .none { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(16px * var(--ui, 1)); color: #d8c09a; }
#shop .ledger { border-radius: 10px; padding: 10px 12px; background: radial-gradient(ellipse at 50% 30%, #f6ead0, #e6d3a8 80%, #d8c08e); color: #2e2010; box-shadow: inset 0 0 18px #8a6a3a55; min-height: 100%; box-sizing: border-box; display: flex; flex-direction: column; }
#shop .ledger h4 { margin: 6px 0 2px; font-weight: normal; font-style: italic; font-size: calc(16px * var(--ui, 1)); color: #6a3a1a; border-bottom: 1px solid #8a6a3a55; }
#shop .about { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(15px * var(--ui, 1)); color: #4a3a2a; line-height: 1.1; min-height: 2.2em; }
#shop .about b { font-family: 'IM Fell English', Georgia, serif; font-weight: normal; color: #3a1e0a; font-size: calc(17px * var(--ui, 1)); }
#shop .line { display: flex; align-items: center; gap: 6px; padding: 3px 0; font-size: calc(15px * var(--ui, 1)); }
#shop .line .nm { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#shop .line .amt { font-family: Georgia, serif; white-space: nowrap; }
#shop .step { width: 26px; height: 26px; border-radius: 6px; border: 1px solid #8a6a3a88; background: #fff8; color: #3a2010; font: bold 15px Georgia, serif; cursor: pointer; padding: 0; line-height: 1; }
#shop .qty { min-width: 1.4em; text-align: center; font-family: Georgia, serif; }
#shop .tot { margin-top: 8px; padding-top: 6px; border-top: 2px solid #8a6a3a77; font-size: calc(15px * var(--ui, 1)); }
#shop .tot .r { display: flex; justify-content: space-between; } #shop .tot .r.after { font-size: calc(16px * var(--ui, 1)); color: #3a1e0a; }
#shop .warn { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(15px * var(--ui, 1)); color: #a8301a; margin-top: 4px; }
#shop .acts { margin-top: auto; padding: 8px 0 2px; display: flex; flex-direction: column; gap: 6px; position: sticky; bottom: -10px; background: linear-gradient(transparent, #e2cfa2 22%); }   /* Confirm stays in reach on a long basket */
#shop .ledger button.go { font: calc(17px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 9px 12px; border-radius: 8px; cursor: pointer; color: #fff0d0; border: 1px solid #4a1e0a; background: linear-gradient(#8a3a1a, #5a200c); }
#shop .ledger button.go[disabled] { opacity: .45; cursor: default; }
#shop .ledger button.ghost { font: calc(15px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 6px 10px; border-radius: 8px; cursor: pointer; color: #3a2010; background: #fff6; border: 1px solid #8a6a3a88; }
#shop .done { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(16px * var(--ui, 1)); color: #3a6a2a; }
@media (max-width: 760px) { #shop .cols { grid-template-columns: 1fr; } #shop .col { overflow: visible; } #shop .counter { height: auto; max-height: calc(100vh - 16px); overflow: auto; } }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'shop';
    document.body.append(root);
    root.addEventListener('click', e => { if (e.target === root) toggle(); });
    const buyback = [];
    let open = false, entries = [], title = '', bias = 'neutral', about = null, done = '';
    // The basket: wares to buy (catalogue entry id → packs), things to sell (item id → count), buy-backs (index set).
    const basket = { buy: new Map(), sell: new Map(), rebuy: new Set() };
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const svg = html => { const s = document.createElement('span'); s.innerHTML = html; return s.firstChild; };   // our own generated SVG only
    const price = (amount, cur) => `${amount} ${CUR[cur].mark}`;
    const owned = id => stats.inventory.filter(i => i.id === id).reduce((n, i) => n + (i.qty ?? 1), 0);

    const catalog = () => {
        const known = new Set(stats.knownRecipes ?? []);
        return entries.filter(e => ITEMS[e.id]
            && !(e.id.startsWith('recipe_') && known.has(e.id.slice('recipe_'.length)))
            && !alreadyLearned(e.id, stats)
            && (!e.requires || St.craftRank(stats.craftCounts?.[e.requires.kind] ?? 0) >= e.requires.rank));
    };
    const entryKey = e => `${e.id}|${e.qty ?? 1}|${e.currency}`;

    // ---- totals: what the trade costs and pays, per currency, and the purse after it ----
    function totals() {
        const cost = { gold: 0, glint: 0 }, gain = { gold: 0, glint: 0 };
        const cat = new Map(catalog().map(e => [entryKey(e), e]));
        for (const [k, n] of basket.buy) { const e = cat.get(k); if (e) cost[e.currency] += E.shopPrice(e, bias) * n; }
        for (const i of basket.rebuy) { const s = buyback[i]; if (s) cost[s.currency] += s.price; }
        for (const [id, n] of basket.sell) gain[E.itemCurrency(id)] += (ITEMS[id]?.sellPrice ?? 0) * n;
        const after = { gold: (stats.gold ?? 0) + gain.gold - cost.gold, glint: (stats.glint ?? 0) + gain.glint - cost.glint };
        // Room: new stacks the purchases need, against the room left after the sales.
        let need = 0;
        for (const [k, n] of basket.buy) { const e = cat.get(k); if (!e) continue; const def = ITEMS[e.id]; need += def?.stackable && owned(e.id) > 0 ? 0 : def?.stackable ? 1 : n * (e.qty ?? 1); }
        for (const i of basket.rebuy) { const s = buyback[i]; if (s) need += ITEMS[s.id]?.stackable && owned(s.id) ? 0 : 1; }
        let freed = 0; for (const [id, n] of basket.sell) if (n >= owned(id)) freed += stats.inventory.filter(i => i.id === id).length;
        const room = stats.getSatchelCapacity() - stats.inventory.length + freed;
        return { cost, gain, after, need, room, empty: !basket.buy.size && !basket.sell.size && !basket.rebuy.size };
    }

    // ---- the trade ----
    function confirm() {
        const T = totals();
        if (T.empty || T.after.gold < 0 || T.after.glint < 0) return;
        const cat = new Map(catalog().map(e => [entryKey(e), e])), bought = [], sold = [], failed = [];
        for (const [id, n] of basket.sell) {   // sales first: they pay for the rest and free room
            const def = ITEMS[id], k = Math.min(n, owned(id));
            for (let i = 0; i < k; i++) { stats.removeItem(id, 1); stats[E.itemCurrency(id)] = (stats[E.itemCurrency(id)] ?? 0) + def.sellPrice; E.recordSale(buyback, { id, price: def.sellPrice, currency: E.itemCurrency(id) }); }
            if (k) sold.push(`${def.name}${k > 1 ? ` ×${k}` : ''}`);
        }
        for (const [key, n] of basket.buy) {
            const e = cat.get(key); if (!e) continue;
            const cost = E.shopPrice(e, bias);
            let got = 0;
            for (let i = 0; i < n; i++) {
                if ((stats[e.currency] ?? 0) < cost || !stats.addItem(e.id, e.qty ?? 1)) { failed.push(ITEMS[e.id].name); break; }
                stats[e.currency] -= cost; got++;
            }
            if (got) bought.push(`${ITEMS[e.id].name}${got * (e.qty ?? 1) > 1 ? ` ×${got * (e.qty ?? 1)}` : ''}`);
        }
        for (const i of [...basket.rebuy].sort((a, b) => b - a)) {   // from the end, so indexes stay true
            const s = buyback[i]; if (!s) continue;
            if ((stats[s.currency] ?? 0) < s.price || !stats.addItem(s.id)) { failed.push(ITEMS[s.id]?.name ?? s.id); continue; }
            stats[s.currency] -= s.price; buyback.splice(i, 1); bought.push(ITEMS[s.id]?.name ?? s.id);
        }
        basket.buy.clear(); basket.sell.clear(); basket.rebuy.clear();
        sfx.coin();
        done = [bought.length && `Bought ${bought.join(', ')}.`, sold.length && `Sold ${sold.join(', ')}.`, failed.length && `No room or coin for ${failed.join(', ')}.`].filter(Boolean).join(' ');
        hud.message(failed.length ? 'Trade done — not everything fit' : 'Trade done');
        save?.();
        render();
    }

    // ---- the counter ----
    function tile(def, { priceText, count, inBasket, poor, onTap, sel }) {
        const t = el('div', `ware${poor ? ' poor' : ''}${sel ? ' sel' : ''}`);
        t.append(svg(itemIconSVG(def)));
        if (count > 1) t.append(el('span', 'n', `${count}`));
        if (inBasket) t.append(el('span', 'in', `${inBasket}`));
        t.append(el('span', 'p', priceText));
        t.title = def.name;
        t.onclick = onTap;
        return t;
    }
    function render() {
        root.textContent = '';
        const C = el('div', 'counter');
        const close = el('button', 'close', '✕'); close.title = 'Close'; close.onclick = () => toggle();
        const head = el('div', 'head');
        head.append(el('h2', null, title));
        for (const c of ['gold', 'glint']) { const ch = el('span', 'chip'); ch.append(el('span', `coin${c === 'glint' ? ' glint' : ''}`), document.createTextNode(`${stats[c] ?? 0} ${c}`)); head.append(ch); }
        C.append(head);
        const cols = el('div', 'cols'), wares = el('div', 'col'), bag = el('div', 'col'), side = el('div', 'col');
        // The merchant's wares.
        wares.append(el('h3', null, 'Wares — tap to add to the basket'));
        const g1 = el('div', 'grid');
        for (const e of catalog()) {
            const def = ITEMS[e.id], cost = E.shopPrice(e, bias), k = entryKey(e);
            g1.append(tile(def, { priceText: price(cost, e.currency), count: e.qty ?? 1, inBasket: basket.buy.get(k), poor: (stats[e.currency] ?? 0) < cost, sel: about?.key === k,
                onTap: () => { basket.buy.set(k, (basket.buy.get(k) ?? 0) + 1); about = { def, key: k, text: `${price(cost, e.currency)} each` }; done = ''; render(); } }));
        }
        wares.append(g1);
        // Your satchel.
        bag.append(el('h3', null, 'Your satchel — tap to sell'));
        const g2 = el('div', 'grid'), seen = new Set();
        for (const it of stats.inventory) {
            const def = ITEMS[it.id];
            if (!def?.sellPrice || seen.has(it.id)) continue;
            seen.add(it.id);
            const have = owned(it.id), inB = basket.sell.get(it.id) ?? 0;
            g2.append(tile(def, { priceText: price(def.sellPrice, E.itemCurrency(it.id)), count: have, inBasket: inB, poor: inB >= have, sel: about?.key === `s|${it.id}`,
                onTap: () => { if (inB < have) basket.sell.set(it.id, inB + 1); about = { def, key: `s|${it.id}`, text: `they pay ${price(def.sellPrice, E.itemCurrency(it.id))} each` }; done = ''; render(); } }));
        }
        bag.append(g2);
        if (!seen.size) bag.append(el('div', 'none', 'Nothing they would buy.'));
        if (buyback.length) {
            bag.append(el('h3', null, 'Buy back what you sold'));
            const g3 = el('div', 'grid');
            buyback.forEach((s, i) => { const def = ITEMS[s.id]; if (def) g3.append(tile(def, { priceText: price(s.price, s.currency), inBasket: basket.rebuy.has(i) ? 1 : 0, poor: (stats[s.currency] ?? 0) < s.price,
                onTap: () => { basket.rebuy.has(i) ? basket.rebuy.delete(i) : basket.rebuy.add(i); done = ''; render(); } })); });
            bag.append(g3);
        }
        // The ledger: the basket, the totals, the purse after the trade.
        const L = el('div', 'ledger');
        const ab = el('div', 'about');
        if (about) { ab.append(el('b', null, about.def.name), document.createTextNode(` — ${kindOf(about.def)}. ${about.def.description ?? ''} (${about.text})`)); }
        else ab.textContent = 'Tap anything to put it in the basket; the trade happens only when you confirm it.';
        L.append(ab);
        const cat = new Map(catalog().map(e => [entryKey(e), e]));
        const line = (name, n, amount, minus, plus) => {
            const r = el('div', 'line');
            const m = el('button', 'step', '−'); m.onclick = () => { minus(); render(); };
            const p = el('button', 'step', '+'); p.onclick = () => { plus(); render(); };
            r.append(m, el('span', 'qty', `${n}`), p, el('span', 'nm', name), el('span', 'amt', amount));
            return r;
        };
        if (basket.buy.size || basket.rebuy.size) {
            L.append(el('h4', null, 'Buying'));
            for (const [k, n] of basket.buy) { const e = cat.get(k); if (!e) continue; L.append(line(ITEMS[e.id].name + ((e.qty ?? 1) > 1 ? ` (×${e.qty})` : ''), n, `− ${price(E.shopPrice(e, bias) * n, e.currency)}`,
                () => (n > 1 ? basket.buy.set(k, n - 1) : basket.buy.delete(k)), () => basket.buy.set(k, n + 1))); }
            for (const i of basket.rebuy) { const s = buyback[i]; if (s) L.append(line(`${ITEMS[s.id]?.name ?? s.id} (buy back)`, 1, `− ${price(s.price, s.currency)}`, () => basket.rebuy.delete(i), () => {})); }
        }
        if (basket.sell.size) {
            L.append(el('h4', null, 'Selling'));
            for (const [id, n] of basket.sell) L.append(line(ITEMS[id].name, n, `+ ${price(ITEMS[id].sellPrice * n, E.itemCurrency(id))}`,
                () => (n > 1 ? basket.sell.set(id, n - 1) : basket.sell.delete(id)), () => basket.sell.set(id, Math.min(owned(id), n + 1))));
        }
        const T = totals();
        if (!T.empty) {
            const tot = el('div', 'tot');
            for (const c of ['gold', 'glint']) {
                if (!T.cost[c] && !T.gain[c]) continue;
                const net = T.gain[c] - T.cost[c], r = el('div', 'r');
                r.append(el('span', null, `${c[0].toUpperCase() + c.slice(1)}: ${T.cost[c] ? `pay ${T.cost[c]}` : ''}${T.cost[c] && T.gain[c] ? ', ' : ''}${T.gain[c] ? `receive ${T.gain[c]}` : ''}`), el('span', null, `${net >= 0 ? '+' : '−'}${Math.abs(net)} ${CUR[c].mark}`));
                const a = el('div', 'r after'); a.append(el('span', null, `You will have`), el('span', null, `${T.after[c]} ${c}`));
                tot.append(r, a);
            }
            L.append(tot);
            const poorIn = ['gold', 'glint'].filter(c => T.after[c] < 0);
            if (poorIn.length) L.append(el('div', 'warn', `Not enough ${poorIn.join(' or ')} — sell something, or take something out.`));
            else if (T.need > T.room) L.append(el('div', 'warn', `Your satchel has room for ${Math.max(0, T.room)} more — some of this may not fit.`));
        }
        if (done) L.append(el('div', 'done', done));
        const acts = el('div', 'acts');
        const go = el('button', 'go', T.empty ? 'The basket is empty' : 'Confirm the trade'); go.disabled = T.empty || T.after.gold < 0 || T.after.glint < 0; go.onclick = confirm;
        acts.append(go);
        if (!T.empty) { const clr = el('button', 'ghost', 'Empty the basket'); clr.onclick = () => { basket.buy.clear(); basket.sell.clear(); basket.rebuy.clear(); render(); }; acts.append(clr); }
        L.append(acts);
        side.append(L);
        cols.append(wares, bag, side);
        C.append(cols, close);
        root.append(C);
    }

    function openFor(npc, mapBias = 'neutral') {
        entries = CATALOGS[npc.catalog] ?? MERCHANT_CATALOG;
        title = npc.shopName ?? npc.name;
        bias = mapBias;
        about = null; done = '';
        basket.buy.clear(); basket.sell.clear(); basket.rebuy.clear();
        if (!open) toggle(); else render();
    }
    function toggle() {
        open = !open;
        root.classList.toggle('open', open);
        if (open) render(); else { basket.buy.clear(); basket.sell.clear(); basket.rebuy.clear(); save?.(); }   // walking away empties the basket
    }
    addEventListener('keydown', e => { if (open && e.code === 'Escape') toggle(); });
    return { openFor, toggle, get open() { return open; } };
}
