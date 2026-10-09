#!/usr/bin/env python3
"""
Migrate LPC Forge v1 (Vitruvian) character saves to Forge v2 compositions.

v1 items are mapped to the game catalogue with tools/v1_map.json (by body type),
v1 colour names to the nearest colour the game item offers: a file colour
(sampled from its PNG) or a tint palette entry. The game holds one item per
slot, so when several v1 layers land in one slot the first in GROUP_ORDER wins.
Nothing is dropped silently: every skip, collision, approximation and fallback
becomes a note.

    python3 tools/migrate_v1.py --out migrated.json     # then tools/import_compositions.mjs
"""
import argparse
import json
import os
import sqlite3
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FORGE = os.path.dirname(HERE)
AMO = os.path.normpath(os.path.join(FORGE, '..', '..', 'amo'))
LIB = os.path.join(AMO, 'ressources', 'lpc_merged', 'spritesheets')

# Body type → catalogue variant suffixes to try, in order.
BODY_VARIANTS = {
    'male': ['male'],
    'female': ['female', 'thin'],
    'muscular': ['muscular', 'male'],
    'teen': ['teen', 'thin', 'female'],
    'pregnant': ['pregnant', 'female', 'thin'],
    'skeleton': ['male'],
    'child': ['child'],
}
GENERIC_SUFFIXES = ['adult', 'adult/fg', 'universal', '']

# v1 layer groups, most important first: on a slot collision the earlier group wins.
GROUP_ORDER = ['body', 'head', 'hair', 'ears', 'tail', 'torso', 'torso2', 'torso3', 'dress',
               'legs', 'skirts', 'feet', 'arms', 'wrists', 'hands', 'shoulders', 'neck', 'waist',
               'buckles', 'closure', 'pockets', 'cape', 'trim', 'hat', 'head_coverings',
               'helmet_visor', 'helmet_accessory', 'swords', 'staffs', 'staff_accessory', 'shields', 'shadow']

STORY = {'eldrin', 'kael', 'anya', 'seraphina', 'malakar', 'acheron', 'valhen', 'nychtoros'}
ENEMY = {'skeleton', 'lycan', 'minotaur', 'nythorian', 'soldier'}


# ── data loading ─────────────────────────────────────────────────────────────

def load_catalogue():
    with open(os.path.join(AMO, 'src', 'data', 'character_catalogue.json')) as f:
        return json.load(f)


def load_map():
    with open(os.path.join(HERE, 'v1_map.json')) as f:
        return {k: v for k, v in json.load(f).items() if not k.startswith('_')}


def load_v1_colors():
    with open(os.path.join(FORGE, 'src', 'data', 'colors.json')) as f:
        return json.load(f)


def load_v1_saves(db_path=os.path.join(FORGE, 'saves.db')):
    db = sqlite3.connect(db_path)
    try:
        return [(n, json.loads(d)) for n, d in db.execute(
            "SELECT name, data FROM saves WHERE type = 'character' ORDER BY name")]
    finally:
        db.close()


