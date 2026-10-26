#!/usr/bin/env python3
"""
Generates interior maps (W3) from tools/maps/interiors/templates.py and each
city's specs (tools/maps/interiors/<city>.py) into src/data/maps/interiors/,
plus interiors/index.js (merged into getMap's registry).

Room layout (w x h tiles, walls included):
  row 0        cap (wall top), black or the style's cap art   — collision
  rows 1-2     north wall face (LPC wall tiles)               — collision
  rows 3..h-2  floor, cols 1..w-2
  row h-1      south wall (black) with a one-tile opening at the centre — the exit
  cols 0, w-1  side walls (black)                             — collision
The player enters on (cx, h-2) facing up; the exit portal sits in the opening.
Every slot, chest, book and NPC must be reachable from the entrance, or the
seed is rejected and the next one tried.

Run from apps/amo/: python3 tools/maps/gen_interiors.py
index.js lists only the cities generated in this run, so always run it for every city (the default).
Preview one: python3 tools/maps/render_map_preview.py thaloria_inn out.png
"""
import importlib
import json
import random
import sys
from collections import deque
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from sheetmap import SheetMap, tiles_js, AMO  # noqa: E402
from interiors.templates import TEMPLATES, WALLS, FLOORS, NEVER_BLOCK, TALL_LEAN, COUNTER, LOOT, BOOKS, BOOK_HOLDERS  # noqa: E402

OUT = AMO / 'src/data/maps/interiors'
ATLASES = ['lpc/obj_misk_atlas', 'lpc/build_atlas', 'lpc/base_out_atlas', 'lpc/terrain_atlas']
_probe = SheetMap()


def find_sheet(name):
    hits = [a for a in ATLASES if name in _probe.catalogue(a)[1]]
    if not hits:
        raise KeyError(f'{name}: not in any LPC atlas')
    return hits[0]


def size_of(name):
    return _probe.size_tiles(find_sheet(name), name)


def blocks(name):
    return name not in NEVER_BLOCK


