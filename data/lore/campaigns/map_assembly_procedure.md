# Map Assembly Procedure

This document defines the repeatable procedure for turning a finished
location spec (a campaign bible entry, or a dedicated per-location map
spec once one exists) into a real, wired-in map — the last step of the
map-authoring pipeline, after sprites are catalogued and the engine can
place them by name.

## Procedure

Given one finished location spec:

1. **Author the `tiles` grid.** Read the spec's geography/terrain
   description for dimensions and layout. Write the layout as ASCII art
   (`.` floor, `#` wall, `=` path — `apps/amo/tools/maps/ascii_to_tiles.js`'s
   `DEFAULT_LEGEND`), then convert with `asciiToTiles()`.
2. **Populate `decorations`.** For each Point of Interest / notable prop
   the spec describes, add a `{ name, x, y, blocking?, depthOffset? }`
   entry (no `sheet` field — `decorations` always resolves against the
   base tileset's catalogue via `GameScene._placeCatalogueDecorations`; a
   separate `waterTiles` array exists for water-sheet items, used only if
   the map has water). `name` comes from the sprite catalogue
   (`apps/amo/public/assets/catalogued/tilesets/SampleMap/*.catalogue.json`)
   once it covers a sheet with the props this location needs.
3. **Populate `tileset`.** Set `floorFrame`/`pathFrame`/`streetFrame` to
   the raw Phaser frame indices matching the spec's terrain description
   (`row * gridCols + col` in the relevant catalogue.json — these are
   numeric frame indices, not catalogue-name lookups; the floor/path
   system and the named-decoration system are separate mechanisms).
4. **Populate `spawns`.** Enemies/wildlife/gathering-nodes/chests from the
   spec's enemy/treasure lists, using the existing `spawns` schema
   (`enemies`, `npcs`, `chests`, `campfires`, `signs`, `gatheringNodes`,
   `crackedBoulders`, `riftGates`, `pillarGates`, `boss`).
5. **Register the map** in `apps/amo/src/data/maps/index.js`.
6. **Wire portals** bidirectionally to neighboring maps, per the spec's
   geography and the campaign's progression order.
7. **Add/align quest data** in `apps/amo/src/data/quests.js`: new entries
   for this location's main/side quests, using real canon target ids
   (e.g. `malphas`, not a generic `void_general`) wherever the engine
   actually supports it — falling back to an existing generic engine
   event only where a real per-entity one doesn't exist yet (documented
   inline when that happens, not silently).
8. **Add any new reward items** referenced by new quests to
   `apps/amo/src/data/items.js`, reusing an existing `icon` key where
   thematically reasonable rather than requiring new icon art.
9. **Manually verify** via `npm run dev` — open `?testmap=<id>` (the
   direct-to-map test route in `BootScene.create()`), walk the map,
   confirm no unexpected console errors, confirm portals/quests trigger
   correctly.

## When sprites/neighboring maps aren't ready yet

Steps 2-3 and 6 can still be done with clearly-marked placeholders — a
decoration `name` prefixed `PLACEHOLDER_<description>` (resolves to a
harmless console warning + skip, not a crash, since `_placeCatalogueItems`
already handles unresolved names gracefully), a `floorFrame`/`pathFrame`
reusing an existing catalogued frame from the wrong biome (working, just
visually wrong, until the real terrain sheet exists), or a `targetMap` id
that doesn't exist yet (commented as such) — this proves the data *shape*
and the registration/portal mechanism are correct without blocking on
content that isn't ready. Steps 4, 7, and 8 (spawns, quests, items) have
no such dependency and should always be done for real, since they only
reference id strings, not sprites or built maps.
