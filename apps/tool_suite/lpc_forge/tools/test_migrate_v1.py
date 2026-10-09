#!/usr/bin/env python3
"""Tests for the v1 Forge save → game composition migration. Run: python3 tools/test_migrate_v1.py"""
import json
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import migrate_v1 as m  # noqa: E402

CAT = m.load_catalogue()
VMAP = m.load_map()
GAME = m.load_game_tables()
V1COLORS = m.load_v1_colors()


def ids(slot):
    return {e['id'] for e in CAT.get(slot, []) if e.get('id')}


class ResolveItem(unittest.TestCase):
    def test_body_variant_female_uses_female_or_thin(self):
        slot, iid, _ = m.resolve_item('clothes.legs.pants', 'female', CAT, VMAP)
        self.assertEqual(slot, 'legs')
        self.assertIn(iid, {'pants/female', 'pants/thin'})

    def test_skeleton_body_falls_back_to_male_variant(self):
        slot, iid, _ = m.resolve_item('clothes.legs.pantaloons', 'skeleton', CAT, VMAP)
        self.assertEqual(iid, 'pantaloons/male')

    def test_male_only_item_on_female_body_falls_back_with_note(self):
        slot, iid, note = m.resolve_item('clothes.torso.longsleeve_laced', 'female', CAT, VMAP)
        self.assertEqual(iid, 'clothes/longsleeve/laced/male')
        self.assertIn('no female version', note)

    def test_hair_resolves_adult(self):
        self.assertEqual(m.resolve_item('anatomy.hair.messy3', 'male', CAT, VMAP)[1], 'messy3/adult')

    def test_skip_entry(self):
        r = m.resolve_item('anatomy.shadow.shadow', 'male', CAT, VMAP)
        self.assertIsNone(r[1])
        self.assertIn('shadow', r[2])

    def test_unknown_key(self):
        r = m.resolve_item('clothes.nothing.here', 'male', CAT, VMAP)
        self.assertIsNone(r[1])
        self.assertEqual(r[2], 'no mapping for clothes.nothing.here')

    def test_every_map_entry_resolves_for_some_body(self):
        for key, entry in VMAP.items():
            if 'skip' in entry:
                continue
            got = {m.resolve_item(key, b, CAT, VMAP)[1] for b in m.BODY_VARIANTS}
            got.discard(None)
            self.assertTrue(got, f'{key} never resolves')
            for g in got:
                self.assertIn(g, ids(entry['slot']), f'{key} → {g} not in catalogue slot {entry["slot"]}')


class Colours(unittest.TestCase):
    def test_nearest_option(self):
        self.assertEqual(m.nearest_option((250, 10, 10), [('blue', (0, 0, 255)), ('red', (255, 0, 0))]), 'red')

    def test_v1_rgb_known(self):
        self.assertIsNotNone(m.v1_rgb('garnet', V1COLORS))
        self.assertIsNone(m.v1_rgb('not_a_colour', V1COLORS))

    def test_file_color_rgb_samples_png(self):
        entry = next(e for e in CAT['cape'] if e.get('id') == 'solid/female')
        red = m.file_color_rgb('cape', entry, 'red', GAME)
        blue = m.file_color_rgb('cape', entry, 'blue', GAME)
        self.assertGreater(red[0], red[2])
        self.assertGreater(blue[2], blue[0])


class MigrateSave(unittest.TestCase):
    def test_body_reference_colour_inherits_body_tint(self):
        data = {
            'anatomy.body.male': {'colors': {'primary': 'peach'}},
            'anatomy.head.human_male': {'colors': {'primary': 'anatomy.body', 'secondary': 'eyes_brown'}},
        }
        out = m.migrate_save('T', data, CAT, VMAP, GAME, V1COLORS)
        sel = out['comp']['sel']
        self.assertEqual(sel['body']['id'], 'bodies/male')
        self.assertGreater(sel['body'].get('tint', 0), 0)
        self.assertEqual(sel['head'].get('tint'), sel['body'].get('tint'))

    def test_eyes_colour_from_head(self):
        data = {'anatomy.body.male': {'colors': {'primary': 'peach'}},
                'anatomy.head.human_male': {'colors': {'primary': 'anatomy.body', 'secondary': 'eyes_blue'}}}
        sel = m.migrate_save('T', data, CAT, VMAP, GAME, V1COLORS)['comp']['sel']
        self.assertEqual(sel.get('eyes', {}).get('color'), 'blue')

    def test_slot_collision_keeps_first_and_notes_the_other(self):
        data = {'anatomy.body.male': {'colors': {}},
                'clothes.torso.longsleeve': {'colors': {'primary': 'white'}},
                'clothes.torso2.corset': {'colors': {'primary': 'black'}}}
        out = m.migrate_save('T', data, CAT, VMAP, GAME, V1COLORS)
        self.assertTrue(out['comp']['sel']['torso_clothes']['id'].startswith('clothes/longsleeve/longsleeve'))
        self.assertTrue(any('corset' in n and 'torso_clothes' in n for n in out['notes']))

    def test_file_colour_item_gets_a_listed_colour(self):
        data = {'anatomy.body.female': {'colors': {}}, 'clothes.cape.solid': {'colors': {'primary': 'garnet'}}}
        sel = m.migrate_save('T', data, CAT, VMAP, GAME, V1COLORS)['comp']['sel']
        entry = next(e for e in CAT['cape'] if e['id'] == sel['cape']['id'])
        self.assertIn(sel['cape']['color'], entry['colors'])
        self.assertIn(sel['cape']['color'], {'red', 'maroon', 'rose', 'pink'})

    def test_every_real_save_migrates(self):
        for name, data in m.load_v1_saves():
            out = m.migrate_save(name, data, CAT, VMAP, GAME, V1COLORS)
            self.assertIn('body', out['comp']['sel'], name)
            for slot, p in out['comp']['sel'].items():
                self.assertIn(p['id'], ids(slot), f'{name}: {slot} {p["id"]}')


if __name__ == '__main__':
    unittest.main(verbosity=1)
