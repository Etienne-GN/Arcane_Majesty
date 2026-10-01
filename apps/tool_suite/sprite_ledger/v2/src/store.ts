// The whole app's state and every action, in one place. Components read from
// here and call actions; nothing talks to the API directly except this file
// (and the flag composer through addFlag). Writes are applied locally first
// (so the UI answers instantly), sent to the server, and offer Undo.
import { ref, shallowRef, triggerRef, reactive, computed, watch } from 'vue';
import type { Sheet, SpriteEntry, Collection, Flag, HitBox, Layer, LicenseStatus, SpriteMetaRecord, PhysicsReview } from '@shared/api';
import { fetchSheets, fetchMeta, fetchFlags, addFlag as apiAddFlag, addCollection as apiAddCollection } from '@shared/api';
import { descendantIds, flattenTree } from '@shared/collectionTree';
import { flagsBatch, metaBatch, physicsBatch, type FlagUpdate, type MetaUpdate } from './api2';

export type Key = string;
export interface Item { key: Key; sheet: Sheet; entry: SpriteEntry; box: Box }
export interface Box { x: number; y: number; w: number; h: number }
export type InboxId = 'review' | 'question' | 'open' | 'hitbox' | 'zones' | 'stale';
export type Scope =
    | { kind: 'inbox'; id: InboxId }
    | { kind: 'library'; id: string } // 'all' or a collection id
    | { kind: 'sheet'; id: string };
export type StatusFilter = '' | 'flagged' | 'open' | 'needs_review' | 'question';
export type HitboxFilter = '' | 'unset' | 'proposed' | 'approved' | 'no_hitbox';
export type LicenseFilter = '' | 'ok' | 'unlicensed' | 'unmarked';

export const INBOX: Record<InboxId, { label: string; color: string; hint: string }> = {
    review: { label: 'To review', color: 'review', hint: 'Claude fixed these; approve or send back' },
    question: { label: 'Questions', color: 'question', hint: 'Claude needs an answer from you' },
    hitbox: { label: 'Hitboxes', color: 'hitbox', hint: "Claude's hitbox/layer guesses to check" },
    open: { label: 'Open for Claude', color: 'open', hint: 'Flags waiting for Claude to act on' },
    zones: { label: 'Zone flags', color: 'open', hint: 'Areas of a sheet you flagged (badly cropped or missing items)' },
    stale: { label: 'Stale flags', color: 'muted', hint: 'Flags on sprites that no longer exist' },
};

export const keyOf = (sheet: string, name: string): Key => `${sheet}::${name}`;
export function splitKey(key: Key): [string, string] {
    const i = key.indexOf('::');
    return [key.slice(0, i), key.slice(i + 2)];
}

export function boxOf(sheet: Sheet, e: SpriteEntry): Box {
    if (e.kind === 'object') return { x: e.x!, y: e.y!, w: e.w!, h: e.h! };
    const tw = sheet.gridTileWidth!, th = sheet.gridTileHeight!;
    return { x: e.col! * tw, y: e.row! * th, w: tw, h: th };
}
/** What a thumbnail shows: frame 1 for animations (the full box is the whole strip). */
export function thumbBoxOf(item: Item): Box {
    return item.entry.frames?.length ? item.entry.frames[0] : item.box;
}

// ---------------------------------------------------------------- data
export const sheets = shallowRef<Sheet[]>([]);
export const collections = ref<Collection[]>([]);
export const meta = shallowRef<Record<string, SpriteMetaRecord>>({});
export const flags = ref<Flag[]>([]);
export const loading = ref(true);
export const loadError = ref<string | null>(null);
let lastLoad = 0;

