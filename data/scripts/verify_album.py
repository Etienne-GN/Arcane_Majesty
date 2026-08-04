#!/usr/bin/env python3
"""Verify a processed album: parse-check master + archives, and diff each
archive <reworked> block against the master <Lyrics> (ignoring [Section]
headers and normalizing curly -> straight apostrophes).

Usage: python3 verify_album.py "<Album Name>"
Exit 0 on PASS, 1 on FAIL.
"""
import sys, glob, os, re
import xml.etree.ElementTree as ET

CURLY = {'\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"'}

def normalize(text):
    for k, v in CURLY.items():
        text = text.replace(k, v)
    text = text.replace('\r\n', '\n').replace('\r', '\n').replace('\t', ' ')
    text = re.sub(r'^\[[^\]]+\]\s*$', '', text, flags=re.M)
    text = re.sub(r'\n{2,}', '\n', text)
    return '\n'.join(line.strip() for line in text.splitlines() if line.strip())

def archive_reworked(path):
    root = ET.parse(path).getroot()
    blocks = []
    for sec in root.findall('./lyrics/section'):
        rw = sec.find('reworked')
        if rw is not None and rw.get('not_applicable') != 'true' and (rw.text or '').strip():
            blocks.append(normalize(rw.text))
    return root, '\n'.join(blocks)

def master_lyrics(master_path, song_name):
    if not os.path.exists(master_path):
        return None
    root = ET.parse(master_path).getroot()
    for song in root.findall('.//Song'):
        if song.get('song') == song_name:
            lyr = song.findtext('Lyrics')
            return normalize(lyr or '')
    return None

def main():
    album = sys.argv[1]
    archive_dir = f'archives/processed_albums/{album}'
    master_path = f'data/lore/xmls/processed_albums/{album.replace(" - ", "_").replace(" ", "_")}.xml'
    errors = 0
    all_files = [master_path] + sorted(glob.glob(archive_dir + '/*.xml'))
    for path in all_files:
        if not os.path.exists(path):
            print(f'MISSING: {path}')
            errors += 1
            continue
        try:
            ET.parse(path)
        except ET.ParseError as e:
            print(f'PARSE ERROR: {path}: {e}')
            errors += 1
    for path in sorted(glob.glob(archive_dir + '/*.xml')):
        root, rw = archive_reworked(path)
        name = root.get('name') or os.path.basename(path)[:-4]
        lyr = master_lyrics(master_path, name)
        if lyr is None:
            print(f'WARN: "{name}" has no <Lyrics> in the master')
            errors += 1
        elif rw != lyr:
            print(f'DIFF: "{name}" archive <reworked> != master <Lyrics>')
            errors += 1
    print('PASS' if errors == 0 else f'{errors} error(s)')
    sys.exit(0 if errors == 0 else 1)

if __name__ == '__main__':
    main()