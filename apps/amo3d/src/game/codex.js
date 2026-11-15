// The Codex (K / MENU → Codex): a book of creatures and places, bound in dark green, with an ink sketch of each
// creature (creatureSketch.js). Eldrin only notes what he meets out in the field; the pages are written up when he
// takes a moment — resting at a campfire, or sitting at a table indoors (G) — and some time passes. Until then a
// creature's page is a faint pencil sketch marked "to be written up", and a written page with new notes waiting
// says so. A written page has amo's bestiary entry (lore, threat, stats by level band, weaknesses, casts), how many
// he has beaten, what they dropped and where he met them. (A skill to keep it written up on its own: Field Notes —
// stats.skills.field_notes, when it exists, makes every note go straight onto the page.)
//   stats.flags.codex = { notes: { [kind]: { kills, places: [], drops: { id: n } } }, written: { same, as of the last write-up } }
import '@fontsource/im-fell-english/400.css';
import '@fontsource/caveat/500.css';
import { bestiary as BE, items as itemRules } from '@rules';
import { sketchSVG } from './creatureSketch.js';

const { ITEMS } = itemRules;
const nice = k => String(k).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export function createCodex({ stats, hud, getPlace = () => null }) {
    const css = document.createElement('style');
    css.textContent = `
#codex { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060ad0; color: #2e2010; font-family: 'IM Fell English', Georgia, serif; }
#codex.open { display: grid; }
#codex .tome { position: relative; width: min(1000px, 97vw); height: min(640px, calc(100vh - 34px)); margin-top: 26px; padding: 10px; box-sizing: border-box; border-radius: 10px 14px 14px 10px;
  background: linear-gradient(135deg, #24382a, #14241a 60%, #0c1810); box-shadow: 0 10px 40px #000c, inset 0 0 0 2px #4a6a4a, inset 0 0 0 5px #0c1810, inset 0 0 0 6px #b08040; }
#codex .pages { display: flex; height: 100%; border-radius: 4px; overflow: hidden; }
#codex .page { flex: 1; min-width: 0; overflow: auto; touch-action: pan-y; padding: 14px 18px 16px; box-sizing: border-box; background: radial-gradient(ellipse at 50% 40%, #f6ead0, #ecdcb6 70%, #dcc596);
  scrollbar-width: thin; scrollbar-color: #8a6a3a transparent; }
#codex .page.left { box-shadow: inset -26px 0 30px -18px #6a4a2066; } #codex .page.right { box-shadow: inset 26px 0 30px -18px #6a4a2066; }
#codex .spine { width: 3px; background: linear-gradient(90deg, #8a6a3a, #4a2e14, #8a6a3a); }
#codex .ribbons { position: absolute; left: 22px; top: -26px; display: flex; gap: 3px; align-items: flex-end; }
#codex .rib { height: 30px; padding: 0 12px 4px; border: 0; border-radius: 4px 4px 0 0; cursor: pointer; font: calc(14px * var(--ui, 1)) 'IM Fell English', Georgia, serif; color: #fff4dc; background: var(--rc); opacity: .82; transform: translateY(6px); }
#codex .rib.on { transform: none; opacity: 1; height: 36px; }
#codex .close { position: absolute; right: 10px; top: -24px; width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer; color: #f4d8b0; font: bold 18px Georgia, serif; background: radial-gradient(circle at 40% 35%, #b8342a, #6a1410); box-shadow: 0 2px 6px #000a; }
#codex h2 { margin: 0 0 2px; font-weight: normal; font-size: calc(26px * var(--ui, 1)); color: #24381e; }
#codex .sub { font-family: Caveat, cursive; font-size: calc(18px * var(--ui, 1)); color: #5a4228; margin-bottom: 6px; }
#codex .row { display: flex; align-items: center; gap: 10px; padding: 4px 6px; border-radius: 6px; cursor: pointer; }
#codex .row:hover { background: #8a6a3a1a; } #codex .row.sel { background: #4a6a3a2e; box-shadow: inset 3px 0 0 #3a5a2a; }
#codex .row .thumb { width: calc(64px * var(--ui, 1)); height: calc(38px * var(--ui, 1)); flex: none; }
#codex .row .thumb .sketch { width: 100%; height: 100%; }
#codex .row .nm { flex: 1; font-size: calc(18px * var(--ui, 1)); } #codex .row .nm small { display: block; font-family: Caveat, cursive; font-size: calc(16px * var(--ui, 1)); color: #6a5236; }
#codex .row.todo .nm { color: #8a7a6a; }
#codex .pen { font-family: Caveat, cursive; font-size: calc(16px * var(--ui, 1)); color: #8a3a1a; white-space: nowrap; }
#codex .big .sketch { width: 100%; max-height: 40vh; display: block; }
#codex .name { font-size: calc(26px * var(--ui, 1)); color: #24381e; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
#codex .threat { font-family: Caveat, cursive; font-size: calc(18px * var(--ui, 1)); color: #8a3a1a; }
#codex .hand { font-family: Caveat, cursive; font-size: calc(20px * var(--ui, 1)); line-height: 1.15; color: #2e2010; margin: 4px 0; white-space: pre-line; }
#codex .facts { font-size: calc(14px * var(--ui, 1)); color: #4a3a2a; border-top: 1px dashed #8a6a3a77; border-bottom: 1px dashed #8a6a3a77; padding: 4px 0; margin: 6px 0; white-space: pre-line; }
#codex h4 { margin: 8px 0 2px; font-weight: normal; font-style: italic; font-size: calc(16px * var(--ui, 1)); color: #3a5a2a; }
#codex .todoBox { margin: 8px 0; padding: 8px 10px; border: 1px dashed #8a3a1a; border-radius: 8px; background: #f3d88b33; font-family: Caveat, cursive; font-size: calc(19px * var(--ui, 1)); color: #6a2a10; }
@media (max-height: 480px) { #codex .tome { height: calc(100vh - 30px); margin-top: 28px; } #codex .page { padding: 10px 14px; } #codex .big .sketch { max-height: 32vh; } }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'codex';
    document.body.append(root);
    root.addEventListener('click', e => { if (e.target === root) toggle(); });
    let open = false, tab = 'creatures', sel = null, lastKill = null;
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const svg = html => { const s = document.createElement('span'); s.innerHTML = html; return s.firstChild; };   // our own generated SVG only

    // ---- the notes ----
    const book = () => {
        const f = (stats.flags ??= {});
        if (!f.codex) {   // a save from before the notes: what amo already records counts as written up
            const notes = {};
            for (const k of new Set([...(stats.killedEnemyTypes ?? []), ...(stats.seenEnemyTypes ?? [])])) if (k !== 'deer') notes[k] = { kills: stats.killCounts?.[k] ?? 0, places: [], drops: {} };
            f.codex = { notes, written: JSON.parse(JSON.stringify(notes)) };
        }
        f.codex.notes ??= {}; f.codex.written ??= {};
        return f.codex;
    };
    const auto = () => (stats.skills?.field_notes?.level ?? 0) > 0;
    const clone = o => JSON.parse(JSON.stringify(o));
    function note(kind, fn) {
        if (!kind || kind === 'deer') return;
        const c = book(), n = (c.notes[kind] ??= { kills: 0, places: [], drops: {} });
        fn(n);
        const place = getPlace();
        if (place && !n.places.includes(place)) n.places.push(place);
        if (auto()) c.written[kind] = clone(n);
        if (open) render();
    }
    const fresh = kind => { const c = book(); return JSON.stringify(c.notes[kind] ?? null) !== JSON.stringify(c.written[kind] ?? null); };
    const pending = () => Object.keys(book().notes).filter(fresh).length;
    // Write every note onto its page; returns how many pages changed.
    function writeUp() { const c = book(), n = pending(); for (const k of Object.keys(c.notes)) c.written[k] = clone(c.notes[k]); return n; }

    // ---- the pages ----
    function entryOf(kind, w) {   // amo's bestiary text for a beaten creature, as of the written page
        const band = { min: Math.max(1, stats.level - 1), max: stats.level + 1 };
        const [e] = BE.bestiaryEntries({ killed: [kind], seen: [], killCounts: { [kind]: w.kills }, band });
        const lore = BE.BESTIARY_LORE?.[kind];
        const lines = (e?.text ?? '').split('\n').filter(l => !l.startsWith('Killed:') && !l.startsWith('Drops:') && l !== lore?.desc);
        return { title: lore?.name ?? (e?.title && e.title !== '???' ? e.title : nice(kind)), threat: lore?.threat ?? e?.threat, desc: lore?.desc ?? '', facts: lines.join('\n') };
    }
    function creatures(L, R) {
        const c = book(), kinds = Object.keys(c.notes);
        L.append(el('h2', null, 'Creatures'));
        const p = pending();
        L.append(el('div', 'sub', p ? `${p} page${p > 1 ? 's' : ''} to write up — rest at a campfire, or sit at a table indoors.` : kinds.length ? 'Every page is written up.' : 'Nothing met yet.'));
        for (const k of kinds) {
            const w = c.written[k], row = el('div', `row${sel === k ? ' sel' : ''}${w ? '' : ' todo'}`);
            const th = el('div', 'thumb'); th.append(svg(sketchSVG(k, { faint: !w }))); row.append(th);
            const nm = el('div', 'nm', w ? entryOf(k, w).title : 'Unknown creature');
            nm.append(el('small', null, w ? `${w.kills ? `${w.kills} beaten` : 'seen'}${w.places[0] ? ` · ${w.places[0]}` : ''}` : `seen near ${c.notes[k].places[0] ?? 'somewhere'}`));
            row.append(nm);
            if (fresh(k)) row.append(el('span', 'pen', '✎ to write up'));
            row.onclick = () => { sel = k; render(); };
            L.append(row);
        }
        if (!sel || !c.notes[sel]) sel = kinds[0] ?? null;
        page(R, sel);
    }
    function page(R, k) {
        if (!k) { R.append(el('div', 'hand', 'The pages are empty. What you meet out there will be noted here — sketched, named and written up when you take a moment.')); return; }
        const c = book(), w = c.written[k], n = c.notes[k];
        const big = el('div', 'big'); big.append(svg(sketchSVG(k, { faint: !w }))); R.append(big);
        if (!w) {
            R.append(el('div', 'name', 'Unknown creature'));
            R.append(el('div', 'todoBox', `Needs to be written up. Seen near ${n.places.join(', ') || 'somewhere'}${n.kills ? `, ${n.kills} beaten` : ''}. Rest at a campfire or sit at a table indoors to write your notes.`));
            return;
        }
        const e = entryOf(k, w), nm = el('div', 'name', e.title);
        if (e.threat) nm.append(el('span', 'threat', `threat: ${String(e.threat).toLowerCase()}`));
        R.append(nm);
        if (fresh(k)) R.append(el('div', 'todoBox', 'New notes waiting — write them up at a campfire or a table.'));
        if (e.desc) R.append(el('div', 'hand', e.desc));
        if (w.kills && e.facts) R.append(el('div', 'facts', e.facts));
        if (!w.kills) R.append(el('div', 'hand', 'Seen, never beaten — beat one to learn its strength and weaknesses.'));
        R.append(el('h4', null, 'Beaten'), el('div', 'hand', `${w.kills || 'none yet'}`));
        R.append(el('h4', null, 'Where I met them'), el('div', 'hand', w.places.join(' · ') || '—'));
        const drops = Object.entries(w.drops ?? {});
        R.append(el('h4', null, 'What they left behind'), el('div', 'hand', drops.length ? drops.map(([id, q]) => `${ITEMS[id]?.name ?? nice(id)} ×${q}`).join(' · ') : 'nothing found yet'));
    }
    function places(L, R) {
        const list = Object.keys(stats.flags ?? {}).filter(k => k.startsWith('visited:')).map(k => stats.flags[k]);
        L.append(el('h2', null, 'Places'), el('div', 'sub', `${list.length} visited`));
        const half = Math.ceil(list.length / 2);
        list.forEach((p, i) => (i < half ? L : R).append(el('div', 'hand', `· ${p}`)));
        if (!list.length) L.append(el('div', 'hand', '—'));
    }
    function render() {
        root.textContent = '';
        const tome = el('div', 'tome'), pages = el('div', 'pages'), L = el('div', 'page left'), R = el('div', 'page right');
        const close = el('button', 'close', '✕'); close.title = 'Close'; close.onclick = () => toggle();
        const rb = el('div', 'ribbons');
        for (const [id, label, col] of [['creatures', 'Creatures', '#3a5a2a'], ['places', 'Places', '#5a4a2a']]) { const b = el('button', `rib${tab === id ? ' on' : ''}`, label); b.style.setProperty('--rc', col); b.onclick = () => { tab = id; render(); }; rb.append(b); }
        (tab === 'places' ? places : creatures)(L, R);
        pages.append(L, el('div', 'spine'), R);
        tome.append(rb, pages, close);
        root.append(tome);
    }
    function toggle() { open = !open; root.classList.toggle('open', open); if (open) render(); }
    addEventListener('keydown', e => { if (e.code === 'KeyK') toggle(); else if (open && e.code === 'Escape') toggle(); });

    return {
        toggle, get open() { return open; },
        // A creature noticed you (engaged) — amo's "seen" list, and a note.
        seen(type) {
            if (!type || type === 'deer') return;
            stats.seenEnemyTypes ??= []; if (!stats.seenEnemyTypes.includes(type)) stats.seenEnemyTypes.push(type);
            const isNew = !book().notes[type];
            note(type, () => {});
            if (isNew && !auto()) hud?.message?.('A new creature — noted for the codex');
        },
        killed(type) { if (!type) return; stats.trackKill(type); note(type, n => { n.kills++; }); lastKill = { type, at: performance.now() }; },
        // Loot that fell from the creature just beaten.
        dropped(ids) { if (!lastKill || performance.now() - lastKill.at > 400 || !ids?.length) return; note(lastKill.type, n => { for (const id of ids) n.drops[id] = (n.drops[id] ?? 0) + 1; }); },
        visited(id, name) { (stats.flags ??= {})[`visited:${id}`] = name; },
        pending, writeUp,
    };
}
