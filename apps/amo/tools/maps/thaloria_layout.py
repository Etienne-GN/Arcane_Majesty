"""
Thaloria's layout (W6): streets, buildings, the rooms behind their doors and the
spots its people use. Shared by tools/maps/gen_thaloria.py (the city map) and
tools/maps/interiors/thaloria.py (the rooms). Tile coordinates on the 128x112 map.

A building's walls stand on row `wy` (two tiles tall) with its roof rows above; its
door is at (x0 + w // 2, wy) and a path runs from wy + 2 down to row `street`.

  north-west  the noble hill: the manor and fine houses (its lane meets the high
              street by the West Gate, the road to Eldrin's Tower)
  north-east  the temple quarter: the temple, the bell tower, the Archivist's Guild
              (album canon: "a scholarly guild in Thaloria preserving ancient
              knowledge"), the barracks by the East Gate
  centre      the cobbled square on the crossroads of the high street
  south-west  the lower town: houses and the smithy
  south-east  the market: the inn, the market hall, the alchemist's, the market yard
"""
W, H = 128, 112
HIGH = (54, 55)                 # the high street rows, West Gate to East Gate
WALL = (4, 123, 4, 107)         # x0, x1, y0, y1 of the stone ring (two tiles thick)
STREETS = [                     # path rects (x0, y0, x1, y1), inclusive
    (0, 54, 127, 55),           # the high street, through both gates
    (63, 6, 64, 105),           # the north–south street
    (6, 28, 121, 29),           # the north street
    (6, 82, 121, 83),           # the south street
    (6, 102, 121, 103),         # the far south street
    (32, 6, 33, 105),           # the west lane
    (95, 6, 96, 105),           # the east lane
]
SQUARE = (52, 46, 75, 63)       # cobbled, on the crossroads
MARKET_YARD = (68, 86, 92, 99)  # cobbled
EAST_ARRIVAL = (120, 54)        # inside the East Gate (from the Wilds)
WEST_ARRIVAL = (9, 55)          # inside the West Gate (stub chapters' road back)


def B(id, x0, wy, w, roof_rows, walls, roof, street, door=None, windows=None, interior=None):
    return dict(id=id, x0=x0, wy=wy, w=w, roof_rows=roof_rows, walls=walls, roof=roof, street=street,
                door=door, windows=windows, interior=interior)


def room(id, template, seed, name, label, **extra):
    return {'id': id, 'template': template, 'seed': seed, 'displayName': name, 'label': label, **extra}


