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
import { encodePng } from '../customStore.js';
import { existsSync } from 'node:fs';

const tmp = mkdtempSync(join(tmpdir(), 'forge-api-'));
const castDir = join(tmp, 'cast');
const rulesPath = join(tmp, 'motion_rules.json');
const flagsPath = join(tmp, 'gap_flags.json');
const customDir = join(tmp, 'lpc_custom');
const customManifest = join(tmp, 'lpc_custom.json');
const app = createServer({ dbPath: join(tmp, 'saves.db'), castDir, rulesPath, flagsPath, customDir, customManifest });
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

// ── flags (temp file): created and updated one at a time on the server ──
const f0 = await (await fetch(base + '/api/gap-flags')).json();
if (Array.isArray(f0) && f0.length === 0) passed++; else fails.push('flags start');
const flag = { target: 'frame', key: 'cape|solid/female|', motion: 'run', dir: 'left', frame: 3, reason: 'misaligned', comment: 'cape slips' };
const created = await fetch(base + '/api/gap-flags', json('POST', flag));
const cf = await created.json();
if (created.status === 200 && cf.id && cf.status === 'open' && cf.createdAt) passed++; else fails.push(`flag create → ${created.status}`);
await Promise.all([1, 2, 3].map(n => fetch(base + '/api/gap-flags', json('POST', { target: 'item', key: 'hat|x|', reason: 'other', comment: 'c' + n }))));
if ((await (await fetch(base + '/api/gap-flags')).json()).length === 4) passed++; else fails.push('concurrent creates lost flags');
const upd = await fetch(base + `/api/gap-flags/${cf.id}`, json('PATCH', { status: 'needs_review', note: 'nudged 1px', who: 'Claude' }));
const uf = await upd.json();
if (upd.status === 200 && uf.status === 'needs_review' && uf.comment.endsWith('[Claude] nudged 1px')) passed++; else fails.push(`flag update → ${upd.status}`);
const on = JSON.parse(readFileSync(flagsPath, 'utf8')).find(x => x.id === cf.id);
if (on?.status === 'needs_review') passed++; else fails.push('flag update not on disk');
for (const [what, body] of [['bad target', { ...flag, target: 'galaxy' }], ['bad motion', { ...flag, motion: 'fly' }], ['no dir', { ...flag, dir: undefined }]]) {
    const r = await fetch(base + '/api/gap-flags', json('POST', body));
    if (r.status === 400) passed++; else fails.push(`bad flag (${what}) → ${r.status}`);
}
if ((await fetch(base + '/api/gap-flags/nope', json('PATCH', { status: 'resolved' }))).status === 404) passed++; else fails.push('patch unknown flag');
if ((await fetch(base + `/api/gap-flags/${cf.id}`, json('PATCH', { status: 'done' }))).status === 400) passed++; else fails.push('patch bad status');
if ((await fetch(base + '/api/gap-flags', json('PUT', []))).status === 404) passed++; else fails.push('whole-list PUT must be gone');

