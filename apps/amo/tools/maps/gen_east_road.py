#!/usr/bin/env python3
"""
Generates src/data/maps/regions/east_road.js — the Thalorian Wilds (W6), 192x160:
the East Road from Thaloria's East Gate (west) to the climb to the Summit of Despair
(east), through forest wilds you can get lost in (tools/maps/east_road_layout.py).

  the road     2 wide, west to east; the old waystone beside it
  north        a path up the Monolith Rise (the first Rift-Gate node)
  south-west   the birch copse and its old campfire (the book's third night: wolflike
               things gather round the fire after dark)
  south        the Sentinel's clearing (the optional miniboss); the broken watchtower
  south-east   the Still Pool, whose stream runs east to the edge — hop it, or cross
               at the ford on the way to the Hollow, a cave (an interior)
  east         the shepherd's lean-to where Oren falls in beside you

Sources: map spec data/lore/campaigns/eldorias_prophecy/thaloria_and_east_road.md;
the book ch04-05; bestiary.md (Void-Stalker, Blight-Ent, Root-Wraith). Game-only
place names are listed in the W6 plan for the user's DB sync.

Deterministic. Order: tools/maps/gen_interiors.py first (doors.json).
Preview: python3 tools/maps/render_map_preview.py east_road out.png --shrink 6
Run from apps/amo/: python3 tools/maps/gen_east_road.py
"""
import json
import math
import random
import sys
from collections import deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, AMO  # noqa: E402
from region_writer import write_region  # noqa: E402
import east_road_layout as L  # noqa: E402
import thaloria_layout as TL  # noqa: E402

OUT = AMO / 'src/data/maps/regions/east_road.js'
DOORS = json.loads((AMO / 'src/data/maps/interiors/doors.json').read_text()).get('east_road', [])
W, H = L.W, L.H
rng = random.Random(501)
sm = SheetMap()
BC = 'SampleMap/[Base]BaseChip_pipo'
WATER = 'SampleMap/[A]Water_pipo'
LPC_BU = 'lpc/build_atlas'
CABIN = 'snowy_asset_pack_nyx/decoration_log_cabin'

tiles = [[0] * W for _ in range(H)]
water, stream, occupied = set(), set(), set()


def inside(x, y):
    return 0 <= x < W and 0 <= y < H


def path(points, width):
    """Straight legs through the points: horizontal on the first point's row, then vertical."""
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for d in range(width):
                if inside(x, y0 + d):
                    tiles[y0 + d][x] = 2
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for d in range(width):
                if inside(x1 + d, y):
                    tiles[y][x1 + d] = 2


path(L.ROAD, 2)
for pts in L.SIDE_PATHS:
    path(pts, 1)

# ------------------------------------------------------------------ the Still Pool and its stream
cx, cy, r = L.LAKE
for y in range(cy - r - 2, cy + r + 3):
    for x in range(cx - r - 2, cx + r + 3):
        if math.hypot(x - cx, (y - cy) * 1.2) < r + math.sin(x * 0.9 + y * 0.7):
            water.add((x, y))
for (x0, y0), (x1, y1) in zip(L.STREAM, L.STREAM[1:]):
    stream.update((x, y0) for x in range(min(x0, x1), max(x0, x1) + 1))
    stream.update((x1, y) for y in range(min(y0, y1), max(y0, y1) + 1))
stream -= set(L.FORD) | water
water |= stream
for x, y in L.FORD:
    tiles[y][x] = 2

keep_open = set()
for x0, y0, x1, y1 in L.CLEARINGS:                # ragged ovals in their rects, never hard-edged boxes
    cxo, cyo, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 0.5, (y1 - y0) / 2 + 0.5
    for y in range(y0 - 2, y1 + 3):
        for x in range(x0 - 2, x1 + 3):
            ang = math.atan2(y - cyo, x - cxo)
            edge = 1.0 + 0.16 * math.sin(3 * ang + x0 * 0.7) + 0.1 * math.sin(5 * ang + y0)
            if ((x - cxo) / rx) ** 2 + ((y - cyo) / ry) ** 2 <= edge ** 2:
                keep_open.add((x, y))
keep_open.update((x + dx, y + dy) for x, y in water for dx in (-1, 0, 1) for dy in (-1, 0, 1))

# ------------------------------------------------------------------ the forest: trees by noise, thinner by the paths
dist = [[99] * W for _ in range(H)]                 # tiles from the nearest path (up to 12)
q = deque()
for y in range(H):
    for x in range(W):
        if tiles[y][x] == 2:
            dist[y][x] = 0
            q.append((x, y))
while q:
    x, y = q.popleft()
    if dist[y][x] >= 12:
        continue
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if inside(nx, ny) and dist[ny][nx] > dist[y][x] + 1:
            dist[ny][nx] = dist[y][x] + 1
            q.append((nx, ny))


