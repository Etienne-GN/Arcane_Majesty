// Arcane Majesty 3D — boot. Wires the engine (renderer, input, camera, maps, loop), the game
// (an amo character sheet, the player controller, spells, HUD, saving) and the content (maps).
import * as THREE from 'three';
import { gameClock as clockRules, weather as weatherRules, eastRoadMap, thaloriaMap } from '@rules';
import { movementRules, PlayerStats as PS, items as itemRules, weapons as weaponRules, talents as talentRules } from '@rules';
import { pickQuality, nextQuality, setQualityName } from './engine/quality.js';
import { settings } from './engine/settings.js';
import { createOptions } from './game/options.js';
import { createPadNav } from './engine/padnav.js';
import { createNet } from './game/net.js';
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
import { loadGame, saveGame, deleteSave, activeSlot, setActiveSlot, firstEmptySlot, slotInfo } from './game/save.js';
import { createSlots } from './game/slots.js';
import { createLoot } from './game/loot.js';
import { createInventory } from './game/inventory.js';
import { createSheet } from './game/sheet.js';
import { createHotbar } from './game/hotbar.js';
import { createSkills } from './game/skills.js';
import { createArchery } from './game/archery.js';
import { createGathering } from './game/gathering.js';
import { wornLook } from './game/wardrobe.js';
import { createMapView } from './game/mapview.js';
import { createTravel } from './game/travel.js';
import { createDialogue } from './game/dialogue.js';
import { createShop } from './game/shop.js';
import { createQuests } from './game/quests.js';
import { createCodex } from './game/codex.js';
import { buildRegion } from './engine/region.js';
// Every region file is a map (content/regions/*.json → buildRegion).
const REGIONS = Object.fromEntries(Object.values(import.meta.glob('./content/regions/*.json', { eager: true, import: 'default' })).map(d => [d.id, d]));
import { sweepPlates, hideAllPlates } from './content/actors/enemyCore.js';
import { createCampfire, STATION_PROMPT } from './game/campfire.js';
import { createBountyBoard } from './game/bounty.js';
import { createChests } from './game/chest.js';
import { createCharacter } from './content/models/character.js';
import eldrinCast from './content/cast/eldrin.json';
import { setPlatesVisible } from './content/actors/enemyCore.js';
import { createTitle } from './game/title.js';
import { hasSave } from './game/save.js';
import { createOutdoor } from './content/glade.js';
import { createTower } from './content/eldrinTower.js';
import { createThaloria, INTERIOR_IDS } from './content/thaloria.js';
import { createEastRoad, EAST_ROAD_GATES } from './content/eastRoad.js';
import { createMountain } from './content/mountain.js';
import { createSanctuary, registerSanctuaryQuests } from './content/sanctuary.js';
import { createInterior } from './content/interior.js';
import THALORIA_DOORS from '../../amo/src/data/maps/interiors/doors.json';
// amo's Thaloria interiors, each built on first entry; inner doors (the inn's cellar) lead on and back.
const INTERIORS = Object.fromEntries(Object.entries(import.meta.glob(['../../amo/src/data/maps/interiors/thaloria_*.js', '../../amo/src/data/maps/interiors/east_road_cave.js'], { eager: true, import: 'MAP' }))
    .map(([path, def]) => [path.split('/').pop().replace('.js', ''), def]));
const parentOf = {};
for (const d of THALORIA_DOORS.thaloria ?? []) if (INTERIORS[d.interior]) { INTERIOR_IDS.add(d.interior); parentOf[d.interior] = { map: 'thaloria', spawn: `door:${d.interior}` }; }
for (const d of THALORIA_DOORS.east_road ?? []) if (INTERIORS[d.interior]) parentOf[d.interior] = { map: 'east_road', spawn: `door:${d.interior}` };   // the Hollow
for (const [id, def] of Object.entries(INTERIORS)) for (const d of def.spawns?.doors ?? []) if (INTERIORS[d.interior]) parentOf[d.interior] = { map: id, spawn: `door:${d.interior}` };
const interiorBuilders = Object.fromEntries(Object.keys(parentOf).map(id => [id, () => createInterior({
    id, def: INTERIORS[id], exitTo: parentOf[id],
    innerDoors: Object.fromEntries((INTERIORS[id].spawns?.doors ?? []).filter(d => parentOf[d.interior]).map(d => [d.interior, d.interior])),
})]));

