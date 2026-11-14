// On-screen controls for phones and tablets (Phase 7 rework). Shown on touch devices (or ?touch=1).
//   left half   — a floating joystick; push it past its ring to sprint
//   right half  — drag to turn the camera, pinch to zoom
//   bottom right — the action cluster under the right thumb: FIRE (big), HIT, HOP; style skills beside it
//   top left    — compact bars, then the hotbar (consumables)
//   top right   — the minimap (tap: world map), the clock, and one MENU button that opens a sheet of
//                 big tiles: Satchel, Hero, Map, Journal, Codex, Aetheric Tear
// Everything steps aside while a menu or a conversation is open.
const MODALS = '#inv.open,#sheet.open,#journal.open,#codex.open,#shop.open,#chest.open,#camp.open,#worldmap.open,#dlg.open,#travel.open,#tmenu.open,#bounty.open,#options.open';

export function createTouchControls({ input, cam }) {
    const forced = new URLSearchParams(location.search).get('touch') === '1';
    if (!forced && !matchMedia('(pointer: coarse)').matches) return null;

    const u = v => `calc(${v}px * var(--ui, 1))`;
    const css = document.createElement('style');
    css.textContent = `
        #touch { position: fixed; inset: 0; z-index: 5; touch-action: none; user-select: none; -webkit-user-select: none; }
        #touch .stick { position: absolute; width: 132px; height: 132px; margin: -66px 0 0 -66px; border-radius: 50%;
            border: 2px solid #eee6d255; background: #0003; display: none; }
        #touch .stick.run { border-color: #8fd16a; box-shadow: 0 0 16px #8fd16a66; }
        #touch .knob { position: absolute; left: 50%; top: 50%; width: 54px; height: 54px; margin: -27px 0 0 -27px; border-radius: 50%; background: #eee6d2aa; }
        #touch .btn { position: absolute; border-radius: 50%; display: grid; place-items: center; color: #fff6e0;
            font: ${u(15)} Georgia, serif; letter-spacing: .08em; border: 2px solid #f3d88bcc; background: #0b0a10a8; box-shadow: 0 2px 8px #0008; }
        #touch .btn.on { background: #f3d88b66; transform: scale(.94); }
        #touch .fire { right: calc(20px + env(safe-area-inset-right, 0px)); bottom: 20px; width: 92px; height: 92px; font-size: ${u(16)};
            background: radial-gradient(circle at 50% 45%, #ffd27a 0, #ff7a20 32%, #7a1f08 72%, #2a0c04 100%); text-shadow: 0 1px 3px #000; }
        #touch .hit { right: calc(126px + env(safe-area-inset-right, 0px)); bottom: 22px; width: 68px; height: 68px; }
        #touch .hop { right: calc(30px + env(safe-area-inset-right, 0px)); bottom: 126px; width: 68px; height: 68px; }
        #touch .menu { right: calc(132px + env(safe-area-inset-right, 0px)); top: 12px; width: 54px; height: 54px; border-radius: 14px; font-size: ${u(13)}; }
        #tmenu { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; }
        #tmenu.open { display: grid; }
        #tmenu .grid { display: grid; grid-template-columns: repeat(4, minmax(110px, 170px)); gap: 12px; padding: 16px; }
        #tmenu button { padding: 18px 10px; border-radius: 14px; border: 1px solid #f3d88b88; background: linear-gradient(160deg, #1c1824f2, #0d0b12f8);
            color: #f3e2b0; font: ${u(18)} Georgia, serif; letter-spacing: .06em; }
        #tmenu button small { display: block; margin-top: 4px; font-size: ${u(13)}; color: #cfc6b0; opacity: .8; }
        #tmenu button.tear { border-color: #9abaff; color: #cfe0ff; }

        /* The rest of the HUD, rearranged for a phone. */
        body.touch-mode #status { left: calc(12px + env(safe-area-inset-left, 0px)); top: 10px; bottom: auto; width: 200px; }
        body.touch-mode #status .label { margin-top: 3px; font-size: ${u(12)}; }
        body.touch-mode #status .bar { height: 8px; margin-top: 2px; }
        body.touch-mode #lvl, body.touch-mode #slot, body.touch-mode #slot-name { display: none; }
        body.touch-mode #statusfx { left: calc(12px + env(safe-area-inset-left, 0px)) !important; bottom: auto !important; top: 196px; }
        body.touch-mode #hotbar { top: 132px; left: calc(12px + env(safe-area-inset-left, 0px)); bottom: auto; transform: none; flex-direction: row; z-index: 6; }
        body.touch-mode #hotbar .hs { width: 46px; height: 46px; }
        body.touch-mode #hotbar .hs.empty { display: none; }   /* only slots with something in them */
        body.touch-mode #skills { top: auto; bottom: 26px; left: auto; right: calc(206px + env(safe-area-inset-right, 0px)); transform: none; z-index: 6; }
        body.touch-mode #skills .sk { width: 82px; padding: 8px 6px; }
        body.touch-mode #skills .sk.off { display: none; }
        body.touch-mode #skills .sk .key { display: none; }
        body.touch-mode #minimap { width: 108px; height: 108px; top: 12px; right: calc(12px + env(safe-area-inset-right, 0px)); z-index: 6; pointer-events: auto; }
        body.touch-mode #clock { right: calc(12px + env(safe-area-inset-right, 0px)) !important; top: 124px !important; font-size: ${u(13)} !important; }
        body.touch-mode #banner { top: 18px; font-size: ${u(22)}; }
        body.touch-mode #msg { bottom: 132px; max-width: 60vw; text-align: center; }
        body.touch-mode #prompt { top: auto; bottom: 26%; z-index: 6; max-width: 56vw; font-size: ${u(15)}; text-align: center; padding: 8px 16px; border-radius: 22px; background: #0b0a10c8; border: 1px solid #f3d88b88; }
        body.modal-open #touch, body.modal-open #hotbar, body.modal-open #skills, body.modal-open #prompt { display: none !important; }`;
    document.head.append(css);

    const root = document.createElement('div');
    root.id = 'touch';
    root.innerHTML = '<div class="stick"><div class="knob"></div></div>'
        + '<div class="btn menu">MENU</div><div class="btn fire">FIRE</div><div class="btn hit">HIT</div><div class="btn hop">HOP</div>';
    document.body.append(root);
    document.body.classList.add('touch-mode');
    const stick = root.querySelector('.stick'), knob = root.querySelector('.knob');

    // The menu sheet.
    const sheet = document.createElement('div');
    sheet.id = 'tmenu';
    const tiles = [['inventory', 'Satchel', 'items · equipment'], ['sheet', 'Hero', 'attributes · mastery'], ['map', 'Map', 'the world'],
        ['journal', 'Journal', 'quests'], ['codex', 'Codex', 'creatures · places'], ['tear', 'Aetheric Tear', 'travel to a gate'], ['chat', 'Chat', 'talk to players online'], ['options', 'Options', 'graphics · sound · camera · online']];
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const [action, label, sub] of tiles) {
        const b = document.createElement('button');
        if (action === 'tear') b.className = 'tear';
        b.innerHTML = `${label}<small>${sub}</small>`;
        b.addEventListener('click', e => { e.stopPropagation(); sheet.classList.remove('open'); input.press(action); });
        grid.append(b);
    }
    sheet.append(grid);
    sheet.addEventListener('click', () => sheet.classList.remove('open'));
    document.body.append(sheet);

    const sticks = new Map();   // pointerId → { kind: 'move' | 'look', x0, y0, x, y }
    root.addEventListener('pointerdown', e => {
        if (e.target.closest('.btn')) return;
        // The minimap sits above this layer's corner: a tap there opens the world map.
        const mm = document.getElementById('minimap')?.getBoundingClientRect();
        if (mm && e.clientX >= mm.left && e.clientX <= mm.right && e.clientY >= mm.top && e.clientY <= mm.bottom) { input.press('map'); return; }
        root.setPointerCapture(e.pointerId);
        const kind = e.clientX < innerWidth / 2 ? 'move' : 'look';
        sticks.set(e.pointerId, { kind, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
        if (kind === 'move') {
            stick.style.display = 'block';
            stick.style.left = `${e.clientX}px`;
            stick.style.top = `${e.clientY}px`;
            knob.style.transform = '';
        }
        input.device = 'touch';
    });
    root.addEventListener('pointermove', e => {
        const s = sticks.get(e.pointerId);
        if (!s) return;
        if (s.kind === 'look') {
            cam.orbit(-(e.clientX - s.x) * 0.008, (e.clientY - s.y) * 0.005);   // turn speed / invert: settings, applied in cam.orbit
        } else {
            let dx = e.clientX - s.x0, dy = e.clientY - s.y0;
            const len = Math.hypot(dx, dy), max = 55;
            const run = len > max * 1.2;   // pushed past the ring: sprint
            if (len > max) { dx *= max / len; dy *= max / len; }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            input.touch.x = dx / max;
            input.touch.y = -dy / max;
            input.touch.sprint = run;
            stick.classList.toggle('run', run);
        }
        s.x = e.clientX; s.y = e.clientY;
    });
    const release = s => { if (s.kind === 'move') { stick.style.display = 'none'; stick.classList.remove('run'); input.touch.x = 0; input.touch.y = 0; input.touch.sprint = false; } };
    const end = e => {
        const s = sticks.get(e.pointerId);
        if (!s) return;
        sticks.delete(e.pointerId);
        release(s);
    };
    root.addEventListener('pointerup', end);
    root.addEventListener('pointercancel', end);

    // Pinch to zoom.
    let pinch = null;
    root.addEventListener('touchmove', e => {
        if (e.touches.length !== 2) { pinch = null; return; }
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinch) cam.zoom(pinch / d);
        pinch = d;
    }, { passive: true });

    const button = (sel, onDown, onUp) => {
        const el = root.querySelector(sel);
        el.addEventListener('pointerdown', e => { e.stopPropagation(); el.classList.add('on'); onDown(); });
        const up = () => { el.classList.remove('on'); onUp?.(); };
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener('pointerleave', up);
    };
    button('.fire', () => input.press('cast'));
    button('.hop', () => input.press('hop'));
    button('.hit', () => input.press('strike'));
    button('.menu', () => sheet.classList.add('open'));

    // Step aside while a menu or a conversation is open (and let go of the stick).
    setInterval(() => {
        const modal = !!document.querySelector(MODALS);
        if (modal && !document.body.classList.contains('modal-open')) { for (const s of sticks.values()) release(s); sticks.clear(); }
        document.body.classList.toggle('modal-open', modal);
    }, 150);

    return root;
}
