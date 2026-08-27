#!/usr/bin/env node
/**
 * Unit tests for the sprite catalogue validator (validate_sprite_catalogue.mjs).
 * Pure assertions against in-memory catalogue objects + two real fixture PNGs.
 * Run: node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs
 *   (or: npm run test:sprite-catalogue)
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import {
    validateCatalogueObject,
    relocatedPath,
    relocateToCatalogued,
} from './validate_sprite_catalogue.mjs';

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'test_fixtures');

let passed = 0;
const fails = [];
function check(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}
function hasError(result, substring) {
    return result.errors.some(e => e.includes(substring));
}

// ── valid object-kind catalogue ─────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png',
        sheetWidth: 64, sheetHeight: 32,
        entries: [
            { name: 'thing_a', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: ['a'] },
            { name: 'thing_b', kind: 'object', x: 32, y: 0, w: 32, h: 32, tags: ['b'] },
        ],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('valid object catalogue → no errors', result.errors.length === 0);
    check('valid object catalogue → no warnings', result.warnings.length === 0);
}

// ── valid tile-kind catalogue ────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_tile_sheet.png',
        sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 2, gridRows: 2,
        entries: [
            { name: 'tile_br', kind: 'tile', row: 1, col: 1, frameIndex: 3, tags: ['x'] },
        ],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('valid tile catalogue → no errors', result.errors.length === 0);
}

// ── missing source ───────────────────────────────────────────────────────────
{
    const cat = { sheetWidth: 64, sheetHeight: 32, entries: [] };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('missing source → error', hasError(result, 'missing "source"'));
}

// ── sheet dims mismatch ──────────────────────────────────────────────────────
{
    const cat = { source: 'mini_object_sheet.png', sheetWidth: 999, sheetHeight: 999, entries: [] };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('dims mismatch → error', hasError(result, "doesn't match real PNG dims"));
}

// ── duplicate names ──────────────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [
            { name: 'dup', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: [] },
            { name: 'dup', kind: 'object', x: 32, y: 0, w: 32, h: 32, tags: [] },
        ],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('duplicate name → error', hasError(result, 'duplicate name: "dup"'));
}

// ── invalid kind ─────────────────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'weird', kind: 'sprite', x: 0, y: 0, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('invalid kind → error', hasError(result, 'invalid kind "sprite"'));
}

// ── tile entries without grid fields ────────────────────────────────────────
{
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        entries: [{ name: 'no_grid', kind: 'tile', row: 0, col: 0, frameIndex: 0, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('tile entry, missing grid fields → error', hasError(result, 'missing "gridCols"'));
}

// ── tile row/col out of range ───────────────────────────────────────────────
{
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 2, gridRows: 2,
        entries: [{ name: 'oob', kind: 'tile', row: 5, col: 0, frameIndex: 10, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('tile row out of range → error', hasError(result, 'row 5 out of range'));
}

// ── frameIndex mismatch ──────────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 2, gridRows: 2,
        entries: [{ name: 'bad_index', kind: 'tile', row: 1, col: 1, frameIndex: 0, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('frameIndex mismatch → error', hasError(result, 'frameIndex 0 !== row*gridCols+col (3)'));
}

// ── object bbox exceeds sheet bounds ────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'overflow', kind: 'object', x: 40, y: 0, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('bbox overflow → error', hasError(result, 'out of sheet bounds'));
}

// ── object bbox negative origin ─────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'negative', kind: 'object', x: -5, y: 0, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('negative origin → error', hasError(result, 'out of sheet bounds'));
}

// ── zero-size bbox ───────────────────────────────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'flat', kind: 'object', x: 0, y: 0, w: 0, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('zero width → error', hasError(result, 'w/h must be > 0'));
}

// ── lowConfidence is a warning, not an error ─────────────────────────────────
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'unsure', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: [], lowConfidence: true }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('lowConfidence → zero errors', result.errors.length === 0);
    check('lowConfidence → one warning', result.warnings.length === 1);
}

// ── relocatedPath: pure path computation ────────────────────────────────────
{
    const p = relocatedPath('apps/amo/public/assets/tilesets/foo.png');
    check('relocatedPath inserts catalogued/', p === 'apps/amo/public/assets/catalogued/tilesets/foo.png');
}
{
    const p = relocatedPath('apps/amo/public/assets/catalogued/tilesets/foo.png');
    check('relocatedPath is idempotent', p === 'apps/amo/public/assets/catalogued/tilesets/foo.png');
}
{
    let threw = false;
    try { relocatedPath('some/other/path/foo.png'); }
    catch { threw = true; }
    check('relocatedPath throws without an assets/ marker', threw);
}

// ── relocateToCatalogued: real filesystem move ──────────────────────────────
{
    const tmp = mkdtempSync(join(tmpdir(), 'sprite-catalogue-test-'));
    const rawDir = join(tmp, 'public', 'assets', 'tilesets');
    mkdirSync(rawDir, { recursive: true });
    const rawPng = join(rawDir, 'foo.png');
    const rawCat = join(rawDir, 'foo.catalogue.json');
    writeFileSync(rawPng, 'fake-png-bytes');
    writeFileSync(rawCat, '{}');

    const moved = relocateToCatalogued([rawPng, rawCat]);

    const destDir = join(tmp, 'public', 'assets', 'catalogued', 'tilesets');
    check('relocate moves the PNG', existsSync(join(destDir, 'foo.png')) && !existsSync(rawPng));
    check('relocate moves the catalogue.json', existsSync(join(destDir, 'foo.catalogue.json')) && !existsSync(rawCat));
    check('relocate reports both moves', moved.length === 2);

    rmSync(tmp, { recursive: true, force: true });
}

if (fails.length) {
    console.error(`✗ sprite-catalogue validator tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ sprite-catalogue validator tests passed (${passed} assertions).`);
