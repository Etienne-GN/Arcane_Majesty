#!/usr/bin/env node
/** Unit tests for the Forge v2 composition model. Run: node v2/tests/test_composition.mjs */
import { readFileSync } from 'node:fs';
import { defaultComposition, layersFor, motionsOf, missingIn, entryFor, layerKeyOf } from '../src/model/composition.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const comp = defaultComposition();
check('default has body', comp.sel.body.id, 'bodies/male');
check('default has human head', comp.sel.head.id, 'heads/human/male');
const base = layersFor(CAT, comp);
check('body layer type', base.find(l => l.slot === 'body').type, 'body');

// torso_clothes renders from the torso folder, with a file colour
comp.sel.torso_clothes = { id: 'aprons/apron/female', color: 'blue' };
const l1 = layersFor(CAT, comp).find(l => l.slot === 'torso_clothes');
check('torso type', l1.type, 'torso');
check('torso colour', l1.color, 'blue');
// no colour picked → first file colour, never a missing path
comp.sel.torso_clothes = { id: 'aprons/apron/female' };
check('default file colour', layersFor(CAT, comp).find(l => l.slot === 'torso_clothes').color, 'black');

// weapon with a companion → two layers, z-sorted (bg 5 before body 10, fg 142 after)
comp.sel.weapon = { id: 'sword/arming/universal' };
const ls = layersFor(CAT, comp);
const w = ls.filter(l => l.slot === 'weapon');
check('weapon + companion', w.map(l => l.itemName), ['bg', 'fg']);
check('z sorted', ls.map(l => l.zPos), [...ls.map(l => l.zPos)].sort((a, b) => a - b));

// tint → swapParams; Natural → none
comp.sel.hair = { id: 'afro/adult', tint: 2 };
check('hair swap', layersFor(CAT, comp).find(l => l.slot === 'hair').swapParams?.sourceKey, 'hair');
comp.sel.hair = { id: 'afro/adult', tint: 0 };
check('hair natural', layersFor(CAT, comp).find(l => l.slot === 'hair').swapParams, undefined);

// coverage
check('afro covers run', motionsOf(entryFor(CAT, 'hair', 'afro/adult')).includes('run'), true);
check('arming sword lacks run', motionsOf(entryFor(CAT, 'weapon', 'sword/arming/universal')).includes('run'), false);
check('missing in run = sword layers', missingIn(ls, 'run').filter(l => l.slot === 'weapon').length, 2);

// layer keys tell a weapon's bg and fg layers apart
check('layer keys distinct', new Set(w.map(layerKeyOf)).size, 2);
check('layer key shape', layerKeyOf(w[0]), 'weapon:sword/arming/universal#bg');

// unknown id → ignored, not thrown
comp.sel.hat = { id: 'does/not/exist' };
check('unknown id ignored', layersFor(CAT, comp).some(l => l.slot === 'hat'), false);

if (fails.length) { console.error(`✗ composition: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ composition: ${passed} passed`);
