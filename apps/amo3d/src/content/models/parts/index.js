// The part catalog: one list per slot. The Forge and createCharacter both read this.
import { TORSO } from './torso.js';
import { LEGS } from './legs.js';
import { FEET } from './feet.js';
import { ARMS } from './arms.js';
import { SHOULDERS } from './shoulders.js';
import { WAIST } from './waist.js';
import { NECK } from './neck.js';
import { HEADGEAR } from './headgear.js';
import { CAPE } from './cape.js';
import { BACK } from './back.js';
import { ACCESSORY } from './accessory.js';

export const PART_CATALOG = {
    torso: TORSO,
    legs: LEGS,
    feet: FEET,
    arms: ARMS,
    shoulders: SHOULDERS,
    waist: WAIST,
    neck: NECK,
    headgear: HEADGEAR,
    cape: CAPE,
    back: BACK,
    accessory: ACCESSORY,
};

export function partDef(slot, id) {
    return PART_CATALOG[slot]?.find(p => p.id === id) ?? null;
}

export const COVERING_HEADGEAR = new Set(['hood', 'helmet']);
