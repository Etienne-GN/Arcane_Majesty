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
export function buildHouse({ w = 6, d = 5, h = 3.2, wall = 0xd8ccb0, roof = 0x8a3a2a, timber = 0x4a3220, stone = false, roofType = 'gable', sign = null, chimney = true, horseshoe = false, lantern = false, seed = 1 } = {}) {
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
    if (horseshoe) {   // an iron horseshoe nailed above the door, points up
        const hs = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 4, 10, Math.PI * 1.4), mat(0x3a3a3a, { metalness: 0.7, roughness: 0.4 }));
        hs.rotation.z = -Math.PI * 0.2 + Math.PI; hs.position.set(0, 2.15, d / 2 + 0.08); g.add(hs);
    }
    if (lantern) { box(g, 0.06, 0.06, 0.4, 0x2a2420, -0.85, 2.0, d / 2 + 0.22); box(g, 0.22, 0.3, 0.22, 0xffd890, -0.85, 1.75, d / 2 + 0.4, 0, { emissive: 0xffb860, emissiveIntensity: 1.4 }); }   // lit all night
    if (sign) {   // a hanging sign on an iron bracket beside the door
        box(g, 0.08, 0.08, 0.9, 0x2a2420, 0.95, 2.5, d / 2 + 0.45);
        const s = box(g, 0.9, 0.55, 0.06, 0x8a5a2a, 0.95, 2.1, d / 2 + 0.78);
        s.userData.sign = sign;
    }
    void seed;
    return g;
}

