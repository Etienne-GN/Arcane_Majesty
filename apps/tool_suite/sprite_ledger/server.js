import path from 'path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { scanCatalogueDir } from './server/catalogueScanner.js';
import {
    loadCollections, addCollection,
    loadSpriteMeta, assignCollection, seedSheetsIfNew, setLicenseStatus,
    loadFlags, addFlag, updateFlagStatus, setPhysicsReview,
    updateFlagsBatch, updateMetaBatch,
} from './server/dataStore.js';
import { setEntryPhysics, setEntriesPhysics } from './server/physicsStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Scans + seeds every sheet that hasn't been seeded yet. Called at the top
// of both /api/sheets and /api/meta so either endpoint being hit first
// still guarantees seeding happened — the frontend always sees real
// collection assignments, never an empty sprite_meta.json for a sheet
// that's actually been scanned before. seedSheetsIfNew (batched, one
// sprite_meta.json read/write for the whole set) not seedSheetIfNew in a
// per-sheet loop — the latter used to cost ~950 full rereads of that file
// on every single request; see its own comment in dataStore.js.
async function scanAndSeed(catalogueDir, dataDir) {
    const sheets = await scanCatalogueDir(catalogueDir);
    await seedSheetsIfNew(dataDir, sheets.map(sheet => ({
        sheetPngFilename: sheet.sheetPngFilename,
        sheetDirName: sheet.sheetDirName,
        entryNames: sheet.catalogue.entries.map(e => e.name),
    })));
    return sheets;
}