export async function load() {
    loading.value = true;
    try {
        const [s, m, f] = await Promise.all([fetchSheets(), fetchMeta(), fetchFlags()]);
        sheets.value = s;
        collections.value = m.collections;
        meta.value = m.spriteMeta;
        flags.value = f;
        loadError.value = null;
        lastLoad = Date.now();
    } catch (e) {
        loadError.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
}
/** Pick up changes made elsewhere (v1, Claude) when coming back to the tab. */
export function refreshIfStale() {
    if (Date.now() - lastLoad > 60_000 && !loading.value) load();
}

export const items = computed<Item[]>(() => {
    const out: Item[] = [];
    for (const sheet of sheets.value) for (const entry of sheet.entries) {
        out.push({ key: keyOf(sheet.sheetPngFilename, entry.name), sheet, entry, box: boxOf(sheet, entry) });
    }
    return out;
});
export const itemByKey = computed(() => new Map(items.value.map(i => [i.key, i])));
export const sheetByName = computed(() => new Map(sheets.value.map(s => [s.sheetPngFilename, s])));
export const collectionTree = computed(() => flattenTree(collections.value));

export function collectionOf(key: Key): string {
    return meta.value[key]?.collection ?? 'uncollected';
}
export function licenseOf(key: Key): LicenseStatus | null {
    return meta.value[key]?.license ?? null;
}
export function physicsOf(key: Key): PhysicsReview | null {
    return meta.value[key]?.physics ?? null;
}

// Pending flags (not resolved) on sprites that still exist, grouped by sprite.
export const pendingFlags = computed(() => flags.value.filter(f => f.status !== 'resolved'));
export const flagsByKey = computed(() => {
    const map = new Map<Key, Flag[]>();
    const exists = itemByKey.value;
    for (const f of pendingFlags.value) {
        if (f.region) continue;   // zone flags live on the sheet, not on a sprite
        const k = keyOf(f.sheet, f.name!);
        if (!exists.has(k)) continue;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(f);
    }
    return map;
});
export const staleFlags = computed(() => {
    const exists = itemByKey.value;
    return pendingFlags.value.filter(f => !f.region && !exists.has(keyOf(f.sheet, f.name!)));
});
// Flags on an area of a sheet (drawn in the sheet view), not on a sprite.
export const zoneFlags = computed(() => pendingFlags.value.filter(f => f.region));
// Zones drawn in the sheet view but not sent yet.
export const draftZones = ref<{ sheet: string; box: Box }[]>([]);
export function hasStatus(key: Key, status: Flag['status']): boolean {
    return (flagsByKey.value.get(key) ?? []).some(f => f.status === status);
}

// ---------------------------------------------------------------- scope, filters, view
export const scope = ref<Scope>({ kind: 'inbox', id: 'review' });
export const filters = reactive({
    search: '',
    status: '' as StatusFilter,
    hitbox: '' as HitboxFilter,
    license: '' as LicenseFilter,
    animated: false,
});
export const sort = ref<'sheet' | 'name'>('sheet');
export const view = ref<'grid' | 'sheet'>('grid');
export const thumbSize = ref(64);
export const inspectorTab = ref<'info' | 'flags' | 'collision'>('info');
// Set by the grid from its width, so ↑/↓ can move a whole row.
export const gridColumns = ref(1);

export function inScope(it: Item, s: Scope = scope.value): boolean {
    switch (s.kind) {
        case 'inbox':
            if (s.id === 'review') return hasStatus(it.key, 'needs_review');
            if (s.id === 'question') return hasStatus(it.key, 'question');
            if (s.id === 'open') return hasStatus(it.key, 'open');
            if (s.id === 'hitbox') return physicsOf(it.key) === 'proposed';
            return false; // stale: not sprites
        case 'sheet':
            return it.sheet.sheetPngFilename === s.id;
        case 'library':
            if (s.id === 'all') return true;
            return scopeCollections.value!.has(collectionOf(it.key));
    }
}
const scopeCollections = computed(() =>
    scope.value.kind === 'library' && scope.value.id !== 'all' ? descendantIds(collections.value, scope.value.id) : null);

export const anyFilter = computed(() =>
    !!filters.search || !!filters.status || !!filters.hitbox || !!filters.license || filters.animated);

export function passesFilters(it: Item): boolean {
    if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!it.entry.name.toLowerCase().includes(q) && !it.sheet.sheetPngFilename.toLowerCase().includes(q)) return false;
    }
    if (filters.status) {
        const fl = flagsByKey.value.get(it.key) ?? [];
        if (filters.status === 'flagged' ? fl.length === 0 : !fl.some(f => f.status === filters.status)) return false;
    }
    if (filters.animated && (it.entry.frames?.length ?? 0) < 2) return false;
    if (filters.license) {
        const l = licenseOf(it.key);
        if (filters.license === 'unmarked' ? l !== null : l !== filters.license) return false;
    }
    if (filters.hitbox) {
        const r = physicsOf(it.key);
        if (filters.hitbox === 'unset' && it.entry.hitbox !== undefined && it.entry.layer !== undefined) return false;
        if (filters.hitbox === 'proposed' && r !== 'proposed') return false;
        if (filters.hitbox === 'approved' && r !== 'approved') return false;
        if (filters.hitbox === 'no_hitbox' && it.entry.hitbox !== null) return false;
    }
    return true;
}

