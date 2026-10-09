#!/usr/bin/env node
/** Unit tests for the Forge v2 cast model. Run: node v2/tests/test_cast.mjs */
import { readFileSync } from 'node:fs';
import { slugify, buildCast, compositionOf, validateCast, coverage, castShapeErrors, CAST_ID_RE } from '../src/model/cast.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

check('slug', slugify('Nythorian Soldier 2'), 'nythorian_soldier_2');
check('slug strips', slugify('  ../Évil/ name!! '), 'evil_name');
check('slug empty', slugify('!!!'), 'unnamed');
check('id re rejects traversal', CAST_ID_RE.test('../x'), false);
check('id re accepts slug', CAST_ID_RE.test('anya_0gd'), true);

const sel = { body: { id: 'bodies/male' }, head: { id: 'heads/human/male' }, cape: { id: 'solid/female', color: 'red' } };
const c = buildCast(CAT, { name: 'Eldrin', role: 'story', dbCharacter: 'Eldrin', sel,
    variants: { traveling: { ...sel, hat: { id: 'cloth/hood/adult' } } } });
check('id from name', c.id, 'eldrin');
check('layers built', c.layers.some(l => l.slot === 'cape'), true);
check('variant layers', c.variants.traveling.layers.some(l => l.slot === 'hat'), true);
check('unpublished by default', c.published, false);
check('db link kept', c.dbCharacter, 'Eldrin');
check('valid', validateCast(CAT, c), []);
check('round trip', compositionOf(c).sel, sel);
check('variant comp', compositionOf(c, 'traveling').sel.hat.id, 'cloth/hood/adult');
check('compositionOf copies', compositionOf(c).sel === c.sel, false);

const bad = { ...c, id: 'Bad Id', role: 'boss', sel: { ...sel, hat: { id: 'nope/nope' } } };
const errs = validateCast(CAT, bad);
check('bad id', errs.some(e => e.includes('id')), true);
check('bad role', errs.some(e => e.includes('role')), true);
check('unknown item', errs.includes('hat: unknown item nope/nope'), true);
check('stale layers', validateCast(CAT, { ...c, layers: [] }).includes('layers are stale'), true);

// shape check (what the server accepts before writing into the game)
check('good shape', castShapeErrors(c), []);
check('layers must be an array', castShapeErrors({ ...c, layers: 'junk' }).some(e => e.includes('layers')), true);
check('layer needs string slot/id', castShapeErrors({ ...c, layers: [{ slot: 1 }] }).some(e => e.includes('layers[0]')), true);
check('variants must be an object', castShapeErrors({ ...c, variants: 5 }).some(e => e.includes('variants')), true);
check('variant layers must be an array', castShapeErrors({ ...c, variants: { v: { layers: 3 } } }).some(e => e.includes('variants.v')), true);
check('published must be boolean', castShapeErrors({ ...c, published: 'yes' }).some(e => e.includes('published')), true);
check('name must be a string', castShapeErrors({ ...c, name: 42 }).some(e => e.includes('name')), true);
check('role must be known', castShapeErrors({ ...c, role: 'boss' }).some(e => e.includes('role')), true);
check('sel must be an object', castShapeErrors({ ...c, sel: [] }).some(e => e.includes('sel')), true);
check('non-object rejected', castShapeErrors(null).length > 0, true);
check('motion rule overrides accepted', castShapeErrors({ ...c, motionRules: { 'cape|solid/female|': { sit: { rule: 'hide' } } } }), []);
check('bad overrides rejected', castShapeErrors({ ...c, motionRules: { 'cape|solid/female|': { sit: { rule: 'explode' } } } }).some(e => e.includes('explode')), true);
check('buildCast keeps overrides', buildCast(CAT, { name: 'X', role: 'npc', sel, motionRules: { 'cape|solid/female|': { sit: { rule: 'hide' } } } }).motionRules['cape|solid/female|'].sit.rule, 'hide');
check('buildCast omits empty overrides', 'motionRules' in buildCast(CAT, { name: 'X', role: 'npc', sel, motionRules: {} }), false);

const cov = coverage(c.layers);
check('cape breaks run', cov.gaps.run.length > 0, true);
check('total 15', cov.total, 15);
check('clean < 15 with cape', cov.clean < 15, true);

if (fails.length) { console.error(`✗ cast: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ cast: ${passed} passed`);