// ---- 3D-only tuning (amo's own files are untouched) ----
// Eldrin's own staff and coat, as items you can take off (and put back on).
Object.assign(itemRules.ITEMS, {
    eldrin_staff: { id: 'eldrin_staff', name: "Eldrin's Staff", description: 'Ash wood bound in old silver, a pale crystal at its head. The focus he has carried since the tower. +2 INT.',
        color: 0x6a4a2e, icon: 'itm_wand_01', stackable: false, slot: 'weapon', tier: 1, weaponType: 'staff', rarity: 'uncommon', stats: { intelligence: 2 }, buyPrice: 0, sellPrice: 0,
        onUse: st => st.equipItem('eldrin_staff') },
    eldrin_coat: { id: 'eldrin_coat', name: "Eldrin's Coat", description: 'A long red scholar\'s coat with a high collar and gold trim, over a dark vest. Worn at every desk and on every road.',
        color: 0xa3141f, icon: 'itm_mantua', stackable: false, slot: 'body', tier: 1, rarity: 'uncommon', keepsLook: true, stats: {}, buyPrice: 0, sellPrice: 0,
        onUse: st => st.equipItem('eldrin_coat') },
});
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
const stats = PS.playerStats;   // amo's shared character sheet (amo's questManager works on it)
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
// ---- a hero of your own (the creator): a newcomer to Thaloria, not Eldrin ----
// Wakes at the inn; a letter grants them the empty fine house on the guild road (thaloria_house_noble_c,
// where no resident lives) — their home and respawn point. Eldrin's Tower is barred to them, Eldrin
// finds their house locked, and Malphas cannot be beaten yet. Eldrin's story quests do not start.
const CUSTOM = !!heroDef;
const PLAYER_HOME = 'thaloria_house_noble_c';
function lockDoors(map, id) {
    for (const t of map.triggers ?? []) {
        if (t.to === 'tower' || t._was === 'tower') {
            if (CUSTOM) { t._was = 'tower'; t.to = null; t.label = "Eldrin's Tower — the door is barred"; }
        }
        if (t.to === PLAYER_HOME || t._was === PLAYER_HOME) {
            t._was = PLAYER_HOME;
            if (CUSTOM && stats.flags.newcomer) {
                t.to = PLAYER_HOME; t.label = 'Your house';
                const lm = map.mapInfo?.landmarks;   // on the map and minimap too
                if (lm && !lm.some(l => l.name === 'Your house')) { lm.push({ name: 'Your house', x: t.x, z: t.z, icon: 'tower', always: true }); map._mapArtStale = true; }
            }
            else { t.to = null; t.label = CUSTOM ? 'A fine house — the door is locked (for now)' : 'A fine house — locked'; }
        }
    }
}
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
const loot = createLoot({ stats, hud, onPickup: id => quests?.onPickup(id) });
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
    builders: {
        outdoor: () => createOutdoor({ quality }), tower: createTower, thaloria: () => createThaloria({ quality }),
        ...interiorBuilders,
        east_road: () => createEastRoad({ quality }),
        the_summit: () => createMountain({ quality }),
        sylvan_sanctuary: () => createSanctuary({ quality }),
        ...Object.fromEntries(Object.keys(REGIONS).filter(id => !REGIONS[id].builder).map(id => [id, () => buildRegion(REGIONS[id], { quality })])),   // regions with a builder (the Sanctuary) keep their own code
    },
    fade: hud.ui.fade, fadeText: hud.ui.fadeText,
    onEnter(map, id, sp) {
        player.place(sp);
        fireballs.setScene(map.scene);
        loot.clear();
        loot.setScene(map.scene);
        archery?.setScene(map.scene);
        gathering?.setMap(map);
        mapView?.setMap(map, id);
        Object.assign(cam, { yaw: (sp.facing ?? 0) + Math.PI, pitch: map.camera.pitch, dist: map.camera.dist, maxDist: map.camera.maxDist });
        cam.snapTo(player.state.pos);
        for (const m of Object.values(world.maps)) { m.shadows?.setVisible(m === map); m.town?.setVisible(m === map); }
        setPlatesVisible(true);
        hideAllPlates();
        lastLevel = map.levelName?.(player.state.pos.y) ?? '';
        codex?.visited(id, map.name);
        if (!CUSTOM) {   // Eldrin's story — a hero of your own is not part of it
            // amo: entering Thaloria starts Act I's main quest, Odyssey's Dawn.
            if (id === 'thaloria' && !stats.questLog?.main_odysseys_dawn) quests.start('main_odysseys_dawn');
            // The mountain: Malphas haunts the pass ahead (amo's Act II main quest).
            if (id === 'the_summit' && !stats.questLog?.main_whisperer_of_doubt) quests.start('main_whisperer_of_doubt');
            // The Sanctuary: the Elemental's trial (Song 5).
            if (id === 'sylvan_sanctuary' && !stats.questLog?.main_elementals_trial) quests.start('main_elementals_trial');
        }
        lockDoors(map, id);
        if (CUSTOM && id === 'thaloria_inn' && !stats.flags.newcomer) newcomerMorning();
        hud.banner(lastLevel ? `${map.name} — ${lastLevel}` : map.name);
        save();
    },
});
let travel = null;
const questHooks = {};
const player = createPlayer({ hooks: questHooks, name: HERO_NAME, stats, hero, cam, world, hud, fireballs, spellTuning: SPELL_TUNING });

