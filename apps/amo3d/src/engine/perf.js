// Performance overlay (F3 or ?perf=1): real frames per second from wall-clock time (not the
// clamped game dt), worst frame time, draw calls, triangles, and the quality preset.
export function createPerf(renderer, quality) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;right:18px;top:34px;z-index:6;pointer-events:none;font:12px/1.5 monospace;'
        + 'color:#cfe;background:#0009;padding:6px 9px;border-radius:6px;white-space:pre;display:none';
    document.body.append(el);
    let on = new URLSearchParams(location.search).get('perf') === '1';
    let frames = 0, acc = 0, worst = 0, last = performance.now(), fps = 0;

    return {
        toggle() { on = !on; },
        get fps() { return fps; },
        frame() {
            const now = performance.now(), ms = now - last;
            last = now;
            frames++; acc += ms; worst = Math.max(worst, ms);
            if (acc >= 1000) {
                fps = (frames * 1000) / acc;
                const info = renderer.info.render;
                el.textContent = `${fps.toFixed(1)} fps  (worst ${worst.toFixed(0)} ms)\n`
                    + `${info.calls} draws  ${(info.triangles / 1000).toFixed(0)}k tris\n`
                    + `quality ${quality.name}  ·  F2 to change`;
                frames = 0; acc = 0; worst = 0;
            }
            el.style.display = on ? 'block' : 'none';
        },
    };
}
