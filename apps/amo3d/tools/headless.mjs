// Headless Chrome driver for checks: node tools/headless.mjs <outdir> <script-json>
// Drive headless Chrome over CDP: load the POC, hold keys, take screenshots.
// usage: node shoot.mjs <outdir> <script-json>
// script: [["wait",ms],["down","KeyW"],["up","KeyW"],["shot","name"],["eval","js"]]
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [outDir, scriptJson] = process.argv.slice(2);
const script = JSON.parse(scriptJson);
const port = 9333;
// HL_W / HL_H / HL_DPR / HL_TOUCH=1: emulate a phone (the S25 Ultra in landscape is ~915×412 at DPR 3.5).
const W = +(process.env.HL_W ?? 1280), H = +(process.env.HL_H ?? 720), DPR = +(process.env.HL_DPR ?? 1), TOUCH = process.env.HL_TOUCH === '1';
const profile = mkdtempSync(join(tmpdir(), 'amo3d-prof-'));   // outside the watched tree; removed at the end
// The browser: HL_BROWSER, else the first of google-chrome / chromium found on the PATH (exegol has Chromium, Naboo had Chrome).
const browser = process.env.HL_BROWSER ?? ['google-chrome', 'chromium', 'chromium-browser'].find(b => spawnSync('which', [b]).status === 0);
if (!browser) { console.error('No Chrome or Chromium found (set HL_BROWSER)'); process.exit(1); }
const chrome = spawn(browser, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--window-size=${W},${H}`, '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
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
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails, st = d.stackTrace?.callFrames?.slice(0, 4).map(f => `${f.functionName || '?'} ${f.url.replace(/^.*\/src\//, '')}:${f.lineNumber + 1}`).join(' <- '); console.log('[error]', (d.exception?.description ?? d.text).split('\n')[0], st ? `@ ${st}` : (d.url ? `@ ${d.url.replace(/^.*\/src\//, '')}:${d.lineNumber + 1}` : '')); }
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: TOUCH });
if (TOUCH) await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
if (TOUCH) await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
await send('Page.navigate', { url: `http://localhost:5190/${TOUCH ? '?touch=1' : ''}` });
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
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(0);
