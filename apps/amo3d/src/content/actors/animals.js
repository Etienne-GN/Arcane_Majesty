// Animals (amo ENEMY_TYPES, numbers unchanged): one code-built body per kind and one small brain.
//   shy      — rabbit, fox, crow, farm animals: graze / wander near home, bolt from you (amo fleeRadius)
//   fighter  — feral boar, black and grizzly bear: wander; come for you inside their sight, wind up, strike
// Built on the shared enemy core (health, loot, XP, statuses, nameplate, respawn, online sharing).
import * as THREE from 'three';
import { createEnemyCore, PX } from './enemyCore.js';
import { flat } from '../../engine/lib.js';
import { sfx } from '../../engine/sfx.js';

export const NAMES = { rabbit: 'Rabbit', forest_fox: 'Fox', crow: 'Crow', feral_boar: 'Feral Boar', black_bear: 'Black Bear', grizzly_bear: 'Grizzly Bear',
    sheep: 'Sheep', cow: 'Cow', pig: 'Pig', chicken: 'Chicken', goat: 'Goat' };
// size (body length), height of the back, colours, and a few features
const KINDS = {
    rabbit:       { len: 0.32, h: 0.22, fur: 0x9a8a72, belly: 0xe0d6c4, ears: 'long', tail: 'puff', legs: 0.08 },
    forest_fox:   { len: 0.6, h: 0.38, fur: 0xc8642a, belly: 0xf0e6d8, ears: 'point', tail: 'brush', legs: 0.2, snout: 0.16 },
    feral_boar:   { len: 0.95, h: 0.62, fur: 0x4a3a2c, belly: 0x3a2e24, ears: 'small', tail: 'thin', legs: 0.26, snout: 0.18, tusks: true, bristle: true },
    black_bear:   { len: 1.35, h: 0.95, fur: 0x1e1a18, belly: 0x2a2420, ears: 'round', tail: 'stub', legs: 0.42, snout: 0.16 },
    grizzly_bear: { len: 1.55, h: 1.08, fur: 0x6a4a30, belly: 0x5a3e28, ears: 'round', tail: 'stub', legs: 0.48, snout: 0.18, hump: true },
    sheep:        { len: 0.85, h: 0.62, fur: 0xe8e4da, belly: 0xd8d2c4, head: 0x2a2420, ears: 'side', tail: 'stub', legs: 0.3, wool: true },
    cow:          { len: 1.4, h: 1.0, fur: 0xf0ece4, belly: 0xe0dcd2, patches: 0x2a2220, ears: 'side', tail: 'thin', legs: 0.5, snout: 0.16, horns: 'short' },
    pig:          { len: 0.85, h: 0.52, fur: 0xe8b0a0, belly: 0xe0a090, ears: 'flop', tail: 'curl', legs: 0.2, snout: 0.12 },
    goat:         { len: 0.75, h: 0.62, fur: 0xd8ccb8, belly: 0xc8bca8, ears: 'side', tail: 'stub', legs: 0.34, horns: 'curve', beard: true },
    chicken:      { bird: true, len: 0.24, h: 0.26, fur: 0xf0ece0, comb: 0xc82a2a },
    crow:         { bird: true, len: 0.26, h: 0.24, fur: 0x1a1a20, beakC: 0x2a2a2a, flies: true },
};
const FIGHTERS = new Set(['feral_boar', 'black_bear', 'grizzly_bear']);

