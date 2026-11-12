// Shadow Soldiers: shadow-made humans in a soldier's shape — sword, kite shield, translucent
// black with a violet rim, red eyes, dark fumes pouring off them.
// Stats are amo's ENEMY_TYPES.mirror_shade (a Void-touched shade); fire damage goes through
// amo's affinity table, burning through amo's STATUS_DEFS.
import * as THREE from 'three';
import { ENEMY_TYPES } from '@amo/data/worldMap.js';
import { affinityMult, affinityOf } from '@amo/data/enemyAffinities.js';
import { STATUS_DEFS } from '@amo/data/statuses.js';
import { Particles } from './lib.js';

const TYPE = 'mirror_shade';
const DEF = ENEMY_TYPES[TYPE];
const PX = 32;
// 2D screen distances feel short in 3D (same tuning idea as the fireball).
const TUNE = { sight: 3, reach: 2, speed: 1.6 };
const SIGHT = (DEF.sightRange / PX) * TUNE.sight;          // ~12 m
const REACH = (DEF.attackRange / PX) * TUNE.reach;         // ~1.9 m
const CHASE = (DEF.speed / PX) * TUNE.speed;               // ~3.5 m/s
const WINDUP = 0.5, SWING = 0.18, RECOVER = 0.55;

// Translucent shadow with a violet Fresnel rim.
function shadowMaterial() {
    const m = new THREE.MeshStandardMaterial({
        color: 0x050408, roughness: 0.75, metalness: 0.0, flatShading: true, transparent: true, opacity: 0.86,
    });
    m.userData.rim = { value: new THREE.Color(0x6a35c8) };
    m.onBeforeCompile = sh => {
        sh.uniforms.uRim = m.userData.rim;
        sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
            .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                float rimK = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.2);
                totalEmissiveRadiance += uRim * rimK;
                diffuseColor.rgb *= 0.35;   // light barely sticks to shadow`);
    };
    return m;
}

function limb(len, r0, r1, m) {
    const j = new THREE.Group();
    j.add(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 7).translate(0, -len / 2, 0), m));
    return j;
}
const part = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); return o; };

