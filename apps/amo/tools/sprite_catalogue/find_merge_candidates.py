#!/usr/bin/env python3
"""
Finds multi-grid-cell alpha islands in a grid-bootstrapped catalogue sheet —
candidates for `apply_names.py`'s "merges" (a rigid object sliced into
separate per-cell entries by grid-mode bootstrap, e.g. a tree spanning 3x7
cells). See LPC_ATLAS_PLAN.md for why this is needed before naming a sheet
that mixes tileable terrain with rigid multi-cell props.

Usage (run from apps/amo/):
    python3 tools/sprite_catalogue/find_merge_candidates.py obj_misk_atlas \
        --out-dir /tmp/scratch/lpc_work

Writes, under --out-dir (named after the sheet):
    <sheet>_candidates.json     raw candidate list (bbox, cells, entry_indices)
    <sheet>_montage_map.json    montage_index -> candidate, sorted by pixel area desc
    <sheet>_montage_NN.png      labeled contact-sheet montages, 8 per row,
                                 chunked so each image stays a manageable size

Each candidate: bbox_xywh [x,y,w,h] on the sheet, cells_wh [w,h] grid-cell
span, entry_indices (this sheet's catalogue entries[] indices the bbox
overlaps — feed straight into a merge's "cells" list).
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from autoslice import load_mask, find_boxes  # noqa: E402

try:
    from PIL import Image, ImageDraw
except ImportError:
    print('This script needs Pillow: pip install pillow', file=sys.stderr)
    raise

CATALOGUED_ROOT = Path('public/assets/catalogued/tilesets/lpc')
THUMB = 128       # per-candidate thumbnail box (excluding label strip)
LABEL_H = 20
COLS = 8
MAX_ROWS_PER_IMAGE = 5


def compute_candidates(sheet_name, min_span=34, gap=0, min_area=10):
    cat_path = CATALOGUED_ROOT / f'{sheet_name}.catalogue.json'
    png_path = CATALOGUED_ROOT / f'{sheet_name}.png'
    cat = json.loads(cat_path.read_text())
    entries = cat['entries']
    tw, th = cat['gridTileWidth'], cat['gridTileHeight']
    pos_to_idx = {(e['row'], e['col']): i for i, e in enumerate(entries)}

    mask = load_mask(str(png_path))
    boxes = find_boxes(mask, gap=gap, min_area=min_area)
    multi = [b for b in boxes if b['w'] > min_span or b['h'] > min_span]

    candidates = []
    for b in multi:
        x, y, w, h = b['x'], b['y'], b['w'], b['h']
        c0, c1 = x // tw, (x + w - 1) // tw
        r0, r1 = y // th, (y + h - 1) // th
        idxs = [pos_to_idx[(r, c)] for r in range(r0, r1 + 1) for c in range(c0, c1 + 1)
                if (r, c) in pos_to_idx]
        if not idxs:
            continue
        candidates.append({
            'bbox_xywh': [x, y, w, h],
            'cells_wh': [c1 - c0 + 1, r1 - r0 + 1],
            'entry_indices': idxs,
        })
    return candidates, str(png_path)


def render_montages(sheet_name, candidates, png_path, out_dir):
    order = sorted(range(len(candidates)),
                    key=lambda i: -(candidates[i]['bbox_xywh'][2] * candidates[i]['bbox_xywh'][3]))
    montage_map = []
    sheet_im = Image.open(png_path).convert('RGBA')

    per_image = COLS * MAX_ROWS_PER_IMAGE
    chunk_paths = []
    for chunk_start in range(0, len(order), per_image):
        chunk = order[chunk_start:chunk_start + per_image]
        rows = (len(chunk) + COLS - 1) // COLS
        canvas = Image.new('RGB', (COLS * THUMB, rows * (THUMB + LABEL_H)), (40, 40, 40))
        draw = ImageDraw.Draw(canvas)
        for slot, cand_idx in enumerate(chunk):
            montage_idx = chunk_start + slot
            c = candidates[cand_idx]
            x, y, w, h = c['bbox_xywh']
            crop = sheet_im.crop((x, y, x + w, y + h))
            scale = min(THUMB / max(w, 1), THUMB / max(h, 1), 4)
            crop = crop.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.NEAREST)
            col, row = slot % COLS, slot // COLS
            paste_x = col * THUMB + (THUMB - crop.width) // 2
            paste_y = row * (THUMB + LABEL_H) + (THUMB - crop.height) // 2
            canvas.paste(crop, (paste_x, paste_y), crop)
            label = f"#{montage_idx} {c['cells_wh'][0]}x{c['cells_wh'][1]}"
            draw.text((col * THUMB + 4, row * (THUMB + LABEL_H) + THUMB + 2), label,
                       fill=(255, 255, 0))
            montage_map.append({
                'montage_index': montage_idx,
                'cells_wh': c['cells_wh'],
                'bbox_xywh': c['bbox_xywh'],
                'entry_indices': c['entry_indices'],
            })
        chunk_no = chunk_start // per_image
        path = out_dir / f'{sheet_name}_montage_{chunk_no:02d}.png'
        canvas.save(path)
        chunk_paths.append(str(path))
    return montage_map, chunk_paths


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet_name')
    ap.add_argument('--out-dir', required=True)
    ap.add_argument('--min-span', type=int, default=34)
    ap.add_argument('--gap', type=int, default=0)
    ap.add_argument('--min-area', type=int, default=10)
    args = ap.parse_args()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    candidates, png_path = compute_candidates(args.sheet_name, args.min_span, args.gap, args.min_area)
    (out_dir / f'{args.sheet_name}_candidates.json').write_text(json.dumps(candidates, indent=1))

    montage_map, chunk_paths = render_montages(args.sheet_name, candidates, png_path, out_dir)
    (out_dir / f'{args.sheet_name}_montage_map.json').write_text(json.dumps(montage_map, indent=1))

    print(f'{args.sheet_name}: {len(candidates)} candidates -> {len(chunk_paths)} montage image(s)')
    for p in chunk_paths:
        print(' ', p)


if __name__ == '__main__':
    main()
