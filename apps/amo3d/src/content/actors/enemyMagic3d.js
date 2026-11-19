// Enemy magic in 3D — amo's caster rules (@rules enemyMagic: ENEMY_SPELLS, ENEMY_KITS, chooseEnemySpell, BOSS_AEGIS)
// on any creature with a kit, whatever its body. A cast is shown: the caster stops, a ring in the spell's colour fills
// at its feet and motes rise; a stun, a silence or a hush before it closes breaks it ("Interrupted"). Then:
//   bolt — a glowing bolt flies at you (a little homing, so a sidestep or a hop gets out of its way; a raised shield,
//          a parry, Deflect Arrows or Perfect Block stop it like any blow from afar) and may leave its status on you;
//   hex  — a sigil closes round you: a curse or a silence, or Unweave, which strips your magical buffs;
//   ward / empower / haste / mend — on the caster or the most hurt ally near it (a bubble, red embers, gold sparks).
// Dungeon bosses raise the Void Aegis (blows do a third) at half and a quarter health, then every 16 s while
// below half: a violet bubble until Unravel or Purifying Sweep tears it away (game/fireball.js → dispel()).
import * as THREE from 'three';
import { enemyMagic as EM, statuses } from '@rules';

const { ENEMY_SPELLS, ENEMY_KITS, chooseEnemySpell, GLOBAL_CAST_GAP, BOSS_AEGIS } = EM;
const { STATUS_DEFS } = statuses;
const M = px => (px / 32) * 2 * 1.4;   // amo pixels → metres (3D reach tuning, as the creatures' sight)
const R = Math.random;

const group = new THREE.Group();
let scene = null;
const shots = [];     // bolts in flight
const fxs = [];       // short-lived meshes { t, dur, fn, obj }
const auras = new Map();   // core → { bubble }
const tells = new Map();   // core → fan mesh
// A 100° fan pointing along +z (a creature's heading 0), radius 1 — scaled to the creature's reach.
const fanGeo = new THREE.CircleGeometry(1, 20, Math.PI / 2 - 0.87, 1.74).rotateX(-Math.PI / 2).rotateY(Math.PI);
const casters = new Set();
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const ringGeo = new THREE.RingGeometry(0.9, 1.05, 40).rotateX(-Math.PI / 2);
const discGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2);
const glowMat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });

const heights = new WeakMap();
const box = new THREE.Box3();
function heightOf(root, pos) {
    if (!root) return 1.8;
    let v = heights.get(root);
    if (v == null) { box.setFromObject(root); v = Number.isFinite(box.max.y) ? Math.max(0.6, box.max.y - pos.y) : 1.8; heights.set(root, v); }
    return v;
}
function flash(pos, color, radius = 1.2, dur = 0.4) {
    const m = new THREE.Mesh(ringGeo, glowMat(color));
    m.position.copy(pos); group.add(m);
    fxs.push({ t: 0, dur, obj: m, fn: k => { m.scale.setScalar(0.2 + k * radius); m.material.opacity = 0.9 * (1 - k); } });
}
function sparkle(pos, color, n = 10, spread = 0.6) {
    for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(sphereGeo, glowMat(color)); m.scale.setScalar(0.05 + R() * 0.04);
        m.position.set(pos.x + (R() - 0.5) * spread, pos.y + R() * spread, pos.z + (R() - 0.5) * spread); group.add(m);
        const vy = 0.8 + R() * 1.2, vx = (R() - 0.5) * 1.2, vz = (R() - 0.5) * 1.2;
        fxs.push({ t: 0, dur: 0.6 + R() * 0.3, obj: m, fn: (k, dt) => { m.position.x += vx * dt; m.position.y += vy * dt; m.position.z += vz * dt; m.material.opacity = 0.9 * (1 - k); } });
    }
}

