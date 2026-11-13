// World map and minimap. The map is painted once from the terrain (heights → water, sand, grass,
// rock, snow; trees; landmarks). Exploration uses amo's fog-of-war (fog.js: createFog, revealAround),
// with 0.5 m tiles (amo's 16 px) and a 3D-sized reveal radius; it is saved in stats.explored.
// Minimap: top-right circle, north up. World map: M / gamepad View-hold… / touch MAP, pauses the game.
import { fog as F } from '@rules';

const TILE = 0.5;             // metres per amo tile
const REVEAL_M = 34;          // you see far in 3D: reveal this many metres around you
const PX_PER_M = 2;           // map canvas resolution
const MINI_R = 40;            // metres shown around you on the minimap

const ICON = { tower: '♜', stones: '◈', water: '≈', fire: '✦', den: '⚠', gate: '⌂' };

export function createMapView({ stats, hud }) {
    const css = document.createElement('style');
    css.textContent = `
#minimap { position: fixed; right: 18px; top: 78px; width: 170px; height: 170px; border-radius: 50%; overflow: hidden; z-index: 4;
    border: 2px solid #f3d88b88; box-shadow: 0 0 0 3px #0008, 0 4px 14px #000a; pointer-events: none; }
#worldmap { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #05060ae0; font-family: Georgia, serif; color: #eee6d2; }
#worldmap.open { display: grid; }
#worldmap .frame { position: relative; padding: 14px; border: 1px solid #f3d88b66; border-radius: 12px; background: #16121bf0; }
#worldmap h2 { margin: 0 0 8px; font-weight: normal; letter-spacing: .14em; color: #f3d88b; font-size: 18px; }
#worldmap canvas { display: block; width: min(78vh, 86vw); height: min(78vh, 86vw); border-radius: 6px; }
#worldmap .hint { font-size: 12px; opacity: .6; margin-top: 6px; }
body.touch-mode #minimap { width: 120px; height: 120px; top: 70px; }
body.title-on #minimap { display: none; }`;
    document.head.append(css);
    const mini = document.createElement('canvas');
    mini.id = 'minimap'; mini.width = 340; mini.height = 340;
    document.body.append(mini);
    const overlay = document.createElement('div');
    overlay.id = 'worldmap';
    const frame = document.createElement('div'); frame.className = 'frame';
    const title = document.createElement('h2');
    const big = document.createElement('canvas'); big.width = 900; big.height = 900;
    const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = 'M or Esc to close';
    frame.append(title, big, hint);
    overlay.append(frame);
    overlay.addEventListener('pointerdown', () => toggle());
    document.body.append(overlay);

    let art = null, fog = null, mapRef = null, mapId = null, open = false;

    function paint(map) {
        const info = map.mapInfo, half = info.half, size = half * 2 * PX_PER_M;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const g = c.getContext('2d');
        const img = g.createImageData(size, size);
        for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
            const x = px / PX_PER_M - half, z = py / PX_PER_M - half, h = map.heightAt(x, z);
            let col;
            if (h < info.water - 0.6) col = [38, 78, 104];
            else if (h < info.water) col = [64, 112, 128];
            else if (h < info.water + 0.35) col = [176, 156, 110];
            else if (h > 17) col = [226, 232, 236];
            else if (h > 6) col = [118, 112, 104];
            else { const k = Math.max(0, Math.min(1, (h + 1) / 7)); col = [70 + 40 * k, 112 + 30 * k, 52 + 20 * k]; }
            const shade = 0.85 + 0.15 * Math.max(-1, Math.min(1, (map.heightAt(x - 1, z - 1) - h) * 0.6));
            const i = (py * size + px) * 4;
            img.data[i] = col[0] * shade; img.data[i + 1] = col[1] * shade; img.data[i + 2] = col[2] * shade; img.data[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        for (const [x, z, pine] of info.trees) {
            g.fillStyle = pine ? '#1f4a2c' : '#3f6a2c';
            g.beginPath(); g.arc((x + half) * PX_PER_M, (z + half) * PX_PER_M, pine ? 2 : 2.6, 0, Math.PI * 2); g.fill();
        }
        return { canvas: c, half, size };
    }

    // amo fog in tiles; the world centre is (0, 0), so tiles are offset by `half`.
    function fogFor(map, id) {
        const tiles = (map.mapInfo.half * 2) / TILE;
        stats.explored ??= {};
        return F.decodeFog(stats.explored[id], tiles, tiles);
    }

    function setMap(map, id) {
        mapRef = map; mapId = id;
        mini.style.display = map.mapInfo ? '' : 'none';
        if (!map.mapInfo) { art = null; fog = null; return; }
        if (!art || art.map !== map) art = { ...paint(map), map };
        fog = fogFor(map, id);
        refreshFog();
        title.textContent = map.name;
    }

    const toPx = (v, half) => (v + half) * PX_PER_M;
    // The fog as one small image (a pixel per fog cell), redrawn when cells are revealed and scaled
    // up with smoothing — soft edges, no seams.
    let fogImg = null;
    function refreshFog() {
        fogImg ??= document.createElement('canvas');
        fogImg.width = fog.cw; fogImg.height = fog.ch;
        const g = fogImg.getContext('2d'), img = g.createImageData(fog.cw, fog.ch);
        for (let z = 0; z < fog.ch; z++) for (let x = 0; x < fog.cw; x++) {
            const i = (z * fog.cw + x) * 4;
            img.data[i] = 8; img.data[i + 1] = 8; img.data[i + 2] = 14;
            img.data[i + 3] = F.isCellExplored(fog, x, z) ? 0 : 214;
        }
        g.putImageData(img, 0, 0);
    }
    function drawFog(g, x0, z0, x1, z1, scale, ox, oz) {
        const cellM = F.FOG_CELL * TILE, half = art.half;
        g.imageSmoothingEnabled = true;
        g.drawImage(fogImg, (x0 + half) / cellM, (z0 + half) / cellM, (x1 - x0) / cellM, (z1 - z0) / cellM,
            (x0 - ox) * scale, (z0 - oz) * scale, (x1 - x0) * scale, (z1 - z0) * scale);
    }
    function arrow(g, x, y, facing, size, color) {
        g.save(); g.translate(x, y); g.rotate(-facing + Math.PI);
        g.fillStyle = color; g.strokeStyle = '#000'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.7, size * 0.8); g.lineTo(0, size * 0.4); g.lineTo(-size * 0.7, size * 0.8); g.closePath();
        g.stroke(); g.fill(); g.restore();
    }
    function dots(g, toScreen, extra) {
        for (const h of mapRef.hittables ?? []) {
            if (!h.alive) continue;
            const cellM = F.FOG_CELL * TILE;   // nothing shows through the fog
            if (!F.isCellExplored(fog, Math.floor((h.pos.x + art.half) / cellM), Math.floor((h.pos.z + art.half) / cellM))) continue;
            const [sx, sy] = toScreen(h.pos.x, h.pos.z);
            g.fillStyle = h.kind === 'deer' ? '#c8a070' : h.engaged ? '#ff4a3a' : '#c0504a';
            g.beginPath(); g.arc(sx, sy, h.kind === 'deer' ? 3.5 : 4.5, 0, Math.PI * 2); g.fill();
        }
        extra?.();
    }

    function update(player, camYaw) {
        if (!fog || !art) return;
        const tiles = (x) => (x + art.half) / TILE;
        if (F.revealAround(fog, tiles(player.pos.x), tiles(player.pos.z), REVEAL_M / TILE).length) { stats.explored[mapId] = F.encodeFog(fog); refreshFog(); }

        // Minimap: MINI_R metres around the player, north up.
        const g = mini.getContext('2d'), S = mini.width, scale = S / (MINI_R * 2);
        const ox = player.pos.x - MINI_R, oz = player.pos.z - MINI_R;
        g.fillStyle = '#0a0a10'; g.fillRect(0, 0, S, S);
        g.drawImage(art.canvas, toPx(ox, art.half), toPx(oz, art.half), MINI_R * 2 * PX_PER_M, MINI_R * 2 * PX_PER_M, 0, 0, S, S);
        drawFog(g, ox, oz, ox + MINI_R * 2, oz + MINI_R * 2, scale, ox, oz);
        const scr = (x, z) => [(x - ox) * scale, (z - oz) * scale];
        dots(g, scr);
        // view cone
        const c = S / 2;
        g.fillStyle = 'rgba(243,216,139,0.16)';
        g.beginPath(); g.moveTo(c, c);
        const look = Math.atan2(-Math.cos(camYaw), -Math.sin(camYaw));   // the camera's forward, on the north-up map
        g.arc(c, c, S * 0.35, look - 0.5, look + 0.5);
        g.closePath(); g.fill();
        arrow(g, c, c, player.facing, 12, '#f3d88b');
        if (open) drawBig(player);
    }

    function drawBig(player) {
        const g = big.getContext('2d'), S = big.width, half = art.half, scale = S / (half * 2);
        g.drawImage(art.canvas, 0, 0, S, S);
        drawFog(g, -half, -half, half, half, scale, -half, -half);
        const scr = (x, z) => [(x + half) * scale, (z + half) * scale];
        dots(g, scr);
        g.font = '15px Georgia'; g.textAlign = 'center';
        for (const l of mapRef.mapInfo.landmarks) {
            const cx = Math.floor((l.x + half) / (F.FOG_CELL * TILE)), cz = Math.floor((l.z + half) / (F.FOG_CELL * TILE));
            if (!F.isCellExplored(fog, cx, cz)) continue;
            const [sx, sy] = scr(l.x, l.z);
            g.fillStyle = '#000a'; g.fillText(`${ICON[l.icon] ?? '•'} ${l.name}`, sx + 1, sy + 1);
            g.fillStyle = '#f3e2b0'; g.fillText(`${ICON[l.icon] ?? '•'} ${l.name}`, sx, sy);
        }
        const [px, py] = scr(player.pos.x, player.pos.z);
        arrow(g, px, py, player.facing, 13, '#f3d88b');
    }

    function toggle() {
        if (!art) return hud.message('No map indoors');
        open = !open;
        overlay.classList.toggle('open', open);
    }
    addEventListener('keydown', e => {
        if (e.code === 'KeyM') toggle();
        else if (open && e.code === 'Escape') toggle();
    });
    return { setMap, update, toggle, get open() { return open; } };
}
