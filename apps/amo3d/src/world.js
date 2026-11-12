// Outdoor map: a procedural Eldoria glade — noise terrain, lake, mixed forest (oak, birch,
// autumn maple, pine), standing stones, Eldrin's Tower in its vale across the lake (eldrin.js),
// a fenced pen, deer, and a mountain rim.
// Colliders: 'wall' blocks everything, 'hop' blocks walking but a hop clears it
// (the vocabulary of amo's movementRules.hopLanding).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { flat, mulberry32, colliderAt, pushOut, fbm, smoothstep } from './lib.js';
import { valeHeight, valeReserved, valeColor, valeTreeOK, bridgeDeck, inStream, buildEldrin, STAIR_BASE, ELDRIN } from './eldrin.js';
import { createDeer } from './deer.js';
import { createShadows } from './shadow.js';

export const WATER = -1.2;
export const WORLD_R = 98;
const LAKE = { x: -36, z: -28, r: 22 };
const STONES = { x: -16, z: 22, r: 6.5 };
const PEN = { x: 9, z: 8, hw: 5, hd: 4 };

function rawHeight(x, z) {
    const d = Math.hypot(x, z);
    let h = (fbm(x * 0.018 + 10, z * 0.018 + 10) - 0.5) * 14 + 0.6;
    h *= 0.25 + 0.75 * smoothstep(12, 45, d);                                  // gentle meadow at spawn
    h += smoothstep(72, 104, d) * 30 * (0.55 + 0.9 * fbm(x * 0.05, z * 0.05)); // mountain rim
    h -= smoothstep(LAKE.r, LAKE.r * 0.25, Math.hypot(x - LAKE.x, z - LAKE.z)) * 6.5;
    return h;
}
// The road from the start, round the lake's south shore, to the tower stairs.
const ROAD = [[-6, -3], [-26, 2], [-48, -2], [-63, -13], [-67, -27], [STAIR_BASE.x, STAIR_BASE.z]];
function roadDist(x, z) {
    let best = Infinity;
    for (let i = 0; i < ROAD.length - 1; i++) {
        const [ax, az] = ROAD[i], [bx, bz] = ROAD[i + 1];
        const dx = bx - ax, dz = bz - az;
        const k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
        best = Math.min(best, Math.hypot(x - ax - dx * k, z - az - dz * k));
    }
    return best;
}

export function heightAt(x, z) {
    let h = rawHeight(x, z);
    h -= smoothstep(STONES.r + 4, STONES.r - 1, Math.hypot(x - STONES.x, z - STONES.z)) * (h - 0.4);
    h = valeHeight(h, x, z);
    const rd = roadDist(x, z);
    if (rd < 4) h = Math.max(h, h + (WATER + 1.1 - h) * smoothstep(4, 1.6, rd));   // a dry road along the shore
    return h;
}

