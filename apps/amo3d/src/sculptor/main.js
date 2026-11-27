// The Sculptor (the Character Lab until 2026-11-26; the Forge makes characters, the Sculptor shapes the models they are
// built on: docs/3d/characters/LAYERS_PLAN.md) (2026-11-22): two character models side by side, turning on a plain grey stage (like the reference
// sheet, docs/3d/characters/reference_v2.jpg), in A-pose / idle / walk / run / strike. Dev server only (not in any build).
// Pick each side at the top: ?a=<who>:<new|classic>&b=… (who: base_male, base_female or a cast id). Old links still work:
// ?who=base (the two base bodies), ?who=seraphina (classic beside v2). The base bodies can be reshaped in the point editor,
// with the other side shown beside it from the same angle (the compare) and the reference sheet, each on or off.
import * as THREE from 'three';
import { createCharacter } from '../content/models/character.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createPointEditor } from './pointEditor.js';
import { settings } from '../engine/settings.js';
import { V2_MODELS } from '../content/models/v2/index.js';
import { DRESSES } from '../content/models/v2/dress.js';
import seraphina from '../content/cast/seraphina.json';
import seraphinaRebel from '../content/cast/seraphina_rebel.json';
import eldrin from '../content/cast/eldrin.json';
import anya from '../content/cast/anya.json';
import { layerFromPositions } from '../content/models/v2/skin.js';

const CAST = { seraphina, seraphina_rebel: seraphinaRebel, eldrin, anya }, Q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3c3c40);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
scene.add(new THREE.HemisphereLight(0xdedcf0, 0x404048, 1.3));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun);   // (the bias as in the game: without it the flat faces striped themselves — shadow acne)
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x46464c, roughness: 1 })); floor.receiveShadow = true; scene.add(floor);

const HAIRLESS = Q.get('hair') === '0';   // ?hair=0: the base bodies without hair
const DRESS = Object.hasOwn(DRESSES, Q.get('dress') ?? '') ? Q.get('dress') : null;   // ?dress=commoner|traveller|robe|dress: the base bodies in a basic outfit (dress.js)
const baseLook = (preset, v2) => ({ v2, body: { preset, race: 'human', skin: '#e2b590' }, hair: { style: HAIRLESS ? 'bald' : 'short' }, parts: { right: { id: 'none' }, left: { id: 'none' } }, ...(DRESS ? { sculpt: { dress: DRESS } } : {}) });
// what can stand on either side: the base bodies (v2 only: no clothes, empty hands) and the cast (classic, and v2 when it has one)
const SUBJECTS = { base_male: { name: 'Male base', look: () => baseLook('adult_male', 'base_male'), sex: 'male', vers: ['new'] },
    base_female: { name: 'Female base', look: () => baseLook('adult_female', 'base_female'), sex: 'female', vers: ['new'] },
    base_male_v3: { name: 'Male base v3', look: () => baseLook('adult_male', 'base_male_v3'), sex: 'male', vers: ['new'] },
    base_female_v3: { name: 'Female base v3', look: () => baseLook('adult_female', 'base_female_v3'), sex: 'female', vers: ['new'] },
    // the four other bodies (LAYERS_PLAN step 3): the male or female shape, with the age's proportions and age layer
    base_boy: { name: 'Boy base', look: () => baseLook('child_male', 'base_male'), sex: 'male', vers: ['new'] },
    base_girl: { name: 'Girl base', look: () => baseLook('child_female', 'base_female'), sex: 'female', vers: ['new'] },
    base_old_man: { name: 'Old man base', look: () => baseLook('elder_male', 'base_male'), sex: 'male', vers: ['new'] },
    base_old_woman: { name: 'Old woman base', look: () => baseLook('elder_female', 'base_female'), sex: 'female', vers: ['new'] } };
// the creatures (LAYERS_PLAN step 6): each kind's v2 body, shaped in its own layer — the wolf first
const CREATURES = { wolf: { name: 'Wolf', build: () => import('../content/actors/wolf.js').then(m => m.buildWolf(0x6b6862)) },
    horse: { name: 'Horse', build: () => import('../content/models/horse.js').then(m => m.buildHorse()) } };
