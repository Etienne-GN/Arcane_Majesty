// More creature bodies for beast.js (amo ENEMY_TYPES that had none in 3D): the spiders, the frost and ember
// families, the swamp and the forest's casters, the arcane sentinel. Built in code like the others; each returns
// { root, parts } with parts.kind choosing how beast.js animates it:
//   legs  — many legs scuttling (parts.legs), a crouch before it lunges
//   brute — arms (parts.armL / armR) raised on the wind-up and brought down
//   flyer — wings (parts.wingL / wingR), circling high, diving
//   drift — a floating, half-seen body (parts.mat), brightening on the wind-up
//   hover — a floating construct; its rings (parts.spin) turn faster on the wind-up
// parts.eyes glow brighter on the wind-up (beast.js).
import * as THREE from 'three';

const flat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8, ...o });
const glow = c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });

export const NAMES2 = {
    giant_spider: 'Giant Spider', spider_queen: 'Spider Queen', frost_bear: 'Frost Bear', ice_revenant: 'Ice Revenant',
    glacier_crab: 'Glacier Crab', wendigo: 'Wendigo', ash_crawler: 'Ash Crawler', cinder_hawk: 'Cinder Hawk',
    forge_daemon: 'Forge Daemon', plague_rat: 'Plague Rat', rot_toad: 'Rot Toad', dark_druid: 'Dark Druid',
    mushroom_shaman: 'Mushroom Shaman', arcane_sentinel: 'Arcane Sentinel',
};
export const FLYERS2 = new Set(['cinder_hawk']);
// Nameplate heights (beast.js otherwise uses 2.4).
export const PLATE2 = { giant_spider: 1.4, spider_queen: 2.4, frost_bear: 2.3, glacier_crab: 1.7, wendigo: 3.4, ash_crawler: 1.1, plague_rat: 0.9, rot_toad: 1.3, forge_daemon: 2.8, arcane_sentinel: 3.0, mushroom_shaman: 1.9 };

