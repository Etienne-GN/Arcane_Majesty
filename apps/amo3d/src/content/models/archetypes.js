// Role archetypes for the Forge. Each is a complete, normalized look: a quick starting point that
// the player can then change slot by slot. They deliberately reuse the same part library as the
// rest of the game, so there are no special-case role outfits.
import { normalizeLook } from './look.js';

const CLEAN = {
    torso: { id: 'peasant_shirt', colors: { primary: '#9c855f', collar: '#6a5538', trim: '#c4b896', shirt: '#9c855f' } },
    legs: { id: 'trousers', colors: { primary: '#3a3028', dark: '#241c16' } },
    feet: { id: 'shoes', colors: { primary: '#4a3020', dark: '#2a1a10' } },
    arms: { id: 'sleeves', colors: { primary: '#8a7452', trim: '#c4b896' } },
    shoulders: { id: 'none' },
    waist: { id: 'belt', colors: { primary: '#5a3520', trim: '#b89a5a', dark: '#3a2214' } },
    neck: { id: 'none' },
    headgear: { id: 'none' },
    cape: { id: 'none' },
    back: { id: 'none' },
    accessory: { id: 'none' },
    left: { id: 'none' },
    right: { id: 'none' },
};

const make = ({ body, face, hair, facialHair, parts }) => normalizeLook({
    body,
    face,
    hair,
    facialHair,
    parts: { ...CLEAN, ...parts },
});

const STEEL = { primary: '#8d99a6', trim: '#d4a84a', steel: '#b8c2cc' };
const RED = { primary: '#8f2630', collar: '#5e1720', trim: '#d0a44a', vest: '#241a16', shirt: '#1a1411', leather: '#4c2e1e', steel: '#9aa0a8' };
const BLUE = { primary: '#283a5e', collar: '#18233c', trim: '#c9b06a', vest: '#1c2028', shirt: '#d8d0c0', leather: '#3a2a1c', steel: '#9aa0a8' };
const GREEN = { primary: '#3d5136', collar: '#26331f', trim: '#b89a5a', vest: '#242018', shirt: '#cfc2a4', leather: '#4a3422', steel: '#9aa0a8' };
const NOBLE = { primary: '#4a2450', collar: '#2c1432', trim: '#e2c060', vest: '#1a101e', shirt: '#e8e0cc', leather: '#3a2418', steel: '#b8c2cc' };
const ROBE = { primary: '#35275a', collar: '#1e1638', trim: '#c9a84e', vest: '#1c1426', shirt: '#241c34', leather: '#3a2a20', steel: '#9aa0a8' };

