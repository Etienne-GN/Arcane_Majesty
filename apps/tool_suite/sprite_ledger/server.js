import path from 'path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { scanCatalogueDir } from './server/catalogueScanner.js';
import {
    loadCollections, addCollection,
    loadSpriteMeta, assignCollection, seedSheetIfNew, setLicenseStatus,
    loadFlags, addFlag, updateFlagStatus,
} from './server/dataStore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Scans + seeds every sheet that hasn't been seeded yet. Called at the top
// of both /api/sheets and /api/meta so either endpoint being hit first
// still guarantees seeding happened — the frontend always sees real
// collection assignments, never an empty sprite_meta.json for a sheet
// that's actually been scanned before.
async function scanAndSeed(catalogueDir, dataDir) {
    const sheets = await scanCatalogueDir(catalogueDir);
    for (const sheet of sheets) {
        const entryNames = sheet.catalogue.entries.map(e => e.name);
        await seedSheetIfNew(dataDir, sheet.sheetPngFilename, sheet.sheetDirName, entryNames);
    }
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
            entries: s.catalogue.entries,
            gridTileWidth: s.catalogue.gridTileWidth,
            gridTileHeight: s.catalogue.gridTileHeight,
            gridCols: s.catalogue.gridCols,
            gridRows: s.catalogue.gridRows,
        })));
    });

    app.get('/api/image/:sheetPngFilename', async (req, res) => {
        const sheets = await scanCatalogueDir(catalogueDir);
        const match = sheets.find(s => s.sheetPngFilename === req.params.sheetPngFilename);
        if (!match) return res.status(404).send('not found');
        res.sendFile(path.resolve(match.pngPath));
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

    app.get('/api/flags', async (req, res) => {
        res.json(await loadFlags(dataDir, req.query.status));
    });

    app.post('/api/flags', async (req, res) => {
        const flag = await addFlag(dataDir, req.body);
        res.json(flag);
    });

    app.patch('/api/flags/:id', async (req, res) => {
        await updateFlagStatus(dataDir, req.params.id, req.body.status);
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
    app.listen(3002, '127.0.0.1', () => console.log('Sprite Ledger API on http://localhost:3002'));
}