// ── custom overlay (motion workshop) ──
const png = (w, h) => encodePng(w, h, new Uint8ClampedArray(w * h * 4).fill(255)).toString('base64');
const RUN = 'weapon/sword/arming/universal/run/bg.png';
const putCustom = body => fetch(base + "/api/custom", json("PUT", body));
const derived = ['body/bodies/male/spellcast.png'];   // listed in the game's CREDITS.csv
let rc = await putCustom({ path: RUN, png: png(512, 256), author: 'Tester', derivedFrom: derived });
const e1 = await rc.json();
if (rc.status === 200) passed++; else fails.push(`custom PUT → ${rc.status} ${JSON.stringify(e1)}`);
if (e1.licenses?.includes('CC-BY-SA 3.0') && e1.authors?.includes('Tester') && !e1.licenses.includes('unknown')) passed++;
else fails.push(`licences not inherited: ${JSON.stringify(e1)}`);
const man = await (await fetch(base + '/api/custom')).json();
if (man[RUN]?.author === 'Tester') passed++; else fails.push('manifest lacks the sheet');
const served = await fetch(base + '/lpc_custom/' + RUN);
if (served.status === 200 && served.headers.get('content-type') === 'image/png') passed++; else fails.push(`custom static → ${served.status}`);
await new Promise(res => setTimeout(res, 15));
const e2 = await (await putCustom({ path: RUN, png: png(512, 256), author: 'Tester', derivedFrom: derived })).json();
if (e2.createdAt === e1.createdAt && e2.updatedAt !== e1.updatedAt) passed++; else fails.push('overwrite must keep createdAt');
const own = await (await putCustom({ path: 'cape/solid/female/run/red.png', png: png(512, 256), author: 'Tester', license: 'CC-BY-SA 3.0' })).json();
if (JSON.stringify(own.licenses) === '["CC-BY-SA 3.0"]') passed++; else fails.push(`own licence: ${JSON.stringify(own.licenses)}`);
// CREDITS.csv uses upstream's item/fg/walk.png layout for our item/walk/fg.png
const sw = await (await putCustom({ path: 'weapon/sword/arming/universal/run/fg.png', png: png(512, 256), author: 'Tester', derivedFrom: ['weapon/sword/arming/universal/walk/fg.png'] })).json();
if (JSON.stringify(sw.licenses) === '["OGA-BY 3.0"]' && sw.authors.some(a => a.includes('ElizaWy'))) passed++; else fails.push(`layout-swapped credits: ${JSON.stringify(sw)}`);
const anon = await (await putCustom({ path: 'cape/solid/female/sit/red.png', png: png(192, 256) })).json();
if (anon.licenses?.includes('unknown')) passed++; else fails.push('no source and no licence must read unknown');
for (const [what, body] of [
    ['traversal', { path: '../../x.png', png: png(512, 256) }],
    ['dot segment', { path: 'weapon/../../x.png', png: png(512, 256) }],
    ['not png ext', { path: 'weapon/a/run/a.png.exe', png: png(512, 256) }],
    ['unknown type', { path: 'evil/a/run/a.png', png: png(512, 256) }],
    ['not a png', { path: RUN, png: Buffer.from('hello').toString('base64') }],
    ['wrong run size', { path: RUN, png: png(576, 256) }],
    ['hurt with 4 rows', { path: 'weapon/a/hurt/a.png', png: png(384, 256) }],
    ['bad derivedFrom', { path: RUN, png: png(512, 256), derivedFrom: ['../x.png'] }],
]) {
    const res = await putCustom(body);
    if (res.status === 400) passed++; else fails.push(`custom PUT ${what} → ${res.status}`);
}
if (!existsSync(join(tmp, 'x.png')) && !existsSync(join(customDir, 'weapon/a'))) passed++; else fails.push('a refused PUT wrote a file');
if ((await putCustom({ path: 'weapon/a/slash/a.png', png: png(1152, 768) })).status === 200) passed++; else fails.push('oversize slash refused');
const cr = await (await fetch(base + '/api/credits?path=body/bodies/male/spellcast.png')).json();
if (cr?.licenses?.length) passed++; else fails.push('credits lookup');
const crc = await (await fetch(base + '/api/credits?path=' + RUN)).json();
if (crc?.custom) passed++; else fails.push('credits of a custom sheet');
if ((await fetch(base + '/api/custom?path=' + RUN, { method: 'DELETE' })).status === 200 && !existsSync(join(customDir, RUN))) passed++;
else fails.push('custom DELETE');
if (!(await (await fetch(base + '/api/custom')).json())[RUN]) passed++; else fails.push('DELETE left the manifest entry');
if ((await fetch(base + '/api/custom?path=' + RUN, { method: 'DELETE' })).status === 404) passed++; else fails.push('DELETE twice must 404');

srv.close();

// ── the real entry point binds to localhost only (the API writes game files) ──
const real = await startServer({ dbPath: join(tmp, 'saves2.db'), castDir }, 0);
if (real.address().address === '127.0.0.1') passed++; else fails.push(`server bound to ${real.address().address}`);
real.close();

if (fails.length) { console.error(`✗ api: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ api: ${passed} passed`);
