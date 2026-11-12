// On-screen controls for phones and tablets: a floating joystick on the left half, camera drag
// on the right half, and buttons for fireball, hop and sprint. Shown on touch devices (or ?touch=1).
export function createTouchControls({ input, cam }) {
    const forced = new URLSearchParams(location.search).get('touch') === '1';
    if (!forced && !matchMedia('(pointer: coarse)').matches) return null;

    const css = document.createElement('style');
    css.textContent = `
        #touch { position: fixed; inset: 0; z-index: 5; touch-action: none; user-select: none; -webkit-user-select: none; }
        #touch .stick { position: absolute; width: 130px; height: 130px; margin: -65px 0 0 -65px; border-radius: 50%;
            border: 2px solid #eee6d266; background: #0004; display: none; }
        #touch .knob { position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; margin: -28px 0 0 -28px;
            border-radius: 50%; background: #eee6d2aa; }
        #touch .btn { position: absolute; border-radius: 50%; display: grid; place-items: center; color: #fff;
            font: 13px Georgia, serif; letter-spacing: .06em; border: 2px solid #f3d88b; background: #0007; }
        #touch .btn.on { background: #f3d88b55; }
        #touch .cast { right: 26px; bottom: 120px; width: 84px; height: 84px;
            background: radial-gradient(circle at 50% 45%, #ffd27a 0, #ff7a20 30%, #7a1f08 70%, #2a0c04 100%); }
        #touch .hop { right: 124px; bottom: 34px; width: 70px; height: 70px; }
        #touch .sprint { right: 26px; bottom: 26px; width: 70px; height: 70px; }
        #touch .hero { left: 84px; top: 70px; width: 58px; height: 58px; font-size: 12px; }
        #touch .bag { left: 18px; top: 70px; width: 58px; height: 58px; font-size: 12px; }
        #touch .strike { right: 124px; bottom: 124px; width: 70px; height: 70px; }`;
    document.head.append(css);

    const root = document.createElement('div');
    root.id = 'touch';
    root.innerHTML = '<div class="stick"><div class="knob"></div></div>'
        + '<div class="btn bag">BAG</div><div class="btn hero">HERO</div><div class="btn cast">FIRE</div><div class="btn strike">HIT</div><div class="btn hop">HOP</div><div class="btn sprint">RUN</div>';
    document.body.append(root);
    document.body.classList.add('touch-mode');
    const stick = root.querySelector('.stick'), knob = root.querySelector('.knob');

    const sticks = new Map();   // pointerId → { kind: 'move' | 'look', x0, y0, x, y }
    root.addEventListener('pointerdown', e => {
        if (e.target.closest('.btn')) return;
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
            cam.orbit(-(e.clientX - s.x) * 0.008, (e.clientY - s.y) * 0.005);
        } else {
            let dx = e.clientX - s.x0, dy = e.clientY - s.y0;
            const len = Math.hypot(dx, dy), max = 55;
            if (len > max) { dx *= max / len; dy *= max / len; }
            knob.style.transform = `translate(${dx}px, ${dy}px)`;
            input.touch.x = dx / max;
            input.touch.y = -dy / max;
        }
        s.x = e.clientX; s.y = e.clientY;
    });
    const end = e => {
        const s = sticks.get(e.pointerId);
        if (!s) return;
        sticks.delete(e.pointerId);
        if (s.kind === 'move') { stick.style.display = 'none'; input.touch.x = 0; input.touch.y = 0; }
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
    button('.cast', () => input.press('cast'));
    button('.hop', () => input.press('hop'));
    button('.strike', () => input.press('strike'));
    button('.bag', () => input.press('inventory'));
    button('.hero', () => input.press('sheet'));
    button('.sprint', () => { input.touch.sprint = true; }, () => { input.touch.sprint = false; });

    return root;
}
