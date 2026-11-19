# 1/3 — Read every node of the lore DB (read only) into /tmp/lore_review/db.json. Credentials are read from
# data/scripts/run_mcp_server.sh inside the script and never printed.
import os; os.makedirs('/tmp/lore_review', exist_ok=True)
import json, re, base64, urllib.request, sys, os
src = open(os.path.join(os.path.dirname(__file__), '..', 'run_mcp_server.sh')).read()
def var(n):
    m = re.search(n + r'=["\']?([^"\'\n]+)', src); return m.group(1)
auth = base64.b64encode(f"{var('NEO4J_USERNAME')}:{var('NEO4J_PASSWORD')}".encode()).decode()
def q(stmt):
    req = urllib.request.Request('http://192.168.0.159:7474/db/neo4j/tx/commit', data=json.dumps({'statements': [{'statement': stmt}]}).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth})
    r = json.load(urllib.request.urlopen(req, timeout=20))
    if r['errors']: raise SystemExit(r['errors'])
    return [row['row'] for row in r['results'][0]['data']]
rows = q("MATCH (n) RETURN labels(n), n.name, n.title, n.origin, coalesce(n.description, n.role, n.nature, '')")
out = [{'labels': r[0], 'name': r[1] or r[2], 'origin': r[3], 'desc': (r[4] or '')[:300]} for r in rows]
json.dump(out, open('/tmp/lore_review/db.json', 'w'), indent=1)
from collections import Counter
print(Counter(l for o in out for l in o['labels']))
print(Counter(o['origin'] for o in out))
