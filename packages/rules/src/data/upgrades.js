// Gear upgrades at the forge: +1/+2/+3 per item id. Weapons hit harder;
// armour and accessories gain +1 per level to each stat they have.
// Pure — tools/test_phase3_economy.mjs.

export const UPGRADE_MAX = 3;

// Materials for reaching `level`, by item tier: ore, silver, heartwood,
// heartwood + ice crystal; +3 also takes an aether shard.
export function upgradeCost(def, level) {
    const tier = def?.tier ?? 1;
    const cost = tier <= 1 ? [{ id: 'mineral_ore', qty: 2 * level }]
        : tier === 2 ? [{ id: 'silver_ore', qty: 2 * level }]
        : tier === 3 ? [{ id: 'heartwood', qty: 2 * level }]
        : [{ id: 'heartwood', qty: level }, { id: 'ice_crystal', qty: level }];
    if (level >= 3) cost.push({ id: 'aether_shard', qty: 1 });
    return cost;
}

export function upgradedStats(def, level) {
    const st = def?.stats ?? {};
    if (!level || def?.slot === 'weapon') return { ...st };
    return Object.fromEntries(Object.entries(st).map(([k, v]) => [k, v + level]));
}

export const weaponDamageMult = level => Math.round((1 + 0.08 * (level ?? 0)) * 100) / 100;
export const upgradeLabel = (name, level) => (level ? `${name} +${level}` : name);
