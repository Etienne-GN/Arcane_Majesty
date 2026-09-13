#!/usr/bin/env python3
"""
Crops a contact_sheet.py --grid-atlas output image into horizontal row-band
images, for dispatching one naming subagent per band on a sheet too big to
hand over as a single image. Each band keeps full row width (autotile
adjacency needs the whole row), so only rows are chunked.

Usage (run from apps/amo/):
    python3 tools/sprite_catalogue/split_grid_atlas_bands.py \
        --catalogue public/assets/catalogued/tilesets/lpc/base_out_atlas.catalogue.json \
        --atlas-png /tmp/scratch/base_out_atlas_atlas.png \
        --rows-per-band 4 \
        --out-dir /tmp/scratch/bands

Writes <out-dir>/band_<r0>-<r1>.png per band. Bands with zero visible
(non-checkerboard) content are skipped automatically -- can't tell from
pixels alone, so this only skips a band if the catalogue says no entry in
that row range is present at all.
"""
import argparse
import json
from pathlib import Path

from PIL import Image


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--catalogue', required=True)
    ap.add_argument('--atlas-png', required=True, help='output of contact_sheet.py --grid-atlas')
    ap.add_argument('--rows-per-band', type=int, default=4)
    ap.add_argument('--out-dir', required=True)
    args = ap.parse_args()

    cat = json.loads(Path(args.catalogue).read_text())
    grid_rows = cat['gridRows']
    im = Image.open(args.atlas_png)
    row_h = im.height / grid_rows
    assert row_h == int(row_h), f'image height {im.height} does not divide evenly by {grid_rows} rows'
    row_h = int(row_h)

    entries_by_row = {}
    for e in cat['entries']:
        if e.get('kind') == 'tile' and e.get('needsNaming'):
            entries_by_row.setdefault(e['row'], []).append(e)

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for r0 in range(0, grid_rows, args.rows_per_band):
        r1 = min(r0 + args.rows_per_band, grid_rows) - 1
        rows_with_content = [r for r in range(r0, r1 + 1) if entries_by_row.get(r)]
        if not rows_with_content:
            continue
        crop = im.crop((0, r0 * row_h, im.width, (r1 + 1) * row_h))
        path = out_dir / f'band_{r0:02d}-{r1:02d}.png'
        crop.save(path)
        n_entries = sum(len(entries_by_row.get(r, [])) for r in range(r0, r1 + 1))
        written.append((str(path), r0, r1, n_entries))

    for path, r0, r1, n in written:
        print(f'rows {r0:2d}-{r1:2d}: {n:3d} needsNaming entries -> {path}')
    print(f'{len(written)} band(s) written')


if __name__ == '__main__':
    main()
