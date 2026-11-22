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
import { createAnimals, NAMES as ANIMAL_NAMES } from '../actors/animals.js';
import { createDeer } from '../actors/deer.js';
import { buildSailboat, buildBoat } from '../models/horse.js';
import { STAIR_BASE, ELDRIN } from '../eldrinVale.js';
import { levelAtEldoria } from './bands.js';
import { flat } from '../../engine/lib.js';
import { createBeasts, NAMES as BEAST_NAMES } from '../actors/beast.js';
import { buildRegion, regionHeight, buildArch } from '../../engine/region.js';
import { settings } from '../../engine/settings.js';
import * as THREE from 'three';
// A region joins the open world without the square wall of hills that hid its old map's edge (its terrain.rim).
const noRim = d => ({ ...d, terrain: { ...(d.terrain ?? {}), rim: 0 } });
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

// A river's course is a smooth curve through the layout's points (Catmull-Rom every ~12 m) — no sharp bends.
function smoothCourse(pts, step = 12) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
        for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); }
    }
    out.push(pts[pts.length - 1]); return out;
}
// The river leaves Thaloria by the gorge's mouth (the city's own river comes out there, ~z -2085 on its west side): a point
// just outside it, before the course turns south-west (it cut through the city's ground 90 m further south, dammed).
function riverThroughGorge(pts) {
    const i = pts.findIndex(([x, z]) => Math.abs(x - 1292) < 2 && Math.abs(z + 2092) < 2);
    return i < 0 ? pts : [...pts.slice(0, i + 1), [1150, -2086], ...pts.slice(i + 1)];
}
const RIDGE = feat('ranges', /Summit/).world, FIREMT = feat('ranges', /Fire Gate/).world, RIVER = smoothCourse(riverThroughGorge(feat('rivers', /gorge/).world));
// The river's distance, fast: its segments bucketed in 64 m cells (it is hundreds of points once smoothed).
const RIV_GRID = new Map(), RIV_CELL = 64, RIV_REACH = 260;
for (let i = 0; i < RIVER.length - 1; i++) {
    const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1];
    for (let cx = Math.floor((Math.min(ax, bx) - RIV_REACH) / RIV_CELL); cx <= Math.floor((Math.max(ax, bx) + RIV_REACH) / RIV_CELL); cx++)
        for (let cz = Math.floor((Math.min(az, bz) - RIV_REACH) / RIV_CELL); cz <= Math.floor((Math.max(az, bz) + RIV_REACH) / RIV_CELL); cz++) { const k = cx + ',' + cz; (RIV_GRID.get(k) ?? RIV_GRID.set(k, []).get(k)).push(i); }
}
function riverDist(x, z) {
    const list = RIV_GRID.get(Math.floor(x / RIV_CELL) + ',' + Math.floor(z / RIV_CELL)); if (!list) return Infinity;
    let best = Infinity;
    for (const i of list) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); }
    return best;
}
const COAST = LAYOUT.features.coast.world, ROADS = LAYOUT.features.roads.map(r => r.world);
const SANCT = place('Sylvan Sanctuary'), CITY = place('Thaloria'), CITADEL = place('The Citadel of Thaloria'), GLADE = place("Thaloria Glade (Eldrin's Tower's vale)"), PASS = place('Summit of Despair'), FIRE = place('Fire Gate');
// The glade's range (offsets from the vale, metres): [x, z, height, radius]. The city lies north-west (~870 m); the road
// leaves south.
const GLADE_PEAKS = [[-400, 30, 150, 150], [-260, -290, 125, 140], [170, -320, 170, 160], [440, -60, 140, 150], [690, -270, 110, 140], [-610, -150, 95, 140], [330, 260, 85, 130]];
const GLADE_SADDLES = [[-620, -120], [-430, 40], [-250, -300], [190, -330], [460, -40], [700, -260]];
function polyDistLocal(pts, x, z) { return polyDist(pts, x, z); }
let GLADE_ROAD = null;   // the glade road's course (its smooth curve), the first time it is needed
function gladeRoadDist(x, z) {
    if (!GLADE_ROAD) { const r = LAYOUT.features.roads.find(q => /glade/.test(q.what)); GLADE_ROAD = r ? smoothCourse(r.world, 16) : []; }
    return GLADE_ROAD.length ? polyDist(GLADE_ROAD, x, z) : Infinity;
}
const LAB = place('Inferno Labyrinth'), RUINS = place('Ruins of Eldoria');
// 1 along the straight way from a to b (beyond a's footprint), fading over w metres to its sides.
function gorgeMask(a, b, x, z, w) {
    const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
    const along = (x - a.x) * ux + (z - a.z) * uz, lat = Math.abs(-(x - a.x) * uz + (z - a.z) * ux);
    return along > 0 && along < L ? smooth(w * 1.8, w, lat) : 0;
}
const WEST_PEAKS = [[850, -2390, 230, 330], [1010, -2530, 290, 360], [760, -2240, 170, 280], [1160, -2470, 200, 300], [640, -2420, 190, 260]];   // [x, z, height, radius]
// Lake Aethera, the great lake (asked 2026-11-20: big, islands, a marsh, a beach): ~1.2 km across, south-west of the
// Lake Aethera place (which sits on its north-east shore where the river comes in). A wandering shore; deep in the
// middle; islands (the Sunken Temple's on the east); a reed marsh on the west shore; a sandy beach on the south-east.
const LAKE_P = place('Lake Aethera'), LAKE = { x: LAKE_P.x - 450, z: LAKE_P.z + 350, R: 600 };
const ISLES = [[175, 40, 75, 8], [-230, -160, 95, 13], [60, -310, 45, 6], [-130, 240, 55, 9], [330, -120, 30, 4]];   // [dx, dz, r, height]
const lakeShoreR = th => LAKE.R * (1 + 0.16 * Math.sin(3 * th + 0.7) + 0.09 * Math.sin(5 * th + 2.1) + 0.05 * Math.sin(9 * th + 4.0));
const MARSH = { th: Math.PI, w: 0.75 }, BEACH = { th: Math.PI * 0.25, w: 0.6 };   // the arcs of shore (angle from the lake's middle, half-width)
const arcK = (th, a) => { const d = Math.atan2(Math.sin(th - a.th), Math.cos(th - a.th)); return smooth(a.w, a.w * 0.4, Math.abs(d)); };
export const RIVER_COURSE = RIVER;
export function lakeInfo(x, z) {
    const dx = x - LAKE.x, dz = z - LAKE.z, d = Math.hypot(dx, dz), th = Math.atan2(dz, dx), R = lakeShoreR(th);
    return { d, th, R, inside: R - d, marsh: arcK(th, MARSH), beach: arcK(th, BEACH) };
}
const PORT = place('Port Silver');
const RIFT_C = place('The Great Rift'), RIFT = [[RIFT_C.x - 150, RIFT_C.z + 60], [RIFT_C.x - 70, RIFT_C.z + 22], [RIFT_C.x, RIFT_C.z], [RIFT_C.x + 75, RIFT_C.z - 30], [RIFT_C.x + 150, RIFT_C.z - 48]];
const riftT = (x, z) => { let best = 0, bd = Infinity, acc = 0, tot = 0; for (let i = 0; i < RIFT.length - 1; i++) tot += Math.hypot(RIFT[i + 1][0] - RIFT[i][0], RIFT[i + 1][1] - RIFT[i][1]);
    for (let i = 0; i < RIFT.length - 1; i++) { const [ax, az] = RIFT[i], [bx, bz] = RIFT[i + 1], L = Math.hypot(bx - ax, bz - az), u = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (L * L))), d = Math.hypot(x - ax - (bx - ax) * u, z - az - (bz - az) * u); if (d < bd) { bd = d; best = (acc + u * L) / tot; } acc += L; }
    return best; };
