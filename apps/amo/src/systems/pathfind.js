// W4: routes for townsfolk — A* on a map's walk grid (8 directions, no corner
// cutting, roads cheaper than open ground) and routes across doors between a
// town and the interiors behind them, cached. Tile coordinates in, pixels for
// positions along a path. Pure — tools/test_townsfolk.mjs.
import { decodeBitsToMask } from './regionFormat.js';
import { doorReturnPoint } from './interiors.js';

const TILE = 32;
export const ROAD_COST = 1, GROUND_COST = 1.6;   // tiles 2 (road) and 3 (street) vs the rest
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROUTE_CACHE_MAX = 5000;

// 1 = walkable: not a tree/wall (1) or void (4), and not blocked by the baked grid.
export function walkMask(def, blockedB64 = null) {
    const w = def.tiles[0].length, h = def.tiles.length;
    const blocked = blockedB64 ? decodeBitsToMask(blockedB64, w, h) : null;
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const t = def.tiles[y][x], i = y * w + x;
        out[i] = t !== 1 && t !== 4 && !(blocked && blocked[i]) ? 1 : 0;
    }
    return out;
}

export function findPath(mask, w, h, [ax, ay], [bx, by], costAt = () => 1) {
    const ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
    if (!ok(ax, ay) || !ok(bx, by)) return null;
    const start = ay * w + ax, goal = by * w + bx;
    if (start === goal) return [[ax, ay]];
    const g = new Float64Array(w * h).fill(Infinity), from = new Int32Array(w * h).fill(-1), closed = new Uint8Array(w * h);
    const heap = [];
    const push = (f, i) => {
        heap.push([f, i]);
        for (let c = heap.length - 1; c > 0;) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
    };
    const pop = () => {
        const top = heap[0], last = heap.pop();
        if (heap.length) {
            heap[0] = last;
            for (let p = 0; ;) {
                const l = 2 * p + 1, r = l + 1; let m = p;
                if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
                if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
                if (m === p) break;
                [heap[p], heap[m]] = [heap[m], heap[p]]; p = m;
            }
        }
        return top;
    };
    // Octile distance: admissible while every step costs at least 1.
    const hOf = i => { const dx = Math.abs(i % w - bx), dy = Math.abs(((i / w) | 0) - by); return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy); };
    g[start] = 0; push(hOf(start), start);
    while (heap.length) {
        const [, i] = pop();
        if (i === goal) break;
        if (closed[i]) continue;
        closed[i] = 1;
        const x = i % w, y = (i / w) | 0;
        for (const [dx, dy] of DIRS8) {
            const nx = x + dx, ny = y + dy;
            if (!ok(nx, ny) || (dx && dy && (!ok(x + dx, y) || !ok(x, y + dy)))) continue;
            const j = ny * w + nx, step = (dx && dy ? Math.SQRT2 : 1) * costAt(nx, ny);
            if (g[i] + step < g[j]) { g[j] = g[i] + step; from[j] = i; push(g[j] + hOf(j), j); }
        }
    }
    if (from[goal] < 0) return null;
    const out = [];
    for (let i = goal; i !== -1; i = from[i]) out.push([i % w, (i / w) | 0]);
    return out.reverse();
}

export const pathPx = path => path.reduce((a, [x, y], i) => (i ? a + Math.hypot(x - path[i - 1][0], y - path[i - 1][1]) * TILE : 0), 0);

const facingOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'up' : 'down'));
const centre = ([x, y]) => [x * TILE + TILE / 2, y * TILE + TILE / 2];

export function pointAlong(path, d) {
    let rest = Math.max(0, d), facing = 'down';
    for (let i = 1; i < path.length; i++) {
        const [ax, ay] = centre(path[i - 1]), [bx, by] = centre(path[i]), seg = Math.hypot(bx - ax, by - ay);
        facing = facingOf(bx - ax, by - ay);
        if (rest <= seg) { const f = seg ? rest / seg : 0; return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, facing }; }
        rest -= seg;
    }
    const [x, y] = centre(path[path.length - 1]);
    return { x, y, facing };
}

export function pointOnRoute(route, d) {
    let rest = Math.max(0, d);
    for (let i = 0; i < route.legs.length; i++) {
        const leg = route.legs[i];
        if (rest <= leg.len || i === route.legs.length - 1) return { mapId: leg.mapId, ...pointAlong(leg.path, rest) };
        rest -= leg.len;
    }
    return null;
}

