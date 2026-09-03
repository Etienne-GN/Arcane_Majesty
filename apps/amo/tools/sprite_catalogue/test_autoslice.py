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
    renamed, dropped, merged, errors = apply_names(cat, {
        '0': 'oak_tree',
        '1': {'name': 'pine_snow', 'tags': ['conifer'], 'season': 'winter'},
        '2': {'drop': True},
    })
    check('apply reports counts', (renamed, dropped, merged, errors), (2, 1, 0, []))
    check('bare string renames', cat['entries'][0]['name'], 'oak_tree')
    check('needsNaming cleared', 'needsNaming' in cat['entries'][0], False)
    check('tags merge, not replace', cat['entries'][1]['tags'], ['pack', 'conifer'])
    check('season applied', cat['entries'][1]['season'], 'winter')
    check('dropped entry removed', len(cat['entries']), 2)

    cat2 = {'entries': [{'name': 'x', 'kind': 'object'}, {'name': 'y', 'kind': 'object'}]}
    *_, errors = apply_names(cat2, {'0': 'same', '1': 'same'})
    check('duplicate names refused', len(errors), 1)
    check('catalogue untouched on refusal', cat2['entries'][0]['name'], 'x')

    *_, errors = apply_names({'entries': [{'name': 'x'}]}, {'0': 'Not Snake Case'})
    check('non-snake_case refused', len(errors), 1)
    *_, errors = apply_names({'entries': [{'name': 'x'}]}, {'9': 'oops'})
    check('out-of-range index refused', len(errors), 1)
    *_, errors = apply_names({'entries': [{'name': 'x'}]}, {'0': {'season': 'monsoon'}})
    check('invalid season refused', len(errors), 1)


def grid_cat(cells, tile=16, cols=4, rows=4):
    return {
        'source': 's.png', 'sheetWidth': cols * tile, 'sheetHeight': rows * tile,
        'gridTileWidth': tile, 'gridTileHeight': tile, 'gridCols': cols, 'gridRows': rows,
        'entries': [{'name': f'c{r}{c}', 'kind': 'tile', 'row': r, 'col': c,
                     'frameIndex': r * cols + c, 'tags': ['pack'], 'needsNaming': True}
                    for r, c in cells],
    }


def test_merge_cells_into_one_object():
    # A 2x2 block of cells is one 32x32 sprite, not four tiles.
    cat = grid_cat([(0, 0), (0, 1), (1, 0), (1, 1), (3, 3)])
    renamed, dropped, merged, errors = apply_names(cat, {
        'names': {'4': 'grass_fill'},
        'merges': [{'name': 'flower_big', 'cells': [0, 1, 2, 3],
                    'tags': ['flower'], 'season': 'spring'}],
    })
    check('merge reports counts', (renamed, dropped, merged, errors), (1, 0, 1, []))
    check('merged entry replaces its cells', len(cat['entries']), 2)
    m = cat['entries'][0]
    check('merged box spans the block', {k: m[k] for k in 'xywh'},
          {'x': 0, 'y': 0, 'w': 32, 'h': 32})
    check('merged entry is an object', m['kind'], 'object')
    check('merged entry inherits cell tags', m['tags'], ['pack', 'flower'])
    check('merged entry keeps season', m['season'], 'spring')
    check('merged entry sits at its first cell position', cat['entries'][1]['name'], 'grass_fill')
    check('surviving tile keeps the grid', 'gridCols' in cat, True)


def test_merge_refuses_to_swallow_a_neighbour():
    # (1,1) sits inside the union box but isn't listed -- merging would eat it.
    cat = grid_cat([(0, 0), (0, 1), (1, 0), (1, 1)])
    *_, errors = apply_names(cat, {
        'merges': [{'name': 'big', 'cells': [0, 1, 2]}]})
    check('un-merged neighbour inside the box refused', len(errors), 1)
    check('catalogue untouched on refusal', len(cat['entries']), 4)


def test_merge_conflicts_and_shapes():
    cat = grid_cat([(0, 0), (0, 1)])
    *_, errors = apply_names(cat, {
        'names': {'0': 'solo'},
        'merges': [{'name': 'big', 'cells': [0, 1]}]})
    check('rename and merge on one cell refused', len(errors), 1)

    cat = grid_cat([(0, 0), (0, 1)])
    *_, errors = apply_names(cat, {'merges': [{'name': 'big', 'cells': [0]}]})
    check('single-cell merge refused', len(errors), 1)

    cat = grid_cat([(0, 0), (0, 1)])
    *_, errors = apply_names(cat, {
        'merges': [{'name': 'a', 'cells': [0, 1]}, {'name': 'b', 'cells': [1, 0]}]})
    check('two merges claiming one cell refused', len(errors) >= 1, True)

    cat = grid_cat([(0, 0), (0, 1)])
    *_, errors = apply_names(cat, {'merges': [{'cells': [0, 1]}]})
    check('merge without a name refused', len(errors), 1)


def test_merging_every_tile_drops_the_grid_fields():
    # No tile entries left means no grid to describe; the validator rejects
    # grid fields it cannot check.
    cat = grid_cat([(0, 0), (0, 1), (1, 0), (1, 1)])
    *_, errors = apply_names(cat, {'merges': [{'name': 'whole', 'cells': [0, 1, 2, 3]}]})
    check('all-tiles merge succeeds', errors, [])
    check('grid fields removed', any(k.startswith('grid') for k in cat), False)


def test_flat_and_full_spec_forms_agree():
    flat = grid_cat([(0, 0)])
    full = grid_cat([(0, 0)])
    apply_names(flat, {'0': 'same_name'})
    apply_names(full, {'names': {'0': 'same_name'}})
    check('flat and {names:} forms are equivalent',
          flat['entries'][0]['name'], full['entries'][0]['name'])


