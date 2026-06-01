#!/usr/bin/env node
/**
 * Generates src/data/character_catalogue.json from lpc_merged/spritesheets.
 * Run from apps/amo/: node tools/gen_catalogue.js
 *
 * Entry shape:
 *   { id, label, zPos, colors?: string[], companions?: [{id, zPos}] }
 *
 * Torso is split into 5 sub-slots (torso_clothes, torso_jacket, torso_mail,
 * torso_armour, torso_waist). Their entries have ids that include the
 * sub-directory prefix (e.g. "clothes/shirt/male") so the renderer resolves
 * them as  lpc/torso/{id}/walk.png  unchanged.
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const BASE    = './ressources/lpc_merged/spritesheets';
const OUTFILE = './src/data/character_catalogue.json';

const ZPOS = {
    shadow: -2,    body: 10,   head: 20,   eyes: 25,
    nose: 21,      ears: 22,   ear_bg: 15, fins: 26,
    hair: 50,      beards: 55, facial: 60, neck: 65,
    horns: 95,
    torso_clothes: 35, torso_jacket: 55, torso_mail: 50, torso_armour: 60, torso_waist: 70,
    legs: 40,      dress: 35,  feet: 14,   arms: 45,   shoulders: 70,
    hat: 100,      cape: 170,  cape_behind: -5,
    backpack: 130, shield: 190, weapon: 140,
    tail: 12,      wings: 65,
};

const WEAPON_CATS = new Set(['weapon']);
const COLOR_CATS  = new Set(['cape', 'backpack']);
const TORSO_SUBS  = [
    { key: 'torso_clothes', dirs: ['clothes', 'aprons', 'bandage'], zPos: ZPOS.torso_clothes },
    { key: 'torso_jacket',  dirs: ['jacket'],                       zPos: ZPOS.torso_jacket  },
    { key: 'torso_mail',    dirs: ['chainmail'],                    zPos: ZPOS.torso_mail    },
    { key: 'torso_armour',  dirs: ['armour'],                       zPos: ZPOS.torso_armour  },
    { key: 'torso_waist',   dirs: ['waist'],                        zPos: ZPOS.torso_waist   },
];

// All optional (non-body) types
const OPTIONAL = new Set([
    'head', 'ears', 'horns', 'fins', 'nose', 'hair', 'eyes', 'beards', 'facial', 'neck',
    'tail', 'wings',
    'torso_clothes', 'torso_jacket', 'torso_mail', 'torso_armour', 'torso_waist',
    'legs', 'dress', 'feet', 'arms', 'shoulders',
    'hat', 'cape', 'backpack', 'shield', 'weapon',
]);

const SKIP_LABEL = new Set(['bodies', 'heads', 'faces', 'wounds', 'prosthesis', 'fg', 'bg']);
const GENERIC    = new Set([
    'adult', 'child', 'male', 'female', 'elderly', 'teen', 'thin', 'muscular',
    'pregnant', 'fg', 'bg', 'behind', 'foreground', 'universal_behind',
    'default', 'neutral', 'basic',
]);

function humanize(id) {
    const parts = id.split('/')
        .filter(s => s && !s.startsWith('_') && !SKIP_LABEL.has(s));
    const last = parts[parts.length - 1] ?? id.split('/').pop();
    const prev = parts[parts.length - 2];
    const tail = (GENERIC.has(last) && prev) ? `${prev} ${last}` : last;
    return tail.replace(/_/g, ' ')
        .split(' ').filter(Boolean)
        .map(w => w[0].toUpperCase() + w.slice(1))
        .join(' ');
}

function find(pattern) {
    try {
        return execSync(`find ${pattern} 2>/dev/null`, { encoding: 'utf8' })
            .trim().split('\n').filter(Boolean);
    } catch { return []; }
}

// fg/bg/behind are layer structure words, never actual color variants
const STRUCTURAL_COLOR = new Set(['fg', 'bg', 'behind', 'foreground', 'universal_behind']);

function allColorsIn(walkDir) {
    try {
        return execSync(`ls "${walkDir}" 2>/dev/null`, { encoding: 'utf8' })
            .trim().split('\n')
            .filter(f => f.endsWith('.png') && !f.startsWith('_'))
            .map(f => f.replace('.png', ''))
            .filter(n => !STRUCTURAL_COLOR.has(n))
            .sort();
    } catch { return ['red']; }
}

// ── Scan strategies ────────────────────────────────────────────────────────────

/**
 * Unified scanner: picks up both flat walk.png entries and color-variant
 * walk/{color}.png entries from the same directory tree.
 * skipPattern is an optional extra -not -path argument.
 */
