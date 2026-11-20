import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rules = fileURLToPath(new URL('../../packages/rules/index.js', import.meta.url));
const castDir = fileURLToPath(new URL('./src/content/cast', import.meta.url));
const regionDir = fileURLToPath(new URL('./src/content/regions', import.meta.url));
const mobNotesDir = fileURLToPath(new URL('./src/content/mob_notes', import.meta.url));   // the Bestiary page's notes
const npcNotesDir = fileURLToPath(new URL('./src/content/npc_notes', import.meta.url));   // the Forge's notes on each NPC

// Dev-only APIs: the Forge's cast (src/content/cast) and the editor's regions (src/content/regions).
// GET lists the JSON files, POST saves one as <id>.json.
function jsonDirApi(route, dir, label) {
    return {
        name: `json-api-${label}`,
        configureServer(server) {
            server.middlewares.use(route, (req, res) => {
                const send = (code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
                if (req.method === 'GET') {
                    const list = readdirSync(dir).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
                    return send(200, list);
                }
                if (req.method === 'POST') {
                    // Only our own pages may write: a JSON body (cross-site forms can't send that without a
                    // CORS preflight, which this server doesn't answer) from this server's own origin.
                    const origin = req.headers.origin;
                    // Only when reached as this machine (blocks DNS-rebinding pages, whose Host is their own name).
                    const local = h => /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(h ?? '');
                    if (!local(req.headers.host)) return send(403, { error: 'writes only from localhost' });
                    if (origin && !local(new URL(origin).host)) return send(403, { error: 'cross-origin write refused' });
                    if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) return send(415, { error: 'JSON only' });
                    if (origin && new URL(origin).host !== req.headers.host) return send(403, { error: 'cross-origin write refused' });
                    let raw = '';
                    req.on('data', c => { raw += c; if (raw.length > 100_000) req.destroy(); });
                    req.on('end', () => {
                        try {
                            const def = JSON.parse(raw);
                            if (!/^[a-z0-9_]{1,40}$/.test(def.id ?? '')) return send(400, { error: 'id must be lowercase letters, digits or _' });
                            writeFileSync(join(dir, `${def.id}.json`), `${JSON.stringify(def, null, 2)}\n`);
                            send(200, { saved: `src/content/${label}/${def.id}.json` });
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
    plugins: [jsonDirApi('/api/cast', castDir, 'cast'), jsonDirApi('/api/region', regionDir, 'regions'), jsonDirApi('/api/mobnotes', mobNotesDir, 'mob_notes'), jsonDirApi('/api/npcnotes', npcNotesDir, 'npc_notes')],
    build: {
        rollupOptions: { input: { main: 'index.html', forge: 'forge.html', editor: 'editor.html', bestiary: 'bestiary.html', manual: 'manual.html' } },
    },
    server: {
        port: 5190,
        strictPort: true,
        fs: { allow: ['../..'] },
        watch: { ignored: ['**/tools/.out/**', '**/android/**'] },   // screenshots and test browser profiles
    },
});
