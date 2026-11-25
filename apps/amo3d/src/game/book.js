// The Book (B / touch MENU → Book): an open leather-bound book over amo's own data, with ribbon signets along
// its top edge to turn straight to a section:
//   Known   — every spell you know, by element; tap one to read it on the right-hand page and put it on the cast button
//   Fire, Water, Ice, Earth, Nature, Wind, Lightning, Shadow, Arcane — all of that element's spells, known or not
//             (the unknown ones say how they are learned)
//   Skills  — amo's skills (skill points) and masteries (Resonance Insights)
//   Styles  — amo's fighting styles: progress, manuals, lessons, each skill and whether it is ready
// Each spell has its own icon (spellIcons.js: the element's colour and motif, the spell's glyph) and an inked
// drawing of what it does; descriptions in IM Fell English italic, headings in IM Fell English.
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import { PlayerStats as PS, spells as SP, styleData, styles as styleRules, weapons as weaponRules } from '@rules';
import { CASTABLE as CAST_LIST } from './fireball.js';
import { ELEMENTS, iconSVG, drawingSVG } from './spellIcons.js';
import { MAX_FAVS } from './hands.js';

const { MASTERY_DEFS } = PS, { SPELLS, TIER_NAMES, spellTooltip } = SP, { STYLES, STYLE_SKILLS } = styleData;
const CASTABLE = new Set(CAST_LIST);
const ALL = Object.values(SPELLS).filter(s => !s.id.startsWith('kill_') && !s.id.startsWith('take_'));
const ORDER = ['fire', 'water', 'ice', 'earth', 'nature', 'wind', 'lightning', 'shadow', 'arcane'];
const SIGN = { fire: 'fireball', water: 'water_conjure', ice: 'frostbite', earth: 'earth_pillar', nature: 'vine_grasp', wind: 'cyclone', lightning: 'arc_bolt', shadow: 'void_pulse', arcane: 'arcane_circle' };
const LEARN = { scroll: 'a scroll', npc: 'a teacher', chest: 'a chest', quest: 'a quest', drop: 'an enemy\'s drop' };
const STAR = '<svg viewBox="0 0 24 24" class="sicon"><circle cx="12" cy="12" r="11" fill="#3a0e08" stroke="#e8c878"/><path d="M12 4 L14 10 L20 10 L15 14 L17 20 L12 16.5 L7 20 L9 14 L4 10 L10 10Z" fill="#ffd76a"/></svg>';

