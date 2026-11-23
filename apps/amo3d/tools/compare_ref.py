#!/usr/bin/env python3
"""A clean side-by-side of our base bodies against the reference sheet (docs/3d/characters/base_mesh_reference.jpg).

Each view (male/female × front/side/back) is cut out as ONE figure: the largest connected shape in its crop — stray
pieces (a neighbouring figure's hand, the sheet's titles) are blanked out — then ours and the reference are scaled to
the same height and laid side by side on the sheet's grey.
    python3 tools/compare_ref.py <shots dir> <out.png>
The shots dir holds m0 m1 m2 w0 w1 w2 .png (male/female front, side, back) rendered by the Character Lab
(__lab.plain(); __lab.solo(i); __lab.setYaw(…)).
"""
import sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw

REF = '/home/etienne/projects/Arcane_Majesty/docs/3d/characters/base_mesh_reference.jpg'
BOX = {'m0': (0, 70, 335, 620), 'm1': (335, 70, 560, 620), 'm2': (555, 70, 896, 620),
       'w0': (0, 650, 335, 1200), 'w1': (335, 650, 560, 1200), 'w2': (555, 650, 896, 1200)}
BG = (59, 59, 59)


def figure(im, thr=26):
    """The largest connected non-background shape of im, on the sheet's grey, cropped to it."""
    a = np.asarray(im.convert('RGB')).astype(int)
    bg = np.median(np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)]), axis=0)
    mask = np.abs(a - bg).sum(axis=2) > thr
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); best, best_n, n = 0, 0, 0
    for y0 in range(0, h, 2):
        for x0 in range(0, w, 2):
            if not mask[y0, x0] or lab[y0, x0]: continue
            n += 1; q = deque([(y0, x0)]); lab[y0, x0] = n; size = 0
            while q:
                y, x = q.popleft(); size += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                        lab[yy, xx] = n; q.append((yy, xx))
            if size > best_n: best, best_n = n, size
    keep = lab == best
    ys, xs = np.where(keep)
    out = np.where(keep[..., None], a, np.array(BG)).astype(np.uint8)
    return Image.fromarray(out[ys.min():ys.max() + 1, xs.min():xs.max() + 1])


def main(shots, out_path, H=430):
    ref = Image.open(REF).convert('RGB')
    fit = lambda im: im.resize((max(1, int(im.width * H / im.height)), H))
    rows = []
    for sex in 'mw':
        tiles = []
        for v in range(3):
            k = f'{sex}{v}'
            tiles.append(('OURS', fit(figure(Image.open(f'{shots}/{k}.png')))))
            tiles.append(('REFERENCE', fit(figure(ref.crop(BOX[k])))))
        rows.append(tiles)
    gap = 26
    W = max(sum(t.width for _, t in r) + gap * (len(r) + 1) for r in rows)
    o = Image.new('RGB', (W, len(rows) * (H + 46)), BG); d = ImageDraw.Draw(o)
    for ri, r in enumerate(rows):
        x = gap
        for i, (label, t) in enumerate(r):
            y = ri * (H + 46) + 32
            o.paste(t, (x, y)); d.text((x, y - 22), label, fill=(235, 220, 180) if label == 'OURS' else (190, 190, 190))
            x += t.width + (gap if i % 2 == 0 else gap * 2)
    o.save(out_path)
    print(out_path, o.size)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
