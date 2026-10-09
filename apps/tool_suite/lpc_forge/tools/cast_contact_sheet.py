#!/usr/bin/env python3
"""
Contact sheet of every cast member (apps/amo/src/data/cast): its v1 Forge
preview (if it came from a v1 save) next to the v2 rendering in a few motions,
facing down. Same recolour rule as the game. For checking migrations by eye.

    python3 tools/cast_contact_sheet.py out.png [walk run jump ...]
"""
import base64
import glob
import io
import json
import os
import sqlite3
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
FORGE = os.path.dirname(HERE)
AMO = os.path.normpath(os.path.join(FORGE, '..', '..', 'amo'))
LIB = os.path.join(AMO, 'ressources', 'lpc_merged', 'spritesheets')
WALK_COL = {'walk': 0}   # walk column 0 is the standing frame; others use frame 1


def layer_path(l, anim):
    base = os.path.join(LIB, l['type'], l['id'])
    if l.get('itemName'):
        return os.path.join(base, anim, f"{l['itemName']}.png")
    if l.get('color') is not None:
        return os.path.join(base, anim, f"{l['color']}.png")
    if l['type'] == 'weapon':
        return os.path.join(base, anim, f"{l['id'].split('/')[-1]}.png")
    if l['type'] in ('cape', 'backpack'):
        return os.path.join(base, anim, 'red.png')
    return base + f'/{anim}.png'


def remap(img, sp):
    src = [((v >> 16) & 255, (v >> 8) & 255, v & 255) for v in sp['sourceColors']]
    tgt = [((v >> 16) & 255, (v >> 8) & 255, v & 255) for v in sp['targetShades']]
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            d = [(r - s[0]) ** 2 + (g - s[1]) ** 2 + (b - s[2]) ** 2 for s in src]
            i = min(range(len(d)), key=d.__getitem__)
            if d[i] <= 27:
                px[x, y] = (*tgt[i], a)
    return img


def frame(l, anim, col, row=2):
    if l.get('anims') and anim not in l['anims']:
        return None
    p = layer_path(l, anim)
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGBA')
    w, h = im.size
    fs = next((f for f in (64, 128, 192, 256) if h == f * 4 and w % f == 0), h)
    r = row if h // fs == 4 else 0
    fr = im.crop((col * fs, r * fs, col * fs + fs, r * fs + fs))
    if l.get('swapParams'):
        fr = remap(fr, l['swapParams'])
    if fs > 64:
        o = (fs - 64) // 2
        fr = fr.crop((o, o, o + 64, o + 64))
    return fr


def render(layers, anim):
    out = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    for l in layers:
        f = frame(l, anim, WALK_COL.get(anim, 1))
        if f:
            out.alpha_composite(f)
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    out_path, motions = sys.argv[1], sys.argv[2:] or ['walk', 'run', 'jump']
    db = sqlite3.connect(os.path.join(FORGE, 'saves.db'))
    previews = {n: p for n, p in db.execute("SELECT name, preview FROM saves WHERE type = 'character'")}
    casts = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(AMO, 'src', 'data', 'cast', '*.json')))]
    cell = 128
    sheet = Image.new('RGBA', ((len(motions) + 1) * cell + 10, len(casts) * (cell + 14) + 20), (30, 32, 38, 255))
    d = ImageDraw.Draw(sheet)
    for x, t in enumerate(['v1 preview'] + [f'v2 {m}' for m in motions]):
        d.text((x * cell + 4, 4), t, fill=(200, 200, 200, 255))
    for i, c in enumerate(casts):
        y = 20 + i * (cell + 14)
        d.text((2, y), c['name'], fill=(230, 230, 230, 255))
        pv = previews.get(c['name'])
        if pv and pv.startswith('data:'):
            im = Image.open(io.BytesIO(base64.b64decode(pv.split(',', 1)[1]))).convert('RGBA')
            im.thumbnail((cell, cell))
            sheet.alpha_composite(im, (0, y + 12))
        for k, m in enumerate(motions):
            sheet.alpha_composite(render(c['layers'], m).resize((cell, cell), Image.NEAREST), ((k + 1) * cell, y + 12))
    sheet.save(out_path)
    print(f'{len(casts)} cast members → {out_path}')


if __name__ == '__main__':
    sys.exit(main())
