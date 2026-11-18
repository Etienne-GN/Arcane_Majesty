// The saves screen (title → SAVES): a free list in your own order. Each save shows its label (or its id), the
// hero, level, place and time; Play / Start, Rename, Copy, ▲ ▼ to move it, Delete (asks once more). "New save"
// adds an empty one at the end.
import { listSaves, slotInfo, setActiveSlot, deleteSave, activeSlot, addSave, copySave, labelSave, moveSave } from './save.js';

export function createSlots({ onPlay, onNew }) {
    const css = document.createElement('style');
    css.textContent = `
#slots { position: fixed; inset: 0; z-index: 25; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#slots.open { display: grid; }
#slots .panel { width: min(680px, 94vw); max-height: 90vh; overflow: auto; padding: 18px 22px; border: 1px solid #f3d88b66; border-radius: 14px; background: linear-gradient(160deg, #1c1824f4, #0d0b12f8); }
#slots h2 { margin: 0 0 4px; font-weight: normal; letter-spacing: .16em; color: #f3d88b; font-size: calc(24px * var(--ui, 1)); }
#slots .sub { font-size: calc(15px * var(--ui, 1)); opacity: .7; margin-bottom: 12px; }
#slots .s { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-bottom: 8px; border-radius: 10px; background: #ffffff0a; border: 1px solid #ffffff18; }
#slots .s.active { border-color: #f3d88b88; }
#slots .mv { display: flex; flex-direction: column; gap: 3px; }
#slots .mv button { padding: 2px 8px; font-size: calc(12px * var(--ui, 1)); line-height: 1.2; }
#slots .info { flex: 1; min-width: 0; }
#slots .t { font-size: calc(18px * var(--ui, 1)); color: #f3e2b0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#slots .t small { font-size: calc(13px * var(--ui, 1)); opacity: .55; margin-left: 8px; letter-spacing: .06em; }
#slots .d { font-size: calc(14px * var(--ui, 1)); opacity: .7; margin-top: 2px; }
#slots .b { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; max-width: 46%; }
#slots button { font: calc(15px * var(--ui, 1)) Georgia, serif; padding: 7px 11px; border-radius: 8px; border: 1px solid #eee6d244; background: #ffffff0a; color: #eee6d2; cursor: pointer; }
#slots button[disabled] { opacity: .3; cursor: default; }
#slots button.go { border-color: #f3d88b; background: #3a2a14; color: #fff3d0; }
#slots button.del { border-color: #a8443a88; color: #ffb0a0; }
#slots input.lbl { font: calc(16px * var(--ui, 1)) Georgia, serif; width: 100%; box-sizing: border-box; padding: 5px 8px; color: #fff; background: #0b0a10; border: 1px solid #f3d88b; border-radius: 6px; }
#slots .add { width: 100%; margin-top: 4px; padding: 10px; border-style: dashed; }
#slots .close { float: right; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'slots';
    document.body.append(root);
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    let armed = null, editing = null;

    function render() {
        root.textContent = '';
        const p = el('div', 'panel'), list = listSaves(), active = activeSlot();
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle(false);
        p.append(close, el('h2', null, 'Saves'), el('div', 'sub', 'Your journeys, in your order. Name them, copy one before a risky choice, or start a new one.'));
        list.forEach((entry, i) => {
            const info = slotInfo(entry.id), row = el('div', `s${entry.id === active ? ' active' : ''}`);
            const mv = el('div', 'mv');
            const up = el('button', null, '▲'); up.disabled = i === 0; up.onclick = () => { moveSave(entry.id, -1); render(); };
            const dn = el('button', null, '▼'); dn.disabled = i === list.length - 1; dn.onclick = () => { moveSave(entry.id, 1); render(); };
            mv.append(up, dn);
            const meta = el('div', 'info');
            if (editing === entry.id) {
                const inp = el('input', 'lbl'); inp.value = entry.label; inp.placeholder = entry.id; inp.maxLength = 40;
                const done = () => { labelSave(entry.id, inp.value); editing = null; render(); };
                inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') done(); if (e.key === 'Escape') { editing = null; render(); } };
                inp.onblur = done;
                meta.append(inp);
                setTimeout(() => inp.focus(), 0);
            } else {
                const t = el('div', 't', info.name);
                if (entry.label) t.append(el('small', null, entry.id));
                meta.append(t);
            }
            meta.append(el('div', 'd', info.empty ? 'Empty — no journey yet' : `${info.hero} · Level ${info.level} · ${info.place} · ${info.when}`));
            const b = el('div', 'b');
            const play = el('button', 'go', info.empty ? 'Start' : 'Play');
            play.onclick = () => { setActiveSlot(entry.id); toggle(false); info.empty ? onNew(entry.id) : onPlay(entry.id); };
            const ren = el('button', null, 'Rename'); ren.onclick = () => { editing = entry.id; render(); };
            const cp = el('button', null, 'Copy'); cp.disabled = !!info.empty; cp.onclick = () => { copySave(entry.id); render(); };
            const del = el('button', 'del', armed === entry.id ? 'Really delete?' : 'Delete');
            del.onclick = () => { if (armed === entry.id) { deleteSave(entry.id); armed = null; } else armed = entry.id; render(); };
            b.append(play, ren, cp, del);
            row.append(mv, meta, b);
            p.append(row);
        });
        const add = el('button', 'add', '＋ New save'); add.onclick = () => { addSave(); render(); };
        p.append(add);
        root.append(p);
    }
    function toggle(on = !root.classList.contains('open')) {
        armed = null; editing = null;
        root.classList.toggle('open', on);
        if (on) render();
    }
    addEventListener('keydown', e => { if (e.code === 'Escape' && root.classList.contains('open') && !editing) toggle(false); });
    return { toggle, get open() { return root.classList.contains('open'); } };
}