// opts: { boss } — a dungeon boss also raises the Void Aegis.
export function attachCaster(core, type, pos, root = null, { boss = false } = {}) {
    const kit = ENEMY_KITS[type] ?? [];
    if (!kit.length && !boss) return null;
    const cds = {};
    let gap = 1.5 + R() * 1.5, cast = null, aegisCd = 0, aegisMarks = 0;
    const ring = new THREE.Mesh(ringGeo, glowMat(0xffffff)), fill = new THREE.Mesh(discGeo, glowMat(0xffffff));
    ring.visible = fill.visible = false;
    fill.material.opacity = 0.35;

    function stop(label = null, ctx = null) {
        if (!cast) return;
        if (label && ctx) ctx.floater?.(pos.clone().setY(pos.y + heightOf(root, pos) + 0.3), label, '#d8d0ff');
        cast = null; ring.visible = fill.visible = false;
        delete core.s.fx.shaping;
        gap = GLOBAL_CAST_GAP / 1000 * 0.6;
    }
    function begin(id, sp, target, ctx) {
        cast = { id, sp, target, t: 0, dur: sp.castMs / 1000 };
        core.s.fx.shaping = { left: cast.dur + 0.2, tick: 0 };   // rooted while it shapes the spell
        ring.material.color.setHex(sp.color); fill.material.color.setHex(sp.color);
        ring.visible = fill.visible = true;
        ctx.floater?.(pos.clone().setY(pos.y + heightOf(root, pos) + 0.4), sp.name, `#${sp.color.toString(16).padStart(6, '0')}`);
    }
    function resolve(ctx) {
        const { id, sp, target } = cast;
        const P = ctx.player.pos, H = heightOf(root, pos);
        if (id === 'aegis') {
            core.s.fx.void_aegis = { left: Infinity, tick: 0 };
            flash(pos.clone().setY(pos.y + 0.1), sp.color, 3); ctx.floater?.(pos.clone().setY(pos.y + H + 0.5), 'Void Aegis', '#c080ff');
        } else if (sp.kind === 'bolt') {
            const from = pos.clone().setY(pos.y + H * 0.7);
            const m = new THREE.Mesh(sphereGeo, glowMat(sp.color)); m.scale.setScalar(0.22);
            const halo = new THREE.Mesh(sphereGeo, glowMat(sp.color)); halo.scale.setScalar(2.2); halo.material.opacity = 0.25; m.add(halo);
            m.position.copy(from); group.add(m);
            const aim = new THREE.Vector3(P.x, P.y + 1.1, P.z).sub(from).normalize();
            shots.push({ m, sp, from: pos.clone(), vel: aim.multiplyScalar(11), t: 0 });
        } else if (sp.kind === 'hex') {
            if (ctx.player.dead || Math.hypot(P.x - pos.x, P.z - pos.z) > M(sp.range) + 1) return;
            flash(P.clone().setY(P.y + 0.08), sp.color, 2.2, 0.6); sparkle(P.clone().setY(P.y + 0.6), sp.color, 14, 1);
            if (sp.dispel) { const n = ctx.dispelPlayer?.() ?? 0; ctx.floater?.(P.clone().setY(P.y + 2.4), n ? `Unwoven (${n})` : 'Unweave', '#ddddff'); }
            else { ctx.playerStatus?.(sp.status, sp.duration); ctx.floater?.(P.clone().setY(P.y + 2.4), STATUS_DEFS[sp.status]?.label ?? sp.name, '#c8a0ff'); }
        } else {   // ward / empower / haste / mend on a creature (target: its core)
            const t = target;
            if (!t || t.s.dead) return;
            if (sp.kind === 'mend') { const amt = Math.round(t.DEF.health * (sp.heal ?? 0.2)); t.s.hp = Math.min(t.DEF.health, t.s.hp + amt); ctx.floater?.(t.pos.clone().setY(t.pos.y + 1.8), `+${amt}`, '#66ff99'); }
            if (sp.status) t.addStatus(sp.status, sp.duration);
            flash(t.pos.clone().setY(t.pos.y + 0.08), sp.color, 1.8); sparkle(t.pos.clone().setY(t.pos.y + 0.8), sp.color, 12, 0.9);
        }
    }

    const c = {
        core, pos, root,
        get casting() { return !!cast; },
        get spell() { return cast?.id ?? null; },
        interrupt(ctx) { if (cast) { stop('Interrupted!', ctx); cds[cast?.id] = 3; return true; } return false; },
        remove() { stop(); ring.parent?.remove(ring); fill.parent?.remove(fill); casters.delete(c); },
        tick(dt, ctx) {
            if (ring.parent !== group) group.add(ring, fill);
            for (const k of Object.keys(cds)) cds[k] = Math.max(0, cds[k] - dt);
            gap -= dt; aegisCd -= dt;
            const fx = core.s.fx;
            if (core.s.dead || core.net.puppet) { stop(); return; }
            if (cast) {
                if (core.stunned() || fx.silenced || fx.hushed) { stop('Interrupted!', ctx); return; }
                cast.t += dt;
                const k = Math.min(1, cast.t / cast.dur);
                ring.position.set(pos.x, pos.y + 0.06, pos.z); fill.position.copy(ring.position);
                ring.scale.setScalar(1.2); ring.rotation.y += dt * 2; fill.scale.setScalar(0.05 + k * 1.15);
                if (R() < dt * 20) sparkle(pos.clone().setY(pos.y + 0.1), cast.sp.color, 1, 1.4);
                if (cast.t >= cast.dur) { const done = cast; resolve(ctx); stop(); cds[done.id] = (done.sp.cooldown ?? 4000) / 1000; gap = GLOBAL_CAST_GAP / 1000; }
                return;
            }
            const P = ctx.player.pos, d = Math.hypot(P.x - pos.x, P.z - pos.z);
            const hidden = ctx.player.dead || (ctx.player.veil ?? 0) > 0;
            const inFight = core.s.engaged || d < 10;
            if (hidden || !inFight || gap > 0 || core.stunned() || fx.silenced || fx.hushed) return;
            // The boss's Void Aegis first: at half and a quarter health, then every 16 s while under half.
            if (boss && !fx.void_aegis) {
                const f = core.s.hp / core.DEF.health;
                const mark = f <= 0.25 ? 2 : f <= 0.5 ? 1 : 0;
                if (mark > aegisMarks || (mark > 0 && aegisCd <= 0)) { aegisMarks = Math.max(aegisMarks, mark); aegisCd = BOSS_AEGIS.cooldown / 1000; begin('aegis', BOSS_AEGIS, core, ctx); return; }
            }
            if (!kit.length || d > 18) return;
            const allies = [];
            for (const h of ctx.map?.hittables ?? []) {
                const o = ctx.coreOf?.(h.pos);
                if (!o || o.s.dead || !h.alive) continue;
                allies.push({ entity: o, hpFrac: o.s.hp / o.DEF.health, has: id => !!o.s.fx[id], dist: Math.hypot(o.pos.x - pos.x, o.pos.z - pos.z) / M(1) });
            }
            allies.sort((a, b) => (a.entity === core ? -1 : b.entity === core ? 1 : 0));
            if (!allies.length || allies[0].entity !== core) allies.unshift({ entity: core, hpFrac: core.s.hp / core.DEF.health, has: id => !!fx[id], dist: 0 });
            const pick = chooseEnemySpell(kit, cds, { distToPlayer: d / M(1), allies });
            if (pick) begin(pick.id, ENEMY_SPELLS[pick.id], pick.target === 'player' ? null : pick.target, ctx);
            else gap = 0.5;
        },
    };
    casters.add(c);
    return c;
}

