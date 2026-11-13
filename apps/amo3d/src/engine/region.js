// Generic region builder: an outdoor map from a data file (content/regions/*.json). A region gives
// a terrain recipe (noise, features), palette, mood, trees, gathering, actors, gates and links to
// neighbouring regions; the builder returns the same map interface the glade has (heightAt,
// colliders, nav, mapInfo, spawns, triggers, update with sky and weather…).
import * as THREE from 'three';
import { flat, mulberry32, colliderAt, pushOut, fbm, smoothstep, radialTexture } from './lib.js';
import { createOutdoorShell } from './outdoor.js';
import { createNav } from './nav.js';
import { bakeStatic } from './batch.js';
import { treeKinds } from '../content/models/flora.js';
import { createWolves } from '../content/actors/wolf.js';
import { createShadows } from '../content/actors/shadowSoldier.js';
import { createDeer } from '../content/actors/deer.js';
import { buildMonolith } from '../game/travel.js';

const segDist = (x, z, pts) => {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
        const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
        best = Math.min(best, Math.hypot(x - ax - dx * k, z - az - dz * k));
    }
    return best;
};

// An archway marking a link to another region.
export function buildArch(scene, x, y, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, y, z); g.rotation.y = ry;
    const stone = flat(0x6a6660);
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4, 0.8), stone); p.position.set(s * 1.8, 2, 0); p.castShadow = true; g.add(p); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.7, 0.9), stone); top.position.y = 4.2; top.castShadow = true; g.add(top);
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 3.8), new THREE.MeshBasicMaterial({ color: 0x8ab0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    veil.position.y = 1.9; g.add(veil);
    g.userData.dynamic = true;
    scene.add(g);
    return veil;
}

// The terrain height of a region (pure: the game and the editor both use it).
export function regionHeight(def) {
    const half = def.half ?? 90, WATER = def.water ?? -1.2, EDGE = half - 6, T = def.terrain ?? {}, path = def.path ?? [];
    return function heightAt(x, z) {
        let h = (fbm(x * (T.scale ?? 0.02) + 31, z * (T.scale ?? 0.02) - 17) - 0.5) * (T.relief ?? 10) + (T.base ?? 0.5);
        for (const f of def.features ?? []) {
            const d = Math.hypot(x - f.x, z - f.z);
            if (f.type === 'lake') h -= smoothstep(f.r, f.r * 0.25, d) * (f.depth ?? 5);
            else if (f.type === 'hill') h += smoothstep(f.r, 0, d) * f.h;
            else if (f.type === 'clearing') h += (0.4 - h) * smoothstep(f.r, f.r * 0.5, d);
        }
        const pd = path.length > 1 ? segDist(x, z, path) : Infinity;
        if (pd < 4) h += (Math.max(h, WATER + 1) - h) * smoothstep(4, 1.5, pd) - smoothstep(3, 0, pd) * 0.15;
        h += smoothstep(EDGE - 18, EDGE + 4, Math.max(Math.abs(x), Math.abs(z))) * (T.rim ?? 22) * (0.6 + 0.8 * fbm(x * 0.05, z * 0.05));   // a wall of hills
        return h;
    };
}

export function buildRegion(def, { quality = { foliage: 1, shadows: true, shadowMap: 2048, shadowRange: 48, fogFar: 1, particles: 1 } } = {}) {
    const scene = new THREE.Scene();
    const rng = mulberry32(def.seed ?? 7);
    const half = def.half ?? 90, WATER = def.water ?? -1.2, EDGE = half - 6;
    const T = def.terrain ?? {}, P = def.palette ?? {};
    const colliders = [];
    const path = def.path ?? [];

    // ---------- terrain ----------
    const heightAt = regionHeight(def);

    const SIZE = half * 2, SEG = Math.round(SIZE / 1.2);
    const tGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).rotateX(-Math.PI / 2);
    const tp = tGeo.attributes.position, colors = new Float32Array(tp.count * 3);
    const cA = new THREE.Color(P.grassA ?? '#4d7a35'), cB = new THREE.Color(P.grassB ?? '#7aa04a'), cDirt = new THREE.Color(P.dirt ?? '#6e5a3c'),
        cRock = new THREE.Color(P.rock ?? '#77726b'), cSand = new THREE.Color(P.shore ?? '#8a7a5a'), col = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i), z = tp.getZ(i), h = heightAt(x, z);
        tp.setY(i, h);
        const n = fbm(x * 0.08, z * 0.08, 3);
        if (h < WATER + 0.35) col.copy(cSand);
        else if (h > 7 + n * 3) col.copy(cRock);
        else col.copy(cA).lerp(cB, n);
        if (path.length > 1 && segDist(x, z, path) < 1.6) col.lerp(cDirt, 0.85);
        colors.set([col.r, col.g, col.b], i * 3);
    }
    tGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    tGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(tGeo, flat(0xffffff, { vertexColors: true }));
    terrain.receiveShadow = true;
    scene.add(terrain);
    if ((def.features ?? []).some(f => f.type === 'lake')) {
        const water = new THREE.Mesh(new THREE.PlaneGeometry(SIZE, SIZE).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: P.water ?? 0x24485a, transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.2 }));
        water.position.y = WATER;
        scene.add(water);
    }

    // ---------- light, sky, mood ----------
    const M = def.mood ?? {};
    const shell = createOutdoorShell(scene, { quality, mood: M });

    // ---------- links (archways to other regions) and reserved ground ----------
    const links = def.links ?? [];
    const reserved = (x, z, m = 0) => links.some(l => Math.hypot(l.x - x, l.z - z) < 7 + m) || (path.length > 1 && segDist(x, z, path) < 2.2 + m)
        || (def.features ?? []).some(f => f.type === 'clearing' && Math.hypot(f.x - x, f.z - z) < f.r * 0.6);
    const addCollider = (c, height) => { const y0 = heightAt(c.x, c.z); colliders.push({ ...c, y0: y0 - 0.5, y1: y0 + height }); };

    // ---------- trees ----------
    const K = treeKinds(), weights = Object.entries(def.trees?.kinds ?? { pine: 1 });
    const totalW = weights.reduce((s, [, w]) => s + w, 0);
    const pickKind = () => { let r = rng() * totalW; for (const [k, w] of weights) if ((r -= w) < 0) return k; return weights[0][0]; };
    const trees = [];
    const target = Math.round((def.trees?.count ?? 500) * Math.max(0.5, quality.foliage));
    for (let i = 0; i < target * 6 && trees.length < target; i++) {
        const x = (rng() - 0.5) * SIZE * 0.96, z = (rng() - 0.5) * SIZE * 0.96, h = heightAt(x, z);
        if (h < WATER + 0.5 || h > 14 || reserved(x, z)) continue;
        if (fbm(x * 0.04 + 3, z * 0.04 + 9, 3) < (def.trees?.gaps ?? 0.42) && rng() > 0.05) continue;
        const kind = pickKind();
        trees.push({ x, z, h, kind, s: 0.8 + rng() * (def.trees?.sizeVar ?? 0.7), rot: rng() * 6.28, tint: rng() });
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
    const crownColor = (t) => {
        const c = def.trees?.colors?.[t.kind];
        if (c) return col.set(c).offsetHSL(0, 0, (t.tint - 0.5) * 0.08);
        return t.kind === 'pine' ? col.setHSL(0.33, 0.4, 0.18 + t.tint * 0.06) : t.kind === 'birch' ? col.setHSL(0.18, 0.5, 0.4) : col.setHSL(0.25 + t.tint * 0.05, 0.45, 0.25);
    };
    for (const kind of Object.keys(K)) {
        const list = trees.filter(t => t.kind === kind);
        if (!list.length) continue;
        const Kd = K[kind];
        const trunks = new THREE.InstancedMesh(Kd.trunk, flat(def.trees?.trunk?.[kind] ?? Kd.trunkColor), list.length);
        const crowns = kind === 'dead' ? null : new THREE.InstancedMesh(Kd.crown, flat(0xffffff), list.length);
        list.forEach((t, i) => {
            q.setFromAxisAngle(Y, t.rot);
            m4.compose(v.set(t.x, t.h - 0.1, t.z), q, sc.setScalar(t.s));
            trunks.setMatrixAt(i, m4);
            if (crowns) { crowns.setMatrixAt(i, m4); crowns.setColorAt(i, crownColor(t)); }
            addCollider({ x: t.x, z: t.z, r: Kd.r * t.s, kind: 'wall' }, 5 * t.s);
        });
        for (const im of [trunks, crowns]) if (im) { im.castShadow = im.receiveShadow = true; scene.add(im); }
    }

    // ---------- rocks and undergrowth ----------
    const rockList = [];
    for (let i = 0; i < 600 && rockList.length < (def.rocks ?? 60); i++) {
        const x = (rng() - 0.5) * SIZE * 0.9, z = (rng() - 0.5) * SIZE * 0.9, h = heightAt(x, z);
        if (h < WATER || reserved(x, z)) continue;
        rockList.push({ x, z, h, s: rng() < 0.6 ? 0.25 + rng() * 0.3 : 0.6 + rng() * 0.9 });
    }
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), flat(0xffffff), Math.max(1, rockList.length));
    rockList.forEach((r, i) => {
        q.setFromEuler(new THREE.Euler(rng(), rng() * 6, rng()));
        rocks.setMatrixAt(i, m4.compose(v.set(r.x, r.h + r.s * 0.25, r.z), q, sc.set(r.s * 1.2, r.s * 0.8, r.s)));
        rocks.setColorAt(i, col.set(P.stone ?? '#6a6660').offsetHSL(0, 0, (rng() - 0.5) * 0.08));
        addCollider({ x: r.x, z: r.z, r: r.s, kind: r.s < 0.6 ? 'hop' : 'wall' }, r.s * 1.1);
    });
    rocks.castShadow = rocks.receiveShadow = true;
    scene.add(rocks);
    const ferns = [];
    for (let i = 0; i < 6000 && ferns.length < 2500 * quality.foliage; i++) {
        const x = (rng() - 0.5) * SIZE * 0.9, z = (rng() - 0.5) * SIZE * 0.9, h = heightAt(x, z);
        if (h < WATER + 0.3 || h > 6 || (path.length > 1 && segDist(x, z, path) < 1.4)) continue;
        ferns.push([x, h, z]);
    }
    const fern = new THREE.InstancedMesh(new THREE.ConeGeometry(0.09, 0.4, 3).translate(0, 0.18, 0), flat(0xffffff), Math.max(1, ferns.length));
    ferns.forEach(([x, h, z], i) => {
        q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.6, rng() * 6, (rng() - 0.5) * 0.6));
        fern.setMatrixAt(i, m4.compose(v.set(x, h, z), q, sc.setScalar(0.7 + rng())));
        fern.setColorAt(i, col.set(P.undergrowth ?? '#3f6a2c').offsetHSL(0, 0, (rng() - 0.5) * 0.1));
    });
    fern.receiveShadow = true;
    scene.add(fern);

    // Glowing motes where the veil is thin (mood.motes).
    let motes = null;
    if (M.motes) {
        const N = 260, mp = new Float32Array(N * 3), seed = Array.from({ length: N }, () => [(rng() - 0.5) * SIZE * 0.8, rng() * 4, (rng() - 0.5) * SIZE * 0.8, rng() * 6]);
        const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
        motes = { pts: new THREE.Points(mg, new THREE.PointsMaterial({ map: radialTexture([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']], 32), color: M.motes, size: 0.28, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })), mp, seed };
        motes.pts.userData.dynamic = true;
        scene.add(motes.pts);
    }

    // ---------- map object ----------
    const map = {
        id: def.id, name: def.name, scene, heightAt, terrain: true, colliders,
        camera: { maxDist: 22, pitch: 0.38, dist: 8 },
        groundAt: (x, z) => heightAt(x, z),
        wading: (x, z) => heightAt(x, z) < WATER - 0.05,
        blockedAt(x, z, r, y = heightAt(x, z)) {
            const c = colliderAt(colliders, x, z, r, y);
            if (c) return c.kind;
            if (heightAt(x, z) < WATER - 0.7 || Math.max(Math.abs(x), Math.abs(z)) > EDGE) return 'wall';
            return null;
        },
        resolve: (pos, r) => pushOut(colliders, pos, r),
        passable: (x, z) => heightAt(x, z) >= WATER - 0.7 && Math.max(Math.abs(x), Math.abs(z)) <= EDGE,
        projectileHit(p) {
            if (p.y < heightAt(p.x, p.z) + 0.05) return 'ground';
            const c = colliderAt(colliders, p.x, p.z, 0.15, p.y);
            return c && p.y >= c.y0 + 0.5 ? 'object' : null;
        },
        groundNormal(x, z) {
            const e = 0.3;
            return new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
        },
        triggers: [], spawns: { start: { x: def.start?.x ?? 0, z: def.start?.z ?? 0, facing: def.start?.facing ?? 0 } },
        stations: [], hittables: [], gatherSpots: [],
    };

    for (const l of links) {
        const y = heightAt(l.x, l.z);
        const veil = buildArch(scene, l.x, y, l.z, l.facing ?? 0);
        for (const s of [-1, 1]) addCollider({ x: l.x + Math.cos(l.facing ?? 0) * 1.8 * s, z: l.z - Math.sin(l.facing ?? 0) * 1.8 * s, r: 0.5, kind: 'wall' }, 4);
        map.triggers.push({ x: l.x, z: l.z, r: 1.2, label: l.label, to: l.to, spawn: l.toSpawn });
        map.spawns[l.spawn] = { x: l.x + Math.sin(l.facing ?? 0) * 3.2, z: l.z + Math.cos(l.facing ?? 0) * 3.2, facing: l.facing ?? 0 };
        l._veil = veil;
    }

    // Gathering spots: type → count, placed where they suit.
    for (const [type, count] of Object.entries(def.gather ?? {})) {
        let n = 0;
        for (let i = 0; i < 3000 && n < count; i++) {
            const x = (rng() - 0.5) * SIZE * 0.85, z = (rng() - 0.5) * SIZE * 0.85, h = heightAt(x, z);
            if (h < WATER + 0.4 || h > 8 || reserved(x, z) || map.blockedAt(x, z, 1.1) || map.gatherSpots.some(s => Math.hypot(s.x - x, s.z - z) < 4)) continue;
            map.gatherSpots.push({ type, x, z });
            n++;
        }
    }

    // Monoliths (fast travel gates).
    map.gates = (def.gates ?? []).map(g => ({ ...g }));
    const monoliths = map.gates.map(g => {
        addCollider({ x: g.x, z: g.z, r: 0.55, kind: 'wall' }, 3.2);
        map.stations.push({ mode: 'gate', key: g.id, pos: new THREE.Vector3(g.x, heightAt(g.x, g.z), g.z) });
        map.spawns[`gate:${g.id}`] = { x: g.x + 1.7, z: g.z, facing: Math.PI / 2 };
        return { g, m: buildMonolith(scene, g, heightAt(g.x, g.z)) };
    });

    // Actors.
    for (const a of def.actors ?? []) {
        if (a.type === 'wolves') map.hittables.push(...createWolves({ scene, map, rng, den: a.den, count: a.count ?? 3 }));
        else if (a.type === 'deer') a.homes.forEach((home, i) => { const d = createDeer({ home, stag: i === 0, rng, map }); scene.add(d.root); map.hittables.push(d); });
        else if (a.type === 'shadows') { map.shadows = createShadows({ scene, map, rng, posts: a.posts }); map.hittables.push(...map.shadows.list); }
    }
    for (const h of map.hittables) if (h.root) h.root.userData.dynamic = true;
    map.batch = bakeStatic(scene);
    map.nav = createNav({ colliders, passable: map.passable, half });
    map.mapInfo = {
        half, water: WATER, trees: trees.map(t => [t.x, t.z, t.kind === 'pine' || t.kind === 'dead' ? 1 : 0]),
        landmarks: [...(def.landmarks ?? []), ...links.map(l => ({ name: l.label.replace(/^To /, '→ '), x: l.x, z: l.z, icon: 'gate' })), ...map.gates.map(g => ({ name: g.label, x: g.x, z: g.z, icon: 'stones' }))],
    };

    map.update = (t, dt, ctx) => {
        for (const h of map.hittables) h.update(dt, ctx);
        map.shadows?.update(dt);
        const S = shell.update(dt, ctx);
        for (const { g, m } of monoliths) m.update(t, (ctx.attunedGates ?? []).includes(g.id));
        for (const l of links) l._veil.material.opacity = 0.14 + Math.sin(t * 2) * 0.06;
        if (motes) {
            motes.seed.forEach(([x, y, z, ph], i) => motes.mp.set([x + Math.sin(t * 0.3 + ph) * 2, heightAt(x, z) + 0.6 + y + Math.sin(t * 0.7 + ph) * 0.5, z + Math.cos(t * 0.25 + ph) * 2], i * 3));
            motes.pts.geometry.attributes.position.needsUpdate = true;
            motes.pts.material.opacity = 0.35 + 0.55 * S.night + 0.2;
        }
    };
    return map;
}
