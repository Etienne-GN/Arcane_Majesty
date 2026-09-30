#!/usr/bin/env python3
"""
Generates src/data/maps/dungeontest.js — "Dungeon Test", a dungeon test map
from Pixel Crawler's dungeon_tiles (16px art drawn at scale 2):

  - an entrance hall with the way in (dungeon brick stairs)
  - a prison block with barred cells
  - a great hall with lamps, banners and the red-carpet stairs
  - a storage room with a wooden floor and a trapdoor
  - a pit room (pit with ledges) and a spike-trap corridor
  - corridors joining them; black void between

Walls come from the floor layout: any non-floor cell with floor 1-3 cells
below it becomes the north wall (trim, brick upper, brick lower); cells beside
floor get the thin blue trim bars; cells below floor get the trim edge.
Collision and draw layer come from the catalogue hitbox/layer.

Run from apps/amo/: python3 tools/maps/gen_dungeontest.py
"""
from pathlib import Path
import random
import sys

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, tiles_js, AMO  # noqa: E402

MAP_OUT = AMO / 'src/data/maps/dungeontest.js'
W, H = 50, 40
SEED = 5
rng = random.Random(SEED)
sm = SheetMap()
DT = 'pixel_crawler_anokolisa/dungeon_tiles'


def dt(name, x, y, **kw):
    return sm.add(DT, name, x, y, scale=2, **kw)


floor = [[False] * W for _ in range(H)]
kind = {}  # (x, y) -> floor style: 'teal' | 'wood'


def carve(x0, y0, x1, y1, style='teal'):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            floor[y][x] = True
            kind[(x, y)] = style


def is_floor(x, y):
    return 0 <= x < W and 0 <= y < H and floor[y][x]


# ------------------------------------------------------------- layout
ROOMS = {
    'entrance': (4, 6, 13, 14),
    'prison': (20, 5, 32, 12),
    'hall': (18, 20, 33, 31),
    'storage': (39, 19, 46, 26),
    'pit': (3, 23, 12, 33),
}
for name, r in ROOMS.items():
    carve(*r, 'wood' if name == 'storage' else 'teal')
# corridors (2 wide)
carve(14, 9, 19, 10)        # entrance -> prison
carve(24, 13, 25, 19)       # prison -> hall
carve(8, 15, 9, 22)         # entrance -> pit
carve(13, 27, 17, 28)       # pit -> hall
carve(34, 22, 38, 23)       # hall -> storage
carve(42, 27, 43, 34)       # storage -> south dead end (spike corridor)
carve(40, 35, 45, 36)

# ------------------------------------------------------------- floors
def floor_piece(x, y):
    if kind[(x, y)] == 'wood':
        return 'wooden_floorboards_bordered_center'
    n, s, w, e = is_floor(x, y - 1), is_floor(x, y + 1), is_floor(x - 1, y), is_floor(x + 1, y)
    v = '' if n and s else 'n' if not n else 's'
    h = '' if w and e else 'w' if not w else 'e'
    if not n and not s:
        v = 'n'
    if not w and not e:
        h = ''
    if v and h:
        return f'teal_flagstone_floor_{v}{h}'
    if v:
        return f'teal_flagstone_floor_{v}'
    if h:
        return f'teal_flagstone_floor_{h}'
    r = rng.random()
    if r < 0.06:
        return rng.choice(['teal_flagstone_floor_lighter', 'teal_flagstone_floor_darker', 'teal_flagstone_floor_plain_k'])
    return 'teal_flagstone_floor_center'


PIT = (6, 27, 9, 30)  # inside the pit room
px0, py0, px1, py1 = PIT
for y in range(H):
    for x in range(W):
        if not floor[y][x]:
            continue
        if px0 <= x <= px1 and py0 <= y <= py1:
            v = 'n' if y == py0 else 's' if y == py1 else ''
            h = 'w' if x == px0 else 'e' if x == px1 else ''
            name = f'teal_flagstone_floor_pit_ledge_{v}{h}' if (v or h) else 'teal_flagstone_floor_pit_ledge_center_pit'
            dt(name, x, y)
        else:
            dt(floor_piece(x, y), x, y)

# ------------------------------------------------------------- walls
TRIMS = ['dungeon_wall_top_blue_stone_trim_a', 'dungeon_wall_top_blue_stone_trim_b', 'dungeon_wall_top_blue_stone_trim_c']
UPPER = ['dungeon_brick_wall_face_upper_left', 'dungeon_brick_wall_face_upper_middle', 'dungeon_brick_wall_face_upper_right']
LOWER = ['dungeon_brick_wall_face_lower_left', 'dungeon_brick_wall_face_lower_middle', 'dungeon_brick_wall_face_lower_right']
wall_role = {}
for y in range(H):
    for x in range(W):
        if floor[y][x]:
            continue
        if is_floor(x, y + 1):
            role = 'lower'
        elif is_floor(x, y + 2) and not is_floor(x, y + 1):
            role = 'upper'
        elif is_floor(x, y + 3) and not is_floor(x, y + 1) and not is_floor(x, y + 2):
            role = 'trim'
        elif is_floor(x + 1, y):
            role = 'bar_w'      # thin trim bar on this cell's right edge, floor to the east
        elif is_floor(x - 1, y):
            role = 'bar_e'
        elif is_floor(x, y - 1):
            role = 'edge_s'     # trim along the top edge, floor above
        else:
            continue
        wall_role[(x, y)] = role
