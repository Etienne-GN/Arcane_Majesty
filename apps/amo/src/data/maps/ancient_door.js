// Ancient Door — Song 10, "Heart of War" (second of two maps). SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const ANCIENT_DOOR = makeStubMap({
    id: 'ancient_door',
    displayName: 'The Ancient Door',
    chapterTitle: 'Act III: Heart of War',
    signText: 'The Ancient Door\n\n[SCAFFOLDING] Song 10 — Heart of War, continued. The door opens; the Balrog\'s payoff — no death, no taming, no banner.',
    npcs: [],
    quests: [],
    forwardPortal: {
        label: 'Back through the ruins',
        targetMap: 'ruins_of_eldoria',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
