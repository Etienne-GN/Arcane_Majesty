// Phase 1 foundations: save slots, location/respawn, world state, level
// bands, enemy respawn rule, area spell radius. Run: node tools/test_foundations.mjs
import assert from 'node:assert';

const store = new Map();
globalThis.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
};

const { PlayerStats } = await import('../src/systems/PlayerStats.js');
const { SaveManager } = await import('../src/systems/SaveManager.js');
const R = await import('../src/systems/respawn.js');
const WS = await import('../src/systems/WorldState.js');
const LB = await import('../src/data/levelBands.js');
const { getMap } = await import('../src/data/maps/index.js');
const { SPELLS } = await import('../src/data/spells.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };
const eq = (a, b, msg) => { assert.deepStrictEqual(a, b, msg); n++; };

// ---- F0: saves without ids go to the active slot
{
    store.clear();
    SaveManager.setSlot('story1', 'eldrin');
    eq(SaveManager.slot(), { storyId: 'story1', characterId: 'eldrin' }, 'slot remembered');
    const s = new PlayerStats();
    s.glint = 77;
    ok(SaveManager.save(s), 'save without ids succeeds');
    ok(store.has('amo_save_story1_eldrin'), 'it lands in the active slot');
    ok(!store.has('amo_save_undefined_undefined'), 'not in the undefined slot');
    const t = new PlayerStats();
    ok(SaveManager.load(t, 'story1', 'eldrin'), 'loads back');
    eq(t.glint, 77, 'same data');
    SaveManager.setSlot(null, null);
    SaveManager.load(new PlayerStats(), 'story1', 'eldrin');
    eq(SaveManager.slot(), { storyId: 'story1', characterId: 'eldrin' }, 'load sets the active slot');
}

// ---- A1: continue / respawn targets and the death penalty
{
    const s = new PlayerStats();
    eq(s.location, null, 'no location on a new character');
    eq(s.respawnPoint, null, 'no respawn point on a new character');
    eq(R.continueTarget(s), { mapId: undefined, spawnX: undefined, spawnY: undefined }, 'no location → default map');
    s.location = { mapId: 'summit_of_despair', x: 100, y: 200 };
    eq(R.continueTarget(s), { mapId: 'summit_of_despair', spawnX: 100, spawnY: 200 }, 'continue resumes the location');
    eq(R.continueTarget(s, () => false), { mapId: undefined, spawnX: undefined, spawnY: undefined }, 'a vanished map falls back');

    eq(R.respawnTarget(s, 'summit_of_despair'), { mapId: 'summit_of_despair', spawnX: undefined, spawnY: undefined, label: null }, 'no respawn point → death map start');
    R.setRespawnPoint(s, 'prologue_forest', 640.4, 288.6, 'the campfire');
    eq(s.respawnPoint, { mapId: 'prologue_forest', x: 640, y: 289, label: 'the campfire' }, 'respawn point rounded');
    eq(R.respawnTarget(s, 'summit_of_despair'), { mapId: 'prologue_forest', spawnX: 640, spawnY: 289, label: 'the campfire' }, 'respawn at the point');
    eq(R.respawnTarget(s, 'summit_of_despair', id => id !== 'prologue_forest').mapId, 'summit_of_despair', 'vanished respawn map → death map');

    s.glint = 95; s.health = 0; s.mana = 3;
    eq(R.applyDeathPenalty(s), { glintLost: 9 }, 'lose 10% of glint, rounded down');
    eq(s.glint, 86, 'glint reduced');
    eq(s.health, Math.ceil(s.maxHealth * 0.5), 'back at half HP');
    eq(s.mana, s.maxMana, 'full MP');
    s.glint = 0;
    eq(R.applyDeathPenalty(s).glintLost, 0, 'no glint, no loss');
    ok(s.glint === 0 && s.health >= 1, 'never negative, at least 1 HP');

    ok(R.canRespawnAt({ x: 0, y: 0 }, { x: 400, y: 0 }), 'far player → respawn');
    ok(!R.canRespawnAt({ x: 0, y: 0 }, { x: 100, y: 50 }), 'player nearby → wait');
}

// ---- A1: location and respawn point survive a save; legacy saves load
{
    store.clear();
    SaveManager.setSlot('s', 'eldrin');
    const s = new PlayerStats();
    s.location = { mapId: 'prologue_forest', x: 10, y: 20 };
    R.setRespawnPoint(s, 'prologue_forest', 30, 40, 'Rift-Gate');
    SaveManager.save(s);
    const t = new PlayerStats();
    SaveManager.load(t, 's', 'eldrin');
    eq(t.location, { mapId: 'prologue_forest', x: 10, y: 20 }, 'location saved');
    eq(t.respawnPoint, { mapId: 'prologue_forest', x: 30, y: 40, label: 'Rift-Gate' }, 'respawn point saved');
    const legacy = JSON.parse(store.get('amo_save_s_eldrin'));
    delete legacy.location; delete legacy.respawnPoint;
    store.set('amo_save_s_eldrin', JSON.stringify(legacy));
    const u = new PlayerStats();
    ok(SaveManager.load(u, 's', 'eldrin'), 'a legacy save loads');
    eq([u.location, u.respawnPoint], [null, null], 'missing fields default to null');
    u.location = { mapId: 'x', x: 1, y: 1 };
    u.reset();
    eq([u.location, u.respawnPoint], [null, null], 'a new game clears them');
}

// ---- A3: world state
{
    const s = new PlayerStats();
    eq(s.worldState, {}, 'empty world state on a new character');
    const key = WS.nodeKey({ x: 8, y: 6, type: 'herb' });
    eq(key, '8,6', 'node key from its tile');
    WS.markNodeHarvested(s, 'prologue_forest', key, 1000, 150000);
    eq(WS.nodeRegrowRemaining(s, 'prologue_forest', key, 1000, 150000), 150000, 'full regrow right after harvest');
    eq(WS.nodeRegrowRemaining(s, 'prologue_forest', key, 101000, 150000), 50000, 'counts down in real time');
    eq(WS.nodeRegrowRemaining(s, 'prologue_forest', key, 999999, 150000), 0, 'ready again');
    eq(WS.nodeRegrowRemaining(s, 'prologue_forest', key, -5e9, 150000), 150000, 'a clock jump back never locks it longer than its regrow');
    eq(WS.nodeRegrowRemaining(s, 'other_map', key, 1000, 150000), 0, 'other maps unaffected');
    ok(!WS.isBossDefeated(s, 'prologue_forest'), 'boss alive');
    WS.markBossDefeated(s, 'prologue_forest');
    ok(WS.isBossDefeated(s, 'prologue_forest'), 'boss defeated');
    const pruned = WS.prunedWorldState(s, 999999);
    eq(pruned.prologue_forest.nodes, {}, 'expired node timers pruned');
    ok(pruned.prologue_forest.bossDefeated, 'boss flag kept');

    store.clear();
    SaveManager.setSlot('w', 'eldrin');
    WS.markNodeHarvested(s, 'prologue_forest', '1,1', Date.now(), 600000);
    SaveManager.save(s);
    const t = new PlayerStats();
    SaveManager.load(t, 'w', 'eldrin');
    ok(WS.isBossDefeated(t, 'prologue_forest'), 'boss flag saved');
    ok(WS.nodeRegrowRemaining(t, 'prologue_forest', '1,1', Date.now(), 600000) > 0, 'pending node saved');
    t.reset();
    eq(t.worldState, {}, 'a new game forgets the world');
}

// ---- A2: level bands and scaling
{
    eq(LB.mapLevelBand(getMap('prologue_forest')), { min: 1, max: 3 }, 'outside the campaign → 1–3');
    eq(LB.mapLevelBand(getMap('echoes_of_stone')), { min: 1, max: 3 }, 'chapter 1 → 1–3');
    eq(LB.mapLevelBand(getMap('summit_of_despair')), { min: 7, max: 9 }, 'chapter 4 → 7–9');
    eq(LB.mapLevelBand({ id: 'x', levelBand: { min: 12, max: 14 } }), { min: 12, max: 14 }, 'a map can set its own band');
    eq(LB.mapLevelBand(null), { min: 1, max: 3 }, 'no map → 1–3');
    eq(LB.rollEnemyLevel({ min: 7, max: 9 }, () => 0), 7, 'roll low');
    eq(LB.rollEnemyLevel({ min: 7, max: 9 }, () => 0.9999), 9, 'roll high');
    const base = { health: 100, damage: 10, xpReward: 50, goldDrop: 10 };
    eq(LB.scaleEnemyStats(base, 1), base, 'level 1 is the base creature');
    eq(LB.scaleEnemyStats(base, 5), { health: 160, damage: 14, xpReward: 74, goldDrop: 14 }, 'level 5 scaling');
    ok(Math.abs(LB.levelDamageMult(5) - 1.4) < 1e-9, 'spell damage scales like melee');
}

// ---- B5: area spells have a cast distance and an area size
{
    const aoe = Object.values(SPELLS).filter(sp => sp.targetingType === 'targeted_aoe');
    ok(aoe.length > 20, 'there are area spells');
    for (const sp of aoe) {
        ok(Array.isArray(sp.radius) && sp.radius.length === 3, `${sp.id}: radius per tier`);
        ok(Array.isArray(sp.range) && sp.range.length === 3, `${sp.id}: range per tier`);
        for (let i = 0; i < 3; i++) ok(sp.range[i] >= sp.radius[i], `${sp.id}: tier ${i + 1} cast distance ≥ area`);
    }
    eq(SPELLS.fireball.radius, [40, 48, 56], 'Fireball keeps its blast');
    eq(SPELLS.fire_nova.radius, [80, 90, 105], 'Fire Nova keeps its area');
    eq(SPELLS.fire_nova.range, [160, 180, 200], 'and can now be thrown further');
}

// ---- final review fixes
{
    // Death is settled when it happens (not only on "Rise"): penalty paid, saved location moved
    const s = new PlayerStats();
    s.glint = 50;
    s.location = { mapId: 'summit_of_despair', x: 300, y: 300 };
    R.setRespawnPoint(s, 'prologue_forest', 640, 288, 'the campfire');
    const d = R.resolveDeath(s, 'summit_of_despair');
    eq(d.glintLost, 5, 'penalty paid at death');
    eq(d.target, { mapId: 'prologue_forest', spawnX: 640, spawnY: 288, label: 'the campfire' }, 'rise target');
    eq(s.location, { mapId: 'prologue_forest', x: 640, y: 288 }, 'saved location is the rise point, not the death spot');
    const n0 = new PlayerStats();
    n0.location = { mapId: 'summit_of_despair', x: 300, y: 300 };
    R.resolveDeath(n0, 'summit_of_despair');
    eq(R.continueTarget(n0), { mapId: 'summit_of_despair', spawnX: undefined, spawnY: undefined }, 'no respawn point → Continue at the death map start');
    // Online keeps the old behaviour
    const on = new PlayerStats();
    on.glint = 50; on.location = null;
    R.setRespawnPoint(on, 'prologue_forest', 1, 2, 'x');
    const od = R.resolveDeath(on, 'summit_of_despair', () => true, { online: true });
    eq(od.glintLost, 0, 'online: no penalty');
    eq(on.glint, 50, 'online: glint untouched');
    eq(od.target.mapId, undefined, 'online: default map as before');

    // Area size helper: Earth Pillar's area is its radius, not its cast distance
    eq(SPELLS.earth_pillar.radius, [70, 85, 100], 'earth pillar area kept');
    const { spellRadius } = await import('../src/data/spells.js');
    eq(spellRadius(SPELLS.earth_pillar, 1), 70, 'spellRadius reads the area');
    eq(spellRadius(SPELLS.fireball, 3), 56, 'spellRadius per tier');
    eq(spellRadius(SPELLS.counterspell, 1), SPELLS.counterspell.range[0], 'no radius → range');

    // Scene wiring that node can't run: check the source
    const fs = await import('node:fs');
    const gs = fs.readFileSync(new URL('../src/scenes/GameScene.js', import.meta.url), 'utf8');
    const pillar = gs.slice(gs.indexOf('_earthPillarAssault(tx, ty) {'), gs.indexOf('_earthPillarAssault(tx, ty) {') + 400);
    ok(!pillar.includes('earth_pillar.range'), "Earth Pillar's assault uses its area, not its cast distance");
    ok(/if \(node\.gathered && node\.body\) node\.disableBody/.test(gs), 'a node that already regrew is not disabled by the late hide');
    ok(/spawns\.boss && \(this\._serverUrl \|\| !isBossDefeated/.test(gs), 'online ignores the offline boss flag');
    const go = fs.readFileSync(new URL('../src/scenes/GameOverScene.js', import.meta.url), 'utf8');
    ok(/create\(\)[\s\S]*resolveDeath\(/.test(go) && !/_tryAgain\(\)[\s\S]*applyDeathPenalty/.test(go), 'death is settled on the Game Over screen, for both buttons');
}

console.log(`✓ foundations tests passed (${n} assertions).`);
