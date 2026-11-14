import { settings, onSettingChange } from '../engine/settings.js';
// Title screen & main menu (Phase 1.5). Rendered live: the camera drifts around Eldrin's tower in
// the vale's dusk mood, ARCANE MAJESTY rises in gold over a slowly turning sigil, embers float up,
// and "Echoes of Stone" plays (it starts on the first key/tap — browsers block sound before that).
// Continue / New Game fly the camera down to Eldrin and hand over control.
import * as THREE from 'three';
import { ELDRIN, toWorld } from '../content/eldrinVale.js';
import titleTrack from '../../media/title_echoes_of_stone.mp3?url';   // the master the user supplied

const VOLUME = 0.15;      // the title music plays at 15%
const PLAY_VOLUME = 0.01; // and stays at 1% once you are playing

const SIGIL = `<svg viewBox="-100 -100 200 200" width="100%" height="100%" fill="none" stroke="currentColor">
  <circle r="92" stroke-width="1.2"/><circle r="84" stroke-width=".6" stroke-dasharray="2 5"/>
  <circle r="58" stroke-width="1"/><circle r="30" stroke-width=".8"/>
  <polygon points="0,-84 72.7,42 -72.7,42" stroke-width=".9"/><polygon points="0,84 72.7,-42 -72.7,-42" stroke-width=".9"/>
  <g stroke-width="1.4">${Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${(Math.cos(a) * 62).toFixed(1)}" y1="${(Math.sin(a) * 62).toFixed(1)}" x2="${(Math.cos(a) * 80).toFixed(1)}" y2="${(Math.sin(a) * 80).toFixed(1)}"/>`; }).join('')}</g>
</svg>`;

const CSS = `
#titlescreen { position: fixed; inset: 0; z-index: 20; font-family: 'Cinzel', Georgia, 'Times New Roman', serif; color: #f3e2b0;
    background: radial-gradient(ellipse at 50% 55%, transparent 35%, #0a0610cc 100%), linear-gradient(180deg, #3a1a4a55, #ff8a3a22 55%, #10081888);
    transition: opacity 1.4s; overflow: hidden; user-select: none; }
#titlescreen.gone { opacity: 0; pointer-events: none; }
#titlescreen .sigil { position: absolute; left: 50%; top: 36%; width: min(62vh, 80vw); aspect-ratio: 1; transform: translate(-50%, -50%);
    color: #f3d88b; opacity: .22; animation: spin 90s linear infinite; filter: drop-shadow(0 0 6px #f3d88b); }
@keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
#titlescreen h1 { position: absolute; left: 0; right: 0; top: 30%; margin: 0; text-align: center; font-weight: normal;
    font-size: clamp(34px, 8vw, 96px); letter-spacing: .22em; text-indent: .22em;
    background: linear-gradient(180deg, #fff3c4 0%, #f3d88b 40%, #b8862e 75%, #6e4a14 100%); -webkit-background-clip: text; background-clip: text;
    color: transparent; filter: drop-shadow(0 2px 2px #000) drop-shadow(0 0 22px #f3a84a66);
    opacity: 0; transform: translateY(24px); transition: opacity 2.6s ease, transform 3s ease; }
#titlescreen.lit h1 { opacity: 1; transform: none; }
#titlescreen .sub { position: absolute; left: 0; right: 0; top: calc(30% + clamp(52px, 11vw, 128px)); text-align: center;
    letter-spacing: .5em; text-indent: .5em; font-size: clamp(11px, 1.6vw, 16px); color: #e8d6a8; opacity: 0; transition: opacity 2s 1.2s; }
#titlescreen.lit .sub { opacity: .85; }
#titlescreen .press { position: absolute; left: 0; right: 0; bottom: 18%; text-align: center; letter-spacing: .3em; font-size: calc(17px * var(--ui, 1));
    animation: breathe 2.4s ease-in-out infinite; }