export const visible = computed<Item[]>(() => {
    const out = items.value.filter(it => inScope(it) && passesFilters(it));
    if (sort.value === 'name') {
        out.sort((a, b) => a.entry.name.localeCompare(b.entry.name) || a.sheet.sheetPngFilename.localeCompare(b.sheet.sheetPngFilename));
    } else {
        out.sort((a, b) => a.sheet.sheetPngFilename.localeCompare(b.sheet.sheetPngFilename) || a.box.y - b.box.y || a.box.x - b.box.x);
    }
    return out;
});
export const visibleIndex = computed(() => new Map(visible.value.map((it, i) => [it.key, i])));

// Navigator counts
export const inboxCounts = computed(() => {
    const c: Record<InboxId, number> = { review: 0, question: 0, open: 0, hitbox: 0, zones: zoneFlags.value.length, stale: staleFlags.value.length };
    for (const [, fl] of flagsByKey.value) {
        if (fl.some(f => f.status === 'needs_review')) c.review++;
        if (fl.some(f => f.status === 'question')) c.question++;
        if (fl.some(f => f.status === 'open')) c.open++;
    }
    for (const it of items.value) if (physicsOf(it.key) === 'proposed') c.hitbox++;
    return c;
});
export const collectionCounts = computed(() => {
    const total: Record<string, number> = {}, matched: Record<string, number> = {};
    const filtering = anyFilter.value;
    for (const it of items.value) {
        const c = collectionOf(it.key);
        total[c] = (total[c] ?? 0) + 1;
        if (filtering && passesFilters(it)) matched[c] = (matched[c] ?? 0) + 1;
    }
    const roll = (raw: Record<string, number>) => {
        const out: Record<string, number> = { all: Object.values(raw).reduce((a, b) => a + b, 0) };
        for (const col of collections.value) {
            let n = 0;
            for (const id of descendantIds(collections.value, col.id)) n += raw[id] ?? 0;
            out[col.id] = n;
        }
        return out;
    };
    return { total: roll(total), matched: filtering ? roll(matched) : null };
});
export const sheetCounts = computed(() => {
    const out = new Map<string, { total: number; attention: number }>();
    for (const it of items.value) {
        const s = out.get(it.sheet.sheetPngFilename) ?? { total: 0, attention: 0 };
        s.total++;
        if (flagsByKey.value.has(it.key) || physicsOf(it.key) === 'proposed') s.attention++;
        out.set(it.sheet.sheetPngFilename, s);
    }
    return out;
});

export function scopeLabel(s: Scope = scope.value): string {
    if (s.kind === 'inbox') return INBOX[s.id].label;
    if (s.kind === 'sheet') return s.id;
    if (s.id === 'all') return 'All sprites';
    return collections.value.find(c => c.id === s.id)?.name ?? s.id;
}

/** The inspector tab that fits a scope: Collision for hitboxes, Flags for the other inboxes. */
function tabForScope(s: Scope) {
    if (s.kind === 'inbox' && s.id === 'hitbox') inspectorTab.value = 'collision';
    else if (s.kind === 'inbox' && s.id !== 'stale') inspectorTab.value = 'flags';
}
export function setScope(s: Scope) {
    scope.value = s;
    clearSelection();
    tabForScope(s);
}
export function clearFilters() {
    filters.search = ''; filters.status = ''; filters.hitbox = ''; filters.license = ''; filters.animated = false;
}

// ---------------------------------------------------------------- selection
export const selection = shallowRef<Set<Key>>(new Set());
export const focusKey = ref<Key | null>(null); // the sprite shown in the inspector
let anchorKey: Key | null = null;

export const focusItem = computed(() => (focusKey.value ? itemByKey.value.get(focusKey.value) ?? null : null));
export const selectedItems = computed(() => [...selection.value].map(k => itemByKey.value.get(k)).filter((x): x is Item => !!x));