def door_of(b):
    return (b['x0'] + b['w'] // 2, b['wy'])


BUILDINGS = [
    # the noble hill
    B('manor', 10, 24, 13, 6, 'white', 'scale_red', 28, door='door_gold_ornate_red_a',
      interior=room('thaloria_manor', 'manor', 5, 'Thaloria — the manor', 'The manor')),
    B('house_noble_a', 37, 24, 8, 4, 'plaster', 'terracotta', 28,
      interior=room('thaloria_house_noble_a', 'house', 12, 'Thaloria — a fine house', 'A fine house')),
    B('house_noble_b', 12, 50, 8, 4, 'white', 'brick_teal', 54),
    B('house_noble_c', 37, 50, 9, 4, 'brick', 'scale_red', 54,
      interior=room('thaloria_house_noble_c', 'house', 13, 'Thaloria — a fine house', 'A fine house')),
    # the temple quarter
    B('temple', 68, 24, 15, 6, 'stone', 'dome_gray', 28, door='door_wood_arch_a', windows='window_stained_glass_rainbow',
      interior=room('thaloria_temple', 'temple', 6, 'Thaloria — the temple', 'The temple')),
    B('bell_tower', 86, 24, 4, 7, 'stone', 'scale_red', 28, door='door_wood_arch_a',
      interior=room('thaloria_bell_tower', 'tower', 3, 'Thaloria — the Bell Tower', 'Enter the Bell Tower')),
    B('house_temple', 100, 24, 7, 4, 'timber', 'thatch_gold', 28),
    B('guild_hall', 78, 50, 13, 5, 'stone', 'dome_gray', 54, door='door_gold_ornate_red_a', windows='window_curtained_gray',
      interior=room('thaloria_guild_hall', 'guildhall', 7, "Thaloria — the Archivist's Guild", "The Archivist's Guild")),
    B('barracks', 100, 50, 13, 4, 'stone', 'wood_brown', 54,
      interior=room('thaloria_barracks', 'barracks', 8, 'Thaloria — the barracks', 'The barracks')),
    # the lower town
    B('house_low_a', 9, 78, 6, 3, 'timber', 'thatch_gold', 82,
      interior=room('thaloria_house_low_a', 'house', 14, 'Thaloria — a house', 'A house')),
    B('house_low_b', 18, 78, 7, 3, 'plaster', 'wood_brown', 82),
    B('smithy', 36, 78, 9, 3, 'stone', 'wood_brown', 82,
      interior=room('thaloria_smithy', 'smithy', 9, 'Thaloria — the smithy', 'The smithy')),
    B('house_low_c', 48, 78, 6, 3, 'brick', 'terracotta', 82,
      interior=room('thaloria_house_low_c', 'house', 15, 'Thaloria — a house', 'A house')),
    B('house_low_d', 10, 98, 6, 3, 'timber', 'wood_brown', 102),
    B('house_low_e', 20, 98, 7, 3, 'plaster', 'thatch_gold', 102,
      interior=room('thaloria_house_low_e', 'house', 16, 'Thaloria — a house', 'A house')),
    B('house_low_f', 37, 98, 7, 3, 'brick', 'wood_brown', 102),
    B('house_teal', 48, 98, 5, 3, 'white', 'brick_teal', 102,
      interior=room('thaloria_house_teal', 'house', 4, 'Thaloria — a house', 'A house',
                    locked={'flag': 'thaloria_house_teal_open', 'text': 'Locked. No one answers.'})),
    # the market
    B('inn', 68, 78, 9, 3, 'timber', 'wood_brown', 82, door='door_wood_arch_a',
      interior=room('thaloria_inn', 'inn', 1, 'Thaloria — the Inn', 'Enter the Inn', currencyBias='neutral',
                    slot_doors={'cellar': {'interior': 'thaloria_inn_cellar', 'label': 'Down to the cellar', 'look': 'hatch'}})),
    B('market_hall', 80, 78, 12, 4, 'white', 'terracotta', 82,
      interior=room('thaloria_market_hall', 'shop', 10, 'Thaloria — the market hall', 'The market hall', currencyBias='neutral')),
    B('alchemist', 99, 78, 7, 3, 'brick', 'scale_red', 82,
      interior=room('thaloria_alchemist', 'shop', 11, "Thaloria — the alchemist's", "The alchemist's")),
    B('house_market_a', 100, 98, 6, 3, 'timber', 'thatch_gold', 102,
      interior=room('thaloria_house_market_a', 'house', 17, 'Thaloria — a house', 'A house')),
    B('house_market_b', 110, 98, 6, 3, 'plaster', 'terracotta', 102),
]
CELLAR = room('thaloria_inn_cellar', 'cellar', 2, "Thaloria — the Inn's cellar", 'Cellar', parent='thaloria_inn')

# The market yard: five stalls (2x2, rows 88-89); their keepers stand in front.
STALLS = [70, 74, 78, 82, 86]
STATIONS = [{'x': 70, 'y': 98, 'type': 'hearth', 'rank': 2}, {'x': 90, 'y': 98, 'type': 'alchemy', 'rank': 2}]
BOARD = {'x': 80, 'y': 98, 'region': 'east_road'}

# The spots Thaloria's people use (W4 places; gen_thaloria.py adds the door fronts
# and the rooms' work spots). Areas: w + h <= 25, so a wanderer crosses one between moves.
PLACES = {
    **{f'stall_{i + 1}': {'x': x + 1, 'y': 90, 'facing': 'down'} for i, x in enumerate(STALLS)},
    'inn_door_yard':    {'x': 74, 'y': 80, 'facing': 'down'},     # the Trader, beside the inn door
    'well':             {'x': 57, 'y': 59, 'facing': 'up'},
    'hearth_yard':      {'x': 73, 'y': 98, 'facing': 'left'},
    'woodpile':         {'x': 88, 'y': 94, 'facing': 'down'},
    'temple_steps':     {'x': 77, 'y': 27, 'facing': 'down'},
    'post_west_gate':   {'x': 8, 'y': 53, 'facing': 'right'},
    'post_west_gate_b': {'x': 8, 'y': 56, 'facing': 'right'},
    'post_east_gate':   {'x': 119, 'y': 53, 'facing': 'left'},
    'post_east_gate_b': {'x': 119, 'y': 56, 'facing': 'left'},
    'beggar_square':    {'x': 53, 'y': 57, 'facing': 'right', 'outdoors': True},
    'beggar_gate':      {'x': 116, 'y': 58, 'facing': 'left', 'outdoors': True},
    'square':           {'x': 54, 'y': 56, 'w': 20, 'h': 5},
    'market':           {'x': 69, 'y': 91, 'w': 18, 'h': 4},
    'high_street_w':    {'x': 8, 'y': 54, 'w': 22, 'h': 2},
    'high_street_e':    {'x': 97, 'y': 54, 'w': 22, 'h': 2},
    'noble_garden':     {'x': 8, 'y': 30, 'w': 20, 'h': 4},
    'temple_court':     {'x': 66, 'y': 30, 'w': 20, 'h': 4},
    'lower_lane':       {'x': 8, 'y': 84, 'w': 22, 'h': 2},
    'market_lane':      {'x': 97, 'y': 84, 'w': 22, 'h': 2},
    'guild_floor':      {'interior': 'thaloria_guild_hall', 'x': 2, 'y': 5, 'w': 10, 'h': 4},
    'watch_high_street': {'route': [[8, 54], [119, 54], [119, 55], [8, 55]]},
    'watch_market':      {'route': [[63, 30], [63, 83], [95, 83], [95, 102], [64, 102]]},
    'watch_lower':       {'route': [[6, 82], [32, 82], [32, 102], [6, 102]]},
}

LANDMARKS = [
    {'id': 'thaloria_bell_tower_square', 'name': 'The Bell Tower', 'x': 88, 'y': 28, 'radius': 3, 'xp': 15},
    {'id': 'thaloria_market', 'name': 'Thaloria Market', 'x': 80, 'y': 92, 'radius': 4, 'xp': 15},
    {'id': 'thaloria_east_gate', 'name': 'The East Gate', 'x': 119, 'y': 54, 'radius': 2, 'xp': 15},
    {'id': 'thaloria_west_gate', 'name': 'The West Gate', 'x': 8, 'y': 54, 'radius': 2, 'xp': 15},
    {'id': 'thaloria_square', 'name': 'The Fountain Square', 'x': 63, 'y': 52, 'radius': 4, 'xp': 15},
    {'id': 'thaloria_temple', 'name': 'The Temple', 'x': 75, 'y': 28, 'radius': 3, 'xp': 15},
    {'id': 'thaloria_guild', 'name': "The Archivist's Guild", 'x': 84, 'y': 53, 'radius': 3, 'xp': 15},
    {'id': 'thaloria_manor', 'name': 'The Manor', 'x': 16, 'y': 28, 'radius': 3, 'xp': 15},
]
