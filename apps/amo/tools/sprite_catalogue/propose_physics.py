#!/usr/bin/env python3
"""
First-guess hitbox + draw layer for every catalogued sprite that has none yet.

Writes `hitbox` ({x,y,w,h} relative to the sprite, or null = no collision) and
`layer` ('under' | 'sorted' | 'over') onto catalogue entries, and marks each
guess 'proposed' in the sprite ledger's sprite_meta.json so it shows up in the
ledger's "Hitboxes to review" queue. A human approves or redraws each one there.

Never touches an entry that already has both hitbox and layer, nor one whose
review is already 'approved'. Rerun after cataloguing new sheets.

The guess comes from the sprite's name tokens and tags (first matching rule
wins, see RULES), and footprints are measured on the sprite's opaque pixels,
so padding around the art doesn't end up inside the box.

Run from apps/amo/: python3 tools/sprite_catalogue/propose_physics.py [--dry-run]
"""
from pathlib import Path
from collections import Counter
import json
import sys

from PIL import Image

REPO = Path(__file__).resolve().parents[4]
TILESETS = REPO / 'apps/amo/public/assets/catalogued/tilesets'
META = REPO / 'apps/tool_suite/sprite_ledger/data/sprite_meta.json'

# Token sets (name parts + tags). Order of RULES matters: first match wins.
EFFECT = {'vfx', 'effects', 'emote', 'popup', 'ui', 'icon', 'bubble', 'particle', 'spark', 'sparkle', 'puff',
          'ripple', 'splash', 'glow', 'rays', 'curse', 'droplet', 'smoke'}
OVER = {'canopy', 'roof', 'awning', 'overhang', 'lintel', 'eave', 'eaves', 'treetop', 'ceiling', 'valance'}
WALK_STRUCT = {'bridge', 'dock', 'pier', 'stairs', 'steps', 'staircase', 'trapdoor', 'boardwalk'}
WATER = {'water', 'pond', 'lake', 'river', 'lava', 'pit', 'chasm', 'void', 'abyss', 'island'}
NOT_WATER = {'fountain', 'well', 'bucket', 'barrel', 'lily', 'trough', 'can', 'bottle', 'jug', 'waterfall', 'birdbath',
             'drop', 'splash', 'ripple', 'droplet', 'potion'}
SOLID_WALL = {'wall', 'cliff', 'bookshelf', 'bookcase', 'palisade'}
LOW_BARRIER = {'fence', 'railing', 'hedge', 'bars', 'gate', 'balustrade', 'baluster'}
GROUND = {'floor', 'grass', 'dirt', 'sand', 'path', 'road', 'rug', 'carpet', 'mat', 'puddle', 'shadow', 'decal',
          'speckle', 'tuft', 'moss', 'crack', 'stain', 'blood', 'leaves', 'snow', 'mud', 'pebble', 'pebbles',
          'gravel', 'cobblestone', 'flagstone', 'terrain', 'ground', 'ground_detail', 'patch', 'sprout', 'flower',
          'flowers', 'clover', 'weed', 'weeds', 'texture', 'shore', 'swamp', 'tiles', 'ice'}
TREE = {'tree', 'trunk'}
ROCKY = {'bush', 'shrub', 'boulder', 'rock', 'rocks', 'stump'}
THIN_POST = {'lamp', 'post', 'pole', 'torch', 'lantern', 'signpost', 'column', 'pillar', 'totem', 'statue'}
PASSABLE_DECOR = {'door', 'doorway', 'window', 'sign', 'banner', 'painting', 'frame', 'curtain', 'poster', 'flag',
                  'candle', 'candles', 'sconce', 'clock', 'shelf'}
ITEM = {'item', 'items', 'food', 'weapon', 'weapons', 'tool', 'tools', 'potion', 'gem', 'coin', 'key', 'fruit',
        'fruits', 'meat', 'fish', 'bread', 'book', 'scroll', 'dagger', 'sword', 'axe', 'bow', 'arrow', 'ring', 'herb'}


def footprint(alpha_bbox, size, frac_h, frac_w):
    """Box at the bottom of the opaque art: frac_h of its height, frac_w of its width, centred."""
    x0, y0, x1, y1 = alpha_bbox
    bw, bh = x1 - x0, y1 - y0
    h = max(1, round(bh * frac_h))
    w = max(1, round(bw * frac_w))
    x = x0 + (bw - w) // 2
    y = y1 - h
    return {'x': x, 'y': y, 'w': min(w, size[0] - x), 'h': min(h, size[1] - y)}


def full(size):
    return {'x': 0, 'y': 0, 'w': size[0], 'h': size[1]}


