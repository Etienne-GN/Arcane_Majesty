#!/usr/bin/env python3
"""
Crops a pixel region out of a spritesheet PNG and writes it to a separate
file, so an annotator (human or opencode) can visually confirm a guessed
region actually matches the intended sprite before committing it to a
*.catalogue.json entry.

Run: python3 crop_check.py --image <path> --x <n> --y <n> --w <n> --h <n> --out <path>
"""
import argparse
import sys

from PIL import Image


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--image', required=True, help='path to the source spritesheet PNG')
    parser.add_argument('--x', type=int, required=True)
    parser.add_argument('--y', type=int, required=True)
    parser.add_argument('--w', type=int, required=True)
    parser.add_argument('--h', type=int, required=True)
    parser.add_argument('--out', required=True, help='path to write the cropped preview PNG')
    args = parser.parse_args(argv)

    im = Image.open(args.image)
    iw, ih = im.size

    if args.w <= 0 or args.h <= 0:
        print(f"error: --w/--h must be > 0 (got {args.w}x{args.h})", file=sys.stderr)
        return 1
    if args.x < 0 or args.y < 0 or args.x + args.w > iw or args.y + args.h > ih:
        print(
            f"error: crop box ({args.x},{args.y},{args.w},{args.h}) is out of "
            f"bounds for {args.image} ({iw}x{ih})",
            file=sys.stderr,
        )
        return 1

    crop = im.crop((args.x, args.y, args.x + args.w, args.y + args.h))
    crop.save(args.out)
    print(f"wrote {args.out} ({args.w}x{args.h} crop of {args.image} @ ({args.x},{args.y}))")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
