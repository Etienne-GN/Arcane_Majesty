#!/usr/bin/env python3
"""
Generates src/data/maps/east_road.js — the East Road (Chapter 3, "Odyssey's
Dawn"): the winter road from Thaloria's East Gate to the foot of the mountains
below the Summit of Despair. 52x34 tiles, west to east:

  the road out of the city; a birch copse south of it with an old campfire
  (the book's third night: wolflike things gather round the fire after dark);
  the waystone where the Legion's stranger stopped ("the Anchor"); the first
  Rift-Gate node on a rise north of the road; a spur south to the clearing of
  the Corrupted Sentinel (optional); rocks thickening toward the mountains,
  and the shepherd's lean-to where Oren falls in beside you. The east end
  climbs to the Summit of Despair.

Sources: map spec data/lore/campaigns/eldorias_prophecy/thaloria_and_east_road.md;
the book ch04 (the birch copse, the fire, the ambush) and ch05 (the inns' rumor,
Oren in the late-winter snow, the shepherd's lean-to at the mountains' foot);
bestiary.md (Void-Stalker, Blight-Ent, Root-Wraith).

Deterministic. Preview: python3 tools/maps/render_map_preview.py east_road out.png
Run from apps/amo/: python3 tools/maps/gen_east_road.py
"""
from pathlib import Path
import random
import sys

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, tiles_js, js_item, AMO  # noqa: E402

MAP_OUT = AMO / 'src/data/maps/east_road.js'
W, H = 52, 34
rng = random.Random(501)
sm = SheetMap()
BC = 'SampleMap/[Base]BaseChip_pipo'
LPC_BU = 'lpc/build_atlas'
BOOT_FIELDS = {BC: 'decorations', LPC_BU: 'lpcBuildDecorations'}
boot_items = {f: [] for f in BOOT_FIELDS.values()}

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


def free(x, y, wt, ht):
    for yy in range(y, y + ht):
        for xx in range(x, x + wt):
            if not inside(xx, yy) or occupied[yy][xx] or ground[yy][xx] != 'grass':
                return False
    return True


def try_put(sheet, name, x, y, **extra):
    wt, ht = sm.size_tiles(sheet, name)
    if free(x, y, wt, ht):
        put(sheet, name, x, y, **extra)
        return True
    return False


def scatter(sheet, names, count, box, tries=3000):
    x0, y0, x1, y1 = box
    n = 0
    for _ in range(tries):
        if n >= count:
            break
        if try_put(sheet, rng.choice(names), rng.randint(x0, x1), rng.randint(y0, y1)):
            n += 1
    return n


def reserve(x, y, r=1):
    """Keep a spot (and a margin) clear for a spawn: creature, NPC, chest, sign, node."""
    for yy in range(y - r, y + r + 1):
        for xx in range(x - r, x + r + 1):
            if inside(xx, yy):
                occupied[yy][xx] = True


def road(points, width=2):
    """A path through the points (straight legs, horizontal then vertical)."""
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for d in range(width):
                if inside(x, y0 + d):
                    ground[y0 + d][x] = 'path'
        for y in range(min(y0, y1), max(y0, y1) + 1):
            for d in range(width):
                if inside(x1 + d, y):
                    ground[y][x1 + d] = 'path'


# ------------------------------------------------------------------ edge and roads
for x in range(W):
    ground[0][x] = ground[H - 1][x] = 'tree'
for y in range(H):
    ground[y][0] = ground[y][W - 1] = 'tree'
WEST_Y, EAST_Y = 17, 10
road([(0, WEST_Y), (22, WEST_Y), (22, 13), (36, 13), (36, EAST_Y), (W - 1, EAST_Y)])
road([(34, 15), (34, 24)], width=1)          # the spur south to the sentinel's clearing
for y in range(24, 29):                     # the clearing
    for x in range(31, 39):
        ground[y][x] = 'path'

# ------------------------------------------------------------------ places (reserved before scattering)
CAMPFIRE = (15, 24)
SPOTS = {
    'campfire': CAMPFIRE, 'waystone': (25, 12), 'gate': (29, 7),
    'sentinel': (35, 27), 'leanto_fire': (45, 8), 'oren': (46, 8), 'leanto_sign': (43, 8),
    'page1': (9, 15), 'page2': (19, 27), 'page3': (40, 15),
}
for name, (x, y) in SPOTS.items():
    reserve(x, y, 1)

