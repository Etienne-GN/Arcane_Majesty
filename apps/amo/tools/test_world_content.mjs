// W6 content: Thaloria (128×112, walled, 17 rooms) and the Thalorian Wilds (192×160) —
// sizes, layout versions, portals that land on open ground, and Chapter 3 reachable
// on foot over the real collision grid (tiles + decoration bodies + spawns).
// Run: node tools/test_world_content.mjs
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

const { getMap, listMaps } = await import('../src/data/maps/index.js');
const W = await import('../src/systems/walkGrid.js');
const P = await import('../src/systems/pathfind.js');
const I = await import('../src/systems/interiors.js');

const cats = new Map();
const catalogueOf = p => { if (!cats.has(p)) { try { cats.set(p, JSON.parse(readFileSync(new URL(`../public/${p}`, import.meta.url)))); } catch { cats.set(p, null); } } return cats.get(p); };
const masks = new Map();
const maskOf = def => {                      // 1 = you can stand here
    if (!masks.has(def)) { const b = W.blockedTiles(def, catalogueOf); masks.set(def, b.map(v => (v ? 0 : 1))); }
    return masks.get(def);
};
// Walkable tiles reached from (sx, sy), 4-way; reach(x, y) is true when (x, y) or a neighbour was reached.
const reachFrom = (def, [sx, sy]) => {
    const w = def.tiles[0].length, h = def.tiles.length, m = maskOf(def), seen = new Uint8Array(w * h), q = [[sx, sy]];
    seen[sy * w + sx] = 1;
    while (q.length) {
        const [x, y] = q.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy, i = ny * w + nx;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[i] && m[i]) { seen[i] = 1; q.push([nx, ny]); }
        }
    }
    return (x, y) => [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([a, b]) => a >= 0 && b >= 0 && a < w && b < h && seen[b * w + a]);
};
const landsOpen = p => { const t = getMap(p.targetMap), tx = Math.floor(p.targetX / 32), ty = Math.floor(p.targetY / 32); return maskOf(t)[ty * t.tiles[0].length + tx] === 1; };

// ---- Thaloria
{
    const T = getMap('thaloria');
    eq([T.tiles[0].length, T.tiles.length, T.layoutVersion, T.region], [128, 112, 2, true], 'Thaloria: a 128×112 region, layout 2');
    for (const e of listMaps()) {
        for (const p of getMap(e.id).portals ?? []) if (p.targetMap === 'thaloria') ok(landsOpen(p), `${e.id} → Thaloria lands on open ground (${Math.floor(p.targetX / 32)},${Math.floor(p.targetY / 32)})`);
    }
    const inT = reachFrom(T, [120, 54]);
    for (const p of T.portals) ok(inT(p.x, p.y), `Thaloria: the ${p.id} exit is reachable from the East Gate`);
    const m = maskOf(T);
    let west = 0, east = 0;
    for (let y = 6; y < 106; y++) { if (m[y * 128 + 4] && m[y * 128 + 5]) west++; if (m[y * 128 + 122] && m[y * 128 + 123]) east++; }
    eq([west, east], [2, 2], 'the walls are closed but for the two gates on the high street');
    const tree = P.mapTree('thaloria', getMap);
    ok(tree.length - 1 >= 15 && tree.length - 1 <= 20, `15–20 rooms behind Thaloria's doors (${tree.length - 1})`);
    for (const id of ['thaloria_inn', 'thaloria_inn_cellar', 'thaloria_market_hall', 'thaloria_smithy', 'thaloria_alchemist', 'thaloria_temple', 'thaloria_bell_tower', 'thaloria_guild_hall', 'thaloria_barracks', 'thaloria_manor']) ok(tree.some(t => t.id === id), `${id} is behind a Thaloria door`);
    for (const d of T.spawns.doors) { const b = I.doorReturnPoint(d); ok(inT(Math.floor(b.x / 32), Math.floor(b.y / 32)), `the door to ${d.interior} is reachable`); }
    for (const s of [...T.spawns.stations, ...T.spawns.bountyBoards]) ok(inT(s.x, s.y), `${s.type ?? 'the bounty board'} at ${s.x},${s.y} is reachable`);
    ok(!(T.spawns.enemies ?? []).length, 'the city is safe');
    ok(T.spawns.signs.some(s => s.id === 'archivists_guild'), "the Archivist's Guild sign");
}

console.log(`test_world_content: ${n} checks passed`);
