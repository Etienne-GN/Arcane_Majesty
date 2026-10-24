// W4 townsfolk: walk grids, routes, schedules, barks, looks, Thaloria's people, crowds, markers.
// Run: node tools/test_townsfolk.mjs
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

const W = await import('../src/systems/walkGrid.js');
const P = await import('../src/systems/pathfind.js');

// Fixture maps: a 20×10 town, an inn behind a door, a cellar under the inn.
const grid = (w, h, fill = 0) => Array.from({ length: h }, () => Array(w).fill(fill));
const room = (w, h) => { const t = grid(w, h); for (let x = 0; x < w; x++) { t[0][x] = 1; t[h - 1][x] = 1; } for (let y = 0; y < h; y++) { t[y][0] = 1; t[y][w - 1] = 1; } return t; };
const FX = {
    ft:        { id: 'ft', tiles: grid(20, 10), spawns: { doors: [{ x: 10, y: 2, interior: 'ft_inn' }] } },
    ft_inn:    { id: 'ft_inn', interior: true, tiles: room(8, 6), playerStart: { x: 4, y: 4 }, spawns: { doors: [{ x: 6, y: 3, interior: 'ft_cellar', facing: 'down' }] } },
    ft_cellar: { id: 'ft_cellar', interior: true, tiles: room(5, 5), playerStart: { x: 2, y: 3 }, spawns: {} },
};
const fxMap = id => FX[id] ?? FX.ft;   // like getMap: an unknown id falls back to some map

// ---- Blocked tiles
{
    const cat = { gridTileWidth: 32, gridTileHeight: 32, entries: [
        { name: 'box', kind: 'object', w: 32, h: 64, hitbox: { x: 0, y: 32, w: 32, h: 32 }, layer: 'sorted' },
        { name: 'flower', kind: 'object', w: 32, h: 32, hitbox: null, layer: 'under' },
    ] };
    const small = { gridTileWidth: 16, gridTileHeight: 16, entries: [{ name: 'stone', kind: 'object', w: 16, h: 16, hitbox: { x: 0, y: 0, w: 16, h: 16 }, layer: 'sorted' }] };
    const catalogueOf = p => (p === W.DECORATION_SOURCES[0].cat ? cat : p === 'fake/small.json' ? small : null);
    const tiles = grid(4, 4); tiles[0][0] = 1;
    const def = {
        tiles,
        [W.DECORATION_SOURCES[0].field]: [{ name: 'box', x: 1, y: 1 }, { name: 'box', x: 3, y: 3, blocking: false }, { name: 'flower', x: 2, y: 0 }],
        extraSheets: [{ texKey: 'sm', catKey: 'sm_cat', png: 'x.png', cat: 'fake/small.json' }],
        sheetDecorations: [{ texKey: 'sm', catKey: 'sm_cat', scale: 2, items: [{ name: 'stone', x: 2, y: 2 }] }],
        spawns: { signs: [{ x: 0, y: 3 }] },
    };
    const b = W.blockedTiles(def, catalogueOf);
    const cells = []; b.forEach((v, i) => { if (v) cells.push([i % 4, Math.floor(i / 4)]); });
    eq(cells, [[0, 0], [1, 2], [2, 2], [0, 3]], 'tree tile, the box\'s hitbox row, the scaled stone, the sign — not the opted-out box or the flower');
    ok(W.DECORATION_SOURCES.every(s => { try { readFileSync(new URL(`../public/${s.cat}`, import.meta.url)); return true; } catch { return false; } }), 'every boot sheet\'s catalogue exists');
}

