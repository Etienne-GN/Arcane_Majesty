# New Ravenspire (docs/3d/WORLD_PLAN.md): the Shadow Legion's gothic capital in the Scarlands, friendly for now.
# An octagonal curtain wall with towers, a main gate to the south-west (Graywatch) and one to the east (the Obsidian Gate),
# Seraphina's palace of dark spires in the middle, houses with dark slate roofs round it, lamps, its people.
# python3 tools/gen_new_ravenspire.py  →  src/content/regions/new_ravenspire.json
import json, math, os
R, ROOF, WALLC = 70, '#2a2630', 4
out = {'id': 'new_ravenspire', 'name': 'New Ravenspire', 'lore': 'The Shadow Legion\'s fortified capital, founded by Seraphina in Eldoria after the Great Darkness.',
       'seed': 1292, 'half': 105, 'water': -6, 'terrain': {'scale': 0.02, 'relief': 1.0, 'base': 0.6, 'rim': 0},
       'palette': {'grassA': '#3e4034', 'grassB': '#4c4c3c', 'dirt': '#4a4038', 'rock': '#4a464c', 'shore': '#4a4440', 'road': '#4a4448', 'paved': '#56525c', 'water': '#22262e'},
       'tints': [{'x': 0, 'z': 0, 'r': 66, 'color': '#4e4a54', 'k': 0.75}],
       'mood': {'fog': '#6a6470', 'fogNear': 40, 'fogFar': 300, 'fogMix': 0.5, 'light': 0.85, 'nightFloor': 0.45},
       'features': [{'type': 'clearing', 'x': 0, 'z': 0, 'r': 96}], 'buildings': [], 'props': [], 'signs': [], 'trees': {'count': 40}, 'rocks': {'count': 12},
       'gather': [], 'gates': [{'id': 'new_ravenspire_monolith', 'label': 'Monolith of New Ravenspire', 'x': -14, 'z': 26}],
       'actors': [], 'landmarks': [], 'links': [], 'people': []}
# the wall: an octagon, a keep at each corner; gaps for the gates (south-west, east)
SW, E = 3 * math.pi / 4, 0.0   # angles of the gates (x east, z south: south-west = (-x, +z))
pts = [(R * math.cos(math.pi / 8 + k * math.pi / 4), R * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)]
gate_mid = lambda a: (R * math.cos(math.pi / 8) * math.cos(a), R * math.cos(math.pi / 8) * math.sin(a))
for k in range(8):
    (ax, az), (bx, bz) = pts[k], pts[(k + 1) % 8]
    out['props'].append({'type': 'keep', 'x': round(ax, 1), 'z': round(az, 1), 'clear': 8})
    mx, mz, L = (ax + bx) / 2, (az + bz) / 2, math.hypot(bx - ax, bz - az)
    ang = math.atan2(mz, mx); ry = -math.atan2(bz - az, bx - ax)
    gated = min(abs(math.atan2(math.sin(ang - g), math.cos(ang - g))) for g in (SW, E)) < 0.2
    if gated:   # two wall pieces leaving a 10 m gateway, an umbral arch in it
        for s in (-1, 1):
            cx, cz = mx + s * (bx - ax) / L * (L / 4 + 2.5), mz + s * (bz - az) / L * (L / 4 + 2.5)
            out['props'].append({'type': 'stone_wall', 'x': round(cx, 1), 'z': round(cz, 1), 'ry': round(ry, 3), 'len': round(L / 2 - 5, 1)})
        out['props'].append({'type': 'umbral_arch', 'x': round(mx, 1), 'z': round(mz, 1), 'ry': round(ry, 3), 'len': 4})
    else: out['props'].append({'type': 'stone_wall', 'x': round(mx, 1), 'z': round(mz, 1), 'ry': round(ry, 3), 'len': round(L, 1)})
# Seraphina's palace: three dark spires, keeps round them, a hall
for (x, z, l) in [(0, -6, 7), (-9, 2, 5), (9, 2, 5)]: out['props'].append({'type': 'umbral_spire', 'x': x, 'z': z, 'len': l, 'clear': 6})
for a in range(6): out['props'].append({'type': 'umbral_column', 'x': round(16 * math.cos(a * math.pi / 3 + 0.5), 1), 'z': round(16 * math.sin(a * math.pi / 3 + 0.5), 1), 'len': 3})
out['buildings'].append({'x': 0, 'z': 14, 'w': 16, 'd': 8, 'h': 6, 'ry': 0, 'stone': True, 'roof': ROOF, 'wall': '#3a3644', 'timber': '#1e1a22', 'name': 'The Spire Hall of the Shadow Legion'})
out['landmarks'] += [{'name': "Seraphina's Spires", 'x': 0, 'z': -6, 'icon': 'tower'}, {'name': 'The Spire Hall', 'x': 0, 'z': 14, 'icon': 'house'}]
# the houses: a ring of streets between the palace and the wall (dark stone, steep slate roofs), a few named
named = {0: 'The Black Raven (inn)', 2: 'The Legion Armoury', 4: 'The Map-Maker', 6: 'The Guild Exchange', 8: 'The Herald\'s House'}
k = 0
for ring, n in ((34, 14), (52, 20)):
    for i in range(n):
        a = i / n * 2 * math.pi + (0.12 if ring == 52 else 0)
        if min(abs(math.atan2(math.sin(a - g), math.cos(a - g))) for g in (SW, E)) < (0.28 if ring == 52 else 0.33): continue   # the gate roads stay clear
        x, z = ring * math.cos(a), ring * math.sin(a)
        b = {'x': round(x, 1), 'z': round(z, 1), 'w': 6 + (i % 3), 'd': 5, 'h': 3.4 + (i % 2) * 1.2, 'ry': round(-a + math.pi / 2, 3), 'stone': True, 'roof': ROOF, 'wall': ['#4a4652', '#3e3a46', '#524e58'][i % 3], 'timber': '#1e1a22'}
        if ring == 34 and k in named: b['name'] = named[k]
        out['buildings'].append(b); k += 1
