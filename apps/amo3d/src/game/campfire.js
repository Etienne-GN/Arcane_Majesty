// Crafting stations — campfire, hearth, alchemy cauldron, workbench. Cooking at the campfire is amo's cooking: the recipes a fire allows (stations.availableRecipes over COOKING_RECIPES,
// scroll-locked ones hidden until learned), ingredients consumed from the satchel, the cooking rank
// from craftCounts and its double-output roll (craftRank, extraOutput). Rest restores and saves.
// The fire itself is a small code-built model with flames, embers and light.
import * as THREE from 'three';
import { items as itemRules, stations as St, recipeScrolls, craftingRecipes } from '@rules';
import { flat } from '../engine/lib.js';

const { ITEMS, COOKING_RECIPES, POTION_RECIPES } = itemRules;
const locked = recipeScrolls.isLocked;
// What each station makes (amo stations.js: a fire makes the simple dishes, the hearth everything
// cooked, the cauldron every potion; the workbench is amo's gear CRAFTING_RECIPES).
const MODES = {
    campfire:  { title: 'Campfire', verb: 'Cook', kind: 'cooking', rest: true, list: s => St.availableRecipes(COOKING_RECIPES, 'cooking', { station: null }, s.knownRecipes ?? [], locked) },
    hearth:    { title: 'The Hearth', verb: 'Cook', kind: 'cooking', list: s => St.availableRecipes(COOKING_RECIPES, 'cooking', { station: 'hearth', rank: 2 }, s.knownRecipes ?? [], locked) },
    alchemy:   { title: 'Alchemy', verb: 'Brew', kind: 'alchemy', list: s => St.availableRecipes(POTION_RECIPES, 'alchemy', { station: 'alchemy', rank: 2 }, s.knownRecipes ?? [], locked) },
    workbench: { title: 'Workbench', verb: 'Craft', kind: null, list: () => craftingRecipes.CRAFTING_RECIPES },
};
export const STATION_PROMPT = {
    portal: 'G — Step through the Obsidian Gate',
    mount: 'G — Ride your horse',
    boat: 'G — Board the boat',
    campfire: 'G — Cook or rest at the campfire', hearth: 'G — Cook at the hearth',
    alchemy: 'G — Brew at the cauldron', workbench: 'G — Craft at the workbench', chest: 'G — Open the chest', gate: 'G — Touch the monolith', sign: 'G — Read', cairn: 'G — Touch the cairn', board: 'G — Read the bounty board', desk: 'G — Sit and write up the codex',
};
const CSS = `
#camp { position: fixed; inset: 0; z-index: 8; display: none; place-items: center; background: #05060acc;
    font-family: Georgia, 'Times New Roman', serif; color: #eee6d2; }
#camp.open { display: grid; }
#camp .panel { width: min(760px, 94vw); max-height: 90vh; overflow: auto; padding: 18px 22px; border: 1px solid #ff9a4a66;
    border-radius: 14px; background: linear-gradient(160deg, #24160fee, #0e0a08f2); box-shadow: 0 10px 40px #000a, 0 0 60px #ff7a2a22; }
#camp h2 { margin: 0 0 4px; font-weight: normal; letter-spacing: .14em; font-size: calc(24px * var(--ui, 1)); color: #ffc27a; }
#camp .meta { font-size: calc(15px * var(--ui, 1)); opacity: .75; margin-bottom: 12px; }
#camp .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px; margin-bottom: 6px;
    border-radius: 8px; background: #ffffff0a; border: 1px solid #ffffff14; font-size: calc(16px * var(--ui, 1)); }
#camp .row.cant { opacity: .5; }
#camp .sub { font-size: calc(14px * var(--ui, 1)); opacity: .7; }
#camp .ok { color: #bfe6a0; } #camp .no { color: #ff9a8a; }
#camp button { font: calc(15px * var(--ui, 1)) Georgia, serif; color: #1b1406; background: #ffc27a; border: 0; border-radius: 7px; padding: 6px 14px; cursor: pointer; }
#camp button[disabled] { opacity: .4; cursor: default; }
#camp button.ghost { background: transparent; color: #eee6d2; border: 1px solid #eee6d255; }
#camp .top { display: flex; gap: 8px; float: right; }`;

