#!/usr/bin/env python3
"""
Converts a Tiled .tmx map (XML) into Tiled's JSON map format, resolving any
external .tsx tileset references inline (Phaser's tilemapTiledJSON loader
expects one self-contained JSON file — it doesn't fetch .tsx files itself).

This is meant to be the standard path for bringing a Tiled-authored map into
the game: author/edit the map in Tiled as .tmx, run this converter, load the
resulting .json via Phaser's native tilemap system. Non-destructive — writes
a new .json file, never touches the .tmx.

Run: python3 tmx_to_json.py <map.tmx> <output.json>
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image


def _safe_parse(path):
    """Parses local, trusted Tiled XML. Rejects DOCTYPE/ENTITY declarations
    first (cheap guard against XXE) since Tiled never emits them itself —
    stdlib ElementTree has no built-in protection against a malicious file
    that does."""
    text = Path(path).read_text()
    lowered = text.lower()
    if '<!doctype' in lowered or '<!entity' in lowered:
        raise ValueError(f"{path}: refusing to parse — contains DOCTYPE/ENTITY declarations")
    return ET.fromstring(text)


def parse_tsx(tsx_path):
    """Reads an external .tsx tileset file, returns its attrs + image info."""
    root = _safe_parse(tsx_path)
    image_el = root.find('image')
    return {
        'name': root.get('name'),
        'tilewidth': int(root.get('tilewidth')),
        'tileheight': int(root.get('tileheight')),
        'tilecount': int(root.get('tilecount')),
        'columns': int(root.get('columns')),
        'image': image_el.get('source'),
        'imagewidth': int(image_el.get('width')),
        'imageheight': int(image_el.get('height')),
    }


def _verify_against_real_image(info, tmx_dir):
    """Declared tileset metadata (.tsx or embedded) can go stale if the
    source PNG was edited after Tiled last saved it — this bit us once
    already (Flower_pipo.tsx said tilecount=48, the real PNG has 96).
    Recompute columns/tilecount/imagewidth/imageheight from the actual
    file rather than trusting the declaration, so a stale count can't
    silently truncate Phaser's tileset-index lookup table."""
    real_w, real_h = Image.open(tmx_dir / info['image']).size
    real_cols = real_w // info['tilewidth']
    real_rows = real_h // info['tileheight']
    real_count = real_cols * real_rows
    if (real_w, real_h, real_cols, real_count) != (
        info['imagewidth'], info['imageheight'], info['columns'], info['tilecount']
    ):
        print(
            f"  ! {info['name']}: declared {info['imagewidth']}x{info['imageheight']} "
            f"({info['columns']} cols, {info['tilecount']} tiles) doesn't match real "
            f"image {real_w}x{real_h} ({real_cols} cols, {real_count} tiles) — using the real one"
        )
    info['imagewidth'] = real_w
    info['imageheight'] = real_h
    info['columns'] = real_cols
    info['tilecount'] = real_count
    return info


def parse_tileset_el(tileset_el, tmx_dir):
    firstgid = int(tileset_el.get('firstgid'))
    source = tileset_el.get('source')
    if source:
        info = parse_tsx(tmx_dir / source)
    else:
        image_el = tileset_el.find('image')
        info = {
            'name': tileset_el.get('name'),
            'tilewidth': int(tileset_el.get('tilewidth')),
            'tileheight': int(tileset_el.get('tileheight')),
            'tilecount': int(tileset_el.get('tilecount')),
            'columns': int(tileset_el.get('columns')),
            'image': image_el.get('source'),
            'imagewidth': int(image_el.get('width')),
            'imageheight': int(image_el.get('height')),
        }
    info = _verify_against_real_image(info, tmx_dir)
    info['firstgid'] = firstgid
    return info


def parse_layer_el(layer_el):
    data_el = layer_el.find('data')
    encoding = data_el.get('encoding')
    if encoding != 'csv':
        raise ValueError(f"layer '{layer_el.get('name')}': only csv encoding is supported, got {encoding}")
    text = data_el.text.strip()
    data = [int(v) for v in text.replace('\n', '').split(',') if v.strip() != '']
    return {
        'id': int(layer_el.get('id')),
        'name': layer_el.get('name'),
        'type': 'tilelayer',
        'width': int(layer_el.get('width')),
        'height': int(layer_el.get('height')),
        'x': 0, 'y': 0,
        'opacity': 1,
        'visible': True,
        'data': data,
    }


def convert(tmx_path, out_path):
    tmx_path = Path(tmx_path)
    tmx_dir = tmx_path.parent
    root = _safe_parse(tmx_path)

    tilesets = [parse_tileset_el(el, tmx_dir) for el in root.findall('tileset')]
    layers = [parse_layer_el(el) for el in root.findall('layer')]

    out = {
        'width': int(root.get('width')),
        'height': int(root.get('height')),
        'tilewidth': int(root.get('tilewidth')),
        'tileheight': int(root.get('tileheight')),
        'orientation': root.get('orientation'),
        'renderorder': root.get('renderorder'),
        'infinite': root.get('infinite') == '1',
        'tilesets': tilesets,
        'layers': layers,
    }
    with open(out_path, 'w') as f:
        json.dump(out, f)

    tileset_summary = ', '.join(f"{t['name']}(firstgid={t['firstgid']})" for t in tilesets)
    layer_summary = ', '.join(l['name'] for l in layers)
    print(f'wrote {out_path}')
    print(f'  {len(tilesets)} tilesets: {tileset_summary}')
    print(f'  {len(layers)} layers: {layer_summary}')
    print(f'  {out["width"]}x{out["height"]} tiles')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
