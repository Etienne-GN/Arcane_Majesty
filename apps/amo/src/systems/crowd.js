// W4: which townsfolk are live (at most LIVE_CAP, nearest the player first) and how
// a live walker gives way: it waits behind a player in its path, after
// WAIT_BEFORE_SIDESTEP_MS slides aside and walks on, then eases back onto its path
// and catches up with the clock (lagMin game minutes behind, made up at 1.5×).
// Pure — tools/test_townsfolk.mjs.
import { MINUTES_PER_REAL_SECOND } from './gameClock.js';

export const LIVE_CAP = 30;
export const WAIT_BEFORE_SIDESTEP_MS = 600;
export const SIDESTEP_PX = 18;
const CATCH_UP = 0.5, SLIDE_OUT = 0.06, SLIDE_BACK = 0.03;   // px per ms

export function chooseLive(cands, px, py, cap = LIVE_CAP) {
    return cands.map(c => ({ id: c.id, d: (c.x - px) ** 2 + (c.y - py) ** 2 }))
        .sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1)).slice(0, cap).map(c => c.id);
}

export function inTheWay(at, next, player, reach = 22) {
    const dx = next.x - at.x, dy = next.y - at.y, len = Math.hypot(dx, dy);
    if (len < 0.01) return false;
    const px = player.x - at.x, py = player.y - at.y, ahead = (px * dx + py * dy) / len;
    return ahead > 0 && ahead <= reach && Math.abs(px * dy - py * dx) / len < 14;
}

export function steer(state, { blocked, hold = false, dtMs, moving, sideFree = 1 }) {
    const dtMin = (dtMs / 1000) * MINUTES_PER_REAL_SECOND;
    let { lagMin = 0, blockedMs = 0, side = 0, offset = 0 } = state;
    if (!moving) return { lagMin: 0, blockedMs: 0, side: 0, offset: Math.max(0, offset - dtMs * SLIDE_BACK) };
    if (hold) return { lagMin: lagMin + dtMin, blockedMs: 0, side, offset };
    if (blocked && side === 0) {
        blockedMs += dtMs; lagMin += dtMin;
        if (blockedMs >= WAIT_BEFORE_SIDESTEP_MS) side = sideFree;
    } else if (blocked) {
        offset = Math.min(SIDESTEP_PX, offset + dtMs * SLIDE_OUT);
    } else {
        blockedMs = 0;
        if (offset > 0) offset = Math.max(0, offset - dtMs * SLIDE_BACK);
        if (offset === 0) side = 0;
        lagMin = Math.max(0, lagMin - dtMin * CATCH_UP);
    }
    return { lagMin, blockedMs, side, offset };
}
