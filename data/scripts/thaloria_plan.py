#!/usr/bin/env python3
"""Thaloria's city plan (docs/3d/THALORIA_CITY.md, stage T1) — deterministic.

The scholar-city on a hill above the Silverrun's gorge: the college on the crown, the crooked bell tower beside it, a
market square at mid-hill, the temple on its own square, four gates (East — the book's road east; South — the Lower
Town; West — toward the glade's road; North — the bridge over the gorge to the Citadel's stair), an irregular wall ring
with round towers, streets that wind and climb and converge (no grid, no right angle), houses terraced wall to wall
along them in narrow plots with yards behind.

Coordinates: metres, local to the city's anchor in the world (eldoria.js CITY); x east, z south; the gorge runs along
the north (z < -50). Writes apps/amo3d/src/content/world/thaloria_plan.json and docs/3d/world/thaloria_plan.png.
"""
import json, math, os, random
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
R = random.Random(1100)   # Thaloria's DB x — the same city every run

# ---------- the hill and the wall ring ----------
C = (0.0, 95.0)                        # the ring's middle
CROWN = (12.0, 22.0)                   # the hill's crown: the college (near the gorge, above the Citadel's cliff)
HILL_H, HILL_R = 36.0, 250.0
KNOLL = (-100.0, 62.0)                 # the temple's knoll
def _n(x, z):   # a little value noise (deterministic)
    def h(i, j): v = math.sin(i * 127.1 + j * 311.7) * 43758.5453; return v - math.floor(v)
    i, j = math.floor(x), math.floor(z); fx, fz = x - i, z - j; ux, uz = fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)
    return (h(i, j) * (1 - ux) + h(i + 1, j) * ux) * (1 - uz) + (h(i, j + 1) * (1 - ux) + h(i + 1, j + 1) * ux) * uz
def ground(x, z):
    """The city's hill (metres above its lowest street): the crown (the college) high above the gorge, the temple's
    knoll west of it with a hollow between, the land falling south and east toward the Lower Town and the river."""
    d = math.hypot(x - CROWN[0], (z - CROWN[1]) * 0.8)
    h = HILL_H * max(0.0, 1 - (d / HILL_R) ** 1.35)
    h += 9 * math.exp(-((x - KNOLL[0]) ** 2 + (z - KNOLL[1]) ** 2) / 45 ** 2)                  # the knoll
    h -= 5 * math.exp(-((x + 50) ** 2 / 30 ** 2 + (z - 60) ** 2 / 55 ** 2))                    # the hollow between
    h += 3.5 * math.exp(-((x - CROWN[0]) ** 2 + (z - CROWN[1]) ** 2) / 26 ** 2)               # the rock under the college
    h += (_n(x * 0.035, z * 0.035) - 0.5) * 3.0                                                 # the ground's own unevenness
    h -= max(0.0, (x - 60) * 0.03) + max(0.0, (z - 150) * 0.05)                                # falling away east and south
    return h + 2.0

def ring_r(a):
    """The wall's radius at angle a (radians, from C): an ellipse that wanders, flattened along the gorge (north)."""
    base = 1 / math.sqrt((math.cos(a) / 172) ** 2 + (math.sin(a) / 150) ** 2)
    wob = 1 + 0.05 * math.sin(3 * a + 1.3) + 0.035 * math.sin(5 * a + 0.4) + 0.02 * math.sin(9 * a + 2.1)
    r = base * wob
    zz = C[1] + math.sin(a) * r
    if zz < -48: r = (-48 - C[1]) / math.sin(a) + 4 * math.sin(7 * a)   # the gorge's south bank
    return r
WALL = [(C[0] + math.cos(a) * ring_r(a), C[1] + math.sin(a) * ring_r(a)) for a in [i / 180 * 2 * math.pi for i in range(180)]]
def wall_at(a, inset=0.0):
    r = ring_r(a) - inset
    return (C[0] + math.cos(a) * r, C[1] + math.sin(a) * r)
