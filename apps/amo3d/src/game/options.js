// Options (O / touch MENU → Options / the title's OPTIONS): graphics quality, music volume, text size, camera
// sensitivity and invert, FPS counter, and the controls for keyboard, touch and gamepad.
import { settings, setSetting } from '../engine/settings.js';
import { checkForUpdate, openDownload, latestKnown, lastError, VERSION } from './updates.js';
import { PRESETS, getTweaks, setTweaks } from '../engine/quality.js';

export function createOptions({ quality, onQuality, onApply, onFps, onOnline }) {
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
#options .close { float: right; }
#options .tabs { display: flex; gap: 4px; flex-wrap: wrap; margin: 4px 0 10px; border-bottom: 1px solid #c8963a55; padding-bottom: 8px; }
#options .tabs button { font: calc(15px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 7px 13px; border-radius: 9px 9px 0 0; }
#options .pending { margin: 12px 0 2px; padding: 10px 12px; border: 1px dashed #c8963a99; border-radius: 9px; display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: calc(15px * var(--ui, 1)); }`;
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

    // the graphics tweaks being edited (applied on reload); the preset they sit on
    let tw = getTweaks(), preset = quality.preset ?? quality.name, dirty = false;
    const cur = k => (k in tw ? tw[k] : PRESETS[preset][k]);
    const tweak = patch => { for (const [k, v] of Object.entries(patch)) { if (v === PRESETS[preset][k]) delete tw[k]; else tw[k] = v; } dirty = true; };
    const TABS = [['graphics', 'Graphics'], ['display', 'Display'], ['sound', 'Sound'], ['gameplay', 'Gameplay'], ['camera', 'Camera'], ['online', 'Online'], ['controls', 'Controls'], ['about', 'About']];
    let tab = (() => { try { return localStorage.getItem('amo3d.optTab') || 'graphics'; } catch { return 'graphics'; } })();

    function render() {
        root.textContent = '';
        const p = el('div', 'panel');
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle(false);
        p.append(close, el('h2', null, 'Options'));
        const bar = el('div', 'tabs');
        for (const [id, label] of TABS) { const b = el('button', id === tab ? 'on' : '', label); b.onclick = () => { tab = id; try { localStorage.setItem('amo3d.optTab', id); } catch { /* storage blocked */ } render(); }; bar.append(b); }
        p.append(bar);
        const T = id => tab === id;

        if (T('graphics')) {
            const custom = Object.keys(tw).length > 0;
            p.append(seg('Preset', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], custom ? null : preset, v => { preset = v; tw = {}; dirty = true; }));
            p.append(el('div', 'note', custom ? `Custom — based on ${PRESETS[preset].name}. Pick a preset to reset every setting below.` : 'A preset sets everything below; change any one of them to make it your own.'));
            p.append(el('h3', null, 'Detail'));
            p.append(seg('Resolution', [[0.75, 'Low'], [1, 'Normal'], [1.5, 'Sharp'], [2, 'Sharpest']], cur('pixelRatio'), v => tweak({ pixelRatio: v })));
            p.append(seg('View distance', [[0.6, 'Short'], [0.8, 'Medium'], [1, 'Far'], [1.3, 'Farthest']], cur('fogFar') <= 0.65 ? 0.6 : cur('fogFar') <= 0.85 ? 0.8 : cur('fogFar') <= 1.05 ? 1 : 1.3, v => tweak({ fogFar: v })));
            p.append(seg('Vegetation', [[0.2, 'Sparse'], [0.4, 'Light'], [0.7, 'Lush'], [1, 'Full']], cur('foliage') <= 0.25 ? 0.2 : cur('foliage') <= 0.5 ? 0.4 : cur('foliage') <= 0.8 ? 0.7 : 1, v => tweak({ foliage: v })));
            p.append(seg('Small decorations', [[false, 'Off'], [true, 'On']], !!cur('decor'), v => tweak({ decor: v })));
            p.append(el('div', 'note', 'Flowers, grass tufts and little plants.'));
            p.append(el('h3', null, 'Light and shadow'));
            const sh = !cur('shadows') ? 'off' : cur('shadowMap') <= 1024 ? 'low' : cur('shadowMap') <= 2048 ? 'medium' : 'high';
            p.append(seg('Shadows', [['off', 'Off'], ['low', 'Soft'], ['medium', 'Precise'], ['high', 'Very precise']], sh, v => tweak(v === 'off' ? { shadows: false } : { shadows: true, shadowMap: { low: 1024, medium: 2048, high: 4096 }[v], shadowRange: { low: 40, medium: 48, high: 72 }[v] })));
            p.append(seg('Lamps lit at once', [[4, '4'], [6, '6'], [8, '8'], [12, '12']], cur('lights'), v => tweak({ lights: v })));
            p.append(seg('Materials', [[true, 'Simple'], [false, 'Detailed']], !!cur('lite'), v => tweak({ lite: v })));
            p.append(seg('Smooth edges', [[false, 'Off'], [true, 'On']], !!cur('antialias'), v => tweak({ antialias: v })));
            p.append(el('h3', null, 'Effects'));
            p.append(seg('Particles in the air', [[0.3, 'Few'], [0.6, 'Some'], [1, 'Many']], cur('particles') <= 0.4 ? 0.3 : cur('particles') <= 0.85 ? 0.6 : 1, v => tweak({ particles: v })));
            p.append(el('div', 'note', 'Rain, snow, ash, motes and embers.'));
            if (dirty) {
                const box = el('div', 'pending'), go = el('button', null, 'Apply (reloads)');
                box.append(el('span', null, 'Graphics changes apply after a reload — your progress is saved first.'), go);
                go.onclick = () => { setTweaks(tw); onApply ? onApply(preset, tw) : onQuality(preset); };
                p.append(box);
            }
        }
        if (T('display')) {
        p.append(seg('Character models', [['classic', 'Classic'], ['new', 'New (test)']], settings.charModels ?? 'classic', v => setSetting('charModels', v)));
        p.append(el('div', 'note', 'New (test): the new hand-shaped models — Seraphina first. Applies to characters as they are next created (re-enter the map or reload).'));
        p.append(seg('Text size', [[1, 'Normal'], [1.15, 'Large'], [1.3, 'Larger']], settings.textSize, v => setSetting('textSize', v)));
        p.append(seg('Coordinates', [[false, 'Hidden'], [true, 'Shown']], settings.showCoords, v => setSetting('showCoords', v)));
        p.append(seg('Frames per second', [[false, 'Hidden'], [true, 'Shown']], settings.showFps, v => { setSetting('showFps', v); onFps?.(v); }));

        }
        if (T('sound')) {
        p.append(slider('Music', 'music', 0, 1, 0.05, v => `${Math.round(v * 100)}%`));
        p.append(slider('Effects', 'sfx', 0, 1, 0.05, v => `${Math.round(v * 100)}%`));

        }
        if (T('gameplay')) {
        p.append(seg('Fireball aim', [['camera', 'Where I look'], ['facing', 'Where Eldrin faces']], settings.aim ?? 'camera', v => setSetting('aim', v)));
        p.append(seg('Two-hand actions', [[true, 'On'], [false, 'Off (classic)']], settings.hands !== false, v => setSetting('hands', v)));
        p.append(seg('God mode (testing)', [[false, 'Off'], [true, 'On']], !!settings.god, v => setSetting('god', v)));
        p.append(el('div', 'note', 'God mode: no damage, endless mana and Vigor, every blow lands for 9999, falls don\'t hurt, and boss gates open (the world map can travel anywhere). Quests are left as they are.'));

        }
        if (T('camera')) {
        p.append(seg('Minimap', [[false, 'Turns with the camera'], [true, 'North up']], !!settings.miniNorth, v => setSetting('miniNorth', v)));
        p.append(slider('Turn speed', 'camSens', 0.4, 2, 0.1, v => `${v.toFixed(1)}×`));
        p.append(seg('Vertical', [[false, 'Normal'], [true, 'Inverted']], settings.invertY, v => setSetting('invertY', v)));

        }
        if (T('online')) {
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

        }
        if (T('about')) {
        // The app's version, and the newest release on GitHub (CI builds it from a tag; the download installs over this one).
        p.append(el('h3', null, 'Version'));
        const ver = el('div', 'note', `This is version ${VERSION}.`);
        const chk = el('button', null, 'Check for updates');
        chk.style.cssText = 'margin: 4px 0 8px; padding: 8px 14px; border-radius: 8px; font: inherit; cursor: pointer;';
        chk.onclick = async () => {
            ver.textContent = 'Asking GitHub…';
            const u = await checkForUpdate({ force: true });
            if (u) { ver.textContent = `Version ${u.version} is available.`; chk.textContent = `Download version ${u.version}`; chk.onclick = () => openDownload(u); }
            else ver.textContent = lastError() ? `Could not reach GitHub (${lastError()}).` : `You have the newest version${latestKnown() ? ` (${latestKnown()})` : ''}.`;
        };
        p.append(ver, chk);
        }
        if (T('controls')) {
        const keys = el('div', 'keys');
        const rows = touch() ? [
            ['Left half', 'move — push past the ring to sprint'], ['Right half', 'drag to turn the camera, pinch to zoom'],
            ['CAST / HIT / HOP', 'your spell, strike, hop (hop through a swing to dodge it)'], ['Double-tap HOP', 'Blink-Step (once learned)'], ['Skills', 'beside the action buttons, once learned'],
            ['MENU', 'satchel, hero, map, journal, codex, book, Aetheric Tear, chat, options, quit'], ['Back button', 'pause · save · quit'], ['Minimap', 'tap for the world map'], ['Prompt', 'tap it to talk, open, gather'],
        ] : [
            ['WASD', 'move'], ['Shift', 'sprint'], ['Space', 'hop (through a swing to dodge it)'], ['F / right-click', 'fireball'], ['Click / R', 'strike'],
            ['1–4', 'hotbar'], ['Z X V', 'style skills'], ['G', 'talk, open, gather'], ['I / Tab', 'satchel'], ['C', 'character'], ['M', 'map'],
            ['J', 'journal'], ['K', 'codex'], ['T', 'Aetheric Tear'], ['O', 'options'], ['B', 'the Book: skills, spells, styles'], ['Esc', 'pause · save · quit'], ['Enter', 'chat (online)'], ['H', 'Blink-Step (once learned)'], ['F1', 'controls card'], ['Drag mouse / wheel', 'turn / zoom the camera'], ['Q / E', 'turn the camera'],
            ['Gamepad', 'left stick move, right stick camera, A hop, RB/LT skills, Back Blink-Step'],
        ];
        for (const [k, d] of rows) keys.append(el('b', null, k), el('span', null, d));
        p.append(keys);
        }
        root.append(p);
    }
    function toggle(on = !root.classList.contains('open')) {
        root.classList.toggle('open', on);
        if (on) { tw = getTweaks(); preset = quality.preset ?? quality.name; dirty = false; render(); }
    }
    addEventListener('keydown', e => {
        if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName) && e.code !== 'Escape') return;
        if (e.code === 'KeyO' && !document.body.classList.contains('title-on')) toggle();
        else if (e.code === 'Escape' && root.classList.contains('open')) toggle(false);
    });
    return { toggle, get open() { return root.classList.contains('open'); } };
}
