// The Book (B / touch MENU → Book): three tabs over amo's own data.
//   Skills  — amo's skill tree (MASTERY_DEFS), bought with Resonance Insights (PlayerStats.unlockMastery)
//   Spells  — amo's spellbook (SPELLS): what you know, each tier, mana, cooldown, damage and lore; the rest by
//             element as "not yet learned". (In 3D only the Fireball can be cast so far.)
//   Styles  — amo's fighting styles (STYLES / STYLE_SKILLS): progress, manuals read, lessons, each skill and
//             whether it is ready (skillState).
import { PlayerStats as PS, spells as SP, styleData, styles as styleRules, weapons as weaponRules, mastery as M } from '@rules';

const { MASTERY_DEFS } = PS, { SPELLS, TIER_NAMES, spellTooltip } = SP, { STYLES, STYLE_SKILLS } = styleData;
const CASTABLE = new Set(['fireball']);
const TABS = [['skills', 'Skills'], ['spells', 'Spells'], ['styles', 'Styles']];

export function createBook({ stats, hud, save }) {
    const css = document.createElement('style');
    css.textContent = `
#book { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#book.open { display: grid; }
#book .panel { width: min(760px, 94vw); max-height: 88vh; overflow: auto; padding: 18px 22px; border: 1px solid #c9b6ff66; border-radius: 14px; background: linear-gradient(160deg, #1c1828f2, #0d0b14f8); }
#book h2 { margin: 0 0 8px; font-weight: normal; letter-spacing: .16em; color: #d8c8ff; font-size: calc(24px * var(--ui, 1)); }
#book .tabs { display: flex; gap: 6px; margin-bottom: 10px; }
#book .tabs button, #book .close, #book .buy { font: calc(15px * var(--ui, 1)) Georgia, serif; padding: 7px 14px; border-radius: 8px; border: 1px solid #eee6d244; background: #ffffff0a; color: #eee6d2; cursor: pointer; }
#book .tabs button.on { border-color: #d8c8ff; background: #c9b6ff2a; }
#book .buy { border-color: #f3d88b; background: #3a2a14; color: #fff3d0; }
#book .buy[disabled] { opacity: .45; cursor: default; }
#book .close { float: right; }
#book .sub { font-size: calc(14px * var(--ui, 1)); opacity: .7; margin: 2px 0 8px; }
#book h3 { margin: 14px 0 6px; font-weight: normal; font-size: calc(14px * var(--ui, 1)); letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#book .e { padding: 10px 12px; margin-bottom: 8px; border-radius: 8px; background: #ffffff0a; border: 1px solid #ffffff14; display: flex; gap: 12px; align-items: flex-start; }
#book .e.dim { opacity: .5; }
#book .body { flex: 1; }
#book .t { font-size: calc(17px * var(--ui, 1)); color: #ece0ff; } #book .t small { font-size: calc(13px * var(--ui, 1)); opacity: .7; margin-left: 8px; letter-spacing: .06em; }
#book .x { font-size: calc(14px * var(--ui, 1)); opacity: .82; margin-top: 3px; }
#book .lore { font-size: calc(13px * var(--ui, 1)); opacity: .6; font-style: italic; margin-top: 4px; }
#book .bar { height: 6px; border-radius: 4px; background: #0008; border: 1px solid #ffffff22; overflow: hidden; margin-top: 6px; } #book .bar > div { height: 100%; background: linear-gradient(90deg, #6a4aaa, #c9a6ff); }
#book .tag { font-size: calc(12px * var(--ui, 1)); padding: 2px 8px; border-radius: 10px; border: 1px solid; white-space: nowrap; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'book';
    document.body.append(root);
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    let tab = 'skills';
    const tag = (text, color) => { const t = el('span', 'tag', text); t.style.color = color; t.style.borderColor = color; return t; };

    function skills(p) {
        p.append(el('div', 'sub', `Resonance Insights to spend: ${stats.resonanceInsights ?? 0} — earned by deepening an element's resonance.`));
        for (const d of Object.values(MASTERY_DEFS)) {
            const owned = !!stats.masteries?.[d.id], row = el('div', 'e'), body = el('div', 'body');
            const t = el('div', 't', d.name); t.append(el('small', null, `${d.cost} insight${d.cost > 1 ? 's' : ''}`));
            body.append(t, el('div', 'x', d.description), el('div', 'lore', d.lore ?? ''));
            row.append(body);
            if (owned) row.append(tag('Learned', '#9fe0a0'));
            else {
                const b = el('button', 'buy', 'Learn');
                b.disabled = (stats.resonanceInsights ?? 0) < d.cost;
                b.onclick = () => { if (stats.unlockMastery(d.id)) { hud.banner(d.name); save?.(); render(); } };
                row.append(b);
            }
            p.append(row);
        }
    }

    function spells(p) {
        const known = Object.values(SPELLS).filter(s => (stats.spells?.[s.id] ?? 0) > 0 && !s.id.startsWith('kill_') && !s.id.startsWith('take_'));
        p.append(el('div', 'sub', 'The spells you know. In this world only the Fireball can be cast for now — the others are learned and waiting.'));
        p.append(el('h3', null, `Known (${known.length})`));
        if (!known.length) p.append(el('div', 'x', 'None yet — the priest in Thaloria teaches spells, and scrolls drop from elites.'));
        for (const s of known) {
            const lvl = stats.spells[s.id], row = el('div', 'e'), body = el('div', 'body');
            const t = el('div', 't', s.name); t.append(el('small', null, `${s.element ?? ''} · ${TIER_NAMES?.[lvl - 1] ?? `tier ${lvl}`}`));
            body.append(t, el('div', 'x', spellTooltip(s, lvl, stats.attributes.intelligence)), el('div', 'lore', s.lore ?? ''));
            row.append(body, CASTABLE.has(s.id) ? tag('Castable', '#ffb070') : tag('Not castable yet', '#8a8aa0'));
            p.append(row);
        }
        const rest = Object.values(SPELLS).filter(s => !(stats.spells?.[s.id] > 0) && !s.id.startsWith('kill_') && !s.id.startsWith('take_'));
        const byEl = {};
        for (const s of rest) (byEl[s.element ?? 'other'] ??= []).push(s.name);
        p.append(el('h3', null, `Not yet learned (${rest.length})`));
        for (const [e, names] of Object.entries(byEl)) p.append(el('div', 'x', `${e[0].toUpperCase()}${e.slice(1)}: ${names.join(', ')}`));
    }

    function styles(p) {
        const st = stats.styles ?? { progress: {}, manuals: {}, lessons: {} };
        p.append(el('div', 'sub', 'Learned by practice (kills with the weapon), manuals and lessons. A style\'s skills open with the weapon\'s mastery (2 / 5 / 8) and go on Z, X, V.'));
        for (const s of Object.values(STYLES)) {
            const prog = Math.round(st.progress?.[s.id] ?? 0), known = prog >= 100;
            const weapon = weaponRules.WEAPON_TYPES[s.weapon]?.label ?? s.weapon, wl = stats.weaponLevel?.(s.weapon) ?? 0;
            const row = el('div', `e${prog === 0 ? ' dim' : ''}`), body = el('div', 'body');
            const t = el('div', 't', s.name); t.append(el('small', null, `${weapon} · mastery ${wl}`));
            body.append(t, el('div', 'x', s.blurb));
            const bar = el('div', 'bar'), fill = el('div'); fill.style.width = `${prog}%`; bar.append(fill); body.append(bar);
            body.append(el('div', 'x', `${known ? 'Learned' : `${prog}% learned`}${st.manuals?.[s.id] ? ' · manual read' : ''}${st.lessons?.[s.id] ? ` · ${st.lessons[s.id]} lesson${st.lessons[s.id] > 1 ? 's' : ''}` : ''}`));
            for (const id of s.skills) {
                const k = STYLE_SKILLS[id];
                const state = styleRules.skillState(st, id, wl, true);
                const word = state === 'ready' ? 'ready' : state === 'mastery' ? `needs mastery ${k.unlock}` : 'style not learned';
                body.append(el('div', 'x', `• ${k.name} — ${k.desc ?? k.description ?? ''} (${word})`));
            }
            row.append(body, known ? tag('Learned', '#9fe0a0') : tag(`${prog}%`, '#c9a6ff'));
            p.append(row);
        }
    }

    function render() {
        root.textContent = '';
        const p = el('div', 'panel');
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle(false);
        p.append(close, el('h2', null, 'The Book'));
        const tabs = el('div', 'tabs');
        for (const [id, label] of TABS) { const b = el('button', tab === id ? 'on' : '', label); b.onclick = () => { tab = id; render(); }; tabs.append(b); }
        p.append(tabs);
        ({ skills, spells, styles })[tab](p);
        root.append(p);
    }
    function toggle(on = !root.classList.contains('open'), which = null) {
        if (which) tab = which;
        root.classList.toggle('open', on);
        if (on) render();
    }
    addEventListener('keydown', e => {
        if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
        if (e.code === 'KeyB' && !document.body.classList.contains('title-on')) toggle();
        else if (e.code === 'Escape' && root.classList.contains('open')) toggle(false);
    });
    return { toggle, get open() { return root.classList.contains('open'); } };
}
