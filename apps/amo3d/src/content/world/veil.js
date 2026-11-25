// Across the veil (docs/3d/AUTONOMOUS_RUN.md 4b; the user's idea, 2026-11-25). The planes occupy the same space at
// different frequencies (world_lore.md): the land is the same on both sides, each plane has its own buildings.
// Thin places — where the veil runs thin — are the same spot in both worlds:
//   Whisper-Wood ("where the planar veil thins"), before the Sanguine Vaults (their frequency "dips close to
//   Nythoria"), the Great Rift's lip (a raw bleed), and a bare rise south of New Ravenspire (game: origin "game").
// With Aether Sight open (SIGHT.on) a thin place shows as a column of violet motes, and near it the other side's
// buildings ghost in. The crossing Tear (game/crossing.js) works only inside one.
// One-sided place: on the bare rise, Nythoria has a sealed reliquary — walls all round, no door from outside — that
// Eldoria does not have. Crossing on the rise from Eldoria lands you inside; its rune door opens only from within.
import * as THREE from 'three';
import LAYOUT from './eldoria_layout.json';
import { SIGHT } from '../actors/enemyCore.js';

const at = name => { const p = LAYOUT.places.find(q => q.name === name); return p ? { x: p.world[0], z: p.world[1] } : null; };
const RIFT = at('The Great Rift'), NR = at('New Ravenspire'), WW = at('Whisper-Wood');
const toward = (a, b, d) => { const L = Math.hypot(b.x - a.x, b.z - a.z) || 1; return { x: a.x + (b.x - a.x) / L * d, z: a.z + (b.z - a.z) / L * d }; };
export const RELIQUARY = { x: 1795, z: 861 };   // the bare rise (flat, ≥450 m from any place in either world)
export const THIN_PLACES = [
    WW && { id: 'whisper_wood', name: 'the heart of Whisper-Wood', ...WW, r: 7 },
    { id: 'sanguine_vaults', name: 'before the Sanguine Vaults', x: -270, z: 1890, r: 6 },
    RIFT && NR && { id: 'rift_lip', name: "the Great Rift's lip", ...toward(RIFT, NR, 60), r: 7 },
    { id: 'reliquary_rise', name: 'the bare rise', ...RELIQUARY, r: 6 },
].filter(Boolean);
export const thinAt = (x, z) => THIN_PLACES.find(t => Math.hypot(t.x - x, t.z - z) < t.r) ?? null;

const W = 14, H = 10;   // the reliquary: 14 m square, walls 10 m high, open to the sky
function reliquaryWalls(group, mat, y0) {
    const mk = (geo, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; group.add(o); return o; };
    for (const [x, z, rot] of [[0, -W / 2, 0], [0, W / 2, 0], [-W / 2, 0, 1], [W / 2, 0, 1]]) { const w = mk(new THREE.BoxGeometry(W + 1.2, H, 1.2), x, y0 + H / 2, z); w.rotation.y = rot ? Math.PI / 2 : 0; }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mk(new THREE.CylinderGeometry(1.1, 1.4, H + 3, 6), x * W / 2, y0 + (H + 3) / 2, z * W / 2);
}

