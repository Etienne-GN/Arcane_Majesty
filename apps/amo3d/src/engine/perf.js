// Performance overlay (F3 or ?perf=1): real frames per second from wall-clock time (not the
// clamped game dt), worst frame time, draw calls, triangles, and the quality preset.
export function createPerf(renderer, quality) {
    const el = document.createElement('div');
    // one slim bar, centred along the top between the health bars and the menu (it was a box over the menu, and a second bar)
    el.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:6px;z-index:6;pointer-events:none;font:calc(11px * var(--ui, 1))/1.4 monospace;'
        + 'color:#cfe;background:#0008;padding:3px 9px;border-radius:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:40vw;display:none';
    document.body.append(el);
    let on = new URLSearchParams(location.search).get('perf') === '1';
    let frames = 0, acc = 0, worst = 0, last = performance.now(), fps = 0;

    return {
        extra: null,   // () => more to show (the open world's streaming)
        toggle() { on = !on; },
        set(v) { on = !!v; },
        get fps() { return fps; },
        frame() {
            const now = performance.now(), ms = now - last;
            last = now;
            frames++; acc += ms; worst = Math.max(worst, ms);
            if (acc >= 1000) {
                fps = (frames * 1000) / acc;
                const info = renderer.info.render;
                const more = this.extra?.();
                el.textContent = `${fps.toFixed(0)} fps · worst ${worst.toFixed(0)} ms · ${info.calls} draws · ${(info.triangles / 1000).toFixed(0)}k tris · ${quality.name}${more ? ' · ' + more : ''}`;
                frames = 0; acc = 0; worst = 0;
            }
            el.style.display = on ? 'block' : 'none';
        },
    };
}
