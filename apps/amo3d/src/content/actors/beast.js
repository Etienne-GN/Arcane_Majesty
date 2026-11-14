// Creatures for any amo ENEMY_TYPES entry that has a body here — built on the shared enemy core
// (stats, affinities, statuses, XP, loot, nameplate, respawn). Bodies:
//   gloom_beak  — a dark eagle that circles high, then dives at you
//   frost_shade — a pale wraith of ice, nearly invisible against the snow until it is close
//   crag_fiend  — a hulking stone brute, slow, hits hard
// AI: idle / wander near home → notice → close in (pathfinding) → wind-up (a tell) → strike → recover.
import * as THREE from 'three';
import { createEnemyCore, PX } from './enemyCore.js';
import { flat } from '../../engine/lib.js';
import { elites as EL } from '@rules';

const NAMES = { gloom_beak: 'Gloom-Beak', frost_shade: 'Frost-Shade', crag_fiend: 'Crag-Fiend', void_stalker: 'Void-Stalker', blight_ent: 'Blight-Ent', root_wraith: 'Root-Wraith', corrupted_sentinel: 'Corrupted Sentinel' };
const TUNE = { sight: 2.6, reach: 2, speed: 1.4 };

function body(type) {
    const root = new THREE.Group(), parts = {};
    const add = (geo, m, x = 0, y = 0, z = 0, parent = root) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    if (type === 'gloom_beak') {
        const M = flat(0x2a3446), wingM = flat(0x1c2230, { side: THREE.DoubleSide }), beak = flat(0xc8a03a);
        const b = add(new THREE.SphereGeometry(0.32, 8, 6), M); b.scale.set(0.8, 0.7, 1.4);
        add(new THREE.SphereGeometry(0.17, 8, 6), M, 0, 0.12, 0.42);
        add(new THREE.ConeGeometry(0.06, 0.2, 5).rotateX(Math.PI / 2), beak, 0, 0.08, 0.62);
        for (const s of [1, -1]) {
            const pivot = new THREE.Group(); pivot.position.set(s * 0.2, 0.08, 0); root.add(pivot);
            const w = add(new THREE.PlaneGeometry(1.3, 0.55).translate(s * 0.65, 0, 0).rotateX(-Math.PI / 2), wingM, 0, 0, 0, pivot);
            w.castShadow = true;
            parts[s > 0 ? 'wingL' : 'wingR'] = pivot;
        }
        add(new THREE.ConeGeometry(0.16, 0.45, 4).rotateX(-Math.PI / 2), M, 0, 0, -0.55);
        parts.eyes = add(new THREE.BoxGeometry(0.18, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd040, toneMapped: false }), 0, 0.17, 0.56);
    } else if (type === 'frost_shade') {
        const M = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, emissive: 0x6ab0ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.35, flatShading: true, depthWrite: false });
        parts.mat = M;
        add(new THREE.ConeGeometry(0.42, 1.5, 7, 1, true).translate(0, 0.75, 0), M);
        add(new THREE.SphereGeometry(0.2, 8, 6), M, 0, 1.65, 0);
        for (const s of [1, -1]) { const a = add(new THREE.ConeGeometry(0.08, 0.8, 5), M, s * 0.38, 1.1, 0.1); a.rotation.z = s * 2.4; }
        parts.eyes = add(new THREE.BoxGeometry(0.2, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0x9ae8ff, toneMapped: false, transparent: true }), 0, 1.68, 0.18);
    } else if (type === 'void_stalker') {   // a low, lean shadow-hound with violet spines
        const M = flat(0x1e1828), spine = new THREE.MeshStandardMaterial({ color: 0x5a2a8a, emissive: 0x6a2aaa, emissiveIntensity: 0.8, flatShading: true });
        const b = add(new THREE.CylinderGeometry(0.28, 0.22, 1.2, 7).rotateX(Math.PI / 2), M, 0, 0.75, 0); b.scale.set(0.9, 0.8, 1);
        add(new THREE.ConeGeometry(0.22, 0.6, 6).rotateX(Math.PI / 2), M, 0, 0.82, 0.8);
        for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.06, 0.32, 4), spine, 0, 1.02, -0.45 + i * 0.22).rotation.x = -0.4;
        for (const [x, z] of [[0.18, 0.4], [-0.18, 0.4], [0.18, -0.4], [-0.18, -0.4]]) add(new THREE.CylinderGeometry(0.06, 0.04, 0.6, 5), M, x, 0.3, z);
        add(new THREE.ConeGeometry(0.08, 0.6, 4).rotateX(-1.9), M, 0, 0.85, -0.75);
        parts.eyes = add(new THREE.BoxGeometry(0.22, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xc86aff, toneMapped: false }), 0, 0.92, 1.0);
        parts.legs = root.children.filter(o => o.position.y === 0.3);
    } else if (type === 'blight_ent') {   // an ancient tree fused with rot: grey-brown trunk, sick canopy, branch arms
        const bark = flat(0x5a4a3a), rot = flat(0x4a5a2a), spot = new THREE.MeshStandardMaterial({ color: 0x8a4aaa, emissive: 0x5a2a7a, emissiveIntensity: 0.6, flatShading: true });
        add(new THREE.CylinderGeometry(0.42, 0.62, 2.2, 7), bark, 0, 1.1, 0);
        for (const [x, y, z, r] of [[0, 2.6, 0, 0.9], [-0.5, 2.3, 0.2, 0.6], [0.55, 2.4, -0.1, 0.65]]) add(new THREE.IcosahedronGeometry(r, 0), rot, x, y, z);
        for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(0.09, 5, 4), spot, Math.cos(k * 1.1) * 0.75, 2.3 + (k % 3) * 0.2, Math.sin(k * 1.1) * 0.7);
        for (const s of [1, -1]) {
            const arm = new THREE.Group(); arm.position.set(s * 0.5, 1.75, 0); root.add(arm);
            const a = add(new THREE.CylinderGeometry(0.1, 0.16, 1.2, 5), bark, s * 0.25, -0.5, 0.1, arm); a.rotation.z = s * 0.4;
            add(new THREE.ConeGeometry(0.14, 0.4, 4), bark, s * 0.5, -1.15, 0.15, arm);
            parts[s > 0 ? 'armL' : 'armR'] = arm;
            const r = add(new THREE.ConeGeometry(0.16, 0.6, 4), bark, s * 0.45, 0.2, 0.1); r.rotation.z = s * 2.6;   // roots
        }
        parts.eyes = add(new THREE.BoxGeometry(0.32, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xc8ff5a, toneMapped: false }), 0, 1.75, 0.45);
    } else if (type === 'root_wraith') {   // a small, fast knot of living vine, drifting low
        const vine = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, emissive: 0x1a4a1a, emissiveIntensity: 0.5, flatShading: true });
        parts.knot = add(new THREE.TorusKnotGeometry(0.22, 0.07, 40, 5, 2, 3), vine, 0, 0.6, 0);
        for (let k = 0; k < 5; k++) { const t = add(new THREE.ConeGeometry(0.04, 0.55, 4), vine, Math.cos(k * 1.26) * 0.2, 0.3, Math.sin(k * 1.26) * 0.2); t.rotation.set(Math.PI + Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5); }
        parts.eyes = add(new THREE.BoxGeometry(0.14, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xe8ff8a, toneMapped: false }), 0, 0.66, 0.26);
    } else if (type === 'corrupted_sentinel') {   // a guardian statue gone sour: weathered stone, violet cracks
        const stone = flat(0x7a7680), dark = flat(0x4a4650), crack = new THREE.MeshBasicMaterial({ color: 0xa86aff, toneMapped: false });
        add(new THREE.BoxGeometry(1.0, 1.2, 0.6), stone, 0, 1.5, 0);
        add(new THREE.BoxGeometry(0.55, 0.55, 0.5), stone, 0, 2.4, 0.02);
        add(new THREE.BoxGeometry(1.2, 0.25, 0.75), dark, 0, 2.15, 0);
        for (const [x, y] of [[-0.2, 1.6], [0.15, 1.3], [0.05, 1.9]]) add(new THREE.BoxGeometry(0.04, 0.4, 0.02), crack, x, y, 0.31).rotation.z = x * 3;
        for (const s of [1, -1]) {
            const arm = new THREE.Group(); arm.position.set(s * 0.7, 2.0, 0); root.add(arm);
            add(new THREE.BoxGeometry(0.32, 0.9, 0.32), stone, 0, -0.45, 0, arm);
            add(new THREE.BoxGeometry(0.42, 0.42, 0.42), dark, 0, -1.0, 0.05, arm);
            parts[s > 0 ? 'armL' : 'armR'] = arm;
            add(new THREE.BoxGeometry(0.36, 0.9, 0.4), dark, s * 0.26, 0.45, 0);
        }
        parts.eyes = add(new THREE.BoxGeometry(0.34, 0.05, 0.02), crack, 0, 2.45, 0.28);
    } else {   // crag_fiend
        const M = flat(0x5a6458), dark = flat(0x3a4038);
        const t = add(new THREE.DodecahedronGeometry(0.75, 0), M, 0, 1.4, 0); t.scale.set(1.1, 1.0, 0.85);
        add(new THREE.DodecahedronGeometry(0.32, 0), dark, 0, 2.25, 0.2);
        for (const s of [1, -1]) {
            const arm = new THREE.Group(); arm.position.set(s * 0.85, 1.75, 0); root.add(arm);
            add(new THREE.DodecahedronGeometry(0.38, 0), M, 0, -0.55, 0, arm);
            add(new THREE.DodecahedronGeometry(0.42, 0), dark, 0, -1.1, 0.1, arm);
            parts[s > 0 ? 'armL' : 'armR'] = arm;
            add(new THREE.CylinderGeometry(0.28, 0.32, 0.8, 6), dark, s * 0.38, 0.4, 0);
        }
        parts.eyes = add(new THREE.BoxGeometry(0.3, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xff7a2a, toneMapped: false }), 0, 2.3, 0.5);
    }
    return { root, parts };
}

