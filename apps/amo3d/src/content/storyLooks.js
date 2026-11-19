// The story's people, by look (models/character.js): used where they appear (chapters.js, eastRoad.js, sanctuary.js)
// and listed in the Forge's cast (content/castList.js) so each can be opened and noted.
import { normalizeLook } from './models/look.js';

export const LOOKS = {
    oren: normalizeLook({ body: { preset: 'adult_male', skin: '#d8b08a' }, hair: { style: 'short', color: '#6a5a4a' }, facialHair: { style: 'beard', color: '#6a5a4a' },
        parts: { torso: { id: 'tunic', colors: { primary: '#5a4a38', collar: '#3a2e22', trim: '#a89070' } }, legs: { id: 'trousers', colors: { primary: '#3a3028' } }, feet: { id: 'boots', colors: { primary: '#4a3424', dark: '#2a1e14' } },
            arms: { id: 'sleeves' }, shoulders: { id: 'none' }, headgear: { id: 'none' }, cape: { id: 'travelling_cloak', colors: { primary: '#4a4a3a', trim: '#8a7a5a' } }, back: { id: 'satchel' }, right: { id: 'dagger', accent: '#8a5aff' }, left: { id: 'none' } } }),
    xarathos: normalizeLook({ body: { preset: 'adult_male', race: 'fallen_aurorian', skin: '#a89c94', height: 1.1 }, face: { eyes: '#ff6a30' }, hair: { style: 'long', color: '#2a2420' }, facialHair: { style: 'none' },
        parts: { torso: { id: 'robe', colors: { primary: '#5a1a12', collar: '#2a0a08', trim: '#ff8a30' } }, legs: { id: 'trousers', colors: { primary: '#1a1010' } }, feet: { id: 'boots', colors: { primary: '#1a1010', dark: '#0a0606' } },
            arms: { id: 'sleeves' }, shoulders: { id: 'steel_pauldrons', colors: { primary: '#2a1a1a', trim: '#ff7a20' } }, headgear: { id: 'crown', colors: { primary: '#ff9a30', trim: '#ff3a10' } }, right: { id: 'staff', accent: '#ff6a20' }, left: { id: 'none' } } }),
    voraun: normalizeLook({ body: { preset: 'adult_male', skin: '#8a8490', height: 1.08 }, face: { eyes: '#d8d8e0' }, hair: { style: 'short', color: '#1a1a1e' }, facialHair: { style: 'none' },
        parts: { torso: { id: 'plate_cuirass', colors: { primary: '#1a1a1e', steel: '#4a4a52', trim: '#6a6a74' } }, legs: { id: 'trousers', colors: { primary: '#141418' } }, feet: { id: 'sabatons', colors: { primary: '#3a3a42' } },
            arms: { id: 'gauntlets', colors: { primary: '#3a3a42', sleeve: '#2a2a30' } }, shoulders: { id: 'steel_pauldrons', colors: { primary: '#3a3a42', trim: '#5a5a64' } }, headgear: { id: 'hood', colors: { primary: '#121216' } }, cape: { id: 'travelling_cloak', colors: { primary: '#101014', trim: '#3a3a42' } }, right: { id: 'sword', accent: '#5a3a8a' }, left: { id: 'none' } } }),
    balrog: normalizeLook({ body: { preset: 'adult_male', race: 'fallen_aurorian', skin: '#16121c', width: 1.25 }, face: { eyes: '#ff5a20' }, hair: { style: 'none', color: '#000000' }, facialHair: { style: 'none' },
        parts: { torso: { id: 'armour', colors: { primary: '#0e0c12', steel: '#1e1a24', trim: '#ff5a20' } }, legs: { id: 'trousers', colors: { primary: '#0e0c12' } }, feet: { id: 'bare' }, arms: { id: 'bare' },
            shoulders: { id: 'steel_pauldrons', colors: { primary: '#1e1a24', trim: '#ff5a20' } }, headgear: { id: 'great_helm', colors: { primary: '#1a1620', trim: '#ff5a20' } }, cape: { id: 'travelling_cloak', colors: { primary: '#08060a', trim: '#2a1a1a' } }, right: { id: 'sword', accent: '#ff5a20' }, left: { id: 'none' } } }),
    vorgos: normalizeLook({ body: { preset: 'elder', skin: '#b8b8c0', height: 1.12 }, face: { eyes: '#e8f0ff' }, hair: { style: 'long', color: '#c8c8d0' }, facialHair: { style: 'beard', color: '#c8c8d0' },
        parts: { torso: { id: 'robe', colors: { primary: '#6a6a74', collar: '#4a4a54', trim: '#c8d0e0' } }, headgear: { id: 'hood', colors: { primary: '#5a5a64' } }, right: { id: 'staff', accent: '#c8e0ff' }, left: { id: 'none' }, feet: { id: 'bare' } } }),
};

// Oren at the shepherd's lean-to on the East Road (staff in hand there).
export const OREN_ROAD = { skin: '#d8b090', eyes: '#6a5a3a', hair: { style: 'short', color: '#7a6a5a' }, facialHair: { style: 'beard', color: '#8a7a6a' },
            outfit: { style: 'longcoat', coat: '#6a5a3a', collar: '#3a2a1a', trim: '#a88a5a', vest: '#4a3a2a', shirt: '#d8d0c0', pants: '#3a3430', leather: '#5a3a22', leatherDark: '#3a2618' }, cape: true };

// The Hermit of the Sylvan Sanctuary.
export const HERMIT = { skin: '#7a5a3e', eyes: '#5aa8b0', hair: { style: 'long', color: '#c8c4b8' }, facialHair: { style: 'beard', color: '#c8c4b8' },
        outfit: { style: 'robe', coat: '#4a6a3a', collar: '#2e4a26', trim: '#8a7a4a', vest: '#3a4a2a', shirt: '#b8b0a0', pants: '#3a3a30', leather: '#5a3a22', leatherDark: '#3a2618' } };
