// Shared helpers: materials, rng, procedural textures, colliders, particles.
import * as THREE from 'three';

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
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };


export const flat = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });

export function mulberry32(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function shadows(obj, cast = true, receive = true) {
    obj.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } });
    return obj;
}

// Radial gradient drawn on a canvas — glow sprites and scorch marks, no image files.
export function radialTexture(stops, size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// Give every face of a geometry its own shade — reads as stone blocks / planks.
export function faceShade(geo, colors, rng, groupSize = 2) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    const col = new THREE.Color();
    for (let f = 0; f < n / 3; f++) {
        if (f % groupSize === 0) col.set(colors[Math.floor(rng() * colors.length)]).multiplyScalar(0.88 + rng() * 0.24);
        for (let v = 0; v < 3; v++) arr.set([col.r, col.g, col.b], (f * 3 + v) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    g.computeVertexNormals();
    return g;
}

// ---------- colliders ----------
// Circle {x,z,r} or segment {ax,az,bx,bz,r}; kind 'wall' | 'hop'; vertical span [y0, y1].
function overlap(c, x, z, r) {
    if (c.ax !== undefined) {
        const dx = c.bx - c.ax, dz = c.bz - c.az;
        const t = Math.max(0, Math.min(1, ((x - c.ax) * dx + (z - c.az) * dz) / (dx * dx + dz * dz)));
        const px = c.ax + dx * t, pz = c.az + dz * t;
        const ox = x - px, oz = z - pz, d2 = ox * ox + oz * oz, rr = c.r + r;
        return d2 < rr * rr ? { ox, oz, d: Math.sqrt(d2), rr } : null;
    }
    const ox = x - c.x, oz = z - c.z, d2 = ox * ox + oz * oz, rr = c.r + r;
    return d2 < rr * rr ? { ox, oz, d: Math.sqrt(d2), rr } : null;
}
const spans = (c, y) => y >= c.y0 - 0.3 && y <= c.y1;

export function colliderAt(colliders, x, z, r, y) {
    for (const c of colliders) if (spans(c, y) && overlap(c, x, z, r)) return c;
    return null;
}

export function pushOut(colliders, pos, r) {
    for (const c of colliders) {
        if (!spans(c, pos.y)) continue;
        const o = overlap(c, pos.x, pos.z, r);
        if (!o || o.d < 1e-6) continue;
        pos.x += (o.ox / o.d) * (o.rr - o.d);
        pos.z += (o.oz / o.d) * (o.rr - o.d);
    }
}

// ---------- particles ----------
// One draw call per system; per-particle size, colour and alpha; additive or normal blending.
export class Particles {
    constructor(max, { additive = true } = {}) {
        this.max = max;
        this.list = [];
        const geo = new THREE.BufferGeometry();
        this.pos = new Float32Array(max * 3);
        this.size = new Float32Array(max);
        this.color = new Float32Array(max * 4);
        geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
        geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
        geo.setAttribute('aColor', new THREE.BufferAttribute(this.color, 4));
        this.geo = geo;
        this.points = new THREE.Points(geo, new THREE.ShaderMaterial({
            transparent: true, depthWrite: false,
            blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
            uniforms: { uViewH: { value: innerHeight } },
            vertexShader: `attribute float aSize; attribute vec4 aColor; varying vec4 vColor; uniform float uViewH;
                void main(){ vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * projectionMatrix[1][1] * uViewH * 0.5 / -mv.z;
                gl_Position = projectionMatrix * mv; }`,
            fragmentShader: `varying vec4 vColor;
                void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, d);
                gl_FragColor = vec4(vColor.rgb, vColor.a * a); }`,
        }));
        this.points.frustumCulled = false;
        this.points.renderOrder = 5;
    }

    // p: {x,y,z, vx,vy,vz, life, size:[a,b], c0:[r,g,b,a], c1:[r,g,b,a], grav, drag}
    emit(p) {
        if (this.list.length >= this.max) this.list.shift();
        p.age = 0;
        this.list.push(p);
    }

    update(dt) {
        this.points.material.uniforms.uViewH.value = innerHeight;
        let n = 0;
        this.list = this.list.filter(p => (p.age += dt) < p.life);
        for (const p of this.list) {
            const k = p.age / p.life;
            p.vy -= (p.grav ?? 0) * dt;
            const drag = Math.exp(-(p.drag ?? 0) * dt);
            p.vx *= drag; p.vy *= drag; p.vz *= drag;
            p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
            this.pos.set([p.x, p.y, p.z], n * 3);
            this.size[n] = p.size[0] + (p.size[1] - p.size[0]) * k;
            for (let i = 0; i < 4; i++) this.color[n * 4 + i] = p.c0[i] + (p.c1[i] - p.c0[i]) * k;
            n++;
        }
        this.geo.setDrawRange(0, n);
        for (const a of ['position', 'aSize', 'aColor']) this.geo.attributes[a].needsUpdate = true;
    }
}