function build(kind) {
    const K = KINDS[kind], root = new THREE.Group(), body = new THREE.Group(), parts = { legs: [] };
    root.add(body);
    const M = { fur: flat(K.fur), belly: flat(K.belly ?? K.fur), dark: flat(0x1a1410), head: flat(K.head ?? K.fur), horn: flat(0xd8ccb0) };
    const add = (geo, m, x = 0, y = 0, z = 0, parent = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    if (K.bird) {
        body.position.y = K.h * 0.55;
        add(new THREE.SphereGeometry(K.len * 0.5, 8, 6), M.fur).scale.set(0.8, 0.8, 1.2);
        parts.head = new THREE.Group(); parts.head.position.set(0, K.h * 0.35, K.len * 0.42); body.add(parts.head);
        add(new THREE.SphereGeometry(K.len * 0.28, 8, 6), M.fur, 0, 0, 0, parts.head);
        add(new THREE.ConeGeometry(0.025, 0.08, 4).rotateX(Math.PI / 2), flat(K.beakC ?? 0xe0a030), 0, -0.01, K.len * 0.3, parts.head);
        if (K.comb) add(new THREE.BoxGeometry(0.02, 0.05, 0.07), flat(K.comb), 0, K.len * 0.25, 0, parts.head);
        for (const s of [1, -1]) {
            const w = add(new THREE.BoxGeometry(0.02, K.len * 0.45, K.len * 0.75), M.fur, s * K.len * 0.38, 0.02, -0.02); parts[s > 0 ? 'wingL' : 'wingR'] = w;
            const l = new THREE.Group(); l.position.set(s * 0.04, -K.len * 0.32, 0); body.add(l);
            add(new THREE.CylinderGeometry(0.008, 0.008, K.h * 0.4, 4).translate(0, -K.h * 0.2, 0), flat(0xc8a040), 0, 0, 0, l); parts.legs.push({ g: l, ph: s > 0 ? 0 : Math.PI });
        }
        add(new THREE.BoxGeometry(K.len * 0.4, 0.02, K.len * 0.4), M.fur, 0, 0.02, -K.len * 0.55).rotation.x = -0.4;   // tail
        return { root, body, parts, K };
    }
    body.position.y = K.h;
    const torso = add(new THREE.CapsuleGeometry(K.h * 0.38, K.len * 0.75, 4, 8).rotateX(Math.PI / 2), M.fur);
    torso.scale.set(K.wool ? 1.25 : 1, K.wool ? 1.2 : 1, 1);
    add(new THREE.BoxGeometry(K.h * 0.5, K.h * 0.2, K.len * 0.7), M.belly, 0, -K.h * 0.3, 0);
    if (K.hump) add(new THREE.SphereGeometry(K.h * 0.32, 8, 6), M.fur, 0, K.h * 0.35, K.len * 0.25);
    if (K.patches) for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(K.h * 0.18, 6, 4), flat(K.patches), (i % 2 ? 1 : -1) * K.h * 0.3, K.h * 0.05 + (i % 3) * 0.05, -K.len * 0.3 + i * K.len * 0.2).scale.set(0.4, 1, 1.4);
    if (K.bristle) for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.03, 0.12, 4), M.dark, 0, K.h * 0.38, -K.len * 0.3 + i * K.len * 0.15);
    // head
    parts.head = new THREE.Group(); parts.head.position.set(0, K.h * 0.25, K.len * 0.55); body.add(parts.head);
    const hs = K.h * 0.34;
    add(new THREE.SphereGeometry(hs, 8, 6), M.head, 0, 0, 0, parts.head).scale.set(0.9, 0.9, 1.1);
    if (K.snout) add(new THREE.CylinderGeometry(hs * 0.45, hs * 0.6, K.snout + hs * 0.4, 6).rotateX(Math.PI / 2), M.head, 0, -hs * 0.2, hs * 0.85, parts.head);
    add(new THREE.SphereGeometry(hs * 0.18, 5, 4), M.dark, 0, -hs * 0.15, hs * (K.snout ? 1.4 : 0.95), parts.head);   // nose
    for (const s of [1, -1]) {
        add(new THREE.SphereGeometry(hs * 0.1, 5, 4), M.dark, s * hs * 0.45, hs * 0.25, hs * 0.7, parts.head);       // eyes
        const ear = K.ears;
        if (ear === 'long') { const e = add(new THREE.BoxGeometry(0.03, 0.16, 0.05), M.fur, s * 0.04, hs + 0.07, -0.02, parts.head); e.rotation.z = s * 0.15; }
        else if (ear === 'point') add(new THREE.ConeGeometry(hs * 0.32, hs * 0.8, 4), M.fur, s * hs * 0.5, hs * 0.9, -hs * 0.1, parts.head);
        else if (ear === 'round' || ear === 'small') add(new THREE.SphereGeometry(hs * (ear === 'round' ? 0.28 : 0.22), 6, 4), M.fur, s * hs * 0.65, hs * 0.75, -hs * 0.1, parts.head);
        else if (ear === 'flop') { const e = add(new THREE.BoxGeometry(hs * 0.5, 0.02, hs * 0.5), M.fur, s * hs * 0.6, hs * 0.6, hs * 0.2, parts.head); e.rotation.z = s * 0.6; }
        else { const e = add(new THREE.BoxGeometry(hs * 0.6, 0.03, hs * 0.3), M.head, s * hs * 0.9, hs * 0.3, -hs * 0.1, parts.head); e.rotation.z = s * -0.3; }
        if (K.tusks) { const t = add(new THREE.ConeGeometry(0.02, 0.12, 4), M.horn, s * hs * 0.4, -hs * 0.35, hs * 1.2, parts.head); t.rotation.x = -0.6; }
        if (K.horns === 'short') { const h = add(new THREE.ConeGeometry(0.03, 0.14, 4), M.horn, s * hs * 0.5, hs * 0.85, -hs * 0.1, parts.head); h.rotation.z = -s * 0.6; }
        if (K.horns === 'curve') { const h = add(new THREE.TorusGeometry(0.07, 0.02, 4, 8, Math.PI), M.horn, s * hs * 0.35, hs * 0.9, -hs * 0.3, parts.head); h.rotation.y = Math.PI / 2; }
    }
    if (K.beard) add(new THREE.ConeGeometry(0.03, 0.1, 4), M.belly, 0, -hs * 0.8, hs * 0.6, parts.head).rotation.x = Math.PI;
    // legs
    for (const [x, z, ph] of [[1, 1, 0], [-1, 1, Math.PI], [1, -1, Math.PI], [-1, -1, 0]]) {
        const g = new THREE.Group(); g.position.set(x * K.h * 0.25, -K.h * 0.25, z * K.len * 0.35); body.add(g);
        add(new THREE.CylinderGeometry(K.legs * 0.28, K.legs * 0.22, K.h * 0.78, 6).translate(0, -K.h * 0.39, 0), M.fur, 0, 0, 0, g);
        add(new THREE.CylinderGeometry(K.legs * 0.26, K.legs * 0.26, 0.05, 6), M.dark, 0, -K.h * 0.76, 0, g);
        parts.legs.push({ g, ph });
    }
    // tail
    parts.tail = new THREE.Group(); parts.tail.position.set(0, K.h * 0.15, -K.len * 0.55); body.add(parts.tail);
    if (K.tail === 'brush') { const t = add(new THREE.ConeGeometry(0.09, 0.45, 6).translate(0, -0.22, 0), M.fur, 0, 0, 0, parts.tail); t.rotation.x = -2.2; add(new THREE.SphereGeometry(0.05, 5, 4), M.belly, 0, -0.1, -0.4, parts.tail); }
    else if (K.tail === 'puff') add(new THREE.SphereGeometry(0.05, 6, 4), M.belly, 0, 0, -0.02, parts.tail);
    else if (K.tail === 'curl') add(new THREE.TorusGeometry(0.04, 0.012, 4, 8), M.fur, 0, 0, -0.02, parts.tail);
    else if (K.tail === 'thin') { const t = add(new THREE.CylinderGeometry(0.012, 0.02, K.len * 0.5, 4).translate(0, -K.len * 0.25, 0), M.fur, 0, 0, 0, parts.tail); t.rotation.x = 0.4; }
    else add(new THREE.SphereGeometry(0.05, 5, 4), M.fur, 0, 0, -0.02, parts.tail);
    return { root, body, parts, K };
}

