// Character models v2 (2026-11-22 POC; reference: docs/3d/characters/reference_v2.jpg): one continuous, faceted,
// flat-coloured skinned mesh per character instead of stacked primitives. It is bent by the same joints the classic
// model animates (hips, spine, head, arms, legs — plain Groups used as bones), so every animation keeps working.
// createSkin(root, bones): build lofted tubes and sheets in the rig's rest pose (root-local), each vertex weighted to
// one or two joints, then .build() → a THREE.SkinnedMesh added to root.
import * as THREE from 'three';
import { LITE } from '../../../engine/lib.js';

// edits (optional): { "x,y,z" (a point's generated position, root-local, 4 decimals): [x, y, z] } — positions moved by hand
// in Blender (docs/3d/characters/BLENDER.md); every generated point keeps its key so the edits find it again.
export const pointKey = p => `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`;
// share (optional): (p) → an edited position or null — for points with no edit of their own (the female head takes
// the male's head edits this way: base.js)
// Structural keys (2026-11-26, the character layers — docs/3d/characters/LAYERS_PLAN.md): besides its position key, every
// point gets a key from where it sits in the build — its section (sk.section('head')), the shape it belongs to within the
// section, its ring and its place on the ring ('head.3.2.4') — the same on every body whatever its proportions. Points that
// touch share the key of the first one made (as the position keys always did). dry: map the points (position key →
// { t: structural key, p, bone, derived }) and build no mesh — buildBase's first pass.
// topo: the Sculptor's added and removed points and turned lines, in order — ['flip', tA, tB] turns the line between two triangles; [['add', tA, tB] (a new point halfway along the edge between
// the points tA and tB, keyed addKey(tA, tB); unmoved, it stays halfway between them as they are shaped) | ['remove', tA, tB]
// (tA merged into its neighbour tB: the faces between them go)], by structural key; applied to the faces once made.
export const addKey = (a, b) => { const s = [a, b].sort().join('|'); let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0; return `add.${h.toString(16).padStart(8, '0')}`; };
export function createSkin(root, bones, { edits = null, share = null, dry = false, topo = null } = {}) {
    root.updateMatrixWorld(true);
    let sect = 'body', calls = 0;
    const pts = new Map();   // position key → { t, p, bone, derived } (the first point made at that position)
    const section = name => { sect = name; calls = 0; };
    const tag = (o, t) => { if (o && !o.t) o.t = t; return o; };
    const index = new Map(bones.map((b, i) => [b, i]));
    const at = (group, x = 0, y = 0, z = 0) => root.worldToLocal(group.localToWorld(new THREE.Vector3(x, y, z)));
    const lists = { front: { pos: [], col: [], si: [], sw: [], key: [] }, double: { pos: [], col: [], si: [], sw: [], key: [] } };
    const tmp = new THREE.Color();
    function vert(L, p, w, c, key = null, t = null) {   // key: a derived point's own stable key (its position may follow other points' edits)
        const k = key ?? pointKey(p), q = edits?.[k] ?? share?.(p);
        if (!pts.has(k)) { const wl = (typeof w === 'function' ? w() : w); let bi = 0, bw = -1; for (const [b, v] of wl) if (v > bw) { bw = v; bi = index.get(b) ?? 0; } pts.set(k, { t: t ?? `${sect}.${calls}.?${pts.size}`, p: p.clone(), bone: bi, derived: !!key }); }
        L.key.push(k); if (q) L.pos.push(q[0], q[1], q[2]); else L.pos.push(p.x, p.y, p.z); L.col.push(c.r, c.g, c.b);
        const ws = (typeof w === 'function' ? w() : w).slice(0, 4), s = ws.reduce((a, [, v]) => a + v, 0) || 1;
        for (let i = 0; i < 4; i++) { const e = ws[i]; L.si.push(e ? index.get(e[0]) ?? 0 : 0); L.sw.push(e ? e[1] / s : 0); }
    }
    function tri(mat, a, b, c, color) { const L = lists[mat]; vert(L, a.p, a.w, color, a.key, a.t); vert(L, b.p, b.w, color, b.key, b.t); vert(L, c.p, c.w, color, c.key, c.t); }
    // A loft: rings [{ c: Vector3, rx, rz, w: [[bone, weight]…] or (θ) => […], col, dy?(θ) }], θ = 0 at the front (+z).
    // opts: seg (sides), from/to (an open sheet between two angles), mat ('front' | 'double'), inward (faces inward),
    // axis 'y' (rings horizontal, the default) or 'z' (rings upright, for feet), shade(k 0…1 down the loft) → colour factor.
    function loft(rings, { seg = 8, from = 0, to = Math.PI * 2, mat = 'front', inward = false, axis = 'y', cap = false, capStart = false } = {}) {
        if (rings[0].pts) { seg = rings[0].pts.length; from = 0; to = Math.PI * 2; }   // hand-placed rings: their own point count, closed
        const closed = to - from >= Math.PI * 2 - 1e-6, n = closed ? seg : seg + 1;
        const ring = r => r.pts ? r.pts.map(([px, pz, py = 0]) => ({ p: new THREE.Vector3(r.c.x + px, r.c.y + py, r.c.z + pz), w: typeof r.w === 'function' ? r.w(Math.atan2(px, pz), px) : r.w })) : Array.from({ length: n }, (_, i) => {
            const th = from + (to - from) * (i / seg), s = Math.sin(th), co = Math.cos(th);
            if (r.shape) { const [ox, oz] = r.shape(th); return { p: new THREE.Vector3(r.c.x + ox, r.c.y + (r.dy ? r.dy(th) : 0), r.c.z + oz), w: typeof r.w === 'function' ? r.w(th) : r.w }; }   // a shaped outline (anatomy)
            const p = axis === 'y' ? new THREE.Vector3(r.c.x + s * r.rx, r.c.y + (r.dy ? r.dy(th) : 0), r.c.z + co * r.rz)
                : new THREE.Vector3(r.c.x + s * r.rx, r.c.y + co * r.rz, r.c.z + (r.dy ? r.dy(th) : 0));
            return { p, w: typeof r.w === 'function' ? r.w(th) : r.w };
        });
        const R = rings.map(ring), id = `${sect}.${++calls}`;
        R.forEach((row, k) => row.forEach((o, i) => tag(o, `${id}.${k}.${i}`)));
        for (let k = 0; k < rings.length - 1; k++) {
            const A = R[k], B = R[k + 1], colOf = rings[k].col, flatCol = typeof colOf === 'function' ? null : tmp.set(colOf).clone();
            for (let i = 0; i < seg; i++) {
                const j = closed ? (i + 1) % n : i + 1, a = A[i], b = A[j], c = B[j], d = B[i];
                // a ring's colour may vary round it (a coat open over a shirt): col(θ) at the face's middle
                const col = flatCol ?? new THREE.Color(colOf(Math.atan2((a.p.x + b.p.x) / 2 - rings[k].c.x, (a.p.z + b.p.z) / 2 - rings[k].c.z)));
                // rings go downward (top first) for 'y' lofts: keep the faces turned outward
                if (!inward) { tri(mat, a, d, c, col); tri(mat, a, c, b, col); } else { tri(mat, a, c, d, col); tri(mat, a, b, c, col); }
            }
        }
        if (capStart) {   // close the first ring too (a dome's top, a heel's back)
            const first = R[0], cr = rings[0], c = { p: cr.c.clone(), w: typeof cr.w === 'function' ? cr.w(0) : cr.w, t: `${id}.c0` }, col = tmp.set(cr.col).clone();
            for (let i = 0; i < seg; i++) { const j = (i + 1) % n; if (!inward) tri(mat, first[j], c, first[i], col); else tri(mat, first[i], c, first[j], col); }
        }
        if (cap) {   // close the last ring with a fan
            const last = R.at(-1), cr = rings.at(-1), c = { p: cr.c.clone(), w: typeof cr.w === 'function' ? cr.w(0) : cr.w, t: `${id}.c1` }, col = tmp.set(cr.col).clone();
            for (let i = 0; i < seg; i++) { const j = (i + 1) % n; if (!inward) tri(mat, last[i], c, last[j], col); else tri(mat, last[i], last[j], c, col); }
        }
    }
    // A tube along any path (a ponytail, a strap): points [{ c: Vector3, r, rz?, w, col }], rings square to the path.
    function tube(P, { seg = 7, mat = 'front', cap = true } = {}) {
        const up = new THREE.Vector3(1, 0, 0), R = [], id = `${sect}.${++calls}`;
        for (let k = 0; k < P.length; k++) {
            const a = P[Math.max(0, k - 1)].c, b = P[Math.min(P.length - 1, k + 1)].c, t = b.clone().sub(a).normalize();
            const u = up.clone().sub(t.clone().multiplyScalar(up.dot(t))).normalize(), v = t.clone().cross(u).normalize();
            R.push(Array.from({ length: seg }, (_, i) => { const th = (i / seg) * Math.PI * 2; return { p: P[k].c.clone().addScaledVector(u, Math.cos(th) * P[k].r).addScaledVector(v, Math.sin(th) * (P[k].rz ?? P[k].r)), w: P[k].w, t: `${id}.${k}.${i}` }; }));
        }
        for (let k = 0; k < P.length - 1; k++) {
            const A = R[k], B = R[k + 1], col = tmp.set(P[k].col).clone();
            for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; tri(mat, A[i], B[i], B[j], col); tri(mat, A[i], B[j], A[j], col); }
        }
        if (cap) { const last = R.at(-1), c = { p: P.at(-1).c.clone(), w: P.at(-1).w, t: `${id}.c1` }, col = tmp.set(P.at(-1).col).clone(); for (let i = 0; i < seg; i++) tri(mat, last[i], c, last[(i + 1) % seg], col); }
    }
    // Hand-authored faces: polygons of {p, w} points (fan-triangulated), turned to face away from `centre` (a convex-ish part
    // such as a head: no winding to get wrong). Coplanar points make one clean flat plane.
    function poly(points, col, centre) {
        const c = new THREE.Color(col), id = `${sect}.${++calls}`;
        points.forEach((o, i) => tag(o, `${id}.${i}`));
        for (let i = 1; i < points.length - 1; i++) {
            let a = points[0], b = points[i], d = points[i + 1];
            const n = b.p.clone().sub(a.p).cross(d.p.clone().sub(a.p)), m = a.p.clone().add(b.p).add(d.p).multiplyScalar(1 / 3).sub(centre);
            if (n.dot(m) < 0) [b, d] = [d, b];
            tri('front', a, b, d, c);
        }
    }
    // ---- the added and removed points (topo) ----
    const rec = (L, i) => ({ pos: L.pos.slice(i * 3, i * 3 + 3), col: L.col.slice(i * 3, i * 3 + 3), si: L.si.slice(i * 4, i * 4 + 4), sw: L.sw.slice(i * 4, i * 4 + 4), key: L.key[i] });
    function rewrite(L, fn) {   // each face (three vertices) → the faces it becomes
        const out = { pos: [], col: [], si: [], sw: [], key: [] };
        for (let i = 0; i < L.key.length; i += 3) for (const tr of fn([rec(L, i), rec(L, i + 1), rec(L, i + 2)])) for (const v of tr) { out.pos.push(...v.pos); out.col.push(...v.col); out.si.push(...v.si); out.sw.push(...v.sw); out.key.push(v.key); }
        Object.assign(L, out);
    }
    function applyTopo() {
        const byT = new Map(); for (const [k, r] of pts) byT.set(r.t, k);
        for (const op of topo ?? []) {
            if (!Array.isArray(op)) continue;
            const [kind, tA, tB] = op, ka = byT.get(tA), kb = byT.get(tB); if (!ka || !kb || ka === kb) continue;
            if (kind === 'add') {
                const t = addKey(tA, tB); if (byT.has(t)) continue;
                const ra = pts.get(ka), rb = pts.get(kb), pm = ra.p.clone().add(rb.p).multiplyScalar(0.5), km = pointKey(pm); if (pts.has(km)) continue;
                pts.set(km, { t, p: pm, bone: ra.bone, derived: false }); byT.set(t, km);
                const q = edits?.[km];   // (moved by a layer: where the layer puts it, like any point; else halfway, as the ends are shaped)
                for (const L of Object.values(lists)) rewrite(L, tr => {
                    for (let i = 0; i < 3; i++) {
                        const j = (i + 1) % 3, o = (i + 2) % 3, a = tr[i], b = tr[j];
                        if (!((a.key === ka && b.key === kb) || (a.key === kb && b.key === ka))) continue;
                        const w = new Map(); for (const v of [a, b]) for (let n = 0; n < 4; n++) if (v.sw[n]) w.set(v.si[n], (w.get(v.si[n]) ?? 0) + v.sw[n] / 2);
                        const ws = [...w].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = ws.reduce((x, [, v]) => x + v, 0) || 1;
                        const m = { pos: q ? [q[0], q[1], q[2]] : a.pos.map((v, n) => (v + b.pos[n]) / 2), col: a.col, si: [0, 1, 2, 3].map(n => ws[n]?.[0] ?? 0), sw: [0, 1, 2, 3].map(n => (ws[n]?.[1] ?? 0) / sum), key: km };
                        return [[a, m, tr[o]], [m, b, tr[o]]];
                    }
                    return [tr];
                });
            } else if (kind === 'flip') {   // (2026-11-27) turn the line tA–tB between its two triangles to join their other two corners
                for (const L of Object.values(lists)) {
                    const hits = []; for (let i = 0; i < L.key.length; i += 3) { const ks = [L.key[i], L.key[i + 1], L.key[i + 2]]; if (ks.includes(ka) && ks.includes(kb)) hits.push(i / 3); }
                    if (hits.length !== 2) continue;   // (not a line between two faces of this list: nothing to turn)
                    const T1 = [0, 1, 2].map(n => rec(L, hits[0] * 3 + n)), T2 = [0, 1, 2].map(n => rec(L, hits[1] * 3 + n));
                    const rot = (Tr, x, y) => { for (let r = 0; r < 3; r++) { const t = [Tr[r], Tr[(r + 1) % 3], Tr[(r + 2) % 3]]; if (t[0].key === x && t[1].key === y) return t; } return null; };
                    let t1 = rot(T1, ka, kb), t2 = t1 && rot(T2, kb, ka); if (!t1 || !t2) { t1 = rot(T1, kb, ka); t2 = t1 && rot(T2, ka, kb); }
                    if (!t1 || !t2) continue;
                    const [a, b, c] = t1, d = t2[2];   // (a→b→c and b→a→d: the quad a, d, b, c — its other diagonal c–d, the faces kept turned outward)
                    let n = 0; rewrite(L, tr => { const m = n++; if (m === hits[0]) return [[a, d, c]]; if (m === hits[1]) return [[d, b, c]]; return [tr]; });
                }
            } else if (kind === 'remove') {
                let to = null; for (const L of Object.values(lists)) { const i = L.key.indexOf(kb); if (i >= 0) { to = rec(L, i); break; } }
                if (!to) continue;
                for (const L of Object.values(lists)) rewrite(L, tr => {
                    const hasA = tr.some(v => v.key === ka); if (!hasA) return [tr];
                    if (tr.some(v => v.key === kb)) return [];   // (the faces between the two go)
                    return [tr.map(v => v.key === ka ? { ...to, col: v.col } : v)];
                });
                pts.delete(ka); byT.delete(tA);
            }
        }
    }
    function build() {
        if (topo?.length) applyTopo();
        if (dry) return { points: pts };   // (the first pass: the map only)
        const geo = new THREE.BufferGeometry(), all = { pos: [], col: [], si: [], sw: [], key: [] };
        const groups = [];
        for (const [m, key] of [['front', 0], ['double', 1]]) {
            const L = lists[m], start = all.pos.length / 3;
            for (const k of Object.keys(all)) all[k].push(...L[k]);
            groups.push([start, L.pos.length / 3, key]);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(all.pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(all.col, 3));
        geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(all.si, 4));
        geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(all.sw, 4));
        for (const [s, c, m] of groups) if (c) geo.addGroup(s, c, m);
        geo.computeVertexNormals();
        const Mat = LITE ? THREE.MeshLambertMaterial : THREE.MeshStandardMaterial, extra = LITE ? {} : { roughness: 0.85, metalness: 0.05 };
        const mats = [new Mat({ vertexColors: true, flatShading: true, ...extra }), new Mat({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, ...extra })];
        const mesh = new THREE.SkinnedMesh(geo, mats);
        mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false; mesh.userData.keep = mesh.userData.v2 = true;
        root.add(mesh); root.updateMatrixWorld(true);
        mesh.bind(new THREE.Skeleton(bones));
        mesh.userData.editKeys = all.key;   // (per vertex: the point's generated key — the Blender round trip)
        mesh.userData.points = pts;   // (position key → structural key, rest position, bone: the layers)
        return mesh;
    }
    // A point that is not drawn but that drawn points are derived from (the chin's old corner, under its rounded tip): mapped
    // with its own structural key, so the layers can move it — and what follows it follows.
    function note(o, t) { const k = pointKey(o.p); if (!pts.has(k)) { const wl = typeof o.w === 'function' ? o.w() : o.w; let bi = 0, bw = -1; for (const [b, v] of wl ?? []) if (v > bw) { bw = v; bi = index.get(b) ?? 0; } pts.set(k, { t, p: o.p.clone(), bone: bi, derived: false }); } return o; }
    return { at, loft, tube, poly, build, section, note, get points() { return pts; } };
}

