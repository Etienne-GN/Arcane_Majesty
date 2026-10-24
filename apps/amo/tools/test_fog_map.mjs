// W5 map and exploration: fog, map painting, markers, world layout, charts.
// Run: node tools/test_fog_map.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const F = await import('../src/systems/fog.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- Fog
{
    eq([F.FOG_CELL, F.REVEAL_RADIUS, F.DENSE_REVEAL_RADIUS], [4, 6, 4], 'cell size and radii from the spec');
    const fog = F.createFog(10, 9);
    eq([fog.cw, fog.ch], [3, 3], 'cells round up (10×9 tiles → 3×3 cells)');
    ok(!F.isExplored(fog, 0, 0), 'fresh fog: nothing explored');
    ok(F.isExplored(null, 5, 5), 'no fog (interiors): everything known');
    eq(F.revealAround(fog, 1.5, 1.5, 3), [[0, 0], [1, 0], [0, 1]], 'radius 3 reaches the cells whose nearest point is within 3 tiles');
    eq(F.revealAround(fog, 1.5, 1.5, 3), [], 'revealing again reveals nothing new');
    ok(F.isExplored(fog, 5, 1) && !F.isExplored(fog, 5, 5), 'cell (1,0) known, cell (1,1) still dark');
    eq(F.revealAround(fog, -10, -10, 3), [], 'outside the map: nothing, no throw');
    eq(F.revealAround(fog, 9.9, 8.9, 1), [[2, 1], [2, 2]], 'the far corner clips to the grid');
    eq(F.revealAround(null, 1, 1, 6), [], 'null fog reveals nothing');
    ok(!F.isExplored(fog, -1, 0) && !F.isExplored(fog, 0, 99), 'outside the grid is unexplored');

    const back = F.decodeFog(F.encodeFog(fog), 10, 9);
    eq([...back.bits], [...fog.bits], 'encode → decode round trip');
    eq([...F.decodeFog(F.encodeFog(fog), 40, 40).bits].some(b => b), false, 'a fog saved for another map size loads blank');
    eq([...F.decodeFog('not base64!!', 10, 9).bits].some(b => b), false, 'garbage loads blank');
    eq([...F.decodeFog(undefined, 10, 9).bits].some(b => b), false, 'missing loads blank');

    const s = new PlayerStats();
    s.explored.field = F.encodeFog(fog);
    const def = { tiles: Array.from({ length: 9 }, () => new Array(10).fill(0)) };
    ok(F.isExplored(F.fogFor(def, 'field', s), 5, 1), 'fogFor reads the saved fog of that map');
    ok(!F.isExplored(F.fogFor(def, 'other', s), 5, 1), 'another map starts dark');
    eq(F.fogFor({ ...def, interior: true }, 'room', s), null, 'interiors have no fog');
    eq(F.fogFor({ mapCols: 60, mapRows: 60 }, 'samplemap', s), null, 'a map without a tile grid has no fog');
}

// ---- Landmarks
{
    const lm = [{ id: 'oak', name: 'Old Oak', x: 10, y: 10, radius: 3, xp: 10 }, { id: 'well', name: 'Well', x: 30, y: 30 }];
    eq(F.newlyDiscovered(lm, 10.5, 13.4, {}).map(l => l.id), ['oak'], 'inside the radius (2.9 tiles from the centre)');
    eq(F.newlyDiscovered(lm, 10.5, 14, {}), [], 'outside it (3.5)');
    eq(F.newlyDiscovered(lm, 10.5, 10.5, { oak: true }), [], 'only the first time');
    eq(F.newlyDiscovered(lm, 30.5, 32.9, {}).map(l => l.id), ['well'], 'radius defaults to 3');
}

// ---- Save fields
{
    const s = new PlayerStats();
    eq([s.explored, s.charted, s.discovered], [{}, {}, {}], 'a new character knows nothing');
    s.explored.thaloria = 'AAA=';
    s.charted.thaloria = true;
    s.discovered.bell = true;
    SaveManager.save(s, 'st_fog', 'c1');
    const back = new PlayerStats();
    SaveManager.load(back, 'st_fog', 'c1');
    eq([back.explored, back.charted, back.discovered], [{ thaloria: 'AAA=' }, { thaloria: true }, { bell: true }], 'all three survive a save');
    ok(back.explored !== s.explored, 'copied, not shared');

    const key = [...store.keys()].find(k => k.includes('st_fog'));
    const raw = JSON.parse(store.get(key));
    delete raw.explored; delete raw.charted; delete raw.discovered;
    store.set(key, JSON.stringify(raw));
    const old = new PlayerStats();
    SaveManager.load(old, 'st_fog', 'c1');
    eq([old.explored, old.charted, old.discovered], [{}, {}, {}], 'an old save loads with empty fields');

    raw.explored = { a: 'AAA=', b: 42, c: null };
    raw.charted = { a: true, b: 'yes' };
    raw.discovered = 'nonsense';
    store.set(key, JSON.stringify(raw));
    const bad = new PlayerStats();
    SaveManager.load(bad, 'st_fog', 'c1');
    eq([bad.explored, bad.charted, bad.discovered], [{ a: 'AAA=' }, { a: true }, {}], 'damaged entries are dropped');

    s.reset();
    eq([s.explored, s.charted, s.discovered], [{}, {}, {}], 'reset empties them');
}