export function createBook({ stats, hud, save, hands = null, kind = 'spells' }) {
    // Two books share this code: the Spellbook (B) and the book of Skills (N) — skills, masteries, fighting styles.
    const ID = kind === 'skills' ? 'skillbook' : 'book';
    const css = document.createElement('style');
    css.textContent = `
#book { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060ad0; color: #3a2814; font-family: 'IM Fell English', Georgia, serif; }
#book.open { display: grid; }
#book .tome { position: relative; width: min(1000px, 97vw); height: min(640px, calc(100vh - 34px)); margin-top: 26px; padding: 10px; box-sizing: border-box;
  border-radius: 10px 14px 14px 10px; background: linear-gradient(135deg, #5a3218, #3a1e0e 60%, #2a140a); box-shadow: 0 10px 40px #000c, inset 0 0 0 2px #8a5a2a, inset 0 0 0 5px #2a140a, inset 0 0 0 6px #b08040; }
#book .pages { display: flex; height: 100%; border-radius: 4px; overflow: hidden; }
#book .page { flex: 1; min-width: 0; overflow: auto; touch-action: pan-y; padding: 16px 20px 18px; box-sizing: border-box;
  background: radial-gradient(ellipse at 50% 40%, #f6ead0 0%, #ecdcb6 70%, #dcc596 100%); }
#book .page.left { box-shadow: inset -26px 0 30px -18px #6a4a2066; }
#book .page.right { box-shadow: inset 26px 0 30px -18px #6a4a2066; }
#book .spine { width: 3px; background: linear-gradient(90deg, #8a6a3a, #4a2e14, #8a6a3a); }
#book .ribbons { position: absolute; left: 22px; right: 70px; top: -26px; display: flex; gap: 3px; align-items: flex-end; }
#book .rib { position: relative; display: flex; align-items: center; gap: 4px; height: 30px; padding: 0 8px 4px; border: 0; border-radius: 4px 4px 0 0; cursor: pointer;
  font: calc(13px * var(--ui, 1)) 'IM Fell English', Georgia, serif; color: #fff4dc; background: var(--rc, #6a2a2a); box-shadow: inset 0 -6px 8px -6px #0008; opacity: .82; transform: translateY(6px); transition: transform .12s, opacity .12s; }
#book .rib.on { transform: translateY(0); opacity: 1; height: 36px; box-shadow: 0 -2px 6px #0006; }
#book .rib .sicon { width: 18px; height: 18px; }
#book .close { position: absolute; right: 10px; top: -24px; width: 44px; height: 44px; border-radius: 50%; border: 0; cursor: pointer; color: #f4d8b0; font: bold 18px Georgia, serif;
  background: radial-gradient(circle at 40% 35%, #b8342a, #6a1410); box-shadow: 0 2px 6px #000a, inset 0 0 0 3px #8a1e18; }
#book h2 { margin: 0 0 4px; font-weight: normal; font-size: calc(26px * var(--ui, 1)); color: #4a1e0a; display: flex; align-items: center; gap: 10px; }
#book h2 .sicon { width: calc(34px * var(--ui, 1)); height: calc(34px * var(--ui, 1)); flex: none; }
#book h3 { margin: 14px 0 4px; font-weight: normal; font-style: italic; font-size: calc(17px * var(--ui, 1)); color: #6a3a1a; border-bottom: 1px solid #8a6a3a55; }
#book .hand { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-weight: 400; font-size: calc(17px * var(--ui, 1)); line-height: 1.15; color: #2e2010; }
#book .sub { font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(15px * var(--ui, 1)); color: #5a4228; margin-bottom: 6px; }
#book .row { display: flex; align-items: center; gap: 10px; padding: 5px 6px; border-radius: 6px; cursor: pointer; }
#book .row:hover { background: #8a6a3a1a; } #book .row.sel { background: #8a5a2a2e; box-shadow: inset 3px 0 0 #8a3a1a; }
#book .row.dim { opacity: .55; }
#book .row .sicon { width: calc(34px * var(--ui, 1)); height: calc(34px * var(--ui, 1)); flex: none; }
#book .row .nm { flex: 1; min-width: 0; font-size: calc(18px * var(--ui, 1)); }
#book .row .nm small { display: block; font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(14px * var(--ui, 1)); color: #6a5236; }
#book .pips { letter-spacing: 2px; color: #a0602a; font-size: calc(13px * var(--ui, 1)); white-space: nowrap; }
#book .star { color: #b8801a; font-size: calc(16px * var(--ui, 1)); }
#book .sdraw { width: 100%; max-height: 38vh; display: block; margin: 0 auto 4px; }
#book .stats { font-size: calc(14px * var(--ui, 1)); color: #5a3a1a; letter-spacing: .02em; margin: 6px 0; padding: 4px 0; border-top: 1px dashed #8a6a3a77; border-bottom: 1px dashed #8a6a3a77; }
#book .btn { margin-bottom: 4px; font: calc(17px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 8px 16px; margin-top: 10px; border-radius: 6px; cursor: pointer; color: #fff0d0; border: 1px solid #4a1e0a; background: linear-gradient(#8a3a1a, #5a200c); }
#book h2 .side { margin: 0 0 0 auto; flex: none; } #book h2 .btn.side { padding: 6px 18px; }
#book .more { flex: none; width: 34px; height: 30px; border-radius: 6px; border: 1px solid #8a6a3a77; background: #fff6; color: #4a2a10; font: bold 18px Georgia, serif; cursor: pointer; line-height: 1; }
#book .hb { flex: none; font: bold calc(12px * var(--ui, 1)) Georgia, serif; color: #fff4dc; background: #8a3a1a; border-radius: 4px; padding: 1px 5px; }
#book .favmenu { margin: 0 0 6px 50px; display: flex; flex-direction: column; gap: 4px; }
#book .favmenu button { text-align: left; font: calc(16px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 6px 10px; border-radius: 6px; border: 1px solid #8a6a3a88; background: #fff8; color: #3a2010; cursor: pointer; }
#book .favmenu.replace { margin-left: 0; padding: 8px; border: 1px dashed #8a3a1a; border-radius: 8px; background: #f3d88b33; }
#book .favmenu button.rep { display: flex; align-items: center; gap: 8px; } #book .favmenu button.rep .sicon { width: 26px; height: 26px; flex: none; }
#book .favmenu button.on { background: #f3d88b; border-color: #8a3a1a; }
#book .btn[disabled] { opacity: .45; cursor: default; }
#book .tag { display: inline-block; font-family: 'IM Fell English', Georgia, serif; font-style: italic; font-size: calc(16px * var(--ui, 1)); color: #3a6a2a; margin-top: 8px; white-space: nowrap; }
#book .e { padding: 6px 0 8px; border-bottom: 1px dotted #8a6a3a55; display: flex; gap: 10px; align-items: flex-start; }
#book .e .body { flex: 1; } #book .e.dimmed { opacity: .55; }
#book .t { font-size: calc(18px * var(--ui, 1)); color: #4a1e0a; } #book .t small { font-size: calc(13px * var(--ui, 1)); color: #7a5a3a; margin-left: 8px; }
#book .bar { height: 6px; border-radius: 4px; background: #0002; overflow: hidden; margin-top: 5px; } #book .bar > div { height: 100%; background: linear-gradient(90deg, #8a3a1a, #c8802a); }
#book .e .btn { margin-top: 2px; padding: 5px 12px; font-size: calc(15px * var(--ui, 1)); }
#book .page { scrollbar-width: thin; scrollbar-color: #8a6a3a transparent; }
#book .page::-webkit-scrollbar { width: 6px; } #book .page::-webkit-scrollbar-thumb { background: #8a6a3a88; border-radius: 3px; } #book .page::-webkit-scrollbar-track { background: transparent; }
#book .rib { flex: 0 1 auto; min-width: 0; overflow: hidden; }
@media (max-width: 1100px) { #book .rib span { display: none; } #book .rib.on span { display: inline; } #book .rib { padding: 0 6px 4px; } }
@media (max-height: 480px) { #book .tome { height: calc(100vh - 30px); margin-top: 28px; } #book .page { padding: 10px 14px; } #book .sdraw { max-height: 34vh; } }`;
    css.textContent = css.textContent.replaceAll('#book', `#${ID}`)
        + (kind === 'skills' ? `\n#${ID} .tome { background: linear-gradient(135deg, #1e3a28, #12281a 60%, #0a1a10); box-shadow: 0 10px 40px #000c, inset 0 0 0 2px #4a7a4a, inset 0 0 0 5px #0a1a10, inset 0 0 0 6px #b08040; }` : '');
    document.head.append(css);
    const root = document.createElement('div');
    root.id = ID;
    document.body.append(root);
    root.addEventListener('click', e => { if (e.target === root) toggle(false); });
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    const svg = html => { const s = document.createElement('span'); s.innerHTML = html; return s.firstChild; };
    let tab = kind === 'skills' ? 'skills' : 'known', sel = null;

    const known = s => (stats.spells?.[s.id] ?? 0) > 0;
    const tierOf = s => stats.spells?.[s.id] ?? 0;
    const tierName = l => TIER_NAMES?.[l - 1] ?? `tier ${l}`;
    const active = () => stats.flags?.activeSpell ?? 'fireball';
    // Two-hand actions (Options): equipping and favourites go through the hands; ⋯ opens a row's favourite menu.
    const two = () => !!hands?.enabled;
    const SIDE = { R: 'Right hand', L: 'Left hand' };
    const wlabel = t => weaponRules.WEAPON_TYPES[hands?.base?.(t) ?? t]?.label ?? t;
    const isActive = s => two() ? ['R', 'L'].some(sd => hands.current(sd) === `spell:${s.id}`) : active() === s.id;
    function equipSpell(s) {
        if (two()) {
            const sd = hands.magicHand(); if (!sd) return hud.message('Hold a staff or wand to cast spells');
            if (hands.equip(sd, `spell:${s.id}`) === 'full') { replacing = { type: hands.slotKey(sd), action: `spell:${s.id}`, equip: true }; sel = s.id; render(); return; }
        }
        else (stats.flags ??= {}).activeSpell = s.id;
        hud.banner(`${s.name} — ready to cast`); save?.(); render();
    }
    let menuFor = null, replacing = null;   // replacing: { type, action, equip } — a full list asks which favourite to give up
    function replaceBox(into) {
        if (!replacing) return;
        const { type, action, equip } = replacing, box = el('div', 'favmenu replace');
        box.append(el('div', 'sub', `The ${wlabel(type).toLowerCase()} already has ${MAX_FAVS} favourites. Replace which with ${hands.label(type, action)}?`));
        for (const old of hands.favs(type)) {
            const b = el('button', 'rep');
            b.append(svg(hands.glyph(type, old)), document.createTextNode(hands.label(type, old)));
            b.onclick = e => { e.stopPropagation(); if (hands.replaceFav(type, old, action, equip)) { hud.banner(`${hands.label(type, action)} — in place of ${hands.label(type, old)}`); save?.(); } replacing = null; menuFor = null; render(); };
            box.append(b);
        }
        const c = el('button', null, 'Cancel'); c.onclick = e => { e.stopPropagation(); replacing = null; render(); }; box.append(c);
        into.append(box);
        setTimeout(() => box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 0);   // on a phone it may start below the fold
    }
    function favBits(row, action, list, only = null) {   // only: a weapon row manages just that weapon's favourites
        const key = `${only ?? ''}|${action}`;   // hand badges, the ⋯ button, and its menu under the row when open
        if (!two()) return;
        for (const sd of ['R', 'L']) { const t = hands.slotKey(sd); if (t && hands.canHold(t, action) && hands.isFav(t, action)) { const b = el('span', 'hb', sd); b.title = `A favourite of the ${SIDE[sd].toLowerCase()} (${wlabel(t)})`; row.append(b); } }
        const more = el('button', 'more', '⋯'); more.title = 'Favourites';
        more.onclick = e => { e.stopPropagation(); menuFor = menuFor === key ? null : key; render(); };
        row.append(more);
        if (menuFor !== key) return;
        const m = el('div', 'favmenu'), seen = new Set();
        for (const sd of ['R', 'L']) {
            const t = hands.slotKey(sd);
            if (!t || !hands.canHold(t, action) || seen.has(t) || (only && t !== only)) continue;
            seen.add(t);
            const on = hands.isFav(t, action), b = el('button', on ? 'on' : '', `${on ? '★' : '☆'} ${on ? 'Favourite of' : 'Add to'} the ${wlabel(t).toLowerCase()} (${SIDE[sd].toLowerCase()})`);
            b.onclick = e => { e.stopPropagation(); if (!on && hands.favs(t).length >= MAX_FAVS) { replacing = { type: t, action, equip: false }; render(); return; } if (hands.toggleFav(t, action)) save?.(); render(); };
            m.append(b);
        }
        if (!seen.size) m.append(el('div', 'sub', action.startsWith('spell:') ? 'Hold a staff or wand to make it a favourite.' : 'Nothing in your hands can do this.'));
        list.append(m);
        if (replacing && replacing.action === action && seen.has(replacing.type) && !replacing.equip) replaceBox(list);
    }

    // ---- spells ----
    function spellRow(s, list) {
        const k = known(s), row = el('div', `row${sel === s.id ? ' sel' : ''}${k ? '' : ' dim'}`);
        row.append(svg(iconSVG(s)));   // unknown ones keep their element's look, dimmed with the row
        const nm = el('div', 'nm', s.name);
        nm.append(el('small', null, k ? `${tierName(tierOf(s))}${s.passive ? ' · always on' : ''}` : 'not yet learned'));
        row.append(nm);
        if (k && isActive(s)) row.append(el('span', 'star', '★'));
        if (k) row.append(el('span', 'pips', '●'.repeat(tierOf(s)) + '○'.repeat(Math.max(0, 3 - tierOf(s)))));
        row.onclick = () => {   // tap to read it; tap it again to equip it
            if (sel === s.id && k && CASTABLE.has(s.id) && !s.passive && !isActive(s)) { equipSpell(s); return; }
            sel = s.id; render();
        };
        list.append(row);
        if (k && CASTABLE.has(s.id) && !s.passive) favBits(row, `spell:${s.id}`, list);
    }
    function spellPage(p, s) {
        if (!s) { p.append(el('div', 'hand', 'Choose a spell on the left to read about it.')); return; }
        const k = known(s), lvl = Math.max(1, tierOf(s)), E = ELEMENTS[s.element] ?? ELEMENTS.arcane, en = E.name.toLowerCase();
        p.append(svg(drawingSVG(s, { locked: !k })));
        const h = el('h2'); h.append(svg(iconSVG(s)), document.createTextNode(s.name)); p.append(h);
        const how = s.targetingType === 'targeted_directional' ? ' · a bolt' : s.targetingType === 'targeted_aoe' ? ' · lands where you aim' : s.targetingType === 'self' ? ' · on yourself' : '';
        p.append(el('div', 'sub', `${E.name} · ${k ? tierName(lvl) : 'not yet learned'}${how}`));
        // Equip sits on the name's line, at the right.
        const side = t => { const x = el('span', 'tag side', t); h.append(x); };
        if (k && s.passive) side('Always on');
        else if (k && !CASTABLE.has(s.id)) side('Not castable yet');
        else if (k && isActive(s)) side('★ Equipped');
        else if (k) { const b = el('button', 'btn side', 'Equip'); b.onclick = () => equipSpell(s); h.append(b); }
        if (replacing?.equip && replacing.action === `spell:${s.id}`) replaceBox(p);
        const mana = s.manaCost?.[lvl - 1];
        p.append(el('div', 'stats', `${mana != null ? `Mana ${mana} · ` : ''}${spellTooltip(s, lvl, stats.attributes.intelligence)}`));
        if (s.lore) p.append(el('div', 'hand', s.lore));
        if (k && lvl < 3 && s.discoverCondition) p.append(el('div', 'sub', `It grows stronger as you cast ${en} spells.`));
        if (!k) {
            const ways = (s.learnFrom ?? []).map(w => LEARN[w] ?? w);
            const grow = s.discoverCondition ? `it comes on its own as your feel for ${en} deepens — cast ${en} spells` : '';
            p.append(el('div', 'hand', `To learn it: ${[ways.length ? `from ${ways.join(', ')}` : '', grow].filter(Boolean).join(', or ') || 'unknown'}.`));
            return;
        }
    }
    // What the things in your hands can do besides spells: their basic blow and their style's skills.
    function handActions(L) {
        const seen = new Set();
        for (const sd of ['R', 'L']) {
            const t = hands.slotKey(sd);
            if (!t || seen.has(t)) continue;
            seen.add(t);
            L.append(el('h3', null, `${SIDE[sd]} — ${wlabel(t)}`));
            const acts = ['hit', ...Object.values(STYLE_SKILLS).filter(k => STYLES[k.style]?.weapon === hands.base(t)).map(k => `skill:${k.id}`)];
            for (const a of acts) {
                const row = el('div', 'row');
                row.append(svg(hands.glyph(t, a)));
                const nm = el('div', 'nm', hands.label(t, a));
                nm.append(el('small', null, a === 'hit' ? 'the weapon\'s own blow' : STYLE_SKILLS[a.slice(6)]?.desc ?? ''));
                row.append(nm);
                if (['R', 'L'].some(x => hands.slotKey(x) === t && hands.current(x) === a)) row.append(el('span', 'star', '★'));
                row.onclick = () => { menuFor = menuFor === `${t}|${a}` ? null : `${t}|${a}`; render(); };
                L.append(row);
                favBits(row, a, L, t);
            }
        }
    }
    function knownPages(L, R) {
        const list = ALL.filter(known);
        L.append(el('h2', null, two() ? 'In My Hands' : 'The Spells I Know'));
        L.append(el('div', 'sub', two() ? 'Tap a spell to read it, tap it again to equip it (★). ⋯ makes it a favourite of what you hold (four at most). The arch over an action button: tap — next, double-tap — back, hold — all of them.' : 'Tap a spell to read it, tap it again to put it on your cast button (★).'));
        if (two()) { handActions(L); L.append(el('h2', null, 'The Spells I Know')); }
        if (!list.length) L.append(el('div', 'hand', 'None yet — the priest in Thaloria teaches spells, and scrolls drop from elites.'));
        for (const e of ORDER) {
            const of = list.filter(s => (s.element ?? 'arcane') === e);
            if (!of.length) continue;
            L.append(el('h3', null, ELEMENTS[e].name));
            for (const s of of) spellRow(s, L);
        }
        if (!sel || !SPELLS[sel] || !known(SPELLS[sel])) sel = list.find(s => isActive(s))?.id ?? list[0]?.id ?? null;
        spellPage(R, SPELLS[sel]);
    }
    function elementPages(e, L, R) {
        const E = ELEMENTS[e], th = s => s.discoverCondition?.threshold ?? 99;
        const list = ALL.filter(s => (s.element ?? 'arcane') === e).sort((a, b) => (known(b) - known(a)) || th(a) - th(b));
        const h = el('h2'); h.append(svg(iconSVG({ id: SIGN[e], element: e })), document.createTextNode(`${E.name} Magic`)); L.append(h);
        L.append(el('div', 'sub', `${list.filter(known).length} of ${list.length} learned.`));
        for (const s of list) spellRow(s, L);
        if (!sel || SPELLS[sel]?.element !== e) sel = list.find(known)?.id ?? list[0]?.id;
        spellPage(R, SPELLS[sel]);
    }

    // ---- skills and masteries ----
    function skillPages(L, R) {
        L.append(el('h2', null, 'Skills'));
        L.append(el('div', 'sub', `${stats.skillPoints ?? 0} skill point${stats.skillPoints === 1 ? '' : 's'} to spend — one each level.`));
        const reqText = r => !r ? '' : [r.level && `level ${r.level}`, r.strength && `STR ${r.strength}`, r.intelligence && `INT ${r.intelligence}`, r.agility && `AGI ${r.agility}`, r.stamina && `STA ${r.stamina}`,
            ...Object.entries(r.resonance ?? {}).map(([e, v]) => `${e} resonance ${v}`)].filter(Boolean).join(' · ');
        const KEYS = { blink_step: 'H · the BLINK button · gamepad B (or Back)' }, rows = [];
        for (const k of Object.values(stats.skills ?? {})) {
            if (k.id === 'basic_strike' && k.level >= k.maxLevel) continue;
            const row = el('div', 'e'), body = el('div', 'body');
            const t = el('div', 't', k.name); t.append(el('small', null, `level ${k.level} / ${k.maxLevel}`));
            body.append(t, el('div', 'hand', k.description.replace(' [H]', '').replace(' [V]', '')));
            if (KEYS[k.id] && k.level > 0) body.append(el('div', 'sub', `Use: ${KEYS[k.id]}`));
            if (k.id === 'aetheric_sight') body.append(el('div', 'sub', 'Use: L · MENU → Aether Sight — slows what is near, shows how far each creature sees, and what hides (18 mana, 14 s).'));
            const can = stats.canUnlock?.(k.id);
            if (!can && k.level < k.maxLevel && k.requirements) body.append(el('div', 'sub', `Needs: ${reqText(k.requirements)}`));
            row.append(body);
            if (k.level >= k.maxLevel) row.append(el('span', 'tag', 'Mastered'));
            else { const b = el('button', 'btn', k.level ? 'Improve' : 'Learn'); b.disabled = !can || (stats.skillPoints ?? 0) <= 0; b.onclick = () => { if (stats.upgradeSkill(k.id)) { hud.banner(`${k.name} — level ${stats.skills[k.id].level}`); save?.(); render(); } }; row.append(b); }
            rows.push(row);
        }
        spread(rows, L, R);
    }
    // A long list runs on from the left page to the right one.
    const spread = (rows, L, R) => { const half = Math.ceil((rows.length + 1) / 2); rows.forEach((r, i) => (i < half - 1 ? L : R).append(r)); };
    function masteryPages(L, R) {
        const rows = [];
        L.append(el('h2', null, 'Masteries'));
        L.append(el('div', 'sub', `${stats.resonanceInsights ?? 0} Resonance Insight${stats.resonanceInsights === 1 ? '' : 's'} — earned by deepening an element's resonance.`));
        for (const d of Object.values(MASTERY_DEFS)) {
            const owned = !!stats.masteries?.[d.id], row = el('div', 'e'), body = el('div', 'body');
            const t = el('div', 't', d.name); t.append(el('small', null, `${d.cost} insight${d.cost > 1 ? 's' : ''}`));
            body.append(t, el('div', 'hand', d.description));
            if (d.lore) body.append(el('div', 'sub', d.lore));
            row.append(body);
            if (owned) row.append(el('span', 'tag', 'Learned'));
            else { const b = el('button', 'btn', 'Learn'); b.disabled = (stats.resonanceInsights ?? 0) < d.cost; b.onclick = () => { if (stats.unlockMastery(d.id)) { hud.banner(d.name); save?.(); render(); } }; row.append(b); }
            rows.push(row);
        }
        spread(rows, L, R);
    }

    // ---- fighting styles ----
    function stylePages(L, R) {
        const st = stats.styles ?? { progress: {}, manuals: {}, lessons: {} };
        L.append(el('h2', null, 'Fighting Styles'));
        L.append(el('div', 'sub', 'Learned by practice (kills with the weapon), manuals and lessons. Skills open with the weapon\'s mastery (2 / 5 / 8) and go on Z, X, V.'));
        const all = Object.values(STYLES), half = Math.ceil(all.length / 2);
        all.forEach((s, i) => {
            const P = i < half ? L : R;
            const prog = Math.round(st.progress?.[s.id] ?? 0), done = prog >= 100;
            const weapon = weaponRules.WEAPON_TYPES[s.weapon]?.label ?? s.weapon, wl = stats.weaponLevel?.(s.weapon) ?? 0;
            const row = el('div', `e${prog === 0 ? ' dimmed' : ''}`), body = el('div', 'body');
            const t = el('div', 't', s.name); t.append(el('small', null, `${weapon} · mastery ${wl}`));
            body.append(t, el('div', 'hand', s.blurb));
            const bar = el('div', 'bar'), fill = el('div'); fill.style.width = `${prog}%`; bar.append(fill); body.append(bar);
            body.append(el('div', 'sub', `${done ? 'Learned' : `${prog}% learned`}${st.manuals?.[s.id] ? ' · manual read' : ''}${st.lessons?.[s.id] ? ` · ${st.lessons[s.id]} lesson${st.lessons[s.id] > 1 ? 's' : ''}` : ''}`));
            for (const id of s.skills) {
                const k = STYLE_SKILLS[id], state = styleRules.skillState(st, id, wl, true);
                const word = state === 'ready' ? 'ready' : state === 'mastery' ? `needs mastery ${k.unlock}` : 'style not learned';
                body.append(el('div', 'sub', `• ${k.name} — ${k.desc ?? k.description ?? ''} (${word})`));
            }
            row.append(body);
            P.append(row);
        });
    }

    // ---- the book ----
    function signets() {
        const rb = el('div', 'ribbons');
        const add = (id, label, color, icon) => {
            const b = el('button', `rib${tab === id ? ' on' : ''}`); b.style.setProperty('--rc', color); b.title = label;
            if (icon) b.append(svg(icon));
            b.append(el('span', null, label));
            b.onclick = () => { tab = id; replacing = null; menuFor = null; render(); };
            rb.append(b);
        };
        if (kind === 'spells') {
            add('known', 'Known', '#7a2a1a', STAR);
            for (const e of ORDER) add(e, ELEMENTS[e].name, ELEMENTS[e].d, iconSVG({ id: SIGN[e], element: e }));
            return rb;
        }
        add('skills', 'Skills', '#2a4a3a', '<svg viewBox="0 0 24 24" class="sicon"><circle cx="12" cy="12" r="11" fill="#16301e" stroke="#e8c878"/><path d="M12 4 V20 M6 10 L12 4 L18 10 M7 15 H17" fill="none" stroke="#fff4dc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        add('masteries', 'Masteries', '#5a3a6a', '<svg viewBox="0 0 24 24" class="sicon"><circle cx="12" cy="12" r="11" fill="#2a1a36" stroke="#e8c878"/><path d="M12 3 L14.2 9.5 L21 9.6 L15.6 13.6 L17.6 20.4 L12 16.3 L6.4 20.4 L8.4 13.6 L3 9.6 L9.8 9.5Z" fill="none" stroke="#fff4dc" stroke-width="1.5" stroke-linejoin="round"/></svg>');
        add('styles', 'Styles', '#3a3a5a', '<svg viewBox="0 0 24 24" class="sicon"><circle cx="12" cy="12" r="11" fill="#1e1e36" stroke="#e8c878"/><path d="M5 19 L17 7 M17 7 L19 5 M14 6 L18 10 M19 19 L7 7 M7 7 L5 5 M10 6 L6 10" fill="none" stroke="#fff4dc" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>');
        return rb;
    }
    function render() {
        root.textContent = '';
        const tome = el('div', 'tome'), pages = el('div', 'pages'), L = el('div', 'page left'), R = el('div', 'page right');
        const close = el('button', 'close', '✕'); close.title = 'Close'; close.onclick = () => toggle(false);
        if (tab === 'known') knownPages(L, R);
        else if (ELEMENTS[tab]) elementPages(tab, L, R);
        else if (tab === 'skills') skillPages(L, R);
        else if (tab === 'masteries') masteryPages(L, R);
        else stylePages(L, R);
        pages.append(L, el('div', 'spine'), R);
        tome.append(signets(), pages, close);
        root.append(tome);
    }
    function toggle(on = !root.classList.contains('open'), which = null) {
        if (which) tab = which === 'spells' ? 'known' : which;
        if (on) { replacing = null; menuFor = null; }
        root.classList.toggle('open', on);
        if (on) render();
    }
    addEventListener('keydown', e => {
        if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
        if (e.code === (kind === 'skills' ? 'KeyN' : 'KeyB') && !document.body.classList.contains('title-on')) toggle();
        else if (e.code === 'Escape' && root.classList.contains('open')) toggle(false);
    });
    return { toggle, get open() { return root.classList.contains('open'); } };
}
