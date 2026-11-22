// Spectacle: the big moments of amo's spells — set-pieces that replace the plain area blast, scaled with the spell's
// tier (Novice ×1, Adept ×1.3, Master ×1.6). Fire Rain calls meteors, walls of mud / thorns rise and block,
// a flame wall burns along a line, an earth pillar bursts up, spikes and ice pikes erupt (the pikes in a line from
// the caster), a tornado walks forward dragging enemies, a whirlpool spins, a geyser shoots up, lightning falls from
// the sky, shadow and arcane shock-waves roll out. Damage stays amo's (the caller's hitArea); some set-pieces add ticks.
import { drape } from '../engine/drape.js';
import * as THREE from 'three';

const R = Math.random;
// The big ones: an incantation before they land (player.js lengthens the cast and raises the staff to the sky).
export const INCANT = new Set(['fire_rain', 'flame_wall', 'fire_nova', 'ember_bloom', 'earth_pillar', 'mud_wall', 'thornwall', 'spike_field', 'tremor',
    'blizzard_shard', 'cyclone', 'drying_wind', 'maelstrom', 'geyser', 'thunder_clap', 'static_field', 'void_pulse', 'arcane_burst']);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8, ...o });
const glow = (c, op = 0.9) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, toneMapped: false, depthWrite: false });