export function createOutdoor() {
    const scene = new THREE.Scene();
    const rng = mulberry32(1337);
    const colliders = [];
    const animated = [];
    const addCollider = (c, height) => {
        const y0 = heightAt(c.x ?? c.ax, c.z ?? c.az);
        colliders.push({ ...c, y0: y0 - 0.5, y1: y0 + height });
    };
    const near = (x, z, p, r) => Math.hypot(x - p.x, z - p.z) < r;
    // A clear view from the start across the lake to the tower.
    const sight = (x, z) => {
        const tx = ELDRIN.T.x, tz = ELDRIN.T.z, L2 = tx * tx + tz * tz;
        const k = Math.max(0, Math.min(1, (x * tx + z * tz) / L2));
        return k < 0.75 && Math.hypot(x - tx * k, z - tz * k) < 3 + k * 14;
    };
    const reserved = (x, z) =>
        Math.hypot(x, z) < 6 || near(x, z, STONES, STONES.r + 3) || valeReserved(x, z) || roadDist(x, z) < 2.4
        || (Math.abs(x - PEN.x) < PEN.hw + 2 && Math.abs(z - PEN.z) < PEN.hd + 2);

    // ---------- sky, fog, light ----------
    const horizon = new THREE.Color(0xc9d6d4);
    scene.background = horizon;
    scene.fog = new THREE.Fog(horizon, 55, 230);
    const sky = new THREE.Mesh(
        new THREE.SphereGeometry(450, 32, 16),
        new THREE.ShaderMaterial({
            side: THREE.BackSide, depthWrite: false, fog: false,
            uniforms: { top: { value: new THREE.Color(0x3d6ca8) }, bottom: { value: horizon.clone() } },
            vertexShader: `varying vec3 vP; void main(){ vP = normalize(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 vP;
                void main(){ float t = clamp(vP.y * 1.8 + 0.05, 0.0, 1.0);
                gl_FragColor = vec4(mix(bottom, top, pow(t, 0.8)), 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
                }`,
        }),
    );
    sky.renderOrder = -1;
    scene.add(sky);

    const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a3b28, 1.1);
    scene.add(hemi);
    const valeFog = new THREE.Color(0x7f948a);
    let moodK = 0;
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 160 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun, sun.target);
    const SUN_OFFSET = new THREE.Vector3(40, 60, 25);

    // ---------- terrain ----------
    const SIZE = 240, SEG = 200;
    const tGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    tGeo.rotateX(-Math.PI / 2);
    const tp = tGeo.attributes.position;
    const colors = new Float32Array(tp.count * 3);
    const cSand = new THREE.Color(0xbfa874), cGrassA = new THREE.Color(0x4d7a35), cGrassB = new THREE.Color(0x7aa04a),
        cDirt = new THREE.Color(0x6e5a3c), cRock = new THREE.Color(0x77726b), cSnow = new THREE.Color(0xe9eef2),
        cMoss = new THREE.Color(0x3f5a2a);
    const col = new THREE.Color();
    for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i), z = tp.getZ(i);
        const h = heightAt(x, z);
        tp.setY(i, h);
        const n = fbm(x * 0.08, z * 0.08, 3);
        if (h < WATER + 0.35) col.copy(cSand);
        else if (h > 17 + n * 4) col.copy(cSnow);
        else if (h > 6 + n * 3) col.copy(cRock).lerp(cDirt, n * 0.4);
        else col.copy(cGrassA).lerp(cGrassB, n).lerp(cDirt, Math.max(0, fbm(x * 0.03 + 50, z * 0.03, 3) - 0.62) * 2.5);
        const e = 0.6, slope = Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
        if (slope > 0.9 && h > 1) col.lerp(cRock, smoothstep(0.9, 1.6, slope));        // cliffs read as rock
        if (roadDist(x, z) < 1.4) col.lerp(cDirt, 0.8);
        valeColor(x, z, col, cDirt, cMoss);
        colors.set([col.r, col.g, col.b], i * 3);
    }
    tGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    tGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(tGeo, flat(0xffffff, { vertexColors: true }));
    terrain.receiveShadow = true;
    scene.add(terrain);

    const water = new THREE.Mesh(
        new THREE.PlaneGeometry(SIZE, SIZE, 1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x2b6480, transparent: true, opacity: 0.82, roughness: 0.12, metalness: 0.15 }),
    );
    water.position.y = WATER;
    water.receiveShadow = true;
    scene.add(water);

    // ---------- trees ----------
    const G = {
        pineTrunk: new THREE.CylinderGeometry(0.16, 0.26, 2.0, 6).translate(0, 1.0, 0),
        pine: mergeGeometries([
            new THREE.ConeGeometry(1.5, 2.4, 7).translate(0, 2.4, 0),
            new THREE.ConeGeometry(1.15, 2.0, 7).translate(0, 3.5, 0),
            new THREE.ConeGeometry(0.75, 1.7, 7).translate(0, 4.5, 0),
        ]),
        broadTrunk: mergeGeometries([
            new THREE.CylinderGeometry(0.2, 0.34, 2.8, 7).translate(0, 1.4, 0),
            new THREE.CylinderGeometry(0.07, 0.13, 1.5, 5).rotateZ(-0.9).translate(0.55, 2.5, 0),
            new THREE.CylinderGeometry(0.07, 0.12, 1.3, 5).rotateZ(0.8).rotateY(2).translate(0.19, 2.45, 0.42),
            new THREE.CylinderGeometry(0.06, 0.11, 1.2, 5).rotateX(0.85).translate(0, 2.6, 0.45),
        ]),
        broad: mergeGeometries([
            new THREE.IcosahedronGeometry(1.75, 1).translate(0, 3.7, 0),
            new THREE.IcosahedronGeometry(1.25, 1).translate(1.3, 3.2, 0.2),
            new THREE.IcosahedronGeometry(1.2, 1).translate(-1.1, 3.3, 0.6),
            new THREE.IcosahedronGeometry(1.1, 1).translate(0.2, 3.1, -1.2),
            new THREE.IcosahedronGeometry(1.0, 1).translate(0.1, 4.7, 0.2),
        ]),
        birchTrunk: new THREE.CylinderGeometry(0.09, 0.15, 4.4, 6).translate(0, 2.2, 0),
        birch: mergeGeometries([
            new THREE.IcosahedronGeometry(0.95, 0).scale(0.85, 1.35, 0.85).translate(0, 3.7, 0),
            new THREE.IcosahedronGeometry(0.75, 0).scale(0.9, 1.3, 0.9).translate(0.45, 4.5, 0.2),
            new THREE.IcosahedronGeometry(0.75, 0).scale(0.9, 1.2, 0.9).translate(-0.35, 3.0, -0.25),
            new THREE.IcosahedronGeometry(0.6, 0).translate(-0.2, 4.9, -0.1),
        ]),
    };
    const trees = [];
    for (let i = 0; i < 3200 && trees.length < 700; i++) {
        const a = rng() * Math.PI * 2, d = 8 + Math.sqrt(rng()) * 88;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        const h = heightAt(x, z);
        if (h < WATER + 0.5 || h > 14 || reserved(x, z) || sight(x, z) || !valeTreeOK(x, z)) continue;
        if (fbm(x * 0.035 + 7, z * 0.035 - 3, 3) < 0.5 && rng() > 0.07) continue; // forest clusters
        const conifer = rng() < Math.min(0.9, Math.max(0.12, (d - 32) / 45 + (h > 4 ? 0.35 : 0)));
        const r = rng();
        const kind = conifer ? 'pine' : r < 0.55 ? 'oak' : r < 0.85 ? 'birch' : 'maple';
        trees.push({ x, z, h, kind, s: 0.75 + rng() * 0.6, rot: rng() * 6.28, tint: rng() });
    }
    // Eldrin's vale: tall dark pines crowding the cliff top and flanks, a few big oaks in front.
    for (let i = 0; i < 2500 && trees.length < 980; i++) {
        const a = rng() * Math.PI * 2, d = 10 + Math.sqrt(rng()) * 38;
        const x = ELDRIN.T.x + Math.cos(a) * d, z = ELDRIN.T.z + Math.sin(a) * d;
        const h = heightAt(x, z);
        if (h < WATER + 0.6 || reserved(x, z) || Math.hypot(x, z) > 95 || !valeTreeOK(x, z)) continue;
        const e = 0.8, slope = Math.hypot(heightAt(x + e, z) - heightAt(x - e, z), heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e);
        if (slope > 1.3) continue;
        const oak = h < 3 && rng() < 0.3;
        trees.push({ x, z, h, kind: oak ? 'oak' : 'pine', s: oak ? 1.2 + rng() * 0.5 : 1.3 + rng() * 0.9, rot: rng() * 6.28, tint: rng() * 0.6 });
    }
    const groups = {
        pine: { trunk: G.pineTrunk, crown: G.pine, trunkColor: 0x5a3d26, r: 0.3, list: [] },
        broad: { trunk: G.broadTrunk, crown: G.broad, trunkColor: 0x5e4630, r: 0.38, list: [] },
        birch: { trunk: G.birchTrunk, crown: G.birch, trunkColor: 0xe8e4da, r: 0.2, list: [] },
    };
    for (const t of trees) groups[t.kind === 'pine' ? 'pine' : t.kind === 'birch' ? 'birch' : 'broad'].list.push(t);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const Y = new THREE.Vector3(0, 1, 0);
    for (const gname of Object.keys(groups)) {
        const g = groups[gname];
        const trunks = new THREE.InstancedMesh(g.trunk, flat(g.trunkColor), g.list.length);
        const crowns = new THREE.InstancedMesh(g.crown, flat(0xffffff), g.list.length);
        g.list.forEach((t, i) => {
            q.setFromAxisAngle(Y, t.rot);
            m4.compose(v.set(t.x, t.h - 0.1, t.z), q, sc.set(t.s * (gname === 'pine' && t.tint > 0.6 ? 0.8 : 1), t.s, t.s));
            trunks.setMatrixAt(i, m4);
            crowns.setMatrixAt(i, m4);
            if (t.kind === 'pine') col.setHSL(0.33 + t.tint * 0.04, 0.45, 0.2 + t.tint * 0.08);
            else if (t.kind === 'oak') col.setHSL(0.24 + t.tint * 0.07, 0.55, 0.3 + t.tint * 0.1);
            else if (t.kind === 'birch') col.setHSL(0.19 + t.tint * 0.04, 0.6, 0.42 + t.tint * 0.08);
            else col.setHSL(0.02 + t.tint * 0.08, 0.78, 0.42 + t.tint * 0.08);   // autumn maple
            crowns.setColorAt(i, col);
            addCollider({ x: t.x, z: t.z, r: g.r * t.s, kind: 'wall' }, 5.5 * t.s);
        });
        for (const im of [trunks, crowns]) { im.castShadow = im.receiveShadow = true; scene.add(im); }
    }

    // ---------- bushes & flowers ----------
    const bushList = [], flowerList = [];
    for (let i = 0; i < 3000; i++) {
        const x = (rng() - 0.5) * 170, z = (rng() - 0.5) * 170;
        const h = heightAt(x, z);
        if (h < WATER + 0.4 || h > 6 || reserved(x, z)) continue;
        if (bushList.length < 220 && fbm(x * 0.035 + 7, z * 0.035 - 3, 3) > 0.47 && rng() < 0.3) bushList.push({ x, z, h, s: 0.5 + rng() * 0.6 });
        else if (flowerList.length < 900 && Math.hypot(x, z) < 60) flowerList.push({ x, z, h });
    }
    const bushes = new THREE.InstancedMesh(
        mergeGeometries([new THREE.IcosahedronGeometry(0.7, 1).translate(0, 0.45, 0), new THREE.IcosahedronGeometry(0.5, 1).translate(0.5, 0.35, 0.2)]),
        flat(0xffffff), bushList.length);
    bushList.forEach((b, i) => {
        q.setFromAxisAngle(Y, rng() * 6);
        m4.compose(v.set(b.x, b.h, b.z), q, sc.setScalar(b.s));
        bushes.setMatrixAt(i, m4);
        bushes.setColorAt(i, col.setHSL(0.26 + rng() * 0.06, 0.5, 0.25 + rng() * 0.1));
    });
    bushes.castShadow = bushes.receiveShadow = true;
    scene.add(bushes);
    const flowers = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.07, 0).translate(0, 0.22, 0), flat(0xffffff), flowerList.length);
    const petal = [0xf4e27a, 0xffffff, 0xb58ee0, 0xe86a6a, 0x8fc4f0];
    flowerList.forEach((f, i) => {
        m4.compose(v.set(f.x, f.h, f.z), q.identity(), sc.setScalar(0.8 + rng() * 0.8));
        flowers.setMatrixAt(i, m4);
        flowers.setColorAt(i, col.set(petal[Math.floor(rng() * petal.length)]));
    });
    scene.add(flowers);

    // ---------- rocks (small ones are hoppable) ----------
    const rockList = [];
    for (let i = 0; i < 800 && rockList.length < 110; i++) {
        const x = (rng() - 0.5) * 190, z = (rng() - 0.5) * 190;
        const h = heightAt(x, z);
        if (Math.hypot(x, z) > 92 || reserved(x, z) || h < WATER - 0.3) continue;
        const s = rng() < 0.6 ? 0.25 + rng() * 0.3 : 0.7 + rng() * 1.0;
        rockList.push({ x, z, h, s });
    }
    const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), flat(0xffffff), rockList.length);
    rockList.forEach((r, i) => {
        q.setFromEuler(new THREE.Euler(rng(), rng() * 6, rng()));
        m4.compose(v.set(r.x, r.h + r.s * 0.25, r.z), q, sc.set(r.s * 1.2, r.s * 0.8, r.s));
        rocks.setMatrixAt(i, m4);
        rocks.setColorAt(i, col.setHSL(0.08, 0.05, 0.38 + rng() * 0.15));
        addCollider({ x: r.x, z: r.z, r: r.s * 1.0, kind: r.s < 0.6 ? 'hop' : 'wall' }, r.s * 1.1);
    });
    rocks.castShadow = rocks.receiveShadow = true;
    scene.add(rocks);

    // ---------- grass tufts ----------
    const tufts = [];
    for (let i = 0; i < 9000 && tufts.length < 5000; i++) {
        const x = (rng() - 0.5) * 150, z = (rng() - 0.5) * 150;
        const h = heightAt(x, z);
        if (h < WATER + 0.4 || h > 6 || valeReserved(x, z, -1)) continue;
        tufts.push({ x, z, h });
    }
    const grass = new THREE.InstancedMesh(
        new THREE.ConeGeometry(0.06, 0.32, 3).translate(0, 0.14, 0), flat(0xffffff), tufts.length);
    tufts.forEach((g, i) => {
        q.setFromEuler(new THREE.Euler((rng() - 0.5) * 0.5, rng() * 6, (rng() - 0.5) * 0.5));
        m4.compose(v.set(g.x, g.h, g.z), q, sc.setScalar(0.7 + rng() * 0.9));
        grass.setMatrixAt(i, m4);
        grass.setColorAt(i, col.setHSL(0.24 + rng() * 0.07, 0.5, 0.3 + rng() * 0.15));
    });
    grass.receiveShadow = true;
    scene.add(grass);

    // ---------- the standing stones ----------
    const stoneMat = flat(0x6f6c68);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = STONES.x + Math.cos(a) * STONES.r, z = STONES.z + Math.sin(a) * STONES.r;
        const hgt = 2.4 + rng() * 1.3;
        const st = new THREE.Mesh(new THREE.BoxGeometry(1.0, hgt, 0.55, 1, 2, 1), stoneMat);
        st.position.set(x, heightAt(x, z) + hgt / 2 - 0.25, z);
        st.rotation.set((rng() - 0.5) * 0.15, -a + Math.PI / 2, (rng() - 0.5) * 0.15);
        st.castShadow = st.receiveShadow = true;
        scene.add(st);
        addCollider({ x, z, r: 0.6, kind: 'wall' }, hgt);
    }
    const altarY = heightAt(STONES.x, STONES.z);
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.6, 7), stoneMat);
    altar.position.set(STONES.x, altarY + 0.3, STONES.z);
    altar.castShadow = altar.receiveShadow = true;
    scene.add(altar);
    addCollider({ x: STONES.x, z: STONES.z, r: 1.05, kind: 'wall' }, 0.8);
    const shard = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.45),
        new THREE.MeshStandardMaterial({ color: 0x9ff7ee, emissive: 0x2fd6c8, emissiveIntensity: 2.5, flatShading: true }),
    );
    shard.scale.y = 1.7;
    scene.add(shard);
    const glow = new THREE.PointLight(0x48f0e0, 25, 16, 1.6);
    glow.position.set(STONES.x, altarY + 2.2, STONES.z);
    scene.add(glow);
    animated.push(t => {
        shard.position.set(STONES.x, altarY + 1.9 + Math.sin(t * 1.3) * 0.15, STONES.z);
        shard.rotation.y = t * 0.7;
        glow.intensity = 22 + Math.sin(t * 2.3) * 5;
    });
    const MOTES = 160;
    const moteSeed = Array.from({ length: MOTES }, () => [rng() * 6.28, Math.sqrt(rng()) * (STONES.r - 0.5), rng() * 3, rng()]);
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    scene.add(new THREE.Points(moteGeo, new THREE.PointsMaterial({
        color: 0x8ffff2, size: 0.12, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
    })));
    animated.push(t => {
        const p = moteGeo.attributes.position.array;
        moteSeed.forEach(([a, r, y0, sp], i) => {
            const ang = a + t * (0.1 + sp * 0.2);
            p[i * 3] = STONES.x + Math.cos(ang) * r;
            p[i * 3 + 1] = altarY + 0.3 + ((y0 + t * (0.2 + sp * 0.3)) % 3.5);
            p[i * 3 + 2] = STONES.z + Math.sin(ang) * r;
        });
        moteGeo.attributes.position.needsUpdate = true;
    });

    // ---------- Eldrin's Tower and its vale ----------
    const eldrin = buildEldrin({ scene, heightAt, addCollider, rng });

    // ---------- fenced pen (hoppable) + fallen logs ----------
    const woodMat = flat(0x7a5634);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [PEN.x + sx * PEN.hw, PEN.z + sz * PEN.hd]);
    const posts = [];
    for (let k = 0; k < 4; k++) {
        const [x0, z0] = corners[k], [x1, z1] = corners[(k + 1) % 4];
        const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.25);
        for (let j = 0; j < n; j++) posts.push([x0 + (x1 - x0) * j / n, z0 + (z1 - z0) * j / n, k]);
    }
    const gate = ([x, , k]) => k === 0 && Math.abs(x - PEN.x) < 1;
    posts.forEach((p, i) => {
        const [x, z] = p;
        const y = heightAt(x, z);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), woodMat);
        post.position.set(x, y + 0.5, z);
        post.castShadow = true;
        scene.add(post);
        addCollider({ x, z, r: 0.2, kind: 'hop' }, 1.1);
        const next = posts[(i + 1) % posts.length];
        if (gate(p) || gate(next)) return;
        const [nx, nz] = next, ny = heightAt(nx, nz);
        const len = Math.hypot(nx - x, nz - z);
        for (const hRail of [0.45, 0.85]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, len), woodMat);
            rail.position.set((x + nx) / 2, (y + ny) / 2 + hRail, (z + nz) / 2);
            rail.rotation.y = Math.atan2(nx - x, nz - z);
            rail.castShadow = true;
            scene.add(rail);
        }
        addCollider({ x: (x + nx) / 2, z: (z + nz) / 2, r: 0.3, kind: 'hop' }, 1.1);
    });
    for (const [x, z, a, len] of [[-6, -9, 0.4, 4], [14, -6, 1.9, 3.5], [-4, 12, 2.6, 3]]) {
        const y = heightAt(x, z);
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, len, 8), woodMat);
        log.position.set(x, y + 0.25, z);
        log.rotation.set(0, a, Math.PI / 2);
        log.castShadow = log.receiveShadow = true;
        scene.add(log);
        const dx = Math.cos(a), dz = -Math.sin(a);
        for (let s = -len / 2; s <= len / 2; s += 0.5) addCollider({ x: x + dx * s, z: z + dz * s, r: 0.35, kind: 'hop' }, 0.6);
    }

    // ---------- deer ----------
    const map = {
        name: 'Thaloria Glade', scene, heightAt, terrain: true, colliders,
        camera: { maxDist: 22, pitch: 0.38, dist: 8 },
        groundAt(x, z) {
            const g = heightAt(x, z), deck = bridgeDeck(x, z, heightAt);
            return deck !== null && deck > g ? deck : g;
        },
        wading: (x, z) => heightAt(x, z) < WATER - 0.05 || inStream(x, z),
        blockedAt(x, z, r, y = heightAt(x, z)) {
            const c = colliderAt(colliders, x, z, r, y);
            if (c) return c.kind;
            if (heightAt(x, z) < WATER - 0.7 || Math.hypot(x, z) > WORLD_R) return 'wall';
            return null;
        },
        resolve: (pos, r) => pushOut(colliders, pos, r),
        projectileHit(p) {
            if (p.y < heightAt(p.x, p.z) + 0.05) return 'ground';
            const c = colliderAt(colliders, p.x, p.z, 0.15, p.y);
            return c && p.y >= c.y0 + 0.5 ? 'object' : null;
        },
        groundNormal(x, z) {
            const e = 0.3;
            return new THREE.Vector3(heightAt(x - e, z) - heightAt(x + e, z), 2 * e, heightAt(x, z - e) - heightAt(x, z + e)).normalize();
        },
        triggers: [{ x: eldrin.doorOut.x, z: eldrin.doorOut.z, r: 1.0, label: "Eldrin's Tower", to: 'tower', spawn: 'door' }],
        spawns: {
            start: { x: 0, z: 0, facing: Math.atan2(ELDRIN.T.x, ELDRIN.T.z) },   // looking across the lake at the tower
            door: { x: eldrin.spawnOut.x, z: eldrin.spawnOut.z, facing: eldrin.facingOut },
        },
        hittables: [],
        update(t, dt, ctx) {
            for (const fn of animated) fn(t);
            for (const d of map.hittables) d.update(dt, ctx);
            // The vale has its own mood: dimmer sun, closer greener mist, shafts of light, fireflies.
            const mk = eldrin.mood(ctx.player.pos.x, ctx.player.pos.z);
            moodK += (mk - moodK) * Math.min(1, dt * 1.5);
            sun.intensity = 2.8 - 1.3 * moodK;
            hemi.intensity = 1.1 - 0.45 * moodK;
            scene.fog.color.copy(horizon).lerp(valeFog, moodK);
            scene.fog.near = 55 - 37 * moodK;
            scene.fog.far = 230 - 105 * moodK;
            sky.material.uniforms.bottom.value.copy(scene.fog.color);
            eldrin.update(t, dt, moodK);
            shadows.update(dt);
            sun.position.copy(ctx.player.pos).add(SUN_OFFSET);
            sun.target.position.copy(ctx.player.pos);
            sky.position.copy(ctx.camera.position);
        },
    };

    // Deer homes: open spots at the edge of broadleaf groves, not too far from the start.
    const homes = [];
    const broad = trees.filter(t => t.kind !== 'pine');
    for (let i = 0; i < 400 && homes.length < 3; i++) {
        const t = broad[Math.floor(rng() * broad.length)];
        const d = Math.hypot(t.x, t.z);
        if (d < 16 || d > 42) continue;
        const x = t.x + (rng() - 0.5) * 6, z = t.z + (rng() - 0.5) * 6;
        if (map.blockedAt(x, z, 1.2) || reserved(x, z) || homes.some(h => Math.hypot(h.x - x, h.z - z) < 14)) continue;
        homes.push({ x, z });
    }
    homes.forEach((home, i) => {
        const deer = createDeer({ home, stag: i === 0, rng, map });
        scene.add(deer.root);
        map.hittables.push(deer);
    });

    // ---------- shadow soldiers ----------
    // Posts: on the road ahead of the start, at the standing stones, and on the shore road to the tower.
    const shadows = createShadows({ scene, map, rng, posts: [{ x: -16, z: 3 }, { x: -14, z: 14.5 }, { x: -64, z: -16 }] });
    map.hittables.push(...shadows.list);
    map.shadows = shadows;

    return map;
}
