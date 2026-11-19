// Style skills — the three skills of the style being practised with the weapon in hand (amo C3):
// Z / X / V, gamepad RB / LT / right-stick click, three touch buttons. Each needs the style learned
// and the weapon's mastery (2 / 5 / 8) — styles.js skillState — and has its own cooldown (k.cd).
// Kinds: strike (in front), spin (all around), buff (a stance on you, amo STATUS_DEFS), dash (lunge ahead through a
// line), leap (jump ahead, land among them), line (a thrust through a whole row), flurry (fast blows in front),
// shadowstep (behind the nearest enemy), taunt (draw them in, take less), shot (a bow / crossbow skill shot),
// volley (quick magic bolts), chain (a bolt that jumps), release (all your mana in a blast around you).
import { styles as styleRules, styleData, weapons as weaponRules, mastery as M, items as itemRules, statuses } from '@rules';

const { STYLE_SKILLS, STYLES } = styleData;
const { skillState, practising } = styleRules;
const { WEAPON_TYPES, typeOf } = weaponRules;
const { STATUS_DEFS } = statuses;
const PLAYABLE = new Set(['strike', 'spin', 'buff', 'dash', 'leap', 'line', 'flurry', 'shadowstep', 'taunt', 'shot', 'volley', 'chain', 'release']);
import * as THREE from 'three';
import { coreOf } from '../content/actors/enemyCore.js';
import { createSkillFx } from './skillFx.js';
import { sfx } from '../engine/sfx.js';
const toM = px => (px / 32) * 2;   // amo pixels → metres, with the 3D reach tuning

// Each skill's own move: the pose (models/character.js move), how long it takes, when the blow lands (a fraction of
// it), and what it looks like (fx). Skills not listed play as before.
const MOVES = {
    parry:            { pose: 'parry', dur: 0.8 },
    riposte:          { pose: 'riposte', dur: 0.55, hitAt: 0.42, fx: 'thrust' },
    steady_advance:   { pose: 'guard', dur: 0.9, fx: 'stance' },
    whirlwind:        { pose: 'spinhigh', dur: 0.6, hitAt: 0.45, spin: 2, fx: 'whirl' },
    cleave:           { pose: 'cleave', dur: 0.7, hitAt: 0.5, fx: 'sweep' },
    rampage:          { pose: 'roar', dur: 0.9, fx: 'roar', color: 0xff7a2a },
    vanish:           { pose: 'vanish', dur: 0.6, fx: 'smoke' },
    backstab:         { pose: 'stab', dur: 0.45, hitAt: 0.4, fx: 'stab' },
    piercing_lunge:   { pose: 'riposte', dur: 0.4 },
    leaping_strike:   { pose: 'land', dur: 0.62 },
    run_through:      { pose: 'riposte', dur: 0.5, hitAt: 0.42, fx: 'line' },
    deflect_arrows:   { pose: 'twirl', dur: 1.0 },
    windmill:         { pose: 'spinhigh', dur: 0.7, hitAt: 0.5, spin: 2, fx: 'whirl' },
    bone_breaker:     { pose: 'overhead', dur: 0.75, hitAt: 0.52, fx: 'smash' },
    stunning_blow:    { pose: 'sidelong', dur: 0.6, hitAt: 0.42, fx: 'daze' },
    shatter_armour:   { pose: 'overhead', dur: 0.75, hitAt: 0.52, fx: 'shatter' },
    rage:             { pose: 'roar', dur: 1.0, fx: 'roar', color: 0xff3a1a },
    bleeding_chop:    { pose: 'chop', dur: 0.6, hitAt: 0.42, fx: 'blood' },
    frenzy:           { pose: 'roar', dur: 0.8, fx: 'roar', color: 0xffb040 },
    perfect_block:    { pose: 'wall', dur: 0.6, fx: 'flash' },
    taunt:            { pose: 'beckon', dur: 0.9 },
    shield_wall:      { pose: 'wall', dur: 1.0, fx: 'wall' },
    haymaker:         { pose: 'haymaker', dur: 0.65, hitAt: 0.52, fx: 'punch' },
    grab_and_throw:   { pose: 'grab', dur: 0.85, hitAt: 0.58, fx: 'throw' },
    headbutt:         { pose: 'headbutt', dur: 0.55, hitAt: 0.45, fx: 'daze' },
    steady_aim:       { pose: 'aim', dur: 0.9 },
    echo:             { pose: 'flourish', dur: 0.9, fx: 'sparkle', color: 0xcc99ff },
    channel:          { pose: 'channel', dur: 1.0 },
    overload:         { pose: 'raise', dur: 0.9, fx: 'sparkle', color: 0xff88ff },
    release:          { pose: 'raise', dur: 0.45, hitAt: 0.9 },
};

