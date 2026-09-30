import { PROLOGUE_FOREST } from './prologue_forest.js';
import { HERMIT_HUT }      from './hermit_hut.js';
import { ELDRIN_TOWER }    from './eldrin_tower.js';
import { NORTHERN_FOREST } from './northern_forest.js';
import { BIG_FOREST }      from './big_forest.js';
import { SAMPLEMAP }       from './samplemap.js';
import { SUMMIT_OF_DESPAIR } from './summit_of_despair.js';
import { ECHOES_OF_STONE }   from './echoes_of_stone.js';
import { AETHERIC_VISION }   from './aetheric_vision.js';
import { THALORIA }          from './thaloria.js';
import { EAST_ROAD }         from './east_road.js';
import { SYLVAN_SANCTUARY }  from './sylvan_sanctuary.js';
import { FIRE_GATE }         from './fire_gate.js';
import { THE_DESCENT }       from './the_descent.js';
import { INFERNO_LABYRINTH } from './inferno_labyrinth.js';
import { RUINS_OF_ELDORIA }  from './ruins_of_eldoria.js';
import { HEARTSTONE_CHAMBER } from './heartstone_chamber.js';
import { ANCIENT_DOOR }      from './ancient_door.js';
import { LPC_SHOWCASE }      from './lpc_showcase.js';
import { PIPOYA_SHOWCASE }   from './pipoya_showcase.js';
import { FORESTEST }         from './forestest.js';
import { WINTERTEST }        from './wintertest.js';
import { DUNGEONTEST }       from './dungeontest.js';

const REGISTRY = {
    prologue_forest:  PROLOGUE_FOREST,
    hermit_hut:       HERMIT_HUT,
    eldrin_tower:     ELDRIN_TOWER,
    northern_forest:  NORTHERN_FOREST,
    big_forest:       BIG_FOREST,
    samplemap:        SAMPLEMAP,
    summit_of_despair: SUMMIT_OF_DESPAIR,
    echoes_of_stone:  ECHOES_OF_STONE,
    aetheric_vision:    AETHERIC_VISION,
    thaloria:           THALORIA,
    east_road:          EAST_ROAD,
    sylvan_sanctuary:   SYLVAN_SANCTUARY,
    fire_gate:          FIRE_GATE,
    the_descent:        THE_DESCENT,
    inferno_labyrinth:  INFERNO_LABYRINTH,
    ruins_of_eldoria:   RUINS_OF_ELDORIA,
    heartstone_chamber: HEARTSTONE_CHAMBER,
    ancient_door:       ANCIENT_DOOR,
    lpc_showcase:       LPC_SHOWCASE,
    pipoya_showcase:    PIPOYA_SHOWCASE,
    forestest:          FORESTEST,
    wintertest:         WINTERTEST,
    dungeontest:        DUNGEONTEST,
};

export function getMap(id) {
    return REGISTRY[id] ?? REGISTRY['prologue_forest'];
}

// { id, displayName }[] for any UI that lets a player/tester pick a map
// directly (e.g. CharacterSelectScene's map picker).
export function listMaps() {
    return Object.entries(REGISTRY).map(([id, def]) => ({
        id,
        displayName: def.displayName ?? id,
    }));
}
