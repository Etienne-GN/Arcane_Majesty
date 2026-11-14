// The Sylvan Sanctuary (Song 5 / book ch. 9–10; lore DB: "a hidden mystical forest… a wise old hermit";
// event The Elemental's Trial). amo's own map is a stub, so this follows the campaign spec
// (data/lore/campaigns/eldorias_prophecy/sylvan_sanctuary.md) and, where they differ, the book:
//   — over the pass from the Summit into an impossible early-spring valley ringed by snow: a green cathedral
//     of living-wood arches, nameless flowers, motes of light, a river across it;
//   — the forest Elemental waits in the ford — wood, water and green light — and asks "Why do you seek the
//     light of day?", repeating it unchanged until it is answered truly; then it steps aside;
//   — the Hermit's hut of living walls at the heart of the green, a fire that does not smoke; the Hermit
//     (failed former Keeper, spirit-bound to the Elemental; bark-coloured skin, river-coloured eyes) teaches
//     Aether Sight and warns that the Balrog cannot be commanded or bargained with;
//   — the Corrupted Rim (east): the green greys; two Blight-Ents and three Root-Wraiths (side "Seeds of the
//     Valley"); the Hermit's old camp past the western rim, reached by a hidden path only the sight shows
//     (side "The Hermit's Debt"); the way down toward the Fire Gate (closed for now).
// Quests are registered as generated quests, so amo's quest manager runs them unchanged.
import * as THREE from 'three';
import { buildRegion } from '../engine/region.js';
import { flat } from '../engine/lib.js';
import { createBeasts, dailyRng } from './actors/beast.js';
import { createCharacter } from './models/character.js';

const ID = 'sylvan_sanctuary';
const FORD = { x: 0, z: 30 }, HUT = { x: 0, z: -14 }, RIM = { x: 54, z: -18 }, CACHE = { x: -60, z: -8 };

export const SANCTUARY_QUESTS = {
    main_elementals_trial: {
        id: 'main_elementals_trial', title: "The Elemental's Trial", type: 'main',
        description: 'A guardian of wood and water waits at the ford. Answer its question truly, then seek the Hermit at the heart of the valley.',
        steps: [
            { id: 'answer', type: 'talk', target: 'sanctuary_elemental', label: "Answer the Elemental's question", required: 1 },
            { id: 'hermit', type: 'talk', target: 'sanctuary_hermit', label: 'Seek out the Hermit at the heart of the valley', required: 1 },
        ],
        reward: { xp: 300, items: [] },
    },
    side_seeds_of_the_valley: {
        id: 'side_seeds_of_the_valley', title: 'Seeds of the Valley', type: 'side',
        description: "Shadow-Touched creep greys the valley's eastern rim. Clear the Blight-Ents and Root-Wraiths there so the green can heal.",
        steps: [
            { id: 'ents', type: 'kill', target: 'blight_ent', map: ID, label: 'Defeat Blight-Ents at the Corrupted Rim (0/2)', required: 2 },
            { id: 'wraiths', type: 'kill', target: 'root_wraith', map: ID, label: 'Defeat Root-Wraiths at the Corrupted Rim (0/3)', required: 3 },
        ],
        giver: 'sanctuary_hermit', giverName: 'the Hermit', turnIn: 'sanctuary_hermit', turnInName: 'the Hermit', turnInPlace: 'the Sylvan Sanctuary',
        reward: { xp: 120, gold: 30, items: ['forest_herb', 'forest_herb', 'mana_potion'] },
    },
    side_hermits_debt: {
        id: 'side_hermits_debt', title: "The Hermit's Debt", type: 'side',
        description: 'The Hermit left something at his old camp past the western rim, the night the green took him in. The way there is hidden — but not from the sight.',
        steps: [{ id: 'cache', type: 'talk', target: 'hermit_cache', label: "Find the Hermit's old camp past the western rim", required: 1 }],
        giver: 'sanctuary_hermit', giverName: 'the Hermit', turnIn: 'sanctuary_hermit', turnInName: 'the Hermit', turnInPlace: 'the Sylvan Sanctuary',
        reward: { xp: 100, items: ['resonance_amulet'] },
    },
};
export function registerSanctuaryQuests(stats) { stats.generatedQuests ??= {}; Object.assign(stats.generatedQuests, JSON.parse(JSON.stringify(SANCTUARY_QUESTS))); }