export function createServer(catalogueDir, dataDir) {
    const app = express();
    app.use(express.json());

    app.get('/api/sheets', async (req, res) => {
        const sheets = await scanAndSeed(catalogueDir, dataDir);
        res.json(sheets.map(s => ({
            sheetPngFilename: s.sheetPngFilename,
            source: s.catalogue.source,
            sheetDirName: s.sheetDirName,
            sheetWidth: s.catalogue.sheetWidth,
            sheetHeight: s.catalogue.sheetHeight,
            entries: s.catalogue.entries,
            gridTileWidth: s.catalogue.gridTileWidth,
            gridTileHeight: s.catalogue.gridTileHeight,
            gridCols: s.catalogue.gridCols,
            gridRows: s.catalogue.gridRows,
        })));
    });

    // Filename -> PNG path, built once and reused. This endpoint used to run a
    // full scanCatalogueDir() per request: 950 directories walked and every
    // catalogue.json parsed, just to resolve one filename. The grid asks for
    // ~950 images on a cold load, so that was ~950 full scans — the page sat
    // blank for a long time before any sprite appeared, and it got worse as
    // the catalogue grew.
    let imageIndex = null;

    async function resolveImagePath(sheetPngFilename) {
        if (!imageIndex) {
            imageIndex = new Map(
                (await scanCatalogueDir(catalogueDir)).map(s => [s.sheetPngFilename, s.pngPath]));
        }
        let hit = imageIndex.get(sheetPngFilename);
        if (hit) return hit;
        // A miss might just mean the sheet was catalogued after the index was
        // built, so rebuild once before believing the 404.
        imageIndex = new Map(
            (await scanCatalogueDir(catalogueDir)).map(s => [s.sheetPngFilename, s.pngPath]));
        return imageIndex.get(sheetPngFilename) ?? null;
    }

    app.get('/api/image/:sheetPngFilename', async (req, res) => {
        const pngPath = await resolveImagePath(req.params.sheetPngFilename);
        if (!pngPath) return res.status(404).send('not found');
        res.sendFile(path.resolve(pngPath));
    });

    app.get('/api/collections', async (req, res) => {
        res.json(await loadCollections(dataDir));
    });

    app.post('/api/collections', async (req, res) => {
        await addCollection(dataDir, req.body);
        res.json({ ok: true });
    });

    app.get('/api/meta', async (req, res) => {
        await scanAndSeed(catalogueDir, dataDir);
        res.json({
            collections: await loadCollections(dataDir),
            spriteMeta: await loadSpriteMeta(dataDir),
        });
    });

    app.post('/api/meta', async (req, res) => {
        const { sheet, name, collection } = req.body;
        await assignCollection(dataDir, sheet, name, collection);
        res.json({ ok: true });
    });

    app.post('/api/license', async (req, res) => {
        const { sheet, name, status } = req.body;
        await setLicenseStatus(dataDir, sheet, name, status);
        res.json({ ok: true });
    });

    // Hitbox + layer of one sprite. `hitbox` (object, or null = no
    // collision) and `layer` go into the catalogue entry; `review`
    // ('proposed' | 'approved' | null) into sprite_meta. Each is optional.
    app.post('/api/physics', async (req, res) => {
        const { sheet, name, hitbox, layer, review } = req.body;
        try {
            let entry = null;
            if (hitbox !== undefined || layer !== undefined) {
                entry = await setEntryPhysics(catalogueDir, sheet, name, { hitbox, layer });
            }
            if (review !== undefined) await setPhysicsReview(dataDir, sheet, name, review);
            res.json({ ok: true, entry });
        } catch (e) {
            res.status(400).send(e.message);
        }
    });

    // --- batch endpoints (bulk actions in v2): one write for a whole selection.
    // Validation happens before any write, so a bad item fails the batch.
    const batch = (fn) => async (req, res) => {
        try { res.json({ ok: true, ...(await fn(req.body)) }); }
        catch (e) { res.status(400).send(e.message); }
    };
    app.post('/api/flags/batch', batch(async ({ updates }) => {
        await updateFlagsBatch(dataDir, updates ?? []);
    }));
    app.post('/api/meta/batch', batch(async ({ items }) => {
        await updateMetaBatch(dataDir, items ?? []);
    }));
    // items: [{ sheet, name, hitbox?, layer?, review? }]
    app.post('/api/physics/batch', batch(async ({ items }) => {
        const list = items ?? [];
        const physical = list.filter(i => i.hitbox !== undefined || i.layer !== undefined);
        const entries = physical.length ? await setEntriesPhysics(catalogueDir, physical) : [];
        const reviews = list.filter(i => i.review !== undefined).map(i => ({ sheet: i.sheet, name: i.name, physics: i.review }));
        if (reviews.length) await updateMetaBatch(dataDir, reviews);
        return { entries };
    }));

    app.get('/api/flags', async (req, res) => {
        res.json(await loadFlags(dataDir, req.query.status));
    });

    app.post('/api/flags', async (req, res) => {
        try { res.json(await addFlag(dataDir, req.body)); }
        catch (e) { res.status(400).send(e.message); }
    });

    app.patch('/api/flags/:id', async (req, res) => {
        const { status, note, comment } = req.body;
        const extra = {};
        if (note !== undefined) extra.note = note;
        if (comment !== undefined) extra.comment = comment;
        await updateFlagStatus(dataDir, req.params.id, status, extra);
        res.json({ ok: true });
    });

    return app;
}

// Only start listening when run directly (`node server.js`), not when
// imported by the smoke test.
if (import.meta.url === `file://${process.argv[1]}`) {
    // Resolve against this file's own location, not process.cwd() — so
    // `node server.js` works the same whether it's launched from this
    // directory (the normal `npm run dev` case) or from anywhere else.
    const catalogueDir = path.join(__dirname, '../../amo/public/assets/catalogued/tilesets');
    const dataDir = path.join(__dirname, 'data');
    const app = createServer(catalogueDir, dataDir);
    // Bound to localhost only — this is a personal, single-user curation
    // tool with unauthenticated write endpoints; no reason to expose it
    // to the LAN the way the game server (apps/amo) intentionally is.
    // 3003, not 3002: apps/amo's own game server hardcodes 3002 for its
    // Socket.io/REST backend, and the two used to silently collide.
    const PORT = 3003;
    app.listen(PORT, '127.0.0.1', () => console.log(`Sprite Ledger API on http://localhost:${PORT}`));
}
