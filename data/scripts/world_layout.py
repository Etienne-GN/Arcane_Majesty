# W0 — the world map of Eldoria, drafted from the lore DB's positions (docs/3d/OPEN_WORLD_PLAN.md).
# Writes docs/3d/world/eldoria_layout.json (world metres: x east, z south; 1 DB unit = 5.5 m, origin at the map's
# centre) and docs/3d/world/eldoria_layout.png (a review map). The DB is only read (credentials read inside, never printed).
import json, re, base64, urllib.request, os
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
src = open(os.path.join(HERE, 'run_mcp_server.sh')).read()
var = lambda n: re.search(n + r'=["\']?([^"\'\n]+)', src).group(1)
auth = base64.b64encode(f"{var('NEO4J_USERNAME')}:{var('NEO4J_PASSWORD')}".encode()).decode()
def q(stmt):
    req = urllib.request.Request('http://192.168.0.159:7474/db/neo4j/tx/commit', data=json.dumps({'statements': [{'statement': stmt}]}).encode(), headers={'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth})
    return [x['row'] for x in json.load(urllib.request.urlopen(req, timeout=20))['results'][0]['data']]
rows = q("MATCH (l:Location) WHERE l.x IS NOT NULL OPTIONAL MATCH (l)-[:LOCATED_IN]->(p) RETURN l.name, l.origin, l.x, l.y, collect(p.name)")
SCALE, CX, CY = 5.5, 850, 565
W = lambda x, y: (round((x - CX) * SCALE), round((y - CY) * SCALE))
places = [{'name': n, 'origin': o, 'db': [x, y], 'world': W(x, y), 'in': [p for p in ins if p]} for n, o, x, y, ins in rows]
# Game places with no DB node, placed by their neighbours (DB units).
GAME = [("Thaloria Glade (Eldrin's Tower's vale)", 1210, 315), ('The East Road (Thalorian Wilds)', 1250, 200), ('Summit of Despair — the Approach', 1350, 230), ('The Citadel of Thaloria', 1100, 185), ('The Lower Town of Thaloria', 1100, 225)]
for n, x, y in GAME: places.append({'name': n, 'origin': 'game (no DB node)', 'db': [x, y], 'world': W(x, y), 'in': ['Thaloria']})
# Land features (unnamed, drafted): Thaloria's eastern range with the Summit pass; the Fire Gate's mountain; the river
# from the range through Thaloria's gorge down past the Silverrun to Lake Aethera; the east coast; the roads.
features = {
    'ranges': [{'what': "the Summit's range — an east–west ridge: the trail climbs its south flank from the Approach, crosses the Summit Pass, comes down the north flank to the river and the Sanctuary's bridge (as in the game)", 'db': [[1215, 178], [1290, 168], [1360, 182], [1400, 178], [1450, 165]]},
               {'what': "the Fire Gate's mountain (the Labyrinth inside)", 'db': [[1430, 70], [1470, 110], [1490, 150]]}],
    'rivers': [{'what': "the river along the range's northern foot (the Sanctuary's bridge), round its western end, through Thaloria's gorge, down past the Silverrun to Lake Aethera", 'db': [[1420, 140], [1330, 140], [1250, 150], [1190, 178], [1100, 193], [1040, 230], [980, 300], [850, 400], [700, 430], [600, 450]]}],
    'coast': {'what': 'the east coast (the Silver Coast)', 'db': [[1600, 260], [1570, 400], [1540, 550], [1560, 700], [1600, 820]]},
    'roads': [{'what': 'Thaloria → the East Road → the Approach', 'db': [[1100, 200], [1250, 200], [1350, 230]]},
              {'what': 'Thaloria → the Crossroads', 'db': [[1100, 225], [900, 420], [700, 550]]},
              {'what': 'the Crossroads → Port Silver', 'db': [[700, 550], [1100, 560], [1500, 550]]},
              {'what': 'the Crossroads → the Emerald Fields', 'db': [[700, 550], [450, 600], [200, 650]]},
              {'what': 'the Crossroads → Graywatch', 'db': [[700, 550], [900, 780], [1050, 950]]},
              {'what': 'the Crossroads → Duskmeet', 'db': [[700, 550], [550, 780], [400, 950]]}],
}
for group in ('ranges', 'rivers', 'roads'):
    for f in features[group]: f['world'] = [W(x, y) for x, y in f['db']]
features['coast']['world'] = [W(x, y) for x, y in features['coast']['db']]
# Settled with the user (2026-11-20): the Forbidden Archive is in the city, beneath the Citadel (DB corrected 900,120 →
# 1100,190); Eldrin's Tower stays south-east of the city as the DB has it — in the open world the glade lies that way,
# and the city's gate to it moves to that side.
issues = []
DECISIONS = ['The Forbidden Archive: in the city, beneath the Citadel (DB corrected 2026-11-20)', "Eldrin's Tower: south-east of Thaloria as the DB has it; the city's gate to the glade moves to that side in the open world"]
out = {'scale_m_per_db_unit': SCALE, 'origin_db': [CX, CY], 'axes': 'x east, z south (north is -z)', 'size_m': [round((1600 - 100) * SCALE), round((1100 - 40) * SCALE)], 'places': places, 'features': features, 'issues': issues, 'decisions': DECISIONS}
os.makedirs(os.path.join(ROOT, 'docs/3d/world'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'docs/3d/world/eldoria_layout.json'), 'w'), indent=1, ensure_ascii=False)
os.makedirs(os.path.join(ROOT, 'apps/amo3d/src/content/world'), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, 'apps/amo3d/src/content/world/eldoria_layout.json'), 'w'), indent=1, ensure_ascii=False)   # the game's copy (engine: content/world/eldoria.js)
# The review map: 1 px = 1 DB unit (+ margins); a km grid.
M = 60; img = Image.new('RGB', (1600 + M, 1100 + M), (18, 22, 28)); d = ImageDraw.Draw(img)
P = lambda x, y: (x - 40 + M // 2, y - 20 + M // 2)
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13); small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 11)
except Exception: font = small = ImageFont.load_default()
km = 1000 / SCALE
x = 40
while x < 1640: d.line([P(x, 20), P(x, 1120)], fill=(32, 38, 46)); x += km
y = 20
while y < 1120: d.line([P(40, y), P(1640, y)], fill=(32, 38, 46)); y += km
d.line(features['coast']['db'] and [P(*p) for p in features['coast']['db']], fill=(90, 150, 200), width=4)
for r in features['rivers']: d.line([P(*p) for p in r['db']], fill=(80, 140, 210), width=3)
for r in features['roads']: d.line([P(*p) for p in r['db']], fill=(170, 140, 90), width=2)
for r in features['ranges']:
    pts = [P(*p) for p in r['db']]
    d.line(pts, fill=(150, 150, 160), width=7)
    for a, b in zip(pts, pts[1:]):
        for t in (0.25, 0.75): mx, my = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t; d.polygon([(mx - 6, my + 5), (mx, my - 7), (mx + 6, my + 5)], fill=(190, 190, 200))
for p in places:
    x, y = P(*p['db']); c = (240, 200, 90) if p['origin'] == 'album' else (110, 190, 240) if p['origin'] == 'game' else (150, 230, 150)
    d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=c); d.text((x + 8, y - 7), p['name'], fill=(230, 230, 220), font=font)
for i in issues:
    x, y = P(*i['db']); d.ellipse([x - 11, y - 11, x + 11, y + 11], outline=(255, 90, 90), width=2)
d.text(P(50, 1060), f"Eldoria — W0 draft · 1 grid square = 1 km · {out['size_m'][0] / 1000:.1f} × {out['size_m'][1] / 1000:.1f} km · gold: album · blue: game (DB) · green: game (no DB node) · red ring: position in question", fill=(200, 200, 190), font=small)
d.text(P(50, 30), 'N ↑', fill=(220, 220, 220), font=font)
img.save(os.path.join(ROOT, 'docs/3d/world/eldoria_layout.png'))
print('places', len(places), 'size', out['size_m'])
