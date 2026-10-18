// W2 region streaming: chunk maths, the streamer, the region format.
// Run: node tools/test_region.mjs
import assert from 'node:assert';

const R = await import('../src/systems/regionChunks.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };
const sorted = s => [...s].sort();

// ---- Chunk maths
{
    eq(R.CHUNK, 16, '16-tile chunks');
    eq(R.chunkKey(3, 4), '3,4', 'key');
    eq(R.chunkOfTile(0, 0), { cx: 0, cy: 0 }, 'origin');
    eq(R.chunkOfTile(15, 16), { cx: 0, cy: 1 }, 'tile 15 is chunk 0, tile 16 chunk 1');

    // 64×64 tiles = 4×4 chunks of 512 px. A 320×224 view at (600, 600) touches only chunk 1,1.
    const view = { x: 600, y: 600, w: 320, h: 224 };
    eq(sorted(R.activeChunks(view, 64, 64, 16, 0)), ['1,1'], 'the view alone');
    eq(R.activeChunks(view, 64, 64, 16, 1).size, 9, 'one chunk of margin around it');
    eq(sorted(R.activeChunks({ x: 0, y: 0, w: 320, h: 224 }, 64, 64, 16, 1)), ['0,0', '0,1', '1,0', '1,1'], 'clamped at the map edge');
    eq(sorted(R.activeChunks({ x: 0, y: 0, w: 448, h: 320 }, 14, 10, 16, 1)), ['0,0'], 'a 14×10 map is one chunk');
    eq(sorted(R.activeChunks({ x: 500, y: 0, w: 30, h: 30 }, 64, 64, 16, 0)), ['0,0', '1,0'], 'a view across a border touches both');

    const b = R.bucketByChunk([{ x: 1, y: 1 }, { x: 17, y: 2 }, { x: 3, y: 15 }], it => it);
    eq(b.get('0,0').length, 2, 'bucketed by tile');
    eq(b.get('1,0').length, 1, 'next chunk');

    eq(R.diffChunks(new Set(['a', 'b']), new Set(['b', 'c'])), { enter: ['c'], leave: ['a'] }, 'diff');
}

// ---- The streamer
{
    const log = [];
    const s = new R.ChunkStreamer({ cols: 64, rows: 64 });
    const items = [];
    for (let y = 0; y < 64; y += 4) for (let x = 0; x < 64; x += 4) items.push({ x, y });
    let live = 0;
    s.addLayer('dots', items, it => it, it => { live++; return { it }; }, () => { live--; });
    s.onEnter = k => log.push(`+${k}`);
    s.onLeave = k => log.push(`-${k}`);

    const view = { x: 600, y: 600, w: 320, h: 224 };     // chunk 1,1
    s.update(view, 0);
    ok(s.isActive('1,1'), 'the chunk under the view is built at once (urgent)');
    eq(s.builtCount(), 1, 'margin chunks wait (perFrame 0)');
    eq(s.queuedCount(), 8, 'eight margin chunks queued');
    eq(live, 16, '16 dots in a chunk');
    ok(s.isTileActive(20, 20) && !s.isTileActive(5, 5), 'isTileActive follows built chunks');
    ok(s.isPxActive(600, 600) && !s.isPxActive(10, 10), 'isPxActive');

    s.update(view, 1);
    eq(s.builtCount(), 2, 'one margin chunk per frame');
    s.update(view, 100);
    eq(s.builtCount(), 9, 'all built');
    eq(s.queuedCount(), 0, 'queue drained');
    eq(live, 9 * 16, 'handles created per chunk');
    eq(s.handleCount(), 9 * 16, 'handleCount');

    // Teleport across the map: the new view's chunk is built in the same update.
    log.length = 0;
    s.update({ x: 1700, y: 1700, w: 320, h: 224 }, 0);   // chunk 3,3
    ok(s.isActive('3,3'), 'teleport target built immediately');
    ok(!s.isActive('0,0') && !s.isActive('1,1'), 'old chunks destroyed');
    ok(log.includes('-1,1') && log.includes('+3,3'), 'onLeave / onEnter fired');
    ok(log.indexOf('-1,1') < log.indexOf('+3,3'), 'leaves before enters');
    eq(live, s.builtCount() * 16, 'no leaked handles');

    // A queued chunk that leaves before being built never fires onEnter or onLeave.
    log.length = 0;
    const s2 = new R.ChunkStreamer({ cols: 64, rows: 64 });
    s2.addLayer('dots', items, it => it, () => ({}), () => {});
    s2.onEnter = k => log.push(`+${k}`); s2.onLeave = k => log.push(`-${k}`);
    s2.update(view, 0);
    s2.update({ x: 1700, y: 1700, w: 320, h: 224 }, 0);
    ok(!log.some(e => e === '+0,0' || e === '-0,0'), 'never-built chunks are silent');

    // Nearest margin chunk first.
    const s3 = new R.ChunkStreamer({ cols: 64, rows: 64 });
    s3.addLayer('dots', items, it => it, () => ({}), () => {});
    s3.update({ x: 1000, y: 600, w: 20, h: 20 }, 0);     // chunk 1,1, right half
    s3.update({ x: 1000, y: 600, w: 20, h: 20 }, 1);
    ok(s3.isActive('2,1'), 'the nearest margin chunk (east, the view sits by its edge) comes first');

    s.destroyAll();
    eq([s.builtCount(), live], [0, 0], 'destroyAll');
}

// ---- Region format
{
    const F = await import('../src/systems/regionFormat.js');
    const rows = [[0, 1, 2], [3, 4, 5]];
    eq(F.decodeGrid(F.encodeGrid(rows), 3, 2), rows, 'grid round-trip');
    const cells = [[0, 0], [2, 1], [1, 1]];
    eq(F.decodeBitsToCells(F.encodeBits(cells, 3, 2), 3, 2).sort(), cells.slice().sort(), 'bitset round-trip');

    const raw = {
        format: 1, id: 'tiny', displayName: 'Tiny', width: 3, height: 2,
        tiles: F.encodeGrid(rows), hop: F.encodeBits([[2, 1]], 3, 2),
        sheets: [
            { texKey: 'tm_a', catKey: 'tm_a_cat', png: 'a.png', cat: 'a.json', scale: 1 },
            { texKey: 'tm_a', catKey: 'tm_a_cat', png: 'a.png', cat: 'a.json', scale: 2 },
        ],
        names: ['rock', 'fence_wood_up_down'],
        deco: [[0, 0, 1, 0, 1], [0, 1, 2, 1, 2 | 8, 5], [1, 0, 0, 1, 0]],
        playerStart: { x: 0, y: 0 }, spawns: { enemies: [] }, portals: [],
    };
    const m = F.decodeRegion(raw);
    eq(m.tiles, rows, 'tiles decoded');
    eq([m.id, m.displayName, m.region], ['tiny', 'Tiny', true], 'fields kept, region flag');
    eq(m.extraSheets, [{ texKey: 'tm_a', catKey: 'tm_a_cat', png: 'a.png', cat: 'a.json' }], 'one load per texture');
    eq(m.sheetDecorations.length, 2, 'one group per sheet+scale');
    eq(m.sheetDecorations[0].items, [
        { name: 'rock', x: 1, y: 0, blocking: true },
        { name: 'fence_wood_up_down', x: 2, y: 1, blocking: false, hoppable: false, depthOffset: 5 },
    ], 'flags and depth offset decoded');
    eq(m.sheetDecorations[1], { texKey: 'tm_a', catKey: 'tm_a_cat', scale: 2, items: [{ name: 'rock', x: 0, y: 1 }] }, 'scaled group');
    eq(m.hopCells, [[2, 1]], 'hop cells');
    ok(!('deco' in m) && !('names' in m) && !('sheets' in m), 'packed fields are not left on the map');
    assert.throws(() => F.decodeRegion({ ...raw, format: 2 }), /format/); n++;
}

// ---- The stream-test region is registered and big
{
    const { getMap } = await import('../src/data/maps/index.js');
    const m = getMap('streamtest');
    eq(m.id, 'streamtest', 'registered');
    eq([m.tiles[0].length, m.tiles.length], [256, 256], '256×256');
    const trees = m.tiles.flat().filter(v => v === 1).length;
    ok(trees > 15000 && trees < 40000, `a real forest (${trees} trees)`);
    const deco = m.sheetDecorations.reduce((a, g) => a + g.items.length, 0);
    ok(deco >= 10000, `thousands of decorations (${deco})`);
    ok(m.spawns.enemies.length >= 100, 'a hundred creatures');
    const open = (x, y) => [0, 2, 3].includes(m.tiles[y]?.[x]);
    ok(open(m.playerStart.x, m.playerStart.y), 'player starts on open ground');
    ok(m.spawns.enemies.every(e => open(e.x, e.y)), 'every creature on open ground');
    const fs = await import('node:fs');
    const bytes = fs.statSync(new URL('../src/data/maps/regions/streamtest.js', import.meta.url)).size;
    ok(bytes < 3 * 1024 * 1024, `under 3 MB (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
}


// ---- A pixel pad instead of whole-chunk margins (W2 budget ruling)
{
    // view 800..900 px; padded by 256 → 544..1156 px → chunks 1..2 on each axis
    const view = { x: 800, y: 800, w: 100, h: 100 };
    const s = new R.ChunkStreamer({ cols: 64, rows: 64, pad: 256 });
    s.addLayer('dots', [], it => it, () => ({}), () => {});
    s.update(view, 0);
    eq([s.builtCount(), s.queuedCount()], [1, 3], 'the view itself is urgent; the pad streams in');
    s.update(view, 100);
    eq(sorted([...['1,1', '2,1', '1,2', '2,2'].filter(k => s.isActive(k))]), ['1,1', '1,2', '2,1', '2,2'], 'the pad reaches the near neighbours');
    eq(s.builtCount(), 4, 'and nothing else (a 1-chunk margin would build 9)');
}

console.log(`test_region: ${n} checks passed`);
