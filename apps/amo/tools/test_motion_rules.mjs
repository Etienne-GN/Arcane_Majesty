#!/usr/bin/env node
/** Unit tests for motionRules.js (shared by the game renderer and LPC Forge v2). Run: node tools/test_motion_rules.mjs */
import { ruleKey, ruleFor, resolveMotion, frameMap, ruleErrors } from '../src/systems/motionRules.js';
import { MOTION_FRAMES } from '../src/systems/lpcLayout.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const cape = { slot: 'cape', type: 'cape', id: 'solid/female', color: 'red', anims: ['walk', 'hurt', 'slash', 'thrust', 'shoot', 'spellcast'] };
const swordBg = { slot: 'weapon', type: 'weapon', id: 'sword/arming/universal', itemName: 'bg', anims: ['walk', 'idle', 'hurt', 'combat_idle'] };
const swordFg = { ...swordBg, itemName: 'fg' };
const legacy = { type: 'body', id: 'bodies/male' };   // no slot, no manifest

check('rule key', ruleKey(cape), 'cape|solid/female|');
check('rule key itemName', ruleKey(swordFg), 'weapon|sword/arming/universal|fg');
check('rule key without slot uses type', ruleKey(legacy), 'body|bodies/male|');

check('MOTION_FRAMES complete', Object.keys(MOTION_FRAMES).length, 15);
check('jump frames', MOTION_FRAMES.jump, 5);

// own art always wins
check('own motion', resolveMotion(cape, 'slash', {}).mode, 'own');
check('own concrete', resolveMotion(cape, 'slash', {}).concrete, 'slash');
// default for a missing motion = the game's walk fallback
const fb = resolveMotion(cape, 'run', {});
check('fallback', [fb.mode, fb.concrete, fb.frames], ['fallback', 'walk', null]);
// legacy layer without manifest resolves literally (as resolveAnim does)
check('legacy literal', resolveMotion(legacy, 'run', {}).concrete, 'run');

// hide
const rules = { 'cape|solid/female|': { sit: { rule: 'hide' }, jump: { rule: 'borrow', from: 'walk' }, run: { rule: 'borrow', from: 'climb' } } };
check('hide', [resolveMotion(cape, 'sit', rules).mode, resolveMotion(cape, 'sit', rules).concrete], ['hide', null]);
// borrow retimed (walk 8 → jump 5)
const b = resolveMotion(cape, 'jump', rules);
check('borrow', [b.mode, b.concrete], ['borrow', 'walk']);
check('borrow frames', b.frames, frameMap(8, 5));
// borrow from a motion the layer lacks → fallback (Focus 1)
check('borrow missing source → fallback', resolveMotion(cape, 'run', rules).mode, 'fallback');
// rules never override real art
check('rule on own motion ignored', resolveMotion(cape, 'slash', { 'cape|solid/female|': { slash: { rule: 'hide' } } }).mode, 'own');

// companions are separate (Focus 2)
const swordRules = { 'weapon|sword/arming/universal|fg': { sit: { rule: 'hide' } } };
check('fg hidden', resolveMotion(swordFg, 'sit', swordRules).mode, 'hide');
check('bg falls back', resolveMotion(swordBg, 'sit', swordRules).mode, 'fallback');

// retiming (Focus 3)
check('frameMap 8→5', frameMap(8, 5), [0, 1, 3, 4, 6]);
check('frameMap 3→8', frameMap(3, 8), [0, 0, 0, 1, 1, 1, 2, 2]);
check('frameMap same', frameMap(6, 6), [0, 1, 2, 3, 4, 5]);
for (const [s, d] of [[13, 2], [2, 13], [1, 7], [8, 8]]) {
    const m = frameMap(s, d);
    check(`frameMap ${s}→${d} valid`, m.length === d && m.every(i => i >= 0 && i < s), true);
}

// cast override wins for that character only (Focus 5)
const over = { 'cape|solid/female|': { jump: { rule: 'hide' } } };
check('override hides', resolveMotion(cape, 'jump', rules, over).mode, 'hide');
check('global still borrows', resolveMotion(cape, 'jump', rules).mode, 'borrow');
check('ruleFor reports', ruleFor(cape, 'jump', rules), { rule: 'borrow', from: 'walk' });

// malformed rules: ignored by the game, reported by ruleErrors (Focus 4)
const bad = { 'cape|solid/female|': { jump: { rule: 'explode' }, flying: { rule: 'hide' }, sit: { rule: 'borrow', from: 'sit' }, run: { rule: 'borrow', from: 'nope' } } };
check('bad rule ignored → fallback', resolveMotion(cape, 'jump', bad).mode, 'fallback');
check('self-borrow ignored', resolveMotion(cape, 'sit', bad).mode, 'fallback');
const errs = ruleErrors(bad);
check('errors: unknown rule', errs.some(e => e.includes('explode')), true);
check('errors: unknown motion', errs.some(e => e.includes('flying')), true);
check('errors: self borrow', errs.some(e => e.includes('sit') && e.includes('itself')), true);
check('errors: unknown source', errs.some(e => e.includes('nope')), true);
check('errors: good file', ruleErrors(rules), []);
check('errors: not an object', ruleErrors([]).length > 0, true);

if (fails.length) { console.error(`✗ motionRules: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ motionRules: ${passed} passed`);
