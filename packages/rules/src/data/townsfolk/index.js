// W4: the towns (one per region with people). A town's nav is built on first use.
// townFor(mapId) finds the town a map belongs to — the town map itself or any
// interior behind its doors.
import { getMap } from '../maps/index.js';
import { makeTown, namedPeople } from '../../systems/schedules.js';
import { WALK } from './walk.js';
import { ROLES } from './roles.js';
import { THALORIA_TOWN } from './thaloria.js';

const DATA = { thaloria: THALORIA_TOWN };
export const TOWN_IDS = Object.keys(DATA);
const built = new Map();

export function getTown(id) {
    if (!DATA[id]) return null;
    if (!built.has(id)) built.set(id, makeTown(DATA[id], { getMap, walk: WALK, roles: ROLES }));
    return built.get(id);
}

export function townFor(mapId) {
    for (const id of TOWN_IDS) { const t = getTown(id); if (t.nav.has(mapId)) return t; }
    return null;
}

export const namedPeopleAt = minutes => TOWN_IDS.flatMap(id => namedPeople(getTown(id), minutes));
