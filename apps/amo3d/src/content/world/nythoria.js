// Nythoria — the shadow world (docs/3d/WORLD_PLAN.md, NYTHORIA_PLAN.md N-1…N-6): the full twin of Eldoria (the same
// 11.2 km and the same relief), everything living umbral — black-barked trees with violet and silver leaves, pale grey
// grass, black mirror water — under the eclipse. Built in steps: first the Obsidian Gate's twin (the way back), the
// Shadow-Vale's free town (the starter zone: the Crossroads' twin), and the places' markers.
import * as THREE from 'three';
import LAYOUT from './eldoria_layout.json';
import NYTHORIA_MAP from './biome_maps/nythoria.json';
import { createStreamWorld, prepStamp } from '../../engine/stream.js';
import { buildRegion, regionHeight } from '../../engine/region.js';
import { umbralTwin } from '../../engine/umbralTwin.js';
import { eldoriaHeight, makeBiomes, divideWalls } from './eldoria.js';
import { createBeasts, NAMES as BEAST_NAMES } from '../actors/beast.js';
import { createAnimals, NAMES as ANIMAL_NAMES } from '../actors/animals.js';
import { createDeer } from '../actors/deer.js';
import { flat } from '../../engine/lib.js';

const WATER = -2;
const REGION_DEFS = Object.fromEntries(Object.values(import.meta.glob('../regions/*.json', { eager: true, import: 'default' })).map(d => [d.id, d]));
const at = name => { const p = LAYOUT.places.find(q => q.name === name); return p ? { x: p.world[0], z: p.world[1] } : null; };
// the places of Nythoria, at their twins' spots (N-5)
const PLACES = [
    ['The Obsidian Gate', at('The Obsidian Gate')], ['The Great Rift', at('The Great Rift')],
    ['The Shadow-Vale', at('The Crossroads')], ['The Black Well', at('Lake Aethera')],
    ['The Obsidian Citadel', at('Inferno Labyrinth')], ['Ravenspire (the ruins)', at('The Citadel of Thaloria')],
].filter(([, p]) => p).map(([name, p]) => ({ name, x: p.x, z: p.z }));

