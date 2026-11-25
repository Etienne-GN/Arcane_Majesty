// The dungeons (engine/dungeon.js builds each level from its seed). Game-only places (origin: game).
// level: the creatures' level (bands.js scaling), in step with the land round the way in (2026-11-25: they were unscaled).
// The Deep Shaft under Iron Hollow — the miners' closed shaft where "something cracks the props at night":
// level 1 the old workings, level 2 the deep gallery and what lives there.
export const DUNGEONS = {
    iron_hollow_shaft_1: {
        id: 'iron_hollow_shaft_1', name: 'The Deep Shaft — the old workings', seed: 7101, level: 22, size: 34, rooms: 8, theme: 'mine',
        enemies: { kinds: ['crag_fiend', 'cave_bat', 'cave_bat', 'blind_stalker', 'giant_spider'], per: [1, 3] },
        boss: { kind: 'crag_fiend', name: 'The Prop-Breaker' },
        chests: ['mineral_ore', 'mineral_ore', 'silver_ore', 'health_potion', 'mana_potion', 'ember_stone'],
        exit: { to: 'iron_hollow', spawn: 'from_shaft', label: 'Up the ladder — Iron Hollow' },
        down: { to: 'iron_hollow_shaft_2', label: 'Down into the deep gallery' },
    },
    iron_hollow_shaft_2: {
        id: 'iron_hollow_shaft_2', name: 'The Deep Shaft — the deep gallery', seed: 7202, level: 25, size: 38, rooms: 9, theme: 'mine',
        enemies: { kinds: ['blind_stalker', 'cave_bat', 'crag_fiend', 'void_stalker', 'giant_spider', 'giant_spider'], per: [2, 3] },
        boss: { kind: 'deep_horror', name: 'The Thing in the Deep' },
        chests: ['silver_ore', 'silver_ore', 'heart_crystal', 'health_potion', 'soul_gem_mana', 'steel_gauntlets', 'mail_coif', 'ancient_scroll'],
        chestRooms: 3,
        exit: { to: 'iron_hollow_shaft_1', spawn: 'from_below', label: 'Back up to the old workings' },
    },
    // The Inferno Labyrinth's halls (lore DB: Inferno Labyrinth — magma rivers, a gate of flame that calls you by
    // your given name, the obsidian golem trial, Magma-Eaters and Cinder-Souls). Through the gate of flame; out the
    // far side by the crucible. The Pyre-Lord himself waits for the campaign.
    inferno_halls: {
        id: 'inferno_halls', name: 'The Inferno Labyrinth — the halls', seed: 6606, level: 42, size: 33, rooms: 6, layout: 'maze', theme: 'inferno',
        enemies: { kinds: ['lava_elemental', 'ember_imp', 'ember_imp', 'ash_crawler', 'forge_daemon'], per: [1, 2] },
        boss: { kind: 'stone_golem', name: 'The Obsidian Warden' },
        chests: ['ember_stone', 'ember_stone', 'health_potion', 'mana_potion', 'soul_gem_mana', 'heart_crystal'],
        exit: { to: 'inferno_labyrinth', spawn: 'from_halls_gate', label: 'Back out through the gate of flame' },
        down: { to: 'inferno_labyrinth', spawn: 'from_halls', label: 'Out of the halls — the way to the crucible' },
    },
    // The Keepers' Vaults under the Ruins of Eldoria (lore DB: Ruins of Eldoria — a graveyard of the golden age, the
    // ruins of a vigil where keepers stood so long their standing became architecture). Game-only (origin: game).
    ruins_vaults: {
        id: 'ruins_vaults', name: "The Keepers' Vaults", seed: 8808, level: 45, size: 34, rooms: 9, theme: 'crypt',
        enemies: { kinds: ['grave_wraith', 'grave_wraith', 'cursed_knight', 'arcane_sentinel'], per: [1, 3] },
        boss: { kind: 'cursed_knight', name: 'The Hollow Keeper' },
        chests: ['spectral_dust', 'ancient_scroll', 'health_potion', 'mana_potion', 'soul_gem_mana', 'gold_circlet', 'great_helm'],
        chestRooms: 3,
        exit: { to: 'ruins_of_eldoria', spawn: 'from_vaults_gate', label: "Up to the keepers' way" },
        down: { to: 'ruins_of_eldoria', spawn: 'from_vaults', label: 'Up the far stair — beside the Heartstone Chamber' },
    },
    // The Sanguine Vaults (album Crimson Covenant: "a subterranean metropolis… the central headquarters and energy bank
    // of the Crimson Covenant", built ~220 BGD; world_lore: its frequency dips close to Nythoria). In 501 AGD: sealed
    // and long emptied of its masters — what is left are the halls where the tithes were taken, the cisterns where the
    // souls were banked, and what the bank never paid out. Game-only contents (origin: game) — names descriptive until
    // the canon check. Behind the blood-red door of the gatehouse, opened by reading its seal with Aether Sight.
    sanguine_vaults_1: {
        id: 'sanguine_vaults_1', name: 'The Sanguine Vaults — the tithe halls', seed: 2201, level: 30, size: 36, rooms: 9, theme: 'sanguine',
        enemies: { kinds: ['grave_wraith', 'grave_wraith', 'cave_bat', 'blind_stalker', 'plague_rat'], per: [2, 3] },
        boss: { kind: 'cursed_knight', name: 'The Tithe-Keeper' },
        chests: ['spectral_dust', 'spectral_dust', 'health_potion', 'mana_potion', 'soul_gem_mana', 'ancient_scroll', 'gold_circlet'],
        chestRooms: 3,
        exit: { to: 'eldoria', spawn: 'sanguine_vaults', label: 'Up the stair — the gatehouse' },
        down: { to: 'sanguine_vaults_2', label: 'Down to the soul-cisterns' },
    },
    sanguine_vaults_2: {
        id: 'sanguine_vaults_2', name: 'The Sanguine Vaults — the soul-cisterns', seed: 2202, level: 33, size: 38, rooms: 9, layout: 'maze', theme: 'sanguine',
        enemies: { kinds: ['grave_wraith', 'grave_wraith', 'deep_horror', 'blind_stalker', 'arcane_sentinel'], per: [2, 3] },
        boss: { kind: 'deep_horror', name: 'What Drinks in the Cisterns' },
        chests: ['soul_gem_mana', 'soul_gem_mana', 'heart_crystal', 'spectral_dust', 'ancient_scroll', 'health_potion', 'mana_potion'],
        chestRooms: 3,
        exit: { to: 'sanguine_vaults_1', spawn: 'from_below', label: 'Back up to the tithe halls' },
    },
};
