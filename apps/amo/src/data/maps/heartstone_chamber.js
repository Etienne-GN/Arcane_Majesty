// Heartstone Chamber — Song 10, "Heart of War" (first of two maps). The
// Shadow Balrog encounter. SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const HEARTSTONE_CHAMBER = makeStubMap({
    id: 'heartstone_chamber',
    displayName: 'Heartstone Chamber',
    chapterTitle: 'Act III: Heart of War',
    signText: 'Heartstone Chamber\n\n[SCAFFOLDING] Song 10 — Heart of War. The Shadow Balrog: no HP bar, no kill — a survival/humility encounter.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch10_heart_of_war_greeting' }],
    quests: ['stub_ch10_heart_of_war'],
    forwardPortal: {
        label: 'Through to the Ancient Door',
        targetMap: 'ancient_door',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
