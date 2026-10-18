// W3 interiors: door locks, the return stack, the exit portal, the save.
// Run: node tools/test_interiors.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const I = await import('../src/systems/interiors.js');
const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- Locks
{
    const s = new PlayerStats();
    eq(I.doorLockState({ x: 1, y: 1, interior: 'a' }, s), { open: true, reason: null }, 'no lock: open');
    const byFlag = { x: 1, y: 1, interior: 'a', locked: { flag: 'house_key' } };
    eq(I.doorLockState(byFlag, s).open, false, 'flag lock closed');
    ok(/locked/i.test(I.doorLockState(byFlag, s).reason), 'a default "locked" message');
    s.flags.house_key = true;
    eq(I.doorLockState(byFlag, s).open, true, 'flag set: open');
    const byItem = { x: 1, y: 1, interior: 'a', locked: { item: 'silver_ore', text: 'A silver lock.' } };
    eq(I.doorLockState(byItem, s), { open: false, reason: 'A silver lock.' }, 'custom text');
    s.addItem('silver_ore');
    eq(I.doorLockState(byItem, s).open, true, 'carrying the item opens it');
    const either = { x: 1, y: 1, interior: 'a', locked: { item: 'mana_potion', flag: 'house_key' } };
    eq(I.doorLockState(either, s).open, true, 'either condition opens');
}

// ---- Return point in front of the door
{
    eq(I.doorReturnPoint({ x: 5, y: 16 }), { x: 176, y: 560 }, 'south of the door by default (one tile + a bit)');
    eq(I.doorReturnPoint({ x: 5, y: 16, facing: 'down' }), { x: 176, y: 496 }, 'a door entered facing down: stand north of it');
    eq(I.doorReturnPoint({ x: 5, y: 16, facing: 'left' }), { x: 208, y: 528 }, 'facing left: stand east');
}

// ---- The stack, the exit portal, nesting
{
    const s = new PlayerStats();
    eq(s.interiorReturn, [], 'a new character has an empty stack');
    const inn = { id: 'inn', interior: true, exitFallback: { map: 'thaloria', x: 5, y: 17 } };
    const town = { id: 'thaloria' };
    I.pushReturn(s, { mapId: 'thaloria', x: 176, y: 560 });
    I.pushReturn(s, { mapId: 'inn', x: 300, y: 200 });
    eq(I.resolvePortal({ targetMap: '__return' }, s, inn), { targetMap: 'inn', targetX: 300, targetY: 200 }, 'cellar exit: back into the inn');
    eq(I.resolvePortal({ targetMap: '__return' }, s, inn), { targetMap: 'thaloria', targetX: 176, targetY: 560 }, 'inn exit: back to the street');
    eq(s.interiorReturn, [], 'popped empty');
    eq(I.resolvePortal({ targetMap: '__return' }, s, inn), { targetMap: 'thaloria', targetX: 176, targetY: 560 }, 'empty stack: the fallback (tile → px centre)');
    eq(I.resolvePortal({ targetMap: '__return' }, s, { id: 'x', interior: true }), null, 'no stack, no fallback: null');
    const plain = { targetMap: 'east_road', targetX: 10, targetY: 20, label: 'East' };
    eq(I.resolvePortal(plain, s, town), { targetMap: 'east_road', targetX: 10, targetY: 20 }, 'ordinary portals unchanged');

    I.pushReturn(s, { mapId: 'thaloria', x: 1, y: 2 });
    I.clearReturnsOutside(s, inn);
    eq(s.interiorReturn.length, 1, 'kept while indoors');
    I.clearReturnsOutside(s, town);
    eq(s.interiorReturn, [], 'cleared on any outdoor map');
}

