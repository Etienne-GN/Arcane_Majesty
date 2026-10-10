#!/usr/bin/env node
/**
 * Open a page in headless Chrome and print its console messages, uncaught
 * exceptions and failed requests (via the DevTools protocol) — for debugging a
 * page that renders blank — and optionally drive it: run JS steps, then save a
 * screenshot.
 * Usage: node tools/console.mjs <url> [waitMs] [--eval "step;; step"] [--shot out.png]
 * (--eval steps are separated by ";;" and run 800 ms apart.)
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const opt = n => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; };
const evalSteps = opt('--eval'), shot = opt('--shot');
const [url, wait = '6000'] = args;
if (!url) { console.error('usage: console.mjs <url> [waitMs]'); process.exit(2); }
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`,
    '--window-size=1500,950', `--user-data-dir=${mkdtempSync(join(tmpdir(), 'forge-cdp-'))}`, 'about:blank'], { stdio: 'ignore' });

let target;
for (let i = 0; i < 50 && !target; i++) {
    await new Promise(r => setTimeout(r, 200));
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
}
if (!target) { console.error('chrome did not start'); chrome.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));
ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Runtime.consoleAPICalled') console.log(`[${m.params.type}]`, m.params.args.map(a => a.value ?? a.description ?? a.type).join(' '));
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; console.log('[exception]', d.exception?.description ?? d.text, d.url ?? '', d.lineNumber ?? ''); }
    if (m.method === 'Log.entryAdded') console.log(`[log:${m.params.entry.level}]`, m.params.entry.text, m.params.entry.url ?? '');
    if (m.method === 'Network.loadingFailed') console.log('[net-fail]', m.params.errorText, m.params.requestId);
    if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) console.log('[http]', m.params.response.status, m.params.response.url);
};
await new Promise(r => { ws.onopen = r; });
send('Runtime.enable'); send('Log.enable'); send('Network.enable');
send('Page.navigate', { url });
await new Promise(r => setTimeout(r, Number(wait)));
for (const step of (evalSteps ?? '').split(';;').filter(x => x.trim())) {
    send('Runtime.evaluate', { expression: step, awaitPromise: true });
    await new Promise(r => setTimeout(r, 800));
}
if (shot) {
    send('Page.captureScreenshot', { format: 'png' });
    await new Promise(r => {
        const prev = ws.onmessage;
        ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id === id && m.result?.data) { writeFileSync(shot, Buffer.from(m.result.data, 'base64')); console.log('[shot]', shot); ws.onmessage = prev; r(); } else prev(ev); };
    });
}
send('Runtime.evaluate', { expression: 'document.getElementById("app")?.innerHTML.length ?? -1', returnByValue: true });
await new Promise(r => {
    const prev = ws.onmessage;
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id === id) { console.log('[app innerHTML length]', m.result?.result?.value); r(); } else prev(ev); };
});
ws.close(); chrome.kill();