class Room:
    def __init__(self, spec, tpl, rng):
        self.spec, self.tpl, self.rng = spec, tpl, rng
        (wmin, wmax), (hmin, hmax) = tpl['size']
        self.w, self.h = rng.randint(wmin, wmax), rng.randint(hmin, hmax)
        self.cx = self.w // 2
        self.tiles = [[1] * self.w for _ in range(self.h)]
        for y in range(3, self.h - 1):
            for x in range(1, self.w - 1):
                self.tiles[y][x] = 0
        self.tiles[self.h - 1][self.cx] = 0        # the opening
        self.taken = set()                         # floor cells blocked by furniture
        self.keep = {(self.cx, self.h - 1), (self.cx, self.h - 2), (self.cx, self.h - 3)}  # entrance lane
        self.items, self.slots, self.chests, self.books = [], {}, [], []

    def floor(self):
        return [(x, y) for y in range(3, self.h - 1) for x in range(1, self.w - 1)]

    def free(self, x, y):
        return self.tiles[y][x] == 0 and (x, y) not in self.taken and (x, y) not in self.keep

    def reachable(self):
        start, seen, q = (self.cx, self.h - 2), {(self.cx, self.h - 2)}, deque([(self.cx, self.h - 2)])
        while q:
            x, y = q.popleft()
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < self.w and 0 <= ny < self.h and (nx, ny) not in seen \
                        and self.tiles[ny][nx] == 0 and (nx, ny) not in self.taken:
                    seen.add((nx, ny))
                    q.append((nx, ny))
        return seen

    def touchable(self, cell, reach):
        x, y = cell
        return any(n in reach for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x, y)))

    def place(self, name, x, y, lean=0):
        """(x, y) is the first floor cell the piece stands on; its sprite is drawn from row y - lean
        (a leaning shelf's top rows cover the wall face). Occupies rows y .. y + ht - lean - 1.
        Undone if it cuts the room in two."""
        wt, ht = size_of(name)
        cells = [(x + dx, y + dy) for dx in range(wt) for dy in range(ht - lean)]
        if not all(0 < cx < self.w - 1 and 3 <= cy < self.h - 1 and self.free(cx, cy) for cx, cy in cells):
            return False
        if blocks(name):
            self.taken.update(cells)
            reach = self.reachable()
            floor_free = [c for c in self.floor() if c not in self.taken]
            if len([c for c in floor_free if c in reach]) < len(floor_free):
                self.taken.difference_update(cells)
                return False
        self.items.append({'name': name, 'x': x, 'y': y - lean, 'blocking': blocks(name)})
        return True

    def spots(self, rule, wt, ht):
        f = [(x, y) for (x, y) in self.floor()]
        if rule == 'north':
            return [(x, 3) for x in range(1, self.w - wt)]
        if rule == 'side':
            return [(1, y) for y in range(4, self.h - ht - 1)] + [(self.w - 1 - wt, y) for y in range(4, self.h - ht - 1)]
        if rule == 'corner':
            return [(1, 3), (self.w - 1 - wt, 3), (1, self.h - 1 - ht), (self.w - 1 - wt, self.h - 1 - ht)]
        if rule in ('centre', 'row', 'floor'):
            return [(x, y) for (x, y) in f if 2 <= x <= self.w - 2 - wt and 4 <= y <= self.h - 2 - ht]
        raise ValueError(rule)

    def put(self, rule, name):
        wt, ht = size_of(name)
        lean = TALL_LEAN.get(name, 0) if rule == 'north' else 0
        if rule == 'floor':
            x, y = self.rng.choice(self.spots('floor', wt, ht))
            self.items.append({'name': name, 'x': x, 'y': y, 'blocking': False})
            return True
        spots = self.spots(rule, wt, ht)
        self.rng.shuffle(spots)
        return any(self.place(name, x, y, lean) for x, y in spots)

    def put_row(self, group):
        wt = sum(size_of(n)[0] for n in group)
        spots = self.spots('row', wt, 1)
        self.rng.shuffle(spots)
        for x, y in spots:
            xs, ok_all, placed = x, True, []
            for n in group:
                if not self.place(n, xs, y):
                    ok_all = False
                    break
                placed.append(self.items[-1])
                xs += size_of(n)[0]
            if ok_all:
                return True
            for it in placed:                       # roll back a partial row
                self.items.remove(it)
                w_, h_ = size_of(it['name'])
                self.taken.difference_update({(it['x'] + dx, it['y'] + dy) for dx in range(w_) for dy in range(h_)})
        return False

    def slot(self, key, rule):
        if rule == 'counter':
            y = 5
            x0 = 2
            if not all(self.free(x, y) for x in range(x0, x0 + len(COUNTER))):
                return False
            for i, n in enumerate(COUNTER):
                self.place(n, x0 + i, y)
            self.slots[key] = (x0 + 1, y - 1)   # behind the counter
            self.keep.add(self.slots[key])
            return True
        spots = self.spots('corner' if rule == 'corner' else rule, 1, 1)
        self.rng.shuffle(spots)
        for x, y in spots:
            if self.free(x, y):
                self.slots[key] = (x, y)
                self.keep.add((x, y))
                return True
        return False


def count(c, rng):
    return rng.randint(*c) if isinstance(c, tuple) else c


