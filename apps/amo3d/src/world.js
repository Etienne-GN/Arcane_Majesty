// A small procedural Eldoria glade: noise terrain, a lake, forest clusters,
// a ring of standing stones, a ruined tower, a fenced pen and a mountain rim.
// Colliders are circles: 'wall' blocks everything, 'hop' blocks walking but a hop clears it
// (the same vocabulary as amo's movementRules.hopLanding).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const WATER = -1.2;
export const WORLD_R = 98;
const LAKE = { x: -36, z: -28, r: 22 };
const STONES = { x: -16, z: 22, r: 6.5 };
const TOWER = { x: 30, z: -20, r: 3.3 };
const PEN = { x: 9, z: 8, hw: 5, hd: 4 };

// ---------- noise ----------
function hash(ix, iz) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iz, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
}
const smooth = t => t * t * (3 - 2 * t);
function vnoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const u = smooth(x - ix), v = smooth(z - iz);
    const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, z, oct = 5) {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, z * f); norm += amp; f *= 2; amp *= 0.5; }
    return s / norm;
}
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function heightAt(x, z) {
    const d = Math.hypot(x, z);
    let h = (fbm(x * 0.018 + 10, z * 0.018 + 10) - 0.5) * 14 + 0.6;
    h *= 0.25 + 0.75 * smoothstep(12, 45, d);                              // gentle meadow at spawn
    h += smoothstep(72, 104, d) * 30 * (0.55 + 0.9 * fbm(x * 0.05, z * 0.05)); // mountain rim
    h -= smoothstep(LAKE.r, LAKE.r * 0.25, Math.hypot(x - LAKE.x, z - LAKE.z)) * 6.5;
    h -= smoothstep(STONES.r + 4, STONES.r - 1, Math.hypot(x - STONES.x, z - STONES.z)) * (h - 0.4); // level the circle
    return h;
}

function mulberry32(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const flat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });

