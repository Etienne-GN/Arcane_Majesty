# amo Character & Animation System

How layered LPC characters (body + clothing + equipment + weapons) are composed,
animated, recoloured, and kept in sync — in the Character Creator and in-game.

## Pieces

| File | Role |
|---|---|
| `src/systems/CharacterRenderer.js` | Layer compositor. Loads per-animation PNG sheets, stacks them z-ordered in a Phaser Container, drives play/freeze, palette swaps, oversize-frame handling, and **logical→concrete animation resolution**. |
| `src/data/character_catalogue.json` | The catalogue of every selectable part (body, hair, torso, weapon, …). Each entry + companion carries an **`anims` manifest**. |
| `src/scenes/CharacterCreatorScene.js` | The creator UI — part/colour/tint pickers, preview, presets, export. |
| `src/systems/catalogueLayers.js` | Bridges saved/equipped layers to the catalogue's `anims` manifest (in-game + legacy saves). |
| `tools/` | Catalogue generation, manifest annotation, validation, audits. |

## The animation manifest (`anims`)

LPC parts ship wildly uneven animation sets. A human body has all 15
(`walk, idle, hurt, slash, backslash, halfslash, thrust, shoot, spellcast, run,
sit, jump, climb, combat_idle, emote`); most weapons ship only `walk` + one or
two attacks. Requesting a non-existent sheet 404s.

So **every catalogue entry and companion records an `anims` array** — the exact
animations whose files exist on disk. The renderer only ever loads/plays what a
layer actually has. Result: zero 404 spam in the console.

## Logical → concrete resolution

Universal LPC names attacks `slash` / `thrust`; Vitruvius-sourced weapons name the
same motions `attack_slash` / `attack_thrust` / `attack_slash_reverse`. The user
(and the player's attack) work in **logical** anims; each layer resolves to the
**concrete** file it ships:

```
ANIM_ALIASES = {
  slash:     ['slash', 'attack_slash'],
  backslash: ['backslash', 'attack_backslash', 'attack_slash_reverse'],
  halfslash: ['halfslash', 'attack_halfslash'],
  thrust:    ['thrust', 'attack_thrust'],
}
resolveAnim(layer, logical)  // first candidate present in layer.anims, else null
```

`_layerTarget()` is the single resolver used by `play` / `_resyncAll` /
`freezeFrame`. It picks the concrete anim, prefers a palette-swapped texture, and
returns **null → hide the layer** when:
- the layer ships no file for the motion *and* none for walk, or
- the resolved animation has no frames for the current direction (a real asset
  gap — e.g. a weapon with no up-facing slash).

We deliberately do **not** fall back to a walk pose mid-action: a sword frozen in
a walk stance during a slash reads as broken, so hiding is the honest choice.

## Oversize weapon sheets

Some weapon attacks are authored at 128/192/256 px frames (e.g.
`sword/longsword/slash` is 1152×768 = 192px × 6 × 4). `ensureCorrectFrameSize`
detects the real frame size; `registerSheetFrames` lays out frames at that size
for palette swaps / freeze / export. Body (64px) and oversize weapon (192px) line
up because both sprites are centre-anchored and ULPC frames are centre-authored.

## bg/fg layering

Many weapons/shields split into a foreground half and a "behind" companion
(zPos 5, behind the body at z=10). Each file is empty in the directions it
shouldn't show; the renderer hides the empty-direction rows so the two halves
combine into one correct sprite per facing.

## Palette swap (recolour)

LPC colours are produced by canvas pixel-remapping (not `setTint`, which is
multiply-only and can't lighten). `PALETTE_SOURCE` holds each material's source
pixel set; a chosen palette entry's `shades` are mapped onto them. Swapped
textures are cached as `…__rc_<source>_<name>` and keyed in `entry.swappedKeys`
by **concrete** anim name.

## Tooling / workflow

```
npm run gen:anims       # annotate catalogue with anims[] (non-destructive)
npm run test:catalogue  # validate: 0 phantom refs, valid frame grids (also runs as prebuild)
npm run audit:weapons   # per-direction coverage report (genuine art gaps)
npm run audit:oversize  # oversize-sheet frame-size sanity
npm run build           # prebuild runs test:catalogue first
```

⚠️ **Do not run `node tools/gen_catalogue.js` to refresh animations.** It
regenerates the catalogue from scratch and **loses hand-curated weapon structure**
(itemNames, companions, labels). To recompute `anims` after editing assets or the
catalogue, run **`npm run gen:anims`** (`tools/annotate_anims.js`), which only adds
the `anims` arrays to the existing file.

## Known source-asset gaps (not bugs)

These ULPC sheets are missing direction rows in the source art; the renderer
hides the weapon for those facings (the body still animates):

- `blunt/mace` **thrust** — source ships only the right-facing row.
- `sword/dagger` walk/thrust, `polearm/cane`, and several slashes — no up-facing frame.

Run `npm run audit:weapons` for the current list.