const DEF = {
    id: ID, name: 'The Sylvan Sanctuary', seed: 505, half: 80, water: -1.4, biome: 'temperate',
    terrain: { scale: 0.025, relief: 5, base: 0.9, rim: 30, snowLine: 13, rockLine: 9 },
    palette: { grassA: '#4f8a3a', grassB: '#7ab84a', dirt: '#7a6a48', rock: '#7a7a72', shore: '#5a7a4a', undergrowth: '#5a9a3a', stone: '#8a8a7a', snow: '#e8eef2', water: '#2a6a6a' },
    mood: { fog: '#cfe8c8', fogNear: 30, fogFar: 170, fogMix: 0.45, light: 1.05, nightFloor: 0.5, motes: '#d8ffb0' },
    features: [
        { type: 'river', pts: [[-90, 37], [-60, 33], [-30, 34], [0, 30], [28, 27], [56, 31], [90, 35]], w: 7, depth: 14 },   // the river (deep: it even cuts the rim, so the ford is the only crossing) across the valley; the path fords it
        { type: 'clearing', x: HUT.x, z: HUT.z, r: 15 }, { type: 'clearing', x: RIM.x, z: RIM.z, r: 12 }, { type: 'clearing', x: 0, z: 56, r: 12 },
    ],
    path: [[0, 60], [5, 50], [-3, 42], [FORD.x, FORD.z], [-7, 14], [4, 2], [HUT.x, HUT.z + 6], [HUT.x, HUT.z - 8], [-6, -38], [3, -58], [0, -70]],
    branches: [[[4, 2], [26, -6], [RIM.x - 8, RIM.z]]],
    trees: { count: 230, gaps: 0.25, sizeVar: 0.7, kinds: { broad: 0.55, birch: 0.25, pine: 0.2 }, colors: { broad: '#3f8a34', pine: '#2f5a3a' } },
    rocks: 50,
    gather: { herb: 4, wood: 2 },
    tints: [{ x: RIM.x, z: RIM.z, r: 22, color: '#6a6a62', k: 0.75 }],   // the Corrupted Rim greys the green
    actors: [{ type: 'deer', homes: [{ x: -24, z: 4 }, { x: 22, z: 50 }] }],
    landmarks: [
        { name: 'The Ford', x: FORD.x, z: FORD.z, icon: 'stones' },
        { name: "The Hermit's Hut", x: HUT.x, z: HUT.z, icon: 'tower' },
        { name: 'The Corrupted Rim', x: RIM.x, z: RIM.z, icon: 'den' },
    ],
    links: [
        { label: 'Back over the pass — the Summit', x: 0, z: 58, facing: Math.PI, spawn: 'from_summit', to: 'the_summit', toSpawn: 'from_sanctuary' },
        { label: 'Down toward the Fire Gate', x: 0, z: -72, facing: 0, spawn: 'from_fire_gate' },
    ],
    start: { x: 0, z: 50, facing: Math.PI },
};

