// W4: where a townsperson is at any game minute — a pure function of the clock,
// so arriving in a district shows people where they should be. A day is a list of
// slots { from, to (hours; may wrap midnight), at, activity }. Between slots a
// person walks the route from where the last slot left them, at WALK_PX_PER_SEC.
// Wanderers pick a new spot every WANDER_EVERY minutes (absolute buckets), patrols
// end each shift at their first waypoint: no one jumps at a slot boundary.
// Pure — tools/test_townsfolk.mjs.
import { gameHour, MINUTES_PER_REAL_SECOND } from './gameClock.js';
import { createNav, pointOnRoute, pointAlong } from './pathfind.js';

export const WALK_PX_PER_SEC = 60;
export const PX_PER_MIN = WALK_PX_PER_SEC / MINUTES_PER_REAL_SECOND;
export const WANDER_EVERY = 20;
export const PATROL_SPEED = 0.75;
const TILE = 32;
const HIDDEN = new Set(['sleep', 'home']);

const cached = new WeakMap();
export function scheduleOf(r, roles) {
    if (cached.has(r)) return cached.get(r);
    const role = roles[r.role] ?? {};
    const base = r.schedule ?? (r.shift ? role.shifts?.[r.shift] : role.schedule) ?? role.shifts?.day ?? [];
    const out = base.map(s => ({ ...s, at: s.at.replace(/@(\w+)/, (_, k) => r[k] ?? `@${k}`) }));
    cached.set(r, out);
    return out;
}

const inSlot = (s, h) => (s.from <= s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to);
export function slotAt(schedule, hour) {
    const index = schedule.findIndex(s => inSlot(s, hour));
    return index < 0 ? null : { slot: schedule[index], index };
}
const durationOf = s => ((((s.to - s.from) % 24) + 24) % 24 || 24) * 60;
const startOf = (s, t) => t - ((((t - s.from * 60) % 1440) + 1440) % 1440);   // latest start ≤ t

export function makeTown(data, { getMap, walk, roles }) {
    return { id: data.id, places: data.places, residents: data.residents, roles, nav: createNav({ root: data.id, getMap, walk }), _loops: new Map() };
}

export const parseAt = at => { const m = /^(wander|patrol):(.+)$/.exec(at); return m ? { kind: m[1], name: m[2] } : { kind: 'point', name: at }; };
const mapOf = (town, place) => place.interior ?? town.id;
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

function wanderPoint(town, r, name, b) {
    const a = town.places[name], mapId = mapOf(town, a), cells = a.w * a.h, s = hash(`${r.id}:${b}`) % cells;
    for (let k = 0; k < cells; k++) {
        const i = (s + k) % cells, x = a.x + (i % a.w), y = a.y + Math.floor(i / a.w);
        if (town.nav.isWalkable(mapId, x, y)) return { mapId, x, y };
    }
    return { mapId, x: a.x, y: a.y };
}

function loopOf(town, name) {
    if (!town._loops.has(name)) {
        const pl = town.places[name], mapId = mapOf(town, pl), pts = pl.route;
        const path = [pts[0]];
        for (let i = 0; i < pts.length; i++) path.push(...town.nav.path(mapId, pts[i], pts[(i + 1) % pts.length]).path.slice(1));
        town._loops.set(name, { mapId, path, len: path.length > 1 ? pathLen(path) : 0 });
    }
    return town._loops.get(name);
}
const pathLen = path => path.reduce((a, [x, y], i) => (i ? a + Math.hypot(x - path[i - 1][0], y - path[i - 1][1]) * TILE : 0), 0);

// Where a slot's walk ends (its first spot), and where the slot leaves the person.
function slotStart(town, r, slot, startAbs) {
    const { kind, name } = parseAt(slot.at), pl = town.places[name];
    if (kind === 'wander') return wanderPoint(town, r, name, Math.floor(startAbs / WANDER_EVERY));
    if (kind === 'patrol') return { mapId: mapOf(town, pl), x: pl.route[0][0], y: pl.route[0][1] };
    return { mapId: mapOf(town, pl), x: pl.x, y: pl.y };
}
function slotEnd(town, r, slot, startAbs) {
    const { kind, name } = parseAt(slot.at);
    if (kind !== 'wander') return slotStart(town, r, slot, startAbs);
    const b0 = Math.floor(startAbs / WANDER_EVERY), bEnd = Math.floor((startAbs + durationOf(slot)) / WANDER_EVERY) - 1;
    return wanderPoint(town, r, name, bEnd > b0 ? bEnd : b0);
}

const standing = (mapId, tx, ty, facing, pose, visible, activity) =>
    ({ mapId, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2, facing, moving: false, pose, visible, activity });

