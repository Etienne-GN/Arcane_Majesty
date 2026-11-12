// Headless Chrome driver for checks: node tools/headless.mjs <outdir> <script-json>
// Drive headless Chrome over CDP: load the POC, hold keys, take screenshots.
// usage: node shoot.mjs <outdir> <script-json>
// script: [["wait",ms],["down","KeyW"],["up","KeyW"],["shot","name"],["eval","js"]]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, scriptJson] = process.argv.slice(2);
const script = JSON.parse(scriptJson);
const port = 9333;
const profile = mkdtempSync(join(outDir, 'prof-'));
const chrome = spawn('google-chrome', [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--window-size=1280,720', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.consoleAPICalled') console.log('[console]', m.params.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Runtime.exceptionThrown') console.log('[error]', m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://localhost:5190/' });
await sleep(4000);

const keyInfo = code => ({ code, key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code === 'Space' ? ' ' : code, windowsVirtualKeyCode: code.startsWith('Key') ? code.charCodeAt(3) : code === 'Space' ? 32 : code.startsWith('Shift') ? 16 : 0 });
for (const [op, arg] of script) {
    if (op === 'wait') await sleep(arg);
    else if (op === 'nav') { await send('Page.navigate', { url: arg }); await sleep(4000); }
    else if (op === 'down') await send('Input.dispatchKeyEvent', { type: 'keyDown', ...keyInfo(arg) });
    else if (op === 'up') await send('Input.dispatchKeyEvent', { type: 'keyUp', ...keyInfo(arg) });
    else if (op === 'eval') console.log('[eval]', JSON.stringify((await send('Runtime.evaluate', { expression: arg, returnByValue: true, awaitPromise: true })).result?.result?.value));
    else if (op === 'shot') {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(outDir, `${arg}.png`), Buffer.from(r.result.data, 'base64'));
        console.log('[shot]', join(outDir, `${arg}.png`));
    }
}
ws.close();
chrome.kill();
process.exit(0);
