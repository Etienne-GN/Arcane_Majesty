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
import { ELEMENT_COLORS, SLOT_KEYS, TRAY, SECONDARY, SLOT_PAD } from '../src/controls/launcherDefs.js';
import { RESONANCE_ELEMENTS } from '../src/data/spells.js';
import { KEY_CODES } from '../src/controls/keys.js';

let passed = 0;
const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function failIf(cond, msg) { if (cond) fails.push(msg); else passed++; }

// Element palette — one per resonance element, numeric colors for Graphics.fillStyle/strokeStyle.
check('ELEMENT_COLORS covers every resonance element', RESONANCE_ELEMENTS.filter(e => !(e in ELEMENT_COLORS)), []);
for (const [el, col] of Object.entries(ELEMENT_COLORS)) {
    check(`ELEMENT_COLORS ${el} numeric`, typeof col, 'number');
}

// Skill-slot hotkey labels rendered on the ring — Q/R/F/T, distinct.
check('SLOT_KEYS', SLOT_KEYS, ['Q', 'R', 'F', 'T']);
check('SLOT_KEYS distinct', new Set(SLOT_KEYS).size, SLOT_KEYS.length);

// Menu tray — 7 entries; every name must resolve in KEY_CODES so tapKey drives
// GameScene's real keydown handlers (the whole point of the tray).
check('TRAY 8 entries', TRAY.length, 8);
check('pad buttons for Q/R/F/T (shared by play and STYLES, review I4)', SLOT_PAD?.map(b => b.name), ['B', 'X', 'Y', 'RB']);
check('… and their indices', SLOT_PAD?.map(b => b.index), [1, 2, 3, 5]);
check('TRAY opens STYLES', TRAY.some(t => t.name === 'styles' && t.label === 'STYLE'), true);
check('Y opens STYLES', KEY_CODES.styles?.code, 'KeyY');
for (const { name, label } of TRAY) {
    failIf(!KEY_CODES[name], `TRAY "${label}" (${name}) missing from KEY_CODES`);
    check(`TRAY ${label} keyCode numeric`, typeof KEY_CODES[name]?.keyCode, 'number');
}

// Secondary buttons — 3 direct-dispatch actions targeting GameScene._try* methods.
check('SECONDARY 5 entries', SECONDARY.length, 5);
check('SECONDARY has HOP', SECONDARY.some(s => s.action === '_tryHop'), true);
check('SECONDARY has RUN toggle', SECONDARY.some(s => s.action === '_tryToggleSprint'), true);
check('SECONDARY angles distinct', new Set(SECONDARY.map(s => s.angle)).size, 5);
check('blink is on H', KEY_CODES.blink.code, 'KeyH');
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