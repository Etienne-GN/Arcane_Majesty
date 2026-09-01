import assert from 'node:assert';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanCatalogueDir } from '../server/catalogueScanner.js';

// Build a tiny fake catalogued-tilesets directory: two sheets, one of
// them ('SampleMap') holding two catalogue.json files sharing one folder
// (matching the real repo's actual layout, where SampleMap holds 8).
const base = mkdtempSync(join(tmpdir(), 'sprite-ledger-test-'));

mkdirSync(join(base, 'SampleMap'), { recursive: true });
writeFileSync(join(base, 'SampleMap', 'fake_a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47])); // not a real PNG, scanner doesn't need to decode it
writeFileSync(join(base, 'SampleMap', 'fake_a.catalogue.json'), JSON.stringify({
    source: 'fake_a.png', sheetWidth: 32, sheetHeight: 32,
    entries: [{ kind: 'object', name: 'thing_one', x: 0, y: 0, w: 32, h: 32, tags: [] }],
}));
writeFileSync(join(base, 'SampleMap', 'fake_b.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
writeFileSync(join(base, 'SampleMap', 'fake_b.catalogue.json'), JSON.stringify({
    source: 'fake_b.png', sheetWidth: 16, sheetHeight: 16,
    entries: [{ kind: 'object', name: 'thing_two', x: 0, y: 0, w: 16, h: 16, tags: [] }],
}));

mkdirSync(join(base, 'PATD_Props'), { recursive: true });
writeFileSync(join(base, 'PATD_Props', 'PATD_Props.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
writeFileSync(join(base, 'PATD_Props', 'PATD_Props.catalogue.json'), JSON.stringify({
    source: 'PATD_Props.png', sheetWidth: 64, sheetHeight: 64,
    entries: [{ kind: 'object', name: 'chest_wood_small', x: 0, y: 0, w: 32, h: 32, tags: [] }],
}));

const sheets = await scanCatalogueDir(base);

assert.strictEqual(sheets.length, 3, `expected 3 sheets, got ${sheets.length}`);

const names = sheets.map(s => s.sheetPngFilename).sort();
assert.deepStrictEqual(names, ['PATD_Props.png', 'fake_a.png', 'fake_b.png']);

const propsSheet = sheets.find(s => s.sheetPngFilename === 'PATD_Props.png');
assert.strictEqual(propsSheet.catalogue.entries[0].name, 'chest_wood_small');
assert.ok(propsSheet.pngPath.endsWith('PATD_Props/PATD_Props.png'));
assert.ok(propsSheet.catalogueJsonPath.endsWith('PATD_Props.catalogue.json'));
assert.strictEqual(propsSheet.sheetDirName, 'PATD_Props');

const sampleMapSheets = sheets.filter(s => s.sheetDirName === 'SampleMap');
assert.strictEqual(sampleMapSheets.length, 2, 'both fake_a and fake_b share the SampleMap dir');

console.log('✓ catalogue-scanner tests passed (6 assertions).');
