import assert from 'node:assert';
import { catalogueLayout, CHAR_FEET_OFFSET, UNDER_DEPTH, OVER_DEPTH } from '../src/utils/catalogueLayout.js';

const box = { left: 100, top: 200, w: 32, h: 48 };
let n = 0;
const eq = (a, b) => { assert.deepStrictEqual(a, b); n++; };

// not decided yet: legacy behaviour (centre depth, whole box only if blocking)
eq(catalogueLayout({}, box, {}), { depth: 224, body: null });
eq(catalogueLayout({}, box, { blocking: true }).body, { x: 100, y: 200, w: 32, h: 48 });

// hitbox decides collision, with or without `blocking` on the map item
const tree = { layer: 'sorted', hitbox: { x: 11, y: 38, w: 10, h: 10 } };
eq(catalogueLayout(tree, box, {}).body, { x: 111, y: 238, w: 10, h: 10 });
eq(catalogueLayout(tree, box, { blocking: false }).body, null);
// sorted: base of the hitbox, shifted to the characters' feet
eq(catalogueLayout(tree, box, {}).depth, 248 - CHAR_FEET_OFFSET);

// explicit null hitbox = no collision even if the map says blocking
eq(catalogueLayout({ hitbox: null, layer: 'under' }, box, { blocking: true }), { depth: UNDER_DEPTH, body: null });
// sorted without a hitbox uses the sprite's bottom
eq(catalogueLayout({ hitbox: null, layer: 'sorted' }, box, {}).depth, 248 - CHAR_FEET_OFFSET);
// over is above any sorted depth
assert.ok(catalogueLayout({ hitbox: null, layer: 'over' }, box, {}).depth >= OVER_DEPTH); n++;
// depthOffset still applies
eq(catalogueLayout({ hitbox: null, layer: 'under' }, box, { depthOffset: 1 }).depth, UNDER_DEPTH + 1);

console.log(`✓ catalogue-layout tests passed (${n} assertions).`);