# the shepherd's lean-to: a small abandoned cabin at the mountains' foot
put('snowy_asset_pack_nyx/decoration_log_cabin', 'decoration_log_cabin', 41, 1)
# the sentinel's clearing: old guardian statues
for x, y in [(32, 24), (37, 24)]:
    put(BC, 'gargoyle_statue_gray', x, y)

# ------------------------------------------------------------------ the birch copse (south of the road)
scatter(BC, ['tree_bare_branches', 'tree_dead_bare_green'], 26, (8, 20, 22, 31))
# winter woods elsewhere: bare trees with a few evergreens; rocks toward the mountains
scatter(BC, ['tree_bare_branches', 'tree_dead_bare_green', 'tree_bush_green_dark'], 40, (2, 2, 30, 31))
scatter(BC, ['tree_bare_branches', 'tree_bush_green_dark'], 16, (38, 16, 49, 31))
scatter(BC, ['rock_medium_tan', 'rocks_pebbles_pair', 'rock_small_tan'], 34, (36, 1, 50, 31))
scatter(BC, ['bush_round_green_light', 'flower_white_cluster', 'rocks_pebbles_pair'], 40, (2, 2, 49, 31))
for x, y in [(23, 11), (27, 12)]:            # stones around the waystone
    try_put(BC, 'rock_medium_tan', x, y)
try_put(LPC_BU, 'wood_cart_hay_pitchfork', 5, 13)   # a cart left by the road outside the city

# ------------------------------------------------------------------ gameplay
tx = lambda p: p[0]                          # noqa: E731
enemies = [
    # Void-Stalkers on the road (the first combat) — and three more gather round the copse fire after dark
    {'x': 12, 'y': 15, 'type': 'void_stalker'}, {'x': 20, 'y': 19, 'type': 'void_stalker'},
    {'x': 28, 'y': 15, 'type': 'void_stalker'}, {'x': 40, 'y': 12, 'type': 'void_stalker'},
    {'x': 13, 'y': 22, 'type': 'void_stalker', 'time': 'night'},
    {'x': 17, 'y': 22, 'type': 'void_stalker', 'time': 'night'},
    {'x': 15, 'y': 27, 'type': 'void_stalker', 'time': 'night'},
    # Root-Wraiths in the thickets, Blight-Ents at the wood's edges
    {'x': 27, 'y': 19, 'type': 'root_wraith'}, {'x': 30, 'y': 21, 'type': 'root_wraith'}, {'x': 25, 'y': 23, 'type': 'root_wraith'},
    {'x': 8, 'y': 7, 'type': 'blight_ent'}, {'x': 42, 'y': 20, 'type': 'blight_ent'},
    # the optional miniboss, off the road
    {'x': SPOTS['sentinel'][0], 'y': SPOTS['sentinel'][1], 'type': 'corrupted_sentinel'},
]
for e in enemies:
    reserve(e['x'], e['y'], 0)
nodes = [
    {'x': 11, 'y': 21, 'type': 'wood'}, {'x': 20, 'y': 30, 'type': 'wood'}, {'x': 6, 'y': 26, 'type': 'wood'},
    {'x': 44, 'y': 15, 'type': 'mineral'}, {'x': 48, 'y': 22, 'type': 'mineral'},
    {'x': 18, 'y': 9, 'type': 'herb'}, {'x': 33, 'y': 5, 'type': 'herb', 'yields': 'meadow_herbs'},
]
for nd in nodes:
    reserve(nd['x'], nd['y'], 0)

# ------------------------------------------------------------------ output
TILE_OF = {'path': 2, 'tree': 1}
tiles = [[TILE_OF.get(ground[y][x], 0) for x in range(W)] for y in range(H)]
for y in (WEST_Y, WEST_Y + 1):
    tiles[y][0] = 2
for y in (EAST_Y, EAST_Y + 1):
    tiles[y][W - 1] = 2


def arr(items, indent='    '):
    return '[\n' + ''.join(f'{indent}    {js_item(i)},\n' for i in items) + f'{indent}]'


