// Combat C5 (spec §5): arrows, bolts and quivers. Pure — tools/test_ammo.mjs.
//
// The quiver's load is a reservation on the pack: arrows stay in the satchel as
// normal stacks (so crafting and selling can use them) and the load says how many
// of each kind are ready to shoot, one entry { id, qty } per compartment. Out of a
// fight (REFILL_MS with no attack and no hit taken) the load tops up from the
// pack; in a fight it does not, so an empty quiver means "Out of arrows".

// type: what shoots it · mult: damage · back: what comes back from a kill (null: nothing)
export const AMMO = {
    basic_arrow:     { type: 'arrow', mult: 1,    back: 'basic_arrow' },
    broadhead_arrow: { type: 'arrow', mult: 1.35, back: 'broadhead_arrow' },
    poison_arrow:    { type: 'arrow', mult: 1,    back: 'basic_arrow', status: 'poison' },   // the poison is spent
    explosive_arrow: { type: 'arrow', mult: 1,    back: null, burst: { radius: 48, mult: 0.6 } },
    bolt:            { type: 'bolt',  mult: 1,    back: 'bolt' },
};
export const AMMO_IDS = Object.keys(AMMO);
export const KIND_CAP = 30;        // every quiver compartment holds 30 (small 30, large 60, Hunter's 90)
export const NO_QUIVER_CAP = 10;   // without a quiver, 10 can be kept ready
export const REFILL_MS = 3000;     // this long with no fighting and the quiver refills
export const BACK_SHARE = 1 / 3;   // about a third come back

// def: the worn quiver item, or null
export function quiverLayout(def) {
    return def?.quiver ? { kinds: def.quiver.kinds, cap: KIND_CAP } : { kinds: 1, cap: NO_QUIVER_CAP };
}

// The load cut to the layout, never reserving more than the pack holds
// (counts: id → how many the pack has), first compartments first.
export function fitLoad(load, layout, counts) {
    const left = { ...counts }, out = [];
    for (let i = 0; i < layout.kinds; i++) {
        const c = load?.[i];
        if (!c?.id || !AMMO[c.id]) { out.push({ id: null, qty: 0 }); continue; }
        const qty = Math.max(0, Math.min(c.qty ?? 0, layout.cap, left[c.id] ?? 0));
        left[c.id] = (left[c.id] ?? 0) - qty;
        out.push({ id: c.id, qty });
    }
    return out;
}

// Out of a fight: top every compartment up from the pack. A spent kind leaves its
// compartment; empty compartments take new kinds, the held weapon's (`prefer`:
// 'arrow' | 'bolt') first. When no compartment holds what the weapon shoots and the
// pack has some, the last compartment of the other type makes room for it.
export function refillLoad(load, layout, counts, prefer = 'arrow') {
    const out = fitLoad(load, layout, counts);
    const spare = id => (counts[id] ?? 0) - out.reduce((n, c) => n + (c.id === id ? c.qty : 0), 0);
    for (const c of out) if (c.id && c.qty === 0 && spare(c.id) <= 0) c.id = null;
    const order = [...AMMO_IDS.filter(id => AMMO[id].type === prefer), ...AMMO_IDS.filter(id => AMMO[id].type !== prefer)];
    const wanted = order.find(id => AMMO[id].type === prefer && (counts[id] ?? 0) > 0);
    if (wanted && !out.some(c => AMMO[c.id]?.type === prefer) && !out.some(c => !c.id)) {
        const other = [...out].reverse().find(c => AMMO[c.id]?.type !== prefer);
        if (other) { other.id = null; other.qty = 0; }
    }
    for (const c of out) if (c.id) c.qty += Math.max(0, Math.min(layout.cap - c.qty, spare(c.id)));
    for (const c of out) {
        if (c.id) continue;
        const id = order.find(k => !out.some(o => o.id === k) && (counts[k] ?? 0) > 0);
        if (!id) break;
        c.id = id;
        c.qty = Math.min(layout.cap, counts[id]);
    }
    return out;
}

// The compartment to shoot from: the chosen kind, or the first with ammo of the type. -1: none.
export function pickAmmo(load, type, kind = null) {
    return (load ?? []).findIndex(c => c.qty > 0 && (kind ? c.id === kind : AMMO[c.id]?.type === type));
}

// An arrow or bolt landed in `target` (an enemy). What can come back is counted on
// it; an explosive killing blow marks it so nothing comes back.
export function recordHit(target, kind, killed) {
    const a = AMMO[kind];
    if (!a) return;
    if (a.back) (target._ammoIn ??= {})[a.back] = (target._ammoIn[a.back] ?? 0) + 1;
    if (killed && a.burst) target._blownUp = true;
}

// What comes back when it dies: about a third of each kind (the fraction is a roll).
export function ammoBack(hits, blownUp, rand = Math.random) {
    if (blownUp || !hits) return [];
    return Object.entries(hits).map(([id, n]) => {
        const share = n * BACK_SHARE, whole = Math.floor(share + 1e-9);
        return { id, qty: whole + (rand() < share - whole ? 1 : 0) };
    }).filter(r => r.qty > 0);
}
