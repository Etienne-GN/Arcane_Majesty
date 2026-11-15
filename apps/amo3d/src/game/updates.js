// Updates: the app knows its own version (VITE_APP_VERSION, set by CI from the git tag, e.g. amo3d-v0.2.0 → 0.2.0;
// 'dev' for local builds) and asks GitHub for the newest amo3d release. If it is newer, the title screen and
// Options offer it; the download opens in the phone's browser, which installs the APK over this one (same key).
// Only on the phone, and only GitHub's public release list is fetched — nothing about the player is sent.
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

export const VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
const REPO = 'Etienne-GN/Arcane_Majesty', PREFIX = 'amo3d-v';
const parse = v => String(v).replace(PREFIX, '').split('.').map(n => parseInt(n, 10) || 0);
const newer = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0); return false; };

let cached = null;
// { version, url, page, notes } of the newest release if it is newer than this app, else null.
export async function checkForUpdate({ force = false } = {}) {
    if (cached && !force) return cached.update;
    try {
        const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=15`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        const rel = (await r.json()).find(x => !x.draft && !x.prerelease && x.tag_name?.startsWith(PREFIX));
        const apk = rel?.assets?.find(a => a.name.endsWith('.apk'));
        const latest = rel ? rel.tag_name.slice(PREFIX.length) : null;
        const update = rel && apk && (VERSION === 'dev' || newer(latest, VERSION)) ? { version: latest, url: apk.browser_download_url, page: rel.html_url, notes: rel.body ?? '' } : null;
        cached = { update, latest };
        return update;
    } catch (e) { cached = { update: null, error: String(e.message) }; return null; }
}
export const latestKnown = () => cached?.latest ?? null;
export const lastError = () => cached?.error ?? null;
export async function openDownload(u) {
    if (Capacitor.isNativePlatform()) await Browser.open({ url: u.url });
    else window.open(u.page, '_blank', 'noopener');
}
export const isPhone = () => Capacitor.isNativePlatform();
