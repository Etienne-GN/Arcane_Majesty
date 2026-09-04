#!/usr/bin/env python3
"""
Generates colour variants of a catalogued sprite and writes them as a new
sheet plus its catalogue, so the variants are ordinary catalogued sprites
rather than something the renderer has to tint at runtime.

Two modes, because two very different things get asked for:

  ink  — the sprite is drawn in exactly one ink colour (a glyph, a rune, a
         magic circle). Every opaque pixel is that colour at varying alpha, so
         swapping it is exact: replace RGB, keep alpha untouched. Anti-aliased
         edges survive because they were alpha, never a lighter colour. Two or
         more colours are refused here — that is usually an outline plus a
         fill, and flattening them loses the outline.

  hue  — the sprite is full-colour art. Rotate hue in HSV and keep saturation
         and value, so shading and highlights hold their relationships. This
         is an approximation and will look wrong on anything with a
         deliberately non-uniform palette; look at the result.

Runtime tinting is not the same thing: Phaser's setTint multiplies, so it can
darken a sprite but can never make a dark one pale — which is exactly what
recolouring a dark glyph to a light one needs.

Run: python3 recolour.py --catalogue sheet.catalogue.json --entry magic_circle_gray \
       --colours "#c8462d:red,#3a6ed8:blue" --out-dir public/assets/catalogued/tilesets/generated
"""
import argparse
import colorsys
import json
import os
import re
import sys

from PIL import Image

ALPHA_FLOOR = 0


def _pixels(img):
    """Flat RGBA pixel list. Image.getdata() is deprecated in Pillow 12+."""
    getter = getattr(img, 'get_flattened_data', None) or img.getdata
    return list(getter())


def parse_colours(text):
    """"#rrggbb:name,#rrggbb:name" -> [(name, (r, g, b)), ...]"""
    out = []
    for chunk in text.split(','):
        chunk = chunk.strip()
        if not chunk:
            continue
        hexpart, _, name = chunk.partition(':')
        hexpart = hexpart.strip().lstrip('#')
        if not re.fullmatch(r'[0-9a-fA-F]{6}', hexpart):
            raise ValueError(f'not a #rrggbb colour: {chunk}')
        rgb = tuple(int(hexpart[i:i + 2], 16) for i in (0, 2, 4))
        name = name.strip() or f'{hexpart.lower()}'
        if not re.fullmatch(r'[a-z0-9_]+', name):
            raise ValueError(f'colour name "{name}" is not snake_case')
        out.append((name, rgb))
    if not out:
        raise ValueError('no colours given')
    return out


def entry_box(cat, entry):
    if entry.get('kind') == 'tile':
        tw, th = cat['gridTileWidth'], cat['gridTileHeight']
        return entry['col'] * tw, entry['row'] * th, tw, th
    return entry['x'], entry['y'], entry['w'], entry['h']


def ink_colours(img):
    """Distinct RGB values among opaque pixels — the test for `ink` mode."""
    return {px[:3] for px in _pixels(img) if px[3] > ALPHA_FLOOR}


def recolour_ink(img, rgb):
    """Replace every opaque pixel's RGB, leaving alpha exactly as it was."""
    out = Image.new('RGBA', img.size)
    out.putdata([(rgb[0], rgb[1], rgb[2], px[3]) if px[3] > ALPHA_FLOOR else px
                 for px in _pixels(img)])
    return out


def recolour_hue(img, rgb):
    """Rotate every pixel's hue to the target's, keeping its own S and V."""
    th = colorsys.rgb_to_hsv(*[c / 255 for c in rgb])[0]
    data = []
    for r, g, b, a in _pixels(img):
        if a <= ALPHA_FLOOR:
            data.append((r, g, b, a))
            continue
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        nr, ng, nb = colorsys.hsv_to_rgb(th, s, v)
        data.append((round(nr * 255), round(ng * 255), round(nb * 255), a))
    out = Image.new('RGBA', img.size)
    out.putdata(data)
    return out


def build(cat_path, entry_name, colours, out_dir, mode, base_name=None, tags=None):
    with open(cat_path) as fh:
        cat = json.load(fh)
    entry = next((e for e in cat.get('entries', []) if e.get('name') == entry_name), None)
    if entry is None:
        return None, f'no entry named "{entry_name}" in {cat_path}'

    sheet = Image.open(os.path.join(os.path.dirname(cat_path), cat['source'])).convert('RGBA')
    x, y, w, h = entry_box(cat, entry)
    sprite = sheet.crop((x, y, x + w, y + h))

    inks = ink_colours(sprite)
    # Exactly one RGB is what "ink" means: a glyph whose shading is alpha, not
    # a second colour. Two colours usually means an outline plus a fill, and
    # collapsing those to one flattens the sprite — refuse rather than ruin it.
    if mode == 'auto':
        mode = 'ink' if len(inks) == 1 else 'hue'
    if mode == 'ink' and len(inks) != 1:
        return None, (f'"{entry_name}" uses {len(inks)} distinct colours — ink mode is for '
                      f'single-colour art and would flatten them; use --mode hue')

    fn = recolour_ink if mode == 'ink' else recolour_hue
    base = base_name or entry_name
    # Variants laid out left to right on one strip: one sheet, one catalogue,
    # and the row reads as a set the way the source art does.
    out_img = Image.new('RGBA', (w * len(colours), h), (0, 0, 0, 0))
    entries = []
    for i, (cname, rgb) in enumerate(colours):
        out_img.paste(fn(sprite, rgb), (i * w, 0))
        entries.append({
            'name': f'{base}_{cname}', 'kind': 'object',
            'x': i * w, 'y': 0, 'w': w, 'h': h,
            'tags': list(dict.fromkeys([*(tags or []), *entry.get('tags', []), 'recoloured'])),
        })

    os.makedirs(out_dir, exist_ok=True)
    png_name = f'{base}_variants.png'
    out_img.save(os.path.join(out_dir, png_name))
    out_cat = {'source': png_name, 'sheetWidth': out_img.width, 'sheetHeight': out_img.height,
               'entries': entries}
    cat_out = os.path.join(out_dir, f'{base}_variants.catalogue.json')
    with open(cat_out, 'w') as fh:
        json.dump(out_cat, fh, indent=2)
        fh.write('\n')
    return (cat_out, mode, len(entries)), None


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', required=True)
    parser.add_argument('--entry', required=True)
    parser.add_argument('--colours', required=True, help='"#rrggbb:name,#rrggbb:name"')
    parser.add_argument('--out-dir', required=True)
    parser.add_argument('--mode', choices=['auto', 'ink', 'hue'], default='auto')
    parser.add_argument('--base-name', help='name stem for the variants (default: the entry name)')
    parser.add_argument('--tags', default='', help='extra comma-separated tags')
    args = parser.parse_args(argv)

    try:
        colours = parse_colours(args.colours)
    except ValueError as exc:
        print(f'X {exc}', file=sys.stderr)
        return 1

    tags = [t.strip() for t in args.tags.split(',') if t.strip()]
    result, err = build(args.catalogue, args.entry, colours, args.out_dir, args.mode,
                        args.base_name, tags)
    if err:
        print(f'X {err}', file=sys.stderr)
        return 1
    cat_out, mode, n = result
    print(f'wrote {cat_out} — {n} variant(s), {mode} mode')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
