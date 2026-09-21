import assert from 'node:assert';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
    seedDefaultCollection, seedSheetIfNew, seedSheetsIfNew, DIR_COLLECTIONS, LPC_SHEET_COLLECTIONS,
    loadCollections, addCollection,
    loadSpriteMeta, assignCollection, setLicenseStatus,
    loadFlags, addFlag, updateFlagStatus,
} from '../server/dataStore.js';

// --- seedDefaultCollection: pure function, no I/O ---
assert.strictEqual(seedDefaultCollection('fake_a.png', 'SampleMap'), 'pipoya');
assert.strictEqual(seedDefaultCollection('PATD_Props.png', 'PATD_Props'), 'patd');
assert.strictEqual(seedDefaultCollection('fake_a.png', 'pipoya_autotiles_type1'), 'pipoya');
// An unknown pack directory still queues as 'uncollected' — that reads as
// "nobody has said where this belongs yet", which is true of a new pack.
assert.strictEqual(seedDefaultCollection('whatever.png', 'a_pack_nobody_has_mapped'), 'uncollected');

// Directories that used to fall through to 'uncollected' because they matched
// none of the old prefix rules. Their entries were assigned by hand, which
// held while a sheet was one entry and broke the moment sheets were
// re-catalogued into their real cells (LPC: 6 entries -> 4148, all orphaned).
assert.strictEqual(
    seedDefaultCollection('seasonal sample (winter).png', 'manaseed_seasonal_forest_sample_winter'),
    'manaseed');
assert.strictEqual(seedDefaultCollection('Size_05.png', 'pixel_crawler_anokolisa'), 'pixel_crawler');

// The 'lpc' directory's 4 big atlases each get their own sub-collection —
// they're 72% of the whole ledger between them, and lumping them together
// made every other pack's browsing slow for no reason. Anything else still
// catalogued under 'lpc' (items1, effects, treetop, trunk...) stays bucketed
// under plain 'lpc'.
assert.strictEqual(seedDefaultCollection('base_out_atlas.png', 'lpc'), 'lpc_base_out');
assert.strictEqual(seedDefaultCollection('build_atlas.png', 'lpc'), 'lpc_build');
assert.strictEqual(seedDefaultCollection('terrain_atlas.png', 'lpc'), 'lpc_terrain');
assert.strictEqual(seedDefaultCollection('obj_misk_atlas.png', 'lpc'), 'lpc_obj_misk');
assert.strictEqual(seedDefaultCollection('items1.png', 'lpc'), 'lpc');
assert.strictEqual(seedDefaultCollection('effects.png', 'lpc'), 'lpc');

// Every collection the table (plus the LPC per-sheet overrides) can produce
// must actually exist in the shipped collections.json, or seeding writes an
// id the sidebar can't render.
{
    const shipped = JSON.parse(
        readFileSync(new URL('../data/collections.json', import.meta.url), 'utf8'));
    const known = new Set(shipped.map(c => c.id));
    for (const id of new Set(Object.values(DIR_COLLECTIONS))) {
        assert.ok(known.has(id), `DIR_COLLECTIONS maps to unknown collection id: ${id}`);
    }
    for (const id of new Set(Object.values(LPC_SHEET_COLLECTIONS))) {
        assert.ok(known.has(id), `LPC_SHEET_COLLECTIONS maps to unknown collection id: ${id}`);
    }
    assert.ok(known.has('uncollected'), 'collections.json must keep an "uncollected" bucket');
}

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

// --- collection hierarchy (parentId) ---
// A collection with no parentId defaults to a root, same as every
// collection created before this feature existed.
assert.strictEqual(afterAdd[0].parentId, null, 'addCollection without parentId defaults to null (a root)');

await addCollection(dataDir, { id: 'grass_patches', name: 'Grass Patches', parentId: 'pipoya' });
const withChild = await loadCollections(dataDir);
const child = withChild.find(c => c.id === 'grass_patches');
assert.strictEqual(child.parentId, 'pipoya', 'addCollection stores the given parentId');

let threwUnknownParent = false;
try { await addCollection(dataDir, { id: 'orphan', name: 'Orphan', parentId: 'does_not_exist' }); }
catch (e) { threwUnknownParent = true; }
assert.ok(threwUnknownParent, 'addCollection must reject an unknown parentId');

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

