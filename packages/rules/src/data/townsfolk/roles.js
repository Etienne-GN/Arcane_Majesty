// W4: the shape of a day for each role (spec: guard, merchant, labourer, child,
// priest, noble, beggar, drunk). Hours; a slot may wrap midnight. '@field' is the
// resident's own place (home, work, evening, wander, patrol). Sleep and 'home'
// hide a person indoors; see schedules.js.
export const ROLES = {
    merchant: { schedule: [
        { from: 0,  to: 8,  at: '@home',    activity: 'sleep' },
        { from: 8,  to: 18, at: '@work',    activity: 'work' },
        { from: 18, to: 24, at: '@evening', activity: 'sit' },
    ] },
    labourer: { schedule: [
        { from: 0,  to: 6,  at: '@home',    activity: 'sleep' },
        { from: 6,  to: 17, at: '@work',    activity: 'work' },
        { from: 17, to: 24, at: '@evening', activity: 'sit' },
    ] },
    child: { schedule: [
        { from: 20, to: 7,  at: '@home',          activity: 'sleep' },
        { from: 7,  to: 12, at: 'wander:@wander', activity: 'wander' },
        { from: 12, to: 13, at: '@home',          activity: 'home' },
        { from: 13, to: 20, at: 'wander:@wander', activity: 'wander' },
    ] },
    priest: { schedule: [
        { from: 21, to: 6,  at: '@home', activity: 'sleep' },
        { from: 6,  to: 21, at: '@work', activity: 'work' },
    ] },
    noble: { schedule: [
        { from: 0,  to: 8,  at: '@home',          activity: 'sleep' },
        { from: 8,  to: 12, at: 'wander:@wander', activity: 'wander' },
        { from: 12, to: 14, at: '@home',          activity: 'home' },
        { from: 14, to: 19, at: 'wander:@wander', activity: 'wander' },
        { from: 19, to: 24, at: '@evening',       activity: 'sit' },
    ] },
    beggar: { schedule: [
        { from: 22, to: 7,  at: '@work', activity: 'sleep' },
        { from: 7,  to: 22, at: '@work', activity: 'sit' },
    ] },
    // Out only in the evening (spec)
    drunk: { schedule: [
        { from: 3,  to: 19, at: '@home',          activity: 'home' },
        { from: 19, to: 2,  at: '@evening',       activity: 'sit' },
        { from: 2,  to: 3,  at: 'wander:@wander', activity: 'wander' },
    ] },
    guard: { shifts: {
        day: [
            { from: 6,  to: 18, at: 'patrol:@patrol', activity: 'patrol' },
            { from: 18, to: 6,  at: '@home',          activity: 'sleep' },
        ],
        night: [
            { from: 18, to: 6,  at: 'patrol:@patrol', activity: 'patrol' },
            { from: 6,  to: 18, at: '@home',          activity: 'sleep' },
        ],
    } },
};
