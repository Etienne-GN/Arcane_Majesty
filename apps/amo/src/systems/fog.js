// W5 fog of war: per map, one bit per 4×4-tile cell; a revealed cell stays revealed.
// Interiors and maps without a tile grid have no fog (null = everything known).
// Pure — tools/test_fog_map.mjs.

export const FOG_CELL = 4;              // tiles per fog cell, each way
export const REVEAL_RADIUS = 6;         // tiles around the player
export const DENSE_REVEAL_RADIUS = 4;   // inside dense forest

const toB64 = bytes => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };

export function createFog(widthTiles, heightTiles) {
    const cw = Math.ceil(widthTiles / FOG_CELL), ch = Math.ceil(heightTiles / FOG_CELL);
    return { cw, ch, bits: new Uint8Array(Math.ceil(cw * ch / 8)) };
}

export function isCellExplored(fog, cx, cy) {
    if (fog === null) return true;
    if (cx < 0 || cy < 0 || cx >= fog.cw || cy >= fog.ch) return false;
    const i = cy * fog.cw + cx;
    return (fog.bits[i >> 3] & (1 << (i & 7))) !== 0;
}

export const isExplored = (fog, tx, ty) => isCellExplored(fog, Math.floor(tx / FOG_CELL), Math.floor(ty / FOG_CELL));

// Reveals every cell whose nearest point lies within `radius` tiles of (tx, ty)
// (tile units, fractions allowed). Returns the newly revealed cells as [cx, cy], row by row.
export function revealAround(fog, tx, ty, radius) {
    if (fog === null) return [];
    const out = [], r2 = radius * radius;
    const cx0 = Math.max(0, Math.floor((tx - radius) / FOG_CELL)), cx1 = Math.min(fog.cw - 1, Math.floor((tx + radius) / FOG_CELL));
    const cy0 = Math.max(0, Math.floor((ty - radius) / FOG_CELL)), cy1 = Math.min(fog.ch - 1, Math.floor((ty + radius) / FOG_CELL));
    for (let cy = cy0; cy <= cy1; cy++) {
        for (let cx = cx0; cx <= cx1; cx++) {
            const dx = Math.max(cx * FOG_CELL - tx, 0, tx - (cx + 1) * FOG_CELL);
            const dy = Math.max(cy * FOG_CELL - ty, 0, ty - (cy + 1) * FOG_CELL);
            if (dx * dx + dy * dy > r2 || isCellExplored(fog, cx, cy)) continue;
            const i = cy * fog.cw + cx;
            fog.bits[i >> 3] |= 1 << (i & 7);
            out.push([cx, cy]);
        }
    }
    return out;
}

export const encodeFog = fog => toB64(fog.bits);

// Blank fog when the string is missing, damaged, or was saved for another map size.
export function decodeFog(b64, widthTiles, heightTiles) {
    const fog = createFog(widthTiles, heightTiles);
    if (typeof b64 !== 'string') return fog;
    try {
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        if (bytes.length === fog.bits.length) fog.bits.set(bytes);
    } catch { /* not base64: blank */ }
    return fog;
}

// This map's fog from the save, or null where there is none (interiors, Tiled maps).
export function fogFor(def, mapId, stats) {
    if (def.interior || !def.tiles?.length) return null;
    return decodeFog(stats.explored?.[mapId], def.tiles[0].length, def.tiles.length);
}

// Landmarks entered for the first time: within `radius` (default 3) tiles of the landmark tile's centre.
export function newlyDiscovered(landmarks, tx, ty, discovered = {}) {
    return landmarks.filter(l => !discovered[l.id] && Math.hypot(l.x + 0.5 - tx, l.y + 0.5 - ty) <= (l.radius ?? 3));
}
