// The open world's streaming engine — stage W1 of docs/3d/OPEN_WORLD_PLAN.md: a prototype on a test continent (no
// lore), to measure on the phone whether a seamless world holds up.
//   · the world is cut into TILE-metre tiles; only those within VIEW tiles of the player exist;
//   · level of detail by distance: near tiles ~2.7 m between vertices, middle ~8 m, far ~21 m; every tile carries a
//     skirt (its edge dropped 6 m) so the seams between levels never show a crack;
//   · tiles are built off the critical path: at most BUDGET per frame, the nearest first (no stutter when walking);
//   · trees and rocks: instanced per near tile, with their colliders; far tiles are bare (the fog hides them);
//   · one water plane follows the player;
//   · no floating origin: at Eldoria's planned size (±3.75 km) float precision stays ~0.5 mm — not needed yet.
// The map object has the same shape as a region's, so the player, the camera and the HUD use it unchanged.
import * as THREE from 'three';
import { flat, mulberry32, colliderAt, pushOut, fbm } from './lib.js';
import { createOutdoorShell } from './outdoor.js';
import { treeKinds } from '../content/models/flora.js';
import { coreOf, registerCore } from '../content/actors/enemyCore.js';

const TILE = 128, VIEW = 6, BUDGET = 2, WATER = -2;
const LOD = d => (d <= 1 ? 48 : d <= 3 ? 16 : 6);   // segments per tile edge by ring distance

// The test continent: rolling land, a ridged mountain range, valleys, a coast all round (size × size metres).
export function continentHeight(size) {
    const half = size / 2;
    return (x, z) => {
        const r = Math.max(Math.abs(x), Math.abs(z)) / half;   // 0 at the centre, 1 at the edge
        const coast = Math.min(1, Math.max(0, (1 - r) * 6));     // the land falls into the sea near the edge
        const base = fbm(x * 0.0016, z * 0.0016, 5) * 46 - 6;
        const rm = fbm(x * 0.0007 + 31, z * 0.0007 - 17, 2);      // where the mountains are
        const ridge = Math.pow(1 - Math.abs(fbm(x * 0.0032 + 9, z * 0.0032 + 4, 4) * 2 - 1), 2.5) * 170 * Math.min(1, Math.max(0, rm - 0.38) * 4);
        const valley = -Math.pow(Math.max(0, 0.08 - Math.abs(fbm(x * 0.0011 - 5, z * 0.0011 + 8, 3) - 0.5)) / 0.08, 2) * 9;   // winding valleys
        return (base + ridge + valley) * coast + (WATER - 6) * (1 - coast);
    };
}

