// The point editor (2026-11-23: "make the face editor"): reshape the v2 base bodies by hand, in the browser — no Blender.
// The body is shown still (its rest shape) with every point as a dot; click a dot and drag it (it moves in the plane facing
// you; its mirror on the other side follows). Arrows nudge the selected point (Shift: toward/away from you). Save writes
// the moved points to src/content/models/v2/edits_<sex>.json (the same edits the Blender round trip uses) and reloads.
//   createPointEditor({ THREE, scene, camera, renderer, dom, getBody(sex) → { mesh, table } , onExit })
export function createPointEditor({ THREE, scene, camera, renderer, getBody, onEnter, onExit }) {
    let on = false, sex = 'male', T = null, geo = null, mesh = null, wire = null, dots = null, sel = -1, mirrorOf = [], drag = null;
    let region = 'head', yaw = 0, pitch = 0.05, dist = 0.55, target = new THREE.Vector3(0, 1.66, 0);
    const undo = [], group = new THREE.Group(); scene.add(group); group.visible = false;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmpM = new THREE.Matrix4(), col = new THREE.Color();
    const keyPos = k => k.split(',').map(Number);

    // ---- the panel ----
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:44px;right:12px;width:270px;display:none;flex-direction:column;gap:6px;font:14px Georgia,serif;color:#f1e4c4;background:#2a1c10ee;border:1px solid #c8963a88;border-radius:10px;padding:10px';
    const row = () => { const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap'; panel.append(r); return r; };
    const btn = (parent, t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:13px Georgia,serif;padding:5px 9px;border-radius:7px;border:1px solid #c8963a88;background:#4a3220;color:#f1e4c4;cursor:pointer'; b.onclick = fn; parent.append(b); return b; };
    const title = document.createElement('div'); title.style.cssText = 'font-size:16px;color:#f3d88b'; title.textContent = 'Point editor'; panel.append(title);
    const help = document.createElement('div'); help.style.cssText = 'font-style:italic;font-size:12px;opacity:.85;line-height:1.35';
    help.innerHTML = 'Click a dot, drag it (its mirror follows).<br>Drag empty space: turn. Wheel: zoom.<br>Arrows: nudge · Shift+arrows: forward/back · Ctrl+Z: undo';
    panel.append(help);
    const rSex = row(); btn(rSex, 'Male', () => load('male')); btn(rSex, 'Female', () => load('female'));
    const rReg = row(); btn(rReg, 'Head', () => setRegion('head')); btn(rReg, 'Upper body', () => setRegion('upper')); btn(rReg, 'Whole body', () => setRegion('all'));
    const rView = row(); for (const [t, y, p] of [['Front', 0, 0.05], ['¾', 0.7, 0.1], ['Side', Math.PI / 2, 0.05], ['Back', Math.PI, 0.05], ['Below', 0.3, -0.6]]) btn(rView, t, () => { yaw = y; pitch = p; });
    const info = document.createElement('div'); info.style.cssText = 'font-size:12px;min-height:30px'; panel.append(info);
    const rAct = row(); btn(rAct, 'Undo', () => doUndo()); btn(rAct, 'Reset point', () => resetSel()); btn(rAct, 'Reset all', () => resetAll());
    const rSave = row(); btn(rSave, 'Save', () => save()).style.background = '#8a6a2a'; btn(rSave, 'Close', () => exit());
    document.body.append(panel);

    function setRegion(r) {
        region = r;
        const top = T ? Math.max(...T.P.filter((_, j) => j % 3 === 1)) : 1.85;   // (the crown's height: frame from it)
        if (r === 'head') { target.set(0, top - 0.19, 0.02); dist = 0.78; } else if (r === 'upper') { target.set(0, top - 0.45, 0); dist = 1.3; } else { target.set(0, top / 2, 0); dist = 2.8; }
        buildDots();
    }
    const inRegion = i => { const y = T.P[i * 3 + 1], top = T.P.reduce((m, v, j) => (j % 3 === 1 && v > m ? v : m), 0); return region === 'all' || (region === 'head' ? y > top - 0.42 : y > top - 0.9); };

    function load(s) {
        sex = s; const B = getBody(s); T = B.table; sel = -1; undo.length = 0;
        group.clear();
        geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(T.P.slice(), 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(T.C, 3)); geo.setIndex(T.idx);
        mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
        wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.18 }));
        group.add(mesh, wire);
        // mirrors: the point at (−x, y, z)
        const by = new Map(); T.keys.forEach((k, i) => by.set(k, i));
        mirrorOf = T.keys.map(k => { const [x, y, z] = keyPos(k); if (Math.abs(x) < 1e-4) return -2; const m = by.get(`${(-x).toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`); return m ?? -1; });
        setRegion(region); show();
    }
    let dotIds = [];
    function buildDots() {
        if (dots) { group.remove(dots); dots.geometry.dispose(); }
        dotIds = T.keys.map((_, i) => i).filter(inRegion);
        const r = region === 'head' ? 0.0028 : region === 'upper' ? 0.005 : 0.008;
        dots = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ depthTest: true }), dotIds.length);
        dots.renderOrder = 5; group.add(dots); placeDots();
    }
    function placeDots() {
        const p = geo.attributes.position;
        dotIds.forEach((i, n) => {
            tmpM.makeTranslation(p.getX(i), p.getY(i), p.getZ(i)); dots.setMatrixAt(n, tmpM);
            const isSel = i === sel || (sel >= 0 && i === mirrorOf[sel]);
            dots.setColorAt(n, col.set(isSel ? 0xff3030 : mirrorOf[i] === -2 ? 0xffe070 : moved(i) ? 0x60d0ff : 0xffffff));
        });
        dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    }
    const moved = i => { const [x, y, z] = keyPos(T.keys[i]), p = geo.attributes.position; return Math.hypot(p.getX(i) - x, p.getY(i) - y, p.getZ(i) - z) > 1e-4; };   // (keys hold 4 decimals: under 0.1 mm is 'not moved')
    function setPoint(i, x, y, z) { geo.attributes.position.setXYZ(i, x, y, z); }
    function movePoint(i, dx, dy, dz) {
        const p = geo.attributes.position;
        if (mirrorOf[i] === -2) dx = 0;   // a point on the centre line stays on it
        setPoint(i, p.getX(i) + dx, p.getY(i) + dy, p.getZ(i) + dz);
        const m = mirrorOf[i]; if (m >= 0) setPoint(m, p.getX(m) - dx, p.getY(m) + dy, p.getZ(m) + dz);
        p.needsUpdate = true; geo.computeBoundingSphere(); placeDots(); describe();
    }
    function snapshot() { const p = geo.attributes.position, ids = [sel, mirrorOf[sel]].filter(i => i >= 0); undo.push(ids.map(i => [i, p.getX(i), p.getY(i), p.getZ(i)])); if (undo.length > 200) undo.shift(); }
    function doUndo() { const s = undo.pop(); if (!s) return; for (const [i, x, y, z] of s) setPoint(i, x, y, z); geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function resetSel() { if (sel < 0) return; snapshot(); for (const i of [sel, mirrorOf[sel]].filter(i => i >= 0)) { const [x, y, z] = keyPos(T.keys[i]); setPoint(i, x, y, z); } geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function resetAll() { for (let i = 0; i < T.keys.length; i++) { const [x, y, z] = keyPos(T.keys[i]); setPoint(i, x, y, z); } geo.attributes.position.needsUpdate = true; undo.length = 0; placeDots(); describe(); }
    function describe() {
        const n = T.keys.filter((_, i) => moved(i)).length;
        if (sel < 0) { info.textContent = `${sex} body · ${n} points moved (not saved)`; return; }
        const p = geo.attributes.position;
        info.textContent = `point ${sel}${mirrorOf[sel] === -2 ? ' (centre line)' : ''} · x ${p.getX(sel).toFixed(3)} y ${p.getY(sel).toFixed(3)} z ${p.getZ(sel).toFixed(3)} · ${n} moved`;
    }
    async function save() {
        const edits = {}, p = geo.attributes.position;
        for (let i = 0; i < T.keys.length; i++) if (moved(i)) edits[T.keys[i]] = [+p.getX(i).toFixed(5), +p.getY(i).toFixed(5), +p.getZ(i).toFixed(5)];
        const r = await fetch('/api/v2edits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sex, edits }) });
        info.textContent = r.ok ? `Saved ${Object.keys(edits).length} moved points — reloading…` : `Save refused: ${(await r.json().catch(() => ({}))).error ?? r.status}`;
        if (r.ok) setTimeout(() => { const u = new URL(location.href); u.searchParams.set('edit', sex); location.href = u; }, 700);
    }

    // ---- input ----
    const canvas = renderer.domElement;
    function pick(e) {
        const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(dots, false)[0];
        return hit ? dotIds[hit.instanceId] : -1;
    }
    canvas.addEventListener('pointerdown', e => {
        if (!on) return; e.stopImmediatePropagation();
        const i = pick(e);
        if (i >= 0) {
            sel = i; snapshot();
            const p = geo.attributes.position, at = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
            drag = { kind: 'point', plane: new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), at), last: at.clone() };
            placeDots(); describe();
        } else drag = { kind: 'orbit', x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
    }, true);
    canvas.addEventListener('pointermove', e => {
        if (!on || !drag) return; e.stopImmediatePropagation();
        if (drag.kind === 'orbit') { yaw -= (e.clientX - drag.x) * 0.01; pitch = Math.max(-1.3, Math.min(1.3, pitch + (e.clientY - drag.y) * 0.01)); drag.x = e.clientX; drag.y = e.clientY; return; }
        const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); const hit = new THREE.Vector3();
        if (ray.ray.intersectPlane(drag.plane, hit)) { const d = hit.clone().sub(drag.last); drag.last.copy(hit); movePoint(sel, d.x, d.y, d.z); }
    }, true);
    canvas.addEventListener('pointerup', e => { if (on) { e.stopImmediatePropagation(); drag = null; } }, true);
    canvas.addEventListener('wheel', e => { if (!on) return; e.preventDefault(); dist = Math.max(0.2, Math.min(4, dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    addEventListener('keydown', e => {
        if (!on) return;
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); doUndo(); return; }
        if (sel < 0 || !/^Arrow/.test(e.code)) return;
        e.preventDefault();
        const step = e.altKey ? 0.0005 : 0.002, right = new THREE.Vector3(), up = new THREE.Vector3(), fwd = camera.getWorldDirection(new THREE.Vector3());
        right.crossVectors(fwd, camera.up).normalize(); up.crossVectors(right, fwd).normalize();
        const d = new THREE.Vector3();
        if (e.shiftKey) { if (e.code === 'ArrowUp') d.copy(fwd).multiplyScalar(-step); if (e.code === 'ArrowDown') d.copy(fwd).multiplyScalar(step); }
        else { if (e.code === 'ArrowLeft') d.copy(right).multiplyScalar(-step); if (e.code === 'ArrowRight') d.copy(right).multiplyScalar(step); if (e.code === 'ArrowUp') d.copy(up).multiplyScalar(step); if (e.code === 'ArrowDown') d.copy(up).multiplyScalar(-step); }
        snapshot(); movePoint(sel, d.x, d.y, d.z);
    });

    function show() { on = true; group.visible = true; panel.style.display = 'flex'; onEnter?.(); describe(); }
    function exit() { on = false; group.visible = false; panel.style.display = 'none'; onExit?.(); }
    return {
        enter: s => load(s ?? sex), exit, get on() { return on; },
        frame() { if (!on) return; camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist); camera.lookAt(target); },
        state: () => ({ sex, sel, region, points: T?.keys.length ?? 0 }), _move: (i, dx, dy, dz) => { sel = i; snapshot(); movePoint(i, dx, dy, dz); }, _save: save,
    };
}
