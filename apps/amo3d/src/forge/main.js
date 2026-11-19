// The Forge — a character creator for Arcane Majesty built from the game's own part library.
// Left rail: every slot. Centre: the live game model on a turntable. Right: the items and colours
// for the selected slot, role archetypes, body presets, preview poses and save/export controls.
import * as THREE from 'three';
import { createCharacter } from '../content/models/character.js';
import {
    BODY_PRESETS, RACES, DEFAULT_LOOK, HANDHELD, HAND_ITEM, PART_SLOTS,
    handSpec, normalizeLook,
} from '../content/models/look.js';
import { PART_CATALOG, partDef } from '../content/models/parts/index.js';
import { HAIR_STYLES, FACIAL_STYLES } from '../content/models/parts/hair.js';
import { ARCHETYPES, ARCHETYPE_ORDER } from '../content/models/archetypes.js';
import { talents as talentRules } from '@rules';
import { npcCast } from '../content/castList.js';

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
let def = {
    id: 'new_character',
    name: CREATE ? '' : 'New Character',
    lore: '',
    classId: 'mage',
    look: clone(DEFAULT_LOOK),
};
let model = null;
let pose = 'idle';
let previewHand = 'R';
let selectedSlot = 'body';
const locks = new Set();

const SLOT_LABELS = {
    body: 'Body', face: 'Face', hair: 'Hair', facialHair: 'Facial hair',
    torso: 'Torso', legs: 'Legs', feet: 'Feet', arms: 'Arms', shoulders: 'Shoulders',
    waist: 'Waist', neck: 'Neck', headgear: 'Headgear', cape: 'Cape', back: 'Back',
    accessory: 'Accessory', left: 'Left hand', right: 'Right hand',
};
const RAIL_GROUPS = [
    ['Body', ['body', 'face', 'hair', 'facialHair']],
    ['Worn', ['headgear', 'torso', 'legs', 'feet', 'arms', 'shoulders', 'waist', 'neck', 'cape', 'back', 'accessory']],
    ['Hands', ['left', 'right']],
];
const COLOR_LABELS = {
    primary: 'Main', collar: 'Collar', trim: 'Trim', vest: 'Vest', shirt: 'Shirt',
    leather: 'Leather', steel: 'Steel', dark: 'Dark', sleeve: 'Sleeve', accent: 'Accent',
};
const HAND_TILE = {
    staff: '#6b4a2b', wand: '#6b4a2b', sword: '#c9d3e0', greatsword: '#c9d3e0', claymore: '#c9d3e0', dagger: '#c9d3e0',
    axe: '#8d99a6', mace: '#8d99a6', spear: '#8d99a6', halberd: '#8d99a6', bo: '#6b4a2b', bow: '#6b4a2b',
    crossbow: '#6b4a2b', shield: '#8f2630',
};
const title = s => (s ? s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ') : '');
const partList = slot => (slot === 'left' || slot === 'right' ? HANDHELD : PART_CATALOG[slot] ?? []);
const currentId = slot => def.look.parts[slot]?.id ?? 'none';
const currentItem = slot => {
    if (slot === 'body') return `${RACES[def.look.body.race]?.label ?? 'Human'} · ${BODY_PRESETS[def.look.body.preset]?.label ?? 'Adult'}`;
    if (slot === 'face') return 'Eyes';
    if (slot === 'hair') return title(def.look.hair.style);
    if (slot === 'facialHair') return title(def.look.facialHair.style);
    if (slot === 'left' || slot === 'right') return HAND_ITEM[currentId(slot)]?.label ?? 'None';
    return partDef(slot, currentId(slot))?.label ?? 'None';
};

function disposeModel() {
    if (!model) return;
    scene.remove(model.root);
    model.root.traverse(o => {
        if (!o.isMesh) return;
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m?.dispose?.();
    });
    model = null;
}

function rebuild() {
    def.look = normalizeLook(def.look);
    disposeModel();
    model = createCharacter(def.look);
    model.setWeapons(handSpec(def.look.parts.right), handSpec(def.look.parts.left));
    model.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(model.root);
}

// ---------- small DOM helpers ----------
const rail = document.getElementById('slots');
const box = document.getElementById('controls');
const el = (tag, attrs = {}, text) => {
    const e = document.createElement(tag);
    Object.assign(e, attrs);
    if (text != null) e.textContent = text;
    return e;
};
const statusEl = () => document.getElementById('status');

function chipRow(pairs, getActive, onPick) {
    const wrap = el('div', { className: 'chips' });
    const draw = () => {
        wrap.textContent = '';
        for (const [value, label] of pairs) {
            const c = el('span', { className: `chip${getActive() === value ? ' on' : ''}` }, label);
            c.onclick = () => { onPick(value); draw(); };
            wrap.append(c);
        }
    };
    draw();
    return wrap;
}
function colorField(label, value, onInput) {
    const l = el('label', {}, label);
    const i = el('input', { type: 'color', value });
    i.oninput = () => onInput(i.value);
    l.append(i);
    return l;
}
function textField(label, value, onInput) {
    const l = el('label', {}, label);
    const i = el('input', { type: 'text', value: value ?? '' });
    i.oninput = () => onInput(i.value);
    l.append(i);
    return l;
}
function slider(label, value, min, max, onInput) {
    const l = el('label', {}, label);
    const i = el('input', { type: 'range', min, max, step: 0.01, value });
    i.oninput = () => onInput(Number(i.value));
    l.append(i);
    return l;
}

// ---------- slot changes ----------
function selectItem(slot, item) {
    if (!item) return;
    def.look.parts[slot] = { id: item.id };
    if (item.colors) def.look.parts[slot].colors = { ...item.colors };
    if ((slot === 'left' || slot === 'right') && item.id !== 'none') def.look.parts[slot].accent = '#7ff5e6';
    rebuild();
    renderRail();
    renderSide();
}
function setColor(slot, key, value) {
    if (slot === 'left' || slot === 'right') {
        def.look.parts[slot].accent = value;
    } else {
        const part = def.look.parts[slot] ??= {};
        part.colors = { ...(part.colors ?? {}), [key]: value };
    }
    rebuild();
    const tile = box.querySelector('.card.on .tile');
    if (tile) {
        tile.style.background = (slot === 'left' || slot === 'right')
            ? value
            : (key === 'primary' ? value : (def.look.parts[slot]?.colors?.primary ?? value));
    }
}

// ---------- rail ----------
function renderRail() {
    const top = rail.scrollTop;
    rail.textContent = '';
    for (const [group, slots] of RAIL_GROUPS) {
        rail.append(el('h3', {}, group));
        for (const slot of slots) {
            const row = el('div', { className: 'slotrow' });
            const button = el('button', { className: `slot${selectedSlot === slot ? ' active' : ''}`, type: 'button' });
            button.append(el('span', { className: 'name' }, SLOT_LABELS[slot]), el('span', { className: 'item' }, currentItem(slot)));
            button.onclick = () => {
                selectedSlot = slot;
                renderRail();
                renderSide();
                const h = box.querySelector('#slot-heading');
                if (h) box.scrollTop += h.getBoundingClientRect().top - box.getBoundingClientRect().top - 8;
            };
            const lock = el('button', { className: `lock${locks.has(slot) ? ' on' : ''}`, type: 'button', title: 'Lock this slot when randomizing' }, 'L');
            lock.onclick = e => {
                e.stopPropagation();
                locks.has(slot) ? locks.delete(slot) : locks.add(slot);
                lock.classList.toggle('on', locks.has(slot));
            };
            row.append(button, lock);
            rail.append(row);
        }
    }
    rail.scrollTop = top;
}

// ---------- side: identity ----------
function identitySection() {
    const frag = document.createDocumentFragment();
    frag.append(el('h2', {}, CREATE ? 'Your hero' : 'Identity'));
    frag.append(textField('Name', def.name, v => { def.name = v; }));
    if (CREATE) {
        frag.append(el('h2', {}, 'Class'));
        const blurb = el('div', { className: 'note' });
        const showBlurb = () => {
            const c = CLASSES[def.classId] ?? CLASSES.mage;
            const gifted = Object.entries(c.talents).filter(([, v]) => v === 'gifted').map(([k]) => title(k)).join(', ');
            blurb.textContent = `${c.blurb} Gifted: ${gifted}.`;
        };
        frag.append(chipRow(
            Object.keys(CLASSES).map(id => [id, CLASSES[id].name]),
            () => def.classId,
            v => { def.classId = v; showBlurb(); },
        ), blurb);
        showBlurb();
    } else {
        frag.append(textField('Id (file name)', def.id, v => { def.id = v; }));
        const lore = el('textarea', { placeholder: 'Who they are, in a line or two…', value: def.lore ?? '' });
        lore.oninput = () => { def.lore = lore.value; };
        frag.append(lore);
    }
    frag.append(el('h2', {}, 'Start from an archetype'));
    frag.append(chipRow(
        ARCHETYPE_ORDER.map(id => [id, ARCHETYPES[id].label]),
        () => '',
        id => loadArchetype(id),
    ));
    return frag;
}

// ---------- side: selected slot ----------
function bodySection() {
    const frag = document.createDocumentFragment();
    frag.append(el('h2', { id: 'slot-heading' }, 'Body'));
    const presets = Object.keys(BODY_PRESETS).map(id => [id, BODY_PRESETS[id].label]);
    frag.append(chipRow(presets, () => def.look.body.preset, id => {
        def.look.body.preset = id;
        rebuild(); renderRail(); renderSide();
    }));
    frag.append(el('h2', {}, 'Race'));
    const races = Object.keys(RACES).map(id => [id, RACES[id].label]);
    frag.append(chipRow(races, () => def.look.body.race ?? 'human', id => {   // a race brings its colours (still changeable)
        const R = RACES[id];
        def.look.body.race = id; def.look.body.skin = R.skin;
        def.look.face = { ...(def.look.face ?? {}), eyes: R.eyes };
        def.look.hair = { ...(def.look.hair ?? {}), color: R.hair };
        rebuild(); renderRail(); renderSide();
    }));
    if (RACES[def.look.body.race]?.lore) frag.append(el('div', { className: 'hint' }, RACES[def.look.body.race].lore));
    if (def.look.body.race === 'werewolf') frag.append(chipRow([['human', 'Human form'], ['wolf', 'Wolf form']], () => def.look.body.wolf ? 'wolf' : 'human', v => { def.look.body.wolf = v === 'wolf'; rebuild(); renderSide(); }));   // preview only
    frag.append(slider('Height', def.look.body.height, 0.85, 1.15, v => { def.look.body.height = v; rebuild(); }));
    frag.append(slider('Build', def.look.body.width, 0.85, 1.2, v => { def.look.body.width = v; rebuild(); }));
    frag.append(colorField('Skin', def.look.body.skin, v => { def.look.body.skin = v; rebuild(); }));
    return frag;
}
function faceSection() {
    const frag = document.createDocumentFragment();
    frag.append(el('h2', { id: 'slot-heading' }, 'Face'));
    frag.append(colorField('Eye colour', def.look.face.eyes, v => { def.look.face.eyes = v; rebuild(); }));
    frag.append(el('div', { className: 'note' }, 'Scars and markings are not in the part library yet.'));
    return frag;
}
function hairSection() {
    const frag = document.createDocumentFragment();
    frag.append(el('h2', { id: 'slot-heading' }, 'Hair'));
    frag.append(chipRow(HAIR_STYLES.map(s => [s, title(s)]), () => def.look.hair.style, v => {
        def.look.hair.style = v;
        rebuild(); renderRail(); renderSide();
    }));
    frag.append(colorField('Hair colour', def.look.hair.color, v => { def.look.hair.color = v; rebuild(); }));
    return frag;
}
function facialHairSection() {
    const frag = document.createDocumentFragment();
    frag.append(el('h2', { id: 'slot-heading' }, 'Facial hair'));
    frag.append(chipRow(FACIAL_STYLES.map(s => [s, title(s)]), () => def.look.facialHair.style, v => {
        def.look.facialHair.style = v;
        rebuild(); renderRail(); renderSide();
    }));
    frag.append(colorField('Colour', def.look.facialHair.color, v => { def.look.facialHair.color = v; rebuild(); }));
    return frag;
}

function itemGrid(slot) {
    const grid = el('div', { className: 'grid' });
    for (const item of partList(slot)) {
        const selected = currentId(slot) === item.id;
        const card = el('button', { className: `card${selected ? ' on' : ''}`, type: 'button' });
        const tile = el('span', { className: `tile${item.id === 'none' ? ' none' : ''}` });
        if (item.id !== 'none') {
            tile.style.background = selected
                ? (def.look.parts[slot]?.colors?.primary ?? def.look.parts[slot]?.accent ?? HAND_TILE[item.id] ?? '#3a3342')
                : (item.colors?.primary ?? HAND_TILE[item.id] ?? '#3a3342');
        }
        const label = el('span', { className: 'label' }, item.label);
        if (item.id !== 'none' && (item.colors || HAND_TILE[item.id])) {
            label.append(el('span', { className: 'meta' }, item.colors ? 'cloth' : 'weapon'));
        }
        card.append(tile, label);
        card.onclick = () => selectItem(slot, item);
        grid.append(card);
    }
    return grid;
}

function colorSection(slot) {
    const part = def.look.parts[slot] ?? {};
    if (slot === 'left' || slot === 'right') {
        if (!part.id || part.id === 'none') return null;
        const frag = document.createDocumentFragment();
        frag.append(el('h3', {}, 'Colour'));
        frag.append(colorField('Accent', part.accent ?? '#7ff5e6', v => setColor(slot, 'accent', v)));
        return frag;
    }
    const item = partDef(slot, part.id);
    const keys = Object.keys({ ...(item?.colors ?? {}), ...(part.colors ?? {}) });
    if (!keys.length) return null;
    const frag = document.createDocumentFragment();
    frag.append(el('h3', {}, 'Colours'));
    const wrap = el('div', { className: 'swatches' });
    for (const k of keys) {
        const value = part.colors?.[k] ?? item?.colors?.[k];
        if (!value) continue;
        wrap.append(colorField(COLOR_LABELS[k] ?? title(k), value, v => setColor(slot, k, v)));
    }
    frag.append(wrap);
    return frag;
}

function slotSection() {
    const frag = document.createDocumentFragment();
    if (selectedSlot === 'body') { frag.append(bodySection()); return frag; }
    if (selectedSlot === 'face') { frag.append(faceSection()); return frag; }
    if (selectedSlot === 'hair') { frag.append(hairSection()); return frag; }
    if (selectedSlot === 'facialHair') { frag.append(facialHairSection()); return frag; }
    frag.append(el('h2', { id: 'slot-heading' }, SLOT_LABELS[selectedSlot]));
    frag.append(itemGrid(selectedSlot));
    const colors = colorSection(selectedSlot);
    if (colors) frag.append(colors);
    if (selectedSlot === 'left' || selectedSlot === 'right') {
        frag.append(el('div', { className: 'note' }, 'Both hands use the same catalogue. A left-handed character simply holds the weapon in the left hand. A shield rides the forearm and can go in either hand.'));
    }
    return frag;
}

// ---------- side: preview + actions ----------
function previewSection() {
    const frag = document.createDocumentFragment();
    frag.append(el('h2', {}, 'Preview'));
    const VIEWS = { front: 0, side: Math.PI / 2, back: Math.PI };
    frag.append(chipRow(
        [['front', 'Front'], ['side', 'Side'], ['back', 'Back'], ['spin', 'Spin']],
        () => (view.spin ? 'spin' : ''),
        v => {
            if (v === 'spin') { view.spin = true; return; }
            view.spin = false;
            view.yaw = VIEWS[v];
        },
    ));
    frag.append(chipRow(
        [['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['cast', 'Cast'], ['strike', 'Strike']],
        () => pose,
        v => { pose = v; },
    ));
    frag.append(chipRow([['R', 'Right hand'], ['L', 'Left hand']], () => previewHand, v => { previewHand = v; }));
    return frag;
}

function actionsSection() {
    const frag = document.createDocumentFragment();
    frag.append(el('h2', {}, CREATE ? 'Ready?' : 'Cast'));
    const row = el('div', { className: 'row' });
    const rnd = el('button', { type: 'button' }, 'Randomize');
    rnd.onclick = () => { randomize(); rebuild(); renderRail(); renderSide(); };
    row.append(rnd);
    if (CREATE) {
        const go = el('button', { className: 'main', type: 'button' }, 'Begin your journey');
        go.onclick = () => {
            if (!def.name.trim()) { const s = statusEl(); if (s) s.textContent = 'Give your hero a name first.'; return; }
            try {
                localStorage.setItem('amo3d.newHero', JSON.stringify({ name: def.name.trim(), classId: def.classId, look: normalizeLook(def.look) }));
            } catch { /* storage blocked */ }
            location.href = 'index.html?new=1&play=1&hero=new';
        };
        const back = el('button', { type: 'button' }, 'Back');
        back.onclick = () => { location.href = 'index.html'; };
        row.append(go, back);
    } else {
        const save = el('button', { className: 'main', type: 'button' }, 'Save to the cast');
        save.onclick = saveCast;
        const exp = el('button', { type: 'button' }, 'Export JSON');
        exp.onclick = () => {
            def.look = normalizeLook(def.look);
            const a = el('a', { href: URL.createObjectURL(new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' })), download: `${def.id}.json` });
            a.click();
        };
        row.append(save, exp);
    }
    frag.append(row);
    if (!CREATE) {
        const load = el('select');
        load.append(el('option', { value: '' }, 'Open a cast member…'));
        // Every NPC as the game dresses them (content/castList.js), by place — open one to look at it and leave notes.
        const groups = {};
        for (const n of NPCS) (groups[n.group] ??= []).push(n);
        for (const [g, list] of Object.entries(groups)) {
            const og = el('optgroup'); og.label = `${g} (${list.length})`;
            for (const n of list) og.append(el('option', { value: `npc:${n.id}`, selected: npcRef?.id === n.id }, n.name));
            load.append(og);
        }
        fetch('api/cast').then(r => r.json()).then(list => {
            const og = el('optgroup'); og.label = 'Saved heroes (src/content/cast)';
            for (const c of list) og.append(el('option', { value: JSON.stringify(c) }, c.name ?? c.id));
            load.append(og);
        }).catch(() => {});
        load.onchange = () => {
            if (!load.value) return;
            if (load.value.startsWith('npc:')) {
                const n = NPCS.find(x => x.id === load.value.slice(4));
                npcRef = n;
                def = { ...def, id: n.id, name: n.name.split(' — ')[0], look: normalizeLook(JSON.parse(JSON.stringify(n.look))) };
            } else {
                npcRef = null;
                const c = JSON.parse(load.value);
                def = { ...c, look: normalizeLook(c.look) };
            }
            rebuild(); renderRail(); renderSide();
        };
        const lr = el('label', {}, 'Open');
        lr.append(load);
        frag.append(lr);
    }
    frag.append(el('div', { id: 'status' }));
    return frag;
}

// ---------- NPC notes (the Forge's cast list) ----------
// What you want changed on a person, saved to src/content/npc_notes/<id>.json through /api/npcnotes (dev server).
// Claude reads them ("process the NPC notes"), makes the change, replies and marks each done.
const NPCS = CREATE ? [] : npcCast();
let npcRef = null, npcNotes = {};
const noteStatus = msg => { const e = statusEl(); if (e) e.textContent = msg; };
fetch('api/npcnotes').then(r => r.json()).then(list => { for (const n of list) npcNotes[n.id] = n; if (npcRef) renderSide(); }).catch(() => {});
async function saveNpcNotes(id) {
    try {
        const r = await fetch('api/npcnotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(npcNotes[id]) });
        if (!r.ok) throw new Error((await r.json()).error);
        noteStatus('Notes saved');
    } catch (e) { noteStatus(`Notes not saved — they need the dev server (${e.message})`); }
}
function notesSection() {
    const frag = document.createDocumentFragment();
    if (!npcRef) return frag;
    frag.append(el('h2', {}, `Notes for Claude — ${npcRef.name}`));
    frag.append(el('div', { className: 'hint' }, `${npcRef.group}. Say what to change on this person (clothes, colours, build, hair…). Saved to src/content/npc_notes/${npcRef.id}.json.`));
    const ta = el('textarea'); ta.rows = 3; ta.placeholder = 'e.g. give him a grey beard and a leather apron';
    ta.style.cssText = 'width:100%;box-sizing:border-box;font:inherit;background:#1a1410;color:#eee6d2;border:1px solid #f3d88b55;border-radius:4px;padding:6px';
    const add = el('button', { type: 'button', className: 'main' }, 'Add note');
    add.onclick = () => {
        const text = ta.value.trim(); if (!text) return;
        const n = (npcNotes[npcRef.id] ??= { id: npcRef.id, name: npcRef.name, group: npcRef.group, notes: [] });
        n.notes.push({ text, at: new Date().toISOString(), status: 'open' });
        saveNpcNotes(npcRef.id); renderSide();
    };
    frag.append(ta, add);
    for (const [i, n] of (npcNotes[npcRef.id]?.notes ?? []).entries()) {
        const row = el('div', { className: 'hint' });
        row.style.cssText = `margin-top:6px;padding:6px;border-left:3px solid ${n.status === 'done' ? '#6a9a5a' : '#f3d88b'};background:#0006`;
        row.append(el('div', {}, `${n.status === 'done' ? '✓ ' : '• '}${n.text}`));
        if (n.reply) row.append(el('div', {}, `Claude: ${n.reply}`));
        const del = el('button', { type: 'button' }, 'Remove'); del.style.cssText = 'margin-top:4px;font-size:12px';
        del.onclick = () => { npcNotes[npcRef.id].notes.splice(i, 1); saveNpcNotes(npcRef.id); renderSide(); };
        row.append(del);
        frag.append(row);
    }
    return frag;
}

function renderSide() {
    const top = box.scrollTop;
    box.textContent = '';
    box.append(notesSection(), identitySection(), slotSection(), previewSection(), actionsSection());
    box.scrollTop = top;
}

// ---------- archetypes, randomize, save ----------
function loadArchetype(id) {
    const a = ARCHETYPES[id];
    if (!a) return;
    def.look = normalizeLook(clone(a.look));
    if (!def.name.trim()) def.name = a.name;
    if (!CREATE) def.lore = a.lore;
    rebuild();
    renderRail();
    renderSide();
}

const pick = a => a[Math.floor(Math.random() * a.length)];
const hsl = (h, s, l) => `#${new THREE.Color().setHSL((h + 1) % 1, s, l).getHexString()}`;
const shade = (hex, f) => {
    const c = new THREE.Color(hex);
    return `#${c.clone().multiplyScalar(f).getHexString()}`;
};

function randomize() {
    const SKIN = ['#f1c9a5', '#e2b48f', '#c98f6a', '#a8704a', '#7a4e32', '#5a3a26'];
    const HAIR = ['#1a1410', '#3a2418', '#5a3a22', '#8a5a2a', '#d9b25a', '#a8452a', '#8a8a8a', '#e8e4da'];
    const EYES = ['#5ab8f0', '#4fd06a', '#8a6a3a', '#3a5a8a', '#9a7a4a', '#7a3ac0'];
    const LEATHER = ['#5a3520', '#6e4a2c', '#3a2a1a', '#4a2e1c'];
    const CLOTH = ['#8f2630', '#283a5e', '#3d5136', '#4a2450', '#6a5a4a', '#7a4a2a', '#2a4a4a', '#5a4a6a'];
    const TRIM = ['#d4a84a', '#c8ccd4', '#b87333', '#c9a84e'];
    const hue = Math.random();

    if (!locks.has('body')) {
        const preset = pick(['adult_male', 'adult_male', 'adult_female', 'adult_female', 'child', 'elder']);
        def.look.body.preset = preset;
        def.look.body.height = +(0.95 + Math.random() * 0.1).toFixed(2);
        def.look.body.width = +(0.95 + Math.random() * 0.1).toFixed(2);
        def.look.body.skin = pick(SKIN);
    }
    if (!locks.has('face')) def.look.face.eyes = pick(EYES);
    if (!locks.has('hair')) {
        def.look.hair.style = pick(HAIR_STYLES);
        def.look.hair.color = pick(HAIR);
    }
    if (!locks.has('facialHair')) {
        def.look.facialHair.style = pick(FACIAL_STYLES);
        def.look.facialHair.color = def.look.hair.color;
    }

    const noneChance = { headgear: 0.45, cape: 0.55, back: 0.35, accessory: 0.6, neck: 0.4, shoulders: 0.15 };
    for (const slot of PART_SLOTS) {
        if (slot === 'left' || slot === 'right' || locks.has(slot)) continue;
        const list = PART_CATALOG[slot];
        const none = Math.random() < (noneChance[slot] ?? 0.03);
        const item = none ? list.find(i => i.id === 'none') : pick(list.filter(i => i.id !== 'none'));
        const entry = { id: item.id };
        if (item.colors) {
            entry.colors = { ...item.colors };
            if (slot === 'torso') {
                entry.colors.primary = hsl(hue + Math.random() * 0.12, 0.4 + Math.random() * 0.2, 0.2 + Math.random() * 0.14);
                entry.colors.collar = shade(entry.colors.primary, 0.55);
                if (entry.colors.sleeve) entry.colors.sleeve = entry.colors.primary;
            }
            if (slot === 'legs' && item.id === 'skirt') entry.colors.primary = pick(CLOTH);
            if (slot === 'feet') entry.colors.primary = pick(LEATHER);
            if (slot === 'waist') entry.colors.primary = item.id === 'sash' ? pick(CLOTH) : pick(LEATHER);
            if (slot === 'back') entry.colors.primary = pick(LEATHER);
            if (slot === 'shoulders') entry.colors.primary = item.id === 'steel_pauldrons' ? pick(['#8d99a6', '#7a808a', '#5a6070']) : pick(LEATHER);
            if (slot === 'arms') {
                entry.colors.sleeve = def.look.parts.torso?.colors?.primary ?? pick(CLOTH);
                entry.colors.primary = pick(LEATHER);
            }
            if (entry.colors.trim && !['headgear', 'accessory', 'neck'].includes(slot)) entry.colors.trim = pick(TRIM);
            if (slot === 'headgear' && item.id === 'wizard_hat') entry.colors.trim = '#ffcf6a';
        }
        def.look.parts[slot] = entry;
    }

    if (!locks.has('right')) {
        const weapons = HANDHELD.filter(i => !['none', 'shield'].includes(i.id));
        def.look.parts.right = { id: pick(weapons).id, accent: hsl(hue, 0.6, 0.75) };
    }
    if (!locks.has('left')) {
        const off = ['none', 'none', 'shield', 'shield', 'dagger', 'sword'];
        const id = pick(off);
        def.look.parts.left = id === 'none' ? { id } : { id, accent: hsl(hue + 0.5, 0.5, 0.6) };
    }
}

async function saveCast() {
    def.look = normalizeLook(def.look);
    def.id = (def.id || def.name || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
    const status = statusEl();
    try {
        const r = await fetch('api/cast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def) });
        const j = await r.json();
        if (status) {
            status.style.color = r.ok ? '#bfe6a0' : '#ff9a8a';
            status.textContent = r.ok ? `Saved — ${j.saved}` : `Not saved: ${j.error}`;
        }
    } catch {
        if (status) {
            status.style.color = '#ff9a8a';
            status.textContent = 'Saving needs the dev server (npm run dev). Use Export JSON instead.';
        }
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
    model?.update(dt, { sprinting: false, hopK: null, ...P, castHand: previewHand, strikeHand: previewHand });
    const preset = BODY_PRESETS[def.look.body.preset] ?? BODY_PRESETS.adult_male;
    const focusY = 1.05 * preset.height * (def.look.body.height ?? 1);
    camera.position.set(Math.sin(view.yaw) * Math.cos(view.pitch) * view.dist, focusY + 0.1 + Math.sin(view.pitch) * view.dist, Math.cos(view.yaw) * Math.cos(view.pitch) * view.dist);
    camera.lookAt(0, focusY, 0);
    renderer.render(scene, camera);
});

document.getElementById('forge-sub').textContent = CREATE ? 'Make your hero' : 'Characters for Arcane Majesty';
rebuild();
renderRail();
renderSide();
function modelBounds() {
    if (!model) return null;
    const box = new THREE.Box3().setFromObject(model.root);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const v = new THREE.Vector3(x, y, z).project(camera);
        minX = Math.min(minX, (v.x * 0.5 + 0.5) * stage.clientWidth);
        maxX = Math.max(maxX, (v.x * 0.5 + 0.5) * stage.clientWidth);
        minY = Math.min(minY, (-v.y * 0.5 + 0.5) * stage.clientHeight);
        maxY = Math.max(maxY, (-v.y * 0.5 + 0.5) * stage.clientHeight);
    }
    return { minX, minY, maxX, maxY, w: stage.clientWidth, h: stage.clientHeight, world: box.getSize(new THREE.Vector3()).toArray() };
}

window.__forge = {
    get def() { return def; },
    get model() { return model; },
    rebuild,
    bounds: modelBounds,
    randomize: () => { randomize(); rebuild(); renderRail(); renderSide(); },
    loadArchetype,
    saveCast,
    setSlot: id => { selectedSlot = id; renderRail(); renderSide(); },
    setPart: (slot, id) => {
        const item = (slot === 'left' || slot === 'right') ? HAND_ITEM[id] : partDef(slot, id);
        if (item) selectItem(slot, item);
    },
    setPose: id => { pose = id; },
    setView: opts => Object.assign(view, opts),
    look: () => normalizeLook(def.look),
};

// Back to the game (the title's Workshop opens this page).
{ const a = document.createElement('a'); a.href = 'index.html'; a.textContent = '← Game'; a.style.cssText = 'position:absolute;left:10px;top:10px;z-index:5;padding:5px 10px;font:14px Georgia,serif;color:#f3e2b0;background:#120a06d8;border:1px solid #f3d88b66;border-radius:4px;text-decoration:none'; (document.getElementById('stage') ?? document.body).append(a); }   // inside the model view: clear of the rail on any layout