export function select(key: Key, mode: 'replace' | 'toggle' | 'range' = 'replace') {
    const next = new Set(mode === 'replace' ? [] : selection.value);
    if (mode === 'toggle') {
        if (next.has(key)) next.delete(key); else next.add(key);
        anchorKey = key;
    } else if (mode === 'range' && anchorKey && visibleIndex.value.has(anchorKey)) {
        const a = visibleIndex.value.get(anchorKey)!, b = visibleIndex.value.get(key) ?? a;
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) next.add(visible.value[i].key);
    } else {
        next.add(key);
        anchorKey = key;
    }
    selection.value = next;
    focusKey.value = next.has(key) ? key : ([...next][0] ?? null);
}
/** Select a set of sprites at once (drag-select in the sheet view); `add` keeps the current selection. */
export function selectMany(keys: Key[], add = false) {
    const next = new Set(add ? selection.value : []);
    for (const k of keys) next.add(k);
    selection.value = next;
    if (keys.length) { focusKey.value = keys[0]; anchorKey = keys[0]; }
    else if (!add) { focusKey.value = null; anchorKey = null; }
}
export function selectAll() {
    selection.value = new Set(visible.value.map(i => i.key));
    if (!focusKey.value && visible.value.length) focusKey.value = visible.value[0].key;
}
export function clearSelection() {
    selection.value = new Set();
    focusKey.value = null;
    anchorKey = null;
}
/** Move the focus by `delta` in the visible order (arrow keys, J/K). */
export function moveFocus(delta: number, extend = false) {
    const list = visible.value;
    if (!list.length) return;
    const cur = focusKey.value ? visibleIndex.value.get(focusKey.value) ?? -1 : -1;
    const next = Math.max(0, Math.min(list.length - 1, cur < 0 ? 0 : cur + delta));
    select(list[next].key, extend ? 'range' : 'replace');
}

/**
 * After an action on `acted`, keep working: if the focused sprite left the
 * scope (e.g. approved out of "To review"), select the next one that is
 * still there, in the order from before the action.
 */
function advanceFrom(before: Key[], acted: Key[]) {
    const stillVisible = visibleIndex.value;
    if (focusKey.value && stillVisible.has(focusKey.value) && acted.length === 1) {
        // still in scope: move on to the next one anyway, like a review pass
        const i = before.indexOf(acted[0]);
        const nextKey = before.slice(i + 1).find(k => stillVisible.has(k));
        if (nextKey) select(nextKey);
        return;
    }
    const last = Math.max(...acted.map(k => before.indexOf(k)));
    const nextKey = before.slice(last + 1).find(k => stillVisible.has(k))
        ?? before.slice(0, Math.max(0, last)).reverse().find(k => stillVisible.has(k));
    if (nextKey) select(nextKey); else clearSelection();
}

// ---------------------------------------------------------------- toasts + undo
export interface Toast { id: number; text: string; kind: 'ok' | 'error'; undo?: () => Promise<void> }
export const toasts = ref<Toast[]>([]);
let toastSeq = 0;
export function toast(text: string, kind: Toast['kind'] = 'ok', undo?: () => Promise<void>) {
    const id = ++toastSeq;
    toasts.value.push({ id, text, kind, undo });
    setTimeout(() => dismissToast(id), undo ? 8000 : 4000);
}
export function dismissToast(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id);
}
async function run(label: string, fn: () => Promise<void>, undo?: () => Promise<void>) {
    try {
        await fn();
        toast(label, 'ok', undo && (async () => {
            try { await undo(); toast('Undone'); } catch (e) { toast(`Undo failed: ${msg(e)}`, 'error'); }
        }));
    } catch (e) {
        toast(msg(e), 'error');
        await load(); // local state may be ahead of the server now
    }
}
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

// Last action taken on sprites: focus mode watches it to mark the current
// sprite done and move to the next one.
export const lastActed = shallowRef<{ keys: Key[]; kind: 'approved' | 'rework' | 'answered' | 'saved' | 'other'; at: number } | null>(null);
function acted(keys: Key[], kind: 'approved' | 'rework' | 'answered' | 'saved' | 'other') {
    lastActed.value = { keys, kind, at: Date.now() };
}