@keyframes breathe { 50% { opacity: .35; } }
#titlescreen .menu { position: absolute; left: 0; right: 0; bottom: 12%; display: none; flex-direction: column; align-items: center; gap: 10px; }
#titlescreen.menu-on .menu { display: flex; }
#titlescreen.menu-on .press { display: none; }
/* With the menu up, the title glides to the top and shrinks so nothing overlaps (Phase 7). */
#titlescreen h1 { transition: opacity 2.6s ease, transform 3s ease, top .8s ease, font-size .8s ease; }
#titlescreen.menu-on h1 { top: 7%; font-size: clamp(28px, 5vw, 64px); }
#titlescreen.menu-on .sub { opacity: 0; }
#titlescreen.menu-on .sigil { top: 24%; width: min(36vh, 50vw); }
@media (max-height: 560px) {
    #titlescreen.menu-on h1 { top: 4%; font-size: clamp(24px, 4.2vw, 44px); }
    #titlescreen .menu { bottom: 6%; display: none; flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 760px; margin: 0 auto; }
    #titlescreen.menu-on .menu { display: flex; }
    #titlescreen .menu button { min-width: 300px; padding: 9px 18px; }
}
#titlescreen .menu button { min-width: 240px; padding: 11px 26px; font: calc(19px * var(--ui, 1)) Georgia, serif; letter-spacing: .18em; color: #f3e2b0; cursor: pointer;
    background: linear-gradient(180deg, #2a1c10cc, #120a06cc); border: 1px solid #f3d88b66; border-radius: 3px; transition: all .25s; }
#titlescreen .menu button:hover, #titlescreen .menu button:focus { border-color: #f3d88b; box-shadow: 0 0 18px #f3a84a55; outline: none; color: #fff6d8; }
#titlescreen .menu button[disabled] { opacity: .35; cursor: default; box-shadow: none; }
#titlescreen .panel { position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); width: min(520px, 90vw); padding: 18px 22px; display: none;
    background: #120a06e6; border: 1px solid #f3d88b66; border-radius: 6px; font: calc(16px * var(--ui, 1))/1.6 Georgia, serif; color: #eee6d2; text-align: center; }
#titlescreen .panel.on { display: block; }
#titlescreen .panel button { margin-top: 12px; }
#titlescreen .ember { position: absolute; bottom: -10px; width: 3px; height: 3px; border-radius: 50%; background: #ffb060; box-shadow: 0 0 6px #ff8a2a;
    animation: rise linear forwards; }
@keyframes rise { to { transform: translate(var(--dx), -105vh); opacity: 0; } }
body.title-on .hud, body.title-on #hotbar, body.title-on #skills, body.title-on #touch, body.title-on #floaters { display: none !important; }`;

