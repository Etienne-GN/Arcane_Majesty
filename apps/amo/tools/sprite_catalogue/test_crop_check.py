#!/usr/bin/env python3
"""
Smoke test for crop_check.py: builds a small four-quadrant test image at
runtime, crops each quadrant via the CLI, and confirms both the output
dimensions and a sampled pixel color match the expected quadrant. Also
confirms an out-of-bounds crop request fails loudly instead of silently
padding.
Run: python3 tools/sprite_catalogue/test_crop_check.py
  (or: npm run test:crop-check)
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
CROP_CHECK = HERE / 'crop_check.py'

QUADRANTS = {
    'top_left':     ((0,  0,  32, 32), (255, 0,   0,   255)),
    'top_right':    ((32, 0,  32, 32), (0,   255, 0,   255)),
    'bottom_left':  ((0,  32, 32, 32), (0,   0,   255, 255)),
    'bottom_right': ((32, 32, 32, 32), (255, 255, 0,   255)),
}


def build_test_image(path):
    im = Image.new('RGBA', (64, 64))
    for _, ((x, y, w, h), color) in QUADRANTS.items():
        for px in range(x, x + w):
            for py in range(y, y + h):
                im.putpixel((px, py), color)
    im.save(path)


def run_crop_check(image, x, y, w, h, out):
    return subprocess.run(
        [sys.executable, str(CROP_CHECK),
         '--image', str(image), '--x', str(x), '--y', str(y),
         '--w', str(w), '--h', str(h), '--out', str(out)],
        capture_output=True, text=True,
    )


def main():
    passed = 0
    fails = []

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        image_path = tmp / 'quadrants.png'
        build_test_image(image_path)

        for name, ((x, y, w, h), expected_color) in QUADRANTS.items():
            out_path = tmp / f'{name}_crop.png'
            result = run_crop_check(image_path, x, y, w, h, out_path)
            if result.returncode != 0:
                fails.append(f'{name}: crop_check exited {result.returncode}: {result.stderr}')
                continue
            crop = Image.open(out_path).convert('RGBA')
            if crop.size != (w, h):
                fails.append(f'{name}: expected size {(w, h)}, got {crop.size}')
            elif crop.getpixel((w // 2, h // 2)) != expected_color:
                fails.append(
                    f'{name}: expected color {expected_color}, '
                    f'got {crop.getpixel((w // 2, h // 2))}'
                )
            else:
                passed += 1

        # Out-of-bounds crop must fail loudly, not silently pad.
        oob_out = tmp / 'oob_crop.png'
        result = run_crop_check(image_path, 40, 40, 32, 32, oob_out)
        if result.returncode == 0:
            fails.append('out-of-bounds crop: expected nonzero exit, got 0')
        else:
            passed += 1

    if fails:
        print(f"✗ crop_check tests FAILED — {len(fails)}/{passed + len(fails)}:", file=sys.stderr)
        for f in fails:
            print('  ' + f, file=sys.stderr)
        sys.exit(1)
    print(f"✓ crop_check tests passed ({passed} assertions).")


if __name__ == '__main__':
    main()
