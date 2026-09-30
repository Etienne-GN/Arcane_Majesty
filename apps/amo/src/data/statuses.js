// Status effect definitions.
// duration: ms (-1 = permanent until cleansed)
// speedMult: movement speed multiplier (player and enemies)
// statsMult: multiplier on the damage the entity deals
// damageTakenMult: multiplier on the damage the entity takes
// dotDmg / dotInterval: damage per tick / ms between ticks
// regenAmt / regenInterval: HP restored per tick / ms between ticks
// magical + buff: a beneficial spell effect — removed by dispels (Unravel,
//   Purifying Sweep on enemies; the Unweave hex on the player)

export const STATUS_DEFS = {
    wet: {
        id: 'wet', label: 'Wet', duration: 30000, tint: 0x4488ff,
        fireDmgMult: 0.5, lightningDmgMult: 2.0,
    },
    dried: {
        id: 'dried', label: 'Dried', duration: 10000, tint: 0xddaa66,
        fireDmgMult: 1.3,
    },
    cold: {
        id: 'cold', label: 'Cold', duration: 20000, tint: 0x88ccff,
        speedMult: 0.7,
    },
    frozen: {
        id: 'frozen', label: 'Frozen', duration: 4000, tint: 0xaaddff,
        speedMult: 0, stunned: true,
    },
    burning: {
        id: 'burning', label: 'Burning', duration: 8000, tint: 0xff4400,
        dotDmg: 3, dotInterval: 1000,
    },
    shocked: {
        id: 'shocked', label: 'Shocked', duration: 2000, tint: 0xffff00,
        stunned: true,
    },
    poison: {
        id: 'poison', label: 'Poisoned', duration: 15000, tint: 0x44cc00,
        dotDmg: 2, dotInterval: 2000, maxStacks: 3,
    },
    dirty: {
        id: 'dirty', label: 'Dirty', duration: -1, tint: 0x886644,
    },
    silenced: {
        id: 'silenced', label: 'Silenced', duration: 6000, tint: 0x888888,
    },
    entangled: {
        id: 'entangled', label: 'Entangled', duration: 3000, tint: 0x228822,
        speedMult: 0, stunned: true,
    },
    cursed: {
        id: 'cursed', label: 'Cursed', duration: 20000, tint: 0x660088,
        statsMult: 0.85, damageTakenMult: 1.15,
    },
    blessed: {
        id: 'blessed', label: 'Blessed', duration: 30000, tint: 0xffdd44,
        statsMult: 1.10, damageTakenMult: 0.90, magical: true, buff: true,
    },
    swift: {
        id: 'swift', label: 'Swift', duration: 20000, tint: 0xaaffdd,
        speedMult: 1.25, magical: true, buff: true,
    },
    regen: {
        id: 'regen', label: 'Regen', duration: 10000, tint: 0x44ff88,
        regenAmt: 3, regenInterval: 1000, magical: true, buff: true,
    },
    void_tainted: {
        id: 'void_tainted', label: 'Void-Tainted', duration: 30000, tint: 0x440066,
    },
    marked: {
        id: 'marked', label: 'Marked', duration: 1500, tint: 0xcc00cc,
    },
    // Aetheric Ward: absorbs damage until its shield (set on cast) is spent.
    warded: {
        id: 'warded', label: 'Warded', duration: -1, tint: 0x4444ff, magical: true, buff: true,
    },
    // ── Enemy spell buffs (data/enemyMagic.js) — all dispellable ─────────────
    mana_ward: {
        id: 'mana_ward', label: 'Mana Ward', duration: 10000, tint: 0x88aaff,
        damageTakenMult: 0.5, magical: true, buff: true,
    },
    empowered: {
        id: 'empowered', label: 'Empowered', duration: 12000, tint: 0xff5533,
        statsMult: 1.5, magical: true, buff: true,
    },
    hastened: {
        id: 'hastened', label: 'Hastened', duration: 8000, tint: 0xffee88,
        speedMult: 1.4, magical: true, buff: true,
    },
    mending: {
        id: 'mending', label: 'Mending', duration: 8000, tint: 0x66ff99,
        regenAmt: 3, regenInterval: 1000, magical: true, buff: true,
    },
    void_aegis: {
        id: 'void_aegis', label: 'Void Aegis', duration: -1, tint: 0x9900ff,
        damageTakenMult: 0.35, magical: true, buff: true,
    },
    hushed: {
        id: 'hushed', label: 'Hushed', duration: 15000, tint: null,
    },
    resonance_stun: {
        id: 'resonance_stun', label: 'Resonance Stun', duration: 2000, tint: 0xdd88ff,
        speedMult: 0, stunned: true,
    },
};

// Tint priority (highest to lowest) for rendering when multiple statuses active
export const STATUS_TINT_PRIORITY = [
    'frozen', 'shocked', 'resonance_stun', 'burning', 'cold', 'entangled',
    'void_aegis', 'mana_ward', 'empowered', 'hastened', 'mending',
    'cursed', 'blessed', 'swift', 'warded', 'wet', 'poison',
    'dirty', 'silenced', 'void_tainted', 'marked',
];