// amo's elites: at most one per six spawns, each spawn an 8% chance (eliteCap / rollElite / pickAffixes);
// rareFrom: the map definition whose gathering pools give the elite's rare drop (eliteRareDrop).
export function createBeasts({ scene, map, rng, type, posts, rareFrom = null }) {
    const cap = EL.eliteCap(posts.length);
    let count = 0;
    return posts.map(post => {
        const elite = EL.rollElite(rng, count, cap) ? (count++, { affixes: EL.pickAffixes(rng), rareDrop: EL.eliteRareDrop(rareFrom, rng) }) : null;
        return createBeast({ scene, map, rng, type, home: post, elite });
    });
}

function createBeast({ scene, map, rng, type, home, elite = null }) {
    const { root, parts } = body(type);
    scene.add(root);
    if (elite) root.scale.setScalar(1.2);
    const pos = new THREE.Vector3(home.x, map.heightAt(home.x, home.z), home.z);
    const core = createEnemyCore({ type, name: NAMES[type] ?? type, pos, rng, respawnS: 30, elite });
    const DEF = core.DEF, s = core.s;
    const SIGHT = (DEF.sightRange / PX) * TUNE.sight, REACH = (DEF.attackRange / PX) * TUNE.reach + (['crag_fiend', 'blight_ent', 'corrupted_sentinel'].includes(type) ? 0.6 : 0);
    const SPEED = Math.min(6.5, (DEF.speed / PX) * TUNE.speed);
    const ai = { state: 'idle', timer: rng() * 3, heading: rng() * 6.28, speed: 0, cd: 1 + rng(), t: rng() * 10, target: null, hit: false };
    const navKey = {};
    const flyer = type === 'gloom_beak';
    const turn = (want, k) => { const d = ((((want - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI; ai.heading += d * Math.min(1, k); };

    function update(dt, ctx) {
        ai.t += dt;
        if (!core.tick(dt, ctx)) {   // dead: topple / fall, then respawn at home
            const k = Math.min(1, s.deadT / 0.6);
            root.rotation.z = (Math.PI / 2) * k;
            root.position.y = map.heightAt(pos.x, pos.z) + (flyer ? 0.2 : 0);
            root.visible = s.deadT < 10;
            if (s.deadT > core.respawnS) { core.revive(); pos.set(home.x, map.heightAt(home.x, home.z), home.z); root.rotation.z = 0; root.visible = true; ai.state = 'idle'; }
            core.updatePlate(ctx.camera, flyer ? 3.4 : 2.8);
            return;
        }
        const P = ctx.player.pos, toP = Math.hypot(P.x - pos.x, P.z - pos.z), ang = Math.atan2(P.x - pos.x, P.z - pos.z);
        const fromHome = Math.hypot(pos.x - home.x, pos.z - home.z);
        ai.cd -= dt;
        let want = 0;
        if (core.stunned()) { if (ai.state === 'windup' || ai.state === 'strike') ai.state = 'chase'; }
        else if (ai.state === 'idle' || ai.state === 'wander') {
            if (!ctx.player.dead && toP < SIGHT) { ai.state = 'notice'; ai.timer = 0.5; }
            else if (ai.state === 'idle' && (ai.timer -= dt) <= 0) { const a = rng() * 6.28, r = 2 + rng() * 6; ai.target = { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r }; ai.state = 'wander'; }
            else if (ai.state === 'wander') { turn(Math.atan2(ai.target.x - pos.x, ai.target.z - pos.z), dt * 3); want = SPEED * 0.35; if (Math.hypot(ai.target.x - pos.x, ai.target.z - pos.z) < 0.8) { ai.state = 'idle'; ai.timer = 2 + rng() * 3; } }
        } else if (ai.state === 'notice') { turn(ang, dt * 8); if ((ai.timer -= dt) <= 0) ai.state = 'chase'; }
        else if (ai.state === 'return') { const h = map.nav ? map.nav.aim(pos, home, navKey, dt) : home; turn(Math.atan2(h.x - pos.x, h.z - pos.z), dt * 5); want = SPEED * 0.7; if (fromHome < 1.5) { ai.state = 'idle'; s.hp = Math.min(DEF.health, s.hp + 10); } }
        else if (ctx.player.dead || fromHome > 30 || toP > SIGHT * 2) ai.state = 'return';
        else if (ai.state === 'chase') {
            const g = toP > REACH + 1 && map.nav && !flyer ? map.nav.aim(pos, P, navKey, dt) : P;
            turn(Math.atan2(g.x - pos.x, g.z - pos.z), dt * 7);
            if (toP > REACH) want = SPEED;
            else if (ai.cd <= 0) { ai.state = 'windup'; ai.timer = ['crag_fiend', 'blight_ent', 'corrupted_sentinel'].includes(type) ? 0.7 : 0.4; ai.hit = false; }
        } else if (ai.state === 'windup') { turn(ang, dt * 8); if ((ai.timer -= dt) <= 0) { ai.state = 'strike'; ai.timer = 0.3; } }
        else if (ai.state === 'strike') {
            want = flyer ? SPEED * 1.6 : SPEED * 0.6;
            if (!ai.hit && toP < REACH + 0.6) { ai.hit = true; const d = Math.round(DEF.damage * (ctx.voidMult ?? 1)); if (ctx.hurtPlayer(d, pos)) core.onDealt(d); }
            if ((ai.timer -= dt) <= 0) { ai.state = 'recover'; ai.timer = 0.6; }
        } else if (ai.state === 'recover') { if ((ai.timer -= dt) <= 0) { ai.state = 'chase'; ai.cd = 1.4 + rng() * 1.2; } }
        s.engaged = !['idle', 'wander', 'return'].includes(ai.state);

        ai.speed += (want * core.fxMult('speedMult') - ai.speed) * Math.min(1, dt * 6);
        const px = pos.x, pz = pos.z;
        pos.x += Math.sin(ai.heading) * ai.speed * dt;
        pos.z += Math.cos(ai.heading) * ai.speed * dt;
        if (!flyer) { map.resolve(pos, 0.5); if (map.blockedAt(pos.x, pos.z, 0.4) === 'wall' && !map.passable(pos.x, pos.z)) { pos.x = px; pos.z = pz; } }
        const d = Math.hypot(pos.x - P.x, pos.z - P.z);
        if (d < 0.8 && d > 1e-4) { pos.x = P.x + (pos.x - P.x) / d * 0.8; pos.z = P.z + (pos.z - P.z) / d * 0.8; }
        pos.y = map.heightAt(pos.x, pos.z);

        // Animate.
        root.position.copy(pos);
        root.rotation.y = ai.heading;
        const tell = ai.state === 'windup';
        if (flyer) {   // circle high, drop to dive
            const alt = ai.state === 'strike' ? 1.0 : tell ? 2.0 : 3.2 + Math.sin(ai.t * 1.3) * 0.4;
            root.position.y = pos.y + alt;
            const flap = Math.sin(ai.t * (tell ? 4 : 9)) * (ai.state === 'strike' ? 0.15 : 0.6);
            parts.wingL.rotation.z = flap; parts.wingR.rotation.z = -flap;
            root.rotation.x = ai.state === 'strike' ? 0.5 : tell ? -0.3 : 0;
        } else if (type === 'frost_shade') {   // drift, and show itself only up close
            root.position.y = pos.y + 0.25 + Math.sin(ai.t * 2) * 0.12;
            parts.mat.opacity = Math.max(0.12, Math.min(0.6, 0.6 - (toP - 3) * 0.05)) + (tell ? 0.25 : 0) + s.flash;
            parts.mat.emissiveIntensity = 0.4 + (tell ? 1.4 : 0);
        } else if (type === 'void_stalker') {   // a crouch before the lunge
            root.position.y = pos.y - (tell ? 0.15 : 0);
            root.rotation.x = ai.state === 'strike' ? -0.2 : tell ? 0.15 : 0;
            parts.legs.forEach((l, i) => { l.rotation.x = Math.sin(ai.t * 10 + i * Math.PI / 2) * 0.5 * Math.min(1, ai.speed / 2); });
        } else if (type === 'root_wraith') {   // drift low and spin; coil up before the lash
            root.position.y = pos.y + 0.15 + Math.sin(ai.t * 4) * 0.08;
            parts.knot.rotation.y += dt * (tell ? 9 : 3);
            parts.knot.scale.setScalar(tell ? 0.8 : 1);
        } else {   // the brute's arms rise on the wind-up and slam (crag-fiend, blight-ent, sentinel)
            const lift = tell ? -2.2 * Math.min(1, 1 - ai.timer / 0.7) : ai.state === 'strike' ? 0.3 : Math.sin(ai.t * 2.4) * 0.15 * Math.min(1, ai.speed);
            parts.armL.rotation.x = lift; parts.armR.rotation.x = lift;
            root.position.y = pos.y + Math.abs(Math.sin(ai.t * 4)) * 0.06 * Math.min(1, ai.speed);
        }
        parts.eyes.material.color?.setRGB?.(tell ? 2 : 1, tell ? 1.4 : 1, tell ? 0.6 : 1);
        core.updatePlate(ctx.camera, flyer ? 4.2 : type === 'crag_fiend' ? 3.0 : 2.4);
    }

    return {
        pos, kind: type, root, elite,
        get alive() { return !s.dead; },
        get engaged() { return s.engaged; },
        get debug() { return { state: ai.state, hp: s.hp }; },
        update,
        hit: (...a) => { const r = core.hit(...a); if (!s.dead && (ai.state === 'idle' || ai.state === 'wander')) ai.state = 'chase'; return r; },
        reset: () => { if (!s.dead) { ai.state = 'return'; s.fx = {}; } },
    };
}
