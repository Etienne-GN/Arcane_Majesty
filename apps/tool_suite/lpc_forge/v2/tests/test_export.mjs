#!/usr/bin/env node
/** Unit tests for the export model. Run: node v2/tests/test_export.mjs */
import { UNIVERSAL_ROWS, universalSize, filesUsed, creditsMarkdown, licenceProblems } from '../src/model/exportSheet.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

check('universal size', universalSize(), { w: 832, h: 3456 });
check('walk row + standing column', UNIVERSAL_ROWS.find(r => r.motion === 'walk'), { motion: 'walk', row: 8, rows: 4, cols: 9 });
check('hurt one row', UNIVERSAL_ROWS.find(r => r.motion === 'hurt'), { motion: 'hurt', row: 20, rows: 1, cols: 6 });
check('halfslash last', UNIVERSAL_ROWS.at(-1).row, 50);
check('15 motions', UNIVERSAL_ROWS.length, 15);

const body = { slot: 'body', type: 'body', id: 'bodies/male', zPos: 10, anims: ['walk', 'run'] };
const cape = { slot: 'cape', type: 'cape', id: 'solid/female', color: 'red', zPos: 170, anims: ['walk', 'hurt'] };
const KEY = 'cape|solid/female|';
const used = filesUsed([body, cape], ['walk', 'run'], {});
const paths = used.map(u => u.path).sort();
check('fallback credits the walk sheet it draws', paths, ['body/bodies/male/run.png', 'body/bodies/male/walk.png', 'cape/solid/female/walk/red.png']);
check('walk sheet lists both motions it serves', used.find(u => u.path === 'cape/solid/female/walk/red.png').motions, ['walk', 'run']);
const borrowed = filesUsed([cape], ['run'], { [KEY]: { run: { rule: 'borrow', from: 'hurt' } } });
check('borrow credits its source', borrowed.map(u => u.path), ['cape/solid/female/hurt/red.png']);
check('hidden layer credits nothing', filesUsed([cape], ['run'], { [KEY]: { run: { rule: 'hide' } } }), []);
const noRun = filesUsed([body], ['run'], {}, undefined, (l, c) => c !== 'run');
check('missing file → game walk fallback', noRun.map(u => u.path), ['body/bodies/male/walk.png']);
const gone = filesUsed([cape], ['walk'], {}, undefined, () => false);
check('missing walk too → flagged missing', gone, [{ path: null, layerKey: 'cape:solid/female#', motions: ['walk'], missing: true }]);

const rows = [
    { path: 'body/bodies/male/walk.png', authors: ['A', 'B'], licenses: ['CC-BY-SA 3.0'], urls: ['https://x'] },
    { path: 'body/bodies/male/run.png', authors: ['A', 'B'], licenses: ['CC-BY-SA 3.0'], urls: ['https://x'] },
    { path: 'weapon/a/run/a.png', authors: ['Me'], licenses: ['OGA-BY 3.0', 'unknown'], urls: [], custom: true },
    { path: 'hat/x/walk.png', error: 'no credit found' },
    { path: null, layerKey: 'cape:solid/female#', missing: true },
];
check('problems', licenceProblems(rows), ['weapon/a/run/a.png', 'hat/x/walk.png', 'cape:solid/female# (no file)']);
const md = creditsMarkdown('Eldrin', rows);
check('md title', md.startsWith('# Credits — Eldrin'), true);
check('md groups identical credits', (md.match(/Authors: A, B/g) ?? []).length, 1);
check('md check-these section', /## Check these[\s\S]*hat\/x\/walk\.png/.test(md), true);
check('md marks custom art', /weapon\/a\/run\/a\.png.*drawn in LPC Forge/.test(md), true);

if (fails.length) { console.error(`✗ export: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ export: ${passed} passed`);