// ---- A* and path geometry
{
    const open = (w, h) => new Uint8Array(w * h).fill(1);
    const m = open(5, 5);
    eq(P.findPath(m, 5, 5, [0, 0], [4, 4]), [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]], 'open ground: the diagonal');
    eq(P.findPath(m, 5, 5, [2, 2], [2, 2]), [[2, 2]], 'already there');
    ok(Math.abs(P.pathPx([[0, 0], [1, 0], [2, 1]]) - (32 + 32 * Math.SQRT2)) < 1e-9, 'path length in px');

    const wall = open(5, 3); wall[0 * 5 + 2] = 0; wall[1 * 5 + 2] = 0;
    const p = P.findPath(wall, 5, 3, [0, 0], [4, 0]);
    ok(p && p.every(([x, y]) => wall[y * 5 + x] === 1) && p.some(([, y]) => y === 2), 'around a wall, never through it');
    const corner = open(2, 2); corner[1] = 0; corner[2] = 0;
    eq(P.findPath(corner, 2, 2, [0, 0], [1, 1]), null, 'no squeezing between two diagonal blocks');
    const cut = open(3, 3); cut[1] = cut[4] = cut[7] = 0;
    eq(P.findPath(cut, 3, 3, [0, 0], [2, 0]), null, 'unreachable: null');
    eq(P.findPath(cut, 3, 3, [1, 1], [2, 0]), null, 'blocked start: null');
    const road = P.findPath(open(5, 3), 5, 3, [0, 1], [4, 1], (x, y) => (y === 2 ? 1 : 5));
    ok(road.some(([, y]) => y === 2), 'a cheaper road pulls the path onto it');

    eq(P.pointAlong([[0, 0], [2, 0]], 0), { x: 16, y: 16, facing: 'right' }, 'start of a path, facing along it');
    eq(P.pointAlong([[0, 0], [2, 0]], 32), { x: 48, y: 16, facing: 'right' }, 'one tile along');
    eq(P.pointAlong([[0, 0], [0, 2]], 999), { x: 16, y: 80, facing: 'down' }, 'past the end: the last tile');
    eq(P.pointAlong([[3, 3]], 10), { x: 112, y: 112, facing: 'down' }, 'a one-tile path');
}

// ---- Map tree and routes across doors
{
    eq(P.mapTree('ft', fxMap).map(n => [n.id, n.parent]), [['ft', null], ['ft_inn', 'ft'], ['ft_cellar', 'ft_inn']], 'town → inn → cellar');
    const nav = P.createNav({ root: 'ft', getMap: fxMap, walk: {} });
    ok(nav.has('ft_cellar') && !nav.has('elsewhere'), 'nav knows the tree, nothing else');
    ok(!nav.isWalkable('ft_inn', 0, 0) && nav.isWalkable('ft_inn', 1, 1), 'walls are not walkable');

    const down = nav.route({ mapId: 'ft', x: 0, y: 9 }, { mapId: 'ft_cellar', x: 2, y: 2 });
    eq(down.legs.map(l => l.mapId), ['ft', 'ft_inn', 'ft_cellar'], 'into the cellar: town, inn, cellar');
    eq(down.legs.map(l => [l.path[0], l.path.at(-1)]), [[[0, 9], [10, 3]], [[4, 4], [6, 2]], [[2, 3], [2, 2]]],
        'walk to the door front, appear at the entry, walk to the hatch front, appear below');
    ok(!down.fallback && Math.abs(down.len - down.legs.reduce((a, l) => a + l.len, 0)) < 1e-9, 'a real route; its length is the legs\' sum');
    const up = nav.route({ mapId: 'ft_cellar', x: 2, y: 2 }, { mapId: 'ft', x: 0, y: 9 });
    eq(up.legs.map(l => [l.mapId, l.path[0], l.path.at(-1)]),
        [['ft_cellar', [2, 2], [2, 3]], ['ft_inn', [6, 2], [4, 4]], ['ft', [10, 3], [0, 9]]], 'and back out the same way');
    eq(nav.route({ mapId: 'ft', x: 1, y: 1 }, { mapId: 'nowhere', x: 0, y: 0 }), null, 'a map outside the town: no route');
    const st = P.pointOnRoute(down, 0);
    ok(st.mapId === 'ft' && st.x === 16 && st.y === 9 * 32 + 16 && ['right', 'up'].includes(st.facing), 'route start, facing along its first (diagonal) step');
    eq(P.pointOnRoute(down, down.len + 50).mapId, 'ft_cellar', 'past the end: in the last map');
    const n0 = nav.cacheSize(); nav.route({ mapId: 'ft', x: 0, y: 9 }, { mapId: 'ft_cellar', x: 2, y: 2 });
    eq(nav.cacheSize(), n0, 'the same route again comes from the cache');
}

