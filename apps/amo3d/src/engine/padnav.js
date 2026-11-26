import { padCapture } from './padmap.js';
// Gamepad in the menus (Phase 7): whenever a menu or panel is open (or the title menu is up), the D-pad or the
// left stick moves a gold focus ring to the nearest button in that direction, A presses it, B backs out
// (Escape), and left/right nudges a focused slider. Gameplay input is paused while a menu is open, so the
// two never fight.
const PANELS = ['#pause.open', '#options.open', '#book.open', '#skillbook.open', '#slots.open', '#bounty.open', '#inv.open', '#sheet.open', '#journal.open', '#codex.open', '#shop.open',
    '#chest.open', '#camp.open', '#travel.open', '#worldmap.open', '#dlg.open', '#tmenu.open', '#titlescreen.menu-on'];

export function createPadNav() {
    const css = document.createElement('style');
    css.textContent = '.padfocus { outline: 3px solid #f3d88b !important; outline-offset: 2px; box-shadow: 0 0 16px #f3a84a88 !important; }';
    document.head.append(css);
    let prev = [], focus = null, repeatT = 0, lastDir = null, shown = null, since = 0;

    const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    function panel() { for (const s of PANELS) { const p = document.querySelector(s); if (p) return p; } return null; }
    // Buttons, sliders, and anything the menus made clickable (item tiles, slots, recipe rows set onclick).
    function targets(p) { return [...p.querySelectorAll('*')].filter(e => (e.matches('button:not([disabled]), input[type=range]') || typeof e.onclick === 'function') && visible(e)); }
    function setFocus(e) {
        focus?.classList.remove('padfocus');
        focus = e;
        if (e) { e.classList.add('padfocus'); e.scrollIntoView?.({ block: 'nearest' }); if (e.focus) e.focus({ preventScroll: true }); }
    }
    function move(list, dx, dy) {
        if (!focus || !list.includes(focus)) return setFocus(list[0] ?? null);
        const a = focus.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
        let best = null, bs = Infinity;
        for (const e of list) {
            if (e === focus) continue;
            const r = e.getBoundingClientRect(), x = r.left + r.width / 2 - ax, y = r.top + r.height / 2 - ay;
            const along = x * dx + y * dy, across = Math.abs(x * dy - y * dx);
            if (along <= 4) continue;
            const score = along + across * 2.5;
            if (score < bs) { bs = score; best = e; }
        }
        if (best) setFocus(best);
    }

    function poll(dt) {
        const pad = [...(navigator.getGamepads?.() ?? [])].find(Boolean);
        if (!pad) return;
        const p = panel();
        const b = pad.buttons.map(x => x.pressed), was = prev, edge = i => b[i] && !was[i];
        prev = b;
        if (padCapture.on) return;   // the mapping screen is waiting for a button (engine/padmap.js)
        if (!p) { if (focus) setFocus(null); shown = null; return; }
        if (p !== shown) { shown = p; since = 0; }   // a panel just opened: ignore the press that opened it
        since += dt;
        if (since < 0.25) return;
        const list = targets(p);
        if (focus && !list.includes(focus)) setFocus(null);
        if (!focus && list.length) setFocus(list.find(e => e === document.activeElement) ?? list[0]);
        // Direction: D-pad (12–15) or the left stick, with a held-key repeat.
        const ax = pad.axes[0] ?? 0, ay = pad.axes[1] ?? 0;
        const dir = b[12] || ay < -0.6 ? 'up' : b[13] || ay > 0.6 ? 'down' : b[14] || ax < -0.6 ? 'left' : b[15] || ax > 0.6 ? 'right' : null;
        repeatT -= dt;
        if (dir && (dir !== lastDir || repeatT <= 0)) {
            repeatT = dir === lastDir ? 0.12 : 0.35;
            if (focus?.type === 'range' && (dir === 'left' || dir === 'right')) {
                const step = +focus.step || 1;
                focus.value = String(+focus.value + (dir === 'right' ? step : -step));
                focus.dispatchEvent(new Event('input', { bubbles: true }));
            } else move(list, dir === 'left' ? -1 : dir === 'right' ? 1 : 0, dir === 'up' ? -1 : dir === 'down' ? 1 : 0);
        }
        lastDir = dir;
        if (edge(0) && focus) { const f = focus; setFocus(null); f.click(); }   // A
        else if (edge(0) && p.id === 'dlg') p.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));   // A with no choices: next line
        if (edge(1)) dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));   // B
    }
    let last = performance.now();
    setInterval(() => { const now = performance.now(); poll(Math.min(0.1, (now - last) / 1000)); last = now; }, 33);   // ~30 Hz is plenty for menus
}