const CSS = `
#skills { position: fixed; left: 50%; bottom: 92px; transform: translateX(-50%); display: flex; gap: 8px; z-index: 4; }
#skills .sk { position: relative; width: 92px; padding: 5px 6px; border-radius: 8px; border: 1px solid #c9b6ff66; background: #0009;
    font: calc(14px * var(--ui, 1)) Georgia, serif; color: #eee6d2; text-align: center; pointer-events: auto; cursor: pointer; overflow: hidden; }
#skills .sk.off { opacity: .35; }
#skills .sk .key { position: absolute; left: 4px; top: 1px; font-size: calc(13px * var(--ui, 1)); opacity: .7; }
#skills .sk .cd { position: absolute; left: 0; right: 0; bottom: 0; background: #000b; }
`;

export function createSkills({ stats, player, hud, cam, world, archery = () => null }) {
    const moves = [], bolts = [], timers = [];   // a lunge or leap in progress; magic bolts in flight; blows to come
    const vfx = createSkillFx();
    let fxScene = null;
    const later = (sec, fn) => timers.push({ t: -sec, dur: 0.01, fn: q => { if (q >= 1) fn(); } });
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);
    const root = document.createElement('div');
    root.id = 'skills';
    document.body.append(root);
    const cds = {};   // skillId → seconds left
    const tiles = [0, 1, 2].map(i => {
        const t = document.createElement('div');
        t.className = 'sk';
        const key = document.createElement('span'); key.className = 'key'; key.textContent = 'ZXV'[i];
        const name = document.createElement('div');
        const cd = document.createElement('span'); cd.className = 'cd';
        t.append(key, name, cd);
        t.addEventListener('pointerdown', e => { e.stopPropagation(); use(i); });
        root.append(t);
        return { t, name, cd };
    });

    const weaponType = () => {
        const id = stats.equipment.weapon;
        return id ? typeOf(itemRules.ITEMS[id]) : 'staff';
    };
    const bar = () => {
        const w = weaponType();
        const sid = practising(stats.styles, w);
        return { weapon: w, skills: sid ? STYLES[sid].skills : [] };
    };

    // A creature's facing: its body's turn (every actor turns its root toward where it goes).
    const behind = h => { const f = h.root?.rotation?.y; if (f == null) return false; const p = player.state.pos, dx = p.x - h.pos.x, dz = p.z - h.pos.z, d = Math.hypot(dx, dz) || 1; return (dx * Math.sin(f) + dz * Math.cos(f)) / d < -0.3; };
    // One blow on one creature: the skill's multiplier, Backstab from behind, a Riposte after a parry, out of a Vanish
    // double; its status; a knockback (amo knock).
    function strikeOne(h, k, weapon, base, extra = 1, from = player.state.pos) {
        const p = player.state, W = WEAPON_TYPES[weapon];
        let mult = (k.mult ?? 1) * extra;
        if (k.behindMult && behind(h)) { mult *= k.behindMult; hud.floater(h.pos.clone().setY(h.pos.y + 2.4), 'From behind!', '#ffd76a'); }
        const dmg = Math.max(1, Math.floor(base * W.dmgMult * M.levelDamageMult(stats.weaponLevel(weapon)) * mult * player.statsMult()));
        h.hit(dmg, p.pos, 0, player.lastCtx, k.status ? { id: k.status, ms: k.statusMs } : null);
        if (k.knock) coreOf(h.pos)?.shove(from, k.knock);
        if (h.kind === 'deer') hud.floater(h.pos.clone().setY(h.pos.y + 1.9), `${dmg}`, '#ffe0a0');
        stats.gainWeaponPoints(weapon, M.hitGain(!h.alive));
    }
    const strBase = () => 8 + stats.attributes.strength * 2 + Math.floor(Math.random() * 6) - 2;
    function hitAround(k, weapon, { arc, reach, max = Infinity, extra = 1, from = null }) {
        const p = player.state, m = world.current, ctx = player.lastCtx;
        const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
        const W = WEAPON_TYPES[weapon];
        let n = 0;
        const targets = (m.hittables ?? []).filter(h => h.alive)
            .map(h => ({ h, d: Math.hypot(h.pos.x - p.pos.x, h.pos.z - p.pos.z) }))
            .filter(({ h, d }) => d <= reach && Math.abs(h.pos.y - p.pos.y) < 1.5 && (arc == null || d < 1e-4 || ((h.pos.x - p.pos.x) * fx + (h.pos.z - p.pos.z) * fz) / d >= arc))
            .sort((a, b) => a.d - b.d);
        const vk = targets.length ? player.consumeVanish() : 1;
        for (const { h } of targets) {
            if (n >= max) break;
            strikeOne(h, k, weapon, strBase(), extra * vk, from ?? p.pos);
            n++;
        }
        if (n) { cam.kick(0.12); sfx.hit(); }
        return targets.slice(0, Math.min(max, targets.length)).map(t => t.h);
    }

    // Everyone in a line ahead (a lunge, a run-through): within `width` of the line, up to `length` metres.
    function hitLine(k, weapon, length, width = 1.1, from = null, dir = null) {
        const p = player.state, m = world.current, ctx = player.lastCtx, W = WEAPON_TYPES[weapon];
        const o = from ?? p.pos, fx = dir?.x ?? Math.sin(p.facing), fz = dir?.z ?? Math.cos(p.facing);
        let n = 0;
        for (const h of m.hittables ?? []) {
            if (!h.alive) continue;
            const dx = h.pos.x - o.x, dz = h.pos.z - o.z, along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
            if (along < -0.3 || along > length || side > width || Math.abs(h.pos.y - p.pos.y) > 1.5) continue;
            strikeOne(h, k, weapon, strBase(), 1, o); n++;
            vfx.burst(h.pos.clone().setY(h.pos.y + 1.1), 0xfff0c0, 10, 3);
        }
        if (n) cam.kick(0.14);
        return n;
    }
    // Move the hero over `dur` seconds (a lunge or a leap), sliding off walls; invulnerable meanwhile.
    function travel(dist, dur, then, { arc = 0 } = {}) {
        const p = player.state;
        moves.push({ t: 0, dur, dx: Math.sin(p.facing) * dist / dur, dz: Math.cos(p.facing) * dist / dur, then, arc, y0: p.pos.y });
        p.invuln = Math.max(p.invuln ?? 0, dur + 0.1);
    }
    // The nearest living enemy, optionally only in front of you, within r metres.
    function nearest(r, front = true, from = player.state.pos, except = null) {
        const p = player.state, fx = Math.sin(p.facing), fz = Math.cos(p.facing);
        let best = null, bd = r;
        for (const h of world.current.hittables ?? []) {
            if (!h.alive || except?.has(h) || ['deer'].includes(h.kind)) continue;
            const dx = h.pos.x - from.x, dz = h.pos.z - from.z, d = Math.hypot(dx, dz);
            if (d > bd || (front && d > 0.5 && (dx * fx + dz * fz) / d < 0.3)) continue;
            best = h; bd = d;
        }
        return best;
    }
    // A magic bolt (wands): flies to its target and strikes; onHit can send it on (a chain).
    function bolt(target, dmg, from, onHit = null, color = 0xb89aff) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
        const light = new THREE.PointLight(color, 4, 5, 1.6); m.add(light);
        m.position.copy(from); world.current.scene.add(m);
        bolts.push({ m, target, dmg, onHit, scene: world.current.scene });
    }
    const magicDmg = (k, weapon) => { const W = WEAPON_TYPES[weapon]; return Math.max(1, Math.floor((8 + stats.attributes.intelligence * 2 + Math.floor(Math.random() * 6) - 2) * W.dmgMult * M.levelDamageMult(stats.weaponLevel(weapon)) * (k.mult ?? 1) * player.statsMult())); };
    function ring(radius, color = 0xffd090) {   // a flash on the ground (a landing, a release)
        const r = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }));
        r.position.copy(player.state.pos).setY(player.state.pos.y + 0.06); world.current.scene.add(r);
        timers.push({ t: 0, dur: 0.45, fn: k => { r.scale.setScalar(0.3 + k * radius); r.material.opacity = 0.8 * (1 - k); if (k >= 1) r.parent?.remove(r); } });
    }

    function use(i) {
        const { weapon, skills } = bar();
        return useId(skills[i], weapon);
    }
    function useId(id, weapon, side = null) {
        const k = STYLE_SKILLS[id];
        if (!k) return false;
        const state = skillState(stats.styles, id, stats.weaponLevel(weapon), true);
        if (state === 'style') return hud.message(`Learn the ${STYLES[k.style].name} style first (practise it)`), false;
        if (state === 'mastery') return hud.message(`${k.name} needs ${WEAPON_TYPES[weapon].label} mastery ${k.unlock}`), false;
        if ((cds[id] ?? 0) > 0) return hud.message(`${k.name} is not ready`), false;
        if (!PLAYABLE.has(k.kind)) return hud.message(`${k.name}: not in 3D yet`), false;
        if (player.state.dead || player.state.cast) return false;

        const mv = MOVES[id], p = player.state, hand = side ?? 'R';
        const P = () => player.state.pos, at = (y = 1.1) => P().clone().setY(P().y + y);
        const ahead = (d, y = 1.1) => at(y).add(new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing)).multiplyScalar(d));
        if (mv) { player.playMove(mv.pose, mv.dur, hand); if (mv.spin) player.spinFor(mv.dur, mv.spin); }
        const hitT = mv?.hitAt != null ? mv.dur * mv.hitAt : 0;
        const reachOf = () => toM(k.reach ?? WEAPON_TYPES[weapon].reach) + toM(k.radius ?? 0) * 0.5 + 0.4;
        // What a landed blow looks like, by the move's fx.
        const impact = (hits, kind = mv?.fx) => {
            const c = hits[0]?.pos.clone().setY(hits[0].pos.y + 1.1) ?? ahead(1.2);
            if (kind === 'smash' || kind === 'shatter') { const g = ahead(1.3, 0); g.y = world.current.heightAt?.(g.x, g.z) ?? P().y; vfx.crack(g, kind === 'shatter' ? 0xff7a30 : null); vfx.puff(g, 22); vfx.shock(g, 2.4, kind === 'shatter' ? 0xff8a40 : 0xd8c8a8); vfx.burst(c, kind === 'shatter' ? 0xff8a3a : 0xffe8c0, 26, 4.5); sfx.smash(); cam.kick(0.3); }
            else if (kind === 'daze') { vfx.burst(c, 0xffe066, 18, 3); sfx.smash(); cam.kick(0.2); }
            else if (kind === 'blood') { vfx.burst(c, 0xb01010, 22, 3.5, { grav: 12 }); }
            else if (kind === 'punch') { vfx.burst(c, 0xffffff, 20, 5); vfx.shock(c.clone().setY(P().y), 1.4, 0xffffff, 0.3); sfx.smash(); cam.kick(0.25); }
            else if (kind === 'throw') { if (hits[0]) vfx.puff(hits[0].pos, 16); sfx.smash(); cam.kick(0.25); }
            else if (kind === 'stab') { vfx.burst(c, 0xd8c0ff, 14, 3); }
            else if (kind === 'thrust' || kind === 'line') { vfx.burst(c, 0xfff0c0, 16, 3.5); }
            else if (hits.length) vfx.burst(c, 0xfff0c0, 12, 3);
        };

        if (k.kind === 'buff') {
            player.addBuff(k.buff, k.buffMs ?? STATUS_DEFS[k.buff]?.duration ?? 3000);
            hud.message(k.name);
            if (id === 'vanish') { p.veil = (k.buffMs ?? 3000) / 1000; vfx.puff(P(), 30, [0.16, 0.12, 0.2], 1.2); sfx.puff(); }
            else if (mv?.fx === 'roar') { vfx.shock(P(), 3.5, mv.color); vfx.burst(at(1.3), mv.color, 30, 3, { up: 3 }); sfx.roar(); cam.kick(0.15); }
            else if (mv?.fx === 'wall') { vfx.shock(P(), 2, 0x9ab8ff); sfx.parry(); }
            else if (mv?.fx === 'flash') { vfx.burst(ahead(0.7, 1.2), 0xffe2a0, 16, 2); sfx.parry(); }
            else if (mv?.fx === 'stance') { vfx.puff(P(), 10, [0.5, 0.48, 0.45], 0.7); }
            else if (mv?.fx === 'sparkle') { vfx.burst(at(1.6), mv.color, 26, 2.5, { up: 2.5 }); sfx.cast(); }
            else if (id === 'deflect_arrows' || id === 'parry') sfx.whoosh();
            else if (id === 'channel') sfx.cast();
        } else if (k.kind === 'strike') {
            if (!mv) player.playStrike();
            sfx.swing();
            if (mv?.fx === 'sweep') later(hitT * 0.85, () => vfx.arc(P(), p.facing, reachOf() * 0.9, { from: -1.3, to: 1.3, width: 0.5 }));
            if (mv?.fx === 'daze' && mv.pose === 'sidelong') later(hitT * 0.9, () => vfx.arc(P(), p.facing, reachOf() * 0.8, { from: -1, to: 0.9, y: 1.5 }));
            const riposte = k.parryMult && player.consumeRiposte();
            later(hitT, () => {
                let reach = reachOf(), arc = 0.2;
                if (id === 'grab_and_throw') { reach += 0.4; }
                // Grab & Throw: thrown out to the side you heave toward; others straight back.
                const side3 = id === 'grab_and_throw' ? P().clone().add(new THREE.Vector3(-Math.cos(p.facing), 0, Math.sin(p.facing)).multiplyScalar(1.5)) : null;
                const hits = hitAround(k, weapon, { arc, reach, max: k.max ?? 1, extra: riposte ? k.parryMult : 1, from: side3 });
                if (riposte && hits.length) hud.floater(hits[0].pos.clone().setY(hits[0].pos.y + 2.6), 'Riposte!', '#f3d88b');
                impact(hits);
            });
        } else if (k.kind === 'spin') {
            if (!mv) player.playSpin();
            sfx.whoosh();
            later(mv ? hitT : 0, () => { const r = toM(k.radius ?? 48) + 0.5; vfx.arc(P(), p.facing, r * 0.9, { from: -Math.PI, to: Math.PI, width: 0.45, dur: 0.3 }); vfx.shock(P(), r, 0xf0e0c0, 0.35); impact(hitAround(k, weapon, { arc: null, reach: r }), null); });
        } else if (k.kind === 'dash') {   // Piercing Lunge: forward fast, piercing everything along the way
            const from = P().clone(), dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
            if (!mv) player.playStrike(); sfx.whoosh(); vfx.puff(P(), 12);
            travel(toM(k.dist ?? 48), 0.22, () => { hitLine(k, weapon, toM(k.length ?? 96) * 0.6 + 1, 1.1, from, dir); vfx.puff(P(), 8); });
        } else if (k.kind === 'leap') {   // Leaping Strike: jump ahead, land in the middle of them
            sfx.whoosh(); vfx.puff(P(), 14);
            travel(toM(k.dist ?? 90) * 0.7, 0.5, () => { const r = toM(k.radius ?? 44) + 0.5; vfx.crack(P()); vfx.puff(P(), 26, undefined, 1.3); vfx.shock(P(), r + 0.8, 0xffd090); sfx.smash(); impact(hitAround(k, weapon, { arc: null, reach: r }), null); cam.kick(0.3); }, { arc: 1.6 });
        } else if (k.kind === 'line') {   // Run Through: one thrust through the whole row
            if (!mv) player.playStrike(); sfx.swing();
            later(hitT, () => { const len = toM(k.length ?? 120) * 0.6 + 1.2; hitLine(k, weapon, len, 0.9); for (let d = 0.8; d < len; d += 0.5) vfx.burst(ahead(d), 0xfff0c0, 2, 1, { life: 0.3, size: 0.18 }); sfx.whoosh(); });
        } else if (k.kind === 'flurry') {   // Flurry of Blows: fast blows, one after another
            for (let n = 0; n < (k.hits ?? 4); n++) later(n * (k.gap ?? 90) / 1000, () => { player.playMove('riposte', 0.2, n % 2 ? 'L' : 'R'); sfx.swing(); const hits = hitAround(k, weapon, { arc: 0.2, reach: toM(k.reach ?? 40) + toM(k.radius ?? 30) * 0.5 + 0.6, max: 3 }); if (hits.length) vfx.burst(hits[0].pos.clone().setY(hits[0].pos.y + 1.1), 0xfff0c0, 8, 2.5); });
        } else if (k.kind === 'shadowstep') {   // behind the nearest enemy, facing its back
            const h = nearest(toM(k.range ?? 140) * 1.5, false);
            if (!h) return hud.message('No one near enough to step behind'), false;
            const dx = h.pos.x - p.pos.x, dz = h.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1;
            const nx = h.pos.x + dx / d * 1.2, nz = h.pos.z + dz / d * 1.2;
            if (world.current.blockedAt?.(nx, nz, 0.4) === 'wall') return hud.message('No room behind it'), false;
            vfx.puff(p.pos, 22, [0.16, 0.12, 0.2]);
            p.pos.x = nx; p.pos.z = nz; p.facing = Math.atan2(-dx, -dz); p.invuln = 0.4;
            vfx.puff(p.pos, 22, [0.16, 0.12, 0.2]); sfx.puff();
            player.addBuff('vanished', 1500); hud.message(k.name);
        } else if (k.kind === 'taunt') {   // Taunt: you take less, and they come to you
            player.addBuff(k.buff ?? 'taunting', k.buffMs ?? 4000);
            for (const h of world.current.hittables ?? []) if (h.alive && h.kind !== 'deer' && Math.hypot(h.pos.x - player.state.pos.x, h.pos.z - player.state.pos.z) < 12) h.provoke?.();
            vfx.shock(P(), 6, 0xffaa66, 0.6); sfx.roar(); hud.message(k.name);
        } else if (k.kind === 'shot') {   // a bow / crossbow skill: a special shot
            const a = archery();
            if (!a?.armed()) return hud.message('Draw the bow first'), false;
            if (!a.shoot({ mult: k.mult ?? 1, rangeMult: k.rangeMult, status: k.status ? { id: k.status, ms: k.statusMs } : null, pierce: !!k.pierce })) return false;
            vfx.burst(ahead(0.8, 1.4), id === 'mark_prey' ? 0xff4040 : id === 'snare' ? 0x88aa55 : 0xfff0c0, 10, 1.5);
            hud.message(k.name);
        } else if (k.kind === 'volley') {   // Snap Cast: quick bolts, one after another, at whoever is in front
            const h = nearest(14);
            if (!h) return hud.message('No target in front'), false;
            for (let n = 0; n < (k.hits ?? 3); n++) later(n * (k.gap ?? 110) / 1000, () => { player.playShot(); sfx.cast(); bolt(h, magicDmg(k, weapon), player.state.pos.clone().setY(player.state.pos.y + 1.5), hit => coreOf(hit.pos)?.shove(P(), k.knock)); });
        } else if (k.kind === 'chain') {   // Chain: a bolt that jumps from enemy to enemy
            const first = nearest(14);
            if (!first) return hud.message('No target in front'), false;
            const struck = new Set(); let left = k.jumps ?? 3, dmg = magicDmg(k, weapon);
            const jump = (h, from) => bolt(h, dmg, from, hit => { struck.add(hit); vfx.burst(hit.pos.clone().setY(hit.pos.y + 1.1), 0x9ad8ff, 12, 3); if (left-- <= 0) return; dmg = Math.max(1, Math.round(dmg * (k.jumpMult ?? 0.75))); const next = nearest(toM(k.radius ?? 90) * 1.4, false, hit.pos, struck); if (next) jump(next, hit.pos.clone().setY(hit.pos.y + 1.2)); }, 0x9ad8ff);
            player.playShot(); sfx.cast(); jump(first, player.state.pos.clone().setY(player.state.pos.y + 1.5));
        } else if (k.kind === 'release') {   // Release: all your mana in a blast around you — more mana, bigger blast
            const mana = stats.mana;
            if (mana < (k.manaPer ?? 40)) return hud.message('Not enough mana to release'), false;
            stats.mana = 0;
            const r = toM(k.radius ?? 80) * (0.7 + Math.min(1.5, mana / ((k.manaPer ?? 40) * 4)));
            vfx.burst(at(2.2), 0xb89aff, 20, 1.5, { up: 2 });
            later(hitT, () => { vfx.shock(P(), r, 0xb89aff, 0.5); vfx.shock(P(), r * 0.6, 0xe0d0ff, 0.35); vfx.burst(at(1), 0xb89aff, 50, 7, { up: 2 }); sfx.boom(); cam.kick(0.4);
                hitAround({ ...k, mult: (k.mult ?? 1.2) * (1 + mana / ((k.manaPer ?? 40) * 3)) }, weapon, { arc: null, reach: r }); });
        }
        cds[id] = (k.cd ?? 3000) / 1000;
        return true;
    }

    function update(dt) {
        for (const id of Object.keys(cds)) cds[id] = Math.max(0, cds[id] - dt);
        const p = player.state, m = world.current;
        if (m.scene && fxScene !== m.scene) { fxScene = m.scene; vfx.setScene(m.scene); }
        vfx.update(dt, { player: p, hittables: m.hittables ?? [] });
        for (let i = moves.length - 1; i >= 0; i--) {   // a lunge or a leap: step by step, sliding off walls
            const mv = moves[i]; mv.t += dt;
            const nx = p.pos.x + mv.dx * dt, nz = p.pos.z + mv.dz * dt;
            if (m.blockedAt?.(nx, nz, 0.4, p.pos.y) !== 'wall') { p.pos.x = nx; p.pos.z = nz; }
            m.resolve?.(p.pos, 0.4);
            if (mv.arc) { const k = Math.min(1, mv.t / mv.dur); p.pos.y = Math.max(p.pos.y, (m.heightAt?.(p.pos.x, p.pos.z) ?? p.pos.y) + Math.sin(k * Math.PI) * mv.arc); }
            if (mv.t >= mv.dur) { moves.splice(i, 1); mv.then?.(); }
        }
        for (let i = timers.length - 1; i >= 0; i--) { const tm = timers[i]; tm.t += dt; if (tm.t >= 0) { const k = Math.min(1, tm.t / tm.dur); tm.fn(k); if (k >= 1) timers.splice(i, 1); } }
        for (let i = bolts.length - 1; i >= 0; i--) {   // magic bolts home on their target
            const b = bolts[i], tg = b.target;
            if (b.scene !== m.scene || !tg.alive) { b.m.parent?.remove(b.m); bolts.splice(i, 1); continue; }
            const to = new THREE.Vector3(tg.pos.x, tg.pos.y + 1.1, tg.pos.z).sub(b.m.position), d = to.length();
            if (d < 0.5) { tg.hit(b.dmg, p.pos, 0, player.lastCtx, null, 'arcane'); stats.gainWeaponPoints(weaponType(), M.hitGain(!tg.alive)); b.m.parent?.remove(b.m); bolts.splice(i, 1); b.onHit?.(tg); continue; }
            b.m.position.addScaledVector(to, Math.min(1, 22 * dt / d));
        }
        const { weapon, skills } = bar();
        tiles.forEach((tile, i) => {
            const k = STYLE_SKILLS[skills[i]];
            tile.t.style.display = k ? '' : 'none';
            if (!k) return;
            tile.name.textContent = k.name;
            const ready = skillState(stats.styles, k.id, stats.weaponLevel(weapon), true) === 'ready' && PLAYABLE.has(k.kind);
            tile.t.classList.toggle('off', !ready);
            tile.t.title = k.desc;
            tile.cd.style.height = `${Math.min(1, (cds[k.id] ?? 0) / ((k.cd ?? 3000) / 1000)) * 100}%`;
        });
    }

    // A combo's finisher (player.js): what it looks like where it lands.
    player.onFinisher = (type, fin, hits) => {
        const p = player.state, at = hits[0]?.pos.clone().setY(hits[0].pos.y + 1.1) ?? p.pos.clone().add(new THREE.Vector3(Math.sin(p.facing), 1.1, Math.cos(p.facing)));
        if (fin.pose === 'overhead' || fin.pose === 'chop') { const g = p.pos.clone().add(new THREE.Vector3(Math.sin(p.facing) * 1.3, 0, Math.cos(p.facing) * 1.3)); g.y = world.current.heightAt?.(g.x, g.z) ?? p.pos.y; if (fin.pose === 'overhead') vfx.crack(g); vfx.puff(g, 14); sfx.smash(); }
        else if (fin.pose === 'cleave' || fin.pose === 'cross') vfx.arc(p.pos, p.facing, 2.2, { from: -1.3, to: 1.3, width: 0.45 });
        else if (fin.around) vfx.arc(p.pos, p.facing, 2, { from: -Math.PI, to: Math.PI, width: 0.4 });
        if (hits.length) vfx.burst(at, 0xfff0c0, 18, 4); else sfx.whoosh();
    };
    return { use, useId, update };
}
