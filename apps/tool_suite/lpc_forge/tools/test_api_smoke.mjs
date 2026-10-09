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
srv.close();
if (fails.length) { console.error(`✗ api: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ api: ${passed} passed`);