# lamps along the gate roads and round the palace
for g in (SW, E):
    for d in (20, 30, 42, 56): out['props'].append({'type': 'lamp', 'x': round(d * math.cos(g) + 3 * math.sin(g), 1), 'z': round(d * math.sin(g) - 3 * math.cos(g), 1)})
for a in range(8): out['props'].append({'type': 'lamp', 'x': round(22 * math.cos(a * math.pi / 4), 1), 'z': round(22 * math.sin(a * math.pi / 4), 1)})
out['path'] = [[round(80 * math.cos(SW), 1), round(80 * math.sin(SW), 1)], [round(30 * math.cos(SW), 1), round(30 * math.sin(SW), 1)], [0, 20], [30, 4], [80, 0]]
# its people (friendly): the inn, the merchants, the Legion's guards and herald
def near(name):
    b = next(b for b in out['buildings'] if b.get('name') == name); a = math.atan2(b['z'], b['x']); return b['x'] - 3.6 * math.cos(a), b['z'] - 3.6 * math.sin(a), a + math.pi
P = out['people']
x, z, f = near('The Black Raven (inn)'); P.append({'name': 'Innkeeper of the Black Raven', 'role': 'innkeeper', 'price': 12, 'x': round(x, 1), 'z': round(z, 1), 'facing': round(f, 3), 'greeting': 'A bed under the Spires, a fire, no questions. The Legion pays its debts here, and so do travellers.'})
x, z, f = near('The Legion Armoury'); P.append({'name': 'Legion Quartermaster', 'role': 'merchant', 'catalog': 'armourer', 'archetype': 'soldier', 'colors': {'torso': {'base': '#2a2436'}}, 'x': round(x, 1), 'z': round(z, 1), 'facing': round(f, 3), 'greeting': 'Black steel, made for the Rift\'s things. Outsiders pay full price — for now.'})
x, z, f = near('The Map-Maker'); P.append({'name': 'The Map-Maker', 'role': 'merchant', 'catalog': 'cartographer', 'x': round(x, 1), 'z': round(z, 1), 'facing': round(f, 3), 'greeting': 'Maps of the Scarlands, the Rift\'s edges — and a few of the other side, for those with the stomach.'})
x, z, f = near('The Guild Exchange'); P.append({'name': 'Exchange Factor', 'role': 'merchant', 'catalog': 'guild', 'x': round(x, 1), 'z': round(z, 1), 'facing': round(f, 3), 'greeting': 'Goods from both worlds pass through this hall. Mind the prices; mind the company.'})
P.append({'name': 'Market Trader', 'role': 'merchant', 'x': -6, 'z': 24, 'facing': 3.14, 'greeting': 'Bread, salt, oil, rope. Even a Legion eats.'})
x, z, f = near("The Herald's House"); P.append({'name': 'Herald of the Legion', 'role': 'soldier', 'archetype': 'soldier', 'colors': {'torso': {'base': '#2a2436'}}, 'x': round(x, 1), 'z': round(z, 1), 'facing': round(f, 3), 'lines': [
    'Seraphina led our people out of the dark through the Rift. We built these walls with what we carried.',
    'The Great Rift still bleeds: things from the other side crawl out of it. The bounty is good for any you put down.',
    'The Obsidian Gate stands to the east. The Legion guards it, but travellers may pass — at their own risk.',
    'Outsiders are welcome while they keep the peace. The Legion remembers who helps it.']})
for g in (SW, E):
    gx, gz = gate_mid(g)
    for s in (-1, 1):
        P.append({'name': 'Legion Gate-Warden', 'role': 'guard', 'archetype': 'soldier', 'colors': {'torso': {'base': '#2a2436'}}, 'x': round(gx * 0.9 + s * 6 * math.sin(g), 1), 'z': round(gz * 0.9 - s * 6 * math.cos(g), 1), 'facing': round(-g + math.pi / 2 + math.pi, 3),
                  'lines': ['Pass, traveller. Keep your blade sheathed inside the walls.', 'The Rift\'s things grow bolder after dark. Stay on the road.']})
gx, gz = gate_mid(SW)
out['signs'].append({'x': round(gx * 0.82, 1), 'z': round(gz * 0.82 + 4, 1), 'text': "NEW RAVENSPIRE — seat of the Shadow Legion. Founded by Seraphina after the Great Darkness. Inside: the Black Raven (inn), the Legion Armoury, the Map-Maker, the Guild Exchange. East gate: the road to the Obsidian Gate. South: the Great Rift — keep to the road."})
out['start'] = {'x': round(gx * 1.12, 1), 'z': round(gz * 1.12, 1), 'facing': round(-SW + math.pi / 2 + math.pi, 3)}
path = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'regions', 'new_ravenspire.json')
json.dump(out, open(path, 'w'), indent=1)
print('wrote', path, len(out['buildings']), 'buildings', len(out['props']), 'props', len(P), 'people')