export function createTitle({ camera, hasSave, quality, onStart, onNewGame, onQuality, onOptions, onSlots, continueLabel = 'CONTINUE' }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'titlescreen';
    const sigil = document.createElement('div'); sigil.className = 'sigil'; sigil.innerHTML = SIGIL;   // static markup
    const h1 = document.createElement('h1'); h1.textContent = 'ARCANE MAJESTY';
    const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = "ELDORIA'S PROPHECY";
    const press = document.createElement('div'); press.className = 'press'; press.textContent = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).get('touch') === '1' ? 'TAP TO BEGIN' : 'PRESS ANY KEY';
    const menu = document.createElement('div'); menu.className = 'menu';
    const panel = document.createElement('div'); panel.className = 'panel';
    root.append(sigil, h1, sub, press, menu, panel);
    document.body.append(root);
    document.body.classList.add('title-on');   // the game HUD waits until you play
    requestAnimationFrame(() => root.classList.add('lit'));

    const music = new Audio(titleTrack);
    onSettingChange(k => { if (k !== 'music') return; music.volume = (stage === 'flying' || !active ? PLAY_VOLUME : VOLUME) * settings.music; });
    music.loop = true;
    music.volume = 0;
    let active = true, stage = 'press', t = 0, flight = null;

    const button = (label, fn, disabled = false) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.disabled = disabled;
        b.onclick = fn;
        menu.append(b);
        return b;
    };
    function showPanel(lines) {
        panel.textContent = '';
        for (const l of lines) { const p = document.createElement('div'); p.textContent = l; panel.append(p); }
        const back = document.createElement('button');
        back.textContent = 'BACK';
        back.style.cssText = 'padding:7px 20px;font:calc(15px * var(--ui, 1)) Georgia,serif;letter-spacing:.15em;color:#f3e2b0;background:#2a1c10;border:1px solid #f3d88b66;cursor:pointer';
        back.onclick = () => { panel.classList.remove('on'); menu.style.display = ''; };
        panel.append(back);
        panel.classList.add('on');
        menu.style.display = 'none';
    }
    const cont = button(continueLabel, () => start(), !hasSave);
    button('CAMPAIGN — ELDRIN', () => onNewGame('eldrin'));
    button('YOUR OWN HERO', () => onNewGame('hero'));
    button('SAVE SLOTS', () => onSlots?.());
    button('THE FORGE', () => { location.href = 'forge.html'; });
    button('OPTIONS', () => onOptions?.());
    button('CREDITS', () => showPanel(['ARCANE MAJESTY', 'A world told first in music — the albums are the canon.', ' ',
        'DIRECTED AND PRODUCED BY', 'Etienne Gagne Nadeau', 'Thomas Gagne', ' ',
        'CREATIVE DIRECTION, DECISIONS AND PROMPTS', 'Etienne Gagne Nadeau', ' ',
        'MUSIC', 'Eldoria\'s Prophecy — "Echoes of Stone"', ' ',
        'BUILT WITH', 'Claude (Anthropic) — code written from the directors\' prompts', 'Three.js · Vite · Capacitor', ' ',
        'Every model, effect and landscape here is built in code: no borrowed art.']));

    function wake() {
        if (stage !== 'press') return;
        stage = 'menu';
        root.classList.add('menu-on');
        music.play().catch(() => {});
        (hasSave ? cont : menu.children[1]).focus();
    }
    addEventListener('keydown', wake);
    addEventListener('pointerdown', wake);
    addEventListener('gamepadconnected', wake);

    // Embers drifting past.
    const emberTimer = setInterval(() => {
        if (!active) return;
        const e = document.createElement('div');
        e.className = 'ember';
        e.style.left = `${Math.random() * 100}%`;
        e.style.setProperty('--dx', `${(Math.random() - 0.5) * 160}px`);
        e.style.animationDuration = `${7 + Math.random() * 7}s`;
        root.append(e);
        setTimeout(() => e.remove(), 15000);
    }, 260);

    function start() {
        if (stage === 'flying') return;
        stage = 'flying';
        root.classList.add('gone');
        flight = { t: 0, from: camera.position.clone(), look: look.clone() };
    }

    // The cinematic: a slow eased swing around the tower, looking up at it.
    const T = ELDRIN.T, look = new THREE.Vector3();
    function shot(time, out) {
        const a = Math.sin(time * 0.045) * 0.75;   // swing back and forth across the vale
        const p = toWorld(Math.sin(a) * 33, -Math.cos(a) * 33);
        out.set(p.x, ELDRIN.TY + 8 + Math.sin(time * 0.11) * 1.5, p.z);
        look.set(T.x, ELDRIN.TY + 9 + Math.sin(time * 0.07) * 1.2, T.z);
        return out;
    }

    // Returns true while the title owns the camera.
    function update(dt, gameCamera) {
        if (!active) return false;
        t += dt;
        if (stage !== 'flying') {
            shot(t, camera.position);
            camera.lookAt(look);
            if (stage === 'menu') music.volume = Math.min(VOLUME * settings.music, music.volume + dt * 0.25);
            return true;
        }
        // Fly down to Eldrin's camera and hand over.
        flight.t += dt / 2.6;
        const k = Math.min(1, flight.t), e = k * k * (3 - 2 * k);
        gameCamera.update(dt);   // keeps the game camera's target fresh
        camera.position.lerpVectors(flight.from, gameCamera.position, e);
        camera.lookAt(flight.look.clone().lerp(gameCamera.target, e));
        music.volume = Math.max(PLAY_VOLUME, VOLUME * (1 - k)) * settings.music;
        if (k >= 1) {
            active = false;
            clearInterval(emberTimer);
            removeEventListener('keydown', wake);
            removeEventListener('pointerdown', wake);
            setTimeout(() => root.remove(), 1500);
            document.body.classList.remove('title-on');
            onStart();
        }
        return true;
    }

    // Where the world's mood and shadows centre while the title shows: the foot of the tower.
    const fp = toWorld(0, -9);
    const focus = new THREE.Vector3(fp.x, ELDRIN.TY, fp.z);
    return { update, get active() { return active; }, start, wake, music, focus };
}
