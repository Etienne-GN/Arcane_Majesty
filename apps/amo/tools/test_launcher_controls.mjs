#!/usr/bin/env node
/**
 * Contract smoke-check for LauncherControls. The deck class itself imports Phaser,
 * which executes browser code (window/document) at load time and cannot be imported
 * in node — so this test imports the deck's pure config (launcherDefs.js) instead,
 * per the documented Task 5 fallback. It verifies the constants UIScene/GameScene
 * rely on, including that every menu-tray action maps to a real KEY_CODES entry
 * (the keyboard-emulation path) and every secondary button names a real GameScene
 * _try* action.
 * Run: node tools/test_launcher_controls.mjs
 */
import { ELEMENT_COLORS, SLOT_KEYS, TRAY, SECONDARY } from '../src/controls/launcherDefs.js';
import { KEY_CODES } from '../src/controls/keys.js';

let passed = 0;
const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function failIf(cond, msg) { if (cond) fails.push(msg); else passed++; }

// Element palette — 8 elements, numeric colors for Graphics.fillStyle/strokeStyle.
check('ELEMENT_COLORS 8 entries', Object.keys(ELEMENT_COLORS).length, 8);
for (const [el, col] of Object.entries(ELEMENT_COLORS)) {
    check(`ELEMENT_COLORS ${el} numeric`, typeof col, 'number');
}

// Skill-slot hotkey labels rendered on the ring — Q/R/F/T, distinct.
check('SLOT_KEYS', SLOT_KEYS, ['Q', 'R', 'F', 'T']);
check('SLOT_KEYS distinct', new Set(SLOT_KEYS).size, SLOT_KEYS.length);

// Menu tray — 7 entries; every name must resolve in KEY_CODES so tapKey drives
// GameScene's real keydown handlers (the whole point of the tray).
check('TRAY 7 entries', TRAY.length, 7);
for (const { name, label } of TRAY) {
    failIf(!KEY_CODES[name], `TRAY "${label}" (${name}) missing from KEY_CODES`);
    check(`TRAY ${label} keyCode numeric`, typeof KEY_CODES[name]?.keyCode, 'number');
}

// Secondary buttons — 3 direct-dispatch actions targeting GameScene._try* methods.
check('SECONDARY 3 entries', SECONDARY.length, 3);
for (const { label, action, angle, color } of SECONDARY) {
    check(`SECONDARY ${label} action`, typeof action, 'string');
    check(`SECONDARY ${label} _try prefix`, action.slice(0, 4), '_try');
    check(`SECONDARY ${label} angle`, typeof angle, 'number');
    check(`SECONDARY ${label} color`, typeof color, 'number');
}

if (fails.length) {
    console.error(`✗ launcher-controls tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ launcher-controls tests passed (${passed})`);