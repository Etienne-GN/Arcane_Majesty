// Loot: an enemy's amo lootTable is rolled on death; each item lands as a glowing, bobbing pickup
// (tinted with the item's own colour) with a beam of light so it can be found in the grass.
// Walking over it puts it in the satchel through PlayerStats.addItem (satchel capacity applies).
import * as THREE from 'three';
import { items as itemRules } from '@rules';

const { ITEMS } = itemRules;
const PICK_R = 1.1, LIFETIME = 120;

export function createLoot({ stats, hud }) {
    const group = new THREE.Group();
    const drops = [];
    const gem = new THREE.OctahedronGeometry(0.16, 0);
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.22, 2.6, 8, 1, true).translate(0, 1.3, 0);
    let fullWarned = 0;

    function drop(table, at, rng = Math.random) {
        let n = 0;
        for (const entry of table ?? []) {
            if (rng() >= entry.chance || !ITEMS[entry.id]) continue;
            const color = new THREE.Color(ITEMS[entry.id].color ?? 0xffffff);
            const mesh = new THREE.Mesh(gem, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6, flatShading: true }));
            const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
            const a = rng() * Math.PI * 2, r = 0.4 + n * 0.5;
            const pos = new THREE.Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r);
            mesh.position.copy(pos); beam.position.copy(pos);
            group.add(mesh, beam);
            drops.push({ id: entry.id, pos, mesh, beam, t: 0, pop: 0 });
            n++;
        }
        return n;
    }

    function remove(i) {
        const d = drops[i];
        group.remove(d.mesh, d.beam);
        d.mesh.material.dispose(); d.beam.material.dispose();
        drops.splice(i, 1);
    }

    function update(dt, player, map) {
        fullWarned = Math.max(0, fullWarned - dt);
        for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.t += dt;
            d.pop = Math.min(1, d.pop + dt * 3);
            const ground = map.groundAt(d.pos.x, d.pos.z, d.pos.y + 1) ?? d.pos.y;
            d.pos.y = ground;
            d.mesh.position.set(d.pos.x, ground + 0.45 + Math.sin(d.t * 2.5) * 0.08 + (1 - d.pop) * 0.8, d.pos.z);
            d.mesh.rotation.y = d.t * 1.8;
            d.mesh.scale.setScalar(d.pop);
            d.beam.position.set(d.pos.x, ground, d.pos.z);
            d.beam.material.opacity = 0.18 + Math.sin(d.t * 3) * 0.06;
            if (d.t > LIFETIME) { remove(i); continue; }
            if (!player.dead && d.pop >= 1 && Math.hypot(player.pos.x - d.pos.x, player.pos.z - d.pos.z) < PICK_R) {
                if (stats.addItem(d.id, 1)) {
                    hud.floater(d.mesh.position.clone().setY(d.mesh.position.y + 0.6), `+ ${ITEMS[d.id].name}`, `#${new THREE.Color(ITEMS[d.id].color ?? 0xffffff).getHexString()}`);
                    remove(i);
                } else if (fullWarned <= 0) {
                    hud.message('Your satchel is full');
                    fullWarned = 3;
                }
            }
        }
    }

    return {
        drop, update,
        setScene(scene) { scene.add(group); },
        clear() { while (drops.length) remove(drops.length - 1); },
        get count() { return drops.length; },
    };
}
