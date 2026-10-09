#!/usr/bin/env python3
"""
Every tint-able catalogue item must be recolourable: the palette the game remaps
FROM (its sourceMaterial / custom sourceColors / the slot's default) has to
match a real share of the item's pixels, or picking a tint silently does
nothing. Fix failures with: python3 tools/assign_tint_sources.py --apply
Run: python3 tools/test_tint_sources.py
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tint_sources as ts  # noqa: E402

MIN_COVERAGE = 0.2


class TintSources(unittest.TestCase):
    def test_every_tintable_item_has_a_matching_source(self):
        bad = []
        for slot, entry, path in ts.tintable_items():
            if slot in ts.MULTI_MATERIAL_SLOTS:
                continue
            cov = ts.coverage(ts.pixels(path), ts.source_colors(slot, entry))
            if cov < MIN_COVERAGE:
                bad.append(f'{slot} {entry["id"]}: source covers {cov:.0%}')
        self.assertEqual(bad, [], f'{len(bad)} items ignore tints:\n  ' + '\n  '.join(bad[:40]))

    def test_custom_source_colors_are_valid(self):
        for slot, entry, _ in ts.tintable_items():
            sc = entry.get('sourceColors')
            if sc is None:
                continue
            self.assertTrue(isinstance(sc, list) and 1 <= len(sc) <= 24, f'{entry["id"]}: sourceColors size')
            self.assertTrue(all(isinstance(c, int) and 0 <= c <= 0xFFFFFF for c in sc), f'{entry["id"]}: bad colour')
            lum = [ts.lum(ts.rgb(c)) for c in sc]
            self.assertEqual(lum, sorted(lum), f'{entry["id"]}: sourceColors must run dark → light')


if __name__ == '__main__':
    unittest.main(verbosity=1)