def test_animate_slices_a_strip():
    from apply_names import build_frames
    frames, err = build_frames((0, 0, 128, 32), 4)
    check('horizontal strip splits evenly', err, None)
    check('four frames produced', len(frames), 4)
    check('third frame is offset correctly', frames[2], {'x': 64, 'y': 0, 'w': 32, 'h': 32})
    frames, err = build_frames((10, 20, 16, 96), 3, axis='y')
    check('vertical strip splits down', frames[1], {'x': 10, 'y': 52, 'w': 16, 'h': 32})
    # An uneven split means the frame count is wrong; rounding would smear
    # every frame after the first.
    _, err = build_frames((0, 0, 100, 32), 3)
    check('uneven split refused', err is not None, True)
    _, err = build_frames((0, 0, 128, 32), 1)
    check('single-frame animation refused', err is not None, True)
    _, err = build_frames((0, 0, 128, 32), 4, axis='z')
    check('bad axis refused', err is not None, True)


def test_animate_through_apply_names():
    cat = {'source': 's.png', 'sheetWidth': 128, 'sheetHeight': 32, 'entries': [
        {'name': 'strip', 'kind': 'object', 'x': 0, 'y': 0, 'w': 128, 'h': 32,
         'tags': ['fx'], 'needsNaming': True}]}
    renamed, _, _, errors = apply_names(cat, {
        '0': {'name': 'torch_flame', 'animate': {'count': 4, 'durationMs': 120}}})
    check('animate applies', (renamed, errors), (1, []))
    e = cat['entries'][0]
    check('frames written', len(e['frames']), 4)
    check('duration written', e['frameDurationMs'], 120)
    check('needsNaming cleared', 'needsNaming' in e, False)

    cat2 = {'source': 's.png', 'sheetWidth': 100, 'sheetHeight': 32, 'entries': [
        {'name': 'strip', 'kind': 'object', 'x': 0, 'y': 0, 'w': 100, 'h': 32}]}
    *_, errors = apply_names(cat2, {'0': {'name': 'bad', 'animate': {'count': 3}}})
    check('uneven animate refuses the batch', len(errors), 1)
    check('catalogue untouched on refusal', cat2['entries'][0]['name'], 'strip')

    cat3 = {'source': 's.png', 'sheetWidth': 64, 'sheetHeight': 32, 'entries': [
        {'name': 'x', 'kind': 'object', 'x': 0, 'y': 0, 'w': 64, 'h': 32}]}
    *_, errors = apply_names(cat3, {'0': {'animate': {'count': 2, 'durationMs': -5}}})
    check('bad durationMs refused', len(errors), 1)


def test_merge_can_animate():
    cat = grid_cat([(0, 0), (0, 1), (0, 2), (0, 3)], tile=16, cols=4, rows=4)
    cat['source'] = 's.png'
    _, _, merged, errors = apply_names(cat, {
        'merges': [{'name': 'fx_loop', 'cells': [0, 1, 2, 3],
                    'animate': {'count': 4, 'durationMs': 80}}]})
    check('merge+animate succeeds', (merged, errors), (1, []))
    e = cat['entries'][0]
    check('merged strip carries frames', len(e['frames']), 4)
    check('merged frame width is one cell', e['frames'][0]['w'], 16)


def test_validator_rejects_malformed_frames(tmp):
    png = tmp / 'fx.png'
    sheet_with_blobs(png, (64, 32), [(0, 0, 64, 32)])
    good = {'source': 'fx.png', 'sheetWidth': 64, 'sheetHeight': 32, 'entries': [
        {'name': 'fx', 'kind': 'object', 'x': 0, 'y': 0, 'w': 64, 'h': 32,
         'frames': [{'x': 0, 'y': 0, 'w': 32, 'h': 32}, {'x': 32, 'y': 0, 'w': 32, 'h': 32}]}]}
    out = tmp / 'fx.catalogue.json'
    out.write_text(json.dumps(good))
    proc = subprocess.run(['node', str(HERE / 'validate_sprite_catalogue.mjs'), '--no-move', str(out)],
                          capture_output=True, text=True)
    check('validator accepts well-formed frames', proc.returncode, 0)

    bad = json.loads(json.dumps(good))
    bad['entries'][0]['frames'][1]['x'] = 40      # runs past the sheet edge
    out.write_text(json.dumps(bad))
    proc = subprocess.run(['node', str(HERE / 'validate_sprite_catalogue.mjs'), '--no-move', str(out)],
                          capture_output=True, text=True)
    check('validator rejects out-of-bounds frame', proc.returncode, 1)

    bad = json.loads(json.dumps(good))
    bad['entries'][0]['frames'] = [{'x': 0, 'y': 0, 'w': 32, 'h': 32}]
    out.write_text(json.dumps(bad))
    proc = subprocess.run(['node', str(HERE / 'validate_sprite_catalogue.mjs'), '--no-move', str(out)],
                          capture_output=True, text=True)
    check('validator rejects a one-frame animation', proc.returncode, 1)


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
        test_merge_cells_into_one_object()
        test_merge_refuses_to_swallow_a_neighbour()
        test_merge_conflicts_and_shapes()
        test_merging_every_tile_drops_the_grid_fields()
        test_flat_and_full_spec_forms_agree()
        test_animate_slices_a_strip()
        test_animate_through_apply_names()
        test_merge_can_animate()
        test_validator_rejects_malformed_frames(tmp)
        test_bootstrapped_catalogue_passes_validator(tmp)

    if failures:
        print(f'\n{len(failures)} failure(s): {", ".join(failures)}')
        return 1
    print('\nall checks passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