// ---- The baked walk grids are up to date
{
    const { getMap } = await import('../src/data/maps/index.js');
    const { WALK } = await import('../src/data/townsfolk/walk.js');
    const cats = new Map();
    const catalogueOf = p => { if (!cats.has(p)) { try { cats.set(p, JSON.parse(readFileSync(new URL(`../public/${p}`, import.meta.url)))); } catch { cats.set(p, null); } } return cats.get(p); };
    eq(W.computeWalk(getMap, catalogueOf), WALK, 'src/data/townsfolk/walk.js is current (run: node tools/gen_walk_grids.mjs)');
    const nav = P.createNav({ root: 'thaloria', getMap, walk: WALK });
    ok(nav.has('thaloria_inn') && nav.has('thaloria_inn_cellar') && nav.has('thaloria_bell_tower'), 'Thaloria\'s interiors are in its tree');
    const r = nav.route({ mapId: 'thaloria', x: 2, y: 12 }, { mapId: 'thaloria_inn', x: 9, y: 9 });
    ok(r && !r.fallback && r.legs.length === 2, 'from the west road into the inn, on real paths');
    ok(r.legs[0].path.every(([x, y]) => nav.isWalkable('thaloria', x, y)), 'every tile of it is walkable');
}

// ---- Schedules
const S = await import('../src/systems/schedules.js');
const { ROLES } = await import('../src/data/townsfolk/roles.js');
const FT_TOWN = {
    id: 'ft',
    places: {
        home:   { x: 2, y: 5, indoors: true },
        stall:  { x: 15, y: 7, facing: 'down' },
        seat:   { interior: 'ft_inn', x: 2, y: 2, facing: 'down' },
        corner: { x: 18, y: 1, facing: 'left', outdoors: true },
        sq:     { x: 5, y: 5, w: 6, h: 3 },
        loop:   { route: [[1, 8], [18, 8]] },
        bed:    { interior: 'ft_cellar', x: 2, y: 2 },
    },
    residents: [
        { id: 'm1', role: 'merchant', look: 'look_00', home: 'home', work: 'stall', evening: 'seat' },
        { id: 'k1', role: 'child', look: 'look_18', home: 'home', wander: 'sq' },
        { id: 'g1', role: 'guard', shift: 'day', look: 'look_21', home: 'home', patrol: 'loop' },
        { id: 'b1', role: 'beggar', look: 'look_01', work: 'corner' },
        { id: 'n1', role: 'merchant', look: 'look_02', npc: { id: 'oren', name: 'X' },
          schedule: [{ from: 6, to: 22, at: 'stall', activity: 'work' }, { from: 22, to: 6, at: 'bed', activity: 'sleep' }] },
    ],
};
const fxTown = S.makeTown(FT_TOWN, { getMap: fxMap, walk: {}, roles: ROLES });
const R = id => fxTown.residents.find(r => r.id === id);
const D = 1440;   // day 1, midnight
const px = t => t * 32 + 16;
{
    eq(S.WALK_PX_PER_SEC, 60, 'walking pace from the spec');
    eq(S.scheduleOf(R('m1'), ROLES).map(s => s.at), ['home', 'stall', 'seat'], 'a role\'s day with the resident\'s own places');
    eq(S.scheduleOf(R('k1'), ROLES).find(s => s.activity === 'wander').at, 'wander:sq', 'wander:@wander becomes the resident\'s area');
    eq(S.scheduleOf(R('g1'), ROLES)[0].at, 'patrol:loop', 'a guard\'s shift picks its schedule');
    eq(S.slotAt(S.scheduleOf(R('m1'), ROLES), 3).slot.activity, 'sleep', '03:00: asleep');
    eq(S.slotAt(S.scheduleOf(R('m1'), ROLES), 8).slot.activity, 'work', '08:00 sharp: work');
    eq(S.slotAt(S.scheduleOf(R('m1'), ROLES), 23.9).slot.activity, 'sit', '23:54: still in the inn');
    eq(S.slotAt(S.scheduleOf(R('k1'), ROLES), 2).slot.activity, 'sleep', 'a slot wrapping midnight (20→7) covers 02:00');
    eq(S.slotAt([{ from: 8, to: 9, at: 'x', activity: 'work' }], 12), null, 'no slot: null');

    const night = S.whereAt(R('m1'), D + 3 * 60, fxTown);
    eq([night.mapId, night.x, night.y, night.visible, night.moving], ['ft', px(2), px(5), false, false], '03:00: home, out of sight');
    const leaving = S.whereAt(R('m1'), D + 8 * 60, fxTown);
    eq([leaving.x, leaving.y, leaving.moving, leaving.pose, leaving.visible], [px(2), px(5), true, 'walk', true], '08:00: steps out of the door');
    const work = S.whereAt(R('m1'), D + 9 * 60, fxTown);
    eq([work.mapId, work.x, work.y, work.pose, work.facing, work.activity, work.visible], ['ft', px(15), px(7), 'idle', 'down', 'work', true], '09:00: at the stall');
    ok(S.whereAt(R('m1'), D + 18 * 60 + 0.2, fxTown).moving, '18:00: on the way to the inn');
    const inn = S.whereAt(R('m1'), D + 20 * 60, fxTown);
    eq([inn.mapId, inn.x, inn.y, inn.pose], ['ft_inn', px(2), px(2), 'sit'], '20:00: sitting in the inn');
    eq(S.whereAt(R('m1'), D + 9 * 60 + 7, fxTown), S.whereAt(R('m1'), D + 9 * 60 + 7, fxTown), 'the same minute, the same answer');

    const kid = S.whereAt(R('k1'), D + 9 * 60 + 30, fxTown), ktx = Math.floor(kid.x / 32), kty = Math.floor(kid.y / 32);
    ok(kid.visible && ktx >= 5 && ktx < 11 && kty >= 5 && kty < 8, '09:30: the child is somewhere in the square');
    ok(!S.whereAt(R('k1'), D + 21 * 60, fxTown).visible, '21:00: the child is in bed');
    const spots = new Set(); for (let t = 0; t < 120; t += 20) { const p = S.whereAt(R('k1'), D + 9 * 60 + t + 19, fxTown); spots.add(`${p.x},${p.y}`); }
    ok(spots.size >= 2, 'a wanderer moves between spots');

    const guard = S.whereAt(R('g1'), D + 10 * 60, fxTown);
    ok(guard.visible && guard.moving && guard.pose === 'walk' && guard.y === px(8), '10:00: the guard walks the patrol row');
    ok(!S.whereAt(R('g1'), D + 3 * 60, fxTown).visible, '03:00: the day guard sleeps');
    const beg = S.whereAt(R('b1'), D + 3 * 60, fxTown);
    eq([beg.visible, beg.pose, beg.x, beg.y], [true, 'sit', px(18), px(1)], 'the beggar sleeps sitting in their corner');
    const n1 = S.whereAt(R('n1'), D + 23 * 60, fxTown);
    eq([n1.mapId, n1.visible], ['ft_cellar', false], 'asleep in an interior: there, but out of sight');

    // No one ever jumps: between two samples a quarter-minute apart, on the same map,
    // a person moves at most a quarter-minute's walk.
    for (const r of fxTown.residents) {
        let prev = S.whereAt(r, D, fxTown);
        for (let t = D + 0.25; t <= D + 2880; t += 0.25) {
            const p = S.whereAt(r, t, fxTown);
            if (p.mapId === prev.mapId) assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) <= S.PX_PER_MIN * 0.25 + 0.01, `${r.id} jumps at minute ${t - D} (${prev.x},${prev.y} → ${p.x},${p.y})`);
            prev = p;
        }
        n++;
    }

    eq(S.namedPeople(fxTown, D + 10 * 60), [{ npcId: 'oren', mapId: 'ft', x: 15, y: 7 }], 'named people, in tiles');
    eq(S.validateTown(fxTown, { looks: ['look_00', 'look_01', 'look_02', 'look_18', 'look_21'] }), [], 'the fixture town is sound');
    const broken = S.makeTown({ ...FT_TOWN, residents: [
        { id: 'gap', role: 'merchant', look: 'look_00', schedule: [{ from: 8, to: 18, at: 'stall', activity: 'work' }] },
        { id: 'lost', role: 'merchant', look: 'look_00', home: 'nowhere', work: 'stall', evening: 'seat' },
        { id: 'wall', role: 'merchant', look: 'look_99', schedule: [{ from: 0, to: 24, at: 'inwall', activity: 'work' }] },
    ], places: { ...FT_TOWN.places, inwall: { interior: 'ft_inn', x: 0, y: 0 } } }, { getMap: fxMap, walk: {}, roles: ROLES });
    const probs = S.validateTown(broken, { looks: ['look_00'] }).join('\n');
    ok(/gap: no slot at 00:00/.test(probs), 'a gap in the day is reported');
    ok(/lost: unknown place "nowhere"/.test(probs), 'an unknown place is reported');
    ok(/wall: place "inwall" is not walkable/.test(probs), 'a place inside a wall is reported');
    ok(/wall: unknown look "look_99"/.test(probs), 'an unknown look is reported');
}

