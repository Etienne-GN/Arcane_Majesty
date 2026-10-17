# Mechanics Phase 5 — World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A saved game clock with day and night (E1) and per-map weather that changes with it (E2), both changing how fights, spawns and gathering play out.

**Architecture:** Two Phaser-free modules hold the rules: `src/systems/gameClock.js` (time, hour, day, night, ambient light, night damage, timed spawns) and `src/data/weather.js` (biome tables, the deterministic weather at a given game time, effect numbers). GameScene advances the clock, applies weather ticks and draws the night darkness with light holes; UIScene draws the HUD clock and the screen-space weather overlay. Weather is a pure function of (map, game minute) — nothing extra is saved.

**Tech Stack:** Phaser 3.90, plain ES modules, `node tools/test_*.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-30-mechanics-expansion-design.md` §Phase 5 (E2, E1).

## Global Constraints

- Commit directly on `main`, small commits, trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No new npm dependencies.
- Pure logic in Phaser-free modules, tested by `node tools/test_*.mjs`; every new test file is added to `npm test`.
- Old saves must keep loading: every new save field has a default.
- No new lore names (only weather and time words).
- Extend `tools/gen_game_inventory.mjs`; commit the regenerated `docs/manual/index.html` + `docs/game_inventory.md`.
- English in code, data and UI.

## Sequencing ruling

The spec orders E2 before E1, with E2 on real time "until E1 lands". Both land in this phase, so the clock is built first (Task 1) and weather keys off game hours from the start — no throwaway real-time interim.

## Review Focus

1. Indoor maps (Hermit's Hut, Echoes of Stone, Heartstone Chamber, dungeons) never rain, snow or go dark.
2. An old save with no clock loads at 08:00 on day 0; bounty boards keep working (they now key off the game day).
3. Day↔night while enemies are mid-fight: a night-only creature that is chasing the player is not yanked away; respawn timers for timed spawns don't spawn them at the wrong time.
4. Pausing (menus, dialogue) stops the clock and the weather ticks — no rain-wet or snow-cold applied behind a menu.
5. Weather multipliers apply to the player's spells once (not again on conducted arcs), and stack predictably with the wet status.

---

### Task 1: Game clock (E1 core)

**Files:** Create `src/systems/gameClock.js`, `tools/test_phase5_world.mjs`; modify `PlayerStats.js` (`gameMinutes = START_MINUTES`, reset), `SaveManager.js`, `package.json`, `src/scenes/BountyBoardScene`-caller in `GameScene._useBountyBoard` (day = `gameDay(stats)`).

**Produces:** `START_MINUTES = 480`, `MINUTES_PER_REAL_SECOND = 1` (one real minute = one game hour), `advanceClock(stats, ms)`, `gameHour(min)` (fractional 0–24), `gameDay(min)`, `clockLabel(min)` → `"Day 3 · 14:05"`, `isNight(min)` (20:00–05:59), `ambientAt(min)` → `{ color, alpha }` (0 by day, 0.55 deep night, linear dusk 18–20 and dawn 6–7), `nightDamageMult(type, min)` (1.2 for family `void` at night), `spawnActive(def, min)` (`time: 'day'|'night'`).
- [ ] RED/GREEN tests (incl. Review Focus 2), `npm test`, commit `feat(amo): game clock — a 24-minute day, saved, with night`.

### Task 2: Weather rules (E2 core)

**Files:** Create `src/data/weather.js`; add `biome` to map defs; tests.

**Produces:** `WEATHER` labels; `BIOME_WEATHER` (`temperate`/`forest`: clear 6, rain 3, storm 1; `snow`: clear 4, snow 5, storm 1; `arid`: clear 6, sandstorm 3; `indoor`: clear only), `mapBiome(mapDef)` (`mapDef.biome ?? 'temperate'`), `weatherTable(mapDef)` (`mapDef.weather` table or the biome's), `weatherAt(mapDef, minutes)` → `{ id, from, to }` — each game day is cut into 4–8 h segments seeded by (map id, day), deterministic; `isWet(id)` (rain, storm), `spellWeatherMult(id, element)` (rain/storm: fire 0.8, lightning 1.2), `SIGHT_MULT = { sandstorm: 0.6 }`, `RAIN_TICK_MS = 10000`, `SNOW_TICK_MS = 20000`, `WARM_RADIUS = 120`, `STORM = { minMs: 6000, maxMs: 12000, telegraphMs: 1200, radius: 40 }`, `stormStrikeDamage(band)` = 10 + 2·band.max.
- Biomes: forest — prologue_forest, northern_forest, big_forest, forestest, sylvan_sanctuary; snow — summit_of_despair, wintertest; arid — fire_gate; indoor — hermit_hut, echoes_of_stone, heartstone_chamber, the_descent, inferno_labyrinth, dungeontest, aetheric_vision, ancient_door; the rest temperate.
- [ ] RED/GREEN tests (determinism, segment lengths 4–8 h, indoor always clear, every map has a valid biome, Review Focus 1), commit `feat(amo): weather tables by biome — clear, rain, storm, snow, sandstorm`.

### Task 3: Weather in play

**Files:** GameScene (weather state from `weatherAt`, ticks, storm strikes, spell multiplier in `_hit` once per cast, `_sightMult`), Enemy (sight × `scene._sightMult`), statuses (`warming`: 60 s buff), Player `castWarmthAura` and `warming_draught` also apply `warming`, UIScene (weather overlay: rain/snow/sand particles + tint, a weather word under the clock).
- Rain/storm: every 10 s the player and live enemies become wet (15 s) and the player gains `stand_in_rain` resonance. Storm: every 6–12 s a telegraphed strike (ring for 1.2 s) near the player; then damage in 40 px to player and enemies, camera flash. Snow: every 20 s the player becomes cold unless within 120 px of a campfire / hearth or `warming`. Sandstorm: enemy sight ×0.6.
- Ticks run in `update` (stops while paused — Review Focus 4).
- [ ] Pure parts (`warming` status def, `isWarm(px, py, fires, warming)`) RED/GREEN; headless screenshots of rain, snow, sandstorm, a storm telegraph; `npm test`, `vite build`; commit `feat(amo): weather in play — rain soaks, storms strike, snow chills, sand blinds`.

### Task 4: Day and night in play

**Files:** GameScene (advance clock in `update`, darkness RenderTexture following the camera with radial light holes at the player, campfires and hearths; night damage; timed spawns + refresh on day/night change; gathering passes `night`), Enemy (`damage × nightDamageMult`), gathering (`nightOnly` entries; moonpetal is `nightOnly`), UIScene HUD clock, maps (a few `time: 'night'` shadow-sprite spawns in the prologue forest).
- At a day/night change: timed enemies that no longer belong despawn unless they are chasing/attacking (they leave once calm); missing timed ones spawn. Respawn of a timed def waits until its time.
- [ ] Pure parts (`rollHarvest(def, rng, { night })` filters `nightOnly`; `spawnActive`) RED/GREEN; headless screenshots at noon, dusk, midnight with lights; `npm test`, `vite build`; commit `feat(amo): day and night — darkness with firelight, night creatures, moonpetal blooms after dark`.

### Task 5: Manual

- [ ] Mechanics rows for clock, day/night, weather (per biome table), save row; regenerate; commit `docs(amo): manual covers the clock, day and night, and weather`.
