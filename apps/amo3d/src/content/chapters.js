// Eldoria's Prophecy, chapters 6–12 (songs 6–12; the book's canon — books/eldorias_prophecy/canon/events.md —
// where it is more precise; the book wins over the album, never over the lore DB). Each chapter is a main quest of
// `talk` steps that the scenes below complete; finishing one starts the next.
//   6 Treachery's Bite — the Fire Gate's first landing: Oren, Voraun's agent of thirty years, strikes with a
//     shadow-blade; he needs a hand the Stone accepts, so he leaves Eldrin alive, takes the journal, goes down first.
//   7 The Solitary Path — down alone through the Labyrinth's halls; out the far side to the crucible.
//   8 Inferno's Trial — the crucible: Xarathos drains Eldrin's inner light; a spell landing while he drains turns
//     it back (the rune-drain counter); the Pyre-Lord is destroyed. "Voraun will have you at the door."
//   9 Eldoria's Heartbeat — the Ruins: the rune-dead gate (Voraun's silence) wakes to the sight; the Heartstone
//     reads Eldrin's hand and accepts it; Voraun, who waited at the door, turns spells back; reaching for the Stone,
//     he is burned by its ward. His dying truth: "The Legion is a gate, not the dark."
//  10 Heart of War — the Ancient Door: the Shadow Balrog absorbs everything; Eldrin stops demanding and stands as
//     what the Stone is meant for, its keeper; the Balrog yields the way, satisfied.
//  11 The Weight of Eternity — Vorgos steps from time: "Put down the Stone, and walk away." Eldrin refuses; the
//     condition is four hundred years.
//  12 Dawn's Embrace — home to the tower; the ward of the keeping is drawn; the vigil begins.
// Characters never speak of songs or albums (media-model rule). Only for Eldrin's story (not a hero of your own).
import * as THREE from 'three';
import { createDuelist } from './actors/duelist.js';
import { createCharacter } from './models/character.js';
import { normalizeLook } from './models/look.js';

const Q = (id, title, description, steps, next) => ({ id, title, type: 'main', description, steps: steps.map(([sid, label]) => ({ id: sid, type: 'talk', target: sid, label, required: 1 })), reward: { xp: 400, items: [] }, next });
export const CHAPTER_QUESTS = {
    main_treacherys_bite: Q('main_treacherys_bite', "Treachery's Bite", 'Oren went ahead to the Fire Gate to look at the stair. Find him at the first landing.',
        [['ch6_oren', "Find Oren at the Fire Gate's first landing"], ['ch6_betrayal', 'Survive the dagger that the shadows bring']], 'main_solitary_path'),
    main_solitary_path: Q('main_solitary_path', 'The Solitary Path', 'Oren has the journal and is going down ahead. There is no one left to trust. Go down alone.',
        [['ch7_halls', "Go down alone through the gate of flame, into the Labyrinth's halls"], ['ch7_crucible', 'Find the way through the halls to the crucible']], 'main_infernos_trial'),
    main_infernos_trial: Q('main_infernos_trial', "Inferno's Trial", 'At the heart of the Labyrinth the mountain burns. Someone is waiting in the crucible.',
        [['ch8_xarathos', 'Face the Pyre-Lord in the crucible']], 'main_eldorias_heartbeat'),
    main_eldorias_heartbeat: Q('main_eldorias_heartbeat', "Eldoria's Heartbeat", 'Beyond the mountain lie the Ruins of Eldoria, and in them the Heartstone.',
        [['ch9_gate', 'Wake the rune-dead gate of the Ruins'], ['ch9_stone', "Find the Heartstone at the bottom of the keepers' way"], ['ch9_voraun', 'Survive the one who has been waiting the longest']], 'main_heart_of_war'),
    main_heart_of_war: Q('main_heart_of_war', 'Heart of War', 'Beyond the Heartstone chamber stands a door older than the valley. Something keeps it.',
        [['ch10_balrog', 'Face what keeps the Ancient Door']], 'main_weight_of_eternity'),
    main_weight_of_eternity: Q('main_weight_of_eternity', 'The Weight of Eternity', 'The way is open, and the Stone is in your hand. The air in the ruins has gone grey.',
        [['ch11_vorgos', 'Hear the condition']], 'main_dawns_embrace'),
    main_dawns_embrace: Q('main_dawns_embrace', "Dawn's Embrace", 'Bring the Stone home to the tower, and draw the ward of the keeping round it.',
        [['ch12_ward', 'Draw the ward of the keeping in your tower']], null),
};
export function registerChapterQuests(stats) { stats.generatedQuests ??= {}; for (const [id, q] of Object.entries(CHAPTER_QUESTS)) stats.generatedQuests[id] ??= JSON.parse(JSON.stringify(q)); }

