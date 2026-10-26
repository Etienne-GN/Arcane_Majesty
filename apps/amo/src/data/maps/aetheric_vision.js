// Aetheric Vision — Song 2, "Dreamweaver's Call". SCAFFOLDING — real content
// per data/lore/campaigns/eldorias_prophecy's own future spec for this
// location; see docs/superpowers/plans/2026-09-08-eldorias-prophecy-campaign-spine.md.
import { makeStubMap } from './_stubs.js';

export const AETHERIC_VISION = makeStubMap({
    id: 'aetheric_vision',
    biome: 'indoor',
    displayName: 'Aetheric Vision',
    chapterTitle: "Act I: Dreamweaver's Call",
    signText: 'Aetheric Vision\n\n[SCAFFOLDING] Song 2 — Dreamweaver\'s Call. Vorgos pulls Eldrin out of time to witness the Violet Sky.',
    npcs: [{ x: 5, y: 4, dialogue: 'stub_ch02_dreamweavers_call_greeting' }],
    quests: ['stub_ch02_dreamweavers_call'],
    forwardPortal: {
        label: 'The vision fades —',
        targetMap: 'thaloria',
        targetX: 9 * 32 + 16,      // inside Thaloria's West Gate (tools/maps/thaloria_layout.py WEST_ARRIVAL)
        targetY: 55 * 32 + 16,
    },
});
