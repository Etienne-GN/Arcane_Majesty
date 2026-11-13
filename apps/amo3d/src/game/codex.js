// The codex (K / touch CDX) — amo's bestiary (bestiary.bestiaryEntries: lore, kills, stat ranges by
// level band, weaknesses and resistances, spells, drops; creatures met but never beaten show as ???),
// fed by amo's own records (stats.trackKill, stats.seenEnemyTypes); and the places Eldrin has been.
import { bestiary as BE } from '@rules';

export function createCodex({ stats }) {
    const css = document.createElement('style');
    css.textContent = `
#codex { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060acc; font-family: Georgia, serif; color: #eee6d2; }
#codex.open { display: grid; }
#codex .panel { width: min(760px, 94vw); max-height: 88vh; overflow: auto; padding: 18px 22px; border: 1px solid #f3d88b66; border-radius: 14px; background: linear-gradient(160deg, #18141eee, #0b0a10f4); }
#codex h2 { margin: 0 0 6px; font-weight: normal; letter-spacing: .16em; color: #f3d88b; font-size: 20px; }
#codex h3 { margin: 16px 0 6px; font-weight: normal; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; opacity: .7; }
#codex .e { padding: 10px 12px; margin-bottom: 8px; border-radius: 8px; background: #ffffff0a; border: 1px solid #ffffff14; }
#codex .t { font-size: 16px; color: #f3e2b0; } #codex .t small { font-size: 11px; opacity: .6; margin-left: 8px; letter-spacing: .1em; }
#codex .x { white-space: pre-line; font-size: 13px; opacity: .82; margin-top: 4px; }
#codex .close { float: right; font: 13px Georgia, serif; color: #eee6d2; background: transparent; border: 1px solid #eee6d255; border-radius: 7px; padding: 6px 12px; cursor: pointer; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'codex';
    document.body.append(root);
    let open = false;
    const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

    function render() {
        root.textContent = '';
        const p = el('div', 'panel');
        const close = el('button', 'close', 'Close ✕'); close.onclick = () => toggle();
        p.append(close, el('h2', null, 'Codex'));
        p.append(el('h3', null, 'Bestiary'));
        const band = { min: Math.max(1, stats.level - 1), max: stats.level + 1 };
        const entries = BE.bestiaryEntries({ killed: stats.killedEnemyTypes ?? [], seen: stats.seenEnemyTypes ?? [], killCounts: stats.killCounts ?? {}, band });
        if (!entries.length) p.append(el('div', 'x', 'Nothing met yet.'));
        for (const e of entries) {
            const box = el('div', 'e');
            const t = el('div', 't', e.title);
            if (e.threat) t.append(el('small', null, `THREAT: ${e.threat}`));
            box.append(t, el('div', 'x', e.text));
            p.append(box);
        }
        p.append(el('h3', null, 'Places'));
        const places = Object.keys(stats.flags ?? {}).filter(k => k.startsWith('visited:')).map(k => stats.flags[k]);
        p.append(el('div', 'x', places.length ? places.join('\n') : '—'));
        root.append(p);
    }
    function toggle() { open = !open; root.classList.toggle('open', open); if (open) render(); }
    addEventListener('keydown', e => { if (e.code === 'KeyK') toggle(); else if (open && e.code === 'Escape') toggle(); });

    return {
        toggle, get open() { return open; },
        // A creature noticed you (engaged) — amo's "seen" list.
        seen(type) { if (type && type !== 'deer') { stats.seenEnemyTypes ??= []; if (!stats.seenEnemyTypes.includes(type)) stats.seenEnemyTypes.push(type); } },
        killed(type) { if (type) stats.trackKill(type); },
        visited(id, name) { (stats.flags ??= {})[`visited:${id}`] = name; },
    };
}
