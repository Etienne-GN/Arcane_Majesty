#!/usr/bin/env python3
"""
Generates src/data/maps/regions/thaloria.js — Thaloria, the scholar-city (W6): a
128x112 walled city of five districts (see tools/maps/thaloria_layout.py) — and
src/data/townsfolk/thaloria_places.js, the spots its people use (W4).

"A modest rebuilding-era settlement — practical, a little worn, not grand"
(map spec data/lore/campaigns/eldorias_prophecy/thaloria_and_east_road.md).
The book (ch04): "He left Thaloria by the East Gate at dawn, when the bell tower was
sounding its hour with the serene inaccuracy that had been its habit all his life."

Order: python3 tools/maps/gen_interiors.py (doors.json, places.json), then this,
then node tools/gen_walk_grids.mjs. Deterministic.
Preview: python3 tools/maps/render_map_preview.py thaloria out.png --shrink 4
Run from apps/amo/: python3 tools/maps/gen_thaloria.py
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, AMO  # noqa: E402
from region_writer import write_region  # noqa: E402
import thaloria_layout as L  # noqa: E402
import east_road_layout as ER  # noqa: E402

OUT = AMO / 'src/data/maps/regions/thaloria.js'
PLACES_OUT = AMO / 'src/data/townsfolk/thaloria_places.js'
INTERIORS = AMO / 'src/data/maps/interiors'
DOORS = json.loads((INTERIORS / 'doors.json').read_text()).get('thaloria', [])
ROOM_SLOTS = json.loads((INTERIORS / 'places.json').read_text())
EAST_ROAD_ARRIVAL = ER.WEST_ARRIVAL      # the Wilds' west entry, from the East Gate
W, H = L.W, L.H
rng = random.Random(503)
sm = SheetMap()
BC = 'SampleMap/[Base]BaseChip_pipo'
LPC_M = 'lpc/obj_misk_atlas'
MARKET = 'roleworld_wizard/exterior_asset'

ground = [['grass'] * W for _ in range(H)]
occupied = [[False] * W for _ in range(H)]


def inside(x, y):
    return 0 <= x < W and 0 <= y < H


def put(sheet, name, x, y, mark=True, **extra):
    sm.entry(sheet, name)
    sm.add(sheet, name, x, y, **extra)
    if mark:
        wt, ht = sm.size_tiles(sheet, name)
        for yy in range(y, y + ht):
            for xx in range(x, x + wt):
                if inside(xx, yy):
                    occupied[yy][xx] = True


def free(x, y, wt, ht, grounds=('grass',)):
    return all(inside(xx, yy) and not occupied[yy][xx] and ground[yy][xx] in grounds
               for yy in range(y, y + ht) for xx in range(x, x + wt))


def try_put(sheet, name, x, y, grounds=('grass',), **extra):
    wt, ht = sm.size_tiles(sheet, name)
    if free(x, y, wt, ht, grounds):
        put(sheet, name, x, y, **extra)
        return True
    return False


def fill(kind, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if inside(x, y):
                ground[y][x] = kind


def reserve(x0, y0, x1, y1):
    """Keep tiles free for spawns and people — nothing is drawn there."""
    for y in range(max(0, y0), min(H - 1, y1) + 1):
        for x in range(max(0, x0), min(W - 1, x1) + 1):
            occupied[y][x] = True


# ------------------------------------------------------------------ ground: edge forest, streets, square, yard
for x in range(W):
    for y in (0, 1, H - 2, H - 1):
        ground[y][x] = 'tree'
for y in range(H):
    for x in (0, 1, W - 2, W - 1):
        ground[y][x] = 'tree'
for rect in L.STREETS:
    fill('path', *rect)
fill('cobble', *L.SQUARE)
fill('cobble', *L.MARKET_YARD)

# ------------------------------------------------------------------ the city wall, with its two gates
X0, X1, Y0, Y1 = L.WALL
PILLAR_ROWS = (L.HIGH[0] - 2, L.HIGH[1] + 1)              # 1x2 pillars flank each gate
PILLAR_CELLS = {(x, y + d) for x in (X0, X0 + 1, X1 - 1, X1) for y in PILLAR_ROWS for d in (0, 1)}


def wall(x, y, name):
    if y in L.HIGH or (x, y) in PILLAR_CELLS:
        return
    ground[y][x] = 'grass'
    put(BC, name, x, y, blocking=True)


for x in range(X0, X1 + 1):
    wall(x, Y0, 'wall_stone_circular_gray')
    wall(x, Y0 + 1, 'wall_brick_lightgray')
    wall(x, Y1 - 1, 'wall_stone_circular_gray')
    wall(x, Y1, 'wall_brick_lightgray')
for y in range(Y0 + 2, Y1 - 1):
    for x in (X0, X0 + 1, X1 - 1, X1):
        wall(x, y, 'wall_stone_circular_gray')
for x in (X0, X0 + 1, X1 - 1, X1):
    for y in PILLAR_ROWS:
        put(BC, 'wall_graybrick_pillar_edge', x, y, blocking=True)

# ------------------------------------------------------------------ buildings (Pipoya kit)
ROOF = {'wood_brown': ('roof_fill_a', 'roof_shingle_wood_brown'), 'terracotta': ('roof_fill_b', 'roof_shingle_terracotta'),
        'brick_teal': ('roof_fill_c', 'roof_brick_teal'), 'scale_red': ('roof_fill_d', 'roof_scale_red'),
        'dome_gray': ('roof_fill_e', 'roof_dome_gray'), 'thatch_gold': ('roof_fill_g', 'roof_thatch_gold_dense')}
WALLS = {
    'plaster': ('wall_redbrick_a', 'wall_redbrick_mid', 'wall_redbrick_right'),
    'timber': ('wall_tan_wood_window_a', 'wall_tan_wood_window_mid', 'wall_tan_wood_window_right'),
    'stone': ('wall_graybrick_a', 'wall_graybrick_mid', 'wall_graybrick_right'),
    'white': ('wall_white_orangebase_a', 'wall_white_orangebase_mid', 'wall_white_orangebase_right'),
    'brick': ('wall_redbrick_pink_a', 'wall_redbrick_pink_mid', 'wall_redbrick_pink_right'),
}
DOOR_ART = ['door_wood_arch_a', 'door_wood', 'door_wood_brown_panel_a', 'door_wood_dark_paneled']
WINDOWS = ['window_brown_2pane', 'window_brown_4pane', 'window_curtained_gray']


def building(b):
    x0, wy, w, rr = b['x0'], b['wy'], b['w'], b['roof_rows']
    top, trans = ROOF[b['roof']]
    rows = [top, trans] + [f'roof_{b["roof"]}_lower_{"ab"[i % 2]}' for i in range(rr - 2)]
    for r, n in enumerate(rows):
        for x in range(x0, x0 + w):
            put(BC, n, x, wy - rr + r)
    left, mid, right = WALLS[b['walls']]
    for x in range(x0, x0 + w):
        put(BC, left if x == x0 else right if x == x0 + w - 1 else mid, x, wy)
    dx, dy = L.door_of(b)
    put(BC, b['door'] or rng.choice(DOOR_ART), dx, dy, mark=False)
    wins = b['windows'] or rng.choice(WINDOWS)
    for x in range(x0 + 1, x0 + w - 1):
        if abs(x - dx) >= 2 and (x - x0) % 2 == 1:
            put(BC, wins, x, wy, mark=False)
    for y in range(wy + 2, b['street']):
        if ground[y][dx] == 'grass':
            ground[y][dx] = 'path'
    reserve(dx, wy + 2, dx, wy + 2)


for b in L.BUILDINGS:
    building(b)
bell = next(b for b in L.BUILDINGS if b['id'] == 'bell_tower')
put(BC, 'bell_gold_hanging', bell['x0'] + 1, bell['wy'] - bell['roof_rows'], mark=False, blocking=False)
inn = next(b for b in L.BUILDINGS if b['id'] == 'inn')
put(BC, 'icon_inn_sign', inn['x0'] + inn['w'] - 2, inn['wy'] - 1, mark=False)

# ------------------------------------------------------------------ spots kept free (people, stations, the board)
for name, p in L.PLACES.items():
    if 'route' in p or p.get('interior'):
        continue
    if 'w' in p:
        reserve(p['x'], p['y'], p['x'] + p['w'] - 1, p['y'] + p['h'] - 1)
    else:
        reserve(p['x'], p['y'], p['x'], p['y'])
for s in L.STATIONS:
    reserve(s['x'] - 1, s['y'] - 2, s['x'] + 1, s['y'])
reserve(L.BOARD['x'] - 1, L.BOARD['y'] - 1, L.BOARD['x'] + 1, L.BOARD['y'])
for x, y in (L.EAST_ARRIVAL, L.WEST_ARRIVAL):
    reserve(x, y, x, y)

# ------------------------------------------------------------------ the square
put(BC, 'fountain_stone_round', 62, 47)
put(BC, 'signpost_directional_multi', 66, 51)
put(BC, 'well_stone_basin', 57, 58)
for x, y in [(54, 48), (73, 48), (54, 61), (73, 61)]:
    try_put(BC, 'knight_statue_gray', x, y, grounds=('cobble',))
for x, y in [(51, 43), (76, 43), (51, 64), (76, 64)]:
    try_put(LPC_M, 'street_lamp_lit', x, y, grounds=('cobble', 'path', 'grass'))

# ------------------------------------------------------------------ the market yard
for x in L.STALLS:
    put(MARKET, 'market_stall', x, 88)
for name, x, y in [('barrel_dark', 92, 86), ('crate_wood_light', 92, 92), ('crate_wood_light_open', 68, 92),
                   ('haybale_yellow', 76, 99), ('barrel_dark', 84, 99)]:
    try_put(BC, name, x, y, grounds=('cobble', 'grass', 'path'))

# ------------------------------------------------------------------ the gates: statues and lamps inside
for x in (9, 118):
    try_put(BC, 'knight_statue_gray', x, 51, grounds=('grass', 'path'))
    try_put(BC, 'knight_statue_gray', x, 57, grounds=('grass', 'path'))
for x in (7, 120):
    try_put(LPC_M, 'street_lamp_lit', x, 50, grounds=('grass', 'path'))

# ------------------------------------------------------------------ gardens: trees, bushes, flowers
TREES = ['tree_bush_green_light', 'tree_bush_green_dark']
SMALL = ['flower_white_cluster', 'flower_pink_bush', 'bush_round_green_light']
for _ in range(7000):
    x, y = rng.randrange(2, W - 2), rng.randrange(2, H - 2)
    if rng.random() < 0.3:
        try_put(BC, rng.choice(TREES), x, y)
    else:
        try_put(BC, rng.choice(SMALL), x, y)

# ------------------------------------------------------------------ townsfolk places (W4)
places = {}
for b in L.BUILDINGS:
    dx, dy = L.door_of(b)
    places[f"door_{b['id']}"] = {'x': dx, 'y': dy + 2, 'indoors': True}
for room_id, slots in sorted(ROOM_SLOTS.items()):
    if not room_id.startswith('thaloria_'):
        continue
    for key, (x, y) in slots.items():
        if key != 'entry':
            places[f'{room_id}__{key}'] = {'interior': room_id, 'x': x, 'y': y,
                                           'facing': 'down' if key in ('counter', 'smith', 'sergeant', 'desk') else 'up'}
places.update(L.PLACES)
PLACES_OUT.write_text(
    "// AUTO-GENERATED by tools/maps/gen_thaloria.py (W6) — do not edit. The spots Thaloria's\n"
    "// people use: door fronts (door_<building>; 'indoors' hides them), rooms' work spots\n"
    "// (<interior>__<slot>), stalls, posts, areas and patrols. The residents: thaloria.js.\n"
    f'export const THALORIA_PLACES = {json.dumps(places, indent=4)};\n')

# ------------------------------------------------------------------ output
TILE_OF = {'path': 2, 'cobble': 3, 'tree': 1}
tiles = [[TILE_OF.get(ground[y][x], 0) for x in range(W)] for y in range(H)]
px = lambda t: t * 32 + 16  # noqa: E731
write_region(
    OUT, id='thaloria', tiles=tiles, sm=sm,
    header='AUTO-GENERATED by tools/maps/gen_thaloria.py — Thaloria, the walled scholar-city (W6, region format 1).',
    fields={
        'displayName': 'Thaloria', 'biome': 'temperate', 'lightTint': None, 'layoutVersion': 2,
        'playerStart': {'x': L.WEST_ARRIVAL[0], 'y': L.WEST_ARRIVAL[1]},
        'tileset': {'key': 'tileset_base', 'floorFrame': 0, 'pathFrame': 5, 'streetFrame': 322},
        'portals': [
            {'id': 'thaloria_east_gate', 'x': W - 1, 'y': L.HIGH[0], 'label': 'The East Gate — the winter road',
             'targetMap': 'east_road', 'targetX': px(EAST_ROAD_ARRIVAL[0]), 'targetY': px(EAST_ROAD_ARRIVAL[1])},
            {'id': 'thaloria_to_eldrin_tower', 'x': 0, 'y': L.HIGH[0], 'label': "The West Gate — the road to Eldrin's Tower",
             'targetMap': 'eldrin_tower', 'targetX': px(24), 'targetY': px(40)},
        ],
        'spawns': {
            'enemies': [], 'npcs': [], 'chests': [], 'campfires': [],
            'stations': L.STATIONS,
            'bountyBoards': [L.BOARD],
            'landmarks': L.LANDMARKS,
            'doors': DOORS,
            'signs': [
                {'x': 90, 'y': 27, 'id': 'bell_tower',
                 'text': "The Bell Tower\n\nThe bell sounds its hour, as it always has, a little off true. No one in Thaloria remembers it ever striking correctly."},
                {'x': 120, 'y': 52, 'id': 'east_gate',
                 'text': "The East Gate\n\nBeyond it, the winter road: hard-packed, frosted, the wheel-ruts of the autumn harvest frozen into pale lines. The Compass needle lies fixed east."},
                {'x': 82, 'y': 53, 'id': 'archivists_guild',
                 'text': "The Archivist's Guild\n\nThe city's scholars keep its records here: ledgers, maps, the careful archives of a careful people. The guild outfits travelling scholars too — a notice asks them to return what they borrow."},
            ],
            'gatheringNodes': [], 'crackedBoulders': [], 'riftGates': [], 'pillarGates': [], 'boss': None,
        },
        'currencyBias': 'neutral', 'music': None,
        'quests': ['main_odysseys_dawn'], 'chapterTitle': "Act I: Odyssey's Dawn",
        'introDialogue': None, 'introRegistryKey': None,
    },
)
print(f'wrote {OUT.relative_to(AMO)}: {W}x{H}, {sm.count()} sprites, {len(DOORS)} doors, {len(places)} places')
