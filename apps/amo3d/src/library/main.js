// The Library (library.html, 2026-11-27 — docs/3d/LIBRARY_PLAN.md, phase 1; it replaces the Bestiary): one codex of every
// thing in the game, by class — Creatures (Monsters, Bosses, Animals), People (Heroes & cast, the story's people, Thaloria's
// residents, every region's villagers), World (Trees, Houses, Props), Equipment (Weapons, and every wearable by slot) —
// each built by the game's own code on a turntable, with its card: lore and numbers, Edit in the Sculptor where the
// Sculptor takes it, Open the Forge for people, and notes (what you want changed) saved through the dev API —
// creatures: src/content/mob_notes, people: npc_notes, world and equipment: item_notes. Claude reads them
// ("process the mob / NPC / item notes"), makes the changes and answers in each note's `reply`.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { enemies as worldMap, bestiary as BS } from '@rules';
import { createBeasts, NAMES as BEAST_NAMES } from '../content/actors/beast.js';
import { createAnimals, NAMES as ANIMAL_NAMES } from '../content/actors/animals.js';
import { createWerewolves } from '../content/actors/werewolf.js';
import { createWolves } from '../content/actors/wolf.js';
import { createDeer } from '../content/actors/deer.js';
import { createShadows } from '../content/actors/shadowSoldier.js';
import { createMalphas } from '../content/actors/malphas.js';
import { setPlatesVisible } from '../content/actors/enemyCore.js';
import { createDuelist } from '../content/actors/duelist.js';
import { buildBalrog } from '../content/models/balrog.js';
import { buildHorse } from '../content/models/horse.js';
import { createCharacter } from '../content/models/character.js';
import { PART_CATALOG } from '../content/models/parts/index.js';
import { buildWeapon } from '../content/models/weapons.js';
import { buildHouse, buildProp } from '../content/models/buildings.js';
import { treeKinds } from '../content/models/flora.js';
import { npcCast } from '../content/castList.js';
import { buildChest } from '../game/chest.js';
import { paletteOf, applyPalette } from '../content/palette.js';
import { settings, setSetting } from '../engine/settings.js';

const ET = worldMap.ENEMY_TYPES, LORE = BS.BESTIARY_LORE ?? {};
const title = s => String(s).replace(/(^|_)([a-z])/g, (m, a, b) => `${a ? ' ' : ''}${b.toUpperCase()}`);
const flat = c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85 });
const sculptUrl = (a, b = 'base_male') => `sculptor.html?a=${a}:new&b=${b}:new`;

