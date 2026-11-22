// Browser-free checks of the open world's land (no rendering, no Chrome): loads the game's own terrain code through
// Vite in Node, with stand-ins for the few browser things it touches. usage: node tools/node_world.mjs <check> [args]
//   seams            ground jump across every place's edge (0.5 m in vs out) and the steepest 1 m step in the first 12 m
//   edge-trees       a place's own trees standing on its outline (they would be cut)
//   at x,z [x,z…]    the ground, and which places are near, at points
import { createServer } from 'vite';
const noop = () => {};
const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => 0 : any, apply: () => any });   // a gradient, a pattern… anything chainable
const ctx = new Proxy({}, { get: (t, k) => k === 'getImageData' || k === 'createImageData' ? (w = 1, h = 1) => ({ data: new Uint8ClampedArray((w.width ?? w) * (h || 1) * 4), width: w, height: h }) : k === 'measureText' ? () => ({ width: 10 }) : k === 'canvas' ? { width: 1, height: 1 } : () => any, set: () => true });
// a stand-in element: any property is a no-op function unless listed (style, classList, sizes…)
const el = () => { const base = { style: new Proxy({ setProperty: noop, removeProperty: noop }, { get: (t, k) => t[k] ?? '' , set: () => true }), getContext: () => ctx, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, dataset: {}, children: [], childNodes: [], width: 1, height: 1, offsetWidth: 1, offsetHeight: 1, toDataURL: () => '', getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1, right: 1, bottom: 1 }) };
    return new Proxy(base, { get: (t, k) => k in t ? t[k] : (typeof k === 'string' ? (t[k] = (k.startsWith('on') || k === 'textContent' || k === 'innerHTML' || k === 'id' || k === 'className') ? '' : noop) : undefined), set: (t, k, v) => { t[k] = v; return true; } }); };
