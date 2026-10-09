#!/usr/bin/env python3
"""
Complete our LPC library with motions that upstream Universal LPC has added
since our snapshot (run, jump, sit, emote, climb, ...), for the items in the
game catalogue.

Upstream now ships new motions as ONE base sheet per item (recoloured at
runtime); our library keeps one PNG per colour. For each colour we learn the
exact base → colour mapping by comparing upstream's base walk sheet with our
walk/<colour>.png pixel by pixel, then recolour the new sheets with it. Colours
in a new sheet that the walk sheet never uses go to the nearest mapped base
colour (reported). Items whose walk art differs from upstream are skipped.

Per-file credits are copied from upstream's CREDITS.csv into public/CREDITS.csv.

    python3 tools/sync_upstream_motions.py            # report what would be added
    python3 tools/sync_upstream_motions.py --apply    # write sheets + credits
Afterwards: node tools/annotate_anims.js (catalogue anims manifests), npm test.
"""
import argparse
import csv
import io
import json
import os
import subprocess
import sys
import urllib.request
from collections import Counter

from PIL import Image

AMO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
LIB = os.path.join(AMO, 'ressources', 'lpc_merged', 'spritesheets')
CACHE = os.path.join(AMO, 'ressources', 'upstream_cache')          # gitignored, like all of ressources/
CATALOGUE = os.path.join(AMO, 'src', 'data', 'character_catalogue.json')
CREDITS = os.path.join(AMO, 'public', 'CREDITS.csv')
REPO = 'LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator'
RAW = f'https://raw.githubusercontent.com/{REPO}/master/'

MOTIONS = ['walk', 'idle', 'hurt', 'slash', 'backslash', 'halfslash', 'thrust', 'shoot', 'spellcast',
           'run', 'sit', 'jump', 'climb', 'combat_idle', 'emote']
UPNAME = {'combat_idle': ['combat_idle', 'combat'], 'backslash': ['backslash', '1h_backslash'],
          'halfslash': ['halfslash', '1h_halfslash']}
RENDER_TYPE = {'torso_clothes': 'torso', 'torso_jacket': 'torso', 'torso_mail': 'torso', 'torso_armour': 'torso',
               'torso_waist': 'torso', 'tail': 'body', 'wings': 'body', 'ears': 'head', 'horns': 'head',
               'fins': 'head', 'nose': 'head', 'staff_accessory': 'weapon'}


def render_type(slot):
    return 'body' if slot.startswith('wound_') else RENDER_TYPE.get(slot, slot)


# ── upstream ────────────────────────────────────────────────────────────────

def upstream_files():
    """Every PNG path under upstream spritesheets/ (cached in ressources/upstream_cache/files.json)."""
    path = os.path.join(CACHE, 'files.json')
    if os.path.exists(path):
        return set(json.load(open(path)))
    def tree(sha, rec=False):
        out = subprocess.run(['gh', 'api', f'repos/{REPO}/git/trees/{sha}' + ('?recursive=1' if rec else '')],
                             capture_output=True, text=True, check=True).stdout
        return json.loads(out)
    root = tree('master')
    ss = next(e['sha'] for e in root['tree'] if e['path'] == 'spritesheets')
    files = set()
    for top in tree(ss)['tree']:
        if top['type'] != 'tree':
            continue
        t = tree(top['sha'], True)
        if t.get('truncated'):
            sys.exit(f'upstream tree for {top["path"]} truncated; cannot trust the listing')
        files |= {f"{top['path']}/{e['path']}" for e in t['tree'] if e['type'] == 'blob' and e['path'].endswith('.png')}
    os.makedirs(CACHE, exist_ok=True)
    json.dump(sorted(files), open(path, 'w'))
    return files


def fetch(rel):
    """Download an upstream file into the cache (once) and return its local path."""
    local = os.path.join(CACHE, rel)
    if not os.path.exists(local):
        os.makedirs(os.path.dirname(local), exist_ok=True)
        with urllib.request.urlopen(RAW + rel, timeout=60) as r:
            data = r.read()
        with open(local, 'wb') as f:
            f.write(data)
    return local