def inside(x, z, margin=0.0):
    a = math.atan2(z - C[1], x - C[0])
    return math.hypot(x - C[0], z - C[1]) < ring_r(a) - margin

GATES = {'east': -0.08, 'south': math.pi / 2 + 0.12, 'west': math.pi - 0.18, 'north': -math.pi / 2 + 0.06}
gates = {k: {'x': wall_at(a)[0], 'z': wall_at(a)[1], 'a': a} for k, a in GATES.items()}
# towers every ~50 m along the ring, never in a gateway
towers, acc, prev = [], 0.0, WALL[0]
for p in WALL[1:] + WALL[:1]:
    acc += math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p
    if acc > 50:
        a = math.atan2(p[1] - C[1], p[0] - C[0])
        if all(abs(math.atan2(math.sin(a - g), math.cos(a - g))) > 0.12 for g in GATES.values()):
            towers.append(p); acc = 0.0

# ---------- squares and landmarks ----------
MARKET = (-18.0, 118.0)
TEMPLE_SQ = (-95.0, 70.0)
SQUARES = [{'name': 'market', 'x': MARKET[0], 'z': MARKET[1], 'r': 24}, {'name': 'temple', 'x': TEMPLE_SQ[0], 'z': TEMPLE_SQ[1], 'r': 14},
           {'name': 'college', 'x': CROWN[0] + 4, 'z': CROWN[1] + 40, 'r': 12}, {'name': 'east_gate', 'x': 128, 'z': 92, 'r': 10}]
# kind, id, x, z, w (along its front), d (depth), a (facing: the angle of its front's normal), interior
LANDMARKS = [
    ('college', 'college', CROWN[0], CROWN[1], 62, 48, math.pi / 2, None),            # the college: library hall + cloister, facing its square
    ('bell_tower', 'bell_tower', CROWN[0] + 40, CROWN[1] + 18, 8, 8, math.pi / 2, 'thaloria_bell_tower'),
    ('temple', 'temple', TEMPLE_SQ[0], TEMPLE_SQ[1] - 24, 18, 36, math.pi / 2, 'thaloria_temple'),
    ('market_hall', 'market_hall', MARKET[0], MARKET[1], 26, 12, math.pi / 2, 'thaloria_market_hall'),
    ('guild_hall', 'guild_hall', CROWN[0] - 52, CROWN[1] + 36, 22, 14, math.pi / 2 - 0.3, 'thaloria_guild_hall'),   # the Archivists' Guild, by the college
    ('manor', 'manor', CROWN[0] + 82, CROWN[1] + 2, 24, 18, math.pi * 0.75, 'thaloria_manor'),
    ('barracks', 'barracks', gates['north']['x'] - 36, gates['north']['z'] + 26, 26, 12, math.pi / 2 + 0.3, 'thaloria_barracks'),
    ('inn', 'inn', 112, 108, 20, 14, math.pi, 'thaloria_inn'),                       # by the East Gate: travellers
]

# ---------- streets ----------
def bez(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0], u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1]))
    return out
def inward(g, d):
    a = GATES[g]; return (gates[g]['x'] - math.cos(a) * d, gates[g]['z'] - math.sin(a) * d)
