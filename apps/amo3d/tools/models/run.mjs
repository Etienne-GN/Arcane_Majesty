// node tools/models/run.mjs <steps.mjs> [outDir] — runs tools/headless.mjs with the steps a module exports (an array of
// [op, arg]: nav, wait, eval, shot, down, up); prints the [eval]/[shot]/[error] lines. Env HL_W, HL_H, HL_TOUCH, HL_DPR as headless.mjs.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const app = fileURLToPath(new URL('../..', import.meta.url));
mkdirSync(`${app}/tools/.out/models`, { recursive: true });
const steps = (await import(pathToFileURL(resolve(process.argv[2])).href)).default;
const out = resolve(process.argv[3] ?? `${app}/tools/.out/models`);
const r = spawnSync('node', ['tools/headless.mjs', out, JSON.stringify(steps)], { cwd: app, encoding: 'utf8', maxBuffer: 64 << 20 });
process.stdout.write((r.stdout ?? '').split('\n').filter(l => /^\[(eval|shot|error)\]/.test(l)).join('\n') + '\n');
process.stderr.write(r.stderr ?? '');
