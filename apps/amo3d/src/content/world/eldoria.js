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
import { createStreamWorld, prepStamp, stampHeights } from '../../engine/stream.js';
import { createThaloria } from '../thaloria.js';
import { createOutdoor } from '../glade.js';
import { createEastRoad } from '../eastRoad.js';
import { createMountain } from '../mountain.js';
import { createSanctuary } from '../sanctuary.js';

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
    const dF = polyDist(FIREMT, x, z);
    if (dF < 800) h = Math.max(h, h * 0.4 + 138 * Math.exp(-Math.pow(dF / 230, 2)) * (0.85 + 0.3 * fbm(x * 0.005, z * 0.005, 2)));
    // Thaloria (the city is stamped in, W2.2): low hills round it; the Citadel's plateau carries on north of the gorge
    const dC = Math.hypot(x - CITY.x, z - CITY.z);
    if (dC < 520) h = h + (10 + fbm(x * 0.02, z * 0.02, 2) * 4 - h) * smooth(520, 200, dC);
    const dK = Math.hypot(x - CITADEL.x, (z - (CITADEL.z - 120)) * 0.8);
    if (dK < 360) h = h + (29 + fbm(x * 0.01, z * 0.01, 2) * 6 - h) * smooth(360, 150, dK);
    // the glade's vale (Eldrin's Tower, stamped): wooded hills round it rise to meet its rim, so it sits hidden in a hollow
    const dG = Math.hypot(x - GLADE.x, z - GLADE.z);
    if (dG < 560) {
        const out = smooth(30, 10, Math.abs(x - (GLADE.x - 16))) * smooth(GLADE.z + 80, GLADE.z + 140, z);   // the way out of the vale, south (its notch)
        h = h + (24 + fbm(x * 0.008, z * 0.008, 3) * 14 - h) * smooth(560, 170, dG) * (1 - 0.85 * out);
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

const roadDist = (x, z) => { let d = Infinity; for (const r of ROADS) d = Math.min(d, polyDist(r, x, z)); return d; };

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
function makeStamps(quality) {
    const out = [prepStamp({ id: 'thaloria', map: createThaloria({ quality }), ox: CITY.x, oy: 2, oz: CITY.z, rect: [-78, -135, 78, 68], drop: new Set(['outdoor', 'east_road']) })];
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
            out.push(prepStamp({ id, map, ox: at.x, oy, oz: at.z, rect, drop: new Set(drop), wake: id === 'the_summit' ? 0 : 220 }));   // the mountain thinks anyone off its trail has fallen: it wakes only when you are on it
        } catch (e) { console.warn('[eldoria] stamp failed', id, e); }
    }
    return out;
}

export function createEldoriaWorld({ quality } = {}) {
    const stamps = makeStamps(quality);
    const heightAt = stampHeights(eldoriaHeight, stamps, 60);
    const places = LAYOUT.places.map(p => ({ name: p.name, x: p.world[0], z: p.world[1] }));
    const toCity = Math.atan2(CITY.x - GLADE.x, CITY.z - GLADE.z);
    const gl = stamps.find(st => st.id === 'outdoor'), gs = gl?.map.spawns?.start;
    const gladeStart = gs ? { ...gs, x: gs.x + gl.ox, z: gs.z + gl.oz } : null;   // the glade's own arrival point
    return createStreamWorld({
        id: 'eldoria', name: 'Eldoria — the open world', seed: 501, size: 8400, heightAt, quality, stamps,
        spawn: gladeStart ?? { x: GLADE.x + 30, z: GLADE.z + 20, facing: toCity },
        mood: { fog: '#c8d2d8', fogNear: 180, fogFar: 760, fogMix: 0.5 },
        places,
        chart: { pxPerM: 0.0625, tileM: 4, groundAt: (x, z) => (roadDist(x, z) < 6 ? 'road' : null) },
        clearAt: (x, z) => roadDist(x, z) < 5 || Math.hypot(x - GLADE.x, z - GLADE.z) < 70 || polyDist(RIVER, x, z) < 9,
        groundColor: (x, z, h, col) => {
            if (h < WATER + 0.8) return false;
            if (roadDist(x, z) < 3.2) { col.set('#8a7454'); return true; }   // the roads
            const dF = Math.hypot(x - FIRE.x, z - FIRE.z);
            if (dF < 700 && h > 30) { col.set(dF < 350 ? '#3a3634' : '#5a5450'); return true; }   // ash on the Fire Gate's slopes
            return false;
        },
    });
}
