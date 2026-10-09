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

/** Stable id of one layer of a composition (a weapon's bg and fg layers differ by itemName). */
export function layerKeyOf(l) {
    return `${l.slot}:${l.id}#${l.itemName ?? ''}`;
}

/** Logical motions (DEFAULT_ANIMS order) a catalogue entry can play. */
export function motionsOf(entry) {
    if (!entry) return [];
    return DEFAULT_ANIMS.filter(m => resolveAnim(entry, m));
}

/** Layers that ship no file for `motion` (they vanish when the character plays it). */
export function missingIn(layers, motion) {
    return layers.filter(l => !resolveAnim(l, motion));
}
