// Map registry and transitions. Maps are built lazily the first time they are entered and kept
// (so the glade remembers its deer and soldiers). A transition fades to black, paints a
// "Loading…" frame if the map is new, swaps, and fades back in.
//
// A map is an object: { name, scene, terrain, camera:{pitch,dist,maxDist}, spawns:{name:{x,y?,z,facing}},
//   triggers:[{x,z,r,label,to,spawn,yMin?,yMax?}], groundAt(x,z,y), blockedAt(x,z,r,y), resolve(pos,r),
//   projectileHit(p), groundNormal(x,z), hittables:[], update(t,dt,ctx), levelName?(y), wading?(x,z),
//   stepBlocked?(x,z,y), heightAt?(x,z) }
// redirect(id, spawnName, fromId) → { id, spawn } | null: a place now inside the open world is entered there instead.
export function createMapManager({ builders, fade, fadeText, onEnter, redirect = null }) {
    const maps = {};
    let current = null, currentId = null;
    let transition = null;

    function enter(id, spawnName, at = null) {
        const r = !at && redirect?.(id, spawnName, currentId);
        if (r) { id = r.id; spawnName = r.spawn; }
        current = maps[id] ??= builders[id]();
        currentId = id;
        const sp = at ?? current.spawns[spawnName];
        onEnter(current, id, sp);
        return current;
    }

    // Start a fade to another map. `before` runs at the black frame, just before the swap.
    function go(to, spawn, before = null) {
        if (transition) return false;
        transition = { t: 0, to, spawn, before, swapped: false };
        return true;
    }

    // Returns true while the world should be frozen (fading out).
    function step(dt) {
        if (!transition) return false;
        transition.t += dt;
        if (!transition.swapped && transition.t >= 0.35) {
            if (!maps[redirect?.(transition.to, transition.spawn, currentId)?.id ?? transition.to] && !transition.loading) {   // paint "Loading…" once before building
                transition.loading = true;
                fadeText.textContent = 'Loading…';
                return true;
            }
            transition.before?.();
            enter(transition.to, transition.spawn);
            transition.swapped = true;
            transition.t = 0.35;
            fadeText.textContent = '';
        }
        const o = transition.swapped ? Math.max(0, 1 - (transition.t - 0.35) / 0.4) : Math.min(1, transition.t / 0.35);
        fade.style.opacity = o;
        if (transition.swapped && o <= 0) transition = null;
        return !!transition && !transition.swapped;
    }

    return {
        maps, enter, go, step,
        get current() { return current; },
        get id() { return currentId; },
        get busy() { return !!transition; },
    };
}