// ---- Map painting
{
    const P = await import('../src/systems/mapPaint.js');
    const { encodeBits, decodeBitsToMask } = await import('../src/systems/regionFormat.js');
    eq([...decodeBitsToMask(encodeBits([[1, 0], [2, 1]], 3, 2), 3, 2)], [0, 1, 0, 0, 0, 1], 'bitset → one byte per cell');

    const rgb = (img, x, y) => { const i = (y * img.w + x) * 4; return (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]; };
    const alpha = (img, x, y) => img.data[(y * img.w + x) * 4 + 3];
    const def = { tiles: [[0, 1, 2, 3, 9, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], [4, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]] };

    const known = P.paintMap(def, null);
    eq([known.w, known.h, known.data.length], [8, 4, 8 * 4 * 4], 'one RGBA pixel per tile');
    eq([rgb(known, 0, 0), rgb(known, 1, 0), rgb(known, 2, 0), rgb(known, 3, 0), rgb(known, 0, 2)],
       [P.TERRAIN[0], P.TERRAIN[1], P.TERRAIN[2], P.TERRAIN[3], P.TERRAIN[4]], 'terrain colours by tile value');
    eq(rgb(known, 4, 0), P.TERRAIN[0], 'an unknown tile value paints as grass');
    eq(alpha(known, 4, 0), 255, 'opaque');

    const fog = F.createFog(8, 4);
    const dark = P.paintMap(def, fog);
    ok([...Array(32).keys()].every(i => rgb(dark, i % 8, Math.floor(i / 8)) === P.UNKNOWN), 'fresh fog paints everything black');
    const charted = P.paintMap(def, fog, { charted: true });
    eq([rgb(charted, 2, 0), rgb(charted, 3, 0), rgb(charted, 1, 0)], [P.CHART_ROAD, P.CHART_ROAD, P.UNKNOWN], 'a chart shows roads and streets under the fog, nothing else');
    const own = P.paintMap({ ...def, chart: encodeBits([[0, 0]], 8, 4) }, fog, { charted: true });
    eq([rgb(own, 0, 0), rgb(own, 2, 0)], [P.CHART_ROAD, P.UNKNOWN], "a region's own chart layer replaces the road default");

    const img = P.paintMap(def, fog);
    const cells = F.revealAround(fog, 1, 1, 1);
    P.paintCells(img, def, fog, cells);
    eq([rgb(img, 1, 0), rgb(img, 5, 0)], [P.TERRAIN[1], P.UNKNOWN], 'paintCells repaints only the revealed cells');

    const room = P.paintMap({ interior: true, tiles: [[1, 0]] }, null);
    eq([rgb(room, 0, 0), rgb(room, 1, 0)], [P.INTERIOR_TERRAIN[1], P.INTERIOR_TERRAIN[0]], 'interiors use the room palette');
    eq(P.paintMap({ mapCols: 60, mapRows: 60 }, null), null, 'no tile grid: nothing to paint');

    eq(P.denseMask(def), null, 'no dense layer: null');
    ok(!P.isDenseAt(null, 8, 1, 1), 'null mask is never dense');
    const thick = { ...def, dense: encodeBits([[2, 1]], 8, 4) };
    ok(P.isDenseAt(P.denseMask(thick), 8, 2, 1) && !P.isDenseAt(P.denseMask(thick), 8, 3, 1), 'dense where the layer says');
    ok(!P.isDenseAt(P.denseMask(thick), 8, -1, 0) && !P.isDenseAt(P.denseMask(thick), 8, 0, 9), 'outside the map is not dense');
}

