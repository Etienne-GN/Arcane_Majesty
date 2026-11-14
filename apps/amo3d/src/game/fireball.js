import { sfx } from '../engine/sfx.js';
// Spell projectiles (Fireball and amo's 24 'targeted_directional' spells): flight, trail and impact in the
// spell's element colours; amo numbers for damage (spellDamageAt), status (scaledStatus), range, affinity.
// targeted_aoe (Fireball) bursts over an area; directional bolts hit the one they strike. Quirks: Triple Dart
// and Needle Volley fire a fan, Seeker Dart homes, Life Drain heals the caster, Chain Lightning jumps.
import * as THREE from 'three';
import { spells } from '@rules';

const { SPELLS, spellDamageAt, scaledStatus, spellRadius } = spells;
import { Particles, radialTexture } from '../engine/lib.js';

export const FIREBALL = SPELLS.fireball;
export const CASTABLE = ['fireball', ...Object.values(SPELLS).filter(sp => sp.targetingType === 'targeted_directional').map(sp => sp.id)];
// Element palettes: [core, glow start, glow end, light]
const PAL = {
    fire: [0xfff1c4, [1, 0.72, 0.3], [0.85, 0.18, 0.02], 0xff8a30], arcane: [0xe8e0ff, [0.7, 0.6, 1], [0.3, 0.2, 0.9], 0x9a7aff],
    lightning: [0xffffff, [1, 1, 0.7], [0.6, 0.7, 1], 0xd8e8ff], shadow: [0x8a5aaa, [0.5, 0.25, 0.7], [0.15, 0.05, 0.25], 0x8a4aff],
    void: [0x6a3a8a, [0.45, 0.2, 0.7], [0.1, 0.02, 0.2], 0x7a3aff], earth: [0xc8a070, [0.7, 0.55, 0.35], [0.35, 0.25, 0.15], 0xc89a60],
    water: [0xd8f4ff, [0.5, 0.85, 1], [0.15, 0.4, 0.8], 0x6ac8ff], ice: [0xeaffff, [0.7, 0.95, 1], [0.3, 0.6, 0.9], 0x9ae0ff],
    air: [0xf0fff4, [0.8, 1, 0.85], [0.4, 0.7, 0.5], 0xc8ffd8], light: [0xfffbe0, [1, 0.95, 0.7], [0.9, 0.75, 0.3], 0xfff0a0],
    nature: [0xd8ffc0, [0.6, 0.95, 0.4], [0.2, 0.5, 0.1], 0x9aff6a],
};
const palOf = sp => PAL[sp.element] ?? PAL.arcane;
const FAN = { triple_dart: 3, needle_volley: 5, rubble_spray: 4 };

