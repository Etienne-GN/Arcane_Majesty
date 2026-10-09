/**
 * Gap review matrix: every catalogue layer (companions are their own rows,
 * since rules apply per layer) × the 15 motions, each cell showing what the
 * layer does there — own art, walk fallback, borrowed, hidden.
 */
import { layersFor } from './composition.js';
import { DEFAULT_ANIMS } from '../../../../../amo/src/systems/animResolve.js';
import { resolveMotion, ruleKey } from '../../../../../amo/src/systems/motionRules.js';

/** One row per catalogue layer: { key, slot, id, itemName, label, layer }. */
export function matrixRows(catalogue) {
    const rows = [];
    for (const [slot, entries] of Object.entries(catalogue)) {
        for (const e of entries) {
            if (!e.id) continue;
            for (const layer of layersFor(catalogue, { name: '', sel: { [slot]: { id: e.id } } })) {
                rows.push({
                    key: ruleKey(layer), slot, id: layer.id, itemName: layer.itemName ?? '',
                    label: e.label + (layer.itemName && e.companions?.length ? ` · ${layer.itemName}` : ''),
                    entryId: e.id, layer,
                });
            }
        }
    }
    return rows;
}

export function cellMode(row, motion, rules, overrides) {
    return resolveMotion(row.layer, motion, rules, overrides).mode;
}

/** filters: { slot?, q?, onlyGaps?, keys? (Set of rule keys, e.g. worn by the cast) } */
export function filterRows(rows, filters, rules) {
    const q = filters.q?.trim().toLowerCase();
    return rows.filter(r =>
        (!filters.slot || r.slot === filters.slot) &&
        (!q || r.label.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)) &&
        (!filters.keys || filters.keys.has(r.key)) &&
        (!filters.onlyGaps || DEFAULT_ANIMS.some(m => cellMode(r, m, rules) !== 'own')));
}

/** A copy of `rules` with one cell set; rule null = back to the default fallback. */
export function setRule(rules, key, motion, rule) {
    const out = JSON.parse(JSON.stringify(rules ?? {}));
    if (rule) (out[key] ??= {})[motion] = rule;
    else if (out[key]) {
        delete out[key][motion];
        if (!Object.keys(out[key]).length) delete out[key];
    }
    return out;
}
