export const DIALOGUES = {

    // ── Hermit ────────────────────────────────────────────────────────────────

    hermit_intro: [
        { speaker: 'Hermit', text: 'Halt. These woods have not seen a robed scholar since the last Covenant survey team — and that was before the darkness spread.' },
        { speaker: 'Hermit', text: 'You carry the mark of Vorgos upon you. The resonance signature is unmistakable. The Stormbringer has placed his hand on the board.' },
        { speaker: 'Eldrin', text: 'You know of Vorgos? The vision I had—' },
        { speaker: 'Hermit', text: 'I know more than the Tower ever taught you. The archives you studied were curated. Certain entries were removed. The Gap at 0 GD? That is not a record-keeping error. That is a deliberate erasure.' },
        { speaker: 'Eldrin', text: 'The Great Darkness. Every historian treats it as a myth.' },
        { speaker: 'Hermit', text: 'It was real. Vorgos sealed the Void Gate at 0 GD at immeasurable cost. Someone does not want that remembered. The stone markers in this forest — read them. The truth is older than the Covenant.' },
        { speaker: 'Hermit', text: 'The Heartstone of Creation lies beyond this forest. A Cosmic Insulator, not a treasure. It must be secured before the shadow finds it.' },
        { speaker: 'Hermit', text: 'But first — prove yourself. The shadow-creatures have taken the eastern ruins. They grow bolder each night. Clear them, attune to the Monolith north of here, and come back to me.' },
    ],

    hermit_after: [
        { speaker: 'Hermit', text: 'You survived. Good. The Resonance responds to you — I can see it shifting.' },
        { speaker: 'Hermit', text: 'The Heartstone pulses deep in Eldoria. Let the resonance guide you — it is older than language. Trust it.' },
        { speaker: 'Hermit', text: 'What hunts you in these woods is only a fragment. The Void General commands dozens of such fragments. He is testing the perimeter.' },
        { speaker: 'Hermit', text: 'When you face him — do not hesitate. He will speak. Do not let the words reach you.' },
    ],

    hermit_quest_done: [
        { speaker: 'Hermit', text: 'The forest breathes easier now.' },
        { speaker: 'Hermit', text: 'You have done what needed doing. There is no ceremony in this work, scholar. Only the next step.' },
    ],

    hermit_hut_greeting: [
        { speaker: 'Hermit', text: 'Come in. Mind the books — some of those stacks are older than the Covenant itself.' },
        { speaker: 'Hermit', text: 'I have spent forty years collecting what the Tower saw fit to burn. The Gap at 0 GD is not a footnote, Eldrin. It is the whole story.' },
        { speaker: 'Hermit', text: 'Rest if you need it. There is a chest in the corner — take what is useful. You will need your strength for what comes next.' },
    ],

    hermit_hut_after: [
        { speaker: 'Hermit', text: 'The resonance lines converge southeast of here. You will feel it before you see it.' },
        { speaker: 'Hermit', text: 'Trust the pull. That is all the instruction Vorgos left for those who carry his mark.' },
    ],

    // ── Silvara ───────────────────────────────────────────────────────────────

    merchant_greeting: [
        { speaker: 'Silvara', text: 'A scholar! In full robes, no less. You are either very brave or have not yet seen what is east of the ridge.' },
        { speaker: 'Silvara', text: 'I am Silvara. Merchant, occasional scout, and the only person in this forest who keeps a proper inventory.' },
        { speaker: 'Silvara', text: 'I trade in what I have. Tools, arms, alchemical sundries, things I find in the ruins. Glint is all I ask.' },
        { speaker: 'Silvara', text: 'Buy what you need. The forest is unkind to the unprepared — and I have been prepared for twenty years.' },
    ],

    merchant_after: [
        { speaker: 'Silvara', text: 'Safe travels. Come back when you are bleeding or broke — I handle both.' },
    ],

    silvara_lore: [
        { speaker: 'Silvara', text: 'You want to know about the ruins? I have camped near them for two seasons.' },
        { speaker: 'Silvara', text: 'The stonework is Covenant-era — maybe older. The sigils are not decorative. I had a scholar from the capital look at them once. He went pale and left the same day.' },
        { speaker: 'Silvara', text: 'Whatever happened at 0 GD, it left a scar on the land itself. The resonance here is wrong. Too dense in places, absent in others. Like the world held its breath and never fully exhaled.' },
    ],

    // ── Eldrin ────────────────────────────────────────────────────────────────

    eldrin_premonition: [
        { speaker: 'Eldrin', text: '...' },
        { speaker: 'Eldrin', text: 'The dream again. A sky of violet and blood. A star going dark in the east.' },
        { speaker: 'Eldrin', text: 'A voice — not words, but intent. Old. Vast. Like a storm learning to speak.' },
        { speaker: 'Eldrin', text: 'It showed me coordinates. A forest. A ruin. Something beneath the resonance, waiting.' },
        { speaker: 'Eldrin', text: 'I have spent six years in the archives. The scholars will call this a mana-fever. But the Gap in the records at 0 GD — that was not an accident. Something was removed from history.' },
        { speaker: 'Eldrin', text: 'I need to know what.' },
    ],

    eldrin_second_vision: [
        { speaker: 'Eldrin', text: '...The resonance is louder here. It is almost like a memory.' },
        { speaker: 'Eldrin', text: 'I can see it. A structure, intact. People moving through it. A world that did not know what was coming.' },
        { speaker: 'Eldrin', text: 'This is 0 GD. Before the Darkness. The archives say nothing of this place.' },
        { speaker: 'Eldrin', text: 'Someone lived here. Someone studied here. And then someone decided that no one should know they existed.' },
    ],

    // ── Boss ──────────────────────────────────────────────────────────────────

    boss_encounter: [
        { speaker: null, text: 'The air turns cold. The trees stop moving. The resonance drops to silence.' },
        { speaker: 'Eldrin', text: 'This is not natural shadow. This is structured void. Something is giving it form.' },
        { speaker: null, text: 'Two eyes open in the dark — violet fire, cold and measuring. A shape assembles itself from the absence of light.' },
        { speaker: 'Void General', text: 'Scholar. The Stormbringer sends children now. The Void does not fear what it has already swallowed.' },
        { speaker: 'Eldrin', text: 'It speaks. The Hermit warned me about this.' },
        { speaker: 'Eldrin', text: 'Then we do this without words.' },
    ],

    boss_defeated: [
        { speaker: 'Void General', text: '...You will not find the Stone in time. The Lock is already failing. I am the first of many.' },
        { speaker: null, text: 'The Void General collapses inward. The void-form unravels, scattering into particles of dead resonance.' },
        { speaker: 'Eldrin', text: 'It was right about one thing. That was not the end — it was a message.' },
        { speaker: 'Eldrin', text: 'The Void is testing the perimeter. Probing for weakness. This forest was a probe.' },
        { speaker: null, text: 'A shard of crystallized resonance remains — dense, cold, humming at a frequency that predates the Covenant.' },
        { speaker: 'Eldrin', text: 'The path forward is east. The Heartstone is waiting. And something else is waiting for it to be found.' },
    ],

    // ── Lore items ────────────────────────────────────────────────────────────

    ancient_scroll_read: [
        { speaker: null, text: 'The scroll crumbles at the edges. The script is pre-Covenant — the Old Aetheric hand, written before the standardization.' },
        { speaker: null, text: '"The Rift-Gate network was not built. It was discovered. The original pathways exist in the resonance itself — we only learned to read the doors that were already there."' },
        { speaker: null, text: '"The surveyor who first mapped the network refused to publish his full findings. His notes reference a thirteenth gate. No other record of it exists."' },
    ],

    eldritch_tome_read: [
        { speaker: null, text: 'The binding is void-touched — you can feel it. The pages resist opening, as though reluctant to be read again.' },
        { speaker: null, text: '"Entry, Day 3 after the Collapse: The resonance is gone from the eastern quarter. Not suppressed — absent. As though it was never there. The Void does not fill the space. It unmakes the space."' },
        { speaker: null, text: '"Entry, Day 11: I am the last one recording this. If the resonance returns, someone will find this. If it does not — this page will never be warm again."' },
    ],

};
