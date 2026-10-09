/**
 * Cast members: named characters saved as game data (apps/amo/src/data/cast).
 * A cast file keeps the editable composition (`sel`) and the game layer list
 * generated from it (`layers`); the game reads only `layers`, so catalogue edits
 * never silently change a published character.
 */
import { layersFor, missingIn, entryFor } from './composition.js';
import { DEFAULT_ANIMS } from '../../../../../amo/src/systems/animResolve.js';

export const ROLES = ['player-preset', 'story', 'npc', 'enemy'];
export const CAST_ID_RE = /^[a-z0-9][a-z0-9_]{0,47}$/;

export function slugify(name) {
    const s = String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
    return s || 'unnamed';
}

/** Cast file from editable metadata; `layers` (and each variant's) generated from `sel`. */
export function buildCast(catalogue, m) {
    const comp = sel => ({ name: m.name, sel });
    const variants = {};
    for (const [vn, vsel] of Object.entries(m.variants ?? {})) {
        variants[vn] = { sel: vsel, layers: layersFor(catalogue, comp(vsel)) };
    }
    const cast = {
        id: m.id ?? slugify(m.name), name: m.name, role: m.role ?? 'npc',
        sel: m.sel, layers: layersFor(catalogue, comp(m.sel)), variants,
        published: !!m.published, updatedAt: new Date().toISOString(),
    };
    if (m.dbCharacter) cast.dbCharacter = m.dbCharacter;
    if (m.migrationNotes?.length) cast.migrationNotes = m.migrationNotes;
    return cast;
}

/** The composition to edit for a cast member (a copy), base or a named variant. */
export function compositionOf(cast, variant) {
    const sel = variant ? cast.variants?.[variant]?.sel : cast.sel;
    return { name: cast.name, sel: JSON.parse(JSON.stringify(sel ?? cast.sel ?? {})) };
}

/** Problems that make a cast file unsafe to publish (empty = valid). */
export function validateCast(catalogue, cast) {
    const errs = [];
    if (!CAST_ID_RE.test(cast.id ?? '')) errs.push(`bad id "${cast.id}"`);
    if (!ROLES.includes(cast.role)) errs.push(`bad role "${cast.role}"`);
    const checkSel = (sel, where) => {
        for (const [slot, p] of Object.entries(sel ?? {})) {
            if (p?.id && !entryFor(catalogue, slot, p.id)) errs.push(`${where}${slot}: unknown item ${p.id}`);
        }
    };
    checkSel(cast.sel, '');
    for (const [vn, v] of Object.entries(cast.variants ?? {})) checkSel(v.sel, `${vn}/`);
    if (JSON.stringify(layersFor(catalogue, { name: cast.name, sel: cast.sel ?? {} })) !== JSON.stringify(cast.layers)) {
        errs.push('layers are stale');
    }
    return errs;
}

/** How many of the 15 motions play with no layer vanishing, and which layers vanish where. */
export function coverage(layers) {
    const gaps = {};
    let clean = 0;
    for (const m of DEFAULT_ANIMS) {
        gaps[m] = missingIn(layers, m).map(l => `${l.slot}:${l.id}`);
        if (!gaps[m].length) clean++;
    }
    return { clean, total: DEFAULT_ANIMS.length, gaps };
}
