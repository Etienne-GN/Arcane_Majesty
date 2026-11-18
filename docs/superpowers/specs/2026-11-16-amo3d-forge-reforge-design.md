# AMO3d Reforge — slot-based character creator

Date: 2026-11-16
Status: approved design, implementation in progress
Scope: `apps/amo3d` (the `3d` branch)

## Goal

Replace the current 3D Forge (body sliders + one of four outfit cuts + a weapon
preview) with a true character creator. A character is a base body, a set of
independent part slots, and two hands that can each hold any handheld item. The
result must be able to express soldiers, guards, traders, civilians, nobles,
children, men and women — and left-handed fighters — without hardcoding role
outfits.

The first pass ships the **categories and the mechanism**, with at least one
working item in every category. It does not attempt a large content library.

## Non-goals

- Race features (ears, horns, tails, wings), wounds, and horses: slot names may
  be reserved, but no UI/content in this pass.
- Importing LPC sprites into 3D. LPC is the reference for categories and UX only.
- Compare/export pipelines from LPC Forge v2.
- Role-specific clothing sets. Roles are archetype presets over the same slots.

## Model

### Look schema

```json
{
  "body": { "preset": "adult_male", "height": 1, "width": 1, "skin": "#e2b48f" },
  "face": { "eyes": "#5ab8f0" },
  "hair": { "style": "tousled", "color": "#3a2418" },
  "facialHair": { "style": "stubble", "color": "#a07a62" },
  "parts": {
    "torso": { "id": "longcoat", "colors": { "primary": "#a3141f", "collar": "#7a0f17", "trim": "#d4a84a" } },
    "legs": { "id": "trousers", "colors": { "primary": "#221c18" } },
    "feet": { "id": "boots", "colors": { "primary": "#5a3520", "dark": "#3e2416" } },
    "arms": { "id": "bracers", "colors": { "primary": "#5a3520", "trim": "#d4a84a" } },
    "shoulders": { "id": "pauldron", "colors": { "primary": "#3e2416", "trim": "#d4a84a" } },
    "waist": { "id": "belt", "colors": { "primary": "#5a3520", "trim": "#d4a84a" } },
    "neck": { "id": "none" },
    "headgear": { "id": "none", "colors": {} },
    "cape": { "id": "none" },
    "back": { "id": "satchel", "colors": { "primary": "#5a3520", "dark": "#3e2416" } },
    "accessory": { "id": "none" },
    "left": { "id": "none", "accent": "#7ff5e6" },
    "right": { "id": "staff", "accent": "#7ff5e6" }
  }
}
```

- `body.preset`: `adult_male`, `adult_female`, `child`, `elder`.
- `height`/`width` are multipliers on the preset.
- Every part entry has `id`; `colors` is per-item and optional.
- `left` and `right` are the hands. They share one handheld catalog and have no
  dominance relationship. Two shields, two swords, shield + sword, bow + shield
  are all valid.
- No `dominantHand` field. A left-handed character simply holds its weapon in
  `left`.

### Legacy look

Old looks (`outfit.style`, `hood`, `cape`, `headgear`, `build`) are normalized by
`normalizeLook()` into the slot schema. This keeps `eldrin.json`, the townsfolk,
the sanctuary hermit and `wornLook()` working. Legacy mapping:

| legacy | slots |
|---|---|
| `outfit.style: longcoat` | torso longcoat, legs trousers, feet boots, arms bracers, shoulders pauldron, waist belt, back satchel |
| `outfit.style: robe` | torso robe, legs trousers, feet boots, arms sleeves, shoulders none, waist sash, back satchel |
| `outfit.style: tunic` | torso tunic, legs trousers, feet boots, arms sleeves, shoulders none, waist belt, back satchel |
| `outfit.style: armour` | torso armour, legs trousers, feet boots, arms sleeves, shoulders steel_pauldrons, waist belt, back satchel |
| `outfit.style: linen` | torso linen, legs linen_trousers, feet bare, arms sleeves, shoulders none, waist none, back none |
| `hood` | headgear hood (colour `hoodColor`) |
| `headgear.type: helmet` | headgear helmet |
| `headgear.type: hat` | headgear wide_hat or wizard_hat (`style: wizard`) |
| `cape` | cape travelling_cloak |

Colours from the legacy `outfit` object are copied into the matching part
entries. Unknown/absent slots fall back to the preset defaults.

### Part registry

