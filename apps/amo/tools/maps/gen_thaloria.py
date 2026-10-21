#!/usr/bin/env python3
"""
Generates src/data/maps/thaloria.js — Thaloria, the scholar-city (Chapter 3,
"Odyssey's Dawn", and Chapter 11's return). A compact hub, 32x26 tiles:

  north   the college (stone, grey dome) and the bell tower that never struck
          correctly, with houses along the north street
  centre  the cobbled square on the crossroads: fountain, well, signpost,
          lamps, market stalls
  south   the inn (with the Innkeeper and the Trader at its door), houses,
          the market yard with the hearth, the alchemy table and the bounty board
  east    the East Gate onto the winter road (East Road)
  west    the way to the scholar's quarter and Eldrin's Tower

Sources: map spec data/lore/campaigns/eldorias_prophecy/thaloria_and_east_road.md,
the book (ch04: "He left Thaloria by the East Gate at dawn, when the bell tower
was sounding its hour with the serene inaccuracy that had been its habit all
his life"), DB: Thaloria — "the scholarly kingdom of libraries and archives".

Deterministic. Preview: python3 tools/maps/render_map_preview.py thaloria out.png
Run from apps/amo/: python3 tools/maps/gen_thaloria.py
"""
from pathlib import Path
import random
import sys

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, tiles_js, js_item, AMO  # noqa: E402

MAP_OUT = AMO / 'src/data/maps/thaloria.js'
# Doors into Thaloria's interiors (W3), written by tools/maps/gen_interiors.py
import json as _json  # noqa: E402
DOORS_JSON = AMO / 'src/data/maps/interiors/doors.json'
CITY_DOORS = _json.loads(DOORS_JSON.read_text()).get('thaloria', []) if DOORS_JSON.exists() else []
W, H = 32, 26
rng = random.Random(503)
sm = SheetMap()
BC = 'SampleMap/[Base]BaseChip_pipo'
LPC_M = 'lpc/obj_misk_atlas'
BOOT_FIELDS = {BC: 'decorations', LPC_M: 'lpcObjMiskDecorations'}
boot_items = {f: [] for f in BOOT_FIELDS.values()}

# ground: grass | path | cobble | tree (map edge)
ground = [['grass'] * W for _ in range(H)]
occupied = [[False] * W for _ in range(H)]


def inside(x, y):
    return 0 <= x < W and 0 <= y < H


def put(sheet, name, x, y, mark=True, **extra):
    sm.entry(sheet, name)
    item = {'name': name, 'x': x, 'y': y, **extra}
    if sheet in BOOT_FIELDS:
        boot_items[BOOT_FIELDS[sheet]].append(item)
    else:
        sm.add(sheet, name, x, y, **extra)
    if mark:
        wt, ht = sm.size_tiles(sheet, name)
        for yy in range(y, y + ht):
            for xx in range(x, x + wt):
                if inside(xx, yy):
                    occupied[yy][xx] = True
    return item


def free(x, y, wt, ht, grounds=('grass',)):
    for yy in range(y, y + ht):
        for xx in range(x, x + wt):
            if not inside(xx, yy) or occupied[yy][xx] or ground[yy][xx] not in grounds:
                return False
    return True


def try_put(sheet, name, x, y, grounds=('grass',), **extra):
    wt, ht = sm.size_tiles(sheet, name)
    if free(x, y, wt, ht, grounds):
        put(sheet, name, x, y, **extra)
        return True
    return False


def fill(kind, x0, y0, x1, y1):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if inside(x, y) and ground[y][x] != 'tree':
                ground[y][x] = kind


