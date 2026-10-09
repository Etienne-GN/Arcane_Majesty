#!/usr/bin/env node
/**
 * Regenerate the `layers` of every cast file from its own composition (`sel`,
 * variants) after a catalogue change (new motions, tint sources, ...). Nothing
 * else changes: name, role, lore link, published state, rules and notes are kept.
 * Files whose layers are already current are left untouched.
 * Usage: node tools/rebuild_cast_layers.mjs [--dry-run]
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildCast, validateCast } from '../v2/src/model/cast.js';
import { listCast, writeCast } from '../castStore.js';

const dry = process.argv.includes('--dry-run');
const CAT = JSON.parse(readFileSync(new URL('../../../amo/src/data/character_catalogue.json', import.meta.url)));
const castDir = fileURLToPath(new URL('../../../amo/src/data/cast/', import.meta.url));

let rebuilt = 0, current = 0, bad = 0;
for (const c of listCast(castDir)) {
    if (!validateCast(CAT, c).includes('layers are stale')) { current++; continue; }
    const next = buildCast(CAT, {
        id: c.id, name: c.name, role: c.role, dbCharacter: c.dbCharacter, sel: c.sel,
        variants: Object.fromEntries(Object.entries(c.variants ?? {}).map(([n, v]) => [n, v.sel])),
        published: c.published, migrationNotes: c.migrationNotes, motionRules: c.motionRules,
    });
    const errs = validateCast(CAT, next);
    if (errs.length) { console.error(`✗ ${c.id}: ${errs.join('; ')}`); bad++; continue; }
    console.log(`${dry ? '~' : '✓'} ${c.id}: layers rebuilt`);
    if (!dry) writeCast(castDir, next);
    rebuilt++;
}
console.log(`\n${rebuilt} rebuilt, ${current} already current, ${bad} invalid${dry ? ' (dry run)' : ''}`);
process.exit(bad ? 1 : 0);
