#!/usr/bin/env node
/** Unit tests for randomize. Run: node v2/tests/test_randomize.mjs */
import { readFileSync } from 'node:fs';
import { bodyToken, compatible, randomize } from '../src/model/randomize.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}
function seeded(seed) { return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); }
const tintCount = () => 10;

check('token male', bodyToken('bodies/male'), 'male');
check('token child', bodyToken('bodies/child'), 'child');
check('skeleton dresses as male', bodyToken('bodies/skeleton'), 'male');
check('no token suits all', compatible('legacy2017/gentleman/pants', 'child'), true);
check('child refuses adult', compatible('afro/adult', 'child'), false);
check('child refuses male', compatible('pants/male', 'child'), false);
check('female takes thin', compatible('pants/thin', 'female'), true);
check('male refuses thin', compatible('pants/thin', 'male'), false);
check('suffix token (male_gaunt)', compatible('heads/human/male_gaunt', 'female'), false);
check('teen takes adult heads', compatible('heads/human/female', 'teen', 'head'), true);
check('teen refuses male torso', compatible('clothes/longsleeve/longsleeve/male', 'teen', 'torso_clothes'), false);

const ids = (slot) => new Map(CAT[slot].map(e => [e.id, e]));
const hidden = new Set(Object.entries(CAT).flatMap(([s, l]) => l.filter(e => e.hidden).map(e => `${s}:${e.id}`)));
let childOk = true, headAlways = true, hiddenNever = true, skinShared = true, lockedKept = true;
const start = { name: 'X', sel: { body: { id: 'bodies/child', tint: 3 }, weapon: { id: 'sword/arming/universal' } } };
for (let s = 1; s <= 200; s++) {
    const c = randomize(CAT, start, { locked: new Set(['body', 'weapon']), rng: seeded(s), tintCount });
    if (c.sel.body.id !== 'bodies/child' || c.sel.body.tint !== 3 || c.sel.weapon?.id !== 'sword/arming/universal') lockedKept = false;
    if (!c.sel.head?.id) headAlways = false;
    for (const [slot, p] of Object.entries(c.sel)) {
        if (!ids(slot).has(p.id)) fails.push(`unknown pick ${slot}:${p.id}`);
        if (hidden.has(`${slot}:${p.id}`)) hiddenNever = false;
        if (slot !== 'body' && slot !== 'weapon' && !compatible(p.id, 'child', slot)) childOk = false;
    }
    if (c.sel.head.tint !== c.sel.body.tint) skinShared = false;
}
check('locked slots kept', lockedKept, true);
check('head always', headAlways, true);
check('child never gets adult items', childOk, true);
check('hidden never picked', hiddenNever, true);
check('skin shared with locked body', skinShared, true);
check('deterministic with a seed', randomize(CAT, start, { locked: new Set(), rng: seeded(7), tintCount }),
      randomize(CAT, start, { locked: new Set(), rng: seeded(7), tintCount }));
const free = randomize(CAT, { name: 'Y', sel: {} }, { locked: new Set(), rng: seeded(3), tintCount });
check('required slots filled', ['body', 'head', 'eyes', 'torso_clothes', 'legs'].every(s => free.sel[s]?.id), true);
check('name kept', free.name, 'Y');
const cape = Object.entries(randomize(CAT, { name: 'Z', sel: {} }, { locked: new Set(), rng: () => 0.01, tintCount }).sel).find(([s]) => s === 'cape');
check('file-colour items get a listed colour', !cape || CAT.cape.find(e => e.id === cape[1].id).colors.includes(cape[1].color), true);

if (fails.length) { console.error(`✗ randomize: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ randomize: ${passed} passed`);
