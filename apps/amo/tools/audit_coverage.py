#!/usr/bin/env python3
"""
Per-direction coverage audit for weapons (and any layered type). For each entry
it resolves the concrete file the runtime requests (mirrors CharacterRenderer
animUrl + resolveAnim + ensureCorrectFrameSize), then checks, per logical anim,
whether at least ONE layer (main or companion) has opaque pixels in each of the 4
direction rows. Directions covered by no layer are real gaps (the renderer hides
the weapon there). Distinguishes that from a layer simply not shipping the anim.

Run from apps/amo/:  python3 tools/audit_coverage.py
"""
import json, os
from PIL import Image

BASE = "ressources/lpc_merged/spritesheets"
DIRS = ["up", "left", "down", "right"]
LOGICAL = ["walk", "hurt", "slash", "backslash", "halfslash", "thrust"]
ALIAS = {
    "slash": ["slash", "attack_slash"],
    "backslash": ["backslash", "attack_backslash", "attack_slash_reverse"],
    "halfslash": ["halfslash", "attack_halfslash"],
    "thrust": ["thrust", "attack_thrust"],
}
FOLDER = {  # catalogue key -> disk folder (entry.renderType overrides)
    **{k: "torso" for k in ("torso_clothes", "torso_jacket", "torso_mail", "torso_armour", "torso_waist")},
    **{k: "head" for k in ("ears", "horns", "fins", "nose")},
    "tail": "body", "wings": "body",
}


def resolve(anims, logical):
    for c in ALIAS.get(logical, [logical]):
        if c in (anims or []):
            return c
    return None


def anim_url(folder, id, item, color, anim):
    if item:
        return f"{BASE}/{folder}/{id}/{anim}/{item}.png"
    if color is not None:
        return f"{BASE}/{folder}/{id}/{anim}/{color}.png"
    if folder == "weapon":
        return f"{BASE}/{folder}/{id}/{anim}/{id.split('/')[-1]}.png"
    if folder in ("cape", "backpack"):
        return f"{BASE}/{folder}/{id}/{anim}/red.png"
    return f"{BASE}/{folder}/{id}/{anim}.png"


def frame_size(w, h):
    if h % 64 == 0 and h // 64 == 4:
        return 64
    for fh in (128, 192, 256):
        if h % fh == 0 and h // fh == 4 and w % fh == 0:
            return fh
    return 64 if h == 64 else None


def dirs_with_content(path):
    try:
        im = Image.open(path).convert("RGBA")
    except FileNotFoundError:
        return None
    w, h = im.size
    fs = frame_size(w, h)
    if fs is None:
        return None
    px = im.load()
    rows = h // fs
    if rows != 4:  # single-row (hurt) → faces down only, but content shows for all
        any0 = any(px[x, y][3] > 8 for x in range(0, w, 3) for y in range(0, fs, 3))
        return {d: any0 for d in DIRS}
    out = {}
    for r in range(4):
        out[DIRS[r]] = any(
            px[c * fs + x, r * fs + y][3] > 8
            for c in range(w // fs)
            for y in range(0, fs, 4)
            for x in range(0, fs, 4)
        )
    return out


def layers_of(key, e):
    folder = e.get("renderType") or FOLDER.get(key, "body" if key.startswith("wound_") else key)
    base = (e.get("colors") or [None])[0]
    out = [(folder, e["id"], e.get("itemName"), base, e.get("anims"))]
    for c in e.get("companions", []):
        col = c.get("color") if "color" in c else (base if e.get("colors") else None)
        out.append((folder, c["id"], c.get("itemName"), col, c.get("anims")))
    return out


def main():
    cat = json.load(open("src/data/character_catalogue.json"))
    gaps = []
    for key in ("weapon",):
        for e in cat[key]:
            if not e.get("id"):
                continue
            layers = layers_of(key, e)
            for logical in LOGICAL:
                supported = [L for L in layers if resolve(L[4], logical)]
                if not supported:
                    continue  # weapon has no such motion at all — fine
                cover = {d: False for d in DIRS}
                for (folder, lid, item, col, anims) in supported:
                    con = resolve(anims, logical)
                    dh = dirs_with_content(anim_url(folder, lid, item, col, con))
                    if not dh:
                        continue
                    for d in DIRS:
                        cover[d] = cover[d] or dh[d]
                missing = [d for d in DIRS if not cover[d]]
                if missing:
                    gaps.append((e["id"], logical, missing))
    if not gaps:
        print("All weapons: every supported anim is covered in all 4 directions.")
        return
    print(f"{len(gaps)} weapon/anim/direction coverage gaps (renderer hides the weapon there):\n")
    for wid, logical, missing in gaps:
        print(f"  {wid:34s} {logical:10s} missing: {', '.join(missing)}")


if __name__ == "__main__":
    main()
