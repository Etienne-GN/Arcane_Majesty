// Seam scan (paste into the page / run via headless): for every place set into the open world, walk its edge and
// measure the ground's jump across it (0.5 m inside vs 0.5 m outside) and the steepest step in the first 12 m out.
(async () => {
    const P = window.__poc, M = P.map, { edgeDist } = await import('/src/engine/stream.js');
    const out = [];
    for (const st of M.stamps) {
        let worst = { jump: 0 }, steep = { g: 0 }, n = 0;
        for (let a = 0; a < Math.PI * 2; a += 0.01) {
            const dx = Math.cos(a), dz = Math.sin(a);
            let lo = 0, hi = Math.max(st.ha, st.hb) * 2;   // the edge along this ray (edgeDist = 0)
            for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (edgeDist(st, st.cx + dx * m, st.cz + dz * m) > 0) hi = m; else lo = m; }
            const e = (lo + hi) / 2, at = r => M.heightAt(st.cx + dx * (e + r), st.cz + dz * (e + r));
            const jump = Math.abs(at(0.5) - at(-0.5)); n++;
            if (jump > worst.jump) worst = { jump: +jump.toFixed(1), x: Math.round(st.cx + dx * e), z: Math.round(st.cz + dz * e) };
            for (let r = 0; r < 12; r += 1) { const g = Math.abs(at(r + 1) - at(r)); if (g > steep.g) steep = { g: +g.toFixed(1), x: Math.round(st.cx + dx * (e + r)), z: Math.round(st.cz + dz * (e + r)) }; }
        }
        out.push(`${st.id}: jump ${worst.jump} m @${worst.x},${worst.z} · steepest 1 m step ${steep.g} m @${steep.x},${steep.z}`);
    }
    return out.join('\n');
})()
