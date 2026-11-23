// The v2 character models (POC 2026-11-22), by the look's v2 key. References: docs/3d/characters/reference_v2.jpg,
// docs/3d/characters/base_mesh_reference.jpg
import { buildSeraphina } from './seraphina.js';
import { buildBase } from './base.js';
export const V2_MODELS = {
    seraphina: buildSeraphina,
    base_male: ctx => buildBase(ctx, { sex: 'male' }),
    base_female: ctx => buildBase(ctx, { sex: 'female' }),
};
