// The v2 character models (POC 2026-11-22), by the look's v2 key. References: docs/3d/characters/reference_v2.jpg,
// docs/3d/characters/base_mesh_reference.jpg
import { buildSeraphina } from './seraphina.js';
import { buildSeraphinaRebel } from './seraphina_rebel.js';
import { buildBase } from './base.js';
import { buildEldrin } from './eldrin.js';
import { DRESSES } from './dress.js';
import { buildBodyV3 } from '../v3/body.js';
export const V2_MODELS = {
    seraphina: buildSeraphina,   // (the Queen of Carnage — the 11-22 proof of concept)
    seraphina_rebel: buildSeraphinaRebel,   // (Seraphina's variants: one model each)
    eldrin: buildEldrin,
    // (the base bodies, undressed — or in one of the Sculptor's basic outfits: look.sculpt.dress, dress.js)
    base_male: ctx => buildBase(ctx, { sex: 'male', outfit: DRESSES[ctx.look?.sculpt?.dress] ?? null }),
    base_female: ctx => buildBase(ctx, { sex: 'female', outfit: DRESSES[ctx.look?.sculpt?.dress] ?? null }),
    // model v3 (2026-11-27): the hand-placed low-poly bodies after the sheet (models/v3/body.js)
    base_male_v3: ctx => buildBodyV3(ctx, { sex: 'male' }),
};
