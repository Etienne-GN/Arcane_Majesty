// The game manual (docs/manual/index.html), served next to the game.
//
//   node tools/serve_manual.mjs          → http://localhost:5175
//
// The page is generated from the game data by gen_game_inventory.mjs (which
// also writes docs/game_inventory.md). This server regenerates it whenever a
// file under src/data or src/systems changes, and an open page reloads itself
// (keeping its scroll position) when a new version is ready.
// `npm run dev` starts it together with the game (5174).
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { watch, readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.MANUAL_PORT ?? 5175);
const here = dirname(fileURLToPath(import.meta.url));
const AMO = join(here, '..');
const PAGE = join(AMO, '../../docs/manual/index.html');
const WATCHED = ['src/data', 'src/systems'].map(d => join(AMO, d));

let version = 0;
let building = null;
let pending = false;

function build() {
    if (building) { pending = true; return building; }
    mkdirSync(dirname(PAGE), { recursive: true });
    building = new Promise(resolve => {
        const t0 = Date.now();
        const child = spawn(process.execPath, [join(here, 'gen_game_inventory.mjs'), '--html', PAGE], { cwd: AMO });
        let err = '';
        child.stderr.on('data', d => { err += d; });
        child.on('close', code => {
            if (code === 0) {
                version++;
                console.log(`[manual] regenerated in ${Date.now() - t0}ms (v${version})`);
            } else {
                console.error(`[manual] generation failed — keeping the previous page\n${err.trim().split('\n').slice(0, 6).join('\n')}`);
            }
            building = null;
            resolve();
            if (pending) { pending = false; build(); }
        });
    });
    return building;
}

// Reload an open page when a new version exists, restoring the scroll position.
const LIVE = `<script>
(() => {
  const k = 'manual-scroll';
  try { const y = sessionStorage.getItem(k); if (y) { sessionStorage.removeItem(k); addEventListener('load', () => scrollTo(0, +y)); } } catch {}
  let v = null;
  setInterval(async () => {
    try {
      const now = await (await fetch('/__version', { cache: 'no-store' })).text();
      if (v !== null && now !== v) { try { sessionStorage.setItem(k, String(scrollY)); } catch {} location.reload(); }
      v = now;
    } catch {}
  }, 2000);
})();
</script>`;

let debounce = null;
for (const dir of WATCHED) {
    watch(dir, { recursive: true }, (_ev, file) => {
        if (!file || !/\.(m?js|json)$/.test(file)) return;
        clearTimeout(debounce);
        debounce = setTimeout(build, 300);
    });
}

const server = createServer((req, res) => {
    if (req.url === '/__version') {
        res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
        return res.end(String(version));
    }
    if (req.url !== '/' && !req.url.startsWith('/?') && req.url !== '/index.html') {
        res.writeHead(404, { 'content-type': 'text/plain' });
        return res.end('Not found');
    }
    try {
        const html = readFileSync(PAGE, 'utf8') + LIVE;
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
    } catch {
        res.writeHead(503, { 'content-type': 'text/plain' });
        res.end('The manual is being generated — refresh in a moment.');
    }
});

server.on('error', e => {
    if (e.code === 'EADDRINUSE') console.error(`[manual] port ${PORT} is already in use — is the manual already running?`);
    else console.error('[manual]', e.message);
    process.exit(1);
});

await build();
server.listen(PORT, '0.0.0.0', () => console.log(`[manual] http://localhost:${PORT}  (watching src/data, src/systems)`));
