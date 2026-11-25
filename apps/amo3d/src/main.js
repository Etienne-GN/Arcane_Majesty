// Arcane Majesty 3D — boot. Wires the engine (renderer, input, camera, maps, loop), the game
// (an amo character sheet, the player controller, spells, HUD, saving) and the content (maps).
import { drapeAll } from './engine/drape.js';
import * as THREE from 'three';
import { spells as spellsAll, mastery as masteryRules } from '@rules';
import { gameClock as clockRules, weather as weatherRules, eastRoadMap, thaloriaMap } from '@rules';
import { movementRules, PlayerStats as PS, items as itemRules, weapons as weaponRules, talents as talentRules } from '@rules';
import { pickQuality, nextQuality, setQualityName, setTweaks } from './engine/quality.js';
import { settings } from './engine/settings.js';
import { createOptions } from './game/options.js';
import { createPadNav } from './engine/padnav.js';
import { createNet } from './game/net.js';
import { sfx } from './engine/sfx.js';
// Every button in every menu clicks.
addEventListener('click', e => { if (e.target.closest?.('button, #tmenu button, .tool')) sfx.click(); }, true);
import { createRenderer } from './engine/renderer.js';
import { createOrbitCamera } from './engine/camera.js';
import { createInput } from './engine/input.js';
import { createTouchControls } from './engine/touch.js';
import { createMapManager } from './engine/maps.js';
import { createPerf } from './engine/perf.js';
import { startLoop } from './engine/loop.js';
import { createHud } from './game/hud.js';
import { createPlayer, PX } from './game/player.js';
import { createFireballs, FIREBALL, CASTABLE } from './game/fireball.js';
import { loadGame, saveGame, deleteSave, activeSlot, setActiveSlot, slotInfo, addSave } from './game/save.js';
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
import { createTravel, OPEN_WORLD_IDS } from './game/travel.js';
import { createDialogue } from './game/dialogue.js';
import { createShop } from './game/shop.js';
import { createQuests } from './game/quests.js';
import { createCodex } from './game/codex.js';
import { buildRegion } from './engine/region.js';
// Every region file is a map (content/regions/*.json → buildRegion).
const REGIONS = Object.fromEntries(Object.values(import.meta.glob('./content/regions/*.json', { eager: true, import: 'default' })).map(d => [d.id, d]));
import { sweepPlates, hideAllPlates, coreOf } from './content/actors/enemyCore.js';
import { scale as hitStopScale } from './engine/hitstop.js';
import { umbralTwin } from './engine/umbralTwin.js';
import { createStreamWorld } from './engine/stream.js';
import { createEldoriaWorld } from './content/world/eldoria.js';
import { createNythoriaWorld, NYTHORIA_GATES } from './content/world/nythoria.js';
import './game/theme.js';   // one look for every menu and panel
import { updateEnemyMagic, debugMagic } from './content/actors/enemyMagic3d.js';
import { createCampfire, STATION_PROMPT } from './game/campfire.js';
import { createBountyBoard } from './game/bounty.js';
import { createBook } from './game/book.js';
import { createHands } from './game/hands.js';
import { createCitadelLibrary, createForbiddenArchive } from './content/citadelLibrary.js';
import { buildDungeon } from './engine/dungeon.js';
import { DUNGEONS } from './content/dungeons.js';
import { createAiming } from './game/aiming.js';
import { createPause } from './game/pause.js';
import { createChests } from './game/chest.js';
import { createCharacter } from './content/models/character.js';
import eldrinCast from './content/cast/eldrin.json';
import seraphinaCast from './content/cast/seraphina.json';
import anyaCast from './content/cast/anya.json';
import { setPlatesVisible } from './content/actors/enemyCore.js';
import { createTitle } from './game/title.js';
import { ELDRIN as ELDRIN_V, toWorld as vToWorld } from './content/eldrinVale.js';
import { hasSave } from './game/save.js';
import { createOutdoor } from './content/glade.js';
import { createTower } from './content/eldrinTower.js';
import { createThaloria, INTERIOR_IDS } from './content/thaloria.js';
import { createEastRoad, EAST_ROAD_GATES } from './content/eastRoad.js';
import { createMountain } from './content/mountain.js';
import { createSanctuary, registerSanctuaryQuests } from './content/sanctuary.js';
import { createChapters, registerChapterQuests } from './content/chapters.js';
import { createPrologue, registerPrologueQuests } from './content/prologue.js';
import { createVision } from './content/vision.js';
import { populate } from './content/actors/animals.js';
import { dailyRng } from './content/actors/beast.js';
// Animals per map (amo ENEMY_TYPES): [type, count, near (landmark or point), radius].
const ANIMALS = {
    outdoor: [['rabbit', 5], ['forest_fox', 2], ['crow', 4], ['feral_boar', 2]],
    thaloria: [['chicken', 6, 'Thaloria Market', 9], ['pig', 2, 'Thaloria Market', 10], ['crow', 3]],
    east_road: [['rabbit', 4], ['forest_fox', 2], ['crow', 5], ['feral_boar', 3], ['black_bear', 1], ['cow', 3, 'The Shepherd\'s Lean-to', 14], ['sheep', 4, 'The Shepherd\'s Lean-to', 14]],
    summit_of_despair: [['crow', 3], ['goat', 3]],
    sylvan_sanctuary: [['rabbit', 5], ['forest_fox', 2]],
    whisper_wood: [['forest_fox', 2], ['rabbit', 3], ['grizzly_bear', 1], ['crow', 4]],
};
import { createInterior } from './content/interior.js';
import THALORIA_DOORS from '../../../packages/rules/src/data/maps/interiors/doors.json';
import * as OUT from './game/outsider.js';
import { createSight } from './game/sight.js';
// amo's Thaloria interiors, each built on first entry; inner doors (the inn's cellar) lead on and back.
const INTERIORS = Object.fromEntries(Object.entries(import.meta.glob(['../../../packages/rules/src/data/maps/interiors/thaloria_*.js', '../../../packages/rules/src/data/maps/interiors/east_road_cave.js'], { eager: true, import: 'MAP' }))
    .map(([path, def]) => [path.split('/').pop().replace('.js', ''), def]));
const parentOf = {};
for (const d of THALORIA_DOORS.thaloria ?? []) if (INTERIORS[d.interior]) { INTERIOR_IDS.add(d.interior); parentOf[d.interior] = { map: 'thaloria', spawn: `door:${d.interior}` }; }
for (const d of THALORIA_DOORS.east_road ?? []) if (INTERIORS[d.interior]) parentOf[d.interior] = { map: 'east_road', spawn: `door:${d.interior}` };   // the Hollow
for (const [id, def] of Object.entries(INTERIORS)) for (const d of def.spawns?.doors ?? []) if (INTERIORS[d.interior]) parentOf[d.interior] = { map: id, spawn: `door:${d.interior}` };
const interiorBuilders = Object.fromEntries(Object.keys(parentOf).map(id => [id, () => createInterior({
    id, def: INTERIORS[id], exitTo: parentOf[id],
    innerDoors: Object.fromEntries((INTERIORS[id].spawns?.doors ?? []).filter(d => parentOf[d.interior]).map(d => [d.interior, d.interior])),
})]));

