#!/usr/bin/env node
/**
 * Non-destructive: reads the EXISTING src/data/character_catalogue.json and adds
 * an `anims` array to every entry + companion, then writes it back. Unlike
 * gen_catalogue.js this preserves all hand-curated structure (labels, itemName,
 * companions, zPos); it only layers animation availability on top.
 *
 * An animation is "available" for a layer only when the exact file the runtime
 * requests (see CharacterRenderer.animUrl) exists on disk — so an empty anim
 * directory or an itemName/colour mismatch never produces a phantom entry that
 * 404s at load time.
 *
 * Run from apps/amo/ after editing the catalogue or assets:
 *   node tools/annotate_anims.js
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';

const BASE    = './ressources/lpc_merged/spritesheets';
const CATFILE = './src/data/character_catalogue.json';

// Canonical LPC animation directory/file names (Universal + Vitruvius attack_*).
const ANIM_VOCAB = [
    'walk', 'idle', 'hurt', 'slash', 'backslash', 'halfslash', 'thrust',
    'shoot', 'spellcast', 'run', 'sit', 'jump', 'climb', 'combat_idle', 'emote',
    'attack_slash', 'attack_backslash', 'attack_halfslash', 'attack_slash_reverse', 'attack_thrust',
];

// Catalogue key → on-disk render folder under BASE (entry.renderType overrides).
const ANIM_FOLDER = {
    body: 'body', head: 'head', hair: 'hair', eyes: 'eyes', beards: 'beards',
    facial: 'facial', neck: 'neck', dress: 'dress', legs: 'legs', feet: 'feet',
    arms: 'arms', shoulders: 'shoulders', hat: 'hat', shield: 'shield',
    cape: 'cape', backpack: 'backpack', weapon: 'weapon',
    torso_clothes: 'torso', torso_jacket: 'torso', torso_mail: 'torso',
    torso_armour: 'torso', torso_waist: 'torso',
    ears: 'head', horns: 'head', fins: 'head', nose: 'head',
    tail: 'body', wings: 'body',
};

// Mirror of CharacterRenderer.animUrl — the EXACT file the runtime requests.
function animFile(folder, id, itemName, color, anim) {
    if (itemName)            return `${BASE}/${folder}/${id}/${anim}/${itemName}.png`;
    if (color != null)       return `${BASE}/${folder}/${id}/${anim}/${color}.png`;
    if (folder === 'weapon') return `${BASE}/${folder}/${id}/${anim}/${id.split('/').pop()}.png`;
    if (folder === 'cape' || folder === 'backpack')
                             return `${BASE}/${folder}/${id}/${anim}/red.png`;
    return `${BASE}/${folder}/${id}/${anim}.png`;
}

function animsForLayer(folder, id, itemName, color) {
    return ANIM_VOCAB.filter(a => existsSync(animFile(folder, id, itemName, color, a)));
}

const catalogue = JSON.parse(readFileSync(CATFILE, 'utf8'));

let entries = 0, withAnims = 0;
for (const [key, list] of Object.entries(catalogue)) {
    const folder = ANIM_FOLDER[key] ?? (key.startsWith('wound_') ? 'body' : key);
    for (const e of list) {
        if (!e.id) continue;
        entries++;
        const ft        = e.renderType ?? folder;
        const baseColor = e.colors?.[0] ?? null;
        e.anims = animsForLayer(ft, e.id, e.itemName, baseColor);
        if (e.anims.length) withAnims++;
        for (const c of e.companions ?? []) {
            const cColor = c.color ?? (e.colors ? baseColor : null);
            c.anims = animsForLayer(ft, c.id, c.itemName, cColor);
        }
    }
}

writeFileSync(CATFILE, JSON.stringify(catalogue, null, 2));
console.log(`Annotated ${entries} entries (${withAnims} with ≥1 anim). Wrote ${CATFILE}`);
