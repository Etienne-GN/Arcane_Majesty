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

/**
 * Batch version of setEntryPhysics: items [{ sheet, name, hitbox?, layer? }].
 * Everything is checked before anything is written; each catalogue is
 * written once. Returns the updated entries in the same order.
 */
export async function setEntriesPhysics(catalogueDir, items) {
    const sheets = await scanCatalogueDir(catalogueDir);
    const bySheet = new Map(sheets.map(s => [s.sheetPngFilename, s]));
    const loaded = new Map(); // catalogueJsonPath -> catalogue
    const plan = [];
    for (const it of items) {
        if (it.layer !== undefined && !LAYERS.includes(it.layer)) throw new Error(`invalid layer: ${it.layer}`);
        const sheet = bySheet.get(it.sheet);
        if (!sheet) throw new Error(`unknown sheet: ${it.sheet}`);
        if (!loaded.has(sheet.catalogueJsonPath)) {
            loaded.set(sheet.catalogueJsonPath, JSON.parse(await readFile(sheet.catalogueJsonPath, 'utf8')));
        }
        const catalogue = loaded.get(sheet.catalogueJsonPath);
        const entry = catalogue.entries.find(e => e.name === it.name);
        if (!entry) throw new Error(`unknown sprite: ${it.sheet}::${it.name}`);
        if (it.hitbox !== undefined) checkHitbox(it.hitbox, spriteSize(catalogue, entry));
        plan.push({ it, entry });
    }
    for (const { it, entry } of plan) {
        if (it.hitbox !== undefined) entry.hitbox = it.hitbox === null ? null : { x: it.hitbox.x, y: it.hitbox.y, w: it.hitbox.w, h: it.hitbox.h };
        if (it.layer !== undefined) entry.layer = it.layer;
    }
    for (const [path, catalogue] of loaded) {
        await writeFile(path, JSON.stringify(catalogue, null, 2) + '\n', 'utf8');
    }
    return plan.map(p => p.entry);
}
