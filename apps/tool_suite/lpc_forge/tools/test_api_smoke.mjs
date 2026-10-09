#!/usr/bin/env node
/** Smoke test: API server serves the LPC library read-only. Run: node tools/test_api_smoke.mjs */
import { createServer } from '../server.js';

const app = createServer();
const srv = app.listen(0);
const base = `http://localhost:${srv.address().port}`;
let passed = 0; const fails = [];
async function expectStatus(name, path, want) {
    const r = await fetch(base + path);
    if (r.status === want) passed++; else fails.push(`${name}: ${path} → ${r.status}, want ${want}`);
    return r;
}
const ok = await expectStatus('body walk', '/lpc/body/bodies/male/walk.png', 200);
if (ok.headers.get('content-type') !== 'image/png') fails.push('content-type not image/png');
await expectStatus('missing', '/lpc/body/bodies/male/nope.png', 404);
await expectStatus('traversal', '/lpc/..%2F..%2Fserver.js', 404);
await expectStatus('traversal dotdot', '/lpc/../server.js', 404);
await expectStatus('saves', '/api/saves/character', 200);

// v2 scratch save round trip (cleans up after itself)
const NAME = '__smoke_test__';
const comp = { name: NAME, sel: { body: { id: 'bodies/male' }, hair: { id: 'afro/adult', tint: 3 } } };
const post = await fetch(base + '/api/saves/v2', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: NAME, data: comp, preview: 'data:image/png;base64,AA==' }) });
if (post.status === 200) passed++; else fails.push(`v2 save → ${post.status}`);
const list = await (await fetch(base + '/api/saves/v2')).json();
if (JSON.stringify(list[NAME]?.data) === JSON.stringify(comp)) passed++; else fails.push('v2 save did not round-trip');
await fetch(base + `/api/saves/v2/${NAME}`, { method: 'DELETE' });
const after = await (await fetch(base + '/api/saves/v2')).json();
if (!(NAME in after)) passed++; else fails.push('v2 delete left the save behind');
srv.close();
if (fails.length) { console.error(`✗ api: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ api: ${passed} passed`);
