// Consumable hotbar — amo's hotbar.js: four slots (keys 1–4, D-pad, tap), a slot remembers its
// item even at zero (greyed), one shared 1 s cooldown. Items are put on it from the satchel.
import { hotbar as H, items as itemRules } from '@rules';

const { ITEMS } = itemRules;
const CSS = `
#hotbar { position: fixed; left: 50%; bottom: 22px; transform: translateX(calc(-100% - 46px)); display: flex; gap: 8px; z-index: 4; }
#hotbar .hs { position: relative; width: 50px; height: 50px; border-radius: 9px; border: 1px solid #eee6d266; background: #0009;
    display: grid; place-items: center; cursor: pointer; pointer-events: auto; font: calc(14px * var(--ui, 1)) Georgia, serif; color: #eee6d2; }
#hotbar .hs.dry { opacity: .4; }
#hotbar .hs .k { position: absolute; left: 4px; top: 1px; font-size: calc(14px * var(--ui, 1)); opacity: .8; }
#hotbar .hs .n { position: absolute; right: 4px; bottom: 1px; font-size: calc(14px * var(--ui, 1)); }
#hotbar .hs .g { width: 16px; height: 16px; border-radius: 4px; transform: rotate(45deg); }
#hotbar .hs .cd { position: absolute; left: 0; right: 0; bottom: 0; background: #000a; border-radius: 0 0 9px 9px; }`;

export function createHotbar({ stats, hud }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'hotbar';
    document.body.append(root);
    stats.hotbar ??= Array(H.HOTBAR_SIZE).fill(null);
    let now = 0;

    const slots = [...Array(H.HOTBAR_SIZE)].map((_, i) => {
        const s = document.createElement('div');
        s.className = 'hs';
        s.innerHTML = '<span class="k"></span><span class="g"></span><span class="n"></span><span class="cd"></span>';
        s.querySelector('.k').textContent = String(i + 1);
        s.addEventListener('pointerdown', e => { e.stopPropagation(); use(i); });
        root.append(s);
        return s;
    });

    function use(i) {
        const r = H.useHotbar(stats, i, now);
        if (r.ok) hud.message(`${ITEMS[r.id]?.name ?? r.id}`);
        else if (r.reason === 'none') hud.message('None left');
        return r;
    }

    // Put an item on the first free slot (or replace slot 1).
    function assign(itemId) {
        const free = (stats.hotbar ?? []).indexOf(null);
        return H.assignHotbar(stats, free >= 0 ? free : 0, itemId);
    }

    function update(dt) {
        now += dt * 1000;
        const view = H.hotbarView(stats);
        const cd = Math.max(0, ((stats._hotbarReadyAt ?? 0) - now) / H.HOTBAR_COOLDOWN_MS);
        view.forEach((v, i) => {
            const s = slots[i];
            s.classList.toggle('dry', !v || !v.ready);
            s.classList.toggle('empty', !v);
            s.querySelector('.g').style.background = v ? `#${v.color.toString(16).padStart(6, '0')}` : 'transparent';
            s.querySelector('.n').textContent = v ? `×${v.count}` : '';
            s.title = v ? v.name : 'empty';
            s.querySelector('.cd').style.height = `${cd * 100}%`;
        });
    }

    return { use, assign, update, canHotbar: H.canHotbar, get now() { return now; } };
}
