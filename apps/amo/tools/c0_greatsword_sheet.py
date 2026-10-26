#!/usr/bin/env python3
"""C0 (combat spec): a contact sheet of LPC sword swings, to judge whether the
longsword's swing can stand in for a two-handed sword. Each argument is
FRAME:PNG (FRAME = the sheet's frame size: 64, 128 or 192; rows up/left/down/right),
drawn as one strip each, all scaled to the same frame size so they compare.
Usage: python3 tools/c0_greatsword_sheet.py OUT.png 192:a.png 128:b.png ..."""
import sys
from PIL import Image

out, args = sys.argv[1], sys.argv[2:]
CELL = 192
rows = []
for a in args:
    frame, path = a.split(':', 1)
    frame = int(frame)
    im = Image.open(path).convert('RGBA')
    cols, n = im.width // frame, im.height // frame
    row = Image.new('RGBA', (cols * CELL, n * CELL), (40, 60, 40, 255))
    for r in range(n):
        for c in range(cols):
            cell = im.crop((c * frame, r * frame, (c + 1) * frame, (r + 1) * frame))
            off = (CELL - frame) // 2
            row.alpha_composite(cell, (c * CELL + off, r * CELL + off))
    rows.append(row)
W, H = max(r.width for r in rows), sum(r.height for r in rows) + 8 * len(rows)
sheet, y = Image.new('RGBA', (W, H), (20, 20, 20, 255)), 0
for r in rows:
    sheet.alpha_composite(r, (0, y))
    y += r.height + 8
sheet.save(out)
print(out, sheet.size)
