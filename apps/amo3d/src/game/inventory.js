// Inventory & equipment screen (I / Tab / gamepad View / touch BAG). An HTML overlay over the live
// game, which pauses while it is open. Every action is amo's: PlayerStats.equipItem (both hands,
// refuses if what comes off would not fit), unequipItem, useItem, removeItem.
import { items as itemRules, weapons as weaponRules } from '@rules';

const { ITEMS } = itemRules;
const SLOTS = [
    ['weapon', 'Right hand'], ['offHand', 'Left hand'], ['head', 'Head'], ['body', 'Body'],
    ['accessory1', 'Accessory'], ['accessory2', 'Accessory'], ['quiver', 'Quiver'],
];
const hex = c => `#${(c ?? 0x8855ff).toString(16).padStart(6, '0')}`;

const CSS = `
#inv { position: fixed; inset: 0; z-index: 8; display: none; place-items: center; background: #05060acc;
    font-family: Georgia, 'Times New Roman', serif; color: #eee6d2; }
#inv.open { display: grid; }
#inv .panel { width: min(860px, 94vw); max-height: 90vh; overflow: auto; padding: 18px 22px; border: 1px solid #f3d88b66;
    border-radius: 14px; background: linear-gradient(160deg, #1b1720ee, #0e0c12f2); box-shadow: 0 10px 40px #000a; }
#inv h2 { margin: 0 0 4px; font-weight: normal; letter-spacing: .14em; font-size: calc(24px * var(--ui, 1)); color: #f3d88b; }
#inv .meta { font-size: calc(15px * var(--ui, 1)); opacity: .75; margin-bottom: 14px; }
#inv .cols { display: grid; grid-template-columns: 230px 1fr; gap: 18px; }
#inv h3 { margin: 0 0 8px; font-weight: normal; font-size: calc(14px * var(--ui, 1)); letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#inv .slot { display: flex; align-items: center; gap: 8px; padding: 6px 8px; margin-bottom: 5px; border-radius: 8px;
    background: #ffffff0a; border: 1px solid #ffffff14; cursor: pointer; font-size: calc(15px * var(--ui, 1)); min-height: 22px; }
#inv .slot .lbl { width: 72px; opacity: .55; font-size: calc(14px * var(--ui, 1)); letter-spacing: .05em; }
#inv .slot.empty { cursor: default; opacity: .6; }
#inv .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 6px; }
#inv .item { position: relative; padding: 8px; border-radius: 8px; background: #ffffff0d; border: 1px solid #ffffff1a;
    cursor: pointer; font-size: calc(14px * var(--ui, 1)); min-height: 38px; }
#inv .item.sel, #inv .slot.sel { border-color: #f3d88b; background: #f3d88b1c; }
#inv .item.free { cursor: default; opacity: .25; }
#inv .gem { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; transform: rotate(45deg); }
#inv .qty { position: absolute; right: 6px; bottom: 4px; font-size: calc(14px * var(--ui, 1)); opacity: .8; }
#inv .detail { margin-top: 14px; padding: 12px 14px; border-radius: 10px; background: #ffffff08; border: 1px solid #ffffff12; min-height: 70px; }
#inv .detail .name { font-size: calc(18px * var(--ui, 1)); margin-bottom: 4px; }
#inv .detail .desc { font-size: calc(15px * var(--ui, 1)); opacity: .8; margin-bottom: 10px; }
#inv button { font: calc(15px * var(--ui, 1)) Georgia, serif; color: #1b1406; background: #f3d88b; border: 0; border-radius: 7px; padding: 7px 14px;
    margin-right: 8px; cursor: pointer; }
#inv button.ghost { background: transparent; color: #eee6d2; border: 1px solid #eee6d255; }
#inv .close { float: right; }
@media (max-width: 640px) { #inv .cols { grid-template-columns: 1fr; } }`;

