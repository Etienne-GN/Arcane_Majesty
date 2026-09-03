#!/usr/bin/env python3
"""
Sweeps every sprite_meta.json entry marked license: "unlicensed":

  1. Crops it out of its sheet PNG and saves the crop under
     apps/amo/ressources/rejected_sprites/unlicensed/<packDir>/<entryName>.png
     — so there's an actual image to reverse-search / dig through
     free_stuff with, to find a licensed replacement or the real license.
  2. Removes the entry from its pack's <sheet>.catalogue.json. This is
     deliberate: it pulls the sprite out of the pipeline entirely, so
     anything in the game (a map, animProfiles.js, worldMap.js) that
     referenced it by name will now fail to resolve — forcing a review of
     every place it was used, since an unlicensed sprite can't ship.
  3. Drops the entry's sprite_meta.json key (nothing left to track once
     it's not catalogued).

Never touches the shared sheet PNG's pixels — only the catalogue.json
entry disappears; the pixels are simply no longer referenced by anything.

Run from anywhere:
    python3 apps/tool_suite/sprite_ledger/scripts/sweep_unlicensed.py [--dry-run]
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent.parent  # .../sprite_ledger
DATA_DIR = HERE / 'data'
CATALOGUE_DIR = HERE.parent.parent / 'amo' / 'public' / 'assets' / 'catalogued' / 'tilesets'
REJECTED_DIR = HERE.parent.parent / 'amo' / 'ressources' / 'rejected_sprites' / 'unlicensed'


def load_json(path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def save_json(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def find_catalogues():
    """sheetPngFilename -> {dir_name, json_path, catalogue, png_path}"""
    index = {}
    for sheet_dir in sorted(CATALOGUE_DIR.iterdir()):
        if not sheet_dir.is_dir():
            continue
        for json_path in sorted(sheet_dir.glob('*.catalogue.json')):
            catalogue = json.loads(json_path.read_text())
            index[catalogue['source']] = {
                'dir_name': sheet_dir.name,
                'json_path': json_path,
                'catalogue': catalogue,
                'png_path': sheet_dir / catalogue['source'],
            }
    return index


def crop_box(entry, catalogue):
    if entry['kind'] == 'object':
        return entry['x'], entry['y'], entry['w'], entry['h']
    tw, th = catalogue['gridTileWidth'], catalogue['gridTileHeight']
    return entry['col'] * tw, entry['row'] * th, tw, th


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--dry-run', action='store_true', help='report what would happen, change nothing')
    args = parser.parse_args(argv)

    meta_path = DATA_DIR / 'sprite_meta.json'
    meta = load_json(meta_path, {})

    unlicensed_keys = [k for k, v in meta.items() if v.get('license') == 'unlicensed']
    if not unlicensed_keys:
        print('nothing flagged unlicensed — nothing to sweep.')
        return 0

    catalogues = find_catalogues()
    moved, missing = [], []

    for key in unlicensed_keys:
        sheet_png, entry_name = key.split('::', 1)
        info = catalogues.get(sheet_png)
        entry = None
        if info:
            entry = next((e for e in info['catalogue']['entries'] if e['name'] == entry_name), None)
        if info is None or entry is None:
            missing.append(key)
            continue

        x, y, w, h = crop_box(entry, info['catalogue'])
        out_path = REJECTED_DIR / info['dir_name'] / f'{entry_name}.png'
        print(f'{"[dry-run] " if args.dry_run else ""}{key} -> {out_path}')

        if not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            Image.open(info['png_path']).crop((x, y, x + w, y + h)).save(out_path)
            info['catalogue']['entries'].remove(entry)

        moved.append(key)

    if not args.dry_run:
        written = set()
        for key in moved:
            sheet_png, _ = key.split('::', 1)
            info = catalogues[sheet_png]
            if info['json_path'] not in written:
                save_json(info['json_path'], info['catalogue'])
                written.add(info['json_path'])
            del meta[key]
        save_json(meta_path, meta)

    print(f'{len(moved)} swept{" (dry-run)" if args.dry_run else ""}, {len(missing)} not found: {missing}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
