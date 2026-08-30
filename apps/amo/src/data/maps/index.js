import { PROLOGUE_FOREST } from './prologue_forest.js';
import { HERMIT_HUT }      from './hermit_hut.js';
import { ELDRIN_TOWER }    from './eldrin_tower.js';
import { NORTHERN_FOREST } from './northern_forest.js';
import { BIG_FOREST }      from './big_forest.js';
import { SAMPLEMAP }       from './samplemap.js';
import { SUMMIT_OF_DESPAIR } from './summit_of_despair.js';
import { ECHOES_OF_STONE }   from './echoes_of_stone.js';

const REGISTRY = {
    prologue_forest:  PROLOGUE_FOREST,
    hermit_hut:       HERMIT_HUT,
    eldrin_tower:     ELDRIN_TOWER,
    northern_forest:  NORTHERN_FOREST,
    big_forest:       BIG_FOREST,
    samplemap:        SAMPLEMAP,
    summit_of_despair: SUMMIT_OF_DESPAIR,
    echoes_of_stone:  ECHOES_OF_STONE,
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