export function createFireballs({ PX, tuning, onDamage, onShake, onHeal }) {
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

    // cosmetic: another player's fireball (online) — flies and bursts the same, hurts nothing here.
    function cast(origin, dir, level, int, { cosmetic = false, spell = FIREBALL } = {}) {
        const n = FAN[spell.id] ?? 1;
        for (let k = 0; k < n; k++) {
            const a = n > 1 ? (k - (n - 1) / 2) * 0.16 : 0, d = dir.clone().applyAxisAngle(UP, a);
            launch(origin, d, level, int, cosmetic, spell);
        }
    }
    function launch(origin, dir, level, int, cosmetic, spell) {
        const pal = palOf(spell), aoe = spell.targetingType === 'targeted_aoe';
        const light = ballLights.find(l => !balls.some(b => b.light === l)) ?? ballLights[0];
        light.color.setHex(pal[3]);
        const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: pal[0], toneMapped: false }));
        if (!aoe) core.scale.set(0.6, 0.6, 1.6);
        const halo = new THREE.Sprite(glowMat()); halo.scale.setScalar(aoe ? 1.9 : 1.1);
        halo.material.color.setRGB(...pal[1]);
        const inner = new THREE.Sprite(glowMat()); inner.scale.setScalar(aoe ? 0.8 : 0.5);
        inner.material.color.setHex(pal[0]);
        group.add(core, halo, inner);
        const speed = spell.projectileSpeed ?? (aoe ? 420 : 520);
        const b = {
            pos: origin.clone(), vel: dir.clone().multiplyScalar((speed / PX) * tuning.speedMult),
            traveled: 0, range: ((spell.range?.[level - 1] ?? 200) / PX) * tuning.rangeMult,
            core, halo, inner, light, level, int, t: 0, cosmetic, spell, pal, aoe,
        };
        balls.push(b);
        for (let i = 0; i < 14; i++) emit(origin, 2.5, 0.35, 0.45, pal);   // muzzle puff
        return b;
    }
    function emit(p, speed, life, size, pal) {
        const v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(speed * (0.3 + R() * 0.7));
        fire.emit({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, drag: 3, life: life * (0.7 + R() * 0.6), size: [size, size * 0.1], c0: [...pal[1], 1], c1: [...pal[2], 0] });
    }
    // A bolt strikes one target (or the ground): a small burst, the damage, and the spell's quirk.
    function strike(b, target, hittables) {
        sfx.hit();
        for (let i = 0; i < 26; i++) emit(b.pos, 4, 0.4, 0.5, b.pal);
        if (!target || b.cosmetic) return;
        const sp = b.spell, dmg = spellDamageAt(sp, b.level, b.int);
        const st = scaledStatus(sp, b.level), roll = st && R() < st.chance;
        const burn = roll && st.id === 'burning' ? st.duration : 0, status = roll && st.id !== 'burning' ? { id: st.id, ms: st.duration } : null;
        target.hit(dmg, b.pos, burn, undefined, status, sp.element);
        onDamage?.(target.pos.clone().setY(target.pos.y + 1.9), dmg, !target.alive, burn > 0);
        if (sp.id === 'life_drain') onHeal?.(Math.round(dmg * 0.5));
        if (sp.id === 'chain_lightning') {   // jumps to the two nearest others within 6 m, weaker each time
            let from = target, d = dmg;
            const hitSet = new Set([target]);
            for (let j = 0; j < 2; j++) {
                const next = hittables.filter(h => h.alive && !hitSet.has(h) && h.kind !== 'deer').map(h => [h, Math.hypot(h.pos.x - from.pos.x, h.pos.z - from.pos.z)]).filter(([, dd]) => dd < 6).sort((x, y) => x[1] - y[1])[0]?.[0];
                if (!next) break;
                d = Math.round(d * 0.7); hitSet.add(next);
                for (let k = 0; k < 10; k++) emit(next.pos.clone().setY(next.pos.y + 1.2), 3, 0.3, 0.4, b.pal);
                next.hit(d, from.pos, 0, undefined, null, 'lightning');
                onDamage?.(next.pos.clone().setY(next.pos.y + 1.9), d, !next.alive, false);
                from = next;
            }
        }
    }

    function emitFire(p, speed, life, size) {
        const v = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize().multiplyScalar(speed * (0.3 + R() * 0.7));
        fire.emit({ x: p.x, y: p.y, z: p.z, vx: v.x, vy: v.y, vz: v.z, drag: 3, life: life * (0.7 + R() * 0.6),
            size: [size, size * 0.1], c0: [1, 0.72 + R() * 0.2, 0.3, 1], c1: [0.85, 0.18, 0.02, 0] });
    }

    function explode(p, normal, map, hittables, ball = null) {
        sfx.boom();
        const spell = ball?.spell ?? FIREBALL, lvl = ball?.level ?? 1;
        const radius = (spellRadius(spell, lvl) / PX) * tuning.radiusMult;
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
        for (const h of hittables) {
            if (!h.alive) continue;
            const dist = Math.hypot(h.pos.x - p.x, h.pos.y + 1 - p.y, h.pos.z - p.z);
            if (dist > radius + 0.6) continue;
            const dmg = spellDamageAt(spell, lvl, ball?.int ?? 12);
            const st = scaledStatus(spell, lvl);
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
            if (b.spell.id === 'seeker_dart' && !b.cosmetic) {   // homes on the nearest living target ahead
                const sp = b.vel.length(), tgt = hittables.filter(h => h.alive && h.kind !== 'deer').map(h => [h, Math.hypot(h.pos.x - b.pos.x, h.pos.z - b.pos.z)]).filter(([, d]) => d < 12).sort((x, y) => x[1] - y[1])[0]?.[0];
                if (tgt) { const want = new THREE.Vector3(tgt.pos.x - b.pos.x, tgt.pos.y + 1.1 - b.pos.y, tgt.pos.z - b.pos.z).normalize().multiplyScalar(sp); b.vel.lerp(want, Math.min(1, dt * 5)).setLength(sp); }
            }
            const stepLen = b.vel.length() * dt;
            const n = Math.max(1, Math.ceil(stepLen / 0.12));
            let hit = null;
            for (let s = 0; s < n && !hit; s++) {
                b.pos.addScaledVector(b.vel, dt / n);
                b.traveled += stepLen / n;
                const what = map.projectileHit(b.pos);
                if (what) hit = { normal: what === 'ground' ? (map.terrain ? map.groundNormal(b.pos.x, b.pos.z) : UP.clone()) : b.vel.clone().normalize().negate() };
                for (const h of hittables) {   // an upright body: radius 0.6, feet to 2.1 m
                    if (!b.cosmetic && h.alive && Math.hypot(h.pos.x - b.pos.x, h.pos.z - b.pos.z) < 0.6 && b.pos.y > h.pos.y && b.pos.y < h.pos.y + 2.1) {
                        hit = { normal: b.vel.clone().normalize().negate(), target: h };
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
                    size: [b.aoe ? 0.55 : 0.32, 0.05], c0: [...b.pal[1], 0.95], c1: [...b.pal[2], 0] });
            }
            if (b.aoe && R() < 0.6) smoke.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: (R() - 0.5) * 0.3, vy: 0.5, vz: (R() - 0.5) * 0.3,
                drag: 1, life: 0.9, size: [0.25, 0.8], c0: [0.18, 0.15, 0.13, 0.35], c1: [0.1, 0.1, 0.1, 0] });
            if (hit) {
                if (b.aoe) explode(b.pos.clone(), hit.normal, map, b.cosmetic ? [] : hittables, b);
                else strike(b, hit.target ?? null, hittables);
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

    return { setScene, cast, update, fire, active: () => balls.length, get balls() { return balls; } };
}