const OGATE = place('The Obsidian Gate');
let OGATE_Y = 0;   // (set once the land round it is known: below)
// ---------- the continent's shape (asked 2026-11-20: not a square) and the Sunward Isles ----------
// The coast at each angle round the land's middle: beyond every place there (+320 m), bulging into peninsulas and bending
// into bays (never nearer a place than ~170 m), smoothed; the ocean beyond it. Off the south-east, an archipelago.
const CONT = (() => {
    const P = LAYOUT.places.map(p => p.world), cx = P.reduce((a, p) => a + p[0], 0) / P.length, cz = P.reduce((a, p) => a + p[1], 0) / P.length, N = 72;
    let rq = new Float32Array(N).fill(1600);
    for (const [x, z] of P) { const a = Math.atan2(z - cz, x - cx), d = Math.hypot(x - cx, z - cz) + 320; for (let k = 0; k < N; k++) { const ak = k / N * Math.PI * 2 - Math.PI, da = Math.abs(Math.atan2(Math.sin(a - ak), Math.cos(a - ak))); if (da < 0.3) rq[k] = Math.max(rq[k], d * Math.cos(da)); } }
    const sm2 = new Float32Array(N); for (let k = 0; k < N; k++) { let s0 = 0; for (let j = -3; j <= 3; j++) s0 += rq[(k + j + N) % N]; sm2[k] = Math.max(rq[k], s0 / 7); }
    return { cx, cz, N, rq: sm2 };
})();
function coastR(th) {
    const f = (th + Math.PI) / (Math.PI * 2) * CONT.N, i = Math.floor(f) % CONT.N, t = f - Math.floor(f), base = CONT.rq[i] * (1 - t) + CONT.rq[(i + 1) % CONT.N] * t;
    const n = 0.45 * Math.sin(4 * th + 0.8) + 0.35 * Math.sin(7 * th + 2.6) + 0.25 * Math.sin(13 * th + 1.1) + 0.15 * Math.sin(23 * th + 4.2);   // peninsulas and bays
    // a peninsula (user, 2026-11-20): the sea lies east and south; north-east and west of that the coast bends away
    // past the world's edge and the land runs on (the coast pushed out smoothly, so its ends are natural)
    const sea = smooth(-1.25, -0.55, th) * smooth(2.95, 2.3, th);
    return base + 260 * Math.max(-0.55, n) + (1 - sea) * 6000;
}
const ARCHI = (() => {   // the Sunward Isles: islands scattered in the south-east ocean
    const a0 = Math.atan2(1, 1.1), r0 = coastR(a0) + 750, c = { x: CONT.cx + Math.cos(a0) * r0, z: CONT.cz + Math.sin(a0) * r0 }, out = [];
    let sd = 7; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 22; k++) { const a = rnd() * Math.PI * 2, r = 120 + rnd() * 780; out.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r * 0.75, r: 35 + rnd() * rnd() * 170, h: 3 + rnd() * rnd() * 34 }); }
    return { c, isles: out };
})();
export const ARCHIPELAGO = ARCHI.c, ARCHIPELAGO_ISLES = ARCHI.isles;
export const northFootOf = x => northFoot(x), westFootOf = z => westFoot(z);   // (for the checks)
// ---------- The Divide: the north is shut but for the Summit pass ----------
// The northern range, a spur down to the Summit's ridge's west end, the ridge itself (the one gap: the Summit), then on
// from its east end, south of the Ruins, to the sea. Beyond: the Sanctuary, the Fire Gate, the Inferno Labyrinth, the Ruins.
const SPUR = [[1985, -2780], [2000, -2560], [1990, -2360], [2008, -2128]];
const DIVIDE_EAST = [[3300, -2200], [3480, -1990], [3700, -1890], [3950, -1870], [4400, -1880], [5600, -1900]];   // (out to the world's edge: no sailing round it)
// The northern range's foot never comes nearer than ~400 m to a place (more beside it: the cap slopes away smoothly).
const WEST_FOOT_CAP = (() => {
    const P = LAYOUT.places.filter(p => !p.plane || p.plane === 'Eldoria').map(p => p.world), z0 = -6000, step = 25, n = 481, cap = new Float32Array(n);
    for (let i = 0; i < n; i++) { const z = z0 + i * step; let c = 1e9; for (const [px, pz] of P) c = Math.min(c, px - 450 + Math.max(0, Math.abs(z - pz) - 300) * 0.9); cap[i] = c; }
    return z => { const f = Math.max(0, Math.min(n - 1.001, (z - z0) / step)), i = Math.floor(f), t = f - i; return cap[i] * (1 - t) + cap[i + 1] * t; };
})();
function westFoot(z) { return Math.min(WEST_FOOT_CAP(z), -4300 + 170 * Math.sin(z * 0.0019 + 2.3) + 90 * Math.sin(z * 0.0047 + 0.4) + 40 * Math.sin(z * 0.012)); }
function northFoot(x) { return Math.min(NORTH_FOOT_CAP(x), NORTH_EDGE + 260 + 170 * Math.sin(x * 0.0019 + 0.7) + 90 * Math.sin(x * 0.0051 + 2.1) + 40 * Math.sin(x * 0.013)); }
export function divideWalls() {
    const out = [], seg = (pts, skip = () => false, step = 24) => {
        for (let i = 0; i < pts.length - 1; i++) {
            const [ax, az] = pts[i], [bx, bz] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step));
            for (let k = 0; k < n; k++) {
                const x0 = ax + (bx - ax) * k / n, z0 = az + (bz - az) * k / n, x1 = ax + (bx - ax) * (k + 1) / n, z1 = az + (bz - az) * (k + 1) / n;
                if (!skip((x0 + x1) / 2, (z0 + z1) / 2)) out.push({ ax: x0, az: z0, bx: x1, bz: z1, r: 0.8, kind: 'wall', y0: -80, y1: 400 });
            }
        }
    };
    // the northern range: along its crest-side, ~250 m inside its wandering foot, the whole width of the world
    const north = []; for (let x = -5600; x <= 5600; x += 40) north.push([x, northFoot(x) - 250]);
    seg(north);
    // the western range: the same, from the northern range down past the south coast into the sea
    const west = []; for (let z = -5600; z <= 5600; z += 40) west.push([westFoot(z) - 250, z]);
    seg(west);
    seg([[SPUR[0][0], northFoot(SPUR[0][0]) - 250], ...SPUR]);
    seg(RIDGE, (x, z) => Math.hypot(x - PASS.x, z - (PASS.z - 120)) < 110);   // the Summit pass (where the trail crosses the crest, north of the Summit's marker): the one way through
    seg(DIVIDE_EAST);
    return out;
}
const NORTH_FOOT_CAP = (() => {
    const P = LAYOUT.places.filter(p => !p.plane || p.plane === 'Eldoria').map(p => p.world), x0 = -6000, step = 25, n = 481, cap = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = x0 + i * step; let c = 1e9; for (const [px, pz] of P) c = Math.min(c, pz - 400 + Math.max(0, Math.abs(x - px) - 300) * 0.9); cap[i] = c; }
    return x => { const f = Math.max(0, Math.min(n - 1.001, (x - x0) / step)), i = Math.floor(f), t = f - i; return cap[i] * (1 - t) + cap[i + 1] * t; };
})();
// Port Silver's piers: [dz, length] from the quay (x = PORT.x + 78); their decks are ground you walk on.
const PIERS = [[-46, 46], [0, 60], [46, 40]], DECK_Y = WATER + 0.9 + 0.125;
const DECKS = [];   // other walkable decks [x0, z0, x1, z1] at DECK_Y (the isles' hamlet's pier)
function pierAt(x, z) {
    for (const [x0, z0, x1, z1] of DECKS) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return DECK_Y;
    const lx = x - (PORT.x + 78);
    if (lx < -2 || lx > 62) return null;
    for (const [dz, len] of PIERS) if (lx <= len && Math.abs(z - (PORT.z + dz)) < 1.6) return DECK_Y;
    return null;
}
// The Sunward Isles: a fishing hamlet on the big low island, a ruin crowning the tallest (unnamed for now: names wait on the canon check)
const ISLE_HAMLET = ARCHI.isles.reduce((b, I) => (I.h < 8 && I.r > (b?.r ?? 0) ? I : b), null), ISLE_RUIN = ARCHI.isles.reduce((b, I) => (I.h > (b?.h ?? 0) ? I : b), null);
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
    // the land between places: broad swells; in some country ridged chains of foothills with valleys between, in other
    // country open plains (a slow mask decides which); rolling ground; the small unevenness underfoot
    // (fbm lives mostly in 0.27–0.75: stretched to the full 0–1 so crests are crests and valleys are valleys)
    const N = v => Math.max(0, Math.min(1, (v - 0.5) * 2.3 + 0.5));
    const hilly = smooth(0.42, 0.62, fbm(x * 0.0006 + 40, z * 0.0006 - 12, 2));
    // roads follow valleys: within ~150 m of a road the foothills and the rolling ground ease off (the land shaped round
    // the way people travel, so a road never has to climb over a crest)
    const vale = smooth(160, 35, roadNear(x, z));
    const chains = Math.pow(1 - Math.abs(N(fbm(x * 0.0042 + 11, z * 0.0042 + 3, 4)) * 2 - 1), 2.2) * 38 * hilly * (1 - 0.9 * vale);
    let h = 4 + N(fbm(x * 0.0011, z * 0.0011, 4)) * 22 + chains + (N(fbm(x * 0.0025, z * 0.0025, 3)) - 0.5) * 18 * (1 - 0.7 * vale) + (fbm(x * 0.02, z * 0.02, 2) - 0.5) * 3;
    // the Summit's ridge, rugged, its pass dipping at the Summit
    const dR = polyDist(RIDGE, x, z);
    if (dR < 900) {
        const rug = 0.75 + 0.5 * Math.pow(1 - Math.abs(fbm(x * 0.004 + 7, z * 0.004 - 3, 3) * 2 - 1), 2);
        let r = 108 * Math.exp(-Math.pow(dR / 210, 2)) * rug;
        r *= 1 - 0.74 * Math.exp(-Math.pow(Math.hypot(x - PASS.x, (z - (PASS.z - 100)) * 1.3) / 230, 2));   // the pass: the ridge dips to meet the Summit's own mountain (its map, stamped) where the trail crosses the crest
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
    const dC = Math.hypot(x - CITY.x, (z - (CITY.z + 95)) * 1.1), cityW = dC < 560 && z > CITY.z - 50 ? smooth(560, 230, dC) : 0;
    if (cityW > 0) h = h + (cityGround(x - CITY.x, z - CITY.z) + 2 - h) * cityW;
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
        const gr = gladeRoadDist(x, z), out = smooth(46, 14, gr) * smooth(70, 130, dG);   // the way out: a valley winding with the road (not a straight cut)
        m = m * (1 - 0.8 * out) + 8 * out;
        const k = smooth(1500, 900, dG) * (1 - cityW);   // the range fades into the land around (and gives way to the city's hill)
        h = h + (m - h) * k;
    }
    // the Sylvan Sanctuary: a sheltered valley below the pass's north side (the game's impossible spring)
    const dS = Math.hypot(x - SANCT.x, z - SANCT.z);
    if (dS < 520) h = h + (9 + fbm(x * 0.008, z * 0.008, 2) * 3 - h) * smooth(520, 200, dS);
    // the Divide's spur (user, 2026-11-21: the north closed but for the Summit pass): a rugged ridge from the northern
    // range south to the Summit's ridge's western end, between the Citadel and the Sanctuary (the river cuts a gorge through it)
    { const dS = polyDist(SPUR, x, z); if (dS < 600) {
        const rug = 0.7 + 0.6 * Math.pow(1 - Math.abs(fbm(x * 0.005 + 13, z * 0.005 + 29, 3) * 2 - 1), 2);
        h = Math.max(h, h * 0.4 + 115 * Math.exp(-Math.pow(dS / 170, 2)) * rug);
    } }
    // the river and its banks; a sheer gorge through Thaloria
    const dW = riverDist(x, z);
    const gorge = smooth(700, 250, Math.min(dC, dK));
    const bank = 7 + 33 * (1 - gorge);   // narrow, steep banks in the gorge; wide, soft ones elsewhere
    // its valley (away from the gorge): a broad floor of meadows a few metres above the water, slopes rising gently to
    // the land on either side over ~200 m
    if (dW < 230 && gorge < 0.5) { const floor = WATER + 2.5 + Math.max(0, dW - 30) * 0.05; h = h + (Math.min(h, floor + (dW / 230) ** 2 * 30) - h) * smooth(230, 40, dW) * (1 - gorge * 2); }
    if (dW < bank + 10) h = (WATER - 1.4) + (h - (WATER - 1.4)) * smooth(6, bank, dW);
    // The peaks west of Thaloria (behind the Citadel as the cover sees it, the iron hills' high crests): sharp, craggy
    // horns standing over the river's valley — the land's standard for a mountain seen from afar.
    for (const [px, pz, ph, pr] of WEST_PEAKS) {
        const d = Math.hypot(x - px, z - pz);
        if (d < pr) { const crag = 0.75 + 0.5 * Math.pow(1 - Math.abs(fbm(x * 0.012 + px, z * 0.012 + pz, 3) * 2 - 1), 2); h = Math.max(h, h + ph * Math.pow(1 - d / pr, 1.7) * crag); }
    }
    // Lake Aethera: the lake bed, the shore graded to it (a sandy beach, a reed marsh of pools and mud), its islands
    { const L = lakeInfo(x, z);
      if (L.inside > -260) {
          const shoreH = WATER + 0.5 + (fbm(x * 0.02, z * 0.02, 2) - 0.5) * 0.6, bed = WATER - 1.2 - 8 * smooth(0, 160, L.inside) * (1 - 0.7 * L.marsh);
          if (L.inside > 0) h = bed;   // the water
          else h = h + (shoreH - h) * smooth(-260, -20, L.inside) * (L.beach > 0.3 ? 1 : 0.85);   // the land slopes gently down to it
          if (L.marsh > 0.05 && L.inside > -200 && L.inside < 120) {   // the marsh: low ground just above and below the water, pools among mud and reeds
              const m = WATER + (fbm(x * 0.045 + 7, z * 0.045 - 3, 3) - 0.48) * 2.4;
              h = h + (m - h) * L.marsh * smooth(-200, -60, L.inside) * smooth(120, 40, L.inside);
          }
          for (const [ix, iz, ir, ih] of ISLES) {   // islands: rocky humps, a little beach round each
              const di = Math.hypot(x - (LAKE.x + ix), z - (LAKE.z + iz)), wob = ir * (1 + 0.2 * Math.sin(Math.atan2(z - LAKE.z - iz, x - LAKE.x - ix) * 3 + ix));
              if (di < wob * 1.3) h = Math.max(h, WATER - 0.6 + (ih + 0.6) * Math.pow(Math.max(0, 1 - di / (wob * 1.3)), 1.4) * (0.8 + 0.4 * fbm(x * 0.05, z * 0.05, 2)));
          }
      } }
    // Port Silver's harbour: a bay from the port's quays out to the eastern ocean (the old map's sea, joined to the real one)
    { const dx = x - PORT.x, dz = z - PORT.z; if (dx > 40 && dx < 520 && Math.abs(dz) < 260) {
        const w = 75 + dx * 0.25 + 18 * Math.sin(dx * 0.02 + 1.3), k = smooth(w, w * 0.6, Math.abs(dz - 14 * Math.sin(dx * 0.012))) * smooth(40, 90, dx);
        h = h + (Math.min(h, WATER - 4 - Math.min(6, (dx - 90) * 0.02)) - h) * k;
    } }
    // the Obsidian Gate's pad: level ground round it
    { const dg = Math.hypot(x - OGATE.x, z - OGATE.z); if (dg < 90) h = h + (OGATE_Y - h) * smooth(90, 30, dg); }
    // The Great Rift (docs/3d/WORLD_PLAN.md): the planar scar Vorgos tore at 0 GD — a long jagged chasm across the
    // Scarlands, its floor just above the water (the world's sea would fill it), crags along its lips
    { const d = polyDist(RIFT, x, z); if (d < 90) {
        const t = riftT(x, z), w = 9 + 9 * Math.sin(t * 7.3 + 1.1) * Math.sin(t * 2.1) + 6 * fbm(x * 0.05, z * 0.05, 2) + 5 * Math.sin(Math.PI * t);   // jagged, widest in the middle
        const lip = 3 * Math.exp(-Math.pow((d - w - 6) / 7, 2)) * (0.6 + 0.8 * fbm(x * 0.09, z * 0.09, 2));
        h = h + lip;
        if (d < w + 3) h = h + (WATER + 0.6 + 2 * fbm(x * 0.07, z * 0.07, 2) - h) * smooth(w + 3, w - 4, d);
    } }
    // the west: a craggy range closing the map (user, 2026-11-21), its foot wandering, kept clear of every place; the sea
    // below cuts it into cliffs where it meets the south coast
    // (a chain, not a plateau: green foothills, a crest of peaks and saddles ~420 m in, high country beyond; snow only on
    // the highest summits — groundColor)
    { const foot = westFoot(z);
      if (x < foot + 50) {
          const crestX = foot - 420, rugW = 0.7 + 0.6 * Math.pow(1 - Math.abs(fbm(x * 0.006 - 57, z * 0.006 + 83, 3) * 2 - 1), 2);
          const crestH = 58 + 92 * Math.pow(N(fbm(z * 0.0021 + 11, x * 0.0004 - 4, 3)), 1.6);   // summits up to ~150 m, saddles ~60 m
          const ridge = crestH * Math.exp(-Math.pow((x - crestX) / 290, 2)) * rugW;
          const hills = 26 * smooth(foot + 50, foot - 260, x) * (0.7 + 0.6 * fbm(x * 0.01, z * 0.01, 2));
          const beyond = x < crestX ? 48 * smooth(crestX, crestX - 400, x) * (0.8 + 0.4 * fbm(x * 0.004, z * 0.004, 2)) : 0;
          h = Math.max(h, h + (Math.max(ridge, hills, beyond) - h) * smooth(foot + 50, foot - 200, x));
      } }
    // the continent's coast: the ocean beyond it (cliffs where the land is high, beaches where it is low); the islands
    { const dx = x - CONT.cx, dz = z - CONT.cz, d = Math.hypot(dx, dz), R = coastR(Math.atan2(dz, dx));
      if (d > R - 220) h = h + (WATER - 14 - h) * smooth(R - 160, R + 70, d);
      if (Math.hypot(x - ARCHI.c.x, z - ARCHI.c.z) < 1200) for (const I of ARCHI.isles) {
          const di = Math.hypot(x - I.x, z - I.z), w = I.r * (1 + 0.22 * Math.sin(Math.atan2(z - I.z, x - I.x) * 3 + I.x * 0.01) + 0.1 * Math.sin(Math.atan2(z - I.z, x - I.x) * 7));
          if (di < w * 1.4) h = Math.max(h, WATER - 3 + (I.h + 3) * Math.pow(Math.max(0, 1 - di / (w * 1.4)), 1.25) * (0.8 + 0.4 * fbm(x * 0.03, z * 0.03, 2)));
      } }
    // the north: high mountains where the land runs on beyond the world (the old straight east coast and south edge are
    // gone: the coast above replaces them)
    // (a chain like the west's: green foothills, a crest of summits and saddles ~420 m in, high country beyond; snow only
    // on the highest summits — groundColor)
    { const foot = northFoot(x);   // a wandering foot, kept clear of every place
      if (z < foot + 50) {
          const crestZ = foot - 420, rugN = 0.7 + 0.6 * Math.pow(1 - Math.abs(fbm(x * 0.006 + 91, z * 0.006 - 41, 3) * 2 - 1), 2);
          const crestH = 62 + 98 * Math.pow(N(fbm(x * 0.0021 - 7, z * 0.0004 + 19, 3)), 1.6);   // summits up to ~160 m, saddles ~62 m
          const ridge = crestH * Math.exp(-Math.pow((z - crestZ) / 300, 2)) * rugN;
          const hills = 26 * smooth(foot + 50, foot - 260, z) * (0.7 + 0.6 * fbm(x * 0.01 + 5, z * 0.01, 2));
          const beyond = z < crestZ ? 50 * smooth(crestZ, crestZ - 400, z) * (0.8 + 0.4 * fbm(x * 0.004 + 3, z * 0.004, 2)) : 0;
          h = Math.max(h, h + (Math.max(ridge, hills, beyond) - h) * smooth(foot + 50, foot - 200, z));
      } }
    return h;
}

