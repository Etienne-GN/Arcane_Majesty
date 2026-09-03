import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

async function readJsonOrDefault(path, fallback) {
    try {
        const raw = await readFile(path, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        if (e.code === 'ENOENT') return fallback;
        throw e;
    }
}

async function writeJson(path, value) {
    await mkdir(join(path, '..'), { recursive: true });
    await writeFile(path, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

// --- seeding (pure, no I/O) ---
export function seedDefaultCollection(sheetPngFilename, sheetDirName) {
    if (sheetDirName === 'SampleMap') return 'pipoya';
    if (sheetDirName.startsWith('pipoya_autotiles')) return 'pipoya';
    if (sheetDirName.startsWith('PATD_')) return 'patd';
    return 'uncollected';
}

// --- collections ---
export async function loadCollections(dataDir) {
    return readJsonOrDefault(join(dataDir, 'collections.json'), []);
}

export async function addCollection(dataDir, { id, name }) {
    const collections = await loadCollections(dataDir);
    if (collections.some(c => c.id === id)) {
        throw new Error(`collection id already exists: ${id}`);
    }
    collections.push({ id, name });
    await writeJson(join(dataDir, 'collections.json'), collections);
}

// --- sprite_meta ---
export async function loadSpriteMeta(dataDir) {
    return readJsonOrDefault(join(dataDir, 'sprite_meta.json'), {});
}

export async function assignCollection(dataDir, sheetPngFilename, entryName, collectionId) {
    const collections = await loadCollections(dataDir);
    if (!collections.some(c => c.id === collectionId)) {
        throw new Error(`unknown collection id: ${collectionId}`);
    }
    const meta = await loadSpriteMeta(dataDir);
    const key = `${sheetPngFilename}::${entryName}`;
    // Merge, don't replace — a prior license mark (or any other field) on
    // this entry must survive a plain collection reassignment.
    meta[key] = { ...meta[key], collection: collectionId };
    await writeJson(join(dataDir, 'sprite_meta.json'), meta);
}

// Seeds each entry of a sheet with its default collection, but only the
// entries that don't already have a sprite_meta.json record — a one-time
// seed per *entry*, never overwriting an existing (default or
// user-chosen) assignment. Per-entry rather than per-sheet so that
// re-cataloguing an existing sheet (e.g. Claude adding entries in
// response to a flag) still seeds the new ones, instead of the whole
// sheet being skipped because some of its other entries were already
// seeded. Bypasses assignCollection's existence check deliberately
// (seeding is a trusted internal call, not user input) but still only
// ever writes collection ids that seedDefaultCollection can produce —
// 'pipoya', 'patd', 'uncollected' — which the real data/collections.json
// (Step 4 below) always defines.
export async function seedSheetIfNew(dataDir, sheetPngFilename, sheetDirName, entryNames) {
    const meta = await loadSpriteMeta(dataDir);
    const newNames = entryNames.filter(name => !meta[`${sheetPngFilename}::${name}`]);
    if (newNames.length === 0) return;

    const defaultCollection = seedDefaultCollection(sheetPngFilename, sheetDirName);
    for (const name of newNames) {
        meta[`${sheetPngFilename}::${name}`] = { collection: defaultCollection };
    }
    await writeJson(join(dataDir, 'sprite_meta.json'), meta);
}

// Records whether a sprite's usage rights have been verified (`'ok'`) or
// flagged as needing research (`'unlicensed'`), independent of the flags
// system above — flags are about render quality, this is about
// provenance. `status: null` clears the mark back to unset.
export async function setLicenseStatus(dataDir, sheetPngFilename, entryName, status) {
    if (status !== null && status !== 'ok' && status !== 'unlicensed') {
        throw new Error(`invalid license status: ${status}`);
    }
    const meta = await loadSpriteMeta(dataDir);
    const key = `${sheetPngFilename}::${entryName}`;
    const record = meta[key] ?? {};
    if (status === null) {
        delete record.license;
    } else {
        record.license = status;
    }
    meta[key] = record;
    await writeJson(join(dataDir, 'sprite_meta.json'), meta);
}

// --- flags ---
export async function loadFlags(dataDir, statusFilter) {
    const flags = await readJsonOrDefault(join(dataDir, 'flags.json'), []);
    if (!statusFilter) return flags;
    return flags.filter(f => f.status === statusFilter);
}

export async function addFlag(dataDir, { sheet, name, reason, comment }) {
    const flags = await readJsonOrDefault(join(dataDir, 'flags.json'), []);
    const flag = {
        id: `f_${randomUUID()}`,
        sheet, name, reason, comment: comment ?? '',
        status: 'open',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
    };
    flags.push(flag);
    await writeJson(join(dataDir, 'flags.json'), flags);
    return flag;
}

// 'open' — freshly flagged, nobody has acted on it yet.
// 'needs_review' — Claude applied a tentative fix; the human who filed the
// flag still needs to look at it and either approve (-> 'resolved') or
// send it back for more work (-> 'open'). Never set by Claude on its own
// authority as a final answer — it's a checkpoint, not a resolution.
// 'resolved' — the human is satisfied; only a human sets this.
const FLAG_STATUSES = ['open', 'needs_review', 'resolved'];

export async function updateFlagStatus(dataDir, id, status) {
    if (!FLAG_STATUSES.includes(status)) {
        throw new Error(`invalid flag status: ${status}`);
    }
    const flags = await readJsonOrDefault(join(dataDir, 'flags.json'), []);
    const flag = flags.find(f => f.id === id);
    if (!flag) throw new Error(`flag not found: ${id}`);
    flag.status = status;
    flag.resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
    await writeJson(join(dataDir, 'flags.json'), flags);
}
