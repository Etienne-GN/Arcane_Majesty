// One input layer for keyboard + mouse, gamepad and touch. The game reads actions, never keys:
//   move {x, y}  — x right, y forward, length ≤ 1 (analog on sticks and the touch joystick)
//   sprint       — held
//   hop, cast    — pressed this frame (edge-triggered, consumed by poll)
// The camera is orbited directly (mouse drag, right stick, touch drag on the right half).
import { settings } from './settings.js';
import { ACTIONS, HOLD_MS, mapFor, modeOf, padCapture } from './padmap.js';
const DEAD = 0.18;

export function createInput({ canvas, cam }) {
    const keys = new Set();
    const pressed = new Set();          // edge-triggered actions waiting for the next poll
    const touch = { x: 0, y: 0, sprint: false };
    const fan = { open: false, x: 0, y: 0 };   // a hand's fan is open: the right stick points into it instead of turning the camera
    let padPrev = [], holdT = {};   // (buttons with a held binding: when each went down, and whether its hold fired)   // R3: a click cycles the camera; held, its old action (a werewolf's change / skill 3)
    let lastDevice = 'keyboard';

    // Typing in a text field (a name, a server address, chat) stays in the field: the keys never reach the game's
    // shortcuts on window (2026-11-26: typing a name in Options opened the satchel). Escape leaves the field.
    const editable = t => t && (t.isContentEditable || (t.tagName === 'INPUT' && !/^(range|checkbox|radio|button|submit|color)$/i.test(t.type)) || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    for (const kind of ['keydown', 'keyup', 'keypress']) document.addEventListener(kind, e => {
        if (!editable(e.target)) return;
        if (kind === 'keydown' && e.code === 'Escape') e.target.blur();
        e.stopPropagation();   // (the field's own handlers have run; window's — the game's — do not)
    });
    addEventListener('keydown', e => {
        if (/^(INPUT|TEXTAREA)$/.test(e.target?.tagName) && e.target.type !== 'range') return;   // typing (chat, names) is not playing
        if (e.code === 'Space') e.preventDefault();
        if (!e.repeat) {
            if (e.code === 'Space') pressed.add('hop');
            const two = settings.hands;   // two-hand actions: F right hand, R left hand, Z / C cycle left / right
            if (two && e.code === 'KeyF') pressed.add('handR:down:key');   // held: aim (aiming.js); released: act
            if (two && e.code === 'KeyR') pressed.add('handL:down:key');
            if (two && e.code === 'KeyZ') pressed.add('cycleL:down');
            if (two && e.code === 'KeyC') pressed.add('cycleR:down');
            if (!two && e.code === 'KeyF') pressed.add('cast');
            const slot = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
            if (slot >= 0) pressed.add(`hotbar:${slot}`);
            const sk = ['KeyZ', 'KeyX', 'KeyV'].indexOf(e.code);
            if (sk >= 0 && !two) pressed.add(`skill:${sk}`);
            if (e.code === 'KeyR' && !two) pressed.add('strike');
            if (e.code === 'KeyH') pressed.add('blink');   // Blink-Step (amo: H)
            if (e.code === 'KeyL') pressed.add('sight');   // Aether Sight (game/sight.js)
            if (e.code === 'KeyV') pressed.add('shift');   // a werewolf's change
            if (e.code === 'KeyG' || e.code === 'Enter') pressed.add('gather');
            pressed.add(`key:${e.code}`);
        }
        keys.add(e.code);
        lastDevice = 'keyboard';
    });
    addEventListener('keyup', e => { keys.delete(e.code); if (settings.hands && e.code === 'KeyZ') pressed.add('cycleL:up'); if (settings.hands && e.code === 'KeyF') pressed.add('handR:up'); if (settings.hands && e.code === 'KeyR') pressed.add('handL:up'); if (settings.hands && e.code === 'KeyC') pressed.add('cycleR:up'); });
    addEventListener('blur', () => { keys.clear(); Object.assign(touch, { x: 0, y: 0, sprint: false }); });
    const held = (...codes) => codes.some(c => keys.has(c));

    // Mouse: left-drag orbits, wheel zooms, right-click casts. Touch pointers are handled by touch.js.
    let drag = null;
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') return;
        if (e.button === 2) { pressed.add(settings.hands ? 'handR:down:mouse' : 'cast'); return; }
        drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, held: false };
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', e => {
        if (e.button === 2 && settings.hands) { pressed.add('handR:up'); return; }
        // A quick click that didn't move the camera is a strike (two-hand mode: the left hand). Held still: aiming.
        if (drag?.held) pressed.add('handL:up');
        else if (drag && e.button === 0 && !drag.moved && performance.now() - drag.t0 < 300) { if (settings.hands) pressed.add('handL:down:mouse').add('handL:up'); else pressed.add('strike'); }
        drag = null;
    });
    canvas.addEventListener('pointermove', e => {
        if (!drag || drag.held) return;   // held still to aim: the mouse moves the ring, not the camera
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 6) drag.moved = true;
        cam.orbit(-(e.clientX - drag.x) * 0.006, (e.clientY - drag.y) * 0.004);
        drag.x = e.clientX; drag.y = e.clientY;
    });
    canvas.addEventListener('wheel', e => { e.preventDefault(); cam.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });

    const dz = v => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));

    function poll(dt) {
        // The left button held still for a moment (two-hand mode): the left hand starts aiming.
        if (drag && settings.hands && !drag.moved && !drag.held && performance.now() - drag.t0 > 200) { drag.held = true; pressed.add('handL:down:mouse'); }
        let mx = held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft');
        let my = held('KeyW', 'ArrowUp') - held('KeyS', 'ArrowDown');
        let sprint = held('ShiftLeft', 'ShiftRight');
        if (held('KeyQ')) cam.orbit(dt * 2, 0);
        if (held('KeyE')) cam.orbit(-dt * 2, 0);

        // Gamepad (standard mapping): left stick move, right stick camera, A hop, X / RT cast,
        // LB or left-stick click sprint, LT/RT-less pads still work.
        const pad = [...(navigator.getGamepads?.() ?? [])].find(p => p && p.connected);
        if (pad) {
            const b = i => !!pad.buttons[i]?.pressed;
            const lx = dz(pad.axes[0] ?? 0), ly = dz(pad.axes[1] ?? 0), rx = dz(pad.axes[2] ?? 0), ry = dz(pad.axes[3] ?? 0);
            if (lx || ly) { mx = lx; my = -ly; lastDevice = 'gamepad'; }
            if (fan.open) { fan.x = rx; fan.y = ry; } else if (rx || ry) cam.orbit(-rx * dt * 2.6, ry * dt * 1.6);
            // The buttons come from the map (engine/padmap.js; Options → Controls → Gamepad buttons): each binding is a
            // button, tapped or held. A button that also has a held binding fires its tap on release.
            const edge = i => b(i) && !padPrev[i], up = i => !b(i) && padPrev[i];
            if (!padCapture.on) {
                const mode = modeOf(settings.hands), M = mapFor(mode), kinds = Object.fromEntries(ACTIONS[mode].map(a => [a.id, a]));
                const holdOn = new Set(); for (const list of Object.values(M)) for (const x of list) if (x.hold) holdOn.add(x.b);
                for (const [id, list] of Object.entries(M)) {
                    const a = kinds[id]; if (!a) continue;
                    for (const { b: bi, hold } of list) {
                        if (a.kind === 'state') { if (b(bi)) sprint = true; continue; }
                        if (a.kind === 'hand') { if (edge(bi)) pressed.add(`${a.token}:down:pad`); if (up(bi)) pressed.add(`${a.token}:up`); continue; }
                        if (a.kind === 'cycle') { if (edge(bi)) pressed.add(`${a.token}:pad`); if (up(bi)) pressed.add(`${a.token}:up`); continue; }
                        if (hold) { const h = holdT[bi]; if (h && !h.fired && b(bi) && performance.now() - h.t > HOLD_MS) { h.fired = true; pressed.add(a.token); } }
                        else if (holdOn.has(bi)) { const h = holdT[bi]; if (h && up(bi) && !h.fired) pressed.add(a.token); }
                        else if (edge(bi)) pressed.add(a.token);
                    }
                }
                for (const bi of holdOn) { if (edge(bi)) holdT[bi] = { t: performance.now(), fired: false }; else if (!b(bi) && !up(bi)) holdT[bi] = null; }
            }
            if (edge(0) || edge(2) || edge(7)) lastDevice = 'gamepad';
            padPrev = pad.buttons.map(x => x.pressed);
        }

        if (touch.x || touch.y) { mx = touch.x; my = touch.y; }
        if (touch.sprint) sprint = true;

        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }
        const out = { move: { x: mx, y: my }, sprint, hop: pressed.has('hop'), cast: pressed.has('cast'), strike: pressed.has('strike'), gather: pressed.has('gather'), inventory: pressed.has('inventory'), sheet: pressed.has('sheet'), map: pressed.has('map'), tear: pressed.has('tear'), sight: pressed.has('sight'), journal: pressed.has('journal'), codex: pressed.has('codex'), options: pressed.has('options'), chat: pressed.has('chat'), book: pressed.has('book'), skillbook: pressed.has('skillbook'), quit: pressed.has('quit'), blink: pressed.has('blink'), shift: pressed.has('shift'), camCycle: pressed.has('camcycle'), hand: [...pressed].filter(p => p.startsWith('handL:') || p.startsWith('handR:')), cycle: [...pressed].filter(p => p.startsWith('cycle')), hotbar: [0, 1, 2, 3].findIndex(i => pressed.has(`hotbar:${i}`)), skill: [0, 1, 2].findIndex(i => pressed.has(`skill:${i}`)), keys: [...pressed].filter(p => p.startsWith('key:')).map(p => p.slice(4)) };
        pressed.clear();
        return out;
    }

    return {
        poll,
        press: action => pressed.add(action),   // touch buttons and tests
        touch,
        fan,
        keys,
        get device() { return lastDevice; },
        set device(d) { lastDevice = d; },
    };
}
