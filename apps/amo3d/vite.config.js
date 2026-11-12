import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rules = fileURLToPath(new URL('../../packages/rules/index.js', import.meta.url));
const castDir = fileURLToPath(new URL('./src/content/cast', import.meta.url));

// Dev-only API for the Forge page: list the cast, and save a character into src/content/cast/<id>.json.
function castApi() {
    return {
        name: 'forge-cast-api',
        configureServer(server) {
            server.middlewares.use('/api/cast', (req, res) => {
                const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
                if (req.method === 'GET') {
                    const list = readdirSync(castDir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(castDir, f), 'utf8')));
                    return send(200, list);
                }
                if (req.method === 'POST') {
                    let raw = '';
                    req.on('data', c => { raw += c; if (raw.length > 100_000) req.destroy(); });
                    req.on('end', () => {
                        try {
                            const def = JSON.parse(raw);
                            if (!/^[a-z0-9_]{1,40}$/.test(def.id ?? '')) return send(400, { error: 'id must be lowercase letters, digits or _' });
                            writeFileSync(join(castDir, `${def.id}.json`), `${JSON.stringify(def, null, 2)}\n`);
                            send(200, { saved: `src/content/cast/${def.id}.json` });
                        } catch (e) { send(400, { error: String(e.message) }); }
                    });
                    return;
                }
                send(405, { error: 'GET or POST' });
            });
        },
    };
}

export default defineConfig({
    base: './',   // relative paths, so the build also runs from a phone's file system (Capacitor)
    resolve: {
        // amo's engine-free rules, shared through packages/rules — no copies.
        alias: { '@rules': rules },
    },
    plugins: [castApi()],
    build: {
        rollupOptions: { input: { main: 'index.html', forge: 'forge.html' } },
    },
    server: {
        port: 5190,
        strictPort: true,
        fs: { allow: ['../..'] },
    },
});
