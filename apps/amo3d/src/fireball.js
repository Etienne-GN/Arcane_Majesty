// Fireball: projectile + trail + explosion, driven by amo's SPELLS.fireball numbers.
import * as THREE from 'three';
import { SPELLS, spellDamageAt, scaledStatus, spellRadius } from '@amo/data/spells.js';
import { Particles, radialTexture } from './lib.js';

export const FIREBALL = SPELLS.fireball;

export function createFireballs({ PX, tuning, onDamage, onShake }) {
    const group = new THREE.Group();
    const fire = new Particles(2000);
    const sparks = new Particles(600);
    const smoke = new Particles(500, { additive: false });
    group.add(smoke.points, fire.points, sparks.points);

    const glowTex = radialTexture([[0, 'rgba(255,245,215,1)'], [0.22, 'rgba(255,180,70,0.9)'], [0.55, 'rgba(255,90,15,0.3)'], [1, 'rgba(255,40,0,0)']]);
    const scorchTex = radialTexture([[0, 'rgba(12,7,4,0.92)'], [0.55, 'rgba(25,14,8,0.6)'], [1, 'rgba(25,14,8,0)']]);
    const glowMat = () => new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });

    // Pooled lights stay in the scene at intensity 0 — adding lights mid-game would recompile shaders.
    const ballLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xff8a30, 0, 11, 1.5); group.add(l); return l; });
    const blastLight = new THREE.PointLight(0xff9a40, 0, 18, 1.4);
    group.add(blastLight);

    const balls = [], blasts = [], decals = [];
    const coreGeo = new THREE.IcosahedronGeometry(0.2, 1);
    const ringGeo = new THREE.RingGeometry(0.85, 1, 48);
    const decalGeo = new THREE.CircleGeometry(1, 28);
    const UP = new THREE.Vector3(0, 1, 0);
    const R = Math.random;

    function setScene(scene) { scene.add(group); }

    function cast(origin, dir, level, int) {
        const light = ballLights.find(l => !balls.some(b => b.light === l)) ?? ballLights[0];
        const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xfff1c4, toneMapped: false }));
        const halo = new THREE.Sprite(glowMat()); halo.scale.setScalar(1.9);
        const inner = new THREE.Sprite(glowMat()); inner.scale.setScalar(0.8);
        inner.material.color.set(0xfff4d0);
        group.add(core, halo, inner);
        const b = {
            pos: origin.clone(), vel: dir.clone().multiplyScalar((FIREBALL.projectileSpeed / PX) * tuning.speedMult),
            traveled: 0, range: (FIREBALL.range[level - 1] / PX) * tuning.rangeMult,
            core, halo, inner, light, level, int, t: 0,
        };
        balls.push(b);
        // Muzzle puff.
        for (let i = 0; i < 18; i++) emitFire(origin, 2.5, 0.35, 0.5);
        return b;
    }

    function emitFire(p, speed, life, size) {
        const v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(speed * (0.3 + R() * 0.7));
        fire.emit({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, drag: 3, life: life * (0.7 + R() * 0.6),
            size: [size, size * 0.1], c0: [1, 0.72 + R() * 0.2, 0.3, 1], c1: [0.85, 0.18, 0.02, 0] });
    }

    function explode(p, normal, map, hittables) {
        const radius = (spellRadius(FIREBALL, 1) / PX) * tuning.radiusMult;
        const flash = new THREE.Sprite(glowMat());
        flash.position.copy(p).addScaledVector(normal, 0.4);
        group.add(flash);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        ring.position.copy(p).addScaledVector(normal, 0.08);
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
        group.add(ring);
        blasts.push({ t: 0, flash, ring, radius });
        blastLight.position.copy(p).addScaledVector(normal, 0.8);
        blastLight.intensity = 160;

        for (let i = 0; i < 90; i++) emitFire(p.clone().addScaledVector(normal, 0.3), 3 + radius * 2.2, 0.75, 1.0 + R() * 0.5);
        for (let i = 0; i < 45; i++) {
            const v = new THREE.Vector3(R() - 0.5, R() * 0.8, R() - 0.5).normalize().addScaledVector(normal, 0.6).normalize().multiplyScalar(6 + R() * 8);
            sparks.emit({ x: p.x, y: p.y + 0.2, z: p.z, vx: v.x, vy: v.y, vz: v.z, grav: 14, drag: 0.6, life: 0.6 + R() * 0.6,
                size: [0.12, 0.04], c0: [1, 0.95, 0.6, 1], c1: [1, 0.4, 0.05, 0] });
        }
        for (let i = 0; i < 28; i++) {
            const v = new THREE.Vector3(R() - 0.5, 0.4 + R(), R() - 0.5).multiplyScalar(1.6);
            smoke.emit({ x: p.x + v.x * 0.3, y: p.y + 0.4, z: p.z + v.z * 0.3, vx: v.x, vy: v.y, vz: v.z, drag: 1.2, life: 1.6 + R() * 1.2,
                size: [0.9, 2.6], c0: [0.16, 0.13, 0.11, 0.55], c1: [0.1, 0.1, 0.1, 0] });
        }
        // Scorch mark on the surface it hit.
        if (normal.y > 0.5) {
            const d = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: scorchTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
            d.scale.setScalar(radius * 0.9);
            d.position.copy(p).addScaledVector(normal, 0.03);
            d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            group.add(d);
            decals.push({ mesh: d, t: 0 });
            if (decals.length > 14) { const old = decals.shift(); group.remove(old.mesh); }
        }
        onShake?.(0.22);

        // Damage: amo's formula and burning roll, to everything in the blast.
        const spell = FIREBALL;
        for (const h of hittables) {
            if (!h.alive) continue;
            const dist = Math.hypot(h.pos.x - p.x, h.pos.y + 1 - p.y, h.pos.z - p.z);
            if (dist > radius + 0.6) continue;
            const dmg = spellDamageAt(spell, 1, 12);
            const st = scaledStatus(spell, 1);
            const burn = st && R() < st.chance ? st.duration : 0;
            const killed = h.hit(dmg, p, burn);
            if (killed !== 'handled') onDamage?.(h.pos.clone().setY(h.pos.y + 1.9), dmg, killed, burn > 0);
        }
        void map;
    }

    const tmp = new THREE.Vector3();
    function update(dt, map, hittables) {
        for (let i = balls.length - 1; i >= 0; i--) {
            const b = balls[i];
            b.t += dt;
            const stepLen = b.vel.length() * dt;
            const n = Math.max(1, Math.ceil(stepLen / 0.12));
            let hit = null;
            for (let s = 0; s < n && !hit; s++) {
                b.pos.addScaledVector(b.vel, dt / n);
                b.traveled += stepLen / n;
                const what = map.projectileHit(b.pos);
                if (what) hit = { normal: what === 'ground' ? (map.terrain ? map.groundNormal(b.pos.x, b.pos.z) : UP.clone()) : b.vel.clone().normalize().negate() };
                for (const h of hittables) {   // an upright body: radius 0.6, feet to 2.1 m
                    if (h.alive && Math.hypot(h.pos.x - b.pos.x, h.pos.z - b.pos.z) < 0.6 && b.pos.y > h.pos.y && b.pos.y < h.pos.y + 2.1) {
                        hit = { normal: b.vel.clone().normalize().negate() };
                    }
                }
                if (!hit && b.traveled >= b.range) hit = { normal: UP.clone() };
            }
            b.core.position.copy(b.pos);
            b.halo.position.copy(b.pos);
            b.inner.position.copy(b.pos);
            b.halo.scale.setScalar(1.7 + Math.sin(b.t * 40) * 0.25);
            b.core.rotation.set(b.t * 9, b.t * 7, 0);
            b.light.position.copy(b.pos);
            b.light.intensity = 28 + Math.sin(b.t * 50) * 6;
            // Trail.
            for (let k = 0; k < 4; k++) {
                fire.emit({ x: b.pos.x + (R() - 0.5) * 0.2, y: b.pos.y + (R() - 0.5) * 0.2, z: b.pos.z + (R() - 0.5) * 0.2,
                    vx: (R() - 0.5) * 0.6, vy: 0.4 + R() * 0.6, vz: (R() - 0.5) * 0.6, drag: 2, life: 0.3 + R() * 0.25,
                    size: [0.55, 0.05], c0: [1, 0.7, 0.25, 0.95], c1: [0.8, 0.12, 0.02, 0] });
            }
            if (R() < 0.6) smoke.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: (R() - 0.5) * 0.3, vy: 0.5, vz: (R() - 0.5) * 0.3,
                drag: 1, life: 0.9, size: [0.25, 0.8], c0: [0.18, 0.15, 0.13, 0.35], c1: [0.1, 0.1, 0.1, 0] });
            if (hit) {
                explode(b.pos.clone(), hit.normal, map, hittables);
                group.remove(b.core, b.halo, b.inner);
                b.light.intensity = 0;
                balls.splice(i, 1);
            }
        }
        for (let i = blasts.length - 1; i >= 0; i--) {
            const bl = blasts[i];
            bl.t += dt;
            const k = bl.t / 0.5;
            bl.flash.scale.setScalar(1 + Math.min(1, bl.t / 0.12) * bl.radius * 3.2);
            bl.flash.material.opacity = Math.max(0, 1 - k * 1.4);
            bl.ring.scale.setScalar(0.2 + Math.min(1, k) * bl.radius * 1.6);
            bl.ring.material.opacity = Math.max(0, 1 - k);
            if (k >= 1) { group.remove(bl.flash, bl.ring); blasts.splice(i, 1); }
        }
        blastLight.intensity *= Math.exp(-dt * 7);
        for (const d of decals) {
            d.t += dt;
            d.mesh.material.opacity = d.t < 8 ? 1 : Math.max(0, 1 - (d.t - 8) / 4);
        }
        fire.update(dt); sparks.update(dt); smoke.update(dt);
    }

    return { setScene, cast, update, fire, active: () => balls.length };
}