export function createInventory({ stats, hud, onDrop, hotbar = null }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'inv';
    document.body.append(root);
    let open = false, selected = null;   // { from: 'bag', id } | { from: 'slot', slot }

    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const gem = color => { const g = el('span', 'gem'); g.style.background = hex(color); return g; };

    function render() {
        root.textContent = '';
        const panel = el('div', 'panel');
        const closeBtn = el('button', 'ghost close', 'Close ✕');
        closeBtn.onclick = toggle;
        panel.append(closeBtn, el('h2', null, 'Satchel & Equipment'));
        panel.append(el('div', 'meta', `Level ${stats.level} · ${stats.gold ?? 0} gold · ${stats.glint ?? 0} glint · ${stats.inventory.length} / ${stats.getSatchelCapacity()} slots`));

        const cols = el('div', 'cols');
        const left = el('div');
        left.append(el('h3', null, 'Equipped'));
        for (const [slot, label] of SLOTS) {
            const id = stats.equipment[slot];
            const row = el('div', `slot${id ? '' : ' empty'}${selected?.slot === slot ? ' sel' : ''}`);
            row.append(el('span', 'lbl', label));
            if (id) { row.append(gem(ITEMS[id]?.color), el('span', null, ITEMS[id]?.name ?? id)); row.onclick = () => { selected = { from: 'slot', slot }; render(); }; }
            else row.append(el('span', null, '—'));
            left.append(row);
        }
        const right = el('div');
        right.append(el('h3', null, 'Satchel'));
        const grid = el('div', 'grid');
        stats.inventory.forEach(it => {
            const def = ITEMS[it.id];
            const tile = el('div', `item${selected?.from === 'bag' && selected.id === it.id ? ' sel' : ''}`);
            tile.append(gem(def?.color ?? it.color), el('span', null, def?.name ?? it.id));
            if (it.qty > 1) tile.append(el('span', 'qty', `×${it.qty}`));
            tile.onclick = () => { selected = { from: 'bag', id: it.id }; render(); };
            grid.append(tile);
        });
        for (let i = stats.inventory.length; i < stats.getSatchelCapacity(); i++) grid.append(el('div', 'item free'));
        right.append(grid);
        cols.append(left, right);
        panel.append(cols, detail());
        root.append(panel);
    }

    function detail() {
        const box = el('div', 'detail');
        const id = selected?.from === 'slot' ? stats.equipment[selected.slot] : selected?.id;
        const def = id && ITEMS[id];
        if (!def || (selected.from === 'bag' && !stats.inventory.some(i => i.id === id))) {
            box.append(el('div', 'desc', 'Choose an item to see what it does.'));
            return box;
        }
        const name = el('div', 'name');
        name.append(gem(def.color), document.createTextNode(def.name));
        box.append(name, el('div', 'desc', def.description ?? ''));
        const act = (label, fn, ghost = false) => {
            const b = el('button', ghost ? 'ghost' : null, label);
            b.onclick = () => { const r = fn(); if (r === false) hud.message('That will not fit in the satchel'); render(); };
            box.append(b);
        };
        const twoHands = d => weaponRules.WEAPON_TYPES[weaponRules.typeOf(d)]?.hands === 2;
        if (selected.from === 'slot') {
            act('Unequip', () => { const ok = stats.unequipItem(selected.slot); if (ok) selected = null; return ok; });
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
                });
            }
        } else {
            if (def.slot === 'weapon') {
                if (twoHands(def)) act('Equip — both hands', () => stats.equipItem(id, 'main'));
                else { act('Equip — right hand', () => stats.equipItem(id, 'main')); act('Equip — left hand', () => stats.equipItem(id, 'off')); }
            } else if (def.slot) {
                act('Equip', () => stats.equipItem(id));
            } else if (def.onUse) {
                act('Use', () => {
                    const before = stats.level;
                    const ok = stats.useItem(id);
                    if (!ok) { hud.message('Nothing happens'); return true; }
                    hud.message(`${def.name} used`);
                    if (stats.level > before) hud.banner(`Level ${stats.level}`);
                    return true;
                });
            }
            if (hotbar?.canHotbar(id)) act('To hotbar', () => { hotbar.assign(id); hud.message(`${def.name} on the hotbar`); return true; }, true);
            act('Drop', () => {   // amo's removeItem returns nothing, so check the satchel first
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
