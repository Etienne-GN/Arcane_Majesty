// Updates: the app knows its own version (VITE_APP_VERSION, set by CI from the git tag, e.g. amo3d-v0.2.0 → 0.2.0;
// 'dev' for local builds) and asks GitHub for the newest amo3d release. If it is newer, the title screen and
// Options offer it in an in-app panel: the changelog, then the app downloads the APK itself (native ApkUpdater,
// with a progress bar) and hands it to Android's installer — no browser. Android asks the player to confirm, and
// the first time to allow the app to install updates. Off the phone, the release page opens.
// Only on the phone, and only GitHub's public release list is fetched — nothing about the player is sent.
import { Capacitor } from '@capacitor/core';
import { Capacitor as C, registerPlugin } from '@capacitor/core';
const ApkUpdater = registerPlugin('ApkUpdater');
void C;

export const VERSION = import.meta.env.VITE_APP_VERSION || 'dev';
const REPO = 'Etienne-GN/Arcane_Majesty', PREFIX = 'amo3d-v';
const parse = v => String(v).replace(PREFIX, '').split('.').map(n => parseInt(n, 10) || 0);
const newer = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0); return false; };

let cached = null;
// { version, url, page, notes } of the newest release if it is newer than this app, else null.
export async function checkForUpdate({ force = false } = {}) {
    if (cached && !force) return cached.update;
    try {
        const r = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=50`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!r.ok) throw new Error(`GitHub ${r.status}`);
        // The highest version, not the first listed: GitHub orders by tag name, where 0.9.0 sorts before 0.15.0.
        const rel = (await r.json()).filter(x => !x.draft && !x.prerelease && x.tag_name?.startsWith(PREFIX) && x.assets?.some(a => a.name.endsWith('.apk')))
            .reduce((best, x) => (!best || newer(x.tag_name, best.tag_name) ? x : best), null);
        const apk = rel?.assets?.find(a => a.name.endsWith('.apk'));
        const latest = rel ? rel.tag_name.slice(PREFIX.length) : null;
        const update = rel && apk && (VERSION === 'dev' || newer(latest, VERSION)) ? { version: latest, url: apk.browser_download_url, page: rel.html_url, notes: rel.body ?? '' } : null;
        cached = { update, latest };
        return update;
    } catch (e) { cached = { update: null, error: String(e.message) }; return null; }
}
export const latestKnown = () => cached?.latest ?? null;
export const lastError = () => cached?.error ?? null;
// The update panel: what's new (the release's changelog), Update now, a progress bar, what happens next.
let panel = null;
function mdToNodes(md) {   // the changelog, as plain text lines (headings and bullets), never as HTML
    const box = document.createElement('div'); box.className = 'notes';
    for (const raw of String(md).split('\n')) {
        const line = raw.trim(); if (!line || line === '---' || line.startsWith('Install:')) continue;
        const e = document.createElement(line.startsWith('#') ? 'h4' : 'div');
        e.textContent = line.replace(/^#+\s*/, '').replace(/^-\s*/, '• ');
        box.append(e);
    }
    return box;
}
export function openDownload(u) {
    if (!Capacitor.isNativePlatform()) { window.open(u.page, '_blank', 'noopener'); return; }
    if (!panel) {
        const css = document.createElement('style');
        css.textContent = `#upd { position: fixed; inset: 0; z-index: 40; display: grid; place-items: center; background: #05060ad8; font-family: Georgia, serif; color: #f1e4c8; }
#upd .p { width: min(560px, 92vw); max-height: 88vh; display: flex; flex-direction: column; gap: 10px; padding: 18px 20px; border-radius: 14px; background: linear-gradient(160deg, #2a1c10f4, #140c06f8); box-shadow: 0 10px 40px #000c, inset 0 0 0 1px #c8965a88; }
#upd h3 { margin: 0; font-weight: normal; color: #f3d88b; font-size: calc(22px * var(--ui, 1)); }
#upd .notes { overflow: auto; max-height: 40vh; font-size: calc(14px * var(--ui, 1)); line-height: 1.35; padding: 8px 10px; border-radius: 8px; background: #0004; }
#upd .notes h4 { margin: 6px 0 2px; font-weight: normal; color: #e8c890; font-size: calc(15px * var(--ui, 1)); }
#upd .bar { height: 12px; border-radius: 6px; background: #0006; overflow: hidden; display: none; } #upd .bar > div { height: 100%; width: 0; background: linear-gradient(90deg, #8a6a2a, #f3d88b); transition: width .2s; }
#upd .st { font-size: calc(14px * var(--ui, 1)); min-height: 1.3em; opacity: .85; }
#upd .row { display: flex; gap: 8px; } #upd button { flex: 1; font: calc(17px * var(--ui, 1)) Georgia, serif; padding: 11px; border-radius: 9px; cursor: pointer; color: #fff3d8; border: 1px solid #f3d88b88; background: linear-gradient(#8a5a1a, #5a3a0c); }
#upd button.ghost { background: #0004; } #upd button[disabled] { opacity: .45; }`;
        document.head.append(css);
    }
    panel?.remove();
    panel = document.createElement('div'); panel.id = 'upd';
    const p = document.createElement('div'); p.className = 'p';
    const h = document.createElement('h3'); h.textContent = `Version ${u.version} is ready`;
    const bar = document.createElement('div'); bar.className = 'bar'; const fill = document.createElement('div'); bar.append(fill);
    const st = document.createElement('div'); st.className = 'st'; st.textContent = `You have ${VERSION}. Your saves are kept.`;
    const row = document.createElement('div'); row.className = 'row';
    const go = document.createElement('button'), later = document.createElement('button');
    go.textContent = 'Update now'; later.textContent = 'Later'; later.className = 'ghost';
    later.onclick = () => panel.remove();
    go.onclick = async () => {
        go.disabled = true;
        try {
            const { allowed } = await ApkUpdater.canInstall();
            if (!allowed) {
                st.textContent = 'Android needs your permission once: turn on "Allow from this source" for Arcane Majesty, come back, and tap Update now again.';
                go.disabled = false;
                await ApkUpdater.openInstallSettings();
                return;
            }
            bar.style.display = 'block'; st.textContent = 'Downloading…';
            const sub = await ApkUpdater.addListener('progress', e => { if (e.percent >= 0) { fill.style.width = `${e.percent}%`; st.textContent = `Downloading… ${e.percent}%`; } });
            await ApkUpdater.downloadAndInstall({ url: u.url });
            sub.remove();
            fill.style.width = '100%'; st.textContent = 'Downloaded — confirm the update in the window Android shows.';
            go.disabled = false; go.textContent = 'Show the installer again';
        } catch (e) { st.textContent = `Could not update: ${e.message ?? e}`; go.disabled = false; }
    };
    row.append(go, later);
    p.append(h, mdToNodes(u.notes || ''), bar, st, row);
    panel.append(p);
    panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
    document.body.append(panel);
}
export const isPhone = () => Capacitor.isNativePlatform();
