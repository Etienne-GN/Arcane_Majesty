#!/usr/bin/env node
/**
 * Validates cast files (src/data/cast, written by LPC Forge v2) against the
 * catalogue and the LPC library, and unit-tests castConfig.
 * Run: node tools/test_cast.mjs  (or npm test)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { castConfig } from '../src/systems/castLoader.js';
import { animPath } from '../src/systems/lpcLayout.js';

const CAT = JSON.parse(readFileSync(new URL('../src/data/character_catalogue.json', import.meta.url)));
const DIR = new URL('../src/data/cast/', import.meta.url);
const LIB = new URL('../ressources/lpc_merged/spritesheets/', import.meta.url);
const fails = []; let passed = 0;

// ── castConfig on fixtures ──
const L = [{ slot: 'body', type: 'body', id: 'bodies/male', zPos: 10, anims: ['walk'] }];
const fx = { a: { id: 'a', published: true, layers: L, variants: { v: { layers: [] } } }, b: { id: 'b', published: false, layers: L } };
const cfg = castConfig('a', undefined, fx);
if (cfg?.layers === L && cfg.defaultAnim === 'walk' && cfg.defaultDir === 'down') passed++; else fails.push('castConfig published');
if (castConfig('b', undefined, fx) === null) passed++; else fails.push('unpublished must be null');
if (castConfig('a', 'v', fx)?.layers.length === 0) passed++; else fails.push('variant layers');
if (castConfig('a', 'nope', fx) === null) passed++; else fails.push('unknown variant must be null');
if (castConfig('zzz', undefined, fx) === null) passed++; else fails.push('unknown id');
const withRules = { r: { id: 'r', published: true, layers: L, motionRules: { 'body|bodies/male|': { sit: { rule: 'hide' } } } } };
if (castConfig('r', undefined, withRules)?.motionRules?.['body|bodies/male|']?.sit?.rule === 'hide') passed++; else fails.push('castConfig must pass motionRules overrides');

// ── every cast file ──
const files = existsSync(DIR) ? readdirSync(DIR).filter(f => f.endsWith('.json')) : [];
for (const f of files) {
    let c;
    try { c = JSON.parse(readFileSync(new URL(f, DIR), 'utf8')); } catch { fails.push(`${f}: bad JSON`); continue; }
    if (c.id !== f.slice(0, -5)) fails.push(`${f}: id "${c.id}" ≠ filename`);
    const all = [['', c.layers], ...Object.entries(c.variants ?? {}).map(([n, v]) => [n + '/', v.layers])];
    for (const [where, layers] of all) for (const l of layers ?? []) {
        const known = (CAT[l.slot] ?? []).some(e => e.id === l.id || (e.companions ?? []).some(cp => cp.id === l.id));
        if (!known) fails.push(`${f}: ${where}${l.slot} unknown item ${l.id}`);
        const anim = l.anims?.includes('walk') ? 'walk' : (l.anims?.[0] ?? 'walk');
        const p = animPath(l, anim).replace(/^lpc\//, '');
        if (!existsSync(new URL(p, LIB))) fails.push(`${f}: ${where}missing file ${p}`);
    }
    passed++;
}
const idxUrl = new URL('index.js', DIR);
const idx = existsSync(idxUrl) ? readFileSync(idxUrl, 'utf8') : '';
const imported = [...idx.matchAll(/from '\.\/([a-z0-9_]+)\.json'/g)].map(m => m[1]).sort();
if (existsSync(idxUrl) && JSON.stringify(imported) === JSON.stringify(files.map(f => f.slice(0, -5)).sort())) passed++;
else fails.push(`index.js imports [${imported}] but files are [${files}]`);

if (fails.length) { console.error(`✗ cast: ${fails.length} failed\n  ` + fails.join('\n  ')); process.exit(1); }
console.log(`✓ cast: ${passed} checks, ${files.length} files ok`);
