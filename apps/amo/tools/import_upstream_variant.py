#!/usr/bin/env python3
"""
Import an upstream Universal LPC item as a NEW alternate catalogue item next
to our own version (used when upstream redrew an item, so its new motions
don't match our art): every motion upstream has, in every colour of its main
recolourable material, recoloured exactly the way upstream does at runtime —
the item's base ramp (e.g. cloth "white") swapped shade-for-shade for each
named palette ramp. Other materials (e.g. a gold clasp) keep their base colours.

    python3 tools/import_upstream_variant.py neck/capeclip/male capeclip/male_revised "Cape Clip (redrawn)" [--apply]
args: <upstream item path> <our new id under the same type> <label>
Then: npm run gen:anims; node ../tool_suite/lpc_forge/tools/rebuild_cast_layers.mjs
"""
import argparse
import csv
import io
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sync_upstream_motions as up  # noqa: E402

GAME_MOTIONS = {'walk', 'idle', 'hurt', 'slash', 'backslash', 'halfslash', 'thrust', 'shoot', 'spellcast',
                'run', 'sit', 'jump', 'climb', 'combat_idle', 'emote'}
UP_TO_GAME = {'combat': 'combat_idle', '1h_backslash': 'backslash', '1h_halfslash': 'halfslash'}


def hexrgb(h):
    return (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))


def sheet_definition_for(item):
    """The upstream sheet definition whose layer_1 points at this item path."""
    root = os.path.join(up.CACHE, 'sheet_definitions')
    for d, _, fs in os.walk(root):
        for f in fs:
            if not f.endswith('.json'):
                continue
            j = json.load(open(os.path.join(d, f)))
            if isinstance(j, dict) and any(isinstance(v, str) and v.rstrip('/') == item for v in j.get('layer_1', {}).values()):
                return j
    return None


def palette(material, scheme='ulpc'):
    rel = f'palette_definitions/{material}/{material}_{scheme}.json'
    return json.load(open(up.fetch(rel)))


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('item'); ap.add_argument('new_id'); ap.add_argument('label')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--after', help='our catalogue id to place the new entry after (default: the upstream id)')
    a = ap.parse_args()
    t = a.item.split('/')[0]
    sdef = sheet_definition_for(a.item)
    if not sdef:
        sys.exit(f'no upstream sheet definition points at {a.item}')
    rec = sdef['recolors']
    c1 = rec['color_1'] if 'color_1' in rec else rec      # one-material items put it at the top level
    mat = c1['material']
    meta = json.load(open(up.fetch(f'palette_definitions/{mat}/meta_{mat}.json')))
    ramps = palette(mat)
    base = [hexrgb(h) for h in ramps[c1.get('base', meta['base'])]]
    files = up.upstream_files()
    motions = sorted(f.split('/')[-1][:-4] for f in files
                     if f.startswith(a.item + '/') and f.count('/') == a.item.count('/') + 1)
    motions = [m for m in motions if UP_TO_GAME.get(m, m) in GAME_MOTIONS]
    print(f'{a.item}: material {mat} (base ramp {c1.get("base", meta["base"])}), {len(ramps)} colours, motions {motions}')
    if not a.apply:
        return
    written = []
    for m in motions:
        im = Image.open(up.fetch(f'spritesheets/{a.item}/{m}.png')).convert('RGBA')
        px = list(im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata())
        for name, hexes in ramps.items():
            target = [hexrgb(h) for h in hexes]
            lut = dict(zip(base, target))
            out = [(*lut[p[:3]], p[3]) if p[3] and p[:3] in lut else p for p in px]
            dst_rel = f'{t}/{a.new_id}/{UP_TO_GAME.get(m, m)}/{name}.png'
            dst = os.path.join(up.LIB, dst_rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            o = Image.new('RGBA', im.size); o.putdata(out); o.save(dst)
            written.append(dst_rel)
    # catalogue: new entry right after our original item, same slot
    cat = json.load(open(up.CATALOGUE))
    orig_id = a.after or '/'.join(a.item.split('/')[1:])
    slot, idx = next((s, i) for s, arr in cat.items() for i, e in enumerate(arr) if e.get('id') == orig_id)
    if any(e.get('id') == a.new_id for e in cat[slot]):
        print(f'{a.new_id} already in the catalogue; files refreshed only')
    else:
        orig = cat[slot][idx]
        entry = {k: v for k, v in orig.items() if k not in ('id', 'label', 'colors', 'anims', 'companions')}
        entry.update({'id': a.new_id, 'label': a.label, 'colors': sorted(ramps), 'anims': [UP_TO_GAME.get(m, m) for m in motions]})
        cat[slot].insert(idx + 1, entry)
        open(up.CATALOGUE, 'w').write(json.dumps(cat, indent=2, ensure_ascii=False))
    # credits: the item's upstream credits, one row per file
    cr = up.credit_for(f'{a.item}/walk.png', up.upstream_credits(), up.sheet_definition_credits())
    if not cr:
        sys.exit('no upstream credit found — files written but NOT credited; fix before shipping')
    have = open(up.CREDITS, encoding='utf-8').read()
    buf = io.StringIO()
    w = csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator='\n')
    note = (cr[0] + '; ' if cr[0] else '') + f'upstream redrawn version of {a.item}, recoloured per colour with upstream {mat} palettes for Arcane Majesty'
    for rel in written:
        if f'"{rel}"' not in have:
            w.writerow([rel, note, cr[1], cr[2], cr[3]])
    with open(up.CREDITS, 'a', encoding='utf-8') as f:
        if not have.endswith('\n'):
            f.write('\n')
        f.write(buf.getvalue())
    print(f'{len(written)} sheets → {t}/{a.new_id}; catalogue slot {slot}; credited to {cr[1]}')


if __name__ == '__main__':
    sys.exit(main())