export function createWorld(scene) {
    const rng = mulberry32(1337);
    const colliders = [];
    const animated = [];
    const near = (x, z, p, r) => Math.hypot(x - p.x, z - p.z) < r;
    const reserved = (x, z) =>
        Math.hypot(x, z) < 6 || near(x, z, STONES, STONES.r + 3) || near(x, z, TOWER, TOWER.r + 3)
        || (Math.abs(x - PEN.x) < PEN.hw + 2 && Math.abs(z - PEN.z) < PEN.hd + 2);

    // ---------- sky, fog, light ----------
    const horizon = new THREE.Color(0xc9d6d4);
    scene.fog = new THREE.Fog(horizon, 55, 230);
    const sky = new THREE.Mesh(
        new THREE.SphereGeometry(450, 32, 16),
        new THREE.ShaderMaterial({
            side: THREE.BackSide, depthWrite: false, fog: false,
            uniforms: { top: { value: new THREE.Color(0x3d6ca8) }, bottom: { value: horizon } },
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

    scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x4a3b28, 1.1));
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
        cDirt = new THREE.Color(0x6e5a3c), cRock = new THREE.Color(0x77726b), cSnow = new THREE.Color(0xe9eef2);
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
    const trunkGeo = new THREE.CylinderGeometry(0.16, 0.26, 2.0, 6).translate(0, 1.0, 0);
    const pineGeo = mergeGeometries([
        new THREE.ConeGeometry(1.5, 2.4, 7).translate(0, 2.4, 0),
        new THREE.ConeGeometry(1.15, 2.0, 7).translate(0, 3.5, 0),
        new THREE.ConeGeometry(0.75, 1.7, 7).translate(0, 4.5, 0),
    ]);
    const oakGeo = mergeGeometries([
        new THREE.IcosahedronGeometry(1.7, 0).translate(0, 3.1, 0),
        new THREE.IcosahedronGeometry(1.2, 0).translate(0.9, 2.6, 0.5),
        new THREE.IcosahedronGeometry(1.1, 0).translate(-0.8, 2.8, -0.4),
    ]);
    const trees = [];
    for (let i = 0; i < 2600 && trees.length < 650; i++) {
        const a = rng() * Math.PI * 2, d = 8 + Math.sqrt(rng()) * 88;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        const h = heightAt(x, z);
        if (h < WATER + 0.5 || h > 14 || reserved(x, z)) continue;
        if (fbm(x * 0.035 + 7, z * 0.035 - 3, 3) < 0.5 && rng() > 0.06) continue; // forest clusters
        trees.push({ x, z, h, s: 0.75 + rng() * 0.65, pine: rng() < (h > 4 ? 0.85 : 0.5), rot: rng() * 6.28, tint: rng() });
    }
    const trunks = new THREE.InstancedMesh(trunkGeo, flat(0x5a3d26), trees.length);
    const pines = new THREE.InstancedMesh(pineGeo, flat(0xffffff), trees.filter(t => t.pine).length);
    const oaks = new THREE.InstancedMesh(oakGeo, flat(0xffffff), trees.filter(t => !t.pine).length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    let ip = 0, io = 0;
    trees.forEach((t, i) => {
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.rot);
        m4.compose(v.set(t.x, t.h - 0.1, t.z), q, sc.setScalar(t.s));
        trunks.setMatrixAt(i, m4);
        if (t.pine) {
            pines.setMatrixAt(ip, m4);
            pines.setColorAt(ip++, col.setHSL(0.33 + t.tint * 0.04, 0.45, 0.2 + t.tint * 0.08));
        } else {
            oaks.setMatrixAt(io, m4);
            oaks.setColorAt(io++, col.setHSL(0.22 + t.tint * 0.08, 0.5, 0.28 + t.tint * 0.1));
        }
        colliders.push({ x: t.x, z: t.z, r: 0.3 * t.s, kind: 'wall' });
    });
    for (const im of [trunks, pines, oaks]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }

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
        colliders.push({ x: r.x, z: r.z, r: r.s * 1.0, kind: r.s < 0.6 ? 'hop' : 'wall' });
    });
    rocks.castShadow = rocks.receiveShadow = true;
    scene.add(rocks);

    // ---------- grass tufts ----------
    const tufts = [];
    for (let i = 0; i < 9000 && tufts.length < 5000; i++) {
        const x = (rng() - 0.5) * 150, z = (rng() - 0.5) * 150;
        const h = heightAt(x, z);
        if (h < WATER + 0.4 || h > 6) continue;
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
        colliders.push({ x, z, r: 0.6, kind: 'wall' });
    }
    const altarY = heightAt(STONES.x, STONES.z);
    const altar = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.6, 7), stoneMat);
    altar.position.set(STONES.x, altarY + 0.3, STONES.z);
    altar.castShadow = altar.receiveShadow = true;
    scene.add(altar);
    colliders.push({ x: STONES.x, z: STONES.z, r: 1.05, kind: 'wall' });
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

    // Aether motes drifting inside the ring.
    const MOTES = 160;
    const moteSeed = Array.from({ length: MOTES }, () => [rng() * 6.28, Math.sqrt(rng()) * (STONES.r - 0.5), rng() * 3, rng()]);
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
        color: 0x8ffff2, size: 0.12, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    scene.add(motes);
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

    // ---------- ruined tower ----------
    const tBase = heightAt(TOWER.x, TOWER.z) - 1;
    const towerMat = flat(0x8b8478);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(TOWER.r * 0.9, TOWER.r, 8, 12), towerMat);
    tower.position.set(TOWER.x, tBase + 4, TOWER.z);
    tower.castShadow = tower.receiveShadow = true;
    scene.add(tower);
    for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2, hh = 0.4 + rng() * 2.4;
        if (rng() < 0.25) continue; // broken gaps in the crown
        const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, hh, 0.7), towerMat);
        b.position.set(TOWER.x + Math.cos(a) * TOWER.r * 0.82, tBase + 8 + hh / 2, TOWER.z + Math.sin(a) * TOWER.r * 0.82);
        b.rotation.y = -a + Math.PI / 2;
        b.castShadow = true;
        scene.add(b);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.2, 0.4), flat(0x1c1612));
    const doorA = Math.atan2(-TOWER.z, -TOWER.x); // facing the spawn
    door.position.set(TOWER.x + Math.cos(doorA) * TOWER.r * 0.97, tBase + 2.1, TOWER.z + Math.sin(doorA) * TOWER.r * 0.97);
    door.rotation.y = -doorA + Math.PI / 2;
    scene.add(door);
    colliders.push({ x: TOWER.x, z: TOWER.z, r: TOWER.r + 0.1, kind: 'wall' });
    for (let i = 0; i < 12; i++) { // rubble
        const a = rng() * 6.28, d = TOWER.r + 0.6 + rng() * 3;
        const x = TOWER.x + Math.cos(a) * d, z = TOWER.z + Math.sin(a) * d, s = 0.25 + rng() * 0.3;
        const r = new THREE.Mesh(new THREE.BoxGeometry(s * 2, s, s * 1.4), towerMat);
        r.position.set(x, heightAt(x, z) + s * 0.3, z);
        r.rotation.set(rng(), rng() * 6, rng());
        r.castShadow = true;
        scene.add(r);
        colliders.push({ x, z, r: s, kind: 'hop' });
    }

    // ---------- fenced pen (hoppable) + fallen logs ----------
    const woodMat = flat(0x7a5634);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => [PEN.x + sx * PEN.hw, PEN.z + sz * PEN.hd]);
    const posts = [];
    for (let k = 0; k < 4; k++) {
        const [x0, z0] = corners[k], [x1, z1] = corners[(k + 1) % 4];
        const n = Math.round(Math.hypot(x1 - x0, z1 - z0) / 1.25);
        for (let j = 0; j < n; j++) posts.push([x0 + (x1 - x0) * j / n, z0 + (z1 - z0) * j / n, k]);
    }
    const gate = ([x, z, k]) => k === 0 && Math.abs(x - PEN.x) < 1; // opening on the -z side
    posts.forEach((p, i) => {
        const [x, z] = p;
        const y = heightAt(x, z);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.14), woodMat);
        post.position.set(x, y + 0.5, z);
        post.castShadow = true;
        scene.add(post);
        colliders.push({ x, z, r: 0.2, kind: 'hop' });
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
        colliders.push({ x: (x + nx) / 2, z: (z + nz) / 2, r: 0.3, kind: 'hop' });
    });
    for (const [x, z, a, len] of [[-6, -9, 0.4, 4], [14, -6, 1.9, 3.5], [-4, 12, 2.6, 3]]) {
        const y = heightAt(x, z);
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, len, 8), woodMat);
        log.position.set(x, y + 0.25, z);
        log.rotation.set(0, a, Math.PI / 2);
        log.castShadow = log.receiveShadow = true;
        scene.add(log);
        const dx = Math.cos(a), dz = -Math.sin(a);
        for (let s = -len / 2; s <= len / 2; s += 0.5) colliders.push({ x: x + dx * s, z: z + dz * s, r: 0.35, kind: 'hop' });
    }

    // ---------- queries ----------
    function blockedAt(x, z, radius) {
        for (const c of colliders) {
            const rr = c.r + radius, dx = x - c.x, dz = z - c.z;
            if (dx * dx + dz * dz < rr * rr) return c.kind;
        }
        if (heightAt(x, z) < WATER - 0.7 || Math.hypot(x, z) > WORLD_R) return 'wall';
        return null;
    }

    // Push a circle out of every collider it overlaps (walking: 'hop' blocks too).
    function resolve(pos, radius) {
        for (const c of colliders) {
            const rr = c.r + radius, dx = pos.x - c.x, dz = pos.z - c.z, d2 = dx * dx + dz * dz;
            if (d2 >= rr * rr || d2 < 1e-8) continue;
            const d = Math.sqrt(d2);
            pos.x = c.x + (dx / d) * rr;
            pos.z = c.z + (dz / d) * rr;
        }
    }

    function update(t, focus, camera) {
        for (const fn of animated) fn(t);
        sun.position.copy(focus).add(SUN_OFFSET);
        sun.target.position.copy(focus);
        sky.position.copy(camera.position);
    }

    return { colliders, blockedAt, resolve, update };
}
