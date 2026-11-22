import { sfx } from '../engine/sfx.js';
// Spell projectiles (Fireball and amo's 24 'targeted_directional' spells): flight, trail and impact in the
// spell's element colours; amo numbers for damage (spellDamageAt), status (scaledStatus), range, affinity.
// targeted_aoe (Fireball) bursts over an area; directional bolts hit the one they strike. Quirks: Triple Dart
// and Needle Volley fire a fan, Seeker Dart homes, Life Drain heals the caster, Chain Lightning jumps.
import { drape } from '../engine/drape.js';
import * as THREE from 'three';
import { createSpectacle } from './spectacle.js';
import { spells } from '@rules';

const { SPELLS, spellDamageAt, scaledStatus, spellRadius } = spells;
import { Particles, radialTexture } from '../engine/lib.js';
import { coreOf } from '../content/actors/enemyCore.js';
import { dispel as dispelCore } from '../content/actors/enemyMagic3d.js';

export const FIREBALL = SPELLS.fireball;
// Castable: bolts (targeted_directional), area spells (targeted_aoe — the Fireball flies, the rest land where you
// aim) and spells on yourself (self). Stone Skin is passive (it works while known).
export const CASTABLE = Object.values(SPELLS).filter(sp => ['targeted_directional', 'targeted_aoe', 'self'].includes(sp.targetingType) && !sp.id.startsWith('kill_') && !sp.id.startsWith('take_')).map(sp => sp.id);
export const isBolt = sp => sp.id === 'fireball' || sp.targetingType === 'targeted_directional';
// Element palettes: [core, glow start, glow end, light]
const PAL = {
    fire: [0xfff1c4, [1, 0.72, 0.3], [0.85, 0.18, 0.02], 0xff8a30], arcane: [0xe8e0ff, [0.7, 0.6, 1], [0.3, 0.2, 0.9], 0x9a7aff],
    lightning: [0xffffff, [1, 1, 0.7], [0.6, 0.7, 1], 0xd8e8ff], shadow: [0x8a5aaa, [0.5, 0.25, 0.7], [0.15, 0.05, 0.25], 0x8a4aff],
    void: [0x6a3a8a, [0.45, 0.2, 0.7], [0.1, 0.02, 0.2], 0x7a3aff], earth: [0xc8a070, [0.7, 0.55, 0.35], [0.35, 0.25, 0.15], 0xc89a60],
    water: [0xd8f4ff, [0.5, 0.85, 1], [0.15, 0.4, 0.8], 0x6ac8ff], ice: [0xeaffff, [0.7, 0.95, 1], [0.3, 0.6, 0.9], 0x9ae0ff],
    air: [0xf0fff4, [0.8, 1, 0.85], [0.4, 0.7, 0.5], 0xc8ffd8], light: [0xfffbe0, [1, 0.95, 0.7], [0.9, 0.75, 0.3], 0xfff0a0],
    nature: [0xd8ffc0, [0.6, 0.95, 0.4], [0.2, 0.5, 0.1], 0x9aff6a], wind: [0xf0fff4, [0.85, 1, 0.9], [0.5, 0.75, 0.6], 0xd8ffe8],
};
const palOf = sp => PAL[sp.element] ?? PAL.arcane;
const FAN = { triple_dart: 3, needle_volley: 5, rubble_spray: 4 };
const PIERCE = new Set(['phantom_dart', 'torrent_lance']);   // passes through the first target and goes on (amo lore)

