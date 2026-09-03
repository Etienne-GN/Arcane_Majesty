import assert from 'node:assert';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    seedDefaultCollection, seedSheetIfNew,
    loadCollections, addCollection,
    loadSpriteMeta, assignCollection, setLicenseStatus,
    loadFlags, addFlag, updateFlagStatus,
} from '../server/dataStore.js';

// --- seedDefaultCollection: pure function, no I/O ---
assert.strictEqual(seedDefaultCollection('fake_a.png', 'SampleMap'), 'pipoya');
assert.strictEqual(seedDefaultCollection('PATD_Props.png', 'PATD_Props'), 'patd');
assert.strictEqual(seedDefaultCollection('fake_a.png', 'pipoya_autotiles_type1'), 'pipoya');
assert.strictEqual(seedDefaultCollection('addwork.png', 'addwork'), 'uncollected');

// --- collections ---
const dataDir = mkdtempSync(join(tmpdir(), 'sprite-ledger-data-'));

const initial = await loadCollections(dataDir);
assert.deepStrictEqual(initial, [], 'loadCollections on an empty dataDir returns []');

await addCollection(dataDir, { id: 'pipoya', name: 'Pipoya' });
await addCollection(dataDir, { id: 'buildings', name: 'Buildings' });
const afterAdd = await loadCollections(dataDir);
assert.strictEqual(afterAdd.length, 2);
assert.strictEqual(afterAdd[0].id, 'pipoya');

let threw = false;
try { await addCollection(dataDir, { id: 'pipoya', name: 'Pipoya Again' }); }
catch (e) { threw = true; }
assert.ok(threw, 'addCollection must reject a duplicate id');

// --- sprite_meta ---
await assignCollection(dataDir, 'PATD_Props.png', 'chest_wood_small', 'buildings');
const meta = await loadSpriteMeta(dataDir);
assert.strictEqual(meta['PATD_Props.png::chest_wood_small'].collection, 'buildings');

// reassigning overwrites, not duplicates
await assignCollection(dataDir, 'PATD_Props.png', 'chest_wood_small', 'pipoya');
const meta2 = await loadSpriteMeta(dataDir);
assert.strictEqual(meta2['PATD_Props.png::chest_wood_small'].collection, 'pipoya');
assert.strictEqual(Object.keys(meta2).length, 1);

// assignCollection must merge, not replace — a prior license mark on the
// same entry must survive a later plain collection reassignment
await setLicenseStatus(dataDir, 'PATD_Props.png', 'chest_wood_small', 'ok');
await assignCollection(dataDir, 'PATD_Props.png', 'chest_wood_small', 'buildings');
const meta2b = await loadSpriteMeta(dataDir);
assert.strictEqual(meta2b['PATD_Props.png::chest_wood_small'].collection, 'buildings');
assert.strictEqual(meta2b['PATD_Props.png::chest_wood_small'].license, 'ok', 'assignCollection must not wipe an existing license mark');
await assignCollection(dataDir, 'PATD_Props.png', 'chest_wood_small', 'pipoya'); // restore, so later assertions below see the state they expect

// assignCollection must reject a collection id that doesn't exist
let threwUnknownCollection = false;
try { await assignCollection(dataDir, 'PATD_Props.png', 'chest_wood_small', 'not_a_real_collection'); }
catch (e) { threwUnknownCollection = true; }
assert.ok(threwUnknownCollection, 'assignCollection must reject an unknown collection id');

// --- license status ---
await setLicenseStatus(dataDir, 'PATD_Props.png', 'chest_wood_small', 'unlicensed');
const metaFlagged = await loadSpriteMeta(dataDir);
assert.strictEqual(metaFlagged['PATD_Props.png::chest_wood_small'].license, 'unlicensed');
assert.strictEqual(metaFlagged['PATD_Props.png::chest_wood_small'].collection, 'pipoya', 'setLicenseStatus must not disturb the existing collection assignment');