fields = '\n'.join(f'    {f}: EAST_ROAD_{f.upper()},' for f in BOOT_FIELDS.values())
consts = '\n\n'.join(f'const EAST_ROAD_{f.upper()} = {arr(items, "")};' for f, items in boot_items.items())
S = SPOTS
out = f'''// AUTO-GENERATED — the East Road (Chapter 3), Thaloria's East Gate to the
// foot of the mountains. Regenerate with tools/maps/gen_east_road.py — the
// gameplay fields (spawns, portals) live in the generator too.
//
// Tile values: 0 = grass, 1 = trees (the edge), 2 = road.

const TILES = {tiles_js(tiles)};

{consts}

const EAST_ROAD_EXTRA_SHEETS = {sm.extra_sheets_js()};

const EAST_ROAD_SHEET_DECORATIONS = {sm.sheet_decorations_js()};

export const EAST_ROAD = {{
    id: 'east_road',
    displayName: 'East Road',
    biome: 'temperate',
    weather: {{ clear: 5, rain: 2, snow: 3 }},   // early winter: rain, and late-winter snow
    tiles: TILES,
    lightTint: null,
    playerStart: {{ x: 2, y: {WEST_Y} }},
    tileset: {{
        key: 'tileset_base',
        floorFrame: 0,     // grass_green_light
        pathFrame: 5,      // dirt_brown
    }},
{fields}
    extraSheets: EAST_ROAD_EXTRA_SHEETS,
    sheetDecorations: EAST_ROAD_SHEET_DECORATIONS,
    portals: [
        {{
            id: 'east_road_to_thaloria',
            x: 0, y: {WEST_Y},
            label: 'Back through the East Gate to Thaloria',
            targetMap: 'thaloria',
            targetX: 29 * 32 + 16,
            targetY: 12 * 32 + 16,
        }},
        {{
            id: 'east_road_to_summit',
            x: {W - 1}, y: {EAST_Y},
            label: 'The climb to the Summit of Despair',
            targetMap: 'summit_of_despair',
            // the Summit's own playerStart
            targetX: 8 * 32 + 16,
            targetY: 18 * 32 + 16,
        }},
    ],
    spawns: {{
        enemies: {arr(enemies)},
        npcs: [
            {{ x: {S['oren'][0]}, y: {S['oren'][1]}, id: 'oren', name: 'Oren', dialogue: 'oren_meeting', afterDialogue: 'oren_after',
               spriteKey: 'spr_merchant', animProfile: 'lpc_universal', tint: 0xaabbcc }},
        ],
        chests: [
            {{ x: {S['page1'][0]}, y: {S['page1'][1]}, items: ['scattered_journal_page'] }},
            {{ x: {S['page2'][0]}, y: {S['page2'][1]}, items: ['scattered_journal_page', 'forest_herb'] }},
            {{ x: {S['page3'][0]}, y: {S['page3'][1]}, items: ['scattered_journal_page'] }},
        ],
        campfires: [
            {{ x: {CAMPFIRE[0]}, y: {CAMPFIRE[1]} }},                       // the copse fire — dangerous after dark
            {{ x: {S['leanto_fire'][0]}, y: {S['leanto_fire'][1]} }},       // the lean-to's old hearth
        ],
        signs: [
            {{ x: {S['waystone'][0]}, y: {S['waystone'][1]}, id: 'waystone_anchor',
               text: "An old waystone. Fresh chalk under the frost, in a neat and patient hand:\\n\\n'The Anchor — not here. East.'\\n\\nSomeone is asking the question you carry, one village at a time." }},
            {{ x: {S['leanto_sign'][0]}, y: {S['leanto_sign'][1]}, id: 'shepherds_lean_to',
               text: "A shepherd's lean-to, long abandoned, its roof patched with birch-bark and its hearth ringed with the ash of a hundred cold fires. The wind has a sound in the pass ahead." }},
        ],
        gatheringNodes: {arr(nodes, '        ')},
        crackedBoulders: [],
        riftGates: [
            {{ x: {S['gate'][0]}, y: {S['gate'][1]}, id: 'gate_east_road', label: 'East Road Monolith' }},
        ],
        pillarGates: [],
        boss: null,
    }},
    levelBand: {{ min: 2, max: 4 }},
    currencyBias: 'rural',
    music: 'forest',
    quests: [],
    chapterTitle: null,
    introDialogue: null,
    introRegistryKey: null,
}};
'''
MAP_OUT.write_text(out)
total = sm.count() + sum(len(v) for v in boot_items.values())
print(f'wrote {MAP_OUT.relative_to(AMO)}: {W}x{H}, {total} sprites, {len(enemies)} creatures')
