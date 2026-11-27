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
import { settings, setSetting } from '../engine/settings.js';

const ET = worldMap.ENEMY_TYPES, LORE = BS.BESTIARY_LORE ?? {};
const title = s => String(s).replace(/(^|_)([a-z])/g, (m, a, b) => `${a ? ' ' : ''}${b.toUpperCase()}`);
const flat = c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85 });
const sculptUrl = (a, b = 'base_male') => `sculptor.html?a=${a}:new&b=${b}:new`;

// ---------- every entry: { id, cls: [class, group], name, make(holder, map) → actors, sculpt?, forge?, notes, info? } ----------
const SCULPT_ANIMALS = new Set(['rabbit', 'forest_fox', 'feral_boar', 'black_bear', 'grizzly_bear', 'sheep', 'cow', 'pig', 'goat', 'chicken', 'crow']);
const creature = (id, name, group, make, sculpt) => ({ id, cls: ['Creatures', group], name, make, sculpt, notes: 'mob' });
const ENTRIES = [
    ...Object.entries(BEAST_NAMES).map(([id, name]) => creature(id, name, 'Monsters', (s, map) => createBeasts({ scene: s, map, rng: Math.random, type: id, posts: [{ x: 0, z: 0 }] }), sculptUrl(`mob_${id}`))),
    creature('werewolf', 'Guardian of the Wild', 'Monsters', (s, map) => createWerewolves({ scene: s, map, rng: Math.random, den: { x: 0, z: 0 }, count: 1 }), sculptUrl('mob_werewolf')),
    creature('shadow', 'Shadow-man', 'Monsters', (s, map) => createShadows({ scene: s, map, rng: Math.random, posts: [{ x: 0, z: 0 }] }).list, sculptUrl('shadow_soldier')),
    creature('malphas', 'Malphas', 'Bosses', (s, map) => { const b = createMalphas({ scene: s, map, at: { x: 0, y: 0, z: 0 }, rng: Math.random }); s.traverse(o => { if (!o.isSprite && !o.isPoints) o.visible = true; }); return [b]; }, sculptUrl('mob_malphas')),
    creature('shadow_balrog', 'The Shadow Balrog', 'Bosses', (s, map) => [createDuelist({ scene: s, map, at: { x: 0, z: 0, facing: 0 }, body: buildBalrog(), plateY: 8.2, name: 'The Shadow Balrog', reach: 4.2, speed: 2.2, windup: 0.8, def: { id: 'shadow_balrog', health: 9999, damage: 26, xpReward: 0, goldDrop: 0, lootTable: [] } })], sculptUrl('mob_balrog')),
    creature('boss_slam', 'Any boss (elite, slam)', 'Bosses', (s, map) => createBeasts({ scene: s, map, rng: Math.random, type: 'crag_fiend', posts: [{ x: 0, z: 0, boss: true, name: 'A boss' }] }), null),
    creature('wolf', 'Wolf', 'Animals', (s, map) => createWolves({ scene: s, map, rng: Math.random, den: { x: 0, z: 0 }, count: 1 }), sculptUrl('wolf')),
    creature('deer', 'Deer', 'Animals', (s, map) => { const d = createDeer({ home: { x: 0, z: 0 }, stag: true, rng: Math.random, map }); s.add(d.root); return [d]; }, sculptUrl('mob_deer')),
    creature('horse', 'Horse', 'Animals', s => { const h = buildHorse(); s.add(h.root ?? h); return []; }, sculptUrl('horse')),
    ...Object.entries(ANIMAL_NAMES).map(([id, name]) => creature(id, name, 'Animals', (s, map) => createAnimals({ scene: s, map, rng: Math.random, type: id, posts: [{ x: 0, z: 0 }] }), SCULPT_ANIMALS.has(id) ? sculptUrl(id) : null)),
];
// people: a character from its look (the game's own builder)
const person = (id, name, group, look, extra = {}) => ({ id, cls: ['People', group], name, make: s => { const c = createCharacter(look); s.add(c.root); return [{ update: dt => c.update(dt, { speed: 0, sprinting: false, hopK: null }) }]; }, notes: 'npc', ...extra });
const SCULPT_CAST = new Set(['eldrin', 'seraphina', 'seraphina_rebel', 'anya']);
for (const p of npcCast()) ENTRIES.push(person(p.id, p.name, p.group === 'Story' ? 'The story' : p.group === 'Thaloria' ? 'Thaloria' : `Villagers — ${p.group}`, p.look));
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
let current = null, holder = null, actors = [], mode = 'idle', frameIn = 0, buildError = null;
function show(e) {
    if (holder) { scene.remove(holder); holder.traverse(o => { if (o.isMesh) o.geometry?.dispose?.(); }); }
    holder = new THREE.Group(); scene.add(holder); map.hittables = []; buildError = null;
    try { actors = e.make(holder, map) ?? []; } catch (err) { actors = []; buildError = err.message; }
    map.hittables = actors; current = e; frameIn = 8;
    history.replaceState(null, '', `#${e.id}`);
    renderSide(); renderList(); document.body.classList.remove('list-on');
}
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    if (mode === 'attack') dummy.pos.set(0, 0, 2.2); else if (mode === 'walk') dummy.pos.set(Math.sin(clock.elapsedTime * 0.6) * 5, 0, 7); else dummy.pos.set(0, 0, 60);
    for (const a of actors) {
        try { a.update?.(dt, ctx); } catch { /* a creature that needs more of the world: frozen */ }
        if (a.pos && Math.hypot(a.pos.x, a.pos.z) > 4) a.pos.multiplyScalar(4 / Math.hypot(a.pos.x, a.pos.z));   // stay on the turntable
    }
    if (frameIn > 0 && --frameIn === 0 && holder) {   // frame it once it has taken its pose
        const box = new THREE.Box3(); holder.traverse(o => { if (o.isMesh && o.visible) box.expandByObject(o); });
        const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        const h = Math.min(40, Math.max(0.4, Number.isFinite(size.y) ? Math.max(size.y, size.x * 0.7, size.z * 0.7) : 2));
        const cx = Number.isFinite(c.x) ? c.x : 0, cy = Number.isFinite(c.y) ? c.y : h / 2, cz = Number.isFinite(c.z) ? c.z : 0;
        controls.target.set(cx, cy, cz); camera.position.set(cx + h * 1.5, cy + h * 0.65, cz + h * 2.6);
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
    const sculpt = el('a', { className: `btn${e.sculpt ? '' : ' off'}`, href: e.sculpt ?? '#', title: e.sculpt ? 'Shape it in the Sculptor' : 'Not in the Sculptor yet (LIBRARY_PLAN phase 3)' }, '✎ Edit in the Sculptor'); acts.append(sculpt);
    if (e.cls[0] === 'People') acts.append(el('a', { className: 'btn', href: e.forge ?? 'forge.html', title: 'Dress and create characters' }, 'Open the Forge'));
    acts.append(el('button', { disabled: true, title: 'Coming next (LIBRARY_PLAN phase 2)' }, 'Clone'));
    side.append(acts);
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

// the heroes and cast from the Forge (their files): loaded, added to People › Heroes & cast
async function loadCast() {
    try {
        for (const c of await (await fetch('api/cast')).json()) {
            if (!c?.id || !c.look) continue;
            ENTRIES.push(person(`cast_${c.id}`, c.name ?? title(c.id), 'Heroes & cast', c.look, { sculpt: SCULPT_CAST.has(c.id) ? `sculptor.html?a=base_male:new&b=${c.id}:new&edit=1` : null, notes: 'npc', lore: c.lore }));
        }
    } catch { /* no dev API: the built-in people only */ }
}
await Promise.all([loadNotes(), loadCast()]);
ENTRIES.sort((a, b) => CLASS_ORDER.indexOf(a.cls[0]) - CLASS_ORDER.indexOf(b.cls[0]) || (a.cls[1] === 'Heroes & cast' ? -1 : b.cls[1] === 'Heroes & cast' ? 1 : 0));
const want = location.hash.slice(1);
show(ENTRIES.find(e => e.id === want) ?? ENTRIES.find(e => e.id === `cast_${want}`) ?? ENTRIES[0]);
window.__library = { ENTRIES, get actors() { return actors; }, get holder() { return holder; }, show: id => show(ENTRIES.find(e => e.id === id)), get current() { return current; }, get error() { return buildError; } };

// Back to the game (the title's Workshop opens this page).
{ const a = document.createElement('a'); a.href = 'index.html'; a.textContent = '← Game'; a.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:50;padding:5px 10px;font:14px Georgia,serif;color:#f3e2b0;background:#120a06d8;border:1px solid #f3d88b66;border-radius:4px;text-decoration:none'; document.body.append(a); }
