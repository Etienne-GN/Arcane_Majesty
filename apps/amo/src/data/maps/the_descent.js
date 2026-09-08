// The Descent — Song 7, "The Solitary Path". A survival gauntlet, cold to
// ash. SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const THE_DESCENT = makeStubMap({
    id: 'the_descent',
    displayName: 'The Descent',
    chapterTitle: 'Act II: The Solitary Path',
    signText: 'The Descent\n\n[SCAFFOLDING] Song 7 — The Solitary Path. The cold-to-ash transition into the upper Inferno Labyrinth.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch07_the_solitary_path_greeting' }],
    quests: ['stub_ch07_the_solitary_path'],
    forwardPortal: {
        label: 'Into the Inferno Labyrinth',
        targetMap: 'inferno_labyrinth',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