// the animals (animals.js), each kind its own subject and layer
for (const [k, n] of Object.entries({ rabbit: 'Rabbit', forest_fox: 'Fox', feral_boar: 'Feral boar', black_bear: 'Black bear', grizzly_bear: 'Grizzly bear', sheep: 'Sheep', cow: 'Cow', pig: 'Pig', goat: 'Goat', chicken: 'Chicken', crow: 'Crow' }))
    CREATURES[k] = { name: n, build: () => import('../content/actors/animals.js').then(m => m.build(k)) };
for (const [id, c] of Object.entries(CREATURES)) SUBJECTS[id] = { name: c.name, sex: id, creature: c, vers: ['new'] };
// ?lineup=1: the six bodies side by side (man, woman, boy, girl, old man, old woman), A-pose, to judge them together
const LINEUP = Q.get('lineup') === '1' ? ['base_male', 'base_female', 'base_boy', 'base_girl', 'base_old_man', 'base_old_woman'] : null;
for (const [id, c] of Object.entries(CAST)) SUBJECTS[id] = { name: c.name, vers: Object.hasOwn(V2_MODELS, c.look.v2 ?? '') ? ['classic', 'new'] : ['classic'],
    look: () => { const lk = JSON.parse(JSON.stringify(c.look)); if (id === 'seraphina') lk.parts.right = { id: 'spear' }; return lk; } };   // (the Queen of Carnage's glaive; the Rebel holds her daggers)
