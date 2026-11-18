// W4: what a townsperson says when you press E on them — a line from their role's
// pool or the shared one, picked among those that fit the hour, the weather and
// the story so far. Lines that fit something specific are three times likelier.
// Pure — tools/test_townsfolk.mjs.
import { BARKS } from '../data/townsfolk/barks.js';

const inHours = ([from, to], h) => (from <= to ? h >= from && h < to : h >= from || h < to);

export function barkFits(line, { hour, weather, flags = {} }) {
    return (!line.hours || inHours(line.hours, hour))
        && (!line.weather || line.weather.includes(weather))
        && (!line.flag || !!flags[line.flag])
        && (!line.notFlag || !flags[line.notFlag]);
}

export function pickBark(role, ctx, rng = Math.random, pools = BARKS) {
    const lines = [...(pools[role] ?? []), ...(pools.anyone ?? [])].filter(l => barkFits(l, ctx));
    if (!lines.length) return null;
    const weighted = lines.flatMap(l => (l.hours || l.weather || l.flag || l.notFlag ? [l, l, l] : [l]));
    return weighted[Math.min(weighted.length - 1, Math.floor(rng() * weighted.length))].text;
}
