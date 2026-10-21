"""Round-trip check for region_writer (W2). Run from apps/amo: python3 tools/maps/test_region_writer.py"""
import base64
import json
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from region_writer import write_region, pack_tiles  # noqa: E402
from sheetmap import SheetMap  # noqa: E402

BC = 'SampleMap/[Base]BaseChip_pipo'

tiles = [[0, 1, 2], [3, 1, 0]]
assert base64.b64decode(pack_tiles(tiles)) == bytes([0, 1, 2, 3, 1, 0]), 'tiles packed row-major'

sm = SheetMap()
sm.add(BC, 'rock_small_tan', 1, 0, blocking=True)
sm.add(BC, 'fence_wood_up_down', 2, 1, blocking=False, hoppable=False, depthOffset=5)
sm.add(BC, 'rock_small_tan', 0, 1, scale=2)

with tempfile.TemporaryDirectory() as d:
    out = Path(d) / 'tiny.js'
    write_region(out, id='tiny', tiles=tiles, sm=sm, hop_cells=[(2, 1)],
                 fields={'displayName': 'Tiny', 'playerStart': {'x': 0, 'y': 0}, 'spawns': {'enemies': []}, 'portals': []},
                 header='test region')
    text = out.read_text()
    assert text.startswith('// test region'), 'header comment'
    body = re.search(r'export default (\{.*\});\s*$', text, re.S).group(1)
    raw = json.loads(body)
    assert raw['format'] == 1 and raw['id'] == 'tiny' and raw['width'] == 3 and raw['height'] == 2
    assert raw['names'] == ['rock_small_tan', 'fence_wood_up_down'], raw['names']
    assert raw['deco'] == [[0, 0, 1, 0, 1], [0, 1, 2, 1, 10, 5], [1, 0, 0, 1, 0]], raw['deco']
    assert [s['scale'] for s in raw['sheets']] == [1, 2]
    assert base64.b64decode(raw['hop'])[0] & (1 << 5), 'hop bit for (2,1) = index 5'
    assert raw['displayName'] == 'Tiny'
    assert 'dense' not in raw and 'chart' not in raw, 'no layers unless given'
    out2 = Path(d) / 'layers.js'
    write_region(out2, id='layers', tiles=tiles, sm=SheetMap(), fields={}, dense_cells=[(0, 1)], chart_cells=[(2, 0)])
    raw2 = json.loads(re.search(r'export default (\{.*\});\s*$', out2.read_text(), re.S).group(1))
    assert base64.b64decode(raw2['dense'])[0] == 1 << 3, 'dense bit for (0,1) = index 3'
    assert base64.b64decode(raw2['chart'])[0] == 1 << 2, 'chart bit for (2,0) = index 2'

try:
    sm2 = SheetMap()
    sm2.add(BC, 'rock_small_tan', 0, 0, tint=3)
    write_region(Path(tempfile.gettempdir()) / 'bad.js', id='bad', tiles=tiles, sm=sm2, fields={})
    raise AssertionError('unknown item keys must be refused')
except ValueError:
    pass

print('test_region_writer: ok')
