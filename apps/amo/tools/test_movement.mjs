// W1 movement: Vigor, sprint speed, hop landing, hoppable decorations.
// Run: node tools/test_movement.mjs
import assert from 'node:assert';

const M = await import('../src/systems/movementRules.js');
const { MOVE } = M;

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- Vigor
{
    eq(M.vigorMax(5), 100, 'low agility: 100');
    eq(M.vigorMax(10), 100, 'agility 10: still 100');
    eq(M.vigorMax(15), 110, '+2 per agility above 10');

    const s = { vigor: 100, maxVigor: 100, vigorWinded: false, _vigorIdleMs: 0 };
    M.tickVigor(s, 1000, true);
    eq(s.vigor, 80, 'sprinting drains 20/s');
    eq(s._vigorIdleMs, 0, 'spending resets the regen delay');
    M.tickVigor(s, 500, false);
    eq(s.vigor, 80, 'no regen before 0.8 s idle');
    M.tickVigor(s, 500, false);
    ok(s.vigor > 80 && s.vigor <= 85, 'regen starts after the delay (25/s)');
    M.tickVigor(s, 10000, false);
    eq(s.vigor, 100, 'regen caps at max');

    const w = { vigor: 5, maxVigor: 100, vigorWinded: false, _vigorIdleMs: 0 };
    M.tickVigor(w, 1000, true);
    eq(w.vigor, 0, 'never below zero');
    ok(w.vigorWinded, 'empty → winded');
    ok(!M.canSprint(w), 'winded cannot sprint');
    M.tickVigor(w, 800, false);
    M.tickVigor(w, 1000, false);
    ok(w.vigor >= 25 && w.vigorWinded, 'still winded below 30');
    M.tickVigor(w, 400, false);
    ok(w.vigor >= 30 && !w.vigorWinded, 'winded clears at 30');
    ok(M.canSprint(w), 'can sprint again');

    const t = { vigor: 0, maxVigor: 100, vigorWinded: true, _vigorIdleMs: 0 };
    M.tickVigor(t, 1000, true);
    eq(t._vigorIdleMs, 1000, 'holding Shift while winded does not block regen');
}

// ---- Hop cost
{
    const s = { vigor: 30, maxVigor: 100, vigorWinded: false, _vigorIdleMs: 500 };
    ok(M.spendHop(s), 'a hop with enough vigor');
    eq(s.vigor, 5, 'costs 25');
    eq(s._vigorIdleMs, 0, 'resets the regen delay');
    ok(!M.spendHop(s), 'refused below 25');
    eq(s.vigor, 5, 'a refused hop costs nothing');
    const exact = { vigor: 25, maxVigor: 100, vigorWinded: true, _vigorIdleMs: 0 };
    ok(M.spendHop(exact), 'winded but with 25: hop allowed');
    ok(exact.vigorWinded, 'still winded after');
}

// ---- Speed
{
    eq(M.moveSpeed(120, 0, 1, false), 120, 'walk');
    eq(M.moveSpeed(120, 0, 1, true), 192, 'sprint ×1.6');
    eq(M.moveSpeed(120, 0, 0.5, true), 96, 'a slow stacks with sprint');
    eq(M.moveSpeed(120, 1, 1, false), 30, 'fatigue still applies (×0.25 at full fatigue)');
}

