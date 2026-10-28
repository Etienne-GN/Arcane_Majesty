// Combat C3 (docs/superpowers/specs/2026-10-26-combat-weapons-design.md §4): the
// first fighting style of each close-combat weapon. A style brings three skills,
// opened by that weapon's mastery 2, 5 and 8. Skills sit on Q/R/F/T beside spells.
// Rules: systems/styles.js · play: systems/StyleSkills.js · tools/test_styles.mjs.
//
// A skill: unlock = weapon mastery · cd = cooldown ms · kind = how it plays:
//   strike (in front) · spin (all around) · line (a row ahead) · dash (lunge, then a
//   line) · leap (jump ahead, then a spin) · flurry (quick strikes) · buff (a stance
//   on you) · taunt · shadowstep.
// mult multiplies the weapon's normal hit; status / statusMs go on whoever is hit;
// buff / buffMs go on you (data/statuses.js).

export const STYLES = {
    guard:          { id: 'guard',          name: 'Guard',          weapon: 'sword',      blurb: 'Stop their blow, then answer it.',          skills: ['parry', 'riposte', 'steady_advance'] },
    reaver:         { id: 'reaver',         name: 'Reaver',         weapon: 'greatsword', blurb: 'Big swings that clear a crowd.',             skills: ['whirlwind', 'cleave', 'rampage'] },
    shadow:         { id: 'shadow',         name: 'Shadow',         weapon: 'dagger',     blurb: 'Disappear, then strike from behind.',        skills: ['vanish', 'backstab', 'shadowstep'] },
    lancer:         { id: 'lancer',         name: 'Lancer',         weapon: 'spear',      blurb: 'Lunge and leap — strike from far away.',     skills: ['piercing_lunge', 'leaping_strike', 'run_through'] },
    spinning_staff: { id: 'spinning_staff', name: 'Spinning Staff', weapon: 'bo',         blurb: 'Fast blows and a guard against arrows.',     skills: ['flurry_of_blows', 'deflect_arrows', 'windmill'] },
    crusher:        { id: 'crusher',        name: 'Crusher',        weapon: 'mace',       blurb: 'Break bones, stun, crack armour.',           skills: ['bone_breaker', 'stunning_blow', 'shatter_armour'] },
    berserker:      { id: 'berserker',      name: 'Berserker',      weapon: 'axe',        blurb: 'Rage, bleed them, swing faster.',            skills: ['rage', 'bleeding_chop', 'frenzy'] },
    bulwark:        { id: 'bulwark',        name: 'Bulwark',        weapon: 'shield',     blurb: 'Hold the line — nothing gets through.',      skills: ['perfect_block', 'taunt', 'shield_wall'] },
    brawler:        { id: 'brawler',        name: 'Brawler',        weapon: 'fists',      blurb: 'Big punches, throws and headbutts.',         skills: ['haymaker', 'grab_and_throw', 'headbutt'] },
};
export const STYLE_IDS = Object.keys(STYLES);
export const stylesFor = weapon => Object.values(STYLES).filter(s => s.weapon === weapon);

const S = (id, name, style, unlock, cd, kind, desc, params = {}) =>
    [id, { id, name, style, weapon: STYLES[style].weapon, unlock, cd, kind, desc, ...params }];

