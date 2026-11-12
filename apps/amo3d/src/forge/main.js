// The Forge — design characters for Arcane Majesty from our own parts. A turntable preview of the
// real game model (content/models/character.js), pickers for every part of a look definition,
// randomize, and save into src/content/cast/<id>.json (through the dev server's /api/cast).
import * as THREE from 'three';
import { createCharacter, DEFAULT_LOOK } from '../content/models/character.js';
import { HAIR_STYLES, FACIAL_STYLES } from '../content/models/parts/hair.js';
import { talents as talentRules } from '@rules';

// ?mode=create: the in-game creator — make your own hero (name, class, look) and begin a game.
const CREATE = new URLSearchParams(location.search).get('mode') === 'create';
const { CLASSES } = talentRules;

// ---------- scene ----------
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
stage.append(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15111a);
scene.fog = new THREE.Fog(0x15111a, 8, 18);
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x2a1e14, 1.1));
const key = new THREE.DirectionalLight(0xfff0d8, 2.6);
key.position.set(2.5, 4, 3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.bias = -0.0006;
key.shadow.normalBias = 0.03;
Object.assign(key.shadow.camera, { left: -2, right: 2, top: 3, bottom: -1 });
scene.add(key);
const rim = new THREE.DirectionalLight(0x9a7aff, 1.6);
rim.position.set(-3, 2.5, -3);
scene.add(rim);
const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.0, 0.16, 40), new THREE.MeshStandardMaterial({ color: 0x2a2430, roughness: 0.6 }));
plinth.position.y = -0.08;
plinth.receiveShadow = true;
scene.add(plinth);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.92, 0.97, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xf3d88b, transparent: true, opacity: 0.6 }));
ring.position.y = 0.005;
scene.add(ring);

