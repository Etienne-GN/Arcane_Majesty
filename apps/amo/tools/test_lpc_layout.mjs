#!/usr/bin/env node
/** Unit tests for lpcLayout.js (shared by the game and LPC Forge v2). Run: node tools/test_lpc_layout.mjs */
import { SLOTS, renderType, animPath, libPath, setCustomFiles, hasCustomFile, frameRateFor, walkSkip, slotIndex, nextVisible } from '../src/systems/lpcLayout.js';
import { resolveAnim } from '../src/systems/animResolve.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

check('slot count', SLOTS.length, 35);
check('first slot', SLOTS[0], 'head');
check('torso_clothes → torso', renderType('torso_clothes'), 'torso');
check('staff_accessory → weapon', renderType('staff_accessory'), 'weapon');
check('hair → hair', renderType('hair'), 'hair');

check('plain body', animPath({ type: 'body', id: 'bodies/male' }, 'run'), 'lpc/body/bodies/male/run.png');
check('itemName', animPath({ type: 'weapon', id: 'sword/arming/universal', itemName: 'fg' }, 'walk'),
      'lpc/weapon/sword/arming/universal/walk/fg.png');
check('color', animPath({ type: 'cape', id: 'solid/female', color: 'red' }, 'walk'), 'lpc/cape/solid/female/walk/red.png');
check('weapon default name', animPath({ type: 'weapon', id: 'sword/longsword' }, 'slash'),
      'lpc/weapon/sword/longsword/slash/longsword.png');
check('cape no color → red', animPath({ type: 'cape', id: 'solid' }, 'walk'), 'lpc/cape/solid/walk/red.png');

check('idle fps', frameRateFor('idle'), 2);
check('slash fps', frameRateFor('slash'), 11);
check('run fps', frameRateFor('run'), 8);
check('walk 9 cols skips 1', walkSkip('walk', 9), 1);
check('walk 8 cols no skip', walkSkip('walk', 8), 0);
check('run no skip', walkSkip('run', 9), 0);

// saved creator picks restore by id (catalogue positions shift when items are added)
const entries = [{ id: null }, { id: 'a' }, { id: 'new' }, { id: 'b' }];
check('by id after an insert', slotIndex(entries, { id: 'b', catalogueIdx: 2 }), 3);
check('old save without id → position', slotIndex(entries, { catalogueIdx: 1 }), 1);
check('id gone from catalogue → position', slotIndex(entries, { id: 'zzz', catalogueIdx: 1 }), 1);
check('nothing → 0', slotIndex(entries, {}), 0);
check('position out of range → 0', slotIndex(entries, { catalogueIdx: 99 }), 0);

// cycling skips hidden items (replaced originals stay valid for old saves, but aren't offered)
const list = [{ id: null }, { id: 'a' }, { id: 'old', hidden: true }, { id: 'b' }];
check('skip hidden forward', nextVisible(list, 1, 1), 3);
check('skip hidden backward', nextVisible(list, 3, -1), 1);
check('wraps', nextVisible(list, 3, 1), 0);
check('from a hidden item moves on', nextVisible(list, 2, 1), 3);
check('all hidden → stays', nextVisible([{ id: 'x', hidden: true }], 0, 1), 0);

// Custom overlay (Forge motion workshop): registered files win and count as owned art.
const redCape = { type: 'cape', id: 'solid/female', color: 'red', anims: ['walk', 'hurt'] };
const navyCape = { ...redCape, color: 'navy' };
check('libPath has no prefix', libPath(redCape, 'run'), 'cape/solid/female/run/red.png');
check('no custom: run unresolved', resolveAnim(redCape, 'run'), null);
setCustomFiles(['cape/solid/female/run/red.png']);
check('registered', hasCustomFile('cape/solid/female/run/red.png'), true);
check('custom run resolves', resolveAnim(redCape, 'run'), 'run');
check('custom path', animPath(redCape, 'run'), 'lpc_custom/cape/solid/female/run/red.png');
check('library path untouched', animPath(redCape, 'walk'), 'lpc/cape/solid/female/walk/red.png');
check('other colour not covered', resolveAnim(navyCape, 'run'), null);
check('other colour path stays library', animPath(navyCape, 'run'), 'lpc/cape/solid/female/run/navy.png');
const sword = { type: 'weapon', id: 'sword/arming/universal', itemName: 'bg', anims: ['walk'] };
setCustomFiles(['weapon/sword/arming/universal/attack_slash/bg.png']);
check('alias candidate found in overlay', resolveAnim(sword, 'slash'), 'attack_slash');
check('registry replaced', hasCustomFile('cape/solid/female/run/red.png'), false);
setCustomFiles([]);
check('cleared', resolveAnim(redCape, 'run'), null);
check('no manifest layer unchanged', resolveAnim({ type: 'body', id: 'bodies/male' }, 'run'), 'run');

if (fails.length) { console.error(`✗ lpcLayout: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ lpcLayout: ${passed} passed`);