const LOOKS = {
    oren: normalizeLook({ body: { preset: 'adult_male', skin: '#d8b08a' }, hair: { style: 'short', color: '#6a5a4a' }, facialHair: { style: 'beard', color: '#6a5a4a' },
        parts: { torso: { id: 'tunic', colors: { primary: '#5a4a38', collar: '#3a2e22', trim: '#a89070' } }, legs: { id: 'trousers', colors: { primary: '#3a3028' } }, feet: { id: 'boots', colors: { primary: '#4a3424', dark: '#2a1e14' } },
            arms: { id: 'sleeves' }, shoulders: { id: 'none' }, headgear: { id: 'none' }, cape: { id: 'travelling_cloak', colors: { primary: '#4a4a3a', trim: '#8a7a5a' } }, back: { id: 'satchel' }, right: { id: 'dagger', accent: '#8a5aff' }, left: { id: 'none' } } }),
    xarathos: normalizeLook({ body: { preset: 'adult_male', race: 'fallen_aurorian', skin: '#a89c94', height: 1.1 }, face: { eyes: '#ff6a30' }, hair: { style: 'long', color: '#2a2420' }, facialHair: { style: 'none' },
        parts: { torso: { id: 'robe', colors: { primary: '#5a1a12', collar: '#2a0a08', trim: '#ff8a30' } }, legs: { id: 'trousers', colors: { primary: '#1a1010' } }, feet: { id: 'boots', colors: { primary: '#1a1010', dark: '#0a0606' } },
            arms: { id: 'sleeves' }, shoulders: { id: 'steel_pauldrons', colors: { primary: '#2a1a1a', trim: '#ff7a20' } }, headgear: { id: 'crown', colors: { primary: '#ff9a30', trim: '#ff3a10' } }, right: { id: 'staff', accent: '#ff6a20' }, left: { id: 'none' } } }),
    voraun: normalizeLook({ body: { preset: 'adult_male', skin: '#8a8490', height: 1.08 }, face: { eyes: '#d8d8e0' }, hair: { style: 'short', color: '#1a1a1e' }, facialHair: { style: 'none' },
        parts: { torso: { id: 'plate_cuirass', colors: { primary: '#1a1a1e', steel: '#4a4a52', trim: '#6a6a74' } }, legs: { id: 'trousers', colors: { primary: '#141418' } }, feet: { id: 'sabatons', colors: { primary: '#3a3a42' } },
            arms: { id: 'gauntlets', colors: { primary: '#3a3a42', sleeve: '#2a2a30' } }, shoulders: { id: 'steel_pauldrons', colors: { primary: '#3a3a42', trim: '#5a5a64' } }, headgear: { id: 'hood', colors: { primary: '#121216' } }, cape: { id: 'travelling_cloak', colors: { primary: '#101014', trim: '#3a3a42' } }, right: { id: 'sword', accent: '#5a3a8a' }, left: { id: 'none' } } }),
    balrog: normalizeLook({ body: { preset: 'adult_male', race: 'fallen_aurorian', skin: '#16121c', width: 1.25 }, face: { eyes: '#ff5a20' }, hair: { style: 'none', color: '#000000' }, facialHair: { style: 'none' },
        parts: { torso: { id: 'armour', colors: { primary: '#0e0c12', steel: '#1e1a24', trim: '#ff5a20' } }, legs: { id: 'trousers', colors: { primary: '#0e0c12' } }, feet: { id: 'bare' }, arms: { id: 'bare' },
            shoulders: { id: 'steel_pauldrons', colors: { primary: '#1e1a24', trim: '#ff5a20' } }, headgear: { id: 'great_helm', colors: { primary: '#1a1620', trim: '#ff5a20' } }, cape: { id: 'travelling_cloak', colors: { primary: '#08060a', trim: '#2a1a1a' } }, right: { id: 'sword', accent: '#ff5a20' }, left: { id: 'none' } } }),
    vorgos: normalizeLook({ body: { preset: 'elder', skin: '#b8b8c0', height: 1.12 }, face: { eyes: '#e8f0ff' }, hair: { style: 'long', color: '#c8c8d0' }, facialHair: { style: 'beard', color: '#c8c8d0' },
        parts: { torso: { id: 'robe', colors: { primary: '#6a6a74', collar: '#4a4a54', trim: '#c8d0e0' } }, headgear: { id: 'hood', colors: { primary: '#5a5a64' } }, right: { id: 'staff', accent: '#c8e0ff' }, left: { id: 'none' }, feet: { id: 'bare' } } }),
};

