export const STORIES = [
    {
        id:          'eldorias_prophecy',
        title:       "Eldoria's Prophecy",
        subtitle:    'Chapter I — The Epoch of Silence',
        description: "Vorgos activates Eldrin Nightshade to secure the Heart Stone of Creation — a contingency for a wound the world has not yet suffered.",
        mapId:       'prologue_forest',
        // All 5 playable characters selectable for testing (any character,
        // any map, via CharacterSelectScene's map picker) — not a canon
        // roster restriction, since this is currently the only story.
        characters:  ['eldrin', 'eldrin_forge', 'kael', 'anya', 'seraphina'],
        available:   true,
    },
    {
        available: false,
    },
];
