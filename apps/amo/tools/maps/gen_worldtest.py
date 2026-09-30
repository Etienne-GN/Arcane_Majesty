#!/usr/bin/env python3
"""
Generates src/data/maps/worldtest.js — "The Grand Tour (Test)", a 128x100-tile
multi-region showcase map mixing every catalogued pack:

  north      snowy plateau: pine forest, frozen lake with fishing holes, a log
             cabin in a fenced yard, snowmen — behind a snow cliff with stairs
  west       forest: a river from a spring at the cliff foot winding down to
             a lake, a rope bridge, a campfire camp, mushrooms and flowers
  centre     village: cobbled plaza with a fountain and statues, market
             stalls, a church with stained glass, houses built from the
             Pipoya house kit (walls + roofs + doors + windows), gardens,
             well, lamps, signposts
  east       desert: sand with dunes, an oasis, an ancient stone arch and
             broken pillars, a nomad camp with tents and a fire, bones
  south-west graveyard with an iron fence and a crypt stairway down
  south-east rocky badlands and a cave mouth in the mountain ridge
  underground (below the ridge, in the dark): the crypt (dungeon rooms) and a
             cavern with ore veins, crystals, stalagmites, glowing mushrooms,
             a rock-island pool and a timbered mine entrance

Everything is drawn from catalogue sprites, so collision and draw order come
from each sprite's hitbox/layer (set and reviewed in the sprite ledger).
Deterministic (fixed seed). Preview without the game:
  python3 tools/maps/render_map_preview.py worldtest out.png --shrink 4

Run from apps/amo/: python3 tools/maps/gen_worldtest.py
"""
from pathlib import Path
import math
import random
import sys

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, tiles_js, js_item, AMO  # noqa: E402

MAP_OUT = AMO / 'src/data/maps/worldtest.js'
W, H = 128, 100
rng = random.Random(2026)
sm = SheetMap()

BC = 'SampleMap/[Base]BaseChip_pipo'
WATER = 'SampleMap/[A]Water_pipo'
LPC_T, LPC_B, LPC_BU, LPC_M, LPC_I = 'lpc/terrain_atlas', 'lpc/base_out_atlas', 'lpc/build_atlas', 'lpc/obj_misk_atlas', 'lpc/items1'
NYX = 'snowy_asset_pack_nyx'
PC_D, PC_C = 'pixel_crawler_anokolisa/dungeon_tiles', 'pixel_crawler_anokolisa/cave_tiles'
# sheets the game loads at boot go in their own mapDef fields; everything else via extraSheets
BOOT_FIELDS = {BC: 'decorations', WATER: 'waterTiles', LPC_T: 'lpcTerrainDecorations', LPC_B: 'lpcBaseOutDecorations',
               LPC_BU: 'lpcBuildDecorations', LPC_M: 'lpcObjMiskDecorations'}
boot_items = {f: [] for f in BOOT_FIELDS.values()}

# ------------------------------------------------------------------ grids
# ground: grass | path | cobble | sand | snow | void | cave | crypt | ridge | cliff
ground = [['grass'] * W for _ in range(H)]
water = [[False] * W for _ in range(H)]
occupied = [[False] * W for _ in range(H)]


def inside(x, y):
    return 0 <= x < W and 0 <= y < H


def put(sheet, name, x, y, scale=1, mark=True, **extra):
    """Place a sprite (x, y in map tiles, top-left). Marks the tiles it covers."""
    sm.entry(sheet, name)
    item = {'name': name, 'x': x, 'y': y, **extra}
    if sheet in BOOT_FIELDS and scale == 1:
        boot_items[BOOT_FIELDS[sheet]].append(item)
    else:
        sm.add(sheet, name, x, y, scale=scale, **extra)
    if mark:
        wt, ht = sm.size_tiles(sheet, name, scale)
        for yy in range(y, y + ht):
            for xx in range(x, x + wt):
                if inside(xx, yy):
                    occupied[yy][xx] = True
    return item


def free(x, y, wt, ht, grounds=('grass',), margin=0):
    for yy in range(y - margin, y + ht + margin):
        for xx in range(x - margin, x + wt + margin):
            if not inside(xx, yy) or occupied[yy][xx] or water[yy][xx] or ground[yy][xx] not in grounds:
                return False
    return True


def try_put(sheet, name, x, y, grounds=('grass',), scale=1, margin=0, **extra):
    wt, ht = sm.size_tiles(sheet, name, scale)
    if free(x, y, wt, ht, grounds, margin):
        put(sheet, name, x, y, scale=scale, **extra)
        return True
    return False


def scatter(sheet, names, count, box, grounds=('grass',), scale=1, margin=0, tries=4000):
    x0, y0, x1, y1 = box
    n = 0
    for _ in range(tries):
        if n >= count:
            break
        name = rng.choice(names) if isinstance(names, list) else names
        if try_put(sheet, name, rng.randint(x0, x1), rng.randint(y0, y1), grounds, scale, margin):
            n += 1
    return n


# ------------------------------------------------------------------ layout constants
SNOW_END = 18            # rows 0..17 snow plateau
CLIFF = (18, 21)         # snow cliff band rows
STAIRS_X = 62            # 2-wide stairs through the cliff, top of the main road
RIDGE = (72, 75)         # mountain ridge between the overworld and the underground
UNDER = 76               # underground from here down (dark)
ROAD_Y = 44              # east-west road (2 rows)
MAIN_X = 62              # north-south main road (2 cols)
PLAZA = (54, 37, 71, 51) # cobbled plaza
CRYPT_STAIRS_X = 33
CAVE_X = 103             # cave mouth (3 wide) in the ridge

for y in range(H):
    for x in range(W):
        if y < SNOW_END:
            ground[y][x] = 'snow'
        elif CLIFF[0] <= y <= CLIFF[1]:
            ground[y][x] = 'cliff'
        elif RIDGE[0] <= y <= RIDGE[1]:
            ground[y][x] = 'ridge'
        elif y >= UNDER:
            ground[y][x] = 'void'

# desert: east of a wavy border, between the cliff and the ridge
def desert_border(y):
    return 90 + 3 * math.sin(y / 5.0) + 2 * math.sin(y / 2.3 + 1)


for y in range(CLIFF[1] + 1, RIDGE[0]):
    for x in range(W):
        if x >= desert_border(y) + rng.uniform(-0.8, 0.8):
            ground[y][x] = 'sand'

