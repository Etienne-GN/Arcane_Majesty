// The Hero (P, or C with classic controls / gamepad Menu / MENU → Hero): a parchment character sheet in a leather
// frame. The name, level and experience across the top; then three columns — attributes (spend points with the
// big + buttons) and the three vitals; weapon and element mastery against the talent ceilings (mastery.js), with
// their icons; the fighting styles of what you hold, and which one you practise. Spells live in the Spellbook.
// Pauses the game while open, like the satchel.
import '@fontsource/im-fell-english/400.css';
import { mastery as M, weapons as weaponRules, styles as styleRules, styleData, items as itemRules } from '@rules';
import { glyphSVG } from './itemIcons.js';
import { ELEMENTS, iconSVG } from './spellIcons.js';
import { settings } from '../engine/settings.js';
import { isOutsider, OUTSIDER } from './outsider.js';

const { pointsFor, levelOf, MAX_LEVEL } = M;
const { WEAPON_TYPES } = weaponRules;
const { stylesFor, STYLE_SKILLS } = styleData;
const { skillState, handTypes, practising, knowsStyle } = styleRules;
const STATE_TEXT = { ready: 'ready', mastery: 'needs mastery', weapon: 'weapon not in hand', style: 'style not learned' };
const SIGN = { fire: 'fireball', water: 'water_conjure', ice: 'frostbite', earth: 'earth_pillar', nature: 'vine_grasp', wind: 'cyclone', lightning: 'arc_bolt', shadow: 'void_pulse', arcane: 'arcane_circle' };
const ATTR_ICON = {
    strength: '<path d="M7 13 V9 Q7 7.5 8.5 7.5 Q10 7.5 10 9 V8 Q10 6.5 11.5 6.5 Q13 6.5 13 8 Q13 7 14.5 7 Q16 7 16 8.5 V10 Q16 9 17 9 Q18 9 18 10.5 V14 Q18 18 13.5 18 H11 Q7 18 7 13Z"/>',
    intelligence: '<path d="M4 6 Q8 4 12 6 Q16 4 20 6 V19 Q16 17 12 19 Q8 17 4 19Z M12 6 V19"/>',
    stamina: '<path d="M12 20 C3 14 3 7 7.5 6 C10 5.5 11.5 7.5 12 9 C12.5 7.5 14 5.5 16.5 6 C21 7 21 14 12 20Z"/>',
    agility: '<path d="M5 20 Q8 8 19 4 Q17 14 7 18Z M5 20 L15 9"/>',
};
const ATTRS = [['strength', 'Strength', 'Harder blows with weapons and fists.'], ['intelligence', 'Intelligence', 'More mana (+8) and stronger spells.'],
    ['stamina', 'Stamina', 'More health (+8).'], ['agility', 'Agility', 'Faster, more Vigor, more critical hits.']];

