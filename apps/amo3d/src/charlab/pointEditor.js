// The point editor (2026-11-23: "make the face editor"): reshape the v2 base bodies by hand, in the browser — no Blender.
// The body is shown still (its rest shape) with every point as a dot; click a dot and drag it (it moves in the plane facing
// you; its mirror on the other side follows). Arrows nudge the selected point (Shift: toward/away from you). Save writes
// the moved points to src/content/models/v2/edits_<sex>.json (the same edits the Blender round trip uses) and reloads.
//   createPointEditor({ THREE, scene, camera, renderer, getBody(sex) → { table }, sexes, viewRect() → the part of the canvas
//   the edited body is drawn in (the Lab splits the screen when the compare is shown), onEnter, onExit })
// The panel's Show row turns the reference sheet and the compare (the Lab's other model, drawn by the Lab) on or off.
import REF_HAIR from './base_mesh_reference.jpg';
import REF_BALD from './base_mesh_reference_bald.jpg';   // (the hairless sheet: same layout)   // the reference sheet (docs/3d/characters/base_mesh_reference.jpg), 896 × 1200
// Where each view sits on the sheet: [x0, y0, x1, y1] — the whole figure, and its head
const REF = {
    male: { front: [[70, 75, 360, 615], [130, 70, 250, 215]], side: [[380, 75, 560, 615], [395, 70, 520, 215]], back: [[560, 75, 860, 615], [650, 70, 770, 215]] },
    female: { front: [[70, 655, 360, 1195], [130, 650, 250, 800]], side: [[380, 655, 560, 1195], [385, 650, 530, 800]], back: [[560, 655, 860, 1195], [640, 650, 780, 800]] },
};
export function createPointEditor({ hairless = false, THREE, scene, camera, renderer, getBody, sexes = ['male', 'female'], viewRect = null, onEnter, onExit }) {
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
    const rSex = row(); if (sexes.includes('male')) btn(rSex, 'Male', () => load('male')); if (sexes.includes('female')) btn(rSex, 'Female', () => load('female'));
    // what to see beside the body: the reference sheet, the compare (the Lab's other model, same angle), both or neither
    let refOn = true, cmpOn = true;
    const rShow = row(), showLab = document.createElement('span'); showLab.textContent = 'Show:'; showLab.style.cssText = 'align-self:center;margin-right:2px'; rShow.append(showLab);
    const tog = (b, v) => { b.style.background = v ? '#8a6a2a' : '#4a3220'; b.style.opacity = v ? '1' : '.7'; };
    const refTog = btn(rShow, 'Reference', () => setRef(!refOn)), cmpTog = btn(rShow, 'Compare', () => { cmpOn = !cmpOn; tog(cmpTog, cmpOn); });
    tog(refTog, refOn); tog(cmpTog, cmpOn);
    // the hair (hidden: its points can't be picked, the scalp and the face show) and the eyes and brows (as last saved: they
    // settle onto the reshaped face once saved and reloaded) — no reload, the unsaved edits stay
    let hairOn = true, eyesOn = true, mouthOn = true, faceMesh = null, mouthMesh = null;
    const hairTog = btn(rShow, 'Hair', () => { hairOn = !hairOn; tog(hairTog, hairOn); applyHair(); });
    const eyesTog = btn(rShow, 'Eyes', () => { eyesOn = !eyesOn; tog(eyesTog, eyesOn); if (faceMesh) faceMesh.visible = eyesOn; });
    const mouthTog = btn(rShow, 'Mouth', () => { mouthOn = !mouthOn; tog(mouthTog, mouthOn); if (mouthMesh) mouthMesh.visible = mouthOn; });
    tog(hairTog, hairOn); tog(eyesTog, eyesOn); tog(mouthTog, mouthOn);
    function applyHair() {
        if (!T) return;
        const H = T.hair, idx = hairOn || !H ? T.idx : T.idx.filter((_, n, a) => { const b = n - (n % 3); return !(H[a[b]] && H[a[b + 1]] && H[a[b + 2]]); });
        geo.setIndex(idx); if (sel >= 0 && !hairOn && H?.[sel]) sel = -1;
        buildDots(); describe();
    }
    const rReg = row(); btn(rReg, 'Head', () => setRegion('head')); btn(rReg, 'Upper body', () => setRegion('upper')); btn(rReg, 'Whole body', () => setRegion('all'));
    const rView = row(); for (const [t, y, p] of [['Front', 0, 0.05], ['¾', 0.7, 0.1], ['Side', Math.PI / 2, 0.05], ['Back', Math.PI, 0.05], ['Below', 0.3, -0.6]]) btn(rView, t, () => { yaw = y; pitch = p; });
    const info = document.createElement('div'); info.style.cssText = 'font-size:12px;min-height:30px'; panel.append(info);
    const rAct = row(); btn(rAct, 'Undo', () => doUndo()); btn(rAct, 'Reset point', () => resetSel()); btn(rAct, 'Reset all', () => resetAll());
    const rSave = row(); btn(rSave, 'Save', () => save()).style.background = '#8a6a2a'; btn(rSave, 'Close', () => exit());
    document.body.append(panel);

    // the reference, beside the model: the same body, the same side, framed like the editor (head or whole figure)
    const refBox = document.createElement('div');
    refBox.style.cssText = 'position:fixed;left:12px;top:56px;width:300px;display:none;flex-direction:column;gap:6px;font:13px Georgia,serif;color:#f1e4c4;background:#2a1c10ee;border:1px solid #c8963a88;border-radius:10px;padding:8px;z-index:4';
    const refHead = document.createElement('div'); refHead.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:6px';
    const refLabel = document.createElement('span'); refLabel.style.cssText = 'color:#f3d88b';
    const refBtns = document.createElement('span');
    const REF_URL = hairless ? REF_BALD : REF_HAIR;
    const refPic = document.createElement('div'); refPic.style.cssText = `width:284px;border-radius:6px;background-image:url(${REF_URL});background-repeat:no-repeat;background-color:#3b3b3b`;
    let refMode = 'auto', refSize = 284;
    const small = (t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:12px Georgia,serif;padding:3px 7px;margin-left:3px;border-radius:6px;border:1px solid #c8963a88;background:#4a3220;color:#f1e4c4;cursor:pointer'; b.onclick = fn; refBtns.append(b); return b; };
    small('Sheet', () => { refMode = refMode === 'sheet' ? 'auto' : 'sheet'; drawRef(true); });
    small('−', () => { refSize = Math.max(180, refSize - 60); drawRef(true); });
    small('+', () => { refSize = Math.min(620, refSize + 60); drawRef(true); });
    small('Hide', () => setRef(false));
    function setRef(v) { refOn = v; tog(refTog, v); refBox.style.display = on && v ? 'flex' : 'none'; if (v) drawRef(true); }
    refHead.append(refLabel, refBtns); refBox.append(refHead, refPic); document.body.append(refBox);
    let lastRef = '';
    function drawRef(force = false) {
        const a = ((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), view = a < 0.9 || a > 5.4 ? 'front' : a > 2.3 && a < 4.0 ? 'back' : 'side';
        const key = `${sex}|${view}|${region}|${refMode}|${refSize}`; if (key === lastRef && !force) return; lastRef = key;
        const box = refMode === 'sheet' ? [0, 0, 896, 1200] : REF[sex][view][region === 'head' ? 1 : 0], [x0, y0, x1, y1] = box, k = refSize / (x1 - x0);
        refBox.style.width = `${refSize + 16}px`;
        Object.assign(refPic.style, { width: `${refSize}px`, height: `${Math.round((y1 - y0) * k)}px`, backgroundSize: `${Math.round(896 * k)}px ${Math.round(1200 * k)}px`, backgroundPosition: `${-Math.round(x0 * k)}px ${-Math.round(y0 * k)}px` });
        refLabel.textContent = (refMode === 'sheet' ? 'Reference — the sheet' : `Reference — ${sex}, ${view}`) + (hairless ? ' (no hair)' : '');
    }

    function setRegion(r) {
        region = r;
        const top = T ? Math.max(...T.P.filter((_, j) => j % 3 === 1)) : 1.85;   // (the crown's height: frame from it)
        if (r === 'head') { target.set(0, top - 0.19, 0.02); dist = 0.78; } else if (r === 'upper') { target.set(0, top - 0.45, 0); dist = 1.3; } else { target.set(0, top / 2, 0); dist = 3.6; }
        buildDots();
    }
    const inRegion = i => { const y = T.P[i * 3 + 1], top = T.P.reduce((m, v, j) => (j % 3 === 1 && v > m ? v : m), 0); return region === 'all' || (region === 'head' ? y > top - 0.42 : y > top - 0.9); };

    function load(s) {
        sex = s; const B = getBody(s); T = B.table; sel = -1; undo.length = 0;
        group.clear();
        geo = new THREE.BufferGeometry();
        bind = Float32Array.from(T.P);   // the rest shape (what is saved); the view shows it posed (T.L, T.t: the A-pose)
        Linv = T.keys.map((_, i) => { const m = new THREE.Matrix3().fromArray(T.L.slice(i * 9, i * 9 + 9)); return m.determinant() ? m.clone().invert() : new THREE.Matrix3(); });
        geo.setAttribute('position', new THREE.Float32BufferAttribute(T.P.slice(), 3));
        for (let i = 0; i < T.keys.length; i++) refresh(i);
        geo.setAttribute('color', new THREE.Float32BufferAttribute(T.C, 3)); geo.setIndex(T.idx);
        mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
        wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.18 }));
        group.add(mesh, wire);
        const feature = g => (g ? new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, side: THREE.DoubleSide })) : null);
        faceMesh = feature(T.faceGeo); mouthMesh = feature(T.mouthGeo);
        if (faceMesh) { faceMesh.visible = eyesOn; group.add(faceMesh); }
        if (mouthMesh) { mouthMesh.visible = mouthOn; group.add(mouthMesh); }
        // mirrors: the point at (−x, y, z)
        const by = new Map(); T.keys.forEach((k, i) => by.set(k, i));
        mirrorOf = T.keys.map(k => { const [x, y, z] = keyPos(k); if (Math.abs(x) < 1e-4) return -2; const m = by.get(`${(-x).toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`); return m ?? -1; });
        setRegion(region); if (!hairOn) applyHair(); show();
    }
    let dotIds = [];
    function buildDots() {
        if (dots) { group.remove(dots); dots.geometry.dispose(); }
        dotIds = T.keys.map((_, i) => i).filter(i => inRegion(i) && (hairOn || !T.hair?.[i]));
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
    let bind = null, Linv = [];
    const view = (i, x, y, z) => { const L = T.L, o = i * 9; return [L[o] * x + L[o + 3] * y + L[o + 6] * z + T.t[i * 3], L[o + 1] * x + L[o + 4] * y + L[o + 7] * z + T.t[i * 3 + 1], L[o + 2] * x + L[o + 5] * y + L[o + 8] * z + T.t[i * 3 + 2]]; };
    function refresh(i) { geo.attributes.position.setXYZ(i, ...view(i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2])); }
    const moved = i => { const [x, y, z] = keyPos(T.keys[i]); return Math.hypot(bind[i * 3] - x, bind[i * 3 + 1] - y, bind[i * 3 + 2] - z) > 1e-4; };   // (keys hold 4 decimals: under 0.1 mm is 'not moved')
    function setPoint(i, x, y, z) { bind[i * 3] = x; bind[i * 3 + 1] = y; bind[i * 3 + 2] = z; refresh(i); }   // (rest-shape coordinates)
    function movePoint(i, dx, dy, dz) {
        const p = geo.attributes.position, d = new THREE.Vector3(dx, dy, dz).applyMatrix3(Linv[i]);   // the drag (posed) → the rest shape
        if (mirrorOf[i] === -2) d.x = 0;   // a point on the centre line stays on it
        setPoint(i, bind[i * 3] + d.x, bind[i * 3 + 1] + d.y, bind[i * 3 + 2] + d.z);
        const m = mirrorOf[i]; if (m >= 0) setPoint(m, bind[m * 3] - d.x, bind[m * 3 + 1] + d.y, bind[m * 3 + 2] + d.z);
        p.needsUpdate = true; geo.computeBoundingSphere(); placeDots(); describe();
    }
    function snapshot() { const p = geo.attributes.position, ids = [sel, mirrorOf[sel]].filter(i => i >= 0); undo.push(ids.map(i => [i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2]])); void p; if (undo.length > 200) undo.shift(); }
    function doUndo() { const s = undo.pop(); if (!s) return; for (const [i, x, y, z] of s) setPoint(i, x, y, z); geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function resetSel() { if (sel < 0) return; snapshot(); for (const i of [sel, mirrorOf[sel]].filter(i => i >= 0)) { const [x, y, z] = keyPos(T.keys[i]); setPoint(i, x, y, z); } geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function resetAll() { for (let i = 0; i < T.keys.length; i++) { const [x, y, z] = keyPos(T.keys[i]); setPoint(i, x, y, z); } geo.attributes.position.needsUpdate = true; undo.length = 0; placeDots(); describe(); }
    function describe() {
        const n = T.keys.filter((_, i) => moved(i)).length;
        if (sel < 0) { info.textContent = `${sex} body · ${n} points moved (not saved)`; return; }
        info.textContent = `point ${sel}${mirrorOf[sel] === -2 ? ' (centre line)' : ''} · x ${bind[sel * 3].toFixed(3)} y ${bind[sel * 3 + 1].toFixed(3)} z ${bind[sel * 3 + 2].toFixed(3)} · ${n} moved`;
    }
    async function save() {
        const edits = {};
        for (let i = 0; i < T.keys.length; i++) if (moved(i)) edits[T.keys[i]] = [+bind[i * 3].toFixed(5), +bind[i * 3 + 1].toFixed(5), +bind[i * 3 + 2].toFixed(5)];
        const r = await fetch('/api/v2edits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sex, edits }) });
        info.textContent = r.ok ? `Saved ${Object.keys(edits).length} moved points — reloading…` : `Save refused: ${(await r.json().catch(() => ({}))).error ?? r.status}`;
        if (r.ok) setTimeout(() => { const u = new URL(location.href); u.searchParams.set('edit', sex); location.href = u; }, 700);
    }

    // ---- input ----
    const canvas = renderer.domElement;
    const area = () => viewRect?.() ?? canvas.getBoundingClientRect();
    function pick(e) {
        const r = area(); if (e.clientX > r.left + r.width) return -1;   // (a click on the compare's half: no point)
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
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
        const r = area(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
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

    function show() { on = true; group.visible = true; panel.style.display = 'flex'; refBox.style.display = refOn ? 'flex' : 'none'; drawRef(true); onEnter?.(); describe(); }
    function exit() { on = false; group.visible = false; panel.style.display = 'none'; refBox.style.display = 'none'; onExit?.(); }
    return {
        enter: s => load(s ?? sex), exit, get on() { return on; }, get showCompare() { return cmpOn; }, group,
        frame() { if (!on) return; drawRef(); camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dist, target.y + Math.sin(pitch) * dist, target.z + Math.cos(yaw) * Math.cos(pitch) * dist); camera.lookAt(target); },
        state: () => ({ sex, sel, region, points: T?.keys.length ?? 0 }), _move: (i, dx, dy, dz) => { sel = i; snapshot(); movePoint(i, dx, dy, dz); }, _save: save,
    };
}
