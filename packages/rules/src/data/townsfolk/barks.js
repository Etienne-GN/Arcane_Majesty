// W4: townsfolk lines (E on anyone without a name). Generic voices — no new lore;
// places named are already in the game (the bell tower, the East Road, the Summit).
// A line may need hours [from, to), a weather id (data/weather.js) or a story flag.
export const BARKS = {
    guard: [
        { text: 'Keep to the lit streets after dark.', hours: [20, 5] },
        { text: 'Quiet night. I like them quiet.', hours: [22, 5] },
        { text: 'Rain gets into the mail. Rusts by morning.', weather: ['rain', 'storm'] },
        { text: 'Move along, traveller. Nothing to see here.' },
        { text: 'If you are taking the East Road, go armed.' },
        { text: 'The gate shuts for no one, but we watch who comes through it.' },
    ],
    merchant: [
        { text: 'Fresh this morning! Well — fresh enough.', hours: [8, 11] },
        { text: 'Not much trade in this weather.', weather: ['rain', 'storm', 'snow'] },
        { text: 'Coin first, questions after.' },
        { text: 'Prices go up when the roads go bad. They have gone bad.' },
        { text: 'Mind the crates, they bite back.' },
    ],
    labourer: [
        { text: 'Back aches before the sun is even up.', hours: [5, 9] },
        { text: 'Wet hands, cold work.', weather: ['rain', 'storm', 'snow'] },
        { text: 'A day\'s work for a day\'s bread.' },
        { text: 'Hauling stone for scholars. They never lift a thing.' },
        { text: 'Out of the way, this load is heavy!' },
    ],
    child: [
        { text: 'Bet you can\'t catch me!' },
        { text: 'Is that a real sword?' },
        { text: 'My mother says not to talk to strangers. You\'re a stranger.' },
        { text: 'I\'m allowed out till the bell. The bell is always wrong, so I\'m allowed out longer.' },
        { text: 'Puddles!', weather: ['rain', 'storm'] },
    ],
    priest: [
        { text: 'The bell keeps its own time. We forgive it.' },
        { text: 'May the road be kind to you.' },
        { text: 'Even the archives were young once.' },
        { text: 'Up early? Good. The quiet hours are the honest ones.', hours: [5, 8] },
    ],
    noble: [
        { text: 'Do I know you? No, I would remember the smell of the road.' },
        { text: 'One does not hurry in Thaloria.' },
        { text: 'Dreadful weather. Simply dreadful.', weather: ['rain', 'storm', 'snow'] },
        { text: 'The libraries are the city\'s jewel. The rest is merely streets.' },
    ],
    beggar: [
        { text: 'A coin for an old soldier?' },
        { text: 'Cold tonight. Colder than last.', hours: [20, 6] },
        { text: 'Seen things on that road, I have. Things that walk wrong.' },
        { text: 'Bless you anyway.' },
    ],
    drunk: [
        { text: 'Another round! …Is it my round?', hours: [19, 3] },
        { text: 'The Summit… you don\'t go up the Summit. Nobody comes down the same.' },
        { text: 'I\'m not drunk. The street is crooked.' },
        { text: 'Shh. The bell will hear you.' },
    ],
    anyone: [
        { text: 'Good morning.', hours: [6, 11] },
        { text: 'Good evening.', hours: [18, 22] },
        { text: 'Lovely day for it.', weather: ['clear'] },
        { text: 'Stay dry, friend.', weather: ['rain', 'storm'] },
        { text: 'Mm?' },
        { text: 'Safe travels.' },
    ],
};