// Stamps (W2.2): an existing place map set into the world. { id, map, ox, oy, oz, rect: [x0, z0, x1, z1] (the place's
// own coordinates), drop: Set of trigger targets that are now part of the world (walked to, not loaded) }.
// prepStamp fills in the world rect; stampHeights wraps the world's height so the place's ground rules inside its rect
// and blends back to the world over B metres outside it.
export function prepStamp(st) {
    st.X0 = st.ox + st.rect[0]; st.Z0 = st.oz + st.rect[1]; st.X1 = st.ox + st.rect[2]; st.Z1 = st.oz + st.rect[3];
    return st;
}
const inRect = (st, x, z, m = 0) => x >= st.X0 - m && x <= st.X1 + m && z >= st.Z0 - m && z <= st.Z1 + m;
const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// A stamp's paths [[ax, az, bx, bz, halfWidth]] (local): a trail cut through an old map's border, from a (inside) out
// to b (in the blend ring), its floor running straight from the place's ground at a to the land's at b.
function cutPaths(st, worldH, x, z, h) {
    for (const [ax, az, bx, bz, w] of st.paths ?? []) {
        const lx = x - st.ox, lz = z - st.oz, dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
        const t = Math.max(0, Math.min(1, ((lx - ax) * dx + (lz - az) * dz) / L2));
        const d = Math.hypot(lx - (ax + dx * t), lz - (az + dz * t));
        if (d > w * 2.2) continue;
        const ha = st.map.heightAt(ax, az) + st.oy, hb = worldH(bx + st.ox, bz + st.oz);
        const floor = ha + (hb - ha) * t, k = 1 - sm(w, w * 2.2, d);
        h = Math.min(h, h + (floor - h) * k);
    }
    return h;
}
export function stampHeights(worldH, stamps, B = 60) {
    return (x, z) => {
        for (const st of stamps) if (st.paths && inRect(st, x, z, B)) return cutPaths(st, worldH, x, z, rawStamp(x, z));
        return rawStamp(x, z);
    };
    function rawStamp(x, z) {
        for (const st of stamps) {
            if (inRect(st, x, z)) return st.map.heightAt(x - st.ox, z - st.oz) + st.oy;
            if (inRect(st, x, z, B)) {
                const cx = Math.max(st.X0, Math.min(st.X1, x)), cz = Math.max(st.Z0, Math.min(st.Z1, z));
                const edge = st.map.heightAt(cx - st.ox, cz - st.oz) + st.oy, d = Math.hypot(x - cx, z - cz);
                return edge + (worldH(x, z) - edge) * sm(0, B, d);
            }
        }
        return worldH(x, z);
    }
}

