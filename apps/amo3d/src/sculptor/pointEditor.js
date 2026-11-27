// The point editor (2026-11-23: "make the face editor"): reshape the v2 base bodies by hand, in the browser — no Blender.
// The body is shown still (its rest shape) with every point as a dot; pick a dot and drag it (it moves in the plane facing
// you; its mirror on the other side follows). Saves go into the chosen shape layer (docs/3d/characters/LAYERS_PLAN.md).
//   createPointEditor({ THREE, scene, camera, renderer, getBody(id) → { table, mesh, alt, io, go }, bodies: [{ id, name }],
//   alts, viewRect() → the part of the canvas the edited body is drawn in (the compare splits the screen), onEnter, onExit })
// The layout (2026-11-26: "make it feel like a tool like Krita or Inkscape"): a top bar (body, layer, version, undo, save,
// close), a tool palette on the left (move, add, remove, orbit, pan; the views; the regions), a properties panel on the
// right (what is shown, the reference, the selected point), a navigation pad (pan, zoom, turn — or nudge the point) and the
// reference in a floating window (moved by its title, sized from its corner, or laid over the model as tracing paper).
// The S Pen (or any pen) works the current tool, shows the point it would take as it hovers, and its side button turns the
// view; once a pen has been used, fingers only navigate (one turns, two zoom and pan) so a resting palm moves nothing.
import REF_HAIR from './base_mesh_reference.jpg';
import REF_BALD from './base_mesh_reference_bald.jpg';   // (the hairless sheet: same layout)   // the reference sheet (docs/3d/characters/base_mesh_reference.jpg), 896 × 1200
import { layerFromPositions } from '../content/models/v2/skin.js';
// Where each view sits on the sheet: [x0, y0, x1, y1] — the whole figure, and its head
const REF = {
    male: { front: [[70, 75, 360, 615], [130, 70, 250, 215]], side: [[380, 75, 560, 615], [395, 70, 520, 215]], back: [[560, 75, 860, 615], [650, 70, 770, 215]] },
    female: { front: [[70, 655, 360, 1195], [130, 650, 250, 800]], side: [[380, 655, 560, 1195], [385, 650, 530, 800]], back: [[560, 655, 860, 1195], [640, 650, 780, 800]] },
};
const PREFS_KEY = 'amo3d.sculptor.ui';
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') ?? {}; } catch { return {}; } };
const savePrefs = p => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* storage blocked */ } };