// God mode (testing) knows every castable spell at its top tier; turning it off forgets the ones it lent.
function godSpells() {
    const lent = stats.flags.godSpells ?? [];
    if (settings.god && lent.length) {   // already on: lend what is still missing (new castable spells, an old save's shorter list)
        for (const id of CASTABLE) if (!(stats.spells[id] > 0)) { stats.spells[id] = 3; lent.push(id); }
        for (const id of CASTABLE) if (stats.spells[id] < 3) { (stats.flags.godTiers ??= {})[id] ??= stats.spells[id]; stats.spells[id] = 3; }
    } else if (settings.god) {
        stats.flags.godSpells = CASTABLE.filter(id => !(stats.spells[id] > 0));
        for (const id of stats.flags.godSpells) stats.spells[id] = 3;
        stats.flags.godTiers = {};   // spells you know below Master: raised while god mode lasts
        for (const id of CASTABLE) if (stats.spells[id] < 3) { stats.flags.godTiers[id] = stats.spells[id]; stats.spells[id] = 3; }
        stats.flags.godSkills = Object.fromEntries(Object.values(stats.skills).map(k => [k.id, k.level]));   // skills too, at their top level
        for (const k of Object.values(stats.skills)) k.level = k.maxLevel;
        if (!stats.flags.godSpells.length) stats.flags.godSpells = ['_'];
    } else if (!settings.god && lent.length) {
        for (const id of lent) if (id !== '_') stats.spells[id] = 0;
        for (const [id, lv] of Object.entries(stats.flags.godTiers ?? {})) stats.spells[id] = lv;
        stats.flags.godTiers = null;
        for (const [id, lv] of Object.entries(stats.flags.godSkills ?? {})) if (stats.skills[id]) stats.skills[id].level = lv;
        stats.flags.godSkills = null;
        stats.flags.godSpells = [];
        if (!stats.spells[stats.flags.activeSpell]) stats.flags.activeSpell = 'fireball';
    }
}
// ---- 3D-only items and tuning (the 2D game, apps/amo, is archived: never edit it — add here instead) ----
// Eldrin's own staff and coat, as items you can take off (and put back on).
Object.assign(itemRules.ITEMS, {
    eldrin_staff: { id: 'eldrin_staff', name: "Eldrin's Staff", description: 'Ash wood bound in old silver, a pale crystal at its head. The focus he has carried since the tower. +2 INT.',
        color: 0x6a4a2e, icon: 'itm_wand_01', stackable: false, slot: 'weapon', tier: 1, weaponType: 'staff', rarity: 'uncommon', stats: { intelligence: 2 }, buyPrice: 0, sellPrice: 0,
        onUse: st => st.equipItem('eldrin_staff') },
    eldrin_coat: { id: 'eldrin_coat', name: "Eldrin's Coat", description: 'A long red scholar\'s coat with a high collar and gold trim, over a dark vest. Worn at every desk and on every road.',
        color: 0xa3141f, icon: 'itm_mantua', stackable: false, slot: 'body', tier: 1, rarity: 'uncommon', keepsLook: true, stats: {}, buyPrice: 0, sellPrice: 0,
        onUse: st => st.equipItem('eldrin_coat') },
    // The Wizard's Hat (3D only — the 2D game is archived): sold by the merchant for glint.
    wizards_hat: { id: 'wizards_hat', name: "Wizard's Hat", description: 'A tall pointed hat of midnight felt, its brim dusted with faint stars. +2 INT, +1 STA.',
        color: 0x2a2350, hatStyle: 'wizard', icon: 'itm_headgear_01', stackable: false, slot: 'head', tier: 2, rarity: 'uncommon',
        stats: { intelligence: 2, stamina: 1 }, buyPrice: 140, sellPrice: 45, onUse: st => st.equipItem('wizards_hat') },
});
// The heroines of A Tapestry of Souls wear their own outfits as real items (taken off and put back like any other).
{   const W = (id, name, description, slot, wear, colors, stats, extra = {}) => ({ id, name, description, color: parseInt(colors.primary.slice(1), 16), icon: extra.icon ?? 'itm_leather_armor', stackable: false, slot, tier: 2, rarity: 'rare', wear, wearColors: colors, stats, buyPrice: 0, sellPrice: 60, ...extra, onUse: st => st.equipItem(id) });
    Object.assign(itemRules.ITEMS, {
        // Seraphina, the Queen of Carnage
        carnage_gown: W('carnage_gown', 'Gown of the Queen of Carnage', 'Navy so dark it is black, worked with silver like frost on iron; it moves like a cloak and turns a blade like mail.', 'body', 'gown', { primary: '#141a30', collar: '#0a0a12', trim: '#a8aab4' }, { stamina: 2, agility: 1 }),
        carnage_skirt: W('carnage_skirt', "Queen's Riding Skirts", 'Long slit skirts over black hose, hemmed in blood-red.', 'legs', 'skirt', { primary: '#10142a', trim: '#6a1a22' }, { agility: 1 }),
        carnage_crown: W('carnage_crown', 'Crown of Thorned Silver', 'A spiked circlet of dark silver set with blood-red stones — the crown of a queen without a throne.', 'head', 'crown', { primary: '#b0b2bc', trim: '#7a1a2a' }, { intelligence: 1, strength: 1 }, { icon: 'itm_headgear_01' }),
        carnage_pauldrons: W('carnage_pauldrons', 'Spiked Pauldrons', 'Black steel shoulders wrought like curling thorns.', 'shoulders', 'steel_pauldrons', { primary: '#1c1a22', trim: '#a8aab4' }, { stamina: 1 }),
        carnage_gauntlets: W('carnage_gauntlets', 'Gauntlets of the Legion', 'Black steel to the elbow, the knuckles ridged.', 'arms', 'gauntlets', { primary: '#2a2832', sleeve: '#141a30' }, { strength: 1 }),
        carnage_boots: W('carnage_boots', 'Black Boots', 'Tall boots of black leather, steel at the toe.', 'feet', 'boots', { primary: '#16141a', dark: '#0c0a10' }, { agility: 1 }),
        carnage_cloak: W('carnage_cloak', 'Cloak of the Resistance', 'A long navy-black cloak lined and hemmed in blood-red.', 'back', 'travelling_cloak', { primary: '#0e1226', trim: '#6a1a22' }, { stamina: 1 }, { wearSlot: 'cape' }),
        carnage_blade: { id: 'carnage_blade', name: "Seraphina's Blade", description: 'A long blade of black steel, its guard a crown of thorns. +2 STR, +1 AGI.', color: 0x2a2832, icon: 'itm_sword_01', stackable: false, slot: 'weapon', tier: 2, weaponType: 'sword', rarity: 'rare', stats: { strength: 2, agility: 1 }, buyPrice: 0, sellPrice: 80, onUse: st => st.equipItem('carnage_blade') },
        // Anya, the Void-Echo
        echo_corset: W('echo_corset', "Scholar's Corset", 'Dark leather laced over a pale linen blouse — an Aurorian scholar\'s, battered by the Underworld.', 'body', 'leather_jerkin', { primary: '#2a1e1a', collar: '#3a2420', trim: '#b89a5a', shirt: '#e8e2d8' }, { intelligence: 2, agility: 1 }),
        echo_skirt: W('echo_skirt', 'Torn Pale Skirts', 'Layers of pale linen, torn ragged at the hem.', 'legs', 'skirt', { primary: '#e2ddd2', trim: '#9a8a6a' }, { agility: 1 }),
        echo_circlet: W('echo_circlet', 'Aurorian Circlet', 'A thin band of gold with a single drop of light at the brow.', 'head', 'circlet', { primary: '#d8b860', trim: '#f0e0a0' }, { intelligence: 2 }, { icon: 'itm_headgear_01' }),
        echo_gloves: W('echo_gloves', 'Long Leather Gloves', 'Fingerless at the tips, for casting.', 'arms', 'gloves', { primary: '#2a1e1a', sleeve: '#2a1e1a' }, { intelligence: 1 }),
        echo_boots: W('echo_boots', 'High Riding Boots', 'Thigh-high boots of dark leather, buckled.', 'feet', 'riding_boots', { primary: '#2a1e18', dark: '#1a1210' }, { agility: 1 }),
        echo_cloak: W('echo_cloak', 'Void-Touched Cloak', 'Violet-black, its edges fraying into something like smoke.', 'back', 'travelling_cloak', { primary: '#22142e', trim: '#6a4a9a' }, { intelligence: 1 }, { wearSlot: 'cape' }),
        echo_wand: { id: 'echo_wand', name: 'Wand of Aurorian Light', description: 'Pale wood capped in gold; a mote of starlight hangs at its tip. +2 INT.', color: 0xd8b860, icon: 'itm_wand_01', stackable: false, slot: 'weapon', tier: 2, weaponType: 'wand', rarity: 'rare', stats: { intelligence: 2 }, buyPrice: 0, sellPrice: 80, onUse: st => st.equipItem('echo_wand') },
    });
}
const HEROINE_OUTFITS = { seraphina: ['carnage_gown', 'carnage_skirt', 'carnage_crown', 'carnage_pauldrons', 'carnage_gauntlets', 'carnage_boots', 'carnage_cloak', 'carnage_blade'],
    anya: ['echo_corset', 'echo_skirt', 'echo_circlet', 'echo_gloves', 'echo_boots', 'echo_cloak', 'echo_wand'] };
{ const i = itemRules.MERCHANT_CATALOG.findIndex(e => e.id === 'scholars_cowl'); itemRules.MERCHANT_CATALOG.splice(i + 1, 0, { id: 'wizards_hat', price: 140, currency: 'glint' }); }
movementRules.MOVE.SPRINT_DRAIN_PER_S = 7;                              // amo: 20 → ~14 s of sprint instead of 5
const SPELL_TUNING = { rangeMult: 3, speedMult: 1.6, radiusMult: 2 };   // 2D screen distances feel short in 3D

const params = new URLSearchParams(location.search);
const hadSave = hasSave();
if (params.get('new') === '1') deleteSave(activeSlot(), { keepEntry: true });   // a new journey in this save: clear it, keep it in the list
const SHOW_TITLE = params.get('play') !== '1' && params.get('new') !== '1';

