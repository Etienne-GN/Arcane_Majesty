// World Biomes editor (biomes.html, from the Land Editor): Eldoria's biome map and the biome registry.
// Left: the whole of Eldoria coloured by biome (the same blend the game uses: each place's biome full over it, fading over
// its radius; zones; the base biome's little weight everywhere), every place as a dot, every zone as a circle (drag it).
// Right: the place's biome (click a place), the zone's biome and radius (click a zone; "Add zone" then click the map), and
// every field of the selected biome. Save writes content/world/biomes/*.json and content/world/biome_maps/eldoria.json
// (dev server); the game reads them on its next load.
import LAYOUT from '../content/world/eldoria_layout.json';
import { STAMP_OF } from '../game/travel.js';

const cv = document.getElementById('map'), g = cv.getContext('2d'), S = cv.width, box = document.getElementById('controls');
const fk = () => (matchMedia('(pointer: coarse)').matches ? Math.max(1, 0.85 * S / cv.getBoundingClientRect().width) : 1);   // (a phone: the map's labels drawn larger, as the canvas is shown smaller)
const HALF = 4200, toC = (x, z) => [(x + HALF) / (HALF * 2) * S, (z + HALF) / (HALF * 2) * S], toW = (cx, cy) => [cx / S * HALF * 2 - HALF, cy / S * HALF * 2 - HALF];
const el = (t, p = {}, ...kids) => { const e = Object.assign(document.createElement(t), p); e.append(...kids); return e; };
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
let biomes = {}, bmap = null, selBiome = null, selPlace = null, selZone = null, tool = 'select', drag = null, dirty = new Set(), mapDirty = false, preview = null;
// the places: every world-map place (its stamp id when it is a stamped place)
const PLACES = LAYOUT.places.map(p => ({ name: p.name, x: p.world[0], z: p.world[1], id: STAMP_OF[p.name] ?? null }));
const CORE = { thaloria: 160, outdoor: 110, east_road: 90, the_summit: 80, whisper_wood: 70, duskmeet: 60, emerald_fields: 80, the_crossroads: 60 };

