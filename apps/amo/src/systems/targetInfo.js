// A plain snapshot of an enemy for the HUD target frame. Pure — reads only
// plain fields, so a destroyed enemy is safe to read. tools/test_combat_depth.mjs.
import { STATUS_DEFS } from '../data/statuses.js';
import { ENEMY_SPELLS, BOSS_AEGIS } from '../data/enemyMagic.js';
import { FAMILIES, ENEMY_FAMILY } from '../data/enemyAffinities.js';

const titleCase = id => String(id ?? '').split('_').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');

export function targetInfo(e) {
    const dead = !e.active || e.health <= 0;
    const statuses = Object.entries(e._statuses ?? {})
        .filter(([id]) => STATUS_DEFS[id])
        .map(([id, st]) => ({
            id, label: STATUS_DEFS[id].label, buff: !!STATUS_DEFS[id].buff, tint: STATUS_DEFS[id].tint ?? null,
            secs: st.remaining === Infinity ? null : Math.ceil(st.remaining / 1000), stacks: st.stacks ?? 1,
        }))
        .sort((a, b) => (b.buff - a.buff) || ((a.secs ?? 1e9) - (b.secs ?? 1e9)));
    let cast = null;
    if (e._cast && ENEMY_SPELLS[e._cast.id]) cast = { name: ENEMY_SPELLS[e._cast.id].name, frac: Math.min(1, e._cast.elapsed / e._cast.castMs) };
    else if (e._aegisCast) cast = { name: BOSS_AEGIS.name, frac: Math.min(1, e._aegisCast.elapsed / BOSS_AEGIS.castMs) };
    return {
        name: e.displayName ?? titleCase(e.enemyType),
        level: e.level ?? null,
        elite: !!e.elite,
        family: FAMILIES[ENEMY_FAMILY[e.enemyType]]?.label ?? null,
        hp: dead ? 0 : Math.ceil(e.health), maxHp: e.maxHealth, dead,
        statuses, cast,
    };
}
