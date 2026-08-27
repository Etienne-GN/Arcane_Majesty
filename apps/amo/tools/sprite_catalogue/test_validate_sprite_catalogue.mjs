#!/usr/bin/env node
/**
 * Unit tests for the sprite catalogue validator (validate_sprite_catalogue.mjs).
 * Pure assertions against in-memory catalogue objects + two real fixture PNGs.
 * Run: node tools/sprite_catalogue/test_validate_sprite_catalogue.mjs
 *   (or: npm run test:sprite-catalogue)
 */
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, copyFileSync } from 'fs';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';
import {
    validateCatalogueObject,
    validateCatalogueFile,
    relocatedPath,
    relocateToCatalogued,
} from './validate_sprite_catalogue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, 'test_fixtures');
const CLI_SCRIPT = join(HERE, 'validate_sprite_catalogue.mjs');

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

// ── (finding #2) gridCols/gridRows checked against real sheet dimensions ───
{
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 7, gridRows: 2, // 7*32=224 != 64
        entries: [],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check(
        'gridCols*gridTileWidth mismatch vs sheetWidth → error',
        hasError(result, 'gridCols*gridTileWidth (224) !== sheetWidth (64)')
    );
}
{
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 2, gridRows: 9, // 9*32=288 != 64
        entries: [],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check(
        'gridRows*gridTileHeight mismatch vs sheetHeight → error',
        hasError(result, 'gridRows*gridTileHeight (288) !== sheetHeight (64)')
    );
}

