// NPCs that give quests or take turn-ins: the name the journal and the
// "Return to …" step use, and where to find them. A map NPC links here
// through its `id`. Pure — tools/test_phase4_quests.mjs.

export const NPCS = {
    hermit:  { name: 'the Hermit', place: "Hermit's Hut" },
    silvara: { name: 'Silvara',    place: 'Prologue Forest' },
};

export const npcName  = id => NPCS[id]?.name ?? String(id).replace(/_/g, ' ');
export const npcPlace = id => NPCS[id]?.place ?? null;
