// Online play (Phase 6.1): connects to the 3D game server (server/index.js) when Options → Online is on.
// Sends where the hero is and how they move ~12 times a second; draws everyone else on the same map as a 3D
// character built from their own Forge look, eased between updates, with a nameplate; and a chat box
// (Enter on a keyboard, MENU → Chat on a phone). Leaving a map drops its players; the server sends the new
// map's people.
import { io } from 'socket.io-client';
import * as THREE from 'three';
import { settings } from '../engine/settings.js';

export function createNet({ world, player, getLook, getWeapons, getName, getLevel, createCharacter, hud, fireballs, hurtSelf }) {
    const css = document.createElement('style');
    css.textContent = `
#chat { position: fixed; left: 18px; bottom: 230px; width: min(420px, 60vw); z-index: 6; pointer-events: none; font-family: Georgia, serif; }
#chat .m { font-size: calc(15px * var(--ui, 1)); color: #eee6d2; text-shadow: 0 1px 3px #000, 0 0 6px #000; margin-top: 3px; transition: opacity 1s; }
#chat .m b { color: #f3d88b; font-weight: normal; }
#chat .m.sys { color: #9fd0ff; font-style: italic; }
#chat input { pointer-events: auto; width: 100%; box-sizing: border-box; margin-top: 6px; padding: 8px 10px; font: calc(16px * var(--ui, 1)) Georgia, serif; color: #fff; background: #0b0a10e6; border: 1px solid #f3d88b88; border-radius: 8px; display: none; }
#chat.typing input { display: block; }
body.touch-mode #chat { left: calc(12px + env(safe-area-inset-left, 0px)); bottom: auto; top: 186px; }
#netstat { position: fixed; z-index: 6; pointer-events: none; font: calc(13px * var(--ui, 1)) Georgia, serif; color: #9fe0a0; text-shadow: 0 1px 3px #000; right: 18px; top: 32px; }
body.touch-mode #netstat { right: calc(12px + env(safe-area-inset-right, 0px)); top: 146px; }
.rplate { position: absolute; left: 0; top: 0; font: calc(14px * var(--ui, 1)) Georgia, serif; color: #cfe8ff; text-shadow: 0 1px 3px #000; white-space: nowrap; pointer-events: none; }`;
    document.head.append(css);
    const chat = document.createElement('div'); chat.id = 'chat';
    const lines = document.createElement('div'), input = document.createElement('input');
    input.maxLength = 200; input.placeholder = 'Say something…  (Enter to send, Esc to cancel)';
    chat.append(lines, input); document.body.append(chat);
    const stat = document.createElement('div'); stat.id = 'netstat'; document.body.append(stat);
    const plates = document.createElement('div'); plates.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:4'; document.body.append(plates);

    let socket = null, sendT = 0, casts = 0, hostId = null, snapT = 0;
    const creatures = () => (world.current.hittables ?? []).filter(h => h.snapshot);   // the same order on every client
    const isHost = () => !socket?.connected || !remotes.size || hostId === socket.id;
    const remotes = new Map();   // id → { model, plate, target, data, scene }
    const tmp = new THREE.Vector3();

    function say(text, name = null, sys = false) {
        const m = document.createElement('div');
        m.className = `m${sys ? ' sys' : ''}`;
        if (name) { const b = document.createElement('b'); b.textContent = `${name}: `; m.append(b); }
        m.append(document.createTextNode(text));
        lines.append(m);
        while (lines.children.length > 7) lines.firstChild.remove();
        setTimeout(() => { m.style.opacity = 0; setTimeout(() => m.remove(), 1000); }, 14000);
    }

    function addRemote(d) {
        removeRemote(d.id);
        const model = createCharacter(d.look ?? undefined);
        model.setWeapons?.(d.weapon ? { type: d.weapon } : null, null);
        model.root.position.set(d.x, d.y, d.z);
        model.root.rotation.y = d.facing;
        const scene = world.current.scene;
        scene.add(model.root);
        const plate = document.createElement('div'); plate.className = 'rplate'; plate.textContent = `${d.name} · Lv ${d.level}`;
        plates.append(plate);
        remotes.set(d.id, { model, plate, scene, data: d, target: { ...d } });
    }
    function removeRemote(id) {
        const r = remotes.get(id);
        if (!r) return;
        r.scene.remove(r.model.root); r.plate.remove();
        r.model.root.traverse(o => { o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m?.dispose?.()); });   // free the old model
        remotes.delete(id);
    }
    const clearRemotes = () => { for (const id of [...remotes.keys()]) removeRemote(id); };

    function state() {
        const p = player.state;
        return { map: world.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, facing: p.facing, speed: p.speed, sprint: !!p.sprinting,
            hop: p.hop ? p.hop.t : null, cast: p.cast ? p.cast.t : p.shot ? p.shot.t : null, strike: p.strike ? p.strike.t : null, dead: !!p.dead };
    }

    function connect() {
        if (socket || !settings.online) return;
        const addr = (settings.server || `${location.hostname}:3003`).trim();
        const url = /^https?:\/\//.test(addr) ? addr : `http://${addr}`;
        socket = io(url, { transports: ['websocket'], reconnectionDelay: 2000, timeout: 6000 });
        stat.textContent = '○ connecting…';
        socket.on('connect', () => {
            stat.textContent = '● online';
            socket.emit('player:join', { name: getName(), level: getLevel(), look: getLook(), weapon: getWeapons(), map: world.id, move: state() });
            say(`Connected to ${addr}.`, null, true);
        });
        socket.on('connect_error', () => { stat.textContent = '○ cannot reach the server'; });
        socket.on('disconnect', () => { stat.textContent = '○ offline — retrying'; clearRemotes(); });
        socket.on('server:full', () => say('The server is full.', null, true));
        socket.on('players:init', list => { clearRemotes(); list.forEach(addRemote); count(); });
        socket.on('player:joined', d => { addRemote(d); say(`${d.name} is here.`, null, true); count(); });
        socket.on('player:left', ({ id }) => { const r = remotes.get(id); if (r) say(`${r.data.name} has gone.`, null, true); removeRemote(id); count(); });
        socket.on('player:moved', m => { const r = remotes.get(m.id); if (r) Object.assign(r.target, m); });
        socket.on('player:updated', u => {
            const r = remotes.get(u.id);
            if (!r) return;
            const d = { ...r.data, ...r.target, ...u };
            addRemote(d);
        });
        socket.on('chat:message', ({ name, text }) => say(text, name));
        // ---- shared creatures (6.3): the map's host runs them; everyone else follows its snapshots ----
        socket.on('map:host', ({ id }) => { hostId = id; });
        socket.on('enemy:snap', ({ list }) => { if (isHost()) return; const cs = creatures(); for (const [i, ...v] of list) cs[i]?.applySnapshot(v); });
        socket.on('enemy:hit', ({ i, attacker, h }) => { if (isHost()) creatures()[i]?.hitFromNet(h, attacker); });
        socket.on('enemy:credit', ({ i }) => creatures()[i]?.credit());
        socket.on('player:hurt', ({ dmg, from }) => hurtSelf?.(dmg, new THREE.Vector3(from.x, from.y, from.z)));
        socket.on('player:act', a => {
            const r = remotes.get(a.id);
            if (!r || a.kind !== 'fireball') return;
            casts++;
            fireballs?.cast(new THREE.Vector3(a.origin.x, a.origin.y, a.origin.z), new THREE.Vector3(a.dir.x, a.dir.y, a.dir.z), 1, 10, { cosmetic: true });
        });
    }
    function disconnect() { socket?.disconnect(); socket = null; clearRemotes(); stat.textContent = ''; }
    const count = () => { if (socket?.connected) stat.textContent = `● online · ${remotes.size + 1} here`; };

    // Chat input: Enter opens it (only while online), Enter sends, Escape cancels. Captured before the game's keys.
    function openChat() {
        if (!socket?.connected) { hud.message('Not connected — turn on Online in Options.'); return; }
        chat.classList.add('typing'); input.value = ''; input.focus();
    }
    addEventListener('keydown', e => {
        if (document.activeElement === input) {
            if (e.code === 'Enter') { const t = input.value.trim(); if (t) socket?.emit('chat:send', { text: t }); input.blur(); chat.classList.remove('typing'); }
            else if (e.code === 'Escape') { input.blur(); chat.classList.remove('typing'); }
            e.stopImmediatePropagation();
            return;
        }
        if (e.code === 'Enter' && socket?.connected && !document.querySelector('.open')) { e.preventDefault(); e.stopImmediatePropagation(); openChat(); }
    }, true);

    let lastMap = world.id, lastLookKey = '';
    return {
        connect, disconnect, openChat,
        cast(origin, dir) { if (socket?.connected) socket.emit('player:act', { kind: 'fireball', origin: { x: origin.x, y: origin.y, z: origin.z }, dir: { x: dir.x, y: dir.y, z: dir.z } }); },
        get online() { return !!socket?.connected; },
        get isHost() { return isHost(); },
        // Everyone a creature may go for: this hero and the others on this map.
        targets() {
            const me = { id: 'me', pos: player.state.pos, dead: !!player.state.dead };
            if (!socket?.connected || !remotes.size) return [me];
            return [me, ...[...remotes.entries()].map(([id, r]) => ({ id, pos: r.model.root.position, dead: !!r.target.dead }))];
        },
        hurtRemote(id, dmg, from) {   // from: the striking creature's position — the server checks it against our snapshot
            if (!socket?.connected) return false;
            const i = creatures().findIndex(h => h.pos === from || (h.pos.x === from.x && h.pos.z === from.z));
            socket.emit('player:strike', { target: id, i, dmg, from: { x: from.x, y: from.y, z: from.z } });
            return true;
        },
        get remoteCasts() { return casts; },
        // The hero changed clothes or weapons, or levelled up.
        refresh() { if (socket?.connected) socket.emit('player:update', { look: getLook(), weapon: getWeapons(), level: getLevel() }); },
        update(dt, camera) {
            if (!socket) return;
            // A map change: everyone shown belongs to the old one.
            if (world.id !== lastMap) { lastMap = world.id; clearRemotes(); }
            sendT -= dt;
            if (sendT <= 0 && socket.connected) { sendT = 1 / 12; socket.emit('player:move', state()); }
            const k = 1 - Math.exp(-dt * 12);
            for (const r of remotes.values()) {
                const t = r.target, root = r.model.root;
                if (r.scene !== world.current.scene) { r.scene.remove(root); world.current.scene.add(root); r.scene = world.current.scene; }
                root.position.lerp(tmp.set(t.x, t.y, t.z), k);
                const d = ((((t.facing - root.rotation.y) + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
                root.rotation.y += d * k;
                root.visible = !t.dead;
                r.model.update(dt, { speed: t.speed ?? 0, sprinting: !!t.sprint, hopK: t.hop ?? null, castK: t.cast ?? null, strikeK: t.strike ?? null });
                tmp.copy(root.position).setY(root.position.y + 2.3).project(camera);
                const on = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 && root.visible;
                r.plate.style.opacity = on ? 1 : 0;
                r.plate.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
            }
            // Creatures: host or puppet, wired to the server; the host streams them ~8 times a second.
            const shared = socket.connected && remotes.size > 0, host = isHost(), cs = creatures();
            cs.forEach((h, i) => {
                h.net.networked = shared;
                h.net.puppet = shared && !host;
                h.net.sendHit = hit => socket.emit('enemy:hit', { i, h: hit });
                h.net.onDied = by => { if (by.length) socket.emit('enemy:killed', { i, by }); };
            });
            snapT -= dt;
            if (shared && host && snapT <= 0 && cs.length) { snapT = 0.12; socket.emit('enemy:snap', { list: cs.map((h, i) => [i, ...h.snapshot()]) }); }
            const key = JSON.stringify([getWeapons(), getLevel()]);
            if (key !== lastLookKey) { lastLookKey = key; this.refresh?.(); }
        },
    };
}