// ---------------------------------------------------------------- flag actions
function snapshotFlags(ids: string[]) {
    const byId = new Map(flags.value.map(f => [f.id, f]));
    return ids.map(id => ({ ...byId.get(id)! }));
}
function applyFlagUpdates(updates: FlagUpdate[]) {
    const byId = new Map(flags.value.map(f => [f.id, f]));
    const now = new Date().toISOString();
    for (const u of updates) {
        const f = byId.get(u.id);
        if (!f) continue;
        f.status = u.status;
        f.resolvedAt = u.status === 'resolved' ? now : null;
        if (u.comment !== undefined) f.comment = u.comment;
        if (u.note !== undefined) f.claudeNote = u.note;
    }
}
async function writeFlags(updates: FlagUpdate[], label: string, actedKeys: Key[], kind: 'approved' | 'rework' | 'answered' | 'other' = 'other') {
    if (!updates.length) return;
    const before = visible.value.map(i => i.key);
    const prev = snapshotFlags(updates.map(u => u.id));
    applyFlagUpdates(updates);
    if (actedKeys.length) advanceFrom(before, actedKeys);
    acted(actedKeys, kind);
    const restore = prev.map(p => ({ id: p.id, status: p.status, comment: p.comment, note: p.claudeNote }));
    await run(label, () => flagsBatch(updates), async () => {
        applyFlagUpdates(restore);
        await flagsBatch(restore);
    });
}
const append = (comment: string, line: string) => (comment ? `${comment}\n\n${line}` : line);

/** Approve every "to review" flag on these sprites. */
export function approveReview(keys: Key[]) {
    const fl = keys.flatMap(k => (flagsByKey.value.get(k) ?? []).filter(f => f.status === 'needs_review'));
    return writeFlags(fl.map(f => ({ id: f.id, status: 'resolved' })), `Approved ${plural(keys.length, 'sprite')}`, keys, 'approved');
}
/** Send "to review" flags back to Claude, optionally with a note. */
export function sendBack(keys: Key[], note: string) {
    const fl = keys.flatMap(k => (flagsByKey.value.get(k) ?? []).filter(f => f.status === 'needs_review'));
    const text = note.trim();
    return writeFlags(fl.map(f => ({ id: f.id, status: 'open', ...(text ? { comment: append(f.comment, `[Rework] ${text}`) } : {}) })),
        `Sent back ${plural(keys.length, 'sprite')}`, keys, 'rework');
}
export function answerQuestion(flag: Flag, answer: string) {
    return writeFlags([{ id: flag.id, status: 'open', comment: append(flag.comment, `[Answer to Claude's question] ${answer.trim()}`) }],
        'Answer sent to Claude', [keyOf(flag.sheet, flag.name ?? '')], 'answered');
}
export function setFlagStatus(flag: Flag, status: Flag['status'], label: string) {
    const k = keyOf(flag.sheet, flag.name ?? '');
    return writeFlags([{ id: flag.id, status }], label, itemByKey.value.has(k) ? [k] : [], status === 'resolved' ? 'approved' : 'rework');
}
export function resolveFlags(list: Flag[], label: string) {
    return writeFlags(list.map(f => ({ id: f.id, status: 'resolved' })), label, []);
}
export async function addFlag(key: Key, reason: string, comment: string) {
    const [sheet, name] = splitKey(key);
    try {
        const f = await apiAddFlag(sheet, name, reason, comment);
        flags.value.push(f);
        toast('Flag sent to Claude');
    } catch (e) {
        toast(msg(e), 'error');
    }
}

/** Flag areas of a sheet for Claude: one flag per zone, same reason and note. */
export async function addZoneFlags(sheet: string, boxes: Box[], reason: string, comment: string) {
    let sent = 0;
    for (const box of boxes) {
        try {
            flags.value.push(await apiAddFlag(sheet, null, reason, comment, box));
            sent++;
        } catch (e) {
            toast(msg(e), 'error');
        }
    }
    if (sent) {
        draftZones.value = draftZones.value.filter(z => z.sheet !== sheet);
        toast(sent > 1 ? `${sent} zone flags sent to Claude` : 'Zone flag sent to Claude');
    }
}
/** Send one flag back to Claude with an optional note (zone and stale flags). */
export function sendBackFlag(flag: Flag, note: string) {
    const text = note.trim();
    return writeFlags([{ id: flag.id, status: 'open', ...(text ? { comment: append(flag.comment, `[Rework] ${text}`) } : {}) }], 'Sent back', [], 'rework');
}

