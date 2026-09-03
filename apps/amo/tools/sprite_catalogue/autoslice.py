#!/usr/bin/env python3
"""
Mechanically derives sprite regions from a spritesheet's alpha channel, so a
catalogue's *geometry* never has to be guessed-and-verified by hand.

Two modes:
  * island mode  — connected-component labelling over the non-transparent
    pixels; each island is one freestanding sprite, and its bounding box is
    exact by construction (no crop_check retry loop, no `lowConfidence`).
  * grid mode    — a fixed tile size is given; every non-empty cell becomes a
    `kind: "tile"` region.

Nothing here names anything. Naming is the one part that still needs a mind
looking at the pixels — see contact_sheet.py / apply_names.py.

Run: python3 autoslice.py --image sheet.png [--gap 1] [--min-area 16]
     python3 autoslice.py --image sheet.png --grid 32
"""
import argparse
import json
import sys

import numpy as np
from PIL import Image

ALPHA_THRESHOLD = 8


def load_mask(path, threshold=ALPHA_THRESHOLD):
    """Boolean array of 'this pixel is part of a sprite'.

    Sheets with no alpha channel are full-bleed (terrain atlases and the like):
    every pixel counts, which makes island mode degenerate to one big box and
    correctly pushes the caller toward grid mode.
    """
    im = Image.open(path)
    if im.mode != 'RGBA':
        if 'A' not in im.getbands():
            return np.ones((im.height, im.width), dtype=bool)
        im = im.convert('RGBA')
    alpha = np.array(im.getchannel('A'))
    return alpha > threshold


def _row_runs(mask):
    """Horizontal runs of set pixels, as (row, x0, x1_exclusive) per row."""
    height = mask.shape[0]
    per_row = []
    for y in range(height):
        row = mask[y]
        if not row.any():
            per_row.append([])
            continue
        edges = np.flatnonzero(np.diff(np.concatenate(([0], row.view(np.int8), [0]))))
        per_row.append([(int(edges[i]), int(edges[i + 1])) for i in range(0, len(edges), 2)])
    return per_row


def find_boxes(mask, gap=0, min_area=1):
    """Bounding boxes of alpha-connected islands, in reading order.

    `gap` tolerates transparent seams inside one logical sprite (a tree whose
    canopy floats a pixel clear of its trunk); two islands within `gap` pixels
    of each other are treated as one. `min_area` drops stray dust pixels.
    """
    per_row = _row_runs(mask)
    runs = []                      # (y, x0, x1)
    row_ids = []                   # run ids per row
    for y, spans in enumerate(per_row):
        ids = []
        for x0, x1 in spans:
            ids.append(len(runs))
            runs.append((y, x0, x1))
        row_ids.append(ids)

    parent = list(range(len(runs)))

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[max(ra, rb)] = min(ra, rb)

    for y, ids in enumerate(row_ids):
        if not ids:
            continue
        # Within the row: runs separated by no more than `gap` transparent
        # pixels are the same sprite (runs are ordered left to right).
        for a, b in zip(ids, ids[1:]):
            if runs[b][1] - runs[a][2] <= gap:
                union(a, b)
        for prev_y in range(max(0, y - gap - 1), y):
            for rid in ids:
                _, x0, x1 = runs[rid]
                for pid in row_ids[prev_y]:
                    _, px0, px1 = runs[pid]
                    if x0 - gap < px1 and px0 - gap < x1:
                        union(rid, pid)

    groups = {}
    for rid, (y, x0, x1) in enumerate(runs):
        root = find(rid)
        box = groups.get(root)
        if box is None:
            groups[root] = [x0, y, x1, y + 1]
        else:
            box[0] = min(box[0], x0)
            box[1] = min(box[1], y)
            box[2] = max(box[2], x1)
            box[3] = max(box[3], y + 1)

    boxes = []
    for x0, y0, x1, y1 in groups.values():
        w, h = x1 - x0, y1 - y0
        if w * h >= min_area:
            boxes.append({'x': x0, 'y': y0, 'w': w, 'h': h})
    return sort_reading_order(boxes)


def sort_reading_order(boxes):
    """Left-to-right within a row band, top-to-bottom across bands.

    Sprites on a sheet rarely share an exact top edge, so a plain sort by y
    interleaves neighbours; banding by typical sprite height keeps a row of
    sprites together the way a person reads them.
    """
    if not boxes:
        return []
    band = max(8, int(np.median([b['h'] for b in boxes])))
    return sorted(boxes, key=lambda b: (b['y'] // band, b['x']))


def content_bbox(mask):
    """Tight box around everything set in the mask, or None if fully empty."""
    rows = np.flatnonzero(mask.any(axis=1))
    cols = np.flatnonzero(mask.any(axis=0))
    if not len(rows) or not len(cols):
        return None
    return {
        'x': int(cols[0]), 'y': int(rows[0]),
        'w': int(cols[-1] - cols[0] + 1), 'h': int(rows[-1] - rows[0] + 1),
    }


def grid_cells(mask, tile_w, tile_h, skip_empty=True):
    """Non-empty cells of a fixed grid, as (row, col) pairs in reading order."""
    rows, cols = mask.shape[0] // tile_h, mask.shape[1] // tile_w
    cells = []
    for r in range(rows):
        for c in range(cols):
            cell = mask[r * tile_h:(r + 1) * tile_h, c * tile_w:(c + 1) * tile_w]
            if skip_empty and not cell.any():
                continue
            cells.append({'row': r, 'col': c})
    return cells


def suggest_grid(mask, candidates=(8, 16, 24, 32, 48, 64, 96, 128)):
    """Tile sizes that divide the sheet evenly, largest first.

    Deliberately only a suggestion: a full-bleed terrain atlas has no seams to
    detect, so picking for the caller would be guessing dressed up as analysis.
    """
    h, w = mask.shape
    return [s for s in sorted(candidates, reverse=True) if w % s == 0 and h % s == 0]


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True)
    parser.add_argument('--gap', type=int, default=0, help='transparent seam tolerated inside one sprite')
    parser.add_argument('--min-area', type=int, default=16, help='drop islands smaller than this many px')
    parser.add_argument('--grid', type=int, help='fixed tile size — emit grid cells instead of islands')
    args = parser.parse_args(argv)

    mask = load_mask(args.image)
    h, w = mask.shape
    if args.grid:
        out = {'mode': 'grid', 'sheetWidth': w, 'sheetHeight': h,
               'cells': grid_cells(mask, args.grid, args.grid)}
    else:
        out = {'mode': 'island', 'sheetWidth': w, 'sheetHeight': h,
               'gridSuggestions': suggest_grid(mask),
               'boxes': find_boxes(mask, gap=args.gap, min_area=args.min_area)}
    print(json.dumps(out, indent=2))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
