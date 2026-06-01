#!/usr/bin/env python3
"""
Character layer review tool.
Generates walk+slash+idle+hurt composite spritesheets for every catalogue item,
checks pixel coverage per direction, saves broken composites to /tmp/review/.
"""

import json, os, sys
from pathlib import Path
from PIL import Image

BASE     = Path(__file__).parent / 'public' / 'lpc'
OUT_DIR  = Path('/tmp/review')
OUT_DIR.mkdir(exist_ok=True)

CATALOGUE = Path(__file__).parent / 'src' / 'data' / 'character_catalogue.json'
ANIMS     = ['walk', 'slash', 'idle', 'hurt']

# Types where the last id segment is the filename:  weapon/{id}/{anim}/{last}.png
WEAPON_TYPES = {'weapon'}
# Types where a color field drives the filename:    {type}/{id}/{anim}/{color}.png
COLOR_TYPES  = {'cape', 'backpack'}

# Base layers always composited under the tested item
BASE_LAYERS = [
    {'type': 'body',  'id': 'bodies/male',       'zPos': 10},
    {'type': 'head',  'id': 'heads/human/male',  'zPos': 20},
]


# ── URL builder (mirrors CharacterRenderer.js animUrl) ────────────────────────

def anim_url(layer, anim):
    t   = layer['type']
    lid = layer['id']
    iname = layer.get('itemName')
    color = layer.get('color')

    if iname:
        return BASE / t / lid / anim / f'{iname}.png'
    if color:
        return BASE / t / lid / anim / f'{color}.png'
    if t in WEAPON_TYPES:
        item_name = lid.split('/')[-1]
        return BASE / t / lid / anim / f'{item_name}.png'
    if t in COLOR_TYPES:
        return BASE / t / lid / anim / 'red.png'   # default fallback
    return BASE / t / lid / f'{anim}.png'


# ── Layer list builder from a catalogue entry ──────────────────────────────────

def layers_for_entry(cat_type, entry):
    """Return list of layer dicts for a catalogue entry (main + companions).
    Mirrors CC logic: companions inherit parent color when they have none of their own.
    """
    layers = []
    parent_color = entry.get('color')  # already resolved from test_entry

    def make_layer(e, inherit_color=None, default_type=cat_type):
        layer = {
            'type':  e.get('type', default_type),
            'id':    e['id'],
            'zPos':  e.get('zPos', 50),
        }
        if 'itemName' in e:
            layer['itemName'] = e['itemName']
        color = e.get('color') or (inherit_color if entry.get('colors') else None)
        if color:
            layer['color'] = color
        return layer

    main = make_layer(entry)
    layers.append(main)

    for comp in entry.get('companions', []):
        layers.append(make_layer(comp, inherit_color=parent_color, default_type=cat_type))

    return layers


# ── Image helpers ─────────────────────────────────────────────────────────────

def load_or_blank(path, size):
    try:
        return Image.open(path).convert('RGBA')
    except Exception:
        return Image.new('RGBA', size, (0, 0, 0, 0))

def composite_layers(layer_list, anim):
    """Composite all layers for the given anim. Returns (image, missing_paths).
    Layers with different sizes are scaled to match the dominant (body) layer size.
    """
    sorted_layers = sorted(layer_list, key=lambda l: l.get('zPos', 50))
    missing  = []
    loaded   = []   # (layer, img)

    for layer in sorted_layers:
        path = anim_url(layer, anim)
        if not path.exists():
            missing.append(str(path.relative_to(BASE.parent)))
            continue
        loaded.append((layer, Image.open(path).convert('RGBA')))

    if not loaded:
        return Image.new('RGBA', (576, 256), (0, 0, 0, 0)), missing

    # Canonical size = first body-type layer, else first layer
    canon = None
    for layer, img in loaded:
        if layer.get('type') == 'body':
            canon = img.size
            break
    if canon is None:
        canon = loaded[0][1].size

    result = Image.new('RGBA', canon, (0, 0, 0, 0))
    for layer, img in loaded:
        if img.size != canon:
            img = img.resize(canon, Image.NEAREST)
        result = Image.alpha_composite(result, img)

    return result, missing

