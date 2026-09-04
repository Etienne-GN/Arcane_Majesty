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

An entry that is really an animation strip takes "animate", which slices its
box into equal frames the sprite ledger plays back:

    {"12": {"name": "torch_flame", "animate": {"count": 4, "durationMs": 120}}}

Frames run left to right by default; pass "axis": "y" for a vertical strip.
A merge accepts "animate" too, for a strip that spans several grid cells.

Frames that are not uniform -- an expanding flash, a spreading splash -- take
their boxes outright instead of a count:

    {"animate": {"frames": [{"x": 448, "y": 99, "w": 30, "h": 29}, ...]}}

Anything named here loses its `needsNaming` flag; anything left out keeps it,
so a partial pass is safe and resumable. Entries marked `"drop": true` are
removed -- that's how noise the slicer picked up gets discarded.

Run: python3 apply_names.py --catalogue sheet.catalogue.json --names names.json
"""
import argparse
import json
import os
import re
import sys

# autoslice is only needed for alpha-mode splits; a caller that never asks for
# one shouldn't be forced to have numpy/PIL installed.
try:
    from autoslice import find_boxes, load_mask
except ImportError:                            # pragma: no cover
    find_boxes = load_mask = None

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
    """Accept either the flat index map or the {names, merges, splits} form."""
    if isinstance(spec, dict) and any(k in spec for k in ('names', 'merges', 'splits')):
        return spec.get('names', {}), spec.get('merges', []), spec.get('splits', [])
    return spec, [], []


def build_frames(box, count, axis='x'):
    """Slices a box into `count` equal frames along `axis`.

    Returns (frames, error). Refuses a split that isn't exact: a strip whose
    width doesn't divide evenly means the frame count is wrong, and rounding
    it would silently smear every frame after the first.
    """
    x, y, w, h = box
    if axis not in ('x', 'y'):
        return None, f'axis must be "x" or "y" (got {axis!r})'
    if not isinstance(count, int) or isinstance(count, bool) or count < 2:
        return None, f'"count" must be an integer >= 2 (got {count!r})'
    span = w if axis == 'x' else h
    if span % count:
        return None, (f'{span}px does not divide into {count} equal frames along {axis} '
                      f'-- check the frame count')
    size = span // count
    if axis == 'x':
        return [{'x': x + i * size, 'y': y, 'w': size, 'h': h} for i in range(count)], None
    return [{'x': x, 'y': y + i * size, 'w': w, 'h': size} for i in range(count)], None


def _check_frame_boxes(raw, label, errors):
    """Validates an explicit frames list. Returns the frames, or None."""
    if not isinstance(raw, list) or len(raw) < 2:
        errors.append(f'{label}: "frames" must list at least 2 boxes')
        return None
    frames = []
    for i, f in enumerate(raw):
        if not isinstance(f, dict):
            errors.append(f'{label}: frames[{i}] must be an object with x/y/w/h')
            return None
        box = {}
        for k in ('x', 'y', 'w', 'h'):
            v = f.get(k)
            if not isinstance(v, int) or isinstance(v, bool):
                errors.append(f'{label}: frames[{i}]."{k}" must be an integer (got {v!r})')
                return None
            box[k] = v
        if box['w'] <= 0 or box['h'] <= 0:
            errors.append(f'{label}: frames[{i}] w/h must be > 0')
            return None
        frames.append(box)
    return frames


def apply_animate(entry, box, spec, label, errors):
    """Turns an `animate` spec into `frames` / `frameDurationMs` on `entry`."""
    if not isinstance(spec, dict):
        errors.append(f'{label}: "animate" must be an object')
        return
    # Equal splitting covers a regular strip. It cannot describe frames that
    # grow (an expanding flash, a spreading splash), which is most of what a
    # real effects sheet contains -- those need their boxes given outright.
    if 'frames' in spec:
        frames = _check_frame_boxes(spec['frames'], label, errors)
        if frames is None:
            return
    else:
        frames, err = build_frames(box, spec.get('count'), spec.get('axis', 'x'))
        if err:
            errors.append(f'{label}: {err}')
            return
    duration = spec.get('durationMs')
    if duration is not None and not (isinstance(duration, int) and duration > 0):
        errors.append(f'{label}: "durationMs" must be a positive integer')
        return
    entry['frames'] = frames
    if duration is not None:
        entry['frameDurationMs'] = duration


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
        animate = spec.pop('animate', None)
        merged.update(spec)                    # season and any passthrough fields
        if animate is not None:
            apply_animate(merged, (x0, y0, x1 - x0, y1 - y0), animate,
                          f'merges[{n}] "{name}"', errors)

        for i in idxs:
            claimed[i] = name
        planned.append((min(idxs), merged, set(idxs)))

    return planned, claimed


def _plan_splits(cat, splits, entries, errors, mask_loader=None):
    """Turns split specs into (index, [replacement entries]).

    A split is the inverse of a merge: one entry that actually covers several
    sprites becomes several. Three ways to say where the cuts go --

      {"entry": "stove", "rows": 2}                  even grid, reading order
      {"entry": "props", "alpha": true}              one per alpha island
      {"entry": "x", "into": [{name,x,y,w,h}, ...]}  explicit boxes

    -- because tile sheets split evenly, prop sheets split on transparency,
    and the awkward ones need to be said outright.
    """
    planned = []
    claimed = {}
    by_name = {e.get('name'): i for i, e in enumerate(entries)}

    for n, raw in enumerate(splits):
        if not isinstance(raw, dict):
            errors.append(f'splits[{n}]: expected an object')
            continue
        spec = dict(raw)
        target = spec.pop('entry', None)
        label = f'splits[{n}] "{target}"'
        if target is None or target not in by_name:
            errors.append(f'splits[{n}]: no entry named "{target}"')
            continue
        idx = by_name[target]
        if idx in claimed:
            errors.append(f'{label}: entry already split by splits[{claimed[idx]}]')
            continue
        entry = entries[idx]
        if entry.get('kind') != 'object':
            errors.append(f'{label}: only "object" entries can be split')
            continue
        bx, by_, bw, bh = entry['x'], entry['y'], entry['w'], entry['h']

        names = spec.pop('names', None)
        boxes = None

        if 'into' in spec:
            boxes = []
            for i, b in enumerate(spec.pop('into')):
                if not isinstance(b, dict) or not all(
                        isinstance(b.get(k), int) and not isinstance(b.get(k), bool)
                        for k in ('x', 'y', 'w', 'h')):
                    errors.append(f'{label}: into[{i}] needs integer x/y/w/h')
                    boxes = None
                    break
                boxes.append(b)
        elif spec.pop('alpha', False):
            if mask_loader is None:
                errors.append(f'{label}: alpha splitting needs the sheet image')
                continue
            mask = mask_loader()
            if mask is None:
                errors.append(f'{label}: could not read the sheet image')
                continue
            sub = mask[by_:by_ + bh, bx:bx + bw]
            found = find_boxes(sub, gap=spec.pop('gap', 1), min_area=spec.pop('minArea', 16))
            boxes = [{'x': b['x'] + bx, 'y': b['y'] + by_, 'w': b['w'], 'h': b['h']} for b in found]
        else:
            rows = spec.pop('rows', 1)
            cols = spec.pop('cols', 1)
            if not all(isinstance(v, int) and not isinstance(v, bool) and v >= 1
                       for v in (rows, cols)) or rows * cols < 2:
                errors.append(f'{label}: "rows"/"cols" must be integers with rows*cols >= 2')
                continue
            if bw % cols or bh % rows:
                errors.append(f'{label}: {bw}x{bh} does not divide into {cols}x{rows} equal parts')
                continue
            cw, ch = bw // cols, bh // rows
            boxes = [{'x': bx + c * cw, 'y': by_ + r * ch, 'w': cw, 'h': ch}
                     for r in range(rows) for c in range(cols)]

        if boxes is None:
            continue
        if len(boxes) < 2:
            errors.append(f'{label}: produced {len(boxes)} piece(s) — a split must yield at least 2')
            continue
        if names is not None and len(names) != len(boxes):
            errors.append(f'{label}: {len(names)} name(s) for {len(boxes)} piece(s)')
            continue

        pieces = []
        ok = True
        for i, box in enumerate(boxes):
            if names is not None:
                piece_name = names[i]
                if not NAME_RE.fullmatch(str(piece_name)):
                    errors.append(f'{label}: name "{piece_name}" is not snake_case')
                    ok = False
                    break
            else:
                piece_name = f'{target}_{i:02d}'
            piece = {'name': piece_name, 'kind': 'object', **box,
                     'tags': list(entry.get('tags', []))}
            if entry.get('season'):
                piece['season'] = entry['season']
            if names is None:
                piece['needsNaming'] = True
            pieces.append(piece)
        if not ok:
            continue

        claimed[idx] = n
        planned.append((idx, pieces))

    return planned, claimed


def apply_names(cat, spec, sheet_dir=None):
    """Returns (renamed, dropped, merged, split, errors).

    Mutates `cat` only if errors is empty. `sheet_dir` is where `cat['source']`
    lives; it is only needed for alpha-mode splits.
    """
    names, merges, splits = split_spec(spec)
    entries = cat.get('entries', [])
    staged, dropped, errors = [], [], []

    cached_mask = []

    def mask_loader():
        """Loads the sheet once, however many alpha splits ask for it."""
        if cached_mask:
            return cached_mask[0]
        if load_mask is None or sheet_dir is None:
            return None
        path = os.path.join(sheet_dir, cat.get('source', ''))
        if not os.path.exists(path):
            return None
        cached_mask.append(load_mask(path))
        return cached_mask[0]

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
        # Check the animate spec now: a bad frame count must abort the whole
        # batch, not surface after half the renames are already applied.
        if 'animate' in entry_spec:
            probe = {}
            apply_animate(probe, entry_pixel_box(cat, entries[idx]), entry_spec['animate'],
                          f'index {idx}', errors)
            if 'frames' not in probe:
                continue
        staged.append((idx, entry_spec))

    planned, claimed = _plan_merges(cat, merges, entries, errors)
    split_planned, split_claimed = _plan_splits(cat, splits, entries, errors, mask_loader)

    for idx in split_claimed:
        if idx in claimed:
            errors.append(f'entry {idx} is both split and merged into "{claimed[idx]}"')

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
    splitting = set(split_claimed)
    renames = {idx: s.get('name') for idx, s in staged}
    projected = {}
    for i, entry in enumerate(entries):
        if i in dropping or i in consumed or i in splitting:
            continue
        projected.setdefault(renames.get(i) or entry.get('name'), []).append(i)
    for _, merged, _ in planned:
        projected.setdefault(merged['name'], []).append('merge')
    for _, pieces in split_planned:
        for piece in pieces:
            projected.setdefault(piece['name'], []).append('split')
    for name, where in projected.items():
        if len(where) > 1:
            errors.append(f'duplicate name "{name}" would apply to {where}')

    if errors:
        return 0, 0, 0, 0, errors

    for idx, entry_spec in staged:
        entry = entries[idx]
        tags = entry_spec.pop('tags', None)
        if tags:
            entry['tags'] = list(dict.fromkeys([*entry.get('tags', []), *tags]))
        animate = entry_spec.pop('animate', None)
        entry.update(entry_spec)
        entry.pop('needsNaming', None)
        if animate is not None:
            apply_animate(entry, entry_pixel_box(cat, entry), animate, f'index {idx}', errors)

    # Rebuild in one pass so a merged entry lands where its first cell was,
    # keeping the catalogue in reading order rather than appending to the end.
    inserts = {anchor: merged for anchor, merged, _ in planned}
    replacements = dict(split_planned)
    rebuilt = []
    for i, entry in enumerate(entries):
        if i in inserts:
            rebuilt.append(inserts[i])
        if i in replacements:
            rebuilt.extend(replacements[i])       # a split lands where it was
            continue
        if i in dropping or i in consumed:
            continue
        rebuilt.append(entry)
    cat['entries'] = rebuilt

    # A catalogue whose tile entries were all merged away has no grid left to
    # describe, and the validator rejects grid fields it can't check against.
    if not any(e.get('kind') == 'tile' for e in rebuilt):
        for f in ('gridTileWidth', 'gridTileHeight', 'gridCols', 'gridRows'):
            cat.pop(f, None)

    return len(staged), len(dropped), len(planned), len(split_planned), []


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

    renamed, dropped, merged, split, errors = apply_names(
        cat, spec, sheet_dir=os.path.dirname(os.path.abspath(args.catalogue)))
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
          f'split {split}, dropped {dropped}, {remaining} still need naming')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
