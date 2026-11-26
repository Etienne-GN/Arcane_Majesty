import { QUESTS } from '../data/quests.js';
import { playerStats } from './PlayerStats.js';
import { questSteps, objectivesDone, isQuestDone, canStart, consumeOnTurnIn } from '../data/questRules.js';

const MEMORY_FRAGMENTS = {
    main_odysseys_dawn: {
        title: 'The Second Journal',
        text:  "Eldrin's hand, the fourth day — 'Magic is expensive. It costs what it costs, and then it costs more, because it calls to everything that feeds on cost. I will use it as a man uses money on a long road: sparingly, in the dark, and never twice in the same place.'"
    },
    side_traders_rumor: {
        title: 'The Anchor',
        text:  "A trader's rumor — 'Strangers ask about \"the Anchor\", quietly, one question per village, moving in a line eastward.' Someone else is hunting the same prize."
    },
    side_hunters_larder: {
        title: "Cook's Wisdom",
        text:  "Margin note in a worn recipe book — 'A hunter who does not eat is a hunter who is already dead. The fire asks nothing of you — only that you bring it something worth cooking.'"
    },
};

class QuestManager {
    constructor() {
        this._callbacks = [];
    }

    // Authored quests first, then generated ones (bounties) kept in the save.
    questDef(questId) { return QUESTS[questId] ?? playerStats.generatedQuests?.[questId]; }

    _count = id => playerStats.countItem(id);

    // [questId, def] for every active quest whose definition still exists.
    _active() {
        return Object.keys(playerStats.questLog)
            .filter(id => this.isActive(id))
            .map(id => [id, this.questDef(id)])
            .filter(([, q]) => q);
    }

    startQuest(questId) {
        const quest = this.questDef(questId);
        if (!quest) return;
        const prev = playerStats.questLog[questId];
        if (prev && !(prev.status === 'completed' && quest.repeatable)) return;
        const log = { status: 'active', progress: {} };
        questSteps(quest).forEach(s => { log.progress[s.id] = 0; });
        playerStats.questLog[questId] = log;
        this._notify(questId, null, 0);
    }

    isActive(questId)    { return playerStats.questLog[questId]?.status === 'active'; }
    isCompleted(questId) { return playerStats.questLog[questId]?.status === 'completed'; }
    getStatus(questId)   { return playerStats.questLog[questId]?.status ?? 'unknown'; }

    canOffer(questId, chapterReached = () => true) {
        return canStart(this.questDef(questId), {
            log: playerStats.questLog[questId], isCompleted: id => this.isCompleted(id),
            flags: playerStats.flags ?? {}, chapterReached,
        });
    }

    // The first authored quest this NPC gives that can start now, or null.
    offerFor(npcId, chapterReached) {
        return Object.values(QUESTS).find(q => q.giver === npcId && this.canOffer(q.id, chapterReached)) ?? null;
    }

    advanceStep(questId, stepId, amount = 1) {
        const log = playerStats.questLog[questId];
        if (!log || log.status !== 'active') return;
        const quest = this.questDef(questId);
        const step = questSteps(quest).find(s => s.id === stepId);
        if (!step || step.type === 'have') return;
        // The "Return to …" step only counts once everything else is done (items counted live).
        if (step.turnIn && !objectivesDone(quest, log, this._count)) return;
        const current = log.progress[stepId] ?? 0;
        if (current >= step.required) return;
        log.progress[stepId] = Math.min(step.required, current + amount);
        this._notify(questId, stepId, log.progress[stepId]);
        if (log.progress[stepId] >= step.required) this._checkCompletion(questId);
    }

    // Re-evaluates live (`have`) objectives — call after the inventory changes.
    recheck() {
        for (const [qId] of this._active()) this._checkCompletion(qId);
    }

    _checkCompletion(questId) {
        const log = playerStats.questLog[questId];
        const quest = this.questDef(questId);
        if (!log || !quest || log.status !== 'active') return;
        if (!isQuestDone(quest, log, this._count)) return;
        consumeOnTurnIn(quest).forEach(({ id, qty }) => playerStats.consumeItem(id, qty));
        log.status = 'completed';
        this._giveReward(quest);
        this._notify(questId, null, -1);
    }

