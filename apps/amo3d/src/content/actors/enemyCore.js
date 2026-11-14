// Shared enemy core: everything an enemy does with amo's rules, apart from its body and its AI.
//   stats      — ENEMY_TYPES[type] (health, damage, speed, sight, attackRange, xpReward, lootTable)
//   hit        — affinities (fire etc.), statuses (STATUS_DEFS: dots, stuns, slows, damageTakenMult)
//   death      — XP (onKill) and the lootTable roll (dropLoot), then a respawn timer
//   nameplate  — name + health bar over its head while it is engaged or hurt
// Actors (wolf.js…) supply a model, an AI step and an animation, and call these.
import * as THREE from 'three';
import { enemies, enemyAffinities, statuses } from '@rules';

const { ENEMY_TYPES } = enemies;
const { affinityMult, affinityOf } = enemyAffinities;
const { STATUS_DEFS } = statuses;
export const PX = 32;

let plateLayer = null;
const allPlates = [];
// On a map change: blank every plate (only the current map's actors update theirs).
export function hideAllPlates() { for (const p of allPlates) p.style.opacity = 0; }
function plates() {
    if (!plateLayer) {
        plateLayer = document.createElement('div');
        plateLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
        document.body.append(plateLayer);
    }
    return plateLayer;
}
export function setPlatesVisible(v) { if (plateLayer) plateLayer.style.display = v ? '' : 'none'; }

export function createEnemyCore({ type, name, pos, rng = Math.random, respawnS = 20, def = null }) {
    const DEF = def ?? ENEMY_TYPES[type];   // def: a creature amo keeps outside ENEMY_TYPES (its boss)
    const family = affinityOf(type);
    const s = { hp: DEF.health, fx: {}, dead: false, deadT: 0, flash: 0, seen: false, engaged: false };
    let lastCtx = null;

    const plate = document.createElement('div');
    plate.style.cssText = 'position:absolute;left:0;top:0;opacity:0;transition:opacity .3s;white-space:nowrap;text-align:center';
    const label = document.createElement('div');
    label.style.cssText = 'font:13px Georgia,serif;color:#f0e6d2;text-shadow:0 1px 3px #000;letter-spacing:.06em';
    label.textContent = name + (family.family ? ` · ${family.family[0].toUpperCase()}${family.family.slice(1)}` : '');
    const barBox = document.createElement('div');
    barBox.style.cssText = 'width:100px;height:6px;margin:3px auto 0;border:1px solid #eee6d288;border-radius:4px;background:#0009;overflow:hidden';
    const bar = document.createElement('div');
    bar.style.cssText = 'height:100%;width:100%;background:linear-gradient(90deg,#8a2a1a,#e06a4a)';
    barBox.append(bar);
    plate.append(label, barBox);
    plates().append(plate);
    allPlates.push(plate);

    const fxMult = field => Object.keys(s.fx).reduce((m, id) => m * (STATUS_DEFS[id]?.[field] ?? 1), 1);
    const stunned = () => Object.keys(s.fx).some(id => STATUS_DEFS[id]?.stunned);

    function addStatus(id, ms) {
        const def = STATUS_DEFS[id];
        if (!def || family.immune.includes(id)) return;
        const cur = s.fx[id];
        s.fx[id] = { left: Math.max(cur?.left ?? 0, (ms ?? def.duration) / 1000), tick: cur?.tick ?? 0 };
    }

    function die(ctx) {
        if (s.dead) return;
        s.dead = true; s.deadT = 0; s.hp = 0; s.fx = {};
        ctx?.onKill?.(DEF.xpReward, pos.clone().setY(pos.y + 1.6), type);
        ctx?.dropLoot?.(DEF.lootTable, pos.clone(), rng);
    }

    // element: the hit's element for amo's affinity table (fireballs pass burnMs → 'fire').
    function hit(dmg, from, burnMs, ctx = lastCtx, status = null, element = burnMs ? 'fire' : null) {
        if (s.dead) return 'handled';
        const amount = Math.max(1, Math.round(dmg * (element ? affinityMult(type, element) : 1) * fxMult('damageTakenMult')));
        if (burnMs) addStatus('burning', burnMs);
        if (status) addStatus(status.id, status.ms);
        s.hp -= amount;
        s.flash = 0.2;
        s.seen = true;
        ctx?.floater(pos.clone().setY(pos.y + 1.5), `${amount}${burnMs ? ' 🔥' : ''}`, '#ff8a4a');
        if (s.hp <= 0) die(ctx);
        return 'handled';
    }

    // Ticks statuses; returns true while the body should keep updating.
    function tick(dt, ctx) {
        lastCtx = ctx;
        s.flash = Math.max(0, s.flash - dt);
        if (s.dead) { s.deadT += dt; return false; }
        for (const [id, f] of Object.entries(s.fx)) {
            const B = STATUS_DEFS[id];
            f.left -= dt;
            if (B?.dotDmg) {
                f.tick += dt * 1000;
                if (f.tick >= B.dotInterval) {
                    f.tick -= B.dotInterval;
                    s.hp -= B.dotDmg;
                    ctx.floater(pos.clone().setY(pos.y + 1.4), `${B.dotDmg}`, `#${(B.tint ?? 0xffb070).toString(16).padStart(6, '0')}`);
                    if (s.hp <= 0) { die(ctx); return false; }
                }
            }
            if (f.left <= 0) delete s.fx[id];
        }
        if (s.fx.burning && rng() < dt * 25) ctx.fx.fire.emit({ x: pos.x + (rng() - 0.5) * 0.5, y: pos.y + 0.5 + rng() * 0.4, z: pos.z + (rng() - 0.5) * 0.5,
            vx: 0, vy: 1 + rng(), vz: 0, life: 0.45, size: [0.3, 0.05], c0: [1, 0.6, 0.15, 0.9], c1: [0.8, 0.15, 0.02, 0] });
        return true;
    }

    const tmp = new THREE.Vector3();
    function updatePlate(camera, height, hide = false) {
        const show = !hide && !s.dead && (s.engaged || (s.seen && s.hp < DEF.health));
        tmp.set(pos.x, pos.y + height, pos.z).project(camera);
        const on = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        plate.style.opacity = show && on ? 1 : 0;
        plate.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
        bar.style.width = `${Math.max(0, s.hp / DEF.health) * 100}%`;
    }

    function revive() { Object.assign(s, { hp: DEF.health, fx: {}, dead: false, deadT: 0, seen: false, engaged: false }); }

    return { DEF, s, hit, tick, die, addStatus, fxMult, stunned, updatePlate, revive, respawnS, get lastCtx() { return lastCtx; } };
}
