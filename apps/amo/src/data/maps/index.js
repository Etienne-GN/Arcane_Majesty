import { PROLOGUE_FOREST } from './prologue_forest.js';
import { HERMIT_HUT }      from './hermit_hut.js';
import { ELDRIN_TOWER }    from './eldrin_tower.js';
import { NORTHERN_FOREST } from './northern_forest.js';
import { BIG_FOREST }      from './big_forest.js';
import { SAMPLEMAP }       from './samplemap.js';
import { SUMMIT_OF_DESPAIR } from './summit_of_despair.js';

const REGISTRY = {
    prologue_forest:  PROLOGUE_FOREST,
    hermit_hut:       HERMIT_HUT,
    eldrin_tower:     ELDRIN_TOWER,
    northern_forest:  NORTHERN_FOREST,
    big_forest:       BIG_FOREST,
    samplemap:        SAMPLEMAP,
    summit_of_despair: SUMMIT_OF_DESPAIR,
};

export function getMap(id) {
    return REGISTRY[id] ?? REGISTRY['prologue_forest'];
}
