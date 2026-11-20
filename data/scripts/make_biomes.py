#!/usr/bin/env python3
"""Seed the biome registry (apps/amo3d/src/content/world/biomes/*.json) and Eldoria's biome map
(content/world/biome_maps/eldoria.json) from the region maps and the hand-built places. Run once; afterwards the
files are the source of truth (the Land Editor's World Biomes panel edits them). Refuses to overwrite existing files
unless --force."""
import json, os, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REG = os.path.join(ROOT, 'apps/amo3d/src/content/regions')
OUT = os.path.join(ROOT, 'apps/amo3d/src/content/world/biomes')
MAPF = os.path.join(ROOT, 'apps/amo3d/src/content/world/biome_maps/eldoria.json')
force = '--force' in sys.argv
R = {json.load(open(f))['id']: json.load(open(f)) for f in glob.glob(os.path.join(REG, '*.json'))}
def from_region(rid):
    d = R[rid]; p = d.get('palette', {}); t = d.get('trees', {}); m = d.get('mood', {}); area = (2 * d.get('half', 90)) ** 2
    beasts = sorted({a.get('kind') for a in d.get('actors', []) if a.get('type') == 'beasts' and a.get('kind')})
    return {'palette': {'grassA': p.get('grassA', '#4d7a35'), 'grassB': p.get('grassB', '#7aa04a'), 'rock': p.get('rock', '#77726b'), 'dirt': p.get('dirt', '#6e5a3c')},
            'vegetation': {'density': round(max(0.1, min(2.2, (t.get('count', 200) / area) / 0.0067 * (1 - t.get('gaps', 0.5) * 0.5))), 2), 'kinds': t.get('kinds', {'pine': 0.4, 'broad': 0.6}), **({'colors': t['colors']} if t.get('colors') else {}), **({'trunk': t['trunk']} if t.get('trunk') else {})},
            'creatures': beasts,
            'mood': {'fog': m.get('fog', '#c8d2d8'), 'fogNear': max(45, m.get('fogNear', 50) * 4), 'fogFar': max(300, m.get('fogFar', 200) * 4), 'fogMix': m.get('fogMix', 0.5), 'light': m.get('light', 1), 'nightFloor': m.get('nightFloor', 0.45)}}