export function createSpectacle({ group, fx, shake, explodeAt, getMap }) {
    const live = [];   // { obj, t, life, update(dt, k) , done() }
    const add = (obj, life, update, done) => { group.add(obj); live.push({ obj, t: 0, life, update, done }); return obj; };
    const ground = (x, z, y) => { const m = getMap(); return m?.groundAt ? m.groundAt(x, z, y + 3) : (m?.heightAt?.(x, z) ?? y); };
    const fade = (o, a) => o.traverse(m => { if (m.material) { m.material.transparent = true; m.material.opacity = (m.material.userData.base ??= m.material.opacity) * a; } });

    // A ring rolling outward on the ground.
    function shockwave(p, r, color, life = 0.7, h = 0.12) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), glow(color, 0.85));
        m.rotation.x = -Math.PI / 2; m.position.copy(p); m.material.side = THREE.DoubleSide; drape(m, h);   // (a ring lying on the ground, slopes and all)
        add(m, life, (dt, k) => { m.scale.setScalar(0.2 + k * r); fade(m, 1 - k); });
    }
    // Something that bursts out of the ground, stays, then sinks.
    function erupt(obj, x, z, y, height, stay, delay = 0) {
        obj.position.set(x, y - height, z);
        add(obj, delay + stay + 0.6, (dt, k, t) => {
            const tt = t - delay;
            if (tt < 0) { obj.visible = false; return; }
            obj.visible = true;
            const up = Math.min(1, tt / 0.15), down = Math.max(0, (tt - stay) / 0.6);
            obj.position.y = y - height + height * up - height * down;
            if (tt < 0.05) for (let i = 0; i < 14; i++) fx.smoke.emit({ x: x + (R() - 0.5), y: y + 0.2, z: z + (R() - 0.5), vx: (R() - 0.5) * 2, vy: 1 + R(), vz: (R() - 0.5) * 2, drag: 1.4, life: 0.9, size: [0.4, 1.1], c0: [0.45, 0.4, 0.34, 0.55], c1: [0.4, 0.36, 0.3, 0] });
        });
    }
    // A wall across the aim: segment colliders while it stands (mud and thorns block creatures and you).
    function wall(p, dir, len, height, stay, build, blocks) {
        const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize(), n = Math.max(3, Math.round(len / 0.9)), map = getMap(), cols = [];
        for (let i = 0; i < n; i++) {
            const f = (i / (n - 1) - 0.5) * len, x = p.x + side.x * f, z = p.z + side.z * f, y = ground(x, z, p.y);
            const seg = build(i); seg.rotation.y = Math.atan2(side.x, side.z);
            erupt(seg, x, z, y, height, stay, i * 0.03);
        }
        if (blocks && map?.colliders) {
            const a = { ax: p.x - side.x * len / 2, az: p.z - side.z * len / 2, bx: p.x + side.x * len / 2, bz: p.z + side.z * len / 2, r: 0.45, kind: 'wall', y0: p.y - 2, y1: p.y + height };
            map.colliders.push(a); cols.push(a);
            setTimeout(() => { for (const c of cols) { const i = map.colliders.indexOf(c); if (i >= 0) map.colliders.splice(i, 1); } }, (stay + 0.4) * 1000);
        }
    }
    function lightningFrom(top, bottom, thick = 3) {
        for (let b = 0; b < thick; b++) {
            const pts = [], n = 12;
            for (let i = 0; i <= n; i++) { const f = i / n; pts.push(new THREE.Vector3(top.x + (bottom.x - top.x) * f + (i && i < n ? (R() - 0.5) * 1.2 : 0), top.y + (bottom.y - top.y) * f, top.z + (bottom.z - top.z) * f + (i && i < n ? (R() - 0.5) * 1.2 : 0))); }
            const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: b ? 0xbfd8ff : 0xffffff, transparent: true, toneMapped: false }));
            add(l, 0.35, (dt, k) => { l.visible = R() < 0.8; l.material.opacity = 1 - k; });
        }
        for (let i = 0; i < 40; i++) fx.sparks.emit({ x: bottom.x, y: bottom.y + 0.2, z: bottom.z, vx: (R() - 0.5) * 9, vy: R() * 6, vz: (R() - 0.5) * 9, grav: 12, drag: 0.6, life: 0.5, size: [0.12, 0.03], c0: [1, 1, 0.8, 1], c1: [0.5, 0.6, 1, 0] });
    }

    const SET = {
        // ---- fire ----
        fire_rain(p, r, k) {   // meteors fall over the area for a second and a half
            const n = Math.round(6 * k);
            for (let i = 0; i < n; i++) {
                const a = R() * Math.PI * 2, d = R() * r, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d, y = ground(x, z, p.y), delay = i * (1.4 / n);
                const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 * k, 0), glow(0xffa040, 1));
                const from = new THREE.Vector3(x - 6, y + 22, z - 3);
                add(rock, delay + 0.7, (dt, kk, t) => {
                    const tt = (t - delay) / 0.7; rock.visible = tt > 0;
                    if (tt <= 0) return;
                    rock.position.lerpVectors(from, new THREE.Vector3(x, y, z), Math.min(1, tt));
                    for (let j = 0; j < 3; j++) fx.fire.emit({ x: rock.position.x, y: rock.position.y, z: rock.position.z, vx: (R() - 0.5), vy: 1, vz: (R() - 0.5), drag: 2, life: 0.4, size: [0.8 * k, 0.1], c0: [1, 0.7, 0.3, 1], c1: [0.8, 0.15, 0.02, 0] });
                }, () => explodeAt(new THREE.Vector3(x, y, z), 0.8 * k));
            }
            shake(0.3);
            return true;
        },
        flame_wall(p, r, k, dir) {
            wall(p, dir, r * 2.2, 2.2 * k, 3.5 * k, () => { const g = new THREE.Group(); for (let j = 0; j < 3; j++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.35, 2.2 * k, 6), glow(j ? 0xff7a20 : 0xffd27a, 0.85)); f.position.set((j - 1) * 0.3, 1.1 * k, 0); g.add(f); } g.userData.flames = true; return g; }, false);
            return true;
        },
        fire_nova(p, r, k) { shockwave(p, r * 1.3, 0xff8a30, 0.6); shockwave(p, r, 0xffd27a, 0.45); for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; erupt(new THREE.Mesh(new THREE.ConeGeometry(0.3 * k, 1.6 * k, 6), glow(0xff7a20, 0.85)), p.x + Math.cos(a) * r * 0.8, p.z + Math.sin(a) * r * 0.8, p.y, 1.6 * k, 0.6); } shake(0.25); return true; },
        // ---- earth ----
        earth_pillar(p, r, k) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * k, 1.1 * k, 4.5 * k, 7), mat(0x7a6a58)); erupt(col, p.x, p.z, p.y, 4.5 * k, 2.5); shockwave(p, 3 * k, 0xc8a070); shake(0.35); return true; },
        mud_wall(p, r, k, dir) { wall(p, dir, Math.max(4, r * 2.4), 2.4 * k, 6, () => { const b = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4 * k, 0.9), mat(0x5a4632)); b.position.y = 1.2 * k; const g = new THREE.Group(); g.add(b); return g; }, true); shake(0.2); return true; },
        thornwall(p, r, k, dir) { wall(p, dir, Math.max(4, r * 2.2), 2 * k, 7, () => { const g = new THREE.Group(); for (let j = 0; j < 4; j++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 2 * k, 4), mat(0x3a5a22)); c.position.set((R() - 0.5) * 0.8, k, (R() - 0.5) * 0.4); c.rotation.z = (R() - 0.5) * 0.7; g.add(c); } return g; }, true); return true; },
        spike_field(p, r, k) { for (let i = 0; i < Math.round(14 * k); i++) { const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r, x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d; erupt(new THREE.Mesh(new THREE.ConeGeometry(0.3 * k, (1.5 + R() * 1.5) * k, 5), mat(0x7a6a58)), x, z, ground(x, z, p.y), 2.5 * k, 3, R() * 0.25); } shake(0.3); return true; },
        tremor(p, r, k) { shockwave(p, r * 1.6, 0xc8a070, 0.9, 0.1); shockwave(p, r, 0x8a7a68, 0.6, 0.1); for (let i = 0; i < 10; i++) { const a = R() * Math.PI * 2, d = R() * r; erupt(new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 * k, 0), mat(0x6a5a4a)), p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, p.y, 0.6, 1.2, R() * 0.3); } shake(0.6); return true; },
        // ---- ice: pikes burst out of the ground in a line from the caster to the target ----
        blizzard_shard(p, r, k, dir, from) { return SET._pikes(p, k, from, 1); },
        frostbite(p, r, k, dir, from) { return SET._pikes(p, k, from, 0.8); },
        _pikes(p, k, from, size) {
            const ice = () => new THREE.Mesh(new THREE.ConeGeometry(0.35 * k * size, 2.6 * k * size, 6), mat(0xcfeeff, { emissive: 0x4a9ad8, emissiveIntensity: 0.5, transparent: true, opacity: 0.88, roughness: 0.15 }));
            const start = from ?? p, L = Math.hypot(p.x - start.x, p.z - start.z), n = Math.max(4, Math.round(L / 1.1));
            for (let i = 1; i <= n; i++) { const f = i / n, x = start.x + (p.x - start.x) * f + (R() - 0.5) * 0.6, z = start.z + (p.z - start.z) * f + (R() - 0.5) * 0.6; const m = ice(); m.rotation.set((R() - 0.5) * 0.4, R() * 6, (R() - 0.5) * 0.4); erupt(m, x, z, ground(x, z, p.y), 2.6 * k * size, 2.5, i * 0.05); }
            for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const m = ice(); m.scale.setScalar(1.3); m.rotation.z = Math.cos(a) * 0.4; m.rotation.x = Math.sin(a) * 0.4; erupt(m, p.x + Math.cos(a) * 0.9, p.z + Math.sin(a) * 0.9, p.y, 3.4 * k * size, 3, n * 0.05); }
            shake(0.3);
            return true;
        },
        // ---- wind and water ----
        cyclone(p, r, k, dir, from, hit) { return SET._tornado(p, r, k, dir, hit, 0xd8e8e0, 4.5); },
        drying_wind(p, r, k, dir, from, hit) { return SET._tornado(p, r, k, dir, hit, 0xe8dcc0, 2.5); },
        _tornado(p, r, k, dir, hit, color, life) {
            const g = new THREE.Group(), rings = [];
            for (let i = 0; i < 9; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.35 + i * 0.28 * k, 0.09, 4, 20), glow(color, 0.75 - i * 0.04)); ring.rotation.x = Math.PI / 2; ring.position.y = i * 0.55 * k; g.add(ring); rings.push(ring); }
            for (let j = 0; j < 2; j++) {   // the funnel: two twisted cones, wide at the top
                const fun = new THREE.Mesh(new THREE.CylinderGeometry((2.6 - j * 0.5) * k, (0.3 + j * 0.1) * k, 5 * k, 14, 6, true), mat(color, { transparent: true, opacity: 0.32 - j * 0.08, side: THREE.DoubleSide, depthWrite: false }));
                fun.position.y = 2.5 * k; fun.userData.spin = j ? -5 : 4; g.add(fun); rings.push(fun);
            }
            g.position.copy(p);
            let tick = 0;
            add(g, life, (dt, kk) => {
                g.position.x += dir.x * dt * 1.6; g.position.z += dir.z * dt * 1.6; g.position.y = ground(g.position.x, g.position.z, g.position.y);
                rings.forEach((ring, i) => { if (ring.userData.spin) { ring.rotation.y += dt * ring.userData.spin; return; } ring.rotation.z += dt * (6 + i); ring.position.x = Math.sin(kk * 20 + i) * 0.15 * i * 0.3; });
                for (let j = 0; j < 3; j++) fx.smoke.emit({ x: g.position.x + (R() - 0.5) * 2, y: g.position.y + R() * 4 * k, z: g.position.z + (R() - 0.5) * 2, vx: (R() - 0.5) * 3, vy: 1.5, vz: (R() - 0.5) * 3, drag: 1, life: 0.8, size: [0.3, 0.8], c0: [0.8, 0.8, 0.75, 0.35], c1: [0.7, 0.7, 0.65, 0] });
                for (const h of getMap()?.hittables ?? []) {   // drags what it passes toward its eye
                    if (!h.alive || h.kind === 'deer') continue;
                    const dx = g.position.x - h.pos.x, dz = g.position.z - h.pos.z, d = Math.hypot(dx, dz);
                    if (d < r * 1.6 && d > 0.3) { h.pos.x += dx / d * dt * 2.5; h.pos.z += dz / d * dt * 2.5; }
                }
                fade(g, Math.min(1, (life - kk * life) / 0.6));
                if ((tick -= dt) <= 0) { tick = 0.6; hit?.(g.position.clone(), r, 0.3); }
            });
            return true;
        },
        maelstrom(p, r, k, dir, from, hit) {
            const disc = new THREE.Group();
            for (let i = 0; i < 5; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * (0.25 + i * 0.18), 0.08, 4, 32, Math.PI * 1.6), glow(i % 2 ? 0x6ac8ff : 0xd8f4ff, 0.6)); ring.rotation.x = Math.PI / 2; disc.add(ring); }
            disc.position.copy(p).setY(p.y + 0.12);
            let tick = 0;
            add(disc, 4, (dt, kk) => { disc.children.forEach((c, i) => { c.rotation.z += dt * (2 + i * 0.6); }); fade(disc, Math.min(1, (1 - kk) * 3)); if ((tick -= dt) <= 0) { tick = 0.8; hit?.(p, r, 0.2); } for (let j = 0; j < 3; j++) fx.sparks.emit({ x: p.x + (R() - 0.5) * r * 2, y: p.y + 0.2, z: p.z + (R() - 0.5) * r * 2, vx: 0, vy: 2 + R() * 2, vz: 0, grav: 9, life: 0.5, size: [0.1, 0.03], c0: [0.7, 0.9, 1, 1], c1: [0.3, 0.6, 1, 0] }); });
            SET.geyser(p, r, k * 1.3);
            return true;
        },
        geyser(p, r, k) {
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * k, 1.0 * k, 7 * k, 12, 1, true), mat(0x6ac8ff, { emissive: 0x2a6aa8, emissiveIntensity: 0.4, transparent: true, opacity: 0.6, side: THREE.DoubleSide, roughness: 0.05 }));
            erupt(col, p.x, p.z, p.y, 7 * k, 1.2);
            add(new THREE.Object3D(), 1.4, () => { for (let j = 0; j < 8; j++) fx.sparks.emit({ x: p.x + (R() - 0.5), y: p.y + 6 * k, z: p.z + (R() - 0.5), vx: (R() - 0.5) * 6, vy: 2 + R() * 3, vz: (R() - 0.5) * 6, grav: 12, drag: 0.3, life: 1, size: [0.14, 0.05], c0: [0.8, 0.95, 1, 1], c1: [0.4, 0.7, 1, 0] }); });
            shake(0.2);
            return true;
        },
        riptide(p, r, k) { shockwave(p, r * 1.4, 0x6ac8ff, 0.8); shockwave(p, r, 0xd8f4ff, 0.6); return false; },
        // ---- lightning, shadow, arcane ----
        thunder_clap(p, r, k) { for (let i = 0; i < Math.round(3 * k); i++) { const a = R() * 6.28, d = R() * r * 0.5, b = new THREE.Vector3(p.x + Math.cos(a) * d, p.y, p.z + Math.sin(a) * d); lightningFrom(b.clone().setY(b.y + 18), b, 3); } shockwave(p, r * 1.5, 0xd8e8ff, 0.5); shake(0.5); return true; },
        static_field(p, r, k) { let t = 0; add(new THREE.Object3D(), 5, dt => { if ((t -= dt) <= 0) { t = 0.35; const a = R() * 6.28, d = R() * r, b = new THREE.Vector3(p.x + Math.cos(a) * d, p.y, p.z + Math.sin(a) * d); lightningFrom(b.clone().setY(b.y + 3.5), b, 1); } }); return false; },
        void_pulse(p, r, k) { shockwave(p, r * 1.8, 0x2a0a3a, 0.9, 0.3); shockwave(p, r * 1.3, 0x8a4aff, 0.7, 0.6); shake(0.3); return false; },
        arcane_burst(p, r, k) {
            const runes = new THREE.Group();
            const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.9, r, 48), glow(0xc8a8ff, 0.8)); ring.rotation.x = -Math.PI / 2; runes.add(ring); drape(ring, 0.1);
            for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, g = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.5), glow(0xfff0ff, 0.9)); g.position.set(Math.cos(a) * r * 0.75, 0, Math.sin(a) * r * 0.75); g.rotation.y = -a; runes.add(g); }
            runes.position.copy(p);
            add(runes, 1.4, (dt, kk) => { runes.rotation.y += dt * 2; fade(runes, 1 - kk); });
            const col = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.4, r * 0.6, 8 * k, 16, 1, true), glow(0xb89aff, 0.4)); col.material.side = THREE.DoubleSide; col.material.blending = THREE.AdditiveBlending;
            col.position.copy(p).setY(p.y + 4 * k); add(col, 0.8, (dt, kk) => { col.scale.set(1 + kk, 1, 1 + kk); fade(col, 1 - kk); });
            shake(0.3);
            return true;
        },
    };
    // Spells that share a set-piece.
    Object.assign(SET, { ember_bloom: SET.fire_nova, mud_trap: SET.tremor, quagmire: null, luminance: SET.arcane_burst, phantom_script: SET.arcane_burst, aetheric_inscription: SET.arcane_burst, hush: SET.void_pulse });

    // The incantation: a rune circle under the caster, motes of the element spiralling up into the staff.
    let circle = null;
    function channel(feet, top, color, k, dt) {
        if (!circle || circle.parent !== group) {
            circle = new THREE.Group();
            const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 48), glow(color, 0.85)); ring.rotation.x = -Math.PI / 2; circle.add(ring); drape(ring, 0.06);
            const inner = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.8, 6), glow(color, 0.7)); inner.rotation.x = -Math.PI / 2; circle.add(inner); drape(inner, 0.07);
            for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, g = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.3), glow(color, 0.9)); g.position.set(Math.cos(a) * 1.0, 0, Math.sin(a) * 1.0); g.rotation.y = -a; circle.add(g); }
            group.add(circle);
            circle.userData.t = 0;
        }
        circle.userData.t = 0.25;   // kept alive while channelling
        circle.position.set(feet.x, feet.y + 0.06, feet.z);
        circle.rotation.y += dt * 1.5;
        circle.scale.setScalar(0.3 + Math.min(1, k * 2) * 0.7);
        const c = new THREE.Color(color);
        for (let i = 0; i < 4; i++) {
            const a = R() * Math.PI * 2, d = 1 + R() * 0.6, x = feet.x + Math.cos(a) * d, z = feet.z + Math.sin(a) * d, y = feet.y + 0.2;
            const life = 0.55;
            fx.sparks.emit({ x, y, z, vx: (top.x - x) / life, vy: (top.y - y) / life, vz: (top.z - z) / life, drag: 0, life, size: [0.1, 0.03], c0: [c.r, c.g, c.b, 1], c1: [1, 1, 1, 0] });
        }
        fx.fire.emit({ x: top.x, y: top.y, z: top.z, vx: (R() - 0.5), vy: 0.8, vz: (R() - 0.5), drag: 2, life: 0.35, size: [0.5 + k * 0.6, 0.05], c0: [c.r, c.g, c.b, 1], c1: [c.r * 0.5, c.g * 0.5, c.b * 0.5, 0] });
    }
    function updateCircle(dt) {
        if (!circle || circle.parent !== group) return;
        circle.userData.t -= dt;
        if (circle.userData.t <= 0) { group.remove(circle); circle = null; }
    }

    return {
        channel,
        // Returns true when the set-piece replaces the plain blast props.
        area(id, p, r, tier, dir, from, hit) { const f = SET[id]; return f ? !!f(p, r, 1 + 0.3 * (tier - 1), dir, from, hit) : false; },
        update(dt) {
            updateCircle(dt);
            for (let i = live.length - 1; i >= 0; i--) {
                const e = live[i]; e.t += dt;
                const k = Math.min(1, e.t / e.life);
                e.update?.(dt, k, e.t);
                if (e.obj.userData?.flames) e.obj.scale.y = 1 + Math.sin(e.t * 20) * 0.08;
                if (e.t >= e.life) { group.remove(e.obj); live.splice(i, 1); e.done?.(); }
            }
        },
    };
}
