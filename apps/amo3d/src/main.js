import * as THREE from 'three';
// The real game's rules, imported unchanged from apps/amo.
import { MOVE, tickVigor, canSprint, spendHop, moveSpeed, hopLanding } from '@amo/systems/movementRules.js';
import { PlayerStats } from '@amo/systems/PlayerStats.js';
import { createOutdoor, heightAt, WATER, WORLD_R } from './world.js';
import { createTower } from './tower.js';
import { createCharacter } from './character.js';
import { createFireballs, FIREBALL } from './fireball.js';

// amo works in pixels: a 16 px tile becomes 0.5 m here.
const PX = 32;
const PLAYER_R = 0.35;
const HOP_LIFT_M = (MOVE.HOP_LIFT / PX) * 2.5; // the sprite's 10 px lift, exaggerated to read in 3D
const GRAVITY = 22;
const CAST_TIME = 0.45, CAST_RELEASE = 0.38;

// ---- POC tuning (3D only — amo's own files are untouched) ----
MOVE.SPRINT_DRAIN_PER_S = 7;                                   // amo: 20 → ~14 s of sprint instead of 5
const SPELL_TUNING = { rangeMult: 3, speedMult: 1.6, radiusMult: 2 }; // 2D screen distances feel short in 3D

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 1200);
addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});

// ---------- the hero: an amo character sheet ----------
const stats = new PlayerStats();
stats.attributes.agility = 10;
stats.attributes.intelligence = 12;
stats.maxMana = 10 + stats.attributes.intelligence * 8;   // amo's formula, re-derived after setting INT
stats.mana = stats.maxMana;
stats.vigor = stats.maxVigor;
stats.learnSpell('fireball');
const BASE_SPEED = () => 100 + stats.attributes.agility * 4;   // px/s — amo's Player.js

const hero = createCharacter();
const player = {
    pos: new THREE.Vector3(), vy: 0, facing: 0, hop: null, cast: null, speed: 0, sprinting: false,
    invuln: 0, knock: new THREE.Vector3(), sinceHurt: 99, dead: null,
};
hero.root.rotation.order = 'YXZ';
const INVINCIBLE_S = 0.8;   // amo's Player.INVINCIBLE_DURATION (800 ms)

// ---------- getting hurt, falling, coming back ----------
function hurtPlayer(dmg, from) {
    if (player.dead) return false;
    if (player.hop && player.hop.t * MOVE.HOP_MS < MOVE.HOP_IFRAME_MS) {   // amo's hop i-frames: a dodge
        floater(player.pos.clone().setY(player.pos.y + 2.1), 'Dodged', '#9fd0ff');
        return false;
    }
    if (player.invuln > 0) return false;
    stats.health = Math.max(0, stats.health - dmg);
    player.invuln = INVINCIBLE_S;
    player.sinceHurt = 0;
    const away = new THREE.Vector3(player.pos.x - from.x, 0, player.pos.z - from.z).normalize();
    player.knock.copy(away).multiplyScalar(6);
    cam.shake = Math.max(cam.shake, 0.18);
    ui.hurt.style.opacity = 0.75;
    floater(player.pos.clone().setY(player.pos.y + 2.1), `-${dmg}`, '#ff5050');
    if (stats.health <= 0) {
        player.dead = { t: 0 };
        player.cast = null; player.hop = null;
        message('Eldrin falls…');
    }
    return true;
}
function onKill(xp, at) {
    const before = stats.level;
    stats.gainXp(xp);   // amo's PlayerStats: levels, skill and attribute points
    floater(at, `+${xp} XP`, '#c9b6ff');
    if (stats.level > before) banner(`Level ${stats.level}`);
}
function stepDead(dt) {
    const d = player.dead;
    d.t += dt;
    hero.root.rotation.x = -Math.min(1, d.t / 0.6) * Math.PI / 2 * 0.95;
    hero.root.position.y = player.pos.y + 0.12 * Math.min(1, d.t / 0.6);
    if (d.t > 2.6 && !transition) {
        transition = { t: 0, to: 'outdoor', spawn: 'start', swapped: false, revive: true };
    }
}
function revive() {
    player.dead = null;
    hero.root.rotation.x = 0;
    stats.health = stats.maxHealth;
    stats.mana = stats.maxMana;
    stats.vigor = stats.maxVigor;
    stats.vigorWinded = false;
    for (const h of maps.outdoor?.hittables ?? []) h.reset?.();
}

