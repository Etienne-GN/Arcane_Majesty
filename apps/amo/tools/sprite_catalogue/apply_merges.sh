#!/usr/bin/env bash
# Applies a <sheet>_merges.json (a bare JSON array in the apply_names.py
# "merges" format) to that LPC atlas's catalogue, then runs the full test
# suite. Run from apps/amo/.
#
# Usage: tools/sprite_catalogue/apply_merges.sh <sheet_name> <merges_json_path>
set -euo pipefail
SHEET="$1"
MERGES_JSON="$2"
CAT="public/assets/catalogued/tilesets/lpc/${SHEET}.catalogue.json"

WRAPPED="$(mktemp --suffix=.json)"
trap 'rm -f "$WRAPPED"' EXIT

# Arguments go through sys.argv, never pasted into the Python source, so a
# path or sheet name with quotes in it can't turn into code.
python3 - "$MERGES_JSON" "$WRAPPED" "$SHEET" <<'PY'
import json, sys
merges_path, out_path, sheet = sys.argv[1:4]
merges = json.load(open(merges_path))
assert isinstance(merges, list), 'expected a bare JSON array of merge specs'
json.dump({'merges': merges}, open(out_path, 'w'))
print(f'{len(merges)} merge specs loaded for {sheet}')
PY

python3 tools/sprite_catalogue/apply_names.py \
  --catalogue "$CAT" --names "$WRAPPED"

echo "--- running full test suite ---"
npm test
