// The save slots screen (title → SAVE SLOTS, or when a new game finds every slot full): each slot shows who,
// how far, where and when, with Play / New / Delete (delete asks once more).
import { SLOTS, slotInfo, setActiveSlot, deleteSave, activeSlot } from './save.js';

export function createSlots({ onPlay, onNew }) {
    const css = document.createElement('style');
    css.textContent = `
#slots { position: fixed; inset: 0; z-index: 25; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#slots.open { display: grid; }
#slots .panel { width: min(620px, 94vw); max-height: 90vh; overflow: auto; padding: 18px 22px; border: 1px solid #f3d88b66; border-radius: 14px; background: linear-gradient(160deg, #1c1824f4, #0d0b12f8); }
#slots h2 { margin: 0 0 4px; font-weight: normal; letter-spacing: .16em; color: #f3d88b; font-size: calc(24px * var(--ui, 1)); }
#slots .sub { font-size: calc(15px * var(--ui, 1)); opacity: .7; margin-bottom: 12px; }
#slots .s { display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 8px; border-radius: 10px; background: #ffffff0a; border: 1px solid #ffffff18; }
#slots .s.active { border-color: #f3d88b88; }
#slots .n { font-size: calc(26px * var(--ui, 1)); color: #f3d88b; min-width: 1.4em; text-align: center; }
#slots .info { flex: 1; }
#slots .t { font-size: calc(18px * var(--ui, 1)); } #slots .d { font-size: calc(14px * var(--ui, 1)); opacity: .7; margin-top: 2px; }
#slots .b { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
#slots button { font: calc(15px * var(--ui, 1)) Georgia, serif; padding: 8px 12px; border-radius: 8px; border: 1px solid #eee6d244; background: #ffffff0a; color: #eee6d2; cursor: pointer; }
#slots button.go { border-color: #f3d88b; background: #3a2a14; color: #fff3d0; }
#slots button.del { border-color: #a8443a88; color: #ffb0a0; }
#slots .close { float: right; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'slots';
    document.body.append(root);
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    let armed = -1, purpose = 'manage';

    function render() {
        root.textContent = '';
        const p = el('div', 'panel');
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle(false);
        p.append(close, el('h2', null, 'Save Slots'), el('div', 'sub', purpose === 'new' ? 'Every slot holds a journey. Choose one to start over in — its save will be replaced.' : 'Choose a journey to continue, or start a new one in any slot.'));
        SLOTS.forEach((_, i) => {
            const info = slotInfo(i), row = el('div', `s${i === activeSlot() ? ' active' : ''}`), b = el('div', 'b');
            const meta = el('div', 'info');
            meta.append(el('div', 't', info ? `${info.name} · Level ${info.level}` : 'Empty'), el('div', 'd', info ? `${info.place} · ${info.when}` : 'No journey here yet'));
            if (info && purpose !== 'new') { const play = el('button', 'go', 'Play'); play.onclick = () => { setActiveSlot(i); onPlay(i); }; b.append(play); }
            const nw = el('button', info ? '' : 'go', info ? 'New' : 'Start'); nw.onclick = () => { setActiveSlot(i); onNew(i); }; b.append(nw);
            if (info) {
                const del = el('button', 'del', armed === i ? 'Really delete?' : 'Delete');
                del.onclick = () => { if (armed === i) { deleteSave(i); armed = -1; } else armed = i; render(); };
                b.append(del);
            }
            row.append(el('div', 'n', String(i + 1)), meta, b);
            p.append(row);
        });
        root.append(p);
    }
    function toggle(on = !root.classList.contains('open'), why = 'manage') {
        purpose = why; armed = -1;
        root.classList.toggle('open', on);
        if (on) render();
    }
    addEventListener('keydown', e => { if (e.code === 'Escape' && root.classList.contains('open')) toggle(false); });
    return { toggle, get open() { return root.classList.contains('open'); } };
}