function buildSoldier() {
    const M = {
        body: shadowMaterial(),
        plate: shadowMaterial(),
        eye: new THREE.MeshBasicMaterial({ color: 0xff2a3c, toneMapped: false }),
        edge: new THREE.MeshBasicMaterial({ color: 0x9a6aff, toneMapped: false, transparent: true, opacity: 0.85 }),
        sigil: new THREE.MeshBasicMaterial({ color: 0x8a4aff, toneMapped: false, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
        cloth: shadowMaterial(),
    };
    M.plate.color.set(0x0c0a10);
    M.cloth.side = THREE.DoubleSide;
    M.cloth.opacity = 0.75;

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const hips = new THREE.Group();
    hips.position.y = 0.97;
    body.add(hips);
    hips.add(part(new THREE.CylinderGeometry(0.18, 0.17, 0.2, 8), M.body));

    const legs = {};
    for (const [side, x] of [['L', 0.11], ['R', -0.11]]) {
        const thigh = limb(0.46, 0.09, 0.075, M.body);
        thigh.position.set(x, -0.03, 0);
        const shin = limb(0.46, 0.075, 0.06, M.body);
        shin.position.y = -0.46;
        shin.add(part(new THREE.CylinderGeometry(0.085, 0.075, 0.3, 7), M.plate, 0, -0.2, 0.01));     // greave
        shin.add(part(new THREE.BoxGeometry(0.14, 0.11, 0.27), M.plate, 0, -0.45, 0.04));
        shin.add(part(new THREE.SphereGeometry(0.06, 6, 4), M.plate, 0, 0, 0.04));                      // knee
        thigh.add(shin);
        hips.add(thigh);
        legs[side] = { thigh, shin };
    }
    // Tattered tabard strips front and back.
    const strips = [];
    for (const [z, flip] of [[0.17, 0], [-0.17, 1]]) {
        for (const x of [-0.09, 0, 0.09]) {
            const len = 0.5 + Math.random() * 0.18;
            const g = new THREE.PlaneGeometry(0.1, len, 1, 4).translate(0, -len / 2, 0);
            const s = part(g, M.cloth, x, 0.02, z);
            if (flip) s.rotation.y = Math.PI;
            hips.add(s);
            strips.push({ s, base: g.attributes.position.array.slice(), g, ph: Math.random() * 6, back: !!flip });
        }
    }

    const spine = new THREE.Group();
    spine.position.y = 0.07;
    hips.add(spine);
    const chest = new THREE.CylinderGeometry(0.24, 0.19, 0.58, 9).translate(0, 0.29, 0);
    chest.scale(1, 1, 0.75);
    spine.add(new THREE.Mesh(chest, M.plate));
    spine.add(part(new THREE.BoxGeometry(0.06, 0.4, 0.04), M.body, 0, 0.3, 0.17));                     // breastplate ridge
    spine.add(part(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 9), M.body, 0, 0.03, 0));               // belt
    for (const s of [1, -1]) {
        const p = part(new THREE.SphereGeometry(0.14, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), M.plate, s * 0.27, 0.52, 0);
        p.scale.set(1.1, 0.75, 1.1);
        p.rotation.z = -s * 0.35;
        spine.add(p);
        const ridge = part(new THREE.BoxGeometry(0.03, 0.04, 0.24), M.plate, s * 0.3, 0.6, 0);
        ridge.rotation.z = -s * 0.35;
        spine.add(ridge);
    }

    // Helmet with a crest, a dark visor slot and red eyes.
    const head = new THREE.Group();
    head.position.y = 0.62;
    spine.add(head);
    head.add(part(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 7), M.body, 0, 0.02, 0));
    const helm = part(new THREE.SphereGeometry(0.135, 10, 8), M.plate, 0, 0.15, 0);
    helm.scale.set(0.95, 1.1, 1.05);
    head.add(helm);
    head.add(part(new THREE.BoxGeometry(0.03, 0.08, 0.3), M.plate, 0, 0.29, -0.01));                  // crest
    head.add(part(new THREE.BoxGeometry(0.24, 0.035, 0.05), M.body, 0, 0.14, 0.12));                  // visor slot
    const cheek = part(new THREE.BoxGeometry(0.22, 0.1, 0.06), M.plate, 0, 0.07, 0.115);
    head.add(cheek);
    const eyes = [];
    for (const s of [1, -1]) {
        const e = part(new THREE.BoxGeometry(0.045, 0.016, 0.02), M.eye, s * 0.045, 0.142, 0.143);
        e.rotation.z = s * -0.2;
        head.add(e);
        eyes.push(e);
    }

    const arms = {};
    for (const [side, x] of [['L', 0.27], ['R', -0.27]]) {
        const upper = limb(0.31, 0.07, 0.06, M.body);
        upper.position.set(x, 0.5, 0);
        const fore = limb(0.29, 0.06, 0.05, M.body);
        fore.position.y = -0.31;
        upper.add(fore);
        fore.add(part(new THREE.CylinderGeometry(0.07, 0.062, 0.18, 7), M.plate, 0, -0.17, 0));          // vambrace
        fore.add(part(new THREE.BoxGeometry(0.09, 0.09, 0.1), M.plate, 0, -0.32, 0));                    // gauntlet
        spine.add(upper);
        arms[side] = { upper, fore };
    }

    // Sword in the right hand: dark blade with a violet edge.
    const sword = new THREE.Group();
    sword.position.set(0, -0.32, 0.02);
    arms.R.fore.add(sword);
    sword.add(part(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6), M.body, 0, 0.0, 0));            // grip
    sword.add(part(new THREE.SphereGeometry(0.03, 6, 4), M.plate, 0, -0.11, 0));                      // pommel
    sword.add(part(new THREE.BoxGeometry(0.24, 0.035, 0.05), M.plate, 0, 0.11, 0));                   // crossguard
    sword.add(part(new THREE.BoxGeometry(0.06, 0.88, 0.014), M.plate, 0, 0.56, 0));                   // blade
    const tip = part(new THREE.ConeGeometry(0.043, 0.13, 4), M.plate, 0, 1.06, 0);
    tip.scale.z = 0.3;
    sword.add(tip);
    const edge = part(new THREE.BoxGeometry(0.075, 0.9, 0.006), M.edge, 0, 0.57, 0);
    sword.add(edge);

    // Kite shield on the left forearm, a glowing sigil on its face.
    const shield = new THREE.Group();
    shield.position.set(0.06, -0.16, 0.05);
    arms.L.fore.add(shield);
    const kite = new THREE.Shape();
    kite.moveTo(0, 0.32); kite.quadraticCurveTo(0.24, 0.3, 0.24, 0.12); kite.quadraticCurveTo(0.2, -0.22, 0, -0.42);
    kite.quadraticCurveTo(-0.2, -0.22, -0.24, 0.12); kite.quadraticCurveTo(-0.24, 0.3, 0, 0.32);
    const shieldMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(kite, { depth: 0.04, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }), M.plate);
    shieldMesh.rotation.y = Math.PI / 2;
    shield.add(shieldMesh);
    const sigil = new THREE.Mesh(new THREE.RingGeometry(0.07, 0.095, 20), M.sigil);
    sigil.position.set(0.07, 0, 0);
    sigil.rotation.y = Math.PI / 2;
    shield.add(sigil);
    const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.24), M.sigil);
    rune.position.set(0.07, -0.05, 0);
    rune.rotation.y = Math.PI / 2;
    shield.add(rune);

    root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const fumeParts = [];
    root.traverse(o => { if (o.isMesh && (o.material === M.body || o.material === M.plate)) fumeParts.push(o); });
    return { root, body, hips, spine, head, legs, arms, sword, shield, strips, eyes, M, fumeParts, edge };
}

