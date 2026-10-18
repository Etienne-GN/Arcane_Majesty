"""Thaloria's interiors (W3). `door` is the tile on the city map; `fallback` the
street tile in front of it (used only when the return stack is empty)."""

CITY = 'thaloria'

INTERIORS = [
    {'id': 'thaloria_inn', 'template': 'inn', 'seed': 1, 'displayName': 'Thaloria — the Inn',
     'door': (5, 16), 'label': 'Enter the Inn', 'currencyBias': 'neutral',
     'slot_doors': {'cellar': {'interior': 'thaloria_inn_cellar', 'label': 'Down to the cellar', 'look': 'hatch'}}},
    {'id': 'thaloria_inn_cellar', 'template': 'cellar', 'seed': 2, 'displayName': 'Thaloria — the Inn\'s cellar',
     'parent': 'thaloria_inn', 'label': 'Cellar'},
    {'id': 'thaloria_bell_tower', 'template': 'tower', 'seed': 3, 'displayName': 'Thaloria — the Bell Tower',
     'door': (11, 6), 'label': 'Enter the Bell Tower'},
    {'id': 'thaloria_house_teal', 'template': 'house', 'seed': 4, 'displayName': 'Thaloria — a house',
     'door': (21, 16), 'label': 'A house',
     'locked': {'flag': 'thaloria_house_teal_open', 'text': 'Locked. No one answers.'}},
]
