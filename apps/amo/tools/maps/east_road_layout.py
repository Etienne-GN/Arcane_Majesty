"""
The Thalorian Wilds' layout (W6): the East Road and its side paths, the clearings
kept open, the Still Pool and its stream, and the key spots of Chapter 3. Shared by
tools/maps/gen_east_road.py and tools/maps/interiors/east_road.py (the Hollow's
door). Tile coordinates on the 192x160 map.
"""
W, H = 192, 160
WEST_Y, EAST_Y = 80, 40                       # the road leaves the map on these rows (2 wide)
WEST_ARRIVAL = (2, 80)                        # from Thaloria's East Gate
EAST_ARRIVAL = (189, 40)                      # down from the Summit of Despair
# The road, 2 wide: straight legs, horizontal then vertical (gen_east_road.path)
ROAD = [(0, 80), (36, 80), (36, 72), (78, 72), (78, 62), (118, 62), (118, 50), (156, 50), (156, 40), (191, 40)]
SIDE_PATHS = [                                # 1 wide
    [(24, 82), (24, 110)],                    # south to the birch copse
    [(56, 71), (56, 40), (70, 40), (70, 28)], # north up the Monolith Rise
    [(100, 64), (100, 90)],                   # the spur to the Sentinel's clearing
    [(124, 52), (124, 86)],                   # south toward the pool, where it forks:
    [(124, 86), (84, 86), (84, 120)],         #   west to the broken watchtower
    [(124, 86), (166, 86), (166, 113)],       #   east over the ford to the Hollow
]
CLEARINGS = [                                 # (x0, y0, x1, y1) kept free of trees
    (0, 74, 10, 87),                          # the west entry
    (182, 34, 191, 46),                       # the east end, below the climb
    (18, 104, 50, 128),                       # the birch copse
    (62, 20, 78, 34),                         # the Monolith Rise
    (46, 66, 58, 71),                         # the waystone
    (92, 88, 110, 101),                       # the Sentinel's clearing
    (76, 116, 94, 132),                       # the broken watchtower
    (124, 84, 154, 110),                      # the Still Pool's shore
    (158, 102, 174, 118),                     # before the Hollow
    (166, 26, 184, 39),                       # the shepherd's lean-to
]
LAKE = (138, 98, 8)                           # the Still Pool: centre and radius
STREAM = [(147, 98), (190, 98)]               # 1 wide, east to the map edge; hop it
FORD = [(166, 98)]                            # stepping stones where the Hollow's path crosses
CAVE_DOOR = (166, 112)                        # the Hollow (its path ends on the tile below)
SPOTS = {
    'waystone': (52, 70), 'gate': (70, 26), 'copse_fire': (36, 116), 'sentinel': (101, 95),
    'leanto_fire': (178, 38), 'oren': (176, 38), 'leanto_sign': (171, 38),
    'page1': (44, 110), 'page2': (86, 124), 'page3': (128, 88),
}
LANDMARKS = [
    {'id': 'east_road_waystone', 'name': 'The Old Waystone', 'x': 52, 'y': 70, 'radius': 2, 'xp': 25},
    {'id': 'east_road_lean_to', 'name': "The Shepherd's Lean-to", 'x': 174, 'y': 38, 'radius': 3, 'xp': 25},
    {'id': 'east_road_birch_copse', 'name': 'The Birch Copse', 'x': 36, 'y': 114, 'radius': 4, 'xp': 20},
    {'id': 'east_road_monolith_rise', 'name': 'The Monolith Rise', 'x': 70, 'y': 29, 'radius': 3, 'xp': 20},
    {'id': 'east_road_sentinel_clearing', 'name': "The Sentinel's Clearing", 'x': 101, 'y': 97, 'radius': 4, 'xp': 20},
    {'id': 'east_road_broken_watchtower', 'name': 'The Broken Watchtower', 'x': 85, 'y': 122, 'radius': 4, 'xp': 20},
    {'id': 'east_road_still_pool', 'name': 'The Still Pool', 'x': 128, 'y': 92, 'radius': 4, 'xp': 20},
    {'id': 'east_road_the_ford', 'name': 'The Ford', 'x': 166, 'y': 99, 'radius': 2, 'xp': 15},
    {'id': 'east_road_the_hollow', 'name': 'The Hollow', 'x': 166, 'y': 114, 'radius': 3, 'xp': 20},
]
# Forest density (gen_east_road.py): trees where the noise (+ jitter) is above
# TREE_THRESHOLD; the deep stands (noise above DENSE_NOISE, 6+ tiles from a path)
# are the W5 dense layer. Tuned so 45–70% of the map is open ground.
TREE_THRESHOLD = 0.0
DENSE_NOISE = 0.2