// ---------- maps ----------
const builders = { outdoor: createOutdoor, tower: createTower };
const maps = {};
let map = null;
let triggerLock = false;

const fireballs = createFireballs({
    PX, tuning: SPELL_TUNING,
    onDamage: (pos, dmg, killed, burning) => floater(pos, `${dmg}${burning ? ' 🔥' : ''}${killed ? ' ✝' : ''}`, killed ? '#ffd27a' : '#ff8a4a'),
    onShake: a => { cam.shake = Math.max(cam.shake, a); },
});

const cam = { yaw: Math.PI, pitch: 0.38, dist: 8, shake: 0, target: new THREE.Vector3() };

function enterMap(id, spawnName) {
    map = maps[id] ??= builders[id]();
    const sp = map.spawns[spawnName];
    player.pos.set(sp.x, sp.y ?? map.groundAt(sp.x, sp.z, 1e3), sp.z);
    Object.assign(player, { vy: 0, hop: null, cast: null, facing: sp.facing });
    map.scene.add(hero.root);
    fireballs.setScene(map.scene);
    Object.assign(cam, { yaw: sp.facing + Math.PI, pitch: map.camera.pitch, dist: map.camera.dist });
    cam.target.copy(player.pos).setY(player.pos.y + 1.4);
    triggerLock = true;
    maps.outdoor?.shadows?.setVisible(id === 'outdoor');
    banner(map.levelName ? `${map.name} — ${map.levelName(player.pos.y)}` : map.name);
}

// ---------- input ----------
const keys = new Set();
let wantHop = false, wantCast = false;
addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) wantHop = true; }
    if ((e.code === 'KeyF' || e.code === 'Digit1') && !e.repeat) wantCast = true;
    keys.add(e.code);
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
const held = (...codes) => codes.some(c => keys.has(c));

let drag = null;
const canvas = renderer.domElement;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
    if (e.button === 2) { wantCast = true; return; }
    drag = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    cam.yaw -= (e.clientX - drag.x) * 0.006;
    cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - drag.y) * 0.004, 0.05, 1.35);
    drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    cam.dist = THREE.MathUtils.clamp(cam.dist * (e.deltaY > 0 ? 1.1 : 0.9), 3.5, map.camera.maxDist);
}, { passive: false });