export function createShadows({ scene, map, rng, posts }) {
    const smoke = new Particles(1400, { additive: false });
    const glow = new Particles(400);
    scene.add(smoke.points, glow.points);
    const plates = document.createElement('div');
    plates.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden';
    document.body.append(plates);

    const list = posts.map(post => createSoldier(post));

    function createSoldier(post) {
        const d = buildSoldier();
        scene.add(d.root);
        const pos = new THREE.Vector3(post.x, map.heightAt(post.x, post.z), post.z);
        const s = {
            state: 'idle', timer: 1 + rng() * 2, heading: rng() * 6.28, hp: DEF.health, speed: 0, phase: 0,
            attackCd: 1.2, swingT: 0, hitDone: false, guardT: 0, guard: 0, flash: 0, stagger: 0, strafeDir: 1,
            burnLeft: 0, burnTick: 0, deadT: 0, notice: 0, target: null, lunge: 0, seen: false, t: 0,
        };
        const plate = document.createElement('div');
        plate.innerHTML = `<div style="font:13px Georgia,serif;color:#e6d6ff;text-shadow:0 1px 3px #000;letter-spacing:.06em;text-align:center">Shadow Soldier <span style="opacity:.6;font-size:11px">· ${(affinityOf(TYPE).family ?? '').replace(/^./, c => c.toUpperCase())}-touched</span></div>
            <div style="width:110px;height:6px;margin:3px auto 0;border:1px solid #c9b6ff88;border-radius:4px;background:#0009;overflow:hidden"><div style="height:100%;width:100%;background:linear-gradient(90deg,#5a1a8a,#a64aff)"></div></div>`;
        plate.style.cssText = 'position:absolute;left:0;top:0;opacity:0;transition:opacity .3s;white-space:nowrap';
        plates.append(plate);
        const bar = plate.lastElementChild.firstElementChild;

        const dir = new THREE.Vector3(), prev = new THREE.Vector3(), tmp = new THREE.Vector3();
        let lastCtx = null;   // fireball hits arrive without a ctx

        function face(target, k) {
            const want = Math.atan2(target.x - pos.x, target.z - pos.z);
            const diff = ((((want - s.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
            s.heading += diff * Math.min(1, k);
            return Math.abs(diff);
        }

        function hit(dmg, from, burnMs, ctx = lastCtx) {
            if (s.state === 'dead') return 'handled';
            const mult = affinityMult(TYPE, 'fire');
            let amount = Math.max(1, Math.round(dmg * mult));
            // A raised shield turns fire that comes from the front.
            const toFrom = Math.atan2(from.x - pos.x, from.z - pos.z);
            const off = Math.abs(((((toFrom - s.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
            const blocked = s.guard > 0.6 && off < 1.2;
            if (blocked) {
                amount = Math.max(1, Math.round(amount * 0.25));
                for (let i = 0; i < 26; i++) {
                    const a = rng() * 6.28, sp = 2 + rng() * 4;
                    glow.emit({ x: pos.x + Math.sin(s.heading) * 0.5, y: pos.y + 1.2, z: pos.z + Math.cos(s.heading) * 0.5,
                        vx: Math.cos(a) * sp, vy: rng() * 3, vz: Math.sin(a) * sp, grav: 6, drag: 1, life: 0.5,
                        size: [0.1, 0.02], c0: [0.8, 0.6, 1, 1], c1: [0.4, 0.1, 1, 0] });
                }
            } else {
                if (burnMs) { s.burnLeft = Math.max(s.burnLeft, burnMs / 1000); s.burnTick = 0; }
                s.stagger = 0.35;
                if (s.state === 'windup') { s.state = 'chase'; s.attackCd = 0.8; }   // a hit interrupts the swing
            }
            s.hp -= amount;
            s.flash = 0.2;
            s.seen = true;
            ctx?.floater(pos.clone().setY(pos.y + 2.2), blocked ? `Blocked ${amount}` : `${amount}${burnMs && !blocked ? ' 🔥' : ''}`, blocked ? '#c9b6ff' : '#ff8a4a');
            if (s.state !== 'windup' && s.state !== 'swing') s.state = 'chase';
            if (s.hp <= 0) die(ctx);
            return 'handled';
        }

        function die(ctx) {
            s.state = 'dead'; s.deadT = 0; s.hp = 0; s.burnLeft = 0;
            ctx?.onKill?.(DEF.xpReward, pos.clone().setY(pos.y + 2.4));
            for (let i = 0; i < 90; i++) {
                const a = rng() * 6.28, sp = 0.6 + rng() * 2.2;
                smoke.emit({ x: pos.x + (rng() - 0.5) * 0.6, y: pos.y + 0.3 + rng() * 1.6, z: pos.z + (rng() - 0.5) * 0.6,
                    vx: Math.cos(a) * sp, vy: 0.4 + rng() * 1.6, vz: Math.sin(a) * sp, drag: 1.4, life: 1.8 + rng() * 1.6,
                    size: [0.4, 1.6], c0: [0.05, 0.03, 0.09, 0.75], c1: [0.02, 0.01, 0.04, 0] });
            }
        }

        function update(dt, ctx) {
            lastCtx = ctx;
            s.t += dt;
            const P = ctx.player.pos;
            const toP = Math.hypot(P.x - pos.x, P.z - pos.z);
            const fromPost = Math.hypot(pos.x - post.x, pos.z - post.z);
            let want = 0;
            s.attackCd -= dt;
            s.guardT -= dt;
            s.stagger = Math.max(0, s.stagger - dt);

            if (s.state === 'dead') {
                s.deadT += dt;
                const k = Math.min(1, s.deadT / 1.4);
                for (const m of [d.M.body, d.M.plate, d.M.cloth]) m.opacity = 0.84 * (1 - k);
                for (const m of [d.M.eye, d.M.edge, d.M.sigil]) m.opacity = 1 - k;
                d.M.eye.transparent = true;
                d.body.position.y = -0.5 * k;
                d.root.visible = k < 1;
                if (s.deadT > 18) respawn();
            } else {
                const playerUp = !ctx.player.dead;
                if (s.state === 'idle' || s.state === 'patrol') {
                    if (playerUp && toP < SIGHT) { s.state = 'notice'; s.notice = 0.6; }
                    else if (s.state === 'idle' && (s.timer -= dt) <= 0) {
                        const a = rng() * 6.28, r = 1 + rng() * 4;
                        s.target = new THREE.Vector3(post.x + Math.cos(a) * r, 0, post.z + Math.sin(a) * r);
                        s.state = 'patrol';
                    } else if (s.state === 'patrol') {
                        want = 1.1;
                        face(s.target, dt * 4);
                        if (Math.hypot(s.target.x - pos.x, s.target.z - pos.z) < 0.5) { s.state = 'idle'; s.timer = 2 + rng() * 3; }
                    }
                } else if (s.state === 'notice') {
                    face(P, dt * 8);
                    if ((s.notice -= dt) <= 0) s.state = 'chase';
                } else if (s.state === 'return') {
                    want = 2.2;
                    face(post, dt * 5);
                    if (fromPost < 0.8) { s.state = 'idle'; s.hp = Math.min(DEF.health, s.hp + 10); }
                    if (playerUp && toP < SIGHT * 0.7) s.state = 'chase';
                } else if (!playerUp || fromPost > 26 || toP > SIGHT * 2) {
                    s.state = 'return';
                } else if (s.state === 'chase' || s.state === 'strafe') {
                    face(P, dt * 7);
                    // React to a cast: raise the shield.
                    if (ctx.player.cast && ctx.player.cast.t < 0.25 && s.guardT < -0.5 && rng() < 0.6) s.guardT = 1.1;
                    if (toP > REACH + 0.8) { s.state = 'chase'; want = CHASE; }
                    else if (s.attackCd <= 0 && s.stagger <= 0) { s.state = 'windup'; s.swingT = 0; s.hitDone = false; }
                    else {
                        s.state = 'strafe';
                        if (rng() < dt * 0.6) s.strafeDir *= -1;
                        if (rng() < dt * 0.8) s.guardT = Math.max(s.guardT, 0.8);
                        want = -1;   // sidestep
                    }
                } else if (s.state === 'windup' || s.state === 'swing' || s.state === 'recover') {
                    s.swingT += dt;
                    if (s.state === 'windup') {
                        face(P, dt * 6);
                        if (s.swingT >= WINDUP) { s.state = 'swing'; s.swingT = 0; s.lunge = 0.9; }
                    } else if (s.state === 'swing') {
                        if (!s.hitDone && s.swingT >= SWING * 0.6) {
                            s.hitDone = true;
                            const ang = Math.abs(((((Math.atan2(P.x - pos.x, P.z - pos.z) - s.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI);
                            if (toP < REACH + 0.45 && ang < 1.25) ctx.hurtPlayer(DEF.damage, pos);
                        }
                        if (s.swingT >= SWING) { s.state = 'recover'; s.swingT = 0; }
                    } else if (s.swingT >= RECOVER) {
                        s.state = 'chase';
                        s.attackCd = 1.4 + rng() * 1.1;
                    }
                }
            }
            s.guard += ((s.guardT > 0 && (s.state === 'chase' || s.state === 'strafe') ? 1 : 0) - s.guard) * Math.min(1, dt * 10);

            // Move.
            if (s.state !== 'dead') {
                prev.copy(pos);
                if (want > 0) dir.set(Math.sin(s.heading), 0, Math.cos(s.heading));
                else if (want < 0) { dir.set(Math.cos(s.heading) * s.strafeDir, 0, -Math.sin(s.heading) * s.strafeDir); }
                let sp = want > 0 ? want : want < 0 ? 1.3 : 0;
                if (s.stagger > 0) { dir.set(-Math.sin(s.heading), 0, -Math.cos(s.heading)); sp = 1.6; }
                if (s.guard > 0.5 && want > 0) sp *= 0.6;
                s.speed += (sp - s.speed) * Math.min(1, dt * 8);
                pos.addScaledVector(dir, s.speed * dt);
                if (s.lunge > 0) {
                    pos.x += Math.sin(s.heading) * s.lunge * 4 * dt;
                    pos.z += Math.cos(s.heading) * s.lunge * 4 * dt;
                    s.lunge = Math.max(0, s.lunge - dt * 5);
                }
                // Keep a body's width from the player and out of the scenery.
                const dx = pos.x - P.x, dz = pos.z - P.z, dd = Math.hypot(dx, dz);
                if (dd < 0.85 && dd > 1e-4) { pos.x = P.x + (dx / dd) * 0.85; pos.z = P.z + (dz / dd) * 0.85; }
                pos.y = map.heightAt(pos.x, pos.z);
                map.resolve(pos, 0.4);
                if (map.blockedAt(pos.x, pos.z, 0.35, pos.y) === 'wall' && map.heightAt(pos.x, pos.z) < -1.8) pos.copy(prev);
                pos.y = map.heightAt(pos.x, pos.z);
            }

            // Burning (amo's STATUS_DEFS.burning: dotDmg every dotInterval).
            if (s.burnLeft > 0 && s.state !== 'dead') {
                s.burnLeft -= dt;
                s.burnTick += dt * 1000;
                const B = STATUS_DEFS.burning;
                if (s.burnTick >= B.dotInterval) {
                    s.burnTick -= B.dotInterval;
                    s.hp -= B.dotDmg;
                    ctx.floater(pos.clone().setY(pos.y + 2.0), `${B.dotDmg}`, '#ffb070');
                    if (s.hp <= 0) die(ctx);
                }
                if (rng() < dt * 30) ctx.fx.fire.emit({ x: pos.x + (rng() - 0.5) * 0.5, y: pos.y + 0.8 + rng() * 0.8, z: pos.z + (rng() - 0.5) * 0.5,
                    vx: 0, vy: 1.2 + rng(), vz: 0, life: 0.5, size: [0.35, 0.05], c0: [1, 0.6, 0.15, 0.9], c1: [0.8, 0.15, 0.02, 0] });
            }

            animate(dt);
            emitFumes(dt);
            updatePlate(ctx);
        }

        function animate(dt) {
            if (s.state === 'dead') { d.root.position.set(pos.x, pos.y, pos.z); return; }
            d.root.position.copy(pos);
            d.root.rotation.y = s.heading;
            const amp = Math.min(1, Math.abs(s.speed) / 3);
            const strafing = s.state === 'strafe';
            s.phase += dt * Math.abs(s.speed) * 2.6;
            const sn = Math.sin(s.phase), cs = Math.cos(s.phase);
            const breathe = Math.sin(s.t * 1.7);
            d.legs.L.thigh.rotation.x = sn * 0.6 * amp;
            d.legs.R.thigh.rotation.x = -sn * 0.6 * amp;
            d.legs.L.shin.rotation.x = amp * (0.15 + 0.9 * Math.max(0, -cs)) + 0.12;
            d.legs.R.shin.rotation.x = amp * (0.15 + 0.9 * Math.max(0, cs)) + 0.12;
            d.legs.L.thigh.rotation.z = strafing ? sn * 0.15 : 0;
            d.legs.R.thigh.rotation.z = strafing ? -sn * 0.15 : 0;
            d.body.position.y = Math.abs(cs) * 0.05 * amp - 0.06;   // a slight crouch: a fighter's stance

            // Arms: sword low and forward; the shield arm comes up when guarding.
            const g = s.guard;
            d.arms.L.upper.rotation.set(-0.25 - 1.0 * g + breathe * 0.02, 0, 0.25 - 0.15 * g);
            d.arms.L.fore.rotation.x = -0.5 - 0.9 * g;
            d.shield.rotation.y = -0.2 + 0.2 * g;
            let rUp = -0.35 + breathe * 0.02, rFore = -0.6, rZ = -0.2, swordX = 1.25, spineX = 0.1, spineY = 0;
            if (s.state === 'windup') {
                const k = Math.min(1, s.swingT / WINDUP);
                const e = 1 - (1 - k) * (1 - k);
                rUp = -0.35 + (-2.7 + 0.35) * e; rZ = -0.2 - 0.35 * e; rFore = -0.6 + 0.2 * e; swordX = 1.25 + 0.6 * e;
                spineX = 0.1 - 0.25 * e; spineY = 0.35 * e;
                d.M.edge.color.setRGB(0.6 + 0.4 * k, 0.4 + 0.2 * k, 1);   // the edge brightens: a tell
            } else if (s.state === 'swing') {
                const k = Math.min(1, s.swingT / SWING);
                rUp = -2.7 + 2.6 * k; rZ = -0.55 + 0.4 * k; rFore = -0.4 - 0.2 * k; swordX = 1.85 - 0.4 * k;
                spineX = -0.15 + 0.5 * k; spineY = 0.35 - 0.7 * k;
            } else if (s.state === 'recover') {
                const k = Math.min(1, s.swingT / RECOVER);
                rUp = -0.1 - 0.25 * k; rZ = -0.15; spineX = 0.35 - 0.25 * k; spineY = -0.35 * (1 - k);
                d.M.edge.color.setRGB(0.6, 0.42, 1);
            }
            if (s.state === 'notice') { spineX = -0.1; d.head.rotation.x = -0.15; } else d.head.rotation.x = -spineX * 0.5;
            if (s.stagger > 0) { spineX -= 0.4 * (s.stagger / 0.35); rUp += 0.4; }
            d.arms.R.upper.rotation.set(rUp, 0, rZ);
            d.arms.R.fore.rotation.x = rFore;
            d.sword.rotation.x = swordX;
            d.spine.rotation.set(spineX + breathe * 0.015, spineY, 0);

            for (const st of d.strips) {
                const p = st.g.attributes.position.array, b = st.base;
                for (let i = 0; i < p.length; i += 3) {
                    const depth = -b[i + 1];
                    p[i + 2] = b[i + 2] + Math.sin(s.t * (5 + amp * 6) + st.ph + depth * 6) * 0.04 * depth * (1 + amp * 2) + (st.back ? 1 : -1) * amp * depth * 0.25;
                }
                st.g.attributes.position.needsUpdate = true;
            }

            s.flash = Math.max(0, s.flash - dt);
            const rim = 1 + s.flash * 6 + (s.state === 'windup' ? 0.6 : 0);
            d.M.body.userData.rim.value.setRGB(0.3 * rim, 0.12 * rim, 0.6 * rim);
            d.M.plate.userData.rim.value.setRGB(0.3 * rim, 0.12 * rim, 0.6 * rim);
            const eyeK = s.state === 'notice' || s.state === 'windup' ? 2.2 : 1 + Math.sin(s.t * 3) * 0.15;
            d.M.eye.color.setRGB(eyeK, 0.16 * eyeK, 0.24 * eyeK);
        }

        function emitFumes(dt) {
            if (s.state === 'dead') return;
            const rate = 85 + (s.state === 'chase' ? 30 : 0);
            for (let i = 0; i < 3; i++) {
                if (rng() > dt * rate / 3) continue;
                const src = d.fumeParts[Math.floor(rng() * d.fumeParts.length)];
                src.getWorldPosition(tmp);
                smoke.emit({ x: tmp.x + (rng() - 0.5) * 0.15, y: tmp.y, z: tmp.z + (rng() - 0.5) * 0.15,
                    vx: (rng() - 0.5) * 0.3 - Math.sin(s.heading) * s.speed * 0.3, vy: 0.45 + rng() * 0.6, vz: (rng() - 0.5) * 0.3 - Math.cos(s.heading) * s.speed * 0.3,
                    drag: 0.9, life: 1.1 + rng() * 1.1, size: [0.22, 0.95], c0: [0.035, 0.02, 0.06, 0.62], c1: [0.015, 0.008, 0.03, 0] });
            }
            if (rng() < dt * 6) {
                const src = d.fumeParts[Math.floor(rng() * d.fumeParts.length)];
                src.getWorldPosition(tmp);
                glow.emit({ x: tmp.x, y: tmp.y, z: tmp.z, vx: 0, vy: 0.6, vz: 0, life: 1.0, size: [0.06, 0.01], c0: [0.6, 0.3, 1, 0.8], c1: [0.3, 0.1, 0.8, 0] });
            }
        }

        function updatePlate(ctx) {
            const show = s.state !== 'dead' && s.state !== 'idle' && s.state !== 'patrol' || (s.seen && s.state !== 'dead' && s.hp < DEF.health);
            tmp.set(pos.x, pos.y + 2.45, pos.z).project(ctx.camera);
            const onScreen = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
            plate.style.opacity = show && onScreen ? 1 : 0;
            plate.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
            bar.style.width = `${Math.max(0, s.hp / DEF.health) * 100}%`;
        }

        function respawn() {
            Object.assign(s, { state: 'idle', hp: DEF.health, timer: 2, burnLeft: 0, guard: 0, guardT: 0, seen: false, deadT: 0 });
            pos.set(post.x, map.heightAt(post.x, post.z), post.z);
            for (const m of [d.M.body, d.M.plate]) m.opacity = 0.84;
            d.M.cloth.opacity = 0.75;
            for (const m of [d.M.eye, d.M.edge, d.M.sigil]) m.opacity = 1;
            d.body.position.y = 0;
            d.root.visible = true;
            for (let i = 0; i < 60; i++) smoke.emit({ x: pos.x + (rng() - 0.5) * 2, y: pos.y + rng() * 2, z: pos.z + (rng() - 0.5) * 2,
                vx: 0, vy: 0.3, vz: 0, drag: 1, life: 1.5, size: [1.2, 0.2], c0: [0.04, 0.02, 0.08, 0], c1: [0.04, 0.02, 0.08, 0.7] });
        }

        return {
            pos, kind: 'shadow',
            get debug() { return { state: s.state, cd: +s.attackCd.toFixed(2), sp: +s.speed.toFixed(2), hp: s.hp, guard: +s.guard.toFixed(2) }; },
            get alive() { return s.state !== 'dead'; },
            get engaged() { return s.state !== 'dead' && s.state !== 'idle' && s.state !== 'patrol' && s.state !== 'return'; },
            update, hit, reset: () => { if (s.state !== 'dead') { s.state = 'return'; s.burnLeft = 0; } },
        };
    }

    return {
        list,
        update(dt) { smoke.update(dt); glow.update(dt); },
        setVisible(v) { plates.style.display = v ? '' : 'none'; },
    };
}
