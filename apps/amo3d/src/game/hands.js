// Two-hand controls (Options → Controls → "Two-hand actions"). Each hand has an action button showing what it
// does now, and above it an arch that shows what comes next (the next action in colour, the one after in grey);
// the arch (or Z / C, or LB / RB): tap — the next favourite; double-tap — back one; hold — a fan of the others,
// pick one by sliding onto it (touch), moving the mouse or pressing 1–3 (keys), or the right stick (gamepad), and let go.
//   What a hand can do comes from what it holds: fists punch, a staff or wand hits and casts spells, other weapons
//   their basic blow and their style's skills.
//   Favourites belong to the kind of thing held (stats.flags.favs[type], e.g. 'staff'), not to the hand: move the
//   staff to the other hand and its favourites go with it. Set them in the Book (⋯ beside a spell or action).
//   Actions: 'hit' (the weapon's basic blow), 'spell:<id>', 'skill:<id>'.
// Controls: touch — the two buttons and their arches; mouse — left click left hand, right click right hand;
// keys — R left hand, F right hand, Z / C cycle left / right; gamepad — LT / RT act, LB / RB cycle.
// (Two of the same kind in both hands share one list for now.)
import { items as itemRules, weapons as weaponRules, styleData, spells as SP } from '@rules';
import { CASTABLE } from './fireball.js';
import { iconSVG } from './spellIcons.js';
import { settings } from '../engine/settings.js';

const { WEAPON_TYPES, typeOf } = weaponRules, { STYLES, STYLE_SKILLS } = styleData, { SPELLS } = SP;
const MAGIC = new Set(['staff', 'wand']);
export const MAX_FAVS = 4;   // the action in hand plus three in the fan
const HOLD_MS = 280, DOUBLE_MS = 300;

