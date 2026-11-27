import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';

const rules = fileURLToPath(new URL('../../packages/rules/index.js', import.meta.url));
const castDir = fileURLToPath(new URL('./src/content/cast', import.meta.url));
const regionDir = fileURLToPath(new URL('./src/content/regions', import.meta.url));
const mobNotesDir = fileURLToPath(new URL('./src/content/mob_notes', import.meta.url));   // the Bestiary page's notes
const npcNotesDir = fileURLToPath(new URL('./src/content/npc_notes', import.meta.url));   // the Forge's notes on each NPC
const biomesDir = fileURLToPath(new URL('./src/content/world/biomes', import.meta.url));
const biomeMapsDir = fileURLToPath(new URL('./src/content/world/biome_maps', import.meta.url));

// Dev-only: the map baker (tools/bake_map.mjs → src/game/mapbake.js) saves the world map's pre-rendered tiles here.
const mapDir = fileURLToPath(new URL('./public/map', import.meta.url));
function mapBakeApi() {
    return {
        name: 'map-bake-api',
        configureServer(server) {
            server.middlewares.use('/api/mapbake', (req, res) => {
                if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
                const file = new URL(req.url, 'http://x').searchParams.get('file') ?? '';
                if (!/^[a-z0-9_]+\/[A-Za-z0-9_./-]+\.(webp|json)$/.test(file) || file.includes('..')) { res.statusCode = 400; return res.end('bad file'); }
                const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
                    const body = Buffer.concat(chunks).toString(), out = join(mapDir, file);
                    mkdirSync(join(out, '..'), { recursive: true });
                    writeFileSync(out, file.endsWith('.json') ? body : Buffer.from(body.replace(/^data:[^,]+,/, ''), 'base64'));
                    res.end('ok');
                });
            });
        },
    };
}

