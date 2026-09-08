#!/usr/bin/env node
/**
 * Unit tests for the campaign spine: SaveManager's campaign round-trip
 * (this file), and CampaignManager's gating/completion/unlock logic
 * (added by a later task in the same plan).
 * Run: node tools/test_campaign_manager.mjs (or: npm run test:campaign-manager)
 */

// SaveManager reads/writes localStorage directly — stub it the same way a
// browser would provide it, backed by an in-memory Map so tests don't touch
// the filesystem or a real browser.
const store = new Map();
globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
};

const { SaveManager } = await import('../src/systems/SaveManager.js');

let passed = 0;
const fails = [];
function check(name, got, want) {
    const eq = JSON.stringify(got) === JSON.stringify(want);
    if (eq) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// ── SaveManager: campaign field round-trips ─────────────────────────────────
{
    const minimalStats = () => ({
        level: 1, xp: 0, xpToNextLevel: 100, health: 60, maxHealth: 60,
        mana: 10, maxMana: 10, glint: 0, gold: 50, skillPoints: 0,
        attributePoints: 0, satchelTier: 1,
        attributes: { strength: 5, intelligence: 5, stamina: 5, agility: 5 },
        equipment: { head: null, body: null, weapon: null, accessory1: null, accessory2: null },
        skills: { basic_strike: { level: 1 } },
        spells: {}, resonance: {}, spellCooldowns: {}, skillSlots: [null, null, null, null],
        attunedGates: [], exploredChunks: [], questLog: {}, recoveredMemories: [],
        inventory: [], resonanceInsights: 0, masteries: {}, codexEchoes: [],
        killedEnemyTypes: [], seenItems: new Set(),
        campaign: { id: 'eldorias_prophecy', chapter: 'ch04_summit_of_despair', completed: ['ch01_echoes_of_stone'] },
    });

    const stats = minimalStats();
    const ok = SaveManager.save(stats, 'test_story', 'test_char');
    check('save() returns true', ok, true);

    const loaded = minimalStats();
    loaded.campaign = null; // clear before load — proves load() actually restores it
    SaveManager.load(loaded, 'test_story', 'test_char');
    check('campaign round-trips through save/load', loaded.campaign, stats.campaign);
}
{
    // A save with no campaign progress at all (a save from before this
    // feature existed) must not throw and must leave campaign falsy.
    const stats = {
        level: 1, xp: 0, xpToNextLevel: 100, health: 60, maxHealth: 60,
        mana: 10, maxMana: 10, glint: 0, gold: 50, skillPoints: 0,
        attributePoints: 0, satchelTier: 1,
        attributes: { strength: 5, intelligence: 5, stamina: 5, agility: 5 },
        equipment: {}, skills: {}, spells: {}, resonance: {}, spellCooldowns: {},
        skillSlots: [null, null, null, null], inventory: [],
        attunedGates: [], exploredChunks: [], questLog: {}, recoveredMemories: [],
        resonanceInsights: 0, masteries: {}, codexEchoes: [],
        killedEnemyTypes: [], seenItems: new Set(),
    };
    const ok = SaveManager.save(stats, 'test_story2', 'test_char2');
    check('save() with no campaign field still succeeds', ok, true);

    const loaded = { ...stats, campaign: 'not yet cleared' };
    let threw = false;
    try { SaveManager.load(loaded, 'test_story2', 'test_char2'); }
    catch { threw = true; }
    check('load() of a campaign-less save does not throw', threw, false);
    check('load() of a campaign-less save leaves campaign null', loaded.campaign, null);
}

// ── PlayerStats: free unlock grants ─────────────────────────────────────────
{
    const { PlayerStats } = await import('../src/systems/PlayerStats.js');
    const { SPELLS } = await import('../src/data/spells.js');
    const realSpellId = Object.keys(SPELLS)[0];
    const stats = new PlayerStats();

    check('campaign starts null', stats.campaign, null);

    check('forceUnlockSpell on a real id succeeds', stats.forceUnlockSpell(realSpellId), true);
    check('forceUnlockSpell sets the spell to tier 1', stats.spells[realSpellId], 1);
    check('forceUnlockSpell on an unknown id fails', stats.forceUnlockSpell('not_a_real_spell'), false);

    const higherTier = stats.forceUnlockSpell(realSpellId, 2);
    check('forceUnlockSpell can raise to a higher tier', [higherTier, stats.spells[realSpellId]], [true, 2]);
    stats.forceUnlockSpell(realSpellId, 1);
    check('forceUnlockSpell never lowers an existing tier', stats.spells[realSpellId], 2);

    check('forceUnlockSkill on a real id succeeds', stats.forceUnlockSkill('aetheric_sight'), true);
    check('forceUnlockSkill sets level to at least 1', stats.skills.aetheric_sight.level >= 1, true);
    check('forceUnlockSkill on an unknown id fails', stats.forceUnlockSkill('not_a_real_skill'), false);

    stats.skills.aetheric_sight.level = 3;
    stats.forceUnlockSkill('aetheric_sight');
    check('forceUnlockSkill never lowers an existing level', stats.skills.aetheric_sight.level, 3);
}

if (fails.length) {
    console.error(`✗ campaign-manager tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ campaign-manager tests passed (${passed}).`);