B = {
 'temperate_meadow': ('Temperate meadow', 'The ordinary green country of Eldoria between its places: rolling meadows, copses of oak and pine.', {'palette': {'grassA': '#4d7a35', 'grassB': '#7aa04a', 'rock': '#77726b', 'dirt': '#6e5a3c'}, 'vegetation': {'density': 1.0, 'kinds': {'pine': 0.4, 'broad': 0.6}}, 'creatures': [], 'mood': {'fog': '#c8d2d8', 'fogNear': 180, 'fogFar': 760, 'fogMix': 0.5, 'light': 1, 'nightFloor': 0.45}}, [['rabbit', 3], ['crow', 3], ['forest_fox', 1], ['deer', 1]], 600),
 'tended_country': ('Tended country', "Thaloria's lands: kept fields and orchards, few woods, the roads busy.", None, [['crow', 3], ['sheep', 2], ['cow', 1]], 450),
 'lush_vale': ('Lush vale', "Eldrin's vale: deep green grass, broadleaves and birches, still water, a soft light.", {'palette': {'grassA': '#4d8a3a', 'grassB': '#86b04e', 'rock': '#7a7a72', 'dirt': '#6e5a3c'}, 'vegetation': {'density': 1.3, 'kinds': {'broad': 0.5, 'pine': 0.35, 'birch': 0.15}}, 'creatures': [], 'mood': {'fog': '#cfe0c8', 'fogNear': 120, 'fogFar': 600, 'fogMix': 0.45, 'light': 1, 'nightFloor': 0.5}}, [['rabbit', 5], ['forest_fox', 2], ['crow', 4], ['feral_boar', 2]], 500),
 'east_forest': ('Eastern forest', 'The Thalorian Wilds along the East Road: thick mixed forest, a few dead trunks, bears and boars.', {'palette': {'grassA': '#4a7234', 'grassB': '#6a9040', 'rock': '#7a7468', 'dirt': '#5e4e36'}, 'vegetation': {'density': 1.4, 'kinds': {'pine': 0.5, 'broad': 0.4, 'dead': 0.1}}, 'creatures': [], 'mood': {'fog': '#b8c4c0', 'fogNear': 110, 'fogFar': 520, 'fogMix': 0.5, 'light': 0.95, 'nightFloor': 0.45}}, [['rabbit', 4], ['forest_fox', 2], ['crow', 5], ['feral_boar', 3], ['black_bear', 1]], 600),
 'alpine': ('Alpine', 'The heights of the Summit range: hardy pines, bare rock, snow above the trees.', 'summit_of_despair', [['crow', 3], ['goat', 3]], 450),
 'sylvan_spring': ('Sylvan spring', 'The impossible green of the Sanctuary: an endless spring, flowers in nameless colours.', 'sylvan_sanctuary', [['rabbit', 5], ['forest_fox', 2], ['deer', 2]], 420),
 'whisper_forest': ('Whisper forest', 'The dark, misty woods of Whisper-Wood and Duskmeet: close pines, dead trunks, drifting motes, things that watch.', 'whisper_wood', [['forest_fox', 2], ['rabbit', 3], ['grizzly_bear', 1], ['crow', 4]], 880),
 'emerald_meadow': ('Emerald meadow', 'The bright fields of the west: wide meadows, birch groves, a clear light.', 'emerald_fields', [['deer', 3], ['rabbit', 4], ['crow', 2]], 750),
 'lakeshore': ('Lakeshore', 'Round Lake Aethera: reeds and birches, broadleaves, a pale blue air.', 'lake_aethera', [['deer', 2], ['rabbit', 3], ['crow', 2]], 600),
 'coastland': ('Coastland', 'The Silver Coast: windswept grass, mixed trees bent by the sea air.', 'port_silver', [['crow', 3], ['rabbit', 2]], 600),
 'scarland_heath': ('Scarland heath', 'The Scarlands about Graywatch: a dry, grey heath, dead trees, rats in the ruins.', 'graywatch', [['crow', 4], ['feral_boar', 2]], 650),
 'iron_hills': ('Iron hills', 'The mining country of Iron Hollow: grey-green slopes, dark pines, slag and smoke.', 'iron_hollow', [['crow', 3]], 500),
 'ash_lands': ('Ash lands', 'About the Fire Gate: ash on the snow, dead trees, a smoulder in the air.', 'fire_gate', [['crow', 2]], 420),
 'inferno': ('Inferno', 'The caldera of the Inferno Labyrinth: black rock, lava, no life that is kind.', 'inferno_labyrinth', [], 380),
 'ruined_moor': ('Ruined moor', 'Round the Ruins of Eldoria: a grey moor, dead and stunted trees, an old sorrow.', 'ruins_of_eldoria', [['crow', 3]], 450),
}
B['tended_country'] = (B['tended_country'][0], B['tended_country'][1], {**from_region('thaloria_lower'), 'vegetation': {'density': 0.55, 'kinds': {'broad': 0.6, 'birch': 0.2, 'pine': 0.2}}}, B['tended_country'][3], B['tended_country'][4])
os.makedirs(OUT, exist_ok=True)
for bid, (name, desc, src, wildlife, radius) in B.items():
    f = os.path.join(OUT, bid + '.json')
    if os.path.exists(f) and not force: print('kept', bid); continue
    spec = from_region(src) if isinstance(src, str) else src
    json.dump({'id': bid, 'name': name, 'description': desc, 'radius': radius, **spec, 'wildlife': wildlife}, open(f, 'w'), indent=1)
    print('wrote', bid)
PLACES = {'thaloria': 'tended_country', 'thaloria_lower': 'tended_country', 'citadel_plateau': 'tended_country', 'outdoor': 'lush_vale', 'east_road': 'east_forest', 'the_summit': 'alpine', 'summit_of_despair': 'alpine',
          'sylvan_sanctuary': 'sylvan_spring', 'whisper_wood': 'whisper_forest', 'duskmeet': 'whisper_forest', 'emerald_fields': 'emerald_meadow', 'lake_aethera': 'lakeshore', 'port_silver': 'coastland',
          'graywatch': 'scarland_heath', 'iron_hollow': 'iron_hills', 'fire_gate': 'ash_lands', 'inferno_labyrinth': 'inferno', 'ruins_of_eldoria': 'ruined_moor', 'the_crossroads': 'temperate_meadow'}
if not os.path.exists(MAPF) or force:
    json.dump({'id': 'eldoria', 'base': 'temperate_meadow', 'baseWeight': 0.18, 'places': PLACES, 'zones': []}, open(MAPF, 'w'), indent=1); print('wrote the biome map')
