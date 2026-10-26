"""
Interior templates (W3). Each template describes a kind of room. gen_interiors.py
turns a template + a seed into a furnished, walkable room. Names are LPC catalogue
entries (resolved across the four LPC atlases by find_sheet); every name here was
checked to exist when this file was written, and gen_interiors.py fails on any
that does not.

A placement is (rule, choices, count):
  rule     'north'  against the north wall (tall pieces lean into the wall face)
           'side'   against the west or east wall
           'corner' a floor corner (never the two by the exit)
           'centre' anywhere at least one tile from every wall
           'floor'  under-layer art (rugs): anywhere inside, never blocks
           'row'    a group laid left to right (e.g. a long table), placed 'centre'
  choices  names; for 'row', a list of lists (each inner list is one group)
  count    an int, or (min, max)
Furniture blocks unless the name is in NEVER_BLOCK.
"""

WALLS = {
    # (upper face row, lower face row, cap row or None) — rows 1, 2 and 0 of the room.
    # Each pair was checked in a rendered contact sheet (several similarly named
    # catalogue entries — sienna brick, wood plank — are posts or railings, not walls).
    'red_brick':    ('red_brick_wall_mid_fill', 'red_brick_wall_base_fill', None),
    'stone':        ('stone_wall_top_fill', 'stone_wall_base_fill', None),
    'mint':         ('mint_wall_mid_fill', 'mint_wall_base_fill', 'mint_wall_crown_fill'),
}

FLOORS = {
    'taupe_brick': ['taupe_brick_floor_fill_a', 'taupe_brick_floor_fill_b', 'taupe_brick_floor_fill_c', 'taupe_brick_floor_fill_d'],
    'checker':     ['checker_floor_tile_brown'],
    'cream_tile':  ['cream_floor_fill_a', 'cracked_tile_floor_fill_cream_a'],
    'slate':       ['slate_floor_slab_fill_a', 'slate_floor_slab_fill_b', 'slate_floor_slab_fill_c', 'slate_floor_slab_crack_a'],
    'grey_stone':  ['flagstone_floor_plain_a', 'paved_floor_fill_a'],
    'cobble':      ['dark_stone_floor_fill_a'],
}

# Furniture a book can lie on (gen_interiors puts book signs only on these)
BOOK_HOLDERS = {'bookshelf_books', 'shelf_dishes_pewter', 'wood_table_two_tier_end_l', 'wood_table_two_tier_mid',
                'wood_table_rail_post_r', 'table_round_pedestal_gold', 'dresser_wood_drawers', 'cabinet_wood_red_two_door_a'}
NEVER_BLOCK = {'rug_oval_maroon_gold_trim', 'rug_oval_mint_checker_a', 'rug_rounded_orange_gold_trim'}
TALL_LEAN = {'bookshelf_books': 2, 'shelf_dishes_pewter': 2}   # rows of the sprite drawn over the wall face

# A long table: left end, middle, right end (the catalogue's table_wood_plank_* are stair pieces)
TABLE_LONG = ['wood_table_two_tier_end_l', 'wood_table_two_tier_mid', 'wood_table_rail_post_r']
WORKBENCH = TABLE_LONG
COUNTER = TABLE_LONG   # counter_wood_dark_* are stair pieces too

LOOT = {
    'home':   ['health_potion', 'forest_herb', 'herb_tea', 'honeyberry', 'wood', 'berry_compote'],
    'larder': ['honeyberry', 'mushroom_spore', 'forest_salad', 'wild_herb_broth', 'wood', 'mineral_ore'],
    'study':  ['mana_potion', 'ancient_scroll', 'legion_lore_fragment', 'herb_tea'],
    'stash':  ['greater_health_potion', 'greater_mana_potion', 'regen_potion', 'silver_ore'],
}

BOOKS = {
    'home':  ["A household ledger. Flour, lamp oil, a new pair of boots. Under 'owed', a long list crossed out one by one.",
              "A child's primer, the letters traced over and over in a careful, unsteady hand."],
    'inn':   ["The inn's guest book. Merchants from the coast, pilgrims, a scholar who signed only with a drawn eye.",
              "A price list chalked on a slate: a bed for the night, a bowl of stew, stabling extra."],
    'study': ["Notes on the old roads east of the city. Several waystones are marked; one is circled twice.",
              "A treatise on ward-glyphs, half the margins filled with someone else's arguments."],
    'temple': ["A book of prayers for travellers. One page is worn soft with use: a blessing for the road at night."],
}

