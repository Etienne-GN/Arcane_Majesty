# The Emerald Fields' village (docs/3d/WORLD_PLAN.md: the Eldorian starter zone, "the Fields' village, grown"): an inn,
# a general store, an armourer's smithy, a training yard and its trainer, the elder, farmers, a well, fields — east of the
# Weeping Stones, between the hill and the lake, a road to the Fields' entrance. Unnamed for now (names: canon check).
# Re-runnable: removes what it added before (tag 'village').  python3 tools/gen_fields_village.py
import json, math, os
P = os.path.join(os.path.dirname(__file__), '..', 'src', 'content', 'regions', 'emerald_fields.json')
d = json.load(open(P))
for k in ('buildings', 'props', 'people', 'signs', 'roads'): d[k] = [x for x in d.get(k, []) if not (isinstance(x, dict) and x.get('tag') == 'village')]
CX, CZ, T = 60, 16, {'tag': 'village'}
B = lambda **k: {**k, **T}
house = dict(stone=False, roof='#7a3a2a', wall='#d8ccb0', timber='#4a3220')
d['buildings'] += [
    B(x=CX - 10, z=CZ - 8, w=9, d=6, h=4.2, ry=0, **{**house, 'roof': '#6a2e22'}, name='The inn'),
    B(x=CX + 6, z=CZ - 9, w=7, d=5, h=3.4, ry=0, **house, name='The general store'),
    B(x=CX + 14, z=CZ + 4, w=6, d=6, h=3.4, ry=-1.5708, stone=True, roof='#3a3430', name="The armourer's smithy"),
    B(x=CX - 14, z=CZ + 8, w=6, d=5, h=3.2, ry=1.5708, **house, name="The elder's house"),
    B(x=CX + 2, z=CZ + 16, w=7, d=5, h=3.2, ry=3.1416, **{**house, 'roof': '#8a5a2a'}),
    B(x=CX - 4, z=CZ + 24, w=6, d=5, h=3.0, ry=3.1416, **{**house, 'roof': '#8a5a2a'}),
]
d['props'] += [B(type='well', x=CX, z=CZ), B(type='stall', x=CX - 3, z=CZ + 5, ry=0), B(type='stall', x=CX + 4, z=CZ + 5, ry=0), B(type='cart', x=CX + 9, z=CZ - 2, ry=0.6),
               B(type='chimney', x=CX + 16, z=CZ + 6)]
for a in range(6): d['props'].append(B(type='lamp', x=round(CX + 11 * math.cos(a * math.pi / 3 + 0.3), 1), z=round(CZ + 11 * math.sin(a * math.pi / 3 + 0.3), 1)))
# the training yard: a fenced ring, posts to strike
yx, yz = CX + 2, CZ - 22
for i in range(8): a = i / 8 * 2 * math.pi; d['props'].append(B(type='fence', x=round(yx + 8 * math.cos(a), 1), z=round(yz + 8 * math.sin(a), 1), ry=round(-a + math.pi / 2, 3), len=6))
for (dx, dz) in [(-3, -2), (0, 2), (3, -2)]: d['props'].append(B(type='column', x=yx + dx, z=yz + dz))
# the fields round it: fenced plots
for (fx, fz) in [(CX + 12, CZ + 30), (CX - 26, CZ + 26)]:
    for i in range(4): a = i * math.pi / 2; d['props'].append(B(type='fence', x=round(fx + 7 * math.cos(a), 1), z=round(fz + 7 * math.sin(a), 1), ry=round(-a + math.pi / 2, 3), len=14))
d['people'] += [
    B(name='Innkeeper', role='innkeeper', price=6, x=CX - 10, z=CZ - 4.4, facing=3.1416, greeting='Welcome, traveller — first night\'s half price for anyone new to the Fields. Rest up; the road wants you fresh.'),
    B(name='Storekeeper', role='merchant', x=CX + 6, z=CZ - 5.9, facing=3.1416, greeting='Rope, rations, a good knife. Everything a new adventurer forgets until they need it.'),
    B(name='Village Armourer', role='merchant', catalog='armourer', x=CX + 10.6, z=CZ + 4, facing=-1.5708, greeting='Padded, leather, a little mail for the brave. Start light; you\'ll learn what you need.'),
    B(name='Yard Trainer', role='soldier', archetype='soldier', x=yx, z=yz + 5, facing=3.1416, lines=[
        'Every adventurer starts here. Strike the posts, learn your stance — your style grows with every blow you land.',
        'Two hands, two tools: a blade and a shield, a staff and a spell, a bow and a quiver. Try them all before you choose.',
        'When the posts bore you, the wolves in the eastern woods won\'t. Go carefully past the lake.',
        'The road north leads to the Crossroads and the wider world. Come back when you\'ve earned a few scars.']),
    B(name='Village Elder', role='civilian', x=CX - 10.4, z=CZ + 8, facing=-1.5708, lines=[
        'New to the Fields? Then listen: the stones in the circle west of here weep for something old. Don\'t disturb them.',
        'A cabin stands alone in the north-west, swept clean though nobody lives there. Leave it be — some stories are not ours.',
        'Farmers need help with the beasts that come at night. Ask around; there\'s always work for willing hands.',
        'When you\'re ready, the Monolith by the Fields\' gate will carry you further — once you\'ve touched it.']),
    B(name='Farmer', role='farmer', x=CX + 12, z=CZ + 25, facing=0, wander=4, lines=['Rabbits in the cabbages again. If you\'ve a sling, I\'ve a copper or two.', 'Good soil, the Fields. Better than the Scarlands, they say.']),
    B(name='Farmer', role='farmer', x=CX - 24, z=CZ + 20, facing=0, wander=4, lines=['The Guardians of the Wild keep the woods. Don\'t mistake them for beasts — and don\'t let them mistake you.']),
]
d['signs'].append(B(x=CX - 4, z=CZ - 16, text='THE FIELDS\' VILLAGE — rest at the inn, gear at the store and the smithy, practice at the training yard. North: the road to the Crossroads. West: the Weeping Stones (let them be).'))
d['roads'] = d.get('roads', []) + [B(pts=[[0, -70], [20, -46], [40, -22], [CX - 4, CZ - 14], [CX, CZ]], w=3)]
d['spawns'] = {**d.get('spawns', {}), 'village': {'x': CX, 'z': CZ - 5, 'facing': 3.1416}}   # a new adventurer's start in Eldoria
json.dump(d, open(P, 'w'), indent=1)
print('village added:', sum(1 for b in d['buildings'] if b.get('tag') == 'village'), 'buildings,', sum(1 for p in d['people'] if p.get('tag') == 'village'), 'people')
