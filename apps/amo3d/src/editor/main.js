// Region editor: a top-down view of a region painted from its real terrain function, with every
// placed thing as a marker you can drag. Tools add lakes, hills, clearings, path points, monoliths,
// wolf dens, shadow posts, deer, archways, landmarks; the panel edits the selected thing and the
// region's settings. Save writes src/content/regions/<id>.json (dev server); Play opens the game there.
import { regionHeight } from '../engine/region.js';

const cv = document.getElementById('map'), g = cv.getContext('2d'), S = cv.width;
const box = document.getElementById('controls');
const clone = o => JSON.parse(JSON.stringify(o));
const BLANK = {
    id: 'new_region', name: 'New Region', seed: 1, half: 80, water: -1.2,
    terrain: { scale: 0.02, relief: 10, base: 0.6, rim: 22 },
    palette: { grassA: '#4d7a35', grassB: '#7aa04a', dirt: '#6e5a3c', rock: '#77726b', shore: '#8a7a5a', undergrowth: '#3f6a2c', stone: '#6a6660', water: '#24485a' },
    mood: { fog: '#c9d6d4', fogNear: 50, fogFar: 200, fogMix: 0.4, light: 1, nightFloor: 0.4 },
    features: [], path: [], trees: { count: 500, gaps: 0.42, sizeVar: 0.7, kinds: { pine: 0.5, broad: 0.4, birch: 0.1 } },
    rocks: 60, gather: { herb: 6, mushroom: 4, berry: 4, wood: 4 }, gates: [], actors: [], landmarks: [], links: [],
    start: { x: 0, z: 0, facing: 0 },
};
let def = clone(BLANK), tool = 'select', sel = null, drag = null, terrainImg = null, dirtyTerrain = true;

// ---------- world ↔ canvas ----------
const toC = (x, z) => [((x + def.half) / (def.half * 2)) * S, ((z + def.half) / (def.half * 2)) * S];
const toW = (cx, cy) => [(cx / S) * def.half * 2 - def.half, (cy / S) * def.half * 2 - def.half];
const mPerPx = () => (def.half * 2) / S;

function paintTerrain() {
    const h = regionHeight(def), n = 300, img = new ImageData(n, n), W = def.water ?? -1.2;
    const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    const A = hex(def.palette.grassA), B = hex(def.palette.grassB), R = hex(def.palette.rock), SH = hex(def.palette.shore);
    for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
        const x = (px / n) * def.half * 2 - def.half, z = (py / n) * def.half * 2 - def.half, y = h(x, z);
        let c = y < W - 0.6 ? [30, 64, 86] : y < W ? [52, 96, 112] : y < W + 0.35 ? SH : y > 7 ? R : A.map((v, i) => v + (B[i] - v) * Math.max(0, Math.min(1, (y + 1) / 6)));
        const shade = 0.82 + 0.18 * Math.max(-1, Math.min(1, (h(x - 1, z - 1) - y) * 0.7));
        const i = (py * n + px) * 4;
        img.data.set([c[0] * shade, c[1] * shade, c[2] * shade, 255], i);
    }
    const c = document.createElement('canvas'); c.width = c.height = n;
    c.getContext('2d').putImageData(img, 0, 0);
    terrainImg = c; dirtyTerrain = false;
}

// ---------- the things on the map ----------
function items() {
    const out = [];
    def.features.forEach(f => out.push({ kind: f.type, obj: f, r: f.r, color: { lake: '#6ab0ff', hill: '#c8a060', clearing: '#b8e08a' }[f.type], list: def.features }));
    def.path.forEach((p, i) => out.push({ kind: 'path', arr: p, i, color: '#e0c890', list: def.path }));
    def.gates.forEach(gt => out.push({ kind: 'gate', obj: gt, color: '#7aa0ff', label: gt.label, list: def.gates }));
    def.links.forEach(l => out.push({ kind: 'link', obj: l, color: '#c8b8ff', label: l.label, list: def.links }));
    def.landmarks.forEach(l => out.push({ kind: 'landmark', obj: l, color: '#f3e2b0', label: l.name, list: def.landmarks }));
    def.actors.forEach(a => {
        if (a.type === 'wolves') out.push({ kind: 'wolves', obj: a.den, actor: a, color: '#ff8a6a', label: `wolves ×${a.count ?? 3}`, list: def.actors });
        if (a.type === 'shadows') a.posts.forEach(p => out.push({ kind: 'shadow post', obj: p, actor: a, color: '#b06aff', list: a.posts }));
        if (a.type === 'deer') a.homes.forEach(p => out.push({ kind: 'deer', obj: p, actor: a, color: '#c8a070', list: a.homes }));
    });
    out.push({ kind: 'start', obj: def.start, color: '#ffffff', label: 'start' });
    return out;
}
const posOf = it => (it.arr ? [it.arr[0], it.arr[1]] : [it.obj.x, it.obj.z]);
function setPos(it, x, z) {
    x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2;
    if (it.arr) { it.arr[0] = x; it.arr[1] = z; } else { it.obj.x = x; it.obj.z = z; }
    if (['lake', 'hill', 'clearing', 'path'].includes(it.kind)) dirtyTerrain = true;
}

