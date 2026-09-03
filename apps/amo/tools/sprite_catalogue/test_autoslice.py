#!/usr/bin/env python3
"""
Tests the auto-slicing pipeline that replaced hand-guessed sprite boxes:
autoslice (island detection, gap bridging, grid cells, content bbox),
bootstrap_catalogue (draft catalogues from a pack tree, plus whole-image
repair), and apply_names (batch naming, drops, collision refusal).

Builds its fixtures at runtime so nothing depends on a checked-in binary.
Run: python3 tools/sprite_catalogue/test_autoslice.py
  (or: npm run test:autoslice)
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from apply_names import apply_names                                    # noqa: E402
from autoslice import content_bbox, find_boxes, grid_cells, load_mask, suggest_grid  # noqa: E402
from bootstrap_catalogue import build_catalogue, repair, slug          # noqa: E402

failures = []


def check(label, actual, expected):
    if actual == expected:
        print(f'  ok   {label}')
    else:
        print(f'  FAIL {label}: expected {expected!r}, got {actual!r}')
        failures.append(label)


def sheet_with_blobs(path, size, blobs):
    """Transparent sheet with an opaque rectangle per (x, y, w, h) blob."""
    im = Image.new('RGBA', size, (0, 0, 0, 0))
    for x, y, w, h in blobs:
        for py in range(y, y + h):
            for px in range(x, x + w):
                im.putpixel((px, py), (200, 60, 60, 255))
    im.save(path)


def test_islands(tmp):
    png = tmp / 'three.png'
    sheet_with_blobs(png, (64, 32), [(2, 2, 10, 10), (20, 4, 8, 8), (40, 12, 12, 6)])
    boxes = find_boxes(load_mask(png), gap=0, min_area=1)
    check('three separate blobs found', len(boxes), 3)
    check('first box is exact', boxes[0], {'x': 2, 'y': 2, 'w': 10, 'h': 10})
    check('reading order puts leftmost first', [b['x'] for b in boxes], [2, 20, 40])


def test_gap_bridging(tmp):
    # Two blobs one transparent pixel apart: one sprite, not two.
    png = tmp / 'gap.png'
    sheet_with_blobs(png, (32, 32), [(4, 4, 6, 6), (11, 4, 6, 6)])
    mask = load_mask(png)
    check('gap=0 keeps them separate', len(find_boxes(mask, gap=0, min_area=1)), 2)
    joined = find_boxes(mask, gap=1, min_area=1)
    check('gap=1 merges them', len(joined), 1)
    check('merged box spans both', joined[0], {'x': 4, 'y': 4, 'w': 13, 'h': 6})


def test_min_area(tmp):
    png = tmp / 'dust.png'
    sheet_with_blobs(png, (32, 32), [(2, 2, 10, 10), (25, 25, 1, 1)])
    boxes = find_boxes(load_mask(png), gap=0, min_area=16)
    check('single dust pixel dropped', len(boxes), 1)


def test_content_bbox_and_grid(tmp):
    png = tmp / 'grid.png'
    sheet_with_blobs(png, (64, 64), [(0, 0, 16, 16), (32, 32, 16, 16)])
    mask = load_mask(png)
    check('content bbox is tight', content_bbox(mask), {'x': 0, 'y': 0, 'w': 48, 'h': 48})
    cells = grid_cells(mask, 16, 16)
    check('only non-empty cells returned', cells, [{'row': 0, 'col': 0}, {'row': 2, 'col': 2}])
    check('grid suggestions divide evenly', suggest_grid(mask), [64, 32, 16, 8])


def test_opaque_sheet_has_no_islands(tmp):
    # A full-bleed terrain atlas (no alpha) must not pretend to be one sprite
    # worth slicing -- it should collapse to a single whole-sheet box, which is
    # the signal to switch to grid mode.
    png = tmp / 'opaque.png'
    Image.new('RGB', (32, 32), (10, 90, 10)).save(png)
    boxes = find_boxes(load_mask(png), gap=0, min_area=1)
    check('opaque sheet is one box', boxes, [{'x': 0, 'y': 0, 'w': 32, 'h': 32}])


def test_slug():
    check('CamelCase splits', slug('PATD_Plant.png'), 'patd_plant')
    check('spaces and brackets collapse', slug('[A]Water3 pipo.png'), 'a_water3_pipo')


def test_bootstrap_single_and_multi(tmp):
    pack = tmp / 'pack' / 'Props'
    pack.mkdir(parents=True)
    sheet_with_blobs(pack / 'BigRock.png', (64, 64), [(10, 20, 20, 20)])
    cat, err = build_catalogue(str(pack / 'BigRock.png'), str(tmp / 'pack'),
                               extra_tags=['mypack'], gap=1, min_area=4)
    check('single-sprite sheet builds', err, None)
    check('name comes from filename', cat['entries'][0]['name'], 'big_rock')
    check('box is alpha-tight, not whole-image',
          {k: cat['entries'][0][k] for k in 'xywh'},
          {'x': 10, 'y': 20, 'w': 20, 'h': 20})
    check('tags come from path + flags', cat['entries'][0]['tags'], ['props', 'mypack'])
    check('single sprite needs no naming', 'needsNaming' in cat['entries'][0], False)

    sheet_with_blobs(pack / 'Many.png', (64, 32), [(2, 2, 8, 8), (30, 2, 8, 8)])
    cat, err = build_catalogue(str(pack / 'Many.png'), str(tmp / 'pack'), gap=1, min_area=4)
    check('multi-sprite sheet builds', err, None)
    check('multi-sprite entries flagged for naming',
          all(e.get('needsNaming') for e in cat['entries']), True)
    check('placeholder names are indexed', cat['entries'][0]['name'], 'many_000')


def test_bootstrap_grid_mode(tmp):
    png = tmp / 'tiles.png'
    sheet_with_blobs(png, (32, 32), [(0, 0, 16, 16), (16, 16, 16, 16)])
    cat, err = build_catalogue(str(png), str(tmp), grid=16)
    check('grid mode builds', err, None)
    check('grid fields declared', [cat['gridCols'], cat['gridRows']], [2, 2])
    check('frameIndex matches row*cols+col',
          [e['frameIndex'] for e in cat['entries']], [0, 3])
    _, err = build_catalogue(str(png), str(tmp), grid=24)
    check('non-dividing grid refused', err is not None, True)


def test_repair_tightens_whole_image_box(tmp):
    png = tmp / 'loose.png'
    sheet_with_blobs(png, (64, 64), [(8, 8, 16, 16)])
    cat_path = tmp / 'loose.catalogue.json'
    cat_path.write_text(json.dumps({
        'source': 'loose.png', 'sheetWidth': 64, 'sheetHeight': 64,
        'entries': [{'name': 'loose', 'kind': 'object', 'x': 0, 'y': 0, 'w': 64, 'h': 64,
                     'tags': ['x'], 'lowConfidence': True}],
    }))
    check('repair reports one fix', repair(str(cat_path)), 1)
    fixed = json.loads(cat_path.read_text())['entries'][0]
    check('box tightened to content', {k: fixed[k] for k in 'xywh'},
          {'x': 8, 'y': 8, 'w': 16, 'h': 16})
    check('lowConfidence cleared once derived', 'lowConfidence' in fixed, False)
    check('name preserved', fixed['name'], 'loose')
    check('repair is idempotent', repair(str(cat_path)), 0)


def test_grid_atlas_preserves_position(tmp):
    """A cell atlas must keep gaps, or autotile adjacency reads wrong."""
    from contact_sheet import render_grid_atlas
    png = tmp / 'atlas.png'
    sheet_with_blobs(png, (48, 48), [(0, 0, 16, 16), (32, 32, 16, 16)])
    cat, _ = build_catalogue(str(png), str(tmp), grid=16)
    check('only non-empty cells catalogued', len(cat['entries']), 2)
    check('second cell keeps its true row/col',
          (cat['entries'][1]['row'], cat['entries'][1]['col']), (2, 2))
    scale = 3
    img = render_grid_atlas(cat, str(png), [0, 1], scale, pad=0, label_h=0)
    check('atlas spans the whole grid, not just filled cells',
          img.size, (48 * scale, 48 * scale))


def test_apply_names():
    cat = {'entries': [
        {'name': 'a_000', 'kind': 'object', 'tags': ['pack'], 'needsNaming': True},
        {'name': 'a_001', 'kind': 'object', 'tags': ['pack'], 'needsNaming': True},
        {'name': 'a_002', 'kind': 'object', 'tags': ['pack'], 'needsNaming': True},
    ]}
    renamed, dropped, errors = apply_names(cat, {
        '0': 'oak_tree',
        '1': {'name': 'pine_snow', 'tags': ['conifer'], 'season': 'winter'},
        '2': {'drop': True},
    })
    check('apply reports counts', (renamed, dropped, errors), (2, 1, []))
    check('bare string renames', cat['entries'][0]['name'], 'oak_tree')
    check('needsNaming cleared', 'needsNaming' in cat['entries'][0], False)
    check('tags merge, not replace', cat['entries'][1]['tags'], ['pack', 'conifer'])
    check('season applied', cat['entries'][1]['season'], 'winter')
    check('dropped entry removed', len(cat['entries']), 2)

    cat2 = {'entries': [{'name': 'x', 'kind': 'object'}, {'name': 'y', 'kind': 'object'}]}
    _, _, errors = apply_names(cat2, {'0': 'same', '1': 'same'})
    check('duplicate names refused', len(errors), 1)
    check('catalogue untouched on refusal', cat2['entries'][0]['name'], 'x')

    _, _, errors = apply_names({'entries': [{'name': 'x'}]}, {'0': 'Not Snake Case'})
    check('non-snake_case refused', len(errors), 1)
    _, _, errors = apply_names({'entries': [{'name': 'x'}]}, {'9': 'oops'})
    check('out-of-range index refused', len(errors), 1)
    _, _, errors = apply_names({'entries': [{'name': 'x'}]}, {'0': {'season': 'monsoon'}})
    check('invalid season refused', len(errors), 1)


def test_bootstrapped_catalogue_passes_validator(tmp):
    """The whole point of a draft is that the existing trust gate accepts it."""
    png = tmp / 'gate.png'
    sheet_with_blobs(png, (48, 48), [(4, 4, 8, 8), (30, 30, 8, 8)])
    cat, _ = build_catalogue(str(png), str(tmp), gap=1, min_area=4)
    out = tmp / 'gate.catalogue.json'
    out.write_text(json.dumps(cat))
    proc = subprocess.run(
        ['node', str(HERE / 'validate_sprite_catalogue.mjs'), '--no-move', str(out)],
        capture_output=True, text=True)
    check('validator accepts a bootstrapped draft', proc.returncode, 0)


def main():
    print('autoslice / bootstrap / apply_names')
    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        test_islands(tmp)
        test_gap_bridging(tmp)
        test_min_area(tmp)
        test_content_bbox_and_grid(tmp)
        test_opaque_sheet_has_no_islands(tmp)
        test_slug()
        test_bootstrap_single_and_multi(tmp)
        test_bootstrap_grid_mode(tmp)
        test_repair_tightens_whole_image_box(tmp)
        test_grid_atlas_preserves_position(tmp)
        test_apply_names()
        test_bootstrapped_catalogue_passes_validator(tmp)

    if failures:
        print(f'\n{len(failures)} failure(s): {", ".join(failures)}')
        return 1
    print('\nall checks passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
