#!/usr/bin/env python3
"""
Generates src/data/maps/forestest.js — "The Forestest", a test forest map built
only from the Pipoya set: a winding river coming in from the north, a lake,
a stream leaving it to the east, a dirt path from the west edge across a
rope bridge to a campsite clearing and a lake pier, a dense tree border with
groves inside, and bushes / flowers / mushrooms / stumps / logs / rocks
scattered around. Water is [A]Water_pipo "water1" pieces chosen per tile from
its neighbours (edges, corners, inner corners); everything else is BaseChip.

Deterministic (fixed seed): rerunning gives the same map. Tweak the layout
constants below and rerun.

Run from apps/amo/: python3 tools/maps/gen_forestest.py
"""
from pathlib import Path
import json
import math
import random

REPO_ROOT = Path(__file__).resolve().parents[2]
MAP_OUT = REPO_ROOT / 'src/data/maps/forestest.js'
CAT = REPO_ROOT / 'public/assets/catalogued/tilesets/SampleMap'

W, H = 64, 48
SEED = 7
TILE = 32

rng = random.Random(SEED)
basechip = {e['name']: e for e in json.loads((CAT / '[Base]BaseChip_pipo.catalogue.json').read_text())['entries']}
water_names = {e['name'] for e in json.loads((CAT / '[A]Water_pipo.catalogue.json').read_text())['entries']}


def size_tiles(name):
    e = basechip[name]
    return -(-e['w'] // TILE), -(-e['h'] // TILE)


# ---------------------------------------------------------------- water mask
water = [[False] * W for _ in range(H)]


def disc(cx, cy, r):
    for y in range(max(0, int(cy - r - 1)), min(H, int(cy + r + 2))):
        for x in range(max(0, int(cx - r - 1)), min(W, int(cx + r + 2))):
            if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r:
                water[y][x] = True


LAKE = (40, 31, 9.5, 6.5)  # cx, cy, rx, ry
lx, ly, rx, ry = LAKE
for y in range(H):
    for x in range(W):
        if ((x + 0.5 - lx) / rx) ** 2 + ((y + 0.5 - ly) / ry) ** 2 <= 1:
            water[y][x] = True
# river: north edge -> lake, gently winding, 3 tiles wide
for i in range(0, 300):
    t = i / 300
    y = -1 + t * (ly - ry + 3)
    x = 24 + 4 * math.sin(t * 3.2) + t * 10
    disc(x, y, 1.6)
# stream: lake -> east edge
for i in range(0, 200):
    t = i / 200
    x = lx + rx - 2 + t * (W - (lx + rx) + 3)
    y = ly - 1 + 2.5 * math.sin(t * 4)
    disc(x, y, 1.5)


def smooth(mask, rounds=2):
    """Drops water cells with fewer than 2 water neighbours and fills land
    cells with 3+ — keeps shores free of 1-tile spurs the piece set can't draw."""
    for _ in range(rounds):
        new = [row[:] for row in mask]
        for y in range(H):
            for x in range(W):
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                        if not (0 <= x + dx < W and 0 <= y + dy < H) or mask[y + dy][x + dx])
                if mask[y][x] and n < 2:
                    new[y][x] = False
                elif not mask[y][x] and n >= 3:
                    new[y][x] = True
        mask[:] = new


smooth(water)