export function createPointEditor({ hairless = false, THREE, scene, camera, renderer, getBody, bodies = [], alts = {}, viewRect = null, onEnter, onExit }) {
    let loaded = null, bodyMesh = null, on = false, sex = 'male', who = bodies[0]?.id, layer = null, T = null, geo = null, mesh = null, wire = null, dots = null, sel = -1, hover = -1, mirrorOf = [], drag = null;
    let region = 'head', yaw = 0, pitch = 0.05, dist = 0.55, target = new THREE.Vector3(0, 1.66, 0);
    const undo = [], group = new THREE.Group(); scene.add(group); group.visible = false;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmpM = new THREE.Matrix4(), col = new THREE.Color();
    const keyPos = k => k.split(',').map(Number);
    const COARSE = matchMedia('(pointer: coarse)').matches, NARROW = innerWidth < 760;
    const prefs = { tool: 'move', panel: !NARROW, refOn: true, trace: false, refOpacity: 0.5, refSize: NARROW ? 220 : 300, refX: null, refY: null, padMode: 'view', wireOn: true, ...loadPrefs() };
    const keep = () => savePrefs(prefs);
    renderer.domElement.style.touchAction = 'none';
    let B = null;   // (what getBody gave: the alternate this body shows, and how to reload the page)
    const LAYER_LABEL = { override: 'This character', common: 'Common', male: 'Male', female: 'Female', boy: 'Boy', girl: 'Girl', old_man: 'Old man', old_woman: 'Old woman' };
    const stackOf = () => [...(bodyMesh?.userData.layers ?? [sex]), ...(B?.io ? ['override'] : [])];   // (a cast character: its own override on top)

    // ---- the look of the tool ----
    const css = document.createElement('style');
    css.textContent = `
    .pe { font: 14px Georgia, serif; color: #f1e4c4; }
    .pe-bar { position: fixed; top: 0; left: 0; right: 0; height: 48px; display: none; align-items: center; gap: 4px; padding: 0 8px; background: #1c130b; border-bottom: 1px solid #c8963a66; z-index: 8; overflow-x: auto; overflow-y: hidden; white-space: nowrap; scrollbar-width: none; }
    .pe-bar select { font: 14px Georgia, serif; padding: 6px 6px; border-radius: 7px; background: #3a2818; color: #f1e4c4; border: 1px solid #c8963a88; max-width: 150px; }
    .pe-b { font: 14px Georgia, serif; min-width: 40px; height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #c8963a66; background: #3a2818; color: #f1e4c4; cursor: pointer; flex: none; touch-action: manipulation; }
    .pe-b.on { background: #8a6a2a; border-color: #f3d88b; color: #fff4d8; }
    .pe-b.hot { background: #8a6a2a; }
    .pe-b:disabled { opacity: .45; }
    .pe-sep { width: 1px; height: 28px; background: #c8963a55; margin: 0 4px; flex: none; }
    .pe-tools { position: fixed; top: 56px; left: 8px; width: 52px; display: none; flex-direction: column; gap: 4px; padding: 6px; background: #1c130bee; border: 1px solid #c8963a66; border-radius: 12px; z-index: 7; max-height: calc(100vh - 120px); overflow-y: auto; scrollbar-width: none; }
    .pe-tools .pe-b { width: 52px; min-width: 0; padding: 0; font-size: 18px; }
    .pe-tools .pe-b small { font-size: 12px; }
    .pe-tools .pe-sep { width: 40px; height: 1px; margin: 4px auto; }
    .pe-panel { position: fixed; top: 56px; right: 8px; bottom: 36px; width: 260px; display: none; flex-direction: column; gap: 8px; padding: 10px; background: #1c130bf2; border: 1px solid #c8963a66; border-radius: 12px; z-index: 7; overflow-y: auto; }
    .pe-panel h4 { margin: 6px 0 2px; font-weight: normal; letter-spacing: .14em; font-size: 12px; color: #f3d88b; text-transform: uppercase; }
    .pe-row { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
    .pe-panel .pe-b { height: 34px; font-size: 13px; }
    .pe-panel input[type=range] { width: 100%; accent-color: #c8963a; }
    .pe-help { font-style: italic; font-size: 12px; opacity: .8; line-height: 1.4; }
    .pe-status { position: fixed; left: 0; right: 0; bottom: 0; height: 28px; display: none; align-items: center; padding: 0 12px; font: 13px Georgia, serif; color: #f1e4c4; background: #1c130bee; border-top: 1px solid #c8963a55; z-index: 8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pe-pad { position: fixed; right: 12px; bottom: 40px; display: none; grid-template-columns: repeat(3, 50px); gap: 5px; padding: 8px; background: #1c130bdd; border: 1px solid #c8963a66; border-radius: 14px; z-index: 7; touch-action: none; user-select: none; -webkit-user-select: none; }
    .pe-pad .pe-b { width: 50px; height: 46px; min-width: 0; padding: 0; font-size: 18px; }
    .pe-pad .pe-b.pe-mode { grid-column: 1 / 4; width: auto; height: 30px; font-size: 13px; }
    .pe-bar.wrap { height: auto; flex-wrap: wrap; padding: 5px 6px; row-gap: 5px; overflow: visible; }
    .pe-bar.wrap select { max-width: 31vw; }
    .pe-panel { overflow-x: hidden; }
    .pe-ref { position: fixed; display: none; flex-direction: column; background: #1c130bf2; border: 1px solid #c8963a88; border-radius: 10px; z-index: 6; overflow: hidden; }
    .pe-ref .pe-reft { display: flex; align-items: center; gap: 4px; padding: 4px 6px; cursor: move; touch-action: none; background: #2a1c10; }
    .pe-ref .pe-reft span { flex: 1; color: #f3d88b; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pe-ref .pe-b { height: 30px; min-width: 30px; padding: 0 7px; font-size: 13px; }
    .pe-ref .pe-pic { background-repeat: no-repeat; background-color: #3b3b3b; }
    .pe-ref .pe-grip { position: absolute; right: 0; bottom: 0; width: 26px; height: 26px; cursor: nwse-resize; touch-action: none; background: linear-gradient(135deg, transparent 50%, #c8963a 50%); }
    .pe-ref.trace { background: transparent; border-style: dashed; }
    .pe-ref.trace .pe-pic { pointer-events: none; background-color: transparent; }
    `;
    document.head.append(css);
    const make = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; parent?.append(e); return e; };
    const button = (parent, text, fn, title = '') => { const b = make('button', 'pe-b', parent); b.innerHTML = text; b.title = title; b.onclick = e => { e.stopPropagation(); fn(e); }; return b; };
    const sep = parent => make('div', 'pe-sep', parent);

    // ---- the top bar: what is edited, where it is saved, the file's actions ----
    const bar = make('div', 'pe pe-bar', document.body);
    const bodySel = make('select', '', bar); bodySel.title = 'The body edited';
    for (const b of bodies) { const o = make('option', '', bodySel, b.name); o.value = String(b.id); }
    bodySel.onchange = () => load(bodies.find(b => String(b.id) === bodySel.value)?.id ?? who);
    const layerSel = make('select', '', bar); layerSel.title = 'Save into this layer (only the difference from the others is written)';
    layerSel.onchange = () => { layer = layerSel.value; showLayers(); describe(); };
    const verSel = make('select', '', bar); verSel.title = 'The version of the layer: the active one, or an alternate';
    verSel.onchange = () => B.go({ alt: verSel.value ? `${layer}:${verSel.value}` : null, edit: who, layer });
    const verMenu = button(bar, '⋯', () => versionMenu(), 'Versions: save as new, make active, delete');
    sep(bar);
    button(bar, '↶', () => doUndo(), 'Undo move (Ctrl+Z)');
    const saveBtn = button(bar, '💾 Save', () => save(), 'Save into the layer'); saveBtn.classList.add('hot');
    const undoSave = button(bar, '⤺ Save', () => undoLastSave(), 'Undo last save (each save keeps the version it replaced)');
    sep(bar);
    const panelBtn = button(bar, '☰', () => { prefs.panel = !prefs.panel; keep(); layout(); }, 'Properties panel');
    button(bar, '✕', () => exit(), 'Close the editor');

    // ---- the tool palette ----
    const tools = make('div', 'pe pe-tools', document.body);
    const TOOLS = [['move', '✥', 'Move points: pick a dot and drag it (its mirror follows)'], ['add', '＋', 'Add a point: pick a dot, then a neighbour — a new point halfway between them'], ['remove', '−', 'Remove a point: it merges into its nearest neighbour'], ['orbit', '⟲', 'Turn the view'], ['pan', '✋', 'Move the view (strafe, up and down)']];
    const toolBtns = {};
    for (const [id, icon, title] of TOOLS) toolBtns[id] = button(tools, icon, () => setTool(id), title);
    sep(tools);
    for (const [t, y, p, title] of [['F', 0, 0.05, 'Front'], ['¾', 0.7, 0.1, 'Three-quarter'], ['S', Math.PI / 2, 0.05, 'Side'], ['B', Math.PI, 0.05, 'Back'], ['⌄', 0.3, -0.6, 'From below']]) button(tools, `<small>${t}</small>`, () => { yaw = y; pitch = p; }, title);
    sep(tools);
    const regBtns = {};
    for (const [id, t, title] of [['head', 'H', 'The head'], ['upper', 'U', 'The upper body'], ['all', 'W', 'The whole body']]) regBtns[id] = button(tools, `<small>${t}</small>`, () => setRegion(id), title);
    function setTool(id) { prefs.tool = id; keep(); addFrom = -1; for (const [k, b] of Object.entries(toolBtns)) b.classList.toggle('on', k === id); describe(); }

    // ---- the properties panel ----
    const panel = make('div', 'pe pe-panel', document.body);
    make('h4', '', panel, 'Show');
    const showRow = make('div', 'pe-row', panel);
    const toggles = {};
    const toggle = (id, label, get, set) => { const b = button(showRow, label, () => { set(!get()); b.classList.toggle('on', get()); }); toggles[id] = () => b.classList.toggle('on', get()); return b; };
    let cmpOn = !NARROW, hairOn = true, eyesOn = true, mouthOn = true, faceMesh = null, mouthMesh = null;
    toggle('ref', 'Reference', () => prefs.refOn, v => { prefs.refOn = v; keep(); layoutRef(); });
    toggle('cmp', 'Compare', () => cmpOn, v => { cmpOn = v; });
    toggle('hair', 'Hair', () => hairOn, v => { hairOn = v; applyHair(); });
    toggle('eyes', 'Eyes', () => eyesOn, v => { eyesOn = v; if (faceMesh) faceMesh.visible = v; });
    toggle('mouth', 'Mouth', () => mouthOn, v => { mouthOn = v; if (mouthMesh) mouthMesh.visible = v; });
    toggle('wire', 'Wireframe', () => prefs.wireOn, v => { prefs.wireOn = v; keep(); if (wire) wire.visible = v; });
    make('h4', '', panel, 'Reference');
    const refRow = make('div', 'pe-row', panel);
    const traceBtn = button(refRow, 'Trace over the model', () => { prefs.trace = !prefs.trace; if (prefs.trace) prefs.refOn = true; keep(); layoutRef(); }, 'Lay the reference over the model, see-through; touches pass through it');
    const sheetBtn = button(refRow, 'Whole sheet', () => { refMode = refMode === 'sheet' ? 'auto' : 'sheet'; sheetBtn.classList.toggle('on', refMode === 'sheet'); drawRef(true); });
    const opLab = make('div', 'pe-help', panel, 'Opacity');
    const opacity = make('input', '', panel); Object.assign(opacity, { type: 'range', min: 0.1, max: 1, step: 0.05, value: prefs.refOpacity });
    opacity.oninput = () => { prefs.refOpacity = +opacity.value; keep(); layoutRef(); };
    void opLab;
    make('h4', '', panel, 'Point');
    const ptRow = make('div', 'pe-row', panel);
    button(ptRow, 'Reset point', () => resetSel()); button(ptRow, 'Reset all moves', () => resetAll());
    make('h4', '', panel, 'Help');
    make('div', 'pe-help', panel, COARSE
        ? 'Pen: the tool on the left (Move, Add, Remove…); hovering shows the point it would take; the side button turns the view. Fingers: one turns (or moves, with ✋), two zoom and move. The pad bottom right moves the view, or nudges the point.'
        : 'Left button: the tool. Right or middle drag: move the view. Wheel: zoom. Arrows: nudge the point (Shift: in/out, Alt: fine). Ctrl+Z: undo a move. Esc: cancel Add.');

    // ---- the status line ----
    const status = make('div', 'pe pe-status', document.body);
    const info = { set textContent(t) { status.textContent = t; }, get textContent() { return status.textContent; } };

    // ---- the navigation pad: move the view, or nudge the selected point ----
    const pad = make('div', 'pe pe-pad', document.body);
    const modeBtn = button(pad, '', () => { prefs.padMode = prefs.padMode === 'view' ? 'point' : 'view'; keep(); labelPad(); });
    modeBtn.classList.add('pe-mode');
    const PAD = [['tl', '⟲'], ['up', '↑'], ['tr', '⟳'], ['left', '←'], ['mid', '⌂'], ['right', '→'], ['bl', '−'], ['down', '↓'], ['br', '+']];
    const padBtns = {};
    for (const [id, t] of PAD) {
        const b = make('button', 'pe-b', pad); b.textContent = t; padBtns[id] = b;
        let timer = null;   // (held: it repeats)
        const stop = () => { clearInterval(timer); clearTimeout(timer); timer = null; };
        b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); padAct(id, true); timer = setTimeout(() => { timer = setInterval(() => padAct(id, false), 60); }, 350); });
        for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
    }
    function labelPad() {
        const P = prefs.padMode === 'point';
        modeBtn.textContent = P ? 'Pad: nudge the point' : 'Pad: move the view';
        const L = P ? { tl: 'Out', tr: 'In', mid: '·', bl: 'fine', br: '' } : { tl: '⟲', tr: '⟳', mid: '⌂', bl: '−', br: '+' };
        for (const [k, v] of Object.entries(L)) padBtns[k].textContent = v;
        padBtns.bl.classList.toggle('on', P && fine); padBtns.br.disabled = P; padBtns.mid.disabled = P;
    }
    let fine = false;
    function padAct(id, first) {
        if (prefs.padMode === 'point') {
            if (id === 'bl') { if (first) { fine = !fine; labelPad(); } return; }
            const k = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', tl: 'out', tr: 'in' }[id]; if (k) nudge(k, fine); return;
        }
        const s = dist * 0.04;
        if (id === 'left' || id === 'right' || id === 'up' || id === 'down') { const [r, u] = camAxes(); const d = new THREE.Vector3(); if (id === 'left') d.addScaledVector(r, -s); if (id === 'right') d.addScaledVector(r, s); if (id === 'up') d.addScaledVector(u, s); if (id === 'down') d.addScaledVector(u, -s); target.add(d); }
        else if (id === 'tl') yaw += 0.08; else if (id === 'tr') yaw -= 0.08;
        else if (id === 'bl') dist = Math.min(4, dist * 1.08); else if (id === 'br') dist = Math.max(0.15, dist / 1.08);
        else if (id === 'mid' && first) setRegion(region);
    }
    const camAxes = () => { const f = camera.getWorldDirection(new THREE.Vector3()), r = new THREE.Vector3().crossVectors(f, camera.up).normalize(), u = new THREE.Vector3().crossVectors(r, f).normalize(); return [r, u, f]; };

    // ---- the reference: a floating window — its title moves it, its corner sizes it; Trace lays it over the model ----
    const refBox = make('div', 'pe pe-ref', document.body);
    const refHead = make('div', 'pe-reft', refBox), refLabel = make('span', '', refHead);
    button(refHead, '−', () => { prefs.refSize = Math.max(140, prefs.refSize - 50); keep(); drawRef(true); });
    button(refHead, '+', () => { prefs.refSize = Math.min(900, prefs.refSize + 50); keep(); drawRef(true); });
    const traceMini = button(refHead, 'Trace', () => traceBtn.click());
    button(refHead, '✕', () => { prefs.refOn = false; keep(); layoutRef(); });
    const REF_URL = hairless ? REF_BALD : REF_HAIR;
    const refPic = make('div', 'pe-pic', refBox); refPic.style.backgroundImage = `url(${REF_URL})`;
    const grip = make('div', 'pe-grip', refBox);
    let refMode = 'auto';
    const dragWin = (handle, onMove) => {
        handle.addEventListener('pointerdown', e => {
            if (e.target.closest('button')) return;
            e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
            let x = e.clientX, y = e.clientY;
            const move = ev => { onMove(ev.clientX - x, ev.clientY - y); x = ev.clientX; y = ev.clientY; };
            const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); keep(); };
            handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
        });
    };
    dragWin(refHead, (dx, dy) => { prefs.refX = Math.max(-200, Math.min(innerWidth - 60, (prefs.refX ?? refBox.offsetLeft) + dx)); prefs.refY = Math.max(48, Math.min(innerHeight - 40, (prefs.refY ?? refBox.offsetTop) + dy)); placeRef(); });
    dragWin(grip, dx => { prefs.refSize = Math.max(140, Math.min(1200, prefs.refSize + dx)); drawRef(true); });
    const placeRef = () => { const minY = (on ? bar.offsetHeight : 48) + 6; refBox.style.left = `${prefs.refX ?? 70}px`; refBox.style.top = `${Math.max(minY, prefs.refY ?? minY + 4)}px`; };   // (never under the top bar: its title must stay in reach)
    function layoutRef() {
        refBox.style.display = on && prefs.refOn ? 'flex' : 'none';
        refBox.classList.toggle('trace', prefs.trace);
        refPic.style.opacity = prefs.trace ? String(prefs.refOpacity) : '1';
        traceBtn.classList.toggle('on', prefs.trace); traceMini.classList.toggle('on', prefs.trace);
        toggles.ref?.(); placeRef(); if (prefs.refOn) drawRef(true);
    }
    let lastRef = '';
    function drawRef(force = false) {
        const a = ((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), view = a < 0.9 || a > 5.4 ? 'front' : a > 2.3 && a < 4.0 ? 'back' : 'side';
        const key = `${sex}|${view}|${region}|${refMode}|${prefs.refSize}`; if (key === lastRef && !force) return; lastRef = key;
        const box = refMode === 'sheet' ? [0, 0, 896, 1200] : REF[sex][view][region === 'head' ? 1 : 0], [x0, y0, x1, y1] = box, k = prefs.refSize / (x1 - x0);
        Object.assign(refPic.style, { width: `${prefs.refSize}px`, height: `${Math.round((y1 - y0) * k)}px`, backgroundSize: `${Math.round(896 * k)}px ${Math.round(1200 * k)}px`, backgroundPosition: `${-Math.round(x0 * k)}px ${-Math.round(y0 * k)}px` });
        refLabel.textContent = (refMode === 'sheet' ? 'The sheet' : `${sex}, ${view}`) + (hairless ? ' (no hair)' : '');
    }

    function layout() {
        const show = on ? '' : 'none';
        bar.style.display = on ? 'flex' : 'none'; tools.style.display = on ? 'flex' : 'none'; status.style.display = on ? 'flex' : 'none'; pad.style.display = on ? 'grid' : 'none';
        panel.style.display = on && prefs.panel ? 'flex' : 'none'; panelBtn.classList.toggle('on', prefs.panel);
        bar.classList.toggle('wrap', NARROW);   // (a phone: the bar on two rows, everything in reach)
        const top = `${(on ? bar.offsetHeight : 48) + 8}px`; tools.style.top = top; panel.style.top = top;
        if (NARROW) { panel.style.left = '68px'; panel.style.width = 'auto'; pad.style.bottom = prefs.panel ? '-999px' : '40px'; }   // (a phone: the panel over the view; the pad hidden under it)
        else pad.style.right = prefs.panel ? '280px' : '12px';   // (beside the panel, not over it)
        void show; layoutRef();
    }

    // ---- the layers and versions (the top bar's selects) ----
    function showLayers() {
        layerSel.replaceChildren(); for (const n of stackOf()) { const o = make('option', '', layerSel, `→ ${LAYER_LABEL[n] ?? n}`); o.value = n; }
        layerSel.value = layer;
        verSel.replaceChildren();
        const noVer = !B || layer === 'override'; verSel.style.display = verMenu.style.display = noVer ? 'none' : '';
        if (!noVer) { for (const [v, t] of [['', 'Active'], ...(alts[layer] ?? []).map(a => [a, a])]) { const o = make('option', '', verSel, t); o.value = v; } verSel.value = B.alt?.layer === layer ? B.alt.name : ''; }
        countSaves();
    }
    async function versionMenu() {
        const cur = B?.alt?.layer === layer ? B.alt.name : '';
        const what = prompt(`Versions of the ${LAYER_LABEL[layer]} layer${cur ? ` (showing "${cur}")` : ''}:\n1 — save the work as a new alternate${cur ? '\n2 — make this alternate the active layer\n3 — delete this alternate' : ''}`, '1');
        if (what === '1') { const name = (prompt('Name of the new alternate (a-z, 0-9, _ or -):') ?? '').trim().toLowerCase(); if (name) await saveTo(name); }
        else if (what === '2' && cur) {
            if (sessionMoves() > 0 && !confirm('Unsaved moves will be lost. Make it active anyway?')) return;
            const r = await fetch('/api/v2alts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'activate', layer, alt: cur }) });
            const j = await r.json().catch(() => ({})); info.textContent = r.ok ? `"${cur}" is now the ${LAYER_LABEL[layer]} layer (the old one kept as "${j.kept}")` : `Refused: ${j.error ?? r.status}`;
            if (r.ok) setTimeout(() => B.go({ alt: null, edit: who, layer }), 900);
        } else if (what === '3' && cur && confirm(`Delete the alternate "${cur}"?`)) {
            const r = await fetch('/api/v2alts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', layer, alt: cur }) });
            if (r.ok) B.go({ alt: null, edit: who, layer });
        }
    }
    // Undo last save: every save keeps the version it replaced on the dev server; this puts it back, one save at a time
    async function undoLastSave() {
        if (layer === 'override') { info.textContent = 'A character\'s own override has no save history yet.'; return; }
        const alt = B?.alt?.layer === layer ? B.alt.name : null;
        if (sessionMoves() > 0 && !confirm('Unsaved moves will be lost. Undo the last save anyway?')) return;
        const r = await fetch('/api/v2undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layer, alt }) });
        const j = await r.json().catch(() => ({}));
        info.textContent = r.ok ? `The ${LAYER_LABEL[layer] ?? layer} layer is back as it was before its last save (${j.count} more to undo) — reloading…` : `Nothing to undo: ${j.error ?? r.status}`;
        if (r.ok) setTimeout(() => B.go({ edit: who, layer, alt: alt ? `${layer}:${alt}` : null }), 700);
    }
    async function countSaves() {
        if (!B || layer === 'override') { undoSave.disabled = true; undoSave.textContent = '⤺ Save'; return; }
        const alt = B.alt?.layer === layer ? B.alt.name : '';
        const j = await fetch(`/api/v2undo?layer=${layer}${alt ? `&alt=${alt}` : ''}`).then(r => r.json()).catch(() => ({ count: 0 }));
        undoSave.textContent = `⤺ Save (${j.count ?? 0})`; undoSave.disabled = !j.count;
    }

    // ---- what is shown ----
    function applyHair() {
        if (!T) return;
        const H = T.hair, idx = hairOn || !H ? T.idx : T.idx.filter((_, n, a) => { const b = n - (n % 3); return !(H[a[b]] && H[a[b + 1]] && H[a[b + 2]]); });
        geo.setIndex(idx); if (sel >= 0 && !hairOn && H?.[sel]) sel = -1;
        buildDots(); describe();
    }
    function setRegion(r) {
        region = r; for (const [k, b] of Object.entries(regBtns)) b.classList.toggle('on', k === r);
        const top = T ? Math.max(...T.P.filter((_, j) => j % 3 === 1)) : 1.85;   // (the crown's height: frame from it)
        if (r === 'head') { target.set(0, top - 0.19, 0.02); dist = 0.78; } else if (r === 'upper') { target.set(0, top - 0.45, 0); dist = 1.3; } else { target.set(0, top / 2, 0); dist = 3.6; }
        if (T) buildDots();
        drawRef(true);
    }
    const inRegion = i => { const y = T.P[i * 3 + 1], top = T.P.reduce((m, v, j) => (j % 3 === 1 && v > m ? v : m), 0); return region === 'all' || (region === 'head' ? y > top - 0.42 : y > top - 0.9); };

    function load(s) {
        who = s; B = getBody(s); T = B.table; bodyMesh = B.mesh; sex = bodyMesh.userData.editSex ?? 'male'; sel = -1; hover = -1; undo.length = 0;
        bodySel.value = String(s);
        const Ls = stackOf(); if (!Ls.includes(layer)) layer = Ls.at(-1); showLayers();   // (by default the body's own: its age layer, else its sex)
        group.clear();
        geo = new THREE.BufferGeometry();
        bind = Float32Array.from(T.P); loaded = Float32Array.from(T.P);   // (loaded: as it came — what was moved here, at saving)   // the rest shape (what is saved); the view shows it posed (T.L, T.t: the A-pose)
        Linv = T.keys.map((_, i) => { const m = new THREE.Matrix3().fromArray(T.L.slice(i * 9, i * 9 + 9)); return m.determinant() ? m.clone().invert() : new THREE.Matrix3(); });
        geo.setAttribute('position', new THREE.Float32BufferAttribute(T.P.slice(), 3));
        for (let i = 0; i < T.keys.length; i++) refresh(i);
        geo.setAttribute('color', new THREE.Float32BufferAttribute(T.C, 3)); geo.setIndex(T.idx);
        mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
        wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.18 })); wire.visible = prefs.wireOn;
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
            const big = i === hover || i === sel || (sel >= 0 && i === mirrorOf[sel]) || i === addFrom;
            tmpM.makeTranslation(p.getX(i), p.getY(i), p.getZ(i)); if (big) tmpM.scale(new THREE.Vector3(1.8, 1.8, 1.8)); dots.setMatrixAt(n, tmpM);
            const isSel = i === sel || (sel >= 0 && i === mirrorOf[sel]);
            dots.setColorAt(n, col.set(i === addFrom ? 0x60ff80 : isSel ? 0xff3030 : i === hover ? 0xffa040 : mirrorOf[i] === -2 ? 0xffe070 : moved(i) ? 0x60d0ff : 0xffffff));
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
    function snapshot() { const ids = [sel, mirrorOf[sel]].filter(i => i >= 0); undo.push(ids.map(i => [i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2]])); if (undo.length > 200) undo.shift(); }
    function doUndo() { const s = undo.pop(); if (!s) { info.textContent = 'No unsaved move to undo (⤺ Save takes back a save).'; return; } for (const [i, x, y, z] of s) setPoint(i, x, y, z); geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function resetSel() { if (sel < 0) return; snapshot(); for (const i of [sel, mirrorOf[sel]].filter(i => i >= 0)) { const [x, y, z] = keyPos(T.keys[i]); setPoint(i, x, y, z); } geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function resetAll() { for (let i = 0; i < T.keys.length; i++) { const [x, y, z] = keyPos(T.keys[i]); setPoint(i, x, y, z); } geo.attributes.position.needsUpdate = true; undo.length = 0; placeDots(); describe(); }
    function describe() {
        if (!T) return;
        const n = sessionMoves(), toolName = { move: 'Move', add: addFrom >= 0 ? 'Add — now pick a neighbour' : 'Add — pick a point', remove: 'Remove — pick a point', orbit: 'Orbit', pan: 'Pan' }[prefs.tool];
        const where = `${bodies.find(b => b.id === who)?.name ?? sex} → ${LAYER_LABEL[layer] ?? layer}`;
        if (sel < 0) { info.textContent = `${toolName} · ${where} · ${n} unsaved`; return; }
        info.textContent = `${toolName} · point ${sel}${mirrorOf[sel] === -2 ? ' (centre)' : ''} x ${bind[sel * 3].toFixed(3)} y ${bind[sel * 3 + 1].toFixed(3)} z ${bind[sel * 3 + 2].toFixed(3)} · ${where} · ${n} unsaved`;
    }
    const sessionMoves = () => { let c = 0; for (let i = 0; i < (T?.keys.length ?? 0); i++) if (Math.hypot(bind[i * 3] - loaded[i * 3], bind[i * 3 + 1] - loaded[i * 3 + 1], bind[i * 3 + 2] - loaded[i * 3 + 2]) > 1e-6) c++; return c; };
    // a layer read and written: the shared layers through /api/v2layer; 'override' (the character's own) through getBody's io
    const readL = n => (n === 'override' ? B.io.read() : fetch(`/api/v2layer?${src(n)}`).then(r => r.json()));
    const writeL = (n, points, alt) => (n === 'override' ? B.io.write(points) : fetch('/api/v2layer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ layer: n, points, ...(alt ? { alt } : {}) }) }));
    const src = n => `layer=${n}` + (B?.alt?.layer === n ? `&alt=${B.alt.name}` : '');   // (the layer as this body is built from it: its alternate if it shows one)
    const save = () => saveTo(B?.alt?.layer === layer ? B.alt.name : null);
    const neighbours = i => { const s = new Set(), I = T.idx; for (let f = 0; f < I.length; f += 3) { const a = I[f], b = I[f + 1], c = I[f + 2]; if (a === i || b === i || c === i) for (const v of [a, b, c]) if (v !== i) s.add(v); } return [...s]; };
    // adding and removing points (saved into the chosen layer as its "@topo": skin.js) — each on the mirror too, saved at once
    let addFrom = -1;
    function topoOp(kind, i, j) {   // (with the mirror: the centre line maps to itself; a point with no mirror, none)
        const pm = bodyMesh.userData.points, t = k => pm.get(T.keys[k])?.t, m = k => (mirrorOf[k] === -2 ? k : mirrorOf[k]), g = Date.now();
        if (!t(i) || !t(j)) return;
        const ops = [[kind, t(i), t(j), g]], mi = m(i), mj = m(j);
        if (mi >= 0 && mj >= 0 && !(new Set([mi, mj]).size === 2 && [mi, mj].every(x => x === i || x === j)) && t(mi) && t(mj)) ops.push([kind, t(mi), t(mj), g]);
        info.textContent = `${kind === 'add' ? 'Adding' : 'Removing'} ${ops.length === 2 ? 'a point and its mirror' : 'a point'} — saving…`;
        saveTo(B?.alt?.layer === layer ? B.alt.name : null, ops);
    }
    function removeAt(i) {
        const nb = neighbours(i); if (!nb.length) return;
        const d = j => Math.hypot(bind[j * 3] - bind[i * 3], bind[j * 3 + 1] - bind[i * 3 + 1], bind[j * 3 + 2] - bind[i * 3 + 2]);
        if (!confirm('Remove this point (and its mirror)? It merges into its nearest neighbour; ⤺ Save takes it back.')) return;
        topoOp('remove', i, nb.reduce((a, j) => (d(j) < d(a) ? j : a)));
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
    // pen and mouse: the tool; the pen's side button (or the mouse's right/middle): orbit / pan. Fingers: navigation, and —
    // until a pen has been used — the tool too (a tap picks within a finger's reach). A touch while the pen is down is a palm.
    const canvas = renderer.domElement;
    const area = () => viewRect?.() ?? canvas.getBoundingClientRect();
    let penSeen = false, penDown = false;
    function pick(e, reach) {
        const r = area(); if (e.clientX > r.left + r.width) return -1;   // (the compare's half: no point)
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); const hit = ray.intersectObject(dots, false)[0];
        if (hit) return dotIds[hit.instanceId];
        if (!reach) return -1;
        // the nearest dot on screen within reach that is not hidden behind the surface
        const p = geo.attributes.position, v = new THREE.Vector3(), cand = [];
        for (const i of dotIds) { v.set(p.getX(i), p.getY(i), p.getZ(i)).project(camera); if (v.z > 1) continue; const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height, d = Math.hypot(sx - e.clientX, sy - e.clientY); if (d < reach) cand.push([d, i]); }
        cand.sort((a, b) => a[0] - b[0]);
        const eye = camera.getWorldPosition(new THREE.Vector3());
        for (const [, i] of cand.slice(0, 8)) {
            const at = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)), dir = at.clone().sub(eye), len = dir.length(); ray.set(eye, dir.normalize());
            const h = ray.intersectObject(mesh, false)[0]; if (!h || h.distance > len - 0.006) return i;
        }
        return -1;
    }
    const reachOf = e => (e.pointerType === 'touch' ? 28 : e.pointerType === 'pen' ? 14 : 8);
    const touches = new Map(); let pinch = null;
    function useTool(e) {   // a pen, a mouse's left button, or a finger before any pen: the current tool
        const t = prefs.tool;
        if (t === 'orbit' || t === 'pan') return { kind: t, x: e.clientX, y: e.clientY };
        const i = pick(e, reachOf(e));
        if (t === 'remove') { if (i >= 0) removeAt(i); return null; }
        if (t === 'add') {
            if (i < 0) return null;
            if (addFrom < 0) { addFrom = i; sel = i; placeDots(); describe(); return null; }
            const from = addFrom; addFrom = -1;
            if (i !== from && neighbours(from).includes(i)) topoOp('add', from, i); else { info.textContent = 'Not a neighbour of the first point (they must share an edge) — pick the first point again.'; placeDots(); }
            return null;
        }
        if (i < 0) return e.pointerType === 'mouse' ? { kind: 'orbit', x: e.clientX, y: e.clientY } : null;   // (empty space: the mouse turns the view; the pen does nothing)
        sel = i; snapshot();
        const p = geo.attributes.position, at = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
        placeDots(); describe();
        return { kind: 'point', plane: new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), at), last: at.clone(), x0: e.clientX, y0: e.clientY, live: e.pointerType === 'mouse' };
    }
    canvas.addEventListener('pointerdown', e => {
        if (!on) return; e.stopImmediatePropagation();
        if (e.pointerType === 'pen') { penSeen = true; penDown = true; }
        if (e.pointerType === 'touch') {
            if (penDown) return;   // (a palm)
            touches.set(e.pointerId, [e.clientX, e.clientY]);
            if (touches.size === 2) { if (drag?.kind === 'point' && drag.live) doUndo(); const [a, b2] = [...touches.values()]; pinch = { d: Math.hypot(a[0] - b2[0], a[1] - b2[1]), dist, cx: (a[0] + b2[0]) / 2, cy: (a[1] + b2[1]) / 2 }; drag = null; return; }
            if (touches.size > 2) return;
            drag = penSeen ? { kind: prefs.tool === 'pan' ? 'pan' : 'orbit', x: e.clientX, y: e.clientY } : useTool(e) ?? { kind: prefs.tool === 'pan' ? 'pan' : 'orbit', x: e.clientX, y: e.clientY };
        } else if (e.button === 2 || e.button === 1 || (e.pointerType === 'pen' && (e.buttons & 2))) {   // (the pen's side button, the mouse's right or middle: navigate)
            drag = { kind: e.button === 1 || e.shiftKey ? 'pan' : e.pointerType === 'pen' ? 'orbit' : 'pan', x: e.clientX, y: e.clientY };
        } else drag = useTool(e);
        canvas.setPointerCapture(e.pointerId);
    }, true);
    canvas.addEventListener('contextmenu', e => { if (on) e.preventDefault(); });
    canvas.addEventListener('pointermove', e => {
        if (!on) return;
        if (e.pointerType === 'touch' && touches.has(e.pointerId)) touches.set(e.pointerId, [e.clientX, e.clientY]);
        if (pinch && touches.size === 2) {   // two fingers: zoom, and move the view with their middle
            e.stopImmediatePropagation(); const [a, b2] = [...touches.values()]; const d = Math.hypot(a[0] - b2[0], a[1] - b2[1]);
            dist = Math.max(0.15, Math.min(4, pinch.dist * pinch.d / Math.max(1, d)));
            const cx = (a[0] + b2[0]) / 2, cy = (a[1] + b2[1]) / 2; panBy(cx - pinch.cx, cy - pinch.cy); pinch.cx = cx; pinch.cy = cy; return;
        }
        if (!drag) {   // a pen hovering (or a mouse): the point it would take
            if ((e.pointerType === 'pen' || e.pointerType === 'mouse') && !e.buttons && ['move', 'add', 'remove'].includes(prefs.tool) && dots) { const h = pick(e, reachOf(e)); if (h !== hover) { hover = h; placeDots(); } }
            return;
        }
        e.stopImmediatePropagation();
        if (drag.kind === 'point' && !drag.live) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < (e.pointerType === 'pen' ? 3 : 8)) return; drag.live = true; }   // (a tap selects; the point moves once the pen or finger does)
        if (drag.kind === 'orbit') { yaw -= (e.clientX - drag.x) * 0.01; pitch = Math.max(-1.3, Math.min(1.3, pitch + (e.clientY - drag.y) * 0.01)); drag.x = e.clientX; drag.y = e.clientY; return; }
        if (drag.kind === 'pan') { panBy(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; return; }
        const r = area(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); const hit = new THREE.Vector3();
        if (ray.ray.intersectPlane(drag.plane, hit)) { const d = hit.clone().sub(drag.last); drag.last.copy(hit); movePoint(sel, d.x, d.y, d.z); }
    }, true);
    function panBy(dx, dy) {   // screen pixels → the view's target moves with the drag (the model follows the pen or finger)
        const r = area(), [ri, u] = camAxes(), k = (2 * dist * Math.tan(camera.fov * Math.PI / 360)) / r.height;
        target.addScaledVector(ri, -dx * k).addScaledVector(u, dy * k);
    }
    const lift = e => {
        if (e.pointerType === 'pen') penDown = false;
        touches.delete(e.pointerId); if (touches.size < 2) pinch = null;
        if (on) { e.stopImmediatePropagation(); drag = null; }
    };
    canvas.addEventListener('pointerup', lift, true); canvas.addEventListener('pointercancel', lift, true);
    canvas.addEventListener('pointerleave', () => { if (hover >= 0 && dots) { hover = -1; placeDots(); } });
    canvas.addEventListener('wheel', e => { if (!on) return; e.preventDefault(); dist = Math.max(0.15, Math.min(4, dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    addEventListener('keydown', e => {
        if (!on || e.target.closest?.('input, select, textarea')) return;
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); doUndo(); return; }
        if (e.code === 'Escape' && addFrom >= 0) { addFrom = -1; placeDots(); info.textContent = 'Add cancelled.'; return; }
        const key = { KeyV: 'move', KeyA: 'add', KeyX: 'remove', KeyO: 'orbit', KeyP: 'pan' }[e.code]; if (key && !e.ctrlKey && !e.metaKey) { setTool(key); return; }
        if (sel < 0 || !/^Arrow/.test(e.code)) return;
        e.preventDefault();
        nudge(e.shiftKey ? (e.code === 'ArrowUp' ? 'in' : e.code === 'ArrowDown' ? 'out' : null) : e.code, e.altKey);
    });
    function nudge(code, fineStep) {
        if (sel < 0 || !code) { if (sel < 0) info.textContent = 'Select a point first.'; return; }
        const step = fineStep ? 0.0005 : 0.002, [right, up, fwd] = camAxes(), d = new THREE.Vector3();
        if (code === 'in') d.copy(fwd).multiplyScalar(-step); else if (code === 'out') d.copy(fwd).multiplyScalar(step);
        else if (code === 'ArrowLeft') d.copy(right).multiplyScalar(-step); else if (code === 'ArrowRight') d.copy(right).multiplyScalar(step);
        else if (code === 'ArrowUp') d.copy(up).multiplyScalar(step); else if (code === 'ArrowDown') d.copy(up).multiplyScalar(-step);
        snapshot(); movePoint(sel, d.x, d.y, d.z);
    }

    function show() { on = true; group.visible = true; setTool(prefs.tool); labelPad(); for (const f of Object.values(toggles)) f(); sheetBtn.classList.toggle('on', refMode === 'sheet'); layout(); onEnter?.(); describe(); }
    function exit() { on = false; group.visible = false; layout(); onExit?.(); }
    return {
        enter: (s, l) => { if (l) layer = l; load(s ?? who); }, exit, get on() { return on; }, get showCompare() { return cmpOn; }, group,
        frame() {
            if (!on) return; drawRef(); const dk = dist * Math.max(1, 0.8 / camera.aspect);   // (a tall narrow screen: further back, so the region fits across)
            camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dk, target.y + Math.sin(pitch) * dk, target.z + Math.cos(yaw) * Math.cos(pitch) * dk); camera.lookAt(target);
        },
        state: () => ({ who, sex, layer, sel, region, tool: prefs.tool, points: T?.keys.length ?? 0 }), _move: (i, dx, dy, dz) => { sel = i; snapshot(); movePoint(i, dx, dy, dz); }, _save: save, _saveAs: saveTo, _topo: topoOp, _neighbours: i => neighbours(i), _pad: padAct, _target: () => target.toArray(),
    };
}