const CSS = `
#sheet { position: fixed; inset: 0; z-index: 8; display: none; place-items: center; background: #05060ad0; font-family: 'IM Fell English', Georgia, serif; color: #2e2010; }
#sheet.open { display: grid; }
#sheet .frame { position: relative; width: min(1040px, 97vw); height: min(640px, calc(100vh - 24px)); box-sizing: border-box; padding: 10px; border-radius: 14px;
  background: linear-gradient(135deg, #4a2c18, #2e1a0c); box-shadow: 0 12px 40px #000c, inset 0 0 0 2px #8a5a2a, inset 0 0 0 5px #2a140a, inset 0 0 0 6px #b08040; }
#sheet .paper { height: 100%; overflow: auto; touch-action: pan-y; box-sizing: border-box; padding: 12px 18px 16px; border-radius: 6px;
  background: radial-gradient(ellipse at 50% 30%, #f6ead0, #ecdcb6 70%, #dcc596); box-shadow: inset 0 0 30px #8a6a3a55; scrollbar-width: thin; scrollbar-color: #8a6a3a transparent; }
#sheet .close { position: absolute; right: -8px; top: -10px; width: 42px; height: 42px; border-radius: 50%; border: 0; cursor: pointer; color: #f4d8b0; font: bold 17px Georgia, serif; z-index: 2;
  background: radial-gradient(circle at 40% 35%, #b8342a, #6a1410); box-shadow: 0 2px 6px #000a; }
#sheet .top { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding-bottom: 8px; border-bottom: 1px solid #8a6a3a55; margin-bottom: 10px; }
#sheet .lvl { width: calc(52px * var(--ui, 1)); height: calc(52px * var(--ui, 1)); border-radius: 50%; display: grid; place-items: center; flex: none; color: #fff4dc;
  background: radial-gradient(circle at 40% 35%, #b8862a, #6a4410); box-shadow: inset 0 0 0 2px #f3d88b, 0 2px 6px #0006; font: bold calc(22px * var(--ui, 1)) Georgia, serif; line-height: 1; }
#sheet .lvl small { display: block; font-size: calc(9px * var(--ui, 1)); letter-spacing: .1em; text-align: center; }
#sheet h2 { margin: 0; font-weight: normal; font-size: calc(30px * var(--ui, 1)); color: #3a1e0a; }
#sheet .xp { flex: 1; min-width: 200px; }
#sheet .xp .lab { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #5a4228; }
#sheet .pts { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-weight: 500; font-size: calc(19px * var(--ui, 1)); color: #fff4dc; background: #8a3a1a; border-radius: 12px; padding: 2px 10px; animation: pts 1.6s infinite; }
@keyframes pts { 50% { box-shadow: 0 0 10px #d86a3a; } }
#sheet .cols { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 18px; }
#sheet h3 { margin: 6px 0 6px; font-weight: normal; font-style: italic; font-size: calc(18px * var(--ui, 1)); color: #6a3a1a; border-bottom: 1px solid #8a6a3a55; }
#sheet .attr { display: flex; align-items: center; gap: 10px; padding: 5px 0; }
#sheet .attr .ic { width: calc(34px * var(--ui, 1)); height: calc(34px * var(--ui, 1)); flex: none; border-radius: 50%; background: #3a2414; display: grid; place-items: center; }
#sheet .attr .ic svg { width: 64%; height: 64%; fill: #f3d88b; stroke: #f3d88b; stroke-width: .6; }
#sheet .attr .nm { flex: 1; min-width: 0; font-size: calc(17px * var(--ui, 1)); }
#sheet .attr .nm small { display: block; font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #5a4228; line-height: 1.05; }
#sheet .attr .v { font: calc(24px * var(--ui, 1)) Georgia, serif; color: #3a1e0a; min-width: 1.6em; text-align: right; }
#sheet .plus { width: calc(34px * var(--ui, 1)); height: calc(34px * var(--ui, 1)); border-radius: 50%; border: 0; cursor: pointer; font: bold calc(20px * var(--ui, 1)) Georgia, serif; color: #fff4dc; background: radial-gradient(circle at 40% 35%, #c8642a, #7a2a10); box-shadow: 0 2px 4px #0006; flex: none; }
#sheet .vital { margin: 6px 0; }
#sheet .vital .lab { display: flex; justify-content: space-between; font-size: calc(15px * var(--ui, 1)); }
#sheet .bar { height: 9px; border-radius: 5px; background: #0002; overflow: hidden; box-shadow: inset 0 1px 2px #0003; margin-top: 2px; }
#sheet .bar > div { height: 100%; border-radius: 5px; }
#sheet .m { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
#sheet .m .ic { width: calc(32px * var(--ui, 1)); height: calc(32px * var(--ui, 1)); flex: none; }
#sheet .m .ic svg { width: 100%; height: 100%; }
#sheet .m .ic.w { border-radius: 8px; background: #3a2414; display: grid; place-items: center; } #sheet .m .ic.w svg { width: 76%; height: 76%; }
#sheet .m .body { flex: 1; min-width: 0; }
#sheet .m .row1 { display: flex; justify-content: space-between; font-size: calc(16px * var(--ui, 1)); }
#sheet .m .sub { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #5a4228; }
#sheet .style { padding: 6px 0 8px; border-bottom: 1px dotted #8a6a3a66; }
#sheet .style .row1 { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: calc(17px * var(--ui, 1)); }
#sheet .style .blurb { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(15px * var(--ui, 1)); color: #3a2a1a; }
#sheet .style .sk { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #5a4228; }
#sheet .style .sk.ready { color: #2a5a1a; }
#sheet .tag { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #3a6a2a; white-space: nowrap; }
#sheet .btn { font: calc(15px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 5px 12px; border-radius: 7px; cursor: pointer; color: #fff0d0; border: 1px solid #4a1e0a; background: linear-gradient(#8a3a1a, #5a200c); }
#sheet .note { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #6a5236; margin-top: 8px; }
@media (max-width: 760px) { #sheet .cols { grid-template-columns: 1fr; } }`;

