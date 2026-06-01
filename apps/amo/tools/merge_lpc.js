#!/usr/bin/env node
/**
 * LPC Spritesheet Merge Tool
 *
 * Strategy:
 *   - Universal LPC is PRIMARY — wins on all overlapping items (newer: 2026-05)
 *   - Vitruvius SUPPLEMENTS — adds unique categories and animations not in Universal
 *   - ElizaWy stays separate (incompatible proportions, not merged)
 *
 * Usage:
 *   node tools/merge_lpc.js [--dry-run]
 */

import fs   from 'fs';
import path from 'path';

const DRY_RUN    = process.argv.includes('--dry-run');
const RESSOURCES = new URL('../ressources', import.meta.url).pathname;

const SRC_UNIVERSAL  = path.join(RESSOURCES, 'lpc_universal/spritesheets');
const SRC_VITRUVIUS  = path.join(RESSOURCES, 'lpc_vitruvius');
const OUT            = path.join(RESSOURCES, 'lpc_merged');

// Animation name mapping: Vitruvius name → Universal LPC name
const ANIM_MAP = {
    spell:     'spellcast',
    backslash: 'attack_backslash',
    slash:     'attack_slash',
    thrust:    'attack_thrust',
    shoot:     'shoot',
    walk:      'walk',
    idle:      'idle',
    hurt:      'hurt',
    rod:       'rod',
    whip:      'whip',
    gallop:    'gallop',
};

// Vitruvius → Universal LPC category path mapping
// left = vitruvius relative path prefix, right = universal spritesheets/ prefix
// null means "no Universal equivalent — add to vitruvius_unique/"
const CATEGORY_MAP = {
    'anatomy/body':          'body/bodies',
    'anatomy/beards':        'beards',
    'anatomy/ears':          'head/ears',
    'anatomy/eyes':          'eyes',
    'anatomy/hair':          'hair',
    'anatomy/head':          'head',
    'anatomy/horns':         'head/horns',
    'anatomy/shadow':        'shadow',
    'anatomy/tail':          'body/tail',
    'anatomy/wings':         'body/wings',
    'anatomy/wound':         'body/wound',
    'anatomy/fins':          null,
    'anatomy/nose':          null,
    'anatomy/wrinkles':      null,
    'clothes/arms':          'arms',
    'clothes/cape':          'cape',
    'clothes/dress':         'dress',
    'clothes/ears':          'head/ears',
    'clothes/eyes':          'eyes',
    'clothes/feet':          'feet',
    'clothes/hat':           'hat',
    'clothes/head_coverings':'hat',
    'clothes/legs':          'legs',
    'clothes/neck':          'neck',
    'clothes/shoulders':     'shoulders',
    'clothes/torso':         'torso',
    'clothes/buckles':       null,
    'clothes/closure':       null,
    'clothes/collar':        null,
    'clothes/hands':         null,
    'clothes/helmet_accessory': null,
    'clothes/helmet_visor':  null,
    'clothes/pockets':       null,
    'clothes/skirts':        null,
    'clothes/torso2':        null,
    'clothes/torso3':        null,
    'clothes/trim':          null,
    'clothes/waist':         null,
    'clothes/wrists':        null,
    'equipment/swords':      'weapon/sword',
    'equipment/bows':        'weapon/ranged',
    'equipment/staffs':      'weapon/magic',
    'equipment/spears':      'weapon/polearm',
    'equipment/misc':        'weapon/blunt',
    'equipment/shields':     'shield',
    'equipment/tools':       'tools',
    'equipment/bow_accessory':   null,
    'equipment/staff_accessory': null,
    'injuries':              null,
    'horse':                 null,
};

let copied = 0, skipped = 0, added = 0;

function ensureDir(p) {
    if (!DRY_RUN) fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
    ensureDir(path.dirname(dest));
    if (!DRY_RUN) fs.copyFileSync(src, dest);
}

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    ensureDir(dest);
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(s, d);
        } else {
            copyFile(s, d);
            copied++;
        }
    }
}

// Step 1: Mirror Universal LPC → lpc_merged/spritesheets/
console.log('\n[1/3] Copying Universal LPC (primary source)…');
copyDirRecursive(SRC_UNIVERSAL, path.join(OUT, 'spritesheets'));
console.log(`      ${copied.toLocaleString()} files copied`);

// Step 2: Walk Vitruvius and add unique content
console.log('\n[2/3] Merging Vitruvius supplements…');

