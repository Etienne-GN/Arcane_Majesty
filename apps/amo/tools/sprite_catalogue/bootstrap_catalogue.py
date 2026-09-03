#!/usr/bin/env python3
"""
Turns a raw sprite pack into draft *.catalogue.json files with zero human or
model involvement: geometry comes from the alpha channel (autoslice), names
and tags come from the file path.

This exists because ~700 of the repo's first 950 catalogues were a single
entry whose box was the whole image and whose name was the filename — work a
script does exactly and instantly. Run this on intake; spend attention only on
the sheets a map actually needs (see contact_sheet.py).

Entries it can't name meaningfully carry `needsNaming: true`, which is the
queue contact_sheet.py works from.

Run: python3 bootstrap_catalogue.py --path ressources/some_pack [--tags pack,author]
     python3 bootstrap_catalogue.py --path sheet.png --grid 32
     python3 bootstrap_catalogue.py --path public/assets/catalogued --repair
"""
import argparse
import json
import os
import re
import sys

from autoslice import content_bbox, find_boxes, grid_cells, load_mask, suggest_grid

# A sheet with more islands than this is almost certainly a tile grid or an
# animation strip; slicing it into hundreds of unnamed objects makes noise, not
# a catalogue. Flagged for a human decision instead.
ISLAND_LIMIT = 120


def slug(text):
    """Filesystem-ish text → snake_case identifier."""
    text = re.sub(r'\.[A-Za-z0-9]+$', '', text)
    text = re.sub(r'[^A-Za-z0-9]+', '_', text)
    text = re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '_', text)
    return re.sub(r'_+', '_', text).strip('_').lower() or 'sprite'


def path_tags(png_path, root):
    """Directory segments between the pack root and the sheet, as tags."""
    rel = os.path.relpath(png_path, root)
    parts = [slug(p) for p in os.path.dirname(rel).split(os.sep) if p not in ('', '.')]
    return [p for p in parts if p]


def build_catalogue(png_path, root, extra_tags=(), grid=None, gap=1, min_area=16,
                    max_islands=ISLAND_LIMIT):
    mask = load_mask(png_path)
    height, width = mask.shape
    base = slug(os.path.basename(png_path))
    tags = list(dict.fromkeys([*path_tags(png_path, root), *extra_tags]))

    cat = {'source': os.path.basename(png_path), 'sheetWidth': width, 'sheetHeight': height,
           'entries': []}

    if grid:
        cols, rows = width // grid, height // grid
        if cols * grid != width or rows * grid != height:
            return None, f'grid {grid} does not divide {width}x{height} evenly'
        cat.update(gridTileWidth=grid, gridTileHeight=grid, gridCols=cols, gridRows=rows)
        for i, cell in enumerate(grid_cells(mask, grid, grid)):
            cat['entries'].append({
                'name': f'{base}_r{cell["row"]}c{cell["col"]}', 'kind': 'tile',
                'row': cell['row'], 'col': cell['col'],
                'frameIndex': cell['row'] * cols + cell['col'],
                'tags': tags, 'needsNaming': True,
            })
        return cat, None

    boxes = find_boxes(mask, gap=gap, min_area=min_area)
    if not boxes:
        return None, 'sheet is fully transparent'
    if max_islands and len(boxes) > max_islands:
        return None, (f'{len(boxes)} islands — looks like a tile grid or animation strip; '
                      f'rerun with --grid (candidates: {suggest_grid(mask)}), or pass '
                      f'--max-islands once you have looked and confirmed they really are '
                      f'that many separate sprites')

    if len(boxes) == 1:
        # One sprite per file: the filename IS the name, and the alpha box is a
        # strictly better region than the whole-image box a hand pass writes.
        cat['entries'].append({'name': base, 'kind': 'object', **boxes[0], 'tags': tags})
    else:
        for i, box in enumerate(boxes):
            cat['entries'].append({
                'name': f'{base}_{i:03d}', 'kind': 'object', **box,
                'tags': tags, 'needsNaming': True,
            })
    return cat, None


