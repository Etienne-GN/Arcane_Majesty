// W4: Thaloria's people and the places their days take them. Hand-written; tile
// coordinates on the city map unless a place names an interior. Day shapes come
// from roles.js; '@home', '@work', '@evening', '@wander', '@patrol' are each
// resident's own fields. A place with `indoors` is the tile in front of a house
// door (no interior): they go in and are gone until their next slot. Named people
// (npc) keep their dialogue, quests and shops (data/npcs.js, dialogues.js).
// No new lore: every role here is unnamed.
const seat = (x, y, facing) => ({ interior: 'thaloria_inn', x, y, facing });

export const THALORIA_TOWN = {
    id: 'thaloria',
    places: {
        // homes
        college:      { x: 5, y: 8, indoors: true },     // the college's scholars sleep in
        house_north:  { x: 20, y: 8, indoors: true },
        house_east:   { x: 26, y: 8, indoors: true },
        house_south:  { x: 26, y: 18, indoors: true },
        teal_house:   { interior: 'thaloria_house_teal', x: 5, y: 6 },
        inn_rooms:    { interior: 'thaloria_inn', x: 16, y: 10, indoors: true },  // they turn in below, by the cellar hatch
        // work
        stall_merchant: { x: 16, y: 22, facing: 'down' },
        stall_carto:    { x: 19, y: 22, facing: 'down' },
        stall_a:        { x: 11, y: 22, facing: 'down' },
        stall_b:        { x: 14, y: 22, facing: 'down' },
        inn_door_yard:  { x: 7, y: 19, facing: 'down' },
        inn_bar:        { interior: 'thaloria_inn', x: 12, y: 6, facing: 'down' },
        well:           { x: 13, y: 15, facing: 'up' },
        hearth_yard:    { x: 22, y: 23, facing: 'right' },
        woodpile:       { x: 25, y: 20, facing: 'down' },
        tower_desk:     { interior: 'thaloria_bell_tower', x: 5, y: 4, facing: 'up' },
        beggar_corner:  { x: 10, y: 14, facing: 'right', outdoors: true },
        // the inn's common room: one seat each
        inn_seat_1: seat(3, 4, 'down'),  inn_seat_2: seat(4, 4, 'down'),  inn_seat_3: seat(7, 4, 'down'),
        inn_seat_4: seat(8, 4, 'down'),  inn_seat_5: seat(2, 6, 'up'),    inn_seat_6: seat(3, 6, 'up'),
        inn_seat_7: seat(7, 6, 'up'),    inn_seat_8: seat(8, 6, 'up'),    inn_seat_9: seat(9, 6, 'up'),
        inn_seat_10: seat(4, 7, 'up'),   inn_seat_11: seat(5, 7, 'up'),   inn_seat_12: seat(6, 7, 'up'),
        // areas
        square:      { x: 11, y: 10, w: 10, h: 6 },
        high_street: { x: 3, y: 12, w: 20, h: 2 },
        market:      { x: 9, y: 19, w: 14, h: 5 },
        // patrols
        watch_high_street: { route: [[2, 12], [29, 12], [29, 13], [2, 13]] },
        watch_market:      { route: [[15, 8], [16, 18], [27, 18], [3, 18], [16, 18]] },
    },
    residents: [
        // named — they keep their dialogue, quests and shops
        { id: 'innkeeper', role: 'merchant', look: 'look_00',
          schedule: [{ from: 1, to: 7, at: 'inn_rooms', activity: 'sleep' }, { from: 7, to: 1, at: 'inn_bar', activity: 'work' }],
          npc: { id: 'innkeeper', name: 'Innkeeper', dialogue: 'innkeeper_greeting', afterDialogue: 'innkeeper_after' } },
        { id: 'thaloria_trader', role: 'merchant', look: 'look_01',
          schedule: [{ from: 23, to: 8, at: 'inn_rooms', activity: 'sleep' }, { from: 8, to: 19, at: 'inn_door_yard', activity: 'work' },
                     { from: 19, to: 23, at: 'inn_seat_1', activity: 'sit' }],
          npc: { id: 'thaloria_trader', name: 'Trader', dialogue: 'trader_greeting', afterDialogue: 'trader_after' } },
        { id: 'thaloria_merchant', role: 'merchant', look: 'look_02', home: 'house_south', work: 'stall_merchant', evening: 'inn_seat_2',
          npc: { id: 'thaloria_merchant', name: 'Merchant', isShop: true, shopName: 'THALORIA MARKET',
                 dialogue: 'thaloria_merchant_greeting', afterDialogue: 'thaloria_merchant_greeting' } },
        { id: 'thaloria_cartographer', role: 'merchant', look: 'look_03', home: 'house_east', work: 'stall_carto', evening: 'inn_seat_3',
          npc: { id: 'thaloria_cartographer', name: 'Cartographer', isShop: true, shopName: 'THE CARTOGRAPHER', catalog: 'cartographer',
                 dialogue: 'cartographer_greeting', afterDialogue: 'cartographer_greeting' } },
        // the market
        { id: 'stallholder_a', role: 'merchant', look: 'look_04', home: 'house_north', work: 'stall_a', evening: 'inn_seat_4' },
        { id: 'stallholder_b', role: 'merchant', look: 'look_05', home: 'house_south', work: 'stall_b', evening: 'inn_seat_5' },
        { id: 'labourer_well', role: 'labourer', look: 'look_06', home: 'house_north', work: 'well', evening: 'inn_seat_6' },
        { id: 'labourer_yard', role: 'labourer', look: 'look_07', home: 'house_east', work: 'hearth_yard', evening: 'inn_seat_7' },
        { id: 'porter', role: 'labourer', look: 'look_08', home: 'teal_house', work: 'woodpile', evening: 'inn_seat_12' },
        { id: 'noble_market', role: 'noble', look: 'look_09', home: 'college', wander: 'market', evening: 'inn_seat_8' },
        { id: 'noble_square', role: 'noble', look: 'look_10', home: 'college', wander: 'square', evening: 'inn_seat_9' },
        { id: 'child_square', role: 'child', look: 'look_18', home: 'house_north', wander: 'square' },
        { id: 'child_market', role: 'child', look: 'look_19', home: 'house_south', wander: 'market' },
        { id: 'child_street', role: 'child', look: 'look_20', home: 'house_east', wander: 'high_street' },
        { id: 'scholar', role: 'priest', look: 'look_11', home: 'college', work: 'tower_desk' },
        { id: 'beggar', role: 'beggar', look: 'look_12', work: 'beggar_corner' },
        { id: 'drunk_one', role: 'drunk', look: 'look_13', home: 'house_east', evening: 'inn_seat_10', wander: 'high_street' },
        { id: 'drunk_two', role: 'drunk', look: 'look_14', home: 'house_north', evening: 'inn_seat_11', wander: 'high_street' },
        // the watch
        { id: 'guard_day_street', role: 'guard', shift: 'day', look: 'look_21', home: 'college', patrol: 'watch_high_street' },
        { id: 'guard_day_market', role: 'guard', shift: 'day', look: 'look_22', home: 'house_south', patrol: 'watch_market' },
        { id: 'guard_night_street', role: 'guard', shift: 'night', look: 'look_23', home: 'college', patrol: 'watch_high_street' },
        { id: 'guard_night_market', role: 'guard', shift: 'night', look: 'look_21', home: 'house_east', patrol: 'watch_market' },
    ],
};
