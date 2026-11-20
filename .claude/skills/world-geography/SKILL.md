---
name: world-geography
description: Shape Arcane Majesty's open world (Eldoria) and its places — terrain relief, landforms, setting a place's map into the world (stamps), passes, gates, lakes, and checking it all with the survey tool. Use for any terrain, geography, map-making, relief, mountain, valley, river, region-placement or "make the world look like X" request in apps/amo3d.
---

# World geography — Arcane Majesty's open world

## The user's direction (non-negotiable)
- **Relief first.** The land must feel real, and sometimes fantastic. Believable landforms: ranges of peaks joined by
  saddles, a crater vale inside a mountain, gorges, passes, foothills, river valleys, cliffs, calderas.
- **Never crop or flatten a place's relief** to make it fit. Shape the land around it so it fits the place
  (e.g. the glade is a crater vale in a small snow-capped range — not a hole in a green plateau).
- Keep a place's landmark scenery (waterfalls, shader water, light shafts) whole.
- Canon: positions come from the lore DB (Neo4j on scarif) via the W0 layout. A new *named* place, feature or
  landmark goes through the canon check (Phase 10) before it is presented as lore; unnamed relief is free.
- Answer in English; commit on main; release with a tag `amo3d-vX.Y.Z`.

## Where things live
| What | File |
|---|---|
| World layout (places from the DB × 5.5 m, ranges, rivers, roads, coast) | `data/scripts/world_layout.py` → `apps/amo3d/src/content/world/eldoria_layout.json` (+ `docs/3d/world/`) |
| The land itself: `eldoriaHeight(x, z)`, colours (`groundColor`), trees (`clearAt`), the places list (`makeStamps`, `STORY`) | `apps/amo3d/src/content/world/eldoria.js` |
| Streaming, stamps, lazy building, proxies, chart hook | `apps/amo3d/src/engine/stream.js` |
| Region maps (`regionHeight(def)` pure; `buildRegion(def, { shape })` to reshape) | `apps/amo3d/src/engine/region.js`, `content/regions/*.json` |
| Retired old maps → open world redirect | `main.js` `redirect`, `game/travel.js` `OPEN_WORLD_IDS` |
| Plan / status | `docs/3d/OPEN_WORLD_PLAN.md` |
Coordinates: x east, z south (north is −z); metres; 1 DB unit = 5.5 m; world ~8.4 km square; sea level `WATER = -2`.

## Shaping the land (eldoriaHeight)
- Compose: gentle base noise → named landforms (gaussians along polylines for ridges, rings for calderas/craters,
  `smooth()` blends toward a target height for vales and plateaus) → rivers carved last-ish → sea/edges.
- Ridges: `rug` (ridged fbm 0.75–1.25) × height, so crests are craggy, not domes. Peaks 85–170 m read as a range;
  join them with saddles (polyline distance). Snow and bare rock above the tree line via `groundColor` (trees skip
  `h > 38`); match a place's own palette at its rim (the glade's snowy rim → snow from ~40 m round it).
- Openings: a way out of an enclosed landform needs a corridor where the shaping is suppressed (`gorgeMask`,
  the glade's `out` mask) **and** the place's own terrain notched (see passes).
- The open world has **no slope limit**: the player walks up anything. Gate with colliders, not slopes.

- **No right angles, ever.** No rectangular valleys, plateaus or pits. Place footprints are rounded, wobbling
  superellipses (`round`, `wobble` on the stamp; squarer only for a walled city); outlines and blends follow
  `edgeDist`, never a rect.
- **Paths are logical.** A road never climbs a steep slope: roads are smooth curves (Catmull-Rom), their bed
  smoothed and held to ~10% grade, the land cut and filled along them (`graded()` in eldoria.js). Check the steepest
  stretch per road after any terrain change (aim ≤ 15%).

## Setting a place into the world (stamps)
`prepStamp({ id, map | make+heightAt, ox, oy, oz, rect, drop, ... })`:
- **rect** (local): crop *inside the old map's border rim* only for ordinary regions (auto: first rise of 5 m above
  the floor along each axis — measure from the **water line** for a lake region). Keep the whole rim when the rim *is*
  the landform (the glade's vale, the story places).
- **oy**: by the rim (`fitOy`, border mean) when the place is enclosed; by its middle (`anchor`) when open;
  never let a floor sink below the sea (`minOy`); a lake region sits with its water at `WATER` (its own sheet then
  drops and the world's water fills it).
- **lazy** (regions): give `make` + `heightAt: regionHeight(def)` — the ground is known from the start, meshes/life
  are built within `BUILD_R` (450 m), one a frame. Hand-built maps (Thaloria, glade…) are eager — they cost entry time.
- **drop**: `IN_WORLD` — exits to places already in the world vanish (their veils too; plain arches stay).
- A place's inside always wins over a neighbour's blending ring (60 m). Adjacent places: leave a small gap.
- **passes**: `buildRegion(def, { shape })` cuts a notch through the rim toward each neighbour so it shows in the
  place's own mesh; `heightAt` must be the shaped one too.
- **story gates**: crest walls (segment colliders on the rim square, gaps at passes) + a gate of flame on a pass whose
  `requires` flag is not set (`st.tick` opens/closes it live; god mode opens all). Chapters run in the place's frame
  (`chapters.enter(st.map, id, { off })`, `me()`), so actors go into `st.map.scene` (= the stamp's group).
- Pitfalls already hit: a fog-less **shader** is a waterfall, not a backdrop (only big unfogged non-shader meshes
  are backdrops); a mountain map's fall-recovery fires off its trail (`wake: 0`); a stamped map's own sky/fog is
  dead (its scene is no longer drawn).

## Check every change (before committing)
1. `cd apps/amo3d && npx vite build --logLevel error` (dev server on :5190 must be running for checks).
2. `python3 tools/world_survey.py <outdir> --place <stampId>` (or `--at x,z`, `--radius 400`): four ground views,
   an aerial, one from inside, and W–E / N–S height profiles. Read the sheet **and** the numbers: walls at a rect
   edge, pits, flooded floors and boxes show in the profile first.
3. Look for: rectangular edges, snow/ash colour clashes, a place floating or sunk, water slabs, blocked ways out.
4. Entry time and hitches: `P.maps.eldoria=null; P.enterMap('eldoria','outdoor:start')` timed; lazy builds' `buildMs`.
5. Send the user the sheet; commit with the attribution lines; tag a release when it is a playable step.
