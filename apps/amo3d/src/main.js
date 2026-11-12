// Arcane Majesty 3D — boot. Wires the engine (renderer, input, camera, maps, loop), the game
// (an amo character sheet, the player controller, spells, HUD, saving) and the content (maps).
import { movementRules, PlayerStats as PS, items as itemRules, weapons as weaponRules, talents as talentRules } from '@rules';
import { pickQuality, nextQuality } from './engine/quality.js';
import { createRenderer } from './engine/renderer.js';
import { createOrbitCamera } from './engine/camera.js';
import { createInput } from './engine/input.js';
import { createTouchControls } from './engine/touch.js';
import { createMapManager } from './engine/maps.js';
import { createPerf } from './engine/perf.js';
import { startLoop } from './engine/loop.js';
import { createHud } from './game/hud.js';
import { createPlayer, PX } from './game/player.js';
import { createFireballs, FIREBALL } from './game/fireball.js';
import { loadGame, saveGame, deleteSave } from './game/save.js';
import { createLoot } from './game/loot.js';
import { createInventory } from './game/inventory.js';
import { createSheet } from './game/sheet.js';
import { createCharacter } from './content/models/eldrin.js';
import { createOutdoor } from './content/glade.js';
import { createTower } from './content/eldrinTower.js';

// ---- 3D-only tuning (amo's own files are untouched) ----
movementRules.MOVE.SPRINT_DRAIN_PER_S = 7;                              // amo: 20 → ~14 s of sprint instead of 5
const SPELL_TUNING = { rangeMult: 3, speedMult: 1.6, radiusMult: 2 };   // 2D screen distances feel short in 3D

const params = new URLSearchParams(location.search);
if (params.get('new') === '1') deleteSave();

// ---------- engine ----------
const quality = pickQuality();
const { renderer, camera } = createRenderer(quality);
const cam = createOrbitCamera(camera);
const input = createInput({ canvas: renderer.domElement, cam });
createTouchControls({ input, cam });
const perf = createPerf(renderer, quality);
const hud = createHud();

// ---------- the hero: an amo character sheet ----------
const stats = new PS.PlayerStats();
stats.attributes.agility = 10;
stats.attributes.intelligence = 12;
stats.maxMana = 10 + stats.attributes.intelligence * 8;   // amo's formula, re-derived after setting INT
stats.mana = stats.maxMana;
stats.vigor = stats.maxVigor;
stats.learnSpell('fireball');
stats.setTalents(talentRules.talentsFor('eldrin'));   // amo: gifted wand, staff, elemental; trained bo, light, dark
const savedAt = loadGame(stats);
const loot = createLoot({ stats, hud });
const sheet = createSheet({ stats });
const inventory = createInventory({
    stats, hud,
    onDrop: id => {   // a dropped item lands in front of Eldrin as a pickup
        const p = player.state;
        loot.drop([{ id, chance: 1 }], p.pos.clone().set(p.pos.x + Math.sin(p.facing) * 1.8, p.pos.y, p.pos.z + Math.cos(p.facing) * 1.8));
    },
});

const hero = createCharacter();
const fireballs = createFireballs({
    PX, tuning: SPELL_TUNING,
    onDamage: (pos, dmg, killed, burning) => hud.floater(pos, `${dmg}${burning ? ' 🔥' : ''}${killed ? ' ✝' : ''}`, killed ? '#ffd27a' : '#ff8a4a'),
    onShake: a => cam.kick(a),
});

// ---------- maps ----------
let lastLevel = '';
const world = createMapManager({
    builders: { outdoor: () => createOutdoor({ quality }), tower: createTower },
    fade: hud.ui.fade, fadeText: hud.ui.fadeText,
    onEnter(map, id, sp) {
        player.place(sp);
        fireballs.setScene(map.scene);
        loot.clear();
        loot.setScene(map.scene);
        Object.assign(cam, { yaw: (sp.facing ?? 0) + Math.PI, pitch: map.camera.pitch, dist: map.camera.dist, maxDist: map.camera.maxDist });
        cam.snapTo(player.state.pos);
        world.maps.outdoor?.shadows?.setVisible(id === 'outdoor');
        lastLevel = map.levelName?.(player.state.pos.y) ?? '';
        hud.banner(lastLevel ? `${map.name} — ${lastLevel}` : map.name);
        save();
    },
});
const player = createPlayer({ stats, hero, cam, world, hud, fireballs, spellTuning: SPELL_TUNING });

// What Eldrin holds follows his equipment (amo's equip events).
const ITEMS = itemRules.ITEMS;
const handOf = id => id ? { type: weaponRules.typeOf(ITEMS[id]) === 'fists' && ITEMS[id]?.slot === 'offHand' ? 'shield' : weaponRules.typeOf(ITEMS[id]), accent: ITEMS[id]?.color } : null;
const showWeapons = () => hero.setWeapons(handOf(stats.equipment.weapon), handOf(stats.equipment.offHand));
stats.onEquipChange(showWeapons);
showWeapons();

// ---------- saving ----------
function save() {
    const p = player.state;
    if (p.dead || !world.current) return false;
    return saveGame(stats, { map: world.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, facing: p.facing });
}
setInterval(save, 20000);
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ---------- loop ----------
let simT = 0;
function tick(dt) {
    simT += dt;
    const act = input.poll(dt);
    if (act.keys.includes('F2')) { save(); nextQuality(quality); location.reload(); return; }
    if (act.keys.includes('F3')) perf.toggle();
    if (act.inventory) inventory.toggle();
    if (act.sheet) sheet.toggle();
    if (inventory.open || sheet.open) { hud.update(dt, { stats, player: player.state, camera, spell: FIREBALL }); return; }   // paused
    const map = world.current;
    let lift = 0;
    const ctx = { player: player.state, camera, fx: world.current.fx ?? fireballs, hurtPlayer: player.hurt, floater: hud.floater, onKill: player.onKill, dropLoot: loot.drop };
    if (!world.step(dt)) lift = player.step(dt, act, ctx);
    const p = player.state;
    cam.update(dt, p.pos, lift, map.terrain ? map.heightAt : null);
    if (map.levelName && !p.hop && p.vy === 0) {
        const lv = map.levelName(p.pos.y);
        if (lv !== lastLevel) { hud.banner(`${map.name} — ${lv}`); lastLevel = lv; }
    }
    map.update(simT, dt, ctx);
    fireballs.update(dt, map, map.hittables);
    loot.update(dt, player.state, map);
    hud.update(dt, { stats, player: p, camera, spell: FIREBALL });
}

if (savedAt && world.maps && ['outdoor', 'tower'].includes(savedAt.map)) world.enter(savedAt.map, null, savedAt);
else world.enter('outdoor', 'start');
const loop = startLoop({ renderer, tick, render: () => { renderer.render(world.current.scene, camera); perf.frame(); } });

// Handle for headless checks.
window.__poc = {
    player: player.state, stats, input, cam, quality, save,
    advance: s => loop.advance(s),
    hurtPlayer: player.hurt,
    keys: input.keys,
    get maps() { return world.maps; },
    get map() { return world.current; },
    enterMap: (id, sp) => world.enter(id, sp),
    cast: () => input.press('cast'),
    strike: () => input.press('strike'),
    loot, inventory, sheet,
};
