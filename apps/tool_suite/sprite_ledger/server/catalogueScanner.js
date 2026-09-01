import { readdir, readFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';

/**
 * Walks every subdirectory of baseDir looking for *.catalogue.json files
 * (a directory may hold more than one — e.g. the real repo's SampleMap/
 * holds 8). Never writes anything; read-only.
 *
 * Returns one entry per catalogue.json file found:
 *   { sheetPngFilename, catalogueJsonPath, pngPath, catalogue }
 * where `catalogue` is the parsed JSON as-is (has .source, .sheetWidth,
 * .sheetHeight, .entries, and optionally the tile-grid fields).
 */
export async function scanCatalogueDir(baseDir) {
    const results = [];
    const topLevel = await readdir(baseDir, { withFileTypes: true });

    for (const dirent of topLevel) {
        if (!dirent.isDirectory()) continue;
        const sheetDir = join(baseDir, dirent.name);
        const files = await readdir(sheetDir);

        for (const file of files) {
            if (!file.endsWith('.catalogue.json')) continue;
            const catalogueJsonPath = join(sheetDir, file);
            const raw = await readFile(catalogueJsonPath, 'utf8');
            const catalogue = JSON.parse(raw);
            const pngPath = join(sheetDir, catalogue.source);

            results.push({
                sheetPngFilename: catalogue.source,
                sheetDirName: dirent.name,
                catalogueJsonPath,
                pngPath,
                catalogue,
            });
        }
    }

    return results;
}