export function createNythoriaWorld({ quality } = {}) {
    // the Shadow-Vale's free town: the Crossroads' twin, its own people (Nythorians who stayed)
    const vale = at('The Crossroads'), DEF = umbralTwin(REGION_DEFS.the_crossroads, { id: 'shadow_vale', name: 'The Shadow-Vale', ruins: 0, spires: 1 });
    DEF.people = [
        { name: 'Innkeeper of the Vale', role: 'innkeeper', price: 8, x: -6, z: 4, facing: 0, greeting: 'Sit, traveller. Under the eclipse a warm room is worth more than gold — but gold will do.' },
        { name: 'Vale Trader', role: 'merchant', x: 6, z: 4, facing: 0, greeting: 'Salt, oil, lamp-moss, rope. We trade with whoever comes through — even the Legion, when it pays.' },
        { name: 'Elder of the Vale', role: 'civilian', archetype: 'mage', x: 0, z: -6, facing: 3.14, lines: [
            'We are those who stayed. When Seraphina led the others through the Rift, our grandparents chose this land, eclipse and all.',
            'The Legion of Souls still walks the dark places. Keep to the Vale until you can hold a blade.',
            "Old Ravenspire stands broken on the cliff to the north-east. The Resistance's memory lives there — and other things.",
            'You come from the other side? Then you are the first in a long while. People here will need time to trust you.'] },
        { name: 'Vale Warden', role: 'guard', archetype: 'soldier', x: 12, z: -2, facing: 1.57, lines: ['The Vale keeps its own peace. Neither the Legion\'s nor Malakar\'s.', 'Shadow beasts come down from the hills after the dark hours. We stand watch.'] },
    ];
    DEF.palette = { ...DEF.palette };
    const H = regionHeight(DEF), H0 = H(0, 0);
    const stamps = [prepStamp({ id: 'shadow_vale', make: () => buildRegion(DEF, { quality }), heightAt: H, ox: vale.x, oy: Math.max(WATER + 3 - H0, eldoriaHeight(vale.x, vale.z) - H0), oz: vale.z, rect: [-60, -60, 60, 60], blend: 110 })];
    const heightAt = (x, z) => eldoriaHeight(x, z);   // (the twin's relief; the town's ground blended in by the engine)
    const biomes = makeBiomes(stamps, NYTHORIA_MAP), biomeAt = (x, z) => biomes(x, z);
    const gate = at('The Obsidian Gate');
    let world = null;
    world = createStreamWorld({
        walls: divideWalls(),
        id: 'nythoria', name: 'Nythoria — the shadow world', seed: 777, size: 11200, heightAt, quality, stamps,
        spawn: { x: gate.x - 18, z: gate.z, facing: -Math.PI / 2 },
        mood: { plane: 'nythoria', fog: '#4a4458', fogNear: 70, fogFar: 520, fogMix: 0.55, crows: 14, crowsAt: { x: gate.x, z: gate.z } },   // the eclipse sky (N-4): the black sun in its silver corona, falling ash, crows
        places: PLACES, biomeAt,
        spawnWild: (kind, type, posts, rng) => {
            const sc = world?.scene; if (!sc) return [];
            try {
                if (kind === 'animal' && type === 'deer') return posts.map(home => { const d = createDeer({ home, rng, map: world }); sc.add(d.root); return d; });
                if (kind === 'animal' && ANIMAL_NAMES[type]) return createAnimals({ scene: sc, map: world, rng, type, posts });
                if (kind === 'beast' && BEAST_NAMES[type]) return createBeasts({ scene: sc, map: world, rng, type, posts });
            } catch (e) { console.warn('[nythoria wild]', type, e); }
            return [];
        },
        chart: { pxPerM: 0.04, tileM: 4, detail: true },
        groundColor: (x, z, h, col) => {
            if (h < WATER + 0.9 && h > WATER - 0.4) { col.set('#1e1c24'); return true; }   // black sand at the black water's edge
            return false;
        },
    });
    // ---------- the Obsidian Gate's twin: the same frame in silver and black, the way back to Eldoria ----------
    { const y0 = heightAt(gate.x, gate.z), obs = new THREE.MeshStandardMaterial({ color: 0x14121c, roughness: 0.2, metalness: 0.5, flatShading: true }), silver = flat(0x9a98a8);
      const g = new THREE.Group(); g.position.set(gate.x, y0, gate.z); g.rotation.y = Math.PI / 2;
      const mk = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
      mk(new THREE.CylinderGeometry(14, 15, 1.2, 8), silver, 0, 0.2, 0);
      for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(1.1, 1.7, 16, 6), obs, s * 5.5, 9, 0); mk(new THREE.ConeGeometry(1.2, 3, 6), silver, s * 5.5, 18.5, 0); }
      mk(new THREE.BoxGeometry(14, 1.6, 2.2), obs, 0, 16.2, 0);
      const pm = new THREE.MeshBasicMaterial({ color: 0x9a88d0, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const portal = mk(new THREE.PlaneGeometry(9.4, 14.6), pm, 0, 8.3, 0);
      world.scene.add(g);
      for (const s of [-1, 1]) world.addWall({ x: gate.x, z: gate.z + s * 5.5, r: 1.8, kind: 'wall', y0: y0 - 1, y1: y0 + 20 });
      world.stations.push({ mode: 'portal', title: 'The Obsidian Gate', to: 'eldoria', spawn: 'obsidian_gate', pos: new THREE.Vector3(gate.x - 3, y0 + 1.6, gate.z) });
      world.spawns.gate = { x: gate.x - 18, z: gate.z, facing: -Math.PI / 2 };
      const upd = world.update; let t = 0; world.update = (t2, dt, ctx) => { upd(t2, dt, ctx); t += dt; pm.opacity = 0.4 + Math.sin(t * 1.7) * 0.08; portal.rotation.z = Math.sin(t * 0.3) * 0.01; };
    }
    return world;
}