async function load() {
    biomes = Object.fromEntries((await (await fetch('/api/biomes')).json()).map(b => [b.id, b]));
    bmap = (await (await fetch('/api/biomemaps')).json()).find(m => m.id === 'eldoria') ?? { id: 'eldoria', base: 'temperate_meadow', baseWeight: 0.18, places: {}, zones: [] };
    selBiome = Object.keys(biomes)[0]; repaint(); panel();
}
// the blend, as the game does it (content/world/eldoria.js makeBiomes), at a coarse grid
function repaint() {
    const n = 190, img = new ImageData(n, n), srcs = [];
    for (const p of PLACES) { const b = biomes[bmap.places[p.id]]; if (p.id && b) srcs.push({ b, x: p.x, z: p.z, core: CORE[p.id] ?? 55, R: b.radius ?? 600 }); }
    for (const zn of bmap.zones) { const b = biomes[zn.biome]; if (b) srcs.push({ b, x: zn.x, z: zn.z, core: zn.r * 0.6, R: zn.r }); }
    const base = biomes[bmap.base], bw = bmap.baseWeight ?? 0.18;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
        const [x, z] = toW((i + 0.5) / n * S, (j + 0.5) / n * S); let r = 0, gg = 0, bb = 0, t = 0;
        const add = (b, w) => { const c = hex(b.palette.grassB); r += c[0] * w; gg += c[1] * w; bb += c[2] * w; t += w; };
        if (base) add(base, bw);
        for (const s of srcs) { const d = Math.max(0, Math.hypot(x - s.x, z - s.z) - s.core); if (d < s.R * 1.6) add(s.b, Math.exp(-2.5 * (d / s.R) ** 2)); }
        img.data.set([r / t, gg / t, bb / t, 255], (j * n + i) * 4);
    }
    const c = document.createElement('canvas'); c.width = c.height = n; c.getContext('2d').putImageData(img, 0, 0); preview = c; draw();
}
function draw() {
    g.imageSmoothingEnabled = true; g.drawImage(preview, 0, 0, S, S);
    g.font = `${Math.round(12 * fk())}px Georgia`; g.textAlign = 'center';
    for (const p of PLACES) {
        const [x, y] = toC(p.x, p.z), b = biomes[bmap.places[p.id]];
        g.fillStyle = p === selPlace ? '#ffe08a' : p.id ? '#1a1410' : '#1a141066'; g.beginPath(); g.arc(x, y, p.id ? 5 : 3, 0, 7); g.fill();
        g.fillStyle = '#fff8e8'; g.strokeStyle = '#000a'; g.lineWidth = 3; const t = p.name.replace(/ \(.*\)/, '') + (b ? ` · ${b.name}` : ''); g.strokeText(t, x, y - 9); g.fillText(t, x, y - 9);
    }
    for (const zn of bmap.zones) { const [x, y] = toC(zn.x, zn.z); g.strokeStyle = zn === selZone ? '#ffe08a' : '#fff8'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, zn.r / (HALF * 2) * S, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.fillText(biomes[zn.biome]?.name ?? zn.biome, x, y + 4); }
}
cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(), cx = (e.clientX - r.left) / r.width * S, cy = (e.clientY - r.top) / r.height * S, [x, z] = toW(cx, cy);
    if (tool === 'zone') { const zn = { x: Math.round(x), z: Math.round(z), r: 500, biome: selBiome }; bmap.zones.push(zn); selZone = zn; selPlace = null; mapDirty = true; tool = 'select'; repaint(); panel(); return; }
    const near = (px, pz, rad) => Math.hypot(...toC(px, pz).map((v, i) => v - [cx, cy][i])) < rad;
    const k = matchMedia('(pointer: coarse)').matches ? Math.max(1, 1.8 * S / r.width) : 1;   // (a finger: a wider reach)
    const zn = bmap.zones.find(q => near(q.x, q.z, 14 * k));
    const pl = PLACES.find(p => p.id && near(p.x, p.z, 9 * k));
    selZone = zn ?? null; selPlace = zn ? null : pl ?? null;
    if (selZone) { drag = selZone; cv.setPointerCapture(e.pointerId); }
    if (selPlace && biomes[bmap.places[selPlace.id]]) selBiome = bmap.places[selPlace.id];
    if (selZone) selBiome = selZone.biome;
    draw(); panel();
});
cv.addEventListener('pointermove', e => { if (!drag) return; const r = cv.getBoundingClientRect(), [x, z] = toW((e.clientX - r.left) / r.width * S, (e.clientY - r.top) / r.height * S); drag.x = Math.round(x); drag.z = Math.round(z); mapDirty = true; draw(); });
cv.addEventListener('pointerup', () => { if (drag) { drag = null; repaint(); } });

function field(label, input) { return el('label', {}, label, input); }
function num(obj, key, step = 1, onChange) { const i = el('input', { type: 'number', step, value: obj[key] ?? 0 }); i.onchange = () => { obj[key] = +i.value; onChange(); }; return i; }
function col(obj, key, onChange) { const i = el('input', { type: 'color', value: obj[key] ?? '#808080' }); i.oninput = () => { obj[key] = i.value; onChange(); }; return i; }
function txt(obj, key, onChange) { const i = el('input', { type: 'text', value: obj[key] ?? '' }); i.onchange = () => { obj[key] = i.value; onChange(); }; return i; }
function biomeSelect(value, onPick) { const s = el('select'); for (const b of Object.values(biomes)) s.append(el('option', { value: b.id, textContent: b.name, selected: b.id === value })); s.onchange = () => onPick(s.value); return s; }

