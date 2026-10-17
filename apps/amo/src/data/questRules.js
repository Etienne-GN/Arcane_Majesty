// Quest rules: the automatic turn-in step, live `have` progress, start
// conditions, hand-in costs, reward text and dialogue choices.
// Pure — tools/test_phase4_quests.mjs. QuestManager applies these to the player.
//
// Optional quest fields (existing quests use none of them):
//   giver          NPC id that offers the quest (data/npcs.js)
//   turnIn         NPC id to return to (default: the giver); adds a "Return to …" step
//   turnInName     display name for the turn-in (else the NPC table)
//   requires       [questId] that must be completed first
//   requiresFlags  [flag] that must be set in stats.flags
//   chapter        campaign chapter id the player must have reached
//   repeatable     can be started again once completed
//   offer          the giver's offer line (default: the description)
// Step type `have { target: itemId, required: qty, consume? }` counts the inventory live.
import { npcName } from './npcs.js';

export const TURN_IN_STEP = '__turn_in';

export const turnInOf = q => q?.turnIn ?? q?.giver ?? null;

const stepsMemo = new WeakMap();
export function questSteps(q) {
    if (!q) return [];
    if (stepsMemo.has(q)) return stepsMemo.get(q);
    const npc = turnInOf(q);
    const ends = q.steps.some(s => s.type === 'talk' && s.target === npc);
    const steps = !npc || ends ? q.steps : [...q.steps, {
        id: TURN_IN_STEP, type: 'talk', target: npc,
        label: `Return to ${q.turnInName ?? npcName(npc)}`, required: 1, turnIn: true,
    }];
    stepsMemo.set(q, steps);
    return steps;
}

export function stepProgress(step, log, countItem) {
    if (step.type === 'have') return Math.min(step.required, countItem(step.target));
    return log?.progress?.[step.id] ?? 0;
}

export const objectivesDone = (q, log, countItem) =>
    questSteps(q).every(s => s.turnIn || stepProgress(s, log, countItem) >= s.required);

export const isQuestDone = (q, log, countItem) =>
    questSteps(q).every(s => stepProgress(s, log, countItem) >= s.required);

export function canStart(q, { log, isCompleted, flags = {}, chapterReached = () => true }) {
    if (!q) return false;
    if (log && !(log.status === 'completed' && q.repeatable)) return false;
    if (!(q.requires ?? []).every(id => isCompleted(id))) return false;
    if (!(q.requiresFlags ?? []).every(f => flags[f])) return false;
    if (q.chapter && !chapterReached(q.chapter)) return false;
    return true;
}

export const consumeOnTurnIn = q =>
    (q?.steps ?? []).filter(s => s.type === 'have' && s.consume).map(s => ({ id: s.target, qty: s.required }));

export function rewardParts(r, { itemName = id => id, recipeName = id => id, spellName = id => id } = {}) {
    if (!r) return [];
    const parts = [];
    if (r.xp)    parts.push(`${r.xp} XP`);
    if (r.glint) parts.push(`${r.glint} Glint`);
    if (r.gold)  parts.push(`${r.gold} Gold`);
    for (const id of r.items ?? []) parts.push(itemName(id));
    if (r.recipe) parts.push(`Recipe: ${recipeName(r.recipe)}`);
    if (r.spell)  parts.push(`Spell: ${spellName(r.spell)}`);
    if (r.insight) parts.push(`${r.insight} Insight`);
    return parts;
}

// Dialogue lines can be gated on flags with `ifFlag` / `unlessFlag`.
export const visibleLines = (lines, flags = {}) =>
    (lines ?? []).filter(l => (!l.ifFlag || flags[l.ifFlag]) && (!l.unlessFlag || !flags[l.unlessFlag]));

// A picked dialogue choice: { text, setFlag?, startQuest?, next? }. Returns the next dialogue key or null.
export function applyChoice(choice, flags, startQuest) {
    if (choice.setFlag) flags[choice.setFlag] = true;
    if (choice.startQuest) startQuest(choice.startQuest);
    return choice.next ?? null;
}
