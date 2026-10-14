/**
 * Randomize a composition (pure): locked slots stay, body and head are always
 * filled, items fit the body (by the body-type tokens in their ids), body /
 * head / ears / nose share one skin tint, replaced (hidden) items are never picked.
 */

// Body-type tokens found in item ids, as a path segment or its prefix ("male_gaunt").
const TOKENS = new Set(['male', 'female', 'teen', 'child', 'muscular', 'pregnant', 'thin', 'adult', 'universal', 'elderly']);

// What each body can wear. Teens take adult heads (ULPC teen bodies have none of their own).
const FITS = {
    male: ['male', 'adult', 'universal', 'elderly'],
    muscular: ['muscular', 'male', 'adult', 'universal', 'elderly'],
    female: ['female', 'thin', 'adult', 'universal', 'elderly'],
    pregnant: ['pregnant', 'female', 'thin', 'adult', 'universal'],
    teen: ['teen', 'thin', 'adult', 'universal'],
    child: ['child', 'universal'],
};
const HEAD_EXTRA = { teen: ['male', 'female'] };

/** Always worn; then optional slots with their chance of being worn. Anything else is cleared. */
export const REQUIRED_SLOTS = ['body', 'head', 'eyes', 'torso_clothes', 'legs'];
export const OPTIONAL_SLOTS = {
    hair: 0.9, feet: 0.9, beards: 0.25, hat: 0.35, torso_jacket: 0.25, torso_waist: 0.2, neck: 0.2,
    cape: 0.2, weapon: 0.5, shield: 0.15, backpack: 0.1, arms: 0.15, shoulders: 0.15,
};
const SKIN_SLOTS = ['body', 'head', 'ears', 'nose'];

/** The body-type a body id dresses as (null = unknown, wears anything). */
export function bodyToken(bodyId) {
    const last = String(bodyId ?? '').split('/').pop();
    if (FITS[last]) return last;
    if (['skeleton', 'zombie', 'orc'].includes(last)) return 'male';
    return null;
}

function tokensOf(id) {
    const out = new Set();
    for (const seg of String(id).split('/')) {
        if (TOKENS.has(seg)) out.add(seg);
        else if (TOKENS.has(seg.split('_')[0])) out.add(seg.split('_')[0]);
    }
    return out;
}

/** Can a body of type `token` wear item `id` (in `slot`)? Ids without a body-type token fit everyone. */
export function compatible(id, token, slot) {
    if (!token) return true;
    const t = tokensOf(id);
    if (!t.size) return true;
    const fits = new Set([...FITS[token], ...(slot === 'head' ? HEAD_EXTRA[token] ?? [] : [])]);
    return [...t].some(x => fits.has(x));
}

const pickOne = (list, rng) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

function candidates(catalogue, slot, token) {
    return (catalogue[slot] ?? []).filter(e => e.id && !e.hidden && compatible(e.id, token, slot));
}

/** A pick for an entry: a listed file colour, or a tint index for tinted items. */
function dress(entry, rng, tintCount, slot) {
    const p = { id: entry.id };
    if (entry.colors?.length) p.color = pickOne(entry.colors, rng);
    else {
        const n = tintCount(slot, entry);
        if (n > 1) p.tint = Math.floor(rng() * n);
    }
    return p;
}

/**
 * New composition: locked slots copied as they are, the rest re-rolled.
 * opts: { locked: Set<slot>, rng = Math.random, tintCount(slot, entry) → number of tints }.
 */
export function randomize(catalogue, comp, { locked = new Set(), rng = Math.random, tintCount = () => 0 } = {}) {
    const sel = {};
    for (const s of locked) if (comp.sel[s]) sel[s] = JSON.parse(JSON.stringify(comp.sel[s]));

    if (!locked.has('body')) {
        const bodies = candidates(catalogue, 'body', null).filter(e => bodyToken(e.id));
        sel.body = dress(pickOne(bodies, rng), rng, tintCount, 'body');
    }
    const token = bodyToken(sel.body?.id);

    // Head: same family as before when possible (a human stays human), always present.
    if (!locked.has('head') || !sel.head) {
        const heads = candidates(catalogue, 'head', token);
        const family = String(comp.sel.head?.id ?? 'heads/human').split('/')[1];
        const same = heads.filter(e => e.id.split('/')[1] === family);
        const pool = same.length ? same : heads;
        if (pool.length) sel.head = { id: pickOne(pool, rng).id };
    }

    for (const slot of [...REQUIRED_SLOTS.slice(2), ...Object.keys(OPTIONAL_SLOTS)]) {
        if (locked.has(slot)) continue;
        const chance = OPTIONAL_SLOTS[slot] ?? 1;
        if (rng() >= chance) continue;
        const pool = candidates(catalogue, slot, token);
        if (pool.length) sel[slot] = dress(pickOne(pool, rng), rng, tintCount, slot);
    }

    // One skin tone: from a locked skin slot if any, else the body's roll.
    const skinFrom = SKIN_SLOTS.find(s => locked.has(s) && sel[s]?.tint != null) ?? 'body';
    const skin = sel[skinFrom]?.tint;
    for (const s of SKIN_SLOTS) {
        if (!sel[s] || locked.has(s)) continue;
        if (skin == null) delete sel[s].tint; else sel[s].tint = skin;
    }
    return { ...comp, sel };
}
