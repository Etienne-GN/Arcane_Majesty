// Player settings (Phase 7 options), remembered per device: music volume, text size, camera sensitivity,
// invert vertical, show FPS. Graphics quality keeps its own key (engine/quality.js).
const KEY = 'amo3d.settings';
const DEFAULTS = { music: 1, textSize: 1, camSens: 1, invertY: false, showFps: false, online: false, server: '', onlineName: '', aim: 'camera', god: false, sfx: 1, hands: true };
const listeners = [];

export const settings = { ...DEFAULTS };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { /* storage blocked */ }

export function setSetting(key, value) {
    settings[key] = value;
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* storage blocked */ }
    if (key === 'textSize') applyTextSize();
    for (const fn of listeners) fn(key, value);
}
export function onSettingChange(fn) { listeners.push(fn); }

// The type scale: the device's base (as in the page CSS) times the player's text size.
function baseUi() {
    if (matchMedia('(pointer: coarse)').matches) return 1.1;
    return innerHeight >= 1400 ? 1.3 : innerHeight >= 1000 ? 1.15 : 1;
}
export function applyTextSize() {
    document.documentElement.style.setProperty('--ui', String(+(baseUi() * settings.textSize).toFixed(3)));
}
applyTextSize();
addEventListener('resize', applyTextSize);
