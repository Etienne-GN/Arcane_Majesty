// Village buildings and props for region files (engine/region.js `buildings` and `props`), built in code in the
// game's low-poly style: stone or plaster houses with timber framing, gable or hip roofs, a door, shuttered
// windows, a chimney, an optional hanging sign; and the furniture of a village street — market stalls, a well,
// lamp posts, fences, carts, barrels, crates, benches, signposts. Each returns a group whose footprint centre is
// at its origin (y = 0 is the ground), facing +z (its door side).
import * as THREE from 'three';

const M = {};
const mat = (c, o = {}) => (M[`${c}${JSON.stringify(o)}`] ??= new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o }));
function box(g, w, h, d, c, x = 0, y = 0, z = 0, ry = 0, o) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' || typeof c === 'string' ? mat(c, o) : c);
    m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; g.add(m); return m;
}
function prism(w, h, d) {   // a gable roof: triangular section along x
    const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(0, h); s.lineTo(d / 2, 0); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false }); geo.translate(0, 0, -w / 2); geo.rotateY(Math.PI / 2);
    return geo;
}

// A house: w × d footprint, h wall height. wall/roof/timber colours; roof 'gable' | 'hip'; stone: a stone ground floor.
export function buildHouse({ w = 6, d = 5, h = 3.2, wall = 0xd8ccb0, roof = 0x8a3a2a, timber = 0x4a3220, stone = false, roofType = 'gable', sign = null, chimney = true, seed = 1 } = {}) {
    const g = new THREE.Group();
    box(g, w, h, d, stone ? 0x8a867e : wall, 0, h / 2, 0);
    if (stone) box(g, w + 0.06, 1.2, d + 0.06, 0x77736c, 0, 0.6, 0);
    else box(g, w + 0.08, 0.45, d + 0.08, 0x6a665e, 0, 0.22, 0);                        // stone footing
    if (!stone) {   // timber framing: corner posts, a beam under the eaves, a few braces
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.18, h, 0.18, timber, sx * (w / 2), h / 2, sz * (d / 2));
        for (const sz of [-1, 1]) box(g, w + 0.1, 0.16, 0.12, timber, 0, h - 0.08, sz * (d / 2 + 0.02));
        for (let i = 1; i < Math.round(w / 2); i++) box(g, 0.12, h - 0.4, 0.06, timber, -w / 2 + i * (w / Math.round(w / 2)), h / 2, d / 2 + 0.04);
    }
    // roof
    const rh = Math.min(w, d) * 0.45;
    if (roofType === 'hip') {
        const r = new THREE.Mesh(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.3, rh, 4, 1), mat(roof));
        r.rotation.y = Math.PI / 4; r.scale.set(w / Math.hypot(w, d) * 1.42, 1, d / Math.hypot(w, d) * 1.42); r.position.y = h + rh / 2; r.castShadow = true; g.add(r);
    } else {
        const r = new THREE.Mesh(prism(w + 0.6, rh, d + 0.6), mat(roof)); r.position.y = h; r.castShadow = true; g.add(r);
        for (const sx of [-1, 1]) { const gab = new THREE.Mesh(prism(0.05, rh - 0.05, d), mat(stone ? 0x8a867e : wall)); gab.position.set(sx * (w / 2 - 0.02), h, 0); g.add(gab); }
    }
    if (chimney) box(g, 0.6, rh + 0.8, 0.6, 0x6a5a4a, w * 0.28, h + rh / 2 + 0.3, -d * 0.18);
    // door, step, windows with shutters
    box(g, 1.0, 1.9, 0.12, 0x4a2e1a, 0, 0.95, d / 2 + 0.03);
    box(g, 1.3, 0.12, 0.5, 0x6a665e, 0, 0.06, d / 2 + 0.28);
    const winX = [-w * 0.3, w * 0.3];
    for (const x of winX) {
        box(g, 0.75, 0.75, 0.08, 0xffd890, x, h * 0.55, d / 2 + 0.04, 0, { emissive: 0x3a2a10, emissiveIntensity: 0.6 });
        for (const sx of [-1, 1]) box(g, 0.35, 0.8, 0.05, 0x3a5a3a, x + sx * 0.58, h * 0.55, d / 2 + 0.07);
    }
    for (const sx of [-1, 1]) box(g, 0.08, 0.7, 0.7, 0xffd890, sx * (w / 2 + 0.03), h * 0.55, 0, 0, { emissive: 0x3a2a10, emissiveIntensity: 0.6 });
    if (sign) {   // a hanging sign on an iron bracket beside the door
        box(g, 0.08, 0.08, 0.9, 0x2a2420, 0.95, 2.5, d / 2 + 0.45);
        const s = box(g, 0.9, 0.55, 0.06, 0x8a5a2a, 0.95, 2.1, d / 2 + 0.78);
        s.userData.sign = sign;
    }
    void seed;
    return g;
}

