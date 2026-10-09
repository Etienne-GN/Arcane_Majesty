/**
 * Forge v2 composition model: which catalogue item (and colour/tint) sits in
 * each slot, and its translation into the game's LayerConfig list — the same
 * shape CharacterRenderer consumes, so what the Forge shows is what the game shows.
 *
 * Composition = { name, sel: { [slot]: { id, color?, tint? } } }
 * Items are stored by id (not catalogue index) so catalogue edits don't shift picks.
 */
import { SLOTS, renderType } from '../../../../../amo/src/systems/lpcLayout.js';
import { swapParamsFor } from '../../../../../amo/src/systems/lpcPalettes.js';
import { resolveAnim, DEFAULT_ANIMS } from '../../../../../amo/src/systems/animResolve.js';
import { resolveMotion } from '../../../../../amo/src/systems/motionRules.js';

const DEFAULT_HEAD = 'heads/human/male';

export function entryFor(catalogue, slot, id) {
    return catalogue[slot]?.find(e => e.id === id) ?? null;
}

/** A plain male body + human head; falls back to the first head if the catalogue lacks it. */
export function defaultComposition(catalogue) {
    const head = catalogue && !entryFor(catalogue, 'head', DEFAULT_HEAD)
        ? catalogue.head?.find(e => e.id)?.id
        : DEFAULT_HEAD;
    return { name: 'Untitled', sel: { body: { id: 'bodies/male' }, head: { id: head } } };
}

/** LayerConfig[] (main + companions per picked slot), z-sorted. Unknown ids are skipped. */
export function layersFor(catalogue, comp) {
    const out = [];
    for (const slot of SLOTS) {
        const pick = comp.sel[slot];
        if (!pick?.id) continue;
        const e = entryFor(catalogue, slot, pick.id);
        if (!e) continue;
        const type = e.renderType ?? renderType(slot);
        const color = e.colors?.length
            ? (e.colors.includes(pick.color) ? pick.color : e.colors[0])
            : undefined;
        const swap = swapParamsFor(slot, e, pick.tint ?? 0) ?? undefined;
        const mk = (src, isCompanion) => {
            const l = { slot, type, id: src.id, zPos: src.zPos ?? e.zPos ?? 0, anims: src.anims };
            if (src.itemName) l.itemName = src.itemName;
            const c = isCompanion ? (src.color ?? color) : color;
            if (c) l.color = c;
            if (swap) l.swapParams = swap;
            return l;
        };
        out.push(mk(e, false));
        for (const c of e.companions ?? []) out.push(mk(c, true));
    }
    return out.sort((a, b) => a.zPos - b.zPos);
}

/**
 * What each layer does when the character plays `motion` — exactly as the game
 * renderer decides (motionRules.resolveMotion): 'own' | 'fallback' (walk
 * frames) | 'borrow' (retimed) | 'hide', plus 'missing' when not even its walk
 * file exists. `hasFile(layer, concrete)` (optional) reports what the library
 * really has; the game falls back to walk when an expected file is absent.
 */
export function gapsIn(layers, motion, rules = {}, overrides, hasFile) {
    return layers.map(layer => {
        const key = layerKeyOf(layer);
        const res = resolveMotion(layer, motion, rules, overrides);
        if (res.mode === 'hide') return { layer, key, mode: 'hide', concrete: null, frames: null };
        if (hasFile && !hasFile(layer, res.concrete)) {
            const walk = resolveAnim(layer, 'walk') ?? 'walk';
            return hasFile(layer, walk)
                ? { layer, key, mode: 'fallback', concrete: walk, frames: null }
                : { layer, key, mode: 'missing', concrete: null, frames: null };
        }
        return { layer, key, ...res };
    });
}

/** Stable id of one layer of a composition (a weapon's bg and fg layers differ by itemName). */
export function layerKeyOf(l) {
    return `${l.slot}:${l.id}#${l.itemName ?? ''}`;
}

/** Logical motions (DEFAULT_ANIMS order) a catalogue entry can play. */
export function motionsOf(entry) {
    if (!entry) return [];
    return DEFAULT_ANIMS.filter(m => resolveAnim(entry, m));
}

/**
 * Layers that vanish when the character plays `motion`: no file in the manifest,
 * or (when `hasFile(layer, concrete)` is given) a file the library doesn't have.
 * Direction-independent: an empty direction row is by design, not a gap.
 */
export function missingIn(layers, motion, hasFile) {
    return layers.filter(l => {
        const c = resolveAnim(l, motion);
        return !c || (hasFile ? !hasFile(l, c) : false);
    });
}
