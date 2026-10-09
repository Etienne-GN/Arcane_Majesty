#!/usr/bin/env node
/**
 * Headless Chrome screenshot of a Forge page, for visual checks.
 * Usage: node tools/screenshot.mjs <url> <out.png> [width] [height] [waitMs]
 * To shoot a given character, open it by link: <url>#comp=<encodeURIComponent(json)>.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const [url, out, w = '1500', h = '950', wait = '4000'] = process.argv.slice(2);
if (!url || !out) { console.error('usage: screenshot.mjs <url> <out.png> [w] [h] [waitMs]'); process.exit(2); }
const profile = mkdtempSync(join(tmpdir(), 'forge-shot-'));
const r = spawnSync('google-chrome', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${profile}`,
    `--window-size=${w},${h}`, `--virtual-time-budget=${wait}`, `--screenshot=${resolve(out)}`, url,
], { encoding: 'utf8', timeout: 60000 });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(`saved ${resolve(out)}`);
