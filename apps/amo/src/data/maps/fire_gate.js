// Fire Gate — Song 6, "Treachery's Bite". Oren's betrayal; he flees rather
// than falls. SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const FIRE_GATE = makeStubMap({
    id: 'fire_gate',
    displayName: 'Fire Gate',
    chapterTitle: "Act II: Treachery's Bite",
    signText: 'The Fire Gate\n\n[SCAFFOLDING] Song 6 — Treachery\'s Bite. The black-glass stair. Oren flees with the journal.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch06_treacherys_bite_greeting' }],
    quests: ['stub_ch06_treacherys_bite'],
    forwardPortal: {
        label: 'Down into the cold',
        targetMap: 'the_descent',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
