#!/usr/bin/env node
/** Townsfolk look recipes (W4). Run: node v2/tests/test_townsfolk_looks.mjs */
import { readFileSync } from 'node:fs';
import { townsfolkRecipes, LOOK_GROUPS, HUMAN_SKINS } from '../src/model/townsfolk.js';

const CAT = JSON.parse(readFileSync(new URL('../../../../amo/src/data/character_catalogue.json', import.meta.url)));
let passed = 0; const fails = [];
const check = (name, got, want) => { if (JSON.stringify(got) === JSON.stringify(want)) passed++; else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
const tintCount = () => 10;

const looks = townsfolkRecipes(CAT, { seed: 1, tintCount });
check('24 looks', looks.length, 24);
check('groups', LOOK_GROUPS, [['adult', 18], ['child', 3], ['guard', 3]]);
check('ids', looks.map(l => l.id), Array.from({ length: 24 }, (_, i) => `look_${String(i).padStart(2, '0')}`));
check('group order', looks.map(l => l.group).join(','), [...Array(18).fill('adult'), ...Array(3).fill('child'), ...Array(3).fill('guard')].join(','));
check('same seed, same looks', JSON.stringify(townsfolkRecipes(CAT, { seed: 1, tintCount })), JSON.stringify(looks));
check('another seed differs', JSON.stringify(townsfolkRecipes(CAT, { seed: 2, tintCount })) === JSON.stringify(looks), false);
check('children have child bodies', looks.filter(l => l.group === 'child').every(l => l.comp.sel.body.id === 'bodies/child'), true);
check('adults are men or women', looks.filter(l => l.group !== 'child').every(l => ['bodies/male', 'bodies/female'].includes(l.comp.sel.body.id)), true);
check('guards wear plate and a kettle helm', looks.filter(l => l.group === 'guard').every(l => /^armour\/plate\//.test(l.comp.sel.torso_armour?.id) && l.comp.sel.hat?.id === 'helmet/kettle/adult'), true);
check('no one carries arms or wings', looks.every(l => ['weapon', 'shield', 'cape', 'backpack', 'wings', 'tail', 'horns'].every(s => !l.comp.sel[s])), true);
check('human skin only', looks.every(l => l.comp.sel.body.tint >= 0 && l.comp.sel.body.tint < HUMAN_SKINS), true);
check('one skin tone per person', looks.every(l => l.comp.sel.head?.tint === undefined || l.comp.sel.head.tint === l.comp.sel.body.tint), true);
check('every look has a head', looks.every(l => !!l.comp.sel.head?.id), true);

// Plain townsfolk: a curated wardrobe and believable colours (no cyclops eyes, pirate
// hats, half wigs, bearded women or blue hair).
const { WARDROBE_PALETTES } = await import('../src/model/townsfolk.js');
const { TINT_PALETTE, tintMaterialFor } = await import('../../../../amo/src/systems/lpcPalettes.js');
const entryOf = (slot, id) => CAT[slot]?.find(e => e.id === id);
const tinted = (l, slot, kind) => { const p = l.comp.sel[slot]; if (p?.tint === undefined) return true; const pal = TINT_PALETTE[tintMaterialFor(slot, entryOf(slot, p.id))]; return WARDROBE_PALETTES[kind].includes(pal?.[p.tint]?.name); };
// The bake's tint count: the size of the item's display palette.
const real = townsfolkRecipes(CAT, { seed: 1, tintCount: (slot, e) => TINT_PALETTE[tintMaterialFor(slot, e)]?.length ?? 0 });
check('human eyes only', real.every(l => /^human\//.test(l.comp.sel.eyes?.id ?? 'human/')), true);
check('no half wigs or spikes', real.every(l => !/^(extensions\/|spiked|longhawk|shorthawk|idol|princess)/.test(l.comp.sel.hair?.id ?? '')), true);
check('beards only on men', real.every(l => !l.comp.sel.beards || l.comp.sel.body.id === 'bodies/male'), true);
check('no arm or shoulder armour', real.every(l => !l.comp.sel.arms && !l.comp.sel.shoulders), true);
check('commoners wear no helmets, pirate or magic hats', real.filter(l => l.group !== 'guard').every(l => !/^(helmet|visor|pirate\/(?!kerchief)|magic|holiday|accessory)\//.test(l.comp.sel.hat?.id ?? '')), true);
check('plain shoes', real.every(l => !/^(armour|accessory|hoofs|socks)\//.test(l.comp.sel.feet?.id ?? '')), true);
check('commoners wear plain legs (guards: plate)', real.filter(l => l.group !== 'guard').every(l => !/^(armour|fur|skirts\/legion|shorts\/short_shorts)\//.test(l.comp.sel.legs?.id ?? '')), true);
check('natural hair colours', real.every(l => tinted(l, 'hair', 'hair') && tinted(l, 'beards', 'hair')), true);
check('muted cloth', real.every(l => ['torso_clothes', 'legs', 'torso_jacket', 'hat', 'feet', 'neck', 'torso_waist'].every(s => tinted(l, s, 'cloth'))), true);

if (fails.length) { console.error(fails.join('\n')); process.exit(1); }
console.log(`test_townsfolk_looks: ${passed} passed`);