// ---------- simulation ----------
const dir = new THREE.Vector3();
const tryPos = new THREE.Vector3();
const tmp = new THREE.Vector3();
const angleDiff = (a, b) => ((((b - a) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const blockedPx = (px, py) => map.blockedAt(px / PX, py / PX, PLAYER_R, player.pos.y); // amo's blockedAt(x, y), pixels
const passable = (x, z) => map.terrain
    ? heightAt(x, z) >= WATER - 0.7 && Math.hypot(x, z) <= WORLD_R
    : !map.stepBlocked(x, z, player.pos.y);

function tryCast() {
    if (player.cast) return;
    if (!stats.canCastSpell('fireball')) return message('Fireball is not ready');
    const cost = stats.getSpellManaCost('fireball');
    if (stats.mana < cost) return message('Not enough mana');
    stats.mana -= cost;
    stats.startSpellCooldown('fireball');
    const aim = new THREE.Vector3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw));
    player.cast = { t: 0, fired: false, aim };
    player.facing = Math.atan2(aim.x, aim.z);
}

function step(dt) {
    const ms = dt * 1000;
    player.invuln = Math.max(0, player.invuln - dt);
    player.sinceHurt += dt;
    ui.hurt.style.opacity = Math.max(0, parseFloat(ui.hurt.style.opacity || 0) - dt * 1.5);
    if (player.dead) { stepDead(dt); updateCamera(dt, 0); return; }
    // Out of a fight for a while, Eldrin catches his breath (POC rule).
    if (player.sinceHurt > 6 && !(map.hittables ?? []).some(h => h.engaged)) stats.health = Math.min(stats.maxHealth, stats.health + 4 * dt);
    if (held('KeyQ')) cam.yaw += dt * 2;
    if (held('KeyE')) cam.yaw -= dt * 2;

    const fwd = held('KeyW', 'ArrowUp') - held('KeyS', 'ArrowDown');
    const side = held('KeyD', 'ArrowRight') - held('KeyA', 'ArrowLeft');
    dir.set(-Math.sin(cam.yaw) * fwd + Math.cos(cam.yaw) * side, 0, -Math.cos(cam.yaw) * fwd - Math.sin(cam.yaw) * side);
    const moving = dir.lengthSq() > 0;
    if (moving) dir.normalize();

    player.sprinting = held('ShiftLeft', 'ShiftRight') && moving && !player.hop && !player.cast && canSprint(stats);
    tickVigor(stats, ms, player.sprinting);
    stats.tickMana(ms);
    stats.tickSpellCooldowns(ms);

    if (wantCast) tryCast();
    wantCast = false;
    if (player.cast) {
        const c = player.cast;
        c.t += dt / CAST_TIME;
        player.facing += angleDiff(player.facing, Math.atan2(c.aim.x, c.aim.z)) * Math.min(1, dt * 20);
        if (!c.fired && c.t >= CAST_RELEASE) {
            c.fired = true;
            hero.root.updateMatrixWorld(true);
            const origin = hero.crystalWorld(new THREE.Vector3());
            // Aim to land at the end of its range (it's a targeted_aoe spell in amo).
            const range = (FIREBALL.range[0] / PX) * SPELL_TUNING.rangeMult;
            const drop = origin.y - player.pos.y;
            fireballs.cast(origin, tmp.copy(c.aim).setY(-drop / range).normalize(), 1, stats.attributes.intelligence);
        }
        if (c.t >= 1) player.cast = null;
    }

    if (wantHop && !player.hop && spendHop(stats)) {
        const hd = moving ? dir.clone() : new THREE.Vector3(Math.sin(player.facing), 0, Math.cos(player.facing));
        const distPx = hopLanding({ x: player.pos.x * PX, y: player.pos.z * PX }, { x: hd.x, y: hd.z }, blockedPx);
        player.hop = { t: 0, from: player.pos.clone(), to: player.pos.clone().addScaledVector(hd, distPx / PX), baseY: player.pos.y };
        player.facing = Math.atan2(hd.x, hd.z);
    }
    wantHop = false;

    let lift = 0;
    if (player.hop) {
        const h = player.hop;
        h.t = Math.min(1, h.t + ms / MOVE.HOP_MS);
        player.pos.x = h.from.x + (h.to.x - h.from.x) * h.t;
        player.pos.z = h.from.z + (h.to.z - h.from.z) * h.t;
        const g = map.groundAt(player.pos.x, player.pos.z, h.baseY);
        if (g !== null && g >= h.baseY - 0.6) h.baseY = g;
        player.pos.y = h.baseY;
        lift = Math.sin(Math.PI * h.t) * HOP_LIFT_M;
        player.speed = Math.hypot(h.to.x - h.from.x, h.to.z - h.from.z) / (MOVE.HOP_MS / 1000);
        if (h.t >= 1) player.hop = null;
    } else {
        if (moving) {
            const wading = !!map.wading?.(player.pos.x, player.pos.z);
            const speed = (moveSpeed(BASE_SPEED(), stats.fatigueFraction, wading ? 0.6 : 1, player.sprinting) / PX) * (player.cast ? 0.45 : 1);
            tryPos.copy(player.pos).addScaledVector(dir, speed * dt);
            map.resolve(tryPos, PLAYER_R);
            if (!passable(tryPos.x, tryPos.z)) {
                if (passable(tryPos.x, player.pos.z)) tryPos.z = player.pos.z;
                else if (passable(player.pos.x, tryPos.z)) tryPos.x = player.pos.x;
                else tryPos.copy(player.pos);
            }
            player.speed = Math.hypot(tryPos.x - player.pos.x, tryPos.z - player.pos.z) / dt;
            player.pos.x = tryPos.x; player.pos.z = tryPos.z;
            if (!player.cast) player.facing += angleDiff(player.facing, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 12);
        } else player.speed = 0;

        // Knockback from a sword hit, and never inside an enemy.
        if (player.knock.lengthSq() > 0.01) {
            tryPos.copy(player.pos).addScaledVector(player.knock, dt);
            map.resolve(tryPos, PLAYER_R);
            if (passable(tryPos.x, tryPos.z)) { player.pos.x = tryPos.x; player.pos.z = tryPos.z; }
            player.knock.multiplyScalar(Math.exp(-dt * 9));
        }
        for (const h of map.hittables ?? []) {
            if (h.kind !== 'shadow' || !h.alive) continue;
            const dx = player.pos.x - h.pos.x, dz = player.pos.z - h.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.8 && d > 1e-4) { player.pos.x = h.pos.x + (dx / d) * 0.8; player.pos.z = h.pos.z + (dz / d) * 0.8; }
        }

        // Ground: terrain snaps; indoors, step up small ledges and fall down stair wells.
        const g = map.groundAt(player.pos.x, player.pos.z, player.pos.y);
        if (map.terrain || (g !== null && g >= player.pos.y - 0.05)) { player.pos.y = g; player.vy = 0; }
        else {
            player.vy -= GRAVITY * dt;
            player.pos.y += player.vy * dt;
            if (g !== null && player.pos.y <= g) { player.pos.y = g; player.vy = 0; }
        }
        if (player.pos.y < -30) enterMap('tower', 'door');
    }

    hero.root.position.copy(player.pos);
    hero.root.position.y += lift;
    hero.root.rotation.y = player.facing;
    hero.update(dt, { speed: player.speed, sprinting: player.sprinting, hopK: player.hop ? player.hop.t : null, castK: player.cast ? player.cast.t : null });

    // Doors.
    let nearLabel = null, inside = false;
    for (const t of map.triggers) {
        const d = Math.hypot(player.pos.x - t.x, player.pos.z - t.z);
        const yOk = t.yMin === undefined || (player.pos.y >= t.yMin && player.pos.y <= t.yMax);
        if (!yOk) continue;
        if (d < t.r + 3) nearLabel = t.label;
        if (d < t.r) {
            inside = true;
            if (!triggerLock && !transition) transition = { t: 0, to: t.to, spawn: t.spawn, swapped: false };
        }
    }
    if (!inside) triggerLock = false;
    ui.prompt.textContent = nearLabel ? `⟶ ${nearLabel}` : '';
    ui.prompt.style.opacity = nearLabel ? 1 : 0;

    updateCamera(dt, lift);
}