const VER = { new: 'v2', classic: 'classic' };
const parseSlot = v => { const [id, ver] = (v ?? '').split(':'); const S = SUBJECTS[id]; return S ? { id, ver: S.vers.includes(ver) ? ver : S.vers.at(-1) } : null; };
const legacy = Q.get('who'), slots = [parseSlot(Q.get('a')), parseSlot(Q.get('b'))];
if (!slots[0] || !slots[1]) {
    const L = legacy && legacy !== 'base' && SUBJECTS[legacy] ? [`${legacy}:classic`, `${legacy}:new`] : ['base_male:new', 'base_female:new'];
    slots.forEach((sl, i) => { if (!sl) slots[i] = parseSlot(L[i]); });
}
const make = (mode, lk) => { settings.charModels = mode; const c = createCharacter(lk); scene.add(c.root); return c; };
// a creature on stage: its built body, still (the editor shows its rest shape; the stage turns it)
const makeCreature = async S => { settings.charModels = 'new'; const d = await S.creature.build(); scene.add(d.root); return { root: d.root, update: () => {}, creature: true }; };
// Alternates (other versions of a layer, layers/alt/): ?alt0=boy:round shows the left side's body with its boy layer
// replaced by the alternate "round", ?alt1=… the right side's — the same body on both sides compares two versions
const ALTS = await fetch('/api/v2alts').then(r => r.json()).catch(() => ({}));
const altOf = slots.map((sl, i) => { const [layer, name] = (Q.get(`alt${i}`) ?? '').split(':'); return SUBJECTS[sl.id].sex && ALTS[layer]?.includes(name) ? { layer, name } : null; });
const altData = await Promise.all(altOf.map(a => a ? fetch(`/api/v2layer?layer=${a.layer}&alt=${a.name}`).then(r => r.json()) : null));
const models = await Promise.all(slots.map(async (sl, i) => { if (SUBJECTS[sl.id].creature) return makeCreature(SUBJECTS[sl.id]); const lk = SUBJECTS[sl.id].look(); if (altOf[i]) lk.sculpt = { ...(lk.sculpt ?? {}), swap: { [altOf[i].layer]: altData[i] } }; return make(sl.ver, lk); }));
const slotName = sl => `${SUBJECTS[sl.id].name} — ${VER[sl.ver]}` + ((a => a ? ` · ${a.layer}: ${a.name}` : '')(altOf[slots.indexOf(sl)]));
const BASE = slots.some(sl => SUBJECTS[sl.id].sex);   // a base body on stage: the point editor and the hair toggle are offered
document.getElementById('labels').innerHTML = slots.map(sl => `<span>${slotName(sl).toUpperCase()}</span>`).join('');
document.getElementById('labels').style.top = '56px';
models[0].root.position.x = -0.75; models[1].root.position.x = 0.75;
if (LINEUP) {   // (the two slots hidden; six bodies in a row instead, view only — editing an age layer comes with the Sculptor)
    models.forEach(m => { m.root.visible = false; });
    LINEUP.forEach((id, i) => { const m = make('new', SUBJECTS[id].look()); m.root.position.x = (i - 2.5) * 0.85; models.push(m); });
    document.getElementById('labels').innerHTML = '';
}
let mode = BASE ? 'apose' : 'idle', spin = !BASE, yaw = BASE ? 0 : 0.35;
// the top bar: what stands on each side (changing one reloads the page with it), then the editor and the hair
const top = document.createElement('div'); top.id = 'top';
top.style.cssText = 'position:fixed;top:10px;left:12px;right:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;font:14px Georgia,serif;color:#e8dcb8;z-index:5';
const go = changes => { const u = new URL(location.href); u.searchParams.delete('who'); for (const [k, v] of Object.entries(changes)) { if (v == null) u.searchParams.delete(k); else u.searchParams.set(k, v); } location.href = u; };
if (LINEUP) { const a = document.createElement('a'); a.textContent = '← Two sides'; a.href = '?'; a.style.cssText = 'color:#f3d88b'; top.append(a); }
else slots.forEach((sl, i) => {
    const lab = document.createElement('label'); lab.textContent = i ? 'Right ' : 'Left ';
    const sel = document.createElement('select'); sel.style.cssText = 'font:14px Georgia,serif;padding:5px 8px;border-radius:8px;border:1px solid #c8963a88;background:#2e1e12;color:#f1e4c4';
    for (const [id, S] of Object.entries(SUBJECTS)) for (const ver of S.vers) { const o = document.createElement('option'); o.value = `${id}:${ver}`; o.textContent = `${S.name} — ${VER[ver]}`; sel.append(o); }
    sel.value = `${sl.id}:${sl.ver}`;
    sel.onchange = () => go({ a: i ? `${slots[0].id}:${slots[0].ver}` : sel.value, b: i ? sel.value : `${slots[1].id}:${slots[1].ver}`, edit: null, [`alt${i}`]: null });
    lab.append(sel); top.append(lab);
});
if (slots.some(sl => SUBJECTS[sl.id].sex) || LINEUP) {   // dress the base bodies: undressed, or a basic outfit (painted on: every edit still lands)
    const lab = document.createElement('label'); lab.textContent = 'Dress ';
    const sel = document.createElement('select'); sel.style.cssText = 'font:14px Georgia,serif;padding:5px 8px;border-radius:8px;border:1px solid #c8963a88;background:#2e1e12;color:#f1e4c4';
    for (const [v, t] of [['', 'Undressed'], ...Object.entries(DRESSES).map(([id, d]) => [id, d.label])]) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.append(o); }
    sel.value = DRESS ?? ''; sel.onchange = () => go({ dress: sel.value || null });
    lab.append(sel); top.append(lab);
}
document.body.append(top);
const topBtn = (t, fn, hot = false) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = `font:14px Georgia,serif;padding:6px 12px;border-radius:9px;border:1px solid ${hot ? '#f3d88b' : '#c8963a88'};background:${hot ? '#8a6a2a' : '#2e1e12'};color:#f1e4c4;cursor:pointer`; b.onclick = fn; top.append(b); return b; };
{ const a = document.createElement('a'); a.id = 'lnkForge'; a.href = 'forge.html'; a.textContent = 'The Forge →'; a.style.cssText = 'position:fixed;left:92px;bottom:8px;z-index:50;padding:5px 10px;font:14px Georgia,serif;color:#f3e2b0;background:#120a06d8;border:1px solid #f3d88b66;border-radius:4px;text-decoration:none'; document.body.append(a); }
{ const a = document.createElement('a'); a.id = 'lnkGame'; a.href = 'index.html'; a.textContent = '← Game'; a.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:50;padding:5px 10px;font:14px Georgia,serif;color:#f3e2b0;background:#120a06d8;border:1px solid #f3d88b66;border-radius:4px;text-decoration:none'; document.body.append(a); }
const bar = document.getElementById('bar');
for (const [id, label] of [['apose', 'A-pose'], ['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['strike', 'Strike'], ['spin', 'Turn']]) {
    const b = document.createElement('button'); b.textContent = label; b.dataset.id = id;
    b.onclick = () => { if (id === 'spin') spin = !spin; else mode = id; refresh(); }; bar.append(b);
}
const refresh = () => bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.id === mode || (b.dataset.id === 'spin' && spin)));
refresh();
let drag = null;
renderer.domElement.addEventListener('pointerdown', e => { drag = e.clientX; spin = false; refresh(); });
addEventListener('pointerup', () => { drag = null; });
addEventListener('pointermove', e => { if (drag != null) { yaw += (e.clientX - drag) * 0.01; drag = e.clientX; } });
// a phone (2026-11-26): the labels below the wrapped top bar, the pose buttons above the two links
const NARROW = () => innerWidth < 760;
function layoutBars() { if (!NARROW()) return; const L = document.getElementById('labels'), b = document.getElementById('bar'); if (L) L.style.top = `${document.getElementById('top').offsetHeight + 18}px`; if (b) b.style.bottom = '48px'; }
addEventListener('resize', layoutBars); setTimeout(layoutBars, 0);
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); const d = (camera.aspect < 0.6 ? 11.5 : camera.aspect < 1 ? 9 : 6) * (LINEUP ? 1.55 : 1); /* (a phone held upright: further back, both bodies whole) */ camera.position.set(0, 1.1, d); camera.lookAt(0, 0.95, 0); }
addEventListener('resize', resize); resize();
window.__lab_models = models; window.__THREE = THREE;   // (tools/models/shots.mjs: the stage's models, framed by their size)
window.__lab = { ground: () => models.map(m => [-0.4, -0.45, -0.48].map(y => m.rig.legs.L.shin.localToWorld(new THREE.Vector3(0, y, 0)).y.toFixed(3)).join(',')).join(' / '), plain: () => { floor.visible = false; scene.background.set(0x3b3b3b); for (const id of ['bar', 'labels']) document.getElementById(id).style.display = 'none'; }, solo: i => { models.forEach((m, j) => { m.root.visible = j === i; m.root.position.x = 0; }); }, tris: () => models.map(m => { let t = 0; m.root.traverse(o => { if (o.isMesh && o.visible && o.userData.v2) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return Math.round(t); }).join(' / '), setYaw: v => { yaw = v; spin = false; refresh(); }, setMode: v => { mode = v; refresh(); }, zoom: (d, y, x = 0) => { camera.position.set(x, y, d); camera.lookAt(x, y - 0.05, 0); }, cam: (p, t) => { camera.position.set(...p); camera.lookAt(...t); } };
// ---- the Blender round trip (docs/3d/characters/BLENDER.md): Export a base body as .glb (one vertex per point, its id in
// the UV's u), edit it in Blender moving points only, Import the .glb back: each moved point is saved by its key ----
function bodyMesh(i) { let sm = null; models[i].root.traverse(o => { if (!sm && o.isSkinnedMesh && o.userData.editSex) sm = o; }); return sm; }   // (the body itself: not a coat's or the eyes' mesh)
function pointTable(sm) {   // unique points (by key) in vertex order, their current positions and the triangles
    const keys = sm.userData.editKeys, pos = sm.geometry.attributes.position, col = sm.geometry.attributes.color, ids = new Map(), P = [], C = [], idx = [], firstV = [];
    for (let v = 0; v < keys.length; v++) {
        let k = ids.get(keys[v]);
        if (k === undefined) { k = ids.size; ids.set(keys[v], k); P.push(pos.getX(v), pos.getY(v), pos.getZ(v)); C.push(col.getX(v), col.getY(v), col.getZ(v)); firstV.push(v); }
        idx.push(k);
    }
    return { keys: [...ids.keys()], P, C, idx, firstV };
}
// the same table, posed as the model stands now (the A-pose): per point an affine map rest → posed (L: 3×3, t), so the
// editor shows the pose and turns each drag back into the rest shape (the edits stay in rest-shape positions)
function posedTable(i) {
    const m = models[i], sm = bodyMesh(i), T = pointTable(sm), keepP = m.root.position.clone(), keepR = m.root.rotation.y;
    m.root.position.set(0, 0, 0); m.root.rotation.y = 0; m.root.updateMatrixWorld(true); sm.skeleton.update();
    const L = [], t = [], v = new THREE.Vector3(), base = new THREE.Vector3();
    T.firstV.forEach((vi, k) => {
        const p = [T.P[k * 3], T.P[k * 3 + 1], T.P[k * 3 + 2]];
        sm.applyBoneTransform(vi, base.set(...p));
        const cols = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(e => { sm.applyBoneTransform(vi, v.set(p[0] + e[0], p[1] + e[1], p[2] + e[2])); return v.clone().sub(base); });
        L.push(...cols.flatMap(c => [c.x, c.y, c.z]));   // column-major
        const lp = cols.reduce((a, c, j) => a.addScaledVector(c, p[j]), new THREE.Vector3());
        t.push(base.x - lp.x, base.y - lp.y, base.z - lp.z);
    });
    // the hair's points (by their colour), for Show › Hair; the eyes and brows (their own mesh), posed the same, for Show › Eyes
    const hc = sm.userData.hairColor, hair = T.keys.map((_, k) => !!hc && Math.abs(T.C[k * 3] - hc.r) + Math.abs(T.C[k * 3 + 1] - hc.g) + Math.abs(T.C[k * 3 + 2] - hc.b) < 0.02);
    const posed = flag => {   // a feature mesh (the eyes and brows, the mouth), posed as the body is, for the editor
        let f = null; m.root.traverse(o => { if (!f && o.isSkinnedMesh && o.userData[flag]) f = o; });
        if (!f) return null;
        f.skeleton.update();
        const src = f.geometry.attributes.position, out = new Float32Array(src.count * 3);
        for (let n = 0; n < src.count; n++) { f.applyBoneTransform(n, v.fromBufferAttribute(src, n)); out.set([v.x, v.y, v.z], n * 3); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(out, 3)); g.setAttribute('color', f.geometry.attributes.color.clone()); g.computeVertexNormals();
        return g;
    };
    const faceGeo = posed('face'), mouthGeo = posed('mouth');
    m.root.position.copy(keepP); m.root.rotation.y = keepR; m.root.updateMatrixWorld(true);
    return { ...T, L, t, hair, faceGeo, mouthGeo };
}
const say = t => { const e = document.getElementById('labmsg'); if (e) e.textContent = t; };
async function exportBody(i) {
    const sm = bodyMesh(i), T = pointTable(sm), g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(T.P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(T.C, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(T.keys.flatMap((_, k) => [k, 0]), 2));   // the point's id
    g.setIndex(T.idx); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true })); mesh.name = sm.name;
    const glb = await new GLTFExporter().parseAsync(mesh, { binary: true });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' })); a.download = `${sm.name}.glb`; a.click();
    say(`Exported ${sm.name}.glb — ${T.keys.length} points. Edit it in Blender (move points only), export .glb, then Import.`);
}
async function importBody(i, file) {
    const sm = bodyMesh(i), sex = sm.userData.editSex, T = pointTable(sm);
    const gltf = await new GLTFLoader().parseAsync(await file.arrayBuffer(), '');
    const sum = new Map();   // id → [x, y, z, n] (Blender splits a point per face: average them)
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        const p = o.geometry.attributes.position, uv = o.geometry.attributes.uv, v = new THREE.Vector3();
        if (!uv) return;
        for (let n = 0; n < p.count; n++) {
            const id = Math.round(uv.getX(n)); if (id < 0 || id >= T.keys.length) continue;
            v.fromBufferAttribute(p, n).applyMatrix4(o.matrixWorld);
            const a = sum.get(id) ?? [0, 0, 0, 0]; a[0] += v.x; a[1] += v.y; a[2] += v.z; a[3]++; sum.set(id, a);
        }
    });
    if (!sum.size) return say('No points found: was the UV map kept (it carries each point\'s id)? See BLENDER.md.');
    const edits = {};   // (only what moved in Blender: merged into the layer as it is)
    let moved = 0;
    for (const [id, [x, y, z, n]] of sum) {
        const nx = x / n, ny = y / n, nz = z / n, k = T.keys[id];
        if (Math.hypot(nx - T.P[id * 3], ny - T.P[id * 3 + 1], nz - T.P[id * 3 + 2]) < 1e-4) continue;
        edits[k] = [+nx.toFixed(5), +ny.toFixed(5), +nz.toFixed(5)]; moved++;
    }
    if (!moved) return say(`No point moved (${sum.size} points read).`);
    // into the body's own layer (its age layer, else its sex), as offsets less what its other layers give: LAYERS_PLAN.md
    const stack = sm.userData.layers ?? [sex], layer = stack.at(-1), tot = layerFromPositions(sm, edits);
    const others = await Promise.all(stack.filter(n => n !== layer).map(async n => (await fetch(`/api/v2layer?layer=${n}`)).json()));
    const points = await (await fetch(`/api/v2layer?layer=${layer}`)).json();
    for (const [t, v] of Object.entries(tot)) points[t] = v.map((x, j) => +others.reduce((a, L) => a - (L[t]?.[j] ?? 0), x).toFixed(6));
    const r = await fetch('/api/v2layer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layer, points }) });
    say(r.ok ? `Saved ${moved} moved points into the ${layer} layer — reloading…` : `Save refused: ${(await r.json().catch(() => ({}))).error ?? r.status}`);
    if (r.ok) setTimeout(() => location.reload(), 900);
}
if (BASE && Q.get('blender') === '1') {   // the Blender round trip: not in use for now — kept, shown only with ?blender=1
    const box = document.createElement('div'); box.id = 'blender'; box.style.cssText = 'position:fixed;top:90px;left:12px;display:flex;flex-direction:column;gap:6px;font:14px Georgia,serif;max-width:340px';
    const btn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:14px Georgia,serif;padding:6px 12px;border-radius:8px;border:1px solid #c8963a88;background:#2e1e12;color:#f1e4c4;cursor:pointer;text-align:left'; b.onclick = fn; box.append(b); return b; };
    for (const [i, name] of slots.map((sl, i) => [i, SUBJECTS[sl.id].sex]).filter(([, x]) => x)) {
        btn(`Export ${name} body (Blender)`, () => exportBody(i));
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.glb'; inp.style.display = 'none'; inp.onchange = () => inp.files[0] && importBody(i, inp.files[0]); box.append(inp);
        btn(`Import ${name} body (.glb)`, () => inp.click());
    }
    const m = document.createElement('div'); m.id = 'labmsg'; m.style.cssText = 'color:#e8dcb8;font-style:italic'; box.append(m);
    document.body.append(box);
}
window.__lab_io = { exportBody, importBody, pointTable, bodyMesh };
// the point editor (in the browser): the base bodies, reshaped by hand — beside it, from the same angle, the other side of the
// stage (the compare: the split view, edited body left, compare right) and the reference sheet; each can be shown or hidden
// (by slot: the base bodies on stage — e.g. the male base on the left and the boy on the right; ?edit= takes the slot, 0 or 1,
// or a sex for old links; ?layer= the layer to save into)
// A cast character in v2 built on the base body (Eldrin) can be edited too: its own override ("This character", saved in its
// cast file as look.sculpt.points) on top of the shared layers
const EDITABLE = slots.map((sl, i) => ({ id: i, name: SUBJECTS[sl.id].name, sex: SUBJECTS[sl.id].sex ?? (sl.ver === 'new' ? bodyMesh(i)?.userData.editSex : null), cast: !SUBJECTS[sl.id].sex ? sl.id : null })).filter(b => b.sex);
const castIO = id => ({
    read: async () => ((await fetch('/api/cast').then(r => r.json())).find(d => d.id === id)?.look?.sculpt?.points ?? {}),
    write: async points => {   // (the whole cast file, its look's sculpt part replaced)
        const def = (await fetch('/api/cast').then(r => r.json())).find(d => d.id === id); if (!def) return { ok: false, json: async () => ({ error: 'no cast file' }) };
        const sc = { ...(def.look.sculpt ?? {}), points }; if (!Object.keys(points).length) delete sc.points;
        if (Object.keys(sc).length) def.look.sculpt = sc; else delete def.look.sculpt;
        return fetch('/api/cast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def) });
    },
});
let cmpIdx = 1;
const split = () => !!(editor?.on && editor.showCompare);
const editor = EDITABLE.length && !LINEUP ? createPointEditor({ THREE, scene, hairless: HAIRLESS, camera, renderer, bodies: EDITABLE, alts: ALTS,
    getBody: i => { cmpIdx = 1 - i; const cast = EDITABLE.find(b => b.id === i)?.cast; return { table: posedTable(i), mesh: bodyMesh(i), alt: altOf[i], io: cast ? castIO(cast) : null, go: ({ alt, ...ch }) => go({ ...ch, [`alt${i}`]: alt ?? null }) }; },
    viewRect: () => ({ left: 0, top: 0, width: split() ? Math.floor(innerWidth / 2) : innerWidth, height: innerHeight }),
    onEnter: () => { models.forEach(m => { m.root.visible = false; }); floor.visible = false; for (const id of ['bar', 'labels', 'blender', 'top', 'lnkGame', 'lnkForge']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } },
    onExit: () => { models.forEach(m => { m.root.visible = true; }); floor.visible = true; for (const id of ['bar', 'labels', 'blender', 'top', 'lnkGame', 'lnkForge']) { const e = document.getElementById(id); if (e) e.style.display = ''; } resize(); } }) : null;
if (editor) {
    for (const b of EDITABLE) topBtn(`✎ Edit ${b.name}`, () => editor.enter(b.id), true);
    topBtn(HAIRLESS ? 'Hair: off' : 'Hair: on', () => go({ hair: HAIRLESS ? null : '0', edit: editor.on ? editor.state().who : null, layer: editor.on ? editor.state().layer : null }));
    const want = Q.get('edit'), wb = EDITABLE.find(b => String(b.id) === want) ?? EDITABLE.find(b => b.sex === want);
    if (wb) setTimeout(() => editor.enter(wb.id, Q.get('layer')), 50);
}
const cmpLabel = document.createElement('div');
cmpLabel.style.cssText = 'position:fixed;top:14px;left:50%;right:0;text-align:center;letter-spacing:.18em;color:#e8dcb8;pointer-events:none;display:none;font:15px Georgia,serif';
const divider = document.createElement('div'); divider.style.cssText = 'position:fixed;top:0;bottom:0;left:50%;width:2px;background:#c8963a66;pointer-events:none;display:none';
document.body.append(cmpLabel, divider);
window.__editor = editor;
let last = performance.now(), st = 0;
renderer.setAnimationLoop(now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; st = (st + dt) % 1.2;
    if (spin) yaw += dt * 0.5;
    const pose = editor?.on ? 'apose' : mode;   // (editing: the compare stands in the editor's A-pose)
    const speed = pose === 'walk' ? 1.8 : pose === 'run' ? 5.5 : 0;
    for (const m of models) {
        m.root.rotation.y = yaw; m.update(dt, { speed, sprinting: pose === 'run', strikeK: pose === 'strike' ? Math.min(1, st / 0.6) : null, strikeHand: 'R' });
        if (pose === 'apose' && m.rig) {   // the reference sheet's pose: arms out and down, legs a little apart, standing straight
            const { arms, legs, spine, head, hips } = m.rig;
            for (const [s, A] of [[1, arms.L], [-1, arms.R]]) { A.upper.rotation.set(0, 0, s * 0.48); A.fore.rotation.set(0, 0, s * 0.05); }
            for (const [s, L] of [[1, legs.L], [-1, legs.R]]) { L.thigh.rotation.set(0, 0, s * 0.07); L.shin.rotation.set(0, 0, -s * 0.07); }
            spine.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); hips.rotation.set(0, 0, 0); hips.position.y = 0.95;
        }
    }
    editor?.frame();
    const W = innerWidth, H = innerHeight, sp = split();
    cmpLabel.style.display = divider.style.display = sp ? '' : 'none';
    if (!sp) { if (camera.aspect !== W / H) { camera.aspect = W / H; camera.updateProjectionMatrix(); } renderer.setViewport(0, 0, W, H); renderer.render(scene, camera); return; }
    // the split view: the edited body on the left half, the compare on the right, through the same camera
    cmpLabel.textContent = `COMPARE — ${slotName(slots[cmpIdx]).toUpperCase()}`;
    const half = Math.floor(W / 2), c = models[cmpIdx].root, keep = [c.position.clone(), c.rotation.y];
    camera.aspect = half / H; camera.updateProjectionMatrix(); renderer.setScissorTest(true);
    renderer.setViewport(0, 0, half, H); renderer.setScissor(0, 0, half, H); renderer.render(scene, camera);
    editor.group.visible = false; c.position.set(0, 0, 0); c.rotation.y = 0; c.visible = true;
    renderer.setViewport(half, 0, W - half, H); renderer.setScissor(half, 0, W - half, H); renderer.render(scene, camera);
    editor.group.visible = true; c.position.copy(keep[0]); c.rotation.y = keep[1]; c.visible = false;
    renderer.setScissorTest(false);
});
