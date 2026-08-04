#!/usr/bin/env python3
"""Syllable-count audit for the A Tapestry of Souls trilogy.

For KEPT songs (archive sections with <original> + <reworked>): compare each
line's syllable count between original and reworked, per section, so reworked
lyrics fit the existing melody.

NEW songs (no <original>) are skipped: no melody exists yet, Suno composes to
the lyrics, so no syllable constraint applies.

Usage: python3 syllable_check.py "<Album Name>" [--song NAME]
Exit 0 when no issues found, 1 otherwise.
"""
import sys, glob, os, re
import xml.etree.ElementTree as ET

VOWELS = 'aeiouy'

def syllables(word):
    """Approximate syllable count for an English word (comparative use)."""
    w = re.sub(r'[^a-z]', '', word.lower())
    if not w:
        return 0
    # silent trailing e (not 'le' where it's pronounced, handled below)
    if w.endswith('e') and not w.endswith('le'):
        w = w[:-1]
    count = 0
    prev_vowel = False
    for ch in w:
        is_v = ch in VOWELS
        if is_v and not prev_vowel:
            count += 1
        prev_vowel = is_v
    if count == 0:
        count = 1
    return count

def lines(text):
    out = []
    for ln in text.splitlines():
        ln = ln.strip()
        if not ln or re.match(r'^\[[^\]]+\]$', ln):
            continue
        out.append(ln)
    return out

def count_line(ln):
    return sum(syllables(w) for w in ln.split())

def report(title, pairs):
    issues = []
    for (ol, rl) in pairs:
        oc, rc = count_line(ol), count_line(rl)
        if oc != rc:
            issues.append(f'  orig {oc:2d} | {ol}\n  rewk {rc:2d} | {rl}')
    if issues:
        print(f'\n[{title}] SYLLABLE MISMATCHES')
        print('\n'.join(issues))
    return len(issues)

def section_blocks(root):
    """Return [(section_name, [original_lines], [reworked_lines])]."""
    blocks = []
    for sec in root.findall('./lyrics/section'):
        o = sec.find('original')
        r = sec.find('reworked')
        ol = lines((o.text or '')) if o is not None and o.get('not_applicable') != 'true' else []
        rl = lines((r.text or '')) if r is not None and r.get('not_applicable') != 'true' else []
        blocks.append((sec.get('name'), ol, rl))
    return blocks

def seq_key(name):
    """Group parallel sections: Verse/Verse 1/2/3 -> 'Verse', Pre/Pre-Chorus -> 'Pre', etc."""
    n = name.strip('[]').strip().lower()
    n = n.replace('pre-chorus', 'pre').replace('prechorus', 'pre')
    if n.startswith('verse'):
        return 'verse'
    if n.startswith('chorus'):
        return 'chorus'
    if n.startswith('bridge'):
        return 'bridge'
    if n.startswith('outro'):
        return 'outro'
    if n.startswith('intro'):
        return 'intro'
    return n

def main():
    album = sys.argv[1]
    only = None
    if '--song' in sys.argv:
        only = sys.argv[sys.argv.index('--song') + 1]
    archive_dir = f'archives/processed_albums/{album}'
    master_path = f'data/lore/xmls/processed_albums/{album.replace(" - ", "_").replace(" ", "_")}.xml'
    issues = 0
    master = ET.parse(master_path).getroot()
    for path in sorted(glob.glob(archive_dir + '/*.xml')):
        root = ET.parse(path).getroot()
        name = root.get('name') or os.path.basename(path)[:-4]
        if only and name != only:
            continue
        blocks = section_blocks(root)
        has_orig = any(ol for _, ol, _ in blocks)
        if has_orig:
            total_pairs = 0
            for sec_name, ol, rl in blocks:
                n = min(len(ol), len(rl))
                total_pairs += n
                issues += report(f'{name} / {sec_name}', list(zip(ol[:n], rl[:n])))
                if len(ol) != len(rl):
                    print(f'[{name} / {sec_name}] line-count differ: orig={len(ol)} reworked={len(rl)}')
                    issues += 1
        # new songs: no melody exists yet (Suno composes to the lyrics),
        # so no syllable constraint applies — skip.

    print('SYLLABLE PASS' if issues == 0 else f'{issues} issue(s)')
    sys.exit(0 if issues == 0 else 1)

if __name__ == '__main__':
    main()
