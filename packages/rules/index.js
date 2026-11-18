// @arcane/rules — the game rules both Arcane Majesty clients share.
//
// The modules live here, in packages/rules/src — copied out of the 2D game (apps/amo/src) when the 2D
// game was archived (2026-11-18); apps/amo is frozen and nothing here imports it any more. This file is
// the boundary: what is listed here is engine-free (no Phaser, no Three.js, no DOM at import
// time) and is what the 3D client — and later the server — may use. test_rules.mjs proves it
// by importing everything in plain Node.
//
// Each module is re-exported as a namespace: `import { movementRules } from '@rules'` →
// `movementRules.MOVE`, `movementRules.hopLanding(…)`.

// ---- character ----
export * as PlayerStats from './src/systems/PlayerStats.js';
export * as mastery from './src/systems/mastery.js';
export * as styles from './src/systems/styles.js';
export * as spellLearning from './src/systems/spellLearning.js';
export * as weapons from './src/systems/weapons.js';
export * as ammo from './src/systems/ammo.js';
export * as hotbar from './src/systems/hotbar.js';
export * as talents from './src/data/talents.js';
export * as upgrades from './src/data/upgrades.js';
export * as levelBands from './src/data/levelBands.js';
export * as characters from './src/data/characters.js';

// ---- movement ----
export * as movementRules from './src/systems/movementRules.js';

// ---- combat & magic ----
export * as StatusManager from './src/systems/StatusManager.js';
export * as statuses from './src/data/statuses.js';
export * as spells from './src/data/spells.js';
export * as styleData from './src/data/styles.js';
export * as enemyMagic from './src/data/enemyMagic.js';
export * as enemyAffinities from './src/data/enemyAffinities.js';
export * as elites from './src/data/elites.js';
export * as bestiary from './src/data/bestiary.js';
export * as enemies from './src/data/worldMap.js';            // ENEMY_TYPES (+ the 2D prologue map)
export * as targetInfo from './src/systems/targetInfo.js';
export * as reactions from './src/systems/reactions.js';

// ---- economy & crafting ----
export * as items from './src/data/items.js';
export * as economy from './src/data/economy.js';
export * as craftingRecipes from './src/data/craftingRecipes.js';
export * as recipeScrolls from './src/data/recipeScrolls.js';
export * as gathering from './src/data/gathering.js';
export * as stations from './src/data/stations.js';

// ---- quests, story, people ----
export * as QuestManager from './src/systems/QuestManager.js';
export * as CampaignManager from './src/systems/CampaignManager.js';
export * as quests from './src/data/quests.js';
export * as questRules from './src/data/questRules.js';
export * as bounties from './src/data/bounties.js';
export * as dialogues from './src/data/dialogues.js';
export * as npcs from './src/data/npcs.js';
export * as stories from './src/data/stories.js';
export * as barks from './src/systems/barks.js';

// ---- world ----
export * as gameClock from './src/systems/gameClock.js';
export * as weather from './src/data/weather.js';
export * as schedules from './src/systems/schedules.js';
export * as pathfind from './src/systems/pathfind.js';
export * as walkGrid from './src/systems/walkGrid.js';
export * as fog from './src/systems/fog.js';
export * as crowd from './src/systems/crowd.js';
export * as respawn from './src/systems/respawn.js';
export * as WorldState from './src/systems/WorldState.js';
export * as mapMarkers from './src/systems/mapMarkers.js';
export * as interiors from './src/systems/interiors.js';
export * as regionFormat from './src/systems/regionFormat.js';
export * as regionChunks from './src/systems/regionChunks.js';
export * as worldLayout from './src/systems/worldLayout.js';

// ---- places (pure data: amo's city layout, its people and their spots) ----
export * as thaloriaMap from './src/data/maps/regions/thaloria.js';
export * as eastRoadMap from './src/data/maps/regions/east_road.js';
export * as thaloriaTown from './src/data/townsfolk/thaloria.js';
export * as townsfolk from './src/data/townsfolk/index.js';   // getTown('thaloria'): residents, places, routes

// ---- persistence ----
export * as SaveManager from './src/systems/SaveManager.js';
