// Combat C3: a fighting-style skill in play (data/styles.js). Phaser glue — the
// rules (who is hit, how hard, what a skill needs) are in systems/styles.js.
import Phaser from 'phaser';
import { STYLE_SKILLS } from '../data/styles.js';
import { ITEMS } from '../data/items.js';
import { targetsIn, skillMult, pathClear } from './styles.js';
import { WEAPON_TYPES, typeOf, isBehind } from './weapons.js';
import { statusManager } from './StatusManager.js';
import { soundManager } from './SoundManager.js';

const DIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

// Runs skill `id` for the scene's player. False when it is not ready (state, cooldown).
export function performSkill(scene, id) {
    const k = STYLE_SKILLS[id], player = scene.player, stats = player?.stats;
    if (!k || !player?.active || !stats.skillReady(id) || statusManager.isStunned(player)) return false;
    if (k.kind === 'shadowstep' && !shadowstep(scene, k)) return false;

    // The hand that holds the skill's weapon swings (fists: an empty hand)
    const { weapon, offHand } = stats.equipment;
    player._swingItem = typeOf(ITEMS[weapon]) === k.weapon ? (weapon ?? null) : typeOf(ITEMS[offHand]) === k.weapon ? (offHand ?? null) : null;
    player._swingType = k.weapon;
    player.play(`${player._charDef.animPrefix}_attack_${player.facing}`);
    const arc = WEAPON_TYPES[k.weapon].arc;
    if (k.kind !== 'buff') player._spawnAttackArc(arc === 'bow' ? 'resonance_bow' : arc, player.facing, (k.mult ?? 0) >= 2 || k.kind === 'spin');

    const at = () => ({ x: player.x, y: player.y });
    switch (k.kind) {
        case 'strike':  strike(scene, k, { kind: 'front', reach: k.reach, radius: k.radius, max: k.max }, at()); break;
        case 'spin':    strike(scene, k, { kind: 'around', radius: k.radius }, at()); spinRing(scene, k.radius); break;
        case 'line':    strike(scene, k, { kind: 'line', length: k.length }, at()); break;
        case 'flurry':
            for (let i = 0; i < k.hits; i++) scene.time.delayedCall(i * k.gap, () => { if (player.active) strike(scene, k, { kind: 'front', reach: k.reach, radius: k.radius }, at()); });
            break;
        case 'dash': {
            // A tween, not a velocity: the player's own movement code resets velocity every frame
            const to = reach(scene, k.dist);
            scene.tweens.add({
                targets: player, x: to.x, y: to.y, duration: 150,
                onUpdate: () => player.body?.reset(player.x, player.y),
                onComplete: () => { if (player.active) strike(scene, k, { kind: 'line', length: k.length }, at()); },
            });
            break;
        }
        case 'leap': leap(scene, k); break;
        case 'buff':
            statusManager.apply(player, k.buff, { duration: k.buffMs });
            break;
        case 'taunt':
            statusManager.apply(player, k.buff, { duration: k.buffMs });
            for (const e of scene._liveEnemies()) {
                if (e.passive || Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y) > k.radius) continue;
                e.interruptCast?.();
                if (e.state !== 'dead') e.state = 'chase';
                scene.combatManager?._spawnNumber(e.x, e.y - 26, '!', '#ffaa66', false);
            }
            spinRing(scene, k.radius, 0xffaa66);
            break;
    }
    stats.startSkillCooldown(id);
    soundManager.attack();
    return true;
}