TEMPLATES = {
    'house': {
        'size': ((8, 11), (8, 10)), 'walls': ['red_brick', 'mint'], 'floors': ['checker', 'taupe_brick'],
        'light': 0x1a1208, 'loot': 'home', 'books': ('home', (0, 1)), 'chests': (1, 2), 'stash': 1 / 6,
        'place': [
            ('floor',  ['rug_oval_maroon_gold_trim', 'rug_rounded_orange_gold_trim'], 1),
            ('north',  ['bed_red_plain', 'bed_double_blue', 'bed_double_red_a'], 1),
            ('north',  ['dresser_wood_drawers', 'cabinet_wood_red_two_door_a'], 1),
            ('centre', ['table_round_pedestal_gold'], 1),
            ('centre', ['chair_wood_tan_side_b', 'chair_wood_tan_side_c'], (1, 2)),
            ('corner', ['potted_plant_flowering', 'barrel_a', 'sack_burlap_a'], (1, 2)),
        ],
        'slots': {},
    },
    'inn': {
        'size': ((15, 18), (11, 13)), 'walls': ['red_brick'], 'floors': ['taupe_brick'],
        'light': 0x1a1208, 'loot': 'larder', 'books': ('inn', (1, 1)), 'chests': (1, 1), 'stash': 0,
        'place': [
            ('floor',  ['rug_rounded_orange_gold_trim'], 1),
            ('north',  ['shelf_dishes_pewter'], 2),
            ('row',    [TABLE_LONG], 2),
            ('centre', ['bench_wood_plain_a', 'bench_wood_plain_b'], (3, 4)),
            ('corner', ['barrel_a', 'barrel_b', 'barrel_cluster_trio'], (2, 3)),
            ('north',  ['lamp_table_gold_bright_a'], 1),
        ],
        # A counter along the west part of the north side; its keeper stands behind it.
        'slots': {'counter': 'counter', 'hearth': 'north', 'cellar': 'corner'},
    },
    'shop': {
        'size': ((10, 13), (8, 10)), 'walls': ['mint', 'red_brick'], 'floors': ['cream_tile'],
        'light': 0x16120a, 'loot': 'home', 'books': ('home', (0, 1)), 'chests': (1, 1), 'stash': 0,
        'place': [
            ('north',  ['shelf_dishes_pewter', 'bookshelf_books'], 2),
            ('side',   ['market_crate_tomato', 'market_crate_cabbage', 'market_crate_potato', 'market_crate_strawberry'], (2, 4)),
            ('corner', ['sack_grain_yellow_pair', 'barrel_a', 'market_crate_empty_c'], (1, 2)),
        ],
        'slots': {'counter': 'counter'},
    },
    'smithy': {
        'size': ((10, 12), (8, 10)), 'walls': ['stone'], 'floors': ['slate'],
        'light': 0x1c0e04, 'loot': 'larder', 'books': ('home', (0, 0)), 'chests': (1, 1), 'stash': 0,
        'place': [
            ('row',    [WORKBENCH], 1),
            ('centre', ['fire_barrel_lit'], 1),          # the catalogue has no anvil (anvil_on_stump is a privy)
            ('corner', ['barrel_a', 'wooden_barrel_a', 'market_crate_empty_c'], (2, 3)),
            ('side',   ['market_crate_empty_c', 'wood_plank_crate_panel_a'], (1, 2)),
        ],
        'slots': {'smith': 'centre'},
    },
    'temple': {
        'size': ((14, 18), (12, 15)), 'walls': ['stone'], 'floors': ['grey_stone'],
        'light': 0x10101a, 'loot': 'study', 'books': ('temple', (1, 2)), 'chests': (0, 1), 'stash': 0,
        'place': [
            ('north',  ['banner_cloth_gold_emblem_tree'], 2),
            ('north',  ['candle_stand_tall'], 2),
            ('centre', ['bench_wood_tan_slat_tall_a', 'bench_wood_tan_slat_tall_b'], (6, 8)),
            ('corner', ['potted_plant_flowering', 'potted_shrub_bush'], (2, 3)),
        ],
        'slots': {'altar': 'north'},
    },
    'tower': {
        'size': ((9, 11), (9, 11)), 'walls': ['stone'], 'floors': ['slate', 'grey_stone'],
        'light': 0x10101a, 'loot': 'study', 'books': ('study', (2, 3)), 'chests': (1, 1), 'stash': 1 / 4,
        'place': [
            ('north',  ['bookshelf_books'], (2, 3)),
            ('centre', ['table_round_pedestal_gold'], 1),
            ('centre', ['lamp_table_gold_plain_a'], 1),
            ('floor',  ['rug_oval_mint_checker_a'], 1),
        ],
        'slots': {'desk': 'centre'},
    },
    'cellar': {
        'size': ((10, 14), (8, 10)), 'walls': ['stone'], 'floors': ['cobble', 'slate'],
        'light': 0x06060a, 'loot': 'larder', 'books': ('home', (0, 0)), 'chests': (1, 2), 'stash': 1 / 3,
        'place': [
            ('side',   ['barrel_a', 'barrel_b', 'wooden_barrel_a'], (3, 5)),
            ('corner', ['sack_burlap_pile_large', 'sack_grain_yellow_pair', 'market_crate_empty_c'], (2, 3)),
            ('centre', ['market_crate_empty_c', 'sack_burlap_b'], (1, 3)),
        ],
        'slots': {},
    },
    'guildhall': {
        'size': ((16, 20), (12, 14)), 'walls': ['red_brick', 'stone'], 'floors': ['grey_stone', 'cream_tile'],
        'light': 0x12100a, 'loot': 'study', 'books': ('study', (2, 3)), 'chests': (1, 2), 'stash': 0,
        'place': [
            ('north',  ['bookshelf_books'], (3, 4)),
            ('north',  ['banner_cloth_gold_emblem_tree'], 2),
            ('row',    [TABLE_LONG], 2),
            ('centre', ['chair_wood_padded', 'armchair_wood_red_slat_front_a'], (3, 5)),
            ('floor',  ['rug_oval_maroon_gold_trim'], 1),
        ],
        'slots': {'master': 'north'},
    },
    # W6: the noble hill's manor — a big house: two beds, books, a long table
    'manor': {
        'size': ((13, 16), (10, 12)), 'walls': ['mint', 'red_brick'], 'floors': ['checker', 'cream_tile'],
        'light': 0x1a1208, 'loot': 'home', 'books': ('home', (1, 2)), 'chests': (1, 2), 'stash': 1 / 3,
        'place': [
            ('floor',  ['rug_oval_maroon_gold_trim'], 1),
            ('north',  ['bed_double_red_a', 'bed_double_blue'], 2),
            ('north',  ['bookshelf_books'], (1, 2)),
            ('north',  ['dresser_wood_drawers', 'cabinet_wood_red_two_door_a'], 1),
            ('row',    [TABLE_LONG], 1),
            ('centre', ['armchair_wood_red_slat_front_a', 'chair_wood_padded'], (2, 3)),
            ('corner', ['potted_plant_flowering', 'potted_shrub_bush'], (2, 3)),
        ],
        'slots': {},
    },
    # W6: the city watch sleeps here — a row of beds, a table, stores
    'barracks': {
        'size': ((14, 17), (10, 12)), 'walls': ['stone'], 'floors': ['slate', 'grey_stone'],
        'light': 0x12100a, 'loot': 'larder', 'books': ('home', (0, 0)), 'chests': (1, 2), 'stash': 0,
        'place': [
            ('north',  ['bed_red_plain'], (3, 4)),
            ('row',    [TABLE_LONG], 1),
            ('centre', ['bench_wood_plain_a', 'bench_wood_plain_b'], (2, 3)),
            ('corner', ['barrel_a', 'wooden_barrel_a', 'market_crate_empty_c'], (2, 3)),
        ],
        'slots': {'sergeant': 'centre'},
    },
    # W6: the Hollow, a cave in the Wilds — boulders and mushrooms, a stash or two
    'cave': {
        'size': ((12, 15), (9, 11)), 'walls': ['stone'], 'floors': ['cobble'],
        'light': 0x050508, 'loot': 'stash', 'books': ('home', (0, 0)), 'chests': (2, 2), 'stash': 0,
        'place': [
            ('side',   ['boulder_large', 'gray_boulder_a', 'dark_rock_cluster', 'upright_boulder_gray_a'], (3, 5)),
            ('corner', ['dark_boulder_cluster_a', 'rock_pair_cluster_a', 'gray_boulder_b'], (2, 3)),
            ('centre', ['gray_boulder_b', 'mushroom_cluster_brown_a', 'rock_pair_cluster_a'], (1, 3)),
        ],
        'slots': {},
    },
}
