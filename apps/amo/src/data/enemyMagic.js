// Enemy magic — the spells caster creatures shape in a fight.
//
// Every enemy spell has a visible cast (a ring that fills around the caster
// for `castMs`). A cast is INTERRUPTED if the caster is silenced, hushed or
// stunned before it completes (Counterspell, Unravel, Luminance, Hush,
// Tempest enchant…). Buffs they raise are dispellable statuses (statuses.js,
// magical + buff) — Unravel and Purifying Sweep strip them.
//
// kind:
//   ward / empower / haste — apply `status` to the caster or an ally in `range`
//                            that lacks it (the most hurt one first)
//   mend    — heal the most hurt ally in `range` by `heal` × max HP, then `status`
//   bolt    — hit the player (in `range` when the cast completes) for `dmg`,
//             with an optional `status` at `chance`
//   hex     — apply `status` to the player; `dispel: true` strips the player's
//             own magical buffs instead (Unweave)

export const ENEMY_SPELLS = {
    mana_ward:    { name: 'Mana Ward',        kind: 'ward',    castMs: 1200, cooldown: 9000,  range: 140, status: 'mana_ward', duration: 12000, color: 0x88aaff },
    dark_empower: { name: 'Dark Empowerment', kind: 'empower', castMs: 1000, cooldown: 10000, range: 140, status: 'empowered', duration: 14000, color: 0xff5533 },
    quicken:      { name: 'Quicken',          kind: 'haste',   castMs: 800,  cooldown: 11000, range: 120, status: 'hastened',  duration: 10000,  color: 0xffee88 },
    mend:         { name: 'Mend',             kind: 'mend',    castMs: 1400, cooldown: 8000,  range: 140, heal: 0.20, status: 'mending', duration: 10000, color: 0x66ff99 },
    arcane_bolt:  { name: 'Arcane Bolt',      kind: 'bolt',    castMs: 900,  cooldown: 3500,  range: 170, dmg: 10, color: 0xcc88ff },
    frost_bolt:   { name: 'Frost Bolt',       kind: 'bolt',    castMs: 1000, cooldown: 4000,  range: 160, dmg: 9,  status: 'cold',      chance: 0.6,  duration: 8000, color: 0x88ddff },
    void_bolt:    { name: 'Void Bolt',        kind: 'bolt',    castMs: 1100, cooldown: 4500,  range: 170, dmg: 12, status: 'cursed',    chance: 0.3,  duration: 10000, color: 0x9933ff },
    thorn_bolt:   { name: 'Thorn Lash',       kind: 'bolt',    castMs: 900,  cooldown: 4000,  range: 150, dmg: 8,  status: 'entangled', chance: 0.35, duration: 2000, color: 0x44aa33 },
    hex_curse:    { name: 'Hex of Weakness',  kind: 'hex',     castMs: 1300, cooldown: 12000, range: 150, status: 'cursed',   duration: 12000, color: 0x660088 },
    hex_silence:  { name: 'Hex of Silence',   kind: 'hex',     castMs: 1100, cooldown: 14000, range: 150, status: 'silenced', duration: 4000,  color: 0x888888 },
    unweave:      { name: 'Unweave',          kind: 'hex',     castMs: 1200, cooldown: 15000, range: 150, dispel: true,                       color: 0xddddff },
};

// Which creatures cast what (ENEMY_TYPES ids → ENEMY_SPELLS ids, in priority order).
export const ENEMY_KITS = {
    dark_druid:      ['mend', 'thorn_bolt'],
    mushroom_shaman: ['mend', 'dark_empower'],
    arcane_sentinel: ['mana_ward', 'arcane_bolt'],
    runic_turret:    ['arcane_bolt'],
    mirror_shade:    ['unweave', 'hex_silence'],
    grave_wraith:    ['hex_curse'],
    soul_eater:      ['dark_empower'],
    ice_revenant:    ['frost_bolt'],
    blizzard_sprite: ['quicken', 'frost_bolt'],
    frost_shade:     ['frost_bolt'],
    forge_daemon:    ['dark_empower', 'mana_ward'],
    rift_walker:     ['quicken', 'void_bolt'],
    cursed_knight:   ['mana_ward'],
    deep_horror:     ['mana_ward', 'void_bolt'],
};

// Pause after any cast so casters still fight in melee between spells.
export const GLOBAL_CAST_GAP = 2500;

// The boss's dispellable shield (BossEnemy): cast at 50% and 25% HP and then
// again every `cooldown` ms while the fight lasts.
export const BOSS_AEGIS = { name: 'Void Aegis', castMs: 1600, cooldown: 16000, status: 'void_aegis', color: 0x9900ff };

// Pick the first spell in a kit that is off cooldown and has a use right now.
// ctx: { distToPlayer, allies: [{ entity, hpFrac, has(statusId) }] } — the
// caster itself is allies[0]. Returns { id, target } or null. Pure (tested).
export function chooseEnemySpell(kit, cooldowns, ctx) {
    for (const id of kit) {
        const sp = ENEMY_SPELLS[id];
        if (!sp || (cooldowns[id] ?? 0) > 0) continue;
        if (sp.kind === 'bolt' || sp.kind === 'hex') {
            if (ctx.distToPlayer <= sp.range) return { id, target: 'player' };
            continue;
        }
        const pool = ctx.allies.filter(a => a.dist === undefined || a.dist <= sp.range);
        let target;
        if (sp.kind === 'mend') target = pool.filter(a => a.hpFrac < 0.7).sort((a, b) => a.hpFrac - b.hpFrac)[0];
        else                    target = pool.filter(a => !a.has(sp.status)).sort((a, b) => a.hpFrac - b.hpFrac)[0];
        if (target) return { id, target: target.entity };
    }
    return null;
}
