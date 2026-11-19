// Sound effects, synthesised with Web Audio — no recorded files (the game owns every asset). Each effect is a
// few oscillators and filtered noise with an envelope. Volume: Options → Sound → Effects (settings.sfx).
import { settings } from './settings.js';

let ctx = null, master = null, noiseBuf = null;
function ac() {
    if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    master.gain.value = 0.5 * (settings.sfx ?? 1);
    return ctx;
}
// Browsers only allow sound after a gesture: wake the context on the first one.
for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, () => ac(), { once: true, capture: true });

function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
function tone({ type = 'sine', f0, f1 = f0, a = 0.005, d = 0.2, peak = 0.3, delay = 0 }) {
    const c = ac(); if (!c || (settings.sfx ?? 1) <= 0) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + a + d);
    env(g, t, a, peak, d); o.connect(g).connect(master); o.start(t); o.stop(t + a + d + 0.05);
}
function noise({ f = 1200, q = 1, type = 'bandpass', a = 0.005, d = 0.2, peak = 0.3, f1 = f, delay = 0 }) {
    const c = ac(); if (!c || (settings.sfx ?? 1) <= 0) return;
    const t = c.currentTime + delay, s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + a + d);
    env(g, t, a, peak, d); s.connect(fl).connect(g).connect(master); s.start(t, Math.random() * 0.5); s.stop(t + a + d + 0.05);
}
const jitter = (v, k = 0.08) => v * (1 + (Math.random() - 0.5) * k * 2);
let lastStep = 0;

export const sfx = {
    click: () => tone({ type: 'triangle', f0: 880, f1: 660, d: 0.05, peak: 0.12 }),
    open: () => { tone({ type: 'sine', f0: 420, f1: 640, d: 0.12, peak: 0.12 }); noise({ f: 3000, d: 0.08, peak: 0.04 }); },
    cast: () => { noise({ f: 400, f1: 2400, q: 2, a: 0.05, d: 0.35, peak: 0.25 }); tone({ type: 'sawtooth', f0: 110, f1: 220, a: 0.03, d: 0.3, peak: 0.06 }); },
    boom: () => { noise({ f: 900, f1: 120, type: 'lowpass', d: 0.6, peak: 0.5 }); tone({ type: 'sine', f0: jitter(90), f1: 40, d: 0.5, peak: 0.4 }); },
    swing: () => noise({ f: jitter(1800), f1: 600, q: 1.5, a: 0.02, d: 0.14, peak: 0.12 }),
    hit: () => { noise({ f: jitter(700), f1: 300, q: 1.2, d: 0.09, peak: 0.35 }); tone({ type: 'square', f0: jitter(160), f1: 80, d: 0.08, peak: 0.08 }); },
    hurt: () => { noise({ f: 500, f1: 200, d: 0.12, peak: 0.35 }); tone({ type: 'sawtooth', f0: 220, f1: 110, d: 0.18, peak: 0.1 }); },
    kill: () => { tone({ type: 'triangle', f0: 330, f1: 165, d: 0.3, peak: 0.12 }); noise({ f: 1200, f1: 300, d: 0.3, peak: 0.12 }); },
    growl: () => { tone({ type: 'sawtooth', f0: jitter(80), f1: jitter(60), a: 0.06, d: 0.45, peak: 0.08 }); noise({ f: 300, q: 4, a: 0.06, d: 0.4, peak: 0.1 }); },
    pickup: () => { tone({ type: 'sine', f0: 990, d: 0.08, peak: 0.12 }); tone({ type: 'sine', f0: 1320, d: 0.12, peak: 0.1, delay: 0.07 }); },
    coin: () => { tone({ type: 'square', f0: 1568, d: 0.06, peak: 0.06 }); tone({ type: 'square', f0: 2093, d: 0.14, peak: 0.05, delay: 0.06 }); },
    levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, d: 0.35, peak: 0.12, delay: i * 0.09 })),
    quest: () => [392, 523, 659].forEach((f, i) => tone({ type: 'sine', f0: f, d: 0.4, peak: 0.12, delay: i * 0.12 })),
    death: () => [220, 196, 147].forEach((f, i) => tone({ type: 'triangle', f0: f, f1: f * 0.97, d: 0.7, peak: 0.12, delay: i * 0.3 })),
    hop: () => noise({ f: 800, f1: 400, d: 0.08, peak: 0.08 }),
    parry: () => { tone({ type: 'square', f0: jitter(1250), f1: 900, d: 0.18, peak: 0.07 }); tone({ type: 'sine', f0: 2400, f1: 2300, d: 0.4, peak: 0.06, delay: 0.01 }); noise({ f: 5000, q: 2, d: 0.06, peak: 0.12 }); },   // steel on steel
    whoosh: () => noise({ f: 500, f1: 2600, q: 1.2, a: 0.06, d: 0.32, peak: 0.16 }),
    roar: () => { tone({ type: 'sawtooth', f0: jitter(110), f1: 70, a: 0.05, d: 0.75, peak: 0.12 }); noise({ f: 260, q: 3, a: 0.05, d: 0.7, peak: 0.18 }); },
    smash: () => { noise({ f: 700, f1: 90, type: 'lowpass', d: 0.4, peak: 0.45 }); tone({ type: 'sine', f0: jitter(120), f1: 45, d: 0.35, peak: 0.35 }); noise({ f: 2500, f1: 800, q: 1, d: 0.12, peak: 0.12 }); },
    puff: () => noise({ f: 1400, f1: 300, q: 0.8, a: 0.02, d: 0.35, peak: 0.12 }),
    door: () => { noise({ f: 300, f1: 150, type: 'lowpass', d: 0.25, peak: 0.25 }); tone({ type: 'sine', f0: 140, f1: 90, d: 0.2, peak: 0.12 }); },
    // A footstep — snow crunches, stone taps, grass rustles — no faster than the gait.
    step(surface = 'grass', sprint = false) {
        const now = performance.now();
        if (now - lastStep < (sprint ? 260 : 380)) return;
        lastStep = now;
        if (surface === 'snow') noise({ f: jitter(2400, 0.2), q: 0.7, d: 0.09, peak: 0.07 });
        else if (surface === 'stone') noise({ f: jitter(1600, 0.2), q: 3, d: 0.04, peak: 0.06 });
        else noise({ f: jitter(900, 0.2), q: 0.8, type: 'lowpass', d: 0.07, peak: 0.06 });
    },
};