def sheet_definition_credits():
    """Credit entries from upstream sheet_definitions/*.json — they cover new sheets CREDITS.csv lacks.
    Each: {file: item path prefix, notes, authors[], licenses[], urls[]}."""
    path = os.path.join(CACHE, 'sheet_credits.json')
    if os.path.exists(path):
        return json.load(open(path))
    sha = next(e['sha'] for e in json.loads(subprocess.run(['gh', 'api', f'repos/{REPO}/git/trees/master'],
               capture_output=True, text=True, check=True).stdout)['tree'] if e['path'] == 'sheet_definitions')
    names = [e['path'] for e in json.loads(subprocess.run(['gh', 'api', f'repos/{REPO}/git/trees/{sha}?recursive=1'],
             capture_output=True, text=True, check=True).stdout)['tree'] if e['type'] == 'blob' and e['path'].endswith('.json')]
    out = []
    for n in names:
        try:
            d = json.load(open(fetch(f'sheet_definitions/{n}')))
        except (ValueError, OSError):
            continue
        for c in d.get('credits', []) if isinstance(d, dict) else []:
            if isinstance(c, dict) and c.get('file'):
                out.append(c)
    json.dump(out, open(path, 'w'))
    return out


def credit_for(src, rows, defs):
    """[notes, authors, licenses, urls] for an upstream sheet: its CREDITS.csv row, else the
    sheet-definition credit with the longest matching item path."""
    r = rows.get(src)
    if r:
        return r[1:5]
    best = max((c for c in defs if src.startswith(c['file'].rstrip('/') + '/')), key=lambda c: len(c['file']), default=None)
    if best:
        return [best.get('notes', ''), ','.join(best.get('authors', [])), ','.join(best.get('licenses', [])), ','.join(best.get('urls', []))]
    return None


def upstream_credits():
    rows = {}
    text = open(fetch('CREDITS.csv'), encoding='utf-8').read()
    for row in csv.reader(io.StringIO(text), skipinitialspace=True):
        if row and row[0] != 'filename':
            rows[row[0].strip()] = [c.strip() for c in row]
    return rows


# ── planning ────────────────────────────────────────────────────────────────

def plan(catalogue, up):
    """[(slot, layer_id, item_or_None, colours_or_None, motion, upstream_rel)] for motions we lack and upstream has."""
    out = []
    for slot, entries in catalogue.items():
        t0 = render_type(slot)
        for e in entries:
            if not e.get('id'):
                continue
            t = e.get('renderType') or t0
            colours = e.get('colors') or None
            for layer in [e] + (e.get('companions') or []):
                lid = layer['id']
                item = layer.get('itemName') or (lid.split('/')[-1] if t == 'weapon' and not colours else None)
                for m in MOTIONS:
                    probe = item or (colours[0] if colours else None)
                    ours = os.path.join(LIB, t, lid, m, f'{probe}.png') if probe else os.path.join(LIB, t, lid, f'{m}.png')
                    if os.path.exists(ours):
                        continue
                    src = next((f'{t}/{lid}/{um}.png' for um in UPNAME.get(m, [m]) if f'{t}/{lid}/{um}.png' in up), None)
                    if src:
                        out.append((slot, t, lid, item, colours, m, src))
    return out


# ── recolouring ─────────────────────────────────────────────────────────────

def colour_map(base_walk, our_walk):
    """Exact base → target colour map from two renderings of the same walk art; None if the art differs."""
    a, b = Image.open(base_walk).convert('RGBA'), Image.open(our_walk).convert('RGBA')
    if a.size != b.size:
        return None
    votes, mismatch, total = {}, 0, 0
    pa, pb = a.getdata(), b.getdata()
    for x, y in zip(pa, pb):
        if x[3] == 0 and y[3] == 0:
            continue
        total += 1
        if (x[3] == 0) != (y[3] == 0):
            mismatch += 1
            continue
        votes.setdefault(x, Counter())[y] += 1
    if not total or mismatch / total > 0.02:
        return None
    return {src: c.most_common(1)[0][0] for src, c in votes.items()}


def recolour(sheet, cmap):
    im = Image.open(sheet).convert('RGBA')
    keys = list(cmap)
    unmapped = 0
    out = []
    for p in im.getdata():
        if p[3] == 0:
            out.append(p)
        elif p in cmap:
            out.append(cmap[p])
        else:
            unmapped += 1
            near = min(keys, key=lambda k: sum((k[i] - p[i]) ** 2 for i in range(3)))
            t = cmap[near]
            out.append((t[0], t[1], t[2], p[3]))
    im.putdata(out)
    return im, unmapped