def repair(cat_path):
    """Tighten whole-image boxes on an existing catalogue, leaving names alone.

    Only touches `kind: "object"` entries whose box is the entire sheet — the
    signature of a bootstrap that never looked at the pixels.
    """
    with open(cat_path) as fh:
        cat = json.load(fh)
    png = os.path.join(os.path.dirname(cat_path), cat.get('source', ''))
    if not os.path.exists(png):
        return 0
    entries = [e for e in cat.get('entries', [])
               if e.get('kind') == 'object'
               and e.get('x') == 0 and e.get('y') == 0
               and e.get('w') == cat.get('sheetWidth') and e.get('h') == cat.get('sheetHeight')]
    if not entries:
        return 0
    box = content_bbox(load_mask(png))
    if not box or (box['w'] == cat['sheetWidth'] and box['h'] == cat['sheetHeight']):
        return 0
    for e in entries:
        e.update(box)
        e.pop('lowConfidence', None)   # geometry is now derived, not guessed
    with open(cat_path, 'w') as fh:
        json.dump(cat, fh, indent=2)
        fh.write('\n')
    return len(entries)


def iter_pngs(path):
    if os.path.isfile(path):
        yield path
        return
    for dirpath, _, files in sorted(os.walk(path)):
        for f in sorted(files):
            if f.lower().endswith('.png'):
                yield os.path.join(dirpath, f)


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--path', required=True, help='pack directory or single PNG')
    parser.add_argument('--tags', default='', help='comma-separated tags added to every entry')
    parser.add_argument('--grid', type=int, help='treat sheets as a fixed grid of this tile size')
    parser.add_argument('--gap', type=int, default=1)
    parser.add_argument('--min-area', type=int, default=16)
    parser.add_argument('--max-islands', type=int, default=ISLAND_LIMIT,
                        help=f'refuse a sheet with more islands than this (default {ISLAND_LIMIT}, '
                             '0 disables) — the guard against slicing a tile grid into noise')
    parser.add_argument('--repair', action='store_true',
                        help='tighten whole-image boxes in existing catalogues instead')
    parser.add_argument('--out', help='write to this catalogue path (single PNG only) — use when '
                                      'the sheet already has a catalogue under a different basename')
    parser.add_argument('--force', action='store_true', help='overwrite existing catalogue files')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)

    if args.repair:
        total = fixed = 0
        for dirpath, _, files in sorted(os.walk(args.path)):
            for f in sorted(files):
                if not f.endswith('.catalogue.json'):
                    continue
                total += 1
                if args.dry_run:
                    continue
                n = repair(os.path.join(dirpath, f))
                if n:
                    fixed += 1
        print(f'repair: tightened {fixed} of {total} catalogue file(s)')
        return 0

    if args.out and not os.path.isfile(args.path):
        print('--out only applies to a single PNG', file=sys.stderr)
        return 1

    root = args.path if os.path.isdir(args.path) else os.path.dirname(args.path)
    extra = [slug(t) for t in args.tags.split(',') if t.strip()]
    written = skipped = 0
    for png in iter_pngs(args.path):
        out = args.out or re.sub(r'\.png$', '.catalogue.json', png, flags=re.I)
        if os.path.exists(out) and not args.force:
            skipped += 1
            continue
        cat, err = build_catalogue(png, root, extra, args.grid, args.gap, args.min_area,
                                   args.max_islands)
        if err:
            print(f'– skip {png}: {err}')
            skipped += 1
            continue
        named = sum(1 for e in cat['entries'] if e.get('needsNaming'))
        print(f'{"would write" if args.dry_run else "wrote"} {out} '
              f'({len(cat["entries"])} entries, {named} need naming)')
        if not args.dry_run:
            with open(out, 'w') as fh:
                json.dump(cat, fh, indent=2)
                fh.write('\n')
        written += 1
    print(f'\n{written} catalogue(s), {skipped} skipped')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
