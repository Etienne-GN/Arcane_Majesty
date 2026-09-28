import { readFile, writeFile } from 'node:fs/promises';
import { scanCatalogueDir } from './catalogueScanner.js';

export const LAYERS = ['under', 'sorted', 'over'];

/**
 * The size of the box a hitbox is relative to: the sprite's own box, or for
 * an animation the largest frame (frames are drawn bottom-centred in it,
 * both in the game and in the ledger previews).
 */
export function spriteSize(catalogue, entry) {
    if (entry.frames?.length > 1) {
        return { w: Math.max(...entry.frames.map(f => f.w)), h: Math.max(...entry.frames.map(f => f.h)) };
    }
    if (entry.kind === 'tile') return { w: catalogue.gridTileWidth, h: catalogue.gridTileHeight };
    return { w: entry.w, h: entry.h };
}

/** Throws unless `hitbox` is null or a whole-pixel box inside the sprite. */
export function checkHitbox(hitbox, size) {
    if (hitbox === null) return;
    const { x, y, w, h } = hitbox ?? {};
    if (![x, y, w, h].every(Number.isInteger)) throw new Error('hitbox needs integer x, y, w, h');
    if (w <= 0 || h <= 0) throw new Error('hitbox w/h must be positive');
    if (x < 0 || y < 0 || x + w > size.w || y + h > size.h) {
        throw new Error(`hitbox ${x},${y} ${w}x${h} is outside the ${size.w}x${size.h} sprite`);
    }
}

/**
 * Writes `hitbox` (null = no collision) and/or `layer` onto one catalogue
 * entry. Either may be left undefined to keep the current value. Writes the
 * catalogue back in the repo's usual format (2-space JSON + newline).
 */
export async function setEntryPhysics(catalogueDir, sheetPngFilename, entryName, { hitbox, layer }) {
    if (layer !== undefined && !LAYERS.includes(layer)) throw new Error(`invalid layer: ${layer}`);
    const sheets = await scanCatalogueDir(catalogueDir);
    const sheet = sheets.find(s => s.sheetPngFilename === sheetPngFilename);
    if (!sheet) throw new Error(`unknown sheet: ${sheetPngFilename}`);
    const catalogue = JSON.parse(await readFile(sheet.catalogueJsonPath, 'utf8'));
    const entry = catalogue.entries.find(e => e.name === entryName);
    if (!entry) throw new Error(`unknown sprite: ${sheetPngFilename}::${entryName}`);
    if (hitbox !== undefined) {
        checkHitbox(hitbox, spriteSize(catalogue, entry));
        entry.hitbox = hitbox === null ? null : { x: hitbox.x, y: hitbox.y, w: hitbox.w, h: hitbox.h };
    }
    if (layer !== undefined) entry.layer = layer;
    await writeFile(sheet.catalogueJsonPath, JSON.stringify(catalogue, null, 2) + '\n', 'utf8');
    return entry;
}