// Each spell's own body, built pointing down +Z (it is turned along its flight): spin = roll about the flight
// axis, tumble = free rotation, flicker = re-jagged each frame (lightning). trail: fire | spark | dust | drops | smoke | air | none.
function buildShape(id, pal) {
    const g = new THREE.Group(), glow = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 0.95 });
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.7, ...o });
    const ice = std(0xcfeeff, { emissive: 0x4a9ad8, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.1 });
    const water = std(0x6ac8ff, { emissive: 0x2a6aa8, emissiveIntensity: 0.5, transparent: true, opacity: 0.7, roughness: 0.05 });
    const rock = std(0x7a6a58), add = (geo, m, z = 0, x = 0, y = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
    const dart = (len, r, m) => { const o = add(new THREE.OctahedronGeometry(r, 0), m); o.scale.set(1, 1, len / r / 2); return o; };
    const bolt = (len, w) => { const pts = []; for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3((Math.random() - 0.5) * w, (Math.random() - 0.5) * w, -len / 2 + (len * i) / 8)); const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, toneMapped: false })); g.add(l); return l; };
    // A blade of air or water: an arc standing across the flight (seen whole from behind the caster), bowed forward.
    const crescent = (r, tube, m) => { const o = add(new THREE.TorusGeometry(r, tube, 4, 18, Math.PI * 0.95), m); o.rotation.set(0, 0, Math.PI * 0.025 + Math.PI); o.scale.set(1, 0.55, 1); o.position.z = -r * 0.25; return o; };
    const streaks = (n, len, m) => { for (let i = 0; i < n; i++) { const st = add(new THREE.BoxGeometry(0.012, 0.012, len), m, -len * 0.4, (i - (n - 1) / 2) * 0.09, Math.sin(i) * 0.04); st.material = m; } };
    let spin = 'roll', trail = 'spark', light = true;
    switch (id) {
        case 'fireball': return null;   // the original burning knot
        case 'mana_dart': case 'triple_dart': dart(0.55, 0.07, glow(0xc8b8ff)); dart(0.75, 0.035, glow(0xffffff)); break;
        case 'seeker_dart': dart(0.55, 0.07, glow(0x9ad8ff)); add(new THREE.TorusGeometry(0.12, 0.012, 4, 12), glow(0xc8b8ff), -0.05); trail = 'spark'; break;
        case 'needle_volley': add(new THREE.CylinderGeometry(0.008, 0.016, 0.6, 4).rotateX(Math.PI / 2), glow(0xe8e0ff)); light = false; break;
        case 'phantom_dart': { const m = glow(0xd8d0ff); m.opacity = 0.4; dart(0.7, 0.09, m); dart(1.1, 0.05, glow(0xffffff)).material.opacity = 0.35; trail = 'air'; break; }
        case 'counterspell': { const r = add(new THREE.TorusGeometry(0.18, 0.02, 4, 24), glow(0xfff0c0)); r.rotation.x = 0; add(new THREE.OctahedronGeometry(0.07, 0), glow(0xffffff)); for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.02, 0.1, 0.01), glow(0xfff0c0), 0, Math.cos(i * 1.57) * 0.11, Math.sin(i * 1.57) * 0.11).rotation.z = i * 1.57; break; }
        case 'flame_lance': { add(new THREE.ConeGeometry(0.07, 0.8, 6).rotateX(Math.PI / 2), glow(0xfff1c4), 0.1); add(new THREE.ConeGeometry(0.14, 1.1, 6).rotateX(-Math.PI / 2), glow(0xff7a20), -0.35).material.opacity = 0.6; trail = 'fire'; break; }
        case 'arc_bolt': case 'chain_lightning': bolt(0.9, 0.18); bolt(0.7, 0.12); add(new THREE.SphereGeometry(0.08, 6, 5), glow(0xeaf4ff)); spin = 'flicker'; trail = 'spark'; break;
        case 'lightning_lance': bolt(2.2, 0.16); bolt(2.0, 0.1); bolt(1.6, 0.22); spin = 'flicker'; trail = 'spark'; break;
        case 'eclipse_mark': add(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: 0x08040c, side: THREE.DoubleSide })); add(new THREE.RingGeometry(0.16, 0.21, 24), glow(0xd8b8ff), -0.01).material.side = THREE.DoubleSide; spin = 'face'; trail = 'smoke'; break;
        case 'shadow_bolt': add(new THREE.IcosahedronGeometry(0.16, 0), std(0x1a1024, { emissive: 0x3a1a5a, emissiveIntensity: 0.8 })); add(new THREE.SphereGeometry(0.07, 6, 5), glow(0xb87aff)); spin = 'tumble'; trail = 'smoke'; break;
        case 'life_drain': { const d = add(new THREE.SphereGeometry(0.1, 8, 6), glow(0xd81a3a)); d.scale.set(1, 1, 1.8); add(new THREE.SphereGeometry(0.05, 6, 5), glow(0xff8a9a), 0.06); trail = 'smoke'; break; }
        case 'rubble_spray': for (let i = 0; i < 3; i++) add(new THREE.DodecahedronGeometry(0.07 + i * 0.02, 0), rock, (i - 1) * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12); spin = 'tumble'; trail = 'dust'; light = false; break;
        case 'stone_cannon': add(new THREE.DodecahedronGeometry(0.24, 0), std(0x6a5a4a, { emissive: 0x6a2a0a, emissiveIntensity: 0.5 })); spin = 'tumble'; trail = 'dust'; break;   // glows from friction (lore)
        case 'rock_bullet': add(new THREE.DodecahedronGeometry(0.11, 0), rock).scale.set(1, 1, 1.4); spin = 'tumble'; trail = 'dust'; light = false; break;
        case 'frost_shard': add(new THREE.OctahedronGeometry(0.1, 0), ice).scale.set(0.8, 0.8, 3.2); add(new THREE.OctahedronGeometry(0.05, 0), ice, -0.12, 0.06, 0).scale.set(0.7, 0.7, 2.4); trail = 'spark'; break;
        case 'glacial_spike': add(new THREE.ConeGeometry(0.16, 1.2, 6).rotateX(Math.PI / 2), ice); for (let i = 0; i < 3; i++) add(new THREE.ConeGeometry(0.05, 0.4, 4).rotateX(Math.PI / 2), ice, -0.3, Math.cos(i * 2.1) * 0.12, Math.sin(i * 2.1) * 0.12); trail = 'spark'; break;
        case 'ice_prison': for (let i = 0; i < 5; i++) { const c = add(new THREE.OctahedronGeometry(0.07, 0), ice, (Math.random() - 0.5) * 0.1, Math.cos(i * 1.26) * 0.1, Math.sin(i * 1.26) * 0.1); c.scale.set(0.7, 0.7, 2); c.rotation.set(Math.random(), Math.random(), 0); } spin = 'tumble'; trail = 'spark'; break;
        case 'water_blade': crescent(0.28, 0.035, water); add(new THREE.SphereGeometry(0.03, 5, 4), glow(0xd8f4ff), 0, 0.25, 0); trail = 'drops'; spin = 'face'; break;
        case 'tidal_bolt': add(new THREE.SphereGeometry(0.18, 10, 8), water); add(new THREE.SphereGeometry(0.1, 8, 6), glow(0xd8f4ff)).material.opacity = 0.35; spin = 'tumble'; trail = 'drops'; break;
        case 'torrent_lance': { const c = add(new THREE.CylinderGeometry(0.06, 0.1, 1.6, 8).rotateX(Math.PI / 2), water); c.position.z = -0.2; add(new THREE.ConeGeometry(0.1, 0.35, 8).rotateX(Math.PI / 2), water, 0.75); trail = 'drops'; break; }
        case 'wind_knife': { const m = glow(0xf4fff8); m.opacity = 0.8; crescent(0.2, 0.022, m); const sm = glow(0xffffff); sm.opacity = 0.45; streaks(3, 0.5, sm); trail = 'air'; light = false; spin = 'face'; break; }
        case 'gale_slash': { const m = glow(0xf4fff8); m.opacity = 0.75; crescent(0.45, 0.035, m); const m2 = glow(0xe8fff0); m2.opacity = 0.5; crescent(0.34, 0.018, m2); const sm = glow(0xffffff); sm.opacity = 0.4; streaks(5, 0.7, sm); trail = 'air'; light = false; spin = 'face'; break; }
        default: dart(0.5, 0.08, glow(pal[0]));
    }
    return { g, spin, trail, light };
}

