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
        title: 'Initiation of the Order of the Grey Hour',
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
        title: 'The Concord Scholar',
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
        reward: { glint: 60, xp: 100, items: ['mana_potion', 'mana_potion', 'ancient_scroll', 'recipe_void_tonic'] },
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
        reward: { glint: 50, xp: 70, items: ['roasted_boar', 'hearty_stew', 'recipe_grand_feast'] },
    },

    // ── The Hermit's requests (Phase 4: giver, turn-in, flags, hand-ins) ────
    // Offered in the Hermit's Hut once you offer to help (a dialogue choice
    // sets the flag); both are turned in by talking to him again.

    side_hermits_remedy: {
        id: 'side_hermits_remedy',
        title: "The Hermit's Remedy",
        type: 'side',
        giver: 'hermit',
        requiresFlags: ['offered_hermit_help'],
        description: 'The Hermit\'s hands shake when he reads by the fire. He needs moonpetal and glowcap for a tonic that steadies them.',
        steps: [
            { id: 'bring_moonpetal', type: 'have', target: 'moonpetal', label: 'Bring Moonpetal', required: 3, consume: true },
            { id: 'bring_glowcap',   type: 'have', target: 'glowcap',   label: 'Bring Glowcap',   required: 2, consume: true },
        ],
        reward: { xp: 120, gold: 40, recipe: 'moonveil_tonic', insight: 1 },
    },

    side_shadows_at_the_threshold: {
        id: 'side_shadows_at_the_threshold',
        title: 'Shadows at the Threshold',
        type: 'side',
        giver: 'hermit',
        requires: ['side_hermits_remedy'],
        offer: 'Steadier hands, clearer eyes. And now I see them — shadow-sprites, gathering at the forest\'s eastern edge. Thin them out before they reach my door.',
        description: 'Shadow-sprites gather at the eastern edge of the forest. The Hermit wants them thinned out before they reach his door.',
        steps: [
            { id: 'kill_sprites', type: 'kill', target: 'shadow_sprite', label: 'Defeat Shadow Sprites (0/6)', required: 6 },
        ],
        reward: { xp: 200, glint: 60, spell: 'cleanse' },
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

    // ── Eldoria's Prophecy: Chapter 3 — Odyssey's Dawn (Thaloria, East Road) ─
    // Sources: campaign bible Song 3, the map spec thaloria_and_east_road.md,
    // the book (ch04–ch05) and the DB (Oren; event "The Race for the Anchor").
    main_odysseys_dawn: {
        id: 'main_odysseys_dawn',
        title: "Odyssey's Dawn",
        type: 'main',
        description: 'The tower is sealed behind you. Leave Thaloria by the East Gate and follow the Compass east along the winter road.',
        steps: [
            { id: 'first_combat', type: 'kill',   target: 'void_stalker',   label: 'Survive the void-stalkers on the road (0/3)', required: 3 },
            { id: 'first_node',   type: 'attune', target: 'gate_east_road', label: 'Attune to the Rift-Gate node on the East Road', required: 1 },
            { id: 'meet_oren',    type: 'talk',   target: 'oren',           label: "Meet the traveler at the shepherd's lean-to", required: 1 },
        ],
        reward: { glint: 60, xp: 250, items: ['iron_spell_blade'] },
    },

    side_traders_rumor: {
        id: 'side_traders_rumor',
        title: "Trader's Rumor",
        type: 'side',
        giver: 'thaloria_trader',
        offer: 'He stopped at the old waystone past the birches — I saw him writing on it. Go and look, if you walk that way. Then tell me I imagined it.',
        description: 'A stranger on the East Road asked the Trader one polite question: had he heard of "the Anchor"? Find the waystone where the stranger stopped.',
        steps: [
            { id: 'read_waystone', type: 'read_signs', target: 'waystone_anchor', label: 'Read the waystone on the East Road', required: 1 },
        ],
        reward: { xp: 100, gold: 30 },
    },

    side_scholars_saddlebags: {
        id: 'side_scholars_saddlebags',
        title: "The Scholar's Saddlebags",
        type: 'side',
        giver: 'innkeeper',
        offer: 'Your saddlebag came back split along the seam — the porter swears half of it went over the side of his cart on the East Road. Pages, mostly. Yours, I think.',
        description: 'Your saddlebag split on the East Road and your field notes scattered. Gather three pages and bring them back to the Innkeeper, who kept the rest.',
        steps: [
            { id: 'pages', type: 'have', target: 'scattered_journal_page', label: 'Recover your journal pages', required: 3, consume: true },
        ],
        reward: { xp: 120, gold: 45, items: ['health_potion', 'mana_potion'] },
    },

    main_read_the_erasure: {
        id: 'main_read_the_erasure',
        title: 'Read the Erasure',
        type: 'main',
        description: 'In the study at the top of your tower: the strata cores, where something in the stone has been tidied away — and a letter you keep coming back to.',
        steps: [
            { id: 'read_strata_wall', type: 'read_signs', target: 'ch1_strata', label: 'Examine the strata cores on your desk (the study, top of the tower)', required: 1 },
            { id: 'read_letter', type: 'read_signs', target: 'ch1_letter', label: 'Read the letter from Silverrun', required: 1 },
        ],
        reward: { glint: 0, xp: 30, items: [] },
    },

    // ── Campaign spine scaffolding ──────────────────────────────────────────
    // Placeholder main quests for the ten chapters that don't have real
    // content yet (chapters 1 and 4 already have real quests — see
    // main_read_the_erasure and main_whisperer_of_doubt above). Each is a
    // single talk step against that chapter's placeholder NPC. Replace by
    // id, one chapter at a time, as real content lands — see
    // docs/superpowers/plans/2026-09-08-eldorias-prophecy-campaign-spine.md.

    stub_ch02_dreamweavers_call: {
        id: 'stub_ch02_dreamweavers_call',
        title: "Dreamweaver's Call (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 2 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch02_dreamweavers_call', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch05_sylvan_sanctuary: {
        id: 'stub_ch05_sylvan_sanctuary',
        title: 'Sylvan Sanctuary (placeholder)',
        type: 'main',
        description: 'SCAFFOLDING — Song 5 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch05_sylvan_sanctuary', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch06_treacherys_bite: {
        id: 'stub_ch06_treacherys_bite',
        title: "Treachery's Bite (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 6 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch06_treacherys_bite', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch07_the_solitary_path: {
        id: 'stub_ch07_the_solitary_path',
        title: 'The Solitary Path (placeholder)',
        type: 'main',
        description: 'SCAFFOLDING — Song 7 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch07_the_solitary_path', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch08_infernos_trial: {
        id: 'stub_ch08_infernos_trial',
        title: "Inferno's Trial (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 8 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch08_infernos_trial', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch09_eldorias_heartbeat: {
        id: 'stub_ch09_eldorias_heartbeat',
        title: "Eldoria's Heartbeat (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 9 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch09_eldorias_heartbeat', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch10_heart_of_war: {
        id: 'stub_ch10_heart_of_war',
        title: 'Heart of War (placeholder)',
        type: 'main',
        description: 'SCAFFOLDING — Song 10 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch10_heart_of_war', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch11_the_weight_of_eternity: {
        id: 'stub_ch11_the_weight_of_eternity',
        title: 'The Weight of Eternity (placeholder)',
        type: 'main',
        description: 'SCAFFOLDING — Song 11 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch11_the_weight_of_eternity', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    stub_ch12_dawns_embrace: {
        id: 'stub_ch12_dawns_embrace',
        title: "Dawn's Embrace (placeholder)",
        type: 'main',
        description: 'SCAFFOLDING — Song 12 is not built yet. Speak with the placeholder to complete this chapter.',
        steps: [
            { id: 'talk_stub', type: 'talk', target: 'stub_ch12_dawns_embrace', label: 'Speak with the placeholder', required: 1 },
        ],
        reward: { glint: 0, xp: 10, items: [] },
    },

    // ── The starters and the bands (docs/3d/WORLD_PLAN.md) ──────────────────────────────────────
    // givers: a region's people by '<region id>_<name slug>' (content/actors/villagers.js)

    starter_fields_work: {
        id: 'starter_fields_work', title: 'Work for Willing Hands', type: 'side', giver: 'emerald_fields_village_elder',
        offer: 'Beasts come into the fields at night — they trample the crops and frighten the herds. Put a few of them down, and come and tell me.',
        description: 'The elder of the Fields\' village asked you to deal with the beasts troubling the farms, then report back.',
        steps: [
            { id: 'beasts', type: 'kill', target: 'any', label: 'Defeat creatures round the Fields (0/4)', required: 4 },
            { id: 'report', type: 'talk', target: 'emerald_fields_village_elder', label: 'Report to the village elder', required: 1 },
        ],
        reward: { xp: 90, gold: 20, items: ['health_potion'] },
    },
    starter_fields_yard: {
        id: 'starter_fields_yard', title: "The Yard's First Lesson", type: 'side', giver: 'emerald_fields_yard_trainer',
        offer: 'Posts don\'t hit back. Go and find three things that do — and on your way, touch the Monolith by the Fields\' gate, so you can always find your way home.',
        description: 'The yard trainer wants you to test your stance against real foes, and to attune to the Fields\' Monolith.',
        steps: [
            { id: 'foes', type: 'kill', target: 'any', label: 'Defeat three foes (0/3)', required: 3 },
            { id: 'monolith', type: 'attune', target: 'any', label: "Touch the Monolith by the Fields' gate", required: 1 },
        ],
        reward: { xp: 110, gold: 15, items: ['mana_potion'] },
    },
    starter_fields_road: {
        id: 'starter_fields_road', title: 'The Road to the Crossroads', type: 'side', giver: 'emerald_fields_village_elder', requires: ['starter_fields_work'],
        offer: 'You\'ve outgrown our fields, I think. Follow the road north to the Crossroads — the innkeeper of the Worn Stone knows everyone, and there\'s more work there than here.',
        description: 'The elder sends you on to the Crossroads, to the innkeeper of the Worn Stone — the wider world begins there.',
        steps: [
            { id: 'innkeeper', type: 'talk', target: 'the_crossroads_innkeeper_of_the_worn_stone', label: 'Meet the innkeeper of the Worn Stone at the Crossroads', required: 1 },
        ],
        reward: { xp: 160, gold: 30, items: [] },
    },
    starter_vale_stayed: {
        id: 'starter_vale_stayed', title: 'Those Who Stayed', type: 'side', giver: 'shadow_vale_elder_of_the_vale',
        offer: 'The shadow beasts come down from the hills after the dark hours. Show the Vale you can stand with us: drive five of them off, then come back to me.',
        description: 'The elder of the Shadow-Vale asks you to prove yourself against the shadow beasts, then return.',
        steps: [
            { id: 'beasts', type: 'kill', target: 'any', label: 'Defeat shadow beasts round the Vale (0/5)', required: 5 },
            { id: 'report', type: 'talk', target: 'shadow_vale_elder_of_the_vale', label: 'Return to the elder of the Vale', required: 1 },
        ],
        reward: { xp: 100, gold: 18, items: ['health_potion'] },
    },
    starter_vale_watch: {
        id: 'starter_vale_watch', title: 'The Watch Before the Dark Hours', type: 'side', giver: 'shadow_vale_vale_warden',
        offer: 'Void-stalkers hunt along the Vale\'s edges. Three of them, and the watch sleeps easier tonight.',
        description: 'The Vale\'s warden wants three Void-Stalkers put down before the dark hours.',
        steps: [
            { id: 'stalkers', type: 'kill', target: 'void_stalker', label: 'Defeat Void-Stalkers (0/3)', required: 3 },
        ],
        reward: { xp: 140, gold: 25, items: [] },
    },
    starter_vale_ruins: {
        id: 'starter_vale_ruins', title: 'The Broken Silhouette', type: 'side', giver: 'shadow_vale_elder_of_the_vale', requires: ['starter_vale_stayed'],
        offer: 'Old Ravenspire stands broken on the cliff to the north-east, where the Resistance held out before the Great Darkness. Go and see it with your own eyes — then tell me what walks there now.',
        description: "The elder asks you to see old Ravenspire's ruins for yourself and report what you find.",
        steps: [
            { id: 'see', type: 'read_signs', target: 'ravenspire_ruins', label: "Find the inscription in old Ravenspire's hall", required: 1 },
            { id: 'report', type: 'talk', target: 'shadow_vale_elder_of_the_vale', label: 'Tell the elder what you found', required: 1 },
        ],
        reward: { xp: 260, gold: 40, items: [] },
    },
    ravenspire_rift_bounty: {
        id: 'ravenspire_rift_bounty', title: 'What Crawls from the Rift', type: 'side', giver: 'new_ravenspire_herald_of_the_legion',
        offer: 'The Rift still bleeds things into our land. The Legion pays well for each one put down — six stalkers and two of the beaked things, and the purse is yours.',
        description: 'The Herald of the Legion offers a bounty on the creatures leaking from the Great Rift.',
        steps: [
            { id: 'stalkers', type: 'kill', target: 'void_stalker', label: 'Defeat Void-Stalkers near the Rift (0/6)', required: 6 },
            { id: 'beaks', type: 'kill', target: 'gloom_beak', label: 'Defeat Gloom-Beaks (0/2)', required: 2 },
            { id: 'report', type: 'talk', target: 'new_ravenspire_herald_of_the_legion', label: 'Claim the bounty from the Herald', required: 1 },
        ],
        reward: { xp: 950, gold: 140, items: [] },
    },
};
