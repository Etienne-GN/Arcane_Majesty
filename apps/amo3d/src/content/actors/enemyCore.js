import { sfx } from '../../engine/sfx.js';
// Shared enemy core: everything an enemy does with amo's rules, apart from its body and its AI.
//   stats      — ENEMY_TYPES[type] (health, damage, speed, sight, attackRange, xpReward, lootTable)
//   hit        — affinities (fire etc.), statuses (STATUS_DEFS: dots, stuns, slows, damageTakenMult)
//   death      — XP (onKill) and the lootTable roll (dropLoot), then a respawn timer
//   nameplate  — name + health bar over its head while it is engaged or hurt
// Actors (wolf.js…) supply a model, an AI step and an animation, and call these.
import * as THREE from 'three';
import { enemies, enemyAffinities, statuses, elites as EL } from '@rules';
import { settings } from '../../engine/settings.js';

const { ENEMY_TYPES } = enemies;
const { affinityMult, affinityOf } = enemyAffinities;
const { STATUS_DEFS } = statuses;
export const PX = 32;

let plateLayer = null;
const allPlates = [];
// On a map change: blank every plate (only the current map's actors update theirs).
export function hideAllPlates() { for (const p of allPlates) p.style.opacity = 0; }
// Once a frame, after the current map has updated: any plate whose creature did not update this frame (one
// left behind on another map) is hidden.
let plateFrame = 0;
export function sweepPlates() { for (const p of allPlates) if (p._f !== plateFrame && p.style.opacity !== '0') p.style.opacity = 0; plateFrame++; }
function plates() {
    if (!plateLayer) {
        plateLayer = document.createElement('div');
        plateLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
        document.body.append(plateLayer);
    }
    return plateLayer;
}
export function setPlatesVisible(v) { if (plateLayer) plateLayer.style.display = v ? '' : 'none'; }

