#!/usr/bin/env python3
"""
Applies a batch of names/tags from a contact-sheet naming pass onto a
catalogue, keyed by entry index.

The names file is a JSON object mapping index -> name, or index -> object:

    {
      "0": "oak_tree_large",
      "1": {"name": "pine_snow", "tags": ["conifer"], "season": "winter"},
      "2": {"drop": true}
    }

Anything named here loses its `needsNaming` flag; anything left out keeps it,
so a partial pass is safe and resumable. Entries marked `"drop": true` are
removed -- that's how decorative noise the slicer picked up gets discarded.

Run: python3 apply_names.py --catalogue sheet.catalogue.json --names names.json
"""
import argparse
import json
import re
import sys

SEASONS = {'spring', 'summer', 'autumn', 'winter'}


def normalise(value):
    """Accept either a bare name string or a full {name, tags, season} object."""
    if isinstance(value, str):
        return {'name': value}
    if isinstance(value, dict):
        return dict(value)
    raise ValueError(f'expected a string or object, got {type(value).__name__}')


def apply_names(cat, names):
    """Returns (renamed, dropped, errors). Mutates `cat` only if errors is empty."""
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
            spec = normalise(raw)
        except ValueError as exc:
            errors.append(f'index {idx}: {exc}')
            continue

        if spec.pop('drop', False):
            dropped.append(idx)
            continue

        name = spec.get('name')
        if name is not None and not re.fullmatch(r'[a-z0-9_]+', str(name)):
            errors.append(f'index {idx}: name "{name}" is not snake_case')
            continue
        season = spec.get('season')
        if season is not None and season not in SEASONS:
            errors.append(f'index {idx}: season "{season}" not one of {sorted(SEASONS)}')
            continue
        staged.append((idx, spec))

    # Name collisions have to be caught before anything is written, otherwise a
    # half-applied batch leaves the catalogue failing the validator.
    projected = {}
    dropping = set(dropped)
    renames = {idx: spec.get('name') for idx, spec in staged}
    for i, entry in enumerate(entries):
        if i in dropping:
            continue
        final = renames.get(i) or entry.get('name')
        projected.setdefault(final, []).append(i)
    for name, idxs in projected.items():
        if len(idxs) > 1:
            errors.append(f'duplicate name "{name}" would apply to entries {idxs}')

    if errors:
        return 0, 0, errors

    for idx, spec in staged:
        entry = entries[idx]
        tags = spec.pop('tags', None)
        if tags:
            entry['tags'] = list(dict.fromkeys([*entry.get('tags', []), *tags]))
        entry.update(spec)
        entry.pop('needsNaming', None)

    for idx in sorted(dropped, reverse=True):
        entries.pop(idx)

    return len(staged), len(dropped), []


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', required=True)
    parser.add_argument('--names', required=True)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args(argv)

    with open(args.catalogue) as fh:
        cat = json.load(fh)
    with open(args.names) as fh:
        names = json.load(fh)

    renamed, dropped, errors = apply_names(cat, names)
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
    print(f'{"would rename" if args.dry_run else "renamed"} {renamed}, dropped {dropped}, '
          f'{remaining} still need naming')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
