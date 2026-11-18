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
import { createBeasts } from '../content/actors/beast.js';
import { buildHouse, buildProp, PROP_R } from '../content/models/buildings.js';

const segDist = (x, z, pts) => {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az;
        const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
        best = Math.min(best, Math.hypot(x - ax - dx * k, z - az - dz * k));
    }
    return best;
};

// Settlements (region files): roads are polylines { pts, w, kind: 'road' | 'paved' }; buildings are footprints
// { x, z, w, d, ry } that the ground is levelled under.
const roadInfo = (def, x, z) => { let best = null; for (const r of def.roads ?? []) { const d = segDist(x, z, r.pts); if (d < (r.w ?? 3) / 2 && (!best || d < best.d)) best = { d, kind: r.kind ?? 'road' }; } return best; };
function rectDist(b, x, z) {   // distance from a point to a building's (rotated) footprint
    const c = Math.cos(-(b.ry ?? 0)), s = Math.sin(-(b.ry ?? 0)), lx = (x - b.x) * c - (z - b.z) * s, lz = (x - b.x) * s + (z - b.z) * c;
    return Math.hypot(Math.max(Math.abs(lx) - (b.w ?? 6) / 2, 0), Math.max(Math.abs(lz) - (b.d ?? 5) / 2, 0));
}

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
    const trails = [path, ...(def.branches ?? []), ...(def.roads ?? []).map(r => r.pts)].filter(p => p.length > 1);
    const pads = new Map();   // each building's level: the raw ground at its centre
    const raw = (x, z) => { let h = (fbm(x * (T.scale ?? 0.02) + 31, z * (T.scale ?? 0.02) - 17) - 0.5) * (T.relief ?? 10) + (T.base ?? 0.5); for (const f of def.features ?? []) { if (f.type === 'hill') h += smoothstep(f.r, 0, Math.hypot(x - f.x, z - f.z)) * f.h; else if (f.type === 'clearing') h += (0.4 - h) * smoothstep(f.r, f.r * 0.5, Math.hypot(x - f.x, z - f.z)); } return h; };
    return function heightAt(x, z) {
        let h = (fbm(x * (T.scale ?? 0.02) + 31, z * (T.scale ?? 0.02) - 17) - 0.5) * (T.relief ?? 10) + (T.base ?? 0.5);
        for (const f of def.features ?? []) {
            const d = Math.hypot(x - f.x, z - f.z);
            if (f.type === 'lake') h -= smoothstep(f.r, f.r * 0.25, d) * (f.depth ?? 5);
            else if (f.type === 'hill') h += smoothstep(f.r, 0, d) * f.h;
            else if (f.type === 'clearing') h += (0.4 - h) * smoothstep(f.r, f.r * 0.5, d);
            else if (f.type === 'river') h -= smoothstep(f.w, f.w * 0.3, segDist(x, z, f.pts)) * (f.depth ?? 4);   // a channel along a polyline
        }
        const pd = trails.length ? Math.min(...trails.map(p => segDist(x, z, p))) : Infinity;
        if (T.carveTo !== undefined) { if (pd < 7) h += (T.carveTo - h) * smoothstep(7, 2.5, pd); }   // a trail cut through the rock
        else if (pd < 4) h += (Math.max(h, WATER + 1) - h) * smoothstep(4, 1.5, pd) - smoothstep(3, 0, pd) * 0.15;
        for (const b of def.buildings ?? []) {   // level ground under and just round every building
            const d = rectDist(b, x, z); if (d > 4) continue;
            if (!pads.has(b)) pads.set(b, b.y ?? Math.max(raw(b.x, b.z), WATER + 0.6));
            h += (pads.get(b) - h) * smoothstep(4, 0.6, d);
        }
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
    const trails = [path, ...(def.branches ?? []), ...(def.roads ?? []).map(r => r.pts)].filter(p => p.length > 1);
    const trailDist = (x, z) => (trails.length ? Math.min(...trails.map(p => segDist(x, z, p))) : Infinity);

    // ---------- terrain ----------
    const heightAt = regionHeight(def);

    const SIZE = half * 2, SEG = Math.round(SIZE / 1.2);
    const tGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).rotateX(-Math.PI / 2);
    const tp = tGeo.attributes.position, colors = new Float32Array(tp.count * 3);
    const cA = new THREE.Color(P.grassA ?? '#4d7a35'), cB = new THREE.Color(P.grassB ?? '#7aa04a'), cDirt = new THREE.Color(P.dirt ?? '#6e5a3c'),
        cRock = new THREE.Color(P.rock ?? '#77726b'), cRoad = new THREE.Color(P.road ?? '#9a8466'), cPaved = new THREE.Color(P.paved ?? '#a8a49a'), cSand = new THREE.Color(P.shore ?? '#8a7a5a'), col = new THREE.Color(), cSnow = P.snow ? new THREE.Color(P.snow) : null;
    for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i), z = tp.getZ(i), h = heightAt(x, z);
        tp.setY(i, h);
        const n = fbm(x * 0.08, z * 0.08, 3);
        if (h < WATER + 0.35) col.copy(cSand);
        else if (cSnow && h > (T.snowLine ?? 14) + n * 4) col.copy(cSnow);   // palette.snow: snow above terrain.snowLine
        else if (h > (T.rockLine ?? 7) + n * 3) col.copy(cRock);
        else col.copy(cA).lerp(cB, n);
        for (const z0 of def.tints ?? []) { const d = Math.hypot(x - z0.x, z - z0.z); if (d < z0.r) col.lerp(new THREE.Color(z0.color), (z0.k ?? 0.8) * smoothstep(z0.r, z0.r * 0.4, d)); }   // tints: coloured ground zones
        const rd = roadInfo(def, x, z);
        if (rd) col.copy(rd.kind === 'paved' ? cPaved : cRoad).offsetHSL(0, 0, (n - 0.5) * 0.06);
        else if (trailDist(x, z) < 1.6) col.lerp(cDirt, 0.85);
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
    const reserved = (x, z, m = 0) => links.some(l => Math.hypot(l.x - x, l.z - z) < 7 + m) || (trailDist(x, z) < 2.2 + m)
        || (def.buildings ?? []).some(b => rectDist(b, x, z) < 3 + m) || (def.roads ?? []).some(r => segDist(x, z, r.pts) < (r.w ?? 3) / 2 + 1.5 + m)
        || (def.props ?? []).some(pr => Math.hypot(pr.x - x, pr.z - z) < 2 + m)
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
        if (h < WATER + 0.3 || h > 6 || (trailDist(x, z) < 1.4)) continue;
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
        if (l.to) map.triggers.push({ x: l.x, z: l.z, r: 1.2, label: l.label, to: l.to, spawn: l.toSpawn });
        else { veil.material.color.setHex(0x8a8a8a); map.triggers.push({ x: l.x, z: l.z, r: 1.6, label: `${l.label} (the way is not open yet)`, to: null }); }
        map.spawns[l.spawn] = { x: l.x + Math.sin(l.facing ?? 0) * 3.2, z: l.z + Math.cos(l.facing ?? 0) * 3.2, facing: l.facing ?? 0 };
        l._veil = veil;
    }

    // Gathering spots: type → count, placed where they suit.
    for (const [type, count] of Object.entries(def.gather ?? {})) {
        let n = 0;
        for (let i = 0; i < 3000 && n < count; i++) {
            const x = (rng() - 0.5) * SIZE * 0.85, z = (rng() - 0.5) * SIZE * 0.85, h = heightAt(x, z);
            if (h < WATER + 0.4 || h > 8 || reserved(x, z) || map.blockedAt(x, z, 1.1) || map.gatherSpots.some(s => Math.hypot(s.x - x, s.z - z) < 4)) continue;
            map.gatherSpots.push({ type, x, z, yields: def.gatherYields?.[type] });
            n++;
        }
    }

    // Settlement buildings and street props.
    for (const b of def.buildings ?? []) {
        const g = buildHouse(b), y = heightAt(b.x, b.z);
        g.position.set(b.x, y, b.z); g.rotation.y = b.ry ?? 0; scene.add(g);
        const c = Math.cos(b.ry ?? 0), sn = Math.sin(b.ry ?? 0), hw = (b.w ?? 6) / 2, hd = (b.d ?? 5) / 2;
        const corner = (lx, lz) => [b.x + lx * c + lz * sn, b.z - lx * sn + lz * c];
        const k = [corner(-hw, -hd), corner(hw, -hd), corner(hw, hd), corner(-hw, hd)];
        for (let i = 0; i < 4; i++) { const [ax, az] = k[i], [bx, bz] = k[(i + 1) % 4]; colliders.push({ ax, az, bx, bz, r: 0.2, kind: 'wall', y0: y - 1, y1: y + (b.h ?? 3.2) + 3 }); }
        if (b.sign) map.stations.push({ mode: 'sign', text: b.signText ?? b.sign, pos: new THREE.Vector3(...[corner(0.95, hd + 0.8)].map(([px, pz]) => [px, y, pz])[0]) });
    }
    for (const pr of def.props ?? []) {
        const g = buildProp(pr.type, pr), y = heightAt(pr.x, pr.z);
        g.position.set(pr.x, y, pr.z); g.rotation.y = pr.ry ?? 0; scene.add(g);
        if (pr.type === 'fence') { const c = Math.cos(pr.ry ?? 0), sn = Math.sin(pr.ry ?? 0), l = (pr.len ?? 4) / 2; colliders.push({ ax: pr.x - l * c, az: pr.z + l * sn, bx: pr.x + l * c, bz: pr.z - l * sn, r: 0.15, kind: 'hop', y0: y - 1, y1: y + 1.1 }); }
        else if (PROP_R[pr.type]) addCollider({ x: pr.x, z: pr.z, r: PROP_R[pr.type], kind: 'wall' }, 2.5);
    }

    // Signs to read (amo spawns.signs).
    for (const sg of def.signs ?? []) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.08), flat(0x8a7a5a)); post.position.set(sg.x, heightAt(sg.x, sg.z) + 0.5, sg.z); post.castShadow = true; scene.add(post);
        map.stations.push({ mode: 'sign', text: sg.text, pos: new THREE.Vector3(sg.x, heightAt(sg.x, sg.z), sg.z) });
    }
    map.weatherDef = { id: def.id, biome: def.biome ?? 'temperate' };

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
        else if (a.type === 'beasts') map.hittables.push(...createBeasts({ scene, map, rng, type: a.kind, posts: a.posts }));
    }
    for (const h of map.hittables) if (h.root) h.root.userData.dynamic = true;
    map.batch = bakeStatic(scene);
    map.nav = createNav({ colliders, passable: map.passable, half });
    map.mapInfo = {
        half, water: WATER, ground: [1, 3, 5].map(i => parseInt((P.grassA ?? '#4d7a35').slice(i, i + 2), 16)), trees: trees.map(t => [t.x, t.z, t.kind === 'pine' || t.kind === 'dead' ? 1 : 0]),
        groundAt: (x, z) => roadInfo(def, x, z)?.kind ?? null,
        buildings: (def.buildings ?? []).map(b => { const r = Math.abs(Math.sin(b.ry ?? 0)) > 0.7, w = (r ? b.d : b.w) ?? 6, d = (r ? b.w : b.d) ?? 5; return { x0: b.x - w / 2, z0: b.z - d / 2, x1: b.x + w / 2, z1: b.z + d / 2 }; }),
        landmarks: [...(def.landmarks ?? []), ...(def.buildings ?? []).filter(b => b.name).map(b => ({ name: b.name, x: b.x, z: b.z, icon: 'house' })), ...links.map(l => ({ name: l.label.replace(/^To /, '→ '), x: l.x, z: l.z, icon: 'gate' })), ...map.gates.map(g => ({ name: g.label, x: g.x, z: g.z, icon: 'stones' }))],
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
