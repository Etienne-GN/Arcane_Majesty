#!/usr/bin/env python3
"""python3 tools/models/compare.py <subject> [male|female] — after shots.mjs <subject>: the sheet's front, side and back
views (docs/3d/characters/base_mesh_reference.jpg) each beside the model's own, cropped to the figure, same height:
tools/.out/models/compare_<subject>.png. Look at it before showing a body to the user."""
import sys
from pathlib import Path
from PIL import Image
app = Path(__file__).resolve().parents[2]
subject, sex = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'male')
D = app / 'tools/.out/models'
sheet = Image.open(app.parents[1] / 'docs/3d/characters/base_mesh_reference.jpg').convert('RGB')
y0, y1 = (70, 610) if sex == 'male' else (650, 1195)
crops = {'front': (20, y0, 370, y1), 'side': (380, y0, 560, y1), 'back': (560, y0, 890, y1)}
H = 1000
parts = []
for v, box in crops.items():
    a = sheet.crop(box); a = a.resize((int(a.width * H / a.height), H))
    shot = Image.open(D / f'{subject}_{v}.png').convert('RGB'); px = shot.load(); W, Hs = shot.size
    fig = lambda c: abs(c[0] - c[2]) > 14   # (the figure: warm skin or dark cloth against the grey stage)
    cols = [i for i in range(W) if any(fig(px[i, j]) for j in range(0, Hs, 6))]
    rows = [j for j in range(Hs) if any(fig(px[i, j]) for i in range(0, W, 6))]
    b = shot.crop((max(0, cols[0] - 20), max(0, rows[0] - 10), min(W, cols[-1] + 20), min(Hs, rows[-1] + 10)))
    b = b.resize((int(b.width * H / b.height), H))
    parts += [a, b]
out = Image.new('RGB', (sum(p.width for p in parts) + 30 * len(parts), H + 40), (40, 40, 40))
x = 0
for i, p in enumerate(parts): out.paste(p, (x, 20)); x += p.width + (10 if i % 2 == 0 else 50)
out.save(D / f'compare_{subject}.png'); print(D / f'compare_{subject}.png')
