// The crossing Tear (docs/3d/AUTONOMOUS_RUN.md 4b): inside a thin place (content/world/veil.js), the Aetheric Tear
// (T / MENU → Aetheric Tear) offers to tear across the veil — to the same spot on the other side. Like Malakar striking
// Acheron across dimensions, it can be done; it is not cheap:
//   — it takes Aether Sight (to find the thin place) and level 30 (god mode excepted);
//   — it costs ALL your mana (come to it full: at least 90%);
//   — once per game day (the veil there needs a day to heal);
//   — you arrive with 100% Mana Scent and a 2 s Resonance Stun, and whatever lives on the other side is alerted.
import { thinAt } from '../content/world/veil.js';
import { settings } from '../engine/settings.js';
import { sfx } from '../engine/sfx.js';

export function createCrossing({ stats, hud, dialogue, world, player, sight, day, onTearToGate }) {
    let channel = null, pendingArrival = false;
    const other = id => (id === 'eldoria' ? 'nythoria' : id === 'nythoria' ? 'eldoria' : null);
    // T pressed: returns true when the crossing handled it (the offer is shown)
    function tryOffer() {
        const to = other(world.id), p = player.state.pos;
        if (!to || channel) return false;
        const t = thinAt(p.x, p.z);
        if (!t || !sight.level) return false;
        let pick = null;
        dialogue.start([{ speaker: '', text: `The veil runs thin here — ${t.name}. Through it, faint as breath on glass, the same ground on the other side.`, choices: [
            { text: `Tear across the veil — to ${to === 'nythoria' ? 'Nythoria' : 'Eldoria'} (all your mana, once a day)`, onPick: () => { pick = 'cross'; } },
            { text: 'Tear to a rift gate instead', onPick: () => { pick = 'gate'; } },
            { text: 'Not now' },
        ] }], () => { if (pick === 'cross') begin(to, t); else if (pick === 'gate') onTearToGate?.(); });
        return true;
    }
    function begin(to, t) {
        const d = day();
        if (stats.level < 30 && !settings.god) return hud.message('Tearing across the planes takes more than you have yet — level 30.');
        if (stats.flags?.veilDay === d && !settings.god) return hud.message('The veil here has not healed from your last crossing. Tomorrow.');
        if (stats.mana < stats.maxMana * 0.9) return hud.message('It will take everything you have. Come to it with your mana full.');
        channel = { t: 0, to, thin: t };
        hud.message('You take hold of the veil with both hands…'); sfx.cast?.();
    }
    function update(dt, fx) {
        if (!channel) return;
        const p = player.state.pos;
        if (player.state.dead || !thinAt(p.x, p.z)) { channel = null; hud.message('The veil slips out of your grasp.'); return; }
        channel.t += dt;
        for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28, r = 0.5 + Math.random(); fx?.sparks?.emit?.({ x: p.x + Math.cos(a) * r, y: p.y + Math.random() * 2.4, z: p.z + Math.sin(a) * r, vx: -Math.cos(a) * 2, vy: 1, vz: -Math.sin(a) * 2, life: 0.5, size: [0.18, 0.03], c0: [0.75, 0.55, 1, 1], c1: [0.3, 0.1, 0.8, 0] }); }
        if (channel.t < 2) return;
        stats.mana = 0; (stats.flags ??= {}).veilDay = day();
        pendingArrival = true;
        world.go(channel.to, null, null, { x: p.x, z: p.z, facing: player.state.facing });
        channel = null;
    }
    // the other side: 100% scent, the stun, everything near alerted (main.js calls it from onEnter)
    function arrived(id) {
        if (!pendingArrival) return;
        pendingArrival = false;
        stats.manaScent = 100; player.addBuff?.('resonance_stun', 2000);
        setTimeout(() => hud.banner(id === 'nythoria' ? 'Across the veil — Nythoria' : 'Across the veil — Eldoria'), 400);
    }
    return { tryOffer, update, arrived, get channelling() { return !!channel; } };
}
