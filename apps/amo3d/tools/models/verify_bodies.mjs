// node tools/models/verify_bodies.mjs — the male and female base bodies, point by point, against the baseline taken when
// the layers came in (baseline_bodies.json, 2026-11-26). Run after any change to skin.js / base.js / a layer: every point
// must stay put (0.000 mm) unless the change meant to move it. New points (e.g. the hair's cap) show as a count change.
import { readFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('../..', import.meta.url));
mkdirSync(`${app}/tools/.out/models`, { recursive: true });
const before = JSON.parse(readFileSync(new URL('./baseline_bodies.json', import.meta.url), 'utf8'));
const js = `(() => { const L = __lab_io, out = {}; for (let i = 0; i < 2; i++) { const sm = L.bodyMesh(i); if (!sm) continue; const T = L.pointTable(sm); out[sm.userData.editSex + i] = { n: sm.geometry.attributes.position.count, keys: T.keys, P: Array.from(T.P, v => +v.toFixed(6)) }; } return JSON.stringify(out); })()`;
const r = spawnSync('node', ['tools/headless.mjs', `${app}/tools/.out/models`, JSON.stringify([['nav', 'http://localhost:5190/sculptor.html?a=base_male:new&b=base_female:new'], ['wait', 4000], ['eval', js]])], { cwd: app, encoding: 'utf8', maxBuffer: 256 << 20 });
const errs = r.stdout.split('\n').filter(l => l.startsWith('[error]')); if (errs.length) console.log(errs.slice(0, 5).join('\n'));
const line = r.stdout.split('\n').find(l => l.startsWith('[eval]'));
if (!line) { console.log('no result — is the dev server up (npm run dev, :5190)?'); process.exit(1); }
const now = JSON.parse(JSON.parse(line.slice(7)));
for (const k of Object.keys(before)) {
    const A = before[k], B = now[k]; if (!B) { console.log(k, 'missing now'); continue; }
    const pb = new Map(B.keys.map((key, i) => [key, [B.P[i * 3], B.P[i * 3 + 1], B.P[i * 3 + 2]]]));
    let max = 0, worst = null, missing = 0;
    A.keys.forEach((key, i) => { const q = pb.get(key); if (!q) { missing++; return; } const d = Math.hypot(q[0] - A.P[i * 3], q[1] - A.P[i * 3 + 1], q[2] - A.P[i * 3 + 2]); if (d > max) { max = d; worst = key; } });
    console.log(`${k}: vertices ${A.n} → ${B.n}, points ${A.keys.length} → ${B.keys.length}, missing ${missing}, largest difference ${(max * 1000).toFixed(3)} mm${worst ? ` (at ${worst})` : ''}`);
}