// ---- Save
{
    const s = new PlayerStats();
    I.pushReturn(s, { mapId: 'thaloria', x: 176, y: 560 });
    I.pushReturn(s, { mapId: 'thaloria_inn', x: 300, y: 200 });
    SaveManager.save(s, 'st_int', 'c1');
    const back = new PlayerStats();
    SaveManager.load(back, 'st_int', 'c1');
    eq(back.interiorReturn, s.interiorReturn, 'the stack survives a save');
    ok(back.interiorReturn[0] !== s.interiorReturn[0], 'copied, not shared');

    const old = new PlayerStats();
    const raw = JSON.parse(store.get([...store.keys()].find(k => k.includes('st_int'))));
    delete raw.interiorReturn;
    store.set([...store.keys()].find(k => k.includes('st_int')), JSON.stringify(raw));
    SaveManager.load(old, 'st_int', 'c1');
    eq(old.interiorReturn, [], 'an old save loads with an empty stack');
    s.reset();
    eq(s.interiorReturn, [], 'reset empties it');
}

// ---- Every registered interior is walkable and wired; Thaloria's doors lead somewhere
{
    const { getMap, listMaps } = await import('../src/data/maps/index.js');
    const open = (m, x, y) => m.tiles[y]?.[x] === 0;
    const interiors = listMaps().map(e => getMap(e.id ?? e)).filter(m => m.interior);
    ok(interiors.length >= 4, `interiors registered (${interiors.length})`);
    for (const m of interiors) {
        eq([m.treeArt, m.biome], [false, 'indoor'], `${m.id}: wall-only, indoor`);
        ok(open(m, m.playerStart.x, m.playerStart.y), `${m.id}: start on the floor`);
        const exit = m.portals.find(p => p.targetMap === I.RETURN_KEY);
        ok(exit && open(m, exit.x, exit.y), `${m.id}: an exit in the opening`);
        ok(getMap(m.exitFallback.map).id === m.exitFallback.map, `${m.id}: fallback map exists`);
        // BFS from the start over floor (0) minus furniture is the generator's job;
        // here: every chest, book and door has an open neighbour reachable on the tile grid.
        const seen = new Set([`${m.playerStart.x},${m.playerStart.y}`]); const q = [[m.playerStart.x, m.playerStart.y]];
        while (q.length) { const [x, y] = q.shift(); for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const k = `${nx},${ny}`; if (!seen.has(k) && open(m, nx, ny)) { seen.add(k); q.push([nx, ny]); } } }
        const near = ({ x, y }) => [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([a, b]) => seen.has(`${a},${b}`));
        for (const c of m.spawns.chests) ok(near(c), `${m.id}: chest at ${c.x},${c.y} reachable`);
        for (const s of m.spawns.signs) ok(near(s), `${m.id}: book at ${s.x},${s.y} reachable`);
        for (const d of m.spawns.doors ?? []) {
            ok(near(d), `${m.id}: door at ${d.x},${d.y} reachable`);
            ok(getMap(d.interior).id === d.interior, `${m.id}: door leads to ${d.interior}`);
        }
    }
    const T = getMap('thaloria');
    const doors = T.spawns.doors ?? [];
    eq(doors.map(d => d.interior).sort(), ['thaloria_bell_tower', 'thaloria_house_teal', 'thaloria_inn'], 'Thaloria has three doors');
    for (const d of doors) {
        ok(getMap(d.interior).interior, `${d.interior} is an interior`);
        const back = I.doorReturnPoint(d);
        ok(open(T, Math.floor(back.x / 32), Math.floor(back.y / 32)) || [2, 3].includes(T.tiles[Math.floor(back.y / 32)][Math.floor(back.x / 32)]),
            `${d.interior}: you come back out onto open ground`);
    }
    ok(doors.find(d => d.interior === 'thaloria_house_teal').locked?.flag, 'the teal house is locked');
    ok(getMap('thaloria_inn').spawns.doors.some(d => d.interior === 'thaloria_inn_cellar'), 'the inn has a way down to its cellar');
}

console.log(`test_interiors: ${n} checks passed`);
