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
import { levelAtNythoria } from './bands.js';

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
    // a living town, not a ruin (umbralTwin strips a twin bare): the Crossroads' houses and street furniture, in umbral colours
    const CR = REGION_DEFS.the_crossroads;
    DEF.buildings = (CR.buildings ?? []).map(({ name, sign, ...b }, i) => ({ ...b, wall: ['#5a5664', '#4e4a58', '#625e6c'][i % 3], roof: '#2e2a3a', timber: '#1e1a24' }));
    DEF.props = (CR.props ?? []).filter(p => ['lamp', 'stall', 'well', 'bench', 'barrel', 'crate', 'cart', 'fence', 'signpost'].includes(p.type)).map(p => ({ ...p }));
    DEF.signs = [{ x: 4, z: 10, text: 'THE SHADOW-VALE — a free town of those who stayed. The inn takes any coin; the warden keeps the peace. North-east, on the cliff: old Ravenspire, in ruins. East: the Obsidian Gate.' }];
    const H = regionHeight(DEF), H0 = H(0, 0);
    const stamps = [prepStamp({ id: 'shadow_vale', make: () => buildRegion(DEF, { quality }), heightAt: H, ox: vale.x, oy: Math.max(WATER + 3 - H0, eldoriaHeight(vale.x, vale.z) - H0), oz: vale.z, rect: [-60, -60, 60, 60], blend: 110 })];
    const heightAt = (x, z) => eldoriaHeight(x, z);   // (the twin's relief; the town's ground blended in by the engine)
    const biomes = makeBiomes(stamps, NYTHORIA_MAP), biomeAt = (x, z) => biomes(x, z);
    const gate = at('The Obsidian Gate');
    let world = null;
    world = createStreamWorld({
        walls: divideWalls(), levelAt: levelAtNythoria,
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
      world.spawns.vale = { x: vale.x + 2, z: vale.z + 14, facing: Math.PI };   // a new adventurer's start in Nythoria: the Shadow-Vale's town
      const upd = world.update; let t = 0; world.update = (t2, dt, ctx) => { upd(t2, dt, ctx); t += dt; pm.opacity = 0.4 + Math.sin(t * 1.7) * 0.08; portal.rotation.z = Math.sin(t * 0.3) * 0.01; };
    }
    // ---------- old Ravenspire, in ruins (N-2, N-3; WORLD_PLAN: the broken silhouette) on the twin of the Citadel's cliff ----------
    { const C = at('The Citadel of Thaloria'), y0 = heightAt(C.x, C.z), g = new THREE.Group(); g.position.set(C.x, 0, C.z);
      const st = flat(0x3a3842), dk = flat(0x2a2830), vine = new THREE.MeshStandardMaterial({ color: 0x3a1a4a, emissive: 0x2a0a3a, emissiveIntensity: 0.4, flatShading: true }),
            fungus = new THREE.MeshStandardMaterial({ color: 0xb89aff, emissive: 0x8a5aff, emissiveIntensity: 1.2, flatShading: true });
      let sd = 31; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      const H = (x, z) => heightAt(C.x + x, C.z + z);
      const box = (m, x, z, w, h, d, ry = 0, dy = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, H(x, z) + h / 2 - 0.3 + dy, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
      const wall = (x, z, r) => world.addWall({ x: C.x + x, z: C.z + z, r, kind: 'wall', y0: y0 - 4, y1: y0 + 30 });
      // the curtain wall: twelve stretches, three of them breached, the rest broken off at different heights
      const R = 34;
      for (let k = 0; k < 12; k++) {
          const a0 = k / 12 * Math.PI * 2, a1 = (k + 1) / 12 * Math.PI * 2, mx = R * Math.cos((a0 + a1) / 2), mz = R * Math.sin((a0 + a1) / 2), L = 2 * R * Math.sin(Math.PI / 12);
          if (k === 2 || k === 7 || k === 10) { for (let i = 0; i < 5; i++) box(st, mx + (rnd() - 0.5) * 8, mz + (rnd() - 0.5) * 8, 1 + rnd() * 2, 0.6 + rnd(), 1 + rnd() * 2, rnd() * 3); continue; }   // a breach: its stones lie where they fell
          const h = 4 + rnd() * 7; box(st, mx, mz, L, h, 2.6, -((a0 + a1) / 2) + Math.PI / 2);
          for (let i = 0; i < 3; i++) box(dk, mx + (rnd() - 0.5) * L * 0.6, mz + (rnd() - 0.5) * 2, 1.1, 1 + rnd() * 1.6, 1.1, rnd(), h);   // the broken top: a few teeth of stone
          for (let i = 0; i < 6; i++) wall(mx + Math.cos((a0 + a1) / 2 + Math.PI / 2) * (i / 5 - 0.5) * L, mz + Math.sin((a0 + a1) / 2 + Math.PI / 2) * (i / 5 - 0.5) * L, 1.5);
          if (rnd() < 0.7) { const v = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.9, 4), vine); v.position.set(mx * 0.97, H(mx, mz) + h * 0.45, mz * 0.97); v.rotation.z = (rnd() - 0.5) * 0.4; g.add(v); }
      }
      // four snapped towers at the corners
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, x = (R + 1) * Math.cos(a), z = (R + 1) * Math.sin(a), h = 10 + rnd() * 12;
          const t = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.6, h, 9), st); t.position.set(x, H(x, z) + h / 2 - 0.5, z); t.castShadow = true; g.add(t);
          for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.9 + rnd(), 2 + rnd() * 3, 4), dk); const aa = rnd() * 6.28; c.position.set(x + Math.cos(aa) * 3.2, H(x, z) + h + 0.6, z + Math.sin(aa) * 3.2); c.rotation.set(rnd() * 0.5, 0, rnd() * 0.5); g.add(c); }   // the jagged break
          wall(x, z, 4.6);
          for (let i = 0; i < 4; i++) box(st, x + (rnd() - 0.5) * 14, z + (rnd() - 0.5) * 14, 1.6 + rnd() * 2, 1 + rnd() * 1.5, 1.6 + rnd() * 2, rnd() * 3);   // its fallen stones
      }
      // the great hall, open to the eclipse: four walls and a broken gable, no roof
      for (const [x, z, w, d] of [[0, -7, 24, 2], [0, 7, 24, 2], [-12, 0, 2, 14], [12, 0, 2, 14]]) { const hb = box(st, x, z, w, 9 + rnd() * 3, d); for (let i = 0; i < Math.round(Math.max(w, d) / 6); i++) { const o = box(new THREE.MeshBasicMaterial({ color: 0x0a0810 }), x + (w > d ? -w / 2 + 3 + i * 6 : (d > w ? (x > 0 ? 1.05 : -1.05) : 0)), z + (d > w ? -d / 2 + 3 + i * 6 : (z > 0 ? 1.05 : -1.05)), w > d ? 1.6 : 0.2, 3.4, w > d ? 0.2 : 1.6, 0, 3); void o; } }
      for (const [ax, az, bx, bz] of [[-12, -7, 12, -7], [-12, 7, 12, 7], [-12, -7, -12, 7], [12, -7, 12, 7]]) for (let t2 = 0; t2 <= 1; t2 += 0.125) wall(ax + (bx - ax) * t2, az + (bz - az) * t2, 1.3);
      const gable = new THREE.Mesh(new THREE.ConeGeometry(8, 6, 3), st); gable.scale.set(1, 1, 0.12); gable.position.set(-12, H(-12, 0) + 14, 0); gable.rotation.y = Math.PI / 2; g.add(gable);
      // the keep, broken off high up
      { const x = 0, z = -22, h = 28; const k2 = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.5, h, 10), st); k2.position.set(x, H(x, z) + h / 2, z); k2.castShadow = true; g.add(k2);
        for (let i = 0; i < 7; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(1 + rnd(), 3 + rnd() * 4, 4), dk); const aa = rnd() * 6.28; c.position.set(x + Math.cos(aa) * 4.5, H(x, z) + h + 1, z + Math.sin(aa) * 4.5); c.rotation.set(rnd() * 0.4, 0, rnd() * 0.4); g.add(c); }
        wall(x, z, 6.5); }
      // glowing fungus at the feet of the stones
      for (let i = 0; i < 40; i++) { const a = rnd() * 6.28, r = 6 + rnd() * 32, x = Math.cos(a) * r, z = Math.sin(a) * r; const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25 + rnd() * 0.35, 0), fungus); f2.position.set(x, H(x, z) + 0.15, z); g.add(f2); }
      const glow = new THREE.PointLight(0x8a5aff, 18, 60, 1.6); glow.position.set(0, y0 + 4, 0); g.add(glow);
      world.scene.add(g);
      world.spawns.ravenspire = { x: C.x, z: C.z + R + 10, facing: Math.PI };
      world.stations.push({ mode: 'sign', id: 'ravenspire_ruins', title: 'An inscription', pos: new THREE.Vector3(C.x + 6, H(6, 0) + 1.2, C.z + 4),
          text: 'Cut deep into a fallen lintel of the great hall, half under the vines: "WE HELD UNTIL THE LIGHT WENT OUT." Below it, smaller and newer, scratched by another hand: names, dozens of them, and a date counted from the Darkness. Something has walked through the hall since — the ash on the floor is marked with long, clawed prints.' });
      const upd2 = world.update; world.update = (t2, dt, ctx) => { upd2(t2, dt, ctx); g.visible = Math.hypot(ctx.player.pos.x - C.x, ctx.player.pos.z - C.z) < 1100; };
    }
    // ---------- the Black Well: the demonic sanctuary where Acheron discarded the Forbidden Tome (DB), on the Black Lake's shore ----------
    { const W0 = at('Lake Aethera'), W = (() => { for (let r = 0; r < 160; r += 4) for (let a2 = 0; a2 < 6.28; a2 += 0.3) { const x = W0.x + Math.cos(a2) * r, z = W0.z + Math.sin(a2) * r; if (heightAt(x, z) > 0.8 && heightAt(x + 14, z) > 0.3 && heightAt(x - 14, z) > 0.3 && heightAt(x, z + 14) > 0.3 && heightAt(x, z - 14) > 0.3) return { x, z }; } return W0; })();   // (on dry ground by the Black Lake's shore)
      const y0 = heightAt(W.x, W.z), g = new THREE.Group(); g.position.set(W.x, y0, W.z);
      const bas = new THREE.MeshStandardMaterial({ color: 0x141018, roughness: 0.35, metalness: 0.2, flatShading: true }), red = new THREE.MeshBasicMaterial({ color: 0xa02040, transparent: true, opacity: 0.8 });
      const mk = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
      mk(new THREE.CylinderGeometry(13, 14, 0.8, 12), bas, 0, 0, 0);   // the platform
      for (let i = 0; i < 16; i++) { const a2 = i / 16 * Math.PI * 2; mk(new THREE.BoxGeometry(2.6, 1.6, 1.2), bas, Math.cos(a2) * 6.5, 1.1, Math.sin(a2) * 6.5).rotation.y = -a2; }   // the well's ring
      mk(new THREE.CylinderGeometry(5.6, 5.6, 0.2, 24), new THREE.MeshBasicMaterial({ color: 0x050307 }), 0, 0.55, 0);   // the shaft, black
      const deep = mk(new THREE.CylinderGeometry(4.8, 4.8, 0.1, 24), new THREE.MeshBasicMaterial({ color: 0x6a1a3a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending }), 0, 0.5, 0);   // its glow from far below
      for (let i = 0; i < 4; i++) { const a2 = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a2) * 10.5, z = Math.sin(a2) * 10.5; mk(new THREE.CylinderGeometry(0.6, 1.1, 7, 4), bas, x, 3.9, z);
          for (const sd of [-1, 1]) { const h = mk(new THREE.ConeGeometry(0.3, 1.8, 4), bas, x + sd * 0.5, 7.9, z); h.rotation.z = -sd * 0.6; } }   // horned obelisks
      const sig = mk(new THREE.RingGeometry(8.4, 8.9, 32), red, 0, 0.42, 0); sig.rotation.x = -Math.PI / 2;   // the sigil ring
      for (let i = 0; i < 6; i++) { const a2 = i / 6 * Math.PI * 2, l = mk(new THREE.PlaneGeometry(0.4, 4.5), red, Math.cos(a2) * 10.6, 0.43, Math.sin(a2) * 10.6); l.rotation.set(-Math.PI / 2, 0, -a2); }
      const light = new THREE.PointLight(0xc02040, 30, 50, 1.6); light.position.set(0, 3, 0); g.add(light);
      world.scene.add(g); world.addWall({ x: W.x, z: W.z, r: 5.4, kind: 'wall', y0: y0 - 2, y1: y0 + 3 });
      world.stations.push({ mode: 'sign', id: 'black_well', title: 'The Black Well', pos: new THREE.Vector3(W.x + 8, y0 + 1, W.z), text: 'The well has no bottom you can see. Far down, a dull red light breathes. They say a sorcerer of the old days threw a book down here to be rid of it — and that another, later, went down after it.' });
      const upd3 = world.update; let tt = 0; world.update = (t2, dt, ctx) => { upd3(t2, dt, ctx); tt += dt; deep.material.opacity = 0.4 + Math.sin(tt * 0.9) * 0.15; light.intensity = 24 + Math.sin(tt * 0.9) * 8; };
    }
    // ---------- the Obsidian Citadel: Malakar's fortress-palace of basalt and bone (DB), in the fire mountain's crater ----------
    { const C = at('Inferno Labyrinth'), y0 = heightAt(C.x, C.z), g = new THREE.Group(); g.position.set(C.x, y0, C.z);
      const bas = new THREE.MeshStandardMaterial({ color: 0x18141c, roughness: 0.3, metalness: 0.25, flatShading: true }), bone = flat(0xd8cfb8), glowM = new THREE.MeshBasicMaterial({ color: 0xc03a5a });
      const mk = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
      const fg = at('Fire Gate'), toGate = Math.atan2(fg.z - C.z, fg.x - C.x);
      // the curtain wall in the crater, a gate towards the Fire Gate's gorge
      const R = 46;
      for (let i = 0; i < 20; i++) { const a2 = (i + 0.5) / 20 * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a2 - toGate), Math.cos(a2 - toGate))) < 0.18) continue;
          const x = Math.cos(a2) * R, z = Math.sin(a2) * R, w = mk(new THREE.BoxGeometry(15, 11, 3.2), bas, x, 5.5, z); w.rotation.y = -a2 + Math.PI / 2;
          for (let k = 0; k < 6; k++) world.addWall({ x: C.x + x + Math.cos(a2 + Math.PI / 2) * (k - 2.5) * 3, z: C.z + z + Math.sin(a2 + Math.PI / 2) * (k - 2.5) * 3, r: 1.8, kind: 'wall', y0: y0 - 2, y1: y0 + 14 }); }
      for (let i = 0; i < 8; i++) { const a2 = i / 8 * Math.PI * 2, x = Math.cos(a2) * R, z = Math.sin(a2) * R; mk(new THREE.CylinderGeometry(3.4, 4.2, 20, 7), bas, x, 10, z); mk(new THREE.ConeGeometry(3.6, 8, 7), bas, x, 24, z); }
      // the palace: three stepped tiers of basalt, spires, bone ribs arching along its walls, the throne hall glowing
      for (const [w, h, y] of [[34, 14, 7], [24, 12, 20], [14, 10, 31]]) mk(new THREE.BoxGeometry(w, h, w), bas, 0, y, 0);
      for (const [x, z, h] of [[0, 0, 34], [9, 9, 22], [-9, 9, 22], [9, -9, 22], [-9, -9, 22]]) { mk(new THREE.CylinderGeometry(1.4, 2.6, h, 6), bas, x, 36 + h / 2 - 8, z); mk(new THREE.ConeGeometry(1.6, 6, 6), bas, x, 36 + h - 5, z); }
      for (let i = 0; i < 10; i++) { const a2 = i / 10 * Math.PI * 2, rib = mk(new THREE.TorusGeometry(4, 0.4, 5, 10, Math.PI), bone, Math.cos(a2) * 17.6, 6, Math.sin(a2) * 17.6); rib.rotation.y = -a2 + Math.PI / 2; }   // bone ribs round the lowest tier
      for (const s2 of [-1, 1]) mk(new THREE.BoxGeometry(3, 7, 0.4), glowM, Math.cos(toGate) * 17.3 + s2 * Math.sin(toGate) * 4, 4.5, Math.sin(toGate) * 17.3 - s2 * Math.cos(toGate) * 4);   // the throne hall's doors, glowing
      const light = new THREE.PointLight(0xc03a5a, 50, 140, 1.4); light.position.set(Math.cos(toGate) * 30, 8, Math.sin(toGate) * 30); g.add(light);
      world.addWall({ x: C.x, z: C.z, r: 18, kind: 'wall', y0: y0 - 2, y1: y0 + 60 });
      world.scene.add(g);
      const upd4 = world.update; world.update = (t2, dt, ctx) => { upd4(t2, dt, ctx); g.visible = Math.hypot(ctx.player.pos.x - C.x, ctx.player.pos.z - C.z) < 1800; };
    }
    return world;
}
