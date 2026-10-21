// W5: what the map shows — exits, doors, rift-gates and landmarks you have seen —
// and where each active quest step points. Tile coordinates. Pure — tools/test_fog_map.mjs.
import { questSteps, stepProgress, objectivesDone } from '../data/questRules.js';
import { isExplored } from './fog.js';
import { doorLockState } from './interiors.js';

// The id a talk step targets for this NPC (same rule as GameScene's interaction code).
export const npcQuestId = npc => npc.id ?? (npc.isShop ? 'silvara' : (npc.dialogue?.replace(/_greeting$|_prolog$/, '') ?? null));

// `mapId` is only needed for charted landmarks (playerStats.charted[mapId]).
export function visibleFeatures(def, fog, stats, mapId = def.id) {
    const sp = def.spawns ?? {};
    const seen = o => isExplored(fog, o.x, o.y);
    const attuned = stats.attunedGates ?? [];
    const discovered = stats.discovered ?? {}, charted = !!stats.charted?.[mapId];
    return {
        exits: (def.portals ?? []).filter(seen).map(p => ({ x: p.x, y: p.y, label: p.label ?? p.targetMap, targetMap: p.targetMap })),
        doors: (sp.doors ?? []).filter(seen).map(d => ({ x: d.x, y: d.y, label: d.label, interior: d.interior, locked: !doorLockState(d, stats).open })),
        gates: (sp.riftGates ?? []).filter(g => seen(g) || attuned.includes(g.id))
            .map(g => ({ x: g.x, y: g.y, id: g.id, label: g.label, attuned: attuned.includes(g.id) })),
        landmarks: (sp.landmarks ?? []).filter(l => discovered[l.id] || charted)
            .map(l => ({ x: l.x, y: l.y, id: l.id, name: discovered[l.id] ? l.name : '?', discovered: !!discovered[l.id] })),
    };
}

const centre = list => ({
    x: Math.round(list.reduce((a, e) => a + e.x, 0) / list.length),
    y: Math.round(list.reduce((a, e) => a + e.y, 0) / list.length),
});

// Where one step points on this map, or null. NPCs at their spawn until W4 gives them schedules.
export function stepLocation(step, mapId, def, { attunedGates = [] } = {}) {
    if (step.where) return step.where.map === mapId ? { x: step.where.x, y: step.where.y } : null;
    if (step.map && step.map !== mapId) return null;   // a bounty's kills only count on its own map
    const sp = def.spawns ?? {};
    switch (step.type) {
        case 'talk': {
            const npc = (sp.npcs ?? []).find(n => npcQuestId(n) === step.target);
            return npc ? { x: npc.x, y: npc.y } : null;
        }
        case 'kill': {
            if (!step.target || step.target === 'any') return null;
            const here = (sp.enemies ?? []).filter(e => e.type === step.target);
            if (sp.boss?.type === step.target && Number.isFinite(sp.boss.x)) here.push(sp.boss);
            return here.length ? centre(here) : null;
        }
        case 'read_signs': {
            if (!step.target || step.target === 'any') return null;
            const sign = (sp.signs ?? []).find(s => s.id === step.target);
            return sign ? { x: sign.x, y: sign.y } : null;
        }
        case 'attune': {
            const gate = (sp.riftGates ?? []).find(g => (step.target === 'any' ? !attunedGates.includes(g.id) : g.id === step.target));
            return gate ? { x: gate.x, y: gate.y } : null;
        }
        default: return null;
    }
}

// One marker per unfinished step that points somewhere on this map. A target inside a
// building (up to two doors deep) marks that building's door instead.
export function markersFor({ active, countItem = () => 0, attunedGates = [] }, mapId, def, { getMap = null } = {}, depth = 0) {
    const out = [];
    for (const { quest, log } of active) {
        const done = objectivesDone(quest, log, countItem);
        for (const step of questSteps(quest)) {
            if (stepProgress(step, log, countItem) >= step.required) continue;
            if (step.turnIn && !done) continue;
            const at = stepLocation(step, mapId, def, { attunedGates });
            if (at) out.push({ questId: quest.id, stepId: step.id, title: quest.title, label: step.label, main: quest.type === 'main', ...at, viaDoor: false });
        }
    }
    if (getMap && depth < 2) {
        for (const door of def.spawns?.doors ?? []) {
            const inner = markersFor({ active, countItem, attunedGates }, door.interior, getMap(door.interior), { getMap }, depth + 1);
            for (const m of inner) out.push({ ...m, x: door.x, y: door.y, viaDoor: true });
        }
    }
    return out;
}
