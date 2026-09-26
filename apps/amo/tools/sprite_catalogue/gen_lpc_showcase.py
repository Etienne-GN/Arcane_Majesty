#!/usr/bin/env python3
"""
Generates src/data/maps/lpc_showcase.js: a shelf-packed "showroom" test map
placing every merged object from all 4 LPC atlases (base_out_atlas,
build_atlas, terrain_atlas, obj_misk_atlas), one wing per atlas, on a plain
terrain_atlas grass floor with a cobblestone path spine dividing the wings.

Built to visually verify the full LPC naming/merge pass (see
LPC_ATLAS_PLAN.md) in an actual playable scene instead of static crops.
Rerun this whenever the 4 catalogues change and the showcase should reflect
the new object set — it fully regenerates the map file from scratch.

Run from apps/amo/: python3 tools/sprite_catalogue/gen_lpc_showcase.py
"""
from pathlib import Path
import json

REPO_ROOT = Path(__file__).resolve().parents[2]  # apps/amo/
CAT_DIR = REPO_ROOT / 'public/assets/catalogued/tilesets/lpc'
MAP_OUT = REPO_ROOT / 'src/data/maps/lpc_showcase.js'

TILE = 32
MAX_ROW_W = 34  # tiles, per wing
GAP = 2         # tiles between objects and between rows
DIVIDER = 6     # tiles between wings (houses the cobblestone path)
MARGIN = 4

ATLASES = ['base_out_atlas', 'build_atlas', 'terrain_atlas', 'obj_misk_atlas']


def load_objects(sheet):
    cat = json.loads((CAT_DIR / f'{sheet}.catalogue.json').read_text())
    return [e for e in cat['entries'] if e.get('kind') == 'object']


