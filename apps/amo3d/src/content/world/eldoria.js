// Eldoria's open world — W2.1 (docs/3d/OPEN_WORLD_PLAN.md): the land itself, shaped from the W0 world map
// (content/world/eldoria_layout.json, made by data/scripts/world_layout.py from the lore DB: 1 DB unit = 5.5 m, x east,
// z south). Streamed by engine/stream.js. Thaloria's corner is shaped by hand from the layout's features:
//   · the Summit's range — an east–west ridge (~115 m) with its pass dipping at the Summit of Despair;
//   · the Fire Gate's mountain (~140 m), ash-grey round it;
//   · the river along the ridge's northern foot, round its western end, through a gorge between Thaloria and the
//     Citadel's cliff, then south-west past the Silverrun to Lake Aethera;
//   · Thaloria's plateau (the city on the south bank, the Citadel higher on the north), the glade's vale south-east of
//     the city (Eldrin's Tower), the roads (dirt, no trees);
//   · the sea beyond the east coast and the south edge; high mountains closing the north.
// The rest of Eldoria is gentle land for now (W4 shapes each region). Markers stand where each place will be built (W2.2).
import LAYOUT from './eldoria_layout.json';
import { fbm } from '../../engine/lib.js';
import { createStreamWorld, prepStamp, stampHeights, edgeDist } from '../../engine/stream.js';
import { createThaloriaCity, cityGround } from '../thaloriaCity.js';
import { createOutdoor } from '../glade.js';
import { createEastRoad } from '../eastRoad.js';
import { createMountain } from '../mountain.js';
import { createSanctuary } from '../sanctuary.js';
import { buildRegion, regionHeight, buildArch } from '../../engine/region.js';
import { settings } from '../../engine/settings.js';
import * as THREE from 'three';
const REGION_DEFS = Object.fromEntries(Object.values(import.meta.glob('../regions/*.json', { eager: true, import: 'default' })).map(d => [d.id, d]));

const WATER = -2;
const S = LAYOUT.scale_m_per_db_unit, [OX, OY] = LAYOUT.origin_db;
const W = ([x, y]) => [(x - OX) * S, (y - OY) * S];   // DB units → world metres
const place = name => { const p = LAYOUT.places.find(q => q.name === name); return p ? { x: p.world[0], z: p.world[1] } : null; };
const feat = (group, test) => (LAYOUT.features[group] ?? []).find(f => test.test(f.what));

// Distance from a point to a polyline (world metres), and the nearest point's parameter along it.
function polyDist(pts, x, z) {
    let best = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
        const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
        if (d < best) best = d;
    }
    return best;
}
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

const RIDGE = feat('ranges', /Summit/).world, FIREMT = feat('ranges', /Fire Gate/).world, RIVER = feat('rivers', /gorge/).world;
const COAST = LAYOUT.features.coast.world, ROADS = LAYOUT.features.roads.map(r => r.world);
const SANCT = place('Sylvan Sanctuary'), CITY = place('Thaloria'), CITADEL = place('The Citadel of Thaloria'), GLADE = place("Thaloria Glade (Eldrin's Tower's vale)"), PASS = place('Summit of Despair'), FIRE = place('Fire Gate');
// The glade's range (offsets from the vale, metres): [x, z, height, radius]. The city lies north-west (~870 m); the road
// leaves south.
const GLADE_PEAKS = [[-400, 30, 150, 150], [-260, -290, 125, 140], [170, -320, 170, 160], [440, -60, 140, 150], [690, -270, 110, 140], [-610, -150, 95, 140], [330, 260, 85, 130]];
const GLADE_SADDLES = [[-620, -120], [-430, 40], [-250, -300], [190, -330], [460, -40], [700, -260]];
function polyDistLocal(pts, x, z) { return polyDist(pts, x, z); }
const LAB = place('Inferno Labyrinth'), RUINS = place('Ruins of Eldoria');
// 1 along the straight way from a to b (beyond a's footprint), fading over w metres to its sides.
function gorgeMask(a, b, x, z, w) {
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const along = (x - a.x) * ux + (z - a.z) * uz, lat = Math.abs(-(x - a.x) * uz + (z - a.z) * ux);
    return along > 0 && along < L ? smooth(w * 1.8, w, lat) : 0;
}
const NORTH_EDGE = W([0, 45])[1], SOUTH_EDGE = W([0, 1090])[1];