// --- seedSheetsIfNew (batched) ---
// This is what the server actually calls on every /api/sheets and
// /api/meta request — seedSheetIfNew in a per-sheet loop used to mean one
// full sprite_meta.json read (and up to one full rewrite) per sheet,
// which at ~950 real sheets was the entire ~6s cost of those endpoints.
await seedSheetsIfNew(seedDataDir, [
    { sheetPngFilename: 'SampleMap.png', sheetDirName: 'SampleMap', entryNames: ['tree_a', 'tree_b'] },
    // Mixed into the same batch: a sheet with nothing new to seed at all
    // (chest_wood_small already reassigned, barrel_wood already seeded
    // above) — must not disturb chest_wood_small's manual reassignment.
    { sheetPngFilename: 'PATD_Props.png', sheetDirName: 'PATD_Props', entryNames: ['chest_wood_small', 'barrel_wood'] },
]);
const afterBatchSeed = await loadSpriteMeta(seedDataDir);
assert.strictEqual(afterBatchSeed['SampleMap.png::tree_a'].collection, 'pipoya');
assert.strictEqual(afterBatchSeed['SampleMap.png::tree_b'].collection, 'pipoya');
assert.strictEqual(afterBatchSeed['PATD_Props.png::chest_wood_small'].collection, 'uncollected', 'seedSheetsIfNew must not overwrite an existing assignment');

// A batch where nothing needs seeding must not touch the file at all —
// makes the "no seeding needed" case a true no-op, not an empty rewrite.
const beforeNoopMtime = statSync(join(seedDataDir, 'sprite_meta.json')).mtimeMs;
await seedSheetsIfNew(seedDataDir, [
    { sheetPngFilename: 'SampleMap.png', sheetDirName: 'SampleMap', entryNames: ['tree_a', 'tree_b'] },
]);
assert.strictEqual(statSync(join(seedDataDir, 'sprite_meta.json')).mtimeMs, beforeNoopMtime, 'seedSheetsIfNew must not rewrite the file when nothing is new');

// --- flags ---
const flag = await addFlag(dataDir, { sheet: 'PATD_Props.png', name: 'stone_disc_dial', reason: 'misaligned', comment: '' });
assert.ok(flag.id);
assert.strictEqual(flag.status, 'open');
assert.strictEqual(flag.resolvedAt, null);

const openFlags = await loadFlags(dataDir, 'open');
assert.strictEqual(openFlags.length, 1);

// needs_review is a checkpoint, not a resolution — resolvedAt stays null
await updateFlagStatus(dataDir, flag.id, 'needs_review');
const needsReviewFlags = await loadFlags(dataDir, 'needs_review');
assert.strictEqual(needsReviewFlags.length, 1);
assert.strictEqual(needsReviewFlags[0].resolvedAt, null);

// sent back for rework — status returns to open, still no resolvedAt
await updateFlagStatus(dataDir, flag.id, 'open');
const backToOpen = await loadFlags(dataDir, 'open');
assert.strictEqual(backToOpen.length, 1);
assert.strictEqual(backToOpen[0].resolvedAt, null);

await updateFlagStatus(dataDir, flag.id, 'resolved');
const resolvedFlags = await loadFlags(dataDir, 'resolved');
assert.strictEqual(resolvedFlags.length, 1);
assert.ok(resolvedFlags[0].resolvedAt);

let threwBadFlagStatus = false;
try { await updateFlagStatus(dataDir, flag.id, 'not_a_real_status'); }
catch (e) { threwBadFlagStatus = true; }
assert.ok(threwBadFlagStatus, 'updateFlagStatus must reject a status outside open/needs_review/resolved');

let threwMissing = false;
try { await updateFlagStatus(dataDir, 'not-a-real-id', 'resolved'); }
catch (e) { threwMissing = true; }
assert.ok(threwMissing, 'updateFlagStatus must reject an unknown id');

// --- schema sanity on the real seeded collections.json this task also creates ---
const realCollections = JSON.parse(readFileSync(
    new URL('../data/collections.json', import.meta.url), 'utf8'
));
const expectedIds = [
    'pipoya', 'patd', 'lpc', 'lpc_base_out', 'lpc_build', 'lpc_terrain', 'lpc_obj_misk',
    'nyx_snowy', 'manaseed', 'roleworld_wizard', 'patd_bushes_dustdfg',
    'schwarnhild', 'generic_rpg_vacaroxa', 'hana_caraka', 'widelands_trees', 'top_down_adventure_olobster', 'woolly_lands', 'pixel_crawler',
    'buildings', 'interior', 'cave', 'nature', 'uncollected',
    'generated',
];
assert.deepStrictEqual(realCollections.map(c => c.id).sort(), expectedIds.sort());

console.log('✓ data-store tests passed (53 assertions).');
