// Graphics quality: three presets (phones start on 'low', desktops on 'high'; ?q=low|medium|high overrides, F2 cycles),
// and each setting tweakable on its own in Options › Graphics (2026-11-22) — the tweaks are kept per device on top of
// the preset; any tweak makes it "custom". Changes apply on reload.
//   pixelRatio  resolution (× the screen's pixels, capped by the device)
//   fogFar      view distance (× the fog's reach)
//   foliage     vegetation density (trees, bushes, ferns)
//   decor       small decorations (flowers, grass tufts, lupins)
//   shadows / shadowMap / shadowRange   shadow quality
//   particles   particles in the air (rain, ash, motes)
//   lights      lamps that really light at once (the light pool)
//   lite        simple materials (cheaper lighting model)
//   antialias   smooth edges
export const PRESETS = {
    low: { name: 'low', pixelRatio: 1, antialias: false, shadows: false, shadowMap: 512, shadowRange: 40, foliage: 0.3, decor: false, particles: 0.5, fogFar: 0.75, lights: 4, lite: true },
    medium: { name: 'medium', pixelRatio: 1.5, antialias: true, shadows: true, shadowMap: 2048, shadowRange: 48, foliage: 0.6, decor: true, particles: 0.8, fogFar: 0.9, lights: 6, lite: false },
    high: { name: 'high', pixelRatio: 2, antialias: true, shadows: true, shadowMap: 4096, shadowRange: 72, foliage: 1, decor: true, particles: 1, fogFar: 1, lights: 8, lite: false },
};
const ORDER = ['low', 'medium', 'high'];
const KEY = 'amo3d.quality', TWEAKS = 'amo3d.gfx';

export function isMobile() {
    return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (matchMedia('(pointer: coarse)').matches && Math.min(innerWidth, innerHeight) < 900);
}
export function getTweaks() { try { return JSON.parse(localStorage.getItem(TWEAKS) ?? '{}') ?? {}; } catch { return {}; } }
export function setTweaks(t) { try { localStorage.setItem(TWEAKS, JSON.stringify(t)); } catch { /* storage blocked */ } }
function basePreset() {
    const fromUrl = new URLSearchParams(location.search).get('q');
    if (PRESETS[fromUrl]) return { p: PRESETS[fromUrl], url: true };
    try { const saved = localStorage.getItem(KEY); if (PRESETS[saved]) return { p: PRESETS[saved], url: false }; } catch { /* storage blocked */ }
    return { p: isMobile() ? PRESETS.low : PRESETS.high, url: false };
}
export function pickQuality() {
    const { p, url } = basePreset(), t = url ? {} : getTweaks();
    const q = { ...p, ...t, preset: p.name };
    q.custom = Object.keys(t).some(k => t[k] !== p[k]);
    return q;   // (name stays the preset's: code that asks "low?" still means the preset)
}
export function nextQuality(q) {
    const next = PRESETS[ORDER[(ORDER.indexOf(q.preset ?? q.name) + 1) % ORDER.length]];
    setQualityName(next.name);
    return next;
}
// Choosing a preset clears the tweaks.
export function setQualityName(name) { try { localStorage.setItem(KEY, name); } catch { /* storage blocked */ } setTweaks({}); }