// The forest Elemental: a height of wood and water and green light; branches for arms; no face — a stillness of
// bark and leaf and river-light.
function buildElemental() {
    const root = new THREE.Group(), parts = {};
    const wood = flat(0x5a4632), moss = flat(0x4a7a34), leaf = flat(0x5aa83a, { side: THREE.DoubleSide });
    const light = new THREE.MeshStandardMaterial({ color: 0xa8f0c8, emissive: 0x4ac88a, emissiveIntensity: 0.8, transparent: true, opacity: 0.35, depthWrite: false, flatShading: true });
    const add = (geo, m, x, y, z, parent = root) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = m !== light; parent.add(o); return o; };
    add(new THREE.CylinderGeometry(0.4, 0.7, 3.2, 8), wood, 0, 1.6, 0);
    for (let k = 0; k < 6; k++) add(new THREE.DodecahedronGeometry(0.28, 0), moss, Math.cos(k) * 0.45, 0.6 + k * 0.45, Math.sin(k) * 0.4);
    add(new THREE.CylinderGeometry(0.75, 0.95, 3.6, 10, 1, true), light, 0, 1.8, 0);   // the water-and-light shell
    const head = add(new THREE.IcosahedronGeometry(0.55, 0), wood, 0, 3.55, 0); head.scale.set(1, 1.2, 0.9);
    parts.face = add(new THREE.CircleGeometry(0.32, 10), new THREE.MeshBasicMaterial({ color: 0xc8ffd8, transparent: true, opacity: 0.55, toneMapped: false }), 0, 3.55, 0.46);
    for (const s of [1, -1]) {
        const arm = new THREE.Group(); arm.position.set(s * 0.45, 2.8, 0); root.add(arm);
        const a = add(new THREE.CylinderGeometry(0.08, 0.16, 1.8, 6), wood, s * 0.6, -0.5, 0.1, arm); a.rotation.z = s * 0.9;
        for (let k = 0; k < 3; k++) { const t = add(new THREE.CylinderGeometry(0.03, 0.06, 0.7, 5), wood, s * (1.1 + k * 0.1), -0.9 - k * 0.15, 0.1 + k * 0.1, arm); t.rotation.z = s * (0.3 + k * 0.4); }
        parts[s > 0 ? 'armL' : 'armR'] = arm;
    }
    for (let k = 0; k < 7; k++) add(new THREE.IcosahedronGeometry(0.5 + (k % 3) * 0.15, 0), leaf, Math.cos(k * 0.9) * 0.8, 3.9 + (k % 2) * 0.3, Math.sin(k * 0.9) * 0.6);
    parts.leaves = [];
    for (let k = 0; k < 14; k++) { const l = add(new THREE.PlaneGeometry(0.16, 0.1), leaf, 0, 0, 0); parts.leaves.push({ l, a: k / 14 * Math.PI * 2, r: 1.2 + (k % 3) * 0.3, y: 0.8 + (k % 5) * 0.6 }); }
    parts.glow = new THREE.PointLight(0x8affb8, 8, 12, 1.6); parts.glow.position.y = 2.5; root.add(parts.glow);
    return { root, parts };
}

// The Hermit's hut: walls grown, not built — roots woven into a dome, a moss roof, a door gap, a fire inside.
function buildHut(scene, x, z, y, colliders) {
    const g = new THREE.Group();
    const root = flat(0x6a4a2e), moss = flat(0x4a7a34), flame = new THREE.MeshBasicMaterial({ color: 0xffc04a, toneMapped: false });
    for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.4) continue;   // the doorway faces south (+z)
        const r = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.13, 5, 10, Math.PI * 0.55), root);
        r.position.set(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5); r.rotation.set(0, -a + Math.PI / 2, Math.PI / 2 - 0.2); r.castShadow = true; g.add(r);
    }
    const roof = new THREE.Mesh(new THREE.SphereGeometry(3.0, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.42), moss); roof.position.y = 0.9; roof.scale.y = 0.75; roof.castShadow = roof.receiveShadow = true; g.add(roof);
    for (let k = 0; k < 7; k++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), flat(0x7a7a72)); s.position.set(Math.cos(k / 7 * 6.28) * 0.5, 0.1, 0.6 + Math.sin(k / 7 * 6.28) * 0.5); g.add(s); }
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 6), flame); fire.position.set(0, 0.35, 0.6); g.add(fire);
    const fl = new THREE.PointLight(0xffa850, 10, 8, 1.6); fl.position.set(0, 1.0, 0.6); g.add(fl);
    g.position.set(x, y, z);
    scene.add(g);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.5) continue; colliders.push({ x: x + Math.cos(a) * 2.7, z: z + Math.sin(a) * 2.7, r: 0.45, kind: 'wall', y0: y - 1, y1: y + 3 }); }
    return { fire, fl };
}

