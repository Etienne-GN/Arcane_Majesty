#!/usr/bin/env python3
"""
Add public/CREDITS.csv rows for library sheets that have none, under a path
prefix (e.g. "eyes/"). Credit sources, in order — each row's note says which:
  1. the sheet's own upstream row (upstream or snapshot CREDITS.csv); our
     per-colour file <item>/<motion>/<colour>.png inherits <item>/<motion>.png
  2. the upstream sheet_definitions credit with the longest matching item path
  3. eyes/human/<age>/<expression>: upstream folded these expressions into
     head/faces ("ULPC Expanded Expressions"), credited there
  4. <type>/_from_vitruvius/<name>: the Vitruvius credits.json entry for <name>
Anything still unresolved is listed, never invented.

    python3 tools/fill_missing_credits.py eyes/            # report
    python3 tools/fill_missing_credits.py eyes/ --apply    # append rows
Needs ressources/upstream_cache (made by tools/sync_upstream_motions.py).
"""
import argparse
import csv
import io
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sync_upstream_motions as up  # noqa: E402  (shares the cache and credit lookups)

SNAPSHOT_CREDITS = os.path.join(up.AMO, 'ressources', 'lpc_universal', 'CREDITS.csv')
VITRUVIUS_CREDITS = os.path.join(up.AMO, 'ressources', 'lpc_vitruvius', 'credits.json')
ALIASES = {'combat_idle': ['combat_idle', 'combat'], 'backslash': ['backslash', '1h_backslash'],
           'halfslash': ['halfslash', '1h_halfslash']}


def read_rows(path):
    rows = {}
    if os.path.exists(path):
        for r in csv.reader(open(path, encoding='utf-8'), skipinitialspace=True):
            if r and r[0] != 'filename':
                rows[r[0].strip()] = [c.strip() for c in r]
    return rows


def vitruvius_entries():
    out = {}
    if os.path.exists(VITRUVIUS_CREDITS):
        def walk(node):
            if isinstance(node, dict):
                if 'authors' in node and 'id' in node:
                    out.setdefault(node['id'].split('.')[-1], node)
                for v in node.values():
                    walk(v)
        walk(json.load(open(VITRUVIUS_CREDITS)))
    return out


def base_candidates(rel):
    """Upstream-style paths a per-colour/per-motion file inherits its credit from."""
    parts = rel[:-4].split('/')
    out = [rel]
    if len(parts) >= 3:                      # <item>/<motion>/<file>
        item, motion = '/'.join(parts[:-2]), parts[-2]
        out += [f'{item}/{m}.png' for m in ALIASES.get(motion, [motion])]
    return out


def resolve(rel, rows, defs, faces, vitruvius):
    for cand in base_candidates(rel):
        if cand in rows:
            r = rows[cand]
            return r[1:5], f'credits of upstream {cand}'
    for cand in base_candidates(rel):
        cr = up.credit_for(cand, {}, defs)
        if cr:
            return cr, 'upstream sheet_definitions credits'
    p = rel.split('/')
    if p[:2] == ['eyes', 'human'] and faces:
        return ([faces.get('notes', ''), ','.join(faces['authors']), ','.join(faces['licenses']), ','.join(faces['urls'])],
                'eye expression folded upstream into head/faces ("ULPC Expanded Expressions"), credited there')
    if len(p) > 2 and p[1] == '_from_vitruvius' and p[2] in vitruvius:
        v = vitruvius[p[2]]
        return (['; '.join(v.get('notes', [])), ','.join(v['authors']), ','.join(v['licenses']), ','.join(v.get('urls', []))],
                f'Vitruvius credits.json entry {v["id"]}')
    return None, None


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('prefix')
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()
    have = read_rows(up.CREDITS)
    rows = {**read_rows(SNAPSHOT_CREDITS), **up.upstream_credits()}
    defs = up.sheet_definition_credits()
    faces = next((c for c in defs if c['file'] == 'head/faces'), None)
    vitruvius = vitruvius_entries()
    root = os.path.join(up.LIB, args.prefix)
    files = sorted(os.path.relpath(os.path.join(d, f), up.LIB).replace(os.sep, '/')
                   for d, _, fs in os.walk(root) for f in fs if f.endswith('.png'))
    missing = [f for f in files if f not in have]
    new, unresolved, by_source = [], [], {}
    for rel in missing:
        cr, source = resolve(rel, rows, defs, faces, vitruvius)
        if not cr:
            unresolved.append(rel); continue
        key = 'own upstream credit row (inherited by our per-colour file)' if source.startswith('credits of') else source
        by_source[key] = by_source.get(key, 0) + 1
        new.append([rel, (cr[0] + '; ' if cr[0] else '') + f'credit source: {source}', cr[1], cr[2], cr[3]])
    print(f'{len(files)} sheets under {args.prefix}; {len(missing)} without a credit row; {len(new)} resolvable')
    for s, n in sorted(by_source.items(), key=lambda x: -x[1]):
        print(f'  {n:5}  {s}')
    for r in unresolved[:30]:
        print('  UNRESOLVED:', r)
    if len(unresolved) > 30:
        print(f'  … {len(unresolved) - 30} more unresolved')
    if args.apply and new:
        buf = io.StringIO()
        csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator='\n').writerows(new)
        text = open(up.CREDITS, encoding='utf-8').read()
        with open(up.CREDITS, 'a', encoding='utf-8') as f:
            if not text.endswith('\n'):
                f.write('\n')
            f.write(buf.getvalue())
        print(f'appended {len(new)} rows to public/CREDITS.csv')


if __name__ == '__main__':
    sys.exit(main())
