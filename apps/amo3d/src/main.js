import * as THREE from 'three';
// The real game's movement rules, imported unchanged from apps/amo.
import { MOVE, vigorMax, tickVigor, canSprint, spendHop, moveSpeed, hopLanding } from '@amo/systems/movementRules.js';
import { createWorld, heightAt, WATER } from './world.js';
import { createCharacter } from './character.js';

// amo works in pixels: a 16 px tile becomes 0.5 m here.
const PX = 32;
const AGILITY = 10;
const BASE_SPEED = 100 + AGILITY * 4;      // px/s — same formula as amo's Player.js
const PLAYER_R = 0.35;
const HOP_LIFT_M = (MOVE.HOP_LIFT / PX) * 2.5; // the sprite's 10 px lift, exaggerated to read in 3D

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1200);
const world = createWorld(scene);
const hero = createCharacter();
scene.add(hero.root);

addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// ---------- player state (stats shape = amo's) ----------
const maxVigor = vigorMax(AGILITY);
const player = {
    pos: new THREE.Vector3(0, heightAt(0, 0), 0),
    facing: 0,
    hop: null,
    speed: 0,
    stats: { vigor: maxVigor, maxVigor, vigorWinded: false, _vigorIdleMs: 0 },
};

// ---------- input ----------
const keys = new Set();
let wantHop = false;
addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) wantHop = true; }
    keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const held = (...codes) => codes.some(c => keys.has(c));

const cam = { yaw: Math.PI, pitch: 0.38, dist: 8, target: player.pos.clone().setY(player.pos.y + 1.4) };
let drag = null;
const canvas = renderer.domElement;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    cam.yaw -= (e.clientX - drag.x) * 0.006;
    cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - drag.y) * 0.004, 0.05, 1.35);
    drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    cam.dist = THREE.MathUtils.clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 3.5, 22);
}, { passive: false });

// ---------- simulation ----------
const dir = new THREE.Vector3();
const tryPos = new THREE.Vector3();
const angleDiff = (a, b) => ((((b - a) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const blockedPx = (px, py) => world.blockedAt(px / PX, py / PX, PLAYER_R); // amo's blockedAt(x, y) in pixels

function step(dt) {
    if (held('KeyQ')) cam.yaw += dt * 2;
    if (held('KeyE')) cam.yaw -= dt * 2;

    const fwd = held('KeyW', 'ArrowUp') - held('KeyS', 'ArrowDown');
    const side = held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft');
    // Camera-relative: forward is away from the camera, right = forward × up.
    dir.set(-Math.sin(cam.yaw) * fwd + Math.cos(cam.yaw) * side, 0, -Math.cos(cam.yaw) * fwd - Math.sin(cam.yaw) * side);
    const moving = dir.lengthSq() > 0;
    if (moving) dir.normalize();

    const s = player.stats;
    const sprinting = held('ShiftLeft', 'ShiftRight') && moving && !player.hop && canSprint(s);
    tickVigor(s, dt * 1000, sprinting);

    if (wantHop && !player.hop && spendHop(s)) {
        const hd = moving ? dir.clone() : new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing));
        const distPx = hopLanding({ x: player.pos.x * PX, y: player.pos.z * PX }, { x: hd.x, y: hd.z }, blockedPx);
        player.hop = { t: 0, from: player.pos.clone(), to: player.pos.clone().addScaledVector(hd, distPx / PX) };
        player.facing = Math.atan2(hd.x, hd.z);
    }
    wantHop = false;

    let lift = 0;
    if (player.hop) {
        const h = player.hop;
        h.t = Math.min(1, h.t + (dt * 1000) / MOVE.HOP_MS);
        player.pos.lerpVectors(h.from, h.to, h.t);
        lift = Math.sin(Math.PI * h.t) * HOP_LIFT_M;
        player.speed = h.from.distanceTo(h.to) / (MOVE.HOP_MS / 1000);
        if (h.t >= 1) player.hop = null;
    } else if (moving) {
        const wading = heightAt(player.pos.x, player.pos.z) < WATER - 0.05;
        const speed = moveSpeed(BASE_SPEED, 0, wading ? 0.6 : 1, sprinting) / PX;
        tryPos.copy(player.pos).addScaledVector(dir, speed * dt);
        world.resolve(tryPos, PLAYER_R);
        // Deep water and the world's rim are walls; slide along them axis by axis.
        const open = (x, z) => heightAt(x, z) >= WATER - 0.7 && Math.hypot(x, z) <= 98;
        if (!open(tryPos.x, tryPos.z)) {
            if (open(tryPos.x, player.pos.z)) tryPos.z = player.pos.z;
            else if (open(player.pos.x, tryPos.z)) tryPos.x = player.pos.x;
            else tryPos.copy(player.pos);
        }
        player.speed = tryPos.distanceTo(player.pos) / dt;
        player.pos.copy(tryPos);
        player.facing += angleDiff(player.facing, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 12);
    } else {
        player.speed = 0;
    }
    player.pos.y = heightAt(player.pos.x, player.pos.z);

    hero.root.position.copy(player.pos);
    hero.root.position.y += lift;
    hero.root.rotation.y = player.facing;
    hero.update(dt, { speed: player.speed, sprinting, hopK: player.hop ? player.hop.t : null });

    // Camera: smoothed follow, never under the ground.
    const k = 1 - Math.exp(-dt * 10);
    cam.target.lerp(tryPos.set(player.pos.x, player.pos.y + 1.4 + lift * 0.5, player.pos.z), k);
    const cp = Math.cos(cam.pitch) * cam.dist;
    camera.position.set(
        cam.target.x + Math.sin(cam.yaw) * cp,
        cam.target.y + Math.sin(cam.pitch) * cam.dist,
        cam.target.z + Math.cos(cam.yaw) * cp,
    );
    camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 0.6);
    camera.lookAt(cam.target);
}

// ---------- HUD ----------
const ui = {
    fill: document.getElementById('vigor-fill'), bar: document.getElementById('vigor'),
    num: document.getElementById('vigor-num'), speed: document.getElementById('speed'), fps: document.getElementById('fps'),
};
let frames = 0, fpsT = 0;
function hud(dt) {
    const s = player.stats;
    ui.fill.style.width = `${(s.vigor / s.maxVigor) * 100}%`;
    ui.bar.classList.toggle('winded', s.vigorWinded);
    ui.num.textContent = `${Math.round(s.vigor)} / ${s.maxVigor}${s.vigorWinded ? ' · winded' : ''}`;
    ui.speed.textContent = `${player.speed.toFixed(1)} m/s${player.hop ? ' · hop' : ''}`;
    frames++; fpsT += dt;
    if (fpsT > 0.5) { ui.fps.textContent = `${Math.round(frames / fpsT)} fps`; frames = 0; fpsT = 0; }
}

// ---------- loop ----------
const timer = new THREE.Timer();
renderer.setAnimationLoop(now => {
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    step(dt);
    world.update(timer.getElapsed(), player.pos, camera);
    hud(dt);
    renderer.render(scene, camera);
});

// Handle for headless checks.
window.__poc = { player, keys, cam, scene, renderer };
