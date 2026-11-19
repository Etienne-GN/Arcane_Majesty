// Region editor: a top-down view of a region painted from its real terrain function, with every
// placed thing as a marker you can drag. Tools add lakes, hills, clearings, path points, monoliths,
// wolf dens, shadow posts, deer, archways, landmarks; the panel edits the selected thing and the
// region's settings. Save writes src/content/regions/<id>.json (dev server); Play opens the game there.
// Every map is listed: data regions (content/regions/*.json) can be edited; maps built in code (the glade, the
// tower, Thaloria, the East Road, the mountain) open as a preview painted from the real map, with Play here.
import { regionHeight } from '../engine/region.js';
import { PRESETS } from '../engine/quality.js';

// The maps built in code, built on demand (low quality: only the terrain and landmarks are read).
const CODE_MAPS = {
    outdoor: ['Thaloria Glade', () => import('../content/glade.js').then(m => m.createOutdoor({ quality: PRESETS.low }))],
    tower: ["Eldrin's Tower", () => import('../content/eldrinTower.js').then(m => m.createTower({ quality: PRESETS.low }))],
    thaloria: ['Thaloria (from amo\'s city data)', () => import('../content/thaloria.js').then(m => m.createThaloria({ quality: PRESETS.low }))],
    east_road: ['The Thalorian Wilds — East Road (from amo\'s region data)', () => import('../content/eastRoad.js').then(m => m.createEastRoad({ quality: PRESETS.low }))],
    the_summit: ['Summit of Despair — the mountain (code)', () => import('../content/mountain.js').then(m => m.createMountain({ quality: PRESETS.low }))],
};
let preview = null;   // { id, name, img, map } while a code map is open

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
    const A = hex(def.palette.grassA), B = hex(def.palette.grassB), R = hex(def.palette.rock), SH = hex(def.palette.shore), SN = def.palette.snow ? hex(def.palette.snow) : null;
    for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
        const x = (px / n) * def.half * 2 - def.half, z = (py / n) * def.half * 2 - def.half, y = h(x, z);
        const T = def.terrain ?? {};
        let c = y < W - 0.6 ? [30, 64, 86] : y < W ? [52, 96, 112] : y < W + 0.35 ? SH : SN && y > (T.snowLine ?? 14) ? SN : y > (T.rockLine ?? 7) ? R : A.map((v, i) => v + (B[i] - v) * Math.max(0, Math.min(1, (y + 1) / 6)));
        for (const t of def.tints ?? []) { const d = Math.hypot(x - t.x, z - t.z); if (d < t.r) { const k = (t.k ?? 0.8) * Math.min(1, (t.r - d) / (t.r * 0.6)), tc = hex(t.color); c = c.map((v, i) => v + (tc[i] - v) * k); } }
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
    def.features.filter(f => f.type !== 'river').forEach(f => out.push({ kind: f.type, obj: f, r: f.r, color: { lake: '#6ab0ff', hill: '#c8a060', clearing: '#b8e08a' }[f.type], list: def.features }));
    def.features.filter(f => f.type === 'river').forEach(f => f.pts.forEach((p, i) => out.push({ kind: 'river', arr: p, i, color: '#4a90d0', list: f.pts })));
    for (const [name, p] of Object.entries(def.places ?? {})) out.push({ kind: 'place', obj: p, color: '#ffd76a', label: `★ ${name}` });   // a coded region's own pieces (the Sanctuary's ford, hut…)
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
    if (['lake', 'hill', 'clearing', 'path', 'river'].includes(it.kind)) dirtyTerrain = true;
}