export function addVeil(world, worldId, heightAt) {
    const nyth = worldId === 'nythoria';
    // ---- the shimmers (seen with the sight) ----
    const motesMat = new THREE.PointsMaterial({ color: 0xb08aff, size: 0.28, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x9a6aff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const shimmers = THIN_PLACES.map(t => {
        const y = heightAt(t.x, t.z), pts = [];
        for (let i = 0; i < 160; i++) { const a = Math.random() * 6.28, r = Math.random() * t.r * 0.8; pts.push(t.x + Math.cos(a) * r, y + Math.random() * 9, t.z + Math.sin(a) * r); }
        const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)), motesMat);
        const ring = new THREE.Mesh(new THREE.RingGeometry(t.r - 0.3, t.r, 48).rotateX(-Math.PI / 2), ringMat); ring.position.set(t.x, y + 0.1, t.z);
        const g = new THREE.Group(); g.add(motes, ring); g.visible = false; world.scene.add(g);
        return { t, g, y };
    });
    // ---- the reliquary: real in Nythoria, a ghost in Eldoria (only with the sight, standing near the rise) ----
    const R = RELIQUARY, ry = heightAt(R.x, R.z);
    const rel = new THREE.Group(); rel.position.set(R.x, 0, R.z);
    if (nyth) {
        const bas = new THREE.MeshStandardMaterial({ color: 0x1c1822, roughness: 0.4, metalness: 0.2, flatShading: true });
        reliquaryWalls(rel, bas, ry - 1);
        const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 0.9, 8), bas); plinth.position.set(0, ry + 0.45, -3); rel.add(plinth);
        const rune = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), new THREE.MeshBasicMaterial({ color: 0x8a5aff, transparent: true, opacity: 0.7, toneMapped: false })); rune.position.set(0, ry + 1.6, W / 2 - 0.62); rune.rotation.y = Math.PI; rel.add(rune);   // the rune door, on the inside of the south wall
        const light = new THREE.PointLight(0x8a5aff, 10, 18, 1.6); light.position.set(0, ry + 3, 0); rel.add(light);
        world.scene.add(rel);
        for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [-1, 1, 1, 1], [-1, -1, -1, 1], [1, -1, 1, 1]]) for (let k = 0; k <= 7; k++) { const f = k / 7; world.addWall({ x: R.x + (ax + (bx - ax) * f) * W / 2, z: R.z + (az + (bz - az) * f) * W / 2, r: 1.3, kind: 'wall', y0: ry - 3, y1: ry + H }); }
        world.stations.push({ mode: 'chest', key: 'sealed_reliquary', title: 'A reliquary chest', seed: ['soul_gem_mana', 'heart_crystal', 'ancient_scroll'], pos: new THREE.Vector3(R.x, ry, R.z - 1.8) });
        world.stations.push({ mode: 'sign', id: 'sealed_reliquary', title: 'An inscription', pos: new THREE.Vector3(R.x + 2.2, ry, R.z - 3),
            text: 'Cut round the plinth in the old Nythorian hand: "SEALED BY THOSE WHO STAYED, THAT NONE MIGHT COME FOR WHAT LIES HERE BUT ONE WHO WALKS THROUGH WALLS." Someone has walked through the walls before you — there are older footprints in the dust, and they end at the plinth.' });
        world.stations.push({ mode: 'sign', id: 'reliquary_door', title: 'The rune door', pos: new THREE.Vector3(R.x, ry, R.z + W / 2 - 1.6), text: 'A door of runes cut into the inside of the wall, glowing faintly. It opens only from within.',
            onUse: ({ stats }) => { const p = world._player?.pos; if (p) { p.set(R.x, heightAt(R.x, R.z + W / 2 + 4), R.z + W / 2 + 4); } } });
    } else {
        const ghost = new THREE.MeshBasicMaterial({ color: 0xb8a0ff, transparent: true, opacity: 0, depthWrite: false });
        reliquaryWalls(rel, ghost, ry - 1); rel.visible = false; world.scene.add(rel);
        rel.userData.ghost = ghost;
    }
    const upd = world.update;
    world.update = (t2, dt, ctx) => {
        upd(t2, dt, ctx);
        world._player = ctx.player;
        const P = ctx.player.pos, on = SIGHT.on;
        const k = Math.min(1, Math.max(0, (on ? 1 : -1) * dt * 2 + motesMat.opacity));
        motesMat.opacity = k * 0.9; ringMat.opacity = k * 0.6;
        for (const s of shimmers) {
            s.g.visible = k > 0.01 && Math.hypot(P.x - s.t.x, P.z - s.t.z) < 160;
            if (s.g.visible) s.g.children[0].rotation.y += dt * 0.2;
        }
        if (!nyth) { const near = Math.hypot(P.x - R.x, P.z - R.z) < 60; rel.visible = near && k > 0.01; rel.userData.ghost.opacity = k * 0.22; }
    };
}
