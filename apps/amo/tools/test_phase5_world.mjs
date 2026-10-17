// Phase 5 world: game clock and day/night (E1), weather (E2).
// Run: node tools/test_phase5_world.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');
const C = await import('../src/systems/gameClock.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };
const near = (a, b, msg) => { assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`); n++; };
const at = (day, h, m = 0) => day * 1440 + h * 60 + m;

// ---- E1: clock
{
    eq(C.START_MINUTES, 480, 'a new game starts at 08:00');
    const s = new PlayerStats();
    eq(s.gameMinutes, 480, 'new characters start at 08:00');
    C.advanceClock(s, 60000);
    eq(s.gameMinutes, 540, 'one real minute is one game hour');
    C.advanceClock(s, 500);
    eq(s.gameMinutes, 540.5, 'fractions accumulate');
    C.advanceClock(s, -100);
    eq(s.gameMinutes, 540.5, 'time never runs backwards');

    near(C.gameHour(at(2, 14, 30)), 14.5, 'hour of day');
    eq(C.gameDay(at(2, 14, 30)), 2, 'day number');
    eq(C.gameDay(at(0, 23, 59)), 0, 'still day 0 before midnight');
    eq(C.clockLabel(at(3, 14, 5)), 'Day 3 · 14:05', 'clock label');
    eq(C.clockLabel(at(0, 0, 0) + 59.9), 'Day 0 · 00:59', 'label floors minutes');

    ok(!C.isNight(at(0, 12)), 'noon is day');
    ok(!C.isNight(at(0, 19, 59)), '19:59 is day');
    ok(C.isNight(at(0, 20)), '20:00 is night');
    ok(C.isNight(at(1, 3)), '03:00 is night');
    ok(C.isNight(at(1, 5, 59)), '05:59 is night');
    ok(!C.isNight(at(1, 6)), '06:00 is day');

    eq(C.ambientAt(at(0, 12)).alpha, 0, 'no darkness at noon');
    eq(C.ambientAt(at(0, 23)).alpha, C.NIGHT_ALPHA, 'full darkness at night');
    near(C.ambientAt(at(0, 19)).alpha, C.NIGHT_ALPHA / 2, 'dusk halfway at 19:00');
    near(C.ambientAt(at(0, 6, 30)).alpha, C.NIGHT_ALPHA / 2, 'dawn halfway at 06:30');
    eq(C.ambientAt(at(0, 7)).alpha, 0, 'full day by 07:00');
    ok(C.ambientAt(at(0, 23)).color !== undefined, 'ambient has a colour');

    eq(C.nightDamageMult('shadow_sprite', at(0, 23)), 1.2, 'void creatures hit harder at night');
    eq(C.nightDamageMult('shadow_sprite', at(0, 12)), 1, 'not by day');
    eq(C.nightDamageMult('wolf', at(0, 23)), 1, 'other creatures unchanged');

    ok(C.spawnActive({ type: 'wolf' }, at(0, 12)) && C.spawnActive({ type: 'wolf' }, at(0, 23)), 'untimed spawns always');
    ok(C.spawnActive({ time: 'night' }, at(0, 23)) && !C.spawnActive({ time: 'night' }, at(0, 12)), 'night spawns');
    ok(C.spawnActive({ time: 'day' }, at(0, 12)) && !C.spawnActive({ time: 'day' }, at(0, 23)), 'day spawns');
}

// ---- E1: saves
{
    const s = new PlayerStats();
    s.gameMinutes = at(4, 21, 15);
    SaveManager.save(s, 'st', 'c1');
    const back = new PlayerStats();
    SaveManager.load(back, 'st', 'c1');
    eq(back.gameMinutes, at(4, 21, 15), 'the clock round-trips');

    const key = [...store.keys()].find(k => k.includes('c1'));
    const raw = JSON.parse(store.get(key));
    delete raw.gameMinutes;
    store.set(key, JSON.stringify(raw));
    const old = new PlayerStats();
    old.gameMinutes = 999;
    SaveManager.load(old, 'st', 'c1');
    eq(old.gameMinutes, 480, 'old saves start at 08:00 on day 0');
    s.reset();
    eq(s.gameMinutes, 480, 'reset restarts the clock');
}

console.log(`test_phase5_world: ${n} checks passed`);