// The coast's x at a given z (the line runs north–south down the east side).
function coastX(z) {
    for (let i = 0; i < COAST.length - 1; i++) {
        const [ax, az] = COAST[i], [bx, bz] = COAST[i + 1];
        if ((z - az) * (z - bz) <= 0) { const t = (z - az) / ((bz - az) || 1); return ax + (bx - ax) * t; }
    }
    return z < COAST[0][1] ? COAST[0][0] : COAST[COAST.length - 1][0];
}

export function eldoriaHeight(x, z) {
    // gentle land
    let h = 7 + fbm(x * 0.0011, z * 0.0011, 4) * 24 + fbm(x * 0.006, z * 0.006, 2) * 3;
    // the Summit's ridge, rugged, its pass dipping at the Summit
    const dR = polyDist(RIDGE, x, z);
    if (dR < 900) {
        const rug = 0.75 + 0.5 * Math.pow(1 - Math.abs(fbm(x * 0.004 + 7, z * 0.004 - 3, 3) * 2 - 1), 2);
        let r = 108 * Math.exp(-Math.pow(dR / 210, 2)) * rug;
        r *= 1 + 0.3 * Math.exp(-Math.pow(Math.hypot(x - PASS.x, z - PASS.z) / 300, 2));   // the Summit's massif (its own map, stamped: the trail climbs it)
        h = Math.max(h, h * 0.4 + r);
    }
    // the Fire Gate's mountain
    // The fire mountain: a caldera, the Inferno Labyrinth in its hollow; a gorge through its wall toward the Fire Gate
    // (open) and another toward the Ruins (the way Xarathos barred); the Fire Gate in the valley at its western foot.
    const dL = Math.hypot(x - LAB.x, z - LAB.z);
    if (dL < 700) {
        const crag = 0.62 + 0.7 * Math.pow(1 - Math.abs(fbm(x * 0.009 + 51, z * 0.009 - 23, 3) * 2 - 1), 2.2);   // jagged crests and spurs, not a dome
        let ring = 155 * Math.exp(-Math.pow((dL - 165) / 85, 2)) * crag + 40 * Math.exp(-Math.pow((dL - 260) / 120, 2)) * fbm(x * 0.012, z * 0.012, 2);
        for (const to of [FIRE, RUINS]) {   // the gorges through the caldera's wall
            const g = gorgeMask(LAB, to, x, z, 14);
            ring *= 1 - 0.9 * g;
        }
        h = Math.max(h, h * 0.4 + ring);
    }
    const dFG = Math.hypot(x - FIRE.x, z - FIRE.z);
    if (dFG < 420) h = h + (9 + fbm(x * 0.01, z * 0.01, 2) * 4 - h) * smooth(420, 140, dFG) * (1 - smooth(260, 120, dL));
    // Thaloria (the city is stamped in, W2.2): low hills round it; the Citadel's plateau carries on north of the gorge
    // Thaloria's hill carries on beyond its walls and rolls down into the land (no pedestal under the city)
    const dC = Math.hypot(x - CITY.x, (z - (CITY.z + 95)) * 1.1);
    if (dC < 560 && z > CITY.z - 50) h = h + (cityGround(x - CITY.x, z - CITY.z) + 2 - h) * smooth(560, 230, dC);
    const dK = Math.hypot(x - CITADEL.x, (z - (CITADEL.z - 120)) * 0.8);
    if (dK < 360) h = h + (29 + fbm(x * 0.01, z * 0.01, 2) * 6 - h) * smooth(360, 150, dK);
    // The glade's mountains: a small range round Eldrin's vale, and the vale is the crater of one of them. The crater's
    // outer flanks fall from its snowy rim to the foothills; its neighbours stand higher, snow-capped, joined by rugged
    // saddles; the south stays open (the pass cut through the rim, and the road down to the city).
    const dG = Math.hypot(x - GLADE.x, z - GLADE.z);
    if (dG < 1500) {
        const lx = x - GLADE.x, lz = z - GLADE.z;
        const rug = 0.8 + 0.4 * Math.pow(1 - Math.abs(fbm(x * 0.006 + 31, z * 0.006 - 17, 3) * 2 - 1), 2);
        // the crater: a cone whose top is the vale's rim (the stamp fills its inside)
        let m = 6 + 44 * Math.pow(1 - smooth(122, 400, dG), 1.4) * (0.85 + 0.3 * fbm(x * 0.02, z * 0.02, 2));
        // its neighbours: peaks, and the saddles between them
        for (const [px, pz, ph, pr] of GLADE_PEAKS) m = Math.max(m, ph * Math.exp(-((lx - px) ** 2 + (lz - pz) ** 2) / (pr * pr)) * rug);
        m = Math.max(m, 55 * Math.exp(-Math.pow(polyDistLocal(GLADE_SADDLES, lx, lz) / 110, 2)) * rug);
        // the way out, south: the pass through the rim and the valley below it stay low
        const out = smooth(40, 12, Math.abs(lx + 16)) * smooth(80, 150, lz);
        m = m * (1 - 0.8 * out) + 8 * out;
        const k = smooth(1500, 900, dG);   // the range fades into the land around
        h = h + (m - h) * k;
    }
    // the Sylvan Sanctuary: a sheltered valley below the pass's north side (the game's impossible spring)
    const dS = Math.hypot(x - SANCT.x, z - SANCT.z);
    if (dS < 520) h = h + (9 + fbm(x * 0.008, z * 0.008, 2) * 3 - h) * smooth(520, 200, dS);
    // the river and its banks; a sheer gorge through Thaloria
    const dW = polyDist(RIVER, x, z);
    const gorge = smooth(700, 250, Math.min(dC, dK));
    const bank = 7 + 33 * (1 - gorge);   // narrow, steep banks in the gorge; wide, soft ones elsewhere
    if (dW < bank + 10) h = (WATER - 1.4) + (h - (WATER - 1.4)) * smooth(6, bank, dW);
    // the sea: east of the coast, past the south edge; high mountains closing the north
    const cx = coastX(z);
    if (x > cx - 160) h = h + (WATER - 10 - h) * smooth(cx - 160, cx + 60, x);
    if (z > SOUTH_EDGE - 200) h = h + (WATER - 10 - h) * smooth(SOUTH_EDGE - 200, SOUTH_EDGE, z);
    if (z < NORTH_EDGE + 300) h = Math.max(h, h + (160 - h) * smooth(NORTH_EDGE + 300, NORTH_EDGE - 100, z));
    return h;
}

