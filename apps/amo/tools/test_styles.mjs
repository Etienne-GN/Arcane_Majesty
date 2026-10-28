// Combat C3: styles, learning bars, manuals, lessons, skill shapes.
import assert from 'node:assert';
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

const D = await import('../src/data/styles.js');
const S = await import('../src/systems/styles.js');
const { SPELLS } = await import('../src/data/spells.js');
const { WEAPON_TYPES } = await import('../src/systems/weapons.js');
const { ITEMS } = await import('../src/data/items.js');

// ---- data
eq(D.STYLE_IDS, ['guard', 'reaver', 'shadow', 'lancer', 'spinning_staff', 'crusher', 'berserker', 'bulwark', 'brawler'], 'nine close-combat styles');
eq(Object.keys(D.STYLE_SKILLS).length, 27, 'three skills each');
for (const st of Object.values(D.STYLES)) {
    ok(WEAPON_TYPES[st.weapon], `${st.id} names a real weapon`);
    eq(st.skills.map(id => D.STYLE_SKILLS[id].unlock), [2, 5, 8], `${st.id}: skills at mastery 2, 5, 8`);
    ok(st.skills.every(id => D.STYLE_SKILLS[id].style === st.id && D.STYLE_SKILLS[id].weapon === st.weapon), `${st.id}: its skills point back`);
}
ok(Object.keys(D.STYLE_SKILLS).every(id => !SPELLS[id]), 'no skill id is a spell id (they share Q/R/F/T)');
ok(Object.values(D.STYLE_SKILLS).every(k => k.cd > 0 && k.desc && k.name), 'every skill has a name, a line and a cooldown');
eq(D.stylesFor('sword').map(s => s.id), ['guard'], 'the sword\'s styles');

// ---- learning bar
const st = S.emptyStyles();
eq(S.knowsStyle(st, 'guard'), false, 'nothing known at first');
eq(S.practising(st, 'sword'), 'guard', 'practise the first style by default');
S.practiceGain(st, 'guard', 6);
eq(st.progress.guard, 1, 'a kill on an equal enemy: 1%');
S.practiceGain(st, 'guard', 1.2);
eq(Math.round(st.progress.guard * 10) / 10, 1.2, 'a weak enemy teaches a fifth');
eq(S.readManual(st, 'guard'), true, 'reading a manual');
eq(Math.round(st.progress.guard * 10) / 10, 41.2, '… adds 40%');
eq(S.readManual(st, 'guard'), false, 'a manual is read once');
S.practiceGain(st, 'guard', 6);
eq(Math.round(st.progress.guard * 10) / 10, 43.2, 'after the manual, practice counts double');
S.addProgress(st, 'guard', 999);
eq(st.progress.guard, 100, 'the bar stops at 100');
ok(S.knowsStyle(st, 'guard'), 'at 100% the style is known');
eq(S.readManual(st, 'guard'), false, 'no manual for a known style');

// ---- lessons
const L = S.emptyStyles();
eq([S.lessonPrice(0), S.lessonPrice(1), S.lessonPrice(2)], [100, 200, 300], 'lessons cost more as they go');
eq(S.lessonCheck(L, 'crusher', 3, 50), { ok: false, reason: 'gold', price: 100 }, 'not enough gold');
eq(S.lessonCheck(L, 'crusher', 3, 500), { ok: true, price: 100 }, 'a lesson is possible');
eq(S.takeLesson(L, 'crusher', 3), 100, 'take it: pay 100');
eq(L.progress.crusher, 35, '… +35%');
eq(S.lessonCheck(L, 'crusher', 3, 500).reason, 'today', 'one lesson a day');
eq(S.lessonCheck(L, 'crusher', 4, 500), { ok: true, price: 200 }, 'the next day: 200');
S.addProgress(L, 'crusher', 100);
eq(S.lessonCheck(L, 'crusher', 9, 9999).reason, 'known', 'nothing left to teach');

// ---- skills
eq(S.skillState(st, 'parry', 1, true), 'mastery', 'known style, mastery too low');
eq(S.skillState(st, 'parry', 2, true), 'ready', 'mastery 2: Parry is ready');
eq(S.skillState(st, 'parry', 2, false), 'weapon', 'the sword is not in hand');
eq(S.skillState(st, 'riposte', 4, true), 'mastery', 'Riposte waits for 5');
eq(S.skillState(S.emptyStyles(), 'parry', 9, true), 'style', 'style not learned yet');
const eqp = (weapon, offHand = null) => ({ weapon, offHand });
eq([...S.handTypes(eqp('longsword', 'wooden_shield'), ITEMS)].sort(), ['shield', 'sword'], 'what is in hand');
ok(S.handTypes(eqp(null), ITEMS).has('fists'), 'empty hands are fists');

// ---- shapes (facing right from 0,0)
const foes = [{ id: 'a', x: 30, y: 0 }, { id: 'b', x: -30, y: 0 }, { id: 'c', x: 90, y: 4 }, { id: 'd', x: 50, y: 40 }];
const ids = l => l.map(e => e.id).sort();
eq(ids(S.targetsIn({ kind: 'front', reach: 30, radius: 26 }, { x: 0, y: 0 }, 'right', foes)), ['a'], 'front: only what is ahead');
eq(ids(S.targetsIn({ kind: 'around', radius: 56 }, { x: 0, y: 0 }, 'right', foes)), ['a', 'b'], 'around: everyone close');
eq(ids(S.targetsIn({ kind: 'line', length: 96, width: 20 }, { x: 0, y: 0 }, 'right', foes)), ['a', 'c'], 'line: the row ahead');
eq(S.targetsIn({ kind: 'front', reach: 30, radius: 26, max: 1 }, { x: 0, y: 0 }, 'right', [...foes, { id: 'e', x: 32, y: 2 }]).length, 1, 'max targets');

// ---- damage modifiers
eq(S.skillMult(D.STYLE_SKILLS.backstab, { behind: true }), 4.5, 'Backstab from behind: 1.5 x 3');
eq(S.skillMult(D.STYLE_SKILLS.backstab, { behind: false }), 1.5, '… from the front: 1.5');
eq(S.skillMult(D.STYLE_SKILLS.riposte, { parried: true }), 3, 'Riposte after a parry: 2 x 1.5');
eq(S.skillMult(D.STYLE_SKILLS.haymaker, { vanished: true }), 4.4, 'any hit out of Vanish: x2');

// ---- manuals as items (Task 2)
{
    const { CATALOGS, rollEliteManual, manualId } = await import('../src/data/items.js');
    eq(CATALOGS.guild.map(e => e.id).sort(), ['brawler', 'berserker', 'bulwark', 'lancer', 'reaver', 'shadow', 'spinning_staff'].map(manualId).sort(), 'the Guild sells the seven untaught manuals');
    ok(D.STYLE_IDS.every(id => ITEMS[manualId(id)]?.manualOf === id), 'one manual item per style');
    const st2 = S.emptyStyles(); st2.progress.guard = 100; st2.manuals.reaver = true;
    eq(rollEliteManual(() => 0.5, st2), null, 'most elites drop no manual');
    const seen = new Set(); for (let i = 0; i < 9; i++) { let k = 0; const r = [0, i / 9 + 0.01]; seen.add(rollEliteManual(() => r[k++], st2, [manualId('shadow')])); }
    ok(!seen.has(manualId('guard')) && !seen.has(manualId('reaver')) && !seen.has(manualId('shadow')), 'never a known, read or carried style');
}

console.log(`test_styles: ${n} checks passed`);
