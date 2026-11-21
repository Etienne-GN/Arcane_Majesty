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
    else console.log('checks: seams | wading | roads | road <i> [from-to] | at x,z …');
} finally { await vite.close(); }
