// Ruins of Eldoria — Song 9, "Eldoria's Heartbeat" (first arrival, Voraun's
// rune-dead gate), reused as Song 11's "The Weight of Eternity" (the
// Vorgos scene, on the return from the Heart of War). SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const RUINS_OF_ELDORIA = makeStubMap({
    id: 'ruins_of_eldoria',
    displayName: 'Ruins of Eldoria',
    chapterTitle: "Act III: Eldoria's Heartbeat",
    signText: 'Ruins of Eldoria\n\n[SCAFFOLDING] Song 9 — Eldoria\'s Heartbeat. Black-stone ruins, moonlit. Voraun\'s rune-dead gate.',
    // Two NPCs: chapter 9's arrival, and chapter 11's return — both
    // physically in this one room, since the location is genuinely
    // revisited. Placed apart so neither's talk zone overlaps the other's.
    npcs: [
        { x: 4, y: 4, dialogue: 'stub_ch09_eldorias_heartbeat_greeting' },
        { x: 9, y: 4, dialogue: 'stub_ch11_the_weight_of_eternity_greeting' },
    ],
    quests: ['stub_ch09_eldorias_heartbeat', 'stub_ch11_the_weight_of_eternity'],
    forwardPortal: {
        label: 'Toward the Heartstone Chamber',
        targetMap: 'heartstone_chamber',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});