def fix_placeholders(rows, defs):
    """Rewrite CREDITS.csv rows that an earlier run left as placeholders."""
    text = open(CREDITS, encoding='utf-8').read()
    out, fixed, left = [], 0, []
    for line in text.splitlines(keepends=True):
        if 'see upstream CREDITS.csv' not in line:
            out.append(line); continue
        rel = next(csv.reader([line]))[0].strip()
        parts = rel.split('/')
        src = '/'.join(parts[:-2] + [parts[-2] + '.png']) if len(parts) > 2 and os.path.isdir(os.path.join(LIB, *parts[:-1])) else rel
        cr = credit_for(src, rows, defs)
        if not cr:
            left.append(rel); out.append(line); continue
        buf = io.StringIO()
        csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator='\n').writerow(
            [rel, (cr[0] + '; ' if cr[0] else '') + 'recoloured per colour for Arcane Majesty from the upstream base sheet', cr[1], cr[2], cr[3]])
        out.append(buf.getvalue()); fixed += 1
    open(CREDITS, 'w', encoding='utf-8').write(''.join(out))
    print(f'{fixed} placeholder credit rows fixed; {len(left)} still without a credit')
    for r in left[:20]:
        print('  NO CREDIT:', r)


# ── main ────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--fix-credits', action='store_true', help='replace placeholder credit rows written by an earlier run')
    args = ap.parse_args()
    catalogue = json.load(open(CATALOGUE))
    up = upstream_files()
    todo = plan(catalogue, up)
    credits_up = upstream_credits() if (args.apply or args.fix_credits) else {}
    defs = sheet_definition_credits() if (args.apply or args.fix_credits) else []
    if args.fix_credits:
        return fix_placeholders(credits_up, defs)
    new_rows, written, skipped = [], 0, []
    for slot, t, lid, item, colours, m, src in todo:
        targets = []                                   # (our relative path, recolour map or None)
        if colours:
            for c in colours:
                # learn the colour from any motion both sides have (walk first)
                pairs = [(f'{t}/{lid}/{lm}.png', os.path.join(LIB, t, lid, lm, f'{c}.png')) for lm in MOTIONS]
                pairs = [(b, o) for b, o in pairs if b in up and os.path.exists(o)]
                if pairs:
                    targets.append((f'{t}/{lid}/{m}/{c}.png', ('map', pairs)))
        elif item:
            targets.append((f'{t}/{lid}/{m}/{item}.png', None))
        else:
            targets.append((f'{t}/{lid}/{m}.png', None))
        print(f'{slot:14} {lid:36} +{m:10} → {len(targets)} file(s)')
        if not args.apply:
            continue
        sheet = fetch(f'spritesheets/{src}')
        for rel, how in targets:
            if how:
                cmap = next((cm for b, o in how[1] for cm in [colour_map(fetch(f'spritesheets/{b}'), o)] if cm), None)
                if cmap is None:
                    skipped.append(f'{rel}: our walk art differs from upstream, colours not learnable'); continue
                im, unmapped = recolour(sheet, cmap)
                if unmapped:
                    print(f'      {rel}: {unmapped} px with colours unseen in walk → nearest mapped')
            else:
                im = Image.open(sheet).convert('RGBA')
            dst = os.path.join(LIB, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im.save(dst)
            written += 1
            cr = credit_for(src, credits_up, defs)
            if not cr:
                skipped.append(f'{rel}: no upstream credit found for {src} — file written, credit MISSING'); continue
            note = (cr[0] + '; ' if cr[0] else '') + ('recoloured per colour for Arcane Majesty from the upstream base sheet' if how else 'from upstream Universal LPC')
            new_rows.append([rel, note, cr[1], cr[2], cr[3]])
    if args.apply and new_rows:
        existing = open(CREDITS, encoding='utf-8').read()
        buf = io.StringIO()
        w = csv.writer(buf, quoting=csv.QUOTE_ALL, lineterminator='\n')
        for r in new_rows:
            if f'"{r[0]}"' not in existing:
                w.writerow(r)
        with open(CREDITS, 'a', encoding='utf-8') as f:
            if not existing.endswith('\n'):
                f.write('\n')
            f.write(buf.getvalue())
    print(f'\n{len(todo)} motions on {len({(x[2], x[3]) for x in todo})} layers'
          + (f'; {written} files written' if args.apply else ' (dry run)'))
    for s in skipped:
        print('  SKIPPED/CHECK:', s)


if __name__ == '__main__':
    sys.exit(main())