STREETS = []
def street(pts, w, kind): STREETS.append({'pts': [(round(x, 1), round(z, 1)) for x, z in pts], 'w': w, 'kind': kind})
# the high street: East Gate, a long climbing curve, the market, on up to the college's square
street(bez((gates['east']['x'], gates['east']['z']), inward('east', 40), (60, 140), (MARKET[0] + 22, MARKET[1] + 4)), 7, 'high')
street(bez((MARKET[0], MARKET[1] - 22), (-30, 80), (5, 75), (CROWN[0] + 4, CROWN[1] + 52)), 6, 'high')
street(bez((gates['south']['x'], gates['south']['z']), inward('south', 35), (-5, 170), (MARKET[0] + 2, MARKET[1] + 24)), 6, 'main')
street(bez((gates['west']['x'], gates['west']['z']), inward('west', 30), (-120, 110), (MARKET[0] - 24, MARKET[1])), 6, 'main')
street(bez((gates['north']['x'], gates['north']['z']), inward('north', 18), (-40, 0), (CROWN[0] - 30, CROWN[1] + 30)), 5, 'main')
street(bez((MARKET[0] - 20, MARKET[1] - 12), (-55, 95), (-75, 85), (TEMPLE_SQ[0] + 12, TEMPLE_SQ[1] + 6)), 5, 'street')
street(bez((TEMPLE_SQ[0], TEMPLE_SQ[1] - 12), (-90, 40), (-60, 30), (CROWN[0] - 32, CROWN[1] + 22)), 4, 'street')
# a lane following the wall's inside, broken where it meets the gates' streets
ring = [wall_at(a, 16) for a in [i / 120 * 2 * math.pi for i in range(121)]]
street(ring, 3.5, 'lane')
# lanes: each joins a point on one street to the nearest point of another, 25–80 m away, in a gentle curve — never
# through a landmark or a square, never alongside another lane (the blocks between them hold the houses)
BLOCKERS = [(x, z, max(w, d) / 2 + 6) for k, i, x, z, w, d, a, _ in LANDMARKS] + [(q['x'], q['z'], q['r'] + 3) for q in SQUARES]
def blocked(px, pz): return any(math.hypot(px - bx, pz - bz) < br for bx, bz, br in BLOCKERS)
def nearest_on(pts, x, z):
    best = (1e9, None)
    for i in range(len(pts) - 1):
        (ax, az), (bx, bz) = pts[i], pts[i + 1]; dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1
        t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L2)); px, pz = ax + dx * t, az + dz * t
        d = math.hypot(x - px, z - pz)
        if d < best[0]: best = (d, (px, pz))
    return best
lanes_mid = []
for s0 in list(STREETS):
    pts = s0['pts']
    for i in range(2, len(pts) - 2, 3):
        x, z = pts[i]
        best = None
        for s1 in STREETS:
            if s1 is s0: continue
            d, q = nearest_on(s1['pts'], x, z)
            if 20 < d < 110 and (not best or d < best[0]): best = (d, q)
        if not best: continue
        q = best[1]; mx, mz = (x + q[0]) / 2, (z + q[1]) / 2
        if any(math.hypot(mx - a, mz - b) < 17 for a, b in lanes_mid): continue
        dx, dz = q[0] - x, q[1] - z; L = math.hypot(dx, dz); off = R.uniform(-0.18, 0.18) * L
        c1 = (x + dx / 3 - dz / L * off, z + dz / 3 + dx / L * off); c2 = (x + 2 * dx / 3 - dz / L * off, z + 2 * dz / 3 + dx / L * off)
        path = bez((x, z), c1, c2, q, 12)
        if any(blocked(px, pz) or not inside(px, pz, 10) for px, pz in path[1:-1]): continue
        lanes_mid.append((mx, mz)); street(path, R.choice([2.6, 3, 3.4]), 'lane')

# infill: wherever a spot lies more than 32 m from any street, a lane through it joins the streets on either side
def sdist(x, z):
    return min(nearest_on(t['pts'], x, z)[0] for t in STREETS)
for _ in range(40):
    best = None
    for gx in range(-170, 175, 10):
        for gz in range(-45, 250, 10):
            if not inside(gx, gz, 14) or blocked(gx, gz): continue
            d = sdist(gx, gz)
            if d > 32 and (not best or d > best[0]): best = (d, gx, gz)
    if not best: break
    _, x, z = best
    hits = sorted(((nearest_on(t['pts'], x, z), t) for t in STREETS), key=lambda h: h[0][0])
    A = hits[0][0][1]; aA = math.atan2(A[1] - z, A[0] - x)
    B = next((h[0][1] for h in hits[1:] if abs(math.atan2(math.sin(math.atan2(h[0][1][1] - z, h[0][1][0] - x) - aA), math.cos(math.atan2(h[0][1][1] - z, h[0][1][0] - x) - aA))) > 2.0), None)
    if not B: BLOCKERS.append((x, z, 20)); continue
    path = bez(A, ((A[0] + x) / 2 + R.uniform(-6, 6), (A[1] + z) / 2 + R.uniform(-6, 6)), ((B[0] + x) / 2 + R.uniform(-6, 6), (B[1] + z) / 2 + R.uniform(-6, 6)), B, 14)
    if any(blocked(px, pz) for px, pz in path[2:-2]): BLOCKERS.append((x, z, 20)); continue
    street(path, R.choice([2.6, 3, 3.4]), 'lane')