// ---- Barks
{
    const B = await import('../src/systems/barks.js');
    const { BARKS } = await import('../src/data/townsfolk/barks.js');
    const pools = {
        guard: [{ text: 'night', hours: [21, 5] }, { text: 'rain', weather: ['rain', 'storm'] }, { text: 'plain' }],
        anyone: [{ text: 'flagged', flag: 'met_oren' }, { text: 'not yet', notFlag: 'met_oren' }],
    };
    const all = (role, ctx) => { const seen = new Set(); for (let i = 0; i < 200; i++) { let k = i; seen.add(B.pickBark(role, ctx, () => ((k = (k * 9301 + 49297) % 233280) / 233280), pools)); } return [...seen].sort(); };
    eq(all('guard', { hour: 23, weather: 'clear', flags: {} }), ['night', 'not yet', 'plain'], 'at night, a clear sky, before meeting Oren');
    eq(all('guard', { hour: 12, weather: 'rain', flags: { met_oren: true } }), ['flagged', 'plain', 'rain'], 'by day in the rain, after meeting Oren');
    eq(B.pickBark('nobody', { hour: 12, weather: 'clear', flags: { met_oren: true } }, () => 0, pools), 'flagged', 'an unknown role still has the shared lines');
    eq(B.pickBark('nobody', { hour: 12, weather: 'clear', flags: {} }, () => 0, { anyone: [] }), null, 'nothing fits: null');
    let fit = 0, plain = 0;
    for (let i = 0; i < 1000; i++) { const t = B.pickBark('guard', { hour: 23, weather: 'clear', flags: { met_oren: true } }, () => i / 1000, pools); if (t === 'night') fit++; if (t === 'plain') plain++; }
    ok(fit > plain * 2, 'a line that fits the moment is likelier than a plain one');
    for (const role of ['guard', 'merchant', 'labourer', 'child', 'priest', 'noble', 'beggar', 'drunk', 'anyone']) ok(BARKS[role]?.length >= 3, `${role} has lines`);
    ok(Object.values(BARKS).flat().every(l => !/\b(song|album|verse|chorus|lyric)/i.test(l.text)), 'no line mentions songs or albums');
}