// Dev-only: the Sculptor's Blender round trip saves points moved by hand here (src/content/models/v2/edits_<sex>.json).
// Writes are accepted when the request is addressed to this machine — localhost or one of its own network addresses (so
// the Lab can be used from another computer on the LAN, Blender there) — never via a foreign hostname (DNS rebinding).
const v2Dir = fileURLToPath(new URL('./src/content/models/v2', import.meta.url));
function v2EditsApi() {
    const own = () => new Set(['localhost', '127.0.0.1', '[::1]', ...Object.values(networkInterfaces()).flat().filter(Boolean).map(i => (i.family === 'IPv6' ? `[${i.address}]` : i.address))]);
    const hostOf = h => (h ?? '').replace(/:\d+$/, '');
    return {
        name: 'v2-edits-api',
        // (2026-11-27, the user: "make the Sculptor reload less often — live"): a layer written by the Sculptor reloads no
        // page — the Sculptor puts it into the running page itself (models/v2/base.js applyLayer)
        handleHotUpdate(ctx) { if (/[\\/]models[\\/]v2[\\/]layers[\\/].*\.json$/.test(ctx.file)) return []; },
        configureServer(server) {
            server.middlewares.use('/api/v2edits', (req, res) => {
                const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
                const ok = own();
                if (!ok.has(hostOf(req.headers.host))) return send(403, { error: 'only when reached as this machine' });
                if (req.method === 'GET') {
                    const sex = new URL(req.url, 'http://x').searchParams.get('sex');
                    if (!['male', 'female'].includes(sex)) return send(400, { error: 'sex' });
                    return send(200, JSON.parse(readFileSync(join(v2Dir, `edits_${sex}.json`), 'utf8')));
                }
                if (req.method !== 'POST') return send(405, { error: 'GET or POST' });
                const origin = req.headers.origin;
                if (origin && (!ok.has(hostOf(new URL(origin).host)) || new URL(origin).host !== req.headers.host)) return send(403, { error: 'cross-origin write refused' });
                if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) return send(415, { error: 'JSON only' });
                let raw = '';
                req.on('data', c => { raw += c; if (raw.length > 2_000_000) req.destroy(); });
                req.on('end', () => {
                    try {
                        const { sex, edits } = JSON.parse(raw);
                        if (!['male', 'female'].includes(sex) || !edits || typeof edits !== 'object' || Array.isArray(edits)) return send(400, { error: 'bad body' });
                        const keyRe = /^-?\d+\.\d{4},-?\d+\.\d{4},-?\d+\.\d{4}$/, out = {};
                        const entries = Object.entries(edits);
                        if (entries.length > 20000) return send(400, { error: 'too many points' });
                        for (const [k, v] of entries) {
                            if (!keyRe.test(k) || !Array.isArray(v) || v.length !== 3 || !v.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 10)) return send(400, { error: `bad point ${k}` });
                            out[k] = v;
                        }
                        writeFileSync(join(v2Dir, `edits_${sex}.json`), JSON.stringify(out, null, 0) + '\n');
                        send(200, { ok: true, points: entries.length });
                    } catch { send(400, { error: 'bad JSON' }); }
                });
            });
            // The shape layers (docs/3d/characters/LAYERS_PLAN.md): models/v2/layers/<layer>.json — { structural key: [dx, dy, dz] }
            // the layers: every file in layers/ (the characters' and each creature kind's — LAYERS_PLAN step 6), looked up live
            const LAYER_NAMES = { includes: l => typeof l === 'string' && /^[a-z0-9_]{2,24}$/.test(l) && existsSync(join(v2Dir, 'layers', `${l}.json`)), map: f => readdirSync(join(v2Dir, 'layers')).filter(n => n.endsWith('.json')).map(n => n.slice(0, -5)).map(f) },
                ALT_RE = /^[a-z0-9_-]{1,40}$/;
            const layerFile = (layer, alt) => alt ? join(v2Dir, 'layers', 'alt', layer, `${alt}.json`) : join(v2Dir, 'layers', `${layer}.json`);
            // Each save keeps the version it replaces (layers/history/<layer>[~alt]/<time>.json, the last 50; not in git), so the
            // Sculptor can take saves back one by one — /api/v2undo: GET ?layer=&alt= → { count }, POST { layer, alt } restores the last
            const histDir = (layer, alt) => join(v2Dir, 'layers', 'history', alt ? `${layer}~${alt}` : layer);
            const keepHistory = (layer, alt) => {
                const f = layerFile(layer, alt); if (!existsSync(f)) return;
                const d = histDir(layer, alt); mkdirSync(d, { recursive: true });
                writeFileSync(join(d, `${Date.now()}.json`), readFileSync(f, 'utf8'));
                const all = readdirSync(d).filter(n => n.endsWith('.json')).sort(); for (const n of all.slice(0, Math.max(0, all.length - 50))) unlinkSync(join(d, n));
            };
            const history = (layer, alt) => { const d = histDir(layer, alt); return existsSync(d) ? readdirSync(d).filter(n => n.endsWith('.json')).sort() : []; };
            server.middlewares.use('/api/v2undo', (req, res) => {
                const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
                const ok = own();
                if (!ok.has(hostOf(req.headers.host))) return send(403, { error: 'only when reached as this machine' });
                if (req.method === 'GET') {
                    const q = new URL(req.url, 'http://x').searchParams, layer = q.get('layer'), alt = q.get('alt') || null;
                    if (!LAYER_NAMES.includes(layer) || (alt && !ALT_RE.test(alt))) return send(400, { error: 'layer' });
                    return send(200, { count: history(layer, alt).length });
                }
                if (req.method !== 'POST') return send(405, { error: 'GET or POST' });
                const origin = req.headers.origin;
                if (origin && (!ok.has(hostOf(new URL(origin).host)) || new URL(origin).host !== req.headers.host)) return send(403, { error: 'cross-origin write refused' });
                if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) return send(415, { error: 'JSON only' });
                let raw = '';
                req.on('data', c => { raw += c; if (raw.length > 10_000) req.destroy(); });
                req.on('end', () => {
                    try {
                        const { layer, alt = null } = JSON.parse(raw);
                        if (!LAYER_NAMES.includes(layer) || (alt && !ALT_RE.test(alt))) return send(400, { error: 'bad body' });
                        const h = history(layer, alt); if (!h.length) return send(404, { error: 'nothing to undo' });
                        const last = join(histDir(layer, alt), h.at(-1));
                        writeFileSync(layerFile(layer, alt), readFileSync(last, 'utf8')); unlinkSync(last);
                        send(200, { ok: true, count: h.length - 1 });
                    } catch { send(400, { error: 'bad JSON' }); }
                });
            });
            server.middlewares.use('/api/v2layer', (req, res) => {
                const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
                const ok = own();
                if (!ok.has(hostOf(req.headers.host))) return send(403, { error: 'only when reached as this machine' });
                if (req.method === 'GET') {
                    const q = new URL(req.url, 'http://x').searchParams, layer = q.get('layer'), alt = q.get('alt');
                    if (!LAYER_NAMES.includes(layer) || (alt && !ALT_RE.test(alt))) return send(400, { error: 'layer' });
                    const f = layerFile(layer, alt); if (!existsSync(f)) return send(404, { error: 'no such alternate' });
                    return send(200, JSON.parse(readFileSync(f, 'utf8')));
                }
                if (req.method !== 'POST') return send(405, { error: 'GET or POST' });
                const origin = req.headers.origin;
                if (origin && (!ok.has(hostOf(new URL(origin).host)) || new URL(origin).host !== req.headers.host)) return send(403, { error: 'cross-origin write refused' });
                if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) return send(415, { error: 'JSON only' });
                let raw = '';
                req.on('data', c => { raw += c; if (raw.length > 2_000_000) req.destroy(); });
                req.on('end', () => {
                    try {
                        const { layer, points, alt } = JSON.parse(raw);
                        if (alt != null && !ALT_RE.test(alt)) return send(400, { error: 'bad alternate name' });
                        if (!LAYER_NAMES.includes(layer) || !points || typeof points !== 'object' || Array.isArray(points)) return send(400, { error: 'bad body' });
                        const keyRe = /^[a-z]+\.[A-Za-z0-9.?-]{1,40}$/, out = {}, entries = Object.entries(points);
                        if (entries.length > 20000) return send(400, { error: 'too many points' });
                        for (const [k, v] of entries) {
                            if (k === '@topo') {   // the added and removed points: [['add' | 'remove', key, key]…]
                                if (!Array.isArray(v) || v.length > 2000 || !v.every(op => Array.isArray(op) && (op.length === 3 || (op.length === 4 && Number.isSafeInteger(op[3]))) && ['add', 'remove', 'flip'].includes(op[0]) && keyRe.test(op[1]) && keyRe.test(op[2]))) return send(400, { error: 'bad @topo' });
                                out[k] = v; continue;
                            }
                            if (!keyRe.test(k) || !Array.isArray(v) || v.length !== 3 || !v.every(n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 5)) return send(400, { error: `bad point ${k}` });
                            out[k] = v;
                        }
                        if (alt) mkdirSync(join(v2Dir, 'layers', 'alt', layer), { recursive: true });
                        keepHistory(layer, alt);
                        writeFileSync(layerFile(layer, alt), JSON.stringify(out) + '\n');
                        send(200, { ok: true, points: entries.length });
                    } catch { send(400, { error: 'bad JSON' }); }
                });
            });
            // Alternates (the Sculptor): other versions of a layer to work on — layers/alt/<layer>/<name>.json, never built into
            // the game until made active. GET → { layer: [names] }; POST { action: 'activate' | 'delete', layer, alt }:
            // activate puts the alternate in the layer's place and keeps what was active as an alternate (was_active_<time>).
            server.middlewares.use('/api/v2alts', (req, res) => {
                const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
                const ok = own();
                if (!ok.has(hostOf(req.headers.host))) return send(403, { error: 'only when reached as this machine' });
                const list = () => Object.fromEntries(LAYER_NAMES.map(l => { const d = join(v2Dir, 'layers', 'alt', l); return [l, existsSync(d) ? readdirSync(d).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort() : []]; }));
                if (req.method === 'GET') return send(200, list());
                if (req.method !== 'POST') return send(405, { error: 'GET or POST' });
                const origin = req.headers.origin;
                if (origin && (!ok.has(hostOf(new URL(origin).host)) || new URL(origin).host !== req.headers.host)) return send(403, { error: 'cross-origin write refused' });
                if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) return send(415, { error: 'JSON only' });
                let raw = '';
                req.on('data', c => { raw += c; if (raw.length > 10_000) req.destroy(); });
                req.on('end', () => {
                    try {
                        const { action, layer, alt } = JSON.parse(raw);
                        if (!LAYER_NAMES.includes(layer) || !ALT_RE.test(alt ?? '')) return send(400, { error: 'bad body' });
                        const f = layerFile(layer, alt); if (!existsSync(f)) return send(404, { error: 'no such alternate' });
                        if (action === 'delete') { unlinkSync(f); return send(200, { ok: true, alts: list() }); }
                        if (action !== 'activate') return send(400, { error: 'action' });
                        const t = new Date(), pad = n => String(n).padStart(2, '0');
                        const keep = `was_active_${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}_${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
                        writeFileSync(layerFile(layer, keep), readFileSync(layerFile(layer), 'utf8'));
                        writeFileSync(layerFile(layer), readFileSync(f, 'utf8')); unlinkSync(f);
                        send(200, { ok: true, kept: keep, alts: list() });
                    } catch { send(400, { error: 'bad JSON' }); }
                });
            });
        },
    };
}

// Dev-only APIs: the Forge's cast (src/content/cast) and the editor's regions (src/content/regions).
// GET lists the JSON files, POST saves one as <id>.json.
function jsonDirApi(route, dir, label) {
    return {
        name: `json-api-${label}`,
        configureServer(server) {
            server.middlewares.use(route, (req, res) => {
                const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
                if (req.method === 'GET') {
                    const list = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
                    return send(200, list);
                }
                if (req.method === 'POST') {
                    // Only our own pages may write: a JSON body (cross-site forms can't send that without a
                    // CORS preflight, which this server doesn't answer) from this server's own origin.
                    const origin = req.headers.origin;
                    // Only when reached as this machine (blocks DNS-rebinding pages, whose Host is their own name).
                    // (this machine by any of its own names — localhost or its LAN addresses, so the Forge and the editor save from a
                    // phone on the LAN too, 2026-11-26 — never a foreign hostname: DNS rebinding)
                    const own = new Set(['localhost', '127.0.0.1', '[::1]', ...Object.values(networkInterfaces()).flat().filter(Boolean).map(i => (i.family === 'IPv6' ? `[${i.address}]` : i.address))]);
                    const local = h => own.has((h ?? '').replace(/:\d+$/, ''));
                    if (!local(req.headers.host)) return send(403, { error: 'writes only to this machine' });
                    if (origin && !local(new URL(origin).host)) return send(403, { error: 'cross-origin write refused' });
                    if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) return send(415, { error: 'JSON only' });
                    if (origin && new URL(origin).host !== req.headers.host) return send(403, { error: 'cross-origin write refused' });
                    let raw = '';
                    req.on('data', c => { raw += c; if (raw.length > 100_000) req.destroy(); });
                    req.on('end', () => {
                        try {
                            const def = JSON.parse(raw);
                            if (!/^[a-z0-9_]{1,40}$/.test(def.id ?? '')) return send(400, { error: 'id must be lowercase letters, digits or _' });
                            writeFileSync(join(dir, `${def.id}.json`), `${JSON.stringify(def, null, 2)}\n`);
                            send(200, { saved: `src/content/${label}/${def.id}.json` });
                        } catch (e) { send(400, { error: String(e.message) }); }
                    });
                    return;
                }
                send(405, { error: 'GET or POST' });
            });
        },
    };
}

export default defineConfig({
    base: './',   // relative paths, so the build also runs from a phone's file system (Capacitor)
    resolve: {
        // amo's engine-free rules, shared through packages/rules — no copies.
        alias: { '@rules': rules },
    },
    plugins: [v2EditsApi(), mapBakeApi(), jsonDirApi('/api/cast', castDir, 'cast'), jsonDirApi('/api/region', regionDir, 'regions'), jsonDirApi('/api/mobnotes', mobNotesDir, 'mob_notes'), jsonDirApi('/api/npcnotes', npcNotesDir, 'npc_notes'), jsonDirApi('/api/biomes', biomesDir, 'biomes'), jsonDirApi('/api/biomemaps', biomeMapsDir, 'biome_maps')],
    build: {
        // (the Sculptor, the Land Editor and its biomes page: dev server only — not in the phone or desktop builds)
        rollupOptions: { input: { main: 'index.html', forge: 'forge.html', bestiary: 'bestiary.html', manual: 'manual.html' } },
    },
    server: {
        port: 5190,
        strictPort: true,
        fs: { allow: ['../..'] },
        watch: { ignored: ['**/tools/.out/**', '**/android/**'] },   // screenshots and test browser profiles
    },
});
