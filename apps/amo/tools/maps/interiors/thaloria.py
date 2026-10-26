"""Thaloria's interiors (W3, W6): every building in tools/maps/thaloria_layout.py that
has an `interior`, at its door, plus the inn's cellar. The four rooms W3 built (the
inn, its cellar, the bell tower, the teal house) keep their template and seed, so
their layouts do not change."""
from thaloria_layout import BUILDINGS, CELLAR, door_of

CITY = 'thaloria'
INTERIORS = [{**b['interior'], 'door': door_of(b)} for b in BUILDINGS if b['interior']] + [CELLAR]
