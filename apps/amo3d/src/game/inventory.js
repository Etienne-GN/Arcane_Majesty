// The Satchel (I / Tab / gamepad View / MENU → Satchel): a leather bag over the live game, which pauses while it
// is open. Left: what you wear, round a figure (head, body, each hand, two accessories, the quiver). Middle: the
// satchel's pockets, filtered by kind. Right: a parchment card for the chosen item — what it is, what it does,
// and big buttons for what you can do with it. Every action is amo's: PlayerStats.equipItem (either hand,
// refuses if what comes off would not fit), unequipItem, useItem, removeItem.
import '@fontsource/im-fell-english/400.css';
import { items as itemRules, weapons as weaponRules } from '@rules';
import { itemIconSVG, glyphSVG, kindOf, groupOf } from './itemIcons.js';

const { ITEMS } = itemRules;
// The figure's slots: where each sits round it (grid column / row), and the shape shown while it is empty.
const WORN = [
    ['shoulders', 'Shoulders', 1, 1, 'itm_leather_armor'], ['head', 'Head', 2, 1, 'itm_headgear_01'], ['back', 'Back', 3, 1, 'itm_leather_armor'],
    ['weapon', 'Right hand', 1, 2, 'sword'], ['body', 'Body', 2, 2, 'itm_leather_armor'], ['offHand', 'Left hand', 3, 2, 'shield'],
    ['arms', 'Arms', 1, 3, 'itm_leather_armor'], ['legs', 'Legs', 2, 3, 'itm_leather_armor'], ['accessory1', 'Accessory', 3, 3, 'itm_ring_01'],
    ['quiver', 'Quiver', 1, 4, 'ammo'], ['feet', 'Feet', 2, 4, 'itm_leather_armor'], ['accessory2', 'Accessory', 3, 4, 'itm_necklace_01'],
];
const FILTERS = [['all', 'All'], ['weapons', 'Weapons'], ['wear', 'Wear'], ['use', 'Potions & food'], ['learning', 'Scrolls & books'], ['materials', 'Materials']];
const STAT = { strength: 'STR', intelligence: 'INT', stamina: 'STA', agility: 'AGI', maxHealth: 'Health', maxMana: 'Mana', defense: 'Defence', speed: 'Speed' };

