#!/usr/bin/env python3
"""
Audits oversize LPC weapon sheets against the frame-size heuristic the runtime
uses (CharacterRenderer.ensureCorrectFrameSize): pick the largest of {128,192,256}
that divides height into exactly 4 rows. Flags any sheet whose resulting 4-row
interpretation has an EMPTY direction row (a real asset gap — the renderer now
hides the layer for that direction) or a frame size the heuristic can't resolve.

Run from apps/amo/:  python3 tools/audit_oversize.py
"""
import os
from PIL import Image

BASE = "./ressources/lpc_merged/spritesheets"
DIRS = ["up", "left", "down", "right"]


def frame_size(w, h):
    if h % 64 == 0 and h // 64 == 4:
        return 64
    for fh in (128, 192, 256):
        if h % fh == 0 and h // fh == 4 and w % fh == 0:
            return fh
    return None


def row_frame_counts(px, w, fs):
    counts = []
    for r in range(4):
        frames = 0
        for c in range(w // fs):
            opaque = any(
                px[c * fs + x, r * fs + y][3] > 8
                for y in range(0, fs, 2)
                for x in range(0, fs, 2)
            )
            if opaque:
                frames += 1
        counts.append(frames)
    return counts


flagged = scanned = 0
for dp, _, fns in os.walk(os.path.join(BASE, "weapon")):
    for fn in fns:
        if not fn.endswith(".png"):
            continue
        scanned += 1
        path = os.path.join(dp, fn)
        im = Image.open(path).convert("RGBA")
        w, h = im.size
        if h == 256 and w <= 13 * 64:
            continue  # standard 64px sheet
        fs = frame_size(w, h)
        rel = path.replace(BASE + "/", "")
        if fs is None:
            if h == 64:
                continue  # legitimate single-row sheet (hurt)
            print(f"UNRESOLVED  {rel}  {w}x{h}  (no 4-row frame size found)")
            flagged += 1
            continue
        if fs == 64:
            continue
        counts = row_frame_counts(im.load(), w, fs)
        empties = [DIRS[i] for i, n in enumerate(counts) if n == 0]
        if empties:
            print(f"EMPTY ROWS  {rel}  {w}x{h}  fs={fs}  perRow={counts}  missing: {','.join(empties)}")
            flagged += 1

print(f"\n{flagged} sheet(s) flagged of {scanned} scanned.")
