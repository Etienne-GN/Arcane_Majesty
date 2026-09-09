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

// Chapter 11 ("The Weight of Eternity") needs a way back to Thaloria from
// here — the factory only wires one forward portal per map. Placed on the
// WEST wall (not a second gap on the same east wall the forward portal
// already uses) to keep the two trigger zones clearly separated — see the
// review finding about thaloria.js's own two east-wall portals sitting
// close enough that their proximity-trigger radii (TILE_SIZE*0.7) overlap.
RUINS_OF_ELDORIA.tiles[7][0] = 0; // west wall gap, row 7 — clear of the two NPCs (row 4) and the sign (row 1)
RUINS_OF_ELDORIA.portals.push({
    id: 'ruins_to_thaloria',
    x: 0, y: 7,
    label: 'The road to Thaloria',
    targetMap: 'thaloria',
    targetX: STUB_ENTRY_X,
    targetY: STUB_ENTRY_Y,
});