// ── (finding #3) non-numeric / missing coordinates no longer silently pass ─
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'missing_xy', kind: 'object', x: undefined, y: undefined, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('missing x/y → integer error', hasError(result, '"x" must be an integer') && hasError(result, '"y" must be an integer'));
}
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'string_coords', kind: 'object', x: '0', y: 0, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('string coordinate → integer error', hasError(result, '"x" must be an integer (got "0")'));
}
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'fractional_coord', kind: 'object', x: 0.5, y: 0, w: 32, h: 32, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('fractional coordinate → integer error', hasError(result, '"x" must be an integer (got 0.5)'));
}
{
    // Tile-side integer guard: non-integer row must also be caught, and must
    // not fall through to a confusing NaN-based out-of-range/frameIndex error.
    const cat = {
        source: 'mini_tile_sheet.png', sheetWidth: 64, sheetHeight: 64,
        gridTileWidth: 32, gridTileHeight: 32, gridCols: 2, gridRows: 2,
        entries: [{ name: 'bad_row', kind: 'tile', row: '1', col: 1, frameIndex: 3, tags: [] }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('non-integer tile row → integer error', hasError(result, '"row" must be an integer (got "1")'));
}

// ── (finding #7) frames[] is presence-checked with a warning, not validated ─
{
    const cat = {
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{
            name: 'animated', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: [],
            frames: [{ x: -999, y: -999, w: -1, h: -1 }],
        }],
    };
    const result = validateCatalogueObject(cat, FIXTURES);
    check('entry with frames[] → no error', result.errors.length === 0);
    check(
        'entry with frames[] → warning',
        result.warnings.some(w => w.includes('has "frames" — not validated by this gate'))
    );
}

// ── (finding #4/#5) CLI multi-file run: one bad file must not kill the run ──
{
    const tmp = mkdtempSync(join(tmpdir(), 'sprite-catalogue-cli-test-'));
    const assetsDir = join(tmp, 'public', 'assets', 'cli_test');
    mkdirSync(assetsDir, { recursive: true });

    const badCatPath = join(assetsDir, 'bad.catalogue.json');
    writeFileSync(badCatPath, '{ this is not valid json');

    const goodPngPath = join(assetsDir, 'good.png');
    copyFileSync(join(FIXTURES, 'mini_object_sheet.png'), goodPngPath);
    const goodCatPath = join(assetsDir, 'good.catalogue.json');
    writeFileSync(goodCatPath, JSON.stringify({
        source: 'good.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'thing', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: [] }],
    }));

    let result;
    try {
        execFileSync(process.execPath, [CLI_SCRIPT, badCatPath, goodCatPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        result = { status: 0 };
    } catch (err) {
        result = { status: err.status, stdout: err.stdout, stderr: err.stderr };
    }

    check('malformed JSON reported as a clean error, not a raw crash', result.stderr.includes(`✗ ${badCatPath}:`));
    check('CLI still exits (doesn\'t hang/crash the process)', result.status === 1);

    const catalDir = join(tmp, 'public', 'assets', 'catalogued', 'cli_test');
    check('good file B still validated/relocated despite bad file A', existsSync(join(catalDir, 'good.png')) && existsSync(join(catalDir, 'good.catalogue.json')));
    check('bad file A left in place (never relocated)', existsSync(badCatPath));

    rmSync(tmp, { recursive: true, force: true });
}

// ── (finding #5) relocatedPath() throw surfaces as a clean CLI error ───────
{
    const tmp = mkdtempSync(join(tmpdir(), 'sprite-catalogue-outside-test-'));
    // Deliberately NOT under public/assets/ — a valid, zero-error catalogue
    // living somewhere the relocation step can't compute a destination for.
    const pngPath = join(tmp, 'sheet.png');
    copyFileSync(join(FIXTURES, 'mini_object_sheet.png'), pngPath);
    const catPath = join(tmp, 'sheet.catalogue.json');
    writeFileSync(catPath, JSON.stringify({
        source: 'sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [{ name: 'thing', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: [] }],
    }));

    let result;
    try {
        execFileSync(process.execPath, [CLI_SCRIPT, catPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        result = { status: 0 };
    } catch (err) {
        result = { status: err.status, stdout: err.stdout, stderr: err.stderr };
    }

    check('catalogue outside public/assets/ fails cleanly, not with a raw stack trace', result.status === 1);
    check(
        'error message names the missing "public/assets/" marker',
        result.stderr.includes('path does not contain "public/assets/"')
    );
    check('no uncaught-exception stack trace leaked to stderr', !result.stderr.includes('at file://'));

    rmSync(tmp, { recursive: true, force: true });
}

// ── (finding #8) end-to-end: validate + relocate composition via the CLI ──
{
    const tmp = mkdtempSync(join(tmpdir(), 'sprite-catalogue-e2e-test-'));
    const assetsDir = join(tmp, 'public', 'assets', 'tilesets', 'lpc');
    mkdirSync(assetsDir, { recursive: true });

    const pngPath = join(assetsDir, 'e2e_sheet.png');
    copyFileSync(join(FIXTURES, 'mini_object_sheet.png'), pngPath);
    const catPath = join(assetsDir, 'e2e_sheet.catalogue.json');
    writeFileSync(catPath, JSON.stringify({
        source: 'e2e_sheet.png', sheetWidth: 64, sheetHeight: 32,
        entries: [
            { name: 'thing_a', kind: 'object', x: 0, y: 0, w: 32, h: 32, tags: [] },
            { name: 'thing_b', kind: 'object', x: 32, y: 0, w: 32, h: 32, tags: [] },
        ],
    }));

    let status;
    try {
        execFileSync(process.execPath, [CLI_SCRIPT, catPath], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        status = 0;
    } catch (err) {
        status = err.status;
        console.error('e2e CLI run failed unexpectedly:', err.stderr);
    }

    const destDir = join(tmp, 'public', 'assets', 'catalogued', 'tilesets', 'lpc');
    check('e2e: CLI exits 0 on a clean catalogue', status === 0);
    check('e2e: PNG relocated to catalogued/', existsSync(join(destDir, 'e2e_sheet.png')));
    check('e2e: catalogue.json relocated to catalogued/', existsSync(join(destDir, 'e2e_sheet.catalogue.json')));
    check('e2e: PNG no longer at original path', !existsSync(pngPath));
    check('e2e: catalogue.json no longer at original path', !existsSync(catPath));

    rmSync(tmp, { recursive: true, force: true });
}

// ── validateCatalogueFile returns { cat, errors, warnings } ────────────────
{
    const tmp = mkdtempSync(join(tmpdir(), 'sprite-catalogue-file-test-'));
    const catPath = join(tmp, 'sheet.catalogue.json');
    writeFileSync(catPath, JSON.stringify({
        source: 'mini_object_sheet.png', sheetWidth: 64, sheetHeight: 32, entries: [],
    }));
    copyFileSync(join(FIXTURES, 'mini_object_sheet.png'), join(tmp, 'mini_object_sheet.png'));

    const { cat, errors, warnings } = validateCatalogueFile(catPath);
    check('validateCatalogueFile returns parsed cat object', cat && cat.source === 'mini_object_sheet.png');
    check('validateCatalogueFile returns errors array', Array.isArray(errors) && errors.length === 0);
    check('validateCatalogueFile returns warnings array', Array.isArray(warnings));

    rmSync(tmp, { recursive: true, force: true });
}

if (fails.length) {
    console.error(`✗ sprite-catalogue validator tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ sprite-catalogue validator tests passed (${passed} assertions).`);