// Roads are laid like real ones: each a smooth curve (Catmull-Rom through the layout's points — no sharp bends), its bed
// a profile of the land beneath smoothed and held to a 10% grade, the land cut into hillsides and built up over hollows
// along it (graded() below). A grid of 32 m cells finds the nearest road point fast.
const ROAD_STEP = 8, ROAD_GRADE = 0.10, ROAD_CELL = 32;
function curve(pts) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / ROAD_STEP));
        for (let k = 0; k < n; k++) {
            const t = k / n, t2 = t * t, t3 = t2 * t;
            const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
            out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
        }
    }
    out.push(pts[pts.length - 1]);
    return out;
}
export const ROAD_CURVES = ROADS.map(curve);
const roadGrid = new Map();   // cell → [[roadIndex, pointIndex]]
ROAD_CURVES.forEach((c, ri) => c.forEach(([x, z], pi) => { const k = `${Math.floor(x / ROAD_CELL)},${Math.floor(z / ROAD_CELL)}`; (roadGrid.get(k) ?? roadGrid.set(k, []).get(k)).push([ri, pi]); }));
// The nearest road point within reach: { d, ri, pi, t } (t: along the segment pi → pi+1).
function nearestRoad(x, z, reach = 20) {
    let best = null;
    const cx = Math.floor(x / ROAD_CELL), cz = Math.floor(z / ROAD_CELL), n = Math.ceil(reach / ROAD_CELL);
    for (let dz = -n; dz <= n; dz++) for (let dx = -n; dx <= n; dx++) for (const [ri, pi] of roadGrid.get(`${cx + dx},${cz + dz}`) ?? []) {
        const c = ROAD_CURVES[ri];
        for (const j of [pi - 1, pi]) {
            if (j < 0 || j >= c.length - 1) continue;
            const [ax, az] = c[j], [bx, bz] = c[j + 1], ddx = bx - ax, ddz = bz - az, L2 = ddx * ddx + ddz * ddz || 1;
            const t = Math.max(0, Math.min(1, ((x - ax) * ddx + (z - az) * ddz) / L2)), d = Math.hypot(x - ax - ddx * t, z - az - ddz * t);
            if (d < reach && (!best || d < best.d)) best = { d, ri, pi: j, t };
        }
    }
    return best;
}
const roadDist = (x, z) => nearestRoad(x, z, 12)?.d ?? Infinity;
// The roads' beds, from the land as it is (places included); held to the grade; then the land graded to them.
function graded(ground, stamps) {
    const inPlace = (x, z) => stamps.some(st => x > st.X0 - 4 && x < st.X1 + 4 && z > st.Z0 - 4 && z < st.Z1 + 4 && edgeDist(st, x, z) < 2);
    const beds = ROAD_CURVES.map(c => {
        let h = c.map(([x, z]) => ground(x, z));
        const W = 6;   // ±48 m smoothing
        h = h.map((_, i) => { let s0 = 0, n = 0; for (let k = -W; k <= W; k++) { const v = h[i + k]; if (v !== undefined) { s0 += v; n++; } } return s0 / n; });
        const g = ROAD_GRADE * ROAD_STEP;
        for (let i = 1; i < h.length; i++) h[i] = Math.max(h[i - 1] - g, Math.min(h[i - 1] + g, h[i]));
        for (let i = h.length - 2; i >= 0; i--) h[i] = Math.max(h[i + 1] - g, Math.min(h[i + 1] + g, h[i]));
        return h.map(v => Math.max(v, WATER + 0.6));   // (a causeway over water)
    });
    return (x, z) => {
        const h = ground(x, z), r = nearestRoad(x, z, 16);
        if (!r || r.d > 16 || inPlace(x, z)) return h;
        const b = beds[r.ri], bed = b[r.pi] + (b[r.pi + 1] - b[r.pi]) * r.t;
        return h + (bed - h) * (1 - smooth(4, 16, r.d));   // flat across 8 m, its banks out to 16 m
    };
}

