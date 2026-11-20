// Eldoria's Prophecy in 3D, chapters 1–2, and the threads between chapters 3–6 (book ch. 1 Echoes of Stone and ch. 2
// The Vision; lore DB event "Eldrin's Call": Vorgos activates Eldrin with a vision of the Lock failing).
//   1 Echoes of Stone — in the study at the top of the tower: the strata cores (the Echoes: the record cut clean
//     through at the same depth), the second journal (the wrongness, dated), the letter from Silverrun (travellers
//     asking about the Anchor). Reading the cores and the letter: the candle flattens, the old bell rings all its
//     hours at once, the room goes soft… a voice says your name.
//   2 Dreamweaver's Call — the vision (content/vision.js): the violet sky, the city out of true, the man who holds a
//     door without a frame and breaks, the woman who kneels and never looks up, the storm's eye: "The Lock will fail.
//     Find the Anchor… Rise, Eldrin. The century is late." The Compass burns in, pointing east. You wake on the floor.
//   Then each chapter opens the next, so the journal always says where to go: 3 Odyssey's Dawn (Thaloria, the East
//   Road) → 4 Whisperer of Doubt (the Summit) → 5 The Elemental's Trial (the Sanctuary) → 6 Treachery's Bite.
// The man and the woman of the vision stay unnamed, as in the book. Media rule: no one mentions songs.
import * as THREE from 'three';

export const PROLOGUE_QUESTS = {
    main_dreamweavers_call: { id: 'main_dreamweavers_call', title: "Dreamweaver's Call", type: 'main',
        description: 'A voice called your name out of the dark. Answer it.',
        steps: [{ id: 'ch2_vision', type: 'talk', target: 'ch2_vision', label: 'See what the storm shows you', required: 1 }],
        reward: { xp: 120, items: [] } },
    // Book ch. 3 — The Scholar's Life: the compass tested, the three fragments in the Forbidden Archive (Eldrin has held
    // its key for thirty years), the tower locked behind him.
    main_scholars_life: { id: 'main_scholars_life', title: "The Scholar's Life", type: 'main',
        description: 'Something burned a direction into you. Test it like a scholar — then go down into the Forbidden Archive, where the tidier may have missed something.',
        steps: [
            { id: 'ch3_compass', type: 'talk', target: 'ch3_compass', label: 'Test the needle in your mind against your brass compass (the study, by the eastern window)', required: 1 },
            { id: 'ch3_manifest', type: 'talk', target: 'ch3_manifest', label: "The Forbidden Archive (below the Citadel's Great Library): a merchant's manifest", required: 1 },
            { id: 'ch3_canticle', type: 'talk', target: 'ch3_canticle', label: 'The Forbidden Archive: a canticle', required: 1 },
            { id: 'ch3_physician', type: 'talk', target: 'ch3_physician', label: "The Forbidden Archive: a physician's note", required: 1 },
            { id: 'ch3_seal', type: 'talk', target: 'ch3_seal', label: 'Go home to the tower, pack, and set out', required: 1 },
        ],
        reward: { xp: 150, items: [] } },
};
export function registerPrologueQuests(stats) { stats.generatedQuests ??= {}; for (const [id, q] of Object.entries(PROLOGUE_QUESTS)) stats.generatedQuests[id] = JSON.parse(JSON.stringify(q)); }