def pack(objects):
    """Shelf-packs objects into rows capped at MAX_ROW_W tiles wide (ceil'd
    to whole tiles per object). Returns (decos with wing-local x/y, wing
    width, wing height), all in tiles."""
    decos = []
    cursor_x = cursor_y = row_h = max_x = 0
    for e in objects:
        w_tiles = -(-e['w'] // TILE)
        h_tiles = -(-e['h'] // TILE)
        if cursor_x + w_tiles > MAX_ROW_W and cursor_x > 0:
            cursor_x = 0
            cursor_y += row_h + GAP
            row_h = 0
        decos.append({'name': e['name'], 'x': cursor_x, 'y': cursor_y})
        cursor_x += w_tiles + GAP
        row_h = max(row_h, h_tiles)
        max_x = max(max_x, cursor_x - GAP)
    return decos, max_x, cursor_y + row_h


def offset(decos, ox, oy):
    return [{'name': d['name'], 'x': d['x'] + ox, 'y': d['y'] + oy} for d in decos]


def fmt_tiles(tiles):
    lines = ['const TILES = [']
    lines += [f"    [{','.join(str(v) for v in row)}]," for row in tiles]
    lines.append('];')
    return '\n'.join(lines)


def fmt_decos(name, items):
    lines = [f'const {name} = [']
    lines += [f"    {{ name: '{d['name']}', x: {d['x']}, y: {d['y']} }}," for d in items]
    lines.append('];')
    return '\n'.join(lines)


def main():
    wings = {}
    for sheet in ATLASES:
        objs = load_objects(sheet)
        decos, w, h = pack(objs)
        wings[sheet] = {'decos': decos, 'w': w, 'h': h}
        print(f'{sheet}: {len(objs)} objects, wing size {w}x{h} tiles')

    # 2x2 super-grid: base_out | build
    #                 terrain  | obj_misk
    top_h = max(wings['base_out_atlas']['h'], wings['build_atlas']['h'])
    left_w = max(wings['base_out_atlas']['w'], wings['terrain_atlas']['w'])

    origins = {
        'base_out_atlas': (MARGIN, MARGIN),
        'build_atlas':    (MARGIN + left_w + DIVIDER, MARGIN),
        'terrain_atlas':  (MARGIN, MARGIN + top_h + DIVIDER),
        'obj_misk_atlas': (MARGIN + left_w + DIVIDER, MARGIN + top_h + DIVIDER),
    }

    map_w = MARGIN + left_w + DIVIDER + wings['build_atlas']['w'] + MARGIN
    map_h = MARGIN + top_h + DIVIDER + wings['obj_misk_atlas']['h'] + MARGIN
    print(f'total map size: {map_w}x{map_h} tiles')

    tiles = [[0] * map_w for _ in range(map_h)]
    path_col_lo, path_col_hi = MARGIN + left_w, MARGIN + left_w + DIVIDER
    path_row_lo, path_row_hi = MARGIN + top_h, MARGIN + top_h + DIVIDER
    for r in range(map_h):
        for c in range(path_col_lo, path_col_hi):
            tiles[r][c] = 2
    for r in range(path_row_lo, path_row_hi):
        for c in range(map_w):
            tiles[r][c] = 2

    deco_arrays = {
        'LPC_BASE_OUT_DECORATIONS': offset(wings['base_out_atlas']['decos'], *origins['base_out_atlas']),
        'LPC_BUILD_DECORATIONS':    offset(wings['build_atlas']['decos'],    *origins['build_atlas']),
        'LPC_TERRAIN_DECORATIONS':  offset(wings['terrain_atlas']['decos'],  *origins['terrain_atlas']),
        'LPC_OBJ_MISK_DECORATIONS': offset(wings['obj_misk_atlas']['decos'], *origins['obj_misk_atlas']),
    }

    header = '''// AUTO-GENERATED test map — a big shelf-packed "showroom" of every merged
// object across all 4 LPC atlases (base_out_atlas, build_atlas,
// terrain_atlas, obj_misk_atlas), one wing per atlas, connected by a
// cobblestone path spine. Built to visually verify the full LPC naming/
// merge pass (see apps/amo/tools/sprite_catalogue/LPC_ATLAS_PLAN.md) in an
// actual playable scene rather than static crops. Regenerate with
// tools/sprite_catalogue/gen_lpc_showcase.py if the catalogues change —
// this file is fully derived, don't hand-edit the TILES/decoration arrays.
//
// Tile values: 0 = grass (terrain_atlas grass_fill_b), 2 = cobblestone
// path (terrain_atlas tan_cobblestone_fill_a) marking the spine between
// wings. Decorations are placed by catalogue name via
// GameScene._placeCatalogueItems(); each wing's objects are shelf-packed
// left-to-right, wrapping rows, so nothing overlaps regardless of each
// object's real pixel footprint.

'''
    parts = [header, fmt_tiles(tiles), '']
    for name, items in deco_arrays.items():
        parts.append(fmt_decos(name, items))
        parts.append('')

    parts.append(f'''export const LPC_SHOWCASE = {{
    id: 'lpc_showcase',
    displayName: 'LPC Collection Showcase (Test)',
    tiles: TILES,
    lightTint: null,
    playerStart: {{ x: 2, y: 2 }},
    tileset: {{
        key: 'terrain_atlas',
        floorFrame: 182,   // grass_fill_b (642 grass_field_fill_a has a dark stripe down its left edge, so it showed a seam in every tile)
        pathFrame: 649,    // tan_cobblestone_fill_a
    }},
    lpcBaseOutDecorations: LPC_BASE_OUT_DECORATIONS,
    lpcBuildDecorations:   LPC_BUILD_DECORATIONS,
    lpcTerrainDecorations: LPC_TERRAIN_DECORATIONS,
    lpcObjMiskDecorations: LPC_OBJ_MISK_DECORATIONS,
    decorations: [],
    portals: [],
    spawns: {{}},
    currencyBias: 'rural',
    music: 'forest',
    quests: [],
    chapterTitle: 'LPC Collection Showcase (Test Map)',
}};
''')

    MAP_OUT.write_text('\n'.join(parts))
    print(f'wrote {MAP_OUT.relative_to(REPO_ROOT)}')


if __name__ == '__main__':
    main()