def noise(x, y):
    return (math.sin(x * 0.07) + math.sin(y * 0.09) + math.sin((x + y) * 0.04) + math.sin((x - y) * 0.06)) / 4


for y in range(H):
    for x in range(W):
        verge = 1 + round(1.5 + 1.5 * math.sin(x * 0.31 + y * 0.23) * math.sin(x * 0.11 - y * 0.17))  # 1-4 tiles of bare verge
        if tiles[y][x] == 2 or (x, y) in keep_open or dist[y][x] <= verge:
            continue
        thinner = 0.35 * max(0.0, 1 - (dist[y][x] - 3) / 6)   # the forest thickens gradually away from a path
        if noise(x, y) + rng.uniform(-0.3, 0.3) > L.TREE_THRESHOLD + thinner:
            tiles[y][x] = 1
for x in range(W):
    tiles[0][x] = tiles[H - 1][x] = 1
for y in range(H):
    tiles[y][0] = tiles[y][W - 1] = 1
for y in (L.WEST_Y, L.WEST_Y + 1):
    tiles[y][0] = 2
for y in (L.EAST_Y, L.EAST_Y + 1):
    tiles[y][W - 1] = 2
dense = [(x, y) for y in range(H) for x in range(W) if noise(x, y) > L.DENSE_NOISE and dist[y][x] > 5]

# ------------------------------------------------------------------ water pieces (shore from the neighbours)
WATER_NAMES = set(sm.catalogue(WATER)[1])


def is_water(x, y):
    if not inside(x, y):                            # the stream runs on past the east edge
        return (min(max(x, 0), W - 1), min(max(y, 0), H - 1)) in water
    return (x, y) in water


def water_piece(x, y):
    n, s, e, w = is_water(x, y - 1), is_water(x, y + 1), is_water(x + 1, y), is_water(x - 1, y)
    missing = ''.join(d for d, v in (('n', n), ('s', s), ('e', e), ('w', w)) if not v)
    table = {'': None, 'n': 'edge_n', 's': 'edge_s', 'e': 'edge_e', 'w': 'edge_w',
             'nw': 'corner_nw', 'ne': 'corner_ne', 'sw': 'corner_sw', 'se': 'corner_se',
             'ns': 'channel_h_middle', 'ew': 'channel_v_middle',
             'nsw': 'channel_h_left', 'nse': 'channel_h_right',
             'new': 'channel_v_top', 'sew': 'channel_v_bottom', 'nsew': 'island'}
    role = table[missing]
    if role is None:
        for d, (dx, dy) in (('ne', (1, -1)), ('nw', (-1, -1)), ('se', (1, 1)), ('sw', (-1, 1))):
            if not is_water(x + dx, y + dy):
                role = f'inner_corner_{d}'
                break
        else:
            role = 'fill'
    name = f'water1_{role}'
    assert name in WATER_NAMES, name
    return name


for x, y in sorted(water):
    sm.add(WATER, water_piece(x, y), x, y, blocking=True, hoppable=(x, y) in stream)   # 'under': above the floor, below everything else
    occupied.add((x, y))


# ------------------------------------------------------------------ props
def put(sheet, name, x, y, **extra):
    sm.entry(sheet, name)
    sm.add(sheet, name, x, y, **extra)
    wt, ht = sm.size_tiles(sheet, name)
    occupied.update((x + dx, y + dy) for dx in range(wt) for dy in range(ht))


def try_put(sheet, name, x, y, **extra):
    wt, ht = sm.size_tiles(sheet, name)
    cells = [(x + dx, y + dy) for dx in range(wt) for dy in range(ht)]
    if all(inside(a, b) and tiles[b][a] == 0 and (a, b) not in occupied for a, b in cells):
        put(sheet, name, x, y, **extra)
        return True
    return False


def reserve(x, y, r=1):
    occupied.update((x + dx, y + dy) for dx in range(-r, r + 1) for dy in range(-r, r + 1))


S = L.SPOTS
fx, fy = S['copse_fire']
AMBUSH = [(fx - 3, fy - 2), (fx + 3, fy - 2), (fx, fy + 4)]       # night stalkers round the copse fire
for x, y in [*S.values(), L.WEST_ARRIVAL, L.EAST_ARRIVAL, *AMBUSH]:
    reserve(x, y, 1)
cdx, cdy = L.CAVE_DOOR
reserve(cdx, cdy + 1, 0)

# the Hollow's mouth: a dark arch (the door is its lower tile) in a heap of boulders
put(BC, 'archway_dark_silhouette', cdx, cdy - 1, blocking=False)
for x, y in [(cdx - 2, cdy - 1), (cdx - 1, cdy - 2), (cdx + 1, cdy - 2), (cdx + 2, cdy - 1)]:
    try_put(BC, 'rock_medium_tan', x, y)
