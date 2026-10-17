// Phase 4 quests: quest engine additions (D1) and bounty boards (D2).
// Run: node tools/test_phase4_quests.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { PlayerStats, playerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');
const { questManager } = await import('../src/systems/QuestManager.js');
const QR = await import('../src/data/questRules.js');
const { QUESTS } = await import('../src/data/quests.js');
const { NPCS, npcName } = await import('../src/data/npcs.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// A fresh player with test quests registered as generated quests.
function freshPlayer(quests = {}) {
    playerStats.reset();
    playerStats.generatedQuests = JSON.parse(JSON.stringify(quests));
    return playerStats;
}

const FETCH = {
    id: 't_fetch', title: 'Fetch', type: 'side', description: 'Bring herbs.', giver: 'hermit',
    steps: [{ id: 'herbs', type: 'have', target: 'moonpetal', label: 'Bring Moonpetal', required: 3, consume: true }],
    reward: { xp: 50, gold: 7, glint: 3, recipe: 'moonveil_tonic', spell: 'cleanse', insight: 2, items: ['health_potion'] },
};
const HUNT = {
    id: 't_hunt', title: 'Hunt', type: 'side', description: 'Kill.', requires: ['t_fetch'], requiresFlags: ['ok_flag'],
    steps: [{ id: 'k', type: 'kill', target: 'wolf', label: 'Kill wolves', required: 2 }],
    reward: { xp: 10 },
};
const ELITE = {
    id: 't_elite', title: 'Elite', type: 'bounty', description: 'Elite.', giver: 'board_x', turnIn: 'board_x', turnInName: 'the Bounty Board', repeatable: true,
    steps: [{ id: 'e', type: 'kill_elite', target: 'any', label: 'Slay an elite', required: 1 }],
    reward: { xp: 5, gold: 1 },
};

// ---- npcs
{
    eq(npcName('hermit'), 'the Hermit', 'known NPC name');
    eq(npcName('old_man'), 'old man', 'unknown NPC id falls back to a readable id');
    ok(NPCS.silvara.place, 'NPCs carry a place for the journal');
}

// ---- questRules: steps, turn-in, progress
{
    const steps = QR.questSteps(FETCH);
    eq(steps.length, 2, 'a giver adds a turn-in step');
    eq(steps[1], { id: QR.TURN_IN_STEP, type: 'talk', target: 'hermit', label: 'Return to the Hermit', required: 1, turnIn: true }, 'turn-in step shape');
    ok(QR.questSteps(FETCH) === steps, 'questSteps is stable for the same quest');
    eq(QR.questSteps(HUNT), HUNT.steps, 'no giver, no turn-in step');
    eq(QR.questSteps(ELITE)[1].label, 'Return to the Bounty Board', 'turnInName wins over the NPC table');
    const own = { id: 'o', giver: 'silvara', steps: [{ id: 'r', type: 'talk', target: 'silvara', label: 'Return', required: 1 }] };
    eq(QR.questSteps(own).length, 1, 'a quest that already ends by talking to the turn-in NPC gets no extra step');
    eq(QR.turnInOf({ giver: 'a', turnIn: 'b' }), 'b', 'turnIn overrides the giver');

    const log = { status: 'active', progress: { herbs: 0, [QR.TURN_IN_STEP]: 0 } };
    eq(QR.stepProgress(FETCH.steps[0], log, () => 5), 3, 'have progress is live and capped');
    eq(QR.stepProgress(FETCH.steps[0], log, () => 1), 1, 'have progress follows the inventory');
    ok(QR.objectivesDone(FETCH, log, () => 3), 'objectives done when the items are held');
    ok(!QR.isQuestDone(FETCH, log, () => 3), 'not done until turned in');
    eq(QR.consumeOnTurnIn(FETCH), [{ id: 'moonpetal', qty: 3 }], 'consumed items');
}

// ---- questRules: start conditions
{
    const ctx = (over = {}) => ({ log: undefined, isCompleted: () => true, flags: { ok_flag: true }, chapterReached: () => true, ...over });
    ok(QR.canStart(HUNT, ctx()), 'all conditions met');
    ok(!QR.canStart(HUNT, ctx({ isCompleted: () => false })), 'requires a completed quest');
    ok(!QR.canStart(HUNT, ctx({ flags: {} })), 'requires a flag');
    ok(!QR.canStart({ ...HUNT, chapter: 'ch02' }, ctx({ chapterReached: id => id !== 'ch02' })), 'requires a chapter');
    ok(!QR.canStart(HUNT, ctx({ log: { status: 'active' } })), 'already active');
    ok(!QR.canStart(HUNT, ctx({ log: { status: 'completed' } })), 'done and not repeatable');
    ok(QR.canStart(ELITE, ctx({ log: { status: 'completed' } })), 'done and repeatable');
}

// ---- questRules: rewards, dialogue
{
    const names = { itemName: id => `I:${id}`, recipeName: id => `R:${id}`, spellName: id => `S:${id}` };
    eq(QR.rewardParts(FETCH.reward, names), ['50 XP', '3 Glint', '7 Gold', 'I:health_potion', 'Recipe: R:moonveil_tonic', 'Spell: S:cleanse', '2 Insight'], 'reward parts');
    eq(QR.rewardParts(undefined, names), [], 'no reward');

    const lines = [{ text: 'a' }, { text: 'b', ifFlag: 'f' }, { text: 'c', unlessFlag: 'f' }];
    eq(QR.visibleLines(lines, {}).map(l => l.text), ['a', 'c'], 'flag unset');
    eq(QR.visibleLines(lines, { f: true }).map(l => l.text), ['a', 'b'], 'flag set');

    const flags = {}, started = [];
    eq(QR.applyChoice({ text: 'x', setFlag: 'g', startQuest: 'q1', next: 'more' }, flags, id => started.push(id)), 'more', 'choice returns next');
    eq(flags, { g: true }, 'choice sets a flag');
    eq(started, ['q1'], 'choice starts a quest');
    eq(QR.applyChoice({ text: 'Not now' }, flags, id => started.push(id)), null, 'plain choice');
    eq(started, ['q1'], 'plain choice starts nothing');
}

// ---- QuestManager: hand-in with turn-in (Review Focus 1, 2)
{
    const s = freshPlayer({ t_fetch: FETCH });
    questManager.startQuest('t_fetch');
    ok(questManager.isActive('t_fetch'), 'generated quests start through the manager');
    eq(Object.keys(s.questLog.t_fetch.progress).sort(), [QR.TURN_IN_STEP, 'herbs'].sort(), 'log tracks the turn-in step');

    questManager.onTalk('hermit');
    eq(s.questLog.t_fetch.progress[QR.TURN_IN_STEP], 0, 'talking before the objectives are met does not tick the turn-in');

    s.addItem('moonpetal', 3);
    questManager.recheck();
    ok(questManager.isActive('t_fetch'), 'holding the items is not enough without turning in');
    s.consumeItem('moonpetal', 1);
    questManager.onTalk('hermit');
    ok(questManager.isActive('t_fetch'), 'turn-in refused once the items were spent');
    eq(s.questLog.t_fetch.progress[QR.TURN_IN_STEP], 0, 'refused turn-in records nothing');

    s.addItem('moonpetal', 2);
    const before = { xp: s.xp, gold: s.gold, glint: s.glint, ins: s.resonanceInsights, lvl: s.level };
    questManager.onTalk('hermit');
    ok(questManager.isCompleted('t_fetch'), 'turned in');
    eq(s.countItem('moonpetal'), 1, 'consume: true takes exactly the required count');
    eq(s.gold, before.gold + 7, 'gold reward');
    eq(s.glint, before.glint + 3, 'glint reward');
    ok(s.xp !== before.xp || s.level > before.lvl, 'xp reward');
    ok(s.knownRecipes.includes('moonveil_tonic'), 'recipe reward');
    ok(s.getSpellLevel('cleanse') >= 1, 'spell reward');
    eq(s.resonanceInsights, before.ins + 2, 'explicit insight overrides the type default');
    ok(s.countItem('health_potion') >= 1, 'item reward');
}

// ---- QuestManager: no turn-in → have completes on recheck
{
    const q = { ...FETCH, id: 't_nogiver', giver: undefined, steps: [{ ...FETCH.steps[0], consume: false }] };
    const s = freshPlayer({ t_nogiver: q });
    questManager.startQuest('t_nogiver');
    s.addItem('moonpetal', 3);
    questManager.recheck();
    ok(questManager.isCompleted('t_nogiver'), 'a have quest without a giver completes when the items are held');
    eq(s.countItem('moonpetal'), 3, 'consume: false keeps the items');
}

// ---- QuestManager: offers, prerequisites, elites, repeatable (Review Focus 5)
{
    // Offers come from authored quests (bounties are taken at their board).
    const s = freshPlayer({ t_elite: ELITE });
    const hermitFirst = Object.values(QUESTS).filter(q => q.giver === 'hermit');
    hermitFirst.forEach(q => delete QUESTS[q.id]);
    Object.assign(QUESTS, { t_fetch: FETCH, t_hunt: { ...HUNT, giver: 'hermit' } });
    eq(questManager.offerFor('hermit')?.id, 't_fetch', 'the giver offers its first startable quest');
    s.questLog.t_fetch = { status: 'completed', progress: {} };
    eq(questManager.offerFor('hermit'), null, 'the follow-up waits for its flag');
    s.flags.ok_flag = true;
    eq(questManager.offerFor('hermit')?.id, 't_hunt', 'then it is offered');

    questManager.startQuest('t_elite');
    questManager.onKill('wolf', { isElite: false });
    ok(questManager.isActive('t_elite'), 'a normal kill does not count for kill_elite');
    questManager.onKill('wolf', { isElite: true });
    eq(s.questLog.t_elite.progress.e, 1, 'an elite kill counts');
    questManager.onTalk('board_x');
    ok(questManager.isCompleted('t_elite'), 'turned in at the board');
    eq(s.resonanceInsights, 0, 'bounties give no insight by default');

    questManager.startQuest('t_elite');
    ok(questManager.isActive('t_elite'), 'a repeatable quest starts again');
    eq(s.questLog.t_elite.progress, { e: 0, [QR.TURN_IN_STEP]: 0 }, 'with fresh progress');
    questManager.startQuest('t_hunt');
    s.questLog.t_hunt.status = 'completed';
    questManager.startQuest('t_hunt');
    eq(s.questLog.t_hunt.status, 'completed', 'a non-repeatable quest does not restart');
    eq(questManager.offerFor('board_x'), null, 'generated quests are never offered by talking');
    delete QUESTS.t_fetch; delete QUESTS.t_hunt;
    hermitFirst.forEach(q => { QUESTS[q.id] = q; });
}

// ---- Old saves and unknown ids (Review Focus 3)
{
    const s = freshPlayer();
    s.questLog.gone_quest = { status: 'active', progress: { a: 0 } };
    eq(questManager.questDef('gone_quest'), undefined, 'unknown id resolves to nothing');
    ok(!questManager.getActiveQuests().some(q => !q), 'active list skips unknown ids');
    questManager.onKill('wolf'); questManager.onTalk('hermit'); questManager.recheck();
    ok(true, 'events with an unknown quest in the log do not throw');

    const fresh = new PlayerStats();
    eq([fresh.flags, fresh.generatedQuests, fresh.bounties], [{}, {}, {}], 'new fields default empty');

    s.flags = { a: true };
    s.generatedQuests = { t_elite: ELITE };
    s.bounties = { board_x: { day: 3, offers: [], active: 't_elite' } };
    SaveManager.save(s, 'st', 'c1');
    const back = new PlayerStats();
    SaveManager.load(back, 'st', 'c1');
    eq(back.flags, { a: true }, 'flags round-trip');
    eq(back.generatedQuests.t_elite.title, 'Elite', 'generated quests round-trip');
    eq(back.bounties.board_x.active, 't_elite', 'board state round-trips');

    const raw = JSON.parse(store.get([...store.keys()].find(k => k.includes('c1'))));
    delete raw.flags; delete raw.generatedQuests; delete raw.bounties;
    store.set([...store.keys()].find(k => k.includes('c1')), JSON.stringify(raw));
    const old = new PlayerStats();
    old.flags = { stale: true };
    SaveManager.load(old, 'st', 'c1');
    eq([old.flags, old.generatedQuests, old.bounties], [{}, {}, {}], 'old saves load with empty defaults');
}

// ---- Authored content: the Hermit's quests, NPC ids, dialogue choices
{
    const { ITEMS } = await import('../src/data/items.js');
    const { SPELLS } = await import('../src/data/spells.js');
    const { DIALOGUES } = await import('../src/data/dialogues.js');
    const { HERMIT_HUT } = await import('../src/data/maps/hermit_hut.js');
    const { NPC_POSITIONS } = await import('../src/data/worldMap.js');

    const s = freshPlayer();
    eq(questManager.offerFor('hermit'), null, 'the Hermit offers nothing before you offer to help');
    s.flags.offered_hermit_help = true;
    eq(questManager.offerFor('hermit')?.id, 'side_hermits_remedy', 'then he offers the remedy');
    questManager.startQuest('side_hermits_remedy');
    eq(questManager.offerFor('hermit'), null, 'nothing else while the remedy is open');
    s.addItem('moonpetal', 3); s.addItem('glowcap', 2);
    questManager.onTalk('hermit');
    ok(questManager.isCompleted('side_hermits_remedy'), 'the remedy is handed in by talking to him');
    eq([s.countItem('moonpetal'), s.countItem('glowcap')], [0, 0], 'the herbs are handed over');
    ok(s.knownRecipes.includes('moonveil_tonic'), 'the remedy teaches Moonveil Tonic');
    eq(questManager.offerFor('hermit')?.id, 'side_shadows_at_the_threshold', 'then the threshold quest is offered');

    eq(HERMIT_HUT.spawns.npcs[0].id, 'hermit', 'the hut Hermit has the hermit id');
    eq(NPC_POSITIONS.find(p => p.isShop).id, 'silvara', 'Silvara has her id');

    for (const q of Object.values(QUESTS)) {
        for (const who of [q.giver, q.turnIn].filter(Boolean)) ok(NPCS[who], `${q.id}: NPC ${who} is known`);
        for (const r of q.requires ?? []) ok(QUESTS[r], `${q.id}: required quest ${r} exists`);
        for (const st of q.steps) if (st.type === 'have') ok(ITEMS[st.target], `${q.id}: have item ${st.target} exists`);
        if (q.reward?.recipe) ok(ITEMS[q.reward.recipe], `${q.id}: recipe output ${q.reward.recipe} exists`);
        if (q.reward?.spell) ok(SPELLS[q.reward.spell], `${q.id}: spell ${q.reward.spell} exists`);
    }
    let choices = 0;
    for (const [key, lines] of Object.entries(DIALOGUES)) for (const line of lines) for (const c of line.choices ?? []) {
        choices++;
        ok(c.text, `${key}: a choice has text`);
        if (c.startQuest) ok(QUESTS[c.startQuest], `${key}: choice starts a real quest`);
        if (c.next) ok(DIALOGUES[c.next], `${key}: choice leads to a real dialogue`);
    }
    ok(DIALOGUES.hermit_hut_after.some(l => l.choices?.some(c => c.startQuest === 'side_hermits_remedy' && c.setFlag === 'offered_hermit_help')),
        'the Hermit\'s after-dialogue lets you offer help');
    ok(choices >= 2, 'dialogue choices exist');
}

// ---- Campaign: the `chapter` requirement's source
{
    const { CampaignManager } = await import('../src/systems/CampaignManager.js');
    const done = new Set();
    const qm = { onQuestEvent() {}, isCompleted: id => done.has(id) };
    const campaign = { id: 'c', chapters: [
        { id: 'a', maps: ['m1'], quests: ['qa'], unlocks: [] },
        { id: 'b', maps: ['m2'], quests: ['qb'], unlocks: [] },
    ] };
    const cm = new CampaignManager({ campaign, questManager: qm, playerStats: { campaign: null } });
    ok(cm.isChapterReached('a'), 'the first chapter is reached from the start');
    ok(!cm.isChapterReached('b'), 'a later chapter is not');
    done.add('qa');
    ok(cm.isChapterReached('b'), 'it is once the earlier chapters are done');
    ok(!cm.isChapterReached('nope'), 'an unknown chapter is never reached');
    ok(new CampaignManager({ campaign: null, questManager: qm, playerStats: { campaign: null } }).isChapterReached('a'),
        'without a campaign nothing is chapter-gated');
}

console.log(`test_phase4_quests: ${n} checks passed`);
