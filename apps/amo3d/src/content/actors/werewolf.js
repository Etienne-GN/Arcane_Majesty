import { sfx } from '../../engine/sfx.js';
// The Guardians of the Wild — the werewolf pack of the Emerald Fields (lore DB: race Werewolf, organization
// Guardians of the Wild). Not monsters: territorial protectors who hunt Void-corruption. In the game:
//   - they patrol their ground round the den, and growl a warning when you come close (no harm meant);
//   - any corrupted creature that strays near (void-stalkers, shadow-men, root-wraiths, blight-ents, the sour
//     sentinels) is hunted down and torn apart;
//   - strike one and the whole pack turns on you, for a while — then they go back to watching.
// Upright wolf-men: digitigrade legs, a long muzzle, pricked ears, a mane, claws, a tail; grey, brown, black
// coats; the Alpha bigger, silvered. Built on the shared enemy core (health, damage, XP, codex, nameplate).
import * as THREE from 'three';
import { createEnemyCore, PX } from './enemyCore.js';

const CORRUPT = new Set(['void_stalker', 'shadow', 'root_wraith', 'blight_ent', 'corrupted_sentinel', 'mirror_shade', 'void_spawn']);
const DEF = { health: 120, damage: 14, speed: 120, sightRange: 160, attackRange: 30, xpReward: 70, goldDrop: 0, lootTable: [{ id: 'wolf_pelt', chance: 0.5 }, { id: 'forest_herb', chance: 0.3 }] };
const COATS = [[0x6a6a6e, 0x4a4a50], [0x6a4e36, 0x4a3424], [0x2a2a2e, 0x1a1a1e], [0x8a8070, 0x5a5448]];

function body(alpha, coat) {
    const root = new THREE.Group(), fur = new THREE.MeshStandardMaterial({ color: coat[0], flatShading: true, roughness: 0.95 });
    const dark = new THREE.MeshStandardMaterial({ color: coat[1], flatShading: true, roughness: 0.95 }), claw = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, flatShading: true });
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffc040 });
    const add = (geo, m, x, y, z, parent = root) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    const parts = {};
    const hips = new THREE.Group(); hips.position.y = 1.05; root.add(hips); parts.hips = hips;
    // legs: thigh forward, shin sloping back, a long wolf's foot — the digitigrade bend
    parts.legs = [];
    for (const sx of [-1, 1]) {
        const thigh = new THREE.Group(); thigh.position.set(sx * 0.2, 0, 0); hips.add(thigh);
        add(new THREE.CylinderGeometry(0.13, 0.1, 0.5, 6), fur, 0, -0.22, 0.08, thigh).rotation.x = -0.45;
        const shin = new THREE.Group(); shin.position.set(0, -0.44, 0.18); thigh.add(shin);
        add(new THREE.CylinderGeometry(0.08, 0.06, 0.45, 6), dark, 0, -0.2, -0.1, shin).rotation.x = 0.55;
        const foot = add(new THREE.BoxGeometry(0.13, 0.08, 0.32), dark, 0, -0.42, 0.02, shin);
        for (const c of [-0.04, 0.04]) add(new THREE.ConeGeometry(0.02, 0.08, 3), claw, c, -0.42, 0.2, shin).rotation.x = Math.PI / 2;
        void foot; parts.legs.push({ thigh, shin });
    }
    // a deep chest leaning forward, a mane, the tail
    const torso = new THREE.Group(); hips.add(torso); torso.rotation.x = 0.35; parts.torso = torso;
    add(new THREE.CylinderGeometry(0.34, 0.22, 0.85, 8), fur, 0, 0.42, 0, torso).scale.set(1.1, 1, 0.85);
    add(new THREE.SphereGeometry(0.36, 8, 6), dark, 0, 0.78, -0.04, torso).scale.set(1.15, 0.8, 0.95);   // the mane
    const tail = add(new THREE.ConeGeometry(0.1, 0.7, 6), fur, 0, -0.05, -0.32, hips); tail.rotation.x = -2.2; parts.tail = tail;
    // head: skull, a long muzzle, pricked ears, glowing eyes, teeth
    const neck = new THREE.Group(); neck.position.set(0, 0.92, 0.12); torso.add(neck); parts.neck = neck;
    add(new THREE.SphereGeometry(0.2, 8, 6), fur, 0, 0.08, 0, neck);
    add(new THREE.BoxGeometry(0.16, 0.14, 0.34), fur, 0, 0.02, 0.24, neck);
    add(new THREE.BoxGeometry(0.06, 0.05, 0.06), new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, 0.07, 0.42, neck);   // the nose
    add(new THREE.BoxGeometry(0.13, 0.04, 0.26), dark, 0, -0.06, 0.22, neck);   // the jaw
    for (const sx of [-1, 1]) {
        add(new THREE.ConeGeometry(0.06, 0.2, 4), dark, sx * 0.1, 0.3, -0.02, neck);
        add(new THREE.SphereGeometry(0.03, 5, 4), eyeM, sx * 0.08, 0.12, 0.14, neck);
        add(new THREE.ConeGeometry(0.012, 0.05, 3), claw, sx * 0.04, -0.03, 0.34, neck).rotation.x = Math.PI;
    }
    // long arms with clawed hands
    parts.arms = [];
    for (const sx of [-1, 1]) {
        const arm = new THREE.Group(); arm.position.set(sx * 0.38, 0.72, 0.05); torso.add(arm);
        add(new THREE.CylinderGeometry(0.1, 0.08, 0.55, 6), fur, 0, -0.27, 0, arm);
        const fore = new THREE.Group(); fore.position.y = -0.54; arm.add(fore);
        add(new THREE.CylinderGeometry(0.08, 0.06, 0.5, 6), fur, 0, -0.24, 0, fore);
        add(new THREE.BoxGeometry(0.13, 0.1, 0.12), dark, 0, -0.52, 0.02, fore);
        for (const c of [-0.04, 0, 0.04]) add(new THREE.ConeGeometry(0.015, 0.1, 3), claw, c, -0.6, 0.06, fore).rotation.x = Math.PI * 0.9;
        parts.arms.push({ arm, fore });
    }
    root.scale.setScalar(alpha ? 1.3 : 1.1);
    parts.eyes = eyeM;
    return { root, parts };
}