// The town and every interior behind its doors (and theirs), root first.
export function mapTree(rootId, getMap) {
    const out = [{ id: rootId, parent: null, door: null }], seen = new Set([rootId]);
    for (let k = 0; k < out.length; k++) {
        for (const door of getMap(out[k].id)?.spawns?.doors ?? []) {
            const id = door.interior;
            if (seen.has(id) || getMap(id)?.id !== id) continue;
            seen.add(id);
            out.push({ id, parent: out[k].id, door });
        }
    }
    return out;
}

export function createNav({ root, getMap, walk = {} }) {
    const nodes = new Map();
    for (const { id, parent, door } of mapTree(root, getMap)) {
        const def = getMap(id), w = def.tiles[0].length, h = def.tiles.length;
        nodes.set(id, { id, def, w, h, mask: walkMask(def, walk[id]), parent, door });
    }
    const walkable = (n, x, y) => x >= 0 && y >= 0 && x < n.w && y < n.h && n.mask[y * n.w + x] === 1;
    const snapIn = (n, x, y) => {
        if (walkable(n, x, y)) return [x, y];
        for (let r = 1; r <= 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) === r && walkable(n, x + dx, y + dy)) return [x + dx, y + dy];
        }
        return [x, y];
    };
    // Where a child map is entered (in the child) and the tile in front of its door (in the parent).
    for (const n of nodes.values()) {
        n.entry = snapIn(n, n.def.playerStart?.x ?? 1, n.def.playerStart?.y ?? 1);
        if (!n.parent) continue;
        const p = nodes.get(n.parent), rp = doorReturnPoint(n.door, TILE);
        const back = { up: [0, 1], down: [0, -1], left: [1, 0], right: [-1, 0] }[n.door.facing ?? 'up'];
        let x = Math.floor(rp.x / TILE), y = Math.floor(rp.y / TILE);
        for (let k = 0; k < 3 && !walkable(p, x, y); k++) { x += back[0]; y += back[1]; }
        n.front = walkable(p, x, y) ? [x, y] : snapIn(p, Math.floor(rp.x / TILE), Math.floor(rp.y / TILE));
    }
    const chain = id => { const out = []; for (let n = nodes.get(id); n; n = nodes.get(n.parent)) out.push(n.id); return out; };
    const paths = new Map(), routes = new Map();

    const nav = {
        root,
        has: id => nodes.has(id),
        isWalkable: (id, x, y) => { const n = nodes.get(id); return !!n && walkable(n, x, y); },
        snap: (id, x, y) => snapIn(nodes.get(id), x, y),
        path(id, a, b) {
            const key = `${id}|${a}|${b}`;
            let hit = paths.get(key);
            if (!hit) {
                const n = nodes.get(id);
                const cost = (x, y) => { const t = n.def.tiles[y][x]; return t === 2 || t === 3 ? ROAD_COST : GROUND_COST; };
                const found = findPath(n.mask, n.w, n.h, a, b, cost);
                const path = found ?? [a, b];
                hit = { path, len: pathPx(path), fallback: !found };
                paths.set(key, hit);
            }
            return hit;
        },
        route(from, to) {
            if (!nodes.has(from.mapId) || !nodes.has(to.mapId)) return null;
            const key = `${from.mapId}:${from.x},${from.y}>${to.mapId}:${to.x},${to.y}`;
            if (routes.has(key)) return routes.get(key);
            const up = chain(from.mapId), downChain = chain(to.mapId);
            const common = up.find(m => downChain.includes(m));
            const legs = [];
            let m = from.mapId, cur = snapIn(nodes.get(m), from.x, from.y);
            const leg = (mapId, a, b) => { const p = nav.path(mapId, a, b); legs.push({ mapId, path: p.path, len: p.len, fallback: p.fallback }); };
            while (m !== common) { const n = nodes.get(m); leg(m, cur, n.entry); cur = n.front; m = n.parent; }
            for (const c of downChain.slice(0, downChain.indexOf(common)).reverse()) { const n = nodes.get(c); leg(m, cur, n.front); cur = n.entry; m = c; }
            leg(m, cur, snapIn(nodes.get(to.mapId), to.x, to.y));
            const route = { legs: legs.map(({ mapId, path, len }) => ({ mapId, path, len })), len: legs.reduce((a, l) => a + l.len, 0), fallback: legs.some(l => l.fallback) };
            if (routes.size >= ROUTE_CACHE_MAX) routes.clear();
            routes.set(key, route);
            return route;
        },
        cacheSize: () => routes.size,
    };
    return nav;
}
