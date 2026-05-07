import { QUESTS } from '../data/quests.js';
import { playerStats } from './PlayerStats.js';

const MEMORY_FRAGMENTS = {
    main_forest_hunt: {
        title: 'Hunt Log',
        text:  "Eldrin's Journal — 'The wolves moved as shadows, drawn not by hunger but by void-taint. Whatever befouled this forest ran deeper than root or soil. The Void General was only the surface of something far older.'"
    },
    side_supply_run: {
        title: "Scout's Report",
        text:  "Recovered note — 'Supplies retrieved from the eastern cache. The roads are less safe than the merchants admit. Three caravans vanished along the ridge trail this season. No bodies found.'"
    },
    side_read_the_signs: {
        title: 'Stone Inscription (Translated)',
        text:  "Runic carving — 'Here walked the first architects of the Rift-Gate network. Their names have been removed — not by time, but by design. Someone does not want them remembered.'"
    },
    hidden_shadow_initiation: {
        title: 'Void Whisper',
        text:  "Heard in the veil — 'You have walked in my shadow. The veil remembers every soul it touches. You are marked now, scholar. The darkness knows your name.'"
    },
    hidden_covenant_scholar: {
        title: 'Covenant Fragment I',
        text:  "Arcane inscription — 'The Staff of First Covenant was not forged. It grew — from the first seed of structured arcane intention ever placed in Eldoria. The Covenant did not make it. It made the Covenant.'"
    },
    hidden_hunters_trial: {
        title: "Hunter's Mark",
        text:  "Etched on the bow — 'Every arrow loosed in righteous purpose finds its mark. Eternal Draw earns its name not through magic but through the hunter's unbroken will.'"
    },
    hidden_void_fragment: {
        title: 'Void Shard Memory',
        text:  "Fragment resonance — 'Vorgos the Stormbringer shattered the Void Gate at 0 GD. The cleaver you carry is a remnant of that cataclysm — a shard of an event the historians erased from the record entirely.'"
    },
};

class QuestManager {
    constructor() {
        this._callbacks = [];
    }

    startQuest(questId) {
        if (!QUESTS[questId]) return;
        if (playerStats.questLog[questId]) return;
        const log = { status: 'active', progress: {} };
        QUESTS[questId].steps.forEach(s => { log.progress[s.id] = 0; });
        playerStats.questLog[questId] = log;
        this._notify(questId, null, 0);
    }

    isActive(questId)    { return playerStats.questLog[questId]?.status === 'active'; }
    isCompleted(questId) { return playerStats.questLog[questId]?.status === 'completed'; }
    getStatus(questId)   { return playerStats.questLog[questId]?.status ?? 'unknown'; }

    advanceStep(questId, stepId, amount = 1) {
        const log = playerStats.questLog[questId];
        if (!log || log.status !== 'active') return;
        const step = QUESTS[questId]?.steps.find(s => s.id === stepId);
        if (!step) return;
        const current = log.progress[stepId] ?? 0;
        if (current >= step.required) return;
        log.progress[stepId] = Math.min(step.required, current + amount);
        this._notify(questId, stepId, log.progress[stepId]);
        if (log.progress[stepId] >= step.required) this._checkCompletion(questId);
    }

    _checkCompletion(questId) {
        const log = playerStats.questLog[questId];
        const quest = QUESTS[questId];
        if (!log || !quest) return;
        const allDone = quest.steps.every(s => (log.progress[s.id] ?? 0) >= s.required);
        if (allDone && log.status === 'active') {
            log.status = 'completed';
            this._giveReward(quest);
            this._notify(questId, null, -1);
        }
    }

    _giveReward(quest) {
        const r = quest.reward;
        if (!r) return;
        if (r.glint) playerStats.glint += r.glint;
        if (r.xp)    playerStats.gainXp(r.xp);
        r.items?.forEach(id => playerStats.addItem(id));

        // Resonance Insights: hidden quests give 3, main give 2, side give 1
        const insightMap = { hidden: 3, main: 2, side: 1 };
        const insights = insightMap[quest.type] ?? 1;
        playerStats.gainResonanceInsight(insights);

        // Archive of Souls — push lore memory fragment on completion
        const fragment = MEMORY_FRAGMENTS[quest.id];
        if (fragment && !playerStats.recoveredMemories.find(m => m.id === quest.id)) {
            playerStats.recoveredMemories.push({ id: quest.id, ...fragment, timestamp: Date.now() });
        }
    }

    // ── Event hooks ───────────────────────────────────────────────────────────

    onKill(enemyType, { inVeil = false, weaponType = null, isBoss = false } = {}) {
        for (const qId of Object.keys(playerStats.questLog)) {
            if (!this.isActive(qId)) continue;
            for (const step of QUESTS[qId].steps) {
                if (step.type === 'kill') {
                    if (step.target === enemyType || step.target === 'any') {
                        if (!step.bossOnly || isBoss) this.advanceStep(qId, step.id);
                    }
                }
                if (step.type === 'kill_with_veil' && inVeil) {
                    if (step.target === enemyType || step.target === 'any') this.advanceStep(qId, step.id);
                }
                if (step.type === 'kill_with_weapon' && weaponType === step.target) {
                    if (!step.bossOnly || isBoss) this.advanceStep(qId, step.id);
                }
            }
        }
    }

    onTalk(npcId) {
        for (const qId of Object.keys(playerStats.questLog)) {
            if (!this.isActive(qId)) continue;
            for (const step of QUESTS[qId].steps) {
                if (step.type === 'talk' && step.target === npcId) this.advanceStep(qId, step.id);
            }
        }
    }

    onGather(resourceId, amount = 1) {
        for (const qId of Object.keys(playerStats.questLog)) {
            if (!this.isActive(qId)) continue;
            for (const step of QUESTS[qId].steps) {
                if (step.type === 'gather' && step.target === resourceId) this.advanceStep(qId, step.id, amount);
            }
        }
    }

    onReadSign() {
        for (const qId of Object.keys(playerStats.questLog)) {
            if (!this.isActive(qId)) continue;
            for (const step of QUESTS[qId].steps) {
                if (step.type === 'read_signs') this.advanceStep(qId, step.id);
            }
        }
    }

    onAttune(gateId) {
        const attunedCount = playerStats.attunedGates.length;
        for (const qId of Object.keys(playerStats.questLog)) {
            if (!this.isActive(qId)) continue;
            for (const step of QUESTS[qId].steps) {
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
        for (const qId of Object.keys(playerStats.questLog)) {
            if (!this.isActive(qId)) continue;
            for (const step of QUESTS[qId].steps) {
                if (step.type === 'spell' && step.target === spellId) this.advanceStep(qId, step.id);
            }
        }
    }

    onResonanceReached(element, value) {
        const key = `${element}_resonance`;
        for (const qId of Object.keys(playerStats.questLog)) {
            if (!this.isActive(qId)) continue;
            for (const step of QUESTS[qId].steps) {
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

    getActiveQuests()    { return Object.entries(playerStats.questLog).filter(([,v]) => v.status === 'active').map(([id]) => QUESTS[id]).filter(Boolean); }
    getCompletedQuests() { return Object.entries(playerStats.questLog).filter(([,v]) => v.status === 'completed').map(([id]) => QUESTS[id]).filter(Boolean); }

    onQuestEvent(fn) { this._callbacks.push(fn); }
    _notify(questId, stepId, progress) { this._callbacks.forEach(fn => fn(questId, stepId, progress)); }
}

export const questManager = new QuestManager();