// A pack round a den: count werewolves, the first is the Alpha. `map.hittables` gives them corrupted prey.
export function createWerewolves({ scene, map, rng, den, count = 4 }) {
    const pack = { hostileUntil: -1, warnedAt: -99, t: 0 };
    const list = [];
    for (let i = 0; i < count; i++) {
        const alpha = i === 0, a = (i / count) * Math.PI * 2;
        const home = { x: den.x + Math.cos(a) * (alpha ? 0 : 5), z: den.z + Math.sin(a) * (alpha ? 0 : 5) };
        list.push(createWerewolf({ scene, map, rng, home, den, alpha, coat: alpha ? [0xb8b4ac, 0x6a6a6e] : COATS[i % COATS.length], pack, others: list }));
    }
    return list;
}

function createWerewolf({ scene, map, rng, home, den, alpha, coat, pack }) {
    const { root, parts } = body(alpha, coat);
    scene.add(root);
    const pos = new THREE.Vector3(home.x, map.heightAt(home.x, home.z), home.z);
    const def = alpha ? { ...DEF, health: 200, damage: 20, xpReward: 120 } : DEF;
    const core = createEnemyCore({ type: 'werewolf', name: alpha ? 'The Alpha' : 'Guardian of the Wild', pos, rng, respawnS: 60, def });
    const s = core.s, REACH = 1.9, SPEED = Math.min(6.5, (def.speed / PX) * 1.4);
    const ai = { state: 'patrol', target: null, prey: null, heading: rng() * 6.28, speed: 0, cd: 1, timer: rng() * 4, t: rng() * 10, hit: false };
    const navKey = {};
    const turn = (want, k) => { const d = ((((want - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI; ai.heading += d * Math.min(1, k); };
    const hostile = () => pack.t < pack.hostileUntil;

    function update(dt, ctx) {
        ai.t += dt; pack.t = Math.max(pack.t, ai.t);
        if (!core.tick(dt, ctx)) {
            const k = Math.min(1, s.deadT / 0.6);
            root.rotation.z = (Math.PI / 2) * k; root.position.y = map.heightAt(pos.x, pos.z); root.visible = s.deadT < 10;
            if (s.deadT > core.respawnS) { core.revive(); pos.set(home.x, map.heightAt(home.x, home.z), home.z); root.rotation.z = 0; root.visible = true; ai.state = 'patrol'; }
            core.updatePlate(ctx.camera, 2.9);
            return;
        }
        const P = ctx.player.pos, toP = Math.hypot(P.x - pos.x, P.z - pos.z), angP = Math.atan2(P.x - pos.x, P.z - pos.z);
        ai.cd -= dt;
        let want = 0;
        // Who to go for: you (if the pack is angry), else corruption that strays onto their ground.
        if (!hostile() && (!ai.prey || !ai.prey.alive)) {
            ai.prey = null;
            for (const h of map.hittables ?? []) if (h.alive && CORRUPT.has(h.kind) && Math.hypot(h.pos.x - den.x, h.pos.z - den.z) < 34 && Math.hypot(h.pos.x - pos.x, h.pos.z - pos.z) < 26) { ai.prey = h; break; }
        }
        const foe = hostile() && !ctx.player.dead ? { pos: P, me: true } : ai.prey ? { pos: ai.prey.pos, me: false } : null;
        if (foe) {
            const to = Math.hypot(foe.pos.x - pos.x, foe.pos.z - pos.z), ang = Math.atan2(foe.pos.x - pos.x, foe.pos.z - pos.z);
            if (ai.state === 'windup') { turn(ang, dt * 8); if ((ai.timer -= dt) <= 0) { ai.state = 'strike'; ai.timer = 0.25; ai.hit = false; } }
            else if (ai.state === 'strike') {
                want = SPEED * 0.8;
                if (!ai.hit && to < REACH + 0.6) {
                    ai.hit = true;
                    if (foe.me) { if (ctx.hurtPlayer(def.damage, pos)) core.onDealt(def.damage); }
                    else ai.prey.hit(Math.round(def.damage * 1.4), pos, 0, ctx, null, null, 'guardians');   // their kill, not yours
                }
                if ((ai.timer -= dt) <= 0) { ai.state = 'chase'; ai.cd = 0.9 + rng() * 0.6; }
            } else {
                ai.state = 'chase';
                const g = to > REACH + 1 && map.nav ? map.nav.aim(pos, foe.pos, navKey, dt) : foe.pos;
                turn(Math.atan2(g.x - pos.x, g.z - pos.z), dt * 7);
                if (to > REACH) want = SPEED; else if (ai.cd <= 0) { ai.state = 'windup'; ai.timer = 0.35; sfx.growl(); }
            }
        } else {
            // Patrol their ground; watch you, and warn you off if you come close.
            if (ai.state === 'chase' || ai.state === 'windup' || ai.state === 'strike') { ai.state = 'patrol'; ai.target = null; }
            if (toP < 9 && !ctx.player.dead) {
                ai.state = 'watch'; turn(angP, dt * 4);
                if (alpha && pack.t - pack.warnedAt > 25) { pack.warnedAt = pack.t; sfx.growl(); ctx.message?.('The pack stops and watches you. The Alpha growls low — this is their ground. Walk on, and leave them in peace.'); }
            } else {
                if (ai.state === 'watch') ai.state = 'patrol';
                if (!ai.target || (ai.timer -= dt) <= 0) { const a = rng() * 6.28, r = 3 + rng() * 14; ai.target = { x: den.x + Math.cos(a) * r, z: den.z + Math.sin(a) * r }; ai.timer = 5 + rng() * 6; }
                const d = Math.hypot(ai.target.x - pos.x, ai.target.z - pos.z);
                if (d > 0.8) { turn(Math.atan2(ai.target.x - pos.x, ai.target.z - pos.z), dt * 3); want = SPEED * 0.3; }
            }
        }
        s.engaged = !!foe && foe.me;
        ai.speed += (want * core.fxMult('speedMult') - ai.speed) * Math.min(1, dt * 6);
        const px = pos.x, pz = pos.z;
        pos.x += Math.sin(ai.heading) * ai.speed * dt; pos.z += Math.cos(ai.heading) * ai.speed * dt;
        map.resolve(pos, 0.5);
        if (map.blockedAt(pos.x, pos.z, 0.45) === 'wall' && !map.passable(pos.x, pos.z)) { pos.x = px; pos.z = pz; }
        if (foe?.me) { const d = Math.hypot(pos.x - P.x, pos.z - P.z); if (d < 0.9 && d > 1e-4) { pos.x = P.x + (pos.x - P.x) / d * 0.9; pos.z = P.z + (pos.z - P.z) / d * 0.9; } }
        pos.y = map.heightAt(pos.x, pos.z);

        // Animate: a loping walk on wolf's legs, arms swinging, the tail; claws raised on the wind-up.
        root.position.copy(pos); root.rotation.y = ai.heading;
        const run = Math.min(1, ai.speed / 3), ph = ai.t * (6 + run * 5);
        parts.legs.forEach((l, i) => { const k = Math.sin(ph + i * Math.PI); l.thigh.rotation.x = k * 0.6 * run; l.shin.rotation.x = Math.max(0, -k) * 0.6 * run; });
        const tell = ai.state === 'windup', strike = ai.state === 'strike';
        parts.arms.forEach((a, i) => { a.arm.rotation.x = tell ? -2.4 : strike ? -0.3 : Math.sin(ph + i * Math.PI) * 0.5 * run - 0.2; a.fore.rotation.x = tell ? -0.6 : -0.4; });
        parts.torso.rotation.x = 0.35 + run * 0.25 + (strike ? 0.25 : 0);
        parts.neck.rotation.x = ai.state === 'watch' ? -0.25 : 0;
        parts.tail.rotation.y = Math.sin(ai.t * 3) * 0.3;
        parts.hips.position.y = 1.05 + Math.abs(Math.sin(ph)) * 0.05 * run;
        parts.eyes.color.setRGB(tell || hostile() ? 2 : 1, tell || hostile() ? 0.6 : 0.75, 0.25);
        core.updatePlate(ctx.camera, alpha ? 3.4 : 2.9);
    }

    return {
        pos, kind: 'werewolf', root, elite: null,
        get alive() { return !s.dead; },
        get engaged() { return s.engaged; },
        get debug() { return { state: ai.state, hp: s.hp, hostile: hostile(), prey: ai.prey?.kind ?? null }; },
        update,
        // Struck by you: the whole pack turns on you for a minute.
        hit: (...a) => { const attacker = a[6]; if (!attacker) { if (!hostile()) { core.lastCtx?.message?.('The pack turns on you!'); } pack.hostileUntil = pack.t + 60; } return core.hit(...a); },
        net: core.net, snapshot: () => null, applySnapshot: () => {}, credit: () => core.reward(core.lastCtx), reset: () => { pack.hostileUntil = -1; },
    };
}