// ---- Features and quest markers
{
    const K = await import('../src/systems/mapMarkers.js');
    const grid = Array.from({ length: 20 }, () => new Array(20).fill(0));
    const def = {
        tiles: grid,
        portals: [{ id: 'p', x: 0, y: 5, targetMap: 'east_road', label: 'East' }],
        spawns: {
            doors: [{ x: 5, y: 5, interior: 'room', label: 'Room' }, { x: 9, y: 9, interior: 'vault', label: 'Vault', locked: { flag: 'vault_key' } }],
            riftGates: [{ id: 'g1', x: 15, y: 15, label: 'Gate' }],
            landmarks: [{ id: 'lm1', name: 'Old Oak', x: 12, y: 2, radius: 3, xp: 10 }],
            npcs: [{ x: 3, y: 3, id: 'oren', name: 'Oren' }, { x: 4, y: 4, dialogue: 'hermit_greeting' }],
            enemies: [{ x: 10, y: 10, type: 'wolf' }, { x: 14, y: 12, type: 'wolf' }],
            signs: [{ x: 7, y: 7, id: 'stone', text: '…' }],
        },
    };
    eq([K.npcQuestId(def.spawns.npcs[0]), K.npcQuestId(def.spawns.npcs[1]), K.npcQuestId({ isShop: true })], ['oren', 'hermit', 'silvara'], 'NPC quest ids follow GameScene');

    const s = new PlayerStats();
    const fog = F.createFog(20, 20);
    const none = K.visibleFeatures(def, fog, s);
    eq([none.exits, none.doors, none.gates, none.landmarks], [[], [], [], []], 'nothing seen yet: nothing shown');
    F.revealAround(fog, 5, 5, 6);
    const seen = K.visibleFeatures(def, fog, s);
    eq(seen.exits, [{ x: 0, y: 5, label: 'East', targetMap: 'east_road' }], 'an exit once its tile is explored');
    eq(seen.doors.map(d => [d.interior, d.locked]), [['room', false], ['vault', true]], 'doors once seen, locked ones flagged');
    s.flags.vault_key = true;
    eq(K.visibleFeatures(def, fog, s).doors[1].locked, false, 'an opened lock is no longer flagged');
    s.attunedGates.push('g1');
    eq(K.visibleFeatures(def, fog, s).gates, [{ x: 15, y: 15, id: 'g1', label: 'Gate', attuned: true }], 'an attuned gate shows even under fog');
    s.charted.here = true;
    eq(K.visibleFeatures(def, fog, s, 'here').landmarks, [{ x: 12, y: 2, id: 'lm1', name: '?', discovered: false }], 'a chart shows where landmarks are, unnamed');
    s.discovered.lm1 = true;
    eq(K.visibleFeatures(def, fog, s, 'here').landmarks[0].name, 'Old Oak', 'a discovered landmark shows its name');
    eq(K.visibleFeatures(def, null, new PlayerStats()).doors.length, 2, 'no fog (interior): everything shows');

    const q = { id: 'q1', title: 'Q', type: 'main', steps: [
        { id: 't', type: 'talk', target: 'oren', label: 'Talk to Oren', required: 1 },
        { id: 'k', type: 'kill', target: 'wolf', label: 'Wolves', required: 2 },
        { id: 's', type: 'read_signs', target: 'stone', label: 'Read', required: 1 },
        { id: 'a', type: 'attune', target: 'any', label: 'Attune', required: 1 },
        { id: 'w', type: 'gather', target: 'wood', label: 'Wood', required: 3, where: { map: 'here', x: 1, y: 2 } },
        { id: 'x', type: 'kill', target: 'any', label: 'Anything', required: 5 },
        { id: 'r', type: 'read_signs', target: 'any', label: 'Signs', required: 3 },
    ] };
    const log = { status: 'active', progress: { t: 0, k: 0, s: 0, a: 0, w: 0, x: 0, r: 0 } };
    const at = ms => ms.map(m => [m.stepId, m.x, m.y]);
    const state = { active: [{ quest: q, log }], countItem: () => 0, attunedGates: [] };
    eq(at(K.markersFor(state, 'here', def)), [['t', 3, 3], ['k', 12, 11], ['s', 7, 7], ['a', 15, 15], ['w', 1, 2]],
       'talk → NPC, kill → centre of that type\'s spawns, sign, gate, explicit where; "any" targets unmarked');
    ok(K.markersFor(state, 'here', def).every(m => m.main && m.title === 'Q' && m.questId === 'q1'), 'markers carry their quest');
    eq(at(K.markersFor(state, 'elsewhere', def)).map(([id]) => id).includes('w'), false, '`where` on another map: not here');
    log.progress.k = 2;
    eq(at(K.markersFor(state, 'here', def)).map(([id]) => id).includes('k'), false, 'a finished step loses its marker');
    eq(at(K.markersFor({ ...state, attunedGates: ['g1'] }, 'here', def)).map(([id]) => id).includes('a'), false, 'attune any: no unattuned gate, no marker');

    const given = { id: 'q2', title: 'Given', type: 'side', giver: 'oren', steps: [{ id: 'k', type: 'kill', target: 'wolf', label: 'Wolves', required: 1 }] };
    const glog = { status: 'active', progress: { k: 0, __turn_in: 0 } };
    const gstate = { active: [{ quest: given, log: glog }], countItem: () => 0, attunedGates: [] };
    eq(at(K.markersFor(gstate, 'here', def)), [['k', 12, 11]], 'the turn-in waits for the objectives');
    glog.progress.k = 1;
    eq(at(K.markersFor(gstate, 'here', def)), [['__turn_in', 3, 3]], 'then it points back to the giver');

    // A hunt bounty counts kills on its own map only (step.map, QuestManager.onKill): mark it nowhere else
    const hunt = { active: [{ quest: { id: 'b1', title: 'Bounty', type: 'bounty', steps: [{ id: 'hunt', type: 'kill', target: 'wolf', map: 'there', label: 'Wolves', required: 4 }] }, log: { status: 'active', progress: { hunt: 0 } } }], countItem: () => 0, attunedGates: [] };
    eq(at(K.markersFor(hunt, 'here', def)), [], 'a hunt bounty for another map: no marker here');
    eq(at(K.markersFor(hunt, 'there', def)), [['hunt', 12, 11]], 'and its own map is marked');

    const rooms = { room: { id: 'room', interior: true, tiles: [[0]], spawns: { npcs: [{ x: 0, y: 0, id: 'inside' }] } } };
    const indoor = { active: [{ quest: { id: 'q3', title: 'In', type: 'side', steps: [{ id: 'i', type: 'talk', target: 'inside', label: 'Inside', required: 1 }] }, log: { status: 'active', progress: { i: 0 } } }], countItem: () => 0, attunedGates: [] };
    const via = K.markersFor(indoor, 'here', def, { getMap: id => rooms[id] ?? { tiles: [[0]], spawns: {} } });
    eq(via.map(m => [m.stepId, m.x, m.y, m.viaDoor]), [['i', 5, 5, true]], 'a target inside a building marks its door');
    eq(K.markersFor(indoor, 'room', rooms.room).map(m => [m.x, m.y, m.viaDoor]), [[0, 0, false]], 'and the room itself marks the NPC');

    // Every real quest on every real map: no throw, markers inside the map
    const { getMap, listMaps } = await import('../src/data/maps/index.js');
    const { QUESTS } = await import('../src/data/quests.js');
    const all = { active: Object.values(QUESTS).map(qq => ({ quest: qq, log: { status: 'active', progress: {} } })), countItem: () => 0, attunedGates: [] };
    let marks = 0;
    for (const { id } of listMaps()) {
        const m = getMap(id);
        const list = K.markersFor(all, id, m, { getMap });
        const w = m.tiles?.[0]?.length ?? m.mapCols ?? 0, h = m.tiles?.length ?? m.mapRows ?? 0;
        ok(list.every(mk => mk.x >= 0 && mk.y >= 0 && mk.x < w && mk.y < h), `${id}: every marker lies inside the map`);
        K.visibleFeatures(m, null, new PlayerStats());
        marks += list.length;
    }
    ok(marks > 10, `real quests produce markers somewhere (${marks})`);
}