export function createAnimals({ scene, map, rng, type, posts }) {
    return posts.map(home => createAnimal({ scene, map, rng, type, home }));
}

function createAnimal({ scene, map, rng, type, home }) {
    const d = build(type), K = d.K;
    scene.add(d.root);
    const pos = new THREE.Vector3(home.x, map.heightAt(home.x, home.z), home.z);
    const core = createEnemyCore({ type, name: NAMES[type] ?? type, pos, rng, respawnS: 40 });
    const DEF = core.DEF, s = core.s, fighter = FIGHTERS.has(type);
    const SPEED = Math.min(7, (DEF.speed / PX) * 1.6), FLEE = ((DEF.fleeRadius ?? 70) / PX) * 1.5, SIGHT = ((DEF.sightRange ?? 90) / PX) * 2.2, REACH = ((DEF.attackRange ?? 30) / PX) * 2 + K.len * 0.4;
    const ai = { state: 'idle', timer: rng() * 3, heading: rng() * 6.28, speed: 0, t: rng() * 9, cd: 1, hit: false, fly: 0 };
    const turn = (want, k) => { const df = ((((want - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI; ai.heading += df * Math.min(1, k); };

    function update(dt, ctx) {
        ai.t += dt;
        if (!core.tick(dt, ctx)) {
            d.root.rotation.z = Math.min(1, s.deadT / 0.5) * Math.PI / 2;
            d.root.visible = s.deadT < 10;
            if (!core.net.puppet && s.deadT > core.respawnS) { core.revive(); pos.set(home.x, map.heightAt(home.x, home.z), home.z); d.root.rotation.z = 0; d.root.visible = true; ai.state = 'idle'; }
            core.updatePlate(ctx.camera, K.h * 2 + 0.6);
            return;
        }
        const T = (ctx.players ?? [{ id: 'me', pos: ctx.player.pos, dead: ctx.player.dead }]).reduce((b, q) => (!q.dead && (!b || Math.hypot(q.pos.x - pos.x, q.pos.z - pos.z) < Math.hypot(b.pos.x - pos.x, b.pos.z - pos.z)) ? q : b), null) ?? { id: 'me', pos: ctx.player.pos, dead: true };
        const P = T.pos, toP = Math.hypot(P.x - pos.x, P.z - pos.z), away = Math.atan2(pos.x - P.x, pos.z - P.z), fromHome = Math.hypot(pos.x - home.x, pos.z - home.z);
        let want = 0;
        ai.cd -= dt;
        if (core.stunned()) ai.state = 'idle';
        else if (!fighter) {
            if (!T.dead && toP < FLEE && ai.state !== 'flee') { ai.state = 'flee'; ai.timer = 2.5 + rng(); if (K.flies) ai.fly = 1; }
            if (ai.state === 'flee') { turn(away, dt * 8); want = SPEED; if ((ai.timer -= dt) <= 0 && toP > FLEE) { ai.state = 'idle'; ai.timer = 2 + rng() * 3; } }
            else if (ai.state === 'idle') { if ((ai.timer -= dt) <= 0) { ai.state = 'wander'; ai.target = { x: home.x + (rng() - 0.5) * 10, z: home.z + (rng() - 0.5) * 10 }; } }
            else if (ai.state === 'wander') { turn(Math.atan2(ai.target.x - pos.x, ai.target.z - pos.z), dt * 3); want = SPEED * 0.25; if (Math.hypot(ai.target.x - pos.x, ai.target.z - pos.z) < 0.5) { ai.state = 'idle'; ai.timer = 2 + rng() * 5; } }
        } else {
            if ((ai.state === 'idle' || ai.state === 'wander') && !T.dead && toP < SIGHT) { ai.state = 'chase'; if (toP < 20) sfx.growl(); }
            if (ai.state === 'idle') { if ((ai.timer -= dt) <= 0) { ai.state = 'wander'; ai.target = { x: home.x + (rng() - 0.5) * 12, z: home.z + (rng() - 0.5) * 12 }; } }
            else if (ai.state === 'wander') { turn(Math.atan2(ai.target.x - pos.x, ai.target.z - pos.z), dt * 3); want = SPEED * 0.3; if (Math.hypot(ai.target.x - pos.x, ai.target.z - pos.z) < 0.6) { ai.state = 'idle'; ai.timer = 3 + rng() * 4; } }
            else if (ai.state === 'return') { turn(Math.atan2(home.x - pos.x, home.z - pos.z), dt * 4); want = SPEED * 0.6; if (fromHome < 1.5) { ai.state = 'idle'; s.hp = Math.min(DEF.health, s.hp + 10); } }
            else if (T.dead || fromHome > 28 || toP > SIGHT * 2) ai.state = 'return';
            else if (ai.state === 'chase') { turn(Math.atan2(P.x - pos.x, P.z - pos.z), dt * 6); if (toP > REACH) want = SPEED * (type === 'feral_boar' ? 1.2 : 1); else if (ai.cd <= 0) { ai.state = 'windup'; ai.timer = type === 'feral_boar' ? 0.35 : 0.6; ai.hit = false; } }
            else if (ai.state === 'windup') { turn(Math.atan2(P.x - pos.x, P.z - pos.z), dt * 8); if ((ai.timer -= dt) <= 0) { ai.state = 'strike'; ai.timer = 0.3; } }
            else if (ai.state === 'strike') {
                want = type === 'feral_boar' ? SPEED * 1.8 : SPEED * 0.4;
                if (!ai.hit && toP < REACH + 0.5) { ai.hit = true; const dmg = Math.round(DEF.damage); if (T.id === 'me' ? ctx.hurtPlayer(dmg, pos) : ctx.hurtRemote?.(T.id, dmg, pos)) core.onDealt(dmg); }
                if ((ai.timer -= dt) <= 0) { ai.state = 'recover'; ai.timer = 0.6; }
            } else if (ai.state === 'recover') { if ((ai.timer -= dt) <= 0) { ai.state = 'chase'; ai.cd = 1.2 + rng(); } }
        }
        s.engaged = fighter && !['idle', 'wander', 'return'].includes(ai.state);
        ai.speed += (want * core.fxMult('speedMult') - ai.speed) * Math.min(1, dt * 6);
        const px = pos.x, pz = pos.z;
        pos.x += Math.sin(ai.heading) * ai.speed * dt; pos.z += Math.cos(ai.heading) * ai.speed * dt;
        if (!K.flies || ai.fly < 0.1) { map.resolve(pos, K.len * 0.4); if (map.blockedAt(pos.x, pos.z, 0.2) === 'wall' && !map.passable(pos.x, pos.z)) { pos.x = px; pos.z = pz; ai.heading += 2; } }
        pos.y = map.heightAt(pos.x, pos.z);

        // animate
        if (K.flies) ai.fly = ai.state === 'flee' ? Math.min(1, ai.fly + dt * 2) : Math.max(0, ai.fly - dt * 0.5);
        d.root.position.set(pos.x, pos.y + ai.fly * 4, pos.z);
        d.root.rotation.y = ai.heading;
        const gait = Math.min(1, ai.speed / 1.5), ph = ai.t * (6 + ai.speed * 2.5);
        for (const L of d.parts.legs) L.g.rotation.x = Math.sin(ph + L.ph) * 0.6 * gait;
        if (K.bird) {
            const flap = ai.fly > 0.1 ? Math.sin(ai.t * 22) * 0.9 : (ai.state === 'flee' ? Math.sin(ai.t * 18) * 0.5 : 0);
            d.parts.wingL.rotation.z = flap; d.parts.wingR.rotation.z = -flap;
            d.parts.head.position.y = K.h * 0.35 + (ai.state === 'idle' ? Math.max(0, Math.sin(ai.t * 3)) * -0.08 : 0);   // pecking
        } else {
            d.body.position.y = K.h + Math.abs(Math.sin(ph)) * 0.04 * gait - (ai.state === 'windup' ? 0.1 : 0);
            d.parts.head.rotation.x = ai.state === 'idle' && (DEF.grazes || type === 'rabbit') ? 0.6 + Math.sin(ai.t) * 0.1 : ai.state === 'windup' ? 0.3 : 0;
            if (d.parts.tail) d.parts.tail.rotation.y = Math.sin(ai.t * 4) * 0.3;
        }
        core.tell(ai.state === 'windup', ai.heading, REACH);
        core.updatePlate(ctx.camera, K.h * 2 + 0.6);
    }
    return {
        pos, kind: type, root: d.root,
        get alive() { return !s.dead; },
        get engaged() { return s.engaged; },
        get debug() { return { state: ai.state, hp: s.hp }; },
        update,
        hit: (...a) => { const r = core.hit(...a); if (!s.dead) { if (fighter) ai.state = 'chase'; else { ai.state = 'flee'; ai.timer = 3; if (K.flies) ai.fly = 1; } } return r; },
        reset: () => { if (!s.dead) ai.state = fighter ? 'return' : 'idle'; },
    };
}

// Scatter a map's animals: [type, count, near?: landmark name or {x,z}, radius] — seeded by map and species so
// every client builds the same ones; only on open, walkable ground, clear of the map's spawn.
export function populate(map, scene, specs, seedFn) {
    const half = (map.mapInfo?.half ?? 60) - 8, start = map.spawns?.start ?? { x: 0, z: 0 };
    const out = [];
    for (const [type, count, near, radius] of specs) {
        const rng = seedFn(`${map.id}:${type}`);
        const lm = typeof near === 'string' ? map.mapInfo?.landmarks?.find(l => l.name === near) : near;
        const c = lm ?? { x: 0, z: 0 }, R = radius ?? half;
        const posts = [];
        for (let tries = 0; posts.length < count && tries < count * 60; tries++) {
            const x = c.x + (rng() - 0.5) * 2 * R, z = c.z + (rng() - 0.5) * 2 * R;
            if (Math.abs(x) > half || Math.abs(z) > half || Math.hypot(x - start.x, z - start.z) < 10) continue;
            if (!map.passable(x, z, map.heightAt?.(x, z) ?? 0) || map.blockedAt?.(x, z, 0.6, map.heightAt?.(x, z) ?? 0)) continue;
            if (map.wading?.(x, z)) continue;
            posts.push({ x, z });
        }
        out.push(...createAnimals({ scene, map, rng, type, posts }));
    }
    for (const a of out) a.root.userData.dynamic = true;
    map.hittables.push(...out);
    return out;
}
