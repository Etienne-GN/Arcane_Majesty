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

    // ── Bands 2 and 3, and Nythoria's towns (docs/3d/WORLD_PLAN.md) ──
    band2_crossroads_roads: {
        id: 'band2_crossroads_roads', title: 'Trouble on the Roads', type: 'side', giver: 'the_crossroads_guard',
        offer: "Every road out of here has teeth on it lately. Thin out what's hunting the travellers, then come and tell me.",
        description: "The Crossroads' guard wants the creatures preying on travellers thinned out.",
        steps: [
            { id: 'beasts', type: 'kill', target: 'any', label: 'Defeat creatures on the roads (0/6)', required: 6 },
            { id: 'report', type: 'talk', target: 'the_crossroads_guard', label: 'Report to the guard', required: 1 },
        ],
        reward: { xp: 320, gold: 45, items: ['health_potion'] },
    },
    band2_temple_lights: {
        id: 'band2_temple_lights', title: 'Lights Beneath the Water', type: 'side', giver: 'the_crossroads_well_keeper',
        offer: "The fishermen on the lake swear there's light under the water by the old ruins at dusk. Go and look — and if there's writing, copy it in your head for me.",
        description: 'The well-keeper asks you to visit the Sunken Temple on Lake Aethera and read its carvings.',
        steps: [
            { id: 'carvings', type: 'read_signs', target: 'sunken_temple', label: 'Read the carvings at the Sunken Temple', required: 1 },
            { id: 'report', type: 'talk', target: 'the_crossroads_well_keeper', label: 'Tell the well-keeper what you saw', required: 1 },
        ],
        reward: { xp: 380, gold: 30, items: ['ancient_scroll'] },
    },
    band2_port_quays: {
        id: 'band2_port_quays', title: 'Rats and Worse on the Quays', type: 'side', giver: 'port_silver_harbour_master',
        offer: "Something's coming up from the bay at night and getting into the stores. Clear the shore round the port, and I'll see you paid.",
        description: 'The harbour master wants the shore round Port Silver cleared of what comes up from the bay.',
        steps: [
            { id: 'beasts', type: 'kill', target: 'any', label: 'Defeat creatures round the port (0/6)', required: 6 },
            { id: 'report', type: 'talk', target: 'port_silver_harbour_master', label: 'Report to the harbour master', required: 1 },
        ],
        reward: { xp: 420, gold: 60, items: [] },
    },
    band3_iron_knocks: {
        id: 'band3_iron_knocks', title: 'The Deep Knocks', type: 'side', giver: 'iron_hollow_foreman',
        offer: "The men won't go past the third gallery. Something out there in the hills keeps them up at night. Put a few of those things down and they'll work again.",
        description: "Iron Hollow's foreman needs the creatures round the mines dealt with.",
        steps: [
            { id: 'beasts', type: 'kill', target: 'any', label: 'Defeat creatures round Iron Hollow (0/8)', required: 8 },
            { id: 'report', type: 'talk', target: 'iron_hollow_foreman', label: 'Report to the foreman', required: 1 },
        ],
        reward: { xp: 700, gold: 80, items: [] },
    },
    band3_dusk_spiders: {
        id: 'band3_dusk_spiders', title: 'Lamps Against the Dark', type: 'side', giver: 'duskmeet_old_woman',
        offer: "The spiders come closer every year. My lamps can't keep them off alone, dearie. Four of the big ones, and we'll all sleep.",
        description: "Duskmeet's old woman asks you to kill the giant spiders creeping out of Whisper-Wood.",
        steps: [
            { id: 'spiders', type: 'kill', target: 'giant_spider', label: 'Defeat Giant Spiders (0/4)', required: 4 },
            { id: 'report', type: 'talk', target: 'duskmeet_old_woman', label: 'Return to the old woman', required: 1 },
        ],
        reward: { xp: 820, gold: 70, items: ['health_potion'] },
    },
    band3_shadow_touched: {
        id: 'band3_shadow_touched', title: 'Shadow-Touched', type: 'side', giver: 'graywatch_sergeant_of_the_watch',
        offer: "Druids gone wrong, and the spiders that follow them. They're coming out of Whisper-Wood bolder every week. Two druids, four spiders — the Watch will remember it.",
        description: "Graywatch's sergeant wants the shadow-touched druids and their spiders put down.",
        steps: [
            { id: 'druids', type: 'kill', target: 'dark_druid', label: 'Defeat Dark Druids (0/2)', required: 2 },
            { id: 'spiders', type: 'kill', target: 'giant_spider', label: 'Defeat Giant Spiders (0/4)', required: 4 },
            { id: 'report', type: 'talk', target: 'graywatch_sergeant_of_the_watch', label: 'Report to the sergeant', required: 1 },
        ],
        reward: { xp: 980, gold: 110, items: [] },
    },
    band3_vault_door: {
        id: 'band3_vault_door', title: 'The Door That Breathes', type: 'side', giver: 'duskmeet_lamplighter',
        offer: "South of here there's a stair into the ground and a red door at the bottom. My lamp gutters when I pass it. Go and look, if you've the nerve, and tell me I'm a fool.",
        description: "Duskmeet's lamplighter asks you to find the sealed door of the Sanguine Vaults to the south.",
        steps: [
            { id: 'door', type: 'read_signs', target: 'sanguine_vaults', label: 'Find the red door of the Sanguine Vaults', required: 1 },
            { id: 'report', type: 'talk', target: 'duskmeet_lamplighter', label: 'Tell the lamplighter what you found', required: 1 },
        ],
        reward: { xp: 900, gold: 50, items: [] },
    },
    nythoria_black_water: {
        id: 'nythoria_black_water', title: 'What the Black Water Gives', type: 'side', giver: 'shadow_harbour_harbour_mistress',
        offer: "Things crawl out of the black water at the quays' end. The fishers won't land their catch while they're there. Clear the shore.",
        description: 'The harbour-mistress of the shadow harbour wants the shore cleared of what crawls from the black water.',
        steps: [
            { id: 'beasts', type: 'kill', target: 'any', label: 'Defeat creatures round the harbour (0/6)', required: 6 },
            { id: 'report', type: 'talk', target: 'shadow_harbour_harbour_mistress', label: 'Report to the harbour-mistress', required: 1 },
        ],
        reward: { xp: 600, gold: 60, items: [] },
    },
    nythoria_deep_knock: {
        id: 'nythoria_deep_knock', title: 'Something Knocks Back', type: 'side', giver: 'deep_miners_mine_foreman',
        offer: "We sealed two shafts. Whatever knocked behind them is out in the hills now. Eight of those things, and I'll open my own purse.",
        description: "The deep-miners' foreman wants the creatures loose in the northern hills put down.",
        steps: [
            { id: 'beasts', type: 'kill', target: 'any', label: 'Defeat creatures in the hills (0/8)', required: 8 },
            { id: 'report', type: 'talk', target: 'deep_miners_mine_foreman', label: 'Report to the foreman', required: 1 },
        ],
        reward: { xp: 900, gold: 90, items: [] },
    },

    // ── Bands 4 and 5 (levels 31–50): the Scarlands, beyond the Divide, the fire mountain, the Ruins; Nythoria's worst ──
    band4_rift_edge: {
        id: 'band4_rift_edge', title: 'The Edge of the Wound', type: 'side', giver: 'new_ravenspire_the_map_maker',
        offer: "Every chart of the Rift I own is wrong by the season. Walk to the Legion's post on its lip and tell me what's written there now — and if the root-things are crawling up the sides again, thin them.",
        description: "New Ravenspire's map-maker wants news of the Great Rift's edge, and the root-wraiths climbing out of it thinned.",
        steps: [
            { id: 'post', type: 'read_signs', target: 'great_rift_edge', label: "Read the Legion's post on the Rift's lip", required: 1 },
            { id: 'wraiths', type: 'kill', target: 'root_wraith', label: 'Defeat Root-Wraiths by the Rift (0/4)', required: 4 },
            { id: 'report', type: 'talk', target: 'new_ravenspire_the_map_maker', label: 'Return to the map-maker', required: 1 },
        ],
        reward: { xp: 2200, gold: 160, items: [] },
    },
    band4_heath_shades: {
        id: 'band4_heath_shades', title: 'Cold Shapes on the Heath', type: 'side', giver: 'new_ravenspire_legion_quartermaster',
        offer: "Our patrols come back frostbitten in summer. Shades — out of the Rift, drifting over the heath. Five of them, and I'll open the Legion's purse.",
        description: "The Legion's quartermaster wants the Frost-Shades drifting out of the Great Rift put down.",
        steps: [
            { id: 'shades', type: 'kill', target: 'frost_shade', label: 'Defeat Frost-Shades round the Rift (0/5)', required: 5 },
            { id: 'report', type: 'talk', target: 'new_ravenspire_legion_quartermaster', label: 'Report to the quartermaster', required: 1 },
        ],
        reward: { xp: 2400, gold: 180, items: ['health_potion'] },
    },
    band4_divide_wilds: {
        id: 'band4_divide_wilds', title: 'What the Divide Keeps', type: 'side', giver: 'graywatch_quartermaster',
        offer: "The Watch sends no one north of the ridge any more — the wilds there grow things that walk. Three of the rotten trees, three of the crag-beasts, and I'll call you a friend of Graywatch.",
        description: "Graywatch's quartermaster wants the Blight-Ents and Crag-Fiends of the wilds beyond the Divide thinned.",
        steps: [
            { id: 'ents', type: 'kill', target: 'blight_ent', label: 'Defeat Blight-Ents beyond the Divide (0/3)', required: 3 },
            { id: 'fiends', type: 'kill', target: 'crag_fiend', label: 'Defeat Crag-Fiends beyond the Divide (0/3)', required: 3 },
            { id: 'report', type: 'talk', target: 'graywatch_quartermaster', label: 'Report to the quartermaster', required: 1 },
        ],
        reward: { xp: 2600, gold: 200, items: [] },
    },
    band4_cinders: {
        id: 'band4_cinders', title: 'Cinders on the Wind', type: 'side', giver: 'new_ravenspire_legion_gate_warden',
        offer: "Ash blows in from the east, and things ride it — crawlers in the ash, burning hawks over them. Four crawlers and three hawks from the ash lands, and the Gate's watch owes you.",
        description: "A Legion gate-warden wants the Ash Crawlers and Cinder Hawks of the ash lands round the Fire Gate thinned.",
        steps: [
            { id: 'crawlers', type: 'kill', target: 'ash_crawler', label: 'Defeat Ash Crawlers in the ash lands (0/4)', required: 4 },
            { id: 'hawks', type: 'kill', target: 'cinder_hawk', label: 'Defeat Cinder Hawks (0/3)', required: 3 },
            { id: 'report', type: 'talk', target: 'new_ravenspire_legion_gate_warden', label: 'Report to the gate-warden', required: 1 },
        ],
        reward: { xp: 3000, gold: 220, items: [] },
    },
    band5_mountain_hunger: {
        id: 'band5_mountain_hunger', title: "The Mountain's Hunger", type: 'side', giver: 'new_ravenspire_exchange_factor', requires: ['band4_cinders'],
        offer: "The fire mountain breeds worse than hawks. The eaters of magma, and the little burning souls that dance round them — the Exchange pays for every one that never reaches a road. Three eaters, four souls.",
        description: "New Ravenspire's exchange factor pays for Magma-Eaters and Cinder-Souls of the fire mountain put down.",
        steps: [
            { id: 'eaters', type: 'kill', target: 'lava_elemental', label: 'Defeat Magma-Eaters on the fire mountain (0/3)', required: 3 },
            { id: 'souls', type: 'kill', target: 'ember_imp', label: 'Defeat Cinder-Souls (0/4)', required: 4 },
            { id: 'report', type: 'talk', target: 'new_ravenspire_exchange_factor', label: 'Return to the exchange factor', required: 1 },
        ],
        reward: { xp: 4200, gold: 320, items: [] },
    },
    band5_ruins_vigil: {
        id: 'band5_ruins_vigil', title: 'The Vigil That Never Ended', type: 'side', giver: 'new_ravenspire_the_map_maker', requires: ['band4_rift_edge'],
        offer: "Beyond the fire mountain lie the Ruins — I've a chart of them older than the Darkness and no one alive who has walked them. They say the dead still keep watch there. Go, see, and lay a few of the watchers down so the next one can draw.",
        description: "The map-maker wants the Ruins of Eldoria walked, and their restless watchers laid to rest.",
        steps: [
            { id: 'wraiths', type: 'kill', target: 'grave_wraith', label: 'Lay Grave-Wraiths to rest at the Ruins (0/4)', required: 4 },
            { id: 'knights', type: 'kill', target: 'cursed_knight', label: 'Defeat Cursed Knights (0/2)', required: 2 },
            { id: 'report', type: 'talk', target: 'new_ravenspire_the_map_maker', label: 'Return to the map-maker', required: 1 },
        ],
        reward: { xp: 4800, gold: 360, items: [] },
    },
    nythoria_black_well: {
        id: 'nythoria_black_well', title: 'The Light at the Bottom', type: 'side', giver: 'shadow_vale_vale_warden', requires: ['starter_vale_watch'],
        offer: "There's a well on the black lake's shore with a red light breathing at the bottom. Things come up out of it now — blind things, and worse. Go and look into it, and put down three of what crawls out.",
        description: "The Vale's warden asks you to look into the Black Well and put down what crawls up out of it.",
        steps: [
            { id: 'well', type: 'read_signs', target: 'black_well', label: 'Look into the Black Well', required: 1 },
            { id: 'stalkers', type: 'kill', target: 'blind_stalker', label: 'Defeat Blind Stalkers by the Black Lake (0/3)', required: 3 },
            { id: 'report', type: 'talk', target: 'shadow_vale_vale_warden', label: 'Return to the warden', required: 1 },
        ],
        reward: { xp: 900, gold: 80, items: ['health_potion'] },
    },
    band5_bone_gate: {
        id: 'band5_bone_gate', title: 'The Bone Gate', type: 'side', giver: 'shadow_vale_elder_of_the_vale', requires: ['starter_vale_ruins', 'nythoria_black_well'],
        offer: "You've seen the ruin and the well. There's one place left that every child in the Vale is told never to go: the fortress in the fire mountain's crater. I only want to know if its gate still stands open — and if the stone guards on the crater road can be broken. Don't go in.",
        description: "The Vale's elder wants to know whether the Obsidian Citadel's gate still stands open — only to look, not to enter.",
        steps: [
            { id: 'sentinels', type: 'kill', target: 'corrupted_sentinel', label: 'Break Corrupted Sentinels on the crater road (0/2)', required: 2 },
            { id: 'gate', type: 'read_signs', target: 'obsidian_citadel', label: "Find the Obsidian Citadel's gate", required: 1 },
            { id: 'report', type: 'talk', target: 'shadow_vale_elder_of_the_vale', label: 'Tell the elder what you saw', required: 1 },
        ],
        reward: { xp: 5200, gold: 380, items: [] },
    },
    // Across the veil (docs/3d/AUTONOMOUS_RUN.md 4b): a place only reached by tearing across from the other world
    band5_wrong_hill: {
        id: 'band5_wrong_hill', title: 'The Wrong Hill', type: 'side', giver: 'new_ravenspire_the_map_maker', requires: ['band4_rift_edge'],
        offer: "Two charts of the same ground, and they disagree. My Eldorian one shows a bare rise south of the city — grass and wind. The Nythorian one, bought off a Legion courier, shows walls on that rise. Walls, and no door. One of them is lying, or neither is. The old ones say there are places where the veil runs thin enough to see through... and, for the reckless, to step through. Go and look at that rise with the sight.",
        description: "New Ravenspire's map-maker wants to know why his Nythorian chart shows a walled, doorless building on a rise his Eldorian chart shows bare — perhaps the veil runs thin there.",
        steps: [
            { id: 'inside', type: 'read_signs', target: 'sealed_reliquary', label: 'Find a way into the walls on the rise (Aether Sight; the Aetheric Tear)', required: 1 },
            { id: 'report', type: 'talk', target: 'new_ravenspire_the_map_maker', label: 'Tell the map-maker which chart was right', required: 1 },
        ],
        reward: { xp: 6000, gold: 420, items: [] },
    },
};