function panel() {
    box.replaceChildren();
    const status = el('div', { id: 'status' });
    // the map: the base biome, the selected place / zone
    box.append(el('h2', {}, 'The map'), field('Base biome (everywhere, a little)', biomeSelect(bmap.base, v => { bmap.base = v; mapDirty = true; repaint(); })), field('Base weight', num(bmap, 'baseWeight', 0.02, () => { mapDirty = true; repaint(); })));
    const tools = el('div', { className: 'tools' }, ...[['select', 'Select / drag'], ['zone', 'Add zone (click the map)']].map(([t, n]) => { const b = el('span', { className: 'tool' + (tool === t ? ' on' : ''), textContent: n }); b.onclick = () => { tool = t; panel(); }; return b; }));
    box.append(tools);
    if (selPlace) box.append(el('h2', {}, selPlace.name), field('Biome', biomeSelect(bmap.places[selPlace.id], v => { bmap.places[selPlace.id] = v; selBiome = v; mapDirty = true; repaint(); panel(); })));
    if (selZone) {
        const del = el('button', { textContent: 'Delete zone' }); del.onclick = () => { bmap.zones.splice(bmap.zones.indexOf(selZone), 1); selZone = null; mapDirty = true; repaint(); panel(); };
        box.append(el('h2', {}, 'Zone'), field('Biome', biomeSelect(selZone.biome, v => { selZone.biome = v; selBiome = v; mapDirty = true; repaint(); panel(); })), field('Radius (m)', num(selZone, 'r', 25, () => { mapDirty = true; repaint(); })), del);
    }
    // the selected biome
    const b = biomes[selBiome]; if (!b) return;
    const ch = () => { dirty.add(b.id); repaint(); };
    const nb = el('button', { textContent: 'New biome (a copy)' }); nb.onclick = () => { const id = prompt('Id for the new biome (lowercase, _):', b.id + '_2'); if (!id || !/^[a-z0-9_]{1,40}$/.test(id) || biomes[id]) return; biomes[id] = { ...JSON.parse(JSON.stringify(b)), id, name: b.name + ' (copy)' }; selBiome = id; dirty.add(id); panel(); };
    box.append(el('h2', {}, 'Biome'), field('Edit', biomeSelect(selBiome, v => { selBiome = v; panel(); })), nb,
        field('Name', txt(b, 'name', ch)), field('Description', txt(b, 'description', ch)), field('Radius (m)', num(b, 'radius', 25, ch)),
        el('h2', {}, 'Ground'), field('Grass A', col(b.palette, 'grassA', ch)), field('Grass B', col(b.palette, 'grassB', ch)), field('Rock', col(b.palette, 'rock', ch)), field('Dirt', col(b.palette, 'dirt', ch)),
        el('h2', {}, 'Vegetation'), field('Density (1 = ordinary)', num(b.vegetation, 'density', 0.1, ch)));
    b.vegetation.kinds ??= {};
    for (const k of ['pine', 'broad', 'birch', 'dead']) box.append(field(`Share of ${k}`, num(b.vegetation.kinds, k, 0.05, ch)));
    b.vegetation.colors ??= {};
    for (const k of ['pine', 'broad', 'birch']) box.append(field(`${k} colour`, col(b.vegetation.colors, k, ch)));
    const list = (key, label) => { const i = el('input', { type: 'text', value: (b[key] ?? []).map(w => Array.isArray(w) ? `${w[0]}×${w[1]}` : w).join(', ') }); i.onchange = () => { b[key] = i.value.split(',').map(s => s.trim()).filter(Boolean).map(s => (s.includes('×') ? [s.split('×')[0], +s.split('×')[1]] : s)); ch(); }; return field(label, i); };
    box.append(el('h2', {}, 'Life'), list('wildlife', 'Wildlife (animal×count, …)'), list('creatures', 'Creatures (kinds, …)'),
        el('h2', {}, 'Air'), field('Fog colour', col(b.mood, 'fog', ch)), field('Fog near (m)', num(b.mood, 'fogNear', 10, ch)), field('Fog far (m)', num(b.mood, 'fogFar', 20, ch)), field('Fog strength', num(b.mood, 'fogMix', 0.05, ch)), field('Light', num(b.mood, 'light', 0.05, ch)));
    const save = el('button', { className: 'main', textContent: 'Save' });
    save.onclick = async () => {
        const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
        const out = [];
        for (const id of dirty) out.push((await post('/api/biomes', biomes[id])).saved ?? 'error');
        if (mapDirty) out.push((await post('/api/biomemaps', bmap)).saved ?? 'error');
        dirty.clear(); mapDirty = false; status.textContent = out.length ? `Saved: ${out.join(', ')}. The game picks it up on its next load.` : 'Nothing changed.';
    };
    const back = el('a', { href: './editor.html', textContent: '← Land Editor' }); back.style.cssText = 'color:#f3d88b;margin-left:12px';
    box.append(el('div', { style: 'margin-top:14px' }, save, back), status);
}
load();