const CSS = `
#inv { position: fixed; inset: 0; z-index: 8; display: none; place-items: center; background: #05060ad0; font-family: 'IM Fell English', Georgia, serif; color: #f1e4c8; }
#inv.open { display: grid; }
#inv .bag { position: relative; display: grid; grid-template-rows: auto 1fr; width: min(1060px, 97vw); height: min(640px, calc(100vh - 24px)); box-sizing: border-box; padding: 12px 14px 14px;
  border-radius: 18px; background: radial-gradient(ellipse at 30% 20%, #6a4226, #3e2414 60%, #2a170c); box-shadow: 0 12px 40px #000c, inset 0 0 0 3px #2a170c, inset 0 0 0 5px #8a5a32; }
#inv .bag::before { content: ''; position: absolute; inset: 9px; border: 2px dashed #c8965a66; border-radius: 13px; pointer-events: none; }
#inv .head { display: flex; align-items: center; gap: 12px; padding: 0 50px 8px 8px; flex-wrap: wrap; }
#inv h2 { margin: 0; font-weight: normal; font-size: calc(26px * var(--ui, 1)); color: #f3d88b; letter-spacing: .06em; }
#inv .chip { display: inline-flex; align-items: center; gap: 6px; font-size: calc(15px * var(--ui, 1)); padding: 3px 10px; border-radius: 12px; background: #0004; border: 1px solid #c8965a55; }
#inv .coin { width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #fff2b0, #d8a030 60%, #8a5a10); }
#inv .coin.glint { background: radial-gradient(circle at 35% 35%, #e0f8ff, #6ac8e8 60%, #2a6a8a); }
#inv .fill { width: 70px; height: 6px; border-radius: 3px; background: #0006; overflow: hidden; } #inv .fill > div { height: 100%; background: linear-gradient(90deg, #8a6a2a, #f3d88b); }
#inv .close { position: absolute; right: 10px; top: 8px; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; color: #f4d8b0; font: bold 16px Georgia, serif; z-index: 2;
  background: radial-gradient(circle at 40% 35%, #b8342a, #6a1410); box-shadow: 0 2px 6px #000a; }
#inv .cols { display: grid; grid-template-columns: auto 1fr minmax(220px, 300px); gap: 12px; min-height: 0; }
#inv .col { min-height: 0; overflow: auto; touch-action: pan-y; scrollbar-width: thin; scrollbar-color: #c8965a66 transparent; }
#inv h3 { margin: 2px 0 6px; font-weight: normal; font-style: italic; font-size: calc(16px * var(--ui, 1)); color: #e8c890; }
#inv .worn { position: relative; display: grid; grid-template-columns: repeat(3, calc(66px * var(--ui, 1))); grid-auto-rows: calc(84px * var(--ui, 1)); gap: 4px 8px; padding: 4px 6px; }
#inv .figure { position: absolute; left: 50%; top: 4px; width: 120px; height: calc(250px * var(--ui, 1)); transform: translateX(-50%); opacity: .14; pointer-events: none; }
#inv .slot { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer; }
#inv .slot .tile { width: calc(58px * var(--ui, 1)); height: calc(58px * var(--ui, 1)); border-radius: 10px; display: grid; place-items: center; background: #0005; border: 2px solid #c8965a44; box-sizing: border-box; }
#inv .slot.empty .tile { border-style: dashed; } #inv .slot.empty .iglyph { width: 60%; height: 60%; opacity: .28; }
#inv .slot .iicon { width: 100%; height: 100%; }
#inv .slot .lbl { font-size: calc(12px * var(--ui, 1)); color: #d8c09a; white-space: nowrap; }
#inv .slot.sel .tile, #inv .item.sel { box-shadow: 0 0 0 3px #f3d88b, 0 0 14px #f3d88b88; }
#inv .filters { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
#inv .filters button { font: calc(14px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 4px 10px; border-radius: 12px; border: 1px solid #c8965a66; background: #0003; color: #e8d8b8; cursor: pointer; }
#inv .filters button.on { background: #f3d88b; color: #2a1a0a; border-color: #f3d88b; }
#inv .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(calc(64px * var(--ui, 1)), 1fr)); gap: 8px; }
#inv .item { position: relative; aspect-ratio: 1; border-radius: 10px; cursor: pointer; }
#inv .item .iicon { width: 100%; height: 100%; display: block; }
#inv .item .qty { position: absolute; right: 3px; bottom: 1px; font: bold calc(14px * var(--ui, 1)) Georgia, serif; color: #fff4dc; text-shadow: 0 1px 2px #000, 0 0 3px #000; }
#inv .item.free { cursor: default; border: 2px dashed #c8965a33; box-sizing: border-box; }
#inv .nothing { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(17px * var(--ui, 1)); color: #d8c09a; padding: 10px; }
#inv .card { border-radius: 10px; padding: 12px 14px; background: radial-gradient(ellipse at 50% 30%, #f6ead0, #e6d3a8 80%, #d8c08e); color: #2e2010; box-shadow: inset 0 0 18px #8a6a3a55; min-height: 100%; box-sizing: border-box; }
#inv .card .top { display: flex; gap: 10px; align-items: center; }
#inv .card .big { width: calc(64px * var(--ui, 1)); height: calc(64px * var(--ui, 1)); flex: none; } #inv .card .big .iicon { width: 100%; height: 100%; }
#inv .card .name { font-size: calc(21px * var(--ui, 1)); color: #3a1e0a; line-height: 1.1; }
#inv .card .kind { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #6a4a2a; }
#inv .card .desc { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(17px * var(--ui, 1)); line-height: 1.15; margin: 8px 0; }
#inv .card .stats { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 6px; }
#inv .card .stat { font-size: calc(14px * var(--ui, 1)); padding: 1px 8px; border-radius: 10px; background: #3a6a2a22; color: #2a5a1a; border: 1px solid #3a6a2a55; }
#inv .card .worth { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #6a4a2a; margin-bottom: 8px; }
#inv .card .acts { display: flex; flex-direction: column; gap: 6px; }
#inv .card button { font: calc(17px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 8px 12px; border-radius: 8px; cursor: pointer; text-align: center; color: #fff0d0; border: 1px solid #4a1e0a; background: linear-gradient(#8a3a1a, #5a200c); }
#inv .card button.ghost { color: #3a2010; background: #fff6; border-color: #8a6a3a88; }
#inv .card .hint { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(16px * var(--ui, 1)); color: #6a4a2a; }
@media (max-width: 760px) { #inv .cols { grid-template-columns: 1fr; } #inv .col { overflow: visible; } #inv .bag { height: auto; max-height: calc(100vh - 16px); overflow: auto; } }
@media (max-height: 480px) { #inv .worn { grid-auto-rows: calc(76px * var(--ui, 1)); } #inv .slot .tile { width: calc(52px * var(--ui, 1)); height: calc(52px * var(--ui, 1)); } }`;

