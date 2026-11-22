#!/usr/bin/env python3
"""The two Ravenspires as cities of Thaloria's scale (asked 2026-11-22: "look at Thaloria! It's this kind of city we want").

Same method as thaloria_plan.py: an irregular wall ring with towers and gatehouses, a crown with the great building and
its square, a market, winding streets from the gates converging on them, a lane along the wall, lanes and infill between,
houses terraced wall to wall along every street. Written as region files the engine builds (engine/region.js):

  new  — New Ravenspire (Eldoria, the Scarlands): the Shadow Legion's gothic capital, friendly. Dark stone and black slate,
         Seraphina's palace of spires on the crown, the Spire Hall of the Legion, the inn, the armoury, the exchange, lamps.
  old  — old Ravenspire (Nythoria, the twin of the Citadel's cliff): the same kind of city, fallen at 0 GD — houses as
         broken shells, the wall breached, the towers fallen, the palace a ruin; the great hall's inscription.
python3 data/scripts/ravenspire_plan.py  →  apps/amo3d/src/content/regions/{new,old}_ravenspire.json
"""
import json, math, os, random
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def build(mode):
    R = random.Random(1292 if mode == 'new' else 165)
    RX, RZ = (165, 150) if mode == 'new' else (158, 146)
    CROWN = (0.0, -18.0)
    def ring_r(a): return 1 / math.sqrt((math.cos(a) / RX) ** 2 + (math.sin(a) / RZ) ** 2) * (1 + 0.05 * math.sin(3 * a + 1.3) + 0.035 * math.sin(5 * a + 0.4) + 0.02 * math.sin(9 * a + 2.1))
    def wall_at(a, inset=0.0): r = ring_r(a) - inset; return (math.cos(a) * r, math.sin(a) * r)
    def inside(x, z, m=0.0): return math.hypot(x, z) < ring_r(math.atan2(z, x)) - m
    WALL = [wall_at(i / 120 * 2 * math.pi) for i in range(120)]
    GATES = {'southwest': 3 * math.pi / 4, 'east': -0.05, 'south': math.pi / 2 - 0.15} if mode == 'new' else {'south': math.pi / 2 + 0.1, 'east': 0.1, 'west': math.pi - 0.1}
    gates = {k: {'x': wall_at(a)[0], 'z': wall_at(a)[1], 'a': a} for k, a in GATES.items()}
    near_gate = lambda a, w=0.1: any(abs(math.atan2(math.sin(a - g), math.cos(a - g))) < w for g in GATES.values())
    MARKET = (-30.0, 58.0); PALACE_SQ = (CROWN[0], CROWN[1] + 48)
    SQUARES = [{'name': 'palace', 'x': PALACE_SQ[0], 'z': PALACE_SQ[1], 'r': 20}, {'name': 'market', 'x': MARKET[0], 'z': MARKET[1], 'r': 22}]
    # kind, name, x, z, w, d, a
    LM = [('palace', "Seraphina's Palace" if mode == 'new' else 'The fallen palace', CROWN[0], CROWN[1], 58, 46, math.pi / 2),
          ('hall', 'The Spire Hall of the Legion' if mode == 'new' else 'The great hall, open to the eclipse', 62, 6, 26, 16, math.pi * 0.8),
          ('inn', 'The Black Raven (inn)', 70, 72, 20, 14, math.pi), ('armoury', 'The Legion Armoury', -78, 18, 18, 12, 0.2),
          ('exchange', 'The Guild Exchange', -8, 92, 18, 12, -math.pi / 2), ('herald', "The Herald's House", 34, 52, 14, 10, math.pi * 0.6),
          ('mapmaker', 'The Map-Maker', -64, 70, 12, 10, -0.3)]
    if mode == 'old': LM = LM[:2] + [('chapel', 'The broken chapel', -70, 40, 18, 26, 0.3)]
    def bez(p0, p1, p2, p3, n=22):
        return [((1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0] + 3 * (1 - t) * t * t * p2[0] + t ** 3 * p3[0], (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1] + 3 * (1 - t) * t * t * p2[1] + t ** 3 * p3[1]) for t in (i / n for i in range(n + 1))]
    inward = lambda g, d: (gates[g]['x'] - math.cos(GATES[g]) * d, gates[g]['z'] - math.sin(GATES[g]) * d)
    STREETS = []
    def street(pts, w, kind): STREETS.append({'pts': [(round(x, 1), round(z, 1)) for x, z in pts], 'w': w, 'kind': kind})
    gl = list(GATES)
    street(bez((gates[gl[0]]['x'], gates[gl[0]]['z']), inward(gl[0], 40), (MARKET[0] - 30, MARKET[1] + 10), (MARKET[0] - 20, MARKET[1])), 7, 'high')
    street(bez((MARKET[0] + 20, MARKET[1] - 6), (MARKET[0] + 30, 40), (PALACE_SQ[0] - 10, PALACE_SQ[1] + 30), (PALACE_SQ[0], PALACE_SQ[1] + 18)), 7, 'high')
    street(bez((gates[gl[1]]['x'], gates[gl[1]]['z']), inward(gl[1], 40), (70, 40), (PALACE_SQ[0] + 18, PALACE_SQ[1] + 4)), 6, 'main')
    street(bez((gates[gl[2]]['x'], gates[gl[2]]['z']), inward(gl[2], 35), (MARKET[0] + 30, 110), (MARKET[0] + 6, MARKET[1] + 20)), 6, 'main')
    street(bez((MARKET[0] - 18, MARKET[1] - 12), (-70, 20), (-50, -10), (PALACE_SQ[0] - 20, PALACE_SQ[1] - 6)), 5, 'street')
    street([wall_at(i / 100 * 2 * math.pi, 14) for i in range(101)], 3.5, 'lane')
    BLOCK = [(x, z, max(w, d) / 2 + 6) for k, n, x, z, w, d, a in LM] + [(q['x'], q['z'], q['r'] + 3) for q in SQUARES]
    blocked = lambda px, pz: any(math.hypot(px - bx, pz - bz) < br for bx, bz, br in BLOCK)
    def nearest_on(pts, x, z):
        best = (1e9, None)
        for i in range(len(pts) - 1):
            (ax, az), (bx, bz) = pts[i], pts[i + 1]; dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1
            t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L2)); px, pz = ax + dx * t, az + dz * t; d = math.hypot(x - px, z - pz)
            if d < best[0]: best = (d, (px, pz))
        return best
    mids = []
    for s0 in list(STREETS):
        for i in range(2, len(s0['pts']) - 2, 3):
            x, z = s0['pts'][i]; best = None
            for s1 in STREETS:
                if s1 is s0: continue
                d, q = nearest_on(s1['pts'], x, z)
                if 20 < d < 100 and (not best or d < best[0]): best = (d, q)
            if not best: continue
            q = best[1]; mx, mz = (x + q[0]) / 2, (z + q[1]) / 2
            if any(math.hypot(mx - a, mz - b) < 17 for a, b in mids): continue
            dx, dz = q[0] - x, q[1] - z; L = math.hypot(dx, dz); off = R.uniform(-0.18, 0.18) * L
            path = bez((x, z), (x + dx / 3 - dz / L * off, z + dz / 3 + dx / L * off), (x + 2 * dx / 3 - dz / L * off, z + 2 * dz / 3 + dx / L * off), q, 12)
            if any(blocked(px, pz) or not inside(px, pz, 10) for px, pz in path[1:-1]): continue
            mids.append((mx, mz)); street(path, R.choice([2.6, 3, 3.4]), 'lane')
    def sdist(x, z): return min(nearest_on(t['pts'], x, z)[0] for t in STREETS)
    for _ in range(36):
        best = None
        for gx in range(-170, 175, 10):
            for gz in range(-160, 165, 10):
                if not inside(gx, gz, 14) or blocked(gx, gz): continue
                d = sdist(gx, gz)
                if d > 30 and (not best or d > best[0]): best = (d, gx, gz)
        if not best: break
        _, x, z = best
        hits = sorted(((nearest_on(t['pts'], x, z), t) for t in STREETS), key=lambda h: h[0][0]); A = hits[0][0][1]; aA = math.atan2(A[1] - z, A[0] - x)
        B = next((h[0][1] for h in hits[1:] if abs(math.atan2(math.sin(math.atan2(h[0][1][1] - z, h[0][1][0] - x) - aA), math.cos(math.atan2(h[0][1][1] - z, h[0][1][0] - x) - aA))) > 2.0), None)
        if not B: BLOCK.append((x, z, 20)); continue
        path = bez(A, ((A[0] + x) / 2 + R.uniform(-6, 6), (A[1] + z) / 2 + R.uniform(-6, 6)), ((B[0] + x) / 2 + R.uniform(-6, 6), (B[1] + z) / 2 + R.uniform(-6, 6)), B, 14)
        if any(blocked(px, pz) for px, pz in path[2:-2]): BLOCK.append((x, z, 20)); continue
        street(path, R.choice([2.6, 3, 3.4]), 'lane')
    # plots
    def corners(x, z, w, d, a):
        fx, fz = math.cos(a), math.sin(a); rx, rz = -fz, fx
        return [(x + rx * w / 2 + fx * d / 2, z + rz * w / 2 + fz * d / 2), (x - rx * w / 2 + fx * d / 2, z - rz * w / 2 + fz * d / 2), (x - rx * w / 2 - fx * d / 2, z - rz * w / 2 - fz * d / 2), (x + rx * w / 2 - fx * d / 2, z + rz * w / 2 - fz * d / 2)]
    def overlap(A, B):
        for poly in (A, B):
            for i in range(4):
                (x1, z1), (x2, z2) = poly[i], poly[(i + 1) % 4]; nx, nz = z2 - z1, x1 - x2
                pa = [nx * x + nz * z for x, z in A]; pb = [nx * x + nz * z for x, z in B]
                if max(pa) < min(pb) or max(pb) < min(pa): return False
        return True
    grid = {}
    def take(q): cx = sum(p[0] for p in q) / 4; cz = sum(p[1] for p in q) / 4; grid.setdefault((int(cx // 20), int(cz // 20)), []).append(q)
    clashes = lambda q, x, z: any(overlap(q, T) for dx in (-2, -1, 0, 1, 2) for dz in (-2, -1, 0, 1, 2) for T in grid.get((int(x // 20) + dx, int(z // 20) + dz), ()))
    def street_dist(x, z):
        best = 1e9
        for s in STREETS:
            p = s['pts']
            for i in range(len(p) - 1):
                (ax, az), (bx, bz) = p[i], p[i + 1]; dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1; t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L2))
                best = min(best, math.hypot(x - ax - dx * t, z - az - dz * t) - s['w'] / 2)
        return best
    for k, n, x, z, w, d, a in LM: take(corners(x, z, w + 4, d + 4, a))
    for sq in SQUARES:
        for k in range(8): take(corners(sq['x'], sq['z'], sq['r'] * 2, sq['r'] * 2, k * math.pi / 8))
    PLOTS = []
    for s in STREETS:
        pts = s['pts']; half = s['w'] / 2
        for side in (1, -1):
            carry = 0.0
            for i in range(len(pts) - 1):
                (ax, az), (bx, bz) = pts[i], pts[i + 1]; L = math.hypot(bx - ax, bz - az)
                if L < 0.5: continue
                ux, uz = (bx - ax) / L, (bz - az) / L; nx, nz = -uz * side, ux * side; t = carry
                while t < L:
                    w = R.uniform(5.5, 9); placed = False
                    for d in (R.uniform(11, 15), 9.5, 7.5):
                        cx, cz = ax + ux * (t + w / 2), az + uz * (t + w / 2); x, z = cx + nx * (half + 0.4 + d / 2), cz + nz * (half + 0.4 + d / 2); a = math.atan2(-nz, -nx)
                        q = corners(x, z, w, d, a)
                        if all(inside(px, pz, 6) for px, pz in q) and street_dist(x, z) > d / 2 - 0.9 and not clashes(q, x, z):
                            take(q); placed = True; near = math.hypot(x - CROWN[0], z - CROWN[1]) < 90
                            PLOTS.append({'x': round(x, 1), 'z': round(z, 1), 'w': round(w, 1), 'd': round(d, 1), 'a': a, 'storeys': R.choice([3, 3, 4, 4] if near else [2, 2, 3, 3])}); break
                    t += (w if placed else 2.0) + (R.choice([0, 0, 0, 0, 0.6]) if placed else 0)
                carry = t - L
    # ---------- the region file ----------
    half = 205 if mode == 'new' else 195
    def ry(a): return round(-a + math.pi / 2, 3)   # a plot's front normal angle → the region's building rotation (its front, +z local, facing the street)
    out = {'id': f'{mode}_ravenspire', 'name': 'New Ravenspire' if mode == 'new' else 'Ravenspire (the ruins)', 'seed': 1292 if mode == 'new' else 165, 'half': half, 'water': -8,
           'lore': "The Shadow Legion's fortified capital, founded by Seraphina in Eldoria after the Great Darkness." if mode == 'new' else 'The Resistance\'s stronghold before the Great Darkness; it fell at 0 GD.',
           'terrain': {'scale': 0.012, 'relief': 1.2, 'base': 0.6, 'rim': 0},
           'features': [{'type': 'clearing', 'x': 0, 'z': 0, 'r': half - 8}, {'type': 'hill', 'x': CROWN[0], 'z': CROWN[1], 'r': 120, 'h': 9}],
           'palette': ({'grassA': '#3e4034', 'grassB': '#4c4c3c', 'dirt': '#4a4038', 'rock': '#4a464c', 'shore': '#4a4440', 'road': '#4a4448', 'paved': '#585462', 'water': '#22262e'} if mode == 'new'
                       else {'grassA': '#55525e', 'grassB': '#625e6c', 'dirt': '#46424c', 'rock': '#3a3640', 'shore': '#3a3640', 'road': '#4a4652', 'paved': '#504c5a', 'water': '#141218'}),
           'tints': [], 'mood': {'fog': '#6a6470', 'fogNear': 40, 'fogFar': 320, 'fogMix': 0.5, 'light': 0.85, 'nightFloor': 0.45},
           'buildings': [], 'props': [], 'signs': [], 'roads': [], 'people': [], 'trees': {'count': 30 if mode == 'new' else 60}, 'rocks': {'count': 10},
           'gather': [], 'gates': [], 'actors': [], 'landmarks': [], 'links': [], 'undergrowth': 0.2}
    for s in STREETS: out['roads'].append({'pts': s['pts'], 'w': s['w'], 'kind': 'paved' if s['kind'] in ('high', 'main', 'street') else 'road'})
    WALLS = ['#4a4652', '#3e3a46', '#524e58', '#46424e']
    if mode == 'new':
        for i, p in enumerate(PLOTS): out['buildings'].append({'x': p['x'], 'z': p['z'], 'w': p['w'], 'd': p['d'], 'h': round(p['storeys'] * 3.1, 1), 'ry': ry(p['a']), 'stone': True, 'roof': '#24202c', 'wall': WALLS[i % 4], 'timber': '#1a1620', 'chimney': i % 3 == 0})
        for k, n, x, z, w, d, a in LM[1:]: out['buildings'].append({'x': x, 'z': z, 'w': w, 'd': d, 'h': 7.5 if k == 'hall' else 6, 'ry': ry(a), 'stone': True, 'roof': '#1e1a26', 'wall': '#3a3644', 'timber': '#16121c', 'name': n})
    else:
        RW = ['#6a6674', '#5e5a68', '#726e7c', '#625e6c']
        for i, p in enumerate(PLOTS):   # a broken shell: its walls standing to uneven heights, roofless; a heap of its fallen stone now and then
            out['buildings'].append({'x': p['x'], 'z': p['z'], 'w': p['w'], 'd': p['d'], 'h': round(p['storeys'] * 3.1, 1), 'ry': ry(p['a']), 'roofType': 'ruin', 'wall': RW[i % 4], 'timber': '#3a3640', 'seed': i + 1})
            if i % 6 == 0: out['props'].append({'type': 'heap', 'x': p['x'], 'z': p['z']})
    # the wall ring: stretches between towers (breached in the old city), towers, gatehouses
    acc, prev, segs = 0.0, WALL[0], []
    pts = WALL + WALL[:1]
    for i in range(len(pts) - 1):
        (ax, az), (bx, bz) = pts[i], pts[i + 1]; L = math.hypot(bx - ax, bz - az); a = math.atan2((az + bz) / 2, (ax + bx) / 2)
        if near_gate(a, 0.06): continue
        if mode == 'old' and (i % 13 in (4, 5)): out['props'].append({'type': 'heap', 'x': round((ax + bx) / 2, 1), 'z': round((az + bz) / 2, 1)}); continue   # a breach
        out['props'].append({'type': 'stone_wall' if mode == 'new' else 'ruin_wall', 'x': round((ax + bx) / 2, 1), 'z': round((az + bz) / 2, 1), 'ry': round(-math.atan2(bz - az, bx - ax), 3), 'len': round(L + 0.6, 1), 'dark': True})
    for i in range(0, 120, 10):
        a = i / 120 * 2 * math.pi
        if near_gate(a, 0.14): continue
        x, z = wall_at(a)
        if mode == 'new': out['props'].append({'type': 'keep', 'x': round(x, 1), 'z': round(z, 1), 'clear': 7})
        else: out['buildings'].append({'x': round(x, 1), 'z': round(z, 1), 'w': 8, 'd': 8, 'h': 18, 'ry': round(a, 3), 'roofType': 'ruin', 'wall': '#5a5664', 'timber': '#3a3640', 'seed': 900 + i})   # a tower, snapped
    for g, v in gates.items():
        a = v['a']; tx, tz = -math.sin(a), math.cos(a)
        for sd in (-1, 1): out['props'].append({'type': 'keep' if mode == 'new' else 'ruin_wall', 'x': round(v['x'] + tx * 8 * sd, 1), 'z': round(v['z'] + tz * 8 * sd, 1), 'clear': 6, 'len': 6, 'dark': True, 'ry': round(a, 3)})
        out['props'].append({'type': 'umbral_arch', 'x': round(v['x'], 1), 'z': round(v['z'], 1), 'ry': round(-a + math.pi / 2, 3), 'len': 4})
    # the palace on the crown
    cx, cz = CROWN
    if mode == 'new':
        # the palace: two long wings flanking a court, the great spires rising from it — the tallest things in the Scarlands
        for sx in (-1, 1): out['buildings'].append({'x': cx + sx * 21, 'z': cz + 4, 'w': 26, 'd': 14, 'h': 9, 'ry': round(sx * math.pi / 2, 3), 'stone': True, 'roof': '#1a1622', 'wall': '#34303e', 'timber': '#120e18', 'name': "Seraphina's Palace" if sx < 0 else None, 'chimney': False})
        out['buildings'] = [b for b in out['buildings'] if b.get('name', 1) is not None or b.pop('name', None) is None]
        out['buildings'].append({'x': cx, 'z': cz - 14, 'w': 30, 'd': 10, 'h': 12, 'ry': 0, 'stone': True, 'roof': '#1a1622', 'wall': '#34303e', 'timber': '#120e18', 'chimney': False})
        for (x, z, l, sc) in [(0, -2, 10, 3.4), (-11, 6, 7, 2.4), (11, 6, 7, 2.4), (-6, 16, 5, 1.8), (6, 16, 5, 1.8), (-28, -10, 4, 1.6), (28, -10, 4, 1.6), (-28, 18, 3, 1.4), (28, 18, 3, 1.4)]:
            out['props'].append({'type': 'umbral_spire', 'x': cx + x, 'z': cz + z, 'len': l, 'scale': sc, 'clear': 8})
        for a in range(10): out['props'].append({'type': 'umbral_column', 'x': round(PALACE_SQ[0] + 17 * math.cos(a * math.pi / 5), 1), 'z': round(PALACE_SQ[1] + 17 * math.sin(a * math.pi / 5), 1), 'len': 3})
    else:
        for (x, z, l) in [(0, -10, 4), (-16, -2, 3), (16, -2, 2)]: out['props'].append({'type': 'umbral_column', 'x': cx + x, 'z': cz + z, 'len': l})
        for (x, z, w, d, h) in [(0, -6, 40, 28, 22), (-26, 10, 12, 12, 30), (26, 10, 12, 12, 26), (0, -26, 14, 10, 34)]: out['buildings'].append({'x': cx + x, 'z': cz + z, 'w': w, 'd': d, 'h': h, 'ry': 0, 'roofType': 'ruin', 'wall': '#625e6e', 'timber': '#3a3640', 'seed': 777 + h})   # the palace and its towers, fallen
        for i in range(8): out['props'].append({'type': 'heap', 'x': round(cx + R.uniform(-22, 22), 1), 'z': round(cz + R.uniform(-18, 22), 1)})
        hx, hz = LM[1][2], LM[1][3]
        out['signs'].append({'id': 'ravenspire_ruins', 'x': hx, 'z': hz, 'text': 'Cut deep into a fallen lintel of the great hall, half under the vines: "WE HELD UNTIL THE LIGHT WENT OUT." Below it, smaller and newer, scratched by another hand: names, dozens of them, and a date counted from the Darkness. Something has walked through the hall since — the ash on the floor is marked with long, clawed prints.'})
        out['buildings'].append({'x': hx, 'z': hz, 'w': 26, 'd': 16, 'h': 14, 'ry': ry(LM[1][6]), 'roofType': 'ruin', 'wall': '#6a6674', 'timber': '#3a3640', 'seed': 4242})   # the great hall, open to the eclipse
    # lamps along the great streets (the living city)
    if mode == 'new':
        for s in STREETS:
            if s['kind'] not in ('high', 'main'): continue
            for i in range(2, len(s['pts']) - 1, 4):
                (ax, az), (bx, bz) = s['pts'][i - 1], s['pts'][i]; L = math.hypot(bx - ax, bz - az) or 1
                out['props'].append({'type': 'lamp', 'x': round(bx - (bz - az) / L * (s['w'] / 2 + 0.6), 1), 'z': round(bz + (bx - ax) / L * (s['w'] / 2 + 0.6), 1)})
        for sq in SQUARES:
            for k in range(6): out['props'].append({'type': 'lamp', 'x': round(sq['x'] + (sq['r'] - 2) * math.cos(k * math.pi / 3), 1), 'z': round(sq['z'] + (sq['r'] - 2) * math.sin(k * math.pi / 3), 1)})
        out['props'] += [{'type': 'stall', 'x': MARKET[0] + 8 * math.cos(k * 1.2), 'z': MARKET[1] + 8 * math.sin(k * 1.2), 'ry': round(-k * 1.2, 3)} for k in range(5)] + [{'type': 'well', 'x': MARKET[0], 'z': MARKET[1]}]
        # its people, at the doors of their houses
        def at_door(n):
            b = next(b for b in out['buildings'] if b.get('name') == n); a = -b['ry'] + math.pi / 2
            return round(b['x'] + math.cos(a) * (b['d'] / 2 + 1.6), 1), round(b['z'] + math.sin(a) * (b['d'] / 2 + 1.6), 1), round(math.atan2(-math.cos(a), -math.sin(a)) + math.pi, 3)
        def person(n, building, **k): x, z, f = at_door(building); out['people'].append({'name': n, 'x': x, 'z': z, 'facing': f, **k})
        dark = {'torso': {'base': '#2a2436'}}
        person('Innkeeper of the Black Raven', 'The Black Raven (inn)', role='innkeeper', price=12, greeting='A bed under the Spires, a fire, no questions. The Legion pays its debts here, and so do travellers.')
        person('Legion Quartermaster', 'The Legion Armoury', role='merchant', catalog='armourer', archetype='soldier', colors=dark, greeting="Black steel, made for the Rift's things. Outsiders pay full price — for now.")
        person('The Map-Maker', 'The Map-Maker', role='merchant', catalog='cartographer', greeting="Maps of the Scarlands, the Rift's edges — and a few of the other side, for those with the stomach.")
        person('Exchange Factor', 'The Guild Exchange', role='merchant', catalog='guild', greeting='Goods from both worlds pass through this hall. Mind the prices; mind the company.')
        person('Herald of the Legion', "The Herald's House", role='soldier', archetype='soldier', colors=dark, lines=[
            'Seraphina led our people out of the dark through the Rift. We built these walls with what we carried.',
            'The Great Rift still bleeds: things from the other side crawl out of it. The bounty is good for any you put down.',
            'The Obsidian Gate stands to the east. The Legion guards it, but travellers may pass — at their own risk.',
            'Outsiders are welcome while they keep the peace. The Legion remembers who helps it.'])
        out['people'].append({'name': 'Market Trader', 'role': 'merchant', 'x': MARKET[0] + 4, 'z': MARKET[1] + 4, 'facing': 3.14, 'greeting': 'Bread, salt, oil, rope. Even a Legion eats.'})
        out['people'].append({'name': 'Palace Guard', 'role': 'guard', 'archetype': 'soldier', 'colors': dark, 'x': PALACE_SQ[0] - 6, 'z': PALACE_SQ[1] - 14, 'facing': 3.14, 'lines': ['The Lady of the Spires does not receive travellers. Admire the palace from the square.', 'Keep the peace inside the walls.']})
        out['people'].append({'name': 'Palace Guard', 'role': 'guard', 'archetype': 'soldier', 'colors': dark, 'x': PALACE_SQ[0] + 6, 'z': PALACE_SQ[1] - 14, 'facing': 3.14, 'lines': ['Seraphina built the Gate with her own hands. Remember that, outsider.']})
        for g, v in gates.items():
            a = v['a']; tx, tz = -math.sin(a), math.cos(a)
            for sd in (-1, 1): out['people'].append({'name': 'Legion Gate-Warden', 'role': 'guard', 'archetype': 'soldier', 'colors': dark, 'x': round(v['x'] * 0.93 + tx * 4.5 * sd, 1), 'z': round(v['z'] * 0.93 + tz * 4.5 * sd, 1), 'facing': round(-a + math.pi / 2 + math.pi, 3), 'lines': ['Pass, traveller. Keep your blade sheathed inside the walls.', "The Rift's things grow bolder after dark. Stay on the road."]})
        g0 = gates[gl[0]]
        out['signs'].append({'x': round(g0['x'] * 0.85 + 4, 1), 'z': round(g0['z'] * 0.85, 1), 'text': "NEW RAVENSPIRE — seat of the Shadow Legion. Founded by Seraphina after the Great Darkness. Inside: the Black Raven (inn), the Legion Armoury, the Map-Maker, the Guild Exchange; the market; the palace square. East gate: the road to the Obsidian Gate. South: the Great Rift — keep to the road."})
        out['gates'] = [{'id': 'new_ravenspire_monolith', 'label': 'Monolith of New Ravenspire', 'x': round(g0['x'] * 0.8, 1), 'z': round(g0['z'] * 0.8 - 6, 1)}]
        out['start'] = {'x': round(g0['x'] * 1.08, 1), 'z': round(g0['z'] * 1.08, 1), 'facing': round(-GATES[gl[0]] + math.pi / 2 + math.pi, 3)}
        out['landmarks'] = [{'name': "Seraphina's Palace", 'x': cx, 'z': cz, 'icon': 'tower'}, {'name': 'The Spire Hall', 'x': LM[1][2], 'z': LM[1][3], 'icon': 'house'}]
    else:
        g0 = gates[gl[0]]; out['start'] = {'x': round(g0['x'] * 1.08, 1), 'z': round(g0['z'] * 1.08, 1), 'facing': 3.14}
    path = os.path.join(ROOT, 'apps/amo3d/src/content/regions', f'{mode}_ravenspire.json')
    json.dump(out, open(path, 'w'), indent=1)
    print(mode, 'houses', len(PLOTS), 'streets', len(STREETS), 'buildings', len(out['buildings']), 'props', len(out['props']), 'people', len(out['people']))

build('new'); build('old')
