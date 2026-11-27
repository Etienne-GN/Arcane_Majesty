import { settings } from '../engine/settings.js';
// God mode (testing): every map — the hand-built ones, then every region file (new maps join by themselves).
import { DUNGEONS } from '../content/dungeons.js';
const REGION_FILES = import.meta.glob('../content/regions/*.json', { eager: true, import: 'default' });
import LAYOUT from '../content/world/eldoria_layout.json';
import { NYTHORIA_GATES } from '../content/world/nythoria.js';
// The places now inside the open world: their old standalone maps are retired (main.js redirects every way into them).
export const OPEN_WORLD_IDS = new Set(['outdoor', 'thaloria', 'east_road', 'the_summit', 'sylvan_sanctuary', 'thaloria_lower', 'citadel_plateau', 'summit_of_despair', 'whisper_wood', 'the_crossroads', 'iron_hollow', 'duskmeet', 'graywatch', 'lake_aethera', 'port_silver', 'emerald_fields', 'new_ravenspire', 'fire_gate', 'inferno_labyrinth', 'ruins_of_eldoria']);   // (every way into one of these arrives in the open world)
export const STAMP_OF = { 'Fire Gate': 'fire_gate', 'Inferno Labyrinth': 'inferno_labyrinth', 'Ruins of Eldoria': 'ruins_of_eldoria', 'Summit of Despair — the Approach': 'summit_of_despair', 'Iron Hollow': 'iron_hollow', 'Duskmeet': 'duskmeet', 'Graywatch': 'graywatch', 'Lake Aethera': 'lake_aethera', 'Port Silver': 'port_silver', 'The Emerald Fields': 'emerald_fields', 'Whisper-Wood': 'whisper_wood', 'The Crossroads': 'the_crossroads', 'The Lower Town of Thaloria': 'thaloria_lower', 'The Citadel of Thaloria': 'citadel_plateau', 'Thaloria': 'thaloria', "Thaloria Glade (Eldrin's Tower's vale)": 'outdoor', 'The East Road (Thalorian Wilds)': 'east_road', 'Summit of Despair': 'the_summit', 'Sylvan Sanctuary': 'sylvan_sanctuary' };
const pretty = id => id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
// God mode's destinations, in sections: [title, [[mapId, spawn, label]…]].
function godSections(interiors) {
    const world = LAYOUT.places.map(p => ['eldoria', STAMP_OF[p.name] ? `${STAMP_OF[p.name]}:start` : `place:${p.name}`, p.name]).sort((a, b) => a[2].localeCompare(b[2]));
    const beyond = [['tower', 'start', "Eldrin's Tower (inside)"], ['citadel_library', 'start', 'The Great Library'], ['forbidden_archive', 'start', 'The Forbidden Archive'],
        ...Object.values(DUNGEONS).map(d => [d.id, 'start', d.name]),
        ...Object.values(REGION_FILES).filter(r => r?.id && !OPEN_WORLD_IDS.has(r.id)).map(r => [r.id, 'start', r.name ?? r.id]).sort((a, b) => a[2].localeCompare(b[2]))];
    const inside = interiors.map(id => [id, 'start', pretty(id)]).sort((a, b) => a[2].localeCompare(b[2]));
    const nyth = [['nythoria', 'gate', 'The Obsidian Gate (Nythoria)'], ['nythoria', 'vale', 'The Shadow-Vale'], ['nythoria', 'ravenspire', 'Old Ravenspire (ruins)'], ...NYTHORIA_GATES.map(g => ['nythoria', `gate:${g.id}`, g.label])];
    return [['Eldoria — the open world', world], ['Nythoria — the shadow world', nyth], ['Beyond the open world (their own maps)', beyond], ['Interiors', inside]];
}
// Fast travel — amo's rules: rift-gate monoliths are attuned by touching them (stats.attunedGates);
// at an attuned gate you can travel to any other attuned gate. The Aetheric Tear (T / gamepad R3-hold…
// / touch TEAR) opens the same travel from anywhere: 85% of max mana (75% with Aetheric Comprehension),
// a 60 s cooldown (45 s with it), and it needs at least one attuned gate. Arriving sets the respawn
// point there (amo setRespawnPoint idea) and saves.
import * as THREE from 'three';
import { flat } from '../engine/lib.js';

