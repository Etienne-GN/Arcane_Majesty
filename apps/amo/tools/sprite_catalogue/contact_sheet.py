#!/usr/bin/env python3
"""
Renders a catalogue's regions as numbered contact sheets, so a whole pack gets
named from a handful of images instead of one crop-and-verify round trip per
sprite.

Each sprite is drawn at its true pixels on a neutral checkerboard, scaled up,
with its entry index stamped beside it. Look at one page, write one JSON map of
index -> name, feed it to apply_names.py. ~40 sprites per look instead of 1.

Run: python3 contact_sheet.py --catalogue sheet.catalogue.json --out-dir /tmp/cs
     python3 contact_sheet.py --catalogue sheet.catalogue.json --only-unnamed
"""
import argparse
import json
import math
import os
import sys

from PIL import Image, ImageDraw

BG_A, BG_B = (58, 58, 66), (48, 48, 56)     # checkerboard, reads under any art
LABEL, BORDER = (255, 214, 102), (110, 110, 124)
CHECK = 8


def entry_box(cat, entry):
    """Pixel box for either entry kind, so both render through one path."""
    if entry.get('kind') == 'tile':
        tw, th = cat['gridTileWidth'], cat['gridTileHeight']
        return entry['col'] * tw, entry['row'] * th, tw, th
    return entry['x'], entry['y'], entry['w'], entry['h']


def checkerboard(size):
    img = Image.new('RGB', size, BG_A)
    d = ImageDraw.Draw(img)
    for y in range(0, size[1], CHECK):
        for x in range(0, size[0], CHECK):
            if (x // CHECK + y // CHECK) % 2:
                d.rectangle([x, y, x + CHECK - 1, y + CHECK - 1], fill=BG_B)
    return img


def render(cat, sheet_path, indices, cell, cols, scale, pad=6, label_h=14, fill=False):
    """One page: `indices` laid out in a grid of `cols` cells of `cell` px.

    By default every sprite shares one zoom factor, so relative sizes stay
    truthful across the page. `fill` zooms each sprite to its own cell instead,
    which reads better on a sheet of tiny 16px props.
    """
    sheet = Image.open(sheet_path).convert('RGBA')
    rows = math.ceil(len(indices) / cols)
    cw = cell * scale + pad * 2
    ch = cell * scale + pad * 2 + label_h
    page = checkerboard((cols * cw, rows * ch))
    draw = ImageDraw.Draw(page)

    for slot, idx in enumerate(indices):
        entry = cat['entries'][idx]
        x, y, w, h = entry_box(cat, entry)
        crop = sheet.crop((x, y, x + w, y + h))
        # Fit inside the cell without ever upscaling past `scale` -- a 128px
        # sprite and a 16px sprite both stay recognisable side by side.
        room = cell * scale
        factor = max(1, int(room / max(w, h))) if max(w, h) else 1
        if not fill:
            factor = min(scale, factor)
        crop = crop.resize((max(1, w * factor), max(1, h * factor)), Image.NEAREST)

        ox = (slot % cols) * cw
        oy = (slot // cols) * ch
        draw.rectangle([ox + 1, oy + 1, ox + cw - 2, oy + ch - 2], outline=BORDER)
        px = ox + pad + (cell * scale - crop.width) // 2
        py = oy + pad + label_h + (cell * scale - crop.height) // 2
        page.paste(crop, (px, py), crop)
        draw.text((ox + pad, oy + 3), str(idx), fill=LABEL)

    return page


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', required=True)
    parser.add_argument('--out-dir', default='/tmp/contact_sheets')
    parser.add_argument('--per-page', type=int, default=40)
    parser.add_argument('--cols', type=int, default=8)
    parser.add_argument('--cell', type=int, default=48, help='logical cell size in source px')
    parser.add_argument('--scale', type=int, default=3)
    parser.add_argument('--fill', action='store_true',
                        help='zoom each sprite to its own cell (better for tiny props)')
    parser.add_argument('--only-unnamed', action='store_true',
                        help='restrict to entries flagged needsNaming')
    args = parser.parse_args(argv)

    with open(args.catalogue) as fh:
        cat = json.load(fh)
    sheet_path = os.path.join(os.path.dirname(args.catalogue), cat['source'])

    indices = [i for i, e in enumerate(cat['entries'])
               if not args.only_unnamed or e.get('needsNaming')]
    if not indices:
        print('nothing to render (no entries, or none flagged needsNaming)')
        return 0

    os.makedirs(args.out_dir, exist_ok=True)
    base = os.path.basename(args.catalogue).replace('.catalogue.json', '')
    pages = math.ceil(len(indices) / args.per_page)
    for p in range(pages):
        chunk = indices[p * args.per_page:(p + 1) * args.per_page]
        img = render(cat, sheet_path, chunk, args.cell, args.cols, args.scale, fill=args.fill)
        out = os.path.join(args.out_dir, f'{base}_p{p + 1:02d}.png')
        img.save(out)
        print(f'{out}  -- indices {chunk[0]}..{chunk[-1]} ({len(chunk)} sprites)')
    print(f'\n{len(indices)} sprite(s) over {pages} page(s). '
          f'Name them into a JSON map, then: apply_names.py --catalogue {args.catalogue} --names <file>')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
