#!/usr/bin/env node
/**
 * Turn migrated compositions (tools/migrate_v1.py --out) into cast files under
 * apps/amo/src/data/cast, as drafts (published: false), with the same code the
 * Forge uses. Existing cast ids are left alone unless --force.
 * Usage: node tools/import_compositions.mjs <migrated.json> [--force]
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildCast, validateCast } from '../v2/src/model/cast.js';
import { writeCast } from '../castStore.js';

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('usage: import_compositions.mjs <migrated.json> [--force]'); process.exit(2); }
const force = flag === '--force';
const CAT = JSON.parse(readFileSync(new URL('../../../amo/src/data/character_catalogue.json', import.meta.url)));
const castDir = fileURLToPath(new URL('../../../amo/src/data/cast/', import.meta.url));

const entries = JSON.parse(readFileSync(file, 'utf8'));
let written = 0, skipped = 0, bad = 0;
for (const e of entries) {
    const cast = buildCast(CAT, {
        name: e.name, role: e.role, dbCharacter: e.dbCharacter, sel: e.comp.sel,
        migrationNotes: e.notes, published: false,
    });
    const errs = validateCast(CAT, cast);
    if (errs.length) { console.error(`✗ ${e.name}: ${errs.join('; ')}`); bad++; continue; }
    if (existsSync(`${castDir}${cast.id}.json`) && !force) { console.log(`- ${cast.id}: exists, skipped (use --force)`); skipped++; continue; }
    writeCast(castDir, cast);
    console.log(`✓ ${cast.id} (${cast.role}${cast.dbCharacter ? ', ' + cast.dbCharacter : ''}): ${cast.layers.length} layers, ${e.notes.length} notes`);
    written++;
}
console.log(`\n${written} written, ${skipped} skipped, ${bad} invalid → ${castDir}`);
process.exit(bad ? 1 : 0);