def build(spec, seed):
    tpl = TEMPLATES[spec['template']]
    rng = random.Random(seed)
    room = Room(spec, tpl, rng)
    for key, rule in tpl['slots'].items():
        if not room.slot(key, rule):
            return None
    for rule, choices, n in tpl['place']:
        for _ in range(count(n, rng)):
            if rule == 'row':
                room.put_row(rng.choice(choices))
            else:
                room.put(rule, rng.choice(choices))
    # Containers and books against walls, stash in a corner
    wall_cells = [c for c in room.floor() if room.free(*c) and (c[0] in (1, room.w - 2) or c[1] == 3)]
    rng.shuffle(wall_cells)
    for _ in range(count(tpl['chests'], rng)):
        if wall_cells:
            x, y = wall_cells.pop()
            room.taken.add((x, y))
            room.chests.append({'x': x, 'y': y, 'items': rng.sample(LOOT[tpl['loot']], 2)})
    # Books lie on furniture (the sign is invisible; the shelf or table is its art),
    # on a cell you can stand beside. A room with no such furniture gets no book.
    pool, nb = tpl['books']
    reach = room.reachable()
    holders = []
    for it in room.items:
        if it['blocking'] and it['name'] in BOOK_HOLDERS:
            wt, ht = size_of(it['name'])
            holders += [(it['x'] + dx, it['y'] + dy) for dx in range(wt) for dy in range(ht)
                        if (it['x'] + dx, it['y'] + dy) in room.taken and room.touchable((it['x'] + dx, it['y'] + dy), reach)]
    rng.shuffle(holders)
    used = set()
    for i in range(count(nb, rng)):
        cell = next((c for c in holders if c not in used), None)
        if cell is None:
            break
        used.add(cell)
        room.books.append({'x': cell[0], 'y': cell[1], 'kind': 'book', 'text': BOOKS[pool][i % len(BOOKS[pool])]})
    if rng.random() < tpl['stash'] and wall_cells:
        x, y = wall_cells.pop()
        room.taken.add((x, y))
        room.chests.append({'x': x, 'y': y, 'hidden': True, 'items': rng.sample(LOOT['stash'], 2)})
    # Everything reachable?
    reach = room.reachable()
    for cell in [*room.slots.values(), *[(c['x'], c['y']) for c in room.chests], *[(b['x'], b['y']) for b in room.books]]:
        if not room.touchable(cell, reach):
            return None
    return room


def emit(spec, room, parents):
    tpl = TEMPLATES[spec['template']]
    rng = room.rng
    sm = SheetMap()
    floor_names = FLOORS[rng.choice(tpl['floors'])]
    for (x, y) in room.floor() + [(room.cx, room.h - 1)]:
        n = rng.choice(floor_names)
        sm.add(find_sheet(n), n, x, y, blocking=False, depthOffset=-100000)
    upper, lower, cap = WALLS[rng.choice(tpl['walls'])]
    for x in range(1, room.w - 1):
        sm.add(find_sheet(upper), upper, x, 1, blocking=False)
        sm.add(find_sheet(lower), lower, x, 2, blocking=False)
        if cap:
            sm.add(find_sheet(cap), cap, x, 0, blocking=False)
    for it in room.items:
        sm.add(find_sheet(it['name']), it['name'], it['x'], it['y'], blocking=it['blocking'])

    doors = []
    reach = room.reachable()
    for key, d in spec.get('slot_doors', {}).items():
        x, y = room.slots[key]
        # Face the door from an open, reachable floor tile beside it: that tile is
        # where you come back up (interiors.doorReturnPoint). 'up' = you stand south.
        facing = next((f for f, (nx, ny) in (('up', (x, y + 1)), ('down', (x, y - 1)), ('left', (x + 1, y)), ('right', (x - 1, y)))
                       if (nx, ny) in reach and room.tiles[ny][nx] == 0), None)
        if facing is None:
            raise SystemExit(f"{spec['id']}: door slot {key} at {x},{y} has no open tile beside it")
        doors.append({'x': x, 'y': y, 'interior': d['interior'], 'label': d['label'], 'facing': facing, **({'look': d['look']} if 'look' in d else {})})
    if spec.get('parent'):
        p = parents[spec['parent']]
        fb = {'map': p['city'], 'x': p['door'][0], 'y': p['door'][1] + 1}
    else:
        fb = {'map': spec['city'], 'x': spec['door'][0], 'y': spec['door'][1] + 1}
    const = spec['id'].upper()
    spawns = {
        'enemies': [], 'npcs': spec.get('npcs', []), 'chests': room.chests, 'campfires': [], 'signs': room.books,
        'gatheringNodes': [], 'crackedBoulders': [], 'riftGates': [], 'pillarGates': [], 'boss': None,
        'stations': [{**s, 'x': room.slots[s['slot']][0], 'y': room.slots[s['slot']][1]} for s in spec.get('stations', [])],
        'doors': doors,
    }
    for s in spawns['stations']:
        s.pop('slot', None)
    js = f"""// AUTO-GENERATED by tools/maps/gen_interiors.py — {spec['id']} (template {spec['template']}, seed {spec['_seed']}).
// Edit tools/maps/interiors/{spec['city']}.py or templates.py and regenerate; do not edit by hand.

const {const}_EXTRA_SHEETS = {sm.extra_sheets_js()};

const {const}_SHEET_DECORATIONS = {sm.sheet_decorations_js()};

export const MAP = {{
    id: {json.dumps(spec['id'])},
    displayName: {json.dumps(spec['displayName'])},
    biome: 'indoor',
    interior: true,
    treeArt: false,
    backgroundColor: '#000000',
    lightTint: {tpl['light']:#08x},
    tiles: {tiles_js(room.tiles)},
    tileset: {{ key: 'tileset_base', floorFrame: -1, pathFrame: -1 }},
    playerStart: {{ x: {room.cx}, y: {room.h - 2} }},
    exitFallback: {json.dumps(fb)},
    extraSheets: {const}_EXTRA_SHEETS,
    sheetDecorations: {const}_SHEET_DECORATIONS,
    portals: [{{ id: {json.dumps(spec['id'] + '_exit')}, x: {room.cx}, y: {room.h - 1}, label: 'Leave', targetMap: '__return', targetX: 0, targetY: 0 }}],
    spawns: {json.dumps(spawns, indent=4)},
    currencyBias: {json.dumps(spec.get('currencyBias', 'outskirt'))},
    music: null,
    quests: [],
    chapterTitle: null,
    introDialogue: null,
    introRegistryKey: null,
}};
"""
    (OUT / f"{spec['id']}.js").write_text(js)