// The places stamped into the world (W2.2). Thaloria: the city (its own map, content/thaloria.js), set on the gorge
// with its river at the world's water level; its West and East Gates now open on the land itself.
// The others (the glade, the East Road, the Summit's trail, the Sanctuary) sit at their layout positions, raised or
// lowered to meet the land best round their edges (oy: the mean gap along the rect's border).
const EAST_APPROACH = place('Summit of Despair — the Approach'), EAST_ROAD = place('The East Road (Thalorian Wilds)');
function fitOy(map, ox, oz, [x0, z0, x1, z1]) {
    let sum = 0, n = 0;
    for (let t = 0; t <= 1.0001; t += 0.05) for (const [x, z] of [[x0 + (x1 - x0) * t, z0], [x0 + (x1 - x0) * t, z1], [x0, z0 + (z1 - z0) * t], [x1, z0 + (z1 - z0) * t]]) { sum += eldoriaHeight(x + ox, z + oz) - map.heightAt(x, z); n++; }
    return sum / n;
}
// The story's three places: their passes (to: where the way leads; requires: the story flag that opens it).
const STORY = [
    { id: 'fire_gate', name: 'Fire Gate', floor: 10, ways: [{ to: () => place('Sylvan Sanctuary'), requires: 'aether_sight' }, { to: () => place('Inferno Labyrinth') }] },
    { id: 'inferno_labyrinth', name: 'Inferno Labyrinth', floor: 26, ways: [{ to: () => place('Fire Gate') }, { to: () => place('Ruins of Eldoria'), requires: 'xarathos_destroyed' }] },
    { id: 'ruins_of_eldoria', name: 'Ruins of Eldoria', ways: [{ to: () => place('Inferno Labyrinth') }] },
];
// Every exit that led from one of these places to another of them is gone in the open world: you walk there.
const IN_WORLD = ['outdoor', 'thaloria', 'east_road', 'the_summit', 'sylvan_sanctuary', 'thaloria_lower', 'citadel_plateau', 'summit_of_despair', 'whisper_wood', 'the_crossroads', 'iron_hollow', 'duskmeet', 'graywatch', 'lake_aethera', 'port_silver', 'emerald_fields', 'fire_gate', 'inferno_labyrinth', 'ruins_of_eldoria'];
function makeStamps(quality) {
    // Thaloria: the scholar-city on its hill (content/thaloriaCity.js, from the plan), the gorge on its north side.
    const out = [prepStamp({ id: 'thaloria', map: createThaloriaCity({ quality }), ox: CITY.x, oy: 2, oz: CITY.z, rect: [-188, -78, 188, 262], drop: new Set(IN_WORLD), round: 3.2, wobble: 0.04 })];   // (a walled city: a squarer outline, still no sharp corner)
    // The Lower Town, out of the South Gate; the Citadel's plateau, at the top of the cliff stair (their own region maps).
    try {
        const lazy = id => ({ make: () => buildRegion(REGION_DEFS[id], { quality }), heightAt: regionHeight(REGION_DEFS[id]) });   // built when you come near
        out.push(prepStamp({ id: 'thaloria_lower', ...lazy('thaloria_lower'), ox: CITY.x, oy: 2, oz: CITY.z + 262 + 56, rect: [-52, -52, 52, 52], drop: new Set(IN_WORLD) , round: 4 }));   // (cropped inside its old rim; level with the city)
        out.push(prepStamp({ id: 'citadel_plateau', ...lazy('citadel_plateau'), ox: CITY.x, oy: 30, oz: CITY.z - 74 - 71, rect: [-52, -52, 52, 70], drop: new Set(IN_WORLD) , round: 4 }));   // (level with the cliff top; its south edge meets it)
    } catch (e) { console.warn('[eldoria] stamp failed (Thaloria\'s neighbours)', e); }
    // The story's three (chapters 6–11 stage their scenes here — content/chapters.js runs them in the place's frame):
    // each keeps its own rim of rock, with a pass cut through it toward each neighbour, an invisible wall along the crest
    // elsewhere, and on a pass the story has not opened yet, a gate of flame (the Fire Gate: once the Elemental has given
    // you the aether-sight; the Ruins: once Xarathos is destroyed).
    for (const S of STORY) {
        try {
            const def = REGION_DEFS[S.id], H = regionHeight(def), at = place(S.name), half = (def.half ?? 70) - 2, H0 = H(0, 0);
            const ways = S.ways.map(w => ({ ...w, a: Math.atan2(w.to().z - at.z, w.to().x - at.x) }));
            const shape = Hf => (x, z) => {   // the passes, cut through the rim down to the floor
                let h = Hf(x, z); const r = Math.hypot(x, z);
                if (r > 30) for (const w of ways) {
                    const ca = Math.cos(w.a), sa = Math.sin(w.a), along = x * ca + z * sa, lat = Math.abs(-x * sa + z * ca);
                    if (along > 0) { const k = smooth(11, 6, lat) * smooth(30, 42, r); h = h + (H0 + 0.3 - h) * k; }
                }
                return h;
            };
            const Hs = shape(H), oy = Math.max(WATER + 3 - H0, (S.floor ?? eldoriaHeight(at.x, at.z)) - H0);
            const st = prepStamp({ id: S.id, make: () => storyPlace(S, def, shape, ways, half), heightAt: Hs, ox: at.x, oy, oz: at.z, rect: [-half, -half, half, half], drop: new Set(IN_WORLD) });
            st.tick = ctx => { for (const g of st.gates ?? []) { const open = settings.god || !!ctx.flags?.[g.requires]; if (open === g.open) continue; g.open = open; const i = st.map.colliders.indexOf(g.wall); if (open && i >= 0) st.map.colliders.splice(i, 1); if (!open && i < 0) st.map.colliders.push(g.wall); if (g.veil) g.veil.visible = !open; } };
            st.onBuilt = map => { st.gates = map._gates; };
            out.push(st);
        } catch (e) { console.warn('[eldoria] stamp failed', S.id, e); }
    }
    function storyPlace(S, def, shape, ways, half) {
        const map = buildRegion(def, { quality, shape });
        // the crest wall: the square of the rim, broken where a pass goes through (a wall of flame across a closed one)
        const R = half - 8, gaps = ways.map(w => ({ w, p: { x: Math.cos(w.a) * R / Math.max(Math.abs(Math.cos(w.a)), Math.abs(Math.sin(w.a))), z: Math.sin(w.a) * R / Math.max(Math.abs(Math.cos(w.a)), Math.abs(Math.sin(w.a))) } }));
        const corners = [[-R, -R], [R, -R], [R, R], [-R, R], [-R, -R]];
        for (let c = 0; c < 4; c++) {
            const [ax, az] = corners[c], [bx, bz] = corners[c + 1], n = 12;
            for (let i = 0; i < n; i++) {
                const x0 = ax + (bx - ax) * i / n, z0 = az + (bz - az) * i / n, x1 = ax + (bx - ax) * (i + 1) / n, z1 = az + (bz - az) * (i + 1) / n;
                const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
                if (gaps.some(g => Math.hypot(g.p.x - mx, g.p.z - mz) < 11)) continue;
                map.colliders.push({ ax: x0, az: z0, bx: x1, bz: z1, r: 0.6, kind: 'wall', y0: -60, y1: 200 });
            }
        }
        map._gates = [];
        for (const { w, p } of gaps) {
            if (!w.requires) continue;
            const ca = Math.cos(w.a), sa = Math.sin(w.a);
            const wall = { ax: p.x + sa * 11, az: p.z - ca * 11, bx: p.x - sa * 11, bz: p.z + ca * 11, r: 0.8, kind: 'wall', y0: -60, y1: 200 };
            const veil = buildArch(map.scene, p.x, map.heightAt(p.x, p.z), p.z, Math.atan2(ca, sa) + Math.PI / 2);   // an arch across the pass
            veil.userData.veil = false; veil.material.color?.setHex?.(0xff7a2a); veil.scale.set(3, 1.6, 1);   // its veil a wall of flame (it stays: not a door)
            map.colliders.push(wall);
            map._gates.push({ requires: w.requires, wall, veil, open: false });
        }
        return map;
    }
    // The other regions on the road: each set at its world-map place, cropped just inside its old rim (measured: the
    // first rise of 5 m above its middle along each axis), its middle at the land's height (never below the sea).
    // (Not yet: the Fire Gate, the Inferno Labyrinth and the Ruins — chapters 6–11 stage their scenes on those maps
    // (content/chapters.js), so they stay behind their doors until those scenes are ported.)
    for (const [id, name] of [['summit_of_despair', 'Summit of Despair — the Approach'], ['whisper_wood', 'Whisper-Wood'], ['the_crossroads', 'The Crossroads'], ['iron_hollow', 'Iron Hollow'], ['duskmeet', 'Duskmeet'], ['graywatch', 'Graywatch'], ['lake_aethera', 'Lake Aethera'], ['port_silver', 'Port Silver'], ['emerald_fields', 'The Emerald Fields']]) {
        try {
            const H = regionHeight(REGION_DEFS[id]), at = place(name), H0 = H(0, 0), half = REGION_DEFS[id].half ?? 90;   // (its ground, without building it)
            const base = Math.max(H0, (REGION_DEFS[id].water ?? -1.2) + 1.5);   // (a lake's floor is not the ground: measure from its water line)
            const reach = (dx, dz) => { for (let r = 8; r < half; r += 2) if (H(dx * r, dz * r) > base + 5) return Math.max(24, r - 4); return half - 6; };
            const rect = [-reach(-1, 0), -reach(0, -1), reach(1, 0), reach(0, 1)];
            const lake = (REGION_DEFS[id].features ?? []).some(f => f.type === 'lake');
            // a region with a lake sits with its water at the world's sea level (the world's water fills it; its own sheet goes)
            const oy = lake ? WATER - (REGION_DEFS[id].water ?? -1.2) : Math.max(WATER + 3 - H0, eldoriaHeight(at.x, at.z) - H0);
            out.push(prepStamp({ id, make: () => buildRegion(REGION_DEFS[id], { quality }), heightAt: H, ox: at.x, oy, oz: at.z, rect, drop: new Set(IN_WORLD) }));
        } catch (e) { console.warn('[eldoria] stamp failed', id, e); }
    }
    const more = [
        // [id, build, where, rect (cropped inside the old map's border walls), dropped exits, anchor: the local point set
        //  at the land's height]
        ['outdoor', () => createOutdoor({ quality }), GLADE, [-118, -118, 118, 118], ['thaloria'], null, 3],   // the whole vale: its cliffs, ridges and the waterfall
        ['east_road', () => createEastRoad({ quality }), EAST_ROAD, [-94, -78, 94, 78], ['thaloria', 'the_summit'], null],
        ['the_summit', () => createMountain({ quality }), PASS, [-70, -92, 70, 90], [], [0, 88]],
        ['sylvan_sanctuary', () => createSanctuary({ quality }), SANCT, [-55, -55, 55, 55], [], [0, 0]],
    ];
    for (const [id, make, at, rect, drop, anchor, minOy = -Infinity] of more) {
        try {
            const map = make();
            const oy0 = anchor ? eldoriaHeight(at.x + anchor[0], at.z + anchor[1]) - map.heightAt(anchor[0], anchor[1]) : fitOy(map, at.x, at.z, rect);
            const oy = Math.max(minOy, oy0);   // (a floor never below the sea)
            out.push(prepStamp({ id, map, ox: at.x, oy, oz: at.z, rect, drop: new Set([...drop, ...IN_WORLD]), dropIf: t => /Sylvan Sanctuary/.test(t.label ?? '') && id === 'the_summit', wake: id === 'the_summit' ? 0 : 220, ...(id === 'the_summit' ? { blend: 260, blendUp: true, round: 2.3, wobble: 0.12, dropWater: true } : {}) }));   // the Summit: its flanks carry on 260 m as the massif's shoulders   // the mountain thinks anyone off its trail has fallen: it wakes only when you are on it
        } catch (e) { console.warn('[eldoria] stamp failed', id, e); }
    }
    return out;
}

