import { sfx } from '../../engine/sfx.js';
// Wolves — amo's ENEMY_TYPES.wolf (28 HP, 8 damage, fast, sharp-eyed, drops herbs or a potion).
// A pack lives at a den: they wander, notice you, close in fast, circle, and take turns at a
// crouch-then-lunge bite (a tell you can hop through). Body and AI here; rules in enemyCore.js.
import * as THREE from 'three';
import { createEnemyCore, PX } from './enemyCore.js';
import { flat } from '../../engine/lib.js';
import { bakeRig } from '../../engine/batch.js';
import { settings } from '../../engine/settings.js';
import { buildWolfV2 } from '../models/v2/creatures.js';

const TYPE = 'wolf';
const TUNE = { sight: 3, reach: 2, speed: 1.6 };   // 2D distances feel short in 3D (as for the soldiers)

function limb(len, r0, r1, m) {
    const j = new THREE.Group();
    j.add(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 6).translate(0, -len / 2, 0), m));
    return j;
}
const part = (g, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };

export function buildWolf(tint, { layer = 'wolf' } = {}) {   // (layer: a Library clone's own)
    const M = { fur: flat(tint), belly: flat(0xb8b0a2), dark: flat(0x1c1a18),
        eye: new THREE.MeshBasicMaterial({ color: 0xffd060, toneMapped: false }) };
    const root = new THREE.Group();
    const body = new THREE.Group();
    body.position.y = 0.62;
    root.add(body);
    const torso = part(body, new THREE.CylinderGeometry(0.2, 0.17, 0.85, 7).rotateX(Math.PI / 2), M.fur);
    torso.scale.set(0.85, 1, 1);
    part(body, new THREE.SphereGeometry(0.23, 7, 5), M.fur, 0, 0.03, 0.34);          // chest
    part(body, new THREE.BoxGeometry(0.2, 0.08, 0.6), M.belly, 0, -0.15, 0.05);
    const tail = new THREE.Group();
    tail.position.set(0, 0.06, -0.42);
    body.add(tail);
    part(tail, new THREE.CylinderGeometry(0.03, 0.07, 0.45, 5).rotateX(-1.1)   /* (thick at the body — it was backward) */.translate(0, -0.1, -0.18), M.fur);
    const legs = [];
    for (const [x, z, front] of [[0.11, 0.32, 1], [-0.11, 0.32, 1], [0.11, -0.3, 0], [-0.11, -0.3, 0]]) {
        const upper = limb(0.3, 0.06, 0.04, M.fur);
        upper.position.set(x, -0.08, z);
        const lower = limb(0.3, 0.035, 0.025, M.fur);
        lower.position.y = -0.3;
        part(lower, new THREE.BoxGeometry(0.05, 0.04, 0.07), M.dark, 0, -0.3, 0.02);   // paw
        upper.add(lower);
        body.add(upper);
        legs.push({ upper, lower, front });
    }
    const head = new THREE.Group();
    head.position.set(0, 0.16, 0.5);
    body.add(head);
    part(head, new THREE.BoxGeometry(0.2, 0.18, 0.22), M.fur, 0, 0, 0);
    const snout = part(head, new THREE.CylinderGeometry(0.045, 0.08, 0.22, 6).rotateX(Math.PI / 2), M.fur, 0, -0.03, 0.2);
    snout.scale.set(1, 0.8, 1);
    part(head, new THREE.SphereGeometry(0.03, 5, 4), M.dark, 0, -0.01, 0.31);
    const eyes = [];
    for (const sgn of [1, -1]) {
        part(head, new THREE.ConeGeometry(0.045, 0.12, 4), M.fur, sgn * 0.07, 0.13, -0.03);
        const e = part(head, new THREE.BoxGeometry(0.03, 0.014, 0.01), M.eye, sgn * 0.055, 0.04, 0.11);
        e.rotation.z = sgn * 0.3; eyes.push([e, sgn]);
    }
    // Character models: New (2026-11-26, LAYERS_PLAN step 6) — the v2 wolf over the same joints (models/v2/creatures.js,
    // shaped in the Sculptor); the classic pieces go, the eyes stay, set on the new head
    if (settings.charModels === 'new') {
        const keep = new Set(eyes.map(([e]) => e));
        const old = []; root.traverse(o => { if (o.isMesh && !keep.has(o)) old.push(o); });
        for (const o of old) { o.parent.remove(o); o.geometry.dispose(); }
        for (const [e, sgn] of eyes) { e.position.set(sgn * 0.07, 0.035, 0.095); e.rotation.set(0, sgn * 0.5, sgn * 0.3); }
        const tc = '#' + new THREE.Color(tint).getHexString();
        buildWolfV2({ root, body, head, tail, legs }, { fur: tc, layer });
    }
    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    bakeRig(root);
    return { root, body, legs, head, tail, M };
}