export function createSheet({ stats, name = 'Eldrin' }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'sheet';
    document.body.append(root);
    root.addEventListener('click', e => { if (e.target === root) toggle(); });
    let open = false;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
    const svg = html => { const s = document.createElement('span'); s.innerHTML = html; return s.firstChild; };   // our own generated SVG only
    const bar = (pct, colours) => { const b = el('div', 'bar'), f = el('div'); f.style.width = `${Math.max(0, Math.min(100, pct))}%`; f.style.background = colours; b.append(f); return b; };

    function masteryRow(icon, label, points, ceiling) {
        const lvl = Math.min(levelOf(points), ceiling), cur = pointsFor(lvl), next = pointsFor(Math.min(lvl + 1, MAX_LEVEL)), atCap = lvl >= ceiling;
        const row = el('div', 'm'), body = el('div', 'body'), r1 = el('div', 'row1');
        row.append(icon);
        r1.append(el('span', null, label), el('span', null, `level ${lvl}`));
        body.append(r1, bar(atCap ? 100 : ((points - cur) / Math.max(1, next - cur)) * 100, atCap ? 'linear-gradient(90deg, #6a8a3a, #a8c86a)' : 'linear-gradient(90deg, #8a5a1a, #e8b84a)'));
        body.append(el('div', 'sub', atCap ? `As far as your talent goes (${ceiling}).` : `${Math.floor(points)} / ${next} towards level ${lvl + 1} · talent allows ${ceiling}`));
        row.append(body);
        return row;
    }

    function render() {
        root.textContent = '';
        const s = stats;
        const frame = el('div', 'frame'), paper = el('div', 'paper');
        const close = el('button', 'close', '✕'); close.title = 'Close'; close.onclick = toggle;
        // Name, level, experience.
        const top = el('div', 'top'), lvl = el('div', 'lvl');
        lvl.append(el('small', null, 'LEVEL'), document.createTextNode(`${s.level}`));
        const xp = el('div', 'xp');
        xp.append(el('div', 'lab', `${s.xp} / ${s.xpToNextLevel} experience to the next level`), bar((s.xp / Math.max(1, s.xpToNextLevel)) * 100, 'linear-gradient(90deg, #6a3aaa, #c8a6ff)'));
        top.append(lvl, el('h2', null, name), xp);
        if (isOutsider()) top.append(el('span', 'pts', `Outlander here: traders ask ${Math.round((OUTSIDER.price - 1) * 100)}% more, wounds heal ${Math.round((1 - OUTSIDER.regen) * 100)}% slower, +${Math.round((OUTSIDER.xp - 1) * 100)}% experience`));
        if ((s.attributePoints ?? 0) > 0) top.append(el('span', 'pts', `${s.attributePoints} point${s.attributePoints > 1 ? 's' : ''} to spend`));
        paper.append(top);
        const cols = el('div', 'cols');

        // Attributes and vitals.
        const a = el('div');
        a.append(el('h3', null, 'Attributes'));
        for (const [key, label, what] of ATTRS) {
            const row = el('div', 'attr'), ic = el('div', 'ic'), nm = el('div', 'nm', label);
            ic.append(svg(`<svg viewBox="0 0 24 24">${ATTR_ICON[key]}</svg>`));
            nm.append(el('small', null, what));
            row.append(ic, nm, el('div', 'v', `${s.attributes[key]}`));
            if ((s.attributePoints ?? 0) > 0) { const b = el('button', 'plus', '+'); b.title = `Raise ${label}`; b.onclick = () => { s.distributePoint(key); render(); }; row.append(b); }
            a.append(row);
        }
        a.append(el('h3', null, 'Vitals'));
        for (const [label, v, max, col] of [['Health', s.health, s.maxHealth, 'linear-gradient(90deg, #8a1a1a, #e85a4a)'], ['Mana', s.mana, s.maxMana, 'linear-gradient(90deg, #1a3a8a, #5a9ae8)'], ['Vigor', s.vigor, s.maxVigor, 'linear-gradient(90deg, #2a6a1a, #8ad85a)']]) {
            const v1 = el('div', 'vital'), lab = el('div', 'lab');
            lab.append(el('span', null, label), el('span', null, `${Math.round(v)} / ${max}`));
            v1.append(lab, bar((v / Math.max(1, max)) * 100, col));
            a.append(v1);
        }

        // Mastery.
        const m = el('div');
        m.append(el('h3', null, 'Weapon mastery'));
        const used = Object.keys(s.mastery.weapons).filter(t => WEAPON_TYPES[t]);
        for (const t of [...new Set(['staff', ...used])]) {
            const ic = el('div', 'ic w'); ic.append(svg(glyphSVG(t, '#f3d88b', '#c8965a')));
            m.append(masteryRow(ic, WEAPON_TYPES[t].label, s.mastery.weapons[t] ?? 0, s.ceilingFor(t)));
        }
        const els = Object.keys(s.mastery.elements ?? {});
        if (els.length) {
            m.append(el('h3', null, 'Element mastery'));
            for (const e of els) {
                const ic = el('div', 'ic'); ic.append(svg(iconSVG({ id: SIGN[e] ?? '_', element: e })));
                m.append(masteryRow(ic, ELEMENTS[e]?.name ?? e, s.mastery.elements[e], s.ceilingFor(M.FAMILY(e))));
            }
        }

        // Fighting styles of what is in hand.
        const sp = el('div');
        sp.append(el('h3', null, 'Fighting styles in hand'));
        stylesSection(sp);
        sp.append(el('div', 'note', 'Your spells are in the Spellbook (B); skills and masteries in the book of Skills (N).'));
        cols.append(a, m, sp);
        paper.append(cols);
        frame.append(paper, close);
        root.append(frame);
    }

    // Styles of the weapons in hand (empty hands carry Eldrin's staff): progress, which one is being practised
    // (kills train it), and each skill's state — amo's styles.js.
    function stylesSection(box) {
        const s = stats, st = s.styles;
        const inHand = handTypes(s.equipment, itemRules.ITEMS);
        if (!s.equipment.weapon) { inHand.delete('fists'); inHand.add('staff'); }
        let any = false;
        for (const weapon of inHand) {
            const list = stylesFor(weapon);
            if (!list.length) continue;
            const current = practising(st, weapon);
            for (const style of list) {
                any = true;
                const row = el('div', 'style'), r1 = el('div', 'row1');
                const pct = Math.min(100, Math.floor(st.progress[style.id] ?? 0));
                r1.append(el('span', null, `${style.name} — ${WEAPON_TYPES[weapon].label}`));
                if (style.id === current) r1.append(el('span', 'tag', '✓ practising'));
                else if (!knowsStyle(st, style.id)) { const b = el('button', 'btn', 'Practise'); b.onclick = () => { st.practising[weapon] = style.id; render(); }; r1.append(b); }
                else r1.append(el('span', 'tag', 'learned'));
                row.append(r1, el('div', 'blurb', style.blurb));
                if (!knowsStyle(st, style.id)) row.append(bar(pct, 'linear-gradient(90deg, #8a3a1a, #e8a84a)'), el('div', 'sk', `${pct}% learned — kills with the weapon teach it`));
                for (const skillId of style.skills) {
                    const k = STYLE_SKILLS[skillId], state = skillState(st, skillId, s.weaponLevel(weapon), true);
                    row.append(el('div', `sk${state === 'ready' ? ' ready' : ''}`, `${state === 'ready' ? '✓' : '·'} ${k.name} — ${state === 'mastery' ? `needs mastery ${k.unlock}` : STATE_TEXT[state]}`));
                }
                box.append(row);
            }
        }
        if (!any) box.append(el('div', 'note', 'Nothing in your hands has a fighting style yet.'));
    }

    function toggle() {
        open = !open;
        root.classList.toggle('open', open);
        if (open) render();
    }
    addEventListener('keydown', e => {
        if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
        // P always; C too with classic controls (with two-hand actions C cycles the right hand's favourites).
        if (e.code === 'KeyP' || (e.code === 'KeyC' && !settings.hands)) toggle();
        else if (open && e.code === 'Escape') toggle();
    });
    return { toggle, render, get open() { return open; } };
}