// ---------- every entry: { id, cls: [class, group], name, make(holder, map) → actors, sculpt?, forge?, notes, info? } ----------
const SCULPT_ANIMALS = new Set(['rabbit', 'forest_fox', 'feral_boar', 'black_bear', 'grizzly_bear', 'sheep', 'cow', 'pig', 'goat', 'chicken', 'crow', 'squirrel', 'chipmunk', 'rat', 'dog', 'snake', 'crocodile']);
const creature = (id, name, group, make, sculpt) => ({ id, cls: ['Creatures', group], name, make, sculpt, notes: 'mob' });
const ENTRIES = [
    ...Object.entries(BEAST_NAMES).map(([id, name]) => creature(id, name, 'Monsters', (s, map, layer) => createBeasts({ scene: s, map, rng: Math.random, type: id, posts: [{ x: 0, z: 0 }], layer }), sculptUrl(`mob_${id}`))),
    creature('werewolf', 'Guardian of the Wild', 'Monsters', (s, map) => createWerewolves({ scene: s, map, rng: Math.random, den: { x: 0, z: 0 }, count: 1 }), sculptUrl('mob_werewolf')),
    creature('shadow', 'Shadow-man', 'Monsters', (s, map) => createShadows({ scene: s, map, rng: Math.random, posts: [{ x: 0, z: 0 }] }).list, sculptUrl('shadow_soldier')),
    creature('malphas', 'Malphas', 'Bosses', (s, map) => { const b = createMalphas({ scene: s, map, at: { x: 0, y: 0, z: 0 }, rng: Math.random }); s.traverse(o => { if (!o.isSprite && !o.isPoints) o.visible = true; }); return [b]; }, sculptUrl('mob_malphas')),
    creature('shadow_balrog', 'The Shadow Balrog', 'Bosses', (s, map) => [createDuelist({ scene: s, map, at: { x: 0, z: 0, facing: 0 }, body: buildBalrog(), plateY: 8.2, name: 'The Shadow Balrog', reach: 4.2, speed: 2.2, windup: 0.8, def: { id: 'shadow_balrog', health: 9999, damage: 26, xpReward: 0, goldDrop: 0, lootTable: [] } })], sculptUrl('mob_balrog')),
    creature('boss_slam', 'Any boss (elite, slam)', 'Bosses', (s, map) => createBeasts({ scene: s, map, rng: Math.random, type: 'crag_fiend', posts: [{ x: 0, z: 0, boss: true, name: 'A boss' }] }), null),
    creature('wolf', 'Wolf', 'Animals', (s, map, layer) => createWolves({ scene: s, map, rng: Math.random, den: { x: 0, z: 0 }, count: 1, layer: layer ?? 'wolf' }), sculptUrl('wolf')),
    creature('deer', 'Deer', 'Animals', (s, map) => { const d = createDeer({ home: { x: 0, z: 0 }, stag: true, rng: Math.random, map }); s.add(d.root); return [d]; }, sculptUrl('mob_deer')),
    creature('horse', 'Horse', 'Animals', (s, map, layer) => { const h = buildHorse({ layer: layer ?? 'horse' }); s.add(h.root ?? h); return []; }, sculptUrl('horse')),
    ...Object.entries(ANIMAL_NAMES).map(([id, name]) => creature(id, name, 'Animals', (s, map, layer) => createAnimals({ scene: s, map, rng: Math.random, type: id, posts: [{ x: 0, z: 0 }], layer: layer ?? id }), SCULPT_ANIMALS.has(id) ? sculptUrl(id) : null)),
];
// people: a character from its look (the game's own builder)
const person = (id, name, group, look, extra = {}) => ({ id, cls: ['People', group], name, make: s => { const c = createCharacter(look); s.add(c.root); return [{ update: dt => c.update(dt, { speed: 0, sprinting: false, hopK: null }) }]; }, notes: 'npc', ...extra });
const SCULPT_CAST = new Set(['eldrin', 'seraphina', 'seraphina_rebel', 'anya']);
for (const p of npcCast()) ENTRIES.push(person(p.id, p.name, p.group === 'Story' ? 'The story' : p.group === 'Thaloria' ? 'Thaloria' : `Villagers — ${p.group}`, p.look, { look: p.look }));
// world objects
const TREE_COL = { pine: 0x2f5a34, broad: 0x4a7a3a, birch: 0x8aa84a, dead: null };
for (const [k] of Object.entries(treeKinds())) ENTRIES.push({ id: `tree_${k}`, cls: ['World', 'Trees'], name: `${title(k)} tree`, notes: 'item', make: s => { const K = treeKinds()[k]; const g = new THREE.Group(); const t = new THREE.Mesh(K.trunk, flat(K.trunkColor ?? 0x5e4630)); t.castShadow = true; g.add(t); if (K.crown && TREE_COL[k] !== null) { const c = new THREE.Mesh(K.crown, flat(TREE_COL[k] ?? 0x4a7a3a)); c.castShadow = true; g.add(c); } s.add(g); return []; } });
const HOUSES = [['cottage', 'Cottage', {}], ['townhouse', 'Town house', { w: 7, d: 6, h: 6, chimney: true, lantern: true }], ['stone_house', 'Stone house', { stone: true, roof: 0x4a4a52 }], ['inn', 'Inn (with a sign)', { w: 9, d: 7, h: 5.5, sign: 'inn', lantern: true }], ['ruin', 'Ruined house', { roofType: 'ruin' }]];
for (const [k, name, o] of HOUSES) ENTRIES.push({ id: `house_${k}`, cls: ['World', 'Houses'], name, notes: 'item', make: s => { s.add(buildHouse(o)); return []; } });
const PROPS = ['barrel', 'crate', 'fence', 'stone_wall', 'ruin_wall', 'bench', 'stall', 'cart', 'well', 'lamp', 'signpost', 'boat', 'pier', 'steps', 'arch', 'column', 'pedestal', 'runestone', 'weeping_stone', 'heap', 'flowers', 'rails', 'mine', 'chimney', 'platform', 'glass_stair', 'umbral_arch', 'umbral_column', 'umbral_spire', 'ancient_door', 'dead_gate', 'flame_gate', 'crucible', 'golem', 'keeper', 'keep', 'citadel', 'glow'];
ENTRIES.push({ id: 'prop_chest', cls: ['World', 'Props'], name: 'Chest', notes: 'item', make: s => { buildChest(s, 0, 0, 0); return []; } });
for (const k of PROPS) ENTRIES.push({ id: `prop_${k}`, cls: ['World', 'Props'], name: title(k), notes: 'item', make: s => { const g = buildProp(k); if (!g || !g.children?.length) throw new Error('no such prop yet'); s.add(g); return []; } });
// equipment: weapons on their own; each wearable on a plain figure
const WEAPONS = ['sword', 'greatsword', 'claymore', 'dagger', 'axe', 'mace', 'spear', 'halberd', 'bo', 'staff', 'rod', 'wand', 'bow', 'crossbow', 'shield', 'torch', 'pickaxe', 'sickle'];
for (const k of WEAPONS) ENTRIES.push({ id: `weapon_${k}`, cls: ['Equipment', 'Weapons'], name: title(k), notes: 'item', make: s => { const w = buildWeapon(k); const g = w.group ?? w; g.position.y = 1.0; s.add(g); return []; } });
const PLAIN = Object.fromEntries([...Object.keys(PART_CATALOG), 'left', 'right'].map(k => [k, { id: 'none' }]));
const SLOT_NAME = { torso: 'Torso', legs: 'Legs', feet: 'Feet', arms: 'Arms', shoulders: 'Shoulders', waist: 'Waist', neck: 'Neck', headgear: 'Headgear', cape: 'Capes', back: 'Back', accessory: 'Accessories' };
for (const [slot, list] of Object.entries(PART_CATALOG)) for (const p of list ?? []) {
    if (!p?.id || p.id === 'none') continue;
    ENTRIES.push({ id: `wear_${slot}_${p.id}`, cls: ['Equipment', `Wearables — ${SLOT_NAME[slot] ?? title(slot)}`], name: p.label ?? title(p.id), notes: 'item',
        make: s => { const c = createCharacter({ body: { preset: 'adult_male', race: 'human', skin: '#e2b590' }, hair: { style: 'short' }, parts: { ...PLAIN, [slot]: { id: p.id } } });   /* (on a plain figure: every other slot empty — not Eldrin's coat) */ s.add(c.root); return [{ update: dt => c.update(dt, { speed: 0, sprinting: false, hopK: null }) }]; } });
}
const CLASS_ORDER = ['Creatures', 'People', 'World', 'Equipment'];