function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// Turntable: drag to turn, wheel to zoom.
const view = { yaw: 0.5, pitch: 0.12, dist: 6.2, spin: true };
let drag = null;
renderer.domElement.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; view.spin = false; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointerup', () => { drag = null; });
renderer.domElement.addEventListener('pointermove', e => {
    if (!drag) return;
    view.yaw -= (e.clientX - drag.x) * 0.008;
    view.pitch = Math.max(-0.2, Math.min(0.8, view.pitch + (e.clientY - drag.y) * 0.004));
    drag = { x: e.clientX, y: e.clientY };
});
renderer.domElement.addEventListener('wheel', e => { e.preventDefault(); view.dist = Math.max(1.6, Math.min(8, view.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });

// ---------- the character being made ----------
const clone = o => JSON.parse(JSON.stringify(o));
let def = { id: 'new_character', name: CREATE ? '' : 'New Character', lore: '', classId: 'mage', look: clone(DEFAULT_LOOK) };
let model = null, pose = 'idle', weapon = 'staff';

function rebuild() {
    if (model) scene.remove(model.root);
    model = createCharacter(def.look);
    model.setWeapons(weapon === 'none' ? null : { type: weapon, accent: 0x7ff5e6 }, weapon === 'sword' ? { type: 'shield', accent: new THREE.Color(def.look.outfit.coat).getHex() } : null);
    if (weapon === 'none') model.setWeapons({ type: 'fists' }, null);
    model.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(model.root);
}

// ---------- controls ----------
const box = document.getElementById('controls');
const el = (tag, attrs = {}, text) => { const e = document.createElement(tag); Object.assign(e, attrs); if (text != null) e.textContent = text; return e; };
const set = (path, value) => {
    const keys = path.split('.');
    let o = def;
    for (const k of keys.slice(0, -1)) o = o[k] ??= {};
    o[keys.at(-1)] = value;
    rebuild();
};
const get = path => path.split('.').reduce((o, k) => o?.[k], def);

function textField(label, path) {
    const l = el('label', {}, label);
    const i = el('input', { type: 'text', value: get(path) ?? '' });
    i.oninput = () => { const keys = path.split('.'); let o = def; for (const k of keys.slice(0, -1)) o = o[k]; o[keys.at(-1)] = i.value; };
    l.append(i);
    return l;
}
function color(label, path) {
    const l = el('label', {}, label);
    const i = el('input', { type: 'color', value: get(path) });
    i.oninput = () => set(path, i.value);
    l.append(i);
    return l;
}
function slider(label, path, min, max) {
    const l = el('label', {}, label);
    const i = el('input', { type: 'range', min, max, step: 0.01, value: get(path) });
    i.oninput = () => set(path, Number(i.value));
    l.append(i);
    return l;
}
function chips(options, path, onPick = v => set(path, v)) {
    const wrap = el('div', { className: 'chips' });
    const draw = () => {
        wrap.textContent = '';
        for (const o of options) {
            const label = path === 'classId' ? CLASSES[o].name : o;
            const c = el('span', { className: `chip${(path ? get(path) : null) === o ? ' on' : ''}` }, label);
            c.onclick = () => { onPick(o); draw(); };
            wrap.append(c);
        }
    };
    draw();
    return wrap;
}

function render() {
    box.textContent = '';
    box.append(el('h2', {}, CREATE ? 'Your hero' : 'Identity'));
    box.append(textField('Name', 'name'));
    if (CREATE) {
        box.append(el('h2', {}, 'Class'));
        const blurb = el('div', { className: 'sub' });
        const showBlurb = () => {
            const c = CLASSES[def.classId];
            const gifted = Object.entries(c.talents).filter(([, v]) => v === 'gifted').map(([k]) => k).join(', ');
            blurb.textContent = `${c.blurb} Gifted: ${gifted}.`;
        };
        box.append(chips(Object.keys(CLASSES), 'classId', v => { def.classId = v; showBlurb(); }), blurb);
        showBlurb();
    } else {
        box.append(textField('Id (file name)', 'id'));
        const lore = el('textarea', { placeholder: 'Who they are, in a line or two…', value: def.lore ?? '' });
        lore.oninput = () => { def.lore = lore.value; };
        box.append(lore);
    }

    box.append(el('h2', {}, 'Body'));
    box.append(slider('Height', 'look.build.height', 0.85, 1.15), slider('Build', 'look.build.width', 0.85, 1.2));
    box.append(color('Skin', 'look.skin'), color('Eyes', 'look.eyes'));

    box.append(el('h2', {}, 'Hair'));
    box.append(chips(HAIR_STYLES, 'look.hair.style'), color('Hair colour', 'look.hair.color'));
    box.append(el('h2', {}, 'Facial hair'));
    box.append(chips(FACIAL_STYLES, 'look.facialHair.style'), color('Colour', 'look.facialHair.color'));

    box.append(el('h2', {}, 'Outfit'));
    box.append(chips(['longcoat', 'robe', 'tunic', 'armour'], 'look.outfit.style'));
    const extras = el('div', { className: 'chips' });
    extras.style.marginTop = '8px';
    for (const k of ['hood', 'cape']) {
        const c = el('span', { className: `chip${def.look[k] ? ' on' : ''}` }, k);
        c.onclick = () => { set(`look.${k}`, !def.look[k]); c.classList.toggle('on', !!def.look[k]); };
        extras.append(c);
    }
    box.append(extras);
    for (const [k, label] of [['coat', 'Coat'], ['collar', 'Collar & lining'], ['trim', 'Trim (metal)'], ['vest', 'Vest'], ['shirt', 'Shirt'],
        ['pants', 'Trousers'], ['leather', 'Leather'], ['leatherDark', 'Boots & dark leather']]) box.append(color(label, `look.outfit.${k}`));

    box.append(el('h2', {}, 'Preview'));
    box.append(chips(['idle', 'walk', 'run', 'cast', 'strike'], null, v => { pose = v; }));
    box.append(chips(['staff', 'wand', 'sword', 'axe', 'spear', 'bow', 'none'], null, v => { weapon = v; rebuild(); }));

    if (CREATE) {
        const row = el('div', { className: 'row' });
        const rnd = el('button', {}, 'Randomize');
        rnd.onclick = () => { randomize(); render(); rebuild(); };
        const go = el('button', { className: 'main' }, 'Begin your journey');
        go.onclick = () => {
            if (!def.name.trim()) { document.getElementById('status').textContent = 'Give your hero a name first.'; return; }
            try { localStorage.setItem('amo3d.newHero', JSON.stringify({ name: def.name.trim(), classId: def.classId, look: def.look })); } catch { /* storage blocked */ }
            location.href = 'index.html?new=1&play=1&hero=new';
        };
        const back = el('button', {}, 'Back');
        back.onclick = () => { location.href = 'index.html'; };
        row.append(rnd, go, back);
        box.append(el('h2', {}, 'Ready?'), row, el('div', { id: 'status' }));
        return;
    }
    box.append(el('h2', {}, 'Cast'));
    const row = el('div', { className: 'row' });
    const rnd = el('button', {}, 'Randomize');
    rnd.onclick = () => { randomize(); render(); rebuild(); };
    const save = el('button', { className: 'main' }, 'Save to the cast');
    save.onclick = saveCast;
    const exp = el('button', {}, 'Export JSON');
    exp.onclick = () => {
        const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' })), download: `${def.id}.json` });
        a.click();
    };
    row.append(rnd, save, exp);
    box.append(row);
    const load = el('select');
    load.append(el('option', { value: '' }, 'Open a cast member…'));
    fetch('api/cast').then(r => r.json()).then(list => {
        for (const c of list) load.append(el('option', { value: JSON.stringify(c) }, c.name ?? c.id));
    }).catch(() => load.append(el('option', { value: '' }, '(cast list needs the dev server)')));
    load.onchange = () => {
        if (!load.value) return;
        const c = JSON.parse(load.value);
        def = { ...c, look: { ...clone(DEFAULT_LOOK), ...c.look } };
        render(); rebuild();
    };
    const lr = el('label', {}, 'Open');
    lr.append(load);
    box.append(lr, el('div', { id: 'status' }));
}

const pick = a => a[Math.floor(Math.random() * a.length)];
const hsl = (h, s, l) => `#${new THREE.Color().setHSL(h, s, l).getHexString()}`;
function randomize() {
    const SKIN = ['#f1c9a5', '#e2b48f', '#c98f6a', '#a8704a', '#7a4e32', '#5a3a26'];
    const HAIR = ['#1a1410', '#3a2418', '#5a3a22', '#8a5a2a', '#d9b25a', '#a8452a', '#8a8a8a', '#e8e4da'];
    const hair = pick(HAIR), base = Math.random();
    def.look = {
        build: { height: +(0.92 + Math.random() * 0.16).toFixed(2), width: +(0.9 + Math.random() * 0.25).toFixed(2) },
        skin: pick(SKIN), eyes: pick(['#5ab8f0', '#4fd06a', '#8a6a3a', '#3a5a8a', '#9a7a4a', '#7a3ac0']),
        hair: { style: pick(HAIR_STYLES), color: hair },
        facialHair: { style: pick(FACIAL_STYLES), color: hair },
        hood: Math.random() < 0.25, cape: Math.random() < 0.3,
        outfit: {
            style: pick(['longcoat', 'robe', 'tunic', 'armour']),
            coat: hsl(base, 0.55, 0.32), collar: hsl(base, 0.55, 0.2), trim: pick(['#d4a84a', '#c8ccd4', '#b87333']),
            vest: hsl((base + 0.5) % 1, 0.25, 0.12), shirt: hsl(base, 0.1, 0.1), pants: hsl((base + 0.1) % 1, 0.15, 0.14),
            leather: pick(['#5a3520', '#6e4a2c', '#3a2a1a']), leatherDark: '#3e2416',
        },
    };
}

async function saveCast() {
    const status = document.getElementById('status');
    def.id = (def.id || def.name || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    try {
        const r = await fetch('api/cast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def) });
        const j = await r.json();
        status.style.color = r.ok ? '#bfe6a0' : '#ff9a8a';
        status.textContent = r.ok ? `Saved — ${j.saved}` : `Not saved: ${j.error}`;
    } catch {
        status.style.color = '#ff9a8a';
        status.textContent = 'Saving needs the dev server (npm run dev). Use Export JSON instead.';
    }
}

// ---------- loop ----------
const timer = new THREE.Timer();
let t = 0;
renderer.setAnimationLoop(now => {
    timer.update(now);
    const dt = Math.max(0, Math.min(timer.getDelta(), 0.05));
    t += dt;
    if (view.spin) view.yaw += dt * 0.25;
    const cyc = (t % 1.2) / 1.2;
    const P = {
        idle: { speed: 0 }, walk: { speed: 2.2 }, run: { speed: 6, sprinting: true },
        cast: { speed: 0, castK: cyc }, strike: { speed: 0, strikeK: cyc },
    }[pose];
    model.update(dt, { sprinting: false, hopK: null, ...P });
    camera.position.set(Math.sin(view.yaw) * Math.cos(view.pitch) * view.dist, 1.15 + Math.sin(view.pitch) * view.dist, Math.cos(view.yaw) * Math.cos(view.pitch) * view.dist);
    camera.lookAt(0, 1.05, 0);
    renderer.render(scene, camera);
});

render();
rebuild();
window.__forge = { get def() { return def; }, randomize: () => { randomize(); render(); rebuild(); }, saveCast };