export const STYLE_SKILLS = Object.fromEntries([
    // Guard — one-handed sword
    S('parry',          'Parry',          'guard', 2, 4000,  'buff',   'Raise your blade: the next hit from the front does nothing and dazes the attacker.', { buff: 'parrying', buffMs: 800 }),
    S('riposte',        'Riposte',        'guard', 5, 5000,  'strike', 'A hard counter-cut. Even harder right after a parry.', { mult: 2.0, reach: 30, radius: 30, parryMult: 1.5 }),
    S('steady_advance', 'Steady Advance', 'guard', 8, 20000, 'buff',   'Hold your guard: take 40% less damage for 5 seconds.', { buff: 'steady', buffMs: 5000 }),
    // Reaver — two-handed sword
    S('whirlwind',      'Whirlwind',      'reaver', 2, 5000,  'spin',   'Spin with the blade and hit everyone around you.', { mult: 1.4, radius: 56 }),
    S('cleave',         'Cleave',         'reaver', 5, 6000,  'strike', 'One huge swing that cuts up to four enemies in front.', { mult: 2.0, reach: 34, radius: 52, max: 4 }),
    S('rampage',        'Rampage',        'reaver', 8, 25000, 'buff',   'For 6 seconds: 40% more damage and faster swings.', { buff: 'rampage', buffMs: 6000 }),
    // Shadow — dagger
    S('vanish',         'Vanish',         'shadow', 2, 15000, 'buff',   'Enemies lose sight of you for 3 seconds. Your next hit does double damage.', { buff: 'vanished', buffMs: 3000 }),
    S('backstab',       'Backstab',       'shadow', 5, 6000,  'strike', 'A quick stab — three times as strong from behind.', { mult: 1.5, reach: 26, radius: 26, behindMult: 3 }),
    S('shadowstep',     'Shadowstep',     'shadow', 8, 10000, 'shadowstep', 'Step behind the nearest enemy and face its back.', { range: 140 }),
    // Lancer — spear
    S('piercing_lunge', 'Piercing Lunge', 'lancer', 2, 5000,  'dash',   'Lunge forward and pierce everything in a line.', { mult: 1.6, dist: 48, length: 96 }),
    S('leaping_strike', 'Leaping Strike', 'lancer', 5, 8000,  'leap',   'Jump ahead and land in the middle of them.', { mult: 1.5, dist: 90, radius: 44 }),
    S('run_through',    'Run Through',    'lancer', 8, 9000,  'line',   'A thrust that goes through a whole row of enemies.', { mult: 2.5, length: 120 }),
    // Spinning Staff — bo staff
    S('flurry_of_blows', 'Flurry of Blows', 'spinning_staff', 2, 5000,  'flurry', 'Four fast blows in front of you.', { mult: 0.6, reach: 40, radius: 30, hits: 4, gap: 90 }),
    S('deflect_arrows',  'Deflect Arrows',  'spinning_staff', 5, 15000, 'buff',   'Spin the staff: for 3 seconds, hits from far away do nothing.', { buff: 'deflecting', buffMs: 3000 }),
    S('windmill',        'Windmill',        'spinning_staff', 8, 9000,  'spin',   'A wide spin that throws enemies back.', { mult: 1.3, radius: 60, knock: 320 }),
    // Crusher — mace
    S('bone_breaker',   'Bone Breaker',   'crusher', 2, 6000,  'strike', 'A heavy blow that slows the target for 4 seconds.', { mult: 1.8, reach: 30, radius: 30, status: 'crippled', statusMs: 4000 }),
    S('stunning_blow',  'Stunning Blow',  'crusher', 5, 9000,  'strike', 'A blow to the head: the target is stunned.', { mult: 1.4, reach: 30, radius: 30, status: 'dazed', statusMs: 1500 }),
    S('shatter_armour', 'Shatter Armour', 'crusher', 8, 12000, 'strike', 'Crack their armour: they take 30% more damage for 8 seconds.', { mult: 1.6, reach: 30, radius: 30, status: 'sundered', statusMs: 8000 }),
    // Berserker — axe
    S('rage',           'Rage',           'berserker', 2, 25000, 'buff',   'For 8 seconds: 25% more damage, but you take 10% more.', { buff: 'raging', buffMs: 8000 }),
    S('bleeding_chop',  'Bleeding Chop',  'berserker', 5, 6000,  'strike', 'A chop that makes the target bleed.', { mult: 1.5, reach: 30, radius: 34, status: 'bleeding', statusMs: 6000 }),
    S('frenzy',         'Frenzy',         'berserker', 8, 25000, 'buff',   'Swing 40% faster for 5 seconds.', { buff: 'frenzy', buffMs: 5000 }),
    // Bulwark — shield
    S('perfect_block',  'Perfect Block',  'bulwark', 2, 5000,  'buff',   'For a moment, every hit does nothing and dazes the attacker.', { buff: 'perfect_block', buffMs: 600 }),
    S('taunt',          'Taunt',          'bulwark', 5, 15000, 'taunt',  'Call enemies to you: they stop casting and come. You take 30% less damage for 4 seconds.', { buff: 'taunting', buffMs: 4000, radius: 160 }),
    S('shield_wall',    'Shield Wall',    'bulwark', 8, 25000, 'buff',   'For 6 seconds hits from the front do almost nothing, but you walk slower.', { buff: 'shield_wall', buffMs: 6000 }),
    // Brawler — fists
    S('haymaker',       'Haymaker',       'brawler', 2, 5000,  'strike', 'A big punch that knocks the target back.', { mult: 2.2, reach: 24, radius: 28, knock: 300 }),
    S('grab_and_throw', 'Grab & Throw',   'brawler', 5, 8000,  'strike', 'Grab the enemy and throw it away. It is stunned for a second.', { mult: 1.5, reach: 24, radius: 28, max: 1, knock: 420, status: 'dazed', statusMs: 1000 }),
    S('headbutt',       'Headbutt',       'brawler', 8, 10000, 'strike', 'A headbutt that stuns the target for 2 seconds.', { mult: 1.8, reach: 24, radius: 28, max: 1, status: 'dazed', statusMs: 2000 }),
]);