function draw() {
    if (dirtyTerrain) paintTerrain();
    g.imageSmoothingEnabled = true;
    g.drawImage(terrainImg, 0, 0, S, S);
    if (def.path.length > 1) {
        g.strokeStyle = '#e0c890cc'; g.lineWidth = 3; g.beginPath();
        def.path.forEach(([x, z], i) => { const [cx, cy] = toC(x, z); i ? g.lineTo(cx, cy) : g.moveTo(cx, cy); });
        g.stroke();
    }
    g.font = '12px Georgia';
    for (const it of items()) {
        const [x, z] = posOf(it), [cx, cy] = toC(x, z), on = sel && (sel.obj ? sel.obj === it.obj : sel.arr === it.arr);
        if (it.r) { g.strokeStyle = it.color; g.lineWidth = on ? 3 : 1.5; g.beginPath(); g.arc(cx, cy, it.r / mPerPx(), 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = it.color; g.strokeStyle = on ? '#fff' : '#000'; g.lineWidth = on ? 3 : 1.5;
        g.beginPath(); g.arc(cx, cy, it.kind === 'path' ? 4 : 7, 0, Math.PI * 2); g.fill(); g.stroke();
        const label = it.label ?? (it.kind === 'path' ? '' : it.kind);
        if (label) { g.fillStyle = '#000b'; g.fillText(label, cx + 10, cy + 5); g.fillStyle = '#fff'; g.fillText(label, cx + 9, cy + 4); }
    }
}

// ---------- editing on the map ----------
function pick(cx, cy) {
    let best = null, bd = 12;
    for (const it of items()) { const [x, z] = posOf(it), [px, py] = toC(x, z), d = Math.hypot(px - cx, py - cy); if (d < bd) { bd = d; best = it; } }
    return best;
}
const canvasXY = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (S / r.width), (e.clientY - r.top) * (S / r.height)]; };
const actor = type => def.actors.find(a => a.type === type) ?? (def.actors.push(type === 'shadows' ? { type, posts: [] } : { type, homes: [] }), def.actors.at(-1));
let n = 0;
function add(x, z) {
    x = Math.round(x * 2) / 2; z = Math.round(z * 2) / 2;
    const id = `${def.id}_${Date.now().toString(36).slice(-4)}${n++}`;
    switch (tool) {
        case 'lake': def.features.push({ type: 'lake', x, z, r: 12, depth: 5 }); dirtyTerrain = true; break;
        case 'hill': def.features.push({ type: 'hill', x, z, r: 14, h: 5 }); dirtyTerrain = true; break;
        case 'clearing': def.features.push({ type: 'clearing', x, z, r: 10 }); dirtyTerrain = true; break;
        case 'path': def.path.push([x, z]); dirtyTerrain = true; break;
        case 'gate': def.gates.push({ id, label: 'New Monolith', x, z }); break;
        case 'wolves': def.actors.push({ type: 'wolves', den: { x, z }, count: 3 }); break;
        case 'shadow post': actor('shadows').posts.push({ x, z }); break;
        case 'deer': actor('deer').homes.push({ x, z }); break;
        case 'link': def.links.push({ label: 'To Thaloria Glade', x, z, facing: 0, spawn: `from_${id}`, to: 'outdoor', toSpawn: 'start' }); break;
        case 'landmark': def.landmarks.push({ name: 'New place', x, z, icon: 'stones' }); break;
        default: return;
    }
    sel = items().filter(it => it.kind === tool || (tool === 'path' && it.kind === 'path')).at(-1) ?? null;
}
function remove(it) {
    if (!it || it.kind === 'start') return;
    const list = it.list, idx = it.arr ? it.i : list.indexOf(it.kind === 'wolves' ? it.actor : it.obj);
    if (idx >= 0) list.splice(idx, 1);
    for (const a of [...def.actors]) if ((a.posts && !a.posts.length) || (a.homes && !a.homes.length)) def.actors.splice(def.actors.indexOf(a), 1);
    if (['lake', 'hill', 'clearing', 'path'].includes(it.kind)) dirtyTerrain = true;
    sel = null;
}
cv.addEventListener('pointerdown', e => {
    const [cx, cy] = canvasXY(e), hit = pick(cx, cy);
    if (tool === 'delete') { remove(hit); refresh(); return; }
    if (tool === 'select' || hit) { sel = hit; if (hit) drag = hit; cv.setPointerCapture(e.pointerId); refresh(); return; }
    add(...toW(cx, cy)); refresh();
});
cv.addEventListener('pointermove', e => { if (!drag) return; setPos(drag, ...toW(...canvasXY(e))); draw(); });
cv.addEventListener('pointerup', () => { if (drag) { drag = null; refresh(); } });