export function buildMonolith(scene, gate, y) {
    const g = new THREE.Group();
    g.position.set(gate.x, y, gate.z);
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 3.2, 5), flat(0x34303c));
    stone.position.y = 1.5;
    stone.castShadow = true;
    g.add(stone);
    const runeMat = new THREE.MeshBasicMaterial({ color: 0x5a8aff, transparent: true, opacity: 0.5, toneMapped: false });
    for (let i = 0; i < 4; i++) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.02), runeMat);
        const a = (i / 4) * Math.PI * 2;
        r.position.set(Math.sin(a) * 0.36, 0.9 + i * 0.5, Math.cos(a) * 0.36);
        r.rotation.y = a;
        g.add(r);
    }
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x5a8aff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, toneMapped: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.25, 40).rotateX(-Math.PI / 2), ringMat);
    ring.position.y = 0.03;
    g.add(ring);
    const light = new THREE.PointLight(0x6a9aff, 0, 7, 1.6);
    light.position.y = 2;
    g.add(light);
    g.userData.dynamic = true;
    scene.add(g);
    return {
        update(t, attuned) {
            const k = attuned ? 1 : 0.35;
            runeMat.opacity = (0.45 + Math.sin(t * 2 + gate.x) * 0.2) * k + 0.1;
            ringMat.opacity = (0.3 + Math.sin(t * 1.3) * 0.12) * k;
            ring.rotation.y = t * 0.2;
            light.intensity = attuned ? 6 + Math.sin(t * 2) * 1.5 : 0;
        },
    };
}