export function buildProp(type, { len = 4, color = 0x8a3a2a } = {}) {
    const g = new THREE.Group(), wood = 0x6b4a2b, dark = 0x3a2a1a;
    switch (type) {
        case 'stall':   // a market stall: counter, four posts, a striped awning
            box(g, 2.4, 0.9, 1.0, wood, 0, 0.45, 0);
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.1, 2.2, 0.1, dark, sx * 1.15, 1.1, sz * 0.45);
            for (let i = 0; i < 4; i++) box(g, 0.62, 0.06, 1.4, i % 2 ? 0xeee0c0 : color, -0.93 + i * 0.62, 2.25, 0.1, 0);
            for (let i = 0; i < 5; i++) box(g, 0.25, 0.2, 0.25, [0xc85a3a, 0xd8a83a, 0x6a9a3a, 0xa83a5a, 0xd8d0b0][i], -0.8 + i * 0.4, 1.0, 0);   // wares
            break;
        case 'well': {
            const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.95, 0.8, 10, 1, true), mat(0x8a867e, { side: THREE.DoubleSide })); ring.position.y = 0.4; ring.castShadow = true; g.add(ring);
            const water = new THREE.Mesh(new THREE.CircleGeometry(0.85, 10), mat(0x24485a, { roughness: 0.2 })); water.rotation.x = -Math.PI / 2; water.position.y = 0.3; g.add(water);
            for (const sx of [-1, 1]) box(g, 0.12, 1.9, 0.12, dark, sx * 0.8, 1.1, 0);
            box(g, 1.9, 0.12, 0.12, dark, 0, 2.05, 0);
            const roof = new THREE.Mesh(prism(2.1, 0.7, 1.4), mat(0x8a3a2a)); roof.position.y = 2.1; g.add(roof);
            break;
        }
        case 'lamp': box(g, 0.12, 3, 0.12, 0x2a2420, 0, 1.5, 0); box(g, 0.5, 0.08, 0.08, 0x2a2420, 0.2, 2.9, 0);
            box(g, 0.26, 0.34, 0.26, 0xffd890, 0.42, 2.7, 0, 0, { emissive: 0xffb860, emissiveIntensity: 1.2 }); g.userData.light = { y: 2.7, x: 0.42 }; break;
        case 'fence': { const n = Math.max(2, Math.round(len / 1.2));
            for (let i = 0; i <= n; i++) box(g, 0.12, 1.0, 0.12, wood, -len / 2 + (i / n) * len, 0.5, 0);
            for (const y of [0.4, 0.8]) box(g, len, 0.08, 0.06, wood, 0, y, 0); break; }
        case 'cart': box(g, 2.0, 0.5, 1.2, wood, 0, 0.75, 0); for (const sz of [-1, 1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 10), mat(dark)); w.rotation.x = Math.PI / 2; w.position.set(-0.3, 0.45, sz * 0.66); g.add(w); }
            box(g, 1.4, 0.06, 0.06, wood, 1.6, 0.6, 0.3); box(g, 1.4, 0.06, 0.06, wood, 1.6, 0.6, -0.3); break;
        case 'barrel': { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.9, 9), mat(wood)); b.position.y = 0.45; b.castShadow = true; g.add(b);
            for (const y of [0.2, 0.7]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.025, 4, 12), mat(0x3a3430)); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); } break; }
        case 'crate': box(g, 0.8, 0.8, 0.8, 0x8a6a3a, 0, 0.4, 0); box(g, 0.82, 0.1, 0.82, dark, 0, 0.75, 0); break;
        case 'bench': box(g, 1.6, 0.08, 0.45, wood, 0, 0.45, 0); for (const sx of [-1, 1]) box(g, 0.08, 0.45, 0.4, dark, sx * 0.7, 0.22, 0); break;
        case 'signpost': box(g, 0.14, 2.4, 0.14, wood, 0, 1.2, 0); for (const [y, r] of [[2.0, 0.4], [1.6, -0.6], [1.25, 1.6]]) box(g, 1.1, 0.24, 0.05, 0x8a6a3a, 0.4 * Math.cos(r), y, 0.4 * Math.sin(r), r); break;
        // ---- ruins (old pale stone, weathered) ----
        case 'column': { const h = len > 0 && len !== 4 ? len : 4.5, stone = 0xb8b2a4;
            box(g, 0.9, 0.3, 0.9, stone, 0, 0.15, 0);
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, h, 8), mat(stone)); shaft.position.y = 0.3 + h / 2; shaft.castShadow = true; g.add(shaft);
            if (!color || color === 0x8a3a2a) box(g, 0.95, 0.28, 0.95, stone, 0, 0.3 + h + 0.14, 0);   // a capital (a broken column has none)
            break; }
        case 'ruin_wall': { const n = Math.max(2, Math.round(len / 1.1));
            for (let i = 0; i < n; i++) { const hh = 1.2 + ((i * 7) % 5) * 0.45; box(g, len / n + 0.02, hh, 0.7, i % 2 ? 0xa8a294 : 0xb4ae9e, -len / 2 + (i + 0.5) * (len / n), hh / 2, 0, (i % 3 - 1) * 0.02); }
            break; }
        case 'steps': for (let i = 0; i < 4; i++) box(g, len, 0.25, 0.7, 0xaaa496, 0, 0.12 + i * 0.25, -i * 0.6);
            break;
        case 'platform': box(g, len, 1.0, len * 0.8, 0xa8a294, 0, 0.5, 0); box(g, len * 0.7, 0.6, len * 0.55, 0xb4ae9e, 0, 1.3, 0);
            for (let i = 0; i < 6; i++) box(g, 0.5, 0.05, 0.08, 0x6a8a9a, -len * 0.25 + i * len * 0.1, 1.62, 0, 0, { emissive: 0x3a6a8a, emissiveIntensity: 0.6 });   // carvings in a forgotten script, faintly lit
            break;
        case 'pier': { const n = Math.max(2, Math.round(len / 0.5));
            for (let i = 0; i < n; i++) box(g, 1.8, 0.08, 0.45, i % 2 ? 0x7a5a3a : 0x6b4a2b, 0, 0.55, i * 0.5);
            for (let i = 0; i <= len; i += 2) for (const sx of [-1, 1]) box(g, 0.14, 2.2, 0.14, 0x3a2a1a, sx * 0.85, -0.4, i);
            break; }
        case 'boat': { const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 3.2, 8, 1, true, 0, Math.PI), mat(0x6b4a2b, { side: THREE.DoubleSide }));
            hull.rotation.z = Math.PI / 2; hull.rotation.y = Math.PI / 2; hull.position.y = 0.55; hull.castShadow = true; g.add(hull);
            box(g, 1.1, 0.06, 0.25, 0x7a5a3a, 0, 0.45, 0); box(g, 0.06, 0.06, 1.6, 0x3a2a1a, 0.4, 0.6, 0.2, 0.3);   // a thwart and an oar
            break; }
        case 'glow': { for (let i = 0; i < 4; i++) { const o = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0x9ad8ff, { emissive: 0x6ac8ff, emissiveIntensity: 2.2, transparent: true, opacity: 0.85 }));
                o.position.set(Math.cos(i * 1.7) * 1.4, -0.8 - i * 0.15, Math.sin(i * 1.7) * 1.4); g.add(o); } g.userData.glow = true; break; }
        // ---- mining ----
        case 'mine': {   // a tunnel mouth cut into a rock face, shored with timber, dark inside
            const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(4.2, 0), mat(0x5a5650)); rock.scale.set(1.4, 0.9, 1); rock.position.set(0, 1.6, -2.4); rock.castShadow = true; g.add(rock);
            box(g, 2.4, 2.8, 1.2, 0x0a0806, 0, 1.4, 0.4);
            for (const sx of [-1, 1]) box(g, 0.25, 3.0, 0.25, 0x4a3220, sx * 1.3, 1.5, 1.1);
            box(g, 3.0, 0.3, 0.3, 0x4a3220, 0, 3.0, 1.1);
            box(g, 0.6, 0.4, 0.06, 0x8a6a3a, 0, 3.4, 1.25);   // a board over the mouth
            break; }
        case 'heap': { const c = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 7), mat(0x2e2a28)); c.position.y = 1.1; c.castShadow = c.receiveShadow = true; g.add(c); break; }
        case 'chimney': box(g, 1.4, 7, 1.4, 0x6a4a3a, 0, 3.5, 0); box(g, 1.7, 0.4, 1.7, 0x4a3428, 0, 7.1, 0); box(g, 3, 1.6, 2.4, 0x5a5048, 0, 0.8, 1.2); break;   // a smelter
        case 'rails': { const n = Math.max(2, Math.round(len / 0.6));
            for (let i = 0; i < n; i++) box(g, 1.1, 0.06, 0.18, 0x4a3220, 0, 0.03, -len / 2 + i * (len / n));
            for (const sx of [-1, 1]) box(g, 0.06, 0.08, len, 0x3a3430, sx * 0.4, 0.09, 0, 0, { metalness: 0.6, roughness: 0.4 });
            break; }
        case 'weeping_stone': {   // a standing monolith carved with a weeping face, worn smooth by the wind
            const st = 0x8a8a82, worn = 0x6a6a64;
            const slab = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4.2, 0.7), mat(st)); slab.position.y = 2.1; slab.rotation.z = 0.03; slab.castShadow = true; g.add(slab);
            const crown = new THREE.Mesh(new THREE.SphereGeometry(0.66, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(st)); crown.scale.set(1, 0.5, 0.55); crown.position.y = 4.2; g.add(crown);
            for (const sx of [-1, 1]) {
                box(g, 0.26, 0.12, 0.06, worn, sx * 0.28, 3.3, 0.36, sx * 0.25);   // closed, downturned eyes
                box(g, 0.07, 1.1, 0.04, worn, sx * 0.3, 2.65, 0.37);               // a tear worn into the stone
            }
            box(g, 0.34, 0.08, 0.05, worn, 0, 2.6, 0.37, 0);   // a sorrowful mouth
            break; }
        case 'flowers': for (let i = 0; i < 9; i++) {   // a little offering of wildflowers
                const a = i * 2.4, r = 0.15 + (i % 3) * 0.12, f = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), mat([0xe8e0f0, 0xd8a8e8, 0xf0d860, 0xe88a9a][i % 4]));
                f.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r); g.add(f);
                box(g, 0.02, 0.12, 0.02, 0x4a7a2a, Math.cos(a) * r, 0.05, Math.sin(a) * r);
            } break;
        default: box(g, 0.5, 0.5, 0.5, 0x8a867e, 0, 0.25, 0);
    }
    return g;
}
// Footprint radius for a prop's collider (0 = walk through).
export const PROP_R = { stall: 1.2, well: 1.0, lamp: 0.15, cart: 1.0, barrel: 0.4, crate: 0.45, bench: 0, signpost: 0.15, fence: 0, column: 0.45, ruin_wall: 0, steps: 0, platform: 0, pier: 0, boat: 0.9, glow: 0, mine: 2.6, heap: 2.4, chimney: 1.2, rails: 0, weeping_stone: 0.8, flowers: 0 };