def row_opaque(img, row_idx, n_rows=4):
    """Count opaque pixels in a horizontal row band."""
    W, H   = img.size
    row_h  = H // n_rows
    region = img.crop((0, row_idx * row_h, W, (row_idx + 1) * row_h))
    return sum(1 for px in region.getdata() if px[3] > 10)

def has_all_directions(img):
    return all(row_opaque(img, r) > 0 for r in range(4))

def make_review_sheet(layer_list, anims=ANIMS):
    """Stack all anims side-by-side into one tall review image."""
    cols = []
    meta = {}
    for anim in anims:
        comp, missing = composite_layers(layer_list, anim)
        cols.append(comp)
        meta[anim] = {'missing': missing, 'dirs': [row_opaque(comp, r) > 0 for r in range(4)]}

    # Tile horizontally
    total_w = sum(c.width  for c in cols)
    max_h   = max(c.height for c in cols)
    sheet   = Image.new('RGBA', (total_w, max_h), (0, 0, 0, 0))
    x = 0
    for col in cols:
        sheet.paste(col, (x, 0))
        x += col.width
    return sheet, meta


# ── Main review loop ──────────────────────────────────────────────────────────

def review_all():
    with open(CATALOGUE) as f:
        cat = json.load(f)

    results  = []
    total    = 0
    passed   = 0
    warnings = []
    broken   = []

    for cat_type, entries in cat.items():
        for entry in entries:
            if not entry.get('id'):
                continue   # skip "None" placeholders

            label = entry.get('label', entry['id'])
            # For colour items, just test the first available colour
            test_entry = dict(entry)
            if 'colors' in entry and entry['colors']:
                test_entry = {**entry, 'color': entry['colors'][0]}

            item_layers = layers_for_entry(cat_type, test_entry)
            all_layers  = BASE_LAYERS + item_layers

            sheet, meta = make_review_sheet(all_layers)

            # Judge
            issues = []
            for anim, info in meta.items():
                if info['missing']:
                    issues.append(f"{anim}:MISSING({', '.join(info['missing'][:2])})")
                elif not all(info['dirs']):
                    # Only flag walk direction issues (slash/idle/hurt can legitimately be partial)
                    if anim == 'walk':
                        missing_dirs = [('up','left','down','right')[i] for i,v in enumerate(info['dirs']) if not v]
                        issues.append(f"walk:no-{'+'.join(missing_dirs)}")

            status = 'PASS' if not issues else 'WARN'
            total += 1
            if status == 'PASS':
                passed += 1

            result = {
                'type':   cat_type,
                'id':     entry['id'],
                'label':  label,
                'status': status,
                'issues': issues,
            }
            results.append(result)

            if issues:
                # Save composite sheet scaled 3x
                W, H  = sheet.size
                big   = sheet.resize((W * 3, H * 3), Image.NEAREST)
                fname = f"{cat_type}__{entry['id'].replace('/', '_')}.png"
                big.save(OUT_DIR / fname)
                result['saved'] = str(OUT_DIR / fname)
                warnings.append(result)

    return results, total, passed, warnings


if __name__ == '__main__':
    print("Running layer review…\n")
    results, total, passed, warnings = review_all()

    print(f"{'RESULT':<6}  {'TYPE':<18}  {'LABEL':<35}  ISSUES")
    print("-" * 90)
    for r in results:
        print(f"{r['status']:<6}  {r['type']:<18}  {r['label']:<35}  {'; '.join(r['issues']) or ''}")

    print(f"\n{'='*90}")
    print(f"Total: {total}  Passed: {passed}  Issues: {len(warnings)}")
    if warnings:
        print(f"\nSaved broken composites to {OUT_DIR}/")
        for w in warnings:
            print(f"  {w['type']}/{w['id']}: {'; '.join(w['issues'])}")
