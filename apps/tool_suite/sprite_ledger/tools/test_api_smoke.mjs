import assert from 'node:assert';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from '../server.js';

// Fake catalogue dir (read-only side) — same shape as Task 2's fixture.
const catalogueDir = mkdtempSync(join(tmpdir(), 'sprite-ledger-cat-'));
mkdirSync(join(catalogueDir, 'PATD_Props'), { recursive: true });
writeFileSync(join(catalogueDir, 'PATD_Props', 'PATD_Props.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
writeFileSync(join(catalogueDir, 'PATD_Props', 'PATD_Props.catalogue.json'), JSON.stringify({
    source: 'PATD_Props.png', sheetWidth: 64, sheetHeight: 64,
    entries: [{ kind: 'object', name: 'chest_wood_small', x: 0, y: 0, w: 32, h: 32, tags: [] }],
}));

// Fake, disposable data dir (write side) — never the real committed data/.
// Includes 'patd' since this fixture's sheet dir is 'PATD_Props', which
// seedDefaultCollection maps to 'patd' — seeding must have somewhere valid
// to assign into, same as the real data/collections.json always does.
const dataDir = mkdtempSync(join(tmpdir(), 'sprite-ledger-testdata-'));
writeFileSync(join(dataDir, 'collections.json'), JSON.stringify([
    { id: 'patd', name: 'Pixel Art Top Down' },
    { id: 'buildings', name: 'Buildings' },
    { id: 'uncollected', name: 'Uncollected' },
]));

const app = createServer(catalogueDir, dataDir);
const server = app.listen(0); // OS-assigned free port
const port = server.address().port;
const base = `http://localhost:${port}`;

// GET /api/sheets
const sheetsRes = await fetch(`${base}/api/sheets`);
assert.strictEqual(sheetsRes.status, 200);
const sheets = await sheetsRes.json();
assert.strictEqual(sheets.length, 1);
assert.strictEqual(sheets[0].sheetPngFilename, 'PATD_Props.png');

// GET /api/sheets must trigger seeding as a side effect: chest_wood_small
// had no prior sprite_meta.json record, so it should now be seeded to
// 'patd' (PATD_Props's directory-based default) — confirms server.js
// actually wires seedSheetIfNew in, not just that dataStore.js has it.
const metaAfterFirstScan = await (await fetch(`${base}/api/meta`)).json();
assert.strictEqual(metaAfterFirstScan.spriteMeta['PATD_Props.png::chest_wood_small'].collection, 'patd');

// GET /api/image/:sheetPngFilename
const imgRes = await fetch(`${base}/api/image/PATD_Props.png`);
assert.strictEqual(imgRes.status, 200);

// GET /api/collections
const colRes = await fetch(`${base}/api/collections`);
assert.strictEqual(colRes.status, 200);
assert.strictEqual((await colRes.json()).length, 3);

// POST /api/collections
const addColRes = await fetch(`${base}/api/collections`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'cave', name: 'Cave' }),
});
assert.strictEqual(addColRes.status, 200);
const colsAfter = await (await fetch(`${base}/api/collections`)).json();
assert.strictEqual(colsAfter.length, 4);

// GET /api/meta — chest_wood_small was already seeded to 'patd' by the
// earlier GET /api/sheets call (seeding, not an empty-state check, since
// that behavior was already confirmed above).
const metaRes = await fetch(`${base}/api/meta`);
assert.strictEqual(metaRes.status, 200);
const metaBody = await metaRes.json();
assert.strictEqual(metaBody.spriteMeta['PATD_Props.png::chest_wood_small'].collection, 'patd');
assert.strictEqual(metaBody.collections.length, 4);

// POST /api/meta
const assignRes = await fetch(`${base}/api/meta`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: 'PATD_Props.png', name: 'chest_wood_small', collection: 'buildings' }),
});
assert.strictEqual(assignRes.status, 200);
const metaAfter = await (await fetch(`${base}/api/meta`)).json();
assert.strictEqual(metaAfter.spriteMeta['PATD_Props.png::chest_wood_small'].collection, 'buildings');

// POST /api/license
const licenseRes = await fetch(`${base}/api/license`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: 'PATD_Props.png', name: 'chest_wood_small', status: 'unlicensed' }),
});
assert.strictEqual(licenseRes.status, 200);
const metaAfterLicense = await (await fetch(`${base}/api/meta`)).json();
assert.strictEqual(metaAfterLicense.spriteMeta['PATD_Props.png::chest_wood_small'].license, 'unlicensed');

// POST /api/flags
const flagRes = await fetch(`${base}/api/flags`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sheet: 'PATD_Props.png', name: 'chest_wood_small', reason: 'misaligned', comment: 'test' }),
});
assert.strictEqual(flagRes.status, 200);
const flag = await flagRes.json();
assert.ok(flag.id);

// GET /api/flags?status=open
const openFlagsRes = await fetch(`${base}/api/flags?status=open`);
assert.strictEqual((await openFlagsRes.json()).length, 1);

// PATCH /api/flags/:id — needs_review (Claude's tentative-fix checkpoint,
// distinct from a human's final resolved)
const needsReviewRes = await fetch(`${base}/api/flags/${flag.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'needs_review' }),
});
assert.strictEqual(needsReviewRes.status, 200);
const needsReviewList = await (await fetch(`${base}/api/flags?status=needs_review`)).json();
assert.strictEqual(needsReviewList.length, 1);
assert.strictEqual(needsReviewList[0].resolvedAt, null);

// PATCH /api/flags/:id — a human approving it
const patchRes = await fetch(`${base}/api/flags/${flag.id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'resolved' }),
});
assert.strictEqual(patchRes.status, 200);
const openAfterResolve = await (await fetch(`${base}/api/flags?status=open`)).json();
assert.strictEqual(openAfterResolve.length, 0);

server.close();
console.log('✓ API smoke tests passed (24 assertions).');
