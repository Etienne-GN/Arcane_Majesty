import { sfx } from '../engine/sfx.js';
import { settings } from '../engine/settings.js';
// The player: an amo character sheet (PlayerStats) driving a 3D body. Movement, Vigor, sprint
// and hop come from amo's movementRules; the fireball from amo's SPELLS; getting hurt uses amo's
// 800 ms invulnerability and the hop's i-frames.
import * as THREE from 'three';
import { movementRules, weapons, mastery, items as itemRules, styles as styleRules, statuses } from '@rules';

const { STATUS_DEFS } = statuses;
import { FIREBALL, CASTABLE, isBolt } from './fireball.js';
import { INCANT } from './spectacle.js';
import { spells as spellRules } from '@rules';

const { MOVE, tickVigor, canSprint, spendHop, moveSpeed, hopLanding } = movementRules;
const { WEAPON_TYPES, typeOf } = weapons;
const STRIKE_TIME = 0.32, STRIKE_HIT = 0.42;
// The weapon in the main hand (Eldrin's own staff when it is empty); bows bash like fists until archery.
const strikeType = stats => {
    const id = stats.equipment.weapon;
    if (!id) return 'staff';
    const t = typeOf(itemRules.ITEMS[id]);
    return t === 'bow' || t === 'crossbow' ? 'fists' : t;
};
const reachOf = type => (WEAPON_TYPES[type].reach / 32) * 2 + 0.4;   // 3D tuning, like the fireball's range

export const PX = 32;                          // amo pixels per metre (a 16 px tile = 0.5 m)
const PLAYER_R = 0.35;
const HOP_LIFT_M = (MOVE.HOP_LIFT / PX) * 2.5; // the sprite's 10 px lift, exaggerated to read in 3D
const GRAVITY = 22;
const CAST_TIME = 0.45, CAST_RELEASE = 0.38;
const INVINCIBLE_S = 0.8;                      // amo's Player.INVINCIBLE_DURATION (800 ms)

