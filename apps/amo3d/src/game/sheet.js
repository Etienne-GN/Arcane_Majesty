// Character sheet (C / gamepad Menu / touch HERO): attributes with point spending
// (PlayerStats.distributePoint), weapon and element mastery against the talent ceilings
// (mastery.js), and the spells Eldrin knows (spells.js: tier, mana cost, cooldown, damage).
// Pauses the game while open, like the satchel.
import { mastery as M, spells as spellRules, weapons as weaponRules, styles as styleRules, styleData, items as itemRules } from '@rules';

const { pointsFor, levelOf, MAX_LEVEL } = M;
const { SPELLS, TIER_NAMES, spellDamageAt } = spellRules;
const { WEAPON_TYPES } = weaponRules;
const { stylesFor, STYLE_SKILLS } = styleData;
const { skillState, handTypes, practising, knowsStyle } = styleRules;
const STATE_TEXT = { ready: 'ready', mastery: 'needs mastery', weapon: 'weapon not in hand', style: 'style not learned' };
const ATTRS = [['strength', 'Strength', 'melee damage'], ['intelligence', 'Intelligence', '+8 mana, spell damage'],
    ['stamina', 'Stamina', '+8 health'], ['agility', 'Agility', 'speed, Vigor, critical hits']];

const CSS = `
#sheet { position: fixed; inset: 0; z-index: 8; display: none; place-items: center; background: #05060acc;
    font-family: Georgia, 'Times New Roman', serif; color: #eee6d2; }
#sheet.open { display: grid; }
#sheet .panel { width: min(900px, 94vw); max-height: 90vh; overflow: auto; padding: 18px 22px; border: 1px solid #f3d88b66;
    border-radius: 14px; background: linear-gradient(160deg, #1b1720ee, #0e0c12f2); box-shadow: 0 10px 40px #000a; }
#sheet h2 { margin: 0 0 4px; font-weight: normal; letter-spacing: .14em; font-size: 20px; color: #f3d88b; }
#sheet .meta { font-size: 13px; opacity: .75; margin-bottom: 14px; }
#sheet .cols { display: grid; grid-template-columns: 1fr 1fr 1.2fr; gap: 18px; }
#sheet h3 { margin: 0 0 8px; font-weight: normal; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#sheet .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 8px; margin-bottom: 5px;
    border-radius: 8px; background: #ffffff0a; border: 1px solid #ffffff14; font-size: 13px; }
#sheet .sub { font-size: 11px; opacity: .55; }
#sheet .bar { height: 4px; border-radius: 2px; background: #0008; margin-top: 4px; overflow: hidden; }
#sheet .bar > div { height: 100%; background: linear-gradient(90deg, #8a6a2a, #f3d88b); }
#sheet button { font: 13px Georgia, serif; color: #1b1406; background: #f3d88b; border: 0; border-radius: 7px; padding: 3px 10px; cursor: pointer; }
#sheet button.ghost { background: transparent; color: #eee6d2; border: 1px solid #eee6d255; padding: 7px 14px; }
#sheet .close { float: right; }
@media (max-width: 760px) { #sheet .cols { grid-template-columns: 1fr; } }`;