export function createHands({ stats, hud, isTouch, input }) {
    // ---- what each hand holds ----
    const typeOfItem = id => {
        const def = id ? itemRules.ITEMS[id] : null;
        if (!def) return 'fists';
        if (def.id === 'torch') return null;   // a torch is held, not used
        if (def.slot === 'offHand') return WEAPON_TYPES[def.weaponType] ? def.weaponType : 'shield';
        return typeOf(def);
    };
    function handType(side) {
        const r = typeOfItem(stats.equipment.weapon);
        if (side === 'R') return r;
        return WEAPON_TYPES[r]?.hands === 2 ? null : typeOfItem(stats.equipment.offHand);   // a two-handed weapon takes both hands
    }
    const flags = () => (stats.flags ??= {});
    // Favourites belong to the kind of weapon held; with the same kind in both hands, the left keeps its own list
    // (key 'sword:L'). base(key) is the weapon kind.
    const base = k => k?.split(':')[0] ?? k;
    const slotKey = side => { const t = handType(side); return t && side === 'L' && t === handType('R') ? `${t}:L` : t; };
    const canHold = (type, action) => {
        type = base(type);
        if (action === 'hit') return true;
        if (action.startsWith('spell:')) return MAGIC.has(type) && CASTABLE.includes(action.slice(6));
        if (action.startsWith('skill:')) { const k = STYLE_SKILLS[action.slice(6)]; return !!k && STYLES[k.style]?.weapon === type; }
        return false;
    };
    function favs(type) {
        if (!type) return [];
        const all = (flags().favs ??= {});
        if (!all[type]) all[type] = MAGIC.has(base(type)) ? [`spell:${stats.flags?.activeSpell && CASTABLE.includes(stats.flags.activeSpell) ? stats.flags.activeSpell : 'fireball'}`, 'hit'] : ['hit'];
        all[type] = all[type].filter(a => canHold(type, a) && (!a.startsWith('spell:') || (stats.spells?.[a.slice(6)] ?? 0) > 0)).slice(0, MAX_FAVS);
        if (!all[type].length) all[type] = ['hit'];
        return all[type];
    }
    const selOf = type => { const s = (flags().favSel ??= {}); const n = favs(type).length; return ((s[type] ?? 0) % n + n) % n; };
    const current = side => { const t = slotKey(side); return t ? favs(t)[selOf(t)] : null; };
    function step(side, d) {
        const t = slotKey(side); if (!t) return;
        const list = favs(t);
        if (list.length < 2) { hud.message('Add favourites in the Book — the ⋯ beside a spell'); return; }
        (flags().favSel ??= {})[t] = (selOf(t) + d + list.length) % list.length;
        render(true);
    }
    const cycle = side => step(side, 1);

    // ---- tap / double-tap / hold on a cycle control ----
    // A tap moves on at once (no waiting to see if a second comes); a second tap soon after takes it back two,
    // so a double-tap lands one before where you started.
    let press = null, lastTap = { side: null, at: 0 }, fan = null;
    function cycleDown(side, how, x = 0, y = 0) {
        if (press && performance.now() - press.at < 4000) return;   // (a release lost to a menu opening frees it after a while)
        if (fan) pickFan(-1);
        press = { side, how, at: performance.now(), x, y };
    }
    function cycleUp(side) {
        if (!press || press.side !== side) return;
        const p = press; press = null;
        if (fan) { pickFan(); return; }
        const now = performance.now();
        if (lastTap.side === side && now - lastTap.at < DOUBLE_MS) { step(side, -2); lastTap.at = 0; }
        else { step(side, 1); lastTap = { side, at: now }; }
        void p;
    }
    function update() {
        if (press && !fan && performance.now() - press.at > HOLD_MS) openFan(press.side, press.how);
        if (fan && fan.how === 'pad' && input?.fan) { const { x, y } = input.fan; if (Math.hypot(x, y) > 0.5) aimDir(x, -y); }
    }
    // The fan: the other favourites in an arc over the hand's button.
    const CENTER = { R: [46, 46], L: [154, 42] }, ANGLES = { R: [94, 128, 162], L: [62, 100, 138] }, RAD = 150;
    function openFan(side, how) {
        const t = slotKey(side); if (!t) return;
        const list = favs(t), i = selOf(t);
        if (list.length < 2) { hud.message('Add favourites in the Book — the ⋯ beside a spell'); press = null; return; }
        const others = list.map((a, j) => ({ a, j })).filter(o => o.j !== i);
        const [cr, cb] = CENTER[side];
        fanEl.textContent = '';
        const items = others.map((o, k) => {
            const ang = ANGLES[side][k] * Math.PI / 180, dx = Math.cos(ang) * RAD, dy = Math.sin(ang) * RAD;
            const e = document.createElement('div'); e.className = 'fi';
            e.style.right = `${cr - dx - 30}px`; e.style.bottom = `${cb + dy - 30}px`;
            e.innerHTML = `${glyph(t, o.a)}<span class="nm">${label(t, o.a)}</span>${how === 'key' ? `<span class="key">${k + 1}</span>` : ''}`;
            fanEl.append(e);
            return { ...o, e, ang, dx, dy };
        });
        fan = { side, how, t, items, pick: -1, mx: 0, my: 0 };
        root.classList.add('fanning');
        if (input) input.fan.open = true;
    }
    function highlight(k) {
        if (!fan) return;
        fan.pick = k;
        fan.items.forEach((it, j) => it.e.classList.toggle('hl', j === k));
    }
    // Pointing in a direction (mouse movement, a stick): the item whose angle is nearest.
    function aimDir(dx, dy) {
        if (!fan) return;
        const a = Math.atan2(dy, dx);
        let best = -1, bd = Infinity;
        fan.items.forEach((it, j) => { const d = Math.abs(Math.atan2(Math.sin(a - it.ang), Math.cos(a - it.ang))); if (d < bd) { bd = d; best = j; } });
        highlight(bd < 0.8 ? best : -1);
    }
    // A finger on the screen: the item under it (or nearest, within reach).
    function aimPoint(x, y) {
        if (!fan) return;
        let best = -1, bd = 70;
        fan.items.forEach((it, j) => { const r = it.e.getBoundingClientRect(), d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)); if (d < bd) { bd = d; best = j; } });
        highlight(best);
    }
    function pickFan(k = fan?.pick ?? -1) {
        if (!fan) return;
        const f = fan; fan = null;
        root.classList.remove('fanning'); fanEl.textContent = '';
        if (input) { input.fan.open = false; input.fan.x = input.fan.y = 0; }
        if (k >= 0 && f.items[k]) { (flags().favSel ??= {})[f.t] = f.items[k].j; render(true); }
    }
    // Keys while a key-held fan is open: 1–3 pick at once; the mouse's movement points.
    addEventListener('keydown', e => { if (!fan || fan.how !== 'key') return; const k = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code); if (k >= 0 && fan.items[k]) { e.stopImmediatePropagation(); press = null; pickFan(k); } }, true);
    addEventListener('mousemove', e => { if (!fan || fan.how !== 'key') return; fan.mx += e.movementX; fan.my += e.movementY; if (Math.hypot(fan.mx, fan.my) > 24) aimDir(fan.mx, -fan.my); });
    // Favourites from the Book.
    const isFav = (type, action) => favs(type).includes(action);
    function toggleFav(type, action) {
        const list = favs(type);
        const i = list.indexOf(action);
        if (i >= 0) { if (list.length === 1) return hud.message('A hand keeps at least one action'), false; list.splice(i, 1); }
        else { if (list.length >= MAX_FAVS) return hud.message(`${MAX_FAVS} favourites at most — remove one first`), false; list.push(action); }
        flags().favSel[type] = Math.min(selOf(type), list.length - 1);
        render(true);
        return true;
    }
    // The Book's Equip: make it this hand's action now (added to its favourites if it isn't one).
    function equip(side, action) {
        const t = slotKey(side); if (!t || !canHold(t, action)) return false;
        const list = favs(t);
        if (!list.includes(action)) { if (list.length >= MAX_FAVS) return 'full'; list.push(action); }   // full: the Book asks which to replace
        (flags().favSel ??= {})[t] = list.indexOf(action);
        render(true);
        return true;
    }
    // Put an action in place of another favourite (the Book's "Replace which?"); equip: make it the hand's action too.
    function replaceFav(type, old, action, equip = false) {
        const list = favs(type), i = list.indexOf(old);
        if (i < 0 || list.includes(action)) return false;
        list[i] = action;
        if (equip) (flags().favSel ??= {})[type] = i;
        render(true);
        return true;
    }
    const magicHand = () => (MAGIC.has(handType('R')) ? 'R' : MAGIC.has(handType('L')) ? 'L' : null);

    // ---- names and glyphs ----
    const label = (type, action) => {
        type = base(type);
        if (!action) return '';
        if (action === 'hit') return type === 'staff' || type === 'wand' ? 'Hit' : WEAPON_TYPES[type]?.basic ?? 'Hit';
        if (action.startsWith('spell:')) return SPELLS[action.slice(6)]?.name ?? '';
        return STYLE_SKILLS[action.slice(6)]?.name ?? '';
    };
    const coin = (bg, path, grey) => `<svg viewBox="0 0 24 24" class="sicon"><circle cx="12" cy="12" r="11.3" fill="${grey ? '#2a2620' : bg}" stroke="${grey ? '#6a6050' : '#e8c878'}"/><path d="${path}" fill="none" stroke="${grey ? '#a89c84' : '#fff4dc'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const FIST = 'M7 13 V9 Q7 7.5 8.5 7.5 Q10 7.5 10 9 V8 Q10 6.5 11.5 6.5 Q13 6.5 13 8 V8.5 Q13 7 14.5 7 Q16 7 16 8.5 V10 Q16 9 17 9 Q18 9 18 10.5 V14 Q18 18 13.5 18 H11 Q7 18 7 13Z';
    const SWING = 'M5 18 Q8 6 19 5 M19 5 L15 5.5 M19 5 L18 9 M7 20 L4 17';
    function glyph(type, action, grey = false) {
        type = base(type);
        if (!action) return '';
        if (action.startsWith('spell:')) { const s = SPELLS[action.slice(6)]; return s ? iconSVG(s, { locked: grey }) : ''; }
        if (action === 'hit') return coin('#5a3a1a', type === 'fists' ? FIST : SWING, grey);
        return coin('#2a3a5a', 'M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10Z', grey);
    }

    // ---- the buttons ----
    const css = document.createElement('style');
    const u = v => `calc(${v}px * var(--ui, 1))`;
    css.textContent = `
