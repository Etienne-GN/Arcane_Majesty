// node tools/models/shots.mjs <subject> [pose] — a Sculptor subject (base_male, base_female, base_boy…, eldrin, seraphina_rebel,
// wolf, horse, cow, any animal kind…) alone on the stage, shot from five sides — front, three-quarter, side, back, below —
// and its head close, framed to its own size: tools/.out/models/<subject>_<view>.png. pose: apose (default) | idle | walk.
// Look at EVERY shot before showing a model to the user (the checklist in .claude/skills/character-models/SKILL.md).
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const app = fileURLToPath(new URL('../..', import.meta.url));
mkdirSync(`${app}/tools/.out/models`, { recursive: true });
const [subject, pose = 'apose'] = process.argv.slice(2);
if (!subject) { console.log('usage: node tools/models/shots.mjs <subject> [apose|idle|walk]'); process.exit(1); }
const frame = (yaw, pitch, k, head = false) => `(() => { const m = __lab_models[0]; m.root.position.set(0, 0, 0); __lab.setYaw(${yaw});
  const b = new __THREE.Box3().setFromObject(m.root), c = b.getCenter(new __THREE.Vector3()), s = b.getSize(new __THREE.Vector3()), big = Math.max(s.x, s.y, s.z);
  // (the head: round the highest point of the body — a horse's head is out in front, not over the middle)
  let top = null; if (${head}) { m.root.updateMatrixWorld(true); const v = new __THREE.Vector3(); m.root.traverse(o => { if (!o.isSkinnedMesh || !o.visible) return; const p2 = o.geometry.attributes.position; for (let i = 0; i < p2.count; i += 3) { o.getVertexPosition(i, v); v.applyMatrix4(o.matrixWorld); if (!top || v.y > top.y) top = v.clone(); } }); }
  const t = top ? top.clone().setY(top.y - big * 0.1) : c, d = big * ${k}, p = ${pitch};
  __lab.cam([t.x + Math.sin(0) * d, t.y + Math.sin(p) * d, t.z + Math.cos(p) * d], [t.x, t.y, t.z]); return 1; })()`;
const views = [['front', 0, 0.12, 2.3], ['quarter', 0.7, 0.18, 2.3], ['side', Math.PI / 2, 0.08, 2.3], ['back', Math.PI, 0.12, 2.3], ['below', 0.5, -0.45, 2.1]];
const steps = [['nav', `http://localhost:5190/sculptor.html?a=${subject}:new&b=base_male:new`], ['wait', 5000],
    ['eval', `(() => { __lab.solo(0); __lab.setMode('${pose}'); for (const id of ['top', 'bar', 'labels', 'lnkGame', 'lnkForge']) { const e = document.getElementById(id); if (e) e.style.display = 'none'; } return 1; })()`]];
for (const [name, yaw, pitch, k] of views) steps.push(['eval', frame(yaw, pitch, k)], ['wait', 500], ['shot', `${subject}_${name}`]);
steps.push(['eval', frame(0.6, 0.1, 0.7, true)], ['wait', 500], ['shot', `${subject}_head`]);
const r = spawnSync('node', ['tools/headless.mjs', `${app}/tools/.out/models`, JSON.stringify(steps)], { cwd: app, encoding: 'utf8', maxBuffer: 64 << 20 });
process.stdout.write((r.stdout ?? '').split('\n').filter(l => /^\[(shot|error)\]/.test(l) || /ERR/.test(l)).join('\n') + '\n');
