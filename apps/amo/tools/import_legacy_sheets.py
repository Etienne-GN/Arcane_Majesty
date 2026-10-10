#!/usr/bin/env python3
"""
Import 2017-style single-sheet LPC items (832x1344: spellcast, thrust, walk,
slash, shoot, hurt) as named alternate catalogue items, per tools/legacy_imports.json.
Each becomes per-motion sheets in the library (only motions with art), a
catalogue entry placed after its modern counterpart with the pack suffix in
its label, and per-file credits.

    python3 tools/import_legacy_sheets.py            # report
    python3 tools/import_legacy_sheets.py --apply
Then: python3 tools/assign_tint_sources.py --apply; npm run gen:anims
"""
import argparse
import csv
import io
import json
import os
import sys
import zipfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sync_upstream_motions as up  # noqa: E402

ARCHIVES = os.path.join(up.AMO, 'ressources', 'processed_archives')
SPEC = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'legacy_imports.json')
# old single-sheet layout: motion → (first row, columns, rows)
OLD = {'spellcast': (0, 7, 4), 'thrust': (4, 8, 4), 'walk': (8, 9, 4), 'slash': (12, 6, 4), 'shoot': (16, 13, 4), 'hurt': (20, 6, 1)}


def open_source(src):
    if ':' in src:
        zname, member = src.split(':', 1)
        with zipfile.ZipFile(os.path.join(ARCHIVES, zname)) as z:
            return Image.open(io.BytesIO(z.read(member))).convert('RGBA')
    return Image.open(os.path.join(ARCHIVES, src)).convert('RGBA')


def motions_of(sheet, keep_rows=None):  # keep_rows: kept for partial-row imports
    """{motion: per-motion image} for motions with art; keep_rows limits which direction rows survive."""
    out = {}
    for m, (r0, cols, rows) in OLD.items():
        im = sheet.crop((0, r0 * 64, cols * 64, (r0 + rows) * 64))
        if keep_rows is not None:
            mask = Image.new('RGBA', im.size)
            for r in range(rows):
                if (r if rows == 4 else 'hurt') in keep_rows:
                    mask.paste(im.crop((0, r * 64, im.width, r * 64 + 64)), (0, r * 64))
            im = mask
        if im.getbbox():
            out[m] = im
    return out


def write(rel, im, written):
    dst = os.path.join(up.LIB, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im.save(dst)
    written.append(rel)


def layer_files(t, lid, sources, item_name=None, keep_rows=None):
    """Write one layer's sheets. sources: path, or {colour: path}. Returns (motions present, files written)."""
    written, motions = [], set()
    if isinstance(sources, dict):
        for colour, src in sources.items():
            for m, im in motions_of(open_source(src), keep_rows).items():
                write(f'{t}/{lid}/{m}/{colour}.png', im, written); motions.add(m)
    else:
        name = item_name or (lid.split('/')[-1] if t == 'weapon' else None)
        for m, im in motions_of(open_source(sources), keep_rows).items():
            write(f'{t}/{lid}/{m}/{name}.png' if name else f'{t}/{lid}/{m}.png', im, written); motions.add(m)
    return sorted(motions, key=list(OLD).index), written


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()
    spec = json.load(open(SPEC))
    cat = json.load(open(up.CATALOGUE))
    have = open(up.CREDITS, encoding='utf-8').read()
    rows = []
    for pack, p in spec['packs'].items():
        cr = p['credit']
        for it in p['items']:
            t = up.render_type(it['slot'])
            label = it['label'] + p['suffix']
            print(f'{pack:10} {it["slot"]:13} {label}')
            if not a.apply:
                continue
            written = []
            if it.get('layers'):   # several sheets forming one item, e.g. cape front + behind-the-body panel
                layers = []
                for name, ly in it['layers'].items():
                    ms, w = layer_files(t, it['id'], ly['source'], name)
                    written += w
                    layers.append({'id': it['id'], 'itemName': name, 'zPos': ly['zPos'], 'anims': ms})
                entry = {**layers[0], 'label': label, 'companions': layers[1:]}
            else:
                src = it.get('colours') or it['source']
                ms, w = layer_files(t, it['id'], src)
                written += w
                entry = {'id': it['id'], 'label': label, 'zPos': it['zPos'], 'anims': ms}
                if it.get('colours'):
                    entry['colors'] = list(it['colours'])
                if it.get('back'):
                    b = it['back']
                    bm, bw = layer_files(t, b['id'], b.get('colours') or b['source'])
                    written += bw
                    entry['companions'] = [{'id': b['id'], 'zPos': b['zPos'], 'anims': bm}]
            entry['legacyOf'] = it['after']
            lst = cat[it['slot']]
            existing = next((i for i, e in enumerate(lst) if e.get('id') == it['id']), None)
            if existing is not None:
                lst[existing].update(entry)
            else:
                at = next(i for i, e in enumerate(lst) if e.get('id') == it['after'])
                while at + 1 < len(lst) and lst[at + 1].get('legacyOf') == it['after']:
                    at += 1      # keep several alternates of one item together, in spec order
                lst.insert(at + 1, entry)
            for rel in written:
                if f'"{rel}"' not in have:
                    rows.append([rel, cr['notes'], cr['authors'], cr['licenses'], cr['urls']])
            print(f'           → {len(written)} sheets')
    if a.apply:
        open(up.CATALOGUE, 'w').write(json.dumps(cat, indent=2, ensure_ascii=False))
        buf = io.StringIO()
        csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator='\n').writerows(rows)
        with open(up.CREDITS, 'a', encoding='utf-8') as f:
            if not have.endswith('\n'):
                f.write('\n')
            f.write(buf.getvalue())
        print(f'catalogue updated; {len(rows)} credit rows added')


if __name__ == '__main__':
    sys.exit(main())
