import type { Collection } from './api';

export interface CollectionNode extends Collection {
    depth: number;
}

/**
 * Flattens the collection list into tree (pre-order) display order: each
 * root immediately followed by its descendants, depth-annotated for
 * indentation. Shared by the sidebar tree, the add-collection parent
 * picker, and the sprite-detail collection picker, so all three read the
 * hierarchy the same way.
 *
 * A collection whose parentId doesn't resolve to another collection (a
 * dangling reference, or simply null) is treated as a root — that's the
 * safe fallback, not a silently-dropped row.
 */
export function flattenTree(collections: Collection[]): CollectionNode[] {
    const byParent = new Map<string | null, Collection[]>();
    const ids = new Set(collections.map(c => c.id));
    for (const c of collections) {
        const parent = c.parentId && ids.has(c.parentId) ? c.parentId : null;
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent)!.push(c);
    }

    const out: CollectionNode[] = [];
    function visit(parent: string | null, depth: number) {
        for (const c of byParent.get(parent) ?? []) {
            out.push({ ...c, depth });
            visit(c.id, depth + 1);
        }
    }
    visit(null, 0);
    return out;
}

/** `id` plus every collection nested under it, however deep — the set a
 * parent's view/count rolls up over. Always includes `id` itself, even if
 * `id` isn't a real collection (returns just `{id}` in that case). */
export function descendantIds(collections: Collection[], id: string): Set<string> {
    const byParent = new Map<string, string[]>();
    for (const c of collections) {
        if (!c.parentId) continue;
        if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
        byParent.get(c.parentId)!.push(c.id);
    }
    const out = new Set<string>([id]);
    const stack = [id];
    while (stack.length) {
        const cur = stack.pop()!;
        for (const child of byParent.get(cur) ?? []) {
            if (!out.has(child)) { out.add(child); stack.push(child); }
        }
    }
    return out;
}