RULES = [
    # (label, predicate(tokens, entry, size, coverage), result(bbox, size) -> (hitbox, layer))
    ('effect / ui', lambda t, e, s, c: bool(t & EFFECT), lambda b, s: (None, 'over')),
    ('overhead (roof, canopy, arch top)', lambda t, e, s, c: bool(t & OVER) or ('tree' in t and 'top' in t)
        or ('archway' in t and 'top' in t), lambda b, s: (None, 'over')),
    ('solid wall / cliff', lambda t, e, s, c: bool(t & SOLID_WALL), lambda b, s: (full(s), 'sorted')),
    ('walkable structure (bridge, dock, stairs)', lambda t, e, s, c: bool(t & WALK_STRUCT), lambda b, s: (None, 'under')),
    ('water / pit (blocks)', lambda t, e, s, c: bool(t & WATER) and not (t & NOT_WATER), lambda b, s: (full(s), 'under')),
    ('ground detail', lambda t, e, s, c: bool(t & GROUND), lambda b, s: (None, 'under')),
    ('low barrier (fence, hedge, railing)', lambda t, e, s, c: bool(t & LOW_BARRIER), lambda b, s: (footprint(b, s, 0.4, 1.0), 'sorted')),
    ('tree (trunk footprint)', lambda t, e, s, c: bool(t & TREE), lambda b, s: (footprint(b, s, 0.2, 0.3), 'sorted')),
    ('rock / bush / stump', lambda t, e, s, c: bool(t & ROCKY), lambda b, s: (footprint(b, s, 0.5, 0.8), 'sorted')),
    ('thin post (lamp, pillar, statue)', lambda t, e, s, c: bool(t & THIN_POST), lambda b, s: (footprint(b, s, 0.2, 0.5), 'sorted')),
    ('passable wall decor (door, window, sign)', lambda t, e, s, c: bool(t & PASSABLE_DECOR), lambda b, s: (None, 'sorted')),
    ('small item / pickup', lambda t, e, s, c: bool(t & ITEM) or (e['kind'] == 'object' and s[0] * s[1] <= 16 * 16),
        lambda b, s: (None, 'sorted')),
    ('other object (furniture, props)', lambda t, e, s, c: e['kind'] == 'object', lambda b, s: (footprint(b, s, 0.5, 0.9), 'sorted')),
    # grid tiles: a fully painted tile is floor-like; a partly transparent one is usually a piece of a prop
    ('other tile, fully painted (floor-like)', lambda t, e, s, c: c >= 0.95, lambda b, s: (None, 'under')),
    ('other tile, partial (prop piece)', lambda t, e, s, c: True, lambda b, s: (footprint(b, s, 0.5, 0.9), 'sorted')),
]


def sprite_box(cat, e):
    """(still box on the sheet, sprite size) — size is the largest frame for animations."""
    if len(e.get('frames') or []) > 1:
        fr = e['frames']
        size = (max(f['w'] for f in fr), max(f['h'] for f in fr))
        f = fr[0]
        return (f['x'], f['y'], f['w'], f['h']), size
    if e['kind'] == 'tile':
        tw, th = cat['gridTileWidth'], cat['gridTileHeight']
        return (e['col'] * tw, e['row'] * th, tw, th), (tw, th)
    return (e['x'], e['y'], e['w'], e['h']), (e['w'], e['h'])


def main():
    dry = '--dry-run' in sys.argv
    meta = json.loads(META.read_text())
    stats = Counter()
    changed_files = 0
    for cat_path in sorted(TILESETS.glob('*/*.catalogue.json')):
        cat = json.loads(cat_path.read_text())
        sheet = cat['source']
        alpha = None
        dirty = False
        for e in cat['entries']:
            key = f'{sheet}::{e["name"]}'
            if meta.get(key, {}).get('physics') == 'approved':
                continue
            if 'hitbox' in e and 'layer' in e:
                continue
            if alpha is None:
                alpha = Image.open(cat_path.parent / sheet).convert('RGBA').split()[-1]
            (x, y, w, h), size = sprite_box(cat, e)
            # opaque bbox of the still, placed bottom-centred in the sprite box like the game draws it
            ox, oy = (size[0] - w) // 2, size[1] - h
            mask = alpha.crop((x, y, x + w, y + h)).point(lambda v: 255 if v > 10 else 0)
            bb = mask.getbbox() or (0, 0, w, h)
            coverage = mask.histogram()[255] / float(w * h)
            bbox = (bb[0] + ox, bb[1] + oy, bb[2] + ox, bb[3] + oy)
            tokens = set(e['name'].split('_')) | set(e.get('tags', []))
            for label, pred, result in RULES:
                if pred(tokens, e, size, coverage):
                    hitbox, layer = result(bbox, size)
                    break
            if 'hitbox' not in e:
                e['hitbox'] = hitbox
            if 'layer' not in e:
                e['layer'] = layer
            meta.setdefault(key, {})['physics'] = 'proposed'
            stats[label] += 1
            dirty = True
        if dirty and not dry:
            cat_path.write_text(json.dumps(cat, indent=2, ensure_ascii=False) + '\n')
            changed_files += 1
    if not dry:
        META.write_text(json.dumps(meta, indent=2) + '\n')
    for label, n in stats.most_common():
        print(f'{n:6d}  {label}')
    print(f'{sum(stats.values())} sprites proposed in {changed_files} catalogues' + (' (dry run)' if dry else ''))


if __name__ == '__main__':
    main()