export function buildProp(type, { len = 4, color = 0x8a3a2a, dark: blackStone = false } = {}) {
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
            for (let i = 0; i < n; i++) { const hh = (blackStone ? 0.5 : 1.2) + ((i * 7) % 5) * (blackStone ? 0.22 : 0.45); box(g, len / n + 0.02, hh, 0.7, blackStone ? (i % 2 ? 0x1e1c22 : 0x26232a) : i % 2 ? 0xa8a294 : 0xb4ae9e, -len / 2 + (i + 0.5) * (len / n), hh / 2, 0, (i % 3 - 1) * 0.02); }
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
        case 'keep': {   // a square stone keep: tapering walls, arrow slits, crenellations, a wooden door, a banner
            const st = 0x7a766e, h = 11;
            box(g, 8, h, 8, st, 0, h / 2, 0); box(g, 8.6, 1.4, 8.6, 0x6a665e, 0, 0.7, 0);
            for (let i = 0; i < 4; i++) for (let j = -1; j <= 1; j++) {
                const a = i * Math.PI / 2, sx = Math.sin(a), sz = Math.cos(a);
                box(g, 1.2, 1.0, 0.6, st, sx * 3.9 + sz * j * 3, h + 0.5, sz * 3.9 - sx * j * 3, a);   // merlons
                box(g, 0.18, 1.1, 0.1, 0x1a1816, sx * 4.02 + sz * j * 2.2, h * 0.62, sz * 4.02 - sx * j * 2.2, a);   // arrow slits
            }
            box(g, 1.6, 2.6, 0.2, 0x4a2e1a, 0, 1.3, 4.05);
            box(g, 0.08, 3, 0.08, 0x2a2420, 2.8, h + 2.5, 2.8);
            box(g, 1.2, 0.8, 0.04, 0x5a6a7a, 3.42, h + 3.4, 2.8);   // a grey banner
            box(g, 0.4, 0.4, 0.4, 0xffd890, 0, h * 0.62, 4.1, 0, { emissive: 0xffb860, emissiveIntensity: 1.2 });   // a watch-light
            break; }
        case 'stone_wall': { const n = Math.max(2, Math.round(len / 1.4));
            box(g, len, 3, 1.1, 0x7a766e, 0, 1.5, 0);
            for (let i = 0; i < n; i += 1) if (i % 2 === 0) box(g, len / n * 0.9, 0.8, 1.2, 0x7a766e, -len / 2 + (i + 0.5) * (len / n), 3.4, 0);
            break; }
        // ---- the Fire Gate and the Inferno Labyrinth ----
        case 'glass_stair': {   // a wide stair of black glass going down, worn hollow in the middle, runes that hold heat
            const glass = mat(0x0c0a10, { roughness: 0.08, metalness: 0.6 });
            for (let i = 0; i < 10; i++) {
                const st = new THREE.Mesh(new THREE.BoxGeometry(len, 0.4, 1.1), glass); st.position.set(0, -i * 0.4, -i * 1.05); st.castShadow = st.receiveShadow = true; g.add(st);
                if (i % 2 === 0) for (const sx of [-1, 1]) box(g, 0.5, 0.06, 0.12, 0xff6a20, sx * (len / 2 - 0.5), -i * 0.4 + 0.21, -i * 1.05, 0, { emissive: 0xff4a10, emissiveIntensity: 1.6 });
            }
            for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.5, 1.2), glass); p.position.set(sx * (len / 2 + 0.8), 2.4, 0.4); p.castShadow = true; g.add(p);
                for (let k = 0; k < 4; k++) box(g, 0.08, 0.6, 0.06, 0xff6a20, sx * (len / 2 + 0.8), 0.9 + k * 1.1, 1.02, 0, { emissive: 0xff4a10, emissiveIntensity: 1.8 }); }
            box(g, len + 3.4, 1.0, 1.4, glass, 0, 5.4, 0.4);
            g.userData.light = { y: 1.2, x: 0, color: 0xff6a20 };
            break; }
        case 'runestone': { const st = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 0.6), mat(0x1a1618, { roughness: 0.3 })); st.position.y = 1.3; st.rotation.z = 0.05; st.castShadow = true; g.add(st);
            for (let k = 0; k < 3; k++) box(g, 0.5, 0.08, 0.04, 0xff6a20, 0, 0.8 + k * 0.6, 0.32, (k - 1) * 0.3, { emissive: 0xff4a10, emissiveIntensity: 1.8 }); break; }
        case 'flame_gate': {   // an arch of black glass with a curtain of standing flame
            const glass = mat(0x0c0a10, { roughness: 0.1, metalness: 0.5 });
            for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 6, 1.0), glass); p.position.set(sx * 2.6, 3, 0); p.castShadow = true; g.add(p); }
            box(g, 6.4, 1.0, 1.1, glass, 0, 6.3, 0);
            for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.34, 3.6 + (i % 3) * 0.9, 6), mat(i % 2 ? 0xff7a20 : 0xffc060, { emissive: i % 2 ? 0xff4a10 : 0xff9a30, emissiveIntensity: 1.6, transparent: true, opacity: 0.8 }));
                f.position.set(-2 + i * 0.5, 1.8 + (i % 3) * 0.4, 0); g.add(f); }
            g.userData.light = { y: 2.5, x: 0, color: 0xff7a20 };
            break; }
        case 'golem': {   // an obsidian golem, still as a statue: blocky limbs, a cracked chest glowing within
            const ob = mat(0x14121a, { roughness: 0.2, metalness: 0.4 });
            const part = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), ob); m.position.set(x, y, z); m.castShadow = true; g.add(m); };
            part(1.6, 1.8, 1.1, 0, 2.6, 0); part(1.0, 0.8, 0.9, 0, 3.9, 0.05);
            for (const sx of [-1, 1]) { part(0.6, 1.7, 0.6, sx * 1.15, 2.4, 0); part(0.7, 1.6, 0.7, sx * 0.5, 0.8, 0); }
            box(g, 0.6, 0.6, 0.05, 0xff6a20, 0, 2.7, 0.56, 0.4, { emissive: 0xff4a10, emissiveIntensity: 2 });
            for (const sx of [-1, 1]) box(g, 0.16, 0.08, 0.05, 0xffa040, sx * 0.22, 4.0, 0.51, 0, { emissive: 0xff7a20, emissiveIntensity: 2.2 });
            break; }
        case 'crucible': {   // the heart-chamber: a round basalt dais in a ring of fire, a brazier at its centre
            const dais = new THREE.Mesh(new THREE.CylinderGeometry(len, len + 0.6, 0.8, 16), mat(0x1e1a1c)); dais.position.y = 0.4; dais.receiveShadow = true; g.add(dais);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(len + 0.9, 0.25, 6, 32), mat(0xff6a20, { emissive: 0xff4a10, emissiveIntensity: 2 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; g.add(ring);
            const br = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.4, 1.0, 8), mat(0x2a2420, { metalness: 0.6 })); br.position.y = 1.3; g.add(br);
            const fl = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.6, 7), mat(0xffa040, { emissive: 0xff6a20, emissiveIntensity: 2, transparent: true, opacity: 0.85 })); fl.position.y = 2.5; g.add(fl);
            g.userData.light = { y: 2.5, x: 0, color: 0xff6a20 };
            break; }
        // ---- the Ruins of Eldoria ----
        case 'arch': {   // a standing arch of black stone
            const st = mat(0x22202a, { roughness: 0.7 });
            for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5, 0.9), st); p.position.set(sx * 2.2, 2.5, 0); p.castShadow = true; g.add(p); }
            const top = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.45, 4, 12, Math.PI), st); top.position.y = 5; top.castShadow = true; g.add(top);
            break; }
        case 'keeper': {   // a keeper who stood so long the standing became stone: a hooded figure grown into a pillar
            const st = mat(0x2a2830, { roughness: 0.6 });
            const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 4.4, 7), st); pil.position.y = 2.2; pil.castShadow = true; g.add(pil);
            const hood = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 7), st); hood.position.y = 4.75; g.add(hood);
            const face = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 5), mat(0x18161c)); face.position.set(0, 4.35, 0.3); g.add(face);
            box(g, 1.4, 0.3, 0.5, st, 0, 3.2, 0.32);   // folded arms, worn into the stone
            box(g, 0.12, 2.2, 0.08, 0x3a3842, 0, 1.6, 0.6);   // the staff they held, become a ridge
            break; }
        case 'dead_gate': {   // the approach: a gate whose runes have gone dark, sealed by a silence
            const st = mat(0x1a1820, { roughness: 0.5 });
            for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, 6.5, 1.4), st); p.position.set(sx * 3, 3.25, 0); p.castShadow = true; g.add(p);
                for (let k = 0; k < 5; k++) box(g, 0.5, 0.07, 0.05, 0x3a3a48, sx * 3, 1.2 + k * 1.0, 0.73, (k % 2 - 0.5) * 0.4); }   // runes, dead and grey
            box(g, 7.6, 1.2, 1.6, st, 0, 7.0, 0);
            break; }
        case 'pedestal': box(g, 1.6, 0.4, 1.6, 0x26232a, 0, 0.2, 0); box(g, 0.9, 1.1, 0.9, 0x2e2a32, 0, 0.95, 0); box(g, 1.1, 0.12, 1.1, 0x3a3640, 0, 1.56, 0);
            box(g, 0.5, 0.06, 0.5, 0x6a5a8a, 0, 1.65, 0, 0, { emissive: 0x4a3a8a, emissiveIntensity: 0.8 }); break;   // where the Heart Stone lay — a faint glow remains
        case 'ancient_door': {   // a door older than the valley: two vast leaves in a frame, covered in runes no one can read
            const st = mat(0x16141a, { roughness: 0.4, metalness: 0.2 });
            box(g, 9, 12, 2, st, 0, 6, -0.6);
            for (const sx of [-1, 1]) {
                box(g, 2.9, 9, 0.5, mat(0x221e28, { roughness: 0.35, metalness: 0.3 }), sx * 1.5, 4.5, 0.5);
                for (let r = 0; r < 7; r++) for (let c = 0; c < 3; c++) box(g, 0.36, 0.36, 0.06, 0x5a4a7a, sx * (0.6 + c * 0.8), 1.2 + r * 1.15, 0.78, ((r + c) % 3) * 0.5, { emissive: 0x3a2a6a, emissiveIntensity: 0.9 });
            }
            box(g, 0.2, 9, 0.6, 0x0a080c, 0, 4.5, 0.55);   // the seam where the leaves meet
            g.userData.light = { y: 5, x: 0, color: 0x6a4aaa, i: 8, r: 14 };
            break; }
        default: box(g, 0.5, 0.5, 0.5, 0x8a867e, 0, 0.25, 0);
    }
    return g;
}
// Footprint radius for a prop's collider (0 = walk through).
export const PROP_R = { stall: 1.2, well: 1.0, lamp: 0.15, cart: 1.0, barrel: 0.4, crate: 0.45, bench: 0, signpost: 0.15, fence: 0, column: 0.45, ruin_wall: 0, steps: 0, platform: 0, pier: 0, boat: 0.9, glow: 0, mine: 2.6, heap: 2.4, chimney: 1.2, rails: 0, weeping_stone: 0.8, flowers: 0, keep: 0, stone_wall: 0, glass_stair: 0, runestone: 0.5, flame_gate: 0, golem: 1.0, crucible: 0, arch: 0, keeper: 0.7, dead_gate: 0, pedestal: 0.9, ancient_door: 0 };
