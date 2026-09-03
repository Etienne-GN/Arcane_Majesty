#!/usr/bin/env python3
"""
Applies a batch of names/tags from a contact-sheet naming pass onto a
catalogue, keyed by entry index.

Flat form -- index -> name, or index -> object:

    {
      "0": "oak_tree_large",
      "1": {"name": "pine_snow", "tags": ["conifer"], "season": "winter"},
      "2": {"drop": true}
    }

Full form -- the same map under "names", plus "merges" for sprites that span
several cells of a grid:

    {
      "names":  { "0": "grass_fill" },
      "merges": [
        {"name": "flower_big_blue", "cells": [114, 115, 130, 131],
         "tags": ["flower"], "season": "spring"}
      ]
    }

A merge replaces its cells with one `kind: "object"` entry covering their
combined pixel box. Grid slicing is right for terrain that tiles, but a
32x64 flower drawn across four cells is one sprite, not four -- that's what
merges are for.

Anything named here loses its `needsNaming` flag; anything left out keeps it,
so a partial pass is safe and resumable. Entries marked `"drop": true` are
removed -- that's how noise the slicer picked up gets discarded.

Run: python3 apply_names.py --catalogue sheet.catalogue.json --names names.json
"""
import argparse
import json
import re
import sys

SEASONS = {'spring', 'summer', 'autumn', 'winter'}
NAME_RE = re.compile(r'[a-z0-9_]+')


def normalise(value):
    """Accept either a bare name string or a full {name, tags, season} object."""
    if isinstance(value, str):
        return {'name': value}
    if isinstance(value, dict):
        return dict(value)
    raise ValueError(f'expected a string or object, got {type(value).__name__}')


def split_spec(spec):
    """Accept either the flat index map or the {names, merges} form."""
    if isinstance(spec, dict) and ('names' in spec or 'merges' in spec):
        return spec.get('names', {}), spec.get('merges', [])
    return spec, []


def entry_pixel_box(cat, entry):
    """Pixel box for either entry kind, so merges can span both."""
    if entry.get('kind') == 'tile':
        tw, th = cat['gridTileWidth'], cat['gridTileHeight']
        return entry['col'] * tw, entry['row'] * th, tw, th
    return entry['x'], entry['y'], entry['w'], entry['h']


def _validate_common(spec, idx, errors):
    """Shared name/season checks. Returns False if the spec is unusable."""
    name = spec.get('name')
    if name is not None and not NAME_RE.fullmatch(str(name)):
        errors.append(f'index {idx}: name "{name}" is not snake_case')
        return False
    season = spec.get('season')
    if season is not None and season not in SEASONS:
        errors.append(f'index {idx}: season "{season}" not one of {sorted(SEASONS)}')
        return False
    return True