// overwrite to the other status
await setLicenseStatus(dataDir, 'PATD_Props.png', 'chest_wood_small', 'ok');
const metaOk = await loadSpriteMeta(dataDir);
assert.strictEqual(metaOk['PATD_Props.png::chest_wood_small'].license, 'ok');

// null clears the mark back to unset
await setLicenseStatus(dataDir, 'PATD_Props.png', 'chest_wood_small', null);
const metaCleared = await loadSpriteMeta(dataDir);
assert.ok(!('license' in metaCleared['PATD_Props.png::chest_wood_small']), 'null must clear the license field entirely');

let threwBadStatus = false;
try { await setLicenseStatus(dataDir, 'PATD_Props.png', 'chest_wood_small', 'maybe'); }
catch (e) { threwBadStatus = true; }
assert.ok(threwBadStatus, 'setLicenseStatus must reject a status other than ok/unlicensed/null');

// --- seedSheetIfNew ---
const seedDataDir = mkdtempSync(join(tmpdir(), 'sprite-ledger-seed-'));
await addCollection(seedDataDir, { id: 'patd', name: 'Pixel Art Top Down' });
await addCollection(seedDataDir, { id: 'uncollected', name: 'Uncollected' });

await seedSheetIfNew(seedDataDir, 'PATD_Props.png', 'PATD_Props', ['chest_wood_small', 'barrel_wood']);
const seededMeta = await loadSpriteMeta(seedDataDir);
assert.strictEqual(seededMeta['PATD_Props.png::chest_wood_small'].collection, 'patd');
assert.strictEqual(seededMeta['PATD_Props.png::barrel_wood'].collection, 'patd');

// a sheet already seeded (or user-reassigned) must not be re-seeded
await assignCollection(seedDataDir, 'PATD_Props.png', 'chest_wood_small', 'uncollected');
await seedSheetIfNew(seedDataDir, 'PATD_Props.png', 'PATD_Props', ['chest_wood_small', 'barrel_wood']);
const afterReseedAttempt = await loadSpriteMeta(seedDataDir);
assert.strictEqual(afterReseedAttempt['PATD_Props.png::chest_wood_small'].collection, 'uncollected', 'seedSheetIfNew must not overwrite an existing assignment');

// --- flags ---
const flag = await addFlag(dataDir, { sheet: 'PATD_Props.png', name: 'stone_disc_dial', reason: 'misaligned', comment: '' });
assert.ok(flag.id);
assert.strictEqual(flag.status, 'open');
assert.strictEqual(flag.resolvedAt, null);

const openFlags = await loadFlags(dataDir, 'open');
assert.strictEqual(openFlags.length, 1);

await updateFlagStatus(dataDir, flag.id, 'resolved');
const resolvedFlags = await loadFlags(dataDir, 'resolved');
assert.strictEqual(resolvedFlags.length, 1);
assert.ok(resolvedFlags[0].resolvedAt);

let threwMissing = false;
try { await updateFlagStatus(dataDir, 'not-a-real-id', 'resolved'); }
catch (e) { threwMissing = true; }
assert.ok(threwMissing, 'updateFlagStatus must reject an unknown id');

// --- schema sanity on the real seeded collections.json this task also creates ---
const realCollections = JSON.parse(readFileSync(
    new URL('../data/collections.json', import.meta.url), 'utf8'
));
const expectedIds = [
    'pipoya', 'patd', 'lpc', 'nyx_snowy', 'manaseed', 'roleworld_wizard', 'patd_bushes_dustdfg',
    'schwarnhild', 'generic_rpg_vacaroxa', 'hana_caraka', 'widelands_trees', 'top_down_adventure_olobster', 'woolly_lands', 'pixel_crawler',
    'buildings', 'interior', 'cave', 'nature', 'uncollected',
];
assert.deepStrictEqual(realCollections.map(c => c.id).sort(), expectedIds.sort());

console.log('✓ data-store tests passed (30 assertions).');