`src/content/models/parts/` holds one module per slot. Each exports a list of
part definitions:

```js
{
  id: 'longcoat',
  label: 'Longcoat',
  colors: { primary: '#a3141f', collar: '#7a0f17', trim: '#d4a84a', vest: '#1c1714', shirt: '#16120f' },
  build(ctx) { /* add meshes; optionally return { update } */ }
}
```

`ctx` provides:

- `head`, `spine`, `hips`, `body`, `root`
- `arms.L/R` (`upper`, `fore`), `legs.L/R` (`thigh`, `shin`)
- `mat(color, opts)`, `mesh(geo, mat, x, y, z)`, `darker(hex, k)`
- `colors` (merged item + defaults), `look`, `preset`
- `onUpdate(fn)` for per-frame hooks (coat flaps, cape)

Slots: `torso`, `legs`, `feet`, `arms`, `shoulders`, `waist`, `neck`,
`headgear`, `cape`, `back`, `accessory`, `left`, `right`.

Hair and facial hair keep the existing parts library (`parts/hair.js`).

### Base body and sockets

`createCharacter()` builds the skeleton and a bare skin body first: hips, chest,
arms, hands, legs, feet, head, nose, eyes, ears. Body presets then adjust:

- `adult_male`: current proportions.
- `adult_female`: slightly shorter/narrower body, narrower shoulders, wider hips.
- `child`: shorter body, shorter limbs, larger head.
- `elder`: slightly thinner limbs and a forward stoop.

Parts mount on the sockets above, so the same part fits every preset.

### Hands

Both hands expose the same catalog: `none`, `fists`, `staff`, `wand`, `sword`,
`greatsword`, `dagger`, `axe`, `mace`, `spear`, `bo`, `bow`, `crossbow`,
`shield`. Each hand has a grip mount and a forearm mount; shields ride the
forearm, everything else grips. `setWeapons()` remains the game's override for
equipment. Swords sheathe on the opposite hip, mirrored per hand.

## Forge UI

- **Left rail**: slot list grouped as Body, Face, Head, Clothes, Equipment.
  Each row shows the slot label and the selected item. Clicking selects the slot.
- **Centre stage**: live 3D character, turntable, zoom, pose buttons
  (idle/walk/run/cast/strike), front/side/back, and a preview-only
  left/right hand toggle for cast/strike.
- **Right panel**:
  - name/lore
  - archetype presets (Soldier, Left-handed Soldier, Guard, Trader, Civilian,
    Noble, Child, Mage, Peasant) + Randomize
  - for the selected slot: item cards (colour tile + label), "None" card
  - colour swatches for the selected item's colour roles
  - body preset and height/width sliders
  - save/export/cast loading in non-create mode
- `?mode=create` keeps the in-game hero flow.

Item cards use a colour tile derived from the item's `primary` colour, not a
3D thumbnail, in this pass. The stage is the live preview.

## Content in the first pass

Reused/refactored from the current model:

- Torso: longcoat, robe, tunic, armour, linen
- Legs: trousers, linen trousers
- Feet: boots, bare
- Arms: sleeves, bracers, bare
- Shoulders: pauldron, steel pauldrons, none
- Waist: belt, sash, none
- Headgear: hood, wide hat, wizard hat, helmet, none
- Cape: travelling cloak
- Back: satchel
- Hands: all current weapon types + shield
- Hair: tousled, short, long, ponytail, braids, bald
- Facial hair: none, stubble, beard, moustache, goatee

New, minimal meshes:

- Torso: peasant shirt
- Legs: skirt
- Feet: shoes
- Neck: scarf
- Back: backpack
- Accessory: eyepatch
- Body: adult female, child, elder presets
- Archetypes: soldier, left-handed soldier, guard, trader, civilian, noble,
  child, mage, peasant

## Compatibility and verification

- Old cast JSON and townsfolk looks must render unchanged after normalization.
- `wornLook()` keeps using legacy fields; normalization maps them.
- Tests:
  - Node: build every body preset × every part and every handheld item; assert
    no exceptions and sane bounding boxes.
  - Node: normalize `eldrin.json` and a representative townsfolk look.
  - `npm run build` passes.
  - Headless screenshots: Forge default, each archetype, and a two-shield
    character.

## Rollout

1. Look schema + registry + base-body refactor; existing looks still identical.
2. Reforged Forge UI.
3. New items + archetypes.
4. Verification, docs, screenshots.
