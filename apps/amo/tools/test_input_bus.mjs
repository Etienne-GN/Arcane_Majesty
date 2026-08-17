#!/usr/bin/env node
/**
 * Unit tests for the keyboard-emulation primitive (keys.js + InputBus.js).
 * Pure assertions, no deps. Run: node tools/test_input_bus.mjs (or npm test).
 * Node has no global KeyboardEvent — stub it for the dispatch tests.
 */
import { KEY_CODES } from '../src/controls/keys.js';
import { buildKeyEvent, dispatchKey, tapKey } from '../src/controls/InputBus.js';

let passed = 0;
const fails = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(name, got, want) {
    if (eq(got, want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

class FakeKeyboardEvent {
    constructor(type, init) {
        this.type = type;
        this.keyCode = init.keyCode;
        this.code = init.code;
        this.key = init.key;
        this.bubbles = init.bubbles;
        this.cancelable = init.cancelable;
        this.defaultPrevented = init.defaultPrevented ?? false;
    }
}
globalThis.KeyboardEvent = FakeKeyboardEvent;

// Every KEY_CODES entry is well-formed (23 actions).
check('KEY_CODES has 23 entries', Object.keys(KEY_CODES).length, 23);
for (const [name, def] of Object.entries(KEY_CODES)) {
    check(`key ${name}.keyCode numeric`, typeof def.keyCode, 'number');
    check(`key ${name}.code string`, typeof def.code, 'string');
    check(`key ${name}.key string`, typeof def.key, 'string');
}

// buildKeyEvent produces a correct, cancelleable, bubbling keydown.
{
    const ev = buildKeyEvent(KEY_CODES.inventory, 'keydown');
    check('keydown type', ev.type, 'keydown');
    check('keydown keyCode I', ev.keyCode, 73);
    check('keydown code KeyI', ev.code, 'KeyI');
    check('keydown bubbles', ev.bubbles, true);
    check('keydown cancelable', ev.cancelable, true);
}

// dispatchKey routes one event to the given target.
{
    const win = { events: [], dispatchEvent(ev) { this.events.push(ev); } };
    dispatchKey(win, KEY_CODES.inventory, 'keydown');
    check('dispatch delivered 1', win.events.length, 1);
    check('dispatch keyCode', win.events[0].keyCode, 73);
}

// tapKey emits keydown then keyup, in that order.
{
    const win = { events: [], dispatchEvent(ev) { this.events.push(ev); } };
    tapKey(win, KEY_CODES.inventory);
    check('tap emits 2', win.events.length, 2);
    check('tap order', `${win.events[0].type},${win.events[1].type}`, 'keydown,keyup');
}

// Every tray/pause key the deck will tap dispatches cleanly.
{
    const win = { events: [], dispatchEvent(ev) { this.events.push(ev); } };
    for (const name of ['inventory', 'skillTree', 'spellbook', 'worldMap',
                        'questJournal', 'codex', 'crafting', 'esc']) {
        tapKey(win, KEY_CODES[name]);
    }
    check('tray+esc taps = 16 events', win.events.length, 16);
}

if (fails.length) {
    console.error(`✗ input-bus tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ input-bus tests passed (${passed})`);