export function createTravel({ stats, hud, world, player, allGates, onAttune, interiors = [], warpOut = null, warpIn = null }) {
    const css = document.createElement('style');
    css.textContent = `
#travel { position: fixed; inset: 0; z-index: 9; display: none; place-items: center; background: #04060ccc; font-family: Georgia, serif; color: #e6ecff; }
#travel.open { display: grid; }
#travel .panel { width: min(420px, 90vw); max-height: 86vh; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; padding: 18px 22px; border: 1px solid #6a9aff88; border-radius: 12px; background: linear-gradient(160deg, #10162aee, #080a14f4); box-shadow: 0 0 50px #4a6aff33; }
#travel h2 { margin: 0 0 4px; font-weight: normal; letter-spacing: .16em; color: #9abaff; font-size: calc(20px * var(--ui, 1)); }
#travel .sub { font-size: calc(14px * var(--ui, 1)); opacity: .7; margin-bottom: 12px; }
#travel button { display: block; width: 100%; margin: 6px 0; padding: 10px; font: calc(17px * var(--ui, 1)) Georgia, serif; color: #e6ecff; background: #1a2240; border: 1px solid #6a9aff66; border-radius: 7px; cursor: pointer; text-align: left; }
#travel button:hover { border-color: #9abaff; }
#travel button.ghost { background: transparent; text-align: center; }`;
    document.head.append(css);
    const root = document.createElement('div');
    root.id = 'travel';
    document.body.append(root);
    let open = false, tearCd = 0, channel = null;
    stats.attunedGates ??= [];

    const gates = () => allGates();   // every known gate, with the map it stands on
    const tearRules = () => {
        const mastery = !!stats.masteries?.aetheric_comprehension;
        return { pct: mastery ? 0.75 : 0.85, cd: mastery ? 45 : 60 };
    };

    function show(title, sub, fromGate, onPick) {
        root.textContent = '';
        const panel = document.createElement('div'); panel.className = 'panel';
        const h = document.createElement('h2'); h.textContent = title;
        const s = document.createElement('div'); s.className = 'sub'; s.textContent = sub;
        panel.append(h, s);
        const list = gates().filter(g => stats.attunedGates.includes(g.id) && g.id !== fromGate);
        if (!list.length) { const p = document.createElement('div'); p.className = 'sub'; p.textContent = 'No other attuned gate yet — find more monoliths.'; panel.append(p); }
        const groups = [['Eldoria', list.filter(g => g.map !== 'nythoria')], ['Nythoria — the shadow world', list.filter(g => g.map === 'nythoria')]];   // (by world)
        for (const [title, gs] of groups) { if (!gs.length) continue; const h3 = document.createElement('div'); h3.className = 'sub'; h3.textContent = title; h3.style.cssText = 'margin-top:10px;letter-spacing:.08em;opacity:.85'; panel.append(h3);
        for (const g of gs) {
            const b = document.createElement('button');
            b.textContent = `✦ ${g.label}`;
            b.onclick = () => { close(); onPick(g); };
            panel.append(b);
        } }
        if (settings.god) {   // god mode (testing): straight to any map's start
            for (const [title, list] of godSections(interiors)) {   // god mode (testing): every destination
                const h3 = document.createElement('div'); h3.className = 'sub'; h3.textContent = `God mode — ${title}:`; panel.append(h3);
                for (const [id, sp, label] of list) {
                    const b = document.createElement('button'); b.textContent = `⚡ ${label}`;
                    b.onclick = () => { close(); world.go(id, sp); hud.banner(label); };
                    panel.append(b);
                }
            }
        }
        const c = document.createElement('button'); c.className = 'ghost'; c.textContent = 'Cancel';
        c.onclick = close;
        panel.append(c);
        root.append(panel);
        open = true;
        root.classList.add('open');
    }
    function close() { open = false; root.classList.remove('open'); }

    // (2026-11-27) a teleport: the light takes you (warpOut, ~1.3 s), the black holds while the gate's land is built,
    // and the light brings you back out (warpIn) once it is ready
    function arrive(g) {
        const go = () => world.go(g.map ?? 'outdoor', `gate:${g.id}`, () => {
            stats.respawnPoint = { map: g.map ?? 'outdoor', spawn: `gate:${g.id}`, label: g.label };
        }, null, () => { warpIn?.(); hud.banner(`Arrived: ${g.label}`); });
        if (warpOut && !world.busy) warpOut(go); else go();
    }

    // At a monolith: attune it, then offer travel.
    function useGate(id) {
        const g = gates().find(x => x.id === id);
        if (!g) return;
        if (!stats.attunedGates.includes(id)) {
            stats.attunedGates.push(id);
            onAttune?.(id);
            hud.banner(`Attuned: ${g.label}`);
            return;
        }
        show('RIFT GATE', `${g.label} — choose where to step through.`, id, arrive);
    }

    // The Aetheric Tear: from anywhere, at a price.
    function tear(force = false) {
        if (player.state.dead || channel) return;
        if (!force && api.beforeTear?.()) return;   // inside a thin place: the crossing Tear's offer first (game/crossing.js)
        if (tearCd > 0 && !settings.god) return hud.message(`Aetheric Tear on cooldown (${Math.ceil(tearCd)}s)`);
        const { pct, cd } = tearRules();
        const cost = Math.floor(stats.maxMana * pct);
        if (stats.manaExhausted || stats.mana < cost) return hud.message(`Not enough mana for the Aetheric Tear (${Math.round(pct * 100)}% needed)`);
        if (!stats.attunedGates.length && !settings.god) return hud.message('No attuned rift gates — touch a monolith first');
        show('AETHERIC TEAR', `Tear the world open to an attuned gate — ${cost} mana.`, null, g => {
            channel = { t: 0, g, cost, cd };
            hud.message('The air splits…');
        });
    }

    function update(dt, fx) {
        tearCd = Math.max(0, tearCd - dt);
        if (!channel) return;
        channel.t += dt;
        const p = player.state.pos;
        for (let i = 0; i < 5; i++) {
            const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 0.6;
            fx?.fire?.emit({ x: p.x + Math.cos(a) * r, y: p.y + 0.2 + Math.random() * 1.8, z: p.z + Math.sin(a) * r,
                vx: -Math.cos(a) * 1.2, vy: 0.6, vz: -Math.sin(a) * 1.2, life: 0.5, size: [0.25, 0.02], c0: [0.6, 0.5, 1, 1], c1: [0.3, 0.2, 1, 0] });
        }
        if (player.state.dead) { channel = null; return; }
        if (channel.t >= 1.2) {
            stats.mana = Math.max(0, stats.mana - channel.cost);
            tearCd = channel.cd;
            arrive(channel.g);
            stats.manaScent = 100; player.addBuff?.('resonance_stun', 2000);   // (world_systems.md: 100% Mana Scent and a 2 s Resonance Stun on arrival)
            hud.message('You step out reeling — and everything near can smell the magic on you.');
            channel = null;
        }
    }

    addEventListener('keydown', e => {
        if (e.code === 'KeyT') tear();
        else if (open && e.code === 'Escape') close();
    });
    const api = { useGate, arrive, tear, update, close, beforeTear: null, get open() { return open; }, get channelling() { return !!channel; } };
    return api;
}
