// Two-hand controls (Options → Controls → "Two-hand actions"). Each hand has an action button showing what it
// does now, and above it an arch that shows what comes next (the next action in colour, the one after in grey);
// tapping the arch cycles that hand's favourites, and the action button follows.
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
export const MAX_FAVS = 6;

export function createHands({ stats, hud, isTouch }) {
    // ---- what each hand holds ----
    const typeOfItem = id => {
        const def = id ? itemRules.ITEMS[id] : null;
        if (!def) return 'fists';
        if (def.slot === 'offHand') return WEAPON_TYPES[def.weaponType] ? def.weaponType : 'shield';
        return typeOf(def);
    };
    function handType(side) {
        const r = typeOfItem(stats.equipment.weapon);
        if (side === 'R') return r;
        return WEAPON_TYPES[r]?.hands === 2 ? null : typeOfItem(stats.equipment.offHand);   // a two-handed weapon takes both hands
    }
    const flags = () => (stats.flags ??= {});
    const canHold = (type, action) => {
        if (action === 'hit') return true;
        if (action.startsWith('spell:')) return MAGIC.has(type) && CASTABLE.includes(action.slice(6));
        if (action.startsWith('skill:')) { const k = STYLE_SKILLS[action.slice(6)]; return !!k && STYLES[k.style]?.weapon === type; }
        return false;
    };
    function favs(type) {
        if (!type) return [];
        const all = (flags().favs ??= {});
        if (!all[type]) all[type] = MAGIC.has(type) ? [`spell:${stats.flags?.activeSpell && CASTABLE.includes(stats.flags.activeSpell) ? stats.flags.activeSpell : 'fireball'}`, 'hit'] : ['hit'];
        all[type] = all[type].filter(a => canHold(type, a) && (!a.startsWith('spell:') || (stats.spells?.[a.slice(6)] ?? 0) > 0));
        if (!all[type].length) all[type] = ['hit'];
        return all[type];
    }
    const selOf = type => { const s = (flags().favSel ??= {}); const n = favs(type).length; return ((s[type] ?? 0) % n + n) % n; };
    const current = side => { const t = handType(side); return t ? favs(t)[selOf(t)] : null; };
    function cycle(side) {
        const t = handType(side); if (!t) return;
        const list = favs(t);
        if (list.length < 2) { hud.message('Add favourites in the Book — the ⋯ beside a spell'); return; }
        flags().favSel[t] = (selOf(t) + 1) % list.length;
        render(true);
    }
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
        const t = handType(side); if (!t || !canHold(t, action)) return false;
        const list = favs(t);
        if (!list.includes(action)) { if (list.length >= MAX_FAVS) list[selOf(t)] = action; else list.push(action); }
        (flags().favSel ??= {})[t] = list.indexOf(action);
        render(true);
        return true;
    }
    const magicHand = () => (MAGIC.has(handType('R')) ? 'R' : MAGIC.has(handType('L')) ? 'L' : null);

    // ---- names and glyphs ----
    const label = (type, action) => {
        if (!action) return '';
        if (action === 'hit') return type === 'staff' || type === 'wand' ? 'Hit' : WEAPON_TYPES[type]?.basic ?? 'Hit';
        if (action.startsWith('spell:')) return SPELLS[action.slice(6)]?.name ?? '';
        return STYLE_SKILLS[action.slice(6)]?.name ?? '';
    };
    const coin = (bg, path, grey) => `<svg viewBox="0 0 24 24" class="sicon"><circle cx="12" cy="12" r="11.3" fill="${grey ? '#2a2620' : bg}" stroke="${grey ? '#6a6050' : '#e8c878'}"/><path d="${path}" fill="none" stroke="${grey ? '#a89c84' : '#fff4dc'}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const FIST = 'M7 13 V9 Q7 7.5 8.5 7.5 Q10 7.5 10 9 V8 Q10 6.5 11.5 6.5 Q13 6.5 13 8 V8.5 Q13 7 14.5 7 Q16 7 16 8.5 V10 Q16 9 17 9 Q18 9 18 10.5 V14 Q18 18 13.5 18 H11 Q7 18 7 13Z';
    const SWING = 'M5 18 Q8 6 19 5 M19 5 L15 5.5 M19 5 L18 9 M7 20 L4 17';
    function glyph(type, action, grey = false) {
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
        e.addEventListener('pointerdown', ev => { ev.stopPropagation(); ev.preventDefault(); e.classList.add('on'); (kind === 'act' ? onAct : cycle)(side); });
        const up = () => e.classList.remove('on');
        e.addEventListener('pointerup', up); e.addEventListener('pointercancel', up); e.addEventListener('pointerleave', up);
        return e;
    };
    let onAct = () => {};
    const btn = { R: part('act R', 'R', 'act'), Ra: part('arch Ra', 'R', 'arch'), L: part('act L', 'L', 'act'), La: part('arch La', 'L', 'arch') };

    let last = '';
    function render(flash = false) {
        const on = !!settings.hands;
        document.body.classList.toggle('hands-on', on);
        if (!on) return;
        const keyR = isTouch ? '' : 'F', keyL = isTouch ? '' : 'R';
        const state = ['R', 'L'].map(s => { const t = handType(s); return t ? `${t}|${favs(t).join(',')}|${selOf(t)}` : '-'; }).join('/') + Object.keys(stats.spells ?? {}).length;
        if (state === last && !flash) return;
        const prev = last; last = state;
        for (const side of ['R', 'L']) {
            const t = handType(side), b = btn[side], a = btn[`${side}a`];
            b.style.display = a.style.display = t ? '' : 'none';
            if (!t) continue;
            const list = favs(t), i = selOf(t), cur = list[i];
            b.innerHTML = `${glyph(t, cur)}<span class="nm">${label(t, cur)}</span>${(side === 'R' ? keyR : keyL) ? `<span class="key">${side === 'R' ? keyR : keyL}</span>` : ''}`;
            b.title = `${side === 'R' ? 'Right' : 'Left'} hand (${WEAPON_TYPES[t]?.label ?? t}): ${label(t, cur)}`;
            const n1 = list.length > 1 ? list[(i + 1) % list.length] : null, n2 = list.length > 2 ? list[(i + 2) % list.length] : null;
            a.innerHTML = `<div class="row">${n1 ? `<span class="n1">${glyph(t, n1)}</span>` : ''}${n2 ? `<span class="n2">${glyph(t, n2, true)}</span>` : ''}${!n1 ? '<span style="color:#f3d88b88;font-size:12px">—</span>' : ''}</div>`;
            a.title = n1 ? `Next: ${label(t, n1)} (${isTouch ? 'tap' : side === 'R' ? 'C' : 'Z'})` : 'Add favourites in the Book';
        }
        if (flash && prev) for (const a of [btn.Ra, btn.La]) { a.classList.remove('flash'); void a.offsetWidth; a.classList.add('flash'); }
    }

    return {
        handType, favs, current, cycle, isFav, toggleFav, equip, magicHand, label, glyph, canHold, render,
        set onAct(fn) { onAct = fn; },
        get enabled() { return !!settings.hands; },
    };
}