const TEXT = {
    strata: 'The cores, drilled from the deep places of Eldoria in your youth and laid end to end down the desk like a spine of stone. Below the patient layers of the Silent Century, the seam where the record simply ends — not blurred, not eroded, but clean, as if the world\'s hand had been lifted from the page and set down a line lower. Layer, restart, layer, restart; the breaks line up across every core like ruled ink. In the margin, in the violet ink you keep for heresy: "What cuts a world clean through at the same depth, three times, in the same century?"',
    journal: 'Your second journal, the plainest of your books, begun this season: wine turning thin in the same cellars every year; cats refusing the same thresholds, morning after morning; the silence developing a grain, like glass about to give. Every entry dated, and the dates long past calling it coincidence. "Like a crack in glass you cannot find: you hear the note it will sing when it breaks, and you know it is only a question of when."',
    compass: 'You close your eyes, and there it is, behind your brows, in the bone: the needle, pointing east — through the walls, through the hills of Thaloria, toward the mountains where your maps run out. You fetch the brass compass the college gave you for your fortieth year and lay it beside the place behind your eyes. True north, says the brass, placidly. East, says the wound in your skull. You write it down in the second journal: "East. The Heartstone of Creation. It is real. I am not unwell." Then, under it: "I do not know if \'unwell\' is a category that still applies."',
    shelf: 'The clean shelf. Not raided — a raided shelf leaves dust, and dust is a record of its own. This one was cleaned, repainted, and re-lettered with the wrong date. It has nothing more to give you. The tidier took everything — everything they knew was worth taking.',
    manifest: 'Shelved among the freights, in the uncorrected original hand of the old reckoning: "One Heartstone, carved, freighted with the court\'s blessing, to the keeping of the ruin." Beside it, a seal you have seen on nothing in any catalogue — a door, with the door ajar.',
    canticle: 'Among the prayer-books, a canticle copied and recopied by monks who rendered it faithfully without knowing what it meant. It names the thing that held the old court\'s towers at their proper distance from the sky: "the insulator of the ages, the stone that holds the house of heaven in its socket… that which remains when the rest is lifted." Insulator — the wrong word for a jewel. Exactly the right word for a stopper in the mouth of a bottle.',
    physician: 'In a casebook, forty words in a doctor\'s cramped, despairing hand: his patient, a young seer who died reportedly mad, spoke in her fever of "a stone that holds the world shut, an anchor against the lifting of the floor." He took it for a fever-dream. He could not have known he was writing down the last surviving description of the thing at the centre of the Gap.',
    letter: 'A letter ten days old, from the monastery at Silverrun, in the cramped, kind hand of a brother you have written to for half your life. Travellers along the river, he says, ask one strange question in every village and shrine and inn — not about the archives, not about the old gods. About the Anchor. What it is. Where it lies. Who keeps it. He laughs it off. You do not.',
};

