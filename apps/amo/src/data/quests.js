// Quest definitions for AC1 — Prologue: The Forest Hunt

export const QUESTS = {

    // ── Main Quests ──────────────────────────────────────────────────────────

    main_forest_hunt: {
        id: 'main_forest_hunt',
        title: 'The Forest Hunt',
        type: 'main',
        description: 'The Hermit has asked you to clear the forest of dangerous creatures and uncover the source of the growing corruption.',
        steps: [
            { id: 'talk_hermit',  type: 'talk',  target: 'hermit',       label: 'Speak with the Hermit',          required: 1 },
            { id: 'kill_wolves',  type: 'kill',  target: 'wolf',         label: 'Defeat Forest Wolves',           required: 5 },
            { id: 'kill_shadow',  type: 'kill',  target: 'shadow_sprite',label: 'Defeat Shadow Sprites',          required: 3 },
            { id: 'attune_gate',  type: 'attune',target: 'any',          label: 'Attune to an Aetheric Monolith', required: 1 },
            { id: 'defeat_boss',  type: 'kill',  target: 'void_general', label: 'Defeat the Void General',        required: 1 },
        ],
        reward: { glint: 150, xp: 300, items: [] },
    },

    // ── Side Quests ───────────────────────────────────────────────────────────

    side_supply_run: {
        id: 'side_supply_run',
        title: "Silvara's Supply Run",
        type: 'side',
        description: 'The merchant Silvara needs raw materials from the forest to restock her supplies.',
        steps: [
            { id: 'gather_wood',    type: 'gather',   target: 'wood',       label: 'Gather Wood (0/3)',        required: 3 },
            { id: 'gather_ore',     type: 'gather',   target: 'mineral_ore',label: 'Gather Mineral Ore (0/2)', required: 2 },
            { id: 'return_silvara', type: 'talk',     target: 'silvara',    label: 'Return to Silvara',        required: 1 },
        ],
        reward: { glint: 80, xp: 100, items: ['health_potion', 'mana_potion'] },
    },

    side_read_the_signs: {
        id: 'side_read_the_signs',
        title: 'Echoes of the Ancient Ones',
        type: 'side',
        description: 'Weathered signs throughout the forest hold fragments of a forgotten story. Find them all.',
        steps: [
            { id: 'read_signs', type: 'read_signs', target: 'any', label: 'Read Ancient Signs (0/3)', required: 3 },
        ],
        reward: { glint: 60, xp: 80, items: ['ancient_scroll'] },
    },

    // ── Hidden Quests ─────────────────────────────────────────────────────────

    hidden_shadow_initiation: {
        id: 'hidden_shadow_initiation',
        title: 'Initiation of the Twilight Order',
        type: 'hidden',
        description: 'A shadow-marked stone pulses with dark energy. Its inscription demands proof of mastery over shadow.',
        steps: [
            { id: 'learn_veil',  type: 'spell',          target: 'shadow_veil', label: 'Comprehend Shadow Veil',               required: 1 },
            { id: 'kill_veil',   type: 'kill_with_veil', target: 'any',         label: 'Defeat enemies in Shadow Veil (0/8)',  required: 8 },
        ],
        reward: { glint: 0, xp: 250, items: ['twilight_fang'] },
    },

    hidden_covenant_scholar: {
        id: 'hidden_covenant_scholar',
        title: 'The Covenant Scholar',
        type: 'hidden',
        description: 'An ancient tome sealed by magical locks responds to your growing mastery of the arcane arts.',
        steps: [
            { id: 'reach_resonance', type: 'reach',       target: 'arcane_resonance', label: 'Reach 30 Arcane Resonance (0/30)', required: 30 },
            { id: 'attune_all',      type: 'attune_gates', target: 'any',             label: 'Attune to 3 Rift-Gates (0/3)',     required: 3 },
        ],
        reward: { glint: 0, xp: 300, items: ['staff_of_first_covenant'] },
    },

    hidden_hunters_trial: {
        id: 'hidden_hunters_trial',
        title: "The Hunter's Trial",
        type: 'hidden',
        description: 'An ancient training ground for forest hunters. Complete the trial to claim its forgotten prize.',
        steps: [
            { id: 'kill_bow',      type: 'kill_with_weapon', target: 'resonance_bow', label: 'Defeat enemies with a Resonance Bow (0/12)', required: 12 },
            { id: 'boss_bow',      type: 'kill_with_weapon', target: 'resonance_bow', label: 'Defeat the Void General with a bow',         required: 1, bossOnly: true },
        ],
        reward: { glint: 0, xp: 250, items: ['eternal_draw'] },
    },

    side_corrupted_hunt: {
        id: 'side_corrupted_hunt',
        title: 'Void-Touched Beasts',
        type: 'side',
        description: 'The forest wildlife has been twisted by void-corruption. Hunt the corrupted beasts before the taint spreads further.',
        steps: [
            { id: 'kill_c_boar',   type: 'kill', target: 'corrupted_boar',   label: 'Hunt Corrupted Boars (0/3)',   required: 3 },
            { id: 'kill_c_deer',   type: 'kill', target: 'corrupted_deer',   label: 'Hunt Corrupted Deer (0/2)',    required: 2 },
            { id: 'kill_c_rabbit', type: 'kill', target: 'corrupted_rabbit', label: 'Hunt Corrupted Rabbits (0/3)', required: 3 },
        ],
        reward: { glint: 70, xp: 90, items: ['health_potion', 'void_shard'] },
    },

    side_void_offering: {
        id: 'side_void_offering',
        title: "The Hermit's Offering",
        type: 'side',
        description: 'The Hermit spoke of void shards — crystallized corruption that resonates with fire. Collect them and return to him.',
        steps: [
            { id: 'collect_shards', type: 'collect', target: 'void_shard', label: 'Collect Void Shards (0/5)', required: 5 },
            { id: 'talk_hermit',    type: 'talk',    target: 'hermit',     label: 'Return to the Hermit',     required: 1 },
        ],
        reward: { glint: 60, xp: 100, items: ['mana_potion', 'mana_potion', 'ancient_scroll'] },
    },

    side_hunters_larder: {
        id: 'side_hunters_larder',
        title: "The Hunter's Larder",
        type: 'side',
        description: 'A true hunter wastes nothing. Cook your kills at a campfire to prepare proper provisions for the road ahead.',
        steps: [
            { id: 'cook_boar',    type: 'cook', target: 'roasted_boar',    label: 'Cook Roasted Boar',    required: 1 },
            { id: 'cook_venison', type: 'cook', target: 'roasted_venison', label: 'Cook Roasted Venison', required: 1 },
            { id: 'cook_rabbit',  type: 'cook', target: 'roasted_rabbit',  label: 'Cook Roasted Rabbit',  required: 1 },
        ],
        reward: { glint: 50, xp: 70, items: ['roasted_boar', 'hearty_stew'] },
    },

    hidden_void_fragment: {
        id: 'hidden_void_fragment',
        title: 'The Void Fragment',
        type: 'hidden',
        description: 'A shard of crystallized void-energy. Its power can only be claimed by one who has stared into the abyss.',
        steps: [
            { id: 'kill_shadow_x', type: 'kill', target: 'shadow_sprite', label: 'Defeat Shadow Sprites (0/10)', required: 10 },
            { id: 'kill_boss',     type: 'kill', target: 'void_general',   label: 'Defeat the Void General',     required: 1  },
        ],
        reward: { glint: 0, xp: 250, items: ['cleaver_of_vorgos'] },
    },

    // ── Eldoria's Prophecy: Summit of Despair ───────────────────────────────
    // Step types are restricted to what QuestManager actually tracks (kill,
    // gather, read_signs — see systems/QuestManager.js's onKill/onGather/
    // onReadSign). No "reach a location" or "interact with a specific world
    // object" event exists in the engine, so a couple of the original design
    // beats (arriving at the summit as its own step; a puzzle-door/brazier
    // interaction) were dropped or reshaped to real mechanics rather than
    // written against events that would never fire:
    //   - The main quest's arrival is implicit — starting the quest at all
    //     already requires being on this map (map.quests auto-starts every
    //     listed quest id on load, GameScene.js:173) — so there's no
    //     separate "reach" step, just the boss kill.
    //   - "Read the scout's journal" -> read_signs (fires on reading the
    //     frozen-camp sign already in this map's spawns.signs).
    //   - "Relight the shrine brazier" -> gather wood + mineral_ore (the
    //     engine's only two real gatherable resources) near the shrine,
    //     reframed as gathering fuel/materials rather than an unsupported
    //     brazier-interact event.
    //   - "Solve the rune-puzzle door" -> dropped; no puzzle/door-interact
    //     mechanic exists. The Frost-Shade kill count stands alone.
    main_whisperer_of_doubt: {
        id: 'main_whisperer_of_doubt',
        title: 'Whisperer of Doubt',
        type: 'main',
        description: 'Malphas, the Whisperer of Doubt, haunts the pass ahead. Survive his illusions and force him to retreat.',
        steps: [
            // NOTE: BossEnemy's death event is currently hardcoded engine-wide
            // to fire questManager.onKill('void_general', ...) regardless of
            // map/boss (GameScene.js:336,344,349) — there is no per-map boss
            // identity, and no "forced to retreat, not killed" outcome yet.
            // This step targets the engine's real (generic) event so the
            // quest actually completes in play; Malphas's true "retreats
            // alive" outcome (per the Campaign Bible) is narrative/quest-text
            // framing only, until the boss system is generalized — a known
            // limitation, not fixed here.
            { id: 'defeat_malphas', type: 'kill', target: 'void_general', label: 'Force Malphas to retreat', required: 1 },
        ],
        reward: { glint: 200, xp: 400, items: [] },
    },

    side_frozen_camp: {
        id: 'side_frozen_camp',
        title: 'The Frozen Camp',
        type: 'side',
        description: "Investigate the frozen camp of fourteen dead and recover the scout's journal.",
        steps: [
            { id: 'read_journal', type: 'read_signs', target: 'any', label: "Read the scout's journal", required: 1 },
        ],
        reward: { glint: 40, xp: 60, items: ['legion_lore_fragment'] },
    },

    side_widows_watch: {
        id: 'side_widows_watch',
        title: "The Widow's Watch",
        type: 'side',
        description: "Gather fuel and offerings for the shrine at Widow's Overlook to claim what it guards.",
        steps: [
            { id: 'gather_wood_shrine', type: 'gather', target: 'wood',        label: 'Gather Wood (0/1)',        required: 1 },
            { id: 'gather_ore_shrine',  type: 'gather', target: 'mineral_ore', label: 'Gather Mineral Ore (0/1)', required: 1 },
        ],
        reward: { glint: 0, xp: 80, items: ['soul_gem_mana'] },
    },

    side_echoes_in_the_rime: {
        id: 'side_echoes_in_the_rime',
        title: 'Echoes in the Rime',
        type: 'side',
        description: 'Clear the Frost-Shades guarding the Rime Hollow.',
        steps: [
            { id: 'clear_frost_shades', type: 'kill', target: 'frost_shade', label: 'Clear the Frost-Shades (0/2)', required: 2 },
        ],
        reward: { glint: 0, xp: 100, items: ['aether_shard', 'aether_shard'] },
    },
};
