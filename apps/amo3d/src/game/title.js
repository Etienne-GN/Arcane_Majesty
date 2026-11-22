import { suspendAudio } from '../engine/sfx.js';
import { settings, onSettingChange } from '../engine/settings.js';
// Title screen & main menu (Phase 1.5). Rendered live: the camera drifts around Eldrin's tower in
// the vale's dusk mood, ARCANE MAJESTY rises in gold over the Arcane Majesty emblem, embers float up,
// and "Echoes of Stone" plays (it starts on the first key/tap — browsers block sound before that).
// Continue / New Game fly the camera down to Eldrin and hand over control.
import * as THREE from 'three';
import { checkForUpdate, openDownload, isPhone, VERSION } from './updates.js';
import { ELDRIN, toWorld } from '../content/eldrinVale.js';
import titleTrack from '../../media/title_echoes_of_stone.mp3?url';   // the master the user supplied
import sigilUrl from '../../media/title_sigil.webp?url';

const VOLUME = 0.15;      // the title music plays at 15%
const PLAY_VOLUME = 0.01; // and stays at 1% once you are playing

// The emblem behind the title: the Arcane Majesty monogram, its ring and clouds (from the user's AM_LOGO.png, cut from
// its black ground and turned gold).
const SIGIL = `<img src="${sigilUrl}" alt="" draggable="false" style="width:100%;height:100%;object-fit:contain">`;

const CSS = `
#titlescreen { position: fixed; inset: 0; z-index: 20; font-family: 'Cinzel', Georgia, 'Times New Roman', serif; color: #f3e2b0;
    background: radial-gradient(ellipse at 50% 55%, transparent 35%, #0a0610cc 100%), linear-gradient(180deg, #3a1a4a55, #ff8a3a22 55%, #10081888);
    transition: opacity 1.4s; overflow: hidden; user-select: none; }
#titlescreen.gone { opacity: 0; pointer-events: none; }
#titlescreen .sigil { position: absolute; left: 50%; top: 36%; width: min(66vh, 84vw); aspect-ratio: 1024 / 907; transform: translate(-50%, -50%);
    opacity: .3; animation: glow 7s ease-in-out infinite; filter: drop-shadow(0 0 10px #f3a84a88); pointer-events: none;
    transition: top .8s ease, width .8s ease; }
@keyframes glow { 50% { opacity: .42; filter: drop-shadow(0 0 22px #f3c86aaa); } }
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
/* The menu (Phase 7 polish): Continue full width and gold, two even columns below, Credits as a quiet link. */
#titlescreen .menu { position: absolute; left: 50%; transform: translateX(-50%); bottom: 9%; width: min(560px, 90vw); display: none;
    grid-template-columns: 1fr 1fr; gap: 10px; }
#titlescreen.menu-on .menu { display: grid; }
#titlescreen.menu-on .press { display: none; }
#titlescreen .menu, #titlescreen .menu button { opacity: 1; visibility: visible; }
#titlescreen .menu button { padding: 12px 10px; font: calc(17px * var(--ui, 1)) Georgia, serif; letter-spacing: .2em; color: #f3e2b0; cursor: pointer;
    background: linear-gradient(180deg, #2a1c10d8, #120a06d8); border: 1px solid #f3d88b55; border-radius: 4px; transition: border-color .25s, box-shadow .25s, color .25s;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#titlescreen .menu button.primary { grid-column: 1 / -1; padding: 14px 10px; font-size: calc(19px * var(--ui, 1)); color: #1e1406;
    background: linear-gradient(180deg, #f6e3a4, #d2a64e); border-color: #fff0c0; box-shadow: 0 0 22px #f3a84a44; }
#titlescreen .menu button.link { grid-column: 1 / -1; justify-self: center; padding: 4px 14px; background: none; border: none; box-shadow: none;
    font-size: calc(14px * var(--ui, 1)); letter-spacing: .3em; color: #e8d6a8; opacity: .75; }
#titlescreen .menu button:hover, #titlescreen .menu button:focus { border-color: #f3d88b; box-shadow: 0 0 18px #f3a84a55; outline: none; color: #fff6d8; }
#titlescreen .menu button.primary:hover, #titlescreen .menu button.primary:focus { color: #1e1406; box-shadow: 0 0 28px #f3c84a88; }
#titlescreen .menu button.link:hover, #titlescreen .menu button.link:focus { box-shadow: none; opacity: 1; text-decoration: underline; }
/* With the menu up, the title glides to the top and shrinks so nothing overlaps. */
#titlescreen h1 { transition: opacity 2.6s ease, transform 3s ease, top .8s ease, font-size .8s ease; }
#titlescreen.menu-on h1 { top: 8%; font-size: clamp(28px, 5vw, 64px); }
#titlescreen.menu-on .sub { opacity: 0; }
#titlescreen.menu-on .sigil { top: 26%; width: min(36vh, 50vw); }
@media (min-height: 700px) and (min-aspect-ratio: 1/1) {   /* a tall desktop screen: one centred column */
    #titlescreen .menu { width: 340px; grid-template-columns: 1fr; bottom: 10%; }
}
@media (max-height: 560px) {   /* a phone on its side */
    #titlescreen.menu-on h1 { top: 5%; font-size: clamp(24px, 4.2vw, 44px); }
    #titlescreen .menu { bottom: 4%; width: min(520px, 62vw); gap: 7px; }
    #titlescreen .menu button { padding: 9px 8px; }
    #titlescreen .menu button.primary { padding: 10px 8px; }
    #titlescreen .panel { bottom: 4%; max-height: 80vh; overflow-y: auto; }
}
#titlescreen .panel { position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); width: min(520px, 90vw); padding: 18px 22px; display: none;
    background: #120a06e6; border: 1px solid #f3d88b66; border-radius: 6px; font: calc(16px * var(--ui, 1))/1.6 Georgia, serif; color: #eee6d2; text-align: center; }
#titlescreen .panel.on { display: block; }
#titlescreen .panel button { margin-top: 12px; }
#titlescreen .ember { position: absolute; bottom: -10px; width: 3px; height: 3px; border-radius: 50%; background: #ffb060; box-shadow: 0 0 6px #ff8a2a;
    animation: rise linear forwards; }
@keyframes rise { to { transform: translate(var(--dx), -105vh); opacity: 0; } }
body.title-on .hud, body.title-on #hotbar, body.title-on #skills, body.title-on #touch, body.title-on #floaters { display: none !important; }`;

