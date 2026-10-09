#!/usr/bin/env node
/** Unit tests for the gap review matrix model. Run: node v2/tests/test_gap_matrix.mjs */
import { readFileSync } from 'node:fs';
import { matrixRows, cellMode, filterRows, setRule, inboxOrder } from '../src/model/gapMatrix.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const rows = matrixRows(CAT);
const items = Object.values(CAT).flat().filter(e => e.id).length;
check('one row per layer (companions included)', rows.length >= items, true);
const cape = rows.find(r => r.key === 'cape|solid/female|');
check('row knows its slot and label', [cape.slot, typeof cape.label], ['cape', 'string']);
const fg = rows.find(r => r.key === 'weapon|sword/arming/universal|fg');
check('companion row', !!fg, true);

check('own', cellMode(cape, 'walk', {}), 'own');
check('fallback', cellMode(cape, 'run', {}), 'fallback');
check('hide rule', cellMode(cape, 'run', { 'cape|solid/female|': { run: { rule: 'hide' } } }), 'hide');

const r1 = filterRows(rows, { slot: 'cape' }, {});
check('slot filter', r1.every(r => r.slot === 'cape') && r1.length > 0, true);
check('search', filterRows(rows, { q: 'arming' }, {}).every(r => r.label.toLowerCase().includes('arming') || r.id.includes('arming')), true);
const onlyGaps = filterRows(rows, { onlyGaps: true }, {});
check('only gaps excludes complete items', onlyGaps.some(r => r.key === 'hair|afro/adult|'), false);
check('used-by filter', filterRows(rows, { keys: new Set(['cape|solid/female|']) }, {}).map(r => r.key), ['cape|solid/female|']);

// inbox order: items worn by published cast members that have gaps come first, order otherwise kept
const pub = new Set(['cape|solid/female|', 'hair|afro/adult|']);
const sorted = inboxOrder(rows, pub, {});
check('published + gaps first', sorted[0].key, 'cape|solid/female|');
check('published without gaps not promoted', sorted.findIndex(r => r.key === 'hair|afro/adult|') > 0, true);
check('same rows', sorted.length, rows.length);
const rest = sorted.slice(1).map(r => r.key);
check('stable for the rest', rest, rows.filter(r => r.key !== 'cape|solid/female|').map(r => r.key));

// setRule edits a copy; 'fallback' removes the rule (and empty entries)
const rules1 = setRule({}, 'cape|solid/female|', 'run', { rule: 'hide' });
check('set hide', rules1, { 'cape|solid/female|': { run: { rule: 'hide' } } });
const rules2 = setRule(rules1, 'cape|solid/female|', 'jump', { rule: 'borrow', from: 'walk' });
check('add borrow keeps hide', Object.keys(rules2['cape|solid/female|']).sort(), ['jump', 'run']);
check('input untouched', Object.keys(rules1['cape|solid/female|']), ['run']);
const rules3 = setRule(setRule(rules2, 'cape|solid/female|', 'run', null), 'cape|solid/female|', 'jump', null);
check('clearing last rule removes the item', rules3, {});

if (fails.length) { console.error(`✗ gapMatrix: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ gapMatrix: ${passed} passed`);