export function whereAt(r, minutes, town) {
    const sched = scheduleOf(r, town.roles);
    const cur = slotAt(sched, gameHour(minutes));
    if (!cur) return null;
    const startAbs = startOf(cur.slot, minutes), endAbs = startAbs + durationOf(cur.slot);
    const prevT = startAbs - 0.5, prev = slotAt(sched, gameHour(prevT)) ?? cur;
    const origin = slotEnd(town, r, prev.slot, startOf(prev.slot, prevT));
    const dest = slotStart(town, r, cur.slot, startAbs);
    const route = town.nav.route(origin, dest);
    if (!route) return null;
    const tArr = startAbs + route.len / PX_PER_MIN;
    if (minutes < tArr) return { ...pointOnRoute(route, (minutes - startAbs) * PX_PER_MIN), moving: true, pose: 'walk', visible: true, activity: 'travel' };

    const { kind, name } = parseAt(cur.slot.at), act = cur.slot.activity;
    if (kind === 'wander') {
        const B = WANDER_EVERY, b0 = Math.floor(startAbs / B), bA = Math.floor(tArr / B), bEnd = Math.floor(endAbs / B) - 1;
        const pt = b => wanderPoint(town, r, name, b), b = Math.min(Math.floor(minutes / B), bEnd);
        if (b <= bA) { const p = pt(b0); return standing(p.mapId, p.x, p.y, 'down', 'idle', true, act); }
        const from = b === bA + 1 ? pt(b0) : pt(b - 1), to = pt(b);
        const leg = town.nav.route(from, to), d = (minutes - b * B) * PX_PER_MIN;
        if (d >= leg.len) return standing(to.mapId, to.x, to.y, pointOnRoute(leg, leg.len).facing, 'idle', true, act);
        return { ...pointOnRoute(leg, d), moving: true, pose: 'walk', visible: true, activity: act };
    }
    if (kind === 'patrol') {
        const loop = loopOf(town, name), v = PX_PER_MIN * PATROL_SPEED;
        const loops = loop.len ? Math.floor((endAbs - tArr) * v / loop.len) : 0, stop = tArr + loops * loop.len / v;
        if (minutes < stop) return { mapId: loop.mapId, ...pointAlong(loop.path, ((minutes - tArr) * v) % loop.len), moving: true, pose: 'walk', visible: true, activity: act };
        return standing(loop.mapId, loop.path[0][0], loop.path[0][1], 'down', 'idle', true, act);
    }
    const pl = town.places[name];
    const hidden = !!pl.indoors || (HIDDEN.has(act) && !pl.outdoors);
    const pose = act === 'sit' || (act === 'sleep' && pl.outdoors) ? 'sit' : 'idle';
    return standing(mapOf(town, pl), pl.x, pl.y, pl.facing ?? 'down', pose, !hidden, act);
}

export function namedPeople(town, minutes) {
    const out = [];
    for (const r of town.residents) {
        if (!r.npc) continue;
        const p = whereAt(r, minutes, town);
        if (p) out.push({ npcId: r.npc.id, mapId: p.mapId, x: Math.floor(p.x / TILE), y: Math.floor(p.y / TILE) });
    }
    return out;
}

const hhmm = h => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
export function validateTown(town, { looks = null } = {}) {
    const out = [], nav = town.nav;
    for (const r of town.residents) {
        if (looks && !looks.includes(r.look)) out.push(`${r.id}: unknown look "${r.look}"`);
        const sched = scheduleOf(r, town.roles);
        for (let h = 0; h < 24; h += 0.5) if (!slotAt(sched, h)) { out.push(`${r.id}: no slot at ${hhmm(h)}`); break; }
        let placesOk = true;
        for (const s of sched) {
            const { kind, name } = parseAt(s.at), pl = town.places[name];
            if (!pl) { out.push(`${r.id}: unknown place "${name}"`); placesOk = false; continue; }
            const mapId = mapOf(town, pl);
            if (!nav.has(mapId)) { out.push(`${r.id}: place "${name}" is on "${mapId}", outside the town`); placesOk = false; continue; }
            if (kind === 'point' && !nav.isWalkable(mapId, pl.x, pl.y)) { out.push(`${r.id}: place "${name}" is not walkable`); placesOk = false; }
            if (kind === 'patrol' && !pl.route?.every(([x, y]) => nav.isWalkable(mapId, x, y))) { out.push(`${r.id}: patrol "${name}" has a blocked waypoint`); placesOk = false; }
            if (kind === 'wander') {
                if ((pl.w + pl.h) * TILE * 1.5 > WANDER_EVERY * PX_PER_MIN) out.push(`${r.id}: area "${name}" is too big to cross between moves`);
                let any = false;
                for (let y = pl.y; y < pl.y + pl.h && !any; y++) for (let x = pl.x; x < pl.x + pl.w; x++) if (nav.isWalkable(mapId, x, y)) { any = true; break; }
                if (!any) { out.push(`${r.id}: area "${name}" has no walkable tile`); placesOk = false; }
            }
        }
        if (!placesOk) continue;
        // Every walk between slots is a real path and fits its slot (with room to wander after).
        sched.forEach((s, i) => {
            const startAbs = 1440 + s.from * 60, prevT = startAbs - 0.5, prev = slotAt(sched, gameHour(prevT));
            if (!prev) return;
            const route = nav.route(slotEnd(town, r, prev.slot, startOf(prev.slot, prevT)), slotStart(town, r, s, startAbs));
            if (!route || route.fallback) { out.push(`${r.id}: no path to slot ${i} (${s.at})`); return; }
            const spare = parseAt(s.at).kind === 'wander' ? 2 * WANDER_EVERY : 0;
            if (route.len / PX_PER_MIN > durationOf(s) - spare) out.push(`${r.id}: the walk to slot ${i} (${s.at}) takes longer than the slot`);
        });
    }
    return out;
}
