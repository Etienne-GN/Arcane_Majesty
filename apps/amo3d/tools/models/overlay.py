#!/usr/bin/env python3
"""python3 tools/models/overlay.py <subject> [male|female] — the subject's silhouette outline (tools/models/silhouette.mjs)
drawn in red over the reference sheet's figure, front and side, scaled to the same height (head top to sole), as the
Sculptor's reference › Fit does: tools/.out/models/<subject>_overlay.png. Also prints the widths row by row."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw
app = Path(__file__).resolve().parents[2]
subject = sys.argv[1] if len(sys.argv) > 1 else 'base_male'
sex = sys.argv[2] if len(sys.argv) > 2 else ('female' if 'female' in subject else 'male')
d = json.loads((app / f'tools/.out/models/{subject}_sil.json').read_text())
R, W, H = d['R'], d['W'], d['H']
grid = {v: [row for row in d[v].split('\n') if row] for v in ('front', 'side')}
sheet = Image.open(app / 'src/sculptor/base_mesh_reference.jpg').convert('RGB')
# each figure: head top, sole, centre line (sheet px) — the same numbers as the Sculptor's Fit
FIG = {'male': {'front': (89, 596, 188), 'side': (89, 596, 464)}, 'female': {'front': (670, 1175, 181.5), 'side': (670, 1174, 465)}}
tiles = []
for view in ('front', 'side'):
    g = grid[view]; top = max(y for y in range(H) if '1' in g[y]); top_m = (top + 1) * R
    t, sole, cx = FIG[sex][view]; k = (sole - t) / top_m   # sheet px per metre
    x0, x1 = (int(cx - 0.62 * k), int(cx + 0.62 * k)) if view == 'front' else (int(cx - 0.3 * k), int(cx + 0.3 * k))
    crop = sheet.crop((x0, t - 15, x1, sole + 10)); S = 3
    crop = crop.resize((crop.width * S, crop.height * S), Image.LANCZOS); dr = ImageDraw.Draw(crop)
    for y in range(H):
        for x in range(W):
            if g[y][x] != '1': continue
            edge = any(not (0 <= y + dy < H and 0 <= x + dx < W and g[y + dy][x + dx] == '1') for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if not edge: continue
            m = (x - W / 2) * R; sx = cx + (m if view == 'front' else -m) * k; sy = sole - y * R * k
            px, py = (sx - x0) * S, (sy - (t - 15)) * S; dr.rectangle([px - 1, py - 1, px + 1, py + 1], fill=(255, 40, 40))
    for frac in (0.25, 0.5, 0.75):   # guide lines
        yy = (sole - frac * (sole - t) - (t - 15)) * S; dr.line([(0, yy), (crop.width, yy)], fill=(90, 200, 255), width=1)
    tiles.append(crop)
out = Image.new('RGB', (sum(t.width for t in tiles) + 20, max(t.height for t in tiles)), (30, 30, 30)); x = 0
for t in tiles: out.paste(t, (x, 0)); x += t.width + 20
p = app / f'tools/.out/models/{subject}_overlay.png'; out.save(p); print(p)
