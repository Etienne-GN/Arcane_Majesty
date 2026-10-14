#!/usr/bin/env node
/** Unit tests for the motion workshop model. Run: node v2/tests/test_workshop.mjs */
import {
    sheetSpec, specOf, sizeError, blankSheet, getFrame, putFrame, retimeDraft, silhouetteOffset,
    poseFitDraft, paletteOf, colourMap, applyColourMap, shiftFrame, History,
} from '../src/model/workshop.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// --- geometry
check('run spec', sheetSpec('run'), { motion: 'run', fs: 64, rows: 4, cols: 8, skip: 0, w: 512, h: 256 });
check('walk keeps a standing column', sheetSpec('walk').cols, 9);
check('walk skip', sheetSpec('walk').skip, 1);
check('hurt is one row', [sheetSpec('hurt').rows, sheetSpec('hurt').w, sheetSpec('hurt').h], [1, 384, 64]);
check('climb is one row', sheetSpec('climb').rows, 1);
check('oversize slash', [sheetSpec('slash', 192).w, sheetSpec('slash', 192).h], [1152, 768]);
check('specOf library walk', specOf('walk', 576, 256), { motion: 'walk', fs: 64, rows: 4, cols: 9, skip: 1, w: 576, h: 256 });
check('specOf oversize', specOf('slash', 1152, 768).fs, 192);

// Focus 2: wrong sizes are refused with the expected size named
check('right size ok', sizeError(512, 256, sheetSpec('run')), null);
check('wrong cols', /512×256/.test(sizeError(576, 256, sheetSpec('run'))), true);
check('hurt with 4 rows', /384×64/.test(sizeError(384, 256, sheetSpec('hurt'))), true);

// --- frames: each frame is filled with a colour encoding (row, col)
function marked(spec) {
    const img = blankSheet(spec);
    for (let r = 0; r < spec.rows; r++) for (let c = 0; c < spec.cols; c++) {
        const f = getFrame(img, spec, r, c);
        for (let i = 0; i < f.data.length; i += 4) { f.data[i] = r * 10; f.data[i + 1] = c; f.data[i + 3] = 255; }
        putFrame(img, spec, r, c, f);
    }
    return img;
}
const px = (img, spec, r, c) => { const f = getFrame(img, spec, r, c); return [f.data[0], f.data[1], f.data[3]]; };
const walkSrc = marked(sheetSpec('walk'));
check('get/put round trip', px(walkSrc, sheetSpec('walk'), 2, 5), [20, 5, 255]);

// Focus 4: retiming never uses the walk standing frame and maps into range
const jump = retimeDraft(walkSrc, sheetSpec('walk'), sheetSpec('jump'));
const jumpCols = [0, 1, 2, 3, 4].map(c => px(jump, sheetSpec('jump'), 1, c)[1]);
check('walk 8 → jump 5 uses walk cols 1..8 only', jumpCols, [1, 2, 4, 5, 7]);
check('row kept', px(jump, sheetSpec('jump'), 3, 0)[0], 30);
const sitSrc = marked(sheetSpec('sit'));
const runFromSit = retimeDraft(sitSrc, sheetSpec('sit'), sheetSpec('run'));
check('sit 3 → run 8', [0, 1, 2, 3, 4, 5, 6, 7].map(c => px(runFromSit, sheetSpec('run'), 0, c)[1]), [0, 0, 0, 1, 1, 1, 2, 2]);
const walkFromRun = retimeDraft(marked(sheetSpec('run')), sheetSpec('run'), sheetSpec('walk'));
check('walk target gets a standing frame = its first frame', px(walkFromRun, sheetSpec('walk'), 2, 0), px(walkFromRun, sheetSpec('walk'), 2, 1));
const hurt = retimeDraft(walkSrc, sheetSpec('walk'), sheetSpec('hurt'));
check('one-row hurt draws from the down row', px(hurt, sheetSpec('hurt'), 0, 0)[0], 20);
const runFromHurt = retimeDraft(marked(sheetSpec('hurt')), sheetSpec('hurt'), sheetSpec('run'));
check('one-row source fills every direction', px(runFromHurt, sheetSpec('run'), 3, 0), [0, 0, 255]);
const big = retimeDraft(marked(sheetSpec('slash', 128)), sheetSpec('slash', 128), sheetSpec('run'));
check('oversize source centred into 64 px frames', [big.w, big.h], [512, 256]);