function drawPreview() {
    g.fillStyle = '#0d0b10'; g.fillRect(0, 0, S, S);
    if (!preview.img) { g.fillStyle = '#eee6d2'; g.font = '18px Georgia'; g.fillText(`Building ${preview.name}…`, 30, 40); return; }
    g.drawImage(preview.img, 0, 0, S, S);
    const info = preview.map.mapInfo, half = info.half;
    g.font = '13px Georgia';
    for (const l of info.landmarks ?? []) {
        const cx = ((l.x + half) / (half * 2)) * S, cy = ((l.z + half) / (half * 2)) * S;
        g.fillStyle = '#f3e2b0'; g.strokeStyle = '#000'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 6, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#000b'; g.fillText(l.name, cx + 10, cy + 5); g.fillStyle = '#fff'; g.fillText(l.name, cx + 9, cy + 4);
    }
}
// The same top-down painting as the game's map, from the map's own heightAt.
function paintPreview(map) {
    const info = map.mapInfo, half = info.half, n = 300, img = new ImageData(n, n);
    for (let py = 0; py < n; py++) for (let px = 0; px < n; px++) {
        const x = (px / n) * half * 2 - half, z = (py / n) * half * 2 - half, h = map.heightAt(x, z);
        let col = h < info.water - 0.6 ? [38, 78, 104] : h < info.water ? [64, 112, 128] : h < info.water + 0.35 ? [176, 156, 110] : h > 17 ? [226, 232, 236] : h > 6 ? [118, 112, 104]
            : (info.ground ?? [90, 126, 62]).map(v => v * (0.85 + 0.15 * Math.max(0, Math.min(1, (h + 1) / 7))));
        const shade = 0.85 + 0.15 * Math.max(-1, Math.min(1, (map.heightAt(x - 1, z - 1) - h) * 0.6));
        img.data.set([col[0] * shade, col[1] * shade, col[2] * shade, 255], (py * n + px) * 4);
    }
    const c = document.createElement('canvas'); c.width = c.height = n;
    const cg = c.getContext('2d'); cg.putImageData(img, 0, 0);
    for (const [x, z, pine] of info.trees ?? []) { cg.fillStyle = pine ? '#1f4a2c' : '#3f6a2c'; cg.fillRect(((x + half) / (half * 2)) * n - 1, ((z + half) / (half * 2)) * n - 1, 2, 2); }
    // Walls, houses, fences, rocks: the map's collision shapes, so towns read on the preview.
    const P = v => ((v + half) / (half * 2)) * n;
    cg.fillStyle = cg.strokeStyle = '#3a3430d0';
    for (const k of map.colliders ?? []) {
        if (k.ax !== undefined) { cg.lineWidth = Math.max(1, (k.r ?? 0.3) * 2 * n / (half * 2)); cg.beginPath(); cg.moveTo(P(k.ax), P(k.az)); cg.lineTo(P(k.bx), P(k.bz)); cg.stroke(); }
        else if (k.x !== undefined) { const r = Math.max(0.6, (k.r ?? 0.4) * n / (half * 2)); cg.beginPath(); cg.arc(P(k.x), P(k.z), r, 0, Math.PI * 2); cg.fill(); }
        else if (k.minX !== undefined) cg.fillRect(P(k.minX), P(k.minZ), P(k.maxX) - P(k.minX), P(k.maxZ) - P(k.minZ));
    }
    return c;
}
async function openPreview(id) {
    const [name, build] = CODE_MAPS[id];
    preview = { id, name, img: null, map: null };
    refresh();
    try {
        const map = await build();
        if (preview?.id !== id) return;
        preview.map = map; preview.img = map.mapInfo ? paintPreview(map) : null;
        if (!map.mapInfo) preview.name += ' — no map view';
    } catch (e) { preview.name += ` — could not build (${e.message})`; }
    refresh();
}

