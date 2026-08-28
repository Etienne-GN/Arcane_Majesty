#!/usr/bin/env node
/**
 * Unit tests for ascii_to_tiles.js's asciiToTiles().
 * Run: node tools/maps/test_ascii_to_tiles.mjs
 */
import { asciiToTiles, DEFAULT_LEGEND } from './ascii_to_tiles.js';

let passed = 0;
const fails = [];
function check(name, cond) {
    if (cond) passed++;
    else fails.push(name);
}
function throws(fn) {
    try { fn(); return false; } catch { return true; }
}

// ── basic conversion, default legend ────────────────────────────────────────
{
    const ascii = '#.#\n...\n#=#';
    const tiles = asciiToTiles(ascii);
    check(
        'basic conversion with default legend',
        JSON.stringify(tiles) === JSON.stringify([[1, 0, 1], [0, 0, 0], [1, 2, 1]])
    );
}

// ── trailing/blank lines are dropped ────────────────────────────────────────
{
    const ascii = '##\n..\n\n';
    const tiles = asciiToTiles(ascii);
    check('trailing blank lines dropped', tiles.length === 2);
}

// ── ragged rows throw ────────────────────────────────────────────────────────
check('ragged row throws', throws(() => asciiToTiles('###\n##')));

// ── unrecognized character throws ───────────────────────────────────────────
check('unrecognized character throws', throws(() => asciiToTiles('#.?\n...')));

// ── custom legend ────────────────────────────────────────────────────────────
{
    const tiles = asciiToTiles('AB\nBA', { A: 5, B: 9 });
    check('custom legend used', JSON.stringify(tiles) === JSON.stringify([[5, 9], [9, 5]]));
}

// ── DEFAULT_LEGEND matches existing tile-value meanings ─────────────────────
check(
    'DEFAULT_LEGEND matches floor=0/wall=1/path=2',
    DEFAULT_LEGEND['.'] === 0 && DEFAULT_LEGEND['#'] === 1 && DEFAULT_LEGEND['='] === 2
);

if (fails.length) {
    console.error(`✗ ascii_to_tiles tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ ascii_to_tiles tests passed (${passed} assertions).`);
