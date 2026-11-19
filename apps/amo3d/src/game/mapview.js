// World map and minimap — a hand-drawn chart. The map is painted once per place from the terrain, like an old
// survey: parchment land (tinted by the region's ground), watercolour water with an inked shoreline, sand, hatched
// rock and pale snow, and every tree inked as a little symbol. Unexplored ground is blank parchment (amo's fog of
// war, fog.js, 0.5 m tiles, saved in stats.explored).
//   World map (M / MENU → Map / tap the minimap): a leather frame, the place's name, a compass rose and a scale
//   bar; drawn icons for places, exits (labelled with where they lead), campfires, boards, cairns…; drag or one
//   finger to pan, wheel or pinch to zoom; tap a place (or anywhere) to set a waypoint, tap it again to clear.
//   Minimap: a bronze ring with N on the rim, turning with the camera (Options → Minimap: north up instead);
//   the icons, creatures, the waypoint — or an arrow on the rim with the distance when it is off the edge.
import '@fontsource/im-fell-english/400.css';
import { fog as F } from '@rules';
import { settings } from '../engine/settings.js';

const TILE = 0.5;             // metres per amo tile
const REVEAL_M = 34;          // you see far in 3D: reveal this many metres around you
const PX_PER_M = 2;           // map art resolution
const MINI_R = 40;            // metres shown around you on the minimap
const PARCH = [228, 211, 168], INK = '#3a2a18';
const STATION = { campfire: 'fire', hearth: 'hearth', alchemy: 'flask', workbench: 'anvil', board: 'board', gate: 'stones', cairn: 'cairn' };

