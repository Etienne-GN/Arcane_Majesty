// The dungeons (engine/dungeon.js builds each level from its seed). Game-only places (origin: game).
// The Deep Shaft under Iron Hollow — the miners' closed shaft where "something cracks the props at night":
// level 1 the old workings, level 2 the deep gallery and what lives there.
export const DUNGEONS = {
    iron_hollow_shaft_1: {
        id: 'iron_hollow_shaft_1', name: 'The Deep Shaft — the old workings', seed: 7101, size: 34, rooms: 8, theme: 'mine',
        enemies: { kinds: ['crag_fiend', 'cave_bat', 'cave_bat', 'blind_stalker'], per: [1, 3] },
        boss: { kind: 'crag_fiend', name: 'The Prop-Breaker' },
        chests: ['mineral_ore', 'mineral_ore', 'silver_ore', 'health_potion', 'mana_potion', 'ember_stone'],
        exit: { to: 'iron_hollow', spawn: 'from_shaft', label: 'Up the ladder — Iron Hollow' },
        down: { to: 'iron_hollow_shaft_2', label: 'Down into the deep gallery' },
    },
    iron_hollow_shaft_2: {
        id: 'iron_hollow_shaft_2', name: 'The Deep Shaft — the deep gallery', seed: 7202, size: 38, rooms: 9, theme: 'mine',
        enemies: { kinds: ['blind_stalker', 'cave_bat', 'crag_fiend', 'void_stalker'], per: [2, 3] },
        boss: { kind: 'deep_horror', name: 'The Thing in the Deep' },
        chests: ['silver_ore', 'silver_ore', 'heart_crystal', 'health_potion', 'soul_gem_mana', 'steel_gauntlets', 'mail_coif', 'ancient_scroll'],
        chestRooms: 3,
        exit: { to: 'iron_hollow_shaft_1', spawn: 'from_below', label: 'Back up to the old workings' },
    },
};