// ---------------------------------------------------------------- meta actions (license, collection)
function applyMeta(items: MetaUpdate[]) {
    const m = { ...meta.value };
    for (const it of items) {
        const k = keyOf(it.sheet, it.name);
        const rec = { ...(m[k] ?? { collection: 'uncollected' }) } as SpriteMetaRecord & Record<string, unknown>;
        for (const field of ['collection', 'license', 'physics'] as const) {
            if (!(field in it)) continue;
            const v = (it as Record<string, unknown>)[field];
            if (v === null) delete rec[field]; else rec[field] = v as never;
        }
        m[k] = rec;
    }
    meta.value = m;
}
async function writeMeta(items: MetaUpdate[], label: string, fields: ('collection' | 'license' | 'physics')[]) {
    const prev: MetaUpdate[] = items.map(it => {
        const cur = meta.value[keyOf(it.sheet, it.name)] ?? {} as SpriteMetaRecord;
        const p: MetaUpdate = { sheet: it.sheet, name: it.name };
        for (const f of fields) (p as Record<string, unknown>)[f] = (cur as Record<string, unknown>)[f] ?? null;
        return p;
    });
    applyMeta(items);
    await run(label, () => metaBatch(items), async () => {
        const restore = prev.map(p => (p.collection === null ? { ...p, collection: 'uncollected' } : p));
        applyMeta(restore);
        await metaBatch(restore);
    });
}
export function setLicense(keys: Key[], status: LicenseStatus | null) {
    const label = status === 'ok' ? 'Marked licensed' : status === 'unlicensed' ? 'Flagged unlicensed' : 'License cleared';
    return writeMeta(keys.map(k => { const [sheet, name] = splitKey(k); return { sheet, name, license: status }; }),
        `${label}: ${plural(keys.length, 'sprite')}`, ['license']);
}
export function setCollection(keys: Key[], collection: string) {
    const name = collections.value.find(c => c.id === collection)?.name ?? collection;
    return writeMeta(keys.map(k => { const [sheet, n] = splitKey(k); return { sheet, name: n, collection }; }),
        `Moved ${plural(keys.length, 'sprite')} to ${name}`, ['collection']);
}
export async function addCollection(name: string, parentId: string | null) {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!id) return;
    try {
        await apiAddCollection(id, name.trim(), parentId);
        collections.value = [...collections.value, { id, name: name.trim(), parentId }];
        toast(`Collection "${name.trim()}" created`);
    } catch (e) {
        toast(msg(e), 'error');
    }
}

// ---------------------------------------------------------------- hitbox actions
export interface PhysicsChange { key: Key; hitbox?: HitBox | null; layer?: Layer }
function applyPhysics(changes: { key: Key; hitbox?: HitBox | null; layer?: Layer }[]) {
    for (const c of changes) {
        const it = itemByKey.value.get(c.key);
        if (!it) continue;
        if (c.hitbox !== undefined) it.entry.hitbox = c.hitbox ? { ...c.hitbox } : null;
        if (c.layer !== undefined) it.entry.layer = c.layer;
    }
    triggerRef(sheets);
}
/**
 * Save hitbox/layer values (and mark them approved), or just approve what is
 * there when a change carries neither. Undo restores values and review state.
 */
export async function savePhysics(changes: PhysicsChange[], label: string) {
    if (!changes.length) return;
    const before = visible.value.map(i => i.key);
    const prev = changes.map(c => {
        const it = itemByKey.value.get(c.key)!;
        return { key: c.key, hitbox: it.entry.hitbox, layer: it.entry.layer, review: physicsOf(c.key) };
    });
    applyPhysics(changes);
    applyMeta(changes.map(c => { const [sheet, name] = splitKey(c.key); return { sheet, name, physics: 'approved' as const }; }));
    advanceFrom(before, changes.map(c => c.key));
    acted(changes.map(c => c.key), 'saved');
    const payload = changes.map(c => { const [sheet, name] = splitKey(c.key); return { sheet, name, hitbox: c.hitbox, layer: c.layer, review: 'approved' as const }; });
    await run(label, () => physicsBatch(payload).then(() => undefined), async () => {
        applyPhysics(prev.map(p => ({ key: p.key, hitbox: p.hitbox, layer: p.layer })));
        applyMeta(prev.map(p => { const [sheet, name] = splitKey(p.key); return { sheet, name, physics: p.review }; }));
        await physicsBatch(prev.map(p => {
            const [sheet, name] = splitKey(p.key);
            return { sheet, name, ...(p.hitbox !== undefined ? { hitbox: p.hitbox } : {}), ...(p.layer !== undefined ? { layer: p.layer } : {}), review: p.review };
        }));
    });
}
export function approveHitboxes(keys: Key[]) {
    return savePhysics(keys.map(key => ({ key })), `Hitbox approved: ${plural(keys.length, 'sprite')}`);
}

