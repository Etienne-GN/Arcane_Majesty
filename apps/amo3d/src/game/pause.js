// The pause / quit menu (Esc with nothing else open, MENU → Quit, Android back): Resume, Options, Save, Return to the
// title, Quit the game. Quitting always saves first; on Android it closes the app, in a browser it goes back
// to the title (a page cannot close itself).
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function createPause({ save, hud, onOptions = null }) {
    const css = document.createElement('style');
    css.textContent = `
#pause { position: fixed; inset: 0; z-index: 26; display: none; place-items: center; background: #05060ad8; font-family: Georgia, serif; color: #eee6d2; }
#pause.open { display: grid; }
#pause .panel { width: min(360px, 90vw); padding: 20px 22px; border: 1px solid #f3d88b66; border-radius: 14px; background: linear-gradient(160deg, #1c1824f4, #0d0b12f8); text-align: center; }
#pause h2 { margin: 0 0 14px; font-weight: normal; letter-spacing: .22em; color: #f3d88b; font-size: calc(24px * var(--ui, 1)); }
#pause button { display: block; width: 100%; margin: 8px 0; padding: 12px; font: calc(18px * var(--ui, 1)) Georgia, serif; letter-spacing: .08em; color: #f3e2b0; background: #2a1c10; border: 1px solid #f3d88b66; border-radius: 9px; cursor: pointer; }
#pause button.quit { border-color: #c8443a88; color: #ffb0a0; background: #2a1010; }
#pause .note { font-size: calc(14px * var(--ui, 1)); opacity: .65; margin-top: 8px; min-height: 1.2em; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'pause';
    document.body.append(root);
    const native = Capacitor.isNativePlatform();
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const note = el('div', 'note');

    function render() {
        root.textContent = '';
        const p = el('div', 'panel');
        p.append(el('h2', null, 'PAUSED'));
        const btn = (label, fn, cls) => { const b = el('button', cls, label); b.onclick = fn; p.append(b); };
        btn('Resume', () => toggle(false));
        if (onOptions) btn('Options', () => { toggle(false); onOptions(); });   // (2026-11-27, the user: "on PC I can't reach the options in game: Esc doesn't offer it")
        btn('Save', () => { note.textContent = save() ? 'Saved.' : 'Could not save.'; });
        btn('Return to the title', () => { save(); location.href = location.pathname; });
        btn(native ? 'Quit the game' : 'Quit to the title', () => { save(); if (native) App.exitApp(); else location.href = location.pathname; }, 'quit');
        note.textContent = '';
        p.append(note);
        root.append(p);
    }
    function toggle(on = !root.classList.contains('open')) {
        root.classList.toggle('open', on);
        if (on) render();
    }
    // Esc: closes whatever is open first (each menu handles that); with nothing open, the pause menu.
    // An Esc that closes a menu must not also open this one, whatever order the key handlers run in: remember
    // when another menu was last seen open, and only open on an Esc pressed with nothing open for a moment.
    let otherOpenAt = 0;
    const othersOpen = () => [...document.querySelectorAll('.open')].some(e => e !== root);
    setInterval(() => { if (othersOpen()) otherOpenAt = performance.now(); }, 60);
    addEventListener('keydown', e => {
        if (e.code !== 'Escape' || document.body.classList.contains('title-on')) return;
        if (root.classList.contains('open')) { toggle(false); return; }
        if (othersOpen() || performance.now() - otherOpenAt < 200 || document.activeElement?.tagName === 'INPUT') return;
        toggle(true);
    }, true);
    // Android back: close the top menu, else open (or close) the pause menu.
    if (native) App.addListener('backButton', () => {
        const open = [...document.querySelectorAll('.open')].filter(e => e !== root);
        if (open.length) dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }));
        else toggle();
    });
    return { toggle, get open() { return root.classList.contains('open'); } };
}
