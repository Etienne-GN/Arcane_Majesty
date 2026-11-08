// Combat C4: spells by scroll and by teacher (spec §4 "Spells follow the same rule").
// Run: node tools/test_spell_learning.mjs
import assert from 'node:assert';
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepStrictEqual(a, b, m); n++; };

// PlayerStats saves to localStorage; give node a minimal one.
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };

const L = await import('../src/systems/spellLearning.js');
const { SPELLS } = await import('../src/data/spells.js');
const { ITEMS, CATALOGS } = await import('../src/data/items.js');

// ---- scrolls
ok(L.SCROLL_SPELLS.length > 20, 'many spells have a scroll');
ok(L.SCROLL_SPELLS.every(id => SPELLS[id].learnFrom.includes('scroll') && SPELLS[id].discoverCondition?.threshold != null), 'only scroll spells with a threshold');
eq(L.spellScrollId('fireball'), 'spell_scroll_fireball', 'scroll id');
eq(ITEMS.spell_scroll_fireball?.spellOf, 'fireball', 'the scroll item exists');
eq(L.scrollPrice(SPELLS.fireball), 55, 'price: 40 + 5 × threshold');
ok(L.guildScrolls().every(id => SPELLS[id].discoverCondition.threshold <= 10), 'the Guild sells the easy ones');
ok(L.guildScrolls().includes('fireball') && !L.guildScrolls().includes('stone_cannon'), 'fireball yes, stone cannon no');
ok(L.guildScrolls().every(id => CATALOGS.guild.some(e => e.id === L.spellScrollId(id))), 'all on the Guild shelf');

const none = Object.fromEntries(Object.keys(SPELLS).map(id => [id, 0]));
eq(L.rollSpellScroll(() => 0.5, none, []), null, 'no luck: nothing');
ok(L.rollSpellScroll(() => 0, none, [])?.startsWith('spell_scroll_'), 'luck: a scroll');
const allKnown = Object.fromEntries(Object.keys(SPELLS).map(id => [id, 1]));
eq(L.rollSpellScroll(() => 0, allKnown, []), null, 'all known: nothing');
eq(L.rollSpellScroll(() => 0, none, L.SCROLL_SPELLS.map(L.spellScrollId)), null, 'all carried: nothing');

// ---- the teacher
const arc = L.teachableSpells('arcane');
ok(arc.length >= 5 && arc.every(id => SPELLS[id].element === 'arcane' && SPELLS[id].learnFrom.includes('npc')), 'arcane spells a teacher can give');
const th = id => SPELLS[id].discoverCondition?.threshold ?? 0;
ok(arc.every((id, i) => i === 0 || th(arc[i - 1]) <= th(id)), 'easiest first');
eq(L.spellToTeach(none, 'arcane'), arc[0], 'first lesson: the easiest');
eq(L.spellToTeach({ ...none, [arc[0]]: 2 }, 'arcane'), arc[1], 'then the next');
const knowArc = { ...none, ...Object.fromEntries(arc.map(id => [id, 1])) };
eq(L.spellLessonCheck({}, {}, 'arcane', 3, 999, knowArc).reason, 'none', 'nothing left to teach');
eq(L.spellLessonCheck({}, { arcane: 3 }, 'arcane', 3, 999, none).reason, 'today', 'one a day');
eq(L.spellLessonCheck({ arcane: 1 }, {}, 'arcane', 3, 50, none), { ok: false, reason: 'gold', price: 200, spell: arc[0] }, 'second lesson: 200');
eq(L.spellLessonCheck({}, {}, 'arcane', 3, 500, none), { ok: true, price: 100, spell: arc[0] }, 'a lesson is possible');

// ---- PlayerStats.learnSpell
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const s = new PlayerStats();
const hard = L.SCROLL_SPELLS.find(id => SPELLS[id].discoverCondition.threshold >= 30);
let told = null;
s.onSpellEvent((id, lv, discovered) => { told = [id, lv, discovered]; });
eq(s.learnSpell(hard), true, 'a scroll teaches a spell above your element level');
eq(s.getSpellLevel(hard), 1, '… at Novice only');
eq(told, [hard, 1, true], '… and says so');
eq(s.learnSpell(hard), false, 'already known: false (the scroll is kept)');
eq(ITEMS[L.spellScrollId(hard)].onUse(s), false, 'using the scroll again does nothing');
eq(s.learnSpell('no_such_spell'), false, 'no such spell');
s.spells.fireball = 3;
eq(s.learnSpell('fireball'), false, 'never lowers a tier');
eq(s.spells.fireball, 3, '… Adept stays Adept');
eq(s.spellLessons, {}, 'lessons start empty');
eq(s.spellLessonDay, {}, 'lesson days start empty');

// ---- the shop hides what you can no longer use (C4 review)
{
    const { alreadyLearned } = await import('../src/data/items.js');
    const t = new PlayerStats();
    t.spells.fireball = 0;
    eq(alreadyLearned('spell_scroll_fireball', t), false, 'an unknown spell: its scroll is for sale');
    t.spells.fireball = 1;
    eq(alreadyLearned('spell_scroll_fireball', t), true, 'a known spell: its scroll is hidden');
    eq(alreadyLearned('manual_reaver', t), false, 'an unread manual is for sale');
    t.styles.manuals.reaver = true;
    eq(alreadyLearned('manual_reaver', t), true, 'a read manual is hidden');
    t.styles.progress.shadow = 100;
    eq(alreadyLearned('manual_shadow', t), true, 'a known style\'s manual is hidden');
    eq(alreadyLearned('health_potion', t), false, 'anything else is unaffected');
}

console.log(`test_spell_learning: ${n} checks passed`);
