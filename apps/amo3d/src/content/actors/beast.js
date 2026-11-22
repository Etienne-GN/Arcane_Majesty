import { sfx } from '../../engine/sfx.js';
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

import { body2, NAMES2, FLYERS2, PLATE2 } from './bodies2.js';
import { buildHound } from '../models/hound.js';
import { buildRobed } from '../models/robed.js';
export const NAMES = { ...NAMES2, grave_wraith: 'Grave-Wraith', cursed_knight: 'Cursed Knight', lava_elemental: 'Magma-Eater', ember_imp: 'Cinder-Soul', stone_golem: 'Obsidian Golem', cave_bat: 'Cave Bat', blind_stalker: 'Blind Stalker', deep_horror: 'Deep Horror', gloom_beak: 'Gloom-Beak', frost_shade: 'Frost-Shade', crag_fiend: 'Crag-Fiend', void_stalker: 'Void-Stalker', blight_ent: 'Blight-Ent', root_wraith: 'Root-Wraith', corrupted_sentinel: 'Corrupted Sentinel' };
const TUNE = { sight: 2.6, reach: 2, speed: 1.4 };

function body(type) {
    const b2 = body2(type); if (b2) return b2;   // the newer families (bodies2.js)
    const root = new THREE.Group(), parts = {};
    const add = (geo, m, x = 0, y = 0, z = 0, parent = root) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    if (type === 'grave_wraith') {   // a pale hooded ghost of the old vigil, its ragged robe trailing into mist
        const M = new THREE.MeshStandardMaterial({ color: 0xd8e0f0, emissive: 0x8a9ac8, emissiveIntensity: 0.5, transparent: true, opacity: 0.55, flatShading: true, depthWrite: false });
        parts.mat = M;
        const f = buildRobed({ robe: M, trim: 0xa8b4d0, skin: 0xd8e0f0, eyeColor: 0xbfe0ff, tattered: true, height: 1.9 });
        root.add(f.root); f.armL.rotation.x = -0.5; f.armR.rotation.x = -0.4; parts.eyes = f.eyes;
    } else if (type === 'cursed_knight') {   // a knight of the vigil who never lay down: rusted plate, a broken helm, a notched sword
        const steel = flat(0x5a5650), rust = flat(0x6a4a34), dark = flat(0x1a1818);
        add(new THREE.BoxGeometry(0.62, 0.75, 0.38), steel, 0, 1.35, 0);
        add(new THREE.BoxGeometry(0.66, 0.2, 0.42), rust, 0, 1.0, 0);
        add(new THREE.CylinderGeometry(0.17, 0.19, 0.34, 8), steel, 0, 1.95, 0);
        add(new THREE.BoxGeometry(0.22, 0.03, 0.02), dark, 0, 1.96, 0.19);   // the visor slit
        for (const s of [1, -1]) {
            const arm = new THREE.Group(); arm.position.set(s * 0.4, 1.65, 0); root.add(arm);
            add(new THREE.BoxGeometry(0.18, 0.65, 0.18), steel, 0, -0.32, 0, arm);
            if (s > 0) { const blade = add(new THREE.BoxGeometry(0.06, 1.0, 0.12), flat(0x8a8a86), 0, -0.95, 0.25, arm); blade.rotation.x = 1.2; }
            parts[s > 0 ? 'armL' : 'armR'] = arm;
            add(new THREE.BoxGeometry(0.2, 0.9, 0.22), rust, s * 0.16, 0.45, 0);
        }
        parts.eyes = add(new THREE.BoxGeometry(0.18, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: 0x8ac8ff, toneMapped: false }), 0, 1.96, 0.2);
    } else if (type === 'lava_elemental') {   // a Magma-Eater: a hunched crawler of black crust over molten rock, a wide glowing maw
        const crust = flat(0x1e1a1a), glow = new THREE.MeshStandardMaterial({ color: 0xff6a20, emissive: 0xff4a10, emissiveIntensity: 1.6, flatShading: true });
        const b = add(new THREE.DodecahedronGeometry(0.7, 0), crust, 0, 1.0, 0); b.scale.set(1.2, 0.8, 1.1);
        for (let k = 0; k < 6; k++) add(new THREE.BoxGeometry(0.05, 0.35, 0.03), glow, Math.cos(k) * 0.55, 1.0 + Math.sin(k * 2) * 0.2, Math.sin(k) * 0.5).rotation.z = k;
        add(new THREE.BoxGeometry(0.6, 0.18, 0.2), glow, 0, 0.85, 0.72);   // the maw
        for (const s of [1, -1]) {
            const arm = new THREE.Group(); arm.position.set(s * 0.75, 1.2, 0.2); root.add(arm);
            add(new THREE.DodecahedronGeometry(0.3, 0), crust, 0, -0.45, 0.1, arm);
            add(new THREE.ConeGeometry(0.18, 0.5, 5), glow, 0, -0.85, 0.2, arm).rotation.x = Math.PI;
            parts[s > 0 ? 'armL' : 'armR'] = arm;
            add(new THREE.CylinderGeometry(0.2, 0.26, 0.6, 6), crust, s * 0.4, 0.3, -0.1);
        }
        parts.eyes = add(new THREE.BoxGeometry(0.4, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xffd060, toneMapped: false }), 0, 1.25, 0.75);
    } else if (type === 'ember_imp') {   // a Cinder-Soul: a drifting wraith of embers and smoke, burning eyes
        const M = new THREE.MeshStandardMaterial({ color: 0xff8a3a, emissive: 0xff4a10, emissiveIntensity: 1.2, transparent: true, opacity: 0.75, flatShading: true, depthWrite: false });
        const smoke = new THREE.MeshStandardMaterial({ color: 0x2a2220, transparent: true, opacity: 0.6, flatShading: true, depthWrite: false });
        parts.mat = M;
        add(new THREE.ConeGeometry(0.34, 1.2, 7, 1, true).translate(0, 0.6, 0), smoke);
        add(new THREE.IcosahedronGeometry(0.26, 0), M, 0, 1.25, 0);
        for (let k = 0; k < 5; k++) add(new THREE.TetrahedronGeometry(0.07, 0), M, Math.cos(k * 1.3) * 0.3, 0.4 + k * 0.18, Math.sin(k * 1.3) * 0.3);
        parts.eyes = add(new THREE.BoxGeometry(0.18, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0xfff0a0, toneMapped: false, transparent: true }), 0, 1.3, 0.24);
    } else if (type === 'stone_golem') {   // an Obsidian Golem: blocks of black glass, a cracked chest glowing within
        const ob = new THREE.MeshStandardMaterial({ color: 0x3a3446, roughness: 0.3, metalness: 0.2, flatShading: true }), glow = new THREE.MeshBasicMaterial({ color: 0xff6a20, toneMapped: false });
        add(new THREE.BoxGeometry(1.4, 1.5, 0.9), ob, 0, 1.6, 0); add(new THREE.BoxGeometry(0.8, 0.7, 0.7), ob, 0, 2.7, 0.05);
        add(new THREE.BoxGeometry(0.5, 0.5, 0.04), glow, 0, 1.7, 0.47).rotation.z = 0.4;
        for (const s of [1, -1]) {
            const arm = new THREE.Group(); arm.position.set(s * 0.95, 2.1, 0); root.add(arm);
            add(new THREE.BoxGeometry(0.5, 1.2, 0.5), ob, 0, -0.6, 0, arm); add(new THREE.BoxGeometry(0.6, 0.55, 0.6), ob, 0, -1.3, 0.05, arm);
            parts[s > 0 ? 'armL' : 'armR'] = arm;
            add(new THREE.BoxGeometry(0.55, 0.9, 0.6), ob, s * 0.38, 0.45, 0);
        }
        parts.eyes = add(new THREE.BoxGeometry(0.4, 0.07, 0.02), glow, 0, 2.8, 0.41);
    } else if (type === 'cave_bat') {   // a leathery bat of the deep places: big ears, red eyes, ragged wings
        const M = flat(0x2a2224), wingM = flat(0x3a2a2a, { side: THREE.DoubleSide });
        const b = add(new THREE.SphereGeometry(0.16, 7, 5), M); b.scale.set(0.9, 0.8, 1.2);
        for (const s of [1, -1]) add(new THREE.ConeGeometry(0.05, 0.16, 4), M, s * 0.07, 0.17, 0.1);
        for (const s of [1, -1]) {
            const pivot = new THREE.Group(); pivot.position.set(s * 0.1, 0.04, 0); root.add(pivot);
            const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.12), new THREE.Vector3(s * 0.55, 0, 0.15), new THREE.Vector3(s * 0.45, 0, -0.1), new THREE.Vector3(s * 0.3, 0, -0.18), new THREE.Vector3(0, 0, -0.1)]);
            g.setIndex(s > 0 ? [0, 1, 2, 0, 2, 3, 0, 3, 4] : [0, 2, 1, 0, 3, 2, 0, 4, 3]); g.computeVertexNormals();
            add(g, wingM, 0, 0, 0, pivot);
            parts[s > 0 ? 'wingL' : 'wingR'] = pivot;
        }
        parts.eyes = add(new THREE.BoxGeometry(0.1, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3a2a, toneMapped: false }), 0, 0.06, 0.18);
    } else if (type === 'blind_stalker') {   // a pale eyeless hound that hunts by sound: a long blind skull, a knuckled spine, a glowing maw
        const h = buildHound({ coat: 0xb8b0a4, belly: 0x9a9286, dark: 0x5a524a, mawColor: 0xd8ff8a, eyeless: true, knuckles: true, scale: 1.05 });
        root.add(h.root); Object.assign(parts, { legs: h.legs, lowers: h.lowers, jaw: h.jaw, tail: h.tail, eyes: h.eyes });
    } else if (type === 'deep_horror') {   // a mass of grey flesh and tentacles from below the deepest workings, one great eye
        const M = flat(0x8a7484), dark = flat(0x5a4858), eye = new THREE.MeshBasicMaterial({ color: 0xffe060, toneMapped: false });
        const b = add(new THREE.IcosahedronGeometry(0.9, 1), M, 0, 1.2, 0); b.scale.set(1.1, 0.9, 1);
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, t = add(new THREE.ConeGeometry(0.18, 1.1, 5), dark, Math.cos(a) * 0.75, 0.45, Math.sin(a) * 0.75); t.rotation.set(Math.sin(a) * 0.9 + Math.PI, 0, -Math.cos(a) * 0.9); }
        for (const s of [1, -1]) {   // two long grasping tentacles
            const arm = new THREE.Group(); arm.position.set(s * 0.85, 1.5, 0.2); root.add(arm);
            add(new THREE.CylinderGeometry(0.1, 0.2, 1.4, 6), M, 0, -0.6, 0.1, arm);
            add(new THREE.ConeGeometry(0.12, 0.5, 5), dark, 0, -1.45, 0.15, arm).rotation.x = Math.PI;
            parts[s > 0 ? 'armL' : 'armR'] = arm;
        }
        parts.eyes = add(new THREE.SphereGeometry(0.24, 10, 8), eye, 0, 1.45, 0.78);
    } else if (type === 'gloom_beak') {
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
    } else if (type === 'void_stalker') {   // a lean shadow-hound with glowing violet spines and eyes
        const h = buildHound({ coat: 0x1e1828, belly: 0x2a2236, dark: 0x0e0a14, eyeColor: 0xc86aff, mawColor: 0x9a4aff, spines: 0x6a2aaa, scale: 1.1 });
        root.add(h.root); Object.assign(parts, { legs: h.legs, lowers: h.lowers, jaw: h.jaw, tail: h.tail, eyes: h.eyes });
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

// A random stream seeded by a name and the calendar day: the same creatures (elites included) for every player
// on a map today, a new roll tomorrow.
export function dailyRng(name) {
    let h = 2166136261 ^ Math.floor(Date.now() / 86400000);
    for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    let a = h >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// amo's elites: at most one per six spawns, each spawn an 8% chance (eliteCap / rollElite / pickAffixes);
// rareFrom: the map definition whose gathering pools give the elite's rare drop (eliteRareDrop).
export function createBeasts({ scene, map, rng, type, posts, rareFrom = null }) {
    const cap = EL.eliteCap(posts.length);
    let count = 0;
    return posts.map(post => {
        // post.boss: a dungeon's boss — always elite, bigger, with its own name (post.name)
        const elite = post.boss ? { affixes: EL.pickAffixes(rng), rareDrop: EL.eliteRareDrop(rareFrom, rng), boss: true }
            : EL.rollElite(rng, count, cap) ? (count++, { affixes: EL.pickAffixes(rng), rareDrop: EL.eliteRareDrop(rareFrom, rng) }) : null;
        return createBeast({ scene, map, rng, type, home: post, elite, name: post.name });
    });
}

function createBeast({ scene, map, rng, type, home, elite = null, name = null }) {
    const { root, parts } = body(type);
    scene.add(root);
    if (elite) root.scale.setScalar(elite.boss ? 1.7 : 1.2);
    const pos = new THREE.Vector3(home.x, map.heightAt(home.x, home.z), home.z);
    const core = createEnemyCore({ type, name: name ?? NAMES[type] ?? type, pos, rng, respawnS: elite?.boss ? 1e9 : 30, elite });   // a boss stays dead
    const DEF = core.DEF, s = core.s;
    const SIGHT = (DEF.sightRange / PX) * TUNE.sight, REACH0 = (DEF.attackRange / PX) * TUNE.reach + (['crag_fiend', 'blight_ent', 'corrupted_sentinel', 'deep_horror', 'lava_elemental', 'stone_golem', 'cursed_knight'].includes(type) ? 0.6 : 0);
    const REACH = NAMES2[type] ? Math.min(REACH0, 2.8) : REACH0;   // casters with a long amo range strike only up close (their spells do the rest)
    const SPEED = Math.min(6.5, (DEF.speed / PX) * TUNE.speed);
    const ai = { state: 'idle', timer: rng() * 3, heading: rng() * 6.28, speed: 0, cd: 1 + rng(), t: rng() * 10, target: null, hit: false };
    const navKey = {};
    const flyer = type === 'gloom_beak' || type === 'cave_bat' || FLYERS2.has(type);
    const isBoss = !!elite?.boss; let strikes = 0, slam = false, ring = null;   // a boss slams every third attack: a ring on the ground, then everything in it is hit
    const turn = (want, k) => { const d = ((((want - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI; ai.heading += d * Math.min(1, k); };

    // Online puppet: follow the host's snapshots ([x, y, z, heading, state, hp, dead]).
    const STATES = ['idle', 'wander', 'notice', 'chase', 'windup', 'strike', 'recover', 'return'];
    let snap = null;
    function puppetStep(dt) {
        if (!snap) return;
        const k = 1 - Math.exp(-dt * 10);
        pos.x += (snap[0] - pos.x) * k; pos.z += (snap[2] - pos.z) * k; pos.y = map.heightAt(pos.x, pos.z);
        const d = ((((snap[3] - ai.heading) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        ai.heading += d * k;
        ai.state = STATES[snap[4]] ?? 'idle';
        ai.speed = ai.state === 'chase' || ai.state === 'wander' || ai.state === 'return' ? SPEED * 0.6 : 0;
        s.engaged = !['idle', 'wander', 'return'].includes(ai.state);
    }
    function applySnapshot(v) {
        snap = v;
        s.hp = v[5];
        if (v[6] && !s.dead) { s.dead = true; s.deadT = 0; s.hp = 0; }
        else if (!v[6] && s.dead) { core.revive(); pos.set(v[0], map.heightAt(v[0], v[2]), v[2]); root.rotation.z = 0; root.visible = true; }
    }
    const snapshot = () => [+pos.x.toFixed(2), +pos.y.toFixed(2), +pos.z.toFixed(2), +ai.heading.toFixed(2), Math.max(0, STATES.indexOf(ai.state)), Math.round(s.hp), s.dead ? 1 : 0];

    function update(dt, ctx) {
        ai.t += dt;
        if (!core.tick(dt, ctx)) {   // dead: topple / fall, then respawn at home
            if (ring) ring.visible = false;
            const k = Math.min(1, s.deadT / 0.6);
            root.rotation.z = (Math.PI / 2) * k;
            root.position.y = map.heightAt(pos.x, pos.z) + (flyer ? 0.2 : 0);
            root.visible = s.deadT < 10;
            if (!core.net.puppet && s.deadT > core.respawnS) { core.revive(); pos.set(home.x, map.heightAt(home.x, home.z), home.z); root.rotation.z = 0; root.visible = true; ai.state = 'idle'; }
            core.updatePlate(ctx.camera, flyer ? 3.4 : 2.8);
            return;
        }
        // Who it goes for: the nearest living player (online: anyone on this map; ctx.players).
        const T = (ctx.players ?? [{ id: 'me', pos: ctx.player.pos, dead: ctx.player.dead }]).reduce((b, q) => (!q.dead && (!b || Math.hypot(q.pos.x - pos.x, q.pos.z - pos.z) < Math.hypot(b.pos.x - pos.x, b.pos.z - pos.z)) ? q : b), null) ?? { id: 'me', pos: ctx.player.pos, dead: true };
        const P = T.pos, toP = Math.hypot(P.x - pos.x, P.z - pos.z), ang = Math.atan2(P.x - pos.x, P.z - pos.z);
        const fromHome = Math.hypot(pos.x - home.x, pos.z - home.z);
        if (core.net.puppet) puppetStep(dt);
        else {
        ai.cd -= dt;
        let want = 0;
        if (core.stunned()) { if (ai.state === 'windup' || ai.state === 'strike') ai.state = 'chase'; }
        else if (ai.state === 'idle' || ai.state === 'wander') {
            if (!T.dead && toP < SIGHT) { ai.state = 'notice'; ai.timer = 0.5; if (toP < 18) sfx.growl(); }
            else if (ai.state === 'idle' && (ai.timer -= dt) <= 0) { const a = rng() * 6.28, r = 2 + rng() * 6; ai.target = { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r }; ai.state = 'wander'; }
            else if (ai.state === 'wander') { turn(Math.atan2(ai.target.x - pos.x, ai.target.z - pos.z), dt * 3); want = SPEED * 0.35; if (Math.hypot(ai.target.x - pos.x, ai.target.z - pos.z) < 0.8) { ai.state = 'idle'; ai.timer = 2 + rng() * 3; } }
        } else if (ai.state === 'notice') { turn(ang, dt * 8); if ((ai.timer -= dt) <= 0) ai.state = 'chase'; }
        else if (ai.state === 'return') { const h = map.nav ? map.nav.aim(pos, home, navKey, dt) : home; turn(Math.atan2(h.x - pos.x, h.z - pos.z), dt * 5); want = SPEED * 0.7; if (fromHome < 1.5) { ai.state = 'idle'; s.hp = Math.min(DEF.health, s.hp + 10); } }
        else if (T.dead || fromHome > 30 || toP > SIGHT * 2) ai.state = 'return';
        else if (ai.state === 'chase') {
            const g = toP > REACH + 1 && map.nav && !flyer ? map.nav.aim(pos, P, navKey, dt) : P;
            turn(Math.atan2(g.x - pos.x, g.z - pos.z), dt * 7);
            if (toP > REACH) want = SPEED;
            else if (ai.cd <= 0) {
                ai.state = 'windup'; ai.timer = ['crag_fiend', 'blight_ent', 'corrupted_sentinel', 'deep_horror', 'lava_elemental', 'stone_golem'].includes(type) ? 0.7 : 0.4; ai.hit = false;
                slam = isBoss && ++strikes % 3 === 0;
                if (slam) {   // the tell: a long wind-up and a red ring spreading on the floor
                    ai.timer = 1.2;
                    ring ??= new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff3a1a, transparent: true, opacity: 0.6, toneMapped: false, depthWrite: false }));
                    ring.position.set(pos.x, pos.y + 0.05, pos.z); ring.scale.setScalar(0.3); ring.visible = true; scene.add(ring);
                }
            }
        } else if (ai.state === 'windup') { turn(ang, dt * (slam ? 2 : 8)); if (slam && ring) { ring.position.set(pos.x, pos.y + 0.05, pos.z); ring.scale.setScalar(Math.min(3.6, ring.scale.x + dt * 3)); } if ((ai.timer -= dt) <= 0) { ai.state = 'strike'; ai.timer = 0.3; } }
        else if (ai.state === 'strike') {
            want = flyer ? SPEED * 1.6 : SPEED * 0.6;
            if (slam && !ai.hit) { ai.hit = true; if (ring) ring.visible = false; ctx.shake?.(0.6); if (toP < 3.6) { const d = Math.round(DEF.damage * 1.6 * (ctx.voidMult ?? 1)); if (T.id === 'me' ? ctx.hurtPlayer(d, pos) : ctx.hurtRemote?.(T.id, d, pos)) core.onDealt(d); } }
            else if (!ai.hit && toP < REACH + 0.6) { ai.hit = true; const d = Math.round(DEF.damage * (ctx.voidMult ?? 1)); if (T.id === 'me' ? ctx.hurtPlayer(d, pos) : ctx.hurtRemote?.(T.id, d, pos)) core.onDealt(d); }
            if ((ai.timer -= dt) <= 0) { ai.state = 'recover'; ai.timer = 0.6; }
        } else if (ai.state === 'recover') { slam = false; if ((ai.timer -= dt) <= 0) { ai.state = 'chase'; ai.cd = 1.4 + rng() * 1.2; } }
        s.engaged = !['idle', 'wander', 'return'].includes(ai.state);

        ai.speed += (want * core.fxMult('speedMult') - ai.speed) * Math.min(1, dt * 6);
        const px = pos.x, pz = pos.z;
        pos.x += Math.sin(ai.heading) * ai.speed * dt;
        pos.z += Math.cos(ai.heading) * ai.speed * dt;
        if (!flyer) { map.resolve(pos, 0.5); if (map.blockedAt(pos.x, pos.z, 0.4) === 'wall' && !map.passable(pos.x, pos.z)) { pos.x = px; pos.z = pz; } }
        const d = Math.hypot(pos.x - P.x, pos.z - P.z);
        if (d < 0.8 && d > 1e-4) { pos.x = P.x + (pos.x - P.x) / d * 0.8; pos.z = P.z + (pos.z - P.z) / d * 0.8; }
        pos.y = map.heightAt(pos.x, pos.z);
        }

        // Animate.
        root.position.copy(pos);
        root.rotation.y = ai.heading;
        const tell = ai.state === 'windup';
        if (flyer) {   // circle high, drop to dive (a cave bat flutters low, under the roof)
            const lowK = type === 'cave_bat' ? 0.45 : 1, alt = (ai.state === 'strike' ? 1.0 : tell ? 2.0 : 3.2 + Math.sin(ai.t * 1.3) * 0.4) * lowK;
            root.position.y = pos.y + alt;
            const flap = Math.sin(ai.t * (tell ? 4 : 9)) * (ai.state === 'strike' ? 0.15 : 0.6);
            parts.wingL.rotation.z = flap; parts.wingR.rotation.z = -flap;
            root.rotation.x = ai.state === 'strike' ? 0.5 : tell ? -0.3 : 0;
        } else if (type === 'ember_imp') {   // a Cinder-Soul drifts and flickers, flaring on the wind-up
            root.position.y = pos.y + 0.3 + Math.sin(ai.t * 3) * 0.15;
            parts.mat.emissiveIntensity = 1.0 + Math.sin(ai.t * 17) * 0.25 + (tell ? 1.4 : 0) + s.flash * 3;
        } else if (type === 'grave_wraith') {   // drift and fade; brighten on the wind-up
            root.position.y = pos.y + 0.2 + Math.sin(ai.t * 2.2) * 0.12;
            parts.mat.opacity = 0.45 + Math.sin(ai.t * 1.3) * 0.12 + (tell ? 0.3 : 0) + s.flash;
        } else if (type === 'frost_shade') {   // drift, and show itself only up close
            root.position.y = pos.y + 0.25 + Math.sin(ai.t * 2) * 0.12;
            parts.mat.opacity = Math.max(0.12, Math.min(0.6, 0.6 - (toP - 3) * 0.05)) + (tell ? 0.25 : 0) + s.flash;
            parts.mat.emissiveIntensity = 0.4 + (tell ? 1.4 : 0);
        } else if (parts.kind === 'drift') {   // drift and flicker; brighten on the wind-up (ice revenant)
            root.position.y = pos.y + 0.2 + Math.sin(ai.t * 2.2) * 0.12;
            parts.mat.opacity = 0.55 + Math.sin(ai.t * 1.7) * 0.1 + (tell ? 0.3 : 0) + s.flash;
            parts.mat.emissiveIntensity = 0.6 + (tell ? 1.2 : 0);
        } else if (parts.kind === 'hover') {   // a floating construct: bobbing, its rings turning (faster on the wind-up)
            root.position.y = pos.y + 0.15 + Math.sin(ai.t * 1.6) * 0.12;
            parts.spin.rotation.y += dt * (tell ? 6 : 1.2); parts.spin.rotation.z = Math.sin(ai.t * 0.7) * 0.2;
        } else if (type === 'void_stalker' || type === 'blind_stalker' || parts.kind === 'legs') {   // a crouch before the lunge
            root.position.y = pos.y - (tell ? 0.15 : 0);
            root.rotation.x = ai.state === 'strike' ? -0.2 : tell ? 0.15 : 0;
            parts.legs.forEach((l, i) => { l.rotation.x = Math.sin(ai.t * 10 + i * Math.PI / 2) * 0.5 * Math.min(1, ai.speed / 2); });
            if (parts.jaw) { parts.jaw.rotation.x = tell || ai.state === 'strike' ? 0.55 : 0.06 + Math.sin(ai.t * 3) * 0.03; parts.tail.rotation.y = Math.sin(ai.t * (ai.speed > 0.5 ? 9 : 2.5)) * 0.35; }
            parts.lowers?.forEach((l, i) => { l.rotation.x += (Math.max(0, Math.sin(ai.t * 10 + i * Math.PI / 2 + 0.9)) * 0.6 * Math.min(1, ai.speed / 2) - (l.userData.bent ?? 0)); l.userData.bent = Math.max(0, Math.sin(ai.t * 10 + i * Math.PI / 2 + 0.9)) * 0.6 * Math.min(1, ai.speed / 2); });   // the knees bend on the stride
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
        core.tell(ai.state === 'windup', ai.heading, REACH);   // the tell: a red fan where the blow will fall
        core.updatePlate(ctx.camera, flyer ? 4.2 : type === 'crag_fiend' ? 3.0 : PLATE2[type] ?? 2.4);
    }

    return {
        pos, kind: type, root, elite,
        get alive() { return !s.dead; },
        get engaged() { return s.engaged; },
        get debug() { return { state: ai.state, hp: s.hp }; },
        update,
        hit: (...a) => { const r = core.hit(...a); if (!s.dead && (ai.state === 'idle' || ai.state === 'wander')) ai.state = 'chase'; return r; },
        // Online: the host applies another player's blow; snapshots out and in; kill credit.
        net: core.net, snapshot, applySnapshot,
        hitFromNet: (h, attacker) => { core.hit(h.dmg, h.from ? new THREE.Vector3(h.from.x, h.from.y, h.from.z) : pos, h.burnMs, core.lastCtx, h.status, h.element, attacker); if (!s.dead && (ai.state === 'idle' || ai.state === 'wander')) ai.state = 'chase'; },
        credit: () => core.reward(core.lastCtx),
        reset: () => { if (!s.dead) { ai.state = 'return'; s.fx = {}; } },
        provoke: () => { if (!s.dead && ['idle', 'wander', 'return', 'notice'].includes(ai.state)) ai.state = 'chase'; },   // a taunt
    };
}
