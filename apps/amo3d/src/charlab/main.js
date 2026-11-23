// The Character Lab (2026-11-22): the classic and the v2 model of a character side by side, turning on a plain grey stage
// (like the reference sheet, docs/3d/characters/reference_v2.jpg), in idle / walk / run / strike. ?who=seraphina
import * as THREE from 'three';
import { createCharacter } from '../content/models/character.js';
import { settings } from '../engine/settings.js';
import seraphina from '../content/cast/seraphina.json';

const CAST = { seraphina }, who = new URLSearchParams(location.search).get('who') || 'seraphina';
const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace; document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x3c3c40);
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
scene.add(new THREE.HemisphereLight(0xdedcf0, 0x404048, 1.3));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(2, 4, 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x46464c, roughness: 1 })); floor.receiveShadow = true; scene.add(floor);

const BASE = who === 'base';   // the base bodies: male and female, no clothes, empty hands
const baseLook = (preset, v2) => ({ v2, body: { preset, race: 'human', skin: '#e2b590' }, parts: { right: { id: 'none' }, left: { id: 'none' } } });
const look = BASE ? null : JSON.parse(JSON.stringify(CAST[who].look)); if (look) look.parts.right = { id: 'spear' };
const make = (mode, lk = look) => { settings.charModels = mode; const c = createCharacter(lk); scene.add(c.root); return c; };
const models = BASE ? [make('new', baseLook('adult_male', 'base_male')), make('new', baseLook('adult_female', 'base_female'))] : [make('classic'), make('new')];
if (BASE) document.getElementById('labels').innerHTML = '<span>MALE BASE MESH</span><span>FEMALE BASE MESH</span>';
models[0].root.position.x = -0.75; models[1].root.position.x = 0.75;
let mode = 'idle', spin = true, yaw = 0.35;
const bar = document.getElementById('bar');
for (const [id, label] of [['idle', 'Idle'], ['walk', 'Walk'], ['run', 'Run'], ['strike', 'Strike'], ['spin', 'Turn']]) {
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
window.__lab = { tris: () => models.map(m => { let t = 0; m.root.traverse(o => { if (o.isMesh && o.visible && o.userData.v2) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); return Math.round(t); }).join(' / '), setYaw: v => { yaw = v; spin = false; refresh(); }, setMode: v => { mode = v; refresh(); }, zoom: (d, y, x = 0) => { camera.position.set(x, y, d); camera.lookAt(x, y - 0.05, 0); } };
let last = performance.now(), st = 0;
renderer.setAnimationLoop(now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; st = (st + dt) % 1.2;
    if (spin) yaw += dt * 0.5;
    const speed = mode === 'walk' ? 1.8 : mode === 'run' ? 5.5 : 0;
    for (const m of models) { m.root.rotation.y = yaw; m.update(dt, { speed, sprinting: mode === 'run', strikeK: mode === 'strike' ? Math.min(1, st / 0.6) : null, strikeHand: 'R' }); }
    renderer.render(scene, camera);
});