function vitPathToUniversal(relVitPath) {
    for (const [prefix, universalPrefix] of Object.entries(CATEGORY_MAP)) {
        if (relVitPath.startsWith(prefix + '/') || relVitPath === prefix) {
            return universalPrefix;  // null = unique, string = universal path prefix
        }
    }
    return undefined;  // unmapped — flag for review
}

function getAnimationName(filename) {
    // filename is e.g. "slash.png" → "slash"
    return path.basename(filename, '.png');
}

function walkVitruvius(vitDir, relBase = '') {
    if (!fs.existsSync(vitDir)) return;

    for (const entry of fs.readdirSync(vitDir, { withFileTypes: true })) {
        const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
        const fullSrc = path.join(vitDir, entry.name);

        if (entry.isDirectory()) {
            walkVitruvius(fullSrc, relPath);
        } else if (entry.name.endsWith('.png')) {
            // Determine what category this belongs to
            const universalPrefix = vitPathToUniversal(relBase);

            if (universalPrefix === null) {
                // Vitruvius-unique category — copy to vitruvius_unique/
                const dest = path.join(OUT, 'spritesheets', 'vitruvius_unique', relPath);
                copyFile(fullSrc, dest);
                added++;
            } else if (universalPrefix === undefined) {
                // Unmapped path — log for manual review
                console.warn(`  [REVIEW] Unmapped Vitruvius path: ${relPath}`);
                skipped++;
            } else {
                // Overlapping category — check if this specific animation exists in Universal
                // Extract animation name from the filename
                const animVit  = getAnimationName(entry.name);
                const animUniv = ANIM_MAP[animVit] ?? animVit;

                // Look for corresponding animation file in Universal output
                const universalDir = path.join(OUT, 'spritesheets', universalPrefix);
                const animExists   = checkAnimExists(universalDir, animUniv);

                if (!animExists) {
                    // Animation missing in Universal for this category — add from Vitruvius
                    const dest = path.join(OUT, 'spritesheets', universalPrefix,
                        '_from_vitruvius', relBase.replace(/^[^/]+\/[^/]+\//, ''), entry.name);
                    copyFile(fullSrc, dest);
                    added++;
                    console.log(`  [ADD ANIM] ${relPath} → ${universalPrefix}/_from_vitruvius/`);
                } else {
                    // Universal has this — skip (Universal is newer)
                    skipped++;
                }
            }
        }
    }
}

function checkAnimExists(dir, animName) {
    if (!fs.existsSync(dir)) return false;
    // Check recursively if any file named animName.png exists under this dir
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.isDirectory()) {
                if (checkAnimExists(path.join(dir, e.name), animName)) return true;
            } else if (e.name === `${animName}.png` || e.name.includes(animName)) {
                return true;
            }
        }
    } catch { /* dir not readable */ }
    return false;
}

walkVitruvius(SRC_VITRUVIUS);
console.log(`      ${added.toLocaleString()} unique Vitruvius files added`);
console.log(`      ${skipped.toLocaleString()} Vitruvius files skipped (Universal wins or unmapped)`);

// Step 3: Generate merged CREDITS.md
console.log('\n[3/3] Generating CREDITS.md…');

let creditLines = [
    '# LPC Merged Spritesheet Credits',
    '',
    'This merged spritesheet collection combines assets from:',
    '',
    '## Universal LPC (primary)',
    'https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator',
    'License: GPL-3.0 / CC-BY-SA 3.0 per asset — see lpc_universal/CREDITS.csv for full attribution',
    '',
    '## Vitruvius Studio (supplement)',
    'https://github.com/vitruvianstudio/spritesheets',
    'License: CC-BY-SA 3.0 — see lpc_vitruvius/credits.json for per-item attribution',
    '',
    '---',
    'Individual artist credits are in the source repos linked above.',
    'The in-game Credits screen acknowledges LPC contributors as a collective.',
];

if (!DRY_RUN) {
    ensureDir(OUT);
    fs.writeFileSync(path.join(OUT, 'CREDITS.md'), creditLines.join('\n') + '\n');
}

console.log('\n✓ Merge complete.');
console.log(`  Output: ${OUT}`);
console.log(`  Copied from Universal: ${copied.toLocaleString()}`);
console.log(`  Added from Vitruvius:  ${added.toLocaleString()}`);
console.log(`  Skipped (Universal wins): ${skipped.toLocaleString()}`);
if (DRY_RUN) console.log('\n  (DRY RUN — no files written)');