// ---------- the stage ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true;
stage.append(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1a1620);
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400); camera.position.set(4, 3, 6);
const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 1, 0); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x2a2430, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(4, 8, 5); sun.castShadow = true; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a3440 })); floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(5.9, 6, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf3d88b })); ring.position.y = 0.01; scene.add(ring);
const grid = new THREE.GridHelper(12, 12, 0x5a5060, 0x2e2834); grid.position.y = 0.005; scene.add(grid);   // 1 m squares, for size
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
setPlatesVisible(false);
const map = { id: 'library', heightAt: () => 0, groundAt: () => 0, resolve() {}, blockedAt: () => null, passable: () => true, stepBlocked: () => false, hittables: [], nav: null, projectileHit: () => null };
const dummy = { pos: new THREE.Vector3(0, 0, 60), dead: false };
const ctx = { camera, player: dummy, hurtPlayer: () => false, floater() {}, message() {}, shake() {}, hour: 12, weather: 'clear', flags: {}, voidMult: 1, dropLoot() {}, onKill() {} };
let current = null, holder = null, actors = [], mode = 'idle', frameIn = 0, buildError = null, reframe = 0, stageR = 0.8;
// the palette (2026-11-27): an original's swatches are taken on its plain build, a clone's on its base as the game shows
// it (the base's own colours applied); the working colours = what is saved + what is being changed (pending)
const recolors = {};   // an original's saved colours (recolor_<id>.json): id → { hex: hex }
let pending = {}, swatches = [];
const savedColors = e => (e.clone ? e.clone.colors : recolors[e.id]) ?? {};
function show(e, keepView = false) {
    if (current !== e) pending = {};
    if (holder) { scene.remove(holder); holder.traverse(o => { if (o.isMesh) o.geometry?.dispose?.(); }); }
    holder = new THREE.Group(); scene.add(holder); map.hittables = []; buildError = null;
    try { actors = e.make(holder, map) ?? []; } catch (err) { actors = []; buildError = err.message; }
    try {
        if (e.clone) applyPalette(holder, recolors[e.baseEntry.id]);
        swatches = paletteOf(holder);
        applyPalette(holder, { ...savedColors(e), ...pending });
    } catch (err) { swatches = []; }
    map.hittables = actors; current = e; if (!keepView) { frameIn = 8; reframe = 40; }
    if (keepView) return renderPalette();
    history.replaceState(null, '', `#${e.id}`);
    renderSide(); renderList(); document.body.classList.remove('list-on');
}
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    if (mode === 'attack') dummy.pos.set(0, 0, 2.2); else if (mode === 'walk') dummy.pos.set(Math.sin(clock.elapsedTime * 0.6) * 5, 0, 7); else dummy.pos.set(0, 0, 60);
    for (const a of actors) {
        try { a.update?.(dt, ctx); } catch { /* a creature that needs more of the world: frozen */ }
        if (a.pos && Math.hypot(a.pos.x, a.pos.z) > stageR) { const k = stageR / Math.hypot(a.pos.x, a.pos.z); a.pos.x *= k; a.pos.z *= k; }   /* (how far it may wander: by its size — a chipmunk left the frame at 0.8 m) */   // stay in the middle of the turntable (a wandering fox left the frame)
    }
    if (reframe > 0 && --reframe === 0) frameIn = 1;   // (framed again once it has settled — a small animal that moved)
    if (frameIn > 0 && --frameIn === 0 && holder) {   // frame it once it has taken its pose
        const box = new THREE.Box3(); holder.traverse(o => { if (o.isMesh && o.visible) box.expandByObject(o); });
        const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        const h = Math.min(40, Math.max(0.4, Number.isFinite(size.y) ? Math.max(size.y, size.x * 0.7, size.z * 0.7) : 2));
        const cx = Number.isFinite(c.x) ? c.x : 0, cy = Number.isFinite(c.y) ? c.y : h / 2, cz = Number.isFinite(c.z) ? c.z : 0;
        controls.target.set(0, cy, 0); camera.position.set(h * 1.5, cy + h * 0.65, h * 2.6); stageR = Math.min(0.8, h * 0.35);   // (aimed at the turntable's middle, where it is kept)
        const big = h > 10; floor.visible = ring.visible = grid.visible = !big;   // (a keep or a citadel: no turntable under it)
    }
    document.querySelectorAll('body > div').forEach(d => { if (!['rail', 'side', 'stage', 'hint'].includes(d.id)) d.style.display = 'none'; });   // the game's nameplates: not here
    controls.update(); renderer.render(scene, camera);
});

