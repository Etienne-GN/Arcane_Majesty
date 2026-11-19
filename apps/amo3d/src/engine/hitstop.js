// Hit-stop: on a heavy blow the world holds still for a few hundredths of a second, so the hit lands with weight.
// hitStop(s) from anywhere; the main tick scales its dt through scale(dt) (real time still passes for the stop).
let left = 0;
export function hitStop(s) { left = Math.max(left, Math.min(0.12, s)); }
export function scale(dt) { if (left <= 0) return dt; left -= dt; return dt * 0.06; }