// --- silhouettes and pose-fit
function blob(fs, x0, y0, wd = 10, ht = 20) {
    const f = { w: fs, h: fs, data: new Uint8ClampedArray(fs * fs * 4) };
    for (let y = y0; y < y0 + ht; y++) for (let x = x0; x < x0 + wd; x++) f.data[(y * fs + x) * 4 + 3] = 255;
    return f;
}
check('offset found', silhouetteOffset(blob(64, 20, 20), blob(64, 23, 18)), { dx: 3, dy: -2 });
check('no movement → 0,0', silhouetteOffset(blob(64, 20, 20), blob(64, 20, 20)), { dx: 0, dy: 0 });
check('empty frame → 0,0', silhouetteOffset(blankSheet({ w: 64, h: 64 }), blob(64, 5, 5)), { dx: 0, dy: 0 });
const shifted = shiftFrame(blob(64, 0, 0, 4, 4), -2, 1);
check('shift cuts pixels leaving the frame', [shifted.data[(1 * 64 + 0) * 4 + 3], shifted.data[(1 * 64 + 2) * 4 + 3], shifted.data[3]], [255, 0, 0]);

// pose-fit: body in target is 2 px lower than in source → item moves 2 px down
const S = sheetSpec('walk'), D = sheetSpec('run');
const bodyA = blankSheet(S), bodyB = blankSheet(D), item = blankSheet(S);
for (let r = 0; r < 4; r++) {
    for (let c = 0; c < S.cols; c++) { putFrame(bodyA, S, r, c, blob(64, 20, 20)); putFrame(item, S, r, c, blob(64, 30, 30, 2, 2)); }
    for (let c = 0; c < D.cols; c++) putFrame(bodyB, D, r, c, blob(64, 20, 22));
}
const fit = getFrame(poseFitDraft(item, S, bodyA, S, bodyB, D), D, 1, 3);
check('pose-fit follows the body', [fit.data[(32 * 64 + 30) * 4 + 3], fit.data[(30 * 64 + 30) * 4 + 3]], [255, 0]);

// --- palette and colour mapping
const pal = { w: 2, h: 2, data: new Uint8ClampedArray([200, 200, 200, 255, 10, 10, 10, 255, 200, 200, 200, 255, 0, 0, 0, 0]) };
check('palette by luminance, transparent ignored', paletteOf(pal), [[10, 10, 10], [200, 200, 200]]);
const red = { w: 3, h: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 128, 0, 0, 255, 0, 0, 0, 0]) };
const navy = { w: 3, h: 1, data: new Uint8ClampedArray([0, 0, 128, 255, 0, 0, 64, 255, 0, 0, 0, 0]) };
const m = colourMap(red, navy);
const drawn = { w: 3, h: 1, data: new Uint8ClampedArray([128, 0, 0, 255, 250, 5, 5, 255, 0, 0, 0, 0]) };
check('colour map + nearest for unseen colours', [...applyColourMap(drawn, m).data], [0, 0, 64, 255, 0, 0, 128, 255, 0, 0, 0, 0]);

// --- history
const h = new History(3);
let cur = 'a';
h.push(cur); cur = 'b'; h.push(cur); cur = 'c';
check('undo', (cur = h.undo(cur)), 'b');
check('redo', (cur = h.redo(cur)), 'c');
check('push clears redo', (h.push(cur), h.canRedo), false);
for (const s of ['d', 'e', 'f', 'g']) h.push(s);
check('bounded', h.past.length, 3);
check('undo when empty is a no-op', new History().undo('x'), 'x');

if (fails.length) { console.error(`✗ workshop: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ workshop: ${passed} passed`);
