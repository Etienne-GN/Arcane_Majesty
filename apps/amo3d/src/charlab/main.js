// The Character Lab (2026-11-22): the classic and the v2 model of a character side by side, turning on a plain grey stage
// (like the reference sheet, docs/3d/characters/reference_v2.jpg), in idle / walk / run / strike. ?who=seraphina
import * as THREE from 'three';
import { createCharacter } from '../content/models/character.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createPointEditor } from './pointEditor.js';
import { settings } from '../engine/settings.js';
import seraphina from '../content/cast/seraphina.json';
import eldrin from '../content/cast/eldrin.json';

const CAST = { seraphina, eldrin }, who = new URLSearchParams(location.search).get('who') || 'seraphina';
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3c3c40);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
scene.add(new THREE.HemisphereLight(0xdedcf0, 0x404048, 1.3));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x46464c, roughness: 1 })); floor.receiveShadow = true; scene.add(floor);

const BASE = who === 'base';   // the base bodies: male and female, no clothes, empty hands
const baseLook = (preset, v2) => ({ v2, body: { preset, race: 'human', skin: '#e2b590' }, parts: { right: { id: 'none' }, left: { id: 'none' } } });
const look = BASE ? null : JSON.parse(JSON.stringify(CAST[who].look)); if (look && who === 'seraphina') look.parts.right = { id: 'spear' };
const make = (mode, lk = look) => { settings.charModels = mode; const c = createCharacter(lk); scene.add(c.root); return c; };
const models = BASE ? [make('new', baseLook('adult_male', 'base_male')), make('new', baseLook('adult_female', 'base_female'))] : [make('classic'), make('new')];
if (BASE) document.getElementById('labels').innerHTML = '<span>MALE BASE MESH</span><span>FEMALE BASE MESH</span>';
if (BASE) document.getElementById('labels').style.top = '52px';
else document.getElementById('labels').innerHTML = `<span>${CAST[who].name.toUpperCase()} — CLASSIC</span><span>${CAST[who].name.toUpperCase()} — NEW (v2)</span>`;
models[0].root.position.x = -0.75; models[1].root.position.x = 0.75;
let mode = BASE ? 'apose' : 'idle', spin = !BASE, yaw = BASE ? 0 : 0.35;
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
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); const d = camera.aspect < 1 ? 9 : 6; camera.position.set(0, 1.1, d); camera.lookAt(0, 0.95, 0); }
addEventListener('resize', resize); resize();
window.__lab = { ground: () => models.map(m => [-0.4, -0.45, -0.48].map(y => m.rig.legs.L.shin.localToWorld(new THREE.Vector3(0, y, 0)).y.toFixed(3)).join(',')).join(' / '), plain: () => { floor.visible = false; scene.background.set(0x3b3b3b); for (const id of ['bar', 'labels']) document.getElementById(id).style.display = 'none'; }, solo: i => { models.forEach((m, j) => { m.root.visible = j === i; m.root.position.x = 0; }); }, tris: () => models.map(m => { let t = 0; m.root.traverse(o => { if (o.isMesh && o.visible && o.userData.v2) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return Math.round(t); }).join(' / '), setYaw: v => { yaw = v; spin = false; refresh(); }, setMode: v => { mode = v; refresh(); }, zoom: (d, y, x = 0) => { camera.position.set(x, y, d); camera.lookAt(x, y - 0.05, 0); } };
// ---- the Blender round trip (docs/3d/characters/BLENDER.md): Export a base body as .glb (one vertex per point, its id in
// the UV's u), edit it in Blender moving points only, Import the .glb back: each moved point is saved by its key ----
function bodyMesh(i) { let sm = null; models[i].root.traverse(o => { if (!sm && o.isSkinnedMesh && o.userData.editKeys) sm = o; }); return sm; }
function pointTable(sm) {   // unique points (by key) in vertex order, their current positions and the triangles
    const keys = sm.userData.editKeys, pos = sm.geometry.attributes.position, col = sm.geometry.attributes.color, ids = new Map(), P = [], C = [], idx = [];
    for (let v = 0; v < keys.length; v++) {
        let k = ids.get(keys[v]);
        if (k === undefined) { k = ids.size; ids.set(keys[v], k); P.push(pos.getX(v), pos.getY(v), pos.getZ(v)); C.push(col.getX(v), col.getY(v), col.getZ(v)); }
        idx.push(k);
    }
    return { keys: [...ids.keys()], P, C, idx };
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
    const cur = await (await fetch(`/api/v2edits?sex=${sex}`)).json(), edits = { ...cur };
    let moved = 0;
    for (const [id, [x, y, z, n]] of sum) {
        const nx = x / n, ny = y / n, nz = z / n, k = T.keys[id];
        if (Math.hypot(nx - T.P[id * 3], ny - T.P[id * 3 + 1], nz - T.P[id * 3 + 2]) < 1e-4) continue;
        edits[k] = [+nx.toFixed(5), +ny.toFixed(5), +nz.toFixed(5)]; moved++;
    }
    if (!moved) return say(`No point moved (${sum.size} points read).`);
    const r = await fetch('/api/v2edits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sex, edits }) });
    say(r.ok ? `Saved ${moved} moved points for the ${sex} body — reloading…` : `Save refused: ${(await r.json().catch(() => ({}))).error ?? r.status}`);
    if (r.ok) setTimeout(() => location.reload(), 900);
}
if (BASE) {
    const box = document.createElement('div'); box.id = 'blender'; box.style.cssText = 'position:fixed;top:44px;left:12px;display:flex;flex-direction:column;gap:6px;font:14px Georgia,serif;max-width:340px';
    const btn = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:14px Georgia,serif;padding:6px 12px;border-radius:8px;border:1px solid #c8963a88;background:#2e1e12;color:#f1e4c4;cursor:pointer;text-align:left'; b.onclick = fn; box.append(b); return b; };
    for (const [i, name] of [[0, 'male'], [1, 'female']]) {
        btn(`Export ${name} body (Blender)`, () => exportBody(i));
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.glb'; inp.style.display = 'none'; inp.onchange = () => inp.files[0] && importBody(i, inp.files[0]); box.append(inp);
        btn(`Import ${name} body (.glb)`, () => inp.click());
    }
    const m = document.createElement('div'); m.id = 'labmsg'; m.style.cssText = 'color:#e8dcb8;font-style:italic'; box.append(m);
    document.body.append(box);
}
window.__lab_io = { exportBody, importBody, pointTable, bodyMesh };
// the point editor (in the browser): the base bodies, reshaped by hand
const editor = BASE ? createPointEditor({ THREE, scene, camera, renderer, getBody: s => ({ table: pointTable(bodyMesh(s === 'female' ? 1 : 0)) }),
    onEnter: () => { models.forEach(m => { m.root.visible = false; }); floor.visible = false; for (const id of ['bar', 'labels', 'blender']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } },
    onExit: () => { models.forEach(m => { m.root.visible = true; }); floor.visible = true; for (const id of ['bar', 'labels', 'blender']) { const e = document.getElementById(id); if (e) e.style.display = ''; } resize(); } }) : null;
if (editor) {
    const b = document.createElement('button'); b.textContent = '✎ Edit points (face, body)';
    b.style.cssText = 'position:fixed;top:12px;left:12px;font:15px Georgia,serif;padding:7px 14px;border-radius:9px;border:1px solid #f3d88b;background:#8a6a2a;color:#fff4d8;cursor:pointer;z-index:5';
    b.onclick = () => editor.enter('male'); document.body.append(b);
    const want = new URLSearchParams(location.search).get('edit'); if (want) setTimeout(() => editor.enter(want), 50);
}
window.__editor = editor;
let last = performance.now(), st = 0;
renderer.setAnimationLoop(now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; st = (st + dt) % 1.2;
    if (spin) yaw += dt * 0.5;
    const speed = mode === 'walk' ? 1.8 : mode === 'run' ? 5.5 : 0;
    for (const m of models) {
        m.root.rotation.y = yaw; m.update(dt, { speed, sprinting: mode === 'run', strikeK: mode === 'strike' ? Math.min(1, st / 0.6) : null, strikeHand: 'R' });
        if (mode === 'apose' && m.rig) {   // the reference sheet's pose: arms out and down, legs a little apart, standing straight
            const { arms, legs, spine, head, hips } = m.rig;
            for (const [s, A] of [[1, arms.L], [-1, arms.R]]) { A.upper.rotation.set(0, 0, s * 0.48); A.fore.rotation.set(0, 0, s * 0.05); }
            for (const [s, L] of [[1, legs.L], [-1, legs.R]]) { L.thigh.rotation.set(0, 0, s * 0.07); L.shin.rotation.set(0, 0, -s * 0.07); }
            spine.rotation.set(0, 0, 0); head.rotation.set(0, 0, 0); hips.rotation.set(0, 0, 0); hips.position.y = 0.95;
        }
    }
    editor?.frame();
    renderer.render(scene, camera);
});
