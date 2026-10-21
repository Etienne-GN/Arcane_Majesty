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

console.log(`test_fog_map: ${n} checks passed`);
