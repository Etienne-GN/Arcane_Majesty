#!/usr/bin/env python3
"""
Generates src/data/maps/pipoya_showcase.js: a shelf-packed "showroom" test map
of the whole Pipoya collection, one wing per group, stacked top to bottom and
separated by cobblestone paths:

  1. BaseChip objects        ([Base]BaseChip_pipo, kind: object)
  2. BaseChip tiles          (floors, walls... kind: tile)
  3. Water pieces            ([A]Water_pipo)
  4. Other SampleMap sheets  (Grass, Dirt, Flower, Wall-Up, WaterFall, LightShadow)
  5. Autotile strips         (pipoya_autotiles_type1/2/3 + their _static sets)
  6. Popup emotes            (pipoya_popup_emotes, animated)
  7. Map effects             (pipoya_vfx_*, animated 192px)

BaseChip and Water are already loaded at boot (decorations / waterTiles);
every other sheet is listed in the map's extraSheets, which GameScene loads
only when this map opens, and placed through sheetDecorations. Animated
entries play in-game (GameScene._placeCatalogueItems).

Same purpose as gen_lpc_showcase.py: see a whole pack in a playable scene
instead of static crops. Rerun whenever the Pipoya catalogues change — it
fully regenerates the map file.

Run from apps/amo/: python3 tools/sprite_catalogue/gen_pipoya_showcase.py
"""
from pathlib import Path
import json
import re

REPO_ROOT = Path(__file__).resolve().parents[2]  # apps/amo/
TILESETS = REPO_ROOT / 'public/assets/catalogued/tilesets'
MAP_OUT = REPO_ROOT / 'src/data/maps/pipoya_showcase.js'

TILE = 32
MAX_ROW_W = 44   # tiles per row inside a wing
GAP = 1          # tiles between objects in a row / between rows
PATH_H = 3       # cobblestone rows between wings
MARGIN = 3

FLOOR_FRAME = 0    # BaseChip grass_green_light
PATH_FRAME = 322   # BaseChip floor_cobblestone_gray

SAMPLEMAP_OTHERS = ['[A]Grass_pipo', '[A]Dirt_pipo', '[A]Flower_pipo', '[A]Wall-Up_pipo',
                    '[A]WaterFall_pipo', 'LightShadow_pipo']


def load(cat_path):
    return json.loads(cat_path.read_text())


def entry_size(cat, e):
    if e.get('frames'):
        f = e['frames'][0]
        return f['w'], f['h']
    if e['kind'] == 'tile':
        return cat.get('gridTileWidth', TILE), cat.get('gridTileHeight', TILE)
    return e['w'], e['h']


def sheet_key(cat_path):
    rel = cat_path.relative_to(TILESETS).as_posix().removesuffix('.catalogue.json')
    return 'pip_' + re.sub(r'[^A-Za-z0-9]+', '_', rel).strip('_').lower()


