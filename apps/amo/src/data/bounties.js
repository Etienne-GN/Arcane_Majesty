// Bounty boards: three seeded bounties a day per board — hunt N of a regional
// creature, bring down an elite, or bring N of a regional gathered item —
// paid by the region's level band. Each bounty is a generated, repeatable
// quest given and turned in at the board; one active bounty per board.
// Pure — tools/test_phase4_quests.mjs.
//
// Board state lives in stats.bounties[boardId] = { day, offers: [{ def, taken }], active };
// accepted defs go to stats.generatedQuests (QuestManager.questDef finds them).
import { resolveNode } from './gathering.js';
import { ITEMS } from './items.js';

export const BOUNTIES_PER_DAY = 3;
export const BOUNTY_BOARD_NAME = 'the Bounty Board';

// The local calendar day number. (Boards in play use the game day — systems/gameClock.js.)
export function realDay(now = Date.now()) {
    return Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000);
}

export function seededRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(s) {
    let h = 2166136261;
    for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return h >>> 0;
}

export const boardIdFor = mapId => `board_${mapId}`;

const creatureLabel = type => type.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

// The creatures (not passive wildlife, not bosses) and gathered items of a map.
export function regionPools(mapDef, enemyTypes) {
    const creatures = [...new Set((mapDef?.spawns?.enemies ?? []).map(e => e.type))]
        .filter(t => enemyTypes[t] && !enemyTypes[t].passive && !enemyTypes[t].isBoss);
    const items = [...new Set((mapDef?.spawns?.gatheringNodes ?? [])
        .flatMap(def => resolveNode(def).pool.filter(e => e.w).map(e => e.id)))]
        .filter(id => ITEMS[id]);
    return { creatures, items };
}

// L = the band's top level.
export function bountyReward(kind, band, n) {
    const L = band.max;
    if (kind === 'hunt')  return { xp: 15 * L + 5 * n, gold: 5 * L + 2 * n };
    if (kind === 'elite') return { xp: 40 * L, gold: 10 * L, glint: 5 * L };
    return { xp: 10 * L + 3 * n, gold: 8 * L + 3 * n };
}

const FALLBACK = { creatures: ['wolf'], items: ['wood'] };

export function generateBounties(boardId, day, pools, band, { region, place, regionId }) {
    const rng = seededRng(hashString(boardId) ^ Math.imul(day, 2654435761));
    const usable = pools.creatures.length || pools.items.length ? pools : FALLBACK;
    const kinds = !usable.creatures.length ? ['gather', 'gather', 'gather']
        : !usable.items.length ? ['hunt', 'elite', 'hunt']
        : ['hunt', 'elite', 'gather'];
    // Draw without repeats while the pool lasts.
    const left = { creatures: [...usable.creatures], items: [...usable.items] };
    const draw = key => {
        if (!left[key].length) left[key] = [...usable[key]];
        return left[key].splice(Math.floor(rng() * left[key].length), 1)[0];
    };
    return kinds.map((kind, i) => {
        const base = {
            id: `bounty_${boardId}_${day}_${i}`, type: 'bounty', kind, repeatable: true,
            giver: boardId, turnIn: boardId, giverName: BOUNTY_BOARD_NAME, turnInName: BOUNTY_BOARD_NAME, turnInPlace: place,
        };
        if (kind === 'hunt') {
            const type = draw('creatures'), n = 4 + Math.floor(rng() * 5), name = creatureLabel(type);
            return { ...base, title: `Bounty: ${name} Cull`, description: `Too many ${name} roam ${region}. Hunt ${n} of them.`,
                steps: [{ id: 'hunt', type: 'kill', target: type, ...(regionId ? { map: regionId } : {}), label: `Defeat ${name} (0/${n})`, required: n }],
                reward: bountyReward(kind, band, n) };
        }
        if (kind === 'elite') {
            return { ...base, title: 'Bounty: Elite Quarry', description: `Bring down an elite creature in ${region} — the gold-framed ones that hit harder.`,
                steps: [{ id: 'elite', type: 'kill_elite', target: 'any', ...(regionId ? { map: regionId } : {}), label: `Defeat an elite creature in ${region}`, required: 1 }],
                reward: bountyReward(kind, band, 1) };
        }
        const id = draw('items'), n = 3 + Math.floor(rng() * 4), name = ITEMS[id]?.name ?? id;
        return { ...base, title: `Bounty: ${name}`, description: `Wanted: ${n} ${name}, gathered in ${region}. Bring them to the board.`,
            steps: [{ id: 'bring', type: 'have', target: id, label: `Bring ${name}`, required: n, consume: true }],
            reward: bountyReward(kind, band, n) };
    });
}

const isActiveIn = (stats, id) => !!id && stats.questLog?.[id]?.status === 'active';

// The board for today: new offers on a new day (yesterday's other bounties are
// pruned from the save and the journal; the active one stays until it is done).
export function boardView(stats, boardId, day, pools, band, where) {
    stats.bounties ??= {};
    stats.generatedQuests ??= {};
    let st = stats.bounties[boardId];
    if (!st || st.day !== day) {
        const keep = isActiveIn(stats, st?.active) ? st.active : null;
        for (const id of Object.keys(stats.generatedQuests)) {
            if (id.startsWith(`bounty_${boardId}_`) && id !== keep) {
                delete stats.generatedQuests[id];
                delete stats.questLog?.[id];
            }
        }
        st = { day, offers: generateBounties(boardId, day, pools, band, where).map(def => ({ def, taken: false })), active: keep };
        stats.bounties[boardId] = st;
    }
    if (!isActiveIn(stats, st.active)) st.active = null;
    return st;
}

// Takes offer `index` of the board's current state. The caller starts the quest.
export function acceptBounty(stats, boardId, index) {
    const st = stats.bounties?.[boardId];
    if (!st) return { ok: false, reason: 'none' };
    if (isActiveIn(stats, st.active)) return { ok: false, reason: 'busy' };
    const offer = st.offers[index];
    if (!offer) return { ok: false, reason: 'none' };
    if (offer.taken) return { ok: false, reason: 'taken' };
    stats.generatedQuests ??= {};
    stats.generatedQuests[offer.def.id] = JSON.parse(JSON.stringify(offer.def));
    offer.taken = true;
    st.active = offer.def.id;
    return { ok: true, questId: offer.def.id };
}
