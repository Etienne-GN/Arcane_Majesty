#!/usr/bin/env python3
"""
Generates src/data/maps/wintertest.js — "Winter Test", a snowy test scene built
from the Snowy Asset Pack (snowy_asset_pack_nyx, 32px):

  - a pine forest on a plateau along the north, behind a snow cliff band
    with snow stairs cut through it
  - a log cabin in a fenced yard with snowmen and a log pile
  - a frozen lake with ice-fishing holes, and a small frozen pond
  - trees along the west, east and south edges and groves in between

The ground is the boot-loaded tileset_snowy (SnowyAssetPack.png) snow tiles.
Collision and draw layer come from each sprite's hitbox/layer in the
catalogues (cliffs and water holes block, ice is walkable, trees block at
the trunk). Deterministic (fixed seed).

Run from apps/amo/: python3 tools/maps/gen_wintertest.py
"""
from pathlib import Path
import random
import sys

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, tiles_js, AMO  # noqa: E402

MAP_OUT = AMO / 'src/data/maps/wintertest.js'
W, H = 48, 36
SEED = 11
rng = random.Random(SEED)
sm = SheetMap()


def nyx(name, x, y, **kw):
    return sm.add(f'snowy_asset_pack_nyx/{name}', name, x, y, **kw)


occupied = set()   # tiles something stands on (trees/props avoid them)