export function createWolves({ scene, map, rng, den, count = 3, layer = 'wolf' }) {
    return Array.from({ length: count }, (_, i) => {
        const tint = [0x6b6862, 0x56524c, 0x7c7468][i % 3];
        const home = { x: den.x + Math.cos(i * 2.1) * 2.5, z: den.z + Math.sin(i * 2.1) * 2.5 };
        return createWolf({ scene, map, rng, home, tint, layer });
    });
}

function createWolf({ scene, map, rng, home, tint, layer = 'wolf' }) {
    const d = buildWolf(tint, { layer });
    scene.add(d.root);
    const pos = new THREE.Vector3(home.x, map.heightAt(home.x, home.z), home.z);
    const core = createEnemyCore({ type: TYPE, name: 'Grey Wolf', pos, rng, respawnS: 25 });
    const DEF = core.DEF, s = core.s;
    const SIGHT = (DEF.sightRange / PX) * TUNE.sight, REACH = (DEF.attackRange / PX) * TUNE.reach, CHASE = (DEF.speed / PX) * TUNE.speed;
    const ai = { state: 'idle', timer: rng() * 3, heading: rng() * 6.28, speed: 0, phase: rng() * 6, target: null, attackCd: 1 + rng() * 2, t: 0, orbit: rng() < 0.5 ? 1 : -1, lunge: 0, bit: false };
    const prev = new THREE.Vector3();
    const navKey = {};
    const steer = (target, dt) => (map.nav ? map.nav.aim(pos, target, navKey, dt) : target);

    const turn = (want, k) => {
        const diff = ((((want - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        ai.heading += diff * Math.min(1, k);
    };

    // Online puppet: follow the host's snapshots ([x, y, z, heading, state, hp, dead]).
    const STATES = ['idle', 'wander', 'notice', 'chase', 'circle', 'windup', 'lunge', 'recover', 'return'];
    let snap = null;
    function puppetStep(dt) {
        if (!snap) return;
        const k = 1 - Math.exp(-dt * 10);
        pos.x += (snap[0] - pos.x) * k; pos.z += (snap[2] - pos.z) * k; pos.y = map.heightAt(pos.x, pos.z);
        const dh = ((((snap[3] - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        ai.heading += dh * k;
        ai.state = STATES[snap[4]] ?? 'idle';
        ai.speed = ['chase', 'wander', 'return', 'circle'].includes(ai.state) ? 3 : ai.state === 'lunge' ? 6 : 0;
        s.engaged = !['idle', 'wander', 'return'].includes(ai.state);
    }
    function applySnapshot(v) {
        snap = v; s.hp = v[5];
        if (v[6] && !s.dead) { s.dead = true; s.deadT = 0; s.hp = 0; }
        else if (!v[6] && s.dead) { core.revive(); pos.set(v[0], map.heightAt(v[0], v[2]), v[2]); d.root.rotation.z = 0; d.root.visible = true; }
    }
    const snapshot = () => [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), +ai.heading.toFixed(2), Math.max(0, STATES.indexOf(ai.state)), Math.round(s.hp), s.dead ? 1 : 0];

    function update(dt, ctx) {
        const alive = core.tick(dt, ctx);
        if (!alive) {
            const k = Math.min(1, s.deadT / 0.5);
            d.root.rotation.z = (Math.PI / 2) * k;
            d.root.position.set(pos.x, pos.y + 0.2 * k - Math.max(0, s.deadT - 8) * 0.2, pos.z);
            d.root.visible = s.deadT < 12;
            if (!core.net.puppet && s.deadT > core.respawnS) {
                core.revive();
                pos.set(home.x, map.heightAt(home.x, home.z), home.z);
                d.root.rotation.z = 0; d.root.visible = true;
                ai.state = 'idle';
            }
            core.updatePlate(ctx.camera, 1.4);
            return;
        }
        ai.t += dt;
        ai.attackCd -= dt;
        // The nearest living player (online: anyone on this map).
        const T = (ctx.players ?? [{ id: 'me', pos: ctx.player.pos, dead: ctx.player.dead }]).reduce((b, q) => (!q.dead && (!b || Math.hypot(q.pos.x - pos.x, q.pos.z - pos.z) < Math.hypot(b.pos.x - pos.x, b.pos.z - pos.z)) ? q : b), null) ?? { id: 'me', pos: ctx.player.pos, dead: true };
        const P = T.pos;
        const toP = Math.hypot(P.x - pos.x, P.z - pos.z);
        const fromHome = Math.hypot(pos.x - home.x, pos.z - home.z);
        const angToP = Math.atan2(P.x - pos.x, P.z - pos.z);
        let want = 0, dirAng = ai.heading;
        if (core.net.puppet) { puppetStep(dt); } else {

        if (core.stunned()) {
            if (ai.state === 'windup' || ai.state === 'lunge') ai.state = 'chase';
        } else if (ai.state === 'idle' || ai.state === 'wander') {
            if (!T.dead && toP < SIGHT) { ai.state = 'notice'; ai.timer = 0.45; sfx.growl(); }
            else if (ai.state === 'idle' && (ai.timer -= dt) <= 0) {
                const a = rng() * 6.28, r = 1 + rng() * 4;
                ai.target = { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r };
                ai.state = 'wander';
            } else if (ai.state === 'wander') {
                turn(Math.atan2(ai.target.x - pos.x, ai.target.z - pos.z), dt * 4);
                want = 1.2;
                if (Math.hypot(ai.target.x - pos.x, ai.target.z - pos.z) < 0.5) { ai.state = 'idle'; ai.timer = 2 + rng() * 4; }
            }
        } else if (ai.state === 'notice') {
            turn(angToP, dt * 8);
            if ((ai.timer -= dt) <= 0) ai.state = 'chase';
        } else if (ai.state === 'return') {
            { const h = steer(home, dt); turn(Math.atan2(h.x - pos.x, h.z - pos.z), dt * 5); }
            want = 3;
            if (fromHome < 1) { ai.state = 'idle'; s.hp = Math.min(DEF.health, s.hp + 8); }
        } else if (T.dead || fromHome > 24 || toP > SIGHT * 2.2) {
            ai.state = 'return';
        } else if (ai.state === 'chase' || ai.state === 'circle') {
            { const g = toP > REACH + 2.2 ? steer(P, dt) : P; turn(Math.atan2(g.x - pos.x, g.z - pos.z), dt * 8); }
            if (toP > REACH + 2.2) { ai.state = 'chase'; want = CHASE; }
            else if (ai.attackCd <= 0) { ai.state = 'windup'; ai.timer = 0.35; ai.bit = false; }
            else {   // circle the prey at a little distance
                ai.state = 'circle';
                want = 2.4;
                dirAng = angToP + ai.orbit * (Math.PI / 2) + (toP < 2.4 ? ai.orbit * 0.5 : 0);
                if (rng() < dt * 0.4) ai.orbit *= -1;
            }
        } else if (ai.state === 'windup') {
            turn(angToP, dt * 10);
            if ((ai.timer -= dt) <= 0) { ai.state = 'lunge'; ai.timer = 0.28; ai.lunge = 1; }
        } else if (ai.state === 'lunge') {
            want = 8.5;
            if (!ai.bit && toP < REACH + 0.5) {
                const off = Math.abs(((((angToP - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
                if (off < 1.0) { ai.bit = true; if (T.id === 'me') ctx.hurtPlayer(DEF.damage, pos); else ctx.hurtRemote?.(T.id, DEF.damage, pos); }
            }
            if ((ai.timer -= dt) <= 0) { ai.state = 'recover'; ai.timer = 0.5; }
        } else if (ai.state === 'recover') {
            if ((ai.timer -= dt) <= 0) { ai.state = 'chase'; ai.attackCd = 1.3 + rng() * 1.2; }
        }
        s.engaged = !['idle', 'wander', 'return'].includes(ai.state);

        // Move.
        ai.speed += (want * core.fxMult('speedMult') * (core.stunned() ? 0 : 1) - ai.speed) * Math.min(1, dt * 7);
        prev.copy(pos);
        if (ai.speed > 0.02) {
            const moveAng = ai.state === 'circle' ? dirAng : ai.heading;
            pos.x += Math.sin(moveAng) * ai.speed * dt;
            pos.z += Math.cos(moveAng) * ai.speed * dt;
        }
        const dx = pos.x - P.x, dz = pos.z - P.z, dd = Math.hypot(dx, dz);
        if (dd < 0.7 && dd > 1e-4) { pos.x = P.x + (dx / dd) * 0.7; pos.z = P.z + (dz / dd) * 0.7; }
        pos.y = map.heightAt(pos.x, pos.z);
        map.resolve(pos, 0.35);
        if (map.blockedAt(pos.x, pos.z, 0.3, pos.y) === 'wall' && map.heightAt(pos.x, pos.z) < -1.8) pos.copy(prev);
        pos.y = map.heightAt(pos.x, pos.z);
        }

        // Animate: trot / gallop, crouch on the windup, stretch on the lunge.
        d.root.position.copy(pos);
        d.root.rotation.y = ai.heading;
        const gallop = Math.min(1, Math.max(0, (ai.speed - 3) / 3));
        ai.phase += dt * ai.speed * (gallop > 0.5 ? 2.2 : 4.5);
        const amp = Math.min(1, ai.speed / 1.5);
        for (const L of d.legs) {
            const off = gallop > 0.5 ? (L.front ? 0 : Math.PI * 0.6) : (L.front === (L.upper.position.x > 0) ? 0 : Math.PI);
            L.upper.rotation.x = Math.sin(ai.phase + off) * (0.5 + gallop * 0.4) * amp;
            L.lower.rotation.x = Math.max(0, -Math.cos(ai.phase + off)) * (L.front ? 0.8 : 0.6) * amp;   // (2026-11-27, the user: "he walks weirdly" — the paw lifted while the leg pushed back, and the hind ones kicked forward: now lifted as the leg swings forward, folding back)
        }
        const crouch = ai.state === 'windup' ? 1 : 0;
        d.body.position.y = 0.62 - crouch * 0.16 + gallop * Math.abs(Math.sin(ai.phase)) * 0.08;
        d.body.rotation.x = ai.state === 'lunge' ? -0.25 : crouch * 0.12 + gallop * Math.sin(ai.phase) * 0.1;
        d.head.rotation.x = crouch * 0.35 + (ai.state === 'notice' ? -0.5 : 0);
        d.tail.rotation.x = ai.state === 'idle' ? Math.sin(ai.t * 2) * 0.15 : -0.4 * amp;
        for (const m of [d.M.fur]) m.emissive.setRGB(s.flash * 3, s.flash * 0.6, 0);
        core.tell(ai.state === 'windup', ai.heading, REACH);
        core.updatePlate(ctx.camera, 1.4);
    }

    return {
        pos, kind: 'wolf', root: d.root,
        get alive() { return !s.dead; },
        get engaged() { return s.engaged; },
        get debug() { return { state: ai.state, hp: s.hp }; },
        update,
        hit: (...args) => { const r = core.hit(...args); if (!s.dead && ai.state !== 'lunge') { ai.state = 'chase'; } return r; },
        reset: () => { if (!s.dead) { ai.state = 'return'; s.fx = {}; } },
        net: core.net, snapshot, applySnapshot,
        hitFromNet: (h, attacker) => { core.hit(h.dmg, h.from ? new THREE.Vector3(h.from.x, h.from.y, h.from.z) : pos, h.burnMs, core.lastCtx, h.status, h.element, attacker); if (!s.dead && ai.state !== 'lunge') ai.state = 'chase'; },
        credit: () => core.reward(core.lastCtx),
    };
}