// Small drawn icons, centred on 0,0, about 2·s across.
function icon(g, kind, x, y, s, col = INK) {
    g.save(); g.translate(x, y); g.lineWidth = Math.max(1.2, s * 0.18); g.strokeStyle = col; g.fillStyle = col; g.lineJoin = 'round'; g.lineCap = 'round';
    const P = (pts, fill = false) => { g.beginPath(); pts.forEach(([a, b], i) => (i ? g.lineTo(a * s, b * s) : g.moveTo(a * s, b * s))); fill ? g.fill() : g.stroke(); };
    switch (kind) {
        case 'tower': P([[-0.5, 1], [-0.45, -0.6], [-0.6, -0.6], [-0.6, -1], [-0.3, -1], [-0.3, -0.8], [0, -0.8], [0, -1], [0.3, -1], [0.3, -0.8], [0.6, -0.8], [0.6, -0.6], [0.45, -0.6], [0.5, 1], [-0.5, 1]]); break;
        case 'stones': for (const dx of [-0.6, 0, 0.6]) P([[dx - 0.22, 0.9], [dx - 0.2, -0.5 - (dx ? 0 : 0.3)], [dx + 0.2, -0.5 - (dx ? 0 : 0.3)], [dx + 0.22, 0.9]], true); break;
        case 'water': for (const dy of [-0.35, 0.35]) { g.beginPath(); g.moveTo(-0.9 * s, dy * s); g.quadraticCurveTo(-0.45 * s, (dy - 0.4) * s, 0, dy * s); g.quadraticCurveTo(0.45 * s, (dy + 0.4) * s, 0.9 * s, dy * s); g.stroke(); } break;
        case 'fire': g.fillStyle = '#b8401a'; P([[0, -1], [0.55, 0.1], [0.4, 0.8], [0, 1], [-0.4, 0.8], [-0.55, 0.1], [-0.15, -0.3]], true); g.fillStyle = '#f0b040'; P([[0, -0.2], [0.25, 0.4], [0, 0.85], [-0.25, 0.4]], true); break;
        case 'den': P([[0, -1], [1, 0.85], [-1, 0.85], [0, -1]]); P([[0, -0.35], [0, 0.3]]); g.beginPath(); g.arc(0, 0.6 * s, s * 0.08, 0, Math.PI * 2); g.fill(); break;
        case 'door': g.fillRect(-0.45 * s, -0.7 * s, 0.9 * s, 1.5 * s); g.fillStyle = '#e4d3a8'; g.beginPath(); g.arc(0.2 * s, 0.15 * s, 0.1 * s, 0, Math.PI * 2); g.fill(); break;
        case 'gate': case 'exit': g.beginPath(); g.moveTo(-0.7 * s, s); g.lineTo(-0.7 * s, -0.2 * s); g.arc(0, -0.2 * s, 0.7 * s, Math.PI, 0); g.lineTo(0.7 * s, s); g.stroke(); break;
        case 'hearth': g.beginPath(); g.arc(0, 0.1 * s, 0.75 * s, 0, Math.PI); g.lineTo(-0.75 * s, 0.1 * s); g.fill(); P([[-0.3, -0.2], [-0.2, -0.9]]); P([[0.25, -0.2], [0.35, -0.9]]); break;
        case 'flask': P([[-0.2, -1], [0.2, -1], [0.2, -0.3], [0.7, 0.8], [-0.7, 0.8], [-0.2, -0.3], [-0.2, -1]]); break;
        case 'anvil': P([[-0.9, -0.3], [0.9, -0.3], [0.5, 0.1], [0.3, 0.1], [0.4, 0.8], [-0.4, 0.8], [-0.3, 0.1], [-0.6, 0.1]], true); break;
        case 'board': g.strokeRect(-0.8 * s, -0.8 * s, 1.6 * s, 1.2 * s); P([[-0.4, -0.4], [0.4, -0.4]]); P([[-0.4, 0], [0.2, 0]]); P([[-0.5, 0.4], [-0.5, 1]]); P([[0.5, 0.4], [0.5, 1]]); break;
        case 'cairn': for (const [w, y0] of [[0.8, 0.9], [0.6, 0.35], [0.4, -0.15], [0.22, -0.6]]) { g.beginPath(); g.ellipse(0, y0 * s, w * s, 0.22 * s, 0, 0, Math.PI * 2); g.fill(); } break;
        case 'house': P([[-0.8, 0], [0, -0.85], [0.8, 0], [0.6, 0], [0.6, 0.9], [-0.6, 0.9], [-0.6, 0], [-0.8, 0]], true); break;
        case 'pin': g.fillStyle = '#b8301a'; g.beginPath(); g.arc(0, -0.55 * s, 0.5 * s, 0, Math.PI * 2); g.fill(); P([[-0.35, -0.3], [0, 1], [0.35, -0.3]], true); g.fillStyle = '#fff4dc'; g.beginPath(); g.arc(0, -0.55 * s, 0.2 * s, 0, Math.PI * 2); g.fill(); break;
        default: g.beginPath(); g.arc(0, 0, 0.45 * s, 0, Math.PI * 2); g.fill();
    }
    g.restore();
}