// ---- World layout
{
    const L = await import('../src/systems/worldLayout.js');
    const { getMap, listMaps } = await import('../src/data/maps/index.js');
    eq(L.WORLD_ANCHORS.thaloria, { x: 1100, y: 200, lore: 'Thaloria' }, "Thaloria's lore coordinates");
    eq(L.exitDirection({ x: 31, y: 12 }, getMap('thaloria')).dx > 0.9, true, "Thaloria's east gate points east");

    const a = L.layoutWorld(['thaloria', 'east_road', 'summit_of_despair', 'thaloria_inn', 'not_a_map'], getMap);
    const pos = id => a.nodes.find(nd => nd.id === id);
    eq(a.nodes.map(nd => nd.id).sort(), ['east_road', 'summit_of_despair', 'thaloria'], 'interiors and unknown ids are left out');
    eq([pos('thaloria').x, pos('thaloria').y, pos('thaloria').anchored], [1100, 200, true], 'anchored maps sit on their lore coordinates');
    ok(pos('east_road').x > 1100 && !pos('east_road').anchored, 'East Road (no lore location) is placed beside a linked neighbour, east of Thaloria');
    eq(a.edges, [['east_road', 'summit_of_despair'], ['east_road', 'thaloria']], 'edges between visited maps joined by an exit');
    eq(pos('thaloria').name, 'Thaloria', 'nodes carry the display name');

    const solo = L.layoutWorld(['thaloria'], getMap);
    eq(solo.stubs.map(s => s.targetMap).sort(), ['east_road', 'eldrin_tower'], 'exits to unvisited maps are stubs');
    eq(L.layoutWorld(['thaloria'], getMap, { knownExit: () => false }).stubs, [], 'only exits you have seen');

    const every = listMaps().map(m => m.id);
    const big = L.layoutWorld(every, getMap);
    ok(big.nodes.every(nd => Number.isFinite(nd.x) && Number.isFinite(nd.y)), 'every map gets a position, linked or not');
    let close = 0;
    for (const p of big.nodes) for (const q of big.nodes) if (p !== q && Math.hypot(p.x - q.x, p.y - q.y) < L.STEP / 2 && !(p.anchored && q.anchored)) close++;
    eq(close, 0, 'no placed node lands on top of another');
    eq(JSON.stringify(L.layoutWorld(every, getMap)), JSON.stringify(big), 'deterministic');
}

