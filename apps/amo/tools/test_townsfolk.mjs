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

console.log(`test_townsfolk: ${n} checks passed`);