export const ARCHETYPES = {
    soldier: {
        label: 'Soldier', name: 'Soldier', lore: 'A line soldier of the free companies, drilled and weary.',
        look: make({
            body: { preset: 'adult_male', skin: '#d4a27a' },
            hair: { style: 'short', color: '#3a2418' },
            facialHair: { style: 'stubble', color: '#3a2418' },
            parts: {
                torso: { id: 'armour', colors: STEEL },
                shoulders: { id: 'steel_pauldrons', colors: STEEL },
                arms: { id: 'bracers', colors: { primary: '#5a3520', trim: '#d4a84a', sleeve: '#8d99a6' } },
                headgear: { id: 'helmet', colors: { primary: '#9aa0a8', trim: '#6a7078' } },
                cape: { id: 'travelling_cloak', colors: { primary: '#6e1f26', trim: '#d0a44a' } },
                right: { id: 'sword', accent: '#c9d3e0' },
                left: { id: 'shield', accent: '#8f2630' },
            },
        }),
    },
    soldier_left: {
        label: 'Left-handed soldier', name: 'Left-handed soldier', lore: 'The same discipline, mirrored. The shield hand is not the sword hand.',
        look: make({
            body: { preset: 'adult_female', skin: '#c98f6a' },
            hair: { style: 'braids', color: '#5a3a22' },
            facialHair: { style: 'none', color: '#5a3a22' },
            parts: {
                torso: { id: 'armour', colors: STEEL },
                shoulders: { id: 'steel_pauldrons', colors: STEEL },
                arms: { id: 'bracers', colors: { primary: '#5a3520', trim: '#d4a84a', sleeve: '#8d99a6' } },
                headgear: { id: 'helmet', colors: { primary: '#9aa0a8', trim: '#6a7078' } },
                cape: { id: 'travelling_cloak', colors: { primary: '#283a5e', trim: '#c9b06a' } },
                left: { id: 'sword', accent: '#c9d3e0' },
                right: { id: 'shield', accent: '#283a5e' },
            },
        }),
    },
    guard: {
        label: 'Guard', name: 'Gate guard', lore: 'A town guard in borrowed steel, spear across the shoulder.',
        look: make({
            body: { preset: 'adult_male', skin: '#a8704a' },
            hair: { style: 'short', color: '#1a1410' },
            facialHair: { style: 'moustache', color: '#1a1410' },
            parts: {
                torso: { id: 'armour', colors: RED },
                shoulders: { id: 'pauldron', colors: { primary: '#3a2214', trim: '#d0a44a' } },
                legs: { id: 'trousers', colors: { primary: '#2a2420', dark: '#1a1614' } },
                feet: { id: 'boots', colors: { primary: '#4a2e1c', dark: '#2e1c10' } },
                headgear: { id: 'helmet', colors: { primary: '#7a808a', trim: '#5a6068' } },
                right: { id: 'spear', accent: '#c9d3e0' },
                left: { id: 'shield', accent: '#8f2630' },
            },
        }),
    },
    trader: {
        label: 'Trader', name: 'Road trader', lore: 'A merchant with a full satchel and an eye for the better road.',
        look: make({
            body: { preset: 'adult_female', skin: '#e2b48f' },
            hair: { style: 'ponytail', color: '#6a4528' },
            facialHair: { style: 'none', color: '#6a4528' },
            parts: {
                torso: { id: 'tunic', colors: GREEN },
                legs: { id: 'trousers', colors: { primary: '#3a3028', dark: '#241c16' } },
                feet: { id: 'shoes', colors: { primary: '#4a3020', dark: '#2a1a10' } },
                waist: { id: 'belt', colors: { primary: '#5a3520', trim: '#b89a5a', dark: '#3a2214' } },
                neck: { id: 'scarf', colors: { primary: '#7a2a2a', trim: '#c8a050' } },
                back: { id: 'satchel', colors: { primary: '#5a3520', dark: '#3e2416', trim: '#b89a5a' } },
                right: { id: 'dagger', accent: '#c9d3e0' },
            },
        }),
    },
    civilian: {
        label: 'Civilian', name: 'Townsperson', lore: 'A townsfolk face from the street, unarmoured and unarmed.',
        look: make({
            body: { preset: 'adult_female', skin: '#c98f6a' },
            hair: { style: 'long', color: '#3a2418' },
            facialHair: { style: 'none', color: '#3a2418' },
            parts: {
                torso: { id: 'linen', colors: { primary: '#d8ccb0', collar: '#c4b896', trim: '#c4b896', shirt: '#d8ccb0' } },
                legs: { id: 'linen_trousers', colors: { primary: '#cfc2a4', dark: '#9a8e74' } },
                feet: { id: 'shoes', colors: { primary: '#4a3020', dark: '#2a1a10' } },
                arms: { id: 'sleeves', colors: { primary: '#d8ccb0', trim: '#c4b896' } },
                waist: { id: 'belt', colors: { primary: '#5a3520', trim: '#b89a5a', dark: '#3a2214' } },
                neck: { id: 'none' },
            },
        }),
    },
    noble: {
        label: 'Noble', name: 'Noble', lore: 'Velvet, gold and a cloak that has never seen a road.',
        look: make({
            body: { preset: 'adult_female', skin: '#f1c9a5' },
            hair: { style: 'braids', color: '#d9b25a' },
            facialHair: { style: 'none', color: '#d9b25a' },
            parts: {
                torso: { id: 'longcoat', colors: NOBLE },
                legs: { id: 'trousers', colors: { primary: '#2a2030', dark: '#1a1420' } },
                feet: { id: 'boots', colors: { primary: '#3a2418', dark: '#241610' } },
                arms: { id: 'sleeves', colors: { primary: '#4a2450', trim: '#e2c060' } },
                waist: { id: 'sash', colors: { primary: '#4a2450', trim: '#e2c060' } },
                neck: { id: 'necklace', colors: { primary: '#e2c060', trim: '#7ff5e6' } },
                cape: { id: 'travelling_cloak', colors: { primary: '#3a1c40', trim: '#e2c060' } },
                accessory: { id: 'earrings', colors: { primary: '#e2c060', trim: '#7ff5e6' } },
            },
        }),
    },
    child: {
        label: 'Child', name: 'Child', lore: 'Small, quick, and always somewhere they were told not to be.',
        look: make({
            body: { preset: 'child', skin: '#e2b48f' },
            hair: { style: 'tousled', color: '#5a3a22' },
            facialHair: { style: 'none', color: '#5a3a22' },
            parts: {
                torso: { id: 'peasant_shirt', colors: { primary: '#b9a27a', collar: '#8a7654', trim: '#6a5a42', shirt: '#b9a27a' } },
                legs: { id: 'trousers', colors: { primary: '#4a3a2a', dark: '#2e2418' } },
                feet: { id: 'shoes', colors: { primary: '#4a3020', dark: '#2a1a10' } },
                arms: { id: 'sleeves', colors: { primary: '#b9a27a', trim: '#6a5a42' } },
                waist: { id: 'none' },
                back: { id: 'none' },
            },
        }),
    },
    mage: {
        label: 'Mage', name: 'Mage', lore: 'Robes, a travelling hat, and a staff that hums when the wind turns.',
        look: make({
            body: { preset: 'adult_male', skin: '#d4a27a' },
            hair: { style: 'long', color: '#8a8a8a' },
            facialHair: { style: 'beard', color: '#8a8a8a' },
            parts: {
                torso: { id: 'robe', colors: ROBE },
                legs: { id: 'trousers', colors: { primary: '#241c34', dark: '#18121f' } },
                feet: { id: 'boots', colors: { primary: '#3a2a20', dark: '#241810' } },
                arms: { id: 'sleeves', colors: { primary: '#35275a', trim: '#c9a84e' } },
                waist: { id: 'sash', colors: { primary: '#1e1638', trim: '#c9a84e' } },
                headgear: { id: 'wide_hat', colors: { primary: '#2a2350', trim: '#ffcf6a' } },
                cape: { id: 'travelling_cloak', colors: { primary: '#241a3a', trim: '#c9a84e' } },
                back: { id: 'satchel', colors: { primary: '#3a2a20', dark: '#241810', trim: '#b89a5a' } },
                right: { id: 'staff', accent: '#7ff5e6' },
            },
        }),
    },
    peasant: {
        label: 'Peasant', name: 'Fieldhand', lore: 'A fieldhand in rough linen, hands already scarred from the harvest.',
        look: make({
            body: { preset: 'adult_male', skin: '#a8704a' },
            hair: { style: 'short', color: '#3a2418' },
            facialHair: { style: 'moustache', color: '#3a2418' },
            parts: {
                torso: { id: 'peasant_shirt', colors: { primary: '#9c855f', collar: '#6a5538', trim: '#c4b896', shirt: '#9c855f' } },
                legs: { id: 'linen_trousers', colors: { primary: '#cfc2a4', dark: '#9a8e74' } },
                feet: { id: 'bare' },
                arms: { id: 'sleeves', colors: { primary: '#9c855f', trim: '#6a5538' } },
                waist: { id: 'belt', colors: { primary: '#5a3520', trim: '#b89a5a', dark: '#3a2214' } },
                back: { id: 'none' },
            },
        }),
    },
};

export const ARCHETYPE_ORDER = ['soldier', 'soldier_left', 'guard', 'trader', 'civilian', 'noble', 'child', 'mage', 'peasant'];