export function createSheet({ stats, name = 'Eldrin' }) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'sheet';
    document.body.append(root);
    let open = false;
    const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

    function masteryRow(label, points, ceiling) {
        const lvl = Math.min(levelOf(points), ceiling);
        const row = el('div', 'row');
        const left = el('div');
        left.append(el('div', null, label));
        const cur = pointsFor(lvl), next = pointsFor(Math.min(lvl + 1, MAX_LEVEL));
        const atCap = lvl >= ceiling;
        left.append(el('div', 'sub', atCap ? `talent ceiling reached (${ceiling})` : `${Math.floor(points)} / ${next} points · ceiling ${ceiling}`));
        const bar = el('div', 'bar'); const fill = el('div');
        fill.style.width = `${atCap ? 100 : Math.max(0, Math.min(100, ((points - cur) / Math.max(1, next - cur)) * 100))}%`;
        bar.append(fill); left.append(bar);
        row.append(left, el('div', null, `Lv ${lvl}`));
        return row;
    }

    function render() {
        root.textContent = '';
        const s = stats;
        const panel = el('div', 'panel');
        const close = el('button', 'ghost close', 'Close ✕');
        close.onclick = toggle;
        panel.append(close, el('h2', null, name));
        panel.append(el('div', 'meta', `Level ${s.level} · ${s.xp} / ${s.xpToNextLevel} XP · ${s.attributePoints ?? 0} attribute point(s) · ${s.skillPoints ?? 0} skill point(s)`));
        const cols = el('div', 'cols');

        const a = el('div');
        a.append(el('h3', null, 'Attributes'));
        for (const [key, label, what] of ATTRS) {
            const row = el('div', 'row');
            const left = el('div');
            left.append(el('div', null, `${label}  ${s.attributes[key]}`), el('div', 'sub', what));
            row.append(left);
            if ((s.attributePoints ?? 0) > 0) {
                const b = el('button', null, '+');
                b.onclick = () => { s.distributePoint(key); render(); };
                row.append(b);
            }
            a.append(row);
        }
        for (const [label, v] of [['Health', `${Math.ceil(s.health)} / ${s.maxHealth}`], ['Mana', `${Math.round(s.mana)} / ${s.maxMana}`], ['Vigor', `${Math.round(s.vigor)} / ${s.maxVigor}`]]) {
            const row = el('div', 'row'); row.append(el('div', null, label), el('div', null, v)); a.append(row);
        }

        const m = el('div');
        m.append(el('h3', null, 'Weapon mastery'));
        const used = Object.keys(s.mastery.weapons).filter(t => WEAPON_TYPES[t]);
        const equipped = ['staff'];
        for (const t of [...new Set([...equipped, ...used])]) m.append(masteryRow(WEAPON_TYPES[t].label, s.mastery.weapons[t] ?? 0, s.ceilingFor(t)));
        const els = Object.keys(s.mastery.elements ?? {});
        if (els.length) {
            m.append(el('h3', null, 'Element mastery'));
            for (const e of els) m.append(masteryRow(e[0].toUpperCase() + e.slice(1), s.mastery.elements[e], s.ceilingFor(M.FAMILY(e))));
        }

        const sp = el('div');
        sp.append(el('h3', null, 'Spells'));
        const known = Object.entries(s.spells).filter(([, lvl]) => lvl > 0);
        if (!known.length) sp.append(el('div', 'sub', 'No spells yet.'));
        for (const [id, lvl] of known) {
            const def = SPELLS[id];
            if (!def) continue;
            const row = el('div', 'row');
            const left = el('div');
            left.append(el('div', null, `${def.name} · ${TIER_NAMES[lvl - 1] ?? ''}`));
            const parts = [`${s.getSpellManaCost(id)} mana`, `${((def.cooldown?.[lvl - 1] ?? 0) / 1000).toFixed(1)} s`];
            if (def.baseDmg) parts.push(`${spellDamageAt(def, lvl, s.attributes.intelligence)} damage`);
            if (def.element) parts.push(def.element);
            left.append(el('div', 'sub', parts.join(' · ')));
            row.append(left);
            sp.append(row);
        }

        cols.append(a, m, sp);
        panel.append(cols, stylesSection());
        root.append(panel);
    }

    // Styles of the weapons in hand (empty hands carry Eldrin's staff): progress, which one is being
    // practised (kills train it), and each skill's state — amo's styles.js.
    function stylesSection() {
        const s = stats, st = s.styles;
        const box = el('div');
        box.append(el('h3', null, 'Fighting styles'));
        box.firstChild.style.marginTop = '16px';
        const inHand = handTypes(s.equipment, itemRules.ITEMS);
        if (!s.equipment.weapon) { inHand.delete('fists'); inHand.add('staff'); }
        for (const weapon of inHand) {
            const list = stylesFor(weapon);
            if (!list.length) continue;
            const current = practising(st, weapon);
            for (const style of list) {
                const row = el('div', 'row');
                row.style.alignItems = 'flex-start';
                const left = el('div');
                const pct = Math.min(100, Math.floor(st.progress[style.id] ?? 0));
                left.append(el('div', null, `${style.name} · ${WEAPON_TYPES[weapon].label}${knowsStyle(st, style.id) ? ' · learned' : ` · ${pct}%`}`), el('div', 'sub', style.blurb));
                for (const skillId of style.skills) {
                    const k = STYLE_SKILLS[skillId];
                    const state = skillState(st, skillId, s.weaponLevel(weapon), true);
                    left.append(el('div', 'sub', `· ${k.name} (mastery ${k.unlock}) — ${state === 'mastery' ? `needs mastery ${k.unlock}` : STATE_TEXT[state]}`));
                }
                row.append(left);
                if (style.id === current) row.append(el('div', 'sub', 'practising'));
                else if (!knowsStyle(st, style.id)) {
                    const b = el('button', null, 'Practise');
                    b.onclick = () => { st.practising[weapon] = style.id; render(); };
                    row.append(b);
                }
                box.append(row);
            }
        }
        return box;
    }

    function toggle() {
        open = !open;
        root.classList.toggle('open', open);
        if (open) render();
    }
    addEventListener('keydown', e => {
        if (e.code === 'KeyC') toggle();
        else if (open && e.code === 'Escape') toggle();
    });
    return { toggle, render, get open() { return open; } };
}
