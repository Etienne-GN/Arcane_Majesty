// Game clock: one real minute = one game hour (a 24-minute day). The time is
// stats.gameMinutes — total game minutes since the character began (saved).
// Night is 21:00–04:59: the world darkens (dusk 19–21, dawn 5–6), void
// creatures hit 20% harder and spawns can be day- or night-only.
// Pure — tools/test_phase5_world.mjs.
import { ENEMY_FAMILY } from '../data/enemyAffinities.js';

export const START_MINUTES = 8 * 60;
export const MINUTES_PER_REAL_SECOND = 1;
export const NIGHT_ALPHA = 0.55;
export const NIGHT_DAMAGE_MULT = 1.2;

export function advanceClock(stats, ms) {
    if (!(ms > 0)) return;
    stats.gameMinutes = (stats.gameMinutes ?? START_MINUTES) + (ms / 1000) * MINUTES_PER_REAL_SECOND;
}

export const gameHour = min => (((min % 1440) + 1440) % 1440) / 60;
export const gameDay  = min => Math.floor(min / 1440);

export function clockLabel(min) {
    const total = Math.floor(min);
    const hh = Math.floor((total % 1440) / 60), mm = total % 60;
    return `Day ${gameDay(min)} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function isNight(min) {
    const h = gameHour(min);
    return h >= 21 || h < 5;
}

// The darkness laid over the world: none by day, NIGHT_ALPHA at night, ramps at dusk and dawn.
export function ambientAt(min) {
    const h = gameHour(min);
    if (h >= 6 && h < 19) return { color: 0x0a1030, alpha: 0 };
    if (h >= 19 && h < 21) return { color: 0x2a1838, alpha: NIGHT_ALPHA * (h - 19) / 2 };
    if (h >= 5 && h < 6)   return { color: 0x302040, alpha: NIGHT_ALPHA * (6 - h) };
    return { color: 0x0a1030, alpha: NIGHT_ALPHA };
}

export const nightDamageMult = (type, min) =>
    (ENEMY_FAMILY[type] === 'void' && isNight(min) ? NIGHT_DAMAGE_MULT : 1);

// Spawn entries can carry `time: 'day' | 'night'`.
export function spawnActive(def, min) {
    if (def?.time === 'night') return isNight(min);
    if (def?.time === 'day') return !isNight(min);
    return true;
}
