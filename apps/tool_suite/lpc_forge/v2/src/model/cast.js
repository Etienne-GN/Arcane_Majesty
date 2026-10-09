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

const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);

function layerErrors(layers, where) {
    if (!Array.isArray(layers)) return [`${where} must be an array`];
    const errs = [];
    layers.forEach((l, i) => {
        if (!isObj(l) || typeof l.slot !== 'string' || typeof l.id !== 'string' || typeof l.type !== 'string') {
            errs.push(`${where}[${i}] needs string slot, type and id`);
        }
    });
    return errs;
}

/**
 * Structural check of a cast file, independent of the catalogue — what the API
 * enforces before writing into the game's source tree.
 */
export function castShapeErrors(cast) {
    if (!isObj(cast)) return ['cast must be an object'];
    const errs = [];
    if (!CAST_ID_RE.test(cast.id ?? '')) errs.push(`bad id "${cast.id}"`);
    if (typeof cast.name !== 'string' || !cast.name.trim()) errs.push('name must be a non-empty string');
    if (!ROLES.includes(cast.role)) errs.push(`bad role "${cast.role}"`);
    if (typeof cast.published !== 'boolean') errs.push('published must be true or false');
    if (!isObj(cast.sel)) errs.push('sel must be an object');
    errs.push(...layerErrors(cast.layers, 'layers'));
    if (!isObj(cast.variants)) errs.push('variants must be an object');
    else for (const [vn, v] of Object.entries(cast.variants)) {
        if (!isObj(v) || !isObj(v.sel)) errs.push(`variants.${vn} needs a sel object`);
        else errs.push(...layerErrors(v.layers, `variants.${vn}.layers`));
    }
    if (cast.dbCharacter !== undefined && typeof cast.dbCharacter !== 'string') errs.push('dbCharacter must be a string');
    if (cast.migrationNotes !== undefined && !(Array.isArray(cast.migrationNotes) && cast.migrationNotes.every(n => typeof n === 'string'))) {
        errs.push('migrationNotes must be a list of strings');
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
