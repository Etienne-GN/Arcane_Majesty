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

// ---- The Thalorian Wilds
{
    const E = getMap('east_road');
    eq([E.tiles[0].length, E.tiles.length, E.layoutVersion, E.displayName], [192, 160, 2, 'The Thalorian Wilds'], 'the Wilds: a 192×160 region, layout 2');
    for (const e of listMaps()) {
        for (const p of getMap(e.id).portals ?? []) if (p.targetMap === 'east_road') ok(landsOpen(p), `${e.id} → the Wilds lands on open ground`);
    }
    const inE = reachFrom(E, [2, 80]);
    for (const p of E.portals) ok(inE(p.x, p.y), `the Wilds: the ${p.id} exit is reachable from the west entry`);
    const sp = E.spawns;
    for (const s of sp.signs) ok(inE(s.x, s.y), `the ${s.id} sign is reachable`);
    for (const c of sp.chests) ok(inE(c.x, c.y), `the chest at ${c.x},${c.y} is reachable`);
    for (const g of sp.riftGates) ok(inE(g.x, g.y), `the ${g.id} gate is reachable`);
    for (const npc of sp.npcs) ok(inE(npc.x, npc.y), `${npc.id} is reachable`);
    const sent = sp.enemies.find(e => e.type === 'corrupted_sentinel');
    ok(sent && inE(sent.x, sent.y), 'the Corrupted Sentinel is reachable');
    for (const d of sp.doors) { const b = I.doorReturnPoint(d); ok(inE(Math.floor(b.x / 32), Math.floor(b.y / 32)), `${d.interior}: its entrance is reachable without a hop (the ford)`); }
    ok(sp.landmarks.length >= 8 && sp.landmarks.every(l => inE(l.x, l.y)), `8+ landmarks, each one walkable to (${sp.landmarks.length})`);
    const cells = E.tiles.flat(), open = cells.filter(t => t !== 1).length / cells.length;
    ok(open >= 0.45 && open <= 0.7, `forest wilds: ${Math.round(open * 100)}% open ground (45–70%)`);
    const { denseMask } = await import('../src/systems/mapPaint.js');
    const dm = denseMask(E);
    let dense = 0, opened = 0;
    E.tiles.forEach((row, y) => row.forEach((t, x) => { if (t !== 1) { opened++; if (dm[y * 192 + x]) dense++; } }));
    ok(dense / opened >= 0.1, `dense stands to get lost in (${Math.round(dense / opened * 100)}% of open ground)`);
    const wet = E.sheetDecorations.flatMap(g => g.items).filter(i => i.name.startsWith('water1_'));
    ok(wet.filter(i => i.hoppable === true).length >= 20, 'a stream you can hop');
    ok(wet.filter(i => i.hoppable !== true).length >= 100, 'a pool you cannot');
    ok(sp.enemies.length >= 35, `creatures scaled to the area (${sp.enemies.length})`);
    const fire = sp.campfires[0];
    ok(sp.enemies.filter(e => e.time === 'night' && Math.hypot(e.x - fire.x, e.y - fire.y) <= 6).length >= 3, 'the night ambush round the copse fire');
    const pages = sp.chests.filter(c => c.items.includes('scattered_journal_page'));
    eq(pages.length, 3, 'three journal pages');
    ok(pages.every((a, i) => pages.every((b, j) => i === j || Math.hypot(a.x - b.x, a.y - b.y) >= 40)), 'spread across the wilds');
    ok(P.mapTree('east_road', getMap).some(t => t.id === 'east_road_cave'), 'the Hollow is behind its door');
    // The Stepping Stones: where the Hollow's path crosses the stream, stones stand in the water
    const items = E.sheetDecorations.flatMap(g => g.items);
    const stones = items.filter(i => i.name === 'rock_pebble_dark');
    ok(stones.length >= 2, `stepping stones across the stream (${stones.length})`);
    for (const st of stones) {
        ok(items.some(i => i.x === st.x && i.y === st.y && i.name.startsWith('water1_') && !i.blocking), `water under the stone at ${st.x},${st.y}, and you can walk on it`);
        ok(inE(st.x, st.y) && maskOf(E)[st.y * 192 + st.x] === 1, `the stone at ${st.x},${st.y} is walkable from the west`);
    }
    ok(sp.landmarks.some(l => l.id === 'east_road_stepping_stones' && l.name === 'The Stepping Stones'), 'the landmark is named for what you see');
}

console.log(`test_world_content: ${n} checks passed`);