// ---------- panel ----------
const el = (tag, attrs = {}, text) => { const e = document.createElement(tag); Object.assign(e, attrs); if (text != null) e.textContent = text; return e; };
function field(label, obj, key, kind = typeof obj[key] === 'number' ? 'number' : /^#[0-9a-f]{6}$/i.test(obj[key] ?? '') ? 'color' : 'text', terrainEdit = false) {
    const l = el('label', {}, label);
    const i = el('input', { type: kind, value: obj[key] ?? '', step: 'any' });
    i.onchange = () => { obj[key] = kind === 'number' ? Number(i.value) : i.value; if (terrainEdit) dirtyTerrain = true; draw(); };
    l.append(i);
    return l;
}
function refresh() {
    box.textContent = '';
    const top = el('div');
    const pickReg = el('select');
    pickReg.append(el('option', { value: '' }, 'Open a region…'), el('option', { value: '__new' }, '＋ New region'));
    fetch('api/region').then(r => r.json()).then(list => list.forEach(d => pickReg.append(el('option', { value: JSON.stringify(d) }, d.name ?? d.id)))).catch(() => {});
    pickReg.onchange = () => {
        if (!pickReg.value) return;
        def = pickReg.value === '__new' ? clone(BLANK) : { ...clone(BLANK), ...JSON.parse(pickReg.value) };
        sel = null; dirtyTerrain = true; refresh();
    };
    top.append(pickReg);
    const save = el('button', { className: 'main' }, 'Save');
    save.onclick = async () => {
        const st = document.getElementById('status');
        try {
            const r = await fetch('api/region', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(def) });
            const j = await r.json();
            st.style.color = r.ok ? '#bfe6a0' : '#ff9a8a'; st.textContent = r.ok ? `Saved — ${j.saved}` : `Not saved: ${j.error}`;
        } catch { st.style.color = '#ff9a8a'; st.textContent = 'Saving needs the dev server (npm run dev).'; }
    };
    const play = el('button', {}, 'Play here ▸');
    play.onclick = () => window.open(`index.html?region=${encodeURIComponent(def.id)}&play=1`, '_blank');
    top.append(el('br'), save, play, el('div', { id: 'status' }));
    box.append(top);

    box.append(el('h2', {}, 'Tools'));
    const tools = el('div', { className: 'tools' });
    for (const t of ['select', 'lake', 'hill', 'clearing', 'path', 'gate', 'wolves', 'shadow post', 'deer', 'link', 'landmark', 'delete']) {
        const b = el('span', { className: `tool${tool === t ? ' on' : ''}` }, t);
        b.onclick = () => { tool = t; refresh(); };
        tools.append(b);
    }
    box.append(tools, el('div', { className: 'sub' }, tool === 'select' ? 'Drag markers to move them. Click one to edit it below.' : tool === 'delete' ? 'Click a marker to delete it.' : `Click the map to add: ${tool}. Existing markers can still be dragged.`));

    if (sel) {
        box.append(el('h2', {}, `Selected — ${sel.kind}`));
        if (sel.obj) for (const k of Object.keys(sel.obj)) if (!['x', 'z', 'type'].includes(k)) box.append(field(k, sel.obj, k, undefined, ['r', 'depth', 'h'].includes(k)));
        if (sel.kind === 'wolves') box.append(field('count', sel.actor, 'count', 'number'));
    }

    box.append(el('h2', {}, 'Region'));
    for (const k of ['id', 'name', 'seed', 'half', 'water']) box.append(field(k, def, k, undefined, ['seed', 'half', 'water'].includes(k)));
    box.append(el('h2', {}, 'Terrain'));
    for (const k of Object.keys(def.terrain)) box.append(field(k, def.terrain, k, 'number', true));
    box.append(el('h2', {}, 'Colours'));
    for (const k of Object.keys(def.palette)) box.append(field(k, def.palette, k, 'color', true));
    box.append(el('h2', {}, 'Mood'));
    for (const k of Object.keys(def.mood)) box.append(field(k, def.mood, k));
    box.append(el('h2', {}, 'Trees'));
    for (const k of ['count', 'gaps', 'sizeVar']) box.append(field(k, def.trees, k, 'number'));
    for (const k of ['pine', 'broad', 'birch', 'dead']) { def.trees.kinds[k] ??= 0; box.append(field(`${k} share`, def.trees.kinds, k, 'number')); }
    box.append(el('h2', {}, 'Gathering spots'));
    for (const k of ['herb', 'mushroom', 'berry', 'wood', 'mineral', 'reeds', 'shallows']) { def.gather[k] ??= 0; box.append(field(k, def.gather, k, 'number')); }
    draw();
}

refresh();
fetch('api/region').then(r => r.json()).then(list => { if (list[0]) { def = { ...clone(BLANK), ...list[0] }; dirtyTerrain = true; refresh(); } }).catch(() => {});
window.__editor = { get def() { return def; }, setTool: t => { tool = t; refresh(); }, add: (x, z) => { add(x, z); refresh(); }, refresh };