// ---- Looks
{
    const L = await import('../src/systems/townsfolkLooks.js');
    const { LOOKS } = await import('../src/data/townsfolk/looks.js');
    eq(L.LOOK_SIZE, { w: 576, h: 768 }, 'look sheet size');
    eq(L.lookFrames('walk', 'up'), [1, 2, 3, 4, 5, 6, 7, 8], 'walk up skips the standing column');
    eq(L.lookFrames('idle', 'down'), [6 * 9, 6 * 9 + 1], 'idle down: row 6');
    eq(L.lookFrames('sit', 'right').length, 3, 'three sit poses');
    ok(L.SIT_FRAME >= 0 && L.SIT_FRAME < 3, 'the held sit pose is one of them');
    eq(LOOKS.length, 24, '24 baked looks');
    eq(LOOKS.map(l => l.group).filter(g => g === 'child').length, 3, 'three children');
    eq(LOOKS.map(l => l.group).filter(g => g === 'guard').length, 3, 'three guards');
    for (const l of LOOKS) {
        const png = readFileSync(new URL(`../public/${l.file}`, import.meta.url));
        eq([png.readUInt32BE(16), png.readUInt32BE(20)], [576, 768], `${l.id} is a 576×768 sheet`);
    }
    ok(readFileSync(new URL('../public/assets/characters/townsfolk/CREDITS.md', import.meta.url), 'utf8').length > 200, 'the looks are credited');
}