def load_game_tables():
    """Palette tables and render types straight from the game's shared modules."""
    js = (
        "Promise.all([import('./src/systems/lpcPalettes.js'), import('./src/systems/lpcLayout.js')]).then(([p, l]) => "
        "console.log(JSON.stringify({ TINT_PALETTE: p.TINT_PALETTE, TINT_MATERIAL: p.TINT_MATERIAL, "
        "FORCE_TINT_TYPES: [...p.FORCE_TINT_TYPES], RENDER_TYPE: l.RENDER_TYPE })))"
    )
    out = subprocess.run(['node', '--input-type=module', '-e', js], cwd=AMO, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


# ── items ────────────────────────────────────────────────────────────────────

def _slot_ids(cat, slot):
    return [e['id'] for e in cat.get(slot, []) if e.get('id')]


def resolve_item(key, body, cat, vmap):
    """(slot, id, note) — id None when skipped/unmapped; note explains skips and fallbacks."""
    entry = vmap.get(key)
    if entry is None:
        return (None, None, f'no mapping for {key}')
    if 'skip' in entry:
        return (None, None, f'{key}: skipped — {entry["skip"]}')
    slot = entry['slot']
    have = _slot_ids(cat, slot)
    if 'id' in entry:
        return (slot, entry['id'], None) if entry['id'] in have else (slot, None, f'{key}: {entry["id"]} not in catalogue')
    base = entry['base']
    for suffix in BODY_VARIANTS.get(body, ['male']) + GENERIC_SUFFIXES:
        cand = f'{base}/{suffix}' if suffix else base
        if cand in have:
            return (slot, cand, None)
    others = sorted(i for i in have if i.startswith(base + '/'))
    if others:
        return (slot, others[0], f'{key}: no {body} version, used {others[0]}')
    return (slot, None, f'{key}: nothing in catalogue under {base}')


def _entry(cat, slot, iid):
    return next((e for e in cat.get(slot, []) if e.get('id') == iid), None)


def _render_type(slot, entry, game):
    return entry.get('renderType') or game['RENDER_TYPE'].get(slot, slot)


# ── colours ──────────────────────────────────────────────────────────────────

def v1_rgb(name, v1colors):
    c = v1colors.get(name)
    if not c or not c.get('palette'):
        return None
    shade = c['palette'][len(c['palette']) // 2]
    return tuple(shade[:3])


def _hex_rgb(n):
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


_sample_cache = {}


def file_color_rgb(slot, entry, color, game):
    """Mid-tone colour of an item's PNG in one file colour (darkest/brightest quarters dropped)."""
    key = (slot, entry['id'], color)
    if key in _sample_cache:
        return _sample_cache[key]
    anim = 'walk' if 'walk' in entry.get('anims', ['walk']) else entry['anims'][0]
    path = os.path.join(LIB, _render_type(slot, entry, game), entry['id'], anim, f'{color}.png')
    rgb = None
    if os.path.exists(path):
        img = Image.open(path).convert('RGBA')
        flat = img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata()
        px = [p for p in flat if p[3] > 200]
        if px:
            px.sort(key=lambda p: 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2])
            mid = px[len(px) // 4: max(len(px) * 3 // 4, len(px) // 4 + 1)]
            rgb = tuple(sum(p[i] for p in mid) // len(mid) for i in range(3))
    _sample_cache[key] = rgb
    return rgb


def nearest_option(rgb, options):
    best, best_d = None, None
    for name, orgb in options:
        if orgb is None:
            continue
        d = sum((a - b) ** 2 for a, b in zip(rgb, orgb))
        if best_d is None or d < best_d:
            best, best_d = name, d
    return best


def _tint_palette(slot, entry, game):
    mat = entry.get('tintMaterial') or game['TINT_MATERIAL'].get(slot)
    return game['TINT_PALETTE'].get(mat) if mat else None


def colour_for(slot, entry, v1name, game, v1colors, inherited_tint=None):
    """{'color': name} | {'tint': idx} | {} for a v1 colour on a game item."""
    file_colours = entry.get('colors') or []
    if file_colours and slot not in game['FORCE_TINT_TYPES']:
        if v1name in file_colours:
            return {'color': v1name}
        rgb = v1_rgb(v1name, v1colors)
        if rgb is None:
            return {}
        return {'color': nearest_option(rgb, [(c, file_color_rgb(slot, entry, c, game)) for c in file_colours])}
    if inherited_tint is not None:
        return {'tint': inherited_tint} if inherited_tint else {}
    palette = _tint_palette(slot, entry, game)
    rgb = v1_rgb(v1name, v1colors)
    if not palette or rgb is None:
        return {}
    idx = nearest_option(rgb, [(i, _hex_rgb(p['hex'])) for i, p in enumerate(palette) if i and p.get('shades')])
    return {'tint': idx} if idx else {}


# ── saves ────────────────────────────────────────────────────────────────────

def _group(key):
    g = key.split('.')[1]
    return GROUP_ORDER.index(g) if g in GROUP_ORDER else len(GROUP_ORDER)


def migrate_save(name, data, cat, vmap, game, v1colors):
    notes = []
    sel = {}
    body_key = next((k for k in data if k.startswith('anatomy.body.')), None)
    body = body_key.split('.')[2] if body_key else 'male'
    body_tint = None
    owner = {}   # slot → v1 key that filled it

    for key in sorted(data, key=lambda k: (_group(k), k)):
        slot, iid, note = resolve_item(key, body, cat, vmap)
        if note:
            notes.append(note)
        if not iid:
            continue
        if slot in sel:
            notes.append(f'{key}: dropped — {slot} already holds {owner[slot]} (the game has one {slot} item)')
            continue
        if vmap.get(key, {}).get('approx'):
            notes.append(f'{key}: approximated as {iid}')
        entry = _entry(cat, slot, iid)
        pick = {'id': iid}
        colours = data[key].get('colors') or {}
        primary = colours.get('primary') or next(iter(colours.values()), None)
        if primary:
            inherited = body_tint if primary.startswith('anatomy.') else None
            c = colour_for(slot, entry, primary, game, v1colors, inherited_tint=inherited)
            if not c and not primary.startswith('anatomy.') and v1_rgb(primary, v1colors) is None:
                notes.append(f'{key}: colour "{primary}" unknown, kept the item\'s default')
            pick.update(c)
            if slot == 'body':
                body_tint = pick.get('tint', 0)
        sel[slot] = pick
        owner[slot] = key

        # v1 heads carry the eye colour; the game has a separate eyes slot.
        eyes = next((v for v in colours.values() if isinstance(v, str) and v.startswith('eyes_')), None)
        if slot == 'head' and eyes and 'eyes' not in sel:
            eye_entry = _entry(cat, 'eyes', 'human/adult/default')
            if eye_entry:
                want = eyes[len('eyes_'):]
                if want in (eye_entry.get('colors') or []):
                    sel['eyes'] = {'id': eye_entry['id'], 'color': want}
                else:
                    c = colour_for('eyes', eye_entry, eyes, game, v1colors)
                    sel['eyes'] = {'id': eye_entry['id'], **c}
                    notes.append(f'{key}: eye colour {want} → {c.get("color", "default")}')
                owner['eyes'] = key

    return {'comp': {'name': name, 'sel': sel}, 'notes': notes}


def guess_role(name):
    first = name.split()[0].lower()
    if first in STORY:
        return 'story'
    if first in ENEMY:
        return 'enemy'
    return 'npc'


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--out', required=True, help='where to write the migrated compositions (JSON)')
    args = ap.parse_args()
    cat, vmap, game, v1colors = load_catalogue(), load_map(), load_game_tables(), load_v1_colors()
    out = []
    for name, data in load_v1_saves():
        r = migrate_save(name, data, cat, vmap, game, v1colors)
        role = guess_role(name)
        entry = {'name': name, 'role': role, 'comp': r['comp'], 'notes': r['notes']}
        if role == 'story':
            entry['dbCharacter'] = name.split()[0]
        out.append(entry)
        print(f'{name}: {len(r["comp"]["sel"])} slots, {len(data)} v1 layers, {len(r["notes"])} notes')
        for n in r['notes']:
            print(f'    - {n}')
    with open(args.out, 'w') as f:
        json.dump(out, f, indent=2)
    print(f'\nwrote {len(out)} characters to {args.out}')


if __name__ == '__main__':
    sys.exit(main())