// ---- Hop landing. Grid of 32px cells: '#' wall, 'f' hoppable (fence), '.' open.
{
    const grid = [
        '..........',
        '..#.......',
        '...f......',
        '....ff....',
        '..........',
    ];
    const blockedAt = (x, y) => {
        const c = grid[Math.floor(y / 32)]?.[Math.floor(x / 32)];
        if (c === undefined || c === '#') return 'wall';
        return c === 'f' ? 'hop' : null;
    };
    const at = (cx, cy) => ({ x: cx * 32 + 16, y: cy * 32 + 16 });
    const R = { x: 1, y: 0 }, L = { x: -1, y: 0 }, D = { x: 0, y: 1 };

    eq(M.hopLanding(at(0, 0), R, blockedAt), 64, 'open ground: full 2 tiles');
    eq(M.hopLanding(at(2, 2), R, blockedAt), 64, 'over a fence onto open ground');
    eq(M.hopLanding(at(4, 3), R, blockedAt), 64, 'over a double fence from inside the first (start is a hop cell)');
    eq(M.hopLanding(at(1, 1), R, blockedAt), 0, 'a wall right ahead: hop in place');
    eq(M.hopLanding(at(4, 1), L, blockedAt), 48, 'never past a wall: lands short of it');
    eq(blockedAt(at(4, 1).x - 48, at(4, 1).y), null, 'the short landing is open');
    eq(M.hopLanding(at(9, 0), R, blockedAt), 0, 'map edge counts as wall');
    eq(M.hopLanding(at(4, 2), { x: 0, y: 0 }, blockedAt), 0, 'no direction: in place');
    eq(M.hopLanding(at(4, 2), D, blockedAt), 64, 'down over the fence row');
    eq(M.hopLanding(at(4, 1), D, blockedAt), 32, 'never lands on a fence: stops short of the row');
    const diag = M.hopLanding(at(0, 0), { x: 1, y: 1 }, blockedAt);
    ok(diag === 0 || diag % 16 === 0, 'diagonal distances are whole steps');
}

// ---- Hoppable decorations
{
    for (const name of ['fence_wood_left_right', 'fence_wood_up_down', 'wood_post_fence_double_post', 'log_hollow_horizontal',
        'log_single_fallen', 'stump_small', 'rock_small_tan', 'small_stone_nub', 'crate_wood_light', 'market_crate_tomato']) {
        ok(M.isHoppableDecoration({ name, x: 0, y: 0 }, null), `${name} is hoppable`);
    }
    for (const name of ['iron_fence_shell_medallion_panel_b', 'stump_big', 'barrel_dark', 'stone_fountain', 'oak_tree_a']) {
        ok(!M.isHoppableDecoration({ name, x: 0, y: 0 }, null), `${name} is not hoppable`);
    }
    ok(!M.isHoppableDecoration({ name: 'fence_wood_up_down', x: 0, y: 0, hoppable: false }, null), 'placement can opt out');
    ok(M.isHoppableDecoration({ name: 'barrel_dark', x: 0, y: 0, hoppable: true }, null), 'placement can opt in');
    ok(M.isHoppableDecoration({ name: 'stone_fountain', x: 0, y: 0 }, { hoppable: true }), 'catalogue entry can opt in');
    ok(M.isHoppableDecoration({ name: 'water_edge_n', x: 4, y: 7 }, null, new Set(['4,7'])), 'a hop cell makes its decoration hoppable');
    ok(!M.isHoppableDecoration({ name: 'water_edge_n', x: 4, y: 8 }, null, new Set(['4,7'])), 'other cells are not');
}

// ---- PlayerStats + save
{
    const store = new Map();
    globalThis.localStorage = {
        getItem: k => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => store.set(k, String(v)),
        removeItem: k => store.delete(k),
    };
    const { PlayerStats } = await import('../src/systems/PlayerStats.js');
    const { SaveManager } = await import('../src/systems/SaveManager.js');
    const s = new PlayerStats();
    eq(s.maxVigor, M.vigorMax(s.attributes.agility), 'max Vigor from agility');
    eq(s.vigor, s.maxVigor, 'a new character starts full');
    eq(s.vigorWinded, false, 'not winded');
    ok(s.attributes.stamina !== undefined, 'the Stamina attribute is untouched');
    s.attributes.agility = 20;
    eq(s.maxVigor, 120, 'max follows agility live');

    s.vigor = 3; s.vigorWinded = true;
    s.reset();
    eq([s.vigor, s.vigorWinded], [s.maxVigor, false], 'reset refills');

    const save = new PlayerStats();
    save.skills.blink_step.level = 2;
    SaveManager.save(save, 'story_test', 'eldrin');
    const loaded = new PlayerStats();
    loaded.vigor = 1; loaded.vigorWinded = true;
    SaveManager.load(loaded, 'story_test', 'eldrin');
    eq([loaded.vigor, loaded.vigorWinded], [loaded.maxVigor, false], 'loading starts full');
    eq(loaded.skills.blink_step.level, 2, 'Blink-Step level survives');
}

console.log(`test_movement: ${n} checks passed`);