// ---- Thaloria's people
{
    const TF = await import('../src/data/townsfolk/index.js');
    const { LOOKS } = await import('../src/data/townsfolk/looks.js');
    const { NPCS } = await import('../src/data/npcs.js');
    const { getMap } = await import('../src/data/maps/index.js');
    const town = TF.getTown('thaloria');
    ok(TF.TOWN_IDS.every(id => W.WALK_ROOTS.includes(id)), 'every town has baked walk grids');
    eq(S.validateTown(town, { looks: LOOKS.map(l => l.id) }), [], 'Thaloria\'s people all have a place, a path and a look');
    ok(town.residents.length >= 20, 'twenty-odd people');
    eq(new Set(town.residents.map(r => r.id)).size, town.residents.length, 'resident ids are unique');
    eq(TF.townFor('thaloria_inn_cellar'), town, 'the inn\'s cellar belongs to Thaloria');
    eq(TF.townFor('east_road'), null, 'the East Road has no town');
    const named = town.residents.filter(r => r.npc).map(r => r.npc.id).sort();
    eq(named, ['innkeeper', 'thaloria_cartographer', 'thaloria_merchant', 'thaloria_trader'], 'the four named people live here');
    ok(named.every(id => NPCS[id]), 'and are in the NPC table');
    ok(!(getMap('thaloria').spawns.npcs ?? []).some(n => named.includes(n.id)), 'they no longer stand as fixed spawns');

    for (const r of town.residents) {
        let prev = S.whereAt(r, D, town);
        for (let t = D + 0.25; t <= D + 2880; t += 0.25) {
            const p = S.whereAt(r, t, town);
            if (p.mapId === prev.mapId) assert.ok(Math.hypot(p.x - prev.x, p.y - prev.y) <= S.PX_PER_MIN * 0.25 + 0.01, `${r.id} jumps at minute ${t - D}`);
            prev = p;
        }
        n++;
    }

    // Spec acceptance, on paper
    const at = h => town.residents.map(r => S.whereAt(r, D + h * 60, town)).filter(p => p.visible);
    const tile = p => [Math.floor(p.x / 32), Math.floor(p.y / 32)];
    const market = at(9).filter(p => p.mapId === 'thaloria' && (([x, y]) => x >= 9 && x < 23 && y >= 10 && y < 25)(tile(p)));
    ok(market.length >= 8, `09:00: the market and square are busy (${market.length})`);
    const late = at(23);
    ok(late.filter(p => p.mapId === 'thaloria').length <= 4, `23:00: the streets are nearly empty (${late.filter(p => p.mapId === 'thaloria').length})`);
    ok(late.filter(p => p.mapId === 'thaloria_inn').length >= 8, `23:00: the inn is full (${late.filter(p => p.mapId === 'thaloria_inn').length})`);

    // Following one person through a day: home → work → inn → home
    const who = town.residents.find(r => r.id === 'stallholder_a'), seq = [];
    for (let t = D + 60; t <= D + 1440 + 120; t += 5) {
        const a = S.whereAt(who, t, town).activity;
        if (seq.at(-1) !== a) seq.push(a);
    }
    eq(seq, ['sleep', 'travel', 'work', 'travel', 'sit', 'travel', 'sleep'], 'a stallholder\'s day');

    const people = TF.namedPeopleAt(D + 10 * 60);
    ok(people.some(p => p.npcId === 'innkeeper' && p.mapId === 'thaloria_inn'), '10:00: the Innkeeper is in the inn');
    ok(people.some(p => p.npcId === 'thaloria_trader' && p.mapId === 'thaloria'), '10:00: the Trader is outside');
}

console.log(`test_townsfolk: ${n} checks passed`);