// coverShot(time, outPos, outLook) → true: the open world's shot (the Eldoria's Prophecy cover — the Citadel over the gorge).
export function createTitle({ camera, hasSave, quality, onStart, onNewGame, onQuality, onOptions, onSlots, continueLabel = 'CONTINUE', coverShot = null }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'titlescreen';
    const sigil = document.createElement('div'); sigil.className = 'sigil'; sigil.innerHTML = SIGIL;   // static markup
    const h1 = document.createElement('h1'); h1.textContent = 'ARCANE MAJESTY';
    const sub = document.createElement('div'); sub.className = 'sub'; sub.textContent = '';   // no subtitle: Eldoria's Prophecy is a campaign (chosen in New Game), not the game's name
    const press = document.createElement('div'); press.className = 'press'; press.textContent = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).get('touch') === '1' ? 'TAP TO BEGIN' : 'PRESS ANY KEY';
    const menu = document.createElement('div'); menu.className = 'menu';
    const panel = document.createElement('div'); panel.className = 'panel';
    root.append(sigil, h1, press, menu, panel);
    document.body.append(root);
    document.body.classList.add('title-on');   // the game HUD waits until you play
    document.body.classList.add('booted'); setTimeout(() => document.getElementById('boot')?.remove(), 900);   // the loading logo fades out
    requestAnimationFrame(() => root.classList.add('lit'));

    const music = new Audio(titleTrack);
    onSettingChange(k => { if (k !== 'music') return; music.volume = (stage === 'flying' || !active ? PLAY_VOLUME : VOLUME) * settings.music; });
    music.loop = true;
    // In the background (the app switched away, the phone locked) the music stops; back, it plays on where it was.
    let bgPlaying = false;
    const toBackground = hidden => { if (hidden) { bgPlaying = !music.paused; music.pause(); suspendAudio(true); } else { suspendAudio(false); if (bgPlaying) music.play().catch(() => {}); } };
    document.addEventListener('visibilitychange', () => toBackground(document.hidden));
    if (window.Capacitor?.isNativePlatform?.()) import('@capacitor/app').then(({ App }) => { App.addListener('pause', () => toBackground(true)); App.addListener('resume', () => toBackground(false)); });
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
    // New Game: the campaigns (only Eldrin's for now — more will join the list), or a hero of your own.
    const CAMPAIGNS = [{ id: 'eldrin', title: "Eldoria's Prophecy", sub: 'Campaign — play Eldrin Nightshade, from the tower to the Heartstone' }];
    function showNewGame() {
        panel.textContent = '';
        const h = document.createElement('div'); h.className = 'ph'; h.textContent = 'NEW GAME'; panel.append(h);
        const choice = (title, sub, fn) => {
            const b = document.createElement('button'); b.className = 'choice';
            b.innerHTML = '<span class="ct"></span><span class="cs"></span>';
            b.querySelector('.ct').textContent = title; b.querySelector('.cs').textContent = sub;
            b.onclick = fn; panel.append(b); return b;
        };
        const g1 = document.createElement('div'); g1.className = 'pg'; g1.textContent = 'CAMPAIGNS'; panel.append(g1);
        const first = CAMPAIGNS.map(c => choice(c.title, c.sub, () => onNewGame(c.id)))[0];
        const g2 = document.createElement('div'); g2.className = 'pg'; g2.textContent = 'FREE PLAY'; panel.append(g2);
        choice('Your Own Hero', 'Make a character in the Forge and arrive in Thaloria as a newcomer', () => onNewGame('hero'));
        const back = document.createElement('button'); back.className = 'back'; back.textContent = 'BACK';
        back.onclick = () => { panel.classList.remove('on'); menu.style.display = ''; };
        panel.append(back);
        panel.classList.add('on');
        menu.style.display = 'none';
        first?.focus();
    }
    const cont = button(continueLabel, () => start(), !hasSave);
    cont.classList.add('primary');
    const newGame = button('NEW GAME', () => showNewGame());
    if (!hasSave) newGame.classList.add('primary');   // nothing to continue: New Game is the main action
    button('SAVES', () => onSlots?.());
    // The Workshop: the makers' pages — the Forge (heroes, and every NPC of the game to look at and leave notes on),
    // the Bestiary (every creature, with notes), the Land Editor (the regions). Notes and edits save only through the
    // dev server (npm run dev on the PC); on a phone the pages open to look.
    function showWorkshop() {
        panel.textContent = '';
        const head = document.createElement('div'); head.textContent = 'THE WORKSHOP'; head.style.cssText = 'letter-spacing:.3em;margin-bottom:10px;color:#f3d88b';
        panel.append(head);
        for (const [label, sub, href] of [['THE FORGE', 'Make a hero — or open any NPC of the game and leave notes on it', 'forge.html'],
            ['THE BESTIARY', 'Every creature on its turntable, with notes', 'bestiary.html'], ['THE LAND EDITOR', 'The regions: paint, place, test', 'editor.html']]) {
            const b = document.createElement('button');
            b.innerHTML = `${label}<br><small style="letter-spacing:.05em;opacity:.75;font-size:.72em">${sub}</small>`;
            b.style.cssText = 'display:block;width:100%;margin:6px 0;padding:9px 10px;font:calc(16px * var(--ui, 1)) Georgia,serif;letter-spacing:.18em;color:#f3e2b0;background:linear-gradient(180deg,#2a1c10d8,#120a06d8);border:1px solid #f3d88b55;border-radius:4px;cursor:pointer';
            b.onclick = () => { location.href = href; };
            panel.append(b);
        }
        if (isPhone()) { const n = document.createElement('div'); n.textContent = 'Notes and edits save only from the dev server on the PC.'; n.style.cssText = 'opacity:.7;font-size:.85em;margin-top:6px'; panel.append(n); }
        const back = document.createElement('button'); back.textContent = 'BACK';
        back.style.cssText = 'margin-top:10px;padding:7px 20px;font:calc(15px * var(--ui, 1)) Georgia,serif;letter-spacing:.15em;color:#f3e2b0;background:#2a1c10;border:1px solid #f3d88b66;cursor:pointer';
        back.onclick = () => { panel.classList.remove('on'); menu.style.display = ''; };
        panel.append(back);
        panel.classList.add('on'); menu.style.display = 'none';
        panel.querySelector('button')?.focus();
    }
    button('WORKSHOP', () => showWorkshop());
    button('OPTIONS', () => onOptions?.());
    const credits = button('CREDITS', () => showPanel(['ARCANE MAJESTY', 'A world told first in music — the albums are the canon.', ' ',
        'CREATED, DIRECTED AND PRODUCED BY', 'Etienne Gagne Nadeau', 'Thomas Gagne', ' ',
        'PROMPTS', 'Etienne Gagne Nadeau', ' ',
        'MUSIC', 'Eldoria\'s Prophecy — "Echoes of Stone"', 'Made with Suno', ' ',
        'BUILT WITH', 'Claude (Anthropic) — code written from the directors\' prompts', 'Three.js · Vite · Capacitor', ' ',
        'Every model, effect and landscape here is built in code: no borrowed art.']));
    credits.classList.add('link');
    const howto = button('HOW TO PLAY', () => { location.href = 'manual.html'; });   // the player's manual (manual.html)
    howto.classList.add('link');
    // A newer release on GitHub (phone builds made by CI only): offer it under the menu.
    if (isPhone() && VERSION !== 'dev') checkForUpdate().then(u => {
        if (!u) return;
        const up = button(`UPDATE — VERSION ${u.version}`, () => openDownload(u));
        up.classList.add('link'); up.style.color = '#ffd76a';
    });
    if (!hasSave) cont.style.display = 'none';   // no save yet: no Continue at all

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

    let fade = null;
    function start() {
        if (stage === 'flying') return;
        stage = 'flying';
        root.classList.add('gone');
        flight = { t: 0 };
        fade ??= Object.assign(document.createElement('div'), { id: 'titlefade' });
        fade.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:40';
        document.body.append(fade);
    }

    // The cinematic: a slow eased swing around the tower, looking up at it.
    const T = ELDRIN.T, look = new THREE.Vector3();
    function shot(time, out) {
        if (coverShot?.(time, out, look)) return out;
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
        // A fade to black and back on Eldrin (asked 2026-11-21: in the open world the camera's flight from the tower
        // swept across the land) — the title's shot drifts on while it darkens; at black the game camera takes over.
        flight.t += dt / 1.5;
        const k = Math.min(1, flight.t), OUT = 0.4, HOLD = 0.53;
        gameCamera.update(dt);   // keeps the game camera's target fresh
        if (k < OUT) { shot(t, camera.position); camera.lookAt(look); }
        else {
            if (!flight.started) { flight.started = true; document.body.classList.remove('title-on'); onStart(); gameCamera.update(dt); }   // at black: Eldrin and the HUD appear (the fade-in shows them)
            camera.position.copy(gameCamera.position); camera.lookAt(gameCamera.target);
        }
        fade.style.opacity = String(k < OUT ? k / OUT : k < HOLD ? 1 : 1 - (k - HOLD) / (1 - HOLD));
        music.volume = Math.max(PLAY_VOLUME, VOLUME * (1 - k)) * settings.music;
        if (k >= 1) {
            active = false;
            clearInterval(emberTimer);
            removeEventListener('keydown', wake);
            removeEventListener('pointerdown', wake);
            setTimeout(() => root.remove(), 1500); fade?.remove();
        }
        return true;
    }

    // Where the world's mood and shadows centre while the title shows: the foot of the tower.
    const fp = toWorld(0, -9);
    const focus = new THREE.Vector3(fp.x, ELDRIN.TY, fp.z);
    return { update, get active() { return active; }, start, wake, music, focus, showNewGame };
}