globalThis.window ??= globalThis; globalThis.document ??= { createElement: el, createElementNS: el, documentElement: el(), body: el(), head: el(), fonts: { load: () => Promise.resolve(), ready: Promise.resolve() }, getElementById: () => null, querySelector: () => null, addEventListener: noop };
globalThis.localStorage ??= { getItem: () => null, setItem: noop }; globalThis.matchMedia ??= () => ({ matches: false, addEventListener: noop });
globalThis.requestAnimationFrame ??= noop; globalThis.devicePixelRatio ??= 1; globalThis.innerWidth ??= 1280; globalThis.innerHeight ??= 720; globalThis.addEventListener ??= noop; globalThis.Image ??= class { set src(v) {} };
try { Object.defineProperty(globalThis, 'navigator', { value: { userAgent: 'node', maxTouchPoints: 0 }, configurable: true }); } catch {}
const vite = await createServer({ server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
try {
    const E = await vite.ssrLoadModule('/src/content/world/eldoria.js'), S = await vite.ssrLoadModule('/src/engine/stream.js');
    const stamps = E.makeStamps({ foliage: 0.3, shadows: false, particles: 0.5, fogFar: 0.75 }), H = E.worldHeights(stamps), { edgeDist } = S;
    const [cmd, ...args] = process.argv.slice(2);
    if (cmd === 'seams') for (const st of stamps) {
        let jump = { v: 0 }, step = { v: 0 };
        for (let a = 0; a < Math.PI * 2; a += 0.01) {
            const dx = Math.cos(a), dz = Math.sin(a); let lo = 0, hi = Math.max(st.ha, st.hb) * 2;
            for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (edgeDist(st, st.cx + dx * m, st.cz + dz * m) > 0) hi = m; else lo = m; }
            const e = (lo + hi) / 2, at = r => H(st.cx + dx * (e + r), st.cz + dz * (e + r)), p = r => `${Math.round(st.cx + dx * (e + r))},${Math.round(st.cz + dz * (e + r))}`;
            const j = Math.abs(at(0.5) - at(-0.5)); if (j > jump.v) jump = { v: j, at: p(0) };
            for (let r = 0; r < 12; r++) { const g = Math.abs(at(r + 1) - at(r)); if (g > step.v) step = { v: g, at: p(r) }; }
        }
        console.log(`${st.id.padEnd(20)} jump ${jump.v.toFixed(1).padStart(5)} m @${jump.at}   steepest 1 m step ${step.v.toFixed(1).padStart(5)} m @${step.at}`);
    }
    else if (cmd === 'at') for (const a of args) { const [x, z] = a.split(',').map(Number); console.log(`${a}  ground ${H(x, z).toFixed(2)}  land ${E.eldoriaHeight(x, z).toFixed(2)}  near: ${stamps.map(s => [s.id, edgeDist(s, x, z)]).filter(q => q[1] < 150).map(q => `${q[0]} ${q[1].toFixed(0)}`).join(', ')}`); }
    else if (cmd === 'wading') for (const st of stamps) {   // inside each place: ground under the water but too shallow to swim (you and creatures walk there)
        const W = -2, SWIM = 1.35; let wade = 0, swim = 0, land = 0, ex = null;
        for (let x = st.X0; x < st.X1; x += 3) for (let z = st.Z0; z < st.Z1; z += 3) {
            if (edgeDist(st, x, z) > 0) continue; const h = H(x, z);
            if (h >= W) land++; else if (h > W - SWIM) { wade++; ex ??= `${Math.round(x)},${Math.round(z)}`; } else swim++;
        }
        if (wade + swim) console.log(`${st.id.padEnd(20)} wading ${String(wade * 9).padStart(6)} m²  swimming ${String(swim * 9).padStart(6)} m²  land ${land * 9} m²  e.g. ${ex}`);
    }
    else if (cmd === 'roads') E.ROAD_CURVES.forEach((c, ri) => {   // each road's steepest stretches (8 m), where, and the nearest place
        const g = []; for (let i = 0; i < c.length - 1; i++) { const [ax, az] = c[i], [bx, bz] = c[i + 1], L = Math.hypot(bx - ax, bz - az) || 1; g.push({ g: Math.abs(H(bx, bz) - H(ax, az)) / L, x: Math.round(ax), z: Math.round(az) }); }
        g.sort((a, b) => b.g - a.g); const top = g.slice(0, 3).map(q => { const n = stamps.map(s => [s.id, edgeDist(s, q.x, q.z)]).sort((a, b) => a[1] - b[1])[0]; return `${Math.round(q.g * 100)}% @${q.x},${q.z} (${n[0]} ${Math.round(n[1])} m)`; });
        console.log(`road ${ri} (${c.length} pts): ${top.join(' · ')}`);
    });
    else if (cmd === 'road') { const G0 = S.stampHeights(E.eldoriaHeight, stamps, 60); const ri = +args[0], c = E.ROAD_CURVES[ri], b = H.beds[ri], [i0, i1] = (args[1] ?? '0-40').split('-').map(Number);
        for (let i = i0; i <= Math.min(i1, c.length - 1); i++) { const [x, z] = c[i], nr = stamps.map(s => [s.id, edgeDist(s, x, z)]).sort((p, q) => p[1] - q[1])[0]; console.log(`${i} ${Math.round(x)},${Math.round(z)} bed ${b[i].toFixed(1)} placed ${G0(x, z).toFixed(1)} ground ${H(x, z).toFixed(1)} land ${E.eldoriaHeight(x, z).toFixed(1)} (${nr[0]} ${Math.round(nr[1])})`); } }
    else if (cmd === 'survey') {   // the whole land: lowland cliffs, isolated flooded pits, places in water
        const S2 = 16, out = { cliff: [], pit: [] }, inPlace = (x, z) => stamps.some(st => edgeDist(st, x, z) < 0);
        for (let x = -5500; x < 5500; x += S2) for (let z = -5500; z < 5500; z += S2) {
            const h = H(x, z); if (h < -6) continue;
            const gx = (H(x + 2, z) - H(x - 2, z)) / 4, gz = (H(x, z + 2) - H(x, z - 2)) / 4, g = Math.hypot(gx, gz);
            if (g > 1.2 && h < 40 && !inPlace(x, z)) out.cliff.push([x, z, +g.toFixed(1), +h.toFixed(0)]);
            if (h < -2.3 && h > -6 && !inPlace(x, z)) {   // under the water: a pit if the land rises all round within 40 m
                let rim = 0; for (let a = 0; a < 6.28; a += 0.785) { let m = h; for (let r = 4; r <= 40; r += 4) m = Math.max(m, H(x + Math.cos(a) * r, z + Math.sin(a) * r)); if (m > -1.5) rim++; }
                if (rim === 8) out.pit.push([x, z, +h.toFixed(1)]);
            }
        }
        const cl = (l, d = 60) => { const g = []; for (const p of l) { const q = g.find(c => Math.hypot(c[0] - p[0], c[1] - p[1]) < d); if (q) q[3]++; else g.push([p[0], p[1], p[2], 1]); } return g.sort((a, b) => b[3] - a[3]); };
        console.log('lowland cliffs (clusters, worst first):', JSON.stringify(cl(out.cliff).slice(0, 12)));
        console.log('isolated pits:', JSON.stringify(cl(out.pit).slice(0, 12)));
        const under = E.LAYOUT_PLACES?.() ?? []; console.log('places checked separately');
    }
    else if (cmd === 'river') {   // along the river's course: where it runs dry (the land above its water)
        const R = E.RIVER_COURSE; let dry = [];
        for (let i = 0; i < R.length; i++) { const [x, z] = R[i], h = H(x, z), l = E.eldoriaHeight(x, z); if (h > -2.2) dry.push(`${Math.round(x)},${Math.round(z)} ground ${h.toFixed(1)} land ${l.toFixed(1)}`); }
        console.log(R.length + ' points; dry: ' + dry.length); for (const d of dry.slice(0, 60)) console.log('  ' + d);
    }
    else if (cmd === 'isles') { const A = E.ARCHIPELAGO_ISLES; console.log('centre', Math.round(E.ARCHIPELAGO.x), Math.round(E.ARCHIPELAGO.z)); for (const I of A) console.log(`isle ${Math.round(I.x)},${Math.round(I.z)} r ${Math.round(I.r)} h ${I.h.toFixed(0)} ground@centre ${H(I.x, I.z).toFixed(1)}`); }
    else if (cmd === 'streets') {   // Thaloria's street graph: connected? and do routes stay on the streets?
        const T = await vite.ssrLoadModule('/src/content/thaloriaCity.js'); console.log(JSON.stringify(T.streetGraphStats()));
        let off = 0, n = 0, len = 0; const rnd = (a => () => (a = (a * 16807) % 2147483647) / 2147483647)(7);
        for (let k = 0; k < 60; k++) { const p = T.route(-150 + rnd() * 300, -100 + rnd() * 350, -150 + rnd() * 300, -100 + rnd() * 350); for (let i = 0; i < p.length - 1; i++) for (let t = 0; t < 1; t += 0.25) { const x = p[i][0] + (p[i + 1][0] - p[i][0]) * t, z = p[i][1] + (p[i + 1][1] - p[i][1]) * t; n++; if (T.streetDist(x, z) > 1) off++; } len += p.length; }
        console.log(`60 random routes, ${len} waypoints; points off the streets (> 1 m beyond a street's edge): ${off}/${n}`);
    }
    else if (cmd === 'size') {   // the land: its area, what lies inside the mountain walls, its span
        const S2 = 25, wf = E.westFootAt ?? null; let land = 0, inside = 0, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, isles = 0;
        for (let x = -5600; x < 5600; x += S2) for (let z = -5600; z < 5600; z += S2) {
            const h = H(x, z); if (h < -2) continue; land++;
            if (Math.hypot(x - E.ARCHIPELAGO.x, z - E.ARCHIPELAGO.z) < 1250) isles++;
            if (h < 60 && z > E.northFootOf(x) - 250 && x > E.westFootOf(z) - 250) { inside++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
        }
        const km2 = n => (n * S2 * S2 / 1e6).toFixed(1);
        console.log(`land in the world: ${km2(land)} km² · inside the mountain walls (below 60 m): ${km2(inside)} km² · of it the isles ${km2(isles)} km² · span inside the walls ${((x1 - x0) / 1000).toFixed(1)} km east–west × ${((z1 - z0) / 1000).toFixed(1)} km north–south`);
    }
    else if (cmd === 'nythoria') {   // build the Nythoria world (no rendering): its stations, spawns, places, a few heights
        console.error('loading…'); const N = await vite.ssrLoadModule('/src/content/world/nythoria.js'); console.error('loaded; creating…'); const w = N.createNythoriaWorld({ quality: { foliage: 0.3, shadows: false, particles: 0.5, fogFar: 0.75 } });
        console.log('stations', w.stations.map(s => s.mode + '→' + (s.to ?? '')).join(', '), '· spawns', Object.keys(w.spawns).slice(0, 12).join(', '), '· stamps', w.stamps.map(s => s.id).join(','), '· places', (w.mapInfo?.places ?? []).map(p => p.name).join(' / ')); process.exit(0);
    }
    else if (cmd === 'rect') { for (const st of stamps) if (!args[0] || st.id === args[0]) console.log(st.id, 'rect', JSON.stringify(st.rect), 'world x', Math.round(st.X0), '…', Math.round(st.X1), 'z', Math.round(st.Z0), '…', Math.round(st.Z1)); }
    else if (cmd === 'places') {   // each place on the map: a real map set in there, or only a marker
        const L = (await import('../src/content/world/eldoria_layout.json', { with: { type: 'json' } })).default;
        for (const p of L.places) { if (p.plane && p.plane !== 'Eldoria') continue; const [x, z] = p.world; const st = stamps.map(s => [s.id, edgeDist(s, x, z)]).sort((a, b) => a[1] - b[1])[0];
            console.log(`${(st[1] <= 0 ? 'BUILT  ' : 'MARKER ')} ${p.name.padEnd(44)} ${st[1] <= 0 ? '(in ' + st[0] + ')' : '(nearest place ' + st[0] + ', ' + Math.round(st[1]) + ' m)'}${p.origin ? '  [' + p.origin + ']' : ''}`); }
    }
    else console.log('checks: seams | wading | roads | road <i> [from-to] | survey | river | isles | streets | places | at x,z …');
} finally { await vite.close(); }