export function createFireballs({ PX, tuning, onDamage, onShake, onHeal, dmgMult = () => 1, onSpellHit = null }) {
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

    let lastMap = null;
    // Set-pieces (walls, pillars, meteors, tornados…) for the area spells; their creatures/colliders come from the map.
    const spectacle = createSpectacle({ group, fx: { fire, sparks, smoke }, shake: a => onShake?.(a), getMap: () => lastMap,
        explodeAt: (p, sc = 1) => explode(p, UP, lastMap, [], { spell: FIREBALL, level: 1, cosmetic: true, scale: sc }) });
    // Spells grow with their tier: Novice ×1, Adept ×1.35, Master ×1.7 — and the Fireball is half again as big.
    const sizeOf = (spell, level) => (1 + 0.35 * (Math.max(1, level) - 1)) * (spell.id === 'fireball' ? 1.5 : 1);

    function setScene(scene) { scene.add(group); }

    // cosmetic: another player's fireball (online) — flies and bursts the same, hurts nothing here.
    function cast(origin, dir, level, int, { cosmetic = false, spell = FIREBALL, mult = 1 } = {}) {
        const n = FAN[spell.id] ?? 1;
        for (let k = 0; k < n; k++) {
            const a = n > 1 ? (k - (n - 1) / 2) * 0.16 : 0, d = dir.clone().applyAxisAngle(UP, a);
            launch(origin, d, level, int, cosmetic, spell, mult);
        }
    }
    function launch(origin, dir, level, int, cosmetic, spell, mult = 1) {
        const pal = palOf(spell), aoe = spell.targetingType === 'targeted_aoe';
        const light = ballLights.find(l => !balls.some(b => b.light === l)) ?? ballLights[0];
        light.color.setHex(pal[3]);
        const shape = buildShape(spell.id, pal);
        const core = shape ? shape.g : new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: pal[0], toneMapped: false }));
        const halo = new THREE.Sprite(glowMat()); halo.scale.setScalar(aoe ? 1.9 : 0.7);
        halo.material.color.setRGB(...pal[1]);
        if (shape && !shape.light) halo.visible = false;
        if (shape && ['dust', 'drops', 'air'].includes(shape.trail)) halo.material.opacity = 0.35;
        const inner = new THREE.Sprite(glowMat()); inner.scale.setScalar(aoe ? 0.8 : 0.3);
        inner.material.color.setHex(pal[0]);
        if (shape) inner.visible = false;
        const sz = sizeOf(spell, level);
        core.scale.multiplyScalar(sz); halo.scale.multiplyScalar(sz); inner.scale.multiplyScalar(sz);
        group.add(core, halo, inner);
        if (shape && !shape.light) light.color.setHex(0x000000);
        const speed = spell.projectileSpeed ?? (aoe ? 420 : 520);
        const b = {
            pos: origin.clone(), vel: dir.clone().multiplyScalar((speed / PX) * tuning.speedMult),
            traveled: 0, range: ((spell.range?.[level - 1] ?? 200) / PX) * tuning.rangeMult,
            core, halo, inner, light, level, int, t: 0, cosmetic, spell, pal, aoe, shape, hitSet: new Set(), mult,
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
        const tr = b.shape?.trail;
        if (tr === 'dust') for (let i = 0; i < 18; i++) { const v = new THREE.Vector3(R() - 0.5, R() * 0.8, R() - 0.5).multiplyScalar(5); sparks.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: v.x, vy: v.y, vz: v.z, grav: 14, drag: 0.4, life: 0.6, size: [0.09, 0.05], c0: [0.5, 0.42, 0.34, 1], c1: [0.4, 0.34, 0.28, 0] }); smoke.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: v.x * 0.2, vy: 0.5, vz: v.z * 0.2, drag: 1.5, life: 0.9, size: [0.3, 0.8], c0: [0.45, 0.4, 0.34, 0.5], c1: [0.4, 0.36, 0.3, 0] }); }
        else if (tr === 'drops') for (let i = 0; i < 24; i++) { const v = new THREE.Vector3(R() - 0.5, R(), R() - 0.5).multiplyScalar(4); sparks.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: v.x, vy: v.y, vz: v.z, grav: 12, drag: 0.4, life: 0.6, size: [0.08, 0.03], c0: [0.7, 0.9, 1, 1], c1: [0.3, 0.6, 1, 0] }); }
        else for (let i = 0; i < 26; i++) emit(b.pos, 4, 0.4, 0.5, b.pal);
        if (target && !b.cosmetic && (b.spell.id === 'ice_prison' || b.spell.id === 'eclipse_mark')) mark(b.spell.id, target);
        if (!target || b.cosmetic) return;
        const sp = b.spell, dmg = Math.max(1, Math.round(spellDamageAt(sp, b.level, b.int, dmgMult()) * (b.mult ?? 1)));
        const st = scaledStatus(sp, b.level), roll = st && R() < st.chance;
        const burn = roll && st.id === 'burning' ? st.duration : 0, status = roll && st.id !== 'burning' ? { id: st.id, ms: st.duration } : null;
        counter(sp, target, dmg);
        target.hit(dmg, b.pos, burn, undefined, status, sp.element);
        onDamage?.(target.pos.clone().setY(target.pos.y + 1.9), dmg, !target.alive, burn > 0);
        onSpellHit?.(sp, target);
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
        const radius = (spellRadius(spell, lvl) / PX) * tuning.radiusMult * (ball?.scale ?? 1), big = ball?.scale ?? sizeOf(spell, lvl);
        const flash = new THREE.Sprite(glowMat());
        flash.position.copy(p).addScaledVector(normal, 0.4);
        group.add(flash);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        ring.position.copy(p).addScaledVector(normal, 0.08);
        if (normal.y > 0.5) { ring.position.copy(p); ring.rotation.x = -Math.PI / 2; group.add(ring); drape(ring, 0.08); }   // on the ground: lying on its slopes
        else { ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); group.add(ring); }
        blasts.push({ t: 0, flash, ring, radius });
        blastLight.color.setHex(0xff9a40);
        blastLight.position.copy(p).addScaledVector(normal, 0.8);
        blastLight.intensity = 160;

        for (let i = 0; i < 90 * big; i++) emitFire(p.clone().addScaledVector(normal, 0.3), 3 + radius * 2.2, 0.75, (1.0 + R() * 0.5) * big);
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
            d.position.copy(p); d.rotation.x = -Math.PI / 2;
            group.add(d); drape(d, 0.04);   // the scorch lies on the ground round the blast, slopes and all
            decals.push({ mesh: d, t: 0 });
            if (decals.length > 14) { const old = decals.shift(); group.remove(old.mesh); }
        }
        onShake?.(0.22 * big);

        // Damage: amo's formula and burning roll, to everything in the blast.
        for (const h of hittables) {
            if (!h.alive) continue;
            const dist = Math.hypot(h.pos.x - p.x, h.pos.y + 1 - p.y, h.pos.z - p.z);
            if (dist > radius + 0.6) continue;
            const dmg = Math.max(1, Math.round(spellDamageAt(spell, lvl, ball?.int ?? 12, dmgMult()) * (ball?.mult ?? 1)));
            const st = scaledStatus(spell, lvl);
            const burn = st && R() < st.chance ? st.duration : 0;
            const killed = h.hit(dmg, p, burn);
            if (killed !== 'handled') onDamage?.(h.pos.clone().setY(h.pos.y + 1.9), dmg, killed, burn > 0);
            if (!ball?.cosmetic) onSpellHit?.(spell, h);
        }
        void map;
    }

    // After-effects on the one hit: Ice Prison grows crystals round them, Eclipse Mark hangs its sigil over them.
    const marks = [];
    function mark(id, target) {
        const m = new THREE.Group();
        if (id === 'ice_prison') {
            const ice = new THREE.MeshStandardMaterial({ color: 0xcfeeff, emissive: 0x4a9ad8, emissiveIntensity: 0.6, transparent: true, opacity: 0.8, flatShading: true, roughness: 0.1 });
            for (let i = 0; i < 9; i++) { const a = i * 0.7, c = new THREE.Mesh(new THREE.ConeGeometry(0.12 + R() * 0.08, 0.8 + R() * 0.8, 5), ice); c.position.set(Math.cos(a) * 0.55, 0.4, Math.sin(a) * 0.55); c.rotation.set((R() - 0.5) * 0.6, 0, (R() - 0.5) * 0.6); m.add(c); }
        } else {
            const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 32), new THREE.MeshBasicMaterial({ color: 0xc8a8ff, transparent: true, side: THREE.DoubleSide, toneMapped: false }));
            const disc = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ color: 0x0a0410, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
            m.add(disc, ring); m.userData.float = 2.6;
        }
        group.add(m);
        marks.push({ m, target, t: 0, life: id === 'ice_prison' ? 3 : 6 });
    }
    // ---- area spells: a blast where they land, in the element's look; lasting ones leave a zone ----
    // props by element: what rises out of the ground (or falls on it) at the blast.
    const zones = [], props = [];
    const PROP = {
        earth: () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.18 + R() * 0.12, 0.9 + R() * 0.8, 5), new THREE.MeshStandardMaterial({ color: 0x7a6a58, flatShading: true })); return { m, rise: 1 }; },
        ice: () => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: 0xcfeeff, emissive: 0x4a9ad8, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, flatShading: true })); m.scale.set(0.7, 2.4, 0.7); return { m, rise: 1 }; },
        nature: () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.06, 1.2, 4), new THREE.MeshStandardMaterial({ color: 0x3f7a2c, flatShading: true })); m.rotation.z = (R() - 0.5) * 0.8; return { m, rise: 1, sway: true }; },
        water: () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.2, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x6ac8ff, emissive: 0x2a6aa8, emissiveIntensity: 0.4, transparent: true, opacity: 0.55, side: THREE.DoubleSide })); return { m, rise: 1, one: true }; },
        wind: () => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.03, 4, 18), new THREE.MeshBasicMaterial({ color: 0xf0fff4, transparent: true, opacity: 0.5 })); m.rotation.x = Math.PI / 2; return { m, spin: true }; },
        lightning: () => { const pts = []; for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3((R() - 0.5) * 0.5, 7 - i * 0.9, (R() - 0.5) * 0.5)); return { m: new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, toneMapped: false })), flash: true }; },
        shadow: () => ({ m: new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x1a0828, transparent: true, opacity: 0.5, side: THREE.DoubleSide })), dome: true, one: true }),
        arcane: () => ({ m: new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xb89aff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })), dome: true, one: true }),
        fire: () => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.85, toneMapped: false })); return { m, rise: 1, flicker: true }; },
    };
    function blastAt(point, spell, level, int, hittables, { cosmetic = false, small = false, dir = null, from = null, mult = 1 } = {}) {
        const pal = palOf(spell), el = spell.element === 'void' ? 'shadow' : spell.element, r = small ? 0.6 : ((spellRadius(spell, level) ?? 40) / PX) * tuning.radiusMult;
        if (small) { for (let i = 0; i < 40; i++) emit(point.clone().setY(point.y + 1), 3, 0.4, 0.5, pal); blastLight.color.setHex(pal[3]); blastLight.position.copy(point).setY(point.y + 1); blastLight.intensity = 50; return; }
        sfx.boom();
        // ring on the ground + a flash of the element
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: pal[3], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        ring.position.copy(point); ring.rotation.x = -Math.PI / 2; group.add(ring); drape(ring, 0.08);
        const flash = new THREE.Sprite(glowMat()); flash.material.color.setHex(pal[3]); flash.position.copy(point).setY(point.y + 0.6); group.add(flash);
        blasts.push({ t: 0, flash, ring, radius: r });
        blastLight.color.setHex(pal[3]); blastLight.position.copy(point).setY(point.y + 1); blastLight.intensity = 90;
        for (let i = 0; i < 60; i++) emit(point.clone().setY(point.y + 0.3), 2 + r * 2, 0.6, 0.7, pal);
        const aim = dir ? new THREE.Vector3(dir.x, 0, dir.z).normalize() : new THREE.Vector3(0, 0, 1);
        const tick = (pt, rr, frac) => { if (!cosmetic) hitArea(pt, rr, spell, level, int, lastMap?.hittables ?? hittables, true, frac); };
        const staged = spectacle.area(spell.id, point, r, level, aim, from, tick);
        const mk = PROP[el] ?? PROP.arcane, n = staged ? 0 : mk === PROP.water || mk === PROP.shadow || mk === PROP.arcane ? 1 : Math.round(6 + r * 3);
        for (let i = 0; i < n; i++) {
            const pr = mk(), a = (i / n) * Math.PI * 2 + R(), d = pr.one ? 0 : r * (0.25 + R() * 0.7);
            pr.m.position.set(point.x + Math.cos(a) * d, point.y, point.z + Math.sin(a) * d);
            if (pr.dome) pr.m.scale.setScalar(0.1);
            group.add(pr.m);
            props.push({ ...pr, t: 0, life: spell.duration ? spell.duration[level - 1] / 1000 : 1.4, r, y0: point.y, base: pr.m.scale.clone() });
        }
        if (cosmetic) return;
        hitArea(point, r, spell, level, int, hittables, true, mult);
        if (spell.duration) zones.push({ point: point.clone(), r, spell, level, int, left: spell.duration[level - 1] / 1000, tick: 1 });
    }
    // Unravel / Purifying Sweep (dispel) tear a creature's magical buffs away — a ward, the Void Aegis — and Unravel
    // hurts it again for each (dispelBonus); Counterspell and Unravel (interrupt) break a spell it is shaping.
    function counter(spell, h, dmg) {
        if (!spell.dispel && !spell.interrupt) return;
        const core = coreOf(h.pos);
        if (!core || core.s.dead) return;
        const at = h.pos.clone().setY(h.pos.y + 2.3);
        if (spell.interrupt && core.caster?.casting) core.caster.interrupt(core.lastCtx);
        if (spell.dispel) {
            const gone = dispelCore(core);
            if (gone.length) {
                onDamage?.(at, 0, false, false, `Dispelled ${gone.join(', ')}`);
                if (spell.dispelBonus && dmg > 0) h.hit(Math.max(1, Math.round(dmg * spell.dispelBonus * gone.length)), at, 0, undefined, null, spell.element);
            }
        }
    }
    function hitArea(point, r, spell, level, int, hittables, withDamage, mult = 1) {
        for (const h of hittables) {
            if (!h.alive || h.kind === 'deer') continue;
            if (Math.hypot(h.pos.x - point.x, h.pos.z - point.z) > r + 0.5) continue;
            const dmg = withDamage ? Math.round(spellDamageAt(spell, level, int, dmgMult()) * mult) : 0;
            const st = scaledStatus(spell, level), roll = st && R() < st.chance;
            const burn = roll && st.id === 'burning' ? st.duration : 0, status = roll && st.id !== 'burning' ? { id: st.id, ms: st.duration > 0 ? st.duration : 8000 } : null;
            if (withDamage) counter(spell, h, dmg);
            if (dmg > 0 || status || burn) {
                h.hit(Math.max(dmg, withDamage ? 1 : 0) || 1, point, burn, undefined, status, spell.element);
                if (dmg > 0) onDamage?.(h.pos.clone().setY(h.pos.y + 1.9), dmg, !h.alive, burn > 0);
                if (withDamage) onSpellHit?.(spell, h);
            }
        }
    }

    const tmp = new THREE.Vector3();
    function update(dt, map, hittables) {
        lastMap = map; spectacle.update(dt); updateTrail(dt);
        for (let i = zones.length - 1; i >= 0; i--) {   // a lasting zone re-applies its effect every second (no extra damage)
            const z = zones[i]; z.left -= dt; z.tick -= dt;
            if (z.tick <= 0) { z.tick = 1; for (const h of hittables) if (h.alive && h.kind !== 'deer' && Math.hypot(h.pos.x - z.point.x, h.pos.z - z.point.z) < z.r) { const st = scaledStatus(z.spell, z.level); if (st) h.hit(1, z.point, st.id === 'burning' ? st.duration : 0, undefined, st.id !== 'burning' ? { id: st.id, ms: 1500 } : null, z.spell.element); } }
            if (z.left <= 0) zones.splice(i, 1);
        }
        for (let i = props.length - 1; i >= 0; i--) {
            const pr = props[i]; pr.t += dt;
            const k = pr.t / pr.life, grow = Math.min(1, pr.t * 6), fade = Math.max(0, Math.min(1, (pr.life - pr.t) / 0.5));
            if (pr.rise) pr.m.position.y = pr.y0 - 0.9 + grow * 0.9 + (pr.flicker ? Math.sin(pr.t * 30) * 0.05 : 0);
            if (pr.dome) pr.m.scale.setScalar(pr.r * Math.min(1, pr.t * 4));
            if (pr.spin) { pr.m.rotation.z += dt * 8; pr.m.position.y = pr.y0 + (pr.t * 2 % 2); pr.m.scale.setScalar(0.5 + (pr.t * 2 % 1)); }
            if (pr.sway) pr.m.rotation.x = Math.sin(pr.t * 3) * 0.2;
            if (pr.flash) pr.m.visible = R() < 0.6;
            if (pr.flicker) pr.m.scale.set(1, 1 + Math.sin(pr.t * 25) * 0.25, 1);
            pr.m.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = (o.material.userData.base ??= o.material.opacity) * fade; } });
            if (k >= 1) { group.remove(pr.m); props.splice(i, 1); }
        }
        for (let i = marks.length - 1; i >= 0; i--) {
            const k = marks[i]; k.t += dt;
            k.m.position.set(k.target.pos.x, k.target.pos.y + (k.m.userData.float ?? 0), k.target.pos.z);
            if (k.m.userData.float) k.m.rotation.y += dt * 1.5;
            else k.m.scale.setScalar(Math.min(1, k.t * 5));
            const fade = Math.max(0, Math.min(1, (k.life - k.t) / 0.6));
            k.m.traverse(o => { if (o.material) { o.material.transparent = true; o.material.opacity = (o.material.userData.base ??= o.material.opacity) * fade; } });
            if (k.t >= k.life || !k.target.alive) { group.remove(k.m); marks.splice(i, 1); }
        }
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
                    if (!b.cosmetic && h.alive && !b.hitSet.has(h) && Math.hypot(h.pos.x - b.pos.x, h.pos.z - b.pos.z) < 0.6 && b.pos.y > h.pos.y && b.pos.y < h.pos.y + 2.1) {
                        if (PIERCE.has(b.spell.id) && b.hitSet.size < 3) { b.hitSet.add(h); strike(b, h, hittables); }   // goes on through
                        else hit = { normal: b.vel.clone().normalize().negate(), target: h };
                    }
                }
                if (!hit && b.traveled >= b.range) hit = { normal: UP.clone() };
            }
            b.core.position.copy(b.pos);
            b.halo.position.copy(b.pos);
            b.inner.position.copy(b.pos);
            if (b.shape) {   // turned along its flight, then its own motion
                b.core.lookAt(tmp.copy(b.pos).add(b.vel));
                const sp = b.shape.spin;
                if (sp === 'roll') b.core.rotateZ(b.t * 14);
                else if (sp === 'tumble') b.core.rotation.set(b.t * 11, b.t * 7, b.t * 5);
                else if (sp === 'flicker') for (const c of b.core.children) if (c.isLine) { const a = c.geometry.attributes.position; for (let k = 1; k < a.count - 1; k++) { a.setX(k, (R() - 0.5) * 0.2); a.setY(k, (R() - 0.5) * 0.2); } a.needsUpdate = true; }
                b.halo.scale.setScalar((b.aoe ? 1.7 : 0.7) + Math.sin(b.t * 40) * 0.1);
            } else {
                b.halo.scale.setScalar(1.7 + Math.sin(b.t * 40) * 0.25);
                b.core.rotation.set(b.t * 9, b.t * 7, 0);
            }
            b.light.position.copy(b.pos);
            b.light.intensity = 28 + Math.sin(b.t * 50) * 6;
            // Trail: by the spell's nature.
            const tr = b.shape?.trail ?? 'fire';
            if (tr === 'dust') { if (R() < 0.7) smoke.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: (R() - 0.5) * 0.5, vy: 0.2, vz: (R() - 0.5) * 0.5, drag: 2, life: 0.5, size: [0.15, 0.45], c0: [0.45, 0.38, 0.3, 0.5], c1: [0.4, 0.35, 0.3, 0] }); }
            else if (tr === 'drops') { for (let k = 0; k < 3; k++) sparks.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: (R() - 0.5) * 1.5, vy: R() * 0.8, vz: (R() - 0.5) * 1.5, grav: 9, drag: 0.5, life: 0.45, size: [0.07, 0.03], c0: [0.6, 0.85, 1, 0.9], c1: [0.3, 0.6, 1, 0] }); }
            else if (tr === 'smoke') { for (let k = 0; k < 2; k++) smoke.emit({ x: b.pos.x + (R() - 0.5) * 0.1, y: b.pos.y, z: b.pos.z + (R() - 0.5) * 0.1, vx: (R() - 0.5) * 0.3, vy: 0.2, vz: (R() - 0.5) * 0.3, drag: 1.5, life: 0.7, size: [0.2, 0.5], c0: [...b.pal[2].map(v => v * 0.6), 0.6], c1: [0.05, 0.02, 0.08, 0] }); }
            else if (tr === 'air') { if (R() < 0.5) fire.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: (R() - 0.5) * 0.4, vy: (R() - 0.5) * 0.4, vz: (R() - 0.5) * 0.4, drag: 3, life: 0.25, size: [0.25, 0.05], c0: [...b.pal[1], 0.25], c1: [...b.pal[2], 0] }); }
            else if (tr === 'spark') { for (let k = 0; k < 2; k++) sparks.emit({ x: b.pos.x, y: b.pos.y, z: b.pos.z, vx: (R() - 0.5) * 1.2, vy: (R() - 0.5) * 1.2, vz: (R() - 0.5) * 1.2, drag: 2, life: 0.3, size: [0.07, 0.02], c0: [...b.pal[1], 1], c1: [...b.pal[2], 0] }); }
            if (tr === 'fire') for (let k = 0; k < 4; k++) {
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

    // A blade's swing leaves a fading streak: each frame of the cut adds a segment from near the hilt to the tip.
    const TRAIL_N = 24, trailPos = new Float32Array(TRAIL_N * 2 * 3), trailCol = new Float32Array(TRAIL_N * 2 * 4), trailSamples = [];
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 4));
    const idx = []; for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    trailGeo.setIndex(idx);
    const trailMesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    trailMesh.frustumCulled = false; group.add(trailMesh);
    function slash(a, b) { trailSamples.push({ a: a.clone(), b: b.clone(), age: 0 }); if (trailSamples.length > TRAIL_N) trailSamples.shift(); }
    function updateTrail(dt) {
        for (const s of trailSamples) s.age += dt;
        while (trailSamples.length && trailSamples[0].age > 0.16) trailSamples.shift();
        const n = trailSamples.length;
        for (let i = 0; i < TRAIL_N; i++) {
            const s = trailSamples[Math.min(i, n - 1)], f = s && i < n ? Math.max(0, 1 - s.age / 0.16) * (i / Math.max(1, n - 1)) : 0;
            for (const [j, p] of [[0, s?.a], [1, s?.b]]) {
                const o = (i * 2 + j) * 3, c = (i * 2 + j) * 4;
                trailPos[o] = p?.x ?? 0; trailPos[o + 1] = p?.y ?? -999; trailPos[o + 2] = p?.z ?? 0;
                trailCol[c] = 0.85 * f; trailCol[c + 1] = 0.9 * f; trailCol[c + 2] = 1 * f; trailCol[c + 3] = f * (j ? 0.9 : 0.1);
            }
        }
        trailGeo.attributes.position.needsUpdate = true; trailGeo.attributes.color.needsUpdate = true;
    }
    const channel = (spell, feet, top, k, dt) => spectacle.channel(feet, top, palOf(spell)[3], k, dt);
    return { setScene, cast, blastAt, update, channel, slash, fire, active: () => balls.length, get balls() { return balls; } };
}