# the shepherd's lean-to, a small abandoned cabin
put(CABIN, 'decoration_log_cabin', 172, 30)
# the waystone's stones; the Monolith Rise's ring of stones
for x, y in [(50, 70), (54, 70)]:
    try_put(BC, 'rock_medium_tan', x, y)
gx, gy = S['gate']
for x, y in [(gx - 3, gy - 2), (gx + 3, gy - 2), (gx - 4, gy + 1), (gx + 4, gy + 1)]:
    try_put(BC, 'rock_medium_tan', x, y)
# the Sentinel's clearing: old guardian statues
sx, sy = S['sentinel']
put(BC, 'gargoyle_statue_gray', sx - 5, sy - 4)
put(BC, 'gargoyle_statue_gray', sx + 5, sy - 4)
# the broken watchtower: a ring of fallen wall, open to the path from the north
for x in range(80, 91):
    for y in (120, 128):
        if not (y == 120 and 83 <= x <= 86) and rng.random() < 0.7:
            put(BC, 'wall_stone_circular_gray', x, y, blocking=True)
for y in range(121, 128):
    for x in (80, 90):
        if rng.random() < 0.7:
            put(BC, 'wall_stone_circular_gray', x, y, blocking=True)
for x, y in [(82, 122), (88, 122)]:
    try_put(BC, 'gargoyle_statue_gray', x, y)
for x, y in [(81, 125), (89, 125)]:
    try_put(BC, 'pillar_marble_fluted', x, y)
# a cart left by the road outside the city
try_put(LPC_BU, 'wood_cart_hay_pitchfork', 6, 76)
# the birch copse
copse = L.CLEARINGS[2]
placed = 0
for _ in range(4000):
    if placed >= 45:
        break
    if try_put(BC, rng.choice(['tree_bare_branches', 'tree_dead_bare_green']), rng.randint(copse[0], copse[2]), rng.randint(copse[1], copse[3])):
        placed += 1
# the forest floor
FLOOR = ['bush_round_green_light', 'flower_white_cluster', 'rocks_pebbles_pair', 'rock_small_tan', 'stump_small',
         'tree_bare_branches', 'tree_bush_green_dark']
for _ in range(9000):
    try_put(BC, rng.choice(FLOOR), rng.randrange(1, W - 1), rng.randrange(1, H - 1))

# ------------------------------------------------------------------ everything Chapter 3 needs is on foot from the west
reach, q = {L.WEST_ARRIVAL}, deque([L.WEST_ARRIVAL])
while q:
    x, y = q.popleft()
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if inside(nx, ny) and (nx, ny) not in reach and tiles[ny][nx] != 1 and (nx, ny) not in water:
            reach.add((nx, ny))
            q.append((nx, ny))
