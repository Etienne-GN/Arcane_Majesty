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
import REF_BALD from './base_mesh_reference_bald.jpg';
import REF_HORSE from './ref_horse.jpg';   // (the user's horse sheet, docs/3d/creatures/horse_reference.jpg: front three-quarter above, back below)   // (the hairless sheet: same layout)   // the reference sheet (docs/3d/characters/base_mesh_reference.jpg), 896 × 1200
import { layerFromPositions } from '../content/models/v2/skin.js';
// Where each view sits on the sheet: [x0, y0, x1, y1] — the whole figure, and its head
const REF = {
    male: { front: [[17, 75, 359, 615], [130, 70, 250, 215]], side: [[380, 75, 545, 615], [395, 70, 520, 215]], back: [[548, 75, 891, 615], [650, 70, 770, 215]] },   // (2026-11-27: the body boxes hold the whole figure, hands included — measured on the sheet, +12 px)
    female: { front: [[6, 655, 356, 1195], [130, 650, 250, 800]], side: [[385, 655, 544, 1195], [385, 650, 530, 800]], back: [[544, 655, 894, 1195], [640, 650, 780, 800]] },
    horse: { front: [[220, 130, 720, 600], [560, 140, 720, 310]], side: [[220, 130, 720, 600], [560, 140, 720, 310]], back: [[350, 660, 550, 1050], [400, 660, 500, 780]] },
};
const REF_IMG = { horse: REF_HORSE };
const HUMAN = s => s === 'male' || s === 'female';   // (the characters' bodies; anything else is a creature, framed by its own size)   // (a kind's own sheet; the characters share the base sheet)
// The palette's icons (2026-11-26: "a small stickman to preview the view"): a stick figure seen from each view, and one
// lit where each region is (the rest dim) — inline SVG, in the button's own colour
const svg = body => `<svg viewBox="0 0 24 32" width="22" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const DIM = 'opacity=".3"';
const ICON = {
    front: svg('<circle cx="12" cy="6" r="4"/><circle cx="10.5" cy="5.5" r=".6" fill="currentColor" stroke="none"/><circle cx="13.5" cy="5.5" r=".6" fill="currentColor" stroke="none"/><path d="M12 10v10M6 13l6-1 6 1M5 19l1-6M19 19l-1-6M12 20l-4 9M12 20l4 9"/>'),
    quarter: svg('<circle cx="13" cy="6" r="4"/><circle cx="14.5" cy="5.5" r=".6" fill="currentColor" stroke="none"/><circle cx="16.6" cy="6" r=".5" fill="currentColor" stroke="none"/><path d="M12 10v10M8 13l4-1 5 1M7 19l1-6M18 19l-1-6M12 20l-3 9M12 20l4 9"/>'),
    side: svg('<circle cx="12" cy="6" r="4"/><path d="M16 6.5l1.8 1"/><circle cx="14.2" cy="5.3" r=".6" fill="currentColor" stroke="none"/><path d="M12 10v10M12 13l1 6M12 20l-1 9M12 20l2 9"/>'),
    back: svg('<circle cx="12" cy="6" r="4" fill="currentColor" fill-opacity=".35"/><path d="M12 10v10M6 13l6-1 6 1M5 19l1-6M19 19l-1-6M12 20l-4 9M12 20l4 9"/>'),
    below: svg('<circle cx="12" cy="4.5" r="3"/><path d="M12 7.5v7M7.5 10l4.5-1 4.5 1M12 14.5l-3 6M12 14.5l3 6"/><path d="M12 31v-6M9.5 27.5L12 25l2.5 2.5"/>'),
    r_head: svg(`<circle cx="12" cy="6" r="4.6" stroke-width="2.6"/><path ${DIM} d="M12 10v10M6 13l6-1 6 1M5 19l1-6M19 19l-1-6M12 20l-4 9M12 20l4 9"/>`),
    r_upper: svg(`<circle cx="12" cy="6" r="4" stroke-width="2.4"/><path stroke-width="2.4" d="M12 10v10M6 13l6-1 6 1M5 19l1-6M19 19l-1-6"/><path ${DIM} d="M12 20l-4 9M12 20l4 9"/>`),
    r_all: svg('<circle cx="12" cy="6" r="4" stroke-width="2.4"/><path stroke-width="2.4" d="M12 10v10M6 13l6-1 6 1M5 19l1-6M19 19l-1-6M12 20l-4 9M12 20l4 9"/>'),
    move: svg('<path d="M12 4v24M2 16h20M12 4l-3 3M12 4l3 3M12 28l-3-3M12 28l3-3M2 16l3-3M2 16l3 3M22 16l-3-3M22 16l-3 3"/>'),
    add: svg('<circle cx="8" cy="20" r="3" fill="currentColor"/><circle cx="20" cy="20" r="3" fill="currentColor"/><path d="M11 20h6"/><path d="M14 6v8M10 10h8" stroke-width="2.4"/>'),
    edge: svg('<path d="M4 26L20 6M4 6l16 20" stroke-dasharray="2 3"/><path d="M4 26L20 6" stroke-width="2.6"/><circle cx="4" cy="26" r="2.6" fill="currentColor"/><circle cx="20" cy="6" r="2.6" fill="currentColor"/>'),
    group: svg('<rect x="3" y="8" width="18" height="16" rx="2" stroke-dasharray="3 2"/><circle cx="9" cy="14" r="2.2" fill="currentColor"/><circle cx="15" cy="18" r="2.2" fill="currentColor"/><circle cx="15" cy="12" r="2.2" fill="currentColor"/>'),
    remove: svg('<circle cx="12" cy="20" r="3.5" fill="currentColor"/><path d="M8 9h8" stroke-width="2.4"/>'),
    orbit: svg('<path d="M20 12a8.5 8.5 0 1 0 1 7"/><path d="M21 6v6h-6"/><circle cx="12" cy="16" r="2" fill="currentColor"/>'),
    polish: svg('<path d="M2 16c3-6 7-9 10-9s7 3 10 9c-3 6-7 9-10 9s-7-3-10-9z"/><circle cx="12" cy="16" r="3.5" fill="currentColor"/>'),
    hair: svg('<path d="M6 13a6 6 0 0 1 12 0" stroke-width="3"/><path d="M5 12c0-5 3-8 7-8s7 3 7 8" fill="currentColor" fill-opacity=".5"/><circle cx="12" cy="15" r="6"/><path d="M12 21v6"/>'),
    pan: svg('<path d="M8 17V8a1.8 1.8 0 0 1 3.6 0v7M11.6 15V5.5a1.8 1.8 0 0 1 3.6 0V15M15.2 15V7.5a1.8 1.8 0 0 1 3.6 0V19a8 8 0 0 1-8 8h-1a7 7 0 0 1-5.5-2.8L3 19a1.8 1.8 0 0 1 2.9-2.2L8 19"/>'),
};
// The bars' icons (2026-11-27: one line style instead of emoji that each phone draws its own way)
const ic = body => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const UI = {
    undo: ic('<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
    redo: ic('<path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
    save: ic('<path d="M5 3h11l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>'),
    unsave: ic('<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7.5V12l3 2"/>'),
    image: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>'),
    panel: ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/><path d="M17.5 8h1M17.5 11h1M17.5 14h1"/>'),
    close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
    more: ic('<circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/>'),
    see: ic('<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>'),
    pad: ic('<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>'),
};
const PREFS_KEY = 'amo3d.sculptor.ui';
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') ?? {}; } catch { return {}; } };
const savePrefs = p => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* storage blocked */ } };

export function createPointEditor({ hairless = false, THREE, scene, camera, renderer, getBody, bodies = [], alts = {}, viewRect = null, onEnter, onExit, dresses = [], dressOf = () => null, subjects = [], slotOf = () => '' }) {
    let loaded = null, bodyMesh = null, on = false, sex = 'male', who = bodies[0]?.id, layer = null, T = null, geo = null, mesh = null, wire = null, dots = null, sel = -1, hover = -1, mirrorOf = [], drag = null;
    let region = 'head', yaw = 0, pitch = 0.05, dist = 0.55, target = new THREE.Vector3(0, 1.66, 0);
    // (2026-11-27, the user: "I can't dezoom more on the model, nor expand the ref further, so I can superpose them")
    const MAX_DIST = 12, MAX_REF = 4000;
    let lens = null;   // (Fit's lens shift, screen px: the picture moved, not the camera)
    const redo = [];   // (2026-11-27, the user: "we have undo, we'd need redo")
    const undo = [], group = new THREE.Group(); scene.add(group); group.visible = false;
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tmpM = new THREE.Matrix4(), col = new THREE.Color();
    const keyPos = k => k.split(',').map(Number);
    const COARSE = matchMedia('(pointer: coarse)').matches, NARROW = innerWidth < 760;
    const prefs = { tool: 'move', panel: !NARROW && innerHeight >= 560, padMin: false, refOn: true, refOpacity: 1, refLine: false, refSize: NARROW ? 220 : 300, refX: null, refY: null, padMode: 'view', wireOn: true, ...loadPrefs() };
    // (2026-11-27, the user: "add a transparency slider to replace the Trace button" — one value now: the reference's
    // opacity; below 1 it lies over the model, see-through, touches passing through it. An old 'trace: off' is opacity 1.)
    if ('trace' in prefs) { if (!prefs.trace) prefs.refOpacity = 1; delete prefs.trace; }
    const seeThrough = () => prefs.refOpacity < 0.99;
    const keep = () => savePrefs(prefs);
    renderer.domElement.style.touchAction = 'none';
    let B = null;   // (what getBody gave: the alternate this body shows, and how to reload the page)
    const LAYER_LABEL = { plague_rat: 'Plague Rat', frost_bear: 'Frost Bear', v3_male: 'Male v3', v3_female: 'Female v3', wolf: 'Wolf', horse: 'Horse', forest_fox: 'Fox', feral_boar: 'Feral boar', black_bear: 'Black bear', grizzly_bear: 'Grizzly bear', rabbit: 'Rabbit', sheep: 'Sheep', cow: 'Cow', pig: 'Pig', goat: 'Goat', chicken: 'Chicken', crow: 'Crow', override: 'This character', common: 'Common', male: 'Male', female: 'Female', boy: 'Boy', girl: 'Girl', old_man: 'Old man', old_woman: 'Old woman' };
    const stackOf = () => [...(bodyMesh?.userData.layers ?? [sex]), ...(B?.io ? ['override'] : [])];   // (a cast character: its own override on top)

    // ---- the look of the tool ----
    const css = document.createElement('style');
    css.textContent = `
    /* (2026-11-27, the user: "make our tool bars and interface more ergonomic and neat"): one set of colours, radii and
       sizes for every part; a toggle's state (.on), the main action (.primary) and a risky one (.danger) look different */
    .pe { --bg: #1c130b; --bg2: #2a1c10; --btn: #2f2115; --btn-h: #3e2c1b; --line: #c8963a44; --line2: #c8963a77; --gold: #c8963a; --hi: #f3d88b; --text: #f1e4c4; --dim: #c9b48d;
        --ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font: 13px var(--ui); color: var(--text); box-sizing: border-box; }
    .pe *, .pe *::before, .pe *::after { box-sizing: border-box; }
    .pe-b { font: 500 13px/1 var(--ui); min-width: 36px; height: 36px; padding: 0 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--btn); color: var(--text); cursor: pointer; flex: none;
        display: inline-flex; align-items: center; justify-content: center; gap: 6px; touch-action: manipulation; white-space: nowrap; -webkit-tap-highlight-color: transparent; transition: background .12s, border-color .12s; }
    @media (hover: hover) { .pe-b:hover:not(:disabled) { background: var(--btn-h); border-color: var(--line2); } }
    .pe-b:active:not(:disabled) { background: #4a341f; }
    .pe-b:focus-visible { outline: 2px solid var(--hi); outline-offset: 1px; }
    .pe-b.on { background: #5c421c; border-color: var(--hi); color: #fff4d8; box-shadow: inset 0 0 0 1px #f3d88b40; }
    .pe-b.primary { background: linear-gradient(#dcaa4c, #b8852f); border-color: var(--hi); color: #1c130b; font-weight: 650; }
    @media (hover: hover) { .pe-b.primary:hover:not(:disabled) { background: linear-gradient(#e8b958, #c8963a); } }
    .pe-b.danger { color: #f2b49c; border-color: #b0583e66; }
    .pe-b:disabled { opacity: .4; cursor: default; }
    .pe-b svg { flex: none; pointer-events: none; }
    .pe-b .n { min-width: 18px; padding: 2px 5px; border-radius: 9px; background: #00000055; font-size: 11px; }
    .pe-sep { width: 1px; height: 24px; background: var(--line); margin: 0 4px; flex: none; }
    .pe-grow { flex: 1 1 0; min-width: 4px; }
    .pe-break { display: none; }
    @media (pointer: coarse) { .pe-b { height: 40px; min-width: 40px; } }

    /* the top bar */
    .pe-bar { position: fixed; top: 0; left: 0; right: 0; height: 48px; display: none; align-items: center; gap: 4px; padding: 0 8px; background: var(--bg); border-bottom: 1px solid var(--line2); z-index: 8; overflow-x: auto; overflow-y: hidden; white-space: nowrap; scrollbar-width: none; }
    .pe-bar select { font: 13px var(--ui); height: 36px; padding: 0 6px; border-radius: 8px; background: var(--btn); color: var(--text); border: 1px solid var(--line2); max-width: 150px; flex: 0 1 auto; min-width: 0; }
    .pe-bar .pe-b.primary { padding: 0 14px; }
    .pe-bar.wrap { height: auto; flex-wrap: wrap; padding: 6px; row-gap: 6px; overflow: visible; }
    .pe-bar.wrap .pe-break { display: block; flex-basis: 100%; height: 0; }
    .pe-bar.wrap .pe-sep { display: none; }
    .pe-bar.wrap select { flex: 1 1 0; max-width: none; }
    .pe-bar.wrap .lbl { display: none; }
    @media (pointer: coarse) { .pe-bar select { height: 40px; } }

    /* the tool palette: captioned groups; its columns fitted to the height (1, 2 or 3) */
    .pe-tools { position: fixed; top: 56px; left: 8px; display: none; grid-template-columns: repeat(var(--cols, 1), 44px); gap: 4px; padding: 6px; background: #1c130bf0; border: 1px solid var(--line2); border-radius: 12px; z-index: 7;
        overflow-y: auto; scrollbar-width: none; overscroll-behavior: contain; touch-action: pan-y; }
    .pe-tools .pe-b { width: 44px; height: 42px; min-width: 0; padding: 0; }
    .pe-tools .pe-b.on { box-shadow: inset 3px 0 0 var(--hi); }
    .pe-cap { grid-column: 1 / -1; font: 600 9px/1 var(--ui); letter-spacing: .12em; text-transform: uppercase; color: #c8963acc; text-align: center; padding: 6px 0 2px; border-top: 1px solid var(--line); margin-top: 2px; }
    .pe-cap:first-child { border-top: 0; margin-top: 0; padding-top: 1px; }
    @media (pointer: coarse) { .pe-tools .pe-b { height: 44px; } }

    /* the properties panel */
    .pe-panel { position: fixed; top: 56px; right: 8px; width: 256px; display: none; flex-direction: column; gap: 4px; padding: 4px 12px 12px; background: #1c130bf4; border: 1px solid var(--line2); border-radius: 12px; z-index: 7;
        overflow-y: auto; overflow-x: hidden; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: #c8963a66 transparent; box-shadow: 0 8px 24px #0006; }
    .pe-panel h4 { margin: 10px 0 4px; font: normal 11px Georgia, serif; letter-spacing: .16em; color: var(--hi); text-transform: uppercase; display: flex; align-items: center; gap: 8px; }
    .pe-panel h4::after { content: ''; flex: 1; height: 1px; background: var(--line); }
    .pe-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .pe-dc { grid-template-columns: 1fr; }
    .pe-pick { display: grid; grid-template-columns: 76px 1fr; align-items: center; gap: 6px; font: 12px var(--ui); color: var(--text); }
    .pe-pick select { font: 13px var(--ui); height: 34px; padding: 0 6px; border-radius: 8px; background: var(--btn); color: var(--text); border: 1px solid var(--line2); min-width: 0; }
    @media (pointer: coarse) { .pe-pick select { height: 40px; } }
    .pe-panel .pe-b { height: 34px; font-size: 12.5px; justify-content: flex-start; padding: 0 8px; }
    .pe-panel .pe-b.wide { grid-column: 1 / -1; justify-content: center; }
    @media (pointer: coarse) { .pe-panel .pe-b { height: 40px; } }
    /* a toggle: its state as a small switch at its end */
    .pe-sw { justify-content: space-between !important; }
    .pe-sw::after { content: ''; flex: none; width: 22px; height: 12px; border-radius: 6px; background: #00000066 radial-gradient(circle at 6px 50%, #a08a66 3.5px, transparent 4px); border: 1px solid #c8963a55; }
    .pe-b.pe-sw.on { background: #3b2a15; box-shadow: none; }
    .pe-sw.on::after { background: #c8963a radial-gradient(circle at 15px 50%, #fff4d8 3.5px, transparent 4px); border-color: var(--hi); }
    .pe-slider { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--dim); margin-top: 4px; }
    .pe-slider b { font-weight: 600; color: var(--text); font-variant-numeric: tabular-nums; }
    .pe-panel input[type=range] { width: 100%; height: 28px; margin: 0; accent-color: var(--gold); touch-action: none; }
    .pe-help { font-size: 12px; color: var(--dim); line-height: 1.45; }
    .pe-panel details summary { cursor: pointer; list-style: none; }
    .pe-panel details summary::-webkit-details-marker { display: none; }
    .pe-panel details summary h4::before { content: '▸'; font-size: 10px; transition: transform .15s; }
    .pe-panel details[open] summary h4::before { transform: rotate(90deg); }

    /* the status line */
    .pe-status { position: fixed; left: 0; right: 0; bottom: 0; height: 28px; display: none; align-items: center; padding: 0 12px; font: 12px var(--ui); color: var(--dim); background: #1c130bf0; border-top: 1px solid var(--line); z-index: 8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* the navigation pad: a View / Point switch, the nine keys, and a fold to a single button */
    .pe-pad { position: fixed; right: 12px; bottom: 40px; display: none; grid-template-columns: repeat(3, 40px); gap: 4px; padding: 6px; background: #1c130be6; border: 1px solid var(--line2); border-radius: 12px; z-index: 7; touch-action: none; user-select: none; -webkit-user-select: none; box-shadow: 0 6px 18px #0005; }
    .pe-pad .pe-b { width: 40px; height: 38px; min-width: 0; padding: 0; font-size: 17px; }
    .pe-pad .pe-b.t { font-size: 11px; }
    .pe-padh { grid-column: 1 / -1; display: flex; gap: 4px; }
    .pe-seg { flex: 1; display: flex; padding: 2px; gap: 2px; border-radius: 8px; background: #00000055; border: 1px solid var(--line); }
    .pe-pad .pe-seg .pe-b { flex: 1; width: auto; height: 26px; font-size: 11.5px; border-color: transparent; background: transparent; border-radius: 6px; }
    .pe-pad .pe-seg .pe-b.on { background: #5c421c; border-color: var(--hi); }
    .pe-pad .pe-b.pe-fold { width: 30px; height: 30px; font-size: 13px; }
    .pe-pad.min { grid-template-columns: auto; padding: 4px; border-radius: 22px; }
    .pe-pad.min > :not(.pe-padh), .pe-pad.min .pe-seg { display: none; }
    .pe-pad.min .pe-b.pe-fold { width: 40px; height: 40px; border-radius: 20px; }
    @media (pointer: coarse) { .pe-pad { grid-template-columns: repeat(3, 44px); } .pe-pad .pe-b { width: 44px; height: 42px; } .pe-pad .pe-seg .pe-b { height: 30px; } .pe-pad .pe-b.pe-fold { width: 34px; height: 34px; } .pe-pad.min .pe-b.pe-fold { width: 44px; height: 44px; border-radius: 22px; } }

    /* the reference: a floating window — title, then its tools (the see-through slider on its own row when narrow) */
    .pe-ref { position: fixed; display: none; flex-direction: column; background: #1c130bf2; border: 1px solid var(--line2); border-radius: 10px; z-index: 6; overflow: hidden; box-shadow: 0 8px 24px #0006; }
    .pe-ref .pe-reft { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 4px; cursor: move; touch-action: none; background: var(--bg2); border-bottom: 1px solid var(--line); }
    .pe-ref .pe-reft span { flex: 1 1 40px; min-width: 0; padding-left: 4px; color: var(--hi); font: 12.5px Georgia, serif; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pe-ref .pe-b { height: 30px; min-width: 30px; padding: 0 7px; font-size: 12.5px; }
    @media (pointer: coarse) { .pe-ref .pe-b { height: 36px; min-width: 36px; } }
    .pe-opw { flex: 1 1 90px; display: flex; align-items: center; gap: 4px; min-width: 80px; color: var(--dim); }
    .pe-ref.narrow .pe-opw { order: 9; flex-basis: 100%; padding: 0 4px; }
    .pe-ref .pe-op { flex: 1; min-width: 0; height: 24px; margin: 0; accent-color: var(--gold); touch-action: none; }
    .pe-ref .pe-pic { background-repeat: no-repeat; background-color: #3b3b3b; }
    .pe-ref .pe-grip { position: absolute; right: 0; bottom: 0; width: 28px; height: 28px; cursor: nwse-resize; touch-action: none; background: linear-gradient(135deg, transparent 55%, #c8963acc 55%, #c8963acc 62%, transparent 62%, transparent 72%, #c8963acc 72%, #c8963acc 79%, transparent 79%); }
    .pe-ref .pe-line { position: absolute; pointer-events: none; }
    .pe-ref.trace { background: transparent; border-style: dashed; box-shadow: none; }
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
    const verMenu = button(bar, UI.more, () => versionMenu(), 'Versions: save as new, make active, delete');
    sep(bar); make('div', 'pe-break', bar);   // (a phone: the file's actions on a second row)
    button(bar, UI.undo, () => doUndo(), 'Undo move (Ctrl+Z)');
    button(bar, UI.redo, () => doRedo(), 'Redo move (Ctrl+Shift+Z or Ctrl+Y)');
    const saveBtn = button(bar, `${UI.save}<span>Save</span>`, () => save(), 'Save into the layer'); saveBtn.classList.add('primary');
    const undoSave = button(bar, `${UI.unsave}<span class="lbl">Undo save</span><span class="n">0</span>`, () => undoLastSave(), 'Undo last save (each save keeps the version it replaced)');
    make('div', 'pe-grow', bar);
    const refBtn = button(bar, UI.image, () => { prefs.refOn = !prefs.refOn; keep(); layoutRef(); }, 'Show or hide the reference');
    const panelBtn = button(bar, UI.panel, () => { prefs.panel = !prefs.panel; keep(); layout(); }, 'Properties panel');
    sep(bar);
    button(bar, UI.close, () => exit(), 'Close the editor');

    // ---- the tool palette ----
    const tools = make('div', 'pe pe-tools', document.body);
    const cap = (parent, text) => make('div', 'pe-cap', parent, text);   // (a group's name: Tool, View, Frame, Show)
    const TOOLS = [['move', ICON.move, 'Move points (V): pick a dot and drag it (its mirror follows)'], ['add', ICON.add, 'Add a point (A): pick a dot, then a neighbour — a new point halfway between them'], ['remove', ICON.remove, 'Remove a point (X): it merges into its nearest neighbour'], ['edge', ICON.edge, 'Turn a line (E): pick the two ends of a line between two triangles — it turns to join their other two corners (its mirror too, where it is the same line)'], ['group', ICON.group, 'Group (G): tap points to add or remove them, or drag a box round them; drag any of them to move them all (their mirrors follow). Esc clears the group'], ['orbit', ICON.orbit, 'Turn the view (O)'], ['pan', ICON.pan, 'Move the view (P): strafe, up and down']];
    const toolBtns = {};
    cap(tools, 'Tool');
    for (const [id, icon, title] of TOOLS) toolBtns[id] = button(tools, icon, () => setTool(id), title);
    cap(tools, 'View');
    for (const [k, y, p, title] of [['front', 0, 0.05, 'Front'], ['quarter', 0.7, 0.1, 'Three-quarter'], ['side', Math.PI / 2, 0.05, 'Side'], ['back', Math.PI, 0.05, 'Back'], ['below', 0.3, -0.6, 'From below']]) button(tools, ICON[k], () => { yaw = y; pitch = p; }, `View: ${title.toLowerCase()}`);
    cap(tools, 'Frame');
    const regBtns = {};
    for (const [id, title] of [['head', 'The head'], ['upper', 'The upper body'], ['all', 'The whole body']]) regBtns[id] = button(tools, ICON[`r_${id}`], () => setRegion(id), `Frame and edit: ${title.toLowerCase()}`);
    cap(tools, 'Show');
    // Polish (2026-11-27, the user: "a polish option to preview the in-game model, hiding dots and lines"): the points and
    // the wireframe hidden, no point picked by a touch — the model as the game draws it. The reference (its picture and its
    // outline) stays as it is (the user: "polish should NOT remove the reference")
    let polish = false;
    const setPolish = v => { polish = v; if (dots) dots.visible = !v; if (wire) wire.visible = prefs.wireOn && !v; if (v) { sel = -1; hover = -1; } polishBtn.classList.toggle('on', v); toggles.polish?.(); describe?.(); };
    const polishBtn = button(tools, ICON.polish, () => setPolish(!polish), 'Polish: preview the model as in the game — no points, no wireframe; the reference stays (press again to edit)');
    const hairBtn = button(tools, ICON.hair, () => { hairOn = !hairOn; applyHair(); toggles.hair?.(); hairBtn.classList.toggle('on', hairOn); }, 'Show or hide the hair (hidden: its points can\'t be picked; the scalp shows)');
    function setTool(id) { prefs.tool = id; keep(); addFrom = -1; edgeFrom = -1; for (const [k, b] of Object.entries(toolBtns)) b.classList.toggle('on', k === id); describe(); }

    // ---- the properties panel ----
    const panel = make('div', 'pe pe-panel', document.body);
    make('h4', '', panel, 'Show');
    const showRow = make('div', 'pe-row', panel);
    const toggles = {};
    const toggle = (id, label, get, set, title = '') => { const b = button(showRow, label, () => { set(!get()); b.classList.toggle('on', get()); }, title); b.classList.add('pe-sw'); toggles[id] = () => b.classList.toggle('on', get()); return b; };
    let cmpOn = false,   /* (off by default — the user, 2026-11-27) */ hairOn = true, eyesOn = true, mouthOn = true, faceMesh = null, mouthMesh = null;
    toggle('ref', 'Reference', () => prefs.refOn, v => { prefs.refOn = v; keep(); layoutRef(); }, 'The reference window');
    toggle('cmp', 'Compare', () => cmpOn, v => { cmpOn = v; showDress?.(); }, 'The other body beside it, from the same angle (pick it under Dress & compare)');
    toggle('hair', 'Hair', () => hairOn, v => { hairOn = v; applyHair(); hairBtn.classList.toggle('on', hairOn); });
    toggle('eyes', 'Eyes', () => eyesOn, v => { eyesOn = v; if (faceMesh) faceMesh.visible = v && showPart.head; });
    toggle('mouth', 'Mouth', () => mouthOn, v => { mouthOn = v; if (mouthMesh) mouthMesh.visible = v && showPart.head; });
    for (const [id, label] of [['arms', 'Arms'], ['head', 'Head'], ['legs', 'Legs']]) toggle(id, label, () => showPart[id], v => { showPart[id] = v; applyHair(); }, `Show or hide the ${label.toLowerCase()} — to judge the body without them (their points can't be picked while hidden)`);
    toggle('wire', 'Wireframe', () => prefs.wireOn, v => { prefs.wireOn = v; keep(); if (wire) wire.visible = v && !polish; });
    toggle('polish', 'Polish', () => polish, v => setPolish(v), 'The model as in the game: no points, no wireframe');
    // Dress & compare (2026-11-27, the user: "test dress my model in the sculptor, and display it in the compare too"): the
    // edited body's dress (painted on: every edit still lands), and what the Compare shows — any subject, its own dress
    make('h4', '', panel, 'Dress & compare');
    const dcRow = make('div', 'pe-row pe-dc', panel);
    const picker = (label, opts, value, onChange, title) => { const l = make('label', 'pe-pick', dcRow); make('span', '', l, label); const sl = make('select', '', l); sl.title = title; for (const [v, t] of opts) { const o = make('option', '', sl, t); o.value = v; } sl.value = value; sl.onchange = () => onChange(sl.value); return l; };
    const keepGo = ch => { if (sessionMoves() > 0 && !confirm('Unsaved moves will be lost. Continue?')) return false; B.go({ alt: B.alt ? `${B.alt.layer}:${B.alt.name}` : null, edit: who, layer, dress: null, ...ch }); return true; };
    const DRESS_OPTS = [['', 'Undressed'], ...dresses];
    let dressPick = null, cmpPick = null, cmpDressPick = null;
    function showDress() {
        dcRow.replaceChildren(); if (!B) return;
        const other = 1 - who;
        dressPick = picker('Dress', DRESS_OPTS, dressOf(who) ?? '', v => keepGo({ [`dress${who}`]: v || null, [`dress${other}`]: dressOf(other) }), 'Dress the model being shaped (a basic outfit painted on it)');
        cmpPick = picker('Compare', subjects, slotOf(other), v => keepGo({ [other ? 'b' : 'a']: v, [other ? 'a' : 'b']: slotOf(who), [`alt${other}`]: null, [`dress${who}`]: dressOf(who), [`dress${other}`]: dressOf(other) }), 'What stands in the Compare view');
        cmpDressPick = picker('Its dress', DRESS_OPTS, dressOf(other) ?? '', v => keepGo({ [`dress${other}`]: v || null, [`dress${who}`]: dressOf(who) }), 'Dress the compared model');
        for (const l of [cmpPick, cmpDressPick]) l.style.display = cmpOn ? '' : 'none';
    }
    make('h4', '', panel, 'Reference');
    const refRow = make('div', 'pe-row', panel);
    const lineBtn = button(refRow, 'Outline', () => { prefs.refLine = !prefs.refLine; keep(); drawLine(); }, 'A red line round the reference figure, over the model: move the points until the model meets it (lower the opacity to keep only the line)');
    const sheetBtn = button(refRow, 'Whole sheet', () => { refMode = refMode === 'sheet' ? 'auto' : 'sheet'; sheetBtn.classList.toggle('on', refMode === 'sheet'); drawRef(true); }, 'The whole reference sheet instead of the view\'s figure');
    lineBtn.classList.add('pe-sw'); sheetBtn.classList.add('pe-sw');
    const opLab = make('div', 'pe-slider', panel); make('span', '', opLab, 'Opacity'); const opVal = make('b', '', opLab);
    const opacity = make('input', '', panel); Object.assign(opacity, { type: 'range', min: 0, max: 1, step: 0.05, value: prefs.refOpacity, title: 'The reference: solid (right) to see-through over the model (left); at 0 only its outline, if on' });
    opacity.oninput = () => { prefs.refOpacity = +opacity.value; if (seeThrough()) prefs.refOn = true; keep(); layoutRef(); };
    const fitRow = make('div', 'pe-row', panel);
    button(fitRow, 'Fit the view to the reference', () => fitToRef(), 'Move the view so the model stands exactly on the reference figure (its height, its feet, its middle)').classList.add('wide');
    make('h4', '', panel, 'Point');
    const ptRow = make('div', 'pe-row', panel);
    button(ptRow, 'Reset point', () => resetSel(), 'Put the selected point (and its mirror) back where it was built');
    button(ptRow, 'Reset all moves', () => { if (sessionMoves() === 0 || confirm('Reset every unsaved move?')) resetAll(); }, 'Put every point back (unsaved moves are lost)').classList.add('danger');
    const helpBox = make('details', '', panel); helpBox.open = !NARROW;
    make('h4', '', make('summary', '', helpBox), 'Help');
    make('div', 'pe-help', helpBox, COARSE
        ? 'Pen: the tool on the left (Move, Add, Remove…); hovering shows the point it would take; the side button turns the view. Fingers: one turns (or moves, with ✋), two zoom and move. The pad bottom right moves the view, or nudges the point.'
        : 'Left button: the tool. Right or middle drag: move the view. Wheel: zoom. Arrows: nudge the point (Shift: in/out, Alt: fine). Ctrl+Z: undo a move, Ctrl+Shift+Z / Ctrl+Y: redo. Esc: cancel Add.');

    // ---- the status line ----
    const status = make('div', 'pe pe-status', document.body);
    const info = { set textContent(t) { status.textContent = t; }, get textContent() { return status.textContent; } };

    // ---- the navigation pad: move the view, or nudge the selected point ----
    const pad = make('div', 'pe pe-pad', document.body);
    // its head: what the keys work on — the view or the selected point — and a fold (folded: one round button)
    const padHead = make('div', 'pe-padh', pad), seg = make('div', 'pe-seg', padHead);
    const setPadMode = m => { prefs.padMode = m; keep(); labelPad(); };
    const segView = button(seg, 'View', () => setPadMode('view'), 'The pad moves the view: turn, pan, zoom, re-frame');
    const segPoint = button(seg, 'Point', () => setPadMode('point'), 'The pad nudges the selected point (Out/In: towards you or away; fine: small steps)');
    const foldBtn = button(padHead, '▾', () => { prefs.padMin = !prefs.padMin; keep(); labelPad(); }, 'Fold or unfold the pad');
    foldBtn.classList.add('pe-fold');
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
        segView.classList.toggle('on', !P); segPoint.classList.toggle('on', P);
        pad.classList.toggle('min', !!prefs.padMin); foldBtn.innerHTML = prefs.padMin ? UI.pad : '▾'; foldBtn.title = prefs.padMin ? 'Unfold the navigation pad' : 'Fold the navigation pad';
        const L = P ? { tl: 'Out', tr: 'In', mid: '·', bl: 'fine', br: '' } : { tl: '⟲', tr: '⟳', mid: '⌂', bl: '−', br: '+' };
        const TT = P ? { tl: 'Nudge towards you', tr: 'Nudge away', up: 'Nudge up', down: 'Nudge down', left: 'Nudge left', right: 'Nudge right', bl: 'Fine steps', mid: '', br: '' }
            : { tl: 'Turn left', tr: 'Turn right', up: 'Pan up', down: 'Pan down', left: 'Pan left', right: 'Pan right', mid: 'Re-frame the region', bl: 'Zoom out', br: 'Zoom in' };
        for (const [k, v] of Object.entries(L)) { padBtns[k].textContent = v; padBtns[k].classList.toggle('t', v.length > 1); }
        for (const [k, v] of Object.entries(TT)) padBtns[k].title = v;
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
        else if (id === 'bl') dist = Math.min(MAX_DIST, dist * 1.08); else if (id === 'br') dist = Math.max(0.15, dist / 1.08);
        else if (id === 'mid' && first) setRegion(region);
    }
    const camAxes = () => { const f = camera.getWorldDirection(new THREE.Vector3()), r = new THREE.Vector3().crossVectors(f, camera.up).normalize(), u = new THREE.Vector3().crossVectors(r, f).normalize(); return [r, u, f]; };

    // ---- the reference: a floating window — its title moves it, its corner sizes it; Trace lays it over the model ----
    const refBox = make('div', 'pe pe-ref', document.body);
    const refHead = make('div', 'pe-reft', refBox), refLabel = make('span', '', refHead);
    const opWrap = make('div', 'pe-opw', refHead); opWrap.innerHTML = UI.see; opWrap.title = 'See-through';
    const refOp = make('input', 'pe-op', opWrap); Object.assign(refOp, { type: 'range', min: 0, max: 1, step: 0.05, value: prefs.refOpacity, title: 'See-through: drag left to lay the reference over the model' });
    refOp.oninput = () => { prefs.refOpacity = +refOp.value; keep(); layoutRef(); };
    button(refHead, '−', () => { prefs.refSize = Math.max(140, prefs.refSize - 50); keep(); drawRef(true); }, 'Smaller');
    button(refHead, '+', () => { prefs.refSize = Math.min(MAX_REF, prefs.refSize + 50); keep(); drawRef(true); }, 'Larger');
    button(refHead, 'Fit', () => fitToRef(), 'Move the view so the model stands exactly on the reference figure (its height, its feet, its middle)');
    button(refHead, UI.close, () => { prefs.refOn = false; keep(); layoutRef(); }, 'Hide the reference');
    const REF_URL = hairless ? REF_BALD : REF_HAIR;
    const refPic = make('div', 'pe-pic', refBox); refPic.style.backgroundImage = `url(${REF_URL})`;
    const refLine = make('canvas', 'pe-line', refBox);
    const grip = make('div', 'pe-grip', refBox);
    let refMode = 'auto';
    const dragWin = (handle, onMove) => {
        handle.addEventListener('pointerdown', e => {
            if (e.target.closest('button, input')) return;
            e.preventDefault(); e.stopPropagation(); handle.setPointerCapture(e.pointerId);
            let x = e.clientX, y = e.clientY;
            const move = ev => { onMove(ev.clientX - x, ev.clientY - y); x = ev.clientX; y = ev.clientY; };
            const up = () => { handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); keep(); };
            handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', up);
        });
    };
    dragWin(refHead, (dx, dy) => { prefs.refX = Math.max(-(refBox.offsetWidth - 120), Math.min(innerWidth - 60, (prefs.refX ?? refBox.offsetLeft) + dx)); prefs.refY = Math.max(48, Math.min(innerHeight - 40, (prefs.refY ?? refBox.offsetTop) + dy)); placeRef(); });
    dragWin(grip, dx => { prefs.refSize = Math.max(140, Math.min(MAX_REF, prefs.refSize + dx)); drawRef(true); });
    const placeRef = () => {   // (never under the top bar: its title must stay in reach; by default just right of the palette)
        const minY = (on ? bar.offsetHeight : 48) + 6, x0 = on && tools.offsetWidth ? tools.offsetLeft + tools.offsetWidth + 8 : 70;
        refBox.style.left = `${prefs.refX ?? x0}px`; refBox.style.top = `${Math.max(minY, prefs.refY ?? minY + 2)}px`;
    };
    // Fit (2026-11-27): each sheet figure's head top, sole and centre line (sheet px; with and without hair) — the view is
    // turned square to the reference's view and moved so the model's top, feet and middle land on the figure's
    const FIG = {
        hair: { male: { front: [89, 596, 188], side: [89, 596, 464], back: [89, 595, 719.5] }, female: { front: [670, 1175, 181.5], side: [670, 1174, 465], back: [666, 1171, 719] } },
        bald: { male: { front: [92, 596, 188], side: [93, 596, 463], back: [92, 595, 719] }, female: { front: [683, 1175, 181.5], side: [683, 1175, 457], back: [683, 1171, 719] } },
    };
    function fitToRef() {
        if (!T || !REF[sex] || refMode === 'sheet') { info.textContent = 'Fit works on a body with its reference figure shown (not the whole sheet).'; return; }
        const a = ((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), view = a < 0.9 || a > 5.4 ? 'front' : a > 2.3 && a < 4.0 ? 'back' : 'side';
        const fig = FIG[hairless || !hairOn ? 'bald' : 'hair'][sex]?.[view]; if (!fig) return;
        if (!prefs.refOn) { prefs.refOn = true; layoutRef(); }
        if (!seeThrough()) { prefs.refOpacity = 0.5; keep(); layoutRef(); }
        yaw = view === 'front' ? 0 : view === 'back' ? Math.PI : Math.PI / 2; pitch = 0;   // (the sheet's side view faces left: seen from +x)
        const pos = geo.attributes.position; let top = 0;
        for (let i = 0; i < pos.count; i++) if ((hairOn || !T.hair?.[i]) && pos.getY(i) > top) top = pos.getY(i);
        const box = REF[sex][view][region === 'head' ? 1 : 0], pr = refPic.getBoundingClientRect(), k = pr.width / (box[2] - box[0]);
        const figTop = pr.top + (fig[0] - box[1]) * k, figSole = pr.top + (fig[1] - box[1]) * k, figCx = pr.left + (fig[2] - box[0]) * k;
        const r = area(), tanH = Math.tan(camera.fov * Math.PI / 360), pxPerM = (figSole - figTop) / top;
        const dk = r.height / (2 * tanH * pxPerM), stretch = Math.max(1, 0.8 / camera.aspect);
        dist = Math.min(MAX_DIST, dk / stretch);
        // (2026-11-27: the camera stays square in front of the model — its middle — and the picture is shifted like a lens
        // shift, to where the figure is: moving the camera sideways instead looked at the model from an angle when the
        // reference sat off the screen's middle, and the faces could not be compared)
        // (aimed at what is framed — the head, the chest, the middle — so that part is seen without a perspective drift)
        const ay = region === 'head' ? top - 0.16 : region === 'upper' ? top - 0.45 : top / 2;
        target.set(0, ay, 0);
        lens = { x: figCx - (r.left + r.width / 2), y: (figSole - (ay / top) * (figSole - figTop)) - (r.top + r.height / 2) };
        info.textContent = `Fitted to the ${sex}'s ${view} figure: the model's ${top.toFixed(2)} m over its height on the sheet. Drag or size the reference and Fit again.`;
    }
    function layoutRef() {
        refBox.style.display = on && prefs.refOn ? 'flex' : 'none';
        refBox.classList.toggle('trace', seeThrough());
        refPic.style.opacity = String(prefs.refOpacity);
        refOp.value = opacity.value = prefs.refOpacity; opVal.textContent = `${Math.round(prefs.refOpacity * 100)}%`;
        toggles.ref?.(); refBtn.classList.toggle('on', prefs.refOn); placeRef(); if (prefs.refOn) drawRef(true);
    }
    let lastRef = '';
    function drawRef(force = false) {
        const a = ((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), view = a < 0.9 || a > 5.4 ? 'front' : a > 2.3 && a < 4.0 ? 'back' : 'side';
        const key = `${sex}|${view}|${region}|${refMode}|${prefs.refSize}`; if (key === lastRef && !force) return; lastRef = key;
        refBox.style.width = `${prefs.refSize + 2}px`; refBox.classList.toggle('narrow', prefs.refSize < 330);   // (the window as wide as its picture: a narrow one puts its slider on a row of its own)
        if (!REF[sex] && refMode !== 'sheet') { refPic.style.width = `${prefs.refSize}px`; refPic.style.height = '60px'; refPic.style.backgroundImage = 'none'; refLabel.textContent = `No reference sheet for the ${sex} yet`; return; }   // (a creature: none yet)
        refPic.style.backgroundImage = `url(${REF_IMG[sex] ?? REF_URL})`;
        const box = refMode === 'sheet' ? [0, 0, 896, 1200] : REF[sex][view][region === 'head' ? 1 : 0], [x0, y0, x1, y1] = box, k = prefs.refSize / (x1 - x0);
        Object.assign(refPic.style, { width: `${prefs.refSize}px`, height: `${Math.round((y1 - y0) * k)}px`, backgroundSize: `${Math.round(896 * k)}px ${Math.round(1200 * k)}px`, backgroundPosition: `${-Math.round(x0 * k)}px ${-Math.round(y0 * k)}px` });
        refLabel.textContent = (refMode === 'sheet' ? 'The sheet' : `${sex}, ${view}`) + (hairless ? ' (no hair)' : '');
        drawLine(box);
    }
    // The reference figure's outline (2026-11-27, the user: "can I have this red outline in the sculptor?"): the figure found
    // by filling the sheet's background in from the box's edges — pixel to like pixel, stopped by the figure's own dark
    // contour (the dark shorts are close to the background's colour: a plain colour test loses them) — and its edge drawn
    // in red over the model, at full strength whatever the picture's opacity
    const OUTLINES = new Map();
    function figureEdge(url, box) {
        const key = `${url}|${box.join(',')}`; if (OUTLINES.has(key)) return OUTLINES.get(key);
        OUTLINES.set(key, null);
        const img = new Image();
        img.onload = () => {
            const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0, c = document.createElement('canvas'); c.width = w; c.height = h;
            const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, -x0, -y0);
            const d = g.getImageData(0, 0, w, h).data, bg = new Uint8Array(w * h), q = [];
            // the backdrop's colour: on the characters' sheet a known spot of it (a box's corner can be the figure — the head
            // box's lower corner is the shoulder's skin, and only the skin was outlined); elsewhere the box's lower corner
            const s1 = document.createElement('canvas'); s1.width = s1.height = 1; const g1 = s1.getContext('2d', { willReadFrequently: true });
            g1.drawImage(img, -(HUMAN(sex) ? 40 : x0 + 2), -(HUMAN(sex) ? 300 : y1 - 3)); const bgc = g1.getImageData(0, 0, 1, 1).data;
            const corner = w * h * 4; const D = new Uint8ClampedArray(d.length + 4); D.set(d); D.set([bgc[0], bgc[1], bgc[2], 255], d.length);
            const diff = (a, b) => Math.abs(D[a] - D[b]) + Math.abs(D[a + 1] - D[b + 1]) + Math.abs(D[a + 2] - D[b + 2]);
            const seed = i => { if (!bg[i] && diff(i * 4, corner) <= 40) { bg[i] = 1; q.push(i); } };
            for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
            for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
            while (q.length) {
                const i = q.pop(), x = i % w;
                for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
                    if (j < 0 || j >= w * h || bg[j]) continue;
                    if (diff(i * 4, j * 4) <= 24 && diff(j * 4, corner) <= 60) { bg[j] = 1; q.push(j); }
                }
            }
            const edge = [];
            for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (!bg[i] && (bg[i - 1] || bg[i + 1] || bg[i - w] || bg[i + w])) edge.push(x, y); }
            OUTLINES.set(key, { w, h, edge: Float32Array.from(edge) }); drawLine();
        };
        img.src = url;
        return null;
    }
    let lineBox = null;
    function drawLine(box = lineBox) {
        lineBox = box; lineBtn.classList.toggle('on', prefs.refLine);
        const show = prefs.refLine && prefs.refOn && refMode !== 'sheet' && box && REF[sex];
        refLine.style.display = show ? '' : 'none'; if (!show) return;
        const E = figureEdge(REF_IMG[sex] ?? REF_URL, box); if (!E) return;
        const W = refPic.offsetWidth, H = refPic.offsetHeight, dpr = Math.min(2, devicePixelRatio || 1);
        Object.assign(refLine.style, { left: `${refPic.offsetLeft}px`, top: `${refPic.offsetTop}px`, width: `${W}px`, height: `${H}px` });
        refLine.width = Math.round(W * dpr); refLine.height = Math.round(H * dpr);
        const g = refLine.getContext('2d'), kx = refLine.width / E.w, ky = refLine.height / E.h, r = Math.max(1.2 * dpr, kx * 0.9);
        g.clearRect(0, 0, refLine.width, refLine.height); g.fillStyle = '#ff2a2a';
        for (let n = 0; n < E.edge.length; n += 2) g.fillRect(E.edge[n] * kx, E.edge[n + 1] * ky, r, r);
    }

    function layout() {
        const narrow = innerWidth < 760;   // (measured each time: a phone turned changes it)
        bar.style.display = on ? 'flex' : 'none'; tools.style.display = on ? 'grid' : 'none'; status.style.display = on ? 'flex' : 'none'; pad.style.display = on ? 'grid' : 'none';
        panel.style.display = on && prefs.panel ? 'flex' : 'none'; panelBtn.classList.toggle('on', prefs.panel);
        bar.classList.toggle('wrap', narrow);   // (a phone: the bar on two rows — what is edited, then the file's actions)
        const topPx = (on ? bar.offsetHeight : 48) + 8, room = Math.max(120, innerHeight - topPx - 36);   // (down to the status line)
        tools.style.top = panel.style.top = `${topPx}px`; tools.style.maxHeight = panel.style.maxHeight = `${room}px`;
        // the palette: as few columns as let it all show (a phone held either way: 2 or 3); it still scrolls if not
        if (on) for (const c of [1, 2, 3]) { tools.style.setProperty('--cols', c); if (tools.scrollHeight <= room + 1) break; }
        const toolsRight = on ? tools.offsetLeft + tools.offsetWidth : 60;
        if (narrow) { panel.style.left = `${toolsRight + 6}px`; panel.style.width = 'auto'; } else { panel.style.left = ''; panel.style.width = ''; }
        // the pad: beside the panel when both fit, else hidden under the open panel (a phone)
        const pw = on && prefs.panel ? panel.offsetWidth + 8 : 0, padW = pad.offsetWidth || 160;
        const beside = !prefs.panel || (!narrow && innerWidth - pw - padW - 20 > toolsRight + 160);
        pad.style.right = `${pw && beside ? pw + 12 : 12}px`; pad.style.bottom = beside ? '40px' : '-999px';
        layoutRef();
    }

    addEventListener('resize', () => { if (on) layout(); });   // (the phone turned: the palette refitted)
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
        info.textContent = r.ok ? `The ${LAYER_LABEL[layer] ?? layer} layer is back as it was before its last save (${j.count} more to undo).` : `Nothing to undo: ${j.error ?? r.status}`;
        if (r.ok) { if (!alt && await B.live?.(layer)) countSaves(); else setTimeout(() => B.go({ edit: who, layer, alt: alt ? `${layer}:${alt}` : null }), 700); }
    }
    async function countSaves() {
        if (!B || layer === 'override') { undoSave.disabled = true; undoSave.querySelector('.n').textContent = '–'; return; }
        const alt = B.alt?.layer === layer ? B.alt.name : '';
        const j = await fetch(`/api/v2undo?layer=${layer}${alt ? `&alt=${alt}` : ''}`).then(r => r.json()).catch(() => ({ count: 0 }));
        undoSave.querySelector('.n').textContent = String(j.count ?? 0); undoSave.disabled = !j.count; undoSave.title = `Undo last save (${j.count ?? 0} kept: each save keeps the version it replaced)`;
    }

    // ---- what is shown ----
    // (2026-11-27, the user: "remove arms, remove head, remove legs — so I can make sure the body looks like I want"): each
    // point's part, from the section it was built in (its structural key: 'arms.…', 'legs.…', 'head.…'); a face goes when
    // all its corners are in a hidden part (the faces joining a part to the torso stay: no holes in the body)
    const PART = { arms: 'arms', legs: 'legs', feet: 'legs', head: 'head', hair: 'head', nose: 'head', ears: 'head', face: 'head', mouth: 'head', eyes: 'head', brows: 'head' };
    const showPart = { arms: true, head: true, legs: true };
    let partOf = [];
    const hiddenPt = i => (!hairOn && T.hair?.[i]) || (partOf[i] && !showPart[partOf[i]]);
    function applyHair() {
        if (!T) return;
        const pm = bodyMesh.userData.points; partOf = T.keys.map(k => PART[(pm?.get(k)?.t ?? '').split('.')[0]] ?? null);
        const any = !hairOn || Object.values(showPart).some(v => !v);
        const idx = !any ? T.idx : T.idx.filter((_, n, a) => { const b = n - (n % 3); return !(hiddenPt(a[b]) && hiddenPt(a[b + 1]) && hiddenPt(a[b + 2])); });
        geo.setIndex(idx); if (sel >= 0 && hiddenPt(sel)) sel = -1;
        if (faceMesh) faceMesh.visible = eyesOn && showPart.head; if (mouthMesh) mouthMesh.visible = mouthOn && showPart.head;
        if (wire) { const wg = new THREE.BufferGeometry(); wg.setAttribute('position', geo.attributes.position); wg.setIndex(idx); wire.geometry = wg; }   // (the wireframe keeps its own copy of the faces: a new one, without the hair's)
        buildDots(); describe();
    }
    function setRegion(r) {
        lens = null;   // (a new frame: no Fit shift)
        region = r; for (const [k, b] of Object.entries(regBtns)) b.classList.toggle('on', k === r);
        const top = T ? Math.max(...T.P.filter((_, j) => j % 3 === 1)) : 1.85;   // (the crown's height: frame from it)
        if (T && !HUMAN(sex)) {   // a creature: framed from its own size — the head is its front end (+z), the upper body its front half
            const b = new THREE.Box3().setFromArray(T.P), c = b.getCenter(new THREE.Vector3()), z = b.getSize(new THREE.Vector3()), big = Math.max(z.x, z.y, z.z);
            if (r === 'head') { target.set(c.x, c.y + z.y * 0.25, b.max.z - z.z * 0.12); dist = big * 0.75; } else if (r === 'upper') { target.set(c.x, c.y, c.z + z.z * 0.25); dist = big * 1.2; } else { target.copy(c); dist = big * 2; }
        } else if (r === 'head') { target.set(0, top - 0.19, 0.02); dist = 0.78; } else if (r === 'upper') { target.set(0, top - 0.45, 0); dist = 1.3; } else { target.set(0, top / 2, 0); dist = 3.6; }
        if (T) buildDots();
        drawRef(true);
    }
    const inRegion = i => {
        if (!HUMAN(sex)) { if (region === 'all') return true; const zs = T.P.filter((_, j) => j % 3 === 2), z0 = Math.min(...zs), z1 = Math.max(...zs), z = T.P[i * 3 + 2]; return region === 'head' ? z > z1 - (z1 - z0) * 0.3 : z > (z0 + z1) / 2; }   // (a creature: by its length)
        const y = T.P[i * 3 + 1], top = T.P.reduce((m, v, j) => (j % 3 === 1 && v > m ? v : m), 0); return region === 'all' || (region === 'head' ? y > top - 0.42 : y > top - 0.9);
    };

    function load(s, keepView = false) {   // (keepView: a live rebuild — the view, the region and the layer stay as they were)
        who = s; B = getBody(s); T = B.table; bodyMesh = B.mesh; sex = bodyMesh.userData.editSex ?? 'male'; sel = -1; hover = -1; undo.length = 0; redo.length = 0;
        bodySel.value = String(s); showDress();
        const Ls = stackOf(); if (!Ls.includes(layer)) layer = Ls.at(-1); showLayers();   // (by default the body's own: its age layer, else its sex)
        group.clear();
        geo = new THREE.BufferGeometry();
        bind = Float32Array.from(T.P); loaded = Float32Array.from(T.P);   // (loaded: as it came — what was moved here, at saving)   // the rest shape (what is saved); the view shows it posed (T.L, T.t: the A-pose)
        Linv = T.keys.map((_, i) => { const m = new THREE.Matrix3().fromArray(T.L.slice(i * 9, i * 9 + 9)); return m.determinant() ? m.clone().invert() : new THREE.Matrix3(); });
        geo.setAttribute('position', new THREE.Float32BufferAttribute(T.P.slice(), 3));
        for (let i = 0; i < T.keys.length; i++) refresh(i);
        geo.setAttribute('color', new THREE.Float32BufferAttribute(T.C, 3)); geo.setIndex(T.idx);
        mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
        wire = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true, transparent: true, opacity: 0.18 })); wire.visible = prefs.wireOn && !polish;
        group.add(mesh, wire);
        const feature = g => (g ? new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, side: THREE.DoubleSide })) : null);
        faceMesh = feature(T.faceGeo); mouthMesh = feature(T.mouthGeo);
        if (faceMesh) { faceMesh.visible = eyesOn; group.add(faceMesh); }
        if (mouthMesh) { mouthMesh.visible = mouthOn; group.add(mouthMesh); }
        // mirrors: the point at (−x, y, z)
        const by = new Map(); T.keys.forEach((k, i) => by.set(k, i));
        mirrorOf = T.keys.map(k => { const [x, y, z] = keyPos(k); if (Math.abs(x) < 1e-4) return -2; const m = by.get(`${(-x).toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`); return m ?? -1; });
        if (keepView) { buildDots(); drawRef(true); } else setRegion(region); applyHair(); show();   // (the hair and the hidden parts as they were set)
    }
    let dotIds = [];
    function buildDots() {
        if (dots) { group.remove(dots); dots.geometry.dispose(); }
        dotIds = T.keys.map((_, i) => i).filter(i => inRegion(i) && !hiddenPt(i));
        const r = (region === 'head' ? 0.0028 : region === 'upper' ? 0.005 : 0.008) * (HUMAN(sex) ? 1 : 1.4);
        dots = new THREE.InstancedMesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ depthTest: true }), dotIds.length);
        dots.renderOrder = 5; dots.visible = !polish; group.add(dots); placeDots();
    }
    function placeDots() {
        const p = geo.attributes.position;
        dotIds.forEach((i, n) => {
            const big = i === hover || i === sel || (sel >= 0 && i === mirrorOf[sel]) || i === addFrom || i === edgeFrom || groupSel.has(i);
            tmpM.makeTranslation(p.getX(i), p.getY(i), p.getZ(i)); if (big) tmpM.scale(new THREE.Vector3(1.8, 1.8, 1.8)); dots.setMatrixAt(n, tmpM);
            const isSel = i === sel || (sel >= 0 && i === mirrorOf[sel]);
            dots.setColorAt(n, col.set(i === addFrom || i === edgeFrom ? 0x60ff80 : isSel ? 0xff3030 : groupSel.has(i) ? 0xff70ff : i === hover ? 0xffa040 : mirrorOf[i] === -2 ? 0xffe070 : moved(i) ? 0x60d0ff : 0xffffff));
        });
        dots.instanceMatrix.needsUpdate = true; if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    }
    let bind = null, Linv = [];
    const view = (i, x, y, z) => { const L = T.L, o = i * 9; return [L[o] * x + L[o + 3] * y + L[o + 6] * z + T.t[i * 3], L[o + 1] * x + L[o + 4] * y + L[o + 7] * z + T.t[i * 3 + 1], L[o + 2] * x + L[o + 5] * y + L[o + 8] * z + T.t[i * 3 + 2]]; };
    function refresh(i) { geo.attributes.position.setXYZ(i, ...view(i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2])); }
    const moved = i => { const [x, y, z] = keyPos(T.keys[i]); return Math.hypot(bind[i * 3] - x, bind[i * 3 + 1] - y, bind[i * 3 + 2] - z) > 1e-4; };   // (keys hold 4 decimals: under 0.1 mm is 'not moved')
    function setPoint(i, x, y, z) { bind[i * 3] = x; bind[i * 3 + 1] = y; bind[i * 3 + 2] = z; refresh(i); }   // (rest-shape coordinates)
    function movePoint(i, dx, dy, dz, quiet = false) {
        const p = geo.attributes.position, d = new THREE.Vector3(dx, dy, dz).applyMatrix3(Linv[i]);   // the drag (posed) → the rest shape
        if (mirrorOf[i] === -2) d.x = 0;   // a point on the centre line stays on it
        setPoint(i, bind[i * 3] + d.x, bind[i * 3 + 1] + d.y, bind[i * 3 + 2] + d.z);
        const m = mirrorOf[i]; if (m >= 0) setPoint(m, bind[m * 3] - d.x, bind[m * 3 + 1] + d.y, bind[m * 3 + 2] + d.z);
        if (!quiet) { p.needsUpdate = true; geo.computeBoundingSphere(); placeDots(); describe(); }   // (quiet: a group's points, refreshed once after all)
    }
    function snapshotIds(ids) { const all = new Set(); for (const i of ids) { all.add(i); if (mirrorOf[i] >= 0) all.add(mirrorOf[i]); } undo.push([...all].map(i => [i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2]])); if (undo.length > 200) undo.shift(); redo.length = 0; }
    function snapshot() { const ids = [sel, mirrorOf[sel]].filter(i => i >= 0); undo.push(ids.map(i => [i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2]])); if (undo.length > 200) undo.shift(); redo.length = 0; }   // (a new move: nothing left to redo)
    const stateOf = s => s.map(([i]) => [i, bind[i * 3], bind[i * 3 + 1], bind[i * 3 + 2]]);
    function doRedo() { const s = redo.pop(); if (!s) { info.textContent = 'Nothing to redo.'; return; } undo.push(stateOf(s)); for (const [i, x, y, z] of s) setPoint(i, x, y, z); geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function doUndo() { const s = undo.pop(); if (!s) { info.textContent = 'No unsaved move to undo (⤺ Save takes back a save).'; return; } redo.push(stateOf(s)); for (const [i, x, y, z] of s) setPoint(i, x, y, z); geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function resetSel() { if (sel < 0) return; snapshot(); for (const i of [sel, mirrorOf[sel]].filter(i => i >= 0)) { const [x, y, z] = keyPos(T.keys[i]); setPoint(i, x, y, z); } geo.attributes.position.needsUpdate = true; placeDots(); describe(); }
    function resetAll() { for (let i = 0; i < T.keys.length; i++) { const [x, y, z] = keyPos(T.keys[i]); setPoint(i, x, y, z); } geo.attributes.position.needsUpdate = true; undo.length = 0; redo.length = 0; placeDots(); describe(); }
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
    let addFrom = -1, edgeFrom = -1;
    const groupSel = new Set();   // (2026-11-27, the user: "select and move a group of points — the feet of an animal, to make its legs longer")
    function topoOp(kind, i, j) {   // (with the mirror: the centre line maps to itself; a point with no mirror, none)
        const pm = bodyMesh.userData.points, t = k => pm.get(T.keys[k])?.t, m = k => (mirrorOf[k] === -2 ? k : mirrorOf[k]), g = Date.now();
        if (!t(i) || !t(j)) return;
        const ops = [[kind, t(i), t(j), g]], mi = m(i), mj = m(j);
        if (mi >= 0 && mj >= 0 && !(new Set([mi, mj]).size === 2 && [mi, mj].every(x => x === i || x === j)) && t(mi) && t(mj)) ops.push([kind, t(mi), t(mj), g]);
        info.textContent = kind === 'flip' ? `Turning the line${ops.length === 2 ? ' (and its mirror, where it is the same line)' : ''} — saving…` : `${kind === 'add' ? 'Adding' : 'Removing'} ${ops.length === 2 ? 'a point and its mirror' : 'a point'} — saving…`;
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
        info.textContent = r.ok ? `Saved ${changed} moved points into ${where}…` : `Save refused: ${(await r.json().catch(() => ({}))).error ?? r.status}`;
        if (r.ok) { if (!alt && await B.live?.(layer)) { info.textContent = `Saved ${changed} moved points into ${where} — applied live.`; countSaves(); } else setTimeout(() => B.go({ edit: who, layer, alt: alt ? `${layer}:${alt}` : null }), 700); }
    }

    // ---- input ----
    // pen and mouse: the tool; the pen's side button (or the mouse's right/middle): orbit / pan. Fingers: navigation, and —
    // until a pen has been used — the tool too (a tap picks within a finger's reach). A touch while the pen is down is a palm.
    const canvas = renderer.domElement;
    const area = () => viewRect?.() ?? canvas.getBoundingClientRect();
    let penSeen = false, penDown = false;
    function pick(e, reach) {
        const r = area(); if (polish || e.clientX > r.left + r.width) return -1;   // (the compare's half: no point; Polish: none)
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
        if (t === 'edge') {   // turn a line: its two ends, one after the other
            if (i < 0) return null;
            if (edgeFrom < 0) { edgeFrom = i; sel = i; placeDots(); info.textContent = 'Turn a line: now the point at its other end.'; return null; }
            const from = edgeFrom; edgeFrom = -1; let shared = 0;
            for (let f = 0; f < T.idx.length; f += 3) { const tri = [T.idx[f], T.idx[f + 1], T.idx[f + 2]]; if (tri.includes(from) && tri.includes(i)) shared++; }
            if (i !== from && shared === 2) topoOp('flip', from, i); else { info.textContent = shared ? 'That line borders only one face — it cannot turn. Pick its first end again.' : 'No line joins these two points — pick the first end again.'; placeDots(); }
            return null;
        }
        if (t === 'group') {
            if (i < 0) return { kind: 'box', x0: e.clientX, y0: e.clientY };   // a box round the points to take
            const had = groupSel.has(i); groupSel.add(i); sel = i; snapshotIds([...groupSel]);
            const p = geo.attributes.position, at = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
            placeDots(); describe();
            return { kind: 'gpoint', i, had, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()), at), last: at.clone(), x0: e.clientX, y0: e.clientY, live: false };
        }
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
            dist = Math.max(0.15, Math.min(MAX_DIST, pinch.dist * pinch.d / Math.max(1, d)));
            const cx = (a[0] + b2[0]) / 2, cy = (a[1] + b2[1]) / 2; panBy(cx - pinch.cx, cy - pinch.cy); pinch.cx = cx; pinch.cy = cy; return;
        }
        if (!drag) {   // a pen hovering (or a mouse): the point it would take
            if ((e.pointerType === 'pen' || e.pointerType === 'mouse') && !e.buttons && ['move', 'add', 'remove', 'edge', 'group'].includes(prefs.tool) && dots) { const h = pick(e, reachOf(e)); if (h !== hover) { hover = h; placeDots(); } }
            return;
        }
        e.stopImmediatePropagation();
        if (drag.kind === 'box') { showBox(drag.x0, drag.y0, e.clientX, e.clientY); return; }
        if (drag.kind === 'gpoint' && !drag.live) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < (e.pointerType === 'pen' ? 3 : 8)) return; drag.live = true; }
        if (drag.kind === 'point' && !drag.live) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < (e.pointerType === 'pen' ? 3 : 8)) return; drag.live = true; }   // (a tap selects; the point moves once the pen or finger does)
        if (drag.kind === 'orbit') { yaw -= (e.clientX - drag.x) * 0.01; pitch = Math.max(-1.3, Math.min(1.3, pitch + (e.clientY - drag.y) * 0.01)); drag.x = e.clientX; drag.y = e.clientY; return; }
        if (drag.kind === 'pan') { panBy(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; return; }
        const r = area(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera); const hit = new THREE.Vector3();
        if (ray.ray.intersectPlane(drag.plane, hit)) { const d = hit.clone().sub(drag.last); drag.last.copy(hit); if (drag.kind === 'gpoint') moveGroup(d.x, d.y, d.z); else movePoint(sel, d.x, d.y, d.z); }
    }, true);
    function panBy(dx, dy) {   // screen pixels → the view's target moves with the drag (the model follows the pen or finger)
        const r = area(), [ri, u] = camAxes(), k = (2 * dist * Math.tan(camera.fov * Math.PI / 360)) / r.height;
        target.addScaledVector(ri, -dx * k).addScaledVector(u, dy * k);
    }
    // the group: moved together (each point once — its mirror follows it), taken by a box, shown in magenta
    const boxEl = make('div', '', document.body); boxEl.style.cssText = 'position:fixed;border:1.5px dashed #ff70ff;background:#ff70ff18;pointer-events:none;display:none;z-index:7';
    function showBox(x0, y0, x1, y1) { Object.assign(boxEl.style, { display: 'block', left: `${Math.min(x0, x1)}px`, top: `${Math.min(y0, y1)}px`, width: `${Math.abs(x1 - x0)}px`, height: `${Math.abs(y1 - y0)}px` }); }
    function moveGroup(dx, dy, dz) {
        const done = new Set();
        for (const i of groupSel) { if (done.has(i)) continue; movePoint(i, dx, dy, dz, true); done.add(i); if (mirrorOf[i] >= 0) done.add(mirrorOf[i]); }
        geo.attributes.position.needsUpdate = true; geo.computeBoundingSphere(); placeDots(); describe();
    }
    function endGroupDrag(e) {
        if (drag?.kind === 'gpoint' && !drag.live && drag.had) { groupSel.delete(drag.i); placeDots(); describe(); }   // (a tap on a grouped point: out of the group)
        if (drag?.kind === 'box') {
            boxEl.style.display = 'none';
            const x0 = Math.min(drag.x0, e.clientX), x1 = Math.max(drag.x0, e.clientX), y0 = Math.min(drag.y0, e.clientY), y1 = Math.max(drag.y0, e.clientY);
            if (x1 - x0 < 6 && y1 - y0 < 6) groupSel.clear();   // (a tap on nothing: the group let go)
            else { const r = area(), p = geo.attributes.position, v = new THREE.Vector3(); for (const i of dotIds) { v.set(p.getX(i), p.getY(i), p.getZ(i)).project(camera); const sx = r.left + (v.x + 1) / 2 * r.width, sy = r.top + (1 - v.y) / 2 * r.height; if (v.z < 1 && sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) groupSel.add(i); } }
            info.textContent = groupSel.size ? `Group: ${groupSel.size} points — drag any of them to move them all (Esc lets go).` : 'Group cleared.';
            placeDots();
        }
    }
    const lift = e => {
        if (on) endGroupDrag(e);
        if (e.pointerType === 'pen') penDown = false;
        touches.delete(e.pointerId); if (touches.size < 2) pinch = null;
        if (on) { e.stopImmediatePropagation(); drag = null; }
    };
    canvas.addEventListener('pointerup', lift, true); canvas.addEventListener('pointercancel', lift, true);
    canvas.addEventListener('pointerleave', () => { if (hover >= 0 && dots) { hover = -1; placeDots(); } });
    canvas.addEventListener('wheel', e => { if (!on) return; e.preventDefault(); dist = Math.max(0.15, Math.min(MAX_DIST, dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
    addEventListener('keydown', e => {
        if (!on || e.target.closest?.('input, select, textarea')) return;
        if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey))) { e.preventDefault(); doRedo(); return; }
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') { e.preventDefault(); doUndo(); return; }
        if (e.code === 'Escape' && addFrom >= 0) { addFrom = -1; placeDots(); info.textContent = 'Add cancelled.'; return; }
        if (e.code === 'Escape' && edgeFrom >= 0) { edgeFrom = -1; placeDots(); info.textContent = 'Turn cancelled.'; return; }
        if (e.code === 'Escape' && groupSel.size) { groupSel.clear(); placeDots(); info.textContent = 'Group cleared.'; return; }
        const key = { KeyV: 'move', KeyA: 'add', KeyX: 'remove', KeyE: 'edge', KeyG: 'group', KeyO: 'orbit', KeyP: 'pan' }[e.code]; if (key && !e.ctrlKey && !e.metaKey) { setTool(key); return; }
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

    function show() { on = true; group.visible = true; setTool(prefs.tool); labelPad(); for (const f of Object.values(toggles)) f(); hairBtn.classList.toggle('on', hairOn); sheetBtn.classList.toggle('on', refMode === 'sheet'); layout(); onEnter?.(); describe(); }
    function exit() { on = false; lens = null; if (camera.view?.enabled) camera.clearViewOffset(); group.visible = false; layout(); onExit?.(); }
    return {
        enter: (s, l, keepView = false) => { if (l) layer = l; load(s ?? who, keepView); }, exit, get on() { return on; }, get showCompare() { return cmpOn; }, group,
        frame() {
            if (!on) return; drawRef(); const dk = dist * Math.max(1, 0.8 / camera.aspect);   // (a tall narrow screen: further back, so the region fits across)
            camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * dk, target.y + Math.sin(pitch) * dk, target.z + Math.cos(yaw) * Math.cos(pitch) * dk); camera.lookAt(target);
            if (lens) { const r = area(); camera.setViewOffset(r.width, r.height, -lens.x, -lens.y, r.width, r.height); } else if (camera.view?.enabled) camera.clearViewOffset();
        },
        state: () => ({ who, sex, layer, sel, region, tool: prefs.tool, points: T?.keys.length ?? 0 }), _move: (i, dx, dy, dz) => { sel = i; snapshot(); movePoint(i, dx, dy, dz); }, _save: save, _saveAs: saveTo, _topo: topoOp, _neighbours: i => neighbours(i), _pad: padAct, _target: () => target.toArray(),
    };
}
