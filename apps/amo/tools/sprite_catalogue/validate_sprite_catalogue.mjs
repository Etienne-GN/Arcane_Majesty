#!/usr/bin/env node
/**
 * Validator / trust gate for sprite catalogue sidecar files (*.catalogue.json).
 * Checks: declared sheet dimensions match the real source PNG, entry name
 * uniqueness, valid `kind`, tile row/col within the declared grid (+
 * frameIndex correctness), and object bounding boxes within sheet bounds.
 * Reports `lowConfidence` entries as non-fatal warnings.
 *
 * Pure Node (PNG header read only) — no deps. Mirrors validate_catalogue.mjs.
 *
 * Usage: node validate_sprite_catalogue.mjs <file.catalogue.json> [...more]
 */
import { readFileSync, existsSync, mkdirSync, renameSync } from 'fs';
import { dirname, join } from 'path';

const PNG_SIGNATURE = '89504e470d0a1a0a';
const ASSETS_MARKER = 'public/assets/';

/** width/height from a PNG's IHDR (bytes 16–23, big-endian). */
function pngSize(path) {
    const b = readFileSync(path);
    if (b.length < 24 || b.toString('hex', 0, 8) !== PNG_SIGNATURE) {
        throw new Error(`not a valid PNG: ${path}`);
    }
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

/**
 * Validates an already-parsed catalogue object. `baseDir` is the directory
 * the catalogue file lives in, used to resolve `source` on disk.
 * Returns { errors: string[], warnings: string[] }.
 */
export function validateCatalogueObject(cat, baseDir) {
    const errors = [];
    const warnings = [];

    if (!cat.source) {
        errors.push('missing "source"');
    } else {
        const sourcePath = join(baseDir, cat.source);
        if (!existsSync(sourcePath)) {
            errors.push(`source file not found: ${sourcePath}`);
        } else {
            const real = pngSize(sourcePath);
            if (real.w !== cat.sheetWidth || real.h !== cat.sheetHeight) {
                errors.push(
                    `sheetWidth/sheetHeight (${cat.sheetWidth}x${cat.sheetHeight}) ` +
                    `doesn't match real PNG dims (${real.w}x${real.h})`
                );
            }
        }
    }

    const entries = cat.entries ?? [];
    const hasTileEntries = entries.some(e => e.kind === 'tile');
    const gridFields = ['gridTileWidth', 'gridTileHeight', 'gridCols', 'gridRows'];
    const gridComplete = gridFields.every(f => cat[f] != null);
    if (hasTileEntries && !gridComplete) {
        for (const f of gridFields) {
            if (cat[f] == null) errors.push(`missing "${f}" (required — file has "tile" entries)`);
        }
    }

    const seenNames = new Set();
    entries.forEach((e, i) => {
        const tag = e.name ? `"${e.name}"` : `entries[${i}]`;

        if (!e.name) {
            errors.push(`${tag}: missing "name"`);
        } else if (seenNames.has(e.name)) {
            errors.push(`duplicate name: "${e.name}"`);
        } else {
            seenNames.add(e.name);
        }

        if (e.kind !== 'tile' && e.kind !== 'object') {
            errors.push(`${tag}: invalid kind "${e.kind}" (must be "tile" or "object")`);
            return;
        }

        if (e.kind === 'tile') {
            if (!gridComplete) return; // already reported above
            if (!(e.row >= 0 && e.row < cat.gridRows)) {
                errors.push(`${tag}: row ${e.row} out of range [0, ${cat.gridRows})`);
            }
            if (!(e.col >= 0 && e.col < cat.gridCols)) {
                errors.push(`${tag}: col ${e.col} out of range [0, ${cat.gridCols})`);
            }
            const expected = e.row * cat.gridCols + e.col;
            if (e.frameIndex !== expected) {
                errors.push(`${tag}: frameIndex ${e.frameIndex} !== row*gridCols+col (${expected})`);
            }
        } else {
            const { x, y, w, h } = e;
            if (!(w > 0 && h > 0)) {
                errors.push(`${tag}: w/h must be > 0 (got ${w}x${h})`);
            }
            if (x < 0 || y < 0 || x + w > cat.sheetWidth || y + h > cat.sheetHeight) {
                errors.push(
                    `${tag}: bbox (${x},${y},${w},${h}) out of sheet bounds ` +
                    `(${cat.sheetWidth}x${cat.sheetHeight})`
                );
            }
        }

        if (e.lowConfidence) warnings.push(`${tag}: flagged lowConfidence — needs human review`);
    });

    return { errors, warnings };
}

/** Reads and parses a *.catalogue.json file, then validates it. */
export function validateCatalogueFile(catPath) {
    const cat = JSON.parse(readFileSync(catPath, 'utf8'));
    return validateCatalogueObject(cat, dirname(catPath));
}

/**
 * Maps a raw-pool path to its mirrored location under public/assets/catalogued/.
 * Idempotent: a path already inside catalogued/ is returned unchanged.
 * Throws if the path doesn't contain an `assetsMarker` segment at all.
 */
export function relocatedPath(path, assetsMarker = ASSETS_MARKER) {
    const idx = path.indexOf(assetsMarker);
    if (idx === -1) throw new Error(`path does not contain "${assetsMarker}": ${path}`);
    const prefix = path.slice(0, idx + assetsMarker.length);
    const rel = path.slice(idx + assetsMarker.length);
    if (rel.startsWith('catalogued/')) return path; // already relocated
    return join(prefix, 'catalogued', rel);
}

/**
 * Moves each path in `paths` to its relocatedPath() destination, creating
 * directories as needed. Paths already under catalogued/ are left in place.
 * Returns the list of moves actually performed.
 */
export function relocateToCatalogued(paths, assetsMarker = ASSETS_MARKER) {
    const moved = [];
    for (const p of paths) {
        const dest = relocatedPath(p, assetsMarker);
        if (dest === p) continue;
        mkdirSync(dirname(dest), { recursive: true });
        renameSync(p, dest);
        moved.push({ from: p, to: dest });
    }
    return moved;
}

// ── CLI entrypoint ──────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
    const files = process.argv.slice(2);
    if (!files.length) {
        console.error('usage: node validate_sprite_catalogue.mjs <file.catalogue.json> [...]');
        process.exit(1);
    }
    let hardFail = false;
    for (const f of files) {
        const { errors, warnings } = validateCatalogueFile(f);
        for (const w of warnings) console.warn(`⚠ ${f}: ${w}`);
        for (const e of errors) console.error(`✗ ${f}: ${e}`);
        if (errors.length) {
            hardFail = true;
            continue;
        }
        const cat = JSON.parse(readFileSync(f, 'utf8'));
        const sourcePath = join(dirname(f), cat.source);
        const moved = relocateToCatalogued([f, sourcePath]);
        const suffix = warnings.length ? ` (${warnings.length} warning(s))` : '';
        console.log(
            moved.length
                ? `✓ ${f} OK${suffix} — moved to ${dirname(relocatedPath(f))}/`
                : `✓ ${f} OK${suffix} — already in catalogued/`
        );
    }
    process.exit(hardFail ? 1 : 0);
}
