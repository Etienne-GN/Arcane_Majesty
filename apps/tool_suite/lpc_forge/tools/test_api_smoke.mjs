#!/usr/bin/env node
/**
 * Smoke test: the API server serves the LPC library read-only, keeps scratch
 * saves, and writes cast files safely. Uses a temp database and cast folder.
 * Run: node tools/test_api_smoke.mjs
 */
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, startServer } from '../server.js';

const tmp = mkdtempSync(join(tmpdir(), 'forge-api-'));
const castDir = join(tmp, 'cast');
const app = createServer({ dbPath: join(tmp, 'saves.db'), castDir });
const srv = app.listen(0);
const base = `http://localhost:${srv.address().port}`;
let passed = 0; const fails = [];
async function expectStatus(name, path, want) {
    const r = await fetch(base + path);
    if (r.status === want) passed++; else fails.push(`${name}: ${path} → ${r.status}, want ${want}`);
    return r;
}
const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

// ── library ──
const ok = await expectStatus('body walk', '/lpc/body/bodies/male/walk.png', 200);
if (ok.headers.get('content-type') !== 'image/png') fails.push('content-type not image/png');
await expectStatus('missing', '/lpc/body/bodies/male/nope.png', 404);
await expectStatus('traversal %2F', '/lpc/..%2F..%2Fserver.js', 404);
await expectStatus('traversal %2e', '/lpc/%2e%2e/%2e%2e/server.js', 404);

// ── scratch saves (temp db) ──
await expectStatus('saves', '/api/saves/character', 200);
const NAME = '__smoke_test__';
const comp = { name: NAME, sel: { body: { id: 'bodies/male' }, hair: { id: 'afro/adult', tint: 3 } } };
const post = await fetch(base + '/api/saves/v2', json('POST', { name: NAME, data: comp, preview: 'data:image/png;base64,AA==' }));
if (post.status === 200) passed++; else fails.push(`v2 save → ${post.status}`);
const list = await (await fetch(base + '/api/saves/v2')).json();
if (JSON.stringify(list[NAME]?.data) === JSON.stringify(comp)) passed++; else fails.push('v2 save did not round-trip');
await fetch(base + `/api/saves/v2/${NAME}`, { method: 'DELETE' });
const after = await (await fetch(base + '/api/saves/v2')).json();
if (!(NAME in after)) passed++; else fails.push('v2 delete left the save behind');

// ── cast files ──
const cast = { id: 'eldrin', name: 'Eldrin', role: 'story', sel: {}, layers: [], variants: {}, published: false };
const put = await fetch(base + '/api/cast/eldrin', json('PUT', cast));
if (put.status === 200) passed++; else fails.push(`cast put → ${put.status}`);
const listed = await (await fetch(base + '/api/cast')).json();
if (listed.length === 1 && listed[0].id === 'eldrin') passed++; else fails.push('cast list');
const idx = () => readFileSync(join(castDir, 'index.js'), 'utf8');
if (idx().includes("import c_eldrin from './eldrin.json' with { type: 'json' };") && idx().includes('eldrin: c_eldrin')) passed++;
else fails.push(`index.js: ${idx()}`);
await fetch(base + '/api/cast/0gd', json('PUT', { ...cast, id: '0gd' }));
if (idx().includes("import c_0gd from './0gd.json' with { type: 'json' };")) passed++; else fails.push('digit-leading id breaks index');
for (const bad of ['..%2Fx', 'A', 'a%2Fb', 'x'.repeat(60)]) {
    const r = await fetch(base + `/api/cast/${bad}`, json('PUT', { ...cast, id: decodeURIComponent(bad) }));
    if (r.status === 400) passed++; else fails.push(`bad id ${bad} → ${r.status}`);
}
const mismatch = await fetch(base + '/api/cast/kael', json('PUT', cast));
if (mismatch.status === 400) passed++; else fails.push('id mismatch accepted');
await Promise.all([1, 2, 3, 4, 5].map(n => fetch(base + '/api/cast/eldrin', json('PUT', { ...cast, name: 'E' + n }))));
try { JSON.parse(readFileSync(join(castDir, 'eldrin.json'), 'utf8')); passed++; } catch { fails.push('half-written cast file'); }
if (!readdirSync(castDir).some(f => f.endsWith('.tmp'))) passed++; else fails.push('temp file left');
const del = await fetch(base + '/api/cast/eldrin', { method: 'DELETE' });
if (del.status === 200 && !idx().includes('eldrin')) passed++; else fails.push('delete');
const del404 = await fetch(base + '/api/cast/eldrin', { method: 'DELETE' });
if (del404.status === 404) passed++; else fails.push(`delete missing → ${del404.status}`);
const delBad = await fetch(base + '/api/cast/..%2Fx', { method: 'DELETE' });
if (delBad.status === 400) passed++; else fails.push(`delete bad id → ${delBad.status}`);

srv.close();

// ── the real entry point binds to localhost only (the API writes game files) ──
const real = await startServer({ dbPath: join(tmp, 'saves2.db'), castDir }, 0);
if (real.address().address === '127.0.0.1') passed++; else fails.push(`server bound to ${real.address().address}`);
real.close();

if (fails.length) { console.error(`✗ api: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ api: ${passed} passed`);
