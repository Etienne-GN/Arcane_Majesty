"""
Shared helpers for checking which palette a tint-able catalogue item is
recoloured from (tools/test_tint_sources.py, tools/assign_tint_sources.py).
Mirrors lpcPalettes.js: entry.sourceColors (custom ramp) wins, then
entry.sourceMaterial / entry.tintMaterial if they name a PALETTE_SOURCE, then
the slot's SOURCE_MATERIAL.
"""
import json
import os
import subprocess

from PIL import Image

AMO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
LIB = os.path.join(AMO, 'ressources', 'lpc_merged', 'spritesheets')
CATALOGUE = os.path.join(AMO, 'src', 'data', 'character_catalogue.json')
THRESH = 27   # same as remapPixels

# Weapons mix materials (blade, grip, gem) that one tint ramp can't cover;
# they keep their own colours until per-material tinting exists.
MULTI_MATERIAL_SLOTS = {'weapon'}

_game = None


def game():
    global _game
    if _game is None:
        js = ("Promise.all([import('./src/systems/lpcPalettes.js'), import('./src/systems/lpcLayout.js')]).then(([p, l]) => "
              "console.log(JSON.stringify({ PALETTE_SOURCE: p.PALETTE_SOURCE, SOURCE_MATERIAL: p.SOURCE_MATERIAL, "
              "FORCE_TINT_TYPES: [...p.FORCE_TINT_TYPES], RENDER_TYPE: l.RENDER_TYPE })))")
        out = subprocess.run(['node', '--input-type=module', '-e', js], cwd=AMO, capture_output=True, text=True, check=True)
        _game = json.loads(out.stdout)
    return _game


def rgb(n):
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def load_catalogue():
    with open(CATALOGUE) as f:
        return json.load(f)


def item_png(slot, entry):
    g = game()
    rt = entry.get('renderType') or g['RENDER_TYPE'].get(slot, slot)
    anims = entry.get('anims') or ['walk']
    anim = 'walk' if 'walk' in anims else anims[0]
    base = os.path.join(LIB, rt, entry['id'], anim)
    if entry.get('itemName'):
        return os.path.join(base, f"{entry['itemName']}.png")
    if rt == 'weapon':
        return os.path.join(base, f"{entry['id'].split('/')[-1]}.png")
    if rt in ('cape', 'backpack'):
        return os.path.join(base, 'red.png')
    return base + '.png'


def tintable_items(catalogue=None):
    """(slot, entry, png path) for every item recoloured by tint (not by file colours)."""
    g = game()
    for slot, arr in (catalogue or load_catalogue()).items():
        for e in arr:
            if not e.get('id'):
                continue
            if e.get('colors') and slot not in g['FORCE_TINT_TYPES']:
                continue
            p = item_png(slot, e)
            if os.path.exists(p):
                yield slot, e, p


def source_key(slot, entry):
    ps = game()['PALETTE_SOURCE']
    if entry.get('sourceMaterial') in ps:
        return entry['sourceMaterial']
    if entry.get('tintMaterial') in ps:
        return entry['tintMaterial']
    return game()['SOURCE_MATERIAL'].get(slot, 'body')


def source_colors(slot, entry):
    if entry.get('sourceColors'):
        return [rgb(c) for c in entry['sourceColors']]
    return [rgb(c) for c in game()['PALETTE_SOURCE'][source_key(slot, entry)]]


_px = {}


def pixels(path):
    if path not in _px:
        img = Image.open(path).convert('RGBA')
        flat = img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata()
        _px[path] = [p[:3] for p in flat if p[3] > 200]
    return _px[path]


def coverage(px, src):
    """Share of opaque pixels a palette swap from `src` would recolour."""
    if not px:
        return 1.0
    hit = sum(1 for p in px if any((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 <= THRESH for c in src))
    return hit / len(px)
