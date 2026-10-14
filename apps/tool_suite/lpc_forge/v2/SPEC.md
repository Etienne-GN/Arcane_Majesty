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

## Flags for Claude (2026-10-10)

You flag from the stage (🚩 *Flag this frame*, key **F**, in single view; 🚩 on a
layer row) or from a Gaps cell. A flag targets a **component** (all motions), a
**component in one motion**, a **single frame** (motion + direction + frame,
0-based), or the **whole character**, with a reason, a message and a 192 px
snapshot of what was on screen; stage flags also store the composition (`comp`)
and cast id (`cast`, or `scratch:<name>`). They live in
`apps/tool_suite/lpc_forge/gap_flags.json`; the API creates/updates them one at a
time (`POST /api/gap-flags`, `PATCH /api/gap-flags/:id {status, note, who}`).

**When told "process the Forge flags"** (Claude):
1. Read `gap_flags.json`; take every flag with status `open` (and `question`s the
   user answered). Look at its `snapshot` and reproduce it from `comp` + motion/dir/frame.
2. Fix what it asks (art edit in the library/`lpc_custom`, catalogue, motion rule,
   cast file…), verify on the stage (screenshot), commit.
3. Answer on the flag with `PATCH … {status: 'needs_review', note: '…', who: 'Claude'}`
   — or `status: 'question'` when a decision is the user's. Never set `resolved`
   (the user approves).

## Motion workshop (Plan D, 2026-10-14)

Draw a motion a layer lacks (or redraw one it has) and ship it to the game.
Plan: `docs/superpowers/plans/2026-10-14-lpc-forge-v2-workshop.md`.

- **Where art goes.** Sheets are saved in `apps/amo/public/lpc_custom/`, under the same
  relative path as the library (`weapon/sword/arming/universal/run/fg.png`). Each one
  is listed in `apps/amo/src/data/lpc_custom.json` with its author, `derivedFrom`, and
  the authors, licences and URLs carried over from its sources. Those come from
  `public/CREDITS.csv`, which uses upstream's `item/fg/walk.png` layout; failing an
  exact match, the nearest credited item folder is used.
- **How the game sees it.** `lpcLayout.setCustomFiles()` holds a registry. `animPath`
  sends a registered path to `lpc_custom/`, and `resolveAnim` treats it as the layer's
  own art. So nothing in the catalogue, the motion rules or cast files is edited: a
  saved sheet beats any rule for that item, for every character. The game registers it
  in `lpcCustom.js`; the Forge reads it from `GET /api/custom`. `npm run test:catalogue`
  fails on an unlisted sheet, a sheet of the wrong size, or a sheet with `unknown`
  licences.
- **Screen.** Open the Workshop tab. You can also open it from a Gaps cell
  (🖌 *Draw … in the workshop*) or from a layer row in the stage's single view
  (🖌 *draw it*).
  - **Drafts:**
    - *fitted to the body*: another motion's frames, retimed, each shifted by the
      body's own move between the two motions (silhouette match)
    - *retimed*: another motion's frames, no shift
    - *my saved custom sheet*
    - *blank*
  - **Tools:**
    - pencil (B), eraser (E), eyedropper (I), fill (G), select and drag (M)
    - arrows nudge the frame (Shift nudges the whole row) or the selection
    - Ctrl+Z / Ctrl+Y undo and redo
    - `,` and `.` step through frames
  - **Onion skin:** the rest of the character in that frame, and the previous frame.
  - **Live preview:** the working sheet stands in for its file through `setSheetOverride`.
  - **Template:** a zip with the draft and a 35% guide of the character, to draw
    elsewhere and then *Upload PNG* (the size is checked).
- **Save.** `PUT /api/custom` checks the path, the PNG and the motion's sheet size
  (frames × rows, with oversize multiples allowed). Open flags on that item × motion
  move to `needs_review`. For capes and backpacks, *Save for all N colours*
  recolours the sheet into every colour of the item, using colour maps read off the
  item's own walk sheets.
- **Licences.** By default a derivative keeps the licences of its sources ("same as the
  sources"). Original work (a blank draft) needs a licence.

## Compare, Export, Randomize (Plan E, 2026-10-14)

Plan: `docs/superpowers/plans/2026-10-14-lpc-forge-v2-export-compare.md`.

- **Compare** (tab). Each of the two sides is the forge's character or a cast member,
  optionally a variant. Each side keeps its own `motionRules`. Both sides share the
  motion and direction (all 4, or one large) and the animation clock. A table lists
  every slot that differs (item, colour or tint).
- **Export** (*⤓ Export…* in the stage bar) downloads `<id>[__variant].zip` containing:
  - `universal.png`: the Universal LPC generator's layout, 832×3456 with 64 px cells,
    walk with its standing column. Oversize swings are cut to the cell.
  - `<motion>.png`: frames as played; 192 px cells as an option.
  - `credits.json` and `CREDITS.md`
  - `composition.json`

  The credits cover every sheet the character draws in the chosen motions, as the game
  resolves them: own art, walk fallbacks and borrowed sources. They are looked up
  through `POST /api/credits/batch`, using the custom manifest first and then
  CREDITS.csv. Sheets with no credit or an unknown licence are shown before export and
  listed under "Check these".
- **Randomize** (🎲, or R on the Forge screen) re-rolls every slot that isn't locked
  (🔒 in the slot list, saved per browser).
  - Body, head, eyes, top and legs are always worn; the other slots each have a chance.
  - Items must fit the body's type token. A child only wears child-tagged clothes,
    plus tokenless weapons, shields and backpacks.
  - The head stays in the same family, so a human stays human.
  - Body, head, ears and nose share one skin tint.
  - Hidden items are never picked.
  - Model: `v2/src/model/randomize.js`.
