#!/usr/bin/env node
/**
 * Unit tests for the campaign spine: SaveManager's campaign round-trip,
 * PlayerStats's free unlock grants, and CampaignManager's gating,
 * completion and unlock-granting logic (tested against fixture data, not
 * the real Eldoria's Prophecy campaign — see test_campaign_definition.mjs
 * for the file that checks the real campaign against the bible).
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
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SPELLS } = await import('../src/data/spells.js');
const { CampaignManager } = await import('../src/systems/CampaignManager.js');

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
    loaded.campaign = null;
    SaveManager.load(loaded, 'test_story', 'test_char');
    check('campaign round-trips through save/load', loaded.campaign, stats.campaign);
}
{
    const stats = {
        level: 1, xp: 0, xpToNextLevel: 100, health: 60, maxHealth: 60,
        mana: 10, maxMana: 10, skillPoints: 0, attributes: { strength: 5, intelligence: 5, stamina: 5, agility: 5 },
        equipment: {}, skills: {}, inventory: [],
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

// ── CampaignManager: gating, completion, unlocks — all against fixtures ────
// A tiny fake QuestManager: complete(questId) marks it done and fires every
// registered callback, exactly like the real QuestManager's _notify does.
function makeFakeQuestManager() {
    const completed = new Set();
    const callbacks = [];
    return {
        isCompleted: (id) => completed.has(id),
        onQuestEvent: (fn) => callbacks.push(fn),
        complete(id) {
            completed.add(id);
            callbacks.forEach(fn => fn(id, null, -1));
        },
    };
}

function makeFakeCampaign() {
    return {
        id: 'fixture_campaign',
        chapters: [
            { id: 'f1', maps: ['map_a'], quests: ['q1'], unlocks: [{ type: 'item', id: 'health_potion' }], title: 'Fixture One' },
            { id: 'f2', maps: ['map_b'], quests: ['q2a', 'q2b'], unlocks: [], title: 'Fixture Two' },
            { id: 'f3', maps: ['map_b', 'map_c'], quests: ['q3'], unlocks: [{ type: 'ability', id: 'aetheric_sight' }], title: 'Fixture Three' },
        ],
    };
}

{
    const fakeQuests = makeFakeQuestManager();
    const stats = new PlayerStats();
    const cm = new CampaignManager({
        campaign: makeFakeCampaign(),
        questManager: fakeQuests,
        playerStats: stats,
    });

    check('a fresh campaign starts at the first chapter', cm.currentChapter().id, 'f1');
    check('unclaimed maps are always enterable', cm.canEnter('some_sandbox_map').allowed, true);
    check('the current chapter\'s own map is enterable', cm.canEnter('map_a').allowed, true);
    check('a later chapter\'s map is refused', cm.canEnter('map_b').allowed, false);
    check('a refusal carries a reason', typeof cm.canEnter('map_b').reason, 'string');

    check('chapterFor finds the right chapter', cm.chapterFor('map_a').id, 'f1');
    check('chapterFor returns null for an unclaimed map', cm.chapterFor('nope'), null);
    check('chapterFor returns the earliest chapter for a shared map', cm.chapterFor('map_b').id, 'f2');

    check('isChapterComplete is false with no quests done', cm.isChapterComplete('f1'), false);
    check('inventory has no potion yet', stats.inventory.some(i => i.id === 'health_potion'), false);

    fakeQuests.complete('q1');
    check('completing the only quest advances the chapter', cm.currentChapter().id, 'f2');
    check('the completed chapter is recorded', stats.campaign.completed, ['f1']);
    check('its unlock was granted', stats.inventory.some(i => i.id === 'health_potion'), true);
    check('map_b is now enterable', cm.canEnter('map_b').allowed, true);
    check('map_c (chapter 3) is still refused', cm.canEnter('map_c').allowed, false);

    fakeQuests.complete('q2a');
    check('one of two quests is not enough', cm.currentChapter().id, 'f2');

    // Sequence-break: q3 (chapter 3's own quest) completes while chapter 2
    // is still current, because it lives on map_c, and map_c happens to sit
    // right next to map_b's own content in this fixture. Nothing should
    // happen yet — chapter 2 isn't done.
    fakeQuests.complete('q3');
    check('an out-of-order future quest does not skip ahead', cm.currentChapter().id, 'f2');

    fakeQuests.complete('q2b');
    // Both chapter 2 AND chapter 3 should now be complete in one pass —
    // chapter 3's quest already finished above, so the moment chapter 2
    // completes, the fresh-poll loop must cascade straight through it.
    check('finishing chapter 2 cascades through the already-done chapter 3', cm.currentChapter(), null);
    check('both chapters are recorded complete', stats.campaign.completed, ['f1', 'f2', 'f3']);
    check('chapter 3\'s ability unlock was granted', stats.skills.aetheric_sight.level >= 1, true);
}

// ── CampaignManager: an unrecognised save chapter falls back, not throws ───
{
    const fakeQuests = makeFakeQuestManager();
    const stats = new PlayerStats();
    stats.campaign = { id: 'fixture_campaign', chapter: 'not_a_real_chapter_id', completed: ['f1'] };
    const cm = new CampaignManager({ campaign: makeFakeCampaign(), questManager: fakeQuests, playerStats: stats });

    check('an unknown chapter id falls back to the first not-completed chapter', cm.currentChapter().id, 'f2');
}

// ── CampaignManager: a campaign-less state never throws ─────────────────────
{
    const fakeQuests = makeFakeQuestManager();
    const stats = new PlayerStats();
    const cm = new CampaignManager({ campaign: null, questManager: fakeQuests, playerStats: stats });

    check('currentChapter is null with no campaign', cm.currentChapter(), null);
    check('canEnter allows everything with no campaign', cm.canEnter('anything').allowed, true);
}

if (fails.length) {
    console.error(`✗ campaign-manager tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ campaign-manager tests passed (${passed}).`);
