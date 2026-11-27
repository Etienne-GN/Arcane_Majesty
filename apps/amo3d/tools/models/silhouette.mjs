// node tools/models/silhouette.mjs <subject> — the subject's A-pose silhouettes (front: x-y, side: z-y; 4 mm cells),
// rasterised from its skinned meshes, written to tools/.out/models/<subject>_sil.json for overlay.py (the dev server on :5190).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('../..', import.meta.url)), out = `${app}/tools/.out/models`;
mkdirSync(out, { recursive: true });
const subject = process.argv[2] ?? 'base_male';
const js = `(() => { __lab.solo(0); __lab.setMode('apose'); const m = __lab_models[0]; m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0); m.root.updateMatrixWorld(true);
  const R = 0.004, W = 300, H = 500, v = new __THREE.Vector3(), grids = { front: new Uint8Array(W * H), side: new Uint8Array(W * H) };
  m.root.traverse(o => { if (!o.isSkinnedMesh || !o.visible) return; const p = o.geometry.attributes.position, ix = o.geometry.index, n = ix ? ix.count : p.count, P = [];
    for (let i = 0; i < p.count; i++) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); P.push([v.x, v.y, v.z]); }
    for (const [name, ax] of [['front', 0], ['side', 2]]) { const g = grids[name];
      for (let t = 0; t < n; t += 3) { const A = P[ix ? ix.getX(t) : t], B = P[ix ? ix.getX(t + 1) : t + 1], C = P[ix ? ix.getX(t + 2) : t + 2];
        const a = [A[ax], A[1]], b = [B[ax], B[1]], c = [C[ax], C[1]], d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-12) continue;
        const x0 = Math.floor(Math.min(a[0], b[0], c[0]) / R), x1 = Math.ceil(Math.max(a[0], b[0], c[0]) / R), y0 = Math.floor(Math.min(a[1], b[1], c[1]) / R), y1 = Math.ceil(Math.max(a[1], b[1], c[1]) / R);
        for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const X = xx * R, Y = yy * R, l1 = ((b[1] - c[1]) * (X - c[0]) + (c[0] - b[0]) * (Y - c[1])) / d, l2 = ((c[1] - a[1]) * (X - c[0]) + (a[0] - c[0]) * (Y - c[1])) / d;
          if (l1 >= -0.02 && l2 >= -0.02 && l1 + l2 <= 1.02) { const gx = xx + W / 2; if (gx >= 0 && gx < W && yy >= 0 && yy < H) g[yy * W + gx] = 1; } } } } });
  const enc = g => { let s = ''; for (let y = 0; y < H; y++) { let row = ''; for (let x = 0; x < W; x++) row += g[y * W + x]; s += row + '\\n'; } return s; };
  return JSON.stringify({ R, W, H, front: enc(grids.front), side: enc(grids.side) }); })()`;
const steps = [['nav', `http://localhost:5190/sculptor.html?a=${subject}:new&b=base_female:new`], ['wait', 5000], ['eval', js]];
const r = spawnSync('node', ['tools/headless.mjs', out, JSON.stringify(steps)], { cwd: app, encoding: 'utf8', maxBuffer: 256 << 20 });
const line = (r.stdout ?? '').split('\n').find(l => l.startsWith('[eval] "{'));
if (!line) { console.log(r.stdout?.slice(-2000), r.stderr?.slice(-2000)); process.exit(1); }
writeFileSync(`${out}/${subject}_sil.json`, JSON.parse(line.slice(7)));
console.log(`${out}/${subject}_sil.json`);
