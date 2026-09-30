"""
Helpers for map generators that place sprites from any catalogued sheet
(GameScene loads them per map through `extraSheets` and places them through
`sheetDecorations`). Used by gen_wintertest.py and gen_dungeontest.py.

    sm = SheetMap()
    sm.add('snowy_asset_pack_nyx/trees_tree_0', 'trees_tree_0', x, y)
    sm.add('pixel_crawler_anokolisa/dungeon_tiles', 'teal_flagstone_floor_center', x, y, scale=2)
    sm.extra_sheets_js(), sm.sheet_decorations_js()

`sheet` is the catalogue path under public/assets/catalogued/tilesets without
`.catalogue.json`. x, y are map tiles (32px). A sheet placed at scale 2 draws
16px art on the 32px grid.
"""
from pathlib import Path
import json
import re

AMO = Path(__file__).resolve().parents[2]
TILESETS = AMO / 'public/assets/catalogued/tilesets'


class SheetMap:
    def __init__(self):
        self.groups = {}   # (sheet, scale) -> [item]
        self._cats = {}

    def catalogue(self, sheet):
        if sheet not in self._cats:
            c = json.loads((TILESETS / f'{sheet}.catalogue.json').read_text())
            self._cats[sheet] = (c, {e['name']: e for e in c['entries']})
        return self._cats[sheet]

    def entry(self, sheet, name):
        by = self.catalogue(sheet)[1]
        if name not in by:
            raise KeyError(f'{name} not in {sheet}')
        return by[name]

    def size_tiles(self, sheet, name, scale=1):
        """Footprint in map tiles (rounded up)."""
        c, by = self.catalogue(sheet)
        e = by[name]
        w, h = (c['gridTileWidth'], c['gridTileHeight']) if e['kind'] == 'tile' else (e['w'], e['h'])
        return -(-w * scale // 32), -(-h * scale // 32)

    def add(self, sheet, name, x, y, scale=1, **extra):
        self.entry(sheet, name)  # fail early on a typo
        item = {'name': name, 'x': x, 'y': y, **extra}
        self.groups.setdefault((sheet, scale), []).append(item)
        return item

    @staticmethod
    def keys(sheet, scale):
        base = 'tm_' + re.sub(r'[^A-Za-z0-9]+', '_', sheet).strip('_').lower()
        return base + '_cat', base  # catKey, texKey (same texture for any scale)

    def count(self):
        return sum(len(v) for v in self.groups.values())

    def extra_sheets_js(self):
        seen, out = set(), []
        for sheet, scale in self.groups:
            if sheet in seen:
                continue
            seen.add(sheet)
            ck, tk = self.keys(sheet, scale)
            c = self.catalogue(sheet)[0]
            png = f'assets/catalogued/tilesets/{Path(sheet).parent.as_posix()}/{c["source"]}'
            cat = f'assets/catalogued/tilesets/{sheet}.catalogue.json'
            out.append(f"    {{ texKey: '{tk}', catKey: '{ck}', png: {json.dumps(png)}, cat: {json.dumps(cat)} }},")
        return '[\n' + '\n'.join(out) + '\n]'

    def sheet_decorations_js(self):
        out = []
        for (sheet, scale), items in self.groups.items():
            ck, tk = self.keys(sheet, scale)
            body = ''.join(f'        {js_item(i)},\n' for i in items)
            sc = f', scale: {scale}' if scale != 1 else ''
            out.append(f"    {{ texKey: '{tk}', catKey: '{ck}'{sc}, items: [\n{body}    ] }},")
        return '[\n' + '\n'.join(out) + '\n]'


def js_item(i):
    return '{ ' + ', '.join(f'{k}: {json.dumps(v)}' for k, v in i.items()) + ' }'


def tiles_js(tiles):
    return '[\n' + ''.join('    [' + ','.join(map(str, r)) + '],\n' for r in tiles) + ']'
