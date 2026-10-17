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

// ---- E2: weather rules
{
    const W = await import('../src/data/weather.js');
    const { listMaps, getMap } = await import('../src/data/maps/index.js');

    eq(Object.keys(W.WEATHER).sort(), ['clear', 'rain', 'sandstorm', 'snow', 'storm'], 'five kinds of weather');
    for (const m of listMaps()) {
        const def = getMap(m.id ?? m);
        ok(W.BIOME_WEATHER[W.mapBiome(def)], `${def.id}: biome ${W.mapBiome(def)} is known`);
    }
    eq(W.mapBiome({ id: 'x' }), 'temperate', 'maps default to temperate');
    for (const id of ['hermit_hut', 'echoes_of_stone', 'heartstone_chamber', 'dungeontest', 'the_descent']) eq(W.mapBiome(getMap(id)), 'indoor', `${id} is indoors`);
    eq(W.mapBiome(getMap('summit_of_despair')), 'snow', 'the summit is snowy');
    eq(W.mapBiome(getMap('prologue_forest')), 'forest', 'the prologue forest is a forest');
    eq(W.mapBiome(getMap('fire_gate')), 'arid', 'the fire gate is arid');

    const days = 60, seen = def => {
        const kinds = new Set();
        let t = 0, prev = null;
        while (t < days * 1440) {
            const w = W.weatherAt(def, t);
            kinds.add(w.id);
            if (w.to === Infinity) break;          // a one-weather table never changes
            if (prev && w.from !== prev.to) throw new Error('segments are not contiguous');
            if (w.to - w.from < 240 || w.to - w.from > 480) throw new Error(`segment length ${w.to - w.from}`);
            ok(t >= w.from && t < w.to, `${def.id}: time ${t} is inside its segment`);
            prev = w; t = w.to;
        }
        return kinds;
    };
    const forest = seen(getMap('prologue_forest'));
    ok(forest.has('rain') && forest.has('clear') && forest.has('storm') && !forest.has('snow') && !forest.has('sandstorm'), 'forest weather');
    const summit = seen(getMap('summit_of_despair'));
    ok(summit.has('snow') && !summit.has('rain') && !summit.has('sandstorm'), 'snowy weather');
    const arid = seen(getMap('fire_gate'));
    ok(arid.has('sandstorm') && !arid.has('rain') && !arid.has('snow'), 'arid weather');
    eq([...seen(getMap('hermit_hut'))], ['clear'], 'indoors is always clear');
    eq(W.weatherAt(getMap('hermit_hut'), 99999).id, 'clear', 'indoors at any time');

    eq(W.weatherAt(getMap('prologue_forest'), 7777), W.weatherAt(getMap('prologue_forest'), 7777), 'deterministic');
    eq(W.weatherAt({ id: 'custom', weather: { rain: 1 } }, 5000).id, 'rain', 'a map can set its own table');
    ok([0, 3000, 9000, 20000].some(t => W.weatherAt(getMap('prologue_forest'), t).id !== W.weatherAt(getMap('northern_forest'), t).id
        || W.weatherAt(getMap('prologue_forest'), t).from !== W.weatherAt(getMap('northern_forest'), t).from), 'maps have their own weather');

    eq([W.spellWeatherMult('rain', 'fire'), W.spellWeatherMult('storm', 'lightning'), W.spellWeatherMult('rain', 'ice')], [0.8, 1.2, 1], 'rain dampens fire, feeds lightning');
    eq([W.spellWeatherMult('clear', 'fire'), W.spellWeatherMult('snow', 'lightning'), W.spellWeatherMult('rain', null)], [1, 1, 1], 'no change otherwise');
    ok(W.isWet('rain') && W.isWet('storm') && !W.isWet('snow') && !W.isWet('clear'), 'rain and storms soak');
    eq(W.sightMult('sandstorm'), 0.6, 'sandstorms cut sight');
    eq(W.sightMult('rain'), 1, 'rain does not');
    eq(W.stormStrikeDamage({ min: 1, max: 3 }), 16, 'storm strike damage by band');
    eq([W.RAIN_TICK_MS, W.SNOW_TICK_MS, W.WARM_RADIUS], [10000, 20000, 120], 'tick and warmth constants');
    ok(W.isWarm(0, 0, [{ x: 100, y: 50 }], false), 'near a fire is warm');
    ok(!W.isWarm(0, 0, [{ x: 200, y: 0 }], false), 'far from fires is not');
    ok(W.isWarm(0, 0, [], true), 'Warming keeps you warm');
}

// ---- E2: Warming
{
    const { STATUS_DEFS } = await import('../src/data/statuses.js');
    const { ITEMS } = await import('../src/data/items.js');
    const w = STATUS_DEFS.warming;
    ok(w && w.label === 'Warming' && w.duration === 60000 && w.buff, 'Warming is a 60 s buff');
    const s = new PlayerStats();
    ITEMS.warming_draught.onUse(s);
    ok(s._statusApplyQueue.some(q => q.id === 'warming'), 'a Warming Draught warms you');
    ok(/Warming/.test(ITEMS.warming_draught.description), 'and says so');
}

// ---- E2: rain soaks without dyeing the world blue
{
    const { statusManager } = await import('../src/systems/StatusManager.js');
    const { STATUS_DEFS } = await import('../src/data/statuses.js');
    const ent = () => ({ tints: [], setTint(t) { this.tints.push(t); }, clearTint() { this.tints.push(null); } });
    const a = ent();
    statusManager.apply(a, 'wet', { duration: 15000, quiet: true });
    ok(statusManager.has(a, 'wet'), 'quiet wet still counts');
    ok(!a.tints.includes(STATUS_DEFS.wet.tint), 'but does not tint');
    const b = ent();
    statusManager.apply(b, 'wet', { duration: 15000 });
    ok(b.tints.includes(STATUS_DEFS.wet.tint), 'a soaking spell still tints');
}

console.log(`test_phase5_world: ${n} checks passed`);
