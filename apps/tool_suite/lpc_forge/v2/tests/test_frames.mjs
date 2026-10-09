#!/usr/bin/env node
/** Unit tests for Forge v2 frame geometry. Run: node v2/tests/test_frames.mjs */
import { frameSizeOf, frameGeometry, frameRect } from '../src/render/frames.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

check('walk 64', frameSizeOf(576, 256), 64);
check('hurt 1-row', frameSizeOf(384, 64), 64);
check('oversize 192', frameSizeOf(1152, 768), 192);
check('oversize 128', frameSizeOf(1024, 512), 128);

check('walk down skips standing frame', frameGeometry('walk', 'down', 576, 256),
      { fs: 64, rows: 4, cols: 9, row: 2, colStart: 1, count: 8 });
check('run right', frameGeometry('run', 'right', 512, 256),
      { fs: 64, rows: 4, cols: 8, row: 3, colStart: 0, count: 8 });
check('hurt any dir uses row 0', frameGeometry('hurt', 'left', 384, 64),
      { fs: 64, rows: 1, cols: 6, row: 0, colStart: 0, count: 6 });
check('climb up uses row 0', frameGeometry('climb', 'up', 384, 64).row, 0);
check('oversize slash', frameGeometry('slash', 'down', 1152, 768),
      { fs: 192, rows: 4, cols: 6, row: 2, colStart: 0, count: 6 });

const g = frameGeometry('walk', 'down', 576, 256);
check('frame 0 rect', frameRect(g, 0), { sx: 64, sy: 128, sw: 64, sh: 64, dx: 0, dy: 0 });
check('frame wraps', frameRect(g, 8), frameRect(g, 0));
const o = frameGeometry('slash', 'left', 1152, 768);
check('oversize centred', frameRect(o, 1), { sx: 192, sy: 192, sw: 192, sh: 192, dx: -64, dy: -64 });

if (fails.length) { console.error(`✗ frames: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ frames: ${passed} passed`);
