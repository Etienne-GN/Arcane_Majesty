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

console.log(`test_fog_map: ${n} checks passed`);
