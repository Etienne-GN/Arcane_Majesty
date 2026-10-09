#!/usr/bin/env node
/** Unit tests for the Forge v2 sheet-cache LRU. Run: node v2/tests/test_lru.mjs */
import { Lru } from '../src/render/lru.js';

let passed = 0; const fails = [];
function check(name, got, want) {
    if (JSON.stringify(got) === JSON.stringify(want)) passed++;
    else fails.push(`${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
}

const c = new Lru(2);
c.set('a', 1); c.set('b', 2);
check('has a', c.has('a'), true);
c.get('a');                       // a is now most recent
c.set('c', 3);                    // evicts b, the least recently used
check('b evicted', c.has('b'), false);
check('a kept', c.get('a'), 1);
check('c kept', c.get('c'), 3);
check('size capped', c.size, 2);
c.set('a', 9);                    // overwrite keeps size
check('overwrite', [c.get('a'), c.size], [9, 2]);
c.delete('a');
check('delete', c.has('a'), false);

if (fails.length) { console.error(`✗ lru: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ lru: ${passed} passed`);
