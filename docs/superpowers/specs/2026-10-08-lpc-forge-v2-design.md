# LPC Forge v2 — Design

## Why
Characters should feel alive: run, jump, sit, idle, emote. The art largely exists —
the "LPC Expanded: Sit, Run, Jump & More" set is part of Universal LPC, which is already
in the game's library (`apps/amo/ressources/lpc_merged`, served as `public/lpc`). Nothing
uses it yet, and the Forge (v1, Vitruvian Studio) can't even see it: it only reads the
Vitruvius sheets (walk, idle, slash, thrust, shoot, spell, hurt).

Coverage of the game's curated catalogue (`character_catalogue.json`, 962 items):
run 70%, jump 71%, sit 71%, idle 80%, climb 57%, combat_idle 68%, emote 72%.
The holes are concentrated: weapons 0/35 run, capes 0/5, backpacks 0/17, jackets 0/12,
dresses 0/11, necklaces 4/56. Eldrin's Forge save wears a cape — he would lose it the
moment he runs. Filling these gaps (including drawing them ourselves) is the core job.

Forge v2 is to the Forge what ledger v2 was to the ledger: a rebuild, side by side with v1.

## Scope
In: Forge v2 tool — cast designer that publishes to the game, motion stage, gap review,
motion workshop (author missing motions), export with credits, v1 save migration, and the
motion-rule support in the game's `animResolve.js`.

Out (next spec, "characters come alive"): sprint/jump/sit/idle in gameplay, input
bindings, stamina, switching story characters in `characters.js` from baked PNGs to cast
entries.

## 1. Shape
- `apps/tool_suite/lpc_forge/v2/` — Vue 3 + TS, UI on **:5179**; extended `server.js` API on :3001.
- `npm run dev` → API + v2. `npm run dev:v1` → API + v1 on :5177 (kept until the user asks to remove it).
- `v2/SPEC.md` — v1 feature inventory (parity checklist) + v2 design, like the ledger.
- `@game` alias imports `apps/amo/src/systems/animResolve.js` and `character_catalogue.json`
  directly: one resolver, so "works in the Forge" means "works in the game".
- Server serves `apps/amo/ressources/lpc_merged/spritesheets` read-only and
  `apps/amo/ressources/lpc_custom/` (see §5) read-write.
- Item source: the curated catalogue; a "whole library" toggle shows uncurated items with a
  "promote to catalogue" action.

## 2. Cast (data model)
`apps/amo/src/data/cast/<id>.json`:
```json
{
  "id": "eldrin", "name": "Eldrin",
  "role": "story",                     // player-preset | story | npc | enemy
  "dbCharacter": "Eldrin",              // optional link to the Neo4j Character
  "layers": [ /* game LayerConfig incl. palette swaps */ ],
  "variants": { "traveling": { "replace": { /* slot → LayerConfig|null */ } } },
  "motionRules": { /* per-cast overrides, see §4 */ },
  "published": true
}
```
- These files are the source of truth (committed, diffable). `saves.db` stays for scratch compositions.
- Publishing sets `published: true` and regenerates `cast/index.js`; the game can then render the
  character with `CharacterRenderer` in every motion.
- **Migration**: one-time script maps the 17 v1 saves (Vitruvian keys like `clothes.cape.solid`
  + colour `garnet`) to game layer ids through a mapping table; colours go to the nearest game
  palette; unmatched items become gap-review flags, never silently dropped. Prints a report.

## 3. Screens
- **Cast home** — cards: animated thumb, role, published, coverage score ("13/15 motions clean").
- **Composer** — slot sidebar with searchable picker (each item shows motion-coverage dots),
  colour/palette per layer, lock-and-randomize per slot, variant switcher.
- **Motion stage** — 15 motions × 4 directions playing in sync, or one motion large with speed,
  frame-step, and a game-tile background. Missing layers are greyed in the layer list;
  "missing" overlay outlines what disappears.
