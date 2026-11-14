import { settings } from '../engine/settings.js';
const GOD_PLACES = [['outdoor', 'Thaloria Glade'], ['thaloria', 'Thaloria'], ['east_road', 'The Thalorian Wilds'], ['summit_of_despair', 'Summit — the Approach'], ['the_summit', 'Summit of Despair — the mountain'], ['sylvan_sanctuary', 'The Sylvan Sanctuary'], ['whisper_wood', 'Whisper-Wood']];
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

export function createTravel({ stats, hud, world, player, allGates, onAttune }) {
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
        for (const g of list) {
            const b = document.createElement('button');
            b.textContent = `✦ ${g.label}`;
            b.onclick = () => { close(); onPick(g); };
            panel.append(b);
        }
        if (settings.god) {   // god mode (testing): straight to any map's start
            const h3 = document.createElement('div'); h3.className = 'sub'; h3.textContent = 'God mode — any map:'; panel.append(h3);
            for (const [id, label] of GOD_PLACES) {
                const b = document.createElement('button'); b.textContent = `⚡ ${label}`;
                b.onclick = () => { close(); world.go(id, 'start'); hud.banner(label); };
                panel.append(b);
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

    function arrive(g) {
        world.go(g.map ?? 'outdoor', `gate:${g.id}`, () => {
            stats.respawnPoint = { map: g.map ?? 'outdoor', spawn: `gate:${g.id}`, label: g.label };
        });
        hud.banner(`Arrived: ${g.label}`);
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
    function tear() {
        if (player.state.dead || channel) return;
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
            channel = null;
        }
    }

    addEventListener('keydown', e => {
        if (e.code === 'KeyT') tear();
        else if (open && e.code === 'Escape') close();
    });
    return { useGate, tear, update, close, get open() { return open; }, get channelling() { return !!channel; } };
}
