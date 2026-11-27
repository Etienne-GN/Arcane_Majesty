// Map registry and transitions. Maps are built lazily the first time they are entered and kept
// (so the glade remembers its deer and soldiers — and the open world stays loaded while you are inside a house).
// A transition fades to black, paints a "Loading…" frame if the map is new, swaps, then HOLDS the black until the
// destination is ready — its shaders compiled (warm), what streams in around you built (ready), the frames steady —
// and only then fades back in (2026-11-27, the user: "loading when getting out of the marketplace is horrible, we feel
// the 5 fps for a moment … fading to black and back to the game when ready").
//
// A map is an object: { name, scene, terrain, camera:{pitch,dist,maxDist}, spawns:{name:{x,y?,z,facing}},
//   triggers:[{x,z,r,label,to,spawn,yMin?,yMax?}], groundAt(x,z,y), blockedAt(x,z,r,y), resolve(pos,r),
//   projectileHit(p), groundNormal(x,z), hittables:[], update(t,dt,ctx), levelName?(y), wading?(x,z),
//   stepBlocked?(x,z,y), heightAt?(x,z) }
// redirect(id, spawnName, fromId, at) → { id, spawn, at } | null: a place now inside the open world is entered there instead.
// ready(map) → true when the map has nothing left to build around you; warm(map) → a promise (the shaders compiling).
const SETTLE_FRAMES = 6, SETTLE_FRAME_MS = 70, SETTLE_MAX = 6;   // steady frames in a row, what counts as steady, the longest wait (s)
export function createMapManager({ builders, fade, fadeText, onEnter, redirect = null, ready = null, warm = null }) {
    const maps = {};
    let current = null, currentId = null;
    let transition = null;

    function enter(id, spawnName, at = null) {
        const r = redirect?.(id, spawnName, currentId, at);
        if (r) { id = r.id; spawnName = r.spawn; at = r.at ?? null; }
        current = maps[id] ??= builders[id]();
        currentId = id;
        const sp = at ?? current.spawns[spawnName];
        onEnter(current, id, sp);
        return current;
    }

    // Start a fade to another map. `before` runs at the black frame, just before the swap; `after` when the
    // destination is ready, as the black lifts (an arrival's effect).
    function go(to, spawn, before = null, at = null, after = null) {   // at: an exact spot instead of a named spawn (the crossing Tear)
        if (transition) return false;
        transition = { t: 0, to, spawn, before, at, after, swapped: false, settle: null };
        return true;
    }

    // Returns true while the world should be frozen (fading out, or waiting in the black for the destination).
    function step(dt) {
        if (!transition) return false;
        transition.t += dt;
        if (!transition.swapped) {
            if (transition.t >= 0.35) {
                if (!maps[redirect?.(transition.to, transition.spawn, currentId)?.id ?? transition.to] && !transition.loading) {   // paint "Loading…" once before building
                    transition.loading = true;
                    fadeText.textContent = 'Loading…';
                    return true;
                }
                transition.before?.();
                enter(transition.to, transition.spawn, transition.at ?? null);
                transition.swapped = true;
                const S = transition.settle = { t: 0, ok: 0, last: performance.now(), warmed: false };
                const w = warm?.(current);
                if (w?.then) w.then(() => { S.warmed = true; }, () => { S.warmed = true; }); else S.warmed = true;
                fade.style.opacity = 1;
                return true;
            }
            fade.style.opacity = Math.min(1, transition.t / 0.35);
            return true;
        }
        if (transition.settle) {   // in the black: wait for the destination
            const S = transition.settle, now = performance.now(), frame = now - S.last;
            S.last = now; S.t += dt;
            const good = S.warmed && (ready ? ready(current) : true) && frame < SETTLE_FRAME_MS;
            S.ok = good ? S.ok + 1 : 0;
            if (S.t > 0.8) fadeText.textContent = 'Loading…';
            if ((S.ok >= SETTLE_FRAMES && S.t >= 0.12) || S.t > SETTLE_MAX) {
                transition.settle = null; transition.t = 0; fadeText.textContent = '';
                transition.after?.();
            } else { fade.style.opacity = 1; return true; }
        }
        const o = Math.max(0, 1 - transition.t / 0.4);
        fade.style.opacity = o;
        if (o <= 0) transition = null;
        return false;
    }

    return {
        maps, enter, go, step,
        get current() { return current; },
        get id() { return currentId; },
        get busy() { return !!transition; },
    };
}