- **Compare** — two cast members or variants side by side on the same motion.
- **Gap review** — items × motions matrix (filters: slot, used-by-cast, catalogue-only);
  ledger-style flags (open / needs_review / question / resolved, comment thread, `[Claude]`
  notes); gaps hitting published cast sort to the top. Each gap has "Fix…" → §4/§5.
- **Motion workshop** — see §5.
- **Export** — flattened PNG per motion or full ULPC-layout sheet, per cast member/variant, plus
  `credits.json`/`.md` from the layers used (CC-BY-SA attribution); license check flags unknown provenance.

## 4. Motion rules (what happens when a layer lacks a motion)
`apps/amo/src/data/motion_rules.json` (per item) with per-cast overrides:
- `hide` — today's behaviour (e.g. sword during sit).
- `borrow: <motion>` — reuse another motion's frames for that layer, retimed to the target
  frame count (e.g. cape in run ← walk). Approved on the stage, never applied blindly.
- `custom` — use authored frames from `lpc_custom/` (§5). Set automatically when a custom file exists.

Game change (only one in this spec): `resolveAnim` in `animResolve.js` honours these rules and
looks in `lpc_custom/` first; `CharacterRenderer` loads from the resolved path. Unit-tested in Node.

## 5. Motion workshop — authoring missing motions ourselves
The user must be able to add any missing motion (e.g. a run for a weapon) without waiting on upstream art.

- **Custom overlay folder** `apps/amo/ressources/lpc_custom/spritesheets/`, same path layout as
  `lpc_merged` (`<type>/<id>/<motion>/<file>.png`). A file here wins over the library and fills
  gaps; served to the game the same way as `lpc_merged`. Every file gets a provenance entry in
  `lpc_custom/CREDITS.json` (author, derived-from, license — derivatives of CC-BY-SA stay CC-BY-SA).
- **Start a gap** from gap review or the stage: pick item + motion. The workshop builds a
  correctly sized working sheet (rows up/left/down/right, the motion's frame count, 64 px or the
  item's oversize frame) with a **starting draft**:
  - `blank`, or
  - `from <motion>` — the item's frames from another motion, retimed (e.g. weapon walk → run), or
  - `pose-fit` — for held items: per frame, place the item's frame from the closest source pose,
    offset by the hand position difference between the body's source and target frames.
    Hand anchors come from a small per-motion table we author once for the base body.
- **Edit in the Forge**: pixel editor on the working sheet — pencil, eraser, eyedropper, move
  selection, nudge whole frame by 1 px, palette limited to the item's colours; onion skin of the
  target body motion underneath (toggle) plus previous frame; live preview of the full character
  in that motion while drawing; undo/redo.
- **Or edit outside**: "Download template" (draft + faded body guide on a separate layer as a
  2-layer PNG pair) and "Upload" — drop a PNG back, size-checked, then previewed on the stage.
- **Save** writes to `lpc_custom/`, updates `anims` in the catalogue entry (so the manifest and
  validator know the motion exists), and resolves the gap flag to needs_review for the user.
- Palette swaps work on custom frames like any other layer (same colour ramps).

## 6. Testing
- Node tests (`tools/test_*.mjs`, ledger style): v1→game id mapping, motion-rule resolver (shared
  with the game), custom-overlay precedence, cast (de)serialisation, workshop sheet sizing and
  retiming, API smoke.
- The game's catalogue validator (`npm run test:catalogue`) also checks `cast/*.json`,
  `motion_rules.json`, and that every `lpc_custom` file has a CREDITS entry and the right size.
- Before calling it done: all 17 migrated characters checked on the stage, with a per-character
  list of motions where a layer still disappears; one gap (weapon run) authored end to end
  through the workshop and confirmed in the game's creator.

## Build order
1. v2 shell, API, library + catalogue + `@game` resolver wiring, `SPEC.md` inventory.
2. Composer + motion stage.
3. Cast files, publish, v1 migration.
4. Gap review (matrix, flags) + motion rules (Forge + `animResolve.js`).
5. Motion workshop (overlay folder, drafts, editor, template round-trip).
6. Compare, export + credits, randomize/variants.