// A hand-placed ring: half its outline on the +x side, from the front centre (x = 0, z > 0) round to the back centre
// (x = 0, z < 0); mirrored to the −x side. Every ring of one loft must have the same number of points.
export function ringPts(half) {
    const out = [...half];
    for (let i = half.length - 2; i >= 1; i--) out.push([-half[i][0], half[i][1], half[i][2] ?? 0]);   // (a third value: that point's own height offset)
    return out;   // front centre, +x side…, back centre, −x side… (θ increasing: the loft's own direction)
}
// An anatomical ring outline: half-width w, depth to the front df and to the back db, plus radial bumps
// [{ th, amp, wd }] (a pectoral, a shoulder blade, a calf…). θ = 0 at the front, +π/2 toward +x.
export function profile(w, df, db, bumps = []) {
    return th => {
        const s = Math.sin(th), c = Math.cos(th);
        let x = s * w, z = c * (c > 0 ? df : db);
        for (const b of bumps) { let d = th - b.th; d = Math.atan2(Math.sin(d), Math.cos(d)); const k = b.amp * Math.exp(-((d / b.wd) ** 2)); x += s * k; z += c * k; }
        return [x, z];
    };
}
// Weight helpers: a blend from bone a to bone b as t goes 0 → 1.
export const blend = (a, b, t) => (t <= 0 ? [[a, 1]] : t >= 1 ? [[b, 1]] : [[a, 1 - t], [b, t]]);
export const lerpV = (a, b, t) => a.clone().lerp(b, t);

// Moved points (absolute rest positions, by position key — what the point editor and the Blender import produce) → a layer
// ({ structural key: offset in its bone's frame }), for a built body mesh: the offsets from the body as generated (no layer).
export function layerFromPositions(mesh, positions) {
    const pts = mesh.userData.points, out = {}, bindInv = mesh.bindMatrix.clone().invert(), M = new THREE.Matrix3(), d = new THREE.Vector3();
    const frames = mesh.skeleton.boneInverses.map(bi => new THREE.Matrix3().setFromMatrix4(bindInv.clone().multiply(bi.clone().invert())).invert());
    for (const [k, q] of Object.entries(positions)) {
        const r = pts?.get(k); if (!r) continue;
        d.set(q[0] - r.p.x, q[1] - r.p.y, q[2] - r.p.z);
        if (d.lengthSq() < 1e-12) continue;
        M.copy(frames[r.bone]); d.applyMatrix3(M);
        out[r.t] = [+d.x.toFixed(6), +d.y.toFixed(6), +d.z.toFixed(6)];
    }
    return out;
}
