// Storage chests — amo keeps each chest's items in stats.chestContents[key] (saved with the
// character by SaveManager). Two columns: click a satchel item to store it, a chest item to take it.
// Stacks merge on the chest side; taking goes through PlayerStats.addItem (satchel capacity applies).
import * as THREE from 'three';
import { items as itemRules } from '@rules';
import { flat } from '../engine/lib.js';

const { ITEMS } = itemRules;
const CHEST_SLOTS = 24;
const hex = c => `#${(c ?? 0x8855ff).toString(16).padStart(6, '0')}`;

export function buildChest(parent, x, y, z, ry = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    const wood = flat(0x6e4a2c), band = flat(0xc9a44c, { metalness: 0.6, roughness: 0.4 });
    const add = (geo, m, px, py, pz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.castShadow = o.receiveShadow = true; g.add(o); };
    add(new THREE.BoxGeometry(1.0, 0.5, 0.6), wood, 0, 0.25, 0);
    add(new THREE.CylinderGeometry(0.3, 0.3, 1.0, 10, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), wood, 0, 0.5, 0);
    for (const bx of [-0.38, 0.38]) add(new THREE.BoxGeometry(0.06, 0.82, 0.64), band, bx, 0.38, 0);
    add(new THREE.BoxGeometry(0.12, 0.14, 0.04), band, 0, 0.45, 0.31);
    parent.add(g);
    return g;
}

export function createChests({ stats, hud }) {
    const style = document.createElement('style');
    style.textContent = `
#chest { position: fixed; inset: 0; z-index: 8; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#chest.open { display: grid; }
#chest .panel { width: min(860px, 94vw); max-height: 90vh; overflow: auto; padding: 18px 22px; border: 1px solid #f3d88b66; border-radius: 14px;
    background: linear-gradient(160deg, #1b1720ee, #0e0c12f2); }
#chest h2 { margin: 0 0 10px; font-weight: normal; letter-spacing: .14em; font-size: calc(24px * var(--ui, 1)); color: #f3d88b; }
#chest .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
#chest h3 { margin: 0 0 8px; font-weight: normal; font-size: calc(14px * var(--ui, 1)); letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#chest .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 6px; }
#chest .item { position: relative; padding: 8px; border-radius: 8px; background: #ffffff0d; border: 1px solid #ffffff1a; cursor: pointer; font-size: calc(14px * var(--ui, 1)); min-height: 36px; }
#chest .item:hover { border-color: #f3d88b; }
#chest .free { opacity: .25; cursor: default; }
#chest .gem { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; transform: rotate(45deg); }
#chest .qty { position: absolute; right: 6px; bottom: 4px; font-size: calc(14px * var(--ui, 1)); opacity: .8; }
#chest .hint { font-size: calc(14px * var(--ui, 1)); opacity: .6; margin: 10px 0 0; }
#chest button { float: right; font: calc(15px * var(--ui, 1)) Georgia, serif; color: #eee6d2; background: transparent; border: 1px solid #eee6d255; border-radius: 7px; padding: 7px 14px; cursor: pointer; }
@media (max-width: 640px) { #chest .cols { grid-template-columns: 1fr; } }`;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'chest';
    document.body.append(root);
    let open = false, key = null, title = 'Chest';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const contents = () => (stats.chestContents[key] ??= []);

    function store(id) {
        const it = stats.inventory.find(i => i.id === id);
        if (!it) return;
        const box = contents();
        const def = ITEMS[id];
        const qty = def?.stackable ? it.qty : 1;
        const stack = def?.stackable && box.find(c => c.id === id);
        if (!stack && box.length >= CHEST_SLOTS) return hud.message('The chest is full');
        stats.removeItem(id, qty);
        if (stack) stack.qty += qty; else box.push({ id, qty });
        render();
    }
    function take(i) {
        const box = contents(), c = box[i];
        if (!c) return;
        const def = ITEMS[c.id];
        const qty = def?.stackable ? c.qty : 1;
        if (!stats.addItem(c.id, qty)) return hud.message('Your satchel is full');
        c.qty -= qty;
        if (c.qty <= 0) box.splice(i, 1);
        render();
    }

    function tile(id, qty, onClick) {
        const t = el('div', 'item');
        const g = el('span', 'gem'); g.style.background = hex(ITEMS[id]?.color);
        t.append(g, el('span', null, ITEMS[id]?.name ?? id));
        if (qty > 1) t.append(el('span', 'qty', `×${qty}`));
        t.onclick = onClick;
        return t;
    }

    function render() {
        root.textContent = '';
        const panel = el('div', 'panel');
        const close = el('button', null, 'Close ✕');
        close.onclick = () => toggle();
        panel.append(close, el('h2', null, title));
        const cols = el('div', 'cols');
        const left = el('div'), right = el('div');
        left.append(el('h3', null, `Satchel ${stats.inventory.length} / ${stats.getSatchelCapacity()}`));
        const lg = el('div', 'grid');
        stats.inventory.forEach(it => lg.append(tile(it.id, it.qty, () => store(it.id))));
        left.append(lg);
        const box = contents();
        right.append(el('h3', null, `Chest ${box.length} / ${CHEST_SLOTS}`));
        const rg = el('div', 'grid');
        box.forEach((c, i) => rg.append(tile(c.id, c.qty, () => take(i))));
        for (let i = box.length; i < Math.min(CHEST_SLOTS, box.length + 6); i++) rg.append(el('div', 'item free'));
        right.append(rg);
        cols.append(left, right);
        panel.append(cols, el('div', 'hint', 'Click an item in your satchel to store it; click one in the chest to take it.'));
        root.append(panel);
    }

    function toggle(chestKey, chestTitle) {
        if (!open && chestKey) { key = chestKey; title = chestTitle ?? 'Chest'; }
        open = !open;
        root.classList.toggle('open', open);
        if (open) render();
    }
    addEventListener('keydown', e => { if (open && e.code === 'Escape') toggle(); });
    return { toggle, get open() { return open; } };
}