// Hooks for a real world (content/world/eldoria.js): spawn {x,z,facing}; clearAt(x,z) — no trees here (roads, a town's
// plateau); groundColor(x,z,h,col) — paint a road or a place (return true when painted); places [{name,x,z}] — markers
// standing where a place will be built (W2.1), named when you come near.
export function createStreamWorld({ id = 'stream_test', name = 'Open world test', size = 4096, seed = 4242, heightAt = continentHeight(size), spawn = null, clearAt = null, groundColor = null, places = [], stamps = [], chart = null, mood = null, quality = { foliage: 1, shadows: true, shadowMap: 2048, shadowRange: 48, fogFar: 1, particles: 1 } } = {}) {
    const scene = new THREE.Scene();
    const shell = createOutdoorShell(scene, { quality, mood: mood ?? { fog: '#c8d4d8', fogNear: 160, fogFar: 700, fogMix: 0.55 } });
    const half = size / 2, NT = Math.ceil(size / TILE);
    const tiles = new Map();   // key → { tx, tz, lod, mesh, trees: [], colliders: [] }
    const queue = [];
    const K = treeKinds();
    const terrainMat = flat(0xffffff, { vertexColors: true });
    const cGrassA = new THREE.Color('#4d7a35'), cGrassB = new THREE.Color('#7aa04a'), cRock = new THREE.Color('#77726b'), cSand = new THREE.Color('#9a8a62'), cSnow = new THREE.Color('#e8ecf0'), col = new THREE.Color();
    const water = new THREE.Mesh(new THREE.PlaneGeometry(VIEW * TILE * 2.4, VIEW * TILE * 2.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x2a5068, transparent: true, opacity: 0.85, roughness: 0.15, metalness: 0.2 }));
    water.position.y = WATER; water.userData.dynamic = true; scene.add(water);
    const stats = { built: 0, lastMs: 0, maxMs: 0 };
    // Place markers (W2.1): a tall pale stone with a glow where each place will be built; its name when you are near.
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xe8e0c8, emissive: 0xb8a060, emissiveIntensity: 0.6, flatShading: true });
    const markers = places.filter(p => !stamps.some(st => inRect(st, p.x, p.z, 10))).map(p => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.0, 9, 6), markerMat); m.position.set(p.x, heightAt(p.x, p.z) + 4.5, p.z); m.castShadow = true; scene.add(m); return { ...p, m }; });
    const nameEl = document.createElement('div');
    nameEl.style.cssText = 'position:fixed;left:50%;top:14%;transform:translateX(-50%);z-index:30;font:calc(20px * var(--ui, 1)) Georgia,serif;letter-spacing:.12em;color:#f3e2b0;text-shadow:0 2px 6px #000;pointer-events:none;opacity:0;transition:opacity .6s';
    document.body.append(nameEl);

    // Under a stamped place the world's own ground sinks out of sight (the place's detailed ground shows), ramping down
    // over the rect's first metres so the seam stays tight.
    function sinkAt(x, z) {
        for (const st of stamps) if (inRect(st, x, z)) return 8 * sm(0, 6, Math.min(x - st.X0, st.X1 - x, z - st.Z0, st.Z1 - z));
        return 0;
    }
    const stamped = (x, z, m = 4) => stamps.some(st => inRect(st, x, z, m));
    // Each stamp's content moved into the world; its ground and water clipped to the rect; its colliders bucketed by tile.
    const stampColl = new Map();
    for (const st of stamps) {
        const g = new THREE.Group(); g.position.set(st.ox, st.oy, st.oz); g.name = 'stamp:' + st.id;
        st.group = g; st.off = new THREE.Vector3(st.ox, st.oy, st.oz); st.lpos = new THREE.Vector3(); st.lcam = new THREE.PerspectiveCamera();
        for (const o of [...st.map.scene.children]) if (!o.userData.shell) g.add(o);
        scene.add(g); g.updateMatrixWorld(true);
        const planes = [new THREE.Plane(new THREE.Vector3(1, 0, 0), -st.X0), new THREE.Plane(new THREE.Vector3(-1, 0, 0), st.X1), new THREE.Plane(new THREE.Vector3(0, 0, 1), -st.Z0), new THREE.Plane(new THREE.Vector3(0, 0, -1), st.Z1)];
        const box = new THREE.Box3(), drop = [];
        g.traverse(o => {
            if (!o.isMesh && !o.isPoints) return;
            box.setFromObject(o); if (box.isEmpty()) return;
            if (box.min.x > st.X1 || box.max.x < st.X0 || box.min.z > st.Z1 || box.max.z < st.Z0) { drop.push(o); return; }
            const mats = [].concat(o.material).filter(Boolean);
            // a painted backdrop (unfogged, made to hide an old map's edge): the world is the backdrop now
            if (mats.some(m => m.fog === false && !m.isShaderMaterial) && Math.max(box.max.x - box.min.x, box.max.z - box.min.z, box.max.y - box.min.y) > 150) { drop.push(o); return; }   // (not a waterfall or a light shaft: those are small, and shaders)
            // a flat sheet of water at the world's water level: the world's own water covers it
            if (box.max.y - box.min.y < 0.05 && Math.abs(box.min.y - WATER) < 0.6 && mats.some(m => m.transparent)) { drop.push(o); return; }
            if (box.min.x < st.X0 - 0.5 || box.max.x > st.X1 + 0.5 || box.min.z < st.Z0 - 0.5 || box.max.z > st.Z1 + 0.5)
                for (const m of mats) { m.clippingPlanes = planes; m.needsUpdate = true; }
        });
        for (const o of drop) o.parent?.remove(o);
        for (const c of st.map.colliders ?? []) {
            const w = { ...c, y0: (c.y0 ?? -1) + st.oy, y1: (c.y1 ?? 4) + st.oy };
            let xs, zs;
            if (c.ax !== undefined) { w.ax += st.ox; w.bx += st.ox; w.az += st.oz; w.bz += st.oz; xs = [w.ax, w.bx]; zs = [w.az, w.bz]; }
            else { w.x += st.ox; w.z += st.oz; xs = [w.x]; zs = [w.z]; }
            const tx0 = Math.floor((Math.min(...xs) - c.r + half) / TILE), tx1 = Math.floor((Math.max(...xs) + c.r + half) / TILE);
            const tz0 = Math.floor((Math.min(...zs) - c.r + half) / TILE), tz1 = Math.floor((Math.max(...zs) + c.r + half) / TILE);
            for (let tz = tz0; tz <= tz1; tz++) for (let tx = tx0; tx <= tx1; tx++) { const k = `${tx},${tz}`; (stampColl.get(k) ?? stampColl.set(k, []).get(k)).push(w); }
        }
    }

    // Life in a stamped place (W2.3): its creatures keep living in the place's own coordinates (their bodies ride the
    // stamp's group); each frame near it they see a player and camera moved into their frame, and anything they hand back
    // (a blow's origin, loot, a kill) is moved out again. The world's hittables are proxies at world positions: a hit's
    // origin is moved into the creature's frame; coreOf(proxy.pos) reaches its core (with shove translated).
    const toWorld = (st, a) => (a && a.isVector3 ? a.clone().add(st.off) : a);
    const toLocal = (st, a) => (a && a.isVector3 ? a.clone().sub(st.off) : a);
    function proxyOf(st, h) {
        const wpos = new THREE.Vector3().copy(h.pos).add(st.off);
        const core = coreOf(h.pos);
        if (core) registerCore(wpos, { ...core, pos: wpos, shove: (from, p) => core.shove(toLocal(st, from), p) });
        const hit = (dmg, from, burn, ctx, ...rest) => h.hit(dmg, toLocal(st, from), burn, st.lctx ?? ctx, ...rest);
        const px = new Proxy(h, { get(t, k) { if (k === 'pos') return wpos; if (k === 'hit') return hit; if (k === 'update') return () => {}; if (k === '_stamp') return st; const v = Reflect.get(t, k); return typeof v === 'function' ? v.bind(t) : v; } });
        return { px, h, wpos };
    }
    function localCtx(st, ctx) {
        st.lpos.copy(ctx.player.pos).sub(st.off);
        if (!st.lplayer || st.lplayerOf !== ctx.player) {
            st.lplayerOf = ctx.player;
            st.lplayer = new Proxy(ctx.player, { get(t, k) { if (k === 'pos') return st.lpos; const v = Reflect.get(t, k); return typeof v === 'function' ? (...a) => v.apply(t, a.map(x => toWorld(st, x))) : v; } });
        }
        if (ctx.camera) { st.lcam.copy(ctx.camera); st.lcam.position.sub(st.off); st.lcam.updateMatrixWorld(); }
        const L = Object.create(ctx);
        L.player = st.lplayer; L.camera = ctx.camera ? st.lcam : ctx.camera;
        for (const k of ['hurtPlayer', 'floater', 'onKill', 'dropLoot', 'hurtRemote']) if (typeof ctx[k] === 'function') { const f = ctx[k]; L[k] = (...a) => f(...a.map(x => toWorld(st, x))); }
        return L;
    }
    let lives = [];   // { px, h, wpos, st }
    function refreshLife() {
        lives = [];
        for (const st of stamps) for (const h of st.map.hittables ?? []) lives.push({ ...proxyOf(st, h), st });
        map.hittables.length = 0; map.hittables.push(...lives.map(l => l.px));
    }

    // One tile's terrain: a (seg+1)² grid of heights plus a skirt round its edge, dropped 6 m.
    function tileGeometry(tx, tz, seg) {
        const x0 = tx * TILE - half, z0 = tz * TILE - half, step = TILE / seg, n = seg + 1;
        const border = [];
        for (let i = 0; i < seg; i++) border.push([i, 0]);
        for (let j = 0; j < seg; j++) border.push([seg, j]);
        for (let i = seg; i > 0; i--) border.push([i, seg]);
        for (let j = seg; j > 0; j--) border.push([0, j]);
        const pos = new Float32Array((n * n + border.length) * 3), colr = new Float32Array((n * n + border.length) * 3);
        const H = new Float32Array(n * n);
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
            const x = x0 + i * step, z = z0 + j * step, h = heightAt(x, z), k = j * n + i;
            H[k] = h; pos.set([x, h - sinkAt(x, z), z], k * 3);
        }
        for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {   // colour by height and slope
            const k = j * n + i, h = H[k];
            const hx = H[j * n + Math.min(seg, i + 1)] - H[j * n + Math.max(0, i - 1)], hz = H[Math.min(seg, j + 1) * n + i] - H[Math.max(0, j - 1) * n + i];
            const slope = Math.hypot(hx, hz) / (2 * step);
            const nz = fbm((x0 + i * step) * 0.02, (z0 + j * step) * 0.02, 2);
            if (groundColor && groundColor(x0 + i * step, z0 + j * step, h, col)) { /* painted by the world */ }
            else if (h < WATER + 0.8) col.copy(cSand);
            else if (h > 62 + nz * 10) col.copy(cSnow);
            else if (slope > 0.75 || h > 40 + nz * 8) col.copy(cRock);
            else col.copy(cGrassA).lerp(cGrassB, nz);
            colr.set([col.r, col.g, col.b], k * 3);
        }
        border.forEach(([i, j], b) => { const k = j * n + i, o = (n * n + b) * 3; pos.set([pos[k * 3], pos[k * 3 + 1] - 6, pos[k * 3 + 2]], o); colr.set([colr[k * 3], colr[k * 3 + 1], colr[k * 3 + 2]], o); });
        const idx = [];
        for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const a = j * n + i, b = a + 1, c = a + n, d = c + 1; idx.push(a, c, b, b, c, d); }
        border.forEach(([i, j], b) => {   // the skirt: each edge vertex joined to its dropped twin
            const [i2, j2] = border[(b + 1) % border.length];
            const a = j * n + i, a2 = j2 * n + i2, d = n * n + b, d2 = n * n + (b + 1) % border.length;
            idx.push(a, d, a2, a2, d, d2);
        });
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        g.computeBoundingSphere();
        return g;
    }

    // Trees and rocks for a near tile (seeded by the tile, so they are the same every time it is built).
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    function tileFlora(t) {
        const rng = mulberry32(seed + t.tx * 7919 + t.tz * 104729);
        const x0 = t.tx * TILE - half, z0 = t.tz * TILE - half;
        const byKind = { pine: [], broad: [] };
        for (let i = 0; i < 220; i++) {
            const x = x0 + rng() * TILE, z = z0 + rng() * TILE, h = heightAt(x, z);
            if (h < WATER + 1 || h > 38) continue;
            if (fbm(x * 0.012 + 3, z * 0.012 + 9, 3) < 0.5) continue;   // woods and clearings
            if (clearAt && clearAt(x, z)) continue;   // roads, a town's ground
            if (stamped(x, z)) continue;   // a stamped place brings its own
            byKind[h > 18 || rng() < 0.4 ? 'pine' : 'broad'].push({ x, z, h, s: 0.8 + rng() * 0.6, r: rng() * 6.28, tint: rng() });
        }
        for (const [kind, list] of Object.entries(byKind)) {
            if (!list.length) continue;
            const Kd = K[kind];
            const trunks = new THREE.InstancedMesh(Kd.trunk, flat(Kd.trunkColor), list.length), crowns = new THREE.InstancedMesh(Kd.crown, flat(0xffffff), list.length);
            list.forEach((tr, i) => {
                q.setFromAxisAngle(Y, tr.r); m4.compose(v.set(tr.x, tr.h - 0.1, tr.z), q, sc.setScalar(tr.s));
                trunks.setMatrixAt(i, m4); crowns.setMatrixAt(i, m4);
                crowns.setColorAt(i, kind === 'pine' ? col.setHSL(0.33, 0.4, 0.18 + tr.tint * 0.06) : col.setHSL(0.25 + tr.tint * 0.05, 0.45, 0.25));
                t.colliders.push({ x: tr.x, z: tr.z, r: Kd.r * tr.s, kind: 'wall', y0: tr.h - 0.5, y1: tr.h + 5 * tr.s });
            });
            for (const im of [trunks, crowns]) { im.castShadow = im.receiveShadow = true; im.userData.dynamic = true; scene.add(im); t.trees.push(im); }
        }
    }

    function build(t, lod) {
        const t0 = performance.now();
        if (t.mesh) { scene.remove(t.mesh); t.mesh.geometry.dispose(); }
        t.mesh = new THREE.Mesh(tileGeometry(t.tx, t.tz, LOD(lod)), terrainMat);
        t.mesh.receiveShadow = lod <= 1; t.mesh.userData.dynamic = true;
        scene.add(t.mesh);
        const wantTrees = lod <= 2;
        if (wantTrees && !t.trees.length) tileFlora(t);
        if (!wantTrees && t.trees.length) dropFlora(t);
        t.lod = lod; t.pending = false;
        const ms = performance.now() - t0; stats.lastMs = ms; stats.maxMs = Math.max(stats.maxMs * 0.995, ms); stats.built++;
    }
    function dropFlora(t) { for (const im of t.trees) { scene.remove(im); im.dispose(); } t.trees = []; t.colliders = []; }
    function drop(key, t) { if (t.mesh) { scene.remove(t.mesh); t.mesh.geometry.dispose(); } dropFlora(t); tiles.delete(key); }

    let cx = null, cz = null;
    function stream(px, pz) {
        const tx = Math.floor((px + half) / TILE), tz = Math.floor((pz + half) / TILE);
        if (tx !== cx || tz !== cz) {   // the player crossed into another tile: what should exist, at what detail
            cx = tx; cz = tz;
            const want = new Map();
            for (let dz = -VIEW; dz <= VIEW; dz++) for (let dx = -VIEW; dx <= VIEW; dx++) {
                const x = tx + dx, z = tz + dz, d = Math.max(Math.abs(dx), Math.abs(dz));
                if (x < 0 || z < 0 || x >= NT || z >= NT || Math.hypot(dx, dz) > VIEW + 0.5) continue;
                want.set(`${x},${z}`, { x, z, d });
            }
            for (const [key, t] of tiles) if (!want.has(key)) drop(key, t);
            queue.length = 0;
            for (const [key, w] of want) {
                let t = tiles.get(key);
                if (!t) { t = { tx: w.x, tz: w.z, lod: null, mesh: null, trees: [], colliders: [] }; tiles.set(key, t); }
                const lod = w.d <= 1 ? w.d : w.d <= 3 ? 2 : 4;
                if (t.lod === null || LOD(t.lod) !== LOD(lod) || (lod <= 2) !== (t.lod <= 2)) queue.push({ t, lod, d: w.d });
            }
            queue.sort((a, b) => a.d - b.d);
        }
        for (let n = 0; n < BUDGET && queue.length; n++) { const job = queue.shift(); build(job.t, job.lod); }
        water.position.set(px, WATER, pz);
    }

    // Colliders near a point: only the 3×3 tiles round it (thousands of trees are loaded; a check touches ~a hundred).
    let frame = 0;
    function coll(x, z) {
        const tx = Math.floor((x + half) / TILE), tz = Math.floor((z + half) / TILE), out = [];
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const k = `${tx + dx},${tz + dz}`, t = tiles.get(k); if (t) for (const c of t.colliders) out.push(c); const sc2 = stampColl.get(k); if (sc2) for (const c of sc2) out.push(c); }
        return out;
    }

    const hud = document.createElement('div');
    hud.style.cssText = 'position:fixed;left:8px;top:8px;z-index:30;font:12px monospace;color:#e8f0e0;background:#0008;padding:4px 7px;border-radius:4px;pointer-events:none;display:none';
    document.body.append(hud);
    let fpsT = 0, fpsN = 0, fps = 0, worst = 0;

    const EDGE = half - 20;
    const map = {
        id, name, scene, heightAt, terrain: true, get colliders() { return []; },   // (per point: coll(x, z))
        camera: { maxDist: 30, pitch: 0.38, dist: 9 },
        groundAt: (x, z) => heightAt(x, z),
        wading: (x, z) => heightAt(x, z) < WATER - 0.05,
        blockedAt(x, z, r, y = heightAt(x, z)) {
            const c = colliderAt(coll(x, z), x, z, r, y); if (c) return c.kind;
            if (heightAt(x, z) < WATER - 0.7 || Math.max(Math.abs(x), Math.abs(z)) > EDGE) return 'wall';
            return null;
        },
        resolve: (pos, r) => pushOut(coll(pos.x, pos.z), pos, r),
        passable: (x, z) => heightAt(x, z) >= WATER - 0.7 && Math.max(Math.abs(x), Math.abs(z)) <= EDGE,
        projectileHit(p) { if (p.y < heightAt(p.x, p.z) + 0.05) return 'ground'; const c = colliderAt(coll(p.x, p.z), p.x, p.z, 0.15, p.y); return c && p.y >= c.y0 + 0.5 ? 'object' : null; },
        groundNormal(x, z) { const e = 0.3; return new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize(); },
        triggers: [], stations: [], hittables: [], gatherSpots: [], gates: [], spawns: { start: { x: 0, z: 0, facing: 0 } },   // (moved to dry, low ground below) stations: [], hittables: [], gatherSpots: [], gates: [],
        mapInfo: null, weatherDef: { id, biome: 'temperate' },   // (a world's chart: set below from `chart`)
        stamps, streamStats: () => ({ tiles: tiles.size, queue: queue.length, built: stats.built, lastMs: +stats.lastMs.toFixed(1), maxMs: +stats.maxMs.toFixed(1), fps, worstFrameMs: +worst.toFixed(1) }),
        update(t, dt, ctx) {
            frame++;
            const P = ctx.player.pos;
            stream(P.x, P.z);
            for (const st of stamps) {   // a stamped place's creatures, while the player is within reach of it
                const inside = inRect(st, P.x, P.z, 4);
                if (inside && !st.inside) map.onPlace?.(st.id, st.map.name ?? st.id);   // walked into a place (main.js: its story, its banner)
                st.inside = inside;
                st.awake = inRect(st, P.x, P.z, st.wake ?? 220);   // (a place can ask to wake only when you are on it: the mountain's fall recovery)
                if (!st.awake) continue;
                st.lctx = localCtx(st, ctx);
                // the place's own life: its creatures, townsfolk, lamps, fires, trials — all in its frame (its sky and fog
                // belong to its old scene, which is no longer drawn)
                if (st.map.update) st.map.update(t, dt, st.lctx);
                else for (const h of st.map.hittables ?? []) h.update(dt, st.lctx);
            }
            for (const l of lives) l.wpos.copy(l.h.pos).add(l.st.off);
            shell.update(dt, ctx);
            fpsT += dt; fpsN++; worst = Math.max(worst * 0.98, dt * 1000);
            if (fpsT >= 1) { fps = Math.round(fpsN / fpsT); fpsT = 0; fpsN = 0; }
            hud.style.display = '';
            let near = null, nd = 90;
            for (const mk of markers) { const d = Math.hypot(mk.x - P.x, mk.z - P.z); if (d < nd) { nd = d; near = mk; } }
            if (near) nameEl.textContent = near.name;
            nameEl.style.opacity = near ? 1 : 0;
            hud.textContent = `W1 stream · ${fps} fps · worst ${worst.toFixed(0)} ms · tiles ${tiles.size} (queue ${queue.length}) · build ${stats.lastMs.toFixed(1)}/${stats.maxMs.toFixed(1)} ms · ${(Math.hypot(P.x, P.z) / 1000).toFixed(2)} km from centre`;
        },
        onLeave() { hud.style.display = 'none'; },
    };
    // A stamped place's doors, signs and arrival points, moved into the world.
    for (const st of stamps) {
        for (const t of st.map.triggers ?? []) if (!st.drop?.has(t.to) && !st.dropIf?.(t)) map.triggers.push({ ...t, x: t.x + st.ox, z: t.z + st.oz });   // (exits to places now in the world are gone: you walk)
        for (const s2 of st.map.stations ?? []) if (s2.pos) map.stations.push({ ...s2, pos: s2.pos.clone().add(new THREE.Vector3(st.ox, st.oy, st.oz)) });
        for (const [k, sp] of Object.entries(st.map.spawns ?? {})) map.spawns[`${st.id}:${k}`] = { ...sp, x: sp.x + st.ox, z: sp.z + st.oz };
    }
    // The chart (game/mapview.js): the land painted coarse, the stamped places' own charts laid on top; landmarks are
    // the world's places and every stamped place's own, moved into world coordinates.
    if (chart) {
        const landmarks = [...markers.map(m => ({ x: m.x, z: m.z, name: m.name })), ...stamps.flatMap(st => (st.map.mapInfo?.landmarks ?? []).map(l => ({ ...l, x: l.x + st.ox, z: l.z + st.oz })))];
        map.mapInfo = { half, water: WATER, snowH: 62, rockH: 40, ...chart, landmarks, stamps };
    }
    // The townsfolk of every stamped place, as one town (main.js talks to map.town.nearestPerson).
    const personProxy = (st, p) => new Proxy(p, { get(t, k) { if (k === 'pos') return t.pos.clone().add(st.off); const v = Reflect.get(t, k); return typeof v === 'function' ? v.bind(t) : v; } });
    if (stamps.some(st => st.map.town)) map.town = {
        nearestPerson(pos, within) {
            for (const st of stamps) {
                if (!st.map.town || !inRect(st, pos.x, pos.z, 10)) continue;
                const p = st.map.town.nearestPerson(pos.clone().sub(st.off), within);
                if (p) return personProxy(st, p);
            }
            return null;
        },
        setVisible(v) { for (const st of stamps) st.map.town?.setVisible?.(v); },
        update() {},
    };
    map.refreshLife = refreshLife;   // after anything is added to a stamp's hittables (main.js: each place's animals)
    refreshLife();
    for (const p of places) {   // every place on the world map can be arrived at (god mode's list: "place:<name>"), a little off its centre on dry ground
        let x = p.x, z = p.z;
        for (let r = 0, k = 0; r < 60 && (heightAt(x, z) < WATER + 0.5 || colliderAt(coll(x, z), x, z, 0.6, heightAt(x, z))); r += 3, k++) { x = p.x + Math.cos(k * 2.4) * r; z = p.z + Math.sin(k * 2.4) * r; }
        map.spawns[`place:${p.name}`] = { x, z, facing: 0 };
    }
    if (spawn) map.spawns.start = spawn;
    // Arrive on dry, low ground near the centre (unless the world says where).
    if (!spawn) for (let r = 0, a = 0; r < half * 0.6; r += 6, a += 2.4) { const x = Math.cos(a) * r, z = Math.sin(a) * r, h = heightAt(x, z); if (h > WATER + 2 && h < 16) { map.spawns.start = { x, z, facing: 0 }; break; } }
    // The readout hides itself when this map is no longer the one updating.
    let lastUpdate = 0; const watch = setInterval(() => { if (performance.now() - lastUpdate > 600) { hud.style.display = 'none'; nameEl.style.opacity = 0; } }, 500);
    map.dispose = () => clearInterval(watch);
    const upd = map.update; map.update = (t, dt, ctx) => { lastUpdate = performance.now(); upd(t, dt, ctx); };
    // the first ring at once, so the player never lands on nothing
    stream(map.spawns.start.x, map.spawns.start.z); while (queue.length && queue[0].d <= 1) { const job = queue.shift(); build(job.t, job.lod); }
    return map;
}
