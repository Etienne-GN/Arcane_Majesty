// Navigation for actors: a 1 m walk grid over an outdoor map (built once from its colliders, water
// and rim), amo's A* (pathfind.findPath: 8 directions, no corner cutting) on it, and a steering
// helper. aim(from, to, key) returns the point to head for now: the target itself when the straight
// line is clear, otherwise the farthest waypoint on a cached path that can be seen directly.
import { pathfind } from '@rules';

const { findPath } = pathfind;

export function createNav({ colliders, passable, half = 100, cell = 1, clearance = 0.45 }) {
    const n = Math.round((half * 2) / cell);
    const mask = new Uint8Array(n * n);
    const toCell = v => Math.floor((v + half) / cell);
    const centre = i => i * cell - half + cell / 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) mask[y * n + x] = passable(centre(x), centre(y)) ? 1 : 0;
    for (const c of colliders) {   // circles and segments, grown by the walker's clearance
        if (c.kind !== 'wall' && c.kind !== 'hop') continue;
        let pts = [[c.x, c.z]];
        if (c.ax !== undefined) {   // a segment: sample it every half metre
            const steps = Math.max(1, Math.ceil(Math.hypot(c.bx - c.ax, c.bz - c.az) / 0.5));
            pts = Array.from({ length: steps + 1 }, (_, k) => [c.ax + (c.bx - c.ax) * k / steps, c.az + (c.bz - c.az) * k / steps]);
        }
        const r = c.r + clearance;
        for (const [px, pz] of pts) {
            for (let y = toCell(pz - r); y <= toCell(pz + r); y++) for (let x = toCell(px - r); x <= toCell(px + r); x++) {
                if (x < 0 || y < 0 || x >= n || y >= n) continue;
                if (Math.hypot(centre(x) - px, centre(y) - pz) <= r) mask[y * n + x] = 0;
            }
        }
    }
    const open = (x, z) => { const cx = toCell(x), cz = toCell(z); return cx >= 0 && cz >= 0 && cx < n && cz < n && mask[cz * n + cx] === 1; };

    // Is the straight line from a to b free of blocked cells?
    function clear(ax, az, bx, bz) {
        const d = Math.hypot(bx - ax, bz - az), steps = Math.ceil(d / (cell * 0.5));
        for (let s = 1; s < steps; s++) if (!open(ax + (bx - ax) * s / steps, az + (bz - az) * s / steps)) return false;
        return true;
    }
    // Nearest open cell to a point (targets often stand next to a blocked cell).
    function nearestOpen(x, z) {
        const cx = toCell(x), cz = toCell(z);
        for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
            const X = cx + dx, Y = cz + dy;
            if (X >= 0 && Y >= 0 && X < n && Y < n && mask[Y * n + X]) return [X, Y];
        }
        return null;
    }

    const routes = new Map();   // key → { path: [[x,z]…], goal, age }
    function aim(from, to, key, dt = 0) {
        if (clear(from.x, from.z, to.x, to.z)) { routes.delete(key); return to; }
        let r = routes.get(key);
        const goalCell = `${toCell(to.x)},${toCell(to.z)}`;
        if (r) r.age += dt;
        if (!r || r.goal !== goalCell || r.age > 0.8) {
            const a = nearestOpen(from.x, from.z), b = nearestOpen(to.x, to.z);
            const p = a && b ? findPath(mask, n, n, a, b) : null;
            r = { path: p ? p.map(([x, y]) => [centre(x), centre(y)]) : null, goal: goalCell, age: 0 };
            routes.set(key, r);
        }
        if (!r.path) return to;   // no route: fall back to heading straight
        for (let i = r.path.length - 1; i > 0; i--) {   // the farthest waypoint in plain sight
            const [x, z] = r.path[i];
            if (clear(from.x, from.z, x, z)) return { x, z };
        }
        const [x, z] = r.path[Math.min(1, r.path.length - 1)];
        return { x, z };
    }

    return { aim, clear, open, size: n };
}
