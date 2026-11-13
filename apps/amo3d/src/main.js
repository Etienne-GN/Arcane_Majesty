// Arcane Majesty 3D — boot. Wires the engine (renderer, input, camera, maps, loop), the game
// (an amo character sheet, the player controller, spells, HUD, saving) and the content (maps).
import * as THREE from 'three';
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
import { createHotbar } from './game/hotbar.js';
import { createSkills } from './game/skills.js';
import { createArchery } from './game/archery.js';
import { createGathering } from './game/gathering.js';
import { wornLook } from './game/wardrobe.js';
import { createCampfire, STATION_PROMPT } from './game/campfire.js';
import { createChests } from './game/chest.js';
import { createCharacter } from './content/models/character.js';
import eldrinCast from './content/cast/eldrin.json';
import { setPlatesVisible } from './content/actors/enemyCore.js';
import { createTitle } from './game/title.js';
import { hasSave } from './game/save.js';
import { createOutdoor } from './content/glade.js';
import { createTower } from './content/eldrinTower.js';

// ---- 3D-only tuning (amo's own files are untouched) ----
movementRules.MOVE.SPRINT_DRAIN_PER_S = 7;                              // amo: 20 → ~14 s of sprint instead of 5
const SPELL_TUNING = { rangeMult: 3, speedMult: 1.6, radiusMult: 2 };   // 2D screen distances feel short in 3D

const params = new URLSearchParams(location.search);
const hadSave = hasSave();
if (params.get('new') === '1') deleteSave();
const SHOW_TITLE = params.get('play') !== '1' && params.get('new') !== '1';

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
const savedAt = loadGame(stats);
// Who you play: the campaign plays Eldrin (lore cast); "your own hero" comes from the Forge's creator
// (forge.html?mode=create) and is kept in the save (stats.flags.hero: name, class, look).
if (params.get('hero') === 'new') {
    try { const h = JSON.parse(localStorage.getItem('amo3d.newHero')); if (h?.look) (stats.flags ??= {}).hero = h; } catch { /* none */ }
}
const heroDef = stats.flags?.hero ?? null;
stats.setTalents(heroDef ? talentRules.talentsFor(null, heroDef.classId) : talentRules.talentsFor('eldrin'));   // amo talents: the class, or Eldrin's own
const HERO_NAME = heroDef?.name || eldrinCast.name;
// A new hero starts with their class's kit (amo giveStartKit): the cheapest weapon of the first gifted
// weapon type, a shield if gifted with shields (amo adds the archer kit); only magic classes keep the fireball.
if (params.get('hero') === 'new' && heroDef) {
    const T = talentRules.CLASSES[heroDef.classId]?.talents ?? {};
    const gifted = Object.keys(T).filter(k => T[k] === 'gifted');
    const cheapest = type => Object.values(itemRules.ITEMS)
        .filter(d => d.slot === 'weapon' && weaponRules.typeOf(d) === type)
        .sort((a, b) => (a.tier ?? 1) - (b.tier ?? 1) || (a.buyPrice ?? 0) - (b.buyPrice ?? 0))[0];
    const mainType = gifted.find(t => !['shield', 'fists', 'elemental', 'light', 'dark'].includes(t) && cheapest(t));
    const main = mainType && cheapest(mainType);
    const shield = gifted.includes('shield') && weaponRules.WEAPON_TYPES[mainType]?.hands === 1 ? cheapest('shield') : null;
    if (!gifted.some(g => ['wand', 'staff', 'elemental', 'light', 'dark'].includes(g))) stats.spells.fireball = 0;
    stats.giveStartKit({ weapon: main?.id, offHand: shield?.id });   // archers also get amo's archer kit from this
}
const loot = createLoot({ stats, hud });
const sheet = createSheet({ stats, name: HERO_NAME });
const hotbar = createHotbar({ stats, hud });
const inventory = createInventory({
    stats, hud, hotbar,
    onDrop: id => {   // a dropped item lands in front of Eldrin as a pickup
        const p = player.state;
        loot.drop([{ id, chance: 1 }], p.pos.clone().set(p.pos.x + Math.sin(p.facing) * 1.8, p.pos.y, p.pos.z + Math.cos(p.facing) * 1.8));
    },
});

// The hero's body is rebuilt when what they wear changes (game/wardrobe.js); `hero` always points at it.
const BASE_LOOK = heroDef?.look ?? eldrinCast.look;   // the campaign plays the lore cast
let model = createCharacter(wornLook(BASE_LOOK, stats.equipment));
const hero = {
    get root() { return model.root; },
    update: (...a) => model.update(...a),
    crystalWorld: v => model.crystalWorld(v),
    setWeapons: (a, b) => model.setWeapons(a, b),
    get mainType() { return model.mainType; },
};
function dressHero() {
    const old = model;
    model = createCharacter(wornLook(BASE_LOOK, stats.equipment));
    model.root.rotation.order = 'YXZ';
    model.root.position.copy(old.root.position);
    model.root.rotation.copy(old.root.rotation);
    model.root.visible = old.root.visible;
    old.root.parent?.add(model.root);
    old.root.parent?.remove(old.root);
}
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
        archery?.setScene(map.scene);
        gathering?.setMap(map);
        Object.assign(cam, { yaw: (sp.facing ?? 0) + Math.PI, pitch: map.camera.pitch, dist: map.camera.dist, maxDist: map.camera.maxDist });
        cam.snapTo(player.state.pos);
        world.maps.outdoor?.shadows?.setVisible(id === 'outdoor');
        setPlatesVisible(id === 'outdoor');
        lastLevel = map.levelName?.(player.state.pos.y) ?? '';
        hud.banner(lastLevel ? `${map.name} — ${lastLevel}` : map.name);
        save();
    },
});
const player = createPlayer({ name: HERO_NAME, stats, hero, cam, world, hud, fireballs, spellTuning: SPELL_TUNING });