function draw() {
    if (preview) return drawPreview();
    if (dirtyTerrain) paintTerrain();
    g.imageSmoothingEnabled = true;
    g.drawImage(terrainImg, 0, 0, S, S);
    if (def.path.length > 1) {
        g.strokeStyle = '#e0c890cc'; g.lineWidth = 3; g.beginPath();
        def.path.forEach(([x, z], i) => { const [cx, cy] = toC(x, z); i ? g.lineTo(cx, cy) : g.moveTo(cx, cy); });
        g.stroke();
    }
    for (const f of def.features.filter(f => f.type === 'river')) {
        g.strokeStyle = '#4a90d0cc'; g.lineWidth = 4; g.beginPath();
        f.pts.forEach(([x, z], i) => { const [cx, cy] = toC(x, z); i ? g.lineTo(cx, cy) : g.moveTo(cx, cy); });
        g.stroke();
    }
    g.font = '12px Georgia';
    for (const it of items()) {
        const [x, z] = posOf(it), [cx, cy] = toC(x, z), on = sel && (sel.obj ? sel.obj === it.obj : sel.arr === it.arr);
        if (it.r) { g.strokeStyle = it.color; g.lineWidth = on ? 3 : 1.5; g.beginPath(); g.arc(cx, cy, it.r / mPerPx(), 0, Math.PI * 2); g.stroke(); }
        g.fillStyle = it.color; g.strokeStyle = on ? '#fff' : '#000'; g.lineWidth = on ? 3 : 1.5;
        g.beginPath(); g.arc(cx, cy, it.kind === 'path' || it.kind === 'river' ? 4 : 7, 0, Math.PI * 2); g.fill(); g.stroke();
        const label = it.label ?? (it.kind === 'path' || it.kind === 'river' ? '' : it.kind);
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
    if (preview) return;
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
    pickReg.style.width = '100%';
    pickReg.append(el('option', { value: '' }, 'Open a map…'), el('option', { value: '__new' }, '＋ New region'));
    const editable = el('optgroup', { label: 'Regions — editable' }), coded = el('optgroup', { label: 'Built in code — preview' });
    for (const [id, [name]] of Object.entries(CODE_MAPS)) coded.append(el('option', { value: `code:${id}` }, name));
    pickReg.append(editable, coded);
    fetch('api/region').then(r => r.json()).then(list => list.forEach(d => editable.append(el('option', { value: JSON.stringify(d) }, `${d.name ?? d.id}${d.builder ? ' (+ coded pieces)' : ''}`)))).catch(() => {});
    pickReg.onchange = () => {
        if (!pickReg.value) return;
        if (pickReg.value.startsWith('code:')) return openPreview(pickReg.value.slice(5));
        preview = null;
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
    if (preview) {   // a map built in code: look, and play — its layout lives in code (or in amo's own map data)
        save.style.display = 'none';
        play.onclick = () => window.open(`index.html?region=${encodeURIComponent(preview.id)}&play=1`, '_blank');
        box.append(el('h2', {}, preview.name), el('div', { className: 'sub' }, 'Built in code, so it is shown here but not edited here. Thaloria and the East Road come from amo\'s own map data; the glade, the tower and the mountain are built in their content files. The interiors open through their doors in the game.'));
        for (const l of preview.map?.mapInfo?.landmarks ?? []) box.append(el('div', { className: 'sub' }, `• ${l.name}`));
        draw();
        return;
    }
    if (def.builder) box.append(el('div', { className: 'sub' }, `This region also has coded pieces (${def.builder}). The ★ markers are where they stand — drag them to move them.`));

    box.append(el('h2', {}, 'Tools'));
    const tools = el('div', { className: 'tools' });
    for (const t of ['select', 'lake', 'hill', 'clearing', 'path', 'gate', 'wolves', 'shadow post', 'deer', 'link', 'landmark', 'delete']) {   // (river points: drag them)
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
window.__editor = { get def() { return def; }, openPreview, get preview() { return preview; }, setTool: t => { tool = t; refresh(); }, add: (x, z) => { add(x, z); refresh(); }, refresh };

// Back to the game (the title's Workshop opens this page).
{ const a = document.createElement('a'); a.href = 'index.html'; a.textContent = '← Game'; a.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:50;padding:5px 10px;font:14px Georgia,serif;color:#f3e2b0;background:#120a06d8;border:1px solid #f3d88b66;border-radius:4px;text-decoration:none'; document.body.append(a); }
