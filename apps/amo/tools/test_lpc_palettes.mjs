#!/usr/bin/env node
/** Unit tests for lpcPalettes.js. Run: node tools/test_lpc_palettes.mjs */
import { PALETTE_SOURCE, TINT_PALETTE, remapPixels, swapParamsFor, swapColors, tintMaterialFor, sourceMaterialFor }
    from '../src/systems/lpcPalettes.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

// remap: exact source colour → target; near (within threshold) → target; far → untouched; transparent → untouched
const px = [0x99, 0x42, 0x3C, 255,   0x9A, 0x43, 0x3C, 255,   0x00, 0xFF, 0x00, 255,   0x99, 0x42, 0x3C, 0];
remapPixels(px, [0x99423C], [0x112233]);
check('exact', px.slice(0, 3), [0x11, 0x22, 0x33]);
check('near', px.slice(4, 7), [0x11, 0x22, 0x33]);
check('far untouched', px.slice(8, 11), [0x00, 0xFF, 0x00]);
check('transparent untouched', px.slice(12, 15), [0x99, 0x42, 0x3C]);

check('hair tint material', tintMaterialFor('hair', { id: 'afro/adult' }), 'body');
check('animal head tint', tintMaterialFor('head', { id: 'heads/boarman/adult', tintMaterial: 'fur' }), 'fur');
check('hair source', sourceMaterialFor('hair', { id: 'afro/adult' }), 'hair');
check('boarman source', sourceMaterialFor('head', { id: 'x', tintMaterial: 'fur' }), 'fur');
check('weapon source', sourceMaterialFor('weapon', { id: 'sword/longsword' }), 'metal');

check('natural → null', swapParamsFor('hair', { id: 'afro/adult' }, 0), null);
check('file-colour items never swap', swapParamsFor('cape', { id: 'solid', colors: ['red'] }, 3), null);
const sp = swapParamsFor('body', { id: 'bodies/male' }, 1);
check('body swap source', sp?.sourceKey, 'body');
check('body swap colours', sp?.sourceColors, PALETTE_SOURCE.body);
check('body swap target', sp?.targetShades, TINT_PALETTE.body[1].shades);
check('body swap name', sp?.tintName, TINT_PALETTE.body[1].name);

// custom per-item source ramp (items drawn in their own palette, e.g. leather armour)
const custom = { id: 'armour/leather/male', sourceColors: [0x101010, 0x404040, 0x808080, 0xC0C0C0, 0xF0F0F0] };
const cp = swapParamsFor('torso_armour', custom, 1);
check('custom source used', cp?.sourceColors, custom.sourceColors);
check('custom targets same length', cp?.targetShades.length, 5);
check('custom darkest → darkest shade', cp?.targetShades[0], TINT_PALETTE.body[1].shades[0]);
check('custom lightest → lightest shade', cp?.targetShades[4], TINT_PALETTE.body[1].shades.at(-1));
check('custom key names the item', cp?.sourceKey, 'custom:armour/leather/male');
const one = swapColors('hat', { id: 'rune', sourceColors: [0x808080] }, TINT_PALETTE.body[1]);
check('single-colour item takes the middle shade', one.targetShades, [TINT_PALETTE.body[1].shades[Math.floor(TINT_PALETTE.body[1].shades.length / 2)]]);
const sc = swapColors('torso_armour', custom, TINT_PALETTE.body[1]);
check('swapColors custom', [sc.sourceColors.length, sc.targetShades.length], [5, 5]);
const sb = swapColors('body', { id: 'bodies/male' }, TINT_PALETTE.body[1]);
check('swapColors default = palette source', sb.sourceColors, PALETTE_SOURCE.body);
check('swapColors default targets = shades', sb.targetShades, TINT_PALETTE.body[1].shades);
const sm = swapColors('torso_clothes', { id: 'x', sourceMaterial: 'cloth_light' }, TINT_PALETTE.body[1]);
check('sourceMaterial honoured', sm.sourceColors, PALETTE_SOURCE.cloth_light);

if (fails.length) { console.error(`✗ lpcPalettes: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ lpcPalettes: ${passed} passed`);