function scanBoth(srcDir, zPos, skipPattern = '') {
    const skip = skipPattern ? ` -not -path "${skipPattern}"` : '';
    const results   = [];
    const coloredIds = new Set();

    // Colored scan first — takes priority when both walk.png and walk/ exist for the same id
    find(`${srcDir} -type d -name "walk" -not -path "*/_from_vitruvius/*"${skip}`)
        .forEach(p => {
            const id     = p.replace(`${srcDir}/`, '').replace('/walk', '');
            const colors = allColorsIn(p);
            if (colors.length === 0) return; // only structural fg/bg files, skip
            // Single file matching a path ancestor → itemName format (e.g. skeleton.png)
            const pathParts = id.split('/');
            if (colors.length === 1 && pathParts.includes(colors[0])) {
                results.push({ id, label: humanize(id), zPos, itemName: colors[0] });
            } else {
                results.push({ id, label: humanize(id), zPos, colors });
            }
            coloredIds.add(id);
        });

    // Flat scan second — skip ids already covered by a colored entry
    find(`${srcDir} -name "walk.png" -not -path "*/_from_vitruvius/*"${skip}`)
        .forEach(p => {
            const id = p.replace(`${srcDir}/`, '').replace('/walk.png', '');
            if (!coloredIds.has(id)) results.push({ id, label: humanize(id), zPos });
        });

    return results;
}

function scanStandard(type) {
    return scanBoth(`${BASE}/${type}`, ZPOS[type] ?? 0);
}

function scanWeapon(type) {
    return find(`${BASE}/${type} -type d -name "walk" -not -path "*/_from_vitruvius/*"`)
        .map(p => {
            const id = p.replace(`${BASE}/${type}/`, '').replace('/walk', '');
            return { id, label: humanize(id), zPos: ZPOS[type] ?? 0 };
        });
}

function scanColor(type) {
    return find(`${BASE}/${type} -type d -name "walk" -not -path "*/_from_vitruvius/*"`)
        .map(p => {
            const id     = p.replace(`${BASE}/${type}/`, '').replace('/walk', '');
            const colors = allColorsIn(p);
            return { id, label: humanize(id), zPos: ZPOS[type] ?? 0, colors };
        });
}

/** Scan one or more sub-directories inside torso/, prefixing ids accordingly */
function scanTorsoSub(dirs, zPos) {
    const results = [];
    for (const subDir of dirs) {
        scanBoth(`${BASE}/torso/${subDir}`, zPos).forEach(e => {
            results.push({ ...e, id: `${subDir}/${e.id}` });
        });
    }
    return results;
}

/** Scan a sub-directory inside head/, prefixing ids so URL resolves as lpc/head/{subDir}/... */
function scanHeadSub(subDir, zPos) {
    return scanBoth(`${BASE}/head/${subDir}`, zPos).map(e => ({
        ...e, id: `${subDir}/${e.id}`,
    }));
}

// ── Companion grouping ─────────────────────────────────────────────────────────

function groupWithBehind(entries) {
    const byId   = new Map(entries.map(e => [e.id, e]));
    const skip   = new Set();
    const result = [];
    for (const entry of entries) {
        if (skip.has(entry.id)) continue;
        const style    = entry.id.split('/')[0];
        const behindId = `${style}_behind`;
        if (byId.has(behindId) && !skip.has(behindId)) {
            result.push({ ...entry, companions: [{ id: behindId, zPos: ZPOS.cape_behind }] });
            skip.add(behindId);
        } else {
            result.push(entry);
        }
    }
    return result;
}

function groupFgBg(entries, bgZPos = 5) {
    const byId   = new Map(entries.map(e => [e.id, e]));
    const skip   = new Set();
    const result = [];
    for (const entry of entries) {
        if (skip.has(entry.id)) continue;
        if (entry.id.endsWith('/fg')) {
            const base = entry.id.slice(0, -3);
            const bgId = `${base}/bg`;
            if (byId.has(bgId) && !skip.has(bgId)) {
                result.push({ ...entry, label: humanize(base), companions: [{ id: bgId, zPos: bgZPos }] });
                skip.add(bgId);
                continue;
            }
        }
        result.push(entry);
    }
    return result;
}

