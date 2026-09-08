// Sylvan Sanctuary — Song 5. Grants Aether Sight (formally completed here
// per data/lore/campaigns/eldorias_prophecy/sylvan_sanctuary.md). SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const SYLVAN_SANCTUARY = makeStubMap({
    id: 'sylvan_sanctuary',
    displayName: 'Sylvan Sanctuary',
    chapterTitle: 'Act II: Sylvan Sanctuary',
    signText: 'Sylvan Sanctuary\n\n[SCAFFOLDING] Song 5. The Elemental\'s trial of intent, not combat. The Hermit offers guidance here.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch05_sylvan_sanctuary_greeting' }],
    quests: ['stub_ch05_sylvan_sanctuary'],
    forwardPortal: {
        label: 'Down toward the Fire Gate',
        targetMap: 'fire_gate',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
