// One input layer for keyboard + mouse, gamepad and touch. The game reads actions, never keys:
//   move {x, y}  — x right, y forward, length ≤ 1 (analog on sticks and the touch joystick)
//   sprint       — held
//   hop, cast    — pressed this frame (edge-triggered, consumed by poll)
// The camera is orbited directly (mouse drag, right stick, touch drag on the right half).
import { settings } from './settings.js';
const DEAD = 0.18;

export function createInput({ canvas, cam }) {
    const keys = new Set();
    const pressed = new Set();          // edge-triggered actions waiting for the next poll
    const touch = { x: 0, y: 0, sprint: false };
    const fan = { open: false, x: 0, y: 0 };   // a hand's fan is open: the right stick points into it instead of turning the camera
    let padPrev = [];
    let lastDevice = 'keyboard';

    addEventListener('keydown', e => {
        if (/^(INPUT|TEXTAREA)$/.test(e.target?.tagName) && e.target.type !== 'range') return;   // typing (chat, names) is not playing
        if (e.code === 'Space') e.preventDefault();
        if (!e.repeat) {
            if (e.code === 'Space') pressed.add('hop');
            const two = settings.hands;   // two-hand actions: F right hand, R left hand, Z / C cycle left / right
            if (two && e.code === 'KeyF') pressed.add('handR');
            if (two && e.code === 'KeyR') pressed.add('handL');
            if (two && e.code === 'KeyZ') pressed.add('cycleL:down');
            if (two && e.code === 'KeyC') pressed.add('cycleR:down');
            if (!two && e.code === 'KeyF') pressed.add('cast');
            const slot = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
            if (slot >= 0) pressed.add(`hotbar:${slot}`);
            const sk = ['KeyZ', 'KeyX', 'KeyV'].indexOf(e.code);
            if (sk >= 0 && !two) pressed.add(`skill:${sk}`);
            if (e.code === 'KeyR' && !two) pressed.add('strike');
            if (e.code === 'KeyH') pressed.add('blink');   // Blink-Step (amo: H)
            if (e.code === 'KeyG' || e.code === 'Enter') pressed.add('gather');
            pressed.add(`key:${e.code}`);
        }
        keys.add(e.code);
        lastDevice = 'keyboard';
    });
    addEventListener('keyup', e => { keys.delete(e.code); if (settings.hands && e.code === 'KeyZ') pressed.add('cycleL:up'); if (settings.hands && e.code === 'KeyC') pressed.add('cycleR:up'); });
    addEventListener('blur', () => { keys.clear(); Object.assign(touch, { x: 0, y: 0, sprint: false }); });
    const held = (...codes) => codes.some(c => keys.has(c));

    // Mouse: left-drag orbits, wheel zooms, right-click casts. Touch pointers are handled by touch.js.
    let drag = null;
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
        if (e.pointerType === 'touch') return;
        if (e.button === 2) { pressed.add(settings.hands ? 'handR' : 'cast'); return; }
        drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() };
        canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointerup', e => {
        // A quick click that didn't move the camera is a strike.
        if (drag && e.button === 0 && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 6 && performance.now() - drag.t0 < 300) pressed.add(settings.hands ? 'handL' : 'strike');
        drag = null;
    });
    canvas.addEventListener('pointermove', e => {
        if (!drag) return;
        cam.orbit(-(e.clientX - drag.x) * 0.006, (e.clientY - drag.y) * 0.004);
        drag.x = e.clientX; drag.y = e.clientY;
    });
    canvas.addEventListener('wheel', e => { e.preventDefault(); cam.zoom(e.deltaY > 0 ? 1.1 : 0.9); }, { passive: false });

    const dz = v => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));

    function poll(dt) {
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
            const two = settings.hands;   // two-hand actions: LT / RT act (X / B too), LB / RB cycle; sprint on the left-stick click
            if ((b(4) && !two) || b(10)) sprint = true;
            const edge = i => b(i) && !padPrev[i];
            if (edge(0)) pressed.add('hop');
            if (two) {
                if (edge(7) || edge(2)) pressed.add('handR');
                if (edge(6) || edge(1)) pressed.add('handL');
                const rel = i => !b(i) && padPrev[i];
                if (edge(4)) pressed.add('cycleL:pad');
                if (edge(5)) pressed.add('cycleR:pad');
                if (rel(4)) pressed.add('cycleL:up');
                if (rel(5)) pressed.add('cycleR:up');
            } else {
                if (edge(2) || edge(7)) pressed.add('cast');
                if (edge(1)) pressed.add('strike');
            }
            if (edge(3)) pressed.add('inventory');
            if (edge(8)) pressed.add('blink');   // Back / Select: Blink-Step
            if (edge(9)) pressed.add('sheet');
            if (!two) [5, 6, 11].forEach((bi, i) => { if (edge(bi)) pressed.add(`skill:${i}`); });
            [12, 15, 13, 14].forEach((bi, i) => { if (edge(bi)) pressed.add(`hotbar:${i}`); });   // D-pad up, right, down, left
            if (edge(0) || edge(2) || edge(7)) lastDevice = 'gamepad';
            padPrev = pad.buttons.map(x => x.pressed);
        }

        if (touch.x || touch.y) { mx = touch.x; my = touch.y; }
        if (touch.sprint) sprint = true;

        const len = Math.hypot(mx, my);
        if (len > 1) { mx /= len; my /= len; }
        const out = { move: { x: mx, y: my }, sprint, hop: pressed.has('hop'), cast: pressed.has('cast'), strike: pressed.has('strike'), gather: pressed.has('gather'), inventory: pressed.has('inventory'), sheet: pressed.has('sheet'), map: pressed.has('map'), tear: pressed.has('tear'), journal: pressed.has('journal'), codex: pressed.has('codex'), options: pressed.has('options'), chat: pressed.has('chat'), book: pressed.has('book'), skillbook: pressed.has('skillbook'), quit: pressed.has('quit'), blink: pressed.has('blink'), handL: pressed.has('handL'), handR: pressed.has('handR'), cycle: [...pressed].filter(p => p.startsWith('cycle')), hotbar: [0, 1, 2, 3].findIndex(i => pressed.has(`hotbar:${i}`)), skill: [0, 1, 2].findIndex(i => pressed.has(`skill:${i}`)), keys: [...pressed].filter(p => p.startsWith('key:')).map(p => p.slice(4)) };
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