function updateCamera(dt, lift) {
    // Camera: smoothed follow, never under the ground, a little shake on blasts.
    const k = 1 - Math.exp(-dt * 10);
    cam.target.lerp(tmp.set(player.pos.x, player.pos.y + 1.4 + lift * 0.5, player.pos.z), k);
    const cp = Math.cos(cam.pitch) * cam.dist;
    camera.position.set(cam.target.x + Math.sin(cam.yaw) * cp, cam.target.y + Math.sin(cam.pitch) * cam.dist, cam.target.z + Math.cos(cam.yaw) * cp);
    if (map.terrain) camera.position.y = Math.max(camera.position.y, heightAt(camera.position.x, camera.position.z) + 0.6);
    camera.lookAt(cam.target);
    if (cam.shake > 0.001) {
        camera.position.x += (Math.random() - 0.5) * cam.shake;
        camera.position.y += (Math.random() - 0.5) * cam.shake;
        cam.shake *= Math.exp(-dt * 9);
    }
}

// ---------- map transitions (fade out → swap → fade in) ----------
let transition = null;
function stepTransition(dt) {
    if (!transition) return false;
    transition.t += dt;
    if (!transition.swapped && transition.t >= 0.35) {
        const first = !maps[transition.to];
        if (first && !transition.loading) { transition.loading = true; ui.fadeText.textContent = 'Loading…'; return true; } // paint once first
        if (transition.revive) revive();
        enterMap(transition.to, transition.spawn);
        transition.swapped = true;
        transition.t = 0.35;
        ui.fadeText.textContent = '';
    }
    const o = transition.swapped ? Math.max(0, 1 - (transition.t - 0.35) / 0.4) : Math.min(1, transition.t / 0.35);
    ui.fade.style.opacity = o;
    if (transition.swapped && o <= 0) transition = null;
    return !!transition && !transition.swapped;
}