def reserve(x0, y0, x1, y1):
    """Keep tiles free for spawns (NPCs, stations, the board) — nothing is drawn there."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            occupied[y][x] = True


# ------------------------------------------------------------------ edge, streets, square
for x in range(W):
    ground[0][x] = ground[H - 1][x] = 'tree'
for y in range(H):
    ground[y][0] = ground[y][W - 1] = 'tree'
MAIN = (12, 13)                       # the west–east high street (rows)
for y in MAIN:                        # gaps in the tree ring: west to the tower, east gate
    ground[y][0] = ground[y][W - 1] = 'path'
NORTH_ST, SOUTH_ST = 8, 18
fill('path', 0, MAIN[0], W - 1, MAIN[1])
fill('path', 2, NORTH_ST, W - 3, NORTH_ST)
fill('path', 2, SOUTH_ST, W - 3, SOUTH_ST)
fill('path', 15, NORTH_ST, 16, SOUTH_ST)
SQUARE = (11, 10, 20, 15)
fill('cobble', *SQUARE)

# ------------------------------------------------------------------ houses (Pipoya kit)
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
DOORS = ['door_wood_arch_a', 'door_wood', 'door_wood_brown_panel_a', 'door_wood_dark_paneled']
WINDOWS = ['window_brown_2pane', 'window_brown_4pane', 'window_curtained_gray']


def house(x0, wy, w, roof_rows, walls, roof, street_y, door=None, windows=None):
    """Wall row at wy (walls are 2 tall); roofs above. A path runs from the door down to street_y."""
    y0 = wy - roof_rows
    top, trans = ROOF[roof]
    rows = [top, trans] + [f'roof_{roof}_lower_{"ab"[i % 2]}' for i in range(roof_rows - 2)]
    for r, n in enumerate(rows):
        for x in range(x0, x0 + w):
            put(BC, n, x, y0 + r)
    left, mid, right = WALLS[walls]
    for x in range(x0, x0 + w):
        put(BC, left if x == x0 else right if x == x0 + w - 1 else mid, x, wy)
    dx = w // 2
    put(BC, door or rng.choice(DOORS), x0 + dx, wy, mark=False)
    wins = windows or rng.choice(WINDOWS)
    for x in range(x0 + 1, x0 + w - 1):
        if abs(x - (x0 + dx)) >= 2 and (x - x0) % 2 == 1:
            put(BC, wins, x, wy, mark=False)
    for y in range(wy + 2, street_y):
        if ground[y][x0 + dx] == 'grass':
            ground[y][x0 + dx] = 'path'


# North: the college (stone, grey dome, ornate door), the bell tower, homes
house(2, 6, 7, 4, 'stone', 'dome_gray', NORTH_ST, door='door_gold_ornate_red_a', windows='window_curtained_gray')
put(BC, 'window_stained_glass_red', 3, 6, mark=False)
put(BC, 'window_stained_glass_rainbow', 7, 6, mark=False)
house(10, 6, 3, 4, 'stone', 'scale_red', NORTH_ST, door='door_wood_arch_a')
put(BC, 'bell_gold_hanging', 11, 1, mark=False, blocking=False)      # the bell, on the tower's ridge
house(18, 6, 5, 3, 'timber', 'thatch_gold', NORTH_ST)
house(24, 6, 5, 4, 'plaster', 'terracotta', NORTH_ST)
# South of the high street, facing the south street: the inn and homes
house(2, 16, 7, 2, 'timber', 'wood_brown', SOUTH_ST, door='door_wood_arch_a')   # the inn (door at x=5)
put(BC, 'icon_inn_sign', 7, 15, mark=False)
house(19, 16, 4, 2, 'white', 'brick_teal', SOUTH_ST)
house(24, 16, 5, 2, 'brick', 'scale_red', SOUTH_ST)

# ------------------------------------------------------------------ the square
put(BC, 'fountain_stone_round', 14, 10)                               # on the crossroads, north half of the square
put(BC, 'signpost_directional_multi', 17, 14)
put(BC, 'well_stone_basin', 12, 14)
for x, y in [(11, 10), (20, 10), (11, 15), (20, 15)]:
    try_put(LPC_M, 'street_lamp_lit', x, y - 2, grounds=('cobble', 'path', 'grass'))
for x, y in [(12, 11), (19, 11)]:
    try_put(BC, 'knight_statue_gray', x, y, grounds=('cobble',))

# ------------------------------------------------------------------ the market yard (south of the south street)
reserve(19, 22, 19, 22)    # the cartographer
reserve(7, 21, 9, 22)      # the bounty board (spawns.bountyBoards at 8,22 — 2x2 sprite, bottom on row 22)
reserve(23, 20, 24, 22)    # the hearth (3 tiles tall, bottom on row 22)
reserve(26, 21, 28, 22)    # the alchemy table
reserve(3, 19, 7, 19)      # the Innkeeper and the Trader by the inn door
for x in (10, 13, 18):
    try_put('roleworld_wizard/exterior_asset', 'market_stall', x, 20)
reserve(16, 22, 17, 22)    # the merchant
for name, x, y in [('barrel_dark', 9, 23), ('crate_wood_light', 15, 23), ('crate_wood_light_open', 20, 23),
                   ('haybale_yellow', 21, 22), ('mailbox_wood_red_roof', 22, 9)]:
    try_put(BC, name, x, y, grounds=('grass', 'path'))

# trees and flowers in the yards, off the streets
for _ in range(400):
    x, y = rng.randrange(1, W - 1), rng.randrange(1, H - 1)
    if rng.random() < 0.25:
        try_put(BC, rng.choice(['tree_bush_green_light', 'tree_bush_green_dark']), x, y)
    else:
        try_put(BC, rng.choice(['flower_white_cluster', 'flower_pink_bush', 'bush_round_green_light']), x, y)

# the East Gate: statues and lamps either side of the high street where it leaves the city
put(BC, 'knight_statue_gray', W - 3, MAIN[0] - 2)
put(BC, 'knight_statue_gray', W - 3, MAIN[1] + 1)
put(LPC_M, 'street_lamp_lit', W - 4, MAIN[0] - 3)
put(LPC_M, 'street_lamp_lit', W - 4, MAIN[1] + 1)

# ------------------------------------------------------------------ output
TILE_OF = {'path': 2, 'cobble': 3, 'tree': 1}
tiles = [[TILE_OF.get(ground[y][x], 0) for x in range(W)] for y in range(H)]


def arr(items):
    return '[\n' + ''.join(f'    {js_item(i)},\n' for i in items) + ']'


fields = '\n'.join(f'    {f}: THALORIA_{f.upper()},' for f in BOOT_FIELDS.values())
consts = '\n\n'.join(f'const THALORIA_{f.upper()} = {arr(items)};' for f, items in boot_items.items())
out = f'''// AUTO-GENERATED — Thaloria, the scholar-city (Chapter 3 hub; Chapter 11's return).
// Regenerate with tools/maps/gen_thaloria.py — don't hand-edit the layout; the
// gameplay fields (spawns, portals, quests) live in the generator too.
//
// Tile values: 0 = grass, 1 = trees (the edge), 2 = road, 3 = cobbled square.

const TILES = {tiles_js(tiles)};

{consts}

const THALORIA_EXTRA_SHEETS = {sm.extra_sheets_js()};

const THALORIA_SHEET_DECORATIONS = {sm.sheet_decorations_js()};

export const THALORIA = {{
    id: 'thaloria',
    displayName: 'Thaloria',
    biome: 'temperate',            // data/weather.js
    tiles: TILES,
    lightTint: null,
    playerStart: {{ x: 2, y: {MAIN[0]} }},
    tileset: {{
        key: 'tileset_base',
        floorFrame: 0,     // grass_green_light
        pathFrame: 5,      // dirt_brown
        streetFrame: 322,  // floor_cobblestone_gray
    }},
{fields}
    extraSheets: THALORIA_EXTRA_SHEETS,
    sheetDecorations: THALORIA_SHEET_DECORATIONS,
    portals: [
        {{
            id: 'thaloria_east_gate',
            x: {W - 1}, y: {MAIN[0]},
            label: 'The East Gate — the winter road',
            targetMap: 'east_road',
            targetX: 2 * 32 + 16,
            targetY: 17 * 32 + 16,
        }},
        {{
            id: 'thaloria_to_eldrin_tower',
            x: 0, y: {MAIN[0]},
            label: "The scholar's quarter — Eldrin's Tower",
            targetMap: 'eldrin_tower',
            // Eldrin's Tower's own playerStart
            targetX: 24 * 32 + 16,
            targetY: 40 * 32 + 16,
        }},
    ],
    spawns: {{
        enemies: [],               // the city is safe (map spec)
        npcs: [
            {{ x: 4, y: 19, id: 'innkeeper', name: 'Innkeeper', dialogue: 'innkeeper_greeting', afterDialogue: 'innkeeper_after',
               spriteKey: 'spr_old_dude', animProfile: 'lpc_universal', tint: 0xddccbb }},
            {{ x: 7, y: 19, id: 'thaloria_trader', name: 'Trader', dialogue: 'trader_greeting', afterDialogue: 'trader_after',
               spriteKey: 'spr_merchant', animProfile: 'lpc_universal', tint: 0xccbbaa }},
            {{ x: 16, y: 22, id: 'thaloria_merchant', name: 'Merchant', isShop: true, shopName: 'THALORIA MARKET',
               dialogue: 'thaloria_merchant_greeting', afterDialogue: 'thaloria_merchant_greeting',
               spriteKey: 'spr_merchant', animProfile: 'lpc_universal', tint: 0xbbccdd }},
            {{ x: 19, y: 22, id: 'thaloria_cartographer', name: 'Cartographer', isShop: true, shopName: 'THE CARTOGRAPHER', catalog: 'cartographer',
               dialogue: 'cartographer_greeting', afterDialogue: 'cartographer_greeting',
               spriteKey: 'spr_old_dude', animProfile: 'lpc_universal', tint: 0xbbaa88 }},
        ],
        chests: [],
        campfires: [],
        stations: [
            {{ x: 23, y: 22, type: 'hearth',  rank: 2 }},
            {{ x: 27, y: 22, type: 'alchemy', rank: 2 }},
        ],
        bountyBoards: [{{ x: 8, y: 22, region: 'east_road' }}],
        landmarks: [
            {{ id: 'thaloria_bell_tower_square', name: 'The Bell Tower', x: 12, y: 8, radius: 3, xp: 15 }},
            {{ id: 'thaloria_market', name: 'Thaloria Market', x: 15, y: 21, radius: 3, xp: 15 }},
            {{ id: 'thaloria_east_gate', name: 'The East Gate', x: 29, y: 12, radius: 2, xp: 15 }},
        ],
        doors: {_json.dumps(CITY_DOORS)},
        signs: [
            {{ x: 13, y: 8, id: 'bell_tower',
               text: "The Bell Tower\\n\\nThe college bell sounds its hour, as it always has, a little off true. No one in Thaloria remembers it ever striking correctly." }},
            {{ x: 28, y: 14, id: 'east_gate',
               text: "The East Gate\\n\\nBeyond it, the winter road: hard-packed, frosted, the wheel-ruts of the autumn harvest frozen into pale lines. The Compass needle lies fixed east." }},
        ],
        gatheringNodes: [],
        crackedBoulders: [],
        riftGates: [],
        pillarGates: [],
        boss: null,
    }},
    currencyBias: 'neutral',
    music: null,
    quests: ['main_odysseys_dawn'],
    chapterTitle: "Act I: Odyssey's Dawn",
    introDialogue: null,
    introRegistryKey: null,
}};
'''
MAP_OUT.write_text(out)
total = sm.count() + sum(len(v) for v in boot_items.values())
print(f'wrote {MAP_OUT.relative_to(AMO)}: {W}x{H}, {total} sprites')
