// W4/W6: Thaloria's people. The places they use come from the city generator
// (thaloria_places.js: door fronts, rooms' work spots, stalls, posts, areas,
// patrols); the inn's seats and rooms below are fixed spots in the inn, whose layout
// W6 kept. Day shapes come from roles.js; '@home', '@work', '@evening', '@wander',
// '@patrol' are each resident's own fields. A home is the door front of their house
// ('indoors': they go in and are out of sight). Named people (npc) keep their
// dialogue, quests and shops (data/npcs.js, dialogues.js). 40 residents share the 24
// baked looks; two people with one look live in different districts. No new lore.
import { THALORIA_PLACES } from './thaloria_places.js';

const seat = (x, y, facing) => ({ interior: 'thaloria_inn', x, y, facing });
const dayPost = post => [{ from: 6, to: 18, at: post, activity: 'work' }, { from: 18, to: 6, at: 'door_barracks', activity: 'sleep' }];
const nightPost = post => [{ from: 18, to: 6, at: post, activity: 'work' }, { from: 6, to: 18, at: 'door_barracks', activity: 'sleep' }];
const archivist = home => [{ from: 22, to: 7, at: home, activity: 'sleep' }, { from: 7, to: 22, at: 'wander:guild_floor', activity: 'wander' }];

export const THALORIA_TOWN = {
    id: 'thaloria',
    places: {
        ...THALORIA_PLACES,
        inn_rooms: { interior: 'thaloria_inn', x: 16, y: 10, indoors: true },   // they turn in below, by the cellar hatch
        inn_bar:   { interior: 'thaloria_inn', x: 12, y: 6, facing: 'down' },
        inn_seat_1: seat(3, 4, 'down'),  inn_seat_2: seat(4, 4, 'down'),  inn_seat_3: seat(7, 4, 'down'),
        inn_seat_4: seat(8, 4, 'down'),  inn_seat_5: seat(2, 6, 'up'),    inn_seat_6: seat(3, 6, 'up'),
        inn_seat_7: seat(7, 6, 'up'),    inn_seat_8: seat(8, 6, 'up'),    inn_seat_9: seat(9, 6, 'up'),
        inn_seat_10: seat(4, 7, 'up'),   inn_seat_11: seat(5, 7, 'up'),   inn_seat_12: seat(6, 7, 'up'),
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
        { id: 'thaloria_merchant', role: 'merchant', look: 'look_02', home: 'door_house_market_b', work: 'stall_2', evening: 'inn_seat_2',
          npc: { id: 'thaloria_merchant', name: 'Merchant', isShop: true, shopName: 'THALORIA MARKET',
                 dialogue: 'thaloria_merchant_greeting', afterDialogue: 'thaloria_merchant_greeting' } },
        { id: 'thaloria_cartographer', role: 'merchant', look: 'look_03', home: 'door_house_temple', work: 'stall_5', evening: 'inn_seat_3',
          npc: { id: 'thaloria_cartographer', name: 'Cartographer', isShop: true, shopName: 'THE CARTOGRAPHER', catalog: 'cartographer',
                 dialogue: 'cartographer_greeting', afterDialogue: 'cartographer_greeting' } },
        // the market
        { id: 'stallholder_a', role: 'merchant', look: 'look_04', home: 'door_house_low_b', work: 'stall_1', evening: 'inn_seat_4' },
        { id: 'stallholder_b', role: 'merchant', look: 'look_05', home: 'door_house_market_a', work: 'stall_3', evening: 'inn_seat_5' },
        { id: 'stallholder_c', role: 'merchant', look: 'look_06', home: 'door_house_low_d', work: 'stall_4', evening: 'inn_seat_6' },
        { id: 'hall_keeper', role: 'merchant', look: 'look_07', home: 'door_house_low_f', work: 'thaloria_market_hall__counter', evening: 'door_house_low_f' },
        { id: 'alchemist', role: 'merchant', look: 'look_08', home: 'door_house_market_a', work: 'thaloria_alchemist__counter', evening: 'door_house_market_a' },
        // labour
        { id: 'smith', role: 'labourer', look: 'look_09', home: 'door_house_low_c', work: 'thaloria_smithy__smith', evening: 'inn_seat_7' },
        { id: 'labourer_well', role: 'labourer', look: 'look_10', home: 'door_house_low_a', work: 'well', evening: 'inn_seat_8' },
        { id: 'labourer_yard', role: 'labourer', look: 'look_11', home: 'door_house_low_e', work: 'hearth_yard', evening: 'inn_seat_9' },
        { id: 'porter', role: 'labourer', look: 'look_12', home: 'door_house_teal', work: 'woodpile', evening: 'inn_seat_10' },
        // the temple quarter and the Archivist's Guild
        { id: 'priest', role: 'priest', look: 'look_13', home: 'door_temple', work: 'thaloria_temple__altar' },
        { id: 'acolyte', role: 'priest', look: 'look_14', home: 'door_temple', work: 'temple_steps' },
        { id: 'archivist_master', role: 'priest', look: 'look_15', home: 'door_guild_hall', work: 'thaloria_guild_hall__master' },
        { id: 'archivist_a', role: 'priest', look: 'look_16', schedule: archivist('door_house_noble_c') },
        { id: 'archivist_b', role: 'priest', look: 'look_17', schedule: archivist('door_guild_hall') },
        { id: 'bell_ringer', role: 'priest', look: 'look_06', home: 'door_guild_hall', work: 'thaloria_bell_tower__desk' },
        // the noble hill
        { id: 'lord', role: 'noble', look: 'look_09', home: 'door_manor', wander: 'noble_garden', evening: 'door_manor' },
        { id: 'lady', role: 'noble', look: 'look_17', home: 'door_manor', wander: 'square', evening: 'door_manor' },
        { id: 'noble_b', role: 'noble', look: 'look_11', home: 'door_house_noble_a', wander: 'noble_garden', evening: 'door_house_noble_a' },
        { id: 'noble_c', role: 'noble', look: 'look_12', home: 'door_house_noble_b', wander: 'temple_court', evening: 'door_house_noble_b' },
        // children
        { id: 'child_square', role: 'child', look: 'look_20', home: 'door_house_low_a', wander: 'square' },
        { id: 'child_market', role: 'child', look: 'look_19', home: 'door_house_market_a', wander: 'market' },
        { id: 'child_lane', role: 'child', look: 'look_18', home: 'door_house_low_d', wander: 'lower_lane' },
        { id: 'child_noble', role: 'child', look: 'look_19', home: 'door_manor', wander: 'noble_garden' },
        { id: 'child_gate', role: 'child', look: 'look_18', home: 'door_house_market_b', wander: 'square' },
        // the poor and the merry
        { id: 'beggar_square', role: 'beggar', look: 'look_16', work: 'beggar_square' },
        { id: 'beggar_gate', role: 'beggar', look: 'look_05', work: 'beggar_gate' },
        { id: 'drunk_one', role: 'drunk', look: 'look_14', home: 'door_house_low_b', evening: 'inn_seat_11', wander: 'market' },
        { id: 'drunk_two', role: 'drunk', look: 'look_08', home: 'door_house_low_e', evening: 'inn_seat_12', wander: 'market' },
        // the watch: the gates by day and by night, and two patrols each shift
        { id: 'guard_west_day', role: 'guard', look: 'look_21', schedule: dayPost('post_west_gate') },
        { id: 'guard_east_day', role: 'guard', look: 'look_22', schedule: dayPost('post_east_gate') },
        { id: 'guard_west_night', role: 'guard', look: 'look_23', schedule: nightPost('post_west_gate_b') },
        { id: 'guard_east_night', role: 'guard', look: 'look_21', schedule: nightPost('post_east_gate_b') },
        { id: 'guard_day_street', role: 'guard', shift: 'day', look: 'look_22', home: 'door_barracks', patrol: 'watch_high_street' },
        { id: 'guard_day_market', role: 'guard', shift: 'day', look: 'look_23', home: 'door_barracks', patrol: 'watch_market' },
        { id: 'guard_night_street', role: 'guard', shift: 'night', look: 'look_21', home: 'door_barracks', patrol: 'watch_high_street' },
        { id: 'guard_night_lower', role: 'guard', shift: 'night', look: 'look_22', home: 'door_barracks', patrol: 'watch_lower' },
    ],
};
