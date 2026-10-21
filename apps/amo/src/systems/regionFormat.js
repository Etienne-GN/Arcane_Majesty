// Region format 1 (W2): a big map stored compactly — base64 tile grid, a hop
// bitset, decoration tuples — decoded once at import into an ordinary map
// definition, so getMap() and everything that reads maps keep working.
// Written by tools/maps/region_writer.py. Pure — tools/test_region.mjs.

const toB64   = bytes => { let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s); };
const fromB64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

export function encodeGrid(rows) {
    const w = rows[0].length, out = new Uint8Array(w * rows.length);
    rows.forEach((r, y) => r.forEach((v, x) => { out[y * w + x] = v; }));
    return toB64(out);
}

export function decodeGrid(b64, w, h) {
    const bytes = fromB64(b64);
    return Array.from({ length: h }, (_, y) => Array.from(bytes.subarray(y * w, y * w + w)));
}

// Bit i = y * w + x, least significant bit first.
export function encodeBits(cells, w, h) {
    const out = new Uint8Array(Math.ceil(w * h / 8));
    for (const [x, y] of cells) { const i = y * w + x; out[i >> 3] |= 1 << (i & 7); }
    return toB64(out);
}

export function decodeBitsToCells(b64, w, h) {
    const bytes = fromB64(b64), cells = [];
    for (let i = 0; i < w * h; i++) if (bytes[i >> 3] & (1 << (i & 7))) cells.push([i % w, Math.floor(i / w)]);
    return cells;
}

// A bitset as one byte per cell (0/1), row-major — for per-tile layers read often (dense, chart).
export function decodeBitsToMask(b64, w, h) {
    const bytes = fromB64(b64), out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) if (bytes[i >> 3] & (1 << (i & 7))) out[i] = 1;
    return out;
}

export function decodeRegion(raw) {
    if (raw.format !== 1) throw new Error(`region ${raw.id}: unknown format ${raw.format}`);
    const { format, width, height, tiles, hop, sheets, names, deco, ...rest } = raw;
    const groups = sheets.map(s => ({ texKey: s.texKey, catKey: s.catKey, scale: s.scale ?? 1, items: [] }));
    for (const [si, ni, x, y, flags, depthOffset] of deco) {
        const it = { name: names[ni], x, y };
        if (flags & 1) it.blocking = true;
        if (flags & 2) it.blocking = false;
        if (flags & 4) it.hoppable = true;
        if (flags & 8) it.hoppable = false;
        if (depthOffset) it.depthOffset = depthOffset;
        groups[si].items.push(it);
    }
    const extraSheets = [];
    for (const s of sheets) {
        if (!extraSheets.some(e => e.texKey === s.texKey)) extraSheets.push({ texKey: s.texKey, catKey: s.catKey, png: s.png, cat: s.cat });
    }
    return {
        ...rest,
        region: true,
        tiles: decodeGrid(tiles, width, height),
        extraSheets,
        sheetDecorations: groups.filter(g => g.items.length),
        hopCells: [...(rest.hopCells ?? []), ...(hop ? decodeBitsToCells(hop, width, height) : [])],
    };
}