// ── Build catalogue ────────────────────────────────────────────────────────────

const STANDARD_CATS = [
    'body', 'head', 'hair', 'eyes',
    'beards', 'facial', 'neck', 'dress',
    'legs', 'feet', 'arms', 'shoulders', 'hat', 'shield',
];
const catalogue = {};

// Standard and color types
for (const type of STANDARD_CATS) {
    // Restrict body/head scans to their canonical subdirs — other sub-dirs are separate slots
    // Bodies come in two formats: flat walk.png (human) or walk/name.png (skeleton, zombie)
    let entries = type === 'head'
        ? scanBoth(`${BASE}/head/heads`, ZPOS.head).map(e => ({ ...e, id: `heads/${e.id}` }))
        : type === 'hat'
        ? scanBoth(`${BASE}/hat`, ZPOS.hat, '*/accessory/horns_*/*')
        : type === 'body'
        ? [
            ...find(`${BASE}/body/bodies -name "walk.png" -not -path "*/_from_vitruvius/*"`)
                .map(p => ({ id: p.replace(`${BASE}/body/`, '').replace('/walk.png', ''), label: humanize(p.replace(`${BASE}/body/bodies/`, '').replace('/walk.png', '')), zPos: ZPOS.body })),
            ...find(`${BASE}/body/bodies -type d -name "walk" -not -path "*/_from_vitruvius/*"`)
                .map(p => { const id = p.replace(`${BASE}/body/`, '').replace('/walk', ''); return { id, label: humanize(id.replace('bodies/', '')), zPos: ZPOS.body, itemName: id.split('/').pop() }; }),
          ]
        : scanStandard(type);
    if (type === 'hair')   entries = groupFgBg(entries);
    if (type === 'shield') entries = groupFgBg(entries, ZPOS.shield - 2);
    const seen = new Set();
    entries = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    if (OPTIONAL.has(type)) entries = [{ id: null, label: 'None', zPos: ZPOS[type] ?? 0 }, ...entries];
    catalogue[type] = entries;
    console.log(`${type.padEnd(14)}: ${entries.filter(e => e.id).length} sprites`);
}

// Color types
for (const type of ['cape', 'backpack']) {
    let entries = scanColor(type);
    if (type === 'cape') entries = groupWithBehind(entries);
    const seen = new Set();
    entries = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    entries = [{ id: null, label: 'None', zPos: ZPOS[type] ?? 0 }, ...entries];
    catalogue[type] = entries;
    const n = entries.filter(e => e.id).length;
    const c = entries.filter(e => e.id && e.companions).length;
    console.log(`${type.padEnd(14)}: ${n} sprites${c ? ` (${c} compound)` : ''} (colored)`);
}

// Weapon
{
    let entries = scanWeapon('weapon');
    const seen = new Set();
    entries = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    entries = [{ id: null, label: 'None', zPos: ZPOS.weapon }, ...entries];
    catalogue['weapon'] = entries;
    console.log(`${'weapon'.padEnd(14)}: ${entries.filter(e => e.id).length} sprites`);
}

// Torso sub-slots
for (const { key, dirs, zPos } of TORSO_SUBS) {
    let entries = scanTorsoSub(dirs, zPos);
    const seen = new Set();
    entries = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    entries = [{ id: null, label: 'None', zPos }, ...entries];
    catalogue[key] = entries;
    console.log(`${key.padEnd(14)}: ${entries.filter(e => e.id).length} sprites`);
}

