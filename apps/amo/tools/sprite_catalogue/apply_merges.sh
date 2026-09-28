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

python3 -c "
import json
merges = json.load(open('$MERGES_JSON'))
assert isinstance(merges, list), 'expected a bare JSON array of merge specs'
json.dump({'merges': merges}, open('/tmp/_apply_merges_wrapped.json', 'w'))
print(f'{len(merges)} merge specs loaded for $SHEET')
"

python3 tools/sprite_catalogue/apply_names.py \
  --catalogue "$CAT" --names /tmp/_apply_merges_wrapped.json

echo "--- running full test suite ---"
npm test