// ---------- notes (three folders, one per kind of thing) ----------
const NOTE_API = { mob: 'api/mobnotes', npc: 'api/npcnotes', item: 'api/itemnotes' };
const notes = {};
async function loadNotes() { for (const [k, url] of Object.entries(NOTE_API)) { try { for (const n of await (await fetch(url)).json()) notes[`${k}:${n.id}`] = n; } catch { /* no dev API */ } } }
async function saveNotes(e) {
    const n = notes[`${e.notes}:${e.id}`];
    try { const r = await fetch(NOTE_API[e.notes], { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) }); status(r.ok ? 'Saved' : `Not saved: ${(await r.json()).error}`, !r.ok); }
    catch { status('Not saved — open this page from the dev server (npm run dev)', true); }
}
const noteOf = e => notes[`${e.notes}:${e.id}`];
let statusEl = null;
function status(t, bad = false) { if (statusEl) { statusEl.textContent = t; statusEl.style.color = bad ? '#ff9a8a' : '#bfe6a0'; } }

// ---------- the list and the card ----------
const el = (tag, props = {}, text) => { const e = Object.assign(document.createElement(tag), props); if (text != null) e.textContent = text; return e; };
const search = document.getElementById('search');
const openClass = (() => { try { return JSON.parse(localStorage.getItem('amo3d.library.open') ?? '["Creatures"]'); } catch { return ['Creatures']; } })();
search.oninput = () => renderList();
document.getElementById('menu').onclick = () => document.body.classList.toggle('list-on');
function renderList() {
    const list = document.getElementById('list'); list.textContent = '';
    const q = search.value.trim().toLowerCase(), match = e => !q || e.name.toLowerCase().includes(q) || e.id.includes(q) || e.cls.join(' ').toLowerCase().includes(q);
    for (const cls of CLASS_ORDER) {
        const items = ENTRIES.filter(e => e.cls[0] === cls && match(e)); if (!items.length) continue;
        const d = el('details'); d.open = !!q || openClass.includes(cls) || items.includes(current);
        const sm = el('summary'); sm.append(el('span', {}, cls), el('span', { className: 'n' }, String(items.length))); d.append(sm);
        d.ontoggle = () => { const i = openClass.indexOf(cls); if (d.open && i < 0) openClass.push(cls); if (!d.open && i >= 0) openClass.splice(i, 1); try { localStorage.setItem('amo3d.library.open', JSON.stringify(openClass)); } catch { /* storage blocked */ } };
        for (const g of [...new Set(items.map(e => e.cls[1]))]) {
            d.append(el('h3', {}, g));
            for (const e of items.filter(x => x.cls[1] === g)) {
                const row = el('div', { className: `row${current === e ? ' on' : ''}` }); row.append(el('span', {}, e.name));
                const ns = noteOf(e)?.notes ?? [], open = ns.filter(n => n.status !== 'done').length;
                if (open) row.append(el('span', { className: 'badge' }, String(open))); else if (ns.length) row.append(el('span', { className: 'badge done' }, '✓'));
                else if (e.clone) row.append(el('span', { className: 'tag', title: `A clone of ${e.baseEntry.name}` }, 'copy'));
                else if (e.sculpt) row.append(el('span', { className: 'tag', title: 'Editable in the Sculptor' }, 'S'));
                row.onclick = () => show(e); d.append(row);
            }
        }
        list.append(d);
    }
}
function renderSide() {
    const side = document.getElementById('side'); side.textContent = '';
    const e = current; if (!e) return;
    const D = e.notes === 'mob' ? ET[e.id] : null, L = e.notes === 'mob' ? LORE[e.id] : null;
    side.append(el('h2', {}, L?.name ?? e.name));
    side.append(el('div', { className: 'meta' }, `${e.cls.join(' › ')} · id ${e.id}${L?.threat ? ` · threat ${L.threat.toLowerCase()}` : ''}`));
    if (buildError) side.append(el('div', { className: 'meta', style: 'color:#ff9a8a' }, `Could not build it: ${buildError}`));
    if (L?.desc) side.append(el('div', { className: 'lore' }, L.desc));
    if (D) { const st = el('div', { className: 'stats' }); for (const [k, v] of [['Health', D.health], ['Damage', D.damage], ['Speed', D.speed], ['Sight', D.sightRange], ['Reach', D.attackRange], ['XP', D.xpReward]]) if (v != null) st.append(el('span', {}, k), el('span', {}, String(v))); side.append(st); }
    // what can be done with it
    const acts = el('div', { className: 'acts' });
    const sculpt = el('a', { className: `btn${e.sculpt ? '' : ' off'}`, href: e.sculpt ?? '#', title: e.sculpt ? (e.clone ? 'Shape this clone in the Sculptor (its own layer: the original stays as it is)' : 'Shape it in the Sculptor') : 'Not in the Sculptor yet (LIBRARY_PLAN phase 3)' }, '✎ Edit in the Sculptor'); acts.append(sculpt);
    if (e.clone && e.layered) sculpt.onclick = async ev => { ev.preventDefault(); status('Preparing its own layer…'); if (await ensureCloneLayer(e.clone)) location.href = e.sculpt; else status('Could not make its layer (is the dev server running?)', true); };
    if (e.cls[0] === 'People') acts.append(el('a', { className: 'btn', href: e.forge ?? 'forge.html', title: 'Dress and create characters' }, 'Open the Forge'));
    const cl = el('button', { title: e.cls[0] === 'People' ? 'Copy this person into a new cast member (a cast file: in the Forge and the game)' : 'Copy it into a new entry of its own, to change and use in the game' }, '⧉ Clone'); cl.onclick = () => cloneOf(e); acts.append(cl);
    if (e.clone) { const del = el('button', { title: 'Delete this clone (its file goes)' }, 'Delete'); del.onclick = () => deleteClone(e); acts.append(del); }
    side.append(acts);
    if (e.clone) cloneCard(side, e);
    side.append(paletteBox = el('div')); renderPalette();
    if (e.cls[0] === 'Creatures') {
        side.append(el('div', { className: 'meta' }, 'Show it'));
        const chips = el('div', { className: 'chips' });
        for (const [k, label] of [['idle', 'Idle'], ['walk', 'Notice you'], ['attack', 'Attack']]) { const c = el('span', { className: `chip${mode === k ? ' on' : ''}` }, label); c.onclick = () => { mode = k; show(current); }; chips.append(c); }
        side.append(chips);
    }
    if (e.cls[0] === 'People' || e.cls[1].startsWith('Wearables') || e.cls[0] === 'Creatures') {   // the models the game draws (Options › Character models)
        const chips = el('div', { className: 'chips' });
        for (const [k, label] of [['classic', 'Classic models'], ['new', 'New models']]) { const c = el('span', { className: `chip${(settings.charModels ?? 'classic') === k ? ' on' : ''}` }, label); c.onclick = () => { setSetting('charModels', k); show(current); }; chips.append(c); }
        side.append(chips);
    }
    // the notes
    side.append(el('div', { className: 'meta' }, 'What should change? (one note per thing)'));
    const ta = el('textarea', { placeholder: 'e.g. the wings are too small; the colour should be…' }), add = el('button', {}, 'Add note');
    statusEl = el('div', { id: 'status' });
    add.onclick = () => { const text = ta.value.trim(); if (!text) return; const n = (notes[`${e.notes}:${e.id}`] ??= { id: e.id, name: L?.name ?? e.name, notes: [] }); n.notes.push({ text, at: new Date().toISOString(), status: 'open' }); ta.value = ''; saveNotes(e); renderSide(); renderList(); };
    side.append(ta, add, statusEl);
    for (const [i, n] of (noteOf(e)?.notes ?? []).entries()) {
        const box = el('div', { className: `note${n.status === 'done' ? ' done' : ''}` });
        box.append(el('div', { className: 't' }, n.text));
        if (n.reply) box.append(el('div', { className: 'reply' }, `Claude: ${n.reply}`));
        const when = el('div', { className: 'when' }); when.append(el('span', {}, `${new Date(n.at).toLocaleString()} · ${n.status === 'done' ? 'done' : 'open'}`));
        const toggle = el('a', {}, n.status === 'done' ? 'reopen' : 'mark done'); toggle.onclick = () => { n.status = n.status === 'done' ? 'open' : 'done'; saveNotes(e); renderSide(); renderList(); };
        const del = el('a', {}, 'delete'); del.onclick = () => { noteOf(e).notes.splice(i, 1); saveNotes(e); renderSide(); renderList(); };
        when.append(toggle, del); box.append(when); side.append(box);
    }
}

