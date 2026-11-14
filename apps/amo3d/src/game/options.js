// Options (O / touch MENU → Options / the title's OPTIONS): graphics quality, music volume, text size, camera
// sensitivity and invert, FPS counter, and the controls for keyboard, touch and gamepad.
import { settings, setSetting } from '../engine/settings.js';

export function createOptions({ quality, onQuality, onFps, onOnline }) {
    const css = document.createElement('style');
    css.textContent = `
#options { position: fixed; inset: 0; z-index: 25; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#options.open { display: grid; }
#options .panel { width: min(640px, 94vw); max-height: 90vh; overflow: auto; padding: 18px 22px; border: 1px solid #f3d88b66; border-radius: 14px; background: linear-gradient(160deg, #1c1824f4, #0d0b12f8); }
#options h2 { margin: 0 0 8px; font-weight: normal; letter-spacing: .16em; color: #f3d88b; font-size: calc(24px * var(--ui, 1)); }
#options h3 { margin: 16px 0 8px; font-weight: normal; font-size: calc(14px * var(--ui, 1)); letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#options .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #ffffff10; font-size: calc(16px * var(--ui, 1)); }
#options .seg { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
#options .seg button, #options .close { font: calc(15px * var(--ui, 1)) Georgia, serif; padding: 8px 14px; border-radius: 8px; border: 1px solid #eee6d244; background: #ffffff0a; color: #eee6d2; cursor: pointer; }
#options .seg button.on { border-color: #f3d88b; background: #f3d88b33; color: #fff3d0; }
#options input[type=range] { width: min(220px, 40vw); accent-color: #f3d88b; }
#options .val { min-width: 3.5em; text-align: right; opacity: .8; font-size: calc(15px * var(--ui, 1)); }
#options .note { font-size: calc(14px * var(--ui, 1)); opacity: .65; margin-top: 4px; }
#options .keys { display: grid; grid-template-columns: auto 1fr; gap: 4px 14px; font-size: calc(15px * var(--ui, 1)); }
#options .keys b { color: #f3d88b; font-weight: normal; white-space: nowrap; }
#options .close { float: right; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'options';
    document.body.append(root);
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const touch = () => document.body.classList.contains('touch-mode');

    function seg(label, choices, current, pick) {
        const row = el('div', 'row'), s = el('div', 'seg');
        row.append(el('span', null, label), s);
        for (const [value, text] of choices) {
            const b = el('button', value === current ? 'on' : '', text);
            b.onclick = () => { pick(value); render(); };
            s.append(b);
        }
        return row;
    }
    function slider(label, key, min, max, step, fmt) {
        const row = el('div', 'row'), wrap = el('div', 'seg'), r = el('input'), v = el('span', 'val', fmt(settings[key]));
        Object.assign(r, { type: 'range', min, max, step, value: settings[key] });
        r.oninput = () => { setSetting(key, +r.value); v.textContent = fmt(+r.value); };
        wrap.append(r, v);
        row.append(el('span', null, label), wrap);
        return row;
    }

    function render() {
        root.textContent = '';
        const p = el('div', 'panel');
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle(false);
        p.append(close, el('h2', null, 'Options'));

        p.append(el('h3', null, 'Display'));
        p.append(seg('Graphics', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], quality.name, v => { if (v !== quality.name) onQuality(v); }));
        p.append(el('div', 'note', 'Changing graphics reloads the game (your progress is saved first).'));
        p.append(seg('Text size', [[1, 'Normal'], [1.15, 'Large'], [1.3, 'Larger']], settings.textSize, v => setSetting('textSize', v)));
        p.append(seg('Frames per second', [[false, 'Hidden'], [true, 'Shown']], settings.showFps, v => { setSetting('showFps', v); onFps?.(v); }));

        p.append(el('h3', null, 'Sound'));
        p.append(slider('Music', 'music', 0, 1, 0.05, v => `${Math.round(v * 100)}%`));

        p.append(el('h3', null, 'Combat'));
        p.append(seg('Fireball aim', [['camera', 'Where I look'], ['facing', 'Where Eldrin faces']], settings.aim ?? 'camera', v => setSetting('aim', v)));
        p.append(seg('God mode (testing)', [[false, 'Off'], [true, 'On']], !!settings.god, v => setSetting('god', v)));
        p.append(el('div', 'note', 'God mode: no damage, endless mana and Vigor, every blow lands for 9999, falls don\'t hurt, and boss gates open (the world map can travel anywhere). Quests are left as they are.'));

        p.append(el('h3', null, 'Camera'));
        p.append(slider('Turn speed', 'camSens', 0.4, 2, 0.1, v => `${v.toFixed(1)}×`));
        p.append(seg('Vertical', [[false, 'Normal'], [true, 'Inverted']], settings.invertY, v => setSetting('invertY', v)));

        p.append(el('h3', null, 'Online'));
        const field = (label, key, ph) => {
            const row = el('div', 'row'), inp = el('input');
            Object.assign(inp, { type: 'text', value: settings[key] ?? '', placeholder: ph, maxLength: 60 });
            inp.style.cssText = 'width:min(240px,46vw);padding:7px 9px;font:inherit;color:#fff;background:#0b0a10;border:1px solid #eee6d244;border-radius:7px';
            inp.onchange = () => setSetting(key, inp.value.trim());
            row.append(el('span', null, label), inp);
            return row;
        };
        p.append(field('Your name', 'onlineName', 'your hero\'s name'));
        p.append(field('Server', 'server', `${location.hostname || 'address'}:3003`));
        p.append(seg('Play online', [[false, 'Off'], [true, 'On']], !!settings.online, v => { setSetting('online', v); onOnline?.(v); }));
        p.append(el('div', 'note', 'Everyone on the same server and the same map sees each other. Start the server with npm run server on the host.'));

        p.append(el('h3', null, 'Controls'));
        const keys = el('div', 'keys');
        const rows = touch() ? [
            ['Left half', 'move — push past the ring to sprint'], ['Right half', 'drag to turn the camera, pinch to zoom'],
            ['FIRE / HIT / HOP', 'fireball, strike, hop (hop through a swing to dodge it)'], ['Skills', 'beside the action buttons, once learned'],
            ['MENU', 'satchel, hero, map, journal, codex, Aetheric Tear, chat, options'], ['Minimap', 'tap for the world map'], ['Prompt', 'tap it to talk, open, gather'],
        ] : [
            ['WASD', 'move'], ['Shift', 'sprint'], ['Space', 'hop (through a swing to dodge it)'], ['F / right-click', 'fireball'], ['Click / R', 'strike'],
            ['1–4', 'hotbar'], ['Z X V', 'style skills'], ['G', 'talk, open, gather'], ['I / Tab', 'satchel'], ['C', 'character'], ['M', 'map'],
            ['J', 'journal'], ['K', 'codex'], ['T', 'Aetheric Tear'], ['O', 'options'], ['Enter', 'chat (online)'], ['H', 'controls card'], ['Drag mouse / wheel', 'turn / zoom the camera'], ['Q / E', 'turn the camera'],
            ['Gamepad', 'left stick move, right stick camera, A hop, RB/LT skills'],
        ];
        for (const [k, d] of rows) keys.append(el('b', null, k), el('span', null, d));
        p.append(keys);
        root.append(p);
    }
    function toggle(on = !root.classList.contains('open')) {
        root.classList.toggle('open', on);
        if (on) render();
    }
    addEventListener('keydown', e => {
        if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) && e.code !== 'Escape') return;
        if (e.code === 'KeyO' && !document.body.classList.contains('title-on')) toggle();
        else if (e.code === 'Escape' && root.classList.contains('open')) toggle(false);
    });
    return { toggle, get open() { return root.classList.contains('open'); } };
}