export function buildCampfire(scene, at, groundY) {
    const g = new THREE.Group();
    g.position.set(at.x, groundY, at.z);
    for (let i = 0; i < 9; i++) {   // ring of stones
        const a = (i / 9) * Math.PI * 2;
        const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), flat(0x77736c));
        st.position.set(Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55);
        st.castShadow = true;
        g.add(st);
    }
    for (let i = 0; i < 4; i++) {   // crossed logs
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 6), flat(0x4a301c));
        l.position.y = 0.12;
        l.rotation.set(Math.PI / 2 - 0.25, (i / 4) * Math.PI, 0);
        g.add(l);
    }
    const flames = [0xffc04a, 0xff7a1a, 0xffa030].map((c, i) => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.03, 0.6, 6), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, toneMapped: false }));
        f.position.set((i - 1) * 0.08, 0.38, (i % 2) * 0.06);
        g.add(f);
        return f;
    });
    const light = new THREE.PointLight(0xff9a40, 18, 12, 1.6);
    light.position.set(0, 0.9, 0);
    g.add(light);
    g.userData.dynamic = true;   // flames animate: keep out of static batching
    scene.add(g);
    return {
        pos: g.position,
        update(t) {
            flames.forEach((f, i) => { f.scale.set(1, 0.75 + Math.abs(Math.sin(t * (7 + i * 2) + i)) * 0.6, 1); });
            light.intensity = 18 * (1 + Math.sin(t * 9) * 0.1 + Math.sin(t * 23) * 0.08);
        },
    };
}

export function createCampfire({ stats, hud, onRest, onCraft, codexPending = () => 0, onWriteCodex = null }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'camp';
    document.body.append(root);
    let open = false, mode = 'campfire';
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

    const needs = r => r.ingredients ?? [{ id: r.input, qty: 1 }];
    const canCook = r => needs(r).every(n => stats.countItem(n.id) >= n.qty);

    function cook(r) {
        if (!canCook(r)) return;
        const M = MODES[mode];
        for (const n of needs(r)) stats.removeItem(n.id, n.qty);
        const rank = M.kind ? St.craftRank(stats.craftCounts?.[M.kind] ?? 0) : 1;
        const bonus = M.kind && St.extraOutput(rank);
        const qty = (r.makes ?? 1) * (bonus ? 2 : 1);
        if (!stats.addItem(r.output, qty)) hud.message('Your satchel is full');
        if (M.kind) {
            stats.craftCounts = { cooking: 0, alchemy: 0, ...(stats.craftCounts ?? {}) };
            stats.craftCounts[M.kind]++;
        }
        onCraft?.(r.output);
        hud.message(bonus ? `${r.label} — a double batch` : r.label);
        render();
    }

    function render() {
        root.textContent = '';
        const panel = el('div', 'panel');
        const top = el('div', 'top');
        const M = MODES[mode];
        if (M.rest) {
            const rest = el('button', null, 'Rest by the fire');
            rest.onclick = () => { onRest(); hud.message('You rest. Health, mana and Vigor return. Game saved.'); render(); };
            top.append(rest);
            const n = codexPending();   // notes on creatures met, to write up in the codex by the fire
            if (n && onWriteCodex) { const w = el('button', null, `Write up the codex (${n} page${n > 1 ? 's' : ''})`); w.onclick = () => { onWriteCodex(); render(); }; top.append(w); }
        }
        const close = el('button', 'ghost', 'Close ✕');
        close.onclick = () => toggle();
        top.append(close);
        const meta = M.kind ? `${M.kind === 'cooking' ? 'Cooking' : 'Alchemy'} rank ${St.craftRank(stats.craftCounts?.[M.kind] ?? 0)} · ${stats.craftCounts?.[M.kind] ?? 0} made` : 'Gear, tools, arrows and quivers';
        panel.append(top, el('h2', null, M.title), el('div', 'meta', meta));
        const list = M.list(stats);
        const sorted = [...list].sort((a, b) => Number(canCook(b)) - Number(canCook(a)));
        for (const r of sorted) {
            const row = el('div', `row${canCook(r) ? '' : ' cant'}`);
            const left = el('div');
            left.append(el('div', null, r.label));
            const sub = el('div', 'sub');
            needs(r).forEach((n, i) => {
                if (i) sub.append(document.createTextNode(' · '));
                const have = stats.countItem(n.id);
                sub.append(el('span', have >= n.qty ? 'ok' : 'no', `${ITEMS[n.id]?.name ?? n.id} ${have}/${n.qty}`));
            });
            const desc = ITEMS[r.output]?.description;
            left.append(sub);
            if (desc) left.append(el('div', 'sub', desc));
            const b = el('button', null, M.verb);
            b.disabled = !canCook(r);
            b.onclick = () => cook(r);
            row.append(left, b);
            panel.append(row);
        }
        root.append(panel);
    }

    function toggle(m) {
        if (m && !open) mode = m;
        open = !open;
        root.classList.toggle('open', open);
        if (open) render();
    }
    addEventListener('keydown', e => { if (open && e.code === 'Escape') toggle(); });
    return { toggle, get open() { return open; } };
}