// elite: { affixes, rareDrop } — amo's elites (data/elites.js): eliteStats (×2.5 health, ×1.4 damage, ×3 XP),
// a second loot roll and a rare regional drop, a gold nameplate; swift = permanently hastened, warded = a mana
// ward every 20 s, vampiric = heals 30% of what it deals (onDealt); arcane fires a bolt every 6 s at whoever it fights, thorned turns 15% of every blow back on the striker (amo's
// 3D creatures have no spell kits yet).
export function createEnemyCore({ type, name, pos, rng = Math.random, respawnS = 20, def = null, elite = null }) {
    const BASE = def ?? ENEMY_TYPES[type];   // def: a creature amo keeps outside ENEMY_TYPES (its boss)
    const DEF = elite ? { ...BASE, ...EL.eliteStats({ health: BASE.health, damage: BASE.damage, xpReward: BASE.xpReward, goldDrop: BASE.goldDrop ?? 0 }) } : BASE;
    const family = affinityOf(type);
    const s = { hp: DEF.health, fx: {}, dead: false, deadT: 0, flash: 0, seen: false, engaged: false, by: new Set(), byMe: false };
    let lastCtx = null;

    const plate = document.createElement('div');
    plate.style.cssText = 'position:absolute;left:0;top:0;opacity:0;transition:opacity .3s;white-space:nowrap;text-align:center';
    const label = document.createElement('div');
    label.style.cssText = 'font:calc(15px * var(--ui, 1)) Georgia,serif;color:#f0e6d2;text-shadow:0 1px 3px #000;letter-spacing:.06em';
    label.textContent = (elite ? `Elite ${name} — ${elite.affixes.map(a => EL.AFFIX_LABELS[a]).join(', ')}` : name) + (family.family ? ` · ${family.family[0].toUpperCase()}${family.family.slice(1)}` : '');
    if (elite) { label.style.color = '#ffd76a'; }
    const barBox = document.createElement('div');
    barBox.style.cssText = `width:${elite ? 130 : 100}px;height:6px;margin:3px auto 0;border:1px solid ${elite ? '#ffd76a' : '#eee6d288'};border-radius:4px;background:#0009;overflow:hidden`;
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

    // Online (Phase 6.3): the map's host runs this creature; everyone else holds a puppet (net.puppet) whose hits
    // go to the host (net.sendHit). The host credits each player who hurt it (s.by); its own reward needs its own blow.
    const net = { puppet: false, networked: false, sendHit: null, onDied: null };
    function reward(ctx) {
        ctx?.onKill?.(DEF.xpReward, pos.clone().setY(pos.y + 1.6), type, { isElite: !!elite });
        ctx?.dropLoot?.(DEF.lootTable, pos.clone(), rng);
        if (elite) { ctx?.dropLoot?.(DEF.lootTable, pos.clone(), rng); if (elite.rareDrop) ctx?.dropLoot?.([{ id: elite.rareDrop, chance: 1 }], pos.clone(), rng); }
    }
    function die(ctx) {
        if (s.dead) return;
        s.dead = true; s.deadT = 0; s.hp = 0; s.fx = {};
        if (s.byMe || !net.networked) reward(ctx);
        if (net.networked) net.onDied?.([...s.by]);
    }

    // element: the hit's element for amo's affinity table (fireballs pass burnMs → 'fire').
    function hit(dmg, from, burnMs, ctx = lastCtx, status = null, element = burnMs ? 'fire' : null, attacker = null) {
        if (s.dead) return 'handled';
        if (net.puppet) {   // not ours to run: the host applies it (and shows the true health)
            net.sendHit?.({ dmg, burnMs, status, element, from: from ? { x: from.x, y: from.y, z: from.z } : null });
            s.flash = 0.2; s.seen = true;
            return 'handled';
        }
        if (attacker) s.by.add(attacker); else s.byMe = true;
        if (elite?.affixes.includes('thorned') && !attacker && ctx?.hurtPlayer) {   // thorns: part of your blow comes back
            const back = Math.max(1, Math.round(dmg * 0.15));
            if (from && Math.hypot(from.x - pos.x, from.z - pos.z) < 4) ctx.hurtPlayer(back, pos);
        }
        const amount = settings.god && !attacker ? 9999 : Math.max(1, Math.round(dmg * (element ? affinityMult(type, element) : 1) * fxMult('damageTakenMult')));   // god mode: every blow of yours lands for 9999
        if (burnMs) addStatus('burning', burnMs);
        if (status) addStatus(status.id, status.ms);
        s.hp -= amount;
        s.flash = 0.2;
        sfx.hit();
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
        if (elite?.affixes.includes('arcane') && s.engaged && !net.puppet && (s.boltT = (s.boltT ?? 4) - dt) <= 0) {   // an arcane bolt at the player
            s.boltT = 6;
            const P = ctx.player.pos;
            if (!ctx.player.dead && Math.hypot(P.x - pos.x, P.z - pos.z) < 14) {
                ctx.fx?.fire?.emit?.({ x: pos.x, y: pos.y + 1.6, z: pos.z, vx: (P.x - pos.x) * 2, vy: 1, vz: (P.z - pos.z) * 2, life: 0.4, size: [0.5, 0.1], c0: [0.6, 0.4, 1, 1], c1: [0.3, 0.1, 1, 0] });
                ctx.floater?.(P.clone().setY(P.y + 2.4), 'arcane bolt', '#b89aff');
                ctx.hurtPlayer(Math.round(DEF.damage * 0.6), pos);
            }
        }
        if (elite) {
            if (elite.affixes.includes('swift') && !s.fx.hastened) s.fx.hastened = { left: Infinity, tick: 0 };
            if (elite.affixes.includes('warded') && (s.wardT = (s.wardT ?? 0) - dt) <= 0) { s.wardT = 20; addStatus('mana_ward'); }
        }
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
        plate._f = plateFrame;
        const show = !hide && !s.dead && (s.engaged || (s.seen && s.hp < DEF.health));
        tmp.set(pos.x, pos.y + height, pos.z).project(camera);
        const on = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        plate.style.opacity = show && on ? 1 : 0;
        plate.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
        bar.style.width = `${Math.max(0, s.hp / DEF.health) * 100}%`;
    }

    function revive() { Object.assign(s, { hp: DEF.health, fx: {}, dead: false, deadT: 0, seen: false, engaged: false, wardT: 0, by: new Set(), byMe: false }); }
    // A blow it landed: vampiric elites drink 30% of it back (amo Enemy).
    function onDealt(dmg) { if (elite?.affixes.includes('vampiric') && !s.dead) s.hp = Math.min(DEF.health, s.hp + Math.round(dmg * 0.3)); }

    return { DEF, s, hit, tick, die, addStatus, fxMult, stunned, updatePlate, revive, respawnS, elite, onDealt, net, reward, get lastCtx() { return lastCtx; } };
}