// Living-wood arches over the path ("arches and buttresses of living wood the forest had arranged over centuries").
function buildArches(scene, heightAt, pts) {
    const wood = flat(0x6a5236), leaf = flat(0x4a9a3a);
    for (const [x, z, ry] of pts) {
        const g = new THREE.Group();
        const arc = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 6, 14, Math.PI), wood); arc.castShadow = true; g.add(arc);
        for (let k = 0; k < 5; k++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), leaf); l.position.set(Math.cos(k / 4 * Math.PI) * 2.6, Math.sin(k / 4 * Math.PI) * 2.6, 0); g.add(l); }
        g.position.set(x, heightAt(x, z), z); g.rotation.y = ry;
        scene.add(g);
    }
}

export function createSanctuary({ quality }) {
    const map = buildRegion(DEF, { quality });
    const { scene, colliders } = map;
    const H = (x, z) => map.heightAt(x, z);

    // Flowers in nameless colours, scattered through the green.
    const fl = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x6a4a8a, emissiveIntensity: 0.35, flatShading: true }), 420);
    const m4 = new THREE.Matrix4(), c = new THREE.Color(), cols = [0xf0a8d8, 0xb8a8ff, 0xfff0a8, 0xa8f0f0, 0xffc8a8];
    for (let i = 0; i < 420; i++) {
        const fr = v => v - Math.floor(v), x = (fr(Math.sin(i * 12.9898) * 43758.5453) - 0.5) * 140, z = (fr(Math.sin(i * 78.233) * 12345.678) - 0.5) * 140;
        const h = H(x, z);
        if (h < DEF.water + 0.3 || h > 6 || Math.hypot(x - RIM.x, z - RIM.z) < 20) { m4.makeScale(0, 0, 0); } else m4.makeTranslation(x, h + 0.12, z);
        fl.setMatrixAt(i, m4); fl.setColorAt(i, c.setHex(cols[i % cols.length]));
    }
    scene.add(fl);
    buildArches(scene, H, [[2, 50, 0.2], [-5, 8, 0.4], [3, -2, -0.3], [-4, -36, 0.1], [2, -50, -0.2]]);

    // The Corrupted Rim: dead trees, grey rot mounds, its creatures.
    const rot = flat(0x5a5a54), deadWood = flat(0x3a342e);
    for (let k = 0; k < 9; k++) {
        const a = k * 0.7, r = 4 + (k % 4) * 3, x = RIM.x + Math.cos(a) * r, z = RIM.z + Math.sin(a) * r;
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 3 + (k % 3), 5), deadWood); t.position.set(x, H(x, z) + 1.5, z); t.rotation.z = (k % 3 - 1) * 0.2; t.castShadow = true; scene.add(t);
        const mnd = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), rot); mnd.position.set(x + 1.5, H(x + 1.5, z) + 0.1, z - 1); mnd.scale.y = 0.4; scene.add(mnd);
    }
    const rimPosts = k => Array.from({ length: k }, (_, i) => ({ x: RIM.x + Math.cos(i * 2.1) * 6, z: RIM.z + Math.sin(i * 2.1) * 6 }));
    map.hittables.push(...createBeasts({ scene, map, rng: dailyRng('sanctuary:blight_ent'), type: 'blight_ent', posts: rimPosts(2) }));
    map.hittables.push(...createBeasts({ scene, map, rng: dailyRng('sanctuary:root_wraith'), type: 'root_wraith', posts: rimPosts(3) }));

    // The Hermit's hut and the Hermit.
    const hut = buildHut(scene, HUT.x, HUT.z, H(HUT.x, HUT.z), colliders);
    const hermit = createCharacter({ skin: '#7a5a3e', eyes: '#5aa8b0', hair: { style: 'long', color: '#c8c4b8' }, facialHair: { style: 'beard', color: '#c8c4b8' },
        outfit: { style: 'robe', coat: '#4a6a3a', collar: '#2e4a26', trim: '#8a7a4a', vest: '#3a4a2a', shirt: '#b8b0a0', pants: '#3a3a30', leather: '#5a3a22', leatherDark: '#3a2618' } });
    hermit.setWeapons({ type: 'staff', accent: 0x6a8a4a }, null);
    hermit.root.position.set(HUT.x + 0.9, H(HUT.x, HUT.z), HUT.z + 1.5);
    hermit.root.rotation.y = 0.3;
    scene.add(hermit.root);

    // The Elemental in the ford, and an unseen wall across it until the question is answered.
    const el = buildElemental();
    const elPos = new THREE.Vector3(FORD.x, H(FORD.x, FORD.z) - 0.3, FORD.z);
    el.root.position.copy(elPos);
    scene.add(el.root);
    const fordWall = { ax: FORD.x - 7, az: FORD.z, bx: FORD.x + 7, bz: FORD.z, r: 0.6, kind: 'wall', y0: -6, y1: 8 };
    colliders.push(fordWall);
    // Where the river runs out under the rim it is shallow; an unseen line keeps the ford the only crossing.
    colliders.push({ ax: 54, az: 30.6, bx: 90, bz: 35, r: 0.6, kind: 'wall', y0: -10, y1: 40 }, { ax: -54, az: 33.4, bx: -90, bz: 37, r: 0.6, kind: 'wall', y0: -10, y1: 40 });
    let stepAside = 0, asked = false;

    // The Hermit's old camp, past the western rim, and the hidden path to it (only Aether Sight shows it).
    const cy = H(CACHE.x, CACHE.z);
    for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), flat(0x6a6a62)); s.position.set(CACHE.x + Math.cos(k / 8 * 6.28) * 0.6, cy + 0.08, CACHE.z + Math.sin(k / 8 * 6.28) * 0.6); scene.add(s); }
    const canvas = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.4, 4, 1, true), flat(0x7a6a4a, { side: THREE.DoubleSide })); canvas.position.set(CACHE.x + 2, cy + 0.6, CACHE.z - 1); canvas.rotation.set(0.3, 0.6, 0.25); scene.add(canvas);
    map.stations.push({ mode: 'sign', id: 'hermit_cache', pos: new THREE.Vector3(CACHE.x + 1.2, cy, CACHE.z - 0.4),
        text: 'Under rotted canvas, wrapped in oilcloth: a talisman of river-stone and old silver, still faintly warm — the Hermit\'s. You take it.',
        onUse: ({ quests }) => quests.manager.onTalk('hermit_cache') });
    const hidden = [];
    const route = [[-7, 14], [-22, 10], [-36, 4], [-48, -2], [CACHE.x + 3, CACHE.z]];
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xb8ffe0, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    for (let i = 0; i < route.length - 1; i++) for (let f = 0; f < 1; f += 0.12) {
        const x = route[i][0] + (route[i + 1][0] - route[i][0]) * f, z = route[i][1] + (route[i + 1][1] - route[i][1]) * f;
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.22, 6).rotateX(-Math.PI / 2), glowMat); m.position.set(x, H(x, z) + 0.05, z); scene.add(m); hidden.push(m);
    }

    // The way down toward the Fire Gate (closed for now — the next chapter).
    // People (G to talk): the Elemental and the Hermit run their own conversations (onTalk).
    const person = (model, pos, id, name, onTalk) => ({ model, pos, height: model ? 2.2 : 4.2, shown: true, activity: 'work', r: { id, role: 'hermit', npc: { id, name }, onTalk } });
    const people = [
        person(null, elPos, 'sanctuary_elemental', 'the Elemental', api => trial(api)),
        person(hermit, hermit.root.position, 'sanctuary_hermit', 'the Hermit', api => hermitTalk(api)),
    ];
    map.town = {
        people,
        update: dt => hermit.update(dt, { speed: 0, sprinting: false, hopK: null }),
        setVisible: () => {},
        nearestPerson(pos, within = 2.6) { let best = null, bd = within; for (const p of people) { const d = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z) - (p.model ? 0 : 2.5); if (d < bd) { bd = d; best = p; } } return best; },
    };

    // ---- the trial ----
    const QUESTION = 'Why do you seek the light of day?';
    function trial({ start, quests, stats, save }) {
        const flags = stats.flags ??= {};
        if (flags.elemental_trial) return start([{ speaker: 'The Elemental', text: 'Walk through the forest, keeper, and be welcome.' }]);
        const again = [{ speaker: '', text: 'The river runs on. The wind turns the leaves. The question comes again, unchanged, unsoftened.' }];
        start([{ speaker: 'The Elemental', text: QUESTION, choices: [
            { text: 'For the Heartstone. The old tales say it must be found, and I am the one sent to find it.', next: again, onPick: () => { flags._trialAgain = true; } },
            { text: 'Because I was told to. A storm put a compass in my head, and I follow it.', next: again, onPick: () => { flags._trialAgain = true; } },
            { text: "I don't seek the light of day. I left it.", next: [
                { speaker: 'Eldrin', text: "I left a city that believed it was safe, and a tower that was the whole of my world, and I have walked east through a winter that tried to kill me twice, toward a stone I've never seen. I'm not seeking the light of day. I'm trying to keep it from going out." },
                { speaker: 'The Elemental', text: 'The light of day is not yours to keep.' },
                { speaker: '', text: 'A silence long enough to become a country of its own. Then the river moves, and the figure of wood and water and green light steps aside.' },
                { speaker: 'The Elemental', text: 'You speak the truth as a man speaks to the dark. Not for an audience. Not for a prize. For the keeping of it. Walk through the forest, and be welcome — a keeper who does not know how to see will not know what he is keeping.' },
            ], onPick: () => { flags.elemental_trial = true; } },
        ] }], () => {
            if (flags.elemental_trial) { quests.manager.onTalk('sanctuary_elemental'); save?.(); }
            else if (flags._trialAgain) { delete flags._trialAgain; setTimeout(() => trial({ start, quests, stats, save }), 50); }
        });
    }

    // ---- the Hermit ----
    function hermitTalk({ start, quests, stats, hud, save }) {
        const flags = stats.flags ??= {};
        const log = stats.questLog ?? {};
        if (!flags.elemental_trial) return start([{ speaker: 'The Hermit', text: '…' }]);
        if (!flags.aether_sight) {
            return start([
                { speaker: 'The Hermit', text: "I felt you come. Felt you through the green, the way a pond feels a stone. You're the piece, aren't you — the one the Stormbringer moved. You're late. The century's been late for longer than I've been here. Sit." },
                { speaker: 'The Hermit', text: 'The Balrog came. The old tales call it the shadow out of the deep, the guardian of the ancient door — and they have it exactly as wrong as the old tales usually do. It is not a guardian. It is a thing that keeps. It put me down the way the winter puts down a leaf: not out of malice, out of weight.' },
                { speaker: 'The Hermit', text: 'I reached for the oldest thing in reach — the green, the Elemental of this valley — and bound my spirit to it. This is what I became. Not a man keeping a forest. A forest keeping a man.' },
                { speaker: 'Eldrin', text: 'The sight. In the pass I saw things — the truth under the storm, hidden paths. It flickers. I don\'t know how to hold it.' },
                { speaker: 'The Hermit', text: "The storm didn't give you the sight. The storm gave you the compass. The sight was always in you — the storm just pointed it east. Good. Then the teaching will take." },
                { speaker: '', text: 'What followed was not a ritual, and not a lesson, and not a gift. It was a practice, and it took the rest of the day. — Aether Sight mastered.' },
                { speaker: 'The Hermit', text: 'The world is written in two hands. Learn to read the second hand, and no mask will ever hold you, no illusion will ever keep you, no hidden path will ever be hidden from you again.' },
                { speaker: 'The Hermit', text: 'The Balrog cannot be commanded and cannot be bargained with. The only way past it is to not be its enemy. Carry the sight — and do not let the dark convince you that the stone is anything it is not.' },
            ], () => {
                flags.aether_sight = true;
                stats.gameMinutes = Math.floor((stats.gameMinutes ?? 0) / 1440) * 1440 + 19 * 60;   // the rest of the day
                quests.manager.onTalk('sanctuary_hermit');
                hud.banner('Aether Sight');
                save?.();
            });
        }
        // Turn in what is done, then offer what is not yet taken.
        const before = ['side_seeds_of_the_valley', 'side_hermits_debt'].filter(id => log[id]?.status === 'active');
        quests.manager.onTalk('sanctuary_hermit');
        const done = before.filter(id => stats.questLog[id]?.status === 'completed');
        const lines = [];
        if (done.includes('side_hermits_debt')) lines.push({ speaker: 'The Hermit', text: 'You found it. I wore that the day I stood before the door. Keep it — it remembers how to hold, even if I have forgotten.' });
        if (done.includes('side_seeds_of_the_valley')) lines.push({ speaker: 'The Hermit', text: 'The rim is quieter. The green will come back to it; it always does, slowly. Thank you, keeper.' });
        const offers = [];
        if (!stats.questLog.side_seeds_of_the_valley) offers.push({ text: 'Accept — Seeds of the Valley', startQuest: 'side_seeds_of_the_valley' });
        if (!stats.questLog.side_hermits_debt) offers.push({ text: "Accept — The Hermit's Debt", startQuest: 'side_hermits_debt' });
        if (offers.length) lines.push({ speaker: 'The Hermit', text: 'The valley\'s edge greys where the shadow creeps — east, along the rim. And there is a thing of mine at my old camp past the western rim, left the night the green took me in. Your sight will find the way.', choices: [...offers, { text: 'Not now' }] });
        if (!lines.length) lines.push({ speaker: 'The Hermit', text: 'Sleep here tonight, if you like. The fire does not smoke, and nothing in this valley will trouble you.' });
        start(lines, () => save?.());
    }

    map.mapInfo.landmarks.push({ name: "The Hermit's old camp", x: CACHE.x, z: CACHE.z, icon: 'stones' });
    const baseUpdate = map.update;
    map.update = (t, dt, ctx) => {
        baseUpdate(t, dt, ctx);
        map.town.update(dt);
        const flags = ctx.flags ?? {};
        // The Elemental: still, patient; leaves turning round it; steps aside once answered.
        if (flags.elemental_trial && stepAside < 1) { stepAside = Math.min(1, stepAside + dt * 0.4); const i = colliders.indexOf(fordWall); if (i >= 0) colliders.splice(i, 1); }
        el.root.position.set(elPos.x + stepAside * 5.5, elPos.y, elPos.z - stepAside * 1.5);
        el.root.rotation.y = Math.sin(t * 0.2) * 0.1 - stepAside * 0.6;
        el.parts.armL.rotation.z = Math.sin(t * 0.5) * 0.06; el.parts.armR.rotation.z = -Math.sin(t * 0.5 + 1) * 0.06;
        for (const p of el.parts.leaves) { const a = p.a + t * 0.4; p.l.position.set(Math.cos(a) * p.r, p.y + Math.sin(t + p.a) * 0.2, Math.sin(a) * p.r); p.l.rotation.set(t + p.a, t * 0.7, 0); }
        el.parts.face.material.opacity = 0.45 + Math.sin(t * 0.8) * 0.15;
        // Ask once, the first time Eldrin wades close.
        const P = ctx.player.pos;
        if (!asked && !flags.elemental_trial && Math.hypot(P.x - elPos.x, P.z - elPos.z) < 9) { asked = true; ctx.message?.('The Elemental is waiting at the river. (G — answer it)'); }
        // The hidden path: only Aether Sight shows it.
        glowMat.opacity = flags.aether_sight ? 0.55 + Math.sin(t * 2) * 0.2 : 0;
        hut.fire.scale.y = 1 + Math.sin(t * 9) * 0.12; hut.fl.intensity = 9 + Math.sin(t * 7) * 1.5;
        // Fire Gate exit stays shut (next chapter); the link is drawn closed by the region.
    };
    return map;
}