// ---------------------------------------------------------------- URL state
// #/inbox/review?q=..&status=..&hb=..&lic=..&anim=1&view=sheet&sort=name&sel=<key>
function encodeState(): string {
    const p = new URLSearchParams();
    if (filters.search) p.set('q', filters.search);
    if (filters.status) p.set('status', filters.status);
    if (filters.hitbox) p.set('hb', filters.hitbox);
    if (filters.license) p.set('lic', filters.license);
    if (filters.animated) p.set('anim', '1');
    if (view.value !== 'grid') p.set('view', view.value);
    if (sort.value !== 'sheet') p.set('sort', sort.value);
    if (focusKey.value) p.set('sel', focusKey.value);
    const qs = p.toString();
    return `#/${scope.value.kind}/${encodeURIComponent(scope.value.id)}${qs ? `?${qs}` : ''}`;
}
function applyHash(hash: string) {
    const m = hash.match(/^#\/(inbox|library|sheet)\/([^?]*)(?:\?(.*))?$/);
    if (!m) return;
    const id = decodeURIComponent(m[2]);
    scope.value = m[1] === 'inbox' ? { kind: 'inbox', id: (id in INBOX ? id : 'review') as InboxId }
        : m[1] === 'sheet' ? { kind: 'sheet', id } : { kind: 'library', id: id || 'all' };
    const p = new URLSearchParams(m[3] ?? '');
    filters.search = p.get('q') ?? '';
    filters.status = (p.get('status') ?? '') as StatusFilter;
    filters.hitbox = (p.get('hb') ?? '') as HitboxFilter;
    filters.license = (p.get('lic') ?? '') as LicenseFilter;
    filters.animated = p.get('anim') === '1';
    view.value = p.get('view') === 'sheet' ? 'sheet' : 'grid';
    sort.value = p.get('sort') === 'name' ? 'name' : 'sheet';
    const sel = p.get('sel');
    if (sel) { selection.value = new Set([sel]); focusKey.value = sel; } else clearSelection();
}
export function initUrlSync() {
    if (location.hash) applyHash(location.hash);
    tabForScope(scope.value);
    let lastScope = JSON.stringify(scope.value);
    watch([scope, () => ({ ...filters }), view, sort, focusKey], () => {
        const h = encodeState();
        if (h === location.hash) return;
        const s = JSON.stringify(scope.value);
        // a new scope is a new "page" for Back; everything else just updates it
        if (s !== lastScope) history.pushState(null, '', h); else history.replaceState(null, '', h);
        lastScope = s;
    }, { deep: true });
    window.addEventListener('popstate', () => { applyHash(location.hash); tabForScope(scope.value); });
}

// ---------------------------------------------------------------- focus mode
export const focusMode = reactive({
    active: false,
    queue: [] as Key[],
    index: 0,
    done: {} as Record<Key, 'approved' | 'rework' | 'answered' | 'saved'>,
    returnFocus: null as Key | null,
});
/** Snapshot of what to walk through: the selection if several, else everything in view. */
export function openFocusMode(startKey?: Key | null) {
    const sel = selectedItems.value;
    const queue = sel.length > 1 ? visible.value.filter(i => selection.value.has(i.key)).map(i => i.key) : visible.value.map(i => i.key);
    if (!queue.length) return;
    focusMode.queue = queue;
    focusMode.done = {};
    const start = startKey ?? focusKey.value;
    focusMode.index = start && queue.includes(start) ? queue.indexOf(start) : 0;
    focusMode.returnFocus = focusKey.value;
    focusMode.active = true;
}
export function closeFocusMode() {
    focusMode.active = false;
    const cur = focusMode.queue[focusMode.index];
    if (cur && itemByKey.value.has(cur)) select(cur);
}
