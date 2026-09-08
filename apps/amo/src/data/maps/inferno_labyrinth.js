// Inferno Labyrinth — Song 8, "Inferno's Trial". Xarathos, the Pyre-Lord.
// SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const INFERNO_LABYRINTH = makeStubMap({
    id: 'inferno_labyrinth',
    displayName: 'Inferno Labyrinth',
    chapterTitle: "Act II: Inferno's Trial",
    signText: 'Inferno Labyrinth\n\n[SCAFFOLDING] Song 8 — Inferno\'s Trial. Xarathos, the Pyre-Lord — floor-is-lava, mana-steal Super-Nova.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch08_infernos_trial_greeting' }],
    quests: ['stub_ch08_infernos_trial'],
    forwardPortal: {
        label: 'Out to the Ruins of Eldoria',
        targetMap: 'ruins_of_eldoria',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
