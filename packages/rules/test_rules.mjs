// The rules boundary holds: everything in index.js imports in plain Node (no browser, no
// Phaser, no Three.js), and nothing in its import graph reaches for an engine package.
// Run: node packages/rules/test_rules.mjs
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;
const check = (ok, msg) => { if (!ok) { failed++; console.error('  ✗', msg); } };

// 1. It all loads without a DOM.
const rules = await import('./index.js');
const names = Object.keys(rules);
check(names.length >= 50, `expected the full rules surface, got ${names.length} modules`);
for (const n of names) check(Object.keys(rules[n]).length > 0, `${n} exports nothing`);

// 2. No engine package anywhere in the import graph.
const FORBIDDEN = /from\s+['"](phaser|three|socket\.io-client)['"]/;
const seen = new Set();
function walk(file) {
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    check(!FORBIDDEN.test(src), `${file.replace(resolve(here, '../..') + '/', '')} imports an engine package`);
    for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s+['"](\.[^'"]+)['"]/g)) walk(resolve(dirname(file), m[1]));
}
walk(resolve(here, 'index.js'));

// 3. The pieces the 3D client relies on are where it expects them.
check(typeof rules.PlayerStats.PlayerStats === 'function', 'PlayerStats class');
check(typeof rules.movementRules.hopLanding === 'function', 'movementRules.hopLanding');
check(!!rules.spells.SPELLS.fireball, 'spells.SPELLS.fireball');
check(!!rules.enemies.ENEMY_TYPES.mirror_shade, 'enemies.ENEMY_TYPES.mirror_shade');
check(typeof rules.enemyAffinities.affinityMult === 'function', 'enemyAffinities.affinityMult');
check(!!rules.statuses.STATUS_DEFS.burning, 'statuses.STATUS_DEFS.burning');
check(typeof rules.SaveManager.SaveManager.save === 'function', 'SaveManager.save');

console.log(failed ? `rules: ${failed} problem(s)` : `rules: ${names.length} modules, ${seen.size} files, engine-free ✓`);
process.exit(failed ? 1 : 0);