def reserve(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            occupied.add((x, y))


def free(x0, y0, x1, y1):
    return all(0 <= x < W and 0 <= y < H and (x, y) not in occupied for y in range(y0, y1 + 1) for x in range(x0, x1 + 1))


# ------------------------------------------------------------- cliff band
CLIFF_TOP = 6          # rows 6..9: top, face, face, base
STAIRS_X = (30, 31)    # 2-wide gap with snow stairs
rows = ['top', 'middle_0', 'middle_1', 'base']
for i, part in enumerate(rows):
    y = CLIFF_TOP + i
    for x in range(W):
        if x in STAIRS_X:
            continue
        # the columns next to the stairs close the band with end pieces
        end = 'right' if x == STAIRS_X[0] - 1 else 'left' if x == STAIRS_X[1] + 1 else None
        if part == 'top':
            name = f'terrain_snow_cliff_top_{end}' if end else 'terrain_snow_cliff_top'
        elif part == 'base':
            name = f'terrain_snow_cliff_base_{end}_{x % 2}' if end else f'terrain_snow_cliff_base_{x % 2}'
        else:
            v = part[-1]
            name = f'terrain_snow_cliff_{end}_{v}' if end else f'terrain_snow_cliff_middle_{(x + int(v)) % 2}'
        nyx(name, x, y)
reserve(0, CLIFF_TOP, W - 1, CLIFF_TOP + 3)
for y in range(CLIFF_TOP, CLIFF_TOP + 4):
    nyx('terrain_misc_stairs_1', STAIRS_X[0], y)
reserve(STAIRS_X[0], CLIFF_TOP - 1, STAIRS_X[1], CLIFF_TOP + 4)  # keep the stairs clear

# ------------------------------------------------------------- frozen lake + pond
def ice_rect(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            v = 'top' if y == y0 else 'bottom' if y == y1 else ''
            h = 'left' if x == x0 else 'right' if x == x1 else ''
            if v and h:
                name = f'terrain_ice_ice_{v}_{h}'
            elif v:
                name = f'terrain_ice_ice_{v}_middle'
            elif h:
                name = f'terrain_ice_ice_{h}'
            else:
                name = 'terrain_ice_ice'
            nyx(name, x, y)
    reserve(x0 - 1, y0 - 1, x1 + 1, y1 + 1)


LAKE = (24, 16, 37, 25)
ice_rect(*LAKE)
POND = (40, 28, 43, 30)
ice_rect(*POND)
# ice-fishing holes and a few frost patterns on the lake
for name, x, y in [('terrain_misc_water_hole_0', 27, 19), ('terrain_misc_water_hole_1', 33, 22),
                   ('terrain_misc_water_hole_2', 30, 18), ('terrain_misc_water_hole_1', 29, 23)]:
    nyx(name, x, y)
for name, x, y in [('terrain_misc_ice_circle', 35, 18), ('terrain_misc_ice_circle_1', 26, 24),
                   ('terrain_misc_ice_square', 32, 20)]:
    nyx(name, x, y)

# ------------------------------------------------------------- cabin + fenced yard
CABIN = (7, 13)            # 133x202 px -> 5 x 7 tiles
nyx('decoration_log_cabin', *CABIN)
YARD = (4, 12, 15, 22)     # fence rectangle, gate on the south side
fx0, fy0, fx1, fy1 = YARD
GATE = (9, 10)
for x in range(fx0, fx1 + 1):
    for y, corner_l, corner_r in ((fy0, 'top_left', 'top_right'), (fy1, 'bottom_left', 'bottom_right')):
        if y == fy1 and x in GATE:
            continue
        name = f'fences_fence_{corner_l}' if x == fx0 else f'fences_fence_{corner_r}' if x == fx1 else 'fences_fence_horizontal'
        nyx(name, x, y)
for y in range(fy0 + 1, fy1):
    nyx('fences_fence_vertical', fx0, y)
    nyx('fences_fence_vertical', fx1, y)
reserve(fx0 - 1, fy0 - 1, fx1 + 1, fy1 + 1)
for name, x, y in [('decoration_snowman_0', 12, 19), ('decoration_snowman_3', 5, 20)]:
    nyx(name, x, y)
for x, y in [(13, 14), (14, 14), (13, 15)]:
    nyx('decoration_log', x, y)
# snowmen around the lake and the pond
for name, x, y in [('decoration_snowman_1', 22, 20), ('decoration_snowman_2', 38, 23),
                   ('decoration_snowman_4', 44, 27), ('decoration_snowman_5', 19, 28)]:
    nyx(name, x, y)
    reserve(x, y - 1, x, y + 1)

# ------------------------------------------------------------- trees
TREES = ['trees_tree_0', 'trees_tree_1', 'trees_tree_2', 'trees_tree_3']   # 33x57: 2 tiles wide, 2 tall


def tree(x, y):
    if free(x, y, x + 1, y + 1):
        nyx(rng.choice(TREES), x, y)
        reserve(x, y, x + 1, y + 1)


PLAYER = (24, 30)
reserve(PLAYER[0] - 2, PLAYER[1] - 2, PLAYER[0] + 2, PLAYER[1] + 2)
reserve(STAIRS_X[0] - 1, CLIFF_TOP + 4, STAIRS_X[1] + 1, CLIFF_TOP + 7)  # landing below the stairs
# plateau forest: dense, leaving a clearing above the stairs
for y in range(0, CLIFF_TOP - 1):
    for x in range(0, W - 1):
        if rng.random() < 0.55 and not (STAIRS_X[0] - 3 <= x <= STAIRS_X[1] + 2 and y >= 2):
            tree(x, y)
# edge border
for y in range(CLIFF_TOP + 4, H - 1):
    for x in (0, W - 2):
        if rng.random() < 0.8:
            tree(x, y)
for x in range(0, W - 1):
    if rng.random() < 0.8:
        tree(x, H - 2)
# groves
for _ in range(60):
    cx, cy = rng.randrange(2, W - 3), rng.randrange(CLIFF_TOP + 5, H - 3)
    for _ in range(rng.randrange(1, 4)):
        tree(cx + rng.randrange(-2, 3), cy + rng.randrange(-2, 3))

# ------------------------------------------------------------- output
tiles = [[0] * W for _ in range(H)]
out = f'''// AUTO-GENERATED — "Winter Test": a snowy test scene from the Snowy Asset
// Pack (snowy_asset_pack_nyx): plateau pine forest behind a snow cliff with
// stairs, a log cabin in a fenced yard, a frozen lake with ice-fishing holes,
// a frozen pond, snowmen and trees. Regenerate with tools/maps/gen_wintertest.py
// — don't hand-edit. Collision/layer come from the catalogues' hitbox/layer.
//
// Tile values: 0 = snow (tileset_snowy frame 72, with scattered variants).

const TILES = {tiles_js(tiles)};

const WINTERTEST_EXTRA_SHEETS = {sm.extra_sheets_js()};

const WINTERTEST_SHEET_DECORATIONS = {sm.sheet_decorations_js()};

export const WINTERTEST = {{
    id: 'wintertest',
    displayName: 'Winter Test',
    tiles: TILES,
    lightTint: null,
    playerStart: {{ x: {PLAYER[0]}, y: {PLAYER[1]} }},
    tileset: {{
        key: 'tileset_snowy',
        floorFrame: 72,                         // plain snow
        decorFrames: [73, 74, 75, 76, 77],      // snow with tracks, twigs, flowers
        decorRate: 0.12,
    }},
    extraSheets: WINTERTEST_EXTRA_SHEETS,
    sheetDecorations: WINTERTEST_SHEET_DECORATIONS,
    portals: [],
    spawns: {{}},
    currencyBias: 'rural',
    music: 'forest',
    quests: [],
    chapterTitle: 'Winter Test',
}};
'''
MAP_OUT.write_text(out)
print(f'wrote {MAP_OUT.relative_to(AMO)}: {W}x{H}, {sm.count()} sprites from {len({s for s, _ in sm.groups})} sheets')