const FIGURE = '<svg viewBox="0 0 60 125" class="figure"><circle cx="30" cy="14" r="10" fill="#f3d88b"/><path d="M14 30 Q30 22 46 30 L52 70 L44 72 L42 50 L40 122 L32 122 L30 80 L28 122 L20 122 L18 50 L16 72 L8 70Z" fill="#f3d88b"/></svg>';

export function createInventory({ stats, hud, onDrop, hotbar = null }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'inv';
    document.body.append(root);
    root.addEventListener('click', e => { if (e.target === root) toggle(); });
    let open = false, selected = null, filter = 'all';   // selected: { from: 'bag', id } | { from: 'slot', slot }

    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const svg = html => { const s = document.createElement('span'); s.innerHTML = html; return s.firstChild; };   // our own generated SVG only

    function render() {
        root.textContent = '';
        const bag = el('div', 'bag');
        const close = el('button', 'close', '✕'); close.title = 'Close'; close.onclick = toggle;
        const head = el('div', 'head');
        head.append(el('h2', null, 'Satchel'));
        const money = (cls, n, word) => { const c = el('span', 'chip'); c.append(el('span', `coin${cls}`), document.createTextNode(`${n} ${word}`)); return c; };
        head.append(money('', stats.gold ?? 0, 'gold'), money(' glint', stats.glint ?? 0, 'glint'));
        const cap = stats.getSatchelCapacity(), used = stats.inventory.length, room = el('span', 'chip'), fill = el('div', 'fill'), f = el('div');
        f.style.width = `${Math.min(100, (used / cap) * 100)}%`; fill.append(f); room.append(document.createTextNode(`${used} / ${cap} pockets`), fill); head.append(room);
        bag.append(head);

        const cols = el('div', 'cols');
        // What you wear, round the figure.
        const left = el('div', 'col'); left.append(el('h3', null, 'Worn'));
        const worn = el('div', 'worn'); worn.append(svg(FIGURE));
        for (const [slot, label, c, r, shape] of WORN) {
            const id = stats.equipment[slot], def = id && ITEMS[id];
            const s = el('div', `slot${def ? '' : ' empty'}${selected?.from === 'slot' && selected.slot === slot ? ' sel' : ''}`);
            s.style.gridColumn = c; s.style.gridRow = r;
            const tile = el('div', 'tile'); tile.append(svg(def ? itemIconSVG(def) : glyphSVG(shape, '#f3d88b', '#f3d88b55'))); s.append(tile, el('span', 'lbl', label));
            s.title = def ? def.name : `${label} — empty`;
            s.onclick = () => { selected = { from: 'slot', slot }; render(); };
            worn.append(s);
        }
        left.append(worn);
        // The pockets.
        const mid = el('div', 'col');
        const fl = el('div', 'filters');
        for (const [id, label] of FILTERS) { const b = el('button', filter === id ? 'on' : '', label); b.onclick = () => { filter = id; render(); }; fl.append(b); }
        mid.append(fl);
        const grid = el('div', 'grid'), shown = stats.inventory.filter(it => filter === 'all' || groupOf(ITEMS[it.id]) === filter);
        for (const it of shown) {
            const def = ITEMS[it.id];
            const tile = el('div', `item${selected?.from === 'bag' && selected.id === it.id ? ' sel' : ''}`);
            tile.append(svg(itemIconSVG(def ?? { color: it.color })));
            if (it.qty > 1) tile.append(el('span', 'qty', `${it.qty}`));
            tile.title = def?.name ?? it.id;
            tile.onclick = () => { selected = { from: 'bag', id: it.id }; render(); };
            grid.append(tile);
        }
        if (filter === 'all') for (let i = used; i < cap; i++) grid.append(el('div', 'item free'));
        mid.append(grid);
        if (!shown.length) mid.append(el('div', 'nothing', filter === 'all' ? 'The satchel is empty.' : 'Nothing of that kind in the satchel.'));
        // The card.
        const right = el('div', 'col'); right.append(card());
        cols.append(left, mid, right);
        bag.append(cols, close);
        root.append(bag);
    }

    function card() {
        const box = el('div', 'card');
        const id = selected?.from === 'slot' ? stats.equipment[selected.slot] : selected?.id;
        const def = id && ITEMS[id];
        if (!def || (selected.from === 'bag' && !stats.inventory.some(i => i.id === id))) {
            box.append(el('div', 'hint', selected?.from === 'slot' ? 'Nothing worn there. Choose something in the satchel to put it on.' : 'Tap anything — in the satchel or on you — to see what it is and what you can do with it.'));
            return box;
        }
        const top = el('div', 'top'), big = el('div', 'big'); big.append(svg(itemIconSVG(def)));
        const nm = el('div'); nm.append(el('div', 'name', def.name), el('div', 'kind', kindOf(def)));
        top.append(big, nm); box.append(top);
        box.append(el('div', 'desc', def.description ?? ''));
        const st = Object.entries(def.stats ?? {}).filter(([, v]) => v);
        if (st.length) { const s = el('div', 'stats'); for (const [k, v] of st) s.append(el('span', 'stat', `${v > 0 ? '+' : ''}${v} ${STAT[k] ?? k}`)); box.append(s); }
        if (def.sellPrice) box.append(el('div', 'worth', `A merchant would give ${def.sellPrice} ${def.currency ?? 'gold'} for it.`));
        const acts = el('div', 'acts'); box.append(acts);
        const act = (label, fn, ghost = false) => {
            const b = el('button', ghost ? 'ghost' : null, label);
            b.onclick = () => { const r = fn(); if (r === false) hud.message('That will not fit in the satchel'); render(); };
            acts.append(b);
        };
        const twoHands = d => weaponRules.WEAPON_TYPES[weaponRules.typeOf(d)]?.hands === 2;
        if (selected.from === 'slot') {
            act('Take it off', () => { const ok = stats.unequipItem(selected.slot); if (ok) selected = null; return ok; });
            // A one-handed weapon can change hands; a one-handed weapon in the other hand takes its place (a shield goes to the satchel).
            if ((selected.slot === 'weapon' || selected.slot === 'offHand') && def.slot === 'weapon' && !twoHands(def)) {
                const toLeft = selected.slot === 'weapon';
                act(`Move to the ${toLeft ? 'left' : 'right'} hand`, () => {
                    const here = stats.equipment[selected.slot], there = stats.equipment[toLeft ? 'offHand' : 'weapon'];
                    const thereDef = there && ITEMS[there];
                    if (!stats.unequipItem(selected.slot)) return false;
                    if (there && !stats.unequipItem(toLeft ? 'offHand' : 'weapon')) { stats.equipItem(here, toLeft ? 'main' : 'off'); return false; }
                    stats.equipItem(here, toLeft ? 'off' : 'main');
                    if (there && thereDef?.slot === 'weapon' && !twoHands(thereDef)) stats.equipItem(there, toLeft ? 'main' : 'off');
                    selected = { from: 'slot', slot: toLeft ? 'offHand' : 'weapon' };
                    return true;
                }, true);
            }
        } else {
            if (def.slot === 'weapon') {
                if (twoHands(def)) act('Hold it — both hands', () => stats.equipItem(id, 'main'));
                else { act('Hold it — right hand', () => stats.equipItem(id, 'main')); act('Hold it — left hand', () => stats.equipItem(id, 'off')); }
            } else if (def.slot) {
                act('Wear it', () => stats.equipItem(id));
            } else if (def.onUse) {
                act(def.spellOf || def.manualOf ? 'Read it' : 'Use it', () => {
                    const before = stats.level;
                    const ok = stats.useItem(id);
                    if (!ok) { hud.message('Nothing happens'); return true; }
                    hud.message(`${def.name} used`);
                    if (stats.level > before) hud.banner(`Level ${stats.level}`);
                    return true;
                });
            }
            if (hotbar?.canHotbar(id)) act('Put on the hotbar', () => { hotbar.assign(id); hud.message(`${def.name} on the hotbar`); return true; }, true);
            act('Drop it', () => {   // amo's removeItem returns nothing, so check the satchel first
                if (!stats.inventory.some(i => i.id === id)) return true;
                stats.removeItem(id, 1);
                onDrop?.(id);
                selected = null;
                return true;
            }, true);
        }
        return box;
    }

    function toggle() {
        open = !open;
        root.classList.toggle('open', open);
        if (open) { selected = null; render(); }
    }

    addEventListener('keydown', e => {
        if (e.code === 'KeyI' || e.code === 'Tab') { e.preventDefault(); toggle(); }
        else if (open && e.code === 'Escape') toggle();
    });

    return { toggle, get open() { return open; }, render };
}
