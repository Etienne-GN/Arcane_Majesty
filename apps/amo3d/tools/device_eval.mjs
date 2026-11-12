// Evaluate JavaScript inside the game running on an Android device (debug build) and print
// the results — for measuring real performance on a phone.
//
//   adb -s <device> forward tcp:9444 localabstract:webview_devtools_remote_<pid>
//   node tools/device_eval.mjs 9444 "<expression>" ["<expression>" …]
//
// Each expression may return a promise (it is awaited). Built-in shortcut: "fps:<seconds>"
// measures the real frame rate over that many seconds and reports it with renderer stats.
const [port, ...exprs] = process.argv.slice(2);
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = targets.find(t => t.type === 'page');
if (!page) { console.error('no page found'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

const FPS = s => `(async () => {
    const times = []; let last = performance.now();
    await new Promise(done => { const f = now => { times.push(now - last); last = now;
        if (times.length < 2 || times.reduce((a, b) => a + b, 0) < ${s * 1000}) requestAnimationFrame(f); else done(); };
        requestAnimationFrame(f); });
    times.shift();
    const total = times.reduce((a, b) => a + b, 0), sorted = [...times].sort((a, b) => a - b);
    const r = document.querySelector('canvas');
    return { fps: +(times.length * 1000 / total).toFixed(1), p95ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
        worstMs: +sorted.at(-1).toFixed(1), frames: times.length, canvas: r ? r.width + 'x' + r.height : null,
        dpr: devicePixelRatio, quality: window.__poc?.quality?.name, map: window.__poc?.map?.name };
})()`;

for (const e of exprs) {
    const expression = e.startsWith('fps:') ? FPS(Number(e.slice(4)) || 5) : e;
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    console.log(JSON.stringify(r.result?.result?.value ?? r.result?.exceptionDetails?.text ?? r));
}
ws.close();
process.exit(0);
