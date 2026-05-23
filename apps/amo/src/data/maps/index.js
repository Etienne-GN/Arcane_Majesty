import { PROLOGUE_FOREST } from './prologue_forest.js';
import { HERMIT_HUT }      from './hermit_hut.js';

const REGISTRY = {
    prologue_forest: PROLOGUE_FOREST,
    hermit_hut:      HERMIT_HUT,
};

export function getMap(id) {
    return REGISTRY[id] ?? REGISTRY['prologue_forest'];
}