# ---------- plots: houses terraced along every street ----------
def seg_dist(px, pz, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dz * dz or 1
    t = max(0, min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / L2))
    return math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t)
def street_dist(x, z):
    best = 1e9
    for s in STREETS:
        p = s['pts']
        for i in range(len(p) - 1): best = min(best, seg_dist(x, z, p[i], p[i + 1]) - s['w'] / 2)
    return best
def corners(x, z, w, d, a):   # a: the front's outward normal angle; w along the front, d into the plot
    fx, fz = math.cos(a), math.sin(a); rx, rz = -fz, fx
    return [(x + rx * w / 2 + fx * d / 2, z + rz * w / 2 + fz * d / 2), (x - rx * w / 2 + fx * d / 2, z - rz * w / 2 + fz * d / 2),
            (x - rx * w / 2 - fx * d / 2, z - rz * w / 2 - fz * d / 2), (x + rx * w / 2 - fx * d / 2, z + rz * w / 2 - fz * d / 2)]
def overlap(A, B):   # separating axes, two convex quads
    for poly in (A, B):
        for i in range(4):
            (x1, z1), (x2, z2) = poly[i], poly[(i + 1) % 4]; nx, nz = z2 - z1, x1 - x2
            pa = [nx * x + nz * z for x, z in A]; pb = [nx * x + nz * z for x, z in B]
            if max(pa) < min(pb) or max(pb) < min(pa): return False
    return True
