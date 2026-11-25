// Mana Scent (data/lore/world_systems.md; amo's PlayerStats.manaScent 0–100): magic leaves a scent in the Aether that
// predators follow. Every spell raises it by its mana cost (×1.2); it fades by 12 a second (the rules' tickMana). Every
// half second, creatures within 4 m + 0.36 m per point of scent (100 → 40 m) that are idle come for you. The Aetheric
// Tear arrives with 100% scent and a 2 s Resonance Stun — "extremely vulnerable to the predators he just alerted".
// A thin violet bar under the mana shows it while it lingers.
export function createScent({ stats, getMap, getPlayer }) {
    let t = 0;
    const status = document.getElementById('status');
    const label = document.createElement('div'); label.className = 'label'; label.innerHTML = '<span>Mana scent</span><span id="scent-num"></span>';
    const bar = document.createElement('div'); bar.className = 'bar'; bar.style.height = '4px';
    const fill = document.createElement('div'); fill.style.cssText = 'height:100%;width:0;background:linear-gradient(90deg,#5a2a8a,#c06aff)'; bar.append(fill);
    const speed = document.getElementById('speed');
    if (status) { status.insertBefore(label, speed); status.insertBefore(bar, speed); }
    const radius = () => 4 + (stats.manaScent ?? 0) * 0.36;
    function update(dt) {
        const s = stats.manaScent ?? 0, on = s > 1;
        label.style.display = bar.style.display = on ? '' : 'none';
        if (on) { fill.style.width = `${s}%`; label.lastChild.textContent = s > 66 ? 'strong' : s > 33 ? 'noticeable' : 'faint'; }
        if ((t -= dt) > 0 || s < 5) return;
        t = 0.5;
        const p = getPlayer().pos, r = radius();
        for (const h of getMap()?.hittables ?? []) {
            if (h.alive === false || !(h.scent || h.provoke) || !h.pos) continue;
            if (Math.hypot(h.pos.x - p.x, h.pos.z - p.z) < r) (h.scent ? h.scent(8) : h.provoke());
        }
    }
    return { update, add: n => stats.addManaScent?.(n), get radius() { return radius(); } };
}
