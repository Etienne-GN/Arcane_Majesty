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
const rulesPath = join(tmp, 'motion_rules.json');
const flagsPath = join(tmp, 'gap_flags.json');
const app = createServer({ dbPath: join(tmp, 'saves.db'), castDir, rulesPath, flagsPath });
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
for (const [what, body] of [['layers junk', { ...cast, layers: 'junk' }], ['variants 5', { ...cast, variants: 5 }], ['published str', { ...cast, published: 'yes' }]]) {
    const r = await fetch(base + '/api/cast/eldrin', json('PUT', body));
    if (r.status === 400) passed++; else fails.push(`bad shape (${what}) → ${r.status}`);
}
if (JSON.parse(readFileSync(join(castDir, 'eldrin.json'), 'utf8')).layers.length === 0) passed++; else fails.push('bad shape overwrote the file');
const big = await fetch(base + '/api/cast/eldrin', json('PUT', { ...cast, name: 'x'.repeat(3_000_000) }));
if (big.status === 413) passed++; else fails.push(`oversized cast body → ${big.status}`);
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

// ── motion rules (temp file) ──
const r0 = await (await fetch(base + '/api/motion-rules')).json();
if (JSON.stringify(r0) === '{}') passed++; else fails.push(`rules start ${JSON.stringify(r0)}`);
const goodRules = { 'cape|solid/female|': { sit: { rule: 'hide' }, jump: { rule: 'borrow', from: 'walk' } } };
const rp = await fetch(base + '/api/motion-rules', json('PUT', goodRules));
if (rp.status === 200 && JSON.stringify(JSON.parse(readFileSync(rulesPath, 'utf8'))) === JSON.stringify(goodRules)) passed++;
else fails.push(`rules put → ${rp.status}`);
const badRules = await fetch(base + '/api/motion-rules', json('PUT', { 'cape|solid/female|': { sit: { rule: 'explode' } } }));
if (badRules.status === 400 && (await badRules.json()).error.includes('explode')) passed++; else fails.push(`bad rules → ${badRules.status}`);
if (JSON.stringify(JSON.parse(readFileSync(rulesPath, 'utf8'))) === JSON.stringify(goodRules)) passed++; else fails.push('bad rules overwrote the file');

// per-cell rule edits happen on the server: concurrent edits of different cells both survive
await Promise.all([
    fetch(base + '/api/motion-rules/cell', json('PATCH', { key: 'cape|solid/female|', motion: 'run', rule: { rule: 'hide' } })),
    fetch(base + '/api/motion-rules/cell', json('PATCH', { key: 'weapon|sword/longsword|', motion: 'sit', rule: { rule: 'hide' } })),
]);
const afterCells = JSON.parse(readFileSync(rulesPath, 'utf8'));
if (afterCells['cape|solid/female|']?.run && afterCells['cape|solid/female|']?.sit && afterCells['weapon|sword/longsword|']?.sit) passed++;
else fails.push(`cell edits lost rules: ${JSON.stringify(afterCells)}`);
const cleared = await (await fetch(base + '/api/motion-rules/cell', json('PATCH', { key: 'weapon|sword/longsword|', motion: 'sit', rule: null }))).json();
if (!cleared['weapon|sword/longsword|'] && cleared['cape|solid/female|']) passed++; else fails.push('clearing a cell (response = full rules)');
const badCell = await fetch(base + '/api/motion-rules/cell', json('PATCH', { key: 'cape|solid/female|', motion: 'run', rule: { rule: 'explode' } }));
if (badCell.status === 400) passed++; else fails.push(`bad cell → ${badCell.status}`);
const badKey = await fetch(base + '/api/motion-rules/cell', json('PATCH', { key: 'nope', motion: 'run', rule: { rule: 'hide' } }));
if (badKey.status === 400) passed++; else fails.push(`bad cell key → ${badKey.status}`);

// ── gap flags (temp file) ──
const f0 = await (await fetch(base + '/api/gap-flags')).json();
if (Array.isArray(f0) && f0.length === 0) passed++; else fails.push('flags start');
const flag = { id: 'f1', key: 'cape|solid/female|', motion: 'run', reason: 'needs_art', status: 'open', comment: 'cape vanishes in run', createdAt: '2026-10-09T12:00:00Z' };
const fp = await fetch(base + '/api/gap-flags', json('PUT', [flag]));
if (fp.status === 200 && JSON.parse(readFileSync(flagsPath, 'utf8'))[0].id === 'f1') passed++; else fails.push(`flags put → ${fp.status}`);
for (const [what, body] of [['not a list', { a: 1 }], ['bad status', [{ ...flag, status: 'done' }]], ['bad motion', [{ ...flag, motion: 'fly' }]], ['no key', [{ ...flag, key: 5 }]]]) {
    const r = await fetch(base + '/api/gap-flags', json('PUT', body));
    if (r.status === 400) passed++; else fails.push(`bad flags (${what}) → ${r.status}`);
}

srv.close();

// ── the real entry point binds to localhost only (the API writes game files) ──
const real = await startServer({ dbPath: join(tmp, 'saves2.db'), castDir }, 0);
if (real.address().address === '127.0.0.1') passed++; else fails.push(`server bound to ${real.address().address}`);
real.close();

if (fails.length) { console.error(`✗ api: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ api: ${passed} passed`);
