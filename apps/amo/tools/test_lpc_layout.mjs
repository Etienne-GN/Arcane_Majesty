#!/usr/bin/env node
/** Unit tests for lpcLayout.js (shared by the game and LPC Forge v2). Run: node tools/test_lpc_layout.mjs */
import { SLOTS, renderType, animPath, frameRateFor, walkSkip } from '../src/systems/lpcLayout.js';

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

if (fails.length) { console.error(`✗ lpcLayout: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ lpcLayout: ${passed} passed`);
