// The Bestiary viewer (bestiary.html, dev server only): every creature built by the game's own code on a turntable,
// with its codex lore and numbers, and notes — what you want changed — saved to src/content/mob_notes/<id>.json
// through the dev API (/api/mobnotes). Claude reads those files ("process the mob notes"), makes the changes and
// answers in each note's `reply`, marking it done.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { enemies as worldMap, bestiary as B } from '@rules';
import { createBeasts, NAMES as BEAST_NAMES } from '../content/actors/beast.js';
import { createAnimals, NAMES as ANIMAL_NAMES } from '../content/actors/animals.js';
import { createWerewolves } from '../content/actors/werewolf.js';
import { createWolves } from '../content/actors/wolf.js';
import { createDeer } from '../content/actors/deer.js';
import { createShadows } from '../content/actors/shadowSoldier.js';
import { createMalphas } from '../content/actors/malphas.js';
import { setPlatesVisible } from '../content/actors/enemyCore.js';

const ET = worldMap.ENEMY_TYPES, LORE = B.BESTIARY_LORE ?? {};
// Every creature: id, label, group, and how to make one at the origin.
const MOBS = [
    ...Object.entries(BEAST_NAMES).map(([id, name]) => ({ id, name, group: 'Monsters', make: (scene, map, rng) => createBeasts({ scene, map, rng, type: id, posts: [{ x: 0, z: 0 }] }) })),
    { id: 'werewolf', name: 'Guardian of the Wild', group: 'Monsters', make: (scene, map, rng) => createWerewolves({ scene, map, rng, den: { x: 0, z: 0 }, count: 1 }) },
    { id: 'shadow', name: 'Shadow-man', group: 'Monsters', make: (scene, map, rng) => createShadows({ scene, map, rng, posts: [{ x: 0, z: 0 }] }).list },
    { id: 'malphas', name: 'Malphas', group: 'Bosses', make: (scene, map, rng) => [createMalphas({ scene, map, at: { x: 0, y: 0, z: 0 }, rng })] },
    { id: 'boss_slam', name: 'Any boss (elite, slam)', group: 'Bosses', make: (scene, map, rng) => createBeasts({ scene, map, rng, type: 'crag_fiend', posts: [{ x: 0, z: 0, boss: true, name: 'A boss' }] }) },
    { id: 'wolf', name: 'Wolf', group: 'Animals', make: (scene, map, rng) => createWolves({ scene, map, rng, den: { x: 0, z: 0 }, count: 1 }) },
    { id: 'deer', name: 'Deer', group: 'Animals', make: (scene, map, rng) => { const d = createDeer({ home: { x: 0, z: 0 }, stag: true, rng, map }); scene.add(d.root); return [d]; } },
    ...Object.entries(ANIMAL_NAMES).map(([id, name]) => ({ id, name, group: 'Animals', make: (scene, map, rng) => createAnimals({ scene, map, rng, type: id, posts: [{ x: 0, z: 0 }] }) })),
];

// ---------- the stage ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.shadowMap.enabled = true;
stage.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1620);
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200);
camera.position.set(4, 3, 6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0); controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x2a2430, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(4, 8, 5); sun.castShadow = true; scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3a3440 })); floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(5.9, 6, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf3d88b })); ring.position.y = 0.01; scene.add(ring);
const grid = new THREE.GridHelper(12, 12, 0x5a5060, 0x2e2834); grid.position.y = 0.005; scene.add(grid);   // 1 m squares, for size
function resize() { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
setPlatesVisible(false);

// A pretend map (flat, open) and a pretend world for the creatures' update.
const map = { id: 'bestiary', heightAt: () => 0, groundAt: () => 0, resolve() {}, blockedAt: () => null, passable: () => true, stepBlocked: () => false, hittables: [], nav: null, projectileHit: () => null };
const dummy = { pos: new THREE.Vector3(0, 0, 60), dead: false };
const ctx = { camera, player: dummy, hurtPlayer: () => false, floater() {}, message() {}, shake() {}, hour: 12, weather: 'clear', flags: {}, voidMult: 1, dropLoot() {}, onKill() {} };
let current = null, holder = null, actors = [], mode = 'idle', frameIn = 0;
function show(mob) {
    if (holder) scene.remove(holder);
    holder = new THREE.Group(); scene.add(holder);
    map.hittables = [];
    try { actors = mob.make(holder, map, Math.random) ?? []; } catch (e) { actors = []; status(`Could not build ${mob.name}: ${e.message}`, true); }
    map.hittables = actors;
    current = mob;
    frameIn = 8;   // frame it a few frames in, once it has taken its pose
    if (mob.id === 'malphas') holder.traverse(o => { o.visible = true; });   // he hides until his fight in the game
    renderSide(); renderList();
}
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
    const dt = Math.min(0.05, clock.getDelta());
    // idle: the player far away; attack: standing in front of it (it winds up and strikes); walk: passing by
    if (mode === 'attack') dummy.pos.set(0, 0, 2.2);
    else if (mode === 'walk') dummy.pos.set(Math.sin(clock.elapsedTime * 0.6) * 5, 0, 7);
    else dummy.pos.set(0, 0, 60);
    for (const a of actors) {
        try { a.update?.(dt, ctx); } catch { /* a creature that needs more of the world: frozen */ }
        if (a.pos && Math.hypot(a.pos.x, a.pos.z) > 4) a.pos.multiplyScalar(4 / Math.hypot(a.pos.x, a.pos.z));   // stay on the turntable
    }
    if (frameIn > 0 && --frameIn === 0) {
        const box = new THREE.Box3(); holder.traverse(o => { if (o.isMesh && o.visible) box.expandByObject(o); });
        const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        const h = Math.min(8, Math.max(0.5, Number.isFinite(size.y) ? Math.max(size.y, size.x * 0.7, size.z * 0.7) : 2));
        const cx = Number.isFinite(c.x) ? c.x : 0, cz = Number.isFinite(c.z) ? c.z : 0;
        controls.target.set(cx, h * 0.5, cz); camera.position.set(cx + h * 1.5, h * 1.15, cz + h * 2.6);
    }
    document.querySelectorAll('body > div').forEach(d => { if (!['rail', 'side', 'stage', 'hint'].includes(d.id)) d.style.display = 'none'; });   // the game's nameplates: not here
    controls.update();
    renderer.render(scene, camera);
});

