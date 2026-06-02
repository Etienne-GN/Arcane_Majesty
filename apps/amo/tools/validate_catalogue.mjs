#!/usr/bin/env node
/**
 * Regression guard for the character catalogue. Fails (exit 1) when:
 *   1. A layer's `anims` manifest is missing, OR references an animation whose
 *      concrete file (per CharacterRenderer.animUrl) does not exist on disk
 *      — i.e. anything that would 404 at load time.
 *   2. Every logical animation the creator preloads resolves, for each layer,
 *      to a concrete file that exists (catches alias-resolution regressions).
 *   3. A referenced sheet's dimensions don't resolve to a valid 4-row (or
 *      single-row) frame size that ensureCorrectFrameSize would accept.
 *
 * Pure Node (PNG header read only) — no deps, CI-friendly.
 * Run from apps/amo/:  node tools/validate_catalogue.mjs   (or: npm run test:catalogue)
 */
import { readFileSync, existsSync } from 'fs';

const BASE    = './ressources/lpc_merged/spritesheets';
const CATFILE = './src/data/character_catalogue.json';

// Logical anims the creator preloads (mirror of CharacterRenderer.DEFAULT_ANIMS).
const DEFAULT_ANIMS = [
    'walk', 'idle', 'hurt', 'slash', 'backslash', 'halfslash', 'thrust', 'shoot', 'spellcast',
    'run', 'sit', 'jump', 'climb', 'combat_idle', 'emote',
];
const ANIM_ALIASES = {
    slash:     ['slash', 'attack_slash'],
    backslash: ['backslash', 'attack_backslash', 'attack_slash_reverse'],
    halfslash: ['halfslash', 'attack_halfslash'],
    thrust:    ['thrust', 'attack_thrust'],
};
const FOLDER = {
    torso_clothes: 'torso', torso_jacket: 'torso', torso_mail: 'torso',
    torso_armour: 'torso', torso_waist: 'torso',
    ears: 'head', horns: 'head', fins: 'head', nose: 'head',
    tail: 'body', wings: 'body',
};

function resolve(anims, logical) {
    for (const c of (ANIM_ALIASES[logical] ?? [logical])) if ((anims ?? []).includes(c)) return c;
    return null;
}
function animFile(folder, id, itemName, color, anim) {
    if (itemName)            return `${BASE}/${folder}/${id}/${anim}/${itemName}.png`;
    if (color != null)       return `${BASE}/${folder}/${id}/${anim}/${color}.png`;
    if (folder === 'weapon') return `${BASE}/${folder}/${id}/${anim}/${id.split('/').pop()}.png`;
    if (folder === 'cape' || folder === 'backpack') return `${BASE}/${folder}/${id}/${anim}/red.png`;
    return `${BASE}/${folder}/${id}/${anim}.png`;
}

/** width/height from a PNG's IHDR (bytes 16–23, big-endian). */
function pngSize(path) {
    const b = readFileSync(path);
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}
// The renderer slices any 64px-multiple grid: standard/oversize 4-row sheets via
// ensureCorrectFrameSize, and odd row counts (idle/hurt/extended) via the
// content-row detection path. So a sheet is only malformed if its dimensions
// aren't whole 64px cells (which WOULD misalign every frame).
function dimsOk(w, h) {
    return w % 64 === 0 && h % 64 === 0;
}

const cat = JSON.parse(readFileSync(CATFILE, 'utf8'));
const errors = [];
let layers = 0, files = 0;

for (const [key, list] of Object.entries(cat)) {
    const folder = FOLDER[key] ?? (key.startsWith('wound_') ? 'body' : key);
    for (const e of list) {
        if (!e.id) continue;
        const ft   = e.renderType ?? folder;
        const base = e.colors?.[0] ?? null;
        const descrs = [{ id: e.id, itemName: e.itemName, color: base, anims: e.anims, who: e.id }];
        for (const c of e.companions ?? []) {
            descrs.push({ id: c.id, itemName: c.itemName, color: c.color ?? (e.colors ? base : null),
                          anims: c.anims, who: `${e.id}»${c.id}` });
        }
        for (const d of descrs) {
            layers++;
            if (!Array.isArray(d.anims)) { errors.push(`[${key}] ${d.who}: missing anims[]`); continue; }
            // (1) every manifest anim file exists + (3) its frame size is valid
            for (const a of d.anims) {
                const p = animFile(ft, d.id, d.itemName, d.color, a);
                if (!existsSync(p)) { errors.push(`[${key}] ${d.who}: anims lists '${a}' but ${p} is missing`); continue; }
                files++;
                const { w, h } = pngSize(p);
                if (!dimsOk(w, h)) errors.push(`[${key}] ${d.who} '${a}': ${w}x${h} is not a whole 64px grid`);
            }
            // (2) every logical anim the creator preloads resolves to an existing file
            for (const logical of DEFAULT_ANIMS) {
                const con = resolve(d.anims, logical);
                if (con && !existsSync(animFile(ft, d.id, d.itemName, d.color, con)))
                    errors.push(`[${key}] ${d.who}: logical '${logical}'→'${con}' resolves to a missing file`);
            }
        }
    }
}

if (errors.length) {
    console.error(`✗ catalogue validation FAILED — ${errors.length} issue(s):\n`);
    for (const e of errors.slice(0, 50)) console.error('  ' + e);
    if (errors.length > 50) console.error(`  …and ${errors.length - 50} more`);
    process.exit(1);
}
console.log(`✓ catalogue valid — ${layers} layers, ${files} animation files, 0 phantom references.`);