export function createEldoriaWorld({ quality } = {}) {
    const stamps = makeStamps(quality);
    const heightAt = graded(stampHeights(eldoriaHeight, stamps, 60), stamps);   // (roads graded into the land last)
    const places = LAYOUT.places.map(p => ({ name: p.name, x: p.world[0], z: p.world[1] }));
    const toCity = Math.atan2(CITY.x - GLADE.x, CITY.z - GLADE.z);
    const gl = stamps.find(st => st.id === 'outdoor'), gs = gl?.map.spawns?.start;
    const gladeStart = gs ? { ...gs, x: gs.x + gl.ox, z: gs.z + gl.oz } : null;   // the glade's own arrival point
    return createStreamWorld({
        id: 'eldoria', name: 'Eldoria — the open world', seed: 501, size: 8400, heightAt, quality, stamps,
        spawn: gladeStart ?? { x: GLADE.x + 30, z: GLADE.z + 20, facing: toCity },
        mood: { fog: '#c8d2d8', fogNear: 180, fogFar: 760, fogMix: 0.5 },
        places,
        chart: { pxPerM: 0.0625, tileM: 4, detail: true, groundAt: (x, z) => (roadDist(x, z) < 6 ? 'road' : null) },
        clearAt: (x, z) => roadDist(x, z) < 5 || Math.hypot(x - GLADE.x, z - GLADE.z) < 70 || polyDist(RIVER, x, z) < 9,
        groundColor: (x, z, h, col) => {
            if (h < WATER + 0.8) return false;
            if (roadDist(x, z) < 3.2) { col.set('#8a7454'); return true; }   // the roads
            const dP = Math.hypot(x - PASS.x, z - PASS.z);   // the Summit's massif: bare rock above the trees, snow on the heights (as the mountain's own)
            if (dP < 420) { const nz = fbm(x * 0.03, z * 0.03, 2) * 10; if (h > 92 + nz) { col.set('#e4e8ec'); return true; } if (h > 44 + nz) { col.set(h > 70 + nz ? '#6a6660' : '#7a756c'); return true; } }
            const dG = Math.hypot(x - GLADE.x, z - GLADE.z);   // the glade's range: snow down to its crater's rim, bare rock below the snow
            if (dG < 1300) { const nz = fbm(x * 0.03, z * 0.03, 2) * 8; if (h > 40 + nz) { col.set('#e6eaee'); return true; } if (h > 26 + nz) { col.set(h > 33 + nz ? '#6e6862' : '#7d7568'); return true; } }
            const dL = Math.hypot(x - LAB.x, z - LAB.z);   // the fire mountain: a snow-capped volcano
            if (dL < 520 && h > 14) {
                const nz = fbm(x * 0.04, z * 0.04, 2), steep = Math.abs(eldoriaHeight(x + 3, z) - h) + Math.abs(eldoriaHeight(x, z + 3) - h) > 4.5;
                if (dL < 120) { col.set(nz > 0.62 ? '#8a2a12' : nz > 0.5 ? '#4a2a22' : '#3a2a26'); return true; }   // the caldera's inner faces, embers glowing in the cracks
                if (h > 96 + nz * 18 && !steep) { col.set('#e2e6ea'); return true; }   // snow on the heights (as on the Fire Gate's rim)
                col.set(steep ? '#2e2a2a' : nz > 0.55 ? '#5a5450' : '#4a4442'); return true;   // basalt on the steep, ash on the slopes
            }
            return false;
        },
    });
}