# The rope bridge is 3 tiles wide: keep the river exactly 3 wide over a short
# straight stretch around the crossing so the bridge covers it fully.
CROSS_Y = 12
_cols = [x for x in range(35) if water[CROSS_Y][x]]
_x0 = _cols[0] if len(_cols) <= 3 else _cols[(len(_cols) - 3) // 2]
for _y in range(CROSS_Y - 3, CROSS_Y + 4):
    for _x in range(max(0, _x0 - 4), min(35, _x0 + 7)):
        water[_y][_x] = _x0 <= _x < _x0 + 3


def is_water(x, y):
    # the map edge counts as water so the river and stream run off-map
    if not (0 <= x < W and 0 <= y < H):
        return water[min(max(y, 0), H - 1)][min(max(x, 0), W - 1)]
    return water[y][x]


def water_piece(x, y):
    n, s, e, w = is_water(x, y - 1), is_water(x, y + 1), is_water(x + 1, y), is_water(x - 1, y)
    missing = ''.join(d for d, v in (('n', n), ('s', s), ('e', e), ('w', w)) if not v)
    table = {'': None, 'n': 'edge_n', 's': 'edge_s', 'e': 'edge_e', 'w': 'edge_w',
             'nw': 'corner_nw', 'ne': 'corner_ne', 'sw': 'corner_sw', 'se': 'corner_se',
             'ns': 'channel_h_middle', 'ew': 'channel_v_middle',
             'nsw': 'channel_h_left', 'nse': 'channel_h_right',
             'new': 'channel_v_top', 'sew': 'channel_v_bottom', 'nsew': 'island'}
    role = table[missing]
    if role is None:  # open water: land on a diagonal makes an inner corner
        for d, (dx, dy) in (('ne', (1, -1)), ('nw', (-1, -1)), ('se', (1, 1)), ('sw', (-1, 1))):
            if not is_water(x + dx, y + dy):
                role = f'inner_corner_{d}'
                break
        else:
            role = 'fill'
    name = f'water1_{role}'
    assert name in water_names, name
    return name


# ---------------------------------------------------------------- paths
tiles = [[0] * W for _ in range(H)]
occupied = [[False] * W for _ in range(H)]
PATH_Y = CROSS_Y
river_cols = [x for x in range(W) if water[PATH_Y][x]]
bridge_x0 = min(c for c in river_cols if c < 35)
bridge_x1 = max(c for c in river_cols if c < 35)


def path_tile(x, y):
    if 0 <= x < W and 0 <= y < H and not water[y][x]:
        tiles[y][x] = 2


# main path: west edge -> bridge -> east (the bridge itself carries it over the river)
PATH_END_X = W  # runs off the east edge, ready for a portal
for x in range(0, PATH_END_X):
    if bridge_x0 <= x <= bridge_x1:
        continue
    for dy in (0, 1):
        path_tile(x, PATH_Y + dy)
# branch north into the campsite clearing
CAMP = (42, 8)
for y in range(CAMP[1] + 1, PATH_Y):
    for dx in (0, 1):
        path_tile(CAMP[0] + 1 + dx, y)
# branch south along the river's east bank down to the lake pier
PIER_X = bridge_x1 + 4
lake_top = next(y for y in range(PATH_Y, H) if water[y][PIER_X] and water[y][PIER_X + 1])
for y in range(PATH_Y + 2, lake_top):
    for dx in (0, 1):
        path_tile(PIER_X + dx, y)

decorations = []


def place(name, x, y, blocking=False, depth_offset=None, mark=True):
    wt, ht = size_tiles(name)
    d = {'name': name, 'x': x, 'y': y}
    if blocking:
        d['blocking'] = True
    if depth_offset is not None:
        d['depthOffset'] = depth_offset
    decorations.append(d)
    if mark:
        for yy in range(y, y + ht):
            for xx in range(x, x + wt):
                if 0 <= xx < W and 0 <= yy < H:
                    occupied[yy][xx] = True


def free(x, y, wt, ht, margin=0):
    for yy in range(y - margin, y + ht + margin):
        for xx in range(x - margin, x + wt + margin):
            if not (0 <= xx < W and 0 <= yy < H):
                return False
            if occupied[yy][xx] or water[yy][xx] or tiles[yy][xx] == 2:
                return False
    return True


# bridge over the river (vertical planks, walked east-west): 3x3 tiles
bridge_w = bridge_x1 - bridge_x0 + 1
place('bridge_rope_wood_a', bridge_x0, PATH_Y - 1, depth_offset=None)
bridge_cells = {(xx, yy) for yy in range(PATH_Y - 1, PATH_Y + 2) for xx in range(bridge_x0, bridge_x0 + 3)}
# pier: 2x2 tiles, top row on the shore, bottom row over the water
pier_y = lake_top - 1
place('bridge_wood_plank', PIER_X, pier_y)
pier_cells = {(xx, yy) for yy in range(pier_y, pier_y + 2) for xx in range(PIER_X, PIER_X + 2)}

# campsite
for name, dx, dy, block in [('brazier_wood_tripod', 0, -3, True), ('stump_big', -2, -2, False),
                            ('stump_small', 3, -2, False), ('well_stone_basin', -4, 1, True),
                            ('woodpile_stacked', 5, 0, True), ('axe_and_log', 6, 0, False),
                            ('crate_wood_light', 5, 2, True), ('barrel_dark', 6, 2, True),
                            ('signpost_directional_multi', -1, 3, True)]:
    wt, ht = size_tiles(name)
    x, y = CAMP[0] + dx, CAMP[1] + dy
    if free(x, y, wt, ht):
        place(name, x, y, blocking=block)

# ---------------------------------------------------------------- trees
TREES = ['tree_bush_green_light', 'tree_bush_green_dark', 'tree_bush_green_dark', 'tree_bush_orange', 'tree_bare_branches']
# dense border
for y in range(-1, H, 2):
    for x in range(-1, W, 2):
        edge = min(x + 1, y + 1, W - 1 - x, H - 1 - y)
        if edge > 3:
            continue
        name = rng.choice(TREES[:3] if edge < 2 else TREES)
        xx, yy = x + rng.choice((0, 0, 1)), y + rng.choice((0, 0, 1))
        if free(max(0, xx), max(0, yy), 2, 2):
            place(name, max(0, xx), max(0, yy), blocking=True)
# groves: clustered trees around a few centres, away from water / paths
for cx, cy, n in [(10, 25, 22), (14, 38, 18), (54, 18, 18), (22, 34, 12), (54, 42, 12), (9, 6, 10), (50, 3, 8), (22, 22, 8), (36, 42, 10)]:
    for _ in range(n * 4):
        if n <= 0:
            break
        x = int(rng.gauss(cx, 4)); y = int(rng.gauss(cy, 3))
        if free(x, y, 2, 2, margin=0):
            place(rng.choice(TREES), x, y, blocking=True)
            n -= 1

# ---------------------------------------------------------------- small stuff
SCATTER = [('bush_round_green_light', 45, True), ('flower_white_cluster', 30, False), ('flower_pink_bush', 24, False),
           ('flower_sunflower', 8, False), ('mushroom_brown_cluster', 18, False), ('mushroom_pink_cluster', 8, False),
           ('rock_small_tan', 14, True), ('rock_medium_tan', 8, True), ('rocks_pebbles_pair', 10, False),
           ('stump_small', 8, True), ('stump_round_dark', 6, True), ('log_hollow_horizontal', 4, True),
           ('log_hollow_vertical', 3, True)]
for name, count, block in SCATTER:
    wt, ht = size_tiles(name)
    tries = 0
    while count > 0 and tries < 2000:
        tries += 1
        x, y = rng.randrange(1, W - wt - 1), rng.randrange(1, H - ht - 1)
        if free(x, y, wt, ht, margin=1 if block else 0):
            place(name, x, y, blocking=block)
            count -= 1
# flowers and rocks along the shores feel natural: a few extra next to water
for _ in range(40):
    x, y = rng.randrange(1, W - 1), rng.randrange(1, H - 1)
    near = any(is_water(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))
    if near and free(x, y, 1, 1):
        place(rng.choice(['flower_white_cluster', 'rocks_pebbles_pair', 'flower_pink_bush']), x, y)

# ---------------------------------------------------------------- water tiles
water_tiles = []
for y in range(H):
    for x in range(W):
        if water[y][x]:
            py = y * TILE + TILE // 2
            # flat on the ground: just above the floor layer, below everything standing on the map
            item = {'name': water_piece(x, y), 'x': x, 'y': y, 'depthOffset': 1 - py}
            if (x, y) not in bridge_cells and (x, y) not in pier_cells:
                item['blocking'] = True
            water_tiles.append(item)
# lily pads on open lake water
for _ in range(14):
    x = int(rng.gauss(lx, rx / 2)); y = int(rng.gauss(ly, ry / 2))
    if all(is_water(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)) and (x, y) not in pier_cells:
        decorations.append({'name': 'lily_pad_green', 'x': x, 'y': y, 'depthOffset': 2 - (y * TILE + TILE // 2)})
# bridges lie flat over the water, under the player
for d in decorations:
    if d['name'] in ('bridge_rope_wood_a', 'bridge_wood_plank'):
        e = basechip[d['name']]
        d['depthOffset'] = 3 - (d['y'] * TILE + e['h'] // 2)

start = (1, PATH_Y)


def js(items):
    return '[\n' + ''.join('    ' + json.dumps(i).replace('"name"', 'name').replace('"x"', 'x').replace('"y"', 'y')
                           .replace('"blocking"', 'blocking').replace('"depthOffset"', 'depthOffset') + ',\n' for i in items) + ']'


out = f'''// AUTO-GENERATED — "The Forestest": a test forest built only from the Pipoya
// set (BaseChip + [A]Water_pipo water1): winding river from the north, a lake,
// a stream out to the east, a dirt path from the west edge over a rope bridge
// to a campsite clearing and a lake pier, a dense tree border, groves, and
// bushes / flowers / mushrooms / stumps / logs / rocks. Regenerate with
// tools/maps/gen_forestest.py — don't hand-edit.
//
// Tile values: 0 = grass (BaseChip grass_green_light), 2 = dirt path
// (BaseChip dirt_brown). Water is placed tile by tile via waterTiles with the
// shore piece picked from each tile's neighbours; water blocks movement
// except under the bridge and the pier.

const TILES = [
{''.join('    [' + ','.join(map(str, r)) + '],' + chr(10) for r in tiles)}];

const FORESTEST_DECORATIONS = {js(decorations)};

const FORESTEST_WATER = {js(water_tiles)};

export const FORESTEST = {{
    id: 'forestest',
    displayName: 'The Forestest (Test)',
    tiles: TILES,
    lightTint: null,
    playerStart: {{ x: {start[0]}, y: {start[1]} }},
    tileset: {{
        key: 'tileset_base',
        floorFrame: 0,   // grass_green_light
        pathFrame: 5,    // dirt_brown
    }},
    decorations: FORESTEST_DECORATIONS,
    waterTiles: FORESTEST_WATER,
    portals: [],
    spawns: {{}},
    currencyBias: 'rural',
    music: 'forest',
    quests: [],
    chapterTitle: 'The Forestest',
}};
'''
MAP_OUT.write_text(out)
print(f'wrote {MAP_OUT.relative_to(REPO_ROOT)}: {W}x{H}, {len(decorations)} decorations, {len(water_tiles)} water tiles, bridge at x={bridge_x0}-{bridge_x1} (river {bridge_w} wide at the crossing)')