export function createPrologue({ stats, hud, dialogue, quests, save, player, world, sfx }) {
    const flags = () => (stats.flags ??= {});
    const log = id => stats.questLog?.[id]?.status;
    const say = (lines, then) => dialogue.start(lines.map(l => (typeof l === 'string' ? { speaker: '', text: l } : { speaker: l[0], text: l[1] })), then);
    const begin = id => { if (!stats.questLog?.[id]) quests.start(id); };
    let scene = null, veil = null;

    // A violet wash over the screen (the room going soft at the edges).
    function wash(on, ms = 1400) {
        if (!veil) { veil = document.createElement('div'); veil.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:15;opacity:0;background:radial-gradient(ellipse at 50% 45%, #6a2a9a88, #1a0628ee);transition:opacity 1.4s'; document.body.append(veil); }
        veil.style.transition = `opacity ${ms / 1000}s`; veil.style.opacity = on ? 1 : 0;
    }
    function bell() {   // the old bell, all its hours at once, as if underwater
        for (let i = 0; i < 12; i++) setTimeout(() => sfx?.door?.(), i * 160 + Math.random() * 60);
    }

    // ---------- 1: the study ----------
    function study(map) {
        const g = new THREE.Group(); map.scene.add(g);
        const Y = 5, DK = { x: -2.6, z: -1.2 };
        // the strata cores, banded, laid end to end along a stone bench by the desk
        const bands = [0x6a5a48, 0x8a7a62, 0x4a4038, 0x9a8a70, 0x5a5048, 0x3a3430];
        for (let i = 0; i < 7; i++) {
            const core = new THREE.Group();
            for (let b = 0; b < 6; b++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 10), new THREE.MeshStandardMaterial({ color: bands[(b + i) % bands.length], roughness: 0.6, flatShading: true })); m.position.y = b * 0.06 - 0.15; core.add(m); }
            const cut = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.008, 10), new THREE.MeshBasicMaterial({ color: 0xe8e0d0 })); cut.position.y = 0.05; core.add(cut);   // the clean seam
            core.rotation.z = Math.PI / 2; core.position.set(DK.x - 0.8, Y + 0.95, DK.z - 0.42 + i * 0.12);
            g.add(core);
        }
        const book = (x, z, c) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.26), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })); b.position.set(x, Y + 0.88, z); g.add(b); };
        book(DK.x + 0.55, DK.z - 0.2, 0x3a2a22);   // the second journal
        const letter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.01, 0.3), new THREE.MeshStandardMaterial({ color: 0xece2c8 })); letter.position.set(DK.x + 0.65, Y + 0.86, DK.z + 0.25); letter.rotation.y = 0.3; g.add(letter);
        const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.18, 8), new THREE.MeshStandardMaterial({ color: 0xf0e8d0 })); candle.position.set(DK.x - 0.05, Y + 0.95, DK.z + 0.3); g.add(candle);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 6), new THREE.MeshBasicMaterial({ color: 0xffd080, toneMapped: false })); flame.position.set(DK.x - 0.05, Y + 1.08, DK.z + 0.3); g.add(flame);
        const st = (id, text, x, z) => map.stations.push({ mode: 'sign', id, text, pos: new THREE.Vector3(x, Y, z), onUse: () => afterRead() });
        st('ch1_strata', TEXT.strata, DK.x - 0.9, DK.z);
        st('ch1_journal', TEXT.journal, DK.x + 0.5, DK.z - 0.9);
        st('ch1_letter', TEXT.letter, DK.x + 0.9, DK.z + 0.7);
        map.stations.push({ mode: 'sign', id: 'ch3_compass', text: TEXT.compass, pos: new THREE.Vector3(6.6, Y, 0),   // the eastern window
            onUse: () => { if (log('main_scholars_life') === 'active') { quests.manager.onTalk('ch3_compass'); save(); } } });
        if (!map.spawns.study_floor) map.spawns.study_floor = { x: DK.x + 1.2, y: Y, z: DK.z + 1.6, facing: Math.PI * 1.3 };
        let flat = 0, pending = !!(flags().vision_called && !flags().vision_seen);   // reloaded mid-call: it calls again
        function afterRead() {   // (called while the reading is still open: the vision waits for it to close)
            if (log('main_read_the_erasure') !== 'completed' || flags().vision_seen || flags().vision_called) return;
            flags().vision_called = true; save(); pending = true;
        }
        const mine = map.stations.filter(x => x.id?.startsWith('ch1_'));
        function call() {
            map.stations = map.stations.filter(x => !mine.includes(x));   // the readings step aside: a press of G must not cut the call short
            say([
                'You reach to trim the candle. It does not go out — it flattens: a needle, a line, nothing. The room does not grow dark. It grows wrong.',
                'The cold comes up off the floor like a question. The violet ink on your map of the world begins to glow, and the glow runs up the wall like water climbing a thread.',
                'The old bell — the one that has not struck correctly in your lifetime — begins to sound all its hours at once, wet and far away, as if it were ringing underwater. Or under time.',
                ['A voice', 'Eldrin.'],
            ], () => { flat = 1; bell(); wash(true); setTimeout(() => { begin('main_dreamweavers_call'); world.go('vision', 'start'); }, 1500); });
        }
        return { update(dt, ctx) {
            if (pending && !dialogue.open) { pending = false; setTimeout(call, 400); }
            if (flags().vision_seen && !map.stations.includes(mine[0])) { map.stations.push(...mine); flat = 0; }   // after the vision, the desk can be read again
            g.visible = ctx.player.pos.y > 3.5;
            flame.scale.set(1, flat ? 0.05 : 1 + Math.sin(performance.now() / 120) * 0.15, 1);
        } };
    }

    // ---------- 2: the vision ----------
    function vision(map) {
        let ph = 'arrive', T = 0;
        const p = player.state;
        const go = (next, wait = 0) => { ph = next; T = -wait; };
        return { update(dt, ctx) {
            T += dt;
            p.buffs.shaping = { left: 5, tick: 0 };   // held still: this is not a place to walk in
            if (ph === 'arrive') { ph = 'wait'; wash(false, 2200); setTimeout(() => say([
                'There is no floor under you — and no floor under anything else. Whatever holds you now is nothing a foundation could be made of.',
                'The sky is the colour of a bruise and a wound at once, and you are inside it. A city lies wrong around you: spires you almost know, set a finger\'s width out of true, grown over in the sky\'s colour.',
                'At the far edge of the wrong city a man stands with his arms spread, holding a door that has no frame. Light pools under him and through him. He is the last thing standing between the violet and everything else.',
            ], () => go('hold', 2.5)), 900); }
            else if (ph === 'hold' && T > 0) { ph = 'wait'; say(['And then his hands slip. Not violently — strand by strand, the way a rope gives.'], () => { map.shatter(); sfx?.parry?.(); setTimeout(() => sfx?.parry?.(), 220); go('broken', 1.8); }); }
            else if (ph === 'broken') { map.holdK = Math.max(0, map.holdK - dt * 1.5); if (T > 0) { ph = 'run'; T = 0; } }
            else if (ph === 'run') {   // the woman runs to him, and kneels
                const w = map.woman.root, to = map.HOLD.clone().add(new THREE.Vector3(-0.7, 0, 0.4));
                const d = w.position.distanceTo(to);
                if (d > 0.15) { w.position.lerp(to, Math.min(1, dt * 2.2 / Math.max(0.3, d))); w.lookAt(to.x, 0, to.z); map.womanSpeed = 3; }
                else { map.womanSpeed = 0; map.womanPose = 'vanish'; ph = 'wait'; say(['A woman you had not seen runs to him — she was so still the eye crossed over her. She kneels and gathers his head into her lap, and she weeps without a sound.', 'She never looks up. Her grief is a vigil: the patience of one who decided long ago to be the one who remains.'], () => go('eye', 0)); }
            }
            else if (ph === 'eye') { map.eyeK = Math.min(1, map.eyeK + dt * 0.4); if (map.eyeK >= 1) { ph = 'wait'; say([
                ['A voice from the sky', 'Eldrin.'],
                'The sky has an eye — not a face, but the centre a storm has: a violet-veined pupil of almost-black, ringed in the colour of old blood, fixed on you with the attention of something that saw you long ago and has been patient ever since. You know the name before it is spoken. Vorgos. The Stormbringer.',
                ['Vorgos', 'The Lock will fail.'],
                ['Vorgos', 'Find the Anchor.'],
                ['Vorgos', 'The Anchor is the Heartstone of Creation. It is what holds. It has always been what holds. Find it, and it will hold again.'],
                ['Eldrin', 'Why me?'],
                'The eye does not answer. Who was the woman? Who was the man who held the door? What is the Lock? It answers none of it. It had one thing to give, and it has given it.',
                ['Vorgos', 'Rise, Eldrin. The century is late.'],
                'Something burns into you — a line drawn from the base of your skull to a point behind your right eye, cooling into a direction that will never cool. East. A compass whose needle has been nailed to the page. It points to the Heartstone.',
            ], () => { ph = 'gone'; wash(true, 1200); setTimeout(() => {
                const f = flags(); f.vision_seen = true; f.compass = true;
                quests.manager.onTalk('ch2_vision'); delete p.buffs.shaping;
                world.go('tower', 'study_floor', () => setTimeout(() => { wash(false, 1600); say([
                    'You are lying on the floor of your study. The candle burns upright again, as if nothing had happened; the bell has stopped.',
                    'Beneath the hollow, deep and steady as a second heartbeat, the needle lies in your mind. East.',
                ], () => { f.archive_unsealed = true; begin('main_scholars_life'); hud.banner("The Scholar's Life"); save(); }); }, 400));   // Eldrin has held the Archive's key for thirty years (book ch. 3)
            }, 1300); }); } }
        } };
    }

    // ---------- 3: the Archive's three fragments ----------
    function archive(map) {
        const at = (a, r) => new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
        const frag = (id, text, a) => map.stations.push({ mode: 'sign', id, text, pos: at(a, 6.4), onUse: () => { if (log('main_scholars_life') === 'active') { quests.manager.onTalk(id); save(); if (fragmentsDone()) hud.banner('Three witnesses'); } } });
        map.stations.push({ mode: 'sign', id: 'ch3_shelf', text: TEXT.shelf, pos: at(Math.PI * 0.5, 6.4) });
        frag('ch3_manifest', TEXT.manifest, Math.PI * 0.95);
        frag('ch3_canticle', TEXT.canticle, Math.PI * 1.5);
        frag('ch3_physician', TEXT.physician, Math.PI * 0.05);
        return { update() {} };
    }
    const prog = id => stats.questLog?.main_scholars_life?.progress?.[id] ?? 0;
    const fragmentsDone = () => prog('ch3_manifest') && prog('ch3_canticle') && prog('ch3_physician');
    // Home again with the three witnesses: the packing, the iron door, the line — and the road east.
    function seal() {
        say([
            'The three fragments lie on the desk beside the cores. The Anchor is the Heartstone of Creation; the Anchor is what holds; and the Anchor was carried, in the old age, "to the ruin" — east, over the mountains, where the needle points.',
            'You pack. It is strange how little a life comes to when it is laid out for travel: the old staff, worn smooth by thirty years of stairs; three changes of clothes for a winter you mean to walk across; the second journal and two blank ones; a rune-kit; the letter from Silverrun, folded soft as cloth.',
            'You leave the cores in their slots. They told you the truth about the world. They have earned their rest.',
            'On the last page you will write as a man who lives in a tower: "I am a historian. I am going to go and stand in the way of history."',
            'You pull the iron door to behind you and turn the key, and the lock engages with a sound like the closing of a ledger.',
            ['Eldrin', 'The scholar\'s life is mine to live no more.'],
        ], () => { quests.manager.onTalk('ch3_seal'); begin('main_odysseys_dawn'); hud.banner("Odyssey's Dawn"); save(); world.go('outdoor', 'door'); });
    }

    // ---------- the threads between chapters 3–6 ----------
    function threads() {
        const f = flags();
        if (log('main_odysseys_dawn') === 'completed' && !stats.questLog?.main_whisperer_of_doubt) { begin('main_whisperer_of_doubt'); hud.banner('Next: the Summit of Despair — beyond the East Road'); }
        if (f.malphas_retreated && !stats.questLog?.main_elementals_trial) { begin('main_elementals_trial'); hud.banner('Next: over the pass, the river bridge — the Sylvan Sanctuary'); }
        if (f.aether_sight && log('main_elementals_trial') === 'completed' && !stats.questLog?.main_treacherys_bite) { begin('main_treacherys_bite'); hud.banner('Next: down from the Sanctuary — the Fire Gate'); }
    }

    let tick = 0;
    return {
        enter(map, id) {
            scene = null;
            const f = flags();
            // A new campaign starts at chapter 1 (saves already past it are left as they are).
            if ((id === 'outdoor' || id === 'tower' || id === 'eldoria') && !stats.questLog?.main_read_the_erasure && !stats.questLog?.main_odysseys_dawn && !f.vision_seen) {
                begin('main_read_the_erasure'); hud.banner('Echoes of Stone');
            }
            if (id === 'tower') { if (!map._prologue) map._prologue = study(map); scene = map._prologue; }
            if (id === 'vision') { scene = vision(map); }   // a fresh run each time
            if (id === 'forbidden_archive' && log('main_scholars_life') === 'active') { if (!map._ch3) map._ch3 = archive(map); scene = map._ch3; }
            if (id === 'tower' && log('main_scholars_life') === 'active' && fragmentsDone() && !prog('ch3_seal')) setTimeout(seal, 900);
        },
        update(dt, ctx) { scene?.update(dt, ctx); if ((tick -= dt) <= 0) { tick = 1; threads(); } },
    };
}