def pack(items):
    """items: [(group_index, name, w_px, h_px)]. Shelf-packs into rows of
    MAX_ROW_W tiles; returns ([(group_index, name, x, y)], height)."""
    out = []
    cx = cy = row_h = 0
    for g, name, w, h in items:
        wt, ht = -(-w // TILE), -(-h // TILE)
        if cx + wt > MAX_ROW_W and cx > 0:
            cx = 0
            cy += row_h + GAP
            row_h = 0
        out.append((g, name, cx, cy))
        cx += wt + GAP
        row_h = max(row_h, ht)
    return out, cy + row_h


def main():
    basechip = TILESETS / 'SampleMap/[Base]BaseChip_pipo.catalogue.json'
    water = TILESETS / 'SampleMap/[A]Water_pipo.catalogue.json'

    # group = one catalogued sheet: (label, cat_path, catKey, texKey, entries)
    # BaseChip / Water use the boot-loaded keys; everything else is an extra sheet.
    groups = []
    bc = load(basechip)
    groups.append(('basechip_objects', basechip, 'tileset_base_cat', 'tileset_base', [e for e in bc['entries'] if e['kind'] == 'object'], bc))
    groups.append(('basechip_tiles', basechip, 'tileset_base_cat', 'tileset_base', [e for e in bc['entries'] if e['kind'] == 'tile'], bc))
    wc = load(water)
    groups.append(('water', water, 'tileset_water_cat', 'tileset_water', wc['entries'], wc))

    def extra(label, paths):
        for p in paths:
            c = load(p)
            k = sheet_key(p)
            groups.append((label, p, k + '_cat', k, c['entries'], c))

    extra('samplemap_other', [TILESETS / f'SampleMap/{n}.catalogue.json' for n in SAMPLEMAP_OTHERS])
    extra('autotiles', sorted(TILESETS.glob('pipoya_autotiles_type*/*.catalogue.json')))
    extra('emotes', sorted(TILESETS.glob('pipoya_popup_emotes/*.catalogue.json')))
    extra('vfx', sorted(TILESETS.glob('pipoya_vfx_*/*.catalogue.json')))

    # wings in order, each packed on its own
    wing_order = ['basechip_objects', 'basechip_tiles', 'water', 'samplemap_other', 'autotiles', 'emotes', 'vfx']
    placed = []   # (group_index, name, x, y) in map tiles
    y = MARGIN
    path_rows = []
    for wi, wing in enumerate(wing_order):
        items = []
        for gi, (label, _p, _ck, _tk, entries, cat) in enumerate(groups):
            if label != wing:
                continue
            for e in entries:
                w, h = entry_size(cat, e)
                items.append((gi, e['name'], w, h))
        packed, h = pack(items)
        placed += [(gi, n, x + MARGIN, yy + y) for gi, n, x, yy in packed]
        print(f'{wing}: {len(items)} items, wing height {h} tiles')
        y += h
        if wi < len(wing_order) - 1:
            path_rows.append((y + 1, y + 1 + PATH_H))
            y += 1 + PATH_H + 1
    map_w = MARGIN * 2 + MAX_ROW_W
    map_h = y + MARGIN
    print(f'total map size: {map_w}x{map_h} tiles, {len(placed)} items')

    tiles = [[0] * map_w for _ in range(map_h)]
    for lo, hi in path_rows:
        for r in range(lo, hi):
            tiles[r] = [2] * map_w

    def items_js(gi):
        return [f"{{ name: {json.dumps(n)}, x: {x}, y: {yy} }}" for g, n, x, yy in placed if g == gi]

    decorations = [s for gi, g in enumerate(groups) if g[3] == 'tileset_base' for s in items_js(gi)]
    water_tiles = [s for gi, g in enumerate(groups) if g[3] == 'tileset_water' for s in items_js(gi)]
    extras, sheet_decos = [], []
    for gi, (label, p, ck, tk, _e, _c) in enumerate(groups):
        if tk in ('tileset_base', 'tileset_water'):
            continue
        rel = p.relative_to(REPO_ROOT / 'public').as_posix()
        png = rel.removesuffix('.catalogue.json') + '.png'
        extras.append(f"{{ texKey: '{tk}', catKey: '{ck}', png: {json.dumps(png)}, cat: {json.dumps(rel)} }}")
        sheet_decos.append(f"{{ texKey: '{tk}', catKey: '{ck}', items: [{', '.join(items_js(gi))}] }}")

    def arr(name, rows):
        return f'const {name} = [\n' + ''.join(f'    {r},\n' for r in rows) + '];\n'

    header = '''// AUTO-GENERATED test map — a shelf-packed "showroom" of the whole Pipoya
// collection, one wing per group (BaseChip objects, BaseChip tiles, water
// pieces, the other SampleMap sheets, autotile strips, popup emotes, map
// effects), separated by cobblestone paths. Built to review the pack in an
// actual playable scene; animated entries play. Regenerate with
// tools/sprite_catalogue/gen_pipoya_showcase.py if the catalogues change —
// this file is fully derived, don't hand-edit it.
//
// Tile values: 0 = grass (BaseChip grass_green_light), 2 = cobblestone path
// (BaseChip floor_cobblestone_gray). BaseChip and Water are boot-loaded and
// placed via decorations / waterTiles; every other sheet is in extraSheets
// (loaded by GameScene only for this map) and placed via sheetDecorations.

'''
    parts = [header,
             'const TILES = [\n' + ''.join(f"    [{','.join(map(str, r))}],\n" for r in tiles) + '];\n',
             arr('PIPOYA_BASECHIP_DECORATIONS', decorations),
             arr('PIPOYA_WATER_TILES', water_tiles),
             arr('PIPOYA_EXTRA_SHEETS', extras),
             arr('PIPOYA_SHEET_DECORATIONS', sheet_decos),
             f'''export const PIPOYA_SHOWCASE = {{
    id: 'pipoya_showcase',
    displayName: 'Pipoya Collection Showcase (Test)',
    tiles: TILES,
    lightTint: null,
    playerStart: {{ x: 1, y: 1 }},
    tileset: {{
        key: 'tileset_base',
        floorFrame: {FLOOR_FRAME},   // grass_green_light
        pathFrame: {PATH_FRAME},   // floor_cobblestone_gray
    }},
    decorations: PIPOYA_BASECHIP_DECORATIONS,
    waterTiles: PIPOYA_WATER_TILES,
    extraSheets: PIPOYA_EXTRA_SHEETS,
    sheetDecorations: PIPOYA_SHEET_DECORATIONS,
    portals: [],
    spawns: {{}},
    currencyBias: 'rural',
    music: 'forest',
    quests: [],
    chapterTitle: 'Pipoya Collection Showcase (Test Map)',
}};
''']
    MAP_OUT.write_text('\n'.join(parts))
    print(f'wrote {MAP_OUT.relative_to(REPO_ROOT)}')


if __name__ == '__main__':
    main()