#hands { position: fixed; right: calc(14px + env(safe-area-inset-right, 0px)); bottom: 14px; z-index: 6; width: 0; height: 0; display: none; touch-action: none; user-select: none; -webkit-user-select: none; font-family: Georgia, serif; }
body.hands-on #hands { display: block; }
body.modal-open #hands { display: none !important; }
#hands .act, #hands .arch { position: absolute; display: grid; place-items: center; box-sizing: border-box; cursor: pointer; }
#hands .act { border-radius: 50%; border: 2px solid #f3d88bcc; background: #0b0a10b0; box-shadow: 0 2px 8px #0008; }
#hands .act .sicon { width: 78%; height: 78%; }
#hands .act .nm { position: absolute; left: 50%; bottom: -2px; transform: translate(-50%, 100%); white-space: nowrap; font-size: ${u(12)}; color: #fff3d8; text-shadow: 0 1px 3px #000; }
#hands .act .key { position: absolute; left: -4px; top: -4px; font-size: ${u(11)}; color: #f3d88b; background: #0b0a10cc; border-radius: 6px; padding: 0 4px; }
#hands .act.on { transform: scale(.93); background: #f3d88b55; }
#hands .arch { border: 2px solid #f3d88b88; border-bottom: 0; border-radius: 999px 999px 0 0; background: #0b0a1088; }
#hands .arch .row { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
#hands .arch .n1 { width: 30px; height: 30px; } #hands .arch .n2 { width: 22px; height: 22px; opacity: .7; }
#hands .arch .n1 .sicon, #hands .arch .n2 .sicon { width: 100%; height: 100%; }
#hands .arch.on { background: #f3d88b44; }
#hands .arch.flash { animation: hflash .25s; } @keyframes hflash { from { background: #f3d88b88; } }
#hands .R { right: 0; bottom: 0; width: 92px; height: 92px; }
#hands .Ra { right: -4px; bottom: 104px; width: 100px; height: 50px; }
#hands .L { right: 116px; bottom: 4px; width: 76px; height: 76px; }
#hands .La { right: 112px; bottom: 96px; width: 84px; height: 44px; }
#hands .La .n1 { width: 26px; height: 26px; } #hands .La .n2 { width: 18px; height: 18px; }
#hands .fan { position: absolute; right: 0; bottom: 0; width: 0; height: 0; }
#hands .fi { position: absolute; width: 60px; height: 60px; border-radius: 50%; display: grid; place-items: center; border: 2px solid #f3d88b99; background: #0b0a10d8; box-shadow: 0 2px 10px #000a; transition: transform .08s; }
#hands .fi .sicon { width: 80%; height: 80%; }
#hands .fi .nm { position: absolute; left: 50%; top: 100%; transform: translateX(-50%); white-space: nowrap; font-size: ${u(12)}; color: #fff3d8; text-shadow: 0 1px 3px #000; }
#hands .fi .key { position: absolute; left: -4px; top: -4px; font-size: ${u(11)}; color: #f3d88b; background: #0b0a10cc; border-radius: 6px; padding: 0 4px; }
#hands .fi.hl { transform: scale(1.22); border-color: #ffd76a; box-shadow: 0 0 16px #ffd76aaa; }
#hands.fanning .act, #hands.fanning .arch { opacity: .3; }
body:not(.touch-mode) #hands { transform: scale(.82); transform-origin: 100% 100%; }
body.touch-mode.hands-on #touch .fire, body.touch-mode.hands-on #touch .hit { display: none; }
body.touch-mode.hands-on #touch .hop { right: calc(228px + env(safe-area-inset-right, 0px)); bottom: 20px; width: 64px; height: 64px; }
body.hands-on #skills { display: none !important; }
body.hands-on #slot, body.hands-on #slot-name { display: none !important; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'hands';
    document.body.append(root);
    const part = (cls, side, kind) => {
        const e = document.createElement('div'); e.className = cls; root.append(e);
        if (kind === 'act') {   // down / move / up: a tap acts, a hold with a spell aims it (drag toward the target)
            e.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); try { e.setPointerCapture(ev.pointerId); } catch { /* synthetic */ } e.classList.add('on'); onAct(side, 'down', ev.clientX, ev.clientY); });
            e.addEventListener('pointermove', ev => { if (e.classList.contains('on')) onAct(side, 'move', ev.clientX, ev.clientY); });
            const up = () => { if (!e.classList.contains('on')) return; e.classList.remove('on'); onAct(side, 'up'); };
            e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up);
        } else {   // the arch: tap, double-tap, hold for the fan (slide onto an item, let go)
            e.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); try { e.setPointerCapture(ev.pointerId); } catch { /* synthetic */ } e.classList.add('on'); cycleDown(side, 'touch', ev.clientX, ev.clientY); });
            e.addEventListener('pointermove', ev => { if (fan) aimPoint(ev.clientX, ev.clientY); });
            const up = () => { e.classList.remove('on'); cycleUp(side); };
            e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up);
        }
        return e;
    };
    let onAct = () => {};
    const btn = { R: part('act R', 'R', 'act'), Ra: part('arch Ra', 'R', 'arch'), L: part('act L', 'L', 'act'), La: part('arch La', 'L', 'arch') };
    const fanEl = document.createElement('div'); fanEl.className = 'fan'; root.append(fanEl);

    let last = '';
    function render(flash = false) {
        const on = !!settings.hands;
        document.body.classList.toggle('hands-on', on);
        if (!on) return;
        const keyR = isTouch ? '' : 'F', keyL = isTouch ? '' : 'R';
        const state = ['R', 'L'].map(s => { const t = slotKey(s); return t ? `${t}|${favs(t).join(',')}|${selOf(t)}` : '-'; }).join('/') + Object.keys(stats.spells ?? {}).length;
        if (state === last && !flash) return;
        const prev = last; last = state;
        for (const side of ['R', 'L']) {
            const t = slotKey(side), b = btn[side], a = btn[`${side}a`];
            b.style.display = a.style.display = t ? '' : 'none';
            if (!t) continue;
            const list = favs(t), i = selOf(t), cur = list[i];
            b.innerHTML = `${glyph(t, cur)}<span class="nm">${label(t, cur)}</span>${(side === 'R' ? keyR : keyL) ? `<span class="key">${side === 'R' ? keyR : keyL}</span>` : ''}`;
            b.title = `${side === 'R' ? 'Right' : 'Left'} hand (${WEAPON_TYPES[base(t)]?.label ?? t}): ${label(t, cur)}`;
            const n1 = list.length > 1 ? list[(i + 1) % list.length] : null, n2 = list.length > 2 ? list[(i + 2) % list.length] : null;
            a.innerHTML = `<div class="row">${n1 ? `<span class="n1">${glyph(t, n1)}</span>` : ''}${n2 ? `<span class="n2">${glyph(t, n2, true)}</span>` : ''}${!n1 ? '<span style="color:#f3d88b88;font-size:12px">—</span>' : ''}</div>`;
            a.title = n1 ? `Next: ${label(t, n1)} — ${isTouch ? 'tap' : side === 'R' ? 'C' : 'Z'}: next · double: back · hold: all` : 'Add favourites in the Book';
        }
        if (flash && prev) for (const a of [btn.Ra, btn.La]) { a.classList.remove('flash'); void a.offsetWidth; a.classList.add('flash'); }
    }

    return {
        handType, slotKey, base, favs, current, replaceFav, cycle, cycleDown, cycleUp, update, get fanOpen() { return !!fan; }, isFav, toggleFav, equip, magicHand, label, glyph, canHold, render,
        set onAct(fn) { onAct = fn; },
        get enabled() { return !!settings.hands; },
    };
}