// Hits every live enemy the shape reaches, with the weapon's normal hit × the skill's.
function strike(scene, k, shape, origin) {
    const player = scene.player, stats = player.stats, combat = scene.combatManager;
    const parried = scene.time.now - (player._parriedAt ?? -1e9) < 2000;
    for (const e of targetsIn(shape, origin, player.facing, scene._liveEnemies())) {
        const vanished = statusManager.has(player, 'vanished');
        const behind = isBehind(e.facing ?? 'down', e, player);
        const mult = skillMult(k, { behind, parried, vanished });
        if (vanished) statusManager.remove(player, 'vanished');
        const dmg = Math.max(1, Math.floor(combat._calcDamage(false).dmg * mult));
        scene.setTarget?.(e);
        e.takeDamage(dmg);
        const killed = !e.active || e.health <= 0;
        stats.learnFromHit(k.weapon, killed, e.level ?? 1);
        if (!killed && k.status) statusManager.apply(e, k.status, { duration: k.statusMs });
        if (e.body) {
            const a = Phaser.Math.Angle.Between(player.x, player.y, e.x, e.y), f = k.knock ?? 130;
            e.body.velocity.x += Math.cos(a) * f;
            e.body.velocity.y += Math.sin(a) * f;
        }
        combat._spawnNumber(e.x, e.y - 22, behind && k.behindMult ? `${dmg}!` : `${dmg}`, '#ff8800', true);
        combat._spawnSparks(e.x, e.y, 0xff8800, 6);
    }
}

// Jump ahead — onto the nearest enemy in the way, else the full distance, stopping
// short of a wall — untouchable in the air, then land with a spin.
function leap(scene, k) {
    const player = scene.player, [fx, fy] = DIR[player.facing] ?? [0, 1];
    const first = targetsIn({ kind: 'line', length: k.dist + 16, width: 28 }, player, player.facing, scene._liveEnemies())[0];
    const d = first ? Math.max(0, (first.x - player.x) * fx + (first.y - player.y) * fy - 16) : k.dist;
    const to = reach(scene, d);
    player._hopIframeMs = 320;
    scene.tweens.add({
        targets: player, x: to.x, y: to.y, duration: 300, ease: 'Sine.easeInOut',
        onUpdate: () => player.body?.reset(player.x, player.y),
        onComplete: () => {
            if (!player.active) return;
            strike(scene, k, { kind: 'around', radius: k.radius }, { x: player.x, y: player.y });
            spinRing(scene, k.radius);
            scene.cameras.main.shake(80, 0.004);
        },
    });
}

// Step behind the nearest enemy within range and face it. False (no cooldown) when there is none or no room.
function shadowstep(scene, k) {
    const player = scene.player, ui = scene.scene.get('UIScene');
    const near = scene._liveEnemies().filter(e => !e.passive)
        .map(e => ({ e, d: Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y) }))
        .filter(o => o.d <= k.range).sort((a, b) => a.d - b.d)[0]?.e;
    if (!near) { ui?.showNotification?.('No enemy close enough', 1200); return false; }
    const [fx, fy] = DIR[near.facing] ?? [0, 1];
    const x = near.x - fx * 24, y = near.y - fy * 24;
    const blocked = scene._hopBlockedAt?.bind(scene);
    if (blocked && !pathClear(player, { x, y }, blocked)) { ui?.showNotification?.('No way through to it', 1200); return false; }
    scene.add.particles(player.x, player.y, 'particle', { speed: { min: 20, max: 60 }, scale: { start: 0.8, end: 0 }, lifespan: 300, tint: [0x6600cc, 0x220044], quantity: 12, explode: true }).setDepth(60);
    player.body.reset(x, y);
    player.facing = Math.abs(near.x - x) > Math.abs(near.y - y) ? (near.x > x ? 'right' : 'left') : (near.y > y ? 'down' : 'up');
    return true;
}

// The farthest point up to `dist` px ahead whose whole path is clear of walls (never through one).
function reach(scene, dist) {
    const player = scene.player, [fx, fy] = DIR[player.facing] ?? [0, 1];
    const blocked = scene._hopBlockedAt?.bind(scene);
    for (let d = dist; d > 0; d -= 4) {
        const to = { x: player.x + fx * d, y: player.y + fy * d };
        if (!blocked || pathClear(player, to, blocked)) return to;
    }
    return { x: player.x, y: player.y };
}

function spinRing(scene, r, color = 0xffcc66) {
    const p = scene.player, ring = scene.add.circle(p.x, p.y, 8, color, 0.25).setDepth(59);
    ring.setStrokeStyle(2, color, 0.8);
    scene.tweens.add({ targets: ring, radius: r, alpha: 0, duration: 260, onComplete: () => ring.destroy() });
}