def main(cities):
    OUT.mkdir(parents=True, exist_ok=True)
    specs = []
    for city in cities:
        mod = importlib.import_module(f'interiors.{city}')
        for s in mod.INTERIORS:
            specs.append({**s, 'city': mod.CITY})
    parents = {s['id']: s for s in specs}
    places = {}
    for spec in specs:
        for k in range(40):
            room = build(spec, spec['seed'] * 1000 + k)
            if room:
                spec['_seed'] = spec['seed'] * 1000 + k
                emit(spec, room, parents)
                places[spec['id']] = {**{key: list(xy) for key, xy in room.slots.items()}, 'entry': [room.cx, room.h - 2]}
                print(f"{spec['id']}: {room.w}x{room.h}, {len(room.items)} pieces, {len(room.chests)} chests, {len(room.books)} books (seed {spec['_seed']})")
                break
        else:
            raise SystemExit(f"{spec['id']}: no valid layout in 40 seeds — loosen the template")
    ids = sorted(s['id'] for s in specs)
    lines = [f"import {{ MAP as {i.upper()} }} from './{i}.js';" for i in ids]
    lines.append('')
    lines.append('// AUTO-GENERATED by tools/maps/gen_interiors.py')
    lines.append('export const INTERIORS = {')
    lines += [f'    {i}: {i.upper()},' for i in ids]
    lines.append('};')
    (OUT / 'index.js').write_text('\n'.join(lines) + '\n')
    # The doors on the city maps, for the city generators to read
    (OUT / 'doors.json').write_text(json.dumps({
        s['city']: [] for s in specs} | {city: [
            {'x': s['door'][0], 'y': s['door'][1], 'interior': s['id'], 'label': s['label'],
             **({'locked': s['locked']} if 'locked' in s else {})}
            for s in specs if s['city'] == city and 'door' in s] for city in {s['city'] for s in specs}}, indent=2))
    # Each room's work spots (template slots) and entry tile, for W4 townsfolk places
    (OUT / 'places.json').write_text(json.dumps(places, indent=2, sort_keys=True))


if __name__ == '__main__':
    main(sys.argv[1:] or ['thaloria', 'east_road'])
