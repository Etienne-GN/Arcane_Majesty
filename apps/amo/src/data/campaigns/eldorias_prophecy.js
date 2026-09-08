// Eldoria's Prophecy — the campaign spine.
// Transcribed from data/lore/campaigns/Eldorias_Prophecy_campaign.md's
// song-by-song breakdown; each chapter's `maps` is that song's own
// "Map/area" line. See docs/superpowers/specs/2026-09-08-eldorias-prophecy-campaign-spine-design.md
// for how this is read (chapters own maps, not the reverse — three
// chapters span two maps each, and chapters 11-12 revisit maps chapters
// 1-9 already opened).
//
// Ten of twelve chapters point at scaffolding maps/quests (src/data/maps/
// _stubs.js, quests.js's "Campaign spine scaffolding" section) — replaced
// one chapter at a time as real content lands. Chapters 1 and 4 are real
// today: main_read_the_erasure (echoes_of_stone) and
// main_whisperer_of_doubt (summit_of_despair) already exist and are
// already completable.

export const ELDORIAS_PROPHECY = {
    id: 'eldorias_prophecy',
    title: "Eldoria's Prophecy",
    protagonist: 'eldrin',
    chapters: [
        {
            id: 'ch01_echoes_of_stone', song: 1, act: 1,
            title: 'Echoes of Stone',
            maps: ['eldrin_tower', 'echoes_of_stone'],
            quests: ['main_read_the_erasure'],
            // Scholar's Staff is already delivered by echoes_of_stone's own
            // chest (spawns.chests) — granting it again here would add a
            // second, non-stackable copy to the inventory.
            unlocks: [],
            boss: null,
        },
        {
            id: 'ch02_dreamweavers_call', song: 2, act: 1,
            title: "Dreamweaver's Call",
            maps: ['aetheric_vision'],
            quests: ['stub_ch02_dreamweavers_call'],
            // Bible names "first spell" here — no safe existing mechanic to
            // grant a specific spell without inventing which one; left
            // ungranted rather than guessed.
            unlocks: [],
            boss: null,
        },
        {
            id: 'ch03_odysseys_dawn', song: 3, act: 1,
            title: "Odyssey's Dawn",
            maps: ['thaloria', 'east_road'],
            quests: ['stub_ch03_odysseys_dawn'],
            // Bible names "Spell-Blade + Rift-Gate tease" — same reasoning
            // as chapter 2; nothing safe to map it to yet.
            unlocks: [],
            boss: null, // early optional miniboss, not a real gate
        },
        {
            id: 'ch04_summit_of_despair', song: 4, act: 2,
            title: 'Summit of Despair',
            maps: ['summit_of_despair'],
            quests: ['main_whisperer_of_doubt'],
            // Bible's "Aether Sight (4-5)" begins here but is only formally
            // completed at Sylvan Sanctuary (song 5) per that location's
            // own spec — granted there, not here.
            unlocks: [],
            boss: 'malphas',
        },
        {
            id: 'ch05_sylvan_sanctuary', song: 5, act: 2,
            title: 'Sylvan Sanctuary',
            maps: ['sylvan_sanctuary'],
            quests: ['stub_ch05_sylvan_sanctuary'],
            unlocks: [{ type: 'ability', id: 'aetheric_sight' }],
            boss: 'the_elemental',
        },
        {
            id: 'ch06_treacherys_bite', song: 6, act: 2,
            title: "Treachery's Bite",
            maps: ['fire_gate'],
            quests: ['stub_ch06_treacherys_bite'],
            // Bible names "Umbral Dagger" — no such item exists yet.
            unlocks: [],
            boss: 'oren',
        },
        {
            id: 'ch07_the_solitary_path', song: 7, act: 2,
            title: 'The Solitary Path',
            maps: ['the_descent'],
            quests: ['stub_ch07_the_solitary_path'],
            // Bible names "Silent Guardian passive" — no such skill exists yet.
            unlocks: [],
            boss: null, // survival gauntlet, no boss
        },
        {
            id: 'ch08_infernos_trial', song: 8, act: 2,
            title: "Inferno's Trial",
            maps: ['inferno_labyrinth'],
            quests: ['stub_ch08_infernos_trial'],
            // Bible names "Runic Focus" — no such item/skill exists yet.
            unlocks: [],
            boss: 'xarathos',
        },
        {
            id: 'ch09_eldorias_heartbeat', song: 9, act: 3,
            title: "Eldoria's Heartbeat",
            maps: ['ruins_of_eldoria'],
            quests: ['stub_ch09_eldorias_heartbeat'],
            // Bible names "Aetheric Witness" — no such mechanic exists yet.
            unlocks: [],
            boss: 'voraun', // rune-dead gate puzzle, not yet a real fight
        },
        {
            id: 'ch10_heart_of_war', song: 10, act: 3,
            title: 'Heart of War',
            maps: ['heartstone_chamber', 'ancient_door'],
            quests: ['stub_ch10_heart_of_war'],
            // Bible names "Heartstone + ward" — no such item/mechanic exists yet.
            unlocks: [],
            boss: 'shadow_balrog',
        },
        {
            id: 'ch11_the_weight_of_eternity', song: 11, act: 3,
            title: 'The Weight of Eternity',
            maps: ['ruins_of_eldoria', 'thaloria'],
            quests: ['stub_ch11_the_weight_of_eternity'],
            unlocks: [],
            boss: null, // "the heaviest scene in the campaign" — no combat
        },
        {
            id: 'ch12_dawns_embrace', song: 12, act: 3,
            title: "Dawn's Embrace",
            maps: ['eldrin_tower'],
            quests: ['stub_ch12_dawns_embrace'],
            // Bible names "permanent ward + post-game Rift-Gates" — the
            // campaign's own finale reward; left ungranted until real.
            unlocks: [],
            boss: null,
        },
    ],
};