// Head sub-slots: ears, horns, fins, nose (all use render type 'head' in scene)
// Ears may have fg/bg compound variants (cat/skin, wolf/skin)
{
    let entries = scanHeadSub('ears', ZPOS.ears);
    entries = groupFgBg(entries, ZPOS.ear_bg);
    const seen = new Set();
    entries = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    entries = [{ id: null, label: 'None', zPos: ZPOS.ears }, ...entries];
    catalogue['ears'] = entries;
    console.log(`${'ears'.padEnd(14)}: ${entries.filter(e => e.id).length} sprites`);
}
// Horns: head/horns (biological) + hat/accessory/horns_* (helmet accessories, renderType:'hat')
{
    let entries = groupFgBg(scanHeadSub('horns', ZPOS.horns), ZPOS.ear_bg);
    for (const hornType of ['horns_upward', 'horns_short', 'horns_downward']) {
        find(`${BASE}/hat/accessory/${hornType}/fg -name "walk.png" -not -path "*/_from_vitruvius/*"`)
            .forEach(p => {
                const rel  = p.replace(`${BASE}/hat/accessory/${hornType}/fg/`, '').replace('/walk.png', '');
                const id   = `accessory/${hornType}/fg/${rel}`;
                const bgId = `accessory/${hornType}/bg/${rel}`;
                entries.push({ id, label: humanize(hornType), zPos: ZPOS.horns, renderType: 'hat',
                    companions: [{ id: bgId, zPos: ZPOS.ear_bg }] });
            });
    }
    const seen = new Set();
    entries = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    entries = [{ id: null, label: 'None', zPos: ZPOS.horns }, ...entries];
    catalogue['horns'] = entries;
    console.log(`${'horns'.padEnd(14)}: ${entries.filter(e => e.id).length} sprites`);
}
for (const type of ['fins', 'nose']) {
    let entries = scanHeadSub(type, ZPOS[type]);
    const seen = new Set();
    entries = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    entries = [{ id: null, label: 'None', zPos: ZPOS[type] }, ...entries];
    catalogue[type] = entries;
    console.log(`${type.padEnd(14)}: ${entries.filter(e => e.id).length} sprites`);
}

// Tail and wings — fg/bg paired sprites inside body/; two URL formats:
//   flat  : tail/lizard/adult/fg/walk.png          (no color)
//   colored: tail/wolf/adult/fg/walk/{color}.png   (has colors[])
for (const [type, bgZPos] of [['tail', -3], ['wings', -4]]) {
    const entries = [];

    // Colored format: fg/walk/ is a directory of color PNGs
    find(`${BASE}/body/${type} -path "*/fg/walk" -type d -not -path "*/_from_vitruvius/*"`)
        .forEach(p => {
            const id     = p.replace(`${BASE}/body/`, '').replace('/walk', '');
            const colors = allColorsIn(p);
            entries.push({ id, label: humanize(id.replace(/\/fg$/, '')), zPos: ZPOS[type], colors,
                companions: [{ id: id.replace(/\/fg$/, '/bg'), zPos: bgZPos }] });
        });

    // Flat format: fg/walk.png
    find(`${BASE}/body/${type} -path "*/fg/walk.png" -not -path "*/_from_vitruvius/*"`)
        .forEach(p => {
            const id = p.replace(`${BASE}/body/`, '').replace('/walk.png', '');
            entries.push({ id, label: humanize(id.replace(/\/fg$/, '')), zPos: ZPOS[type],
                companions: [{ id: id.replace(/\/fg$/, '/bg'), zPos: bgZPos }] });
        });

    const seen = new Set();
    const deduped = entries.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
    catalogue[type] = [{ id: null, label: 'None', zPos: ZPOS[type] }, ...deduped];
    console.log(`${type.padEnd(14)}: ${deduped.length} sprites`);
}

// Wound slots — one independent slot per body-part wound so they can be combined
// All use renderType 'body' in the scene (id prefixed with 'wound/')
// Wounds render on top of everything (above shield at 190)
const WOUND_ZPOS = { brain: 200, head: 200, eye_left: 200, eye_right: 200, mouth: 200, ribs: 200, arm: 200 };
find(`${BASE}/body/wound -name "walk.png"`)
    .map(p => p.replace(`${BASE}/body/wound/`, '').replace('/walk.png', ''))
    .sort()
    .forEach(part => {
        const key  = `wound_${part}`;
        const id   = `wound/${part}`;
        const zPos = WOUND_ZPOS[part] ?? 15;
        catalogue[key] = [
            { id: null, label: 'None',                                  zPos },
            { id,       label: humanize(part) + ' Wound',               zPos },
        ];
        console.log(`${key.padEnd(14)}: 1 wound sprite`);
    });

mkdirSync('./src/data', { recursive: true });
writeFileSync(OUTFILE, JSON.stringify(catalogue, null, 2));
console.log(`\nWrote ${OUTFILE}`);
