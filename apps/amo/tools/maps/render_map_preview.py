#!/usr/bin/env python3
"""
Renders a catalogue-based map (src/data/maps/*.js) to a PNG, the way
GameScene draws it: the floor layer (tiles + tileset frames, 4 = empty),
then every placed sprite (decorations, waterTiles, snowDecorations,
sheetDecorations with their `scale`) in depth order — under, then sorted by
base (hitbox bottom), then over. For checking a generated map without
starting the game.

Run from apps/amo/:
  python3 tools/maps/render_map_preview.py <mapId | map.json> <out.png> [--shrink 2]
"""
from pathlib import Path
import json
import random
import re
import subprocess
import sys

from PIL import Image

AMO = Path(__file__).resolve().parents[2]
PUBLIC = AMO / 'public'
TILE = 32
CHAR_FEET_OFFSET = 28  # same constants as src/utils/catalogueLayout.js
UNDER_DEPTH, OVER_DEPTH = 2, 100000

# mapDef field -> (catalogue cache key, texture key), mirroring GameScene._placeCatalogueDecorations
FIELDS = {
    'decorations': ('tileset_base_cat', 'tileset_base'),
    'waterTiles': ('tileset_water_cat', 'tileset_water'),
    'snowDecorations': ('tileset_snowy_cat', 'tileset_snowy'),
    'addworkDecorations': ('tileset_addwork_cat', 'tileset_addwork'),
    'lpcTerrainDecorations': ('terrain_atlas_cat', 'terrain_atlas'),
    'lpcBaseOutDecorations': ('base_out_atlas_cat', 'base_out_atlas'),
    'lpcBuildDecorations': ('build_atlas_cat', 'build_atlas'),
    'lpcObjMiskDecorations': ('obj_misk_atlas_cat', 'obj_misk_atlas'),
}


def boot_assets():
    """texture/json keys -> public paths, read from BootScene's load calls."""
    src = (AMO / 'src/scenes/BootScene.js').read_text()
    return dict(re.findall(r"this\.load\.(?:image|json)\('([^']+)',\s*'([^']+)'\)", src))


def load_map(map_id):
    js = f"""
    const {{ getMap }} = await import('{(AMO / 'src/data/maps/index.js').as_posix()}');
    process.stdout.write(JSON.stringify(getMap('{map_id}')));
    """
    out = subprocess.run(['node', '--input-type=module', '-e', js], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def main():
    map_id, out_path = sys.argv[1], sys.argv[2]
    shrink = int(sys.argv[sys.argv.index('--shrink') + 1]) if '--shrink' in sys.argv else 1
    m = json.loads(Path(map_id).read_text()) if map_id.endswith('.json') else load_map(map_id)
    assets = boot_assets()
    for sh in m.get('extraSheets') or []:
        assets[sh['texKey']] = sh['png']
        assets[sh['catKey']] = sh['cat']
    images, cats = {}, {}

    def img(key):
        if key not in images:
            images[key] = Image.open(PUBLIC / assets[key]).convert('RGBA')
        return images[key]

    def cat(key):
        if key not in cats:
            c = json.loads((PUBLIC / assets[key]).read_text())
            cats[key] = (c, {e['name']: e for e in c['entries']})
        return cats[key]

    tiles = m['tiles']
    H, W = len(tiles), len(tiles[0])
    bg = m.get('backgroundColor', '#000000')
    canvas = Image.new('RGBA', (W * TILE, H * TILE), bg)

    ts = m.get('tileset') or {}
    ts_img = img(ts.get('key', 'tileset_base'))
    cols = ts_img.width // TILE
    rng = random.Random(1)
    decor = ts.get('decorFrames')
    for r, row in enumerate(tiles):
        for c, t in enumerate(row):
            if t == 4:
                continue
            frame = ts.get('pathFrame', 5) if t == 2 else ts.get('streetFrame') if t == 3 and ts.get('streetFrame') is not None else ts.get('floorFrame', 1)
            if t not in (2, 3) and decor and rng.random() < ts.get('decorRate', 0):
                frame = rng.choice(decor)
            fx, fy = (frame % cols) * TILE, (frame // cols) * TILE
            canvas.alpha_composite(ts_img.crop((fx, fy, fx + TILE, fy + TILE)), (c * TILE, r * TILE))

    groups = [(m.get(f), ck, tk, 1) for f, (ck, tk) in FIELDS.items() if m.get(f)]
    groups += [(g['items'], g['catKey'], g['texKey'], g.get('scale', 1)) for g in m.get('sheetDecorations') or []]
    draws = []  # (depth, order, image, x, y)
    order = 0
    missing = 0
    for items, ck, tk, scale in groups:
        c, by = cat(ck)
        sheet = img(tk)
        for d in items:
            e = by.get(d['name'])
            if not e:
                missing += 1
                continue
            if e.get('frames') and len(e['frames']) > 1:
                f = e['frames'][0]
                box = (f['x'], f['y'], f['w'], f['h'])
                w, h = max(fr['w'] for fr in e['frames']), max(fr['h'] for fr in e['frames'])
            elif e['kind'] == 'tile':
                tw, th = c['gridTileWidth'], c['gridTileHeight']
                box = (e['col'] * tw, e['row'] * th, tw, th)
                w, h = tw, th
            else:
                box = (e['x'], e['y'], e['w'], e['h'])
                w, h = e['w'], e['h']
            sw, sh = w * scale, h * scale
            left, top = d['x'] * TILE, d['y'] * TILE
            crop = sheet.crop((box[0], box[1], box[0] + box[2], box[1] + box[3]))
            if scale != 1:
                crop = crop.resize((box[2] * scale, box[3] * scale), Image.NEAREST)
            # bottom-centred in the sprite box (animations), like the game
            dx = left + (sw - crop.width) // 2
            dy = top + sh - crop.height
            hb = e.get('hitbox')
            off = d.get('depthOffset', 0)
            layer = e.get('layer')
            if layer == 'under':
                depth = UNDER_DEPTH + off
            elif layer == 'over':
                depth = OVER_DEPTH + top + sh + off
            elif layer == 'sorted':
                depth = top + ((hb['y'] + hb['h']) * scale if hb else sh) - CHAR_FEET_OFFSET + off
            else:
                depth = top + sh / 2 + off
            draws.append((depth, order, crop, dx, dy))
            order += 1
    for _, _, crop, x, y in sorted(draws, key=lambda t: (t[0], t[1])):
        canvas.alpha_composite(crop, (int(x), int(y)))
    if shrink > 1:
        canvas = canvas.resize((canvas.width // shrink, canvas.height // shrink), Image.NEAREST)
    canvas.save(out_path)
    print(f'{out_path}: {W}x{H} tiles, {order} sprites' + (f', {missing} names not found' if missing else ''))


if __name__ == '__main__':
    main()
