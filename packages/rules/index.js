// @arcane/rules — the game rules both Arcane Majesty clients share.
//
// The modules still live in apps/amo/src (so 2D work on main merges cleanly); this file is
// the boundary: what is listed here is engine-free (no Phaser, no Three.js, no DOM at import
// time) and is what the 3D client — and later the server — may use. test_rules.mjs proves it
// by importing everything in plain Node.
//
// Each module is re-exported as a namespace: `import { movementRules } from '@rules'` →
// `movementRules.MOVE`, `movementRules.hopLanding(…)`.

// ---- character ----
export * as PlayerStats from '../../apps/amo/src/systems/PlayerStats.js';
export * as mastery from '../../apps/amo/src/systems/mastery.js';
export * as styles from '../../apps/amo/src/systems/styles.js';
export * as spellLearning from '../../apps/amo/src/systems/spellLearning.js';
export * as weapons from '../../apps/amo/src/systems/weapons.js';
export * as ammo from '../../apps/amo/src/systems/ammo.js';
export * as hotbar from '../../apps/amo/src/systems/hotbar.js';
export * as talents from '../../apps/amo/src/data/talents.js';
export * as upgrades from '../../apps/amo/src/data/upgrades.js';
export * as levelBands from '../../apps/amo/src/data/levelBands.js';
export * as characters from '../../apps/amo/src/data/characters.js';

// ---- movement ----
export * as movementRules from '../../apps/amo/src/systems/movementRules.js';

// ---- combat & magic ----
export * as StatusManager from '../../apps/amo/src/systems/StatusManager.js';
export * as statuses from '../../apps/amo/src/data/statuses.js';
export * as spells from '../../apps/amo/src/data/spells.js';
export * as styleData from '../../apps/amo/src/data/styles.js';
export * as enemyMagic from '../../apps/amo/src/data/enemyMagic.js';
export * as enemyAffinities from '../../apps/amo/src/data/enemyAffinities.js';
export * as elites from '../../apps/amo/src/data/elites.js';
export * as bestiary from '../../apps/amo/src/data/bestiary.js';
export * as enemies from '../../apps/amo/src/data/worldMap.js';            // ENEMY_TYPES (+ the 2D prologue map)
export * as targetInfo from '../../apps/amo/src/systems/targetInfo.js';
export * as reactions from '../../apps/amo/src/systems/reactions.js';

// ---- economy & crafting ----
export * as items from '../../apps/amo/src/data/items.js';
export * as economy from '../../apps/amo/src/data/economy.js';
export * as craftingRecipes from '../../apps/amo/src/data/craftingRecipes.js';
export * as recipeScrolls from '../../apps/amo/src/data/recipeScrolls.js';
export * as gathering from '../../apps/amo/src/data/gathering.js';
export * as stations from '../../apps/amo/src/data/stations.js';

// ---- quests, story, people ----
export * as QuestManager from '../../apps/amo/src/systems/QuestManager.js';
export * as CampaignManager from '../../apps/amo/src/systems/CampaignManager.js';
export * as quests from '../../apps/amo/src/data/quests.js';
export * as questRules from '../../apps/amo/src/data/questRules.js';
export * as bounties from '../../apps/amo/src/data/bounties.js';
export * as dialogues from '../../apps/amo/src/data/dialogues.js';
export * as npcs from '../../apps/amo/src/data/npcs.js';
export * as stories from '../../apps/amo/src/data/stories.js';
export * as barks from '../../apps/amo/src/systems/barks.js';

// ---- world ----
export * as gameClock from '../../apps/amo/src/systems/gameClock.js';
export * as weather from '../../apps/amo/src/data/weather.js';
export * as schedules from '../../apps/amo/src/systems/schedules.js';
export * as pathfind from '../../apps/amo/src/systems/pathfind.js';
export * as walkGrid from '../../apps/amo/src/systems/walkGrid.js';
export * as fog from '../../apps/amo/src/systems/fog.js';
export * as crowd from '../../apps/amo/src/systems/crowd.js';
export * as respawn from '../../apps/amo/src/systems/respawn.js';
export * as WorldState from '../../apps/amo/src/systems/WorldState.js';
export * as mapMarkers from '../../apps/amo/src/systems/mapMarkers.js';
export * as interiors from '../../apps/amo/src/systems/interiors.js';
export * as regionFormat from '../../apps/amo/src/systems/regionFormat.js';
export * as regionChunks from '../../apps/amo/src/systems/regionChunks.js';
export * as worldLayout from '../../apps/amo/src/systems/worldLayout.js';

// ---- places (pure data: amo's city layout, its people and their spots) ----
export * as thaloriaMap from '../../apps/amo/src/data/maps/regions/thaloria.js';
export * as thaloriaTown from '../../apps/amo/src/data/townsfolk/thaloria.js';
export * as townsfolk from '../../apps/amo/src/data/townsfolk/index.js';   // getTown('thaloria'): residents, places, routes

// ---- persistence ----
export * as SaveManager from '../../apps/amo/src/systems/SaveManager.js';
