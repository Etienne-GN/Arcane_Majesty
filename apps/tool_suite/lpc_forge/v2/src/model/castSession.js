/**
 * Editing a cast member in the forge, as pure transitions on a session object
 * `{ meta, comp, scratch }` (castState.ts wires it to the reactive store):
 * - `comp` is what's on screen; while a variant is open it holds the variant's
 *   sel and the base sel waits in meta.baseSel (and vice versa), so switching
 *   never loses edits;
 * - opening a member sets the scratch composition aside; closing brings it back;
 * - `meta.saved` fingerprints the last saved state, for the unsaved-changes check.
 */
import { buildCast, compositionOf, slugify } from './cast.js';
import { defaultComposition } from './composition.js';

const clone = x => JSON.parse(JSON.stringify(x));

/** Cast file comparison that ignores the save timestamp. */
export function fingerprint(cast) {
    return JSON.stringify({ ...cast, updatedAt: undefined });
}

function enter(st, meta, comp, catalogue) {
    if (!st.meta) st.scratch = clone(st.comp);
    st.meta = meta;
    st.comp = comp;
    meta.saved = meta.onDisk ? fingerprint(current(st, catalogue)) : null;
}

export function open(st, cast, catalogue) {
    enter(st, {
        id: cast.id, role: cast.role, dbCharacter: cast.dbCharacter ?? '', published: !!cast.published,
        variant: null, baseSel: clone(cast.sel ?? {}),
        variants: Object.fromEntries(Object.entries(cast.variants ?? {}).map(([n, v]) => [n, clone(v?.sel ?? {})])),
        migrationNotes: cast.migrationNotes, onDisk: true,
    }, compositionOf(cast), catalogue);
}

export function create(st, catalogue) {
    const comp = defaultComposition(catalogue);
    comp.name = 'New character';
    enter(st, { id: '', role: 'npc', dbCharacter: '', published: false, variant: null,
        baseSel: clone(comp.sel), variants: {}, onDisk: false }, comp, catalogue);
}

export function close(st) {
    st.meta = null;
    if (st.scratch) { st.comp = st.scratch; st.scratch = null; }
}

function stash(st) {
    const m = st.meta;
    if (m.variant) m.variants[m.variant] = clone(st.comp.sel);
    else m.baseSel = clone(st.comp.sel);
}

export function switchVariant(st, name) {
    const m = st.meta;
    if (!m || m.variant === name) return;
    stash(st);
    m.variant = name;
    st.comp.sel = clone(name ? m.variants[name] : m.baseSel);
}

/** New variant from what's on screen; false when the name is taken. */
export function addVariant(st, name) {
    const m = st.meta;
    const n = slugify(name);
    if (!m || m.variants[n]) return false;
    stash(st);
    m.variants[n] = clone(st.comp.sel);
    m.variant = n;
    return true;
}

export function removeVariant(st, name) {
    const m = st.meta;
    if (!m || !m.variants[name]) return;
    if (m.variant === name) switchVariant(st, null);
    delete m.variants[name];
}

/** The cast file for what's on screen. Pure (safe in computeds). */
export function current(st, catalogue) {
    const m = st.meta;
    const sel = m.variant ? m.baseSel : st.comp.sel;
    const variants = m.variant ? { ...m.variants, [m.variant]: st.comp.sel } : m.variants;
    return buildCast(catalogue, {
        id: m.onDisk ? m.id : (m.id || slugify(st.comp.name)),
        name: st.comp.name, role: m.role, dbCharacter: m.dbCharacter || undefined,
        sel: clone(sel), variants: clone(variants), published: m.published, migrationNotes: m.migrationNotes,
    });
}

export function markSaved(st, cast) {
    stash(st);
    st.meta.id = cast.id;
    st.meta.onDisk = true;
    st.meta.saved = fingerprint(cast);
}

export function isDirty(st, catalogue) {
    if (!st.meta) return false;
    return st.meta.saved === null || fingerprint(current(st, catalogue)) !== st.meta.saved;
}