// What Eldrin holds follows his equipment (amo's equip events).
const ITEMS = itemRules.ITEMS;
const handOf = id => id ? { type: weaponRules.typeOf(ITEMS[id]) === 'fists' && ITEMS[id]?.slot === 'offHand' ? 'shield' : weaponRules.typeOf(ITEMS[id]), accent: ITEMS[id]?.color } : null;
const showWeapons = () => hero.setWeapons(handOf(stats.equipment.weapon), handOf(stats.equipment.offHand));
stats.onEquipChange(slot => { if (slot === 'head' || slot === 'body') { dressHero(); showWeapons(); } });
stats.onEquipChange(showWeapons);
const skills = createSkills({ stats, player, hud, cam, world });
const archery = createArchery({ stats, player, hud, cam, world, loot });
const gathering = createGathering({ stats, hud });
const chests = createChests({ stats, hud });
const campfire = createCampfire({
    stats, hud,
    onRest: () => { stats.health = stats.maxHealth; stats.mana = stats.maxMana; stats.vigor = stats.maxVigor; stats.vigorWinded = false; save(); },
});
hud.ui.prompt.style.pointerEvents = 'auto';   // touch: tap the prompt to gather
hud.ui.prompt.addEventListener('pointerdown', () => input.press('gather'));
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
// ---------- title screen ----------
// While it shows, Eldrin waits out of sight at the foot of his tower (enemies ignore him), the
// camera belongs to the title, and the vale's mood is on.
const title = SHOW_TITLE ? createTitle({
    camera, hasSave: hadSave, quality,
    onNewGame: () => { save(); location.href = `${location.pathname}?new=1&play=1`; },
    onStart: () => { player.state.dead = null; hero.root.visible = true; },
}) : null;
let titleSpot = null;
if (title) {
    titleSpot = player.state.pos.clone();
    player.state.dead = { t: -1e9 };
    hero.root.visible = false;
}
// The game camera's own target, kept fresh during the title's fly-down.
const gameCam = {
    position: new THREE.Vector3(), get target() { return cam.target; },
    update(dt) { const save = camera.position.clone(); cam.update(dt, player.state.pos, 0, world.current.terrain ? world.current.heightAt : null); this.position.copy(camera.position); camera.position.copy(save); },
};

let simT = 0;
function tick(dt) {
    simT += dt;
    if (title?.active) {
        input.poll(dt);   // drain input while the title owns the screen
        title.update(dt, gameCam);
        world.current.update(simT, dt, { player: { pos: title.focus, dead: true, speed: 0 }, camera, fx: world.current.fx ?? fireballs, hurtPlayer: () => false, floater: hud.floater, onKill: player.onKill, dropLoot: loot.drop });
        return;
    }
    const act = input.poll(dt);
    if (act.keys.includes('F2')) { save(); nextQuality(quality); location.reload(); return; }
    if (act.keys.includes('F3')) perf.toggle();
    if (act.inventory) inventory.toggle();
    if (act.sheet) sheet.toggle();
    if (act.hotbar >= 0 && !player.state.dead) hotbar.use(act.hotbar);
    if (act.strike && archery.armed()) { archery.shoot(); act.strike = false; }   // a bow or crossbow shoots instead
    hotbar.update(dt);
    if (act.skill >= 0 && !inventory.open && !sheet.open) skills.use(act.skill);
    skills.update(dt);
    if (inventory.open || sheet.open || campfire.open || chests.open) { hud.update(dt, { stats, player: player.state, camera, spell: FIREBALL }); return; }   // paused
    const map = world.current;
    // Gathering: G / Enter / tap the prompt — and gamepad A next to a node (instead of a hop).
    const pp = player.state.pos;
    const station = (map.stations ?? []).find(st => Math.hypot(st.pos.x - pp.x, st.pos.z - pp.z) < 2.3 && Math.abs(st.pos.y - pp.y) < 1.6);
    const gatherText = station ? STATION_PROMPT[station.mode] : gathering.update(simT * 1000, player.state);
    if (gatherText && (act.gather || (act.hop && input.device === 'gamepad'))) {
        if (station?.mode === 'chest') chests.toggle(station.key, station.title);
        else if (station) campfire.toggle(station.mode);
        else gathering.harvest(simT * 1000);
        act.hop = false;
    }
    let lift = 0;
    const ctx = { player: player.state, camera, fx: world.current.fx ?? fireballs, hurtPlayer: player.hurt, floater: hud.floater, onKill: player.onKill, dropLoot: loot.drop };
    if (!world.step(dt)) lift = player.step(dt, act, ctx);
    const p = player.state;
    cam.update(dt, p.pos, lift, map.terrain ? map.heightAt : null);
    if (gatherText && !hud.ui.prompt.textContent) { hud.ui.prompt.textContent = gatherText; hud.ui.prompt.style.opacity = 1; }
    if (map.levelName && !p.hop && p.vy === 0) {
        const lv = map.levelName(p.pos.y);
        if (lv !== lastLevel) { hud.banner(`${map.name} — ${lv}`); lastLevel = lv; }
    }
    map.update(simT, dt, ctx);
    fireballs.update(dt, map, map.hittables);
    loot.update(dt, player.state, map);
    archery.update(dt);
    hud.update(dt, { stats, player: p, camera, spell: FIREBALL });
    if (archery.armed()) hud.ui.speed.textContent += ` · ${archery.ready()} ready (+${archery.spare()} in the satchel)`;
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
    loot, inventory, sheet, hotbar, skills, archery, title, gathering, campfire, chests, player: player.state, playerApi: player,
};