// ---------- the palette panel ----------
let paletteBox = null;
function renderPalette() {
    const e = current, box = paletteBox; if (!box || !e) return; box.textContent = '';
    if (!swatches.length) return;
    const working = { ...savedColors(e), ...pending }, changed = Object.keys(pending).length;
    box.append(el('div', { className: 'meta' }, `Palette — ${swatches.length} colours${e.clone ? '' : recolors[e.id] ? ' (its own colours, saved)' : ''}`));
    const row = el('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;margin:4px 0 8px' });
    for (const sw of swatches) {
        const cur = working[sw.hex] ?? sw.hex, inp = el('input', { type: 'color', value: cur, title: `${sw.hex}${cur !== sw.hex ? ` → ${cur}` : ''} (${sw.count})` });
        inp.style.cssText = `width:38px;height:38px;padding:0;border-radius:8px;border:2px solid ${cur !== sw.hex ? '#f3d88b' : '#eee6d244'};background:none;cursor:pointer`;
        inp.oninput = () => { pending[sw.hex] = inp.value; show(e, true); };   // (rebuilt with the new colour, the view kept)
        row.append(inp);
    }
    box.append(row);
    const acts = el('div', { className: 'acts' });
    const btn = (t, fn, title, dis = false) => { const b = el('button', { title, disabled: dis }, t); b.onclick = fn; acts.append(b); };
    if (e.clone) btn('Save the colours', async () => { await saveCloneColors(e, working); }, 'Into this clone', !changed);
    else {
        btn('Save as its colours', async () => { if (!confirm(`Give ${e.name} these colours everywhere (the game too)?`)) return; await saveRecolor(e, working); }, 'Change the original: the game draws it in these colours', !changed);
        btn('Save as a clone', () => cloneOf(e, working), 'A new entry in these colours; the original stays', !changed);
        if (recolors[e.id]) btn('Back to the game\'s colours', async () => { await saveRecolor(e, null); }, 'Forget its saved colours');
    }
    btn('Undo changes', () => { pending = {}; show(e, true); }, 'Back to the colours as saved', !changed);
    box.append(acts);
}
async function saveRecolor(e, colors) {
    const id = `recolor_${e.id}`.slice(0, 40), r = colors && Object.keys(colors).length
        ? await fetch('api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, of: e.id, colors }) })
        : await fetch('api/library', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (!r.ok && r.status !== 404) { status(`Not saved: ${(await r.json().catch(() => ({}))).error ?? r.status}`, true); return; }
    if (colors && Object.keys(colors).length) recolors[e.id] = colors; else delete recolors[e.id];
    pending = {}; show(e, true); status(colors ? 'Its colours are saved.' : 'Back to the game\'s colours.');
}
async function saveCloneColors(e, colors) {
    const next = { ...e.clone, colors };
    const r = await fetch('api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    if (!r.ok) { status(`Not saved: ${(await r.json().catch(() => ({}))).error ?? r.status}`, true); return; }
    e.clone.colors = colors; pending = {}; show(e, true); status('The clone\'s colours are saved.');
}

// ---------- clones (LIBRARY_PLAN phase 2): src/content/library/<id>.json, through /api/library ----------
// a clone: its base entry's build, its own name, size and (a monster) numbers; listed beside its base. The game reads it
// where it reads its base kind (content/clones.js: a cloned monster is a beast kind of its own). A person's clone is a new
// cast member instead (a cast file: the Forge's cast list, the game).
// a creature whose body has shape layers: the layer its clones start from (copied into the clone's own on its first edit)
const LAYER_OF = { wolf: 'wolf', void_stalker: 'wolf', blind_stalker: 'wolf', horse: 'horse', frost_bear: 'frost_bear', plague_rat: 'plague_rat', ...Object.fromEntries([...SCULPT_ANIMALS].map(k => [k, k])) };
async function ensureCloneLayer(c) {   // the clone's own layer: made once, a copy of its base's (so its shape starts as the base's)
    const has = await fetch(`api/v2layer?layer=${c.id}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
    if (has && Object.keys(has).length) return true;
    const base = await fetch(`api/v2layer?layer=${LAYER_OF[c.base]}`).then(r => (r.ok ? r.json() : {})).catch(() => ({}));
    const r = await fetch('api/v2layer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layer: c.id, points: Object.keys(base).length ? base : { '@topo': [] } }) });
    return r.ok;
}
const slug = s2 => String(s2).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 34);
function cloneEntry(c) {
    const base = ENTRIES.find(x => x.id === c.base); if (!base) return null;
    const layered = !!LAYER_OF[c.base];   // (shaped in the Sculptor in its own layer)
    return { ...base, id: c.id, name: c.name, clone: c, baseEntry: base, sculpt: layered ? `sculptor.html?a=${c.id}:new&b=${base.sculpt ? base.sculpt.match(/a=([^:&]+)/)[1] : 'base_male'}:new&edit=0` : null, layered,
        make: (s2, m) => { const g = new THREE.Group(); s2.add(g); const a = base.make(g, m, layered ? c.id : undefined) ?? []; g.scale.setScalar(c.scale ?? 1); return a; } };
}
async function loadClones() {
    try { for (const c of await (await fetch('api/library')).json()) { if (c.of && c.colors) { recolors[c.of] = c.colors; continue; } const e = cloneEntry(c); if (e) ENTRIES.splice(ENTRIES.indexOf(e.baseEntry) + 1, 0, e); } } catch { /* no dev API */ }
}
async function cloneOf(e, colors = null) {
    const base = e.baseEntry ?? e, name = prompt(`A name for the copy of ${e.name}:`, `${e.name} (copy)`); if (!name) return;
    let id = slug(name) || 'clone', n = 2; while (ENTRIES.some(x => x.id === id || x.id === `cast_${id}`)) id = `${slug(name).slice(0, 30)}_${n++}`;
    try {
        if (e.cls[0] === 'People') {   // a person: a new cast member with the same look
            const look = structuredClone(e.look ?? null); if (!look) throw new Error('no look to copy');
            const r = await fetch('api/cast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name, lore: `A copy of ${e.name}, made in the Library.`, look }) });
            if (!r.ok) throw new Error((await r.json()).error);
            const p = person(`cast_${id}`, name, 'Heroes & cast', look, { look }); ENTRIES.splice(ENTRIES.findIndex(x => x.cls[1] === 'Heroes & cast'), 0, p); show(p);
        } else {
            const cols = colors ?? e.clone?.colors ?? recolors[base.id] ?? null;   // (its colours as shown; keyed on the base's plain build when cloned from the original)
            const c = { id, base: base.id, cls: base.cls, name, scale: e.clone?.scale ?? 1, ...(e.clone?.stats ? { stats: { ...e.clone.stats } } : {}), ...(cols && Object.keys(cols).length && !e.clone && !recolors[base.id] ? { colors: cols } : e.clone?.colors ? { colors: { ...e.clone.colors } } : {}), created: new Date().toISOString() };
            const r = await fetch('api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
            if (!r.ok) throw new Error((await r.json()).error);
            const ce = cloneEntry(c); ENTRIES.splice(ENTRIES.indexOf(base) + 1, 0, ce); show(ce);
        }
        status(`Cloned as "${name}" (${id}).`);
    } catch (err) { alert(`Could not clone: ${err.message}`); }
}
async function deleteClone(e) {
    if (!confirm(`Delete the clone "${e.name}"? Its file goes (git still has it if it was committed).`)) return;
    const r = await fetch('api/library', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: e.id }) });
    if (!r.ok) { alert(`Not deleted: ${(await r.json().catch(() => ({}))).error ?? r.status}`); return; }
    ENTRIES.splice(ENTRIES.indexOf(e), 1); show(e.baseEntry);
}
// a clone's card: its name, its size, a monster's numbers — saved into its file
function cloneCard(side, e) {
    const c = e.clone, box = el('div', { className: 'note' });
    box.append(el('div', { className: 'meta' }, `A clone of ${e.baseEntry.name} — saved in src/content/library/${c.id}.json${e.cls[1] === 'Monsters' ? ` · in a region: { "type": "beasts", "kind": "${c.id}" }` : ''}`));
    const field = (label, input) => { const r = el('label', { style: 'display:grid;grid-template-columns:90px 1fr;gap:8px;align-items:center;margin:6px 0;font-size:13px' }); r.append(el('span', {}, label), input); box.append(r); return input; };
    const nameIn = field('Name', el('input', { value: c.name, style: 'padding:6px;border-radius:6px;border:1px solid #eee6d244;background:#0008;color:#eee6d2;font:14px Georgia,serif' }));
    const sizeIn = field(`Size ×${(c.scale ?? 1).toFixed(2)}`, el('input', { type: 'range', min: 0.3, max: 3, step: 0.05, value: c.scale ?? 1 }));
    sizeIn.oninput = () => { sizeIn.previousSibling.textContent = `Size ×${(+sizeIn.value).toFixed(2)}`; const g = holder?.children[0]; if (g) g.scale.setScalar(+sizeIn.value); };
    const stats = {};
    const B = ET[e.baseEntry.id];
    if (e.cls[1] === 'Monsters' && B) for (const k of ['health', 'damage', 'speed', 'xpReward']) stats[k] = field(title(k), el('input', { type: 'number', min: 0, value: c.stats?.[k] ?? B[k] ?? 0, style: 'padding:6px;border-radius:6px;border:1px solid #eee6d244;background:#0008;color:#eee6d2;font:14px Georgia,serif;width:110px' }));
    const save = el('button', {}, 'Save the clone'); box.append(save);
    save.onclick = async () => {
        const next = { ...c, name: nameIn.value.trim() || c.name, scale: +sizeIn.value };
        const st = Object.fromEntries(Object.entries(stats).map(([k, inp]) => [k, +inp.value]).filter(([k, v]) => Number.isFinite(v) && v !== B?.[k]));
        if (Object.keys(st).length) next.stats = st; else delete next.stats;
        const r = await fetch('api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
        if (!r.ok) { status(`Not saved: ${(await r.json().catch(() => ({}))).error ?? r.status}`, true); return; }
        Object.assign(c, next); if (!next.stats) delete c.stats; e.name = c.name; renderList(); renderSide(); status('Clone saved.');
    };
    side.append(box);
}

// the heroes and cast from the Forge (their files): loaded, added to People › Heroes & cast
async function loadCast() {
    try {
        for (const c of await (await fetch('api/cast')).json()) {
            if (!c?.id || !c.look) continue;
            ENTRIES.push(person(`cast_${c.id}`, c.name ?? title(c.id), 'Heroes & cast', c.look, { look: c.look, sculpt: SCULPT_CAST.has(c.id) ? `sculptor.html?a=base_male:new&b=${c.id}:new&edit=1` : null, notes: 'npc', lore: c.lore }));
        }
    } catch { /* no dev API: the built-in people only */ }
}
await Promise.all([loadNotes(), loadCast()]);
ENTRIES.sort((a, b) => CLASS_ORDER.indexOf(a.cls[0]) - CLASS_ORDER.indexOf(b.cls[0]) || (a.cls[1] === 'Heroes & cast' ? -1 : b.cls[1] === 'Heroes & cast' ? 1 : 0));
await loadClones();   // (after the sort: each clone right after its base)
const want = location.hash.slice(1);
show(ENTRIES.find(e => e.id === want) ?? ENTRIES.find(e => e.id === `cast_${want}`) ?? ENTRIES[0]);
window.__library = { ENTRIES, get actors() { return actors; }, get holder() { return holder; }, show: id => show(ENTRIES.find(e => e.id === id)), get current() { return current; }, get error() { return buildError; } };

// Back to the game (the title's Workshop opens this page).
{ const a = document.createElement('a'); a.href = 'index.html'; a.textContent = '← Game'; a.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:50;padding:5px 10px;font:14px Georgia,serif;color:#f3e2b0;background:#120a06d8;border:1px solid #f3d88b66;border-radius:4px;text-decoration:none'; document.body.append(a); }
