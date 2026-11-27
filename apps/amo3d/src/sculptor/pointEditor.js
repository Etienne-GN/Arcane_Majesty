// The point editor (2026-11-23: "make the face editor"): reshape the v2 base bodies by hand, in the browser — no Blender.
// The body is shown still (its rest shape) with every point as a dot; click a dot and drag it (it moves in the plane facing
// you; its mirror on the other side follows). Arrows nudge the selected point (Shift: toward/away from you). Save writes
// the moved points to src/content/models/v2/edits_<sex>.json (the same edits the Blender round trip uses) and reloads.
//   createPointEditor({ THREE, scene, camera, renderer, getBody(id) → { table, mesh }, bodies: [{ id, name }], viewRect() → the part of the canvas
//   the edited body is drawn in (the Sculptor splits the screen when the compare is shown), onEnter, onExit })
// The panel's Show row turns the reference sheet and the compare (the Sculptor's other model, drawn by the Lab) on or off.
import REF_HAIR from './base_mesh_reference.jpg';
import REF_BALD from './base_mesh_reference_bald.jpg';   // (the hairless sheet: same layout)   // the reference sheet (docs/3d/characters/base_mesh_reference.jpg), 896 × 1200
import { layerFromPositions } from '../content/models/v2/skin.js';
// Where each view sits on the sheet: [x0, y0, x1, y1] — the whole figure, and its head
const REF = {
    male: { front: [[70, 75, 360, 615], [130, 70, 250, 215]], side: [[380, 75, 560, 615], [395, 70, 520, 215]], back: [[560, 75, 860, 615], [650, 70, 770, 215]] },
    female: { front: [[70, 655, 360, 1195], [130, 650, 250, 800]], side: [[380, 655, 560, 1195], [385, 650, 530, 800]], back: [[560, 655, 860, 1195], [640, 650, 780, 800]] },
};
export function createPointEditor({ hairless = false, THREE, scene, camera, renderer, getBody, bodies = [], alts = {}, viewRect = null, onEnter, onExit }) {
    // alts: { layer: [alternate names] } (the Sculptor's alternates); getBody(id) also gives { alt: { layer, name } | null, go(changes) }
    // bodies: [{ id, name }] — what can be edited (the Sculptor's base bodies on stage); getBody(id) → { table, mesh }
    let loaded = null, bodyMesh = null, on = false, sex = 'male', who = bodies[0]?.id, layer = null, T = null, geo = null, mesh = null, wire = null, dots = null, sel = -1, mirrorOf = [], drag = null;
    let region = 'head', yaw = 0, pitch = 0.05, dist = 0.55, target = new THREE.Vector3(0, 1.66, 0);
    const undo = [], group = new THREE.Group(); scene.add(group); group.visible = false;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmpM = new THREE.Matrix4(), col = new THREE.Color();
    const keyPos = k => k.split(',').map(Number);

    // ---- phones (2026-11-26: the Sculptor from a phone's browser on the dev server) ----
    // the panel is a sheet along the bottom (collapsible), the view shifted up above it; a tap picks the nearest dot within a
    // finger's reach (the dots are tiny); two fingers pinch to zoom; a pad of buttons nudges the point (no arrow keys)
    const MOBILE = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
    renderer.domElement.style.touchAction = 'none';
    // ---- the panel ----
    const panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;top:44px;right:12px;width:270px;display:none;flex-direction:column;gap:6px;font:14px Georgia,serif;color:#f1e4c4;background:#2a1c10ee;border:1px solid #c8963a88;border-radius:10px;padding:10px';
    const row = () => { const r = document.createElement('div'); r.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap'; panel.append(r); return r; };
    const btn = (parent, t, fn) => { const b = document.createElement('button'); b.textContent = t; b.style.cssText = 'font:13px Georgia,serif;padding:5px 9px;border-radius:7px;border:1px solid #c8963a88;background:#4a3220;color:#f1e4c4;cursor:pointer'; b.onclick = fn; parent.append(b); return b; };
    const title = document.createElement('div'); title.style.cssText = 'font-size:16px;color:#f3d88b'; title.textContent = 'Point editor'; panel.append(title);
    let folded = false;
    if (MOBILE) {   // (the sheet: full width along the bottom; tap the title to fold it down to its first lines)
        Object.assign(panel.style, { top: 'auto', bottom: '0', left: '0', right: '0', width: 'auto', maxHeight: '44vh', overflowY: 'auto', borderRadius: '12px 12px 0 0', font: '15px Georgia,serif', padding: '8px 10px', zIndex: '6' });
        title.textContent = 'Point editor ▾'; title.style.cursor = 'pointer';
        title.onclick = () => { folded = !folded; title.textContent = `Point editor ${folded ? '▴' : '▾'}`; for (const c of panel.children) if (c !== title && c !== info) c.style.display = folded ? 'none' : ''; };
    }
    const help = document.createElement('div'); help.style.cssText = 'font-style:italic;font-size:12px;opacity:.85;line-height:1.35';
    help.innerHTML = MOBILE ? 'Tap a dot (the nearest is taken), drag it — its mirror follows. Drag empty space: turn. Two fingers: zoom. The pad below nudges the point.'
        : 'Click a dot, drag it (its mirror follows).<br>Drag empty space: turn. Wheel: zoom.<br>Arrows: nudge · Shift+arrows: forward/back · Ctrl+Z: undo';
    panel.append(help);
    const rSex = row(); for (const b of bodies) btn(rSex, b.name, () => load(b.id));
    // the layer the edits are saved into (docs/3d/characters/LAYERS_PLAN.md): Common (every body), the sex, or the age —
    // only the difference from the other layers goes in, so an edit on the boy stays the boy's
    const stackOf = () => [...(bodyMesh?.userData.layers ?? [sex]), ...(B?.io ? ['override'] : [])];   // (a cast character: its own override on top)
    const LAYER_LABEL = { override: 'This character', common: 'Common', male: 'Male', female: 'Female', boy: 'Boy', girl: 'Girl', old_man: 'Old man', old_woman: 'Old woman' };
    const rLayer = row(), layerBtns = [];
    const showLayers = () => {
        rLayer.replaceChildren(); layerBtns.length = 0;
        const lab = document.createElement('span'); lab.textContent = 'Save into:'; lab.style.cssText = 'align-self:center;margin-right:2px'; rLayer.append(lab);
        for (const n of stackOf()) { const b = btn(rLayer, LAYER_LABEL[n] ?? n, () => { layer = n; showLayers(); }); b.style.background = n === layer ? '#8a6a2a' : '#4a3220'; layerBtns.push(b); }
        showVersions(); countSaves?.();
    };
    // the version of that layer being worked on: the active one (what the game builds) or an alternate (layers/alt/) —
    // switch, save the work as a new alternate, make the alternate active (the old active is kept as an alternate), delete it
    let B = null;   // (what getBody gave: the alternate this body shows, and how to reload the page)
    const rVer = row();
    const showVersions = () => {
        rVer.replaceChildren(); if (!B || layer === 'override') return;   // (a character's override has no alternates)
        const lab = document.createElement('span'); lab.textContent = 'Version:'; lab.style.cssText = 'align-self:center;margin-right:2px'; rVer.append(lab);
        const sel = document.createElement('select'); sel.style.cssText = 'font:13px Georgia,serif;padding:4px;border-radius:7px;background:#4a3220;color:#f1e4c4;border:1px solid #c8963a88;max-width:150px';
        const cur = B.alt?.layer === layer ? B.alt.name : '';
        for (const [v, t] of [['', 'Active'], ...(alts[layer] ?? []).map(a => [a, a])]) { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.append(o); }
        sel.value = cur; sel.onchange = () => B.go({ alt: sel.value ? `${layer}:${sel.value}` : null, edit: who, layer });
        rVer.append(sel);
        btn(rVer, 'Save as new…', async () => { const name = (prompt('Name of the new alternate (a-z, 0-9, _ or -):') ?? '').trim().toLowerCase(); if (name) await saveTo(name); });
        if (cur) {
            btn(rVer, 'Make active', async () => {
                if (sessionMoves() > 0 && !confirm('Unsaved moves will be lost. Make it active anyway?')) return;
                const r = await fetch('/api/v2alts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate', layer, alt: cur }) });
                const j = await r.json().catch(() => ({})); info.textContent = r.ok ? `"${cur}" is now the ${LAYER_LABEL[layer]} layer (the old one kept as "${j.kept}")` : `Refused: ${j.error ?? r.status}`;
                if (r.ok) setTimeout(() => B.go({ alt: null, edit: who, layer }), 900);
            });
            btn(rVer, 'Delete', async () => {
                if (!confirm(`Delete the alternate "${cur}"?`)) return;
                const r = await fetch('/api/v2alts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', layer, alt: cur }) });
                if (r.ok) B.go({ alt: null, edit: who, layer });
            });
        }
    };
    // adding and removing points (saved into the chosen layer as its "@topo": skin.js): Add — the selected point, then a
    // neighbour: a new point halfway between them (it changes nothing until moved); Remove — the selected point merges into
    // its nearest neighbour. Each is done on the mirror too, saved at once (with any unsaved moves) and the page reloads.
    let addFrom = -1;
    const rPts = row(), ptsLab = document.createElement('span'); ptsLab.textContent = 'Points:'; ptsLab.style.cssText = 'align-self:center;margin-right:2px'; rPts.append(ptsLab);
    btn(rPts, 'Add…', () => { if (sel < 0) { info.textContent = 'Select a point first, then Add, then click a neighbour.'; return; } addFrom = sel; info.textContent = 'Now click a neighbouring point: the new point goes halfway between them (Esc: cancel).'; });
    btn(rPts, 'Remove', () => {
        if (sel < 0) { info.textContent = 'Select the point to remove first.'; return; }
        const nb = neighbours(sel); if (!nb.length) return;
        const d = j => Math.hypot(bind[j * 3] - bind[sel * 3], bind[j * 3 + 1] - bind[sel * 3 + 1], bind[j * 3 + 2] - bind[sel * 3 + 2]);
        topoOp('remove', sel, nb.reduce((a, j) => (d(j) < d(a) ? j : a)));
    });
    // what to see beside the body: the reference sheet, the compare (the Sculptor's other model, same angle), both or neither
    let refOn = !MOBILE, cmpOn = !MOBILE;   // (a phone: neither, by default — the screen is small)
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
    const rAct = row(); btn(rAct, 'Undo move', () => doUndo()); btn(rAct, 'Reset point', () => resetSel()); btn(rAct, 'Reset all', () => resetAll());
    if (MOBILE) {   // the nudge pad: the arrow keys' moves, in the view's frame (In/Out: toward or away from you); Fine: a quarter step
        let fine = false; const rPad = row(), lab = document.createElement('span'); lab.textContent = 'Nudge:'; lab.style.cssText = 'align-self:center'; rPad.append(lab);
        for (const [t, k] of [['←', 'ArrowLeft'], ['↑', 'ArrowUp'], ['↓', 'ArrowDown'], ['→', 'ArrowRight'], ['In', 'in'], ['Out', 'out']]) btn(rPad, t, () => nudge(k, fine)).style.minWidth = '40px';
        const fb = btn(rPad, 'Fine', () => { fine = !fine; fb.style.background = fine ? '#8a6a2a' : '#4a3220'; });
    }
    // Undo last save: every save (moves, added or removed points) keeps the version it replaced on the dev server; this puts
    // it back, one save at a time, as often as there are saves to take back (2026-11-26: "I moved a point and can't undo")
    const rSave = row(); btn(rSave, 'Save', () => save()).style.background = '#8a6a2a';
    const undoSave = btn(rSave, 'Undo last save', async () => {
        if (layer === 'override') { info.textContent = 'A character\'s own override has no save history yet.'; return; }
        const alt = B?.alt?.layer === layer ? B.alt.name : null;
        if (sessionMoves() > 0 && !confirm('Unsaved moves will be lost. Undo the last save anyway?')) return;
        const r = await fetch('/api/v2undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layer, alt }) });
        const j = await r.json().catch(() => ({}));
        info.textContent = r.ok ? `The ${LAYER_LABEL[layer] ?? layer} layer is back as it was before its last save (${j.count} more to undo) — reloading…` : `Nothing to undo: ${j.error ?? r.status}`;
        if (r.ok) setTimeout(() => B.go({ edit: who, layer, alt: alt ? `${layer}:${alt}` : null }), 700);
    });
    btn(rSave, 'Close', () => exit());
    const countSaves = async () => { if (!B || layer === 'override') { undoSave.textContent = 'Undo last save'; return; } const alt = B.alt?.layer === layer ? B.alt.name : ''; const j = await fetch(`/api/v2undo?layer=${layer}${alt ? `&alt=${alt}` : ''}`).then(r => r.json()).catch(() => ({ count: 0 })); undoSave.textContent = `Undo last save (${j.count ?? 0})`; undoSave.disabled = !j.count; undoSave.style.opacity = j.count ? '1' : '.5'; };
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
        who = s; B = getBody(s); T = B.table; bodyMesh = B.mesh; sex = bodyMesh.userData.editSex ?? 'male'; sel = -1; undo.length = 0;
        const Ls = stackOf(); if (!Ls.includes(layer)) layer = Ls.at(-1); showLayers();   // (by default the body's own: its age layer, else its sex)
        group.clear();
        geo = new THREE.BufferGeometry();
        bind = Float32Array.from(T.P); loaded = Float32Array.from(T.P);   // (loaded: as it came — what was moved here, at saving)   // the rest shape (what is saved); the view shows it posed (T.L, T.t: the A-pose)
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
        if (sel < 0) { info.textContent = `${bodies.find(b => b.id === who)?.name ?? sex} · ${n} points moved (not saved) → ${LAYER_LABEL[layer] ?? layer} layer`; return; }
        info.textContent = `point ${sel}${mirrorOf[sel] === -2 ? ' (centre line)' : ''} · x ${bind[sel * 3].toFixed(3)} y ${bind[sel * 3 + 1].toFixed(3)} z ${bind[sel * 3 + 2].toFixed(3)} · ${n} moved`;
    }
    // the layer's source as this body is built from it: its alternate if it shows one, else the active file
    const sessionMoves = () => { let c = 0; for (let i = 0; i < (T?.keys.length ?? 0); i++) if (Math.hypot(bind[i * 3] - loaded[i * 3], bind[i * 3 + 1] - loaded[i * 3 + 1], bind[i * 3 + 2] - loaded[i * 3 + 2]) > 1e-6) c++; return c; };
    // a layer read and written: the shared layers through /api/v2layer; 'override' (the character's own) through getBody's io
    const readL = n => (n === 'override' ? B.io.read() : fetch(`/api/v2layer?${src(n)}`).then(r => r.json()));
    const writeL = (n, points, alt) => (n === 'override' ? B.io.write(points) : fetch('/api/v2layer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layer: n, points, ...(alt ? { alt } : {}) }) }));
    const src = n => `layer=${n}` + (B?.alt?.layer === n ? `&alt=${B.alt.name}` : '');
    const save = () => saveTo(B?.alt?.layer === layer ? B.alt.name : null);
    const neighbours = i => { const s = new Set(), I = T.idx; for (let f = 0; f < I.length; f += 3) { const a = I[f], b = I[f + 1], c = I[f + 2]; if (a === i || b === i || c === i) for (const v of [a, b, c]) if (v !== i) s.add(v); } return [...s]; };
    function topoOp(kind, i, j) {   // (with the mirror: the centre line maps to itself; a point with no mirror, none)
        const pm = bodyMesh.userData.points, t = k => pm.get(T.keys[k])?.t, m = k => (mirrorOf[k] === -2 ? k : mirrorOf[k]), g = Date.now();
        if (!t(i) || !t(j)) return;
        const ops = [[kind, t(i), t(j), g]], mi = m(i), mj = m(j);
        if (mi >= 0 && mj >= 0 && !(new Set([mi, mj]).size === 2 && [mi, mj].every(x => x === i || x === j)) && t(mi) && t(mj)) ops.push([kind, t(mi), t(mj), g]);
        info.textContent = `${kind === 'add' ? 'Adding' : 'Removing'} ${ops.length === 2 ? 'a point and its mirror' : 'a point'} — saving…`;
        saveTo(B?.alt?.layer === layer ? B.alt.name : null, ops);
    }
    async function saveTo(alt, topoAdd = null, replace = null) {   // alt: the alternate to write (null: the active layer); topoAdd: points added/removed; replace: entries to set as they are
        // (2026-11-26: saved into the chosen shape layer, as offsets in each point's bone frame, so they land on every body
        // that stacks it whatever its proportions.) The body's total offset from its plain build, less what the other layers
        // of its stack already give, is the chosen layer's entry. Merged into the layer as this body has it (a new alternate
        // starts as a copy of it): entries the table cannot show (the chin's hidden corners) stay, and only what was moved
        // in this session is written — a point derived from others (the chin's rounded tip) keeps following unless moved.
        const stack = stackOf(), others = {};
        for (const n of stack) if (n !== layer) others[n] = await readL(n);
        const points = await readL(layer), pm = bodyMesh.userData.points;
        let changed = 0;
        for (let i = 0; i < T.keys.length; i++) {
            const k = T.keys[i], r0 = pm?.get(k); if (!r0) continue;
            const here = Math.hypot(bind[i * 3] - loaded[i * 3], bind[i * 3 + 1] - loaded[i * 3 + 1], bind[i * 3 + 2] - loaded[i * 3 + 2]) > 1e-6;
            if (!here) continue;
            const tot = layerFromPositions(bodyMesh, { [k]: [bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2]] })[r0.t] ?? [0, 0, 0];
            const v = tot.map((x, j) => Object.values(others).reduce((a, L) => a - (L[r0.t]?.[j] ?? 0), x));
            if (Math.hypot(...v) < 1e-6) delete points[r0.t]; else points[r0.t] = v.map(x => +x.toFixed(6));
            changed++;
        }
        if (topoAdd) points['@topo'] = [...(points['@topo'] ?? []), ...topoAdd];
        if (replace) Object.assign(points, replace);
        if (Array.isArray(points['@topo']) && !points['@topo'].length) delete points['@topo'];
        const r = await writeL(layer, points, alt);
        const where = `the ${LAYER_LABEL[layer] ?? layer} layer` + (alt ? ` (alternate "${alt}")` : '');
        info.textContent = r.ok ? `Saved ${changed} moved points into ${where} — reloading…` : `Save refused: ${(await r.json().catch(() => ({}))).error ?? r.status}`;
        if (r.ok) setTimeout(() => B.go({ edit: who, layer, alt: alt ? `${layer}:${alt}` : null }), 700);
    }

    // ---- input ----
    const canvas = renderer.domElement;
    const area = () => viewRect?.() ?? canvas.getBoundingClientRect();
    function pick(e) {
        const r = area(); if (e.clientX > r.left + r.width) return -1;   // (a click on the compare's half: no point)
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(dots, false)[0];
        if (hit || !MOBILE) return hit ? dotIds[hit.instanceId] : -1;
        // a finger: the nearest dot on screen within ~28 px that is not hidden behind the surface
        const p = geo.attributes.position, v = new THREE.Vector3(), cand = [];
        for (const i of dotIds) { v.set(p.getX(i), p.getY(i), p.getZ(i)).project(camera); if (v.z > 1) continue; const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height, d = Math.hypot(sx - e.clientX, sy - e.clientY); if (d < 28) cand.push([d, i]); }
        cand.sort((a, b) => a[0] - b[0]);
        const eye = camera.getWorldPosition(new THREE.Vector3());
        for (const [, i] of cand.slice(0, 8)) {
            const at = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)), dir = at.clone().sub(eye), len = dir.length(); ray.set(eye, dir.normalize());
            const h = ray.intersectObject(mesh, false)[0]; if (!h || h.distance > len - 0.006) return i;
        }
        return -1;
    }
    const touches = new Map(); let pinch = null;   // (two fingers: zoom)
    canvas.addEventListener('pointerdown', e => {
        if (!on) return; e.stopImmediatePropagation();
        touches.set(e.pointerId, [e.clientX, e.clientY]);
        if (touches.size === 2) { const [a, b2] = [...touches.values()]; pinch = { d: Math.hypot(a[0] - b2[0], a[1] - b2[1]), dist }; if (drag?.kind === 'point') doUndo(); drag = null; return; }
        const i = pick(e);
        if (addFrom >= 0 && i >= 0) {   // (Add…: the second point)
            const from = addFrom; addFrom = -1;
            if (i !== from && neighbours(from).includes(i)) topoOp('add', from, i); else info.textContent = 'Not a neighbour of the selected point (they must share an edge) — Add cancelled.';
            return;
        }
        if (i >= 0) {
            sel = i; snapshot();
            const p = geo.attributes.position, at = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
            drag = { kind: 'point', plane: new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), at), last: at.clone(), x0: e.clientX, y0: e.clientY, live: !MOBILE };
            placeDots(); describe();
        } else drag = { kind: 'orbit', x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
    }, true);
    canvas.addEventListener('pointermove', e => {
        if (!on) return;
        if (touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
        if (pinch && touches.size === 2) { e.stopImmediatePropagation(); const [a, b2] = [...touches.values()]; const d = Math.hypot(a[0] - b2[0], a[1] - b2[1]); dist = Math.max(0.2, Math.min(4, pinch.dist * pinch.d / Math.max(1, d))); return; }
        if (!drag) return; e.stopImmediatePropagation();
        if (drag.kind === 'point' && !drag.live) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 8) return; drag.live = true; }   // (a tap selects; the point moves once the finger does)
        if (drag.kind === 'orbit') { yaw -= (e.clientX - drag.x) * 0.01; pitch = Math.max(-1.3, Math.min(1.3, pitch + (e.clientY - drag.y) * 0.01)); drag.x = e.clientX; drag.y = e.clientY; return; }
        const r = area(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); const hit = new THREE.Vector3();
        if (ray.ray.intersectPlane(drag.plane, hit)) { const d = hit.clone().sub(drag.last); drag.last.copy(hit); movePoint(sel, d.x, d.y, d.z); }
    }, true);
    const lift = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; if (on) { e.stopImmediatePropagation(); drag = null; } };
    canvas.addEventListener('pointerup', lift, true); canvas.addEventListener('pointercancel', lift, true);
    canvas.addEventListener('wheel', e => { if (!on) return; e.preventDefault(); dist = Math.max(0.2, Math.min(4, dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    addEventListener('keydown', e => {
        if (!on) return;
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); doUndo(); return; }
        if (e.code === 'Escape' && addFrom >= 0) { addFrom = -1; info.textContent = 'Add cancelled.'; return; }
        if (sel < 0 || !/^Arrow/.test(e.code)) return;
        e.preventDefault();
        nudge(e.shiftKey ? (e.code === 'ArrowUp' ? 'in' : e.code === 'ArrowDown' ? 'out' : null) : e.code, e.altKey);
    });
    function nudge(code, fine) {
        if (sel < 0 || !code) { if (sel < 0) info.textContent = 'Select a point first.'; return; }
        const e = { shiftKey: code === 'in' || code === 'out', code: code === 'in' ? 'ArrowUp' : code === 'out' ? 'ArrowDown' : code };
        const step = fine ? 0.0005 : 0.002, right = new THREE.Vector3(), up = new THREE.Vector3(), fwd = camera.getWorldDirection(new THREE.Vector3());
        right.crossVectors(fwd, camera.up).normalize(); up.crossVectors(right, fwd).normalize();
        const d = new THREE.Vector3();
        if (e.shiftKey) { if (e.code === 'ArrowUp') d.copy(fwd).multiplyScalar(-step); if (e.code === 'ArrowDown') d.copy(fwd).multiplyScalar(step); }
        else { if (e.code === 'ArrowLeft') d.copy(right).multiplyScalar(-step); if (e.code === 'ArrowRight') d.copy(right).multiplyScalar(step); if (e.code === 'ArrowUp') d.copy(up).multiplyScalar(step); if (e.code === 'ArrowDown') d.copy(up).multiplyScalar(-step); }
        snapshot(); movePoint(sel, d.x, d.y, d.z);
    }

    function show() { on = true; group.visible = true; panel.style.display = 'flex'; refBox.style.display = refOn ? 'flex' : 'none'; drawRef(true); onEnter?.(); describe(); }
    function exit() { on = false; group.visible = false; panel.style.display = 'none'; refBox.style.display = 'none'; onExit?.(); }
    return {
        enter: (s, l) => { if (l) layer = l; load(s ?? who); }, exit, get on() { return on; }, get showCompare() { return cmpOn; }, group,
        frame() {
            if (MOBILE) { if (on && !folded) { const ph = panel.offsetHeight; camera.setViewOffset(innerWidth, innerHeight, 0, ph / 2, innerWidth, innerHeight); } else if (camera.view?.enabled) camera.clearViewOffset(); }   // (the body drawn above the sheet)
            if (!on) return; drawRef(); const dk = dist * Math.max(1, 0.8 / camera.aspect);   // (a tall narrow screen: further back, so the region fits across)
            camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dk, target.y + Math.sin(pitch) * dk, target.z + Math.cos(yaw) * Math.cos(pitch) * dk); camera.lookAt(target); },
        state: () => ({ who, sex, layer, sel, region, points: T?.keys.length ?? 0 }), _move: (i, dx, dy, dz) => { sel = i; snapshot(); movePoint(i, dx, dy, dz); }, _save: save, _saveAs: saveTo, _topo: topoOp, _neighbours: i => neighbours(i),
    };
}