// Once a frame from the main loop: bolts in flight, flashes, and the bubbles and embers of enemy buffs.
export function updateEnemyMagic(dt, ctx) {
    const sc = ctx.map?.scene;
    if (sc && sc !== scene) {   // a new map: what was flying there is gone
        scene = sc; sc.add(group);
        for (const s of shots) group.remove(s.m); shots.length = 0;
        for (const [, a] of auras) group.remove(a.bubble); auras.clear();
        for (const [, f] of tells) group.remove(f); tells.clear();
    }
    for (let i = fxs.length - 1; i >= 0; i--) {
        const f = fxs[i]; f.t += dt; const k = Math.min(1, f.t / f.dur); f.fn(k, dt);
        if (k >= 1) { group.remove(f.obj); f.obj.material?.dispose(); fxs.splice(i, 1); }
    }
    const P = ctx.player.pos;
    for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i]; s.t += dt;
        // A little homing: hard to outrun, easy to sidestep late.
        const to = new THREE.Vector3(P.x, P.y + 1.1, P.z).sub(s.m.position);
        const dist = to.length();
        if (dist > 0.01 && !ctx.player.dead) { const want = to.normalize().multiplyScalar(s.vel.length()); s.vel.lerp(want, Math.min(1, dt * 1.4)); }
        s.m.position.addScaledVector(s.vel, dt);
        const wall = s.t > 0.3 && ctx.map?.blockedAt?.(s.m.position.x, s.m.position.z, 0.1, s.m.position.y - 1) === 'wall';   // (not while it leaves the caster: its own pillar or doorway)
        if (dist < 0.75 && !ctx.player.dead) {
            const landed = ctx.hurtPlayer(s.sp.dmg, s.from);   // from the caster: a shield facing it, Deflect Arrows (far), a parry all count
            if (landed && s.sp.status && R() < (s.sp.chance ?? 1)) ctx.playerStatus?.(s.sp.status, s.sp.duration);
            sparkle(s.m.position.clone(), s.sp.color, 12, 0.5);
            group.remove(s.m); shots.splice(i, 1); continue;
        }
        if (s.t > 3 || wall) { sparkle(s.m.position.clone(), s.sp.color, 6, 0.3); group.remove(s.m); shots.splice(i, 1); }
    }
    // Enemy buffs, seen: a bubble for a ward (blue) or the Void Aegis (violet), embers for Empowered, sparks for Hastened.
    const seen = new Set();
    for (const h of ctx.map?.hittables ?? []) {
        const o = ctx.coreOf?.(h.pos);
        if (!o || o.s.dead || !h.alive) continue;
        const fx = o.s.fx, H = heightOf(h.root, h.pos);
        const bubbleColor = fx.void_aegis ? 0x9900ff : fx.mana_ward ? 0x88aaff : null;
        if (bubbleColor != null) {
            let a = auras.get(o);
            if (!a) { const b = new THREE.Mesh(sphereGeo, glowMat(bubbleColor)); b.material.opacity = 0.18; b.material.side = THREE.DoubleSide; group.add(b); a = { bubble: b }; auras.set(o, a); }
            a.bubble.material.color.setHex(bubbleColor);
            a.bubble.position.set(h.pos.x, h.pos.y + H * 0.5, h.pos.z);
            a.bubble.scale.setScalar(Math.max(0.8, H * 0.65) * (1 + Math.sin(performance.now() / 300) * 0.03));
            a.bubble.material.opacity = 0.14 + Math.sin(performance.now() / 200) * 0.04;
            seen.add(o);
        }
        if (fx.empowered && R() < dt * 10) sparkle(h.pos.clone().setY(h.pos.y + R() * H), 0xff5533, 1, 0.8);
        if (fx.hastened && R() < dt * 8) sparkle(h.pos.clone().setY(h.pos.y + 0.2), 0xffee88, 1, 0.8);
        if (fx.mending && R() < dt * 6) sparkle(h.pos.clone().setY(h.pos.y + 0.4), 0x66ff99, 1, 0.8);
    }
    // Tells: a red fan on the ground ahead of a creature winding up a blow, filling and brightening until it lands.
    const told = new Set();
    for (const h of ctx.map?.hittables ?? []) {
        const o = ctx.coreOf?.(h.pos), T = o?.s.tell;
        if (!T || !h.alive) continue;
        T.t += dt; told.add(o);
        let f = tells.get(o);
        if (!f) { f = new THREE.Mesh(fanGeo, new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })); group.add(f); tells.set(o, f); }
        const k = Math.min(1, T.t / 0.5);
        f.position.set(h.pos.x, h.pos.y + 0.07, h.pos.z); f.rotation.y = T.heading; f.scale.setScalar(Math.max(1, T.reach) * (0.4 + 0.6 * k));
        f.material.opacity = 0.18 + 0.4 * k;
    }
    for (const [o, f] of tells) if (!told.has(o)) { group.remove(f); f.material.dispose(); tells.delete(o); }
    for (const [o, a] of auras) if (!seen.has(o)) { group.remove(a.bubble); a.bubble.material.dispose(); auras.delete(o); }
}

// A spell of yours that strips (dispel) or breaks (interrupt) — Unravel, Purifying Sweep, Counterspell. Returns the
// labels of what was torn away.
export function dispel(core) {
    const gone = [];
    for (const id of Object.keys(core.s.fx)) { const d = STATUS_DEFS[id]; if (d?.magical && d.buff) { gone.push(d.label ?? id); delete core.s.fx[id]; } }
    return gone;
}
export const debugMagic = () => ({ shots: shots.map(s => ({ t: +s.t.toFixed(2), p: s.m.position.toArray().map(v => +v.toFixed(1)) })) });
export const casterOf = core => [...casters].find(c => c.core === core) ?? null;
