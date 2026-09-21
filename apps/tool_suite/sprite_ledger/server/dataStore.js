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
// Which pack each catalogued directory belongs to. This used to be three
// prefix rules with everything else falling through to 'uncollected', and
// every other pack was assigned by hand, entry by entry. That held while a
// sheet was one entry; the moment sheets were re-catalogued into their real
// cells, LPC went from 6 entries to 4148 and all of them landed in
// 'uncollected'. A table costs one line per pack and cannot drift that way.
export const DIR_COLLECTIONS = {
    'generated_recolours': 'generated',
    'generic_rpg_pack_vacaroxa': 'generic_rpg_vacaroxa',
    'hana_caraka_topdown_sample': 'hana_caraka',
    'lpc': 'lpc',
    // The 4 big LPC atlases each get their own sub-collection (see
    // LPC_SHEET_COLLECTIONS below) — this entry is the fallback for
    // everything else still cataloged in the same directory (items1,
    // effects, treetop, trunk).
    'manaseed_seasonal_forest_sample_autumn': 'manaseed',
    'manaseed_seasonal_forest_sample_spring': 'manaseed',
    'manaseed_seasonal_forest_sample_summer': 'manaseed',
    'manaseed_seasonal_forest_sample_winter': 'manaseed',
    'snowy_asset_pack_nyx': 'nyx_snowy',
    'PATD_Plant': 'patd',
    'PATD_Props': 'patd',
    'PATD_Struct': 'patd',
    'PATD_TilesetGrass': 'patd',
    'PATD_TilesetStoneGround': 'patd',
    'PATD_TilesetWall': 'patd',
    'patd_bushes_dustdfg': 'patd_bushes_dustdfg',
    'SampleMap': 'pipoya',
    'pipoya_autotiles_type1': 'pipoya',
    'pipoya_autotiles_type1_static': 'pipoya',
    'pipoya_autotiles_type2': 'pipoya',
    'pipoya_autotiles_type2_static': 'pipoya',
    'pipoya_autotiles_type3': 'pipoya',
    'pipoya_autotiles_type3_static': 'pipoya',
    'pipoya_popup_emotes': 'pipoya',
    'pipoya_vfx_bell': 'pipoya',
    'pipoya_vfx_hexshield': 'pipoya',
    'pipoya_vfx_light_pillar': 'pipoya',
    'pipoya_vfx_mysterious_object': 'pipoya',
    'pipoya_vfx_time_magic': 'pipoya',
    'pipoya_vfx_warp_portal': 'pipoya',
    'pixel_crawler_anokolisa': 'pixel_crawler',
    'roleworld_wizard': 'roleworld_wizard',
    'assets_spritesheet_v2_free_restored': 'schwarnhild',
    'schwarnhild_basic_tileset': 'schwarnhild',
    'top_down_adventure_pack_olobster': 'top_down_adventure_olobster',
    'trees_blackland_widelands': 'widelands_trees',
    'woolly_lands_tofebaa': 'woolly_lands',
};

// The 'lpc' directory holds 4 big atlases (1700-1900 entries each — 72% of
// the whole ledger between them) plus a handful of small leftover sheets
// (items1, effects, treetop, trunk). Splitting the 4 atlases into their own
// collections is what makes browsing any one of them lighter than the
// combined pile; the leftovers stay bucketed under plain 'lpc'.
export const LPC_SHEET_COLLECTIONS = {
    'base_out_atlas.png': 'lpc_base_out',
    'build_atlas.png': 'lpc_build',
    'terrain_atlas.png': 'lpc_terrain',
    'obj_misk_atlas.png': 'lpc_obj_misk',
};

export function seedDefaultCollection(sheetPngFilename, sheetDirName) {
    if (sheetDirName === 'lpc') {
        return LPC_SHEET_COLLECTIONS[sheetPngFilename] ?? 'lpc';
    }
    const known = DIR_COLLECTIONS[sheetDirName];
    if (known) return known;
    // A genuinely new pack still lands in 'uncollected' — that's the queue
    // saying "nobody has said where this belongs yet", which is true.
    return 'uncollected';
}

// --- collections ---
export async function loadCollections(dataDir) {
    return readJsonOrDefault(join(dataDir, 'collections.json'), []);
}

export async function addCollection(dataDir, { id, name, parentId = null }) {
    const collections = await loadCollections(dataDir);
    if (collections.some(c => c.id === id)) {
        throw new Error(`collection id already exists: ${id}`);
    }
    // A brand-new id can never already be an ancestor of an existing
    // collection, so there's no cycle to guard against here — that check
    // only matters if a collection's parent is ever changed after creation,
    // which isn't a feature yet.
    if (parentId !== null && !collections.some(c => c.id === parentId)) {
        throw new Error(`unknown parent collection id: ${parentId}`);
    }
    collections.push({ id, name, parentId });
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
// the DIR_COLLECTIONS values plus 'uncollected' — which the real data/collections.json
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

// Same seeding rule as seedSheetIfNew, but for every sheet in one call —
// what the server actually needs on every /api/sheets and /api/meta
// request. seedSheetIfNew in a loop over ~950 sheets meant ~950 full
// reads (and up to 950 full rewrites) of sprite_meta.json *per request*,
// which is the entire reason those endpoints took ~6 seconds each: the
// file only grows, so that cost was pure waste on every request after
// the first. This loads it once, seeds every sheet's new entries into
// that one in-memory object, and writes back once — only if anything
// actually needed seeding.
export async function seedSheetsIfNew(dataDir, sheets) {
    // sheets: [{ sheetPngFilename, sheetDirName, entryNames }, ...]
    const meta = await loadSpriteMeta(dataDir);
    let changed = false;
    for (const { sheetPngFilename, sheetDirName, entryNames } of sheets) {
        const defaultCollection = seedDefaultCollection(sheetPngFilename, sheetDirName);
        for (const name of entryNames) {
            const key = `${sheetPngFilename}::${name}`;
            if (!meta[key]) {
                meta[key] = { collection: defaultCollection };
                changed = true;
            }
        }
    }
    if (changed) {
        await writeJson(join(dataDir, 'sprite_meta.json'), meta);
    }
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
