// Gathering — amo's gathering.js: node types, tools, weighted yields with rare bonuses, regrow
// times. Each spot the map provides (map.gatherSpots: { type, x, z }) gets a small code-built model;
// near one, G / Enter / gamepad A / tapping the prompt harvests it into the satchel (rollHarvest),
// it thins out, and grows back after its regrowMs.
import * as THREE from 'three';
import { gathering as G, items as itemRules } from '@rules';
import { flat } from '../engine/lib.js';

const { NODE_TYPES, resolveNode, rollHarvest } = G;
const { ITEMS } = itemRules;
const REACH = 1.8;

function buildNode(type, rng) {
    const g = new THREE.Group();
    const add = (geo, m, x, y, z, s = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.setScalar(s); o.castShadow = true; g.add(o); return o; };
    const leaf = flat(0x4f8a3a), leaf2 = flat(0x6aa84a);
    switch (type) {
        case 'herb':
            for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(0.06, 0.35, 4), i % 2 ? leaf : leaf2, (rng() - 0.5) * 0.5, 0.15, (rng() - 0.5) * 0.5).rotation.set((rng() - 0.5) * 0.6, 0, (rng() - 0.5) * 0.6);
            for (let i = 0; i < 4; i++) add(new THREE.OctahedronGeometry(0.05), flat(0xf3f0d0), (rng() - 0.5) * 0.4, 0.34, (rng() - 0.5) * 0.4);
            break;
        case 'mushroom':
            for (let i = 0; i < 7; i++) {
                const a = (i / 7) * Math.PI * 2, x = Math.cos(a) * 0.4, z = Math.sin(a) * 0.4;
                add(new THREE.CylinderGeometry(0.025, 0.035, 0.14, 5), flat(0xeee0c8), x, 0.07, z);
                add(new THREE.SphereGeometry(0.08, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2), flat(i % 3 ? 0xb8763a : 0xc03a2a), x, 0.13, z);
            }
            break;
        case 'berry':
            add(new THREE.IcosahedronGeometry(0.45, 1), flat(0x3f7a34), 0, 0.38, 0);
            for (let i = 0; i < 12; i++) { const a = rng() * 6.28, b = rng() * 1.2; add(new THREE.SphereGeometry(0.045, 5, 4), flat(0xc0283c), Math.cos(a) * Math.sin(b) * 0.46, 0.38 + Math.cos(b) * 0.4, Math.sin(a) * Math.sin(b) * 0.46); }
            break;
        case 'wood':
            for (let i = 0; i < 4; i++) { const l = add(new THREE.CylinderGeometry(0.1, 0.12, 1.1, 6), flat(0x6e4a2c), (i % 2) * 0.12 - 0.06, 0.12 + Math.floor(i / 2) * 0.2, (i - 1.5) * 0.12); l.rotation.z = Math.PI / 2; }
            break;
        case 'mineral':
            add(new THREE.DodecahedronGeometry(0.55, 0), flat(0x77736c), 0, 0.3, 0).scale.set(1.2, 0.8, 1);
            for (let i = 0; i < 6; i++) add(new THREE.OctahedronGeometry(0.07), new THREE.MeshStandardMaterial({ color: 0xc8d4ff, metalness: 0.8, roughness: 0.3, flatShading: true }), (rng() - 0.5) * 0.9, 0.3 + rng() * 0.3, (rng() - 0.5) * 0.7);
            break;
        case 'shallows':
            add(new THREE.CircleGeometry(0.8, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9fd6e8, transparent: true, opacity: 0.3 }), 0, 0.02, 0);
            for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.06, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2), flat(0x2a2a3a), (rng() - 0.5) * 1.0, 0.0, (rng() - 0.5) * 1.0).scale.set(1.4, 0.6, 1);
            break;
        case 'reeds':
            for (let i = 0; i < 14; i++) { const r = add(new THREE.ConeGeometry(0.025, 1.2 + rng() * 0.5, 3), flat(0x9aab5c), (rng() - 0.5) * 0.7, 0.6, (rng() - 0.5) * 0.7); r.rotation.set((rng() - 0.5) * 0.3, 0, (rng() - 0.5) * 0.3); }
            break;
    }
    return g;
}

export function createGathering({ stats, hud, onGather }) {
    let nodes = [], scene = null, nearest = null;
    const rng = Math.random;

    function setMap(map) {
        for (const n of nodes) n.mesh.parent?.remove(n.mesh);
        nodes = [];
        scene = map.scene;
        for (const spot of map.gatherSpots ?? []) {
            const mesh = buildNode(spot.type, rng);
            const y = map.groundAt(spot.x, spot.z, 1e3);
            mesh.position.set(spot.x, spot.type === 'shallows' ? Math.max(y, -1.2) : y, spot.z);
            mesh.rotation.y = rng() * 6.28;
            scene.add(mesh);
            nodes.push({ def: { type: spot.type }, mesh, pos: mesh.position, readyAt: 0 });
        }
    }

    const hasTool = id => !id || stats.countItem(id) > 0 || Object.values(stats.equipment).includes(id);

    function harvest(now) {
        const n = nearest;
        if (!n || now < n.readyAt) return false;
        const { type, tool } = resolveNode(n.def);
        if (!hasTool(tool)) { hud.message(`${type.label}: needs the ${ITEMS[tool]?.name ?? tool}`); return false; }
        const got = rollHarvest(n.def, rng);
        let full = false;
        for (const { id, qty } of got) {
            if (stats.addItem(id, qty)) {
                onGather?.(id, qty);
                hud.floater(n.pos.clone().setY(n.pos.y + 1.2), `+${qty} ${ITEMS[id]?.name ?? id}`, '#bfe6a0');
            } else full = true;
        }
        if (full) hud.message('Your satchel is full');
        n.readyAt = now + type.regrowMs;
        return true;
    }

    function update(now, player) {
        nearest = null;
        let best = REACH;
        for (const n of nodes) {
            const ready = now >= n.readyAt;
            const k = ready ? 1 : 0.35;   // harvested nodes thin out until they regrow
            n.mesh.scale.y += (k - n.mesh.scale.y) * 0.1;
            const d = Math.hypot(n.pos.x - player.pos.x, n.pos.z - player.pos.z);
            if (ready && d < best) { best = d; nearest = n; }
        }
        if (!nearest) return null;
        const { type, tool } = resolveNode(nearest.def);
        return `G — Gather ${type.label}${tool && !hasTool(tool) ? ` (needs ${ITEMS[tool]?.name ?? tool})` : ''}`;
    }

    return { setMap, harvest, update, get near() { return !!nearest; }, get count() { return nodes.length; } };
}