// ---------- engine ----------
const quality = pickQuality();
const { renderer, camera } = createRenderer(quality);
const cam = createOrbitCamera(camera);
const input = createInput({ canvas: renderer.domElement, cam });
createTouchControls({ input, cam });
const perf = createPerf(renderer, quality);
perf.extra = () => { const s = world.current?.streamStats?.(); return s ? `tiles ${s.tiles}${s.queue ? ' (+' + s.queue + ')' : ''} · build ${s.lastMs} ms` : ''; };
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
OUT.setHero(heroDef);   // an Outlander on the other world (game/outsider.js)
// ---- a hero of your own (the creator): a newcomer to Thaloria, not Eldrin ----
// Wakes at the inn; a letter grants them the empty fine house on the guild road (thaloria_house_noble_c,
// where no resident lives) — their home and respawn point. Eldrin's Tower is barred to them, Eldrin
// finds their house locked, and Malphas cannot be beaten yet. Eldrin's story quests do not start.
const CUSTOM = !!heroDef;
const PLAYER_HOME = 'thaloria_house_noble_c';
function lockDoors(map, id) {
    for (const t of map.triggers ?? []) {
        if (t.requires) {   // a way that opens with the story (a flag), or in god mode
            t._to ??= t.to; t._label ??= t.label;
            const open = settings.god || !!stats.flags?.[t.requires];
            t.to = open ? t._to : null; t.label = open ? t._label : (t.lockedLabel ?? `${t._label} — not yet`);
        }
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
    let mainType = gifted.find(t => !['shield', 'fists', 'elemental', 'light', 'dark'].includes(t) && cheapest(t));
    let main = mainType && cheapest(mainType);
    let off = gifted.includes('shield') && weaponRules.WEAPON_TYPES[mainType]?.hands === 1 ? cheapest('shield') : null;
    // What the hero holds in the Forge (look.parts.right / .left, ids from look.js HANDHELD) is what they start with:
    // the weapon hand (the right first, a left-hander's left otherwise) becomes the main hand; the other hand's
    // shield, torch or one-handed weapon the off hand. Nothing held in the Forge: the class kit above.
    const forgeItem = hid => hid === 'claymore' || hid === 'greatsword' ? itemRules.ITEMS.claymore : hid === 'torch' ? itemRules.ITEMS.torch
        : hid === 'halberd' ? cheapest('spear') : weaponRules.WEAPON_TYPES[hid] && hid !== 'fists' ? cheapest(hid) : null;   // no halberd item: the spear
    const held = [heroDef.look?.parts?.right?.id, heroDef.look?.parts?.left?.id].map(forgeItem);
    const isOff = d => d && (d.slot === 'offHand' || weaponRules.typeOf(d) === 'shield');
    const mi = held.findIndex(d => d && !isOff(d));
    if (mi >= 0 || held.some(isOff)) {
        if (mi >= 0) { main = held[mi]; mainType = weaponRules.typeOf(main); }
        const other = held[mi >= 0 ? 1 - mi : held.findIndex(isOff)];
        off = weaponRules.WEAPON_TYPES[mainType]?.hands === 2 ? null
            : isOff(other) || (other && weaponRules.WEAPON_TYPES[weaponRules.typeOf(other)]?.hands === 1) ? other : null;
    }
    if (!gifted.some(g => ['wand', 'staff', 'elemental', 'light', 'dark'].includes(g))) stats.spells.fireball = 0;
    if (HEROINE_OUTFITS[heroDef.id]) { for (const id of HEROINE_OUTFITS[heroDef.id]) { stats.addItem(id, 1); stats.equipItem(id); } }   // a heroine: her own clothes and weapon
    else stats.giveStartKit({ weapon: main?.id, offHand: off?.id });   // archers also get amo's archer kit from this
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
// A werewolf hero (Forge race) can take the wolf form: V / R3 / the WOLF button (stats.flags.wolfForm).
const WEREWOLF = BASE_LOOK?.body?.race === 'werewolf';
const heroLook = () => wornLook(BASE_LOOK, { ...stats.equipment, _wolf: WEREWOLF && !!stats.flags?.wolfForm }, {});
let model = createCharacter(heroLook());
const hero = {
    get root() { return model.root; },
    update: (...a) => model.update(...a),
    crystalWorld: (v, hand) => model.crystalWorld(v, hand),
    bladeWorld: (h, a, b) => model.bladeWorld(h, a, b),
    setWeapons: (a, b) => model.setWeapons(a, b),
    get mainType() { return model.mainType; },
};
function dressHero() {
    const old = model;
    model = createCharacter(heroLook());
    model.root.rotation.order = 'YXZ';
    model.root.position.copy(old.root.position);
    model.root.rotation.copy(old.root.rotation);
    model.root.visible = old.root.visible;
    old.root.parent?.add(model.root);
    old.root.parent?.remove(old.root);
}
const fireballs = createFireballs({
    PX, tuning: SPELL_TUNING,
    dmgMult: () => (1 + (stats.skills?.arcane_mastery?.level ?? 0) * 0.10) * (player?.buffMult?.('spellMult') ?? 1),   // amo Arcane Mastery: +10% spell damage a level; Overload ×1.4
    // amo: a spell's hit grows the feel for its element (hitGain); the element's level lifts its spells' tiers.
    onSpellHit: (sp, h) => { if (h.kind === 'deer' || !sp.element) return; stats.gainElementPoints(sp.element, masteryRules.hitGain(!h.alive, h.level ?? 1, stats.level)); },
    onHeal: n => { stats.health = Math.min(stats.maxHealth, stats.health + n); hud.floater(player.state.pos.clone().setY(player.state.pos.y + 2.2), `+${n}`, '#7ae07a'); },
    onDamage: (pos, dmg, killed, burning, text = null) => hud.floater(pos, text ?? `${dmg}${burning ? ' 🔥' : ''}${killed ? ' ✝' : ''}`, text ? '#d8c8ff' : killed ? '#ffd27a' : '#ff8a4a'),
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
        citadel_library: () => createCitadelLibrary(),
        forbidden_archive: () => createForbiddenArchive(),
        ...Object.fromEntries(Object.keys(DUNGEONS).map(id => [id, () => buildDungeon(DUNGEONS[id])])),
        vision: () => createVision(),   // chapter 2: what the storm shows Eldrin
        eldoria: () => createEldoriaWorld({ quality }),   // the open world, stage W2 (in progress: the land of Thaloria's corner)
        nythoria: () => createNythoriaWorld({ quality }),   // the shadow world, through the Obsidian Gate (docs/3d/WORLD_PLAN.md)
        ...Object.fromEntries(Object.keys(REGIONS).filter(id => !REGIONS[id].builder).map(id => [id, () => buildRegion(REGIONS[id], { quality })])),   // regions with a builder (the Sanctuary) keep their own code
    },
    fade: hud.ui.fade, fadeText: hud.ui.fadeText,
    // The open world: Thaloria's corner (the glade, the city, the East Road, the mountain, the Sanctuary) is one land now;
    // every way into one of those places — a door, a stair, a gate, a cairn, an old save — arrives in the open world at
    // that place's own arrival point (or the saved spot, moved into world coordinates). Their old standalone maps retire.
    redirect(id, sp, from, at) {
        if (id === 'eldoria' && typeof sp === 'string' && sp.includes(':')) { world.maps.eldoria?.ensureStamp?.(sp.split(':')[0]); return null; }   // arriving at a place not built yet: build it first
        if (!OPEN_WORLD_IDS.has(id)) return null;
        const ow = (world.maps.eldoria ??= createEldoriaWorld({ quality }));
        const st = ow.ensureStamp(id);   // (built now if it was waiting for you to come near)
        if (!st) return null;
        if (at) return { id: 'eldoria', at: { ...at, x: at.x + st.ox, z: at.z + st.oz, y: undefined } };
        const key = `${id}:${sp}`;
        return { id: 'eldoria', spawn: ow.spawns[key] ? key : `${id}:start` };
    },
    onEnter(map, id, sp) {
        OUT.setWorld(id);
        if (OUT.isOutsider() && !stats.flags?.[`outlander_${id}`]) {   // the first arrival on the other world
            (stats.flags ??= {})[`outlander_${id}`] = true; stats.flags.outlander = true;
            setTimeout(() => hud.banner(id === 'nythoria' ? 'Outlander — the eclipse does not know you' : 'Outlander — Eldoria\'s sun is harsh on you'), 1500);
        }
        if (!map._animals && ANIMALS[id]) { map._animals = true; populate(map, map.scene, ANIMALS[id], dailyRng); }
        if (!map._animals && map.stamps) {   // the open world: each stamped place's animals, in its own frame (engine/stream.js)
            map._animals = true;
            for (const st of map.stamps) if (st.built && ANIMALS[st.id]) populate(st.map, st.group, ANIMALS[st.id], dailyRng);
            map.refreshLife?.();
            map.onStampBuilt = st => { if (ANIMALS[st.id]) { populate(st.map, st.group, ANIMALS[st.id], dailyRng); map.refreshLife(); } if (world.current === map) gathering?.setMap(map); };   // (its gather spots too)   // a place built as you come near: its animals too
        }
        player.place(sp);
        fireballs.setScene(map.scene);
        map.scene.add(torchLight);   // always there (a light count that never changes: no shader rebuilds), lit only by a torch
        aiming?.setScene(map.scene);
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
        placeStory(id);
        if (map.stamps) map.onPlace = (pid, name, st) => { placeStory(pid); hud.banner(name); codex?.visited(pid, name); if (!CUSTOM) chapters?.enter(st.map, pid, { off: st.off }); };   // the open world: a place walked into (and its chapter scene, in its frame)
        lockDoors(map, id);
        if (!CUSTOM) prologue?.enter(map, id);   // chapters 1–2 and the threads between 3–6
        if (!CUSTOM) chapters?.enter(map, id);   // Eldoria's Prophecy, chapters 6–12: the story's scenes on this map
        if (CUSTOM && id === 'thaloria_inn' && !stats.flags.newcomer) newcomerMorning();
        hud.banner(lastLevel ? `${map.name} — ${lastLevel}` : map.name);
        save();
    },
});
// Entering a place starts its part of the story (a map loaded, or — in the open world — the place walked into).
function placeStory(id) {
    if (CUSTOM) return;   // Eldrin's story — a hero of your own is not part of it
    // amo: entering Thaloria starts Act I's main quest, Odyssey's Dawn.
    if (id === 'thaloria' && !stats.questLog?.main_odysseys_dawn && !stats.questLog?.main_read_the_erasure) quests.start('main_odysseys_dawn');   // (old saves; a new campaign reaches it through chapters 1–3, content/prologue.js)
    // The mountain: Malphas haunts the pass ahead (amo's Act II main quest).
    if (id === 'the_summit' && !stats.questLog?.main_whisperer_of_doubt) quests.start('main_whisperer_of_doubt');
    // The Sanctuary: the Elemental's trial (Song 5).
    if (id === 'sylvan_sanctuary' && !stats.questLog?.main_elementals_trial) quests.start('main_elementals_trial');
}
// A conversation's camera: it eases round to frame you and the one you speak with (over your shoulder, close, at eye
// level), then gives the camera back when the talk ends. Every talk with a person uses it — the Hermit, Oren on the road…
let cine = null;
const cineFrom = new THREE.Vector3(), cineLook = new THREE.Vector3();
function cineCamera(dt) {
    const P = player.state.pos, N = cine.pos, dx = N.x - P.x, dz = N.z - P.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    const want = new THREE.Vector3(P.x - ux * 2.6 + uz * 1.1, P.y + 1.9, P.z - uz * 2.6 - ux * 1.1);   // behind and beside your shoulder
    if (cine.t === 0) { cineFrom.copy(camera.position); cineLook.copy(cam.target); }
    cine.t = Math.min(1, cine.t + dt / 0.9); const k = cine.t * cine.t * (3 - 2 * cine.t);
    camera.position.lerpVectors(cineFrom, want, k);
    const look = new THREE.Vector3((P.x + N.x) / 2 + ux * 0.6, Math.max(P.y, N.y) + 1.5, (P.z + N.z) / 2 + uz * 0.6);
    camera.lookAt(cineLook.clone().lerp(look, k));
    player.state.facing = Math.atan2(dx, dz);
}
// Eldrin's horse (Phase 13, first pass): it waits where you left it (stats.flags.horse, in the open world); G beside it to
// ride (2.4× as fast, not in deep water), G again to get down. The open world only.
import('./content/models/horse.js').then(({ buildHorse, buildBoat, buildSailboat, SADDLE_Y }) => { horse.model = buildHorse(); horse.saddle = SADDLE_Y; boat.model = buildBoat(); sailboat.model = buildSailboat(); });
const horse = { model: null, saddle: 1.15, station: null, scene: null };
// A rowboat on Lake Aethera (Phase 13, boats): G at its side to row (water only — G again at a shore to step off).
const boat = { id: 'boat', model: null, station: null, scene: null, title: 'A rowboat', saddle: 1.35, speed: 1.9 / 0.42, y: -2.05,
    find: m => { const st = m.stamps?.find(s2 => s2.id === 'lake_aethera'); if (!st) return null; for (let a = 0; a < 6.28; a += 0.2) for (let r = 10; r < 120; r += 3) { const x = st.ox + Math.cos(a) * r, z = st.oz + Math.sin(a) * r, h = m.heightAt(x, z); if (h < -2.6 && h > -4) return { x, z }; } return null; } };
// A sailing boat moored at Port Silver: board it at the quay, sail the harbour, the eastern ocean and the islands.
const sailboat = { id: 'sailboat', model: null, station: null, scene: null, title: 'A sailing boat', saddle: 2.1, speed: 4.6 / 0.42, y: -1.95,
    find: m => { const st = m.stamps?.find(s2 => s2.id === 'port_silver'); if (!st) return null; for (let r = 90; r < 220; r += 4) { const x = st.ox + r, z = st.oz + 10, h = m.heightAt(x, z); if (h < -4) return { x, z }; } return null; } };
const VESSELS = [boat, sailboat];
function placeBoat(v = boat) {
    const m = world.current; if (!v.model || world.id !== 'eldoria') return;
    const flags = (stats.flags.vessels ??= {}); if (v.id === 'boat' && stats.flags.boat && !flags.boat) flags.boat = stats.flags.boat;
    if (!flags[v.id]) { const at = v.find(m); if (!at) return; flags[v.id] = at; }
    if (v.scene !== m.scene) { v.scene?.remove(v.model.root); m.scene.add(v.model.root); v.scene = m.scene; }
    if (player.state.mounted?.id !== v.id) {
        const at = flags[v.id]; v.model.root.position.set(at.x, v.y, at.z);
        if (!v.station) { v.station = { mode: 'boat', vessel: v.id, title: v.title, pos: new THREE.Vector3(at.x, m.groundAt(at.x, at.z), at.z) }; m.stations.push(v.station); }
    }
}
function placeHorse() {
    const m = world.current; if (!horse.model || world.id !== 'eldoria') return;
    if (!stats.flags.horse) { const sp = m.spawns['outdoor:start'] ?? m.spawns.start; stats.flags.horse = { x: sp.x + 4, z: sp.z + 3 }; }
    const at = stats.flags.horse;
    if (horse.scene !== m.scene) { horse.scene?.remove(horse.model.root); m.scene.add(horse.model.root); horse.scene = m.scene; }
    if (!player.state.mounted) {
        horse.model.root.position.set(at.x, m.heightAt(at.x, at.z), at.z);
        if (!horse.station) { horse.station = { mode: 'mount', title: 'Your horse', pos: horse.model.root.position }; m.stations.push(horse.station); }
    }
}
function toggleBoat(on, id = 'boat') {
    const p = player.state, m = world.current, v = VESSELS.find(q => q.id === (on ? id : p.mounted?.id)) ?? boat, flags = (stats.flags.vessels ??= {});
    if (on && !p.mounted) { p.mounted = { kind: 'boat', id: v.id, saddle: v.saddle, speed: v.speed }; const at = flags[v.id]; p.pos.set(at.x, m.groundAt(at.x, at.z), at.z); const i = m.stations.indexOf(v.station); if (i >= 0) m.stations.splice(i, 1); v.station = null; hud.banner(v.id === 'sailboat' ? 'Under sail — G at a shore or a quay to step off' : 'In the boat — G at a shore to step off'); }
    else if (!on && p.mounted?.kind === 'boat') {
        let shore = null; for (let a = 0; a < 6.28 && !shore; a += 0.4) for (let r = 2; r < 9; r += 1) { const x = p.pos.x + Math.cos(a) * r, z = p.pos.z + Math.sin(a) * r; if (m.heightAt(x, z) > -1.4) { shore = { x, z }; break; } }
        if (!shore) { hud.message('Steer to a shore to step off'); return; }
        flags[v.id] = { x: p.pos.x, z: p.pos.z }; p.mounted = null; p.pos.set(shore.x, m.groundAt(shore.x, shore.z), shore.z); placeBoat(v); save();
    }
}
function toggleMount(on) {
    const p = player.state;
    if (!on && p.mounted?.kind === 'boat') return toggleBoat(false);
    if (on && !p.mounted) { p.mounted = { saddle: horse.saddle }; const i = world.current.stations.indexOf(horse.station); if (i >= 0) world.current.stations.splice(i, 1); horse.station = null; hud.banner('In the saddle — G to get down'); }
    else if (!on && p.mounted) { p.mounted = null; stats.flags.horse = { x: p.pos.x + Math.cos(p.facing) * 1.6, z: p.pos.z - Math.sin(p.facing) * 1.6 }; placeHorse(); save(); }
}
function updateHorse(dt) {
    if (!horse.model) return;
    placeHorse();
    const p = player.state;
    if (p.mounted && p.mounted.kind !== 'boat') { horse.model.root.position.copy(p.pos); horse.model.root.rotation.y = p.facing; if (world.current.swimming?.(p.pos.x, p.pos.z)) toggleMount(false); }
    horse.model.update(dt, p.mounted && p.mounted.kind !== 'boat' ? p.speed : 0);
    for (const v of VESSELS) { if (!v.model) continue; placeBoat(v); const mine = p.mounted?.id === v.id; if (mine) { v.model.root.position.set(p.pos.x, v.y, p.pos.z); v.model.root.rotation.y = p.facing; } v.model.update(dt, mine ? p.speed : 0); }
}
let uwShown = false; const uw = document.createElement('div');
uw.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:4;background:radial-gradient(ellipse at 50% 40%, #2c8a9855, #0a3a44cc);opacity:0;transition:opacity .4s';
document.body.append(uw);
let fpShown = false;   // the camera's first-person view, last applied to the hero's body
let travel = null;
const questHooks = {};
const player = createPlayer({ hooks: questHooks, name: HERO_NAME, stats, hero, cam, world, hud, fireballs, spellTuning: SPELL_TUNING,
    auraFx: sp => fireballs.blastAt(player.state.pos.clone(), sp, 1, 10, [], { cosmetic: true }),
    blinkFx: (from, to) => { sfx.cast(); for (const at of [from, to]) fireballs.blastAt(at.clone(), spellsAll.SPELLS.mana_dart, 1, 10, [], { cosmetic: true, small: true }); } });   // a self spell: its element bursts round the caster

// What Eldrin holds follows his equipment (amo's equip events).
const ITEMS = itemRules.ITEMS;
const handOf = id => id ? { type: id === 'claymore' ? 'claymore' : id === 'torch' ? 'torch' : weaponRules.typeOf(ITEMS[id]) === 'fists' && ITEMS[id]?.slot === 'offHand' ? 'shield' : weaponRules.typeOf(ITEMS[id]), accent: ITEMS[id]?.color } : null;   // the claymore has its own model (a greatsword in the rules)
// The torch (left hand): a warm flickering light that walks with you. It lives in every scene at zero strength so the
// number of lights never changes when you light it.
const torchLight = new THREE.PointLight(0xffa050, 0, 11, 1.5);
function updateTorch(t) {
    const lit = stats.equipment.offHand === 'torch' && !player.state.dead;
    const p = player.state.pos, f = player.state.facing;
    torchLight.position.set(p.x + Math.sin(f) * 0.3 + Math.cos(f) * 0.35, p.y + 1.7, p.z + Math.cos(f) * 0.3 - Math.sin(f) * 0.35);
    torchLight.intensity = lit ? 9 * (0.85 + Math.sin(t * 13) * 0.08 + Math.sin(t * 29.7) * 0.06) : 0;
}
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
const skills = createSkills({ stats, player, hud, cam, world, archery: () => archery });
const archery = createArchery({ stats, player, hud, cam, world, loot });
// Working a node: the tool it needs comes out in the right hand (a pickaxe at the ore, the axe at the deadwood, the
// sickle at the reeds, the rod at the water), the hero turns to it and swings, cuts or casts — or kneels to pick by
// hand — then puts it away.
const TOOL_MODEL = { iron_pickaxe: 'pickaxe', iron_axe: 'axe', sickle: 'sickle', fishing_rod: 'rod' };
const TOOL_MOVE = { pickaxe: ['overhead', 0.75], axe: ['chop', 0.7], sickle: ['sidelong', 0.6], rod: ['raise', 0.9] };
let toolTimer = null;
function workNode(tool, type, at) {
    const model = TOOL_MODEL[tool];
    const p = player.state; p.facing = Math.atan2(at.x - p.pos.x, at.z - p.pos.z);
    player.addBuff('shaping', 900);
    if (model) {
        hero.setWeapons({ type: model }, handOf(stats.equipment.offHand));
        const [pose, dur] = TOOL_MOVE[model]; player.playMove(pose, dur, 'R');
        if (model !== 'rod') setTimeout(() => { skills.vfx.burst(at.clone().setY(at.y + 0.4), type === 'mineral' ? 0xffe0a0 : 0xc8a070, 14, 2.5); skills.vfx.puff(at, 8, undefined, 0.6); sfx[type === 'mineral' ? 'parry' : 'hit']?.(); }, dur * 520);
        clearTimeout(toolTimer); toolTimer = setTimeout(showWeapons, 1300);
    } else player.playMove('vanish', 0.8, 'R');   // kneel and pick
}
const gathering = createGathering({ stats, hud, onGather: (id, n) => quests?.onGather(id, n), onWork: workNode });
const chests = createChests({ stats, hud });
const mapView = createMapView({ stats, hud });
const shop = createShop({ stats, hud, save: () => save() });
const quests = createQuests({ stats, hud });
registerSanctuaryQuests(stats);
registerPrologueQuests(stats);   // chapters 1–2 (the study, the vision)
registerChapterQuests(stats);   // Eldoria's Prophecy, chapters 6–12   // game quests from the campaign spec, run by amo's quest manager as generated quests
const bountyBoard = createBountyBoard({ stats, hud, save: () => save() });
// Two-hand actions (Options): each hand's action button and the arch that cycles its favourites.
const hands = createHands({ stats, hud, input, isTouch: document.body.classList.contains('touch-mode') });
// Spell targeting (aiming.js): hold a hand's button with a spell on it, a ring on the ground follows the finger /
// mouse / right stick; let go to cast there. A tap casts at once as before.
const aiming = createAiming({ camera, cam, input, getPlayer: () => player.state, getMap: () => world.current, PX, tuning: SPELL_TUNING });
const touchAt = { L: { x: 0, y: 0 }, R: { x: 0, y: 0 } }, mouseAt = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener('mousemove', e => { mouseAt.x = e.clientX; mouseAt.y = e.clientY; if (aiming.pending) aiming.move(e.clientX, e.clientY); });
hands.onAct = (side, kind, x, y) => {
    if (kind === 'move') { aiming.move(x, y); return; }
    if (kind === 'down') { touchAt[side] = { x, y }; input.press(`hand${side}:down:touch`); } else input.press(`hand${side}:up`);
};
function handDown(side, how, act) {
    const a = hands.current(side);
    if (a?.startsWith('spell:')) {
        const at = how === 'touch' ? touchAt[side] : mouseAt;
        if (aiming.down(side, a.slice(6), stats.spells?.[a.slice(6)] ?? 1, how, at.x, at.y)) return;   // wait for the release
    }
    handAction(side, act);
}
function handUp(side, act) {
    if (!aiming.pending || aiming.side !== side) return;
    const target = aiming.up(side), a = hands.current(side);
    if (!a?.startsWith('spell:')) return;
    act.cast = true; act.castSpell = a.slice(6); act.castHand = side; act.castAt = target;   // target null: a tap, cast as usual
}
function handAction(side, act) {
    const t = hands.handType(side), a = hands.current(side);
    if (!t || !a) return;
    if (a === 'hit') {
        if ((t === 'bow' || t === 'crossbow') && archery.armed()) archery.shoot();
        else if (t === 'shield') player.raiseShield();   // raised for a moment: a perfect block if the blow lands at once
        else { act.strike = true; act.strikeType = t; act.strikeHand = side; }
    } else if (a.startsWith('spell:')) { act.cast = true; act.castSpell = a.slice(6); act.castHand = side; }
    else if (a.startsWith('skill:')) skills.useId(a.slice(6), t, side);
}
let handsTick = 0, lavaTick = 0, shifting = false;
const book = createBook({ stats, hud, save: () => save(), hands });
const skillBook = createBook({ stats, hud, save: () => save(), hands, kind: 'skills' });
const pause = createPause({ hud, save: () => save() });
const codex = createCodex({ stats, hud, getPlace: () => world.current?.name ?? null });
// Writing up the codex: at a campfire or a table — it takes a while (a quarter hour a page, an hour at most).
function writeCodex() {
    const n = codex.writeUp();
    if (!n) { hud.message('Nothing new to write up'); return; }
    clockRules.advanceClock(stats, Math.min(60, 15 * n) * 1000);
    sfx.pageTurn?.(); hud.banner(`Codex — ${n} page${n > 1 ? 's' : ''} written up`); save();
}
const dropLoot = (table, at) => { const n = loot.drop(table, at); codex.dropped(loot.lastIds); return n; };
questHooks.onKill = (type, extra = {}) => { quests.onKill(type, { ...extra, mapId: world.current?.id ?? null }); codex.killed(type); };   // mapId: bounty kills count in their region only
const thaloriaBias = () => 'neutral';   // amo: Thaloria's currencyBias
const dialogue = createDialogue({
    stats, hud, day: () => clockRules.gameDay(stats.gameMinutes ?? 0), save: () => save(),
    onShop: npc => shop.openFor(npc, thaloriaBias()),
    onQuest: id => quests.start(id),
    onTalked: (npcId, name, start) => quests.afterTalk(npcId, name, start),
    onTeach: () => {},
});
let chapters = null;   // created below, once the world and the player exist
let prologue = null;   // chapters 1–2 (content/prologue.js), likewise

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
const sight = createSight({ stats, hud, getMap: () => world.current, getPlayer: () => player.state });   // Aether Sight, the active use (L)
travel = createTravel({
    stats, hud, world, player, onAttune: id => quests.onAttune(id), interiors: Object.keys(interiorBuilders),
    allGates: () => [
        ...(world.maps.eldoria?.stamps?.find(st => st.id === 'outdoor')?.map.gates ?? world.maps.outdoor?.gates ?? []).map(g => ({ ...g, map: 'outdoor' })),
        ...EAST_ROAD_GATES.map(g => ({ ...g, map: 'east_road' })),
        ...Object.values(REGIONS).flatMap(r => (r.gates ?? []).map(g => ({ ...g, map: r.id }))),
        ...NYTHORIA_GATES,   // (Nythoria's monoliths: the Tear reaches the shadow world too)
    ],
});
const campfire = createCampfire({
    stats, hud, onCraft: id => quests?.onCook(id), codexPending: () => codex.pending(), onWriteCodex: () => writeCodex(),
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
    getLook: heroLook, getWeapons: () => handOf(stats.equipment.weapon)?.type ?? 'fists',
    getName: () => settings.onlineName || HERO_NAME, getLevel: () => stats.level });
stats.onEquipChange(() => net.refresh());
questHooks.onCast = (origin, dir, spellId) => net.cast(origin, dir, spellId);
// A spell rises a tier (or is discovered) through use: say so.
stats.onSpellEvent((id, lvl, isNew) => {
    const sp = spellsAll.SPELLS[id]; if (!sp || stats.flags?.godSpells?.includes(id)) return;
    hud.banner(isNew ? `New spell — ${sp.name}` : `${sp.name} — ${spellsAll.TIER_NAMES?.[lvl - 1] ?? `tier ${lvl}`}`);
    sfx.levelUp();
});
const options = createOptions({ quality, onQuality: name => { save(); setQualityName(name); location.reload(); },
    onApply: (name, tw) => { save(); setQualityName(name); setTweaks(tw); location.reload(); },   /* a preset, then its tweaks (setQualityName clears them) */
    onFps: v => perf.set(v), onOnline: v => (v ? net.connect() : net.disconnect()) });
if (settings.online) net.connect();
if (settings.showFps) perf.set(true);
createPadNav();   // gamepad: D-pad / stick moves through any open menu, A presses, B backs out
// Save slots: a new journey goes into the active slot if it is empty, else the first empty one; when all
// three are full the slots screen asks which to replace.
let newKind = 'eldrin';
const CAMPAIGN_HEROES = { seraphina: { cast: seraphinaCast, classId: 'shadowblade', start: 'ravenspire' }, anya: { cast: anyaCast, classId: 'mage', start: 'ravenspire_east' } };   // A Tapestry of Souls
const beginNew = () => {
    const ch = CAMPAIGN_HEROES[newKind];
    if (ch) { try { localStorage.setItem('amo3d.newHero', JSON.stringify({ name: ch.cast.name, classId: ch.classId, look: ch.cast.look, start: ch.start, campaign: 'tapestry', id: ch.cast.id })); } catch { /* storage blocked */ } location.href = `${location.pathname}?new=1&play=1&hero=new`; return; }
    location.href = newKind === 'hero' ? 'forge.html?mode=create' : `${location.pathname}?new=1&play=1`;
};
const slots = createSlots({ onPlay: () => { location.href = `${location.pathname}?play=1`; }, onNew: () => { newKind = 'eldrin'; title?.showNewGame?.() ?? beginNew(); } });
function startNewJourney(kind) {
    newKind = kind;
    if (!hasSave(activeSlot())) return beginNew();   // the current save is empty: use it
    setActiveSlot(addSave()); beginNew();             // otherwise a new save at the end of the list — never overwrite
}
const activeInfo = slotInfo(activeSlot());
if (!SHOW_TITLE) { document.body.classList.add('booted'); setTimeout(() => document.getElementById('boot')?.remove(), 900); }   // no title screen (Play here, tests): the loading logo goes at once
// The title over the open world: the Eldoria's Prophecy cover — from the west cliff of the gorge, high, the river below,
// the Citadel on its cliff across it, the valley and the mountains behind; a slow drift. (COVER: tuned by eye.)
const COVER = { from: [250, 14, 112], to: [-30, 12, 60], drift: 6 };
const coverFocus = new THREE.Vector3();
function titleFocus() {   // where the world streams and builds round while the title shows: the cover's foreground (or the old tower)
    if (world.id !== 'eldoria') return title.focus;
    if (!TITLE_COVER) { const gl = world.current.stamps?.find(s2 => s2.id === 'outdoor'); if (gl) return coverFocus.copy(title.focus).add(gl.off); }
    const c = world.current.spawns?.['place:The Citadel of Thaloria'] ?? world.current.spawns?.['thaloria:north_gate'];
    if (!c) return title.focus;
    return coverFocus.set(c.x - 60, world.current.heightAt(c.x - 60, c.z + 40), c.z + 40);
}
// For now the title swings round Eldrin's Tower (asked 2026-11-20); the cover shot below is kept for later (TITLE_COVER).
const TITLE_COVER = false;
function coverShot(time, pos, look) {
    if (world.id !== 'eldoria') return false;
    if (!TITLE_COVER) {   // the tower's shot (title.js), moved to where the glade sits in the open world
        const gl = world.current.stamps?.find(s2 => s2.id === 'outdoor'); if (!gl) return false;
        const a = Math.sin(time * 0.045) * 0.75, p = vToWorld(Math.sin(a) * 33, -Math.cos(a) * 33);
        pos.set(p.x + gl.ox, ELDRIN_V.TY + 8 + Math.sin(time * 0.11) * 1.5 + gl.oy, p.z + gl.oz);
        look.set(ELDRIN_V.T.x + gl.ox, ELDRIN_V.TY + 9 + Math.sin(time * 0.07) * 1.2 + gl.oy, ELDRIN_V.T.z + gl.oz);
        return true;
    }
    const st = world.current.stamps?.find(s2 => s2.id === 'citadel_plateau'); if (!st) return false;
    const a = Math.sin(time * 0.05) * COVER.drift;
    pos.set(st.ox + COVER.from[0] + a, st.oy + COVER.from[1] + Math.sin(time * 0.09) * 1.5, st.oz + COVER.from[2] - a * 0.4);
    look.set(st.ox + COVER.to[0], st.oy + COVER.to[1], st.oz + COVER.to[2]);
    return true;
}
const title = SHOW_TITLE ? createTitle({
    camera, hasSave: hadSave, quality, onOptions: () => options.toggle(true), onSlots: () => slots.toggle(true),
    coverShot: (time, pos, look) => coverShot(time, pos, look),
    continueLabel: activeInfo && !activeInfo.empty ? `CONTINUE — ${activeInfo.hero.toUpperCase()}, LV ${activeInfo.level}` : 'CONTINUE',
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
let coordT = 0;
const coordEl = document.createElement('div');   // Options → Coordinates: placed under the minimap or the clock, whichever is lower
coordEl.className = 'hud'; coordEl.id = 'coords';
coordEl.style.cssText = 'right:18px;top:260px;font-size:calc(13px * var(--ui, 1));opacity:.85;letter-spacing:.04em;font-variant-numeric:tabular-nums;display:none';
document.body.append(coordEl);
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
// A chest's seed (an id, or [id, qty] for a stack) fills it the first time it is opened.
// TESTING convenience — station.restock (Eldrin's chest, the fighting-style test kit): on every opening, a seed item
// found nowhere (not in this chest, the satchel or worn) is put back, so saves that opened the chest before get it too.
function seedChest(station) {
    if (!station.seed) return;
    const entries = station.seed.map(e => Array.isArray(e) ? { id: e[0], qty: e[1] } : { id: e, qty: 1 }).filter(e => ITEMS[e.id]);
    if (!stats.chestContents[station.key]) { stats.chestContents[station.key] = entries.map(e => ({ ...e })); return; }
    if (!station.restock) return;
    const box = stats.chestContents[station.key];
    const worn = new Set(Object.values(stats.equipment));
    for (const e of entries) {
        if (box.length >= 24) break;   // chest.js CHEST_SLOTS
        if (box.some(c => c.id === e.id) || stats.inventory.some(i => i.id === e.id) || worn.has(e.id)) continue;
        box.push({ ...e });
    }
}
function clock(min = stats.gameMinutes ?? clockRules.START_MINUTES) {
    const weather = world.current?.terrain ? (weatherOverride || weatherOf(world.current.weatherDef ?? GLADE_WEATHER, min)) : 'clear';
    return { minutes: min, hour: clockRules.gameHour(min), weather, voidMult: clockRules.isNight(min) ? clockRules.NIGHT_DAMAGE_MULT : 1 };
}

let simT = 0;
function tick(dt) {
    dt = hitStopScale(dt);   // a heavy blow holds the world a moment
    simT += dt;
    if (title?.active) {
        input.poll(dt);   // drain input while the title owns the screen
        title.update(dt, gameCam);
        world.current.update(simT, dt, { ...clock((world.id === 'eldoria' && TITLE_COVER ? 18.4 : 19.4) * 60), weather: 'clear', player: { pos: titleFocus(), dead: true, speed: 0 }, camera, fx: world.current.fx ?? fireballs, hurtPlayer: () => false, floater: hud.floater, onKill: player.onKill, dropLoot: loot.drop });
        return;
    }
    const act = input.poll(dt);
    if (act.keys.includes('F2')) { save(); nextQuality(quality); location.reload(); return; }
    if (act.keys.includes('F3')) { settings.showFps = !settings.showFps; perf.set(settings.showFps); }   // the counters and the open world's readout together
    if (act.inventory) inventory.toggle();
    if (act.sheet) sheet.toggle();
    if (act.camCycle) cam.cycle();   // R3: first person, then three distances
    if (act.map) mapView.toggle();
    if (act.journal) quests.toggle();
    if (act.codex) codex.toggle();
    if (act.options) options.toggle(true);
    if (act.book) book.toggle(true);
    if (act.skillbook) skillBook.toggle(true);
    if (act.quit) pause.toggle(true);
    if (act.blink) player.blink();
    if (act.shift && !player.state.dead) {   // the change: human ↔ wolf
        if (!WEREWOLF) hud.message('Only the Guardians of the Wild can take the wolf form.');
        else if (player.state.cast) { /* not mid-spell */ }
        else if (!shifting) {
            // The change takes a moment: doubled over and shaking, a burst of dark smoke and fur as the body turns,
            // then up again — with a roar as the wolf, a long breath as yourself. Rooted while it happens.
            const toWolf = !stats.flags.wolfForm;
            shifting = true; player.addBuff('shaping', 1100); player.playMove('change', 0.5, 'R'); sfx.growl?.();
            setTimeout(() => {
                stats.flags.wolfForm = toWolf;
                player.setWolf(toWolf); dressHero(); cam.kick?.(0.45);
                const P = player.state.pos;
                skills.vfx.puff(P, 34, toWolf ? [0.2, 0.17, 0.15] : [0.35, 0.33, 0.3], 1.2);
                skills.vfx.burst(P.clone().setY(P.y + 1.2), toWolf ? 0x8a6a4a : 0xd8d0c0, 30, 3.5, { up: 2.5, grav: 4 });
                skills.vfx.shock(P, 2.6, toWolf ? 0xb07040 : 0xe0d8c8);
                player.playMove(toWolf ? 'roar' : 'vanish', 0.6, 'R'); if (toWolf) sfx.roar?.();
                hud.message(toWolf ? 'You let the wolf out — faster, claws like knives; no spells in this shape. (V again to change back)' : 'You come back to yourself.');
                shifting = false;
            }, 500);
        }
    }
    if (act.chat) net.openChat();
    net.update(dt, camera);
    for (const h of world.current.hittables ?? []) if (h.engaged) codex.seen(h.kind === 'shadow' ? 'mirror_shade' : h.kind);
    const menuOpen = inventory.open || sheet.open || campfire.open || chests.open || mapView.open || travel.open || dialogue.open || shop.open || quests.open || codex.open || bountyBoard.open || options.open || book.open || skillBook.open || pause.open;
    if (menuOpen) { act.hotbar = -1; act.skill = -1; act.tear = false; act.sight = false; act.strike = false; }   // the D-pad and buttons drive the menu, not the hotbar
    if (act.tear) travel.tear();
    if (act.sight) sight.use();
    if (settings.hands && !menuOpen && !player.state.dead) {
        act.skill = -1;
        for (const c of act.cycle) {   // 'cycleL:down' (key), 'cycleL:pad', 'cycleL:up'
            const side = c[5], kind = c.slice(7);
            if (kind === 'up') hands.cycleUp(side); else hands.cycleDown(side, kind === 'pad' ? 'pad' : 'key');
        }
        if (hands.fanOpen) act.hotbar = -1;   // 1–3 pick in a key-held fan
        for (const h of act.hand) {   // 'handR:down:mouse' · 'handL:up'
            const [k, kind, how] = h.split(':'), side = k[4];
            if (kind === 'down') handDown(side, how, act); else handUp(side, act);
        }
        aiming.update(dt);
        { const m = world.current; if (m?.heightAt) drapeAll((x, z) => Math.max(m.groundAt ? m.groundAt(x, z) : m.heightAt(x, z), m.waterAt ? m.waterAt(x, z) : (m.mapInfo?.water ?? -Infinity))); }   // spell rings and marks on the relief
    }
    hands.update();
    if ((handsTick -= dt) <= 0) { handsTick = 0.1; hands.render(); document.body.classList.toggle('blink-on', (stats.skills?.blink_step?.level ?? 0) > 0); document.body.classList.toggle('wolf-on', WEREWOLF); player.setWolf(WEREWOLF && !!stats.flags?.wolfForm); }
    mapView.update(player.state, cam.yaw);
    if (world.current.lava != null && !player.state.dead && !settings.god && player.state.pos.y < world.current.lava + 0.35) {   // magma: it burns
        lavaTick -= dt; if (lavaTick <= 0) { lavaTick = 0.5; player.hurt(9, player.state.pos.clone()); hud.message('The magma burns!'); }
    }
    if (act.hotbar >= 0 && !player.state.dead) hotbar.use(act.hotbar);
    if (act.strike && archery.armed()) { archery.shoot(); act.strike = false; }   // a bow or crossbow shoots instead
    hotbar.update(dt);
    if (act.skill >= 0 && !inventory.open && !sheet.open) skills.use(act.skill);
    skills.update(dt);
    { const f = player.takePerfect(); if (f) { const h = (world.current.hittables ?? []).filter(x => x.alive).sort((a, b) => a.pos.distanceTo(f) - b.pos.distanceTo(f))[0]; if (h && h.pos.distanceTo(f) < 3) h.hit(1, player.state.pos, 0, player.lastCtx, { id: 'dazed', ms: 1500 }); } }   // a perfect block: the attacker reels
    dialogue.update(dt, camera, project);
    if (cine && !dialogue.open && !shop.open) cine = null;   // the talk is over: the camera goes back
    if (cine && dialogue.open) cineCamera(dt);
    if (inventory.open || sheet.open || campfire.open || chests.open || mapView.open || travel.open || dialogue.open || shop.open || quests.open || codex.open || bountyBoard.open || options.open || book.open || skillBook.open || pause.open) { hud.update(dt, { stats, player: player.state, camera, spell: player.activeSpell() }); return; }   // paused
    const map = world.current;
    // Gathering: G / Enter / tap the prompt — and gamepad A next to a node (instead of a hop).
    const pp = player.state.pos;
    if (player.state.mounted && act.gather) { toggleMount(false); act.gather = false; }   // get down from the horse
    let station = (map.stations ?? []).filter(st => Math.hypot(st.pos.x - pp.x, st.pos.z - pp.z) < 2.3 && Math.abs(st.pos.y - pp.y) < 1.6)
        .reduce((b, st) => (!b || Math.hypot(st.pos.x - pp.x, st.pos.z - pp.z) < Math.hypot(b.pos.x - pp.x, b.pos.z - pp.z) ? st : b), null);   // the nearest, when two are close
    let person = map.town ? map.town.nearestPerson(pp) : null;
    // Whichever is closer wins: a person standing by a chest or sign is still someone to talk to.
    if (station && person) { if (Math.hypot(person.pos.x - pp.x, person.pos.z - pp.z) < Math.hypot(station.pos.x - pp.x, station.pos.z - pp.z)) station = null; else person = null; }
    const personName = person?.r.npc ? person.r.npc.name.replace(/^./, c => c.toUpperCase()) : null;
    const gatherText = player.state.mounted ? (player.state.mounted.kind === 'boat' ? 'G — Step ashore' : 'G — Get down') : station ? STATION_PROMPT[station.mode] : person ? `G — Talk${personName ? ` to the ${personName}` : ''}` : gathering.update(simT * 1000, player.state);
    if (gatherText && (act.gather || (act.hop && input.device === 'gamepad'))) {
        if (station?.mode === 'chest') { seedChest(station); chests.toggle(station.key, station.title); }
        else if (station?.mode === 'sign') { dialogue.start([{ speaker: '', text: station.text }]); quests.manager.onReadSign(station.id ?? null); station.onUse?.({ quests, stats }); }
        else if (station?.mode === 'gate') travel.useGate(station.key);
        else if (station?.mode === 'portal') { const to = station.to; world.go(to, station.spawn ?? 'gate'); hud.banner(to === 'nythoria' ? 'Nythoria — the shadow world' : 'Eldoria'); }   // the Obsidian Gate: the same spot, the other world
        else if (station?.mode === 'board') bountyBoard.use({ key: station.key, place: station.place, regionDef: station.region === 'east_road' ? eastRoadMap.default : thaloriaMap.default });
        else if (station?.mode === 'desk') writeCodex();
        else if (station?.mode === 'mount') toggleMount(true);
        else if (station?.mode === 'boat') toggleBoat(true, station.vessel);
        else if (station?.mode === 'cairn') { stats.respawnPoint = { map: map.id, spawn: station.key }; hud.banner('A cairn — if you fall, you will come back here'); save(); }
        else if (station) campfire.toggle(station.mode);
        else if (person) { cine = { pos: person.pos.clone(), t: 0 }; if (person.r.onTalk) person.r.onTalk({ start: dialogue.start, quests, stats, hud, save, talk: () => dialogue.talk(person, clock()) }); else dialogue.talk(person, clock()); }   // onTalk: a map's own conversation (the Sanctuary)
        else gathering.harvest(simT * 1000);
        act.hop = false;
    }
    let lift = 0;
    clockRules.advanceClock(stats, dt * 1000);
    sight.update(dt);   // amo: one real minute = one game hour
    const ctx = { ...clock(), message: hud.message, attunedGates: stats.attunedGates, player: player.state, camera,
        flags: (stats.flags ??= {}), shake: a => cam.kick(a), customHero: CUSTOM, players: net.targets(), hurtRemote: (id, dmg, from) => net.hurtRemote(id, dmg, from),
        drainVigor: n => { stats.vigor = Math.max(0, stats.vigor - n); },
        onRetreat: () => { stats.flags.malphas_retreated = true; save(); }, map: world.current, coreOf,
        playerStatus: (id, ms) => player.addBuff(id, ms), dispelPlayer: () => player.dispelSelf(), fx: world.current.fx ?? fireballs, hurtPlayer: player.hurt, floater: hud.floater, onKill: player.onKill, dropLoot };
    if (!world.step(dt)) lift = player.step(dt, act, ctx);
    const p = player.state;
    updateHorse(dt);
    if (player.state.diving) lift += player.state.diving.depth * 2;   // (cam.update halves lift: the camera dives with you)
    { const under = player.state.diving && camera.position.y < -2.05; if (under !== uwShown) { uwShown = under; uw.style.opacity = under ? 1 : 0; } }   // under water: a blue-green veil
    const camFloor = map.heightAt && !p.diving && map.mapInfo?.water != null ? (x, z) => (map.waterAt ? map.waterAt(x, z) : map.mapInfo.water) + 0.35 : null;   // (above the water's surface, unless you dive — only the camera's lowest point: the water never stands "in the way")
    cam.update(dt, p.pos, lift, map.heightAt ?? null, map.camBlockedAt ? (x, z, r, y) => map.camBlockedAt(x, z, y) : null, camFloor);   // the camera never sinks into the ground or the mountain, nor behind a wall
    if (cam.firstPerson !== fpShown) { fpShown = cam.firstPerson; hero.root.visible = !fpShown && !player.state.dead; }   // first person: Eldrin's own body out of the way
    const ceil = map.cameraCeiling?.(p.pos.x, p.pos.z, p.pos.y);   // under a cave roof: pull in below it
    if (ceil != null && camera.position.y > ceil) { const t = cam.target; camera.position.lerpVectors(t, camera.position, Math.max(0.2, (ceil - t.y) / (camera.position.y - t.y))); camera.lookAt(t); }
    if (gatherText && !hud.ui.prompt.textContent) { hud.ui.prompt.textContent = gatherText; hud.ui.prompt.style.opacity = 1; }
    if (map.levelName && !p.hop && p.vy === 0) {
        const lv = map.levelName(p.pos.y);
        if (lv !== lastLevel) { hud.banner(`${map.name} — ${lv}`); lastLevel = lv; }
    }
    map.update(simT, dt, ctx);
    chapters?.update(dt, { ...ctx, t: simT });
    if (!CUSTOM) prologue?.update(dt, { ...ctx, t: simT });
    updateEnemyMagic(dt, ctx);
    updateTorch(simT);   // enemy bolts in flight, their wards and the Void Aegis
    sweepPlates();
    fireballs.update(dt, map, map.hittables);
    loot.update(dt, player.state, map);
    archery.update(dt);
    travel.update(dt, map.fx ?? fireballs);
    godSpells();
    // Shadow Veil: the hero half-vanishes while it lasts.
    { const veiled = player.state.veil > 0;
      if (veiled !== !!hero._veiled) {
        hero._veiled = veiled;
        hero.root.traverse(o => {
          if (!o.material) return;
          const m = o.material, u = m.userData;
          if (veiled) { u.veilT = m.transparent; u.veilO = m.opacity; m.transparent = true; m.opacity = 0.3; }
          else if (u.veilO !== undefined) { m.transparent = u.veilT; m.opacity = u.veilO; delete u.veilO; }
        });
      } }
    if (settings.god) { stats.health = stats.maxHealth; stats.mana = stats.maxMana; stats.vigor = stats.maxVigor; stats.vigorWinded = false; }   // god mode: endless
    // Footsteps: what is underfoot decides the sound.
    if (p.speed > 0.6 && !p.hop && !p.dead && p.vy === 0) sfx.step(map.weatherDef?.biome === 'snow' || map.id === 'the_summit' ? 'snow' : (map.terrain ? 'grass' : 'stone'), p.sprinting);
    hud.update(dt, { stats, player: p, camera, spell: player.activeSpell() });
    const c = clock();
    clockEl.textContent = `${clockRules.clockLabel(c.minutes)} · ${weatherRules.WEATHER[c.weather] ?? c.weather}`;
    if (settings.showCoords) {   // Options → Coordinates: where you stand (x east, z south, height), metres
        const pp = player.state.pos;
        coordEl.textContent = `x ${Math.round(pp.x)} · z ${Math.round(pp.z)} · h ${Math.round(pp.y)}${world.id && world.id !== 'eldoria' ? ' · ' + world.id : ''}`;
        if ((coordT = (coordT ?? 0) - dt) <= 0) {   // (its place re-measured twice a second: the minimap and the clock move with the layout)
            coordT = 0.5; let b = clockEl.getBoundingClientRect().bottom; const mm = document.getElementById('minimap');
            const mr = mm?.getBoundingClientRect(); if (mr && mr.height > 0) b = Math.max(b, mr.bottom);
            coordEl.style.top = `${Math.round(b + 6)}px`;
        }
        coordEl.style.display = '';
    } else coordEl.style.display = 'none';
    if (archery.armed()) hud.ui.speed.textContent += `${hud.ui.speed.textContent ? ' · ' : ''}${archery.ready()} arrows ready (+${archery.spare()} in the satchel)`;
}

prologue = createPrologue({ stats, hud, dialogue, quests, save: () => save(), player, world, sfx });
chapters = createChapters({ stats, hud, dialogue, quests, save: () => save(), player, world, cam, relock: m => lockDoors(m, world.id) });
if (REGIONS[params.get('region')] || ['the_summit', 'thaloria', 'east_road', 'outdoor', 'sylvan_sanctuary', 'tower'].includes(params.get('region'))) world.enter(params.get('region'), 'start');   // the editor's "Play here"
else if (savedAt && world.maps && ['eldoria', 'nythoria', 'outdoor', 'tower', 'thaloria', 'east_road', 'the_summit', 'sylvan_sanctuary', 'citadel_library', 'forbidden_archive', ...Object.keys(DUNGEONS), ...Object.keys(interiorBuilders), ...Object.keys(REGIONS)].includes(savedAt.map)) world.enter(savedAt.map, null, savedAt);
else if (CUSTOM) {   // a hero of your own begins where they chose in the Forge (docs/3d/WORLD_PLAN.md): the Fields' village, the Shadow-Vale, or Thaloria's inn
    const where = heroDef.start ?? 'thaloria';
    if (where === 'fields') { stats.respawnPoint ??= { map: 'emerald_fields', spawn: 'village', label: "The Fields' village" }; world.enter('emerald_fields', 'village'); }
    else if (where === 'vale') { stats.respawnPoint ??= { map: 'nythoria', spawn: 'vale', label: 'The Shadow-Vale' }; world.enter('nythoria', 'vale'); }
    else if (where === 'ravenspire') { stats.respawnPoint ??= { map: 'nythoria', spawn: 'ravenspire', label: 'Ravenspire' }; world.enter('nythoria', 'ravenspire'); }   // Seraphina (A Tapestry of Souls)
    else if (where === 'ravenspire_east') { stats.respawnPoint ??= { map: 'nythoria', spawn: 'ravenspire_east', label: 'Near old Ravenspire' }; world.enter('nythoria', 'ravenspire_east'); }
    else if (where === 'rift') { stats.respawnPoint ??= { map: 'nythoria', spawn: 'place:The Great Rift', label: 'The Great Rift' }; world.enter('nythoria', 'place:The Great Rift'); }   // Anya: where Vorgos's tear cast her
    else world.enter('thaloria_inn', 'enter');   // wakes at the inn (the newcomer's story)
}
else world.enter('outdoor', 'start');
const loop = startLoop({ renderer, tick, render: () => { renderer.render(world.current.scene, camera); perf.frame(); } });

// Handle for headless checks.
window.__poc = {
    player: player.state, stats, input, cam, quality, save, skills, playerApi: player, quests,
    advance: s => loop.advance(s), renderer, camera, tickOnly: dt => tick(dt), showWeapons: () => showWeapons(), coreOf, debugMagic,
    hurtPlayer: player.hurt,
    keys: input.keys,
    get maps() { return world.maps; },
    get map() { return world.current; },
    enterMap: (id, sp) => world.enter(id, sp),
    cast: () => input.press('cast'),
    setTime: h => { stats.gameMinutes = Math.floor((stats.gameMinutes ?? 0) / 1440) * 1440 + h * 60; },
    setWeather: w => { weatherOverride = w; },
    strike: () => input.press('strike'),
    sight, workNode, loot, inventory, sheet, hotbar, skills, archery, title, gathering, campfire, chests, mapView, travel, dialogue, shop, quests, codex, net, fireballs, aiming, options, slots, bountyBoard, SPELLS: spellsAll.SPELLS, player: player.state, playerApi: player,
};