// ---- Charts
{
    const { ITEMS, CATALOGS, MERCHANT_CATALOG } = await import('../src/data/items.js');
    const { getMap } = await import('../src/data/maps/index.js');
    const charts = Object.values(ITEMS).filter(i => i.chartOf);
    eq(charts.map(c => c.id).sort(), ['chart_east_road', 'chart_thaloria'], 'two charts');
    ok(charts.every(c => getMap(c.chartOf).id === c.chartOf), 'each charts a registered map');
    const sold = new Set(CATALOGS.cartographer.map(e => e.id));
    ok(charts.every(c => sold.has(c.id)), 'the cartographer sells every chart');
    ok(CATALOGS.cartographer.every(e => ITEMS[e.id] && e.price > 0 && (e.currency === 'gold' || e.currency === 'glint')), 'catalogue entries are real items with a price');
    ok(!MERCHANT_CATALOG.some(e => ITEMS[e.id]?.chartOf), 'ordinary merchants do not sell charts');

    const s = new PlayerStats();
    s.addItem('chart_thaloria', 2);
    ok(s.useItem('chart_thaloria'), 'reading a chart works');
    eq(s.charted, { thaloria: true }, 'and charts Thaloria');
    eq(s.countItem('chart_thaloria'), 1, 'one copy used up');
    ok(!s.useItem('chart_thaloria'), 'a second copy is refused');
    eq(s.countItem('chart_thaloria'), 1, 'and kept');

    const t = getMap('thaloria');
    const { THALORIA_TOWN } = await import('../src/data/townsfolk/thaloria.js');
    const carto = THALORIA_TOWN.residents.find(r => r.npc?.catalog === 'cartographer');
    ok(carto && carto.npc.isShop, 'Thaloria has a cartographer shop');
    const stall = THALORIA_TOWN.places[carto.work];
    ok(t.tiles[stall.y][stall.x] !== 1, 'whose stall stands on open ground');
}

// ---- Landmarks on the Chapter 3 maps
{
    const { getMap, listMaps } = await import('../src/data/maps/index.js');
    eq((getMap('thaloria').spawns.landmarks ?? []).map(l => l.id), ['thaloria_bell_tower_square', 'thaloria_market', 'thaloria_east_gate'], "Thaloria's landmarks");
    eq((getMap('east_road').spawns.landmarks ?? []).map(l => l.id), ['east_road_waystone', 'east_road_lean_to'], "the East Road's landmarks");
    const ids = [];
    for (const { id } of listMaps()) {
        const m = getMap(id);
        for (const l of m.spawns?.landmarks ?? []) {
            ids.push(l.id);
            ok(typeof l.name === 'string' && l.name && Number.isFinite(l.xp) && l.radius > 0, `${id}/${l.id}: name, xp, radius`);
            ok(m.tiles[l.y]?.[l.x] !== undefined && m.tiles[l.y][l.x] !== 1, `${id}/${l.id}: on the map, on open ground`);
        }
    }
    eq(new Set(ids).size, ids.length, 'landmark ids are unique across all maps (discovered is keyed by id)');
}

console.log(`test_fog_map: ${n} checks passed`);
