---
name: character-models
description: Build and refine Arcane Majesty's 3D models in apps/amo3d — the v2 characters (base bodies, layers, outfits, face paint, cast variants like Seraphina Rebel), the creatures (wolf, horse, the animals, mobs, bosses), and the Sculptor that edits them. Use for any request to create, fix, reshape or review a character, creature, mob, animal, outfit, hair, face or reference-sheet model, or to work on the Sculptor (sculptor.html) or the Forge's v2 models.
---

# Character & creature models (v2) — Arcane Majesty

## The user's direction (non-negotiable)
- **Quality bar: WoW Classic, not its proportions** (no oversized hands/shoulders/heads), not BOTW. The user's reference
  sheets (`docs/3d/characters/*.jpg`, `docs/3d/creatures/*.jpg`) are the target — match them, read them closely.
- **Few, well-placed faces beat many.** The reference base meshes (`docs/3d/characters/base_mesh_reference.jpg`) have
  maybe 20 faces on a back and look great: big flat planes that follow the anatomy (pecs, abs, shoulder blades, lats,
  deltoid, calf). A ring-by-ring tube with thin sliver faces looks worse, whatever its count.
- **Clothes and hair are not body shape.** Layers shape the body; garments and hair dress it (outfits, wardrobe.js).
- **Every save undoable** (Undo last save, layers/history/). Never lose the user's sculpting.
- **The user works on a Galaxy S25 Ultra with the S Pen**, in the phone's browser on the dev server
  (http://192.168.0.153:5190/sculptor.html). Every Sculptor feature must work with pen + touch, at phone width.
- **Anatomy he has corrected (do not repeat):** four-legged animals' hind legs carry the big thigh (haunch), forelegs
  lighter; a horse head is a wedge (deep jowl, eyes high, straight face, blunt nose, narrow throat) — not a tube to a
  snout ("tapir"); nothing too thin (ears, tails, wings get thickness); coat patterns are organic spots (not "a chess
  board"); legs never inside-out; ponytails seen from behind must hang down the back, not stick out; heads must read as
  the thing they are — compare to the sheet, not "kinda shaped like something".

## Where things are
| What | File |
|---|---|
| Skin builder (lofts, tubes, polys, structural keys, @topo add/remove) | `apps/amo3d/src/content/models/v2/skin.js` |
| Human base body (male/female, layers stack, outfit hooks, face features, facePaint) | `models/v2/base.js` |
| Shape layers (one JSON per layer: common, male, female, boy, girl, old_man, old_woman, wolf, horse, cow…) | `models/v2/layers/*.json`; alternates `layers/alt/<layer>/`; history `layers/history/` (gitignored) |
| Creatures (buildLayered, buildWolfV2, buildHorseV2, buildAnimalV2, slab, paintPatches) | `models/v2/creatures.js` |
| Cast v2 models (eldrin, seraphina = Queen POC, seraphina_rebel) | `models/v2/{eldrin,seraphina,seraphina_rebel}.js`, registry `models/v2/index.js` |
| Every other look on v2 (Forge clothes translated, rigid parts kept) | `models/v2/wardrobe.js`, `models/character.js` |
| Basic outfits for sculpting ("Dress") | `models/v2/dress.js` |
| The Sculptor (stage, subjects, CREATURES map) / its editor (toolbars, layers, versions, pen) | `src/sculptor/main.js`, `src/sculptor/pointEditor.js` |
| Layer / alternates / undo APIs (dev server) | `apps/amo3d/vite.config.js` (`/api/v2layer`, `/api/v2alts`, `/api/v2undo`) |
| Plans and progress | `docs/3d/characters/LAYERS_PLAN.md`, `docs/3d/TODO.md` §2 §4 §5 |

## Recipes
**A new creature kind** (wolf/horse/animals are the patterns): keep the kind's joints (the groups its AI animates) as
bones; write `buildXV2(d)` in creatures.js with `buildLayered(root, kind, gen)`; in the actor's builder, when
`settings.charModels === 'new'`, remove the classic meshes (keep any mesh used as a bone, hidden) and call it; add
`layers/<kind>.json` (`{}`) — the layer API takes any layer that has a file; add the kind to `CREATURES` in
sculptor/main.js and a label in `LAYER_LABEL` (pointEditor.js); its sheet → `REF`/`REF_IMG` in pointEditor.js.
**A character variant** (Seraphina Rebel): its own `models/v2/<id>.js` built on `buildBase(ctx, { sex, skin, hair,
outfit })`, registered in `models/v2/index.js`, its own cast file `content/cast/<id>.json` (`look.v2 = '<id>'`), added to
`CAST` in sculptor/main.js and to the Forge's list (forge/main.js, `Sculpt this character`). Face tattoos/paint:
`outfit.facePaint({ P, poly, EX, EY, MY, MW })` — marks laid on the face (lift under 0.0012 = behind the eyes).

## Model v3 (2026-11-27, the second one): v2 copied, to the sheet's proportions
`models/v3/body.js` = v2's base.js copied (v2 left as it is), its own layers v3_male / v3_female (seeded from v2's),
Sculptor subjects base_male_v3 / base_female_v3. Proportions fixed by OVERLAY: `node tools/models/silhouette.mjs <subject>`
then `python3 tools/models/overlay.py <subject>` → the model's outline in red on the sheet's figure, front and side, at
the same height (as the Sculptor's reference › Fit). The changes live in v3Ring (torso rings), foreY (forearm), the
_v3Rig block (head joint, arm joints), HV/hk (head), kl (legs).

## Dropped experiments (2026-11-27): the first v3 and v4
v3 (hand-placed loops from the sheet's measurements) and v4 (v2 with fewer loops) were both dropped by the user: v2's
general shape, size and proportions are better. Lessons:
- Every loft (v1, v2, v3) makes horizontal BANDS — the sheet's faces are not banded: their edges run DIAGONALLY along the
  muscles (the pec's lower edge to the armpit, the trapezius, the lats). Per-corner heights ([x, z, dy] in a loft's pts)
  help but don't remove the bands.
- The user judges height and proportions against v2 side by side in the Sculptor, not against the sheet's numbers.
- Upward lofts (rings listed bottom first) wind inward — use `inward: true`, or list the rings top first.
- An inverted-hull outline striped the body with shadow acne and the user was unsure of it (removed).
- The Sculptor's sun now has the game's shadow bias (flat faces striped themselves without it).
v3's code is in git history (models/v3/body.js before its removal); docs/3d/characters/v3/ keeps the hand-off brief and glb.

## Traps already hit
- `sk.tube` winding can face inward → creature tubes use `mat: 'double'`. Lofts on tilted joints (neck, head): build the
  rings in the joint's frame (`ringIn`), not root axes. Loft caps take a plain colour (no colour function on end rings).
- A leg's top ring must be buried in the body (drawn in toward the middle), never standing out of the side.
- Python `str.replace` replaces EVERY match: the horse code once landed in the boat builders — assert a count of 1.
- A `//` comment inside a one-line function comments out its closing brace (the Sculptor once failed to load).
- `typeof x` on a `const` not yet initialised throws — guard with try/catch.
- vite.config.js changes restart the dev server; the game server (port 3003) must be restarted by hand for server code.

## Checks before showing ANYTHING to the user
1. `node apps/amo3d/tools/models/verify_bodies.mjs` — male/female points unchanged (0.000 mm) unless meant to move.
2. `node apps/amo3d/tools/models/shots.mjs <subject> [apose|idle|walk]` — front, three-quarter, side, back, below and the
   head, framed to its size, in `apps/amo3d/tools/.out/models/`. **Look at every shot** against the sheet: silhouette,
   head, hands/paws/hooves, hind vs front legs, anything thin, anything inside-out, the ponytail from behind.
   For a human body, then `python3 apps/amo3d/tools/models/compare.py <subject> [male|female]` — the sheet's front, side
   and back beside the model's (tools/.out/models/compare_<subject>.png): compare like for like.
3. Sculptor changes: headless at phone size `HL_W=412 HL_H=900 HL_TOUCH=1` (tools/headless.mjs), every control reachable.
4. A creature in the game: `?play=1&q=low` with `charModels: 'new'` — no errors; perf (calls, triangles) noted.
