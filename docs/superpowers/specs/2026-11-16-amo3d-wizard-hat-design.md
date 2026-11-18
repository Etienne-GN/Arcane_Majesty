# Wizard's Hat — design

## Goal

Add a wearable **Wizard's Hat** to the item list that renders as a proper pointed
wizard hat on the 3D hero, instead of reusing the generic wide-brimmed hat mesh.

## Item

`apps/amo/src/data/items.js`

- id `wizards_hat`, name "Wizard's Hat", `slot: 'head'`, tier 2, `rarity: 'uncommon'`.
- `stats: { intelligence: 2, stamina: 1 }`.
- Buy 140 glint / sell 45.
- `onUse: (stats) => stats.equipItem('wizards_hat')`.
- `hatStyle: 'wizard'` — the explicit style marker for the wardrobe (approach A).
- Colour: midnight indigo (`0x2a2350`).
- Added to `MERCHANT_CATALOG` (glint, alongside the other arcane goods).

The 2D client receives the item entry (inventory, stats, equip) unchanged; no 2D
sprite work is in scope.

## Wardrobe

`apps/amo3d/src/game/wardrobe.js`

- Head-slot items are mapped to a look. When the item carries `hatStyle`, use it
  (`look.headgear = { type: 'hat', style: item.hatStyle, color }`).
- Items without `hatStyle` keep the existing cowl / hood / helm / hat name rules.

## Model

`apps/amo3d/src/content/models/character.js`

New `headgear.style === 'wizard'` branch, all procedural Three.js:

- wide brim (slightly drooping cylinder/cone);
- tall tapered crown that leans a little;
- hat band in a darker shade of the item colour;
- a few tiny emissive-gold star studs on the crown.

No assets. The colour comes from the item.

## Forge

`apps/amo3d/src/forge/main.js`

- New **Headgear** section: none · hood · wide hat · wizard hat · helmet, plus a
  colour picker. Selecting one rebuilds the preview immediately.
- Randomize now sometimes picks a headgear (including the wizard hat).
- The old hood chip under Outfit moves into this section; cape stays under Outfit.

## Out of scope

- No 2D sprite/layer work.
- No crafting recipe.

## Verification

- `npm run build` in `apps/amo3d`.
- Headless Chrome: open the Forge, click "wizard hat", confirm the look carries
  `{ type: 'hat', style: 'wizard' }` and the meshes are present (brim, leaning
  cone crown, band, emissive stars). Screenshot saved under `tools/.out/`.