export function createMapView({ stats, hud }) {
    const css = document.createElement('style');
    css.textContent = `
#minimap { position: fixed; right: 18px; top: 78px; width: 170px; height: 170px; border-radius: 50%; overflow: hidden; z-index: 4; pointer-events: auto;
    box-shadow: 0 0 0 3px #6a4a22, 0 0 0 5px #c8963a, 0 0 0 7px #3a2410, 0 5px 16px #000b; cursor: pointer; }
#minimap:hover { box-shadow: 0 0 0 3px #8a6a32, 0 0 0 5px #f3d88b, 0 0 0 7px #3a2410, 0 5px 16px #000b; }
#worldmap { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060ad8; font-family: 'IM Fell English', Georgia, serif; color: #f1e4c8; }
#worldmap.open { display: grid; }
#worldmap .frame { position: relative; display: flex; flex-direction: column; width: min(1040px, 96vw); height: min(680px, calc(100vh - 20px)); box-sizing: border-box; padding: 10px 12px 10px;
    border-radius: 14px; background: linear-gradient(135deg, #4a2c18, #2e1a0c); box-shadow: 0 12px 40px #000c, inset 0 0 0 2px #8a5a2a, inset 0 0 0 5px #2a140a, inset 0 0 0 6px #b08040; }
#worldmap .bar { flex: none; min-height: calc(36px * var(--ui, 1)); box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 0 46px 8px 6px; flex-wrap: wrap; }
#worldmap h2 { margin: 0; line-height: 1.25; font-weight: normal; font-size: calc(24px * var(--ui, 1)); color: #f3d88b; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#worldmap .bar button { font: calc(14px * var(--ui, 1)) 'IM Fell English', Georgia, serif; padding: 5px 11px; border-radius: 12px; border: 1px solid #c8965a77; background: #0004; color: #f1e4c8; cursor: pointer; }
#worldmap .wp { font-family: Caveat, cursive; font-size: calc(18px * var(--ui, 1)); color: #f3d88b; }
#worldmap .stage { position: relative; flex: 1; min-height: 0; border-radius: 6px; overflow: hidden; box-shadow: inset 0 0 0 2px #2a140a; background: rgb(${PARCH.join(',')}); touch-action: none; cursor: grab; }
#worldmap canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
#worldmap .close { position: absolute; right: 8px; top: 6px; width: 40px; height: 40px; border-radius: 50%; border: 0; cursor: pointer; color: #f4d8b0; font: bold 16px Georgia, serif;
    background: radial-gradient(circle at 40% 35%, #b8342a, #6a1410); box-shadow: 0 2px 6px #000a; z-index: 2; }
#worldmap .hint { flex: none; font-family: Caveat, cursive; font-size: calc(17px * var(--ui, 1)); color: #d8c09a; padding: 6px 6px 0; }
body.title-on #minimap { display: none; }
@media (max-height: 480px) { #worldmap .frame { padding: 6px 8px; } #worldmap .bar { padding-bottom: 4px; } #worldmap h2 { font-size: calc(19px * var(--ui, 1)); } #worldmap .hint { display: none; } #worldmap .bar button { padding: 3px 9px; } }`;
    document.head.append(css);
    const mini = document.createElement('canvas');
    mini.id = 'minimap'; mini.width = 340; mini.height = 340;
    document.body.append(mini);
    mini.title = 'Open the map (M)';
    mini.addEventListener('click', e => { e.stopPropagation(); toggle(); });   // click the minimap: the world map (touch taps it too)

    const overlay = document.createElement('div'); overlay.id = 'worldmap';
    const frame = document.createElement('div'); frame.className = 'frame';
    const bar = document.createElement('div'); bar.className = 'bar';
    const title = document.createElement('h2');
    const wpLabel = document.createElement('span'); wpLabel.className = 'wp';
    const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = e => { e.stopPropagation(); fn(); }; return b; };
    const centreBtn = btn('Centre on me', () => { view.follow = true; view.zoom = Math.max(view.zoom, fitZoom() * 2.2); draw(); });
    const fitBtn = btn('Whole map', () => { view.follow = false; view.zoom = fitZoom(); view.cx = view.cz = 0; draw(); });
    const clearBtn = btn('Clear waypoint', () => { setWaypoint(null); draw(); });
    bar.append(title, wpLabel, clearBtn, centreBtn, fitBtn);
    const stage = document.createElement('div'); stage.className = 'stage';
    const big = document.createElement('canvas'); stage.append(big);
    const close = document.createElement('button'); close.className = 'close'; close.textContent = '✕'; close.onclick = () => toggle();
    const hint = document.createElement('div'); hint.className = 'hint';
    hint.textContent = matchMedia('(pointer: coarse)').matches ? 'Drag to look around, pinch to zoom, tap a place to set a waypoint.' : 'Drag to look around, wheel to zoom, click a place to set a waypoint · M or Esc to close.';
    frame.append(bar, stage, hint, close); overlay.append(frame);
    overlay.addEventListener('pointerdown', e => { if (e.target === overlay) toggle(); });
    document.body.append(overlay);

    let art = null, fog = null, mapRef = null, mapId = null, open = false, lastPlayer = null;
    const view = { cx: 0, cz: 0, zoom: 1, follow: false };

    // ---- the chart, painted once per place ----
    function paint(map) {
        const info = map.mapInfo, half = info.half, size = Math.round(half * 2 * PX_PER_M);
        const c = document.createElement('canvas'); c.width = c.height = size;
        const g = c.getContext('2d'), img = g.createImageData(size, size), H = new Float32Array(size * size);
        for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) H[py * size + px] = map.heightAt(px / PX_PER_M - half, py / PX_PER_M - half);
        const kind = h => h < info.water - 0.6 ? 0 : h < info.water ? 1 : h < info.water + 0.35 ? 2 : h > 17 ? 5 : h > 6 ? 4 : 3;
        const tint = info.ground ? info.ground.map((v, i) => PARCH[i] * 0.72 + v * 0.28) : [PARCH[0] * 0.8 + 120 * 0.2, PARCH[1] * 0.8 + 150 * 0.2, PARCH[2] * 0.8 + 80 * 0.2];
        let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
            const h = H[py * size + px], k = kind(h);
            const gr = info.groundAt?.(px / PX_PER_M - half, py / PX_PER_M - half);   // a map's own ground: roads, paving
            let col = gr === 'rock' ? [74, 64, 54] : gr === 'road' ? [196, 172, 128] : gr === 'paved' ? [206, 200, 186] : k === 0 ? [120, 158, 176] : k === 1 ? [150, 184, 190] : k === 2 ? [222, 200, 150] : k === 5 ? [240, 236, 226] : k === 4 ? [176, 160, 132] : tint;
            const hx = H[py * size + Math.max(0, px - 1)], hy = H[Math.max(0, py - 1) * size + px];
            const shade = 0.9 + 0.1 * Math.max(-1, Math.min(1, ((hx - h) + (hy - h)) * 0.5));
            let ink = 0;
            if (k >= 2) {   // the shoreline in ink, where land meets water
                const n = [H[py * size + Math.min(size - 1, px + 1)], hx, H[Math.min(size - 1, py + 1) * size + px], hy];
                if (n.some(v => kind(v) <= 1)) ink = 0.8;
            }
            if (k === 4 && (px + py) % 5 === 0) ink = Math.max(ink, 0.35);   // hatched rock
            const noise = (rnd() - 0.5) * 12, i = (py * size + px) * 4;
            for (let j = 0; j < 3; j++) img.data[i + j] = Math.max(0, Math.min(255, col[j] * shade + noise)) * (1 - ink) + [58, 42, 24][j] * ink;
            img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        // Buildings as inked blocks with a roof wash, and the city wall as a heavy inked line of stones.
        const P = v => (v + half) * PX_PER_M;
        for (const b of info.buildings ?? []) {
            g.fillStyle = 'rgba(150,92,62,0.75)'; g.fillRect(P(b.x0), P(b.z0), (b.x1 - b.x0) * PX_PER_M, (b.z1 - b.z0) * PX_PER_M);
            g.strokeStyle = INK; g.lineWidth = 1.4; g.strokeRect(P(b.x0), P(b.z0), (b.x1 - b.x0) * PX_PER_M, (b.z1 - b.z0) * PX_PER_M);
            g.strokeStyle = 'rgba(58,42,24,0.45)'; g.lineWidth = 0.8; g.beginPath();
            if (b.x1 - b.x0 > b.z1 - b.z0) { g.moveTo(P(b.x0), P((b.z0 + b.z1) / 2)); g.lineTo(P(b.x1), P((b.z0 + b.z1) / 2)); } else { g.moveTo(P((b.x0 + b.x1) / 2), P(b.z0)); g.lineTo(P((b.x0 + b.x1) / 2), P(b.z1)); }
            g.stroke();   // the roof ridge
        }
        g.fillStyle = '#5a4a3a';
        for (const [x, z] of info.walls ?? []) { g.beginPath(); g.arc(P(x), P(z), 0.62 * PX_PER_M + 0.4, 0, Math.PI * 2); g.fill(); }
        // Trees, inked: a little triangle for a pine, a round crown for a broadleaf.
        g.strokeStyle = '#3e4a26'; g.fillStyle = '#5a6a32'; g.lineWidth = 0.9;
        for (const [x, z, pine] of info.trees) {
            const sx = (x + half) * PX_PER_M, sy = (z + half) * PX_PER_M;
            g.beginPath();
            if (pine) { g.moveTo(sx, sy - 3); g.lineTo(sx + 2.2, sy + 2); g.lineTo(sx - 2.2, sy + 2); g.closePath(); }
            else g.arc(sx, sy, 2.4, 0, Math.PI * 2);
            g.globalAlpha = 0.55; g.fill(); g.globalAlpha = 1; g.stroke();
        }
        return { canvas: c, half, size };
    }
    function fogFor(map, id) {
        const tiles = (map.mapInfo.half * 2) / TILE;
        stats.explored ??= {};
        return F.decodeFog(stats.explored[id], tiles, tiles);
    }
    // The fog as one small image (a pixel per fog cell) of blank parchment, scaled up with smoothing.
    let fogImg = null;
    function refreshFog() {
        fogImg ??= document.createElement('canvas');
        fogImg.width = fog.cw; fogImg.height = fog.ch;
        const g = fogImg.getContext('2d'), img = g.createImageData(fog.cw, fog.ch);
        for (let z = 0; z < fog.ch; z++) for (let x = 0; x < fog.cw; x++) {
            const i = (z * fog.cw + x) * 4;
            img.data[i] = PARCH[0] - 10; img.data[i + 1] = PARCH[1] - 12; img.data[i + 2] = PARCH[2] - 14;
            img.data[i + 3] = F.isCellExplored(fog, x, z) ? 0 : 246;
        }
        g.putImageData(img, 0, 0);
    }
    const cellM = () => F.FOG_CELL * TILE;
    const seenAt = (x, z) => !fog || F.isCellExplored(fog, Math.floor((x + art.half) / cellM()), Math.floor((z + art.half) / cellM()));

    // Everything worth a mark: landmarks, exits (named after where they go), stations.
    function markers() {
        const out = [];
        for (const l of mapRef.mapInfo.landmarks ?? []) out.push({ x: l.x, z: l.z, name: l.name, icon: /house/i.test(l.name) ? 'house' : l.icon ?? 'dot', always: l.always, label: true });
        for (const t of mapRef.triggers ?? []) {
            if (!t.to || !t.label) continue;
            const door = t.spawn === 'enter', generic = /^(an? |the )?(house|home|door|building)$/i.test(t.label.replace(/^→\s*/, ''));
            if (door) out.push({ x: t.x, z: t.z, name: t.label, icon: 'door', label: !generic, small: true });   // a way into a building
            else out.push({ x: t.x, z: t.z, name: t.label.startsWith('→') ? t.label : `→ ${t.label.replace(/^(To |The road to )/i, '')}`, icon: 'exit', label: true });
        }
        for (const s of mapRef.stations ?? []) if (STATION[s.mode] && s.pos) out.push({ x: s.pos.x, z: s.pos.z, name: s.title ?? s.mode, icon: STATION[s.mode], label: false });
        return out;
    }

    // ---- waypoint (one per place, saved) ----
    const wps = () => ((stats.flags ??= {}).waypoints ??= {});
    const waypoint = () => wps()[mapId] ?? null;
    function setWaypoint(w) { if (w) wps()[mapId] = w; else delete wps()[mapId]; wpLabel.textContent = w ? `⚑ ${w.name}` : ''; clearBtn.style.display = w ? '' : 'none'; }

    function setMap(map, id) {
        mapRef = map; mapId = id;
        mini.style.display = map.mapInfo ? '' : 'none';
        if (!map.mapInfo) { art = null; fog = null; return; }
        if (!art || art.map !== map) art = { ...paint(map), map };
        fog = fogFor(map, id);
        refreshFog();
        title.textContent = map.name;
        setWaypoint(waypoint());
        view.cx = view.cz = 0; view.zoom = 0; view.follow = false;
    }

    // ---- drawing helpers ----
    function arrow(g, x, y, angle, size) {   // angle: canvas radians the arrow points along
        g.save(); g.translate(x, y); g.rotate(angle + Math.PI / 2);
        g.fillStyle = '#b8301a'; g.strokeStyle = '#fff4dc'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.7, size * 0.8); g.lineTo(0, size * 0.35); g.lineTo(-size * 0.7, size * 0.8); g.closePath();
        g.stroke(); g.fill(); g.restore();
    }
    const facingAngle = facing => Math.atan2(Math.cos(facing), Math.sin(facing));   // world facing → canvas angle (north up, z down)
    function label(g, text, x, y, px) {
        g.font = `${px}px 'IM Fell English', Georgia, serif`; g.textAlign = 'center'; g.lineJoin = 'round';
        g.lineWidth = Math.max(3, px * 0.28); g.strokeStyle = 'rgba(240,226,190,0.92)'; g.strokeText(text, x, y);
        g.fillStyle = '#3a2410'; g.fillText(text, x, y);
    }

    // ---- minimap ----
    function update(player, camYaw) {
        lastPlayer = player;
        if (!fog || !art) return;
        const tiles = x => (x + art.half) / TILE;
        if (F.revealAround(fog, tiles(player.pos.x), tiles(player.pos.z), REVEAL_M / TILE).length) { stats.explored[mapId] = F.encodeFog(fog); refreshFog(); }
        const g = mini.getContext('2d'), S = mini.width, c = S / 2, scale = S / (MINI_R * 2);
        const look = Math.atan2(-Math.cos(camYaw), -Math.sin(camYaw));   // the camera's forward on the north-up chart
        const rot = settings.miniNorth ? 0 : -Math.PI / 2 - look;        // turn the chart so the camera looks up
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = `rgb(${PARCH.join(',')})`; g.fillRect(0, 0, S, S);
        g.save(); g.translate(c, c); g.rotate(rot); g.translate(-c, -c);
        const ox = player.pos.x - MINI_R * 1.45, oz = player.pos.z - MINI_R * 1.45, span = MINI_R * 2 * 1.45;   // a little extra so corners stay filled when turned
        const sOff = (c - MINI_R * 1.45 * scale);
        g.drawImage(art.canvas, (ox + art.half) * PX_PER_M, (oz + art.half) * PX_PER_M, span * PX_PER_M, span * PX_PER_M, sOff, sOff, span * scale, span * scale);
        g.imageSmoothingEnabled = true;
        g.drawImage(fogImg, (ox + art.half) / cellM(), (oz + art.half) / cellM(), span / cellM(), span / cellM(), sOff, sOff, span * scale, span * scale);
        const scr = (x, z) => [c + (x - player.pos.x) * scale, c + (z - player.pos.z) * scale];
        for (const m of markers()) {
            if (!m.always && !seenAt(m.x, m.z)) continue;
            const [sx, sy] = scr(m.x, m.z);
            if (Math.hypot(sx - c, sy - c) > c * 1.05) continue;
            g.save(); g.translate(sx, sy); g.rotate(-rot); icon(g, m.icon, 0, 0, 9); g.restore();
        }
        for (const h of mapRef.hittables ?? []) {
            if (!h.alive || !seenAt(h.pos.x, h.pos.z)) continue;
            const [sx, sy] = scr(h.pos.x, h.pos.z);
            g.fillStyle = h.kind === 'deer' ? '#8a6a3a' : h.engaged ? '#d82a1a' : '#a8402a';
            g.beginPath(); g.arc(sx, sy, h.kind === 'deer' ? 4 : 5.5, 0, Math.PI * 2); g.fill();
        }
        g.restore();
        // The waypoint: its pin, or an arrow on the rim with the distance.
        const w = waypoint();
        if (w) {
            const dx = w.x - player.pos.x, dz = w.z - player.pos.z, d = Math.hypot(dx, dz);
            const a = Math.atan2(dz, dx) + rot;
            if (d * scale < c - 18) { icon(g, 'pin', c + Math.cos(a) * d * scale, c + Math.sin(a) * d * scale, 13); }
            else {
                const rx = c + Math.cos(a) * (c - 20), ry = c + Math.sin(a) * (c - 20);
                g.save(); g.translate(rx, ry); g.rotate(a + Math.PI / 2); g.fillStyle = '#b8301a'; g.strokeStyle = '#fff4dc'; g.lineWidth = 2;
                g.beginPath(); g.moveTo(0, -14); g.lineTo(10, 6); g.lineTo(-10, 6); g.closePath(); g.stroke(); g.fill(); g.restore();
                label(g, `${Math.round(d)} m`, c + Math.cos(a) * (c - 48), c + Math.sin(a) * (c - 48) + 7, 22);
            }
        }
        // The camera's view and you.
        g.fillStyle = 'rgba(120,70,20,0.16)';
        g.beginPath(); g.moveTo(c, c); g.arc(c, c, S * 0.36, look + rot - 0.5, look + rot + 0.5); g.closePath(); g.fill();
        arrow(g, c, c, facingAngle(player.facing) + rot, 15);
        // N on the rim.
        const na = -Math.PI / 2 + rot;
        label(g, 'N', c + Math.cos(na) * (c - 22), c + Math.sin(na) * (c - 22) + 9, 30);
        if (open) draw();
    }

    // ---- the world map ----
    const fitZoom = () => { const r = stage.getBoundingClientRect(); return Math.min(r.width, r.height) / (art.half * 2) * 0.96; };
    function draw() {
        if (!art || !open) return;
        const r = stage.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
        if (big.width !== Math.round(r.width * dpr) || big.height !== Math.round(r.height * dpr)) { big.width = Math.round(r.width * dpr); big.height = Math.round(r.height * dpr); }
        const g = big.getContext('2d'), W = r.width, Hh = r.height;
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!view.zoom) view.zoom = fitZoom();
        if (view.follow && lastPlayer) { view.cx = lastPlayer.pos.x; view.cz = lastPlayer.pos.z; }
        const z = view.zoom, half = art.half;
        const scr = (x, zz) => [W / 2 + (x - view.cx) * z, Hh / 2 + (zz - view.cz) * z];
        g.fillStyle = `rgb(${PARCH.join(',')})`; g.fillRect(0, 0, W, Hh);
        const [x0, y0] = scr(-half, -half);
        g.imageSmoothingEnabled = z < PX_PER_M * 1.5;
        g.drawImage(art.canvas, x0, y0, half * 2 * z, half * 2 * z);
        g.imageSmoothingEnabled = true;
        g.drawImage(fogImg, x0, y0, half * 2 * z, half * 2 * z);
        // an inked border round the charted land
        g.strokeStyle = 'rgba(58,42,24,0.5)'; g.lineWidth = 2; g.strokeRect(x0, y0, half * 2 * z, half * 2 * z);
        const iconPx = Math.max(6, Math.min(10, z * 1.6)), textPx = Math.max(12, Math.min(17, 10 + z * 1.2));
        const placed = [];   // labels already written, so names never pile up on each other
        for (const m of markers().sort((a, b) => (a.small ? 1 : 0) - (b.small ? 1 : 0))) {
            if (!m.always && !seenAt(m.x, m.z)) continue;
            const [sx, sy] = scr(m.x, m.z), ip = m.small ? iconPx * 0.7 : iconPx;
            icon(g, m.icon, sx, sy, ip);
            if (!m.label) continue;
            const ly = sy - ip - 5, tp = m.small ? textPx * 0.85 : textPx, w = m.name.length * tp * 0.5;
            if (placed.some(p => Math.abs(p.x - sx) < (p.w + w) / 2 && Math.abs(p.y - ly) < tp)) continue;
            placed.push({ x: sx, y: ly, w });
            label(g, m.name, sx, ly, tp);
        }
        for (const h of mapRef.hittables ?? []) {
            if (!h.alive || !seenAt(h.pos.x, h.pos.z)) continue;
            const [sx, sy] = scr(h.pos.x, h.pos.z);
            g.fillStyle = h.kind === 'deer' ? '#8a6a3a' : h.engaged ? '#d82a1a' : '#a8402a';
            g.beginPath(); g.arc(sx, sy, 3.2, 0, Math.PI * 2); g.fill();
        }
        const w = waypoint();
        if (w) { const [sx, sy] = scr(w.x, w.z); icon(g, 'pin', sx, sy - 6, 12); }
        if (lastPlayer) { const [px, py] = scr(lastPlayer.pos.x, lastPlayer.pos.z); arrow(g, px, py, facingAngle(lastPlayer.facing), 12); }
        compass(g, W - 52, Hh - 56, 34);
        scaleBar(g, 18, Hh - 22, z);
    }
    function compass(g, x, y, s) {
        g.save(); g.translate(x, y); g.globalAlpha = 0.85;
        g.strokeStyle = INK; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, s * 0.8, 0, Math.PI * 2); g.stroke();
        for (let i = 0; i < 4; i++) {
            g.rotate(Math.PI / 2);
            g.fillStyle = i === 3 ? '#b8301a' : INK;
            g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.18, 0); g.lineTo(-s * 0.18, 0); g.closePath(); g.fill();
        }
        g.globalAlpha = 1; g.restore();
        label(g, 'N', x, y - s - 6, 15);
    }
    function scaleBar(g, x, y, z) {
        const nice = [5, 10, 20, 25, 50, 100, 200].find(m => m * z > 60) ?? 200, w = nice * z;
        g.fillStyle = INK; g.fillRect(x, y, w, 3); g.fillRect(x, y - 5, 2, 8); g.fillRect(x + w - 2, y - 5, 2, 8);
        g.fillStyle = '#f1e4c8'; g.fillRect(x + w / 2, y, w / 2 - 2, 3);
        label(g, `${nice} m`, x + w / 2, y - 8, 13);
    }

    // ---- panning, zooming, waypoints ----
    const ptrs = new Map(); let pinch = null, moved = 0;
    stage.addEventListener('pointerdown', e => { try { stage.setPointerCapture(e.pointerId); } catch { /* synthetic */ } ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = 0; pinch = null; });
    stage.addEventListener('pointermove', e => {
        const p = ptrs.get(e.pointerId); if (!p) return;
        if (ptrs.size === 2) {
            const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
            p.x = e.clientX; p.y = e.clientY;
            const d2 = Math.hypot(...(([q, w]) => [q.x - w.x, q.y - w.y])([...ptrs.values()]));
            if (pinch) { view.zoom = Math.max(fitZoom() * 0.8, Math.min(fitZoom() * 12, view.zoom * d2 / pinch)); draw(); }
            pinch = d2; void d; moved += 10; return;
        }
        const dx = e.clientX - p.x, dy = e.clientY - p.y; moved += Math.abs(dx) + Math.abs(dy);
        p.x = e.clientX; p.y = e.clientY;
        if (moved > 6) { view.follow = false; view.cx -= dx / view.zoom; view.cz -= dy / view.zoom; draw(); }
    });
    stage.addEventListener('pointerup', e => {
        const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); pinch = null;
        if (!p || moved > 6 || !art) return;
        // A tap: the nearest mark within reach becomes the waypoint (tap the waypoint again to clear it).
        const r = stage.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        const wx = view.cx + (mx - r.width / 2) / view.zoom, wz = view.cz + (my - r.height / 2) / view.zoom;
        const w = waypoint();
        if (w && Math.hypot((w.x - wx) * view.zoom, (w.z - wz) * view.zoom) < 22) { setWaypoint(null); draw(); return; }
        let best = null, bd = 26;
        for (const m of markers()) { if (!m.always && !seenAt(m.x, m.z)) continue; const d = Math.hypot((m.x - wx) * view.zoom, (m.z - wz) * view.zoom); if (d < bd) { bd = d; best = m; } }
        setWaypoint(best ? { x: best.x, z: best.z, name: best.name } : { x: wx, z: wz, name: 'A marked spot' });
        hud.message(best ? `Waypoint: ${best.name}` : 'Waypoint set');
        draw();
    });
    stage.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); pinch = null; });
    stage.addEventListener('wheel', e => { e.preventDefault(); view.zoom = Math.max(fitZoom() * 0.8, Math.min(fitZoom() * 12, view.zoom * (e.deltaY > 0 ? 0.88 : 1.14))); draw(); }, { passive: false });

    function toggle() {
        if (!art) return hud.message('No map indoors');
        open = !open;
        overlay.classList.toggle('open', open);
        if (open) { if (!view.zoom && art) { view.follow = true; requestAnimationFrame(() => { view.zoom = fitZoom() * 2.6; draw(); }); } else requestAnimationFrame(draw); }
    }
    addEventListener('keydown', e => {
        if (e.code === 'KeyM') toggle();
        else if (open && e.code === 'Escape') toggle();
    });
    addEventListener('resize', () => { if (open) draw(); });
    return { setMap, update, toggle, get open() { return open; }, get waypoint() { return waypoint(); } };
}
