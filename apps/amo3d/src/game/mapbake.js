// The world map, pre-rendered (user, 2026-11-21: "static zoom levels, pre-generated — it does not have to render
// in-game"). Run by tools/bake_map.mjs in the dev server's page: paints a world map's land at 1 px a metre in 512 m
// tiles (relief shading, shorelines, roads, biome washes, a contour every 10 m), shrinks them into the ½ and ⅛ px/m
// levels, and posts every tile to /api/mapbake → public/map/<id>/. The game's map view then only draws these images.
// Rebake after any change to the land: `npm run bake-map` (dev server up).
// Memory: the ½ px/m level is built a 1024 m block at a time (four fine tiles shrunk into one 512 px tile), never as one
// huge canvas; only the ⅛ level (1.4k px) is kept whole.
const PARCH = [232, 214, 170];
const TM = 512;   // metres (and pixels) per tile at the finest level

export async function bakeWorldMap(map, id = map.id, log = () => {}, { limit = Infinity } = {}) {
    const info = map.mapInfo, half = info.half, N = Math.ceil(half * 2 / TM), N1 = Math.ceil(N / 2), SPAN = N * TM, x00 = -half, z00 = -half;
    const post = (file, body) => fetch(`/api/mapbake?file=${id}/${file}`, { method: 'POST', body }).then(r => { if (!r.ok) throw new Error(`post ${file}: ${r.status}`); });
    const L1 = document.createElement('canvas'); L1.width = L1.height = TM;
    const L0 = document.createElement('canvas'); L0.width = L0.height = SPAN / 8;
    const g1 = L1.getContext('2d'), g0 = L0.getContext('2d'); g1.imageSmoothingQuality = g0.imageSmoothingQuality = 'high';
    const tile = document.createElement('canvas'); tile.width = tile.height = TM;
    const gt = tile.getContext('2d'), img = gt.createImageData(TM, TM);
    const S = 2, G = TM / S + 1, H = new Float32Array(G * G), R = new Uint8Array(G * G), BG = 8, GB = TM / BG + 1, B = new Float32Array(GB * GB * 3), Bf = new Float32Array(GB * GB);
    const SNOW = info.snowH ?? 62, ROCK = info.rockH ?? 40, wl = info.water;
    const t0 = performance.now();
    let done = 0;

    function paintTile(ti, tj) {
        const X0 = x00 + ti * TM, Z0 = z00 + tj * TM;
        for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {   // heights and roads every 2 m
            const x = X0 + i * S, z = Z0 + j * S;
            H[j * G + i] = map.heightAt(x, z);
            R[j * G + i] = info.groundAt?.(x, z) === 'road' ? 1 : 0;
        }
        if (info.biomeAt) for (let j = 0; j < GB; j++) for (let i = 0; i < GB; i++) {   // the biome's wash every 8 m
            const b = info.biomeAt(X0 + i * BG, Z0 + j * BG), o = (j * GB + i) * 3;
            B[o] = b.gA.r * 255; B[o + 1] = b.gA.g * 255; B[o + 2] = b.gA.b * 255; Bf[j * GB + i] = 0.38 * Math.min(1, b.strength * 1.4 + 0.3);
        }
        const hAt = (px, pz) => {   // bilinear, in pixels within the tile
            const fx = Math.max(0, px / S), fz = Math.max(0, pz / S), i = Math.min(G - 2, Math.floor(fx)), j = Math.min(G - 2, Math.floor(fz)), u = fx - i, v = fz - j;
            return (H[j * G + i] * (1 - u) + H[j * G + i + 1] * u) * (1 - v) + (H[(j + 1) * G + i] * (1 - u) + H[(j + 1) * G + i + 1] * u) * v;
        };
        let seed = 7 + ti * 131 + tj * 977; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let pz = 0; pz < TM; pz++) for (let px = 0; px < TM; px++) {
            const v = hAt(px + 0.5, pz + 0.5), vx = hAt(px + 1.5, pz + 0.5), vz = hAt(px + 0.5, pz + 1.5), vw = hAt(px - 0.5, pz + 0.5), vn = hAt(px + 0.5, pz - 0.5);
            const dx = vx - v, dz = vz - v, slope = Math.hypot(dx, dz);
            const road = R[Math.round(pz / S) * G + Math.round(px / S)];
            let col = road ? [196, 172, 128] : v < wl - 0.6 ? [120, 158, 176] : v < wl ? [150, 184, 190] : v < wl + 0.4 ? [222, 200, 150]
                : v > SNOW ? [240, 236, 226] : slope > 1.2 || v > ROCK ? [168, 152, 126] : [PARCH[0] * 0.8 + 24, PARCH[1] * 0.8 + 30, PARCH[2] * 0.8 + 16];
            if (info.biomeAt && !road && v >= wl + 0.4 && v <= SNOW) {   // the land washed with its biome's greens
                const fx = px / BG, fz = pz / BG, i = Math.min(GB - 2, Math.floor(fx)), j = Math.min(GB - 2, Math.floor(fz)), u = fx - i, w = fz - j;
                const mix = c => (B[(j * GB + i) * 3 + c] * (1 - u) + B[(j * GB + i + 1) * 3 + c] * u) * (1 - w) + (B[((j + 1) * GB + i) * 3 + c] * (1 - u) + B[((j + 1) * GB + i + 1) * 3 + c] * u) * w;
                const f = (Bf[j * GB + i] * (1 - u) + Bf[j * GB + i + 1] * u) * (1 - w) + (Bf[(j + 1) * GB + i] * (1 - u) + Bf[(j + 1) * GB + i + 1] * u) * w;
                col = [col[0] * (1 - f) + mix(0) * f, col[1] * (1 - f) + mix(1) * f, col[2] * (1 - f) + mix(2) * f];
            }
            const shade = 0.88 + 0.14 * Math.max(-1, Math.min(1, -(dx + dz) * 0.6));   // light from the north-west
            let ink = v >= wl && (vx < wl || vz < wl || vw < wl || vn < wl) ? 0.75 : 0;   // the shoreline
            if (v > wl && (Math.floor(v / 10) !== Math.floor(vx / 10) || Math.floor(v / 10) !== Math.floor(vz / 10))) ink = Math.max(ink, 0.2);   // a contour every 10 m
            const noise = (rnd() - 0.5) * 8, o = (pz * TM + px) * 4;
            for (let c = 0; c < 3; c++) img.data[o + c] = Math.max(0, Math.min(255, col[c] * shade + noise)) * (1 - ink) + [58, 42, 24][c] * ink;
            img.data[o + 3] = 255;
        }
        gt.putImageData(img, 0, 0);
    }

    for (let bj = 0; bj < N1; bj++) for (let bi = 0; bi < N1; bi++) {   // a 1024 m block: its four fine tiles, then its ½ px/m tile
        if (done >= limit) break;
        g1.fillStyle = `rgb(${PARCH.join(',')})`; g1.fillRect(0, 0, TM, TM);
        for (let q = 0; q < 4; q++) {
            const ti = bi * 2 + (q & 1), tj = bj * 2 + (q >> 1);
            if (ti >= N || tj >= N) continue;
            paintTile(ti, tj);
            await post(`2/${ti}_${tj}.webp`, tile.toDataURL('image/webp', 0.8));
            g1.drawImage(tile, (q & 1) * TM / 2, (q >> 1) * TM / 2, TM / 2, TM / 2);
            g0.drawImage(tile, ti * TM / 8, tj * TM / 8, TM / 8, TM / 8);
            if (++done % 20 === 0 || limit < 20) log(`${done}/${N * N} tiles, ${Math.round((performance.now() - t0) / 1000)} s`);
        }
        await post(`1/${bi}_${bj}.webp`, L1.toDataURL('image/webp', 0.8));
    }
    if (limit < Infinity) return null;
    await post('0.webp', L0.toDataURL('image/webp', 0.85));   // ⅛ px/m: one image of the whole world
    const manifest = { id, x0: x00, z0: z00, span: SPAN, levels: [{ ppm: 0.125, tile: SPAN, n: 1 }, { ppm: 0.5, tile: 2 * TM, n: N1 }, { ppm: 1, tile: TM, n: N }], baked: new Date().toISOString() };
    await post('manifest.json', JSON.stringify(manifest));
    log(`done: ${N * N} + ${N1 * N1} + 1 tiles in ${Math.round((performance.now() - t0) / 1000)} s`);
    return manifest;
}