def _plan_merges(cat, merges, entries, errors):
    """Turns merge specs into (anchor index, new entry, consumed indices)."""
    planned = []
    claimed = {}
    for n, raw in enumerate(merges):
        if not isinstance(raw, dict):
            errors.append(f'merges[{n}]: expected an object')
            continue
        spec = dict(raw)
        cells = spec.pop('cells', None)
        name = spec.get('name')
        if not name:
            errors.append(f'merges[{n}]: missing "name"')
            continue
        if not NAME_RE.fullmatch(str(name)):
            errors.append(f'merges[{n}]: name "{name}" is not snake_case')
            continue
        season = spec.get('season')
        if season is not None and season not in SEASONS:
            errors.append(f'merges[{n}] "{name}": season "{season}" not one of {sorted(SEASONS)}')
            continue
        if not isinstance(cells, list) or len(cells) < 2:
            errors.append(f'merges[{n}] "{name}": "cells" must list at least 2 entry indices')
            continue

        idxs = []
        bad = False
        for c in cells:
            try:
                i = int(c)
            except (TypeError, ValueError):
                errors.append(f'merges[{n}] "{name}": cell {c!r} is not an index')
                bad = True
                continue
            if not 0 <= i < len(entries):
                errors.append(f'merges[{n}] "{name}": index {i} out of range (0..{len(entries) - 1})')
                bad = True
                continue
            if i in claimed:
                errors.append(f'merges[{n}] "{name}": index {i} already merged into "{claimed[i]}"')
                bad = True
                continue
            idxs.append(i)
        if bad:
            continue

        boxes = [entry_pixel_box(cat, entries[i]) for i in idxs]
        x0 = min(b[0] for b in boxes)
        y0 = min(b[1] for b in boxes)
        x1 = max(b[0] + b[2] for b in boxes)
        y1 = max(b[1] + b[3] for b in boxes)

        # Anything catalogued inside the union box but left out of `cells` would
        # be silently swallowed by the merged entry. That is a naming mistake,
        # not a preference, so refuse it rather than quietly eating a sprite.
        swallowed = []
        for j, other in enumerate(entries):
            if j in idxs:
                continue
            ox, oy, ow, oh = entry_pixel_box(cat, other)
            if ox >= x0 and oy >= y0 and ox + ow <= x1 and oy + oh <= y1:
                swallowed.append(j)
        if swallowed:
            errors.append(
                f'merges[{n}] "{name}": box ({x0},{y0},{x1 - x0},{y1 - y0}) also covers '
                f'un-merged entries {swallowed} — add them to "cells" or shrink the merge')
            continue

        merged = {'name': name, 'kind': 'object', 'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}
        tags = spec.pop('tags', None)
        base_tags = entries[min(idxs)].get('tags', [])
        merged['tags'] = list(dict.fromkeys([*base_tags, *(tags or [])]))
        spec.pop('name', None)
        merged.update(spec)                    # season and any passthrough fields

        for i in idxs:
            claimed[i] = name
        planned.append((min(idxs), merged, set(idxs)))

    return planned, claimed


def apply_names(cat, spec):
    """Returns (renamed, dropped, merged, errors). Mutates `cat` only if errors is empty."""
    names, merges = split_spec(spec)
    entries = cat.get('entries', [])
    staged, dropped, errors = [], [], []

    for key, raw in names.items():
        try:
            idx = int(key)
        except (TypeError, ValueError):
            errors.append(f'key "{key}" is not an entry index')
            continue
        if not 0 <= idx < len(entries):
            errors.append(f'index {idx} out of range (0..{len(entries) - 1})')
            continue
        try:
            entry_spec = normalise(raw)
        except ValueError as exc:
            errors.append(f'index {idx}: {exc}')
            continue

        if entry_spec.pop('drop', False):
            dropped.append(idx)
            continue
        if not _validate_common(entry_spec, idx, errors):
            continue
        staged.append((idx, entry_spec))

    planned, claimed = _plan_merges(cat, merges, entries, errors)

    for idx, _ in staged:
        if idx in claimed:
            errors.append(f'index {idx} is both renamed and merged into "{claimed[idx]}"')
    for idx in dropped:
        if idx in claimed:
            errors.append(f'index {idx} is both dropped and merged into "{claimed[idx]}"')

    # Project the finished catalogue before writing anything: a name collision
    # discovered halfway through would leave a file that fails the trust gate.
    consumed = set(claimed)
    dropping = set(dropped)
    renames = {idx: s.get('name') for idx, s in staged}
    projected = {}
    for i, entry in enumerate(entries):
        if i in dropping or i in consumed:
            continue
        projected.setdefault(renames.get(i) or entry.get('name'), []).append(i)
    for _, merged, _ in planned:
        projected.setdefault(merged['name'], []).append('merge')
    for name, where in projected.items():
        if len(where) > 1:
            errors.append(f'duplicate name "{name}" would apply to {where}')

    if errors:
        return 0, 0, 0, errors

    for idx, entry_spec in staged:
        entry = entries[idx]
        tags = entry_spec.pop('tags', None)
        if tags:
            entry['tags'] = list(dict.fromkeys([*entry.get('tags', []), *tags]))
        entry.update(entry_spec)
        entry.pop('needsNaming', None)

    # Rebuild in one pass so a merged entry lands where its first cell was,
    # keeping the catalogue in reading order rather than appending to the end.
    inserts = {anchor: merged for anchor, merged, _ in planned}
    rebuilt = []
    for i, entry in enumerate(entries):
        if i in inserts:
            rebuilt.append(inserts[i])
        if i in dropping or i in consumed:
            continue
        rebuilt.append(entry)
    cat['entries'] = rebuilt

    # A catalogue whose tile entries were all merged away has no grid left to
    # describe, and the validator rejects grid fields it can't check against.
    if not any(e.get('kind') == 'tile' for e in rebuilt):
        for f in ('gridTileWidth', 'gridTileHeight', 'gridCols', 'gridRows'):
            cat.pop(f, None)

    return len(staged), len(dropped), len(planned), []


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', required=True)
    parser.add_argument('--names', required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)

    with open(args.catalogue) as fh:
        cat = json.load(fh)
    with open(args.names) as fh:
        spec = json.load(fh)

    renamed, dropped, merged, errors = apply_names(cat, spec)
    if errors:
        for e in errors:
            print(f'X {e}', file=sys.stderr)
        print('\nnothing written -- fix the errors above', file=sys.stderr)
        return 1

    remaining = sum(1 for e in cat['entries'] if e.get('needsNaming'))
    if not args.dry_run:
        with open(args.catalogue, 'w') as fh:
            json.dump(cat, fh, indent=2)
            fh.write('\n')
    print(f'{"would rename" if args.dry_run else "renamed"} {renamed}, merged {merged}, '
          f'dropped {dropped}, {remaining} still need naming')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