for (x, y), role in wall_role.items():
    i = rng.randrange(3)
    name = {'lower': LOWER[i], 'upper': UPPER[i], 'trim': TRIMS[i],
            'bar_w': 'dungeon_wall_top_blue_stone_trim_external_w', 'bar_e': 'dungeon_wall_top_blue_stone_trim_external_e',
            'edge_s': 'dungeon_wall_top_blue_stone_trim_n'}[role]
    dt(name, x, y)

# ------------------------------------------------------------- props
def on_wall(name, x, y):
    """Something hung on a north wall face (lower row directly above floor)."""
    assert wall_role.get((x, y)) in ('lower', 'upper'), (name, x, y)
    dt(name, x, y)


ex0, ey0, ex1, ey1 = ROOMS['entrance']
dt('stairs_dungeon_brick_nw', 5, 7); dt('stairs_dungeon_brick_ne', 6, 7)
dt('stairs_dungeon_brick_sw', 5, 8); dt('stairs_dungeon_brick_se', 6, 8)
on_wall('wall_lamp_blue', 8, ey0 - 2)
on_wall('wall_lamp_blue', 12, ey0 - 2)
# prison block: cells behind bars along the north wall
rx0, ry0, rx1, ry1 = ROOMS['prison']
for x in range(rx0, rx1 + 1, 3):
    dt('prison_bars_b', x + 1, ry0 + 2)
for x in (rx0 + 2, rx0 + 6, rx0 + 11):
    dt(rng.choice(['teal_flagstone_floor_blood_stain_a', 'teal_flagstone_floor_blood_stain_c', 'teal_flagstone_floor_blood_stain_e']), x, ry0 + 1)
dt('iron_floor_grate_nw', 27, 10); dt('iron_floor_grate_ne', 28, 10)
dt('iron_floor_grate_sw', 27, 11); dt('iron_floor_grate_se', 28, 11)
# great hall
hx0, hy0, hx1, hy1 = ROOMS['hall']
dt('stairs_red_yellow_carpet', 25, hy0)
for x in (hx0 + 2, hx1 - 1):   # the arched door sits at x 29-30
    on_wall('wall_lamp_red', x, hy0 - 2)
for x in (hx0 + 5, hx1 - 6):
    dt('banner_red_long', x, hy0 - 2)
for x in (hx0 + 3, hx1 - 3):
    for y in (hy0 + 4, hy0 + 8):
        dt('wood_pillar', x, y)
dt('door_wood_arched', 29, hy0 - 3)
# storage room
sx0, sy0, sx1, sy1 = ROOMS['storage']
dt('wooden_trapdoor_large_corner_top_left', 42, 21); dt('wooden_trapdoor_large_edge_top', 43, 21); dt('wooden_trapdoor_large_corner_top_right', 44, 21)
dt('wooden_trapdoor_large_edge_left', 42, 22); dt('wooden_trapdoor_large_center_handle', 43, 22); dt('wooden_trapdoor_large_edge_right', 44, 22)
dt('wooden_trapdoor_large_corner_bottom_left', 42, 23); dt('wooden_trapdoor_large_edge_bottom', 43, 23); dt('wooden_trapdoor_large_corner_bottom_right', 44, 23)
dt('wooden_cabinet_small_top_left', 40, sy0); dt('wooden_cabinet_small_top_right', 41, sy0)
dt('wooden_cabinet_small_bottom_left', 40, sy0 + 1); dt('wooden_cabinet_small_bottom_right', 41, sy0 + 1)
dt('door_wood_iron_bands_closed', 44, sy0 - 2)
# pit room + spike corridor
on_wall('wall_lamp_green', 5, ROOMS['pit'][1] - 2)
for y in (29, 31, 33):
    dt('spike_trap', 42, y)
    dt('spike_trap', 43, y)
dt('gate_iron_arched', 41, 32 - 1)

PLAYER = (9, 11)
tiles = [[0 if floor[y][x] else 4 for x in range(W)] for y in range(H)]
out = f'''// AUTO-GENERATED — "Dungeon Test": a dungeon test map from Pixel Crawler's
// dungeon_tiles (16px art at scale 2): entrance hall, prison block, great
// hall, storage room, pit room, spike corridor, joined by corridors in a
// black void. Regenerate with tools/maps/gen_dungeontest.py — don't hand-edit.
// Collision/layer come from the catalogue's hitbox/layer.
//
// Tile values: 0 = under a floor sprite, 4 = void (backgroundColor shows).

const TILES = {tiles_js(tiles)};

const DUNGEONTEST_EXTRA_SHEETS = {sm.extra_sheets_js()};

const DUNGEONTEST_SHEET_DECORATIONS = {sm.sheet_decorations_js()};

export const DUNGEONTEST = {{
    id: 'dungeontest',
    displayName: 'Dungeon Test',
    tiles: TILES,
    backgroundColor: '#0b0b0e',
    lightTint: null,
    playerStart: {{ x: {PLAYER[0]}, y: {PLAYER[1]} }},
    tileset: {{ key: 'tileset_base', floorFrame: 0, pathFrame: 0 }},
    extraSheets: DUNGEONTEST_EXTRA_SHEETS,
    sheetDecorations: DUNGEONTEST_SHEET_DECORATIONS,
    portals: [],
    spawns: {{}},
    currencyBias: 'rural',
    music: 'forest',
    quests: [],
    chapterTitle: 'Dungeon Test',
}};
'''
MAP_OUT.write_text(out)
print(f'wrote {MAP_OUT.relative_to(AMO)}: {W}x{H}, {sm.count()} sprites')