// ---------- notes ----------
let notes = {};
async function loadNotes() { try { const r = await fetch('api/mobnotes'); for (const n of await r.json()) notes[n.id] = n; } catch { /* no dev API */ } }
async function saveNotes(id) {
    const n = notes[id];
    try {
        const r = await fetch('api/mobnotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(n) });
        status(r.ok ? 'Saved' : `Not saved: ${(await r.json()).error}`, !r.ok);
    } catch { status('Not saved — open this page from the dev server (npm run dev)', true); }
}
let statusEl = null;
function status(t, bad = false) { if (statusEl) { statusEl.textContent = t; statusEl.style.color = bad ? '#ff9a8a' : '#bfe6a0'; } }

// ---------- the side panels ----------
const el = (tag, props = {}, text) => { const e = Object.assign(document.createElement(tag), props); if (text != null) e.textContent = text; return e; };
function renderList() {
    const list = document.getElementById('list'); list.textContent = '';
    for (const g of ['Monsters', 'Bosses', 'Animals']) {
        list.append(el('h3', {}, g));
        for (const m of MOBS.filter(x => x.group === g)) {
            const row = el('div', { className: `mob${current === m ? ' on' : ''}` });
            row.append(el('span', {}, m.name));
            const open = (notes[m.id]?.notes ?? []).filter(n => n.status !== 'done').length, done = (notes[m.id]?.notes ?? []).length - open;
            if (open) row.append(el('span', { className: 'badge' }, String(open)));
            else if (done) row.append(el('span', { className: 'badge done' }, '✓'));
            row.onclick = () => { show(m); history.replaceState(null, '', `#${m.id}`); };
            list.append(row);
        }
    }
}
function renderSide() {
    const side = document.getElementById('side'); side.textContent = '';
    const m = current; if (!m) return;
    const D = ET[m.id], L = LORE[m.id];
    side.append(el('h2', {}, L?.name ?? m.name));
    side.append(el('div', { className: 'meta' }, `${m.group} · id ${m.id}${L?.threat ? ` · threat ${L.threat.toLowerCase()}` : ''}`));
    if (L?.desc) side.append(el('div', { className: 'lore' }, L.desc));
    if (D) {
        const st = el('div', { className: 'stats' });
        for (const [k, v] of [['Health', D.health], ['Damage', D.damage], ['Speed', D.speed], ['Sight', D.sightRange], ['Reach', D.attackRange], ['XP', D.xpReward]]) if (v != null) st.append(el('span', {}, k), el('span', {}, String(v)));
        side.append(st);
    }
    side.append(el('div', { className: 'meta' }, 'Show it'));
    const chips = el('div', { className: 'chips' });
    for (const [k, label] of [['idle', 'Idle'], ['walk', 'Notice you'], ['attack', 'Attack']]) {
        const c = el('span', { className: `chip${mode === k ? ' on' : ''}` }, label);
        c.onclick = () => { mode = k; show(current); };
        chips.append(c);
    }
    side.append(chips);
    // the notes
    side.append(el('div', { className: 'meta' }, 'What should change? (one note per thing)'));
    const ta = el('textarea', { placeholder: 'e.g. the wings are too small; make it more menacing; the colour should be…' });
    const add = el('button', {}, 'Add note');
    statusEl = el('div', { id: 'status' });
    add.onclick = () => {
        const text = ta.value.trim(); if (!text) return;
        const n = (notes[m.id] ??= { id: m.id, name: L?.name ?? m.name, notes: [] });
        n.notes.push({ text, at: new Date().toISOString(), status: 'open' });
        ta.value = ''; saveNotes(m.id); renderSide(); renderList();
    };
    side.append(ta, add, statusEl);
    for (const [i, n] of (notes[m.id]?.notes ?? []).entries()) {
        const box = el('div', { className: `note${n.status === 'done' ? ' done' : ''}` });
        box.append(el('div', { className: 't' }, n.text));
        if (n.reply) box.append(el('div', { className: 'reply' }, `Claude: ${n.reply}`));
        const when = el('div', { className: 'when' });
        when.append(el('span', {}, `${new Date(n.at).toLocaleString()} · ${n.status === 'done' ? 'done' : 'open'}`));
        const toggle = el('a', {}, n.status === 'done' ? 'reopen' : 'mark done');
        toggle.onclick = () => { n.status = n.status === 'done' ? 'open' : 'done'; saveNotes(m.id); renderSide(); renderList(); };
        const del = el('a', {}, 'delete');
        del.onclick = () => { notes[m.id].notes.splice(i, 1); saveNotes(m.id); renderSide(); renderList(); };
        when.append(toggle, del);
        box.append(when);
        side.append(box);
    }
}

loadNotes().then(() => show(MOBS.find(m => m.id === location.hash.slice(1)) ?? MOBS[0]));
window.__bestiary = { get actors() { return actors; }, get holder() { return holder; }, MOBS, show: id => show(MOBS.find(m => m.id === id)), get notes() { return notes; }, setMode: k => { mode = k; } };
