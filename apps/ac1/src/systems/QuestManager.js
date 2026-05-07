import { QUESTS } from '../data/quests.js';
import { playerStats } from './PlayerStats.js';

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