// Roads are laid like real ones: each a smooth curve (Catmull-Rom through the layout's points — no sharp bends), its bed
// a profile of the land beneath smoothed and held to a 10% grade, the land cut into hillsides and built up over hollows
// along it (graded() below). A grid of 32 m cells finds the nearest road point fast.
const ROAD_STEP = 8, ROAD_GRADE = 0.13, ROAD_CELL = 32;   // (13%: the steepest approach — off the hill into the Lower Town — needs ~12%)
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
// How near a road is (for shaping the land round roads): from a 24 m grid of cached distances, interpolated.
const NEAR_CELL = 24, NEAR = new Map();
function nearAt(i, j) {
    const k = i + ',' + j; let v = NEAR.get(k);
    if (v === undefined) {
        const x = i * NEAR_CELL, z = j * NEAR_CELL; v = 400;
        for (const c of ROAD_CURVES) for (let p = 0; p < c.length; p += 2) { const d = Math.hypot(c[p][0] - x, c[p][1] - z); if (d < v) v = d; }
        NEAR.set(k, v);
    }
    return v;
}
function roadNear(x, z) {
    const fx = x / NEAR_CELL, fz = z / NEAR_CELL, i = Math.floor(fx), j = Math.floor(fz), u = fx - i, w = fz - j;
    return (nearAt(i, j) * (1 - u) + nearAt(i + 1, j) * u) * (1 - w) + (nearAt(i, j + 1) * (1 - u) + nearAt(i + 1, j + 1) * u) * w;
}
// The roads' beds, from the land as it is (places included); held to the grade; then the land graded to them.
function graded(ground, stamps) {
    const inPlace = (x, z) => stamps.some(st => x > st.X0 - 4 && x < st.X1 + 4 && z > st.Z0 - 4 && z < st.Z1 + 4 && edgeDist(st, x, z) < 2);
    const beds = ROAD_CURVES.map(c => {
        let h = c.map(([x, z]) => ground(x, z));
        const W = 6;   // ±48 m smoothing
        h = h.map((_, i) => { let s0 = 0, n = 0; for (let k = -W; k <= W; k++) { const v = h[i + k]; if (v !== undefined) { s0 += v; n++; } } return s0 / n; });
        const g = ROAD_GRADE * ROAD_STEP, pin = c.map(([x, z]) => inPlace(x, z));   // inside a place the road is the place's own ground: pinned
        const nearPlace = (x, z) => stamps.some(st => x > st.X0 - 44 && x < st.X1 + 44 && z > st.Z0 - 44 && z < st.Z1 + 44 && edgeDist(st, x, z) < 40);
        for (const e of [0, c.length - 1]) if (nearPlace(...c[e])) pin[e] = true;   // a road ending by a place: its end at the ground there (the grade works back from it)
        c.forEach(([x, z], i) => { if (pin[i]) h[i] = ground(x, z); });
        const gs = c.map(([x, z], i) => i ? ROAD_GRADE * Math.hypot(x - c[i - 1][0], z - c[i - 1][1]) : 0);   // (the rise allowed between two points: by their real distance)
        const g0 = c.map(([x, z]) => ground(x, z));   // never cut deeper than 14 m (a cutting) nor raised more than 7 m (an embankment)
        const bound = i => { if (!pin[i]) h[i] = Math.max(WATER + 0.6, Math.min(g0[i] + 7, Math.max(g0[i] - 14, h[i]))); };   // (a causeway over water)
        for (let it = 0; it < 6; it++) {   // the grade and the bounds in turn, till both hold (once each left the bounds steepening the grade)
            for (let i = 1; i < h.length; i++) if (!pin[i]) h[i] = Math.max(h[i - 1] - gs[i], Math.min(h[i - 1] + gs[i], h[i]));
            for (let i = h.length - 2; i >= 0; i--) if (!pin[i]) h[i] = Math.max(h[i + 1] - gs[i + 1], Math.min(h[i + 1] + gs[i + 1], h[i]));
            for (let i = 0; i < h.length; i++) bound(i);
        }
        return h;
    });
    const placeEdge = (x, z) => { let d = Infinity; for (const st of stamps) if (x > st.X0 - 30 && x < st.X1 + 30 && z > st.Z0 - 30 && z < st.Z1 + 30) d = Math.min(d, edgeDist(st, x, z)); return d; };
    const fn = (x, z) => {
        const h = ground(x, z), r = nearestRoad(x, z, 16);
        if (!r || r.d > 16) return h;
        const pe = placeEdge(x, z);
        if (pe < 2) return h;   // a place keeps its own streets
        const b = beds[r.ri], bed = b[r.pi] + (b[r.pi + 1] - b[r.pi]) * r.t;
        return h + (bed - h) * (1 - smooth(4, 16, r.d)) * smooth(6, 20, riverDist(x, z));   // flat across 8 m, banks out to 16 m (its profile already meets a place's ground where it enters); at a river it fords — the channel keeps its depth (no dam)
    };
    fn.beds = beds;   // (for the checks: tools/node_world.mjs roads)
    return fn;
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
const IN_WORLD = ['outdoor', 'thaloria', 'east_road', 'the_summit', 'sylvan_sanctuary', 'thaloria_lower', 'citadel_plateau', 'summit_of_despair', 'whisper_wood', 'the_crossroads', 'iron_hollow', 'duskmeet', 'graywatch', 'lake_aethera', 'port_silver', 'emerald_fields', 'new_ravenspire', 'fire_gate', 'inferno_labyrinth', 'ruins_of_eldoria'];
export function makeStamps(quality) {
    // Thaloria: the scholar-city on its hill (content/thaloriaCity.js, from the plan), the gorge on its north side.
    const out = [prepStamp({ id: 'thaloria', map: createThaloriaCity({ quality }), ox: CITY.x, oy: 2, oz: CITY.z, rect: [-188, -126, 188, 262], drop: new Set(IN_WORLD), round: 3.2, wobble: 0.04 })];   // (a walled city: a squarer outline, still no sharp corner)
    // The Lower Town, out of the South Gate; the Citadel's plateau, at the top of the cliff stair (their own region maps).
    try {
        const lazy = id => ({ make: () => buildRegion(noRim(REGION_DEFS[id]), { quality }), heightAt: regionHeight(noRim(REGION_DEFS[id])) });   // built when you come near
        out.push(prepStamp({ id: 'thaloria_lower', ...lazy('thaloria_lower'), ox: CITY.x, oy: 2, oz: CITY.z + 262 + 56, rect: [-52, -52, 52, 52], drop: new Set(IN_WORLD), round: 4, blend: 120 }));   // (cropped inside its old rim; level with the city)
        out.push(prepStamp({ id: 'citadel_plateau', ...lazy('citadel_plateau'), ox: CITY.x, oy: 36, oz: CITY.z - 122 - 71, rect: [-52, -52, 52, 70], drop: new Set(IN_WORLD) , round: 4 }));   // (level with the cliff top; its south edge meets it)
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
    for (const [id, name] of [['summit_of_despair', 'Summit of Despair — the Approach'], ['whisper_wood', 'Whisper-Wood'], ['the_crossroads', 'The Crossroads'], ['iron_hollow', 'Iron Hollow'], ['duskmeet', 'Duskmeet'], ['graywatch', 'Graywatch'], ['lake_aethera', 'Lake Aethera'], ['port_silver', 'Port Silver'], ['emerald_fields', 'The Emerald Fields'], ['new_ravenspire', 'New Ravenspire']]) {
        try {
            const DEF = noRim(REGION_DEFS[id]), H = regionHeight(DEF), at = place(name), H0 = H(0, 0), half = REGION_DEFS[id].half ?? 90;   // (its ground, without building it)
            const base = Math.max(H0, (REGION_DEFS[id].water ?? -1.2) + 1.5);   // (a lake's floor is not the ground: measure from its water line)
            const reach = (dx, dz) => { for (let r = 8; r < half; r += 2) if (H(dx * r, dz * r) > base + 5) return Math.max(24, r - 4); return half - 6; };
            const rect = [-reach(-1, 0), -reach(0, -1), reach(1, 0), reach(0, 1)];
            if (id === 'port_silver') { rect[2] = half - 2; rect[1] = Math.min(rect[1], -60); rect[3] = Math.max(rect[3], 60); }   // the harbour's water runs to its east edge (and on to the sea)
            const lake = (REGION_DEFS[id].features ?? []).some(f => f.type === 'lake');
            // a region with a lake sits with its water at the world's sea level (the world's water fills it; its own sheet goes)
            const oy = lake ? WATER - (REGION_DEFS[id].water ?? -1.2) : Math.max(WATER + 3 - H0, eldoriaHeight(at.x, at.z) - H0);
            out.push(prepStamp({ id, make: () => buildRegion(DEF, { quality }), heightAt: H, ox: at.x, oy, oz: at.z, rect, drop: new Set(IN_WORLD), blend: 100 }));   // (a wider ring: its banks gentle where it meets the land)
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
            out.push(prepStamp({ id, map, ox: at.x, oy, oz: at.z, rect, drop: new Set([...drop, ...IN_WORLD]), dropIf: t => /Sylvan Sanctuary/.test(t.label ?? '') && id === 'the_summit', wake: id === 'the_summit' ? 0 : 220, ...(id === 'east_road' ? { blend: 150 } : {}), ...(id === 'the_summit' ? { blend: 260, blendUp: true, round: 2.3, wobble: 0.12, dropWater: true } : {}) }));   // the Summit: its flanks carry on 260 m as the massif's shoulders   // the mountain thinks anyone off its trail has fallen: it wakes only when you are on it
        } catch (e) { console.warn('[eldoria] stamp failed', id, e); }
    }
    return out;
}

// ---------- biomes (content/world/biomes/*.json — the registry; biome_maps/eldoria.json — which place has which, and
// free zones) ----------
// Each biome: palette, vegetation (density, kinds, colours, trunks), wildlife, creatures, mood, radius. A place's biome
// holds full strength over it and fades over its radius beyond; a zone paints a biome anywhere (x, z, r); the map's base
// biome keeps a little weight everywhere, so open country between places stays itself. Edited in the Land Editor.
export const BIOMES = Object.fromEntries(Object.values(import.meta.glob('./biomes/*.json', { eager: true, import: 'default' })).map(b => [b.id, b]));
import BIOME_MAP from './biome_maps/eldoria.json';
export { BIOME_MAP };
const BIOME_MAP_E = BIOME_MAP;
export function makeBiomes(stamps, BIOME_MAP = BIOME_MAP_E) {   // (a world's biome map: Eldoria's by default; Nythoria passes its own)
    const mk = (b, x, z, core, R) => ({ b, x, z, core, R, gA: new THREE.Color(b.palette.grassA), gB: new THREE.Color(b.palette.grassB), rock: new THREE.Color(b.palette.rock), fog: new THREE.Color(b.mood.fog) });
    const srcs = [];
    for (const st of stamps) { const b = BIOMES[BIOME_MAP.places?.[st.id]]; if (b) srcs.push(mk(b, st.cx, st.cz, Math.min(st.ha, st.hb) * 0.9, b.radius ?? 600)); }
    for (const zn of BIOME_MAP.zones ?? []) { const b = BIOMES[zn.biome]; if (b) srcs.push(mk(b, zn.x, zn.z, zn.r * 0.6, zn.r)); }
    const baseB = BIOMES[BIOME_MAP.base] ?? Object.values(BIOMES)[0], base = mk(baseB, 0, 0, 0, 1), baseW = BIOME_MAP.baseWeight ?? 0.18;
    const cache = new Map(), CELL = 24;
    function at(cx, cz) {
        const key = cx + ',' + cz; let r = cache.get(key); if (r) return r;
        const x = cx * CELL, z = cz * CELL, ws = [[base, baseW]];
        for (const s0 of srcs) { const d = Math.max(0, Math.hypot(x - s0.x, z - s0.z) - s0.core); if (d < s0.R * 1.6) ws.push([s0, Math.exp(-2.5 * (d / s0.R) ** 2)]); }
        const tot = ws.reduce((a, w) => a + w[1], 0);
        r = { gA: new THREE.Color(0, 0, 0), gB: new THREE.Color(0, 0, 0), rock: new THREE.Color(0, 0, 0), fogC: new THREE.Color(0, 0, 0), density: 0, kinds: {}, mood: { fogNear: 0, fogFar: 0, fogMix: 0, light: 0, nightFloor: 0 } };
        let top = null, tw = 0;
        for (const [s0, w0] of ws) {
            const w = w0 / tot, B = s0.b;
            for (const k of ['gA', 'gB', 'rock']) { r[k].r += s0[k].r * w; r[k].g += s0[k].g * w; r[k].b += s0[k].b * w; }
            r.fogC.r += s0.fog.r * w; r.fogC.g += s0.fog.g * w; r.fogC.b += s0.fog.b * w;
            r.density += (B.vegetation?.density ?? 1) * w;
            for (const [k, v] of Object.entries(B.vegetation?.kinds ?? {})) r.kinds[k] = (r.kinds[k] ?? 0) + v * w;
            for (const k of Object.keys(r.mood)) r.mood[k] += (B.mood?.[k] ?? baseB.mood[k]) * w;
            if (w > tw) { tw = w; top = B; }
        }
        const ks = Object.values(r.kinds).reduce((a, v) => a + v, 0) || 1; for (const k of Object.keys(r.kinds)) r.kinds[k] /= ks;
        r.biome = top; r.strength = tw;   // the biome that rules here (the map's tint; wildlife)
        r.colors = tw > 0.4 ? top.vegetation?.colors : null; r.trunk = tw > 0.4 ? top.vegetation?.trunk : null;
        cache.set(key, r); return r;
    }
    return (x, z) => at(Math.round(x / CELL), Math.round(z / CELL));
}

// The map's far view names the lands by their biome: one label per biome, at the middle of its places.
function biomeLabels(stamps) {
    const acc = {};
    for (const st of stamps) { const id = BIOME_MAP.places?.[st.id]; if (!id || !BIOMES[id]) continue; const a = acc[id] ??= { x: 0, z: 0, n: 0 }; a.x += st.cx; a.z += st.cz; a.n++; }
    return Object.entries(acc).map(([id, a]) => ({ name: BIOMES[id].name, x: a.x / a.n, z: a.z / a.n }));
}
OGATE_Y = (() => { const keep = OGATE.x; OGATE.x = 1e9; let m = 0, n = 0; for (let a = 0; a < 6.28; a += 0.5) { m += eldoriaHeight(keep + Math.cos(a) * 40, OGATE.z + Math.sin(a) * 40); n++; } OGATE.x = keep; return m / n; })();   // the pad at the land's mean height round it
// The open world's ground: the land, the places set into it, the roads graded in last (also used by tools/node_world.mjs).
// (a place's blend ring never fills a river or open water: the land keeps its own height there, fading back over the banks)
const keepWater = (x, z, h) => Math.max(1 - smooth(8, 34, riverDist(x, z)), smooth(WATER + 0.6, WATER - 1.2, h));
export function worldHeights(stamps) { return graded(stampHeights(eldoriaHeight, stamps, 60, keepWater), stamps); }
export function createEldoriaWorld({ quality } = {}) {
    const stamps = makeStamps(quality);
    const heightAt = worldHeights(stamps);
    const biomeAt = makeBiomes(stamps);
    const BUILT_HERE = new Set(['The Obsidian Gate', 'The Great Rift']);   // (built as features, not stamped places: no marker)
    const places = LAYOUT.places.map(p => ({ name: p.name, x: p.world[0], z: p.world[1], noMarker: BUILT_HERE.has(p.name) }));
    const toCity = Math.atan2(CITY.x - GLADE.x, CITY.z - GLADE.z);
    const gl = stamps.find(st => st.id === 'outdoor'), gs = gl?.map.spawns?.start;
    const gladeStart = gs ? { ...gs, x: gs.x + gl.ox, z: gs.z + gl.oz } : null;   // the glade's own arrival point
    let world = null;
    world = createStreamWorld({
        walls: divideWalls(), levelAt: levelAtEldoria,
        id: 'eldoria', name: 'Eldoria — the open world', seed: 501, size: 11200, heightAt, quality, stamps,
        spawn: gladeStart ?? { x: GLADE.x + 30, z: GLADE.z + 20, facing: toCity },
        mood: { fog: '#c8d2d8', fogNear: 180, fogFar: 760, fogMix: 0.5 },
        places, biomeAt,
        // fishing along the river: a spot of shallows every ~220 m of its course, on the water's edge
        extraGather: (() => { const out = [];
            for (let k = 0; k < 110; k++) { const th = MARSH.th + (k / 110 - 0.5) * MARSH.w * 1.7, r = lakeShoreR(th) - 80 + (k * 37 % 170); const x = LAKE.x + Math.cos(th) * r, z = LAKE.z + Math.sin(th) * r; const hh = eldoriaHeight(x, z); if (hh > WATER - 0.8 && hh < WATER + 1) out.push({ type: k % 7 === 0 ? 'shallows' : 'reeds', x, z }); }
            /* (above: the marsh's reeds, and fish in its pools) */ let acc = 0; for (let i = 1; i < RIVER.length; i++) { const [ax, az] = RIVER[i - 1], [bx, bz] = RIVER[i]; acc += Math.hypot(bx - ax, bz - az); if (acc < 220) continue; acc = 0; const L = Math.hypot(bx - ax, bz - az) || 1, nx = -(bz - az) / L, nz = (bx - ax) / L; for (const side of [1, -1]) { const x = bx + nx * side * 10, z = bz + nz * side * 10; if (heightAt(x, z) > WATER - 0.9 && heightAt(x, z) < WATER + 1.5) { out.push({ type: 'shallows', x, z }); break; } } } return out; })(),
        // the open land's wildlife (engine/stream.js wildStep): animals and creatures the game knows, into the world's scene
        spawnWild: (kind, type, posts, rng) => {
            const sc = world?.scene; if (!sc) return [];
            try {
                if (kind === 'animal' && type === 'deer') return posts.map((home, i) => { const d = createDeer({ home, stag: i === 0 && rng() < 0.4, rng, map: world }); sc.add(d.root); return d; });   // (deer: their own model)
                if (kind === 'animal' && ANIMAL_NAMES[type]) return createAnimals({ scene: sc, map: world, rng, type, posts });
                if (kind === 'beast' && BEAST_NAMES[type]) return createBeasts({ scene: sc, map: world, rng, type, posts });
            } catch (e) { console.warn('[wild] could not spawn', type, e); }
            return [];
        },
        chart: { pxPerM: 0.04, tileM: 4, detail: true, baked: 'eldoria', biomeLabels: biomeLabels(stamps), groundAt: (x, z) => (roadDist(x, z) < 6 ? 'road' : null) },
        clearAt: (x, z) => roadDist(x, z) < 5 || (() => { const L = lakeInfo(x, z); return (L.beach > 0.3 && L.inside > -45) || (L.marsh > 0.4 && L.inside > -120 && fbm(x * 0.05, z * 0.05, 2) > 0.45); })() || Math.hypot(x - GLADE.x, z - GLADE.z) < 70 || riverDist(x, z) < 9 || polyDist(RIFT, x, z) < 34 || Math.hypot(x - OGATE.x, z - OGATE.z) < 26,   // (nothing grows in the Rift, nor on the Gate's pad)
        groundColor: (x, z, h, col) => {
            if (h < WATER + 1.6 && h > WATER - 0.6) { const L = lakeInfo(x, z); if (L.marsh > 0.1 && L.inside > -220 && L.inside < 140) { const n = fbm(x * 0.09, z * 0.09, 2); col.set(n > 0.56 ? '#3e5a2a' : n > 0.44 ? '#4a5a30' : '#4a4630'); return true; } }   // the marsh: mud, rushes, sedge
            if (h < WATER + 0.8) return false;
            if (roadDist(x, z) < 3.2) { col.set('#8a7454'); return true; }   // the roads
            { const L = lakeInfo(x, z); if (L.inside > -260) {   // round the great lake: its beach, its marsh
                if (L.beach > 0.3 && L.inside > -40 && h < WATER + 2.5) { col.set('#d8c89a'); return true; }
                if (L.marsh > 0.1 && L.inside > -220 && h < WATER + 1.6) { const n = fbm(x * 0.09, z * 0.09, 2); col.set(n > 0.56 ? '#3e5a2a' : n > 0.44 ? '#4a5a30' : '#4a4630'); return true; }   // mud, rushes and sedge
                if (L.marsh < 0.1 && h < WATER + 1.0 && h >= WATER - 0.2) { col.set('#b8a878'); return true; }   // a sandy margin elsewhere, and round the islands
            } }
            { const dR = polyDist(RIFT, x, z); if (dR < 140) {   // the Rift's scorched land: ash and black glass, violet cracks near its lips
                const n = fbm(x * 0.06, z * 0.06, 2), k = smooth(140, 30, dR);
                if (n * k > 0.32 || dR < 34) { col.set(dR < 34 && fbm(x * 0.2, z * 0.2, 2) > 0.62 ? '#4a2a6a' : n > 0.55 ? '#2a2628' : '#3e3836'); return true; }
            } }
            if (h < WATER + 2.4 && Math.hypot(x - ARCHI.c.x, z - ARCHI.c.z) < 1250) { const n = fbm(x * 0.08, z * 0.08, 2); col.set(n > 0.6 ? '#d6c492' : '#e4d6a8'); return true; }   // the isles' pale beaches
            if ((x < westFoot(z) + 60 || z < northFoot(x) + 60) && h > 30) {   // the western and northern chains: snow only on their summits, bare rock below, high meadows lower
                const nz = fbm(x * 0.03, z * 0.03, 2) * 12;
                if (h > 112 + nz) { col.set('#e4e8ec'); return true; }
                if (h > 74 + nz) { col.set(h > 92 + nz ? '#6c6862' : '#7c766c'); return true; }
                col.set(h > 52 + nz ? '#6e7a52' : '#5e7444'); return true;
            }
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
    // ---------- Port Silver's harbour: piers into the bay, sailing boats moored along them, a lighthouse on the headland ----------
    { const g = new THREE.Group(), wood = flat(0x6a4e32), dark = flat(0x3e2c1c), stone = flat(0x8a8478), white = flat(0xe6e0d0), lamp = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd080, emissiveIntensity: 1.5 });
      const box = (m, x, y, z, w, h, d, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
      const moored = [];
      for (const [dz, len] of PIERS) {
          const x0 = PORT.x + 78, z = PORT.z + dz;
          box(wood, x0 + len / 2, WATER + 0.9, z, len, 0.25, 3.2);
          for (let k = 0; k <= len; k += 6) for (const s2 of [-1.4, 1.4]) box(dark, x0 + k, WATER - 1, z + s2, 0.3, 4, 0.3);
          for (let k = 0; k < 2; k++) { const b = buildSailboat({ sail: [0xeee6d2, 0xd8c8a8, 0xc8d8e0][(k + Math.round(dz)) % 3 & 3] ?? 0xeee6d2, trim: [0x2a4a6a, 0x6a2a2a, 0x2a5a3a][k] }); b.root.position.set(x0 + 16 + k * 22, WATER + 0.05, z + (k % 2 ? 5.5 : -5.5)); b.root.rotation.y = Math.PI / 2; g.add(b.root); moored.push(b); }
      }
      const rb = buildBoat(); rb.root.position.set(PORT.x + 96, WATER + 0.1, PORT.z + 24); rb.root.rotation.y = 1.2; g.add(rb.root); moored.push(rb);
      let lh = null; for (let r = 0; r < 160 && !lh; r += 8) for (const sgn of [-1, 1]) { const x = PORT.x + 430 - r * 0.6, z = PORT.z + sgn * (170 + r * 0.3); if (eldoriaHeight(x, z) > WATER + 2) { lh = { x, z }; break; } }
      if (lh) { const y = heightAt(lh.x, lh.z); const t = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 16, 10), white); t.position.set(lh.x, y + 8, lh.z); t.castShadow = true; g.add(t); box(stone, lh.x, y + 16.5, lh.z, 5, 1, 5); const lt = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.2, 8), lamp); lt.position.set(lh.x, y + 18, lh.z); g.add(lt); const cap = new THREE.Mesh(new THREE.ConeGeometry(2, 2.4, 8), flat(0x8a2a22)); cap.position.set(lh.x, y + 20.3, lh.z); g.add(cap); world.addWall({ x: lh.x, z: lh.z, r: 3, kind: 'wall', y0: y - 1, y1: y + 22 }); }
      world.scene.add(g);
      // the piers are ground: walking (and boarding) on them; the terrain beneath keeps its own shape
      const baseH = world.heightAt, baseG = world.groundAt, baseSwim = world.swimming, baseWade = world.wading;
      world.heightAt = (x, z) => pierAt(x, z) ?? baseH(x, z);
      world.groundAt = (x, z, y) => pierAt(x, z) ?? baseG(x, z, y);
      world.swimming = (x, z) => pierAt(x, z) == null && baseSwim(x, z);
      world.wading = (x, z) => pierAt(x, z) == null && baseWade(x, z);
      const upd = world.update; world.update = (t2, dt, ctx) => { upd(t2, dt, ctx); if (Math.hypot(ctx.player.pos.x - PORT.x, ctx.player.pos.z - PORT.z) < 500) for (const b of moored) b.update(dt, 0); g.visible = Math.hypot(ctx.player.pos.x - PORT.x, ctx.player.pos.z - PORT.z) < 900; };
    }
    // Eldrin's Tower by name (a place's spawn, god mode's travel): at the foot of its stairs, facing it — not on the mountain behind
    { const gl = world.stamps?.find(s2 => s2.id === 'outdoor'); if (gl) { const dx = STAIR_BASE.x - ELDRIN.T.x, dz = STAIR_BASE.z - ELDRIN.T.z, L = Math.hypot(dx, dz) || 1;
        world.spawns["place:Eldrin's Tower"] = { x: gl.ox + STAIR_BASE.x + dx / L * 3, z: gl.oz + STAIR_BASE.z + dz / L * 3, facing: Math.atan2(-dx, -dz) }; } }
    // ---------- Thaloria's waterfalls hung on the Citadel's real cliff (the gorge was widened and the plateau raised since
    // they were placed: they stood half in the rock, white panels) — once the city is built, each refitted from rim to water ----------
    { let done = false; const upd0 = world.update;
      world.update = (t2, dt, ctx) => { upd0(t2, dt, ctx);
          if (done) return; const st = world.stamps?.find(s2 => s2.id === 'thaloria'); if (!st?.built) return; done = true;
          const falls = []; st.group.traverse(o => { if (o.userData?.fall) falls.push(o); });
          for (const f of falls) {
              const x = f.position.x + st.ox; let faceZ = null;
              let wet = false; for (let z = f.position.z + st.oz + 40; z > f.position.z + st.oz - 70; z -= 1) { const hh = world.heightAt(x, z); if (hh < WATER) wet = true; else if (wet && hh > WATER + 8) { faceZ = z; break; } }   // (from the river north to the Citadel's cliff — not the city's own wall)
              if (faceZ == null) { f.visible = false; continue; }
              let rim = -Infinity; for (let z = faceZ; z > faceZ - 14; z -= 1) rim = Math.max(rim, world.heightAt(x, z));
              const H = f.geometry.parameters.height, top = rim + 0.3, bot = WATER - 0.6;
              f.scale.y = (top - bot) / H; f.position.set(f.position.x, (top + bot) / 2 - st.oy, faceZ + 1.2 - st.oz); f.rotation.x = 0;
              st.group.traverse(o => { if (o.userData?.foamOf === f) o.position.set(f.position.x, WATER + 0.12 - st.oy, faceZ + 3.5 - st.oz); });
          }
      }; }
    // ---------- the Great Rift's glow (light welling up from the depths) and the Obsidian Gate ----------
    { const g = new THREE.Group(), glowMat = new THREE.MeshBasicMaterial({ color: 0x7a2ad8, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const pts = []; for (let i = 0; i < RIFT.length - 1; i++) { const [ax, az] = RIFT[i], [bx, bz] = RIFT[i + 1], L = Math.hypot(bx - ax, bz - az); for (let d = 0; d < L; d += 7) pts.push([ax + (bx - ax) * d / L, az + (bz - az) * d / L, Math.atan2(bz - az, bx - ax)]); }
      for (const [x, z, a] of pts) { const t = riftT(x, z), w = Math.max(3, (9 + 9 * Math.sin(t * 7.3 + 1.1) * Math.sin(t * 2.1) + 5 * Math.sin(Math.PI * t)) * 0.7);
          const q = new THREE.Mesh(new THREE.CircleGeometry(1, 7), glowMat); q.scale.set(4 + Math.random() * 5, w * (0.35 + Math.random() * 0.45), 1); q.rotation.set(-Math.PI / 2, 0, -a + (Math.random() - 0.5) * 0.6); /* pools of light in the depths, not a road */ q.position.set(x, heightAt(x, z) + 0.4, z); g.add(q); }
      const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap(([x, z]) => [x, heightAt(x, z) + Math.random() * 18, z]), 3)), new THREE.PointsMaterial({ color: 0xc89aff, size: 0.18, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(motes);
      for (const k of [1, 2, 3]) { const [lx, lz] = RIFT[k]; const light = new THREE.PointLight(0xa050ff, 60, 140, 1.3); light.position.set(lx, heightAt(lx, lz) + 5, lz); g.add(light); }   // the chasm lit from within
      // the Obsidian Gate: a stone pad, two tapering obsidian pillars, a lintel, a shimmering portal between them, braziers
      const obs = new THREE.MeshStandardMaterial({ color: 0x0e0c14, roughness: 0.15, metalness: 0.4, flatShading: true }), stone = flat(0x3a3640), y0 = heightAt(OGATE.x, OGATE.z);
      const gate = new THREE.Group(); gate.position.set(OGATE.x, y0, OGATE.z); gate.rotation.y = Math.atan2(OGATE.x - place('New Ravenspire').x, OGATE.z - place('New Ravenspire').z) + Math.PI;   // facing the road from New Ravenspire
      const mk = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; gate.add(o); return o; };
      mk(new THREE.CylinderGeometry(14, 15, 1.2, 8), stone, 0, -0.55, 0);   // the pad, flush with the ground (you walk on it)
      for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(1.1, 1.7, 16, 6), obs, s * 5.5, 9, 0); mk(new THREE.ConeGeometry(1.2, 3, 6), obs, s * 5.5, 18.5, 0); }
      mk(new THREE.BoxGeometry(14, 1.6, 2.2), obs, 0, 16.2, 0);
      const portalTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x2 = c.getContext('2d'); for (let i = 0; i < 260; i++) { x2.strokeStyle = `rgba(${150 + (i % 5) * 20},${110 + (i % 7) * 15},255,${0.15 + (i % 4) * 0.1})`; x2.beginPath(); x2.arc(64, 64, (i * 7) % 64, i, i + 1.5); x2.stroke(); } const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
      const portalMat = new THREE.MeshBasicMaterial({ color: 0xd0b8ff, map: portalTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
      const portal = mk(new THREE.PlaneGeometry(9.4, 14.6), portalMat, 0, 8.3, 0);
      for (const s of [-1, 1]) { mk(new THREE.CylinderGeometry(0.6, 0.8, 1.6, 6), stone, s * 9, 1.6, 4); const fl = mk(new THREE.ConeGeometry(0.5, 1.4, 6), new THREE.MeshBasicMaterial({ color: 0xb06aff }), s * 9, 3, 4); fl.userData.flame = true; }
      g.add(gate);
      for (const s of [-1, 1]) world.addWall({ x: OGATE.x + Math.cos(gate.rotation.y) * s * 5.5, z: OGATE.z - Math.sin(gate.rotation.y) * s * 5.5, r: 1.8, kind: 'wall', y0: y0 - 1, y1: y0 + 20 });
      const gpos = new THREE.Vector3(OGATE.x + Math.sin(gate.rotation.y) * 3, y0, OGATE.z + Math.cos(gate.rotation.y) * 3);   // (at the ground: a station must be within 1.6 m of you in height)
      world.stations.push({ mode: 'portal', title: 'The Obsidian Gate', to: 'nythoria', spawn: 'gate', pos: gpos });
      world.spawns.obsidian_gate = { x: OGATE.x + Math.sin(gate.rotation.y) * 18, z: OGATE.z + Math.cos(gate.rotation.y) * 18, facing: gate.rotation.y + Math.PI };   // (arriving back from Nythoria: in front of the Gate)
      world.scene.add(g);
      const updR = world.update; let tt = 0;
      world.update = (t2, dt, ctx) => { updR(t2, dt, ctx); tt += dt; const P = ctx.player.pos, near = Math.hypot(P.x - RIFT_C.x, P.z - RIFT_C.z) < 1500 || Math.hypot(P.x - OGATE.x, P.z - OGATE.z) < 1200; g.visible = near; if (!near) return;
          portalTex.rotation = tt * 0.4; portalTex.center.set(0.5, 0.5); portalMat.opacity = 0.75 + Math.sin(tt * 2) * 0.1; glowMat.opacity = 0.42 + Math.sin(tt * 1.3) * 0.1;
          const p = motes.geometry.attributes.position; for (let i = 0; i < p.count; i++) { let y = p.getY(i) + dt * 1.6; const base = heightAt(p.getX(i), p.getZ(i)); if (y > base + 22) y = base; p.setY(i, y); } p.needsUpdate = true; };
    }
    // ---------- the Sunward Isles: a fishing hamlet (huts, a pier with boats, drying racks) and a ruin on the tallest isle ----------
    if (ISLE_HAMLET && ISLE_RUIN) {
        const g = new THREE.Group(), wood = flat(0x6e5236), dark = flat(0x3e2c1c), thatch = flat(0xb89a5a), wall = flat(0xd8ccb0), stone = flat(0x9a948a), moss = flat(0x6a7a5a);
        const box = (m, x, y, z, w, h, d, ry = 0, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
        const H0 = (x, z) => world.heightAt(x, z), I = ISLE_HAMLET, toMain = Math.atan2(ARCHI.c.z - I.z, ARCHI.c.x - I.x) + Math.PI * 0.85;   // the hamlet faces the open water towards the mainland
        // the huts: on the low ground just above the beach, in an arc
        let placed = 0;
        for (let k = 0; k < 40 && placed < 6; k++) {
            const a = toMain + (k % 9 - 4) * 0.16, r = I.r * (0.35 + 0.07 * Math.floor(k / 9)), x = I.x + Math.cos(a) * r, z = I.z + Math.sin(a) * r, y = H0(x, z);
            if (y < WATER + 1.4 || y > WATER + 7 || Math.abs(H0(x + 3, z) - H0(x - 3, z)) > 1.6) continue;
            const ry = -a + Math.PI / 2;
            box(wall, x, y + 1.3, z, 4.2, 2.6, 3.4, ry);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 4), thatch); roof.position.set(x, y + 3.7, z); roof.rotation.y = ry + Math.PI / 4; roof.scale.set(1, 1, 0.85); roof.castShadow = true; g.add(roof);
            box(dark, x + Math.cos(a) * 1.71, y + 0.9, z + Math.sin(a) * 1.71, 1.0, 1.8, 0.1, ry);   // the door, towards the sea
            world.addWall({ x, z, r: 2.6, kind: 'wall', y0: y - 1, y1: y + 5 });
            if (placed % 2 === 0) { for (const s2 of [-1.6, 1.6]) box(wood, x + Math.cos(a + 1.57) * (3.4 + s2), y + 1, z + Math.sin(a + 1.57) * (3.4 + s2), 0.12, 2, 0.12); box(wood, x + Math.cos(a + 1.57) * 3.4, y + 1.9, z + Math.sin(a + 1.57) * 3.4, 0.1, 0.1, 3.4, ry + Math.PI / 2); }   // a drying rack
            placed++;
        }
        // the pier: from the shore towards the mainland, walkable; a rowboat and a sailboat moored
        let shore = null; for (let r = I.r * 0.3; r < I.r * 1.6 && !shore; r += 2) { const x = I.x + Math.cos(toMain) * r, z = I.z + Math.sin(toMain) * r; if (H0(x, z) < WATER + 0.3) shore = { x, z }; }
        if (shore) {
            const dx = Math.sign(Math.cos(toMain)) || -1, x0 = shore.x - dx * 4, x1 = shore.x + dx * 26, z0 = shore.z;
            box(wood, (x0 + x1) / 2, WATER + 0.9, z0, Math.abs(x1 - x0), 0.25, 3, 0);
            for (let k = 0; k <= Math.abs(x1 - x0); k += 6) for (const s2 of [-1.3, 1.3]) box(dark, Math.min(x0, x1) + k, WATER - 1, z0 + s2, 0.3, 4, 0.3);
            DECKS.push([Math.min(x0, x1), z0 - 1.5, Math.max(x0, x1), z0 + 1.5]);
            const rb = buildBoat(); rb.root.position.set(x1 - dx * 6, WATER + 0.1, z0 + 3.6); rb.root.rotation.y = Math.PI / 2; g.add(rb.root);
            const sb = buildSailboat({ sail: 0xe8dcc0, trim: 0x2a5a4a }); sb.root.position.set(x1 - dx * 14, WATER + 0.05, z0 - 5); sb.root.rotation.y = Math.PI / 2; g.add(sb.root);
            for (let k = 0; k < 4; k++) box(wood, shore.x - dx * (2 + k * 1.3), H0(shore.x - dx * (2 + k * 1.3), z0 + 2.5) + 0.35, z0 + 2.5, 0.8, 0.7, 0.8);   // crates on the beach
        }
        // the ruin: a ring of standing stones and a broken arch on the tallest isle's crown
        const R = ISLE_RUIN, top = H0(R.x, R.z);
        for (let k = 0; k < 9; k++) {
            const a = k / 9 * Math.PI * 2, x = R.x + Math.cos(a) * 9, z = R.z + Math.sin(a) * 9, y = H0(x, z), tall = k % 3 === 1 ? 1.4 : 3.2 + (k % 2) * 0.8;
            box(k % 4 === 0 ? moss : stone, x, y + tall / 2 - 0.2, z, 1.3, tall, 0.9, -a, k === 5 ? 0.35 : 0);
            world.addWall({ x, z, r: 0.9, kind: 'wall', y0: y - 1, y1: y + tall });
        }
        for (const s2 of [-2.2, 2.2]) { box(stone, R.x + s2, top + 2.4, R.z, 1.1, 4.8, 1.1); world.addWall({ x: R.x + s2, z: R.z, r: 0.8, kind: 'wall', y0: top - 1, y1: top + 5 }); }
        box(stone, R.x + 0.6, top + 0.4, R.z + 2.2, 5.6, 0.8, 1.0, 0.25);   // its fallen lintel
        world.scene.add(g);
        const upd = world.update; world.update = (t2, dt, ctx) => { upd(t2, dt, ctx); g.visible = Math.hypot(ctx.player.pos.x - ARCHI.c.x, ctx.player.pos.z - ARCHI.c.z) < 1500; };
    }
    return world;
}
