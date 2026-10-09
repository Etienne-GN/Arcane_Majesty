# LPC Forge: v1 inventory and v2 design

v1 is the Vitruvian Studio app (`src/`, UI on :5177). v2 is the rebuild (`v2/`, UI on
:5179). Both use the same API server (:3001). Design: `docs/superpowers/specs/2026-10-08-lpc-forge-v2-design.md`.

```
npm run dev       # API :3001 + v2 UI :5179 (the default)
npm run dev:v1    # API :3001 + the old v1 UI :5177
npm run ui:v2     # v2 UI only, when the API already runs
npm test          # API smoke + v2 model/geometry tests
```

## Part 1: what v1 does (parity checklist)

Plans: **A** foundation (composer + motion stage) · **B** cast, publish, v1 migration ·
**C** gap review + motion rules · **D** motion workshop · **E** compare, export, credits, randomize.

### Data
- `public/spritesheets` (Vitruvius sheets, 4,416 PNGs; walk idle slash backslash thrust shoot spell rod whip hurt; no run/jump/sit/climb/emote)
  → **v2 uses the game's merged library** (`apps/amo/ressources/lpc_merged`, Universal LPC + Vitruvius, all 15 motions). A
- `src/data/packed.json` item index (anatomy / clothes / injuries / equipment / horse) → **game catalogue** `character_catalogue.json`. A
- `src/data/colors.json` named colour ramps per material → **game palettes** `lpcPalettes.js` (file colours + tint palettes). A
- `saves.db` (`saves` table: type, name, data, preview) → kept; v2 scratch saves use type `v2`. A — cast files are B.

### Character tab
- Left tabs: Anatomy, Clothes, Injuries, Equipment (Clothes etc. disabled until a body is picked) → slot list grouped Body / Clothes / Equipment / Marks. A
- Sprite select per group with presets (e.g. body type sub-options) and a colour button per material → item picker + colour/tint picker. A
- Colour selector modal per material → inline swatches. A
- Pose bar: walk, shoot, slash, backslash, spell, thrust, rod, whip, hurt, idle (disabled when no layer supports it)
  → all 15 game motions (rod/whip: not in the game's motion set; **dropped** unless asked). A
- Single preview: 4 direction buttons, play/pause, zoom in/out, center → motion stage single view. A
- Preview multiple (all directions) → motion stage grid (15 motions × 4 directions). A
- Sprites tab (raw sheet grid) → B/E (export view).
- Savings card: list, save, open, delete, import JSON, export JSON → save/load/delete in A; import/export JSON in B (cast files).
- Credits card (per-layer authors, licenses, urls) → E (credits from the layers used).
- Renderings card: download current animation, download all, download all layers → E.
- Mobile layout (panel toggles) → **dropped** (desktop tool).

### Horse tab
- Horse composer + gallop/walk preview → **dropped** (no horses in the game). Ask before removing v1.

## Part 2: v2

See the design spec. Plan A delivers: shared `@game` code (`lpcLayout.js`, `lpcPalettes.js`, `animResolve.js`),
`/lpc` library route, composition model (game LayerConfig), composer with per-item motion coverage,
motion stage with missing-layer flags, scratch saves.
