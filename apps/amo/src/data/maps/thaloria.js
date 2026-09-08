// Thaloria — Song 3, "Odyssey's Dawn" (city hub), reused as Song 11's
// "The Weight of Eternity" return-to-Thaloria beat. SCAFFOLDING.
import { makeStubMap, STUB_ENTRY_X, STUB_ENTRY_Y } from './_stubs.js';

export const THALORIA = makeStubMap({
    id: 'thaloria',
    displayName: 'Thaloria',
    chapterTitle: "Act I: Odyssey's Dawn",
    signText: 'Thaloria\n\n[SCAFFOLDING] Song 3 — Odyssey\'s Dawn. The city hub: forge, shop, inn. Also revisited at Song 11\'s return.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch03_odysseys_dawn_greeting' }],
    quests: ['stub_ch03_odysseys_dawn'],
    forwardPortal: {
        label: 'Out onto the East Road',
        targetMap: 'east_road',
        targetX: STUB_ENTRY_X,
        targetY: STUB_ENTRY_Y,
    },
});

// Chapter 11 ("The Weight of Eternity") reuses this same map as its own
// last stop before the finale — the factory only wires one forward portal
// per map, so this second one (thaloria -> eldrin_tower, chapter 11 -> 12)
// is added directly here, at a different door-wall tile than the factory's
// own east-wall gap (row 5) so the two don't collide.
THALORIA.tiles[6][13] = 0; // second gap in the east wall, one row below the first
THALORIA.portals.push({
    id: 'thaloria_to_eldrin_tower',
    x: 13, y: 6,
    label: "The road home, to Eldrin's Tower",
    targetMap: 'eldrin_tower',
    // Eldrin's Tower's own real playerStart — a full return, not a
    // scaffolding entry point, since chapter 12's own map is real.
    targetX: 24 * 32 + 16,
    targetY: 40 * 32 + 16,
});
