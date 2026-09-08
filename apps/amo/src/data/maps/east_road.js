// East Road — Song 3, "Odyssey's Dawn" (wilderness half). SCAFFOLDING.
import { makeStubMap } from './_stubs.js';

export const EAST_ROAD = makeStubMap({
    id: 'east_road',
    displayName: 'East Road',
    chapterTitle: "Act I: Odyssey's Dawn",
    signText: 'The East Road\n\n[SCAFFOLDING] Song 3 — Odyssey\'s Dawn, wilderness half. The road climbs toward the Summit.',
    npcs: [],
    quests: [],
    forwardPortal: {
        label: 'The climb to the Summit of Despair',
        targetMap: 'summit_of_despair',
        // summit_of_despair's own real playerStart.
        targetX: 8 * 32 + 16,
        targetY: 18 * 32 + 16,
    },
});
