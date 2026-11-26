// node tools/numbers_check.mjs — the balance at a glance (docs/3d/AUTONOMOUS_RUN.md 7.4): a typical creature scaled to
// each band's level (bands.js) against a hero of that level (amo's PlayerStats, points spent evenly), and the quests'
// experience against what a level costs.
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
const R = '../../../packages/rules/src/';
const { PlayerStats, xpForLevel } = await import(R + 'systems/PlayerStats.js');
const { ENEMY_TYPES } = await import(R + 'data/worldMap.js');
const { QUESTS } = await import(R + 'data/quests.js');
// (bands.js's scaleToLevel, inlined: bands.js imports a JSON node cannot load bare)
const hpAt = L => 30 + 9 * L, dmgAt = L => 4 + 1.2 * L;
const scaleToLevel = (B, L) => { const nat = Math.max(1, Math.min(50, (B.health - 30) / 9)); return { ...B, health: Math.round(B.health * hpAt(L) / hpAt(nat)), damage: Math.round(B.damage * dmgAt(L) / dmgAt(nat)) }; };

const hero = (L, all = null) => {   // points spent evenly over the four attributes, or all on one
    const s = new PlayerStats();
    for (let l = 1; l < L; l++) s.gainXp(s.xpToNextLevel);
    const keys = ['strength', 'intelligence', 'stamina', 'agility']; let k = 0;
    while (s.attributePoints > 0) s.distributePoint(all ?? keys[k++ % 4]);
    return { hp: s.maxHealth };
};
console.log('level | hero hp (even / all stamina) | wolf hp/dmg | crag-fiend hp/dmg | crag-fiend blows to fell the hero (even / all stamina)');
for (const L of [3, 10, 20, 30, 40, 45, 50]) {
    const h = hero(L), hs = hero(L, 'stamina'), w = scaleToLevel(ENEMY_TYPES.wolf ?? ENEMY_TYPES.grey_wolf ?? Object.values(ENEMY_TYPES)[0], L), c = scaleToLevel(ENEMY_TYPES.crag_fiend, L);
    console.log(`${L} | ${h.hp} / ${hs.hp} | ${w.health}/${w.damage} | ${c.health}/${c.damage} | ${(h.hp / c.damage).toFixed(1)} / ${(hs.hp / c.damage).toFixed(1)}`);
}
console.log('\nquest | xp | ≈ share of one level at its band');
const BAND = id => /^starter_/.test(id) ? 4 : /^band2_/.test(id) ? 14 : /^band3_/.test(id) ? 25 : /^band4_|^ravenspire_/.test(id) ? 34 : /^band5_/.test(id) ? 45 : /^nythoria_/.test(id) ? 18 : null;
for (const [id, q] of Object.entries(QUESTS)) { const L = BAND(id); if (!L) continue; const xp = q.reward?.xp ?? 0; console.log(`${id} | ${xp} | ${(xp / xpForLevel(L) * 100).toFixed(0)}% of level ${L}`); }