const angleDiff = (a, b) => ((((b - a) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

export function createPlayer({ hooks = {}, name = 'Eldrin', stats, hero, cam, world, hud, fireballs, spellTuning, auraFx = null, blinkFx = null }) {
    const p = {
        pos: new THREE.Vector3(), vy: 0, facing: 0, hop: null, cast: null, speed: 0, sprinting: false,
        invuln: 0, knock: new THREE.Vector3(), sinceHurt: 99, dead: null, strike: null, strikeCd: 0, spin: null, shot: null,
        buffs: {},   // statusId → { left (s), tick (ms) } — amo STATUS_DEFS buffs
    };
    hero.root.rotation.order = 'YXZ';
    const baseSpeed = () => 100 + stats.attributes.agility * 4;   // px/s — amo's Player.js
    const dir = new THREE.Vector3(), tryPos = new THREE.Vector3(), tmp = new THREE.Vector3();
    let triggerLock = false;
    let lastCtx = null;

    // ---- buffs (amo STATUS_DEFS fields: damageTakenMult, statsMult, swingMult, speedMult, manaRegen) ----
    const buffMult = field => Object.keys(p.buffs).reduce((m, id) => m * (STATUS_DEFS[id]?.[field] ?? 1), 1);
    function addBuff(id, ms) { p.buffs[id] = { left: ms / 1000, tick: 0 }; }
    function tickBuffs(dt) {
        for (const [id, b] of Object.entries(p.buffs)) {
            b.left -= dt;
            const def = STATUS_DEFS[id];
            if (def?.regenAmt) {   // regen: health back over time
                b.regenT = (b.regenT ?? 0) + dt * 1000;
                while (b.regenT >= (def.regenInterval ?? 1000)) { b.regenT -= def.regenInterval ?? 1000; stats.health = Math.min(stats.maxHealth, stats.health + def.regenAmt); }
            }
            if (def?.manaRegen) {
                b.tick += dt * 1000;
                while (b.tick >= (def.regenInterval ?? 1000)) { b.tick -= def.regenInterval ?? 1000; stats.mana = Math.min(stats.maxMana, stats.mana + def.manaRegen); }
            }
            if (b.left <= 0) delete p.buffs[id];
        }
        if (p.veil > 0) p.veil -= dt;
        if (p.circle) {   // the arcane circle: mana back while you stand in it
            p.circle.left -= dt;
            if (Math.hypot(p.pos.x - p.circle.x, p.pos.z - p.circle.z) < 2.5) stats.mana = Math.min(stats.maxMana, stats.mana + 5 * dt);
            if (p.circle.left <= 0) p.circle = null;
        }
    }

    const map = () => world.current;
    const blockedPx = (px, py) => map().blockedAt(px / PX, py / PX, PLAYER_R, p.pos.y);   // amo's blockedAt(x, y), pixels

    function place(sp) {
        const m = map();
        p.pos.set(sp.x, sp.y ?? m.groundAt(sp.x, sp.z, 1e3), sp.z);
        Object.assign(p, { vy: 0, hop: null, cast: null, facing: sp.facing ?? 0 });
        m.scene.add(hero.root);
        triggerLock = true;
    }

    function hurt(dmg, from) {
        if (p.dead) return false;
        if (settings.god) return false;   // god mode (Options): nothing hurts
        if (p.hop && p.hop.t * MOVE.HOP_MS < MOVE.HOP_IFRAME_MS) {   // amo's hop i-frames: a dodge
            hud.floater(p.pos.clone().setY(p.pos.y + 2.1), 'Dodged', '#9fd0ff');
            return false;
        }
        if (p.invuln > 0) return false;
        // Parry: the next blow from the front does nothing (amo 'parrying').
        if (p.buffs.parrying && ((from.x - p.pos.x) * Math.sin(p.facing) + (from.z - p.pos.z) * Math.cos(p.facing)) > 0) {
            delete p.buffs.parrying;
            p.invuln = 0.3;
            hud.floater(p.pos.clone().setY(p.pos.y + 2.1), 'Parried', '#f3d88b');
            cam.kick(0.1);
            return false;
        }
        // amo Player.takeDamage: Arcane Ward (10%/lv) + Stone Skin (8/14/20%), together at most 75%; then Mana-Shield.
        const wardRed = (stats.skills?.arcane_ward?.level ?? 0) * 0.10, skinRed = stats.spells?.stone_skin ? ([0.08, 0.14, 0.2][stats.spells.stone_skin - 1] ?? 0.08) : 0;
        dmg = Math.max(1, Math.round(dmg * buffMult('damageTakenMult') * (1 - Math.min(0.75, wardRed + skinRed))));
        const shieldLv = stats.skills?.mana_shield?.level ?? 0;
        if (shieldLv > 0 && stats.mana > 0) {   // 30/50/70% of the blow paid with mana, 2 mana a point
            const take = Math.min(Math.floor(dmg * [0.3, 0.5, 0.7][shieldLv - 1]), Math.floor(stats.mana / 2));
            stats.mana -= take * 2; dmg -= take;
            if (take > 0) hud.floater(p.pos.clone().setY(p.pos.y + 2.4), `shield −${take}`, '#6aa8f0');
            if (dmg <= 0) { p.invuln = INVINCIBLE_S; return false; }
        }
        if (p.ward > 0) {   // Aetheric Ward soaks the blow, then breaks
            const soak = Math.min(p.ward, dmg); p.ward -= soak; dmg -= soak;
            hud.floater(p.pos.clone().setY(p.pos.y + 2.1), `ward −${soak}`, '#9ab8ff');
            if (p.ward <= 0) { delete p.buffs.warded; hud.message('Your Aetheric Ward breaks.'); }
            if (dmg <= 0) { p.invuln = 0.3; return false; }
        }
        stats.health = Math.max(0, stats.health - dmg);
        p.invuln = INVINCIBLE_S;
        p.sinceHurt = 0;
        p.knock.set(p.pos.x - from.x, 0, p.pos.z - from.z).normalize().multiplyScalar(6);
        cam.kick(0.18);
        hud.hurt();
        hud.floater(p.pos.clone().setY(p.pos.y + 2.1), `-${dmg}`, '#ff5050');
        if (stats.health <= 0) {
            p.dead = { t: 0 };
            p.cast = null; p.hop = null;
            hud.message(`${name} falls…`);
            hud.gameOver?.(name, stats.respawnPoint?.label);
        }
        return true;
    }

    function onKill(xp, at, type, extra = {}) {
        if (type) hooks.onKill?.(type, extra);
        const before = stats.level;
        stats.gainXp(xp);   // amo's PlayerStats: levels, skill and attribute points
        hud.floater(at, `+${xp} XP`, '#c9b6ff');
        if (stats.level > before) { hud.banner(`Level ${stats.level}`); sfx.levelUp(); } else sfx.kill();
    }

    function revive() {
        p.dead = null;
        hero.root.rotation.x = 0;
        stats.health = stats.maxHealth;
        stats.mana = stats.maxMana;
        stats.vigor = stats.maxVigor;
        stats.vigorWinded = false;
        for (const h of world.maps.outdoor?.hittables ?? []) h.reset?.();
    }

    // Spells on yourself (amo Player: barkskin, mends, ward, veil, tempest step, cleanse, arcane circle…).
    const BAD = new Set(['burning', 'poison', 'cold', 'frozen', 'shocked', 'wet', 'dried', 'dirty', 'silenced', 'entangled', 'cursed', 'void_tainted', 'marked', 'hushed', 'dazed', 'crippled', 'sundered', 'bleeding', 'snared']);
    function castSelf(sp, lvl) {
        const st = sp.applyStatus, pos = p.pos.clone().setY(p.pos.y + 2.2);
        if (sp.id === 'aetheric_ward') { p.ward = [25, 45, 70][lvl - 1] ?? 25; addBuff('warded', 1e9); hud.floater(pos, `ward ${p.ward}`, '#9ab8ff'); }
        else if (sp.id === 'shadow_veil') { p.veil = (sp.duration?.[lvl - 1] ?? 2000) / 1000 + (stats.skills?.shadow_step?.level ?? 0);   // + Shadow Step
            hud.floater(pos, 'veiled', '#c8a8ff'); }
        else if (sp.id === 'tempest_step') { const d = ([80, 110, 145][lvl - 1] ?? 80) / PX; const tx = p.pos.x + Math.sin(p.facing) * d, tz = p.pos.z + Math.cos(p.facing) * d; if (!map().blockedAt(tx, tz, PLAYER_R, p.pos.y)) { p.pos.x = tx; p.pos.z = tz; } addBuff('blessed', st?.duration ?? 4000); }
        else if (sp.id === 'cleanse') { let n = 0; for (const id of Object.keys(p.buffs)) if (BAD.has(id)) { delete p.buffs[id]; n++; } hud.floater(pos, n ? `cleansed ${n}` : 'cleansed', '#e8f4ff'); }
        else if (sp.id === 'arcane_circle') { p.circle = { x: p.pos.x, z: p.pos.z, left: (sp.duration?.[lvl - 1] ?? 60000) / 1000 }; hud.floater(pos, 'arcane circle', '#c8a8ff'); }
        else if (st) { addBuff(st.id, st.duration > 0 ? st.duration : 30000); hud.floater(pos, STATUS_DEFS[st.id]?.label ?? st.id, '#9fe0a0'); }
        auraFx?.(sp);
    }
    // Blink-Step (amo skill, H / double-tap HOP / gamepad Back): an aether dash where you face — 8 mana,
    // 60 / 80 / 105 px; blocked by walls (it stops at the last clear spot); a blink of invulnerability.
    function blink() {
        const lv = stats.skills?.blink_step?.level ?? 0;
        if (p.dead || p.cast) return false;
        if (!lv) { hud.message('Blink-Step not yet learned — the Book, Skills'); return false; }
        if (stats.manaExhausted) { hud.message('Too exhausted to Blink-Step'); return false; }
        if (stats.mana < 8) { hud.message('Not enough mana'); return false; }
        const dist = ([60, 80, 105][lv - 1] ?? 60) / PX, from = p.pos.clone();
        let d = 0;
        for (let k = 0.25; k <= dist; k += 0.25) {
            const x = from.x + Math.sin(p.facing) * k, z = from.z + Math.cos(p.facing) * k;
            if (map().blockedAt(x, z, PLAYER_R, p.pos.y) || (map().stepBlocked && map().stepBlocked(x, z, p.pos.y))) break;
            d = k;
        }
        if (d < 0.5) { hud.message('No room to blink'); return false; }
        stats.mana -= 8;
        p.pos.x = from.x + Math.sin(p.facing) * d; p.pos.z = from.z + Math.cos(p.facing) * d;
        if (map().groundAt) p.pos.y = map().groundAt(p.pos.x, p.pos.z, p.pos.y + 0.5);
        p.invuln = Math.max(p.invuln, 0.25); p.knock.set(0, 0, 0);
        blinkFx?.(from, p.pos.clone());
        return true;
    }
    function activeSpell() {
        const id = stats.flags?.activeSpell;
        return CASTABLE.includes(id) && spellRules.SPELLS[id] ? spellRules.SPELLS[id] : FIREBALL;
    }
    function tryCast() {
        if (p.cast) return;
        // The spell on the cast button: chosen in the Book (stats.flags.activeSpell), the Fireball by default.
        const sp = activeSpell();
        if (!stats.spells?.[sp.id]) return hud.message(`You don't know ${sp.name} yet`);
        if (!stats.canCastSpell(sp.id)) return hud.message(`${sp.name} is not ready`);
        const cost = stats.getSpellManaCost(sp.id);
        if (stats.mana < cost) return hud.message('Not enough mana');
        stats.mana -= cost;
        stats.startSpellCooldown(sp.id);
        // Options → Aim: where the camera looks, or where Eldrin faces.
        const aim = settings.aim === 'facing' ? new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing)) : cam.forward();
        // The big spells take an incantation: longer, rooted, the staff raised to the sky (Master takes a little longer).
        const tier = Math.max(1, stats.spells[sp.id] ?? 1), incant = INCANT.has(sp.id);
        p.cast = { t: 0, fired: false, aim, spell: sp, incant, dur: incant ? 1.25 + 0.15 * (tier - 1) : CAST_TIME, release: incant ? 0.8 : CAST_RELEASE };
        p.facing = Math.atan2(aim.x, aim.z);
    }

    // Staff strike: amo's melee damage (8 + 2×STR ± a little, × the weapon's dmgMult × mastery bonus),
    // hits everything in a frontal arc; each hit teaches the staff (amo's hitGain, gainWeaponPoints).
    function strikeHits(ctx) {
        const m = map();
        const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
        const type = p.strike.type, W = WEAPON_TYPES[type], reach = reachOf(type);
        let any = false;
        for (const h of m.hittables ?? []) {
            if (!h.alive) continue;
            const dx = h.pos.x - p.pos.x, dz = h.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d > reach || d < 1e-4 || (dx * fx + dz * fz) / d < 0.35 || Math.abs(h.pos.y - p.pos.y) > 1.5) continue;
            const lvl = stats.weaponLevel(type);
            // amo CombatManager: base + Basic Strike (+3/lv) + Power Slash (+6/lv); a crit (8% + 1.2%/AGI + Keen Eye 5%/lv) hits ×1.6
            const sk = id => stats.skills?.[id]?.level ?? 0;
            const base = 8 + stats.attributes.strength * 2 + Math.floor(Math.random() * 6) - 2 + sk('basic_strike') * 3 + sk('power_slash') * 6;
            const crit = Math.random() < 0.08 + stats.attributes.agility * 0.012 + sk('keen_eye') * 0.05;
            const dmg = Math.max(1, Math.floor(base * W.dmgMult * mastery.levelDamageMult(lvl) * buffMult('statsMult') * (crit ? 1.6 : 1)));
            if (crit) hud.floater(h.pos.clone().setY(h.pos.y + 2.3), 'Critical!', '#ffd76a');
            h.hit(dmg, p.pos, 0, ctx);
            const killed = !h.alive;
            if (h.kind === 'deer') hud.floater(h.pos.clone().setY(h.pos.y + 1.9), `${dmg}`, '#ffe0a0');
            const before = lvl, after = stats.gainWeaponPoints(type, mastery.hitGain(killed));
            if (killed) {   // a kill also practises the weapon's current style (amo C3)
                const sid = styleRules.practising(stats.styles, type);
                if (sid) {
                    const was = styleRules.knowsStyle(stats.styles, sid);
                    styleRules.practiceGain(stats.styles, sid, mastery.hitGain(true));
                    if (!was && styleRules.knowsStyle(stats.styles, sid)) hud.banner('A fighting style learned');
                }
            }
            if (after > before) hud.banner(`${W.label} mastery ${after}`);
            any = true;
        }
        if (any) cam.kick(0.08);
    }

    function passable(x, z) {
        const m = map();
        return m.passable ? m.passable(x, z, p.pos.y) : true;
    }

    function step(dt, act, ctx) {
        const m = map();
        lastCtx = ctx;
        p.strikeCd = Math.max(0, p.strikeCd - dt);
        tickBuffs(dt);
        const ms = dt * 1000;
        p.invuln = Math.max(0, p.invuln - dt);
        p.sinceHurt += dt;
        if (p.dead) {
            p.dead.t += dt;
            hero.root.rotation.x = -Math.min(1, p.dead.t / 0.6) * Math.PI / 2 * 0.95;
            hero.root.position.y = p.pos.y + 0.12 * Math.min(1, p.dead.t / 0.6);
            if (p.dead.t > 3.6) world.go(stats.respawnPoint?.map ?? 'outdoor', stats.respawnPoint?.spawn ?? 'start', revive);   // back at the last gate
            return 0;
        }
        // Out of a fight for a while, Eldrin catches his breath (POC rule).
        if (p.sinceHurt > 6 && !(m.hittables ?? []).some(h => h.engaged)) stats.health = Math.min(stats.maxHealth, stats.health + 4 * dt);

        const fwd = cam.forward();
        dir.set(fwd.x * act.move.y - fwd.z * act.move.x, 0, fwd.z * act.move.y + fwd.x * act.move.x);
        const push = Math.min(1, dir.length());
        const moving = push > 0.05;
        if (moving) dir.normalize();

        p.sprinting = act.sprint && moving && !p.hop && !p.cast && canSprint(stats);
        tickVigor(stats, ms, p.sprinting);
        stats.tickMana(ms);
        stats.tickSpellCooldowns(ms);

        if (act.cast) tryCast();
        if (act.strike && !p.strike && !p.cast && p.strikeCd <= 0 && !p.hop) {
            const type = strikeType(stats);
            p.strike = { t: 0, hit: false, type, thrust: WEAPON_TYPES[type].anim === 'thrust' };
            sfx.swing();
            p.strikeCd = ((WEAPON_TYPES[type].cooldown / 1000) * mastery.levelCooldownMult(stats.weaponLevel(type)) + STRIKE_TIME * 0.6) * buffMult('swingMult');
        }
        if (p.strike) {
            p.strike.t += dt / STRIKE_TIME;
            if (!p.strike.hit && p.strike.t >= STRIKE_HIT) { p.strike.hit = true; strikeHits(ctx); }
            if (p.strike.t >= 1) p.strike = null;
        }
        if (p.cast) {
            const c = p.cast;
            c.t += dt / c.dur;
            if (c.incant && !c.fired) {   // still aiming while you chant; motes gather into the staff
                if (settings.aim !== 'facing') c.aim = cam.forward();
                hero.root.updateMatrixWorld(true);
                fireballs.channel?.(c.spell, p.pos, hero.crystalWorld(new THREE.Vector3()), c.t / c.release, dt);
            }
            p.facing += angleDiff(p.facing, Math.atan2(c.aim.x, c.aim.z)) * Math.min(1, dt * 20);
            if (!c.fired && c.t >= c.release) {
                c.fired = true;
                hero.root.updateMatrixWorld(true);
                const origin = hero.crystalWorld(new THREE.Vector3());
                // Aim to land at the end of its range (a targeted_aoe spell in amo).
                const sp = c.spell ?? FIREBALL, lvl = Math.max(1, stats.spells?.[sp.id] ?? 1);
                const range = ((sp.range?.[lvl - 1] ?? 200) / PX) * spellTuning.rangeMult;
                sfx.cast();
                if (sp.targetingType === 'self') { castSelf(sp, lvl); hooks.onCast?.(origin, tmp.set(0, 0, 0), sp.id); }
                else if (!isBolt(sp)) {   // an area spell lands where you aim — or on the enemy nearest your aim, within range
                    const fx = c.aim.x, fz = c.aim.z;
                    let best = null, bs = Infinity;
                    for (const h of map().hittables ?? []) {
                        if (!h.alive || h.kind === 'deer') continue;
                        const dx = h.pos.x - p.pos.x, dz = h.pos.z - p.pos.z, d = Math.hypot(dx, dz);
                        if (d > range || d < 0.5) continue;
                        const off = 1 - (dx * fx + dz * fz) / d;   // 0 = dead ahead
                        if (off < 0.35 && off * 10 + d * 0.1 < bs) { bs = off * 10 + d * 0.1; best = h; }
                    }
                    const at = best ? best.pos.clone() : p.pos.clone().add(new THREE.Vector3(fx, 0, fz).multiplyScalar(range * 0.85));
                    at.y = map().groundAt ? map().groundAt(at.x, at.z, at.y + 3) : (map().heightAt?.(at.x, at.z) ?? at.y);
                    fireballs.blastAt(at, sp, lvl, stats.attributes.intelligence, map().hittables ?? [], { dir: new THREE.Vector3(fx, 0, fz), from: p.pos.clone() });
                    hooks.onCast?.(at, tmp.set(0, 0, 0), sp.id);
                }
                else {
                // An area spell lands at the end of its range; a bolt flies level, at chest height.
                if (sp.targetingType === 'targeted_aoe') tmp.copy(c.aim).setY(-(origin.y - p.pos.y) / range).normalize();
                else tmp.copy(c.aim).setY(-(origin.y - p.pos.y - 1.1) / range).normalize();
                fireballs.cast(origin, tmp, lvl, stats.attributes.intelligence, { spell: sp });
                hooks.onCast?.(origin, tmp, sp.id);   // online: the others see it
                }
            }
            if (c.t >= 1) p.cast = null;
        }

        if (act.hop && !p.hop && spendHop(stats)) {
            const hd = moving ? dir.clone() : new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
            const distPx = hopLanding({ x: p.pos.x * PX, y: p.pos.z * PX }, { x: hd.x, y: hd.z }, blockedPx);
            sfx.hop();
            p.hop = { t: 0, from: p.pos.clone(), to: p.pos.clone().addScaledVector(hd, distPx / PX), baseY: p.pos.y };
            p.facing = Math.atan2(hd.x, hd.z);
        }

        let lift = 0;
        if (p.hop) {
            const h = p.hop;
            h.t = Math.min(1, h.t + ms / MOVE.HOP_MS);
            p.pos.x = h.from.x + (h.to.x - h.from.x) * h.t;
            p.pos.z = h.from.z + (h.to.z - h.from.z) * h.t;
            const g = m.groundAt(p.pos.x, p.pos.z, h.baseY);
            if (g !== null && g >= h.baseY - 0.6) h.baseY = g;
            p.pos.y = h.baseY;
            lift = Math.sin(Math.PI * h.t) * HOP_LIFT_M;
            p.speed = Math.hypot(h.to.x - h.from.x, h.to.z - h.from.z) / (MOVE.HOP_MS / 1000);
            if (h.t >= 1) p.hop = null;
        } else {
            if (moving) {
                const wading = !!m.wading?.(p.pos.x, p.pos.z);
                // Analog sticks walk slower when pushed less; full tilt = amo's speed.
                const speed = (moveSpeed(baseSpeed(), stats.fatigueFraction, wading ? 0.6 : 1, p.sprinting) / PX) * (p.cast ? (p.cast.incant && !p.cast.fired ? 0 : 0.45) : 1) * Math.max(0.35, push) * buffMult('speedMult');
                tryPos.copy(p.pos).addScaledVector(dir, speed * dt);
                m.resolve(tryPos, PLAYER_R);
                if (!passable(tryPos.x, tryPos.z)) {
                    if (passable(tryPos.x, p.pos.z)) tryPos.z = p.pos.z;
                    else if (passable(p.pos.x, tryPos.z)) tryPos.x = p.pos.x;
                    else tryPos.copy(p.pos);
                }
                p.speed = Math.hypot(tryPos.x - p.pos.x, tryPos.z - p.pos.z) / dt;
                p.pos.x = tryPos.x; p.pos.z = tryPos.z;
                if (!p.cast) p.facing += angleDiff(p.facing, Math.atan2(dir.x, dir.z)) * Math.min(1, dt * 12);
            } else p.speed = 0;

            // Knockback from a hit, and never inside an enemy.
            if (p.knock.lengthSq() > 0.01) {
                tryPos.copy(p.pos).addScaledVector(p.knock, dt);
                m.resolve(tryPos, PLAYER_R);
                if (passable(tryPos.x, tryPos.z)) { p.pos.x = tryPos.x; p.pos.z = tryPos.z; }
                p.knock.multiplyScalar(Math.exp(-dt * 9));
            }
            for (const h of m.hittables ?? []) {
                if (h.kind === 'deer' || !h.alive) continue;
                const dx = p.pos.x - h.pos.x, dz = p.pos.z - h.pos.z, d = Math.hypot(dx, dz);
                if (d < 0.8 && d > 1e-4) { p.pos.x = h.pos.x + (dx / d) * 0.8; p.pos.z = h.pos.z + (dz / d) * 0.8; }
            }

            // Ground: terrain snaps; indoors, step up small ledges and fall down stair wells.
            // Walking down a slope steps down (up to 0.4 m); anything more is a fall — and on maps with
            // fallDamage (the mountain), a long fall hurts or kills.
            // On a too-steep face (the mountain) you slide down it; the whole drop counts as a fall.
            const land = g => {
                const drop = (p.fallFrom ?? g) - g;
                p.fallFrom = null;
                if (m.fallDamage && drop > 4 && !settings.god) {
                    const dmg = drop >= 22 ? stats.maxHealth * 2 : Math.round((drop - 4) * stats.maxHealth / 18);
                    p.invuln = 0;
                    hurt(dmg, { x: p.pos.x + 0.01, z: p.pos.z });
                    p.knock.set(0, 0, 0);
                    if (stats.health <= 0) hud.message('The mountain takes him…');
                }
            };
            const sl = !m.terrain && m.slopeAt ? m.slopeAt(p.pos.x, p.pos.z) : null;
            if (sl && sl.k > m.maxSlope && p.vy === 0) {
                if (p.fallFrom == null) { p.fallFrom = p.pos.y; hud.message('You slip!'); }
                p.slide = Math.min(14, (p.slide ?? 3) + dt * 18);
                const bx = p.pos.x, bz = p.pos.z, by = p.pos.y;
                p.pos.x += sl.dx * p.slide * dt; p.pos.z += sl.dz * p.slide * dt;
                p.pos.y = m.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.6);
                p.speed = p.slide;
                // Sliding into a pocket (no real progress): stop, and land where you are.
                p.slideStall = Math.hypot(p.pos.x - bx, p.pos.y - by, p.pos.z - bz) < 0.02 ? (p.slideStall ?? 0) + dt : 0;
                if (p.slideStall > 0.4) { p.slideStall = 0; p.slide = 0; land(p.pos.y); }
            } else {
            if (p.slide) { p.slide = 0; if (p.vy === 0) land(p.pos.y); }
            const g = m.groundAt(p.pos.x, p.pos.z, p.pos.y);
            if (m.terrain || (g !== null && g >= p.pos.y - (p.vy === 0 ? 0.4 : 0.05))) { p.pos.y = g; p.vy = 0; }
            else {
                if (p.vy === 0 && p.fallFrom == null) p.fallFrom = p.pos.y;
                p.vy -= GRAVITY * dt;
                p.pos.y += p.vy * dt;
                if (g !== null && p.pos.y <= g) { p.pos.y = g; p.vy = 0; land(g); }
            }
            }
            if (p.pos.y < -60) place(m.spawns[Object.keys(m.spawns)[0]]);
        }

        hero.root.position.copy(p.pos);
        hero.root.position.y += lift;
        if (p.spin) { p.spin.t += dt / 0.4; if (p.spin.t >= 1) p.spin = null; }
        if (p.shot) { p.shot.t += dt / 0.3; if (p.shot.t >= 1) p.shot = null; }
        hero.root.rotation.y = p.facing + (p.spin ? p.spin.t * Math.PI * 2 : 0);
        hero.update(dt, { speed: p.speed, sprinting: p.sprinting, hopK: p.hop ? p.hop.t : null, castK: p.cast ? p.cast.t : p.shot ? p.shot.t : null, incant: !!p.cast?.incant, strikeK: p.strike ? p.strike.t : null, thrust: !!p.strike?.thrust });

        // Doors.
        let nearLabel = null, inside = false;
        for (const t of m.triggers) {
            if (t.yMin !== undefined && (p.pos.y < t.yMin || p.pos.y > t.yMax)) continue;
            const d = Math.hypot(p.pos.x - t.x, p.pos.z - t.z);
            if (d < t.r + 3) nearLabel = t.label;
            if (d < t.r) {
                inside = true;
                if (!triggerLock && t.to) { sfx.door(); world.go(t.to, t.spawn); }
            }
        }
        if (!inside) triggerLock = false;
        hud.prompt(nearLabel);
        return lift;
    }

    return {
        state: p, place, step, hurt, onKill, revive, addBuff, activeSpell, blink,
        statsMult: () => buffMult('statsMult'),
        playStrike: () => { p.strike = { t: 0, hit: true, type: 'staff', thrust: false }; },
        playSpin: () => { p.spin = { t: 0 }; },
        playShot: () => { p.shot = { t: 0 }; },
        get lastCtx() { return lastCtx; },
    };
}