export function body2(type) {
    const root = new THREE.Group(), parts = {};
    const add = (geo, m, x = 0, y = 0, z = 0, parent = root) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    // Eight jointed legs splayed from a body at height h (spiders, crabs: fewer).
    const legRing = (n, h, spread, len, m, z0 = 0) => {
        parts.legs = [];
        for (let i = 0; i < n; i++) {
            const side = i % 2 ? 1 : -1, row = Math.floor(i / 2), rows = Math.ceil(n / 2);
            const leg = new THREE.Group(); leg.position.set(side * spread * 0.5, h, z0 + (row - (rows - 1) / 2) * spread * 0.45); root.add(leg);
            const up = add(new THREE.CylinderGeometry(0.03, 0.04, len, 4), m, side * len * 0.35, len * 0.3, 0, leg); up.rotation.z = -side * 1.0;
            const dn = add(new THREE.CylinderGeometry(0.02, 0.03, len * 1.15, 4), m, side * len * 0.85, -h * 0.35, 0, leg); dn.rotation.z = side * 0.35;
            leg.rotation.y = side * (row - (rows - 1) / 2) * -0.35;
            parts.legs.push(leg);
        }
    };
    const arms = (y, x, len, w, m, fist = null) => {
        for (const s of [1, -1]) {
            const arm = new THREE.Group(); arm.position.set(s * x, y, 0); root.add(arm);
            add(new THREE.CylinderGeometry(w * 0.8, w, len, 6), m, 0, -len / 2, 0, arm);
            if (fist) fist(arm, s, len);
            parts[s > 0 ? 'armL' : 'armR'] = arm;
        }
    };

    if (type === 'giant_spider' || type === 'spider_queen') {   // a black-haired body and abdomen, eight legs, a cluster of red eyes (the queen: twice the size, a crown of spines, a violet-banded abdomen)
        const q = type === 'spider_queen', k = q ? 1.9 : 1;
        const fur = flat(q ? 0x241a2a : 0x2a2420), band = flat(q ? 0x7a3aa8 : 0x6a4a2a);
        add(new THREE.SphereGeometry(0.28 * k, 8, 6), fur, 0, 0.5 * k, 0.2 * k).scale.set(1, 0.8, 1.1);
        const ab = add(new THREE.SphereGeometry(0.42 * k, 9, 7), fur, 0, 0.62 * k, -0.45 * k); ab.scale.set(1, 0.85, 1.2);
        for (let i = 0; i < 3; i++) add(new THREE.TorusGeometry(0.3 * k * (1 - i * 0.18), 0.03 * k, 4, 12), band, 0, 0.65 * k + i * 0.12 * k, -0.45 * k - i * 0.05 * k).rotation.x = Math.PI / 2 - 0.3;
        for (const s of [1, -1]) add(new THREE.ConeGeometry(0.04 * k, 0.18 * k, 4), flat(0x1a1410), s * 0.08 * k, 0.4 * k, 0.45 * k).rotation.x = Math.PI * 0.75;   // fangs
        if (q) for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(0.05, 0.4, 4), band, Math.cos(i) * 0.3, 1.4, -0.6 + Math.sin(i) * 0.3);
        legRing(8, 0.5 * k, 0.55 * k, 0.6 * k, fur);
        parts.eyes = add(new THREE.BoxGeometry(0.2 * k, 0.06 * k, 0.03), glow(0xff2a2a), 0, 0.6 * k, 0.45 * k);
        parts.kind = 'legs';
    } else if (type === 'frost_bear') {   // a great white bear rimed with ice, icicles along its back
        const fur = flat(0xe8eef4), ice = flat(0x9ad0f0, { transparent: true, opacity: 0.85, emissive: 0x3a6a8a, emissiveIntensity: 0.4 });
        const b = add(new THREE.SphereGeometry(0.7, 9, 7), fur, 0, 1.05, 0); b.scale.set(0.9, 0.85, 1.35);
        add(new THREE.SphereGeometry(0.36, 8, 6), fur, 0, 1.25, 0.95);
        add(new THREE.BoxGeometry(0.22, 0.18, 0.3), fur, 0, 1.15, 1.25);
        add(new THREE.BoxGeometry(0.08, 0.06, 0.05), flat(0x1a1a1a), 0, 1.2, 1.41);
        for (const s of [1, -1]) add(new THREE.SphereGeometry(0.1, 6, 5), fur, s * 0.24, 1.55, 0.9);
        for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(0.07, 0.4, 4), ice, (i % 2 ? 0.12 : -0.12), 1.7, 0.5 - i * 0.22);
        arms(1.05, 0.38, 0.95, 0.17, fur, (arm, s, len) => add(new THREE.SphereGeometry(0.2, 6, 5), fur, 0, -len, 0.08, arm));
        parts.armL.position.z = parts.armR.position.z = 0.55;
        for (const s of [1, -1]) add(new THREE.CylinderGeometry(0.15, 0.17, 0.85, 6), fur, s * 0.32, 0.42, -0.5);
        parts.eyes = add(new THREE.BoxGeometry(0.26, 0.04, 0.02), glow(0x8ad8ff), 0, 1.33, 1.25);
        parts.kind = 'brute';
    } else if (type === 'ice_revenant') {   // the frozen dead: a hooded figure of blue ice and frost-mist, a shard for a blade
        const M = new THREE.MeshStandardMaterial({ color: 0xb8e4ff, emissive: 0x4a8ac8, emissiveIntensity: 0.6, transparent: true, opacity: 0.7, flatShading: true, depthWrite: false });
        parts.mat = M;
        add(new THREE.ConeGeometry(0.42, 1.55, 7, 1, true).translate(0, 0.78, 0), M);
        add(new THREE.OctahedronGeometry(0.24, 0), M, 0, 1.6, 0);
        for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.05, 0.35, 4), M, Math.cos(i * 1.25) * 0.2, 1.85, Math.sin(i * 1.25) * 0.2);   // a crown of icicles
        const sh = add(new THREE.OctahedronGeometry(0.12, 0), M, 0.4, 1.0, 0.25); sh.scale.set(0.5, 3.5, 0.5);
        parts.eyes = add(new THREE.BoxGeometry(0.16, 0.03, 0.02), glow(0xe0f6ff), 0, 1.62, 0.2);
        parts.kind = 'drift';
    } else if (type === 'glacier_crab') {   // a crab the size of a cart, a shell of blue ice, two great claws
        const shell = flat(0x8ab8d8, { emissive: 0x1a4a6a, emissiveIntensity: 0.3 }), leg = flat(0x5a7a94);
        const b = add(new THREE.DodecahedronGeometry(0.6, 0), shell, 0, 0.75, 0); b.scale.set(1.4, 0.6, 1.0);
        for (let i = 0; i < 5; i++) add(new THREE.ConeGeometry(0.1, 0.35, 4), shell, -0.5 + i * 0.25, 1.12, -0.1);
        legRing(6, 0.6, 1.1, 0.55, leg, -0.15);
        for (const s of [1, -1]) {
            const arm = new THREE.Group(); arm.position.set(s * 0.65, 0.8, 0.5); root.add(arm);
            add(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 5), leg, 0, -0.1, 0.25, arm).rotation.x = 1.2;
            const c = add(new THREE.BoxGeometry(0.3, 0.2, 0.45), shell, 0, 0.0, 0.65, arm); c.rotation.y = s * 0.3;
            parts[s > 0 ? 'armL' : 'armR'] = arm;
        }
        parts.eyes = add(new THREE.BoxGeometry(0.3, 0.05, 0.03), glow(0xd0f0ff), 0, 1.0, 0.6);
        parts.kind = 'legs';
    } else if (type === 'wendigo') {   // gaunt and too tall, grey skin over bone, an antlered skull, long clawed arms
        const skin = flat(0x8a8a82), bone = flat(0xe8e0cc), dark = flat(0x2a2624);
        add(new THREE.CylinderGeometry(0.22, 0.16, 1.1, 6), skin, 0, 1.7, 0);
        for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.2, 0.02, 3, 8, Math.PI), bone, 0, 1.5 + i * 0.15, 0.08).rotation.y = Math.PI / 2;   // ribs
        add(new THREE.SphereGeometry(0.2, 7, 5), bone, 0, 2.45, 0.08).scale.set(0.8, 1, 1.2);
        for (const s of [1, -1]) { const a = add(new THREE.CylinderGeometry(0.02, 0.035, 0.7, 4), dark, s * 0.25, 2.8, 0); a.rotation.z = -s * 0.6; const b2 = add(new THREE.CylinderGeometry(0.015, 0.02, 0.35, 4), dark, s * 0.42, 3.0, 0.1); b2.rotation.z = s * 0.3; }
        arms(2.1, 0.3, 1.5, 0.06, skin, (arm, s, len) => { for (let i = -1; i <= 1; i++) add(new THREE.ConeGeometry(0.02, 0.25, 4), bone, i * 0.04, -len - 0.1, 0.03, arm).rotation.x = Math.PI; });
        for (const s of [1, -1]) add(new THREE.CylinderGeometry(0.07, 0.05, 1.2, 5), skin, s * 0.14, 0.6, 0);
        parts.eyes = add(new THREE.BoxGeometry(0.16, 0.035, 0.02), glow(0xaaf0ff), 0, 2.47, 0.25);
        parts.kind = 'brute';
    } else if (type === 'ash_crawler') {   // a low, many-legged thing of cooling ash, embers glowing in its joints
        const ash = flat(0x3a3430), ember = new THREE.MeshStandardMaterial({ color: 0xff7a2a, emissive: 0xff4a10, emissiveIntensity: 1.4, flatShading: true });
        for (let i = 0; i < 4; i++) add(new THREE.DodecahedronGeometry(0.22 - i * 0.02, 0), ash, 0, 0.35, 0.45 - i * 0.3);
        for (let i = 0; i < 4; i++) add(new THREE.SphereGeometry(0.07, 5, 4), ember, 0, 0.5, 0.3 - i * 0.3);
        legRing(8, 0.32, 0.6, 0.4, ash, -0.1);
        parts.eyes = add(new THREE.BoxGeometry(0.18, 0.04, 0.03), glow(0xffa040), 0, 0.42, 0.66);
        parts.kind = 'legs';
    } else if (type === 'cinder_hawk') {   // a hawk of smouldering feathers, trailing sparks
        const fe = new THREE.MeshStandardMaterial({ color: 0x5a2a1a, emissive: 0xff5a1a, emissiveIntensity: 0.6, flatShading: true, side: THREE.DoubleSide });
        const b = add(new THREE.SphereGeometry(0.18, 7, 5), fe, 0, 0, 0); b.scale.set(0.8, 0.8, 1.6);
        add(new THREE.ConeGeometry(0.05, 0.14, 4), flat(0xe0b040), 0, 0, 0.32).rotation.x = Math.PI / 2;
        for (const s of [1, -1]) {
            const w = new THREE.Group(); w.position.set(s * 0.1, 0.03, 0); root.add(w);
            const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.12), new THREE.Vector3(s * 0.75, 0, -0.05), new THREE.Vector3(0, 0, -0.18)]); g.computeVertexNormals();
            add(g, fe, 0, 0, 0, w);
            parts[s > 0 ? 'wingL' : 'wingR'] = w;
        }
        parts.eyes = add(new THREE.BoxGeometry(0.1, 0.02, 0.02), glow(0xffe060), 0, 0.05, 0.22);
        parts.kind = 'flyer';
    } else if (type === 'forge_daemon') {   // a squat horned daemon of the forges: iron-black hide, a furnace in its chest, a hammer-fist
        const hide = flat(0x2a1e1a), iron = flat(0x4a4448, { metalness: 0.5 }), fire = new THREE.MeshStandardMaterial({ color: 0xff8a2a, emissive: 0xff5a10, emissiveIntensity: 1.8, flatShading: true });
        const t = add(new THREE.BoxGeometry(1.0, 0.95, 0.7), hide, 0, 1.4, 0); t.rotation.x = 0.1;
        add(new THREE.BoxGeometry(0.4, 0.3, 0.05), fire, 0, 1.45, 0.37);   // the furnace grate
        for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(0.42, 0.03, 0.06), iron, 0, 1.35 + i * 0.1, 0.39);
        add(new THREE.BoxGeometry(0.42, 0.38, 0.4), hide, 0, 2.05, 0.15);
        for (const s of [1, -1]) { const h = add(new THREE.ConeGeometry(0.07, 0.45, 5), flat(0xd8c8a8), s * 0.24, 2.35, 0.1); h.rotation.z = -s * 0.6; }
        arms(1.75, 0.65, 0.9, 0.17, hide, (arm, s, len) => add(s > 0 ? new THREE.BoxGeometry(0.4, 0.3, 0.3) : new THREE.DodecahedronGeometry(0.2, 0), iron, 0, -len, 0, arm));
        for (const s of [1, -1]) add(new THREE.CylinderGeometry(0.2, 0.24, 0.9, 6), hide, s * 0.3, 0.45, 0);
        parts.eyes = add(new THREE.BoxGeometry(0.28, 0.05, 0.02), glow(0xffc040), 0, 2.1, 0.36);
        parts.kind = 'brute';
    } else if (type === 'plague_rat') {   // a rat too large, mangy, green with sickness, a naked tail
        const fur = flat(0x5a5a3e), skin = flat(0xc89a8a);
        const b = add(new THREE.SphereGeometry(0.2, 7, 5), fur, 0, 0.22, 0); b.scale.set(0.9, 0.8, 1.6);
        add(new THREE.ConeGeometry(0.11, 0.28, 6), fur, 0, 0.24, 0.38).rotation.x = Math.PI / 2;
        for (const s of [1, -1]) add(new THREE.SphereGeometry(0.06, 5, 4), skin, s * 0.08, 0.36, 0.28);
        const tail = add(new THREE.CylinderGeometry(0.01, 0.025, 0.6, 4), skin, 0, 0.18, -0.55); tail.rotation.x = Math.PI / 2 - 0.3;
        legRing(4, 0.14, 0.26, 0.18, fur);
        parts.eyes = add(new THREE.BoxGeometry(0.1, 0.02, 0.02), glow(0x9aff5a), 0, 0.3, 0.42);
        parts.kind = 'legs';
    } else if (type === 'rot_toad') {   // a bloated toad of the bogs, warty and swollen, sacs of rot on its back
        const skin = flat(0x4a5a2a), sac = flat(0x8a9a3a, { emissive: 0x3a4a0a, emissiveIntensity: 0.4 });
        const b = add(new THREE.SphereGeometry(0.45, 9, 7), skin, 0, 0.4, 0); b.scale.set(1.2, 0.75, 1.1);
        add(new THREE.SphereGeometry(0.3, 8, 6), skin, 0, 0.55, 0.4).scale.set(1.3, 0.7, 0.9);
        for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.09 + (i % 3) * 0.03, 6, 5), sac, Math.cos(i * 2.1) * 0.3, 0.68, Math.sin(i * 2.1) * 0.25 - 0.1);
        for (const s of [1, -1]) add(new THREE.SphereGeometry(0.08, 6, 5), flat(0xd8c84a), s * 0.2, 0.72, 0.52);
        legRing(4, 0.25, 0.75, 0.35, skin);
        parts.eyes = add(new THREE.BoxGeometry(0.32, 0.03, 0.02), glow(0xe8e05a), 0, 0.73, 0.6);
        parts.kind = 'legs';
    } else if (type === 'dark_druid') {   // a druid gone wrong: a ragged green-black robe, a deer-skull mask, a crooked staff
        const robe = flat(0x1e2a1a), bone = flat(0xe0d8c0), wood = flat(0x3a2a1a);
        add(new THREE.ConeGeometry(0.45, 1.5, 8).translate(0, 0.75, 0), robe);
        add(new THREE.SphereGeometry(0.2, 7, 5), robe, 0, 1.62, 0);
        add(new THREE.SphereGeometry(0.15, 6, 5), bone, 0, 1.6, 0.1).scale.set(0.8, 1, 1.3);
        for (const s of [1, -1]) { const a = add(new THREE.CylinderGeometry(0.015, 0.025, 0.4, 4), bone, s * 0.15, 1.85, 0.05); a.rotation.z = -s * 0.7; }
        arms(1.4, 0.3, 0.65, 0.07, robe, (arm, s) => { if (s > 0) { const st = add(new THREE.CylinderGeometry(0.025, 0.03, 1.6, 5), wood, 0, -0.55, 0.1, arm); add(new THREE.SphereGeometry(0.08, 6, 5), glow(0x6aff6a), 0, 0.25, 0.1, arm); st.rotation.x = 0.1; } });
        parts.eyes = add(new THREE.BoxGeometry(0.12, 0.025, 0.02), glow(0x7aff5a), 0, 1.63, 0.28);
        parts.kind = 'brute';
    } else if (type === 'mushroom_shaman') {   // a walking toadstool with a spotted cap, a beard of gills, a staff hung with spores
        const stem = flat(0xe8dcc4), cap = flat(0x9a2a2a), spot = flat(0xf4eee0), spore = new THREE.MeshStandardMaterial({ color: 0xc8a8ff, emissive: 0x7a4ac8, emissiveIntensity: 1, flatShading: true });
        add(new THREE.CylinderGeometry(0.28, 0.36, 1.1, 8), stem, 0, 0.55, 0);
        const c = add(new THREE.SphereGeometry(0.62, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, 1.1, 0); c.scale.y = 0.6;
        for (let i = 0; i < 7; i++) add(new THREE.SphereGeometry(0.07, 5, 4), spot, Math.cos(i * 0.9) * 0.4, 1.38 - (i % 2) * 0.08, Math.sin(i * 0.9) * 0.4);
        arms(0.9, 0.34, 0.55, 0.06, stem, (arm, s) => { if (s > 0) { add(new THREE.CylinderGeometry(0.02, 0.025, 1.2, 5), flat(0x5a4a3a), 0, -0.3, 0.1, arm); for (let i = 0; i < 3; i++) add(new THREE.SphereGeometry(0.05, 5, 4), spore, Math.cos(i * 2) * 0.07, 0.2 + i * 0.06, 0.1, arm); } });
        parts.eyes = add(new THREE.BoxGeometry(0.22, 0.04, 0.02), glow(0xe0c8ff), 0, 0.95, 0.31);
        parts.kind = 'brute';
    } else if (type === 'arcane_sentinel') {   // an old warding construct: a floating rune-carved stone, two rings of light turning about it
        const stone = flat(0x8a8494), rune = glow(0xb08aff);
        const core = add(new THREE.OctahedronGeometry(0.55, 0), stone, 0, 1.7, 0); core.scale.y = 1.4;
        for (const y of [1.45, 1.95]) add(new THREE.BoxGeometry(0.5, 0.03, 0.02), rune, 0, y, 0.33);
        const spin = new THREE.Group(); spin.position.y = 1.7; root.add(spin);
        const r1 = add(new THREE.TorusGeometry(0.95, 0.025, 4, 40), rune, 0, 0, 0, spin); r1.rotation.x = Math.PI / 2;
        const r2 = add(new THREE.TorusGeometry(0.8, 0.02, 4, 40), rune, 0, 0, 0, spin); r2.rotation.x = 0.6;
        for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(0.12, 0.12, 0.12), stone, Math.cos(i * Math.PI / 2) * 0.95, 0, Math.sin(i * Math.PI / 2) * 0.95, spin);
        parts.spin = spin;
        parts.eyes = add(new THREE.BoxGeometry(0.3, 0.06, 0.02), rune, 0, 1.75, 0.4);
        parts.kind = 'hover';
    } else return null;
    return { root, parts };
}