    _giveReward(quest) {
        const r = quest.reward;
        if (!r) return;
        if (r.glint) playerStats.glint += r.glint;
        if (r.gold)  playerStats.gold  += r.gold;
        if (r.xp)    playerStats.gainXp(r.xp);
        r.items?.forEach(id => playerStats.addItem(id));
        if (r.recipe) playerStats.learnRecipe(r.recipe);
        if (r.spell)  playerStats.forceUnlockSpell(r.spell, 1);

        // Resonance Insights: hidden quests give 3, main 2, side 1, bounties 0 — unless the reward says
        const insightMap = { hidden: 3, main: 2, side: 1, bounty: 0 };
        const insights = 'insight' in r ? r.insight : (insightMap[quest.type] ?? 1);
        if (insights) playerStats.gainResonanceInsight(insights);

        // Archive of Souls — push lore memory fragment on completion
        const fragment = MEMORY_FRAGMENTS[quest.id];
        if (fragment && !playerStats.recoveredMemories.find(m => m.id === quest.id)) {
            playerStats.recoveredMemories.push({ id: quest.id, ...fragment, timestamp: Date.now() });
        }
    }

    // ── Event hooks ───────────────────────────────────────────────────────────

    onKill(enemyType, { inVeil = false, weaponType = null, isBoss = false, isElite = false, mapId = null } = {}) {
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.map && step.map !== mapId) continue;   // bounty kills count in their region only
                if (step.type === 'kill') {
                    if (step.target === enemyType || step.target === 'any') {
                        if (!step.bossOnly || isBoss) this.advanceStep(qId, step.id);
                    }
                }
                if (step.type === 'kill_with_veil' && inVeil) {
                    if (step.target === enemyType || step.target === 'any') this.advanceStep(qId, step.id);
                }
                if (step.type === 'kill_elite' && isElite && (step.target === enemyType || step.target === 'any')) {
                    this.advanceStep(qId, step.id);
                }
                if (step.type === 'kill_with_weapon' && weaponType === step.target) {
                    if (!step.bossOnly || isBoss) this.advanceStep(qId, step.id);
                }
            }
        }
    }

    onTalk(npcId) {
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.type === 'talk' && step.target === npcId) this.advanceStep(qId, step.id);
            }
        }
    }

    onGather(resourceId, amount = 1) {
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.type === 'gather' && step.target === resourceId) this.advanceStep(qId, step.id, amount);
            }
        }
        this.recheck();
    }

    // signId: the sign's `id` on the map; a step targets one sign, or 'any' (or nothing) for any sign.
    onReadSign(signId = null) {
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.type !== 'read_signs') continue;
                if (!step.target || step.target === 'any' || step.target === signId) this.advanceStep(qId, step.id);
            }
        }
    }

    onAttune(gateId) {
        const attunedCount = playerStats.attunedGates.length;
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.type === 'attune' && (step.target === gateId || step.target === 'any')) {
                    this.advanceStep(qId, step.id);
                }
                if (step.type === 'attune_gates') {
                    const prev = playerStats.questLog[qId].progress[step.id] ?? 0;
                    if (attunedCount > prev) this.advanceStep(qId, step.id, attunedCount - prev);
                }
            }
        }
    }

    onSpellLearned(spellId) {
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.type === 'spell' && step.target === spellId) this.advanceStep(qId, step.id);
            }
        }
    }

    onPickup(itemId) {
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.type === 'collect' && (step.target === itemId || step.target === 'any')) {
                    this.advanceStep(qId, step.id);
                }
            }
        }
        this.recheck();
    }

    onCook(outputId) {
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.type === 'cook' && (step.target === outputId || step.target === 'any')) {
                    this.advanceStep(qId, step.id);
                }
            }
        }
        this.recheck();
    }

    onResonanceReached(element, value) {
        const key = `${element}_resonance`;
        for (const [qId, quest] of this._active()) {
            for (const step of questSteps(quest)) {
                if (step.type === 'reach' && step.target === key) {
                    const prev = playerStats.questLog[qId].progress[step.id] ?? 0;
                    if (value > prev) {
                        playerStats.questLog[qId].progress[step.id] = Math.min(step.required, value);
                        this._notify(qId, step.id, playerStats.questLog[qId].progress[step.id]);
                        this._checkCompletion(qId);
                    }
                }
            }
        }
    }

    getActiveQuests()    { return Object.entries(playerStats.questLog).filter(([,v]) => v.status === 'active').map(([id]) => this.questDef(id)).filter(Boolean); }
    getCompletedQuests() { return Object.entries(playerStats.questLog).filter(([,v]) => v.status === 'completed').map(([id]) => this.questDef(id)).filter(Boolean); }

    // Returns a function that removes the listener.
    onQuestEvent(fn) {
        this._callbacks.push(fn);
        return () => { this._callbacks = this._callbacks.filter(f => f !== fn); };
    }
    _notify(questId, stepId, progress) { this._callbacks.forEach(fn => fn(questId, stepId, progress)); }
}

export const questManager = new QuestManager();
