// Graphics quality presets. Phones start on 'low', desktops on 'high'; ?q=low|medium|high
// overrides, and F2 cycles (remembered per device).
export const PRESETS = {
    low: { name: 'low', pixelRatio: 1, antialias: false, shadows: false, shadowMap: 512, foliage: 0.3, particles: 0.5, fogFar: 0.75 },
    medium: { name: 'medium', pixelRatio: 1.5, antialias: true, shadows: true, shadowMap: 1024, foliage: 0.6, particles: 0.8, fogFar: 0.9 },
    high: { name: 'high', pixelRatio: 2, antialias: true, shadows: true, shadowMap: 2048, foliage: 1, particles: 1, fogFar: 1 },
};
const ORDER = ['low', 'medium', 'high'];
const KEY = 'amo3d.quality';

export function isMobile() {
    return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 900);
}

export function pickQuality() {
    const fromUrl = new URLSearchParams(location.search).get('q');
    if (PRESETS[fromUrl]) return PRESETS[fromUrl];
    try { const saved = localStorage.getItem(KEY); if (PRESETS[saved]) return PRESETS[saved]; } catch { /* storage blocked */ }
    return isMobile() ? PRESETS.low : PRESETS.high;
}

export function nextQuality(q) {
    const next = PRESETS[ORDER[(ORDER.indexOf(q.name) + 1) % ORDER.length]];
    try { localStorage.setItem(KEY, next.name); } catch { /* storage blocked */ }
    return next;
}