export function createChapters({ stats, hud, dialogue, quests, save, player, world, relock, cam }) {
    const flags = () => (stats.flags ??= {});
    const active = id => stats.questLog?.[id]?.status === 'active';
    const done = id => stats.questLog?.[id]?.status === 'completed';
    const say = (lines, then) => dialogue.start(lines.map(l => (typeof l === 'string' ? { speaker: '', text: l } : { speaker: l[0], text: l[1], ...(l[2] ? { choices: l[2] } : {}) })), then);
    const step = (id, quest) => { quests.manager.onTalk(id); if (quest && done(quest)) { const nx = CHAPTER_QUESTS[quest].next; if (nx && !stats.questLog?.[nx]) quests.start(nx); } save(); };
    const near = (p, x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
    const built = new WeakSet();
    let scene = null;   // the current map's chapter scene: { update(dt, ctx) }

    function begin(id) { if (!stats.questLog?.[id]) quests.start(id); }

    // ---------- 6: the Fire Gate ----------
    function fireGate(map) {
        const st = { phase: 'wait' };
        const oren = createDuelist({ scene: map.scene, map, at: { x: 2.5, z: -6, facing: Math.PI }, look: LOOKS.oren, name: 'Oren', reach: 1.5, speed: 3.6, windup: 0.35,
            def: { id: 'oren', health: 260, damage: 12, xpReward: 0, goldDrop: 0, lootTable: [] }, lowAt: 0.45, onLow: () => endFight(), aura: 0x8a5aff });
        oren.hold(true); map.hittables.push(oren);
        function endFight() {
            if (st.phase !== 'fight') return;
            st.phase = 'after'; oren.hold(true);
            stats.health = Math.max(1, Math.min(stats.health, 12));
            say([
                'The shadow-blade turns in his hand, quick as a thought, and the flat of it takes you across the temple. The stone of the landing comes up to meet you.',
                ['Oren', "Don't get up. I mean that kindly — the kindness was never the lie. The scholarship was real, the road was real. The loyalty was a job. Thirty years of it."],
                ['Oren', 'The Stone will not let me take it. It reads the hand that reaches. Yours, it will accept. So you live, and you walk on, and when you open the door I will be there.'],
                'He kneels and takes the journal from your satchel — forty years of notes, and the coordinates the vision gave. Not the compass. He leaves you the compass.',
                ['Oren', 'He has been waiting the longest. Goodbye, Eldrin.'],
                'He goes down the black-glass stair without looking back. The runes in the stone are warm. Somewhere far above, the storm that moved you east says nothing at all.',
            ], () => {
                const i = stats.inventory.findIndex(x => x.id === 'eldrins_journal'); if (i >= 0) stats.inventory.splice(i, 1);
                oren.remove(); map.hittables.splice(map.hittables.indexOf(oren), 1);
                flags().oren_betrayal = true; hud.banner("Treachery's Bite"); step('ch6_betrayal', 'main_treacherys_bite');
                hud.message('You are alone now. Go down through the gate of flame.');
            });
        }
        return { update(dt, ctx) {
            const p = player.state;
            if (flags().oren_betrayal) return;
            if (st.phase === 'fight' && p.dead) { st.phase = 'wait'; oren.hold(true); oren.heal(); }   // fell: he waits at the landing again
            if (st.phase === 'fight' && stats.health < stats.maxHealth * 0.3) endFight();
            if (st.phase === 'wait' && near(p.pos, 0, -8, 7) && !p.dead) {
                st.phase = 'talk'; begin('main_treacherys_bite');
                say([
                    ['Oren', 'There you are. Look at it — a stair of black glass worn hollow by centuries, and runes that hold heat. I have read about this landing since I was a boy.'],
                    ['Eldrin', "You went ahead without me. The Hermit didn't like you."],
                    ['Oren', 'The Hermit reads the second hand of the world. He read mine.'],
                    'He turns. Something in the air beside him goes out, like a candle in a draught — and in his hand there is a blade that is not there, a blade made of the dark between things.',
                    ['Oren', 'I am sorry. That part is true too.'],
                ], () => { step('ch6_oren', 'main_treacherys_bite'); st.phase = 'fight'; oren.hold(false); hud.message('Oren attacks — the dagger that the shadows bring'); });
            }
        } };
    }

    // ---------- 7: the halls ----------
    function halls(map) {
        return { update() {
            if (active('main_solitary_path') && !flags().halls_entered) { flags().halls_entered = true; hud.message('You go down alone. No one to watch your back now — and no one to watch it for.'); step('ch7_halls', 'main_solitary_path'); }
            const warden = map.hittables.find(h => h.elite?.boss);
            if (warden && !warden.alive && !flags().halls_walked) { flags().halls_walked = true; save(); }
        } };
    }

    // ---------- 7 (end) and 8: the crucible ----------
    function crucible(map) {
        const C = { x: 34, z: -34 };
        const st = { phase: 'wait', wallMsg: 0, counters: 0, warned: false, vulnerable: 0 };
        const xar = createDuelist({ scene: map.scene, map, at: { x: C.x, z: C.z - 2, facing: 0 }, look: LOOKS.xarathos, name: 'Xarathos, the Pyre-Lord', scale: 1.15, reach: 2.0, speed: 2.8,
            def: { id: 'xarathos', health: 520, damage: 18, xpReward: 600, goldDrop: 60, lootTable: [{ id: 'ember_stone', chance: 1 }] }, aura: 0xff6a20,
            takeMult: h => { if (st.vulnerable > 0) { h.label = null; return 2.2; } h.label = 'the fire takes it'; return 0.25; },
            channel: { every: 7, dur: 2.8, color: 0xffb040,
                begin: () => { if (!st.warned) { st.warned = true; say([['Xarathos', 'You burn so brightly, keeper. Let me drink it. A light like yours would make a vessel the Stone could not refuse.'], 'A thread of gold light pulls out of your chest toward him. Your strength goes with it. — Turn it back: strike him with a spell while he drinks.']); } else hud.message('He drinks your light — strike him with a spell!'); },
                tick: (dt) => { stats.mana = Math.max(0, stats.mana - 12 * dt); st.drain = (st.drain ?? 0) + dt; if (st.drain > 0.5) { st.drain = 0; stats.health = Math.max(1, stats.health - 3); } },
                broken: () => { st.counters++; st.vulnerable = 4; xar.stun(3.5); cam?.kick(0.4); hud.message(st.counters === 1 ? 'The rune-drain counter — his own hunger turns on him! Strike now.' : 'Turned back again!'); } } });
        xar.hold(true); map.hittables.push(xar);
        return { update(dt, ctx) {
            const p = player.state, f = flags();
            if (f.xarathos_destroyed) return;
            st.vulnerable = Math.max(0, st.vulnerable - dt);
            if (!f.halls_walked) {   // the crucible's fire walls off the valley path: the way is through the halls
                if (near(p.pos, C.x, C.z, 13)) { const dx = p.pos.x - C.x, dz = p.pos.z - C.z, d = Math.hypot(dx, dz) || 1; p.pos.x = C.x + dx / d * 13; p.pos.z = C.z + dz / d * 13; if ((st.wallMsg -= dt) <= 0) { st.wallMsg = 4; hud.message('A wall of fire rises round the crucible. The way to it is through the Labyrinth\'s halls.'); } }
                return;
            }
            if (active('main_solitary_path') && !f.crucible_reached && near(p.pos, C.x, C.z, 16)) { f.crucible_reached = true; step('ch7_crucible', 'main_solitary_path'); }
            if (st.phase === 'fight' && p.dead) { st.phase = 'wait'; xar.hold(true); xar.heal(); }
            if (st.phase === 'wait' && near(p.pos, C.x, C.z, 10) && !p.dead && done('main_solitary_path')) {
                st.phase = 'talk'; begin('main_infernos_trial');
                say([
                    'The crucible: the heart-chamber where the mountain\'s core burns away pretence. Here the fire has no choice but to be true.',
                    'In the middle of it stands a man made of light that has gone wrong — an Aurorian once, grey now, the cracks in his face glowing like a forge seen through a door.',
                    ['Xarathos', 'The old man from the tower. Malphas whispered at you and ran. I do not whisper. I burn.'],
                    ['Eldrin', 'Then burn, and let us be done.'],
                ], () => { st.phase = 'fight'; xar.hold(false); hud.message('Xarathos, the Pyre-Lord'); });
            }
            if (st.phase === 'fight' && !xar.alive) {
                st.phase = 'after';
                say([
                    'The drain turns back on him all at once — the light he took, and the light he was, burning out through the cracks in his face.',
                    ['Xarathos', 'Arrogance. That is the crack you found… Listen, keeper. Voraun will have you at the door. He has been waiting the longest.'],
                    'The fire in the crucible goes white, then quiet. Where he stood there is only ash, and the heat of the mountain, and a way through the heart of it.',
                ], () => { f.xarathos_destroyed = true; relock(map); hud.banner("Inferno's Trial"); step('ch8_xarathos', 'main_infernos_trial'); hud.message('The way through the mountain\'s heart is open — to the Ruins of Eldoria.'); });
            }
        } };
    }

    // ---------- 9, 10, 11: the Ruins of Eldoria ----------
    function ruins(map) {
        const st = { gate: 'wait', voraun: 'none', balrog: 'none', vorgos: 'none', absorbed: 0, t: 0 };
        // the rune-dead gate is a wall until it wakes
        const barrier = { ax: -2.6, az: 54, bx: 2.6, bz: 54, r: 0.4, kind: 'wall', y0: -1, y1: 8 };
        if (!flags().ruins_gate_woken) map.colliders.push(barrier);
        const glow = new THREE.MeshBasicMaterial({ color: 0xa8c8ff, toneMapped: false, transparent: true, opacity: flags().ruins_gate_woken ? 0.9 : 0 });
        for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.06), glow); r.position.set(sx * 3, (map.heightAt(sx * 3, 54)) + 1.2 + k, 54.75); map.scene.add(r); }
        // the Heartstone on its pedestal, until taken
        const stone = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshBasicMaterial({ color: 0xffe0a0, toneMapped: false }));
        stone.position.set(0, map.heightAt(0, -40) + 1.95, -40); stone.visible = !flags().heartstone_taken; map.scene.add(stone);
        const stoneLight = new THREE.PointLight(0xffd890, stone.visible ? 8 : 0, 10, 1.6); stoneLight.position.copy(stone.position); map.scene.add(stoneLight);
        let voraun = null, balrog = null, vorgos = null;
        function startVoraun() {
            voraun = createDuelist({ scene: map.scene, map, at: { x: 0, z: -30, facing: Math.PI }, look: LOOKS.voraun, name: 'Voraun, the Silent Executioner', scale: 1.08, reach: 1.9, speed: 3.4,
                def: { id: 'voraun', health: 560, damage: 20, xpReward: 700, goldDrop: 80, lootTable: [] }, lowAt: 0.12, aura: 0x6a4aaa,
                onHit: h => { if (h.element) { h.label = 'turned back'; h.ctx?.hurtPlayer?.(Math.max(1, Math.round(h.dmg * 0.5)), voraun.pos); if (!st.reflectWarned) { st.reflectWarned = true; hud.message('Runic reflection — your spells come back at you. It will have to be steel.'); } } },
                takeMult: h => (h.element ? 0 : 1),
                onLow: () => { voraun.hold(true); st.voraun = 'end'; say([
                    'He falls back, and then — quick as Oren, quicker — he reaches for the Stone in your hand. His fingers close on it.',
                    'The ward of the Stone wakes. It does not burn the way fire burns. It burns the way a true thing burns a lie: all at once, from the inside.',
                    ['Voraun', 'Thirty years… I sat at the door for thirty years… Listen. The Legion is a gate, not the dark. The Legion is a gate—'],
                    'There is nothing left of him but the cold where he stood, and Oren\'s dagger of shadow lying on the stone, going out.',
                ], () => { voraun.kill(); flags().voraun_burned = true; hud.banner("Eldoria's Heartbeat"); step('ch9_voraun', 'main_eldorias_heartbeat'); hud.message('The Ancient Door lies beyond the chamber.'); }); } });
            map.hittables.push(voraun);
            say([
                'The air behind you goes quiet in a way air should not — not silence, a subtraction, as if the world had been rubbed out in the shape of a man.',
                ['Voraun', 'Thank you, keeper. Thirty years I waited at this door for a hand the Stone would take. Oren brought me your journal. You brought me the rest.'],
            ], () => { st.voraun = 'fight'; hud.message('Voraun, the Silent Executioner'); });
        }
        function startBalrog() {
            balrog = createDuelist({ scene: map.scene, map, at: { x: 0, z: -51, facing: Math.PI }, look: LOOKS.balrog, name: 'The Shadow Balrog', scale: 2.6, reach: 3.6, speed: 2.2, windup: 0.8,
                def: { id: 'shadow_balrog', health: 9999, damage: 26, xpReward: 900, goldDrop: 0, lootTable: [] }, aura: 0xff4a10,
                takeMult: h => { st.absorbed++; h.label = 'taken, the way the floor takes a spill'; return 0; } });
            map.hittables.push(balrog);
            say([
                'Before the Ancient Door the dark stands up. It is taller than the door. It is older than the keeping. It does not speak.',
                'The Hermit\'s words come back to you: it cannot be commanded, and it cannot be bargained with.',
            ], () => { st.balrog = 'fight'; st.t = 0; hud.message('The Shadow Balrog'); });
        }
        function balrogChoice() {
            balrog.hold(true); st.balrog = 'choice';
            say([
                'Runes, ward, beacon, staff, the sight itself — everything you throw at it is taken, the way the floor takes a spill. The weight of its hunger presses you down to your knees. Placed, not fallen.',
                ['', 'What do you do?', [
                    { text: 'Get up and strike again.', onPick: () => { st.retry = true; } },
                    { text: 'Stop. Lay down the staff. Stand as what the Stone is meant for — its keeper.', onPick: () => { st.yield = true; } },
                ]],
            ], () => {
                if (st.yield) {
                    say([
                        'You stop demanding. You stand — not as a man who wants the door, but as the one the Stone was always meant for: the one who keeps it.',
                        'The dark looks at you for a long time. Then it steps aside from the Ancient Door. Not defeated. Not commanded. Satisfied.',
                        'The passage is open. The weight is gone from your shoulders — and a different weight has come to rest in your hands.',
                    ], () => {
                        balrog.remove(); map.hittables.splice(map.hittables.indexOf(balrog), 1);
                        flags().balrog_yielded = true; hud.banner('Heart of War'); step('ch10_balrog', 'main_heart_of_war');
                        setTimeout(startVorgos, 1200);
                    });
                } else { st.retry = false; st.absorbed = 0; st.t = 0; st.balrog = 'fight'; balrog.hold(false); }
            });
        }
        function startVorgos() {
            st.vorgos = 'talk';
            vorgos = createCharacter(LOOKS.vorgos);
            vorgos.root.position.set(0, map.heightAt(0, -44), -44); vorgos.root.rotation.y = 0; map.scene.add(vorgos.root);
            const storm = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 8), new THREE.MeshBasicMaterial({ color: 0xb8c0d0, transparent: true, opacity: 0.08, depthWrite: false })); storm.position.y = 1.3; vorgos.root.add(storm); st.storm = storm;
            const again = [['Vorgos', 'Put down the Stone, and walk away.']];
            const test = () => say([
                'The air of the ruins goes grey — a storm of grey, standing still. Out of it steps the one who moved you east. Vorgos, the Stormbringer, who reads the planes like a ledger.',
                ['Vorgos', 'Put down the Stone, and walk away.', [
                    { text: 'Put it down. Walk away. Go home.', next: [['Vorgos', 'Then go.'], 'You cannot. Your hand will not open. The Stone is warm in it, and it is yours, and you are its.', ...again.map(([a, b]) => ({ speaker: a, text: b }))].map(l => (Array.isArray(l) ? { speaker: l[0], text: l[1] } : typeof l === 'string' ? { speaker: '', text: l } : l)), onPick: () => { st.again = true; } },
                    { text: 'No.', onPick: () => { st.refused = true; } },
                ]],
            ].map(l => l), () => {
                if (!st.refused) { st.again = false; test(); return; }
                say([
                    ['Vorgos', 'No. That is the answer I needed, and the one I feared. Then hear the condition, keeper, all of it.'],
                    ['Vorgos', 'The one who will need this Stone is not born. He will not be born for a very long time. You will keep it until he comes — four hundred years. A hundred years, and then three more.'],
                    ['Vorgos', 'Your friends will die. Thaloria will change its streets and its kings and its name for you. You will remain.'],
                    ['Eldrin', 'Then I will remain.'],
                    ['Vorgos', 'You are the bridge, Eldrin Nightshade — between the tragedy that was and the rescue that will be. Go home. Draw the ward. Begin.'],
                    'The grey goes out of the air. He is gone, the way weather is gone.',
                ], () => {
                    vorgos.root.parent?.remove(vorgos.root); st.vorgos = 'done';
                    flags().vorgos_condition = true; hud.banner('The Weight of Eternity'); step('ch11_vorgos', 'main_weight_of_eternity');
                    hud.message('Bring the Stone home to your tower.');
                });
            });
            begin('main_weight_of_eternity');
            test();
        }
        return { update(dt, ctx) {
            const p = player.state, f = flags();
            glow.opacity += ((f.ruins_gate_woken ? 0.9 : 0) - glow.opacity) * Math.min(1, dt * 2);
            stone.rotation.y += dt; stone.visible = !f.heartstone_taken; stoneLight.intensity = stone.visible ? 8 + Math.sin(ctx.t ?? 0) : 0;
            if (vorgos) { vorgos.update(dt, { speed: 0, sprinting: false, hopK: null }); if (st.storm) st.storm.rotation.y += dt * 0.6; }
            if (p.dead) {   // a fight lost: it waits for you again
                if (st.voraun === 'fight' && voraun) { voraun.remove(); map.hittables.splice(map.hittables.indexOf(voraun), 1); voraun = null; st.voraun = 'none'; }
                if (st.balrog === 'fight' && balrog) { balrog.remove(); map.hittables.splice(map.hittables.indexOf(balrog), 1); balrog = null; st.balrog = 'none'; }
                return;
            }
            // 9a: the gate
            if (!f.ruins_gate_woken && st.gate === 'wait' && near(p.pos, 0, 57, 4.5) && (active('main_eldorias_heartbeat') || done('main_infernos_trial'))) {
                st.gate = 'talk'; begin('main_eldorias_heartbeat');
                say([
                    'The runes on the gate are dead — not broken, not worn: silenced, as if someone had told them to stop. Voraun\'s silence, laid over the keeping like a hand over a mouth.',
                    ['', f.aether_sight ? 'With the sight, the second hand of the world shows under the first: the runes are not gone. They are waiting to be read.' : 'You look harder, the way the Hermit taught. Under the dead runes, something waits to be read.', [
                        { text: 'Read them aloud — the second hand.', onPick: () => { st.read = true; } },
                        { text: 'Leave it for now.' },
                    ]],
                ], () => {
                    if (!st.read) { st.gate = 'wait'; return; }
                    f.ruins_gate_woken = true; const i = map.colliders.indexOf(barrier); if (i >= 0) map.colliders.splice(i, 1);
                    hud.message('The runes wake one by one, cold blue, and the gate lets you through.'); step('ch9_gate', 'main_eldorias_heartbeat');
                });
            }
            // 9b: the Heartstone
            if (f.ruins_gate_woken && !f.heartstone_taken && near(p.pos, 0, -40, 2.8) && st.gate !== 'stone') {
                st.gate = 'stone';
                say([
                    'At the bottom of the keepers\' way, on its pedestal, the Heartstone of Creation: a small warm light that hums.',
                    'You reach for it, and it reads you — the way you read the strata at Echoes of Stone, layer by layer. It does not hurry. It will not be taken by force, and it will not be deceived.',
                    'Then it is in your hand, warm, heavier than a stone that size should be. It has accepted you.',
                ], () => {
                    f.heartstone_taken = true; stats.addItem?.('heartstone', 1); hud.banner('The Heart Stone of Creation'); step('ch9_stone', 'main_eldorias_heartbeat');
                    setTimeout(startVoraun, 900);
                });
            }
            // 10: the Balrog, at the Ancient Door
            if (f.voraun_burned && !f.balrog_yielded && st.balrog === 'none' && near(p.pos, 0, -50, 8)) { begin('main_heart_of_war'); st.balrog = 'rising'; startBalrog(); }
            if (st.balrog === 'fight' && balrog) {
                st.t += dt;
                if (stats.health < stats.maxHealth * 0.15) stats.health = Math.ceil(stats.maxHealth * 0.15);   // pinned to his knees — placed, not fallen
                if (st.absorbed >= 6 || st.t > 22 || stats.health <= Math.ceil(stats.maxHealth * 0.15)) balrogChoice();
            }
            // 11: if you left before Vorgos came
            if (f.balrog_yielded && !f.vorgos_condition && st.vorgos === 'none' && near(p.pos, 0, -44, 10)) startVorgos();
        } };
    }

    // ---------- 12: the tower ----------
    function tower(map) {
        const hearth = (map.stations ?? []).find(s => s.mode === 'hearth');
        const pos = hearth ? hearth.pos.clone().add(new THREE.Vector3(0, 0, 2.6)) : new THREE.Vector3(0, 0, 0);   // beside the hearth, in the hall
        map.stations.push({ mode: 'sign', id: 'ch12_sanctum', text: 'The place in the hall where the old ward-lines were cut into the floor, long before you were born.', pos,
            onUse: () => {
                const f = flags();
                if (!active('main_dawns_embrace') || f.campaign_complete) return;
                say([
                    'You set the Stone down in the middle of the old lines, and you draw the ward of the keeping round it — the same ward the Hermit drew, once, and could not hold.',
                    ['Eldrin', 'I am the watcher, here and now.'],
                    'The years fold. The city below changes its streets and its kings. Your sight remains; your life narrows to the Stone. Thaloria begins to call you the Blind Prophet — blind to the ordinary, seeing only the long line of time.',
                    'Far below the world, in the Underworld Sanctuary, a violet crack in an old seal stops growing for the first time in decades. Two people who will never meet you stake their lives on a name.',
                    'Dawn breaks over the tower. The one who will need the key is not ready yet. You wait.',
                    'Until the Star-Guard needs the key.',
                ], () => { f.campaign_complete = true; step('ch12_ward', 'main_dawns_embrace'); hud.banner("Eldoria's Prophecy — the vigil begins"); });
            } });
        return { update() {} };
    }

    const BUILDERS = { fire_gate: fireGate, inferno_halls: halls, inferno_labyrinth: crucible, ruins_of_eldoria: ruins, tower };
    return {
        // A map is entered: build its chapter scene once (only once the story has reached it).
        enter(map, id) {
            scene = null;
            const f = flags();
            if (id === 'fire_gate' && f.aether_sight) begin('main_treacherys_bite');
            if (!BUILDERS[id]) return;
            if (!map._chapter) map._chapter = BUILDERS[id](map);
            scene = map._chapter;
        },
        update(dt, ctx) { scene?.update(dt, ctx); },
    };
}
