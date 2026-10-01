// Phase 2 combat depth: affinities, reactions, target frame, elites,
// bestiary, spell tooltips. Run: node tools/test_combat_depth.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { ENEMY_TYPES } = await import('../src/data/worldMap.js');
const { statusManager } = await import('../src/systems/StatusManager.js');
const AF = await import('../src/data/enemyAffinities.js');
const EL = await import('../src/data/elites.js');
const BE = await import('../src/data/bestiary.js');
const SP = await import('../src/data/spells.js');
const { getMap } = await import('../src/data/maps/index.js');
const RX = await import('../src/systems/reactions.js');
const { targetInfo } = await import('../src/systems/targetInfo.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };
const mob = (extra = {}) => ({ _statuses: {}, health: 100, maxHealth: 100, active: true, setTint() {}, clearTint() {}, ...extra });

// ---- B1: affinities
{
    for (const type of Object.keys(AF.ENEMY_FAMILY)) ok(ENEMY_TYPES[type] || type === 'void_general', `family entry for a real creature: ${type}`);
    for (const fam of Object.values(AF.ENEMY_FAMILY)) ok(AF.FAMILIES[fam], `family ${fam} defined`);
    eq(AF.affinityMult('lava_elemental', 'fire'), 0.25, 'fire creatures shrug off fire');
    eq(AF.affinityMult('lava_elemental', 'water'), 1.5, 'and fear water');
    eq(AF.affinityMult('frost_bear', 'fire'), 1.5, 'ice creatures fear fire');
    eq(AF.affinityMult('wolf', 'fire'), 1, 'no family, no change');
    eq(AF.affinityMult('lava_elemental', null), 1, 'no element, no change');
    eq(AF.affinityOf('nobody'), { family: null, resist: {}, immune: [] }, 'unknown type is neutral');
    ok(AF.affinityOf('ember_imp').immune.includes('burning'), 'fire creatures cannot burn');

    const imp = mob({ immune: AF.affinityOf('ember_imp').immune });
    statusManager.apply(imp, 'burning');
    ok(!statusManager.has(imp, 'burning'), 'immunity blocks the status');
    statusManager.apply(imp, 'wet');
    ok(statusManager.has(imp, 'wet'), 'other statuses still apply');
}

// ---- B3: reactions
{
    // Freeze: cold on a wet target
    const e = mob();
    statusManager.apply(e, 'wet');
    statusManager.apply(e, 'cold');
    ok(statusManager.has(e, 'frozen'), 'cold + wet → frozen');
    ok(!statusManager.has(e, 'wet') && !statusManager.has(e, 'cold'), 'the water froze: no wet, no plain cold');
    ok(e._statuses.frozen.remaining === 3000, 'frozen for 3 s');
    const dry = mob();
    statusManager.apply(dry, 'cold');
    ok(statusManager.has(dry, 'cold') && !statusManager.has(dry, 'frozen'), 'cold on a dry target is just cold');
    const yeti = mob({ immune: ['cold', 'frozen'] });
    statusManager.apply(yeti, 'wet');
    statusManager.apply(yeti, 'cold');
    ok(!statusManager.has(yeti, 'frozen') && statusManager.has(yeti, 'wet'), 'immune to cold: no freeze, stays wet');

    // Conduct: one hop to other wet enemies in range
    const src = { x: 0, y: 0 };
    const a = { x: 50, y: 0, active: true, wet: true }, b = { x: 89, y: 0, active: true, wet: true };
    const far = { x: 200, y: 0, active: true, wet: true }, dryOne = { x: 10, y: 0, active: true, wet: false };
    const dead = { x: 20, y: 0, active: false, wet: true };
    eq(RX.conductTargets(src, [src, a, b, far, dryOne, dead], x => x.wet), [a, b], 'arcs to wet, live enemies within 90 px, never the source');
    eq(RX.CONDUCT_FRACTION, 0.5, 'half damage');

    // Detonate
    eq(RX.detonateDamage(100), 45, '15 + 30% of the hit');
    eq(RX.detonateDamage(0), 15, 'a weak hit still bursts');
}

// ---- B4: target info
{
    const e = mob({ enemyType: 'frost_shade', level: 8, health: 40, maxHealth: 120 });
    statusManager.apply(e, 'mana_ward');
    statusManager.apply(e, 'burning');
    e._cast = { id: 'frost_bolt', elapsed: 500, castMs: 1000 };
    const t = targetInfo(e);
    eq([t.name, t.level, t.hp, t.maxHp, t.dead, t.elite], ['Frost Shade', 8, 40, 120, false, false], 'name, level, HP');
    eq(t.family, 'Frost-born', 'family label');
    eq(t.statuses.filter(s => s.buff).map(s => s.id), ['mana_ward'], 'buffs listed');
    eq(t.statuses[0].id, 'mana_ward', 'buffs first');
    ok(t.statuses.some(s => s.id === 'burning'), 'debuffs listed too');
    ok(t.statuses.find(s => s.id === 'mana_ward').secs === 12, 'seconds left, rounded up');
    eq(t.cast, { name: 'Frost Bolt', frac: 0.5 }, 'cast in progress');
    const gone = targetInfo({ ...e, active: false, health: -5 });
    eq([gone.dead, gone.hp], [true, 0], 'a dead target reads 0 HP without throwing');
    const boss = mob({ enemyType: 'void_general', displayName: 'Void General', _aegisCast: { elapsed: 800 } });
    eq(targetInfo(boss).cast.name, 'Void Aegis', 'the boss channel shows');
    eq(targetInfo(mob({ enemyType: 'wolf', elite: true, affixes: ['vampiric'] })).elite, true, 'elite flag');

    const s = new PlayerStats();
    eq(s.seenEnemyTypes, [], 'new character has seen nothing');
    store.clear(); SaveManager.setSlot('t', 'eldrin');
    s.seenEnemyTypes.push('wolf'); SaveManager.save(s);
    const u = new PlayerStats(); SaveManager.load(u, 't', 'eldrin');
    eq(u.seenEnemyTypes, ['wolf'], 'seen creatures saved');
}

// ---- B2: elites
{
    eq(EL.eliteCap(0), 0, 'no spawns, no elites');
    eq(EL.eliteCap(5), 1, 'a small map can still have one');
    eq(EL.eliteCap(13), 2, 'one per six spawns');
    ok(EL.rollElite(() => 0.01, 0, 1), 'low roll under the cap → elite');
    ok(!EL.rollElite(() => 0.5, 0, 1), 'high roll → normal');
    ok(!EL.rollElite(() => 0.01, 1, 1), 'cap reached → normal');
    const one = EL.pickAffixes((() => { const r = [0.1, 0.3]; return () => r.shift() ?? 0; })());
    eq(one.length, 1, 'one affix on a low second roll');
    const two = EL.pickAffixes((() => { const r = [0.9, 0.0, 0.5]; return () => r.shift() ?? 0; })());
    eq(two.length, 2, 'two affixes on a high roll');
    ok(new Set(two).size === 2 && two.every(a => EL.ELITE_AFFIXES.includes(a)), 'distinct, known affixes');
    eq(EL.eliteStats({ health: 100, damage: 10, xpReward: 20, goldDrop: 4 }), { health: 250, damage: 14, xpReward: 60, goldDrop: 12 }, 'elite multipliers');
    const rare = EL.eliteRareDrop(getMap('prologue_forest'), () => 0);
    ok(typeof rare === 'string' && rare.length > 0, `a rare regional drop (${rare})`);
    eq(EL.eliteRareDrop({ spawns: {} }, () => 0), 'silver_ore', 'fallback when the map has no nodes');
}

// ---- F1: bestiary
{
    const s = new PlayerStats();
    eq(s.killCounts, {}, 'no kills yet');
    s.trackKill('wolf'); s.trackKill('wolf'); s.trackKill('frost_shade');
    eq(s.killCounts, { wolf: 2, frost_shade: 1 }, 'kills counted');
    eq(s.killedEnemyTypes, ['wolf', 'frost_shade'], 'first kills still listed');
    const list = BE.bestiaryEntries({ killed: s.killedEnemyTypes, seen: ['grave_wraith'], killCounts: s.killCounts, band: { min: 7, max: 9 } });
    eq(list.map(e => e.title), ['Forest Wolf', 'Frost Shade', '???'], 'killed first (lore name when there is one), then seen-only as ???');
    const shade = list[1].text;
    ok(/Killed: 1/.test(shade), 'kill count');
    ok(/Lv 7–9: HP \d+–\d+/.test(shade), 'stats at the region band');
    ok(/immune: cold, frozen/.test(shade) && /weak: fire ×1\.5/.test(shade), 'affinities');
    ok(/Casts: Frost Bolt/.test(shade), 'spells');
    ok(/Drops: /.test(list[0].text), 'loot');
    store.clear(); SaveManager.setSlot('b', 'eldrin');
    SaveManager.save(s);
    const u = new PlayerStats(); SaveManager.load(u, 'b', 'eldrin');
    eq(u.killCounts, { wolf: 2, frost_shade: 1 }, 'kill counts saved');
    const legacy = JSON.parse(store.get('amo_save_b_eldrin')); delete legacy.killCounts; delete legacy.seenEnemyTypes;
    store.set('amo_save_b_eldrin', JSON.stringify(legacy));
    const v = new PlayerStats(); SaveManager.load(v, 'b', 'eldrin');
    eq([v.killCounts, v.seenEnemyTypes], [{}, []], 'legacy save: empty defaults');
    ok(/Killed: 1/.test(BE.bestiaryEntries({ killed: v.killedEnemyTypes, seen: [], killCounts: v.killCounts, band: { min: 1, max: 3 } })[0].text), 'legacy kills show at least 1');
}

// ---- F2: spell numbers
{
    const fb = SP.SPELLS.fireball;   // baseDmg [20, 8, 1.0]
    eq(SP.spellDamageAt(fb, 1, 5), 25, 'tier 1, INT 5: 20 + 5');
    eq(SP.spellDamageAt(fb, 3, 10), 46, 'tier 3, INT 10: 20 + 16 + 10');
    eq(SP.spellDamageAt(fb, 1, 5, 1.1), 27, 'multiplier (blessed) applied and floored');
    eq(SP.spellDamageAt({ }, 1, 5), 10, 'no baseDmg → 10');
    eq(SP.spellTooltip(fb, 3, 10), 'Dmg 46 · Burning 60% 12s · CD 1s · Range 240 · Area 56', 'full tooltip at tier 3');
    eq(SP.spellTooltip(SP.SPELLS.aetheric_ward, 1, 5), 'Warded (until broken) · CD ' + (SP.SPELLS.aetheric_ward.cooldown[0] / 1000) + 's', 'self spell without damage or range');
}

// ---- final review fixes
{
    // Conduct never arcs onto an enemy already struck in the same cast
    const a = { x: 0, y: 0, active: true }, b = { x: 40, y: 0, active: true }, c = { x: 80, y: 0, active: true };
    eq(RX.conductTargets(a, [a, b, c], () => true, new Set([b])), [c], 'already-hit enemies are skipped');
    // The boss bestiary entry uses the boss's real numbers
    const boss = BE.bestiaryEntries({ killed: ['void_general'], seen: [], killCounts: { void_general: 1 }, band: { min: 1, max: 3 } })[0];
    ok(/HP 350/.test(boss.text) && !/Lv 1–3/.test(boss.text), 'boss: 350 HP, not a scaled default');
    // Scene wiring node can't run: check the source
    const fs = await import('node:fs');
    const src = f => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');
    const sb = src('scenes/SpellbookScene.js');
    ok(/spellTooltip\([^)]*\)[\s\S]{0,200}maxLines: 1/.test(sb) && /lore[\s\S]{0,300}wordWrap: \{ width: maxW - 180 \}[\s\S]{0,60}maxLines: 1/.test(sb), 'spellbook lines are wrapped to the row and kept to one line');
    ok(/spellDamageMult/.test(sb), 'spellbook damage uses the same multipliers as casting');
    const gs = src('scenes/GameScene.js');
    ok(/create\(\) \{[\s\S]{0,400}this\._target = null/.test(gs), 'a new map clears the old target');
    ok(/_conductedThisCast/.test(gs), 'conduct tracks who was already hit in this cast');
}

console.log(`✓ combat-depth tests passed (${n} assertions).`);
