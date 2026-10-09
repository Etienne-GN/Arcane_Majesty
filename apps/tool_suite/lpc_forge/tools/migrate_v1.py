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
        "console.log(JSON.stringify({ TINT_PALETTE: p.TINT_PALETTE, TINT_MATERIAL: p.TINT_MATERIAL, SOURCE_MATERIAL: p.SOURCE_MATERIAL, PALETTE_SOURCE: p.PALETTE_SOURCE, "
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

def _lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def v1_ramp(name, v1colors):
    """A v1 colour's shades, darkest first (None if unknown)."""
    c = v1colors.get(name)
    if not c or not c.get('palette'):
        return None
    return sorted((tuple(p[:3]) for p in c['palette']), key=_lum)


def v1_rgb(name, v1colors):
    ramp = v1_ramp(name, v1colors)
    return ramp[len(ramp) // 2] if ramp else None


def _resample(ramp, n=8):
    if len(ramp) == 1:
        return ramp * n
    out = []
    for i in range(n):
        t = i * (len(ramp) - 1) / (n - 1)
        a, b = ramp[int(t)], ramp[min(int(t) + 1, len(ramp) - 1)]
        f = t - int(t)
        out.append(tuple(a[k] + (b[k] - a[k]) * f for k in range(3)))
    return out


def ramp_distance(a, b):
    """How different two colour ramps look: both sorted dark→light, resampled, compared point by point."""
    ra, rb = _resample(sorted(a, key=_lum)), _resample(sorted(b, key=_lum))
    return sum(sum((x[k] - y[k]) ** 2 for k in range(3)) for x, y in zip(ra, rb))


def _hex_rgb(n):
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


_sample_cache = {}


def _opaque_sorted(slot, entry, color, game):
    key = (slot, entry['id'], color)
    if key not in _sample_cache:
        anim = 'walk' if 'walk' in entry.get('anims', ['walk']) else entry['anims'][0]
        path = os.path.join(LIB, _render_type(slot, entry, game), entry['id'], anim, f'{color}.png')
        px = []
        if os.path.exists(path):
            img = Image.open(path).convert('RGBA')
            flat = img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata()
            px = sorted((p[:3] for p in flat if p[3] > 200), key=_lum)
        _sample_cache[key] = px
    return _sample_cache[key]


def file_color_rgb(slot, entry, color, game):
    """Mid-tone colour of an item's PNG in one file colour (darkest/brightest quarters dropped)."""
    px = _opaque_sorted(slot, entry, color, game)
    if not px:
        return None
    mid = px[len(px) // 4: max(len(px) * 3 // 4, len(px) // 4 + 1)]
    return tuple(sum(p[i] for p in mid) // len(mid) for i in range(3))


def file_color_ramp(slot, entry, color, game):
    """Five brightness quantiles of an item's PNG in one file colour, darkest first."""
    px = _opaque_sorted(slot, entry, color, game)
    return [px[min(int(q * len(px)), len(px) - 1)] for q in (0.1, 0.3, 0.5, 0.7, 0.9)] if px else None


def nearest_option(rgb, options):
    best, best_d = None, None
    for name, orgb in options:
        if orgb is None:
            continue
        d = sum((a - b) ** 2 for a, b in zip(rgb, orgb))
        if best_d is None or d < best_d:
            best, best_d = name, d
    return best


def nearest_ramp(ramp, options):
    """Option whose ramp looks most like `ramp`; options = [(name, ramp|None)]."""
    scored = [(ramp_distance(ramp, r), n) for n, r in options if r]
    return min(scored)[1] if scored else None


def _tint_palette(slot, entry, game):
    mat = entry.get('tintMaterial') or game['TINT_MATERIAL'].get(slot)
    return game['TINT_PALETTE'].get(mat) if mat else None


def _item_png(slot, entry, game):
    """The item's own walk (or first) PNG — mirrors lpcLayout.animPath for the main layer."""
    anim = 'walk' if 'walk' in entry.get('anims', ['walk']) else entry['anims'][0]
    base = os.path.join(LIB, _render_type(slot, entry, game), entry['id'], anim)
    rt = _render_type(slot, entry, game)
    if entry.get('itemName'):
        return os.path.join(base, f"{entry['itemName']}.png")
    if rt == 'weapon':
        return os.path.join(base, f"{entry['id'].split('/')[-1]}.png")
    if rt in ('cape', 'backpack'):
        return os.path.join(base, 'red.png')
    return base + '.png'


def _source_key(slot, entry, game):
    ps = game['PALETTE_SOURCE']
    if entry.get('sourceMaterial') in ps:
        return entry['sourceMaterial']
    if entry.get('tintMaterial') in ps:
        return entry['tintMaterial']
    return game['SOURCE_MATERIAL'].get(slot, 'body')


def tint_effective(slot, entry, game):
    """Would a palette swap change this item at all? (Its pixels must be in the source palette.)"""
    path = _item_png(slot, entry, game)
    if not os.path.exists(path):
        return True   # can't tell; don't raise a false alarm
    src = [_hex_rgb(v) for v in game['PALETTE_SOURCE'][_source_key(slot, entry, game)]]
    img = Image.open(path).convert('RGBA')
    flat = img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata()
    for p in flat:
        if p[3] >= 8 and any((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 <= 27 for c in src):
            return True
    return False


def colour_for(slot, entry, v1name, game, v1colors, inherited_tint=None):
    """{'color': name} | {'tint': idx} | {} for a v1 colour on a game item (ramp-to-ramp match)."""
    file_colours = entry.get('colors') or []
    if file_colours and slot not in game['FORCE_TINT_TYPES']:
        if v1name in file_colours:
            return {'color': v1name}
        ramp = v1_ramp(v1name, v1colors)
        if ramp is None:
            return {}
        return {'color': nearest_ramp(ramp, [(c, file_color_ramp(slot, entry, c, game)) for c in file_colours])}
    if inherited_tint is not None:
        return {'tint': inherited_tint} if inherited_tint else {}
    palette = _tint_palette(slot, entry, game)
    ramp = v1_ramp(v1name, v1colors)
    if not palette or ramp is None:
        return {}
    # The display palette mixes skin, fur and hair tones. A v1 hair colour on a
    # hair slot picks among hair tones, a v1 skin colour on a skin slot among the
    # rest; clothing/metal colours (e.g. a blue-grey "shadow" fur) may use any.
    hair_names = {p['name'] for p in game['TINT_PALETTE'].get('hair', [])}
    is_hair = (entry.get('sourceMaterial') or game['SOURCE_MATERIAL'].get(slot)) == 'hair'
    mats = set(v1colors.get(v1name, {}).get('materials', []))
    if is_hair and 'hair' in mats:
        keep = lambda name: name in hair_names
    elif not is_hair and 'skin' in mats:
        keep = lambda name: name not in hair_names
    else:
        keep = lambda name: True
    options = [(i, [_hex_rgb(v) for v in p['shades']]) for i, p in enumerate(palette)
               if i and p.get('shades') and keep(p['name'])]
    idx = nearest_ramp(ramp, options)
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
            if slot == 'body' and 'tint' in c and 'skin' not in v1colors.get(primary, {}).get('materials', []):
                pal = _tint_palette(slot, entry, game)
                notes.append(f'{key}: skin uses the v1 non-skin colour "{primary}"; matched to '
                             f'{pal[c["tint"]]["name"]} — check it on the stage')
            if 'tint' in c and not tint_effective(slot, entry, game):
                notes.append(f'{key}: tint has no effect on {iid} (its art is not in the {_source_key(slot, entry, game)} palette); it keeps its own colours')
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