// What Eldrin holds follows his equipment (amo's equip events).
const ITEMS = itemRules.ITEMS;
const handOf = id => id ? { type: weaponRules.typeOf(ITEMS[id]) === 'fists' && ITEMS[id]?.slot === 'offHand' ? 'shield' : weaponRules.typeOf(ITEMS[id]), accent: ITEMS[id]?.color } : null;
const showWeapons = () => hero.setWeapons(handOf(stats.equipment.weapon) ?? false, handOf(stats.equipment.offHand));   // false: bare hands
// The campaign's Eldrin starts in his own coat with his staff (new games, and saves from before they were items).
if (!heroDef && !stats.flags?.eldrinKit) {
    (stats.flags ??= {}).eldrinKit = true;
    for (const [slot, id] of [['weapon', 'eldrin_staff'], ['body', 'eldrin_coat']]) {
        if (stats.equipment[slot]) continue;
        stats.addItem?.(id, 1) ?? stats.inventory.push({ id, count: 1 });
        stats.equipItem(id);   // amo's own equip: stats applied, the slot set, the hero re-dressed
    }
}
dressHero(); showWeapons();
stats.onEquipChange(slot => { if (slot === 'head' || slot === 'body') { dressHero(); showWeapons(); } });
stats.onEquipChange(showWeapons);
const skills = createSkills({ stats, player, hud, cam, world });
const archery = createArchery({ stats, player, hud, cam, world, loot });
const gathering = createGathering({ stats, hud, onGather: (id, n) => quests?.onGather(id, n) });
const chests = createChests({ stats, hud });
const mapView = createMapView({ stats, hud });
const shop = createShop({ stats, hud, save: () => save() });
const quests = createQuests({ stats, hud });
registerSanctuaryQuests(stats);   // game quests from the campaign spec, run by amo's quest manager as generated quests
const bountyBoard = createBountyBoard({ stats, hud, save: () => save() });
const codex = createCodex({ stats });
questHooks.onKill = (type, extra = {}) => { quests.onKill(type, { ...extra, mapId: world.current?.id ?? null }); codex.killed(type); };   // mapId: bounty kills count in their region only
const thaloriaBias = () => 'neutral';   // amo: Thaloria's currencyBias
const dialogue = createDialogue({
    stats, hud, day: () => clockRules.gameDay(stats.gameMinutes ?? 0), save: () => save(),
    onShop: npc => shop.openFor(npc, thaloriaBias()),
    onQuest: id => quests.start(id),
    onTalked: (npcId, name, start) => quests.afterTalk(npcId, name, start),
    onTeach: () => {},
});
// The newcomer's first morning at the inn: the letter under the door, and a home.
function newcomerMorning() {
    stats.flags.newcomer = true;
    setTimeout(() => dialogue.start([
        { speaker: '', text: 'You arrived in Thaloria last night, soaked through, and took the last room at the inn. Morning now — grey light, the smell of bread from below.' },
        { speaker: '', text: 'A letter has been slipped under the door, sealed with the town\'s crest.' },
        { speaker: 'The letter', text: '"To the traveller in the east room. The fine house on the guild road has stood empty since its owner walked the East Road and did not come back. The council grants it to anyone who will answer the bounty board. Ask nothing more of us, and we will ask nothing more of you."' },
        { speaker: '', text: 'A heavy iron key is tucked inside. A house of your own — your home in Thaloria. (If you fall, you will wake there.)' },
    ], () => {
        stats.respawnPoint = { map: PLAYER_HOME, spawn: 'enter', label: 'Your house' };
        hud.banner('A house of your own');
        save();
    }), 1200);
}
const projTmp = new THREE.Vector3();
const project = (x, y, z) => { projTmp.set(x, y, z).project(camera); return { x: (projTmp.x * 0.5 + 0.5) * innerWidth, y: (-projTmp.y * 0.5 + 0.5) * innerHeight, visible: projTmp.z < 1 }; };
travel = createTravel({
    stats, hud, world, player, onAttune: id => quests.onAttune(id),
    allGates: () => [
        ...(world.maps.outdoor?.gates ?? []).map(g => ({ ...g, map: 'outdoor' })),
        ...EAST_ROAD_GATES.map(g => ({ ...g, map: 'east_road' })),
        ...Object.values(REGIONS).flatMap(r => (r.gates ?? []).map(g => ({ ...g, map: r.id }))),
    ],
});
const campfire = createCampfire({
    stats, hud, onCraft: id => quests?.onCook(id),
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
// Online (Phase 6): the hero as others see them — their worn look, weapon, name and level.
const net = createNet({ world, player, createCharacter, hud, fireballs, hurtSelf: (dmg, from) => player.hurt(dmg, from),
    getLook: () => wornLook(BASE_LOOK, stats.equipment), getWeapons: () => handOf(stats.equipment.weapon)?.type ?? 'fists',
    getName: () => settings.onlineName || HERO_NAME, getLevel: () => stats.level });
stats.onEquipChange(() => net.refresh());
questHooks.onCast = (origin, dir) => net.cast(origin, dir);
const options = createOptions({ quality, onQuality: name => { save(); setQualityName(name); location.reload(); }, onFps: v => perf.set(v), onOnline: v => (v ? net.connect() : net.disconnect()) });
if (settings.online) net.connect();
if (settings.showFps) perf.set(true);
createPadNav();   // gamepad: D-pad / stick moves through any open menu, A presses, B backs out
// Save slots: a new journey goes into the active slot if it is empty, else the first empty one; when all
// three are full the slots screen asks which to replace.
let newKind = 'eldrin';
const beginNew = () => { location.href = newKind === 'hero' ? 'forge.html?mode=create' : `${location.pathname}?new=1&play=1`; };
const slots = createSlots({ onPlay: () => { location.href = `${location.pathname}?play=1`; }, onNew: () => beginNew() });
function startNewJourney(kind) {
    newKind = kind;
    if (!hasSave(activeSlot())) return beginNew();
    const empty = firstEmptySlot();
    if (empty >= 0) { setActiveSlot(empty); return beginNew(); }
    slots.toggle(true, 'new');
}
const activeInfo = slotInfo(activeSlot());
const title = SHOW_TITLE ? createTitle({
    camera, hasSave: hadSave, quality, onOptions: () => options.toggle(true), onSlots: () => slots.toggle(true),
    continueLabel: activeInfo ? `CONTINUE — ${activeInfo.name.toUpperCase()}, LV ${activeInfo.level}` : 'CONTINUE',
    onNewGame: kind => startNewJourney(kind),
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

// The world clock (amo gameClock) and the weather (amo weatherAt over the forest table).
const GLADE_WEATHER = { id: 'thaloria_glade', biome: 'forest' };
const clockEl = document.createElement('div');
clockEl.className = 'hud';
clockEl.id = 'clock';
clockEl.style.cssText = 'right:18px;top:54px;font-size:calc(15px * var(--ui, 1));opacity:.85;letter-spacing:.05em';
document.body.append(clockEl);
let weatherOverride = params.get('weather');
// amo's weather is fixed by map and clock, so every new game (Day 0, 08:00) used to open in the same rain.
// Each save now carries its own weather seed (amo's table and spell lengths unchanged), and a new journey
// begins with three clear hours.
stats.flags ??= {};
if (stats.flags.weatherSeed == null) {
    stats.flags.weatherSeed = Math.floor(Math.random() * 1e6);
    stats.flags.clearUntil = (stats.gameMinutes ?? clockRules.START_MINUTES) + 180;
}
const weatherOf = (def, min) => (min < (stats.flags.clearUntil ?? 0) ? 'clear' : weatherRules.weatherAt({ ...def, id: `${def.id}#${stats.flags.weatherSeed}` }, min).id);
function clock(min = stats.gameMinutes ?? clockRules.START_MINUTES) {
    const weather = world.current?.terrain ? (weatherOverride || weatherOf(world.current.weatherDef ?? GLADE_WEATHER, min)) : 'clear';
    return { minutes: min, hour: clockRules.gameHour(min), weather, voidMult: clockRules.isNight(min) ? clockRules.NIGHT_DAMAGE_MULT : 1 };
}

let simT = 0;
function tick(dt) {
    simT += dt;
    if (title?.active) {
        input.poll(dt);   // drain input while the title owns the screen
        title.update(dt, gameCam);
        world.current.update(simT, dt, { ...clock(19.4 * 60), weather: 'clear', player: { pos: title.focus, dead: true, speed: 0 }, camera, fx: world.current.fx ?? fireballs, hurtPlayer: () => false, floater: hud.floater, onKill: player.onKill, dropLoot: loot.drop });
        return;
    }
    const act = input.poll(dt);
    if (act.keys.includes('F2')) { save(); nextQuality(quality); location.reload(); return; }
    if (act.keys.includes('F3')) perf.toggle();
    if (act.inventory) inventory.toggle();
    if (act.sheet) sheet.toggle();
    if (act.map) mapView.toggle();
    if (act.journal) quests.toggle();
    if (act.codex) codex.toggle();
    if (act.options) options.toggle(true);
    if (act.chat) net.openChat();
    net.update(dt, camera);
    for (const h of world.current.hittables ?? []) if (h.engaged) codex.seen(h.kind === 'shadow' ? 'mirror_shade' : h.kind);
    const menuOpen = inventory.open || sheet.open || campfire.open || chests.open || mapView.open || travel.open || dialogue.open || shop.open || quests.open || codex.open || bountyBoard.open || options.open;
    if (menuOpen) { act.hotbar = -1; act.skill = -1; act.tear = false; act.strike = false; }   // the D-pad and buttons drive the menu, not the hotbar
    if (act.tear) travel.tear();
    mapView.update(player.state, cam.yaw);
    if (act.hotbar >= 0 && !player.state.dead) hotbar.use(act.hotbar);
    if (act.strike && archery.armed()) { archery.shoot(); act.strike = false; }   // a bow or crossbow shoots instead
    hotbar.update(dt);
    if (act.skill >= 0 && !inventory.open && !sheet.open) skills.use(act.skill);
    skills.update(dt);
    dialogue.update(dt, camera, project);
    if (inventory.open || sheet.open || campfire.open || chests.open || mapView.open || travel.open || dialogue.open || shop.open || quests.open || codex.open || bountyBoard.open || options.open) { hud.update(dt, { stats, player: player.state, camera, spell: FIREBALL }); return; }   // paused
    const map = world.current;
    // Gathering: G / Enter / tap the prompt — and gamepad A next to a node (instead of a hop).
    const pp = player.state.pos;
    let station = (map.stations ?? []).find(st => Math.hypot(st.pos.x - pp.x, st.pos.z - pp.z) < 2.3 && Math.abs(st.pos.y - pp.y) < 1.6);
    let person = map.town ? map.town.nearestPerson(pp) : null;
    // Whichever is closer wins: a person standing by a chest or sign is still someone to talk to.
    if (station && person) { if (Math.hypot(person.pos.x - pp.x, person.pos.z - pp.z) < Math.hypot(station.pos.x - pp.x, station.pos.z - pp.z)) station = null; else person = null; }
    const personName = person?.r.npc ? person.r.npc.name.replace(/^./, c => c.toUpperCase()) : null;
    const gatherText = station ? STATION_PROMPT[station.mode] : person ? `G — Talk${personName ? ` to the ${personName}` : ''}` : gathering.update(simT * 1000, player.state);
    if (gatherText && (act.gather || (act.hop && input.device === 'gamepad'))) {
        if (station?.mode === 'chest') { if (station.seed && !stats.chestContents[station.key]) stats.chestContents[station.key] = station.seed.map(id => ({ id, qty: 1 })); chests.toggle(station.key, station.title); }
        else if (station?.mode === 'sign') { dialogue.start([{ speaker: '', text: station.text }]); quests.manager.onReadSign(station.id ?? null); station.onUse?.({ quests, stats }); }
        else if (station?.mode === 'gate') travel.useGate(station.key);
        else if (station?.mode === 'board') bountyBoard.use({ key: station.key, place: station.place, regionDef: station.region === 'east_road' ? eastRoadMap.default : thaloriaMap.default });
        else if (station?.mode === 'cairn') { stats.respawnPoint = { map: map.id, spawn: station.key }; hud.banner('A cairn — if you fall, you will come back here'); save(); }
        else if (station) campfire.toggle(station.mode);
        else if (person) { if (person.r.onTalk) person.r.onTalk({ start: dialogue.start, quests, stats, hud, save }); else dialogue.talk(person, clock()); }   // onTalk: a map's own conversation (the Sanctuary)
        else gathering.harvest(simT * 1000);
        act.hop = false;
    }
    let lift = 0;
    clockRules.advanceClock(stats, dt * 1000);   // amo: one real minute = one game hour
    const ctx = { ...clock(), message: hud.message, attunedGates: stats.attunedGates, player: player.state, camera,
        flags: (stats.flags ??= {}), shake: a => cam.kick(a), customHero: CUSTOM, players: net.targets(), hurtRemote: (id, dmg, from) => net.hurtRemote(id, dmg, from),
        drainVigor: n => { stats.vigor = Math.max(0, stats.vigor - n); },
        onRetreat: () => { stats.flags.malphas_retreated = true; save(); }, fx: world.current.fx ?? fireballs, hurtPlayer: player.hurt, floater: hud.floater, onKill: player.onKill, dropLoot: loot.drop };
    if (!world.step(dt)) lift = player.step(dt, act, ctx);
    const p = player.state;
    cam.update(dt, p.pos, lift, map.heightAt ?? null);   // the camera never sinks into the ground or the mountain
    const ceil = map.cameraCeiling?.(p.pos.x, p.pos.z, p.pos.y);   // under a cave roof: pull in below it
    if (ceil != null && camera.position.y > ceil) { const t = cam.target; camera.position.lerpVectors(t, camera.position, Math.max(0.2, (ceil - t.y) / (camera.position.y - t.y))); camera.lookAt(t); }
    if (gatherText && !hud.ui.prompt.textContent) { hud.ui.prompt.textContent = gatherText; hud.ui.prompt.style.opacity = 1; }
    if (map.levelName && !p.hop && p.vy === 0) {
        const lv = map.levelName(p.pos.y);
        if (lv !== lastLevel) { hud.banner(`${map.name} — ${lv}`); lastLevel = lv; }
    }
    map.update(simT, dt, ctx);
    sweepPlates();
    fireballs.update(dt, map, map.hittables);
    loot.update(dt, player.state, map);
    archery.update(dt);
    travel.update(dt, map.fx ?? fireballs);
    if (settings.god) { stats.health = stats.maxHealth; stats.mana = stats.maxMana; stats.vigor = stats.maxVigor; stats.vigorWinded = false; }   // god mode: endless
    hud.update(dt, { stats, player: p, camera, spell: FIREBALL });
    const c = clock();
    clockEl.textContent = `${clockRules.clockLabel(c.minutes)} · ${weatherRules.WEATHER[c.weather] ?? c.weather}`;
    if (archery.armed()) hud.ui.speed.textContent += `${hud.ui.speed.textContent ? ' · ' : ''}${archery.ready()} arrows ready (+${archery.spare()} in the satchel)`;
}

if (REGIONS[params.get('region')] || ['the_summit', 'thaloria', 'east_road', 'outdoor', 'sylvan_sanctuary', 'tower'].includes(params.get('region'))) world.enter(params.get('region'), 'start');   // the editor's "Play here"
else if (savedAt && world.maps && ['outdoor', 'tower', 'thaloria', 'east_road', 'the_summit', 'sylvan_sanctuary', ...Object.keys(interiorBuilders), ...Object.keys(REGIONS)].includes(savedAt.map)) world.enter(savedAt.map, null, savedAt);
else if (CUSTOM) world.enter('thaloria_inn', 'enter');   // a hero of your own wakes at the inn
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
    setTime: h => { stats.gameMinutes = Math.floor((stats.gameMinutes ?? 0) / 1440) * 1440 + h * 60; },
    setWeather: w => { weatherOverride = w; },
    strike: () => input.press('strike'),
    loot, inventory, sheet, hotbar, skills, archery, title, gathering, campfire, chests, mapView, travel, dialogue, shop, quests, codex, net, player: player.state, playerApi: player,
};
