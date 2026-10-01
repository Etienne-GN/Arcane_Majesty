// Codex bestiary: hand-written lore for some creatures, and the entry builder
// used by CodexScene. Pure — tools/test_combat_depth.mjs.
import { ENEMY_TYPES } from './worldMap.js';
import { ITEMS } from './items.js';
import { ENEMY_KITS, ENEMY_SPELLS } from './enemyMagic.js';
import { affinityOf } from './enemyAffinities.js';
import { scaleEnemyStats } from './levelBands.js';

export const BESTIARY_LORE = {
    wisp: {
        name: 'Forest Wisp',
        threat: 'LOW',
        desc: 'Resonance-charged fragments that coalesce in areas of high arcane density. They congregate near Rift-Gate sites and ancient survey markers. Dissipation releases trace arcane energy. Neither hostile nor benign — they react to intent.',
    },
    wolf: {
        name: 'Forest Wolf',
        threat: 'MODERATE',
        desc: 'Corrupted pack predators. Void-taint has overwritten their natural behavior — they move as shadows, driven not by hunger but by the Void General\'s will. The pack structure remains intact but serves a darker command.',
    },
    shadow_sprite: {
        name: 'Shadow Sprite',
        threat: 'MODERATE',
        desc: 'Void-born constructs that take the shape of forest creatures. Nothing natural underneath — formed entirely from structured void-matter. They cluster near ruins, feeding on residual resonance. Close contact causes resonance bleed.',
    },
    void_stalker: {
        name: 'Void Stalker',
        threat: 'HIGH',
        desc: 'A mature void construct — persistent, patient, resistant to physical force. The Stalkers near the boss arena are sentinels, not random encounters. They mark the boundary of the Void General\'s sphere of influence.',
    },
    scout: {
        name: 'Void Scout',
        threat: 'MODERATE',
        desc: 'Humanoid — possibly once a Covenant soldier or survey team member. Void-touched past recovery, but retaining enough tactical instinct to function as patrol units. They carry corrupted equipment and remember formation discipline.',
    },
    treant: {
        name: 'Corrupted Treant',
        threat: 'HIGH',
        desc: 'Ancient forest guardians whose resonance core has been inverted by void-taint. Originally protective entities — their corruption marks how deeply the Void\'s influence has spread into the forest\'s living substrate.',
    },
    void_general: {
        name: 'Void General [DEFEATED]',
        threat: 'APEX',
        desc: 'A field commander of the Void — one of many, per its dying words. Its purpose was to test the perimeter and determine whether the Heartstone could be reached before its defenders arrived. That it was defeated means only that this test failed. The Void will send another.',
    },
};

// Creatures not in ENEMY_TYPES with fixed stats (no level band).
const FIXED_STATS = { void_general: { health: 350, damage: 20 } };

const titleCase = id => id.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');

// Codex bestiary: every creature killed (full entry), then those only seen ("???").
export function bestiaryEntries({ killed = [], seen = [], killCounts = {}, band = { min: 1, max: 3 } }) {
    const full = killed.map(type => {
        const def = ENEMY_TYPES[type] ?? {};
        const lore = BESTIARY_LORE[type];
        const base = { health: def.health ?? 30, damage: def.damage ?? 8, xpReward: def.xpReward ?? 20, goldDrop: 0 };
        const lo = scaleEnemyStats(base, band.min), hi = scaleEnemyStats(base, band.max);
        const aff = affinityOf(type);
        const weak = Object.entries(aff.resist).filter(([, m]) => m > 1).map(([el, m]) => `${el} ×${m}`);
        const res  = Object.entries(aff.resist).filter(([, m]) => m < 1).map(([el, m]) => `${el} ×${m}`);
        const lines = [
            lore?.desc,
            `Killed: ${Math.max(1, killCounts[type] ?? 0)}`,
            FIXED_STATS[type] ? `HP ${FIXED_STATS[type].health}  DMG ${FIXED_STATS[type].damage}`
                : def.passive ? `HP ${base.health}` : `Lv ${band.min}–${band.max}: HP ${lo.health}–${hi.health}  DMG ${lo.damage}–${hi.damage}`,
            [weak.length && `weak: ${weak.join(', ')}`, res.length && `resists: ${res.join(', ')}`, aff.immune.length && `immune: ${aff.immune.join(', ')}`].filter(Boolean).join('  ·  ') || null,
            (ENEMY_KITS[type] ?? []).length ? `Casts: ${ENEMY_KITS[type].map(id => ENEMY_SPELLS[id].name).join(', ')}` : null,
            (def.lootTable ?? []).length ? `Drops: ${def.lootTable.map(l => `${ITEMS[l.id]?.name ?? l.id} ${Math.round(l.chance * 100)}%`).join(', ')}` : null,
        ].filter(Boolean);
        return { title: lore?.name ?? titleCase(type), text: lines.join('\n'), threat: lore?.threat };
    });
    const unknown = seen.filter(t => !killed.includes(t)).map(() => ({ title: '???', text: 'Seen but never defeated.' }));
    return [...full, ...unknown];
}