// ---------- HUD ----------
const $ = id => document.getElementById(id);
const ui = {
    vFill: $('vigor-fill'), vBar: $('vigor'), vNum: $('vigor-num'),
    mFill: $('mana-fill'), mNum: $('mana-num'), hFill: $('hp-fill'), hNum: $('hp-num'), lvl: $('lvl'), hurt: $('hurt'),
    speed: $('speed'), fps: $('fps'), slotCd: $('slot-cd'), slot: $('slot'), slotCost: $('slot-cost'),
    banner: $('banner'), prompt: $('prompt'), msg: $('msg'), fade: $('fade'), fadeText: $('fade-text'), floaters: $('floaters'),
};
let bannerT = 0, msgT = 0, lastLevel = '';
function banner(text) { ui.banner.textContent = text; ui.banner.style.opacity = 1; bannerT = 2.5; }
function message(text) { ui.msg.textContent = text; ui.msg.style.opacity = 1; msgT = 1.4; }
const floaters = [];
function floater(pos, text, color) {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.color = color;
    ui.floaters.append(el);
    floaters.push({ el, pos, t: 0 });
}
let frames = 0, fpsT = 0;
function hud(dt) {
    const s = stats;
    ui.vFill.style.width = `${(s.vigor / s.maxVigor) * 100}%`;
    ui.vBar.classList.toggle('winded', s.vigorWinded);
    ui.vNum.textContent = `${Math.round(s.vigor)} / ${s.maxVigor}${s.vigorWinded ? ' · winded' : ''}`;
    ui.hFill.style.width = `${(s.health / s.maxHealth) * 100}%`;
    ui.hNum.textContent = `${Math.ceil(s.health)} / ${s.maxHealth}`;
    ui.lvl.textContent = `Level ${s.level} · ${s.xp} / ${s.xpToNextLevel} XP`;
    ui.mFill.style.width = `${(s.mana / s.maxMana) * 100}%`;
    ui.mNum.textContent = `${Math.round(s.mana)} / ${s.maxMana}${s.fatigueFraction > 0 ? ` · fatigue ${Math.round(s.fatigueFraction * 100)}%` : ''}`;
    ui.speed.textContent = `${player.speed.toFixed(1)} m/s${player.hop ? ' · hop' : ''}${player.sprinting ? ' · sprint' : ''}`;
    const cd = s.spellCooldowns.fireball ?? 0, cdMax = FIREBALL.cooldown[0];
    ui.slotCd.style.height = `${Math.min(1, cd / cdMax) * 100}%`;
    ui.slot.classList.toggle('dry', s.mana < s.getSpellManaCost('fireball'));
    ui.slotCost.textContent = s.getSpellManaCost('fireball');

    if (map.levelName) {
        const lv = map.levelName(player.pos.y);
        if (lv !== lastLevel && !player.hop && player.vy === 0) { if (lastLevel) banner(`${map.name} — ${lv}`); lastLevel = lv; }
    } else lastLevel = '';
    if ((bannerT -= dt) <= 0) ui.banner.style.opacity = 0;
    if ((msgT -= dt) <= 0) ui.msg.style.opacity = 0;

    for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.t += dt;
        tmp.copy(f.pos).setY(f.pos.y + f.t * 0.8).project(camera);
        f.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -50%) scale(${1 + Math.max(0, 0.3 - f.t)})`;
        f.el.style.opacity = Math.max(0, 1 - Math.max(0, f.t - 0.7) / 0.6);
        if (f.t > 1.3 || tmp.z > 1) { f.el.remove(); floaters.splice(i, 1); }
    }
    frames++; fpsT += dt;
    if (fpsT > 0.5) { ui.fps.textContent = `${Math.round(frames / fpsT)} fps`; frames = 0; fpsT = 0; }
}

// ---------- loop ----------
enterMap('outdoor', 'start');
const timer = new THREE.Timer();
let simT = 0;
function tick(dt) {
    simT += dt;
    const frozen = stepTransition(dt);
    if (!frozen) step(dt);
    map.update(simT, dt, { player, camera, fx: map.fx ?? fireballs, hurtPlayer, floater, onKill });
    fireballs.update(dt, map, map.hittables);
    hud(dt);
}
renderer.setAnimationLoop(now => {
    timer.update(now);
    tick(Math.max(0, Math.min(timer.getDelta(), 0.05)));   // the first delta can be negative
    renderer.render(map.scene, camera);
});
// Headless checks: run the game logic for `seconds` in fixed 1/30 s steps, without drawing.
const advance = seconds => { for (let i = 0; i < Math.round(seconds * 30); i++) tick(1 / 30); return true; };

// Handle for headless checks.
window.__poc = { player, stats, hurtPlayer, advance, keys, cam, maps, enterMap: (id, sp) => enterMap(id, sp), get map() { return map; }, cast: () => { wantCast = true; } };