for name, (x, y) in [*S.items(), ('the east exit', L.EAST_ARRIVAL), ('the Hollow', (cdx, cdy + 1))]:
    if not any(c in reach for c in ((x, y), (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
        raise SystemExit(f'{name} at {x},{y} is cut off from the west entry')


def pick(cands, n, gap):
    cands = sorted(cands)
    rng.shuffle(cands)
    out = []
    for c in cands:
        if all(abs(c[0] - o[0]) + abs(c[1] - o[1]) >= gap for o in out):
            out.append(c)
            if len(out) == n:
                break
    return out


open_cells = [(x, y) for (x, y) in reach if tiles[y][x] == 0 and (x, y) not in occupied]
far = lambda c, p, d: abs(c[0] - p[0]) + abs(c[1] - p[1]) > d  # noqa: E731
safe = [c for c in open_cells if far(c, L.WEST_ARRIVAL, 18) and far(c, S['oren'], 12) and far(c, L.EAST_ARRIVAL, 10)]

# ------------------------------------------------------------------ creatures: the Chapter 3 mix, scaled to the area
enemies = []
for kind, count, lo, hi in [('void_stalker', 14, 0, 6), ('root_wraith', 12, 4, 12), ('blight_ent', 8, 6, 99)]:
    for x, y in pick([c for c in safe if lo <= dist[c[1]][c[0]] <= hi], count, 10):
        enemies.append({'x': x, 'y': y, 'type': kind})
for x, y in pick([c for c in safe if dist[c[1]][c[0]] <= 3], 5, 20):
    enemies.append({'x': x, 'y': y, 'type': 'void_stalker', 'time': 'night'})
for x, y in AMBUSH:
    enemies.append({'x': x, 'y': y, 'type': 'void_stalker', 'time': 'night'})
enemies.append({'x': sx, 'y': sy, 'type': 'corrupted_sentinel'})

# ------------------------------------------------------------------ gathering
taken = {(e['x'], e['y']) for e in enemies}


def near(centre, n, r):
    return pick([c for c in open_cells if c not in taken and abs(c[0] - centre[0]) <= r and abs(c[1] - centre[1]) <= r], n, 3)


nodes = ([{'x': x, 'y': y, 'type': 'wood'} for x, y in near(S['copse_fire'], 3, 10) + near((100, 70), 3, 12)]
         + [{'x': x, 'y': y, 'type': 'mineral'} for x, y in near(S['page2'], 2, 9) + near((cdx, cdy), 2, 8)]
         + [{'x': x, 'y': y, 'type': 'herb'} for x, y in near(S['waystone'], 2, 8)]
         + [{'x': x, 'y': y, 'type': 'herb', 'yields': 'meadow_herbs'} for x, y in near(S['page3'], 2, 8)])

# ------------------------------------------------------------------ output
px = lambda t: t * 32 + 16  # noqa: E731
write_region(
    OUT, id='east_road', tiles=tiles, sm=sm, dense_cells=dense,
    header='AUTO-GENERATED by tools/maps/gen_east_road.py — the Thalorian Wilds (W6, region format 1).',
    fields={
        'displayName': 'The Thalorian Wilds', 'biome': 'temperate', 'weather': {'clear': 5, 'rain': 2, 'snow': 3},
        'lightTint': None, 'layoutVersion': 2,
        'playerStart': {'x': L.WEST_ARRIVAL[0], 'y': L.WEST_ARRIVAL[1]},
        'tileset': {'key': 'tileset_base', 'floorFrame': 0, 'pathFrame': 5},
        'portals': [
            {'id': 'east_road_to_thaloria', 'x': 0, 'y': L.WEST_Y, 'label': 'Back through the East Gate to Thaloria',
             'targetMap': 'thaloria', 'targetX': px(TL.EAST_ARRIVAL[0]), 'targetY': px(TL.EAST_ARRIVAL[1])},
            {'id': 'east_road_to_summit', 'x': W - 1, 'y': L.EAST_Y, 'label': 'The climb to the Summit of Despair',
             'targetMap': 'summit_of_despair', 'targetX': px(8), 'targetY': px(18)},
        ],
        'spawns': {
            'enemies': enemies,
            'npcs': [{'x': S['oren'][0], 'y': S['oren'][1], 'id': 'oren', 'name': 'Oren', 'dialogue': 'oren_meeting',
                      'afterDialogue': 'oren_after', 'spriteKey': 'spr_merchant', 'animProfile': 'lpc_universal', 'tint': 0xaabbcc}],
            'chests': [
                {'x': S['page1'][0], 'y': S['page1'][1], 'items': ['scattered_journal_page']},
                {'x': S['page2'][0], 'y': S['page2'][1], 'items': ['scattered_journal_page', 'forest_herb']},
                {'x': S['page3'][0], 'y': S['page3'][1], 'items': ['scattered_journal_page']},
            ],
            'campfires': [{'x': fx, 'y': fy}, {'x': S['leanto_fire'][0], 'y': S['leanto_fire'][1]}],
            'signs': [
                {'x': S['waystone'][0], 'y': S['waystone'][1], 'id': 'waystone_anchor',
                 'text': "An old waystone. Fresh chalk under the frost, in a neat and patient hand:\n\n'The Anchor — not here. East.'\n\nSomeone is asking the question you carry, one village at a time."},
                {'x': S['leanto_sign'][0], 'y': S['leanto_sign'][1], 'id': 'shepherds_lean_to',
                 'text': "A shepherd's lean-to, long abandoned, its roof patched with birch-bark and its hearth ringed with the ash of a hundred cold fires. The wind has a sound in the pass ahead."},
            ],
            'gatheringNodes': nodes, 'crackedBoulders': [],
            'landmarks': L.LANDMARKS,
            'riftGates': [{'x': gx, 'y': gy, 'id': 'gate_east_road', 'label': 'East Road Monolith'}],
            'doors': DOORS,
            'pillarGates': [], 'boss': None,
        },
        'levelBand': {'min': 2, 'max': 4}, 'currencyBias': 'rural', 'music': 'forest',
        'quests': [], 'chapterTitle': None, 'introDialogue': None, 'introRegistryKey': None,
    },
)
open_share = sum(row.count(0) + row.count(2) for row in tiles) / (W * H)
print(f'wrote {OUT.relative_to(AMO)}: {W}x{H}, {sm.count()} sprites, {len(enemies)} creatures, '
      f'{round(open_share * 100)}% open, {len(dense)} dense tiles, {len(water)} water ({len(stream)} stream)')
