// W5: the World tab — the places you have visited, joined by the exits you know,
// laid out on the lore map. Pure — tools/test_fog_map.mjs.

// Lore DB Location coordinates (Location.x / .y), read from the graph on 2026-10-19.
// Only maps that are a DB Location appear; the rest are placed beside a neighbour.
export const WORLD_ANCHORS = {
    thaloria:           { x: 1100, y: 200, lore: 'Thaloria' },
    eldrin_tower:       { x: 1200, y: 300, lore: "Eldrin's Tower" },
    summit_of_despair:  { x: 1400, y: 200, lore: 'Summit of Despair' },
    sylvan_sanctuary:   { x: 1300, y: 120, lore: 'Sylvan Sanctuary' },
    heartstone_chamber: { x: 800,  y: 350, lore: 'Heartstone Chamber' },
};

export const STEP = 90;   // lore px between a map and a neighbour placed beside it

const real = (getMap, id) => { const d = getMap(id); return d && d.id === id ? d : null; };

// Unit vector from the map's centre toward this exit (straight down if it sits at the centre).
export function exitDirection(portal, def) {
    const w = def.tiles?.[0]?.length ?? def.mapCols ?? 1, h = def.tiles?.length ?? def.mapRows ?? 1;
    const dx = portal.x - w / 2, dy = portal.y - h / 2, len = Math.hypot(dx, dy);
    return len < 1e-6 ? { dx: 0, dy: 1 } : { dx: dx / len, dy: dy / len };
}

export function layoutWorld(visitedIds, getMap, { knownExit = () => true } = {}) {
    const ids = [...new Set(visitedIds)].filter(id => { const d = real(getMap, id); return d && !d.interior; }).sort();
    const visited = new Set(ids);
    const pos = new Map();
    for (const id of ids) if (WORLD_ANCHORS[id]) pos.set(id, { x: WORLD_ANCHORS[id].x, y: WORLD_ANCHORS[id].y, anchored: true });

    const portalsOf = id => (real(getMap, id)?.portals ?? []).filter(p => p.targetMap !== '__return');
    const free = (x, y) => [...pos.values()].every(p => Math.hypot(p.x - x, p.y - y) >= STEP / 2);
    const placeNear = (from, dir) => {
        for (let ring = 1; ring <= 3; ring++) {
            for (let k = 0; k < 12; k++) {
                const turn = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * (Math.PI / 6);
                const c = Math.cos(turn), s = Math.sin(turn);
                const x = from.x + (dir.dx * c - dir.dy * s) * STEP * ring, y = from.y + (dir.dx * s + dir.dy * c) * STEP * ring;
                if (free(x, y)) return { x: Math.round(x), y: Math.round(y) };
            }
        }
        return { x: Math.round(from.x + dir.dx * STEP * 4), y: Math.round(from.y + dir.dy * STEP * 4) };
    };

    // Grow outward from placed maps, one neighbour at a time, in a fixed order.
    for (let changed = true; changed;) {
        changed = false;
        for (const id of ids) {
            if (pos.has(id)) continue;
            let spot = null;
            for (const other of ids) {
                if (!pos.has(other)) continue;
                const out = portalsOf(other).find(p => p.targetMap === id);
                const back = portalsOf(id).find(p => p.targetMap === other);
                if (!out && !back) continue;
                const d = out ? exitDirection(out, getMap(other)) : (({ dx, dy }) => ({ dx: -dx, dy: -dy }))(exitDirection(back, getMap(id)));
                spot = placeNear(pos.get(other), d);
                break;
            }
            if (spot) { pos.set(id, { ...spot, anchored: false }); changed = true; }
        }
    }
    // Maps joined to nothing placed: a row under everything else
    const bottom = Math.max(0, ...[...pos.values()].map(p => p.y)) + STEP * 1.5;
    let col = 0;
    for (const id of ids) {
        if (pos.has(id)) continue;
        let x = 200 + col * STEP;
        while (!free(x, bottom)) x += STEP;
        pos.set(id, { x, y: bottom, anchored: false });
        col = Math.round((x - 200) / STEP) + 1;
    }

    const nodes = ids.map(id => ({ id, name: getMap(id).displayName ?? id, ...pos.get(id) }));
    const edges = [], seenEdge = new Set(), stubs = [];
    for (const id of ids) {
        for (const p of portalsOf(id)) {
            if (visited.has(p.targetMap)) {
                const e = [id, p.targetMap].sort(), k = e.join('|');
                if (p.targetMap !== id && !seenEdge.has(k)) { seenEdge.add(k); edges.push(e); }
            } else if (real(getMap, p.targetMap) && !getMap(p.targetMap).interior && knownExit(id, p)) {
                const d = exitDirection(p, getMap(id)), from = pos.get(id);
                stubs.push({ from: id, targetMap: p.targetMap, x: Math.round(from.x + d.dx * STEP * 0.6), y: Math.round(from.y + d.dy * STEP * 0.6) });
            }
        }
    }
    edges.sort((a, b) => a.join('|').localeCompare(b.join('|')));
    return { nodes, edges, stubs };
}
