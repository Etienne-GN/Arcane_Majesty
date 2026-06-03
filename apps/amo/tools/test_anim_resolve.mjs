#!/usr/bin/env node
/**
 * Unit tests for the Phaser-free animation resolution logic (animResolve.js) —
 * the core of the weapon frame-alignment / no-404 system. Pure assertions, no
 * deps. Run: node tools/test_anim_resolve.mjs  (or npm test).
 */
import { resolveAnim, concreteAnimsFor, DEFAULT_ANIMS } from '../src/systems/animResolve.js';

let passed = 0;
const fails = [];
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(name, got, want) {
    if (eq(got, want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// ── resolveAnim ─────────────────────────────────────────────────────────────
// Universal weapon: slash present directly.
check('universal slash', resolveAnim({ anims: ['walk', 'slash', 'thrust'] }, 'slash'), 'slash');
// Vitruvius weapon: logical slash → attack_slash fallback.
check('vitruvius slash→attack_slash', resolveAnim({ anims: ['walk', 'attack_slash'] }, 'slash'), 'attack_slash');
// thrust alias.
check('thrust→attack_thrust', resolveAnim({ anims: ['walk', 'attack_thrust'] }, 'thrust'), 'attack_thrust');
// backslash prefers backslash, then attack_backslash, then attack_slash_reverse.
check('backslash→reverse', resolveAnim({ anims: ['walk', 'attack_slash_reverse'] }, 'backslash'), 'attack_slash_reverse');
check('backslash prefers exact', resolveAnim({ anims: ['backslash', 'attack_backslash'] }, 'backslash'), 'backslash');
// Motion the layer doesn't ship → null (caller hides the layer).
check('missing motion → null', resolveAnim({ anims: ['walk', 'hurt'] }, 'slash'), null);
check('no idle → null', resolveAnim({ anims: ['walk', 'slash'] }, 'idle'), null);
// Non-aliased anim resolves to itself when present.
check('walk→walk', resolveAnim({ anims: ['walk'] }, 'walk'), 'walk');
// No manifest → legacy literal fallback (first candidate).
check('no manifest literal', resolveAnim({}, 'slash'), 'slash');
check('no manifest non-alias', resolveAnim({}, 'idle'), 'idle');

// ── concreteAnimsFor ────────────────────────────────────────────────────────
// A longsword-like weapon: only the files it ships are requested (+ walk fallback),
// and logical slash maps to its concrete slash. No 'idle'/'backslash' phantoms.
{
    const longsword = { anims: ['walk', 'hurt', 'slash', 'thrust', 'attack_slash_reverse'] };
    const got = [...concreteAnimsFor(longsword, DEFAULT_ANIMS)].sort();
    check('longsword concrete set', got, ['attack_slash_reverse', 'hurt', 'slash', 'thrust', 'walk']);
}
// A Vitruvius weapon: logical slash/thrust collapse onto attack_* files; walk kept;
// 'idle' (not shipped) drops out — no phantom request.
{
    const halberd = { anims: ['walk', 'hurt', 'attack_slash', 'attack_thrust'] };
    const got = [...concreteAnimsFor(halberd, ['walk', 'slash', 'thrust', 'idle'])].sort();
    check('halberd concrete set', got, ['attack_slash', 'attack_thrust', 'walk']);
}
// Body with everything: every logical anim resolves to itself.
{
    const body = { anims: DEFAULT_ANIMS.slice() };
    const got = concreteAnimsFor(body, DEFAULT_ANIMS);
    check('body covers all logical', DEFAULT_ANIMS.every(a => got.has(a)), true);
}

if (fails.length) {
    console.error(`✗ anim-resolve tests FAILED — ${fails.length}/${passed + fails.length}:`);
    for (const f of fails) console.error('  ' + f);
    process.exit(1);
}
console.log(`✓ anim-resolve tests passed (${passed} assertions).`);