# ------------------------------------------------------------------ water: spring, river, lake, oasis
def disc(cx, cy, r):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            if inside(x, y) and (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r and ground[y][x] in ('grass', 'sand'):
                water[y][x] = True


def ellipse(cx, cy, rx, ry):
    for y in range(H):
        for x in range(W):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 and ground[y][x] in ('grass', 'sand'):
                water[y][x] = True


BRIDGE_X = 20                                # the river crosses the west road here, 3 wide
ellipse(26, 24.5, 4.5, 2.4)                  # spring pool at the cliff foot
for cx, cy, rx, ry in [(15, 59, 8, 5), (10, 62, 5, 3.4), (20, 56, 4.5, 3.2), (13, 64, 4, 2.5)]:
    ellipse(cx, cy, rx, ry)                  # forest lake, a few overlapping lobes
RIVER = [(26, 25), (28, 30), (26, 35), (22, 38), (BRIDGE_X + 1.5, ROAD_Y - 3), (BRIDGE_X + 1.5, ROAD_Y + 4), (18, 51), (17, 55)]
for (ax, ay), (bx, by) in zip(RIVER, RIVER[1:]):
    steps = int(math.hypot(bx - ax, by - ay) * 4) + 1
    for i in range(steps + 1):
        t = i / steps
        disc(ax + (bx - ax) * t, ay + (by - ay) * t, 1.55)
for cx, cy, rx, ry in [(109, 34, 5.5, 3.2), (106, 35.5, 3.2, 2.3), (112, 32.8, 3, 2)]:
    ellipse(cx, cy, rx, ry)                  # oasis


def smooth(rounds=2):
    for _ in range(rounds):
        new = [row[:] for row in water]
        for y in range(H):
            for x in range(W):
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if inside(x + dx, y + dy) and water[y + dy][x + dx])
                if water[y][x] and n < 2:
                    new[y][x] = False
                elif not water[y][x] and n >= 3 and ground[y][x] in ('grass', 'sand'):
                    new[y][x] = True
        water[:] = new


smooth()
# under the bridge the river is exactly 3 wide and straight
for y in range(ROAD_Y - 2, ROAD_Y + 4):
    for x in range(BRIDGE_X - 3, BRIDGE_X + 6):
        if ground[y][x] == 'grass':
            water[y][x] = BRIDGE_X <= x < BRIDGE_X + 3


def is_water(x, y):
    if not inside(x, y):
        return False
    return water[y][x]


def water_piece(x, y):
    n, s, e, w = is_water(x, y - 1), is_water(x, y + 1), is_water(x + 1, y), is_water(x - 1, y)
    missing = ''.join(d for d, v in (('n', n), ('s', s), ('e', e), ('w', w)) if not v)
    table = {'': None, 'n': 'edge_n', 's': 'edge_s', 'e': 'edge_e', 'w': 'edge_w',
             'nw': 'corner_nw', 'ne': 'corner_ne', 'sw': 'corner_sw', 'se': 'corner_se',
             'ns': 'channel_h_middle', 'ew': 'channel_v_middle', 'nsw': 'channel_h_left', 'nse': 'channel_h_right',
             'new': 'channel_v_top', 'sew': 'channel_v_bottom', 'nsew': 'island'}
    role = table[missing]
    if role is None:
        for d, (dx, dy) in (('ne', (1, -1)), ('nw', (-1, -1)), ('se', (1, 1)), ('sw', (-1, 1))):
            if not is_water(x + dx, y + dy):
                role = f'inner_corner_{d}'
                break
        else:
            role = 'fill'
    return f'water1_{role}'


# ------------------------------------------------------------------ roads
def road(cells, kind='path'):
    for x, y in cells:
        if inside(x, y) and ground[y][x] in ('grass', 'sand') and not water[y][x]:
            ground[y][x] = kind


road([(x, y) for x in range(0, W) for y in (ROAD_Y, ROAD_Y + 1)])                         # west-east
road([(x, y) for x in (MAIN_X, MAIN_X + 1) for y in range(CLIFF[1] + 1, 66)])             # north-south
road([(x, y) for x in range(CRYPT_STAIRS_X, MAIN_X + 2) for y in (65, 66)])               # to the graveyard
road([(x, y) for x in (CRYPT_STAIRS_X, CRYPT_STAIRS_X + 1) for y in range(65, RIDGE[0])])
road([(x, y) for x in range(MAIN_X, CAVE_X + 2) for y in (65, 66)])                        # to the badlands
road([(x, y) for x in (CAVE_X + 1, CAVE_X + 2) for y in range(65, RIDGE[0])])
road([(x, y) for x in (22, 23) for y in range(ROAD_Y + 2, 50)])                           # to the lake shore
road([(x, y) for x in range(PLAZA[0], PLAZA[2] + 1) for y in range(PLAZA[1], PLAZA[3] + 1)], 'cobble')

# ------------------------------------------------------------------ snow plateau
SNOW_TILES = ['terrain_snow_snow_0'] * 12 + ['terrain_snow_snow_1', 'terrain_snow_snow_2', 'terrain_snow_snow_3',
                                              'terrain_snow_snow_4', 'terrain_snow_snow_5']


def nyx(name, x, y, **kw):
    return put(f'{NYX}/{name}', name, x, y, **kw)


for y in range(SNOW_END):
    for x in range(W):
        nyx(rng.choice(SNOW_TILES), x, y, mark=False)
# snow cliff band with stairs
for i, part in enumerate(['top', 'middle_0', 'middle_1', 'base']):
    y = CLIFF[0] + i
    for x in range(W):
        if x in (STAIRS_X, STAIRS_X + 1):
            continue
        end = 'right' if x == STAIRS_X - 1 else 'left' if x == STAIRS_X + 2 else None
        if part == 'top':
            name = f'terrain_snow_cliff_top_{end}' if end else 'terrain_snow_cliff_top'
        elif part == 'base':
            name = f'terrain_snow_cliff_base_{end}_{x % 2}' if end else f'terrain_snow_cliff_base_{x % 2}'
        else:
            v = part[-1]
            name = f'terrain_snow_cliff_{end}_{v}' if end else f'terrain_snow_cliff_middle_{(x + int(v)) % 2}'
        nyx(name, x, y)
for y in range(CLIFF[0], CLIFF[1] + 1):
    nyx('terrain_misc_stairs_1', STAIRS_X, y)
