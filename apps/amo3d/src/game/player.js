// The player: an amo character sheet (PlayerStats) driving a 3D body. Movement, Vigor, sprint
// and hop come from amo's movementRules; the fireball from amo's SPELLS; getting hurt uses amo's
// 800 ms invulnerability and the hop's i-frames.
import * as THREE from 'three';
import { movementRules, weapons, mastery, items as itemRules } from '@rules';
import { FIREBALL } from './fireball.js';

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

export function createPlayer({ stats, hero, cam, world, hud, fireballs, spellTuning }) {
    const p = {
        pos: new THREE.Vector3(), vy: 0, facing: 0, hop: null, cast: null, speed: 0, sprinting: false,
        invuln: 0, knock: new THREE.Vector3(), sinceHurt: 99, dead: null, strike: null, strikeCd: 0,
    };
    hero.root.rotation.order = 'YXZ';
    const baseSpeed = () => 100 + stats.attributes.agility * 4;   // px/s — amo's Player.js
    const dir = new THREE.Vector3(), tryPos = new THREE.Vector3(), tmp = new THREE.Vector3();
    let triggerLock = false;

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
        if (p.hop && p.hop.t * MOVE.HOP_MS < MOVE.HOP_IFRAME_MS) {   // amo's hop i-frames: a dodge
            hud.floater(p.pos.clone().setY(p.pos.y + 2.1), 'Dodged', '#9fd0ff');
            return false;
        }
        if (p.invuln > 0) return false;
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
            hud.message('Eldrin falls…');
        }
        return true;
    }

    function onKill(xp, at) {
        const before = stats.level;
        stats.gainXp(xp);   // amo's PlayerStats: levels, skill and attribute points
        hud.floater(at, `+${xp} XP`, '#c9b6ff');
        if (stats.level > before) hud.banner(`Level ${stats.level}`);
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

    function tryCast() {
        if (p.cast) return;
        if (!stats.canCastSpell(FIREBALL.id)) return hud.message('Fireball is not ready');
        const cost = stats.getSpellManaCost(FIREBALL.id);
        if (stats.mana < cost) return hud.message('Not enough mana');
        stats.mana -= cost;
        stats.startSpellCooldown(FIREBALL.id);
        const aim = cam.forward();
        p.cast = { t: 0, fired: false, aim };
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
            const base = 8 + stats.attributes.strength * 2 + Math.floor(Math.random() * 6) - 2;
            const dmg = Math.max(1, Math.floor(base * W.dmgMult * mastery.levelDamageMult(lvl)));
            h.hit(dmg, p.pos, 0, ctx);
            const killed = !h.alive;
            if (h.kind !== 'shadow') hud.floater(h.pos.clone().setY(h.pos.y + 1.9), `${dmg}`, '#ffe0a0');
            const before = lvl, after = stats.gainWeaponPoints(type, mastery.hitGain(killed));
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
        p.strikeCd = Math.max(0, p.strikeCd - dt);
        const ms = dt * 1000;
        p.invuln = Math.max(0, p.invuln - dt);
        p.sinceHurt += dt;
        if (p.dead) {
            p.dead.t += dt;
            hero.root.rotation.x = -Math.min(1, p.dead.t / 0.6) * Math.PI / 2 * 0.95;
            hero.root.position.y = p.pos.y + 0.12 * Math.min(1, p.dead.t / 0.6);
            if (p.dead.t > 2.6) world.go('outdoor', 'start', revive);
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
            p.strikeCd = (WEAPON_TYPES[type].cooldown / 1000) * mastery.levelCooldownMult(stats.weaponLevel(type)) + STRIKE_TIME * 0.6;
        }
        if (p.strike) {
            p.strike.t += dt / STRIKE_TIME;
            if (!p.strike.hit && p.strike.t >= STRIKE_HIT) { p.strike.hit = true; strikeHits(ctx); }
            if (p.strike.t >= 1) p.strike = null;
        }
        if (p.cast) {
            const c = p.cast;
            c.t += dt / CAST_TIME;
            p.facing += angleDiff(p.facing, Math.atan2(c.aim.x, c.aim.z)) * Math.min(1, dt * 20);
            if (!c.fired && c.t >= CAST_RELEASE) {
                c.fired = true;
                hero.root.updateMatrixWorld(true);
                const origin = hero.crystalWorld(new THREE.Vector3());
                // Aim to land at the end of its range (a targeted_aoe spell in amo).
                const range = (FIREBALL.range[0] / PX) * spellTuning.rangeMult;
                fireballs.cast(origin, tmp.copy(c.aim).setY(-(origin.y - p.pos.y) / range).normalize(), 1, stats.attributes.intelligence);
            }
            if (c.t >= 1) p.cast = null;
        }

        if (act.hop && !p.hop && spendHop(stats)) {
            const hd = moving ? dir.clone() : new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
            const distPx = hopLanding({ x: p.pos.x * PX, y: p.pos.z * PX }, { x: hd.x, y: hd.z }, blockedPx);
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
                const speed = (moveSpeed(baseSpeed(), stats.fatigueFraction, wading ? 0.6 : 1, p.sprinting) / PX) * (p.cast ? 0.45 : 1) * Math.max(0.35, push);
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
                if (h.kind !== 'shadow' || !h.alive) continue;
                const dx = p.pos.x - h.pos.x, dz = p.pos.z - h.pos.z, d = Math.hypot(dx, dz);
                if (d < 0.8 && d > 1e-4) { p.pos.x = h.pos.x + (dx / d) * 0.8; p.pos.z = h.pos.z + (dz / d) * 0.8; }
            }

            // Ground: terrain snaps; indoors, step up small ledges and fall down stair wells.
            const g = m.groundAt(p.pos.x, p.pos.z, p.pos.y);
            if (m.terrain || (g !== null && g >= p.pos.y - 0.05)) { p.pos.y = g; p.vy = 0; }
            else {
                p.vy -= GRAVITY * dt;
                p.pos.y += p.vy * dt;
                if (g !== null && p.pos.y <= g) { p.pos.y = g; p.vy = 0; }
            }
            if (p.pos.y < -30) place(m.spawns[Object.keys(m.spawns)[0]]);
        }

        hero.root.position.copy(p.pos);
        hero.root.position.y += lift;
        hero.root.rotation.y = p.facing;
        hero.update(dt, { speed: p.speed, sprinting: p.sprinting, hopK: p.hop ? p.hop.t : null, castK: p.cast ? p.cast.t : null, strikeK: p.strike ? p.strike.t : null, thrust: !!p.strike?.thrust });

        // Doors.
        let nearLabel = null, inside = false;
        for (const t of m.triggers) {
            if (t.yMin !== undefined && (p.pos.y < t.yMin || p.pos.y > t.yMax)) continue;
            const d = Math.hypot(p.pos.x - t.x, p.pos.z - t.z);
            if (d < t.r + 3) nearLabel = t.label;
            if (d < t.r) {
                inside = true;
                if (!triggerLock) world.go(t.to, t.spawn);
            }
        }
        if (!inside) triggerLock = false;
        hud.prompt(nearLabel);
        return lift;
    }

    return { state: p, place, step, hurt, onKill, revive };
}
