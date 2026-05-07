// Status effect definitions.
// duration: ms (-1 = permanent until cleansed)
// speedMult: applied to enemy movement speed
// statsMult: multiplier on player/enemy stats
// dotDmg / dotInterval: damage per tick / ms between ticks
// regenAmt / regenInterval: HP restored per tick / ms between ticks

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
        statsMult: 0.85,
    },
    blessed: {
        id: 'blessed', label: 'Blessed', duration: 30000, tint: 0xffdd44,
        statsMult: 1.10,
    },
    regen: {
        id: 'regen', label: 'Regen', duration: 10000, tint: 0x44ff88,
        regenAmt: 3, regenInterval: 1000,
    },
    void_tainted: {
        id: 'void_tainted', label: 'Void-Tainted', duration: 30000, tint: 0x440066,
    },
    marked: {
        id: 'marked', label: 'Marked', duration: 1500, tint: 0xcc00cc,
    },
    warded: {
        id: 'warded', label: 'Warded', duration: -1, tint: 0x4444ff,
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
    'cursed', 'blessed', 'warded', 'wet', 'poison',
    'dirty', 'silenced', 'void_tainted', 'marked',
];