# frozen lake with fishing holes
def ice_rect(x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            v = 'top' if y == y0 else 'bottom' if y == y1 else ''
            h = 'left' if x == x0 else 'right' if x == x1 else ''
            name = (f'terrain_ice_ice_{v}_{h}' if v and h else f'terrain_ice_ice_{v}_middle' if v
                    else f'terrain_ice_ice_{h}' if h else 'terrain_ice_ice')
            nyx(name, x, y)


ice_rect(14, 5, 27, 11)
for name, x, y in [('terrain_misc_water_hole_0', 17, 7), ('terrain_misc_water_hole_1', 22, 9), ('terrain_misc_water_hole_2', 25, 6),
                   ('terrain_misc_ice_circle', 20, 6), ('terrain_misc_ice_square', 24, 10)]:
    nyx(name, x, y)
ice_rect(104, 11, 108, 13)
# log cabin in a fenced yard
nyx('decoration_log_cabin', 88, 3)
fx0, fy0, fx1, fy1 = 85, 2, 96, 13
for x in range(fx0, fx1 + 1):
    for y, l, r in ((fy0, 'top_left', 'top_right'), (fy1, 'bottom_left', 'bottom_right')):
        if y == fy1 and x in (90, 91):
            continue
        nyx(f'fences_fence_{l}' if x == fx0 else f'fences_fence_{r}' if x == fx1 else 'fences_fence_horizontal', x, y)
for y in range(fy0 + 1, fy1):
    nyx('fences_fence_vertical', fx0, y)
    nyx('fences_fence_vertical', fx1, y)
for x in range(fx0, fx1 + 1):
    for y in range(fy0, fy1 + 1):
        occupied[y][x] = True
for name, x, y in [('decoration_snowman_0', 93, 10), ('decoration_snowman_3', 86, 9), ('decoration_snowman_1', 30, 9),
                   ('decoration_snowman_5', 58, 12), ('decoration_snowman_2', 110, 14), ('decoration_snowman_4', 12, 13)]:
    nyx(name, x, y)
for x, y in [(94, 5), (95, 5), (94, 6)]:
    nyx('decoration_log', x, y)
# keep a trail from the stairs up into the plateau
for y in range(4, SNOW_END):
    for x in range(STAIRS_X - 1, STAIRS_X + 3):
        occupied[y][x] = True
for x in range(12, 30):
    for y in range(4, 13):
        occupied[y][x] = True
PINES = ['trees_tree_0', 'trees_tree_1', 'trees_tree_2', 'trees_tree_3']
# pine groves with open meadows between them, and a thinner scatter
for gx, gy, n in [(6, 4, 40), (38, 6, 40), (50, 12, 25), (72, 5, 45), (108, 5, 40), (122, 10, 25), (80, 14, 20), (34, 14, 20)]:
    for _ in range(n * 6):
        x, y = int(rng.gauss(gx, 5)), int(rng.gauss(gy, 3))
        if free(x, y, 2, 2, grounds=('snow',)) and rng.random() < 0.5:
            nyx(rng.choice(PINES), x, y)
for _ in range(250):
    x, y = rng.randrange(0, W - 1), rng.randrange(0, SNOW_END - 2)
    if free(x, y, 2, 2, grounds=('snow',), margin=1):
        nyx(rng.choice(PINES), x, y)

# ------------------------------------------------------------------ desert
SAND = ['sand_fill_center'] * 14 + ['sand_fill_crack_a', 'sand_fill_crack_b', 'sand_fill_crack_c', 'sand_fill_crack_d']
for y in range(H):
    for x in range(W):
        if ground[y][x] == 'sand' and not water[y][x]:
            put(LPC_T, rng.choice(SAND), x, y, mark=False)
# ancient arch and broken pillars
put(BC, 'gate_stone_archway', 112, 50)
for x, y, v in [(106, 52, 'a'), (119, 52, 'b'), (106, 57, 'b'), (119, 57, 'a'), (110, 60, 'a')]:
    put(LPC_T, f'cracked_pillar_{v}_top', x, y)
    put(LPC_T, f'cracked_pillar_{v}_base', x, y + 1)
for x, y in [(114, 57), (116, 59), (109, 55)]:
    put(LPC_T, 'sandstone_pebble_scatter_a', x, y)
# nomad camp: two tents around a fire
put(LPC_BU, 'canvas_tent_a', 96, 26)
put(LPC_BU, 'canvas_tent_a', 120, 27)
put('pixel_crawler_anokolisa/Bonfire_10-Sheet', 'bonfire_10-sheet', 108, 28, scale=2)
for name, x, y in [('crate_wood_light', 101, 30), ('barrel_dark', 102, 30), ('sack_tan_round', 101, 31), ('haybale_yellow', 118, 31)]:
    try_put(BC, name, x, y, grounds=('sand',))
# oasis greenery
for _ in range(14):
    a = rng.uniform(0, 2 * math.pi)
    x, y = int(109 + math.cos(a) * 6.2), int(34 + math.sin(a) * 4.2)
    try_put(BC, rng.choice(['bush_round_green_light', 'flower_white_cluster', 'tree_bush_green_light']), x, y, grounds=('sand',))
# dunes, boulders, bones
scatter(LPC_T, ['sandstone_boulder_b', 'upright_boulder_sandstone', 'sandstone_boulder_cluster_a', 'sandstone_boulder_c'], 26, (92, 22, 126, 70), grounds=('sand',), margin=1)
scatter(LPC_T, ['dune_cap_l', 'dune_cap_r', 'sandstone_pebble_scatter_b', 'sandstone_pebble_scatter_c'], 40, (92, 22, 126, 70), grounds=('sand',))
scatter(BC, ['skull'], 7, (92, 22, 126, 70), grounds=('sand',))
scatter(LPC_I, ['lpc_bones_pair_a', 'lpc_bones_pair_b', 'lpc_bones_pair_c', 'lpc_bones_pair_d'], 10, (92, 22, 126, 70), grounds=('sand',))

# ------------------------------------------------------------------ village
# houses from the Pipoya kit: roof rows (ridge, transition, lower a/b...) above a 2-tall wall row
ROOF = {'wood_brown': ('roof_fill_a', 'roof_shingle_wood_brown'), 'terracotta': ('roof_fill_b', 'roof_shingle_terracotta'),
        'brick_teal': ('roof_fill_c', 'roof_brick_teal'), 'scale_red': ('roof_fill_d', 'roof_scale_red'),
        'dome_gray': ('roof_fill_e', 'roof_dome_gray'), 'metal_corrugated_gray': ('roof_fill_f', 'roof_metal_corrugated_gray'),
        'thatch_gold': ('roof_fill_g', 'roof_thatch_gold_dense')}
WALLS = {
    'plaster': ('wall_redbrick_a', 'wall_redbrick_mid', 'wall_redbrick_right'),
    'timber': ('wall_tan_wood_window_a', 'wall_tan_wood_window_mid', 'wall_tan_wood_window_right'),
    'planks': ('building_wall_corner_l_a', 'building_wall_fill_a', 'building_wall_corner_r_a'),
    'stone': ('wall_graybrick_a', 'wall_graybrick_mid', 'wall_graybrick_right'),
    'white': ('wall_white_orangebase_a', 'wall_white_orangebase_mid', 'wall_white_orangebase_right'),
    'shop': ('wall_awning_yellow_a', 'wall_awning_yellow_mid', 'wall_awning_yellow_right'),
    'brick': ('wall_redbrick_pink_a', 'wall_redbrick_pink_mid', 'wall_redbrick_pink_right'),
    'olive': ('wall_olivebrick_a', 'wall_olivebrick_mid', 'wall_olivebrick_right'),
    'gold': ('wall_gold_wood_a', 'wall_gold_wood_mid', 'wall_gold_wood_right'),
}
DOORS = ['door_wood_arch_a', 'door_wood', 'door_wood_brown_panel_a', 'door_wood_orange_a', 'door_wood_dark_paneled']
WINDOWS = ['window_brown_2pane', 'window_brown_4pane', 'window_brown_grid', 'window_curtained_red', 'window_curtained_gray']


def house(x0, y0, w, roof_rows, walls, roof, door=None, windows=None, door_dx=None):
    """Top-left at (x0, y0). Height = roof_rows + 2. Door on the wall's bottom edge."""
    top, trans = ROOF[roof]
    rows = [top, trans] + [f'roof_{roof}_lower_{"ab"[i % 2]}' for i in range(roof_rows - 2)]
    for r, n in enumerate(rows):
        for x in range(x0, x0 + w):
            put(BC, n, x, y0 + r)
    wy = y0 + roof_rows
    left, mid, right = WALLS[walls]
    for x in range(x0, x0 + w):
        put(BC, left if x == x0 else right if x == x0 + w - 1 else mid, x, wy)
    dx = door_dx if door_dx is not None else w // 2
    put(BC, door or rng.choice(DOORS), x0 + dx, wy, mark=False)
    wins = windows or rng.choice(WINDOWS)
    for x in range(x0 + 1, x0 + w - 1):
        if abs(x - (x0 + dx)) >= 2 and (x - x0) % 2 == 1:
            put(BC, wins, x, wy, mark=False)
    # a path from the door down to whatever is below
    y = wy + 2
    while inside(x0 + dx, y) and ground[y][x0 + dx] == 'grass' and y < wy + 6:
        ground[y][x0 + dx] = 'path'
        y += 1
    return (x0 + dx, wy + 1)



# wooden / iron fences: each piece is named after the directions it connects
FENCE = {}
for _n in sm.catalogue(BC)[1]:
    if _n.startswith('fence_') and _n.split('_')[1] in ('wood', 'iron', 'brick'):
        _parts = _n.split('_')
        FENCE[(_parts[1], frozenset(p for p in _parts[2:] if p in ('up', 'down', 'left', 'right')))] = _n


def fence_rect(x0, y0, x1, y1, kind='wood', gate=()):
    ring = {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if x in (x0, x1) or y in (y0, y1)} - set(gate)
    for x, y in ring:
        dirs = frozenset(d for d, (dx, dy) in (('up', (0, -1)), ('down', (0, 1)), ('left', (-1, 0)), ('right', (1, 0)))
                         if (x + dx, y + dy) in ring)
        put(BC, FENCE.get((kind, dirs), f'fence_{kind}_stud'), x, y)


# Streets: the plaza sits on the crossroads; a north and a south street run
# along the house rows, and every door gets a short path out to its street.
NORTH_ST, SOUTH_ST = 31, 57
road([(x, y) for x in range(41, 88) for y in (NORTH_ST, NORTH_ST + 1)])
road([(x, y) for x in range(41, 88) for y in (SOUTH_ST, SOUTH_ST + 1)])
road([(x, y) for x in (41, 42) for y in range(NORTH_ST, SOUTH_ST + 2)])
road([(x, y) for x in (86, 87) for y in range(NORTH_ST, SOUTH_ST + 2)])
for y in range(PLAZA[1], PLAZA[3] + 1):
    for x in range(PLAZA[0], PLAZA[2] + 1):
        ground[y][x] = 'cobble'


def door_path(door, street_y):
    x, y = door
    while y < street_y and ground[y][x] == 'grass':
        ground[y][x] = 'path'
        y += 1


# (x, width, roof rows, walls, roof) per row; wy = the wall row (walls are 2 tall)
ROW_N = [(43, 7, 5, 'stone', 'dome_gray'), (51, 5, 3, 'timber', 'thatch_gold'), (56, 5, 4, 'plaster', 'scale_red'),
         (66, 6, 4, 'white', 'brick_teal'), (73, 5, 3, 'planks', 'terracotta'), (79, 6, 4, 'shop', 'dome_gray')]
ROW_M = [(44, 5, 3, 'white', 'wood_brown'), (49, 5, 3, 'plaster', 'scale_red'),
         (72, 6, 3, 'stone', 'brick_teal'), (79, 6, 3, 'gold', 'thatch_gold')]
ROW_S = [(43, 6, 4, 'brick', 'scale_red'), (50, 5, 3, 'timber', 'thatch_gold'),
         (72, 5, 3, 'olive', 'terracotta'), (78, 7, 4, 'plaster', 'brick_teal')]
church = None
for i, (x, w, rr, walls, roof) in enumerate(ROW_N):
    wy = NORTH_ST - 2
    if i == 0:   # the church: stone, grey dome, stained glass, ornate door
        church = (x, wy - rr, w)
        door = house(x, wy - rr, w, rr, walls, roof, door='door_gold_ornate_red_a', windows='window_curtained_gray')
        put(BC, 'window_stained_glass_red', x + 1, wy - 1, mark=False)
        put(BC, 'window_stained_glass_rainbow', x + w - 2, wy - 1, mark=False)
    else:
        door = house(x, wy - rr, w, rr, walls, roof)
    door_path(door, NORTH_ST)
for x, w, rr, walls, roof in ROW_M:
    wy = ROAD_Y - 3
    door_path(house(x, wy - rr, w, rr, walls, roof), ROAD_Y)
for x, w, rr, walls, roof in ROW_S:
    wy = SOUTH_ST - 2
    door_path(house(x, wy - rr, w, rr, walls, roof), SOUTH_ST)

# plaza: fountain on the crossroads, statues, market stalls, lamps, benches, flower beds
put(BC, 'fountain_stone_round', MAIN_X - 1, ROAD_Y - 1)
put(BC, 'knight_statue_gray', PLAZA[0] + 1, PLAZA[1])
put(BC, 'knight_statue_gray', PLAZA[2] - 1, PLAZA[1])
put(BC, 'angel_statue_gray', church[0] + church[2], NORTH_ST - 3)
for x, y in [(56, 47), (67, 47), (56, 39), (67, 39)]:
    put('roleworld_wizard/exterior_asset', 'market_stall', x, y)
for x, y in [(PLAZA[0], ROAD_Y - 2), (PLAZA[2], ROAD_Y - 2), (PLAZA[0], PLAZA[3] - 2), (PLAZA[2], PLAZA[3] - 2),
             (MAIN_X - 1, NORTH_ST + 2), (MAIN_X + 2, SOUTH_ST - 3)]:
    put(LPC_M, 'street_lamp_lit', x, y)
for name, x, y in [('bench_wood_plain_a', 59, 43), ('bench_wood_plain_b', 66, 43), ('bench_wood_plain_a', 59, 47),
                   ('bench_wood_plain_b', 66, 47)]:
    try_put(LPC_M, name, x, y, grounds=('cobble',))
for name, x, y in [('barrel_dark', 60, 50), ('crate_wood_light', 58, 50), ('crate_wood_light_open', 59, 50),
                   ('sack_tan_round', 69, 45), ('haybale_yellow', 70, 50), ('barrel_stack_brown', 70, 37),
                   ('signpost_directional_multi', MAIN_X + 2, NORTH_ST + 2), ('well_crank_post', 47, 47),
                   ('mailbox_wood_red_roof', 55, NORTH_ST + 2), ('well_stone_basin', 83, 47)]:
    try_put(BC, name, x, y, grounds=('grass', 'cobble', 'path'))
for x, y in [(PLAZA[0] + 3, PLAZA[1] + 1), (PLAZA[2] - 3, PLAZA[1] + 1), (PLAZA[0] + 3, PLAZA[3] - 1), (PLAZA[2] - 3, PLAZA[3] - 1)]:
    for dx in (0, 1):
        try_put(BC, rng.choice(['flower_pink_bush', 'flower_white_cluster', 'flower_sunflower']), x + dx, y, grounds=('cobble',))
# trees and flowers in the yards between houses (kept off the streets)
for _ in range(220):
    x, y = rng.randrange(41, 88), rng.randrange(NORTH_ST - 8, SOUTH_ST + 2)
    if PLAZA[0] - 1 <= x <= PLAZA[2] + 1 and PLAZA[1] - 1 <= y <= PLAZA[3] + 1:
        continue
    if rng.random() < 0.3:
        try_put(BC, rng.choice(['tree_bush_green_light', 'tree_bush_green_dark']), x, y, margin=1)
    else:
        try_put(BC, rng.choice(['flower_white_cluster', 'flower_pink_bush', 'bush_round_green_light', 'flower_sunflower']), x, y)

# farms south of the south street: fenced fields, a windmill, haystacks
FIELDS = [(44, 60, 54, 63), (70, 60, 84, 63)]
for i, (x0, y0, x1, y1) in enumerate(FIELDS):
    fence_rect(x0, y0, x1, y1, gate={((x0 + x1) // 2, y0)})
    for y in range(y0 + 1, y1):
        for x in range(x0 + 1, x1):
            put(BC, 'flower_sunflower' if (x + i) % 2 else 'haybale_bundle_tied', x, y)
try_put(LPC_BU, 'windmill', 57, 60)
for x, y in [(66, 60), (67, 61), (66, 62)]:
    try_put(BC, 'haybale_yellow', x, y)

# ------------------------------------------------------------------ forest (west) + campsite
camp = (8, 34)
put('pixel_crawler_anokolisa/Bonfire_10-Sheet', 'bonfire_10-sheet', camp[0], camp[1], scale=2)
put(LPC_BU, 'canvas_tent_a', camp[0] - 6, camp[1] - 5)
for name, dx, dy in [('stump_big', 3, 0), ('stump_small', -2, 2), ('woodpile_stacked', 4, 2), ('brazier_wood_tripod', 3, -3)]:
    try_put(BC, name, camp[0] + dx, camp[1] + dy)
for x in range(camp[0] - 7, camp[0] + 7):
    for y in range(camp[1] - 6, camp[1] + 5):
        if inside(x, y):
            occupied[y][x] = occupied[y][x] or ground[y][x] == 'grass' and False
# the bridge where the west road crosses the river
put(BC, 'bridge_rope_wood_a', BRIDGE_X, ROAD_Y - 1, depthOffset=1)   # above the water (both are 'under')
bridge_cells = {(x, y) for x in range(BRIDGE_X, BRIDGE_X + 3) for y in range(ROAD_Y - 1, ROAD_Y + 2)}
# a pier on the lake
lake_top = next(y for y in range(46, 70) if water[y][22] and water[y][23])
put(BC, 'bridge_wood_plank', 22, lake_top - 1, depthOffset=1)
pier_cells = {(x, y) for x in (22, 23) for y in (lake_top - 1, lake_top)}

TREES = ['tree_bush_green_light', 'tree_bush_green_dark', 'tree_bush_green_dark', 'tree_bush_orange']
GRAVEYARD = (26, 59, 42, 70)
for _ in range(2600):
    x, y = rng.randrange(0, 42), rng.randrange(CLIFF[1] + 1, RIDGE[0] - 1)
    if abs(x - camp[0]) < 7 and abs(y - camp[1]) < 6:
        continue
    if GRAVEYARD[0] - 2 <= x <= GRAVEYARD[2] + 1 and GRAVEYARD[1] - 2 <= y <= GRAVEYARD[3]:
        continue
    try_put(BC, rng.choice(TREES), x, y)
# scattered trees east of the village and along the ridge
for _ in range(700):
    x, y = rng.randrange(40, 92), rng.randrange(CLIFF[1] + 1, RIDGE[0] - 1)
    if PLAZA[0] - 3 <= x <= PLAZA[2] + 3 and PLAZA[1] - 3 <= y <= PLAZA[3] + 3:
        continue
    if rng.random() < 0.35:
        try_put(BC, rng.choice(TREES), x, y, margin=1)
SMALL = [('bush_round_green_light', 90), ('flower_white_cluster', 60), ('flower_pink_bush', 50), ('flower_sunflower', 14),
         ('mushroom_brown_cluster', 40), ('mushroom_pink_cluster', 16), ('rock_small_tan', 26), ('rock_medium_tan', 14),
         ('stump_small', 16), ('log_hollow_horizontal', 8), ('log_hollow_vertical', 5)]
for name, n in SMALL:
    scatter(BC, name, n, (0, CLIFF[1] + 1, 92, RIDGE[0] - 1))

# ------------------------------------------------------------------ graveyard (south-west)
gx0, gy0, gx1, gy1 = GRAVEYARD[0], GRAVEYARD[1] + 1, GRAVEYARD[2], GRAVEYARD[3]
fence_rect(gx0, gy0, gx1, gy1, kind='iron', gate={(CRYPT_STAIRS_X, gy0), (CRYPT_STAIRS_X + 1, gy0), (CRYPT_STAIRS_X, gy1), (CRYPT_STAIRS_X + 1, gy1)})
GRAVES = [(LPC_M, 'gravestone_cross_slab'), (LPC_M, 'gravestone_rip_plaque'), (LPC_M, 'gravestone_cross_plain'),
          (LPC_M, 'gravestone_cross_arched'), (LPC_M, 'gravestone_plaque_pedestal'), (LPC_T, 'gravestone_cross'), (LPC_T, 'gravestone_tablet')]
for x in range(gx0 + 2, gx1 - 1, 3):
    for y in (gy0 + 2, gy0 + 6):
        if abs(x - CRYPT_STAIRS_X) <= 2:
            continue
        sheet, name = rng.choice(GRAVES)
        try_put(sheet, name, x, y, grounds=('grass',))
put(LPC_M, 'grave_plot_headstone_cross', 28, 66)
put(LPC_M, 'gravestone_triple_cross', 39, 66)
for x, y in [(25, 58), (43, 61), (24, 68)]:
    try_put(BC, 'tree_bare_branches', x, y)

# ------------------------------------------------------------------ badlands (south-east)
scatter(LPC_T, ['upright_boulder_gray_a', 'upright_boulder_gray_b', 'rock_pair_cluster_a', 'rock_mound_ridge'], 30, (84, 58, 126, 70), grounds=('grass', 'sand'), margin=1)
scatter(BC, ['rock_medium_tan', 'rock_small_tan', 'tree_bare_branches'], 26, (84, 58, 126, 70), grounds=('grass', 'sand'))

# ------------------------------------------------------------------ the ridge: rock mass between overworld and underground
# Pixel Crawler cave rock outline pieces (32px each): top edge, fill, bottom edge, then the cliff face into the dark.
RIDGE_ROWS = {RIDGE[0]: 'cave_wall_outline_n', RIDGE[0] + 1: 'cave_wall_outline_ceiling_dark',
              RIDGE[0] + 2: 'cave_wall_outline_s', RIDGE[0] + 3: 'cave_wall_face_middle'}
passages = {CRYPT_STAIRS_X, CRYPT_STAIRS_X + 1} | {CAVE_X, CAVE_X + 1, CAVE_X + 2}
for y, name in RIDGE_ROWS.items():
    for x in range(W):
        if x in passages:
            continue
        n = name
        if x + 1 in passages:
            n = {'cave_wall_outline_n': 'cave_wall_outline_ne', 'cave_wall_outline_ceiling_dark': 'cave_wall_outline_e',
                 'cave_wall_outline_s': 'cave_wall_outline_se', 'cave_wall_face_middle': 'cave_wall_face_e'}[name]
        elif x - 1 in passages:
            n = {'cave_wall_outline_n': 'cave_wall_outline_nw', 'cave_wall_outline_ceiling_dark': 'cave_wall_outline_w',
                 'cave_wall_outline_s': 'cave_wall_outline_sw', 'cave_wall_face_middle': 'cave_wall_face_w'}[name]
        put(PC_C, n, x, y)
# the cave mouth fills its gap in the ridge (3 x 4 tiles at scale 2)
put(PC_C, 'cave_entrance_rock', CAVE_X, RIDGE[0], scale=2)

# ------------------------------------------------------------------ underground: crypt (dungeon rooms)
floor = [[False] * W for _ in range(H)]
fstyle = {}


def carve(x0, y0, x1, y1, style):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if inside(x, y):
                floor[y][x] = True
                fstyle[(x, y)] = style


# crypt: stairs down from the graveyard into a corridor through the ridge
carve(CRYPT_STAIRS_X, RIDGE[0], CRYPT_STAIRS_X + 1, 82, 'crypt')
carve(22, 83, 40, 91, 'crypt')        # great crypt hall
carve(4, 80, 16, 88, 'crypt')         # ossuary
carve(17, 84, 21, 85, 'crypt')        # hall -> ossuary
carve(6, 89, 7, 95, 'crypt')          # down to the sealed vault
carve(4, 94, 16, 98, 'crypt')         # sealed vault
carve(41, 87, 50, 88, 'crypt')        # the crypt wall broke into the caves
# cavern: organic blobs from the cave mouth westwards
def blob(cx, cy, rx, ry, style='cave'):
    for y in range(int(cy - ry - 1), int(cy + ry + 2)):
        for x in range(int(cx - rx - 1), int(cx + rx + 2)):
            wob = 1 + 0.18 * math.sin(x * 1.7 + y) + 0.12 * math.cos(y * 2.3 - x)
            if inside(x, y) and ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= wob:
                if y >= UNDER:
                    carve(x, y, x, y, style)


carve(CAVE_X, RIDGE[0] + 3, CAVE_X + 2, 79, 'cave')
for cx, cy, rx, ry in [(104, 84, 9, 5), (88, 88, 8, 6), (72, 86, 7, 5), (58, 90, 7, 4.5), (116, 92, 7, 4.5), (97, 95, 6, 3)]:
    blob(cx, cy, rx, ry)
for i in range(60):   # tunnels between blobs
    t = i / 60
    for (ax, ay), (bx, by) in [((104, 84), (88, 88)), ((88, 88), (72, 86)), ((72, 86), (58, 90)), ((104, 84), (116, 92)), ((88, 88), (97, 95))]:
        x, y = ax + (bx - ax) * t, ay + (by - ay) * t
        for dx in (0, 1):
            for dy in (0, 1):
                if inside(int(x) + dx, int(y) + dy) and int(y) + dy >= UNDER:
                    carve(int(x) + dx, int(y) + dy, int(x) + dx, int(y) + dy, 'cave')


def is_floor(x, y, style=None):
    return inside(x, y) and floor[y][x] and (style is None or fstyle[(x, y)] == style)


for y in range(H):
    for x in range(W):
        if floor[y][x]:
            ground[y][x] = fstyle[(x, y)]

# crypt floors + walls (Pixel Crawler dungeon tiles, 16px at scale 2)
def dt(name, x, y, **kw):
    return put(PC_D, name, x, y, scale=2, **kw)


for y in range(H):
    for x in range(W):
        if not is_floor(x, y, 'crypt') or (x in (CRYPT_STAIRS_X, CRYPT_STAIRS_X + 1) and y <= RIDGE[1]):
            continue
        n, s, w, e = is_floor(x, y - 1), is_floor(x, y + 1), is_floor(x - 1, y), is_floor(x + 1, y)
        v = 'n' if not n else 's' if not s else ''
        h = 'w' if not w else 'e' if not e else ''
        if not w and not e:
            h = ''
        name = f'teal_flagstone_floor_{v}{h}' if (v or h) else rng.choice(['teal_flagstone_floor_center'] * 12 + ['teal_flagstone_floor_lighter', 'teal_flagstone_floor_darker', 'teal_flagstone_floor_plain_k'])
        dt(name, x, y, mark=False)
# crypt stairs going down through the ridge gap
dt('stairs_dungeon_brick_nw', CRYPT_STAIRS_X, RIDGE[0], mark=False); dt('stairs_dungeon_brick_ne', CRYPT_STAIRS_X + 1, RIDGE[0], mark=False)
dt('stairs_dungeon_brick_sw', CRYPT_STAIRS_X, RIDGE[0] + 1, mark=False); dt('stairs_dungeon_brick_se', CRYPT_STAIRS_X + 1, RIDGE[0] + 1, mark=False)
for y in range(RIDGE[0] + 2, RIDGE[1] + 1):
    for x in (CRYPT_STAIRS_X, CRYPT_STAIRS_X + 1):
        dt('teal_flagstone_floor_center', x, y, mark=False)

TRIMS = ['dungeon_wall_top_blue_stone_trim_a', 'dungeon_wall_top_blue_stone_trim_b', 'dungeon_wall_top_blue_stone_trim_c']
UPPER = ['dungeon_brick_wall_face_upper_left', 'dungeon_brick_wall_face_upper_middle', 'dungeon_brick_wall_face_upper_right']
LOWER = ['dungeon_brick_wall_face_lower_left', 'dungeon_brick_wall_face_lower_middle', 'dungeon_brick_wall_face_lower_right']
crypt_wall = {}
for y in range(UNDER, H):
    for x in range(0, 52):
        if floor[y][x] or ground[y][x] in ('ridge',):
            continue
        cf = lambda xx, yy: is_floor(xx, yy, 'crypt')
        if cf(x, y + 1):
            role = 'lower'
        elif cf(x, y + 2) and not floor[y + 1][x] if inside(x, y + 1) else False:
            role = 'upper'
        elif inside(x, y + 3) and cf(x, y + 3) and not floor[y + 1][x] and not floor[y + 2][x]:
            role = 'trim'
        elif cf(x + 1, y):
            role = 'bar_w'
        elif cf(x - 1, y):
            role = 'bar_e'
        elif cf(x, y - 1):
            role = 'edge_s'
        else:
            continue
        crypt_wall[(x, y)] = role
for (x, y), role in crypt_wall.items():
    i = rng.randrange(3)
    dt({'lower': LOWER[i], 'upper': UPPER[i], 'trim': TRIMS[i],
        'bar_w': 'dungeon_wall_top_blue_stone_trim_external_w', 'bar_e': 'dungeon_wall_top_blue_stone_trim_external_e',
        'edge_s': 'dungeon_wall_top_blue_stone_trim_n'}[role], x, y)
# crypt dressing
for x in (25, 37):
    if crypt_wall.get((x, 81)) in ('lower', 'upper'):
        dt('wall_lamp_blue', x, 81)
for x in (26, 30, 34):
    for y in (86, 89):
        dt('wood_pillar', x, y)
dt('banner_red_long', 31, 80)
for x, y in [(8, 83), (12, 85), (10, 81), (14, 87)]:
    put(LPC_I, rng.choice(['lpc_bones_pair_a', 'lpc_bones_pair_b', 'lpc_bones_pair_c', 'lpc_bones_pair_d']), x, y, mark=False)
for x in (5, 8, 11, 14):
    dt(rng.choice(['teal_flagstone_floor_blood_stain_a', 'teal_flagstone_floor_blood_stain_c', 'teal_flagstone_floor_blood_stain_e']), x, 96, mark=False)
dt('gate_iron_arched', 6, 90)
for x in (24, 38):
    for y in (90,):
        dt('spike_trap', x, y, mark=False)

# ------------------------------------------------------------------ cavern floor + rock walls
CAVE_FLOOR = ['coal_rubble_fill_e'] * 10 + ['dark_cobble_fill_b', 'coal_rubble_fill_e']
for y in range(UNDER, H):
    for x in range(W):
        if is_floor(x, y, 'cave'):
            put(LPC_T, rng.choice(CAVE_FLOOR), x, y, mark=False)
for y in range(UNDER - 1, H):
    for x in range(52, W):
        if floor[y][x] if inside(x, y) else True:
            continue
        if ground[y][x] == 'ridge':
            continue
        cf = lambda xx, yy: is_floor(xx, yy, 'cave')
        if cf(x, y + 1):
            name = 'cave_wall_face_middle' if cf(x - 1, y + 1) and cf(x + 1, y + 1) else 'cave_wall_face_w' if not cf(x - 1, y + 1) else 'cave_wall_face_e'
        elif cf(x, y + 2):
            name = 'cave_wall_outline_s'
        else:
            n, w, e = cf(x, y - 1), cf(x - 1, y), cf(x + 1, y)
            if n and w:
                name = 'cave_wall_outline_nw'
            elif n and e:
                name = 'cave_wall_outline_ne'
            elif n:
                name = 'cave_wall_outline_n'
            elif w:
                name = 'cave_wall_outline_e'
            elif e:
                name = 'cave_wall_outline_w'
            elif any(cf(x + dx, y + dy) for dx in (-1, 1) for dy in (-1, 1)):
                name = 'cave_wall_outline_ceiling_dark'
            else:
                continue
        put(PC_C, name, x, y)
# cavern dressing (16px art at scale 2)
def pcc(name, x, y, **kw):
    wt, ht = sm.size_tiles(PC_C, name, 2)
    if free(x, y, wt, ht, grounds=('cave',)):
        put(PC_C, name, x, y, scale=2, **kw)
        return True
    return False


ORES = ['ore_copper', 'ore_iron', 'ore_gold', 'ore_gem_blue', 'coal_lump']
for _ in range(400):
    x, y = rng.randrange(52, W), rng.randrange(UNDER, H)
    # ore veins sit against the rock
    if is_floor(x, y, 'cave') and not is_floor(x, y - 1, 'cave'):
        pcc(rng.choice(ORES), x, y)
scatter(PC_C, ['stalagmite_tall', 'boulder_grey_large', 'boulder_lava_veins', 'boulder_silver_veins', 'rock_grey_a', 'rock_flat_grey'], 36,
        (52, UNDER, W - 2, H - 2), grounds=('cave',), scale=2, margin=1)
scatter(PC_C, ['mushroom_blue_glow'], 26, (52, UNDER, W - 2, H - 2), grounds=('cave',), scale=2)
# gem pockets: clusters of blue gem ore
for cx, cy in [(84, 90), (92, 86), (60, 88), (114, 90), (70, 84)]:
    for _ in range(6):
        pcc('ore_gem_blue', cx + rng.randint(-2, 2), cy + rng.randint(-1, 1))
# rock-island pool (5x5 pieces at scale 2; its corners are open floor)
POOL = (97, 93)
for (px, py), name in {(0, 0): None, (1, 0): 'n_1', (2, 0): 'n_2', (3, 0): 'n_3', (4, 0): None,
                       (0, 1): 'w_1', (1, 1): 'inner_nw', (2, 1): 'inner_n', (3, 1): 'inner_ne', (4, 1): 'e_1',
                       (0, 2): 'w_2', (1, 2): 'inner_w', (2, 2): 'center', (3, 2): 'inner_e', (4, 2): 'e_2',
                       (0, 3): 'w_3', (1, 3): 'inner_sw', (2, 3): 'inner_s', (3, 3): 'inner_se', (4, 3): 'e_3',
                       (0, 4): None, (1, 4): 's_1', (2, 4): 's_2', (3, 4): 's_3', (4, 4): None}.items():
    if name and is_floor(POOL[0] + px, POOL[1] + py, 'cave'):
        put(PC_C, f'rock_island_water_{name}', POOL[0] + px, POOL[1] + py, scale=2)
# the old mine
pcc('mine_entrance_timber', 60, 87)

# ------------------------------------------------------------------ water sprites
water_items = []
for y in range(H):
    for x in range(W):
        if water[y][x]:
            item = {'name': water_piece(x, y), 'x': x, 'y': y}
            if (x, y) not in bridge_cells and (x, y) not in pier_cells:
                item['blocking'] = True
            water_items.append(item)
            occupied[y][x] = True
for _ in range(16):
    x, y = int(rng.gauss(15, 4)), int(rng.gauss(58, 2.5))
    if all(is_water(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)) and (x, y) not in pier_cells:
        boot_items['decorations'].append({'name': 'lily_pad_green', 'x': x, 'y': y, 'depthOffset': 1})
boot_items['waterTiles'] = water_items

# ------------------------------------------------------------------ output
TILE_OF = {'path': 2, 'cobble': 3, 'void': 4, 'cave': 4, 'crypt': 4}
tiles = [[TILE_OF.get(ground[y][x], 0) for x in range(W)] for y in range(H)]
for x in range(W):
    tiles[RIDGE[1]][x] = 4   # the ridge face drops into the dark
PLAYER = (63, 52)


def arr(items):
    return '[\n' + ''.join(f'    {js_item(i)},\n' for i in items) + ']'


fields = '\n'.join(f'    {f}: WORLD_{f.upper()},' for f in BOOT_FIELDS.values())
consts = '\n\n'.join(f'const WORLD_{f.upper()} = {arr(items)};' for f, items in boot_items.items())
out = f'''// AUTO-GENERATED — "The Grand Tour (Test)": a 128x100 multi-region showcase
// map (snowy plateau, forest with river and lake, village, desert with oasis
// and ruins, graveyard, badlands, and underground a crypt and a cavern).
// Regenerate with tools/maps/gen_worldtest.py — don't hand-edit.
//
// Tile values: 0 = grass (BaseChip grass_green_light) under any ground
// sprite, 2 = dirt road, 3 = cobblestone, 4 = dark (underground void).

const TILES = {tiles_js(tiles)};

{consts}

const WORLD_EXTRA_SHEETS = {sm.extra_sheets_js()};

const WORLD_SHEET_DECORATIONS = {sm.sheet_decorations_js()};

export const WORLDTEST = {{
    id: 'worldtest',
    displayName: 'The Grand Tour (Test)',
    tiles: TILES,
    backgroundColor: '#07070a',
    lightTint: null,
    playerStart: {{ x: {PLAYER[0]}, y: {PLAYER[1]} }},
    tileset: {{
        key: 'tileset_base',
        floorFrame: 0,     // grass_green_light
        pathFrame: 5,      // dirt_brown
        streetFrame: 322,  // floor_cobblestone_gray
    }},
{fields}
    extraSheets: WORLD_EXTRA_SHEETS,
    sheetDecorations: WORLD_SHEET_DECORATIONS,
    portals: [],
    spawns: {{}},
    currencyBias: 'rural',
    music: 'forest',
    quests: [],
    chapterTitle: 'The Grand Tour',
}};
'''
MAP_OUT.write_text(out)
total = sm.count() + sum(len(v) for v in boot_items.values())
print(f'wrote {MAP_OUT.relative_to(AMO)}: {W}x{H}, {total} sprites ({sm.count()} from {len({s for s, _ in sm.groups})} extra sheets)')
