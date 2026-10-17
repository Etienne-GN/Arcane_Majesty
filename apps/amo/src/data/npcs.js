// NPCs that give quests or take turn-ins: the name the journal and the
// "Return to …" step use, and where to find them. A map NPC links here
// through its `id`. Pure — tools/test_phase4_quests.mjs.

export const NPCS = {
    hermit:  { name: 'the Hermit', place: "Hermit's Hut" },
    silvara: { name: 'Silvara',    place: 'Prologue Forest' },
    // Chapter 3 (Odyssey's Dawn). Oren is album canon (DB); the inn's people are unnamed roles.
    oren:            { name: 'Oren',       place: 'the East Road (the shepherd\'s lean-to)' },
    innkeeper:       { name: 'the Innkeeper', place: 'Thaloria (the inn)' },
    thaloria_trader: { name: 'the Trader',    place: 'Thaloria (outside the inn)' },
    thaloria_merchant: { name: 'the Merchant', place: 'Thaloria (the market yard)' },
};

export const npcName  = id => NPCS[id]?.name ?? String(id).replace(/_/g, ' ');
export const npcPlace = id => NPCS[id]?.place ?? null;
