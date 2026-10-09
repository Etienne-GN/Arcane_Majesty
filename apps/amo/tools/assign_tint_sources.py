#!/usr/bin/env python3
"""
Make every tint-able catalogue item recolourable (see tools/test_tint_sources.py).

For each item whose current source palette matches < 20% of its pixels:
  - if one of the shared PALETTE_SOURCE ramps matches >= 50%, set
    `sourceMaterial` to it (e.g. white/grey clothes → cloth_light);
  - otherwise give it its own `sourceColors`: its most common colours (covering
    >= 85% of its pixels, at most 16), dark → light — the way the v1 Forge
    recoloured each item from its own base palette.
Weapons are skipped (several materials per item; one ramp can't tint them).

    python3 tools/assign_tint_sources.py            # report only
    python3 tools/assign_tint_sources.py --apply    # write the catalogue
Safe to re-run after regenerating/annotating the catalogue.
"""
import argparse
import collections
import json
import sys

import tint_sources as ts

MIN_COVERAGE = 0.2
SHARED_OK = 0.5
CUSTOM_SHARE = 0.85
CUSTOM_MAX = 16


def custom_ramp(px):
    counts = collections.Counter(px)
    total = len(px)
    picked, covered = [], 0
    for colour, n in counts.most_common():
        if len(picked) >= CUSTOM_MAX or covered / total >= CUSTOM_SHARE:
            break
        picked.append(colour)
        covered += n
    return [(c[0] << 16) | (c[1] << 8) | c[2] for c in sorted(picked, key=ts.lum)]


def plan(catalogue):
    """[(slot, entry, change: dict, before, after)] for items that ignore tints today."""
    shared = ts.game()['PALETTE_SOURCE']
    out = []
    for slot, entry, path in ts.tintable_items(catalogue):
        if slot in ts.MULTI_MATERIAL_SLOTS:
            continue
        px = ts.pixels(path)
        before = ts.coverage(px, ts.source_colors(slot, entry))
        if before >= MIN_COVERAGE:
            continue
        cov = {k: ts.coverage(px, [ts.rgb(c) for c in v]) for k, v in shared.items()}
        best = max(cov, key=cov.get)
        if cov[best] >= SHARED_OK:
            out.append((slot, entry, {'sourceMaterial': best}, before, cov[best]))
        else:
            ramp = custom_ramp(px)
            out.append((slot, entry, {'sourceColors': ramp}, before, ts.coverage(px, [ts.rgb(c) for c in ramp])))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--apply', action='store_true', help='write the changes into the catalogue')
    args = ap.parse_args()
    catalogue = ts.load_catalogue()
    changes = plan(catalogue)
    kinds = collections.Counter(next(iter(c)) for _, _, c, _, _ in changes)
    for slot, entry, change, before, after in changes:
        what = change.get('sourceMaterial') or f"own {len(change['sourceColors'])}-colour ramp"
        print(f'{slot:14} {entry["id"]:45} {before:4.0%} → {after:4.0%}  {what}')
        if args.apply:
            entry.pop('sourceMaterial', None)
            entry.pop('sourceColors', None)
            entry.update(change)
    print(f'\n{len(changes)} items: {kinds.get("sourceMaterial", 0)} shared palette, {kinds.get("sourceColors", 0)} own ramp')
    if args.apply and changes:
        with open(ts.CATALOGUE, 'w') as f:
            f.write(json.dumps(catalogue, indent=2, ensure_ascii=False))
        print('catalogue updated')


if __name__ == '__main__':
    sys.exit(main())