taken = []   # quads already used (landmarks, squares as boxes, houses) — and a 20 m grid of them
grid = {}
def take(q):
    taken.append(q); cx = sum(p[0] for p in q) / 4; cz = sum(p[1] for p in q) / 4
    grid.setdefault((int(cx // 20), int(cz // 20)), []).append(q)
def clashes(q, x, z):
    gx, gz = int(x // 20), int(z // 20)
    return any(overlap(q, T) for dx in (-2, -1, 0, 1, 2) for dz in (-2, -1, 0, 1, 2) for T in grid.get((gx + dx, gz + dz), ()))
for k, i, x, z, w, d, a, _ in LANDMARKS: take(corners(x, z, w + 4, d + 4, a))
for sq in SQUARES:
    for k in range(8): take(corners(sq['x'], sq['z'], sq['r'] * 2, sq['r'] * 2, k * math.pi / 8))   # (round: eight turned boxes)
def quarter(x, z):
    if math.hypot(x - CROWN[0], z - CROWN[1]) < 95: return 'scholars'
    if math.hypot(x - MARKET[0], z - MARKET[1]) < 70: return 'market'
    if math.hypot(x - TEMPLE_SQ[0], z - TEMPLE_SQ[1]) < 60: return 'temple'
    if x > 70: return 'gate'
    if z > 160: return 'crafts'
    return 'town'
PLOTS = []
for s in STREETS:
    pts = s['pts']; half = s['w'] / 2
    for side in (1, -1):
        carry = 0.0
        for i in range(len(pts) - 1):
            (ax, az), (bx, bz) = pts[i], pts[i + 1]; L = math.hypot(bx - ax, bz - az)
            if L < 0.5: continue
            ux, uz = (bx - ax) / L, (bz - az) / L; nx, nz = -uz * side, ux * side
            t = carry
            while t < L:
                w = R.uniform(5, 8.5); placed = False
                for d in (R.uniform(11, 15), 9.5, 7.5):   # deep plots where there is room, shallower where there is not
                    cx, cz = ax + ux * (t + w / 2), az + uz * (t + w / 2)
                    x, z = cx + nx * (half + 0.4 + d / 2), cz + nz * (half + 0.4 + d / 2)
                    a = math.atan2(-nz, -nx)   # its front faces the street
                    q = corners(x, z, w, d, a)
                    if all(inside(px, pz, 6) for px, pz in q) and street_dist(x, z) > d / 2 - 0.9 and not clashes(q, x, z):
                        take(q); qt = quarter(x, z); placed = True
                        PLOTS.append({'x': round(x, 1), 'z': round(z, 1), 'w': round(w, 1), 'd': round(d, 1), 'a': round(a, 3), 'storeys': R.choice([2, 2, 3, 3, 3, 4] if qt in ('scholars', 'market') else [2, 2, 2, 3]), 'quarter': qt})
                        break
                t += (w if placed else 2.0) + (R.choice([0, 0, 0, 0, 0.6]) if placed else 0)   # terraced: wall to wall, now and then a passage
            carry = t - L
# plain interiors: on houses in the right quarters (the doors face their streets)
WANT = [('thaloria_smithy', 'crafts'), ('thaloria_alchemist', 'market'), ('thaloria_house_market_a', 'market'), ('thaloria_house_noble_a', 'scholars'),
        ('thaloria_house_low_a', 'town'), ('thaloria_house_low_c', 'crafts'), ('thaloria_house_low_e', 'town'), ('thaloria_house_teal', 'temple')]
used = set()
for iid, qt in WANT:
    cand = [i for i, p in enumerate(PLOTS) if p['quarter'] == qt and i not in used and p['w'] > 6.5] or [i for i in range(len(PLOTS)) if i not in used]
    i = R.choice(cand); used.add(i); PLOTS[i]['interior'] = iid

for st_ in STREETS:
    p = st_['pts']; seg = [math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]) or 0.01 for i in range(len(p) - 1)]
    if st_["kind"] in ("high", "main"):   # carts climb them: a ramp held to 16% (steep, as hill towns' streets are), the ground cut and walled along it
        h = [ground(*q) for q in p]
        for i in range(1, len(h)): h[i] = max(h[i - 1] - 0.16 * seg[i - 1], min(h[i - 1] + 0.16 * seg[i - 1], h[i]))
        for i in range(len(h) - 2, -1, -1): h[i] = max(h[i + 1] - 0.16 * seg[i], min(h[i + 1] + 0.16 * seg[i], h[i]))
        st_['bed'] = [round(v, 2) for v in h]; st_['stairs'] = []
    else:   # lanes and streets: where they climb steeper than 14%, stairs (per segment)
        st_['stairs'] = [i for i in range(len(p) - 1) if abs(ground(*p[i + 1]) - ground(*p[i])) / seg[i] > 0.14]
plan = {'about': 'Thaloria city plan (data/scripts/thaloria_plan.py); local metres, x east, z south', 'crown': CROWN, 'hill': {'h': HILL_H, 'r': HILL_R},
        'wall': [(round(x, 1), round(z, 1)) for x, z in WALL], 'towers': [(round(x, 1), round(z, 1)) for x, z in towers], 'gates': gates,
        'squares': SQUARES, 'streets': STREETS, 'landmarks': [{'kind': k, 'id': i, 'x': x, 'z': z, 'w': w, 'd': d, 'a': round(a, 3), 'interior': it} for k, i, x, z, w, d, a, it in LANDMARKS],
        'plots': PLOTS}
json.dump(plan, open(os.path.join(ROOT, 'apps/amo3d/src/content/world/thaloria_plan.json'), 'w'))

# ---------- the plan, drawn for review ----------
S, PAD = 2.2, 40
X0, Z0 = -200, -80
W_, H_ = int(400 * S + 2 * PAD), int(360 * S + 2 * PAD)
img = Image.new('RGB', (W_, H_), (232, 222, 196)); g = ImageDraw.Draw(img)
P = lambda x, z: (PAD + (x - X0) * S, PAD + (z - Z0) * S)
for zz in range(-80, 280, 2):   # the hill: hillshade (light from the north-west) and a contour every 2 m
    for xx in range(-200, 200, 2):
        h = ground(xx, zz); sh = (ground(xx - 2, zz - 2) - h) * 9; c = int(150 + h * 2.4 + sh)
        col = (min(255, c), min(255, c - 4), min(255, c - 30))
        if int(h / 2) != int(ground(xx + 2, zz) / 2) or int(h / 2) != int(ground(xx, zz + 2) / 2): col = (110, 95, 70) if int(h / 2) % 5 else (80, 64, 44)
        g.rectangle([P(xx, zz), P(xx + 2, zz + 2)], fill=col)
g.rectangle([P(-200, -80), P(200, -52)], fill=(120, 150, 170))   # the gorge
g.text(P(-190, -74), 'the gorge (the Silverrun) — the Citadel beyond', fill=(30, 40, 60))
for s in STREETS:
    g.line([P(*p) for p in s['pts']], fill=(206, 190, 150), width=max(2, int(s['w'] * S)))
    for i in s.get('stairs', []):   # stairs: hatched across the street
        (ax, az), (bx, bz) = s['pts'][i], s['pts'][i + 1]; L = math.hypot(bx - ax, bz - az) or 1; nx, nz = -(bz - az) / L * s['w'] / 2, (bx - ax) / L * s['w'] / 2
        for k in range(0, 5): t = k / 4; cx, cz = ax + (bx - ax) * t, az + (bz - az) * t; g.line([P(cx + nx, cz + nz), P(cx - nx, cz - nz)], fill=(90, 70, 50), width=1)
for sq in SQUARES: g.ellipse([P(sq['x'] - sq['r'], sq['z'] - sq['r']), P(sq['x'] + sq['r'], sq['z'] + sq['r'])], fill=(214, 200, 166))
QC = {'scholars': (120, 124, 140), 'market': (150, 120, 96), 'temple': (130, 110, 130), 'gate': (140, 126, 104), 'crafts': (128, 112, 92), 'town': (136, 128, 116)}
for p in PLOTS:
    q = corners(p['x'], p['z'], p['w'], p['d'], p['a']); g.polygon([P(*c) for c in q], fill=QC[p['quarter']], outline=(60, 50, 40))
    if p.get('interior'): g.ellipse([P(p['x'] - 2, p['z'] - 2), P(p['x'] + 2, p['z'] + 2)], fill=(200, 40, 30))
for L in plan['landmarks']:
    q = corners(L['x'], L['z'], L['w'], L['d'], L['a']); g.polygon([P(*c) for c in q], fill=(70, 74, 96), outline=(20, 20, 30))
    g.text(P(L['x'] - L['w'] / 2, L['z'] - 3), L['id'].replace('_', ' '), fill=(250, 245, 230))
g.line([P(*p) for p in WALL + WALL[:1]], fill=(70, 66, 60), width=int(2.2 * S))
for t in towers: g.ellipse([P(t[0] - 4, t[1] - 4), P(t[0] + 4, t[1] + 4)], fill=(80, 76, 70))
for k, v in gates.items():
    g.rectangle([P(v['x'] - 5, v['z'] - 5), P(v['x'] + 5, v['z'] + 5)], fill=(160, 60, 40)); g.text(P(v['x'] + 7, v['z'] - 4), f'{k} gate', fill=(120, 30, 20))
g.text((PAD, H_ - 30), f"Thaloria — plan T1 · relief {min(ground(x, z) for x, z in WALL):.0f}–{max(ground(p['x'], p['z']) for p in PLOTS):.0f} m (contour 2 m; dark every 10 m; hatched: stairs) · {len(PLOTS)} houses · {len(plan['landmarks'])} landmarks · {len(towers)} towers · grid 1 px = {1 / S:.2f} m · red dot: a house you can enter", fill=(40, 30, 20))
img.save(os.path.join(ROOT, 'docs/3d/world/thaloria_plan.png'))
print('houses', len(PLOTS), 'streets', len(STREETS), 'towers', len(towers), 'quarters', {q: sum(1 for p in PLOTS if p['quarter'] == q) for q in QC})
